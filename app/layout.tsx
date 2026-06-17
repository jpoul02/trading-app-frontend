import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "./components/Sidebar";

export const metadata: Metadata = {
  title: "TradeLearn",
  description: "Aprende a invertir de forma inteligente",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark h-full">
      <body className="h-full" style={{ background: "var(--bg-primary)" }}>
        <Sidebar />
        <main className="ml-60 min-h-screen p-6" style={{ background: "var(--bg-primary)" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
