/**
 * FileMaker Data API client for QRA_Online database.
 *
 * Handles authentication (session tokens), fetching schedule records,
 * and fetching lane/race data for a given schedule block.
 */

const FM_BASE = 'https://cloud.qra.org/fmi/data/v1/databases/QRA_Online';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FMScheduleRecord {
  /** FileMaker internal record ID */
  recordId: string;
  fieldData: {
    racename: string;
    localschool: string;
    competitors: string;
    events: string;
    gender: string;
    time_start: string;
    time_end: string;
    lk_schd_id: string;
    date_start: string;
    [key: string]: unknown;
  };
}

export interface FMLaneRecord {
  recordId: string;
  fieldData: {
    racetime: string;
    event: string;
    host: string;
    entry0: string;
    entry1: string;
    entry2: string;
    entry3: string;
    entry4: string;
    entry5: string;
    entry6: string;
    time0: string;
    time1: string;
    time2: string;
    time3: string;
    time4: string;
    time5: string;
    time6: string;
    order0: string;
    order1: string;
    order2: string;
    order3: string;
    order4: string;
    order5: string;
    order6: string;
    lk_schd_id: string;
    [key: string]: unknown;
  };
}

// ─── Authentication ─────────────────────────────────────────────────────────

/**
 * Obtains a session token from the FileMaker Data API.
 */
export async function getFileMakerToken(
  username: string,
  password: string,
): Promise<string> {
  const res = await fetch(`${FM_BASE}/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
    },
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`FileMaker auth failed (${res.status}): ${body}`);
  }

  const json = await res.json();
  return json.response.token as string;
}

/**
 * Releases a FileMaker session token.
 */
export async function releaseFileMakerToken(token: string): Promise<void> {
  try {
    await fetch(`${FM_BASE}/sessions/${token}`, { method: 'DELETE' });
  } catch {
    // Best-effort; token will expire on its own
  }
}

// ─── Layout Metadata ────────────────────────────────────────────────────────

/**
 * Fetches the field names available on a given FileMaker layout.
 * Useful for debugging "Field is missing" errors (FM error 102).
 */
export async function getLayoutMetadata(
  token: string,
  layoutName: string,
): Promise<string[]> {
  const res = await fetch(`${FM_BASE}/layouts/${layoutName}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to get layout metadata (${res.status}): ${body}`);
  }

  const json = await res.json();
  const fieldMetaData = json.response?.fieldMetaData || [];
  return fieldMetaData.map((f: { name: string }) => f.name);
}

// ─── Data Fetching ──────────────────────────────────────────────────────────

/**
 * Fetches schedule records for a given date (MM/DD/YYYY format).
 */
export async function fetchScheduleRecords(
  token: string,
  dateStr: string,
): Promise<FMScheduleRecord[]> {
  const res = await fetch(
    `${FM_BASE}/layouts/qra_lk_schedule/_find`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: [{ racedate: dateStr }],
      }),
    },
  );

  if (!res.ok) {
    // 401 = no records found, which is fine
    if (res.status === 401) return [];
    const body = await res.text();
    throw new Error(`Failed to fetch schedule (${res.status}): ${body}`);
  }

  const json = await res.json();

  // FileMaker returns error code "401" when no records found
  if (json.messages?.[0]?.code === '401') return [];

  return (json.response?.data || []) as FMScheduleRecord[];
}

/**
 * Fetches lane/race records for a given schedule block and date.
 * The date filter (MM/DD/YYYY) is required because FM reuses lk_schd_id
 * across multiple years for the same recurring annual event.
 */
export async function fetchLaneRecords(
  token: string,
  lkSchdId: string,
  dateStr: string,
): Promise<FMLaneRecord[]> {
  const res = await fetch(
    `${FM_BASE}/layouts/web_lk_lanes/_find`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: [{ lk_schd_id: lkSchdId, racedate: dateStr }],
      }),
    },
  );

  if (!res.ok) {
    if (res.status === 401) return [];
    const body = await res.text();
    throw new Error(`Failed to fetch lanes for ${lkSchdId} (${res.status}): ${body}`);
  }

  const json = await res.json();
  if (json.messages?.[0]?.code === '401') return [];

  return (json.response?.data || []) as FMLaneRecord[];
}
