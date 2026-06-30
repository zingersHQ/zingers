"use client";
import { Suspense, useEffect, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { shapeOf, spawnKnollFor, terrainHeight, TERRAIN_HALF, PLAZA_R } from "./terrain";
import { NatureGround, NatureScatter, NaturePeaks, NatureFraming } from "./nature";
import { biomeById, type BiomeConfig } from "./biomes";
import { natureTerrainPalette, natureGroundPalette } from "@/lib/render/nature-kit";

// A vertical sky gradient (matches the world's SkyDome). `fog={false}` so the
// dome is never swallowed by the biome fog the way distant terrain is.
function SkyDome({ top, bottom }: { top: string; bottom: string }) {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: { top: { value: new THREE.Color(top) }, bot: { value: new THREE.Color(bottom) } },
        vertexShader: "varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
        fragmentShader: "varying vec3 v;uniform vec3 top;uniform vec3 bot;void main(){float h=normalize(v).y*0.5+0.5;gl_FragColor=vec4(mix(bot,top,pow(h,0.7)),1.0);}",
      }),
    [top, bottom],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  return (
    <mesh material={mat} renderOrder={-2}>
      <sphereGeometry args={[320, 32, 16]} />
    </mesh>
  );
}

// The same vertex-coloured heightfield the live world floors itself with — but
// WITHOUT the rapier RigidBody collider (a backdrop needs no physics, and the
// intro canvas has no <Physics> provider to satisfy it).
function BackdropTerrain({ biome }: { biome: BiomeConfig }) {
  const geo = useMemo(() => {
    const SEG = 128;
    const shape = shapeOf(biome);
    const knoll = spawnKnollFor(biome);
    const earth = natureTerrainPalette(biome.id);
    const low = new THREE.Color(earth.low);
    const mid = new THREE.Color(earth.mid);
    const high = new THREE.Color(earth.high);
    const band = biome.terrain.colorBand;
    const g = new THREE.PlaneGeometry(TERRAIN_HALF * 2, TERRAIN_HALF * 2, SEG, SEG);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const h = terrainHeight(pos.getX(i), pos.getZ(i), shape, knoll);
      pos.setY(i, h);
      const t = Math.max(0, Math.min(1, h / band));
      if (t < 0.5) c.lerpColors(low, mid, t / 0.5);
      else c.lerpColors(mid, high, (t - 0.5) / 0.5);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, [biome]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial vertexColors metalness={0.04} roughness={0.96} envMapIntensity={biome.daylight ? 0.04 : 0.15} />
    </mesh>
  );
}

// A static slice of a real game world dropped BEHIND an intro figure, so each
// beat reads as a different place. Reuses the live terrain + Quaternius nature
// kit so it matches the worlds exactly — but with no roaming agents, structures,
// or controls. Meant to be rendered INSIDE an existing <Canvas>; the parent owns
// the camera, <fog>, <color> background and the figure-facing key lights.
export function BiomeBackdrop({
  biomeId,
  richness = 1,
  framing = false,
}: {
  biomeId: string;
  /** multiplies grass/plants/rocks — intro slides use ~1.35 for a richer but not cluttered vista */
  richness?: number;
  /** foreground ring of side trees + understory for close champion cameras */
  framing?: boolean;
}) {
  const biome = useMemo(() => biomeById(biomeId), [biomeId]);
  const shape = useMemo(() => shapeOf(biome), [biome]);
  const pal = useMemo(() => natureGroundPalette(biome.id), [biome.id]);
  return (
    <Suspense fallback={null}>
      <SkyDome top={biome.sky.top} bottom={biome.sky.bottom} />
      <group>
        <BackdropTerrain biome={biome} />
        {/* the lit clearing the figure stands on — the world's plaza floor, so the
            ground reads beneath it instead of vanishing into the dark terrain */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
          <circleGeometry args={[PLAZA_R + 1, 96]} />
          <meshStandardMaterial color={pal.base} roughness={0.97} metalness={0.02} />
        </mesh>
        <NatureGround biome={biome} shape={shape} richness={richness} />
        <NatureScatter biome={biome} shape={shape} richness={richness} />
        <NaturePeaks biome={biome} shape={shape} richness={richness} />
        {framing && <NatureFraming biome={biome} shape={shape} />}
      </group>
    </Suspense>
  );
}

function FixedCam({ pos, look }: { pos: [number, number, number]; look: [number, number, number] }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(...pos);
    camera.lookAt(...look);
  }, [camera, pos, look]);
  return null;
}

// Standalone backdrop canvas for beats that don't host a 3D figure (e.g. the
// Forces wheel) — a quiet landscape vista of the given world behind the overlay.
export function BiomeBackdropCanvas({
  biomeId,
  richness = 1,
  framing = false,
}: {
  biomeId: string;
  richness?: number;
  framing?: boolean;
}) {
  const biome = useMemo(() => biomeById(biomeId), [biomeId]);
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0, 2.1, 11], fov: 36 }} gl={{ antialias: true }} style={{ width: "100%", height: "100%" }}>
      <color attach="background" args={[biome.bg]} />
      <fog attach="fog" args={[biome.fog.color, 13, 62]} />
      <FixedCam pos={[0, 2.1, 11]} look={[0, 1.4, -8]} />
      <hemisphereLight args={[biome.lights.hemiSky, biome.lights.hemiGround, biome.lights.hemiInt * 1.7]} />
      <ambientLight color={biome.lights.ambient} intensity={biome.lights.ambientInt * 2.1} />
      <directionalLight position={[18, 30, 12]} intensity={biome.lights.sunInt * 1.15} color={biome.lights.sun} />
      <BiomeBackdrop biomeId={biomeId} richness={richness} framing={framing} />
    </Canvas>
  );
}
