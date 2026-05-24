import type { Agente, CallEstado, PipelineEstado, ProspectoEstado } from "./types";

export const CALL_ESTADO: Record<CallEstado, { label: string; color: string }> = {
  pendiente: { label: "Pendiente", color: "#8888a0" },
  en_curso: { label: "En curso", color: "#4da8ff" },
  contestada: { label: "Contestada", color: "#00d4aa" },
  no_contestada: { label: "No contestada", color: "#ff9b6b" },
  buzon: { label: "Buzón", color: "#9d70ff" },
  completada: { label: "Completada", color: "#00d4aa" },
  error: { label: "Error", color: "#ff6b6b" },
};

export const CALL_ESTADO_ORDER: CallEstado[] = [
  "pendiente",
  "en_curso",
  "contestada",
  "no_contestada",
  "buzon",
  "completada",
  "error",
];

export const PIPELINE_ESTADO: Record<
  PipelineEstado,
  { label: string; color: string }
> = {
  nuevo: { label: "Nuevo", color: "#8888a0" },
  contactado: { label: "Contactado", color: "#4da8ff" },
  interesado: { label: "Interesado", color: "#9d70ff" },
  cita_agendada: { label: "Cita agendada", color: "#00d4aa" },
  no_interesado: { label: "No interesado", color: "#ff6b6b" },
  cerrado: { label: "Cerrado", color: "#ffa94d" },
};

export const PIPELINE_ORDER: PipelineEstado[] = [
  "nuevo",
  "contactado",
  "interesado",
  "cita_agendada",
  "no_interesado",
  "cerrado",
];

export const PROSPECTO_ESTADO: Record<
  ProspectoEstado,
  { label: string; color: string }
> = {
  pendiente: { label: "Pendiente", color: "#8888a0" },
  llamando: { label: "Llamando", color: "#4da8ff" },
  completado: { label: "Completado", color: "#00d4aa" },
  descartado: { label: "Descartado", color: "#ff6b6b" },
};

export const PROSPECTO_ESTADO_ORDER: ProspectoEstado[] = [
  "pendiente",
  "llamando",
  "completado",
  "descartado",
];

// Origen del prospecto (badge en la tabla). Fallback a "manual".
export const PROSPECTO_ORIGEN: Record<
  string,
  { label: string; emoji: string; color: string }
> = {
  web: { label: "Web", emoji: "🌐", color: "#4da8ff" },
  sofia: { label: "Sofía", emoji: "📍", color: "#9d70ff" },
  manual: { label: "Manual", emoji: "➕", color: "#8888a0" },
};

// Prioridad comercial: 1 alta · 2 media · 3 baja.
export const PROSPECTO_PRIORIDAD: Record<
  number,
  { label: string; emoji: string; color: string }
> = {
  1: { label: "Alta", emoji: "🔴", color: "#ff4444" },
  2: { label: "Media", emoji: "🟡", color: "#f5c842" },
  3: { label: "Baja", emoji: "🟢", color: "#00d4aa" },
};

// Colores de los pines del mapa por sector (Bloque 1 — distintos del acento 3D).
export const SECTOR_PIN_COLOR: Record<Agente, string> = {
  dental: "#3b82f6",
  gestoria: "#8b5cf6",
  taller: "#f97316",
  estetica: "#ec4899",
  inmobiliaria: "#f5c842",
  hosteleria: "#00d4aa",
};
