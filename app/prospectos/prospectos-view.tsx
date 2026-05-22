"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, PhoneOutgoing, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/badge";
import { AgenteFilter, type AgenteFiltro } from "@/components/agente-filter";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { AGENTE_MAP } from "@/lib/agentes";
import { PROSPECTO_ESTADO, PROSPECTO_ESTADO_ORDER } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";
import type { CallCenterProspecto, ProspectoEstado } from "@/lib/types";

export function ProspectosView({
  prospectos,
}: {
  prospectos: CallCenterProspecto[];
}) {
  const router = useRouter();
  const [agente, setAgente] = useState<AgenteFiltro>("all");
  const [estado, setEstado] = useState<ProspectoEstado | "all">("all");
  const [q, setQ] = useState("");

  const [target, setTarget] = useState<CallCenterProspecto | null>(null);
  const [calling, setCalling] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return prospectos.filter((p) => {
      if (agente !== "all" && p.agente !== agente) return false;
      if (estado !== "all" && p.estado !== estado) return false;
      if (term) {
        const hay = [p.nombre, p.telefono, p.empresa]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [prospectos, agente, estado, q]);

  async function lanzarLlamada() {
    if (!target) return;
    setCalling(true);
    setCallError(null);
    try {
      const res = await fetch("/api/llamar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agente: target.agente,
          telefono: target.telefono,
          nombre: target.nombre,
          empresa: target.empresa,
          prospecto_id: target.id,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        setCallError(data?.error ?? `Error ${res.status}`);
        return;
      }
      setFeedback(
        `Llamada lanzada a ${target.nombre ?? target.telefono}. El estado pasará a "Llamando".`,
      );
      setTarget(null);
      router.refresh();
    } catch (err) {
      setCallError(String(err));
    } finally {
      setCalling(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Prospectos"
        subtitle="Listas de prospectos por agente para lanzar llamadas"
      />

      {feedback && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-g/30 bg-g/5 px-4 py-3 text-sm text-g">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {feedback}
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="ml-auto text-xs text-muted hover:text-text"
          >
            Cerrar
          </button>
        </div>
      )}

      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <AgenteFilter value={agente} onChange={setAgente} />
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={estado}
            onChange={(e) =>
              setEstado(e.target.value as ProspectoEstado | "all")
            }
            className="rounded-lg border border-border bg-card/60 px-3 py-1.5 text-sm text-text outline-none focus:border-p"
          >
            <option value="all">Todos los estados</option>
            {PROSPECTO_ESTADO_ORDER.map((e) => (
              <option key={e} value={e}>
                {PROSPECTO_ESTADO[e].label}
              </option>
            ))}
          </select>
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

      <div className="overflow-hidden rounded-xl border border-border bg-card/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wider text-muted">
                <th className="px-4 py-3 font-medium">Contacto</th>
                <th className="px-4 py-3 font-medium">Teléfono</th>
                <th className="px-4 py-3 font-medium">Agente</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Intentos</th>
                <th className="px-4 py-3 font-medium">Última llamada</th>
                <th className="px-4 py-3 font-medium text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted">
                    No hay prospectos que coincidan con los filtros.
                  </td>
                </tr>
              )}
              {filtered.map((p) => {
                const ag = AGENTE_MAP[p.agente];
                const est = PROSPECTO_ESTADO[p.estado];
                const enCurso = p.estado === "llamando";
                return (
                  <tr
                    key={p.id}
                    className="border-b border-border/60 transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.nombre ?? "—"}</div>
                      {p.empresa && (
                        <div className="text-xs text-muted">{p.empresa}</div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-muted">
                      {p.telefono}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        label={ag?.label ?? p.agente}
                        color={ag?.color ?? "#8888a0"}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {est && <Badge label={est.label} color={est.color} />}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-muted">
                      {p.intentos}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted">
                      {formatDateTime(p.ultima_llamada)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setCallError(null);
                          setTarget(p);
                        }}
                        disabled={enCurso}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-p/15 px-3 py-1.5 text-xs font-medium text-p2 transition-colors hover:bg-p/25 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <PhoneOutgoing className="h-3.5 w-3.5" />
                        {enCurso ? "En curso" : "Llamar"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted">
        {filtered.length} {filtered.length === 1 ? "prospecto" : "prospectos"}
        {agente !== "all" || estado !== "all" || q ? " (filtrados)" : ""}
      </p>

      <ConfirmDialog
        open={target !== null}
        loading={calling}
        error={callError}
        title="Lanzar llamada"
        confirmLabel="Llamar ahora"
        onCancel={() => {
          if (!calling) {
            setTarget(null);
            setCallError(null);
          }
        }}
        onConfirm={lanzarLlamada}
        message={
          target && (
            <>
              Se lanzará una llamada real de Bland.ai con el agente{" "}
              <span className="font-medium text-text">
                {AGENTE_MAP[target.agente]?.label ?? target.agente}
              </span>{" "}
              a{" "}
              <span className="font-medium text-text">
                {target.nombre ?? "este prospecto"}
              </span>{" "}
              ({target.telefono}).
            </>
          )
        }
      />
    </>
  );
}
