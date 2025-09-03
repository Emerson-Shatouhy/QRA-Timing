import { createClient } from "../supabase/client";
import { RaceResult } from "../types/raceResult";
import { BoatStatus } from "../types/boat";

/**
 * Gets all race results
 * @returns A list of all race results
 */
export async function getAllRaceResults(): Promise<RaceResult[]> {
   const supabase = createClient();
   const { data: results, error } = await supabase.from('race_results').select('*');
   if (error) {
      console.error('Error fetching race results:', error);
      return [];
   }
   return results || [];
}

/**
 * Gets a race result by its ID
 * @param id - The ID of the desired race result
 * @returns The race result with the specified ID, or null if not found
 */
export async function getRaceResultById(id: bigint): Promise<RaceResult | null> {
   const supabase = createClient();
   const { data: result, error } = await supabase.from('race_results').select('*').eq('id', Number(id)).single();
   if (error) {
      console.error('Error fetching race result:', error);
      return null;
   }
   return result;
}

/**
 * Gets race results by entry ID
 * @param entryId - The ID of the entry
 * @returns A list of race results for the specified entry
 */
export async function getRaceResultsByEntry(entryId: bigint): Promise<RaceResult[]> {
   const supabase = createClient();
   const { data: results, error } = await supabase.from('race_results').select('*').eq('entry_id', Number(entryId));
   if (error) {
      console.error('Error fetching race results by entry:', error);
      return [];
   }
   return results || [];
}

/**
 * Gets race results by race ID with entry information
 * @param raceId - The ID of the race
 * @returns A list of race results with entry data for the specified race
 */
export async function getRaceResultsByRace(raceId: bigint) {
   const supabase = createClient();
   const { data: results, error } = await supabase
      .from('race_results')
      .select(`
         *,
         entries (
            id,
            bow_number,
            team_id,
            teams (
               id,
               team_name
            )
         )
      `)
      .eq('entries.race_id', Number(raceId));

   if (error) {
      console.error('Error fetching race results by race:', error);
      return [];
   }

   return results || [];
}

/**
 * Creates a new race result
 * @param entryId - The ID of the entry
 * @param startTime - The start time (optional)
 * @param endTime - The end time (optional)
 * @param adjustment - Time adjustment (optional)
 * @param status - The boat status (optional)
 * @returns The created race result or null if failed
 */
export async function createRaceResult(
   entryId: bigint,
   startTime?: Date,
   endTime?: Date,
   adjustment?: Date,
   status?: BoatStatus
): Promise<RaceResult | null> {
   const supabase = createClient();
   const { data: result, error } = await supabase
      .from('race_results')
      .insert({
         entry_id: Number(entryId),
         start_time: startTime?.toISOString(),
         end_time: endTime?.toISOString(),
         adjustment: adjustment?.toISOString(),
         status: status
      })
      .select()
      .single();

   if (error) {
      console.error('Error creating race result:', error);
      return null;
   }

   return result;
}

/**
 * Updates a race result
 * @param id - The ID of the race result to update
 * @param updates - Object containing fields to update
 * @returns True if successful, false otherwise
 */
export async function updateRaceResult(
   id: bigint,
   updates: {
      start_time?: Date;
      end_time?: Date;
      adjustment?: Date;
      status?: BoatStatus;
   }
): Promise<boolean> {
   const supabase = createClient();
   
   const updateData: any = {};
   if (updates.start_time !== undefined) updateData.start_time = updates.start_time?.toISOString();
   if (updates.end_time !== undefined) updateData.end_time = updates.end_time?.toISOString();
   if (updates.adjustment !== undefined) updateData.adjustment = updates.adjustment?.toISOString();
   if (updates.status !== undefined) updateData.status = updates.status;

   const { error } = await supabase
      .from('race_results')
      .update(updateData)
      .eq('id', Number(id));

   if (error) {
      console.error('Error updating race result:', error);
      return false;
   }

   return true;
}

/**
 * Deletes a race result
 * @param id - The ID of the race result to delete
 * @returns True if successful, false otherwise
 */
export async function deleteRaceResult(id: bigint): Promise<boolean> {
   const supabase = createClient();
   const { error } = await supabase
      .from('race_results')
      .delete()
      .eq('id', Number(id));

   if (error) {
      console.error('Error deleting race result:', error);
      return false;
   }

   return true;
}

/**
 * Sets the start time for a race result
 * @param id - The ID of the race result
 * @param startTime - The start time to set
 * @returns True if successful, false otherwise
 */
export async function setStartTime(id: bigint, startTime: Date): Promise<boolean> {
   return updateRaceResult(id, { start_time: startTime });
}

/**
 * Sets the end time for a race result
 * @param id - The ID of the race result
 * @param endTime - The end time to set
 * @returns True if successful, false otherwise
 */
export async function setEndTime(id: bigint, endTime: Date): Promise<boolean> {
   return updateRaceResult(id, { end_time: endTime });
}

/**
 * Sets the status for a race result
 * @param id - The ID of the race result
 * @param status - The status to set
 * @returns True if successful, false otherwise
 */
export async function setStatus(id: bigint, status: BoatStatus): Promise<boolean> {
   return updateRaceResult(id, { status: status });
}