import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../../utils/supabase/server';
import {
  getFileMakerToken,
  releaseFileMakerToken,
  fetchScheduleRecords,
  fetchLaneRecords,
  type FMLaneRecord,
} from '../../../../../../utils/filemaker/client';
import { parseEventCode, buildTBDRaceName } from '../../../../../../utils/filemaker/parseEventCode';

// ─── Types ──────────────────────────────────────────────────────────────────

interface SyncLog {
  message: string;
  type: 'info' | 'warn' | 'error' | 'success';
}

interface SyncResult {
  success: boolean;
  races: number;
  teams: number;
  entries: number;
  results: number;
  log: SyncLog[];
}

// ─── Helpers (shared with main sync route) ─────────────────────────────────

function toFMDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${m}/${d}/${y}`;
}

function toEasternTimestamp(dateISO: string, fmTime: string): string | null {
  if (!fmTime || fmTime.trim() === '') return null;

  let hours = 0;
  let minutes = 0;

  const ampmMatch = fmTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (ampmMatch) {
    hours = parseInt(ampmMatch[1], 10);
    minutes = parseInt(ampmMatch[2], 10);
    const period = ampmMatch[3].toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
  } else {
    const milMatch = fmTime.match(/(\d{1,2}):(\d{2})/);
    if (milMatch) {
      hours = parseInt(milMatch[1], 10);
      minutes = parseInt(milMatch[2], 10);
    } else {
      return null;
    }
  }

  const month = parseInt(dateISO.split('-')[1], 10);
  const offset = month >= 3 && month <= 11 ? '-04:00' : '-05:00';

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  return `${dateISO}T${hh}:${mm}:00${offset}`;
}

function isBreak(lane: FMLaneRecord): boolean {
  const rt = lane.fieldData.racetime?.trim().toLowerCase() || '';
  const ev = lane.fieldData.event?.trim().toLowerCase() || '';
  const host = lane.fieldData.host?.trim().toLowerCase() || '';
  return rt === 'break' || ev === 'break' || rt.includes('break') || host === 'break';
}

function extractTeamNames(lane: FMLaneRecord): string[] {
  const names = new Set<string>();
  const fd = lane.fieldData;
  for (let i = 0; i <= 6; i++) {
    const name = (fd[`entry${i}` as keyof typeof fd] as string)?.trim();
    if (name && name !== '') names.add(name);
  }
  const host = fd.host?.trim();
  if (host && host !== '') names.add(host);
  return Array.from(names);
}

function parseRaceTime(fmTime: string): number | null {
  if (!fmTime || fmTime.trim() === '') return null;
  const t = fmTime.trim();

  const minMatch = t.match(/^(\d+):(\d+(?:\.\d+)?)$/);
  if (minMatch) {
    const mins = parseInt(minMatch[1], 10);
    const secs = parseFloat(minMatch[2]);
    return Math.round((mins * 60 + secs) * 1000);
  }

  const secMatch = t.match(/^(\d+(?:\.\d+)?)$/);
  if (secMatch) {
    return Math.round(parseFloat(secMatch[1]) * 1000);
  }

  return null;
}

function formatDisplayDate(dateISO: string): string {
  const d = new Date(dateISO + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// ─── Team Cache (per-request) ──────────────────────────────────────────────

let _teamCache: { id: number; team_name: string; team_short_name: string | null }[] | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadTeamCache(supabase: any) {
  if (_teamCache) return _teamCache;
  const { data } = await supabase.from('teams').select('id, team_name, team_short_name');
  _teamCache = data || [];
  return _teamCache;
}

function findBestTeamMatch(
  fmName: string,
  teams: { id: number; team_name: string; team_short_name: string | null }[],
): { id: number; team_name: string } | null {
  const lower = fmName.toLowerCase().trim();

  const exactName = teams.find(t => t.team_name === fmName);
  if (exactName) return exactName;

  const exactShort = teams.find(t => t.team_short_name === fmName);
  if (exactShort) return exactShort;

  const ciName = teams.find(t => t.team_name.toLowerCase() === lower);
  if (ciName) return ciName;
  const ciShort = teams.find(t => t.team_short_name?.toLowerCase() === lower);
  if (ciShort) return ciShort;

  const containMatches = teams.filter(t => {
    const tn = t.team_name.toLowerCase();
    const ts = (t.team_short_name || '').toLowerCase();
    return tn.includes(lower) || lower.includes(tn) ||
           (ts && (ts.includes(lower) || lower.includes(ts)));
  });

  if (containMatches.length === 1) return containMatches[0];
  if (containMatches.length > 1) {
    containMatches.sort((a, b) => {
      const aDiff = Math.abs(a.team_name.length - fmName.length);
      const bDiff = Math.abs(b.team_name.length - fmName.length);
      return aDiff - bDiff;
    });
    return containMatches[0];
  }

  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function ensureTeams(supabase: any, teamNames: string[], log: SyncLog[]) {
  const teamMap = new Map<string, number>();
  const teams = await loadTeamCache(supabase);

  for (const name of teamNames) {
    const match = findBestTeamMatch(name, teams!);
    if (match) {
      teamMap.set(name, match.id);
      if (match.team_name !== name) {
        log.push({ message: `  Matched "${name}" → "${match.team_name}" (id: ${match.id})`, type: 'info' });
      }
      continue;
    }

    const { data: created, error } = await supabase
      .from('teams')
      .insert([{ team_name: name, team_short_name: name, category: 'collegiate' }])
      .select()
      .single();

    if (error) {
      log.push({ message: `Failed to create team "${name}": ${error.message}`, type: 'error' });
      continue;
    }

    log.push({ message: `Created team: ${name} (id: ${created.id})`, type: 'success' });
    teamMap.set(name, created.id);
    teams!.push({ id: created.id, team_name: name, team_short_name: name });
  }

  return teamMap;
}

// ─── Main Handler ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const { date } = await request.json();

  if (!date) {
    return NextResponse.json({ success: false, error: 'Missing date' }, { status: 400 });
  }

  // Read FM credentials from env
  const username = process.env.FILEMAKER_USERNAME;
  const password = process.env.FILEMAKER_PASSWORD;

  if (!username || !password) {
    return NextResponse.json(
      { success: false, error: 'FileMaker credentials not configured. Set FILEMAKER_USERNAME and FILEMAKER_PASSWORD in your environment.' },
      { status: 500 },
    );
  }

  const log: SyncLog[] = [];
  const result: SyncResult = { success: false, races: 0, teams: 0, entries: 0, results: 0, log };
  const allTeamNames = new Set<string>();
  let fmToken: string | null = null;

  try {
    const supabase = await createClient();

    // Verify admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    // Reset team cache
    _teamCache = null;

    log.push({ message: 'Authenticating with FileMaker...', type: 'info' });
    fmToken = await getFileMakerToken(username, password);
    log.push({ message: 'Authenticated', type: 'success' });

    const fmDate = toFMDate(date);
    log.push({ message: `Syncing ${date}...`, type: 'info' });

    // Fetch schedule blocks
    let scheduleRecords;
    try {
      scheduleRecords = await fetchScheduleRecords(fmToken, fmDate);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('"401"') || msg.includes('No records match')) {
        log.push({ message: `No schedule found for ${date}`, type: 'info' });
        result.success = true;
        return NextResponse.json(result);
      }
      throw err;
    }

    if (scheduleRecords.length === 0) {
      log.push({ message: `No schedule found for ${date}`, type: 'info' });
      result.success = true;
      return NextResponse.json(result);
    }

    log.push({ message: `Found ${scheduleRecords.length} schedule block(s)`, type: 'info' });

    // Upsert regatta
    const regattaName = `QRA Racing Series - ${formatDisplayDate(date)}`;
    const { data: existingRegatta } = await supabase
      .from('regattas')
      .select('*')
      .eq('date', date)
      .eq('venue', 'Lake Quinsigamond')
      .limit(1);

    let regatta;
    if (existingRegatta && existingRegatta.length > 0) {
      regatta = existingRegatta[0];
      log.push({ message: `Merging into existing regatta (id: ${regatta.id})`, type: 'info' });
    } else {
      const { data, error } = await supabase
        .from('regattas')
        .insert([{ name: regattaName, date, venue: 'Lake Quinsigamond', status: 'draft' }])
        .select()
        .single();
      if (error) {
        log.push({ message: `Failed to create regatta: ${error.message}`, type: 'error' });
        result.log = log;
        return NextResponse.json(result);
      }
      regatta = data;
      log.push({ message: `Created regatta: "${regattaName}" (id: ${regatta.id})`, type: 'success' });
    }

    // Sort order
    let globalSortOrder = 1;
    const { data: existingRaces } = await supabase
      .from('races')
      .select('sort_order')
      .eq('regatta_id', regatta.id)
      .order('sort_order', { ascending: false })
      .limit(1);
    if (existingRaces && existingRaces.length > 0 && existingRaces[0].sort_order) {
      globalSortOrder = existingRaces[0].sort_order + 1;
    }

    // Process each schedule block
    for (const sched of scheduleRecords) {
      const fd = sched.fieldData;
      const lkSchdId = fd['id'] ?? fd.lk_schd_id;
      const parentGender = fd.gender;

      if (!lkSchdId) continue;

      let laneRecords;
      try {
        laneRecords = await fetchLaneRecords(fmToken, String(lkSchdId));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('"401"') || msg.includes('No records match')) continue;
        throw err;
      }

      const breakLanes = laneRecords.filter(lane => isBreak(lane));
      const validLanes = laneRecords.filter(lane => !isBreak(lane));

      // Process breaks
      for (const lane of breakLanes) {
        const scheduledStart = toEasternTimestamp(date, lane.fieldData.racetime);
        const hostName = lane.fieldData.host?.trim();
        let hostTeamId: number | null = null;

        if (hostName && hostName.toLowerCase() !== 'break') {
          const teamMap = await ensureTeams(supabase, [hostName], log);
          hostTeamId = teamMap.get(hostName) ?? null;
          allTeamNames.add(hostName);
        }

        const breakName = lane.fieldData.event?.trim() || 'Break';
        await upsertRace(supabase, {
          regattaId: regatta.id,
          raceName: breakName.toLowerCase() === 'break' ? 'Break' : breakName,
          eventDate: date,
          scheduledStart,
          gender: null,
          boatClass: null,
          level: null,
          sortOrder: globalSortOrder++,
          hostTeamId,
          raceType: 'break',
        }, log);
        result.races++;
      }

      // Process races
      for (const lane of validLanes) {
        const teamNames = extractTeamNames(lane);
        const teamMap = await ensureTeams(supabase, teamNames, log);
        teamNames.forEach(n => allTeamNames.add(n));

        const eventCode = lane.fieldData.event?.trim() || '';
        const parsed = parseEventCode(eventCode);

        let raceName: string;
        let gender: 'M' | 'F' | null = null;
        let boatClass: string | null = null;
        let level: number | null = null;

        if (parsed) {
          raceName = parsed.displayName;
          gender = parsed.gender;
          boatClass = parsed.boatClass;
          level = parsed.level;
        } else {
          const host = lane.fieldData.host?.trim() || '';
          raceName = buildTBDRaceName(host, parentGender);
          if (parentGender?.toLowerCase().includes('women') || parentGender === 'F') gender = 'F';
          else if (parentGender?.toLowerCase().includes('men') || parentGender === 'M') gender = 'M';
        }

        const hostName = lane.fieldData.host?.trim();
        const hostTeamId = hostName ? teamMap.get(hostName) ?? null : null;
        const scheduledStart = toEasternTimestamp(date, lane.fieldData.racetime);

        const race = await upsertRace(supabase, {
          regattaId: regatta.id,
          raceName,
          eventDate: date,
          scheduledStart,
          gender,
          boatClass,
          level,
          sortOrder: globalSortOrder++,
          hostTeamId,
        }, log);

        if (!race) continue;
        result.races++;

        // Entries
        for (let i = 0; i <= 6; i++) {
          const entryName = (lane.fieldData[`entry${i}` as keyof typeof lane.fieldData] as string)?.trim();
          if (!entryName || entryName === '') continue;
          const teamId = teamMap.get(entryName);
          if (!teamId) continue;

          const created = await upsertEntry(supabase, { teamId, raceId: race.id, bowNumber: i }, log);
          if (created) result.entries++;
        }

        // Results
        const resultsSynced = await syncRaceResults(supabase, race.id, lane, log);
        if (resultsSynced > 0) result.results += resultsSynced;
      }
    }

    result.teams = allTeamNames.size;
    result.success = true;
    log.push({ message: `Done — ${result.races} race(s), ${result.entries} entries, ${result.results} result(s)`, type: 'success' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.push({ message: `Error: ${message}`, type: 'error' });
    result.success = false;
  } finally {
    if (fmToken) await releaseFileMakerToken(fmToken);
  }

  return NextResponse.json(result);
}

// ─── Upsert Helpers ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function upsertRace(supabase: any, raceData: {
  regattaId: number; raceName: string; eventDate: string;
  scheduledStart: string | null; gender: 'M' | 'F' | null;
  boatClass: string | null; level: number | null;
  sortOrder: number; hostTeamId: number | null; raceType?: string;
}, log: SyncLog[]) {
  if (raceData.scheduledStart) {
    const { data: existing } = await supabase
      .from('races').select('*')
      .eq('regatta_id', raceData.regattaId)
      .eq('scheduled_start', raceData.scheduledStart)
      .limit(1);

    if (existing && existing.length > 0) {
      const updates: Record<string, unknown> = {};
      if (raceData.raceName && !raceData.raceName.includes('TBD')) {
        updates.race_name = raceData.raceName;
      } else if (!existing[0].race_name) {
        updates.race_name = raceData.raceName;
      }
      if (raceData.gender) updates.gender = raceData.gender;
      if (raceData.boatClass) updates.boat_class = raceData.boatClass;
      if (raceData.level) updates.level = raceData.level;
      if (raceData.hostTeamId) updates.host_team_id = raceData.hostTeamId;
      if (raceData.raceType) updates.race_type = raceData.raceType;

      if (Object.keys(updates).length > 0) {
        await supabase.from('races').update(updates).eq('id', existing[0].id);
      }
      return existing[0];
    }
  }

  const { data, error } = await supabase
    .from('races')
    .insert([{
      regatta_id: raceData.regattaId,
      race_name: raceData.raceName,
      event_date: raceData.eventDate,
      scheduled_start: raceData.scheduledStart,
      race_status: 'scheduled',
      race_type: raceData.raceType || 'sprint',
      gender: raceData.gender,
      boat_class: raceData.boatClass,
      level: raceData.level,
      sort_order: raceData.sortOrder,
      host_team_id: raceData.hostTeamId,
    }])
    .select()
    .single();

  if (error) {
    log.push({ message: `  Failed to create race "${raceData.raceName}": ${error.message}`, type: 'error' });
    return null;
  }
  return data;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function upsertEntry(supabase: any, entryData: {
  teamId: number; raceId: number; bowNumber: number;
}, log: SyncLog[]): Promise<boolean> {
  const { data: existing } = await supabase
    .from('entries').select('id')
    .eq('team_id', entryData.teamId)
    .eq('race_id', entryData.raceId)
    .limit(1);

  if (existing && existing.length > 0) {
    await supabase.from('entries').update({ bow_number: entryData.bowNumber }).eq('id', existing[0].id);
    return false;
  }

  const { error } = await supabase
    .from('entries')
    .insert([{ team_id: entryData.teamId, race_id: entryData.raceId, bow_number: entryData.bowNumber, boat_status: 'entered' }]);

  if (error) {
    log.push({ message: `  Failed to create entry: ${error.message}`, type: 'error' });
    return false;
  }
  return true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function syncRaceResults(supabase: any, raceId: number, lane: FMLaneRecord, log: SyncLog[]): Promise<number> {
  let synced = 0;
  const fd = lane.fieldData;

  const { data: entries } = await supabase
    .from('entries').select('id, bow_number, team_id').eq('race_id', raceId);

  if (!entries || entries.length === 0) return 0;

  const entryByBow = new Map<number, { id: number; team_id: number }>();
  for (const e of entries) entryByBow.set(e.bow_number, { id: e.id, team_id: e.team_id });

  const laneResults: { bowNumber: number; elapsedMs: number }[] = [];
  for (let i = 0; i <= 6; i++) {
    const timeStr = fd[`time${i}` as keyof typeof fd] as string;
    const elapsedMs = parseRaceTime(timeStr);
    if (elapsedMs !== null && entryByBow.has(i)) {
      laneResults.push({ bowNumber: i, elapsedMs });
    }
  }

  laneResults.sort((a, b) => a.elapsedMs - b.elapsedMs);
  const winnerMs = laneResults.length > 0 ? laneResults[0].elapsedMs : null;

  for (const { bowNumber, elapsedMs } of laneResults) {
    const entry = entryByBow.get(bowNumber);
    if (!entry) continue;

    const marginMs = winnerMs !== null && elapsedMs !== winnerMs ? elapsedMs - winnerMs : null;

    const { data: existing } = await supabase
      .from('race_results').select('id, elapsed_ms').eq('entry_id', entry.id).limit(1);

    if (existing && existing.length > 0) {
      if (existing[0].elapsed_ms !== elapsedMs) {
        await supabase.from('race_results').update({
          elapsed_ms: elapsedMs, margin_ms: marginMs, status: 'finished',
          last_computed_at: new Date().toISOString(),
        }).eq('id', existing[0].id);
        synced++;
      }
    } else {
      const { error } = await supabase.from('race_results').insert([{
        entry_id: entry.id, elapsed_ms: elapsedMs, margin_ms: marginMs,
        status: 'finished', last_computed_at: new Date().toISOString(),
      }]);
      if (error) log.push({ message: `    Failed result for bow ${bowNumber}: ${error.message}`, type: 'error' });
      else synced++;
    }
  }

  if (laneResults.length > 0) {
    await supabase.from('races').update({
      race_status: 'finished', last_synced_at: new Date().toISOString(),
    }).eq('id', raceId);
  }

  return synced;
}
