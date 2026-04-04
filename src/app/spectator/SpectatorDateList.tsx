"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface RaceDate {
  date: string;
  displayDate: string;
  dayNumber: string;
  weekday: string;
  month: string;
  raceCount: number;
  hasResults: boolean;
}

interface YearGroup {
  year: number;
  dates: RaceDate[];
}

interface Props {
  yearGroups: YearGroup[];
  currentYear: number;
}

export default function SpectatorDateList({ yearGroups, currentYear }: Props) {
  const [expandedYears, setExpandedYears] = useState<Set<number>>(() => {
    const expanded = new Set<number>();
    expanded.add(currentYear);
    return expanded;
  });

  const toggleYear = (year: number) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {yearGroups.map((group) => {
        const isCurrentYear = group.year === currentYear;
        const isExpanded = expandedYears.has(group.year);

        const today = new Date().toISOString().split("T")[0];
        const pastDates = group.dates.filter((d) => d.date <= today);
        const upcomingDates = group.dates.filter((d) => d.date > today);
        const totalRaces = group.dates.reduce(
          (sum, d) => sum + d.raceCount,
          0
        );
        const totalResults = group.dates.filter((d) => d.hasResults).length;

        return (
          <div key={group.year}>
            {/* Year header */}
            <button
              onClick={() => toggleYear(group.year)}
              className="w-full flex items-center justify-between py-3 group"
            >
              <div className="flex items-baseline gap-3">
                <h2 className="text-xl font-bold text-slate-900">
                  {group.year}
                </h2>
                <span className="text-sm text-slate-400">
                  {group.dates.length} date{group.dates.length !== 1 ? "s" : ""}
                  {" "}&middot;{" "}
                  {totalRaces} race{totalRaces !== 1 ? "s" : ""}
                  {totalResults > 0 && (
                    <span className="text-emerald-600 font-medium">
                      {" "}&middot; {totalResults} with results
                    </span>
                  )}
                </span>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {isExpanded && (
              <div className="mt-2">
                {isCurrentYear && upcomingDates.length > 0 && (
                  <div className="mb-6">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 px-1">
                      Upcoming
                    </p>
                    <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                      {upcomingDates.map((d) => (
                        <DateCard key={d.date} raceDate={d} />
                      ))}
                    </div>
                  </div>
                )}

                {pastDates.length > 0 && (
                  <div className="mb-6">
                    {isCurrentYear && upcomingDates.length > 0 && (
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2 px-1">
                        Past Results
                      </p>
                    )}
                    <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                      {[...pastDates].reverse().map((d) => (
                        <DateCard key={d.date} raceDate={d} />
                      ))}
                    </div>
                  </div>
                )}

                {!isCurrentYear && pastDates.length === 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden mb-6">
                    {group.dates.map((d) => (
                      <DateCard key={d.date} raceDate={d} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DateCard({ raceDate }: { raceDate: RaceDate }) {
  return (
    <Link
      href={`/spectator/${raceDate.date}`}
      className="flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50 transition-colors"
    >
      {/* Calendar-style date block */}
      <div className="w-11 h-11 rounded-lg bg-slate-900 flex flex-col items-center justify-center flex-shrink-0">
        <span className="text-[10px] font-medium text-slate-400 uppercase leading-none">
          {raceDate.month}
        </span>
        <span className="text-lg font-bold text-white leading-tight">
          {raceDate.dayNumber}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-slate-900 text-sm">
          {raceDate.weekday}, {raceDate.month} {raceDate.dayNumber}
        </div>
        <div className="text-xs text-slate-500">
          {raceDate.raceCount} race{raceDate.raceCount !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {raceDate.hasResults && (
          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            Results
          </span>
        )}
        <ChevronRight className="w-4 h-4 text-slate-300" />
      </div>
    </Link>
  );
}
