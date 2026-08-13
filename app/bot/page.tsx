"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { usePricesWs } from "@/app/hooks/use-prices-ws";
import { useAccountWs } from "@/app/hooks/use-account-ws";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BotStatus {
  running: boolean;
  kill_switch_tripped: boolean;
  disabled_reason: string | null;
  day_start_balance: number | null;
  account_start_balance: number | null;
  current_balance: number | null;
  current_equity: number | null;
  current_profit: number | null;
  symbols: string[];
  timeframe: string;
}

interface BotConfig {
  trend_symbols: string[];
  mean_reversion_symbols: string[];
  fast_symbols: string[];
  timeframe: string;
  fast_timeframe: string;
  risk_pct: number;
  daily_loss_limit_pct: number;
  max_drawdown_pct: number;
  trend_enabled: boolean;
  mean_reversion_enabled: boolean;
  fast_enabled: boolean;
}

interface GateFailure {
  symbol: string | null;
  profit_factor: number | null;
  error: string | null;
}

interface BotTrade {
  id: number;
  ticket: number | null;
  symbol: string;
  action: string;
  volume: number;
  price: number;
  sl: number | null;
  tp: number | null;
  signal_reason: string | null;
  status: string;
  profit: number | null;
  opened_at: string | null;
  closed_at: string | null;
  mode: string | null;
}

const TIMEFRAMES = ["M1", "M5", "M15", "M30", "H1", "H4", "D1"];

const GLOSSARY = [
  {
    key: "symbol",
    term: "Símbolo",
    short: "El instrumento que el bot opera (ej. EURUSD).",
    detail:
      "Cada símbolo es un par o activo distinto — EURUSD es Euro contra Dólar, GBPUSD es Libra contra Dólar. Cada uno se mueve distinto: distinta volatilidad, distinto spread. El bot analiza cada símbolo por separado y puede tener como máximo una posición abierta por símbolo a la vez.",
  },
  {
    key: "timeframe",
    term: "Timeframe",
    short: "Cada cuánto se forma una vela nueva que el bot analiza.",
    detail:
      "M1 = una vela cada 1 minuto, M15 = cada 15 minutos, H1 = cada hora. El bot solo decide cuando una vela termina de formarse (se \"cierra\") — mientras se está formando, los indicadores todavía están cambiando y no sirven para decidir. Timeframe chico = reacciona rápido pero con más ruido y señales falsas. Timeframe grande = más lento pero más confiable.",
  },
  {
    key: "signal",
    term: "Señal fuerte (COMPRAR/VENDER FUERTE)",
    short: "El bot solo abre operación con estas dos señales, ninguna otra.",
    detail:
      "El bot calcula RSI y MACD en cada vela cerrada. Solo abre posición cuando la combinación da \"COMPRAR FUERTE\" o \"VENDER FUERTE\" — señales intermedias como \"TENDENCIA ALCISTA/BAJISTA\" o \"ESPERAR\" no disparan ninguna acción. Por diseño: mejor perderse una entrada dudosa que abrir con poca convicción.",
  },
  {
    key: "risk_pct",
    term: "Riesgo por operación (%)",
    short: "Cuánto del balance puede perder el bot en un solo trade.",
    detail:
      "Con 1% y balance de $100,000, el bot arriesga máximo $1,000 por operación — nunca más, sin importar el símbolo. El tamaño de la posición (lotes) se calcula automáticamente para que, si toca el Stop Loss, la pérdida sea exactamente ese porcentaje.",
  },
  {
    key: "daily_loss",
    term: "Límite de pérdida diaria (%)",
    short: "Si el bot pierde esto en un día, se apaga solo.",
    detail:
      "Se mide contra el balance al inicio del día (server time). Si el equity cae ese porcentaje o más, el kill switch se activa: el bot deja de abrir operaciones nuevas hasta que lo reactivés manualmente. No cierra las posiciones que ya tenía abiertas — esas siguen con su propio Stop Loss.",
  },
  {
    key: "drawdown",
    term: "Drawdown máximo (%)",
    short: "Igual que el límite diario, pero acumulado desde el inicio.",
    detail:
      "Mide la caída total del equity respecto al balance con el que arrancó la cuenta la primera vez que corrió el bot — no se resetea cada día como el límite diario. Es la última línea de defensa contra una racha larga de pérdidas.",
  },
  {
    key: "kill_switch",
    term: "Kill switch",
    short: "El freno de emergencia automático del bot.",
    detail:
      "Se activa solo cuando se cruza el límite diario o el drawdown máximo. Mientras está activo, el bot no abre ninguna operación nueva — solo vos podés reactivarlo desde el botón \"Reactivar\", después de revisar qué pasó. Es la protección para que un bug o una mala racha no te vacíe la cuenta mientras no estás mirando.",
  },
];

const REASON_LABELS: Record<string, string> = {
  daily_loss_limit: "Límite de pérdida diaria alcanzado",
  max_drawdown: "Drawdown máximo alcanzado",
};

function fmt(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Reset kill switch confirm modal ───────────────────────────────────────────

function ResetKillSwitchModal({ onConfirm, onCancel }: Readonly<{ onConfirm: () => void; onCancel: () => void }>) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
        zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
      }}
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16,
          padding: "1.5rem", maxWidth: 400, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.75rem" }}>
          Reactivar bot
        </h3>
        <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.5, marginBottom: "1.25rem" }}>
          El bot se apagó solo por seguridad. Reactivarlo permite que vuelva a abrir operaciones
          automáticamente. Asegurate de haber revisado qué pasó antes de continuar.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <button
            onClick={onCancel}
            style={{
              padding: "0.75rem", borderRadius: 10, border: "1px solid var(--border)",
              background: "transparent", color: "var(--text-muted)", fontWeight: 600,
              cursor: "pointer", fontSize: 14, fontFamily: "inherit",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "0.75rem", borderRadius: 10, border: "none", background: "var(--green)",
              color: "#0a1628", fontWeight: 700, cursor: "pointer", fontSize: 14, fontFamily: "inherit",
            }}
          >
            Reactivar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

const TRADES_PAGE_SIZE = 10;

export default function BotPage() {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [trades, setTrades] = useState<BotTrade[]>([]);
  const [tradesTotal, setTradesTotal] = useState(0);
  const [tradesPage, setTradesPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  // Config form (percentages shown as whole numbers, e.g. 1 = 1%)
  const [availableSymbols, setAvailableSymbols] = useState<string[]>([]);
  const [trendSymbols, setTrendSymbols] = useState<string[]>([]);
  const [meanReversionSymbols, setMeanReversionSymbols] = useState<string[]>([]);
  const [fastSymbols, setFastSymbols] = useState<string[]>([]);
  const [timeframe, setTimeframe] = useState("M15");
  const [fastTimeframe, setFastTimeframe] = useState("M5");
  const [riskPct, setRiskPct] = useState(1);
  const [dailyLossPct, setDailyLossPct] = useState(3);
  const [maxDrawdownPct, setMaxDrawdownPct] = useState(10);
  const [trendEnabled, setTrendEnabled] = useState(true);
  const [meanReversionEnabled, setMeanReversionEnabled] = useState(true);
  const [fastEnabled, setFastEnabled] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);
  const [gateFailure, setGateFailure] = useState<{ mode: string; failures: GateFailure[] } | null>(null);
  const [openItem, setOpenItem] = useState<string | null>(null);

  async function fetchStatus() {
    try {
      const { data } = await api.get("/api/bot/status");
      setStatus(data);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }

  async function fetchConfig() {
    try {
      const { data } = await api.get<BotConfig>("/api/bot/config");
      setTrendSymbols(data.trend_symbols);
      setMeanReversionSymbols(data.mean_reversion_symbols);
      setFastSymbols(data.fast_symbols);
      setTimeframe(data.timeframe);
      setFastTimeframe(data.fast_timeframe);
      setRiskPct(Math.round(data.risk_pct * 1000) / 10);
      setDailyLossPct(Math.round(data.daily_loss_limit_pct * 1000) / 10);
      setMaxDrawdownPct(Math.round(data.max_drawdown_pct * 1000) / 10);
      setTrendEnabled(data.trend_enabled);
      setMeanReversionEnabled(data.mean_reversion_enabled);
      setFastEnabled(data.fast_enabled);
    } catch {}
  }

  async function fetchAvailableSymbols() {
    try {
      const { data } = await api.get<{ symbols: { name: string }[] }>("/api/mt5/symbols");
      setAvailableSymbols(data.symbols.map((s) => s.name));
    } catch {}
  }

  function toggleSymbolIn(setter: (updater: (prev: string[]) => string[]) => void, sym: string) {
    setter((prev) => (prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]));
  }

  function applyFastPreset() {
    setFastSymbols(["EURUSD", "GBPUSD", "USDJPY", "USDCHF"]);
    setFastTimeframe("M5");
  }

  async function fetchTrades(page: number) {
    try {
      const { data } = await api.get<{ trades: BotTrade[]; total: number }>("/api/bot/trades", {
        params: { limit: TRADES_PAGE_SIZE, offset: page * TRADES_PAGE_SIZE },
      });
      setTrades(data.trades);
      setTradesTotal(data.total);
    } catch {}
  }

  useEffect(() => {
    fetchStatus();
    fetchConfig();
    fetchAvailableSymbols();
    const interval = setInterval(fetchStatus, 10_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchTrades(tradesPage);
    const interval = setInterval(() => fetchTrades(tradesPage), 10_000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradesPage]);

  async function toggleRunning() {
    if (!status) return;
    setToggleLoading(true);
    try {
      await api.post(status.running ? "/api/bot/stop" : "/api/bot/start");
      await fetchStatus();
    } finally {
      setToggleLoading(false);
    }
  }

  async function confirmResetKillSwitch() {
    setShowResetModal(false);
    await api.post("/api/bot/reset-kill-switch");
    await fetchStatus();
  }

  async function saveConfig() {
    setConfigLoading(true);
    setConfigSaved(false);
    setGateFailure(null);
    try {
      await api.put("/api/bot/config", {
        trend_symbols: trendSymbols,
        mean_reversion_symbols: meanReversionSymbols,
        fast_symbols: fastSymbols,
        timeframe,
        fast_timeframe: fastTimeframe,
        risk_pct: riskPct / 100,
        daily_loss_limit_pct: dailyLossPct / 100,
        max_drawdown_pct: maxDrawdownPct / 100,
        trend_enabled: trendEnabled,
        mean_reversion_enabled: meanReversionEnabled,
        fast_enabled: fastEnabled,
      });
      setConfigSaved(true);
      fetchStatus();
      setTimeout(() => setConfigSaved(false), 3000);
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: { mode: string; failures: GateFailure[] } } } })?.response?.data?.detail;
      if (detail) {
        setGateFailure(detail);
        await fetchConfig(); // revert the enabled toggle to what's actually saved
      }
    } finally {
      setConfigLoading(false);
    }
  }

  const running = status?.running ?? false;
  const tripped = status?.kill_switch_tripped ?? false;
  const livePrices = usePricesWs(status?.symbols ?? []);
  const acctWs = useAccountWs();

  return (
    <div className="max-w-5xl mx-auto">
      {showResetModal && (
        <ResetKillSwitchModal onConfirm={confirmResetKillSwitch} onCancel={() => setShowResetModal(false)} />
      )}

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Bot de Trading
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            Automático sobre MT5 · indicadores técnicos
          </p>
        </div>

        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
          style={
            tripped
              ? { background: "rgba(255,71,87,0.1)", border: "1px solid rgba(255,71,87,0.35)", color: "var(--red)" }
              : running
              ? { background: "rgba(0,212,170,0.12)", border: "1px solid rgba(0,212,170,0.3)", color: "var(--green)" }
              : { background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-muted)" }
          }
        >
          <span
            style={{
              width: 7, height: 7, borderRadius: "50%",
              background: tripped ? "var(--red)" : running ? "var(--green)" : "var(--text-muted)",
              display: "inline-block", flexShrink: 0,
            }}
          />
          {tripped ? "KILL SWITCH" : running ? "CORRIENDO" : "DETENIDO"}
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {(["a", "b", "c", "d"] as const).map((k) => (
            <div key={k} className="animate-pulse rounded-xl h-24" style={{ background: "var(--bg-card)" }} />
          ))}
        </div>
      )}

      {/* ── Kill switch banner ──────────────────────────────────────────── */}
      {!loading && tripped && (
        <div
          className="mb-6 p-4 rounded-xl flex items-center justify-between gap-4"
          style={{ background: "rgba(255,71,87,0.08)", border: "1px solid var(--red)" }}
        >
          <div>
            <p className="font-semibold mb-1" style={{ color: "var(--red)" }}>
              El bot se apagó automáticamente
            </p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {REASON_LABELS[status?.disabled_reason ?? ""] ?? status?.disabled_reason}
            </p>
          </div>
          <button
            onClick={() => setShowResetModal(true)}
            className="px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer shrink-0 active:scale-[0.97] transition-transform duration-150"
            style={{ background: "var(--green)", color: "#0a1628", border: "none" }}
          >
            Reactivar
          </button>
        </div>
      )}

      {/* ── Status stats ────────────────────────────────────────────────── */}
      {!loading && status && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
              Estado
            </h2>
            <button
              onClick={toggleRunning}
              disabled={toggleLoading || tripped}
              className="px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-40 active:scale-[0.97] transition-[transform,opacity] duration-150"
              style={
                running
                  ? { background: "rgba(255,71,87,0.15)", border: "1px solid rgba(255,71,87,0.4)", color: "var(--red)" }
                  : { background: "rgba(0,212,170,0.15)", border: "1px solid rgba(0,212,170,0.4)", color: "var(--green)" }
              }
            >
              {toggleLoading ? "…" : running ? "Detener bot" : "Iniciar bot"}
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {[
              { label: "Balance actual", value: `$${fmt(status.current_balance)}`, color: "var(--text-primary)" },
              { label: "Equity actual", value: `$${fmt(status.current_equity)}`, color: "var(--text-primary)" },
              {
                label: "Profit flotante",
                value: status.current_profit === null ? "—" : `${status.current_profit >= 0 ? "+" : ""}$${fmt(status.current_profit)}`,
                color: (status.current_profit ?? 0) >= 0 ? "var(--green)" : "var(--red)",
              },
              { label: "Timeframe", value: status.timeframe, color: "var(--blue)" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>{label}</p>
                <p className="text-lg font-bold tabular-nums" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Balance inicio del día", value: `$${fmt(status.day_start_balance)}`, color: "var(--text-muted)" },
              { label: "Balance inicial cuenta", value: `$${fmt(status.account_start_balance)}`, color: "var(--text-muted)" },
              { label: "Símbolos", value: String(status.symbols.length), color: "var(--blue)" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>{label}</p>
                <p className="text-lg font-bold tabular-nums" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Open positions (live SL/TP progress) ───────────────────────────── */}
      {acctWs.positions.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
              Posiciones abiertas
            </h2>
            <span
              style={{
                width: 6, height: 6, borderRadius: "50%",
                background: acctWs.ready ? "var(--green)" : "var(--text-muted)",
                display: "inline-block",
              }}
            />
          </div>
          <div className="flex flex-col gap-3">
            {acctWs.positions.map((p) => {
              const priceDec = p.current_price < 10 ? 5 : 3;
              const fmtPrice = (n: number) => n.toFixed(priceDec);
              const range = p.tp - p.sl;
              const rawPct = range !== 0 ? (p.current_price - p.sl) / range : 0.5;
              const pct = Math.max(0, Math.min(1, rawPct));
              const entryPct = range !== 0 ? Math.max(0, Math.min(1, (p.open_price - p.sl) / range)) : 0.5;
              const distToSL = Math.abs(p.current_price - p.sl);
              const distToTP = Math.abs(p.current_price - p.tp);
              const profitColor = p.profit >= 0 ? "var(--green)" : "var(--red)";

              return (
                <div key={p.ticket} className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-bold" style={{ color: "var(--blue)" }}>{p.symbol}</span>
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          background: p.type === "BUY" ? "rgba(0,212,170,0.12)" : "rgba(255,71,87,0.12)",
                          color: p.type === "BUY" ? "var(--green)" : "var(--red)",
                        }}
                      >
                        {p.type}
                      </span>
                      <span className="text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>{p.volume} lotes</span>
                    </div>
                    <span className="text-base font-bold tabular-nums" style={{ color: profitColor }}>
                      {p.profit >= 0 ? "+" : ""}{fmt(p.profit)}
                    </span>
                  </div>

                  {/* SL ↔ TP progress bar */}
                  <div className="relative mb-2" style={{ height: 8 }}>
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{ background: "linear-gradient(90deg, rgba(255,71,87,0.25), rgba(0,212,170,0.25))" }}
                    />
                    {/* Entry marker */}
                    <div
                      className="absolute rounded-full"
                      style={{
                        left: `${entryPct * 100}%`, top: -3, width: 2, height: 14,
                        background: "var(--text-muted)", transform: "translateX(-1px)",
                      }}
                    />
                    {/* Current price marker */}
                    <div
                      className="absolute rounded-full transition-[left] duration-500 ease-out"
                      style={{
                        left: `${pct * 100}%`, top: -4, width: 16, height: 16,
                        background: profitColor, transform: "translateX(-8px)",
                        border: "2px solid var(--bg-card)", boxShadow: `0 0 6px ${profitColor}`,
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs" style={{ color: "var(--text-muted)" }}>
                    <span>SL {fmtPrice(p.sl)} <span className="tabular-nums">({fmtPrice(distToSL)})</span></span>
                    <span>Entrada {fmtPrice(p.open_price)}</span>
                    <span>TP {fmtPrice(p.tp)} <span className="tabular-nums">({fmtPrice(distToTP)})</span></span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Live prices ──────────────────────────────────────────────────── */}
      {!loading && status && status.symbols.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
              Precios en vivo
            </h2>
            <span
              style={{
                width: 6, height: 6, borderRadius: "50%",
                background: livePrices.ready ? "var(--green)" : "var(--text-muted)",
                display: "inline-block",
              }}
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {status.symbols.map((sym) => {
              const tick = livePrices.prices[sym];
              return (
                <div key={sym} className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <p className="text-xs mb-2 font-bold" style={{ color: "var(--blue)" }}>{sym}</p>
                  {tick ? (
                    <>
                      <p className="text-lg font-bold tabular-nums" style={{ color: "var(--text-primary)" }}>
                        {tick.bid.toFixed(tick.digits)}
                      </p>
                      <p className="text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>
                        ask {tick.ask.toFixed(tick.digits)} · spread {tick.spread}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>—</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Educational accordion ───────────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          ¿Qué significa cada cosa?
        </h2>
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          {GLOSSARY.map((item, i) => {
            const open = openItem === item.key;
            return (
              <div key={item.key} style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined }}>
                <button
                  onClick={() => setOpenItem(open ? null : item.key)}
                  className="w-full flex items-center gap-3 px-5 py-4 text-left cursor-pointer transition-colors hover:opacity-80"
                  style={{ background: "transparent", border: "none", fontFamily: "inherit" }}
                >
                  <div className="flex-1">
                    <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{item.term}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{item.short}</p>
                  </div>
                  <span
                    className="text-xs shrink-0 transition-transform duration-200"
                    style={{ color: "var(--text-muted)", display: "inline-block", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
                  >
                    ▾
                  </span>
                </button>
                {open && (
                  <div className="px-5 pb-4 text-sm leading-relaxed" style={{ color: "var(--text-muted)", paddingLeft: "3.75rem" }}>
                    {item.detail}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Config ───────────────────────────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Configuración
        </h2>
        <div className="rounded-xl p-5 mb-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          {([
            { label: "Trend", symbols: trendSymbols, setter: setTrendSymbols, enabled: trendEnabled, setEnabled: setTrendEnabled },
            { label: "Mean Reversion", symbols: meanReversionSymbols, setter: setMeanReversionSymbols, enabled: meanReversionEnabled, setEnabled: setMeanReversionEnabled },
          ] as const).map((mode) => (
            <div key={mode.label} className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {mode.label} — símbolos ({mode.symbols.length} seleccionados)
                </label>
                <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "var(--text-muted)" }}>
                  <input type="checkbox" checked={mode.enabled} onChange={(e) => mode.setEnabled(e.target.checked)} />
                  Activo
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableSymbols.length === 0 ? (
                  <span className="text-sm" style={{ color: "var(--text-muted)" }}>Cargando símbolos disponibles del broker…</span>
                ) : (
                  availableSymbols.map((sym) => {
                    const active = mode.symbols.includes(sym);
                    return (
                      <button
                        key={sym}
                        type="button"
                        onClick={() => toggleSymbolIn(mode.setter, sym)}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer active:scale-[0.97] transition-[transform,opacity] duration-150"
                        style={
                          active
                            ? { background: "rgba(61,124,255,0.15)", border: "1px solid var(--blue)", color: "var(--blue)" }
                            : { background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-muted)" }
                        }
                      >
                        {active ? "✓ " : ""}{sym}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ))}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Timeframe (Trend / Mean Reversion)</label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              >
                {TIMEFRAMES.map((tf) => <option key={tf} value={tf}>{tf}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Riesgo por operación (%)</label>
              <input
                type="number" step="0.1" min="0" value={riskPct}
                onChange={(e) => setRiskPct(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Límite de pérdida diaria (%)</label>
              <input
                type="number" step="0.1" min="0" value={dailyLossPct}
                onChange={(e) => setDailyLossPct(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Drawdown máximo (%)</label>
              <input
                type="number" step="0.1" min="0" value={maxDrawdownPct}
                onChange={(e) => setMaxDrawdownPct(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={saveConfig}
              disabled={configLoading}
              className="px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-40 active:scale-[0.97] transition-transform duration-150"
              style={{ background: "var(--blue)", color: "#fff", border: "none" }}
            >
              {configLoading ? "Guardando…" : "Guardar configuración"}
            </button>
            {configSaved && <span className="text-sm" style={{ color: "var(--green)" }}>✓ Guardado</span>}
          </div>
        </div>

        {/* ── Fast mode ────────────────────────────────────────────────── */}
        <div className="rounded-xl p-5" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Rápida (Fast)</h3>
            <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "var(--text-muted)" }}>
              <input type="checkbox" checked={fastEnabled} onChange={(e) => setFastEnabled(e.target.checked)} />
              Activo
            </label>
          </div>

          <div className="mb-4 p-3 rounded-lg text-xs leading-relaxed" style={{ background: "rgba(255,71,87,0.06)", border: "1px solid rgba(255,71,87,0.25)", color: "var(--text-muted)" }}>
            <p className="font-semibold mb-1" style={{ color: "var(--red)" }}>Advertencias antes de activar</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Umbral de entrada débil — entra también con TENDENCIA ALCISTA/BAJISTA, no solo señal FUERTE.</li>
              <li>Sin evidencia hasta pasar el backtest automático (se corre al intentar activar).</li>
              <li>Más trades = más costo de spread relativo al riesgo por operación.</li>
              <li>Kill switch compartido con Trend y Mean Reversion a nivel de cuenta.</li>
              <li>Timeframe corto (M5 por defecto) tiene más ruido que M15.</li>
            </ul>
          </div>

          {gateFailure && (
            <div className="mb-4 p-3 rounded-lg text-xs" style={{ background: "rgba(255,71,87,0.1)", border: "1px solid var(--red)", color: "var(--red)" }}>
              <p className="font-semibold mb-1">No se pudo activar el modo &quot;{gateFailure.mode}&quot; — backtest no lo respalda</p>
              {gateFailure.failures.map((f) => (
                <p key={f.symbol ?? "none"}>
                  {f.symbol ?? "—"}: {f.error ?? `profit factor ${f.profit_factor ?? "—"}`}
                </p>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mb-2">
            <label className="text-xs" style={{ color: "var(--text-muted)" }}>
              Símbolos ({fastSymbols.length} seleccionados)
            </label>
            <button
              type="button"
              onClick={applyFastPreset}
              className="text-xs font-semibold cursor-pointer px-2 py-1 rounded-md"
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--blue)" }}
            >
              Aplicar preset
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {availableSymbols.map((sym) => {
              const active = fastSymbols.includes(sym);
              return (
                <button
                  key={sym}
                  type="button"
                  onClick={() => toggleSymbolIn(setFastSymbols, sym)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer active:scale-[0.97] transition-[transform,opacity] duration-150"
                  style={
                    active
                      ? { background: "rgba(61,124,255,0.15)", border: "1px solid var(--blue)", color: "var(--blue)" }
                      : { background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-muted)" }
                  }
                >
                  {active ? "✓ " : ""}{sym}
                </button>
              );
            })}
          </div>

          <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Timeframe (Fast)</label>
          <select
            value={fastTimeframe}
            onChange={(e) => setFastTimeframe(e.target.value)}
            className="w-full md:w-48 px-3 py-2 rounded-lg text-sm"
            style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
          >
            {TIMEFRAMES.map((tf) => <option key={tf} value={tf}>{tf}</option>)}
          </select>
        </div>
      </section>

      {/* ── Trades ───────────────────────────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Operaciones del bot
        </h2>
        <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          {trades.length === 0 ? (
            <div className="py-12 text-center">
              <p className="font-semibold mb-2" style={{ color: "var(--text-muted)" }}>Sin operaciones todavía</p>
              <p className="text-sm max-w-sm mx-auto" style={{ color: "var(--text-muted)" }}>
                Cuando el bot detecte una señal fuerte y abra una posición, aparecerá acá.
                Se actualiza cada 10 segundos.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 720 }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["Símbolo", "Modo", "Acción", "Volumen", "Precio", "SL", "TP", "Estado", "Profit", "Abierta", "Razón"].map((h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 whitespace-nowrap"
                        style={{ color: "var(--text-muted)", background: "var(--bg-card)", position: "sticky", top: 0, zIndex: 1 }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trades.map((t, i) => (
                    <tr
                      key={t.id}
                      className="transition-colors duration-150 hover:bg-[var(--bg-secondary)]"
                      style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined }}
                    >
                      <td className="px-4 py-3.5 text-[15px] font-bold" style={{ color: "var(--blue)" }}>{t.symbol}</td>
                      <td className="px-4 py-3.5">
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            background: t.mode === "mean_reversion" ? "rgba(61,124,255,0.12)" : "var(--bg-secondary)",
                            color: t.mode === "mean_reversion" ? "var(--blue)" : "var(--text-muted)",
                          }}
                        >
                          {t.mode === "mean_reversion" ? "Mean Rev" : "Trend"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            background: t.action === "buy" ? "rgba(0,212,170,0.12)" : "rgba(255,71,87,0.12)",
                            color: t.action === "buy" ? "var(--green)" : "var(--red)",
                          }}
                        >
                          {t.action.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 tabular-nums" style={{ color: "var(--text-muted)" }}>{t.volume}</td>
                      <td className="px-4 py-3.5 tabular-nums" style={{ color: "var(--text-primary)" }}>{t.price}</td>
                      <td className="px-4 py-3.5 tabular-nums" style={{ color: "var(--red)" }}>{t.sl ?? "—"}</td>
                      <td className="px-4 py-3.5 tabular-nums" style={{ color: "var(--green)" }}>{t.tp ?? "—"}</td>
                      <td className="px-4 py-3.5">
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            background: t.status === "rejected" ? "rgba(255,71,87,0.12)" : "var(--bg-secondary)",
                            color: t.status === "rejected" ? "var(--red)" : "var(--text-muted)",
                          }}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3.5 text-base font-bold tabular-nums"
                        style={{ color: t.profit === null ? "var(--text-muted)" : t.profit >= 0 ? "var(--green)" : "var(--red)" }}
                      >
                        {t.profit === null ? "—" : `${t.profit >= 0 ? "+" : ""}${fmt(t.profit)}`}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                        {t.opened_at ? new Date(t.opened_at).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                      <td
                        className="px-4 py-3.5 max-w-[220px] truncate"
                        style={{ color: "var(--text-muted)" }}
                        title={t.signal_reason ?? undefined}
                      >
                        {t.signal_reason ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {tradesTotal > TRADES_PAGE_SIZE && (
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {tradesPage * TRADES_PAGE_SIZE + 1}–{Math.min((tradesPage + 1) * TRADES_PAGE_SIZE, tradesTotal)} de {tradesTotal}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setTradesPage((p) => Math.max(0, p - 1))}
                disabled={tradesPage === 0}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-40 active:scale-[0.97] transition-transform duration-150"
                style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              >
                ← Anterior
              </button>
              <button
                onClick={() => setTradesPage((p) => p + 1)}
                disabled={(tradesPage + 1) * TRADES_PAGE_SIZE >= tradesTotal}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-40 active:scale-[0.97] transition-transform duration-150"
                style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
