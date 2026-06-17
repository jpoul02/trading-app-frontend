"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { LiveBadge } from "../components/LiveBadge";
import api from "@/lib/api";

interface CryptoPrice {
  id?: string;
  symbol?: string;
  name?: string;
  current_price?: number;
  price_change_percentage_24h?: number;
  market_cap?: number;
  image?: string;
  rank?: number;
}

interface Stock {
  ticker?: string;
  symbol?: string;
  name?: string;
  price?: number;
  change_pct_24h?: number;
  change_percent?: number;
}

function Skeleton({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          <td colSpan={5} className="py-2">
            <div className="animate-pulse h-10 rounded-lg" style={{ background: "var(--bg-card)" }} />
          </td>
        </tr>
      ))}
    </>
  );
}

export default function MarketsPage() {
  const [tab, setTab] = useState<"crypto" | "stocks">("crypto");
  const [cryptos, setCryptos] = useState<CryptoPrice[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  async function fetchData(silent = false) {
    if (!silent) { setLoading(true); setError(false); }
    try {
      const [cRes, sRes] = await Promise.all([
        api.get('/api/market/prices'),
        api.get('/api/market/stocks'),
      ]);
      const [cData, sData] = [cRes.data, sRes.data];
      setCryptos(cData);
      setStocks(sData);
      setLastUpdated(new Date());
      setError(false);
    } catch {
      if (!silent) setError(true);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 60_000);
    return () => clearInterval(interval);
  }, []);

  const query = search.toLowerCase();

  const filteredCryptos = cryptos.filter(
    (c) =>
      (c.name ?? c.symbol ?? "").toLowerCase().includes(query) ||
      (c.symbol ?? "").toLowerCase().includes(query)
  );

  const filteredStocks = stocks.filter(
    (s) =>
      (s.name ?? s.ticker ?? s.symbol ?? "").toLowerCase().includes(query) ||
      (s.ticker ?? s.symbol ?? "").toLowerCase().includes(query)
  );

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Mercados
        </h1>
        <div className="flex items-center gap-3">
          <LiveBadge lastUpdated={lastUpdated} />
          <button
            onClick={() => fetchData()}
            className="px-4 py-2 rounded-lg text-sm font-medium cursor-pointer flex items-center gap-2"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-muted)" }}
          >
            ↻ Actualizar
          </button>
        </div>
      </div>

      {error && (
        <div
          className="mb-6 p-4 rounded-xl flex items-center justify-between"
          style={{ background: "rgba(255,71,87,0.1)", border: "1px solid var(--red)" }}
        >
          <span style={{ color: "var(--red)" }}>No se pudieron cargar los datos</span>
          <button
            onClick={() => fetchData()}
            className="px-4 py-1.5 rounded-lg text-sm font-medium cursor-pointer"
            style={{ background: "var(--red)", color: "#fff" }}
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Tabs + Search */}
      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "var(--bg-card)" }}>
          {(["crypto", "stocks"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setSearch(""); }}
              className="px-4 py-1.5 rounded-md text-sm font-medium cursor-pointer transition-colors"
              style={{
                background: tab === t ? "var(--blue)" : "transparent",
                color: tab === t ? "#fff" : "var(--text-muted)",
              }}
            >
              {t === "crypto" ? "Cripto" : "Acciones & ETFs"}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm outline-none flex-1 max-w-xs"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
        />
      </div>

      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {tab === "crypto" ? (
                <>
                  <th className="text-left px-4 py-3" style={{ color: "var(--text-muted)" }}>#</th>
                  <th className="text-left px-4 py-3" style={{ color: "var(--text-muted)" }}>Nombre</th>
                  <th className="text-right px-4 py-3" style={{ color: "var(--text-muted)" }}>Precio</th>
                  <th className="text-right px-4 py-3" style={{ color: "var(--text-muted)" }}>24h %</th>
                  <th className="text-right px-4 py-3" style={{ color: "var(--text-muted)" }}>Market Cap</th>
                </>
              ) : (
                <>
                  <th className="text-left px-4 py-3" style={{ color: "var(--text-muted)" }}>Ticker</th>
                  <th className="text-left px-4 py-3" style={{ color: "var(--text-muted)" }}>Nombre</th>
                  <th className="text-right px-4 py-3" style={{ color: "var(--text-muted)" }}>Precio</th>
                  <th className="text-right px-4 py-3" style={{ color: "var(--text-muted)" }}>Cambio %</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <Skeleton rows={8} />
            ) : tab === "crypto" ? (
              filteredCryptos.map((c, i) => (
                <tr
                  key={c.id ?? c.symbol ?? `crypto-${i}`}
                  style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined }}
                >
                  <td className="px-4 py-3" style={{ color: "var(--text-muted)" }}>
                    {c.rank ?? i + 1}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {c.image && (
                        <Image
                          src={c.image}
                          alt={c.name ?? ""}
                          width={24}
                          height={24}
                          className="rounded-full"
                          unoptimized
                        />
                      )}
                      <div>
                        <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
                          {c.name}
                        </p>
                        <p className="text-xs uppercase" style={{ color: "var(--text-muted)" }}>
                          {c.symbol}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="text-right px-4 py-3 font-semibold" style={{ color: "var(--text-primary)" }}>
                    ${c.current_price?.toLocaleString("en-US")}
                  </td>
                  <td
                    className="text-right px-4 py-3 font-semibold"
                    style={{ color: (c.price_change_percentage_24h ?? 0) >= 0 ? "var(--green)" : "var(--red)" }}
                  >
                    {(c.price_change_percentage_24h ?? 0) >= 0 ? "+" : ""}
                    {c.price_change_percentage_24h?.toFixed(2)}%
                  </td>
                  <td className="text-right px-4 py-3" style={{ color: "var(--text-muted)" }}>
                    ${((c.market_cap ?? 0) / 1e9).toFixed(1)}B
                  </td>
                </tr>
              ))
            ) : (
              filteredStocks.map((s, i) => (
                <tr
                  key={s.ticker ?? s.symbol ?? `stock-${i}`}
                  style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined }}
                >
                  <td className="px-4 py-3 font-bold" style={{ color: "var(--blue)" }}>
                    {s.ticker ?? s.symbol}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--text-primary)" }}>
                    {s.name}
                  </td>
                  <td className="text-right px-4 py-3 font-semibold" style={{ color: "var(--text-primary)" }}>
                    ${s.price?.toLocaleString("en-US")}
                  </td>
                  <td
                    className="text-right px-4 py-3 font-semibold"
                    style={{ color: (s.change_pct_24h ?? s.change_percent ?? 0) >= 0 ? "var(--green)" : "var(--red)" }}
                  >
                    {(s.change_pct_24h ?? s.change_percent ?? 0) >= 0 ? "+" : ""}
                    {s.change_pct_24h ?? s.change_percent?.toFixed(2)}%
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
