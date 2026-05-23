"use client";

import { Suspense, useMemo, useRef, useState, type ComponentProps } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Billboard,
  Float,
  OrbitControls,
  PerspectiveCamera,
  RoundedBox,
  Text,
} from "@react-three/drei";
import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { AGENTES } from "@/lib/agentes";
import type { AgenteRanked } from "@/lib/ranking";
import type { Agente } from "@/lib/types";

// RectAreaLight necesita estos uniforms para iluminar (solo en cliente).
if (typeof window !== "undefined") {
  RectAreaLightUniformsLib.init();
}

// ---------------------------------------------------------------------------
// Distribución de la oficina: 2 filas de 3 puestos (posiciones sin cambios).
//   Fila frontal (z = -2):  Marcos · Laura · Diego
//   Fila trasera (z = -5):  Carlos · Ana   · Sara
// ---------------------------------------------------------------------------

const STATIONS: Record<Agente, { x: number; z: number }> = {
  dental: { x: -3, z: -2 },
  gestoria: { x: 0, z: -2 },
  taller: { x: 3, z: -2 },
  inmobiliaria: { x: -3, z: -5 },
  estetica: { x: 0, z: -5 },
  hosteleria: { x: 3, z: -5 },
};

const AISLE_Z = -3.5; // pasillo entre filas
const CONFETTI_COLORES = ["#7c4dff", "#00d4aa", "#ffce54", "#ff6fae", "#4da8ff"];
const LIBRO_COLORES = ["#7c4dff", "#00d4aa", "#ffce54", "#ff6fae", "#4da8ff", "#9d70ff"];

// Dimensiones de la sala
const ROOM = { x: 7, zBack: -7, zFront: 4, h: 4 };

// <Text> en su propio Suspense: la carga de fuente no bloquea la escena.
function SafeText(props: ComponentProps<typeof Text>) {
  return (
    <Suspense fallback={null}>
      <Text {...props} />
    </Suspense>
  );
}

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
      if (m.position.y < 0) m.position.y = 1.7;
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
// Mobiliario del puesto: mesa, monitor, teclado, cajonera, cable, silla
// ---------------------------------------------------------------------------

function Monitor() {
  const cajaGeo = useMemo(() => new THREE.BoxGeometry(0.8, 0.6, 0.05), []);
  const edges = useMemo(() => new THREE.EdgesGeometry(cajaGeo), [cajaGeo]);
  return (
    <group position={[0, 1.0, -0.15]} rotation={[-0.17, 0, 0]}>
      <mesh geometry={cajaGeo} castShadow>
        <meshStandardMaterial color="#0e0e16" roughness={0.4} metalness={0.3} />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#7c4dff" />
      </lineSegments>
      <mesh position={[0, 0, 0.03]}>
        <planeGeometry args={[0.7, 0.5]} />
        <meshStandardMaterial
          color="#00d4aa"
          emissive="#00d4aa"
          emissiveIntensity={0.7}
          transparent
          opacity={0.85}
        />
      </mesh>
      <mesh position={[0, -0.42, 0.05]} rotation={[0.17, 0, 0]}>
        <boxGeometry args={[0.12, 0.22, 0.04]} />
        <meshStandardMaterial color="#0e0e16" />
      </mesh>
    </group>
  );
}

function Mesa() {
  return (
    <group>
      {/* Superficie gruesa */}
      <mesh position={[0, 0.62, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 0.1, 0.85]} />
        <meshStandardMaterial color="#1e1e2e" roughness={0.5} metalness={0.25} />
      </mesh>
      {/* Patas */}
      {(
        [
          [-0.64, -0.36],
          [0.64, -0.36],
          [-0.64, 0.36],
          [0.64, 0.36],
        ] as const
      ).map(([x, z], i) => (
        <mesh key={i} position={[x, 0.3, z]} castShadow>
          <boxGeometry args={[0.07, 0.6, 0.07]} />
          <meshStandardMaterial color="#111118" metalness={0.4} roughness={0.5} />
        </mesh>
      ))}
      {/* Cajonera lateral */}
      <mesh position={[0.5, 0.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.34, 0.5, 0.6]} />
        <meshStandardMaterial color="#13131e" roughness={0.6} />
      </mesh>
      {[0.42, 0.22].map((y, i) => (
        <mesh key={i} position={[0.68, y, 0]}>
          <boxGeometry args={[0.02, 0.02, 0.18]} />
          <meshStandardMaterial color="#7c4dff" />
        </mesh>
      ))}
      {/* Teclado */}
      <mesh position={[0, 0.68, 0.24]} castShadow>
        <boxGeometry args={[0.5, 0.03, 0.18]} />
        <meshStandardMaterial color="#0a0a14" roughness={0.6} />
      </mesh>
      {/* Cable del auricular (cae desde el monitor a la mesa) */}
      <mesh position={[-0.34, 0.5, -0.1]} rotation={[0.3, 0, 0.2]}>
        <cylinderGeometry args={[0.012, 0.012, 0.5, 6]} />
        <meshStandardMaterial color="#333333" roughness={0.8} />
      </mesh>
    </group>
  );
}

function Silla() {
  const respaldoGeo = useMemo(() => new THREE.BoxGeometry(0.5, 0.6, 0.05), []);
  const edges = useMemo(() => new THREE.EdgesGeometry(respaldoGeo), [respaldoGeo]);
  return (
    <group position={[0, 0, -0.25]}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[0.5, 0.05, 0.5]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.7} />
      </mesh>
      <group position={[0, 0.82, -0.22]}>
        <mesh geometry={respaldoGeo} castShadow>
          <meshStandardMaterial color="#1a1a2e" roughness={0.7} />
        </mesh>
        <lineSegments geometry={edges}>
          <lineBasicMaterial color="#7c4dff" transparent opacity={0.4} />
        </lineSegments>
      </group>
      {(
        [
          [-0.2, -0.2],
          [0.2, -0.2],
          [-0.2, 0.2],
          [0.2, 0.2],
        ] as const
      ).map(([x, z], i) => (
        <mesh key={i} position={[x, 0.25, z]}>
          <cylinderGeometry args={[0.025, 0.025, 0.5, 8]} />
          <meshStandardMaterial color="#0d0d14" />
        </mesh>
      ))}
    </group>
  );
}

function Estacion({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <group position={[0, 0, 0.5]}>
        <Mesa />
        <Monitor />
      </group>
      <Silla />
      {/* Foco púrpura sobre el puesto */}
      <pointLight position={[0, 2.2, 0.3]} intensity={0.3} distance={2} color="#7c4dff" />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Avatar low-poly con outfit ejecutivo
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

  const { x, z } = STATIONS[agent.id];
  const fem = agent.genero === "femenino";
  const o = agent.outfit;
  const fase = useMemo(() => Math.random() * Math.PI * 2, []);
  const piernaColor = fem ? o.piel : "#1c1c26";

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;

    [legL, legR].forEach((r) => r.current && (r.current.rotation.x = 0));
    [armL, armR].forEach((r) => {
      if (r.current) {
        r.current.rotation.x = 0;
        r.current.rotation.z = 0;
      }
    });

    switch (agent.estadoLive) {
      case "llamando": {
        const dir = Math.sin(t * 0.5 + fase);
        g.position.x = x + dir * 1.3;
        g.position.z = AISLE_Z;
        g.position.y = Math.abs(Math.sin(t * 6)) * 0.04;
        g.rotation.y = Math.cos(t * 0.5 + fase) >= 0 ? Math.PI / 2 : -Math.PI / 2;
        const sw = Math.sin(t * 6) * 0.5;
        if (legL.current) legL.current.rotation.x = sw;
        if (legR.current) legR.current.rotation.x = -sw;
        if (armL.current) armL.current.rotation.x = -sw;
        if (armR.current) armR.current.rotation.x = sw;
        break;
      }
      case "tramitando": {
        g.position.set(x, -0.33, z - 0.1);
        g.rotation.y = 0;
        if (legL.current) legL.current.rotation.x = -1.4;
        if (legR.current) legR.current.rotation.x = -1.4;
        const typ = Math.sin(t * 8 + fase) * 0.15;
        if (armL.current) armL.current.rotation.x = -1.0 + typ;
        if (armR.current) armR.current.rotation.x = -1.0 - typ;
        break;
      }
      case "celebrando": {
        g.position.x = x;
        g.position.z = z;
        g.position.y = Math.abs(Math.sin(t * 4 + fase)) * 0.4;
        g.rotation.y = Math.sin(t * 2) * 0.25;
        const up = 2.3 + Math.sin(t * 9) * 0.15;
        if (armL.current) armL.current.rotation.z = up;
        if (armR.current) armR.current.rotation.z = -up;
        break;
      }
      default: {
        g.position.x = x;
        g.position.z = z;
        g.position.y = Math.sin(t * 1.2 + fase) * 0.03;
        g.rotation.y = Math.sin(t * 0.4 + fase) * 0.12;
        const br = Math.sin(t * 1.5 + fase) * 0.05;
        if (armL.current) armL.current.rotation.x = br;
        if (armR.current) armR.current.rotation.x = -br;
      }
    }

    const objetivo = selected ? 1.12 : hover ? 1.05 : 1;
    const s = THREE.MathUtils.lerp(g.scale.x, objetivo, 0.12);
    g.scale.set(s, s, s);
  });

  const piel = <meshStandardMaterial color={o.piel} roughness={0.7} />;
  const traje = <meshStandardMaterial color={o.traje} roughness={0.5} metalness={0.1} />;

  return (
    <group
      ref={group}
      position={[x, 0, z]}
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
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[0.72, 0.88, 48]} />
          <meshBasicMaterial color={agent.color} transparent opacity={0.7} />
        </mesh>
      )}

      <group ref={legL} position={[-0.16, 0.78, 0]}>
        <mesh position={[0, -0.39, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.09, 0.78, 12]} />
          <meshStandardMaterial color={piernaColor} roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.8, 0.06]}>
          <boxGeometry args={[0.14, 0.08, 0.24]} />
          <meshStandardMaterial color="#0d0d14" />
        </mesh>
      </group>
      <group ref={legR} position={[0.16, 0.78, 0]}>
        <mesh position={[0, -0.39, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.09, 0.78, 12]} />
          <meshStandardMaterial color={piernaColor} roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.8, 0.06]}>
          <boxGeometry args={[0.14, 0.08, 0.24]} />
          <meshStandardMaterial color="#0d0d14" />
        </mesh>
      </group>

      {fem && (
        <mesh position={[0, 0.62, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.44, 0.5, 16]} />
          <meshStandardMaterial color={o.complemento} roughness={0.6} />
        </mesh>
      )}

      <RoundedBox
        args={[0.62, 0.74, 0.36]}
        radius={0.08}
        smoothness={4}
        position={[0, 1.18, 0]}
        castShadow
      >
        {traje}
      </RoundedBox>

      {!fem && (
        <mesh position={[0, 1.12, 0.19]}>
          <boxGeometry args={[0.08, 0.4, 0.02]} />
          <meshStandardMaterial color={o.complemento} roughness={0.4} />
        </mesh>
      )}

      <group ref={armL} position={[-0.4, 1.48, 0]}>
        <mesh position={[0, -0.3, 0]} castShadow>
          <capsuleGeometry args={[0.08, 0.5, 4, 8]} />
          {traje}
        </mesh>
        <mesh position={[0, -0.62, 0]}>
          <sphereGeometry args={[0.08, 12, 12]} />
          <meshStandardMaterial color={o.piel} roughness={0.7} />
        </mesh>
      </group>
      <group ref={armR} position={[0.4, 1.48, 0]}>
        <mesh position={[0, -0.3, 0]} castShadow>
          <capsuleGeometry args={[0.08, 0.5, 4, 8]} />
          {traje}
        </mesh>
        <mesh position={[0, -0.62, 0]}>
          <sphereGeometry args={[0.08, 12, 12]} />
          <meshStandardMaterial color={o.piel} roughness={0.7} />
        </mesh>
      </group>

      <mesh position={[0, 1.6, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.12, 12]} />
        {piel}
      </mesh>

      <mesh position={[0, 1.84, 0]} castShadow>
        <sphereGeometry args={[0.26, 24, 24]} />
        {piel}
      </mesh>

      <mesh position={[0, 1.86, -0.02]}>
        <sphereGeometry args={[0.285, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
        <meshStandardMaterial color={o.pelo} roughness={0.85} />
      </mesh>
      {fem &&
        [-0.23, 0.23].map((hx, i) => (
          <mesh key={i} position={[hx, 1.62, -0.04]}>
            <boxGeometry args={[0.1, 0.42, 0.16]} />
            <meshStandardMaterial color={o.pelo} roughness={0.85} />
          </mesh>
        ))}

      <mesh position={[0, 1.84, 0]}>
        <torusGeometry args={[0.27, 0.025, 8, 20, Math.PI]} />
        <meshStandardMaterial color="#15151c" metalness={0.5} roughness={0.4} />
      </mesh>
      {[-0.27, 0.27].map((ex, i) => (
        <mesh key={i} position={[ex, 1.82, 0]}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial
            color={agent.color}
            emissive={agent.color}
            emissiveIntensity={0.4}
          />
        </mesh>
      ))}
      <mesh position={[0.16, 1.74, 0.2]} rotation={[0, 0, -0.5]}>
        <boxGeometry args={[0.03, 0.18, 0.03]} />
        <meshStandardMaterial color="#15151c" />
      </mesh>

      {agent.estadoLive === "celebrando" && <Confetti />}
      {esLider && <Corona />}

      <Billboard position={[0, 2.55, 0]}>
        <SafeText
          fontSize={0.26}
          color={agent.color}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.012}
          outlineColor="#08080d"
        >
          {agent.nombre}
        </SafeText>
      </Billboard>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Estructura de la sala: suelo, alfombra, paredes, techo, ventanas, logo
// ---------------------------------------------------------------------------

function Suelo() {
  return (
    <>
      {/* Parquet de madera oscura */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -1.5]} receiveShadow>
        <planeGeometry args={[18, 15]} />
        <meshStandardMaterial color="#1a1208" roughness={0.9} metalness={0} />
      </mesh>
      {/* Alfombra central */}
      <mesh position={[0, 0.015, -2.5]} receiveShadow>
        <boxGeometry args={[10, 0.02, 6]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.95} metalness={0} />
      </mesh>
      <lineSegments position={[0, 0.03, -2.5]}>
        <edgesGeometry args={[new THREE.BoxGeometry(10, 0.02, 6)]} />
        <lineBasicMaterial color="#7c4dff" transparent opacity={0.5} />
      </lineSegments>
    </>
  );
}

// Pared de una sola cara con la normal hacia el interior (efecto casa de muñecas).
function Pared({
  position,
  rotation,
  args,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  args: [number, number];
}) {
  return (
    <group>
      <mesh position={position} rotation={rotation} receiveShadow>
        <planeGeometry args={args} />
        <meshStandardMaterial color="#0d0d18" roughness={0.95} metalness={0} />
      </mesh>
      {/* Rodapié */}
      <mesh position={[position[0], 0.1, position[2]]} rotation={rotation}>
        <planeGeometry args={[args[0], 0.2]} />
        <meshStandardMaterial
          color="#7c4dff"
          transparent
          opacity={0.4}
          emissive="#7c4dff"
          emissiveIntensity={0.3}
        />
      </mesh>
    </group>
  );
}

function Ventana({ z }: { z: number }) {
  return (
    <group position={[ROOM.x - 0.05, 2, z]} rotation={[0, -Math.PI / 2, 0]}>
      <mesh>
        <planeGeometry args={[2.2, 1.8]} />
        <meshStandardMaterial
          color="#0a1628"
          roughness={0.2}
          metalness={0.6}
          side={THREE.DoubleSide}
        />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.PlaneGeometry(2.2, 1.8)]} />
        <lineBasicMaterial color="#cdd6e6" transparent opacity={0.5} />
      </lineSegments>
      {/* Cruceta */}
      <mesh>
        <boxGeometry args={[2.2, 0.04, 0.02]} />
        <meshStandardMaterial color="#cdd6e6" transparent opacity={0.4} />
      </mesh>
      <mesh>
        <boxGeometry args={[0.04, 1.8, 0.02]} />
        <meshStandardMaterial color="#cdd6e6" transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

function PantallaCentral({ ranking }: { ranking: AgenteRanked[] }) {
  const top3 = ranking.slice(0, 3);
  return (
    <group position={[0, 2.3, ROOM.zBack + 0.12]}>
      {/* Logo WhiteMoon, centrado y arriba */}
      <SafeText
        position={[0, 1.45, 0]}
        fontSize={0.55}
        color="#7c4dff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.012}
        outlineColor="#08080d"
      >
        WhiteMoon
      </SafeText>

      {/* Marco emisivo púrpura */}
      <mesh position={[0, 0, -0.05]}>
        <boxGeometry args={[3.2, 2.2, 0.08]} />
        <meshStandardMaterial color="#7c4dff" emissive="#7c4dff" emissiveIntensity={1.3} />
      </mesh>
      {/* Panel */}
      <mesh>
        <boxGeometry args={[3, 2, 0.1]} />
        <meshStandardMaterial color="#111118" roughness={0.4} metalness={0.3} />
      </mesh>
      <SafeText
        position={[0, 0.72, 0.07]}
        fontSize={0.22}
        color="#9d70ff"
        anchorX="center"
        anchorY="middle"
        maxWidth={2.6}
        textAlign="center"
      >
        CLASIFICACIÓN EN VIVO
      </SafeText>
      {top3.map((a, i) => (
        <SafeText
          key={a.id}
          position={[0, 0.2 - i * 0.45, 0.07]}
          fontSize={0.2}
          color={a.color}
          anchorX="center"
          anchorY="middle"
        >
          {`${i + 1}.  ${a.nombre}   ${a.score}`}
        </SafeText>
      ))}
    </group>
  );
}

function Sala({ ranking }: { ranking: AgenteRanked[] }) {
  const { x, zBack, zFront, h } = ROOM;
  const depth = zFront - zBack;
  const width = x * 2;
  const cz = (zBack + zFront) / 2;

  return (
    <>
      <Suelo />

      {/* Paredes (normal hacia dentro) + techo */}
      <Pared position={[0, h / 2, zBack]} rotation={[0, 0, 0]} args={[width, h]} />
      <Pared position={[0, h / 2, zFront]} rotation={[0, Math.PI, 0]} args={[width, h]} />
      <Pared position={[-x, h / 2, cz]} rotation={[0, Math.PI / 2, 0]} args={[depth, h]} />
      <Pared position={[x, h / 2, cz]} rotation={[0, -Math.PI / 2, 0]} args={[depth, h]} />
      {/* Techo (normal hacia abajo) */}
      <mesh position={[0, h, cz]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color="#0b0b14" roughness={1} metalness={0} />
      </mesh>

      <Ventana z={-2} />
      <Ventana z={-5} />

      <PantallaCentral ranking={ranking} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Mobiliario decorativo: plantas, sofá, estantería, lámpara
// ---------------------------------------------------------------------------

function Planta({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.2, 0.4, 12]} />
        <meshStandardMaterial color="#2d1f0e" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.06, 0.7, 8]} />
        <meshStandardMaterial color="#3d2b0f" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.15, 0]} castShadow>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial color="#1a4a1a" roughness={0.9} />
      </mesh>
      {[
        [0, 1.45, 0],
        [-0.25, 1.25, 0.1],
        [0.22, 1.3, -0.12],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} castShadow>
          <coneGeometry args={[0.12, 0.35, 6]} />
          <meshStandardMaterial color="#2d6b2d" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function Sofa({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation={[0, Math.PI / 2, 0]}>
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[3, 0.4, 0.9]} />
        <meshStandardMaterial color="#1a1a3e" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.6, -0.38]} castShadow>
        <boxGeometry args={[3, 0.6, 0.18]} />
        <meshStandardMaterial color="#1a1a3e" roughness={0.8} />
      </mesh>
      {[-0.95, 0, 0.95].map((cx, i) => (
        <mesh key={i} position={[cx, 0.5, 0.05]} castShadow>
          <boxGeometry args={[0.85, 0.22, 0.7]} />
          <meshStandardMaterial color="#7c4dff" roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

function Estanteria({ position }: { position: [number, number, number] }) {
  const baldas = [0.5, 1.2, 1.9, 2.6];
  return (
    <group position={position} rotation={[0, Math.PI / 2, 0]}>
      <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.4, 3, 0.4]} />
        <meshStandardMaterial color="#13131e" roughness={0.6} />
      </mesh>
      {baldas.map((y, bi) =>
        Array.from({ length: 6 }).map((_, i) => (
          <mesh
            key={`${bi}-${i}`}
            position={[-1 + i * 0.36, y + 0.18, 0.05]}
            castShadow
          >
            <boxGeometry args={[0.12, 0.32, 0.24]} />
            <meshStandardMaterial
              color={LIBRO_COLORES[(bi + i) % LIBRO_COLORES.length]}
              roughness={0.7}
            />
          </mesh>
        )),
      )}
    </group>
  );
}

function LamparaPie({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.06, 16]} />
        <meshStandardMaterial color="#15151c" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.1, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 2.1, 8]} />
        <meshStandardMaterial color="#15151c" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 2.2, 0]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial
          color="#fff1c2"
          emissive="#ffcf6b"
          emissiveIntensity={1.4}
        />
      </mesh>
      <pointLight position={[0, 2.2, 0]} intensity={0.9} distance={6} color="#ffd98a" />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Sofía — directora, de pie frente a la pantalla de clasificación
// ---------------------------------------------------------------------------

function Sofia() {
  const group = useRef<THREE.Group>(null);
  const fase = useMemo(() => Math.random() * Math.PI * 2, []);
  const blazer = "#111118";
  const oro = "#f5c842";
  const piel = "#e8b89a";
  const pelo = "#1a120a";

  // Idle solemne: oscilación muy leve.
  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    g.position.y = Math.sin(t * 0.6 + fase) * 0.015;
    g.rotation.y = Math.sin(t * 0.3 + fase) * 0.06;
  });

  return (
    <group ref={group} position={[0, 0, -6]} scale={1.1}>
      {/* Piernas */}
      {[-0.16, 0.16].map((lx, i) => (
        <group key={i} position={[lx, 0.78, 0]}>
          <mesh position={[0, -0.39, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.09, 0.78, 12]} />
            <meshStandardMaterial color={piel} roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.8, 0.06]}>
            <boxGeometry args={[0.14, 0.08, 0.24]} />
            <meshStandardMaterial color="#0d0d14" />
          </mesh>
        </group>
      ))}

      {/* Falda negra */}
      <mesh position={[0, 0.62, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.44, 0.5, 16]} />
        <meshStandardMaterial color="#15151c" roughness={0.6} />
      </mesh>
      {/* Cinturón dorado */}
      <mesh position={[0, 0.82, 0]}>
        <cylinderGeometry args={[0.34, 0.34, 0.06, 24, 1, true]} />
        <meshStandardMaterial
          color={oro}
          metalness={0.8}
          roughness={0.3}
          emissive={oro}
          emissiveIntensity={0.25}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Torso: blazer negro */}
      <RoundedBox
        args={[0.62, 0.74, 0.36]}
        radius={0.08}
        smoothness={4}
        position={[0, 1.18, 0]}
        castShadow
      >
        <meshStandardMaterial color={blazer} roughness={0.5} metalness={0.18} />
      </RoundedBox>
      {/* Detalles dorados del blazer: solapa + botonadura */}
      <mesh position={[0, 1.44, 0.16]}>
        <boxGeometry args={[0.5, 0.07, 0.04]} />
        <meshStandardMaterial color={oro} metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.1, 0.19]}>
        <boxGeometry args={[0.035, 0.42, 0.02]} />
        <meshStandardMaterial color={oro} metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Brazos */}
      {[-0.4, 0.4].map((ax, i) => (
        <group key={i} position={[ax, 1.48, 0]}>
          <mesh position={[0, -0.3, 0]} castShadow>
            <capsuleGeometry args={[0.08, 0.5, 4, 8]} />
            <meshStandardMaterial color={blazer} roughness={0.5} metalness={0.18} />
          </mesh>
          <mesh position={[0, -0.62, 0]}>
            <sphereGeometry args={[0.08, 12, 12]} />
            <meshStandardMaterial color={piel} roughness={0.7} />
          </mesh>
        </group>
      ))}

      {/* Cuello + cabeza */}
      <mesh position={[0, 1.6, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.12, 12]} />
        <meshStandardMaterial color={piel} roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.84, 0]} castShadow>
        <sphereGeometry args={[0.26, 24, 24]} />
        <meshStandardMaterial color={piel} roughness={0.7} />
      </mesh>

      {/* Pelo */}
      <mesh position={[0, 1.86, -0.02]}>
        <sphereGeometry args={[0.285, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
        <meshStandardMaterial color={pelo} roughness={0.85} />
      </mesh>
      {[-0.23, 0.23].map((hx, i) => (
        <mesh key={i} position={[hx, 1.62, -0.04]}>
          <boxGeometry args={[0.1, 0.42, 0.16]} />
          <meshStandardMaterial color={pelo} roughness={0.85} />
        </mesh>
      ))}

      {/* Auriculares con micro (earpieces dorados) */}
      <mesh position={[0, 1.84, 0]}>
        <torusGeometry args={[0.27, 0.025, 8, 20, Math.PI]} />
        <meshStandardMaterial color="#15151c" metalness={0.5} roughness={0.4} />
      </mesh>
      {[-0.27, 0.27].map((ex, i) => (
        <mesh key={i} position={[ex, 1.82, 0]}>
          <sphereGeometry args={[0.05, 12, 12]} />
          <meshStandardMaterial
            color={oro}
            emissive={oro}
            emissiveIntensity={0.4}
            metalness={0.7}
            roughness={0.3}
          />
        </mesh>
      ))}
      <mesh position={[0.16, 1.74, 0.2]} rotation={[0, 0, -0.5]}>
        <boxGeometry args={[0.03, 0.18, 0.03]} />
        <meshStandardMaterial color="#15151c" />
      </mesh>

      {/* Halo dorado flotante (corona de directora) */}
      <Float speed={2} floatIntensity={0.3} rotationIntensity={0.4}>
        <mesh position={[0, 2.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.18, 0.02, 8, 32]} />
          <meshStandardMaterial
            color={oro}
            metalness={0.9}
            roughness={0.2}
            emissive={oro}
            emissiveIntensity={0.6}
          />
        </mesh>
      </Float>

      {/* Badge: "SOFÍA · Directora" */}
      <Billboard position={[0, 2.55, 0]}>
        <SafeText
          fontSize={0.26}
          color={oro}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.014}
          outlineColor="#08080d"
        >
          SOFÍA · Directora
        </SafeText>
      </Billboard>

      {/* Foco cálido sobre la directora */}
      <pointLight position={[0, 2.6, 0.6]} intensity={0.5} distance={4} color="#fff0c8" />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Escena dentro del Canvas
// ---------------------------------------------------------------------------

function Escena({
  ranking,
  selected,
  onSelect,
}: {
  ranking: AgenteRanked[];
  selected: Agente | null;
  onSelect: (id: Agente) => void;
}) {
  const liderId = ranking.find((r) => r.posicion === 1)?.id ?? null;

  return (
    <>
      <color attach="background" args={["#06060b"]} />
      <fog attach="fog" args={["#06060b", 16, 38]} />

      <PerspectiveCamera makeDefault position={[0, 6, 10]} fov={45} />
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={4}
        maxDistance={18}
        maxPolarAngle={Math.PI / 2.2}
        target={[0, 1.2, -2.5]}
        enableDamping
      />

      {/* Iluminación de oficina moderna */}
      <ambientLight intensity={0.15} color="#9a93c8" />
      {/* Paneles LED del techo */}
      {[0.5, -3, -6].map((z, i) => (
        <rectAreaLight
          key={i}
          position={[0, ROOM.h - 0.1, z]}
          rotation={[-Math.PI / 2, 0, 0]}
          width={5}
          height={2}
          intensity={2}
          color="#fff8e7"
        />
      ))}
      {/* Luz direccional que proyecta sombras */}
      <directionalLight
        castShadow
        position={[5, 9, 4]}
        intensity={0.7}
        color="#ffffff"
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={30}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-bias={-0.0004}
      />

      <Sala ranking={ranking} />

      {/* Sofía, la directora, frente a la pantalla */}
      <Sofia />

      {/* Plantas en las esquinas */}
      <Planta position={[-6, 0, -6.3]} />
      <Planta position={[6, 0, -6.3]} />
      <Planta position={[6, 0, 3]} />

      {/* Zona de espera contra la pared izquierda */}
      <Sofa position={[-6.1, 0, 0.5]} />
      <LamparaPie position={[-5.2, 0, 2.4]} />
      <Estanteria position={[-6.7, 0, -4]} />

      {/* Mobiliario de cada puesto */}
      {AGENTES.map((a) => {
        const s = STATIONS[a.id];
        return <Estacion key={a.id} x={s.x} z={s.z} />;
      })}

      {/* Avatares */}
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
// Componente público
// ---------------------------------------------------------------------------

export function AgentesOffice3D({
  ranking,
  selected,
  onSelect,
}: {
  ranking: AgenteRanked[];
  selected: Agente | null;
  onSelect: (id: Agente | null) => void;
}) {
  return (
    <Canvas
      shadows={{ type: THREE.PCFShadowMap }}
      dpr={[1, 2]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onPointerMissed={() => onSelect(null)}
    >
      <Suspense fallback={null}>
        <Escena ranking={ranking} selected={selected} onSelect={onSelect} />
      </Suspense>
    </Canvas>
  );
}
