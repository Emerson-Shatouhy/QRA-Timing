"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

function LiveDot() {
  return (
    <span className="relative inline-flex h-[6px] w-[6px]">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7a1e2b] opacity-75" />
      <span className="relative inline-flex rounded-full h-[6px] w-[6px] bg-[#7a1e2b]" />
    </span>
  );
}

const NAV_LINKS = [
  { href: "/spectator", label: "Home", exact: true },
  { href: "/spectator/live", label: "Live", dot: true },
  { href: "/spectator/schedule", label: "Schedule" },
  { href: "/spectator/results", label: "Results" },
  { href: "/spectator/about", label: "About" },
];

export default function SpectatorNav() {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname?.startsWith(href) ?? false;
  };

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(250,250,248,0.88)",
        backdropFilter: "saturate(140%) blur(12px)",
        WebkitBackdropFilter: "saturate(140%) blur(12px)",
        borderBottom: "1px solid rgba(20,20,20,0.06)",
      }}
    >
      <div
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "0 40px",
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link
          href="/spectator"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
            color: "#0e0e0f",
          }}
        >
          <Image
            src="/qralogo.gif"
            alt="QRA"
            width={26}
            height={26}
            style={{ borderRadius: "50%" }}
          />
          <span style={{ fontWeight: 500, fontSize: 15, letterSpacing: "-0.02em" }}>
            Quinsigamond Rowing
          </span>
        </Link>

        <nav style={{ display: "flex", alignItems: "center", gap: 2 }}>
          {NAV_LINKS.map((link) => {
            const active = isActive(link.href, link.exact);
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  padding: "7px 13px",
                  fontSize: 14,
                  fontWeight: 500,
                  letterSpacing: "-0.005em",
                  color: active ? "#0e0e0f" : "#3a3a3a",
                  background: active ? "rgba(20,20,20,0.07)" : "transparent",
                  borderRadius: 6,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  whiteSpace: "nowrap",
                }}
              >
                {link.label}
                {link.dot && <LiveDot />}
              </Link>
            );
          })}
          <span style={{ width: 12 }} />
          <Link
            href="/login"
            style={{
              background: "#0e0e0f",
              color: "#fff",
              padding: "7px 15px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "-0.005em",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            Officials login
          </Link>
        </nav>
      </div>
    </header>
  );
}
