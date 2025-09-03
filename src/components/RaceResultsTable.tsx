'use client';
import { useEffect, useState } from "react";
import { Race } from "../../utils/types/race";
import { getRaceResultsByRace } from "../../utils/raceResults/getRaceResult";
import { createClient } from "../../utils/supabase/client";
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
    teams: {
      id: bigint;
      team_name: string;
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
        const raceResults = await getRaceResultsByRace(race.id);
        
        // Filter and sort results
        const finishedResults = raceResults
          .filter((result: any) => result.entries && result.start_time && result.end_time)
          .map((result: any) => ({
            ...result,
            raceTime: calculateRaceTime(result.start_time, result.end_time)
          }))
          .sort((a: any, b: any) => a.raceTime - b.raceTime); // Sort by race time (fastest first)

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
              <TableHead className="text-right">Start</TableHead>
              <TableHead className="text-right">Finish</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((result: any, index) => (
              <TableRow key={result.id.toString()}>
                <TableCell className="font-medium">
                  {index + 1}
                </TableCell>
                <TableCell className="font-medium">
                  {result.entries.bow_number}
                </TableCell>
                <TableCell>
                  {result.entries.teams.team_name}
                </TableCell>
                <TableCell className="text-right font-mono font-bold">
                  {formatRaceTime(result.raceTime)}
                </TableCell>
                <TableCell className="text-right text-sm text-gray-600">
                  {formatTime(result.start_time)}
                </TableCell>
                <TableCell className="text-right text-sm text-gray-600">
                  {formatTime(result.end_time)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card Layout */}
      <div className="md:hidden space-y-3">
        {results.map((result: any, index) => (
          <div key={result.id.toString()} className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>
                <div>
                  <div className="font-medium">Bow {result.entries.bow_number}</div>
                  <div className="text-sm text-gray-600">{result.entries.teams.team_name}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold text-lg">
                  {formatRaceTime(result.raceTime)}
                </div>
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-3 pt-2 border-t">
              <div>
                <span className="block">Start</span>
                <span>{formatTime(result.start_time)}</span>
              </div>
              <div className="text-right">
                <span className="block">Finish</span>
                <span>{formatTime(result.end_time)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}