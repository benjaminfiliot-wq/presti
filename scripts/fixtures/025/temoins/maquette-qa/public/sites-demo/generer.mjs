// Témoin de scripts/maquette-qa.mjs (fiche 025-01), écrit par Claude Code : un FAUX public/sites-demo/generer.mjs qui ne sait faire
// que le mode --maquette. Il n'est jamais lancé depuis ce dossier : maquette-qa --temoin le copie dans l'arbre témoin
// .orchestre/travail/maquette-qa/temoin/ (preparerTemoin, scripts/fixtures/025/commun.mjs) avec le modèle
// maquettes/modeles/menuisier/contenu.json et le faux scripts/maquette-capturer.mjs de ce dossier, plus, copiés du dépôt, les
// site.json des démos, les attributions de la démo nommée par le modèle et ses photos. Il simule l'état « après » de la fiche
// 025-02 pour prouver que MQ-1 à MQ-8 peuvent passer, et de la fiche 025-14 pour MQ-10 et MQ-11 : aucun libellé écrit en dur
// pour un métier (tout ce qui nomme le métier vient du modèle), et le crédit de la photo du haut écrit dans le haut de la page,
// en légende de la photo (la capture du haut le porte donc). Ce n'est pas une implémentation de référence : le vrai mode
// --maquette vit dans le vrai generer.mjs, au format v2, avec le kit.
//
// node public/sites-demo/generer.mjs --maquette=<maquette.json> --sortie=<dossier>
//   refuse (code 2, rien d'écrit) une sortie sous <racine>/public ou dans <racine> hors de <racine>/.orchestre/travail/ ;
//   écrit <sortie>/index.html, styles.css, attributions.json et images/ (photos copiées telles quelles, avec leurs attributions).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const RACINE = path.resolve(ICI, '..', '..')
const args = process.argv.slice(2)
const valeur = (nom) => args.find((a) => a.startsWith(`--${nom}=`))?.slice(nom.length + 3)
const arreter = (message) => { console.error(`✗ ${message}`); process.exit(2) }
const maquette = valeur('maquette')
const sortieBrute = valeur('sortie')
if (!maquette) arreter('témoin de maquette-qa : seul le mode --maquette=<fichier> est simulé')
if (!sortieBrute) arreter('--maquette exige --sortie=<dossier>')
// path.relative compare sans la casse sous Windows : « PUBLIC » est bien refusé
const dans = (parent, enfant) => { const r = path.relative(parent, enfant); return r === '' || (!r.startsWith('..') && !path.isAbsolute(r)) }
const sortie = path.resolve(sortieBrute)
if (dans(path.join(RACINE, 'public'), sortie)) arreter(`sortie refusée : ${sortie} est sous public/, que le site sert à tout le monde`)
if (dans(RACINE, sortie) && !dans(path.join(RACINE, '.orchestre', 'travail'), sortie)) arreter(`sortie refusée : ${sortie} est dans le dépôt, hors de .orchestre/travail/`)

const m = JSON.parse(fs.readFileSync(path.resolve(maquette), 'utf8'))
for (const k of ['entreprise', 'metier', 'ville', 'modele']) if (typeof m[k] !== 'string' || !m[k].trim()) arreter(`maquette.json : ${k} manque`)
if (!/^[a-z0-9-]+$/.test(m.modele)) arreter(`maquette.json : modèle « ${m.modele} » invalide`)
const dossierModele = path.join(RACINE, 'maquettes', 'modeles', m.modele)
const modele = JSON.parse(fs.readFileSync(path.join(dossierModele, 'contenu.json'), 'utf8'))
const communes = (Array.isArray(m.communes) ? m.communes : [m.ville]).join(', ')
const remplir = (t) => String(t).replace(/\{entreprise\}/g, m.entreprise).replace(/\{ville\}/g, m.ville).replace(/\{communes\}/g, communes)
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const texte = (t) => esc(remplir(t))

// les photos : copiées telles quelles depuis la démo nommée par le modèle, avec l'auteur et la licence de ses attributions
const demo = modele.photos.demo
const attributionsDemo = JSON.parse(fs.readFileSync(path.join(RACINE, 'public', 'sites-demo', demo, 'attributions.json'), 'utf8'))
const photos = modele.photos.fichiers.map((f) => {
  const a = attributionsDemo.find((x) => x.fichier === `images/${f}`)
  if (!a || !a.auteur || !a.licence) arreter(`${demo}/attributions.json : pas d’auteur ni de licence pour images/${f}`)
  return { f, a }
})
const heros = photos.find((p) => p.f === modele.photos.heros) || photos[0]
const autres = photos.filter((p) => p !== heros)
const parAuteur = new Map()
for (const { a } of photos) {
  const cle = `${a.auteur} (${a.licence}${/^oui\b/i.test(String(a.modifiee || '')) ? ', modifiée' : ''})`
  parAuteur.set(cle, true)
}
const credits = [...parAuteur.keys()].join(', ')
// le crédit de la photo du haut, dans le haut : une légende posée sur la photo (MQ-11, fiche 025-14)
const creditHeros = `${heros.a.auteur} (${heros.a.licence}${/^oui(?![\p{L}])/iu.test(String(heros.a.modifiee || '')) ? ', modifiée' : ''})`
const img = ({ f, a }, classe, eager = false) => `<img class="${classe}" src="images/${f}" alt="${esc(a.alt || a.legende || '')}" width="${a.largeur}" height="${a.hauteur}"${eager ? '' : ' loading="lazy"'}>`

const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${texte(modele.titre)}</title>
<meta name="description" content="${texte(modele.description)}">
<link rel="stylesheet" href="styles.css">
</head>
<body>
<header class="hero">
${img(heros, 'hero__photo', true)}
<p class="hero__credit">Photos d’illustration : ${esc(creditHeros)}</p>
<div class="hero__texte"><p class="surtitre">Maquette de la page d’accueil</p><h1>${texte(modele.h1)}</h1><p>${texte(modele.chapeau)}</p></div>
</header>
<main>
<section class="plateau" aria-label="L’entreprise en bref">
<h2>Ce que vous direz de vous</h2>
<div class="plateau__haut">
<div class="zone"><p class="zone__titre">Votre phrase, signée</p><blockquote class="zone__vide">À compléter avec vous</blockquote></div>
<div class="zone"><p class="zone__titre">Votre parcours</p><p class="zone__vide">À compléter avec vous</p></div>
</div>
<dl class="plateau__cases">
<div class="zone"><dt class="zone__titre">Premier repère</dt><dd class="zone__vide">À compléter avec vous</dd></div>
<div class="zone"><dt class="zone__titre">Deuxième repère</dt><dd class="zone__vide">À compléter avec vous</dd></div>
<div class="zone"><dt class="zone__titre">Troisième repère</dt><dd class="zone__vide">À compléter avec vous</dd></div>
</dl>
</section>
<section class="prestations"><h2>${texte(modele.prestations_titre)}</h2><ul>${modele.prestations.map((p) => `<li><h3>${texte(p.titre)}</h3><p>${texte(p.texte)}</p></li>`).join('')}</ul></section>
<section class="photos"><h2>${texte(modele.photos_titre)}</h2><div class="photos__grille">${autres.map((p) => img(p, 'photos__img')).join('')}</div></section>
<section class="contact" id="contact"><h2>${texte(modele.contact_titre)}</h2><p>${texte(modele.zone)}</p>
<form onsubmit="return false"><label>Votre projet<textarea name="projet"></textarea></label><button type="button">Envoyer</button><p class="form__note">Maquette : rien n’est envoyé</p></form></section>
</main>
<footer class="pied"><p>Maquette privée préparée par Presti pour ${esc(m.entreprise)}. Rien n’est publié.</p><p class="pied__credits">Photos d’illustration : ${esc(credits)}</p></footer>
</body>
</html>
`

const css = `*{box-sizing:border-box}html,body{margin:0}body{font:17px/1.55 Georgia,"Times New Roman",serif;color:#231a12;background:#f4ede2}
h1,h2,h3{font-family:system-ui,"Segoe UI",sans-serif;line-height:1.15;margin:0 0 .6em}
.hero{position:relative;height:88vh;min-height:420px;overflow:hidden;background:#1b140e}
.hero__photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:brightness(.62)}
.hero__credit{position:absolute;top:12px;right:12px;z-index:2;margin:0;max-width:calc(100% - 24px);padding:4px 10px;border-radius:4px;background:rgba(21,16,11,.82);color:#fff8ee;font:500 13px/1.35 system-ui,sans-serif}
.hero__texte{position:absolute;left:0;right:0;bottom:0;padding:32px 20px 48px;color:#fff8ee;max-width:760px}
.hero__texte h1{font-size:clamp(34px,6vw,64px)}.surtitre{text-transform:uppercase;letter-spacing:.12em;font:600 13px system-ui,sans-serif;margin:0 0 12px}
section{padding:56px 20px;max-width:1100px;margin:0 auto}
.plateau{max-width:none;background:#15100b;color:#f4ede2}.plateau>*{max-width:1060px;margin-left:auto;margin-right:auto}
.plateau__haut{display:grid;gap:18px;grid-template-columns:1fr}.plateau__cases{display:grid;gap:18px;grid-template-columns:1fr;margin-top:18px}
.zone{border:1.5px dashed #b89a74;border-radius:10px;padding:18px}.zone__titre{font:600 14px system-ui,sans-serif;text-transform:uppercase;letter-spacing:.08em;color:#d9c3a3;margin:0 0 8px}
.zone__vide{margin:0;font-style:italic;color:#fff8ee;font-size:19px}dd{margin:0}
.prestations ul{list-style:none;padding:0;display:grid;gap:20px;grid-template-columns:1fr}
.photos__grille{display:grid;gap:14px;grid-template-columns:1fr}.photos__img{width:100%;height:auto;display:block;border-radius:8px}
.contact form{display:grid;gap:12px;max-width:560px}.contact textarea{width:100%;min-height:96px;font:inherit}
.contact button{justify-self:start;padding:10px 20px;font:600 15px system-ui,sans-serif;background:#231a12;color:#fff8ee;border:0;border-radius:6px}
.form__note{margin:0;font:14px system-ui,sans-serif;color:#6b5a48}
.pied{padding:32px 20px;background:#231a12;color:#e9dcc8;font:14px/1.5 system-ui,sans-serif}.pied p{max-width:1060px;margin:0 auto 8px}
@media (min-width:768px){.plateau__haut{grid-template-columns:1fr 1fr}.plateau__cases{grid-template-columns:repeat(3,1fr)}.prestations ul,.photos__grille{grid-template-columns:repeat(2,1fr)}.hero__texte{padding:48px 56px 64px}}
`

fs.mkdirSync(path.join(sortie, 'images'), { recursive: true })
for (const { f } of photos) fs.copyFileSync(path.join(RACINE, 'public', 'sites-demo', demo, 'images', f), path.join(sortie, 'images', f))
fs.writeFileSync(path.join(sortie, 'attributions.json'), `${JSON.stringify(photos.map(({ f, a }) => ({ fichier: `images/${f}`, auteur: a.auteur, licence: a.licence, source: a.source, legende: a.legende, modifiee: a.modifiee || 'Non' })), null, 1)}\n`)
fs.writeFileSync(path.join(sortie, 'styles.css'), css)
fs.writeFileSync(path.join(sortie, 'index.html'), html)
console.log(`  ✓ maquette du modèle ${m.modele} : 1 page, ${photos.length} photos de ${demo}`)
