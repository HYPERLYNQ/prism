import * as THREE from "three";
import type { MatName } from "@/lib/looks";
import {
  NEON_DEBRIS_TARGET_LUMA,
  NEON_FALLBACK_HEX,
  NEON_HERO_TARGET_LUMA,
  NEON_LUMA_FLOOR,
  NEON_MAX_INTENSITY,
  NEON_MIN_INTENSITY,
  NEON_MIN_SATURATION,
  NEON_PEAK_CHANNEL,
} from "./sceneConfig";

/**
 * The seven material recipes the user can pick from the "finish" row.
 *
 * Each recipe is a plain object handed to `MeshPhysicalMaterial`. The hero and
 * the debris are built from the *same* recipe so they read as one material — with
 * the one exception of `neon`, where the debris uses a dimmer variant
 * (`makeNeonDebrisMaterial`) that stays below the bloom threshold so only the
 * wordmark itself produces the glow halo.
 */

/**
 * Compute the `emissiveIntensity` to use with a given linear-RGB neon colour.
 *
 * Two caps are applied and the lower one wins:
 *
 *   1. **luma cap** — `targetLuma / linearLuma(color)`. Pulls bright tints
 *      (gold-leaf, chartreuse) down so they don't produce a cloud bloom.
 *   2. **peak-channel cap** — `NEON_PEAK_CHANNEL / max(r, g, b)`. Pulls dim
 *      tints (deep-teal, aubergine) down so their dominant channel doesn't blow
 *      past 1.0 and wash the letter interior to near-white after tonemap.
 *
 * The result is clamped to `[NEON_MIN_INTENSITY, NEON_MAX_INTENSITY]`.
 *
 * Rec 709 weights (0.2126, 0.7152, 0.0722) match the metric
 * `UnrealBloomPass` uses for its threshold extraction — so the math is
 * calibrated against what the bloom pass actually sees, not a perceptual proxy.
 */
export function computeNeonIntensity(linearColor: THREE.Color, targetLuma: number): number {
  const luma = 0.2126 * linearColor.r + 0.7152 * linearColor.g + 0.0722 * linearColor.b;
  const lumaIntensity = targetLuma / Math.max(luma, NEON_LUMA_FLOOR);

  const maxChannel = Math.max(linearColor.r, linearColor.g, linearColor.b);
  const channelIntensity = NEON_PEAK_CHANNEL / Math.max(maxChannel, NEON_LUMA_FLOOR);

  const capped = Math.min(lumaIntensity, channelIntensity);
  return Math.min(NEON_MAX_INTENSITY, Math.max(NEON_MIN_INTENSITY, capped));
}

/**
 * Builds the material for a given finish + tint. The tint determines the colour
 * of every material except (almost) chrome and gold, which lean on their fixed
 * silver / yellow base and pick up the tint only as a 45 % colour mix plus a
 * subtle tint emissive — so picking a hero colour still has visible effect on
 * the metallic finishes.
 *
 * Desaturated tints fall back to a hot pink for the neon glow only, so a
 * white / grey / ink hero choice doesn't produce an invisible neon.
 */
export function makePreset(name: MatName, tintHex: string): THREE.MeshPhysicalMaterial {
  const tint = new THREE.Color(tintHex);
  const white = new THREE.Color(0xffffff);
  /** Mix `tint` toward white by `k` (0 = pure tint, 1 = pure white). */
  const mix = (k: number) => tint.clone().lerp(white, k);

  // For the neon finish only: if the picked tint is too desaturated to read as
  // a glowing tube, swap in a guaranteed-visible hot pink.
  const hsl = { h: 0, s: 0, l: 0 };
  tint.getHSL(hsl);
  const neonGlow = hsl.s < NEON_MIN_SATURATION ? new THREE.Color(NEON_FALLBACK_HEX) : tint.clone();

  const recipes: Record<MatName, THREE.MeshPhysicalMaterialParameters> = {
    chrome: {
      metalness: 1.0,
      roughness: 0.015,
      clearcoat: 0.0,
      color: new THREE.Color(0xfafcff).lerp(tint, 0.45),
      emissive: tint.clone().multiplyScalar(0.12),
      envMapIntensity: 2.2,
    },
    gold: {
      metalness: 1.0,
      roughness: 0.07,
      clearcoat: 0.0,
      color: new THREE.Color(0xe9c76a).lerp(tint, 0.45),
      emissive: tint.clone().multiplyScalar(0.1).add(new THREE.Color(0x140d00)),
      envMapIntensity: 2.0,
    },
    iris: {
      metalness: 0.45,
      roughness: 0.06,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      iridescence: 1.0,
      iridescenceIOR: 1.4,
      iridescenceThicknessRange: [220, 720],
      color: 0x1d2530,
      emissive: tint.clone().multiplyScalar(0.1),
      envMapIntensity: 1.8,
    },
    crystal: {
      metalness: 0.0,
      roughness: 0.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.0,
      ior: 1.5,
      color: mix(0.62),
      emissive: tint.clone().multiplyScalar(0.06),
      envMapIntensity: 1.7,
      flatShading: true,
    },
    candy: {
      metalness: 0.0,
      roughness: 0.16,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      sheen: 0.5,
      sheenRoughness: 0.3,
      sheenColor: mix(0.4),
      color: mix(0.12),
      emissive: tint.clone().multiplyScalar(0.18),
      envMapIntensity: 1.2,
    },
    neon: {
      metalness: 0.0,
      roughness: 0.35,
      clearcoat: 0.0,
      color: 0x000000,
      emissive: neonGlow,
      // Per-tint normalisation so every hue blooms at a similar intensity —
      // see `computeNeonIntensity` for the why.
      emissiveIntensity: computeNeonIntensity(neonGlow, NEON_HERO_TARGET_LUMA),
      envMapIntensity: 0.12,
    },
    matte: {
      metalness: 0.0,
      roughness: 0.92,
      clearcoat: 0.0,
      color: mix(0.34),
      emissive: tint.clone().multiplyScalar(0.07),
      envMapIntensity: 0.7,
    },
  };

  // Defaults applied to every recipe, overridden where the recipe sets them.
  return new THREE.MeshPhysicalMaterial({
    envMapIntensity: 1.4,
    emissiveIntensity: 1.0,
    ...recipes[name],
  });
}

/**
 * Dim flat-emissive debris material used ONLY in the neon finish.
 *
 * In neon mode the wordmark renders at HDR-bright emissive so the bloom pass
 * extracts and halos it. If the debris also rendered at that brightness, hundreds
 * of pieces would all bloom and the frame would become a glowing haze. This
 * recipe matches the neon wordmark's visual recipe (black base, flat surface,
 * coloured emissive) but at an intensity that stays under the bloom threshold —
 * so the debris reads as neon-tube shapes without contributing to the bloom.
 */
export function makeNeonDebrisMaterial(tintHex: string): THREE.MeshPhysicalMaterial {
  const tint = new THREE.Color(tintHex);
  const hsl = { h: 0, s: 0, l: 0 };
  tint.getHSL(hsl);
  const dimGlow = hsl.s < NEON_MIN_SATURATION ? new THREE.Color(NEON_FALLBACK_HEX) : tint.clone();

  return new THREE.MeshPhysicalMaterial({
    metalness: 0.0,
    roughness: 0.35,
    clearcoat: 0.0,
    color: 0x000000,
    emissive: dimGlow,
    // Same luminance normalisation as the hero, but to a target that sits
    // below the bloom threshold — debris reads as a neon tube without
    // contributing to the bloom halo.
    emissiveIntensity: computeNeonIntensity(dimGlow, NEON_DEBRIS_TARGET_LUMA),
    envMapIntensity: 0.0, // no env reflections — flat surface, matches the hero look
  });
}
