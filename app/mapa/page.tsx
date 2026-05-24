import { createServerClient } from "@/lib/supabase-server";
import { PageHeader } from "@/components/page-header";
import { MapaView } from "./mapa-view";
import type { CallCenterProspecto } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MapaPage() {
  const supabase = createServerClient();
  // Carga los prospectos que ya tienen coordenadas para pintarlos como pins.
  const { data, error } = await supabase
    .from("call_center_prospectos")
    .select("*")
    .not("lat", "is", null)
    .not("lng", "is", null);

  const prospectos = error ? [] : ((data ?? []) as CallCenterProspecto[]);

  return (
    <>
      <PageHeader
        title="Mapa"
        subtitle="Prospección de Sofía sobre el mapa · Majadahonda y alrededores"
      />
      <MapaView prospectosExistentes={prospectos} />
    </>
  );
}
