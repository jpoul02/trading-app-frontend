"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MT5Status {
  connected: boolean;
  error?: string;
  login?: number;
  name?: string;
  balance?: number;
  equity?: number;
  profit?: number;
  margin?: number;
  margin_free?: number;
  currency?: string;
  leverage?: number;
  server?: string;
}

interface MT5Position {
  ticket: number;
  symbol: string;
  type: "BUY" | "SELL";
  volume: number;
  open_price: number;
  current_price: number;
  profit: number;
  open_time: string;
}

interface MT5Deal {
  ticket: number;
  symbol: string;
  type: "BUY" | "SELL";
  volume: number;
  price: number;
  profit: number;
  time: string;
}

interface MT5Price {
  connected: boolean;
  error?: string;
  symbol?: string;
  bid?: number;
  ask?: number;
  spread?: number;
  digits?: number;
}

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface IndicatorData {
  signal: "COMPRAR" | "VENDER" | "ESPERAR";
  signal_reason: string;
  last_rsi: number;
  last_macd: number | null;
  last_close: number;
  error?: string;
}

// ─── Static content ───────────────────────────────────────────────────────────

const GLOSSARY = [
  {
    key: "balance",
    term: "Balance",
    short: "El dinero total en tu cuenta.",
    detail:
      "No cambia hasta que cerrás una operación. Si el mercado se mueve en tu contra, el Balance sigue igual — lo que fluctúa es el Equity. Solo al cerrar un trade el Balance se actualiza (para mejor o peor).",
  },
  {
    key: "equity",
    term: "Equity",
    short: "Balance + ganancias/pérdidas actuales de posiciones abiertas.",
    detail:
      "El Equity fluctúa en tiempo real con el mercado. Si tenés una posición ganando $50, tu Equity = Balance + $50. Si la posición cierra, esos $50 pasan al Balance. Un Equity por debajo del Balance significa pérdidas flotantes.",
  },
  {
    key: "margin",
    term: "Margin (Margen)",
    short: "El dinero que el broker reserva como garantía.",
    detail:
      "Cuando abrís un trade, el broker bloquea una porción de tu capital como garantía. Con leverage 1:100 y $10,000 operados, solo necesitás $100 de margen. Si el Equity cae por debajo del margen requerido, el broker cierra tus posiciones automáticamente (Margin Call).",
  },
  {
    key: "margin_free",
    term: "Margin Libre",
    short: "Capital disponible para abrir nuevas operaciones.",
    detail:
      "Margin Libre = Equity − Margen usado. Si tenés $1,000 de equity y $100 en margen, podés abrir más posiciones con hasta $900. Cuando el Margin Libre llega a cero no podés operar más.",
  },
  {
    key: "leverage",
    term: "Leverage (Apalancamiento)",
    short: "Con 1:100 controlás $100 por cada $1 tuyo.",
    detail:
      "El apalancamiento amplifica tanto ganancias como pérdidas. Con 1:100 y $100 en cuenta controlás $10,000. Si el precio sube 1%, ganás $100 (100% de tu capital). Si baja 1%, perdés todo. Más apalancamiento = más riesgo. Empezá con 1:10 o 1:20.",
  },
  {
    key: "profit",
    term: "Profit Flotante",
    short: "Ganancia o pérdida de posiciones abiertas ahora mismo.",
    detail:
      "Cambia cada segundo mientras tenés posiciones abiertas. Verde = ganando. Rojo = perdiendo. No es dinero real hasta que cerrés la posición. Un trade en pérdida puede recuperarse si el mercado vuelve a tu favor — por eso existe el Stop Loss.",
  },
];

const QUICK_SYMBOLS = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "BTCUSD"];

const FOREX_CONCEPTS = [
  {
    title: "Pips",
    body: "La unidad mínima de movimiento de precio. En EURUSD, 1 pip = 0.0001. Si el precio va de 1.0850 a 1.0851, subió 1 pip. En pares con JPY, 1 pip = 0.01.",
  },
  {
    title: "Lotes (Lot Size)",
    body: "Tamaño de la operación. 1 lote estándar = 100,000 unidades. Mini lote = 10,000. Micro lote = 1,000. En MT5 podés operar desde 0.01 lotes.",
  },
  {
    title: "Stop Loss",
    body: "Orden automática para cerrar la posición si perdés X cantidad. Protege tu cuenta de pérdidas catastróficas. Siempre poné Stop Loss antes de abrir un trade.",
  },
  {
    title: "Take Profit",
    body: "Cierra automáticamente cuando alcanzás tu ganancia objetivo. No necesitás estar mirando la pantalla — MT5 lo ejecuta solo.",
  },
  {
    title: "Long / Short",
    body: "Long (BUY) = apostás a que el precio sube y ganás si sube. Short (SELL) = apostás a que baja y ganás si baja. En Forex ganás en ambas direcciones.",
  },
];

// ─── Candle chart (SVG) ───────────────────────────────────────────────────────

const CHART_TIMEFRAMES = ["M1", "M5", "M15", "M30", "H1", "H4", "D1"];

function getPriceDec(range: number): number {
  if (range < 0.01) return 5;
  if (range < 1) return 4;
  if (range < 100) return 2;
  return 0;
}

function CandleChart({ candles, onHover }: Readonly<{ candles: Candle[]; onHover?: (candle: Candle | null, x: number, y: number) => void }>) {
  if (candles.length === 0) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ height: 350, color: "var(--text-muted)" }}
      >
        <p className="text-sm">Sin datos — seleccioná un símbolo y timeframe</p>
      </div>
    );
  }

  const W = 900;
  const H = 420;
  const PAD = { top: 16, right: 20, bottom: 32, left: 72 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const prices = candles.flatMap((c) => [c.high, c.low]);
  const rawMin = Math.min(...prices);
  const rawMax = Math.max(...prices);
  const rawRange = rawMax - rawMin || 1;
  const vPad = rawRange * 0.1;
  const minP = rawMin - vPad;
  const priceRange = rawRange + vPad * 2;

  const toY = (p: number) => PAD.top + chartH - ((p - minP) / priceRange) * chartH;
  const gap = chartW / candles.length;
  const candleW = Math.max(3, gap * 0.75);

  const yTicks = Array.from({ length: 6 }, (_, i) => rawMin + (rawRange / 5) * i);
  const priceDec = getPriceDec(rawRange);
  const xStep = Math.max(1, Math.ceil(candles.length / 6));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 420 }} onMouseLeave={() => onHover?.(null, 0, 0)}>
      {/* Grid lines — use style={} so CSS vars resolve */}
      {yTicks.map((p) => (
        <g key={p}>
          <line
            x1={PAD.left} y1={toY(p)}
            x2={W - PAD.right} y2={toY(p)}
            style={{ stroke: "#1e293b", strokeDasharray: "4 4" }}
            strokeWidth={0.5}
          />
          <text
            x={PAD.left - 6} y={toY(p) + 4}
            fontSize={9} textAnchor="end"
            style={{ fill: "#94a3b8" }}
          >
            {p.toFixed(priceDec)}
          </text>
        </g>
      ))}

      {/* Candles */}
      {candles.map((c, i) => {
        const isGreen = c.close >= c.open;
        const color = isGreen ? "#00d4aa" : "#ff4757";
        const centerX = PAD.left + i * gap + gap / 2;
        const openY = toY(c.open);
        const closeY = toY(c.close);
        const highY = toY(c.high);
        const lowY = toY(c.low);
        const bodyTop = Math.min(openY, closeY);
        const bodyH = Math.max(1, Math.abs(closeY - openY));
        return (
          <g key={c.time} onMouseMove={(e) => onHover?.(c, e.clientX, e.clientY)}>
            {/* transparent hit area */}
            <rect x={centerX - gap / 2} y={PAD.top} width={gap} height={chartH} fill="transparent" />
            <line
              x1={centerX} y1={highY} x2={centerX} y2={lowY}
              style={{ stroke: color }}
              strokeWidth={1}
            />
            <rect
              x={centerX - candleW / 2} y={bodyTop}
              width={candleW} height={bodyH}
              style={{ fill: color }}
            />
          </g>
        );
      })}

      {/* X axis date labels */}
      {candles
        .filter((_, i) => i % xStep === 0)
        .map((c, idx) => {
          const i = idx * xStep;
          const x = PAD.left + i * gap + gap / 2;
          const d = new Date(c.time * 1000);
          const label = d.toLocaleDateString("es-ES", { month: "short", day: "2-digit" });
          return (
            <text
              key={c.time} x={x} y={H - 6}
              fontSize={9} textAnchor="middle"
              style={{ fill: "#94a3b8" }}
            >
              {label}
            </text>
          );
        })}
    </svg>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n?: number) {
  return n != null
    ? n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "—";
}

function Skeleton({ h = "h-28" }: Readonly<{ h?: string }>) {
  return (
    <div
      className={`animate-pulse rounded-xl ${h}`}
      style={{ background: "var(--bg-card)" }}
    />
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function MT5Page() {
  const [status, setStatus] = useState<MT5Status | null>(null);
  const [positions, setPositions] = useState<MT5Position[]>([]);
  const [deals, setDeals] = useState<MT5Deal[]>([]);
  const [symbolInput, setSymbolInput] = useState("EURUSD");
  const [priceResult, setPriceResult] = useState<MT5Price | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [openItem, setOpenItem] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartSymbol, setChartSymbol] = useState("EURUSD");
  const [chartTf, setChartTf] = useState("H1");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [chartInput, setChartInput] = useState("");
  const [candleAccordion, setCandleAccordion] = useState<string | null>(null);
  const [hoveredCandle, setHoveredCandle] = useState<{ candle: Candle; x: number; y: number } | null>(null);
  const [indicators, setIndicators] = useState<IndicatorData | null>(null);
  const [indicatorsLoading, setIndicatorsLoading] = useState(false);
  const [indicatorAccordion, setIndicatorAccordion] = useState<string | null>(null);

  async function fetchStatus(silent = false) {
    try {
      const { data } = await api.get('/api/mt5/status');
      setStatus(data);
    } catch {
      setStatus({ connected: false, error: "No se pudo conectar al servidor" });
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function fetchPositions() {
    try {
      const { data } = await api.get('/api/mt5/positions');
      setPositions(data.positions ?? []);
    } catch {}
  }

  async function fetchHistory() {
    try {
      const { data } = await api.get('/api/mt5/history');
      setDeals(data.deals ?? []);
    } catch {}
  }

  async function fetchCandles(sym = chartSymbol, tf = chartTf) {
    try {
      const { data } = await api.get(`/api/mt5/candles/${sym}`, { params: { timeframe: tf, count: 100 } });
      if (Array.isArray(data)) setCandles(data);
    } catch {}
  }

  async function fetchIndicators(sym = chartSymbol, tf = chartTf) {
    setIndicatorsLoading(true);
    try {
      const { data } = await api.get(`/api/mt5/indicators/${sym}`, { params: { timeframe: tf, count: 200 } });
      setIndicators(data);
    } catch {
      setIndicators(null);
    } finally {
      setIndicatorsLoading(false);
    }
  }

  async function fetchPrice() {
    const sym = symbolInput.trim().toUpperCase();
    if (!sym) return;
    setPriceLoading(true);
    setPriceResult(null);
    try {
      const { data } = await api.get(`/api/mt5/price/${sym}`);
      setPriceResult(data);
    } catch {
      setPriceResult({ connected: false, error: "Error de red al buscar el precio" });
    } finally {
      setPriceLoading(false);
    }
  }

  useEffect(() => {
    fetchStatus();
    fetchPositions();
    fetchHistory();
    fetchCandles();
    fetchIndicators();

    const s = setInterval(() => fetchStatus(true), 10_000);
    const p = setInterval(fetchPositions, 5_000);
    const h = setInterval(fetchHistory, 30_000);
    const c = setInterval(() => fetchCandles(), 30_000);

    return () => {
      clearInterval(s);
      clearInterval(p);
      clearInterval(h);
      clearInterval(c);
    };
  }, []);

  const connected = status?.connected ?? false;
  const cur = status?.currency ?? "USD";

  return (
    <div className="max-w-5xl mx-auto">
      <style>{`
        @keyframes mt5pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.25; transform: scale(0.65); }
        }
        .mt5-live-dot { animation: mt5pulse 2s ease-in-out infinite; }
      `}</style>

      {/* Candle hover tooltip */}
      {hoveredCandle && (
        <div
          style={{
            position: "fixed",
            left: hoveredCandle.x + 168 + 14 > window.innerWidth
              ? hoveredCandle.x - 168 - 10
              : hoveredCandle.x + 14,
            top: hoveredCandle.y - 130 < 0
              ? hoveredCandle.y + 10
              : hoveredCandle.y - 130,
            pointerEvents: "none",
            zIndex: 9999,
            background: "#0f172a",
            border: "1px solid var(--border)",
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 11,
            color: "var(--text-primary)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
            minWidth: 168,
          }}
        >
          <p style={{ color: "var(--text-muted)", marginBottom: 5, fontSize: 10 }}>
            {new Date(hoveredCandle.candle.time * 1000).toLocaleDateString("es-ES", {
              day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit",
            })}
          </p>
          {(() => {
            const dec = getPriceDec(hoveredCandle.candle.high - hoveredCandle.candle.low);
            const f = (n: number) => n.toFixed(Math.max(dec, 2));
            return (
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "2px 10px" }}>
                <span style={{ color: "var(--text-muted)" }}>Apertura</span>
                <span style={{ fontWeight: 600, textAlign: "right" }}>{f(hoveredCandle.candle.open)}</span>
                <span style={{ color: "var(--text-muted)" }}>Máximo</span>
                <span style={{ fontWeight: 600, color: "var(--green)", textAlign: "right" }}>{f(hoveredCandle.candle.high)}</span>
                <span style={{ color: "var(--text-muted)" }}>Mínimo</span>
                <span style={{ fontWeight: 600, color: "var(--red)", textAlign: "right" }}>{f(hoveredCandle.candle.low)}</span>
                <span style={{ color: "var(--text-muted)" }}>Cierre</span>
                <span style={{ fontWeight: 600, textAlign: "right" }}>{f(hoveredCandle.candle.close)}</span>
                <span style={{ color: "var(--text-muted)" }}>Volumen</span>
                <span style={{ textAlign: "right" }}>{hoveredCandle.candle.volume.toLocaleString()}</span>
              </div>
            );
          })()}
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            MetaTrader 5
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Cuenta demo en vivo · {status?.server ?? "MetaQuotes-Demo"}
          </p>
        </div>

        {/* Connection badge */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
          style={
            connected
              ? { background: "rgba(0,212,170,0.12)", border: "1px solid rgba(0,212,170,0.3)", color: "var(--green)" }
              : { background: "rgba(255,71,87,0.1)", border: "1px solid rgba(255,71,87,0.35)", color: "var(--red)" }
          }
        >
          <span
            className={connected ? "mt5-live-dot" : undefined}
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: connected ? "var(--green)" : "var(--red)",
              display: "inline-block",
              flexShrink: 0,
            }}
          />
          {connected ? "CONECTADO" : "DESCONECTADO"}
        </div>
      </div>

      {/* ── Loading skeleton ────────────────────────────────────────────── */}
      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {(["sk-a","sk-b","sk-c","sk-d"] as const).map((k) => <Skeleton key={k} h="h-24" />)}
        </div>
      )}

      {/* ── Connection error ────────────────────────────────────────────── */}
      {status && connected === false && !loading && (
        <div
          className="mb-6 p-4 rounded-xl"
          style={{ background: "rgba(255,71,87,0.08)", border: "1px solid var(--red)" }}
        >
          <p className="font-semibold mb-1" style={{ color: "var(--red)" }}>
            MT5 no disponible
          </p>
          <p className="text-sm mb-2" style={{ color: "var(--text-muted)" }}>
            {status.error}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Abrí MetaTrader 5 en Windows → iniciá sesión con tu cuenta demo → los datos
            aparecerán automáticamente (refresca cada 10s).
          </p>
        </div>
      )}

      {/* ── Account stats ───────────────────────────────────────────────── */}
      {!loading && connected && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
              Cuenta #{status?.login} — {status?.name}
            </h2>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Leverage 1:{status?.leverage} · {cur}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Balance", value: `${cur} ${fmt(status?.balance)}`, color: "var(--text-primary)" },
              { label: "Equity", value: `${cur} ${fmt(status?.equity)}`, color: "var(--text-primary)" },
              {
                label: "Profit Flotante",
                value: `${(status?.profit ?? 0) >= 0 ? "+" : ""}${fmt(status?.profit)}`,
                color: (status?.profit ?? 0) >= 0 ? "var(--green)" : "var(--red)",
              },
              { label: "Margin Libre", value: `${cur} ${fmt(status?.margin_free)}`, color: "var(--blue)" },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="rounded-xl p-4"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
                  {label}
                </p>
                <p className="text-lg font-bold tabular-nums" style={{ color }}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Educational accordion ───────────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          ¿Qué significa cada número?
        </h2>
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          {GLOSSARY.map((item, i) => {
            const open = openItem === item.key;
            return (
              <div
                key={item.key}
                style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined }}
              >
                <button
                  onClick={() => setOpenItem(open ? null : item.key)}
                  className="w-full flex items-center gap-3 px-5 py-4 text-left cursor-pointer transition-colors hover:opacity-80"
                  style={{ background: "transparent", border: "none", fontFamily: "inherit" }}
                >
                  <div className="flex-1">
                    <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                      {item.term}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {item.short}
                    </p>
                  </div>
                  <span
                    className="text-xs shrink-0 transition-transform duration-200"
                    style={{
                      color: "var(--text-muted)",
                      display: "inline-block",
                      transform: open ? "rotate(180deg)" : "rotate(0deg)",
                    }}
                  >
                    ▾
                  </span>
                </button>
                {open && (
                  <div
                    className="px-5 pb-4 text-sm leading-relaxed"
                    style={{ color: "var(--text-muted)", paddingLeft: "3.75rem" }}
                  >
                    {item.detail}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Price lookup ────────────────────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Precios en Vivo
        </h2>
        <div
          className="rounded-xl p-5"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          {/* Input + search */}
          <div className="flex gap-2 mb-3">
            <input
              value={symbolInput}
              onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && fetchPrice()}
              placeholder="Ej: EURUSD"
              className="flex-1 px-3 py-2 rounded-lg text-sm outline-none font-semibold tracking-wider"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            />
            <button
              onClick={fetchPrice}
              disabled={priceLoading}
              className="px-5 py-2 rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-50"
              style={{ background: "var(--blue)", color: "#fff" }}
            >
              {priceLoading ? "..." : "Buscar"}
            </button>
          </div>

          {/* Quick symbols */}
          <div className="flex gap-2 flex-wrap mb-5">
            {QUICK_SYMBOLS.map((s) => (
              <button
                key={s}
                onClick={() => { setSymbolInput(s); setPriceResult(null); }}
                className="px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                style={{
                  background: symbolInput === s ? "rgba(61,124,255,0.15)" : "var(--bg-secondary)",
                  border: `1px solid ${symbolInput === s ? "var(--blue)" : "var(--border)"}`,
                  color: symbolInput === s ? "var(--blue)" : "var(--text-muted)",
                }}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Price result */}
          {priceResult && !priceResult.error && (
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div
                className="rounded-xl p-4"
                style={{ background: "rgba(0,212,170,0.08)", border: "1px solid rgba(0,212,170,0.25)" }}
              >
                <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>BID — vendés a</p>
                <p className="text-xl font-bold tabular-nums" style={{ color: "var(--green)" }}>
                  {priceResult.bid?.toFixed(priceResult.digits ?? 5)}
                </p>
              </div>
              <div
                className="rounded-xl p-4"
                style={{ background: "rgba(255,71,87,0.08)", border: "1px solid rgba(255,71,87,0.25)" }}
              >
                <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>ASK — comprás a</p>
                <p className="text-xl font-bold tabular-nums" style={{ color: "var(--red)" }}>
                  {priceResult.ask?.toFixed(priceResult.digits ?? 5)}
                </p>
              </div>
              <div
                className="rounded-xl p-4"
                style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
              >
                <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Spread (pips)</p>
                <p className="text-xl font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
                  {priceResult.spread?.toFixed(1)}
                </p>
              </div>
            </div>
          )}

          {priceResult?.error && (
            <div
              className="rounded-xl p-3 mb-5 text-sm"
              style={{ background: "rgba(255,71,87,0.1)", border: "1px solid var(--red)", color: "var(--red)" }}
            >
              {priceResult.error}
            </div>
          )}

          {/* Educational note */}
          <div
            className="rounded-xl p-4 text-sm leading-relaxed"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
          >
            <p style={{ color: "var(--text-muted)" }}>
              <span style={{ color: "var(--green)", fontWeight: 600 }}>Bid</span>{" "}= precio al que el broker te compra (vos vendés).{" "}
              <span style={{ color: "var(--red)", fontWeight: 600 }}>Ask</span>{" "}= precio al que el broker te vende (vos comprás).{" "}
              <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>Spread</span>{" "}= la diferencia entre ambos — esa es la comisión implícita del broker.
            </p>
            <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
              Ejemplo: EURUSD spread 1.2 pips + 1 lote (100,000 EUR) →
              pagás <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>$12 de spread</span> al abrir.
              Un spread bajo = broker más barato.
            </p>
          </div>
        </div>
      </section>

      {/* ── Candle chart ────────────────────────────────────────────────── */}
      <section className="mb-8">
        <div
          className="rounded-xl p-5"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
              Gráfico de Velas
            </h2>
            <div
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ background: "rgba(0,212,170,0.12)", border: "1px solid rgba(0,212,170,0.3)", color: "var(--green)" }}
            >
              <span
                className="mt5-live-dot"
                style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)", display: "inline-block", flexShrink: 0 }}
              />
              LIVE
            </div>
          </div>

          {/* Symbol quick buttons + input */}
          <div className="flex gap-2 flex-wrap mb-3">
            {QUICK_SYMBOLS.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setChartSymbol(s);
                  fetchCandles(s, chartTf);
                  fetchIndicators(s, chartTf);
                }}
                className="px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                style={{
                  background: chartSymbol === s ? "rgba(61,124,255,0.15)" : "var(--bg-secondary)",
                  border: `1px solid ${chartSymbol === s ? "var(--blue)" : "var(--border)"}`,
                  color: chartSymbol === s ? "var(--blue)" : "var(--text-muted)",
                }}
              >
                {s}
              </button>
            ))}
            <input
              value={chartInput}
              onChange={(e) => setChartInput(e.target.value.toUpperCase())}
              onKeyDown={(e) => {
                if (e.key === "Enter" && chartInput.trim()) {
                  const sym = chartInput.trim();
                  setChartSymbol(sym);
                  setChartInput("");
                  fetchCandles(sym, chartTf);
                  fetchIndicators(sym, chartTf);
                }
              }}
              placeholder="Otro símbolo…"
              className="px-3 py-1 rounded-lg text-xs outline-none font-semibold tracking-wider"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                width: 130,
              }}
            />
            <button
              onClick={() => {
                if (chartInput.trim()) {
                  const sym = chartInput.trim();
                  setChartSymbol(sym);
                  setChartInput("");
                  fetchCandles(sym, chartTf);
                  fetchIndicators(sym, chartTf);
                }
              }}
              className="px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer"
              style={{ background: "var(--blue)", color: "#fff" }}
            >
              Buscar
            </button>
          </div>

          {/* Timeframe buttons */}
          <div className="flex gap-2 flex-wrap mb-4">
            {CHART_TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => {
                  setChartTf(tf);
                  fetchCandles(chartSymbol, tf);
                  fetchIndicators(chartSymbol, tf);
                }}
                className="px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                style={{
                  background: chartTf === tf ? "rgba(61,124,255,0.15)" : "var(--bg-secondary)",
                  border: `1px solid ${chartTf === tf ? "var(--blue)" : "var(--border)"}`,
                  color: chartTf === tf ? "var(--blue)" : "var(--text-muted)",
                }}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Chart label */}
          <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
            {chartSymbol} · {chartTf} · {candles.length} velas
          </p>

          {/* SVG candlestick chart */}
          <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
            <CandleChart
              candles={candles}
              onHover={(c, x, y) => setHoveredCandle(c ? { candle: c, x, y } : null)}
            />
          </div>

          {/* Educational accordion */}
          <div
            className="rounded-xl overflow-hidden mt-4"
            style={{ border: "1px solid var(--border)" }}
          >
            {[
              {
                key: "candle-read",
                title: "Cómo leer una vela japonesa",
                body: "Cada vela representa un período de tiempo. Si el cuerpo es verde/blanco, el precio cerró más alto que la apertura (sube). Si es rojo/negro, cerró más bajo (baja). Las mechas (líneas finas) muestran los extremos — el máximo y mínimo alcanzados durante ese período.",
              },
              {
                key: "timeframes",
                title: "Timeframes",
                body: "M1 = cada vela es 1 minuto. M5 = 5 minutos. H1 = 1 hora. H4 = 4 horas. D1 = 1 día. Timeframes cortos (M1–M15) muestran movimientos intradía; timeframes largos (H4–D1) revelan la tendencia general.",
              },
              {
                key: "trends",
                title: "Cómo identificar tendencias",
                body: "Tendencia alcista: velas verdes consecutivas con máximos y mínimos cada vez más altos. Tendencia bajista: velas rojas consecutivas con máximos y mínimos cada vez más bajos. Lateralización: el precio oscila entre dos niveles sin dirección clara.",
              },
            ].map((item, i) => {
              const open = candleAccordion === item.key;
              return (
                <div
                  key={item.key}
                  style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined }}
                >
                  <button
                    onClick={() => setCandleAccordion(open ? null : item.key)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left cursor-pointer hover:opacity-80 transition-colors"
                    style={{ background: "transparent", border: "none", fontFamily: "inherit" }}
                  >
                    <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {item.title}
                    </span>
                    <span
                      className="text-xs transition-transform duration-200"
                      style={{
                        color: "var(--text-muted)",
                        display: "inline-block",
                        transform: open ? "rotate(180deg)" : "rotate(0deg)",
                      }}
                    >
                      ▾
                    </span>
                  </button>
                  {open && (
                    <div
                      className="px-4 pb-3 text-sm leading-relaxed"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {item.body}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Indicadores Técnicos ────────────────────────────────────────── */}
      <section className="mb-8">
        <div
          className="rounded-xl p-5"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <h2 className="text-xl font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Indicadores Técnicos — {chartSymbol} {chartTf}
          </h2>

          {indicatorsLoading && <Skeleton h="h-28" />}

          {!indicatorsLoading && indicators && !indicators.error && (() => {
            const sigColor =
              indicators.signal === "COMPRAR" ? "var(--green)"
              : indicators.signal === "VENDER" ? "var(--red)"
              : "var(--blue)";
            const sigBg =
              indicators.signal === "COMPRAR" ? "rgba(0,212,170,0.1)"
              : indicators.signal === "VENDER" ? "rgba(255,71,87,0.1)"
              : "rgba(61,124,255,0.1)";
            const sigBorder =
              indicators.signal === "COMPRAR" ? "rgba(0,212,170,0.35)"
              : indicators.signal === "VENDER" ? "rgba(255,71,87,0.35)"
              : "rgba(61,124,255,0.35)";
            const sigArrow =
              indicators.signal === "COMPRAR" ? "↑"
              : indicators.signal === "VENDER" ? "↓"
              : "—";
            return (
              <>
                {/* Signal card */}
                <div
                  className="rounded-xl p-4 mb-4 flex items-center gap-4"
                  style={{ background: sigBg, border: `1px solid ${sigBorder}` }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-black shrink-0"
                    style={{ background: sigBg, color: sigColor }}
                  >
                    {sigArrow}
                  </div>
                  <div>
                    <p className="text-xl font-black" style={{ color: sigColor }}>
                      {indicators.signal}
                    </p>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      {indicators.signal_reason}
                    </p>
                  </div>
                </div>

                {/* 3-col metric grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  <div
                    className="rounded-xl p-4"
                    style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
                  >
                    <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>RSI (14)</p>
                    <p
                      className="text-2xl font-bold tabular-nums"
                      style={{
                        color: indicators.last_rsi < 30 ? "var(--green)"
                          : indicators.last_rsi > 70 ? "var(--red)"
                          : "var(--text-primary)",
                      }}
                    >
                      {indicators.last_rsi.toFixed(1)}
                    </p>
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                      {indicators.last_rsi < 30 ? "Sobrevendido"
                        : indicators.last_rsi > 70 ? "Sobrecomprado"
                        : "Zona neutral"}
                    </p>
                  </div>
                  <div
                    className="rounded-xl p-4"
                    style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
                  >
                    <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>MACD</p>
                    <p
                      className="text-2xl font-bold tabular-nums"
                      style={{ color: (indicators.last_macd ?? 0) >= 0 ? "var(--green)" : "var(--red)" }}
                    >
                      {indicators.last_macd?.toFixed(5) ?? "—"}
                    </p>
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                      {(indicators.last_macd ?? 0) >= 0 ? "Momentum positivo" : "Momentum negativo"}
                    </p>
                  </div>
                  <div
                    className="rounded-xl p-4"
                    style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
                  >
                    <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Precio Actual</p>
                    <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
                      {indicators.last_close.toFixed(5)}
                    </p>
                    <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{chartSymbol}</p>
                  </div>
                </div>

                {/* Educational accordion */}
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ border: "1px solid var(--border)" }}
                >
                  {[
                    {
                      key: "ind-rsi",
                      title: "RSI — Relative Strength Index",
                      body: "Oscilador entre 0 y 100 que mide la fuerza del movimiento. Por encima de 70: el activo está sobrecomprado (posible corrección bajista). Por debajo de 30: sobrevendido (posible rebote alcista). Entre 30–70: zona neutral sin señal clara.",
                    },
                    {
                      key: "ind-macd",
                      title: "MACD — Moving Average Convergence Divergence",
                      body: "Mide la diferencia entre dos medias móviles exponenciales (12 y 26 períodos). Cuando el histograma está en positivo, el momentum es alcista. Negativo = bajista. La señal más fuerte es el cruce de la línea MACD sobre la línea de señal.",
                    },
                    {
                      key: "ind-bb",
                      title: "Bandas de Bollinger",
                      body: "Tres líneas: media de 20 períodos + desviación estándar ×2 (bandas superior e inferior). Cuando el precio toca la banda inferior con RSI bajo → posible entrada de compra. Cuando toca la superior con RSI alto → posible zona de venta.",
                    },
                    {
                      key: "ind-sma",
                      title: "SMA — Simple Moving Average (20/50)",
                      body: "Promedio del precio en los últimos N períodos. SMA20 sigue tendencias cortas; SMA50 tendencias medias. Cuando SMA20 cruza por encima de SMA50 (Golden Cross) es señal alcista. Cruce inverso (Death Cross) es señal bajista.",
                    },
                    {
                      key: "ind-disclaimer",
                      title: "⚠️ Disclaimer — solo educativo",
                      body: "Los indicadores técnicos son herramientas educativas, no señales de inversión. Ningún indicador predice el futuro con certeza. Las señales son automáticas y simplificadas. Antes de operar con dinero real, estudiá análisis técnico, practicá en demo y consultá con un asesor financiero.",
                    },
                  ].map((item, i) => {
                    const open = indicatorAccordion === item.key;
                    return (
                      <div key={item.key} style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined }}>
                        <button
                          onClick={() => setIndicatorAccordion(open ? null : item.key)}
                          className="w-full flex items-center justify-between px-4 py-3 text-left cursor-pointer hover:opacity-80 transition-colors"
                          style={{ background: "transparent", border: "none", fontFamily: "inherit" }}
                        >
                          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                            {item.title}
                          </span>
                          <span
                            className="text-xs transition-transform duration-200"
                            style={{ color: "var(--text-muted)", display: "inline-block", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
                          >
                            ▾
                          </span>
                        </button>
                        {open && (
                          <div className="px-4 pb-3 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                            {item.body}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}

          {!indicatorsLoading && indicators?.error && (
            <div
              className="rounded-xl p-3 text-sm"
              style={{ background: "rgba(255,71,87,0.08)", border: "1px solid var(--red)", color: "var(--red)" }}
            >
              {indicators.error}
            </div>
          )}

          {!indicatorsLoading && !indicators && (
            <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>
              Conectá MT5 para ver indicadores técnicos.
            </p>
          )}
        </div>
      </section>

      {/* ── Open positions ──────────────────────────────────────────────── */}
      <section className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
            Posiciones Abiertas
          </h2>
          {positions.length > 0 && (
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(0,212,170,0.15)", color: "var(--green)" }}
            >
              {positions.length}
            </span>
          )}
        </div>

        <div
          className="rounded-xl overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          {positions.length === 0 ? (
            <div className="py-12 text-center">
              <p className="font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
                Sin posiciones abiertas
              </p>
              <p className="text-sm max-w-sm mx-auto" style={{ color: "var(--text-muted)" }}>
                Abrí una operación en MetaTrader 5 y aparecerá aquí automáticamente.
                Esta tabla se actualiza cada 5 segundos.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Símbolo", "Tipo", "Volumen", "Entrada", "Actual", "Profit / Loss"].map((h) => (
                    <th key={h} className="text-left px-4 py-3" style={{ color: "var(--text-muted)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {positions.map((p, i) => (
                  <tr
                    key={p.ticket}
                    style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined }}
                  >
                    <td className="px-4 py-3 font-bold" style={{ color: "var(--blue)" }}>
                      {p.symbol}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          background: p.type === "BUY" ? "rgba(0,212,170,0.12)" : "rgba(255,71,87,0.12)",
                          color: p.type === "BUY" ? "var(--green)" : "var(--red)",
                        }}
                      >
                        {p.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums" style={{ color: "var(--text-muted)" }}>
                      {p.volume}
                    </td>
                    <td className="px-4 py-3 tabular-nums" style={{ color: "var(--text-muted)" }}>
                      {p.open_price}
                    </td>
                    <td className="px-4 py-3 font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
                      {p.current_price}
                    </td>
                    <td
                      className="px-4 py-3 font-semibold tabular-nums"
                      style={{ color: p.profit >= 0 ? "var(--green)" : "var(--red)" }}
                    >
                      {p.profit >= 0 ? "+" : ""}{fmt(p.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* ── Trade history ───────────────────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Historial de Operaciones
        </h2>
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          {deals.length === 0 ? (
            <div className="py-12 text-center">
              <p className="font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
                Sin operaciones cerradas
              </p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Tu historial de operaciones cerradas (90 días) aparecerá aquí.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Símbolo", "Tipo", "Volumen", "Precio Cierre", "Profit", "Fecha"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {deals.map((d, i) => (
                    <tr
                      key={d.ticket}
                      style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined }}
                    >
                      <td className="px-4 py-3 font-bold" style={{ color: "var(--blue)" }}>
                        {d.symbol}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            background: d.type === "BUY" ? "rgba(0,212,170,0.12)" : "rgba(255,71,87,0.12)",
                            color: d.type === "BUY" ? "var(--green)" : "var(--red)",
                          }}
                        >
                          {d.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums" style={{ color: "var(--text-muted)" }}>
                        {d.volume}
                      </td>
                      <td className="px-4 py-3 tabular-nums" style={{ color: "var(--text-muted)" }}>
                        {d.price}
                      </td>
                      <td
                        className="px-4 py-3 font-semibold tabular-nums"
                        style={{ color: d.profit >= 0 ? "var(--green)" : "var(--red)" }}
                      >
                        {d.profit >= 0 ? "+" : ""}{fmt(d.profit)}
                      </td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                        {new Date(d.time).toLocaleDateString("es-ES", {
                          day: "2-digit",
                          month: "short",
                          year: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ── Forex concepts ──────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xl font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Conceptos Clave del Forex
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FOREX_CONCEPTS.map((c) => (
            <div
              key={c.title}
              className="rounded-xl p-5"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <p className="font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
                {c.title}
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {c.body}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
