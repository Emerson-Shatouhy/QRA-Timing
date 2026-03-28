export type RegattaStatus = 'draft' | 'active' | 'complete';

export interface Regatta {
  id: number;
  created_at: string;
  created_by: string | null;
  name: string;
  date: string;
  venue: string | null;
  status: RegattaStatus;
  description: string | null;
  weather_conditions: string | null;
}

export type EventGender = 'M' | 'F' | 'MX';
export type AgeCategory = 'Varsity' | 'JV' | 'Novice' | 'Masters' | 'Youth' | 'Open';

export interface RegattaTemplate {
  id: number;
  created_at: string;
  created_by: string | null;
  name: string;
  description: string | null;
}

export interface TemplateEvent {
  id: number;
  template_id: number;
  name: string;
  race_type: string;
  boat_class: string | null;
  gender: EventGender | null;
  age_category: AgeCategory | null;
  level: number | null;
  distance_meters: number | null;
  sort_order: number | null;
  offset_minutes: number | null;
}

/**
 * Build a display name from structured event fields.
 */
export function buildEventDisplayName(fields: {
  gender?: EventGender | null;
  age_category?: AgeCategory | null;
  boat_class?: string | null;
  level?: number | null;
}): string {
  const parts: string[] = [];

  if (fields.gender) {
    parts.push(fields.gender === 'M' ? "Men's" : fields.gender === 'F' ? "Women's" : 'Mixed');
  }
  if (fields.age_category) {
    parts.push(fields.age_category);
  }
  if (fields.boat_class) {
    parts.push(fields.boat_class);
  }
  if (fields.level) {
    parts.push(`${fields.level}v`);
  }

  return parts.join(' ') || 'Unnamed Event';
}
