"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2 } from "lucide-react";
import { SECTOR_PIN_COLOR, PROSPECTO_PRIORIDAD } from "@/lib/labels";
import type { CallCenterProspecto } from "@/lib/types";
import type { CandidatoMapa } from "./mapa-view";

// Fix conocido del icono por defecto de Leaflet con bundlers (Next/webpack).
// Aunque usamos divIcon de color para los pines, se aplica por robustez.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

/** Pin teardrop de color como divIcon (sin depender de imágenes externas). */
function pinIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<svg width="26" height="36" viewBox="0 0 26 36" xmlns="http://www.w3.org/2000/svg"><path d="M13 0C5.8 0 0 5.8 0 13c0 9.2 13 23 13 23s13-13.8 13-23C26 5.8 20.2 0 13 0z" fill="${color}" stroke="rgba(0,0,0,0.45)" stroke-width="1"/><circle cx="13" cy="13" r="5" fill="#fff" fill-opacity="0.9"/></svg>`,
    iconSize: [26, 36],
    iconAnchor: [13, 36],
    popupAnchor: [0, -34],
  });
}

const PIN_PUNTO = pinIcon("#7c4dff"); // punto pulsado (púrpura WhiteMoon)

function PrioridadBadge({ prioridad }: { prioridad: number | null }) {
  const p = PROSPECTO_PRIORIDAD[prioridad ?? 2] ?? PROSPECTO_PRIORIDAD[2];
  return (
    <span style={{ color: p.color, fontWeight: 600 }}>
      {p.emoji} {p.label}
    </span>
  );
}

function MapEvents({
  onMapClick,
  onCenterChange,
}: {
  onMapClick: (p: { lat: number; lng: number }) => void;
  onCenterChange: (c: { lat: number; lng: number }) => void;
}) {
  const map = useMapEvents({
    click(e) {
      onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
    moveend() {
      const c = map.getCenter();
      onCenterChange({ lat: c.lat, lng: c.lng });
    },
  });
  return null;
}

/** Recentra el mapa cuando cambia `target` (selección de zona/ciudad). */
function Recenter({ target }: { target: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.setView([target.lat, target.lng], 13, { animate: true });
  }, [target, map]);
  return null;
}

export function LeafletMap({
  center,
  prospectosExistentes,
  candidatos,
  clickedPoint,
  flyTo,
  addingTel,
  onMapClick,
  onCenterChange,
  onAddCandidate,
}: {
  center: { lat: number; lng: number };
  prospectosExistentes: CallCenterProspecto[];
  candidatos: CandidatoMapa[];
  clickedPoint: { lat: number; lng: number } | null;
  flyTo: { lat: number; lng: number } | null;
  addingTel: string | null;
  onMapClick: (p: { lat: number; lng: number }) => void;
  onCenterChange: (c: { lat: number; lng: number }) => void;
  onAddCandidate: (c: CandidatoMapa) => void;
}) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={12}
      className="h-full w-full"
      style={{ background: "#08080d" }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={20}
      />

      <MapEvents onMapClick={onMapClick} onCenterChange={onCenterChange} />
      <Recenter target={flyTo} />

      {/* Prospectos ya existentes (con coordenadas) */}
      {prospectosExistentes.map((p) =>
        p.lat != null && p.lng != null ? (
          <Marker
            key={p.id}
            position={[p.lat, p.lng]}
            icon={pinIcon(SECTOR_PIN_COLOR[p.agente] ?? "#8888a0")}
          >
            <Popup>
              <div style={{ minWidth: 180 }}>
                <strong>{p.nombre ?? p.empresa ?? "Prospecto"}</strong>
                <div>📞 {p.telefono}</div>
                {p.dolor && <div style={{ marginTop: 4 }}>💡 {p.dolor}</div>}
                <div style={{ marginTop: 4 }}>
                  <PrioridadBadge prioridad={p.prioridad} />
                </div>
                <div style={{ marginTop: 4, color: "#888" }}>
                  Ya en tu lista de prospectos
                </div>
              </div>
            </Popup>
          </Marker>
        ) : null,
      )}

      {/* Candidatos encontrados por Sofía */}
      {candidatos.map((c, i) => (
        <Marker
          key={`cand-${i}`}
          position={[c.lat, c.lng]}
          icon={pinIcon(SECTOR_PIN_COLOR[c.sector] ?? "#8888a0")}
        >
          <Popup>
            <div style={{ minWidth: 200 }}>
              <strong>{c.nombre}</strong>
              <div>📞 {c.telefono}</div>
              {c.rating != null && <div>⭐ {c.rating}</div>}
              {c.dolor && <div style={{ marginTop: 4 }}>💡 {c.dolor}</div>}
              <div style={{ marginTop: 4 }}>
                <PrioridadBadge prioridad={c.prioridad} />
              </div>
              <button
                type="button"
                onClick={() => onAddCandidate(c)}
                disabled={addingTel === c.telefono}
                style={{
                  marginTop: 8,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "#7c4dff",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "6px 10px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {addingTel === c.telefono && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                📞 Añadir y llamar
              </button>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Punto pulsado en el mapa */}
      {clickedPoint && (
        <Marker position={[clickedPoint.lat, clickedPoint.lng]} icon={PIN_PUNTO} />
      )}
    </MapContainer>
  );
}
