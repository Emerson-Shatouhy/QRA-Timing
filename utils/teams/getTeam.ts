import { createClient } from "../supabase/client";
import { Team } from "../types/team";

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