export type TeamDivision = 'D1' | 'D2' | 'D3';
export type TeamGender = 'mens' | 'womens' | 'both';

export interface Team {
   id: bigint;
   team_name: string;
   team_short_name: string | null;
   primary_color: string | null;
   secondary_color: string | null;
   division: TeamDivision | null;
   gender: TeamGender | null;
}
