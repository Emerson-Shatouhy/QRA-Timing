import { createClient } from "../../../utils/supabase/server";
import SpectatorDateList from "./SpectatorDateList";

export const dynamic = "force-dynamic";

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
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Race Results</h1>
      <p className="text-gray-500 mb-6">
        Lake Quinsigamond &middot; Worcester, MA
      </p>

      {yearGroups.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center text-gray-500">
          <p className="text-lg mb-1">No races scheduled yet</p>
          <p className="text-sm">
            Check back soon for the {currentYear} racing schedule.
          </p>
        </div>
      ) : (
        <SpectatorDateList yearGroups={yearGroups} currentYear={currentYear} />
      )}
    </div>
  );
}
