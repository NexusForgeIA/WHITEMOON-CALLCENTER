import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Llamadas salientes con Retell AI. La key y el número viven en Supabase Edge
// Function Secrets (nunca en el código): configúralos con `Deno.env.get`.
const RETELL_API_KEY = Deno.env.get("RETELL_API_KEY") || "";
const RETELL_PHONE_NUMBER = Deno.env.get("RETELL_PHONE_NUMBER") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Cada sector enruta a su Retell Agent. El prompt, la voz y el idioma viven en
// la configuración del agente dentro de Retell, no aquí.
const AGENTES: Record<string, string> = {
  dental: "agent_97c85171d5de7e245682f83868",
  gestoria: "agent_470799afd33084f55310012b77",
  hosteleria: "agent_84efcdfabc6fd04d179e2d7e72",
  inmobiliaria: "agent_bf2902990c98ebf64b5950c025",
  estetica: "agent_4ac154b3d0fbf77dc1546d16d7",
  taller: "agent_513607869e28dc95c819b8789b",
};

// Horario comercial permitido (hora de Madrid): L-V 9:00-20:00 para todos los
// sectores; nunca fines de semana. Intl con timeZone gestiona el horario de verano.
function dentroDeHorario(): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Madrid",
    weekday: "short",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const dia = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hora = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const finde = dia === "Sat" || dia === "Sun";
  return !finde && hora >= 9 && hora < 20;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "content-type, authorization",
  };

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { agente, telefono, nombre, empresa, prospecto_id } = await req.json();

    if (!agente || !telefono) {
      return new Response(JSON.stringify({ error: "agente y telefono requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const agentId = AGENTES[agente];
    if (!agentId) {
      return new Response(JSON.stringify({ error: "agente no válido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!dentroDeHorario()) {
      return new Response(
        JSON.stringify({ error: "Fuera de horario. Llamadas permitidas L-V 9:00-20:00 (hora Madrid)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Crear registro en call_center_calls (lo lee el dashboard y la vista de prospectos).
    const { data: callRecord, error: dbError } = await supabase
      .from("call_center_calls")
      .insert({
        agente,
        telefono,
        nombre: nombre || null,
        empresa: empresa || null,
        sector: agente,
        estado: "pendiente",
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // Lanzar llamada con Retell. `override_agent_id` sobrescribe el agente
    // asociado al from_number para enrutar cada sector a su propio agente.
    const retellRes = await fetch("https://api.retellai.com/v2/create-phone-call", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RETELL_API_KEY}`,
      },
      body: JSON.stringify({
        from_number: RETELL_PHONE_NUMBER,
        to_number: telefono,
        override_agent_id: agentId,
        retell_llm_dynamic_variables: {
          nombre_prospecto: nombre || "",
        },
        metadata: {
          call_id: callRecord.id,
          agente,
          prospecto_id: prospecto_id || "",
        },
      }),
    });

    const retellData = await retellRes.json().catch(() => ({}));

    if (!retellRes.ok) {
      await supabase.from("call_center_calls").update({ estado: "error" }).eq("id", callRecord.id);
      return new Response(JSON.stringify({ error: "Error Retell", details: retellData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Actualizar con retell_call_id y marcar en curso.
    await supabase.from("call_center_calls")
      .update({ retell_call_id: retellData.call_id, estado: "en_curso" })
      .eq("id", callRecord.id);

    // Actualizar prospecto si viene (el frontend asume estado='llamando' +
    // intentos++): lee el valor actual y escribe intentos + 1.
    if (prospecto_id) {
      const { data: prosp } = await supabase
        .from("call_center_prospectos")
        .select("intentos")
        .eq("id", prospecto_id)
        .single();
      const intentosActuales = prosp?.intentos ?? 0;
      await supabase.from("call_center_prospectos")
        .update({
          estado: "llamando",
          ultima_llamada: new Date().toISOString(),
          intentos: intentosActuales + 1,
        })
        .eq("id", prospecto_id);
    }

    return new Response(JSON.stringify({
      ok: true,
      call_id: callRecord.id,
      retell_call_id: retellData.call_id,
      status: retellData.call_status,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
