export interface Team {
   id: bigint;
   team_name: string;
   team_short_name: string | null;
   primary_color: string | null;
   secondary_color: string | null;
}