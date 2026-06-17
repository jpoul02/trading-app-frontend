"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface CryptoPrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
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
  item?: {
    id: string;
    name: string;
    symbol: string;
    thumb: string;
    large?: string;
  };
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1];

/** Pure liquid-glass card — blurs the orbs behind it */
const GLASS: React.CSSProperties = {
  background: "rgba(255,255,255,0.055)",
  backdropFilter: "blur(22px) saturate(160%)",
  WebkitBackdropFilter: "blur(22px) saturate(160%)",
  border: "1px solid rgba(255,255,255,0.18)",
  borderTop: "1px solid rgba(255,255,255,0.28)",   // glass-edge shimmer
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.1), 0 8px 40px rgba(0,0,0,0.45)",
  borderRadius: 20,
};

/** Neo-brutalist accent applied on top of glass for hero cards */
function brutalCard(color: string): React.CSSProperties {
  return {
    ...GLASS,
    border: `2px solid ${color}`,
    borderTop: `2px solid ${color}`,
    boxShadow: `6px 6px 0px ${color}, inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 40px rgba(0,0,0,0.5)`,
  };
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function fearColor(v: number) {
  if (v <= 25) return "#ff3366";
  if (v <= 45) return "#ff6b35";
  if (v <= 55) return "#ffd32a";
  return "#00ff88";
}

/** Neo-brutalist change badge — square, hard shadow, bold */
function Badge({ value }: { value: number }) {
  const pos = value >= 0;
  const c = pos ? "#00ff88" : "#ff3366";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 10px",
        border: `2px solid ${c}`,
        boxShadow: `3px 3px 0px ${c}`,
        color: c,
        fontSize: 12,
        fontWeight: 900,
        letterSpacing: "0.06em",
        flexShrink: 0,
        borderRadius: 0,
        background: `${c}10`,
      }}
    >
      {pos ? "+" : ""}
      {value?.toFixed(2)}%
    </span>
  );
}

/** Section label — neo-brutalist left stripe */
function Label({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          width: 4,
          height: 18,
          background: "#7c3aed",
          boxShadow: "0 0 8px #7c3aed",
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontSize: 10,
          fontWeight: 800,
          color: "#94a3b8",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
        }}
      >
        {children}
      </span>
    </div>
  );
}

function PulseLoader() {
  return (
    <div
      style={{
        height: 4,
        borderRadius: 2,
        background: "rgba(255,255,255,0.06)",
        overflow: "hidden",
        margin: "8px 0",
      }}
    >
      <motion.div
        animate={{ x: ["-100%", "200%"] }}
        transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
        style={{
          width: "45%",
          height: "100%",
          background: "rgba(255,255,255,0.15)",
          borderRadius: 2,
        }}
      />
    </div>
  );
}

function CryptoMini({ c }: { c: CryptoPrice }) {
  const pos = c.price_change_percentage_24h >= 0;
  return (
    <div style={{ padding: "20px 22px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: "#f8fafc",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          {c.symbol}
        </span>
        <Badge value={c.price_change_percentage_24h} />
      </div>
      <p style={{ color: "#64748b", fontSize: 11, marginBottom: 6 }}>{c.name}</p>
      <p
        style={{
          color: pos ? "#e2fff1" : "#ffe2e8",
          fontWeight: 800,
          fontSize: 19,
          letterSpacing: "-0.02em",
        }}
      >
        ${c.current_price?.toLocaleString("en-US")}
      </p>
    </div>
  );
}

// ─── Framer variants ───────────────────────────────────────────────────────────

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.55, ease: EASE },
  },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [cryptos, setCryptos] = useState<CryptoPrice[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [fearGreed, setFearGreed] = useState<FearGreed | null>(null);
  const [trending, setTrending] = useState<TrendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function fetchData() {
    setLoading(true);
    setError(false);
    const [pricesR, stocksR, fgR, trendR] = await Promise.allSettled([
      fetch("http://localhost:8000/api/market/prices").then((r) => r.json()),
      fetch("http://localhost:8000/api/market/stocks").then((r) => r.json()),
      fetch("http://localhost:8000/api/market/fear-greed").then((r) => r.json()),
      fetch("http://localhost:8000/api/market/trending").then((r) => r.json()),
    ]);
    if (pricesR.status === "fulfilled") setCryptos(pricesR.value.slice(0, 8));
    if (stocksR.status === "fulfilled") setStocks(stocksR.value);
    if (fgR.status === "fulfilled") setFearGreed(fgR.value);
    if (trendR.status === "fulfilled") {
      const coins = trendR.value?.coins ?? trendR.value ?? [];
      setTrending(Array.isArray(coins) ? coins.slice(0, 3) : []);
    }
    setError(
      [pricesR, stocksR, fgR, trendR].every((r) => r.status === "rejected")
    );
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  const today = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const btc = cryptos[0];
  const rest = cryptos.slice(1); // ETH, BNB, SOL, ADA, XRP, DOGE, DOT

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 1320, margin: "0 auto" }}>

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: 36,
        }}
      >
        <div>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#7c3aed",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            — Dashboard
          </p>
          <h1
            style={{
              color: "#f8fafc",
              fontSize: 38,
              fontWeight: 900,
              letterSpacing: "-0.04em",
              lineHeight: 1,
            }}
          >
            Mercado hoy
          </h1>
          <p
            style={{
              color: "#475569",
              fontSize: 13,
              marginTop: 8,
              textTransform: "capitalize",
            }}
          >
            {today}
          </p>
        </div>

        {/* Neo-brutalist refresh button */}
        <button
          onClick={fetchData}
          style={{
            padding: "10px 22px",
            border: "2px solid rgba(255,255,255,0.2)",
            boxShadow: "4px 4px 0px rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.04)",
            color: "#94a3b8",
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.12em",
            cursor: "pointer",
            borderRadius: 0,
            backdropFilter: "blur(10px)",
          }}
        >
          ↻ ACTUALIZAR
        </button>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            marginBottom: 28,
            padding: "16px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            border: "2px solid #ff3366",
            boxShadow: "5px 5px 0px #ff3366",
            background: "rgba(255,51,102,0.07)",
            borderRadius: 0,
          }}
        >
          <span style={{ color: "#ff3366", fontWeight: 700, fontSize: 14 }}>
            Error al conectar con el servidor
          </span>
          <button
            onClick={fetchData}
            style={{
              border: "2px solid #ff3366",
              boxShadow: "3px 3px 0px #ff3366",
              color: "#ff3366",
              padding: "5px 16px",
              fontWeight: 800,
              background: "transparent",
              cursor: "pointer",
              fontSize: 11,
              letterSpacing: "0.1em",
              borderRadius: 0,
            }}
          >
            REINTENTAR
          </button>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════
          BENTO GRID  —  4 columns × auto rows
          Row 1: [BTC hero 2×1]         [F&G 2×2]
          Row 2: [ETH 1×1] [BNB 1×1]   [F&G cont.]
          Row 3: [SOL] [ADA] [XRP] [DOGE]
          Row 4: [ETFs 2×1]  [Trending 2×1]
         ══════════════════════════════════════════════ */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
        }}
      >

        {/* ①  BTC HERO — 2 cols, neo-brutalist green */}
        <motion.div
          variants={item}
          whileHover={{ scale: 1.018, y: -4, transition: { duration: 0.2, ease: EASE } }}
          style={{
            ...brutalCard("#00ff88"),
            gridColumn: "span 2",
            padding: 32,
            minHeight: 200,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          {loading || !btc ? (
            <>
              <PulseLoader />
              <PulseLoader />
            </>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 800, color: "#00ff88", letterSpacing: "0.14em", textTransform: "uppercase" }}>
                    Bitcoin
                  </p>
                  <p style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>BTC · Cripto</p>
                </div>
                <Badge value={btc.price_change_percentage_24h} />
              </div>

              <div>
                <motion.p
                  key={btc.current_price}
                  initial={{ opacity: 0.4, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: EASE }}
                  style={{
                    color: "#f8fafc",
                    fontSize: 52,
                    fontWeight: 900,
                    letterSpacing: "-0.05em",
                    lineHeight: 1,
                    textShadow: "0 0 40px rgba(0,255,136,0.15)",
                  }}
                >
                  ${btc.current_price?.toLocaleString("en-US")}
                </motion.p>
                <p style={{ color: "#475569", fontSize: 11, marginTop: 10, letterSpacing: "0.04em" }}>
                  PRECIO ACTUAL
                </p>
              </div>
            </>
          )}
        </motion.div>

        {/* ②  FEAR & GREED — 2 cols, 2 rows, neo-brutalist violet */}
        <motion.div
          variants={item}
          whileHover={{ scale: 1.01, transition: { duration: 0.2, ease: EASE } }}
          style={{
            ...brutalCard("#7c3aed"),
            gridColumn: "span 2",
            gridRow: "span 2",
            padding: 32,
            minHeight: 420,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Label>Índice Miedo &amp; Codicia</Label>

          {loading ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, paddingTop: 24 }}>
              <PulseLoader />
              <PulseLoader />
            </div>
          ) : fearGreed ? (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
              {/* Glow ring */}
              <div
                style={{
                  position: "relative",
                  width: 180,
                  height: 180,
                  marginBottom: 24,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    border: `4px solid ${fearColor(fearGreed.value)}`,
                    boxShadow: `0 0 30px ${fearColor(fearGreed.value)}60, inset 0 0 20px ${fearColor(fearGreed.value)}15`,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <motion.p
                    key={fearGreed.value}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.7, ease: EASE }}
                    style={{
                      fontSize: 72,
                      fontWeight: 900,
                      letterSpacing: "-0.05em",
                      lineHeight: 1,
                      color: fearColor(fearGreed.value),
                      textShadow: `0 0 50px ${fearColor(fearGreed.value)}70`,
                    }}
                  >
                    {fearGreed.value}
                  </motion.p>
                </div>
              </div>

              <p
                style={{
                  color: fearColor(fearGreed.value),
                  fontWeight: 800,
                  fontSize: 18,
                  letterSpacing: "0.02em",
                  marginBottom: 28,
                }}
              >
                {fearGreed.classification}
              </p>

              {/* Gradient bar */}
              <div
                style={{
                  width: "100%",
                  height: 8,
                  borderRadius: 0,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  overflow: "hidden",
                  marginBottom: 8,
                }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${fearGreed.value}%` }}
                  transition={{ duration: 1.4, ease: EASE, delay: 0.3 }}
                  style={{
                    height: "100%",
                    background:
                      "linear-gradient(90deg, #ff3366 0%, #ffd32a 50%, #00ff88 100%)",
                  }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                <span style={{ fontSize: 9, fontWeight: 800, color: "#ff3366", letterSpacing: "0.1em" }}>MIEDO</span>
                <span style={{ fontSize: 9, fontWeight: 800, color: "#00ff88", letterSpacing: "0.1em" }}>CODICIA</span>
              </div>
            </div>
          ) : null}
        </motion.div>

        {/* ③ ETH */}
        <motion.div
          variants={item}
          whileHover={{ scale: 1.03, y: -4, transition: { duration: 0.18, ease: EASE } }}
          style={{ ...GLASS }}
        >
          {loading || !rest[0] ? (
            <div style={{ padding: 20 }}><PulseLoader /><PulseLoader /></div>
          ) : (
            <CryptoMini c={rest[0]} />
          )}
        </motion.div>

        {/* ④ BNB */}
        <motion.div
          variants={item}
          whileHover={{ scale: 1.03, y: -4, transition: { duration: 0.18, ease: EASE } }}
          style={{ ...GLASS }}
        >
          {loading || !rest[1] ? (
            <div style={{ padding: 20 }}><PulseLoader /><PulseLoader /></div>
          ) : (
            <CryptoMini c={rest[1]} />
          )}
        </motion.div>

        {/* ⑤–⑧  SOL · ADA · XRP · DOGE  — full 4 cols */}
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <motion.div key={`sk-${i}`} variants={item} style={{ ...GLASS }}>
                <div style={{ padding: 20 }}><PulseLoader /><PulseLoader /></div>
              </motion.div>
            ))
          : rest.slice(2, 6).map((c) => (
              <motion.div
                key={c.id}
                variants={item}
                whileHover={{ scale: 1.03, y: -4, transition: { duration: 0.18, ease: EASE } }}
                style={{ ...GLASS }}
              >
                <CryptoMini c={c} />
              </motion.div>
            ))}

        {/* ⑨  ETFs — 2 cols */}
        <motion.div
          variants={item}
          whileHover={{ scale: 1.008, transition: { duration: 0.2, ease: EASE } }}
          style={{ ...GLASS, gridColumn: "span 2", padding: 28 }}
        >
          <Label>ETFs Populares</Label>

          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <PulseLoader key={i} />)
          ) : (
            <div>
              {stocks.map((s, i) => (
                <div
                  key={s.symbol ?? i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "13px 0",
                    borderBottom:
                      i < stocks.length - 1
                        ? "1px solid rgba(255,255,255,0.06)"
                        : "none",
                  }}
                >
                  <div>
                    <span style={{ color: "#f8fafc", fontWeight: 800, fontSize: 15 }}>
                      {s.symbol}
                    </span>
                    <span style={{ color: "#475569", fontSize: 12, marginLeft: 10 }}>
                      {s.name}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 15 }}>
                      ${s.price?.toLocaleString("en-US")}
                    </span>
                    <Badge value={s.change_pct_24h} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* ⑩  TRENDING — 2 cols */}
        <motion.div
          variants={item}
          whileHover={{ scale: 1.008, transition: { duration: 0.2, ease: EASE } }}
          style={{ ...GLASS, gridColumn: "span 2", padding: 28 }}
        >
          <Label>Trending 🔥</Label>

          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <PulseLoader key={i} />)
          ) : (
            <div>
              {trending.map((t, i) => {
                const name = t.item?.name ?? t.name ?? "—";
                const symbol = t.item?.symbol ?? t.symbol ?? "—";
                const thumb = t.item?.thumb ?? t.large;
                const key = t.item?.id ?? t.id ?? `trending-${i}`;
                return (
                  <div
                    key={key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                      padding: "13px 0",
                      borderBottom:
                        i < trending.length - 1
                          ? "1px solid rgba(255,255,255,0.06)"
                          : "none",
                    }}
                  >
                    {/* Neo-brutalist rank badge */}
                    <span
                      style={{
                        width: 32,
                        height: 32,
                        border: "2px solid #7c3aed",
                        boxShadow: "3px 3px 0px #7c3aed",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 900,
                        color: "#7c3aed",
                        flexShrink: 0,
                        borderRadius: 0,
                        background: "rgba(124,58,237,0.1)",
                      }}
                    >
                      {i + 1}
                    </span>

                    {thumb && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb}
                        alt={name}
                        width={28}
                        height={28}
                        style={{ borderRadius: "50%", flexShrink: 0 }}
                      />
                    )}

                    <div>
                      <p style={{ color: "#f8fafc", fontWeight: 700, fontSize: 14 }}>
                        {name}
                      </p>
                      <p style={{ color: "#475569", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        {symbol}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

      </motion.div>
    </div>
  );
}
