"use client";
import { useEffect, useState } from "react";

interface LiveBadgeProps {
  lastUpdated: Date | null;
}

export function LiveBadge({ lastUpdated }: LiveBadgeProps) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 10_000);
    return () => clearInterval(t);
  }, []);

  const elapsed = lastUpdated
    ? Math.floor((Date.now() - lastUpdated.getTime()) / 1000)
    : null;

  const label =
    elapsed === null
      ? "EN VIVO"
      : elapsed < 60
      ? `Actualizado hace ${elapsed}s`
      : `Actualizado hace ${Math.floor(elapsed / 60)}m`;

  return (
    <>
      <style>{`
        @keyframes livePulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(0.7); }
        }
        .live-badge-dot { animation: livePulse 2s ease-in-out infinite; }
      `}</style>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 10px",
          background: "rgba(0,212,170,0.08)",
          border: "1px solid rgba(0,212,170,0.2)",
          borderRadius: 8,
        }}
      >
        <span
          className="live-badge-dot"
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "var(--green)",
            display: "inline-block",
            flexShrink: 0,
          }}
        />
        <span style={{ fontSize: 11, color: "var(--green)", fontWeight: 600 }}>
          {label}
        </span>
      </div>
    </>
  );
}
