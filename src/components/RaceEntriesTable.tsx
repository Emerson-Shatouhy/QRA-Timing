'use client';
import { getBoatsByRace, addBoatToRace, removeBoatFromRace, updateBowNumber } from "../../utils/boats/getBoat";
import { getAllTeams } from "../../utils/teams/getTeam";
import { useEffect, useState } from "react";
import { createClient } from "../../utils/supabase/client";
import { Race, RaceStatus } from "../../utils/types/race";
import { Team } from "../../utils/types/team";
import { assignLevelsToBoats } from "../../utils/boats/assignLevels";
import TeamCombobox from "./TeamCombobox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Loader2, Plus, Trash2, X, Pencil } from "lucide-react";

interface RaceEntriesTableProps {
  race: Race;
  onBack: () => void;
}

function getNextBowNumber(entries: any[], usedBows: number[] = []): number {
  const all = [...entries.map(e => e.bow_number ?? 0), ...usedBows];
  return all.length === 0 ? 1 : Math.max(...all) + 1;
}

type RowStatus = 'pending' | 'adding' | 'added' | 'error';
interface BulkRow {
  key: number;
  teamId: string;
  teamName: string;
  bowNumber: string;
  status: RowStatus;
  error?: string;
}

let rowKey = 0;
const newRow = (bow = ''): BulkRow => ({
  key: rowKey++, teamId: '', teamName: '', bowNumber: bow, status: 'pending',
});

function BoatStatusBadge({ status }: { status: string | null }) {
  const styles: Record<string, string> = {
    entered:  'bg-blue-50 text-blue-700 ring-blue-200',
    ready:    'bg-amber-50 text-amber-700 ring-amber-200',
    on_water: 'bg-green-50 text-green-700 ring-green-200',
    finished: 'bg-gray-100 text-gray-600 ring-gray-200',
    dns:      'bg-orange-50 text-orange-700 ring-orange-200',
    dnf:      'bg-red-50 text-red-700 ring-red-200',
    dsq:      'bg-purple-50 text-purple-700 ring-purple-200',
  };
  const cls = status ? (styles[status] ?? 'bg-gray-50 text-gray-500 ring-gray-200') : 'bg-gray-50 text-gray-400 ring-gray-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ring-1 ring-inset ${cls}`}>
      {status?.toUpperCase() ?? 'N/A'}
    </span>
  );
}

export default function RaceEntriesTable({ race, onBack }: RaceEntriesTableProps) {
  const [entries, setEntries] = useState<any[]>([]);
  const [teams, setTeams]     = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false);

  const [rows, setRows]           = useState<BulkRow[]>([newRow()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editingBow, setEditingBow] = useState('');

  const canManage = race.race_status === RaceStatus.SCHEDULED || race.race_status === RaceStatus.READY;

  // ── Fetch ────────────────────────────────────────────────────────────────────

  const fetchData = async () => {
    try {
      const [entriesData, teamsData] = await Promise.all([getBoatsByRace(race.id), getAllTeams()]);
      setEntries(assignLevelsToBoats(entriesData || []));
      setTeams(teamsData || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const supabase = createClient();
    const ch = supabase.channel(`race_entries_${race.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entries' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [race.id]);

  // ── Panel ────────────────────────────────────────────────────────────────────

  const openPanel = () => {
    setRows([newRow(String(getNextBowNumber(entries)))]);
    setSubmitted(false);
    setShowPanel(true);
  };
  const closePanel = () => { setShowPanel(false); setSubmitted(false); };

  // ── Row management ───────────────────────────────────────────────────────────

  const updateRow = (key: number, patch: Partial<BulkRow>) =>
    setRows(prev => prev.map(r => r.key === key ? { ...r, ...patch } : r));

  const addRow = () => {
    const used = rows.map(r => parseInt(r.bowNumber)).filter(n => !isNaN(n));
    setRows(prev => [...prev, newRow(String(getNextBowNumber(entries, used)))]);
  };

  const removeRow = (key: number) =>
    setRows(prev => prev.length > 1 ? prev.filter(r => r.key !== key) : prev);

  // ── Submit ───────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    const toAdd = rows.filter(r => r.teamId && r.bowNumber && r.status === 'pending');
    if (!toAdd.length) return;
    setIsSubmitting(true);
    let current = [...entries];

    for (const row of toAdd) {
      const bow = parseInt(row.bowNumber);
      if (isNaN(bow) || bow <= 0) { updateRow(row.key, { status: 'error', error: 'Invalid bow #' }); continue; }
      if (current.some(e => e.bow_number === bow)) { updateRow(row.key, { status: 'error', error: 'Bow # taken' }); continue; }
      updateRow(row.key, { status: 'adding' });
      const ok = await addBoatToRace(BigInt(row.teamId), race.id, bow);
      if (ok) {
        updateRow(row.key, { status: 'added' });
        const updated = assignLevelsToBoats(await getBoatsByRace(race.id) || []);
        setEntries(updated);
        current = updated;
      } else {
        updateRow(row.key, { status: 'error', error: 'Failed' });
      }
    }
    setIsSubmitting(false);
    setSubmitted(true);
  };

  const resetPanel = () => {
    setRows([newRow(String(getNextBowNumber(entries)))]);
    setSubmitted(false);
  };

  // ── Remove entry ─────────────────────────────────────────────────────────────

  const handleRemove = async (entryId: bigint) => {
    if (!canManage || !confirm('Remove this entry?')) return;
    if (await removeBoatFromRace(entryId)) {
      setEntries(prev => prev.filter(e => e.id.toString() !== entryId.toString()));
    } else alert('Failed to remove entry');
  };

  // ── Inline edit ──────────────────────────────────────────────────────────────

  const startEdit  = (e: any) => { setEditingId(e.id.toString()); setEditingBow(String(e.bow_number ?? '')); };
  const cancelEdit = ()        => { setEditingId(null); setEditingBow(''); };

  const saveEdit = async (entryId: bigint) => {
    const bow = parseInt(editingBow);
    if (isNaN(bow) || bow <= 0) { alert('Invalid bow number'); return; }
    if (entries.some(e => e.bow_number === bow && e.id.toString() !== entryId.toString())) { alert('Bow # already taken'); return; }
    if (await updateBowNumber(entryId, bow)) {
      setEntries(prev => prev.map(e => e.id.toString() === entryId.toString() ? { ...e, bow_number: bow } : e));
      cancelEdit();
    } else alert('Failed to update');
  };

  const teamNameWithLevel = (entry: any) => {
    const name = entry.teams?.team_name || 'Unknown';
    return entry.level ? `${name} ${entry.level}` : name;
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading entries…</p>;

  const pendingCount = rows.filter(r => r.teamId && r.bowNumber && r.status === 'pending').length;

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Race Entries</h3>
          <p className="text-sm text-muted-foreground">{entries.length} entered</p>
        </div>
        {canManage && (
          <Button
            variant={showPanel ? 'outline' : 'default'}
            size="sm"
            onClick={showPanel ? closePanel : openPanel}
            disabled={teams.length === 0}
          >
            {showPanel ? (
              <><X className="w-3.5 h-3.5 mr-1.5" />Close</>
            ) : (
              <><Plus className="w-3.5 h-3.5 mr-1.5" />Add Entries</>
            )}
          </Button>
        )}
      </div>

      {/* ── Add entries panel ── */}
      {canManage && showPanel && (
        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">

          {/* Column labels */}
          <div className="grid grid-cols-[1fr_5rem_2rem] gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Team</span>
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Bow #</span>
            <span />
          </div>

          {/* Rows */}
          <div className="space-y-2">
            {rows.map((row) => {
              const frozen = row.status !== 'pending';
              return (
                <div key={row.key} className="grid grid-cols-[1fr_5rem_2rem] gap-2 items-center">
                  {frozen ? (
                    /* ── Frozen result row ── */
                    <div className="col-span-2 flex items-center gap-2 min-w-0">
                      {row.status === 'adding' && (
                        <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin shrink-0" />
                      )}
                      {row.status === 'added' && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 ring-1 ring-green-200 ring-inset px-2 py-0.5 rounded-md shrink-0">
                          <Check className="w-3 h-3" /> Added
                        </span>
                      )}
                      {row.status === 'error' && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 ring-1 ring-red-200 ring-inset px-2 py-0.5 rounded-md shrink-0">
                          <X className="w-3 h-3" /> {row.error}
                        </span>
                      )}
                      <span className="text-sm text-foreground truncate">
                        {row.teamName}
                      </span>
                      <span className="text-sm text-muted-foreground shrink-0">· #{row.bowNumber}</span>
                    </div>
                  ) : (
                    /* ── Editable row ── */
                    <>
                      <TeamCombobox
                        teams={teams}
                        value={row.teamId}
                        onChange={(id, name) => updateRow(row.key, { teamId: id, teamName: name })}
                        placeholder="Search teams…"
                      />
                      <Input
                        type="number"
                        value={row.bowNumber}
                        onChange={e => updateRow(row.key, { bowNumber: e.target.value })}
                        min="1"
                        className="h-9 text-sm"
                      />
                    </>
                  )}

                  {/* Remove row button */}
                  <button
                    type="button"
                    onClick={() => removeRow(row.key)}
                    disabled={rows.length === 1 || row.status === 'adding'}
                    className="flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    aria-label="Remove row"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-1 border-t border-border/50">
            <button
              type="button"
              onClick={addRow}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 disabled:opacity-50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add another team
            </button>
            <div className="flex items-center gap-2">
              {submitted && (
                <Button variant="outline" size="sm" onClick={resetPanel}>
                  Add more
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={isSubmitting || pendingCount === 0}
              >
                {isSubmitting ? (
                  <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Adding…</>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    {pendingCount === 1 ? 'Add 1 entry' : `Add ${pendingCount || ''} entries`}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Entries table ── */}
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-16">Bow #</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Status</TableHead>
              {canManage && <TableHead className="w-32" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canManage ? 4 : 3} className="text-center text-muted-foreground py-8">
                  No entries yet
                </TableCell>
              </TableRow>
            ) : (
              entries
                .slice()
                .sort((a, b) => (a.bow_number ?? 0) - (b.bow_number ?? 0))
                .map(entry => {
                  const isEditing = editingId === entry.id.toString();
                  return (
                    <TableRow key={entry.id.toString()}>
                      <TableCell className="font-mono font-medium">
                        {isEditing ? (
                          <Input
                            type="number"
                            value={editingBow}
                            onChange={e => setEditingBow(e.target.value)}
                            className="w-16 h-7 text-sm"
                            min="1"
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter') saveEdit(entry.id);
                              if (e.key === 'Escape') cancelEdit();
                            }}
                          />
                        ) : entry.bow_number ?? '—'}
                      </TableCell>
                      <TableCell className="font-medium">{teamNameWithLevel(entry)}</TableCell>
                      <TableCell><BoatStatusBadge status={entry.boat_status} /></TableCell>
                      {canManage && (
                        <TableCell>
                          <div className="flex items-center gap-1 justify-end">
                            {isEditing ? (
                              <>
                                <Button size="sm" className="h-7 px-2.5 text-xs" onClick={() => saveEdit(entry.id)} disabled={!editingBow}>
                                  <Check className="w-3 h-3 mr-1" />Save
                                </Button>
                                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={cancelEdit}>
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                  onClick={() => startEdit(entry)}
                                  aria-label="Edit bow number"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                  onClick={() => handleRemove(entry.id)}
                                  aria-label="Remove entry"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
