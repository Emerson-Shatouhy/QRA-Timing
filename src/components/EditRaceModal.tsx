'use client';

import { useState, useEffect } from 'react';
import { updateRace } from '../../utils/races/getRace';
import { getAllTeams } from '../../utils/teams/getTeam';
import type { Race } from '../../utils/types/race';
import type { Team } from '../../utils/types/team';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface Props {
  race: Race;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

export default function EditRaceModal({ race, open, onOpenChange, onUpdated }: Props) {
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [formData, setFormData] = useState({
    race_name: race.race_name || '',
    race_type: race.race_type || 'sprint',
    gender: race.gender || '',
    boat_class: race.boat_class || '',
    age_category: race.age_category || '',
    level: race.level ? String(race.level) : '',
    distance_meters: race.distance_meters ? String(race.distance_meters) : '',
    max_entries: race.max_entries ? String(race.max_entries) : '',
    scheduled_start: race.scheduled_start
      ? new Date(race.scheduled_start).toISOString().slice(0, 16)
      : '',
    host_team_id: race.host_team_id ? String(race.host_team_id) : '',
  });

  useEffect(() => {
    getAllTeams().then(setTeams);
  }, []);

  useEffect(() => {
    setFormData({
      race_name: race.race_name || '',
      race_type: race.race_type || 'sprint',
      gender: race.gender || '',
      boat_class: race.boat_class || '',
      age_category: race.age_category || '',
      level: race.level ? String(race.level) : '',
      distance_meters: race.distance_meters ? String(race.distance_meters) : '',
      max_entries: race.max_entries ? String(race.max_entries) : '',
      scheduled_start: race.scheduled_start
        ? new Date(race.scheduled_start).toISOString().slice(0, 16)
        : '',
      host_team_id: race.host_team_id ? String(race.host_team_id) : '',
    });
  }, [race]);

  const update = (field: string, value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fields: Record<string, unknown> = {
        race_name: formData.race_name || null,
        race_type: formData.race_type,
        gender: formData.gender || null,
        boat_class: formData.boat_class || null,
        age_category: formData.age_category || null,
        level: formData.level ? Number(formData.level) : null,
        distance_meters: formData.distance_meters ? Number(formData.distance_meters) : null,
        max_entries: formData.max_entries ? Number(formData.max_entries) : null,
        scheduled_start: formData.scheduled_start ? new Date(formData.scheduled_start).toISOString() : null,
        host_team_id: formData.host_team_id ? Number(formData.host_team_id) : null,
      };

      const ok = await updateRace(Number(race.id), fields);
      if (ok) {
        onOpenChange(false);
        onUpdated();
      } else {
        alert('Failed to update event.');
      }
    } catch (err) {
      console.error('Error updating race:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
          <DialogDescription>Update the event details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Event Name</Label>
            <Input value={formData.race_name} onChange={(e) => update('race_name', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={formData.gender || 'none'} onValueChange={(v) => update('gender', v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="M">Men&apos;s</SelectItem>
                  <SelectItem value="F">Women&apos;s</SelectItem>
                  <SelectItem value="MX">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Age Category</Label>
              <Select value={formData.age_category || 'none'} onValueChange={(v) => update('age_category', v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
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
              <Select value={formData.boat_class || 'none'} onValueChange={(v) => update('boat_class', v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
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

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Level</Label>
              <Input type="number" min="1" max="5" value={formData.level} onChange={(e) => update('level', e.target.value)} placeholder="e.g. 1" />
            </div>
            <div className="space-y-2">
              <Label>Distance (m)</Label>
              <Input type="number" value={formData.distance_meters} onChange={(e) => update('distance_meters', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Max Entries</Label>
              <Input type="number" value={formData.max_entries} onChange={(e) => update('max_entries', e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Host School</Label>
            <Select value={formData.host_team_id || 'none'} onValueChange={(v) => update('host_team_id', v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
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

          <div className="space-y-2">
            <Label>Scheduled Start</Label>
            <Input type="datetime-local" value={formData.scheduled_start} onChange={(e) => update('scheduled_start', e.target.value)} />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
