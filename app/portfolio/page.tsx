"use client";

import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

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

const COLORS = ["#00d4aa", "#3d7cff", "#ff4757", "#ffd32a", "#ff6b35", "#7c3aed", "#10b981", "#f59e0b"];

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<PortfolioSummary>({
    total_value: 0,
    total_gain: 0,
    total_gain_percent: 0,
    positions: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [symbol, setSymbol] = useState("");
  const [quantity, setQuantity] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [type, setType] = useState("crypto");
  const [adding, setAdding] = useState(false);

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
        body: JSON.stringify({
          symbol: symbol.toUpperCase(),
          quantity: Number(quantity),
          buy_price: Number(buyPrice),
          type,
        }),
      });
      setSymbol("");
      setQuantity("");
      setBuyPrice("");
      fetchPortfolio();
    } catch {
      // silently fail
    } finally {
      setAdding(false);
    }
  }

  async function deletePosition(id: string) {
    try {
      await fetch(`http://localhost:8000/api/portfolio/${id}`, { method: "DELETE" });
      fetchPortfolio();
    } catch {
      // silently fail
    }
  }

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const pieData = (portfolio?.positions ?? []).map((p) => ({
    name: p.symbol,
    value: p.quantity * p.current_price,
  }));

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6" style={{ color: "var(--text-primary)" }}>
        💼 Portafolio Simulado
      </h1>

      {error && (
        <div
          className="mb-6 p-4 rounded-xl flex items-center justify-between"
          style={{ background: "rgba(255,71,87,0.1)", border: "1px solid var(--red)" }}
        >
          <span style={{ color: "var(--red)" }}>No se pudieron cargar los datos</span>
          <button
            onClick={fetchPortfolio}
            className="px-4 py-1.5 rounded-lg text-sm font-medium cursor-pointer"
            style={{ background: "var(--red)", color: "#fff" }}
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Summary */}
      {(portfolio?.positions ?? []).length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Valor Total", value: `$${portfolio.total_value.toLocaleString("en-US")}`, color: "var(--text-primary)" },
            {
              label: "Ganancia Total",
              value: `${portfolio.total_gain >= 0 ? "+" : ""}$${portfolio.total_gain.toLocaleString("en-US")}`,
              color: portfolio.total_gain >= 0 ? "var(--green)" : "var(--red)",
            },
            {
              label: "Rendimiento",
              value: `${portfolio.total_gain_percent >= 0 ? "+" : ""}${portfolio.total_gain_percent?.toFixed(2)}%`,
              color: portfolio.total_gain_percent >= 0 ? "var(--green)" : "var(--red)",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl p-4 text-center"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>
                {item.label}
              </p>
              <p className="text-xl font-bold" style={{ color: item.color }}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Add position form */}
      <div
        className="rounded-xl p-5 mb-6"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Agregar Posición
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>
              Símbolo
            </label>
            <input
              type="text"
              placeholder="BTC, AAPL, SPY..."
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none uppercase"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>
              Cantidad
            </label>
            <input
              type="number"
              placeholder="0.5"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>
              Precio de compra ($)
            </label>
            <input
              type="number"
              placeholder="40000"
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            />
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: "var(--text-muted)" }}>
              Tipo
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
              }}
            >
              <option value="crypto">Cripto</option>
              <option value="stock">Acción</option>
              <option value="etf">ETF</option>
            </select>
          </div>
        </div>
        <button
          onClick={addPosition}
          disabled={adding || !symbol || !quantity || !buyPrice}
          className="px-5 py-2 rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-40"
          style={{ background: "var(--blue)", color: "#fff" }}
        >
          {adding ? "Agregando..." : "Agregar Posición"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Table */}
        <div className="md:col-span-2">
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["Símbolo", "Cantidad", "P. Compra", "P. Actual", "P&L $", "P&L %", ""].map((h) => (
                    <th
                      key={h}
                      className={`px-3 py-3 ${h === "" ? "" : "text-left"}`}
                      style={{ color: "var(--text-muted)" }}
                    >
                      {h}
                    </th>
                  ))}
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
                ) : (portfolio?.positions ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8" style={{ color: "var(--text-muted)" }}>
                      Sin posiciones. Agrega una arriba.
                    </td>
                  </tr>
                ) : (
                  (portfolio?.positions ?? []).map((p, i) => (
                    <tr
                      key={p.id}
                      style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined }}
                    >
                      <td className="px-3 py-3">
                        <div>
                          <p className="font-bold" style={{ color: "var(--text-primary)" }}>
                            {p.symbol}
                          </p>
                          <p className="text-xs capitalize" style={{ color: "var(--text-muted)" }}>
                            {p.type}
                          </p>
                        </div>
                      </td>
                      <td className="px-3 py-3" style={{ color: "var(--text-muted)" }}>
                        {p.quantity}
                      </td>
                      <td className="px-3 py-3" style={{ color: "var(--text-muted)" }}>
                        ${p.buy_price.toLocaleString("en-US")}
                      </td>
                      <td className="px-3 py-3" style={{ color: "var(--text-primary)" }}>
                        ${p.current_price.toLocaleString("en-US")}
                      </td>
                      <td
                        className="px-3 py-3 font-semibold"
                        style={{ color: p.pnl >= 0 ? "var(--green)" : "var(--red)" }}
                      >
                        {p.pnl >= 0 ? "+" : ""}${p.pnl.toFixed(2)}
                      </td>
                      <td
                        className="px-3 py-3 font-semibold"
                        style={{ color: p.pnl_percent >= 0 ? "var(--green)" : "var(--red)" }}
                      >
                        {p.pnl_percent >= 0 ? "+" : ""}
                        {p.pnl_percent?.toFixed(2)}%
                      </td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => deletePosition(p.id)}
                          className="text-xs px-2 py-1 rounded cursor-pointer"
                          style={{ background: "rgba(255,71,87,0.12)", color: "var(--red)" }}
                        >
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

        {/* Pie Chart */}
        <div
          className="rounded-xl p-4"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-muted)" }}>
            Distribución
          </h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val) => [`$${Number(val).toLocaleString("en-US")}`, ""]}
                  contentStyle={{
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    color: "var(--text-primary)",
                  }}
                />
                <Legend
                  formatter={(value) => (
                    <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div
              className="flex items-center justify-center h-40 text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              Sin posiciones
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
