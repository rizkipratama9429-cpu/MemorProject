---
name: profile-polish
description: Polish and improve the Vinnyrz personal profile website. Use when the user wants to refine visuals, fix spacing, improve animations, or make the site look more premium. Covers hero section, theme toggle, nav links, and overall visual quality.
---

## Project Overview

This is Vinnyrz's personal profile website — a futuristic dark-themed portfolio built with vanilla HTML, CSS, and JavaScript.

**Files:**
- `index.html` — Main page structure
- `styles.css` — All styles, themes, animations
- `script.js` — All interactions (cursor, scroll, theme, edit panel)

**Key Features:**
- Dark/Light theme toggle (localStorage)
- Custom cursor with hover states
- Scroll progress bar
- Magnetic buttons
- Edit panel for content (localStorage)
- Smooth scroll reveals with blur animations
- Panning background animation (bg-pan-left/right)
- Contact form with Formspree

## Design System

- **Colors:** Dark bg `#0A0A0F`, accent cyan `#00F0FF`, secondary orange `#FF6B35`
- **Fonts:** Space Grotesk (display), Inter (body), JetBrains Mono (labels)
- **Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` for smooth expo-out
- **Glow:** `0 0 20px rgba(0, 240, 255, 0.3)`

## Common Tasks

### Spacing Issues
- Hero title margin-bottom: `4rem` (adjust if subtitle feels cramped)
- Section padding: `8rem 3rem`
- Grid gaps: `4rem` for hero, `6rem` for about

### Animation Tuning
- Hero blur-out triggers at About section approach
- Nav links: slide-in-left on load, jello-horizontal on hover
- Background: bg-pan-left 8s ease-in-out infinite alternate

### Making It More Premium
- Add subtle micro-interactions (magnetic buttons, cursor effects)
- Use blur + fade for scroll reveals
- Add glow shadows on hover
- Keep animations slow and smooth (0.4-0.8s)
- Use staggered delays for list items

### Anti-Slop Rules
- No generic gradients (purple/blue)
- No glassmorphism overload
- No bouncing emojis
- No generic card grids
- Every section should feel designed, not templated

## Guidelines

1. **Always test responsive** — check mobile breakpoints at 768px and 1024px
2. **Preserve the edit panel** — don't break localStorage functionality
3. **Theme toggle must work** — test both dark and light modes
4. **Commit and push** — after changes, commit with descriptive message and push to GitHub
