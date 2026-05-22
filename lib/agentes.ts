import type { Agente } from "./types";

export interface AgenteMeta {
  id: Agente;
  label: string;
  descripcion: string;
  /** Color de acento (hex) para badges, puntos y gráficos. */
  color: string;
  emoji: string;
}

export const AGENTES: AgenteMeta[] = [
  {
    id: "dental",
    label: "Dental",
    descripcion: "Clínicas dentales",
    color: "#4da8ff",
    emoji: "🦷",
  },
  {
    id: "gestoria",
    label: "Gestoría",
    descripcion: "Gestorías y asesorías",
    color: "#00d4aa",
    emoji: "📁",
  },
  {
    id: "taller",
    label: "Taller",
    descripcion: "Talleres de automóvil",
    color: "#ffa94d",
    emoji: "🔧",
  },
  {
    id: "estetica",
    label: "Estética",
    descripcion: "Centros de estética",
    color: "#ff6fae",
    emoji: "✨",
  },
];

export const AGENTE_MAP = Object.fromEntries(
  AGENTES.map((a) => [a.id, a]),
) as Record<Agente, AgenteMeta>;
