import * as THREE from "three";
import { MeshSurfaceSampler } from "three/addons/math/MeshSurfaceSampler.js";

/**
 * "Points" render mode — swaps every solid surface in the hero for a
 * surface-sampled dot cloud. Two clouds, built once and toggled per frame:
 *
 *   • Wordmark — a `THREE.Points` child is parented to every letter mesh of
 *     every phrase (built at font load). Because it's a child, it inherits the
 *     letter's transform for free, so the cloud follows the scatter throw and
 *     the breathing tilt without any per-frame bookkeeping. Only the active
 *     phrase's twins are in the scene (they ride along with `attachPhraseToRoot`).
 *
 *   • Debris — one baked `THREE.Points` parented to the debris group. Every
 *     instance of every shape is surface-sampled once and transformed into the
 *     group's local space, so the single cloud covers the whole field and the
 *     group's breathing rotation carries it. `rebakeDebrisPoints` refreshes it
 *     from live instance matrices (used while gravity is animating the field).
 *
 * Points are drawn as round soft sprites (not hard GL squares) so the cloud
 * reads as a dusting of light rather than pixel noise. The material is shared
 * and recoloured by the host when the hero / debris tint changes.
 */

/** Sampled points per letter glyph — dense enough to read the letterform.
 *  Matches the prototype value. */
const LETTER_SAMPLES = 1400;
/** Sampled points per debris instance — matches the prototype's 350-per-shape
 *  density so each piece reads as its shape, not a sparse smatter. */
const DEBRIS_SAMPLES = 350;

/** Round, soft-edged dot sprite. Hard `gl_Points` squares are a big part of
 *  why naive point clouds read as noise; a radial-alpha sprite fixes it.
 *  Exported so the dissolve-swarm points twin can share the exact look. */
export function makeDotTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.55, "rgba(255,255,255,0.9)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export type PointsLayer = {
  /** Wordmark cloud material (hero tint). */
  heroMat: THREE.PointsMaterial;
  /** Debris cloud material (debris tint). */
  debrisMat: THREE.PointsMaterial;
  dotTex: THREE.CanvasTexture;
  /** Every letter Points twin, across all phrases (for visibility toggling). */
  letterTwins: THREE.Points[];
  /** The baked debris cloud, parented to the debris group by the caller. */
  debrisPoints: THREE.Points;
  /** Per-instance bake data, kept so gravity can refresh the debris cloud. */
  debrisBake: DebrisBakeEntry[];
  dispose: () => void;
};

type DebrisBakeEntry = {
  mesh: THREE.InstancedMesh;
  instanceId: number;
  /** Local sampled offsets for this instance's shape, shape-space (pre-matrix). */
  base: Float32Array;
  /** Offset into the cloud's position buffer where this instance's points start. */
  writeAt: number;
};

/** Sample `n` surface points of a geometry into a flat [x,y,z,...] array. */
function sampleGeometry(geo: THREE.BufferGeometry, n: number): Float32Array {
  const probe = new THREE.Mesh(geo);
  const sampler = new MeshSurfaceSampler(probe).build();
  const out = new Float32Array(n * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    sampler.sample(v);
    out[i * 3] = v.x;
    out[i * 3 + 1] = v.y;
    out[i * 3 + 2] = v.z;
  }
  return out;
}

/**
 * Build the points layer. `phraseLetterMeshes` is the per-phrase letter array
 * (parallel to the host's structure); `debrisMeshes` is the InstancedMesh per
 * shape. The caller parents `debrisPoints` to the debris group.
 */
export function buildPointsLayer(
  phraseLetterMeshes: THREE.Mesh[][],
  debrisMeshes: THREE.InstancedMesh[],
  heroTintHex: string,
  debrisTintHex: string,
): PointsLayer {
  const dotTex = makeDotTexture();
  const mkMat = (hex: string, size: number) =>
    new THREE.PointsMaterial({
      color: new THREE.Color(hex),
      size,
      map: dotTex,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
  const heroMat = mkMat(heroTintHex, 3.4);
  const debrisMat = mkMat(debrisTintHex, 3.4);

  // Wordmark twins — one Points child per letter, on layer 1, hidden by default.
  const letterTwins: THREE.Points[] = [];
  for (const meshes of phraseLetterMeshes) {
    for (const letter of meshes) {
      const cloud = new THREE.BufferGeometry();
      cloud.setAttribute(
        "position",
        new THREE.BufferAttribute(sampleGeometry(letter.geometry, LETTER_SAMPLES), 3),
      );
      const pts = new THREE.Points(cloud, heroMat);
      pts.layers.set(1);
      pts.visible = false;
      letter.add(pts);
      letterTwins.push(pts);
    }
  }

  // Debris cloud — bake every instance into one buffer in group-local space.
  let total = 0;
  for (const mesh of debrisMeshes) total += mesh.count;
  const positions = new Float32Array(total * DEBRIS_SAMPLES * 3);
  const debrisBake: DebrisBakeEntry[] = [];
  const m4 = new THREE.Matrix4();
  const v = new THREE.Vector3();
  let write = 0;
  for (const mesh of debrisMeshes) {
    const base = sampleGeometry(mesh.geometry, DEBRIS_SAMPLES);
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, m4);
      for (let s = 0; s < DEBRIS_SAMPLES; s++) {
        v.set(base[s * 3], base[s * 3 + 1], base[s * 3 + 2]).applyMatrix4(m4);
        positions[write + s * 3] = v.x;
        positions[write + s * 3 + 1] = v.y;
        positions[write + s * 3 + 2] = v.z;
      }
      debrisBake.push({ mesh, instanceId: i, base, writeAt: write });
      write += DEBRIS_SAMPLES * 3;
    }
  }
  const debrisGeo = new THREE.BufferGeometry();
  debrisGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const debrisPoints = new THREE.Points(debrisGeo, debrisMat);
  debrisPoints.layers.set(0);
  debrisPoints.visible = false;

  return {
    heroMat,
    debrisMat,
    dotTex,
    letterTwins,
    debrisPoints,
    debrisBake,
    dispose() {
      for (const p of letterTwins) p.geometry.dispose();
      debrisPoints.geometry.dispose();
      heroMat.dispose();
      debrisMat.dispose();
      dotTex.dispose();
    },
  };
}

/** Recolour the wordmark point cloud (follows the hero tint). */
export function setHeroPointsColor(layer: PointsLayer, tintHex: string): void {
  layer.heroMat.color.set(tintHex);
}
/** Recolour the debris point cloud (follows the debris tint). */
export function setDebrisPointsColor(layer: PointsLayer, tintHex: string): void {
  layer.debrisMat.color.set(tintHex);
}

/**
 * Refresh the debris cloud from live instance matrices — call each frame while
 * gravity is animating the field so the points fall with the solid pieces.
 */
export function rebakeDebrisPoints(layer: PointsLayer): void {
  const attr = layer.debrisPoints.geometry.getAttribute("position") as THREE.BufferAttribute;
  const positions = attr.array as Float32Array;
  const m4 = new THREE.Matrix4();
  const v = new THREE.Vector3();
  for (const e of layer.debrisBake) {
    e.mesh.getMatrixAt(e.instanceId, m4);
    const base = e.base;
    for (let s = 0; s < base.length / 3; s++) {
      v.set(base[s * 3], base[s * 3 + 1], base[s * 3 + 2]).applyMatrix4(m4);
      positions[e.writeAt + s * 3] = v.x;
      positions[e.writeAt + s * 3 + 1] = v.y;
      positions[e.writeAt + s * 3 + 2] = v.z;
    }
  }
  attr.needsUpdate = true;
}
