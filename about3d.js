import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// ---------- About specimen: scroll-driven bronze study ----------
// A contained Three.js stage inside the About layer. The camera orbits the
// scan as the layer crosses the viewport; drag adds a manual inspection
// offset on top of the scroll orbit.

const stage = document.querySelector("#specimenStage");
const canvas = document.querySelector("#specimenCanvas");

if (stage && canvas) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const azimuthEl = document.querySelector("#specimenAzimuth");
  const loadEl = document.querySelector("#specimenLoad");
  const loadFill = document.querySelector("#specimenLoadFill");
  const loadPct = document.querySelector("#specimenLoadPct");

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  // ---------- Scene ----------
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
  camera.position.set(0, 2.4, 4.8);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 768 ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  // ---------- Reflections ----------
  // A tiny procedural studio environment: hot white key, cyan rim, dark floor.
  function createEnvironment() {
    const envCanvas = document.createElement("canvas");
    envCanvas.width = 512;
    envCanvas.height = 256;
    const ctx = envCanvas.getContext("2d");

    const base = ctx.createLinearGradient(0, 0, 0, 256);
    base.addColorStop(0, "#22343d");
    base.addColorStop(0.45, "#0a141a");
    base.addColorStop(1, "#010304");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 512, 256);

    const key = ctx.createRadialGradient(360, 62, 0, 360, 62, 130);
    key.addColorStop(0, "rgba(255, 255, 255, 1)");
    key.addColorStop(0.22, "rgba(255, 238, 214, 0.75)");
    key.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = key;
    ctx.fillRect(0, 0, 512, 256);

    const rim = ctx.createRadialGradient(96, 128, 0, 96, 128, 150);
    rim.addColorStop(0, "rgba(0, 240, 255, 0.8)");
    rim.addColorStop(1, "rgba(0, 240, 255, 0)");
    ctx.fillStyle = rim;
    ctx.fillRect(0, 0, 512, 256);

    const texture = new THREE.CanvasTexture(envCanvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromEquirectangular(texture).texture;
    texture.dispose();
    pmrem.dispose();
  }
  createEnvironment();

  // ---------- Light rig ----------
  scene.add(new THREE.AmbientLight(0xdff1ff, 0.35));

  const keyLight = new THREE.DirectionalLight(0xfff0dd, 4.4);
  keyLight.position.set(4, 6, 3);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.left = -5;
  keyLight.shadow.camera.right = 5;
  keyLight.shadow.camera.top = 5;
  keyLight.shadow.camera.bottom = -5;
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 20;
  keyLight.shadow.bias = -0.001;
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x63e8ff, 4.2);
  rimLight.position.set(-5, 3, -4);
  scene.add(rimLight);

  const fillLight = new THREE.DirectionalLight(0xffd7ad, 1.2);
  fillLight.position.set(-2, -4, 3);
  scene.add(fillLight);

  const underLight = new THREE.PointLight(0x00f0ff, 14, 9, 2);
  underLight.position.set(0, -1.8, 2.4);
  scene.add(underLight);

  // ---------- Soft contact shadow ----------
  function createContactShadow() {
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = 256;
    shadowCanvas.height = 256;
    const ctx = shadowCanvas.getContext("2d");
    const gradient = ctx.createRadialGradient(128, 128, 6, 128, 128, 118);
    gradient.addColorStop(0, "rgba(0, 0, 0, 0.62)");
    gradient.addColorStop(0.45, "rgba(0, 0, 0, 0.24)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    const texture = new THREE.CanvasTexture(shadowCanvas);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      opacity: 0.9,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 2.6), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -0.7;
    scene.add(mesh);
    return mesh;
  }
  createContactShadow();

  // ---------- Forge sparks ----------
  const SPARK_COUNT = reduceMotion.matches ? 0 : 150;
  const sparkData = [];
  let sparkParticles = null;

  function createSparkTexture() {
    const textureCanvas = document.createElement("canvas");
    textureCanvas.width = 16;
    textureCanvas.height = 16;
    const ctx = textureCanvas.getContext("2d");
    const gradient = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradient.addColorStop(0.25, "rgba(255, 255, 255, 0.8)");
    gradient.addColorStop(0.6, "rgba(255, 255, 255, 0.25)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 16, 16);
    return new THREE.CanvasTexture(textureCanvas);
  }

  function createSparks() {
    if (!SPARK_COUNT) return;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(SPARK_COUNT * 3);
    const colors = new Float32Array(SPARK_COUNT * 3);

    for (let i = 0; i < SPARK_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 5.6;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 2.8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2.2;

      if (Math.random() < 0.55) {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.62 + Math.random() * 0.14;
        colors[i * 3 + 2] = 0.28 + Math.random() * 0.14;
      } else {
        colors[i * 3] = 0.36 + Math.random() * 0.12;
        colors[i * 3 + 1] = 0.86 + Math.random() * 0.1;
        colors[i * 3 + 2] = 1.0;
      }

      sparkData.push({
        speedX: (Math.random() - 0.5) * 0.08,
        speedY: 0.035 + Math.random() * 0.08,
        speedZ: (Math.random() - 0.5) * 0.08,
        swaySpeed: 0.4 + Math.random() * 1.2,
        swayRadius: 0.02 + Math.random() * 0.06,
        phase: Math.random() * Math.PI * 2,
      });
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.022,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: createSparkTexture(),
    });

    sparkParticles = new THREE.Points(geometry, material);
    scene.add(sparkParticles);
  }
  createSparks();

  // ---------- Model ----------
  const pivot = new THREE.Group();
  scene.add(pivot);

  let modelRadius = 1.8;
  let cameraRadius = 4.6;
  let modelReady = false;

  function setLoadProgress(percent) {
    const value = clamp(Math.round(percent), 0, 100);
    if (loadFill) loadFill.style.width = `${value}%`;
    if (loadPct) loadPct.textContent = `${value}%`;
  }

  function finishLoading() {
    modelReady = true;
    stage.classList.add("is-ready");
    if (loadEl) {
      loadEl.classList.add("is-done");
      window.setTimeout(() => loadEl.remove(), 900);
    }
  }

  function buildModel(gltf) {
    const model = gltf.scene;

    const bronze = new THREE.MeshStandardMaterial({
      color: 0xa97645,
      metalness: 0.88,
      roughness: 0.36,
      envMapIntensity: 1.6,
      flatShading: false,
      // The scan ships double-sided; keep it so no bone surface vanishes.
      side: THREE.DoubleSide,
    });

    model.traverse((child) => {
      if (!child.isMesh) return;
      child.material = bronze;
      child.castShadow = true;
      child.receiveShadow = true;
    });

    // Normalize to a 3.6 unit footprint, then recenter inside the pivot.
    const initialBox = new THREE.Box3().setFromObject(model);
    const initialSize = initialBox.getSize(new THREE.Vector3());
    const maxDim = Math.max(initialSize.x, initialSize.y, initialSize.z);
    model.scale.setScalar(3.6 / (maxDim > 0.0001 ? maxDim : 1));
    model.updateMatrixWorld(true);

    const scaledBox = new THREE.Box3().setFromObject(model);
    const center = scaledBox.getCenter(new THREE.Vector3());
    model.position.sub(center);
    model.updateMatrixWorld(true);

    const finalBox = new THREE.Box3().setFromObject(model);
    modelRadius = Math.max(1, finalBox.getBoundingSphere(new THREE.Sphere()).radius);
    updateCameraFit();

    pivot.add(model);

    // Sit the contact shadow just under the lowest point of the scan.
    const shadow = scene.children.find((child) => child.geometry?.type === "PlaneGeometry");
    if (shadow) shadow.position.y = finalBox.min.y - 0.06;

    finishLoading();
  }

  const loader = new GLTFLoader();
  loader.load(
    "assets/gekko-japonicus.glb",
    buildModel,
    (event) => {
      if (event.total) setLoadProgress((event.loaded / event.total) * 100);
    },
    (error) => {
      console.error("Could not load the gecko specimen:", error);
      if (loadPct) loadPct.textContent = "—";
      const label = loadEl?.querySelector(".specimen-load-label");
      if (label) label.textContent = "Specimen unavailable";
    }
  );

  // ---------- Interaction state ----------
  let orbitProgress = 0;
  let scrollVelocity = 0;
  let pointerX = 0;
  let pointerY = 0;
  let targetPointerX = 0;
  let targetPointerY = 0;

  let dragYaw = 0;
  let dragPitch = 0;
  let targetDragYaw = 0;
  let targetDragPitch = 0;

  let dragging = false;
  let activePointer = null;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let touched = false;

  const BASE_AZIMUTH = -0.72;
  const BASE_ELEVATION = 0.66;

  stage.addEventListener("pointerenter", () => {
    document.querySelector("#cursorRing")?.classList.add("inspect");
  });

  stage.addEventListener("pointerleave", () => {
    document.querySelector("#cursorRing")?.classList.remove("inspect");
  });

  stage.addEventListener("pointerdown", (event) => {
    if (event.button !== undefined && event.button !== 0 && event.pointerType === "mouse") return;

    dragging = true;
    activePointer = event.pointerId;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    stage.setPointerCapture(event.pointerId);
    stage.classList.add("is-dragging");

    if (!touched) {
      touched = true;
      stage.classList.add("is-touched");
    }
  });

  stage.addEventListener("pointermove", (event) => {
    const rect = stage.getBoundingClientRect();
    targetPointerX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    targetPointerY = ((event.clientY - rect.top) / rect.height) * 2 - 1;

    if (!dragging || event.pointerId !== activePointer) return;

    const dx = event.clientX - lastPointerX;
    const dy = event.clientY - lastPointerY;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;

    targetDragYaw += dx * 0.0055;
    if (event.pointerType !== "touch") targetDragPitch = clamp(targetDragPitch + dy * 0.0025, -0.16, 0.16);
  });

  function endDrag(event) {
    if (event && event.pointerId !== activePointer) return;
    dragging = false;
    activePointer = null;
    stage.classList.remove("is-dragging");
    if (stage.hasPointerCapture?.(event.pointerId)) stage.releasePointerCapture(event.pointerId);
  }

  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);

  // ---------- Sizing / visibility ----------
  function updateCameraFit() {
    const verticalHalf = THREE.MathUtils.degToRad(camera.fov / 2);
    const horizontalHalf = Math.atan(Math.tan(verticalHalf) * camera.aspect);
    const horizontalFit = (modelRadius * 1.06) / Math.sin(horizontalHalf);
    cameraRadius = Math.max(modelRadius * 2.6, horizontalFit);
  }

  function resize() {
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    if (!width || !height) return;

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 768 ? 1.5 : 2));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    updateCameraFit();
  }

  resize();
  new ResizeObserver(resize).observe(stage);

  let inView = false;
  new IntersectionObserver(
    ([entry]) => {
      inView = entry.isIntersecting;
    },
    { rootMargin: "240px 0px" }
  ).observe(stage);

  // ---------- Loop ----------
  const clock = new THREE.Clock();
  const lookAt = new THREE.Vector3(0, 0.04, 0);
  const targetPosition = new THREE.Vector3();
  let lastAzimuthUpdate = 0;

  function readProgress() {
    const rect = stage.getBoundingClientRect();
    return clamp((window.innerHeight - rect.top) / (window.innerHeight + rect.height), 0, 1);
  }

  function updateSparks(dt) {
    if (!sparkParticles) return;

    const positions = sparkParticles.geometry.attributes.position.array;
    const time = clock.elapsedTime;
    const speedMultiplier = 1 + scrollVelocity * 8;
    const turbulence = scrollVelocity * 0.9;

    for (let i = 0; i < SPARK_COUNT; i++) {
      const index = i * 3;
      const data = sparkData[i];

      positions[index] += data.speedX * dt * speedMultiplier;
      positions[index + 1] += data.speedY * dt * speedMultiplier;
      positions[index + 2] += data.speedZ * dt * speedMultiplier;

      const sway = data.swayRadius * (1 + turbulence * 4);
      positions[index] += Math.sin(time * data.swaySpeed + data.phase) * sway * dt;
      positions[index + 2] += Math.cos(time * data.swaySpeed + data.phase) * sway * dt;

      if (
        positions[index + 1] > 1.9 ||
        Math.abs(positions[index]) > 3.1 ||
        Math.abs(positions[index + 2]) > 1.6
      ) {
        positions[index] = (Math.random() - 0.5) * 3.2;
        positions[index + 1] = -1.2;
        positions[index + 2] = (Math.random() - 0.5) * 1.6;
      }
    }

    sparkParticles.geometry.attributes.position.needsUpdate = true;
  }

  function animate(now) {
    requestAnimationFrame(animate);
    if (!inView || document.hidden) return;

    const dt = Math.min(clock.getDelta(), 1 / 30);
    const progress = readProgress();
    const previousOrbit = orbitProgress;

    orbitProgress += (progress - orbitProgress) * 0.045;
    scrollVelocity = Math.abs(orbitProgress - previousOrbit);

    pointerX += (targetPointerX - pointerX) * 0.05;
    pointerY += (targetPointerY - pointerY) * 0.05;

    dragYaw += (targetDragYaw - dragYaw) * 0.09;
    dragPitch += (targetDragPitch - dragPitch) * 0.09;

    const autoOrbit = reduceMotion.matches ? 0.42 : orbitProgress * Math.PI * 2;
    const phi = BASE_AZIMUTH + autoOrbit;
    const elevation = BASE_ELEVATION + Math.sin(orbitProgress * Math.PI) * 0.16;
    const radius = cameraRadius - Math.sin(orbitProgress * Math.PI) * 0.32;

    targetPosition.set(
      Math.sin(phi) * Math.cos(elevation) * radius,
      Math.sin(elevation) * radius,
      Math.cos(phi) * Math.cos(elevation) * radius
    );

    camera.position.lerp(targetPosition, 0.055);
    camera.lookAt(lookAt);

    if (modelReady) {
      pivot.rotation.y = dragYaw + pointerX * 0.04;
      pivot.rotation.x = dragPitch + pointerY * 0.025;
    }

    if (sparkParticles && !reduceMotion.matches) updateSparks(dt);

    if (now - lastAzimuthUpdate > 120 && azimuthEl) {
      lastAzimuthUpdate = now;
      const degrees = ((phi + dragYaw) * 180) / Math.PI;
      azimuthEl.textContent = `AZ ${String(Math.abs(Math.round(degrees)) % 360).padStart(3, "0")}°`;
    }

    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);
}
