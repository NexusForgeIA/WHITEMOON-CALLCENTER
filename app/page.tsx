"use client";

import { useEffect, useState } from "react";
import {
  Phone,
  PhoneCall,
  CalendarCheck,
  TrendingUp,
  ListChecks,
  Timer,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { AGENTES } from "@/lib/agentes";
import { formatDuration, formatPercent } from "@/lib/format";
import type { Agente, CallEstado, PipelineEstado } from "@/lib/types";

interface CallRow {
  created_at: string;
  agente: Agente;
  estado: CallEstado;
  pipeline_estado: PipelineEstado;
  cita_agendada: boolean;
  duracion_segundos: number | null;
}

const PIPELINE: { id: PipelineEstado; label: string; color: string }[] = [
  { id: "nuevo", label: "Nuevo", color: "#8888a0" },
  { id: "contactado", label: "Contactado", color: "#4da8ff" },
  { id: "interesado", label: "Interesado", color: "#9d70ff" },
  { id: "cita_agendada", label: "Cita agendada", color: "#00d4aa" },
  { id: "no_interesado", label: "No interesado", color: "#ff6b6b" },
  { id: "cerrado", label: "Cerrado", color: "#ffa94d" },
];

const CONTACTADAS: CallEstado[] = ["contestada", "completada"];

export default function DashboardPage() {
  const [calls, setCalls] = useState<CallRow[] | null>(null);
  const [prospectosPendientes, setProspectosPendientes] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const [callsRes, prospRes] = await Promise.all([
        supabase
          .from("call_center_calls")
          .select(
            "created_at, agente, estado, pipeline_estado, cita_agendada, duracion_segundos",
          )
          .order("created_at", { ascending: false }),
        supabase
          .from("call_center_prospectos")
          .select("*", { count: "exact", head: true })
          .eq("estado", "pendiente"),
      ]);
      if (!active) return;
      if (callsRes.error) {
        setError(callsRes.error.message);
        return;
      }
      setCalls((callsRes.data ?? []) as CallRow[]);
      setProspectosPendientes(prospRes.count ?? 0);
    })();
    return () => {
      active = false;
    };
  }, []);

  const loading = calls === null && !error;
  const rows = calls ?? [];

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const total = rows.length;
  const hoy = rows.filter((c) => new Date(c.created_at) >= todayStart).length;
  const citas = rows.filter((c) => c.cita_agendada).length;
  const contactadas = rows.filter((c) => CONTACTADAS.includes(c.estado)).length;
  const conDuracion = rows.filter(
    (c) => c.duracion_segundos && c.duracion_segundos > 0,
  );
  const avgDuracion = conDuracion.length
    ? Math.round(
        conDuracion.reduce((a, c) => a + (c.duracion_segundos ?? 0), 0) /
          conDuracion.length,
      )
    : 0;

  const pipeline = PIPELINE.map((p) => ({
    ...p,
    count: rows.filter((c) => c.pipeline_estado === p.id).length,
  }));
  const pipelineTotal = pipeline.reduce((a, p) => a + p.count, 0);

  const porAgente = AGENTES.map((a) => ({
    ...a,
    count: rows.filter((c) => c.agente === a.id).length,
    citas: rows.filter((c) => c.agente === a.id && c.cita_agendada).length,
  }));
  const maxAgente = Math.max(1, ...porAgente.map((a) => a.count));

  if (error) {
    return (
      <>
        <PageHeader
          title="Dashboard"
          subtitle="Resumen general del call center IA"
        />
        <div className="rounded-xl border border-[#ff6b6b]/30 bg-[#ff6b6b]/5 p-6 text-sm text-[#ff9b9b]">
          No se pudieron cargar los datos: {error}
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Resumen general del call center IA"
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Llamadas hoy" value={hoy} icon={Phone} loading={loading} />
        <KpiCard
          label="Total llamadas"
          value={total}
          icon={PhoneCall}
          loading={loading}
        />
        <KpiCard
          label="Citas agendadas"
          value={citas}
          icon={CalendarCheck}
          accent="#00d4aa"
          loading={loading}
        />
        <KpiCard
          label="Tasa contacto"
          value={formatPercent(contactadas, total)}
          icon={TrendingUp}
          accent="#9d70ff"
          hint={`${contactadas}/${total} contactadas`}
          loading={loading}
        />
        <KpiCard
          label="Duración media"
          value={formatDuration(avgDuracion)}
          icon={Timer}
          loading={loading}
        />
        <KpiCard
          label="Prospectos pend."
          value={prospectosPendientes}
          icon={ListChecks}
          accent="#ffa94d"
          loading={loading}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pipeline */}
        <section className="rounded-xl border border-border bg-card/50 p-6">
          <h2 className="text-sm font-semibold tracking-tight">Pipeline total</h2>
          <p className="mt-1 text-xs text-muted">
            {pipelineTotal} {pipelineTotal === 1 ? "llamada" : "llamadas"} en el
            embudo
          </p>

          {/* Barra de proporción */}
          <div className="mt-5 flex h-2.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
            {pipelineTotal === 0
              ? null
              : pipeline.map(
                  (p) =>
                    p.count > 0 && (
                      <div
                        key={p.id}
                        style={{
                          width: `${(p.count / pipelineTotal) * 100}%`,
                          backgroundColor: p.color,
                        }}
                        title={`${p.label}: ${p.count}`}
                      />
                    ),
                )}
          </div>

          <ul className="mt-5 space-y-3">
            {pipeline.map((p) => (
              <li key={p.id} className="flex items-center gap-3 text-sm">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: p.color }}
                />
                <span className="text-muted">{p.label}</span>
                <span className="ml-auto font-medium tabular-nums">
                  {p.count}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Actividad por agente */}
        <section className="rounded-xl border border-border bg-card/50 p-6">
          <h2 className="text-sm font-semibold tracking-tight">
            Actividad por agente
          </h2>
          <p className="mt-1 text-xs text-muted">Llamadas totales y citas</p>

          <ul className="mt-5 space-y-4">
            {porAgente.map((a) => (
              <li key={a.id}>
                <div className="flex items-center gap-2 text-sm">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: a.color }}
                  />
                  <span>{a.label}</span>
                  <span className="ml-auto text-muted">
                    <span className="font-medium text-text tabular-nums">
                      {a.count}
                    </span>{" "}
                    llamadas ·{" "}
                    <span className="font-medium text-g tabular-nums">
                      {a.citas}
                    </span>{" "}
                    citas
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(a.count / maxAgente) * 100}%`,
                      backgroundColor: a.color,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {!loading && total === 0 && (
        <p className="mt-6 text-center text-xs text-muted">
          Aún no hay llamadas registradas. Los KPIs se actualizarán según Bland.ai
          vaya completando llamadas.
        </p>
      )}
    </>
  );
}
