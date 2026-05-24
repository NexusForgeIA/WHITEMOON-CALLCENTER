import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// sofia-coordinator v1 — Reporte diario de Sofía por WhatsApp (cron 20:00h).
// verify_jwt: false (la invoca pg_cron vía net.http_post, sin JWT).
//
// SEGURIDAD: claves solo desde Deno.env.get(). El teléfono de destino no es
// secreto (consta en la ficha de la agencia).
// TOKENS: una sola llamada a Claude para el reporte (máx 200 tokens).
// ---------------------------------------------------------------------------

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";
const CALLMEBOT_API_KEY = Deno.env.get("CALLMEBOT_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Destino del reporte (Cristóbal). No es un secreto.
const TELEFONO_DESTINO = "699727218";

// Nombre de la persona que representa a cada agente/sector.
const NOMBRE_AGENTE: Record<string, string> = {
  dental: "Marcos",
  gestoria: "Laura",
  taller: "Diego",
  estetica: "Ana",
  inmobiliaria: "Carlos",
  hosteleria: "Sara",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const ahora = Date.now();
    const hace48h = new Date(ahora - 48 * 3600 * 1000).toISOString();
    const hace24h = new Date(ahora - 24 * 3600 * 1000).toISOString();

    // -- PASO 1: prospectos pendientes accionables ---------------------------
    const { count: pendientes } = await supabase
      .from("call_center_prospectos")
      .select("*", { count: "exact", head: true })
      .eq("estado", "pendiente")
      .lt("intentos", 2)
      .or(`ultima_llamada.is.null,ultima_llamada.lt.${hace48h}`);

    // -- PASO 2: citas agendadas en las últimas 24h --------------------------
    // NOTA: call_center_calls.estado no tiene 'cita_agendada'; la cita se marca
    // con la columna booleana cita_agendada (corrige el SQL del enunciado).
    const { count: citasHoy } = await supabase
      .from("call_center_calls")
      .select("*", { count: "exact", head: true })
      .eq("cita_agendada", true)
      .gt("created_at", hace24h);

    // -- PASO 3: mejor agente del día (más citas) ----------------------------
    const { data: citasRows } = await supabase
      .from("call_center_calls")
      .select("agente")
      .eq("cita_agendada", true)
      .gt("created_at", hace24h);

    const conteo: Record<string, number> = {};
    for (const r of citasRows ?? []) {
      conteo[r.agente] = (conteo[r.agente] ?? 0) + 1;
    }
    const mejorSector = Object.entries(conteo).sort((a, b) => b[1] - a[1])[0]?.[0];
    const mejorAgente = mejorSector
      ? (NOMBRE_AGENTE[mejorSector] ?? mejorSector)
      : "—";

    const datos = {
      citas_hoy: citasHoy ?? 0,
      pendientes: pendientes ?? 0,
      mejor_agente: mejorAgente,
    };

    // -- PASO 4: reporte de Sofía (máx 200 tokens) ---------------------------
    let reporte = "";
    try {
      const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 200,
          system:
            "Eres Sofía, directora del Call Center IA de WhiteMoon. Redacta el reporte diario en máximo 2 líneas.",
          messages: [{ role: "user", content: JSON.stringify(datos) }],
        }),
      });
      const claudeData = await claudeRes.json();
      reporte = (claudeData.content?.[0]?.text ?? "").trim();
    } catch {
      reporte = "";
    }

    // -- PASO 5: envío por WhatsApp vía CallMeBot ----------------------------
    const mensaje =
      `📊 WhiteMoon Call Center 20:00h\n` +
      (reporte ? `${reporte}\n` : "") +
      `✅ Citas hoy: ${datos.citas_hoy}\n` +
      `📞 Pendientes: ${datos.pendientes}\n` +
      `🏆 Mejor agente: ${datos.mejor_agente}`;

    const url =
      `https://api.callmebot.com/whatsapp.php?phone=${TELEFONO_DESTINO}` +
      `&text=${encodeURIComponent(mensaje)}` +
      `&apikey=${encodeURIComponent(CALLMEBOT_API_KEY)}`;

    const waRes = await fetch(url);
    const waText = await waRes.text();

    return new Response(
      JSON.stringify({ ok: true, datos, enviado: waRes.ok, callmebot: waText }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
