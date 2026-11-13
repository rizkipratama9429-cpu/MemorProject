import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// ---------- Hero: depth-map gecko ----------
// Layer one holds a real-time specimen instead of a cut-out. The mesh is
// shaded as a monochrome depth ramp so it keeps the clean, printed look of
// the rest of the page, and it drifts gently with the pointer.

const shell = document.querySelector(".hero-gecko");
const canvas = document.querySelector("#heroGeckoCanvas");

if (shell && canvas) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  const scene = new THREE.Scene();
  const pivot = new THREE.Group();
  scene.add(pivot);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 768 ? 1.5 : 2));

  // ---------- Depth material ----------
  // The same language as a Z-pass: near surfaces pale, far surfaces ink,
  // with a camera-space key so the form still reads. No lights are used.
  const depthMaterial = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: {
      uBone: { value: new THREE.Color(0xdde8f7) },
      uMid: { value: new THREE.Color(0x9db4d1) },
      uInk: { value: new THREE.Color(0x35496a) },
      uNear: { value: 0 },
      uFar: { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying float vDepth;
      varying vec3 vNormalV;
      varying vec3 vViewDir;

      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vDepth = -mv.z;
        vNormalV = normalize(normalMatrix * normal);
        vViewDir = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uBone;
      uniform vec3 uMid;
      uniform vec3 uInk;
      uniform float uNear;
      uniform float uFar;

      varying float vDepth;
      varying vec3 vNormalV;
      varying vec3 vViewDir;

      float hash12(vec2 p) {
        vec3 p3 = fract(vec3(p.xyx) * 0.1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
      }

      void main() {
        float t = clamp((vDepth - uNear) / max(uFar - uNear, 0.0001), 0.0, 1.0);
        t = smoothstep(0.04, 0.96, t);

        vec3 ramp = mix(uBone, uMid, smoothstep(0.0, 0.3, t));
        ramp = mix(ramp, uInk, smoothstep(0.26, 0.92, t));

        vec3 n = normalize(vNormalV);
        if (!gl_FrontFacing) n = -n;
        vec3 v = normalize(vViewDir);

        float ndl = clamp(dot(n, normalize(vec3(0.2, 0.62, 0.75))), 0.0, 1.0);
        float form = 0.52 + 0.48 * pow(ndl, 0.9);
        float fres = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 3.0);

        vec3 color = ramp * form;
        // A dark grazing rim keeps the pale belly from dissolving into the
        // pastel hero plate.
        color = mix(color, uInk, fres * 0.2);
        color += (hash12(gl_FragCoord.xy) - 0.5) / 255.0;

        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }
    `,
  });

  // ---------- Model ----------
  let modelReady = false;
  let halfWidth = 2;
  let halfHeight = 1;
  let halfExtent = 1;
  let baseYaw = Math.PI / 2;
  const forward = new THREE.Vector3();

  function fitCamera() {
    const width = shell.clientWidth || 1;
    const height = shell.clientHeight || 1;
    if (!width || !height) return;

    camera.aspect = width / height;
    const vertical = THREE.MathUtils.degToRad(camera.fov);
    const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * camera.aspect);

    // Fit the box, not the bounding sphere: the specimen is long and low, so
    // a sphere fit would leave it half the width of the plate.
    const distance =
      Math.max(
        halfHeight / Math.tan(vertical / 2),
        halfWidth / Math.tan(horizontal / 2)
      ) * 1.06;

    camera.position.set(0, distance * 0.2, distance);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }

  function buildModel(gltf) {
    const model = gltf.scene;

    const sourceMaterials = new Set();
    model.traverse((child) => {
      if (!child.isMesh) return;
      [].concat(child.material || []).forEach((mat) => mat && sourceMaterials.add(mat));
    });

    model.traverse((child) => {
      if (!child.isMesh) return;
      child.material = depthMaterial;
      child.castShadow = false;
      child.receiveShadow = false;
      if (child.geometry?.attributes?.uv) child.geometry.deleteAttribute("uv");
    });

    // The GLB carries three JPEGs for its PBR material, but the depth ramp
    // replaces them; dispose the decoded images as soon as possible.
    sourceMaterials.forEach((mat) => {
      ["map", "normalMap", "roughnessMap", "metalnessMap", "aoMap", "emissiveMap"].forEach((slot) => {
        if (mat[slot]) {
          mat[slot].dispose();
          mat[slot] = null;
        }
      });
      mat.dispose();
    });

    // Normalize the longest axis, then center the mesh in the pivot.
    const initialBox = new THREE.Box3().setFromObject(model);
    const initialSize = initialBox.getSize(new THREE.Vector3());
    const maxDim = Math.max(initialSize.x, initialSize.y, initialSize.z);
    model.scale.setScalar(4.6 / (maxDim > 0.0001 ? maxDim : 1));
    model.updateMatrixWorld(true);

    const scaledBox = new THREE.Box3().setFromObject(model);
    const center = scaledBox.getCenter(new THREE.Vector3());
    model.position.sub(center);
    model.updateMatrixWorld(true);

    const finalBox = new THREE.Box3().setFromObject(model);

    pivot.add(model);
    baseYaw = Math.PI / 2;
    pivot.rotation.y = baseYaw;
    pivot.updateMatrixWorld(true);

    // After the 90° yaw the mesh length runs along screen X, so refit against
    // the rotated box. This keeps the nose and tail inside the plate.
    const viewBox = new THREE.Box3().setFromObject(model);
    const viewSize = viewBox.getSize(new THREE.Vector3());
    halfWidth = viewSize.x * 0.5;
    halfHeight = viewSize.y * 0.5;
    halfExtent = viewSize.z * 0.5;

    fitCamera();
    modelReady = true;
    needsRender = true;
    shell.classList.add("is-ready");
  }

  const loader = new GLTFLoader();

  function startLoading() {
    loader.load(
      "assets/meshy-model.glb",
      buildModel,
      undefined,
      (error) => {
        console.error("Could not load the hero specimen:", error);
        shell.classList.add("is-failed");
      }
    );
  }

  // Let the poster, fonts and first paint settle before pulling 46 MB of
  // geometry. The cut-out covers the gap, so there is no empty frame.
  if (document.readyState === "complete") {
    window.setTimeout(startLoading, 500);
  } else {
    window.addEventListener("load", () => window.setTimeout(startLoading, 500), { once: true });
  }

  // ---------- Sizing / visibility ----------
  let needsRender = true;

  function resize() {
    const width = shell.clientWidth;
    const height = shell.clientHeight;
    if (!width || !height) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 768 ? 1.5 : 2));
    renderer.setSize(width, height, false);
    fitCamera();
    needsRender = true;
  }

  resize();
  new ResizeObserver(resize).observe(shell);

  let inView = true;
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) needsRender = true;
    inView = entry.isIntersecting;
  }).observe(shell);

  // ---------- Pointer drift ----------
  let pointerX = 0;
  let pointerY = 0;
  let targetX = 0;
  let targetY = 0;

  window.addEventListener(
    "pointermove",
    (event) => {
      targetX = (event.clientX / window.innerWidth) * 2 - 1;
      targetY = (event.clientY / window.innerHeight) * 2 - 1;
    },
    { passive: true }
  );

  // ---------- Loop ----------
  const clock = new THREE.Clock();

  function updateDepth() {
    camera.getWorldDirection(forward);
    const centerDistance = camera.position.length();
    depthMaterial.uniforms.uNear.value = centerDistance - halfExtent;
    depthMaterial.uniforms.uFar.value = centerDistance + halfExtent * 0.22;
  }

  function animate() {
    requestAnimationFrame(animate);
    if (!inView || document.hidden) return;

    if (reduceMotion.matches) {
      if (!needsRender) return;
      needsRender = false;
      pivot.rotation.y = baseYaw;
      pivot.rotation.x = 0;
      pivot.position.y = 0;
      if (modelReady) updateDepth();
      renderer.render(scene, camera);
      return;
    }

    const dt = Math.min(clock.getDelta(), 1 / 30);
    const time = clock.elapsedTime;
    const ease = 1 - Math.exp(-2.6 * dt);
    pointerX += (targetX - pointerX) * ease;
    pointerY += (targetY - pointerY) * ease;

    pivot.rotation.y = baseYaw + Math.sin(time * 0.16) * 0.09 + pointerX * 0.12;
    pivot.rotation.x = pointerY * 0.05;
    pivot.position.y = Math.sin(time * 0.42) * 0.045;

    if (modelReady) updateDepth();
    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);
}
