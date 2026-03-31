import type { EventGender, AgeCategory } from './regatta';

// Enum types based on your PostgreSQL custom types
export enum RaceStatus {
   SCHEDULED = 'scheduled',
   READY = 'ready',
   STARTED = 'started',
   FINISHED = 'finished',
   CANCELLED = 'cancelled',
   ABANDONED = 'abandoned',
}

export enum RaceType {
   TIME_TRIAL = 'time_trial',
   HEAD_RACE = 'head_race',
   SPRINT = 'sprint',
   BREAK = 'break'
}

/** Returns true if the race is a schedule break (not an actual race) */
export function isBreakEvent(race: { race_type?: RaceType | string | null }): boolean {
  return race.race_type === RaceType.BREAK || race.race_type === 'break';
}

// Main Race type based on the table schema
export interface Race {
   id: bigint;
   created_at: Date;
   created_by: string | null; // UUID as string
   race_status: RaceStatus | null;
   race_name: string | null;
   event_date: Date | null;
   scheduled_start: Date | null;
   actual_start: Date | null;
   distance_meters: number | null;
   weather_conditions: string | null;
   race_type: RaceType | null;
   max_entries: number | null;
   is_official: boolean | null;
   // New structured fields
   regatta_id: number | null;
   gender: EventGender | null;
   boat_class: string | null;
   age_category: AgeCategory | null;
   level: number | null;
   sort_order: number | null;
   host_team_id: number | null;
}
