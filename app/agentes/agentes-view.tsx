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
// Barra superior: clasificación en vivo (compacta, sin tapar la escena 3D)
// ---------------------------------------------------------------------------

function BarraRanking({
  ranking,
  selected,
  onSelect,
}: {
  ranking: AgenteRanked[];
  selected: Agente | null;
  onSelect: (id: Agente) => void;
}) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-border bg-card/60 px-2 py-1.5 backdrop-blur-sm">
      <div className="flex shrink-0 items-center gap-1.5 pl-1 pr-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-g opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-g" />
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
          En vivo
        </span>
      </div>

      {ranking.map((a, i) => {
        const activo = selected === a.id;
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onSelect(a.id)}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-1.5 transition-colors ${
              activo ? "bg-white/[0.07]" : "hover:bg-white/[0.04]"
            }`}
          >
            <span className="w-4 text-center text-xs tabular-nums">
              {i < 3 ? MEDALLAS[i] : a.posicion}
            </span>
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: a.color }}
            />
            <span className="text-sm font-medium leading-none">{a.nombre}</span>
            <span className="text-xs tabular-nums text-muted">{a.score}</span>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Leyenda de estados (centrada, debajo del Canvas)
// ---------------------------------------------------------------------------

function LeyendaEstados() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px]">
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
// Panel de stats: fila horizontal de 6 cards (una por agente)
// ---------------------------------------------------------------------------

function CardAgente({
  agente,
  activo,
  onSelect,
}: {
  agente: AgenteRanked;
  activo: boolean;
  onSelect: (id: Agente) => void;
}) {
  const est = ESTADO_ANIM[agente.estadoLive];
  return (
    <button
      type="button"
      onClick={() => onSelect(agente.id)}
      className="rounded-xl border border-border bg-card p-3 text-left transition-colors hover:border-p/40"
      style={{ borderColor: activo ? `${agente.color}80` : undefined }}
    >
      <div className="flex items-center gap-2">
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-base"
          style={{ backgroundColor: `${agente.color}1f` }}
        >
          {agente.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <span className="truncate text-sm font-medium leading-tight">
              {agente.nombre}
            </span>
            <span className="shrink-0 text-[10px] text-muted">
              #{agente.posicion}
            </span>
          </div>
          <p className="truncate text-[11px] text-muted">{agente.sector}</p>
        </div>
      </div>

      <span
        className="mt-2.5 flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px]"
        style={{ backgroundColor: `${est.color}1f`, color: est.color }}
      >
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: est.color }}
        />
        {est.label}
      </span>

      <div className="mt-2.5 flex items-end justify-between">
        <div>
          <p className="text-xl font-semibold leading-none tabular-nums">
            {agente.score}
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-muted">
            Score
          </p>
        </div>
        <div className="flex gap-3 text-right">
          <div>
            <p className="text-sm font-semibold leading-none tabular-nums">
              {agente.stats.llamadas}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-muted">
              Llam.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold leading-none tabular-nums text-g">
              {agente.stats.citas}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-muted">
              Citas
            </p>
          </div>
        </div>
      </div>
    </button>
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
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {ranking.map((a) => (
        <CardAgente
          key={a.id}
          agente={a}
          activo={selected === a.id}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vista principal: dos bloques verticales (oficina 3D arriba, stats abajo)
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
    <div className="space-y-4">
      <BarraRanking ranking={ranking} selected={selected} onSelect={setSelected} />

      <div className="h-[clamp(460px,60vh,820px)] w-full overflow-hidden rounded-2xl border border-border bg-card/30">
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
      </div>

      <LeyendaEstados />

      <PanelStats ranking={ranking} selected={selected} onSelect={setSelected} />
    </div>
  );
}
