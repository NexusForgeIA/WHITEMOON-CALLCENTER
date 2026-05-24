import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";
import { AGENTE_MAP } from "@/lib/agentes";

// Alta de prospecto. La escritura va server-side con service_role porque las
// RLS solo permiten SELECT a anon/authenticated.
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { nombre, empresa, telefono, sector, notas, lat, lng, dolor, prioridad, origen } =
    body ?? {};

  if (typeof telefono !== "string" || !telefono.trim()) {
    return NextResponse.json(
      { error: "El teléfono es obligatorio" },
      { status: 400 },
    );
  }
  if (typeof sector !== "string" || !(sector in AGENTE_MAP)) {
    return NextResponse.json({ error: "Sector no válido" }, { status: 400 });
  }

  const limpio = (v: unknown) =>
    typeof v === "string" && v.trim() ? v.trim() : null;

  try {
    const supabase = createServerClient();
    // TEMP debug: diagnóstico de RLS / env en Render.
    console.log("SERVICE_KEY exists:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log(
      "SUPABASE_URL:",
      process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    );
    const { data, error } = await supabase
      .from("call_center_prospectos")
      .insert({
        nombre: limpio(nombre),
        empresa: limpio(empresa),
        telefono: telefono.trim(),
        sector,
        agente: sector,
        estado: "pendiente",
        intentos: 0,
        notas: limpio(notas),
        // Campos del mapa / Sofía (opcionales).
        lat: typeof lat === "number" ? lat : null,
        lng: typeof lng === "number" ? lng : null,
        dolor: limpio(dolor),
        prioridad: typeof prioridad === "number" ? prioridad : 2,
        origen: typeof origen === "string" && origen.trim() ? origen.trim() : "manual",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ prospecto: data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
