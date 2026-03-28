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
  status: string | null;
  entries: {
    id: bigint;
    bow_number: number;
    level?: string | null;
    teams: {
      id: bigint;
      team_name: string;
      oarspotter_key: string | null;
    };
  };
}

interface RaceResultsTableProps {
  race: Race;
}

export default function RaceResultsTable({ race }: RaceResultsTableProps) {
  const [results, setResults] = useState<RaceResult[]>([]);
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
        
        // Filter and sort results — include special statuses (DNF/DSQ/DNS)
        const specialStatuses = ['dns', 'dnf', 'dsq'];
        const finishedResults = raceResults
          .filter((result: any) => result.entries && (
            (result.start_time && result.end_time) ||
            (result.status && specialStatuses.includes(result.status))
          ))
          .map((result: any) => {
            // Find the boat entry with level
            const boatWithLevel = boatEntriesWithLevels.find(boat => boat.id === result.entries.id);
            const isSpecialStatus = result.status && specialStatuses.includes(result.status);
            return {
              ...result,
              entries: {
                ...result.entries,
                level: boatWithLevel?.level
              },
              raceTime: isSpecialStatus ? null : calculateRaceTime(result.start_time, result.end_time),
              isSpecialStatus,
            };
          })
          .sort((a: any, b: any) => {
            // Special statuses always sort to the bottom
            if (a.isSpecialStatus && !b.isSpecialStatus) return 1;
            if (!a.isSpecialStatus && b.isSpecialStatus) return -1;
            // Both special: sort by status (DNS, DNF, DSQ)
            if (a.isSpecialStatus && b.isSpecialStatus) {
              return specialStatuses.indexOf(a.status) - specialStatuses.indexOf(b.status);
            }
            // Both have times: sort fastest first
            return a.raceTime - b.raceTime;
          });

        setResults(finishedResults);
      } catch (error) {
        console.error('Error fetching race results:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();

    // Subscribe to realtime changes for race_results
    const channel = supabase
      .channel('race_results_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'race_results'
        },
        async (payload) => {
          console.log('Race results change:', payload);
          // Refetch results when any race result changes
          await fetchResults();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'entries'
        },
        async (payload) => {
          console.log('Entries change:', payload);
          // Refetch results when entries change (e.g., boat status updates)
          await fetchResults();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [race.id]);

  const calculateRaceTime = (startTime: string, endTime: string): number => {
    return new Date(endTime).getTime() - new Date(startTime).getTime();
  };

  const getTeamNameWithLevel = (result: any): string => {
    const teamName = result.entries.teams.team_name;
    return result.entries.level ? `${teamName} ${result.entries.level}` : teamName;
  };

  const formatRaceTime = (raceTime: number): string => {
    const totalSeconds = Math.floor(raceTime / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((raceTime % 1000) / 10); // Get centiseconds

    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
    } else {
      return `${seconds}.${milliseconds.toString().padStart(2, '0')}`;
    }
  };

  const formatTime = (timeString: string): string => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Race Results</h2>
        <p>Loading results...</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Race Results</h2>
        <p className="text-gray-500">No finished results yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 md:p-6 rounded-lg border shadow-sm">
      <h2 className="text-lg font-semibold mb-4">Race Results</h2>
      
      {/* Desktop Table */}
      <div className="hidden md:block">
        <Table>
          <TableCaption>Final results for {race.race_name}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Pos</TableHead>
              <TableHead className="w-16">Bow</TableHead>
              <TableHead>Team</TableHead>
              <TableHead className="text-right">Time</TableHead>
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
                      {getTeamNameWithLevel(result)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold">
                    {result.isSpecialStatus ? (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>
                        {statusLabel}
                      </span>
                    ) : (
                      formatRaceTime(result.raceTime)
                    )}
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
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    result.isSpecialStatus ? 'bg-gray-200 text-gray-500' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {result.isSpecialStatus ? '—' : index + 1}
                  </div>
                  <div>
                    <div className="font-medium">Bow {result.entries.bow_number}</div>
                    <div className="text-sm text-gray-600 flex items-center gap-1.5">
                      <OarBlade oarspotterKey={result.entries?.teams?.oarspotter_key ?? null} size={18} />
                      {getTeamNameWithLevel(result)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {result.isSpecialStatus ? (
                    <span className={`text-sm font-semibold px-3 py-1 rounded-full ${statusColor}`}>
                      {statusLabel}
                    </span>
                  ) : (
                    <div className="font-mono font-bold text-lg">
                      {formatRaceTime(result.raceTime)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}