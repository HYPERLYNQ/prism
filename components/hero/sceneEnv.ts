import * as THREE from "three";

/**
 * Builds the IBL environment scene used to light the metallic / iridescent materials.
 *
 * A neutral RoomEnvironment would make every finish look samey, so this is a
 * deliberately contrasty studio: HDR-bright white key, a cyan strip on the left,
 * a magenta strip on the right, a warm bounce low, and a dim back fill. With this
 * env, chrome / iris / candy each read distinctly different from any camera angle.
 *
 * Caller is responsible for passing this scene to `PMREMGenerator.fromScene()` and
 * disposing the resulting RenderTarget when the scene is torn down.
 */
export function buildEnvScene(): THREE.Scene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c0e16);

  const panel = (color: THREE.Color, width: number, height: number, position: THREE.Vector3) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }),
    );
    mesh.position.copy(position);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);
  };

  // big key — HDR-bright white, top-right-forward
  panel(new THREE.Color(3.4, 3.4, 3.6), 9, 9, new THREE.Vector3(2, 7, 5));
  // cyan strip, left
  panel(new THREE.Color(0.4, 2.4, 3.2), 12, 2.4, new THREE.Vector3(-8, 1, 2));
  // magenta strip, right
  panel(new THREE.Color(3.0, 0.5, 1.9), 2.4, 12, new THREE.Vector3(7, -2, 3));
  // warm bounce, low
  panel(new THREE.Color(2.8, 1.9, 0.9), 8, 3, new THREE.Vector3(0, -7, 5));
  // dim back fill so reflections never go fully black
  panel(new THREE.Color(0.18, 0.22, 0.3), 26, 26, new THREE.Vector3(0, 0, -10));

  return scene;
}
