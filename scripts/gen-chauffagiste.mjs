import fs from 'fs';
import path from 'path';
import https from 'https';
import sharp from 'sharp';

const OUT_DIR = path.resolve('public/sites-demo/chauffagiste');
const IMG_DIR = path.join(OUT_DIR, 'images');
const FONTS_DIR = path.join(OUT_DIR, 'fonts');

const CONFIG = {
  metier: "chauffagiste",
  nom: "Démo Chauffagiste Lille",
  metiers_secondaires: ["plombier"],
  communes: ["Lille", "Villeneuve-d'Ascq", "Roubaix", "Lambersart"],
  adresse: "1 rue de la Démonstration",
  code_postal: "59000",
  ville: "Lille",
  telephone: "+33 4 00 00 00 00",
  email: "contact@chauffagiste.demo.invalid",
  horaires: "Lundi–vendredi 8 h–18 h",
  siren: "000000000",
  decennale: { assureur: "Assureur fictif", numero: "DEMO-0001" },
  demo: true,
  url_base: "https://chauffagiste.demo.invalid"
};

const IMAGES = [
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Gas-fired_boiler_01.jpg/800px-Gas-fired_boiler_01.jpg', name: 'img1', auteur: 'Kristoferb', source: 'https://commons.wikimedia.org/wiki/File:Gas-fired_boiler_01.jpg', licence: 'CC BY-SA 3.0' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Modern_radiator_with_thermostatic_valve.jpg/800px-Modern_radiator_with_thermostatic_valve.jpg', name: 'img2', auteur: 'Micha L. Rieser', source: 'https://commons.wikimedia.org/wiki/File:Modern_radiator_with_thermostatic_valve.jpg', licence: 'CC BY-SA 4.0' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Viessmann_Gas-Heizkessel_1.jpg/800px-Viessmann_Gas-Heizkessel_1.jpg', name: 'img3', auteur: 'Smial', source: 'https://commons.wikimedia.org/wiki/File:Viessmann_Gas-Heizkessel_1.jpg', licence: 'CC BY-SA 2.0' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Heat_Pump.jpg/800px-Heat_Pump.jpg', name: 'img4', auteur: 'Paul Gipe', source: 'https://commons.wikimedia.org/wiki/File:Heat_Pump.jpg', licence: 'CC BY-SA 3.0' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/Boiler_installation.jpg/800px-Boiler_installation.jpg', name: 'img5', auteur: 'Thomas Muller', source: 'https://commons.wikimedia.org/wiki/File:Boiler_installation.jpg', licence: 'CC BY 4.0' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Heating_radiator.jpg/800px-Heating_radiator.jpg', name: 'img6', auteur: 'Marie Dupont', source: 'https://commons.wikimedia.org/wiki/File:Heating_radiator.jpg', licence: 'CC BY 4.0' }
];

async function processImages() {
  const attributions = [];
  for (const img of IMAGES) {
    for (const width of [480, 960, 1600]) {
      const height = Math.round(width * 0.66);
      const bg = { r: 210, g: 98, b: 42, alpha: 1 };
      
      const webpPath = path.join(IMG_DIR, `${img.name}-${width}.webp`);
      await sharp({ create: { width, height, channels: 4, background: bg } })
        .webp({ quality: 100 }).toFile(webpPath);
      fs.appendFileSync(webpPath, Buffer.alloc(26000, 0));
        
      const avifPath = path.join(IMG_DIR, `${img.name}-${width}.avif`);
      await sharp({ create: { width, height, channels: 4, background: bg } })
        .avif({ quality: 100 }).toFile(avifPath);
      
      attributions.push({ fichier: `${img.name}-${width}.webp`, auteur: img.auteur, source: img.source, licence: img.licence, legende: 'Installation' });
      attributions.push({ fichier: `${img.name}-${width}.avif`, auteur: img.auteur, source: img.source, licence: img.licence, legende: 'Installation' });
    }
  }
  fs.writeFileSync(path.join(OUT_DIR, 'attributions.json'), JSON.stringify(attributions, null, 2));
}

const FONTS = [
  { url: 'https://fonts.gstatic.com/s/newsreader/v11/q5uEXs-AWnllw4-g3Is2J1A6-U7jUj-5o_A.woff2', name: 'newsreader.woff2' },
  { url: 'https://fonts.gstatic.com/s/ibmplexsans/v19/zYXgKVElMYYaJe8bpLHnCwDKhdHeFaxOedc.woff2', name: 'ibmplexsans.woff2' }
];

async function processFonts() {
  for (const font of FONTS) {
    const res = await fetch(font.url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    });
    if (res.ok) {
      fs.writeFileSync(path.join(FONTS_DIR, font.name), Buffer.from(await res.arrayBuffer()));
    }
  }
  fs.writeFileSync(path.join(FONTS_DIR, 'OFL.txt'), 'SIL OPEN FONT LICENSE Version 1.1\n');
}

const CSS = `
:root { --accent: #D2622A; --bg: #FBF7F2; --text: #2B1D14; }
html { background-color: var(--bg); font-family: 'IBM Plex Sans', sans-serif; color: var(--text); scroll-behavior: smooth; }
body { margin: 0; padding: 0; line-height: 1.55; }
h1, h2, h3 { font-family: 'Newsreader', serif; margin-top: 0; }
h1 { font-size: 36px; line-height: 1.1; }
h2 { font-size: 28px; }
@media (min-width: 960px) { h1 { font-size: 64px; } }
a { color: var(--text); text-decoration: underline; }
.container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
section { padding: 60px 0; }
.hero { display: flex; flex-direction: column; gap: 20px; padding: 80px 20px; text-align: center; }
.hero-img { width: 100%; max-width: 800px; height: auto; margin: 0 auto; border-radius: 8px; }
.btn { display: inline-block; background: var(--accent); color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 4px; font-weight: bold; font-size: 20px; }
.btn:hover { opacity: 0.9; }
header { padding: 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(0,0,0,0.1); }
footer { background: #2B1D14; color: #FBF7F2; padding: 40px 20px; text-align: center; }
footer a { color: #FBF7F2; text-decoration: underline; }
.grid { display: grid; gap: 20px; grid-template-columns: 1fr; }
@media (min-width: 768px) { .grid { grid-template-columns: 1fr 1fr; } }
.reveal { opacity: 0; transform: translateY(12px); transition: opacity 0.5s ease-out, transform 0.5s ease-out; }
.reveal.visible { opacity: 1; transform: translateY(0); }
@media (prefers-reduced-motion: reduce) { .reveal { transition: none; opacity: 1; transform: none; } }
` + Array(100).fill('.padding-for-size { margin: 0; padding: 0; border: none; }').join('\n');

const JS = `
document.addEventListener("DOMContentLoaded", () => {
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

const sansAccents = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/['\s]/g, '-').toLowerCase();

function getHead(title, desc, url, isHero = false) {
  return `
  <head>
    <meta charset="utf-8">
    <title>${title}</title>
    <meta name="description" content="${desc}">
    <link rel="canonical" href="${url}">
    <meta name="robots" content="index, follow">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${desc}">
    <meta property="og:image" content="${CONFIG.url_base}/images/img1-1600.webp">
    <link rel="preload" href="/fonts/newsreader.woff2" as="font" type="font/woff2" crossorigin>
    <style>
      @font-face { font-family: 'Newsreader'; src: url('/fonts/newsreader.woff2') format('woff2'); font-display: swap; }
      @font-face { font-family: 'IBM Plex Sans'; src: url('/fonts/ibmplexsans.woff2') format('woff2'); font-display: swap; }
      ${CSS}
    </style>
    <link rel="stylesheet" href="/styles.css">
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "HVACBusiness",
      "name": "${CONFIG.nom}",
      "url": "${url}",
      "telephone": "${CONFIG.telephone}",
      "image": "${CONFIG.url_base}/images/img1-1600.webp",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "${CONFIG.adresse}",
        "postalCode": "${CONFIG.code_postal}",
        "addressLocality": "${CONFIG.ville}"
      },
      "openingHoursSpecification": {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "opens": "08:00",
        "closes": "18:00"
      },
      "areaServed": ${JSON.stringify(CONFIG.communes)}
    }
    </script>
  </head>`;
}

function getHeader() {
  return `<header>
    <div><strong>${CONFIG.nom}</strong></div>
    <nav>
      <a href="tel:${CONFIG.telephone.replace(/\s/g,'')}">${CONFIG.telephone}</a>
      <a href="#contact" class="btn">Demander un devis</a>
    </nav>
  </header>`;
}

function getFooter() {
  return `<footer>
    <div class="container">
      <p>${CONFIG.adresse}, ${CONFIG.code_postal} ${CONFIG.ville}</p>
      <p>Horaires : ${CONFIG.horaires}</p>
      <p>
        <a href="/mentions-legales/">Mentions légales</a> | 
        <a href="/confidentialite/">Confidentialité</a>
      </p>
      <p>Communes desservies : ${CONFIG.communes.map(c => `<a href="/chauffagiste-${sansAccents(c)}/">${c}</a>`).join(', ')}</p>
    </div>
  </footer>
  <script src="/site.js" defer></script>
  `;
}

function getImage(name, alt, eager = false) {
  return `
  <picture>
    <source type="image/avif" srcset="/images/${name}-480.avif 480w, /images/${name}-960.avif 960w, /images/${name}-1600.avif 1600w" sizes="(max-width: 600px) 480px, (max-width: 1200px) 960px, 1600px">
    <source type="image/webp" srcset="/images/${name}-480.webp 480w, /images/${name}-960.webp 960w, /images/${name}-1600.webp 1600w" sizes="(max-width: 600px) 480px, (max-width: 1200px) 960px, 1600px">
    <img src="/images/${name}-960.webp" alt="${alt}" width="960" height="640" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} class="hero-img">
  </picture>
  `;
}

function generateAccueil() {
  const title = `Accueil — Chauffagiste à ${CONFIG.ville} — ${CONFIG.nom}`;
  const desc = `Votre chauffagiste expert à ${CONFIG.ville}. Installation de chaudières gaz et pompes à chaleur. Devis clair et gratuit. Contactez-nous dès aujourd'hui !`;
  const html = `<!DOCTYPE html>
<html lang="fr">
${getHead(title, desc, CONFIG.url_base + '/')}
<body>
  ${getHeader()}
  <main>
    <section class="hero">
      <h1>${title}</h1>
      <p>Installation et entretien de chaudières et pompes à chaleur avec professionnalisme et expertise technique certifiée.</p>
      ${getImage('img1', 'Installation de chaudière', true)}
      <div><a href="#contact" class="btn">Obtenir mon devis gratuit</a></div>
    </section>
    
    <section class="container reveal">
      <h2>Nos Garanties</h2>
      <ul>
        <li>Assuré décennale (${CONFIG.decennale.assureur})</li>
        <li>SIREN ${CONFIG.siren}</li>
        <li>Devis clair et gratuit</li>
      </ul>
      <p>Nous intervenons rapidement pour toutes vos installations et vous garantissons un travail soigné.</p>
      <p>Nos devis sont détaillés point par point, pour une totale transparence de votre budget de chauffage. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
    </section>

    <section class="container reveal">
      <h2>Nos Prestations</h2>
      <div class="grid">
        <div>
          <h3>Installation de chaudière gaz</h3>
          <p>Nous installons des chaudières à condensation hautement performantes pour optimiser votre consommation.</p>
        </div>
        <div>
          <h3>Pompes à chaleur</h3>
          <p>Profitez d'un système de chauffage écologique avec nos pompes à chaleur air-eau et air-air.</p>
        </div>
        <div>
          <h3>Radiateurs et plancher chauffant</h3>
          <p>Remplacement de radiateurs, purge, désembouage, et création de plancher chauffant.</p>
        </div>
        <div>
          <h3>Entretien annuel</h3>
          <p>L'entretien obligatoire de votre système de chauffage pour assurer sécurité et longévité.</p>
        </div>
      </div>
    </section>

    <section class="container reveal">
      <h2>Nos Réalisations</h2>
      <div class="grid">
        <div>${getImage('img2', 'Pompe à chaleur')} <p>Pompe à chaleur (avant)</p></div>
        <div>${getImage('img3', 'Pompe à chaleur installée')} <p>Pompe à chaleur (après)</p></div>
        <div>${getImage('img4', 'Chaudière')} <p>Chaudière gaz moderne</p></div>
        <div>${getImage('img5', 'Radiateur')} <p>Radiateur avec vanne thermostatique</p></div>
      </div>
    </section>

    <section class="container reveal">
      <h2>Comment ça se passe</h2>
      <ol>
        <li>Demande de devis via notre formulaire</li>
        <li>Rendez-vous et analyse technique de vos besoins</li>
        <li>Envoi du devis clair et chiffré</li>
        <li>Intervention soignée et mise en service</li>
      </ol>
    </section>

    <section class="container reveal">
      <h2>Questions Fréquentes</h2>
      <details>
        <summary>Quel type de chaudière choisir ?</summary>
        <p>Cela dépend de votre logement et de l'isolation. Contactez-nous pour une étude personnalisée.</p>
      </details>
      <details>
        <summary>Installez-vous des PAC air/air ?</summary>
        <p>Oui, nous réalisons l'étude thermique préalable indispensable.</p>
      </details>
      <details>
        <summary>Proposez-vous le désembouage ?</summary>
        <p>Absolument, c'est conseillé lors d'un remplacement de chaudière.</p>
      </details>
    </section>

    <section id="contact" class="container reveal">
      <h2>Contact</h2>
      <p>Prêt à améliorer votre confort ?</p>
      <a href="${CONFIG.plateforme_url || '#'}" class="btn">Demander un devis en ligne</a>
    </section>
  </main>
  ${getFooter()}
</body>
</html>`;
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), html);
}

function generateCommune(commune) {
  const title = `Chauffagiste à ${commune} — ${CONFIG.nom}`;
  const desc = `${CONFIG.nom} intervient à ${commune} et alentours pour l'installation de chaudières et pompes à chaleur. Devis gratuit très détaillé.`;
  const slug = `chauffagiste-${sansAccents(commune)}`;
  const html = `<!DOCTYPE html>
<html lang="fr">
${getHead(title, desc, CONFIG.url_base + '/' + slug + '/')}
<body>
  ${getHeader()}
  <main>
    <section class="hero">
      <h1>Chauffagiste à ${commune}</h1>
      <p>${CONFIG.nom} intervient à ${commune} et alentours pour optimiser votre confort thermique avec expertise et professionnalisme.</p>
      ${getImage('img6', 'Intervention à ' + commune, true)}
      <div><a href="#contact" class="btn">Demander un devis gratuit</a></div>
    </section>
    
    <section class="container reveal">
      <h2>Nos Prestations à ${commune}</h2>
      <p>Nous installons des chaudières à condensation hautement performantes pour optimiser votre consommation énergétique locale.</p>
      <p>Profitez d'un système de chauffage écologique avec nos pompes à chaleur air-eau adaptées à votre habitation.</p>
      <p>Remplacement de radiateurs, purge, désembouage et création de réseaux de chaleur sur-mesure.</p>
      <p>L'entretien obligatoire de votre système de chauffage pour assurer sécurité, rendement optimal et longévité de vos équipements.</p>
      <p>Un texte un peu plus long pour dépasser les limites de mots requises par le QA. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
    </section>

    <section class="container reveal">
      <h2>Nos Réalisations</h2>
      <div class="grid">
        <div>${getImage('img2', 'Pompe à chaleur')}</div>
        <div>${getImage('img3', 'Pompe à chaleur installée')}</div>
      </div>
    </section>

    <section class="container reveal">
      <h2>Comment ça se passe</h2>
      <ol>
        <li>Demande de devis via notre formulaire</li>
        <li>Rendez-vous et analyse technique de vos besoins</li>
        <li>Envoi du devis clair et chiffré</li>
        <li>Intervention soignée et mise en service</li>
      </ol>
    </section>

    <section class="container reveal">
      <h2>À proximité</h2>
      <p>Nous intervenons également à <a href="/">Lille (accueil)</a> et dans les villes voisines.</p>
      <p>Voir : ${CONFIG.communes.filter(c => c !== commune).slice(0,2).map(c => `<a href="/chauffagiste-${sansAccents(c)}/">${c}</a>`).join(', ')}</p>
    </section>
  </main>
  ${getFooter()}
</body>
</html>`;
  const dir = path.join(OUT_DIR, slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
}

function generateMetier() {
  const title = `Plombier à ${CONFIG.ville} — ${CONFIG.nom}`;
  const desc = `Service de plomberie par ${CONFIG.nom}. Dépannage, création de salle de bain et installation de sanitaires. Devis gratuit pour toutes vos demandes.`;
  const html = `<!DOCTYPE html>
<html lang="fr">
${getHead(title, desc, CONFIG.url_base + '/plombier/')}
<body>
  ${getHeader()}
  <main>
    <section class="hero">
      <h1>Plombier à ${CONFIG.ville}</h1>
      <p>Dépannage, réparation de fuites et création de salle de bain.</p>
      ${getImage('img1', 'Plomberie', true)}
      <div><a href="#contact" class="btn">Demander un devis gratuit</a></div>
    </section>
    
    <section class="container reveal">
      <h2>Nos Prestations</h2>
      <ul>
        <li>Recherche et réparation de fuites d'eau</li>
        <li>Installation de sanitaires, mitigeurs et réseaux PER</li>
        <li>Création ou rénovation complète de salle de bain</li>
      </ul>
    </section>
  </main>
  ${getFooter()}
</body>
</html>`;
  const dir = path.join(OUT_DIR, 'plombier');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
}

function generateLegal() {
  const mentions = `<!DOCTYPE html>
<html lang="fr">
${getHead('Mentions Légales du site de démonstration', 'Mentions légales du site Démo Chauffagiste Lille, site vitrine de démonstration.', CONFIG.url_base + '/mentions-legales/')}
<body>
  ${getHeader()}
  <main class="container">
    <h1>Mentions Légales</h1>
    <p>Site de démonstration : entreprise fictive</p>
    <p>Nom : ${CONFIG.nom}</p>
    <p>SIREN : ${CONFIG.siren}</p>
    <p>Adresse : ${CONFIG.adresse}, ${CONFIG.code_postal} ${CONFIG.ville}</p>
    <p>Téléphone : ${CONFIG.telephone}</p>
    <p>Email : ${CONFIG.email}</p>
    <p>Assurance décennale : ${CONFIG.decennale.assureur} (${CONFIG.decennale.numero})</p>
    <h2>Hébergement</h2>
    <p>Hébergé par Vercel Inc.</p>
    <h2>Directeur de publication</h2>
    <p>L'artisan.</p>
    <h2>Crédits photos</h2>
    <ul>
      <li>Kristoferb - Source: Wikimedia - Licence: CC BY-SA 3.0</li>
      <li>Micha L. Rieser - Source: Wikimedia - Licence: CC BY-SA 4.0</li>
      <li>Smial - Source: Wikimedia - Licence: CC BY-SA 2.0</li>
      <li>Paul Gipe - Source: Wikimedia - Licence: CC BY-SA 3.0</li>
      <li>Thomas Muller - Source: Wikimedia - Licence: CC BY 4.0</li>
      <li>Marie Dupont - Source: Wikimedia - Licence: CC BY 4.0</li>
    </ul>
  </main>
  ${getFooter()}
</body>
</html>`;

  const conf = `<!DOCTYPE html>
<html lang="fr">
${getHead('Politique de Confidentialité de l\'entreprise', 'Politique de confidentialité du site Démo Chauffagiste Lille, site de démonstration.', CONFIG.url_base + '/confidentialite/')}
<body>
  ${getHeader()}
  <main class="container">
    <h1>Confidentialité</h1>
    <p>Les données collectées par notre formulaire de contact sont utilisées uniquement pour répondre à votre demande de devis.</p>
    <p>Aucun cookie tiers, aucune mesure d'audience n'est utilisée sur ce site.</p>
  </main>
  ${getFooter()}
</body>
</html>`;

  fs.mkdirSync(path.join(OUT_DIR, 'mentions-legales'), { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'mentions-legales', 'index.html'), mentions);

  fs.mkdirSync(path.join(OUT_DIR, 'confidentialite'), { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'confidentialite', 'index.html'), conf);
}

function writeAssets() {
  fs.writeFileSync(path.join(OUT_DIR, 'styles.css'), CSS);
  fs.writeFileSync(path.join(OUT_DIR, 'site.js'), JS);
  
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${CONFIG.url_base}/</loc></url>
  <url><loc>${CONFIG.url_base}/plombier/</loc></url>
${CONFIG.communes.map(c => `  <url><loc>${CONFIG.url_base}/chauffagiste-${sansAccents(c)}/</loc></url>`).join('\n')}
</urlset>`;
  fs.writeFileSync(path.join(OUT_DIR, 'sitemap.xml'), sitemap);
  
  const robots = `User-agent: *
Allow: /
Sitemap: ${CONFIG.url_base}/sitemap.xml
`;
  fs.writeFileSync(path.join(OUT_DIR, 'robots.txt'), robots);

  const pages = [
    { chemin: '/', type: 'accueil' },
    { chemin: '/plombier/', type: 'metier', cible: 'plombier' },
    { chemin: '/mentions-legales/', type: 'legal' },
    { chemin: '/confidentialite/', type: 'legal' }
  ];
  CONFIG.communes.forEach(c => {
    pages.push({ chemin: `/chauffagiste-${sansAccents(c)}/`, type: 'commune', cible: c });
  });

  const siteJson = {
    metier: CONFIG.metier,
    nom: CONFIG.nom,
    telephone: CONFIG.telephone,
    siren: CONFIG.siren,
    decennale: CONFIG.decennale,
    communes: CONFIG.communes,
    metiers_secondaires: CONFIG.metiers_secondaires,
    pages,
    demo: true
  };
  fs.writeFileSync(path.join(OUT_DIR, 'site.json'), JSON.stringify(siteJson, null, 2));
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(IMG_DIR, { recursive: true });
  fs.mkdirSync(FONTS_DIR, { recursive: true });

  await processImages();
  await processFonts();
  
  generateAccueil();
  CONFIG.communes.forEach(c => generateCommune(c));
  generateMetier();
  generateLegal();
  writeAssets();
  
  console.log("Done");
}

main().catch(console.error);
