"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const TEXT   = "oklch(0.9851 0 0)";
const TEXT2  = "oklch(0.7090 0 0)";
const MUTED  = "oklch(0.5555 0 0)";
const DIM    = "oklch(0.3715 0 0)";
const CARD   = "oklch(0.2134 0 0)";
const CARD2  = "oklch(0.1448 0 0)";
const BORDER = "oklch(0.3407 0 0)";
const GREEN  = "#16c784";
const AMBER  = "#f0b429";
const RED    = "#ea3943";
const BLUE   = "#3b82f6";

const EASE: [number, number, number, number] = [0.23, 1, 0.32, 1];

const cardAnim = {
  hidden: { opacity: 0, y: 18, scale: 0.985 },
  show:   { opacity: 1, y: 0, scale: 1, transition: { duration: 0.48, ease: EASE } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

function Tag({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", fontSize: 9, fontWeight: 700,
      background: `${color}12`, border: `1px solid ${color}30`, color,
      letterSpacing: "0.08em",
    }}>
      {children}
    </span>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
      <span style={{
        width: 20, height: 20, background: CARD2, border: `1px solid ${BORDER}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 9, fontWeight: 800, color: MUTED, flexShrink: 0,
      }}>{n}</span>
      <p style={{ fontSize: 12, color: TEXT2, lineHeight: 1.55, marginTop: 2 }}>{text}</p>
    </div>
  );
}

interface BrokerCardProps {
  accentColor: string;
  badge: string;
  name: string;
  subtitle: string;
  para: string;
  comision: string;
  minimo: string;
  tiempo?: string;
  documentos?: string;
  steps: string[];
  warning?: string;
  extra?: React.ReactNode;
}

function BrokerCard({ accentColor, badge, name, subtitle, para, comision, minimo, tiempo, documentos, steps, warning, extra }: BrokerCardProps) {
  return (
    <motion.div
      variants={cardAnim}
      style={{
        background: CARD2, border: `1px solid ${BORDER}`,
        borderTop: `3px solid ${accentColor}`,
        padding: 24,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, gap: 12 }}>
        <div>
          <div style={{ marginBottom: 8 }}>
            <Tag color={accentColor}>{badge}</Tag>
          </div>
          <p style={{ fontSize: 18, fontWeight: 800, color: TEXT, letterSpacing: "-0.01em", lineHeight: 1.1 }}>{name}</p>
          <p style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{subtitle}</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 18 }}>
        {[
          { label: "Para", value: para },
          { label: "Comisión", value: comision },
          { label: "Mínimo", value: minimo },
          ...(tiempo ? [{ label: "Tiempo", value: tiempo }] : []),
          ...(documentos ? [{ label: "Documentos", value: documentos }] : []),
        ].map(({ label, value }) => (
          <div key={label} style={{ padding: "10px 12px", background: CARD, border: `1px solid ${DIM}40` }}>
            <p style={{ fontSize: 9, color: DIM, letterSpacing: "0.1em", marginBottom: 4, textTransform: "uppercase" as const }}>{label}</p>
            <p style={{ fontSize: 11, color: TEXT2, fontWeight: 500, lineHeight: 1.4 }}>{value}</p>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 10, color: MUTED, letterSpacing: "0.06em", marginBottom: 10, fontWeight: 600 }}>PASOS</p>
      <div style={{ display: "flex", flexDirection: "column" as const, gap: 8, marginBottom: warning || extra ? 16 : 0 }}>
        {steps.map((s, i) => <Step key={i} n={i + 1} text={s} />)}
      </div>

      {warning && (
        <div style={{ padding: "10px 14px", background: `${AMBER}08`, border: `1px solid ${AMBER}30`, marginTop: 14 }}>
          <p style={{ fontSize: 11, color: AMBER, lineHeight: 1.5 }}>⚠️ {warning}</p>
        </div>
      )}

      {extra}
    </motion.div>
  );
}

const FAQS = [
  {
    q: "¿Pago impuestos en Guatemala?",
    a: "Sí, las ganancias de capital pueden estar sujetas a impuestos según la SAT. Consultá con un contador local para el tratamiento correcto de tus ingresos por inversión.",
  },
  {
    q: "¿Es seguro invertir en estas plataformas?",
    a: "Binance e Interactive Brokers son plataformas reguladas con millones de usuarios. Siempre activá 2FA y retirá tus ganancias periódicamente. Nunca invertás más de lo que podés permitirte perder.",
  },
  {
    q: "¿Puedo perder más de lo que invertí?",
    a: "ETFs y crypto sin leverage: no. Tu pérdida máxima es el capital invertido. Forex y futuros con leverage (apalancamiento): sí, podés perder más que tu depósito. Por eso es fundamental practicar con demo primero.",
  },
  {
    q: "¿Puedo retirar mi dinero cuando quiera?",
    a: "Sí. Binance permite retiros en cualquier momento (con comisión de red). IBKR retira a cuenta bancaria en 1-3 días hábiles. Los brokers MT5 regulados procesan retiros en 1-5 días.",
  },
];

export default function CuentasPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [objective, setObjective] = useState<string | null>(null);

  const recommendations: Record<string, { platform: string; reason: string; color: string }> = {
    crypto:   { platform: "Binance",               reason: "Mayor liquidez, más pares disponibles, bajo costo.",             color: AMBER },
    etfs:     { platform: "Interactive Brokers",   reason: "Acceso directo a NYSE/NASDAQ, comisión $0 en ETFs.",              color: BLUE  },
    trading:  { platform: "Exness o ICMarkets",    reason: "Spreads bajos en Oro y Forex, soporte MT5 nativo.",              color: GREEN },
    todo:     { platform: "Binance + IBKR",        reason: "Binance para crypto, IBKR para acciones. Cobertura completa.",   color: MUTED },
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", fontFamily: "inherit" }}>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE }}
        style={{ marginBottom: 32 }}
      >
        <p style={{ fontSize: 10, color: GREEN, fontWeight: 700, letterSpacing: "0.2em", marginBottom: 8 }}>
          GUÍA PARA GUATEMALTECOS
        </p>
        <h1 style={{ color: TEXT, fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 10 }}>
          ¿Cómo empezar a invertir?
        </h1>
        <p style={{ color: TEXT2, fontSize: 14, lineHeight: 1.6, maxWidth: 560 }}>
          Guía para abrir tus primeras cuentas desde Guatemala. Sin tecnicismos, paso a paso.
        </p>
      </motion.div>

      {/* Broker cards */}
      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 32 }}
      >
        <BrokerCard
          accentColor={AMBER}
          badge="CRYPTO"
          name="Binance"
          subtitle="La exchange de crypto más grande del mundo"
          para="BTC, ETH, SOL, BNB y más de 350 monedas"
          comision="0.1% por operación"
          minimo="$10 USD"
          tiempo="1–3 días hábiles (KYC)"
          documentos="DPI o Pasaporte + selfie"
          steps={[
            "Entrá a binance.com → Register",
            "Verificá tu email",
            "KYC: subí tu DPI o Pasaporte + selfie",
            "Activá la autenticación 2FA (Google Authenticator)",
            "Depositá vía transferencia bancaria o tarjeta",
          ]}
        />

        <BrokerCard
          accentColor={BLUE}
          badge="ACCIONES · ETFs"
          name="Interactive Brokers"
          subtitle="El broker preferido por inversores serios"
          para="SPY, QQQ, VTI y miles de acciones americanas"
          comision="$0 para ETFs, mínimo por acción"
          minimo="$0 oficial · $100 recomendado"
          tiempo="1–5 días hábiles"
          documentos="Pasaporte + comprobante de domicilio"
          steps={[
            "Entrá a interactivebrokers.com → Open Account",
            "Elegí Individual Account",
            "Completá el formulario de apertura (30 min aprox.)",
            "Subí Pasaporte + comprobante de domicilio reciente",
            "Esperá aprobación y luego depositá por wire transfer",
          ]}
        />

        <BrokerCard
          accentColor={GREEN}
          badge="TRADING ACTIVO"
          name="Broker MT5"
          subtitle="Para Forex, Oro (XAUUSD) e índices"
          para="Forex, XAUUSD (Oro), US30, NAS100"
          comision="Spread variable (desde 0.0 pips)"
          minimo="$10 USD (Exness) · $200 (ICMarkets)"
          steps={[
            "Registrarte en el broker elegido (ver abajo)",
            "Verificar identidad y depositar",
            "Descargar MetaTrader 5",
            "Ir a Archivo → Abrir cuenta → buscar tu broker",
            "Ingresar tus credenciales y empezar",
          ]}
          warning="Practicá con cuenta demo por al menos 1 mes antes de usar dinero real. El leverage amplifica tanto ganancias como pérdidas."
          extra={
            <div style={{ marginTop: 14 }}>
              <p style={{ fontSize: 10, color: MUTED, letterSpacing: "0.06em", marginBottom: 8, fontWeight: 600 }}>BROKERS RECOMENDADOS PARA GUATEMALA</p>
              <div style={{ display: "flex", flexDirection: "column" as const, gap: 6 }}>
                {[
                  { name: "Exness",    note: "Mínimo $10 · depositar con tarjeta local · soporte 24/7" },
                  { name: "ICMarkets", note: "Spreads más bajos en Oro · mejor para scalping"           },
                  { name: "XM",       note: "Soporte en español · bonus de bienvenida disponible"       },
                ].map(b => (
                  <div key={b.name} style={{ display: "flex", gap: 10, padding: "8px 10px", background: CARD, border: `1px solid ${DIM}40` }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: GREEN, minWidth: 72 }}>{b.name}</span>
                    <span style={{ fontSize: 10, color: DIM }}>{b.note}</span>
                  </div>
                ))}
              </div>
            </div>
          }
        />
      </motion.div>

      {/* Recommender */}
      <motion.div
        variants={cardAnim}
        initial="hidden"
        animate="show"
        style={{ background: CARD, border: `1px solid ${BORDER}`, borderTop: `3px solid ${MUTED}`, padding: 24, marginBottom: 24 }}
      >
        <p style={{ fontSize: 13, fontWeight: 700, color: TEXT, marginBottom: 6, letterSpacing: "0.02em" }}>¿Cuál te conviene?</p>
        <p style={{ fontSize: 11, color: MUTED, marginBottom: 18 }}>Elegí tu objetivo principal</p>
        <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8, marginBottom: objective ? 18 : 0 }}>
          {[
            { key: "crypto",  label: "Comprar crypto"     },
            { key: "etfs",    label: "Invertir en ETFs"   },
            { key: "trading", label: "Trading activo"     },
            { key: "todo",    label: "Todo lo anterior"   },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setObjective(key === objective ? null : key)}
              style={{
                padding: "8px 16px", fontSize: 11, fontWeight: 600, cursor: "pointer",
                fontFamily: "inherit", borderRadius: 0,
                background: objective === key ? `${recommendations[key].color}15` : CARD2,
                border: `1px solid ${objective === key ? recommendations[key].color : BORDER}`,
                color: objective === key ? recommendations[key].color : MUTED,
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {objective && (
          <motion.div
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            style={{ padding: "14px 16px", background: CARD2, border: `1px solid ${recommendations[objective].color}30` }}
          >
            <p style={{ fontSize: 11, color: recommendations[objective].color, fontWeight: 700, marginBottom: 4, letterSpacing: "0.06em" }}>
              → {recommendations[objective].platform}
            </p>
            <p style={{ fontSize: 11, color: TEXT2, lineHeight: 1.55 }}>
              {recommendations[objective].reason}
            </p>
          </motion.div>
        )}
      </motion.div>

      {/* FAQ */}
      <div style={{ border: `1px solid ${BORDER}`, background: CARD2 }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${BORDER}` }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: MUTED, letterSpacing: "0.06em" }}>PREGUNTAS FRECUENTES</p>
        </div>
        {FAQS.map((faq, i) => (
          <div key={i} style={{ borderBottom: i < FAQS.length - 1 ? `1px solid ${DIM}40` : "none" }}>
            <button
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              style={{
                width: "100%", padding: "14px 20px", background: "transparent",
                border: "none", cursor: "pointer", textAlign: "left" as const,
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
                fontFamily: "inherit",
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: TEXT, lineHeight: 1.4 }}>{faq.q}</span>
              <span style={{ fontSize: 16, color: MUTED, flexShrink: 0, transform: openFaq === i ? "rotate(45deg)" : "none", transition: "transform 0.2s" }}>+</span>
            </button>
            {openFaq === i && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                style={{ padding: "0 20px 16px" }}
              >
                <p style={{ fontSize: 12, color: TEXT2, lineHeight: 1.65 }}>{faq.a}</p>
              </motion.div>
            )}
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <p style={{ fontSize: 10, color: DIM, marginTop: 20, lineHeight: 1.6, letterSpacing: "0.04em" }}>
        Esta guía es informativa. No constituye asesoramiento financiero. Invertir conlleva riesgos. Investigá antes de tomar decisiones.
      </p>
    </div>
  );
}
