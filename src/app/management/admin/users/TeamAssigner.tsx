'use client';

import { useState } from 'react';
import { updateUserTeam } from './actions';
import { Profile } from '../../../../../utils/types/profile';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface TeamAssignerProps {
  profile: Profile;
  teams: { id: number; team_name: string }[];
  onUpdate?: () => void;
}

export function TeamAssigner({ profile, teams, onUpdate }: TeamAssignerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const handleTeamChange = async (newTeamId: string) => {
    const teamId = newTeamId === 'none' ? null : parseInt(newTeamId, 10);
    if (teamId === profile.team_id) return;

    setIsLoading(true);
    setStatus('idle');

    try {
      await updateUserTeam(profile.id, teamId);
      setStatus('success');
      setStatusMessage('Team updated');
      onUpdate?.();
      setTimeout(() => setStatus('idle'), 2000);
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Failed to update team');
      setTimeout(() => setStatus('idle'), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const currentValue = profile.team_id ? String(profile.team_id) : 'none';

  return (
    <div className="flex items-center gap-3">
      <Select value={currentValue} onValueChange={handleTeamChange} disabled={isLoading}>
        <SelectTrigger className="w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">None</SelectItem>
          {teams.map(team => (
            <SelectItem key={team.id} value={String(team.id)}>
              {team.team_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {status !== 'idle' && (
        <span
          className={`text-xs font-medium ${
            status === 'success' ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {statusMessage}
        </span>
      )}
    </div>
  );
}
