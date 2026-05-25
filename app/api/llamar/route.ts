import { NextResponse } from "next/server";

// Proxy server-side hacia la Edge Function retell-outbound.
// La URL se construye desde NEXT_PUBLIC_SUPABASE_URL (ya configurada); evita
// CORS y mantiene la service_role fuera del cliente.
export async function POST(req: Request) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_SUPABASE_URL no configurada en el servidor" },
      { status: 500 },
    );
  }
  const url = `${base}/functions/v1/retell-outbound`;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { agente, telefono, nombre, empresa, prospecto_id } = body ?? {};
  if (!agente || !telefono) {
    return NextResponse.json(
      { error: "agente y telefono son obligatorios" },
      { status: 400 },
    );
  }

  // service_role solo en servidor (nunca llega al cliente); autoriza ante el
  // gateway de la Edge Function (verify_jwt=false en la función).
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(serviceKey ? { Authorization: `Bearer ${serviceKey}` } : {}),
      },
      body: JSON.stringify({ agente, telefono, nombre, empresa, prospecto_id }),
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json(
      { error: `No se pudo contactar con Retell: ${String(err)}` },
      { status: 502 },
    );
  }
}
