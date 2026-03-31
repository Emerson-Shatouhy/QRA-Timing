'use client';

import { useState, useEffect } from 'react';
import { createClient } from '../../utils/supabase/client';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react';

interface FileMakerRefreshButtonProps {
  /** The regatta date in YYYY-MM-DD format */
  date: string;
  /** Called after a successful sync so the parent can refresh its data */
  onSynced?: () => void;
}

export default function FileMakerRefreshButton({ date, onSynced }: FileMakerRefreshButtonProps) {
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Check if the current user is an admin
  useEffect(() => {
    async function checkAdmin() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      setIsAdmin(profile?.role === 'admin');
    }
    checkAdmin();
  }, []);

  // Don't render anything for non-admins or while checking
  if (isAdmin !== true) return null;

  async function handleSync() {
    setSyncing(true);
    setStatus('idle');
    setMessage('');

    try {
      const res = await fetch('/api/sync/filemaker/date', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errBody.error || `Request failed with status ${res.status}`);
      }

      const data = await res.json();

      if (data.success) {
        setStatus('success');
        setMessage(`${data.races} races, ${data.entries} entries, ${data.results} results`);
        onSynced?.();
      } else {
        setStatus('error');
        const lastError = data.log?.findLast?.((l: { type: string }) => l.type === 'error');
        setMessage(lastError?.message || 'Sync completed with errors');
      }
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setSyncing(false);
      setTimeout(() => {
        setStatus('idle');
        setMessage('');
      }, 4000);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={handleSync}
        disabled={syncing}
        className="gap-1.5"
        title="Sync this date from FileMaker"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
        {syncing ? 'Syncing...' : 'Sync FM'}
      </Button>

      {status === 'success' && (
        <span className="flex items-center gap-1 text-xs text-green-600">
          <CheckCircle className="w-3.5 h-3.5" />
          {message}
        </span>
      )}
      {status === 'error' && (
        <span className="flex items-center gap-1 text-xs text-red-600 max-w-xs truncate">
          <XCircle className="w-3.5 h-3.5 shrink-0" />
          {message}
        </span>
      )}
    </div>
  );
}
