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
      // Within same host, sort by scheduled time
      return (a.scheduled_start || "").localeCompare(b.scheduled_start || "");
    }
    // Default: sort by scheduled time
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
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Sort toggle */}
          <div className="flex items-center bg-white border rounded-lg overflow-hidden text-sm">
            <button
              onClick={() => setSortMode("time")}
              className={`px-3 py-1.5 transition-colors ${
                sortMode === "time"
                  ? "bg-blue-900 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Clock className="w-3.5 h-3.5 inline mr-1" />
              By Time
            </button>
            <button
              onClick={() => setSortMode("host")}
              className={`px-3 py-1.5 transition-colors ${
                sortMode === "host"
                  ? "bg-blue-900 text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Filter className="w-3.5 h-3.5 inline mr-1" />
              By Host
            </button>
          </div>

          {/* Host filter chips */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFilterHost(null)}
              className={`text-sm px-3 py-1 rounded-full border transition-colors ${
                filterHost === null
                  ? "bg-blue-900 text-white border-blue-900"
                  : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
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
                className={`text-sm px-3 py-1 rounded-full border transition-colors ${
                  filterHost === ht.id
                    ? "bg-blue-900 text-white border-blue-900"
                    : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
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
            <h2 className="text-lg font-semibold text-gray-800 mb-3 mt-6 first:mt-0">
              {group.label}
            </h2>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {group.races.map((race) => (
              <RaceCard key={race.id} race={race} />
            ))}
          </div>
        </div>
      ))}

      {sorted.length === 0 && (
        <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
          <p>No races match the selected filter.</p>
        </div>
      )}
    </div>
  );
}

// ─── RaceCard ──────────────────────────────────────────────────────────────

function RaceCard({ race }: { race: RaceData }) {
  const isActive = race.race_status === "started";
  const isFinished = race.race_status === "finished";

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
    <div
      className={`bg-white rounded-lg border overflow-hidden ${
        isActive ? "border-green-300 ring-1 ring-green-200" : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex items-center gap-3 min-w-0">
          <StatusIcon status={race.race_status} />
          <div className="min-w-0">
            <div className="font-semibold text-gray-900 truncate">
              {race.race_name}
            </div>
            <div className="text-sm text-gray-500 flex items-center gap-2 flex-wrap">
              {scheduledTime && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {scheduledTime}
                </span>
              )}
              {race.host_team && (
                <span className="truncate">{race.host_team.team_name}</span>
              )}
            </div>
          </div>
        </div>
        <RaceStatusBadge status={race.race_status} />
      </div>

      {/* Results — always visible, RaceResultsTable handles loading/empty states */}
      <div className="p-4">
        <RaceResultsTable race={raceForTable} compact />
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "started":
      return (
        <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
          <Loader2 className="w-4 h-4 text-green-600 animate-spin" />
        </div>
      );
    case "finished":
      return (
        <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
          <Trophy className="w-4 h-4 text-blue-600" />
        </div>
      );
    default:
      return (
        <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
          <Clock className="w-4 h-4 text-gray-400" />
        </div>
      );
  }
}

function RaceStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    scheduled: "bg-gray-100 text-gray-600",
    ready: "bg-yellow-100 text-yellow-700",
    started: "bg-green-100 text-green-700",
    finished: "bg-blue-100 text-blue-700",
    cancelled: "bg-red-100 text-red-700",
    abandoned: "bg-orange-100 text-orange-700",
  };

  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
        styles[status] || styles.scheduled
      }`}
    >
      {status === "started"
        ? "Racing"
        : status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
