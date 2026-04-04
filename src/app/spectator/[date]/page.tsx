import { createClient } from "../../../../utils/supabase/server";
import SpectatorRaceGrid from "./SpectatorRaceGrid";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ date: string }>;
}

export default async function SpectatorDatePage({ params }: PageProps) {
  const { date } = await params;
  const supabase = await createClient();

  // Fetch all races for this date (excluding breaks)
  const { data: races, error } = await supabase
    .from("races")
    .select(
      `
      id,
      race_name,
      scheduled_start,
      race_status,
      race_type,
      gender,
      boat_class,
      level,
      host_team_id,
      sort_order,
      host_team:teams!races_host_team_id_fkey(team_name)
    `
    )
    .eq("event_date", date)
    .neq("race_type", "break")
    .order("scheduled_start", { ascending: true });

  // Collect unique host teams for the filter
  const hostTeams: { id: number; name: string }[] = [];
  const seenHosts = new Set<number>();
  races?.forEach((race: any) => {
    if (race.host_team_id && !seenHosts.has(race.host_team_id)) {
      seenHosts.add(race.host_team_id);
      hostTeams.push({
        id: race.host_team_id,
        name: race.host_team?.team_name || "Unknown",
      });
    }
  });

  // Format the date for display
  const displayDate = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Link
          href="/spectator"
          className="text-sm text-slate-500 hover:text-slate-900 mb-4 inline-flex items-center gap-1 transition-colors"
        >
          &larr; All Dates
        </Link>

        <h1 className="text-2xl font-bold text-slate-900 mb-1">{displayDate}</h1>
        <p className="text-slate-500 mb-6 text-sm">
          {races?.length || 0} race{(races?.length || 0) !== 1 ? "s" : ""} on
          Lake Quinsigamond
        </p>

        {error && (
          <div className="bg-red-50 rounded-lg border border-red-200 p-4 mb-6 text-sm text-red-700">
            <p className="font-semibold">Query error:</p>
            <p>{error.message}</p>
          </div>
        )}

        {!races || races.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-500">
            <p className="font-medium mb-1 text-slate-900">No races found for this date</p>
            <p className="text-sm">Results will appear here once races begin.</p>
          </div>
        ) : (
          <SpectatorRaceGrid
            races={races as any[]}
            hostTeams={hostTeams}
            date={date}
          />
        )}
      </div>
    </div>
  );
}
