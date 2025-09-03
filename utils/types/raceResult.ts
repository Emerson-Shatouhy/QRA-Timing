import { BoatStatus } from './boat';

export interface RaceResult {
   id: bigint;
   entry_id: bigint;
   start_time: Date | null;
   end_time: Date | null;
   adjustment: Date | null;
   timer_uuid: string | null;
   status: BoatStatus | null;
}