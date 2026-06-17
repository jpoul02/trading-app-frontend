"use client";

import { useState, useEffect } from "react";

export function HamburgerToggle() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("sidebar-open", open);
    return () => { document.body.classList.remove("sidebar-open"); };
  }, [open]);

  return (
    <>
      <button
        className="hamburger-btn"
        onClick={() => setOpen(v => !v)}
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
      >
        {open ? "✕" : "☰"}
      </button>

      {/* Overlay — click to close */}
      <div
        className="sidebar-overlay"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />
    </>
  );
}
