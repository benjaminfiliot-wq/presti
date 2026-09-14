import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const OUT = path.resolve('public/sites-demo/serrurier');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const METIER = 'serrurier';
const NOM = 'Démo Serrurier Montpellier';
const VILLE = 'Montpellier';
const CP = '34000';
const ADRESSE = '1 rue de la Démonstration';
const TEL = '+33 4 00 00 00 00';
const EMAIL = 'contact@serrurier.demo.invalid';
const HORAIRES = 'Lundi–vendredi 8 h–18 h';
const SIREN = '000000000';
const DECENNALE_ASSUREUR = 'Assureur fictif';
const DECENNALE_NUMERO = 'DEMO-0001';
const URL_BASE = 'https://serrurier.demo.invalid';

const COMMUNES = [
  'Montpellier',
  'Castelnau-le-Lez',
  'Lattes',
  'Pérols'
];

// 1. Site JSON
const PAGES = [
  { chemin: '/', type: 'accueil' },
  { chemin: '/serrurier-montpellier/', type: 'commune', cible: 'Montpellier' },
  { chemin: '/serrurier-castelnau-le-lez/', type: 'commune', cible: 'Castelnau-le-Lez' },
  { chemin: '/serrurier-lattes/', type: 'commune', cible: 'Lattes' },
  { chemin: '/serrurier-perols/', type: 'commune', cible: 'Pérols' },
  { chemin: '/mentions-legales/', type: 'legal' },
  { chemin: '/confidentialite/', type: 'legal' }
];

const siteJson = {
  metier: METIER,
  nom: NOM,
  telephone: TEL,
  siren: SIREN,
  decennale: {
    assureur: DECENNALE_ASSUREUR,
    numero: DECENNALE_NUMERO
  },
  communes: COMMUNES,
  metiers_secondaires: [],
  demo: true,
  pages: PAGES
};

fs.writeFileSync(path.join(OUT, 'site.json'), JSON.stringify(siteJson, null, 2), 'utf8');

// 2. Robots.txt
fs.writeFileSync(path.join(OUT, 'robots.txt'), 'User-agent: *\nAllow: /\nSitemap: ' + URL_BASE + '/sitemap.xml\n', 'utf8');

// 3. Sitemap.xml
const sitemapUrls = PAGES.filter(p => p.type !== 'legal').map(p => {
  return '  <url>\n    <loc>' + URL_BASE + p.chemin + '</loc>\n    <lastmod>2026-09-14</lastmod>\n  </url>';
}).join('\n');

const sitemapXml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + sitemapUrls + '\n</urlset>\n';
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), sitemapXml, 'utf8');

// 4. Images & Attributions
const IMAGE_CONFIGS = [
  { prefix: 'hero', srcFile: 'hero-1600w.webp', auteur: 'MatthewG', source: 'https://commons.wikimedia.org/wiki/File:Locksmith_at_work.jpg', licence: 'CC BY-SA 4.0', legende: "Installation d'une serrure haute sécurité" },
  { prefix: 'serrure1', srcFile: 'serrure1-1600w.webp', auteur: 'Alno', source: 'https://commons.wikimedia.org/wiki/File:Door_lock.jpg', licence: 'CC BY-SA 3.0', legende: 'Mécanisme de serrure multipoints' },
  { prefix: 'cylindre', srcFile: 'cylindre-1600w.webp', auteur: 'Santeri Viinamäki', source: 'https://commons.wikimedia.org/wiki/File:Cylinder_lock.jpg', licence: 'CC BY-SA 4.0', legende: 'Cylindre de porte européen' },
  { prefix: 'cylindre2', srcFile: 'cylindre2-1600w.webp', auteur: 'Roby', source: 'https://commons.wikimedia.org/wiki/File:Door_lock_cylinder.jpg', licence: 'CC BY-SA 3.0', legende: 'Changement de cylindre' },
  { prefix: 'cles', srcFile: 'cles-1600w.webp', auteur: 'Pxhere', source: 'https://commons.wikimedia.org/wiki/File:Keys_and_locks.jpg', licence: 'CC0', legende: 'Clés sécurisées' },
  { prefix: 'cle_serrure', srcFile: 'cle_serrure-1600w.webp', auteur: 'Nenad Stojkovic', source: 'https://commons.wikimedia.org/wiki/File:Key_in_door_lock.jpg', licence: 'CC BY 2.0', legende: 'Ouverture de porte bloquée' }
];

const imgDir = path.join(OUT, 'images');
if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });

export async function genererImagesEtAttributions() {
  const attributionsList = [];
  const sourcesInMemory = {};

  for (const img of IMAGE_CONFIGS) {
    const srcPath = path.join(imgDir, img.srcFile);
    if (!fs.existsSync(srcPath)) {
      // Si déjà renommé, tenter de lire le 1600
      const altSrc = path.join(imgDir, `${img.prefix}-1600.webp`);
      if (fs.existsSync(altSrc)) {
        sourcesInMemory[img.prefix] = fs.readFileSync(altSrc);
      } else {
        throw new Error(`Source image manquante : ${srcPath}`);
      }
    } else {
      sourcesInMemory[img.prefix] = fs.readFileSync(srcPath);
    }
  }

  for (const img of IMAGE_CONFIGS) {
    const buf = sourcesInMemory[img.prefix];

    for (const w of [480, 960, 1600]) {
      const targetWebp = path.join(imgDir, `${img.prefix}-${w}.webp`);
      const targetAvif = path.join(imgDir, `${img.prefix}-${w}.avif`);

      const qWebp = (w === 1600 && img.prefix === 'cles') ? 68 : 80;
      const qAvif = (w === 1600 && img.prefix === 'cles') ? 48 : 60;

      await sharp(buf).resize(w).webp({ quality: qWebp }).toFile(targetWebp);
      await sharp(buf).resize(w).avif({ quality: qAvif }).toFile(targetAvif);

      attributionsList.push({
        fichier: `images/${img.prefix}-${w}.webp`,
        auteur: img.auteur,
        source: img.source,
        licence: img.licence,
        legende: img.legende
      });
      attributionsList.push({
        fichier: `images/${img.prefix}-${w}.avif`,
        auteur: img.auteur,
        source: img.source,
        licence: img.licence,
        legende: img.legende
      });
    }
  }

  // Nettoyage de tous les fichiers qui ne sont pas dans attributionsList
  for (const f of fs.readdirSync(imgDir)) {
    if (!attributionsList.some(a => a.fichier === `images/${f}`)) {
      try {
        fs.unlinkSync(path.join(imgDir, f));
      } catch {}
    }
  }

  fs.writeFileSync(path.join(OUT, 'attributions.json'), JSON.stringify(attributionsList, null, 2), 'utf8');
}

// 5. CSS (Styles) — Identité serrurier, DA Syne / Manrope, #35506B, angles 2px, 100% utilisé
const cssContent = `/* Styles Serrurier — Direction Artistique & Identité Métier */
@font-face {
  font-family: 'Syne';
  src: url('/fonts/Syne.woff2') format('woff2');
  font-display: swap;
  font-weight: 700;
}
@font-face {
  font-family: 'Manrope';
  src: url('/fonts/Manrope.woff2') format('woff2');
  font-display: swap;
  font-weight: 400 600;
}

:root {
  --accent: #35506B;
  --accent-hover: #263B50;
  --bg: #F5F7F9;
  --bg-card: #FFFFFF;
  --bg-dark: #0F1A26;
  --text: #0F1A26;
  --text-muted: #4A5B6D;
  --border: #0F1A26;
  --border-accent: #35506B;
  --border-light: rgba(15, 26, 38, 0.12);
  --white: #FFFFFF;
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  background-color: var(--bg);
  color: var(--text);
  font-family: 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 18px;
  line-height: 1.55;
  scroll-behavior: smooth;
  -webkit-text-size-adjust: 100%;
}

body {
  margin: 0;
  padding: 0;
  min-height: 100vh;
  position: relative;
  background-color: var(--bg);
}

/* Typographie */
h1, h2, h3, h4, .font-display {
  font-family: 'Syne', sans-serif;
  font-weight: 700;
  line-height: 1.15;
}

h1 {
  font-size: 34px;
  margin-bottom: 20px;
}

h2 {
  font-size: 28px;
  margin-bottom: 24px;
  border-bottom: 2px solid var(--accent);
  display: inline-block;
  padding-bottom: 6px;
}

h3 {
  font-size: 22px;
  margin-bottom: 12px;
}

p {
  margin-bottom: 16px;
}

p:last-child {
  margin-bottom: 0;
}

a {
  color: var(--accent);
  text-decoration: underline;
  text-underline-offset: 3px;
  transition: color 0.2s ease;
}

a:hover {
  color: var(--accent-hover);
}

/* Boutons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 14px 28px;
  font-family: 'Syne', sans-serif;
  font-weight: 700;
  font-size: 18px;
  letter-spacing: 0.02em;
  text-decoration: none;
  border-radius: 2px;
  border: 2px solid var(--accent);
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.btn-primary {
  background-color: var(--accent);
  color: var(--white);
}

.btn-primary:hover {
  background-color: var(--accent-hover);
  border-color: var(--accent-hover);
  color: var(--white);
}

.btn-outline {
  background-color: transparent;
  color: var(--white);
  border-color: var(--white);
}

.btn-outline:hover {
  background-color: var(--white);
  color: var(--text);
}

/* Structure & Layout */
.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
}

.section {
  padding: 64px 0;
}

.section-alt {
  background-color: var(--bg-card);
  border-top: 2px solid var(--border-light);
  border-bottom: 2px solid var(--border-light);
}

/* En-tête */
.header {
  background-color: var(--white);
  border-bottom: 2px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 1000;
}

.header-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
}

.logo a {
  color: var(--text);
  text-decoration: none;
  font-size: 22px;
}

.nav-desktop {
  display: flex;
  align-items: center;
  gap: 24px;
}

.nav-phone {
  font-weight: 700;
  font-size: 18px;
  color: var(--text);
  text-decoration: none;
}

.nav-phone:hover {
  color: var(--accent);
}

.mobile-menu-btn {
  display: none;
  background: transparent;
  border: 2px solid var(--border);
  padding: 8px 12px;
  font-size: 20px;
  cursor: pointer;
  color: var(--text);
  border-radius: 2px;
}

.mobile-nav-panel {
  display: none;
  padding: 20px 0;
  border-top: 1px solid var(--border-light);
}

.mobile-nav-panel.open {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Hero Section */
.hero {
  position: relative;
  background-color: var(--bg-dark);
  color: var(--white);
  padding: 96px 0;
  overflow: hidden;
  border-bottom: 2px solid var(--border);
}

.hero-bg-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.hero-bg-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 1;
  display: block;
}

.hero-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(15, 26, 38, 0.90) 0%, rgba(15, 26, 38, 0.75) 100%);
  z-index: 2;
}

.hero-content {
  position: relative;
  z-index: 10;
  max-width: 860px;
}

.hero-content h1 {
  color: var(--white);
}

.hero-lead {
  font-size: 20px;
  margin-bottom: 32px;
  color: #E5E9EE;
  line-height: 1.6;
}

.hero-actions {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

/* Grilles */
.grid-2 {
  display: grid;
  grid-template-columns: 1fr;
  gap: 28px;
}

.grid-3 {
  display: grid;
  grid-template-columns: 1fr;
  gap: 28px;
}

.grid-4 {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}

/* Cartes */
.card {
  background-color: var(--white);
  border: 2px solid var(--border);
  border-radius: 2px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.card-title {
  color: var(--accent);
  font-size: 20px;
  margin-bottom: 12px;
}

.card-desc {
  color: var(--text-muted);
  font-size: 16px;
  line-height: 1.6;
}

.card-icon {
  width: 44px;
  height: 44px;
  background-color: var(--bg);
  border: 2px solid var(--accent);
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  font-weight: 700;
  color: var(--accent);
  font-family: 'Syne', sans-serif;
}

/* Réassurance */
.reassurance-bar {
  background-color: var(--white);
  border: 2px solid var(--border);
  border-radius: 2px;
  padding: 36px 32px;
}

.reassurance-item h3 {
  color: var(--accent);
  font-size: 20px;
  margin-bottom: 8px;
}

.reassurance-item p {
  color: var(--text-muted);
  font-size: 15px;
}

/* Galerie & Réalisations */
.realisation-card {
  background-color: var(--white);
  border: 2px solid var(--border);
  border-radius: 2px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.realisation-img-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 3/2;
  overflow: hidden;
  background-color: #E2E7ED;
}

.realisation-img-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.3s ease;
}

.realisation-card:hover .realisation-img-wrap img {
  transform: scale(1.03);
}

.realisation-content {
  padding: 20px;
  flex-grow: 1;
}

.realisation-content h3 {
  font-size: 18px;
  margin-bottom: 6px;
  color: var(--text);
}

.realisation-content p {
  font-size: 14px;
  color: var(--text-muted);
}

/* Étapes / Processus */
.process-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  margin-top: 32px;
}

.process-step {
  background-color: var(--white);
  border: 2px solid var(--border);
  border-radius: 2px;
  padding: 24px;
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.step-badge {
  background-color: var(--accent);
  color: var(--white);
  font-family: 'Syne', sans-serif;
  font-weight: 700;
  font-size: 20px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 2px;
}

.step-info h3 {
  font-size: 19px;
  margin-bottom: 6px;
  color: var(--text);
}

.step-info p {
  color: var(--text-muted);
  font-size: 15px;
}

/* FAQ */
.faq-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  margin-top: 32px;
}

.faq-item {
  background-color: var(--white);
  border: 2px solid var(--border);
  border-radius: 2px;
  padding: 24px;
}

.faq-item h3 {
  color: var(--accent);
  font-size: 19px;
  margin-bottom: 10px;
}

.faq-item p {
  color: var(--text-muted);
  font-size: 15px;
}

/* Communes */
.communes-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
  margin-top: 32px;
}

.commune-card {
  background-color: var(--white);
  border: 2px solid var(--border);
  border-radius: 2px;
  padding: 24px;
  text-decoration: none;
  color: var(--text);
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease;
}

.commune-card:hover {
  border-color: var(--accent);
  background-color: #EDF1F5;
  transform: translateY(-2px);
}

.commune-card h3 {
  font-size: 20px;
  margin-bottom: 4px;
  color: var(--accent);
}

.commune-card p {
  font-size: 14px;
  color: var(--text-muted);
}

.commune-arrow {
  font-size: 24px;
  color: var(--accent);
  font-weight: 700;
}

/* Contact Box */
.contact-box {
  background-color: var(--bg-dark);
  color: var(--white);
  border: 2px solid var(--border);
  border-radius: 2px;
  padding: 48px;
}

.contact-box h2 {
  color: var(--white);
  border-bottom-color: var(--accent);
}

.contact-box p {
  color: #D2D9E2;
}

.contact-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;
  margin-top: 32px;
}

.contact-info-item {
  margin-bottom: 16px;
}

.contact-info-item strong {
  display: block;
  font-family: 'Syne', sans-serif;
  color: #B5C4D4;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}

.contact-info-item a {
  color: var(--white);
  font-size: 18px;
}

/* Breadcrumb */
.breadcrumb {
  margin-bottom: 24px;
  font-size: 14px;
  color: var(--text-muted);
}

.breadcrumb a {
  color: var(--accent);
}

.breadcrumb span {
  margin: 0 8px;
}

/* Pied de page */
.footer {
  background-color: var(--white);
  border-top: 2px solid var(--border);
  padding: 64px 0 32px;
}

.footer-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 40px;
  margin-bottom: 48px;
}

.footer-col h3 {
  color: var(--accent);
  font-size: 18px;
  margin-bottom: 16px;
}

.footer-col p {
  font-size: 14px;
  color: var(--text-muted);
  line-height: 1.6;
  margin-bottom: 12px;
}

.footer-col ul {
  list-style: none;
}

.footer-col li {
  margin-bottom: 10px;
  font-size: 14px;
  color: var(--text-muted);
}

.footer-bottom {
  border-top: 1px solid var(--border-light);
  padding-top: 24px;
  text-align: center;
  font-size: 13px;
  color: var(--text-muted);
}

/* Animations et reveals */
html.no-js .reveal {
  opacity: 1 !important;
  transform: none !important;
}

html.js .reveal {
  opacity: 0;
  transform: translateY(12px);
  transition: opacity 0.4s ease-out, transform 0.4s ease-out;
}

html.js .reveal.visible {
  opacity: 1;
  transform: none;
}

@media (prefers-reduced-motion: reduce) {
  .reveal {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }
}

/* Media Queries pour le Responsive */
@media (min-width: 640px) {
  .grid-2 {
    grid-template-columns: repeat(2, 1fr);
  }
  .grid-3 {
    grid-template-columns: repeat(2, 1fr);
  }
  .communes-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 768px) {
  .header-inner {
    padding: 20px 0;
  }
  .contact-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 960px) {
  h1 {
    font-size: 52px;
  }
  h2 {
    font-size: 36px;
  }
  .grid-3 {
    grid-template-columns: repeat(3, 1fr);
  }
  .grid-4 {
    grid-template-columns: repeat(4, 1fr);
  }
  .process-list {
    grid-template-columns: repeat(2, 1fr);
  }
  .footer-grid {
    grid-template-columns: 2fr 1fr 1fr;
  }
}

@media (max-width: 767px) {
  .nav-desktop {
    display: none;
  }
  .mobile-menu-btn {
    display: block;
  }
  .hero {
    padding: 64px 0;
  }
  .contact-box {
    padding: 28px 20px;
  }
}
`;

fs.writeFileSync(path.join(OUT, 'styles.css'), cssContent, 'utf8');

// 6. JavaScript (site.js)
const jsContent = `document.documentElement.classList.remove('no-js');
document.documentElement.classList.add('js');

document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.mobile-menu-btn');
  const panel = document.querySelector('.mobile-nav-panel');
  if (toggle && panel) {
    toggle.addEventListener('click', () => {
      const open = panel.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
});
`;

fs.writeFileSync(path.join(OUT, 'site.js'), jsContent, 'utf8');

// HTML Helpers
const pictureHero = (alt) => `
<div class="hero-bg-wrapper">
  <picture>
    <source srcset="/images/hero-480.avif 480w, /images/hero-960.avif 960w, /images/hero-1600.avif 1600w" type="image/avif">
    <source srcset="/images/hero-480.webp 480w, /images/hero-960.webp 960w, /images/hero-1600.webp 1600w" type="image/webp">
    <img src="/images/hero-960.webp" alt="${alt}" width="960" height="640" fetchpriority="high">
  </picture>
</div>
`;

const pictureCard = (prefix, alt, isEager = false) => `
<picture>
  <source srcset="/images/${prefix}-480.avif 480w, /images/${prefix}-960.avif 960w, /images/${prefix}-1600.avif 1600w" type="image/avif">
  <source srcset="/images/${prefix}-480.webp 480w, /images/${prefix}-960.webp 960w, /images/${prefix}-1600.webp 1600w" type="image/webp">
  <img src="/images/${prefix}-960.webp" alt="${alt}" width="960" height="640" ${isEager ? 'fetchpriority="high"' : 'loading="lazy"'}>
</picture>
`;

const getHead = (title, desc, canonicalPath) => `<!DOCTYPE html>
<html lang="fr" class="no-js">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${desc}">
  <link rel="canonical" href="${URL_BASE}${canonicalPath}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${desc}">
  <meta property="og:image" content="${URL_BASE}/images/hero-960.webp">
  <meta name="robots" content="index, follow">
  <link rel="preload" href="/fonts/Syne.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/fonts/Manrope.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/styles.css">
  <noscript><style>.reveal { opacity: 1 !important; transform: none !important; }</style></noscript>
  <script src="/site.js" defer></script>
`;

const getHeader = () => `
  <header class="header">
    <div class="container header-inner">
      <div class="logo font-display">
        <a href="/">${NOM}</a>
      </div>
      <nav class="nav-desktop">
        <a href="tel:${TEL.replace(/\s+/g, '')}" class="nav-phone">${TEL}</a>
        <a href="#contact" class="btn btn-primary">Demander un devis</a>
      </nav>
      <button class="mobile-menu-btn" aria-label="Ouvrir le menu de navigation" aria-expanded="false">☰</button>
    </div>
    <div class="container mobile-nav-panel">
      <a href="tel:${TEL.replace(/\s+/g, '')}" class="nav-phone">${TEL}</a>
      <a href="#contact" class="btn btn-primary">Demander un devis</a>
    </div>
  </header>
`;

const getFooter = () => `
  <footer class="footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-col">
          <h3 class="font-display">${NOM}</h3>
          <p>Artisan serrurier qualifié intervenant à Montpellier et dans les communes limitrophes pour dépannages et sécurisation.</p>
          <p>${ADRESSE}<br>${CP} ${VILLE}</p>
          <p>Téléphone direct : <a href="tel:${TEL.replace(/\s+/g, '')}">${TEL}</a></p>
        </div>
        <div class="footer-col">
          <h3 class="font-display">Communes couvertes</h3>
          <ul>
            <li><a href="/serrurier-montpellier/">Serrurier à Montpellier</a></li>
            <li><a href="/serrurier-castelnau-le-lez/">Serrurier à Castelnau-le-Lez</a></li>
            <li><a href="/serrurier-lattes/">Serrurier à Lattes</a></li>
            <li><a href="/serrurier-perols/">Serrurier à Pérols</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h3 class="font-display">Informations légales</h3>
          <ul>
            <li><a href="/mentions-legales/">Mentions légales</a></li>
            <li><a href="/confidentialite/">Politique de confidentialité</a></li>
            <li>Garantie décennale ${DECENNALE_ASSUREUR} (N° ${DECENNALE_NUMERO})</li>
            <li>SIREN : ${SIREN}</li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; 2026 ${NOM}. Tous droits réservés. Site de démonstration fictif.</p>
      </div>
    </div>
  </footer>
</body>
</html>
`;

const getJsonLd = (pathUrl) => `
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Locksmith",
    "name": "${NOM}",
    "url": "${URL_BASE}${pathUrl}",
    "telephone": "${TEL}",
    "image": "${URL_BASE}/images/hero-960.webp",
    "openingHours": "Mo-Fr 08:00-18:00",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "${ADRESSE}",
      "postalCode": "${CP}",
      "addressLocality": "${VILLE}",
      "addressCountry": "FR"
    },
    "areaServed": ["Montpellier", "Castelnau-le-Lez", "Lattes", "Pérols"]
  }
  </script>
`;

// 7. Page Accueil (/)
const accueilHtml = `${getHead('Serrurier à Montpellier — Démo Serrurier Montpellier', 'Démo Serrurier Montpellier : dépannage rapide, ouverture de porte et changement de serrure à Montpellier et environs. Devis gratuit et clair.', '/')}
${getJsonLd('/')}
</head>
<body>
${getHeader()}
<main>
  <!-- Hero -->
  <section class="hero">
    ${pictureHero('Installation et réglage soigné d\'une serrure haute sécurité par un artisan')}
    <div class="hero-overlay"></div>
    <div class="container hero-content reveal">
      <h1>Serrurier à Montpellier — Démo Serrurier Montpellier</h1>
      <p class="hero-lead">Artisan serrurier à Montpellier et ses communes voisines. Dépannage rapide en cas de porte claquée, remplacement de serrure multipoints et sécurisation après effraction avec garantie décennale.</p>
      <div class="hero-actions">
        <a href="tel:${TEL.replace(/\s+/g, '')}" class="btn btn-primary">Appeler : ${TEL}</a>
        <a href="#contact" class="btn btn-outline">Demander un devis</a>
      </div>
    </div>
  </section>

  <!-- Réassurance -->
  <section class="section">
    <div class="container reveal">
      <div class="reassurance-bar">
        <div class="grid-3">
          <div class="reassurance-item">
            <h3 class="font-display">Assuré décennale</h3>
            <p>Contrat souscrit auprès de Assureur fictif (police n° DEMO-0001).</p>
          </div>
          <div class="reassurance-item">
            <h3 class="font-display">Entreprise déclarée</h3>
            <p>Artisan immatriculé au répertoire des métiers sous le SIREN 000000000.</p>
          </div>
          <div class="reassurance-item">
            <h3 class="font-display">Devis clair et gratuit</h3>
            <p>Explication technique détaillée et chiffrage transparent avant toute action.</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Prestations -->
  <section class="section section-alt">
    <div class="container reveal">
      <h2>Nos prestations de serrurerie à Montpellier</h2>
      <p>Nous réalisons l'ensemble des interventions de serrurerie résidentielle et professionnelle dans le respect des règles de l'art et des normes de sécurité.</p>
      <div class="grid-4" style="margin-top: 32px;">
        <div class="card">
          <div>
            <div class="card-icon">01</div>
            <h3 class="card-title">Ouverture de porte fine</h3>
            <p class="card-desc">Technique d'ouverture non destructive à la radio ou au crochetage pour les portes simplement claquées, sans abîmer le dormant ni la serrure.</p>
          </div>
        </div>
        <div class="card">
          <div>
            <div class="card-icon">02</div>
            <h3 class="card-title">Cylindres haute sécurité</h3>
            <p class="card-desc">Installation de barillets européens certifiés protégés contre le crochetage, le perçage et la casse, fournis avec carte de propriété et clés brevetées.</p>
          </div>
        </div>
        <div class="card">
          <div>
            <div class="card-icon">03</div>
            <h3 class="card-title">Serrures multipoints A2P</h3>
            <p class="card-desc">Pose en applique ou à larder de serrures multipoints homologuées par les assurances, offrant une résistance accrue aux tentatives d'arrachement.</p>
          </div>
        </div>
        <div class="card">
          <div>
            <div class="card-icon">04</div>
            <h3 class="card-title">Blindage & sécurisation</h3>
            <p class="card-desc">Renforcement de porte d'entrée par blindage d'acier, cornières anti-pinces et paumelles renforcées pour retarder toute tentative d'intrusion.</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Réalisations -->
  <section class="section" id="realisations">
    <div class="container reveal">
      <h2>Nos réalisations récentes</h2>
      <p>Découvrez nos derniers chantiers de pose de serrures de sécurité, remplacement de cylindres et ajustement de fermetures à Montpellier.</p>
      <div class="grid-3" style="margin-top: 32px;">
        <div class="realisation-card">
          <div class="realisation-img-wrap">
            ${pictureCard('serrure1', 'Mécanisme de serrure multipoints')}
          </div>
          <div class="realisation-content">
            <h3>Serrure multipoints à larder</h3>
            <p>Remplacement d'une serrure vétuste par un mécanisme 3 points certifié avec tringlerie dissimulée.</p>
          </div>
        </div>
        <div class="realisation-card">
          <div class="realisation-img-wrap">
            ${pictureCard('cylindre', 'Cylindre européen de porte')}
          </div>
          <div class="realisation-content">
            <h3>Cylindre européen renforcé</h3>
            <p>Pose d'un cylindre débrayable à double entrée avec pastille anti-perçage en acier trempé.</p>
          </div>
        </div>
        <div class="realisation-card">
          <div class="realisation-img-wrap">
            ${pictureCard('cylindre2', 'Changement de cylindre de serrure')}
          </div>
          <div class="realisation-content">
            <h3>Remplacement après perte de clés</h3>
            <p>Changement immédiat du barillet d'une porte palière pour sécuriser les lieux suite à un oubli de trousseau.</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Processus -->
  <section class="section section-alt">
    <div class="container reveal">
      <h2>Comment se déroule votre dépannage</h2>
      <p>Une méthode d'intervention claire, transparente et sans stress pour résoudre votre problème de serrure au plus vite.</p>
      <div class="process-list">
        <div class="process-step">
          <div class="step-badge">1</div>
          <div class="step-info">
            <h3>Échange et pré-diagnostic</h3>
            <p>Vous nous expliquez la situation : porte claquée ou verrouillée, modèle de clé et marque pour préparer les outils nécessaires.</p>
          </div>
        </div>
        <div class="process-step">
          <div class="step-badge">2</div>
          <div class="step-info">
            <h3>Devis clair avant toute action</h3>
            <p>Sur place, l'artisan examine la porte, vous détaille la méthode préconisée et présente un devis gratuit avant de commencer.</p>
          </div>
        </div>
        <div class="process-step">
          <div class="step-badge">3</div>
          <div class="step-info">
            <h3>Intervention technique soignée</h3>
            <p>Mise en œuvre des méthodes les moins destructives pour ouvrir la porte ou installer proprement votre nouveau mécanisme.</p>
          </div>
        </div>
        <div class="process-step">
          <div class="step-badge">4</div>
          <div class="step-info">
            <h3>Vérification et remise des clés</h3>
            <p>Test complet du bon fonctionnement du pêne et de la gâche, puis remise en main propre des nouvelles clés scellées.</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Zone d'intervention -->
  <section class="section">
    <div class="container reveal">
      <h2>Zone d'intervention autour de Montpellier</h2>
      <p>Notre atelier mobile dessert quotidiennement Montpellier ainsi que les communes périphériques pour tous travaux de serrurerie.</p>
      <div class="communes-grid">
        <a href="/serrurier-montpellier/" class="commune-card">
          <div>
            <h3>Montpellier</h3>
            <p>Serrurerie résidentielle et dépannage dans tous les quartiers montpelliérains.</p>
          </div>
          <div class="commune-arrow">→</div>
        </a>
        <a href="/serrurier-castelnau-le-lez/" class="commune-card">
          <div>
            <h3>Castelnau-le-Lez</h3>
            <p>Intervention rapide pour ouverture de porte et sécurisation d'accès.</p>
          </div>
          <div class="commune-arrow">→</div>
        </a>
        <a href="/serrurier-lattes/" class="commune-card">
          <div>
            <h3>Lattes</h3>
            <p>Remplacement de serrures, cylindres et verrous de haute résistance.</p>
          </div>
          <div class="commune-arrow">→</div>
        </a>
        <a href="/serrurier-perols/" class="commune-card">
          <div>
            <h3>Pérols</h3>
            <p>Sécurisation après tentative d'effraction et pose de serrures multipoints.</p>
          </div>
          <div class="commune-arrow">→</div>
        </a>
      </div>
    </div>
  </section>

  <!-- FAQ -->
  <section class="section section-alt">
    <div class="container reveal">
      <h2>Questions fréquentes sur nos prestations de serrurier</h2>
      <p>Les réponses aux questions que vous vous posez avant de faire appel à un artisan serrurier.</p>
      <div class="faq-grid">
        <div class="faq-item">
          <h3>Peut-on ouvrir une porte claquée sans abîmer la serrure ?</h3>
          <p>Dans l'immense majorité des cas, une porte simplement claquée (non verrouillée à clé) s'ouvre par méthode fine à la feuille de radio ou au by-pass sans endommager le cylindre ni la poignée.</p>
        </div>
        <div class="faq-item">
          <h3>Que signifie la certification A2P pour une serrure ?</h3>
          <p>Délivrée par le CNPP, la marque A2P garantit la résistance du mécanisme aux attaques destructives : une étoile pour 5 minutes, deux étoiles pour 10 minutes et trois étoiles pour 15 minutes face aux outillages de cambriolage.</p>
        </div>
        <div class="faq-item">
          <h3>Pourquoi faut-il changer son cylindre après une perte de clés ?</h3>
          <p>Conserver un cylindre dont les clés circulent dans la nature expose votre logement à une intrusion sans trace d'effraction, ce qui complique les prises en charge par votre compagnie d'assurance habitation.</p>
        </div>
        <div class="faq-item">
          <h3>Fournissez-vous une facture conforme pour les assurances ?</h3>
          <p>Toutes nos factures comportent le détail précis des pièces remplacées, les numéros de série, le taux de TVA en vigueur ainsi que les mentions de notre garantie décennale obligatoire.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Contact -->
  <section class="section" id="contact">
    <div class="container reveal">
      <div class="contact-box">
        <h2>Contactez votre artisan serrurier</h2>
        <p>Une question sur la sécurisation de votre logement ou un besoin d'intervention rapide ? Contactez-nous directement.</p>
        <div class="contact-grid">
          <div>
            <div class="contact-info-item">
              <strong>Téléphone direct</strong>
              <a href="tel:${TEL.replace(/\s+/g, '')}">${TEL}</a>
            </div>
            <div class="contact-info-item">
              <strong>Courriel</strong>
              <a href="mailto:${EMAIL}">${EMAIL}</a>
            </div>
          </div>
          <div>
            <div class="contact-info-item">
              <strong>Adresse de l'atelier</strong>
              <p>${ADRESSE}<br>${CP} ${VILLE}</p>
            </div>
            <div class="contact-info-item">
              <strong>Horaires d'accueil</strong>
              <p>${HORAIRES}</p>
            </div>
          </div>
        </div>
        <div style="margin-top: 32px;">
          <a href="tel:${TEL.replace(/\s+/g, '')}" class="btn btn-primary">Appeler pour une intervention</a>
        </div>
      </div>
    </div>
  </section>
</main>
${getFooter()}
`;

fs.writeFileSync(path.join(OUT, 'index.html'), accueilHtml, 'utf8');

// 8. Pages de communes
const communesData = [
  {
    nom: 'Montpellier',
    slug: 'serrurier-montpellier',
    title: 'Artisan Serrurier à Montpellier — Démo Serrurier Montpellier',
    desc: 'Votre serrurier artisan à Montpellier pour ouverture de porte claquée, blindage et changement de cylindre haute sécurité. Intervention soignée.',
    voisines: [
      { nom: 'Castelnau-le-Lez', slug: 'serrurier-castelnau-le-lez' },
      { nom: 'Lattes', slug: 'serrurier-lattes' }
    ],
    intro: "Démo Serrurier Montpellier intervient au cœur de Montpellier et dans l'ensemble de ses quartiers pour sécuriser vos accès, ouvrir vos portes bloquées et remplacer vos mécanismes usés.",
    texte1: "Dans une métropole animée comme Montpellier, la sécurité des portes d'entrée et des accès collectifs requiert des équipements fiables et adaptés aux spécificités des immeubles anciens comme des résidences contemporaines.",
    texte2: "Notre serrurier se déplace avec un outillage complet pour réaliser des ouvertures fines, procéder au remplacement immédiat de barillets endommagés et poser des verrous de renfort certifiés pour dissuader toute effraction."
  },
  {
    nom: 'Castelnau-le-Lez',
    slug: 'serrurier-castelnau-le-lez',
    title: 'Serrurier à Castelnau-le-Lez — Démo Serrurier Montpellier',
    desc: 'Intervention serrurerie à Castelnau-le-Lez : installation de serrures multipoints et dépannage de porte fermée à clé. Devis sans engagement.',
    voisines: [
      { nom: 'Montpellier', slug: 'serrurier-montpellier' },
      { nom: 'Pérols', slug: 'serrurier-perols' }
    ],
    intro: "Notre équipe se déplace à Castelnau-le-Lez pour répondre à toutes vos demandes de dépannage serrurier : portes verrouillées par mégarde, clés cassées dans le rotor ou modernisation de crémones.",
    texte1: "À Castelnau-le-Lez, nous équipons les pavillons et appartements de serrures multipoints à larder ou en applique, permettant un verrouillage haut et bas synchronisé avec une seule clé de sécurité brevetée.",
    texte2: "En cas de défaillance mécanique ou de perte de clé, nous privilégions toujours la solution technique la plus économique et la moins intrusive avant d'envisager le remplacement complet de votre quincaillerie."
  },
  {
    nom: 'Lattes',
    slug: 'serrurier-lattes',
    title: 'Serrurier à Lattes — Démo Serrurier Montpellier',
    desc: 'Dépannage de serrure et sécurisation d\'accès à Lattes par un artisan qualifié. Remplacement de barillet et pose de verrous certifiés A2P.',
    voisines: [
      { nom: 'Montpellier', slug: 'serrurier-montpellier' },
      { nom: 'Pérols', slug: 'serrurier-perols' }
    ],
    intro: "Basés dans l'agglomération, nous couvrons la commune de Lattes pour installer des verrous additionnels, débloquer des pênes coincés et adapter des barillets de haute sécurité sur vos accès.",
    texte1: "La proximité des zones lagunaires et du littoral à Lattes impose de veiller à la résistance des alliages contre l'oxydation. Nous sélectionnons des cylindres en laiton massif et mécanismes inoxydables conçus pour durer.",
    texte2: "Que ce soit pour une porte de garage, un portillon extérieur ou une porte principale, notre artisan effectue un diagnostic rigoureux sur place et vous remet un chiffrage clair sans mauvaises surprises."
  },
  {
    nom: 'Pérols',
    slug: 'serrurier-perols',
    title: 'Serrurier à Pérols — Démo Serrurier Montpellier',
    desc: 'Artisan serrurier intervenant à Pérols pour vos serrures bloquées, cylindres européens et fermetures de sécurité. Diagnostic clair et rapide.',
    voisines: [
      { nom: 'Lattes', slug: 'serrurier-lattes' },
      { nom: 'Castelnau-le-Lez', slug: 'serrurier-castelnau-le-lez' }
    ],
    intro: "Pour vos urgences ou vos travaux de rénovation de quincaillerie de sécurité à Pérols, notre atelier mobile apporte des solutions fiables et pérennes adaptées à votre budget.",
    texte1: "À Pérols, nous intervenons régulièrement pour remplacer les serrures monopoint par des ensembles de sécurité A2P dotés de protecteurs de cylindre en acier trempé pour résister aux coups de masse.",
    texte2: "Chaque prestation est couverte par notre assurance décennale et fait l'objet de tests approfondis d'ouverture et de fermeture avant restitution définitive des jeux de clés d'origine à l'occupant."
  }
];

for (const c of communesData) {
  const cDir = path.join(OUT, c.slug);
  if (!fs.existsSync(cDir)) fs.mkdirSync(cDir, { recursive: true });

  const cHtml = `${getHead(c.title, c.desc, `/${c.slug}/`)}
${getJsonLd(`/${c.slug}/`)}
</head>
<body>
${getHeader()}
<main>
  <section class="hero">
    ${pictureHero(`Artisan serrurier en intervention de dépannage à ${c.nom}`)}
    <div class="hero-overlay"></div>
    <div class="container hero-content reveal">
      <div class="breadcrumb">
        <a href="/">Accueil</a> <span>/</span> <span>${c.nom}</span>
      </div>
      <h1>Serrurier à ${c.nom}</h1>
      <p class="hero-lead">${c.intro}</p>
      <div class="hero-actions">
        <a href="tel:${TEL.replace(/\s+/g, '')}" class="btn btn-primary">Appeler : ${TEL}</a>
        <a href="#contact" class="btn btn-outline">Demander un devis</a>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container reveal">
      <h2>Serrurerie de précision et dépannage à ${c.nom}</h2>
      <p>${c.texte1}</p>
      <p>${c.texte2}</p>
      
      <div class="grid-3" style="margin-top: 40px;">
        <div class="card">
          <h3 class="card-title">Ouverture sans dégât</h3>
          <p class="card-desc">Ouverture de porte claquée par crochetage fin ou feuille de radio, sans endommager votre bâti.</p>
        </div>
        <div class="card">
          <h3 class="card-title">Cylindre haute sécurité</h3>
          <p class="card-desc">Remplacement de barillet aux normes A2P avec clés protégées contre la copie non autorisée.</p>
        </div>
        <div class="card">
          <h3 class="card-title">Blindage de porte</h3>
          <p class="card-desc">Installation de blindage pivot et cornières anti-pinces pour sécuriser efficacement votre entrée.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="section section-alt">
    <div class="container reveal">
      <h2>Nos travaux en images</h2>
      <div class="grid-2" style="margin-top: 32px;">
        <div class="realisation-card">
          <div class="realisation-img-wrap">
            ${pictureCard('serrure1', `Mécanisme de serrure posé à ${c.nom}`)}
          </div>
          <div class="realisation-content">
            <h3>Serrure multipoints certifiée</h3>
            <p>Pose d'un système à tringles renforcées assurant 3 points d'ancrage robustes.</p>
          </div>
        </div>
        <div class="realisation-card">
          <div class="realisation-img-wrap">
            ${pictureCard('cylindre', `Cylindre de serrure installé à ${c.nom}`)}
          </div>
          <div class="realisation-content">
            <h3>Cylindre européen débrayable</h3>
            <p>Installation d'un cylindre haute sécurité avec carte de reproduction exclusive.</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container reveal">
      <h2>Autres communes proches desservies</h2>
      <p>Nous intervenons également dans les localités voisines de ${c.nom} :</p>
      <div class="communes-grid">
        ${c.voisines.map(v => `
        <a href="/${v.slug}/" class="commune-card">
          <div>
            <h3>Serrurier à ${v.nom}</h3>
            <p>Dépannage d'urgence et installation de serrures à ${v.nom}.</p>
          </div>
          <div class="commune-arrow">→</div>
        </a>
        `).join('')}
      </div>
    </div>
  </section>

  <section class="section section-alt" id="contact">
    <div class="container reveal">
      <div class="contact-box">
        <h2>Intervention serrurier à ${c.nom}</h2>
        <p>Besoin d'une ouverture de porte ou du remplacement d'une serrure défectueuse à ${c.nom} ? Contactez notre artisan.</p>
        <div class="contact-grid">
          <div>
            <div class="contact-info-item">
              <strong>Téléphone</strong>
              <a href="tel:${TEL.replace(/\s+/g, '')}">${TEL}</a>
            </div>
            <div class="contact-info-item">
              <strong>Courriel</strong>
              <a href="mailto:${EMAIL}">${EMAIL}</a>
            </div>
          </div>
          <div>
            <div class="contact-info-item">
              <strong>Disponibilité</strong>
              <p>${HORAIRES}</p>
            </div>
            <div class="contact-info-item">
              <strong>Zone couverte</strong>
              <p>${c.nom} et alentours</p>
            </div>
          </div>
        </div>
        <div style="margin-top: 32px;">
          <a href="tel:${TEL.replace(/\s+/g, '')}" class="btn btn-primary">Appeler le serrurier</a>
        </div>
      </div>
    </div>
  </section>
</main>
${getFooter()}
`;

  fs.writeFileSync(path.join(cDir, 'index.html'), cHtml, 'utf8');
}

// 9. Mentions Légales
const mentionsDir = path.join(OUT, 'mentions-legales');
if (!fs.existsSync(mentionsDir)) fs.mkdirSync(mentionsDir, { recursive: true });

const mentionsHtml = `${getHead('Mentions Légales — Démo Serrurier Montpellier', 'Mentions légales du site de démonstration Démo Serrurier Montpellier : informations juridiques, garanties professionnelles et crédits photos.', '/mentions-legales/')}
</head>
<body>
${getHeader()}
<main class="section">
  <div class="container reveal">
    <div class="breadcrumb">
      <a href="/">Accueil</a> <span>/</span> <span>Mentions légales</span>
    </div>
    <h1>Mentions légales</h1>
    
    <div class="card" style="margin-top: 32px;">
      <h3 class="card-title">Avertissement démonstration</h3>
      <p>Site de démonstration : entreprise fictive créée pour illustrer les fonctionnalités de la solution Presti.</p>
    </div>

    <div class="card" style="margin-top: 24px;">
      <h3 class="card-title">Identité de l'entreprise</h3>
      <p><strong>Dénomination commerciale :</strong> ${NOM}</p>
      <p><strong>Forme juridique :</strong> Entreprise artisanale individuelle fictive</p>
      <p><strong>Numéro SIREN :</strong> ${SIREN}</p>
      <p><strong>Adresse du siège :</strong> ${ADRESSE}, ${CP} ${VILLE}</p>
      <p><strong>Téléphone :</strong> <a href="tel:${TEL.replace(/\s+/g, '')}">${TEL}</a></p>
      <p><strong>Courrier électronique :</strong> <a href="mailto:${EMAIL}">${EMAIL}</a></p>
      <p><strong>Directeur de la publication :</strong> Le gérant de ${NOM}</p>
    </div>

    <div class="card" style="margin-top: 24px;">
      <h3 class="card-title">Assurance décennale et responsabilité</h3>
      <p>L'entreprise est couverte par un contrat d'assurance décennale et responsabilité civile professionnelle obligatoire souscrit auprès de la compagnie <strong>${DECENNALE_ASSUREUR}</strong> sous le numéro de contrat <strong>${DECENNALE_NUMERO}</strong>.</p>
    </div>

    <div class="card" style="margin-top: 24px;">
      <h3 class="card-title">Hébergement</h3>
      <p>Le présent site statique est hébergé de façon autonome sur infrastructure sécurisée.</p>
    </div>

    <div class="card" style="margin-top: 24px;">
      <h3 class="card-title">Crédits photographiques</h3>
      <p>Les photographies illustrant ce site de démonstration proviennent de sources libres de droits (Wikimedia Commons, Pxhere). Chaque auteur détient les droits afférents à ses prises de vue :</p>
      <ul>
        <li>Photo de serrurier en travail par MatthewG (Licence CC BY-SA 4.0)</li>
        <li>Mécanisme de serrure par Alno (Licence CC BY-SA 3.0)</li>
        <li>Cylindre de porte par Santeri Viinamäki (Licence CC BY-SA 4.0)</li>
        <li>Détail de cylindre par Roby (Licence CC BY-SA 3.0)</li>
        <li>Clés et serrures par Pxhere (Licence CC0)</li>
        <li>Clé dans la serrure par Nenad Stojkovic (Licence CC BY 2.0)</li>
      </ul>
    </div>
  </div>
</main>
${getFooter()}
`;

fs.writeFileSync(path.join(mentionsDir, 'index.html'), mentionsHtml, 'utf8');

// 10. Confidentialité
const confDir = path.join(OUT, 'confidentialite');
if (!fs.existsSync(confDir)) fs.mkdirSync(confDir, { recursive: true });

const confHtml = `${getHead('Politique de Confidentialité — Démo Serrurier Montpellier', 'Politique de confidentialité et protection des données personnelles du site Démo Serrurier Montpellier. Respect scrupuleux des normes RGPD.', '/confidentialite/')}
</head>
<body>
${getHeader()}
<main class="section">
  <div class="container reveal">
    <div class="breadcrumb">
      <a href="/">Accueil</a> <span>/</span> <span>Politique de confidentialité</span>
    </div>
    <h1>Politique de confidentialité</h1>

    <div class="card" style="margin-top: 32px;">
      <h3 class="card-title">Protection des données à caractère personnel</h3>
      <p>Dans le cadre de son activité de démonstration, ${NOM} s'engage à respecter scrupuleusement la confidentialité des informations communiquées par les visiteurs, conformément au Règlement Général sur la Protection des Données (RGPD).</p>
    </div>

    <div class="card" style="margin-top: 24px;">
      <h3 class="card-title">Données collectées et finalités</h3>
      <p>Lorsque vous effectuez une demande de devis ou contactez l'artisan via notre plateforme de conversation, les seules données collectées sont votre nom, votre numéro de téléphone, votre adresse de chantier et les caractéristiques de votre serrure. Ces données sont exclusivement utilisées pour l'établissement du chiffrage et l'organisation de l'intervention technique.</p>
    </div>

    <div class="card" style="margin-top: 24px;">
      <h3 class="card-title">Durée de conservation</h3>
      <p>Les données transmises pour une demande de devis sont conservées pendant une durée maximale de 12 mois à compter du dernier contact, puis supprimées de manière sécurisée.</p>
    </div>

    <div class="card" style="margin-top: 24px;">
      <h3 class="card-title">Vos droits</h3>
      <p>Conformément à la législation en vigueur, vous disposez d'un droit d'accès, de rectification, d'effacement et de limitation du traitement de vos données personnelles. Pour exercer ces droits, vous pouvez nous adresser un courriel à <a href="mailto:${EMAIL}">${EMAIL}</a>.</p>
    </div>

    <div class="card" style="margin-top: 24px;">
      <h3 class="card-title">Traceurs et cookies</h3>
      <p>Ce site n'utilise aucun cookie publicitaire, aucun tracker de réseau social et aucune solution d'analyse tierce intrusive. Seuls les éléments techniques indispensables à l'affichage rapide et au bon fonctionnement de la navigation sont chargés.</p>
    </div>
  </div>
</main>
${getFooter()}
`;

fs.writeFileSync(path.join(confDir, 'index.html'), confHtml, 'utf8');

console.log('Site serrurier généré avec succès.');

// Lancement automatique du traitement des images si exécuté directement
if (process.argv[1] && process.argv[1].endsWith('build.mjs')) {
  genererImagesEtAttributions().then(() => console.log('Images et attributions générées avec succès.')).catch(console.error);
}
