'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '../../../../utils/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import OarBlade from '@/components/OarBlade';
import { RaceType, RaceStatus } from '../../../../utils/types/race';
import { RawTiming } from '../../../../utils/types/rawTiming';
import {
  insertRawTiming,
  assignBowNumber,
  deleteRawTiming,
} from '../../../../utils/rawTimings/getRawTiming';

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

export default function TimerPage() {
  const { loading: profileLoading } = useProfile();
  const supabase = useRef(createClient()).current;

  const [race, setRace] = useState<Race | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [myTaps, setMyTaps] = useState<RawTiming[]>([]);
  const [allTaps, setAllTaps] = useState<RawTiming[]>([]);
  const [results, setResults] = useState<EntryResult[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);

  const [timerProfiles, setTimerProfiles] = useState<Record<string, string>>({});
  const [bowInputs, setBowInputs] = useState<Record<string, string>>({});
  const [now, setNow] = useState(new Date());
  const [isTapping, setIsTapping] = useState(false);

  // ─── Timer profile lookup ─────────────────────────────────────────────────

  const ensureTimerProfiles = useCallback(async (userIds: string[]) => {
    if (userIds.length === 0) return;
    setTimerProfiles((prev) => {
      const missing = userIds.filter((id) => !(id in prev));
      if (missing.length === 0) return prev;
      supabase
        .from('profiles')
        .select('id, display_name, email')
        .in('id', missing)
        .then(({ data }) => {
          if (!data) return;
          setTimerProfiles((current) => {
            const next = { ...current };
            for (const p of data) {
              next[p.id] = p.display_name || p.email || p.id.slice(0, 8);
            }
            return next;
          });
        });
      return prev;
    });
  }, [supabase]);

  // ─── Results refresh ──────────────────────────────────────────────────────

  const refreshResults = useCallback(async (raceId: number) => {
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
  }, [supabase]);

  // ─── Load — extracted to useCallback so realtime can trigger it ──────────

  const loadRace = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);

      const { data: raceData, error: raceErr } = await supabase
        .from('races')
        .select('id, race_name, race_type, race_status, actual_start')
        .eq('race_status', RaceStatus.STARTED)
        .maybeSingle();

      if (raceErr) {
        setError('Failed to load races');
        return;
      }

      if (!raceData) {
        setRace(null);
        setEntries([]);
        setMyTaps([]);
        setAllTaps([]);
        setResults([]);
        return;
      }

      setRace(raceData);
      const raceId = raceData.id;

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

      const timerIds = [...new Set(taps.map((t) => t.timer_user_id).filter(Boolean))];
      await ensureTimerProfiles(timerIds as string[]);

      await refreshResults(raceId);
    } catch (err) {
      console.error('Timer page load error:', err);
      setError('Failed to load. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [supabase, refreshResults, ensureTimerProfiles]);

  useEffect(() => {
    loadRace();
  }, [loadRace]);

  // ─── Live clock ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (race?.race_status === RaceStatus.FINISHED || race?.race_status === RaceStatus.ABANDONED) return;
    const interval = setInterval(() => setNow(new Date()), 100);
    return () => clearInterval(interval);
  }, [race?.race_status]);

  // ─── Realtime ────────────────────────────────────────────────────────────
  //
  // Two subscription modes:
  //   1. No race / finished race → watch globally for the NEXT race to start,
  //      then call loadRace() to automatically pull timers into it.
  //   2. Active race → watch taps, results, and the current race row for updates.

  useEffect(() => {
    const isFinished =
      race?.race_status === RaceStatus.FINISHED ||
      race?.race_status === RaceStatus.ABANDONED;

    const channels: ReturnType<typeof supabase.channel>[] = [];

    // ── Mode 1: watching for the next race to start ────────────────────────
    if (!race || isFinished) {
      const watchChannel = supabase
        .channel('timer-watch-next')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'races' },
          (payload) => {
            const updated = payload.new as Race;
            if (updated.race_status === RaceStatus.STARTED) {
              loadRace();
            }
          }
        )
        .subscribe();
      channels.push(watchChannel);
    }

    // ── Mode 2: subscriptions for the currently active race ────────────────
    if (race) {
      const raceId = race.id;

      const raceChannel = supabase
        .channel(`timer-timing-${raceId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'raw_timings', filter: `race_id=eq.${raceId}` },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newTap = payload.new as RawTiming;
              if (newTap.timer_user_id) ensureTimerProfiles([newTap.timer_user_id]);
            }

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
          refreshResults(raceId);
        })
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'races', filter: `id=eq.${raceId}` },
          (payload) => {
            const updatedRace = payload.new as Race;
            // Race finished or abandoned — go straight back to the waiting screen
            if (
              updatedRace.race_status === RaceStatus.FINISHED ||
              updatedRace.race_status === RaceStatus.ABANDONED
            ) {
              loadRace();
            } else {
              setRace((prev) => prev ? { ...prev, ...updatedRace } : prev);
            }
          }
        )
        .subscribe();

      channels.push(raceChannel);
    }

    return () => { channels.forEach((ch) => supabase.removeChannel(ch)); };
  }, [race, currentUserId, supabase, refreshResults, ensureTimerProfiles, loadRace]);

  // ─── Derived state ────────────────────────────────────────────────────────

  const isHeadRace = race?.race_type === RaceType.HEAD_RACE || race?.race_type === RaceType.TIME_TRIAL;
  const isStarted = !!race?.actual_start;
  const anyEntryStarted = isHeadRace && entries.some((e) => e.actual_start);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const handleTap = async () => {
    if (isTapping || !race) return;
    setIsTapping(true);
    const tapTime = new Date();
    const optimisticId = `opt-${Date.now()}`;
    const optimisticTap: RawTiming = {
      id: optimisticId, created_at: tapTime.toISOString(), race_id: race.id,
      timer_user_id: currentUserId ?? '', recorded_at: tapTime.toISOString(),
      bow_number: null, is_outlier: false, outlier_delta_ms: null, notes: null,
    };
    setMyTaps((prev) => [optimisticTap, ...prev]);

    const result = await insertRawTiming(race.id, tapTime);
    if (!result) {
      setMyTaps((prev) => prev.filter((t) => t.id !== optimisticId));
      console.error('Failed to record tap.');
      setIsTapping(false);
      return;
    }
    setMyTaps((prev) => prev.map((t) => (t.id === optimisticId ? result : t)));
    setIsTapping(false);
  };

  const handleAssign = async (tapId: string) => {
    if (!race) return;
    const bowStr = bowInputs[tapId]?.trim();
    const bowNumber = parseInt(bowStr ?? '', 10);
    if (isNaN(bowNumber) || bowNumber < 0) return;

    const entry = entries.find((e) => e.bow_number === bowNumber);
    if (!entry) { alert(`Bow ${bowNumber} is not registered in this race.`); return; }

    setMyTaps((prev) => prev.filter((t) => t.id !== tapId));
    setBowInputs((prev) => { const n = { ...prev }; delete n[tapId]; return n; });

    const ok = await assignBowNumber(tapId, bowNumber);
    if (!ok) { alert('Failed to assign bow number.'); return; }

    await fetch(`/api/pipeline/${race.id}/${bowNumber}`, { method: 'POST' });
  };

  const handleDeleteTap = async (tapId: string) => {
    setMyTaps((prev) => prev.filter((t) => t.id !== tapId));
    await deleteRawTiming(tapId);
  };

  const sortedResults = [...results].sort((a, b) => {
    const aIsSpecial = a.status && ['dns','dnf','dsq'].includes(a.status);
    const bIsSpecial = b.status && ['dns','dnf','dsq'].includes(b.status);
    if (aIsSpecial && !bIsSpecial) return 1;
    if (!aIsSpecial && bIsSpecial) return -1;
    if (a.elapsed_ms !== null && b.elapsed_ms !== null) return a.elapsed_ms - b.elapsed_ms;
    if (a.elapsed_ms !== null) return -1;
    if (b.elapsed_ms !== null) return 1;
    return a.bow_number - b.bow_number;
  });

  const raceElapsed = race?.actual_start && !isHeadRace && race.race_status === RaceStatus.STARTED
    ? now.getTime() - new Date(race.actual_start).getTime()
    : null;

  // ─── Render ──────────────────────────────────────────────────────────────

  if (profileLoading || loading) {
    return <div className="p-8 text-gray-500">Loading...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-600">{error}</div>;
  }

  // No active race — waiting state
  if (!race) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="relative h-20 w-20">
              <div className="absolute inset-0 rounded-full bg-blue-500 animate-pulse opacity-75" />
              <div className="absolute inset-2 rounded-full bg-blue-400 animate-pulse opacity-50" />
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-bold text-gray-900">No active race</h1>
            <p className="text-lg text-gray-500 mt-2">Waiting for a race to start...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{race.race_name ?? 'Unnamed Race'}</h1>
        <p className="text-sm text-gray-500">{isHeadRace ? 'Head / Time Trial' : 'Sprint'} · Timer</p>
      </div>

      {/* Sprint timing display */}
      {!isHeadRace && isStarted && (
        <div className="bg-white rounded-lg border p-4">
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

          {/* Unassigned taps — visible until assigned even after race ends */}
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
                    <Button size="sm" className="h-8 px-3" onClick={() => handleAssign(tap.id)}>✓</Button>
                    <Button size="sm" variant="ghost" className="h-8 px-2 text-gray-300 hover:text-red-500"
                      onClick={() => handleDeleteTap(tap.id)} title="Discard tap">✕</Button>
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
          <p className="p-4 text-sm text-gray-400">No finishes recorded yet.</p>
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
              {sortedResults.map((r, i) => {
                const isSpecialStatus = r.status && ['dns','dnf','dsq'].includes(r.status);
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
                      {isSpecialStatus ? '—' : r.elapsed_ms !== null ? i + 1 : '—'}
                    </td>
                    <td className="px-4 py-2.5 font-bold">{r.bow_number}</td>
                    <td className="px-4 py-2.5 text-gray-700">
                      <span className="flex items-center gap-1.5">
                        <OarBlade oarspotterKey={r.oarspotter_key} size={18} />
                        {r.team_name}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold">
                      {isSpecialStatus ? '—' : r.elapsed_ms !== null ? formatElapsed(r.elapsed_ms) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-center text-gray-500">
                      {r.timing_count}
                      {r.has_outlier_flag && (
                        <span className="ml-1 text-yellow-500" title="Outlier flag — check raw taps">⚠</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {isSpecialStatus ? (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>
                          {r.status?.toUpperCase()}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Raw taps — shows timer identity */}
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
            const timerLabel = tap.timer_user_id
              ? timerProfiles[tap.timer_user_id] ?? tap.timer_user_id.slice(0, 8)
              : 'unknown';
            const isMe = tap.timer_user_id === currentUserId;
            return (
              <div key={tap.id}
                className={`flex items-center gap-3 px-4 py-2 text-xs ${tap.is_outlier ? 'bg-red-50' : ''}`}>
                <span className="font-mono text-gray-400 shrink-0">{formatTime(tap.recorded_at)}</span>
                {elapsed !== null && elapsed > 0 && (
                  <span className="font-mono shrink-0">{formatElapsed(elapsed)}</span>
                )}
                <span className="text-gray-500 shrink-0">
                  {tap.bow_number !== null ? `→ Bow #${tap.bow_number}` : 'unassigned'}
                </span>
                <span className={`ml-auto shrink-0 px-1.5 py-0.5 rounded text-xs font-medium
                  ${isMe ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                  {isMe ? `${timerLabel} (you)` : timerLabel}
                </span>
                {tap.is_outlier && (
                  <span className="text-red-500 font-semibold shrink-0">
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
