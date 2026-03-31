"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  ChevronRight,
  Trophy,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface RaceDate {
  date: string;
  displayDate: string;
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
  // Past years start collapsed
  const [expandedYears, setExpandedYears] = useState<Set<number>>(() => {
    const expanded = new Set<number>();
    // Auto-expand the current year
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

        // Split into past and upcoming for current year
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
              className="w-full flex items-center justify-between mb-3 group"
            >
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">
                  {group.year}
                </h2>
                <span className="text-sm text-gray-400">
                  {group.dates.length} date{group.dates.length !== 1 ? "s" : ""}{" "}
                  &middot; {totalRaces} race{totalRaces !== 1 ? "s" : ""}
                  {totalResults > 0 && (
                    <span className="ml-1 text-green-600">
                      &middot; {totalResults} with results
                    </span>
                  )}
                </span>
              </div>
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
              )}
            </button>

            {isExpanded && (
              <div className="space-y-4">
                {isCurrentYear && upcomingDates.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Upcoming
                    </h3>
                    <div className="space-y-2">
                      {upcomingDates.map((d) => (
                        <DateCard key={d.date} raceDate={d} />
                      ))}
                    </div>
                  </div>
                )}

                {pastDates.length > 0 && (
                  <div>
                    {isCurrentYear && upcomingDates.length > 0 && (
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        Past Results
                      </h3>
                    )}
                    <div className="space-y-2">
                      {[...pastDates].reverse().map((d) => (
                        <DateCard key={d.date} raceDate={d} />
                      ))}
                    </div>
                  </div>
                )}

                {/* For past years, all dates are "past" so show them if no pastDates matched (future year edge case) */}
                {!isCurrentYear && pastDates.length === 0 && (
                  <div className="space-y-2">
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
      className="flex items-center justify-between bg-white rounded-lg border p-4 hover:bg-gray-50 hover:border-blue-200 transition-colors active:bg-blue-50"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
          {raceDate.hasResults ? (
            <Trophy className="w-5 h-5 text-blue-600" />
          ) : (
            <Calendar className="w-5 h-5 text-gray-400" />
          )}
        </div>
        <div>
          <div className="font-semibold text-gray-900">
            {raceDate.displayDate}
          </div>
          <div className="text-sm text-gray-500">
            {raceDate.raceCount} race{raceDate.raceCount !== 1 ? "s" : ""}
            {raceDate.hasResults && (
              <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                Results
              </span>
            )}
          </div>
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-400" />
    </Link>
  );
}
