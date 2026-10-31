# Vinnyrz — Personal Profile

A modern, futuristic personal profile website built with vanilla HTML, CSS, and JavaScript.

## Features

- Single dark theme, no toggle
- Custom cursor with hover effects
- Scroll progress bar
- Magnetic buttons
- Editable content (localStorage)
- Footer with editable contact details and local time
- Contact form
- Fully responsive
- SEO optimized

## Deployment

### Vercel (Recommended)
1. Push this folder to GitHub
2. Go to [vercel.com](https://vercel.com) → Import Project
3. Select your repo → Deploy

### Netlify
1. Go to [netlify.com](https://netlify.com) → Add new site → Deploy manually
2. Drag and drop this folder

### Custom Domain
1. Buy a domain (Namecheap, Cloudflare, etc.)
2. In Vercel/Netlify: Project Settings → Domains → Add your domain
3. Update DNS records as instructed

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
<img src="meridian.jpg" alt="Meridian" style="width: 120px; height: 80px; object-fit: cover; border-radius: 8px;">
```

## File Structure

```
├── index.html          # Main page
├── styles.css          # All styles
├── script.js           # All interactions
├── vercel.json         # Vercel deployment config
├── netlify.toml        # Netlify deployment config
├── robots.txt          # SEO robots file
├── sitemap.xml         # SEO sitemap
└── README.md           # This file
```

## Tech Stack

- **HTML5** — Semantic markup
- **CSS3** — Custom properties, Grid, Flexbox, animations
- **Vanilla JS** — No frameworks, no dependencies
- **Fonts** — Space Grotesk, Inter, JetBrains Mono (Google Fonts)

## License

MIT
