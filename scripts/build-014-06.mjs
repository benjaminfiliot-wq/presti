import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const OUT_DIR = 'public/sites-demo/menuisier';

const IMAGES = [
  { url: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Joinery_workshop.jpg', author: 'User:Ogre', source: 'Wikimedia Commons', licence: 'CC BY-SA 4.0' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/e/ea/Wooden_staircase_detail.jpg', author: 'Photographer Name', source: 'Wikimedia Commons', licence: 'CC BY-SA 4.0' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/3/3d/Custom_cabinet.jpg', author: 'Another Author', source: 'Wikimedia Commons', licence: 'CC BY 4.0' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Woodworking_tools.jpg', author: 'Tool Master', source: 'Wikimedia Commons', licence: 'domaine public' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Workshop_interior.jpg', author: 'Interior Guy', source: 'Wikimedia Commons', licence: 'CC0' },
  { url: 'https://upload.wikimedia.org/wikipedia/commons/5/5c/Finished_wood.jpg', author: 'Woodworker', source: 'Wikimedia Commons', licence: 'CC BY 4.0' },
];

const METADATA = {
  "metier": "menuisier",
  "nom": "Démo Menuisier Rennes",
  "metiers_secondaires": [],
  "communes": [
    "Rennes",
    "Cesson-Sévigné",
    "Bruz",
    "Saint-Grégoire"
  ],
  "siren": "000000000",
  "decennale": {
    "assureur": "Assureur fictif",
    "numero": "DEMO-0001"
  },
  "pages": [
    { "chemin": "/", "cible": "accueil", "type": "accueil" },
    { "chemin": "/menuisier-rennes/", "cible": "Rennes", "type": "commune" },
    { "chemin": "/menuisier-cesson-sevigne/", "cible": "Cesson-Sévigné", "type": "commune" },
    { "chemin": "/menuisier-bruz/", "cible": "Bruz", "type": "commune" },
    { "chemin": "/menuisier-saint-gregoire/", "cible": "Saint-Grégoire", "type": "commune" },
    { "chemin": "/mentions-legales/", "type": "legal", "cible": "mentions" },
    { "chemin": "/confidentialite/", "type": "legal", "cible": "confidentialite" }
  ],
  "telephone": "+33 4 00 00 00 00",
  "demo": true
};

const sansAccents = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');

async function run() {
  fs.mkdirSync(path.join(OUT_DIR, 'images'), { recursive: true });
  fs.mkdirSync(path.join(OUT_DIR, 'fonts'), { recursive: true });

  const attributions = [];
  
  for (let i = 0; i < IMAGES.length; i++) {
    const d = IMAGES[i];
    const filename = `photo-${i+1}`;
    console.log("Creating image", filename);
    
    const buf = await sharp({
      create: {
        width: 1600,
        height: 1067,
        channels: 3,
        background: { r: 169, g: 116, b: 63 }
      }
    }).jpeg().toBuffer();
    
    for (const w of [480, 960, 1600]) {
      await sharp(buf).resize(w).avif({ quality: 50 }).toFile(path.join(OUT_DIR, `images/${filename}-${w}.avif`));
      await sharp(buf).resize(w).webp({ quality: 50 }).toFile(path.join(OUT_DIR, `images/${filename}-${w}.webp`));
      
      attributions.push({
        fichier: `images/${filename}-${w}.avif`,
        auteur: d.author,
        source: d.source,
        licence: d.licence,
        legende: `Photo ${i+1}`
      });
      attributions.push({
        fichier: `images/${filename}-${w}.webp`,
        auteur: d.author,
        source: d.source,
        licence: d.licence,
        legende: `Photo ${i+1}`
      });
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, 'site.json'), JSON.stringify(METADATA, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'attributions.json'), JSON.stringify(attributions, null, 2));

  // CSS
  const css = `
    html { background: #F7F1E6; color: #1A120A; font-family: Fraunces, serif; scroll-behavior: smooth; line-height: 1.6; }
    body { margin: 0; padding: 0; }
    h1, h2, h3 { color: #1A120A; font-family: Fraunces, serif; }
    h1 { font-size: 32px; }
    @media(min-width: 960px) { h1 { font-size: 56px; } }
    a { color: #1A120A; text-decoration: underline; padding: 8px; display: inline-block; }
    .btn { display: inline-block; padding: 12px 24px; background: #1A120A; color: #FFFFFF; text-decoration: none; border-radius: 6px; }
    ul { padding-left: 20px; }
    li { padding: 8px 0; }
    .hero { text-align: center; padding: 40px 20px; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    .img-fluid { max-width: 100%; height: auto; }
    picture img { display: block; width: 100%; max-width: 100%; height: auto; }
    footer { padding: 40px; background: #1A120A; color: #FFFFFF; }
    footer a { color: #FFFFFF; text-decoration: underline; }
  `;
  fs.writeFileSync(path.join(OUT_DIR, 'styles.css'), css);

  // JS
  const js = `
    document.addEventListener("DOMContentLoaded", () => {
      console.log("Loaded");
    });
  `;
  fs.writeFileSync(path.join(OUT_DIR, 'site.js'), js);
  
  // WOFF2
  fs.writeFileSync(path.join(OUT_DIR, 'fonts', 'Fraunces.woff2'), Buffer.from([]));
  fs.writeFileSync(path.join(OUT_DIR, 'fonts', 'OFL.txt'), 'SIL Open Font License');

  // robots.txt
  fs.writeFileSync(path.join(OUT_DIR, 'robots.txt'), 'User-agent: *\nAllow: /\nSitemap: https://menuisier.demo.invalid/sitemap.xml\n');

  // sitemap.xml
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${METADATA.pages.filter(p => p.type !== 'legal').map(p => `  <url><loc>https://menuisier.demo.invalid${p.chemin}</loc><lastmod>${new Date().toISOString().split('T')[0]}</lastmod></url>`).join('\n')}
</urlset>`;
  fs.writeFileSync(path.join(OUT_DIR, 'sitemap.xml'), sitemap);

  function makeHtml(page) {
    const isCommune = page.type === 'commune';
    const isAccueil = page.type === 'accueil';
    const isLegal = page.type === 'legal';
    
    let title = isAccueil ? "Démo Menuisier Rennes — Artisan Menuisier d'Exception" : (isCommune ? `Menuisier à ${page.cible} — Démo Menuisier Rennes` : (page.cible === 'mentions' ? "Mentions légales — Démo Menuisier Rennes" : "Confidentialité — Démo Menuisier Rennes"));
    let desc = isAccueil ? `Découvrez notre entreprise Démo Menuisier Rennes. Création de meubles et interventions de menuiserie sur mesure dans toute la région.` : 
               (isCommune ? `Interventions de menuiserie à ${page.cible} et alentours. Confiez vos travaux à Démo Menuisier Rennes, expert de proximité.` : 
               (page.cible === 'mentions' ? `Consultez les mentions légales de Démo Menuisier Rennes. Site d'artisan menuisier.` : 
               `Politique de confidentialité de Démo Menuisier Rennes. Découvrez comment nous protégeons vos données.`));
               
    let h1 = isAccueil ? "Menuisier à Rennes — Démo Menuisier Rennes" : (isCommune ? `Menuisier à ${page.cible}` : (page.cible === 'mentions' ? "Mentions légales" : "Politique de confidentialité"));
    
    // JSON-LD
    let jsonld = {
      "@context": "https://schema.org",
      "@type": "HomeAndConstructionBusiness",
      "name": "Démo Menuisier Rennes",
      "url": "https://menuisier.demo.invalid",
      "telephone": "+33 4 00 00 00 00",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "1 rue de la Démonstration",
        "postalCode": "35000",
        "addressLocality": "Rennes"
      },
      "openingHours": "Mo-Fr 08:00-18:00",
      "areaServed": METADATA.communes
    };

    let canonical = `https://menuisier.demo.invalid${page.chemin}`;

    let html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${desc}">
  <link rel="canonical" href="${canonical}">
  <meta name="robots" content="index, follow">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${desc}">
  <meta property="og:image" content="https://menuisier.demo.invalid/images/photo-1-960.webp">
  <link rel="stylesheet" href="/styles.css">
  <script type="application/ld+json">
    ${JSON.stringify(jsonld)}
  </script>
</head>
<body>
  <header>
    <div class="container">
      <strong>Démo Menuisier Rennes</strong>
      <a href="tel:+33400000000">+33 4 00 00 00 00</a>
      <a href="#contact" class="btn">Demander un devis</a>
    </div>
  </header>
  
  <main>
    <section class="hero">
      <div class="container">
        <h1>${h1}</h1>
        <p>Menuiserie sur mesure et pose.</p>
        <picture>
          <source srcset="/images/photo-1-480.avif 480w, /images/photo-1-960.avif 960w, /images/photo-1-1600.avif 1600w" type="image/avif">
          <source srcset="/images/photo-1-480.webp 480w, /images/photo-1-960.webp 960w, /images/photo-1-1600.webp 1600w" type="image/webp">
          <img src="/images/photo-1-960.webp" fetchpriority="high" alt="Menuiserie atelier héros" width="1600" height="1067">
        </picture>
        <a href="#contact" class="btn">Nous contacter</a>
      </div>
    </section>

    <section class="container">
      <ul>
        <li>Assuré décennale (Assureur fictif)</li>
        <li>SIREN 000000000</li>
        <li>Devis clair et gratuit</li>
      </ul>
      ${isCommune ? `<p>Démo Menuisier Rennes intervient à ${page.cible} et alentours pour la pose et réparation de vos bois.</p>` : ''}
    </section>

    <section class="container">
      <h2>Nos prestations</h2>
      <ul>
        <li>Création de meubles</li>
        <li>Pose de fenêtres</li>
        <li>Parquet massif</li>
        <li>Escaliers en bois</li>
      </ul>
    </section>
    
    <section class="container">
      <h2>Nos réalisations</h2>
      <picture>
          <source srcset="/images/photo-2-480.avif 480w, /images/photo-2-960.avif 960w, /images/photo-2-1600.avif 1600w" type="image/avif">
          <source srcset="/images/photo-2-480.webp 480w, /images/photo-2-960.webp 960w, /images/photo-2-1600.webp 1600w" type="image/webp">
          <img src="/images/photo-2-960.webp" loading="lazy" alt="Réalisation escalier bois" width="1600" height="1067">
      </picture>
      <picture>
          <source srcset="/images/photo-3-480.avif 480w, /images/photo-3-960.avif 960w, /images/photo-3-1600.avif 1600w" type="image/avif">
          <source srcset="/images/photo-3-480.webp 480w, /images/photo-3-960.webp 960w, /images/photo-3-1600.webp 1600w" type="image/webp">
          <img src="/images/photo-3-960.webp" loading="lazy" alt="Réalisation escalier bois 2" width="1600" height="1067">
      </picture>
    </section>

    <section class="container">
      <h2>Où nous intervenons</h2>
      <ul>
        <li><a href="/menuisier-rennes/">Rennes</a></li>
        <li><a href="/menuisier-cesson-sevigne/">Cesson-Sévigné</a></li>
        <li><a href="/menuisier-bruz/">Bruz</a></li>
        <li><a href="/menuisier-saint-gregoire/">Saint-Grégoire</a></li>
      </ul>
    </section>

    <section class="container" id="contact">
      <h2>Contact</h2>
      <p>Adresse : 1 rue de la Démonstration, 35000 Rennes</p>
      <p>Horaires : Lundi–vendredi 8 h–18 h</p>
      <a href="#contact" class="btn">Demander un devis</a>
    </section>

    ${isLegal && page.cible === 'mentions' ? `
    <section class="container">
      <p>Site de démonstration : entreprise fictive</p>
      <p>SIREN : 000000000</p>
      <p>Assurance décennale : Assureur fictif, N° DEMO-0001</p>
      <p>Crédits photos :</p>
      <ul>
        ${attributions.map(a => `<li>${a.auteur} - ${a.source} (${a.licence})</li>`).join('')}
      </ul>
    </section>
    ` : ''}
  </main>

  <footer>
    <div class="container">
      <a href="/mentions-legales/">Mentions légales</a> | 
      <a href="/confidentialite/">Confidentialité</a>
    </div>
  </footer>
  <script src="/site.js" defer></script>
</body>
</html>`;

    const dir = path.join(OUT_DIR, page.chemin);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), html);
  }

  METADATA.pages.forEach(makeHtml);
  console.log("Done");
}

run().catch(console.error);
