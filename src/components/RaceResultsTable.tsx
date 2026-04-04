'use client';
import { useEffect, useState } from "react";
import { Race } from "../../utils/types/race";
import { getRaceResultsByRace } from "../../utils/raceResults/getRaceResult";
import { createClient } from "../../utils/supabase/client";
import { getBoatsByRace } from "../../utils/boats/getBoat";
import { assignLevelsToBoats } from "../../utils/boats/assignLevels";
import OarBlade from "./OarBlade";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface RaceResult {
  id: bigint;
  entry_id: bigint;
  start_time: string | null;
  end_time: string | null;
  elapsed_ms: number | null;
  margin_ms: number | null;
  status: string | null;
  entries: {
    id: bigint;
    bow_number: number;
    level?: string | null;
    teams: {
      id: bigint;
      team_name: string;
      team_short_name: string | null;
      oarspotter_key: string | null;
    };
  };
}

interface EntryWithTeam {
  id: number;
  bow_number: number;
  boat_status: string;
  level?: string | null;
  teams: {
    id: number;
    team_name: string;
    team_short_name: string | null;
    oarspotter_key: string | null;
  } | null;
}

interface RaceResultsTableProps {
  race: Race;
  /** Hide the outer card wrapper and title — for embedding in another card */
  compact?: boolean;
}

export default function RaceResultsTable({ race, compact = false }: RaceResultsTableProps) {
  const [results, setResults] = useState<RaceResult[]>([]);
  const [entries, setEntries] = useState<EntryWithTeam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const fetchResults = async () => {
      try {
        const [raceResults, boatEntries] = await Promise.all([
          getRaceResultsByRace(race.id),
          getBoatsByRace(race.id)
        ]);

        const boatEntriesWithLevels = assignLevelsToBoats(boatEntries || []);

        // Always store entries for lane assignment display
        setEntries(boatEntriesWithLevels as unknown as EntryWithTeam[]);

        // Filter and sort results — include special statuses (DNF/DSQ/DNS)
        const specialStatuses = ['dns', 'dnf', 'dsq'];
        const finishedResults = raceResults
          .filter((result: any) => result.entries && (
            (result.start_time && result.end_time) ||
            (result.elapsed_ms != null) ||
            (result.status && specialStatuses.includes(result.status))
          ))
          .map((result: any) => {
            const boatWithLevel = boatEntriesWithLevels.find(boat => boat.id === result.entries.id);
            const isSpecialStatus = result.status && specialStatuses.includes(result.status);

            let raceTime: number | null = null;
            if (!isSpecialStatus) {
              if (result.elapsed_ms != null) {
                raceTime = result.elapsed_ms;
              } else if (result.start_time && result.end_time) {
                raceTime = calculateRaceTime(result.start_time, result.end_time);
              }
            }

            return {
              ...result,
              entries: {
                ...result.entries,
                level: boatWithLevel?.level
              },
              raceTime,
              marginMs: result.margin_ms as number | null,
              isSpecialStatus,
            };
          })
          .sort((a: any, b: any) => {
            if (a.isSpecialStatus && !b.isSpecialStatus) return 1;
            if (!a.isSpecialStatus && b.isSpecialStatus) return -1;
            if (a.isSpecialStatus && b.isSpecialStatus) {
              return specialStatuses.indexOf(a.status) - specialStatuses.indexOf(b.status);
            }
            return (a.raceTime ?? Infinity) - (b.raceTime ?? Infinity);
          });

        // Compute margins if not already in DB
        if (finishedResults.length > 0) {
          const winnerTime = finishedResults[0]?.raceTime;
          finishedResults.forEach((r: any) => {
            if (r.marginMs == null && r.raceTime != null && winnerTime != null && r.raceTime !== winnerTime) {
              r.marginMs = r.raceTime - winnerTime;
            }
          });
        }

        setResults(finishedResults);
      } catch (error) {
        console.error('Error fetching race results:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();

    const channel = supabase
      .channel(`race_results_${Number(race.id)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'race_results' },
        async () => { await fetchResults(); }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'entries' },
        async () => { await fetchResults(); }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [race.id]);

  const calculateRaceTime = (startTime: string, endTime: string): number => {
    return new Date(endTime).getTime() - new Date(startTime).getTime();
  };

  const getTeamDisplayName = (result: any): string => {
    const teams = result.entries.teams;
    const teamName = compact && teams.team_short_name ? teams.team_short_name : teams.team_name;
    return result.entries.level ? `${teamName} ${result.entries.level}` : teamName;
  };

  const formatRaceTime = (raceTime: number): string => {
    const totalSeconds = Math.floor(raceTime / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((raceTime % 1000) / 10);

    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
    } else {
      return `${seconds}.${milliseconds.toString().padStart(2, '0')}`;
    }
  };

  const formatMargin = (ms: number): string => {
    return `+${formatRaceTime(ms)}`;
  };

  // ─── Loading state ─────────────────────────────────────────────────────

  if (loading) {
    if (compact) {
      return <p className="text-sm text-slate-400 py-3">Loading results...</p>;
    }
    return (
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Race Results</h2>
        <p className="text-slate-500">Loading results...</p>
      </div>
    );
  }

  // ─── No results — show lane assignments ────────────────────────────────

  if (results.length === 0) {
    const sortedEntries = [...entries].sort((a, b) => (a.bow_number ?? 0) - (b.bow_number ?? 0));

    const laneContent = sortedEntries.length === 0 ? (
      <p className="text-sm text-slate-400 py-3">No entries yet</p>
    ) : (
      <>
        {/* Desktop */}
        <div className="hidden md:block">
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-slate-50 to-slate-25 border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide w-16">Lane</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Team</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedEntries.map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-700 text-sm">{entry.bow_number}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <OarBlade oarspotterKey={entry.teams?.oarspotter_key ?? null} size={18} />
                        <span className="font-medium text-slate-900 text-sm truncate">
                          {(compact && entry.teams?.team_short_name) ? entry.teams.team_short_name : (entry.teams?.team_name || 'TBD')}
                          {entry.level ? ` ${entry.level}` : ''}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <EntryStatusBadge status={entry.boat_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile */}
        <div className="md:hidden space-y-2">
          {sortedEntries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all">
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-700">
                  {entry.bow_number}
                </span>
                <OarBlade oarspotterKey={entry.teams?.oarspotter_key ?? null} size={14} />
                <span className="font-medium text-slate-900 text-xs truncate">
                  {(compact && entry.teams?.team_short_name) ? entry.teams.team_short_name : (entry.teams?.team_name || 'TBD')}
                  {entry.level ? ` ${entry.level}` : ''}
                </span>
              </div>
              <div className="flex-shrink-0 ml-2">
                <EntryStatusBadge status={entry.boat_status} />
              </div>
            </div>
          ))}
        </div>
      </>
    );

    if (compact) {
      return laneContent;
    }
    return (
      <div className="bg-white p-4 md:p-6 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
        <h2 className="text-lg font-semibold text-slate-900 mb-5">Lane Assignments</h2>
        {laneContent}
      </div>
    );
  }

  // ─── Results table ─────────────────────────────────────────────────────


  const tableContent = (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block">
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-slate-25 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide w-16">Pos</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide w-16">Bow</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Team</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide">Time</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wide w-28">Margin</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result: any, index) => {
                const statusLabel = result.status?.toUpperCase();
                const isMedalPosition = index < 3 && !result.isSpecialStatus;

                return (
                  <tr
                    key={result.id.toString()}
                    className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-4 text-center">
                      {result.isSpecialStatus ? (
                        <span className="text-slate-400 text-xs">—</span>
                      ) : (
                        <span className="text-base font-bold text-slate-700">
                          {index + 1}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-4 font-semibold text-slate-700 text-sm">{result.entries.bow_number}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <OarBlade oarspotterKey={result.entries?.teams?.oarspotter_key ?? null} size={18} />
                        <span className="font-medium text-slate-900 text-sm truncate">{getTeamDisplayName(result)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-4 text-right">
                      {result.isSpecialStatus ? (
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg inline-block
                          ${result.status === 'dns' ? 'bg-orange-100 text-orange-800' :
                            result.status === 'dnf' ? 'bg-yellow-100 text-yellow-800' :
                            result.status === 'dsq' ? 'bg-red-100 text-red-800' : ''}
                        `}>
                          {statusLabel}
                        </span>
                      ) : result.raceTime != null ? (
                        <span className="font-mono font-bold text-base text-slate-700">
                          {formatRaceTime(result.raceTime)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-4 text-right">
                      {!result.isSpecialStatus && result.marginMs != null ? (
                        <span className="font-mono text-xs text-slate-500">{formatMargin(result.marginMs)}</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card Layout */}
      <div className="md:hidden space-y-2.5">
        {results.map((result: any, index) => {
          const statusLabel = result.status?.toUpperCase();
          const isMedalPosition = index < 3 && !result.isSpecialStatus;

          return (
            <div
              key={result.id.toString()}
              className={`rounded-lg p-3 border transition-colors ${
                result.status === 'dsq' ? 'bg-red-50 border-red-200 hover:bg-red-75 hover:border-red-300'
                  : result.status === 'dnf' ? 'bg-yellow-50 border-yellow-200 hover:bg-yellow-75 hover:border-yellow-300'
                  : result.status === 'dns' ? 'bg-orange-50 border-orange-200 hover:bg-orange-75 hover:border-orange-300'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              } hover:shadow-sm`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    result.isSpecialStatus
                      ? 'bg-slate-200 text-slate-500'
                      : 'bg-slate-100 text-slate-600'
                  }`}>
                    {result.isSpecialStatus ? '—' : index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0 mb-0.5">
                      <OarBlade oarspotterKey={result.entries?.teams?.oarspotter_key ?? null} size={14} />
                      <span className="font-medium text-slate-900 truncate text-sm">{getTeamDisplayName(result)}</span>
                    </div>
                    <div className="text-xs text-slate-500">Bow {result.entries.bow_number}</div>
                  </div>
                </div>
                <div className="flex-shrink-0 ml-2 text-right">
                  {result.isSpecialStatus ? (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-lg inline-block
                      ${result.status === 'dns' ? 'bg-orange-100 text-orange-800' :
                        result.status === 'dnf' ? 'bg-yellow-100 text-yellow-800' :
                        result.status === 'dsq' ? 'bg-red-100 text-red-800' : ''}
                    `}>
                      {statusLabel}
                    </span>
                  ) : (
                    <>
                      <div className="font-mono font-bold text-sm text-slate-700">
                        {result.raceTime != null ? formatRaceTime(result.raceTime) : '—'}
                      </div>
                      {result.marginMs != null && (
                        <div className="font-mono text-xs text-slate-500">
                          {formatMargin(result.marginMs)}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );

  if (compact) {
    return tableContent;
  }

  return (
    <div className="bg-white p-4 md:p-6 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <h2 className="text-lg font-semibold text-slate-900 mb-5">Race Results</h2>
      {tableContent}
    </div>
  );
}

// ─── Shared sub-components ─────────────────────────────────────────────────

function EntryStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    entered: 'bg-slate-100 text-slate-600',
    ready: 'bg-amber-100 text-amber-700',
    on_water: 'bg-blue-100 text-blue-700',
    finished: 'bg-emerald-100 text-emerald-700',
  };
  const labels: Record<string, string> = {
    entered: 'Entered',
    ready: 'Ready',
    on_water: 'On Water',
    finished: 'Finished',
  };

  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-md inline-block ${styles[status] || 'bg-slate-100 text-slate-600'}`}>
      {labels[status] || status}
    </span>
  );
}
