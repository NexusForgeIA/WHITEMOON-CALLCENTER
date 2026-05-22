import type { CallEstado, PipelineEstado, ProspectoEstado } from "./types";

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
