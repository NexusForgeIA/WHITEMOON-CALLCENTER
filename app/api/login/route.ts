import { NextResponse } from "next/server";
import { SESSION_COOKIE, PANEL_USER, sessionToken } from "@/lib/auth";

export async function POST(req: Request) {
  const password = process.env.PANEL_PASSWORD;
  if (!password) {
    return NextResponse.json(
      { error: "PANEL_PASSWORD no configurada en el servidor" },
      { status: 500 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { usuario, password: pass } = body ?? {};
  if (usuario !== PANEL_USER || pass !== password) {
    return NextResponse.json(
      { error: "Usuario o contraseña incorrectos" },
      { status: 401 },
    );
  }

  const token = await sessionToken(password);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 horas
  });
  return res;
}
