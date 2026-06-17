"use client";

import { useEffect, useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  BookOpen, AlertTriangle, ChevronDown, ChevronUp,
  Lightbulb, Shield, Target, HelpCircle,
} from "lucide-react";
import { PortfolioWizard } from "../components/PortfolioWizard";

interface Position {
  id: string;
  symbol: string;
  quantity: number;
  buy_price: number;
  current_price: number;
  type: string;
  pnl: number;
  pnl_percent: number;
}

interface PortfolioSummary {
  total_value: number;
  total_gain: number;
  total_gain_percent: number;
  positions: Position[];
}

interface AssetInfo {
  description: string;
  whyMoves: string;
  risk: string;
  forBeginners: boolean;
  beginnerNote: string;
  strategy: string;
}

const COLORS = ["#00d4aa", "#3d7cff", "#ff4757", "#ffd32a", "#ff6b35", "#7c3aed", "#10b981", "#f59e0b"];

const ASSET_INFO: Record<string, AssetInfo> = {
  BTC: {
    description: "La criptomoneda más grande y conocida. Creada en 2009 por Satoshi Nakamoto. Funciona como 'oro digital' — reserva de valor descentralizada.",
    whyMoves: "Sube con adopción institucional, halvings (reducción de oferta cada 4 años) y mayor demanda. Baja con regulaciones estrictas, ventas masivas de ballenas o pánico general del mercado.",
    risk: "Muy Alto",
    forBeginners: true,
    beginnerNote: "Sí — con poco capital y mentalidad de largo plazo",
    strategy: "DCA mensual + Hold largo plazo",
  },
  ETH: {
    description: "Plataforma de contratos inteligentes y la segunda cripto más grande. Permite construir aplicaciones DeFi, NFTs y más encima de su blockchain.",
    whyMoves: "Depende del uso de la red, actualizaciones tecnológicas y el ecosistema DeFi. Muy correlacionado con BTC pero con mayor volatilidad propia.",
    risk: "Alto",
    forBeginners: true,
    beginnerNote: "Sí — más volátil que BTC pero con más casos de uso reales",
    strategy: "DCA mensual",
  },
  SOL: {
    description: "Blockchain rápida y económica, competidora de Ethereum. Alta velocidad de transacciones pero más centralizada que BTC o ETH.",
    whyMoves: "Sube con el crecimiento de su ecosistema DeFi y NFTs. Muy sensible a fallos técnicos de la red y a caídas del ecosistema general.",
    risk: "Muy Alto",
    forBeginners: false,
    beginnerNote: "Con cuidado — alta volatilidad y mayor riesgo técnico",
    strategy: "Hold especulativo con posición pequeña",
  },
  BNB: {
    description: "Token nativo de Binance, el exchange más grande del mundo. Su valor está directamente ligado al uso y éxito de la plataforma.",
    whyMoves: "Depende del volumen de trading en Binance, noticias regulatorias sobre el exchange y el uso dentro del ecosistema BNB Chain.",
    risk: "Alto",
    forBeginners: false,
    beginnerNote: "Con cuidado — riesgo regulatorio específico de Binance",
    strategy: "Hold si usás Binance activamente",
  },
  SPY: {
    description: "ETF que replica el S&P 500 — las 500 empresas más grandes de EE.UU. El índice de referencia del mercado americano. Históricamente ~10% de retorno anual promedio.",
    whyMoves: "Refleja la salud de la economía americana. Sube con buenos reportes de ganancias y crecimiento del PIB. Baja con recesiones, crisis financieras o subidas agresivas de tasas.",
    risk: "Bajo-Medio",
    forBeginners: true,
    beginnerNote: "Sí — ideal como base del portafolio de cualquier principiante",
    strategy: "DCA mensual fijo",
  },
  QQQ: {
    description: "ETF de las 100 empresas tecnológicas más grandes del Nasdaq. Incluye Apple, Microsoft, NVIDIA, Google, Amazon.",
    whyMoves: "Muy influenciado por el sector tech. Sube con innovación y buenos resultados de Big Tech. Más sensible a tasas de interés altas que SPY.",
    risk: "Medio",
    forBeginners: true,
    beginnerNote: "Sí — buen complemento a SPY para más exposición tecnológica",
    strategy: "DCA mensual",
  },
  VTI: {
    description: "ETF del mercado total de EE.UU. Más diversificado que SPY — incluye pequeñas, medianas y grandes empresas americanas.",
    whyMoves: "Representa toda la economía americana. La diversificación extrema reduce el riesgo de concentración en pocas empresas grandes.",
    risk: "Bajo",
    forBeginners: true,
    beginnerNote: "Ideal — el ETF más recomendado para principiantes a largo plazo",
    strategy: "DCA mensual, sin tocar",
  },
  AAPL: {
    description: "Apple Inc. — una de las empresas más valiosas del mundo. Fabrica iPhone, Mac, iPad y opera servicios como iCloud y App Store.",
    whyMoves: "Sus ganancias dependen de ventas del iPhone y crecimiento de servicios digitales. Sensible a cadenas de suministro en Asia y al mercado chino.",
    risk: "Medio",
    forBeginners: true,
    beginnerNote: "Sí — empresa establecida con ingresos muy predecibles",
    strategy: "Hold largo plazo",
  },
  MSFT: {
    description: "Microsoft — gigante del software empresarial y la nube. Azure es uno de los negocios de mayor crecimiento. Inversiones fuertes en IA (OpenAI).",
    whyMoves: "Crece con adopción cloud, Office 365 y expansión de IA. Una de las tech más estables y predecibles del mercado.",
    risk: "Medio",
    forBeginners: true,
    beginnerNote: "Sí — una de las inversiones más estables en tecnología",
    strategy: "Hold largo plazo",
  },
};

function getAssetInfo(symbol: string): AssetInfo {
  return (
    ASSET_INFO[symbol.toUpperCase()] ?? {
      description: `${symbol.toUpperCase()} es un activo financiero. Investigá su whitepaper o prospecto antes de aumentar tu posición.`,
      whyMoves: "El precio depende de oferta y demanda del mercado, noticias relevantes y el sentimiento general de los inversores en ese sector.",
      risk: "Alto",
      forBeginners: false,
      beginnerNote: "Investigá bien antes de invertir capital significativo",
      strategy: "Posición pequeña mientras aprendés más",
    }
  );
}

function calcDiversificationScore(positions: Position[], totalCurrent: number): number {
  if (positions.length === 0) return 0;
  let score = 0;
  if (positions.length > 1) score += 30;
  const hasCrypto = positions.some((p) => p.type === "crypto");
  const hasNonCrypto = positions.some((p) => p.type === "stock" || p.type === "etf");
  if (hasCrypto && hasNonCrypto) score += 30;
  if (positions.length > 3) score += 20;
  if (totalCurrent > 0) {
    const maxConc = Math.max(...positions.map((p) => (p.quantity * p.current_price) / totalCurrent));
    if (maxConc <= 0.6) score += 20;
  }
  return score;
}

function calcRiskLevel(positions: Position[]): string {
  if (positions.length === 0) return "Sin datos";
  const hasCrypto = positions.some((p) => p.type === "crypto");
  const hasEtf = positions.some((p) => p.type === "etf");
  const cryptos = positions.filter((p) => p.type === "crypto").map((p) => p.symbol.toUpperCase());
  const hasAltcoins = cryptos.some((s) => !["BTC", "ETH"].includes(s));
  if (!hasCrypto && hasEtf) return "Bajo";
  if (hasCrypto && !hasAltcoins && hasEtf) return "Moderado";
  if (hasCrypto && !hasAltcoins) return "Medio-Alto";
  if (hasAltcoins) return "Alto";
  return "Moderado";
}

function getConcentrationAlert(positions: Position[], totalCurrent: number): { symbol: string; percent: number } | null {
  if (positions.length === 0 || totalCurrent === 0) return null;
  for (const p of positions) {
    const pct = (p.quantity * p.current_price / totalCurrent) * 100;
    if (pct > 50) return { symbol: p.symbol.toUpperCase(), percent: Math.round(pct) };
  }
  return null;
}

function getRecommendations(positions: Position[]): Array<{ text: string; reason: string }> {
  const recs: Array<{ text: string; reason: string }> = [];
  const hasCrypto = positions.some((p) => p.type === "crypto");
  const hasEtf = positions.some((p) => p.type === "etf");
  if (hasCrypto) recs.push({ text: "Gestión de riesgo en cripto", reason: "Tenés criptomonedas en tu portafolio" });
  if (hasEtf) recs.push({ text: "Dollar Cost Averaging (DCA)", reason: "La estrategia más recomendada para ETFs" });
  if (positions.length <= 1) recs.push({ text: "Diversificación de portafolio", reason: "Tenés pocos activos — reducí tu riesgo" });
  if (!hasEtf) recs.push({ text: "Por qué los ETFs son ideales para principiantes", reason: "Aún no tenés ETFs — son el punto de partida ideal" });
  return recs.slice(0, 3);
}

function riskColor(risk: string): { background: string; color: string } {
  const map: Record<string, { background: string; color: string }> = {
    Bajo: { background: "rgba(0,212,170,0.12)", color: "#00d4aa" },
    "Bajo-Medio": { background: "rgba(16,185,129,0.12)", color: "#10b981" },
    Medio: { background: "rgba(255,211,42,0.12)", color: "#ffd32a" },
    "Medio-Alto": { background: "rgba(255,107,53,0.12)", color: "#ff6b35" },
    Alto: { background: "rgba(255,71,87,0.14)", color: "#ff4757" },
    "Muy Alto": { background: "rgba(255,71,87,0.22)", color: "#ff1744" },
    Moderado: { background: "rgba(61,124,255,0.12)", color: "#3d7cff" },
  };
  return map[risk] ?? { background: "rgba(148,163,184,0.12)", color: "#94a3b8" };
}

function scoreColor(score: number): string {
  if (score <= 30) return "#ff4757";
  if (score <= 60) return "#ffd32a";
  if (score <= 80) return "#00d4aa";
  return "#00ff88";
}

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="relative inline-block group cursor-help ml-1 align-middle">
      <HelpCircle size={13} style={{ color: "var(--text-muted)" }} />
      <span
        className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 w-56 p-2 rounded-lg text-xs
                   pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-20 leading-relaxed"
        style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
      >
        {text}
      </span>
    </span>
  );
}

const SCENARIOS = [
  { key: "crash", emoji: "📉", label: "Crash -30%", multiplier: 0.7, color: "#ff6b35", desc: "Común en cripto y acciones en crisis" },
  { key: "bull", emoji: "📈", label: "Bull Run +50%", multiplier: 1.5, color: "#00d4aa", desc: "Mercado alcista típico" },
  { key: "bear", emoji: "😱", label: "Bear Extremo -60%", multiplier: 0.4, color: "#ff4757", desc: "El crypto winter de 2022" },
];

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<PortfolioSummary>({
    total_value: 0, total_gain: 0, total_gain_percent: 0, positions: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [symbol, setSymbol] = useState("");
  const [quantity, setQuantity] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [type, setType] = useState("crypto");
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [wizardDone, setWizardDone] = useState(() =>
    typeof window !== "undefined" && localStorage.getItem("portfolio_wizard_done") === "true"
  );

  async function fetchPortfolio() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("http://localhost:8000/api/portfolio/");
      const data = await res.json();
      const positions: Position[] = Array.isArray(data) ? data : (data.positions ?? []);
      setPortfolio({
        total_value: Array.isArray(data) ? 0 : (data.total_value ?? 0),
        total_gain: Array.isArray(data) ? 0 : (data.total_gain ?? 0),
        total_gain_percent: Array.isArray(data) ? 0 : (data.total_gain_percent ?? 0),
        positions,
      });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  async function addPosition() {
    if (!symbol || !quantity || !buyPrice) return;
    setAdding(true);
    try {
      await fetch("http://localhost:8000/api/portfolio/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: symbol.toUpperCase(), quantity: Number(quantity), buy_price: Number(buyPrice), type }),
      });
      setSymbol(""); setQuantity(""); setBuyPrice("");
      fetchPortfolio();
    } catch { /* silently fail */ } finally { setAdding(false); }
  }

  async function deletePosition(id: string) {
    try {
      await fetch(`http://localhost:8000/api/portfolio/${id}`, { method: "DELETE" });
      fetchPortfolio();
    } catch { /* silently fail */ }
  }

  useEffect(() => { fetchPortfolio(); }, []);

  const positions = portfolio?.positions ?? [];
  const totalCurrent = positions.reduce((s, p) => s + p.quantity * p.current_price, 0);
  const totalInvested = positions.reduce((s, p) => s + p.quantity * p.buy_price, 0);
  const divScore = calcDiversificationScore(positions, totalCurrent);
  const riskLevel = calcRiskLevel(positions);
  const concentrationAlert = getConcentrationAlert(positions, totalCurrent);
  const recommendations = getRecommendations(positions);
  const pieData = positions.map((p) => ({ name: p.symbol, value: p.quantity * p.current_price }));
  const maxConc = totalCurrent > 0 && positions.length > 0
    ? Math.max(...positions.map((p) => (p.quantity * p.current_price) / totalCurrent))
    : 1;

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  if (!loading && !error && !wizardDone && positions.length === 0) {
    return (
      <PortfolioWizard
        onComplete={() => { setWizardDone(true); fetchPortfolio(); }}
        budget={0}
      />
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>
        💼 Mi Portafolio
      </h1>
      <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
        Simulá inversiones, aprendé sobre cada activo y entendé tu riesgo real.
      </p>

      {error && (
        <div className="mb-6 p-4 rounded-xl flex items-center justify-between"
          style={{ background: "rgba(255,71,87,0.1)", border: "1px solid var(--red)" }}>
          <span style={{ color: "var(--red)" }}>No se pudieron cargar los datos</span>
          <button onClick={fetchPortfolio} className="px-4 py-1.5 rounded-lg text-sm font-medium cursor-pointer"
            style={{ background: "var(--red)", color: "#fff" }}>
            Reintentar
          </button>
        </div>
      )}

      {/* Summary */}
      {positions.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Valor Actual", value: `$${totalCurrent.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: "var(--text-primary)" },
            { label: "Total Invertido", value: `$${totalInvested.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: "var(--text-muted)" },
            {
              label: "Ganancia / Pérdida",
              value: `${totalCurrent - totalInvested >= 0 ? "+" : ""}$${(totalCurrent - totalInvested).toFixed(2)}`,
              color: totalCurrent >= totalInvested ? "var(--green)" : "var(--red)",
            },
          ].map((item) => (
            <div key={item.label} className="rounded-xl p-4 text-center"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{item.label}</p>
              <p className="text-xl font-bold" style={{ color: item.color }}>{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Analysis Panel */}
      {positions.length > 0 && (
        <div className="rounded-xl p-5 mb-6"
          style={{ background: "var(--bg-card)", border: "1px solid rgba(61,124,255,0.35)" }}>
          <h2 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Shield size={18} style={{ color: "var(--blue)" }} />
            ¿Qué tengo? — Análisis de tu portafolio
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Diversification score */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>Score de Diversificación</span>
                <span className="text-lg font-black" style={{ color: scoreColor(divScore) }}>{divScore}/100</span>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden mb-3" style={{ background: "var(--border)" }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${divScore}%`, background: scoreColor(divScore) }} />
              </div>
              <ul className="space-y-1.5 text-xs">
                {[
                  { met: positions.length > 1, text: "Más de 1 activo (+30)" },
                  { met: positions.some(p => p.type === "crypto") && positions.some(p => p.type !== "crypto"), text: "Cripto + Acciones/ETFs (+30)" },
                  { met: positions.length > 3, text: "Más de 3 activos (+20)" },
                  { met: maxConc <= 0.6, text: "Ningún activo supera el 60% (+20)" },
                ].map(({ met, text }) => (
                  <li key={text} style={{ color: met ? "var(--green)" : "var(--text-muted)" }}>
                    {met ? "✓" : "○"} {text}
                  </li>
                ))}
              </ul>
            </div>

            {/* Risk + Alert */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>Nivel de Riesgo</span>
                <span className="text-sm font-bold px-3 py-1 rounded-full" style={riskColor(riskLevel)}>
                  {riskLevel}
                </span>
              </div>
              {concentrationAlert && (
                <div className="flex items-start gap-2 p-3 rounded-lg text-sm"
                  style={{ background: "rgba(255,211,42,0.08)", border: "1px solid rgba(255,211,42,0.3)" }}>
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: "#ffd32a" }} />
                  <p style={{ color: "var(--text-muted)" }}>
                    <strong style={{ color: "#ffd32a" }}>⚠️ {concentrationAlert.symbol}</strong> representa el{" "}
                    <strong>{concentrationAlert.percent}%</strong> de tu portafolio. Los expertos recomiendan no superar el 20-30% por activo.
                  </p>
                </div>
              )}
              {!concentrationAlert && (
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  {riskLevel === "Bajo"
                    ? "👍 Portafolio conservador. Ideal para preservar capital con crecimiento moderado."
                    : riskLevel === "Moderado"
                    ? "⚖️ Balance entre crecimiento y estabilidad. Buena diversificación."
                    : "⚡ Portafolio de alto riesgo. Podés ganar mucho, pero también perder mucho. Invertí solo lo que podés permitirte perder."}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add position form */}
      <div className="rounded-xl p-5 mb-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Agregar Posición
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          {[
            { label: "Símbolo", placeholder: "BTC, AAPL, SPY...", value: symbol, onChange: setSymbol, type: "text", extraClass: "uppercase" },
            { label: "Cantidad", placeholder: "0.5", value: quantity, onChange: setQuantity, type: "number", extraClass: "" },
            { label: "Precio de compra ($)", placeholder: "40000", value: buyPrice, onChange: setBuyPrice, type: "number", extraClass: "" },
          ].map(({ label, placeholder, value, onChange, type: t, extraClass }) => (
            <div key={label}>
              <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>{label}</label>
              <input type={t} placeholder={placeholder} value={value}
                onChange={(e) => onChange(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg text-sm outline-none ${extraClass}`}
                style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
            </div>
          ))}
          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>Tipo</label>
            <select value={type} onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
              <option value="crypto">Cripto</option>
              <option value="stock">Acción</option>
              <option value="etf">ETF</option>
            </select>
          </div>
        </div>
        <button onClick={addPosition} disabled={adding || !symbol || !quantity || !buyPrice}
          className="px-5 py-2 rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-40"
          style={{ background: "var(--blue)", color: "#fff" }}>
          {adding ? "Agregando..." : "Agregar Posición"}
        </button>
      </div>

      {/* Table + PieChart */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-2">
          <div className="rounded-xl overflow-hidden"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  <th className="text-left px-3 py-3" style={{ color: "var(--text-muted)" }}>Símbolo</th>
                  <th className="text-left px-3 py-3" style={{ color: "var(--text-muted)" }}>
                    Cantidad
                    <InfoTooltip text="El número de unidades que posees de este activo." />
                  </th>
                  <th className="text-left px-3 py-3" style={{ color: "var(--text-muted)" }}>P. Compra</th>
                  <th className="text-left px-3 py-3" style={{ color: "var(--text-muted)" }}>
                    P. Actual
                    <InfoTooltip text="El precio de mercado en este momento, obtenido en tiempo real desde el backend." />
                  </th>
                  <th className="text-left px-3 py-3" style={{ color: "var(--text-muted)" }}>
                    P&amp;L $
                    <InfoTooltip text="Profit & Loss — tu ganancia o pérdida en dólares desde que compraste este activo." />
                  </th>
                  <th className="text-left px-3 py-3" style={{ color: "var(--text-muted)" }}>
                    P&amp;L %
                    <InfoTooltip text="El porcentaje de ganancia o pérdida sobre tu inversión inicial en este activo." />
                  </th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7} className="px-3 py-2">
                        <div className="animate-pulse h-8 rounded" style={{ background: "var(--bg-secondary)" }} />
                      </td>
                    </tr>
                  ))
                ) : positions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10" style={{ color: "var(--text-muted)" }}>
                      <p className="text-2xl mb-2">📭</p>
                      <p>Sin posiciones. Agrega una arriba para empezar.</p>
                    </td>
                  </tr>
                ) : (
                  positions.map((p, i) => (
                    <tr key={p.id} style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined }}>
                      <td className="px-3 py-3">
                        <p className="font-bold" style={{ color: "var(--text-primary)" }}>{p.symbol}</p>
                        <p className="text-xs capitalize" style={{ color: "var(--text-muted)" }}>{p.type}</p>
                      </td>
                      <td className="px-3 py-3" style={{ color: "var(--text-muted)" }}>{p.quantity}</td>
                      <td className="px-3 py-3" style={{ color: "var(--text-muted)" }}>${p.buy_price.toLocaleString("en-US")}</td>
                      <td className="px-3 py-3" style={{ color: "var(--text-primary)" }}>${p.current_price.toLocaleString("en-US")}</td>
                      <td className="px-3 py-3 font-semibold" style={{ color: p.pnl >= 0 ? "var(--green)" : "var(--red)" }}>
                        {p.pnl >= 0 ? "+" : ""}${p.pnl.toFixed(2)}
                      </td>
                      <td className="px-3 py-3 font-semibold" style={{ color: p.pnl_percent >= 0 ? "var(--green)" : "var(--red)" }}>
                        {p.pnl_percent >= 0 ? "+" : ""}{p.pnl_percent?.toFixed(2)}%
                      </td>
                      <td className="px-3 py-3">
                        <button onClick={() => deletePosition(p.id)}
                          className="text-xs px-2 py-1 rounded cursor-pointer"
                          style={{ background: "rgba(255,71,87,0.12)", color: "var(--red)" }}>
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl p-4" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-muted)" }}>Distribución</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip
                  formatter={(val) => [`$${Number(val).toLocaleString("en-US")}`, ""]}
                  contentStyle={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text-primary)" }}
                />
                <Legend formatter={(value) => <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-sm" style={{ color: "var(--text-muted)" }}>
              Sin posiciones
            </div>
          )}
        </div>
      </div>

      {/* Scenarios */}
      {positions.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-1 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Target size={18} style={{ color: "var(--blue)" }} />
            Simulador de Escenarios
          </h2>
          <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
            ¿Qué pasaría con tu portafolio en distintos escenarios de mercado?
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SCENARIOS.map((sc) => {
              const resultValue = totalCurrent * sc.multiplier;
              const diff = resultValue - totalCurrent;
              return (
                <div key={sc.key} className="rounded-xl p-5"
                  style={{ background: "var(--bg-card)", border: `1px solid ${sc.color}44` }}>
                  <p className="text-2xl mb-1">{sc.emoji}</p>
                  <p className="font-bold mb-0.5" style={{ color: sc.color }}>{sc.label}</p>
                  <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>{sc.desc}</p>
                  <p className="text-xl font-black" style={{ color: sc.color }}>
                    ${resultValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-sm font-semibold" style={{ color: sc.color }}>
                    {diff >= 0 ? "+" : ""}${diff.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    vs. ${totalCurrent.toLocaleString("en-US", { maximumFractionDigits: 0 })} actual
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Learn about positions */}
      {positions.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold mb-1 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <BookOpen size={18} style={{ color: "var(--green)" }} />
            Aprende sobre tus posiciones
          </h2>
          <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
            Entendé qué tenés y por qué se mueve el precio de cada activo.
          </p>
          <div className="space-y-3">
            {positions.map((p, i) => {
              const info = getAssetInfo(p.symbol);
              const isExpanded = expanded.has(p.id);
              const rc = riskColor(info.risk);
              const posValue = p.quantity * p.current_price;
              const posPercent = totalCurrent > 0 ? ((posValue / totalCurrent) * 100).toFixed(1) : "0";
              return (
                <div key={p.id} className="rounded-xl overflow-hidden"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
                  <button onClick={() => toggleExpand(p.id)}
                    className="w-full px-5 py-4 flex items-center justify-between cursor-pointer text-left"
                    style={{ background: "transparent" }}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                        style={{ background: `${COLORS[i % COLORS.length]}22`, color: COLORS[i % COLORS.length] }}>
                        {p.symbol.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold" style={{ color: "var(--text-primary)" }}>{p.symbol.toUpperCase()}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {posPercent}% del portafolio · ${posValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={rc}>
                        Riesgo {info.risk}
                      </span>
                      {isExpanded
                        ? <ChevronUp size={16} style={{ color: "var(--text-muted)" }} />
                        : <ChevronDown size={16} style={{ color: "var(--text-muted)" }} />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5" style={{ borderTop: "1px solid var(--border)" }}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <p className="text-xs font-semibold uppercase mb-1" style={{ color: "var(--text-muted)" }}>¿Qué es?</p>
                          <p className="text-sm" style={{ color: "var(--text-primary)" }}>{info.description}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase mb-1" style={{ color: "var(--text-muted)" }}>¿Por qué sube o baja?</p>
                          <p className="text-sm" style={{ color: "var(--text-primary)" }}>{info.whyMoves}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase mb-1" style={{ color: "var(--text-muted)" }}>¿Bueno para principiantes?</p>
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold inline-block mb-1"
                            style={{ background: info.forBeginners ? "rgba(0,212,170,0.12)" : "rgba(255,71,87,0.12)", color: info.forBeginners ? "var(--green)" : "var(--red)" }}>
                            {info.forBeginners ? "Sí" : "Con cuidado"}
                          </span>
                          <p className="text-sm" style={{ color: "var(--text-muted)" }}>{info.beginnerNote}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase mb-1" style={{ color: "var(--text-muted)" }}>Estrategia recomendada</p>
                          <span className="text-sm px-3 py-1 rounded-full font-medium inline-block"
                            style={{ background: "rgba(61,124,255,0.12)", color: "var(--blue)" }}>
                            {info.strategy}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Recommendations */}
      {positions.length > 0 && recommendations.length > 0 && (
        <section>
          <h2 className="text-lg font-bold mb-1 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Lightbulb size={18} style={{ color: "#ffd32a" }} />
            ¿Qué aprender ahora?
          </h2>
          <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
            Basado en tu portafolio, estas lecciones son relevantes para vos.
          </p>
          <div className="space-y-2">
            {recommendations.map((rec, i) => (
              <a key={i} href="/learn"
                className="flex items-center justify-between px-4 py-3 rounded-xl transition-opacity hover:opacity-80"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)", textDecoration: "none" }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>📚 {rec.text}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>{rec.reason}</p>
                </div>
                <span className="text-xs px-3 py-1 rounded-full font-medium shrink-0"
                  style={{ background: "rgba(0,212,170,0.12)", color: "var(--green)" }}>
                  Ir a Aprende →
                </span>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
