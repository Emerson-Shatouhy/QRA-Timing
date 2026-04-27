import { createClient } from "../../../../utils/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

function formatElapsed(ms: number | null): string {
  if (!ms) return "—";
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  const cs = Math.floor((ms % 1000) / 10);
  return `${mins}:${String(secs).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function formatTime(ts: string | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

const STATUS_PILL: Record<string, { bg: string; fg: string; label: string }> = {
  started:   { bg: "rgba(122,30,43,0.10)", fg: "#7a1e2b", label: "On the water" },
  ready:     { bg: "rgba(31,59,110,0.10)", fg: "#1f3b6e", label: "On deck" },
  scheduled: { bg: "rgba(20,20,20,0.05)", fg: "#666", label: "Scheduled" },
  finished:  { bg: "rgba(20,20,20,0.06)", fg: "#3a3a3a", label: "Finished" },
};

type Entry = {
  id: number;
  bow_number: number | null;
  boat_status: string | null;
  teams: { team_name: string; team_short_name: string | null; primary_color: string | null } | null;
  race_results: { elapsed_ms: number | null; status: string | null }[];
};

export default async function LivePage() {
  const supabase = await createClient();
  const today = new Date().toLocaleDateString("en-CA");

  const { data: race } = await supabase
    .from("races")
    .select("id, race_name, scheduled_start, actual_start, race_status, distance_meters, race_type")
    .eq("race_status", "started")
    .eq("event_date", today)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  let entries: Entry[] = [];

  if (race) {
    const { data: entriesData } = await supabase
      .from("entries")
      .select(`
        id, bow_number, boat_status,
        teams(team_name, team_short_name, primary_color),
        race_results(elapsed_ms, status)
      `)
      .eq("race_id", race.id)
      .order("bow_number", { ascending: true });

    entries = (entriesData as Entry[] | null) ?? [];
  }

  const finished = entries
    .filter((e) => e.race_results?.[0]?.elapsed_ms != null)
    .sort((a, b) => (a.race_results[0]?.elapsed_ms ?? 0) - (b.race_results[0]?.elapsed_ms ?? 0));
  const unfinished = entries.filter((e) => !e.race_results?.[0]?.elapsed_ms);
  const sorted = [...finished, ...unfinished];

  const { data: recentRaces } = await supabase
    .from("races")
    .select("id, race_name, scheduled_start, race_status")
    .eq("race_status", "finished")
    .eq("event_date", today)
    .order("sort_order", { ascending: false })
    .limit(4);

  const { data: upcomingRaces } = await supabase
    .from("races")
    .select("id, race_name, scheduled_start, race_status")
    .in("race_status", ["ready", "scheduled"])
    .eq("event_date", today)
    .order("sort_order", { ascending: true })
    .limit(5);

  if (!race) {
    return (
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "56px 40px 96px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 48 }}>
          <span className="relative inline-flex h-[7px] w-[7px]">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7a1e2b] opacity-75" />
            <span className="relative inline-flex rounded-full h-[7px] w-[7px] bg-[#7a1e2b]" />
          </span>
          <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 11, color: "#7a1e2b", fontWeight: 500 }}>
            Live
          </span>
        </div>

        <h1 style={{ fontSize: 48, lineHeight: 1, fontWeight: 500, margin: "0 0 16px", letterSpacing: "-0.03em" }}>
          No race on the water
        </h1>
        <p style={{ fontSize: 16, color: "#666", margin: "0 0 40px" }}>
          Check the schedule for upcoming races.
        </p>
        <Link
          href="/schedule"
          style={{
            background: "#0e0e0f",
            color: "#fff",
            padding: "12px 20px",
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          View schedule →
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: "56px 40px 96px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 32, gap: 32, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span className="relative inline-flex h-[7px] w-[7px]">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7a1e2b] opacity-75" />
              <span className="relative inline-flex rounded-full h-[7px] w-[7px] bg-[#7a1e2b]" />
            </span>
            <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 11, color: "#7a1e2b", fontWeight: 500 }}>
              Live · Race #{race.id}
            </span>
          </div>
          <h1 style={{ fontSize: 48, lineHeight: 1, fontWeight: 500, margin: 0, letterSpacing: "-0.03em" }}>
            {race.race_name}
          </h1>
          <div style={{ marginTop: 10, fontSize: 14, color: "#666" }}>
            {race.distance_meters ? `${race.distance_meters}m` : "2,000m"} · started{" "}
            <span style={{ fontFamily: "var(--font-geist-mono), monospace" }}>{formatTime(race.actual_start)}</span>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 11, color: "#666", marginBottom: 6 }}>Scheduled</div>
          <div style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 24, fontWeight: 600, letterSpacing: "-0.01em" }}>
            {formatTime(race.scheduled_start)}
          </div>
        </div>
      </div>

      {sorted.length > 0 ? (
        <div style={{ background: "#fff", border: "1px solid rgba(20,20,20,0.08)", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "56px 1fr 140px 80px", padding: "14px 20px", borderBottom: "1px solid rgba(20,20,20,0.08)", fontFamily: "var(--font-geist-mono), monospace", fontSize: 11, color: "#999", fontWeight: 500 }}>
            <span>Bow</span>
            <span>Crew</span>
            <span style={{ textAlign: "right" }}>Finish time</span>
            <span style={{ textAlign: "right" }}>Pos.</span>
          </div>

          {sorted.map((entry, i) => {
            const result = entry.race_results?.[0];
            const isLeading = i === 0 && result?.elapsed_ms != null;
            const teamColor = entry.teams?.primary_color || "#1f3b6e";
            return (
              <div key={entry.id} style={{ display: "grid", gridTemplateColumns: "56px 1fr 140px 80px", alignItems: "center", padding: "16px 20px", borderBottom: i < sorted.length - 1 ? "1px solid rgba(20,20,20,0.05)" : "none", background: isLeading ? "rgba(122,30,43,0.04)" : "transparent" }}>
                <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 13, fontWeight: 500, color: "#666" }}>
                  {entry.bow_number ?? "—"}
                </span>
                <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ width: 30, height: 30, background: isLeading ? "#7a1e2b" : teamColor, color: "#fff", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
                    {(entry.teams?.team_short_name || entry.teams?.team_name || "?").slice(0, 3).toUpperCase()}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: isLeading ? 500 : 400 }}>{entry.teams?.team_name || "Unknown"}</span>
                </span>
                <span style={{ textAlign: "right", fontFamily: "var(--font-geist-mono), monospace", fontSize: 14, fontWeight: isLeading ? 600 : 400, color: isLeading ? "#7a1e2b" : result?.elapsed_ms ? "#0e0e0f" : "#bbb" }}>
                  {result?.elapsed_ms ? formatElapsed(result.elapsed_ms) : "· · ·"}
                </span>
                <span style={{ textAlign: "right", fontFamily: "var(--font-geist-mono), monospace", fontSize: 13, color: isLeading ? "#7a1e2b" : "#999", fontWeight: isLeading ? 500 : 400 }}>
                  {result?.elapsed_ms ? `#${i + 1}` : "—"}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid rgba(20,20,20,0.08)", borderRadius: 8, padding: "40px 24px", textAlign: "center", color: "#666", fontSize: 14 }}>
          No entries found for this race.
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, fontSize: 12, color: "#999", fontFamily: "var(--font-geist-mono), monospace" }}>
        <span>Times update as finishes are recorded</span>
        <span>Leading entry highlighted</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginTop: 64 }}>
        <div>
          <div style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 12, color: "#666", fontWeight: 500, marginBottom: 14 }}>Just finished</div>
          {!recentRaces?.length && <p style={{ fontSize: 14, color: "#999" }}>No completed races yet.</p>}
          {recentRaces?.map((r) => (
            <div key={r.id} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 16, padding: "14px 0", borderTop: "1px solid rgba(20,20,20,0.08)", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 12, color: "#666" }}>{formatTime(r.scheduled_start)}</span>
              <span style={{ fontSize: 14 }}>{r.race_name}</span>
              <Link href="/results" style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 12, color: "#666", textDecoration: "none" }}>result →</Link>
            </div>
          ))}
        </div>

        <div>
          <div style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 12, color: "#666", fontWeight: 500, marginBottom: 14 }}>Up next</div>
          {!upcomingRaces?.length && <p style={{ fontSize: 14, color: "#999" }}>No more races scheduled today.</p>}
          {upcomingRaces?.map((r) => {
            const pill = STATUS_PILL[r.race_status] ?? STATUS_PILL.scheduled;
            return (
              <div key={r.id} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 16, padding: "14px 0", borderTop: "1px solid rgba(20,20,20,0.08)", alignItems: "center" }}>
                <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 12, color: "#666" }}>{formatTime(r.scheduled_start)}</span>
                <span style={{ fontSize: 14 }}>{r.race_name}</span>
                <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 10.5, fontWeight: 500, background: pill.bg, color: pill.fg, padding: "3px 8px", borderRadius: 4, whiteSpace: "nowrap" }}>{pill.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
