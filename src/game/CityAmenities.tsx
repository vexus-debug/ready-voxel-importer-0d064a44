// Renders Linefield Phase 3 amenities as InstancedMeshes (one draw call per part) — visual only, no collision.
import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { onAmenities, type Amenities, type Anchor } from "./amenities";
import { LF_X0, LF_Z0, LF_SIZE } from "./linefield";

type Place = (a: Anchor, o: THREE.Object3D) => void;
interface Part { geo: THREE.BufferGeometry; mat: THREE.Material; place: Place }

const std = (color: string, o: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.6, ...o });
const glow = (color: string, i = 2.5) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: i, roughness: 0.3 });

function base(a: Anchor, o: THREE.Object3D) {
  o.position.set(a.x, a.y, a.z); o.rotation.set(0, a.r, 0); o.scale.set(1, 1, 1);
}
const at = (x: number, y: number, z: number, sx = 1, sy = 1, sz = 1): Place => (a, o) => {
  base(a, o); o.translateX(x); o.translateY(y); o.translateZ(z); o.scale.set(sx, sy, sz);
};

function useParts() {
  return useMemo(() => {
    const graphite = std("#2a2f36"), steel = std("#8a93a0", { metalness: 0.8, roughness: 0.35 });
    const yellow = std("#e6b422", { metalness: 0.1 }), white = std("#e8edf2", { metalness: 0.1 });
    const deck = std("#3a3f47", { metalness: 0.2, roughness: 0.8 });
    const glass = new THREE.MeshPhysicalMaterial({ color: "#5fc8e6", transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.2, side: THREE.DoubleSide, depthWrite: false });
    const led = glow("#fff4dc", 3), cyan = glow("#33f0ff", 3), amber = glow("#ffb02e", 2.5);
    const red = glow("#ff2a2a", 4);
    const cyl = (rt: number, rb: number, hgt = 1, s = 8, open = false) => {
      const g = new THREE.CylinderGeometry(rt, rb, hgt, s, 1, open); g.translate(0, hgt / 2, 0); return g;
    };
    const box = (x: number, y: number, z: number) => new THREE.BoxGeometry(x, y, z);
    const tubeShell = new THREE.CylinderGeometry(1, 1, 3, 14, 1, true); tubeShell.rotateX(Math.PI / 2);
    const dishGeo = new THREE.SphereGeometry(0.9, 12, 6, 0, Math.PI * 2, 0, 0.9); dishGeo.rotateX(Math.PI * 0.75);
    const flatRing = new THREE.TorusGeometry(3.4, 0.14, 4, 32); flatRing.rotateX(Math.PI / 2);

    const P: Record<keyof Amenities, Part[]> = {
      lights: [
        { geo: cyl(0.07, 0.11, 5.6), mat: graphite, place: at(0, 0, 0) },
        { geo: box(0.09, 0.09, 1.7), mat: graphite, place: at(0, 5.55, 0.8) },
        { geo: box(0.32, 0.06, 0.6), mat: led, place: at(0, 5.47, 1.45) },
      ],
      bollards: [
        { geo: cyl(0.12, 0.14, 0.9), mat: graphite, place: at(0, 0, 0) },
        { geo: new THREE.TorusGeometry(0.14, 0.03, 4, 12).rotateX(Math.PI / 2), mat: cyan, place: at(0, 0.72, 0) },
      ],
      rails: [
        { geo: box(0.07, 0.09, 1), mat: steel, place: at(0, 0.95, 0) },
        { geo: box(0.07, 0.09, 1), mat: steel, place: at(0, 0.55, 0) },
        { geo: cyl(0.04, 0.04, 1), mat: steel, place: at(0, 0, 0) },
      ],
      ribs: [
        { geo: new THREE.TorusGeometry(1, 0.06, 5, 20), mat: steel, place: (a, o) => { base(a, o); o.scale.set(a.s, a.s, a.s); } },
        { geo: tubeShell, mat: glass, place: (a, o) => { base(a, o); o.scale.set(a.s, a.s, 1); } },
      ],
      conduits: [-0.25, 0, 0.25].map((x, k): Part => ({
        geo: cyl(0.07 + k * 0.02, 0.07 + k * 0.02, 1, 6), mat: k === 1 ? graphite : steel,
        place: (a: Anchor, o: THREE.Object3D) => { base(a, o); o.translateX(x); o.scale.set(1, a.s, 1); },
      })).concat([{ geo: box(0.9, 0.6, 0.4), mat: graphite, place: (a, o) => { base(a, o); o.translateY(a.s - 0.4); } }]),
      helipads: [
        { geo: cyl(4, 4, 0.06, 32), mat: deck, place: at(0, -0.02, 0) },
        { geo: flatRing, mat: yellow, place: at(0, 0.06, 0) },
        { geo: box(0.35, 0.03, 2.6), mat: white, place: at(-0.8, 0.06, 0) },
        { geo: box(0.35, 0.03, 2.6), mat: white, place: at(0.8, 0.06, 0) },
        { geo: box(1.3, 0.03, 0.35), mat: white, place: at(0, 0.06, 0) },
        ...Array.from({ length: 8 }, (_, k) => ({
          geo: new THREE.SphereGeometry(0.12, 6, 4), mat: amber,
          place: at(Math.cos((k / 8) * Math.PI * 2) * 3.9, 0.12, Math.sin((k / 8) * Math.PI * 2) * 3.9),
        })),
      ],
      masts: [
        { geo: cyl(0.6, 0.6, 0.8, 8), mat: graphite, place: at(0, 0, 0) },
        { geo: cyl(0.04, 0.22, 1, 6), mat: steel, place: (a, o) => { base(a, o); o.scale.set(1, a.s, 1); } },
        { geo: new THREE.SphereGeometry(0.18, 8, 6), mat: red, place: (a, o) => { base(a, o); o.translateY(a.s); } },
        { geo: new THREE.SphereGeometry(0.12, 6, 4), mat: red, place: (a, o) => { base(a, o); o.translateY(a.s * 0.55); } },
      ],
      dishes: [
        { geo: cyl(0.06, 0.08, 0.9), mat: steel, place: at(0, 0, 0) },
        { geo: dishGeo, mat: white, place: at(0, 1.1, 0) },
      ],
      vents: [
        { geo: cyl(0.6, 0.65, 0.8, 12), mat: steel, place: at(0, 0, 0) },
        { geo: cyl(0.75, 0.6, 0.15, 12), mat: graphite, place: at(0, 0.8, 0) },
        { geo: box(1.1, 0.04, 0.12), mat: graphite, place: at(0, 0.97, 0) },
      ],
    };
    return { P, red, cyan };
  }, []);
}

function Inst({ part, list }: { part: Part; list: Anchor[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    list.forEach((a, i) => { part.place(a, o); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
    m.instanceMatrix.needsUpdate = true;
  }, [part, list]);
  if (!list.length) return null;
  return <instancedMesh ref={ref} args={[part.geo, part.mat, list.length]} frustumCulled={false} />;
}

const PAD = 160;
export function CityAmenities() {
  const [data, setData] = useState<Amenities | null>(null);
  const { P, red, cyan } = useParts();
  const grp = useRef<THREE.Group>(null);
  useEffect(() => { let live = true; onAmenities((a) => live && setData(a)); return () => { live = false; }; }, []);
  useFrame(({ camera, clock }) => {
    const g = grp.current;
    if (!g) return;
    const p = camera.position;
    g.visible = p.x > LF_X0 - PAD && p.x < LF_X0 + LF_SIZE + PAD && p.z > LF_Z0 - PAD && p.z < LF_Z0 + LF_SIZE + PAD;
    const t = clock.elapsedTime;
    red.emissiveIntensity = (t * 1.2) % 1 < 0.18 ? 6 : 0.3; // ~1.2 Hz aviation strobe
    cyan.emissiveIntensity = 2.4 + Math.sin(t * 2.2) * 0.8;
  });
  if (!data) return null;
  return (
    <group ref={grp}>
      {(Object.keys(P) as (keyof Amenities)[]).flatMap((k) =>
        P[k].map((part, i) => <Inst key={`${k}${i}`} part={part} list={data[k]} />),
      )}
    </group>
  );
}
