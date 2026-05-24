import {
  Phone,
  PhoneCall,
  CalendarCheck,
  CalendarRange,
  TrendingUp,
  ListChecks,
  Timer,
  Wallet,
  UserPlus,
} from "lucide-react";
import { createServerClient } from "@/lib/supabase-server";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { AGENTES } from "@/lib/agentes";
import { PIPELINE_ORDER, PIPELINE_ESTADO } from "@/lib/labels";
import { formatDuration, formatPercent } from "@/lib/format";
import { getBlandBalance, colorSaldo, saldoCritico } from "@/lib/bland";
import type { Agente, CallEstado, PipelineEstado } from "@/lib/types";

export const dynamic = "force-dynamic";

interface CallRow {
  created_at: string;
  agente: Agente;
  estado: CallEstado;
  pipeline_estado: PipelineEstado;
  cita_agendada: boolean;
  duracion_segundos: number | null;
}

const CONTACTADAS: CallEstado[] = ["contestada", "completada"];

export default async function DashboardPage() {
  const supabase = createServerClient();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [callsRes, prospRes, prospHoyRes, credito] = await Promise.all([
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
    supabase
      .from("call_center_prospectos")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayStart.toISOString()),
    getBlandBalance(),
  ]);

  if (callsRes.error) {
    return (
      <>
        <PageHeader
          title="Dashboard"
          subtitle="Resumen general del call center IA"
        />
        <div className="rounded-xl border border-[#ff6b6b]/30 bg-[#ff6b6b]/5 p-6 text-sm text-[#ff9b9b]">
          No se pudieron cargar los datos: {callsRes.error.message}
        </div>
      </>
    );
  }

  const rows = (callsRes.data ?? []) as CallRow[];
  const prospectosPendientes = prospRes.count ?? 0;
  const prospectosHoy = prospHoyRes.count ?? 0;

  // Inicio de la semana actual (lunes 00:00).
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));

  const total = rows.length;
  const hoy = rows.filter((c) => new Date(c.created_at) >= todayStart).length;
  const estaSemana = rows.filter(
    (c) => new Date(c.created_at) >= weekStart,
  ).length;
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

  const pipeline = PIPELINE_ORDER.map((id) => ({
    id,
    ...PIPELINE_ESTADO[id],
    count: rows.filter((c) => c.pipeline_estado === id).length,
  }));
  const pipelineTotal = pipeline.reduce((a, p) => a + p.count, 0);

  const porAgente = AGENTES.map((a) => ({
    ...a,
    count: rows.filter((c) => c.agente === a.id).length,
    citas: rows.filter((c) => c.agente === a.id && c.cita_agendada).length,
  }));
  const maxAgente = Math.max(1, ...porAgente.map((a) => a.count));

  // Saldo Bland: color semáforo, etiqueta y minutos estimados.
  const saldoColor = credito.saldo !== null ? colorSaldo(credito.saldo) : undefined;
  const saldoLabel = credito.saldo !== null ? `$${credito.saldo.toFixed(2)}` : "—";
  const saldoHint =
    credito.saldo !== null
      ? `~${credito.minutos} min disponibles`
      : (credito.error ?? "Sin datos de Bland");
  const mostrarBanner = credito.saldo !== null && saldoCritico(credito.saldo);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Resumen general del call center IA"
      />

      {/* Aviso de crédito Bland bajo */}
      {mostrarBanner && (
        <div className="mb-6 flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-xl border border-[#ff4444]/40 bg-[#ff4444]/10 px-4 py-3 text-sm font-medium text-[#ff4444]">
          <span>
            ⚠️ Crédito Bland bajo (${credito.saldo!.toFixed(2)}) —
          </span>
          <a
            href="https://app.bland.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:opacity-80"
          >
            Recarga en app.bland.ai
          </a>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <KpiCard label="Llamadas hoy" value={hoy} icon={Phone} />
        <KpiCard label="Esta semana" value={estaSemana} icon={CalendarRange} />
        <KpiCard label="Total llamadas" value={total} icon={PhoneCall} />
        <KpiCard
          label="Citas agendadas"
          value={citas}
          icon={CalendarCheck}
          accent="#00d4aa"
        />
        <KpiCard
          label="Tasa contacto"
          value={formatPercent(contactadas, total)}
          icon={TrendingUp}
          accent="#9d70ff"
          hint={`${contactadas}/${total} contactadas`}
        />
        <KpiCard
          label="Duración media"
          value={formatDuration(avgDuracion)}
          icon={Timer}
        />
        <KpiCard
          label="Prospectos pend."
          value={prospectosPendientes}
          icon={ListChecks}
          accent="#ffa94d"
        />
        <KpiCard
          label="Prospectos hoy"
          value={prospectosHoy}
          icon={UserPlus}
          accent="#9d70ff"
        />
        <KpiCard
          label="Crédito Bland"
          value={saldoLabel}
          valueColor={saldoColor}
          accent={saldoColor}
          hint={saldoHint}
          icon={Wallet}
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

          <div className="mt-5 flex h-2.5 w-full overflow-hidden rounded-full bg-white/[0.05]">
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

      {total === 0 && (
        <p className="mt-6 text-center text-xs text-muted">
          Aún no hay llamadas registradas. Los KPIs se actualizarán según Bland.ai
          vaya completando llamadas.
        </p>
      )}
    </>
  );
}
