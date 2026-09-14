import fs from 'fs';
import path from 'path';

const DIR = path.resolve('public/sites-demo/plombier');
const BASE_URL = 'https://plombier.demo.invalid';

const SITE_JSON = {
  metier: 'plombier',
  nom: 'Démo Plombier Lyon',
  telephone: '+33 4 00 00 00 00',
  siren: '000000000',
  decennale: {
    assureur: 'Assureur fictif',
    numero: 'DEMO-0001'
  },
  communes: ['Lyon', 'Villeurbanne', 'Bron', 'Vénissieux'],
  metiers_secondaires: ['chauffagiste'],
  demo: true,
  pages: [
    { chemin: '/', type: 'accueil' },
    { chemin: '/chauffagiste/', type: 'metier', cible: 'chauffagiste' },
    { chemin: '/plombier-lyon/', type: 'commune', cible: 'Lyon' },
    { chemin: '/plombier-villeurbanne/', type: 'commune', cible: 'Villeurbanne' },
    { chemin: '/plombier-bron/', type: 'commune', cible: 'Bron' },
    { chemin: '/plombier-venissieux/', type: 'commune', cible: 'Vénissieux' },
    { chemin: '/mentions-legales/', type: 'legal' },
    { chemin: '/confidentialite/', type: 'legal' }
  ]
};

const CSS_CONTENT = `@font-face {
  font-family: 'Manrope';
  src: url('/fonts/manrope.woff2') format('woff2');
  font-display: swap;
  font-weight: 400 700;
  font-style: normal;
}

:root {
  --accent: #1E6FA8;
  --accent-hover: #165684;
  --bg: #F6F8FA;
  --bg-card: #FFFFFF;
  --bg-alt: #EEF3F8;
  --text: #10233A;
  --text-muted: #486581;
  --border: #D9E2EC;
  --radius: 12px;
  --shadow: 0 4px 20px rgba(16, 35, 58, 0.06);
}

*, *::before, *::after {
  box-sizing: border-box;
}

html {
  background-color: var(--bg);
  color: var(--text);
  font-family: 'Manrope', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 18px;
  line-height: 1.55;
  scroll-behavior: smooth;
  -webkit-text-size-adjust: 100%;
}

body {
  margin: 0;
  padding: 0;
  background-color: var(--bg);
  color: var(--text);
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

img, picture {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: var(--radius);
}

a {
  color: var(--accent);
  text-decoration: none;
  transition: color 0.2s ease;
}

a:hover, a:focus-visible {
  color: var(--accent-hover);
  text-decoration: underline;
}

h1, h2, h3, p, ul, ol {
  margin-top: 0;
}

h1 {
  font-family: 'Manrope', sans-serif;
  font-size: 34px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: var(--text);
  margin-bottom: 16px;
}

h2 {
  font-size: 26px;
  font-weight: 700;
  line-height: 1.3;
  color: var(--text);
  margin-bottom: 16px;
}

h3 {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.4;
  color: var(--text);
  margin-bottom: 8px;
}

p {
  margin-bottom: 16px;
  color: var(--text);
}

.container {
  width: 100%;
  max-width: 1140px;
  margin-left: auto;
  margin-right: auto;
  padding-left: 20px;
  padding-right: 20px;
}

.site-header {
  background-color: var(--bg-card);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  padding-bottom: 16px;
  gap: 16px;
}

.brand {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: var(--text);
}

.brand:hover {
  text-decoration: none;
}

.brand-name {
  font-size: 20px;
  font-weight: 700;
  color: var(--accent);
  line-height: 1.2;
}

.brand-sub {
  font-size: 13px;
  color: var(--text-muted);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.nav-links {
  display: flex;
  gap: 16px;
  align-items: center;
}

.nav-link {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 22px;
  font-size: 16px;
  font-weight: 700;
  border-radius: var(--radius);
  text-decoration: none;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.1s ease;
  line-height: 1.2;
}

.btn:hover {
  text-decoration: none;
  transform: translateY(-1px);
}

.btn:active {
  transform: translateY(0);
}

.btn-primary {
  background-color: var(--accent);
  color: #FFFFFF;
  border: 1px solid var(--accent);
}

.btn-primary:hover, .btn-primary:focus-visible {
  background-color: var(--accent-hover);
  color: #FFFFFF;
}

.btn-outline {
  background-color: transparent;
  color: var(--accent);
  border: 2px solid var(--accent);
}

.btn-outline:hover, .btn-outline:focus-visible {
  background-color: var(--bg-alt);
  color: var(--accent-hover);
}

.btn-phone {
  background-color: var(--bg-alt);
  color: var(--text);
  border: 1px solid var(--border);
  font-size: 15px;
  padding: 10px 18px;
}

.btn-phone:hover {
  background-color: var(--border);
  color: var(--text);
}

.site-main {
  flex: 1 0 auto;
}

.hero {
  padding-top: 40px;
  padding-bottom: 40px;
}

.hero-content {
  margin-bottom: 28px;
}

.hero-lead {
  font-size: 19px;
  color: var(--text-muted);
  max-width: 720px;
  margin-bottom: 24px;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 32px;
}

.hero-media {
  width: 100%;
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow);
}

.hero-media img {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}

.trust-banner {
  background-color: var(--bg-card);
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  padding-top: 28px;
  padding-bottom: 28px;
}

.trust-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

.trust-item {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.trust-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--bg-alt);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 16px;
}

.trust-text {
  display: flex;
  flex-direction: column;
}

.trust-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
  line-height: 1.3;
}

.trust-desc {
  font-size: 14px;
  color: var(--text-muted);
  line-height: 1.4;
  margin-bottom: 0;
}

.section {
  padding-top: 56px;
  padding-bottom: 56px;
}

.section-header {
  margin-bottom: 36px;
}

.section-tag {
  display: inline-block;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--accent);
  margin-bottom: 8px;
}

.section-title {
  margin-bottom: 12px;
}

.section-lead {
  font-size: 17px;
  color: var(--text-muted);
  max-width: 680px;
  margin-bottom: 0;
}

.services-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

.service-card {
  background-color: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px;
  box-shadow: var(--shadow);
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.service-card:hover {
  transform: translateY(-2px);
  border-color: var(--accent);
}

.service-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius);
  background-color: var(--bg-alt);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  margin-bottom: 16px;
}

.service-title {
  margin-bottom: 10px;
}

.service-desc {
  font-size: 15px;
  color: var(--text-muted);
  line-height: 1.5;
  margin-bottom: 0;
}

.gallery-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
}

.gallery-card {
  background-color: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow);
}

.gallery-media {
  width: 100%;
}

.gallery-media img {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

.gallery-caption {
  padding: 16px 20px;
  font-size: 14px;
  color: var(--text-muted);
  line-height: 1.4;
  margin-bottom: 0;
}

.communes-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

.commune-card {
  background-color: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  text-decoration: none;
  color: var(--text);
  box-shadow: var(--shadow);
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.commune-card:hover {
  transform: translateY(-2px);
  border-color: var(--accent);
  text-decoration: none;
}

.commune-name {
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
  display: block;
}

.commune-desc {
  font-size: 14px;
  color: var(--text-muted);
  margin-top: 4px;
  display: block;
}

.commune-arrow {
  font-size: 20px;
  color: var(--accent);
  font-weight: 700;
}

.steps-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

.step-card {
  background-color: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px;
  box-shadow: var(--shadow);
}

.step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: var(--accent);
  color: #FFFFFF;
  font-weight: 700;
  font-size: 16px;
  margin-bottom: 14px;
}

.step-title {
  margin-bottom: 8px;
}

.step-desc {
  font-size: 15px;
  color: var(--text-muted);
  line-height: 1.5;
  margin-bottom: 0;
}

.faq-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.faq-card {
  background-color: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px;
  box-shadow: var(--shadow);
}

.faq-question {
  margin-bottom: 10px;
}

.faq-answer {
  font-size: 15px;
  color: var(--text-muted);
  line-height: 1.5;
  margin-bottom: 0;
}

.contact-section {
  background-color: var(--bg-alt);
}

.contact-card {
  background-color: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 32px 24px;
  box-shadow: var(--shadow);
}

.contact-details {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.contact-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.contact-label {
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.contact-value {
  font-size: 17px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 0;
}

.breadcrumb {
  padding-top: 20px;
  padding-bottom: 12px;
}

.breadcrumb-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-muted);
}

.breadcrumb-item a {
  color: var(--accent);
}

.breadcrumb-current {
  color: var(--text);
  font-weight: 600;
}

.legal-content {
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
  padding-top: 40px;
  padding-bottom: 60px;
}

.legal-card {
  background-color: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 32px 24px;
  box-shadow: var(--shadow);
  margin-bottom: 24px;
}

.legal-section {
  margin-bottom: 24px;
}

.legal-section:last-child {
  margin-bottom: 0;
}

.site-footer {
  background-color: var(--bg-card);
  border-top: 1px solid var(--border);
  padding-top: 40px;
  padding-bottom: 40px;
  margin-top: auto;
}

.footer-inner {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.footer-brand {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.footer-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 15px;
}

.footer-legal {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.5;
  border-top: 1px solid var(--border);
  padding-top: 20px;
  margin-bottom: 0;
}

/* Animations et reveals */
.no-js .reveal {
  opacity: 1;
  transform: none;
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
  .reveal {
    transition: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
}

/* Adaptations grand écran */
@media (min-width: 640px) {
  .trust-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .communes-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 768px) {
  .services-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .gallery-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .steps-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 960px) {
  h1 {
    font-size: 60px;
  }
  h2 {
    font-size: 34px;
  }
  .services-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .gallery-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .steps-grid {
    grid-template-columns: repeat(4, 1fr);
  }
  .footer-inner {
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-start;
  }
}
`;

const JS_CONTENT = `document.documentElement.classList.replace('no-js', 'js');
function animerReveals() {
  var elements = document.querySelectorAll('.reveal');
  if (!elements.length) return;
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -40px 0px' });
    elements.forEach(function(el) { observer.observe(el); });
  } else {
    elements.forEach(function(el) { el.classList.add('visible'); });
  }
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', animerReveals);
} else {
  animerReveals();
}
`;

function buildHeader(page) {
  return `  <header class="site-header">
    <div class="container header-inner">
      <a href="/" class="brand">
        <span class="brand-name">Démo Plombier Lyon</span>
        <span class="brand-sub">Artisan plomberie &amp; chauffage</span>
      </a>
      <div class="header-actions">
        <nav class="nav-links" aria-label="Navigation principale">
          <a href="/" class="nav-link">Accueil</a>
          <a href="/chauffagiste/" class="nav-link">Chauffagiste</a>
        </nav>
        <a href="tel:+33400000000" class="btn btn-phone">+33 4 00 00 00 00</a>
        <a href="#contact" class="btn btn-primary">Demander un devis</a>
      </div>
    </div>
  </header>`;
}

function buildFooter(communes) {
  return `  <footer class="site-footer">
    <div class="container footer-inner">
      <div class="footer-brand">
        <strong>Démo Plombier Lyon</strong>
        <p class="brand-sub">Installation sanitaire, rénovation et dépannage plomberie à Lyon.</p>
      </div>
      <nav class="footer-nav" aria-label="Liens annexes">
        <a href="/">Accueil</a>
        <a href="/chauffagiste/">Chauffagiste</a>
        <a href="/mentions-legales/">Mentions légales</a>
        <a href="/confidentialite/">Confidentialité</a>
      </nav>
    </div>
    <div class="container">
      <p class="footer-legal">
        Communes d'intervention :
        <a href="/plombier-lyon/">Lyon</a>,
        <a href="/plombier-villeurbanne/">Villeurbanne</a>,
        <a href="/plombier-bron/">Bron</a>,
        <a href="/plombier-venissieux/">Vénissieux</a>.
        Site de démonstration réalisé pour Démo Plombier Lyon.
      </p>
    </div>
  </footer>`;
}

function buildHtml(page) {
  const isLegal = page.type === 'legal';
  let title = '';
  let metaDesc = '';
  let h1 = '';
  let breadcrumb = '';

  if (page.type === 'accueil') {
    title = 'Plombier à Lyon — Démo Plombier Lyon';
    metaDesc = 'Démo Plombier Lyon : artisan plombier sanitaire à Lyon. Installations de tuyauterie, mitigeurs, chauffe-eau et dépannage soigné. Devis gratuit.';
    h1 = 'Plombier à Lyon — Démo Plombier Lyon';
  } else if (page.type === 'commune') {
    const c = page.cible;
    title = 'Plombier à ' + c + ' — Démo Plombier Lyon' + (c === 'Lyon' ? ' Dépannage' : '');
    metaDesc = 'Artisan plombier qualifié à ' + c + ' : travaux de plomberie sanitaire, remplacement de chauffe-eau, tuyauterie et dépannage soigné. Devis clair et gratuit.';
    h1 = 'Plombier à ' + c;
    breadcrumb = `    <nav class="breadcrumb container" aria-label="Fil d'Ariane">
      <ol class="breadcrumb-list">
        <li class="breadcrumb-item"><a href="/">Accueil</a> &gt;</li>
        <li class="breadcrumb-item breadcrumb-current" aria-current="page">${c}</li>
      </ol>
    </nav>`;
  } else if (page.type === 'metier') {
    title = 'Chauffagiste à Lyon — Démo Plombier Lyon';
    metaDesc = 'Artisan chauffagiste à Lyon : entretien, rénovation et installation de systèmes de chauffage et chauffe-eau par Démo Plombier Lyon. Devis gratuit.';
    h1 = 'Chauffagiste à Lyon';
    breadcrumb = `    <nav class="breadcrumb container" aria-label="Fil d'Ariane">
      <ol class="breadcrumb-list">
        <li class="breadcrumb-item"><a href="/">Accueil</a> &gt;</li>
        <li class="breadcrumb-item breadcrumb-current" aria-current="page">Chauffagiste</li>
      </ol>
    </nav>`;
  } else if (page.chemin.includes('mentions')) {
    title = 'Mentions légales — Démo Plombier Lyon';
    metaDesc = 'Mentions légales et informations réglementaires du site de démonstration Démo Plombier Lyon, entreprise artisanale fictive.';
    h1 = 'Mentions légales';
  } else {
    title = 'Politique de confidentialité — Démo Plombier Lyon';
    metaDesc = 'Politique de confidentialité et protection des données personnelles de Démo Plombier Lyon. Aucun traceur ni cookie tiers.';
    h1 = 'Politique de confidentialité';
  }

  const jsonLd = !isLegal ? `  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Plumber",
    "name": "Démo Plombier Lyon",
    "url": "${BASE_URL}${page.chemin}",
    "telephone": "+33 4 00 00 00 00",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "1 rue de la Démonstration",
      "postalCode": "69003",
      "addressLocality": "Lyon",
      "addressCountry": "FR"
    },
    "openingHours": "Mo-Fr 08:00-18:00",
    "areaServed": ["Lyon", "Villeurbanne", "Bron", "Vénissieux"],
    "image": "${BASE_URL}/images/hero-1600.webp"
  }
  </script>` : '';

  let bodyContent = '';

  if (page.type === 'accueil') {
    bodyContent = `
    <section class="hero">
      <div class="container">
        <div class="hero-content">
          <span class="section-tag">Artisan sanitaire qualifié</span>
          <h1 class="hero-title">${h1}</h1>
          <p class="hero-lead">Installation soignée, rénovation complète et maintenance de vos réseaux de plomberie sanitaire dans toute la métropole lyonnaise.</p>
          <div class="hero-actions">
            <a href="#contact" class="btn btn-primary">Demander un devis gratuit</a>
            <a href="tel:+33400000000" class="btn btn-outline">Appeler le 04 00 00 00 00</a>
          </div>
        </div>
        <div class="hero-media">
          <picture>
            <source srcset="/images/hero-480.avif 480w, /images/hero-960.avif 960w, /images/hero-1600.avif 1600w" sizes="(max-width: 960px) 100vw, 1140px" type="image/avif">
            <source srcset="/images/hero-480.webp 480w, /images/hero-960.webp 960w, /images/hero-1600.webp 1600w" sizes="(max-width: 960px) 100vw, 1140px" type="image/webp">
            <img src="/images/hero-960.webp" alt="Installation de robinetterie sanitaire et mitigeur de lavabo" width="1600" height="900" fetchpriority="high">
          </picture>
        </div>
      </div>
    </section>

    <div class="trust-banner">
      <div class="container">
        <div class="trust-grid">
          <div class="trust-item">
            <div class="trust-icon" aria-hidden="true">&#10003;</div>
            <div class="trust-text">
              <span class="trust-title">Assuré décennale (Assureur fictif)</span>
              <p class="trust-desc">Contrat n° DEMO-0001 couvrant l'ensemble de vos installations sanitaires.</p>
            </div>
          </div>
          <div class="trust-item">
            <div class="trust-icon" aria-hidden="true">&#10003;</div>
            <div class="trust-text">
              <span class="trust-title">SIREN 000000000</span>
              <p class="trust-desc">Entreprise enregistrée et localisée à Lyon, gage de rigueur et de conformité.</p>
            </div>
          </div>
          <div class="trust-item">
            <div class="trust-icon" aria-hidden="true">&#10003;</div>
            <div class="trust-text">
              <span class="trust-title">Devis clair et gratuit</span>
              <p class="trust-desc">Étude technique personnalisée sans engagement avant le démarrage des travaux.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <section class="section reveal">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">Savoir-faire technique</span>
          <h2 class="section-title">Nos prestations de plomberie sanitaire</h2>
          <p class="section-lead">Des solutions durables et conformes aux normes pour tous vos équipements d'eau.</p>
        </div>
        <div class="services-grid">
          <div class="service-card">
            <div class="service-icon" aria-hidden="true">01</div>
            <h3 class="service-title">Arrivée d'eau et tuyauterie</h3>
            <p class="service-desc">Conception et modification de réseaux d'alimentation en cuivre brasé, multicouche et PER avec raccords sertis haute fiabilité.</p>
          </div>
          <div class="service-card">
            <div class="service-icon" aria-hidden="true">02</div>
            <h3 class="service-title">Groupe de sécurité et chauffe-eau</h3>
            <p class="service-desc">Remplacement préventif et pose de groupes de sécurité neufs pour protéger votre ballon d'eau chaude contre les surpressions.</p>
          </div>
          <div class="service-card">
            <div class="service-icon" aria-hidden="true">03</div>
            <h3 class="service-title">Robinetterie et mitigeurs</h3>
            <p class="service-desc">Pose soignée de mitigeurs thermostatiques, mélangeurs muraux et colonnes de douche pour optimiser votre confort et débit.</p>
          </div>
          <div class="service-card">
            <div class="service-icon" aria-hidden="true">04</div>
            <h3 class="service-title">Rénovation de pièces d'eau</h3>
            <p class="service-desc">Reprise complète des évacuations PVC et des distributions sanitaires pour vos projets de réaménagement de salle de bain.</p>
          </div>
          <div class="service-card">
            <div class="service-icon" aria-hidden="true">05</div>
            <h3 class="service-title">Mécanismes WC et bâtis</h3>
            <p class="service-desc">Installation de bâtis-supports suspendus, robinets d'arrêt silencieux et flotteurs économes en consommation d'eau.</p>
          </div>
          <div class="service-card">
            <div class="service-icon" aria-hidden="true">06</div>
            <h3 class="service-title">Recherche de fuite et réfection</h3>
            <p class="service-desc">Localisation méthodique d'infiltrations d'eau non destructives et réfection rapide des sections endommagées.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section reveal">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">Sur le chantier</span>
          <h2 class="section-title">Nos réalisations d'installations</h2>
          <p class="section-lead">Découvrez en images la rigueur de nos assemblages hydrauliques et la propreté de nos finitions.</p>
        </div>
        <div class="gallery-grid">
          <div class="gallery-card">
            <div class="gallery-media">
              <picture>
                <source srcset="/images/pipes-480.avif 480w, /images/pipes-960.avif 960w, /images/pipes-1600.avif 1600w" sizes="(max-width: 768px) 100vw, (max-width: 960px) 50vw, 360px" type="image/avif">
                <source srcset="/images/pipes-480.webp 480w, /images/pipes-960.webp 960w, /images/pipes-1600.webp 1600w" sizes="(max-width: 768px) 100vw, (max-width: 960px) 50vw, 360px" type="image/webp">
                <img src="/images/pipes-960.webp" alt="Réseau de tuyauterie cuivre pour distribution sanitaire" width="1600" height="900" loading="lazy">
              </picture>
            </div>
            <p class="gallery-caption">Réseau de distribution en tuyauterie cuivre (Photo Brycemilton, licence CC BY-SA 4.0)</p>
          </div>
          <div class="gallery-card">
            <div class="gallery-media">
              <picture>
                <source srcset="/images/repair-480.avif 480w, /images/repair-960.avif 960w, /images/repair-1600.avif 1600w" sizes="(max-width: 768px) 100vw, (max-width: 960px) 50vw, 360px" type="image/avif">
                <source srcset="/images/repair-480.webp 480w, /images/repair-960.webp 960w, /images/repair-1600.webp 1600w" sizes="(max-width: 768px) 100vw, (max-width: 960px) 50vw, 360px" type="image/webp">
                <img src="/images/repair-960.webp" alt="Réparation et purge de circuit hydraulique sur conduite d'eau" width="1600" height="900" loading="lazy">
              </picture>
            </div>
            <p class="gallery-caption">Rénovation de circuit hydraulique sanitaire (Photo Syced, domaine public CC0)</p>
          </div>
          <div class="gallery-card">
            <div class="gallery-media">
              <picture>
                <source srcset="/images/store-480.avif 480w, /images/store-960.avif 960w, /images/store-1600.avif 1600w" sizes="(max-width: 768px) 100vw, (max-width: 960px) 50vw, 360px" type="image/avif">
                <source srcset="/images/store-480.webp 480w, /images/store-960.webp 960w, /images/store-1600.webp 1600w" sizes="(max-width: 768px) 100vw, (max-width: 960px) 50vw, 360px" type="image/webp">
                <img src="/images/store-960.webp" alt="Matériel et raccords de plomberie certifiés CSTB" width="1600" height="900" loading="lazy">
              </picture>
            </div>
            <p class="gallery-caption">Matériel sanitaire sélectionné chez nos partenaires (Photo Andykatib, domaine public CC0)</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section reveal">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">Proximité locale</span>
          <h2 class="section-title">Communes desservies dans le Rhône</h2>
          <p class="section-lead">Nous nous déplaçons quotidiennement sur Lyon et les communes limitrophes pour vos chantiers.</p>
        </div>
        <div class="communes-grid">
          <a href="/plombier-lyon/" class="commune-card">
            <div>
              <span class="commune-name">Lyon</span>
              <span class="commune-desc">Tous arrondissements du 1er au 9ème</span>
            </div>
            <span class="commune-arrow" aria-hidden="true">&rarr;</span>
          </a>
          <a href="/plombier-villeurbanne/" class="commune-card">
            <div>
              <span class="commune-name">Villeurbanne</span>
              <span class="commune-desc">Gratte-Ciel, Charpennes, Cusset, Tonkin</span>
            </div>
            <span class="commune-arrow" aria-hidden="true">&rarr;</span>
          </a>
          <a href="/plombier-bron/" class="commune-card">
            <div>
              <span class="commune-name">Bron</span>
              <span class="commune-desc">Centre-ville, Parilly, Terraillon</span>
            </div>
            <span class="commune-arrow" aria-hidden="true">&rarr;</span>
          </a>
          <a href="/plombier-venissieux/" class="commune-card">
            <div>
              <span class="commune-name">Vénissieux</span>
              <span class="commune-desc">Parilly, Moulin-à-Vent, Max Barel</span>
            </div>
            <span class="commune-arrow" aria-hidden="true">&rarr;</span>
          </a>
        </div>
      </div>
    </section>

    <section class="section reveal">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">Méthode de travail</span>
          <h2 class="section-title">Comment se déroule votre projet</h2>
          <p class="section-lead">Une organisation transparente en 4 étapes claires pour sécuriser chaque intervention.</p>
        </div>
        <div class="steps-grid">
          <div class="step-card">
            <div class="step-num">1</div>
            <h3 class="step-title">Prise de contact</h3>
            <p class="step-desc">Vous décrivez vos besoins d'installation ou votre panne directement en ligne ou par téléphone.</p>
          </div>
          <div class="step-card">
            <div class="step-num">2</div>
            <h3 class="step-title">Examen technique</h3>
            <p class="step-desc">Nous validons la configuration de votre réseau d'eau, les diamètres de tuyauterie et les accès.</p>
          </div>
          <div class="step-card">
            <div class="step-num">3</div>
            <h3 class="step-title">Devis détaillé</h3>
            <p class="step-desc">Émission d'un devis clair et gratuit détaillant les fournitures sanitaires et la main d'œuvre.</p>
          </div>
          <div class="step-card">
            <div class="step-num">4</div>
            <h3 class="step-title">Réalisation soignée</h3>
            <p class="step-desc">Exécution des travaux selon les normes DTU en vigueur et contrôle d'étanchéité sous pression.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section reveal">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">Conseils &amp; FAQ</span>
          <h2 class="section-title">Questions fréquentes sur la plomberie</h2>
          <p class="section-lead">Quelques réponses concrètes pour vous guider avant toute intervention.</p>
        </div>
        <div class="faq-list">
          <div class="faq-card">
            <h3 class="faq-question">Peut-on établir un diagnostic précis sans visiter l'installation ?</h3>
            <p class="faq-answer">Une première estimation d'orientation est possible par échange téléphonique, mais la validation définitive des raccordements et des pressions nécessite un contrôle visuel sur place afin d'éviter toute mauvaise surprise.</p>
          </div>
          <div class="faq-card">
            <h3 class="faq-question">Quels matériaux privilégier pour une rénovation de tuyauterie ?</h3>
            <p class="faq-answer">Le cuivre reste la référence historique pour sa robustesse et sa longévité. Le multicouche offre une excellente résistance sans dilatation excessive. Nous sélectionnons la solution la plus adaptée à la configuration de vos cloisons.</p>
          </div>
          <div class="faq-card">
            <h3 class="faq-question">Quand faut-il remplacer le groupe de sécurité d'un chauffe-eau ?</h3>
            <p class="faq-answer">Le groupe de sécurité doit être actionné une fois par mois pour chasser le calcaire. En cas d'écoulement permanent en dehors des heures de chauffe ou de blocage mécanique, son remplacement s'impose pour protéger la cuve.</p>
          </div>
          <div class="faq-card">
            <h3 class="faq-question">Vos interventions sont-elles couvertes par une assurance ?</h3>
            <p class="faq-answer">Oui, tous nos chantiers de pose et rénovation bénéficient de notre garantie assurance décennale souscrite auprès de Assureur fictif sous le contrat DEMO-0001.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section contact-section reveal" id="contact">
      <div class="container">
        <div class="contact-card">
          <div class="section-header">
            <span class="section-tag">Contact direct</span>
            <h2 class="section-title">Échangeons sur votre projet</h2>
            <p class="section-lead">Contactez notre équipe pour toute question technique ou demande de chiffrage.</p>
          </div>
          <div class="contact-details">
            <div class="contact-item">
              <span class="contact-label">Adresse de l'atelier</span>
              <p class="contact-value">1 rue de la Démonstration, 69003 Lyon</p>
            </div>
            <div class="contact-item">
              <span class="contact-label">Horaires d'ouverture</span>
              <p class="contact-value">Lundi–vendredi 8 h–18 h</p>
            </div>
            <div class="contact-item">
              <span class="contact-label">Téléphone</span>
              <p class="contact-value"><a href="tel:+33400000000">+33 4 00 00 00 00</a></p>
            </div>
            <div class="contact-item">
              <span class="contact-label">Courrier électronique</span>
              <p class="contact-value">contact@plombier.demo.invalid</p>
            </div>
          </div>
          <div class="hero-actions">
            <a href="tel:+33400000000" class="btn btn-primary">Nous joindre par téléphone</a>
          </div>
        </div>
      </div>
    </section>`;
  } else if (page.type === 'commune') {
    const c = page.cible;
    const voisins = SITE_JSON.communes.filter(item => item !== c).slice(0, 2);
    bodyContent = `
    ${breadcrumb}
    <section class="hero">
      <div class="container">
        <div class="hero-content">
          <span class="section-tag">Intervention locale à ${c}</span>
          <h1 class="hero-title">${h1}</h1>
          <p class="hero-lead">Démo Plombier Lyon intervient à ${c} et alentours pour la pose de robinetterie, rénovation de tuyauterie cuivre et PER, recherche de fuite et urgences sanitaires.</p>
          <div class="hero-actions">
            <a href="#contact" class="btn btn-primary">Demander un devis à ${c}</a>
            <a href="tel:+33400000000" class="btn btn-outline">Appeler : +33 4 00 00 00 00</a>
          </div>
        </div>
        <div class="hero-media">
          <picture>
            <source srcset="/images/hero-480.avif 480w, /images/hero-960.avif 960w, /images/hero-1600.avif 1600w" sizes="(max-width: 960px) 100vw, 1140px" type="image/avif">
            <source srcset="/images/hero-480.webp 480w, /images/hero-960.webp 960w, /images/hero-1600.webp 1600w" sizes="(max-width: 960px) 100vw, 1140px" type="image/webp">
            <img src="/images/hero-960.webp" alt="Plombier artisan en intervention sanitaire à ${c}" width="1600" height="900" fetchpriority="high">
          </picture>
        </div>
      </div>
    </section>

    <div class="trust-banner">
      <div class="container">
        <div class="trust-grid">
          <div class="trust-item">
            <div class="trust-icon" aria-hidden="true">&#10003;</div>
            <div class="trust-text">
              <span class="trust-title">Assuré décennale (Assureur fictif)</span>
              <p class="trust-desc">Contrat n° DEMO-0001 protégeant vos installations à ${c}.</p>
            </div>
          </div>
          <div class="trust-item">
            <div class="trust-icon" aria-hidden="true">&#10003;</div>
            <div class="trust-text">
              <span class="trust-title">SIREN 000000000</span>
              <p class="trust-desc">Artisan immatriculé intervenant dans le bassin de ${c}.</p>
            </div>
          </div>
          <div class="trust-item">
            <div class="trust-icon" aria-hidden="true">&#10003;</div>
            <div class="trust-text">
              <span class="trust-title">Devis clair et gratuit</span>
              <p class="trust-desc">Étude de votre installation à ${c} sans frais ni engagement.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <section class="section reveal">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">Prestations à ${c}</span>
          <h2 class="section-title">Travaux de plomberie sanitaire à ${c}</h2>
          <p class="section-lead">Nous assurons des interventions pérennes pour tous vos aménagements et réparations de canalisations.</p>
        </div>
        <div class="services-grid">
          <div class="service-card">
            <div class="service-icon" aria-hidden="true">01</div>
            <h3 class="service-title">Canalisations et arrivées d'eau</h3>
            <p class="service-desc">Raccordement d'eau froide et eau chaude sanitaire, sertissage de conduites multicouche et cuivre à ${c}.</p>
          </div>
          <div class="service-card">
            <div class="service-icon" aria-hidden="true">02</div>
            <h3 class="service-title">Chauffe-eau et sécurité</h3>
            <p class="service-desc">Remplacement de chauffe-eau électrique, vidange et pose de groupe de sécurité certifié à ${c}.</p>
          </div>
          <div class="service-card">
            <div class="service-icon" aria-hidden="true">03</div>
            <h3 class="service-title">Robinetterie sanitaire</h3>
            <p class="service-desc">Montage de mitigeurs thermostatiques, réfection de joints d'étanchéité et pose d'éviers à ${c}.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section reveal">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">Réalisations</span>
          <h2 class="section-title">Exemples de chantiers récents</h2>
          <p class="section-lead">Aperçu de nos raccordements et outillages utilisés lors de nos interventions.</p>
        </div>
        <div class="gallery-grid">
          <div class="gallery-card">
            <div class="gallery-media">
              <picture>
                <source srcset="/images/tools-480.avif 480w, /images/tools-960.avif 960w, /images/tools-1600.avif 1600w" sizes="(max-width: 768px) 100vw, 50vw" type="image/avif">
                <source srcset="/images/tools-480.webp 480w, /images/tools-960.webp 960w, /images/tools-1600.webp 1600w" sizes="(max-width: 768px) 100vw, 50vw" type="image/webp">
                <img src="/images/tools-960.webp" alt="Outillage professionnel de plomberie sanitaire" width="1600" height="900" loading="lazy">
              </picture>
            </div>
            <p class="gallery-caption">Outillage de plomberie professionnelle (Photo Syced, CC0)</p>
          </div>
          <div class="gallery-card">
            <div class="gallery-media">
              <picture>
                <source srcset="/images/pipes-480.avif 480w, /images/pipes-960.avif 960w, /images/pipes-1600.avif 1600w" sizes="(max-width: 768px) 100vw, 50vw" type="image/avif">
                <source srcset="/images/pipes-480.webp 480w, /images/pipes-960.webp 960w, /images/pipes-1600.webp 1600w" sizes="(max-width: 768px) 100vw, 50vw" type="image/webp">
                <img src="/images/pipes-960.webp" alt="Réseau hydraulique cuivre avec vannes d'arrêt" width="1600" height="900" loading="lazy">
              </picture>
            </div>
            <p class="gallery-caption">Raccordement soigné de tuyauterie (Photo Brycemilton, CC BY-SA 4.0)</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section reveal">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">Maillage local</span>
          <h2 class="section-title">Autres communes desservies à proximité</h2>
          <p class="section-lead">Nous intervenons également dans les localités voisines de ${c} :</p>
        </div>
        <div class="communes-grid">
          ${voisins.map(v => `
          <a href="/plombier-${v.toLowerCase()}/" class="commune-card">
            <div>
              <span class="commune-name">${v}</span>
              <span class="commune-desc">Dépannage et installation plomberie à ${v}</span>
            </div>
            <span class="commune-arrow" aria-hidden="true">&rarr;</span>
          </a>`).join('')}
        </div>
      </div>
    </section>

    <section class="section contact-section reveal" id="contact">
      <div class="container">
        <div class="contact-card">
          <div class="section-header">
            <span class="section-tag">Demande de devis</span>
            <h2 class="section-title">Votre plombier à ${c}</h2>
            <p class="section-lead">Un projet de plomberie à ${c} ? Contactez notre atelier pour convenir d'une visite technique.</p>
          </div>
          <div class="contact-details">
            <div class="contact-item">
              <span class="contact-label">Adresse</span>
              <p class="contact-value">1 rue de la Démonstration, 69003 Lyon</p>
            </div>
            <div class="contact-item">
              <span class="contact-label">Téléphone</span>
              <p class="contact-value"><a href="tel:+33400000000">+33 4 00 00 00 00</a></p>
            </div>
          </div>
          <div class="hero-actions">
            <a href="tel:+33400000000" class="btn btn-primary">Appeler pour une intervention à ${c}</a>
          </div>
        </div>
      </div>
    </section>`;
  } else if (page.type === 'metier') {
    bodyContent = `
    ${breadcrumb}
    <section class="hero">
      <div class="container">
        <div class="hero-content">
          <span class="section-tag">Activité complémentaire</span>
          <h1 class="hero-title">${h1}</h1>
          <p class="hero-lead">En complément de notre activité de plomberie sanitaire, Démo Plombier Lyon assure la maintenance thermique, le remplacement de chauffe-eau et l'équilibrage de vos réseaux de radiateurs.</p>
          <div class="hero-actions">
            <a href="#contact" class="btn btn-primary">Demander un devis chauffage</a>
            <a href="tel:+33400000000" class="btn btn-outline">Appeler : +33 4 00 00 00 00</a>
          </div>
        </div>
        <div class="hero-media">
          <picture>
            <source srcset="/images/hero-480.avif 480w, /images/hero-960.avif 960w, /images/hero-1600.avif 1600w" sizes="(max-width: 960px) 100vw, 1140px" type="image/avif">
            <source srcset="/images/hero-480.webp 480w, /images/hero-960.webp 960w, /images/hero-1600.webp 1600w" sizes="(max-width: 960px) 100vw, 1140px" type="image/webp">
            <img src="/images/hero-960.webp" alt="Artisan chauffagiste raccordant un circuit thermique à Lyon" width="1600" height="900" fetchpriority="high">
          </picture>
        </div>
      </div>
    </section>

    <div class="trust-banner">
      <div class="container">
        <div class="trust-grid">
          <div class="trust-item">
            <div class="trust-icon" aria-hidden="true">&#10003;</div>
            <div class="trust-text">
              <span class="trust-title">Assuré décennale (Assureur fictif)</span>
              <p class="trust-desc">Contrat n° DEMO-0001 couvrant les travaux thermiques et sanitaires.</p>
            </div>
          </div>
          <div class="trust-item">
            <div class="trust-icon" aria-hidden="true">&#10003;</div>
            <div class="trust-text">
              <span class="trust-title">SIREN 000000000</span>
              <p class="trust-desc">Entreprise qualifiée opérant selon les règles de sécurité en vigueur.</p>
            </div>
          </div>
          <div class="trust-item">
            <div class="trust-icon" aria-hidden="true">&#10003;</div>
            <div class="trust-text">
              <span class="trust-title">Devis clair et gratuit</span>
              <p class="trust-desc">Chiffrage clair et précis de votre équipement de chauffage sans engagement.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <section class="section reveal">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">Services thermiques</span>
          <h2 class="section-title">Prestations de chauffage à Lyon</h2>
          <p class="section-lead">Des solutions adaptées pour un confort thermique optimal et des consommations d'énergie maîtrisées.</p>
        </div>
        <div class="services-grid">
          <div class="service-card">
            <div class="service-icon" aria-hidden="true">01</div>
            <h3 class="service-title">Remplacement de chauffe-eau</h3>
            <p class="service-desc">Pose de ballons d'eau chaude thermodynamiques ou électriques à haut rendement avec groupe de sécurité neuf.</p>
          </div>
          <div class="service-card">
            <div class="service-icon" aria-hidden="true">02</div>
            <h3 class="service-title">Circuits de radiateurs</h3>
            <p class="service-desc">Purge, désembouage méthodique et pose de robinets thermostatiques pour équilibrer la température pièce par pièce.</p>
          </div>
          <div class="service-card">
            <div class="service-icon" aria-hidden="true">03</div>
            <h3 class="service-title">Raccordement hydraulique</h3>
            <p class="service-desc">Création de boucles de circulation en cuivre et vanne d'équilibrage pour optimiser le transfert de calories.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section reveal">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">Photos de réalisations</span>
          <h2 class="section-title">Équipements et installations</h2>
          <p class="section-lead">Consultez nos réalisations sur circuits d'eau chaude et liaisons hydrauliques.</p>
        </div>
        <div class="gallery-grid">
          <div class="gallery-card">
            <div class="gallery-media">
              <picture>
                <source srcset="/images/pipes-480.avif 480w, /images/pipes-960.avif 960w, /images/pipes-1600.avif 1600w" sizes="(max-width: 768px) 100vw, 50vw" type="image/avif">
                <source srcset="/images/pipes-480.webp 480w, /images/pipes-960.webp 960w, /images/pipes-1600.webp 1600w" sizes="(max-width: 768px) 100vw, 50vw" type="image/webp">
                <img src="/images/pipes-960.webp" alt="Raccordement de tuyauteries hydrauliques en cuivre" width="1600" height="900" loading="lazy">
              </picture>
            </div>
            <p class="gallery-caption">Tuyauterie hydraulique (Photo Brycemilton, CC BY-SA 4.0)</p>
          </div>
          <div class="gallery-card">
            <div class="gallery-media">
              <picture>
                <source srcset="/images/store-480.avif 480w, /images/store-960.avif 960w, /images/store-1600.avif 1600w" sizes="(max-width: 768px) 100vw, 50vw" type="image/avif">
                <source srcset="/images/store-480.webp 480w, /images/store-960.webp 960w, /images/store-1600.webp 1600w" sizes="(max-width: 768px) 100vw, 50vw" type="image/webp">
                <img src="/images/store-960.webp" alt="Composants et raccords de chauffage professionnel" width="1600" height="900" loading="lazy">
              </picture>
            </div>
            <p class="gallery-caption">Équipements thermiques professionnels (Photo Andykatib, CC0)</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section contact-section reveal" id="contact">
      <div class="container">
        <div class="contact-card">
          <div class="section-header">
            <span class="section-tag">Contact</span>
            <h2 class="section-title">Contacter votre chauffagiste</h2>
            <p class="section-lead">Discutons ensemble de vos besoins d'amélioration thermique ou de production d'eau chaude.</p>
          </div>
          <div class="contact-details">
            <div class="contact-item">
              <span class="contact-label">Atelier</span>
              <p class="contact-value">1 rue de la Démonstration, 69003 Lyon</p>
            </div>
            <div class="contact-item">
              <span class="contact-label">Téléphone</span>
              <p class="contact-value"><a href="tel:+33400000000">+33 4 00 00 00 00</a></p>
            </div>
          </div>
          <div class="hero-actions">
            <a href="tel:+33400000000" class="btn btn-primary">Nous contacter pour votre chauffage</a>
          </div>
        </div>
      </div>
    </section>`;
  } else if (page.chemin.includes('mentions')) {
    bodyContent = `
    <div class="legal-content container">
      <div class="legal-card">
        <h1 class="section-title">${h1}</h1>
        <div class="legal-section">
          <h2>Nature du site</h2>
          <p>Site de démonstration : entreprise fictive créée pour illustrer les capacités techniques et de référencement de la solution Presti.</p>
        </div>
        <div class="legal-section">
          <h2>Identité de l'entreprise</h2>
          <p><strong>Dénomination :</strong> Démo Plombier Lyon</p>
          <p><strong>Adresse :</strong> 1 rue de la Démonstration, 69003 Lyon, France</p>
          <p><strong>Téléphone :</strong> +33 4 00 00 00 00</p>
          <p><strong>Email :</strong> contact@plombier.demo.invalid</p>
          <p><strong>Numéro SIREN :</strong> 000000000</p>
          <p><strong>Directeur de la publication :</strong> Responsable Démo Plombier</p>
        </div>
        <div class="legal-section">
          <h2>Garantie et assurance décennale</h2>
          <p>L'entreprise est couverte au titre de son assurance décennale obligatoire :</p>
          <p><strong>Assureur :</strong> Assureur fictif</p>
          <p><strong>Numéro de contrat :</strong> DEMO-0001</p>
          <p><strong>Couverture géographique :</strong> France métropolitaine</p>
        </div>
        <div class="legal-section">
          <h2>Hébergement du site</h2>
          <p>Ce site statique est hébergé localement dans le cadre de son environnement de démonstration technique.</p>
        </div>
        <div class="legal-section">
          <h2>Crédits photographiques</h2>
          <p>Les photographies illustrant ce site de démonstration sont issues de Wikimedia Commons et publiées sous licences libres certifiées :</p>
          <ul>
            <li>Photographie de robinetterie : auteur W.carter (licence CC BY-SA 4.0, source Wikimedia Commons)</li>
            <li>Photographie de tuyauteries : auteur Brycemilton (licence CC BY-SA 4.0, source Wikimedia Commons)</li>
            <li>Photographie de réparation : auteur Syced (domaine public CC0, source Wikimedia Commons)</li>
            <li>Photographie d'outillage de plomberie : auteur Syced (domaine public CC0, source Wikimedia Commons)</li>
            <li>Photographie de fournitures sanitaires : auteur Andykatib (domaine public CC0, source Wikimedia Commons)</li>
          </ul>
        </div>
      </div>
    </div>`;
  } else {
    bodyContent = `
    <div class="legal-content container">
      <div class="legal-card">
        <h1 class="section-title">${h1}</h1>
        <div class="legal-section">
          <h2>Collecte des données personnelles</h2>
          <p>Ce site de démonstration ne dépose aucun cookie traceur, aucun cookie publicitaire et ne met en œuvre aucun outil tiers de profilage ou de mesure d'audience.</p>
        </div>
        <div class="legal-section">
          <h2>Formulaire de contact</h2>
          <p>Les coordonnées éventuellement saisies par un utilisateur pour demander un devis ou poser une question technique (nom, téléphone, adresse email) sont strictement destinées au traitement de la demande de contact direct.</p>
          <p>Aucune donnée n'est cédée, louée ou commercialisée à des tiers.</p>
        </div>
        <div class="legal-section">
          <h2>Durée de conservation</h2>
          <p>Les échanges techniques sont conservés uniquement pendant la durée nécessaire à l'établissement du devis et au suivi du chantier, dans le respect des obligations légales de facturation et d'archivage.</p>
        </div>
        <div class="legal-section">
          <h2>Vos droits</h2>
          <p>Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez d'un droit d'accès, de rectification et de suppression des informations vous concernant, exerçable sur simple demande auprès de contact@plombier.demo.invalid.</p>
        </div>
      </div>
    </div>`;
  }

  return `<!DOCTYPE html>
<html lang="fr" class="no-js">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${metaDesc}">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${BASE_URL}${page.chemin}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${metaDesc}">
  <meta property="og:image" content="${BASE_URL}/images/hero-1600.webp">
  <link rel="preload" href="/fonts/manrope.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/styles.css">
  <noscript><style>.reveal { opacity: 1 !important; transform: none !important; }</style></noscript>
  <script>document.documentElement.classList.replace('no-js', 'js');</script>
${jsonLd}
</head>
<body>
${buildHeader(page)}
  <main class="site-main">
${bodyContent}
  </main>
${buildFooter(SITE_JSON.communes)}
  <script src="/site.js" defer></script>
</body>
</html>`;
}

function generateSite() {
  console.log('Generating site in ' + DIR);
  fs.writeFileSync(path.join(DIR, 'site.json'), JSON.stringify(SITE_JSON, null, 2));
  fs.writeFileSync(path.join(DIR, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${BASE_URL}/sitemap.xml\n`);
  fs.writeFileSync(path.join(DIR, 'styles.css'), CSS_CONTENT.trim() + '\n');
  fs.writeFileSync(path.join(DIR, 'site.js'), JS_CONTENT.trim() + '\n');

  const today = new Date().toISOString().split('T')[0];
  const sitemapUrls = SITE_JSON.pages
    .filter(p => p.type !== 'legal')
    .map(p => `  <url>\n    <loc>${BASE_URL}${p.chemin}</loc>\n    <lastmod>${today}</lastmod>\n  </url>`)
    .join('\n');
  fs.writeFileSync(path.join(DIR, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls}\n</urlset>\n`);

  for (const page of SITE_JSON.pages) {
    const pageDir = path.join(DIR, page.chemin.replace(/^\//, ''));
    if (!fs.existsSync(pageDir)) fs.mkdirSync(pageDir, { recursive: true });
    const html = buildHtml(page);
    fs.writeFileSync(path.join(pageDir, 'index.html'), html);
    console.log('Generated ' + page.chemin + 'index.html');
  }

  console.log('Site generation complete.');
}

generateSite();
