import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve('public/sites-demo/couvreur');
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

const METIER = 'couvreur';
const NOM = 'Démo Couvreur Strasbourg';
const VILLE = 'Strasbourg';
const CP = '67000';
const ADRESSE = '1 rue de la Démonstration';
const TEL = '+33 4 00 00 00 00';
const EMAIL = 'contact@couvreur.demo.invalid';
const HORAIRES = 'Lundi–vendredi 8 h–18 h';
const SIREN = '000000000';
const DECENNALE_ASSUREUR = 'Assureur fictif';
const DECENNALE_NUMERO = 'DEMO-0001';
const URL_BASE = 'https://couvreur.demo.invalid';

const COMMUNES = [
  'Strasbourg',
  'Schiltigheim',
  'Illkirch-Graffenstaden',
  'Lingolsheim'
];

// 1. Site JSON
const PAGES = [
  { chemin: '/', type: 'accueil' },
  { chemin: '/couvreur-strasbourg/', type: 'commune', cible: 'Strasbourg' },
  { chemin: '/couvreur-schiltigheim/', type: 'commune', cible: 'Schiltigheim' },
  { chemin: '/couvreur-illkirch-graffenstaden/', type: 'commune', cible: 'Illkirch-Graffenstaden' },
  { chemin: '/couvreur-lingolsheim/', type: 'commune', cible: 'Lingolsheim' },
  { chemin: '/mentions-legales/', type: 'legal' },
  { chemin: '/confidentialite/', type: 'legal' }
];

const siteJson = {
  metier: METIER,
  nom: NOM,
  metiers_secondaires: [],
  communes: COMMUNES,
  telephone: TEL,
  siren: SIREN,
  decennale: {
    assureur: DECENNALE_ASSUREUR,
    numero: DECENNALE_NUMERO
  },
  demo: true,
  pages: PAGES
};

fs.writeFileSync(path.join(OUT, 'site.json'), JSON.stringify(siteJson, null, 2), 'utf8');

// 2. Robots.txt
fs.writeFileSync(path.join(OUT, 'robots.txt'), 'User-agent: *\nAllow: /\nSitemap: ' + URL_BASE + '/sitemap.xml\n', 'utf8');

// 3. Sitemap.xml
const sitemapUrls = PAGES.filter(p => p.type !== 'legal').map(p => {
  return '  <url>\n    <loc>' + URL_BASE + p.chemin + '</loc>\n    <lastmod>' + new Date().toISOString().split('T')[0] + '</lastmod>\n  </url>';
}).join('\n');

const sitemapXml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + sitemapUrls + '\n</urlset>\n';
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), sitemapXml, 'utf8');

// 4. Attributions
const IMAGE_CONFIGS = [
  { prefix: 'hero', auteur: 'Sverdrup', source: 'https://commons.wikimedia.org/wiki/File:Rooftiles.JPG', licence: 'CC BY-SA 3.0', legende: 'Couverture en tuiles de terre cuite' },
  { prefix: 'realisation1', auteur: 'Friedrich Haag', source: 'https://commons.wikimedia.org/wiki/File:Unfertige_Dinge_003_2022_10_26.jpg', licence: 'CC BY-SA 4.0', legende: 'Chantier de charpente et couverture' },
  { prefix: 'realisation2', auteur: 'Noah Wulf', source: 'https://commons.wikimedia.org/wiki/File:Wet_Roof_Tiles.jpg', licence: 'CC BY-SA 4.0', legende: 'Tuiles de toiture nettoyées' },
  { prefix: 'realisation3', auteur: 'Sverdrup', source: 'https://commons.wikimedia.org/wiki/File:Rooftiles.JPG', licence: 'CC BY-SA 3.0', legende: 'Pose de tuiles mécaniques neuves' },
  { prefix: 'realisation4', auteur: 'Friedrich Haag', source: 'https://commons.wikimedia.org/wiki/File:Unfertige_Dinge_003_2022_10_26.jpg', licence: 'CC BY-SA 4.0', legende: 'Rénovation de charpente et toiture' },
  { prefix: 'realisation5', auteur: 'Noah Wulf', source: 'https://commons.wikimedia.org/wiki/File:Wet_Roof_Tiles.jpg', licence: 'CC BY-SA 4.0', legende: 'Contrôle d\'étanchéité de toiture' }
];

const attributionsList = [];
for (const img of IMAGE_CONFIGS) {
  for (const w of [480, 960, 1600]) {
    attributionsList.push({
      fichier: 'images/' + img.prefix + '-' + w + '.webp',
      auteur: img.auteur,
      source: img.source,
      licence: img.licence,
      legende: img.legende
    });
    attributionsList.push({
      fichier: 'images/' + img.prefix + '-' + w + '.avif',
      auteur: img.auteur,
      source: img.source,
      licence: img.licence,
      legende: img.legende
    });
  }
}

fs.writeFileSync(path.join(OUT, 'attributions.json'), JSON.stringify(attributionsList, null, 2), 'utf8');

// 5. Styles.css
const cssContent = `/* Styles Couvreur — Direction Artistique & Identité Métier */
@font-face {
  font-family: 'Archivo Narrow';
  src: url('/fonts/ArchivoNarrow.woff2') format('woff2');
  font-display: swap;
  font-weight: 400 700;
}
@font-face {
  font-family: 'IBM Plex Sans';
  src: url('/fonts/IBMPlexSans.woff2') format('woff2');
  font-display: swap;
  font-weight: 400 600;
}

:root {
  --accent: #6B4A3A;
  --accent-hover: #54392D;
  --bg: #F1EDE8;
  --bg-card: #FAF8F5;
  --bg-dark: #1D1714;
  --text: #1D1714;
  --text-muted: #5A4E47;
  --border: #1D1714;
  --border-accent: #6B4A3A;
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
  font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif;
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

body::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
  opacity: 0.055;
  z-index: 9999;
}

/* Typographie */
h1, h2, h3, h4, .font-display {
  font-family: 'Archivo Narrow', sans-serif;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
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
  font-family: 'Archivo Narrow', sans-serif;
  font-weight: 700;
  font-size: 18px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-decoration: none;
  border-radius: 0;
  border: 2px solid var(--accent);
  cursor: pointer;
  transition: all 0.25s ease;
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
  color: var(--accent);
}

.btn-outline:hover {
  background-color: var(--accent);
  color: var(--white);
}

.btn-white {
  background-color: var(--white);
  color: var(--text);
  border-color: var(--white);
}

.btn-white:hover {
  background-color: transparent;
  color: var(--white);
}

/* Structure & Layout */
.container {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 24px;
}

.section {
  padding: 64px 0;
}

.section-alt {
  background-color: var(--bg-card);
  border-top: 2px solid var(--border);
  border-bottom: 2px solid var(--border);
}

/* En-tete */
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
}

/* Mobile Nav Drawer */
.mobile-nav-panel {
  display: none;
  padding: 20px 0;
  border-top: 1px solid rgba(0,0,0,0.1);
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
  background: linear-gradient(135deg, rgba(29, 23, 20, 0.88) 0%, rgba(29, 23, 20, 0.72) 100%);
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
  color: #E2DBD4;
  line-height: 1.6;
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
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  font-weight: 700;
  color: var(--accent);
}

/* Reassurance */
.reassurance-bar {
  background-color: var(--white);
  border: 2px solid var(--border);
  padding: 32px 24px;
}

.reassurance-item {
  border-left: 3px solid var(--accent);
  padding-left: 16px;
}

.reassurance-item h3 {
  font-size: 20px;
  margin-bottom: 6px;
}

.reassurance-item p {
  color: var(--text-muted);
  font-size: 16px;
  margin-bottom: 0;
}

/* Galerie / Realisations */
.realisations-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;
}

.realisation-card {
  background-color: var(--white);
  border: 2px solid var(--border);
  overflow: hidden;
}

.realisation-card picture,
.realisation-card img {
  width: 100%;
  height: 320px;
  object-fit: cover;
  display: block;
}

.realisation-info {
  padding: 18px 22px;
  border-top: 2px solid var(--border);
  background-color: var(--white);
}

.realisation-title {
  font-size: 17px;
  font-weight: 700;
  text-transform: uppercase;
  font-family: 'Archivo Narrow', sans-serif;
  margin-bottom: 4px;
}

.realisation-legend {
  font-size: 14px;
  color: var(--text-muted);
}

/* Etapes */
.etape-card {
  background-color: var(--white);
  border: 2px solid var(--border);
  padding: 24px;
  position: relative;
}

.etape-num {
  display: inline-block;
  font-family: 'Archivo Narrow', sans-serif;
  font-size: 28px;
  font-weight: 700;
  color: var(--accent);
  margin-bottom: 12px;
  border-bottom: 2px solid var(--accent);
  padding-bottom: 2px;
}

/* FAQ */
.faq-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.faq-item {
  background-color: var(--white);
  border: 2px solid var(--border);
  padding: 24px 28px;
}

.faq-question {
  font-size: 20px;
  color: var(--text);
  margin-bottom: 10px;
  font-family: 'Archivo Narrow', sans-serif;
  font-weight: 700;
}

.faq-answer {
  color: var(--text-muted);
  font-size: 16px;
  line-height: 1.65;
}

/* Communes list */
.communes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.commune-badge {
  display: block;
  background-color: var(--white);
  border: 2px solid var(--border);
  padding: 16px 20px;
  text-decoration: none;
  color: var(--text);
  font-family: 'Archivo Narrow', sans-serif;
  font-weight: 700;
  font-size: 18px;
  text-transform: uppercase;
  transition: all 0.2s ease;
}

.commune-badge:hover {
  background-color: var(--accent);
  color: var(--white);
  border-color: var(--accent);
}

/* Contact Card */
.contact-card {
  background-color: var(--white);
  border: 2px solid var(--border);
  padding: 40px;
}

.contact-row {
  display: flex;
  flex-direction: column;
  gap: 24px;
  margin-bottom: 32px;
}

.contact-detail h4 {
  font-size: 16px;
  color: var(--accent);
  margin-bottom: 6px;
}

.contact-detail p {
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 0;
}

/* Fil d'Ariane */
.breadcrumb {
  padding: 20px 0 0 0;
  font-size: 15px;
}

.breadcrumb a {
  color: var(--accent);
  font-weight: 600;
  text-decoration: none;
}

.breadcrumb a:hover {
  text-decoration: underline;
}

.breadcrumb span {
  color: var(--text-muted);
  margin: 0 8px;
}

/* Footer */
.footer {
  background-color: var(--bg-dark);
  color: #E2DBD4;
  border-top: 2px solid var(--border);
  padding: 64px 0 32px 0;
}

.footer-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 40px;
  margin-bottom: 48px;
}

.footer-col h3 {
  color: var(--white);
  font-size: 20px;
  margin-bottom: 16px;
  border-bottom: 2px solid var(--accent);
  display: inline-block;
  padding-bottom: 4px;
}

.footer-col p {
  color: #BDB2AA;
  font-size: 15px;
  line-height: 1.6;
}

.footer-col ul {
  list-style: none;
}

.footer-col ul li {
  margin-bottom: 8px;
}

.footer-col a {
  color: #E2DBD4;
  text-decoration: none;
  font-size: 15px;
}

.footer-col a:hover {
  color: var(--white);
  text-decoration: underline;
}

.footer-bottom {
  border-top: 1px solid rgba(255, 255, 255, 0.15);
  padding-top: 24px;
  text-align: center;
  font-size: 14px;
  color: #8E837B;
}

/* Animations & Reveal */
.no-js .reveal,
html:not(.js) .reveal {
  opacity: 1 !important;
  transform: none !important;
}

html.js .reveal {
  opacity: 0;
  transform: translateY(12px);
  transition: opacity 0.45s ease-out, transform 0.45s ease-out;
}

html.js .reveal.visible {
  opacity: 1;
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  .reveal,
  html.js .reveal {
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }
}

/* Responsive Breakpoints */
@media (min-width: 768px) {
  .grid-2 { grid-template-columns: repeat(2, 1fr); }
  .grid-3 { grid-template-columns: repeat(3, 1fr); }
  .grid-4 { grid-template-columns: repeat(2, 1fr); }
  .realisations-grid { grid-template-columns: repeat(3, 1fr); }
  .footer-grid { grid-template-columns: repeat(3, 1fr); }
  .contact-row { flex-direction: row; justify-content: space-between; }
}

@media (min-width: 960px) {
  h1 { font-size: 60px; }
  h2 { font-size: 38px; }
  .section { padding: 96px 0; }
  .grid-4 { grid-template-columns: repeat(4, 1fr); }
  .nav-desktop { display: flex; }
  .mobile-menu-btn { display: none; }
}

@media (max-width: 959px) {
  .nav-desktop { display: none; }
  .mobile-menu-btn { display: block; }
}
`;

fs.writeFileSync(path.join(OUT, 'styles.css'), cssContent, 'utf8');

// 6. Site.js
const jsContent = `document.documentElement.classList.add('js');
document.addEventListener('DOMContentLoaded', () => {
  const menuBtn = document.querySelector('.mobile-menu-btn');
  const mobileNav = document.querySelector('.mobile-nav-panel');
  if (menuBtn && mobileNav) {
    menuBtn.addEventListener('click', () => {
      mobileNav.classList.toggle('open');
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

// HTML Templates Helpers
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
  <link rel="preload" href="/fonts/ArchivoNarrow.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/fonts/IBMPlexSans.woff2" as="font" type="font/woff2" crossorigin>
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
      <button class="mobile-menu-btn" aria-label="Menu">☰</button>
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
          <p>Artisan couvreur zingueur qualifié intervenant à Strasbourg et dans les communes voisines du Bas-Rhin.</p>
          <p>${ADRESSE}<br>${CP} ${VILLE}</p>
          <p>Téléphone : <a href="tel:${TEL.replace(/\s+/g, '')}">${TEL}</a></p>
        </div>
        <div class="footer-col">
          <h3 class="font-display">Communes couvertes</h3>
          <ul>
            <li><a href="/couvreur-strasbourg/">Couvreur à Strasbourg</a></li>
            <li><a href="/couvreur-schiltigheim/">Couvreur à Schiltigheim</a></li>
            <li><a href="/couvreur-illkirch-graffenstaden/">Couvreur à Illkirch-Graffenstaden</a></li>
            <li><a href="/couvreur-lingolsheim/">Couvreur à Lingolsheim</a></li>
          </ul>
        </div>
        <div class="footer-col">
          <h3 class="font-display">Informations</h3>
          <ul>
            <li><a href="/mentions-legales/">Mentions légales</a></li>
            <li><a href="/confidentialite/">Politique de confidentialité</a></li>
            <li>Garantie décennale ${DECENNALE_ASSUREUR} (N° ${DECENNALE_NUMERO})</li>
            <li>SIREN : ${SIREN}</li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <p>&copy; ${new Date().getFullYear()} ${NOM}. Tous droits réservés. Site de démonstration fictif.</p>
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
    "@type": "RoofingContractor",
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
    "areaServed": ["Strasbourg", "Schiltigheim", "Illkirch-Graffenstaden", "Lingolsheim"]
  }
  </script>
`;

// 7. Page Accueil (/)
const accueilHtml = `${getHead('Artisan Couvreur à Strasbourg — Démo Couvreur Strasbourg', 'Démo Couvreur Strasbourg : travaux de couverture, charpente et zinguerie à Strasbourg et dans tout le Bas-Rhin. Devis gratuit sous 48h.', '/')}
${getJsonLd('/')}
</head>
<body>
${getHeader()}
<main>
  <!-- Hero -->
  <section class="hero">
    ${pictureHero('Toiture traditionnelle en tuiles de terre cuite')}
    <div class="hero-overlay"></div>
    <div class="container hero-content reveal">
      <h1>Couvreur à Strasbourg — Démo Couvreur Strasbourg</h1>
      <p class="hero-lead">Artisan couvreur zingueur à Strasbourg et dans le Bas-Rhin. Rénovation de toiture, pose de tuiles, étanchéité, zinguerie et réparation de fuites avec garantie décennale.</p>
      <a href="#contact" class="btn btn-primary">Demander un devis</a>
    </div>
  </section>

  <!-- Reassurance -->
  <section class="section">
    <div class="container reveal">
      <div class="reassurance-bar">
        <div class="grid-3">
          <div class="reassurance-item">
            <h3 class="font-display">Assuré décennale</h3>
            <p>Couverture complète souscrite auprès de ${DECENNALE_ASSUREUR} (police n° ${DECENNALE_NUMERO}).</p>
          </div>
          <div class="reassurance-item">
            <h3 class="font-display">Entreprise déclarée</h3>
            <p>Entreprise immatriculée au registre des métiers avec le SIREN ${SIREN}.</p>
          </div>
          <div class="reassurance-item">
            <h3 class="font-display">Devis clair et gratuit</h3>
            <p>Étude personnalisée sur site, chiffrage détaillé et sans engagement.</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Prestations -->
  <section class="section section-alt">
    <div class="container reveal">
      <h2>Nos prestations de toiture</h2>
      <p>Nous réalisons l'ensemble de vos travaux de couverture et zinguerie dans les règles de l'art pour assurer la pérennité et l'isolation thermique de votre maison.</p>
      <div class="grid-4" style="margin-top: 32px;">
        <div class="card">
          <div>
            <div class="card-icon">01</div>
            <h3 class="card-title">Rénovation de toiture</h3>
            <p class="card-desc">Dépose de l'ancienne couverture, réfection du liteonnage, pose d'écran sous-toiture HPV et installation de tuiles mécaniques ou plates.</p>
          </div>
        </div>
        <div class="card">
          <div>
            <div class="card-icon">02</div>
            <h3 class="card-title">Zinguerie & étanchéité</h3>
            <p class="card-desc">Façonnage et pose de gouttières en zinc, chéneaux, abergements de cheminée, noues et solins pour une évacuation parfaite des eaux pluviales.</p>
          </div>
        </div>
        <div class="card">
          <div>
            <div class="card-icon">03</div>
            <h3 class="card-title">Charpente & isolation</h3>
            <p class="card-desc">Contrôle de l'ossature bois, remplacement de chevrons endommagés, traitement fongicide et pose d'isolant sous toiture.</p>
          </div>
        </div>
        <div class="card">
          <div>
            <div class="card-icon">04</div>
            <h3 class="card-title">Recherche de fuites</h3>
            <p class="card-desc">Diagnostic précis des infiltrations, remplacement de tuiles cassées, réfection d'étanchéité et mise en sécurité d'urgence.</p>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Realisations -->
  <section class="section">
    <div class="container reveal">
      <h2>Nos réalisations récentes</h2>
      <p>Découvrez quelques exemples de chantiers de couverture et zinguerie réalisés dans l'agglomération strasbourgeoise.</p>
      <div class="realisations-grid" style="margin-top: 32px;">
        <div class="realisation-card">
          ${pictureCard('realisation1', 'Chantier de charpente et couverture')}
          <div class="realisation-info">
            <div class="realisation-title">Chantier en cours</div>
            <div class="realisation-legend">Photo : Friedrich Haag (CC BY-SA 4.0)</div>
          </div>
        </div>
        <div class="realisation-card">
          ${pictureCard('realisation2', 'Toiture nettoyée et étanchéifiée')}
          <div class="realisation-info">
            <div class="realisation-title">Nettoyage & étanchéité</div>
            <div class="realisation-legend">Photo : Noah Wulf (CC BY-SA 4.0)</div>
          </div>
        </div>
        <div class="realisation-card">
          ${pictureCard('realisation3', 'Pose de tuiles neuves')}
          <div class="realisation-info">
            <div class="realisation-title">Couverture neuve</div>
            <div class="realisation-legend">Photo : Sverdrup (CC BY-SA 3.0)</div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Zone d'intervention -->
  <section class="section section-alt">
    <div class="container reveal">
      <h2>Zone d'intervention dans le Bas-Rhin</h2>
      <p>Nous intervenons sur l'ensemble de l'Eurométropole de Strasbourg et dans les communes limitrophes pour tous vos travaux de toiture :</p>
      <div class="communes-grid" style="margin-top: 28px;">
        <a href="/couvreur-strasbourg/" class="commune-badge">Couvreur à Strasbourg</a>
        <a href="/couvreur-schiltigheim/" class="commune-badge">Couvreur à Schiltigheim</a>
        <a href="/couvreur-illkirch-graffenstaden/" class="commune-badge">Couvreur à Illkirch-Graffenstaden</a>
        <a href="/couvreur-lingolsheim/" class="commune-badge">Couvreur à Lingolsheim</a>
      </div>
    </div>
  </section>

  <!-- Comment ca se passe -->
  <section class="section">
    <div class="container reveal">
      <h2>Comment se déroule votre projet</h2>
      <div class="grid-4" style="margin-top: 32px;">
        <div class="etape-card">
          <span class="etape-num">01</span>
          <h3 class="font-display">Prise de contact</h3>
          <p class="card-desc">Vous nous décrivez votre projet par téléphone ou via notre formulaire en ligne.</p>
        </div>
        <div class="etape-card">
          <span class="etape-num">02</span>
          <h3 class="font-display">Visite sur site</h3>
          <p class="card-desc">Nous examinons la toiture, mesurons les surfaces et identifions les contraintes techniques.</p>
        </div>
        <div class="etape-card">
          <span class="etape-num">03</span>
          <h3 class="font-display">Devis détaillé</h3>
          <p class="card-desc">Nous vous adressons un devis complet avec le détail des matériaux et des interventions.</p>
        </div>
        <div class="etape-card">
          <span class="etape-num">04</span>
          <h3 class="font-display">Réalisation</h3>
          <p class="card-desc">Nous planifions et exécutons le chantier avec rigueur, dans le respect des normes en vigueur.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- FAQ -->
  <section class="section section-alt">
    <div class="container reveal">
      <h2>Questions fréquentes sur la toiture</h2>
      <div class="faq-list" style="margin-top: 32px;">
        <div class="faq-item">
          <h3 class="faq-question">Comment savoir si ma toiture a besoin d'être rénovée ?</h3>
          <p class="faq-answer">Des signes visibles comme des tuiles poreuses, ébréchées ou déplacées, des traces d'humidité dans les combles, ou la présence excessive de mousse indiquent qu'un diagnostic de votre couverture est nécessaire.</p>
        </div>
        <div class="faq-item">
          <h3 class="faq-question">Intervenez-vous en cas de météo défavorable ?</h3>
          <p class="faq-answer">Pour des raisons évidentes de sécurité des artisans et pour préserver l'étanchéité de votre habitation, les chantiers de toiture ne peuvent être engagés sous de fortes intempéries. En cas d'urgence, nous posons un bâchage temporaire.</p>
        </div>
        <div class="faq-item">
          <h3 class="faq-question">Quelles garanties couvrent vos travaux de couverture ?</h3>
          <p class="faq-answer">L'ensemble de nos travaux de réfection de toiture et de charpente bénéficie de la garantie décennale (${DECENNALE_ASSUREUR}, police n° ${DECENNALE_NUMERO}), vous protégeant contre tout vice pendant 10 ans.</p>
        </div>
        <div class="faq-item">
          <h3 class="faq-question">Quelle est l'importance de la zinguerie sur une toiture ?</h3>
          <p class="faq-answer">Les éléments de zinguerie (abergements, chéneaux, noues, gouttières) assurent la jonction étanche entre les différents pans de toiture et les maçonneries. Une zinguerie défaillante est la cause principale des infiltrations d'eau.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- Contact -->
  <section class="section" id="contact">
    <div class="container reveal">
      <h2>Demander un devis gratuit</h2>
      <div class="contact-card" style="margin-top: 32px;">
        <div class="contact-row">
          <div class="contact-detail">
            <h4>Adresse</h4>
            <p>${ADRESSE}, ${CP} ${VILLE}</p>
          </div>
          <div class="contact-detail">
            <h4>Téléphone</h4>
            <p><a href="tel:${TEL.replace(/\s+/g, '')}">${TEL}</a></p>
          </div>
          <div class="contact-detail">
            <h4>Horaires d'ouverture</h4>
            <p>${HORAIRES}</p>
          </div>
        </div>
        <div style="text-align: center; margin-top: 24px;">
          <a href="#contact" class="btn btn-primary" style="font-size: 20px; padding: 16px 36px;">Demander un devis en ligne</a>
        </div>
      </div>
    </div>
  </section>
</main>
${getFooter()}
`;

fs.writeFileSync(path.join(OUT, 'index.html'), accueilHtml, 'utf8');

// 8. Pages de Commune
const COMMUNE_DATA = {
  'Strasbourg': {
    slug: 'strasbourg',
    title: 'Couvreur Zingueur à Strasbourg — Démo Couvreur Strasbourg',
    desc: 'Artisan couvreur intervenant à Strasbourg pour la réfection de toiture, pose de tuiles, zinguerie et réparation de fuites. Devis rapide.',
    voisines: ['Schiltigheim', 'Illkirch-Graffenstaden']
  },
  'Schiltigheim': {
    slug: 'schiltigheim',
    title: 'Couvreur à Schiltigheim — Démo Couvreur Strasbourg',
    desc: 'Travaux de toiture à Schiltigheim : réfection de couverture en tuiles, étanchéité, zinguerie et réparation. Artisan assuré décennale.',
    voisines: ['Strasbourg', 'Illkirch-Graffenstaden']
  },
  'Illkirch-Graffenstaden': {
    slug: 'illkirch-graffenstaden',
    title: 'Couvreur à Illkirch-Graffenstaden — Démo Couvreur Strasbourg',
    desc: 'Couvreur professionnel à Illkirch-Graffenstaden : pose de tuiles, réparation de toiture, étanchéité et gouttières. Devis gratuit.',
    voisines: ['Strasbourg', 'Lingolsheim']
  },
  'Lingolsheim': {
    slug: 'lingolsheim',
    title: 'Couvreur à Lingolsheim — Démo Couvreur Strasbourg',
    desc: 'Artisan couvreur à Lingolsheim pour vos travaux de couverture, réfection de toiture et charpente. Intervention soignée et garantie.',
    voisines: ['Strasbourg', 'Illkirch-Graffenstaden']
  }
};

for (const [ville, data] of Object.entries(COMMUNE_DATA)) {
  const dirPath = path.join(OUT, 'couvreur-' + data.slug);
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });

  const communeHtml = `${getHead(data.title, data.desc, '/couvreur-' + data.slug + '/')}
${getJsonLd('/couvreur-' + data.slug + '/')}
</head>
<body>
${getHeader()}
<main>
  <div class="container breadcrumb">
    <a href="/">Accueil</a> <span>&gt;</span> Couvreur à ${ville}
  </div>

  <section class="section">
    <div class="container reveal">
      <h1>Couvreur à ${ville}</h1>
      <p class="hero-lead" style="color: var(--text-muted); max-width: 900px;">${NOM} intervient à ${ville} et dans les communes voisines pour la rénovation de toiture, le remplacement de tuiles, les travaux de zinguerie et la réparation de fuites. Nous mettons notre savoir-faire artisanal au service de la protection de votre habitation.</p>
    </div>
  </section>

  <section class="section section-alt">
    <div class="container reveal">
      <h2>Nos travaux de toiture à ${ville}</h2>
      <p>Chaque toiture présente ses spécificités selon son exposition et les matériaux utilisés. À ${ville}, nous réalisons l'ensemble des interventions de couverture :</p>
      <div class="grid-3" style="margin-top: 28px;">
        <div class="card">
          <h3 class="card-title">Réfection de toiture</h3>
          <p class="card-desc">Remplacement de tuiles abîmées ou poreuses, pose de liteaux neufs et écran pare-pluie pour une étanchéité parfaite à ${ville}.</p>
        </div>
        <div class="card">
          <h3 class="card-title">Travaux de zinguerie</h3>
          <p class="card-desc">Installation et remplacement de gouttières, noues, rives et abergements de cheminées pour une canalisation idéale des eaux pluviales.</p>
        </div>
        <div class="card">
          <h3 class="card-title">Entretien & démoussage</h3>
          <p class="card-desc">Nettoyage soigné, traitement anti-mousse préventif et curatif, et application d'hydrofuge pour prolonger la vie de vos tuiles.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container reveal">
      <h2>Exemples de réalisations sur toiture</h2>
      <p>Aperçu de nos réalisations de couverture et zinguerie dans le secteur :</p>
      <div class="grid-2" style="margin-top: 28px;">
        <div class="realisation-card">
          ${pictureCard('realisation4', 'Rénovation de toiture à ' + ville, true)}
          <div class="realisation-info">
            <div class="realisation-title">Rénovation de toiture</div>
            <div class="realisation-legend">Photo : Friedrich Haag (CC BY-SA 4.0)</div>
          </div>
        </div>
        <div class="realisation-card">
          ${pictureCard('realisation5', 'Contrôle d\'étanchéité à ' + ville, false)}
          <div class="realisation-info">
            <div class="realisation-title">Contrôle d'étanchéité</div>
            <div class="realisation-legend">Photo : Noah Wulf (CC BY-SA 4.0)</div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section class="section section-alt">
    <div class="container reveal">
      <h2>Déroulement d'une intervention à ${ville}</h2>
      <div class="grid-3" style="margin-top: 28px;">
        <div class="etape-card">
          <span class="etape-num">1</span>
          <h3 class="font-display">Diagnostic initial</h3>
          <p class="card-desc">Nous convenons d'un rendez-vous sur place à ${ville} pour évaluer précisément l'état de votre toiture et charpente.</p>
        </div>
        <div class="etape-card">
          <span class="etape-num">2</span>
          <h3 class="font-display">Chiffrage gratuit</h3>
          <p class="card-desc">Nous établissons un devis clair et transparent sans aucun engagement, mentionnant chaque poste de travaux.</p>
        </div>
        <div class="etape-card">
          <span class="etape-num">3</span>
          <h3 class="font-display">Travaux garantis</h3>
          <p class="card-desc">Nous exécutons le chantier avec soin et appliquons la garantie décennale sur l'ensemble des travaux de couverture.</p>
        </div>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="container reveal">
      <h2>Communes voisines également desservies</h2>
      <p>Nous intervenons également dans les localités voisines de ${ville} :</p>
      <div class="communes-grid" style="margin-top: 20px;">
        ${data.voisines.map(v => {
          const vSlug = COMMUNE_DATA[v].slug;
          return '<a href="/couvreur-' + vSlug + '/" class="commune-badge">Couvreur à ' + v + '</a>';
        }).join('\n        ')}
      </div>
    </div>
  </section>

  <section class="section section-alt" id="contact">
    <div class="container reveal" style="text-align: center;">
      <h2>Besoin d'un couvreur à ${ville} ?</h2>
      <p style="max-width: 700px; margin: 0 auto 28px auto;">Contactez-nous au <a href="tel:${TEL.replace(/\s+/g, '')}">${TEL}</a> ou demandez votre devis gratuit en quelques clics.</p>
      <a href="#contact" class="btn btn-primary" style="font-size: 20px; padding: 16px 36px;">Demander un devis pour ${ville}</a>
    </div>
  </section>
</main>
${getFooter()}
`;

  fs.writeFileSync(path.join(dirPath, 'index.html'), communeHtml, 'utf8');
}

// 9. Mentions Legales
const mentionsHtml = `${getHead('Mentions légales — Démo Couvreur Strasbourg', 'Mentions légales et informations obligatoires de l\'entreprise Démo Couvreur Strasbourg. Site de démonstration fictif.', '/mentions-legales/')}
</head>
<body>
${getHeader()}
<main>
  <div class="container breadcrumb">
    <a href="/">Accueil</a> <span>&gt;</span> Mentions légales
  </div>

  <section class="section">
    <div class="container reveal">
      <h1>Mentions légales</h1>
      <p class="hero-lead" style="color: var(--text-muted);">Site de démonstration : entreprise fictive.</p>

      <div class="card" style="margin-top: 32px;">
        <h2>Éditeur du site</h2>
        <p><strong>Nom commercial :</strong> ${NOM}</p>
        <p><strong>Activité :</strong> Travaux de couverture, charpente et zinguerie</p>
        <p><strong>Adresse :</strong> ${ADRESSE}, ${CP} ${VILLE}</p>
        <p><strong>Téléphone :</strong> <a href="tel:${TEL.replace(/\s+/g, '')}">${TEL}</a></p>
        <p><strong>Email :</strong> <a href="mailto:${EMAIL}">${EMAIL}</a></p>
        <p><strong>Numéro SIREN :</strong> ${SIREN}</p>
        <p><strong>Directeur de la publication :</strong> Le gérant de ${NOM}</p>

        <h2 style="margin-top: 32px;">Assurance décennale</h2>
        <p><strong>Assureur :</strong> ${DECENNALE_ASSUREUR}</p>
        <p><strong>Numéro de contrat :</strong> ${DECENNALE_NUMERO}</p>
        <p><strong>Couverture géographique :</strong> France métropolitaine</p>

        <h2 style="margin-top: 32px;">Hébergement</h2>
        <p>Ce site statique est hébergé par Vercel Inc., 340 S Lemon Ave #4133 Walnut, CA 91789, USA.</p>

        <h2 style="margin-top: 32px;">Crédits photographiques</h2>
        <p>Les photographies utilisées sur ce site de démonstration sont issues de Wikimedia Commons et publiées sous licences libres :</p>
        <ul style="margin-left: 20px; margin-top: 12px; line-height: 1.8;">
          <li><strong>Sverdrup</strong> : <a href="https://commons.wikimedia.org/wiki/File:Rooftiles.JPG" target="_blank" rel="noopener">Rooftiles.JPG</a> (Licence CC BY-SA 3.0)</li>
          <li><strong>Friedrich Haag</strong> : <a href="https://commons.wikimedia.org/wiki/File:Unfertige_Dinge_003_2022_10_26.jpg" target="_blank" rel="noopener">Unfertige_Dinge_003_2022_10_26.jpg</a> (Licence CC BY-SA 4.0)</li>
          <li><strong>Noah Wulf</strong> : <a href="https://commons.wikimedia.org/wiki/File:Wet_Roof_Tiles.jpg" target="_blank" rel="noopener">Wet_Roof_Tiles.jpg</a> (Licence CC BY-SA 4.0)</li>
        </ul>
      </div>
    </div>
  </section>
</main>
${getFooter()}
`;

fs.writeFileSync(path.join(OUT, 'mentions-legales', 'index.html'), mentionsHtml, 'utf8');

// 10. Confidentialite
const confHtml = `${getHead('Politique de confidentialité — Démo Couvreur Strasbourg', 'Politique de confidentialité et protection des données personnelles du site Démo Couvreur Strasbourg. Aucune donnée cédée.', '/confidentialite/')}
</head>
<body>
${getHeader()}
<main>
  <div class="container breadcrumb">
    <a href="/">Accueil</a> <span>&gt;</span> Politique de confidentialité
  </div>

  <section class="section">
    <div class="container reveal">
      <h1>Politique de confidentialité</h1>
      <p class="hero-lead" style="color: var(--text-muted);">Protection de vos données personnelles et respect de votre vie privée.</p>

      <div class="card" style="margin-top: 32px;">
        <h2>Collecte et utilisation des données</h2>
        <p>Les seules informations recueillies sur ce site sont celles transmises volontairement lorsque vous effectuez une demande de devis ou de renseignement via notre formulaire de contact ou par téléphone.</p>
        <p>Ces données (nom, coordonnées téléphoniques, adresse email, adresse du chantier et description de votre projet de toiture) sont exclusivement utilisées pour étudier votre demande, établir votre devis et organiser une éventuelle intervention.</p>

        <h2 style="margin-top: 32px;">Conservation des données</h2>
        <p>Vos données sont conservées pendant la durée nécessaire à la gestion de la relation commerciale et au suivi des travaux, conformément aux obligations légales de garantie décennale.</p>

        <h2 style="margin-top: 32px;">Cookies et traceurs tiers</h2>
        <p>Ce site statique n'utilise aucun cookie traceur, aucun outil d'analyse d'audience tiers et aucun cookie publicitaire. Votre navigation est totalement privée.</p>

        <h2 style="margin-top: 32px;">Vos droits</h2>
        <p>Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez d'un droit d'accès, de rectification, de portabilité et d'effacement de vos données personnelles. Vous pouvez exercer ce droit à tout moment en nous contactant à l'adresse : <a href="mailto:${EMAIL}">${EMAIL}</a>.</p>
      </div>
    </div>
  </section>
</main>
${getFooter()}
`;

fs.writeFileSync(path.join(OUT, 'confidentialite', 'index.html'), confHtml, 'utf8');

console.log('Site files generated successfully!');
