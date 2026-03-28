export type UserRole = 'admin' | 'timer';

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  role: UserRole;
  created_at: string;
}
