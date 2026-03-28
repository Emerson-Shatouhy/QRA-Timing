import { redirect } from 'next/navigation';
import { createClient } from '../../../../utils/supabase/server';
import { Profile } from '../../../../utils/types/profile';
import { RoleEditor } from './RoleEditor';

export const metadata = {
  title: 'User Management - QRA Timing',
};

export default async function UsersPage() {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Get current user's profile to check if they're admin
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (userProfile?.role !== 'admin') {
    redirect('/');
  }

  // Fetch all profiles
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch profiles: ${error.message}`);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-2">
            Manage user roles. Existing accounts default to admin, new accounts default to timer.
          </p>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Display Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {profiles && profiles.length > 0 ? (
                profiles.map((profile: Profile) => (
                  <tr key={profile.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {profile.email || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {profile.display_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <RoleEditor profile={profile} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(profile.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
