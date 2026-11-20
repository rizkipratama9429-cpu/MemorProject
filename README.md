# Vinnyrz — Personal Profile

A pastel-blue editorial portfolio built with vanilla HTML, CSS, and JavaScript. No build step, no framework, no server code.

## Features

- 60/30/10 pastel-blue palette with ink-led contrast
- Archivo display/body, Instrument Serif italic emphasis, JetBrains Mono labels
- Scroll progress bar
- Magnetic buttons
- Hero gecko cut-out mirrored toward the type axis
- Pinned About scene with a real-time 3D depth specimen
- Expertise halftone plate that resolves photographs as you scroll
- Editable content (localStorage)
- Footer with editable contact details and local time
- Contact form
- Fully responsive
- SEO optimized

## Design System

| Role | Token | Value |
| --- | --- | --- |
| Paper (60%) | `--bg` | `#edf2fa` |
| Support (30%) | `--bg-alt` / `--bg-card` | `#d7e3fc` / `#ccdbfd` tint |
| Accent (10%) | `--accent` | `#abc4ff` |
| Hairlines | `--accent-soft` | `#c1d3fe` |
| Ink | `--ink` | `#101a2e` |

The hero specimen is the flat cut-out `gecko-transparent.png`, set in a shell
with a soft radial wash and a right-edge mask. It is mirrored in CSS (`scale:
-1 1`), not in the source image, so the dark head turns into the type while the
photographed flank keeps its shading. The shell sits at `63%` with a right-edge
mask that lets the tail dissolve. Under `768px` the mirror is dropped and the
gecko centers with its head to the open right edge. There is no hero canvas.

The About scene loads `assets/meshy-model.glb` in `about3d.js` and shades it
with an unlit depth ramp: near surfaces bone (`#a3b7ca`), mid surfaces
`#476f95`, far surfaces ink (`#194a7a`), plus a soft camera-space form term and
a thin grazing rim. No lights or environment maps are used, so the model keeps
the flat, printed look of the page. The depth range is measured each frame from
the specimen's bounding box projected into camera space, so the ramp stays
legible through every camera key. The scan is decimated to roughly 105k
triangles and 1.8 MB, with its textures and UVs stripped because the depth
shader replaces them. It starts loading only when About is within a viewport
and a half, and the HUD meter reports progress until the first frame is ready.

The About scene is the one dark plate (`#0b1322`) so the blue specimen keeps
its contrast. It re-declares the color tokens inside `.about-scene`; don't
change the global ink to fix About copy.

The specimen HUD, glow and sparks use the five-stop cool ramp (`#d1dbe4` →
`#a3b7ca` → `#7593af` → `#476f95` → `#194a7a`) read from `--color-1…5` in
`about3d.js`. The model shader only consumes the bone, mid and ink stops; keep
new specimen colors inside that family.

The model carries a fixed base yaw of `0.79` rad so the first beat reads a long
flank instead of a foreshortened chest. Change the base yaw instead of the
camera keys when the silhouette stops reading; the keys and the safe-area guard
are tuned around it. On narrow viewports the specimen stays centered above the
copy and the yaw holds.

The copy layer is camera-linked: `about3d.js` projects sampled specimen
vertices, drifts `.about-overlay` on `--copy-x` / `--copy-y`, and caps a
screen-space safe-area push so the text always clears the specimen. The three
beats alternate zones — About left, Practice right, Field Notes center-right —
and the safe-area guard flips sides with the copy. Don't pin the copy back to a
fixed `translate` or remove the safe-area test when changing camera keys.

Type: `Archivo` 800/900 for display, `Instrument Serif` italic for emphasis,
`JetBrains Mono` for labels and micro-copy.

The Expertise plate (`.expertise-scene`) pins for 460vh. It enters with an
animate.css `fadeInUp` — the card rises one card height and fades in the first
time the plate is half on screen. Each photograph is sampled to a 100 × 100 grid
in `motion.js` and drawn as one ink dot per sample: scroll grows the dots from
the centre, a shutter flash catches the moment the plate resolves, and a
grain-dithered wipe with a zoom punch and ink fade hands one image to the next.
Each plate holds for roughly half a viewport before the hand-off, so a fast
flick still reads one image at a time. The dot colours come from the photo
itself, so the plate stays inside the pastel system. Under reduced motion the
pin and the entrance are dropped and the first plate is printed at full
strength.

## Deployment

### nginx (static VM)

Serve the folder directly; there is no build step.

```nginx
server {
    listen 80;
    server_name web.domainvinnyrz.my.id;
    root /var/www/vinnyrz;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

Then issue TLS with certbot:

```sh
sudo certbot --nginx -d web.domainvinnyrz.my.id
```

Do not add a `/index.html` fallback to `try_files`; it causes a rewrite cycle.

### Vercel

1. Push this folder to GitHub
2. Go to [vercel.com](https://vercel.com) → Import Project
3. Select your repo → Deploy

### Netlify

1. Go to [netlify.com](https://netlify.com) → Add new site → Deploy manually
2. Drag and drop this folder

## Connecting the Contact Form

1. Go to [formspree.io](https://formspree.io) → Create a new form
2. Copy your form endpoint (e.g., `https://formspree.io/f/abcdwxyz`)
3. Open `index.html` and find the `<form>` tag
4. Add `action="https://formspree.io/f/YOUR_ID"` and `method="POST"`

## Adding Analytics

### Plausible (Privacy-friendly)

1. Go to [plausible.io](https://plausible.io) → Add a new site
2. Copy the data-domain value
3. Add this before `</head>` in `index.html`:

```html
<script defer data-domain="vinnyrz.com" src="https://plausible.io/js/script.js"></script>
```

### Google Analytics

1. Go to [analytics.google.com](https://analytics.google.com) → Create a property
2. Copy your Measurement ID (G-XXXXXXXXXX)
3. Add the GA script before `</head>` in `index.html`

## Replacing Project Thumbnails

1. Add project screenshots to the project folder
2. In `index.html`, find each `.thumb-placeholder`
3. Replace with:

```html
<img src="fieldnotes.jpg" alt="Fieldnotes" style="width: 120px; height: 80px; object-fit: cover; border: 1px solid #101a2e;">
```

## File Structure

```
├── index.html          # Main page
├── styles.css          # All styles
├── script.js           # Edit panel, nav, form
├── motion.js           # Lenis, reveals, About governor, expertise halftone
├── about3d.js          # Three.js depth specimen (About)
├── assets/             # Model and texture assets
├── vercel.json         # Vercel deployment config
├── netlify.toml        # Netlify deployment config
├── robots.txt          # SEO robots file
├── sitemap.xml         # SEO sitemap
└── README.md           # This file
```

## Tech Stack

- **HTML5** — Semantic markup
- **CSS3** — Custom properties, Grid, Flexbox, animations
- **Vanilla JS** — Edit panel and interactions
- **Lenis / Three.js** — Smooth scroll and the About 3D specimen, loaded as ES modules
- **Fonts** — Archivo, Instrument Serif, JetBrains Mono (Google Fonts)

## License

MIT
