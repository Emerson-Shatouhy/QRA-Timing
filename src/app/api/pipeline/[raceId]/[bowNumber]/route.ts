import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../../utils/supabase/server';

// ─── Outlier Detection ────────────────────────────────────────────────────────

function detectOutliers(
  elapsedValues: { id: string; elapsed_ms: number }[],
  threshold2Timer: number,
  thresholdMulti: number
): {
  outlierIds: Set<string>;
  consensus_ms: number;
  has_outlier: boolean;
} {
  const N = elapsedValues.length;

  if (N === 0) {
    return { outlierIds: new Set(), consensus_ms: 0, has_outlier: false };
  }

  if (N === 1) {
    return {
      outlierIds: new Set(),
      consensus_ms: elapsedValues[0].elapsed_ms,
      has_outlier: false,
    };
  }

  if (N === 2) {
    const delta = Math.abs(elapsedValues[0].elapsed_ms - elapsedValues[1].elapsed_ms);
    const avg = Math.round((elapsedValues[0].elapsed_ms + elapsedValues[1].elapsed_ms) / 2);
    return {
      outlierIds: new Set(),
      consensus_ms: avg,
      has_outlier: delta > threshold2Timer,
    };
  }

  // N >= 3: identify and drop outlier minority
  const mean = elapsedValues.reduce((s, v) => s + v.elapsed_ms, 0) / N;
  const outlierIds = new Set<string>();

  for (const v of elapsedValues) {
    if (Math.abs(v.elapsed_ms - mean) > thresholdMulti) {
      outlierIds.add(v.id);
    }
  }

  const clean = elapsedValues.filter((v) => !outlierIds.has(v.id));

  // Safety: if everything is an outlier (pathological), use all
  const useValues = clean.length > 0 ? clean : elapsedValues;
  const consensus_ms = Math.round(
    useValues.reduce((s, v) => s + v.elapsed_ms, 0) / useValues.length
  );

  return {
    outlierIds,
    consensus_ms,
    has_outlier: outlierIds.size > 0,
  };
}

// ─── Pipeline ─────────────────────────────────────────────────────────────────

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ raceId: string; bowNumber: string }> }
) {
  const { raceId, bowNumber } = await params;
  const supabase = await createClient();

  const raceIdNum = parseInt(raceId, 10);
  const bowNum = parseInt(bowNumber, 10);

  if (isNaN(raceIdNum) || isNaN(bowNum)) {
    return NextResponse.json({ error: 'Invalid raceId or bowNumber' }, { status: 400 });
  }

  // 1. Load race (need actual_start and thresholds)
  const { data: race, error: raceErr } = await supabase
    .from('races')
    .select('actual_start, race_type, outlier_2timer_threshold_ms, outlier_multi_threshold_ms')
    .eq('id', raceIdNum)
    .single();

  if (raceErr || !race) {
    return NextResponse.json({ error: 'Race not found' }, { status: 404 });
  }

  // 2. Load the entry for this bow number
  const { data: entry, error: entryErr } = await supabase
    .from('entries')
    .select('id, actual_start, boat_status')
    .eq('race_id', raceIdNum)
    .eq('bow_number', bowNum)
    .single();

  if (entryErr || !entry) {
    // Bow number not in this race — store taps but don't compute result
    return NextResponse.json(
      { warning: `Bow ${bowNum} not found in race ${raceIdNum}` },
      { status: 200 }
    );
  }

  // 3. Determine the start time for this entry
  const isHeadRace = race.race_type === 'head_race' || race.race_type === 'time_trial';
  const startTimeStr = isHeadRace ? entry.actual_start : race.actual_start;

  if (!startTimeStr) {
    // Race / entry hasn't been started yet — can't compute elapsed time
    return NextResponse.json(
      { warning: 'Start time not recorded yet; taps saved but result not computed' },
      { status: 200 }
    );
  }

  const startTime = new Date(startTimeStr).getTime();

  // 4. Load all raw_timings for this (race, bow_number)
  const { data: timings, error: timingsErr } = await supabase
    .from('raw_timings')
    .select('id, recorded_at, is_outlier')
    .eq('race_id', raceIdNum)
    .eq('bow_number', bowNum)
    .order('recorded_at', { ascending: true });

  if (timingsErr || !timings || timings.length === 0) {
    return NextResponse.json({ ok: true, message: 'No timings for this bow' });
  }

  // 5. Compute elapsed_ms for each timing
  const elapsedValues = timings.map((t) => ({
    id: t.id,
    elapsed_ms: new Date(t.recorded_at).getTime() - startTime,
  }));

  // Filter out any negative elapsed (recorded before start) — flag separately
  const validValues = elapsedValues.filter((v) => v.elapsed_ms > 0);
  const preStartIds = new Set(
    elapsedValues.filter((v) => v.elapsed_ms <= 0).map((v) => v.id)
  );

  // 6. Run outlier detection
  const { outlierIds, consensus_ms, has_outlier } = detectOutliers(
    validValues,
    race.outlier_2timer_threshold_ms ?? 1000,
    race.outlier_multi_threshold_ms ?? 1500
  );

  // 7. Update is_outlier and outlier_delta_ms on each raw_timing
  const updatePromises = timings.map((t) => {
    const elapsed = elapsedValues.find((e) => e.id === t.id);
    const isPreStart = preStartIds.has(t.id);
    const isOutlier = outlierIds.has(t.id) || isPreStart;
    const delta = elapsed ? elapsed.elapsed_ms - consensus_ms : null;

    return supabase
      .from('raw_timings')
      .update({
        is_outlier: isOutlier,
        outlier_delta_ms: isOutlier && delta !== null ? delta : null,
      })
      .eq('id', t.id);
  });

  await Promise.all(updatePromises);

  // 8. Upsert race_result
  const cleanCount = validValues.length - outlierIds.size;
  const consensusFinishTime = new Date(startTime + consensus_ms).toISOString();

  const { error: upsertErr } = await supabase
    .from('race_results')
    .upsert(
      {
        entry_id: entry.id,
        start_time: startTimeStr,
        end_time: consensusFinishTime,
        elapsed_ms: consensus_ms,
        timing_count: cleanCount,
        has_outlier_flag: has_outlier || preStartIds.size > 0,
        last_computed_at: new Date().toISOString(),
        status: 'finished',
      },
      { onConflict: 'entry_id' }
    );

  if (upsertErr) {
    console.error('Error upserting race_result:', upsertErr);
    return NextResponse.json({ error: 'Failed to write result' }, { status: 500 });
  }

  // 9. Mark the entry's boat_status as finished now that it has a time
  const { error: boatStatusErr } = await supabase
    .from('entries')
    .update({ boat_status: 'finished' })
    .eq('id', entry.id);

  if (boatStatusErr) {
    console.error('Error updating boat status to finished:', boatStatusErr);
  }

  return NextResponse.json({
    ok: true,
    bow_number: bowNum,
    consensus_ms,
    timing_count: cleanCount,
    has_outlier: has_outlier || preStartIds.size > 0,
  });
}
