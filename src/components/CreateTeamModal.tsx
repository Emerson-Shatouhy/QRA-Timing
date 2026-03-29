'use client';

import { useState } from 'react';
import { createTeam } from '../../utils/teams/getTeam';
import { TeamDivision, TeamGender, TeamCategory, TEAM_CATEGORY_LABELS } from '../../utils/types/team';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

interface CreateTeamModalProps {
  onTeamCreated?: () => void;
}

export default function CreateTeamModal({ onTeamCreated }: CreateTeamModalProps) {
  const [open, setOpen] = useState(false);
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.team_name.trim()) {
      alert('Team name is required');
      return;
    }

    setLoading(true);
    try {
      const result = await createTeam(
        formData.team_name.trim(),
        formData.team_short_name.trim() || undefined,
        formData.primary_color || undefined,
        formData.secondary_color || undefined,
        (formData.division || undefined) as TeamDivision | undefined,
        (formData.gender || undefined) as TeamGender | undefined,
        formData.oarspotter_key.trim() || undefined,
        (formData.category || undefined) as TeamCategory | undefined,
      );

      if (result) {
        setFormData({ team_name: '', team_short_name: '', primary_color: '', secondary_color: '', division: '', gender: '', category: '', oarspotter_key: '' });
        setOpen(false);
        onTeamCreated?.();
      } else {
        alert('Failed to create team. Please try again.');
      }
    } catch (error) {
      console.error('Error creating team:', error);
      alert('An error occurred while creating the team.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Team</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add New Team</DialogTitle>
          <DialogDescription>
            Enter the team details. Only the team name is required.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team_name">Team Name *</Label>
            <Input
              id="team_name"
              value={formData.team_name}
              onChange={(e) => handleInputChange('team_name', e.target.value)}
              placeholder="e.g. Worcester Rowing Club"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="team_short_name">Short Name</Label>
            <Input
              id="team_short_name"
              value={formData.team_short_name}
              onChange={(e) => handleInputChange('team_short_name', e.target.value)}
              placeholder="e.g. WRC"
              maxLength={10}
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={formData.category} onValueChange={(v) => handleInputChange('category', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(TEAM_CATEGORY_LABELS) as [TeamCategory, string][]).map(([val, label]) => (
                  <SelectItem key={val} value={val}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Division</Label>
              <Select value={formData.division} onValueChange={(v) => handleInputChange('division', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select division" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="D1">D1</SelectItem>
                  <SelectItem value="D2">D2</SelectItem>
                  <SelectItem value="D3">D3</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={formData.gender} onValueChange={(v) => handleInputChange('gender', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mens">Men's</SelectItem>
                  <SelectItem value="womens">Women's</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primary_color">Primary Color</Label>
              <div className="flex items-center gap-2">
                <input
                  id="primary_color"
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
              <Label htmlFor="secondary_color">Secondary Color</Label>
              <div className="flex items-center gap-2">
                <input
                  id="secondary_color"
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
            <Label htmlFor="oarspotter_key">OarSpotter Key</Label>
            <div className="flex items-center gap-2">
              <Input
                id="oarspotter_key"
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Team'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
