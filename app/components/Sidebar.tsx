"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard } from "lucide-react";
import { useMarketActivity, StockBar } from "../context/MarketActivityContext";

const NAV: Array<{ href: string; label: string; icon?: React.ElementType }> = [
  { href: "/",          label: "Dashboard"   },
  { href: "/passive",   label: "Inv. Pasiva" },
  { href: "/markets",   label: "Mercados"    },
  { href: "/learn",     label: "Aprende"     },
  { href: "/cuentas",   label: "Cuentas",    icon: CreditCard },
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

function isNYSEOpen(): boolean {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false;
  // ET ≈ UTC-4 (EDT, Mar–Nov). Simple approximation.
  const etHour = now.getUTCHours() - 4;
  const etMin  = now.getUTCMinutes();
  const total  = etHour * 60 + etMin;
  return total >= 9 * 60 + 30 && total < 16 * 60;
}

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
  const pathname    = usePathname();
  const { stockBars, cryptoChange } = useMarketActivity();
  const [tab, setTab]           = useState<"nyse" | "crypto">("nyse");
  const [showTip, setShowTip]   = useState(false);
  const nyseOpen = isNYSEOpen();

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
        <p style={{ fontSize: 9, fontWeight: 700, color: "#00d4aa", letterSpacing: "0.2em", textTransform: "uppercase" as const, marginBottom: 8 }}>
          JOTAPOL
        </p>
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
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 10px",
                fontSize: 13, fontWeight: active ? 600 : 400,
                color: active ? FG : MUTED,
                background: active ? "rgba(255,255,255,0.06)" : "transparent",
                textDecoration: "none",
                borderLeft: active ? `2px solid ${FG}` : "2px solid transparent",
                transition: "background 0.12s, color 0.12s",
              }}
            >
              {Icon && <Icon size={12} style={{ flexShrink: 0, opacity: active ? 1 : 0.55 }} />}
              {label}
              {active && (
                <span style={{ marginLeft: "auto", width: 5, height: 5, background: GREEN, flexShrink: 0 }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Copyright */}
      <div style={{ padding: "8px 12px", textAlign: "center" as const }}>
        <p style={{ fontSize: 10, color: MUTED, lineHeight: 1.5 }}>
          © 2026 JOTAPOL<br />
          Todos los derechos reservados
        </p>
      </div>

      {/* Bottom — market activity */}
      <div style={{ padding: "12px 12px 16px", borderTop: `1px solid ${BORDER}` }}>
        <div style={{ padding: "12px", background: "oklch(0.1448 0 0)", border: `1px solid ${BORDER}` }}>

          {/* Header: "Actividad" + tooltip icon */}
          <div style={{ display: "flex", alignItems: "center", marginBottom: 8, gap: 4 }}>
            <span style={{ fontSize: 10, color: MUTED, fontWeight: 500 }}>Actividad</span>
            <div style={{ position: "relative", display: "inline-flex" }}>
              <span
                onMouseEnter={() => setShowTip(true)}
                onMouseLeave={() => setShowTip(false)}
                style={{ fontSize: 9, color: DIM, cursor: "default", userSelect: "none", lineHeight: 1 }}
              >
                ⓘ
              </span>
              {showTip && (
                <div style={{
                  position: "absolute", bottom: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)",
                  background: "oklch(0.25 0 0)", border: `1px solid ${BORDER}`,
                  padding: "6px 8px", width: 180, zIndex: 100,
                  fontSize: 9, color: FG, lineHeight: 1.5, pointerEvents: "none",
                }}>
                  Muestra la actividad de mercado por hora. NYSE/NASDAQ opera Lun–Vie 9:30–16:00 ET. Cripto opera las 24 horas.
                  {/* arrow */}
                  <span style={{
                    position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
                    borderLeft: "5px solid transparent", borderRight: "5px solid transparent",
                    borderTop: `5px solid ${BORDER}`, width: 0, height: 0, display: "block",
                  }} />
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
            {/* NYSE tab */}
            <button
              onClick={() => setTab("nyse")}
              style={{
                flex: 1, padding: "3px 0", fontSize: 9, fontWeight: 500, cursor: "pointer",
                border: "none", background: tab === "nyse" ? "rgba(255,255,255,0.08)" : "transparent",
                color: tab === "nyse" ? FG : DIM,
                borderBottom: tab === "nyse" ? `1px solid ${FG}` : `1px solid transparent`,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
              }}
            >
              NYSE · NASDAQ
              {tab === "nyse" && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                  <span style={{
                    width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
                    background: nyseOpen ? GREEN : RED,
                    boxShadow: nyseOpen ? `0 0 4px ${GREEN}` : `0 0 4px ${RED}`,
                  }} />
                  <span style={{ fontSize: 8, color: nyseOpen ? GREEN : RED, fontWeight: 600 }}>
                    {nyseOpen ? "ABIERTO" : "CERRADO"}
                  </span>
                </span>
              )}
            </button>

            {/* Crypto tab */}
            <button
              onClick={() => setTab("crypto")}
              style={{
                flex: 1, padding: "3px 0", fontSize: 9, fontWeight: 500, cursor: "pointer",
                border: "none", background: tab === "crypto" ? "rgba(255,255,255,0.08)" : "transparent",
                color: tab === "crypto" ? FG : DIM,
                borderBottom: tab === "crypto" ? `1px solid ${FG}` : `1px solid transparent`,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
              }}
            >
              Cripto 24/7
              {tab === "crypto" && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                  <span style={{
                    width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
                    background: GREEN, boxShadow: `0 0 4px ${GREEN}`,
                  }} />
                  <span style={{ fontSize: 8, color: GREEN, fontWeight: 600 }}>ABIERTO</span>
                </span>
              )}
            </button>
          </div>

          {/* Tab content */}
          {tab === "nyse" ? (
            nyseOpen ? (
              <ActivityBars bars={stockBars} />
            ) : (
              <div style={{ height: 28, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.45, position: "relative" }}>
                <ActivityBars bars={stockBars} />
                <span style={{
                  position: "absolute", fontSize: 9, color: RED, fontWeight: 600,
                  background: "oklch(0.1448 0 0 / 0.85)", padding: "1px 6px",
                  letterSpacing: "0.06em",
                }}>
                  Mercado cerrado
                </span>
              </div>
            )
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", height: 28, paddingTop: 4 }}>
              <span style={{ fontSize: 9, color: MUTED }}>Variación 24h</span>
              <CryptoChangePct change={cryptoChange} />
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
