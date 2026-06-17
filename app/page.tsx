"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, animate } from "framer-motion";
import api from "@/lib/api";

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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 600, color: MUTED, marginBottom: 14, letterSpacing: "0.01em" }}>
      {children}
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

const ALERTS = [
  { id: 1, dir: "▲", asset: "BTC", msg: "Superó $65,000",          time: "3m",  color: GREEN },
  { id: 2, dir: "▼", asset: "ETH", msg: "Cayó −3.8% en 1h",        time: "14m", color: RED   },
  { id: 3, dir: "◈", asset: "SOL", msg: "Objetivo $180 alcanzado", time: "1h",  color: AMBER },
  { id: 4, dir: "▲", asset: "BNB", msg: "Vol. inusual detectado",  time: "2h",  color: BLUE  },
];

function AlertsCard() {
  return (
    <motion.div
      variants={cardAnim}
      whileHover={{ scale: 1.006, transition: { duration: 0.18, ease: EASE } }}
      className="g-c2"
      style={{ ...TERM, padding: 22 }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <SectionLabel>Alertas de precio</SectionLabel>
        <span style={{ padding: "2px 10px", border: `1px solid ${DIM}`, color: MUTED, fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", cursor: "pointer" }}>
          + NUEVA
        </span>
      </div>
      {ALERTS.map((a, i) => (
        <motion.div
          key={a.id}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 + 0.3, duration: 0.4, ease: EASE }}
          style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < ALERTS.length - 1 ? `1px solid ${DIM}40` : "none" }}
        >
          <span style={{ width: 26, height: 26, border: `1px solid ${a.color}50`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: a.color, flexShrink: 0, background: `${a.color}08`, borderRadius: 0 }}>
            {a.dir}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: TEXT, fontWeight: 700, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>
              <span style={{ color: a.color }}>{a.asset}</span> · {a.msg}
            </p>
          </div>
          <span style={{ color: DIM, fontSize: 9, flexShrink: 0, letterSpacing: "0.06em" }}>{a.time}</span>
          {i === 0 && (
            <motion.span
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              style={{ width: 5, height: 5, borderRadius: "50%", background: a.color, flexShrink: 0 }}
            />
          )}
        </motion.div>
      ))}
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

  async function fetchData(silent = false) {
    if (!silent) { setLoading(true); setError(false); }
    const shouldRefreshFG = Date.now() - lastFearGreedFetch.current >= 300_000;
    const [pR, sR, fR, tR] = await Promise.allSettled([
      api.get('/api/market/prices').then(r => r.data),
      api.get('/api/market/stocks').then(r => r.data),
      shouldRefreshFG
        ? api.get('/api/market/fear-greed').then(r => r.data)
        : Promise.resolve(null),
      api.get('/api/market/trending').then(r => r.data),
    ]);
    if (pR.status === "fulfilled") setCryptos(pR.value.slice(0, 8));
    if (sR.status === "fulfilled") setStocks(sR.value);
    if (fR.status === "fulfilled" && fR.value !== null) {
      setFearGreed(fR.value);
      lastFearGreedFetch.current = Date.now();
    }
    if (tR.status === "fulfilled") {
      const coins = tR.value?.coins ?? tR.value ?? [];
      setTrending(Array.isArray(coins) ? coins.slice(0, 3) : []);
    }
    if (!silent) {
      setError([pR, sR, fR, tR].every(r => r.status === "rejected"));
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 60_000);
    return () => clearInterval(interval);
  }, []);

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
          {loading || !btc ? (
            <><PulseLoader /><PulseLoader /><PulseLoader /></>
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
                    <p style={{ color: TEXT2, fontSize: 13, fontWeight: 600 }}>$38.4B</p>
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
          <SectionLabel>Índice Miedo &amp; Codicia</SectionLabel>
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
          ) : null}
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
          <SectionLabel>ETFs · Acciones</SectionLabel>
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <PulseLoader key={i} />)
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
          <SectionLabel>Trending · Top Volumen</SectionLabel>
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <PulseLoader key={i} />)
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
        <AlertsCard />

        {/* ⑫ MARKET STATS */}
        <motion.div variants={cardAnim} className="g-c2" style={{ ...TERM, padding: 22 }}>
          <SectionLabel>Estadísticas globales</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
            {[
              { label: "DOMINANCIA BTC",  value: "54.2%",  color: AMBER },
              { label: "MKT CAP GLOBAL",  value: "$2.4T",   color: BLUE  },
              { label: "VOLUMEN 24H",      value: "$89.3B",  color: GREEN },
              { label: "CRIPTOS ACTIVAS", value: "9,400+",  color: MUTED },
            ].map(stat => (
              <div key={stat.label} style={{ padding: "12px 14px", border: `1px solid ${DIM}40`, background: "rgba(240,180,41,0.015)" }}>
                <p style={{ fontSize: 7, color: DIM, letterSpacing: "0.16em", marginBottom: 6, textTransform: "uppercase" as const }}>{stat.label}</p>
                <p style={{ color: stat.color, fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>{stat.value}</p>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 7, color: DIM, letterSpacing: "0.16em", marginBottom: 6, textTransform: "uppercase" as const }}>Dominancia por activo</p>
          <div style={{ display: "flex", height: 6, gap: 1, marginBottom: 6 }}>
            {[
              { pct: 54, color: AMBER },
              { pct: 17, color: BLUE  },
              { pct: 4,  color: GREEN },
              { pct: 25, color: DIM   },
            ].map((d, i) => (
              <motion.div key={i} initial={{ width: 0 }} animate={{ width: `${d.pct}%` }} transition={{ duration: 1.2, ease: EASE, delay: 0.5 + i * 0.06 }}
                style={{ background: d.color, height: "100%", flexShrink: 0 }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 14 }}>
            {[
              { label: "BTC 54%",   color: AMBER },
              { label: "ETH 17%",   color: BLUE  },
              { label: "BNB 4%",    color: GREEN },
              { label: "OTROS 25%", color: DIM   },
            ].map(d => (
              <span key={d.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 8, color: MUTED, letterSpacing: "0.06em" }}>
                <span style={{ width: 6, height: 6, background: d.color, display: "inline-block", flexShrink: 0 }} />
                {d.label}
              </span>
            ))}
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}
