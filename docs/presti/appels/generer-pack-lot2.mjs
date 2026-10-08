import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const packDir = path.join(root, 'docs/presti/appels/pack-2026-10-08-b');
fs.mkdirSync(packDir, { recursive: true });

const artisans = [
  {
    id: '804810323',
    slug: 'martin-bruno-menuiserie',
    nom: 'Martin Bruno Menuiserie',
    commune: 'Bois',
    cp: '17240',
    tel: '06 42 25 37 61',
    titre: 'La précision du sur-mesure pour votre habitat.',
    metier: 'Menuiserie extérieure & fermetures',
    services: ['Fenêtres & baies vitrées', 'Volets roulants & battants', 'Portes d’entrée', 'Portes de garage'],
    ink: '#1f382b',
    accent: '#c27838',
    adresse: '9 RUE DE LA CAVE, 17240 Bois',
    siret: '80481032300019',
    facebook: 'https://www.facebook.com/entrepriselocale17240/',
    siteOfficiel: '',
    notes: 'Page Facebook active @entrepriselocale17240. Pas de site web dédié.'
  },
  {
    id: '518912738',
    slug: 'boyer-chauffage-chevanceaux',
    nom: 'SARL Boyer Jean-François',
    commune: 'Chevanceaux',
    cp: '17210',
    tel: '05 46 04 62 82',
    titre: 'Votre confort thermique en toute saison.',
    metier: 'Chauffage, pompe à chaleur & bois',
    services: ['Pompe à chaleur', 'Chaudière condensation', 'Poêles & inserts bois', 'Chauffe-eau thermodynamique'],
    ink: '#1c3c47',
    accent: '#d17735',
    adresse: '8 ROUTE DE LA PIERRE FOLLE, 17210 Chevanceaux',
    siret: '51891273800011',
    facebook: 'https://www.facebook.com/jfboyer/',
    siteOfficiel: '',
    notes: 'Présence annuaires locaux, profil Facebook. Pas de site web propre.'
  },
  {
    id: '535088751',
    slug: 'broucaret-menuiserie-gemozac',
    nom: 'Broucaret Rodolphe',
    commune: 'Gémozac',
    cp: '17260',
    tel: '06 71 04 45 30',
    titre: 'Isoler, rénover, embellir durablement.',
    metier: 'Menuiserie, fermetures & isolation',
    services: ['Isolation des combles', 'Isolation des murs', 'Fenêtres PVC & Aluminium', 'Volets & portes'],
    ink: '#2d3b36',
    accent: '#b8682e',
    adresse: '1 RUE DE CHAMPAGNE CHADENIERS, 17260 Gémozac',
    siret: '53508875100016',
    facebook: '',
    siteOfficiel: '',
    notes: 'Fiche Eldo et PagesJaunes sans site web identifié.'
  },
  {
    id: '403811706',
    slug: 'jougourd-electricite-gemozac',
    nom: 'SARL Jougourd',
    commune: 'Gémozac',
    cp: '17260',
    tel: '05 46 94 20 24',
    titre: 'L’électricité et le confort thermique maîtrisés.',
    metier: 'Électricité générale & climatisation',
    services: ['Électricité générale', 'Chauffage électrique & régulation', 'Ventilation mécanique VMC', 'Mise en conformité'],
    ink: '#19334d',
    accent: '#e09432',
    adresse: '5 ZA PIED SEC, 17260 Gémozac',
    siret: '40381170600023',
    facebook: 'https://www.facebook.com/sarljougourd/',
    siteOfficiel: 'https://jougourd.com/contact/',
    notes: 'Enseigne Pulsat avec page Facebook et page de contact existante.'
  },
  {
    id: '392532628',
    slug: 'ferrari-ossato-gemozac',
    nom: 'Société Ferrari-Ossato',
    commune: 'Gémozac',
    cp: '17260',
    tel: '05 46 94 67 42',
    titre: 'Chaleur saine, économies d’énergie pérennes.',
    metier: 'Pompe à chaleur, poêles & chaudières',
    services: ['Pompe à chaleur air/eau', 'Poêles & inserts bois', 'Chaudières bois & granulés', 'Chauffe-eau thermodynamique'],
    ink: '#163e3d',
    accent: '#cb6f33',
    adresse: '44 RUE GAMBETTA, 17260 Gémozac',
    siret: '39253262800022',
    facebook: 'https://www.facebook.com/p/SARL-FERRARI-OSSATO-100063035451423/',
    siteOfficiel: '',
    notes: 'Page Facebook active @SARL-FERRARI-OSSATO. Certifié Atlantic.'
  },
  {
    id: '449831346',
    slug: 'courpron-plomberie-la-vallee',
    nom: 'Courpron Pascal',
    commune: 'La Vallée',
    cp: '17250',
    tel: '05 46 95 01 96',
    titre: 'L’exigence de l’artisan pour vos sanitaires et chauffage.',
    metier: 'Plomberie, chauffage & pompe à chaleur',
    services: ['Pompe à chaleur', 'Chaudière condensation', 'Chauffe-eau thermodynamique', 'Plomberie sanitaire'],
    ink: '#1f3e52',
    accent: '#bf6c31',
    adresse: '15 RUE DES ALBERTS, 17250 La Vallée',
    siret: '44983134600019',
    facebook: '',
    siteOfficiel: 'https://www.courpron-pascal-plomberie-lpa.fr/',
    notes: 'Site vitrine existant. Proposition à positionner en modernisation du parcours de demande.'
  },
  {
    id: '444566491',
    slug: 'guerineau-menuiserie-marans',
    nom: 'Guérineau Jean',
    commune: 'Marans',
    cp: '17230',
    tel: '05 46 01 19 59',
    titre: 'La menuiserie de tradition à Marans.',
    metier: 'Menuiserie extérieure & fermetures',
    services: ['Fenêtres & baies coulissantes', 'Volets roulants & battants', 'Portes d’entrée sécurisées', 'Portails & clôtures'],
    ink: '#293836',
    accent: '#b3642c',
    adresse: '4 RUE TIVOLI, 17230 Marans',
    siret: '44456649100015',
    facebook: '',
    siteOfficiel: '',
    notes: 'Artisan à Marans même, sans site internet.'
  },
  {
    id: '392383956',
    slug: 'royan-menuiserie-17',
    nom: 'Royan Menuiserie 17',
    commune: 'Royan',
    cp: '17200',
    tel: '05 46 05 82 50',
    titre: 'Fermetures et agencements de qualité sur la côte.',
    metier: 'Menuiserie & agencements extérieurs',
    services: ['Fenêtres alu & PVC', 'Volets & stores bannes', 'Portes d’entrée & garage', 'Pergolas bioclimatiques'],
    ink: '#183c48',
    accent: '#c9742b',
    adresse: '32 RUE ANTOINE LAURENT DE LAVOISIER, 17200 Royan',
    siret: '39238395600019',
    facebook: 'https://www.facebook.com/yannolivier17200/',
    siteOfficiel: 'https://2rm17.fr/menuiserie-royan',
    notes: 'Page Facebook active et site existant 2rm17.fr.'
  },
  {
    id: '377928742',
    slug: 'delage-chauffage-royan',
    nom: 'SAS Delage',
    commune: 'Royan',
    cp: '17200',
    tel: '05 46 38 42 93',
    titre: 'L’expertise thermique royannaise depuis plus de 40 ans.',
    metier: 'Chauffage, plomberie & génie thermique',
    services: ['Pompe à chaleur air/eau', 'Chaudière condensation gaz', 'Chauffe-eau thermodynamique', 'Entretien & dépannage'],
    ink: '#1d3a4d',
    accent: '#cc702e',
    adresse: '6 RUE LOUIS LEPINE, 17200 Royan',
    siret: '37792874200032',
    facebook: 'https://www.facebook.com/delagemenuiseries/',
    siteOfficiel: '',
    notes: 'Entreprise historique à Royan, sans parcours devis moderne en ligne.'
  },
  {
    id: '523902039',
    slug: 'mougon-electricite-solaire',
    nom: 'Mougon Stéphane (Mougon & Fils)',
    commune: 'Saint-Médard-d’Aunis',
    cp: '17220',
    tel: '06 13 75 83 66',
    titre: 'Électricité performante et énergie solaire d’avenir.',
    metier: 'Électricité générale, photovoltaïque & ventilation',
    services: ['Panneaux photovoltaïques', 'Installation électrique', 'Ventilation mécanique VMC', 'Régulation & radiateurs'],
    ink: '#1e354f',
    accent: '#d68d2a',
    adresse: '24 RUE DU SOLEIL ZA DE CROIX FORT, 17220 Saint-Médard-d’Aunis',
    siret: '52390203900016',
    facebook: 'https://www.facebook.com/mougon.stephane/',
    siteOfficiel: '',
    notes: 'Page Facebook @mougon.stephane active. Spécialiste solaire et électricité.'
  }
];

const esc = s => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Template CSS identique avec animations, typographies et responsive
const css = `@font-face{font-family:Atelier;src:url(fonts/space-grotesk.woff2);font-display:swap}@font-face{font-family:Texte;src:url(fonts/ibm-plex-sans.woff2);font-display:swap}*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:100px}body{margin:0;color:var(--ink);background:#f2f6f7;font:17px/1.6 Texte,Arial,sans-serif}a{color:inherit}button,input,select,textarea{font:inherit}button,a,input,select,textarea{outline-offset:5px}a:focus-visible,button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid var(--accent)}.skip{position:absolute;top:-100px}.skip:focus{top:15px;z-index:100;background:white;padding:10px}.demo{padding:7px 5vw;background:var(--ink);color:#fff;font-size:12px;letter-spacing:.04em;text-align:center}.nav{display:flex;align-items:center;justify-content:space-between;padding:24px 5vw;border-bottom:1px solid #c7d4d9;gap:20px}.brand{text-decoration:none;font:700 clamp(18px,2vw,25px)/1.2 Atelier,Arial;max-width:360px}.brand small{display:block;font:12px/1.8 Texte;letter-spacing:.08em;text-transform:uppercase}.navlinks{display:flex;gap:24px;align-items:center}.navlinks a{text-decoration:none;font-size:14px}.call{white-space:nowrap}.btn{display:inline-flex;gap:16px;justify-content:center;align-items:center;background:var(--ink);color:white;padding:14px 23px;border:1px solid var(--ink);border-radius:5px;text-decoration:none;cursor:pointer;font-weight:600;min-height:48px}.btn:hover{background:var(--accent);border-color:var(--accent)}.btn.light{background:#fff;color:var(--ink);border-color:#c7d4d9}.hero{display:grid;grid-template-columns:1.04fr 1fr;min-height:680px}.hero-copy{padding:72px 5vw 60px;display:flex;flex-direction:column;justify-content:center;align-items:flex-start}.eyebrow{text-transform:uppercase;letter-spacing:.15em;font-size:12px;font-weight:600}.eyebrow:before{content:'';display:inline-block;width:28px;height:2px;vertical-align:middle;background:var(--accent);margin-right:12px}h1,h2,h3{font-family:Atelier,Arial;line-height:1.08;letter-spacing:-.045em;font-weight:500}h1{font-size:clamp(44px,5.7vw,88px);margin:26px 0;max-width:780px}h2{font-size:clamp(35px,4vw,61px);margin:16px 0 30px;max-width:850px}h3{font-size:28px;margin:12px 0 20px}.intro{font-size:19px;max-width:510px;color:#455962}.actions{display:flex;gap:12px;flex-wrap:wrap;margin:24px 0}.hero-media{position:relative;overflow:hidden;background:var(--ink);perspective:1000px}.hero-media img{width:100%;height:100%;position:absolute;object-fit:cover;filter:saturate(.85);transition:transform .5s;transform:scale(1.02)}.hero-media:after{content:'';position:absolute;inset:0;background:linear-gradient(0deg,rgba(0,0,0,.45),transparent 45%)}.photo-note{position:absolute;bottom:22px;left:24px;right:24px;color:white;z-index:2;font-size:12px}.seal{position:absolute;top:24px;right:24px;background:#f5f8f6;color:var(--ink);border-radius:50%;width:116px;height:116px;display:flex;align-items:center;justify-content:center;text-align:center;font:15px/1.25 Atelier;box-shadow:0 10px 35px #0002;transform:rotate(8deg);z-index:2}.ribbon{display:flex;gap:18px;justify-content:space-between;flex-wrap:wrap;padding:25px 5vw;border-top:1px solid #c7d4d9;border-bottom:1px solid #c7d4d9;font-size:14px}.ribbon strong{display:block;font-family:Atelier;font-size:20px}.section{padding:95px 5vw}.section-heading{display:flex;justify-content:space-between;align-items:flex-end;gap:35px;margin-bottom:35px}.section-heading p{max-width:340px;color:#455962}.services{display:grid;grid-template-columns:repeat(2,1fr);border-top:1px solid #bdcdd3}.service{display:block;text-decoration:none;padding:28px 28px 28px 0;border-bottom:1px solid #bdcdd3;transition:padding .2s,background .2s}.service:nth-child(even){padding-left:35px;border-left:1px solid #bdcdd3}.service:hover{background:white;padding-left:20px}.service small{color:var(--ink);font-size:12px;letter-spacing:.09em;text-transform:uppercase}.service p{max-width:450px;color:#455962}.service span{font-size:14px;font-weight:600}.process{background:var(--ink);color:white;display:grid;grid-template-columns:1fr 1fr;gap:70px}.process p{color:#d8e3e7}.steps{list-style:none;padding:0;counter-reset:step}.steps li{position:relative;padding:22px 0 22px 55px;border-bottom:1px solid #ffffff30;counter-increment:step}.steps li:before{content:'0'counter(step);position:absolute;left:0;top:22px;color:#d8e3e7;font:18px Atelier}.steps h3{font-size:25px}.photo-band{height:420px;position:relative;overflow:hidden}.photo-band img{width:100%;height:100%;object-fit:cover;object-position:center 60%}.photo-band figcaption{position:absolute;bottom:15px;left:5vw;background:#fff;padding:9px 14px;font-size:12px;color:var(--ink)}.contact{display:grid;grid-template-columns:.9fr 1.1fr;gap:80px}.contact h2{max-width:550px}.telephone{font:32px Atelier;text-decoration:none;display:block;margin:25px 0}.address{font-size:15px;max-width:330px}.form-panel{background:white;padding:35px;border:1px solid #c7d4d9;border-radius:9px}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}label{display:block;font-size:14px;font-weight:600}input,select,textarea{width:100%;border:1px solid #a8bac3;border-radius:4px;background:#fff;padding:12px;color:var(--ink);margin:8px 0 16px}textarea{min-height:115px;resize:vertical}.full{grid-column:1/-1}.help{font-size:13px;color:#455962}.success{border-left:4px solid var(--accent);padding:18px;background:#f2f6f7;overflow-wrap:anywhere}.success:focus{outline:2px solid var(--accent)}footer{padding:42px 5vw 100px;background:var(--ink);color:#e5edf0;font-size:13px}footer a{color:white}footer details{margin-top:20px;border-top:1px solid #ffffff30;padding-top:15px}footer summary{cursor:pointer}.credits{max-width:1050px;overflow-wrap:anywhere}.mobilebar{display:none}.variant-1 .hero-copy{order:2}.variant-1 .hero-media{order:1}.variant-2 .hero{grid-template-columns:1.2fr .8fr}.variant-2 .hero-media{margin:45px 5vw 45px 0;border-radius:130px 130px 6px 6px}.variant-2 h1{font-size:clamp(44px,5.5vw,80px)}.reveal{transition:opacity .65s,transform .65s}.motion .reveal.pending{opacity:0;transform:translateY(25px)}@media(max-width:800px){.nav{padding:20px 6vw}.navlinks>a:not(.call){display:none}.navlinks{gap:0}.call{font-size:13px!important}.brand{max-width:210px}.hero,.variant-2 .hero{display:flex;flex-direction:column;min-height:0}.hero-copy,.variant-1 .hero-copy{order:0;padding:50px 6vw 42px}.hero-media,.variant-1 .hero-media{order:1;height:410px;flex:none}.variant-2 .hero-media{margin:0 6vw 32px;border-radius:90px 90px 5px 5px}.seal{width:90px;height:90px;font-size:13px}h1{font-size:clamp(44px,11vw,66px);max-width:100%;overflow-wrap:break-word}.intro{font-size:18px}.section{padding:65px 6vw}.section-heading{display:block}.services{grid-template-columns:1fr}.service:nth-child(even){border-left:0;padding-left:0}.process,.contact{grid-template-columns:1fr;gap:35px}.process .steps{margin-top:0}.ribbon{padding:22px 6vw;gap:20px}.ribbon>div{flex:1 1 140px}.ribbon strong{font-size:18px}.form-panel{padding:22px}.form-grid{grid-template-columns:1fr}.photo-band{height:300px}.photo-band figcaption{right:6vw;font-size:11px}.mobilebar{display:flex;position:fixed;bottom:0;left:0;right:0;background:white;border-top:1px solid #c7d4d9;padding:10px 5vw;gap:10px;z-index:10}.mobilebar .btn{flex:1;padding:11px;font-size:14px}.telephone{font-size:29px}.demo{font-size:11px}.navlinks .call{display:none}footer{padding-bottom:125px}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*,*:before,*:after{animation:none!important;transition:none!important}.motion .reveal.pending{opacity:1;transform:none}}`;

// JS avec 3D perspective et reveal
const js = `(()=>{const form=document.querySelector('form'),result=document.querySelector('#recap'),output=document.querySelector('#recap-texte');form.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity())return;const d=new FormData(form);output.textContent='Projet : '+d.get('projet')+' · Commune : '+d.get('commune')+' · Contact : '+d.get('contact')+' · Message : '+(d.get('message')||'À préciser ensemble');result.hidden=false;result.focus();document.querySelector('#modifier').addEventListener('click',()=>{result.hidden=true;form.querySelector('select').focus()},{once:true});});if(!matchMedia('(prefers-reduced-motion: reduce)').matches){document.documentElement.classList.add('motion');const observer=new IntersectionObserver(items=>items.forEach(item=>{if(item.isIntersecting){item.target.classList.remove('pending');observer.unobserve(item.target)}}),{threshold:.08});document.querySelectorAll('.reveal').forEach(el=>{el.classList.add('pending');observer.observe(el)});const photo=document.querySelector('.hero-media img');document.querySelector('.hero-media').addEventListener('pointermove',event=>{if(event.pointerType!=='mouse')return;const r=event.currentTarget.getBoundingClientRect();photo.style.transform='perspective(1000px) rotateY('+((event.clientX-r.left)/r.width-.5)*3+'deg) rotateX('+((event.clientY-r.top)/r.height-.5)*-3+'deg) scale(1.06) translate('+((event.clientX-r.left)/r.width-.5)*-12+'px,'+((event.clientY-r.top)/r.height-.5)*-10+'px)'});document.querySelector('.hero-media').addEventListener('pointerleave',()=>photo.style.transform='scale(1.02)')}})();`;

for (const [i, a] of artisans.entries()) {
  const out = path.join(root, 'public/sites-demo', 'appel-' + a.slug);
  const artisanPackDir = path.join(packDir, a.id);
  const proofsDir = path.join(artisanPackDir, 'maquette');

  fs.mkdirSync(out, { recursive: true });
  fs.mkdirSync(artisanPackDir, { recursive: true });
  fs.mkdirSync(proofsDir, { recursive: true });
  fs.mkdirSync(path.join(out, 'fonts'), { recursive: true });

  // Polices locales
  for (const f of ['space-grotesk.woff2', 'ibm-plex-sans.woff2', 'OFL.txt']) {
    fs.copyFileSync(path.join(root, 'public/sites-demo/electricien/fonts', f), path.join(out, 'fonts', f));
  }

  // Choix des assets d'illustration selon le métier (chauffage vs menuiserie vs électricité)
  const isMenuiserie = a.metier.toLowerCase().includes('menuiserie');
  const isElec = a.metier.toLowerCase().includes('électricité') || a.metier.toLowerCase().includes('solaire');
  const heroSourceDir = isMenuiserie ? 'menuisier' : isElec ? 'electricien' : 'chauffagiste';
  const detailSourceDir = isMenuiserie ? 'menuisier' : 'plombier';

  // Copie des images de référence avec attributions vérifiées
  const heroAttrList = JSON.parse(fs.readFileSync(path.join(root, 'public/sites-demo', heroSourceDir, 'attributions.json')));
  const detailAttrList = JSON.parse(fs.readFileSync(path.join(root, 'public/sites-demo', detailSourceDir, 'attributions.json')));

  const heroAttr = heroAttrList[0];
  const detailAttr = detailAttrList[1] || detailAttrList[0];

  fs.copyFileSync(path.join(root, 'public/sites-demo', heroSourceDir, heroAttr.fichier), path.join(out, 'hero-1600.webp'));
  fs.copyFileSync(path.join(root, 'public/sites-demo', detailSourceDir, detailAttr.fichier), path.join(out, 'detail-1600.webp'));

  const attrs = [
    { ...heroAttr, fichier: 'hero-1600.webp', usage: 'Photo illustrative indépendante ; aucun chantier de cette entreprise', modification: 'Recadrage CSS uniquement' },
    { ...detailAttr, fichier: 'detail-1600.webp', usage: 'Photo illustrative indépendante ; aucun chantier de cette entreprise', modification: 'Recadrage CSS uniquement' }
  ];
  fs.writeFileSync(path.join(out, 'attributions.json'), JSON.stringify(attrs, null, 2));

  const telFormat = a.tel.replace(/(..)(?=.)/g, '$1 ');
  const telURI = '+33' + a.tel.replace(/^0/, '').replace(/\s+/g, '');

  const cards = a.services.map(s => `<a class="service reveal" href="#devis"><small>${esc(a.commune)}</small><h3>${esc(s)}</h3><p>Présentez votre logement et votre besoin. Le projet se précise lors d’un échange avec l’artisan.</p><span>Préparer ma demande ↗</span></a>`).join('');
  const credits = attrs.map(at => `<p>${esc(at.legende)} — ${esc(at.auteur)}, <a href="${esc(at.source)}">Wikimedia Commons</a>, ${esc(at.licence)}. Photo illustrative indépendante.</p>`).join('');

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(a.nom)} — ${esc(a.metier)} à ${esc(a.commune)} · Démonstration</title><meta name="description" content="Proposition de site pour ${esc(a.nom)} à ${esc(a.commune)}. Découvrez les prestations et testez le parcours de demande de devis sans envoi."><meta name="theme-color" content="${a.ink}"><link rel="stylesheet" href="style.css"><script src="site.js" defer></script></head><body class="variant-${i % 3}" style="--ink:${a.ink};--accent:${a.accent}"><a class="skip" href="#contenu">Aller au contenu</a><div class="demo">Proposition de site par Presti · Démonstration privée · Aucune demande n’est envoyée</div><header class="nav"><a class="brand" href="index.html">${esc(a.nom)}<small>${esc(a.metier)}</small></a><nav class="navlinks" aria-label="Navigation principale"><a href="#prestations">Prestations</a><a href="#projet">Votre projet</a><a class="call" href="tel:${telURI}">${telFormat}</a><a class="btn" href="#devis">Parlons de votre projet ↗</a></nav></header><main id="contenu"><section class="hero"><div class="hero-copy"><span class="eyebrow">${esc(a.commune)} · Artisan de proximité</span><h1>${esc(a.titre)}</h1><p class="intro">${esc(a.metier)} à ${esc(a.commune)}. Un point de départ clair pour vos travaux : décrivez votre besoin et préparez votre échange.</p><div class="actions"><a class="btn" href="#devis">Préparer mon devis ↗</a><a class="btn light" href="#prestations">Voir les prestations</a></div><p class="help">Un projet de rénovation ou d’installation ? Commençons par votre besoin.</p></div><div class="hero-media"><img src="hero-1600.webp" width="${attrs[0].largeur || 1600}" height="${attrs[0].hauteur || 1200}" alt="${esc(attrs[0].alt || 'Travaux de rénovation')}"><div class="seal">Savoir-faire<br>garanti<br>au quotidien</div><span class="photo-note">Photographie illustrative · Ce visuel n’est pas une réalisation de ${esc(a.nom)}</span></div></section><div class="ribbon"><div><strong>${esc(a.commune)}</strong>Commune d’implantation</div><div><strong>${esc(a.services[0])}</strong>Votre projet à préciser</div><div><strong>Contact direct</strong>${telFormat}</div></div><section class="section" id="prestations"><div class="section-heading"><div><span class="eyebrow">Les prestations</span><h2>Partons de ce dont<br>vous avez besoin.</h2></div><p>Choisissez votre sujet pour préparer une demande précise. Le périmètre des travaux sera confirmé avec l’artisan.</p></div><div class="services">${cards}</div></section><section class="section process" id="projet"><div class="reveal"><span class="eyebrow">Votre projet, simplement</span><h2>Du premier échange<br>au projet défini.</h2><p>Le bon équipement dépend de votre habitation et de vos usages. Préparez ces informations pour discuter des possibilités.</p><a class="btn light" href="#devis">Décrire mon projet ↗</a></div><ol class="steps"><li class="reveal"><h3>Vous décrivez votre besoin</h3><p>Votre commune, le logement concerné et ce que vous souhaitez installer ou remplacer.</p></li><li class="reveal"><h3>Vous échangez avec l’artisan</h3><p>Les contraintes techniques, l’existant et les prochaines étapes se précisent ensemble.</p></li><li class="reveal"><h3>Vous examinez la proposition</h3><p>Le périmètre, le prix et le calendrier sont à confirmer avant tout engagement.</p></li></ol></section><figure class="photo-band" style="margin:0"><img src="detail-1600.webp" width="${attrs[1].largeur || 1600}" height="${attrs[1].hauteur || 1200}" loading="lazy" alt="${esc(attrs[1].alt || 'Détail chantier')}"><figcaption>Image d’illustration indépendante · ${esc(attrs[1].auteur || 'Commons')} · ${esc(attrs[1].licence || 'CC')}</figcaption></figure><section class="section contact" id="devis"><div class="reveal"><span class="eyebrow">Parlons de votre projet</span><h2>Votre besoin mérite<br>un échange.</h2><p>Précisez les premières informations utiles. Pour joindre directement ${esc(a.nom)}, appelez le numéro ci-dessous.</p><a class="telephone" href="tel:${telURI}">${telFormat} ↗</a><p class="address">${esc(a.adresse)}</p></div><div class="form-panel"><h3>Préparer ma demande</h3><p class="help">Ce formulaire est une démonstration : le récapitulatif reste affiché sur cette page, sans envoi ni stockage.</p><form><div class="form-grid"><label>Votre projet<select name="projet" required><option value="">Choisir un sujet</option>${a.services.map(s => `<option>${esc(s)}</option>`).join('')}<option>Autre besoin</option></select></label><label>Commune du projet<input name="commune" required autocomplete="address-level2" maxlength="120" placeholder="Votre commune"></label><label class="full">Téléphone ou e-mail pour l’échange<input name="contact" required maxlength="180" autocomplete="email" placeholder="Utilisez une donnée fictive pour tester"></label><label class="full">Quelques mots sur votre projet<textarea name="message" maxlength="1500" placeholder="Équipement existant, logement, besoin…"></textarea></label></div><button class="btn" type="submit">Afficher mon récapitulatif ↗</button></form><div class="success" id="recap" tabindex="-1" hidden role="status"><h3>Votre récapitulatif est prêt</h3><p id="recap-texte"></p><p>Aucun message n’a été envoyé. Vous pouvez utiliser ces informations lors de votre appel.</p><button class="btn light" type="button" id="modifier">Modifier ma demande</button></div></div></section></main><footer><strong>${esc(a.nom)} · ${esc(a.commune)}</strong><p>Proposition de site privée réalisée par Presti. L’artisan n’a pas validé cette présentation. Services, coordonnées et périmètre à confirmer avant publication.</p><details><summary>Informations et sources</summary><p>SIRET fourni par la liste ADEME du 07/10/2026 : ${esc(a.siret)}. Présence web : ${a.facebook ? `<a href="${esc(a.facebook)}">Page Facebook</a>` : a.siteOfficiel ? `<a href="${esc(a.siteOfficiel)}">Site relevé</a>` : 'Aucun site internet déclaré'}.</p><p>Éditeur de cette démonstration : Presti. Aucune collecte, aucun cookie, aucun envoi du formulaire.</p></details><details><summary>Crédits photographiques</summary><div class="credits">${credits}<p>Ces photos ne représentent pas des chantiers de l’entreprise. Les photos de l’artisan seront intégrées uniquement avec son accord.</p></div></details></footer><aside class="mobilebar" aria-label="Contact rapide"><a class="btn light" href="tel:${telURI}">Appeler</a><a class="btn" href="#devis">Préparer mon devis ↗</a></aside></body></html>`;

  fs.writeFileSync(path.join(out, 'index.html'), html);
  fs.writeFileSync(path.join(out, 'style.css'), css);
  fs.writeFileSync(path.join(out, 'site.js'), js);
  fs.writeFileSync(path.join(out, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
  fs.writeFileSync(path.join(out, 'site.json'), JSON.stringify(a, null, 2));

  // fiche.md
  const ficheMd = `# ${a.nom}

- **Métier (RGE)** : ${a.metier}
- **Commune** : ${a.commune} (${a.cp})
- **Téléphone** : ${a.tel}
- **Adresse** : ${a.adresse}
- **SIRET** : ${a.siret}

## Présence en ligne relevée (Firecrawl)
- **Site internet** : ${a.siteOfficiel ? a.siteOfficiel : 'Aucun site officiel identifié'}
- **Réseau social** : ${a.facebook ? `Page Facebook : ${a.facebook}` : 'Aucune page sociale officielle vérifiée'}
- **Notes** : ${a.notes}

## Maquette locale
- URL locale : /sites-demo/appel-${a.slug}/index.html
- Emplacement : public/sites-demo/appel-${a.slug}/
- Interactions : perspective 3D sur image hero, animations au défilement, simulateur de demande local sans envoi.
`;
  fs.writeFileSync(path.join(artisanPackDir, 'fiche.md'), ficheMd);

  // appel.md (script d'appel et stratégie)
  const aDejaSiteOuFb = Boolean(a.siteOfficiel || a.facebook);
  const accroche = a.siteOfficiel
    ? `« Bonjour, je vous appelle au sujet de votre entreprise à ${a.commune}. J’ai vu votre site actuel et je vous ai préparé une proposition pour simplifier vos demandes de devis et répondre instantanément aux prospects sans perdre de temps le soir. »`
    : a.facebook
    ? `« Bonjour, je vous appelle au sujet de votre entreprise à ${a.commune}. J’ai vu vos réalisations sur votre page Facebook : j’ai créé une maquette privée qui permet à vos clients de vous envoyer des demandes de devis claires et chiffrables en 1 clic. »`
    : `« Bonjour, je vous appelle parce que quand on cherche un ${a.metier.split('&')[0].trim()} à ${a.commune}, vous n'avez pas de site direct pour transformer les recherches en chantiers. J'ai préparé une maquette privée pour vous. »`;

  const appelMd = `# Guide d'Appel — ${a.nom} (${a.commune})

Téléphone direct : **${a.tel}**

## Accroche personnalisée
${accroche}

## Les 4 questions clés
1. **Origine des clients** : D’où viennent vos nouveaux chantiers aujourd'hui ? (Bouche-à-oreille, Facebook, Google ?)
2. **Gestion du temps** : Combien de temps vous passez le soir ou le week-end à faire des devis ou relancer ?
3. **Valeur moyenne** : Un chantier moyen chez vous, c'est quel montant ?
4. **Présentation de la maquette** : Je vous montre la maquette que j’ai faite spécialement pour votre entreprise, sans aucun engagement ? (Lien privé : \`/sites-demo/appel-${a.slug}/\`)

## Si contact par message (Facebook / SMS)
> « Bonjour ! Artisan à ${a.commune}, vos chantiers méritent une vitrine à la hauteur : j'ai conçu une maquette privée pour votre entreprise qui permet à vos clients de préparer leur demande de devis en 1 minute. Vous pouvez la voir ici sans engagement : [lien]. Si ça ne vous intéresse pas, aucun problème, bonne continuation ! »

## Mention STOP
- Si l'artisan refuse ou ne souhaite plus être contacté : arrêt immédiat et exclusion.
`;
  fs.writeFileSync(path.join(artisanPackDir, 'appel.md'), appelMd);
}

// Génération du rapport de synthèse RAPPORT.md
const rapport = `# Rapport du pack de prospection (Lot 2) — 2026-10-08

Dix nouveaux artisans du second œuvre sélectionnés en Charente-Maritime (17) avec analyse Firecrawl et maquettes complètes interactives prêtes pour appel téléphonique ou message.

| Artisan | Commune | Métier | Téléphone | Présence Web (Firecrawl) | Maquette locale |
|---|---|---|---|---|---|
| **Martin Bruno Menuiserie** | Bois (17240) | Menuiserie | 06 42 25 37 61 | Facebook (@entrepriselocale17240) | [appel-martin-bruno-menuiserie](/sites-demo/appel-martin-bruno-menuiserie/index.html) |
| **SARL Boyer Jean-François** | Chevanceaux (17210) | Chauffage & PAC | 05 46 04 62 82 | Facebook perso, annuaires | [appel-boyer-chauffage-chevanceaux](/sites-demo/appel-boyer-chauffage-chevanceaux/index.html) |
| **Broucaret Rodolphe** | Gémozac (17260) | Menuiserie & Isolation | 06 71 04 45 30 | Fiches Eldo / PagesJaunes | [appel-broucaret-menuiserie-gemozac](/sites-demo/appel-broucaret-menuiserie-gemozac/index.html) |
| **SARL Jougourd** | Gémozac (17260) | Électricité | 05 46 94 20 24 | Facebook + contact Pulsat | [appel-jougourd-electricite-gemozac](/sites-demo/appel-jougourd-electricite-gemozac/index.html) |
| **Société Ferrari-Ossato** | Gémozac (17260) | PAC & Bois | 05 46 94 67 42 | Facebook (@SARL-FERRARI-OSSATO) | [appel-ferrari-ossato-gemozac](/sites-demo/appel-ferrari-ossato-gemozac/index.html) |
| **Courpron Pascal** | La Vallée (17250) | Plomberie & Chauffage | 05 46 95 01 96 | Site vitrine officiel | [appel-courpron-plomberie-la-vallee](/sites-demo/appel-courpron-plomberie-la-vallee/index.html) |
| **Guérineau Jean** | Marans (17230) | Menuiserie | 05 46 01 19 59 | Aucun site (Marans centre) | [appel-guerineau-menuiserie-marans](/sites-demo/appel-guerineau-menuiserie-marans/index.html) |
| **Royan Menuiserie 17** | Royan (17200) | Menuiserie alu/PVC | 05 46 05 82 50 | Facebook actif + site 2rm17.fr | [appel-royan-menuiserie-17](/sites-demo/appel-royan-menuiserie-17/index.html) |
| **SAS Delage** | Royan (17200) | Chauffage & Plomberie | 05 46 38 42 93 | Facebook Delage, historique Royan | [appel-delage-chauffage-royan](/sites-demo/appel-delage-chauffage-royan/index.html) |
| **Mougon Stéphane (Mougon & Fils)** | Saint-Médard (17220) | Électricité & Solaire | 06 13 75 83 66 | Facebook (@mougon.stephane) | [appel-mougon-electricite-solaire](/sites-demo/appel-mougon-electricite-solaire/index.html) |

## Stratégie d'approche
- Pour les artisans disposant d'une page Facebook active (Martin, Jougourd, Ferrari-Ossato, Royan Menuiserie, Mougon) : l'approche valorise la conversion de leurs visiteurs sociaux en devis pré-remplis.
- Pour ceux ayant un site existant (Courpron, Royan Menuiserie) : l'argument n'est pas le manque de site, mais la réactivité (réponse sous 1h, devis automatisé).
- Pour ceux sans présence web (Guérineau à Marans, Broucaret) : l'argument est le gain de chantiers locaux face aux concurrents visibles sur Google.
`;

fs.writeFileSync(path.join(packDir, 'RAPPORT.md'), rapport, 'utf8');
console.log('10 maquettes et fiches générées avec succès pour le Lot 2.');
