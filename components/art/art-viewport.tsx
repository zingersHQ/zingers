"use client";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { Champion, CreatureType } from "@/lib/types";
import { blank, TYPE_COLOR } from "@/lib/evolve/progression";
import { FORCES } from "@/lib/lore/canon";
import { SHARED_RIG } from "@/lib/render/model-registry";
import { GOLD, readerPalette } from "@/lib/render/palette";
import { ChampionMesh, applyBoneMorph, buildCharacter } from "@/components/grounds/champion-mesh";
import { Jetpack } from "@/components/grounds/jetpack";

type Controls = { target: THREE.Vector3; update: () => void };

/** Locomotion / showcase poses available on every art tile. */
export type ArtAction = "stand" | "walk" | "run" | "jump" | "fly" | "wave" | "punch";

export const ART_ACTIONS: { id: ArtAction; label: string }[] = [
  { id: "stand", label: "Stand" },
  { id: "walk", label: "Walk" },
  { id: "run", label: "Run" },
  { id: "jump", label: "Jump" },
  { id: "fly", label: "Fly" },
  { id: "wave", label: "Wave" },
  { id: "punch", label: "Punch" },
];

type ClipKey = "idle" | "standing" | "walk" | "run" | "jump" | "wave" | "punch";

const ACTION_CLIP: Record<ArtAction, { clip: ClipKey; loop: boolean; timeScale?: number; fly?: boolean }> = {
  stand: { clip: "standing", loop: true },
  walk: { clip: "walk", loop: true },
  run: { clip: "run", loop: true, timeScale: 1.12 },
  jump: { clip: "jump", loop: true, timeScale: 0.95 },
  fly: { clip: "idle", loop: true, fly: true },
  wave: { clip: "wave", loop: true, timeScale: 0.85 },
  punch: { clip: "punch", loop: true },
};

function ReaderRings({
  force,
  flyingRef,
  paused,
}: {
  force: CreatureType | null;
  flyingRef: React.RefObject<boolean>;
  paused: boolean;
}) {
  const big = useRef<THREE.Mesh>(null);
  const small = useRef<THREE.Mesh>(null);
  const yBig = useRef(0.04);
  const ySmall = useRef(0.045);
  const osc = useRef(0);

  useFrame((_, dtRaw) => {
    const dt = Math.min(0.05, dtRaw);
    const fly = !!flyingRef.current;
    if (!paused) osc.current += dt;
    const sink = fly ? 1 : 0;
    const bob = fly && !paused ? Math.sin(osc.current * 2.4) * 0.04 : 0;
    const tgtBig = 0.04 - 0.55 * sink + bob;
    const tgtSmall = 0.045 - 0.72 * sink + bob * 0.7;
    const a = 1 - Math.exp(-(paused ? 40 : 6) * dt);
    yBig.current += (tgtBig - yBig.current) * a;
    ySmall.current += (tgtSmall - ySmall.current) * a;
    if (big.current) big.current.position.y = yBig.current;
    if (small.current) small.current.position.y = ySmall.current;
  });

  return (
    <>
      <mesh ref={big} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <ringGeometry args={[0.55, 0.72, 48]} />
        <meshBasicMaterial
          color={force ? TYPE_COLOR[force] : GOLD}
          transparent
          opacity={0.8}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {force && (
        <mesh ref={small} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.045, 0]}>
          <ringGeometry args={[0.42, 0.52, 48]} />
          <meshBasicMaterial color={GOLD} transparent opacity={0.88} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}
    </>
  );
}

/** Trainer (Handler) — silver Reader palette + action clips / jetpack. */
function TrainerFigure({
  force,
  action,
  paused,
  /** parent already positions height (duo parade) — skip local hover lift */
  embedded = false,
}: {
  force: CreatureType | null;
  action: ArtAction;
  paused: boolean;
  embedded?: boolean;
}) {
  const { scene, animations } = useGLTF(SHARED_RIG);
  const pal = useMemo(() => readerPalette(force), [force]);
  const built = useMemo(
    () => buildCharacter(scene, animations, blank(), "#cfd2e8", undefined, 0, pal),
    [scene, animations, pal],
  );

  const flyingRef = useRef(false);
  const burstRef = useRef(0);
  const emitAcc = useRef(0);
  const bodyRef = useRef<THREE.Group>(null);
  const cfg = ACTION_CLIP[action];

  useEffect(() => {
    flyingRef.current = !!cfg.fly;
    if (cfg.fly) burstRef.current++;
  }, [cfg.fly, action]);

  useEffect(() => {
    const clip = built.actions[cfg.clip] ?? built.actions.idle ?? built.actions.standing;
    if (!clip) return;
    Object.values(built.actions).forEach((a) => a?.stop());
    if (cfg.loop) {
      clip.setLoop(THREE.LoopRepeat, Infinity);
      clip.clampWhenFinished = false;
    } else {
      clip.setLoop(THREE.LoopOnce, 1);
      clip.clampWhenFinished = true;
    }
    clip.reset().setEffectiveTimeScale(cfg.timeScale ?? 1).setEffectiveWeight(1).fadeIn(0.12).play();
    return () => {
      clip.fadeOut(0.1);
    };
  }, [built, cfg, action]);

  useEffect(() => {
    return () => {
      built.mixer.stopAllAction();
      built.root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | THREE.Material[];
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose?.();
      });
    };
  }, [built]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(0.05, dtRaw);
    if (!paused) {
      built.mixer.update(dt);
      applyBoneMorph(built.bones, built.boneBase, built.morph);
      if (cfg.fly) {
        emitAcc.current += dt;
        if (emitAcc.current > 0.055) {
          emitAcc.current = 0;
          burstRef.current++;
        }
      }
    } else {
      built.mixer.update(0);
      applyBoneMorph(built.bones, built.boneBase, built.morph);
    }
    if (bodyRef.current) {
      const hover = cfg.fly && !embedded ? built.h * 0.48 : 0;
      const lean = cfg.fly ? 0.16 : 0;
      const a = 1 - Math.exp(-(paused ? 30 : 8) * dt);
      bodyRef.current.position.y += (hover - bodyRef.current.position.y) * a;
      bodyRef.current.rotation.x += (lean - bodyRef.current.rotation.x) * a;
    }
  });

  return (
    <group scale={0.85}>
      <group ref={bodyRef}>
        <primitive object={built.root} />
        <Jetpack h={built.h} flyingRef={flyingRef} burstRef={burstRef} />
      </group>
      <ReaderRings force={force} flyingRef={flyingRef} paused={paused} />
    </group>
  );
}

function ChampionFigure({
  type,
  champion,
  action,
  paused,
  clan = null,
}: {
  type: CreatureType;
  champion: Champion;
  action: ArtAction;
  paused: boolean;
  clan?: CreatureType | null;
}) {
  const flyingRef = useRef(false);
  const movingRef = useRef(false);
  const speedRef = useRef(0);
  const runRef = useRef(false);
  const velRef = useRef(new THREE.Vector3());
  const headingRef = useRef(0);
  const drive = useMemo(
    () => ({ flyingRef, movingRef, speedRef, runRef, velRef, headingRef }),
    [],
  );

  const [actSig, setActSig] = useState(0);
  const gesture = action === "jump" || action === "wave" || action === "punch" ? action : null;
  const loco = action === "walk" || action === "run" || action === "fly";

  useEffect(() => {
    flyingRef.current = action === "fly";
    movingRef.current = action === "walk" || action === "run";
    runRef.current = action === "run";
    speedRef.current = action === "run" ? 4.2 : action === "walk" ? 2.2 : action === "fly" ? 3.5 : 0;
    velRef.current.set(0, action === "fly" ? 0.4 : 0, speedRef.current);
    if (action === "fly") velRef.current.set(0.6, 0.5, 2.8);
  }, [action]);

  useEffect(() => {
    if (!gesture || paused) return;
    setActSig((s) => s + 1);
    const id = setInterval(() => setActSig((s) => s + 1), action === "punch" ? 1600 : 2200);
    return () => clearInterval(id);
  }, [gesture, action, paused]);

  return (
    <group scale={0.72} position={[0, action === "fly" ? 0.55 : 0, 0]}>
      <ChampionMesh
        type={type}
        champion={champion}
        clan={clan}
        position={[0, 0, 0]}
        showLabel={false}
        hideFloaters
        selected
        idleSpeed={paused ? 0 : 0.55}
        breatheIntensity={paused ? 0 : 0.5}
        restPose="standing"
        companionDrive={loco ? drive : undefined}
        actSignal={gesture ? actSig : 0}
        actName={gesture ?? "wave"}
      />
    </group>
  );
}

/** Trainer + champion side-by-side; walk/fly parade so the mind follows. */
function DuoParade({
  force,
  type,
  champion,
  action,
  paused,
}: {
  force: CreatureType;
  type: CreatureType;
  champion: Champion;
  action: ArtAction;
  paused: boolean;
}) {
  const root = useRef<THREE.Group>(null);
  const trainerSlot = useRef<THREE.Group>(null);
  const champSlot = useRef<THREE.Group>(null);
  const tPos = useRef(new THREE.Vector3());
  const cPos = useRef(new THREE.Vector3(1.35, 0, -1.1));
  const heading = useRef(0);
  const phase = useRef(0);

  const flyingRef = useRef(false);
  const movingRef = useRef(false);
  const speedRef = useRef(0);
  const runRef = useRef(false);
  const velRef = useRef(new THREE.Vector3());
  const headRef = useRef(0);
  const drive = useMemo(
    () => ({ flyingRef, movingRef, speedRef, runRef, velRef, headingRef: headRef }),
    [],
  );

  const [actSig, setActSig] = useState(0);
  const gesture = action === "jump" || action === "wave" || action === "punch" ? action : null;
  const parade = action === "walk" || action === "run" || action === "fly";

  useEffect(() => {
    if (!gesture || paused) return;
    setActSig((s) => s + 1);
    const id = setInterval(() => setActSig((s) => s + 1), 2000);
    return () => clearInterval(id);
  }, [gesture, paused]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(0.05, dtRaw);
    const fly = action === "fly";
    const walk = action === "walk" || action === "run";
    const speed = action === "run" ? 2.6 : action === "walk" ? 1.35 : fly ? 2.1 : 0;

    if (!paused && parade) {
      phase.current += dt * (fly ? 0.55 : 0.7);
    }

    let tx = 0;
    let ty = fly && !parade ? 1.0 : 0;
    let tz = 0;
    let wantH = 0;
    let sx = 1.45;
    let sy = ty;
    let sz = -0.35;

    if (parade) {
      // gentle circular parade so the pair stays framed
      const r = fly ? 1.6 : 1.1;
      const ang = phase.current;
      tx = Math.sin(ang) * r;
      tz = Math.cos(ang) * r - r;
      ty = fly ? 1.15 : 0;
      wantH = ang + Math.PI / 2;
      const backX = -Math.sin(wantH);
      const backZ = -Math.cos(wantH);
      const sideX = Math.cos(wantH);
      const sideZ = -Math.sin(wantH);
      sx = tx + backX * 1.55 + sideX * 1.15;
      sy = ty + (fly ? -0.35 : 0);
      sz = tz + backZ * 1.55 + sideZ * 1.15;
    }

    const a = 1 - Math.exp(-(paused ? 20 : 5) * dt);
    tPos.current.x += (tx - tPos.current.x) * a;
    tPos.current.y += (ty - tPos.current.y) * a;
    tPos.current.z += (tz - tPos.current.z) * a;
    let dH = wantH - heading.current;
    dH = Math.atan2(Math.sin(dH), Math.cos(dH));
    heading.current += dH * a;

    const th = heading.current;
    const catchK = paused ? 20 : 4.2;
    const ca = 1 - Math.exp(-catchK * dt);
    cPos.current.x += (sx - cPos.current.x) * ca;
    cPos.current.y += (sy - cPos.current.y) * ca;
    cPos.current.z += (sz - cPos.current.z) * ca;

    flyingRef.current = fly;
    movingRef.current = walk;
    runRef.current = action === "run";
    speedRef.current = speed;
    velRef.current.set(
      Math.cos(th) * speed * 0.2,
      fly ? 0.35 : 0,
      -Math.sin(th) * speed * 0.2 + (walk || fly ? speed : 0),
    );
    headRef.current = th;

    if (trainerSlot.current) {
      trainerSlot.current.position.copy(tPos.current);
      trainerSlot.current.rotation.y = th;
    }
    if (champSlot.current) {
      champSlot.current.position.copy(cPos.current);
      let cH = th;
      if (parade) {
        const vx = sx - cPos.current.x;
        const vz = sz - cPos.current.z;
        if (Math.hypot(vx, vz) > 0.08) cH = Math.atan2(vx, vz);
      }
      champSlot.current.rotation.y = cH;
    }
  });

  return (
    <group ref={root}>
      <group ref={trainerSlot}>
        <TrainerFigure force={force} action={action} paused={paused} embedded />
      </group>
      <group ref={champSlot} scale={0.92}>
        <ChampionMesh
          type={type}
          champion={champion}
          clan={force}
          position={[0, 0, 0]}
          rotation={0}
          selected
          showLabel={false}
          hideFloaters
          restPose="standing"
          idleSpeed={paused ? 0 : 0.5}
          breatheIntensity={paused ? 0 : 0.45}
          companionDrive={parade ? drive : undefined}
          actSignal={gesture ? actSig : 0}
          actName={gesture ?? "wave"}
        />
      </group>
    </group>
  );
}

function FitOnce({
  children,
  wide = false,
  resetKey,
}: {
  children: React.ReactNode;
  wide?: boolean;
  resetKey?: string | number;
}) {
  const g = useRef<THREE.Group>(null);
  const done = useRef(false);
  const { camera, controls } = useThree();
  const box = useRef(new THREE.Box3());
  const size = useRef(new THREE.Vector3());
  const ctr = useRef(new THREE.Vector3());

  useEffect(() => {
    done.current = false;
  }, [resetKey]);

  useFrame(() => {
    if (done.current || !g.current) return;
    box.current.setFromObject(g.current);
    if (box.current.isEmpty() || !isFinite(box.current.min.y)) return;
    box.current.getSize(size.current);
    box.current.getCenter(ctr.current);
    if (size.current.y < 0.4) return;
    const cam = camera as THREE.PerspectiveCamera;
    const tanV = Math.tan((cam.fov * Math.PI) / 180 / 2);
    const aspect = cam.aspect || 1;
    const fill = wide ? 0.62 : 0.72;
    const dist = Math.max(
      size.current.y / 2 / (tanV * fill),
      size.current.x / 2 / (tanV * aspect * fill),
      wide ? 7.5 : 4.5,
    );
    camera.position.set(wide ? 2.2 : 0, ctr.current.y + (wide ? 0.4 : 0.15), dist);
    const c = controls as Controls | null;
    if (c?.target) {
      c.target.set(ctr.current.x * 0.3, ctr.current.y, ctr.current.z * 0.2);
      c.update();
    } else {
      camera.lookAt(0, ctr.current.y, 0);
    }
    done.current = true;
  });

  return <group ref={g}>{children}</group>;
}

export type ArtSubject =
  | { kind: "trainer"; force: CreatureType | null }
  | { kind: "champion"; type: CreatureType; champion: Champion }
  | { kind: "duo"; force: CreatureType; type: CreatureType; champion: Champion };

function ActionBar({
  action,
  onChange,
  accent,
}: {
  action: ArtAction;
  onChange: (a: ArtAction) => void;
  accent: string;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5, padding: "0 10px 10px" }}>
      {ART_ACTIONS.map((a) => {
        const on = action === a.id;
        return (
          <button
            key={a.id}
            type="button"
            onClick={() => onChange(a.id)}
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: 0.6,
              padding: "5px 8px",
              borderRadius: 6,
              border: `1px solid ${on ? accent : "#3a3850"}`,
              background: on ? `color-mix(in srgb, ${accent} 22%, #12101c)` : "#12101c",
              color: "inherit",
              cursor: "pointer",
            }}
          >
            {a.label}
          </button>
        );
      })}
    </div>
  );
}

export function ArtViewport({
  subject,
  bg,
  paused,
  label,
  accent,
  wide = false,
}: {
  subject: ArtSubject;
  bg: string;
  paused: boolean;
  label: string;
  accent: string;
  wide?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [action, setAction] = useState<ArtAction>("stand");

  const download = () => {
    const canvas = wrapRef.current?.querySelector("canvas");
    if (!canvas) return;
    const a = document.createElement("a");
    const slug = `${label}-${action}`.toLowerCase().replace(/\s+/g, "-");
    a.download = `zingers-${slug}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        border: `1px solid color-mix(in srgb, ${accent} 35%, #2a2840)`,
        borderRadius: 10,
        overflow: "hidden",
        background: "#0a0812",
        gridColumn: wide ? "1 / -1" : undefined,
      }}
    >
      <div
        ref={wrapRef}
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: wide ? "16 / 10" : "1 / 1",
          background: bg,
        }}
      >
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 1.4, wide ? 11 : 7.5], fov: wide ? 34 : 30 }}
          gl={{ antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" }}
          style={{ width: "100%", height: "100%", display: "block" }}
        >
          <color attach="background" args={[bg]} />
          <ambientLight intensity={0.65} />
          <hemisphereLight args={["#d8d0ff", "#1a1428", 0.75]} />
          <directionalLight position={[5, 8, 4]} intensity={1.75} castShadow />
          <pointLight position={[-5, 3, -3]} intensity={42} color={accent} distance={22} />
          <pointLight position={[4, 1.5, 5]} intensity={18} color="#ffffff" distance={20} />
          <Suspense fallback={null}>
            <FitOnce wide={wide || subject.kind === "duo"} resetKey={`${subject.kind}-${action}`}>
              {subject.kind === "trainer" ? (
                <TrainerFigure force={subject.force} action={action} paused={paused} />
              ) : subject.kind === "champion" ? (
                <ChampionFigure
                  type={subject.type}
                  champion={subject.champion}
                  action={action}
                  paused={paused}
                />
              ) : (
                <DuoParade
                  force={subject.force}
                  type={subject.type}
                  champion={subject.champion}
                  action={action}
                  paused={paused}
                />
              )}
            </FitOnce>
            <ContactShadows
              position={[0, 0.01, 0]}
              opacity={0.55}
              scale={wide ? 14 : 8}
              blur={2.4}
              far={4}
              resolution={256}
              color="#000000"
            />
          </Suspense>
          <OrbitControls
            makeDefault
            enablePan
            enableDamping
            dampingFactor={0.08}
            rotateSpeed={0.85}
            zoomSpeed={0.9}
            minDistance={2.2}
            maxDistance={28}
            minPolarAngle={0.12}
            maxPolarAngle={Math.PI * 0.92}
          />
        </Canvas>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding: "10px 12px 8px",
        }}
      >
        <div>
          <div className="mono" style={{ fontSize: 10, letterSpacing: 1.4, color: accent }}>
            {subject.kind === "trainer"
              ? "TRAINER"
              : subject.kind === "duo"
                ? "TRAINER + CHAMPION"
                : FORCES[subject.type].sigil}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, marginTop: 2 }}>{label}</div>
        </div>
        <button
          type="button"
          onClick={download}
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: 0.8,
            padding: "7px 10px",
            borderRadius: 7,
            border: `1px solid color-mix(in srgb, ${accent} 45%, #3a3850)`,
            background: `color-mix(in srgb, ${accent} 12%, #12101c)`,
            color: "inherit",
            cursor: "pointer",
          }}
        >
          PNG
        </button>
      </div>
      <ActionBar action={action} onChange={setAction} accent={accent} />
    </div>
  );
}

useGLTF.preload(SHARED_RIG);
