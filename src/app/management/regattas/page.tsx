'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAllRegattas, getRegattaStats } from '../../../../utils/regattas/getRegatta';
import type { Regatta } from '../../../../utils/types/regatta';
import CreateRegattaModal from '@/components/CreateRegattaModal';
import { Calendar, MapPin, Trophy, Users, ChevronRight } from 'lucide-react';

type RegattaWithStats = Regatta & { raceCount: number; entryCount: number };

export default function RegattagPage() {
  const [regattas, setRegattas] = useState<RegattaWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const regattaList = await getAllRegattas();
        const withStats = await Promise.all(
          regattaList.map(async (r) => {
            const stats = await getRegattaStats(r.id);
            return { ...r, ...stats };
          })
        );
        setRegattas(withStats);
      } catch (err) {
        console.error('Error loading regattas:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [refreshTrigger]);

  const upcoming = regattas.filter(r => r.status !== 'complete');
  const completed = regattas.filter(r => r.status === 'complete');

  const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
    draft: { label: 'Draft', bg: 'bg-gray-100', text: 'text-gray-700' },
    active: { label: 'Race Day', bg: 'bg-green-100', text: 'text-green-700' },
    complete: { label: 'Complete', bg: 'bg-blue-100', text: 'text-blue-700' },
  };

  function formatDate(dateStr: string) {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    });
  }

  function RegattaCard({ regatta }: { regatta: RegattaWithStats }) {
    const status = statusConfig[regatta.status] || statusConfig.draft;
    return (
      <Link href={`/management/regatta/${regatta.id}`} className="block group">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">{regatta.name}</h3>
              {regatta.description && <p className="text-sm text-gray-500 mt-1 line-clamp-1">{regatta.description}</p>}
            </div>
            <div className="flex items-center gap-2 ml-4">
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>{status.label}</span>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-gray-400" /><span>{formatDate(regatta.date)}</span></div>
            <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-gray-400" /><span>{regatta.venue || 'TBD'}</span></div>
            <div className="flex items-center gap-1.5"><Trophy className="w-4 h-4 text-gray-400" /><span>{regatta.raceCount} {regatta.raceCount === 1 ? 'event' : 'events'}</span></div>
            <div className="flex items-center gap-1.5"><Users className="w-4 h-4 text-gray-400" /><span>{regatta.entryCount} {regatta.entryCount === 1 ? 'entry' : 'entries'}</span></div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Regattas</h1>
            <p className="text-sm text-gray-500 mt-1">Lake Quinsigamond Regatta Timing</p>
          </div>
          <CreateRegattaModal onCreated={() => setRefreshTrigger(prev => prev + 1)} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-pulse text-gray-400">Loading regattas...</div>
          </div>
        ) : regattas.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-1">No regattas yet</h3>
            <p className="text-sm text-gray-500 mb-6">Create your first regatta to get started.</p>
            <CreateRegattaModal onCreated={() => setRefreshTrigger(prev => prev + 1)} />
          </div>
        ) : (
          <div className="space-y-8">
            {upcoming.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Upcoming &amp; Active</h2>
                <div className="grid gap-4">{upcoming.map(r => <RegattaCard key={r.id} regatta={r} />)}</div>
              </section>
            )}
            {completed.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Completed</h2>
                <div className="grid gap-4">{completed.map(r => <RegattaCard key={r.id} regatta={r} />)}</div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
