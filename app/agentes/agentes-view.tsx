"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  ContactShadows,
  Float,
  Grid,
  Html,
  OrbitControls,
  PerspectiveCamera,
  RoundedBox,
} from "@react-three/drei";
import * as THREE from "three";
import { AGENTES } from "@/lib/agentes";
import type { AgenteRanked } from "@/lib/ranking";
import type { Agente, EstadoAnim } from "@/lib/types";

// ---------------------------------------------------------------------------
// Metadatos de presentación
// ---------------------------------------------------------------------------

const ESTADO_ANIM: Record<EstadoAnim, { label: string; color: string }> = {
  disponible: { label: "Disponible", color: "#8888a0" },
  llamando: { label: "Llamando", color: "#4da8ff" },
  tramitando: { label: "Tramitando", color: "#9d70ff" },
  celebrando: { label: "Celebrando", color: "#00d4aa" },
};

const CONFETTI_COLORES = ["#7c4dff", "#00d4aa", "#ffce54", "#ff6fae", "#4da8ff"];

// Posiciones fijas (x, z) de cada agente en la oficina, en orden de AGENTES.
// Se mantienen fijas aunque cambie el ranking para que la oficina no "salte".
const POSICIONES: [number, number][] = [
  [-4.2, 0.4],
  [-2.5, -0.7],
  [-0.85, -1.15],
  [0.85, -1.15],
  [2.5, -0.7],
  [4.2, 0.4],
];

const POS_POR_ID = new Map<Agente, [number, number]>(
  AGENTES.map((a, i) => [a.id, POSICIONES[i]]),
);

// ---------------------------------------------------------------------------
// Confeti (estado "celebrando")
// ---------------------------------------------------------------------------

function Confetti() {
  const ref = useRef<THREE.Group>(null);
  const piezas = useMemo(
    () =>
      Array.from({ length: 22 }, () => ({
        x: (Math.random() - 0.5) * 1.3,
        z: (Math.random() - 0.5) * 1.3,
        y: Math.random() * 1.6,
        vel: 0.4 + Math.random() * 0.7,
        rot: Math.random() * Math.PI,
        col: CONFETTI_COLORES[Math.floor(Math.random() * CONFETTI_COLORES.length)],
      })),
    [],
  );

  useFrame((_, delta) => {
    const g = ref.current;
    if (!g) return;
    g.children.forEach((m, i) => {
      m.position.y -= piezas[i].vel * delta;
      m.rotation.x += delta * 3;
      m.rotation.y += delta * 2.2;
      if (m.position.y < 0) m.position.y = 1.6;
    });
  });

  return (
    <group ref={ref} position={[0, 1.7, 0]}>
      {piezas.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]} rotation={[p.rot, p.rot, 0]}>
          <planeGeometry args={[0.07, 0.07]} />
          <meshStandardMaterial
            color={p.col}
            emissive={p.col}
            emissiveIntensity={0.5}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

// ---------------------------------------------------------------------------
// Corona del líder
// ---------------------------------------------------------------------------

function Corona() {
  const oro = "#ffce54";
  return (
    <Float speed={3} rotationIntensity={1.2} floatIntensity={0.5}>
      <group position={[0, 2.35, 0]}>
        <mesh>
          <cylinderGeometry args={[0.16, 0.16, 0.1, 18, 1, true]} />
          <meshStandardMaterial
            color={oro}
            metalness={0.9}
            roughness={0.25}
            emissive="#7a5600"
            emissiveIntensity={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
        {Array.from({ length: 5 }).map((_, i) => {
          const a = (i / 5) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.16, 0.09, Math.sin(a) * 0.16]}>
              <coneGeometry args={[0.04, 0.13, 8]} />
              <meshStandardMaterial
                color={oro}
                metalness={0.9}
                roughness={0.25}
                emissive="#7a5600"
                emissiveIntensity={0.6}
              />
            </mesh>
          );
        })}
      </group>
    </Float>
  );
}

// ---------------------------------------------------------------------------
// Mesa (estado "tramitando")
// ---------------------------------------------------------------------------

function Mesa({ color }: { color: string }) {
  return (
    <group position={[0, 0, 0.7]}>
      <RoundedBox args={[1.1, 0.06, 0.55]} radius={0.02} position={[0, 0.55, 0]}>
        <meshStandardMaterial color="#15151f" metalness={0.3} roughness={0.6} />
      </RoundedBox>
      {[
        [-0.5, -0.22],
        [0.5, -0.22],
        [-0.5, 0.22],
        [0.5, 0.22],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.27, z]}>
          <boxGeometry args={[0.05, 0.55, 0.05]} />
          <meshStandardMaterial color="#0d0d14" />
        </mesh>
      ))}
      {/* Monitor */}
      <mesh position={[0, 0.78, -0.05]}>
        <boxGeometry args={[0.42, 0.26, 0.03]} />
        <meshStandardMaterial
          color="#05050a"
          emissive={color}
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Avatar low-poly tipo Sims con outfit ejecutivo
// ---------------------------------------------------------------------------

function Avatar({
  agent,
  selected,
  esLider,
  onSelect,
}: {
  agent: AgenteRanked;
  selected: boolean;
  esLider: boolean;
  onSelect: (id: Agente) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const [hover, setHover] = useState(false);

  const base = POS_POR_ID.get(agent.id) ?? [0, 0];
  const fem = agent.genero === "femenino";
  const o = agent.outfit;
  const fase = useMemo(() => Math.random() * Math.PI * 2, []);
  const piernaColor = fem ? o.piel : "#1c1c26";

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;

    // Reset de articulaciones cada frame
    [legL, legR].forEach((r) => r.current && (r.current.rotation.x = 0));
    [armL, armR].forEach((r) => {
      if (r.current) {
        r.current.rotation.x = 0;
        r.current.rotation.z = 0;
      }
    });

    switch (agent.estadoLive) {
      case "llamando": {
        // Camina en círculo por su zona de la oficina
        const ang = t * 0.5 + fase;
        const r = 0.9;
        g.position.x = base[0] + Math.cos(ang) * r;
        g.position.z = base[1] + Math.sin(ang) * r;
        g.position.y = Math.abs(Math.sin(t * 6)) * 0.03;
        g.rotation.y = -ang + Math.PI / 2;
        const sw = Math.sin(t * 6) * 0.5;
        if (legL.current) legL.current.rotation.x = sw;
        if (legR.current) legR.current.rotation.x = -sw;
        if (armL.current) armL.current.rotation.x = -sw;
        if (armR.current) armR.current.rotation.x = sw;
        break;
      }
      case "tramitando": {
        // Sentado en la mesa
        g.position.set(base[0], -0.35, base[1]);
        g.rotation.y = 0;
        if (legL.current) legL.current.rotation.x = -1.4;
        if (legR.current) legR.current.rotation.x = -1.4;
        const typ = Math.sin(t * 8 + fase) * 0.15;
        if (armL.current) armL.current.rotation.x = -1.0 + typ;
        if (armR.current) armR.current.rotation.x = -1.0 - typ;
        break;
      }
      case "celebrando": {
        // Salta con los brazos en alto
        g.position.x = base[0];
        g.position.z = base[1];
        g.position.y = Math.abs(Math.sin(t * 4 + fase)) * 0.4;
        g.rotation.y = Math.sin(t * 2) * 0.25;
        const up = 2.3 + Math.sin(t * 9) * 0.15;
        if (armL.current) armL.current.rotation.z = up;
        if (armR.current) armR.current.rotation.z = -up;
        break;
      }
      default: {
        // Disponible: respiración sutil + ligero balanceo
        g.position.x = base[0];
        g.position.z = base[1];
        g.position.y = Math.sin(t * 1.2 + fase) * 0.03;
        g.rotation.y = Math.sin(t * 0.4 + fase) * 0.15;
        const br = Math.sin(t * 1.5 + fase) * 0.05;
        if (armL.current) armL.current.rotation.x = br;
        if (armR.current) armR.current.rotation.x = -br;
      }
    }

    // Escala al seleccionar / hover
    const objetivo = selected ? 1.12 : hover ? 1.05 : 1;
    const s = THREE.MathUtils.lerp(g.scale.x, objetivo, 0.12);
    g.scale.set(s, s, s);
  });

  const piel = <meshStandardMaterial color={o.piel} roughness={0.7} />;
  const traje = <meshStandardMaterial color={o.traje} roughness={0.5} metalness={0.1} />;

  return (
    <group
      ref={group}
      position={[base[0], 0, base[1]]}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect(agent.id);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHover(false);
        document.body.style.cursor = "auto";
      }}
    >
      {/* Anillo de selección en el suelo */}
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.72, 0.88, 48]} />
          <meshBasicMaterial color={agent.color} transparent opacity={0.7} />
        </mesh>
      )}

      {/* Piernas */}
      <group ref={legL} position={[-0.16, 0.78, 0]}>
        <mesh position={[0, -0.39, 0]}>
          <cylinderGeometry args={[0.1, 0.09, 0.78, 12]} />
          <meshStandardMaterial color={piernaColor} roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.8, 0.06]}>
          <boxGeometry args={[0.14, 0.08, 0.24]} />
          <meshStandardMaterial color="#0d0d14" />
        </mesh>
      </group>
      <group ref={legR} position={[0.16, 0.78, 0]}>
        <mesh position={[0, -0.39, 0]}>
          <cylinderGeometry args={[0.1, 0.09, 0.78, 12]} />
          <meshStandardMaterial color={piernaColor} roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.8, 0.06]}>
          <boxGeometry args={[0.14, 0.08, 0.24]} />
          <meshStandardMaterial color="#0d0d14" />
        </mesh>
      </group>

      {/* Falda (femenino) */}
      {fem && (
        <mesh position={[0, 0.62, 0]}>
          <cylinderGeometry args={[0.22, 0.44, 0.5, 16]} />
          <meshStandardMaterial color={o.complemento} roughness={0.6} />
        </mesh>
      )}

      {/* Torso: traje o blazer */}
      <RoundedBox args={[0.62, 0.74, 0.36]} radius={0.08} smoothness={4} position={[0, 1.18, 0]}>
        {traje}
      </RoundedBox>

      {/* Corbata (masculino) */}
      {!fem && (
        <mesh position={[0, 1.12, 0.19]}>
          <boxGeometry args={[0.08, 0.4, 0.02]} />
          <meshStandardMaterial color={o.complemento} roughness={0.4} />
        </mesh>
      )}

      {/* Brazos (pivote en el hombro) */}
      <group ref={armL} position={[-0.4, 1.48, 0]}>
        <mesh position={[0, -0.3, 0]}>
          <capsuleGeometry args={[0.08, 0.5, 4, 8]} />
          {traje}
        </mesh>
        <mesh position={[0, -0.62, 0]}>
          <sphereGeometry args={[0.08, 12, 12]} />
          <meshStandardMaterial color={o.piel} roughness={0.7} />
        </mesh>
      </group>
      <group ref={armR} position={[0.4, 1.48, 0]}>
        <mesh position={[0, -0.3, 0]}>
          <capsuleGeometry args={[0.08, 0.5, 4, 8]} />
          {traje}
        </mesh>
        <mesh position={[0, -0.62, 0]}>
          <sphereGeometry args={[0.08, 12, 12]} />
          <meshStandardMaterial color={o.piel} roughness={0.7} />
        </mesh>
      </group>

      {/* Cuello */}
      <mesh position={[0, 1.6, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.12, 12]} />
        {piel}
      </mesh>

      {/* Cabeza */}
      <mesh position={[0, 1.84, 0]}>
        <sphereGeometry args={[0.26, 24, 24]} />
        {piel}
      </mesh>

      {/* Pelo: casquete superior */}
      <mesh position={[0, 1.86, -0.02]}>
        <sphereGeometry args={[0.285, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
        <meshStandardMaterial color={o.pelo} roughness={0.85} />
      </mesh>
      {/* Pelo largo (femenino) */}
      {fem &&
        [-0.23, 0.23].map((x, i) => (
          <mesh key={i} position={[x, 1.62, -0.04]}>
            <boxGeometry args={[0.1, 0.42, 0.16]} />
            <meshStandardMaterial color={o.pelo} roughness={0.85} />
          </mesh>
        ))}

      {/* Auriculares */}
      <mesh position={[0, 1.84, 0]}>
        <torusGeometry args={[0.27, 0.025, 8, 20, Math.PI]} />
        <meshStandardMaterial color="#15151c" metalness={0.5} roughness={0.4} />
      </mesh>
      {[-0.27, 0.27].map((x, i) => (
        <mesh key={i} position={[x, 1.82, 0]}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial
            color={agent.color}
            emissive={agent.color}
            emissiveIntensity={0.4}
          />
        </mesh>
      ))}
      {/* Micrófono */}
      <mesh position={[0.16, 1.74, 0.2]} rotation={[0, 0, -0.5]}>
        <boxGeometry args={[0.03, 0.18, 0.03]} />
        <meshStandardMaterial color="#15151c" />
      </mesh>

      {/* Mesa cuando está tramitando */}
      {agent.estadoLive === "tramitando" && <Mesa color={agent.color} />}

      {/* Confeti cuando celebra */}
      {agent.estadoLive === "celebrando" && <Confetti />}

      {/* Corona del líder */}
      {esLider && <Corona />}

      {/* Etiqueta flotante */}
      <Html position={[0, 2.55, 0]} center distanceFactor={9} zIndexRange={[10, 0]}>
        <div
          style={{
            pointerEvents: "none",
            whiteSpace: "nowrap",
            transform: "translateY(-50%)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 600,
            color: "#f0f0f5",
            background: "rgba(8,8,13,0.78)",
            border: `1px solid ${agent.color}66`,
            backdropFilter: "blur(4px)",
          }}
        >
          {esLider && <span>👑</span>}
          <span>{agent.nombre}</span>
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: 999,
              background: ESTADO_ANIM[agent.estadoLive].color,
            }}
          />
        </div>
      </Html>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Escena de la oficina
// ---------------------------------------------------------------------------

function Oficina({
  ranking,
  selected,
  onSelect,
}: {
  ranking: AgenteRanked[];
  selected: Agente | null;
  onSelect: (id: Agente | null) => void;
}) {
  const liderId = ranking.find((r) => r.posicion === 1)?.id ?? null;

  return (
    <>
      <color attach="background" args={["#08080d"]} />
      <fog attach="fog" args={["#08080d", 9, 24]} />

      <PerspectiveCamera makeDefault position={[0, 3.4, 8.5]} fov={42} />
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={5.5}
        maxDistance={13}
        minPolarAngle={0.6}
        maxPolarAngle={1.45}
        target={[0, 1, -0.4]}
        autoRotate
        autoRotateSpeed={0.35}
        enableDamping
      />

      {/* Iluminación WhiteMoon */}
      <ambientLight intensity={0.55} color="#8a7fff" />
      <directionalLight position={[4, 9, 5]} intensity={1.1} color="#ffffff" />
      <pointLight position={[-6, 4, -3]} intensity={1.4} decay={0} color="#7c4dff" />
      <pointLight position={[6, 3, 4]} intensity={1.1} decay={0} color="#00d4aa" />

      {/* Suelo tipo rejilla */}
      <Grid
        position={[0, 0, 0]}
        args={[40, 40]}
        cellSize={0.6}
        cellThickness={0.6}
        cellColor="#1c1630"
        sectionSize={3}
        sectionThickness={1}
        sectionColor="#7c4dff"
        fadeDistance={24}
        fadeStrength={1.2}
        infiniteGrid
      />
      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.45}
        scale={26}
        blur={2.6}
        far={6}
        color="#000000"
      />

      {/* Pantallón decorativo de la pared del fondo */}
      <RoundedBox args={[7, 2.6, 0.15]} radius={0.1} position={[0, 2.6, -5]}>
        <meshStandardMaterial
          color="#0c0c16"
          emissive="#7c4dff"
          emissiveIntensity={0.18}
          metalness={0.4}
          roughness={0.5}
        />
      </RoundedBox>

      {ranking.map((a) => (
        <Avatar
          key={a.id}
          agent={a}
          selected={selected === a.id}
          esLider={a.id === liderId}
          onSelect={onSelect}
        />
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// Overlays DOM: pantalla de clasificación + panel de stats
// ---------------------------------------------------------------------------

const MEDALLAS = ["🥇", "🥈", "🥉"];

function PantallaRanking({
  ranking,
  selected,
  onSelect,
}: {
  ranking: AgenteRanked[];
  selected: Agente | null;
  onSelect: (id: Agente) => void;
}) {
  const maxScore = Math.max(...ranking.map((r) => r.score), 1);

  return (
    <div className="pointer-events-auto absolute left-3 top-3 w-[clamp(240px,32vw,320px)] rounded-xl border border-p/30 bg-bg/70 p-4 shadow-[0_0_40px_-12px_rgba(124,77,255,0.5)] backdrop-blur-md">
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-g opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-g" />
        </span>
        <h2 className="text-sm font-semibold tracking-tight">
          Clasificación en vivo
        </h2>
      </div>

      <ol className="mt-3 space-y-1.5">
        {ranking.map((a, i) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={() => onSelect(a.id)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors ${
                selected === a.id ? "bg-white/[0.07]" : "hover:bg-white/[0.04]"
              }`}
            >
              <span className="w-5 shrink-0 text-center text-sm tabular-nums">
                {i < 3 ? MEDALLAS[i] : a.posicion}
              </span>
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: a.color }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium">{a.nombre}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted">
                    {a.score}
                  </span>
                </div>
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(a.score / maxScore) * 100}%`,
                      backgroundColor: a.color,
                    }}
                  />
                </div>
              </div>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

function LeyendaEstados() {
  return (
    <div className="pointer-events-none absolute bottom-3 right-3 flex flex-wrap justify-end gap-x-3 gap-y-1 rounded-lg border border-border bg-bg/60 px-3 py-2 text-[11px] backdrop-blur-md">
      {(Object.keys(ESTADO_ANIM) as EstadoAnim[]).map((e) => (
        <span key={e} className="flex items-center gap-1.5 text-muted">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: ESTADO_ANIM[e].color }}
          />
          {ESTADO_ANIM[e].label}
        </span>
      ))}
    </div>
  );
}

function StatMini({ valor, etiqueta, color }: { valor: number; etiqueta: string; color?: string }) {
  return (
    <div className="rounded-md bg-white/[0.03] py-1.5 text-center">
      <p
        className="text-base font-semibold tabular-nums"
        style={color ? { color } : undefined}
      >
        {valor}
      </p>
      <p className="text-[10px] uppercase tracking-wider text-muted">{etiqueta}</p>
    </div>
  );
}

function PanelStats({
  ranking,
  selected,
  onSelect,
}: {
  ranking: AgenteRanked[];
  selected: Agente | null;
  onSelect: (id: Agente) => void;
}) {
  return (
    <aside className="space-y-3">
      {ranking.map((a) => {
        const est = ESTADO_ANIM[a.estadoLive];
        const activo = selected === a.id;
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onSelect(a.id)}
            className={`w-full rounded-xl border bg-card/50 p-4 text-left transition-colors ${
              activo ? "bg-card" : "hover:bg-card"
            }`}
            style={{ borderColor: activo ? `${a.color}80` : undefined }}
          >
            <div className="flex items-center gap-3">
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg"
                style={{ backgroundColor: `${a.color}1f` }}
              >
                {a.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium leading-tight">
                    {a.nombre}
                  </span>
                  <span className="shrink-0 text-xs text-muted">
                    #{a.posicion}
                  </span>
                </div>
                <p className="truncate text-xs text-muted">{a.sector}</p>
              </div>
              <span
                className="flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px]"
                style={{ backgroundColor: `${est.color}1f`, color: est.color }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: est.color }}
                />
                {est.label}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-1.5">
              <StatMini valor={a.stats.llamadas} etiqueta="Llam." />
              <StatMini valor={a.stats.contactos} etiqueta="Cont." color="#4da8ff" />
              <StatMini valor={a.stats.citas} etiqueta="Citas" color="#00d4aa" />
              <StatMini valor={a.stats.cierres} etiqueta="Cierres" color="#ffce54" />
            </div>
          </button>
        );
      })}
    </aside>
  );
}

// ---------------------------------------------------------------------------
// Vista principal
// ---------------------------------------------------------------------------

export function AgentesView({
  ranking,
  seleccionadoInicial = null,
}: {
  ranking: AgenteRanked[];
  seleccionadoInicial?: Agente | null;
}) {
  const [selected, setSelected] = useState<Agente | null>(seleccionadoInicial);
  const [mounted, setMounted] = useState(false);

  // El Canvas (WebGL) solo se monta en cliente para evitar SSR/hidratación.
  useEffect(() => setMounted(true), []);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="relative h-[clamp(420px,58vh,640px)] overflow-hidden rounded-2xl border border-border bg-card/30">
        {mounted ? (
          <Canvas
            dpr={[1, 2]}
            shadows={false}
            gl={{ antialias: true, powerPreference: "high-performance" }}
            onPointerMissed={() => setSelected(null)}
          >
            <Suspense fallback={null}>
              <Oficina
                ranking={ranking}
                selected={selected}
                onSelect={setSelected}
              />
            </Suspense>
          </Canvas>
        ) : (
          <div className="grid h-full place-items-center text-sm text-muted">
            Cargando oficina 3D…
          </div>
        )}

        <PantallaRanking
          ranking={ranking}
          selected={selected}
          onSelect={setSelected}
        />
        <LeyendaEstados />
      </div>

      <PanelStats ranking={ranking} selected={selected} onSelect={setSelected} />
    </div>
  );
}
