"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMarketActivity, StockBar } from "../context/MarketActivityContext";

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

const RED = "#ea3943";

type Maybe<T> = T | null | undefined;

function ActivityBars({ bars }: { bars: Maybe<StockBar[]> }) {
  if (bars === null) {
    return (
      <div style={{ height: 28, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 9, color: DIM, letterSpacing: "0.06em" }}>Sin datos</span>
      </div>
    );
  }
  if (bars === undefined || bars.length === 0) {
    return (
      <svg width="100%" height="28" viewBox="0 0 196 28" preserveAspectRatio="none">
        {Array.from({ length: 12 }, (_, i) => {
          const h = 4 + (i % 6) * 3;
          return <rect key={i} x={i * 16 + 2} y={28 - h} width={12} height={h} fill={DIM} opacity={0.25} />;
        })}
      </svg>
    );
  }
  const N = bars.length;
  const gap = 2;
  const barW = Math.max(3, Math.floor((194 - gap * (N - 1)) / N));
  const maxAbs = Math.max(...bars.map(b => Math.abs(b.change)), 0.01);
  return (
    <svg width="100%" height="28" viewBox="0 0 196 28" preserveAspectRatio="none">
      {bars.map((b, i) => {
        const h = Math.max(2, (Math.abs(b.change) / maxAbs) * 22);
        const color = b.change > 0 ? GREEN : b.change < 0 ? RED : DIM;
        return (
          <rect
            key={i}
            x={1 + i * (barW + gap)}
            y={28 - h}
            width={barW}
            height={h}
            fill={color}
            opacity={0.5 + (i / Math.max(N - 1, 1)) * 0.5}
          />
        );
      })}
    </svg>
  );
}

function CryptoChangePct({ change }: { change: Maybe<number> }) {
  if (change === null)    return <span style={{ fontSize: 9, color: DIM }}>Sin datos</span>;
  if (change === undefined) return <span style={{ fontSize: 9, color: DIM }}>—</span>;
  const c = change >= 0 ? GREEN : RED;
  return (
    <span style={{ fontSize: 9, color: c, fontWeight: 500 }}>
      {change >= 0 ? "+" : ""}{change.toFixed(2)}%
    </span>
  );
}

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
  const { stockBars, cryptoChange } = useMarketActivity();

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

          <ActivityBars bars={stockBars} />

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ fontSize: 9, color: MUTED }}>Cripto 24/7</span>
            <CryptoChangePct change={cryptoChange} />
          </div>
        </div>
      </div>
    </aside>
  );
}
