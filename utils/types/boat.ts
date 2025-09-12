export enum BoatStatus {
   ENTERED = 'entered',
   READY = 'ready',
   ON_WATER = 'on_water',
   FINISHED = 'finished',
   DNS = 'dns',
   DNF = 'dnf',
   DSQ = 'dsq'
}

export interface Boat {
   id: bigint;
   team_id: bigint;
   race_id: bigint | null;
   bow_number: number | null;
   boat_status: BoatStatus | null;
  level: string | null;
}