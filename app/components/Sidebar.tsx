"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Sprout,
  BarChart2,
  GraduationCap,
  Briefcase,
  Building2,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/passive", label: "Inversión Pasiva", icon: Sprout },
  { href: "/markets", label: "Mercados", icon: BarChart2 },
  { href: "/learn", label: "Aprende", icon: GraduationCap },
  { href: "/portfolio", label: "Portafolio", icon: Briefcase },
  { href: "/platforms", label: "Plataformas", icon: Building2 },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="fixed top-0 left-0 h-full w-60 flex flex-col z-50"
      style={{ background: "#0d1526", borderRight: "1px solid var(--border)" }}
    >
      <div className="p-6 pb-4">
        <span className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>
          📈 TradeLearn
        </span>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                color: active ? "var(--green)" : "var(--text-muted)",
                background: active ? "rgba(0,212,170,0.08)" : "transparent",
              }}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
