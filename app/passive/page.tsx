"use client";

import { useEffect, useState } from "react";
import { LiveBadge } from "../components/LiveBadge";

interface ETF {
  symbol: string;
  name: string;
  description: string;
  annual_return_pct: number;
  type?: string;
}

interface StakingItem {
  asset: string;
  name: string;
  apy_pct: number;
  risk?: string;
}

interface DCARow {
  year: number;
  total_invested: number;
  portfolio_value: number;
  gain: number;
}

function Skeleton({ h = "h-32" }: { h?: string }) {
  return (
    <div className={`animate-pulse rounded-xl ${h}`} style={{ background: "var(--bg-card)" }} />
  );
}

const steps = [
  { n: 1, title: "Define tu meta", desc: "¿Para qué quieres invertir? Retiro, casa, viaje. Define el plazo y monto objetivo." },
  { n: 2, title: "Abre una cuenta", desc: "Elige una plataforma (eToro, Interactive Brokers) y completa la verificación de identidad." },
  { n: 3, title: "Elige tu ETF", desc: "Para principiantes: VTI (mercado total EEUU) o SPY (S&P 500). Diversificación instantánea." },
  { n: 4, title: "Configura DCA", desc: "Automatiza una compra mensual fija. Invierte el mismo monto sin importar el precio." },
  { n: 5, title: "Sé paciente", desc: "No toques el dinero. El interés compuesto necesita tiempo. Revisa 1 vez por año." },
];

export default function PassivePage() {
  const [etfs, setEtfs] = useState<ETF[]>([]);
  const [staking, setStaking] = useState<StakingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [monthly, setMonthly] = useState("200");
  const [years, setYears] = useState("10");
  const [rate, setRate] = useState("8");
  const [dcaResult, setDcaResult] = useState<DCARow[] | null>(null);
  const [dcaLoading, setDcaLoading] = useState(false);

  async function fetchData() {
    setLoading(true);
    setError(false);
    try {
      const [etfRes, stakingRes] = await Promise.all([
        fetch("http://localhost:8000/api/passive/etfs"),
        fetch("http://localhost:8000/api/passive/staking"),
      ]);
      const [etfData, stakingData] = await Promise.all([etfRes.json(), stakingRes.json()]);
      setEtfs(etfData);
      setStaking(stakingData);
      setLastUpdated(new Date());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  async function fetchEtfsSilent() {
    try {
      const res = await fetch("http://localhost:8000/api/passive/etfs");
      const data = await res.json();
      setEtfs(data);
      setLastUpdated(new Date());
    } catch {}
  }

  async function fetchStakingSilent() {
    try {
      const res = await fetch("http://localhost:8000/api/passive/staking");
      const data = await res.json();
      setStaking(data);
    } catch {}
  }

  async function calcDCA() {
    setDcaLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/passive/dca-calculator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthly_amount: Number(monthly),
          years: Number(years),
          annual_return: Number(rate),
        }),
      });
      const data = await res.json();
      setDcaResult(data);
    } catch {
      setDcaResult(null);
    } finally {
      setDcaLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    const etfInterval = setInterval(fetchEtfsSilent, 120_000);
    const stakingInterval = setInterval(fetchStakingSilent, 300_000);
    return () => {
      clearInterval(etfInterval);
      clearInterval(stakingInterval);
    };
  }, []);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Hero */}
      <div className="mb-10">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
              🌱 Invierte sin estar pegado a la pantalla
            </h1>
            <p className="mt-2 text-lg" style={{ color: "var(--text-muted)" }}>
              Estrategias pasivas que trabajan por ti mientras duermes. DCA, ETFs y staking explicados de forma simple.
            </p>
          </div>
          <div className="mt-1">
            <LiveBadge lastUpdated={lastUpdated} />
          </div>
        </div>
      </div>

      {error && (
        <div
          className="mb-6 p-4 rounded-xl flex items-center justify-between"
          style={{ background: "rgba(255,71,87,0.1)", border: "1px solid var(--red)" }}
        >
          <span style={{ color: "var(--red)" }}>No se pudieron cargar los datos</span>
          <button
            onClick={fetchData}
            className="px-4 py-1.5 rounded-lg text-sm font-medium cursor-pointer"
            style={{ background: "var(--red)", color: "#fff" }}
          >
            Reintentar
          </button>
        </div>
      )}

      {/* ETFs */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          ETFs Recomendados
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} />)
            : etfs.map((etf, i) => (
                <div
                  key={etf.symbol ?? etf.name ?? `etf-${i}`}
                  className="rounded-xl p-5"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>
                        {etf.symbol}
                      </span>
                      <span className="ml-2 text-sm" style={{ color: "var(--text-muted)" }}>
                        {etf.name}
                      </span>
                    </div>
                    <span
                      className="text-xs px-2 py-1 rounded-full font-medium"
                      style={{ background: "rgba(61,124,255,0.15)", color: "var(--blue)" }}
                    >
                      {etf.type ?? "ETF"}
                    </span>
                  </div>
                  <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
                    {etf.description}
                  </p>
                  <p className="text-sm font-semibold" style={{ color: "var(--green)" }}>
                    Retorno histórico anual: ~{etf.annual_return_pct}%
                  </p>
                </div>
              ))}
        </div>
      </section>

      {/* DCA Calculator */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Calculadora DCA 📊
        </h2>
        <div
          className="rounded-xl p-6"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-muted)" }}>
                Monto mensual ($)
              </label>
              <input
                type="number"
                value={monthly}
                onChange={(e) => setMonthly(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-muted)" }}>
                Años
              </label>
              <input
                type="number"
                value={years}
                onChange={(e) => setYears(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
            <div>
              <label className="block text-sm mb-1" style={{ color: "var(--text-muted)" }}>
                Rendimiento anual esperado (%)
              </label>
              <input
                type="number"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
          </div>
          <button
            onClick={calcDCA}
            disabled={dcaLoading}
            className="px-6 py-2 rounded-lg font-semibold text-sm cursor-pointer disabled:opacity-50"
            style={{ background: "var(--green)", color: "#0a0f1e" }}
          >
            {dcaLoading ? "Calculando..." : "Calcular"}
          </button>

          {dcaResult && dcaResult.length > 0 && (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ color: "var(--text-muted)" }}>
                    <th className="text-left py-2 pr-4">Año</th>
                    <th className="text-right py-2 pr-4">Total Invertido</th>
                    <th className="text-right py-2 pr-4">Valor Portafolio</th>
                    <th className="text-right py-2">Ganancia</th>
                  </tr>
                </thead>
                <tbody>
                  {dcaResult.map((row, i) => (
                    <tr key={row.year ?? i} style={{ borderTop: "1px solid var(--border)" }}>
                      <td className="py-2 pr-4" style={{ color: "var(--text-primary)" }}>
                        Año {row.year}
                      </td>
                      <td className="text-right py-2 pr-4" style={{ color: "var(--text-muted)" }}>
                        ${row.total_invested.toLocaleString("en-US")}
                      </td>
                      <td className="text-right py-2 pr-4" style={{ color: "var(--text-primary)" }}>
                        ${row.portfolio_value.toLocaleString("en-US")}
                      </td>
                      <td className="text-right py-2" style={{ color: "var(--green)" }}>
                        +${row.gain.toLocaleString("en-US")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Staking */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Staking de Criptomonedas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} />)
            : staking.map((s, i) => (
                <div
                  key={s.asset ?? `staking-${i}`}
                  className="rounded-xl p-5"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold" style={{ color: "var(--text-primary)" }}>
                      {s.asset}
                    </span>
                    <span className="text-lg font-black" style={{ color: "var(--green)" }}>
                      {s.apy_pct}% APY
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    {s.name}
                  </p>
                </div>
              ))}
        </div>
      </section>

      {/* Steps */}
      <section>
        <h2 className="text-xl font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Cómo empezar en 5 pasos
        </h2>
        <div className="space-y-3">
          {steps.map((step) => (
            <div
              key={step.n}
              className="rounded-xl p-4 flex gap-4"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                style={{ background: "rgba(0,212,170,0.15)", color: "var(--green)" }}
              >
                {step.n}
              </div>
              <div>
                <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
                  {step.title}
                </p>
                <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
