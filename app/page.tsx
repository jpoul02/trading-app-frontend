"use client";

import { useEffect, useState } from "react";

interface CryptoPrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
}

interface Stock {
  ticker: string;
  name: string;
  price: number;
  change_percent: number;
}

interface FearGreed {
  value: number;
  label: string;
}

interface TrendingItem {
  id: string;
  name: string;
  symbol: string;
}

function Skeleton() {
  return (
    <div className="animate-pulse rounded-xl h-24" style={{ background: "var(--bg-card)" }} />
  );
}

function fearGreedColor(value: number) {
  if (value <= 25) return "#ff4757";
  if (value <= 45) return "#ff6b35";
  if (value <= 55) return "#ffd32a";
  if (value <= 75) return "#00d4aa";
  return "#00ff88";
}

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
    console.log("[Dashboard] Starting all fetches...");

    const [pricesResult, stocksResult, fgResult, trendResult] = await Promise.allSettled([
      (async () => {
        console.log("[Dashboard] Fetching prices → http://localhost:8000/api/market/prices");
        const res = await fetch("http://localhost:8000/api/market/prices");
        console.log("[Dashboard] Prices status:", res.status);
        return res.json();
      })(),
      (async () => {
        console.log("[Dashboard] Fetching stocks → http://localhost:8000/api/market/stocks");
        const res = await fetch("http://localhost:8000/api/market/stocks");
        console.log("[Dashboard] Stocks status:", res.status);
        return res.json();
      })(),
      (async () => {
        console.log("[Dashboard] Fetching fear-greed → http://localhost:8000/api/market/fear-greed");
        const res = await fetch("http://localhost:8000/api/market/fear-greed");
        console.log("[Dashboard] Fear-greed status:", res.status);
        return res.json();
      })(),
      (async () => {
        console.log("[Dashboard] Fetching trending → http://localhost:8000/api/market/trending");
        const res = await fetch("http://localhost:8000/api/market/trending");
        console.log("[Dashboard] Trending status:", res.status);
        return res.json();
      })(),
    ]);

    if (pricesResult.status === "fulfilled") {
      setCryptos(pricesResult.value.slice(0, 8));
    } else {
      console.error("[Dashboard] Error fetching prices:", pricesResult.reason);
    }

    if (stocksResult.status === "fulfilled") {
      setStocks(stocksResult.value);
    } else {
      console.error("[Dashboard] Error fetching stocks:", stocksResult.reason);
    }

    if (fgResult.status === "fulfilled") {
      setFearGreed(fgResult.value);
    } else {
      console.error("[Dashboard] Error fetching fear-greed:", fgResult.reason);
    }

    if (trendResult.status === "fulfilled") {
      setTrending(trendResult.value.slice(0, 3));
    } else {
      console.error("[Dashboard] Error fetching trending:", trendResult.reason);
    }

    const allFailed = [pricesResult, stocksResult, fgResult, trendResult].every(
      (r) => r.status === "rejected"
    );
    setError(allFailed);
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

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Buenos días, trader 👋
        </h1>
        <p className="mt-1 capitalize" style={{ color: "var(--text-muted)" }}>
          {today}
        </p>
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

      {/* Cryptos */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Criptomonedas
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} />)
            : cryptos.map((c, i) => (
                <div
                  key={c.id ?? `crypto-${i}`}
                  className="rounded-xl p-4"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold uppercase text-sm" style={{ color: "var(--text-primary)" }}>
                      {c.symbol}
                    </span>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        color: c.price_change_percentage_24h >= 0 ? "var(--green)" : "var(--red)",
                        background:
                          c.price_change_percentage_24h >= 0
                            ? "rgba(0,212,170,0.1)"
                            : "rgba(255,71,87,0.1)",
                      }}
                    >
                      {c.price_change_percentage_24h >= 0 ? "+" : ""}
                      {c.price_change_percentage_24h?.toFixed(2)}%
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    {c.name}
                  </p>
                  <p className="text-lg font-bold mt-1" style={{ color: "var(--text-primary)" }}>
                    ${c.current_price?.toLocaleString("en-US")}
                  </p>
                </div>
              ))}
        </div>
      </section>

      {/* ETFs */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          ETFs Populares
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} />)
            : stocks.map((s, i) => (
                <div
                  key={s.ticker ?? `stock-${i}`}
                  className="rounded-xl p-4"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold" style={{ color: "var(--text-primary)" }}>
                      {s.ticker}
                    </span>
                    <span
                      className="text-sm font-semibold"
                      style={{ color: s.change_percent >= 0 ? "var(--green)" : "var(--red)" }}
                    >
                      {s.change_percent >= 0 ? "+" : ""}
                      {s.change_percent?.toFixed(2)}%
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    {s.name}
                  </p>
                  <p className="text-xl font-bold mt-1" style={{ color: "var(--text-primary)" }}>
                    ${s.price?.toLocaleString("en-US")}
                  </p>
                </div>
              ))}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Fear & Greed */}
        <section>
          <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Índice Miedo &amp; Codicia
          </h2>
          {loading ? (
            <Skeleton />
          ) : fearGreed ? (
            <div
              className="rounded-xl p-6 text-center"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <p
                className="text-6xl font-black"
                style={{ color: fearGreedColor(fearGreed.value) }}
              >
                {fearGreed.value}
              </p>
              <p className="mt-2 text-lg font-semibold" style={{ color: fearGreedColor(fearGreed.value) }}>
                {fearGreed.label}
              </p>
              <div className="mt-4 h-3 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${fearGreed.value}%`,
                    background: fearGreedColor(fearGreed.value),
                  }}
                />
              </div>
            </div>
          ) : null}
        </section>

        {/* Trending */}
        <section>
          <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            Trending 🔥
          </h2>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} />)}
            </div>
          ) : (
            <div className="space-y-3">
              {trending.map((t, i) => (
                <div
                  key={t.id ?? `trending-${i}`}
                  className="rounded-xl p-4 flex items-center gap-4"
                  style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
                >
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: "rgba(61,124,255,0.15)", color: "var(--blue)" }}
                  >
                    #{i + 1}
                  </span>
                  <div>
                    <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
                      {t.name}
                    </p>
                    <p className="text-sm uppercase" style={{ color: "var(--text-muted)" }}>
                      {t.symbol}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
