# Vinnyrz — Personal Profile

A pastel-blue editorial portfolio built with vanilla HTML, CSS, and JavaScript. No build step, no framework, no server code.

## Features

- 60/30/10 pastel-blue palette with ink-led contrast
- Archivo display/body, Instrument Serif italic emphasis, JetBrains Mono labels
- Custom cursor with hover states
- Scroll progress bar
- Magnetic buttons
- Pinned About scene with a real-time 3D gecko specimen
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

The About scene is the one dark plate (`#0b1322`) so the bronze specimen keeps
its contrast. It re-declares the color tokens inside `.about-scene`; don't
change the global ink to fix About copy.

The copy layer is camera-linked: `about3d.js` projects sampled specimen
vertices, drifts `.about-overlay` on `--copy-x` / `--copy-y`, and caps a
screen-space safe-area push so the text always clears the bronze. The three
beats alternate zones — About left, Practice right, Field Notes center-right —
and the safe-area guard flips sides with the copy. Don't pin the copy back to a
fixed `translate` or remove the safe-area test when changing camera keys.

Type: `Archivo` 800/900 for display, `Instrument Serif` italic for emphasis,
`JetBrains Mono` for labels and micro-copy.

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
├── script.js           # Edit panel, cursor, nav, form
├── motion.js           # Lenis, reveals, About scroll governor
├── about3d.js          # Three.js gecko specimen
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
- **Lenis / Three.js** — Smooth scroll and the 3D specimen, loaded as ES modules
- **Fonts** — Archivo, Instrument Serif, JetBrains Mono (Google Fonts)

## License

MIT
