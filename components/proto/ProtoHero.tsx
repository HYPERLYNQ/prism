// @ts-nocheck — recovered from the Next dev build cache (original source was
// deleted before being committed). The compiled JS lost its TS annotations,
// so type-checking is disabled; the logic is the working prototype verbatim.
// Regenerate with: node scripts/recover-proto.mjs
"use client";

import { useEffect, useRef, useState } from "react";
// Recovered code was emitted against the dev JSX runtime (`jsxDEV`), which
// production builds don't expose as callable — prerendering /proto threw
// "jsxDEV is not a function" and aborted the whole build. Shim it onto the
// production runtime: the extra dev args (isStaticChildren/source/self) are
// ignored, and `jsx` handles array children fine, so render is identical.
import { jsx as _jsx } from "react/jsx-runtime";
const _jsxDEV = (type, props, key) => _jsx(type, props, key);
import * as THREE from "three";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { MeshSurfaceSampler } from "three/addons/math/MeshSurfaceSampler.js";
import { BASE_Z, CAM_CLEAR, CAM_FOLLOW, DEBRIS_SCALE_MIN, DEBRIS_SCALE_SPAN, DEBRIS_TOTAL, FAR, FOV_DEG, LOOK_TARGET, MIN_DEBRIS_DOT, MOUSE_AMP, SHELL_IN, SHELL_OUT, computeBaseZ } from "../hero/sceneConfig";
import { buildEnvScene } from "../hero/sceneEnv";
import { makePreset } from "../hero/sceneMaterials";
import { buildPhrase } from "../hero/sceneWordmark";
import { buildDebrisGeometries } from "../hero/sceneDebris";

const SCROLL_PAGES = 1.6; // tight runway — dead scroll reads as broken
const PROJECTS = [
    [
        "synaptic",
        "memory for Claude Code"
    ],
    [
        "wholesale-harmony",
        "B2B SaaS on Shopify"
    ],
    [
        "sonar",
        "lead-gen pipeline"
    ],
    [
        "fever",
        "virality scoring"
    ],
    [
        "hotship",
        "desktop shipping"
    ],
    [
        "juice",
        "sports models"
    ]
];
function ProtoHero() {
    const canvasRef = useRef(null);
    const fpsRef = useRef(null);
    const workRef = useRef(null);
    const hintRef = useRef(null);
    const bootRef = useRef(null);
    const [toggles, setToggles] = useState({
        points: false,
        ascii: false,
        slomo: false,
        gravity: false
    });
    const togglesRef = useRef(toggles);
    togglesRef.current = toggles;
    useEffect({
        "ProtoHero.useEffect": ()=>{
            const canvas = canvasRef.current;
            if (!canvas) return;
            let disposed = false;
            const dpr = Math.min(2, window.devicePixelRatio || 1);
            const renderer = new THREE.WebGLRenderer({
                canvas,
                antialias: true,
                alpha: true
            });
            renderer.setClearColor(0x000000, 0);
            renderer.setPixelRatio(dpr);
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            const scene = new THREE.Scene();
            let baseZ = computeBaseZ(window.innerWidth);
            const camera = new THREE.PerspectiveCamera(FOV_DEG, window.innerWidth / window.innerHeight, 0.1, FAR);
            camera.position.set(0, 0, baseZ);
            camera.layers.enable(1);
            const lookTarget = new THREE.Vector3(...LOOK_TARGET);
            const pmrem = new THREE.PMREMGenerator(renderer);
            // Proto-only env extension: the shared studio env has its features at the
            // sides, leaving a soft gap straight ahead (+z) — which is exactly where
            // CAMERA-FACING surfaces reflect. The hybrid mode's mirror lids looked
            // flat grey face-on because of it. Three HDR bars dead ahead give flat
            // faces bright/dark streaks at rest, and the breathing slides them.
            const envScene = buildEnvScene();
            const mirrorBar = {
                "ProtoHero.useEffect.mirrorBar": (y, w, h, intensity)=>{
                    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({
                        color: new THREE.Color(intensity, intensity, intensity * 1.04),
                        side: THREE.DoubleSide
                    }));
                    mesh.position.set(0, y, 9);
                    mesh.lookAt(0, 0, 0);
                    envScene.add(mesh);
                }
            }["ProtoHero.useEffect.mirrorBar"];
            mirrorBar(4.2, 14, 1.1, 5.0);
            mirrorBar(0.6, 14, 0.5, 2.6);
            mirrorBar(-2.8, 14, 1.6, 3.8);
            const envRT = pmrem.fromScene(envScene, 0.02);
            scene.environment = envRT.texture;
            const inkHex = "#15171C";
            // ASCII as a GPU post-pass (replaces the DOM-table AsciiEffect, which was
            // flat and slow): render the scene into a target, then a full-screen quad
            // quantizes it into character cells. Luminance picks the glyph — chrome
            // highlights map to light glyphs ('.', ':'), shadow cores to dense ones
            // ('%', '@') — so the lighting survives and the text still reads as 3-D
            // volume instead of a silhouette. Transparent background stays empty.
            const ASCII_CHARS = " .:-=+*#%@";
            const ASCII_CELL = 12; // CSS px per character cell
            const atlasCanvas = document.createElement("canvas");
            {
                const cell = 64;
                atlasCanvas.width = cell * ASCII_CHARS.length;
                atlasCanvas.height = cell;
                const ctx = atlasCanvas.getContext("2d");
                ctx.clearRect(0, 0, atlasCanvas.width, cell);
                ctx.fillStyle = "#fff";
                ctx.font = `700 ${cell * 0.8}px ui-monospace, Consolas, monospace`;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                for(let i = 0; i < ASCII_CHARS.length; i++){
                    ctx.fillText(ASCII_CHARS[i], i * cell + cell / 2, cell / 2 + 2);
                }
            }
            const atlasTex = new THREE.CanvasTexture(atlasCanvas);
            atlasTex.minFilter = THREE.LinearFilter;
            atlasTex.magFilter = THREE.LinearFilter;
            const sceneRT = new THREE.WebGLRenderTarget(Math.floor(window.innerWidth * dpr), Math.floor(window.innerHeight * dpr), {
                // Depth rides along so the ASCII pass can weight glyph density by
                // nearness — keeps the 3-D reading at angles where lighting alone
                // flattens out.
                depthTexture: new THREE.DepthTexture(Math.floor(window.innerWidth * dpr), Math.floor(window.innerHeight * dpr))
            });
            const asciiUniforms = {
                tScene: {
                    value: sceneRT.texture
                },
                tDepth: {
                    value: sceneRT.depthTexture
                },
                uNear: {
                    value: 0.1
                },
                uFar: {
                    value: FAR
                },
                tAtlas: {
                    value: atlasTex
                },
                uResolution: {
                    value: new THREE.Vector2(window.innerWidth * dpr, window.innerHeight * dpr)
                },
                uCell: {
                    value: ASCII_CELL * dpr
                },
                uGlyphs: {
                    value: ASCII_CHARS.length
                },
                uInk: {
                    value: new THREE.Color(inkHex)
                },
                /** 0 = no glyph cells visible, 1 = all. Cells pop in/out in a fixed
       *  per-cell random order — the "compiling" dissolve. */ uMix: {
                    value: 0
                },
                /** Depth band [min, max) this draw owns — the quad renders once per
       *  band with a different cell size (see ASCII_BANDS). */ uBandMin: {
                    value: 0
                },
                uBandMax: {
                    value: 1e9
                }
            };
            // Multi-scale ASCII: near surfaces draw BIG glyphs, far surfaces small.
            // Character size is the strongest depth cue this medium has — a flat
            // uniform grid is exactly what makes single-pass ASCII look 2-D when the
            // camera moves.
            //
            // CRITICAL: band boundaries are computed per frame, centred on the
            // camera→wordmark distance, so the text block ALWAYS sits inside one
            // band. Static boundaries let a seam cross the letters mid-form — half a
            // glyph at 17px, half at 11px — which mushes the type. Only debris
            // drifting closer/farther than the text crosses into the big/small
            // bands. Cell sizes per band; min/max filled in each frame.
            const ASCII_BANDS = [
                {
                    cell: 6,
                    min: 0,
                    max: 0
                },
                {
                    cell: 9,
                    min: 0,
                    max: 0
                },
                {
                    cell: 15,
                    min: 0,
                    max: 0
                }
            ];
            const asciiQuadScene = new THREE.Scene();
            const asciiQuadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
            asciiQuadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
                uniforms: asciiUniforms,
                transparent: true,
                depthTest: false,
                vertexShader: /* glsl */ `
            void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
          `,
                fragmentShader: /* glsl */ `
            uniform sampler2D tScene;
            uniform sampler2D tDepth;
            uniform float uNear;
            uniform float uFar;
            uniform sampler2D tAtlas;
            uniform vec2 uResolution;
            uniform float uCell;
            uniform float uGlyphs;
            uniform vec3 uInk;
            uniform float uMix;
            uniform float uBandMin;
            uniform float uBandMax;
            void main() {
              vec2 frag = gl_FragCoord.xy;
              vec2 cellOrigin = floor(frag / uCell) * uCell;
              // Per-cell dissolve order: a left→right sweep with per-cell
              // random jitter. Animating uMix types cells in like terminal
              // output (and compiles them away in the same raster order).
              // Hash uses the cell's NORMALIZED origin so the dissolve stays
              // coherent across the different band cell sizes.
              vec2 cellN = cellOrigin / uResolution;
              float h = fract(sin(dot(cellN, vec2(12.9898, 78.233))) * 43758.5453);
              float order = 0.55 * cellN.x + 0.45 * h;
              if (order > uMix) discard;
              vec2 sampleUv = (cellOrigin + uCell * 0.5) / uResolution;
              vec4 scene = texture2D(tScene, sampleUv);
              float lum = dot(scene.rgb, vec3(0.299, 0.587, 0.114));
              // Depth-weighted density. Lighting alone flattens at glancing
              // angles, so glyph density is shading × NEARNESS: surfaces close
              // to the lens stay dense '@%' while far ones thin toward ':-'
              // regardless of how the light lands. Standard perspective
              // depth-buffer linearization.
              float d = texture2D(tDepth, sampleUv).x;
              float viewZ = (uNear * uFar) / ((uFar - uNear) * d - uFar);
              float dist = -viewZ;
              // Each draw owns one depth band (multi-scale pass).
              if (dist < uBandMin || dist >= uBandMax) discard;
              float nearness = clamp(1.0 - (dist - 400.0) / 3400.0, 0.0, 1.0);
              // Transparent bg → glyph 0 (space). Power curve keeps the
              // shading gradient: only true black hits the top of the ramp.
              float shade = pow(clamp(1.0 - lum, 0.0, 1.0), 0.8);
              // Mild nearness boost only — the heavy lifting for depth is the
              // per-band glyph SIZE now. A strong boost here saturated the
              // wordmark to solid '@' and crushed the shading gradient.
              float ink = shade * (0.65 + 0.35 * nearness) * scene.a;
              float idx = floor(clamp(ink, 0.0, 0.999) * uGlyphs);
              vec2 inCell = (frag - cellOrigin) / uCell;
              vec2 atlasUv = vec2((idx + inCell.x) / uGlyphs, inCell.y);
              float g = texture2D(tAtlas, atlasUv).a;
              if (g < 0.22) discard;
              gl_FragColor = vec4(uInk, g);
            }
          `
            })));
            const heroMaterial = makePreset("chrome", inkHex);
            heroMaterial.transparent = true;
            heroMaterial.opacity = 0; // intro fade-in owns this
            // Extrude SIDES get their own material so the hybrid ASCII mode can keep
            // the letter FACES solid (crisp, readable) while the body renders as
            // characters. ExtrudeGeometry group 0 = front/back lids, group 1 = sides.
            const heroSideMaterial = makePreset("chrome", inkHex);
            heroSideMaterial.transparent = true;
            heroSideMaterial.opacity = 0;
            // The hybrid pass swaps the lids to MIRROR chrome — a light silver tint
            // pushes the preset's base color near-white, so with metalness 1 /
            // roughness 0.015 the faces become true mirrors: the env's light sweeps
            // roll across them as the wordmark breathes. Reads as polished metal
            // against the ASCII texture instead of flat ink.
            const faceHybridMaterial = makePreset("chrome", "#c9cdd6");
            faceHybridMaterial.transparent = true;
            faceHybridMaterial.opacity = 0;
            const debrisMaterial = makePreset("chrome", inkHex);
            debrisMaterial.transparent = true; // boot dissolve fades the solid pass under the ASCII layer
            // Round soft-edged dot sprite — raw gl_Points are hard squares, which is
            // a big part of why point clouds read as noise instead of form.
            const dotCanvas = document.createElement("canvas");
            dotCanvas.width = dotCanvas.height = 64;
            {
                const ctx = dotCanvas.getContext("2d");
                const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
                grad.addColorStop(0, "rgba(255,255,255,1)");
                grad.addColorStop(0.55, "rgba(255,255,255,0.9)");
                grad.addColorStop(1, "rgba(255,255,255,0)");
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, 64, 64);
            }
            const dotTex = new THREE.CanvasTexture(dotCanvas);
            const pointsMaterial = new THREE.PointsMaterial({
                color: inkHex,
                size: 3.4,
                map: dotTex,
                sizeAttenuation: true,
                transparent: true,
                opacity: 0,
                depthWrite: false
            });
            /* ── wordmark ──────────────────────────────────────────────────── */ const wordRoot = new THREE.Group();
            scene.add(wordRoot);
            let letters = [];
            let pointsTwins = [];
            // JetBrains Mono ExtraBold — the site's own code face, extruded. A MONO
            // 3-D wordmark is the typographic break from the bold-grotesque look
            // every three.js text demo (and ilithya's hero) shares — and it rhymes
            // with the ASCII/terminal identity. Converted via
            // scripts/convert-typeface.mjs; Space Grotesk Bold also sits in
            // public/fonts if the mono reads too techy.
            new FontLoader().load("/fonts/jetbrains-mono_extrabold.typeface.json", {
                "ProtoHero.useEffect": (font)=>{
                    if (disposed) return;
                    letters = buildPhrase("ai, on\nthe clock", font, heroMaterial);
                    for (const m of letters){
                        m.userData.partSeed = Math.random(); // staggers the mid-flight parting
                        m.material = [
                            heroMaterial,
                            heroSideMaterial
                        ]; // lids / sides split
                        wordRoot.add(m);
                        // Points twin — surface-sampled, NOT the raw geometry vertices.
                        // TextGeometry's vertices cluster along the bevel contours, which
                        // renders as concentric scribbles; uniform surface sampling gives an
                        // even dot-cloud that actually reads as the letterform.
                        const sampler = new MeshSurfaceSampler(m).build();
                        const N = 1400;
                        const positions = new Float32Array(N * 3);
                        const v = new THREE.Vector3();
                        for(let i = 0; i < N; i++){
                            sampler.sample(v);
                            positions[i * 3] = v.x;
                            positions[i * 3 + 1] = v.y;
                            positions[i * 3 + 2] = v.z;
                        }
                        const cloud = new THREE.BufferGeometry();
                        cloud.setAttribute("position", new THREE.BufferAttribute(positions, 3));
                        const p = new THREE.Points(cloud, pointsMaterial);
                        p.position.copy(m.userData.home);
                        p.layers.set(1);
                        p.visible = false;
                        wordRoot.add(p);
                        pointsTwins.push(p);
                    }
                }
            }["ProtoHero.useEffect"]);
            const debrisGeos = buildDebrisGeometries();
            // One surface-sampled point cloud per debris SHAPE (not per piece) —
            // every piece of a shape shares the cloud geometry, and the Points twin
            // rides as a child of the mesh so it inherits the transform for free.
            const debrisClouds = debrisGeos.map({
                "ProtoHero.useEffect.debrisClouds": (g)=>{
                    const probe = new THREE.Mesh(g);
                    const sampler = new MeshSurfaceSampler(probe).build();
                    const N = 350;
                    const positions = new Float32Array(N * 3);
                    const v = new THREE.Vector3();
                    for(let i = 0; i < N; i++){
                        sampler.sample(v);
                        positions[i * 3] = v.x;
                        positions[i * 3 + 1] = v.y;
                        positions[i * 3 + 2] = v.z;
                    }
                    const cloud = new THREE.BufferGeometry();
                    cloud.setAttribute("position", new THREE.BufferAttribute(positions, 3));
                    return cloud;
                }
            }["ProtoHero.useEffect.debrisClouds"]);
            const pieces = [];
            const addPiece = {
                "ProtoHero.useEffect.addPiece": (x, y, z, s)=>{
                    const geo = debrisGeos[pieces.length % debrisGeos.length];
                    const mesh = new THREE.Mesh(geo, debrisMaterial);
                    mesh.add(new THREE.Points(debrisClouds[pieces.length % debrisGeos.length], pointsMaterial));
                    mesh.position.set(x, y, z);
                    mesh.rotation.set(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28);
                    mesh.scale.setScalar(s);
                    scene.add(mesh);
                    pieces.push({
                        mesh,
                        vel: new THREE.Vector3(),
                        angVel: new THREE.Vector3((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5),
                        home: mesh.position.clone()
                    });
                }
            }["ProtoHero.useEffect.addPiece"];
            // Spherical-shell placement — the same algorithm and constants as the
            // production scene (`sceneDebris.pickPositionOnShell`): uniform direction
            // on the unit sphere, uniform-in-volume radius across [SHELL_IN,
            // SHELL_OUT], rejected when angularly too close to a placed piece or
            // inside the camera-clear bubble. Reproduces the original spread exactly,
            // including the big foreground pieces; the shell also doubles as the
            // flight corridor since pieces straddle the camera path at every depth.
            const cameraRest = new THREE.Vector3(0, 0, baseZ);
            const placedDirs = [];
            const dir = new THREE.Vector3();
            const pos = new THREE.Vector3();
            const PIECE_COUNT = DEBRIS_TOTAL; // same population as the live hero
            for(let n = 0; n < PIECE_COUNT; n++){
                let ok = false;
                for(let attempt = 0; attempt < 80 && !ok; attempt++){
                    let lenSq = 2;
                    do {
                        dir.set(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
                        lenSq = dir.lengthSq();
                    }while (lenSq > 1 || lenSq < 1e-4)
                    dir.multiplyScalar(1 / Math.sqrt(lenSq));
                    if (placedDirs.some({
                        "ProtoHero.useEffect": (d)=>dir.dot(d) > MIN_DEBRIS_DOT
                    }["ProtoHero.useEffect"])) continue;
                    const radius = Math.cbrt(SHELL_IN ** 3 + Math.random() * (SHELL_OUT ** 3 - SHELL_IN ** 3));
                    pos.copy(dir).multiplyScalar(radius);
                    if (pos.distanceTo(cameraRest) < CAM_CLEAR) continue;
                    ok = true;
                }
                if (!ok) continue;
                placedDirs.push(dir.clone());
                addPiece(pos.x, pos.y, pos.z, DEBRIS_SCALE_MIN + Math.random() * DEBRIS_SCALE_SPAN);
            }
            /* ── pointer: parallax + grab/throw ────────────────────────────── */ const raycaster = new THREE.Raycaster();
            const ndc = new THREE.Vector2();
            let mouseX = 0;
            let mouseY = 0;
            let grabbed = null;
            const grabPlane = new THREE.Plane();
            const grabPoint = new THREE.Vector3();
            const lastDrag = {
                p: new THREE.Vector3(),
                t: 0
            };
            const dragVel = new THREE.Vector3();
            let hoverCheckAt = 0;
            const setNdc = {
                "ProtoHero.useEffect.setNdc": (e)=>ndc.set(e.clientX / window.innerWidth * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1)
            }["ProtoHero.useEffect.setNdc"];
            function onPointerDown(e) {
                setNdc(e);
                raycaster.setFromCamera(ndc, camera);
                const hits = raycaster.intersectObjects(pieces.map({
                    "ProtoHero.useEffect.onPointerDown.hits": (p)=>p.mesh
                }["ProtoHero.useEffect.onPointerDown.hits"]), false);
                if (!hits.length) return;
                const mesh = hits[0].object;
                grabbed = pieces.find({
                    "ProtoHero.useEffect.onPointerDown": (p)=>p.mesh === mesh
                }["ProtoHero.useEffect.onPointerDown"]) ?? null;
                if (!grabbed) return;
                grabPlane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()).negate(), grabbed.mesh.position);
                grabbed.vel.set(0, 0, 0);
                lastDrag.p.copy(grabbed.mesh.position);
                lastDrag.t = performance.now();
                canvas.style.cursor = "grabbing";
            }
            function onPointerMove(e) {
                // Production cursor mapping — MOUSE_AMP scaled by camera distance.
                const amp = MOUSE_AMP * (baseZ / BASE_Z);
                mouseX = amp * (e.clientX - 0.5 * window.innerWidth);
                mouseY = amp * (e.clientY - 0.5 * window.innerHeight);
                if (grabbed) {
                    setNdc(e);
                    raycaster.setFromCamera(ndc, camera);
                    if (raycaster.ray.intersectPlane(grabPlane, grabPoint)) {
                        const now = performance.now();
                        const dtMs = Math.max(1, now - lastDrag.t);
                        dragVel.copy(grabPoint).sub(lastDrag.p).multiplyScalar(1000 / dtMs);
                        lastDrag.p.copy(grabPoint);
                        lastDrag.t = now;
                        grabbed.mesh.position.copy(grabPoint);
                    }
                    return;
                }
                // Hover affordance — throttled raycast, cursor flips to grab over a piece.
                const now = performance.now();
                if (now - hoverCheckAt > 80) {
                    hoverCheckAt = now;
                    setNdc(e);
                    raycaster.setFromCamera(ndc, camera);
                    const hit = raycaster.intersectObjects(pieces.map({
                        "ProtoHero.useEffect.onPointerMove": (p)=>p.mesh
                    }["ProtoHero.useEffect.onPointerMove"]), false).length > 0;
                    canvas.style.cursor = hit ? "grab" : "";
                }
            }
            function onPointerUp() {
                if (grabbed) {
                    grabbed.vel.copy(dragVel.clampLength(0, 3800));
                    grabbed = null;
                    canvas.style.cursor = "";
                }
            }
            window.addEventListener("pointerdown", onPointerDown);
            window.addEventListener("pointermove", onPointerMove);
            window.addEventListener("pointerup", onPointerUp);
            /* ── scroll ────────────────────────────────────────────────────── */ let scrollTarget = 0;
            function onScroll() {
                const max = window.innerHeight * SCROLL_PAGES;
                scrollTarget = Math.min(1, Math.max(0, window.scrollY / max));
            }
            window.addEventListener("scroll", onScroll, {
                passive: true
            });
            onScroll();
            function onResize() {
                baseZ = computeBaseZ(window.innerWidth);
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
                sceneRT.setSize(Math.floor(window.innerWidth * dpr), Math.floor(window.innerHeight * dpr));
                asciiUniforms.uResolution.value.set(window.innerWidth * dpr, window.innerHeight * dpr);
            }
            window.addEventListener("resize", onResize);
            /* ── frame loop ────────────────────────────────────────────────── */ const clock = new THREE.Clock();
            let raf = 0;
            let fpsAcc = 0;
            let fpsN = 0;
            let fpsLast = performance.now();
            let p = 0; // smoothed scroll progress
            let timescale = 1; // smoothed slo-mo factor
            let pointsMix = 0; // 0 = solid letters, 1 = point cloud
            let intro = 0; // 0→1 over the first second
            let fovNow = FOV_DEG;
            let landed = false;
            let sceneT = 0; // scene-time accumulator — slo-mo slows EVERYTHING driven by it
            let bootT = 0; // boot clock — starts on the very first frame
            let asciiMix = 0; // glyph-cell visibility, 0..1 (drives the shader's uMix)
            let solidMix = 0; // solid-render opacity — held at 0 through the whole boot
            const FLOOR_Y = -660;
            const easeInOut = {
                "ProtoHero.useEffect.easeInOut": (t)=>t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2
            }["ProtoHero.useEffect.easeInOut"];
            function frame() {
                if (disposed) return;
                raf = requestAnimationFrame(frame);
                const tg = togglesRef.current;
                const rawDt = Math.min(0.05, clock.getDelta());
                // Smoothed control signals — exponential follow, frame-rate independent.
                timescale += ((tg.slomo ? 0.12 : 1) - timescale) * (1 - Math.exp(-5 * rawDt));
                const dt = rawDt * timescale;
                sceneT += dt;
                // Scroll follow runs on scene-time too: slo-mo turns the fly-through
                // into a slow-motion dolly — the most legible thing it does.
                p += (scrollTarget - p) * (1 - Math.exp(-7 * dt));
                pointsMix += ((tg.points ? 1 : 0) - pointsMix) * (1 - Math.exp(-8 * rawDt));
                intro = Math.min(1, intro + rawDt * 1.1);
                const introE = 1 - (1 - intro) ** 3; // cubic ease-out
                // Camera: dolly through the wordmark, cursor parallax at production
                // strength (MOUSE_AMP / CAM_FOLLOW). Parallax fades out during flight
                // so the two motions never fight.
                const fly = easeInOut(p);
                const flyZ = baseZ - fly * (baseZ + 1500);
                const parallax = (1 - fly) * introE;
                camera.position.x += CAM_FOLLOW * (-mouseX * parallax - camera.position.x);
                camera.position.y += CAM_FOLLOW * (mouseY * parallax - camera.position.y);
                camera.position.z = flyZ;
                const lookAhead = new THREE.Vector3(lookTarget.x * (1 - fly), 0, flyZ < 200 ? flyZ - 1000 : 0);
                camera.lookAt(lookAhead);
                // FOV kick at peak velocity — the dolly rush. Peak speed is mid-journey.
                const rush = Math.sin(Math.min(1, fly) * Math.PI);
                const fovTarget = FOV_DEG + rush * 10;
                if (Math.abs(fovTarget - fovNow) > 0.05) {
                    fovNow += (fovTarget - fovNow) * 0.12;
                    camera.fov = fovNow;
                    camera.updateProjectionMatrix();
                }
                // Wordmark breathing + intro rise. Driven by scene-time, so slo-mo
                // visibly stretches the tumble even when nothing else is moving.
                const rx = Math.sin(sceneT * 0.22) * 0.05;
                const ry = Math.sin(sceneT * 0.16) * 0.07;
                wordRoot.rotation.set(rx, ry, rx);
                // ASCII boot + toggle. The page is ASCII from its very first frame —
                // the solid render is held at zero through the whole boot, so there is
                // never a flash of chrome before the text mode. Timeline:
                //   0.0–1.0s  cells TYPE IN, left→right sweep (starts from an empty
                //             page, like terminal output streaming)
                //   1.0–2.4s  hold — the hero lives as ASCII
                //   2.4s →    cells compile away in the same sweep order while the
                //             chrome render fades up underneath
                // The console's ascii chip drives the same dissolve afterwards.
                bootT += rawDt;
                const BOOT_TYPE = 1.0;
                const BOOT_HOLD = 2.4;
                const booting = bootT < BOOT_HOLD;
                if (bootT < BOOT_TYPE) {
                    const k = bootT / BOOT_TYPE;
                    asciiMix = 1 - (1 - k) ** 2; // ease-out type-in
                } else if (booting) {
                    asciiMix = 1;
                } else {
                    asciiMix += ((tg.ascii ? 1 : 0) - asciiMix) * (1 - Math.exp(-6 * rawDt));
                }
                const solidTarget = booting ? 0 : tg.ascii ? 0 : 1;
                solidMix += (solidTarget - solidMix) * (1 - Math.exp(-6 * rawDt));
                // Boot readout — a mono loader line under the wordmark that counts the
                // boot up and labels each phase, then fades once the compile finishes.
                if (bootRef.current) {
                    if (bootT < BOOT_HOLD + 0.8) {
                        const pct = Math.min(1, bootT / BOOT_HOLD);
                        const blocks = Math.round(pct * 14);
                        const phase = bootT < BOOT_TYPE ? "rasterizing" : booting ? "shading" : "compiled";
                        bootRef.current.textContent = `boot ▸ ${phase} ${"▓".repeat(blocks)}${"░".repeat(14 - blocks)} ${String(Math.round(pct * 100)).padStart(3, " ")}%`;
                        bootRef.current.style.opacity = booting ? "1" : "0";
                    } else {
                        bootRef.current.style.opacity = "0";
                    }
                }
                heroMaterial.opacity = introE * (1 - pointsMix) * solidMix;
                heroSideMaterial.opacity = heroMaterial.opacity;
                pointsMaterial.opacity = pointsMix * solidMix;
                // Letters part around the lens — sharper curve, per-letter stagger so
                // the formation breaks organically instead of as one rigid ring.
                const near = THREE.MathUtils.clamp(1 - Math.abs(flyZ - 60) / 760, 0, 1);
                for(let i = 0; i < letters.length; i++){
                    const m = letters[i];
                    const home = m.userData.home;
                    const seed = m.userData.partSeed;
                    const local = THREE.MathUtils.clamp(near * 1.5 - seed * 0.5, 0, 1);
                    const part = local * local * local * 640;
                    const len = Math.max(60, Math.hypot(home.x, home.y));
                    const introY = (1 - introE) * -46;
                    const px = home.x + home.x / len * part;
                    const py = home.y + introY + home.y / len * part;
                    m.position.x += (px - m.position.x) * 0.16;
                    m.position.y += (py - m.position.y) * 0.16;
                    m.rotation.z += ((home.x > 0 ? 1 : -1) * local * 0.3 - m.rotation.z) * 0.1;
                    m.visible = pointsMix < 0.98;
                    const twin = pointsTwins[i];
                    if (twin) {
                        twin.position.copy(m.position);
                        twin.rotation.copy(m.rotation);
                        twin.visible = pointsMix > 0.02;
                    }
                }
                // Debris follows the same solid↔points crossfade as the wordmark.
                debrisMaterial.opacity = solidMix * (1 - pointsMix);
                // Debris physics.
                for (const piece of pieces){
                    if (piece === grabbed) continue;
                    if (tg.gravity) {
                        piece.vel.y -= 2400 * dt;
                    } else {
                        const toHome = piece.home.clone().sub(piece.mesh.position).multiplyScalar(0.9);
                        piece.vel.addScaledVector(toHome, dt);
                    }
                    piece.vel.multiplyScalar(1 - 1.1 * dt);
                    piece.mesh.position.addScaledVector(piece.vel, dt);
                    // Per-piece floor: shell pieces can START below the global floor
                    // (radius reaches well beneath it) — clamping those would teleport
                    // them up on toggle. Each piece bounces at the higher of the global
                    // floor or just under its own home.
                    const floorY = Math.min(FLOOR_Y, piece.home.y - 40);
                    if (tg.gravity && piece.vel.y < 0 && piece.mesh.position.y < floorY) {
                        piece.mesh.position.y = floorY;
                        piece.vel.y = -piece.vel.y * 0.5;
                        piece.vel.x *= 0.85;
                        piece.vel.z *= 0.85;
                        piece.angVel.multiplyScalar(0.9);
                    }
                    piece.mesh.rotation.x += piece.angVel.x * dt;
                    piece.mesh.rotation.y += piece.angVel.y * dt;
                    piece.mesh.rotation.z += piece.angVel.z * dt;
                }
                // Crossfade into the landing — the live view hands off to the work index.
                canvas.style.opacity = String(1 - THREE.MathUtils.clamp((p - 0.72) / 0.2, 0, 1));
                if (workRef.current) {
                    const on = p > 0.74;
                    if (on !== landed) {
                        landed = on;
                        workRef.current.classList.toggle("is-in", on);
                    }
                }
                if (hintRef.current) {
                    hintRef.current.style.opacity = scrollTarget > 0.02 ? "0" : String(introE);
                }
                // Composite: solid pass (faded by the dissolve) + ASCII overlay on top.
                // Both passes are skipped when fully on the other side, so steady state
                // costs a single render either way.
                if (asciiMix > 0.004) {
                    // The ASCII sampler needs the scene at FULL opacity regardless of the
                    // dissolve state — materials are restored right after.
                    heroMaterial.opacity = introE * (1 - pointsMix);
                    heroSideMaterial.opacity = heroMaterial.opacity;
                    pointsMaterial.opacity = pointsMix;
                    debrisMaterial.opacity = 1 - pointsMix;
                    renderer.setRenderTarget(sceneRT);
                    renderer.clear();
                    renderer.render(scene, camera);
                    renderer.setRenderTarget(null);
                    heroMaterial.opacity = introE * (1 - pointsMix) * solidMix;
                    heroSideMaterial.opacity = heroMaterial.opacity;
                    pointsMaterial.opacity = pointsMix * solidMix;
                    debrisMaterial.opacity = solidMix * (1 - pointsMix);
                }
                if (solidMix > 0.004) {
                    renderer.render(scene, camera);
                } else {
                    renderer.clear();
                }
                if (asciiMix > 0.004) {
                    asciiUniforms.uMix.value = asciiMix;
                    // Re-centre the mid band on the wordmark every frame (see ASCII_BANDS).
                    const wordDist = camera.position.length();
                    const nearEdge = Math.max(250, wordDist - 450);
                    const farEdge = wordDist + 550;
                    ASCII_BANDS[0].min = farEdge;
                    ASCII_BANDS[0].max = 1e9;
                    ASCII_BANDS[1].min = nearEdge;
                    ASCII_BANDS[1].max = farEdge;
                    ASCII_BANDS[2].min = 0;
                    ASCII_BANDS[2].max = nearEdge;
                    renderer.autoClear = false;
                    // One draw per depth band, far → near, each with its own glyph size.
                    for (const band of ASCII_BANDS){
                        asciiUniforms.uCell.value = band.cell * dpr;
                        asciiUniforms.uBandMin.value = band.min;
                        asciiUniforms.uBandMax.value = band.max;
                        renderer.render(asciiQuadScene, asciiQuadCam);
                    }
                    // Hybrid readability pass: the letter FACES render solid on top of
                    // the ASCII body. Pure ASCII through the boot type-in, then the faces
                    // resolve during the hold (rasterize → focus → compile). The manual
                    // ascii toggle keeps faces on — character texture with legible type.
                    const faceMix = asciiMix * introE * (1 - pointsMix) * THREE.MathUtils.clamp((bootT - BOOT_TYPE) / 0.5, 0, 1);
                    if (faceMix > 0.004) {
                        faceHybridMaterial.opacity = faceMix;
                        for (const m of letters)m.material = [
                            faceHybridMaterial,
                            heroSideMaterial
                        ];
                        heroSideMaterial.visible = false;
                        debrisMaterial.visible = false;
                        pointsMaterial.visible = false;
                        renderer.clearDepth();
                        renderer.render(scene, camera);
                        for (const m of letters)m.material = [
                            heroMaterial,
                            heroSideMaterial
                        ];
                        heroSideMaterial.visible = true;
                        debrisMaterial.visible = true;
                        pointsMaterial.visible = true;
                    }
                    renderer.autoClear = true;
                }
                fpsAcc += 1 / rawDt;
                fpsN += 1;
                const now = performance.now();
                if (now - fpsLast > 500 && fpsRef.current) {
                    fpsRef.current.textContent = String(Math.round(fpsAcc / fpsN));
                    fpsAcc = 0;
                    fpsN = 0;
                    fpsLast = now;
                }
            }
            frame();
            return ({
                "ProtoHero.useEffect": ()=>{
                    disposed = true;
                    cancelAnimationFrame(raf);
                    window.removeEventListener("pointerdown", onPointerDown);
                    window.removeEventListener("pointermove", onPointerMove);
                    window.removeEventListener("pointerup", onPointerUp);
                    window.removeEventListener("scroll", onScroll);
                    window.removeEventListener("resize", onResize);
                    sceneRT.dispose();
                    atlasTex.dispose();
                    dotTex.dispose();
                    for (const m of letters)m.geometry.dispose();
                    for (const p of pointsTwins)p.geometry.dispose();
                    for (const c of debrisClouds)c.dispose();
                    for (const g of debrisGeos)g.dispose();
                    heroMaterial.dispose();
                    heroSideMaterial.dispose();
                    faceHybridMaterial.dispose();
                    debrisMaterial.dispose();
                    pointsMaterial.dispose();
                    envRT.dispose();
                    pmrem.dispose();
                    renderer.dispose();
                }
            })["ProtoHero.useEffect"];
        }
    }["ProtoHero.useEffect"], []);
    const flip = (k)=>setToggles((s)=>{
            const next = {
                ...s,
                [k]: !s[k]
            };
            // points and ascii are both "re-render the scene as something else" —
            // stacking them produces mush, so they're mutually exclusive.
            if (k === "points" && next.points) next.ascii = false;
            if (k === "ascii" && next.ascii) next.points = false;
            // slo-mo only reads when something is moving — it rides gravity.
            if (k === "gravity" && !next.gravity) next.slomo = false;
            return next;
        });
    return /*#__PURE__*/ _jsxDEV("div", {
        className: "proto-root",
        children: [
            /*#__PURE__*/ _jsxDEV("canvas", {
                ref: canvasRef,
                className: "proto-canvas"
            }, void 0, false, {
                fileName: "[project]/components/proto/ProtoHero.tsx",
                lineNumber: 830,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ _jsxDEV("div", {
                style: {
                    height: `${(SCROLL_PAGES + 1) * 100}vh`
                }
            }, void 0, false, {
                fileName: "[project]/components/proto/ProtoHero.tsx",
                lineNumber: 832,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ _jsxDEV("div", {
                ref: hintRef,
                className: "proto-hint",
                "aria-hidden": "true",
                children: [
                    "SCROLL TO FLY THROUGH ",
                    /*#__PURE__*/ _jsxDEV("span", {
                        className: "proto-hint-arr",
                        children: "↓"
                    }, void 0, false, {
                        fileName: "[project]/components/proto/ProtoHero.tsx",
                        lineNumber: 835,
                        columnNumber: 31
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/proto/ProtoHero.tsx",
                lineNumber: 834,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ _jsxDEV("div", {
                ref: bootRef,
                className: "proto-boot",
                "aria-hidden": "true"
            }, void 0, false, {
                fileName: "[project]/components/proto/ProtoHero.tsx",
                lineNumber: 839,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ _jsxDEV("div", {
                ref: workRef,
                className: "proto-work",
                children: [
                    /*#__PURE__*/ _jsxDEV("p", {
                        className: "proto-work-eyebrow",
                        children: "YOU LANDED — 06 PROJECTS"
                    }, void 0, false, {
                        fileName: "[project]/components/proto/ProtoHero.tsx",
                        lineNumber: 844,
                        columnNumber: 9
                    }, this),
                    PROJECTS.map(([name, tag], i)=>/*#__PURE__*/ _jsxDEV("a", {
                            href: `/work/${name}`,
                            className: "proto-work-row",
                            style: {
                                transitionDelay: `${90 + i * 55}ms`
                            },
                            children: [
                                /*#__PURE__*/ _jsxDEV("span", {
                                    className: "proto-work-num",
                                    children: String(i + 1).padStart(2, "0")
                                }, void 0, false, {
                                    fileName: "[project]/components/proto/ProtoHero.tsx",
                                    lineNumber: 847,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ _jsxDEV("span", {
                                    className: "proto-work-name",
                                    children: name
                                }, void 0, false, {
                                    fileName: "[project]/components/proto/ProtoHero.tsx",
                                    lineNumber: 848,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ _jsxDEV("span", {
                                    className: "proto-work-tag",
                                    children: tag
                                }, void 0, false, {
                                    fileName: "[project]/components/proto/ProtoHero.tsx",
                                    lineNumber: 849,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ _jsxDEV("span", {
                                    className: "proto-work-arr",
                                    "aria-hidden": "true",
                                    children: "↗"
                                }, void 0, false, {
                                    fileName: "[project]/components/proto/ProtoHero.tsx",
                                    lineNumber: 850,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, name, true, {
                            fileName: "[project]/components/proto/ProtoHero.tsx",
                            lineNumber: 846,
                            columnNumber: 11
                        }, this))
                ]
            }, void 0, true, {
                fileName: "[project]/components/proto/ProtoHero.tsx",
                lineNumber: 843,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ _jsxDEV("div", {
                className: "proto-hud",
                children: [
                    /*#__PURE__*/ _jsxDEV("div", {
                        className: "proto-hud-head",
                        children: [
                            /*#__PURE__*/ _jsxDEV("b", {
                                children: "SCENE / CONSOLE"
                            }, void 0, false, {
                                fileName: "[project]/components/proto/ProtoHero.tsx",
                                lineNumber: 858,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ _jsxDEV("span", {
                                children: [
                                    "fps ",
                                    /*#__PURE__*/ _jsxDEV("em", {
                                        ref: fpsRef,
                                        children: "—"
                                    }, void 0, false, {
                                        fileName: "[project]/components/proto/ProtoHero.tsx",
                                        lineNumber: 860,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/components/proto/ProtoHero.tsx",
                                lineNumber: 859,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/components/proto/ProtoHero.tsx",
                        lineNumber: 857,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ _jsxDEV("div", {
                        className: "proto-hud-row",
                        children: [
                            "points",
                            "ascii",
                            "slomo",
                            "gravity"
                        ].map((k)=>{
                            const gated = k === "slomo" && !toggles.gravity;
                            return /*#__PURE__*/ _jsxDEV("button", {
                                type: "button",
                                className: `proto-chip${toggles[k] ? " on" : ""}`,
                                disabled: gated,
                                title: gated ? "slo-mo needs gravity — nothing to slow otherwise" : undefined,
                                onClick: ()=>flip(k),
                                children: k === "slomo" ? "slo-mo" : k
                            }, k, false, {
                                fileName: "[project]/components/proto/ProtoHero.tsx",
                                lineNumber: 867,
                                columnNumber: 15
                            }, this);
                        })
                    }, void 0, false, {
                        fileName: "[project]/components/proto/ProtoHero.tsx",
                        lineNumber: 863,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ _jsxDEV("p", {
                        className: "proto-hud-hint",
                        children: "scroll = fly through · drag a piece = throw it"
                    }, void 0, false, {
                        fileName: "[project]/components/proto/ProtoHero.tsx",
                        lineNumber: 880,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/components/proto/ProtoHero.tsx",
                lineNumber: 856,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ _jsxDEV("style", {
                children: `
        .proto-root { background: #FAFAF7; }
        .proto-canvas {
          position: fixed; inset: 0; width: 100vw; height: 100vh; display: block;
          transition: opacity 80ms linear;
        }
        .proto-hint {
          position: fixed; left: 50%; bottom: 36px; transform: translateX(-50%);
          z-index: 8; font: 500 9.5px/1 ui-monospace, Consolas, monospace;
          letter-spacing: 0.3em; color: rgba(10,14,20,0.45);
          transition: opacity 480ms ease;
          pointer-events: none;
          display: flex; align-items: center; gap: 10px;
        }
        .proto-hint-arr { animation: proto-bob 1.8s ease-in-out infinite; font-size: 12px; }
        .proto-boot {
          position: fixed; left: 50%; bottom: 22vh; transform: translateX(-50%);
          z-index: 8; font: 500 11px/1 ui-monospace, Consolas, monospace;
          letter-spacing: 0.14em; color: rgba(10,14,20,0.55);
          white-space: pre; pointer-events: none; opacity: 0;
          transition: opacity 600ms ease;
          font-variant-numeric: tabular-nums;
        }
        @keyframes proto-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(5px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .proto-hint-arr { animation: none; }
        }
        .proto-hud {
          position: fixed; right: 24px; bottom: 24px; z-index: 10;
          width: 252px; background: rgba(10,14,20,0.92);
          border: 1px solid rgba(244,242,236,0.12); border-radius: 10px;
          -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
          color: #F4F2EC; font-family: ui-monospace, Consolas, monospace;
        }
        .proto-hud-head {
          display: flex; justify-content: space-between; align-items: baseline;
          padding: 10px 14px; border-bottom: 1px solid rgba(244,242,236,0.16);
          font-size: 9px; letter-spacing: 0.26em;
        }
        .proto-hud-head b { font-weight: 700; }
        .proto-hud-head span { color: rgba(244,242,236,0.5); letter-spacing: 0.1em; }
        .proto-hud-head em { font-style: normal; color: #aebf45; }
        .proto-hud-row { display: flex; gap: 6px; flex-wrap: wrap; padding: 12px 14px 6px; }
        .proto-chip {
          border: 1px solid rgba(244,242,236,0.16); border-radius: 4px;
          background: transparent; color: rgba(244,242,236,0.66);
          font: 500 8.5px/1 ui-monospace, Consolas, monospace;
          letter-spacing: 0.14em; text-transform: uppercase;
          padding: 6px 9px; cursor: pointer; text-align: center;
          transition: color 140ms ease-out, border-color 140ms ease-out,
                      background 140ms ease-out, transform 140ms ease-out;
        }
        .proto-chip:hover:not(:disabled) { border-color: rgba(244,242,236,0.4); color: #F4F2EC; }
        .proto-chip:active:not(:disabled) { transform: scale(0.95); }
        .proto-chip:disabled { opacity: 0.32; cursor: not-allowed; }
        .proto-chip.on { border-color: #aebf45; color: #aebf45; background: rgba(174,191,69,0.12); }
        .proto-hud-hint {
          margin: 0; padding: 6px 14px 12px;
          font-size: 8.5px; letter-spacing: 0.06em; color: rgba(244,242,236,0.4);
        }
        .proto-work {
          position: fixed; inset: 0; z-index: 5;
          display: flex; flex-direction: column; justify-content: center;
          padding: 0 14vw; pointer-events: none;
          font-family: ui-monospace, Consolas, monospace;
        }
        .proto-work.is-in { pointer-events: auto; }
        .proto-work-eyebrow {
          font-size: 10px; letter-spacing: 0.3em; color: rgba(10,14,20,0.5);
          margin: 0 0 22px;
          opacity: 0; transform: translateY(18px);
          transition: opacity 480ms cubic-bezier(0.23, 1, 0.32, 1),
                      transform 480ms cubic-bezier(0.23, 1, 0.32, 1);
        }
        .proto-work.is-in .proto-work-eyebrow { opacity: 1; transform: translateY(0); }
        .proto-work-row {
          display: flex; gap: 24px; align-items: baseline;
          border-bottom: 1px solid rgba(10,14,20,0.12); padding: 14px 6px;
          text-decoration: none;
          opacity: 0; transform: translateY(22px);
          transition: opacity 560ms cubic-bezier(0.23, 1, 0.32, 1),
                      transform 560ms cubic-bezier(0.23, 1, 0.32, 1),
                      background 160ms ease-out, padding 160ms ease-out;
        }
        .proto-work.is-in .proto-work-row { opacity: 1; transform: translateY(0); }
        @media (hover: hover) and (pointer: fine) {
          .proto-work-row:hover { background: rgba(10,14,20,0.035); padding-left: 14px; }
          .proto-work-row:hover .proto-work-arr { opacity: 1; transform: translate(0, 0); }
        }
        .proto-work-num { font-size: 11px; color: rgba(10,14,20,0.4); }
        .proto-work-name {
          font-family: var(--font-grotesk, system-ui), sans-serif;
          font-size: 32px; font-weight: 600; letter-spacing: -0.01em; color: #0A0E14;
        }
        .proto-work-tag {
          font-size: 10px; letter-spacing: 0.08em; color: rgba(10,14,20,0.45);
        }
        .proto-work-arr {
          margin-left: auto; font-size: 16px; color: #0A0E14;
          opacity: 0; transform: translate(-6px, 6px);
          transition: opacity 180ms ease-out, transform 180ms ease-out;
        }
        @media (prefers-reduced-motion: reduce) {
          .proto-work-eyebrow, .proto-work-row {
            transition-property: opacity; transform: none;
          }
        }
      `
            }, void 0, false, {
                fileName: "[project]/components/proto/ProtoHero.tsx",
                lineNumber: 883,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/components/proto/ProtoHero.tsx",
        lineNumber: 829,
        columnNumber: 5
    }, this);
}

export default ProtoHero;