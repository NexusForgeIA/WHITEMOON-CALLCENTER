"use client";

import { Suspense, useMemo, useRef, useState, type ComponentProps } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Billboard,
  ContactShadows,
  Float,
  Grid,
  OrbitControls,
  PerspectiveCamera,
  RoundedBox,
  Text,
} from "@react-three/drei";
import * as THREE from "three";
import { AGENTES } from "@/lib/agentes";
import type { AgenteRanked } from "@/lib/ranking";
import type { Agente } from "@/lib/types";

// ---------------------------------------------------------------------------
// Distribución de la oficina: 2 filas de 3 puestos.
//   Fila frontal (z = -2):  Marcos · Laura · Diego
//   Fila trasera (z = -5):  Carlos · Ana   · Sara
//   Separación lateral: x = -3, 0, 3
// ---------------------------------------------------------------------------

const STATIONS: Record<Agente, { x: number; z: number }> = {
  dental: { x: -3, z: -2 }, // Marcos
  gestoria: { x: 0, z: -2 }, // Laura
  taller: { x: 3, z: -2 }, // Diego
  inmobiliaria: { x: -3, z: -5 }, // Carlos
  estetica: { x: 0, z: -5 }, // Ana
  hosteleria: { x: 3, z: -5 }, // Sara
};

const AISLE_Z = -3.5; // pasillo entre las dos filas
const CONFETTI_COLORES = ["#7c4dff", "#00d4aa", "#ffce54", "#ff6fae", "#4da8ff"];

// <Text> envuelto en Suspense: la carga de la fuente (troika) no bloquea el
// resto de la escena; el texto aparece cuando esté listo.
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
// Mobiliario del puesto: mesa, monitor y silla
// ---------------------------------------------------------------------------

function Mesa() {
  return (
    <group>
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 0.08, 0.8]} />
        <meshStandardMaterial color="#13131e" roughness={0.6} metalness={0.2} />
      </mesh>
      {(
        [
          [-0.62, -0.32],
          [0.62, -0.32],
          [-0.62, 0.32],
          [0.62, 0.32],
        ] as const
      ).map(([x, z], i) => (
        <mesh key={i} position={[x, 0.275, z]}>
          <boxGeometry args={[0.06, 0.55, 0.06]} />
          <meshStandardMaterial color="#0d0d14" />
        </mesh>
      ))}
    </group>
  );
}

function Monitor() {
  const cajaGeo = useMemo(() => new THREE.BoxGeometry(0.8, 0.6, 0.05), []);
  const edges = useMemo(() => new THREE.EdgesGeometry(cajaGeo), [cajaGeo]);
  return (
    // Sobre la mesa, ligeramente hacia el avatar e inclinado 10° hacia atrás
    <group position={[0, 0.92, -0.15]} rotation={[-0.17, 0, 0]}>
      <mesh geometry={cajaGeo}>
        <meshStandardMaterial color="#0e0e16" roughness={0.4} metalness={0.3} />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#7c4dff" />
      </lineSegments>
      {/* Pantalla verde encendida */}
      <mesh position={[0, 0, 0.03]}>
        <planeGeometry args={[0.7, 0.5]} />
        <meshStandardMaterial
          color="#00d4aa"
          emissive="#00d4aa"
          emissiveIntensity={0.7}
          transparent
          opacity={0.8}
        />
      </mesh>
      {/* Pie del monitor */}
      <mesh position={[0, -0.42, 0.05]} rotation={[0.17, 0, 0]}>
        <boxGeometry args={[0.12, 0.22, 0.04]} />
        <meshStandardMaterial color="#0e0e16" />
      </mesh>
    </group>
  );
}

function Silla() {
  const asientoGeo = useMemo(() => new THREE.BoxGeometry(0.5, 0.05, 0.5), []);
  const respaldoGeo = useMemo(() => new THREE.BoxGeometry(0.5, 0.6, 0.05), []);
  const edgesAsiento = useMemo(() => new THREE.EdgesGeometry(respaldoGeo), [respaldoGeo]);
  return (
    <group position={[0, 0, -0.25]}>
      <mesh geometry={asientoGeo} position={[0, 0.45, 0]}>
        <meshStandardMaterial color="#1a1a2e" roughness={0.7} />
      </mesh>
      <group position={[0, 0.75, -0.22]}>
        <mesh geometry={respaldoGeo}>
          <meshStandardMaterial color="#1a1a2e" roughness={0.7} />
        </mesh>
        <lineSegments geometry={edgesAsiento}>
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
        <mesh key={i} position={[x, 0.22, z]}>
          <cylinderGeometry args={[0.025, 0.025, 0.45, 8]} />
          <meshStandardMaterial color="#0d0d14" />
        </mesh>
      ))}
    </group>
  );
}

function Estacion({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      {/* Mesa + monitor, delante del avatar (hacia la cámara) */}
      <group position={[0, 0, 0.5]}>
        <Mesa />
        <Monitor />
      </group>
      {/* Silla, detrás del avatar */}
      <Silla />
      {/* Foco púrpura sobre el puesto */}
      <pointLight position={[0, 2.3, 0.3]} intensity={0.4} distance={3} color="#7c4dff" />
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
        // Camina por el pasillo entre filas
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
        // Sentado frente al monitor (Y bajada)
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
        // Disponible: de pie detrás de la mesa, respiración sutil
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

      {fem && (
        <mesh position={[0, 0.62, 0]}>
          <cylinderGeometry args={[0.22, 0.44, 0.5, 16]} />
          <meshStandardMaterial color={o.complemento} roughness={0.6} />
        </mesh>
      )}

      <RoundedBox args={[0.62, 0.74, 0.36]} radius={0.08} smoothness={4} position={[0, 1.18, 0]}>
        {traje}
      </RoundedBox>

      {!fem && (
        <mesh position={[0, 1.12, 0.19]}>
          <boxGeometry args={[0.08, 0.4, 0.02]} />
          <meshStandardMaterial color={o.complemento} roughness={0.4} />
        </mesh>
      )}

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

      <mesh position={[0, 1.6, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.12, 12]} />
        {piel}
      </mesh>

      <mesh position={[0, 1.84, 0]}>
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

      {/* Etiqueta con el nombre, siempre de cara a la cámara */}
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
// Paredes, suelo y pantalla central
// ---------------------------------------------------------------------------

function Oficina({ ranking }: { ranking: AgenteRanked[] }) {
  const top3 = ranking.slice(0, 3);
  return (
    <>
      {/* Pared trasera */}
      <mesh position={[0, 3, -7]}>
        <planeGeometry args={[15, 6]} />
        <meshStandardMaterial color="#0e0e16" roughness={0.9} metalness={0.05} />
      </mesh>
      {/* Pared lateral izquierda */}
      <mesh position={[-7.5, 3, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[15, 6]} />
        <meshStandardMaterial color="#0e0e16" roughness={0.9} metalness={0.05} />
      </mesh>

      {/* Logo WhiteMoon en la pared trasera */}
      <SafeText
        position={[-4.6, 4.6, -6.9]}
        fontSize={0.6}
        color="#7c4dff"
        anchorX="left"
        anchorY="middle"
        outlineWidth={0.01}
        outlineColor="#08080d"
      >
        WhiteMoon
      </SafeText>

      {/* Pantalla central de clasificación */}
      <group position={[0, 2.6, -6.85]}>
        {/* Marco emisivo púrpura */}
        <mesh position={[0, 0, -0.05]}>
          <boxGeometry args={[3.2, 2.2, 0.08]} />
          <meshStandardMaterial
            color="#7c4dff"
            emissive="#7c4dff"
            emissiveIntensity={1.3}
          />
        </mesh>
        {/* Panel de la pantalla */}
        <mesh>
          <boxGeometry args={[3, 2, 0.1]} />
          <meshStandardMaterial color="#111118" roughness={0.4} metalness={0.3} />
        </mesh>
        {/* Título */}
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
        {/* Top 3 en directo */}
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

      {/* Suelo: plano con leve reflejo + rejilla púrpura */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -2]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#0a0a12" roughness={0.8} metalness={0.1} />
      </mesh>
      <Grid
        position={[0, 0, -2]}
        args={[40, 40]}
        cellSize={0.6}
        cellThickness={0.6}
        cellColor="#1c1630"
        sectionSize={3}
        sectionThickness={1}
        sectionColor="#7c4dff"
        fadeDistance={26}
        fadeStrength={1.2}
        infiniteGrid
      />
      <ContactShadows
        position={[0, 0.01, -3]}
        opacity={0.5}
        scale={28}
        blur={2.6}
        far={6}
        color="#000000"
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Escena completa dentro del Canvas
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
      <color attach="background" args={["#08080d"]} />
      <fog attach="fog" args={["#08080d", 12, 30]} />

      <PerspectiveCamera makeDefault position={[0, 5, 9.5]} fov={45} />
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={6}
        maxDistance={16}
        minPolarAngle={0.5}
        maxPolarAngle={1.45}
        target={[0, 1.2, -3.3]}
        enableDamping
      />

      {/* Iluminación de oficina, dramática */}
      <ambientLight intensity={0.2} color="#8a7fff" />
      <spotLight
        position={[0, 13, 1]}
        angle={0.7}
        penumbra={0.6}
        intensity={2.4}
        color="#ffffff"
        distance={40}
      />
      <directionalLight position={[4, 8, 6]} intensity={0.35} color="#cfc6ff" />

      <Oficina ranking={ranking} />

      {/* Mobiliario fijo de cada puesto */}
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
// Componente público: el Canvas con la oficina 3D
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
      dpr={[1, 2]}
      shadows={false}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onPointerMissed={() => onSelect(null)}
    >
      <Suspense fallback={null}>
        <Escena ranking={ranking} selected={selected} onSelect={onSelect} />
      </Suspense>
    </Canvas>
  );
}
