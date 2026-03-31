"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../../utils/supabase/client";
import { Clock, Trophy, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import RaceResultsTable from "@/components/RaceResultsTable";
import OarBlade from "@/components/OarBlade";

interface Entry {
  id: string;
  bow_number: number;
  boat_status: string;
  teams: { team_name: string; oarspotter_key: string | null } | null;
  race_results: { id: string }[];
}

interface RaceWithEntries {
  id: string;
  race_name: string;
  scheduled_start: string | null;
  race_status: string;
  race_type: string;
  gender: string | null;
  boat_class: string | null;
  age_category: string | null;
  level: number | null;
  host_team_id: string | null;
  host_team: { team_name: string } | null;
  entries: Entry[];
}

interface Props {
  races: RaceWithEntries[];
  date: string;
}

export default function SpectatorRaceList({
  races: initialRaces,
  date,
}: Props) {
  const [races, setRaces] = useState(initialRaces);
  const [expandedRaces, setExpandedRaces] = useState<Set<string>>(() => {
    const expanded = new Set<string>();
    initialRaces.forEach((race) => {
      const hasResults = race.entries.some(
        (e) => (e.race_results ?? []).length > 0
      );
      if (hasResults || race.race_status === "started") {
        expanded.add(race.id);
      }
    });
    return expanded;
  });

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`spectator-${date}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "race_results" },
        () => refetchRaces()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "entries" },
        () => refetchRaces()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "races" },
        () => refetchRaces()
      )
      .subscribe();

    async function refetchRaces() {
      const { data } = await supabase
        .from("races")
        .select(
          `
          id, race_name, scheduled_start, race_status, race_type,
          gender, boat_class, age_category, level, host_team_id,
          host_team:teams!races_host_team_id_fkey(team_name),
          entries(id, bow_number, boat_status, teams(team_name, oarspotter_key), race_results(id))
        `
        )
        .eq("event_date", date)
        .neq("race_type", "break")
        .order("scheduled_start", { ascending: true });

      if (data) {
        setRaces(data as unknown as RaceWithEntries[]);
        setExpandedRaces((prev) => {
          const next = new Set(prev);
          data.forEach((race: any) => {
            if (race.race_status === "started") next.add(race.id);
          });
          return next;
        });
      }
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [date]);

  const toggleRace = (id: string) => {
    setExpandedRaces((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {races.map((race) => (
        <RaceCard
          key={race.id}
          race={race}
          expanded={expandedRaces.has(race.id)}
          onToggle={() => toggleRace(race.id)}
        />
      ))}
    </div>
  );
}

// ─── RaceCard ──────────────────────────────────────────────────────────────

function RaceCard({
  race,
  expanded,
  onToggle,
}: {
  race: RaceWithEntries;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasResults = race.entries.some(
    (e) => (e.race_results ?? []).length > 0
  );
  const isActive = race.race_status === "started";

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
      className={`bg-white rounded-lg border overflow-hidden transition-all ${
        isActive ? "border-green-300 ring-1 ring-green-200" : ""
      }`}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <StatusIcon status={race.race_status} />
          <div className="min-w-0">
            <div className="font-semibold text-gray-900 truncate">
              {race.race_name}
            </div>
            <div className="text-sm text-gray-500 flex items-center gap-2">
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
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <RaceStatusBadge status={race.race_status} />
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t px-4 pb-4">
          {hasResults ? (
            // Use shared RaceResultsTable with compact mode
            <div className="pt-2">
              <RaceResultsTable race={raceForTable} compact />
            </div>
          ) : race.entries.length === 0 ? (
            <p className="text-sm text-gray-400 pt-3">No entries yet</p>
          ) : (
            // No results yet — show entry lineup
            <div className="pt-2">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase tracking-wider">
                    <th className="text-left py-2 pr-1 w-9">#</th>
                    <th className="text-left py-2 w-10"></th>
                    <th className="text-left py-2">Entry</th>
                    <th className="text-right py-2 pl-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {race.entries
                    .slice()
                    .sort((a, b) => a.bow_number - b.bow_number)
                    .map((entry) => (
                      <tr key={entry.id} className="border-t border-gray-100">
                        <td className="py-2.5 pr-1 text-sm text-gray-400">
                          {entry.bow_number}
                        </td>
                        <td className="py-2.5 pr-2">
                          <OarBlade
                            oarspotterKey={
                              entry.teams?.oarspotter_key ?? null
                            }
                            size={20}
                          />
                        </td>
                        <td className="py-2.5 font-medium">
                          {entry.teams?.team_name || "TBD"}
                        </td>
                        <td className="py-2.5 pl-2 text-right">
                          <EntryStatusBadge status={entry.boat_status} />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "started":
      return (
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
          <Loader2 className="w-5 h-5 text-green-600 animate-spin" />
        </div>
      );
    case "finished":
      return (
        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
          <Trophy className="w-5 h-5 text-blue-600" />
        </div>
      );
    default:
      return (
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
          <Clock className="w-5 h-5 text-gray-400" />
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
      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
        styles[status] || styles.scheduled
      }`}
    >
      {status === "started"
        ? "Racing"
        : status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function EntryStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    entered: "text-gray-400",
    ready: "text-yellow-600",
    on_water: "text-blue-600",
    finished: "text-green-600",
  };

  const labels: Record<string, string> = {
    entered: "Entered",
    ready: "Ready",
    on_water: "On Water",
    finished: "Finished",
  };

  return (
    <span
      className={`text-xs font-medium ${styles[status] || "text-gray-400"}`}
    >
      {labels[status] || status}
    </span>
  );
}
