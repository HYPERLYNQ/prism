import * as THREE from "three";

/**
 * "Gravity" physics for the debris field. The debris is drawn as instanced
 * meshes (one per shape), so this works on instance matrices rather than
 * individual objects:
 *
 *   • Build — decompose every instance's resting matrix into position /
 *     rotation / scale, and give each a per-piece floor (just below its home
 *     when it already sits low, so the lower half of the shell doesn't snap
 *     upward on the first frame).
 *
 *   • Active — integrate gravity, bounce on the floor with damping, and add a
 *     slow tumble. Writes instance matrices each frame.
 *
 *   • Released — spring every piece back to its home position + orientation;
 *     report `settled` once the whole field is home so the host can stop
 *     updating and resume the breathing rotation.
 *
 * Physics runs in the debris GROUP's local space, which the host holds at
 * identity (breathing frozen) while gravity is engaged — so local −Y is true
 * world-down and the field doesn't fall along the 17° breathing tilt.
 */

const G = 2600; // gravity accel (units/s²)
const FLOOR_Y = -1150; // global floor, a touch below the wordmark
const BOUNCE = 0.46; // vertical restitution
const FRICTION = 0.86; // horizontal damping on bounce
const AIR_DAMP = 1.0; // per-second velocity damping
const SETTLE_EPS = 1.5; // distance² below which a released piece counts as home

type GravEntry = {
  mesh: THREE.InstancedMesh;
  id: number;
  homePos: THREE.Vector3;
  homeQuat: THREE.Quaternion;
  scale: THREE.Vector3;
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
  vel: THREE.Vector3;
  angVel: THREE.Vector3;
  floorY: number;
};

export type GravityField = {
  entries: GravEntry[];
  meshes: THREE.InstancedMesh[];
};

export function buildGravityField(debrisMeshes: THREE.InstancedMesh[]): GravityField {
  const entries: GravEntry[] = [];
  const m4 = new THREE.Matrix4();
  for (const mesh of debrisMeshes) {
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, m4);
      const homePos = new THREE.Vector3();
      const homeQuat = new THREE.Quaternion();
      const scale = new THREE.Vector3();
      m4.decompose(homePos, homeQuat, scale);
      entries.push({
        mesh,
        id: i,
        homePos,
        homeQuat,
        scale,
        pos: homePos.clone(),
        quat: homeQuat.clone(),
        vel: new THREE.Vector3(),
        angVel: new THREE.Vector3(
          (Math.random() - 0.5) * 1.4,
          (Math.random() - 0.5) * 1.4,
          (Math.random() - 0.5) * 1.4,
        ),
        // Per-piece floor: pieces already below the global floor rest just
        // beneath their home instead of snapping up to it.
        floorY: Math.min(FLOOR_Y, homePos.y - 30),
      });
    }
  }
  return { entries, meshes: debrisMeshes };
}

const _m4 = new THREE.Matrix4();
const _spin = new THREE.Quaternion();
const _euler = new THREE.Euler();

/**
 * Step the field. `active` = falling; otherwise spring home. Returns true once
 * the whole field is settled at home (only meaningful when `!active`).
 */
export function updateGravity(field: GravityField, dt: number, active: boolean): boolean {
  let allSettled = true;
  for (const e of field.entries) {
    if (active) {
      e.vel.y -= G * dt;
      e.vel.multiplyScalar(Math.max(0, 1 - AIR_DAMP * dt));
      e.pos.addScaledVector(e.vel, dt);
      if (e.vel.y < 0 && e.pos.y < e.floorY) {
        e.pos.y = e.floorY;
        e.vel.y = -e.vel.y * BOUNCE;
        e.vel.x *= FRICTION;
        e.vel.z *= FRICTION;
        e.angVel.multiplyScalar(0.9);
      }
      _euler.set(e.angVel.x * dt, e.angVel.y * dt, e.angVel.z * dt);
      _spin.setFromEuler(_euler);
      e.quat.premultiply(_spin);
      allSettled = false;
    } else {
      // Spring back to home — exponential, frame-rate independent.
      const k = 1 - Math.exp(-6 * dt);
      e.pos.lerp(e.homePos, k);
      e.quat.slerp(e.homeQuat, k);
      e.vel.set(0, 0, 0);
      if (e.pos.distanceToSquared(e.homePos) > SETTLE_EPS) allSettled = false;
    }
    _m4.compose(e.pos, e.quat, e.scale);
    e.mesh.setMatrixAt(e.id, _m4);
  }
  // When fully settled, snap exact home matrices so there's no residual drift.
  if (!active && allSettled) {
    for (const e of field.entries) {
      e.pos.copy(e.homePos);
      e.quat.copy(e.homeQuat);
      _m4.compose(e.homePos, e.homeQuat, e.scale);
      e.mesh.setMatrixAt(e.id, _m4);
    }
  }
  for (const mesh of field.meshes) mesh.instanceMatrix.needsUpdate = true;
  return allSettled && !active;
}
