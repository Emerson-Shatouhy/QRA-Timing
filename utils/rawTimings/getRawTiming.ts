import { createClient } from '../supabase/client';
import { RawTiming } from '../types/rawTiming';

/**
 * Records a new tap (finish time) for the current timer.
 * bow_number is null — must be assigned afterward.
 */
export async function insertRawTiming(
  raceId: number,
  recordedAt: Date
): Promise<RawTiming | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('raw_timings')
    .insert({
      race_id: raceId,
      timer_user_id: user.id,
      recorded_at: recordedAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error inserting raw timing:', error);
    return null;
  }
  return data;
}

/**
 * Assigns a bow number to an existing tap.
 * Triggers the pipeline on the server.
 */
export async function assignBowNumber(
  timingId: string,
  bowNumber: number
): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('raw_timings')
    .update({ bow_number: bowNumber })
    .eq('id', timingId);

  if (error) {
    console.error('Error assigning bow number:', error);
    return false;
  }
  return true;
}

/**
 * Removes bow number assignment from a tap (un-assign).
 */
export async function unassignBowNumber(timingId: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('raw_timings')
    .update({ bow_number: null, is_outlier: false, outlier_delta_ms: null })
    .eq('id', timingId);

  if (error) {
    console.error('Error unassigning bow number:', error);
    return false;
  }
  return true;
}

/**
 * Deletes a raw timing entirely (e.g., accidental tap).
 */
export async function deleteRawTiming(timingId: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('raw_timings')
    .delete()
    .eq('id', timingId);

  if (error) {
    console.error('Error deleting raw timing:', error);
    return false;
  }
  return true;
}

/**
 * Gets all raw timings for a race.
 */
export async function getRawTimingsByRace(raceId: number): Promise<RawTiming[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('raw_timings')
    .select('*')
    .eq('race_id', raceId)
    .order('recorded_at', { ascending: false });

  if (error) {
    console.error('Error fetching raw timings:', error);
    return [];
  }
  return data || [];
}

/**
 * Gets raw timings for a specific bow number in a race.
 */
export async function getRawTimingsByBow(
  raceId: number,
  bowNumber: number
): Promise<RawTiming[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('raw_timings')
    .select('*')
    .eq('race_id', raceId)
    .eq('bow_number', bowNumber)
    .order('recorded_at', { ascending: true });

  if (error) {
    console.error('Error fetching raw timings by bow:', error);
    return [];
  }
  return data || [];
}

/**
 * Gets unassigned taps for the current user in a race.
 */
export async function getMyUnassignedTaps(raceId: number): Promise<RawTiming[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('raw_timings')
    .select('*')
    .eq('race_id', raceId)
    .eq('timer_user_id', user.id)
    .is('bow_number', null)
    .order('recorded_at', { ascending: false });

  if (error) {
    console.error('Error fetching unassigned taps:', error);
    return [];
  }
  return data || [];
}
