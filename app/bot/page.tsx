"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { usePricesWs } from "@/app/hooks/use-prices-ws";
import { useAccountWs, WsPosition } from "@/app/hooks/use-account-ws";

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
  max_loss_pct: number;
  trailing_trigger_pct: number;
  trailing_distance_atr: number;
  trading_capital: number | null;
  ml_filter_trend_enabled: boolean;
  ml_filter_fast_enabled: boolean;
  ml_filter_min_confidence: number;
}

interface MlModelStatus {
  mode: string;
  n_trades: number;
  profit_factor_filtered: number | null;
  profit_factor_unfiltered: number | null;
  enabled: number;
  trained_at: string;
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
  close_price: number | null;
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

const MODE_LABELS: Record<string, string> = {
  trend: "Trend", mean_reversion: "Mean Rev", fast: "Fast", manual: "Manual",
};

function PositionsDetailModal({
  positions, config, onClose,
}: Readonly<{ positions: WsPosition[]; config: BotConfig | null; onClose: () => void }>) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
        zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16,
          padding: "1.5rem", maxWidth: 720, width: "100%", maxHeight: "85vh", overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: "1.1rem" }}>
            Posiciones abiertas y configuración activa
          </h3>
          <button
            onClick={onClose}
            className="cursor-pointer"
            style={{ color: "var(--text-muted)", background: "none", border: "none", fontSize: 20, lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {config && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 p-3 rounded-lg text-xs" style={{ background: "var(--bg-secondary)" }}>
            <div>
              <p style={{ color: "var(--text-muted)" }}>Capital de trading</p>
              <p className="font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
                {config.trading_capital ? `$${config.trading_capital}` : "Balance real"}
              </p>
            </div>
            <div>
              <p style={{ color: "var(--text-muted)" }}>Riesgo por operación</p>
              <p className="font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>{(config.risk_pct * 100).toFixed(2)}%</p>
            </div>
            <div>
              <p style={{ color: "var(--text-muted)" }}>Timeframe Trend/MR</p>
              <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{config.timeframe}</p>
            </div>
            <div>
              <p style={{ color: "var(--text-muted)" }}>Timeframe Fast</p>
              <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{config.fast_timeframe}</p>
            </div>
            <div>
              <p style={{ color: "var(--text-muted)" }}>Cierre forzado (hard stop)</p>
              <p className="font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>{(config.max_loss_pct * 100).toFixed(2)}%</p>
            </div>
            <div>
              <p style={{ color: "var(--text-muted)" }}>Trailing activa a</p>
              <p className="font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>{(config.trailing_trigger_pct * 100).toFixed(0)}% hacia TP</p>
            </div>
            <div>
              <p style={{ color: "var(--text-muted)" }}>Distancia trailing</p>
              <p className="font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>{config.trailing_distance_atr}x ATR</p>
            </div>
            <div>
              <p style={{ color: "var(--text-muted)" }}>Modos activos</p>
              <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
                {[config.trend_enabled && "Trend", config.mean_reversion_enabled && "Mean Rev", config.fast_enabled && "Fast"].filter(Boolean).join(", ") || "Ninguno"}
              </p>
            </div>
          </div>
        )}

        {positions.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Sin posiciones abiertas.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {positions.map((p) => (
              <div key={p.ticket} className="p-3 rounded-lg text-sm" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold" style={{ color: "var(--blue)" }}>{p.symbol}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(61,124,255,0.12)", color: "var(--blue)" }}>
                    {MODE_LABELS[p.mode] ?? p.mode}
                  </span>
                  <span className="text-xs" style={{ color: p.type === "BUY" ? "var(--green)" : "var(--red)" }}>{p.type}</span>
                  <span className="text-xs ml-auto tabular-nums" style={{ color: p.profit >= 0 ? "var(--green)" : "var(--red)" }}>
                    {p.profit >= 0 ? "+" : ""}{p.profit.toFixed(2)}
                  </span>
                </div>
                <div className="text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>
                  Ticket {p.ticket} · {p.volume} lotes · Entrada {p.open_price} · SL {p.sl} · TP {p.tp} · Margen ${p.margin ?? "—"}
                </div>
                <div className="text-xs mt-1" style={{ color: p.ml_confidence != null ? "var(--blue)" : "var(--text-muted)" }}>
                  {(() => {
                    if (p.ml_confidence != null) {
                      return `Filtro ML: aprobada con ${(p.ml_confidence * 100).toFixed(0)}% de confianza`;
                    }
                    if (p.mode !== "trend" && p.mode !== "fast") {
                      return "Filtro ML: no aplica a este modo";
                    }
                    const mlEnabled = p.mode === "trend" ? config?.ml_filter_trend_enabled : config?.ml_filter_fast_enabled;
                    return mlEnabled
                      ? "Filtro ML: activo, pero sin modelo entrenado todavía (no aplicado)"
                      : "Filtro ML: desactivado para este modo";
                  })()}
                </div>
              </div>
            ))}
          </div>
        )}
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
  const [maxLossPct, setMaxLossPct] = useState(1);
  const [trailingTriggerPct, setTrailingTriggerPct] = useState(30);
  const [trailingDistanceAtr, setTrailingDistanceAtr] = useState(1);
  const [closingTicket, setClosingTicket] = useState<number | null>(null);
  const [tradingCapital, setTradingCapital] = useState(0);
  const [mlFilterTrendEnabled, setMlFilterTrendEnabled] = useState(false);
  const [mlFilterFastEnabled, setMlFilterFastEnabled] = useState(false);
  const [mlMinConfidence, setMlMinConfidence] = useState(50);
  const [mlModels, setMlModels] = useState<{ trend: MlModelStatus | null; fast: MlModelStatus | null }>({ trend: null, fast: null });
  const [mlTraining, setMlTraining] = useState(false);
  const [mlTrainResult, setMlTrainResult] = useState<Record<string, { trained: boolean; n_trades?: number; error?: string; profit_factor_filtered?: number | null; profit_factor_unfiltered?: number | null }> | null>(null);
  const [mlTrainError, setMlTrainError] = useState<string | null>(null);
  const [expandedTradeId, setExpandedTradeId] = useState<number | null>(null);
  const [showPositionsDetailModal, setShowPositionsDetailModal] = useState(false);
  const [botConfig, setBotConfig] = useState<BotConfig | null>(null);

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
      setBotConfig(data);
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
      setMaxLossPct(Math.round(data.max_loss_pct * 1000) / 10);
      setTrailingTriggerPct(Math.round(data.trailing_trigger_pct * 1000) / 10);
      setTradingCapital(data.trading_capital ?? 0);
      setTrailingDistanceAtr(data.trailing_distance_atr);
      setMlFilterTrendEnabled(data.ml_filter_trend_enabled);
      setMlFilterFastEnabled(data.ml_filter_fast_enabled);
      setMlMinConfidence(Math.round(data.ml_filter_min_confidence * 100));
    } catch {}
  }

  async function fetchMlModels() {
    try {
      const { data } = await api.get<{ trend: MlModelStatus | null; fast: MlModelStatus | null }>("/api/ml/models");
      setMlModels(data);
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
    fetchMlModels();
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

  async function closePosition(ticket: number) {
    setClosingTicket(ticket);
    try {
      await api.post(`/api/mt5/close/${ticket}`);
    } finally {
      setClosingTicket(null);
    }
  }

  async function saveConfig() {
    setConfigLoading(true);
    setConfigSaved(false);
    setGateFailure(null);
    try {
      const { data } = await api.put<BotConfig>("/api/bot/config", {
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
        max_loss_pct: maxLossPct / 100,
        trailing_trigger_pct: trailingTriggerPct / 100,
        trading_capital: tradingCapital,
        trailing_distance_atr: trailingDistanceAtr,
        ml_filter_trend_enabled: mlFilterTrendEnabled,
        ml_filter_fast_enabled: mlFilterFastEnabled,
        ml_filter_min_confidence: mlMinConfidence / 100,
      });
      setBotConfig(data);
      setConfigSaved(true);
      fetchStatus();
      setTimeout(() => setConfigSaved(false), 3000);
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      if (detail && typeof detail === "object" && "failures" in detail && Array.isArray((detail as { failures: unknown }).failures)) {
        setGateFailure(detail as { mode: string; failures: GateFailure[] });
        await fetchConfig(); // revert the enabled toggle to what's actually saved
      }
    } finally {
      setConfigLoading(false);
    }
  }

  async function trainMlModels() {
    setMlTraining(true);
    setMlTrainError(null);
    try {
      const { data } = await api.post("/api/ml/train");
      setMlTrainResult(data);
      await fetchMlModels();
    } catch {
      setMlTrainError("No se pudo entrenar — revisá la conexión con el backend.");
    } finally {
      setMlTraining(false);
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
      {showPositionsDetailModal && (
        <PositionsDetailModal
          positions={acctWs.positions}
          config={botConfig}
          onClose={() => setShowPositionsDetailModal(false)}
        />
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
            <button
              type="button"
              onClick={() => setShowPositionsDetailModal(true)}
              className="w-5 h-5 rounded-full text-xs font-bold cursor-pointer flex items-center justify-center"
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
              title="Ver detalle y configuración activa"
            >
              i
            </button>
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
              const trailingActive = p.sl_original != null && fmtPrice(p.sl) !== fmtPrice(p.sl_original);
              const tpDistanceFromEntry = p.type === "BUY" ? p.tp - p.open_price : p.open_price - p.tp;
              const progressToTpPct = tpDistanceFromEntry !== 0
                ? Math.max(0, ((p.type === "BUY" ? p.current_price - p.open_price : p.open_price - p.current_price) / tpDistanceFromEntry) * 100)
                : 0;

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
                      {trailingActive && (
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(61,124,255,0.15)", color: "var(--blue)" }}
                          title={`SL original ${fmtPrice(p.sl_original as number)} → ${fmtPrice(p.sl)}`}
                        >
                          SL ajustado ✓
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-base font-bold tabular-nums" style={{ color: profitColor }}>
                        {p.profit >= 0 ? "+" : ""}{fmt(p.profit)}
                      </span>
                      <button
                        onClick={() => closePosition(p.ticket)}
                        disabled={closingTicket === p.ticket}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-40 active:scale-[0.97] transition-[transform,opacity] duration-150"
                        style={{ background: "rgba(255,71,87,0.15)", border: "1px solid rgba(255,71,87,0.4)", color: "var(--red)" }}
                      >
                        {closingTicket === p.ticket ? "Cerrando…" : "Cerrar"}
                      </button>
                    </div>
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
                  <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    Entraste a {fmtPrice(p.open_price)} · <span className="tabular-nums">{Math.min(progressToTpPct, 999).toFixed(0)}%</span> del camino hacia tu Take Profit
                    {p.margin != null && (
                      <>
                        {" · Invertido $"}<span className="tabular-nums">{p.margin.toFixed(2)}</span>
                        {" · "}
                        <span className="tabular-nums" style={{ color: profitColor }}>
                          {p.margin > 0 ? `${p.profit >= 0 ? "+" : ""}${((p.profit / p.margin) * 100).toFixed(1)}%` : "—"}
                        </span>
                        {" retorno"}
                      </>
                    )}
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

          <div className="mb-4">
            <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Timeframe (Trend / Mean Reversion)</label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="w-full md:w-48 px-3 py-2 rounded-lg text-sm"
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            >
              {TIMEFRAMES.map((tf) => <option key={tf} value={tf}>{tf}</option>)}
            </select>
          </div>

          <div className="mb-4">
            <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Capital y riesgo</p>
            <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
              Cuánto capital arriesgás por operación y cuándo el bot se frena solo por pérdidas acumuladas.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>
                  Capital de trading ($, opcional)
                </label>
                <input
                  type="number" step="1" min="0" value={tradingCapital}
                  placeholder="0 = usa el balance real de la cuenta"
                  onChange={(e) => setTradingCapital(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                />
                <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
                  El % de riesgo se calcula sobre este número, no sobre el balance real de MT5. Ej: $20 y 1% riesgo → arriesga $0.20 por operación.
                </p>
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
          </div>

          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>Stop Loss y Trailing</p>
            <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
              Cuándo cortar una operación por las malas, y cuándo empezar a asegurar ganancia mientras sigue abierta.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>
                  Cierre forzado si cae (% del precio de compra)
                </label>
                <input
                  type="number" step="0.1" min="0" value={maxLossPct}
                  onChange={(e) => setMaxLossPct(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                />
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>
                  Activar trailing SL al recorrer (% del camino hacia el TP)
                </label>
                <input
                  type="number" step="1" min="0" max="100" value={trailingTriggerPct}
                  onChange={(e) => setTrailingTriggerPct(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                />
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>
                  Distancia del SL al precio (x ATR) mientras sigue ganancia
                </label>
                <input
                  type="number" step="0.1" min="0" value={trailingDistanceAtr}
                  onChange={(e) => setTrailingDistanceAtr(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                />
              </div>
            </div>
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

        <div className="rounded-xl p-5 mt-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Filtro de entrada ML (experimental)</h3>
            <button
              type="button"
              onClick={trainMlModels}
              disabled={mlTraining}
              className="text-xs font-semibold cursor-pointer px-3 py-1.5 rounded-md disabled:opacity-40 flex items-center gap-2"
              style={{ background: "var(--blue)", color: "#fff", border: "none" }}
            >
              {mlTraining && (
                <span
                  className="inline-block rounded-full animate-spin"
                  style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,0.4)", borderTopColor: "#fff" }}
                />
              )}
              {mlTraining ? "Entrenando…" : "Entrenar"}
            </button>
          </div>

          <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
            Solo veta entradas que las reglas ya iban a tomar — nunca abre algo que Trend/Fast no habrían abierto.
            Si nunca entrenaste o el modelo no mejora el resultado, no filtra nada.
          </p>

          {mlTraining && (
            <div className="mb-3 p-3 rounded-lg text-xs flex items-center gap-2" style={{ background: "var(--bg-secondary)", color: "var(--text-muted)" }}>
              <span
                className="inline-block rounded-full animate-spin shrink-0"
                style={{ width: 14, height: 14, border: "2px solid var(--border)", borderTopColor: "var(--blue)" }}
              />
              Re-corriendo 2 años de backtest para Trend y Fast — puede tardar varios minutos, no cierres la página.
            </div>
          )}

          {(["trend", "fast"] as const).map((mode) => {
            const model = mlModels[mode];
            const enabled = mode === "trend" ? mlFilterTrendEnabled : mlFilterFastEnabled;
            const setEnabled = mode === "trend" ? setMlFilterTrendEnabled : setMlFilterFastEnabled;
            return (
              <div key={mode} className="flex items-center justify-between mb-2 text-sm">
                <label className="flex items-center gap-2 cursor-pointer" style={{ color: "var(--text-muted)" }}>
                  <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
                  Activar en {mode === "trend" ? "Trend" : "Fast"}
                </label>
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {model && model.enabled
                    ? `Entrenado ${new Date(model.trained_at).toLocaleDateString("es-ES")} · ${model.n_trades} trades · PF ${model.profit_factor_filtered ?? "—"} vs ${model.profit_factor_unfiltered ?? "—"} sin filtro`
                    : "Nunca entrenado"}
                </span>
                {mlTrainResult?.[mode] && (
                  <p className="text-xs mt-1" style={{ color: mlTrainResult[mode].trained ? "var(--green)" : "var(--text-muted)" }}>
                    {mlTrainResult[mode].trained
                      ? "Último entrenamiento: mejoró el resultado, activo."
                      : mlTrainResult[mode].error ?? "Último entrenamiento: no mejoró el resultado sin filtro, no se activó."}
                  </p>
                )}
              </div>
            );
          })}

          {mlTrainError && <p className="text-xs mt-2" style={{ color: "var(--red)" }}>{mlTrainError}</p>}

          <div className="mt-3">
            <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Confianza mínima (%)</label>
            <input
              type="number" step="1" min="0" max="100" value={mlMinConfidence}
              onChange={(e) => setMlMinConfidence(parseFloat(e.target.value) || 0)}
              className="w-full md:w-48 px-3 py-2 rounded-lg text-sm"
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4">
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
                  {trades.flatMap((t, i) => { const rows = [
                    <tr
                      key={t.id}
                      onClick={() => setExpandedTradeId(expandedTradeId === t.id ? null : t.id)}
                      className="transition-colors duration-150 hover:bg-[var(--bg-secondary)] cursor-pointer"
                      style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined }}
                    >
                      <td className="px-4 py-3.5 text-[15px] font-bold" style={{ color: "var(--blue)" }}>{t.symbol}</td>
                      <td className="px-4 py-3.5">
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            background: t.mode === "mean_reversion" ? "rgba(61,124,255,0.12)" : t.mode === "fast" ? "rgba(0,212,170,0.12)" : "var(--bg-secondary)",
                            color: t.mode === "mean_reversion" ? "var(--blue)" : t.mode === "fast" ? "var(--green)" : "var(--text-muted)",
                          }}
                        >
                          {t.mode === "mean_reversion" ? "Mean Rev" : t.mode === "fast" ? "Fast" : "Trend"}
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
                    </tr>,
                  ];
                  if (expandedTradeId === t.id) {
                    rows.push(
                      <tr key={`${t.id}-detail`} style={{ background: "var(--bg-secondary)" }}>
                        <td colSpan={10} className="px-4 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Precio {t.action === "buy" ? "de compra" : "de venta"}</p>
                              <p className="font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>{t.price}</p>
                            </div>
                            <div>
                              <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Precio de cierre</p>
                              <p className="font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
                                {t.close_price != null ? t.close_price : t.status === "closed" ? "No registrado (cerrada antes de esta función)" : "— (sigue abierta)"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Cerrada</p>
                              <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
                                {t.closed_at ? new Date(t.closed_at).toLocaleString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Ticket MT5</p>
                              <p className="font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>{t.ticket ?? "—"}</p>
                            </div>
                            <div className="col-span-2 md:col-span-4">
                              <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>Razón de la señal</p>
                              <p style={{ color: "var(--text-primary)" }}>{t.signal_reason ?? "—"}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                  return rows;
                  })}
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
