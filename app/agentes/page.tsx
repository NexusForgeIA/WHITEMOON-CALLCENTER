import { PageHeader } from "@/components/page-header";
import { createServerClient } from "@/lib/supabase-server";
import { computeRanking } from "@/lib/ranking";
import { AGENTE_MAP } from "@/lib/agentes";
import type { Agente, CallCenterCall } from "@/lib/types";
import { AgentesView } from "./agentes-view";

export const dynamic = "force-dynamic";

function isAgente(v: string | undefined): v is Agente {
  return v !== undefined && v in AGENTE_MAP;
}

export default async function AgentesPage({
  searchParams,
}: {
  searchParams: Promise<{ agente?: string }>;
}) {
  const { agente: agenteParam } = await searchParams;
  const seleccionado = isAgente(agenteParam) ? agenteParam : null;

  const supabase = createServerClient();
  const [callsRes, prospRes] = await Promise.all([
    supabase
      .from("call_center_calls")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("call_center_prospectos").select("agente, estado"),
  ]);

  if (callsRes.error) {
    return (
      <>
        <PageHeader
          title="Agentes"
          subtitle="Oficina IA en vivo · ranking competitivo"
        />
        <div className="rounded-xl border border-[#ff6b6b]/30 bg-[#ff6b6b]/5 p-6 text-sm text-[#ff9b9b]">
          No se pudieron cargar los datos: {callsRes.error.message}
        </div>
      </>
    );
  }

  const calls = (callsRes.data ?? []) as CallCenterCall[];
  const prospectos = (prospRes.data ?? []) as {
    agente: string;
    estado: string;
  }[];
  const ranking = computeRanking(calls, prospectos);

  return (
    <>
      <PageHeader
        title="Agentes"
        subtitle="Oficina IA en vivo · ranking competitivo de los 6 agentes"
      />
      <AgentesView ranking={ranking} seleccionadoInicial={seleccionado} />
    </>
  );
}
