import Lenis from "lenis";

// ---------- Scroll motion ----------
// One rAF ticker drives everything. Lenis advances the scroll first, then
// every layer samples the current frame: parallax and spring reveals.
// Springs use the react-spring { tension, friction } model.

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const wash = document.querySelector(".page-bg-pan-left");
const grid = document.querySelector(".page-bg-grid");
const gecko = document.querySelector(".hero-gecko");
const hero = document.querySelector(".hero");
const wordmark = document.querySelector(".footer-wordmark span");
const aboutSection = document.querySelector("#about");
const aboutPin = document.querySelector("#aboutPin");

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

class Spring {
  constructor(value, tension, friction, target = value) {
    this.value = value;
    this.velocity = 0;
    this.target = target;
    this.tension = tension;
    this.friction = friction;
  }

  step(dt) {
    const displacement = this.value - this.target;
    this.velocity += (-this.tension * displacement - this.friction * this.velocity) * dt;
    this.value += this.velocity * dt;

    if (Math.abs(this.velocity) < 0.02 && Math.abs(displacement) < 0.01) {
      this.value = this.target;
      this.velocity = 0;
      return true;
    }
    return false;
  }
}

// ---------- Layered in-view reveals ----------
// Each section reveals in reading order: label, heading, body, cards.
// Delay steps by 90ms per layer; springs settle at 200/26 like the prompt.

const REVEAL_SELECTOR = [
  // About owns its own scroll-driven reveal; the remaining sections use springs.
  "#skills .section-label",
  "#skills .skill-card",
  "#work .section-label",
  "#work .work-item",
  "#testimonials .section-label",
  "#testimonials .testimonial-card",
  "#writing .section-label",
  "#writing .writing-card",
  "#contact .section-label",
  "#contact .contact-title",
  "#contact .contact-sub",
  "#contact .contact-form",
  "#contact .contact-divider",
  "#contact .contact-email",
  "#contact .contact-socials",
  ".site-footer .footer-brand",
  ".site-footer .footer-col",
  ".site-footer .footer-bottom",
].join(",");

const REVEAL_DISTANCE = 38;
const REVEAL_STAGGER = 90;

const reveals = [];
const revealCounts = new Map();

function initReveals() {
  document.querySelectorAll(REVEAL_SELECTOR).forEach((el) => {
    const group = el.closest("section, footer") || document.body;
    const index = revealCounts.get(group) || 0;
    revealCounts.set(group, index + 1);

    const record = {
      el,
      group,
      index,
      y: new Spring(REVEAL_DISTANCE, 200, 26, 0),
      opacity: new Spring(0, 200, 26, 1),
      delayDown: index * REVEAL_STAGGER,
      delayUp: 0,
      delay: 0,
      active: false,
      visible: false,
    };

    el.style.opacity = "0";
    el.style.transform = `translate3d(0, ${REVEAL_DISTANCE}px, 0)`;
    el.style.willChange = "transform, opacity";
    el.__reveal = record;
    reveals.push(record);
  });

  // Scrolling up meets the bottom layer first, so run the stagger backwards.
  for (const record of reveals) {
    const size = revealCounts.get(record.group) || 1;
    record.delayUp = (size - 1 - record.index) * REVEAL_STAGGER;
  }

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const record = entry.target.__reveal;
        if (!record) return;

        if (entry.isIntersecting) {
          if (!record.visible) startReveal(record, entry);
        } else if (record.visible) {
          resetReveal(record);
        }
      });
    },
    // Expanded root: layers arm slightly before entering and only reset
    // once they are fully off-screen, so the re-arm can never be seen.
    { threshold: 0, rootMargin: "8% 0px 8% 0px" }
  );

  reveals.forEach((record) => revealObserver.observe(record.el));
}

function startReveal(record, entry) {
  // Elements crossed from the top edge on the way up; from the bottom on the way down.
  const enteredFromTop = entry.boundingClientRect.bottom < window.innerHeight * 0.5;

  record.visible = true;
  record.active = true;
  record.delay = enteredFromTop ? record.delayUp : record.delayDown;

  record.y.value = REVEAL_DISTANCE;
  record.y.velocity = 0;
  record.opacity.value = 0;
  record.opacity.velocity = 0;

  record.el.style.opacity = "0";
  record.el.style.transform = `translate3d(0, ${REVEAL_DISTANCE}px, 0)`;
  record.el.style.willChange = "transform, opacity";
}

function resetReveal(record) {
  // Only ever reset once the layer is fully outside the viewport, so the
  // re-arm is invisible and the next pass can play in again.
  record.visible = false;
  record.active = false;

  record.y.value = REVEAL_DISTANCE;
  record.y.velocity = 0;
  record.opacity.value = 0;
  record.opacity.velocity = 0;

  record.el.style.opacity = "0";
  record.el.style.transform = `translate3d(0, ${REVEAL_DISTANCE}px, 0)`;
  record.el.style.removeProperty("will-change");
}

function stepReveals(dt) {
  for (const record of reveals) {
    if (!record.active) continue;

    if (record.delay > 0) {
      record.delay -= dt * 1000;
      continue;
    }

    const ySettled = record.y.step(dt);
    const opacitySettled = record.opacity.step(dt);

    record.el.style.opacity = record.opacity.value.toFixed(3);
    record.el.style.transform = `translate3d(0, ${record.y.value.toFixed(2)}px, 0)`;

    if (ySettled && opacitySettled) {
      record.el.style.removeProperty("opacity");
      record.el.style.removeProperty("transform");
      record.el.style.removeProperty("will-change");
      record.active = false;
    }
  }
}

// ---------- Scroll-progress parallax ----------

let lastY = -1;

function paintLayers() {
  const y = window.scrollY;
  const vh = window.innerHeight;

  if (wash) {
    wash.style.transform = `translate3d(0, ${clamp(y * 0.04, 0, 90)}px, 0)`;
  }

  if (grid) {
    grid.style.backgroundPositionY = `${y * 0.055}px`;
  }

  if (gecko && hero) {
    const rect = hero.getBoundingClientRect();
    const progress = clamp(-rect.top / rect.height, 0, 1);
    gecko.style.transform = `translate3d(0, ${progress * vh * 0.12}px, 0)`;
  }

  if (wordmark) {
    const footer = wordmark.closest("footer");
    const rect = footer.getBoundingClientRect();
    const progress = clamp((vh - rect.top) / (vh + rect.height), 0, 1);
    wordmark.style.transform = `translate3d(${(-3 + progress * 6).toFixed(2)}%, 0, 0)`;
  }

  lastY = y;
}

function paintIfMoved() {
  if (window.scrollY !== lastY) paintLayers();
}

// ---------- Expertise: scroll-revealed halftone plates ----------
// Each photograph is sampled to a 100 x 100 grid and every sample prints as
// one dot, so the plate resolves like ink on paper instead of fading in. The
// scroll position grows the dots, then dithered wipes hand one image to the
// next. Kept outside the Lenis block so reduced motion still paints a plate.

const EXPERTISE_PLATES = [
  { src: "assets/image%20transition/901fdd37ca80da575356483d7aebc477.jpg", name: "Ocular macro" },
  { src: "assets/image%20transition/leopard-gecko.webp", name: "Eublepharis macularius" },
  {
    src: "assets/image%20transition/paul-starosta-eublepharis-macularius-leopard-gecko_u-l-pshqss0.jpg",
    name: "Nocturnal study",
  },
  { src: "assets/image%20transition/download%20%281%29.jpg", name: "Captive habitat" },
];

const HALFTONE_GRID = 100;
const HALFTONE_SIZE = 700;
const HALFTONE_CELL = HALFTONE_SIZE / HALFTONE_GRID;
const HALFTONE_TOTAL = HALFTONE_GRID * HALFTONE_GRID;

const clamp01 = (value) => (value < 0 ? 0 : value > 1 ? 1 : value);
const smooth01 = (edge0, edge1, value) => {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};
const grainAt = (x, y) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};

function setupExpertise() {
  const scene = document.querySelector("#expertiseScene");
  const canvas = document.querySelector("#expertiseCanvas");
  if (!scene || !canvas) return null;

  const ctx = canvas.getContext("2d");
  const countEl = document.querySelector("#expertiseCount");
  const nameEl = document.querySelector("#expertiseName");
  const meterEl = document.querySelector("#expertiseMeter");
  const hintEl = document.querySelector("#expertiseHint");
  const ghostEl = document.querySelector("#expertiseGhost");

  const cellX = new Float32Array(HALFTONE_TOTAL);
  const cellY = new Float32Array(HALFTONE_TOTAL);
  const dissolve = new Float32Array(HALFTONE_TOTAL);
  const wipe = new Float32Array(HALFTONE_TOTAL);

  for (let y = 0; y < HALFTONE_GRID; y += 1) {
    for (let x = 0; x < HALFTONE_GRID; x += 1) {
      const i = y * HALFTONE_GRID + x;
      cellX[i] = (x + 0.5) * HALFTONE_CELL;
      cellY[i] = (y + 0.5) * HALFTONE_CELL;

      const dx = ((x + 0.5) / HALFTONE_GRID) * 2 - 1;
      const dy = ((y + 0.5) / HALFTONE_GRID) * 2 - 1;
      const radius = Math.sqrt(dx * dx + dy * dy) / Math.SQRT2;
      const grain = grainAt(x, y);
      // Centre-out dissolve for the first plate, left-to-right grain wipe for
      // every hand-off after it.
      dissolve[i] = radius * 0.74 + grain * 0.26;
      wipe[i] = (x / (HALFTONE_GRID - 1)) * 0.78 + grain * 0.22;
    }
  }

  const plates = EXPERTISE_PLATES.map((plate) => ({ ...plate, data: null, radius: null, colors: null }));
  let ready = false;
  let lastProgress = -1;
  let currentPlate = -1;

  function loadPlate(plate) {
    return new Promise((resolve) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        const off = document.createElement("canvas");
        off.width = HALFTONE_GRID;
        off.height = HALFTONE_GRID;
        const octx = off.getContext("2d", { willReadFrequently: true });
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        octx.drawImage(
          img,
          (img.naturalWidth - side) / 2,
          (img.naturalHeight - side) / 2,
          side,
          side,
          0,
          0,
          HALFTONE_GRID,
          HALFTONE_GRID
        );

        const { data } = octx.getImageData(0, 0, HALFTONE_GRID, HALFTONE_GRID);
        plate.data = data;
        plate.radius = new Float32Array(HALFTONE_TOTAL);
        plate.colors = new Array(HALFTONE_TOTAL);

        for (let i = 0; i < HALFTONE_TOTAL; i += 1) {
          const r = data[i * 4];
          const g = data[i * 4 + 1];
          const b = data[i * 4 + 2];
          const lum = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
          // Darker samples print a bigger dot; light ones leave paper. The
          // slight ink multiply keeps the plate from going pastel on paper.
          plate.radius[i] = HALFTONE_CELL * (0.46 + (1 - lum) * 0.3);
          plate.colors[i] = `rgb(${(r * 0.94) | 0},${(g * 0.94) | 0},${(b * 0.94) | 0})`;
        }
        resolve();
      };
      img.onerror = resolve;
      img.src = plate.src;
    });
  }

  function draw(progress, forcedReveal) {
    const p = clamp01(progress);
    const reveal = forcedReveal ?? smooth01(0.02, 0.3, p);

    ctx.clearRect(0, 0, HALFTONE_SIZE, HALFTONE_SIZE);

    const segments = plates.length - 1;
    const seg = p >= 1 ? segments - 0.0001 : p * segments;
    const from = Math.min(Math.floor(seg), segments - 1);
    const blend = smooth01(0.42, 1, seg - from);

    const a = plates[from];
    const b = plates[from + 1];

    for (let i = 0; i < HALFTONE_TOTAL; i += 1) {
      const plate = blend > wipe[i] ? b : a;
      const dotRadius = plate.radius[i] * clamp01((reveal - dissolve[i]) / 0.28);
      if (dotRadius < 0.12) continue;

      ctx.fillStyle = plate.colors[i];
      ctx.beginPath();
      ctx.arc(cellX[i], cellY[i], dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    const active = blend > 0.5 ? from + 1 : from;
    if (active !== currentPlate) {
      currentPlate = active;
      if (countEl) {
        countEl.textContent = `${String(active + 1).padStart(2, "0")} / ${String(plates.length).padStart(2, "0")}`;
      }
      if (nameEl) nameEl.textContent = plates[active].name;
    }

    if (meterEl) meterEl.style.width = `${(p * 100).toFixed(1)}%`;
    if (hintEl) hintEl.style.opacity = (1 - smooth01(0.03, 0.14, p)).toFixed(3);
    if (ghostEl) ghostEl.style.transform = `translate(-50%, -50%) translateX(${((0.5 - p) * 8).toFixed(2)}%)`;
  }

  Promise.all(plates.map(loadPlate)).then(() => {
    ready = plates.every((plate) => plate.data);
    if (!ready) return;
    // Reduced motion keeps the plate fully printed and drops the pin in CSS.
    if (reduceMotion.matches) draw(0, 1);
    else draw(0);
  });

  function step() {
    if (!ready) return;
    const span = scene.offsetHeight - window.innerHeight;
    const p = span > 0 ? clamp01(-scene.getBoundingClientRect().top / span) : 0;
    if (lastProgress !== -1 && Math.abs(p - lastProgress) < 0.0008) return;
    lastProgress = p;
    draw(p);
  }

  return { step };
}

const expertise = setupExpertise();

// ---------- Boot ----------

if (!reduceMotion.matches) {
  initReveals();

  const lenis = new Lenis({ smoothWheel: true });

  // ---------- About scroll governor ----------
  // The pinned specimen is a three-shot story. A hard flick can cross the
  // whole section in a handful of frames, so downward wheel input inside the
  // pin is collected and released at a fixed speed. The animation gets its
  // full run and the page still reaches the end of the section.
  const ABOUT_PLAY_SECONDS = 3.8;
  const GOVERNOR_LINE_HEIGHT = 100 / 6;
  const governor = { active: false, position: 0, target: 0 };
  let programmaticScroll = false;
  let savedScrollBehavior = "";

  function aboutBounds() {
    if (!aboutSection || !aboutPin) return null;
    const start = aboutSection.offsetTop;
    const end = start + Math.max(1, aboutSection.offsetHeight - aboutPin.offsetHeight);
    return { start, end };
  }

  function syncScroll(position) {
    // immediate also resets Lenis's own target, so it cannot keep adding
    // speed behind the governor.
    lenis.scrollTo(position, { immediate: true });
  }

  function startGovernor(target) {
    const bounds = aboutBounds();
    if (!bounds) return;

    if (!governor.active) {
      // The page normally uses CSS smooth scrolling for anchors. While the
      // governor writes a new position each frame that would restart the
      // smooth animation every tick, so pin the scroller to instant.
      savedScrollBehavior = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = "auto";
    }

    governor.active = true;
    governor.position = window.scrollY;
    governor.target = clamp(target, governor.position, bounds.end);
    syncScroll(governor.position);
  }

  function stopGovernor() {
    if (!governor.active) return;
    governor.active = false;
    document.documentElement.style.scrollBehavior = savedScrollBehavior;
    savedScrollBehavior = "";
  }

  function stepGovernor(dt) {
    if (!governor.active) return;

    const bounds = aboutBounds();
    if (!bounds) return stopGovernor();

    if (window.scrollY < bounds.start - window.innerHeight * 2 || window.scrollY > bounds.end + 4) {
      return stopGovernor();
    }

    // A scrollbar or keyboard jump is explicit; hand control back rather than
    // pulling the page toward a stale wheel target.
    if (Math.abs(window.scrollY - governor.position) > 2) return stopGovernor();

    const remaining = governor.target - governor.position;
    if (remaining > 0.5) {
      const storySpeed = (bounds.end - bounds.start) / ABOUT_PLAY_SECONDS;
      // Approach the pin at normal flick speed, then drop to the story pace
      // once the scene is locked. Otherwise the hero crawl feels sluggish.
      const speed = governor.position < bounds.start ? 2800 : storySpeed;
      governor.position = Math.min(governor.target, governor.position + speed * dt);
      syncScroll(governor.position);
    }

    if (governor.position >= bounds.end - 0.5) stopGovernor();
  }

  // A flick can start above the section and already be travelling when the
  // pin locks. Catch that in-flight target, park it on the section, and play
  // the scene instead of letting Lenis carry the jump straight past it.
  function takeOverFlick() {
    if (governor.active || programmaticScroll) return;

    const bounds = aboutBounds();
    if (!bounds) return;

    const y = lenis.scroll;
    if (y < bounds.start - window.innerHeight * 0.75 || y >= bounds.end - 1) return;

    const target = lenis.targetScroll;
    if (target - y < 320) return;

    startGovernor(target);
  }

  window.addEventListener(
    "wheel",
    (event) => {
      if (event.ctrlKey) return;

      // Panels such as the edit drawer opt out of page scrolling.
      const path = event.composedPath();
      if (
        path.some(
          (node) =>
            node instanceof HTMLElement &&
            (node.hasAttribute("data-lenis-prevent") ||
              node.hasAttribute("data-lenis-prevent-wheel"))
        )
      ) {
        return;
      }

      programmaticScroll = false;

      const bounds = aboutBounds();
      if (!bounds) return;

      let delta = event.deltaY;
      if (event.deltaMode === 1) delta *= GOVERNOR_LINE_HEIGHT;
      else if (event.deltaMode === 2) delta *= window.innerHeight;
      if (!delta) return;

      // Upward input always hands control back so the section cannot trap.
      if (delta < 0) {
        stopGovernor();
        return;
      }

      // Let normal hero scrolling stay with Lenis. Take over only when this
      // input (plus anything already queued) is about to reach the pin.
      const nextTarget = Math.max(lenis.targetScroll, window.scrollY) + delta;
      if (window.scrollY < bounds.start - 4 && nextTarget < bounds.start) return;
      if (window.scrollY >= bounds.end - 1) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      if (!governor.active) startGovernor(nextTarget);
      else governor.target = Math.min(bounds.end, governor.target + delta);
    },
    { passive: false, capture: true }
  );

  let lastTime = 0;

  function frame(time) {
    const rawDt = (time - lastTime) / 1000 || 0;
    const dt = Math.min(rawDt, 1 / 30);
    lastTime = time;

    lenis.raf(time);
    takeOverFlick();
    stepGovernor(Math.min(rawDt, 0.1));
    paintIfMoved();
    stepReveals(dt);
    if (expertise) expertise.step();

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
  paintLayers();

  // Route in-page anchors through Lenis so the smoothed wheel and native
  // smooth scrolling never fight over the scroll position.
  document.addEventListener(
    "click",
    (event) => {
      const link = event.target.closest('a[href^="#"]');
      if (!link) return;

      const hash = link.getAttribute("href");
      if (!hash || hash === "#") return;

      const target = document.querySelector(hash);
      if (!target) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      stopGovernor();
      // About is a full-bleed pinned scene, so it lands flush with the viewport.
      const offset = target.id === "about" ? 0 : -72;
      programmaticScroll = true;
      lenis.scrollTo(target, {
        offset,
        duration: 1.1,
        onComplete: () => {
          programmaticScroll = false;
        },
      });
    },
    true
  );

  window.addEventListener("resize", paintLayers, { passive: true });
}
