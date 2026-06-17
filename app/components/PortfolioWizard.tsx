"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";

export interface PortfolioWizardProps {
  onComplete: () => void;
  budget?: number;
}

type Profile = "conservative" | "moderate" | "aggressive";

interface WizardAsset {
  symbol: string;
  name: string;
  description: string;
  risk: string;
  type: "crypto" | "etf" | "stock";
}

interface ProfileAssetAlloc {
  symbol: string;
  percent: number;
}

const WIZARD_ASSETS: Record<string, WizardAsset> = {
  BTC: { symbol: "BTC", name: "Bitcoin", description: "El oro digital — reserva de valor descentralizada", risk: "Muy Alto", type: "crypto" },
  ETH: { symbol: "ETH", name: "Ethereum", description: "Plataforma de apps descentralizadas y DeFi", risk: "Alto", type: "crypto" },
  SOL: { symbol: "SOL", name: "Solana", description: "Blockchain rápida y económica, rival de Ethereum", risk: "Muy Alto", type: "crypto" },
  BNB: { symbol: "BNB", name: "Binance Coin", description: "Token del exchange de criptomonedas más grande", risk: "Alto", type: "crypto" },
  SPY: { symbol: "SPY", name: "SPDR S&P 500 ETF", description: "Las 500 empresas más grandes de EE.UU.", risk: "Bajo-Medio", type: "etf" },
  QQQ: { symbol: "QQQ", name: "Invesco QQQ", description: "Top 100 empresas tecnológicas del Nasdaq", risk: "Medio", type: "etf" },
  VTI: { symbol: "VTI", name: "Vanguard Total Market", description: "Todo el mercado de EE.UU. — máxima diversificación", risk: "Bajo", type: "etf" },
  BND: { symbol: "BND", name: "Vanguard Bond ETF", description: "Bonos del gobierno de EE.UU. — estabilidad total", risk: "Muy Bajo", type: "etf" },
};

const PROFILE_ASSETS: Record<Profile, (budget: number) => ProfileAssetAlloc[]> = {
  conservative: (budget) =>
    budget > 200
      ? [
          { symbol: "SPY", percent: 45 },
          { symbol: "VTI", percent: 25 },
          { symbol: "BND", percent: 20 },
          { symbol: "ETH", percent: 10 },
        ]
      : [
          { symbol: "SPY", percent: 50 },
          { symbol: "VTI", percent: 30 },
          { symbol: "BND", percent: 20 },
        ],
  moderate: () => [
    { symbol: "SPY", percent: 40 },
    { symbol: "QQQ", percent: 20 },
    { symbol: "BTC", percent: 30 },
    { symbol: "ETH", percent: 10 },
  ],
  aggressive: () => [
    { symbol: "BTC", percent: 40 },
    { symbol: "ETH", percent: 25 },
    { symbol: "SOL", percent: 20 },
    { symbol: "QQQ", percent: 15 },
  ],
};

function riskBadgeStyle(risk: string): { background: string; color: string } {
  const map: Record<string, { background: string; color: string }> = {
    "Muy Bajo":  { background: "rgba(0,212,170,0.12)", color: "#00d4aa" },
    "Bajo":      { background: "rgba(0,212,170,0.12)", color: "#00d4aa" },
    "Bajo-Medio":{ background: "rgba(16,185,129,0.12)", color: "#10b981" },
    "Medio":     { background: "rgba(255,211,42,0.12)", color: "#ffd32a" },
    "Alto":      { background: "rgba(255,107,53,0.14)", color: "#ff6b35" },
    "Muy Alto":  { background: "rgba(255,71,87,0.14)",  color: "#ff4757" },
  };
  return map[risk] ?? { background: "rgba(148,163,184,0.12)", color: "#94a3b8" };
}

function getBudgetHint(n: number): { text: string; color: string } {
  if (n <= 0)    return { text: "", color: "var(--text-muted)" };
  if (n < 50)    return { text: "Con menos de $50 es difícil diversificar. Considera empezar con al menos $50-100.", color: "#ff6b35" };
  if (n <= 200)  return { text: "¡Perfecto para empezar! Con esto podés tener 2-3 posiciones diversificadas.", color: "var(--green)" };
  if (n <= 1000) return { text: "Buen capital inicial. Podés armar un portafolio bien diversificado.", color: "var(--green)" };
  return { text: "Excelente. Con este monto tenés muchas opciones de diversificación.", color: "#00ff88" };
}

const STEP_LABELS = ["Perfil", "Presupuesto", "Activos", "Posiciones"];

const inputStyle = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: "8px",
  outline: "none",
  background: "var(--bg-card)",
  border: "1px solid var(--border)",
  color: "var(--text-primary)",
  fontSize: "13px",
  boxSizing: "border-box" as const,
};

export function PortfolioWizard({ onComplete, budget: initialBudget = 0 }: PortfolioWizardProps) {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [budget, setBudget] = useState<number>(initialBudget);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [addedAssets, setAddedAssets] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState<Record<string, boolean>>({});
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({});

  function finish() {
    localStorage.setItem("portfolio_wizard_done", "true");
    onComplete();
  }

  function getAllocations(): ProfileAssetAlloc[] {
    return profile ? PROFILE_ASSETS[profile](budget) : [];
  }

  // Fetch market prices once when entering step 4
  useEffect(() => {
    if (step !== 4) return;
    async function fetchPrices() {
      try {
        const [cRes, sRes] = await Promise.allSettled([
          api.get('/api/market/prices').then((r) => r.data),
          api.get('/api/market/stocks').then((r) => r.data),
        ]);
        const pm: Record<string, number> = {};
        if (cRes.status === "fulfilled" && Array.isArray(cRes.value)) {
          for (const c of cRes.value) {
            if (c.symbol && c.current_price) pm[c.symbol.toUpperCase()] = c.current_price;
          }
        }
        if (sRes.status === "fulfilled" && Array.isArray(sRes.value)) {
          for (const s of sRes.value) {
            if (s.ticker && s.price) pm[s.ticker.toUpperCase()] = s.price;
          }
        }
        setMarketPrices(pm);
        setPrices((prev) => {
          const next = { ...prev };
          for (const sym of selectedAssets) {
            if (!prev[sym] && pm[sym]) next[sym] = String(pm[sym]);
          }
          return next;
        });
      } catch {
        // silently fail — user can type prices manually
      }
    }
    fetchPrices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  async function addAsset(symbol: string) {
    const asset = WIZARD_ASSETS[symbol];
    const qty = parseFloat(quantities[symbol] ?? "");
    const price = parseFloat(prices[symbol] ?? "");
    if (!qty || !price || !asset) return;
    setAdding((prev) => ({ ...prev, [symbol]: true }));
    try {
      await api.post('/api/portfolio/add', { symbol, quantity: qty, buy_price: price, asset_type: asset.type });
      setAddedAssets((prev) => new Set([...prev, symbol]));
    } catch {
      // silently fail
    } finally {
      setAdding((prev) => ({ ...prev, [symbol]: false }));
    }
  }

  const allocations = getAllocations();

  // Progress bar
  const progressBar = (
    <div style={{ display: "flex", alignItems: "flex-start", width: "100%", maxWidth: "640px", marginBottom: "24px" }}>
      {STEP_LABELS.flatMap((label, i) => {
        const n = i + 1;
        const done = n < step;
        const active = n === step;
        const circle = (
          <div key={`step-${i}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "64px" }}>
            <div style={{
              width: "32px", height: "32px", borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: "bold", fontSize: "13px",
              background: done ? "var(--green)" : active ? "rgba(0,212,170,0.15)" : "rgba(148,163,184,0.07)",
              border: `2px solid ${done || active ? "var(--green)" : "var(--border)"}`,
              color: done ? "#0a0f1e" : active ? "var(--green)" : "var(--text-muted)",
              transition: "all 0.3s",
            }}>
              {done ? "✓" : n}
            </div>
            <span style={{
              fontSize: "11px", marginTop: "4px", whiteSpace: "nowrap",
              color: active ? "var(--green)" : done ? "var(--text-primary)" : "var(--text-muted)",
              fontWeight: active ? "600" : "normal",
            }}>
              {label}
            </span>
          </div>
        );
        if (i < STEP_LABELS.length - 1) {
          return [
            circle,
            <div key={`line-${i}`} style={{
              flex: 1, height: "2px", alignSelf: "flex-start", marginTop: "15px",
              background: step > n ? "var(--green)" : "var(--border)",
              transition: "background 0.3s",
            }} />,
          ];
        }
        return [circle];
      })}
    </div>
  );

  const btnBase = {
    display: "flex" as const, alignItems: "center" as const, gap: "8px",
    padding: "10px 24px", borderRadius: "10px",
    fontWeight: "600", fontSize: "14px", border: "none",
    transition: "all 0.2s",
  };

  const btnBack = {
    padding: "10px 20px", borderRadius: "10px",
    background: "var(--bg-secondary)", border: "1px solid var(--border)",
    color: "var(--text-muted)", fontWeight: "600", fontSize: "14px", cursor: "pointer",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "32px", paddingBottom: "48px" }}>
      {/* Skip */}
      <div style={{ width: "100%", maxWidth: "640px", display: "flex", justifyContent: "flex-end", marginBottom: "12px" }}>
        <button
          onClick={finish}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            fontSize: "13px", padding: "6px 14px", borderRadius: "8px", cursor: "pointer",
            color: "var(--text-muted)", background: "transparent", border: "1px solid var(--border)",
          }}
        >
          <X size={13} /> Saltar tutorial
        </button>
      </div>

      {progressBar}

      {/* Card */}
      <div style={{
        width: "100%", maxWidth: "640px",
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: "16px", padding: "32px",
        animation: "wizardFadeIn 0.25s ease",
      }}>

        {/* ── Step 1: Profile ── */}
        {step === 1 && (
          <div>
            <h2 style={{ color: "var(--text-primary)", fontWeight: "700", fontSize: "22px", marginBottom: "6px" }}>
              ¿Cuál es tu perfil de inversor?
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "24px" }}>
              Esto nos ayuda a recomendarte activos apropiados para ti
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "28px" }}>
              {([
                { key: "conservative" as Profile, label: "Conservador", desc: "Prefiero dormir tranquilo. Acepto menos ganancias a cambio de menos riesgo.", accent: "#00d4aa", bg: "rgba(0,212,170,0.08)" },
                { key: "moderate"     as Profile, label: "Moderado",    desc: "Quiero crecer, pero sin arriesgar todo. Mezcla de seguridad y oportunidad.",       accent: "#3d7cff", bg: "rgba(61,124,255,0.08)" },
                { key: "aggressive"   as Profile, label: "Agresivo",    desc: "Entiendo el riesgo y busco máximos retornos. Puedo aguantar caídas fuertes.",     accent: "#ff6b35", bg: "rgba(255,107,53,0.08)" },
              ] as const).map((opt) => {
                const sel = profile === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setProfile(opt.key)}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: "14px",
                      padding: "16px", borderRadius: "12px", cursor: "pointer",
                      background: sel ? opt.bg : "var(--bg-secondary)",
                      border: `2px solid ${sel ? opt.accent : "var(--border)"}`,
                      textAlign: "left", transition: "all 0.2s",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: "700", color: sel ? opt.accent : "var(--text-primary)", marginBottom: "3px" }}>{opt.label}</p>
                      <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>{opt.desc}</p>
                    </div>
                    {sel && (
                      <span style={{ flexShrink: 0, width: "20px", height: "20px", borderRadius: "50%", background: opt.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "#0a0f1e", fontWeight: 700 }}>✓</span>
                    )}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={!profile}
              style={{ ...btnBase, background: profile ? "var(--green)" : "var(--border)", color: profile ? "#0a0f1e" : "var(--text-muted)", cursor: profile ? "pointer" : "not-allowed" }}
            >
              Siguiente →
            </button>
          </div>
        )}

        {/* ── Step 2: Budget ── */}
        {step === 2 && (() => {
          const hint = getBudgetHint(budget);
          return (
            <div>
              <h2 style={{ color: "var(--text-primary)", fontWeight: "700", fontSize: "22px", marginBottom: "6px" }}>
                ¿Con cuánto querés empezar?
              </h2>
              <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "24px" }}>
                Ingresá el monto en dólares USD que planeas invertir inicialmente
              </p>

              <div style={{ marginBottom: "14px" }}>
                <label style={{ display: "block", fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px" }}>
                  Presupuesto inicial (USD)
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontWeight: "600" }}>$</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={budget || ""}
                    onChange={(e) => setBudget(Number(e.target.value))}
                    style={{ ...inputStyle, padding: "10px 12px 10px 28px", fontSize: "16px" }}
                  />
                </div>
              </div>

              {budget > 0 && (
                <p style={{ fontSize: "13px", color: hint.color, marginBottom: "16px", fontWeight: "500" }}>
                  {hint.text}
                </p>
              )}

              <div style={{
                padding: "14px 16px", borderRadius: "10px",
                background: "rgba(61,124,255,0.07)", border: "1px solid rgba(61,124,255,0.2)",
                marginBottom: "24px",
              }}>
                <p style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: "1.6" }}>
                  💡 <strong style={{ color: "var(--text-primary)" }}>Recuerda:</strong> Solo invierte dinero que puedas permitirte perder. Nunca uses dinero de emergencias o deudas para invertir.
                </p>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={() => setStep(1)} style={btnBack}>← Atrás</button>
                <button
                  onClick={() => setStep(3)}
                  disabled={budget <= 0}
                  style={{ ...btnBase, background: budget > 0 ? "var(--green)" : "var(--border)", color: budget > 0 ? "#0a0f1e" : "var(--text-muted)", cursor: budget > 0 ? "pointer" : "not-allowed" }}
                >
                  Siguiente →
                </button>
              </div>
            </div>
          );
        })()}

        {/* ── Step 3: Asset selection ── */}
        {step === 3 && (
          <div>
            <h2 style={{ color: "var(--text-primary)", fontWeight: "700", fontSize: "22px", marginBottom: "6px" }}>
              Estos activos van bien con tu perfil
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "24px" }}>
              Seleccioná los que quieras incluir en tu portafolio
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
              {allocations.map((alloc) => {
                const asset = WIZARD_ASSETS[alloc.symbol];
                if (!asset) return null;
                const sel = selectedAssets.includes(alloc.symbol);
                const rc = riskBadgeStyle(asset.risk);
                return (
                  <button
                    key={alloc.symbol}
                    onClick={() => setSelectedAssets((prev) =>
                      prev.includes(alloc.symbol) ? prev.filter((s) => s !== alloc.symbol) : [...prev, alloc.symbol]
                    )}
                    style={{
                      display: "flex", alignItems: "center", gap: "14px",
                      padding: "14px 16px", borderRadius: "12px", cursor: "pointer",
                      background: sel ? "rgba(0,212,170,0.06)" : "var(--bg-secondary)",
                      border: `2px solid ${sel ? "var(--green)" : "var(--border)"}`,
                      textAlign: "left", transition: "all 0.2s",
                    }}
                  >
                    <div style={{
                      width: "20px", height: "20px", borderRadius: "5px", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: sel ? "var(--green)" : "var(--bg-card)",
                      border: `2px solid ${sel ? "var(--green)" : "var(--border)"}`,
                      transition: "all 0.2s",
                    }}>
                      {sel && <span style={{ fontSize: "11px", color: "#0a0f1e", fontWeight: 700 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                        <span style={{ fontWeight: "700", color: "var(--text-primary)" }}>{alloc.symbol}</span>
                        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>— {asset.name}</span>
                      </div>
                      <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>{asset.description}</p>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px", flexShrink: 0 }}>
                      <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "999px", fontWeight: "600", ...rc }}>
                        {asset.risk}
                      </span>
                      <span style={{ fontSize: "11px", color: "var(--green)", fontWeight: "600" }}>
                        {alloc.percent}% sugerido
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setStep(2)} style={btnBack}>← Atrás</button>
              <button
                onClick={() => setStep(4)}
                disabled={selectedAssets.length === 0}
                style={{ ...btnBase, background: selectedAssets.length > 0 ? "var(--green)" : "var(--border)", color: selectedAssets.length > 0 ? "#0a0f1e" : "var(--text-muted)", cursor: selectedAssets.length > 0 ? "pointer" : "not-allowed" }}
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}

        {/* ── Step 4: Add positions ── */}
        {step === 4 && (
          <div>
            <h2 style={{ color: "var(--text-primary)", fontWeight: "700", fontSize: "22px", marginBottom: "6px" }}>
              Agreguemos tus primeras posiciones
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "24px" }}>
              Completá los datos para cada activo que seleccionaste
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "24px" }}>
              {selectedAssets.map((symbol) => {
                const asset = WIZARD_ASSETS[symbol];
                const alloc = allocations.find((a) => a.symbol === symbol);
                if (!asset) return null;
                const isAdded  = addedAssets.has(symbol);
                const isAdding = adding[symbol] ?? false;
                const marketP  = marketPrices[symbol];
                const qtyVal   = quantities[symbol] ?? "";
                const priceVal = prices[symbol] ?? (marketP ? String(marketP) : "");
                const suggestedAmt = alloc ? (budget * alloc.percent) / 100 : 0;
                const approxQty    = marketP && suggestedAmt > 0 ? (suggestedAmt / marketP).toFixed(6) : null;
                const canAdd = !!qtyVal && !!priceVal && !isAdding;

                return (
                  <div
                    key={symbol}
                    style={{
                      padding: "16px", borderRadius: "12px",
                      background: isAdded ? "rgba(0,212,170,0.06)" : "var(--bg-secondary)",
                      border: `1px solid ${isAdded ? "var(--green)" : "var(--border)"}`,
                      transition: "all 0.3s",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isAdded ? 0 : "12px" }}>
                      <div>
                        <span style={{ fontWeight: "700", color: "var(--text-primary)", marginRight: "8px" }}>{symbol}</span>
                        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{asset.name}</span>
                      </div>
                      {isAdded && (
                        <span style={{
                          display: "flex", alignItems: "center", gap: "4px",
                          fontSize: "12px", fontWeight: "600", color: "var(--green)",
                          background: "rgba(0,212,170,0.12)", padding: "2px 10px", borderRadius: "999px",
                        }}>
                          ✓ Agregado
                        </span>
                      )}
                    </div>

                    {!isAdded && (
                      <>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "8px" }}>
                          <div>
                            <label style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>
                              Cantidad (unidades)
                            </label>
                            <input
                              type="number"
                              placeholder={approxQty ?? "0"}
                              value={qtyVal}
                              onChange={(e) => setQuantities((prev) => ({ ...prev, [symbol]: e.target.value }))}
                              style={inputStyle}
                            />
                          </div>
                          <div>
                            <label style={{ display: "block", fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>
                              Precio de compra ($)
                            </label>
                            <input
                              type="number"
                              placeholder={marketP ? String(marketP) : "0"}
                              value={priceVal}
                              onChange={(e) => setPrices((prev) => ({ ...prev, [symbol]: e.target.value }))}
                              style={inputStyle}
                            />
                          </div>
                        </div>

                        {approxQty && alloc && (
                          <p style={{ fontSize: "11px", color: "var(--text-muted)", marginBottom: "10px" }}>
                            💡 Con ${suggestedAmt.toFixed(0)} ({alloc.percent}% de tu presupuesto) y {symbol} a ${marketP?.toLocaleString("en-US")}, podrías comprar aprox.{" "}
                            <strong style={{ color: "var(--green)" }}>{approxQty} unidades</strong>
                          </p>
                        )}

                        <button
                          onClick={() => addAsset(symbol)}
                          disabled={!canAdd}
                          style={{
                            padding: "8px 18px", borderRadius: "8px",
                            background: canAdd ? "var(--blue)" : "var(--border)",
                            color: canAdd ? "#fff" : "var(--text-muted)",
                            fontWeight: "600", fontSize: "13px",
                            cursor: canAdd ? "pointer" : "not-allowed",
                            border: "none", transition: "all 0.2s",
                          }}
                        >
                          {isAdding ? "Agregando..." : "Agregar al portafolio"}
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "space-between", alignItems: "center" }}>
              <button onClick={() => setStep(3)} style={btnBack}>← Atrás</button>
              <button
                onClick={finish}
                style={{ ...btnBase, background: "var(--green)", color: "#0a0f1e", cursor: "pointer", fontWeight: "700" }}
              >
                Ir a mi portafolio →
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes wizardFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
