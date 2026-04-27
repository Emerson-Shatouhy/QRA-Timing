import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../utils/supabase/server';
import {
  getFileMakerToken,
  releaseFileMakerToken,
  fetchScheduleRecords,
  fetchLaneRecords,
  type FMLaneRecord,
} from '../../../../../utils/filemaker/client';
import { parseEventCode, buildTBDRaceName } from '../../../../../utils/filemaker/parseEventCode';

// ─── Types ──────────────────────────────────────────────────────────────────

interface SyncRequest {
  username: string;
  password: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

interface SyncLog {
  message: string;
  type: 'info' | 'warn' | 'error' | 'success';
}

interface SyncResult {
  success: boolean;
  regattas: number;
  races: number;
  teams: number;
  entries: number;
  results: number;
  log: SyncLog[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Formats a date as MM/DD/YYYY for FileMaker queries. */
function toFMDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${m}/${d}/${y}`;
}

/** Generates all dates in a range (inclusive) as YYYY-MM-DD strings. */
function dateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cur = new Date(start + 'T00:00:00');
  const last = new Date(end + 'T00:00:00');
  while (cur <= last) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

/**
 * Converts a FileMaker local time (e.g. "9:00 AM" or "10:30") and a date
 * into an ISO 8601 timestamptz string in Eastern Time.
 */
function toEasternTimestamp(dateISO: string, fmTime: string): string | null {
  if (!fmTime || fmTime.trim() === '') return null;

  let hours = 0;
  let minutes = 0;

  // Try parsing "HH:MM AM/PM" format
  const ampmMatch = fmTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (ampmMatch) {
    hours = parseInt(ampmMatch[1], 10);
    minutes = parseInt(ampmMatch[2], 10);
    const period = ampmMatch[3].toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
  } else {
    // Try 24-hour format "HH:MM"
    const milMatch = fmTime.match(/(\d{1,2}):(\d{2})/);
    if (milMatch) {
      hours = parseInt(milMatch[1], 10);
      minutes = parseInt(milMatch[2], 10);
    } else {
      return null;
    }
  }

  // Determine EDT (-04:00) vs EST (-05:00) based on month
  // Simplified: April–October = EDT, otherwise EST
  const month = parseInt(dateISO.split('-')[1], 10);
  const offset = month >= 3 && month <= 11 ? '-04:00' : '-05:00';

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  return `${dateISO}T${hh}:${mm}:00${offset}`;
}

/**
 * Checks if a lane record is a "break" (not an actual race).
 */
function isBreak(lane: FMLaneRecord): boolean {
  const rt = lane.fieldData.racetime?.trim().toLowerCase() || '';
  const ev = lane.fieldData.event?.trim().toLowerCase() || '';
  const host = lane.fieldData.host?.trim().toLowerCase() || '';
  return rt === 'break' || ev === 'break' || rt.includes('break') || host === 'break';
}

/**
 * Checks if a lane record has any actual entries (non-empty entry fields).
 */
function hasEntries(lane: FMLaneRecord): boolean {
  const fd = lane.fieldData;
  for (let i = 0; i <= 6; i++) {
    const name = (fd[`entry${i}` as keyof typeof fd] as string)?.trim();
    if (name && name !== '') return true;
  }
  return false;
}

/**
 * Collects unique, non-empty team names from a lane record's entry fields + host.
 */
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

// ─── Main Sync Handler ──────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const body: SyncRequest = await request.json();
  const { username, password, startDate, endDate } = body;

  if (!username || !password || !startDate || !endDate) {
    return NextResponse.json(
      { success: false, error: 'Missing required fields' },
      { status: 400 },
    );
  }

  const log: SyncLog[] = [];
  const result: SyncResult = {
    success: false,
    regattas: 0,
    races: 0,
    teams: 0,
    entries: 0,
    results: 0,
    log,
  };

  // Track all unique teams created/found across entire sync
  const allTeamNames = new Set<string>();
  let fmToken: string | null = null;

  try {
    // ── Step 0: Authenticate with Supabase & FileMaker ──────────────────
    const supabase = await createClient();

    // Verify the user is an admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    invalidateTeamCache(); // Fresh team list for each sync run
    log.push({ message: 'Authenticating with FileMaker...', type: 'info' });
    fmToken = await getFileMakerToken(username, password);
    log.push({ message: 'FileMaker authentication successful', type: 'success' });

    // ── Step 1: Iterate over each date in range ─────────────────────────
    const dates = dateRange(startDate, endDate);
    log.push({ message: `Syncing ${dates.length} date(s): ${startDate} to ${endDate}`, type: 'info' });

    for (const dateISO of dates) {
      const fmDate = toFMDate(dateISO);
      log.push({ message: `\nProcessing ${dateISO}...`, type: 'info' });

      // ── Fetch schedule blocks for this date ────────────────────────
      let scheduleRecords;
      try {
        scheduleRecords = await fetchScheduleRecords(fmToken, fmDate);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        // FM error 401 = "No records match" — that's fine, just skip
        if (msg.includes('"401"') || msg.includes('No records match')) {
          log.push({ message: `No schedule found for ${dateISO}, skipping`, type: 'info' });
          continue;
        }
        throw err;
      }

      if (scheduleRecords.length === 0) {
        log.push({ message: `No schedule found for ${dateISO}, skipping`, type: 'info' });
        continue;
      }
      log.push({ message: `Found ${scheduleRecords.length} schedule block(s)`, type: 'info' });

      // ── Upsert regatta for this date ───────────────────────────────
      const regattaName = `QRA Racing Series - ${formatDisplayDate(dateISO)}`;
      const regatta = await upsertRegatta(supabase, regattaName, dateISO, log);
      if (!regatta) continue;
      result.regattas++;

      // ── Collect all lane records across schedule blocks ────────────
      let globalSortOrder = 1;

      // First, check existing max sort_order for this regatta
      const { data: existingRaces } = await supabase
        .from('races')
        .select('sort_order')
        .eq('regatta_id', regatta.id)
        .order('sort_order', { ascending: false })
        .limit(1);
      if (existingRaces && existingRaces.length > 0 && existingRaces[0].sort_order) {
        globalSortOrder = existingRaces[0].sort_order + 1;
      }

      for (const sched of scheduleRecords) {
        const fd = sched.fieldData;
        // The schedule ID field is named "id" on the qra_lk_schedule layout
        const lkSchdId = fd['id'] ?? fd.lk_schd_id;
        const parentGender = fd.gender; // e.g., "Women", "Men", "F", "M"
        const blockName = fd.racename;
        log.push({ message: `  Schedule block: ${blockName} (id: ${lkSchdId})`, type: 'info' });

        if (!lkSchdId) {
          log.push({ message: `  Skipping — no schedule ID found`, type: 'warn' });
          continue;
        }

        let laneRecords;
        try {
          laneRecords = await fetchLaneRecords(fmToken, String(lkSchdId), toFMDate(dateISO));
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes('"401"') || msg.includes('No records match')) {
            log.push({ message: `  No lane records for this block, skipping`, type: 'info' });
            continue;
          }
          throw err;
        }

        // Separate breaks from actual races
        const breakLanes = laneRecords.filter(lane => isBreak(lane));
        const validLanes = laneRecords.filter(lane => !isBreak(lane));
        log.push({
          message: `  Found ${validLanes.length} race(s)${breakLanes.length > 0 ? ` and ${breakLanes.length} break(s)` : ''}`,
          type: 'info',
        });

        // ── Create break records ──────────────────────────────────
        for (const lane of breakLanes) {
          const scheduledStart = toEasternTimestamp(dateISO, lane.fieldData.racetime);
          const hostName = lane.fieldData.host?.trim();
          let hostTeamId: number | null = null;

          if (hostName && hostName.toLowerCase() !== 'break') {
            const teamMap = await ensureTeams(supabase, [hostName], log);
            hostTeamId = teamMap.get(hostName) ?? null;
            allTeamNames.add(hostName);
          }

          const breakName = lane.fieldData.event?.trim() || 'Break';
          const breakRace = await upsertRace(supabase, {
            regattaId: regatta.id,
            raceName: breakName.toLowerCase() === 'break' ? 'Break' : breakName,
            eventDate: dateISO,
            scheduledStart,
            gender: null,
            boatClass: null,
            level: null,
            sortOrder: globalSortOrder++,
            hostTeamId,
            raceType: 'break',
          }, log);

          if (breakRace) result.races++;
        }

        for (const lane of validLanes) {
          // ── Ensure teams exist ─────────────────────────────────
          const teamNames = extractTeamNames(lane);
          const teamMap = await ensureTeams(supabase, teamNames, log);
          teamNames.forEach(n => allTeamNames.add(n));

          // ── Parse event code ───────────────────────────────────
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
            // No event code yet — build a TBD name from the host
            const host = lane.fieldData.host?.trim() || '';
            raceName = buildTBDRaceName(host, parentGender);
            // Infer gender from parent schedule record
            if (parentGender?.toLowerCase().includes('women') || parentGender === 'F') {
              gender = 'F';
            } else if (parentGender?.toLowerCase().includes('men') || parentGender === 'M') {
              gender = 'M';
            }
          }

          // ── Resolve host team ──────────────────────────────────
          const hostName = lane.fieldData.host?.trim();
          const hostTeamId = hostName ? teamMap.get(hostName) ?? null : null;

          // ── Build scheduled_start ──────────────────────────────
          const scheduledStart = toEasternTimestamp(dateISO, lane.fieldData.racetime);

          // ── Upsert race ────────────────────────────────────────
          const race = await upsertRace(supabase, {
            regattaId: regatta.id,
            raceName,
            eventDate: dateISO,
            scheduledStart,
            gender,
            boatClass,
            level,
            sortOrder: globalSortOrder++,
            hostTeamId: hostTeamId,
          }, log);

          if (!race) continue;
          result.races++;

          // ── Upsert entries (lane assignments) ──────────────────
          for (let i = 0; i <= 6; i++) {
            const entryName = (lane.fieldData[`entry${i}` as keyof typeof lane.fieldData] as string)?.trim();
            if (!entryName || entryName === '') continue;

            const teamId = teamMap.get(entryName);
            if (!teamId) continue;

            const entryCreated = await upsertEntry(supabase, {
              teamId,
              raceId: race.id,
              bowNumber: i,
            }, log);
            if (entryCreated) result.entries++;
          }

          // ── Sync race results (times) ─────────────────────────
          const resultsSynced = await syncRaceResults(supabase, race.id, lane, log);
          if (resultsSynced > 0) {
            result.results += resultsSynced;
            log.push({ message: `    Synced ${resultsSynced} result(s)`, type: 'success' });
          }
        }
      }
    }

    result.teams = allTeamNames.size;
    result.success = true;
    log.push({ message: '\nSync completed successfully!', type: 'success' });
    log.push({
      message: `Summary: ${result.regattas} regatta(s), ${result.races} race(s), ${result.teams} team(s), ${result.entries} new entries, ${result.results} result(s)`,
      type: 'success',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.push({ message: `Error: ${message}`, type: 'error' });
    result.success = false;
  } finally {
    if (fmToken) {
      await releaseFileMakerToken(fmToken);
    }
  }

  return NextResponse.json(result);
}

// ─── Upsert Helpers ─────────────────────────────────────────────────────────

async function upsertRegatta(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  name: string,
  dateISO: string,
  log: SyncLog[],
) {
  // Check if a regatta already exists for this date
  const { data: existing } = await supabase
    .from('regattas')
    .select('*')
    .eq('date', dateISO)
    .eq('venue', 'Lake Quinsigamond')
    .limit(1);

  if (existing && existing.length > 0) {
    log.push({ message: `Regatta already exists for ${dateISO} (id: ${existing[0].id}), merging`, type: 'info' });
    return existing[0];
  }

  const { data, error } = await supabase
    .from('regattas')
    .insert([{
      name,
      date: dateISO,
      venue: 'Lake Quinsigamond',
      status: 'draft',
    }])
    .select()
    .single();

  if (error) {
    log.push({ message: `Failed to create regatta: ${error.message}`, type: 'error' });
    return null;
  }

  log.push({ message: `Created regatta: "${name}" (id: ${data.id})`, type: 'success' });
  return data;
}

/**
 * Loads all teams from Supabase once and caches them for the duration of the sync.
 * Returns a flat array of { id, team_name, team_short_name }.
 */
let _teamCache: { id: number; team_name: string; team_short_name: string | null }[] | null = null;

async function loadTeamCache(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
): Promise<typeof _teamCache> {
  if (_teamCache) return _teamCache;
  const { data } = await supabase
    .from('teams')
    .select('id, team_name, team_short_name');
  _teamCache = data || [];
  return _teamCache;
}

function invalidateTeamCache() {
  _teamCache = null;
}

/**
 * Finds the best matching existing team for a given FileMaker name.
 *
 * Match priority:
 *   1. Exact match on team_name
 *   2. Exact match on team_short_name
 *   3. Case-insensitive exact match on either
 *   4. One name contains the other (e.g., "Bryant" matches "Bryant University")
 *      — picks the shortest containing match to avoid false positives
 */
function findBestTeamMatch(
  fmName: string,
  teams: { id: number; team_name: string; team_short_name: string | null }[],
): { id: number; team_name: string } | null {
  const lower = fmName.toLowerCase().trim();

  // 1. Exact match on team_name
  const exactName = teams.find(t => t.team_name === fmName);
  if (exactName) return exactName;

  // 2. Exact match on team_short_name
  const exactShort = teams.find(t => t.team_short_name === fmName);
  if (exactShort) return exactShort;

  // 3. Case-insensitive exact match
  const ciName = teams.find(t => t.team_name.toLowerCase() === lower);
  if (ciName) return ciName;
  const ciShort = teams.find(t => t.team_short_name?.toLowerCase() === lower);
  if (ciShort) return ciShort;

  // 4. Containment match — "Bryant" ↔ "Bryant University"
  //    Pick the match with the shortest team_name to avoid false positives
  const containMatches = teams.filter(t => {
    const tn = t.team_name.toLowerCase();
    const ts = (t.team_short_name || '').toLowerCase();
    return tn.includes(lower) || lower.includes(tn) ||
           (ts && (ts.includes(lower) || lower.includes(ts)));
  });

  if (containMatches.length === 1) {
    return containMatches[0];
  }
  if (containMatches.length > 1) {
    // Pick the closest length match to avoid "Clark" matching "Clarke" and "Clark University"
    containMatches.sort((a, b) => {
      const aDiff = Math.abs(a.team_name.length - fmName.length);
      const bDiff = Math.abs(b.team_name.length - fmName.length);
      return aDiff - bDiff;
    });
    return containMatches[0];
  }

  return null;
}

async function ensureTeams(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  teamNames: string[],
  log: SyncLog[],
): Promise<Map<string, number>> {
  const teamMap = new Map<string, number>();
  const teams = await loadTeamCache(supabase);

  for (const name of teamNames) {
    // Try to find a matching existing team
    const match = findBestTeamMatch(name, teams!);

    if (match) {
      teamMap.set(name, match.id);
      if (match.team_name !== name) {
        log.push({ message: `  Matched "${name}" → existing team "${match.team_name}" (id: ${match.id})`, type: 'info' });
      }
      continue;
    }

    // No match found — create a new team
    const { data: created, error } = await supabase
      .from('teams')
      .insert([{
        team_name: name,
        team_short_name: name,
        category: 'collegiate',
      }])
      .select()
      .single();

    if (error) {
      log.push({ message: `Failed to create team "${name}": ${error.message}`, type: 'error' });
      continue;
    }

    log.push({ message: `Created team: ${name} (id: ${created.id})`, type: 'success' });
    teamMap.set(name, created.id);
    // Add to cache so subsequent lookups within this sync find it
    teams!.push({ id: created.id, team_name: name, team_short_name: name });
  }

  return teamMap;
}

async function upsertRace(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  raceData: {
    regattaId: number;
    raceName: string;
    eventDate: string;
    scheduledStart: string | null;
    gender: 'M' | 'F' | null;
    boatClass: string | null;
    level: number | null;
    sortOrder: number;
    hostTeamId: number | null;
    raceType?: string;
  },
  log: SyncLog[],
) {
  // Try to find an existing race by matching regatta + scheduled_start
  if (raceData.scheduledStart) {
    const { data: existing } = await supabase
      .from('races')
      .select('*')
      .eq('regatta_id', raceData.regattaId)
      .eq('scheduled_start', raceData.scheduledStart)
      .limit(1);

    if (existing && existing.length > 0) {
      // Update the existing race with new data (merge)
      const updates: Record<string, unknown> = {};
      // Don't overwrite a real name with a TBD name
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
        log.push({ message: `  Updated race: ${raceData.raceName} (id: ${existing[0].id})`, type: 'info' });
      } else {
        log.push({ message: `  Race unchanged: ${existing[0].race_name} (id: ${existing[0].id})`, type: 'info' });
      }
      return existing[0];
    }
  }

  // Create new race
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

  log.push({ message: `  Created race: ${raceData.raceName} (id: ${data.id})`, type: 'success' });
  return data;
}

async function upsertEntry(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  entryData: {
    teamId: number;
    raceId: number;
    bowNumber: number;
  },
  log: SyncLog[],
): Promise<boolean> {
  // Dedup by bow_number + race_id — one team per lane position.
  // If a team changed (FM updated the entry), update the team_id.
  const { data: existing } = await supabase
    .from('entries')
    .select('id, team_id')
    .eq('bow_number', entryData.bowNumber)
    .eq('race_id', entryData.raceId)
    .limit(1);

  if (existing && existing.length > 0) {
    if (existing[0].team_id !== entryData.teamId) {
      await supabase
        .from('entries')
        .update({ team_id: entryData.teamId })
        .eq('id', existing[0].id);
    }
    return false;
  }

  const { error } = await supabase
    .from('entries')
    .insert([{
      team_id: entryData.teamId,
      race_id: entryData.raceId,
      bow_number: entryData.bowNumber,
      boat_status: 'entered',
    }]);

  if (error) {
    log.push({ message: `  Failed to create entry: ${error.message}`, type: 'error' });
    return false;
  }

  return true;
}

// ─── Race Results ──────────────────────────────────────────────────────────

/**
 * Parses a FileMaker time string like "7:14.3" (= 7min 14.3sec) or "34.5" (= 34.5sec)
 * into elapsed milliseconds.
 */
function parseRaceTime(fmTime: string): number | null {
  if (!fmTime || fmTime.trim() === '') return null;
  const t = fmTime.trim();

  // Format: "M:SS.d" (minutes:seconds.tenths)
  const minMatch = t.match(/^(\d+):(\d+(?:\.\d+)?)$/);
  if (minMatch) {
    const mins = parseInt(minMatch[1], 10);
    const secs = parseFloat(minMatch[2]);
    return Math.round((mins * 60 + secs) * 1000);
  }

  // Format: "SS.d" (seconds only)
  const secMatch = t.match(/^(\d+(?:\.\d+)?)$/);
  if (secMatch) {
    return Math.round(parseFloat(secMatch[1]) * 1000);
  }

  return null;
}

/**
 * Syncs race results from a lane record into the race_results table.
 * Requires entries to already exist so we can match entry_id.
 */
async function syncRaceResults(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  raceId: number,
  lane: FMLaneRecord,
  log: SyncLog[],
): Promise<number> {
  let synced = 0;
  const fd = lane.fieldData;

  // First, get all entries for this race to map bow_number → entry_id
  const { data: entries } = await supabase
    .from('entries')
    .select('id, bow_number, team_id')
    .eq('race_id', raceId);

  if (!entries || entries.length === 0) return 0;

  const entryByBow = new Map<number, { id: number; team_id: number }>();
  for (const e of entries) {
    entryByBow.set(e.bow_number, { id: e.id, team_id: e.team_id });
  }

  let hasAnyResult = false;
  let winnerMs: number | null = null;

  // Collect results and find the winner first
  const laneResults: { bowNumber: number; elapsedMs: number }[] = [];
  for (let i = 0; i <= 6; i++) {
    const timeStr = fd[`time${i}` as keyof typeof fd] as string;
    const elapsedMs = parseRaceTime(timeStr);
    if (elapsedMs !== null && entryByBow.has(i)) {
      laneResults.push({ bowNumber: i, elapsedMs });
    }
  }

  // Sort to find winner
  laneResults.sort((a, b) => a.elapsedMs - b.elapsedMs);
  if (laneResults.length > 0) {
    winnerMs = laneResults[0].elapsedMs;
    hasAnyResult = true;
  }

  // Upsert each result
  for (const { bowNumber, elapsedMs } of laneResults) {
    const entry = entryByBow.get(bowNumber);
    if (!entry) continue;

    const marginMs = winnerMs !== null && elapsedMs !== winnerMs
      ? elapsedMs - winnerMs
      : null;

    // Check if result already exists
    const { data: existing } = await supabase
      .from('race_results')
      .select('id, elapsed_ms')
      .eq('entry_id', entry.id)
      .limit(1);

    if (existing && existing.length > 0) {
      // Update if time changed
      if (existing[0].elapsed_ms !== elapsedMs) {
        await supabase
          .from('race_results')
          .update({
            elapsed_ms: elapsedMs,
            margin_ms: marginMs,
            status: 'finished',
            last_computed_at: new Date().toISOString(),
          })
          .eq('id', existing[0].id);
        synced++;
      }
    } else {
      // Create new result
      const { error } = await supabase
        .from('race_results')
        .insert([{
          entry_id: entry.id,
          elapsed_ms: elapsedMs,
          margin_ms: marginMs,
          status: 'finished',
          last_computed_at: new Date().toISOString(),
        }]);

      if (error) {
        log.push({ message: `    Failed to create result for bow ${bowNumber}: ${error.message}`, type: 'error' });
      } else {
        synced++;
      }
    }
  }

  // Update race status to finished if we have results
  if (hasAnyResult) {
    await supabase
      .from('races')
      .update({
        race_status: 'finished',
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', raceId);
  }

  return synced;
}

// ─── Display Helpers ────────────────────────────────────────────────────────

function formatDisplayDate(dateISO: string): string {
  const d = new Date(dateISO + 'T12:00:00');
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}
