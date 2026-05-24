// Capitales de provincia de España (50) + Ceuta y Melilla = 52 zonas.
// Coordenadas aproximadas del centro de cada ciudad, para centrar el mapa y
// usarlas como punto de prospección.

export interface Zona {
  nombre: string;
  lat: number;
  lng: number;
}

export const ZONAS_ESPANA: Zona[] = [
  { nombre: "A Coruña", lat: 43.3623, lng: -8.4115 },
  { nombre: "Albacete", lat: 38.9943, lng: -1.8585 },
  { nombre: "Alicante", lat: 38.3452, lng: -0.481 },
  { nombre: "Almería", lat: 36.834, lng: -2.4637 },
  { nombre: "Ávila", lat: 40.6566, lng: -4.6818 },
  { nombre: "Badajoz", lat: 38.8794, lng: -6.9707 },
  { nombre: "Barcelona", lat: 41.3851, lng: 2.1734 },
  { nombre: "Bilbao", lat: 43.263, lng: -2.935 },
  { nombre: "Burgos", lat: 42.3439, lng: -3.6969 },
  { nombre: "Cáceres", lat: 39.4753, lng: -6.3724 },
  { nombre: "Cádiz", lat: 36.5298, lng: -6.2926 },
  { nombre: "Castellón de la Plana", lat: 39.9864, lng: -0.0513 },
  { nombre: "Ceuta", lat: 35.8894, lng: -5.3198 },
  { nombre: "Ciudad Real", lat: 38.9848, lng: -3.9274 },
  { nombre: "Córdoba", lat: 37.8882, lng: -4.7794 },
  { nombre: "Cuenca", lat: 40.0704, lng: -2.1374 },
  { nombre: "Girona", lat: 41.9794, lng: 2.8214 },
  { nombre: "Granada", lat: 37.1773, lng: -3.5986 },
  { nombre: "Guadalajara", lat: 40.6286, lng: -3.1614 },
  { nombre: "Huelva", lat: 37.2614, lng: -6.9447 },
  { nombre: "Huesca", lat: 42.1362, lng: -0.4087 },
  { nombre: "Jaén", lat: 37.7796, lng: -3.7849 },
  { nombre: "Las Palmas de Gran Canaria", lat: 28.1235, lng: -15.4363 },
  { nombre: "León", lat: 42.5987, lng: -5.5671 },
  { nombre: "Lleida", lat: 41.6176, lng: 0.62 },
  { nombre: "Logroño", lat: 42.4627, lng: -2.4449 },
  { nombre: "Lugo", lat: 43.0125, lng: -7.5559 },
  { nombre: "Madrid", lat: 40.4168, lng: -3.7038 },
  { nombre: "Málaga", lat: 36.7213, lng: -4.4214 },
  { nombre: "Melilla", lat: 35.2923, lng: -2.9381 },
  { nombre: "Murcia", lat: 37.9922, lng: -1.1307 },
  { nombre: "Ourense", lat: 42.3358, lng: -7.8639 },
  { nombre: "Oviedo", lat: 43.3619, lng: -5.8494 },
  { nombre: "Palencia", lat: 42.0096, lng: -4.5288 },
  { nombre: "Palma", lat: 39.5696, lng: 2.6502 },
  { nombre: "Pamplona", lat: 42.8125, lng: -1.6458 },
  { nombre: "Pontevedra", lat: 42.431, lng: -8.6444 },
  { nombre: "Salamanca", lat: 40.9701, lng: -5.6635 },
  { nombre: "San Sebastián", lat: 43.3183, lng: -1.9812 },
  { nombre: "Santa Cruz de Tenerife", lat: 28.4636, lng: -16.2518 },
  { nombre: "Santander", lat: 43.4623, lng: -3.8099 },
  { nombre: "Segovia", lat: 40.9429, lng: -4.1088 },
  { nombre: "Sevilla", lat: 37.3891, lng: -5.9845 },
  { nombre: "Soria", lat: 41.7665, lng: -2.479 },
  { nombre: "Tarragona", lat: 41.1189, lng: 1.2445 },
  { nombre: "Teruel", lat: 40.3456, lng: -1.1065 },
  { nombre: "Toledo", lat: 39.8628, lng: -4.0273 },
  { nombre: "Valencia", lat: 39.4699, lng: -0.3763 },
  { nombre: "Valladolid", lat: 41.6523, lng: -4.7245 },
  { nombre: "Vitoria-Gasteiz", lat: 42.8467, lng: -2.6716 },
  { nombre: "Zamora", lat: 41.5033, lng: -5.7446 },
  { nombre: "Zaragoza", lat: 41.6488, lng: -0.8891 },
];

// Acceso rápido (chips) — las más usadas.
export const ZONAS_FRECUENTES = [
  "Madrid",
  "Barcelona",
  "Valencia",
  "Sevilla",
  "Zaragoza",
  "Málaga",
  "Bilbao",
];

/** Normaliza texto para búsquedas sin acentos ni mayúsculas. */
export function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}
