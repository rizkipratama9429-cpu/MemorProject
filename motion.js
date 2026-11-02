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
  "#about .section-label",
  "#about .about-lead",
  "#about .about-text > p:not(.about-lead)",
  "#about .fact",
  "#about .about-specimen",
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
