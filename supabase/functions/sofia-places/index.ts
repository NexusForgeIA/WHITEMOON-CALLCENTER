import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// sofia-places v1 — Prospección de negocios con Google Places + análisis Sofía.
// verify_jwt: false (se invoca desde el panel vía proxy /api/prospectar).
//
// SEGURIDAD: todas las claves vienen de Deno.env.get(), nunca hardcodeadas.
// TOKENS: una sola llamada a Claude por lote (máx 400 tokens), nunca por
// prospecto individual, y solo si quedan 3+ candidatos tras el filtro.
// ---------------------------------------------------------------------------

const GOOGLE_PLACES_API_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY") || "";
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Keyword de búsqueda en Google Places por sector.
const KEYWORDS: Record<string, string> = {
  dental: "clínica dental",
  gestoria: "gestoría asesoría",
  taller: "taller mecánico",
  estetica: "centro estética",
  inmobiliaria: "inmobiliaria",
  hosteleria: "restaurante bar",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Normaliza un teléfono a sus últimos 9 dígitos para comparar sin formato. */
function normTel(s: string | null | undefined): string {
  return (s || "").replace(/\D/g, "").slice(-9);
}

/**
 * Extrae el array JSON de la respuesta de Claude.
 * Tolerante a truncado: si la respuesta se corta (p. ej. por max_tokens) y el
 * array no cierra con `]`, rescata los objetos `{...}` completos y bien formados.
 */
function parseJsonArray(text: string): Array<Record<string, unknown>> {
  const limpio = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const ini = limpio.indexOf("[");
  if (ini === -1) return [];

  // 1) Intento directo: JSON completo y válido.
  const fin = limpio.lastIndexOf("]");
  if (fin > ini) {
    try {
      const arr = JSON.parse(limpio.slice(ini, fin + 1));
      if (Array.isArray(arr)) return arr;
    } catch {
      // truncado o inválido → pasa al rescate por objetos
    }
  }

  // 2) Rescate tolerante: extrae objetos {...} balanceados completos, ignorando
  //    cualquier objeto final cortado a medias y el `]` ausente.
  const objetos: Array<Record<string, unknown>> = [];
  const cuerpo = limpio.slice(ini + 1);
  let depth = 0;
  let start = -1;
  let inStr = false;
  let esc = false;
  for (let i = 0; i < cuerpo.length; i++) {
    const ch = cuerpo[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
    } else if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      if (depth > 0) {
        depth--;
        if (depth === 0 && start !== -1) {
          try {
            objetos.push(JSON.parse(cuerpo.slice(start, i + 1)));
          } catch {
            // objeto mal formado: se ignora
          }
          start = -1;
        }
      }
    }
  }
  return objetos;
}

interface Candidato {
  nombre: string;
  telefono: string;
  direccion: string;
  rating: number | null;
  lat: number;
  lng: number;
  sector: string;
  website: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sector, lat, lng, radio_km } = await req.json();

    if (!sector || !(sector in KEYWORDS)) {
      return json({ error: "sector no válido" }, 400);
    }
    if (typeof lat !== "number" || typeof lng !== "number") {
      return json({ error: "lat y lng deben ser números" }, 400);
    }
    const radio = typeof radio_km === "number" && radio_km > 0 ? radio_km : 5;

    // -- PASO 1: Google Places Text Search (restringido a España) ------------
    // locationRestriction en searchText SOLO admite rectangle (no circle), así
    // que convertimos el radio en un bounding box alrededor del punto. Junto a
    // regionCode "ES" y "España" en el query, garantiza resultados en España.
    const dLat = radio / 111.32; // km → grados de latitud
    const dLng = radio / (111.32 * Math.cos((lat * Math.PI) / 180));
    const placesRes = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
          "X-Goog-FieldMask":
            "places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.rating,places.userRatingCount,places.websiteUri,places.location",
        },
        body: JSON.stringify({
          textQuery: `${KEYWORDS[sector]} España`,
          locationRestriction: {
            rectangle: {
              low: { latitude: lat - dLat, longitude: lng - dLng },
              high: { latitude: lat + dLat, longitude: lng + dLng },
            },
          },
          regionCode: "ES",
          maxResultCount: 20,
          languageCode: "es",
        }),
      },
    );

    const placesData = await placesRes.json();
    if (!placesRes.ok) {
      return json({ error: "Error Google Places", details: placesData }, 502);
    }
    const places: Array<Record<string, any>> = placesData.places ?? [];

    // -- PASO 2: filtro automático sin IA ------------------------------------
    let candidatos: Candidato[] = places
      .filter((p) => p.nationalPhoneNumber) // descartar sin teléfono
      .filter((p) => (p.rating ?? 0) >= 3.5) // descartar rating < 3.5
      .map((p) => ({
        nombre: p.displayName?.text ?? "",
        telefono: p.nationalPhoneNumber as string,
        direccion: p.formattedAddress ?? "",
        rating: typeof p.rating === "number" ? p.rating : null,
        lat: p.location?.latitude ?? lat,
        lng: p.location?.longitude ?? lng,
        sector,
        website: p.websiteUri ?? null,
      }));

    // Dedup contra call_center_prospectos y leads_web (comparación normalizada).
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const [{ data: prosp }, { data: leads }] = await Promise.all([
      supabase.from("call_center_prospectos").select("telefono"),
      supabase.from("leads_web").select("telefono"),
    ]);
    const yaExisten = new Set(
      [...(prosp ?? []), ...(leads ?? [])].map((r) => normTel(r.telefono)),
    );
    candidatos = candidatos.filter((c) => !yaExisten.has(normTel(c.telefono)));

    // -- PASO 3: Claude UNA llamada por lote (solo si 3+ candidatos) ----------
    if (candidatos.length < 3) {
      return json({
        prospectos: [],
        total: 0,
        motivo: `Solo ${candidatos.length} candidato(s) tras el filtro (mínimo 3 para análisis).`,
      });
    }

    const entrada = candidatos.map((c, i) => ({
      id: i,
      nombre: c.nombre,
      rating: c.rating,
      direccion: c.direccion,
      tiene_web: Boolean(c.website),
    }));

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        system:
          `Eres Sofía, directora del Call Center IA de WhiteMoon Agencia IA en Majadahonda. ` +
          `Analiza estos negocios del sector ${sector}. ` +
          `Devuelve SOLO JSON minificado sin espacios ni saltos de línea. Sin texto extra. ` +
          `Formato: [{"id":0,"vale_la_pena":true,"dolor":"texto breve","prioridad":1}] (prioridad 1-3).`,
        messages: [{ role: "user", content: JSON.stringify(entrada) }],
      }),
    });

    const claudeData = await claudeRes.json();
    if (!claudeRes.ok) {
      return json({ error: "Error Claude", details: claudeData }, 502);
    }
    const claudeText = claudeData.content?.[0]?.text ?? "";
    const analisis = parseJsonArray(claudeText);
    const porId = new Map(analisis.map((a) => [Number(a.id), a]));

    // -- PASO 4: respuesta (solo vale_la_pena = true) ------------------------
    const prospectos = candidatos
      .map((c, i) => {
        const a = porId.get(i) ?? {};
        return {
          nombre: c.nombre,
          telefono: c.telefono,
          direccion: c.direccion,
          rating: c.rating,
          lat: c.lat,
          lng: c.lng,
          sector: c.sector,
          dolor: typeof a.dolor === "string" ? a.dolor : null,
          prioridad: typeof a.prioridad === "number" ? a.prioridad : 2,
          vale_la_pena: a.vale_la_pena === true,
        };
      })
      .filter((p) => p.vale_la_pena);

    return json({ prospectos, total: prospectos.length });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
