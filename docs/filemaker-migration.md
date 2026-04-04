# FileMaker to Supabase Migration Guide

## Overview

This document describes the process for migrating race data from the QRA FileMaker Server database (`QRA_Online` at `https://cloud.qra.org`) to the Supabase-backed Regatta Clock application.

## Data Model Mapping

### Concept: 1 Regatta Per Race Day

Each race day on Lake Quinsigamond becomes a single **regatta** in Supabase. For example, all races scheduled on April 4, 2026 belong to one regatta named "QRA Racing Series - April 4, 2026". Individual time slots from FileMaker become separate **races** within that regatta.

### FileMaker Source Tables

| FileMaker Layout | Purpose | Key Fields |
|---|---|---|
| `qra_lk_schedule` | Day-level schedule info | `racename`, `localschool`, `competitors`, `events`, `gender`, `time_start`, `time_end`, `lk_schd_id` |
| `web_lk_lanes` | Individual race time slots & lane assignments | `racetime`, `event`, `host`, `entry0`–`entry6`, `time0`–`time6`, `order0`–`order6`, `lk_schd_id` |

The `lk_schd_id` field links lanes back to their parent schedule record.

### Supabase Target Tables

| Table | Maps From | Notes |
|---|---|---|
| `regattas` | One per unique race date | `name`, `date`, `venue`, `status` |
| `teams` | Unique school names across all entries | `team_name`, `team_short_name`, `category` |
| `races` | One per `web_lk_lanes` record (excluding breaks) | `race_name`, `scheduled_start`, `gender`, `boat_class`, `level`, `sort_order` |
| `entries` | Lane assignments (`entry0`–`entry6`) | `team_id`, `race_id`, `bow_number`, `boat_status` |

## Event Code Format

Event codes from FileMaker follow the pattern: `[Gender][Level][Boat]`

| Code | Gender | Level | Boat | Full Name |
|---|---|---|---|---|
| `MV8` | M | 1 | 8+ | Men's Varsity 8+ |
| `M2V8` | M | 2 | 8+ | Men's 2nd Varsity 8+ |
| `M3V8` | M | 3 | 8+ | Men's 3rd Varsity 8+ |
| `M4V8` | M | 4 | 8+ | Men's 4th Varsity 8+ |
| `WV8` | F | 1 | 8+ | Women's Varsity 8+ |
| `W2V8` | F | 2 | 8+ | Women's 2nd Varsity 8+ |
| `W3V8` | F | 3 | 8+ | Women's 3rd Varsity 8+ |

**Key:** The numeric prefix (2, 3, 4) indicates the varsity level, not JV/Novice. `M2V8` = Men's 2nd Varsity 8+.

When the `event` field is empty or "TBD", the race is named based on the host and marked as TBD (e.g., "WPI Race (TBD)"). Gender context is pulled from the parent `qra_lk_schedule` record via `lk_schd_id`.

## FileMaker Data API Access

### Authentication

```
POST https://cloud.qra.org/fmi/data/v1/databases/QRA_Online/sessions
```

Returns a bearer token for subsequent requests. Tokens expire after ~15 minutes of inactivity.

### Fetching Schedule Records

```
POST https://cloud.qra.org/fmi/data/v1/databases/QRA_Online/layouts/qra_lk_schedule/_find
Authorization: Bearer <token>
Content-Type: application/json

{
  "query": [{ "racedate": "04/04/2026" }]
}
```

### Fetching Lane/Race Data

```
POST https://cloud.qra.org/fmi/data/v1/databases/QRA_Online/layouts/web_lk_lanes/_find
Authorization: Bearer <token>
Content-Type: application/json

{
  "query": [{ "lk_schd_id": "2482" }]
}
```

Use `lk_schd_id` values from the schedule records to pull all lanes for a given schedule block.

## Migration Steps

### 1. Fetch Schedule Records for Target Date

Query `qra_lk_schedule` for the target date. This returns one record per event block (e.g., "Jennifer McLaughlin Cup - Women", "Class of 2003 Cup - Men"). Note the `lk_schd_id` for each.

### 2. Fetch Lane Data for Each Schedule Block

Query `web_lk_lanes` using each `lk_schd_id`. Each record represents a 10-minute time slot. Records with `racetime = "Break"` are skipped.

### 3. Create Regatta

Insert one regatta for the race day:

```sql
INSERT INTO regattas (name, date, venue, status)
VALUES ('QRA Racing Series - April 4, 2026', '2026-04-04', 'Lake Quinsigamond', 'draft');
```

### 4. Create Teams

Collect all unique school names from `entry0`–`entry6` fields and the `host` field. Insert with `ON CONFLICT DO NOTHING` to avoid duplicates:

```sql
INSERT INTO teams (team_name, team_short_name, category)
VALUES ('WPI', 'WPI', 'collegiate')
ON CONFLICT DO NOTHING;
```

### 5. Create Races

For each non-break lane record, insert a race. The `sort_order` should increment sequentially (1, 2, 3...) across all races in the regatta, reflecting the actual race schedule order.

```sql
INSERT INTO races (
  race_name, event_date, scheduled_start, race_status, race_type,
  regatta_id, gender, boat_class, level, sort_order, host_team_id
) VALUES (
  'Men''s Varsity 8+', '2026-04-04',
  '2026-04-04T10:00:00-04:00'::timestamptz,
  'scheduled', 'sprint', <regatta_id>,
  'M', '8+', 1, 6, <host_team_id>
);
```

**Timezone:** All times use Eastern Time (`-04:00` for EDT, `-05:00` for EST). FileMaker stores local times without timezone info.

### 6. Create Entries

For each lane assignment (`entry0`–`entry6`), create an entry linking the team to the race. The index (0–6) becomes the `bow_number`:

```sql
INSERT INTO entries (team_id, race_id, bow_number, boat_status)
VALUES (<team_id>, <race_id>, 0, 'entered');
```

## Proof of Concept: April 4, 2026

The first successful migration covered April 4, 2026:

- **1 regatta**: "QRA Racing Series - April 4, 2026"
- **6 teams**: Clark, Colby, Hamilton, Vassar, WPI, Wesleyan
- **14 races** (sort_order 1–14):
  - Races 1–5: WPI Women's TBD (Jennifer McLaughlin Cup), 9:00–9:40 AM
  - Races 6–9: WPI Men's 8+ (Class of 2003 Cup), 10:00–10:30 AM
    - Men's Varsity 8+ (5 entries)
    - Men's 2nd Varsity 8+ (4 entries)
    - Men's 3rd Varsity 8+ (3 entries)
    - Men's 4th Varsity 8+ (3 entries)
  - Races 10–14: Clark Women's TBD, 10:50–11:30 AM
- **15 entries** total across the men's races

## Known Considerations

- **TBD Races**: When lanes exist but have no event code or entries yet, races are created as placeholders. These will be updated as FileMaker data is populated.
- **Breaks**: FileMaker lane records with `racetime = "Break"` are skipped during migration — they don't become races.
- **Token Expiration**: FileMaker API tokens expire after ~15 minutes. Long migrations may need token refresh.
- **Enum Values**: Supabase uses custom enum types for `race_status`, `race_type`, and `boat_status`. Valid values must match the database enums (e.g., `scheduled`, `sprint`, `entered`).
