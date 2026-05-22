import { createServerClient } from "@/lib/supabase-server";
import { PageHeader } from "@/components/page-header";
import { LlamadasView } from "./llamadas-view";
import type { CallCenterCall } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LlamadasPage() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("call_center_calls")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <>
        <PageHeader
          title="Llamadas"
          subtitle="Histórico de llamadas con filtros por agente y estado"
        />
        <div className="rounded-xl border border-[#ff6b6b]/30 bg-[#ff6b6b]/5 p-6 text-sm text-[#ff9b9b]">
          No se pudieron cargar las llamadas: {error.message}
        </div>
      </>
    );
  }

  return <LlamadasView calls={(data ?? []) as CallCenterCall[]} />;
}
