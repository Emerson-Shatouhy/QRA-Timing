'use server';

import { createClient } from '../../../../../utils/supabase/server';
import { UserRole } from '../../../../../utils/types/profile';
import { revalidatePath } from 'next/cache';

export async function updateUserRole(userId: string, role: UserRole) {
  const supabase = await createClient();

  // Verify caller is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Verify caller is admin
  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (callerProfile?.role !== 'admin') throw new Error('Not authorized');

  // Update the user's role
  await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId);

  revalidatePath('/admin/users');
}

export async function updateUserTeam(userId: string, teamId: number | null) {
  const supabase = await createClient();

  // Verify caller is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Verify caller is admin
  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (callerProfile?.role !== 'admin') throw new Error('Not authorized');

  // Update the user's team
  await supabase
    .from('profiles')
    .update({ team_id: teamId })
    .eq('id', userId);

  revalidatePath('/admin/users');
}
