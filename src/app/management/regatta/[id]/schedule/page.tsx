'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getRegattaById, getRegattaSchedule } from '../../../../../../utils/regattas/getRegatta';
import type { Regatta } from '../../../../../../utils/types/regatta';
import { isBreakEvent } from '../../../../../../utils/types/race';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

const LANES = [0, 1, 2, 3, 4, 5, 6];

interface ScheduleEntry {
  id: number;
  bow_number: number | null;
  boat_status: string | null;
  team_id: number;
  level: string | null;
  teams: { id: number; team_name: string; team_short_name: string | null } | null;
}

interface ScheduleRace {
  id: number;
  race_name: string | null;
  race_status: string | null;
  race_type: string | null;
  scheduled_start: string | null;
  distance_meters: number | null;
  gender: string | null;
  boat_class: string | null;
  level: number | null;
  sort_order: number | null;
  host_team: { id: number; team_name: string; team_short_name: string | null } | null;
  entries: ScheduleEntry[];
}

export default function SchedulePage() {
  const params = useParams();
  const regattaId = Number(params.id);
  const [regatta, setRegatta] = useState<Regatta | null>(null);
  const [races, setRaces] = useState<ScheduleRace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [r, schedule] = await Promise.all([
        getRegattaById(regattaId),
        getRegattaSchedule(regattaId),
      ]);
      setRegatta(r);
      setRaces(schedule as ScheduleRace[]);
      setLoading(false);
    };
    fetchData();
  }, [regattaId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading schedule...</div>
      </div>
    );
  }

  if (!regatta) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <p className="text-gray-500">Regatta not found.</p>
      </div>
    );
  }

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Build a lookup: bow_number -> team display name (with A/B/C level if duplicates)
  const getLaneMap = (entries: ScheduleEntry[]): Record<number, string> => {
    // Count how many entries each team has in this race
    const teamCounts: Record<number, number> = {};
    for (const entry of entries) {
      teamCounts[entry.team_id] = (teamCounts[entry.team_id] || 0) + 1;
    }

    // For teams with multiple entries, assign A/B/C by entry id order
    const teamLetterIndex: Record<number, number> = {};
    const sorted = [...entries].sort((a, b) => a.id - b.id);

    const entryLetter: Record<number, string> = {};
    for (const entry of sorted) {
      if (teamCounts[entry.team_id] > 1) {
        const idx = teamLetterIndex[entry.team_id] ?? 0;
        entryLetter[entry.id] = String.fromCharCode(65 + idx); // A, B, C...
        teamLetterIndex[entry.team_id] = idx + 1;
      }
    }

    const map: Record<number, string> = {};
    for (const entry of entries) {
      if (entry.bow_number != null) {
        const teamName = entry.teams
          ? (entry.teams.team_short_name || entry.teams.team_name)
          : 'TBD';
        const letter = entryLetter[entry.id];
        map[entry.bow_number] = letter ? `${teamName} ${letter}` : teamName;
      }
    }
    return map;
  };

  return (
    <>
      {/* Print styles — landscape orientation */}
      <style jsx global>{`
        @media print {
          @page { size: landscape; margin: 0.4in; }
          nav, .no-print { display: none !important; }
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print-container { max-width: 100% !important; padding: 0 !important; margin: 0 !important; }
          .schedule-table { font-size: 10px; }
          .schedule-table th { background: #f3f4f6 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .schedule-table td, .schedule-table th { padding: 4px 6px !important; }
          .page-header { margin-bottom: 8px !important; padding-bottom: 8px !important; border-bottom: 2px solid #111 !important; }
          .page-header h1 { font-size: 16px !important; }
          .page-header .meta { font-size: 10px !important; }
          .print-logo { display: flex !important; }
        }
      `}</style>

      <div className="min-h-screen bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-6 py-8 print-container">
          {/* Back + Print buttons */}
          <div className="flex items-center justify-between mb-6 no-print">
            <Link
              href={`/management/regatta/${regattaId}`}
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Regatta
            </Link>
            <Button size="sm" variant="outline" onClick={() => window.print()} className="gap-1.5">
              <Printer className="w-3.5 h-3.5" /> Print
            </Button>
          </div>

          {/* Header with logo */}
          <div className="page-header mb-6 pb-4 border-b border-gray-200">
            <div className="flex items-center gap-4 mb-2">
              {/* Logo — always visible in print, also shown on screen */}
              <Image
                src="/qralogo.gif"
                alt="QRA Logo"
                width={48}
                height={48}
                className="rounded"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{regatta.name}</h1>
                <p className="text-sm font-medium text-gray-500">Daily Schedule</p>
              </div>
            </div>
            <div className="meta flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-gray-600">
              <span>{formatDate(regatta.date)}</span>
              <span>{regatta.venue || 'Lake Quinsigamond'}</span>
              <span>{races.length} events</span>
            </div>
          </div>

          {/* Schedule table */}
          {races.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              No events scheduled yet.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="schedule-table w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap">Time</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-gray-700">Event</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-gray-700">Host</th>
                    {LANES.map((lane) => (
                      <th key={lane} className="text-center px-2 py-2.5 font-semibold text-gray-700" style={{ width: `${60 / LANES.length}%` }}>
                        {lane}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {races.map((race, idx) => {
                    // Break row — spans entire width
                    if (isBreakEvent(race)) {
                      return (
                        <tr
                          key={race.id}
                          className="border-b border-amber-200 bg-amber-50/60"
                        >
                          <td className="px-3 py-2 font-medium tabular-nums text-amber-800 whitespace-nowrap">
                            {formatTime(race.scheduled_start)}
                          </td>
                          <td
                            colSpan={LANES.length + 2}
                            className="px-3 py-2 text-center font-semibold text-amber-700 uppercase tracking-wide text-xs"
                          >
                            Break
                          </td>
                        </tr>
                      );
                    }

                    const laneMap = getLaneMap(race.entries);

                    return (
                      <tr
                        key={race.id}
                        className={`border-b border-gray-100 ${idx % 2 === 1 ? 'bg-gray-50/40' : ''}`}
                      >
                        <td className="px-3 py-2 font-medium tabular-nums text-gray-900 whitespace-nowrap">
                          {formatTime(race.scheduled_start)}
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium text-gray-900">
                            {race.race_name || 'Unnamed Event'}
                          </div>
                          {race.distance_meters && (
                            <div className="text-xs text-gray-400">{race.distance_meters}m</div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                          {race.host_team
                            ? (race.host_team.team_short_name || race.host_team.team_name)
                            : '—'}
                        </td>
                        {LANES.map((lane) => (
                          <td key={lane} className="px-2 py-2 text-center text-gray-700 text-xs">
                            {laneMap[lane] || ''}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
