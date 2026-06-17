"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/",          label: "Dashboard"   },
  { href: "/passive",   label: "Inv. Pasiva" },
  { href: "/markets",   label: "Mercados"    },
  { href: "/learn",     label: "Aprende"     },
  { href: "/portfolio", label: "Portafolio"  },
  { href: "/mt5",       label: "MT5 Live"    },
  { href: "/platforms", label: "Plataformas" },
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

export default function Sidebar({ open = false }: Readonly<{ open?: boolean; onClose?: () => void }>) {
  const pathname = usePathname();

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
        {NAV.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex", alignItems: "center",
                padding: "8px 10px",
                fontSize: 13, fontWeight: active ? 600 : 400,
                color: active ? FG : MUTED,
                background: active ? "rgba(255,255,255,0.06)" : "transparent",
                textDecoration: "none",
                borderLeft: active ? `2px solid ${FG}` : "2px solid transparent",
                transition: "background 0.12s, color 0.12s",
              }}
            >
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
