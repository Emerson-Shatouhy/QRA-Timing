'use client';

import { useEffect, useState } from 'react';
import { useProfile } from '@/contexts/ProfileContext';
import { USER_ROLE_LABELS } from '../../../../utils/types/profile';
import { createClient } from '../../../../utils/supabase/client';

export default function ProfilePage() {
  const { profile, loading } = useProfile();
  const [teamName, setTeamName] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.team_id) {
      setTeamName(null);
      return;
    }
    const supabase = createClient();
    supabase
      .from('teams')
      .select('team_name')
      .eq('id', profile.team_id)
      .single()
      .then(({ data }) => {
        setTeamName(data?.team_name ?? null);
      });
  }, [profile?.team_id]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">My Profile</h1>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="space-y-4">
            <div className="h-6 bg-gray-200 rounded animate-pulse w-1/3" />
            <div className="h-6 bg-gray-200 rounded animate-pulse w-1/2" />
            <div className="h-6 bg-gray-200 rounded animate-pulse w-1/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">My Profile</h1>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <p className="text-gray-500">Unable to load profile information.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">My Profile</h1>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-6">
        {/* Display Name */}
        <div>
          <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            Display Name
          </label>
          <p className="mt-1 text-lg text-gray-900">
            {profile.display_name || '—'}
          </p>
        </div>

        {/* Email */}
        <div>
          <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            Email
          </label>
          <p className="mt-1 text-lg text-gray-900">
            {profile.email || '—'}
          </p>
        </div>

        {/* Role */}
        <div>
          <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            Role
          </label>
          <p className="mt-1 text-lg text-gray-900">
            {USER_ROLE_LABELS[profile.role] || profile.role}
          </p>
        </div>

        {/* Team */}
        <div>
          <label className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            Team
          </label>
          <p className="mt-1 text-lg text-gray-900">
            {profile.team_id ? (teamName || 'Loading...') : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}
