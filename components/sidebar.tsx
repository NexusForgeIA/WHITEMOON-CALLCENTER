"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, PhoneCall, ListChecks } from "lucide-react";
import { AGENTES } from "@/lib/agentes";

const NAV = [
  { href: "/", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/agentes", label: "Agentes", Icon: Users },
  { href: "/llamadas", label: "Llamadas", Icon: PhoneCall },
  { href: "/prospectos", label: "Prospectos", Icon: ListChecks },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col gap-8 border-r border-border bg-card/40 px-5 py-7">
      {/* Marca */}
      <div className="flex items-center gap-3 px-1">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-p/15 text-lg">
          🌙
        </span>
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight">WhiteMoon</p>
          <p className="text-xs text-muted">Call Center IA</p>
        </div>
      </div>

      {/* Navegación principal */}
      <nav className="flex flex-col gap-1">
        {NAV.map(({ href, label, Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-p/15 text-text"
                  : "text-muted hover:bg-white/[0.03] hover:text-text"
              }`}
            >
              <Icon className={`h-4 w-4 ${active ? "text-p2" : ""}`} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Acceso rápido por agente */}
      <div className="flex flex-col gap-2">
        <p className="px-3 text-[11px] font-medium uppercase tracking-wider text-muted">
          Agentes
        </p>
        <div className="flex flex-col gap-1">
          {AGENTES.map((a) => (
            <Link
              key={a.id}
              href={`/agentes?agente=${a.id}`}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:bg-white/[0.03] hover:text-text"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: a.color }}
              />
              {a.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-auto px-3 text-[11px] text-muted">Panel · v0.1</div>
    </aside>
  );
}
