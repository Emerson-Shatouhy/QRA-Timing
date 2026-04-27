"use client";

import { useState } from "react";
import { Clock, Trophy, Loader2, Filter } from "lucide-react";
import RaceResultsTable from "@/components/RaceResultsTable";

interface RaceData {
  id: number;
  race_name: string;
  scheduled_start: string | null;
  race_status: string;
  race_type: string;
  gender: string | null;
  boat_class: string | null;
  level: number | null;
  host_team_id: number | null;
  sort_order: number | null;
  host_team: { team_name: string } | null;
}

interface HostTeam {
  id: number;
  name: string;
}

interface Props {
  races: RaceData[];
  hostTeams: HostTeam[];
  date: string;
}

type SortMode = "time" | "host";

export default function SpectatorRaceGrid({ races, hostTeams, date }: Props) {
  const [sortMode, setSortMode] = useState<SortMode>("time");
  const [filterHost, setFilterHost] = useState<number | null>(null);

  // Filter
  const filtered = filterHost
    ? races.filter((r) => r.host_team_id === filterHost)
    : races;

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortMode === "host") {
      const aHost = a.host_team?.team_name || "";
      const bHost = b.host_team?.team_name || "";
      const hostCmp = aHost.localeCompare(bHost);
      if (hostCmp !== 0) return hostCmp;
      return (a.scheduled_start || "").localeCompare(b.scheduled_start || "");
    }
    return (a.scheduled_start || "").localeCompare(b.scheduled_start || "");
  });

  // Group by host if sorting by host
  const groups: { label: string; races: RaceData[] }[] = [];
  if (sortMode === "host") {
    const hostMap = new Map<string, RaceData[]>();
    sorted.forEach((race) => {
      const hostName = race.host_team?.team_name || "Other";
      if (!hostMap.has(hostName)) hostMap.set(hostName, []);
      hostMap.get(hostName)!.push(race);
    });
    hostMap.forEach((races, label) => groups.push({ label, races }));
  } else {
    groups.push({ label: "", races: sorted });
  }

  return (
    <div>
      {/* Controls */}
      {hostTeams.length > 1 && (
        <div className="flex flex-wrap items-center gap-3 mb-5">
          {/* Sort toggle */}
          <div className="flex items-center bg-white border border-slate-200 rounded-md overflow-hidden text-xs">
            <button
              onClick={() => setSortMode("time")}
              className={`px-3 py-1.5 transition-all font-medium flex items-center gap-1 ${
                sortMode === "time"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Clock className="w-3 h-3" />
              By Time
            </button>
            <button
              onClick={() => setSortMode("host")}
              className={`px-3 py-1.5 transition-all font-medium flex items-center gap-1 ${
                sortMode === "host"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Filter className="w-3 h-3" />
              By Host
            </button>
          </div>

          {/* Host filter chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setFilterHost(null)}
              className={`text-xs px-3 py-1 rounded-full border font-medium transition-all ${
                filterHost === null
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
              }`}
            >
              All
            </button>
            {hostTeams.map((ht) => (
              <button
                key={ht.id}
                onClick={() =>
                  setFilterHost(filterHost === ht.id ? null : ht.id)
                }
                className={`text-xs px-3 py-1 rounded-full border font-medium transition-all ${
                  filterHost === ht.id
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                }`}
              >
                {ht.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Race Grid */}
      {groups.map((group) => (
        <div key={group.label || "all"}>
          {group.label && (
            <h2 className="text-sm font-semibold text-slate-700 mb-2 mt-5 first:mt-0">
              {group.label}
            </h2>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {group.races.map((race) => (
              <RaceCard key={race.id} race={race} />
            ))}
          </div>
        </div>
      ))}

      {sorted.length === 0 && (
        <div className="bg-white rounded-lg border p-6 text-center text-slate-500 text-sm">
          No races match the selected filter.
        </div>
      )}
    </div>
  );
}

// ─── RaceCard ──────────────────────────────────────────────────────────────

function RaceCard({ race }: { race: RaceData }) {
  const scheduledTime = race.scheduled_start
    ? new Date(race.scheduled_start).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  // Build a minimal Race object for RaceResultsTable
  const raceForTable = {
    id: BigInt(race.id),
    race_name: race.race_name,
  } as any;

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden hover:border-slate-300 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-slate-900 text-sm truncate">
            {race.race_name}
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-2">
            {scheduledTime && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {scheduledTime}
              </span>
            )}
            {race.host_team && (
              <span className="truncate">{race.host_team.team_name}</span>
            )}
          </div>
        </div>
        <RaceStatusBadge status={race.race_status} />
      </div>

      {/* Results */}
      <div className="px-3 py-2">
        <RaceResultsTable race={raceForTable} compact />
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function RaceStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    scheduled: "text-slate-500",
    ready: "text-amber-600",
    started: "text-emerald-600",
    finished: "text-blue-600",
    cancelled: "text-red-500",
    abandoned: "text-orange-500",
  };

  return (
    <span
      className={`text-xs font-medium shrink-0 ml-2 ${
        styles[status] || styles.scheduled
      }`}
    >
      {status === "started"
        ? "Racing"
        : status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
