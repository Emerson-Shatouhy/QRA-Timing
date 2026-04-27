"use client";

import { useState } from "react";
import Link from "next/link";

type DateEntry = {
  date: string;
  count: number;
  finished: number;
  hasLive: boolean;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  dayNumber: string;
  weekday: string;
  month: string;
  year: number;
  displayDate: string;
};

export default function AllDatesView({ dates, today }: { dates: DateEntry[]; today: string }) {
  const upcoming = dates
    .filter((d) => d.isFuture || d.isToday)
    .sort((a, b) => a.date.localeCompare(b.date));
  const past = dates.filter((d) => d.isPast);

  const pastByYear = new Map<number, DateEntry[]>();
  for (const d of past) {
    if (!pastByYear.has(d.year)) pastByYear.set(d.year, []);
    pastByYear.get(d.year)!.push(d);
  }
  const yearGroups = Array.from(pastByYear.entries()).sort((a, b) => b[0] - a[0]);

  const [expandedYears, setExpandedYears] = useState<Set<number>>(
    () => new Set([new Date().getFullYear()])
  );

  const toggleYear = (year: number) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  return (
    <div style={{ maxWidth: 1240, margin: "0 auto", padding: "56px 40px 96px" }}>
      <div style={{ marginBottom: 48 }}>
        <div style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 12, color: "#666", fontWeight: 500, marginBottom: 12 }}>All dates</div>
        <h1 style={{ fontSize: 48, lineHeight: 1, fontWeight: 500, margin: "0 0 10px", letterSpacing: "-0.03em" }}>Results &amp; schedule</h1>
        <div style={{ fontSize: 14, color: "#666" }}>Every regatta day on Lake Quinsigamond</div>
      </div>

      {upcoming.length > 0 && (
        <section style={{ marginBottom: 56 }}>
          <div style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 11, color: "#999", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 12 }}>Upcoming</div>
          <div style={{ background: "#fff", border: "1px solid rgba(20,20,20,0.08)", borderRadius: 10, overflow: "hidden" }}>
            {upcoming.map((d, i) => (
              <DateCard key={d.date} entry={d} last={i === upcoming.length - 1} />
            ))}
          </div>
        </section>
      )}

      {yearGroups.length > 0 && (
        <section>
          <div style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 11, color: "#999", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 20 }}>Past results</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {yearGroups.map(([year, entries]) => {
              const isExpanded = expandedYears.has(year);
              const totalRaces = entries.reduce((s, e) => s + e.count, 0);
              const totalFinished = entries.reduce((s, e) => s + e.finished, 0);
              return (
                <div key={year}>
                  <button
                    onClick={() => toggleYear(year)}
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 0", background: "transparent", border: "none", borderTop: "1px solid rgba(20,20,20,0.08)", cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
                  >
                    <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                      <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em", color: "#0e0e0f" }}>{year}</span>
                      <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 12, color: "#999" }}>
                        {entries.length} date{entries.length !== 1 ? "s" : ""} · {totalRaces} race{totalRaces !== 1 ? "s" : ""}
                        {totalFinished > 0 && <span style={{ color: "#3a8a3a" }}> · {totalFinished} with results</span>}
                      </span>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: "#999", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s", flexShrink: 0 }}>
                      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div style={{ background: "#fff", border: "1px solid rgba(20,20,20,0.08)", borderRadius: 10, overflow: "hidden", marginTop: 4, marginBottom: 8 }}>
                      {entries.map((d, i) => (
                        <DateCard key={d.date} entry={d} last={i === entries.length - 1} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <div style={{ borderTop: "1px solid rgba(20,20,20,0.08)" }} />
          </div>
        </section>
      )}

      {dates.length === 0 && (
        <div style={{ padding: "80px 0", textAlign: "center", color: "#666" }}>
          <p style={{ fontSize: 16 }}>No race dates found.</p>
        </div>
      )}
    </div>
  );
}

function DateCard({ entry, last }: { entry: DateEntry; last: boolean }) {
  return (
    <Link
      href={`/${entry.date}`}
      style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", textDecoration: "none", color: "inherit", borderBottom: last ? "none" : "1px solid rgba(20,20,20,0.05)", background: "transparent", transition: "background 0.1s" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "#fafaf8")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <div style={{ width: 44, height: 44, borderRadius: 8, background: entry.isToday ? "#0e0e0f" : entry.isFuture ? "#f5f5f5" : "#f0f0f0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 8.5, color: entry.isToday ? "#fff" : "#999", letterSpacing: "0.04em", textTransform: "uppercase", lineHeight: 1, marginBottom: 1 }}>{entry.month}</span>
        <span style={{ fontSize: 17, fontWeight: 700, color: entry.isToday ? "#fff" : "#0e0e0f", lineHeight: 1, letterSpacing: "-0.02em" }}>{entry.dayNumber}</span>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "#0e0e0f", display: "flex", alignItems: "center", gap: 8 }}>
          {entry.weekday}, {entry.month} {entry.dayNumber}
          {entry.isToday && (
            <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 9.5, fontWeight: 600, color: "#7a1e2b", background: "rgba(122,30,43,0.08)", padding: "2px 6px", borderRadius: 3 }}>today</span>
          )}
          {entry.hasLive && (
            <span className="relative inline-flex h-[6px] w-[6px]">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7a1e2b] opacity-75" />
              <span className="relative inline-flex rounded-full h-[6px] w-[6px] bg-[#7a1e2b]" />
            </span>
          )}
        </div>
        <div style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 11, color: "#999", marginTop: 2 }}>
          {entry.count} race{entry.count !== 1 ? "s" : ""}
          {entry.finished > 0 && ` · ${entry.finished} with results`}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        {entry.finished > 0 && (
          <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 10.5, fontWeight: 500, color: "#3a8a3a", background: "rgba(58,138,58,0.08)", padding: "3px 8px", borderRadius: 4 }}>Results</span>
        )}
        {entry.isFuture && !entry.isToday && (
          <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 10.5, fontWeight: 500, color: "#1f3b6e", background: "rgba(31,59,110,0.08)", padding: "3px 8px", borderRadius: 4 }}>Upcoming</span>
        )}
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: "#ccc" }}>
          <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </Link>
  );
}
