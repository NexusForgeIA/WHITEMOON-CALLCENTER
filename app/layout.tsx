import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "WhiteMoon · Call Center IA",
  description: "Panel de gestión del call center IA de WhiteMoon",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={sora.variable}>
      <body className="min-h-screen antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
