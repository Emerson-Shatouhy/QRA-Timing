import { BoatStatus } from './boat';

export interface RaceResult {
  id: number;
  created_at: string;
  entry_id: number;
  start_time: string | null;    // ISO timestamp — entry's start (head) or race start (sprint)
  end_time: string | null;      // ISO timestamp — averaged consensus finish time
  elapsed_ms: number | null;    // end_time - start_time in milliseconds
  adjustment: number | null;    // net time adjustment in ms (penalties/handicaps)
  status: BoatStatus | null;
  // Multi-timer fields
  timing_count: number;         // number of non-outlier timings that contributed
  has_outlier_flag: boolean;    // true if any timer's reading was flagged as an outlier
  last_computed_at: string | null;
}
