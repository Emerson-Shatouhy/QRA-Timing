'use client';

import { useState, useEffect } from 'react';
import { updateRegatta } from '../../utils/regattas/getRegatta';
import type { Regatta } from '../../utils/types/regatta';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  regatta: Regatta;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

export default function EditRegattaModal({ regatta, open, onOpenChange, onUpdated }: Props) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: regatta.name,
    date: regatta.date,
    venue: regatta.venue || '',
    description: regatta.description || '',
    weather_conditions: regatta.weather_conditions || '',
  });

  useEffect(() => {
    setFormData({
      name: regatta.name,
      date: regatta.date,
      venue: regatta.venue || '',
      description: regatta.description || '',
      weather_conditions: regatta.weather_conditions || '',
    });
  }, [regatta]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.date) return;

    setLoading(true);
    try {
      const ok = await updateRegatta(regatta.id, {
        name: formData.name,
        date: formData.date,
        venue: formData.venue || null,
        description: formData.description || null,
        weather_conditions: formData.weather_conditions || null,
      } as Partial<Regatta>);

      if (ok) {
        onOpenChange(false);
        onUpdated();
      } else {
        alert('Failed to update regatta.');
      }
    } catch (err) {
      console.error('Error updating regatta:', err);
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string, value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Edit Regatta</DialogTitle>
          <DialogDescription>Update the regatta details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Regatta Name *</Label>
            <Input value={formData.name} onChange={(e) => update('name', e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Date *</Label>
            <Input type="date" value={formData.date} onChange={(e) => update('date', e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Venue</Label>
            <Input value={formData.venue} onChange={(e) => update('venue', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={formData.description} onChange={(e) => update('description', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Weather Conditions</Label>
            <Input value={formData.weather_conditions} onChange={(e) => update('weather_conditions', e.target.value)} />
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
