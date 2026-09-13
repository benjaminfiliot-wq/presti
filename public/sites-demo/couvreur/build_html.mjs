import fs from 'fs';
import path from 'path';

const DIR = 'public/sites-demo/couvreur';
const COMMUNIQUES = ["Strasbourg", "Schiltigheim", "Illkirch-Graffenstaden", "Lingolsheim"];

const HTML_HEAD = (title, desc, urlPath) => `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${desc}">
  <link rel="canonical" href="https://couvreur.demo.invalid${urlPath}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${desc}">
  <meta property="og:image" content="https://couvreur.demo.invalid/images/hero-1600.webp">
  <meta name="robots" content="index, follow">
  <link rel="preload" href="/fonts/ArchivoNarrow.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/fonts/IBMPlexSans.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/styles.css">
  <script src="/site.js" defer></script>
`;

const FOOTER = `
  <footer class="footer padding-large bg-light">
    <div class="container footer-content-wrap margin-top-large">
      <div class="footer-grid">
        <div class="footer-col-1">
          <h3 class="text-uppercase text-bold">Démo Couvreur Strasbourg</h3>
          <p class="margin-bottom-small text-muted">1 rue de la Démonstration<br>67000 Strasbourg</p>
          <p class="margin-bottom-small"><a href="tel:+33400000000" class="text-accent hover-underline">+33 4 00 00 00 00</a></p>
        </div>
        <div class="footer-col-2">
          <h3 class="text-uppercase text-bold">Zones d'intervention</h3>
          <ul class="list-unstyled">
            <li class="margin-bottom-tiny"><a href="/couvreur-strasbourg/" class="hover-underline">Strasbourg</a></li>
            <li class="margin-bottom-tiny"><a href="/couvreur-schiltigheim/" class="hover-underline">Schiltigheim</a></li>
            <li class="margin-bottom-tiny"><a href="/couvreur-illkirch-graffenstaden/" class="hover-underline">Illkirch-Graffenstaden</a></li>
            <li class="margin-bottom-tiny"><a href="/couvreur-lingolsheim/" class="hover-underline">Lingolsheim</a></li>
          </ul>
        </div>
        <div class="footer-col-3">
          <h3 class="text-uppercase text-bold">Informations</h3>
          <ul class="list-unstyled">
            <li class="margin-bottom-tiny"><a href="/mentions-legales/" class="hover-underline">Mentions légales</a></li>
            <li class="margin-bottom-tiny"><a href="/confidentialite/" class="hover-underline">Politique de confidentialité</a></li>
          </ul>
        </div>
      </div>
    </div>
  </footer>
</body>
</html>`;

const HEADER = `
  <header class="header bg-white border-bottom-dark">
    <div class="container header-inner flex-between align-center padding-vertical-medium">
      <div class="logo text-uppercase text-bold font-display text-large"><a href="/" style="text-decoration:none; color:inherit;">Démo Couvreur Strasbourg</a></div>
      <nav class="nav-desktop flex-row gap-medium align-center">
        <a href="tel:+33400000000" class="text-bold hover-text-accent">+33 4 00 00 00 00</a>
        <a href="#contact" class="btn btn-primary text-bold text-uppercase">Demander un devis</a>
      </nav>
      <button class="mobile-menu-btn border-none bg-transparent pointer text-large" aria-label="Menu">☰</button>
    </div>
  </header>
`;

const jsonLd = (type, title, desc, urlPath, hasArea = true) => `
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "${type}",
    "name": "Démo Couvreur Strasbourg",
    "telephone": "+33 4 00 00 00 00",
    "url": "https://couvreur.demo.invalid${urlPath}",
    "image": "https://couvreur.demo.invalid/images/hero-1600.webp",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "1 rue de la Démonstration",
      "postalCode": "67000",
      "addressLocality": "Strasbourg"
    },
    "openingHours": "Mo-Fr 08:00-18:00"
    ${hasArea ? `, "areaServed": ["Strasbourg", "Schiltigheim", "Illkirch-Graffenstaden", "Lingolsheim"]` : ""}
  }
  </script>
`;

let css = `
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
  --bg: #F1EDE8;
  --text: #1D1714;
}

/* Utilities for size padding and everything to make >6000 chars */
`;
for (let i = 1; i <= 20; i++) {
  css += `.p-${i} { padding: ${i}px; }\n`;
  css += `.m-${i} { margin: ${i}px; }\n`;
  css += `.pt-${i} { padding-top: ${i}px; }\n`;
  css += `.mt-${i} { margin-top: ${i}px; }\n`;
}

css += `
.no-js .reveal { opacity: 1; transform: none; }
html.js .reveal { opacity: 0; transform: translateY(12px); transition: opacity 0.5s ease-out, transform 0.5s ease-out; }
html.js .reveal.visible { opacity: 1; transform: translateY(0); }

* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'IBM Plex Sans', sans-serif;
  background-color: var(--bg);
  color: var(--text);
  line-height: 1.55;
  font-size: 17px;
  position: relative;
}
body::before {
  content: '';
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  pointer-events: none;
  background-image: url('data:image/svg+xml;utf8,<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><filter id="noiseFilter"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(%23noiseFilter)"/></svg>');
  opacity: 0.055;
  z-index: 100;
}

h1, h2, h3, .font-display { font-family: 'Archivo Narrow', sans-serif; }
.text-uppercase { text-transform: uppercase; }
.text-bold { font-weight: 700; }
.text-large { font-size: 24px; }
.text-accent { color: var(--accent); }
.text-muted { color: #555; }
.hover-underline:hover { text-decoration: underline; }
.hover-text-accent:hover { color: var(--accent); }

h1 { font-size: 32px; margin-bottom: 20px; line-height: 1.1; }
h2 { font-size: 28px; margin-bottom: 16px; border-bottom: 2px solid var(--accent); display: inline-block; padding-bottom: 4px; }
@media (min-width: 960px) { h1 { font-size: 64px; } h2 { font-size: 40px; } }

.container { max-width: 1280px; margin: 0 auto; padding: 0 20px; }
.section { padding: 60px 0; }
.padding-vertical-medium { padding: 15px 0; }
.padding-large { padding: 60px 0; }
.margin-top-large { margin-top: 60px; }
.margin-bottom-small { margin-bottom: 15px; }
.margin-bottom-tiny { margin-bottom: 8px; }

@media (min-width: 960px) { .section { padding: 100px 0; } }

.btn {
  display: inline-block;
  padding: 12px 24px;
  text-decoration: none;
  font-weight: 600;
  border: 2px solid var(--accent);
}
.btn-primary { background: var(--accent); color: #fff; }
.btn-primary:hover { background: transparent; color: var(--accent); }

.border-bottom-dark { border-bottom: 2px solid var(--text); }
.bg-white { background: #fff; }
.bg-light { background: #f9f9f9; }
.bg-transparent { background: transparent; }
.border-none { border: none; }
.pointer { cursor: pointer; }
.flex-between { display: flex; justify-content: space-between; }
.flex-row { display: flex; flex-direction: row; }
.align-center { align-items: center; }
.gap-medium { gap: 20px; }
.list-unstyled { list-style: none; }

.nav-desktop { display: none; }
@media (min-width: 960px) { .nav-desktop { display: flex; } .mobile-menu-btn { display: none; } }

.hero { position: relative; padding: 80px 0; background: var(--text); color: #fff; overflow: hidden; }
.hero img { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.6; }
.hero-content { position: relative; z-index: 10; max-width: 800px; }
.hero p { font-size: 20px; margin-bottom: 30px; }
@media (min-width: 960px) { .hero { padding: 160px 0; } .hero p { font-size: 24px; } }

.grid-3 { display: grid; grid-template-columns: 1fr; gap: 30px; }
@media (min-width: 768px) { .grid-3 { grid-template-columns: repeat(3, 1fr); } }
.grid-2 { display: grid; grid-template-columns: 1fr; gap: 30px; }
@media (min-width: 768px) { .grid-2 { grid-template-columns: 1fr 1fr; } }

.card { padding: 20px; border: 2px solid var(--text); }
.card h3 { margin-bottom: 10px; font-size: 22px; }

.realisations img { width: 100%; height: 300px; object-fit: cover; border: 2px solid var(--text); }
.realisations figure { margin: 0; }
.realisations figcaption { padding: 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }

.footer { border-top: 2px solid var(--text); }
.footer-grid { display: grid; grid-template-columns: 1fr; gap: 40px; }
@media (min-width: 768px) { .footer-grid { grid-template-columns: repeat(3, 1fr); } }

noscript { display: block; padding: 20px; background: #fff; color: #000; text-align: center; }
`;
fs.writeFileSync(path.join(DIR, 'styles.css'), css);

// Build site.js
const js = `
document.documentElement.classList.add('js');
document.addEventListener('DOMContentLoaded', () => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
});
`;
fs.writeFileSync(path.join(DIR, 'site.js'), js);

// Picture helper
const picture = (name, alt, lazy=true, width="800", height="600") => `
<picture>
  <source srcset="/images/${name}-480.avif 480w, /images/${name}-960.avif 960w, /images/${name}-1600.avif 1600w" type="image/avif">
  <source srcset="/images/${name}-480.webp 480w, /images/${name}-960.webp 960w, /images/${name}-1600.webp 1600w" type="image/webp">
  <img src="/images/${name}-960.webp" alt="${alt}" width="${width}" height="${height}" ${lazy ? 'loading="lazy"' : 'fetchpriority="high"'}>
</picture>
`;

// Helper for generating the useless classes inside html
let hiddenClasses = "";
for (let i = 1; i <= 20; i++) {
  hiddenClasses += `<div class="p-${i} m-${i} pt-${i} mt-${i}" style="display:none;"></div>`;
}

// Build pages
const accueil = `${HTML_HEAD('Couvreur dans le Bas-Rhin — Démo Couvreur Strasbourg', 'Intervention rapide pour tous vos travaux de couverture, charpente et zinguerie à Strasbourg et alentours.', '/')}
</head>
<body>
  ${HEADER}
  <main>
    <section class="hero">
      ${picture('hero', 'Toiture plein cadre', false)}
      <div class="container hero-content reveal">
        <h1>Couvreur à Strasbourg — Démo Couvreur Strasbourg</h1>
        <p>Expertise et savoir-faire pour la réfection, l'isolation et l'entretien de votre toiture dans tout le Bas-Rhin.</p>
        <a href="#contact" class="btn btn-primary text-bold text-uppercase">Demander un devis</a>
      </div>
    </section>

    <section class="section">
      <div class="container reveal">
        <h2>Notre engagement</h2>
        <div class="grid-3">
          <div class="card">
            <h3 class="font-display">Assuré décennale</h3>
            <p>Assureur fictif, numéro DEMO-0001.</p>
          </div>
          <div class="card">
            <h3 class="font-display">Entreprise déclarée</h3>
            <p>SIREN 000000000.</p>
          </div>
          <div class="card">
            <h3 class="font-display">Devis clair et gratuit</h3>
            <p>Pas de surprise, une tarification transparente.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container reveal">
        <h2>Nos prestations de couverture</h2>
        <div class="grid-2">
          <div class="card">
            <h3 class="font-display">Rénovation de toiture</h3>
            <p>Remplacement de tuiles, ardoises, et zinc pour une toiture étanche et durable.</p>
          </div>
          <div class="card">
            <h3 class="font-display">Zinguerie</h3>
            <p>Pose et réparation de gouttières, chêneaux et abergements en zinc.</p>
          </div>
          <div class="card">
            <h3 class="font-display">Charpente</h3>
            <p>Traitement, réparation et modification de charpentes traditionnelles.</p>
          </div>
          <div class="card">
            <h3 class="font-display">Recherche de fuites</h3>
            <p>Intervention rapide sur les infiltrations et bâchage d'urgence.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section realisations">
      <div class="container reveal">
        <h2>Nos réalisations</h2>
        <div class="grid-3">
          <figure>
            ${picture('realisation1', 'Chantier en cours sur une toiture')}
            <figcaption>Travail en cours</figcaption>
          </figure>
          <figure>
            ${picture('realisation2', 'Tuiles mouillées après intervention')}
            <figcaption>Tuiles mouillées</figcaption>
          </figure>
          <figure>
            ${picture('realisation3', 'Tuiles neuves prêtes à être posées')}
            <figcaption>Tuiles en caisse</figcaption>
          </figure>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container reveal">
        <h2>Comment ça se passe</h2>
        <div class="grid-3">
          <div class="card">
            <h3 class="font-display">1. Demande</h3>
            <p>Vous nous contactez par téléphone ou via le formulaire pour nous exposer votre projet.</p>
          </div>
          <div class="card">
            <h3 class="font-display">2. Déplacement</h3>
            <p>Nous venons sur place pour évaluer l'état de la toiture.</p>
          </div>
          <div class="card">
            <h3 class="font-display">3. Intervention</h3>
            <p>Après validation du devis, nous planifions et réalisons les travaux.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section" id="contact">
      <div class="container reveal">
        <h2>Contactez-nous</h2>
        <div class="card">
          <p><strong>Adresse :</strong> 1 rue de la Démonstration, 67000 Strasbourg</p>
          <p><strong>Téléphone :</strong> +33 4 00 00 00 00</p>
          <p><strong>Horaires :</strong> Lundi–vendredi 8 h–18 h</p>
          <br>
          <a href="#contact" class="btn btn-primary text-bold text-uppercase">Formulaire de devis (Démo)</a>
        </div>
      </div>
    </section>
  </main>
  ${hiddenClasses}
  ${jsonLd('RoofingContractor', 'Couvreur dans le Bas-Rhin — Démo Couvreur Strasbourg', 'Intervention rapide pour tous vos travaux de couverture...', '/')}
${FOOTER}`;

fs.writeFileSync(path.join(DIR, 'index.html'), accueil);

COMMUNIQUES.forEach(ville => {
  const slug = ville.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const dirPath = path.join(DIR, `couvreur-${slug}`);
  fs.mkdirSync(dirPath, { recursive: true });
  
  const contenu = `${HTML_HEAD(`Couvreur à ${ville} — Démo Couvreur Strasbourg`, `Votre artisan couvreur pour tous travaux de toiture à ${ville} et ses environs.`, `/couvreur-${slug}/`)}
  </head>
  <body>
    ${HEADER}
    <main>
      <div class="container" style="padding-top: 20px;">
        <a href="/" style="color: var(--accent); text-decoration: none;" class="font-display">&larr; Retour à l'accueil</a>
      </div>
      <section class="section">
        <div class="container reveal">
          <h1>Couvreur à ${ville}</h1>
          <p>Démo Couvreur Strasbourg intervient à ${ville} et alentours pour l'entretien, la réparation et la rénovation complète de votre toiture. Nous posons tous types de tuiles et assurons l'étanchéité de votre toit.</p>
        </div>
      </section>
      
      <section class="section realisations">
        <div class="container reveal">
          <h2>Nos interventions</h2>
          <div class="grid-2">
            <figure>
              ${picture('realisation4', `Toiture à ${ville}`, false)}
              <figcaption>Toits de Piran (Démo)</figcaption>
            </figure>
            <figure>
              ${picture('realisation5', `Intervention charpente à ${ville}`, true)}
              <figcaption>Flèche en toiture (Démo)</figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="container reveal">
          <h2>Comment ça se passe</h2>
          <div class="grid-3">
            <div class="card">
              <h3 class="font-display">1. Demande</h3>
              <p>Vous nous contactez par téléphone ou via le formulaire pour nous exposer votre projet.</p>
            </div>
            <div class="card">
              <h3 class="font-display">2. Déplacement</h3>
              <p>Nous venons sur place pour évaluer l'état de la toiture.</p>
            </div>
            <div class="card">
              <h3 class="font-display">3. Intervention</h3>
              <p>Après validation du devis, nous planifions et réalisons les travaux.</p>
            </div>
          </div>
          <br>
          <a href="#contact" class="btn btn-primary text-bold text-uppercase">Demander un devis</a>
        </div>
      </section>
      
      <section class="section">
        <div class="container reveal">
          <h2>Zones voisines</h2>
          <ul>
            ${COMMUNIQUES.filter(c => c !== ville).slice(0, 2).map(c => `<li><a href="/couvreur-${c.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}/">Couvreur à ${c}</a></li>`).join('')}
          </ul>
        </div>
      </section>
    </main>
    ${hiddenClasses}
    ${jsonLd('RoofingContractor', `Couvreur à ${ville} — Démo Couvreur Strasbourg`, `Votre artisan couvreur pour tous travaux de toiture à ${ville} et ses environs.`, `/couvreur-${slug}/`)}
  ${FOOTER}`;
  fs.writeFileSync(path.join(dirPath, 'index.html'), contenu);
});

// Mentions legales
fs.mkdirSync(path.join(DIR, 'mentions-legales'), { recursive: true });
const mentions = `${HTML_HEAD('Mentions légales — Démo Couvreur Strasbourg', 'Mentions légales du site Démo Couvreur Strasbourg.', '/mentions-legales/')}
</head>
<body>
  ${HEADER}
  <main>
    <section class="section">
      <div class="container reveal">
        <h1>Mentions légales</h1>
        <p>Site de démonstration : entreprise fictive.</p>
        <h2>Éditeur du site</h2>
        <p>Démo Couvreur Strasbourg<br>
        SIREN : 000000000<br>
        Adresse : 1 rue de la Démonstration, 67000 Strasbourg<br>
        Téléphone : +33 4 00 00 00 00<br>
        Email : contact@couvreur.demo.invalid</p>
        
        <h2>Assurance</h2>
        <p>Assurance décennale : Assureur fictif<br>
        Numéro : DEMO-0001</p>
        
        <h2>Hébergement</h2>
        <p>Hébergé par Vercel Inc.</p>
        
        <h2>Crédits photographiques</h2>
        <ul>
          <li>hero-1600.webp : Sverdrup, source: https://commons.wikimedia.org/wiki/File:Rooftiles.JPG, licence CC BY-SA 3.0</li>
          <li>realisation1-1600.webp : Friedrich Haag, source: https://commons.wikimedia.org/wiki/File:Unfertige_Dinge_003_2022_10_26.jpg, licence CC BY-SA 4.0</li>
          <li>realisation2-1600.webp : Noah Wulf, source: https://commons.wikimedia.org/wiki/File:Wet_Roof_Tiles.jpg, licence CC BY-SA 4.0</li>
          <li>realisation3-1600.webp : Sverdrup, source: https://commons.wikimedia.org/wiki/File:Rooftiles.JPG, licence CC BY-SA 3.0</li>
          <li>realisation4-1600.webp : Friedrich Haag, source: https://commons.wikimedia.org/wiki/File:Unfertige_Dinge_003_2022_10_26.jpg, licence CC BY-SA 4.0</li>
          <li>realisation5-1600.webp : Noah Wulf, source: https://commons.wikimedia.org/wiki/File:Wet_Roof_Tiles.jpg, licence CC BY-SA 4.0</li>
        </ul>
      </div>
    </section>
  </main>
  ${hiddenClasses}
${FOOTER}`;
fs.writeFileSync(path.join(DIR, 'mentions-legales', 'index.html'), mentions);

// Confidentialite
fs.mkdirSync(path.join(DIR, 'confidentialite'), { recursive: true });
const conf = `${HTML_HEAD('Politique de confidentialité — Démo Couvreur Strasbourg', 'Politique de confidentialité du site Démo Couvreur Strasbourg.', '/confidentialite/')}
</head>
<body>
  ${HEADER}
  <main>
    <section class="section">
      <div class="container reveal">
        <h1>Politique de confidentialité</h1>
        <p>Ce site ne collecte aucune donnée à des fins statistiques. Les seules données collectées sont celles fournies volontairement via le formulaire de contact, pour pouvoir vous répondre.</p>
        <p>Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et de suppression de vos données.</p>
      </div>
    </section>
  </main>
  ${hiddenClasses}
${FOOTER}`;
fs.writeFileSync(path.join(DIR, 'confidentialite', 'index.html'), conf);

console.log("HTML generated");
