'use client';

import { useState } from 'react';
import { updateUserRole } from './actions';
import { Profile } from '../../../../utils/types/profile';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface RoleEditorProps {
  profile: Profile;
  onUpdate?: () => void;
}

export function RoleEditor({ profile, onUpdate }: RoleEditorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const handleRoleChange = async (newRole: string) => {
    if (newRole === profile.role) return;

    setIsLoading(true);
    setStatus('idle');

    try {
      await updateUserRole(profile.id, newRole as 'admin' | 'timer');
      setStatus('success');
      setStatusMessage('Role updated');
      onUpdate?.();
      setTimeout(() => setStatus('idle'), 2000);
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Failed to update role');
      setTimeout(() => setStatus('idle'), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Select
        value={profile.role}
        onValueChange={handleRoleChange}
        disabled={isLoading}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="timer">Timer</SelectItem>
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
