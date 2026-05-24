"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Search, Loader2, MousePointerClick } from "lucide-react";
import { AGENTES } from "@/lib/agentes";
import { SECTOR_PIN_COLOR } from "@/lib/labels";
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

// El mapa Leaflet se carga solo en cliente: window/Leaflet no existen en SSR.
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
  const [msg, setMsg] = useState<string | null>(null);
  const [addingTel, setAddingTel] = useState<string | null>(null);

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

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      {/* Panel izquierdo */}
      <aside className="shrink-0 space-y-4 rounded-xl border border-border bg-card/40 p-4 lg:w-[300px]">
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

        <button
          type="button"
          onClick={prospectar}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-p px-3.5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-p2 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          {loading ? "Sofía buscando…" : "🔍 Prospectar esta zona"}
        </button>

        <div className="rounded-lg border border-border bg-bg/40 px-3 py-2 text-sm">
          <span className="font-semibold tabular-nums text-text">
            {candidatos.length}
          </span>{" "}
          <span className="text-muted">prospectos encontrados</span>
        </div>

        <p className="flex items-start gap-1.5 text-xs text-muted">
          <MousePointerClick className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {clickedPoint
            ? `Punto elegido: ${clickedPoint.lat.toFixed(4)}, ${clickedPoint.lng.toFixed(4)}`
            : "Haz click en el mapa para elegir el punto (si no, se usa el centro visible)."}
        </p>

        {msg && (
          <p className="rounded-lg border border-[#ff6b6b]/30 bg-[#ff6b6b]/5 px-3 py-2 text-xs text-[#ff9b9b]">
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
          addingTel={addingTel}
          onMapClick={setClickedPoint}
          onCenterChange={setCenter}
          onAddCandidate={anadirYLlamar}
        />
      </div>
    </div>
  );
}
