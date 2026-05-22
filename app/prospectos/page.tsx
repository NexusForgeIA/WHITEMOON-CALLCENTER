import { createServerClient } from "@/lib/supabase-server";
import { PageHeader } from "@/components/page-header";
import { ProspectosView } from "./prospectos-view";
import type { CallCenterProspecto } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ProspectosPage() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("call_center_prospectos")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <>
        <PageHeader
          title="Prospectos"
          subtitle="Listas de prospectos por agente para lanzar llamadas"
        />
        <div className="rounded-xl border border-[#ff6b6b]/30 bg-[#ff6b6b]/5 p-6 text-sm text-[#ff9b9b]">
          No se pudieron cargar los prospectos: {error.message}
        </div>
      </>
    );
  }

  return <ProspectosView prospectos={(data ?? []) as CallCenterProspecto[]} />;
}
