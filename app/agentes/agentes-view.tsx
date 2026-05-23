"use client";

import { useEffect, useState } from "react";
import { AgentesOffice3D } from "@/components/AgentesOffice3D";
import type { AgenteRanked } from "@/lib/ranking";
import type { Agente, EstadoAnim } from "@/lib/types";

const ESTADO_ANIM: Record<EstadoAnim, { label: string; color: string }> = {
  disponible: { label: "Disponible", color: "#8888a0" },
  llamando: { label: "Llamando", color: "#4da8ff" },
  tramitando: { label: "Tramitando", color: "#9d70ff" },
  celebrando: { label: "Celebrando", color: "#00d4aa" },
};

const MEDALLAS = ["🥇", "🥈", "🥉"];

// ---------------------------------------------------------------------------
// Overlay: pantalla de clasificación en vivo
// ---------------------------------------------------------------------------

function PantallaRanking({
  ranking,
  selected,
  onSelect,
}: {
  ranking: AgenteRanked[];
  selected: Agente | null;
  onSelect: (id: Agente) => void;
}) {
  const maxScore = Math.max(...ranking.map((r) => r.score), 1);

  return (
    <div className="pointer-events-auto absolute left-3 top-3 w-[clamp(240px,32vw,320px)] rounded-xl border border-p/30 bg-bg/70 p-4 shadow-[0_0_40px_-12px_rgba(124,77,255,0.5)] backdrop-blur-md">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-g opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-g" />
        </span>
        <h2 className="text-sm font-semibold tracking-tight">
          Clasificación en vivo
        </h2>
      </div>

      <ol className="mt-3 space-y-1.5">
        {ranking.map((a, i) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => onSelect(a.id)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors ${
                selected === a.id ? "bg-white/[0.07]" : "hover:bg-white/[0.04]"
              }`}
            >
              <span className="w-5 shrink-0 text-center text-sm tabular-nums">
                {i < 3 ? MEDALLAS[i] : a.posicion}
              </span>
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: a.color }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium">{a.nombre}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted">
                    {a.score}
                  </span>
                </div>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(a.score / maxScore) * 100}%`,
                      backgroundColor: a.color,
                    }}
                  />
                </div>
              </div>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

function LeyendaEstados() {
  return (
    <div className="pointer-events-none absolute bottom-3 right-3 flex flex-wrap justify-end gap-x-3 gap-y-1 rounded-lg border border-border bg-bg/60 px-3 py-2 text-[11px] backdrop-blur-md">
      {(Object.keys(ESTADO_ANIM) as EstadoAnim[]).map((e) => (
        <span key={e} className="flex items-center gap-1.5 text-muted">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: ESTADO_ANIM[e].color }}
          />
          {ESTADO_ANIM[e].label}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel lateral con stats por agente
// ---------------------------------------------------------------------------

function StatMini({
  valor,
  etiqueta,
  color,
}: {
  valor: number;
  etiqueta: string;
  color?: string;
}) {
  return (
    <div className="rounded-md bg-white/[0.03] py-1.5 text-center">
      <p
        className="text-base font-semibold tabular-nums"
        style={color ? { color } : undefined}
      >
        {valor}
      </p>
      <p className="text-[10px] uppercase tracking-wider text-muted">{etiqueta}</p>
    </div>
  );
}

function PanelStats({
  ranking,
  selected,
  onSelect,
}: {
  ranking: AgenteRanked[];
  selected: Agente | null;
  onSelect: (id: Agente) => void;
}) {
  return (
    <aside className="space-y-3">
      {ranking.map((a) => {
        const est = ESTADO_ANIM[a.estadoLive];
        const activo = selected === a.id;
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onSelect(a.id)}
            className={`w-full rounded-xl border bg-card/50 p-4 text-left transition-colors ${
              activo ? "bg-card" : "hover:bg-card"
            }`}
            style={{ borderColor: activo ? `${a.color}80` : undefined }}
          >
            <div className="flex items-center gap-3">
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg"
                style={{ backgroundColor: `${a.color}1f` }}
              >
                {a.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium leading-tight">
                    {a.nombre}
                  </span>
                  <span className="shrink-0 text-xs text-muted">#{a.posicion}</span>
                </div>
                <p className="truncate text-xs text-muted">{a.sector}</p>
              </div>
              <span
                className="flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px]"
                style={{ backgroundColor: `${est.color}1f`, color: est.color }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: est.color }}
                />
                {est.label}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              <StatMini valor={a.stats.llamadas} etiqueta="Llam." />
              <StatMini valor={a.stats.contactos} etiqueta="Cont." color="#4da8ff" />
              <StatMini valor={a.stats.citas} etiqueta="Citas" color="#00d4aa" />
              <StatMini valor={a.stats.cierres} etiqueta="Cierres" color="#ffce54" />
            </div>
          </button>
        );
      })}
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Vista principal: oficina 3D + overlays
// ---------------------------------------------------------------------------

export function AgentesView({
  ranking,
  seleccionadoInicial = null,
}: {
  ranking: AgenteRanked[];
  seleccionadoInicial?: Agente | null;
}) {
  const [selected, setSelected] = useState<Agente | null>(seleccionadoInicial);
  const [mounted, setMounted] = useState(false);

  // El Canvas (WebGL) solo se monta en cliente para evitar SSR/hidratación.
  useEffect(() => setMounted(true), []);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="relative h-[clamp(440px,62vh,680px)] overflow-hidden rounded-2xl border border-border bg-card/30">
        {mounted ? (
          <AgentesOffice3D
            ranking={ranking}
            selected={selected}
            onSelect={setSelected}
          />
        ) : (
          <div className="grid h-full place-items-center text-sm text-muted">
            Cargando oficina 3D…
          </div>
        )}

        <PantallaRanking
          ranking={ranking}
          selected={selected}
          onSelect={setSelected}
        />
        <LeyendaEstados />
      </div>

      <PanelStats ranking={ranking} selected={selected} onSelect={setSelected} />
    </div>
  );
}
