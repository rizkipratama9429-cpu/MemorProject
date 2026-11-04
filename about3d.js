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
  let baseYaw = 0;
  let baseOffsetY = 0;
  let viewportNarrow = false;
  let viewportTight = false;
  let modelReady = false;

  // Three shots, each with a parked frame while its copy is on screen:
  // a high establishing pass, a near-overhead plate, then a close low flank.
  // x is a screen-space fraction rather than a world coordinate.
  const CAMERA_KEYS = [
    { at: 0, azimuth: -0.78, elevation: 0.58, distance: 0.92, lookY: -0.2, x: 0.6 },
    { at: 0.2, azimuth: -0.72, elevation: 0.54, distance: 0.9, lookY: -0.22, x: 0.61 },
    { at: 0.36, azimuth: 0.16, elevation: 1.12, distance: 0.88, lookY: -0.3, x: 0.62 },
    { at: 0.55, azimuth: 0.26, elevation: 1.06, distance: 0.9, lookY: -0.28, x: 0.63 },
    { at: 0.7, azimuth: 0.86, elevation: 0.12, distance: 0.82, lookY: -0.1, x: 0.65 },
    { at: 0.9, azimuth: 0.96, elevation: 0.06, distance: 0.78, lookY: -0.06, x: 0.66 },
    { at: 1, azimuth: 1.02, elevation: 0.08, distance: 0.77, lookY: -0.07, x: 0.67 },
  ];
  const CAMERA_KEYS_NARROW = [
    { at: 0, azimuth: -0.72, elevation: 0.72, distance: 1, lookY: -0.7, x: 0.5 },
    { at: 0.2, azimuth: -0.66, elevation: 0.76, distance: 0.98, lookY: -0.72, x: 0.51 },
    { at: 0.36, azimuth: -0.24, elevation: 1.18, distance: 1.34, lookY: -1, x: 0.52, lift: 0.13 },
    { at: 0.55, azimuth: -0.2, elevation: 1.1, distance: 1.32, lookY: -0.96, x: 0.53, lift: 0.13 },
    { at: 0.7, azimuth: -0.92, elevation: 0.5, distance: 0.9, lookY: -0.72, x: 0.55 },
    { at: 0.9, azimuth: -1, elevation: 0.44, distance: 0.87, lookY: -0.7, x: 0.56 },
    { at: 1, azimuth: -1.04, elevation: 0.46, distance: 0.86, lookY: -0.71, x: 0.56 },
  ];
  const camState = { azimuth: 0, elevation: 0, distance: 1, lookY: 0, x: 0.5, lift: 0 };

  const lookAt = new THREE.Vector3(0, -0.18, 0);
  const cameraTarget = new THREE.Vector3();

  function sampleCamera(progress) {
    const keys = viewportNarrow ? CAMERA_KEYS_NARROW : CAMERA_KEYS;
    let index = 0;
    while (index < keys.length - 2 && progress > keys[index + 1].at) index += 1;

    const from = keys[index];
    const to = keys[index + 1];
    const span = Math.max(0.0001, to.at - from.at);
    const t = clamp((progress - from.at) / span, 0, 1);
    const eased = t * t * (3 - 2 * t);

    camState.azimuth = THREE.MathUtils.lerp(from.azimuth, to.azimuth, eased);
    camState.elevation = THREE.MathUtils.lerp(from.elevation, to.elevation, eased);
    camState.distance = THREE.MathUtils.lerp(from.distance, to.distance, eased);
    camState.lookY = THREE.MathUtils.lerp(from.lookY, to.lookY, eased);
    camState.lift = THREE.MathUtils.lerp(from.lift || 0, to.lift || 0, eased);
    // Narrow landscape has less horizontal room once the specimen is lifted
    // above the copy, so center it instead of pushing it to the right edge.
    camState.x = clamp(
      THREE.MathUtils.lerp(from.x, to.x, eased) - (viewportTight ? 0.09 : 0),
      0.35,
      0.8
    );
    return camState;
  }

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
    const tightLandscape = !narrow && width / height < 1.5;
    const verticalHalf = THREE.MathUtils.degToRad(camera.fov / 2);
    const horizontalHalf = Math.atan(Math.tan(verticalHalf) * (width / height));
    const horizontalFit = (modelRadius * (narrow ? 1.18 : 1.1)) / Math.sin(horizontalHalf);

    // On phones the scan is turned upright, so its silhouette is far narrower
    // than its bounding sphere. Fitting the sphere would leave it tiny.
    cameraRadius = Math.max(
      modelRadius * (narrow ? 2.7 : 3.3),
      horizontalFit * (narrow ? 0.88 : 1)
    );

    // Short phones have no vertical room between the top HUD and the copy, so
    // pull the whole orbit back instead of letting the scan sit on the text.
    if (narrow && height < 720) cameraRadius *= 1.32;
    if (tightLandscape) cameraRadius *= 1.08;

    // On phones the specimen itself is turned upright, because a vertical
    // silhouette reads better in a portrait viewport; the camera only makes
    // small height and side adjustments.
    viewportNarrow = narrow;
    viewportTight = tightLandscape;
    baseYaw = narrow ? -5.34 : 0;

    // Hold the specimen above the copy when the viewport is portrait or a
    // narrow landscape. Lift the whole orbit rather than tilting the camera,
    // so the scan keeps its silhouette. Scaled with camera distance.
    baseOffsetY = narrow ? cameraRadius * 0.13 : tightLandscape ? cameraRadius * 0.14 : 0;
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

  // ---------- Scroll timeline ----------
  const clock = new THREE.Clock();
  let sceneProgress = 0;
  let previousProgress = 0;
  let activeBeat = -1;

  // A hard flick can move the raw scroll position across a whole beat in one
  // frame. Cap the playhead's travel speed so the camera move and copy reveal
  // still run instead of snapping to their end state.
  const MAX_TIMELINE_RATE = 0.28; // timeline fraction per second
  const TIMELINE_EASE = 7;

  function advanceTimeline(target, dt) {
    const delta = target - sceneProgress;
    if (Math.abs(delta) < 0.0005) return target;

    const easedStep = delta * (1 - Math.exp(-TIMELINE_EASE * dt));
    const maxStep = MAX_TIMELINE_RATE * dt;
    return sceneProgress + clamp(easedStep, -maxStep, maxStep);
  }

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

  let inView = false;
  new IntersectionObserver(
    ([entry]) => {
      inView = entry.isIntersecting;
      // Once the scene is fully out of view, park the playhead on the nearest
      // end so re-entering from the other side never rewinds stale beats.
      if (inView || !sceneSection) return;
      const rect = sceneSection.getBoundingClientRect();
      if (rect.bottom <= 0) sceneProgress = 1;
      else if (rect.top >= window.innerHeight) sceneProgress = 0;
    },
    { rootMargin: "240px 0px" }
  ).observe(stage);

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

  function animate(now) {
    requestAnimationFrame(animate);
    if (!inView || document.hidden) return;

    const frameDelta = clock.getDelta();
    const dt = Math.min(frameDelta, 1 / 30);
    const progress = readProgress();

    previousProgress = sceneProgress;
    // Use the real frame time so the cap stays fixed even when the 3D view
    // runs below 30 fps; only a tab-switch gap is allowed to be swallowed.
    sceneProgress = reduceMotion.matches
      ? progress
      : advanceTimeline(progress, Math.min(frameDelta, 0.1));

    const pointerEase = 1 - Math.exp(-3 * dt);
    pointerX += (targetPointerX - pointerX) * pointerEase;
    pointerY += (targetPointerY - pointerY) * pointerEase;

    const dragEase = 1 - Math.exp(-5.4 * dt);
    dragYaw += (targetDragYaw - dragYaw) * dragEase;
    dragPitch += (targetDragPitch - dragPitch) * dragEase;

    // The camera walks through a new angle per beat while the specimen keeps
    // drifting right, so the pinned scene never settles into a still frame.
    const cam = sampleCamera(reduceMotion.matches ? 0.5 : sceneProgress);
    const camRadius = cameraRadius * cam.distance;

    cameraTarget.set(
      Math.sin(cam.azimuth) * Math.cos(cam.elevation) * camRadius,
      Math.sin(cam.elevation) * camRadius,
      Math.cos(cam.azimuth) * Math.cos(cam.elevation) * camRadius
    );
    camera.position.lerp(cameraTarget, reduceMotion.matches ? 1 : 1 - Math.exp(-5 * dt));
    lookAt.set(0, cam.lookY, 0);
    camera.lookAt(lookAt);

    // Measure x against the visible plane at the model so the screen-space
    // drift holds steady even as the camera moves closer.
    const halfWidth =
      camRadius * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
    const travelX = (cam.x * 2 - 1) * halfWidth;
    orbit.position.x +=
      (travelX - orbit.position.x) * (reduceMotion.matches ? 1 : 1 - Math.exp(-7.7 * dt));
    orbit.position.y = baseOffsetY + cam.lift * camRadius;

    // Keep the forge dust wrapped around the specimen as it travels.
    if (sparkParticles) sparkParticles.position.set(orbit.position.x, orbit.position.y, 0);

    if (modelReady) {
      pivot.rotation.y = baseYaw + dragYaw + pointerX * 0.04;
      pivot.rotation.x = dragPitch + pointerY * 0.025;
    }

    if (sparkParticles && !reduceMotion.matches) updateSparks(dt);

    if (copyShouldShow()) {
      // Follow the limited playhead, not the raw scroll, so each beat gets its
      // full reveal even when the wheel was flicked hard.
      const beatIndex = Math.min(beats.length - 1, Math.floor(sceneProgress * beats.length));
      setActiveBeat(beatIndex);
    } else {
      setActiveBeat(-1);
    }

    if (now - lastAzimuthUpdate > 120 && azimuthEl) {
      lastAzimuthUpdate = now;
      const degrees = ((cam.azimuth - baseYaw + dragYaw) * 180) / Math.PI;
      azimuthEl.textContent = `AZ ${String(Math.abs(Math.round(degrees)) % 360).padStart(3, "0")}°`;
    }

    renderer.render(scene, camera);
  }

  let lastAzimuthUpdate = 0;
  requestAnimationFrame(animate);
}
