import { createClient } from "../supabase/client";
import { Boat, BoatStatus } from "../types/boat";

export function getBoatStatuses(): string[] {
   return Object.values(BoatStatus);
}

/**
 * Gets all entries
 * @returns A list of all entries
 */
export async function getAllBoats(): Promise<Boat[]> {
   const supabase = createClient();
   const { data: boats, error } = await supabase.from('entries').select('*');
   if (error) {
      console.error('Error fetching boats:', error);
      return [];
   }
   return boats || [];
}

/**
 * Gets an entry by its ID
 * @param id - The ID of the desired entry
 * @returns The entry with the specified ID, or null if not found
 */
export async function getBoatById(id: bigint): Promise<Boat | null> {
   const supabase = createClient();
   const { data: boat, error } = await supabase.from('entries').select('*').eq('id', Number(id)).single();
   if (error) {
      console.error('Error fetching boat:', error);
      return null;
   }
   return boat;
}

/**
 * Gets entries by team ID
 * @param teamId - The ID of the team
 * @returns A list of entries for the specified team
 */
export async function getBoatsByTeam(teamId: bigint): Promise<Boat[]> {
   const supabase = createClient();
   const { data: boats, error } = await supabase.from('entries').select('*').eq('team_id', Number(teamId));
   if (error) {
      console.error('Error fetching boats by team:', error);
      return [];
   }
   return boats || [];
}

/**
 * Gets entries by race ID with team information
 * @param raceId - The ID of the race
 * @returns A list of entries with team data for the specified race
 */
export async function getBoatsByRace(raceId: bigint) {
   const supabase = createClient();
   const { data: boats, error } = await supabase
      .from('entries')
      .select(`
         *,
         teams (
            id,
            team_name
         )
      `)
      .eq('race_id', Number(raceId));

   if (error) {
      console.error('Error fetching boats by race:', error);
      return [];
   }

   return boats || [];
}

/**
 * Adds a team entry to a race
 * @param teamId - The ID of the team
 * @param raceId - The ID of the race
 * @param bowNumber - The bow number for the team
 * @returns The created entry or null if failed
 */
export async function addBoatToRace(teamId: bigint, raceId: bigint, bowNumber: number): Promise<Boat | null> {
   const supabase = createClient();
   const { data: boat, error } = await supabase
      .from('entries')
      .insert({
         team_id: Number(teamId),
         race_id: Number(raceId),
         bow_number: bowNumber,
         boat_status: BoatStatus.ENTERED
      })
      .select()
      .single();

   if (error) {
      console.error('Error adding boat to race:', error);
      return null;
   }

   return boat;
}

/**
 * Removes a boat entry from a race
 * @param entryId - The ID of the entry to remove
 * @returns True if successful, false otherwise
 */
export async function removeBoatFromRace(entryId: bigint): Promise<boolean> {
   const supabase = createClient();
   const { error } = await supabase
      .from('entries')
      .delete()
      .eq('id', Number(entryId));

   if (error) {
      console.error('Error removing boat from race:', error);
      return false;
   }

   return true;
}

/**
 * Updates the bow number for a boat entry
 * @param entryId - The ID of the entry to update
 * @param bowNumber - The new bow number
 * @returns True if successful, false otherwise
 */
export async function updateBowNumber(entryId: bigint, bowNumber: number): Promise<boolean> {
   const supabase = createClient();
   const { error } = await supabase
      .from('entries')
      .update({ bow_number: bowNumber })
      .eq('id', Number(entryId));

   if (error) {
      console.error('Error updating bow number:', error);
      return false;
   }

   return true;
}

/**
 * Updates the status of a boat entry
 * @param entryId - The ID of the entry to update
 * @param status - The new status to set
 * @returns True if successful, false otherwise
 */
export async function updateBoatStatus(entryId: bigint, status: BoatStatus): Promise<boolean> {
   const supabase = createClient();
   const { error } = await supabase
      .from('entries')
      .update({ boat_status: status })
      .eq('id', Number(entryId));

   if (error) {
      console.error('Error updating boat status:', error);
      return false;
   }

   return true;
}