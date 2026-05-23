import type { Agente, EstadoAnim, Genero } from "./types";

/** Colores del atuendo ejecutivo del avatar 3D (todos en hex). */
export interface AgenteOutfit {
  /** Traje (masculino) o blazer (femenino). */
  traje: string;
  /** Complemento: corbata (masculino) o falda (femenino). */
  complemento: string;
  /** Tono de piel. */
  piel: string;
  /** Color del pelo. */
  pelo: string;
}

export interface AgenteMeta {
  /** Código de sector. Es la clave en BD (call_center_*) y en el Edge Function. */
  id: Agente;
  /** Persona que representa al agente en la oficina. */
  nombre: string;
  /** Nombre del sector que atiende. */
  sector: string;
  genero: Genero;
  outfit: AgenteOutfit;
  /** Estado por defecto; la vista lo sobrescribe con la actividad real. */
  estado: EstadoAnim;
  /** Color de acento (hex) para badges, ranking, puntos y luces 3D. */
  color: string;
  emoji: string;
  /** Etiqueta corta para chips de filtro y navegación lateral. */
  label: string;
  /** Descripción larga del sector. */
  descripcion: string;
}

export const AGENTES: AgenteMeta[] = [
  {
    id: "dental",
    nombre: "Marcos",
    sector: "Clínicas Dentales",
    genero: "masculino",
    outfit: { traje: "#1b2a5e", complemento: "#7c4dff", piel: "#e6b89c", pelo: "#2b2118" },
    estado: "disponible",
    color: "#4da8ff",
    emoji: "🦷",
    label: "Dental",
    descripcion: "Clínicas dentales",
  },
  {
    id: "gestoria",
    nombre: "Laura",
    sector: "Gestorías",
    genero: "femenino",
    outfit: { traje: "#7c4dff", complemento: "#0d0d14", piel: "#f0c8a0", pelo: "#3a2a1a" },
    estado: "disponible",
    color: "#00d4aa",
    emoji: "📁",
    label: "Gestoría",
    descripcion: "Gestorías y asesorías",
  },
  {
    id: "taller",
    nombre: "Diego",
    sector: "Talleres",
    genero: "masculino",
    outfit: { traje: "#565b6b", complemento: "#00d4aa", piel: "#d9a679", pelo: "#1a1410" },
    estado: "disponible",
    color: "#ffa94d",
    emoji: "🔧",
    label: "Taller",
    descripcion: "Talleres de automóvil",
  },
  {
    id: "estetica",
    nombre: "Ana",
    sector: "Estética",
    genero: "femenino",
    outfit: { traje: "#00d4aa", complemento: "#565b6b", piel: "#f3cda6", pelo: "#4a2c12" },
    estado: "disponible",
    color: "#ff6fae",
    emoji: "✨",
    label: "Estética",
    descripcion: "Centros de estética",
  },
  {
    id: "inmobiliaria",
    nombre: "Carlos",
    sector: "Inmobiliaria",
    genero: "masculino",
    outfit: { traje: "#14141c", complemento: "#ffce54", piel: "#c98e63", pelo: "#0f0c08" },
    estado: "disponible",
    color: "#ffce54",
    emoji: "🏢",
    label: "Inmobiliaria",
    descripcion: "Agencias inmobiliarias",
  },
  {
    id: "hosteleria",
    nombre: "Sara",
    sector: "Hostelería",
    genero: "femenino",
    outfit: { traje: "#e8b04b", complemento: "#0d0d14", piel: "#ecc4a0", pelo: "#1c140e" },
    estado: "disponible",
    color: "#f6c177",
    emoji: "🍽️",
    label: "Hostelería",
    descripcion: "Restaurantes y hostelería",
  },
];

export const AGENTE_MAP = Object.fromEntries(
  AGENTES.map((a) => [a.id, a]),
) as Record<Agente, AgenteMeta>;
