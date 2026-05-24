import "server-only";

/**
 * Coste por minuto de llamada (USD) usado para estimar los minutos disponibles
 * a partir del saldo. Bland factura por segundo, de ahí la conversión.
 */
const COSTE_USD_POR_MINUTO = 0.125;

export interface BlandBalance {
  /** Saldo disponible en USD, o null si no se pudo obtener. */
  saldo: number | null;
  /** Minutos de llamada estimados con el saldo actual, o null. */
  minutos: number | null;
  /** Motivo por el que no hay saldo (clave ausente, error de red, etc.). */
  error?: string;
}

/**
 * Consulta el saldo de la cuenta Bland.
 *
 * GET https://api.bland.ai/v1/me → `billing.current_balance` (USD).
 * Campo verificado contra la respuesta de ejemplo de los docs oficiales:
 * https://docs.bland.ai/api-v1/get/me
 *   { "status": "active", "billing": { "current_balance": 99919.12, ... }, ... }
 *
 * Nunca lanza: ante cualquier fallo devuelve `{ saldo: null, error }` para que
 * el dashboard pueda renderizar igualmente.
 */
export async function getBlandBalance(): Promise<BlandBalance> {
  const apiKey = process.env.BLAND_API_KEY;
  if (!apiKey) {
    return { saldo: null, minutos: null, error: "BLAND_API_KEY no configurada" };
  }

  try {
    const res = await fetch("https://api.bland.ai/v1/me", {
      // Bland usa la API key en crudo en la cabecera authorization (sin Bearer).
      headers: { authorization: apiKey },
      // El saldo no necesita ser exacto al segundo; cacheamos 60s para no
      // golpear la API en cada carga del dashboard.
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return { saldo: null, minutos: null, error: `Bland respondió ${res.status}` };
    }

    const data = (await res.json()) as {
      billing?: { current_balance?: number };
    };
    const saldo = data.billing?.current_balance;

    if (typeof saldo !== "number" || Number.isNaN(saldo)) {
      return {
        saldo: null,
        minutos: null,
        error: "Respuesta sin billing.current_balance",
      };
    }

    // minutos disponibles = (saldo / 0.125 €/min) × 60 segundos ÷ 60 = saldo / 0.125
    const segundos = (saldo / COSTE_USD_POR_MINUTO) * 60;
    const minutos = Math.round(segundos / 60);

    return { saldo, minutos };
  } catch (err) {
    return { saldo: null, minutos: null, error: String(err) };
  }
}

/**
 * Color semáforo del saldo:
 *   > $10 verde · $5–$10 amarillo · < $5 rojo.
 */
export function colorSaldo(saldo: number): string {
  if (saldo > 10) return "#00d4aa";
  if (saldo >= 5) return "#f5c842";
  return "#ff4444";
}

/** El saldo está en nivel crítico (banner de aviso). */
export function saldoCritico(saldo: number): boolean {
  return saldo < 5;
}
