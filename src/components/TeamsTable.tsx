'use client';
import { getAllTeams } from "../../utils/teams/getTeam";
import { useEffect, useState } from "react";
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

export default function TeamsTable() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const teamsData = await getAllTeams();
        setTeams(teamsData || []);
      } catch (error) {
        console.error('Error fetching teams:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  if (loading) {
    return <p>Loading teams...</p>;
  }

  return (
    <Table>
      <TableCaption>A list of all teams in the regatta.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Team Name</TableHead>
          <TableHead>Short Name</TableHead>
          <TableHead>Primary Color</TableHead>
          <TableHead>Secondary Color</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {teams.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-center">
              No teams found
            </TableCell>
          </TableRow>
        ) : (
          teams.map((team) => (
            <TableRow key={team.id.toString()}>
              <TableCell className="font-medium">
                {team.team_name}
              </TableCell>
              <TableCell>{team.team_short_name || 'N/A'}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {team.primary_color && (
                    <div 
                      className="w-4 h-4 rounded border border-gray-300"
                      style={{ backgroundColor: team.primary_color }}
                    />
                  )}
                  {team.primary_color || 'N/A'}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {team.secondary_color && (
                    <div 
                      className="w-4 h-4 rounded border border-gray-300"
                      style={{ backgroundColor: team.secondary_color }}
                    />
                  )}
                  {team.secondary_color || 'N/A'}
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}