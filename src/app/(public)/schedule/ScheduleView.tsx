"use client";

import { useState } from "react";
import Link from "next/link";

type Race = {
  id: number;
  race_name: string;
  scheduled_start: string | null;
  race_status: string;
  race_type: string;
  sort_order: number | null;
  host_team: { team_name: string } | null;
};

type DateGroup = {
  date: string;
  races: Race[];
  displayDate: string;
  shortDate: string;
  isToday: boolean;
  isFuture: boolean;
};

const STATUS_MAP: Record<string, { bg: string; fg: string; dot: string; label: string }> = {
  started:   { bg: "rgba(122,30,43,0.10)", fg: "#7a1e2b", dot: "#7a1e2b", label: "On the water" },
  ready:     { bg: "rgba(31,59,110,0.10)", fg: "#1f3b6e", dot: "#1f3b6e", label: "On deck" },
  scheduled: { bg: "transparent",          fg: "#666",    dot: "#aaa",    label: "Scheduled" },
  finished:  { bg: "rgba(20,20,20,0.06)",  fg: "#3a3a3a", dot: "#3a3a3a", label: "Finished" },
  cancelled: { bg: "rgba(20,20,20,0.06)",  fg: "#999",    dot: "#ccc",    label: "Cancelled" },
};

function formatTime(ts: string | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function StatusPill({ status }: { status: string }) {
  const pill = STATUS_MAP[status] ?? STATUS_MAP.scheduled;
  const live = status === "started";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        background: pill.bg,
        color: pill.fg,
        padding: "3px 8px",
        borderRadius: 4,
        fontFamily: "var(--font-geist-mono), monospace",
        fontSize: 10.5,
        fontWeight: 500,
        whiteSpace: "nowrap",
      }}
    >
      {live ? (
        <span className="relative inline-flex h-[5px] w-[5px]">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7a1e2b] opacity-75" />
          <span className="relative inline-flex rounded-full h-[5px] w-[5px] bg-[#7a1e2b]" />
        </span>
      ) : (
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: pill.dot, display: "inline-block", flexShrink: 0 }} />
      )}
      {pill.label}
    </span>
  );
}

export default function ScheduleView({ dates, today }: { dates: DateGroup[]; today: string }) {
  const defaultOpen = new Set(dates.filter((d) => d.isToday || (dates.every((d) => !d.isToday) && d.isFuture && dates.indexOf(d) === 0)).map((d) => d.date));
  const [openDates, setOpenDates] = useState<Set<string>>(defaultOpen);

  const toggle = (date: string) => {
    setOpenDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: "56px 40px 96px" }}>
      <div style={{ marginBottom: 48 }}>
        <div style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 12, color: "#666", fontWeight: 500, marginBottom: 12 }}>Schedule</div>
        <h1 style={{ fontSize: 48, lineHeight: 1, fontWeight: 500, margin: "0 0 10px", letterSpacing: "-0.03em" }}>Upcoming races</h1>
        <div style={{ fontSize: 14, color: "#666" }}>Lake Quinsigamond · Worcester, MA</div>
      </div>

      {dates.length === 0 ? (
        <div style={{ padding: "80px 0", textAlign: "center" }}>
          <p style={{ fontSize: 16, color: "#666", marginBottom: 8 }}>No upcoming races scheduled.</p>
          <Link href="/results" style={{ color: "#7a1e2b", fontSize: 14, textDecoration: "none" }}>
            Browse past results →
          </Link>
        </div>
      ) : (
        <div>
          {dates.map((dg) => {
            const isOpen = openDates.has(dg.date);
            const liveCount = dg.races.filter((r) => r.race_status === "started").length;
            const finishedCount = dg.races.filter((r) => r.race_status === "finished").length;

            return (
              <div key={dg.date} style={{ borderTop: "1px solid rgba(20,20,20,0.08)" }}>
                <button
                  onClick={() => toggle(dg.date)}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 0", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left", gap: 16 }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 10, background: dg.isToday ? "#0e0e0f" : dg.isFuture ? "#fff" : "#f5f5f5", border: dg.isFuture && !dg.isToday ? "1px solid rgba(20,20,20,0.1)" : "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 9, color: dg.isToday ? "#fff" : "#999", letterSpacing: "0.04em", textTransform: "uppercase", lineHeight: 1, marginBottom: 2 }}>
                        {new Date(dg.date + "T12:00:00").toLocaleDateString("en-US", { month: "short" })}
                      </span>
                      <span style={{ fontSize: 20, fontWeight: 600, color: dg.isToday ? "#fff" : "#0e0e0f", lineHeight: 1, letterSpacing: "-0.02em" }}>
                        {new Date(dg.date + "T12:00:00").toLocaleDateString("en-US", { day: "numeric" })}
                      </span>
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                        <span style={{ fontSize: 17, fontWeight: 500, letterSpacing: "-0.02em" }}>{dg.displayDate}</span>
                        {dg.isToday && (
                          <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 10, fontWeight: 600, color: "#7a1e2b", background: "rgba(122,30,43,0.08)", padding: "2px 7px", borderRadius: 4 }}>today</span>
                        )}
                      </div>
                      <div style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 12, color: "#999" }}>
                        {dg.races.length} race{dg.races.length !== 1 ? "s" : ""}
                        {finishedCount > 0 && ` · ${finishedCount} finished`}
                        {liveCount > 0 && ` · ${liveCount} live`}
                      </div>
                    </div>
                  </div>

                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: "#999", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
                    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {isOpen && (
                  <div style={{ paddingBottom: 16 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "72px 60px 1fr 130px 130px", gap: 16, padding: "8px 6px", fontFamily: "var(--font-geist-mono), monospace", fontSize: 10.5, color: "#aaa", fontWeight: 500, borderBottom: "1px solid rgba(20,20,20,0.06)", marginBottom: 4 }}>
                      <span>Time</span>
                      <span>ID</span>
                      <span>Race</span>
                      <span>Host</span>
                      <span>Status</span>
                    </div>

                    {dg.races.map((r) => {
                      const live = r.race_status === "started";
                      return (
                        <div key={r.id} style={{ display: "grid", gridTemplateColumns: "72px 60px 1fr 130px 130px", gap: 16, alignItems: "center", padding: "14px 6px", borderBottom: "1px solid rgba(20,20,20,0.04)", background: live ? "rgba(122,30,43,0.02)" : "transparent" }}>
                          <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 14, fontWeight: 500, color: live ? "#7a1e2b" : "#0e0e0f", letterSpacing: "-0.01em" }}>{formatTime(r.scheduled_start)}</span>
                          <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 11, color: "#bbb" }}>#{r.id}</span>
                          <span style={{ fontSize: 14, color: "#0e0e0f" }}>{r.race_name}</span>
                          <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 11, color: "#999" }}>{r.host_team?.team_name || "—"}</span>
                          <StatusPill status={r.race_status} />
                        </div>
                      );
                    })}

                    <div style={{ paddingTop: 8 }}>
                      <Link href={`/${dg.date}`} style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 12, color: "#666", textDecoration: "none" }}>
                        View full day →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <div style={{ borderTop: "1px solid rgba(20,20,20,0.08)" }} />
        </div>
      )}

      <div style={{ marginTop: 40, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 12, color: "#999" }}>
          Times subject to change based on conditions
        </span>
        <Link href="/results" style={{ background: "transparent", color: "#0e0e0f", padding: "9px 16px", borderRadius: 6, fontSize: 13, fontWeight: 600, textDecoration: "none", boxShadow: "inset 0 0 0 1px rgba(20,20,20,0.14)" }}>
          Past results →
        </Link>
      </div>
    </div>
  );
}
