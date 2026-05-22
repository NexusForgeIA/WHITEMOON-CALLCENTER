"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, ChevronDown, CalendarCheck, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/badge";
import { AgenteFilter, type AgenteFiltro } from "@/components/agente-filter";
import { AGENTE_MAP } from "@/lib/agentes";
import {
  CALL_ESTADO,
  CALL_ESTADO_ORDER,
  PIPELINE_ESTADO,
} from "@/lib/labels";
import { formatDateTime, formatDuration } from "@/lib/format";
import type { CallCenterCall, CallEstado } from "@/lib/types";

export default function LlamadasPage() {
  const [calls, setCalls] = useState<CallCenterCall[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [agente, setAgente] = useState<AgenteFiltro>("all");
  const [estado, setEstado] = useState<CallEstado | "all">("all");
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("call_center_calls")
        .select("*")
        .order("created_at", { ascending: false });
      if (!active) return;
      if (error) setError(error.message);
      else setCalls((data ?? []) as CallCenterCall[]);
    })();
    return () => {
      active = false;
    };
  }, []);

  const loading = calls === null && !error;

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (calls ?? []).filter((c) => {
      if (agente !== "all" && c.agente !== agente) return false;
      if (estado !== "all" && c.estado !== estado) return false;
      if (term) {
        const hay = [c.nombre, c.telefono, c.empresa]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [calls, agente, estado, q]);

  return (
    <>
      <PageHeader
        title="Llamadas"
        subtitle="Histórico de llamadas con filtros por agente y estado"
      />

      {/* Filtros */}
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <AgenteFilter value={agente} onChange={setAgente} />
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value as CallEstado | "all")}
              className="appearance-none rounded-lg border border-border bg-card/60 py-1.5 pl-3 pr-8 text-sm text-text outline-none focus:border-p"
            >
              <option value="all">Todos los estados</option>
              {CALL_ESTADO_ORDER.map((e) => (
                <option key={e} value={e}>
                  {CALL_ESTADO[e].label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar nombre, teléfono…"
              className="w-56 rounded-lg border border-border bg-card/60 py-1.5 pl-8 pr-3 text-sm text-text placeholder:text-muted outline-none focus:border-p"
            />
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-[#ff6b6b]/30 bg-[#ff6b6b]/5 p-6 text-sm text-[#ff9b9b]">
          No se pudieron cargar las llamadas: {error}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card/40">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wider text-muted">
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Agente</th>
                  <th className="px-4 py-3 font-medium">Contacto</th>
                  <th className="px-4 py-3 font-medium">Teléfono</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Pipeline</th>
                  <th className="px-4 py-3 font-medium">Duración</th>
                  <th className="px-4 py-3 font-medium">Cita</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-muted">
                      Cargando…
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-muted">
                      No hay llamadas que coincidan con los filtros.
                    </td>
                  </tr>
                )}
                {filtered.map((c) => {
                  const ag = AGENTE_MAP[c.agente];
                  const isOpen = expanded === c.id;
                  const hasDetail =
                    c.resumen || c.transcripcion || c.notas || c.grabacion_url;
                  return (
                    <FilaLlamada
                      key={c.id}
                      call={c}
                      agColor={ag?.color ?? "#8888a0"}
                      agLabel={ag?.label ?? c.agente}
                      isOpen={isOpen}
                      hasDetail={!!hasDetail}
                      onToggle={() =>
                        setExpanded(isOpen ? null : hasDetail ? c.id : null)
                      }
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && (
        <p className="mt-3 text-xs text-muted">
          {filtered.length}{" "}
          {filtered.length === 1 ? "llamada" : "llamadas"}
          {agente !== "all" || estado !== "all" || q ? " (filtradas)" : ""}
        </p>
      )}
    </>
  );
}

function FilaLlamada({
  call: c,
  agColor,
  agLabel,
  isOpen,
  hasDetail,
  onToggle,
}: {
  call: CallCenterCall;
  agColor: string;
  agLabel: string;
  isOpen: boolean;
  hasDetail: boolean;
  onToggle: () => void;
}) {
  const estado = CALL_ESTADO[c.estado];
  const pipeline = PIPELINE_ESTADO[c.pipeline_estado];
  return (
    <>
      <tr
        onClick={onToggle}
        className={`border-b border-border/60 transition-colors ${
          hasDetail ? "cursor-pointer hover:bg-white/[0.02]" : ""
        }`}
      >
        <td className="whitespace-nowrap px-4 py-3 text-muted">
          {formatDateTime(c.created_at)}
        </td>
        <td className="px-4 py-3">
          <Badge label={agLabel} color={agColor} />
        </td>
        <td className="px-4 py-3">
          <div className="font-medium">{c.nombre ?? "—"}</div>
          {c.empresa && (
            <div className="text-xs text-muted">{c.empresa}</div>
          )}
        </td>
        <td className="whitespace-nowrap px-4 py-3 tabular-nums text-muted">
          {c.telefono}
        </td>
        <td className="px-4 py-3">
          {estado && <Badge label={estado.label} color={estado.color} />}
        </td>
        <td className="px-4 py-3">
          {pipeline && <Badge label={pipeline.label} color={pipeline.color} />}
        </td>
        <td className="whitespace-nowrap px-4 py-3 tabular-nums text-muted">
          {formatDuration(c.duracion_segundos)}
        </td>
        <td className="px-4 py-3">
          {c.cita_agendada ? (
            <CalendarCheck className="h-4 w-4 text-g" />
          ) : (
            <span className="text-muted">—</span>
          )}
        </td>
      </tr>
      {isOpen && hasDetail && (
        <tr className="border-b border-border/60 bg-white/[0.015]">
          <td colSpan={8} className="px-4 py-4">
            <div className="grid gap-4 md:grid-cols-2">
              {c.resumen && (
                <Detalle titulo="Resumen">{c.resumen}</Detalle>
              )}
              {c.notas && <Detalle titulo="Notas">{c.notas}</Detalle>}
              {c.transcripcion && (
                <div className="md:col-span-2">
                  <Detalle titulo="Transcripción">
                    <span className="whitespace-pre-wrap">
                      {c.transcripcion}
                    </span>
                  </Detalle>
                </div>
              )}
              {c.grabacion_url && (
                <a
                  href={c.grabacion_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-p2 hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Escuchar grabación
                </a>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function Detalle({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted">
        {titulo}
      </p>
      <p className="text-sm text-text/90">{children}</p>
    </div>
  );
}
