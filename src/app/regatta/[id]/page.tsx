'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getRegattaById, getRacesByRegatta, updateRegattaStatus, saveRegattaAsTemplate, deleteRegatta } from '../../../../utils/regattas/getRegatta';
import { getEntryCountForRace, deleteRace } from '../../../../utils/races/getRace';
import type { Regatta } from '../../../../utils/types/regatta';
import type { Race } from '../../../../utils/types/race';
import { isBreakEvent } from '../../../../utils/types/race';
import AddEventModal from '@/components/AddEventModal';
import BulkDuplicateModal from '@/components/BulkDuplicateModal';
import EditRegattaModal from '@/components/EditRegattaModal';
import EditRaceModal from '@/components/EditRaceModal';
import { Button } from '@/components/ui/button';
import FileMakerRefreshButton from '@/components/FileMakerRefreshButton';
import {
  ArrowLeft, Calendar, MapPin, Trophy, Users, ChevronRight,
  Play, CheckCircle, Copy, Save, Pencil, Trash2, MoreVertical, ClipboardList,
} from 'lucide-react';

type RaceWithEntryCount = Race & {
  entryCount: number;
  host_team?: { id: number; team_name: string; team_short_name: string | null } | null;
};

export default function RegattaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const regattaId = Number(params.id);
  const [regatta, setRegatta] = useState<Regatta | null>(null);
  const [races, setRaces] = useState<RaceWithEntryCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedRaces, setSelectedRaces] = useState<Set<number>>(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showEditRegatta, setShowEditRegatta] = useState(false);
  const [editingRace, setEditingRace] = useState<RaceWithEntryCount | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [deletingRaces, setDeletingRaces] = useState<Set<number>>(new Set());
  const [showRegattaMenu, setShowRegattaMenu] = useState(false);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [r, raceList] = await Promise.all([
        getRegattaById(regattaId),
        getRacesByRegatta(regattaId),
      ]);
      setRegatta(r);

      const withCounts = await Promise.all(
        (raceList || []).map(async (race: Race) => {
          const entryCount = await getEntryCountForRace(race.id);
          return { ...race, entryCount } as RaceWithEntryCount;
        })
      );
      setRaces(withCounts);
      setLoading(false);
    };
    fetchData();
  }, [regattaId, refreshKey]);

  // Close menus on click outside
  useEffect(() => {
    const handleClick = () => { setOpenMenuId(null); setShowRegattaMenu(false); };
    if (openMenuId !== null || showRegattaMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [openMenuId, showRegattaMenu]);

  const handleStatusChange = async (newStatus: 'draft' | 'active' | 'complete') => {
    if (!regatta) return;
    const ok = await updateRegattaStatus(regatta.id, newStatus);
    if (ok) refresh();
  };

  const handleSaveTemplate = async () => {
    if (!regatta) return;
    const name = prompt('Template name:', regatta.name);
    if (!name) return;
    const result = await saveRegattaAsTemplate(regatta.id, name);
    if (result) alert('Template saved!');
    else alert('Failed to save template.');
  };

  const handleDeleteRegatta = async () => {
    if (!regatta) return;
    if (races.length > 0) {
      const confirmed = confirm(
        `This regatta has ${races.length} event(s). Deleting it will remove ALL events, entries, and timing data. This cannot be undone.\n\nAre you sure?`
      );
      if (!confirmed) return;

      // Delete all races first
      for (const race of races) {
        await deleteRace(Number(race.id));
      }
    } else {
      const confirmed = confirm('Delete this regatta? This cannot be undone.');
      if (!confirmed) return;
    }

    const ok = await deleteRegatta(regatta.id);
    if (ok) {
      router.push('/');
    } else {
      alert('Failed to delete regatta.');
    }
  };

  const handleDeleteRace = async (raceId: number) => {
    const race = races.find(r => Number(r.id) === raceId);
    const name = race?.race_name || 'this event';
    const entryCount = race?.entryCount || 0;

    const msg = entryCount > 0
      ? `Delete "${name}"? This will also remove ${entryCount} entries and any timing data. This cannot be undone.`
      : `Delete "${name}"? This cannot be undone.`;

    if (!confirm(msg)) return;

    setDeletingRaces(prev => new Set(prev).add(raceId));
    const ok = await deleteRace(raceId);
    setDeletingRaces(prev => {
      const next = new Set(prev);
      next.delete(raceId);
      return next;
    });

    if (ok) {
      setSelectedRaces(prev => {
        const next = new Set(prev);
        next.delete(raceId);
        return next;
      });
      refresh();
    } else {
      alert('Failed to delete event.');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedRaces.size === 0) return;
    const confirmed = confirm(
      `Delete ${selectedRaces.size} selected event(s)? All entries and timing data will also be removed. This cannot be undone.`
    );
    if (!confirmed) return;

    const ids = Array.from(selectedRaces);
    for (const id of ids) {
      await deleteRace(id);
    }
    setSelectedRaces(new Set());
    refresh();
  };

  const toggleRaceSelection = (id: number) => {
    setSelectedRaces(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedRaces.size === races.length) {
      setSelectedRaces(new Set());
    } else {
      setSelectedRaces(new Set(races.map(r => Number(r.id))));
    }
  };

  const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
    draft: { label: 'Draft', bg: 'bg-gray-100', text: 'text-gray-700' },
    active: { label: 'Race Day', bg: 'bg-green-100', text: 'text-green-700' },
    complete: { label: 'Complete', bg: 'bg-blue-100', text: 'text-blue-700' },
  };

  const raceStatusConfig: Record<string, { bg: string; text: string }> = {
    scheduled: { bg: 'bg-blue-50', text: 'text-blue-700' },
    ready: { bg: 'bg-yellow-50', text: 'text-yellow-700' },
    started: { bg: 'bg-green-50', text: 'text-green-700' },
    finished: { bg: 'bg-gray-100', text: 'text-gray-700' },
    cancelled: { bg: 'bg-red-50', text: 'text-red-700' },
    abandoned: { bg: 'bg-orange-50', text: 'text-orange-700' },
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading regatta...</div>
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

  const status = statusConfig[regatta.status] || statusConfig.draft;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Regattas
        </Link>

        {/* Header */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">{regatta.name}</h1>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                  {status.label}
                </span>
              </div>
              {regatta.description && <p className="text-sm text-gray-500">{regatta.description}</p>}
            </div>

            <div className="flex items-center gap-2">
              {regatta.status === 'draft' && (
                <Button size="sm" variant="outline" onClick={() => handleStatusChange('active')} className="gap-1.5">
                  <Play className="w-3.5 h-3.5" /> Activate
                </Button>
              )}
              {regatta.status === 'active' && (
                <Button size="sm" variant="outline" onClick={() => handleStatusChange('complete')} className="gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" /> Complete
                </Button>
              )}
              <Link href={`/regatta/${regattaId}/schedule`}>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <ClipboardList className="w-3.5 h-3.5" /> Schedule
                </Button>
              </Link>
              <FileMakerRefreshButton date={regatta.date} onSynced={refresh} />

              {/* Overflow menu for secondary actions */}
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowRegattaMenu(!showRegattaMenu); }}
                  className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <MoreVertical className="w-4 h-4 text-gray-500" />
                </button>

                {showRegattaMenu && (
                  <div className="absolute right-0 top-9 z-10 bg-white rounded-lg border border-gray-200 shadow-lg py-1 w-32">
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowRegattaMenu(false); setShowEditRegatta(true); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowRegattaMenu(false); handleSaveTemplate(); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Save className="w-3.5 h-3.5" /> Template
                    </button>
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowRegattaMenu(false); handleDeleteRegatta(); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-600">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>{new Date(regatta.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span>{regatta.venue || 'TBD'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-gray-400" />
              <span>{races.length} events</span>
            </div>
          </div>
        </div>

        {/* Events Section */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Events</h2>
          <div className="flex items-center gap-2">
            {selectedRaces.size > 0 && (
              <>
                <Button size="sm" variant="outline" onClick={() => setShowBulkModal(true)} className="gap-1.5">
                  <Copy className="w-3.5 h-3.5" />
                  Duplicate {selectedRaces.size}
                </Button>
                <Button size="sm" variant="outline" onClick={handleDeleteSelected} className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50">
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete {selectedRaces.size}
                </Button>
              </>
            )}
            <AddEventModal regattaId={regattaId} regattaDate={regatta.date} onCreated={refresh} />
          </div>
        </div>

        {/* Selection controls */}
        {races.length > 0 && (
          <div className="mb-3 flex items-center gap-3">
            <button
              onClick={selectAll}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              {selectedRaces.size === races.length ? 'Deselect All' : 'Select All'}
            </button>
            {selectedRaces.size > 0 && (
              <span className="text-xs text-gray-500">{selectedRaces.size} selected</span>
            )}
          </div>
        )}

        {/* Race list */}
        {races.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <Trophy className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">No events yet. Add your first event to this regatta.</p>
            <AddEventModal regattaId={regattaId} regattaDate={regatta.date} onCreated={refresh} />
          </div>
        ) : (
          <div className="space-y-2">
            {races.map((race) => {
              const isBreak = isBreakEvent(race);
              const rs = raceStatusConfig[race.race_status || 'scheduled'] || raceStatusConfig.scheduled;
              const isSelected = selectedRaces.has(Number(race.id));
              const isDeleting = deletingRaces.has(Number(race.id));
              const menuOpen = openMenuId === Number(race.id);

              // Break block — non-clickable, visually distinct
              if (isBreak) {
                return (
                  <div
                    key={String(race.id)}
                    className={`rounded-lg border border-dashed p-3 flex items-center gap-4 transition-all ${
                      isDeleting ? 'opacity-50 pointer-events-none' :
                      isSelected ? 'border-blue-300 bg-blue-50/30' : 'border-amber-300 bg-amber-50/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRaceSelection(Number(race.id))}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0 flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-700 uppercase tracking-wide">
                        Break
                      </span>
                      {race.scheduled_start && (
                        <span className="text-xs text-amber-600 tabular-nums">
                          {new Date(race.scheduled_start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    {/* Menu for edit/delete only */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(menuOpen ? null : Number(race.id));
                        }}
                        className="p-1 rounded hover:bg-amber-100 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-amber-400" />
                      </button>
                      {menuOpen && (
                        <div className="absolute right-0 top-8 z-10 bg-white rounded-lg border border-gray-200 shadow-lg py-1 w-36">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(null);
                              setEditingRace(race);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(null);
                              handleDeleteRace(Number(race.id));
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              // Normal race row
              return (
                <div
                  key={String(race.id)}
                  className={`bg-white rounded-lg border p-4 flex items-center gap-4 group transition-all ${
                    isDeleting ? 'opacity-50 pointer-events-none' :
                    isSelected ? 'border-blue-300 bg-blue-50/30' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleRaceSelection(Number(race.id))}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />

                  {/* Main info */}
                  <Link href={`/race/${race.id}`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                        {race.race_name || 'Unnamed Event'}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${rs.bg} ${rs.text}`}>
                        {race.race_status || 'scheduled'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                      {race.scheduled_start && (
                        <span className="font-medium tabular-nums">
                          {new Date(race.scheduled_start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      )}
                      {race.distance_meters && <span>{race.distance_meters}m</span>}
                      {race.gender && (
                        <span>{race.gender === 'M' ? "Men's" : race.gender === 'F' ? "Women's" : 'Mixed'}</span>
                      )}
                      {race.boat_class && <span>{race.boat_class}</span>}
                      {race.level && <span>{race.level}v</span>}
                      {race.host_team && (
                        <span className="text-orange-600 font-medium">
                          Host: {race.host_team.team_short_name || race.host_team.team_name}
                        </span>
                      )}
                    </div>
                  </Link>

                  {/* Stats + Actions */}
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>{race.entryCount}</span>
                    </div>

                    {/* Three-dot menu */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(menuOpen ? null : Number(race.id));
                        }}
                        className="p-1 rounded hover:bg-gray-100 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </button>

                      {menuOpen && (
                        <div className="absolute right-0 top-8 z-10 bg-white rounded-lg border border-gray-200 shadow-lg py-1 w-36">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(null);
                              setEditingRace(race);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(null);
                              handleDeleteRace(Number(race.id));
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      )}
                    </div>

                    <Link href={`/race/${race.id}`}>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modals */}
        {showBulkModal && (
          <BulkDuplicateModal
            open={showBulkModal}
            onOpenChange={setShowBulkModal}
            sourceRaceIds={Array.from(selectedRaces)}
            races={races}
            onDuplicated={() => {
              setSelectedRaces(new Set());
              refresh();
            }}
          />
        )}

        {showEditRegatta && regatta && (
          <EditRegattaModal
            regatta={regatta}
            open={showEditRegatta}
            onOpenChange={setShowEditRegatta}
            onUpdated={refresh}
          />
        )}

        {editingRace && (
          <EditRaceModal
            race={editingRace}
            open={!!editingRace}
            onOpenChange={(open) => { if (!open) setEditingRace(null); }}
            onUpdated={refresh}
          />
        )}
      </div>
    </div>
  );
}
