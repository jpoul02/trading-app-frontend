"use client";

import { useState } from "react";
import api from "@/lib/api";

interface BacktestTrade {
  direction: string;
  entry: number;
  exit: number;
  sl: number;
  tp: number;
  volume: number;
  profit: number;
  opened_at: number;
  closed_at: number;
}

interface BacktestResult {
  error?: string;
  symbol?: string;
  timeframe?: string;
  strategy?: string;
  total_trades: number;
  wins: number;
  losses: number;
  win_rate_pct: number;
  total_profit: number;
  max_drawdown_pct: number;
  avg_win: number;
  avg_loss: number;
  profit_factor: number | null;
  equity_curve: { time: number | null; balance: number }[];
  trades: BacktestTrade[];
}

const SYMBOLS = ["EURUSD", "GBPUSD", "USDJPY", "USDCHF"];
const TIMEFRAMES = ["M15", "M30", "H1", "H4"];
const TRADES_PAGE_SIZE = 15;

function fmt(n: number) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function EquityCurve({ points }: Readonly<{ points: { balance: number }[] }>) {
  if (points.length < 2) return null;
  const W = 800, H = 200;
  const values = points.map((p) => p.balance);
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * W;
      const y = H - ((p.balance - min) / range) * H;
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  const rising = points[points.length - 1].balance >= points[0].balance;
  const color = rising ? "var(--green)" : "var(--red)";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 200, display: "block" }}>
      <path d={path} stroke={color} strokeWidth={2} fill="none" />
    </svg>
  );
}

function TradesTable({ trades }: Readonly<{ trades: BacktestTrade[] }>) {
  const [page, setPage] = useState(0);
  if (trades.length === 0) {
    return <p className="text-sm py-6 text-center" style={{ color: "var(--text-muted)" }}>Sin operaciones simuladas en este rango.</p>;
  }
  const start = page * TRADES_PAGE_SIZE;
  const pageTrades = trades.slice(start, start + TRADES_PAGE_SIZE);
  return (
    <div>
      <div className="overflow-x-auto" style={{ maxHeight: 420, overflowY: "auto" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Dirección", "Entrada", "Salida", "SL", "TP", "Volumen", "Profit"].map((h) => (
                <th key={h} className="text-left px-3 py-2 whitespace-nowrap" style={{ color: "var(--text-muted)", position: "sticky", top: 0, background: "var(--bg-card)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageTrades.map((t, i) => (
              <tr key={`${t.opened_at}-${i}`} style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined }}>
                <td className="px-3 py-2">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: t.direction === "buy" ? "rgba(0,212,170,0.12)" : "rgba(255,71,87,0.12)", color: t.direction === "buy" ? "var(--green)" : "var(--red)" }}>
                    {t.direction.toUpperCase()}
                  </span>
                </td>
                <td className="px-3 py-2 tabular-nums" style={{ color: "var(--text-primary)" }}>{t.entry}</td>
                <td className="px-3 py-2 tabular-nums" style={{ color: "var(--text-primary)" }}>{t.exit}</td>
                <td className="px-3 py-2 tabular-nums" style={{ color: "var(--red)" }}>{t.sl}</td>
                <td className="px-3 py-2 tabular-nums" style={{ color: "var(--green)" }}>{t.tp}</td>
                <td className="px-3 py-2 tabular-nums" style={{ color: "var(--text-muted)" }}>{t.volume}</td>
                <td className="px-3 py-2 font-semibold tabular-nums" style={{ color: t.profit >= 0 ? "var(--green)" : "var(--red)" }}>
                  {t.profit >= 0 ? "+" : ""}{fmt(t.profit)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {trades.length > TRADES_PAGE_SIZE && (
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {start + 1}–{Math.min(start + TRADES_PAGE_SIZE, trades.length)} de {trades.length}
          </span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-40 active:scale-[0.97] transition-transform duration-150" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>← Anterior</button>
            <button onClick={() => setPage((p) => p + 1)} disabled={start + TRADES_PAGE_SIZE >= trades.length} className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-40 active:scale-[0.97] transition-transform duration-150" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>Siguiente →</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultPanel({ result }: Readonly<{ result: BacktestResult }>) {
  if (result.error) {
    return (
      <div className="p-4 rounded-xl" style={{ background: "rgba(255,71,87,0.08)", border: "1px solid var(--red)", color: "var(--red)" }}>
        {result.error}
      </div>
    );
  }
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {[
          { label: "Trades", value: String(result.total_trades), color: "var(--text-primary)" },
          { label: "Win rate", value: `${result.win_rate_pct}%`, color: "var(--blue)" },
          { label: "Profit total", value: `${result.total_profit >= 0 ? "+" : ""}$${fmt(result.total_profit)}`, color: result.total_profit >= 0 ? "var(--green)" : "var(--red)" },
          { label: "Drawdown máx", value: `${result.max_drawdown_pct}%`, color: "var(--red)" },
          { label: "Ganancia prom.", value: `$${fmt(result.avg_win)}`, color: "var(--green)" },
          { label: "Pérdida prom.", value: `$${fmt(result.avg_loss)}`, color: "var(--red)" },
          { label: "Profit factor", value: result.profit_factor === null ? "—" : result.profit_factor.toFixed(2), color: result.profit_factor !== null && result.profit_factor >= 1 ? "var(--green)" : "var(--red)" },
          { label: "Símbolo", value: `${result.symbol} · ${result.timeframe}`, color: "var(--text-muted)" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>{s.label}</p>
            <p className="text-lg font-bold tabular-nums" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl p-4 mb-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <p className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Curva de equity</p>
        <EquityCurve points={result.equity_curve} />
      </div>
      <div className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <p className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Operaciones simuladas</p>
        <TradesTable trades={result.trades} />
      </div>
    </div>
  );
}

export default function BacktestPage() {
  const [symbol, setSymbol] = useState("EURUSD");
  const [timeframe, setTimeframe] = useState("M15");
  const [dateFrom, setDateFrom] = useState("2025-06-01");
  const [dateTo, setDateTo] = useState("2026-08-01");
  const [strategy, setStrategy] = useState<"trend" | "mean_reversion" | "both">("both");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacktestResult | { trend: BacktestResult; mean_reversion: BacktestResult } | null>(null);

  async function runBacktest() {
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.post("/api/backtest/run", {
        symbol, timeframe, date_from: dateFrom, date_to: dateTo, strategy,
      });
      setResult(data);
    } catch {
      setResult({ error: "Error de red al correr el backtest" } as BacktestResult);
    } finally {
      setLoading(false);
    }
  }

  const isComparison = result && "trend" in result;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Backtest</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Probá las estrategias contra datos históricos reales, sin arriesgar nada
        </p>
      </div>

      <div className="rounded-xl p-5 mb-6" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Símbolo</label>
            <select value={symbol} onChange={(e) => setSymbol(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
              {SYMBOLS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Timeframe</label>
            <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
              {TIMEFRAMES.map((tf) => <option key={tf} value={tf}>{tf}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Estrategia</label>
            <select value={strategy} onChange={(e) => setStrategy(e.target.value as typeof strategy)} className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
              <option value="both">Comparar ambas</option>
              <option value="trend">Trend</option>
              <option value="mean_reversion">Mean Reversion</option>
            </select>
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Desde</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: "var(--text-muted)" }}>Hasta</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
          </div>
        </div>
        <button
          onClick={runBacktest}
          disabled={loading}
          className="px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-40 active:scale-[0.97] transition-transform duration-150"
          style={{ background: "var(--blue)", color: "#fff", border: "none" }}
        >
          {loading ? "Corriendo…" : "Correr backtest"}
        </button>
      </div>

      {result && !isComparison && <ResultPanel result={result as BacktestResult} />}

      {result && isComparison && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Trend</p>
            <ResultPanel result={(result as { trend: BacktestResult }).trend} />
          </div>
          <div>
            <p className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Mean Reversion</p>
            <ResultPanel result={(result as { mean_reversion: BacktestResult }).mean_reversion} />
          </div>
        </div>
      )}
    </div>
  );
}
