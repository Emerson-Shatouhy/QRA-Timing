'use client';

import { useState, useEffect } from 'react';
import { updateTeam } from '../../utils/teams/getTeam';
import { Team, TeamDivision, TeamGender, TeamCategory, TEAM_CATEGORY_LABELS } from '../../utils/types/team';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import OarBlade from "./OarBlade";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EditTeamModalProps {
  team: Team | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTeamUpdated?: () => void;
}

const NONE_VALUE = '__none__';

export default function EditTeamModal({ team, open, onOpenChange, onTeamUpdated }: EditTeamModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    team_name: '',
    team_short_name: '',
    primary_color: '',
    secondary_color: '',
    division: '' as TeamDivision | '',
    gender: '' as TeamGender | '',
    category: '' as TeamCategory | '',
    oarspotter_key: '',
  });

  // Populate form when team changes
  useEffect(() => {
    if (team) {
      setFormData({
        team_name: team.team_name,
        team_short_name: team.team_short_name || '',
        primary_color: team.primary_color || '',
        secondary_color: team.secondary_color || '',
        division: team.division || '',
        gender: team.gender || '',
        category: team.category || '',
        oarspotter_key: team.oarspotter_key || '',
      });
    }
  }, [team]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSelectChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value === NONE_VALUE ? '' : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team) return;
    if (!formData.team_name.trim()) {
      alert('Team name is required');
      return;
    }

    setLoading(true);
    try {
      const result = await updateTeam(team.id, {
        team_name: formData.team_name.trim(),
        team_short_name: formData.team_short_name.trim() || null,
        primary_color: formData.primary_color || null,
        secondary_color: formData.secondary_color || null,
        division: (formData.division || null) as TeamDivision | null,
        gender: (formData.gender || null) as TeamGender | null,
        oarspotter_key: formData.oarspotter_key.trim() || null,
        category: (formData.category || null) as TeamCategory | null,
      });

      if (result) {
        onOpenChange(false);
        onTeamUpdated?.();
      } else {
        alert('Failed to update team. Please try again.');
      }
    } catch (error) {
      console.error('Error updating team:', error);
      alert('An error occurred while updating the team.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit Team</DialogTitle>
          <DialogDescription>
            Update the team details. Only the team name is required.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit_team_name">Team Name *</Label>
            <Input
              id="edit_team_name"
              value={formData.team_name}
              onChange={(e) => handleInputChange('team_name', e.target.value)}
              placeholder="e.g. Worcester Rowing Club"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_team_short_name">Short Name</Label>
            <Input
              id="edit_team_short_name"
              value={formData.team_short_name}
              onChange={(e) => handleInputChange('team_short_name', e.target.value)}
              placeholder="e.g. WRC"
              maxLength={10}
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={formData.category || NONE_VALUE} onValueChange={(v) => handleSelectChange('category', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>None</SelectItem>
                {(Object.entries(TEAM_CATEGORY_LABELS) as [TeamCategory, string][]).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Division</Label>
              <Select value={formData.division || NONE_VALUE} onValueChange={(v) => handleSelectChange('division', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select division" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>None</SelectItem>
                  <SelectItem value="D1">D1</SelectItem>
                  <SelectItem value="D2">D2</SelectItem>
                  <SelectItem value="D3">D3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={formData.gender || NONE_VALUE} onValueChange={(v) => handleSelectChange('gender', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>None</SelectItem>
                  <SelectItem value="mens">Men&apos;s</SelectItem>
                  <SelectItem value="womens">Women&apos;s</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit_primary_color">Primary Color</Label>
              <div className="flex items-center gap-2">
                <input
                  id="edit_primary_color"
                  type="color"
                  value={formData.primary_color || '#000000'}
                  onChange={(e) => handleInputChange('primary_color', e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border border-input p-1"
                />
                <Input
                  value={formData.primary_color}
                  onChange={(e) => handleInputChange('primary_color', e.target.value)}
                  placeholder="#000000"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_secondary_color">Secondary Color</Label>
              <div className="flex items-center gap-2">
                <input
                  id="edit_secondary_color"
                  type="color"
                  value={formData.secondary_color || '#ffffff'}
                  onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border border-input p-1"
                />
                <Input
                  value={formData.secondary_color}
                  onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                  placeholder="#ffffff"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit_oarspotter_key">OarSpotter Key</Label>
            <div className="flex items-center gap-2">
              <Input
                id="edit_oarspotter_key"
                value={formData.oarspotter_key}
                onChange={(e) => handleInputChange('oarspotter_key', e.target.value)}
                placeholder="e.g. Harvard"
                className="flex-1"
              />
              {formData.oarspotter_key && (
                <OarBlade oarspotterKey={formData.oarspotter_key} size={28} />
              )}
            </div>
            <p className="text-xs text-gray-400">
              Image key from oarspotter.com (filename without .png)
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
