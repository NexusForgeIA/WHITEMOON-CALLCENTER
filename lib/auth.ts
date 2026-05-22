export const SESSION_COOKIE = "wm_session";
export const PANEL_USER = "whitemoon";

// Token de sesión derivado de PANEL_PASSWORD. Sin la contraseña no se puede
// falsificar la cookie. Usa Web Crypto, disponible en middleware (Edge) y rutas.
export async function sessionToken(
  password: string | undefined,
): Promise<string | null> {
  if (!password) return null;
  const data = new TextEncoder().encode(
    `${PANEL_USER}:${password}:wm-callcenter-v1`,
  );
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
