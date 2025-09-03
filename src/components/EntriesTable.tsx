'use client';
import { getAllBoats } from "../../utils/boats/getBoat";
import { getAllTeams } from "../../utils/teams/getTeam";
import { getAllRaces } from "../../utils/races/getRace";
import { useEffect, useState } from "react";
import { createClient } from "../../utils/supabase/client";
import { Boat } from "../../utils/types/boat";
import { Team } from "../../utils/types/team";
import { Race } from "../../utils/types/race";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function EntriesTable() {
  const [entries, setEntries] = useState<Boat[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [races, setRaces] = useState<Race[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [entriesData, teamsData, racesData] = await Promise.all([
          getAllBoats(),
          getAllTeams(),
          getAllRaces()
        ]);
        setEntries(entriesData || []);
        setTeams(teamsData || []);
        setRaces(racesData || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Subscribe to realtime changes
    const supabase = createClient();
    const channel = supabase
      .channel('entries_table_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'entries'
        },
        async () => {
          console.log('Entries table change detected, refetching data');
          await fetchData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teams'
        },
        async () => {
          console.log('Teams table change detected, refetching data');
          await fetchData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'races'
        },
        async () => {
          console.log('Races table change detected, refetching data');
          await fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getTeamName = (teamId: bigint): string => {
    const team = teams.find(t => t.id === teamId);
    return team?.team_name || 'Unknown Team';
  };

  const getRaceName = (raceId: bigint | null): string => {
    if (!raceId) return 'No Race';
    const race = races.find(r => r.id === raceId);
    return race?.race_name || 'Unknown Race';
  };

  if (loading) {
    return <p>Loading entries...</p>;
  }

  return (
    <Table>
      <TableCaption>A list of all entries in the regatta.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Bow Number</TableHead>
          <TableHead>Team</TableHead>
          <TableHead>Race</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center">
              No entries found
            </TableCell>
          </TableRow>
        ) : (
          entries.map((entry) => (
            <TableRow key={entry.id.toString()}>
              <TableCell className="font-medium">
                {entry.bow_number || 'N/A'}
              </TableCell>
              <TableCell>{getTeamName(entry.team_id)}</TableCell>
              <TableCell>{getRaceName(entry.race_id)}</TableCell>
              <TableCell>
                <span className={`px-2 py-1 rounded text-xs ${
                  entry.boat_status === 'registered' ? 'bg-blue-100 text-blue-800' :
                  entry.boat_status === 'ready' ? 'bg-yellow-100 text-yellow-800' :
                  entry.boat_status === 'on_water' ? 'bg-green-100 text-green-800' :
                  entry.boat_status === 'finished' ? 'bg-gray-100 text-gray-800' :
                  entry.boat_status === 'dns' ? 'bg-orange-100 text-orange-800' :
                  entry.boat_status === 'dnf' ? 'bg-red-100 text-red-800' :
                  entry.boat_status === 'dsq' ? 'bg-purple-100 text-purple-800' :
                  'bg-gray-50 text-gray-500'
                }`}>
                  {entry.boat_status?.toUpperCase() || 'N/A'}
                </span>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}