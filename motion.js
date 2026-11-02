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

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

class Spring {
  constructor(value, tension, friction) {
    this.value = value;
    this.velocity = 0;
    this.target = value;
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
  "#about .section-label",
  "#about .about-lead",
  "#about .about-text > p:not(.about-lead)",
  "#about .fact",
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

const reveals = [];
const revealCounts = new Map();

function initReveals() {
  document.querySelectorAll(REVEAL_SELECTOR).forEach((el) => {
    const group = el.closest("section, footer") || document.body;
    const index = revealCounts.get(group) || 0;
    revealCounts.set(group, index + 1);

    const record = {
      el,
      y: new Spring(38, 200, 26),
      opacity: new Spring(0, 200, 26),
      delay: index * 90,
      active: false,
      started: false,
    };

    el.style.opacity = "0";
    el.style.transform = "translate3d(0, 38px, 0)";
    el.style.willChange = "transform, opacity";
    el.__reveal = record;
    reveals.push(record);
  });

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const record = entry.target.__reveal;
        if (!record || record.started || !entry.isIntersecting) return;
        record.started = true;
        record.active = true;
        revealObserver.unobserve(entry.target);
      });
    },
    { threshold: 0, rootMargin: "0px 0px -10% 0px" }
  );

  reveals.forEach((record) => revealObserver.observe(record.el));
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

// ---------- Boot ----------

if (!reduceMotion.matches) {
  initReveals();

  const lenis = new Lenis({ smoothWheel: true });

  let lastTime = 0;

  function frame(time) {
    const dt = Math.min((time - lastTime) / 1000 || 0, 1 / 30);
    lastTime = time;

    lenis.raf(time);
    paintIfMoved();
    stepReveals(dt);

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
      lenis.scrollTo(target, { offset: -72, duration: 1.1 });
    },
    true
  );

  window.addEventListener("resize", paintLayers, { passive: true });
}
