import Lenis from "lenis";

// ---------- Scroll motion: one ticker, layered parallax ----------
// Lenis drives the scroll; every layer is sampled after lenis.raf in the
// same frame, so parallax always reads the current frame's scroll position.

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const wash = document.querySelector(".page-bg-pan-left");
const grid = document.querySelector(".page-bg-grid");
const gecko = document.querySelector(".hero-gecko");
const hero = document.querySelector(".hero");

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

let lastY = -1;

function paintLayers() {
  const y = window.scrollY;
  const vh = window.innerHeight;

  // Layer 1 — background wash drifts down slowly, capped before its edges show.
  if (wash) {
    wash.style.transform = `translate3d(0, ${clamp(y * 0.04, 0, 90)}px, 0)`;
  }

  // Layer 2 — grid texture counters with a faster, repeating shift.
  if (grid) {
    grid.style.backgroundPositionY = `${y * 0.055}px`;
  }

  // Layer 3 — hero gecko trails the page while the hero scrolls away.
  if (gecko && hero) {
    const rect = hero.getBoundingClientRect();
    const progress = clamp(-rect.top / rect.height, 0, 1);
    gecko.style.transform = `translate3d(0, ${progress * vh * 0.12}px, 0)`;
  }

  lastY = y;
}

function paintIfMoved() {
  if (window.scrollY !== lastY) paintLayers();
}

if (!reduceMotion.matches) {
  const lenis = new Lenis({ smoothWheel: true });

  function frame(time) {
    lenis.raf(time);
    paintIfMoved();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Route in-page anchors through Lenis so native smooth scroll and the
  // smoothed wheel never fight over the scroll position.
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
      lenis.scrollTo(target, { offset: -72, duration: 1.1 });
    },
    true
  );

  window.addEventListener("resize", paintLayers, { passive: true });
} else {
  // Reduced motion: no smoothing, no parallax — just keep layers at rest.
  paintLayers();
}
