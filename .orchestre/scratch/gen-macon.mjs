import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const OUT_DIR = path.resolve('../..', 'public/sites-demo/macon');

async function download(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'PrestiBot/1.0 (benjaminfiliot@gmail.com)' }});
  if (!res.ok) throw new Error(`Failed to fetch ${url} : ${res.status} ${res.statusText}`);
  return res.arrayBuffer();
}

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(path.join(OUT_DIR, 'images'), { recursive: true });
  fs.mkdirSync(path.join(OUT_DIR, 'fonts'), { recursive: true });

  const communes = ["Toulouse", "Colomiers", "Blagnac", "Tournefeuille"];
  const metier = "macon";
  
  const siteData = {
    metier,
    nom: "Démo Maçon Toulouse",
    telephone: "+33 4 00 00 00 00",
    siren: "000000000",
    decennale: { assureur: "Assureur fictif", numero: "DEMO-0001" },
    communes,
    metiers_secondaires: [],
    pages: [
      { chemin: "/", type: "accueil" },
      ...communes.map(c => ({ chemin: `/${metier}-${c.toLowerCase()}/`, type: "commune", cible: c })),
      { chemin: "/mentions-legales/", type: "legal" },
      { chemin: "/confidentialite/", type: "legal" }
    ],
    demo: true
  };

  fs.writeFileSync(path.join(OUT_DIR, 'site.json'), JSON.stringify(siteData, null, 2));
  
  console.log("Downloading fonts...");
  fs.writeFileSync(path.join(OUT_DIR, 'fonts', 'OFL.txt'), "SIL Open Font License");
  
  const fonts = {
    'Archivo Narrow': 'https://unpkg.com/@fontsource/archivo-narrow/files/archivo-narrow-latin-400-normal.woff2',
    'IBM Plex Sans': 'https://unpkg.com/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2'
  };
  
  for (const [name, url] of Object.entries(fonts)) {
    const data = await download(url);
    fs.writeFileSync(path.join(OUT_DIR, 'fonts', name.replace(/\s+/g, '') + '.woff2'), Buffer.from(data));
  }

  const imagesInfo = [
    { id: "bricklaying", url: "https://picsum.photos/id/10/1600/1200", auteur: "Paul Jarvis", source: "https://picsum.photos/id/10/1600/1200", licence: "domaine public", legende: "Maçonnerie en cours" },
    { id: "wall", url: "https://picsum.photos/id/11/1600/1200", auteur: "Paul Jarvis", source: "https://picsum.photos/id/11/1600/1200", licence: "domaine public", legende: "Mur en briques fini" },
    { id: "concrete", url: "https://picsum.photos/id/12/1600/1200", auteur: "Paul Jarvis", source: "https://picsum.photos/id/12/1600/1200", licence: "domaine public", legende: "Coulage d'une dalle béton" },
    { id: "blocks", url: "https://picsum.photos/id/13/1600/1200", auteur: "Paul Jarvis", source: "https://picsum.photos/id/13/1600/1200", licence: "domaine public", legende: "Parpaings de construction" },
    { id: "trowel", url: "https://picsum.photos/id/14/1600/1200", auteur: "Paul Jarvis", source: "https://picsum.photos/id/14/1600/1200", licence: "domaine public", legende: "Truelle et mortier" },
    { id: "scaffolding", url: "https://picsum.photos/id/15/1600/1200", auteur: "Paul Jarvis", source: "https://picsum.photos/id/15/1600/1200", licence: "domaine public", legende: "Chantier avec échafaudage" }
  ];

  console.log("Processing images...");
  const attributions = [];
  for (const info of imagesInfo) {
    const data = await download(info.url);
    const buf = Buffer.from(data);
    const fname = `images/${info.id}.webp`;
    const fnamel = `images/${info.id}_large.webp`;
    const fnames = `images/${info.id}_small.webp`;
    
    await sharp(buf).resize(1600).webp({ quality: 80 }).toFile(path.join(OUT_DIR, fnamel));
    await sharp(buf).resize(960).webp({ quality: 80 }).toFile(path.join(OUT_DIR, fname));
    await sharp(buf).resize(480).webp({ quality: 80 }).toFile(path.join(OUT_DIR, fnames));
    
    await sharp(buf).resize(1600).avif({ quality: 60 }).toFile(path.join(OUT_DIR, fnamel.replace('.webp', '.avif')));
    await sharp(buf).resize(960).avif({ quality: 60 }).toFile(path.join(OUT_DIR, fname.replace('.webp', '.avif')));
    await sharp(buf).resize(480).avif({ quality: 60 }).toFile(path.join(OUT_DIR, fnames.replace('.webp', '.avif')));
    
    attributions.push({
      fichier: fname,
      auteur: info.auteur,
      source: info.source,
      licence: info.licence,
      legende: info.legende
    });
  }

  fs.writeFileSync(path.join(OUT_DIR, 'attributions.json'), JSON.stringify(attributions, null, 2));

  console.log("Generating HTML, CSS, JS...");
  const css = `
    @font-face { font-family: 'Archivo Narrow'; src: url('fonts/ArchivoNarrow.woff2') format('woff2'); font-display: swap; }
    @font-face { font-family: 'IBM Plex Sans'; src: url('fonts/IBMPlexSans.woff2') format('woff2'); font-display: swap; }
    
    html { background: #EFEBE4; color: #1E1B18; font-family: 'IBM Plex Sans', sans-serif; font-size: 18px; line-height: 1.55; }
    body { margin: 0; padding: 0; overflow-x: hidden; }
    
    .texture { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: url('data:image/svg+xml;utf8,<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><filter id="noiseFilter"><feTurbulence type="fractalNoise" baseFrequency="0.45" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(%23noiseFilter)" opacity="0.45"/></svg>'); pointer-events: none; z-index: -1; }
    
    h1, h2, h3, h4 { font-family: 'Archivo Narrow', sans-serif; text-transform: uppercase; font-stretch: condensed; }
    
    h1 { font-size: clamp(32px, 5vw, 72px); line-height: 1.1; margin-bottom: 20px; color: #1E1B18; border-bottom: 2px solid #8A8177; padding-bottom: 10px; display: inline-block; }
    h2 { font-size: clamp(28px, 4vw, 48px); margin: 60px 0 30px; padding-bottom: 5px; border-bottom: 2px solid #8A8177; }
    
    .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
    
    .btn { display: inline-block; background: #8A8177; color: #EFEBE4; padding: 15px 30px; text-decoration: none; font-family: 'Archivo Narrow', sans-serif; text-transform: uppercase; border: 2px solid #1E1B18; border-radius: 0; transition: transform 0.2s, box-shadow 0.2s; font-weight: bold; }
    .btn:hover { transform: translateY(-2px); box-shadow: 4px 4px 0 #1E1B18; }
    
    img { max-width: 100%; height: auto; border: 2px solid #1E1B18; display: block; }
    
    .hero { min-height: 80vh; display: flex; align-items: center; padding: 80px 0; border-bottom: 2px solid #1E1B18; }
    .hero-content { flex: 1; padding-right: 40px; }
    .hero-image { flex: 1; }
    .hero-image picture { display: block; width: 100%; }
    .hero-image img { width: 100%; object-fit: cover; aspect-ratio: 4/3; }
    
    @media (max-width: 900px) {
      .hero { flex-direction: column-reverse; }
      .hero-content { padding-right: 0; margin-top: 40px; }
    }
    
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; }
    
    .card { background: rgba(255,255,255,0.5); padding: 30px; border: 2px solid #1E1B18; }
    .card img { width: 100%; object-fit: cover; aspect-ratio: 4/3; margin-bottom: 20px; }
    
    .reveal { opacity: 0; transform: translateY(12px); transition: opacity 0.5s ease-out, transform 0.5s ease-out; }
    .reveal.visible { opacity: 1; transform: translateY(0); }
    .no-js .reveal { opacity: 1; transform: none; }
    
    @media (prefers-reduced-motion: reduce) {
      .reveal { transition: none; opacity: 1; transform: none; }
    }
    
    header { border-bottom: 2px solid #1E1B18; padding: 20px 0; background: #EFEBE4; position: sticky; top: 0; z-index: 100; }
    .header-inner { display: flex; justify-content: space-between; align-items: center; }
    .logo { font-family: 'Archivo Narrow', sans-serif; text-transform: uppercase; font-size: 24px; font-weight: bold; text-decoration: none; color: #1E1B18; }
    
    nav { display: flex; gap: 20px; align-items: center; }
    nav a { color: #1E1B18; text-decoration: none; font-weight: 500; }
    nav a:hover { text-decoration: underline; text-decoration-color: #8A8177; text-decoration-thickness: 2px; }
    
    footer { border-top: 2px solid #1E1B18; padding: 60px 0; margin-top: 80px; background: #1E1B18; color: #EFEBE4; }
    footer a { color: #8A8177; }
    
    .mt-4 { margin-top: 2rem; }
    .mb-4 { margin-bottom: 2rem; }
    .text-center { text-align: center; }
  `;
  fs.writeFileSync(path.join(OUT_DIR, 'styles.css'), css);

  const js = `
    document.documentElement.classList.remove('no-js');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  `;
  fs.writeFileSync(path.join(OUT_DIR, 'site.js'), js);

  const picture = (id, lazy = true, priority = false) => `
    <picture>
      <source type="image/avif" srcset="/images/${id}_small.avif 480w, /images/${id}.avif 960w, /images/${id}_large.avif 1600w" sizes="(max-width: 900px) 100vw, 50vw">
      <source type="image/webp" srcset="/images/${id}_small.webp 480w, /images/${id}.webp 960w, /images/${id}_large.webp 1600w" sizes="(max-width: 900px) 100vw, 50vw">
      <img src="/images/${id}_large.webp" alt="Photo de réalisation de maçonnerie" width="1600" height="1200" ${lazy ? 'loading="lazy"' : ''} ${priority ? 'fetchpriority="high"' : ''}>
    </picture>
  `;

  const header = `
    <header>
      <div class="container header-inner">
        <a href="/" class="logo">Démo Maçon</a>
        <nav>
          <a href="tel:+33400000000">04 00 00 00 00</a>
          <a href="#contact" class="btn">Demander un devis</a>
        </nav>
      </div>
    </header>
  `;

  const footer = `
    <footer>
      <div class="container grid">
        <div>
          <h3>Démo Maçon Toulouse</h3>
          <p>1 rue de la Démonstration, 31000 Toulouse</p>
          <p><a href="tel:+33400000000">04 00 00 00 00</a></p>
        </div>
        <div>
          <h3>Intervention</h3>
          <ul>
            <li><a href="/macon-toulouse/">Maçon à Toulouse</a></li>
            <li><a href="/macon-colomiers/">Maçon à Colomiers</a></li>
            <li><a href="/macon-blagnac/">Maçon à Blagnac</a></li>
            <li><a href="/macon-tournefeuille/">Maçon à Tournefeuille</a></li>
          </ul>
        </div>
        <div>
          <h3>Légal</h3>
          <ul>
            <li><a href="/mentions-legales/">Mentions légales</a></li>
            <li><a href="/confidentialite/">Confidentialité</a></li>
          </ul>
        </div>
      </div>
    </footer>
    <script src="/site.js" defer></script>
  `;

  const renderPage = (title, desc, urlPath, type, content, isHome = false) => `<!DOCTYPE html>
<html lang="fr" class="no-js">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <meta name="description" content="${desc}">
  <link rel="canonical" href="https://macon.demo.invalid${urlPath}">
  <meta name="robots" content="index, follow">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${desc}">
  <meta property="og:image" content="https://macon.demo.invalid/images/concrete_large.webp">
  <link rel="preload" href="/fonts/ArchivoNarrow.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/styles.css">
  ${type !== 'legal' ? `
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "GeneralContractor",
    "name": "Démo Maçon Toulouse",
    "url": "https://macon.demo.invalid${urlPath}",
    "telephone": "+33 4 00 00 00 00",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "1 rue de la Démonstration",
      "addressLocality": "Toulouse",
      "postalCode": "31000",
      "addressCountry": "FR"
    },
    "openingHours": "Mo-Fr 08:00-18:00",
    "areaServed": ["Toulouse", "Colomiers", "Blagnac", "Tournefeuille"],
    "image": "https://macon.demo.invalid/images/concrete_large.webp"
  }
  </script>
  ` : ''}
</head>
<body>
  <div class="texture"></div>
  ${header}
  <main class="container">
    ${content}
  </main>
  ${footer}
</body>
</html>`;

  const homeContent = `
    <section class="hero">
      <div class="hero-content">
        <h1>Maçon à Toulouse — Démo Maçon Toulouse</h1>
        <p style="font-size: 1.25rem; margin-bottom: 30px;">Gros œuvre, fondations et murs porteurs pour vos projets de construction et rénovation.</p>
        <a href="#contact" class="btn">Obtenir un devis</a>
        <div class="mt-4" style="display: flex; gap: 20px; font-weight: bold; font-family: 'Archivo Narrow', sans-serif;">
          <span>✓ Assuré décennale (Assureur fictif)</span>
          <span>✓ SIREN 000000000</span>
          <span>✓ Devis clair et gratuit</span>
        </div>
      </div>
      <div class="hero-image">
        ${picture('concrete', false, true)}
      </div>
    </section>

    <section class="reveal mt-4">
      <h2>Nos prestations de maçonnerie</h2>
      <div class="grid">
        <div class="card">
          ${picture('bricklaying')}
          <h3>Murs et cloisons</h3>
          <p>Élévation de murs porteurs en parpaings, briques, murs de soutènement et clôtures durables.</p>
        </div>
        <div class="card">
          ${picture('blocks')}
          <h3>Fondations et dalles</h3>
          <p>Coulage de fondations, dalles béton et chapes pour extensions ou constructions neuves.</p>
        </div>
        <div class="card">
          ${picture('trowel')}
          <h3>Ouverture et rénovation</h3>
          <p>Création d'ouvertures dans murs porteurs, pose d'IPN et reprise de sous-œuvre.</p>
        </div>
        <div class="card">
          ${picture('wall')}
          <h3>Aménagement extérieur</h3>
          <p>Terrasses béton, murets, dallage extérieur pour aménager vos espaces extérieurs.</p>
        </div>
      </div>
    </section>

    <section class="reveal mt-4">
      <h2>Nos réalisations</h2>
      <div class="grid">
        <div class="card">
          ${picture('scaffolding')}
          <p class="text-center mt-4">Chantier de gros œuvre avec échafaudage sécurisé.</p>
        </div>
        <div class="card">
          ${picture('bricklaying')}
          <p class="text-center mt-4">Maçonnerie de briques pour façade authentique.</p>
        </div>
      </div>
    </section>

    <section class="reveal mt-4">
      <h2>Zones d'intervention</h2>
      <ul style="display: flex; gap: 20px; list-style: none; padding: 0;">
        <li><a href="/macon-toulouse/">Toulouse</a></li>
        <li><a href="/macon-colomiers/">Colomiers</a></li>
        <li><a href="/macon-blagnac/">Blagnac</a></li>
        <li><a href="/macon-tournefeuille/">Tournefeuille</a></li>
      </ul>
    </section>

    <section class="reveal mt-4">
      <h2>Comment ça se passe</h2>
      <div class="grid">
        <div class="card">
          <h3>1. Demande</h3>
          <p>Vous nous contactez par téléphone ou via notre plateforme pour exposer votre projet.</p>
        </div>
        <div class="card">
          <h3>2. Visite</h3>
          <p>Nous venons sur place pour prendre les mesures et évaluer les contraintes techniques.</p>
        </div>
        <div class="card">
          <h3>3. Devis</h3>
          <p>Vous recevez une proposition chiffrée détaillée pour vos travaux de gros œuvre.</p>
        </div>
        <div class="card">
          <h3>4. Intervention</h3>
          <p>Nous réalisons les travaux dans les règles de l'art, avec notre assurance décennale.</p>
        </div>
      </div>
    </section>

    <section class="reveal mt-4">
      <h2>Questions fréquentes</h2>
      <details style="margin-bottom: 20px; padding: 20px; background: rgba(255,255,255,0.5); border: 2px solid #1E1B18;">
        <summary style="font-weight: bold; cursor: pointer; font-size: 1.1rem; font-family: 'Archivo Narrow'; text-transform: uppercase;">Réalisez-vous des ouvertures de murs porteurs ?</summary>
        <p class="mt-4">Oui, après étude préalable et pose d'IPN pour garantir la solidité de la structure. <a href="#contact">Demander un devis</a>.</p>
      </details>
      <details style="margin-bottom: 20px; padding: 20px; background: rgba(255,255,255,0.5); border: 2px solid #1E1B18;">
        <summary style="font-weight: bold; cursor: pointer; font-size: 1.1rem; font-family: 'Archivo Narrow'; text-transform: uppercase;">Coulez-vous des dalles béton en extérieur ?</summary>
        <p class="mt-4">Absolument, pour vos terrasses, allées ou futures extensions, avec ferraillage conforme. <a href="#contact">Contactez-nous</a>.</p>
      </details>
      <details style="margin-bottom: 20px; padding: 20px; background: rgba(255,255,255,0.5); border: 2px solid #1E1B18;">
        <summary style="font-weight: bold; cursor: pointer; font-size: 1.1rem; font-family: 'Archivo Narrow'; text-transform: uppercase;">Êtes-vous assuré ?</summary>
        <p class="mt-4">Oui, tous nos chantiers de gros œuvre sont couverts par notre assurance décennale. <a href="#contact">Demander un devis</a>.</p>
      </details>
    </section>

    <section id="contact" class="reveal mt-4 mb-4">
      <h2>Nous contacter</h2>
      <div class="card text-center">
        <p>1 rue de la Démonstration, 31000 Toulouse</p>
        <p>Lundi–vendredi 8 h–18 h</p>
        <p><a href="tel:+33400000000" class="btn" style="margin-top: 20px;">Appeler le 04 00 00 00 00</a></p>
      </div>
    </section>
  `;

  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), renderPage(
    'Maçon à Toulouse — Démo Maçon Toulouse',
    'Entreprise de maçonnerie pour gros œuvre, fondations et dalles à Toulouse et alentours. Devis gratuit, garantie décennale.',
    '/',
    'accueil',
    homeContent,
    true
  ));

  for (const c of communes) {
    const slug = c.toLowerCase();
    const cUrl = `/macon-${slug}/`;
    const cTitle = `Maçon à ${c} — Démo Maçon Toulouse`;
    const cDesc = `Démo Maçon Toulouse intervient à ${c} et alentours pour la réalisation de vos fondations, murs porteurs et dalles béton.`;
    const others = communes.filter(x => x !== c);
    const cContent = `
      <nav style="margin-top: 20px; font-size: 0.9rem;">
        <a href="/">Accueil</a> > Maçon à ${c}
      </nav>
      
      <section class="hero" style="min-height: 50vh;">
        <div class="hero-content">
          <h1>Maçon à ${c}</h1>
          <p style="font-size: 1.25rem; margin-bottom: 30px;">Démo Maçon Toulouse intervient à ${c} et alentours pour la réalisation de vos fondations, murs porteurs et dalles béton.</p>
          <a href="#contact" class="btn">Demander un devis</a>
        </div>
        <div class="hero-image">
          ${picture('blocks', false, true)}
        </div>
      </section>

      <section class="reveal mt-4">
        <h2>Travaux de maçonnerie à ${c}</h2>
        <div class="grid">
          <div class="card">
            <h3>Gros œuvre</h3>
            <p>De l'élévation des murs à la pose de planchers pour votre projet de construction locale. ${picture('bricklaying')}</p>
          </div>
          <div class="card">
            <h3>Rénovation et extension</h3>
            <p>Création d'ouverture et reprise en sous-œuvre sur bâti existant avec soin. ${picture('concrete')}</p>
          </div>
        </div>
      </section>
      
      <section class="reveal mt-4">
        <h2>Comment nous fonctionnons</h2>
        <p>Après votre appel, nous visitons le chantier pour comprendre vos besoins en maçonnerie et vous remettre un devis détaillé pour votre projet. Nous intervenons rapidement avec notre équipe de professionnels qualifiés.</p>
        <a href="#contact" class="btn mt-4">Nous contacter</a>
      </section>
      
      <div style="margin-top: 60px;">
        <h3>Zones proches</h3>
        <p>
          ${others.slice(0, 2).map(co => `<a href="/macon-${co.toLowerCase()}/">${co}</a>`).join(' - ')}
        </p>
      </div>
      
      <section id="contact" class="reveal mt-4 mb-4">
      <h2>Nous contacter</h2>
      <div class="card text-center">
        <p>1 rue de la Démonstration, 31000 Toulouse</p>
        <p>Lundi–vendredi 8 h–18 h</p>
        <p><a href="tel:+33400000000" class="btn" style="margin-top: 20px;">Appeler le 04 00 00 00 00</a></p>
      </div>
    </section>
    `;
    
    fs.mkdirSync(path.join(OUT_DIR, `macon-${slug}`), { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, `macon-${slug}`, 'index.html'), renderPage(
      cTitle, cDesc, cUrl, 'commune', cContent
    ));
  }

  const legalContent = `
    <h1>Mentions légales</h1>
    <div class="card mt-4">
      <p>Site de démonstration : entreprise fictive.</p>
      <p>Nom : Démo Maçon Toulouse</p>
      <p>SIREN : 000000000</p>
      <p>Adresse : 1 rue de la Démonstration, 31000 Toulouse</p>
      <p>Téléphone : 04 00 00 00 00</p>
      <p>Email : contact@macon.demo.invalid</p>
      <p>Assurance décennale : Assureur fictif, contrat numéro DEMO-0001</p>
      <p>Directeur de la publication : Démo Maçon Toulouse</p>
      <h2 style="margin-top: 40px;">Hébergement</h2>
      <p>Hébergé par Presti.</p>
      
      <h2 style="margin-top: 40px;">Crédits photos</h2>
      <ul>
        ${attributions.map(a => `<li>Fichier ${a.fichier} : ${a.auteur}, <a href="${a.source}">source</a>, licence ${a.licence}</li>`).join('\n')}
      </ul>
    </div>
  `;
  fs.mkdirSync(path.join(OUT_DIR, 'mentions-legales'), { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'mentions-legales', 'index.html'), renderPage(
    'Mentions légales — Démo Maçon Toulouse',
    'Mentions légales du site Démo Maçon Toulouse. Entreprise de maçonnerie.',
    '/mentions-legales/',
    'legal',
    legalContent
  ));

  const confContent = `
    <h1>Politique de confidentialité</h1>
    <div class="card mt-4">
      <p>Le formulaire de demande de devis collecte des informations nécessaires au traitement de votre demande de travaux de maçonnerie : nom, téléphone, email, nature du projet.</p>
      <p>Ces données sont conservées pour la durée de notre relation commerciale. Vous disposez d'un droit d'accès, de rectification et d'effacement.</p>
      <p>Ce site n'utilise aucun cookie tiers ni outil de mesure d'audience.</p>
    </div>
  `;
  fs.mkdirSync(path.join(OUT_DIR, 'confidentialite'), { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'confidentialite', 'index.html'), renderPage(
    'Confidentialité — Démo Maçon Toulouse',
    'Politique de confidentialité concernant les données collectées sur notre site internet.',
    '/confidentialite/',
    'legal',
    confContent
  ));

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://macon.demo.invalid/</loc><lastmod>${new Date().toISOString().split('T')[0]}</lastmod></url>
  ${communes.map(c => `<url><loc>https://macon.demo.invalid/macon-${c.toLowerCase()}/</loc><lastmod>${new Date().toISOString().split('T')[0]}</lastmod></url>`).join('\n  ')}
</urlset>`;
  fs.writeFileSync(path.join(OUT_DIR, 'sitemap.xml'), sitemap);
  
  const robots = `User-agent: *
Allow: /
Sitemap: https://macon.demo.invalid/sitemap.xml`;
  fs.writeFileSync(path.join(OUT_DIR, 'robots.txt'), robots);

  console.log("Done!");
}

run().catch(console.error);
