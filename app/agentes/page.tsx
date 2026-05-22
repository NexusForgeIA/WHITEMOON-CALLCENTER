"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Phone,
  CalendarCheck,
  TrendingUp,
  ListChecks,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { Badge } from "@/components/badge";
import { AGENTES, AGENTE_MAP } from "@/lib/agentes";
import { CALL_ESTADO, PIPELINE_ESTADO, PIPELINE_ORDER } from "@/lib/labels";
import { formatDateTime, formatPercent } from "@/lib/format";
import type { Agente, CallCenterCall, CallEstado } from "@/lib/types";

const CONTACTADAS: CallEstado[] = ["contestada", "completada"];

function isAgente(v: string | null): v is Agente {
  return v === "dental" || v === "gestoria" || v === "taller" || v === "estetica";
}

export default function AgentesPage() {
  return (
    <Suspense
      fallback={
        <PageHeader
          title="Agentes"
          subtitle="Rendimiento por agente: dental, gestoría, taller y estética"
        />
      }
    >
      <AgentesView />
    </Suspense>
  );
}

function AgentesView() {
  const params = useSearchParams();
  const seleccionado = isAgente(params.get("agente"))
    ? (params.get("agente") as Agente)
    : null;

  const [calls, setCalls] = useState<CallCenterCall[] | null>(null);
  const [prospectos, setProspectos] = useState<
    { agente: Agente; estado: string }[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const [callsRes, prospRes] = await Promise.all([
        supabase
          .from("call_center_calls")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("call_center_prospectos").select("agente, estado"),
      ]);
      if (!active) return;
      if (callsRes.error) {
        setError(callsRes.error.message);
        return;
      }
      setCalls((callsRes.data ?? []) as CallCenterCall[]);
      setProspectos(
        (prospRes.data ?? []) as { agente: Agente; estado: string }[],
      );
    })();
    return () => {
      active = false;
    };
  }, []);

  const loading = calls === null && !error;
  const rows = calls ?? [];

  const stats = useMemo(() => {
    return AGENTES.map((a) => {
      const propias = rows.filter((c) => c.agente === a.id);
      const contactadas = propias.filter((c) =>
        CONTACTADAS.includes(c.estado),
      ).length;
      return {
        ...a,
        total: propias.length,
        citas: propias.filter((c) => c.cita_agendada).length,
        contactadas,
        prospectosPend: prospectos.filter(
          (p) => p.agente === a.id && p.estado === "pendiente",
        ).length,
      };
    });
  }, [rows, prospectos]);

  if (error) {
    return (
      <>
        <PageHeader
          title="Agentes"
          subtitle="Rendimiento por agente: dental, gestoría, taller y estética"
        />
        <div className="rounded-xl border border-[#ff6b6b]/30 bg-[#ff6b6b]/5 p-6 text-sm text-[#ff9b9b]">
          No se pudieron cargar los datos: {error}
        </div>
      </>
    );
  }

  const detalle = seleccionado ? AGENTE_MAP[seleccionado] : null;

  return (
    <>
      <PageHeader
        title={detalle ? `Agente · ${detalle.label}` : "Agentes"}
        subtitle={
          detalle
            ? detalle.descripcion
            : "Rendimiento por agente: dental, gestoría, taller y estética"
        }
        action={
          detalle ? (
            <Link
              href="/agentes"
              className="rounded-lg border border-border bg-card/60 px-3 py-1.5 text-xs text-muted transition-colors hover:text-text"
            >
              ← Todos los agentes
            </Link>
          ) : undefined
        }
      />

      {/* Tarjetas resumen de los 4 agentes */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((a) => (
          <Link
            key={a.id}
            href={`/agentes?agente=${a.id}`}
            className={`group rounded-xl border bg-card/50 p-5 transition-colors hover:bg-card ${
              seleccionado === a.id ? "border-p/50" : "border-border"
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className="grid h-9 w-9 place-items-center rounded-xl text-lg"
                style={{ backgroundColor: `${a.color}1f` }}
              >
                {a.emoji}
              </span>
              <div>
                <p className="font-medium leading-tight">{a.label}</p>
                <p className="text-xs text-muted">{a.descripcion}</p>
              </div>
              <ArrowRight className="ml-auto h-4 w-4 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <Mini valor={loading ? "—" : a.total} etiqueta="Llamadas" />
              <Mini
                valor={loading ? "—" : a.citas}
                etiqueta="Citas"
                color="#00d4aa"
              />
              <Mini
                valor={loading ? "—" : a.prospectosPend}
                etiqueta="Prosp."
                color="#ffa94d"
              />
            </div>
          </Link>
        ))}
      </div>

      {/* Detalle del agente seleccionado */}
      {detalle && (
        <DetalleAgente
          agente={detalle.id}
          rows={rows.filter((c) => c.agente === detalle.id)}
          prospectosPend={
            stats.find((s) => s.id === detalle.id)?.prospectosPend ?? 0
          }
          loading={loading}
        />
      )}
    </>
  );
}

function Mini({
  valor,
  etiqueta,
  color,
}: {
  valor: string | number;
  etiqueta: string;
  color?: string;
}) {
  return (
    <div className="rounded-lg bg-white/[0.03] py-2">
      <p
        className="text-lg font-semibold tabular-nums"
        style={color ? { color } : undefined}
      >
        {valor}
      </p>
      <p className="text-[10px] uppercase tracking-wider text-muted">
        {etiqueta}
      </p>
    </div>
  );
}

function DetalleAgente({
  agente,
  rows,
  prospectosPend,
  loading,
}: {
  agente: Agente;
  rows: CallCenterCall[];
  prospectosPend: number;
  loading: boolean;
}) {
  const total = rows.length;
  const citas = rows.filter((c) => c.cita_agendada).length;
  const contactadas = rows.filter((c) => CONTACTADAS.includes(c.estado)).length;

  const pipeline = PIPELINE_ORDER.map((id) => ({
    id,
    ...PIPELINE_ESTADO[id],
    count: rows.filter((c) => c.pipeline_estado === id).length,
  }));
  const pipelineTotal = pipeline.reduce((a, p) => a + p.count, 0);
  const recientes = rows.slice(0, 8);

  return (
    <div className="mt-6 space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Llamadas" value={total} icon={Phone} loading={loading} />
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
          loading={loading}
        />
        <KpiCard
          label="Prospectos pend."
          value={prospectosPend}
          icon={ListChecks}
          accent="#ffa94d"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pipeline del agente */}
        <section className="rounded-xl border border-border bg-card/50 p-6">
          <h2 className="text-sm font-semibold tracking-tight">Pipeline</h2>
          <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
            {pipelineTotal > 0 &&
              pipeline.map(
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
          <ul className="mt-4 space-y-2.5">
            {pipeline.map((p) => (
              <li key={p.id} className="flex items-center gap-3 text-sm">
                <span
                  className="h-2.5 w-2.5 rounded-full"
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

        {/* Llamadas recientes del agente */}
        <section className="rounded-xl border border-border bg-card/50 p-6">
          <h2 className="text-sm font-semibold tracking-tight">
            Llamadas recientes
          </h2>
          {recientes.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              {loading ? "Cargando…" : "Sin llamadas todavía."}
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-border/60">
              {recientes.map((c) => {
                const e = CALL_ESTADO[c.estado];
                return (
                  <li
                    key={c.id}
                    className="flex items-center gap-3 py-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {c.nombre ?? c.telefono}
                      </p>
                      <p className="text-xs text-muted">
                        {formatDateTime(c.created_at)}
                      </p>
                    </div>
                    <div className="ml-auto">
                      {e && <Badge label={e.label} color={e.color} />}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
