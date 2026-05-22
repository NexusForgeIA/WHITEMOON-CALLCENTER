"use client";

import { AGENTES } from "@/lib/agentes";
import type { Agente } from "@/lib/types";

export type AgenteFiltro = Agente | "all";

export function AgenteFilter({
  value,
  onChange,
}: {
  value: AgenteFiltro;
  onChange: (v: AgenteFiltro) => void;
}) {
  const base =
    "rounded-full px-3 py-1.5 text-xs font-medium transition-colors";
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange("all")}
        className={`${base} ${
          value === "all"
            ? "bg-p/20 text-text"
            : "bg-white/[0.04] text-muted hover:text-text"
        }`}
      >
        Todos
      </button>
      {AGENTES.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={() => onChange(a.id)}
          className={`${base} ${
            value === a.id
              ? "text-text"
              : "bg-white/[0.04] text-muted hover:text-text"
          }`}
          style={value === a.id ? { backgroundColor: `${a.color}26` } : undefined}
        >
          <span
            className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle"
            style={{ backgroundColor: a.color }}
          />
          {a.label}
        </button>
      ))}
    </div>
  );
}
