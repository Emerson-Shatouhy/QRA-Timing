export type TeamDivision = 'D1' | 'D2' | 'D3';
export type TeamGender = 'mens' | 'womens' | 'both';
export type TeamCategory = 'collegiate' | 'youth' | 'club' | 'masters';

export const TEAM_CATEGORY_LABELS: Record<TeamCategory, string> = {
  collegiate: 'Collegiate',
  youth: 'Youth',
  club: 'Club',
  masters: 'Masters',
};

export interface Team {
   id: bigint;
   team_name: string;
   team_short_name: string | null;
   primary_color: string | null;
   secondary_color: string | null;
   division: TeamDivision | null;
   gender: TeamGender | null;
   category: TeamCategory | null;
   oarspotter_key: string | null;
   is_local_school: boolean;
}
