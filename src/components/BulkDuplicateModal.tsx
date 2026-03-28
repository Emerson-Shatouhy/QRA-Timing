'use client';

import { useState } from 'react';
import { bulkDuplicateRaces } from '../../utils/regattas/getRegatta';
import { buildEventDisplayName } from '../../utils/types/regatta';
import type { Race } from '../../utils/types/race';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceRaceIds: number[];
  races: Race[];
  onDuplicated: () => void;
}

export default function BulkDuplicateModal({ open, onOpenChange, sourceRaceIds, races, onDuplicated }: Props) {
  const [loading, setLoading] = useState(false);
  const [flipGender, setFlipGender] = useState(false);
  const [newGender, setNewGender] = useState('');
  const [newBoatClass, setNewBoatClass] = useState('');
  const [generateLevels, setGenerateLevels] = useState(false);
  const [levelCount, setLevelCount] = useState('3');

  const selectedRaces = races.filter(r => sourceRaceIds.includes(Number(r.id)));

  // Preview what will be created
  const preview: string[] = [];
  for (const race of selectedRaces) {
    const gender = flipGender ? newGender : (race.gender || undefined);
    const boatClass = newBoatClass || (race.boat_class || undefined);

    if (generateLevels) {
      for (let i = 1; i <= Number(levelCount); i++) {
        preview.push(buildEventDisplayName({
          gender: gender as 'M' | 'F' | 'MX' | undefined,
          age_category: race.age_category as 'Varsity' | 'JV' | 'Novice' | 'Masters' | 'Youth' | 'Open' | undefined,
          boat_class: boatClass as string | undefined,
          level: i,
        }));
      }
    } else {
      preview.push(buildEventDisplayName({
        gender: gender as 'M' | 'F' | 'MX' | undefined,
        age_category: race.age_category as 'Varsity' | 'JV' | 'Novice' | 'Masters' | 'Youth' | 'Open' | undefined,
        boat_class: boatClass as string | undefined,
        level: race.level || undefined,
      }));
    }
  }

  const handleDuplicate = async () => {
    setLoading(true);
    try {
      const modifications: {
        gender?: string;
        boat_class?: string;
        levels?: number[];
      } = {};

      if (flipGender && newGender) modifications.gender = newGender;
      if (newBoatClass) modifications.boat_class = newBoatClass;
      if (generateLevels) {
        modifications.levels = Array.from({ length: Number(levelCount) }, (_, i) => i + 1);
      }

      const result = await bulkDuplicateRaces(sourceRaceIds, modifications);
      if (result.length > 0) {
        onOpenChange(false);
        onDuplicated();
      } else {
        alert('Failed to duplicate events.');
      }
    } catch (err) {
      console.error('Error duplicating:', err);
      alert('An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Duplicate Events</DialogTitle>
          <DialogDescription>
            Duplicating {selectedRaces.length} event{selectedRaces.length !== 1 ? 's' : ''}. Choose what to change.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Source events */}
          <div>
            <Label className="text-xs text-gray-500">Source events:</Label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {selectedRaces.map(r => (
                <span key={String(r.id)} className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-700">
                  {r.race_name || 'Unnamed'}
                </span>
              ))}
            </div>
          </div>

          {/* Gender flip */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={flipGender}
              onChange={(e) => setFlipGender(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <Label className="cursor-pointer" onClick={() => setFlipGender(!flipGender)}>
              Change gender
            </Label>
            {flipGender && (
              <Select value={newGender} onValueChange={setNewGender}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Men&apos;s</SelectItem>
                  <SelectItem value="F">Women&apos;s</SelectItem>
                  <SelectItem value="MX">Mixed</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Boat class change */}
          <div className="space-y-2">
            <Label>Change boat class (optional)</Label>
            <Select value={newBoatClass || 'keep'} onValueChange={(v) => setNewBoatClass(v === 'keep' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="Keep original" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="keep">Keep original</SelectItem>
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

          {/* Level generation */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={generateLevels}
              onChange={(e) => setGenerateLevels(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <Label className="cursor-pointer" onClick={() => setGenerateLevels(!generateLevels)}>
              Generate level variants (1v, 2v, 3v...)
            </Label>
            {generateLevels && (
              <Input
                type="number"
                min="1"
                max="5"
                value={levelCount}
                onChange={(e) => setLevelCount(e.target.value)}
                className="w-20"
              />
            )}
          </div>

          {/* Preview */}
          <div className="bg-gray-50 rounded-lg p-4">
            <Label className="text-xs text-gray-500 mb-2 block">Preview ({preview.length} events will be created):</Label>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {preview.map((name, i) => (
                <div key={i} className="text-sm text-gray-700">• {name}</div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleDuplicate} disabled={loading || preview.length === 0}>
              {loading ? 'Creating...' : `Create ${preview.length} Events`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
