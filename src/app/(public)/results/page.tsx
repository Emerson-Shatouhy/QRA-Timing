import { createClient } from "../../../../utils/supabase/server";
import AllDatesView from "./AllDatesView";

export const dynamic = "force-dynamic";

export default async function ResultsPage() {
  const supabase = await createClient();
  const today = new Date().toLocaleDateString("en-CA");

  const { data: races } = await supabase
    .from("races")
    .select("event_date, race_status")
    .neq("race_type", "break")
    .order("event_date", { ascending: false });

  const dateMap = new Map<string, { count: number; finished: number; hasLive: boolean }>();

  for (const race of races ?? []) {
    if (!race.event_date) continue;
    const existing = dateMap.get(race.event_date) ?? { count: 0, finished: 0, hasLive: false };
    existing.count++;
    if (race.race_status === "finished") existing.finished++;
    if (race.race_status === "started") existing.hasLive = true;
    dateMap.set(race.event_date, existing);
  }

  const dates = Array.from(dateMap.entries()).map(([date, info]) => {
    const d = new Date(date + "T12:00:00");
    return {
      date,
      count: info.count,
      finished: info.finished,
      hasLive: info.hasLive,
      isToday: date === today,
      isPast: date < today,
      isFuture: date > today,
      dayNumber: d.toLocaleDateString("en-US", { day: "numeric" }),
      weekday: d.toLocaleDateString("en-US", { weekday: "short" }),
      month: d.toLocaleDateString("en-US", { month: "short" }),
      year: d.getFullYear(),
      displayDate: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }),
    };
  });

  return <AllDatesView dates={dates} today={today} />;
}
