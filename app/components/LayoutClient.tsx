"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import { MarketActivityProvider } from "../context/MarketActivityContext";

export function LayoutClient({ children }: Readonly<{ children: React.ReactNode }>) {
  const [open, setOpen] = useState(false);

  return (
    <MarketActivityProvider>
      {/* Hamburger — only visible ≤900px via CSS */}
      <button
        className="hamburger-btn"
        onClick={() => setOpen(v => !v)}
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
      >
        {open ? "✕" : "☰"}
      </button>

      {/* Dark overlay — click to close */}
      {open && (
        <div
          className="sidebar-overlay"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar open={open} onClose={() => setOpen(false)} />

      <main className="main-content">
        {children}
      </main>
    </MarketActivityProvider>
  );
}
