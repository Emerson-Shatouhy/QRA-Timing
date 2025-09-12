'use client';

import { useState } from 'react';
import { createRace, getRaceTypes } from '../../utils/races/getRace';
import { RaceType } from '../../utils/types/race';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CreateRaceModalProps {
  onRaceCreated?: () => void;
}

export default function CreateRaceModal({ onRaceCreated }: CreateRaceModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    race_name: '',
    race_type: '',
    event_date: '',
    scheduled_start: '',
    distance_meters: '',
    max_entries: '',
    weather_conditions: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.race_name || !formData.race_type || !formData.event_date || !formData.scheduled_start) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const raceData = {
        race_name: formData.race_name,
        race_type: formData.race_type as RaceType,
        event_date: new Date(formData.event_date),
        scheduled_start: new Date(formData.scheduled_start),
        distance_meters: formData.distance_meters ? parseInt(formData.distance_meters) : undefined,
        max_entries: formData.max_entries ? parseInt(formData.max_entries) : undefined,
        weather_conditions: formData.weather_conditions || undefined
      };

      const result = await createRace(raceData);
      if (result) {
        setFormData({
          race_name: '',
          race_type: '',
          event_date: '',
          scheduled_start: '',
          distance_meters: '',
          max_entries: '',
          weather_conditions: ''
        });
        setOpen(false);
        onRaceCreated?.();
      } else {
        alert('Failed to create race. Please try again.');
      }
    } catch (error) {
      console.error('Error creating race:', error);
      alert('An error occurred while creating the race.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create New Race</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Race</DialogTitle>
          <DialogDescription>
            Fill in the details to create a new race.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="race_name">Race Name *</Label>
            <Input
              id="race_name"
              value={formData.race_name}
              onChange={(e) => handleInputChange('race_name', e.target.value)}
              placeholder="Enter race name"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="race_type">Race Type *</Label>
            <Select value={formData.race_type} onValueChange={(value) => handleInputChange('race_type', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select race type" />
              </SelectTrigger>
              <SelectContent>
                {getRaceTypes().map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="event_date">Event Date *</Label>
            <Input
              id="event_date"
              type="date"
              value={formData.event_date}
              onChange={(e) => handleInputChange('event_date', e.target.value)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="scheduled_start">Scheduled Start Time *</Label>
            <Input
              id="scheduled_start"
              type="datetime-local"
              value={formData.scheduled_start}
              onChange={(e) => handleInputChange('scheduled_start', e.target.value)}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="distance_meters">Distance (meters)</Label>
              <Input
                id="distance_meters"
                type="number"
                value={formData.distance_meters}
                onChange={(e) => handleInputChange('distance_meters', e.target.value)}
                placeholder="e.g. 2000"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="max_entries">Max Entries</Label>
              <Input
                id="max_entries"
                type="number"
                value={formData.max_entries}
                onChange={(e) => handleInputChange('max_entries', e.target.value)}
                placeholder="e.g. 8"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="weather_conditions">Weather Conditions</Label>
            <Input
              id="weather_conditions"
              value={formData.weather_conditions}
              onChange={(e) => handleInputChange('weather_conditions', e.target.value)}
              placeholder="e.g. Clear, light winds"
            />
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Race'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}