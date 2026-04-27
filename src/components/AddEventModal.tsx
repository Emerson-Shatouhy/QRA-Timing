'use client';

import { useState, useEffect } from 'react';
import { createRaceInRegatta } from '../../utils/regattas/getRegatta';
import { getAllTeams } from '../../utils/teams/getTeam';
import { buildEventDisplayName } from '../../utils/types/regatta';
import type { Team } from '../../utils/types/team';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';

interface Props {
  regattaId: number;
  regattaDate: string;
  onCreated?: () => void;
}

export default function AddEventModal({ regattaId, regattaDate, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [mode, setMode] = useState<'single' | 'levels' | 'break'>('single');
  const [formData, setFormData] = useState({
    race_name: '',
    race_type: 'sprint',
    gender: '',
    boat_class: '',
    age_category: '',
    level: '',
    level_count: '1',
    distance_meters: '',
    max_entries: '6',
    scheduled_start: '',
    host_team_id: '',
  });

  useEffect(() => {
    getAllTeams().then(setTeams);
  }, []);

  const autoName = buildEventDisplayName({
    gender: (formData.gender || undefined) as 'M' | 'F' | 'MX' | undefined,
    age_category: (formData.age_category || undefined) as 'Varsity' | 'JV' | 'Novice' | 'Masters' | 'Youth' | 'Open' | undefined,
    boat_class: formData.boat_class || undefined,
    level: formData.level ? Number(formData.level) : undefined,
  });

  const update = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'break') {
        await createRaceInRegatta(regattaId, {
          race_name: formData.race_name || 'Break',
          race_type: 'break',
          event_date: regattaDate,
          scheduled_start: formData.scheduled_start || undefined,
          host_team_id: formData.host_team_id ? Number(formData.host_team_id) : undefined,
        });
      } else if (mode === 'levels') {
        const count = Number(formData.level_count) || 1;
        const promises = [];
        for (let i = 1; i <= count; i++) {
          const name = buildEventDisplayName({
            gender: (formData.gender || undefined) as 'M' | 'F' | 'MX' | undefined,
            age_category: (formData.age_category || undefined) as 'Varsity' | 'JV' | 'Novice' | 'Masters' | 'Youth' | 'Open' | undefined,
            boat_class: formData.boat_class || undefined,
            level: i,
          });
          promises.push(createRaceInRegatta(regattaId, {
            race_name: name,
            race_type: formData.race_type,
            event_date: regattaDate,
            scheduled_start: formData.scheduled_start || undefined,
            distance_meters: formData.distance_meters ? Number(formData.distance_meters) : undefined,
            max_entries: formData.max_entries ? Number(formData.max_entries) : undefined,
            gender: formData.gender || undefined,
            boat_class: formData.boat_class || undefined,
            age_category: formData.age_category || undefined,
            level: i,
            sort_order: i,
            host_team_id: formData.host_team_id ? Number(formData.host_team_id) : undefined,
          }));
        }
        await Promise.all(promises);
      } else {
        const name = formData.race_name || autoName;
        await createRaceInRegatta(regattaId, {
          race_name: name,
          race_type: formData.race_type,
          event_date: regattaDate,
          scheduled_start: formData.scheduled_start || undefined,
          distance_meters: formData.distance_meters ? Number(formData.distance_meters) : undefined,
          max_entries: formData.max_entries ? Number(formData.max_entries) : undefined,
          gender: formData.gender || undefined,
          boat_class: formData.boat_class || undefined,
          age_category: formData.age_category || undefined,
          level: formData.level ? Number(formData.level) : undefined,
          host_team_id: formData.host_team_id ? Number(formData.host_team_id) : undefined,
        });
      }

      setFormData({
        race_name: '', race_type: 'sprint', gender: '', boat_class: '', age_category: '',
        level: '', level_count: '1', distance_meters: '', max_entries: '', scheduled_start: '',
        host_team_id: '',
      });
      setOpen(false);
      onCreated?.();
    } catch (err) {
      console.error('Error creating event:', err);
      alert('Failed to create event.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" /> Add Event
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Add Event</DialogTitle>
          <DialogDescription>Create a new event for this regatta.</DialogDescription>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => setMode('single')}
            className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
              mode === 'single' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Single Event
          </button>
          <button
            onClick={() => setMode('levels')}
            className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
              mode === 'levels' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            With Levels (1v, 2v, 3v...)
          </button>
          <button
            onClick={() => setMode('break')}
            className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
              mode === 'break' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Break
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'break' ? (
            <>
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-sm text-amber-800">
                Add a break to the schedule. Breaks appear in the printed schedule but cannot be started or timed.
              </div>
              <div className="space-y-2">
                <Label>Break Label</Label>
                <Input
                  value={formData.race_name}
                  onChange={(e) => update('race_name', e.target.value)}
                  placeholder="e.g. Lunch Break, Medal Ceremony"
                />
              </div>
              <div className="space-y-2">
                <Label>Scheduled Time</Label>
                <Input
                  type="datetime-local"
                  value={formData.scheduled_start}
                  onChange={(e) => update('scheduled_start', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Host School (optional)</Label>
                <Select value={formData.host_team_id || 'none'} onValueChange={(v) => update('host_team_id', v === 'none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Select host school" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {teams.filter((t) => t.is_local_school).map((team) => (
                      <SelectItem key={String(team.id)} value={String(team.id)}>
                        {team.team_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={formData.gender} onValueChange={(v) => update('gender', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Men&apos;s</SelectItem>
                  <SelectItem value="F">Women&apos;s</SelectItem>
                  <SelectItem value="MX">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Age Category</Label>
              <Select value={formData.age_category} onValueChange={(v) => update('age_category', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Varsity">Varsity</SelectItem>
                  <SelectItem value="JV">JV</SelectItem>
                  <SelectItem value="Novice">Novice</SelectItem>
                  <SelectItem value="Masters">Masters</SelectItem>
                  <SelectItem value="Youth">Youth</SelectItem>
                  <SelectItem value="Open">Open</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Boat Class</Label>
              <Select value={formData.boat_class} onValueChange={(v) => update('boat_class', v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="8+">8+</SelectItem>
                  <SelectItem value="4+">4+</SelectItem>
                  <SelectItem value="4x">4x</SelectItem>
                  <SelectItem value="4-">4-</SelectItem>
                  <SelectItem value="2x">2x</SelectItem>
                  <SelectItem value="2-">2-</SelectItem>
                  <SelectItem value="1x">1x</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Race Format</Label>
              <Select value={formData.race_type} onValueChange={(v) => update('race_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sprint">Sprint</SelectItem>
                  <SelectItem value="head_race">Head Race</SelectItem>
                  <SelectItem value="time_trial">Time Trial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {mode === 'single' && (
            <div className="space-y-2">
              <Label>Level (optional)</Label>
              <Input
                type="number"
                min="1"
                max="5"
                value={formData.level}
                onChange={(e) => update('level', e.target.value)}
                placeholder="e.g. 1 for 1v"
              />
            </div>
          )}

          {mode === 'levels' && (
            <div className="space-y-2">
              <Label>How many boats? (creates 1v, 2v, 3v...)</Label>
              <Input
                type="number"
                min="1"
                max="5"
                value={formData.level_count}
                onChange={(e) => update('level_count', e.target.value)}
              />
              <p className="text-xs text-gray-500">
                This will create {formData.level_count || 1} events: {
                  Array.from({ length: Number(formData.level_count) || 1 }, (_, i) =>
                    buildEventDisplayName({
                      gender: (formData.gender || undefined) as 'M' | 'F' | 'MX' | undefined,
                      age_category: (formData.age_category || undefined) as 'Varsity' | 'JV' | 'Novice' | 'Masters' | 'Youth' | 'Open' | undefined,
                      boat_class: formData.boat_class || undefined,
                      level: i + 1,
                    })
                  ).join(', ')
                }
              </p>
            </div>
          )}

          {mode === 'single' && (
            <div className="space-y-2">
              <Label>Event Name</Label>
              <Input
                value={formData.race_name}
                onChange={(e) => update('race_name', e.target.value)}
                placeholder={autoName || 'Auto-generated from fields above'}
              />
              {!formData.race_name && autoName && (
                <p className="text-xs text-gray-500">Will use: {autoName}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Host School</Label>
            <Select value={formData.host_team_id || 'none'} onValueChange={(v) => update('host_team_id', v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Select host school" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {teams.map((team) => (
                  <SelectItem key={String(team.id)} value={String(team.id)}>
                    {team.team_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Distance (m)</Label>
              <Input
                type="number"
                value={formData.distance_meters}
                onChange={(e) => update('distance_meters', e.target.value)}
                placeholder="e.g. 2000"
              />
            </div>
            <div className="space-y-2">
              <Label>Max Entries</Label>
              <Input
                type="number"
                value={formData.max_entries}
                onChange={(e) => update('max_entries', e.target.value)}
                placeholder="e.g. 6"
              />
            </div>
          </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : mode === 'break'
                ? 'Add Break'
                : mode === 'levels'
                ? `Create ${formData.level_count || 1} Events`
                : 'Create Event'
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
