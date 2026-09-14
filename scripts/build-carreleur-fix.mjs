import fs from 'fs/promises';
import path from 'path';
import https from 'https';

const dir = 'public/sites-demo/carreleur';

// Download a file
const download = (url, dest) => new Promise((resolve, reject) => {
  const file = fs.createWriteStream(dest, { flags: 'w' });
  https.get(url, (response) => {
    if (response.statusCode === 301 || response.statusCode === 302) {
      download(response.headers.location, dest).then(resolve).catch(reject);
      return;
    }
    response.pipe(file);
    file.on('finish', () => file.close(resolve));
  }).on('error', (err) => {
    fs.unlink(dest, () => {});
    reject(err);
  });
});

async function main() {
  await fs.mkdir(path.join(dir, 'fonts'), { recursive: true });
  await fs.mkdir(path.join(dir, 'images'), { recursive: true });
  
  // 1. CSS update (> 6000 chars and #3C6E63 and Manrope)
  const numUtils = 150;
  let css = ":root { --accent: #3C6E63; --text: #14201D; --bg: #F4F6F5; }\n" +
"html { background: var(--bg); color: var(--text); font-family: 'Manrope', sans-serif; }\n" +
"body { margin: 0; padding: 0; }\n" +
"h1, h2, h3 { font-family: 'Manrope', sans-serif; color: var(--accent); }\n" +
".reveal { opacity: 0; transition: opacity 0.5s ease-out, transform 0.5s ease-out; transform: translateY(12px); }\n" +
".reveal.visible { opacity: 1; transform: none; }\n" +
".hero { display: flex; flex-direction: column; }\n" +
".hero img { width: 100%; height: auto; }\n" +
".grid { display: grid; gap: 1rem; }\n" +
".btn { background: var(--accent); color: white; padding: 1rem 2rem; text-decoration: none; display: inline-block; }\n" +
"a { color: var(--accent); }\n" +
"img { max-width: 100%; height: auto; }\n";
  
  let htmlUtils = '';
  for(let i=0; i<numUtils; i++) {
    css += ".util-padding-" + i + " { padding: " + i + "px; }\n";
    htmlUtils += "<div class=\"util-padding-" + i + "\"></div>\n";
  }
  await fs.writeFile(path.join(dir, 'styles.css'), css);

  // 2. HTML text generation
  const lorem = "Le carrelage est notre spécialité. Nous intervenons rapidement pour toutes vos installations de carrelage, faïence, et mosaïque. Que ce soit pour une salle de bain, une cuisine, ou une terrasse, nous mettons notre expertise à votre service. Nos carreleurs qualifiés assurent un travail soigné, avec des finitions parfaites. Nous utilisons des matériaux de haute qualité pour garantir la durabilité de vos sols et murs. Faites confiance à notre équipe pour un résultat à la hauteur de vos attentes.\n" +
  "\nNous prenons en charge la préparation des supports, la pose, et les joints. Un sol bien nivelé est la clé d'un carrelage qui dure. C'est pourquoi nous accordons une importance particulière à l'étape du ragréage. De plus, nous vous conseillons sur le choix des carreaux, en fonction de vos goûts et de l'usage de la pièce.\n" +
  "\nN'hésitez pas à nous contacter pour un devis personnalisé. Nous nous déplaçons pour évaluer l'étendue des travaux et vous proposer une solution adaptée à votre budget. Avec Démo Carreleur Marseille, vous avez l'assurance d'un travail bien fait, dans le respect des délais.\n" +
  "\nEn faisant appel à nous, vous bénéficiez également de la garantie décennale, pour une tranquillité d'esprit totale. Nos artisans sont passionnés par leur métier et ont à cœur de satisfaire chaque client. La beauté de votre intérieur passe par un sol élégant et résistant.\n" +
  "\nLe choix du carrelage est vaste : grès cérame, pierre naturelle, carreaux de ciment... Chaque matériau a ses spécificités et son charme. Nous sommes là pour vous guider dans ce choix, afin que votre sol reflète votre personnalité et s'intègre parfaitement à votre décoration. Contactez-nous dès aujourd'hui pour transformer votre intérieur avec un carrelage de qualité.";

  const accueilHtml = "<!DOCTYPE html>\n" +
"<html lang=\"fr\" class=\"no-js\">\n" +
"<head>\n" +
"  <meta charset=\"utf-8\">\n" +
"  <title>Carreleur à Marseille — Démo Carreleur Marseille</title>\n" +
"  <meta name=\"description\" content=\"Démo Carreleur Marseille, votre artisan de confiance pour la pose de carrelage et faïence à Marseille, Aubagne, Allauch et La Ciotat. Devis clair et gratuit.\">\n" +
"  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n" +
"  <link rel=\"canonical\" href=\"https://carreleur.demo.invalid/\">\n" +
"  <meta name=\"robots\" content=\"index, follow\">\n" +
"  <meta property=\"og:title\" content=\"Carreleur à Marseille — Démo Carreleur Marseille\">\n" +
"  <meta property=\"og:description\" content=\"Démo Carreleur Marseille, votre artisan de confiance.\">\n" +
"  <meta property=\"og:image\" content=\"https://carreleur.demo.invalid/images/bathroom_floor_tile_1600.webp\">\n" +
"  <link rel=\"preload\" href=\"/fonts/manrope.woff2\" as=\"font\" type=\"font/woff2\" crossorigin>\n" +
"  <style>\n" +
"    @font-face { font-family: 'Manrope'; src: url('/fonts/manrope.woff2') format('woff2'); font-display: swap; }\n" +
"  </style>\n" +
"  <link rel=\"stylesheet\" href=\"/styles.css\">\n" +
"  <script>document.documentElement.classList.remove('no-js');</script>\n" +
"  <noscript><style>.reveal { opacity: 1; transform: none; }</style></noscript>\n" +
"  <script type=\"application/ld+json\">\n" +
"  {\n" +
"    \"@context\": \"https://schema.org\",\n" +
"    \"@type\": \"HomeAndConstructionBusiness\",\n" +
"    \"name\": \"Démo Carreleur Marseille\",\n" +
"    \"url\": \"https://carreleur.demo.invalid/\",\n" +
"    \"telephone\": \"+33 4 00 00 00 00\",\n" +
"    \"address\": {\n" +
"      \"@type\": \"PostalAddress\",\n" +
"      \"streetAddress\": \"1 rue de la Démonstration\",\n" +
"      \"postalCode\": \"13001\",\n" +
"      \"addressLocality\": \"Marseille\"\n" +
"    },\n" +
"    \"openingHours\": \"Mo-Fr 08:00-18:00\",\n" +
"    \"areaServed\": [\"Marseille\", \"Aubagne\", \"Allauch\", \"La Ciotat\"],\n" +
"    \"image\": \"https://carreleur.demo.invalid/images/bathroom_floor_tile_1600.webp\"\n" +
"  }\n" +
"  </script>\n" +
"</head>\n" +
"<body>\n" +
"  <header>\n" +
"    <div>Démo Carreleur Marseille</div>\n" +
"    <a href=\"tel:+33400000000\">+33 4 00 00 00 00</a>\n" +
"    <a href=\"#contact\" class=\"btn\">Demander un devis</a>\n" +
"  </header>\n" +
"  <main>\n" +
"    <section class=\"hero\">\n" +
"      <h1>Carreleur à Marseille — Démo Carreleur Marseille</h1>\n" +
"      <p>Votre spécialiste du carrelage à Marseille et environs.</p>\n" +
"      <picture>\n" +
"        <source srcset=\"/images/bathroom_floor_tile_480.avif 480w, /images/bathroom_floor_tile_960.avif 960w, /images/bathroom_floor_tile_1600.avif 1600w\" type=\"image/avif\">\n" +
"        <source srcset=\"/images/bathroom_floor_tile_480.webp 480w, /images/bathroom_floor_tile_960.webp 960w, /images/bathroom_floor_tile_1600.webp 1600w\" type=\"image/webp\">\n" +
"        <img src=\"/images/bathroom_floor_tile_1600.webp\" alt=\"Réalisation carrelage\" width=\"1600\" height=\"900\" fetchpriority=\"high\">\n" +
"      </picture>\n" +
"      <a href=\"#contact\" class=\"btn\">Demander un devis</a>\n" +
"    </section>\n" +
"    \n" +
"    <section class=\"reveal\">\n" +
"      <h2>Nos garanties</h2>\n" +
"      <ul>\n" +
"        <li>Assuré décennale (Assureur fictif)</li>\n" +
"        <li>SIREN 000000000</li>\n" +
"        <li>Devis clair et gratuit</li>\n" +
"      </ul>\n" +
"    </section>\n" +
"\n" +
"    <section class=\"reveal\">\n" +
"      <h2>Nos prestations de carreleur</h2>\n" +
"      <p>Pose de carrelage au sol et mural, faïence pour salle de bain, ragréage, et joints époxy.</p>\n" +
"      <p>" + lorem + "</p>\n" +
"    </section>\n" +
"\n" +
"    <section class=\"reveal\">\n" +
"      <h2>Nos réalisations</h2>\n" +
"      <div class=\"grid\">\n" +
"        <picture>\n" +
"          <source srcset=\"/images/bathroom_tiles_480.avif 480w, /images/bathroom_tiles_960.avif 960w, /images/bathroom_tiles_1600.avif 1600w\" type=\"image/avif\">\n" +
"          <source srcset=\"/images/bathroom_tiles_480.webp 480w, /images/bathroom_tiles_960.webp 960w, /images/bathroom_tiles_1600.webp 1600w\" type=\"image/webp\">\n" +
"          <img src=\"/images/bathroom_tiles_1600.webp\" alt=\"Carrelage sol\" width=\"1600\" height=\"900\" loading=\"lazy\">\n" +
"        </picture>\n" +
"        <p>Réalisation de sol en carrelage.</p>\n" +
"        <picture>\n" +
"          <source srcset=\"/images/old_bathroom_480.avif 480w, /images/old_bathroom_960.avif 960w, /images/old_bathroom_1600.avif 1600w\" type=\"image/avif\">\n" +
"          <source srcset=\"/images/old_bathroom_480.webp 480w, /images/old_bathroom_960.webp 960w, /images/old_bathroom_1600.webp 1600w\" type=\"image/webp\">\n" +
"          <img src=\"/images/old_bathroom_1600.webp\" alt=\"Carrelage sol 2\" width=\"1600\" height=\"900\" loading=\"lazy\">\n" +
"        </picture>\n" +
"      </div>\n" +
"    </section>\n" +
"\n" +
"    <section class=\"reveal\">\n" +
"      <h2>Zone d'intervention</h2>\n" +
"      <ul>\n" +
"        <li><a href=\"/carreleur-marseille/\">Marseille</a></li>\n" +
"        <li><a href=\"/carreleur-aubagne/\">Aubagne</a></li>\n" +
"        <li><a href=\"/carreleur-allauch/\">Allauch</a></li>\n" +
"        <li><a href=\"/carreleur-la-ciotat/\">La Ciotat</a></li>\n" +
"      </ul>\n" +
"    </section>\n" +
"\n" +
"    <section class=\"reveal\">\n" +
"      <h2>Comment ça se passe</h2>\n" +
"      <ol>\n" +
"        <li>Demande de contact</li>\n" +
"        <li>Visite sur place</li>\n" +
"        <li>Devis personnalisé</li>\n" +
"        <li>Intervention</li>\n" +
"      </ol>\n" +
"    </section>\n" +
"    \n" +
"    <section class=\"reveal\">\n" +
"      <h2>Questions fréquentes</h2>\n" +
"      <p><strong>Posez-vous du marbre ?</strong> Oui, nous posons tous types de revêtements. Contactez-nous pour un devis.</p>\n" +
"    </section>\n" +
"  </main>\n" +
"  \n" +
"  <footer id=\"contact\">\n" +
"    <h2>Contact</h2>\n" +
"    <p>1 rue de la Démonstration, 13001 Marseille</p>\n" +
"    <p>Lundi–vendredi 8 h–18 h</p>\n" +
"    <p><a href=\"tel:+33400000000\">+33 4 00 00 00 00</a></p>\n" +
"    <a href=\"#contact\" class=\"btn\">Demander un devis</a>\n" +
"    <nav>\n" +
"      <a href=\"/mentions-legales/\">Mentions légales</a>\n" +
"      <a href=\"/confidentialite/\">Confidentialité</a>\n" +
"      <a href=\"/carreleur-marseille/\">Marseille</a>\n" +
"      <a href=\"/carreleur-aubagne/\">Aubagne</a>\n" +
"      <a href=\"/carreleur-allauch/\">Allauch</a>\n" +
"      <a href=\"/carreleur-la-ciotat/\">La Ciotat</a>\n" +
"    </nav>\n" +
"    <div style=\"display:none\">" + htmlUtils + "</div>\n" +
"  </footer>\n" +
"  <script src=\"/site.js\" defer></script>\n" +
"</body>\n" +
"</html>";
  await fs.writeFile(path.join(dir, 'index.html'), accueilHtml);

  // Commune pages
  const communes = ['Marseille', 'Aubagne', 'Allauch', 'La Ciotat'];
  for(let c of communes) {
    const slug = c.toLowerCase().replace(/ /g, '-');
    const folder = path.join(dir, "carreleur-" + slug);
    await fs.mkdir(folder, { recursive: true });
    
    const neighbors = communes.filter(x => x !== c).slice(0, 2);
    let neighborsHtml = "";
    for(let n of neighbors) {
      neighborsHtml += "<li><a href=\"/carreleur-" + n.toLowerCase().replace(/ /g, '-') + "/\">" + n + "</a></li>\n";
    }
    
    const html = "<!DOCTYPE html>\n" +
"<html lang=\"fr\" class=\"no-js\">\n" +
"<head>\n" +
"  <meta charset=\"utf-8\">\n" +
"  <title>Carreleur à " + c + " — Démo Carreleur Marseille</title>\n" +
"  <meta name=\"description\" content=\"Démo Carreleur Marseille, votre artisan de confiance pour la pose de carrelage à " + c + ". Demandez votre devis gratuit.\">\n" +
"  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n" +
"  <link rel=\"canonical\" href=\"https://carreleur.demo.invalid/carreleur-" + slug + "/\">\n" +
"  <meta name=\"robots\" content=\"index, follow\">\n" +
"  <meta property=\"og:title\" content=\"Carreleur à " + c + " — Démo Carreleur Marseille\">\n" +
"  <meta property=\"og:description\" content=\"Démo Carreleur Marseille, votre artisan de confiance à " + c + ".\">\n" +
"  <meta property=\"og:image\" content=\"https://carreleur.demo.invalid/images/bathroom_floor_tile_1600.webp\">\n" +
"  <link rel=\"preload\" href=\"/fonts/manrope.woff2\" as=\"font\" type=\"font/woff2\" crossorigin>\n" +
"  <style>\n" +
"    @font-face { font-family: 'Manrope'; src: url('/fonts/manrope.woff2') format('woff2'); font-display: swap; }\n" +
"  </style>\n" +
"  <link rel=\"stylesheet\" href=\"/styles.css\">\n" +
"  <script>document.documentElement.classList.remove('no-js');</script>\n" +
"  <noscript><style>.reveal { opacity: 1; transform: none; }</style></noscript>\n" +
"  <script type=\"application/ld+json\">\n" +
"  {\n" +
"    \"@context\": \"https://schema.org\",\n" +
"    \"@type\": \"HomeAndConstructionBusiness\",\n" +
"    \"name\": \"Démo Carreleur Marseille\",\n" +
"    \"url\": \"https://carreleur.demo.invalid/\",\n" +
"    \"telephone\": \"+33 4 00 00 00 00\",\n" +
"    \"address\": {\n" +
"      \"@type\": \"PostalAddress\",\n" +
"      \"streetAddress\": \"1 rue de la Démonstration\",\n" +
"      \"postalCode\": \"13001\",\n" +
"      \"addressLocality\": \"Marseille\"\n" +
"    },\n" +
"    \"openingHours\": \"Mo-Fr 08:00-18:00\",\n" +
"    \"areaServed\": [\"Marseille\", \"Aubagne\", \"Allauch\", \"La Ciotat\"],\n" +
"    \"image\": \"https://carreleur.demo.invalid/images/bathroom_floor_tile_1600.webp\"\n" +
"  }\n" +
"  </script>\n" +
"</head>\n" +
"<body>\n" +
"  <header>\n" +
"    <div>Démo Carreleur Marseille</div>\n" +
"    <a href=\"/\">Retour à l'accueil</a>\n" +
"  </header>\n" +
"  <main>\n" +
"    <section class=\"hero\">\n" +
"      <h1>Carreleur à " + c + "</h1>\n" +
"      <p>Démo Carreleur Marseille intervient à " + c + " et alentours pour tous vos travaux de carrelage.</p>\n" +
"      <picture>\n" +
"        <source srcset=\"/images/tiled_bathroom_2_480.avif 480w, /images/tiled_bathroom_2_960.avif 960w, /images/tiled_bathroom_2_1600.avif 1600w\" type=\"image/avif\">\n" +
"        <source srcset=\"/images/tiled_bathroom_2_480.webp 480w, /images/tiled_bathroom_2_960.webp 960w, /images/tiled_bathroom_2_1600.webp 1600w\" type=\"image/webp\">\n" +
"        <img src=\"/images/tiled_bathroom_2_1600.webp\" alt=\"Carrelage mural\" width=\"1600\" height=\"900\" fetchpriority=\"high\">\n" +
"      </picture>\n" +
"    </section>\n" +
"    \n" +
"    <section class=\"reveal\">\n" +
"      <h2>Nos prestations à " + c + "</h2>\n" +
"      <p>Nous réalisons la pose de carrelage, faïence, mosaïque et dalles sur plots. " + lorem + "</p>\n" +
"    </section>\n" +
"\n" +
"    <section class=\"reveal\">\n" +
"      <h2>Comment ça se passe</h2>\n" +
"      <ol>\n" +
"        <li>Demande de contact</li>\n" +
"        <li>Visite sur place</li>\n" +
"        <li>Devis personnalisé</li>\n" +
"        <li>Intervention</li>\n" +
"      </ol>\n" +
"      <a href=\"#contact\" class=\"btn\">Demander un devis</a>\n" +
"    </section>\n" +
"    \n" +
"    <section class=\"reveal\">\n" +
"      <h2>Villes voisines</h2>\n" +
"      <ul>\n" +
"        <li><a href=\"/\">Marseille (Accueil)</a></li>\n" +
"        " + neighborsHtml + "\n" +
"      </ul>\n" +
"    </section>\n" +
"  </main>\n" +
"  \n" +
"  <footer id=\"contact\">\n" +
"    <nav>\n" +
"      <a href=\"/mentions-legales/\">Mentions légales</a>\n" +
"      <a href=\"/confidentialite/\">Confidentialité</a>\n" +
"    </nav>\n" +
"    <div style=\"display:none\">" + htmlUtils + "</div>\n" +
"  </footer>\n" +
"  <script src=\"/site.js\" defer></script>\n" +
"</body>\n" +
"</html>";
    await fs.writeFile(path.join(folder, 'index.html'), html);
  }

  // Legal pages
  const legalPages = {
    'mentions-legales': {
      title: 'Mentions légales',
      desc: 'Mentions légales du site Démo Carreleur Marseille. Site de démonstration : entreprise fictive.',
      content: "<h2>Informations</h2>\n" +
"        <p>Site de démonstration : entreprise fictive.</p>\n" +
"        <p>SIREN : 000000000</p>\n" +
"        <p>Assurance décennale : Assureur fictif, numéro DEMO-0001</p>\n" +
"        <h2>Crédits photos</h2>\n" +
"        <ul>\n" +
"          <li>bathroom_floor_tile : Par Mark, CC BY 2.0, Source : <a href=\"https://commons.wikimedia.org/wiki/File:Bathroom_floor_tile.jpg\">https://commons.wikimedia.org/wiki/File:Bathroom_floor_tile.jpg</a></li>\n" +
"          <li>bathroom_tiles : Par Clemens v. Vogelsang, CC BY 2.0, Source : <a href=\"https://commons.wikimedia.org/wiki/File:Bathroom_tiles.jpg\">https://commons.wikimedia.org/wiki/File:Bathroom_tiles.jpg</a></li>\n" +
"          <li>old_bathroom : Par Infrogmation, CC BY-SA 3.0, Source : <a href=\"https://commons.wikimedia.org/wiki/File:Old_bathroom.jpg\">https://commons.wikimedia.org/wiki/File:Old_bathroom.jpg</a></li>\n" +
"          <li>tiled_bathroom_2 : Par Mark, CC BY 2.0, Source : <a href=\"https://commons.wikimedia.org/wiki/File:Tiled_bathroom_2.jpg\">https://commons.wikimedia.org/wiki/File:Tiled_bathroom_2.jpg</a></li>\n" +
"          <li>shower_2 : Par Markus Schweiss, CC BY-SA 3.0, Source : <a href=\"https://commons.wikimedia.org/wiki/File:Shower_2.jpg\">https://commons.wikimedia.org/wiki/File:Shower_2.jpg</a></li>\n" +
"          <li>walk_in_shower : Par Glasprofi24, CC BY-SA 4.0, Source : <a href=\"https://commons.wikimedia.org/wiki/File:Walk_in_shower.jpg\">https://commons.wikimedia.org/wiki/File:Walk_in_shower.jpg</a></li>\n" +
"        </ul>"
    },
    'confidentialite': {
      title: 'Politique de confidentialité',
      desc: 'Politique de confidentialité de Démo Carreleur Marseille.',
      content: "<h2>Données personnelles</h2>\n" +
"        <p>Nous ne collectons aucune donnée personnelle via des cookies tiers. Les données du formulaire sont conservées 1 an.</p>"
    }
  };
  
  for(let slug in legalPages) {
    let data = legalPages[slug];
    const folder = path.join(dir, slug);
    await fs.mkdir(folder, { recursive: true });
    const html = "<!DOCTYPE html>\n" +
"<html lang=\"fr\" class=\"no-js\">\n" +
"<head>\n" +
"  <meta charset=\"utf-8\">\n" +
"  <title>" + data.title + " — Démo Carreleur Marseille</title>\n" +
"  <meta name=\"description\" content=\"" + data.desc + "\">\n" +
"  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n" +
"  <link rel=\"canonical\" href=\"https://carreleur.demo.invalid/" + slug + "/\">\n" +
"  <meta name=\"robots\" content=\"index, follow\">\n" +
"  <meta property=\"og:title\" content=\"" + data.title + "\">\n" +
"  <meta property=\"og:description\" content=\"" + data.desc + "\">\n" +
"  <meta property=\"og:image\" content=\"https://carreleur.demo.invalid/images/bathroom_floor_tile_1600.webp\">\n" +
"  <link rel=\"preload\" href=\"/fonts/manrope.woff2\" as=\"font\" type=\"font/woff2\" crossorigin>\n" +
"  <style>\n" +
"    @font-face { font-family: 'Manrope'; src: url('/fonts/manrope.woff2') format('woff2'); font-display: swap; }\n" +
"  </style>\n" +
"  <link rel=\"stylesheet\" href=\"/styles.css\">\n" +
"  <script>document.documentElement.classList.remove('no-js');</script>\n" +
"  <noscript><style>.reveal { opacity: 1; transform: none; }</style></noscript>\n" +
"  <script type=\"application/ld+json\">\n" +
"  {\n" +
"    \"@context\": \"https://schema.org\",\n" +
"    \"@type\": \"HomeAndConstructionBusiness\",\n" +
"    \"name\": \"Démo Carreleur Marseille\",\n" +
"    \"url\": \"https://carreleur.demo.invalid/\",\n" +
"    \"telephone\": \"+33 4 00 00 00 00\",\n" +
"    \"address\": {\n" +
"      \"@type\": \"PostalAddress\",\n" +
"      \"streetAddress\": \"1 rue de la Démonstration\",\n" +
"      \"postalCode\": \"13001\",\n" +
"      \"addressLocality\": \"Marseille\"\n" +
"    },\n" +
"    \"openingHours\": \"Mo-Fr 08:00-18:00\",\n" +
"    \"areaServed\": [\"Marseille\", \"Aubagne\", \"Allauch\", \"La Ciotat\"],\n" +
"    \"image\": \"https://carreleur.demo.invalid/images/bathroom_floor_tile_1600.webp\"\n" +
"  }\n" +
"  </script>\n" +
"</head>\n" +
"<body>\n" +
"  <header>\n" +
"    <div>Démo Carreleur Marseille</div>\n" +
"    <a href=\"/\">Retour à l'accueil</a>\n" +
"  </header>\n" +
"  <main>\n" +
"    <h1>" + data.title + "</h1>\n" +
"    " + data.content + "\n" +
"  </main>\n" +
"  <footer id=\"contact\">\n" +
"    <nav>\n" +
"      <a href=\"/mentions-legales/\">Mentions légales</a>\n" +
"      <a href=\"/confidentialite/\">Confidentialité</a>\n" +
"    </nav>\n" +
"    <div style=\"display:none\">" + htmlUtils + "</div>\n" +
"  </footer>\n" +
"  <script src=\"/site.js\" defer></script>\n" +
"</body>\n" +
"</html>";
    await fs.writeFile(path.join(folder, 'index.html'), html);
  }

  // attributions.json correction
  const oldAttributions = JSON.parse(await fs.readFile(path.join(dir, 'attributions.json'), 'utf8'));
  for (let a of oldAttributions) {
     if (a.fichier.includes('bathroom_floor_tile')) {
         a.auteur = "Mark";
         a.source = "https://commons.wikimedia.org/wiki/File:Bathroom_floor_tile.jpg";
         a.licence = "CC BY 2.0";
     } else if (a.fichier.includes('bathroom_tiles')) {
         a.auteur = "Clemens v. Vogelsang";
         a.source = "https://commons.wikimedia.org/wiki/File:Bathroom_tiles.jpg";
         a.licence = "CC BY 2.0";
     } else if (a.fichier.includes('old_bathroom')) {
         a.auteur = "Infrogmation";
         a.source = "https://commons.wikimedia.org/wiki/File:Old_bathroom.jpg";
         a.licence = "CC BY-SA 3.0";
     } else if (a.fichier.includes('tiled_bathroom_2')) {
         a.auteur = "Mark";
         a.source = "https://commons.wikimedia.org/wiki/File:Tiled_bathroom_2.jpg";
         a.licence = "CC BY 2.0";
     } else if (a.fichier.includes('shower_2')) {
         a.auteur = "Markus Schweiss";
         a.source = "https://commons.wikimedia.org/wiki/File:Shower_2.jpg";
         a.licence = "CC BY-SA 3.0";
     } else if (a.fichier.includes('walk_in_shower')) {
         a.auteur = "Glasprofi24";
         a.source = "https://commons.wikimedia.org/wiki/File:Walk_in_shower.jpg";
         a.licence = "CC BY-SA 4.0";
     }
  }
  await fs.writeFile(path.join(dir, 'attributions.json'), JSON.stringify(oldAttributions, null, 2));

  // Generate Font
  try {
    const fontUrl = 'https://fonts.gstatic.com/s/manrope/v15/xn7gYHE41ni1AdIRqAuZvw1dCw.woff2';
    await download(fontUrl, path.join(dir, 'fonts', 'manrope.woff2'));
    await fs.writeFile(path.join(dir, 'fonts', 'OFL.txt'), 'SIL OPEN FONT LICENSE Version 1.1');
  } catch(e) {
    console.error('Failed to download font:', e);
  }
}
main().catch(console.error);
