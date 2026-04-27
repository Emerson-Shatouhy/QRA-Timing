import { createClient } from "../../../../utils/supabase/server";
import ScheduleView from "./ScheduleView";

export const dynamic = "force-dynamic";

type RaceRow = {
  id: number;
  race_name: string;
  scheduled_start: string | null;
  race_status: string;
  race_type: string;
  event_date: string;
  sort_order: number | null;
  host_team: { team_name: string } | null;
};

export default async function SchedulePage() {
  const supabase = await createClient();
  const today = new Date().toLocaleDateString("en-CA");

  const { data: allRaces } = await supabase
    .from("races")
    .select(
      `id, race_name, scheduled_start, race_status, race_type, event_date, sort_order,
       host_team:teams!races_host_team_id_fkey(team_name)`
    )
    .neq("race_type", "break")
    .order("event_date", { ascending: false })
    .order("sort_order", { ascending: true });

  const byDate = new Map<string, RaceRow[]>();
  for (const race of allRaces ?? []) {
    if (!byDate.has(race.event_date)) byDate.set(race.event_date, []);
    byDate.get(race.event_date)!.push(race as RaceRow);
  }

  const dates = Array.from(byDate.entries()).map(([date, races]) => ({
    date,
    races,
    isToday: date === today,
    isPast: date < today,
    isFuture: date > today,
    displayDate: new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
    shortDate: new Date(date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));

  return <ScheduleView dates={dates} today={today} />;
}
