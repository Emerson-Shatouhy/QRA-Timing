import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "QRA · Quinsigamond Rowing Association",
  description:
    "Live race results, schedule, and information for the Quinsigamond Rowing Association — Lake Quinsigamond, Worcester MA",
};

const FOOTER_GROUPS = [
  {
    heading: "Race day",
    items: [
      { label: "Live board", href: "/live" },
      { label: "Schedule", href: "/schedule" },
      { label: "Results", href: "/results" },
    ],
  },
  {
    heading: "About",
    items: [
      { label: "QRA", href: "/about" },
      { label: "Member clubs", href: "/about" },
      { label: "Course", href: "/about" },
    ],
  },
  {
    heading: "Officials",
    items: [
      { label: "Sign in", href: "/login" },
      { label: "Volunteer", href: "/about" },
      { label: "Race committee", href: "/about" },
    ],
  },
];

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#fafaf8", color: "#0e0e0f" }}>
      <main>{children}</main>

      <footer style={{ borderTop: "1px solid rgba(20,20,20,0.06)", marginTop: 80 }}>
        <div
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            padding: "56px 40px",
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
            gap: 40,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: "#7a1e2b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                Q
              </div>
              <span style={{ fontWeight: 500, fontSize: 15, letterSpacing: "-0.02em" }}>
                Quinsigamond Rowing
              </span>
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.55, color: "#666", maxWidth: 300 }}>
              The Quinsigamond Rowing Association · Worcester, Massachusetts · hosting regattas on
              Lake Quinsigamond since 1952.
            </p>
          </div>

          {FOOTER_GROUPS.map((group) => (
            <div key={group.heading}>
              <div
                style={{
                  fontFamily: "var(--font-geist-mono), monospace",
                  fontSize: 11,
                  color: "#999",
                  marginBottom: 14,
                  fontWeight: 500,
                }}
              >
                {group.heading}
              </div>
              {group.items.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  style={{ display: "block", fontSize: 14, padding: "4px 0", color: "#0e0e0f", textDecoration: "none" }}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </div>

        <div
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            padding: "24px 40px",
            borderTop: "1px solid rgba(20,20,20,0.06)",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 11, color: "#999" }}>
            © 1952–{new Date().getFullYear()} Quinsigamond Rowing Association, Inc.
          </span>
          <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontSize: 11, color: "#999" }}>
            Developed by Emerson Shatouhy.{" "}
          </span>
        </div>
      </footer>
    </div>
  );
}
