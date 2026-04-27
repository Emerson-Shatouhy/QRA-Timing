import { createClient } from "../../../../utils/supabase/server";
import Link from "next/link";
import OarBlade from "@/components/OarBlade";

export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const supabase = await createClient();

  const { data: teams } = await supabase
    .from("teams")
    .select("id, team_name, team_short_name, primary_color, category, oarspotter_key")
    .eq("is_local_school", true)
    .order("team_name", { ascending: true })
    .limit(20);

  const STATS = [
    { label: "Founded", value: "1952" },
    { label: "Course", value: "2,000m" },
    { label: "Annual regattas", value: "30+" },
    { label: "Home Teams", value: `${teams?.length ?? "—"}` },
  ];

  const CONTACTS = [
    { heading: "Mailing", body: "QRA, Inc.\nLake Quinsigamond\nWorcester, MA 01605" },
    { heading: "Race Committee", body: "races@qra.org", sub: null },
    { heading: "Officials & Volunteers", body: "volunteer@qra.org", showLogin: true },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "80px 40px 120px" }}>
      <div style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 12, color: "#666", fontWeight: 500, marginBottom: 20 }}>
        About · est. 1952
      </div>

      <h1 style={{ fontSize: 56, lineHeight: 1.0, fontWeight: 500, margin: "0 0 36px", letterSpacing: "-0.03em", maxWidth: 860, textWrap: "balance" as React.CSSProperties["textWrap"] }}>
        A volunteer association of clubs, schools, and rowers around the lake.
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 64, marginTop: 32 }}>
        <div>
          <p style={{ fontSize: 18, lineHeight: 1.55, color: "#0e0e0f", margin: "0 0 20px", letterSpacing: "-0.005em" }}>
            The Quinsigamond Rowing Association was founded in 1952 to coordinate practice
            schedules and host regattas on Lake Quinsigamond — a four-mile glacial lake on
            the eastern edge of Worcester, Massachusetts. Today the QRA runs more than thirty
            regattas a year and serves as the home water for a dozen clubs and schools.
          </p>
          <p style={{ fontSize: 15.5, lineHeight: 1.65, color: "#666", margin: "0 0 20px" }}>
            We sit at the heart of New England rowing because the conditions are extraordinary:
            a north–south orientation that breaks prevailing winds, a buoyed 2,000-metre course,
            and a finish line three minutes from the city.
          </p>
          <p style={{ fontSize: 15.5, lineHeight: 1.65, color: "#666", margin: 0 }}>
            The association is run by volunteers — referees, timing officials, dock crews,
            and the dozens of parents who drive trailers and cook hot dogs. If you want to
            get involved, the easiest way is to show up at a regatta and ask.
          </p>
        </div>

        <div>
          <div style={{ border: "1px solid rgba(20,20,20,0.08)", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
              {STATS.map(({ label, value }, i) => (
                <div key={label} style={{ padding: "20px 20px", borderRight: i % 2 === 0 ? "1px solid rgba(20,20,20,0.08)" : "none", borderBottom: i < 2 ? "1px solid rgba(20,20,20,0.08)" : "none", background: "#fff" }}>
                  <div style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 11, color: "#999", marginBottom: 8 }}>{label}</div>
                  <div style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em" }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {teams && teams.length > 0 && (
        <div style={{ marginTop: 80 }}>
          <div style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 12, color: "#666", fontWeight: 500, marginBottom: 14 }}>Home Teams</div>
          <div style={{ height: 1, background: "rgba(20,20,20,0.08)", marginBottom: 8 }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", columnGap: 48 }}>
            {teams.map((team) => (
              <div key={team.id} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 0", borderBottom: "1px solid rgba(20,20,20,0.06)" }}>
                {team.oarspotter_key ? (
                  <OarBlade oarspotterKey={team.oarspotter_key} size={28} />
                ) : (
                  <span style={{ width: 36, height: 36, background: team.primary_color || "#1f3b6e", color: "#fff", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 600, flexShrink: 0 }}>
                    {(team.team_short_name || team.team_name).slice(0, 3).toUpperCase()}
                  </span>
                )}
                <span style={{ fontSize: 16, flex: 1, letterSpacing: "-0.01em" }}>{team.team_name}</span>
                {team.category && (
                  <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 11, color: "#999" }}>{team.category}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 64 }}>
        <div style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 12, color: "#666", fontWeight: 500, marginBottom: 14 }}>Contact</div>
        <div style={{ height: 1, background: "rgba(20,20,20,0.08)", marginBottom: 24 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32 }}>
          {CONTACTS.map(({ heading, body, showLogin }) => (
            <div key={heading}>
              <div style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 11, color: "#999", marginBottom: 8 }}>{heading}</div>
              <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-line" }}>{body}</div>
              {showLogin && (
                <Link href="/login" style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 13, color: "#7a1e2b", textDecoration: "none", marginTop: 8, display: "inline-block" }}>
                  Officials login →
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
