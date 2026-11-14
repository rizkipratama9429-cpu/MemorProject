---
name: profile-polish
description: Polish and improve the Vinnyrz personal profile website. Use when the user wants to refine visuals, fix spacing, improve animations, or make the site look more premium. Covers the pastel-blue editorial system, hero section, About 3D scene, nav links, and overall visual quality.
---

## Project Overview

This is Vinnyrz's personal profile website — a pastel-blue editorial portfolio built with vanilla HTML, CSS, and JavaScript.

**Files:**
- `index.html` — Main page structure
- `styles.css` — All styles, animations
- `script.js` — Edit panel, nav, contact form
- `motion.js` — Lenis smooth scroll, reveals, About scroll governor, expertise halftone plate
- `about3d.js` — Three.js depth specimen (About)

**Key Features:**
- 60/30/10 pastel-blue palette with ink-led contrast
- Scroll progress bar
- Magnetic buttons
- Hero gecko as a mirrored cut-out (`gecko-transparent.png`)
- About gecko as a live depth-map specimen (`assets/meshy-model.glb`)
- Edit panel for content (localStorage)
- Pinned About scene (360vh desktop / 310vh mobile) with three camera beats
- Expertise halftone plate (460vh) that fades up on entry and resolves photos on scroll
- Scroll reveals
- Panning background animation (bg-pan-left/right)
- Contact form with Formspree

## Design System

- **Palette (60/30/10):** paper `#edf2fa` · support `#d7e3fc` / card `#ccdbfd` · accent `#abc4ff` · hairlines `#c1d3fe`
- **Ink:** `#101a2e` for all readable text; `#4c5a76` for secondary copy
- **About plate:** `#0b1322` is the only dark section — it scopes its own light-ink tokens
- **Specimen palette:** `#d1dbe4` → `#a3b7ca` → `#7593af` → `#476f95` → `#194a7a`; HUD, glow and sparks use all five, the model shader uses bone/mid/ink
- **About specimen:** unlit depth ramp `#a3b7ca` → `#476f95` → `#194a7a` (`bone` → `mid` → `ink`), no lights or environment. Depth range is measured per frame from the bounding box projected into camera space
- **Hero composition:** both title lines flush left; the flat cut-out is mirrored in CSS at `63%` top-right, head facing the type. Do not mirror the source image — the CSS flip keeps the photographed flank intact. Below `768px` the mirror is dropped and the gecko centers with the head right
- **Fonts:** Archivo (display/body, 800–900 for headlines), Instrument Serif italic (emphasis), JetBrains Mono (labels)
- **Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` for smooth expo-out
- **Shadows:** hard offset print shadows (`8px 8px 0 var(--accent)`), not soft glows
- **Radius:** square corners everywhere; no pill cards or glassmorphism

## Common Tasks

### Spacing Issues
- Hero title margin-top: `clamp(1.75rem, 4.5vh, 3.5rem)`
- Section padding: `8rem 3rem`
- Grid gaps: `2rem` for card grids, `6rem` for About

### Animation Tuning
- Hero blur-out triggers at About section approach
- The About specimen drifts with a slow sway plus pointer parallax; reduced
  motion renders one static frame and stops
- The About GLB starts loading with the module; the HUD meter reports progress
  until `#specimenStage` gets `is-ready`
- About base yaw is `0.79` rad so the establishing beat reads a long flank;
  tune the yaw before touching camera keys or the safe-area guard
- Nav links: slide-in-left on load, accent underline on hover
- Background: bg-pan-left 8s ease-in-out infinite alternate
- About playhead is capped at `0.28` timeline fraction per second with easing `7`
- Wheel governor releases over `3.8s`; fast scrolling must not skip beats
- About copy follows the camera via `--copy-x` / `--copy-y`; keep the projected
  specimen safe-area test intact when editing camera keys or copy width
- Beat zones: About left, Practice right (specimen mirrors upper-left), Field
  Notes center-right around `56%`; the safe-area guard flips with the copy side

### Making It More Premium
- Add subtle micro-interactions (magnetic buttons, reveal timing)
- Use blur + fade for scroll reveals
- Use hard offset accent shadows instead of cyan glow
- Keep animations slow and smooth (0.4–0.8s)
- Use staggered delays for list items

### Anti-Slop Rules
- No generic gradients (purple/blue)
- No glassmorphism overload
- No bouncing emojis
- No generic card grids
- Every section should feel designed, not templated
- Don't reintroduce cyan, orange, or dark-theme tokens

## Guidelines

1. **Always test responsive** — check breakpoints at 1440×900, 1024×768, 390×844
2. **Preserve the edit panel** — don't break localStorage functionality
3. **Keep the About plate dark** — the blue specimen needs contrast; use scoped overrides
4. **Commit and push** — after changes, commit with a descriptive message and push to GitHub
