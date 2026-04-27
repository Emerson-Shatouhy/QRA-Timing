import { createClient } from "../../../utils/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SpectatorHeroPage() {
  const supabase = await createClient();
  const today = new Date().toLocaleDateString("en-CA");

  const { data: liveRace } = await supabase
    .from("races")
    .select("id, race_name")
    .eq("race_status", "started")
    .eq("event_date", today)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  const { data: nextRace } = await supabase
    .from("races")
    .select("id, race_name")
    .in("race_status", ["scheduled", "ready"])
    .eq("event_date", today)
    .order("sort_order", { ascending: true })
    .limit(1)
    .maybeSingle();

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "120px 40px 160px" }}>
      <div style={{ maxWidth: 820 }}>
        {/* Live ticker */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40, opacity: 0.85 }}>
          <span className="relative inline-flex h-[6px] w-[6px]">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7a1e2b] opacity-75" />
            <span className="relative inline-flex rounded-full h-[6px] w-[6px] bg-[#7a1e2b]" />
          </span>
          <Link
            href="/live"
            style={{
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: 12,
              color: "#666",
              textDecoration: "none",
              letterSpacing: "-0.005em",
            }}
          >
            {liveRace
              ? `Live now · ${liveRace.race_name} →`
              : nextRace
              ? `Up next · ${nextRace.race_name} →`
              : "No race on the water right now →"}
          </Link>
        </div>

        <h1
          style={{
            fontSize: 52,
            lineHeight: 1.1,
            fontWeight: 500,
            margin: "0 0 24px",
            letterSpacing: "-0.025em",
            color: "#0e0e0f",
            textWrap: "balance" as React.CSSProperties["textWrap"],
            maxWidth: 680,
          }}
        >
          Rowing on Lake Quinsigamond, since 1952.
        </h1>

        <p
          style={{
            fontSize: 17,
            lineHeight: 1.55,
            color: "#666",
            maxWidth: 520,
            margin: "0 0 36px",
            letterSpacing: "-0.005em",
          }}
        >
          The QRA hosts more than thirty regattas a year on the calmest 2,000 metres in New England.
        </p>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <Link
            href="/schedule"
            style={{
              background: "#0e0e0f",
              color: "#fff",
              padding: "12px 20px",
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
              letterSpacing: "-0.005em",
            }}
          >
            Today&apos;s schedule
          </Link>
          <Link
            href="/about"
            style={{
              background: "transparent",
              color: "#0e0e0f",
              padding: "11px 18px",
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
              letterSpacing: "-0.005em",
              boxShadow: "inset 0 0 0 1px rgba(20,20,20,0.14)",
            }}
          >
            About QRA
          </Link>
        </div>
      </div>
    </div>
  );
}
