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
   SPRINT = 'sprint'
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
}

