import { AGENTES, type AgenteMeta } from "./agentes";
import type { CallCenterCall, CallEstado, EstadoAnim } from "./types";

const CONTACTADAS: CallEstado[] = ["contestada", "completada"];
const HACE_24H = 24 * 60 * 60 * 1000;

export interface AgenteStats {
  llamadas: number;
  contactos: number;
  citas: number;
  cierres: number;
}

export interface AgenteRanked extends AgenteMeta {
  stats: AgenteStats;
  /** Estado de animación derivado de la actividad real (no el de por defecto). */
  estadoLive: EstadoAnim;
  /** Puntuación competitiva con la que se ordena el ranking. */
  score: number;
  prospectosPend: number;
  /** Posición en el ranking (1 = líder). */
  posicion: number;
}

/**
 * Estado de animación según la actividad reciente del agente.
 * Prioridad: llamando > celebrando > tramitando > disponible.
 */
function deriveEstado(calls: CallCenterCall[]): EstadoAnim {
  if (calls.some((c) => c.estado === "en_curso")) return "llamando";

  const ahora = Date.now();
  const citaReciente = calls.some(
    (c) => c.cita_agendada && ahora - new Date(c.created_at).getTime() < HACE_24H,
  );
  if (citaReciente) return "celebrando";

  const trabajando = calls.some(
    (c) =>
      c.estado === "pendiente" ||
      c.pipeline_estado === "contactado" ||
      c.pipeline_estado === "interesado",
  );
  if (trabajando) return "tramitando";

  return "disponible";
}

/**
 * Puntuación competitiva: prioriza cierres, luego citas, contactos y volumen.
 */
function score(s: AgenteStats): number {
  return s.cierres * 100 + s.citas * 40 + s.contactos * 10 + s.llamadas;
}

/** Construye el ranking de los 6 agentes a partir de los datos del call center. */
export function computeRanking(
  calls: CallCenterCall[],
  prospectos: { agente: string; estado: string }[],
): AgenteRanked[] {
  const ranked: AgenteRanked[] = AGENTES.map((a) => {
    const propias = calls.filter((c) => c.agente === a.id);
    const stats: AgenteStats = {
      llamadas: propias.length,
      contactos: propias.filter((c) => CONTACTADAS.includes(c.estado)).length,
      citas: propias.filter((c) => c.cita_agendada).length,
      cierres: propias.filter((c) => c.pipeline_estado === "cerrado").length,
    };
    return {
      ...a,
      stats,
      estadoLive: deriveEstado(propias),
      score: score(stats),
      prospectosPend: prospectos.filter(
        (p) => p.agente === a.id && p.estado === "pendiente",
      ).length,
      posicion: 0,
    };
  });

  ranked.sort((x, y) => y.score - x.score || y.stats.cierres - x.stats.cierres);
  ranked.forEach((r, i) => (r.posicion = i + 1));
  return ranked;
}
