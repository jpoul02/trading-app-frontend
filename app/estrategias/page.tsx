"use client";

import { useState } from "react";
import { TrendingUp, RefreshCw, Search, Sparkles, Calculator, Send } from "lucide-react";

// ─── Content ──────────────────────────────────────────────────────────────────

const STEPS = [
  { icon: Search, title: "Lee velas", detail: "200 velas cerradas del timeframe configurado, por símbolo." },
  { icon: Calculator, title: "Calcula indicadores", detail: "RSI, MACD, Bollinger Bands, Stochastic y ATR sobre esas velas." },
  { icon: Sparkles, title: "Evalúa señal", detail: "Trend y Mean Reversion en paralelo — cada una decide por su cuenta." },
  { icon: Send, title: "Abre operación", detail: "Solo si hay señal fuerte, bot corriendo, sin kill switch y sin posición ya abierta." },
];

const STRATEGIES = [
  {
    key: "trend",
    icon: TrendingUp,
    name: "Trend",
    subtitle: "RSI + MACD",
    color: "var(--green)",
    what: "Sigue el momentum — entra cuando hay confirmación fuerte de que el precio va a seguir en una dirección.",
    entry: "RSI < 30 y MACD positivo → COMPRAR FUERTE. RSI > 70 y MACD negativo → VENDER FUERTE. Señales intermedias no operan.",
    exit: "Stop Loss = entrada ∓ 1.5×ATR. Take Profit = entrada ± 2.5×ATR.",
    bestIn: "Mercados con tendencia clara. Funciona peor en rangos laterales — el forex pasa 70-80% del tiempo así, por eso da pocas señales.",
  },
  {
    key: "mean_reversion",
    icon: RefreshCw,
    name: "Mean Reversion",
    subtitle: "Bollinger + RSI + Stochastic",
    color: "var(--blue)",
    what: "Apuesta a que el precio vuelve al promedio después de moverse demasiado lejos de él.",
    entry: "Precio toca banda inferior + RSI < 30 + Stochastic < 20 → COMPRAR FUERTE. Banda superior + RSI > 70 + Stochastic > 80 → VENDER FUERTE.",
    exit: "Stop Loss = entrada ∓ 1.5×ATR. Take Profit = banda media de Bollinger.",
    bestIn: "Mercados laterales / consolidación. Más oportunidades que Trend, porque el forex está así la mayor parte del tiempo.",
  },
];

const GLOSSARY = [
  {
    key: "rsi",
    term: "RSI (Relative Strength Index)",
    short: "Mide momentum, de 0 a 100.",
    detail: "Menos de 30 = sobrevendido (posible rebote alcista). Más de 70 = sobrecomprado (posible caída). Es el indicador base de las dos estrategias del bot.",
  },
  {
    key: "macd",
    term: "MACD",
    short: "Compara dos medias móviles (12 y 26 períodos).",
    detail: "El histograma positivo indica momentum alcista, negativo indica momentum bajista. El modo Trend lo usa para confirmar la señal del RSI antes de operar.",
  },
  {
    key: "bbands",
    term: "Bollinger Bands",
    short: "Banda superior e inferior alrededor del precio promedio.",
    detail: "A 2 desviaciones estándar de la media móvil de 20 períodos. Cuando el precio toca una banda, sugiere que se alejó demasiado del promedio. El modo Mean Reversion apuesta a que vuelve.",
  },
  {
    key: "stoch",
    term: "Stochastic",
    short: "Compara el cierre actual contra el rango de precios reciente.",
    detail: "Sobre 5 períodos. Menos de 20 = sobrevendido, más de 80 = sobrecomprado. El modo Mean Reversion lo usa junto al RSI para confirmar la reversión antes de entrar.",
  },
  {
    key: "atr",
    term: "ATR (Average True Range)",
    short: "Mide la volatilidad reciente del símbolo.",
    detail: "Cuánto se mueve el precio en promedio. El bot lo usa para calcular Stop Loss y Take Profit proporcional al movimiento real del mercado, no un número fijo arbitrario — un símbolo volátil tiene stops más anchos que uno tranquilo.",
  },
];

// ─── Page ────────────────────────────────────────────────────────────────────

export default function EstrategiasPage() {
  const [openItem, setOpenItem] = useState<string | null>(null);

  return (
    <div className="max-w-5xl mx-auto">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Estrategias
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Cómo decide el bot cuándo comprar o vender
        </p>
      </div>

      {/* ── Decision timeline ────────────────────────────────────────────── */}
      <section className="mb-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="relative flex flex-col items-start">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="flex items-center justify-center rounded-full shrink-0"
                    style={{ width: 32, height: 32, background: "var(--bg-secondary)", border: "1px solid var(--border)" }}
                  >
                    <Icon size={15} style={{ color: "var(--blue)" }} />
                  </div>
                  <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                    {i + 1}
                  </span>
                </div>
                <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{step.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{step.detail}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Strategy cards ───────────────────────────────────────────────── */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Las dos estrategias
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {STRATEGIES.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.key}
                className="rounded-xl p-5"
                style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="flex items-center justify-center rounded-xl shrink-0"
                    style={{ width: 40, height: 40, background: `color-mix(in srgb, ${s.color} 14%, transparent)` }}
                  >
                    <Icon size={18} style={{ color: s.color }} />
                  </div>
                  <div>
                    <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>{s.name}</p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>{s.subtitle}</p>
                  </div>
                </div>

                <p className="text-sm leading-relaxed mb-4" style={{ color: "var(--text-primary)" }}>{s.what}</p>

                <div className="flex flex-col gap-3">
                  <div>
                    <p className="text-xs font-semibold mb-1" style={{ color: s.color }}>ENTRADA</p>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{s.entry}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold mb-1" style={{ color: s.color }}>SALIDA</p>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{s.exit}</p>
                  </div>
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                    <p className="text-xs font-semibold mb-1" style={{ color: "var(--text-muted)" }}>MEJOR EN</p>
                    <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{s.bestIn}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Indicator glossary ───────────────────────────────────────────── */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Glosario de indicadores
        </h2>
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
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
    </div>
  );
}
