"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";

// El /login se muestra a pantalla completa, sin sidebar. El resto del panel
// va dentro del shell con la navegación lateral.
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 px-6 py-8 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}
