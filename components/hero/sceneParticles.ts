import * as THREE from "three";

/**
 * "Particle dissolve & reform" — the phrase-transition system.
 *
 * Instead of fading one phrase out and the next phrase in, this module turns
 * every letter of the current phrase into a swarm of small chrome shards, lets
 * them swirl through the scene, and converges them onto the surface of the
 * next phrase. Three GPU-side concerns:
 *
 *   1. **Surface sampling** — for each phrase we precompute N points scattered
 *      across the letter geometry, weighted by per-triangle area so the cloud
 *      genuinely covers each glyph evenly. Done once per phrase swap.
 *
 *   2. **Single InstancedMesh** — every shard is one instance of a tiny
 *      octahedron sharing the hero's chrome material, so the whole swarm is a
 *      single draw call. Per-frame work is just translation matrix writes.
 *
 *   3. **Three explicit phases** — DISSOLVE (particles at letter targets,
 *      explode outward with damped velocity), TRAVEL (particles drift, brief),
 *      REFORM (particles lerp to NEW phrase's targets with exponential easing).
 *      The host (useHeroScene) owns the phase clock and calls `updateParticles`
 *      with the current phase tag each frame.
 *
 * Particles use an always-opaque parallel material so they keep rendering as
 * solid chrome while the wordmark letters fade between phases.
 */

/* ── tunables ─────────────────────────────────────────────────────────── */
/** Total particles across the whole phrase. Higher = denser swarm, costs ~N
 *  matrix writes per frame. 2400 keeps each letter visibly covered. */
const PARTICLE_COUNT = 2400;
/** Half-radius of the octahedron shard. WORDMARK_SIZE=132, so 5 reads as a
 *  glint, not a chunk. */
const PARTICLE_SIZE = 5.0;
/** Per-particle random scale band — gives the swarm visual variation. */
const SIZE_JITTER_MIN = 0.6;
const SIZE_JITTER_MAX = 1.4;
/** Initial speed range for the dissolve burst (units / s). Tuned high so a
 *  particle visibly TRAVELS during the short dissolve phase — at lower values
 *  the swarm just dilates a little and reads as a passive dissolve, not a burst. */
const DISSOLVE_SPEED_MIN = 700;
const DISSOLVE_SPEED_MAX = 1600;
/** Per-frame velocity damping (compounded with dt). 0.985 is light damping so
 *  the burst keeps going for most of the phase instead of stalling out fast. */
const VEL_DAMP = 0.985;
/** Upward bias on dissolve velocity — embers-rising feel. */
const DISSOLVE_UP_BIAS = 120;
/** Fraction (0..1) of a particle's burst velocity that's directed radially
 *  outward from its parent letter's centre. The remainder is random-sphere
 *  jitter. High values (0.7+) make the burst read as "each letter exploded"
 *  rather than "particles flew in random directions". */
const BURST_RADIAL_WEIGHT = 0.78;
/** Seconds of L→R stagger across the phrase during REFORM. Particles for the
 *  first letter start converging at t=0; particles for the last letter wait
 *  this many seconds. Each particle gets the remaining time after its delay
 *  to converge fully — `phaseDur - delay`. */
const REFORM_STAGGER = 0.65;
/** Hard cap on letter count for the per-phrase letter-centre buffer. Phrases
 *  in this project are short ("ai with a day job." = 14 visible glyphs); 64
 *  is overkill-safe. */
const MAX_LETTERS = 64;

/* ── types ────────────────────────────────────────────────────────────── */
export type ParticlePhase = "DISSOLVE" | "TRAVEL" | "REFORM";

export type ParticleSystem = {
  group: THREE.Group;
  mesh: THREE.InstancedMesh;
  /** Current positions in group-local space [x,y,z * count]. */
  cur: Float32Array;
  /** Velocities in group-local space [x,y,z * count]. */
  vel: Float32Array;
  /** Target positions on the current phrase's letter surfaces. */
  targets: Float32Array;
  /** Per-particle size multiplier (jitter) for visual variation. */
  jitter: Float32Array;
  /** Pre-baked rotation+scale matrices per particle, stored as 16 floats each.
   *  Every frame, we copy the 3x3 rotation+scale block into the instance matrix
   *  and only overwrite the translation column — so each shard has a unique
   *  orientation that doesn't change over time (cheap, looks like tumbled chrome). */
  preMat: Float32Array;
  /** Which letter (index into the current phrase) each particle belongs to.
   *  Set by `applyPhraseSample`. Used by dissolve (for outward direction
   *  from the right letter centre) and by reform (for L→R stagger). */
  letterIndex: Uint16Array;
  /** xyz of each letter's home position for the current phrase. Lookup by
   *  `letterIndex[i]`. Sized for `MAX_LETTERS` letters. */
  letterCenters: Float32Array;
  /** Number of letters in the current phrase (≤ MAX_LETTERS). */
  letterCount: number;
  /** Position recorded at the moment each particle's stagger gate fires, used
   *  as the start of a time-based eased lerp toward target. */
  lerpStart: Float32Array;
  /** 0/1 flag per particle: has its stagger fired this REFORM yet? Reset by
   *  `startReform` at the entry to each REFORM phase. */
  hasStarted: Uint8Array;
  count: number;
};

/* ── geometry sampling ────────────────────────────────────────────────── */
/**
 * Sample `count` points uniformly across the surface of a non-indexed triangle
 * BufferGeometry. Uses area-weighted CDF for triangle selection and random
 * barycentric coords within the chosen triangle. Returns a `Float32Array` of
 * length `count * 3` (xyz in geometry-local space).
 */
function sampleGeometrySurface(
  geo: THREE.BufferGeometry,
  count: number,
): Float32Array {
  const pos = geo.attributes.position;
  const triCount = pos.count / 3;
  const cdf = new Float32Array(triCount);
  let total = 0;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  for (let i = 0; i < triCount; i++) {
    a.fromBufferAttribute(pos, i * 3 + 0);
    b.fromBufferAttribute(pos, i * 3 + 1);
    c.fromBufferAttribute(pos, i * 3 + 2);
    ab.subVectors(b, a);
    ac.subVectors(c, a);
    total += ab.cross(ac).length() * 0.5;
    cdf[i] = total;
  }
  // Normalize CDF
  if (total > 0) for (let i = 0; i < triCount; i++) cdf[i] /= total;

  const out = new Float32Array(count * 3);
  for (let s = 0; s < count; s++) {
    // Binary search for triangle
    const r = Math.random();
    let lo = 0;
    let hi = triCount - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid] < r) lo = mid + 1;
      else hi = mid;
    }
    const i = lo;
    a.fromBufferAttribute(pos, i * 3 + 0);
    b.fromBufferAttribute(pos, i * 3 + 1);
    c.fromBufferAttribute(pos, i * 3 + 2);
    // Random barycentric (reflect if u+v>1)
    let u = Math.random();
    let v = Math.random();
    if (u + v > 1) {
      u = 1 - u;
      v = 1 - v;
    }
    const w = 1 - u - v;
    out[s * 3 + 0] = a.x * w + b.x * u + c.x * v;
    out[s * 3 + 1] = a.y * w + b.y * u + c.y * v;
    out[s * 3 + 2] = a.z * w + b.z * u + c.z * v;
  }
  return out;
}

/**
 * Immutable, per-phrase particle layout. Surface sampling is deterministic for
 * a given phrase (the letter geometry never changes once built), so we compute
 * this ONCE per phrase at load and reuse it on every transition — instead of
 * re-running the whole area-weighted sampling (thousands of triangle area
 * computations + 2400 binary searches + array allocations) twice per cycle in
 * the middle of the animation, which showed up as a hitch at each transition.
 */
export type PhraseSample = {
  /** Particle target positions in group-local space (letter offsets baked in). */
  targets: Float32Array;
  /** Per-particle parent-letter index. */
  letterIndex: Uint16Array;
  /** xyz of each letter's home position, indexed by letterIndex. */
  letterCenters: Float32Array;
  /** Letter count for this phrase. */
  letterCount: number;
};

/**
 * Compute a `PhraseSample` for one phrase: distribute `count` particles across
 * its letters proportional to surface area, sampling each letter's geometry.
 * Pure — allocates and returns fresh arrays, mutates nothing. Call once per
 * phrase at load; cache the result.
 */
export function samplePhrase(
  letterMeshes: THREE.Mesh[],
  count: number,
): PhraseSample {
  const n = letterMeshes.length;
  const lc = Math.min(n, MAX_LETTERS);
  const targets = new Float32Array(count * 3);
  const letterIndex = new Uint16Array(count);
  const letterCenters = new Float32Array(Math.max(1, lc) * 3);
  if (n === 0) return { targets, letterIndex, letterCenters, letterCount: 0 };

  // Per-letter area
  const areas = new Float32Array(n);
  let total = 0;
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  for (let li = 0; li < n; li++) {
    const pos = (letterMeshes[li].geometry as THREE.BufferGeometry).attributes
      .position;
    const triCount = pos.count / 3;
    let area = 0;
    for (let i = 0; i < triCount; i++) {
      a.fromBufferAttribute(pos, i * 3 + 0);
      b.fromBufferAttribute(pos, i * 3 + 1);
      c.fromBufferAttribute(pos, i * 3 + 2);
      ab.subVectors(b, a);
      ac.subVectors(c, a);
      area += ab.cross(ac).length() * 0.5;
    }
    areas[li] = area;
    total += area;
  }

  for (let li = 0; li < lc; li++) {
    const home = letterMeshes[li].userData.home as THREE.Vector3;
    letterCenters[li * 3 + 0] = home.x;
    letterCenters[li * 3 + 1] = home.y;
    letterCenters[li * 3 + 2] = home.z;
  }

  // Allocate particles per letter, area-weighted; remainder to last letter.
  let written = 0;
  for (let li = 0; li < n; li++) {
    const isLast = li === n - 1;
    const share = isLast
      ? count - written
      : Math.round((count * areas[li]) / total);
    if (share <= 0) continue;
    const home = letterMeshes[li].userData.home as THREE.Vector3;
    const local = sampleGeometrySurface(
      letterMeshes[li].geometry as THREE.BufferGeometry,
      share,
    );
    for (let s = 0; s < share; s++) {
      const p = (written + s) * 3;
      targets[p + 0] = local[s * 3 + 0] + home.x;
      targets[p + 1] = local[s * 3 + 1] + home.y;
      targets[p + 2] = local[s * 3 + 2] + home.z;
      letterIndex[written + s] = li;
    }
    written += share;
  }

  return { targets, letterIndex, letterCenters, letterCount: lc };
}

/**
 * Point the live system at a cached phrase sample. O(1) — just swaps the
 * read-only target/index/centre references; no copying, no recompute. The
 * arrays are never mutated after sampling, so sharing by reference is safe.
 */
export function applyPhraseSample(
  system: ParticleSystem,
  sample: PhraseSample,
): void {
  system.targets = sample.targets;
  system.letterIndex = sample.letterIndex;
  system.letterCenters = sample.letterCenters;
  system.letterCount = sample.letterCount;
}

/* ── build / dispose ──────────────────────────────────────────────────── */
export function buildParticleSystem(
  material: THREE.Material,
  count: number = PARTICLE_COUNT,
): ParticleSystem {
  // Low-res sphere — 6 width × 4 height segments (~36 tris). At the on-screen
  // size of a particle (~a few px from the resting camera distance) this is
  // visually indistinguishable from a denser sphere but ~55% lighter on the
  // per-instance triangle budget (36 vs 80 tris × 2400 instances).
  const shardGeo = new THREE.SphereGeometry(PARTICLE_SIZE, 6, 4);
  const mesh = new THREE.InstancedMesh(shardGeo, material, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  // Layer 1 = same render pass as the wordmark, drawn in front of the debris.
  mesh.layers.set(1);
  mesh.visible = false;

  const group = new THREE.Group();
  group.add(mesh);

  const cur = new Float32Array(count * 3);
  const vel = new Float32Array(count * 3);
  const targets = new Float32Array(count * 3);
  const jitter = new Float32Array(count);
  const preMat = new Float32Array(count * 16);
  const letterIndex = new Uint16Array(count);
  const letterCenters = new Float32Array(MAX_LETTERS * 3);
  const lerpStart = new Float32Array(count * 3);
  const hasStarted = new Uint8Array(count);

  // Bake a random orientation + scale into each particle's preMat. Done once
  // — saves ~2400 quaternion-to-matrix conversions per frame in the hot loop.
  const _q = new THREE.Quaternion();
  const _s = new THREE.Vector3();
  const _p0 = new THREE.Vector3(0, 0, 0);
  const _m = new THREE.Matrix4();
  for (let i = 0; i < count; i++) {
    jitter[i] =
      SIZE_JITTER_MIN + Math.random() * (SIZE_JITTER_MAX - SIZE_JITTER_MIN);
    // Uniform-random unit quaternion via four gaussian-ish samples normalized.
    _q.set(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
    ).normalize();
    _s.setScalar(jitter[i]);
    _m.compose(_p0, _q, _s);
    const base = i * 16;
    for (let k = 0; k < 16; k++) preMat[base + k] = _m.elements[k];
  }

  return {
    group, mesh, cur, vel, targets, jitter, preMat,
    letterIndex, letterCenters, letterCount: 0,
    lerpStart, hasStarted, count,
  };
}

export function disposeParticleSystem(system: ParticleSystem): void {
  system.mesh.geometry.dispose();
  // Material lifetime is owned by the host.
}

export function setParticleMaterial(
  system: ParticleSystem,
  material: THREE.Material,
): void {
  system.mesh.material = material;
}

/* ── phase entry: dissolve start ──────────────────────────────────────── */
/**
 * Seed the explosion: place every particle at its current target (the dissolving
 * phrase's surface point) and give it a randomized outward velocity with a small
 * upward bias. Subsequent `updateParticles("DISSOLVE", ...)` calls integrate.
 *
 * Call this AFTER `applyPhraseSample(system, currentPhraseSample)` so
 * particles start where the to-be-dissolved letters actually are.
 */
export function startDissolve(system: ParticleSystem): void {
  for (let i = 0; i < system.count; i++) {
    const p = i * 3;
    const tx = system.targets[p + 0];
    const ty = system.targets[p + 1];
    const tz = system.targets[p + 2];
    system.cur[p + 0] = tx;
    system.cur[p + 1] = ty;
    system.cur[p + 2] = tz;

    // Outward direction = (target − this particle's letter centre), normalized.
    // This is what makes the burst read as "each letter exploded" — particles
    // fly AWAY from the body of their own letter rather than in random
    // directions, so the silhouette of the burst preserves a memory of where
    // each letter was.
    const li = system.letterIndex[i];
    const cx = system.letterCenters[li * 3 + 0];
    const cy = system.letterCenters[li * 3 + 1];
    const cz = system.letterCenters[li * 3 + 2];
    let dx = tx - cx;
    let dy = ty - cy;
    let dz = tz - cz;
    const dlen = Math.hypot(dx, dy, dz) || 1;
    dx /= dlen;
    dy /= dlen;
    dz /= dlen;

    // Random sphere jitter so the burst isn't a perfect star.
    const theta = Math.random() * Math.PI * 2;
    const cosPhi = Math.random() * 2 - 1;
    const sinPhi = Math.sqrt(1 - cosPhi * cosPhi);
    const jx = sinPhi * Math.cos(theta);
    const jy = cosPhi;
    const jz = sinPhi * Math.sin(theta);

    // Mix radial + jitter and apply the speed scalar.
    const w = BURST_RADIAL_WEIGHT;
    const vx = dx * w + jx * (1 - w);
    const vy = dy * w + jy * (1 - w);
    const vz = dz * w + jz * (1 - w);
    const speed =
      DISSOLVE_SPEED_MIN +
      Math.random() * (DISSOLVE_SPEED_MAX - DISSOLVE_SPEED_MIN);
    system.vel[p + 0] = vx * speed;
    system.vel[p + 1] = vy * speed + DISSOLVE_UP_BIAS;
    system.vel[p + 2] = vz * speed;
  }
  system.mesh.visible = true;
}

/** Prepare the swarm for a fresh REFORM: clear every particle's `hasStarted`
 *  flag so the first frame after each particle's stagger fires snapshots its
 *  current position as the start of a time-based eased lerp toward target.
 *  Call from the host right after `applyPhraseSample` at TRAVEL → REFORM. */
export function startReform(system: ParticleSystem): void {
  system.hasStarted.fill(0);
}

/** Hide the swarm (called by host at end of REFORM). */
export function endReform(system: ParticleSystem): void {
  system.mesh.visible = false;
}

/* ── per-frame update ─────────────────────────────────────────────────── */

/**
 * Per-frame integration. Three behaviours:
 *
 *   DISSOLVE / TRAVEL — integrate velocity with light damping.
 *   REFORM            — time-based eased lerp from each particle's stored
 *     `lerpStart` to its `target`, guaranteeing arrival at end of phase. A
 *     per-particle stagger keyed off `letterIndex` delays later letters so
 *     the phrase visibly writes itself in from left to right.
 *
 * `phaseClock` is the host's time within the current phase; `phaseDur` is
 * the phase's total length (only REFORM uses both — needed to compute
 * per-particle remaining time after stagger). `scaleFade` (0..1) multiplies
 * the rotation+scale block of every instance matrix and lets the host
 * shrink the swarm out as letters fade in.
 */
export function updateParticles(
  system: ParticleSystem,
  phase: ParticlePhase,
  dt: number,
  phaseClock: number = 0,
  phaseDur: number = 1,
  scaleFade: number = 1,
): void {
  const count = system.count;
  const cur = system.cur;
  const vel = system.vel;
  const targets = system.targets;
  const damp = Math.pow(VEL_DAMP, dt * 60);

  if (phase === "REFORM") {
    const denom = Math.max(1, system.letterCount - 1);
    const ls = system.lerpStart;
    const hs = system.hasStarted;
    for (let i = 0; i < count; i++) {
      const o = i * 3;
      const delay = (system.letterIndex[i] / denom) * REFORM_STAGGER;
      const myT = phaseClock - delay;

      if (myT < 0) {
        // Pre-stagger — continue the TRAVEL drift with damping.
        cur[o + 0] += vel[o + 0] * dt;
        cur[o + 1] += vel[o + 1] * dt;
        cur[o + 2] += vel[o + 2] * dt;
        vel[o + 0] *= damp;
        vel[o + 1] *= damp;
        vel[o + 2] *= damp;
        continue;
      }

      // First frame of this particle's lerp — snapshot the drift position as
      // the start of the eased path toward target. (Doing it here, not at
      // REFORM start, means each particle's lerp begins from wherever it
      // actually was when its stagger fired.)
      if (!hs[i]) {
        hs[i] = 1;
        ls[o + 0] = cur[o + 0];
        ls[o + 1] = cur[o + 1];
        ls[o + 2] = cur[o + 2];
      }

      // Time-based eased lerp: progress 0 at delay, 1 at end of phase.
      const myDur = Math.max(0.0001, phaseDur - delay);
      const p = Math.min(1, myT / myDur);
      // easeInOutCubic — slow start, slow end. Slow start means no velocity
      // discontinuity vs. the drift the particle was just doing; slow end
      // means it settles cleanly on target instead of skidding past it.
      const eased = p < 0.5
        ? 4 * p * p * p
        : 1 - Math.pow(-2 * p + 2, 3) / 2;
      cur[o + 0] = ls[o + 0] + (targets[o + 0] - ls[o + 0]) * eased;
      cur[o + 1] = ls[o + 1] + (targets[o + 1] - ls[o + 1]) * eased;
      cur[o + 2] = ls[o + 2] + (targets[o + 2] - ls[o + 2]) * eased;
    }
  } else {
    // DISSOLVE / TRAVEL — integrate velocity with damping.
    for (let i = 0; i < count; i++) {
      const o = i * 3;
      cur[o + 0] += vel[o + 0] * dt;
      cur[o + 1] += vel[o + 1] * dt;
      cur[o + 2] += vel[o + 2] * dt;
      vel[o + 0] *= damp;
      vel[o + 1] *= damp;
      vel[o + 2] *= damp;
    }
  }

  // Write instance matrices: copy baked rotation+scale block (multiplied by
  // scaleFade for the shrink-out handoff to letters), overwrite the
  // translation column with current position. Direct array writes are faster
  // than setMatrixAt(+Matrix4) for 2400+ particles.
  const arr = system.mesh.instanceMatrix.array as Float32Array;
  const preMat = system.preMat;
  for (let i = 0; i < count; i++) {
    const m = i * 16;
    const o = i * 3;
    arr[m + 0] = preMat[m + 0] * scaleFade;
    arr[m + 1] = preMat[m + 1] * scaleFade;
    arr[m + 2] = preMat[m + 2] * scaleFade;
    arr[m + 3] = 0;
    arr[m + 4] = preMat[m + 4] * scaleFade;
    arr[m + 5] = preMat[m + 5] * scaleFade;
    arr[m + 6] = preMat[m + 6] * scaleFade;
    arr[m + 7] = 0;
    arr[m + 8] = preMat[m + 8] * scaleFade;
    arr[m + 9] = preMat[m + 9] * scaleFade;
    arr[m + 10] = preMat[m + 10] * scaleFade;
    arr[m + 11] = 0;
    arr[m + 12] = cur[o + 0];
    arr[m + 13] = cur[o + 1];
    arr[m + 14] = cur[o + 2];
    arr[m + 15] = 1;
  }
  system.mesh.instanceMatrix.needsUpdate = true;
}
