"use client";

import { useEffect, useState } from "react";

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

// ─── Static content ───────────────────────────────────────────────────────────

const GLOSSARY = [
  {
    key: "balance",
    icon: "💰",
    term: "Balance",
    short: "El dinero total en tu cuenta.",
    detail:
      "No cambia hasta que cerrás una operación. Si el mercado se mueve en tu contra, el Balance sigue igual — lo que fluctúa es el Equity. Solo al cerrar un trade el Balance se actualiza (para mejor o peor).",
  },
  {
    key: "equity",
    icon: "📊",
    term: "Equity",
    short: "Balance + ganancias/pérdidas actuales de posiciones abiertas.",
    detail:
      "El Equity fluctúa en tiempo real con el mercado. Si tenés una posición ganando $50, tu Equity = Balance + $50. Si la posición cierra, esos $50 pasan al Balance. Un Equity por debajo del Balance significa pérdidas flotantes.",
  },
  {
    key: "margin",
    icon: "🔒",
    term: "Margin (Margen)",
    short: "El dinero que el broker reserva como garantía de tus operaciones.",
    detail:
      "Cuando abrís un trade, el broker bloquea una porción de tu capital como garantía. Con leverage 1:100 y $10,000 operados, solo necesitás $100 de margen. Si el Equity cae por debajo del margen requerido, el broker cierra tus posiciones automáticamente (Margin Call).",
  },
  {
    key: "margin_free",
    icon: "🟢",
    term: "Margin Libre",
    short: "Capital disponible para abrir nuevas operaciones.",
    detail:
      "Margin Libre = Equity − Margen usado. Si tenés $1,000 de equity y $100 en margen, podés abrir más posiciones con hasta $900. Cuando el Margin Libre llega a cero no podés operar más.",
  },
  {
    key: "leverage",
    icon: "⚡",
    term: "Leverage (Apalancamiento)",
    short: "Con 1:100 controlás $100 por cada $1 tuyo.",
    detail:
      "El apalancamiento amplifica tanto ganancias como pérdidas. Con 1:100 y $100 controlás $10,000. Si el precio sube 1%, ganás $100 (100% de tu capital). Si baja 1%, perdés $100 (todo tu capital). Más apalancamiento = más riesgo. Empezá con 1:10 o 1:20.",
  },
  {
    key: "profit",
    icon: "📈",
    term: "Profit Flotante",
    short: "Ganancia o pérdida de posiciones abiertas en este momento.",
    detail:
      "Cambia cada segundo mientras tenés posiciones abiertas. Verde = ganando. Rojo = perdiendo. No es dinero real hasta que cerrés la posición. Un trade en pérdida puede recuperarse si el mercado vuelve a tu favor — por eso existe el Stop Loss.",
  },
];

const QUICK_SYMBOLS = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "BTCUSD"];

const FOREX_CONCEPTS = [
  {
    icon: "📊",
    title: "Pips",
    body: "La unidad mínima de movimiento de precio. En EURUSD, 1 pip = 0.0001. Si el precio va de 1.0850 a 1.0851, subió 1 pip. En pares con JPY, 1 pip = 0.01.",
  },
  {
    icon: "📦",
    title: "Lotes (Lot Size)",
    body: "Tamaño de la operación. 1 lote estándar = 100,000 unidades. Mini lote = 10,000. Micro lote = 1,000. En MT5 podés operar desde 0.01 lotes (1,000 unidades).",
  },
  {
    icon: "🛑",
    title: "Stop Loss",
    body: "Orden automática para cerrar si perdés X cantidad. Protege tu cuenta de pérdidas catastróficas. Poné siempre Stop Loss antes de abrir un trade.",
  },
  {
    icon: "🎯",
    title: "Take Profit",
    body: "Cierra automáticamente cuando alcanzás tu ganancia objetivo. No necesitás estar mirando la pantalla — MT5 lo ejecuta solo.",
  },
  {
    icon: "📈",
    title: "Long / Short",
    body: "Long (BUY) = apostás a que el precio sube. Short (SELL) = apostás a que baja. En Forex ganás en ambas direcciones según el mercado.",
  },
];

// ─── Design tokens ────────────────────────────────────────────────────────────

const GREEN  = "#16c784";
const RED    = "#ea3943";
const TEXT   = "oklch(0.9851 0 0)";
const TEXT2  = "oklch(0.7090 0 0)";
const MUTED  = "oklch(0.5555 0 0)";
const DIM    = "oklch(0.3715 0 0)";
const CARD   = "oklch(0.2134 0 0)";
const CARD2  = "oklch(0.1448 0 0)";
const BORDER = "oklch(0.3407 0 0)";

const CARD_STYLE: React.CSSProperties = {
  background: CARD,
  border: `1px solid ${BORDER}`,
  borderRadius: 0,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(n?: number) {
  return n != null
    ? n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "—";
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div
      style={{
        padding: "12px 14px",
        border: `1px solid ${DIM}40`,
        background: CARD2,
      }}
    >
      <p
        style={{
          fontSize: 9,
          color: DIM,
          letterSpacing: "0.14em",
          marginBottom: 6,
          textTransform: "uppercase",
        }}
      >
        {label}
      </p>
      <p
        style={{
          color: color ?? TEXT,
          fontSize: 18,
          fontWeight: 800,
          letterSpacing: "-0.02em",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </p>
    </div>
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

  async function fetchStatus() {
    try {
      const res = await fetch("http://localhost:8000/api/mt5/status");
      setStatus(await res.json());
    } catch {
      setStatus({ connected: false, error: "No se pudo conectar al servidor (puerto 8000)" });
    }
  }

  async function fetchPositions() {
    try {
      const res = await fetch("http://localhost:8000/api/mt5/positions");
      const data = await res.json();
      setPositions(data.positions ?? []);
    } catch {}
  }

  async function fetchHistory() {
    try {
      const res = await fetch("http://localhost:8000/api/mt5/history");
      const data = await res.json();
      setDeals(data.deals ?? []);
    } catch {}
  }

  async function fetchPrice() {
    const sym = symbolInput.trim().toUpperCase();
    if (!sym) return;
    setPriceLoading(true);
    setPriceResult(null);
    try {
      const res = await fetch(`http://localhost:8000/api/mt5/price/${sym}`);
      setPriceResult(await res.json());
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

    const s = setInterval(fetchStatus, 10_000);
    const p = setInterval(fetchPositions, 5_000);
    const h = setInterval(fetchHistory, 30_000);

    return () => {
      clearInterval(s);
      clearInterval(p);
      clearInterval(h);
    };
  }, []);

  const connected = status?.connected ?? false;
  const cur = status?.currency ?? "USD";

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", fontFamily: "inherit" }}>
      <style>{`
        @keyframes mt5pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.25; transform: scale(0.65); }
        }
        .mt5-dot { animation: mt5pulse 2s ease-in-out infinite; }
      `}</style>

      {/* ══ Header ══════════════════════════════════════════════════════════ */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div>
          <h1
            style={{
              color: TEXT,
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            MetaTrader 5
          </h1>
          <p style={{ color: MUTED, fontSize: 12, marginTop: 4 }}>
            Cuenta demo · {status?.server ?? "MetaQuotes-Demo"}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            padding: "8px 14px",
            background: connected ? `${GREEN}0d` : `${RED}0d`,
            border: `1px solid ${connected ? GREEN : RED}30`,
          }}
        >
          <span
            className={connected ? "mt5-dot" : undefined}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: connected ? GREEN : RED,
              display: "inline-block",
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 11,
              color: connected ? GREEN : RED,
              fontWeight: 700,
              letterSpacing: "0.1em",
            }}
          >
            {connected ? "CONECTADO" : "DESCONECTADO"}
          </span>
        </div>
      </div>

      {/* ══ Connection error ════════════════════════════════════════════════ */}
      {status && !connected && (
        <div
          style={{
            marginBottom: 20,
            padding: "14px 18px",
            border: `1px solid ${RED}30`,
            background: `${RED}08`,
          }}
        >
          <p style={{ color: RED, fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
            MT5 no disponible
          </p>
          <p style={{ color: TEXT2, fontSize: 12, marginBottom: 6 }}>
            {status.error}
          </p>
          <p style={{ color: MUTED, fontSize: 11, lineHeight: 1.7 }}>
            Para conectar: abrí MetaTrader 5 en Windows → iniciá sesión con tu cuenta demo →
            los datos aparecerán automáticamente en esta página (refresca cada 10s).
          </p>
        </div>
      )}

      {/* ══ Account stats ═══════════════════════════════════════════════════ */}
      {connected && (
        <div style={{ ...CARD_STYLE, padding: 22, marginBottom: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: MUTED,
                letterSpacing: "0.01em",
              }}
            >
              Cuenta #{status?.login} — {status?.name}
            </p>
            <span style={{ fontSize: 10, color: DIM, letterSpacing: "0.08em" }}>
              Leverage 1:{status?.leverage} · {cur}
            </span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 8,
            }}
          >
            <StatBox label="Balance" value={`${cur} ${fmt(status?.balance)}`} />
            <StatBox label="Equity" value={`${cur} ${fmt(status?.equity)}`} />
            <StatBox
              label="Profit Flotante"
              value={`${(status?.profit ?? 0) >= 0 ? "+" : ""}${fmt(status?.profit)}`}
              color={(status?.profit ?? 0) >= 0 ? GREEN : RED}
            />
            <StatBox label="Margin Libre" value={`${cur} ${fmt(status?.margin_free)}`} color={TEXT2} />
          </div>
        </div>
      )}

      {/* ══ Educational accordion ═══════════════════════════════════════════ */}
      <div style={{ ...CARD_STYLE, marginBottom: 20, overflow: "hidden" }}>
        <div style={{ padding: "16px 22px 4px" }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: MUTED,
              letterSpacing: "0.01em",
              marginBottom: 4,
            }}
          >
            ¿Qué significa cada número?
          </p>
        </div>
        {GLOSSARY.map((item, i) => {
          const open = openItem === item.key;
          return (
            <div
              key={item.key}
              style={{ borderTop: `1px solid ${DIM}40` }}
            >
              <button
                onClick={() => setOpenItem(open ? null : item.key)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: i === 0 ? "10px 22px 12px" : "12px 22px",
                  background: open ? `${MUTED}08` : "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textAlign: "left",
                  transition: "background 0.15s",
                }}
              >
                <span style={{ fontSize: 17, flexShrink: 0 }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ color: TEXT, fontSize: 13, fontWeight: 600 }}>
                    {item.term}
                  </p>
                  <p style={{ color: MUTED, fontSize: 11, marginTop: 1 }}>
                    {item.short}
                  </p>
                </div>
                <span
                  style={{
                    color: DIM,
                    fontSize: 11,
                    flexShrink: 0,
                    display: "inline-block",
                    transform: open ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.18s",
                  }}
                >
                  ▾
                </span>
              </button>
              {open && (
                <div style={{ padding: "0 22px 14px 52px" }}>
                  <p style={{ color: TEXT2, fontSize: 12, lineHeight: 1.8 }}>
                    {item.detail}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ══ Price lookup ════════════════════════════════════════════════════ */}
      <div style={{ ...CARD_STYLE, padding: 22, marginBottom: 20 }}>
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: MUTED,
            letterSpacing: "0.01em",
            marginBottom: 14,
          }}
        >
          Precios en Vivo
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input
            value={symbolInput}
            onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && fetchPrice()}
            placeholder="Ej: EURUSD"
            style={{
              flex: 1,
              padding: "9px 12px",
              background: CARD2,
              border: `1px solid ${BORDER}`,
              color: TEXT,
              fontSize: 13,
              outline: "none",
              fontFamily: "inherit",
              letterSpacing: "0.08em",
              fontWeight: 600,
              borderRadius: 0,
            }}
          />
          <button
            onClick={fetchPrice}
            disabled={priceLoading}
            style={{
              padding: "9px 22px",
              background: TEXT,
              color: CARD2,
              border: "none",
              cursor: priceLoading ? "default" : "pointer",
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "inherit",
              letterSpacing: "0.1em",
              borderRadius: 0,
              opacity: priceLoading ? 0.6 : 1,
            }}
          >
            {priceLoading ? "..." : "BUSCAR"}
          </button>
        </div>

        {/* Quick symbol buttons */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
          {QUICK_SYMBOLS.map((s) => (
            <button
              key={s}
              onClick={() => {
                setSymbolInput(s);
                setPriceResult(null);
              }}
              style={{
                padding: "4px 10px",
                border: `1px solid ${symbolInput === s ? MUTED : BORDER}`,
                background: symbolInput === s ? `${MUTED}18` : "transparent",
                color: symbolInput === s ? TEXT : MUTED,
                fontSize: 10,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                letterSpacing: "0.1em",
                borderRadius: 0,
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Price result */}
        {priceResult && !priceResult.error && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 8,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                padding: "14px 16px",
                border: `1px solid ${GREEN}25`,
                background: `${GREEN}06`,
              }}
            >
              <p
                style={{
                  fontSize: 9,
                  color: DIM,
                  letterSpacing: "0.14em",
                  marginBottom: 6,
                  textTransform: "uppercase",
                }}
              >
                BID — vendés a
              </p>
              <p
                style={{
                  color: GREEN,
                  fontSize: 22,
                  fontWeight: 800,
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "-0.01em",
                }}
              >
                {priceResult.bid?.toFixed(priceResult.digits ?? 5)}
              </p>
            </div>
            <div
              style={{
                padding: "14px 16px",
                border: `1px solid ${RED}25`,
                background: `${RED}06`,
              }}
            >
              <p
                style={{
                  fontSize: 9,
                  color: DIM,
                  letterSpacing: "0.14em",
                  marginBottom: 6,
                  textTransform: "uppercase",
                }}
              >
                ASK — comprás a
              </p>
              <p
                style={{
                  color: RED,
                  fontSize: 22,
                  fontWeight: 800,
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "-0.01em",
                }}
              >
                {priceResult.ask?.toFixed(priceResult.digits ?? 5)}
              </p>
            </div>
            <div
              style={{
                padding: "14px 16px",
                border: `1px solid ${BORDER}`,
                background: CARD2,
              }}
            >
              <p
                style={{
                  fontSize: 9,
                  color: DIM,
                  letterSpacing: "0.14em",
                  marginBottom: 6,
                  textTransform: "uppercase",
                }}
              >
                Spread (pips)
              </p>
              <p
                style={{
                  color: TEXT,
                  fontSize: 22,
                  fontWeight: 800,
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "-0.01em",
                }}
              >
                {priceResult.spread?.toFixed(1)}
              </p>
            </div>
          </div>
        )}

        {priceResult?.error && (
          <div
            style={{
              padding: "10px 14px",
              border: `1px solid ${RED}30`,
              background: `${RED}06`,
              marginBottom: 18,
            }}
          >
            <p style={{ color: RED, fontSize: 12 }}>{priceResult.error}</p>
          </div>
        )}

        {/* Educational note */}
        <div
          style={{
            padding: "12px 16px",
            background: CARD2,
            border: `1px solid ${BORDER}`,
          }}
        >
          <p style={{ color: TEXT2, fontSize: 12, lineHeight: 1.85 }}>
            <strong style={{ color: GREEN }}>Bid</strong> = precio al que el broker te compra (vos vendés).{" "}
            <strong style={{ color: RED }}>Ask</strong> = precio al que el broker te vende (vos comprás).{" "}
            <strong style={{ color: TEXT }}>Spread</strong> = la diferencia entre ambos —
            esa es la comisión implícita del broker.
          </p>
          <p style={{ color: MUTED, fontSize: 11, marginTop: 8, lineHeight: 1.8 }}>
            Ejemplo: EURUSD con spread de 1.2 pips y 1 lote (100,000 EUR) →
            pagás <span style={{ color: TEXT }}>$12 de spread</span> al abrir la posición.
            Un spread bajo = broker más barato.
          </p>
        </div>
      </div>

      {/* ══ Open positions ══════════════════════════════════════════════════ */}
      <div style={{ ...CARD_STYLE, marginBottom: 20 }}>
        <div
          style={{
            padding: "18px 22px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            borderBottom: positions.length > 0 ? `1px solid ${BORDER}` : undefined,
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: MUTED,
              letterSpacing: "0.01em",
            }}
          >
            Posiciones Abiertas
          </p>
          {positions.length > 0 && (
            <span
              style={{
                padding: "1px 7px",
                background: `${GREEN}15`,
                color: GREEN,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.06em",
              }}
            >
              {positions.length}
            </span>
          )}
        </div>

        {positions.length === 0 ? (
          <div style={{ padding: "36px 22px", textAlign: "center" }}>
            <p style={{ color: DIM, fontSize: 13, marginBottom: 6 }}>
              Sin posiciones abiertas
            </p>
            <p style={{ color: MUTED, fontSize: 11, maxWidth: 380, margin: "0 auto" }}>
              Abrí una operación en MetaTrader 5 y aparecerá aquí automáticamente.
              Esta tabla se actualiza cada 5 segundos.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 12,
              }}
            >
              <thead>
                <tr>
                  {[
                    "Símbolo",
                    "Tipo",
                    "Volumen",
                    "Entrada",
                    "Actual",
                    "Profit / Loss",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "9px 14px",
                        color: MUTED,
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: "0.08em",
                        textAlign: "left",
                        whiteSpace: "nowrap",
                        borderBottom: `1px solid ${DIM}40`,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {positions.map((p, i) => (
                  <tr
                    key={p.ticket}
                    style={{
                      borderTop: i > 0 ? `1px solid ${DIM}25` : undefined,
                    }}
                  >
                    <td
                      style={{
                        padding: "11px 14px",
                        color: TEXT,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                      }}
                    >
                      {p.symbol}
                    </td>
                    <td style={{ padding: "11px 14px" }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          fontSize: 10,
                          fontWeight: 700,
                          color: p.type === "BUY" ? GREEN : RED,
                          background:
                            p.type === "BUY" ? `${GREEN}12` : `${RED}12`,
                        }}
                      >
                        {p.type}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "11px 14px",
                        color: TEXT2,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {p.volume}
                    </td>
                    <td
                      style={{
                        padding: "11px 14px",
                        color: TEXT2,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {p.open_price}
                    </td>
                    <td
                      style={{
                        padding: "11px 14px",
                        color: TEXT,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {p.current_price}
                    </td>
                    <td
                      style={{
                        padding: "11px 14px",
                        fontWeight: 700,
                        fontVariantNumeric: "tabular-nums",
                        color: p.profit >= 0 ? GREEN : RED,
                      }}
                    >
                      {p.profit >= 0 ? "+" : ""}
                      {fmt(p.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══ Trade history ═══════════════════════════════════════════════════ */}
      <div style={{ ...CARD_STYLE, marginBottom: 20 }}>
        <div
          style={{
            padding: "18px 22px 14px",
            borderBottom: deals.length > 0 ? `1px solid ${BORDER}` : undefined,
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: MUTED,
              letterSpacing: "0.01em",
            }}
          >
            Historial de Operaciones (últimas 20)
          </p>
        </div>

        {deals.length === 0 ? (
          <div style={{ padding: "36px 22px", textAlign: "center" }}>
            <p style={{ color: DIM, fontSize: 13, marginBottom: 6 }}>
              Sin operaciones cerradas
            </p>
            <p style={{ color: MUTED, fontSize: 11 }}>
              Tu historial de operaciones cerradas (90 días) aparecerá aquí.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 12,
              }}
            >
              <thead>
                <tr>
                  {[
                    "Símbolo",
                    "Tipo",
                    "Volumen",
                    "Precio Cierre",
                    "Profit",
                    "Fecha",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "9px 14px",
                        color: MUTED,
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: "0.08em",
                        textAlign: "left",
                        whiteSpace: "nowrap",
                        borderBottom: `1px solid ${DIM}40`,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deals.map((d, i) => (
                  <tr
                    key={d.ticket}
                    style={{
                      borderTop: i > 0 ? `1px solid ${DIM}25` : undefined,
                    }}
                  >
                    <td
                      style={{
                        padding: "10px 14px",
                        color: TEXT,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                      }}
                    >
                      {d.symbol}
                    </td>
                    <td style={{ padding: "10px 14px" }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          fontSize: 10,
                          fontWeight: 700,
                          color: d.type === "BUY" ? GREEN : RED,
                          background:
                            d.type === "BUY" ? `${GREEN}12` : `${RED}12`,
                        }}
                      >
                        {d.type}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "10px 14px",
                        color: TEXT2,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {d.volume}
                    </td>
                    <td
                      style={{
                        padding: "10px 14px",
                        color: TEXT2,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {d.price}
                    </td>
                    <td
                      style={{
                        padding: "10px 14px",
                        fontWeight: 700,
                        fontVariantNumeric: "tabular-nums",
                        color: d.profit >= 0 ? GREEN : RED,
                      }}
                    >
                      {d.profit >= 0 ? "+" : ""}
                      {fmt(d.profit)}
                    </td>
                    <td
                      style={{
                        padding: "10px 14px",
                        color: MUTED,
                        fontSize: 11,
                        whiteSpace: "nowrap",
                      }}
                    >
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

      {/* ══ Forex concepts ══════════════════════════════════════════════════ */}
      <div style={{ marginBottom: 8 }}>
        <p
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: MUTED,
            letterSpacing: "0.01em",
            marginBottom: 14,
          }}
        >
          Conceptos Clave del Forex
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
            gap: 8,
          }}
        >
          {FOREX_CONCEPTS.map((c) => (
            <div key={c.title} style={{ ...CARD_STYLE, padding: "16px 18px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: 18 }}>{c.icon}</span>
                <p style={{ color: TEXT, fontWeight: 700, fontSize: 13 }}>
                  {c.title}
                </p>
              </div>
              <p
                style={{ color: TEXT2, fontSize: 11, lineHeight: 1.8 }}
              >
                {c.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
