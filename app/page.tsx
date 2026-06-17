"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, animate } from "framer-motion";
import api from "@/lib/api";
import { useMarketActivity } from "./context/MarketActivityContext";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface CryptoPrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap?: number;
}

interface Stock {
  symbol: string;
  name?: string;
  price: number;
  change_pct_24h: number;
}

interface FearGreed {
  value: number;
  classification: string;
}

interface TrendingItem {
  id?: string;
  name?: string;
  symbol?: string;
  large?: string;
  item?: { id: string; name: string; symbol: string; thumb: string; large?: string };
}

interface GlobalStats {
  btc_dominance: number;
  total_market_cap: number;
  total_volume_24h: number;
  active_cryptocurrencies: number;
}

interface Alert {
  id: string;
  symbol: string;
  condition: 'above' | 'below';
  price: number;
  triggered: boolean;
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const ACCENT = "oklch(0.5555 0 0)";  // --primary: neutral mid-gray
const GREEN  = "#16c784";             // TradingView bullish green
const RED    = "#ea3943";             // TradingView bearish red
const BLUE   = "oklch(0.7090 0 0)";  // --muted-foreground: lighter gray
const TEXT   = "oklch(0.9851 0 0)";  // --foreground
const TEXT2  = "oklch(0.7090 0 0)";  // --muted-foreground
const MUTED  = "oklch(0.5555 0 0)";  // --primary
const DIM    = "oklch(0.3715 0 0)";  // --accent
const CARD   = "oklch(0.2134 0 0)";  // --card
const CARD2  = "oklch(0.1448 0 0)";  // --background
const BORDER = "oklch(0.3407 0 0)";  // --border

const AMBER  = ACCENT;

const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1];

const TERM: React.CSSProperties = {
  background: CARD,
  border: `1px solid ${BORDER}`,
  borderRadius: 0,
  boxShadow: "none",
};

function brutalCard(color: string): React.CSSProperties {
  return {
    background: CARD2,
    border: `1px solid ${BORDER}`,
    borderLeft: `3px solid ${color}`,
    borderRadius: 0,
    boxShadow: "none",
  };
}

function changeColor(v: number) { return v >= 0 ? GREEN : RED; }

function formatLargeNumber(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

function fearColor(v: number) {
  if (v <= 25) return RED;
  if (v <= 45) return "#f97316";
  if (v <= 55) return "#eab308";
  return GREEN;
}

// ─── Framer variants ──────────────────────────────────────────────────────────

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055 } },
};

const cardAnim = {
  hidden: { opacity: 0, y: 16, scale: 0.985 },
  show:   { opacity: 1, y: 0, scale: 1, transition: { duration: 0.48, ease: EASE } },
};

// ─── SVG atoms ────────────────────────────────────────────────────────────────

function Sparkline({ symbol, change, width = 80, height = 28 }: { symbol: string; change: number; width?: number; height?: number }) {
  const seed = Array.from(symbol).reduce((a, c) => a + c.charCodeAt(0), 0);
  const N = 20;
  const values = Array.from({ length: N }, (_, i) => {
    const t = i / (N - 1);
    const trend = change * t * 0.006;
    return 0.5 + trend + Math.sin((i + seed) * 0.72) * 0.22 + Math.cos((i + seed * 0.3) * 1.4) * 0.12;
  });
  const min = Math.min(...values), max = Math.max(...values), range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (N - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
  });
  const path = pts.join(" ");
  const area = `${path} L ${width} ${height} L 0 ${height} Z`;
  const c = changeColor(change);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id={`sg-${symbol}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.25" />
          <stop offset="100%" stopColor={c} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${symbol})`} />
      <path d={path} stroke={c} strokeWidth="1.5" fill="none" strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  );
}

function HeroChart() {
  const raw = [42, 38, 45, 40, 52, 48, 58, 54, 62, 56, 70, 64, 72, 68, 80, 74, 82, 78, 90, 84];
  const w = 240, h = 90;
  const min = Math.min(...raw), max = Math.max(...raw);
  const pts = raw.map((v, i) => {
    const x = (i / (raw.length - 1)) * w;
    const y = h - ((v - min) / (max - min)) * (h - 8) - 4;
    return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
  });
  const path = pts.join(" ");
  const area = `${path} L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg
      width={w} height={h} viewBox={`0 0 ${w} ${h}`}
      style={{ position: "absolute", bottom: 0, right: 0, opacity: 0.14, pointerEvents: "none" }}
    >
      <defs>
        <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={AMBER} stopOpacity="0.6" />
          <stop offset="100%" stopColor={AMBER} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#hg)" />
      <path d={path} stroke={AMBER} strokeWidth="1.5" fill="none" strokeLinecap="square" />
      <rect x={w - 6} y={2} width={6} height={6} fill={AMBER} />
    </svg>
  );
}

function FearArc({ value }: { value: number }) {
  const R = 72, cx = 88, cy = 88;
  const toRad = (d: number) => (d * Math.PI) / 180;
  function arc(s: number, e: number) {
    const r1 = toRad(s), r2 = toRad(e);
    const x1 = cx + R * Math.cos(r1), y1 = cy + R * Math.sin(r1);
    const x2 = cx + R * Math.cos(r2), y2 = cy + R * Math.sin(r2);
    return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${e - s > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  }
  const start = 210, sweep = 120;
  const bgPath   = arc(start, start + sweep);
  const fillPath = arc(start, start + (value / 100) * sweep);
  const arcLen   = (sweep / 360) * 2 * Math.PI * R;
  const color    = fearColor(value);
  return (
    <svg width="176" height="100" viewBox="0 0 176 100">
      {[0, 25, 50, 75, 100].map((v) => {
        const a = toRad(start + (v / 100) * sweep);
        const x1 = cx + (R - 8) * Math.cos(a), y1 = cy + (R - 8) * Math.sin(a);
        const x2 = cx + (R + 2) * Math.cos(a), y2 = cy + (R + 2) * Math.sin(a);
        return <line key={v} x1={x1} y1={y1} x2={x2} y2={y2} stroke={DIM} strokeWidth="1" />;
      })}
      <path d={bgPath} fill="none" stroke={DIM} strokeWidth="10" strokeLinecap="butt" />
      <motion.path
        d={fillPath} fill="none" stroke={color} strokeWidth="10" strokeLinecap="butt"
        strokeDasharray={arcLen}
        initial={{ strokeDashoffset: arcLen }}
        animate={{ strokeDashoffset: 0 }}
        transition={{ duration: 1.6, ease: EASE, delay: 0.4 }}
        style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
      />
      <text x="88" y="80" textAnchor="middle" fill={color} fontSize="28" fontWeight="800" fontFamily="inherit" letterSpacing="-1">
        {value}
      </text>
    </svg>
  );
}

// ─── UI atoms ─────────────────────────────────────────────────────────────────

function ChangeBadge({ value }: { value: number }) {
  const c = changeColor(value);
  const pos = value >= 0;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      padding: "2px 7px",
      color: c, fontSize: 11, fontWeight: 600,
      background: `${c}12`, borderRadius: 0, flexShrink: 0,
    }}>
      {pos ? "↑" : "↓"} {Math.abs(value)?.toFixed(2)}%
    </span>
  );
}

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="relative inline-block group cursor-help ml-2 align-middle">
      <span style={{ fontSize: 9, color: DIM, fontWeight: 700, lineHeight: 1, border: `1px solid ${DIM}`, padding: "0 3px", display: "inline-block" }}>?</span>
      <span
        className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 p-2 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-20 leading-relaxed"
        style={{ background: CARD, border: `1px solid ${BORDER}`, color: TEXT2, fontSize: 10, borderRadius: 0 }}
      >
        {text}
      </span>
    </span>
  );
}

function SectionLabel({ children, tooltip }: { children: React.ReactNode; tooltip?: string }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 600, color: MUTED, marginBottom: 14, letterSpacing: "0.01em", display: "flex", alignItems: "center" }}>
      {children}
      {tooltip && <InfoTooltip text={tooltip} />}
    </p>
  );
}

function PulseLoader() {
  return (
    <div style={{ height: 4, background: "rgba(255,255,255,0.04)", overflow: "hidden", margin: "8px 0", borderRadius: 0 }}>
      <motion.div
        animate={{ x: ["-100%", "200%"] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        style={{ width: "40%", height: "100%", background: `${MUTED}40`, borderRadius: 0 }}
      />
    </div>
  );
}

function CountUp({ to, prefix = "$" }: { to: number; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!ref.current || !to) return;
    const ctrl = animate(0, to, {
      duration: 1.5, ease: EASE,
      onUpdate(v) {
        if (ref.current) ref.current.textContent = prefix + Math.round(v).toLocaleString("en-US");
      },
    });
    return ctrl.stop;
  }, [to, prefix]);
  return <span ref={ref}>{prefix}0</span>;
}

// ─── Market Ticker ────────────────────────────────────────────────────────────

function MarketTicker({ cryptos }: { cryptos: CryptoPrice[] }) {
  if (!cryptos.length) return null;
  const items = [...cryptos, ...cryptos, ...cryptos];
  return (
    <div style={{ ...TERM, marginBottom: 18, overflow: "hidden", height: 38, display: "flex", alignItems: "center" }}>
      <div style={{ flexShrink: 0, padding: "0 14px", borderRight: `1px solid ${BORDER}`, height: "100%", display: "flex", alignItems: "center", gap: 6, background: `${CARD2}` }}>
        <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 2, repeat: Infinity }} style={{ width: 5, height: 5, borderRadius: "50%", background: GREEN, display: "inline-block" }} />
        <span style={{ fontSize: 11, color: TEXT2, fontWeight: 500 }}>Live</span>
      </div>
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 32, background: `linear-gradient(90deg, ${CARD} 60%, transparent)`, zIndex: 2, pointerEvents: "none" }} />
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 32, background: `linear-gradient(-90deg, ${CARD} 60%, transparent)`, zIndex: 2, pointerEvents: "none" }} />
        <motion.div
          animate={{ x: ["0%", "-33.33%"] }}
          transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
          style={{ display: "flex", whiteSpace: "nowrap" as const }}
        >
          {items.map((c, i) => (
            <span key={`${c.id}-${i}`} style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "0 20px", borderRight: `1px solid ${DIM}40` }}>
              <span style={{ color: DIM, fontSize: 9, fontWeight: 700, letterSpacing: "0.14em" }}>{c.symbol?.toUpperCase()}</span>
              <span style={{ color: TEXT, fontSize: 11, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>${c.current_price?.toLocaleString("en-US", { maximumFractionDigits: 0 })}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: changeColor(c.price_change_percentage_24h) }}>
                {c.price_change_percentage_24h >= 0 ? "+" : ""}{c.price_change_percentage_24h?.toFixed(2)}%
              </span>
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}

// ─── Crypto mini card ─────────────────────────────────────────────────────────

function CryptoMini({ c }: { c: CryptoPrice }) {
  const pos = c.price_change_percentage_24h >= 0;
  return (
    <div style={{ padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div>
          <span style={{ fontSize: 10, fontWeight: 700, color: AMBER, letterSpacing: "0.12em" }}>{c.symbol?.toUpperCase()}</span>
          <p style={{ color: DIM, fontSize: 9, marginTop: 2, letterSpacing: "0.06em" }}>{c.name}</p>
        </div>
        <ChangeBadge value={c.price_change_percentage_24h} />
      </div>
      <p style={{ color: pos ? "#b8f0d6" : "#ffc0cc", fontWeight: 700, fontSize: 17, letterSpacing: "0.02em", marginBottom: 10, fontVariantNumeric: "tabular-nums" }}>
        ${c.current_price?.toLocaleString("en-US")}
      </p>
      <Sparkline symbol={c.symbol} change={c.price_change_percentage_24h} width={110} height={26} />
    </div>
  );
}

// ─── Alerts card ──────────────────────────────────────────────────────────────

function AlertsCard({ alerts, onNew, onDelete }: {
  alerts: Alert[];
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <motion.div variants={cardAnim} className="g-c2" style={{ ...TERM, padding: 22 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: MUTED, letterSpacing: "0.01em", display: "flex", alignItems: "center" }}>
          Alertas de precio
          <InfoTooltip text="Configurá un precio objetivo y te avisamos cuando se alcance. Útil para no estar monitoreando el mercado todo el día." />
        </p>
        <button
          onClick={onNew}
          style={{
            padding: "3px 10px", border: `1px solid ${GREEN}40`, background: `${GREEN}0a`,
            color: GREEN, fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            borderRadius: 0, letterSpacing: "0.06em",
          }}
        >
          + NUEVO
        </button>
      </div>

      {alerts.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", justifyContent: "center", gap: 8, padding: "28px 0" }}>
          <span style={{ fontSize: 22, color: DIM }}>◈</span>
          <p style={{ color: MUTED, fontSize: 11, fontWeight: 600, letterSpacing: "0.1em" }}>SIN ALERTAS ACTIVAS</p>
          <p style={{ color: DIM, fontSize: 9, letterSpacing: "0.06em", textAlign: "center" as const, maxWidth: 180 }}>
            Configurá una alerta para recibir notificación cuando un activo cruce un precio.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 5 }}>
          {alerts.map(alert => (
            <div
              key={alert.id}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 10px",
                border: `1px solid ${alert.triggered ? `${GREEN}30` : `${DIM}30`}`,
                background: alert.triggered ? `${GREEN}06` : CARD2,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: alert.triggered ? GREEN : MUTED }}>
                  {alert.symbol}
                </span>
                <span style={{ fontSize: 9, color: DIM }}>
                  {alert.condition === 'above' ? '↑ >$' : '↓ <$'}{alert.price.toLocaleString("en-US")}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {alert.triggered && (
                  <span style={{ fontSize: 8, color: GREEN, fontWeight: 700, letterSpacing: "0.1em" }}>ACTIVADA</span>
                )}
                <button
                  onClick={() => onDelete(alert.id)}
                  style={{ background: "transparent", border: "none", color: DIM, cursor: "pointer", fontSize: 16, padding: "0 2px", lineHeight: 1, fontFamily: "inherit" }}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [cryptos,   setCryptos]   = useState<CryptoPrice[]>([]);
  const [stocks,    setStocks]    = useState<Stock[]>([]);
  const [fearGreed, setFearGreed] = useState<FearGreed | null>(null);
  const [trending,  setTrending]  = useState<TrendingItem[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(false);
  const lastFearGreedFetch        = useRef<number>(0);
  const { setStockBars, setCryptoChange } = useMarketActivity();

  const [globalStats,      setGlobalStats]      = useState<GlobalStats | null>(null);

  const [alerts,           setAlerts]           = useState<Alert[]>([]);
  const [showAlertModal,   setShowAlertModal]   = useState(false);
  const [newAlertSymbol,   setNewAlertSymbol]   = useState('BTC');
  const [newAlertPrice,    setNewAlertPrice]    = useState('');
  const [newAlertCondition, setNewAlertCondition] = useState<'above' | 'below'>('above');
  const [triggeredAlerts,  setTriggeredAlerts]  = useState<Alert[]>([]);
  const alertsRef = useRef<Alert[]>([]);

  async function fetchData(silent = false) {
    if (!silent) { setLoading(true); setError(false); }
    const shouldRefreshFG = Date.now() - lastFearGreedFetch.current >= 300_000;
    const [pR, sR, fR, tR, gR] = await Promise.allSettled([
      api.get('/api/market/prices').then(r => r.data),
      api.get('/api/market/stocks').then(r => r.data),
      shouldRefreshFG
        ? api.get('/api/market/fear-greed').then(r => r.data)
        : Promise.resolve(null),
      api.get('/api/market/trending').then(r => r.data),
      api.get('/api/market/global').then(r => r.data),
    ]);
    if (pR.status === "fulfilled") {
      setCryptos(pR.value.slice(0, 8));
      setCryptoChange(pR.value[0]?.price_change_percentage_24h ?? null);
    } else {
      setCryptoChange(null);
    }
    if (sR.status === "fulfilled") {
      setStocks(sR.value);
      setStockBars((sR.value as Stock[]).map((s: Stock) => ({ change: s.change_pct_24h })));
    } else {
      setStockBars(null);
    }
    if (fR.status === "fulfilled" && fR.value !== null) {
      setFearGreed(fR.value);
      lastFearGreedFetch.current = Date.now();
    }
    if (tR.status === "fulfilled") {
      const coins = tR.value?.coins ?? tR.value ?? [];
      setTrending(Array.isArray(coins) ? coins.slice(0, 3) : []);
    }
    if (gR.status === "fulfilled" && !gR.value?.error) {
      setGlobalStats(gR.value);
    }

    // Check price alerts
    const priceMap = new Map<string, number>();
    if (pR.status === "fulfilled") {
      (pR.value as CryptoPrice[]).slice(0, 8).forEach((c: CryptoPrice) =>
        priceMap.set(c.symbol.toUpperCase(), c.current_price));
    }
    if (sR.status === "fulfilled") {
      (sR.value as Stock[]).forEach((s: Stock) =>
        priceMap.set(s.symbol.toUpperCase(), s.price));
    }
    if (priceMap.size > 0 && alertsRef.current.length > 0) {
      const fired: Alert[] = [];
      const updated = alertsRef.current.map(a => {
        if (a.triggered) return a;
        const price = priceMap.get(a.symbol.toUpperCase());
        if (price === undefined) return a;
        const hit = a.condition === 'above' ? price > a.price : price < a.price;
        if (hit) { fired.push({ ...a, triggered: true }); return { ...a, triggered: true }; }
        return a;
      });
      if (fired.length > 0) {
        setAlerts(updated);
        setTriggeredAlerts(t => [...t, ...fired]);
      }
    }

    if (!silent) {
      setError([pR, sR, fR, tR, gR].every(r => r.status === "rejected"));
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Keep alertsRef in sync with state so fetchData (stale closure) reads current alerts
  useEffect(() => { alertsRef.current = alerts; }, [alerts]);

  // Load alerts from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('price_alerts');
      if (saved) {
        const parsed = JSON.parse(saved) as Alert[];
        setAlerts(parsed);
        alertsRef.current = parsed;
      }
    } catch { /* ignore */ }
  }, []);

  // Persist alerts to localStorage
  useEffect(() => {
    localStorage.setItem('price_alerts', JSON.stringify(alerts));
  }, [alerts]);

  function handleCreateAlert() {
    const price = parseFloat(newAlertPrice);
    if (!newAlertSymbol.trim() || isNaN(price) || price <= 0) return;
    const alert: Alert = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      symbol: newAlertSymbol.trim().toUpperCase(),
      condition: newAlertCondition,
      price,
      triggered: false,
    };
    setAlerts(prev => [...prev, alert]);
    setShowAlertModal(false);
    setNewAlertPrice('');
    setNewAlertSymbol('BTC');
    setNewAlertCondition('above');
  }

  const now     = new Date();
  const dateStr = now.toLocaleDateString("es-ES", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

  const btc  = cryptos[0];
  const rest = cryptos.slice(1);

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", fontFamily: "inherit" }}>

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}
      >
        <div>
          <h1 style={{ color: TEXT, fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1 }}>
            Mercado
          </h1>
          <p style={{ color: MUTED, fontSize: 12, marginTop: 4, textTransform: "capitalize" as const }}>
            {dateStr} · {timeStr}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Live badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: `${GREEN}10`, border: `1px solid ${GREEN}25`, borderRadius: 0 }}>
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ width: 6, height: 6, borderRadius: "50%", background: GREEN, display: "inline-block" }}
            />
            <span style={{ fontSize: 11, color: GREEN, fontWeight: 600 }}>En vivo</span>
          </div>

          <button
            onClick={() => fetchData()}
            style={{ padding: "7px 16px", border: `1px solid ${BORDER}`, background: CARD, color: TEXT2, fontSize: 12, fontWeight: 500, cursor: "pointer", borderRadius: 0, fontFamily: "inherit" }}
          >
            Actualizar
          </button>
        </div>
      </motion.div>

      {/* ── Error bar ── */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            style={{ marginBottom: 16, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", border: `1px solid ${RED}30`, background: `${RED}0a`, borderRadius: 0 }}
          >
            <span style={{ color: RED, fontSize: 13, fontWeight: 500 }}>
              No se pudo conectar al servidor (puerto 8000)
            </span>
            <button onClick={() => fetchData()} style={{ border: `1px solid ${RED}40`, color: RED, padding: "5px 14px", fontWeight: 600, background: "transparent", cursor: "pointer", fontSize: 12, fontFamily: "inherit", borderRadius: 0 }}>
              Reintentar
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Ticker ── */}
      <AnimatePresence>
        {!loading && cryptos.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
            <MarketTicker cryptos={cryptos} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ BENTO GRID ══ */}
      <motion.div variants={stagger} initial="hidden" animate="show"
        className="bento-grid"
      >

        {/* ① BTC HERO */}
        <motion.div
          variants={cardAnim}
          whileHover={{ scale: 1.012, y: -3, transition: { duration: 0.18, ease: EASE } }}
          className="g-c2"
          style={{ ...brutalCard(AMBER), padding: 26, minHeight: 190, display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative", overflow: "hidden" }}
        >
          <SectionLabel tooltip="Precio actual de las principales criptomonedas. El % muestra el cambio en las últimas 24 horas. Verde = subió, rojo = bajó.">Precios Crypto</SectionLabel>
          {loading ? (
            <><PulseLoader /><PulseLoader /><PulseLoader /></>
          ) : !btc ? (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <p style={{ color: RED, fontSize: 11, fontWeight: 600, letterSpacing: "0.1em" }}>NO SE PUDO CARGAR · CoinGecko</p>
            </div>
          ) : (
            <>
              <HeroChart />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>Bitcoin</span>
                    <span style={{ fontSize: 11, color: MUTED, fontWeight: 400 }}>BTC/USD</span>
                  </div>
                  <p style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>Spot · Binance</p>
                </div>
                <ChangeBadge value={btc.price_change_percentage_24h} />
              </div>
              <div style={{ position: "relative" }}>
                <p style={{ color: TEXT, fontSize: 40, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                  <CountUp to={btc.current_price} />
                </p>
                <div style={{ display: "flex", gap: 28, marginTop: 12 }}>
                  <div>
                    <p style={{ color: MUTED, fontSize: 11, marginBottom: 2 }}>Cambio 24h</p>
                    <p style={{ color: changeColor(btc.price_change_percentage_24h), fontSize: 13, fontWeight: 600 }}>
                      {btc.price_change_percentage_24h >= 0 ? "+" : "−"}
                      ${Math.abs(btc.current_price * btc.price_change_percentage_24h / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                  <div>
                    <p style={{ color: MUTED, fontSize: 11, marginBottom: 2 }}>Ranking</p>
                    <p style={{ color: TEXT2, fontSize: 13, fontWeight: 600 }}>#1 Global</p>
                  </div>
                  <div>
                    <p style={{ color: MUTED, fontSize: 11, marginBottom: 2 }}>Vol. 24h</p>
                    <p style={{ color: DIM, fontSize: 13, fontWeight: 600 }}>—</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </motion.div>

        {/* ② FEAR & GREED */}
        <motion.div
          variants={cardAnim}
          className="g-c2 g-r2"
          style={{ ...brutalCard(fearGreed ? fearColor(fearGreed.value) : MUTED), padding: 24, minHeight: 400, display: "flex", flexDirection: "column" }}
        >
          <SectionLabel tooltip="Mide el sentimiento del mercado crypto de 0 a 100. 0-24 = Miedo extremo (posible oportunidad de compra). 75-100 = Codicia extrema (mercado sobrecalentado, precaución). Es una señal contraria.">Índice Miedo &amp; Codicia</SectionLabel>
          {loading ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, paddingTop: 20 }}>
              <PulseLoader /><PulseLoader /><PulseLoader />
            </div>
          ) : fearGreed ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <FearArc value={fearGreed.value} />
              <motion.p
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
                style={{ color: fearColor(fearGreed.value), fontWeight: 800, fontSize: 13, letterSpacing: "0.24em", marginTop: 6, marginBottom: 22, textTransform: "uppercase" as const }}
              >
                {fearGreed.classification}
              </motion.p>
              <div style={{ width: "100%", height: 5, background: DIM, marginBottom: 6, position: "relative" }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${fearGreed.value}%` }}
                  transition={{ duration: 1.4, ease: EASE, delay: 0.4 }}
                  style={{ height: "100%", background: `linear-gradient(90deg, ${RED} 0%, ${AMBER} 50%, ${GREEN} 100%)` }}
                />
                <div style={{ position: "absolute", left: "50%", top: -2, bottom: -2, width: 1, background: `${DIM}80` }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%", marginBottom: 20 }}>
                <span style={{ fontSize: 8, color: RED,   letterSpacing: "0.1em", fontWeight: 700 }}>MIEDO</span>
                <span style={{ fontSize: 8, color: DIM,   letterSpacing: "0.1em" }}>NEUTRO</span>
                <span style={{ fontSize: 8, color: GREEN, letterSpacing: "0.1em", fontWeight: 700 }}>CODICIA</span>
              </div>
              <div style={{ width: "100%", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {[
                  { label: "MIEDO EXTREMO", range: "0–25",   color: RED       },
                  { label: "MIEDO",          range: "26–45",  color: "#ff8c42" },
                  { label: "NEUTRO",         range: "46–55",  color: AMBER     },
                  { label: "CODICIA",        range: "56–100", color: GREEN     },
                ].map((z) => (
                  <div key={z.label} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", border: `1px solid ${z.color}18`, background: `${z.color}06` }}>
                    <span style={{ width: 4, height: 4, background: z.color, flexShrink: 0 }} />
                    <div>
                      <p style={{ fontSize: 7, color: z.color, fontWeight: 700, letterSpacing: "0.1em" }}>{z.label}</p>
                      <p style={{ fontSize: 7, color: DIM, letterSpacing: "0.06em" }}>{z.range}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <span style={{ fontSize: 28, color: DIM }}>—</span>
              <p style={{ color: RED, fontSize: 11, fontWeight: 600, letterSpacing: "0.1em" }}>DATOS NO DISPONIBLES</p>
              <p style={{ color: DIM, fontSize: 9, letterSpacing: "0.06em", textAlign: "center" as const }}>
                API alternative.me no responde
              </p>
            </div>
          )}
        </motion.div>

        {/* ③④ ETH + BNB */}
        {loading
          ? [0, 1].map(i => (
              <motion.div key={`sk-ab-${i}`} variants={cardAnim} style={TERM}>
                <div style={{ padding: 18 }}><PulseLoader /><PulseLoader /></div>
              </motion.div>
            ))
          : rest.slice(0, 2).map(c => (
              <motion.div key={c.id} variants={cardAnim} whileHover={{ scale: 1.025, transition: { duration: 0.15, ease: EASE } }} style={TERM}>
                <CryptoMini c={c} />
              </motion.div>
            ))
        }

        {/* ⑤–⑧ SOL · ADA · XRP · DOGE */}
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <motion.div key={`sk-${i}`} variants={cardAnim} style={TERM}>
                <div style={{ padding: 18 }}><PulseLoader /><PulseLoader /></div>
              </motion.div>
            ))
          : rest.slice(2, 6).map(c => (
              <motion.div key={c.id} variants={cardAnim} whileHover={{ scale: 1.025, transition: { duration: 0.15, ease: EASE } }} style={TERM}>
                <CryptoMini c={c} />
              </motion.div>
            ))
        }

        {/* ⑨ ETFs */}
        <motion.div variants={cardAnim} className="g-c2" style={{ ...TERM, padding: 22 }}>
          <SectionLabel tooltip="ETFs son fondos que contienen muchas acciones. SPY = S&P 500 (500 empresas grandes de EE.UU.), QQQ = tecnología (Apple, Google, Meta), VTI = todo el mercado americano.">ETFs · Acciones</SectionLabel>
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <PulseLoader key={i} />)
            : stocks.length === 0
            ? <p style={{ color: RED, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", padding: "8px 0" }}>NO SE PUDO CARGAR · yfinance</p>
            : stocks.map((s, i) => (
                <div key={s.symbol ?? i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < stocks.length - 1 ? `1px solid ${DIM}30` : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 3, height: 14, background: [AMBER, GREEN, BLUE][i % 3], flexShrink: 0 }} />
                    <div>
                      <span style={{ color: TEXT, fontWeight: 700, fontSize: 11, letterSpacing: "0.06em" }}>{s.symbol}</span>
                      {s.name && <span style={{ color: DIM, fontSize: 9, marginLeft: 8, letterSpacing: "0.04em" }}>{s.name}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ textAlign: "right" as const }}>
                      <p style={{ color: TEXT, fontWeight: 700, fontSize: 12, fontVariantNumeric: "tabular-nums" }}>${s.price?.toLocaleString("en-US")}</p>
                      <Sparkline symbol={s.symbol} change={s.change_pct_24h} width={56} height={16} />
                    </div>
                    <ChangeBadge value={s.change_pct_24h} />
                  </div>
                </div>
              ))
          }
        </motion.div>

        {/* ⑩ TRENDING */}
        <motion.div variants={cardAnim} className="g-c2" style={{ ...TERM, padding: 22 }}>
          <SectionLabel tooltip="Los activos más buscados en este momento. Útil para ver qué llama la atención del mercado, pero cuidado: popularidad ≠ buena inversión.">Trending · Top Volumen</SectionLabel>
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <PulseLoader key={i} />)
            : trending.length === 0
            ? <p style={{ color: RED, fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", padding: "8px 0" }}>NO SE PUDO CARGAR · CoinGecko</p>
            : trending.map((t, i) => {
                const name   = t.item?.name   ?? t.name   ?? "—";
                const symbol = t.item?.symbol ?? t.symbol ?? "—";
                const thumb  = t.item?.thumb  ?? t.large;
                const key    = t.item?.id     ?? t.id     ?? `tr-${i}`;
                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 + 0.35, ease: EASE }}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 0", borderBottom: i < trending.length - 1 ? `1px solid ${DIM}30` : "none" }}
                  >
                    <span style={{ width: 22, height: 22, border: `1px solid ${AMBER}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: AMBER, flexShrink: 0, background: `${AMBER}06` }}>
                      {i + 1}
                    </span>
                    {thumb && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt={name} width={22} height={22} style={{ borderRadius: "50%", flexShrink: 0, opacity: 0.85 }} />
                    )}
                    <div style={{ flex: 1 }}>
                      <p style={{ color: TEXT, fontWeight: 700, fontSize: 11, letterSpacing: "0.04em" }}>{name}</p>
                      <p style={{ color: DIM, fontSize: 8, letterSpacing: "0.12em" }}>{symbol.toUpperCase()}</p>
                    </div>
                    <span style={{ fontSize: 9, color: GREEN, fontWeight: 700, letterSpacing: "0.08em" }}>▲</span>
                  </motion.div>
                );
              })
          }
        </motion.div>

        {/* ⑪ ALERTS */}
        <AlertsCard 
          alerts={alerts}
          onNew={() => setShowAlertModal(true)}
          onDelete={(id) => setAlerts(prev => prev.filter(a => a.id !== id))}
        />

        {/* ⑫ MARKET STATS */}
        <motion.div variants={cardAnim} className="g-c2" style={{ ...TERM, padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <SectionLabel tooltip="Estadísticas del mercado crypto global en tiempo real vía CoinGecko.">Estadísticas globales</SectionLabel>
            <span style={{ fontSize: 7, color: GREEN, letterSpacing: "0.1em", border: `1px solid ${GREEN}40`, padding: "2px 6px" }}>
              COINGECKO
            </span>
          </div>
          {loading ? (
            <><PulseLoader /><PulseLoader /><PulseLoader /><PulseLoader /></>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { label: "DOMINANCIA BTC",  value: globalStats ? `${globalStats.btc_dominance}%`                     : "—", color: AMBER },
                { label: "MKT CAP GLOBAL",  value: globalStats ? formatLargeNumber(globalStats.total_market_cap)      : "—", color: BLUE  },
                { label: "VOLUMEN 24H",      value: globalStats ? formatLargeNumber(globalStats.total_volume_24h)      : "—", color: GREEN },
                { label: "CRIPTOS ACTIVAS", value: globalStats ? globalStats.active_cryptocurrencies.toLocaleString() : "—", color: MUTED },
              ].map(stat => (
                <div key={stat.label} style={{ padding: "12px 14px", border: `1px solid ${DIM}40`, background: "rgba(240,180,41,0.015)" }}>
                  <p style={{ fontSize: 7, color: DIM, letterSpacing: "0.16em", marginBottom: 6, textTransform: "uppercase" as const }}>{stat.label}</p>
                  <p style={{ color: globalStats ? stat.color : DIM, fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em" }}>{stat.value}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>

      </motion.div>

      {/* ── Triggered alert banners ── */}
      <AnimatePresence>
        {triggeredAlerts.map(a => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            style={{
              position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
              padding: "12px 20px", background: "#eab30812", border: "1px solid #eab308",
              color: "#eab308", fontSize: 13, fontWeight: 600, zIndex: 300,
              display: "flex", alignItems: "center", gap: 16, whiteSpace: "nowrap" as const,
            }}
          >
            🔔 ALERTA: {a.symbol} {a.condition === "above" ? "superó los" : "bajó de"} ${a.price.toLocaleString("en-US")}
            <button
              onClick={() => setTriggeredAlerts(t => t.filter(x => x.id !== a.id))}
              style={{ background: "transparent", border: "none", color: "#eab308", cursor: "pointer", fontSize: 20, padding: 0, lineHeight: 1, fontFamily: "inherit" }}
            >×</button>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* ── Alert modal ── */}
      <AnimatePresence>
        {showAlertModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAlertModal(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}
          >
            <motion.div
              initial={{ scale: 0.93, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.93, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ ...TERM, padding: 28, width: 340, maxWidth: "90vw" }}
            >
              <p style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 20, letterSpacing: "0.06em" }}>NUEVA ALERTA DE PRECIO</p>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 10, color: MUTED, letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>SÍMBOLO</label>
                <select
                  value={newAlertSymbol}
                  onChange={e => setNewAlertSymbol(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", background: CARD2, border: `1px solid ${BORDER}`, color: TEXT, fontSize: 12, fontFamily: "inherit", borderRadius: 0, outline: "none" }}
                >
                  {["BTC", "ETH", "SOL", "BNB", "ADA", "XRP", "DOGE", "SPY", "QQQ", "VTI"].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 10, color: MUTED, letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>CONDICIÓN</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["above", "below"] as const).map(cond => (
                    <button
                      key={cond}
                      onClick={() => setNewAlertCondition(cond)}
                      style={{
                        flex: 1, padding: "8px 0", fontSize: 11, fontWeight: 600, fontFamily: "inherit",
                        cursor: "pointer", borderRadius: 0,
                        background: newAlertCondition === cond ? `${GREEN}15` : CARD2,
                        border: `1px solid ${newAlertCondition === cond ? GREEN : BORDER}`,
                        color: newAlertCondition === cond ? GREEN : MUTED,
                      }}
                    >
                      {cond === "above" ? "↑ Cuando suba de" : "↓ Cuando baje de"}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 22 }}>
                <label style={{ fontSize: 10, color: MUTED, letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>PRECIO USD</label>
                <input
                  type="number"
                  value={newAlertPrice}
                  onChange={e => setNewAlertPrice(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleCreateAlert()}
                  placeholder="ej. 70000"
                  style={{ width: "100%", padding: "8px 10px", background: CARD2, border: `1px solid ${BORDER}`, color: TEXT, fontSize: 12, fontFamily: "inherit", borderRadius: 0, outline: "none", boxSizing: "border-box" as const }}
                />
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setShowAlertModal(false)}
                  style={{ flex: 1, padding: "10px 0", border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", borderRadius: 0 }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateAlert}
                  disabled={!newAlertPrice || parseFloat(newAlertPrice) <= 0}
                  style={{
                    flex: 1, padding: "10px 0", border: `1px solid ${GREEN}50`,
                    background: `${GREEN}12`, color: GREEN, fontSize: 12, fontWeight: 700,
                    cursor: "pointer", fontFamily: "inherit", borderRadius: 0,
                    opacity: (!newAlertPrice || parseFloat(newAlertPrice) <= 0) ? 0.4 : 1,
                  }}
                >
                  Crear alerta
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
