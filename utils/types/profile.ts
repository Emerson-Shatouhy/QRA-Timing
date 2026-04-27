export type UserRole = 'admin' | 'local_coach' | 'other_coach' | 'timer';

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  local_coach: 'Local Coach',
  other_coach: 'Other Coach',
  timer: 'Timer',
};

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  role: UserRole;
  team_id: number | null;
  created_at: string;
}
