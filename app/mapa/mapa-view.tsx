"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Search, Loader2, MousePointerClick, Layers } from "lucide-react";
import { AGENTES } from "@/lib/agentes";
import { SECTOR_PIN_COLOR } from "@/lib/labels";
import {
  ZONAS_ESPANA,
  ZONAS_FRECUENTES,
  normalizar,
  type Zona,
} from "@/lib/zonas-espana";
import type { Agente, CallCenterProspecto } from "@/lib/types";

/** Candidato devuelto por sofia-places para pintar en el mapa. */
export interface CandidatoMapa {
  nombre: string;
  telefono: string;
  direccion: string;
  rating: number | null;
  lat: number;
  lng: number;
  sector: Agente;
  dolor: string | null;
  prioridad: number;
  vale_la_pena?: boolean;
}

const MAJADAHONDA = { lat: 40.4723, lng: -3.8726 };
const RADIOS = [2, 5, 10] as const;

const LeafletMap = dynamic(
  () => import("./leaflet-map").then((m) => m.LeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full place-items-center text-sm text-muted">
        Cargando mapa…
      </div>
    ),
  },
);

export function MapaView({
  prospectosExistentes,
}: {
  prospectosExistentes: CallCenterProspecto[];
}) {
  const router = useRouter();
  const [sector, setSector] = useState<Agente | "todos">("todos");
  const [radio, setRadio] = useState<(typeof RADIOS)[number]>(5);
  const [loading, setLoading] = useState(false);
  const [candidatos, setCandidatos] = useState<CandidatoMapa[]>([]);
  const [clickedPoint, setClickedPoint] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [center, setCenter] = useState(MAJADAHONDA);
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [addingTel, setAddingTel] = useState<string | null>(null);

  // Buscador de ciudad/zona (filtro local sobre las capitales).
  const [query, setQuery] = useState("");
  const sugerencias = useMemo(() => {
    const q = normalizar(query);
    if (!q) return [];
    return ZONAS_ESPANA.filter((z) => normalizar(z.nombre).includes(q)).slice(0, 8);
  }, [query]);

  // Prospección masiva: zonas marcadas + progreso.
  const [massZonas, setMassZonas] = useState<string[]>([]);
  const [massRunning, setMassRunning] = useState(false);
  const [massProgress, setMassProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);

  function irAZona(z: Zona) {
    const punto = { lat: z.lat, lng: z.lng };
    setFlyTo(punto);
    setClickedPoint(punto);
    setCenter(punto);
    setQuery("");
  }

  function toggleMassZona(nombre: string) {
    setMassZonas((prev) =>
      prev.includes(nombre)
        ? prev.filter((n) => n !== nombre)
        : [...prev, nombre],
    );
  }

  async function prospectar() {
    if (sector === "todos") {
      setMsg("Elige un sector concreto para que Sofía prospecte.");
      return;
    }
    const punto = clickedPoint ?? center;
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/prospectar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sector,
          lat: punto.lat,
          lng: punto.lng,
          radio_km: radio,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        setCandidatos([]);
        setMsg(data?.error ?? `Error ${res.status}`);
        return;
      }
      const list = (data.prospectos ?? []) as CandidatoMapa[];
      setCandidatos(list);
      setMsg(
        list.length === 0
          ? (data.motivo ?? "Sin prospectos nuevos en esta zona.")
          : null,
      );
    } catch (err) {
      setMsg(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function prospeccionMasiva() {
    if (sector === "todos") {
      setMsg("Elige un sector concreto para la prospección masiva.");
      return;
    }
    const zonas = ZONAS_ESPANA.filter((z) => massZonas.includes(z.nombre));
    if (zonas.length === 0) {
      setMsg("Selecciona al menos una zona para la prospección masiva.");
      return;
    }
    setMassRunning(true);
    setMsg(null);
    setMassProgress({ done: 0, total: zonas.length });
    const acumulado: CandidatoMapa[] = [];
    for (let i = 0; i < zonas.length; i++) {
      const z = zonas[i];
      try {
        const res = await fetch("/api/prospectar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sector,
            lat: z.lat,
            lng: z.lng,
            radio_km: radio,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && Array.isArray(data.prospectos)) {
          acumulado.push(...(data.prospectos as CandidatoMapa[]));
        }
      } catch {
        // una zona que falla no detiene la secuencia
      }
      setMassProgress({ done: i + 1, total: zonas.length });
      setCandidatos([...acumulado]); // progreso visible en el mapa
    }
    setMassRunning(false);
    setMsg(
      `Prospección masiva completada: ${acumulado.length} prospectos en ${zonas.length} zonas.`,
    );
  }

  async function anadirYLlamar(c: CandidatoMapa) {
    setAddingTel(c.telefono);
    try {
      const res = await fetch("/api/prospectos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: c.nombre,
          empresa: c.nombre,
          telefono: c.telefono,
          sector: c.sector,
          notas: c.direccion,
          lat: c.lat,
          lng: c.lng,
          dolor: c.dolor,
          prioridad: c.prioridad,
          origen: "sofia",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.error) {
        setMsg(data?.error ?? `Error ${res.status}`);
        return;
      }
      router.push("/prospectos");
    } catch (err) {
      setMsg(String(err));
    } finally {
      setAddingTel(null);
    }
  }

  const ocupado = loading || massRunning;

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {/* Panel izquierdo */}
      <aside className="shrink-0 space-y-4 rounded-xl border border-border bg-card/40 p-4 lg:w-[320px]">
        {/* Buscador de ciudad/zona */}
        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-muted">
            Buscar ciudad o zona
          </label>
          <div className="relative mt-1.5">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ej. Valencia, Bilbao…"
              className="w-full rounded-lg border border-border bg-bg/60 py-2 pl-8 pr-3 text-sm text-text placeholder:text-muted outline-none focus:border-p"
            />
          </div>
          {sugerencias.length > 0 && (
            <ul className="mt-1 overflow-hidden rounded-lg border border-border bg-card">
              {sugerencias.map((z) => (
                <li key={z.nombre}>
                  <button
                    type="button"
                    onClick={() => irAZona(z)}
                    className="block w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-white/[0.05]"
                  >
                    {z.nombre}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Zonas frecuentes + todas las capitales */}
        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-muted">
            Zonas frecuentes
          </label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {ZONAS_FRECUENTES.map((nombre) => {
              const z = ZONAS_ESPANA.find((x) => x.nombre === nombre);
              if (!z) return null;
              return (
                <button
                  key={nombre}
                  type="button"
                  onClick={() => irAZona(z)}
                  className="rounded-full border border-border px-2.5 py-1 text-xs text-muted transition-colors hover:border-p hover:text-text"
                >
                  {nombre}
                </button>
              );
            })}
          </div>
          <select
            value=""
            onChange={(e) => {
              const z = ZONAS_ESPANA.find((x) => x.nombre === e.target.value);
              if (z) irAZona(z);
            }}
            className="mt-2 w-full rounded-lg border border-border bg-bg/60 px-3 py-2 text-sm text-text outline-none focus:border-p"
          >
            <option value="">Todas las capitales…</option>
            {ZONAS_ESPANA.map((z) => (
              <option key={z.nombre} value={z.nombre}>
                {z.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="border-t border-border" />

        {/* Sector + radio */}
        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-muted">
            Sector
          </label>
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value as Agente | "todos")}
            className="mt-1.5 w-full rounded-lg border border-border bg-bg/60 px-3 py-2 text-sm text-text outline-none focus:border-p"
          >
            <option value="todos">Todos</option>
            {AGENTES.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label} · {a.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-muted">
            Radio
          </label>
          <div className="mt-1.5 grid grid-cols-3 gap-1.5">
            {RADIOS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRadio(r)}
                className={`rounded-lg border px-2 py-1.5 text-sm transition-colors ${
                  radio === r
                    ? "border-p bg-p/15 text-text"
                    : "border-border text-muted hover:text-text"
                }`}
              >
                {r} km
              </button>
            ))}
          </div>
        </div>

        {/* Prospección individual */}
        <button
          type="button"
          onClick={prospectar}
          disabled={ocupado}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-p px-3.5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-p2 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {loading ? "Sofía buscando…" : "Prospectar esta zona"}
        </button>

        <p className="flex items-start gap-1.5 text-xs text-muted">
          <MousePointerClick className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {clickedPoint
            ? `Punto: ${clickedPoint.lat.toFixed(4)}, ${clickedPoint.lng.toFixed(4)}`
            : "Click en el mapa o elige una zona arriba."}
        </p>

        <div className="border-t border-border" />

        {/* Prospección masiva */}
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted">
            <Layers className="h-3.5 w-3.5" /> Prospección masiva
          </label>
          <div className="mt-1.5 max-h-40 overflow-y-auto rounded-lg border border-border bg-bg/40 p-2">
            {ZONAS_ESPANA.map((z) => (
              <label
                key={z.nombre}
                className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm text-muted hover:bg-white/[0.04]"
              >
                <input
                  type="checkbox"
                  checked={massZonas.includes(z.nombre)}
                  onChange={() => toggleMassZona(z.nombre)}
                  className="accent-p"
                />
                {z.nombre}
              </label>
            ))}
          </div>

          <div className="mt-1.5 flex items-center justify-between text-xs text-muted">
            <span>{massZonas.length} seleccionadas</span>
            {massZonas.length > 0 && (
              <button
                type="button"
                onClick={() => setMassZonas([])}
                className="transition-colors hover:text-text"
              >
                Limpiar
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={prospeccionMasiva}
            disabled={ocupado || massZonas.length === 0}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-g px-3.5 py-2.5 text-sm font-medium text-bg transition-colors hover:opacity-90 disabled:opacity-50"
          >
            {massRunning && <Loader2 className="h-4 w-4 animate-spin" />}
            {massRunning && massProgress
              ? `${massProgress.done}/${massProgress.total} zonas completadas`
              : "Prospección masiva"}
          </button>
        </div>

        {/* Contador + mensajes */}
        <div className="rounded-lg border border-border bg-bg/40 px-3 py-2 text-sm">
          <span className="font-semibold tabular-nums text-text">
            {candidatos.length}
          </span>{" "}
          <span className="text-muted">prospectos encontrados</span>
        </div>

        {msg && (
          <p className="rounded-lg border border-p/30 bg-p/5 px-3 py-2 text-xs text-muted">
            {msg}
          </p>
        )}

        {/* Leyenda de colores por sector */}
        <div className="border-t border-border pt-3">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">
            Sectores
          </p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
            {AGENTES.map((a) => (
              <span key={a.id} className="flex items-center gap-1.5 text-xs text-muted">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: SECTOR_PIN_COLOR[a.id] }}
                />
                {a.label}
              </span>
            ))}
          </div>
        </div>
      </aside>

      {/* Mapa */}
      <div className="h-[78vh] min-h-[520px] flex-1 overflow-hidden rounded-xl border border-border">
        <LeafletMap
          center={MAJADAHONDA}
          prospectosExistentes={prospectosExistentes}
          candidatos={candidatos}
          clickedPoint={clickedPoint}
          flyTo={flyTo}
          addingTel={addingTel}
          onMapClick={setClickedPoint}
          onCenterChange={setCenter}
          onAddCandidate={anadirYLlamar}
        />
      </div>
    </div>
  );
}
