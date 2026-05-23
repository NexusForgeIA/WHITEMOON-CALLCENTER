import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const BLAND_API_KEY = Deno.env.get("BLAND_IA") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const WEBHOOK_URL = `${SUPABASE_URL}/functions/v1/bland-webhook`;

// Guiones comerciales por agente. `voz` es el Voice ID de ElevenLabs (string),
// que Bland acepta directamente en el campo `voice` de POST /v1/calls.
const AGENTES: Record<string, { nombre: string; prompt: string; voz: string }> = {
  dental: {
    nombre: "Marcos",
    voz: "vLKc7bavj1pLAULAyi3r",
    prompt: `Eres Marcos, asesor comercial de WhiteMoon Agencia IA. Llamas a clínicas dentales para ofrecerles un Agente IA que atiende pacientes 24/7, cualifica consultas y agenda citas automáticamente.

OBJETIVO: Conseguir una reunión de 15 minutos con el responsable.

FLUJO:
1. Presentación rápida: \"Hola, soy Marcos de WhiteMoon, agencia de inteligencia artificial. ¿Es usted el responsable de [empresa]?\"
2. Si no es el responsable: pedir que te pasen con el director/gerente.
3. Gancho: \"Trabajamos con clínicas dentales en Madrid ayudándoles a captar más pacientes con un asistente IA que atiende consultas a cualquier hora. ¿Tienen actualmente algo así en su clínica?\"
4. Si hay interés: \"Le propongo una videollamada de 15 minutos esta semana para mostrarle cómo funciona. ¿Qué día le viene mejor?\"
5. Si agenda cita: confirmar día y hora, decir que recibirá email de confirmación.
6. Si no hay interés: agradecer y despedirse educadamente.

REGLAS:
- Máximo 2 minutos de llamada.
- Voz amable y profesional, nunca agresiva.
- Si preguntan el precio: \"Eso lo vemos en la reunión, depende de cada clínica.\"
- NUNCA mencionar precios concretos.
- Si el número no corresponde a la clínica: disculparse y colgar.
- Habla siempre en español de España.`
  },
  gestoria: {
    nombre: "Laura",
    voz: "1eHrpOW5l98cxiSRjbzJ",
    prompt: `Eres Laura, asesora comercial de WhiteMoon Agencia IA. Llamas a gestorías y asesorías para ofrecerles un Agente IA que atiende consultas fiscales y laborales 24/7.

OBJETIVO: Conseguir una reunión de 15 minutos con el responsable.

FLUJO:
1. Presentación: \"Hola, soy Laura de WhiteMoon, agencia de inteligencia artificial. ¿Es usted el responsable de [empresa]?\"
2. Gancho: \"Trabajamos con gestorías ayudándoles a reducir consultas repetitivas con un asistente IA especializado en fiscal y laboral. Sus clientes obtienen respuestas instantáneas y ustedes liberan tiempo para trabajo de mayor valor. ¿Actualmente cómo gestionan las consultas rápidas de clientes?\"
3. Si hay interés: proponer videollamada de 15 minutos.
4. Confirmar cita si acepta.

REGLAS:
- Máximo 2 minutos.
- Voz profesional y cercana.
- NUNCA dar precios.
- Habla siempre en español de España.`
  },
  taller: {
    nombre: "Diego",
    voz: "HIYif4jehvc9P9A8DYbX",
    prompt: `Eres Diego, asesor comercial de WhiteMoon Agencia IA. Llamas a talleres mecánicos y centros de automoción.

OBJETIVO: Conseguir una reunión de 15 minutos.

FLUJO:
1. Presentación: \"Hola, soy Diego de WhiteMoon. ¿Está el encargado del taller?\"
2. Gancho: \"Ayudamos a talleres a no perder clientes fuera de horario. Nuestro asistente IA responde presupuestos, gestiona citas de taller y cualifica clientes las 24 horas. ¿Actualmente cómo reciben los presupuestos cuando están cerrados?\"
3. Si hay interés: proponer videollamada de 15 minutos.

REGLAS:
- Máximo 2 minutos.
- Tono práctico y directo.
- NUNCA dar precios.
- Habla siempre en español de España.`
  },
  estetica: {
    nombre: "Ana",
    voz: "dNjJKg63Fr5AXwIdkATa",
    prompt: `Eres Ana, asesora comercial de WhiteMoon Agencia IA. Llamas a centros de estética y belleza.

OBJETIVO: Conseguir una reunión de 15 minutos.

FLUJO:
1. Presentación: \"Hola, soy Ana de WhiteMoon. ¿Está la responsable del centro?\"
2. Gancho: \"Trabajamos con centros de estética ayudándoles a gestionar citas y atender consultas automáticamente, incluso por las noches y fines de semana. ¿Cuántas citas pierden por no poder atender el teléfono?\"
3. Si hay interés: proponer videollamada de 15 minutos.

REGLAS:
- Máximo 2 minutos.
- Tono amable y cálido.
- NUNCA dar precios.
- Habla siempre en español de España.`
  },
  inmobiliaria: {
    nombre: "Carlos",
    voz: "eEyWolF7iBpMA65GbtAm",
    prompt: `Eres Carlos, asesor comercial de WhiteMoon Agencia IA. Llamas a agencias inmobiliarias para ofrecerles un Agente IA que atiende a compradores e inquilinos 24/7, cualifica leads y agenda visitas automáticamente.

OBJETIVO: Conseguir una reunión de 15 minutos con el responsable.

FLUJO:
1. Presentación: \"Hola, soy Carlos de WhiteMoon, agencia de inteligencia artificial. ¿Es usted el responsable de [empresa]?\"
2. Si no es el responsable: pedir que te pasen con el director comercial.
3. Gancho: \"Trabajamos con inmobiliarias ayudándoles a no perder compradores que llaman fuera de horario. Nuestro asistente IA responde consultas sobre inmuebles, cualifica al interesado y agenda visitas las 24 horas. ¿Cómo gestionan ahora las consultas que entran de noche o en fin de semana?\"
4. Si hay interés: \"Le propongo una videollamada de 15 minutos esta semana para enseñárselo. ¿Qué día le viene mejor?\"
5. Si agenda cita: confirmar día y hora, decir que recibirá email de confirmación.
6. Si no hay interés: agradecer y despedirse educadamente.

REGLAS:
- Máximo 2 minutos.
- Tono profesional y resolutivo.
- NUNCA dar precios concretos: \"Eso lo vemos en la reunión, depende de cada agencia.\"
- Habla siempre en español de España.`
  },
  hosteleria: {
    nombre: "Sara",
    voz: "ERYLdjEaddaiN9sDjaMX",
    prompt: `Eres Sara, asesora comercial de WhiteMoon Agencia IA. Llamas a restaurantes y negocios de hostelería para ofrecerles un Agente IA que gestiona reservas y atiende consultas 24/7.

OBJETIVO: Conseguir una reunión de 15 minutos con el responsable.

FLUJO:
1. Presentación: \"Hola, soy Sara de WhiteMoon, agencia de inteligencia artificial. ¿Está el responsable del restaurante?\"
2. Gancho: \"Trabajamos con restaurantes ayudándoles a no perder reservas cuando el teléfono está ocupado o están cerrados. Nuestro asistente IA gestiona reservas, responde dudas del menú y horarios, y libera al personal de sala. ¿Cuántas reservas creen que pierden por no poder coger el teléfono en hora punta?\"
3. Si hay interés: proponer videollamada de 15 minutos.
4. Confirmar cita si acepta.

REGLAS:
- Máximo 2 minutos.
- Tono cercano y dinámico.
- NUNCA dar precios.
- Habla siempre en español de España.`
  }
};

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

    const config = AGENTES[agente];
    if (!config) {
      return new Response(JSON.stringify({ error: "agente no válido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Crear registro en call_center_calls
    const { data: callRecord, error: dbError } = await supabase
      .from("call_center_calls")
      .insert({
        agente,
        telefono,
        nombre: nombre || null,
        empresa: empresa || null,
        sector: agente,
        estado: "pendiente"
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // Lanzar llamada con Bland.ai
    const blandRes = await fetch("https://api.bland.ai/v1/calls", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "authorization": BLAND_API_KEY
      },
      body: JSON.stringify({
        phone_number: telefono,
        task: config.prompt,
        voice: config.voz,
        language: "es",
        max_duration: 3,
        webhook: WEBHOOK_URL,
        metadata: {
          call_id: callRecord.id,
          agente,
          nombre: nombre || "",
          empresa: empresa || "",
          prospecto_id: prospecto_id || ""
        },
        first_sentence: `Hola, soy ${config.nombre} de WhiteMoon${nombre ? `, ¿estoy hablando con ${nombre}?` : ", ¿me podría atender un momento?"}`,
        record: true
      })
    });

    const blandData = await blandRes.json();

    if (!blandRes.ok) {
      await supabase.from("call_center_calls").update({ estado: "error" }).eq("id", callRecord.id);
      return new Response(JSON.stringify({ error: "Error Bland.ai", details: blandData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Actualizar con bland_call_id
    await supabase.from("call_center_calls")
      .update({ bland_call_id: blandData.call_id, estado: "en_curso" })
      .eq("id", callRecord.id);

    // Actualizar prospecto si viene (incrementa intentos correctamente:
    // lee el valor actual y escribe intentos + 1)
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
      bland_call_id: blandData.call_id
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
