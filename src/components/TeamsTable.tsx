'use client';
import { getAllTeams, deleteTeam } from "../../utils/teams/getTeam";
import { useEffect, useState, useMemo } from "react";
import { createClient } from "../../utils/supabase/client";
import { Team, TeamGender, TeamCategory, TEAM_CATEGORY_LABELS } from "../../utils/types/team";
import CreateTeamModal from "./CreateTeamModal";
import EditTeamModal from "./EditTeamModal";
import OarBlade from "./OarBlade";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PAGE_SIZE = 15;

type GenderFilter = 'all' | TeamGender;
type CategoryFilter = 'all' | TeamCategory;

const GENDER_LABELS: Record<string, string> = { mens: "Men's", womens: "Women's", both: 'Both' };

const genderBadge = (g: TeamGender | null) => {
  if (!g) return null;
  const colors: Record<TeamGender, string> = {
    mens: 'bg-sky-100 text-sky-800',
    womens: 'bg-pink-100 text-pink-800',
    both: 'bg-gray-100 text-gray-700',
  };
  const labels: Record<TeamGender, string> = { mens: "Men's", womens: "Women's", both: 'Both' };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[g]}`}>{labels[g]}</span>
  );
};

const categoryBadge = (c: TeamCategory | null) => {
  if (!c) return null;
  const colors: Record<TeamCategory, string> = {
    collegiate: 'bg-indigo-100 text-indigo-800',
    youth: 'bg-amber-100 text-amber-800',
    club: 'bg-teal-100 text-teal-800',
    masters: 'bg-rose-100 text-rose-800',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[c]}`}>{TEAM_CATEGORY_LABELS[c]}</span>
  );
};

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${active
        ? 'bg-gray-900 text-white'
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
    >
      {children}
    </button>
  );
}

export default function TeamsTable() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const fetchTeams = async () => {
    try {
      const teamsData = await getAllTeams();
      // Sort alphabetically by team name
      const sorted = (teamsData || []).sort((a, b) =>
        a.team_name.localeCompare(b.team_name)
      );
      setTeams(sorted);
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();

    const supabase = createClient();
    const channel = supabase
      .channel('teams_table')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, fetchTeams)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Reset to page 1 whenever filters or search change
  useEffect(() => { setPage(1); }, [genderFilter, categoryFilter, searchQuery]);

  const handleDeleteTeam = async (team: Team) => {
    if (!confirm(`Remove "${team.team_name}"? This cannot be undone.`)) return;
    const success = await deleteTeam(team.id);
    if (success) {
      setTeams(prev => prev.filter(t => t.id.toString() !== team.id.toString()));
    } else {
      alert('Failed to remove team. It may have active race entries.');
    }
  };

  const filtered = useMemo(() => teams.filter(t => {
    if (genderFilter !== 'all' && t.gender !== genderFilter) return false;
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesName = t.team_name.toLowerCase().includes(q);
      const matchesShort = (t.team_short_name ?? '').toLowerCase().includes(q);
      if (!matchesName && !matchesShort) return false;
    }
    return true;
  }), [teams, genderFilter, categoryFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading) return <p>Loading teams...</p>;

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Teams{" "}
          <span className="ml-2 text-sm font-normal text-gray-400">
            {filtered.length} of {teams.length}
          </span>
        </h3>
        <CreateTeamModal onTeamCreated={fetchTeams} />
      </div>

      {/* Search */}
      <div className="mb-4">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search teams by name..."
          className="max-w-sm"
        />
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-4">
        {/* Category pills */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Category</span>
          <div className="flex gap-1">
            {(['all', 'collegiate', 'youth', 'club', 'masters'] as const).map(c => (
              <FilterPill key={c} active={categoryFilter === c} onClick={() => setCategoryFilter(c)}>
                {c === 'all' ? 'All' : TEAM_CATEGORY_LABELS[c]}
              </FilterPill>
            ))}
          </div>
        </div>

        {/* Gender pills */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Gender</span>
          <div className="flex gap-1">
            {(['all', 'mens', 'womens', 'both'] as const).map(g => (
              <FilterPill key={g} active={genderFilter === g} onClick={() => setGenderFilter(g)}>
                {g === 'all' ? 'All' : GENDER_LABELS[g]}
              </FilterPill>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <Table>
        <TableCaption>All Possible Teams</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Team Name</TableHead>
            <TableHead>Short Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Gender</TableHead>
            <TableHead>Colors</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginated.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-gray-500">
                No teams match the selected filters.
              </TableCell>
            </TableRow>
          ) : (
            paginated.map((team) => (
              <TableRow key={team.id.toString()}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <OarBlade oarspotterKey={team.oarspotter_key} size={22} />
                    {team.team_name}
                  </div>
                </TableCell>
                <TableCell>{team.team_short_name || '—'}</TableCell>
                <TableCell>{categoryBadge(team.category)}</TableCell>
                <TableCell>{genderBadge(team.gender)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {team.primary_color ? (
                      <div className="flex items-center gap-1.5">
                        <div style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: team.primary_color, border: '1px solid #d1d5db', flexShrink: 0 }} />
                        <span className="text-xs text-gray-500 font-mono">{team.primary_color}</span>
                      </div>
                    ) : null}
                    {team.secondary_color ? (
                      <div className="flex items-center gap-1.5">
                        <div style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: team.secondary_color, border: '1px solid #d1d5db', flexShrink: 0 }} />
                        <span className="text-xs text-gray-500 font-mono">{team.secondary_color}</span>
                      </div>
                    ) : null}
                    {!team.primary_color && !team.secondary_color && <span className="text-gray-400 text-sm">—</span>}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setEditingTeam(team); setEditModalOpen(true); }}>
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteTeam(team)}>
                      Remove
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>
            Page {page} of {totalPages} &mdash; showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              ← Prev
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <Button
                key={p}
                variant={p === page ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPage(p)}
              >
                {p}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next →
            </Button>
          </div>
        </div>
      )}

      <EditTeamModal
        team={editingTeam}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onTeamUpdated={fetchTeams}
      />
    </div>
  );
}
