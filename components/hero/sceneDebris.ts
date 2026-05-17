import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import {
  CAM_CLEAR,
  DEBRIS_SCALE_MIN,
  DEBRIS_SCALE_SPAN,
  MIN_DEBRIS_DOT,
  SHELL_IN,
  SHELL_OUT,
} from "./sceneConfig";

/**
 * Builds the six "3-D emoji" shapes used as floating debris around the hero — smiley,
 * heart, sparkle ✦, lightning bolt, pill, gem — and places them on a spherical shell
 * around the wordmark with an even angular distribution.
 *
 * Placement algorithm:
 *   1. Pick a direction by rejection-sampling inside the unit ball, then normalising.
 *   2. Pick a radius uniform-in-volume across [SHELL_IN, SHELL_OUT].
 *   3. Reject if too close to an already-placed piece (angular min-gap) or too close
 *      to the camera-rest point (so a piece doesn't sit huge on the lens).
 *   4. Round-robin the six shapes so they're intermixed evenly across the cloud.
 */

/** Extrude a 2-D shape into a chunky bevelled 3-D form, then centre on origin. */
function extrudeGeo(shape: THREE.Shape, depth: number, bevel: number): THREE.ExtrudeGeometry {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 14,
    steps: 1,
  });
  geo.center();
  return geo;
}

/** N-pointed star with alternating outer/inner radii. Used for sparkle ✦. */
function buildStarShape(points: number, outer: number, inner: number): THREE.Shape {
  const shape = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const theta = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(theta) * r;
    const y = Math.sin(theta) * r;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

/** Canonical heart silhouette via cubic Béziers, scaled up and flipped so the lobes face up. */
function buildHeartShape(): THREE.Shape {
  const shape = new THREE.Shape();
  const k = 10.5;
  /** Local coord helper: scale by `k` and flip Y. */
  const p = (x: number, y: number): [number, number] => [x * k, -y * k];

  const [sx, sy] = p(5, 5);
  shape.moveTo(sx, sy);

  /** Three-control-point cubic Bézier with our coord transform applied. */
  const curve = (a: readonly [number, number], b: readonly [number, number], c: readonly [number, number]) =>
    shape.bezierCurveTo(a[0], a[1], b[0], b[1], c[0], c[1]);

  curve(p(5, 5), p(4, 0), p(0, 0));
  curve(p(-6, 0), p(-6, 3.5), p(-6, 3.5));
  curve(p(-6, 5.5), p(-4, 7.7), p(5, 9.5));
  curve(p(12, 7.7), p(16, 5.5), p(16, 3.5));
  curve(p(16, 3.5), p(16, 0), p(10, 0));
  curve(p(7, 0), p(5, 5), p(5, 5));
  return shape;
}

/** Zigzag lightning-bolt silhouette as a closed polygon. */
function buildBoltShape(): THREE.Shape {
  const k = 4.0;
  const pts: ReadonlyArray<readonly [number, number]> = [
    [-7, 42], [12, 8], [0, 8], [16, -42], [-14, 2], [-2, 2],
  ];
  const shape = new THREE.Shape();
  pts.forEach(([x, y], i) => {
    const px = x * k;
    const py = y * k;
    if (i === 0) shape.moveTo(px, py); else shape.lineTo(px, py);
  });
  shape.closePath();
  return shape;
}

/**
 * Smiley face built by merging a flat disc + two eye bumps + a half-torus smile
 * into a single geometry. The face is squashed in Z so the features clearly poke
 * forward and read as facial bumps rather than blending into a sphere.
 */
function buildSmileyGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [
    (() => {
      const g = new THREE.SphereGeometry(58, 22, 14);
      g.scale(1, 1, 0.28); // very flat face disc
      return g;
    })(),
    (() => {
      const g = new THREE.SphereGeometry(12, 12, 10);
      g.translate(-23, 20, 22); // bigger eye L, poking out
      return g;
    })(),
    (() => {
      const g = new THREE.SphereGeometry(12, 12, 10);
      g.translate(23, 20, 22); // bigger eye R
      return g;
    })(),
    (() => {
      const g = new THREE.TorusGeometry(30, 8, 10, 24, Math.PI);
      g.rotateZ(Math.PI);
      g.translate(0, -14, 22); // bigger smile, poking out
      return g;
    })(),
  ];
  const merged = mergeGeometries(parts, false)!;
  parts.forEach((p) => p.dispose());
  merged.center();
  merged.scale(1.55, 1.55, 1.55);
  return merged;
}

/** Stretched octahedron used as a low-poly gem 💎. */
function buildGemGeometry(): THREE.BufferGeometry {
  const geo = new THREE.OctahedronGeometry(86, 0);
  geo.scale(0.8, 1.32, 0.8);
  return geo;
}

/**
 * Build all six debris geometries. Returned in a stable order so the caller can
 * round-robin them across instance buckets. The caller owns disposal.
 */
export function buildDebrisGeometries(): THREE.BufferGeometry[] {
  return [
    buildSmileyGeometry(),
    extrudeGeo(buildHeartShape(), 34, 12),
    extrudeGeo(buildStarShape(4, 100, 22), 26, 9), // sparkle ✦
    extrudeGeo(buildBoltShape(), 28, 9),           // lightning
    new THREE.CapsuleGeometry(30, 78, 10, 18),     // pill
    buildGemGeometry(),
  ];
}

/**
 * Place `totalCount` instances across the six geometries, round-robined for an
 * even mix. Returns six InstancedMeshes (one per shape) already added to the group.
 *
 * `totalCount` is **required** — the caller must explicitly pick a value (see
 * `DEBRIS_TOTAL` for desktop / `DEBRIS_TOTAL_MOBILE` for the mobile branch in
 * `sceneConfig.ts`). Making it required prevents the mobile perf branch from
 * being silently bypassed if a future call site forgets to pass the count.
 *
 * Caller is responsible for disposing the instance geometries when the scene
 * tears down (the InstancedMesh `.geometry.dispose()` call covers this).
 */
export function placeDebris(
  group: THREE.Group,
  material: THREE.Material,
  cameraRest: THREE.Vector3,
  totalCount: number,
): THREE.InstancedMesh[] {
  const geometries = buildDebrisGeometries();
  const buckets: THREE.Matrix4[][] = geometries.map(() => []);
  const scratchObject = new THREE.Object3D();
  const scratchPosition = new THREE.Vector3();
  const placedDirections: THREE.Vector3[] = [];

  for (let n = 0; n < totalCount; n++) {
    pickPositionOnShell(scratchPosition, placedDirections, cameraRest);
    scratchObject.position.copy(scratchPosition);
    scratchObject.rotation.set(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28);
    scratchObject.scale.setScalar(DEBRIS_SCALE_MIN + Math.random() * DEBRIS_SCALE_SPAN);
    scratchObject.updateMatrix();
    buckets[n % geometries.length].push(scratchObject.matrix.clone());
  }

  const meshes: THREE.InstancedMesh[] = [];
  geometries.forEach((geo, idx) => {
    const matrices = buckets[idx];
    const mesh = new THREE.InstancedMesh(geo, material, Math.max(matrices.length, 1));
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
    mesh.count = matrices.length;
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
    meshes.push(mesh);
  });
  return meshes;
}

/**
 * Pick a single shell position by rejection sampling: uniform direction on the
 * unit sphere, uniform-in-volume radius in [SHELL_IN, SHELL_OUT], rejected if
 * either too close to a previously-placed piece (angular gap) or to the lens.
 *
 * After up to 80 attempts, gives up and accepts whatever direction it last
 * generated (the scene will still look fine — a couple of pieces may pair up).
 */
function pickPositionOnShell(
  out: THREE.Vector3,
  placedDirections: THREE.Vector3[],
  cameraRest: THREE.Vector3,
): void {
  const dir = new THREE.Vector3();

  for (let attempt = 0; attempt < 80; attempt++) {
    // Uniform direction on the unit sphere — rejection-sample inside the unit ball, then normalise.
    let lenSq = 2;
    do {
      dir.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
      lenSq = dir.lengthSq();
    } while (lenSq > 1 || lenSq < 1e-4);
    dir.multiplyScalar(1 / Math.sqrt(lenSq));

    // Reject if this direction is too close to any already-placed direction.
    let tooClose = false;
    for (const d of placedDirections) {
      if (dir.dot(d) > MIN_DEBRIS_DOT) {
        tooClose = true;
        break;
      }
    }
    if (tooClose) continue;

    // Uniform-in-volume radius across the shell.
    const radius = Math.cbrt(SHELL_IN ** 3 + Math.random() * (SHELL_OUT ** 3 - SHELL_IN ** 3));
    out.copy(dir).multiplyScalar(radius);

    // Reject if the resulting world position lands inside the lens-clear bubble.
    if (out.distanceTo(cameraRest) < CAM_CLEAR) continue;

    placedDirections.push(dir.clone());
    return;
  }

  // Fallback: accept the last direction we tried.
  placedDirections.push(dir.clone());
}
