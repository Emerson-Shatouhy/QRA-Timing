import { createClient } from "../supabase/client";
import { Team, TeamDivision, TeamGender, TeamCategory } from "../types/team";

/**
 * Creates a new team
 * @param teamName - The full name of the team (required)
 * @param teamShortName - Optional short/abbreviated name
 * @param primaryColor - Optional hex color string
 * @param secondaryColor - Optional hex color string
 * @param division - Optional division (D1, D2, D3)
 * @param gender - Optional gender (mens, womens, both)
 * @param oarspotterKey - Optional OarSpotter image key (filename without .png)
 * @param category - Optional category (collegiate, youth, club, masters)
 * @returns The created team or null if failed
 */
export async function createTeam(
  teamName: string,
  teamShortName?: string,
  primaryColor?: string,
  secondaryColor?: string,
  division?: TeamDivision,
  gender?: TeamGender,
  oarspotterKey?: string,
  category?: TeamCategory,
): Promise<Team | null> {
  const supabase = createClient();
  const { data: team, error } = await supabase
    .from('teams')
    .insert({
      team_name: teamName,
      team_short_name: teamShortName || null,
      primary_color: primaryColor || null,
      secondary_color: secondaryColor || null,
      division: division || null,
      gender: gender || null,
      oarspotter_key: oarspotterKey || null,
      category: category || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating team:', error);
    return null;
  }

  return team;
}

/**
 * Bulk-creates multiple teams in a single insert.
 * Skips teams whose names already exist (uses onConflict to ignore duplicates).
 * @param teams - Array of team data objects
 * @returns Array of created teams (may be fewer than input if duplicates exist)
 */
export async function bulkCreateTeams(
  teams: Array<{
    team_name: string;
    team_short_name?: string;
    primary_color?: string;
    secondary_color?: string;
    division?: TeamDivision;
    gender?: TeamGender;
    oarspotter_key?: string;
    category?: TeamCategory;
  }>
): Promise<Team[]> {
  const supabase = createClient();
  const rows = teams.map(t => ({
    team_name: t.team_name,
    team_short_name: t.team_short_name || null,
    primary_color: t.primary_color || null,
    secondary_color: t.secondary_color || null,
    division: t.division || null,
    gender: t.gender || null,
    oarspotter_key: t.oarspotter_key || null,
    category: t.category || null,
  }));

  const { data, error } = await supabase
    .from('teams')
    .insert(rows)
    .select();

  if (error) {
    console.error('Error bulk-creating teams:', error);
    return [];
  }

  return data || [];
}

/**
 * Deletes a team by ID
 * @param id - The ID of the team to delete
 * @returns True if successful, false otherwise
 */
export async function deleteTeam(id: bigint): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('teams')
    .delete()
    .eq('id', Number(id));

  if (error) {
    console.error('Error deleting team:', error);
    return false;
  }

  return true;
}

/**
 * Gets all teams
 * @returns A list of all teams
 */
export async function getAllTeams(): Promise<Team[]> {
   const supabase = createClient();
   const { data: teams, error } = await supabase.from('teams').select('*');
   if (error) {
      console.error('Error fetching teams:', error);
      return [];
   }
   return teams || [];
}

/**
 * Gets all teams for a specific event
 * @param eventId - The ID of the event
 * @returns A list of teams participating in the specified event
 */
export async function getTeamsByEvent(eventId: bigint): Promise<Team[]> {
  return [];
}


/**
 * Gets a team by its ID
 * @param id - The ID of the desired team
 * @returns The team with the specified ID, or null if not found
 */
export async function getTeamById(id: bigint): Promise<Team | null> {
   const supabase = createClient();
   const { data: team, error } = await supabase.from('teams').select('*').eq('id', id).single();
   if (error) {
      console.error('Error fetching team:', error);
      return null;
   }
   return team;
}

/**
 * Gets a team by its name
 * @param name - The name of the desired team
 * @returns The team with the specified name, or null if not found
 */
export async function getTeamByName(name: string): Promise<Team | null> {
   const supabase = createClient();
   const { data: team, error } = await supabase.from('teams').select('*').eq('team_name', name).single();
   if (error) {
      console.error('Error fetching team:', error);
      return null;
   }
   return team;
}