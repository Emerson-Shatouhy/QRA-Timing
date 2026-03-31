'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Info, ChevronDown, ChevronUp, Database } from 'lucide-react';

interface SyncLog {
  message: string;
  type: 'info' | 'warn' | 'error' | 'success';
}

interface SyncResult {
  success: boolean;
  regattas: number;
  races: number;
  teams: number;
  entries: number;
  log: SyncLog[];
}

export default function FileMakerSync() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const canSync = username && password && startDate && endDate && !syncing;

  async function handleSync() {
    setSyncing(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch('/api/sync/filemaker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, startDate, endDate }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errBody.error || `Request failed with status ${res.status}`);
      }

      const data: SyncResult = await res.json();
      setResult(data);
      setShowLog(true);
      setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSyncing(false);
    }
  }

  function logIcon(type: SyncLog['type']) {
    switch (type) {
      case 'success': return <CheckCircle className="w-3 h-3 text-green-600 shrink-0 mt-px" />;
      case 'error': return <XCircle className="w-3 h-3 text-red-600 shrink-0 mt-px" />;
      case 'warn': return <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0 mt-px" />;
      default: return <Info className="w-3 h-3 text-gray-400 shrink-0 mt-px" />;
    }
  }

  function logColor(type: SyncLog['type']) {
    switch (type) {
      case 'success': return 'text-green-700';
      case 'error': return 'text-red-700';
      case 'warn': return 'text-amber-700';
      default: return 'text-gray-500';
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Database className="w-4 h-4 text-gray-400" />
        <p className="text-sm text-gray-500">
          Import the race calendar from FileMaker.
        </p>
      </div>

      {/* Form fields */}
      <div className="space-y-3 mb-4">
        <Input
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
          placeholder="FileMaker username"
          autoComplete="username"
        />
        <Input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="FileMaker password"
          autoComplete="current-password"
        />

        <div className="border-t border-gray-100 pt-3" />

        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="text-xs text-gray-400 mb-1 block">From</span>
            <Input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <span className="text-xs text-gray-400 mb-1 block">To</span>
            <Input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      <p className="text-xs text-gray-400 mb-4">
        Existing regattas for matching dates will be merged. Credentials go directly to cloud.qra.org.
      </p>

      {/* Sync Button */}
      <Button
        onClick={handleSync}
        disabled={!canSync}
        className="w-full"
      >
        {syncing ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Syncing...
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4 mr-2" />
            Sync
          </>
        )}
      </Button>

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-red-800">Sync failed</span>
          </div>
          <p className="text-sm text-red-600 mt-1">{error}</p>
        </div>
      )}

      {/* Result Summary */}
      {result && (
        <div className={`mt-4 rounded-lg border px-4 py-3 ${result.success ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
          <div className="flex items-center gap-2 mb-3">
            {result.success ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            )}
            <span className={`text-sm font-medium ${result.success ? 'text-green-800' : 'text-amber-800'}`}>
              {result.success ? 'Sync complete' : 'Completed with issues'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Regattas', value: result.regattas },
              { label: 'Races', value: result.races },
              { label: 'Teams', value: result.teams },
              { label: 'Entries', value: result.entries },
            ].map(stat => (
              <div key={stat.label} className="bg-white/70 rounded-md px-3 py-2 text-center">
                <div className="text-lg font-semibold text-gray-900">{stat.value}</div>
                <div className="text-xs text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sync Log (collapsible) */}
      {result && result.log.length > 0 && (
        <div className="mt-3 rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => setShowLog(!showLog)}
            className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors text-left"
          >
            <span className="text-xs font-medium text-gray-600">Log ({result.log.length})</span>
            {showLog
              ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
              : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            }
          </button>
          {showLog && (
            <div className="max-h-48 overflow-y-auto border-t border-gray-100 px-3 py-2 font-mono text-[11px] leading-relaxed space-y-0.5">
              {result.log.map((entry, i) => (
                <div key={i} className={`flex items-start gap-1.5 ${logColor(entry.type)}`}>
                  {logIcon(entry.type)}
                  <span className="whitespace-pre-wrap break-words">{entry.message}</span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
