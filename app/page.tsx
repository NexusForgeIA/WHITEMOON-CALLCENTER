import {
  Coins,
  Receipt,
  CalendarCheck,
  Percent,
  Phone,
  Timer,
} from "lucide-react";
import { createServerClient } from "@/lib/supabase-server";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/kpi-card";
import { AGENTES } from "@/lib/agentes";
import { formatDuration } from "@/lib/format";
import { getBlandBalance, saldoCritico } from "@/lib/bland";
import type { Agente, CallEstado, PipelineEstado } from "@/lib/types";

export const dynamic = "force-dynamic";

// --- Supuestos de coste / ROI (ajustables) ---------------------------------
// Bland factura ~0,125 $/min. Si no hay duración media real, se asume 2 min.
const COSTE_POR_MIN = 0.125;
const DUR_MIN_DEFECTO = 2;
// Valor estimado de una cita agendada (USD). NO sale de la BD (no hay datos de
// ingresos): es un supuesto para estimar el ROI. Ajusta según tu cierre real.
const VALOR_POR_CITA = 50;

const CONTACTADAS: CallEstado[] = ["contestada", "completada"];

interface CallRow {
  created_at: string;
  agente: Agente;
  estado: CallEstado;
  pipeline_estado: PipelineEstado;
  cita_agendada: boolean;
  duracion_segundos: number | null;
}

const money = (n: number) => `$${n.toFixed(2)}`;
const pct = (value: number, total: number) =>
  total > 0 ? `${Math.round((value / total) * 100)}%` : "—";

export default async function DashboardPage() {
  const supabase = createServerClient();

  const [callsRes, prospRes, credito] = await Promise.all([
    supabase
      .from("call_center_calls")
      .select(
        "created_at, agente, estado, pipeline_estado, cita_agendada, duracion_segundos",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("call_center_prospectos")
      .select("*", { count: "exact", head: true }),
    getBlandBalance(),
  ]);

  if (callsRes.error) {
    return (
      <>
        <PageHeader title="Dashboard" subtitle="ROI del call center IA" />
        <div className="rounded-xl border border-[#ff6b6b]/30 bg-[#ff6b6b]/5 p-6 text-sm text-[#ff9b9b]">
          No se pudieron cargar los datos: {callsRes.error.message}
        </div>
      </>
    );
  }

  const rows = (callsRes.data ?? []) as CallRow[];
  const totalProspectos = prospRes.count ?? 0;

  // --- Coste por llamada -----------------------------------------------------
  const totalLlamadas = rows.length;
  const conDuracion = rows.filter(
    (c) => c.duracion_segundos && c.duracion_segundos > 0,
  );
  const avgDurSeg = conDuracion.length
    ? Math.round(
        conDuracion.reduce((a, c) => a + (c.duracion_segundos ?? 0), 0) /
          conDuracion.length,
      )
    : 0;
  const durMin = avgDurSeg > 0 ? avgDurSeg / 60 : DUR_MIN_DEFECTO;
  const costePorLlamada = COSTE_POR_MIN * durMin;
  const costeTotal = totalLlamadas * costePorLlamada;

  const citas = rows.filter((c) => c.cita_agendada).length;
  const contactadas = rows.filter((c) => CONTACTADAS.includes(c.estado)).length;
  const cierres = rows.filter((c) => c.pipeline_estado === "cerrado").length;
  const costePorCita = citas > 0 ? costeTotal / citas : 0;
  const tasaConversion = totalLlamadas > 0 ? (citas / totalLlamadas) * 100 : 0;

  // --- Embudo de conversión --------------------------------------------------
  const embudo = [
    { label: "Prospectos", value: totalProspectos, color: "#8888a0" },
    { label: "Contactados", value: contactadas, color: "#4da8ff" },
    { label: "Citas", value: citas, color: "#00d4aa" },
    { label: "Cierres", value: cierres, color: "#7c4dff" },
  ];
  const maxEmbudo = Math.max(1, ...embudo.map((e) => e.value));

  // --- ROI por agente (orden por tasa de conversión) -------------------------
  const porAgente = AGENTES.map((a) => {
    const llamadas = rows.filter((c) => c.agente === a.id).length;
    const citasA = rows.filter((c) => c.agente === a.id && c.cita_agendada).length;
    const tasa = llamadas > 0 ? (citasA / llamadas) * 100 : 0;
    const coste = llamadas * costePorLlamada;
    const ingreso = citasA * VALOR_POR_CITA;
    const roi = coste > 0 ? ((ingreso - coste) / coste) * 100 : null;
    return { ...a, llamadas, citasA, tasa, coste, roi };
  }).sort((x, y) => y.tasa - x.tasa);

  // --- Gráfico semanal (últimas 4 semanas, ventanas de 7 días) ---------------
  const hoy = new Date();
  const semanas = Array.from({ length: 4 }, (_, idx) => {
    const i = 3 - idx; // de más antigua a más reciente
    const fin = new Date(hoy);
    fin.setDate(hoy.getDate() - i * 7);
    fin.setHours(23, 59, 59, 999);
    const ini = new Date(fin);
    ini.setDate(fin.getDate() - 6);
    ini.setHours(0, 0, 0, 0);
    const enRango = rows.filter((c) => {
      const t = new Date(c.created_at).getTime();
      return t >= ini.getTime() && t <= fin.getTime();
    });
    return {
      label: `${ini.getDate()}/${ini.getMonth() + 1}`,
      llamadas: enRango.length,
      citas: enRango.filter((c) => c.cita_agendada).length,
    };
  });
  const maxSemana = Math.max(1, ...semanas.map((s) => s.llamadas));

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="ROI real del call center IA · coste, conversión y rendimiento"
      />

      {credito.saldo !== null && saldoCritico(credito.saldo) && (
        <div className="mb-6 flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-xl border border-[#ff4444]/40 bg-[#ff4444]/10 px-4 py-3 text-sm font-medium text-[#ff4444]">
          <span>Crédito Bland bajo (${credito.saldo.toFixed(2)}) —</span>
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

      {/* KPI resumen */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Coste total llamadas"
          value={money(costeTotal)}
          icon={Coins}
          accent="#7c4dff"
        />
        <KpiCard
          label="Coste por cita"
          value={citas > 0 ? money(costePorCita) : "—"}
          icon={Receipt}
          accent="#9d70ff"
          hint={`${citas} cita${citas === 1 ? "" : "s"} agendada${citas === 1 ? "" : "s"}`}
        />
        <KpiCard
          label="Citas agendadas"
          value={citas}
          icon={CalendarCheck}
          accent="#00d4aa"
        />
        <KpiCard
          label="Tasa conversión"
          value={`${Math.round(tasaConversion)}%`}
          icon={Percent}
          accent="#00d4aa"
          hint="Citas / llamadas"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Embudo de conversión */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold tracking-tight">
            Embudo de conversión
          </h2>
          <p className="mt-1 text-xs text-muted">
            Prospectos → Contactados → Citas → Cierres
          </p>

          <div className="mt-5 space-y-4">
            {embudo.map((e, i) => {
              const prev = i > 0 ? embudo[i - 1] : null;
              return (
                <div key={e.label}>
                  {prev && (
                    <p className="mb-1 text-[11px] text-muted">
                      conversión {pct(e.value, prev.value)}
                    </p>
                  )}
                  <div className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-sm text-muted">
                      {e.label}
                    </span>
                    <div className="h-6 flex-1 overflow-hidden rounded-md bg-white/[0.04]">
                      <div
                        className="flex h-full items-center justify-end rounded-md px-2 text-xs font-semibold text-bg"
                        style={{
                          width: `${Math.max((e.value / maxEmbudo) * 100, 6)}%`,
                          backgroundColor: e.color,
                        }}
                      >
                        {e.value}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Coste por llamada (detalle) */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold tracking-tight">
            Coste por llamada
          </h2>
          <p className="mt-1 text-xs text-muted">
            Estimación a {COSTE_POR_MIN.toFixed(3)} $/min
            {avgDurSeg > 0 ? " · duración real" : ` · ${DUR_MIN_DEFECTO} min por defecto`}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-4">
            <div>
              <p className="text-3xl font-semibold tracking-tight tabular-nums">
                {totalLlamadas}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                <Phone className="h-3.5 w-3.5" /> Llamadas totales
              </p>
            </div>
            <div>
              <p className="text-3xl font-semibold tracking-tight tabular-nums">
                {formatDuration(avgDurSeg)}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                <Timer className="h-3.5 w-3.5" /> Duración media
              </p>
            </div>
            <div>
              <p className="text-3xl font-semibold tracking-tight tabular-nums text-p2">
                {money(costePorLlamada)}
              </p>
              <p className="mt-1 text-xs text-muted">Coste por llamada</p>
            </div>
            <div>
              <p className="text-3xl font-semibold tracking-tight tabular-nums text-p2">
                {citas > 0 ? money(costePorCita) : "—"}
              </p>
              <p className="mt-1 text-xs text-muted">Coste por cita</p>
            </div>
          </div>
        </section>
      </div>

      {/* Gráfico semanal */}
      <section className="mt-6 rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">
              Actividad semanal
            </h2>
            <p className="mt-1 text-xs text-muted">
              Llamadas vs citas · últimas 4 semanas
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-p" /> Llamadas
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-g" /> Citas
            </span>
          </div>
        </div>

        <div className="mt-6 flex h-44 items-end justify-around gap-4">
          {semanas.map((s) => (
            <div key={s.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
              <div className="flex h-full w-full items-end justify-center gap-1.5">
                <div
                  className="w-1/3 rounded-t bg-p transition-all"
                  style={{ height: `${(s.llamadas / maxSemana) * 100}%` }}
                  title={`${s.llamadas} llamadas`}
                />
                <div
                  className="w-1/3 rounded-t bg-g transition-all"
                  style={{ height: `${(s.citas / maxSemana) * 100}%` }}
                  title={`${s.citas} citas`}
                />
              </div>
              <span className="text-[11px] tabular-nums text-muted">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ROI por agente */}
      <section className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border p-6">
          <h2 className="text-sm font-semibold tracking-tight">ROI por agente</h2>
          <p className="mt-1 text-xs text-muted">
            Ordenado por tasa de conversión · ROI estimado a {money(VALOR_POR_CITA)}/cita
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wider text-muted">
                <th className="px-6 py-3 font-medium">Agente</th>
                <th className="px-6 py-3 font-medium text-right">Llamadas</th>
                <th className="px-6 py-3 font-medium text-right">Citas</th>
                <th className="px-6 py-3 font-medium text-right">Tasa</th>
                <th className="px-6 py-3 font-medium text-right">Coste</th>
                <th className="px-6 py-3 font-medium text-right">ROI</th>
              </tr>
            </thead>
            <tbody>
              {porAgente.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-border/60 transition-colors hover:bg-white/[0.02]"
                >
                  <td className="px-6 py-3">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: a.color }}
                      />
                      {a.label}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums text-muted">
                    {a.llamadas}
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums text-g">
                    {a.citasA}
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums">
                    {Math.round(a.tasa)}%
                  </td>
                  <td className="px-6 py-3 text-right tabular-nums text-muted">
                    {money(a.coste)}
                  </td>
                  <td
                    className="px-6 py-3 text-right font-medium tabular-nums"
                    style={{
                      color:
                        a.roi === null
                          ? undefined
                          : a.roi >= 0
                            ? "#00d4aa"
                            : "#ff6b6b",
                    }}
                  >
                    {a.roi === null ? "—" : `${Math.round(a.roi)}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {totalLlamadas === 0 && (
        <p className="mt-6 text-center text-xs text-muted">
          Aún no hay llamadas registradas. Las métricas de ROI se calcularán según
          Bland.ai vaya completando llamadas.
        </p>
      )}
    </>
  );
}
