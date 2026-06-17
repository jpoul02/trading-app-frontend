import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { LayoutClient } from "./components/LayoutClient";

const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: 'JOTAPOL Trading App',
  description: 'Plataforma de inversión y trading educativo — JOTAPOL',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`dark h-full ${geistMono.variable}`}>
      <body className="h-full">
        <LayoutClient>{children}</LayoutClient>
      </body>
    </html>
  );
}
