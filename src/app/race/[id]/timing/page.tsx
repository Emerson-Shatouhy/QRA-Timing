'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '../../../../../utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import OarBlade from '@/components/OarBlade';
import { RaceType, RaceStatus } from '../../../../../utils/types/race';
import { BoatStatus } from '../../../../../utils/types/boat';
import { RawTiming } from '../../../../../utils/types/rawTiming';
import { updateAllBoatStatusesForRace } from '../../../../../utils/boats/getBoat';
import {
  insertRawTiming,
  assignBowNumber,
  deleteRawTiming,
} from '../../../../../utils/rawTimings/getRawTiming';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Race {
  id: number;
  race_name: string | null;
  race_type: string | null;
  race_status: string | null;
  actual_start: string | null;
}

interface EntryResult {
  entry_id: number;
  bow_number: number;
  team_name: string;
  oarspotter_key: string | null;
  elapsed_ms: number | null;
  timing_count: number;
  has_outlier_flag: boolean;
  status: string | null;
}

interface Entry {
  id: number;
  bow_number: number;
  team_name: string;
  oarspotter_key: string | null;
  actual_start: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const tenths = Math.floor((ms % 1000) / 100);
  return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RaceTimingPage() {
  const params = useParams();
  const router = useRouter();
  const raceId = parseInt(params.id as string, 10);
  const supabase = useRef(createClient()).current;

  const [race, setRace] = useState<Race | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [myTaps, setMyTaps] = useState<RawTiming[]>([]);
  const [allTaps, setAllTaps] = useState<RawTiming[]>([]);
  const [results, setResults] = useState<EntryResult[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);

  const [bowInputs, setBowInputs] = useState<Record<string, string>>({});
  const [now, setNow] = useState(new Date());
  const [isTapping, setIsTapping] = useState(false);

  // ─── Load ───────────────────────────────────────────────────────────────────

  const refreshResults = useCallback(async () => {
    // Get all entry IDs for this race first
    const { data: entryIds } = await supabase
      .from('entries')
      .select('id')
      .eq('race_id', raceId);

    if (!entryIds || entryIds.length === 0) return;

    const { data } = await supabase
      .from('race_results')
      .select(`
        entry_id, elapsed_ms, timing_count, has_outlier_flag, status,
        entries!inner(bow_number, teams(team_name, oarspotter_key))
      `)
      .in('entry_id', entryIds.map((e: any) => e.id));

    setResults(
      (data || []).map((r: any) => ({
        entry_id: r.entry_id,
        bow_number: r.entries.bow_number,
        team_name: r.entries.teams?.team_name ?? 'Unknown',
        oarspotter_key: r.entries.teams?.oarspotter_key ?? null,
        elapsed_ms: r.elapsed_ms,
        timing_count: r.timing_count ?? 0,
        has_outlier_flag: r.has_outlier_flag ?? false,
        status: r.status,
      }))
    );
  }, [raceId, supabase]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);

      const { data: raceData, error: raceErr } = await supabase
        .from('races')
        .select('id, race_name, race_type, race_status, actual_start')
        .eq('id', raceId)
        .single();

      if (raceErr || !raceData) {
        setError('Race not found');
        setLoading(false);
        return;
      }
      setRace(raceData);

      const { data: entryData } = await supabase
        .from('entries')
        .select('id, bow_number, actual_start, teams(team_name, oarspotter_key)')
        .eq('race_id', raceId)
        .order('bow_number');

      setEntries(
        (entryData || []).map((e: any) => ({
          id: e.id,
          bow_number: e.bow_number,
          team_name: e.teams?.team_name ?? 'Unknown',
          oarspotter_key: e.teams?.oarspotter_key ?? null,
          actual_start: e.actual_start,
        }))
      );

      const { data: tapData } = await supabase
        .from('raw_timings')
        .select('*')
        .eq('race_id', raceId)
        .order('recorded_at', { ascending: false });

      const taps: RawTiming[] = tapData || [];
      setAllTaps(taps);
      if (user) {
        setMyTaps(taps.filter((t) => t.timer_user_id === user.id && t.bow_number === null));
      }

      await refreshResults();
      setLoading(false);
    }
    load();
  }, [raceId, supabase, refreshResults]);

  // ─── Live clock ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (race?.race_status === RaceStatus.FINISHED || race?.race_status === RaceStatus.ABANDONED) return;
    const interval = setInterval(() => setNow(new Date()), 100);
    return () => clearInterval(interval);
  }, [race?.race_status]);

  // ─── Realtime ───────────────────────────────────────────────────────────────

  useEffect(() => {
    const channel = supabase
      .channel(`race-timing-${raceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'raw_timings', filter: `race_id=eq.${raceId}` },
        (payload) => {
          setAllTaps((prev) => {
            if (payload.eventType === 'INSERT') {
              const newTap = payload.new as RawTiming;
              return prev.some((x) => x.id === newTap.id) ? prev : [newTap, ...prev];
            }
            if (payload.eventType === 'UPDATE')
              return prev.map((t) => (t.id === (payload.new as RawTiming).id ? (payload.new as RawTiming) : t));
            if (payload.eventType === 'DELETE')
              return prev.filter((t) => t.id !== (payload.old as { id: string }).id);
            return prev;
          });
          setMyTaps((prev) => {
            if (payload.eventType === 'INSERT') {
              const t = payload.new as RawTiming;
              if (t.timer_user_id === currentUserId && t.bow_number === null) {
                return prev.some((x) => x.id === t.id) ? prev : [t, ...prev];
              }
            }
            if (payload.eventType === 'UPDATE') {
              const t = payload.new as RawTiming;
              if (t.bow_number !== null) return prev.filter((x) => x.id !== t.id);
            }
            if (payload.eventType === 'DELETE')
              return prev.filter((x) => x.id !== (payload.old as { id: string }).id);
            return prev;
          });
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'race_results' }, () => {
        refreshResults();
      })
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'races', filter: `id=eq.${raceId}` },
        (payload) => setRace((prev) => prev ? { ...prev, ...(payload.new as Partial<Race>) } : prev)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [raceId, currentUserId, supabase, refreshResults]);

  // ─── Actions ─────────────────────────────────────────────────────────────────

  const isHeadRace = race?.race_type === RaceType.HEAD_RACE || race?.race_type === RaceType.TIME_TRIAL;
  const isStarted = !!race?.actual_start;
  const anyEntryStarted = isHeadRace && entries.some((e) => e.actual_start);

  const handleStartRace = async () => {
    const startTime = new Date();
    // Timer starts first — record actual_start before anything else
    const { error: startErr } = await supabase
      .from('races')
      .update({ actual_start: startTime.toISOString() })
      .eq('id', raceId);
    if (startErr) { alert('Failed to start timer: ' + startErr.message); return; }

    // Then update race status
    const { error: statusErr } = await supabase
      .from('races')
      .update({ race_status: RaceStatus.STARTED })
      .eq('id', raceId);
    if (statusErr) console.error('Failed to update race status:', statusErr.message);

    // Finally move all boats to on_water
    await updateAllBoatStatusesForRace(raceId, BoatStatus.ON_WATER);
  };

  const handleFinishRace = async () => {
    const { error } = await supabase
      .from('races')
      .update({ race_status: RaceStatus.FINISHED })
      .eq('id', raceId);
    if (error) console.error('Failed to finish race:', error.message);
  };

  const handleStartEntry = async (entryId: number) => {
    const startTime = new Date();
    const { error } = await supabase
      .from('entries')
      .update({ actual_start: startTime.toISOString(), boat_status: BoatStatus.ON_WATER })
      .eq('id', entryId);
    if (error) { alert('Failed to record start: ' + error.message); return; }
    if (!isStarted) {
      await supabase.from('races').update({ race_status: RaceStatus.STARTED }).eq('id', raceId);
    }
    setEntries((prev) =>
      prev.map((e) => (e.id === entryId ? { ...e, actual_start: startTime.toISOString() } : e))
    );
    // Run pipeline for any already-assigned taps with this bow
    const entry = entries.find((e) => e.id === entryId);
    if (entry) {
      await fetch(`/api/pipeline/${raceId}/${entry.bow_number}`, { method: 'POST' });
    }
  };

  const handleTap = async () => {
    if (isTapping) return;
    setIsTapping(true);
    const tapTime = new Date();
    const optimisticId = `opt-${Date.now()}`;
    const optimisticTap: RawTiming = {
      id: optimisticId, created_at: tapTime.toISOString(), race_id: raceId,
      timer_user_id: currentUserId ?? '', recorded_at: tapTime.toISOString(),
      bow_number: null, is_outlier: false, outlier_delta_ms: null, notes: null,
    };
    setMyTaps((prev) => [optimisticTap, ...prev]);

    const result = await insertRawTiming(raceId, tapTime);
    if (!result) {
      setMyTaps((prev) => prev.filter((t) => t.id !== optimisticId));
      console.error('Failed to record tap. Check your connection.');
      setIsTapping(false);
      return;
    }
    setMyTaps((prev) => prev.map((t) => (t.id === optimisticId ? result : t)));
    setIsTapping(false);
  };

  const handleAssign = async (tapId: string) => {
    const bowStr = bowInputs[tapId]?.trim();
    const bowNumber = parseInt(bowStr ?? '', 10);
    if (isNaN(bowNumber) || bowNumber < 0) return;

    const entry = entries.find((e) => e.bow_number === bowNumber);
    if (!entry) { alert(`Bow ${bowNumber} is not registered in this race.`); return; }

    setMyTaps((prev) => prev.filter((t) => t.id !== tapId));
    setBowInputs((prev) => { const n = { ...prev }; delete n[tapId]; return n; });

    const ok = await assignBowNumber(tapId, bowNumber);
    if (!ok) { alert('Failed to assign bow number.'); return; }

    await fetch(`/api/pipeline/${raceId}/${bowNumber}`, { method: 'POST' });
  };

  const handleDeleteTap = async (tapId: string) => {
    setMyTaps((prev) => prev.filter((t) => t.id !== tapId));
    await deleteRawTiming(tapId);
  };

  const handleSetEntryStatus = async (entryId: number, status: 'dns' | 'dnf' | 'dsq' | null) => {
    // Upsert race_results so it works even if no result row exists yet
    await supabase
      .from('race_results')
      .upsert(
        { entry_id: entryId, status: status },
        { onConflict: 'entry_id' }
      );

    // Update entries boat_status
    await supabase
      .from('entries')
      .update({ boat_status: status ?? 'entered' })
      .eq('id', entryId);

    // Refresh results
    await refreshResults();
  };

  // Merge all entries with results so every boat appears in the table
  const mergedResults: EntryResult[] = entries.map((entry) => {
    const result = results.find((r) => r.entry_id === entry.id);
    if (result) return result;
    // Entry with no race_result row yet — show as pending
    return {
      entry_id: entry.id,
      bow_number: entry.bow_number,
      team_name: entry.team_name,
      oarspotter_key: entry.oarspotter_key,
      elapsed_ms: null,
      timing_count: 0,
      has_outlier_flag: false,
      status: null,
    };
  });

  const sortedResults = [...mergedResults].sort((a, b) => {
    const aIsSpecial = a.status && ['dns', 'dnf', 'dsq'].includes(a.status);
    const bIsSpecial = b.status && ['dns', 'dnf', 'dsq'].includes(b.status);
    if (aIsSpecial && !bIsSpecial) return 1;
    if (!aIsSpecial && bIsSpecial) return -1;
    // Boats with times sort above those without
    if (a.elapsed_ms !== null && b.elapsed_ms !== null) return a.elapsed_ms - b.elapsed_ms;
    if (a.elapsed_ms !== null) return -1;
    if (b.elapsed_ms !== null) return 1;
    return a.bow_number - b.bow_number;
  });

  const raceElapsed = race?.actual_start && !isHeadRace && race.race_status === RaceStatus.STARTED
    ? now.getTime() - new Date(race.actual_start).getTime()
    : null;

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (loading) return <div className="p-8 text-gray-500">Loading timing system...</div>;
  if (error || !race) return <div className="p-8 text-red-600">{error ?? 'Race not found'}</div>;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={() => router.push(`/race/${raceId}`)}>← Back</Button>
        <div>
          <h1 className="text-xl font-bold">{race.race_name ?? 'Unnamed Race'}</h1>
          <p className="text-xs text-gray-500">{isHeadRace ? 'Head / Time Trial' : 'Sprint'} · Timing</p>
        </div>
      </div>

      {/* Sprint start */}
      {!isHeadRace && (
        <div className="bg-white rounded-lg border p-4">
          {!isStarted ? (
            <div className="flex items-center gap-4">
              <Button size="lg" onClick={handleStartRace}
                className="bg-green-600 hover:bg-green-700 text-white font-bold px-8">
                START RACE
              </Button>
              <p className="text-sm text-gray-500">Official presses this at the start signal.</p>
            </div>
          ) : race.race_status === RaceStatus.FINISHED ? (
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700
                               text-sm font-medium px-3 py-1 rounded-full">
                ✓ Race Finished
              </span>
              <span className="text-xs text-gray-400">
                {race.actual_start ? `Started ${formatTime(race.actual_start)}` : ''}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-6 flex-wrap">
              <div>
                <div className="text-4xl font-mono font-bold">
                  {raceElapsed !== null && raceElapsed > 0 ? formatElapsed(raceElapsed) : '--:--.-'}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  Started {formatTime(race.actual_start!)}
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700
                               text-sm font-medium px-3 py-1 rounded-full">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Race Running
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleFinishRace}
                className="text-gray-600 border-gray-300 hover:bg-gray-50"
              >
                Finish Race
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Head race entry starts */}
      {isHeadRace && (
        <div className="bg-white rounded-lg border">
          <div className="px-4 py-3 border-b">
            <h2 className="font-semibold text-sm">Entry Starts</h2>
            <p className="text-xs text-gray-400">Official taps START as each boat launches.</p>
          </div>
          <div className="divide-y max-h-56 overflow-y-auto">
            {entries.map((e) => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                <span className="font-bold w-10">#{e.bow_number}</span>
                <span className="flex-1 text-gray-700 truncate flex items-center gap-1.5">
                  <OarBlade oarspotterKey={e.oarspotter_key} size={18} />
                  {e.team_name}
                </span>
                {e.actual_start ? (
                  <span className="font-mono text-xs text-green-600">{formatTime(e.actual_start)}</span>
                ) : (
                  <Button size="sm" variant="outline" className="h-7 text-xs"
                    onClick={() => handleStartEntry(e.id)}>
                    START
                  </Button>
                )}
              </div>
            ))}
            {entries.length === 0 && <p className="p-4 text-gray-400 text-sm">No entries.</p>}
          </div>
        </div>
      )}

      {/* TAP BUTTON */}
      {(isStarted || anyEntryStarted) && (
        <div className="bg-white rounded-lg border p-4 space-y-4">
          <div>
            <h2 className="font-semibold">Finish Line</h2>
            <p className="text-xs text-gray-400">Tap the moment a bow ball crosses. Assign bow number after.</p>
          </div>

          <button
            onClick={handleTap}
            disabled={isTapping}
            className="w-full h-44 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-900 disabled:opacity-50
                       text-white text-5xl font-extrabold tracking-wider shadow-lg
                       transition-all active:scale-95 select-none touch-none disabled:cursor-not-allowed"
          >
            TAP
          </button>

          {/* Unassigned taps */}
          {myTaps.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                Assign bow numbers
              </p>
              {myTaps.map((tap) => {
                const refStart = !isHeadRace && race.actual_start ? race.actual_start : null;
                const elapsed = refStart
                  ? new Date(tap.recorded_at).getTime() - new Date(refStart).getTime()
                  : null;
                return (
                  <div key={tap.id}
                    className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-400">{formatTime(tap.recorded_at)}</div>
                      {elapsed !== null && elapsed > 0 && (
                        <div className="font-mono text-sm font-bold">{formatElapsed(elapsed)}</div>
                      )}
                    </div>
                    <Input
                      type="number"
                      placeholder="Bow #"
                      className="w-20 h-8 text-sm"
                      value={bowInputs[tap.id] ?? ''}
                      onChange={(e) => setBowInputs((p) => ({ ...p, [tap.id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAssign(tap.id); }}
                    />
                    <Button size="sm" className="h-8 px-3" onClick={() => handleAssign(tap.id)}>
                      ✓
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 px-2 text-gray-300 hover:text-red-500"
                      onClick={() => handleDeleteTap(tap.id)} title="Discard tap">
                      ✕
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Results table */}
      <div className="bg-white rounded-lg border">
        <div className="px-4 py-3 border-b flex justify-between items-center">
          <h2 className="font-semibold">Results</h2>
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" /> Live
          </span>
        </div>
        {sortedResults.length === 0 ? (
          <p className="p-4 text-sm text-gray-400">No entries for this race.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-400 uppercase border-b">
              <tr>
                <th className="px-4 py-2 text-left">Rank</th>
                <th className="px-4 py-2 text-left">Bow</th>
                <th className="px-4 py-2 text-left">Team</th>
                <th className="px-4 py-2 text-right">Time</th>
                <th className="px-4 py-2 text-center">Timers</th>
                <th className="px-4 py-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(() => {
                // Pre-compute rank: only count entries with a time and no special status
                let rank = 0;
                const ranks = sortedResults.map((r) => {
                  const isSpecial = r.status && ['dns', 'dnf', 'dsq'].includes(r.status);
                  if (!isSpecial && r.elapsed_ms !== null) {
                    rank++;
                    return rank;
                  }
                  return null;
                });
                return sortedResults.map((r, i) => {
                  const isSpecialStatus = r.status && ['dns', 'dnf', 'dsq'].includes(r.status);
                  const hasTime = r.elapsed_ms !== null;
                  const statusColor =
                    r.status === 'dns' ? 'bg-orange-100 text-orange-700' :
                      r.status === 'dnf' ? 'bg-yellow-100 text-yellow-700' :
                        r.status === 'dsq' ? 'bg-red-100 text-red-700' : '';

                  return (
                    <tr key={r.entry_id} className={
                      r.status === 'dsq' ? 'bg-red-50' :
                        r.status === 'dns' ? 'bg-orange-50' :
                          r.status === 'dnf' ? 'bg-yellow-50' :
                            r.has_outlier_flag ? 'bg-yellow-50' : ''
                    }>
                      <td className="px-4 py-2.5 text-gray-400 font-medium">
                        {ranks[i] ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 font-bold">{r.bow_number}</td>
                      <td className="px-4 py-2.5 text-gray-700">
                        <span className="flex items-center gap-1.5">
                          <OarBlade oarspotterKey={r.oarspotter_key} size={18} />
                          {r.team_name}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold">
                        {hasTime ? formatElapsed(r.elapsed_ms!) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-center text-gray-500">
                        {r.timing_count > 0 ? r.timing_count : ''}
                        {r.has_outlier_flag && (
                          <span className="ml-1 text-yellow-500" title="Outlier flag — check raw taps">⚠</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {isSpecialStatus ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>
                              {r.status?.toUpperCase()}
                            </span>
                            <button
                              onClick={() => handleSetEntryStatus(r.entry_id, null)}
                              className="text-gray-300 hover:text-gray-600 text-xs"
                              title="Clear status"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleSetEntryStatus(r.entry_id, 'dns')}
                              className="text-xs px-1.5 py-0.5 rounded border border-gray-200 text-gray-400 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                            >
                              DNS
                            </button>
                            <button
                              onClick={() => handleSetEntryStatus(r.entry_id, 'dnf')}
                              className="text-xs px-1.5 py-0.5 rounded border border-gray-200 text-gray-400 hover:border-yellow-400 hover:text-yellow-600 hover:bg-yellow-50 transition-colors"
                            >
                              DNF
                            </button>
                            <button
                              onClick={() => handleSetEntryStatus(r.entry_id, 'dsq')}
                              className="text-xs px-1.5 py-0.5 rounded border border-gray-200 text-gray-400 hover:border-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            >
                              DSQ
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        )}
      </div>

      {/* Raw taps collapsible */}
      <details className="bg-white rounded-lg border text-sm">
        <summary className="px-4 py-3 cursor-pointer font-medium text-gray-500 hover:text-gray-800">
          All raw taps ({allTaps.length})
        </summary>
        <div className="border-t divide-y max-h-64 overflow-y-auto">
          {allTaps.map((tap) => {
            const refStart = !isHeadRace && race.actual_start ? race.actual_start : null;
            const elapsed = refStart
              ? new Date(tap.recorded_at).getTime() - new Date(refStart).getTime()
              : null;
            return (
              <div key={tap.id}
                className={`flex items-center gap-3 px-4 py-2 text-xs ${tap.is_outlier ? 'bg-red-50' : ''}`}>
                <span className="font-mono text-gray-400">{formatTime(tap.recorded_at)}</span>
                {elapsed !== null && elapsed > 0 && (
                  <span className="font-mono">{formatElapsed(elapsed)}</span>
                )}
                <span className="text-gray-500">
                  {tap.bow_number !== null ? `→ Bow #${tap.bow_number}` : 'unassigned'}
                </span>
                {tap.is_outlier && (
                  <span className="text-red-500 font-semibold">
                    outlier ({tap.outlier_delta_ms !== null
                      ? `${tap.outlier_delta_ms > 0 ? '+' : ''}${(tap.outlier_delta_ms / 1000).toFixed(2)}s`
                      : '?'})
                  </span>
                )}
              </div>
            );
          })}
          {allTaps.length === 0 && <p className="p-4 text-gray-400">No taps yet.</p>}
        </div>
      </details>
    </div>
  );
}
