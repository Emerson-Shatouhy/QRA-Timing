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
      return <p className="text-sm text-gray-400 py-3">Loading...</p>;
    }
    return (
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Race Results</h2>
        <p>Loading results...</p>
      </div>
    );
  }

  // ─── No results — show lane assignments ────────────────────────────────

  if (results.length === 0) {
    const sortedEntries = [...entries].sort((a, b) => (a.bow_number ?? 0) - (b.bow_number ?? 0));

    const laneContent = sortedEntries.length === 0 ? (
      <p className="text-sm text-gray-400 py-3">No entries yet</p>
    ) : (
      <>
        {/* Desktop */}
        <div className="hidden md:block">
          <Table>
            {!compact && <TableCaption>Lane assignments for {race.race_name}</TableCaption>}
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Lane</TableHead>
                <TableHead>Team</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">{entry.bow_number}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <OarBlade oarspotterKey={entry.teams?.oarspotter_key ?? null} size={20} />
                      {(compact && entry.teams?.team_short_name) ? entry.teams.team_short_name : (entry.teams?.team_name || 'TBD')}
                      {entry.level ? ` ${entry.level}` : ''}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <EntryStatusBadge status={entry.boat_status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile */}
        <div className="md:hidden space-y-2">
          {sortedEntries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600">
                  {entry.bow_number}
                </span>
                <OarBlade oarspotterKey={entry.teams?.oarspotter_key ?? null} size={18} />
                <span className="font-medium text-sm">
                  {(compact && entry.teams?.team_short_name) ? entry.teams.team_short_name : (entry.teams?.team_name || 'TBD')}
                  {entry.level ? ` ${entry.level}` : ''}
                </span>
              </div>
              <EntryStatusBadge status={entry.boat_status} />
            </div>
          ))}
        </div>
      </>
    );

    if (compact) {
      return laneContent;
    }
    return (
      <div className="bg-white p-4 md:p-6 rounded-lg border shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Lane Assignments</h2>
        {laneContent}
      </div>
    );
  }

  // ─── Results table ─────────────────────────────────────────────────────

  const tableContent = (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block">
        <Table>
          {!compact && <TableCaption>Final results for {race.race_name}</TableCaption>}
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Pos</TableHead>
              <TableHead className="w-16">Bow</TableHead>
              <TableHead>Team</TableHead>
              <TableHead className="text-right">Time</TableHead>
              <TableHead className="text-right w-28">Margin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((result: any, index) => {
              const statusLabel = result.status?.toUpperCase();
              const statusColor =
                result.status === 'dns' ? 'bg-orange-100 text-orange-700' :
                result.status === 'dnf' ? 'bg-yellow-100 text-yellow-700' :
                result.status === 'dsq' ? 'bg-red-100 text-red-700' : '';

              return (
                <TableRow key={result.id.toString()} className={
                  result.status === 'dsq' ? 'bg-red-50' :
                  result.status === 'dnf' ? 'bg-yellow-50' :
                  result.status === 'dns' ? 'bg-orange-50' : ''
                }>
                  <TableCell className="font-medium">
                    {result.isSpecialStatus ? '—' : index + 1}
                  </TableCell>
                  <TableCell className="font-medium">
                    {result.entries.bow_number}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <OarBlade oarspotterKey={result.entries?.teams?.oarspotter_key ?? null} size={20} />
                      {getTeamDisplayName(result)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold">
                    {result.isSpecialStatus ? (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>
                        {statusLabel}
                      </span>
                    ) : result.raceTime != null ? (
                      formatRaceTime(result.raceTime)
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-gray-500">
                    {!result.isSpecialStatus && result.marginMs != null
                      ? formatMargin(result.marginMs)
                      : ''}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card Layout */}
      <div className="md:hidden space-y-3">
        {results.map((result: any, index) => {
          const statusLabel = result.status?.toUpperCase();
          const statusColor =
            result.status === 'dns' ? 'bg-orange-100 text-orange-700' :
            result.status === 'dnf' ? 'bg-yellow-100 text-yellow-700' :
            result.status === 'dsq' ? 'bg-red-100 text-red-700' : '';
          const cardBg =
            result.status === 'dsq' ? 'bg-red-50 border-red-200' :
            result.status === 'dnf' ? 'bg-yellow-50 border-yellow-200' :
            result.status === 'dns' ? 'bg-orange-50 border-orange-200' : 'bg-gray-50';

          return (
            <div key={result.id.toString()} className={`border rounded-lg p-4 ${cardBg}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    result.isSpecialStatus ? 'bg-gray-200 text-gray-500' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {result.isSpecialStatus ? '—' : index + 1}
                  </div>
                  <div>
                    <div className="font-medium flex items-center gap-1.5">
                      <OarBlade oarspotterKey={result.entries?.teams?.oarspotter_key ?? null} size={18} />
                      {getTeamDisplayName(result)}
                    </div>
                    <div className="text-xs text-gray-500">Bow {result.entries.bow_number}</div>
                  </div>
                </div>
                <div className="text-right">
                  {result.isSpecialStatus ? (
                    <span className={`text-sm font-semibold px-3 py-1 rounded-full ${statusColor}`}>
                      {statusLabel}
                    </span>
                  ) : (
                    <>
                      <div className="font-mono font-bold text-lg">
                        {result.raceTime != null ? formatRaceTime(result.raceTime) : '—'}
                      </div>
                      {result.marginMs != null && (
                        <div className="font-mono text-xs text-gray-500">
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
    <div className="bg-white p-4 md:p-6 rounded-lg border shadow-sm">
      <h2 className="text-lg font-semibold mb-4">Race Results</h2>
      {tableContent}
    </div>
  );
}

// ─── Shared sub-components ─────────────────────────────────────────────────

function EntryStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    entered: 'text-gray-400',
    ready: 'text-yellow-600',
    on_water: 'text-blue-600',
    finished: 'text-green-600',
  };
  const labels: Record<string, string> = {
    entered: 'Entered',
    ready: 'Ready',
    on_water: 'On Water',
    finished: 'Finished',
  };

  return (
    <span className={`text-xs font-medium ${styles[status] || 'text-gray-400'}`}>
      {labels[status] || status}
    </span>
  );
}
