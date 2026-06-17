const platforms = [
  {
    name: "eToro",
    description: "Plataforma de social trading. Copia las carteras de traders exitosos automáticamente.",
    pros: [
      "Ideal para principiantes",
      "CopyTrader: replica portafolios reales",
      "Interfaz muy intuitiva",
      "Acciones, ETFs y cripto en un solo lugar",
    ],
    cons: [
      "Spreads más altos que competidores",
      "Retiro tiene fee de $5",
      "Sin acceso a mercados emergentes",
    ],
    guatemala: true,
    minimum: "$50",
    assets: "Acciones + ETFs + Cripto",
    fee: "Spread ~1%",
    url: "www.etoro.com",
  },
  {
    name: "Interactive Brokers",
    description: "Bróker global profesional con acceso a prácticamente todos los mercados del mundo.",
    pros: [
      "Comisiones bajísimas (desde $0)",
      "Acceso a 135+ mercados globales",
      "Herramientas profesionales",
      "Opciones y futuros disponibles",
    ],
    cons: [
      "Curva de aprendizaje alta",
      "Interfaz compleja para principiantes",
      "Inactividad fee si <$100K en cuenta",
    ],
    guatemala: true,
    minimum: "$0",
    assets: "Acciones + ETFs + Opciones + Bonos",
    fee: "Desde $0",
    url: "www.interactivebrokers.com",
  },
  {
    name: "Binance",
    description: "El exchange de criptomonedas más grande del mundo por volumen.",
    pros: [
      "Fees muy bajos (0.1% spot)",
      "Mayor liquidez en cripto",
      "Staking y DeFi integrado",
      "Más de 350 criptomonedas",
    ],
    cons: [
      "Solo criptomonedas",
      "Regulación incierta en algunos países",
      "Interfaz puede abrumar al principiante",
    ],
    guatemala: true,
    minimum: "Muy bajo",
    assets: "Solo Cripto",
    fee: "0.1% spot",
    url: "www.binance.com",
    note: "Acceso vía Latamex",
  },
  {
    name: "Coinbase",
    description: "El exchange de cripto más regulado y confiable de Estados Unidos.",
    pros: [
      "Muy fácil de usar",
      "Alta seguridad y regulación",
      "Ideal para primeros pasos en cripto",
      "Coinbase Earn: aprende y gana",
    ],
    cons: [
      "Fees más altos que Binance",
      "Menos opciones de criptomonedas",
      "Sin acceso a trading avanzado básico",
    ],
    guatemala: true,
    minimum: "Muy bajo",
    assets: "Solo Cripto",
    fee: "~1.49% transacción",
    url: "www.coinbase.com",
  },
];

export default function PlatformsPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Plataformas de Inversión
        </h1>
        <p className="mt-1" style={{ color: "var(--text-muted)" }}>
          Comparativa de las mejores plataformas disponibles desde Guatemala.
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">
        {platforms.map((p) => (
          <div
            key={p.name}
            className="rounded-xl p-5"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>
                    {p.name}
                  </h2>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      background: p.guatemala ? "rgba(0,212,170,0.12)" : "rgba(255,71,87,0.12)",
                      color: p.guatemala ? "var(--green)" : "var(--red)",
                    }}
                  >
                    {p.guatemala ? "✓ Disponible Guatemala" : "✗ No disponible"}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
              {p.description}
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
              <div className="rounded-lg p-2" style={{ background: "var(--bg-secondary)" }}>
                <p style={{ color: "var(--text-muted)" }}>Mínimo</p>
                <p className="font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>{p.minimum}</p>
              </div>
              <div className="rounded-lg p-2" style={{ background: "var(--bg-secondary)" }}>
                <p style={{ color: "var(--text-muted)" }}>Comisión</p>
                <p className="font-semibold mt-0.5" style={{ color: "var(--text-primary)" }}>{p.fee}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <p className="text-xs font-semibold mb-1.5" style={{ color: "var(--green)" }}>
                  Pros
                </p>
                <ul className="space-y-1">
                  {p.pros.map((pro) => (
                    <li key={pro} className="text-xs flex items-start gap-1.5" style={{ color: "var(--text-muted)" }}>
                      <span style={{ color: "var(--green)" }}>+</span> {pro}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold mb-1.5" style={{ color: "var(--red)" }}>
                  Contras
                </p>
                <ul className="space-y-1">
                  {p.cons.map((con) => (
                    <li key={con} className="text-xs flex items-start gap-1.5" style={{ color: "var(--text-muted)" }}>
                      <span style={{ color: "var(--red)" }}>−</span> {con}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                <span className="font-medium" style={{ color: "var(--blue)" }}>Activos:</span> {p.assets}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                <span className="font-medium" style={{ color: "var(--blue)" }}>Web:</span> {p.url}
                {p.note && <span className="ml-2 italic">({p.note})</span>}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Comparison table */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          Tabla Comparativa
        </h2>
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                {["Plataforma", "Tipo Activos", "Mínimo", "Guatemala", "Facilidad"].map((h) => (
                  <th key={h} className="text-left px-4 py-3" style={{ color: "var(--text-muted)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { name: "eToro", assets: "Acc + ETF + Cripto", min: "$50", gt: true, ease: "⭐⭐⭐⭐⭐" },
                { name: "Interactive Brokers", assets: "Acc + ETF + Opc", min: "$0", gt: true, ease: "⭐⭐⭐" },
                { name: "Binance", assets: "Solo Cripto", min: "Muy bajo", gt: true, ease: "⭐⭐⭐⭐" },
                { name: "Coinbase", assets: "Solo Cripto", min: "Muy bajo", gt: true, ease: "⭐⭐⭐⭐⭐" },
              ].map((row, i) => (
                <tr
                  key={row.name}
                  style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined }}
                >
                  <td className="px-4 py-3 font-semibold" style={{ color: "var(--text-primary)" }}>
                    {row.name}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--text-muted)" }}>
                    {row.assets}
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--text-muted)" }}>
                    {row.min}
                  </td>
                  <td className="px-4 py-3">
                    <span style={{ color: row.gt ? "var(--green)" : "var(--red)" }}>
                      {row.gt ? "✓ Sí" : "✗ No"}
                    </span>
                  </td>
                  <td className="px-4 py-3">{row.ease}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recommendation */}
      <div
        className="rounded-xl p-5"
        style={{ background: "rgba(0,212,170,0.06)", border: "1px solid rgba(0,212,170,0.3)" }}
      >
        <h3 className="font-bold text-lg mb-2" style={{ color: "var(--green)" }}>
          💡 Recomendación
        </h3>
        <ul className="space-y-1.5 text-sm" style={{ color: "var(--text-muted)" }}>
          <li>
            <span className="font-medium" style={{ color: "var(--text-primary)" }}>Empezando con poco capital →</span>{" "}
            eToro o Coinbase. Interfaz simple, sin complejidad.
          </li>
          <li>
            <span className="font-medium" style={{ color: "var(--text-primary)" }}>Solo cripto →</span>{" "}
            Binance por fees bajos, Coinbase por seguridad y simplicidad.
          </li>
          <li>
            <span className="font-medium" style={{ color: "var(--text-primary)" }}>Inversor serio largo plazo →</span>{" "}
            Interactive Brokers. Acceso global, comisiones mínimas.
          </li>
        </ul>
      </div>
    </div>
  );
}
