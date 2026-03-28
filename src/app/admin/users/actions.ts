'use server';

import { createClient } from '../../../../utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateUserRole(userId: string, role: 'admin' | 'timer') {
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
