import { createClient } from "../supabase/client";
import type { Regatta, RegattaStatus } from "../types/regatta";

/**
 * Gets all regattas, ordered by date descending
 */
export async function getAllRegattas(): Promise<Regatta[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('regattas')
    .select('*')
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching regattas:', error);
    return [];
  }
  return data || [];
}

/**
 * Gets a regatta by ID
 */
export async function getRegattaById(id: number): Promise<Regatta | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('regattas')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching regatta:', error);
    return null;
  }
  return data;
}

/**
 * Creates a new regatta
 */
export async function createRegatta(regattaData: {
  name: string;
  date: string;
  venue?: string;
  description?: string;
  weather_conditions?: string;
}): Promise<Regatta | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('regattas')
    .insert([{
      name: regattaData.name,
      date: regattaData.date,
      venue: regattaData.venue || 'Lake Quinsigamond',
      description: regattaData.description || null,
      weather_conditions: regattaData.weather_conditions || null,
      status: 'draft' as RegattaStatus,
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating regatta:', error);
    return null;
  }
  return data;
}

/**
 * Updates regatta status
 */
export async function updateRegattaStatus(id: number, status: RegattaStatus): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('regattas')
    .update({ status })
    .eq('id', id);

  if (error) {
    console.error('Error updating regatta status:', error);
    return false;
  }
  return true;
}

/**
 * Updates regatta fields
 */
export async function updateRegatta(id: number, fields: Partial<Regatta>): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('regattas')
    .update(fields)
    .eq('id', id);

  if (error) {
    console.error('Error updating regatta:', error);
    return false;
  }
  return true;
}

/**
 * Deletes a regatta (only if no races are linked)
 */
export async function deleteRegatta(id: number): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('regattas')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting regatta:', error);
    return false;
  }
  return true;
}

/**
 * Gets race count and entry count for a regatta
 */
export async function getRegattaStats(regattaId: number): Promise<{ raceCount: number; entryCount: number }> {
  const supabase = createClient();

  const { count: raceCount, error: raceError } = await supabase
    .from('races')
    .select('*', { count: 'exact', head: true })
    .eq('regatta_id', regattaId);

  if (raceError) {
    console.error('Error fetching race count:', raceError);
    return { raceCount: 0, entryCount: 0 };
  }

  // Get entries across all races in this regatta
  const { data: raceIds } = await supabase
    .from('races')
    .select('id')
    .eq('regatta_id', regattaId);

  let entryCount = 0;
  if (raceIds && raceIds.length > 0) {
    const ids = raceIds.map(r => r.id);
    const { count } = await supabase
      .from('entries')
      .select('*', { count: 'exact', head: true })
      .in('race_id', ids);
    entryCount = count || 0;
  }

  return { raceCount: raceCount || 0, entryCount };
}

/**
 * Gets all races for a regatta
 */
export async function getRacesByRegatta(regattaId: number) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('races')
    .select('*, host_team:teams!host_team_id(id, team_name, team_short_name)')
    .eq('regatta_id', regattaId)
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('scheduled_start', { ascending: true });

  if (error) {
    console.error('Error fetching races for regatta:', error);
    return [];
  }
  return data || [];
}

/**
 * Creates a race within a regatta
 */
export async function createRaceInRegatta(regattaId: number, raceData: {
  race_name: string;
  race_type: string;
  event_date: string;
  scheduled_start?: string;
  distance_meters?: number;
  max_entries?: number;
  gender?: string;
  boat_class?: string;
  age_category?: string;
  level?: number;
  sort_order?: number;
  host_team_id?: number;
}) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('races')
    .insert([{
      regatta_id: regattaId,
      race_name: raceData.race_name,
      race_type: raceData.race_type,
      event_date: raceData.event_date,
      scheduled_start: raceData.scheduled_start || null,
      distance_meters: raceData.distance_meters || null,
      max_entries: raceData.max_entries || null,
      gender: raceData.gender || null,
      boat_class: raceData.boat_class || null,
      age_category: raceData.age_category || null,
      level: raceData.level || null,
      sort_order: raceData.sort_order || null,
      host_team_id: raceData.host_team_id || null,
      race_status: 'scheduled',
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating race:', error);
    return null;
  }
  return data;
}

/**
 * Bulk duplicate races with modifications (e.g., gender flip, level variants)
 */
export async function bulkDuplicateRaces(
  sourceRaceIds: number[],
  modifications: {
    gender?: string;
    boat_class?: string;
    age_category?: string;
    levels?: number[];
  }
) {
  const supabase = createClient();

  // Fetch source races
  const { data: sourceRaces, error: fetchError } = await supabase
    .from('races')
    .select('*')
    .in('id', sourceRaceIds);

  if (fetchError || !sourceRaces) {
    console.error('Error fetching source races:', fetchError);
    return [];
  }

  const newRaces: Record<string, unknown>[] = [];

  for (const race of sourceRaces) {
    const baseRace = {
      regatta_id: race.regatta_id,
      race_type: race.race_type,
      event_date: race.event_date,
      scheduled_start: race.scheduled_start,
      distance_meters: race.distance_meters,
      max_entries: race.max_entries,
      weather_conditions: race.weather_conditions,
      gender: modifications.gender || race.gender,
      boat_class: modifications.boat_class || race.boat_class,
      age_category: modifications.age_category || race.age_category,
      race_status: 'scheduled',
    };

    if (modifications.levels && modifications.levels.length > 0) {
      // Create one race per level
      for (const level of modifications.levels) {
        const genderLabel = (baseRace.gender === 'M' ? "Men's" : baseRace.gender === 'F' ? "Women's" : 'Mixed');
        const name = `${genderLabel} ${baseRace.age_category || ''} ${baseRace.boat_class || ''} ${level}v`.trim();
        newRaces.push({ ...baseRace, level, race_name: name });
      }
    } else {
      // Single duplicate with modifications
      const gender = baseRace.gender;
      const genderLabel = (gender === 'M' ? "Men's" : gender === 'F' ? "Women's" : 'Mixed');
      const name = `${genderLabel} ${baseRace.age_category || ''} ${baseRace.boat_class || ''} ${race.level ? race.level + 'v' : ''}`.trim();
      newRaces.push({ ...baseRace, level: race.level, race_name: name });
    }
  }

  if (newRaces.length === 0) return [];

  const { data, error } = await supabase
    .from('races')
    .insert(newRaces)
    .select();

  if (error) {
    console.error('Error bulk creating races:', error);
    return [];
  }
  return data || [];
}

/**
 * Save a regatta as a template
 */
export async function saveRegattaAsTemplate(regattaId: number, templateName: string, description?: string) {
  const supabase = createClient();

  // Create template
  const { data: template, error: templateError } = await supabase
    .from('regatta_templates')
    .insert([{ name: templateName, description: description || null }])
    .select()
    .single();

  if (templateError || !template) {
    console.error('Error creating template:', templateError);
    return null;
  }

  // Fetch races from regatta
  const { data: races } = await supabase
    .from('races')
    .select('*')
    .eq('regatta_id', regattaId)
    .order('sort_order', { ascending: true });

  if (races && races.length > 0) {
    const templateEvents = races.map((race, idx) => ({
      template_id: template.id,
      name: race.race_name || 'Unnamed',
      race_type: race.race_type || 'sprint',
      boat_class: race.boat_class,
      gender: race.gender,
      age_category: race.age_category,
      level: race.level,
      distance_meters: race.distance_meters,
      sort_order: race.sort_order || idx + 1,
    }));

    await supabase.from('template_events').insert(templateEvents);
  }

  return template;
}

/**
 * Create regatta from template
 */
export async function createRegattaFromTemplate(templateId: number, regattaData: {
  name: string;
  date: string;
  venue?: string;
}) {
  const supabase = createClient();

  // Create the regatta
  const { data: regatta, error: regattaError } = await supabase
    .from('regattas')
    .insert([{
      name: regattaData.name,
      date: regattaData.date,
      venue: regattaData.venue || 'Lake Quinsigamond',
      status: 'draft',
    }])
    .select()
    .single();

  if (regattaError || !regatta) {
    console.error('Error creating regatta from template:', regattaError);
    return null;
  }

  // Fetch template events
  const { data: templateEvents } = await supabase
    .from('template_events')
    .select('*')
    .eq('template_id', templateId)
    .order('sort_order', { ascending: true });

  if (templateEvents && templateEvents.length > 0) {
    const races = templateEvents.map(te => ({
      regatta_id: regatta.id,
      race_name: te.name,
      race_type: te.race_type,
      event_date: regattaData.date,
      distance_meters: te.distance_meters,
      gender: te.gender,
      boat_class: te.boat_class,
      age_category: te.age_category,
      level: te.level,
      sort_order: te.sort_order,
      race_status: 'scheduled',
    }));

    await supabase.from('races').insert(races);
  }

  return regatta;
}

/**
 * Get all templates
 */
export async function getAllTemplates() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('regatta_templates')
    .select('*, template_events(count)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching templates:', error);
    return [];
  }
  return data || [];
}
