import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// ---------- About: full-bleed bronze specimen ----------
// The gecko is the About layer now, not a card inside it. Scrolling drifts
// it along the x axis while the copy moves through two editorial beats.

const stage = document.querySelector("#specimenStage");
const canvas = document.querySelector("#specimenCanvas");

if (stage && canvas) {
  const sceneSection = document.querySelector("#about");
  const pin = document.querySelector("#aboutPin");
  const azimuthEl = document.querySelector("#specimenAzimuth");
  const loadEl = document.querySelector("#specimenLoad");
  const loadFill = document.querySelector("#specimenLoadFill");
  const loadPct = document.querySelector("#specimenLoadPct");
  const title = document.querySelector("#aboutTitle");
  const beats = Array.from(document.querySelectorAll("[data-about-beat]"));
  const railFills = Array.from(document.querySelectorAll("[data-rail]"));

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  // ---------- Scene ----------
  const scene = new THREE.Scene();
  // The orbit carries scroll translation; the pivot carries drag rotation, so
  // the contact shadow drifts with the model without spinning with it.
  const orbit = new THREE.Group();
  scene.add(orbit);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 80);
  camera.position.set(0, 3.4, 5.2);

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
  keyLight.shadow.camera.left = -6;
  keyLight.shadow.camera.right = 6;
  keyLight.shadow.camera.top = 6;
  keyLight.shadow.camera.bottom = -6;
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 24;
  keyLight.shadow.bias = -0.001;
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x63e8ff, 4.2);
  rimLight.position.set(-5, 3, -4);
  scene.add(rimLight);

  const fillLight = new THREE.DirectionalLight(0xffd7ad, 1.2);
  fillLight.position.set(-2, -4, 3);
  scene.add(fillLight);

  const underLight = new THREE.PointLight(0x00f0ff, 14, 12, 2);
  underLight.position.set(0, -1.8, 2.4);
  scene.add(underLight);

  // ---------- Soft contact shadow ----------
  let contactShadow = null;

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
    contactShadow = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 2.6), material);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = -0.7;
    orbit.add(contactShadow);
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
      positions[i * 3] = (Math.random() - 0.5) * 8.4;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 3.4;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 3.2;

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
        speedY: 0.025 + Math.random() * 0.07,
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

  // ---------- Copy: per-letter blur-up ----------
  function splitChars(root) {
    if (!root) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);

    let index = 0;

    textNodes.forEach((node) => {
      const text = node.nodeValue;
      if (!text || !text.trim()) return;

      const fragment = document.createDocumentFragment();

      for (const character of text) {
        if (character === " " || character === "\n" || character === "\t") {
          fragment.appendChild(document.createTextNode(character));
          continue;
        }

        const span = document.createElement("span");
        span.className = "about-char";
        span.textContent = character;
        span.style.transitionDelay = `${(index * 0.028).toFixed(3)}s`;
        fragment.appendChild(span);
        index += 1;
      }

      node.parentNode.replaceChild(fragment, node);
    });
  }
  splitChars(title);

  // The first beat is active in the markup as a no-JS fallback. Hand it to
  // the scroll timeline from here so it can play when the scene actually pins.
  beats.forEach((el) => el.classList.remove("is-active"));

  // ---------- Model ----------
  const pivot = new THREE.Group();
  orbit.add(pivot);

  let modelRadius = 1.8;
  let cameraRadius = 5.5;
  let travelStart = 0;
  let travelEnd = 0;
  let baseAzimuth = -0.72;
  let baseElevation = 0.66;
  let baseYaw = 0;
  let baseOffsetY = 0;
  let modelReady = false;

  const lookAt = new THREE.Vector3(0, -0.18, 0);
  const cameraTarget = new THREE.Vector3();

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

  function updateCameraFit() {
    const width = stage.clientWidth || 1;
    const height = stage.clientHeight || 1;
    if (!width || !height) return;

    const narrow = width <= 768;
    const verticalHalf = THREE.MathUtils.degToRad(camera.fov / 2);
    const horizontalHalf = Math.atan(Math.tan(verticalHalf) * (width / height));
    const horizontalFit = (modelRadius * (narrow ? 1.18 : 1.1)) / Math.sin(horizontalHalf);

    // On phones the scan is turned upright, so its silhouette is far narrower
    // than its bounding sphere. Fitting the sphere would leave it tiny.
    cameraRadius = Math.max(
      modelRadius * (narrow ? 2.7 : 3.3),
      horizontalFit * (narrow ? 0.88 : 1)
    );

    // Keep the camera off the x axis so the scroll drift stays horizontal on
    // screen. On phones the specimen itself is turned upright instead, because
    // a vertical silhouette reads better in a portrait viewport.
    baseAzimuth = -0.72;
    baseElevation = narrow ? 0.78 : 0.66;
    baseYaw = narrow ? -5.34 : 0;

    // Hold the specimen above the copy on portrait screens; the practice beat
    // is tall enough to need the whole lower half. Lift the whole orbit rather
    // than tilting the camera, so the scan keeps its established silhouette.
    // Scaled with camera distance so the lift holds on tablets as well as phones.
    baseOffsetY = narrow ? cameraRadius * 0.13 : 0;
    lookAt.set(0, narrow ? -0.7 : -0.18, 0);

    cameraTarget.set(
      Math.sin(baseAzimuth) * Math.cos(baseElevation) * cameraRadius,
      Math.sin(baseElevation) * cameraRadius,
      Math.cos(baseAzimuth) * Math.cos(baseElevation) * cameraRadius
    );

    // Horizontal drift, measured against the visible plane at the model.
    const halfWidth = cameraRadius * Math.tan(verticalHalf) * (width / height);
    const startFraction = narrow ? 0.38 : 0.54;
    const endFraction = narrow ? 0.64 : 0.74;
    travelStart = (startFraction * 2 - 1) * halfWidth;
    travelEnd = (endFraction * 2 - 1) * halfWidth;
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
    if (contactShadow) contactShadow.position.y = finalBox.min.y - 0.06;

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

  // ---------- Scroll timeline ----------
  const clock = new THREE.Clock();
  let sceneProgress = 0;
  let previousProgress = 0;
  let activeBeat = -1;

  function readProgress() {
    if (!sceneSection || !pin) return 0;
    const rect = sceneSection.getBoundingClientRect();
    const scrollable = Math.max(1, sceneSection.offsetHeight - pin.offsetHeight);
    return clamp(-rect.top / scrollable, 0, 1);
  }

  function copyShouldShow() {
    if (!pin) return false;
    const rect = pin.getBoundingClientRect();
    const vh = window.innerHeight;
    const visible = Math.min(rect.bottom, vh) - Math.max(rect.top, 0);
    return rect.top <= 24 && visible > Math.min(rect.height, vh) * 0.55;
  }

  function setActiveBeat(index) {
    if (index === activeBeat) return;
    activeBeat = index;
    beats.forEach((el, i) => el.classList.toggle("is-active", i === index));
  }

  function updateSparks(dt) {
    if (!sparkParticles) return;

    const positions = sparkParticles.geometry.attributes.position.array;
    const time = clock.elapsedTime;
    const speedMultiplier = 1 + Math.abs(sceneProgress - previousProgress) * 60;
    const turbulence = Math.abs(sceneProgress - previousProgress) * 4;

    for (let i = 0; i < SPARK_COUNT; i++) {
      const index = i * 3;
      const data = sparkData[i];

      positions[index] += data.speedX * dt * speedMultiplier;
      positions[index + 1] += data.speedY * dt * speedMultiplier;
      positions[index + 2] += data.speedZ * dt * speedMultiplier;

      const sway = data.swayRadius * (1 + turbulence);
      positions[index] += Math.sin(time * data.swaySpeed + data.phase) * sway * dt;
      positions[index + 2] += Math.cos(time * data.swaySpeed + data.phase) * sway * dt;

      if (
        positions[index + 1] > 1.9 ||
        Math.abs(positions[index]) > 4.2 ||
        Math.abs(positions[index + 2]) > 2.0
      ) {
        positions[index] = (Math.random() - 0.5) * 5.2;
        positions[index + 1] = -1.4;
        positions[index + 2] = (Math.random() - 0.5) * 2.0;
      }
    }

    sparkParticles.geometry.attributes.position.needsUpdate = true;
  }

  function updateRail(progress) {
    if (!railFills.length) return;
    const first = clamp(progress / 0.52, 0, 1);
    const second = clamp((progress - 0.52) / 0.48, 0, 1);
    railFills[0].style.height = `${(first * 100).toFixed(1)}%`;
    railFills[1].style.height = `${(second * 100).toFixed(1)}%`;
  }

  function animate(now) {
    requestAnimationFrame(animate);
    if (!inView || document.hidden) return;

    const dt = Math.min(clock.getDelta(), 1 / 30);
    const progress = readProgress();

    previousProgress = sceneProgress;
    const smoothing = reduceMotion.matches ? 1 : 0.055;
    sceneProgress += (progress - sceneProgress) * smoothing;

    pointerX += (targetPointerX - pointerX) * 0.05;
    pointerY += (targetPointerY - pointerY) * 0.05;

    dragYaw += (targetDragYaw - dragYaw) * 0.09;
    dragPitch += (targetDragPitch - dragPitch) * 0.09;

    // Only x travel: the statue drifts right across the pinned scene.
    const travelT = reduceMotion.matches ? 1 : sceneProgress;
    const easedT = travelT * travelT * (3 - 2 * travelT);
    const travelX = THREE.MathUtils.lerp(travelStart, travelEnd, easedT);
    orbit.position.x = travelX;
    orbit.position.y = baseOffsetY;

    // Keep the forge dust wrapped around the specimen as it travels.
    if (sparkParticles) sparkParticles.position.set(travelX, baseOffsetY, 0);

    if (modelReady) {
      pivot.rotation.y = baseYaw + dragYaw + pointerX * 0.04;
      pivot.rotation.x = dragPitch + pointerY * 0.025;
    }

    camera.position.lerp(cameraTarget, 0.08);
    camera.lookAt(lookAt);

    if (sparkParticles && !reduceMotion.matches) updateSparks(dt);

    if (copyShouldShow()) {
      setActiveBeat(progress < 0.52 ? 0 : 1);
    } else {
      setActiveBeat(-1);
    }

    updateRail(sceneProgress);

    if (now - lastAzimuthUpdate > 120 && azimuthEl) {
      lastAzimuthUpdate = now;
      const degrees = ((baseAzimuth - baseYaw + dragYaw) * 180) / Math.PI;
      azimuthEl.textContent = `AZ ${String(Math.abs(Math.round(degrees)) % 360).padStart(3, "0")}°`;
    }

    renderer.render(scene, camera);
  }

  let lastAzimuthUpdate = 0;
  requestAnimationFrame(animate);
}
