export interface RawTiming {
  id: string; // uuid
  created_at: string;
  race_id: number;
  timer_user_id: string;
  recorded_at: string; // ISO timestamp
  bow_number: number | null;
  is_outlier: boolean;
  outlier_delta_ms: number | null; // signed ms from consensus; negative = earlier than consensus
  notes: string | null;
}

export interface RawTimingWithElapsed extends RawTiming {
  elapsed_ms: number | null; // computed client-side for display
}
