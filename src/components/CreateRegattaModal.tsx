'use client';

import { useState } from 'react';
import { createRegatta, getAllTemplates, createRegattaFromTemplate } from '../../utils/regattas/getRegatta';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useEffect } from 'react';

interface Props {
  onCreated?: () => void;
}

export default function CreateRegattaModal({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<{ id: number; name: string; template_events: { count: number }[] }[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    venue: 'Lake Quinsigamond',
    description: '',
    template_id: '',
  });

  useEffect(() => {
    if (open) {
      getAllTemplates().then(t => setTemplates(t as typeof templates));
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.date) {
      alert('Please fill in name and date');
      return;
    }

    setLoading(true);
    try {
      let result;
      if (formData.template_id) {
        result = await createRegattaFromTemplate(Number(formData.template_id), {
          name: formData.name,
          date: formData.date,
          venue: formData.venue,
        });
      } else {
        result = await createRegatta({
          name: formData.name,
          date: formData.date,
          venue: formData.venue,
          description: formData.description || undefined,
        });
      }

      if (result) {
        setFormData({ name: '', date: '', venue: 'Lake Quinsigamond', description: '', template_id: '' });
        setOpen(false);
        onCreated?.();
      } else {
        alert('Failed to create regatta.');
      }
    } catch (err) {
      console.error('Error creating regatta:', err);
      alert('An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          New Regatta
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Create New Regatta</DialogTitle>
          <DialogDescription>Set up a new race day. You can add events after creating it.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {templates.length > 0 && (
            <div className="space-y-2">
              <Label>Start from Template</Label>
              <Select
                value={formData.template_id || 'none'}
                onValueChange={(v) => setFormData(prev => ({ ...prev, template_id: v === 'none' ? '' : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Blank (no template)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Blank (no template)</SelectItem>
                  {templates.map(t => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name} ({t.template_events?.[0]?.count || 0} events)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="regatta_name">Regatta Name *</Label>
            <Input
              id="regatta_name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Spring Invitational 2026"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="regatta_date">Date *</Label>
            <Input
              id="regatta_date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="regatta_venue">Venue</Label>
            <Input
              id="regatta_venue"
              value={formData.venue}
              onChange={(e) => setFormData(prev => ({ ...prev, venue: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="regatta_desc">Description</Label>
            <Input
              id="regatta_desc"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Optional notes about this regatta"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Regatta'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
