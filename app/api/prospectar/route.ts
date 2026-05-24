import { NextResponse } from "next/server";

// Proxy server-side hacia la Edge Function sofia-places (prospección de Sofía).
// Mantiene la URL/keys fuera del cliente y evita CORS, igual que /api/llamar.
export async function POST(req: Request) {
  const base = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) {
    return NextResponse.json(
      { error: "SUPABASE_URL no configurada en el servidor" },
      { status: 500 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { sector, lat, lng, radio_km } = body ?? {};
  if (!sector || typeof lat !== "number" || typeof lng !== "number") {
    return NextResponse.json(
      { error: "sector, lat y lng son obligatorios" },
      { status: 400 },
    );
  }

  // service_role solo en servidor; autoriza ante el gateway (verify_jwt=false).
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const res = await fetch(`${base}/functions/v1/sofia-places`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(serviceKey ? { Authorization: `Bearer ${serviceKey}` } : {}),
      },
      body: JSON.stringify({ sector, lat, lng, radio_km }),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: `No se pudo contactar con Sofía: ${String(err)}` },
      { status: 502 },
    );
  }
}
