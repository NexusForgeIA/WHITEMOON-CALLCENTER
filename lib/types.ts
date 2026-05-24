// Tipos del dominio call center — espejo de las tablas Supabase
// public.call_center_calls y public.call_center_prospectos.

export type Agente =
  | "dental"
  | "gestoria"
  | "taller"
  | "estetica"
  | "inmobiliaria"
  | "hosteleria";

/** Género del avatar 3D que representa al agente. */
export type Genero = "masculino" | "femenino";

/** Estado de animación del avatar en la oficina 3D. */
export type EstadoAnim =
  | "disponible"
  | "llamando"
  | "tramitando"
  | "celebrando";

export type CallEstado =
  | "pendiente"
  | "en_curso"
  | "contestada"
  | "no_contestada"
  | "buzon"
  | "completada"
  | "error";

export type PipelineEstado =
  | "nuevo"
  | "contactado"
  | "interesado"
  | "cita_agendada"
  | "no_interesado"
  | "cerrado";

export type ProspectoEstado =
  | "pendiente"
  | "llamando"
  | "completado"
  | "descartado";

/** Origen del prospecto (cómo entró al sistema). */
export type ProspectoOrigen = "manual" | "sofia" | "web";

/** Prioridad comercial: 1 alta · 2 media · 3 baja. */
export type ProspectoPrioridad = 1 | 2 | 3;

export interface CallCenterCall {
  id: string;
  created_at: string;
  agente: Agente;
  nombre: string | null;
  telefono: string;
  empresa: string | null;
  sector: string | null;
  bland_call_id: string | null;
  estado: CallEstado;
  duracion_segundos: number | null;
  pipeline_estado: PipelineEstado;
  transcripcion: string | null;
  resumen: string | null;
  cita_agendada: boolean;
  cita_fecha: string | null;
  notas: string | null;
  grabacion_url: string | null;
}

export interface CallCenterProspecto {
  id: string;
  created_at: string;
  nombre: string | null;
  telefono: string;
  empresa: string | null;
  sector: string | null;
  agente: Agente;
  estado: ProspectoEstado;
  intentos: number;
  ultima_llamada: string | null;
  notas: string | null;
  // Mapa + Sofía prospectora (migración 20260524120000).
  lat: number | null;
  lng: number | null;
  dolor: string | null;
  prioridad: number | null;
  origen: string | null;
  analisis_web: unknown | null;
}
