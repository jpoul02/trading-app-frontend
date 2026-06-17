"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/",          label: "Dashboard",   icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { href: "/passive",   label: "Inv. Pasiva",  icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { href: "/markets",   label: "Mercados",    icon: "M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" },
  { href: "/learn",     label: "Aprende",     icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  { href: "/portfolio", label: "Portafolio",  icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { href: "/mt5",       label: "MT5 Live",    icon: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" },
  { href: "/platforms", label: "Plataformas", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
];

// Theme tokens — match globals.css dark palette
const BG      = "oklch(0.2046 0 0)";   // --sidebar
const BORDER  = "oklch(0.3407 0 0)";   // --border
const FG      = "oklch(0.9851 0 0)";   // --foreground
const MUTED   = "oklch(0.5555 0 0)";   // --primary (mid gray)
const DIM     = "oklch(0.3715 0 0)";   // --accent
const GREEN   = "#16c784";

function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect width="28" height="28" fill={MUTED} opacity="0.12" />
      <rect width="28" height="28" stroke={BORDER} strokeWidth="1" fill="none" />
      <rect x="5"  y="16" width="4" height="7" fill={DIM} />
      <rect x="5"  y="12" width="4" height="5" fill={MUTED} opacity="0.7" />
      <rect x="12" y="9"  width="4" height="14" fill={DIM} />
      <rect x="12" y="5"  width="4" height="5"  fill={GREEN} />
      <rect x="19" y="11" width="4" height="12" fill={DIM} />
      <rect x="19" y="7"  width="4" height="5"  fill={MUTED} opacity="0.7" />
      <polyline points="7,16 14,9 21,12" stroke={FG} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.4" />
    </svg>
  );
}

function NavIcon({ path }: Readonly<{ path: string }>) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
}

export default function Sidebar({ open = false, onClose }: Readonly<{ open?: boolean; onClose?: () => void }>) {
  const pathname = usePathname();
  void onClose;

  return (
    <aside
      className={`sidebar${open ? " open" : ""}`}
      style={{
        position: "fixed", top: 0, left: 0, height: "100%", width: 240,
        display: "flex", flexDirection: "column", zIndex: 50,
        background: BG,
        borderRight: `1px solid ${BORDER}`,
        fontFamily: "inherit",
      }}
    >
      {/* Logo */}
      <div style={{ padding: "20px 18px 16px", borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <Logo />
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: FG, letterSpacing: "-0.01em", lineHeight: 1.1 }}>
              TradeLearn
            </p>
            <p style={{ fontSize: 10, color: MUTED, fontWeight: 400, marginTop: 1 }}>
              Markets &amp; Finance
            </p>
          </div>
        </div>

        {/* Live indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", background: "rgba(22,199,132,0.07)", border: `1px solid rgba(22,199,132,0.18)` }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: GREEN, boxShadow: `0 0 5px ${GREEN}`, display: "inline-block", flexShrink: 0 }} />
          <span style={{ fontSize: 10, color: GREEN, fontWeight: 500 }}>Datos en vivo</span>
          <span style={{ marginLeft: "auto", fontSize: 9, color: MUTED }}>24/7</span>
        </div>
      </div>

      {/* Nav section label */}
      <div style={{ padding: "16px 18px 6px" }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: DIM, letterSpacing: "0.06em", textTransform: "uppercase" as const }}>
          Navegación
        </span>
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1, padding: "4px 10px", display: "flex", flexDirection: "column", gap: 1 }}>
        {NAV.map(({ href, label, icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 10px",
                fontSize: 13, fontWeight: active ? 600 : 400,
                color: active ? FG : MUTED,
                background: active ? "rgba(255,255,255,0.06)" : "transparent",
                textDecoration: "none",
                borderLeft: active ? `2px solid ${FG}` : "2px solid transparent",
                transition: "background 0.12s, color 0.12s",
              }}
            >
              <span style={{ color: active ? FG : DIM, flexShrink: 0 }}>
                <NavIcon path={icon} />
              </span>
              {label}
              {active && (
                <span style={{ marginLeft: "auto", width: 5, height: 5, background: GREEN, flexShrink: 0 }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom — market activity */}
      <div style={{ padding: "12px 12px 16px", borderTop: `1px solid ${BORDER}` }}>
        <div style={{ padding: "12px", background: "oklch(0.1448 0 0)", border: `1px solid ${BORDER}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 10, color: MUTED, fontWeight: 500 }}>Actividad</span>
            <span style={{ fontSize: 9, color: DIM }}>NYSE · NASDAQ</span>
          </div>

          <svg width="100%" height="28" viewBox="0 0 196 28" preserveAspectRatio="none">
            <defs>
              <linearGradient id="bar-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={MUTED} stopOpacity="0.3" />
                <stop offset="100%" stopColor={FG} stopOpacity="0.6" />
              </linearGradient>
            </defs>
            {(["b0:8","b1:12","b2:10","b3:16","b4:11","b5:18","b6:14","b7:20","b8:15","b9:19","b10:12","b11:17","b12:14","b13:20","b14:16","b15:19","b16:13","b17:21","b18:17","b19:22"] as const).map((entry, i) => {
              const h = Number(entry.split(":")[1]);
              return (
                <rect key={entry} x={i * 9.8 + 1} y={28 - h} width={7} height={h} fill="url(#bar-grad)" opacity={0.3 + (i / 19) * 0.7} />
              );
            })}
          </svg>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ fontSize: 9, color: MUTED }}>Cripto 24/7</span>
            <span style={{ fontSize: 9, color: GREEN, fontWeight: 500 }}>+2.4%</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
