'use client';
import { getBoatsByRace, addBoatToRace, removeBoatFromRace, updateBowNumber } from "../../utils/boats/getBoat";
import { getAllTeams } from "../../utils/teams/getTeam";
import { useEffect, useState } from "react";
import { createClient } from "../../utils/supabase/client";
import { Race, RaceStatus } from "../../utils/types/race";
import { Team } from "../../utils/types/team";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface RaceEntriesTableProps {
  race: Race;
  onBack: () => void;
}

export default function RaceEntriesTable({ race, onBack }: RaceEntriesTableProps) {
  const [entries, setEntries] = useState<any[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [bowNumber, setBowNumber] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);

  const isScheduled = race.race_status === RaceStatus.SCHEDULED;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [entriesData, teamsData] = await Promise.all([
          getBoatsByRace(race.id),
          getAllTeams()
        ]);
        setEntries(entriesData || []);
        setTeams(teamsData || []);
      } catch (error) {
        console.error('Error fetching race data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Subscribe to realtime changes for this specific race
    const supabase = createClient();
    const channel = supabase
      .channel(`race_entries_${race.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'entries'
        },
        async () => {
          console.log('Race entries change detected, refetching data');
          await fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [race.id]);

  const getTeamName = (entry: any): string => {
    return entry.teams?.team_name || 'Unknown Team';
  };

  const getAvailableTeams = () => {
    const entryTeamIds = entries.map(entry => entry.team_id.toString());
    return teams.filter(team => !entryTeamIds.includes(team.id.toString()));
  };

  const handleAddEntry = async () => {
    if (!selectedTeamId || !bowNumber || !isScheduled) return;

    try {
      const teamId = BigInt(selectedTeamId);
      const bow = parseInt(bowNumber);

      if (isNaN(bow) || bow <= 0) {
        alert('Please enter a valid bow number');
        return;
      }

      const bowExists = entries.some(entry => entry.bow_number === bow);
      if (bowExists) {
        alert('This bow number is already taken');
        return;
      }

      const newEntry = await addBoatToRace(teamId, race.id, bow);
      if (newEntry) {
        const updatedEntries = await getBoatsByRace(race.id);
        setEntries(updatedEntries || []);
        setSelectedTeamId('');
        setBowNumber('');
        setShowAddForm(false);
      } else {
        alert('Failed to add entry');
      }
    } catch (error) {
      console.error('Error adding entry:', error);
      alert('Failed to add entry');
    }
  };

  const handleRemoveEntry = async (entryId: bigint) => {
    if (!isScheduled) return;

    if (confirm('Are you sure you want to remove this entry?')) {
      try {
        const success = await removeBoatFromRace(entryId);
        if (success) {
          setEntries(entries.filter(entry => entry.id.toString() !== entryId.toString()));
        } else {
          alert('Failed to remove entry');
        }
      } catch (error) {
        console.error('Error removing entry:', error);
        alert('Failed to remove entry');
      }
    }
  };

  if (loading) {
    return <p>Loading entries for {race.race_name}...</p>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Entries in {race.race_name || 'Unnamed Race'}
        </h3>
        {isScheduled && (
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            className="ml-4"
            disabled={getAvailableTeams().length === 0}
          >
            {showAddForm ? 'Cancel' : 'Add Entry'}
          </Button>
        )}
      </div>

      {isScheduled && showAddForm && (
        <div className="mb-6 p-4 border rounded-lg bg-gray-50">
          <h4 className="text-md font-medium mb-3">Add New Entry</h4>
          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="team-select">Team</Label>
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger id="team-select">
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableTeams().map((team) => (
                    <SelectItem key={team.id.toString()} value={team.id.toString()}>
                      {team.team_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-32 space-y-2">
              <Label htmlFor="bow-number">Bow Number</Label>
              <Input
                id="bow-number"
                type="number"
                value={bowNumber}
                onChange={(e) => setBowNumber(e.target.value)}
                placeholder="1"
                min="1"
              />
            </div>
            <Button
              onClick={handleAddEntry}
              disabled={!selectedTeamId || !bowNumber}
              className="mt-auto"
            >
              Add Entry
            </Button>
          </div>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Bow Number</TableHead>
            <TableHead>Team</TableHead>
            <TableHead>Status</TableHead>
            {isScheduled && <TableHead>Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={isScheduled ? 4 : 3} className="text-center">
                No entries in this race
              </TableCell>
            </TableRow>
          ) : (
            entries.map((entry) => (
              <TableRow key={entry.id.toString()}>
                <TableCell className="font-medium">
                  {entry.bow_number || 'N/A'}
                </TableCell>
                <TableCell>{getTeamName(entry)}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded text-xs ${entry.boat_status === 'registered' ? 'bg-blue-100 text-blue-800' :
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
                {isScheduled && (
                  <TableCell>
                    <Button
                      onClick={() => handleRemoveEntry(entry.id)}
                      variant="destructive"
                      size="sm"
                    >
                      Remove
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}