'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Team } from '../../utils/types/team';
import { Input } from '@/components/ui/input';

interface TeamComboboxProps {
  teams: Team[];
  value: string;          // selected team ID string
  onChange: (teamId: string, teamName: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  /** Called when user hits Enter with no match and wants to create a team */
  onRequestCreate?: (name: string) => void;
}

const DIV_COLORS: Record<string, string> = {
  D1: 'bg-blue-100 text-blue-700',
  D2: 'bg-green-100 text-green-700',
  D3: 'bg-purple-100 text-purple-700',
};

/** Group label order */
const DIV_ORDER = ['D1', 'D2', 'D3', 'other'];

export default function TeamCombobox({
  teams,
  value,
  onChange,
  placeholder = 'Search teams…',
  autoFocus = false,
}: TeamComboboxProps) {
  const [query, setQuery]         = useState('');
  const [open, setOpen]           = useState(false);
  const [highlighted, setHighlit] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);
  const listRef      = useRef<HTMLUListElement>(null);

  // The display value: if something is selected, show its name; otherwise show the query
  const selectedTeam = value ? teams.find(t => t.id.toString() === value) : null;
  const displayValue = open ? query : (selectedTeam?.team_name ?? '');

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filtered = query.trim() === ''
    ? teams
    : teams.filter(t => {
        const q = query.toLowerCase();
        return (
          t.team_name.toLowerCase().includes(q) ||
          (t.team_short_name ?? '').toLowerCase().includes(q)
        );
      });

  // ── Group by division ──────────────────────────────────────────────────────

  interface Group { label: string; items: Team[] }

  const grouped: Group[] = [];
  const buckets: Record<string, Team[]> = { D1: [], D2: [], D3: [], other: [] };
  filtered.forEach(t => {
    const key = t.division ?? 'other';
    (buckets[key] || buckets['other']).push(t);
  });
  DIV_ORDER.forEach(key => {
    if (buckets[key]?.length) {
      grouped.push({ label: key === 'other' ? 'Other' : key, items: buckets[key] });
    }
  });

  // Flat list for keyboard nav
  const flat = grouped.flatMap(g => g.items);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const select = useCallback((team: Team) => {
    onChange(team.id.toString(), team.team_name);
    setQuery('');
    setOpen(false);
  }, [onChange]);

  const clear = useCallback(() => {
    onChange('', '');
    setQuery('');
    setOpen(false);
    inputRef.current?.focus();
  }, [onChange]);

  // ── Keyboard navigation ────────────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') { setOpen(true); setHighlit(0); }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlit(h => Math.min(h + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlit(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flat[highlighted]) select(flat[highlighted]);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
    }
  };

  // Scroll highlighted item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${highlighted}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlighted]);

  // Reset highlighted when results change
  useEffect(() => { setHighlit(0); }, [query]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        if (!selectedTeam) setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [selectedTeam]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          autoFocus={autoFocus}
          value={displayValue}
          placeholder={placeholder}
          onFocus={() => { setOpen(true); if (selectedTeam) setQuery(''); }}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onKeyDown={handleKeyDown}
          className="pr-8"
        />
        {(selectedTeam || query) && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none"
            tabIndex={-1}
            aria-label="Clear"
          >
            ×
          </button>
        )}
      </div>

      {open && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg text-sm"
        >
          {flat.length === 0 ? (
            <li className="px-3 py-2 text-gray-400 italic">No teams found</li>
          ) : (
            (() => {
              let idx = 0;
              return grouped.map(group => (
                <li key={group.label}>
                  {/* Group header */}
                  <div className="px-3 pt-2 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wide select-none">
                    {group.label}
                  </div>
                  <ul>
                    {group.items.map(team => {
                      const itemIdx = idx++;
                      const isActive = highlighted === itemIdx;
                      const isSelected = team.id.toString() === value;
                      return (
                        <li
                          key={team.id.toString()}
                          data-idx={itemIdx}
                          onMouseEnter={() => setHighlit(itemIdx)}
                          onMouseDown={(e) => { e.preventDefault(); select(team); }}
                          className={`flex items-center justify-between px-3 py-2 cursor-pointer gap-2 ${
                            isActive ? 'bg-gray-100' : ''
                          } ${isSelected ? 'font-semibold' : ''}`}
                        >
                          <span className="flex-1 truncate">{team.team_name}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            {team.division && (
                              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${DIV_COLORS[team.division] ?? ''}`}>
                                {team.division}
                              </span>
                            )}
                            {team.gender && team.gender !== 'both' && (
                              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                team.gender === 'mens' ? 'bg-sky-100 text-sky-700' : 'bg-pink-100 text-pink-700'
                              }`}>
                                {team.gender === 'mens' ? "M" : "W"}
                              </span>
                            )}
                            {isSelected && <span className="text-blue-500 text-xs">✓</span>}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ));
            })()
          )}
        </ul>
      )}
    </div>
  );
}
