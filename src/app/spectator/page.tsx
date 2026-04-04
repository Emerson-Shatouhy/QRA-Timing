import { createClient } from "../../../utils/supabase/server";
import SpectatorDateList from "./SpectatorDateList";

export const dynamic = "force-dynamic";

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

export default async function SpectatorPage() {
  const supabase = await createClient();
  const currentYear = new Date().getFullYear();

  // Get all unique race dates from races table (all years)
  const { data: races } = await supabase
    .from("races")
    .select("event_date, race_status")
    .order("event_date", { ascending: true });

  // Group by date
  const dateMap = new Map<string, { count: number; hasResults: boolean }>();
  races?.forEach((race) => {
    if (!race.event_date) return;
    const existing = dateMap.get(race.event_date) || {
      count: 0,
      hasResults: false,
    };
    existing.count++;
    if (race.race_status === "finished") existing.hasResults = true;
    dateMap.set(race.event_date, existing);
  });

  const raceDates: RaceDate[] = Array.from(dateMap.entries()).map(
    ([date, info]) => {
      const d = new Date(date + "T12:00:00");
      return {
        date,
        displayDate: d.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        dayNumber: d.toLocaleDateString("en-US", { day: "numeric" }),
        weekday: d.toLocaleDateString("en-US", { weekday: "short" }),
        month: d.toLocaleDateString("en-US", { month: "short" }),
        raceCount: info.count,
        hasResults: info.hasResults,
      };
    }
  );

  // Group by year, most recent first
  const yearMap = new Map<number, RaceDate[]>();
  raceDates.forEach((rd) => {
    const year = parseInt(rd.date.substring(0, 4));
    if (!yearMap.has(year)) yearMap.set(year, []);
    yearMap.get(year)!.push(rd);
  });

  const yearGroups: YearGroup[] = Array.from(yearMap.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([year, dates]) => ({ year, dates }));

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Race Results</h1>
          <p className="text-slate-500 mt-1">
            Lake Quinsigamond &middot; Worcester, MA
          </p>
        </div>

        {yearGroups.length === 0 ? (
          <div className="bg-white rounded-xl p-10 text-center border border-slate-200">
            <p className="text-base font-medium text-slate-900 mb-1">No races scheduled yet</p>
            <p className="text-sm text-slate-500">
              Check back soon for the {currentYear} racing schedule.
            </p>
          </div>
        ) : (
          <SpectatorDateList yearGroups={yearGroups} currentYear={currentYear} />
        )}
      </div>
    </div>
  );
}
