import { createClient } from "../supabase/client";
import { RaceStatus, RaceType, Race } from "../types/race";

export function getRaceTypes(): string[] {
   return Object.values(RaceType);
}

export function getRaceStatuses(): string[] {
   return Object.values(RaceStatus);
}

/**
 * Gets all races
 * @returns A list of all races
 */
export async function getAllRaces() {
   const supabase = createClient();
   const { data: races, error: error } = await supabase.from('races').select('*');
   if (error) {
      console.error('Error fetching:', error);
      return [];
   }
   return races;
}

/**
 * Gets a race by its ID
 * @param id - The ID of the desired race
 * @returns The race with the specified ID, or null if not found
 */
export async function getRaceById(id: bigint): Promise<Race | null> {
   const supabase = createClient();
   const { data: race, error } = await supabase
      .from('races')
      .select('*')
      .eq('id', Number(id))
      .single();
   
   if (error) {
      console.error('Error fetching race:', error);
      return null;
   }
   
   return race;
}

/**
 * Gets entry count for a race
 * @param raceId - The ID of desired race
 * @return The number of entries in the race
 */
export async function getEntryCountForRace(raceId: bigint): Promise<number> {
   const supabase = createClient();
   const { count, error } = await supabase
      .from('entries')
      .select('*', { count: 'exact', head: true })
      .eq('race_id', raceId);
   
   if (error) {
      console.error('Error fetching entry count for race:', error);
      return 0;
   }
   
   return count || 0;
}

/**
 * Updates the actual start time for a race
 * @param raceId - The ID of the race to update
 * @param actualStartTime - The actual start time to set
 * @returns True if successful, false otherwise
 */
export async function updateRaceActualStart(raceId: bigint, actualStartTime: Date): Promise<boolean> {
   const supabase = createClient();
   const { error } = await supabase
      .from('races')
      .update({ 
         actual_start: actualStartTime.toISOString(),
         race_status: RaceStatus.STARTED
      })
      .eq('id', Number(raceId));

   if (error) {
      console.error('Error updating race actual start time:', error);
      return false;
   }

   return true;
}

/**
 * Updates the race status
 * @param raceId - The ID of the race to update
 * @param status - The new status to set
 * @returns True if successful, false otherwise
 */
export async function updateRaceStatus(raceId: bigint, status: RaceStatus): Promise<boolean> {
   const supabase = createClient();
   const { error } = await supabase
      .from('races')
      .update({ race_status: status })
      .eq('id', Number(raceId));

   if (error) {
      console.error('Error updating race status:', error);
      return false;
   }

   return true;
}

