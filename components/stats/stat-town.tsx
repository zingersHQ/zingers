"use client";
// The stat-town: an aerial, console-game view of the analytics. Every metric is
// a glowing tower whose height is its value (square-root scaled per district so
// wildly different magnitudes stay readable side by side). Districts are colored
// blocks — Population, Core Loop, World, Economy — and a boulevard of bars along
// the front plots daily active players over the window. Slowly auto-orbits.
import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import type { Analytics } from "@/lib/stats-types";

const MAX_H = 6.4; // tallest tower in a district
const FOOT = 1.5; // tower footprint
const SPACING_X = 3.1;
const SPACING_Z = 5.2;

interface Metric {
  key: string;
  label: string;
}
interface District {
  id: string;
  name: string;
  color: string;
  source: "active" | "totals";
  metrics: Metric[];
}

const DISTRICTS: District[] = [
  {
    id: "pop",
    name: "POPULATION",
    color: "#f0a93a",
    source: "active",
    metrics: [
      { key: "dau", label: "DAU" },
      { key: "wau", label: "WAU" },
      { key: "mau", label: "MAU" },
    ],
  },
  {
    id: "loop",
    name: "CORE LOOP",
    color: "#7c5cff",
    source: "totals",
    metrics: [
      { key: "session", label: "visits" },
      { key: "claim", label: "claims" },
      { key: "train", label: "trains" },
      { key: "bout", label: "fights" },
      { key: "return", label: "returns" },
    ],
  },
  {
    id: "world",
    name: "WORLD",
    color: "#39e0ff",
    source: "totals",
    metrics: [
      { key: "explore", label: "explore" },
      { key: "node", label: "caches" },
      { key: "goal", label: "goals" },
      { key: "daily", label: "daily" },
    ],
  },
  {
    id: "econ",
    name: "ECONOMY",
    color: "#36d39a",
    source: "totals",
    metrics: [
      { key: "earn", label: "earned" },
      { key: "spend", label: "spent" },
      { key: "bet", label: "bets" },
      { key: "bet_win", label: "bet wins" },
    ],
  },
];

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function heightFor(v: number, max: number): number {
  if (max <= 0 || v <= 0) return 0.18;
  return 0.18 + Math.sqrt(v / max) * MAX_H;
}

function Tower({
  position,
  height,
  color,
  value,
  label,
}: {
  position: [number, number, number];
  height: number;
  color: string;
  value: number;
  label: string;
}) {
  return (
    <group position={position}>
      <mesh position={[0, height / 2, 0]}>
        <boxGeometry args={[FOOT, height, FOOT]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.32} metalness={0.55} roughness={0.32} />
      </mesh>
      {/* glowing rooftop beacon */}
      <mesh position={[0, height + 0.08, 0]}>
        <boxGeometry args={[FOOT + 0.12, 0.16, FOOT + 0.12]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <Html position={[0, height + 0.7, 0]} center distanceFactor={16} zIndexRange={[20, 0]}>
        <div style={{ textAlign: "center", transform: "translateY(-50%)", whiteSpace: "nowrap", userSelect: "none", pointerEvents: "none" }}>
          <div style={{ fontWeight: 800, fontSize: 22, color: "#fff", textShadow: "0 2px 8px #000, 0 0 10px " + color }}>{fmt(value)}</div>
          <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 11, letterSpacing: 1, color, textShadow: "0 1px 4px #000" }}>{label.toUpperCase()}</div>
        </div>
      </Html>
    </group>
  );
}

function DistrictLabel({ position, name, color }: { position: [number, number, number]; name: string; color: string }) {
  return (
    <Html position={position} center distanceFactor={20} zIndexRange={[10, 0]}>
      <div
        style={{
          fontFamily: "var(--font-mono, monospace)",
          fontSize: 12,
          letterSpacing: 3,
          fontWeight: 700,
          color,
          border: `1px solid ${color}`,
          borderRadius: 6,
          padding: "3px 10px",
          background: "rgba(8,7,16,.72)",
          whiteSpace: "nowrap",
          textShadow: `0 0 10px ${color}`,
          boxShadow: `0 0 18px -8px ${color}`,
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        {name}
      </div>
    </Html>
  );
}

function Scene({ data }: { data: Analytics }) {
  const rows = DISTRICTS.length;

  const districtNodes = useMemo(() => {
    return DISTRICTS.map((d, gi) => {
      const z = (gi - (rows - 1) / 2) * SPACING_Z;
      const vals = d.metrics.map((m) =>
        d.source === "active" ? (data.active as Record<string, number>)[m.key] ?? 0 : data.totals[m.key] ?? 0,
      );
      const max = Math.max(1, ...vals);
      const m = d.metrics.length;
      const towers = d.metrics.map((metric, mi) => {
        const x = (mi - (m - 1) / 2) * SPACING_X;
        const v = vals[mi];
        return { metric, x, v, h: heightFor(v, max) };
      });
      return { d, z, towers, labelX: -((m - 1) / 2) * SPACING_X - SPACING_X * 0.95 };
    });
  }, [data, rows]);

  // Daily-active boulevard along the front edge.
  const boulevard = useMemo(() => {
    const series = data.series;
    const max = Math.max(1, ...series.map((s) => s.dau));
    const z = ((rows - 1) / 2) * SPACING_Z + SPACING_Z * 0.9;
    const span = Math.max(series.length, 1);
    return {
      z,
      bars: series.map((s, i) => ({
        x: (i - (span - 1) / 2) * 1.5,
        h: 0.1 + (s.dau / max) * (MAX_H * 0.8),
        date: s.date,
        dau: s.dau,
      })),
    };
  }, [data, rows]);

  return (
    <>
      <color attach="background" args={["#06050d"]} />
      <fog attach="fog" args={["#06050d", 26, 64]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[14, 22, 8]} intensity={0.7} color="#cdd6ff" />
      <pointLight position={[0, 10, 0]} intensity={40} distance={50} color="#7c5cff" />
      <pointLight position={[-12, 6, 10]} intensity={30} distance={40} color="#39e0ff" />
      <pointLight position={[12, 6, -10]} intensity={30} distance={40} color="#f0a93a" />

      {/* ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[120, 120]} />
        <meshStandardMaterial color="#0a0916" metalness={0.3} roughness={0.85} />
      </mesh>
      <gridHelper args={[80, 40, "#241f3d", "#15122a"]} position={[0, 0, 0]} />

      {/* districts */}
      {districtNodes.map(({ d, z, towers, labelX }) => (
        <group key={d.id} position={[0, 0, z]}>
          <DistrictLabel position={[labelX, 2.2, 0]} name={d.name} color={d.color} />
          {towers.map((t) => (
            <Tower
              key={t.metric.key}
              position={[t.x, 0, 0]}
              height={t.h}
              color={d.color}
              value={t.v}
              label={t.metric.label}
            />
          ))}
        </group>
      ))}

      {/* daily-active boulevard */}
      <group position={[0, 0, boulevard.z]}>
        <DistrictLabel position={[-((boulevard.bars.length - 1) / 2) * 1.5 - 2.6, 1.6, 0]} name={`DAU · ${data.windowDays}d`} color="#c77dff" />
        {boulevard.bars.map((b, i) => (
          <mesh key={i} position={[b.x, b.h / 2, 0]}>
            <boxGeometry args={[1.0, b.h, 1.0]} />
            <meshStandardMaterial color="#c77dff" emissive="#c77dff" emissiveIntensity={0.4} metalness={0.5} roughness={0.35} />
          </mesh>
        ))}
      </group>

      <OrbitControls
        autoRotate
        autoRotateSpeed={0.45}
        enablePan={false}
        minPolarAngle={0.5}
        maxPolarAngle={1.15}
        minDistance={18}
        maxDistance={48}
        target={[0, 1.5, 0]}
      />
    </>
  );
}

export default function StatTown({ data }: { data: Analytics }) {
  return (
    <Canvas camera={{ position: [20, 17, 22], fov: 38 }} dpr={[1, 2]} gl={{ antialias: true }}>
      <Scene data={data} />
    </Canvas>
  );
}
