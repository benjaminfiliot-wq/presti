#!/usr/bin/env node
// scripts/maquette-formulaire-qa.mjs — juge du formulaire d'entrée de la vitrine (« Recevoir la maquette de mon site »,
// app/MaquetteForm.tsx et sa section #maquette de app/page.tsx ; décision 1 de Benj, 06/10/2026 ; route 026-145).
//
// La route est jugée par prospects-entrant-qa (PE-1 à PE-10). Ici, le CÂBLAGE de l'écran vers la route, lu dans les sources :
//   MF-1  la section #maquette et le lien de l'appel final n'existent que sous actif('prospectsEntrant') ; le drapeau est levé ;
//   MF-2  le formulaire poste en JSON à /api/prospects/entrant exactement les champs que la route lit (entreprise, metier,
//         commune, site_ou_instagram, email, accord, societe), et `accord` part en booléen (jamais la chaîne "on") ;
//   MF-3  la case d'accord n'est jamais pré-cochée, elle est requise, son texte dit « assistant IA » et renvoie à
//         /confidentialite#prospection, ancre qui existe et dont la section parle du formulaire « Recevoir la maquette » ;
//   MF-4  les métiers viennent de METIERS (lib/agents/acquisition/contrat.ts) par leur identifiant : aucune liste recopiée ;
//   MF-5  le piège à robots s'appelle `societe` (le nom que la route surveille), hors du parcours clavier et hors écran ;
//   MF-6  le composant n'écrit aucune promesse à lui : il affiche le message rendu par la route (ni délai, ni « vous écrira »).
// Sabotages (toujours joués) : chacun dégrade une copie des sources et doit rendre rouge au moins un critère.
// Ce qu'il NE prouve PAS : qu'un envoi réel arrive en base. Ça se constate en production (envoi d'essai, puis ménage).
//
// Usage : node scripts/maquette-formulaire-qa.mjs     (code 0 seulement si tout est vert et chaque sabotage est vu)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const lire = (rel) => fs.readFileSync(path.join(R, rel), 'utf8').replace(/\r\n?/g, '\n')
const SRC = {
  page: lire('app/page.tsx'),
  form: lire('app/MaquetteForm.tsx'),
  flags: lire('lib/flags.ts'),
  css: lire('app/globals.css'),
  conf: lire('app/confidentialite/page.tsx'),
  prospection: lire('lib/confidentialite/prospection.ts'),
  route: lire('app/api/prospects/entrant/route.ts'),
}
const CHAMPS = ['entreprise', 'metier', 'commune', 'site_ou_instagram', 'email', 'accord', 'societe']

function juger(s) {
  const res = []
  const ok = (id, nom, fautes, bien) => res.push({ id, nom, ok: fautes.length === 0, detail: fautes.join(' ; ') || bien })

  {
    const f = []
    const iSection = s.page.indexOf('id="maquette"')
    const avant = iSection < 0 ? '' : s.page.slice(Math.max(0, iSection - 200), iSection)
    if (iSection < 0) f.push('section id="maquette" absente')
    else if (!/actif\('prospectsEntrant'\)\s*\?\s*\(\s*<section/.test(avant)) f.push('la section #maquette n’est pas sous actif(\'prospectsEntrant\')')
    if (/href="#maquette"/.test(s.page) && !/actif\('prospectsEntrant'\)\s*\?\s*<p className="lp-final-alt"><a href="#maquette">/.test(s.page)) f.push('le lien vers #maquette n’est pas sous le drapeau')
    if (!/prospectsEntrant:\s*true/.test(s.flags)) f.push('lib/flags.ts : prospectsEntrant n’est pas levé')
    ok('MF-1', 'drapeau', f, 'section et lien sous actif(\'prospectsEntrant\'), drapeau levé')
  }
  {
    const f = []
    if (!/fetch\('\/api\/prospects\/entrant',\s*\{\s*method: 'POST'/.test(s.form)) f.push('pas de POST vers /api/prospects/entrant')
    if (!/'content-type': 'application\/json'/.test(s.form)) f.push('le corps n’est pas déclaré JSON')
    const corps = s.form.match(/body: JSON\.stringify\(\{([\s\S]*?)\}\),/)?.[1] ?? ''
    const cles = [...corps.matchAll(/^\s*([a-z_]+):/gm)].map((m) => m[1])
    if (cles.slice().sort().join() !== CHAMPS.slice().sort().join()) f.push(`champs envoyés : ${cles.join(',') || 'aucun'}`)
    if (!/accord: f\.get\('accord'\) === 'on',/.test(corps)) f.push('accord ne part pas en booléen')
    for (const c of CHAMPS.filter((x) => x !== 'accord' && x !== 'societe')) if (!new RegExp(`corps\\.${c}\\b`).test(s.route)) f.push(`la route ne lit pas ${c}`)
    for (const c of ['entreprise', 'metier', 'commune', 'site_ou_instagram', 'email', 'societe']) if (!new RegExp(`name="${c}"`).test(s.form)) f.push(`aucun champ name="${c}"`)
    ok('MF-2', 'envoi vers la route', f, 'POST JSON des 7 champs lus par la route, accord booléen')
  }
  {
    const f = []
    const caseAccord = s.form.match(/<input type="checkbox" name="accord"[^>]*\/>/)?.[0] ?? ''
    if (!caseAccord) f.push('case d’accord absente')
    if (/defaultChecked|\bchecked\b/.test(caseAccord)) f.push('case pré-cochée')
    if (caseAccord && !/\brequired\b/.test(caseAccord)) f.push('case non requise')
    if (!/assistant IA/.test(s.form)) f.push('le texte de la case ne dit pas « assistant IA »')
    if (!/href="\/confidentialite#prospection"/.test(s.form)) f.push('pas de lien vers /confidentialite#prospection')
    if (!/id="prospection"/.test(s.conf)) f.push('ancre #prospection absente de /confidentialite')
    if (!/Recevoir la maquette/.test(s.prospection)) f.push('la notice ne parle pas du formulaire « Recevoir la maquette »')
    ok('MF-3', 'accord et information', f, 'case non pré-cochée, requise, renvoi à la notice de prospection')
  }
  {
    const f = []
    if (!/import \{ METIERS \} from '@\/lib\/agents\/acquisition\/contrat'/.test(s.page)) f.push('la page n’importe pas METIERS')
    if (!/metiers=\{METIERS\.map\(\(m\) => \(\{ id: m\.id, libelle: m\.libelle \}\)\)\}/.test(s.page)) f.push('METIERS n’est pas passé au formulaire par id et libellé')
    if (/menuisier|plombier|couvreur|electricien|électricien/i.test(s.form)) f.push('le formulaire recopie une liste de métiers')
    if (!/<option key=\{m\.id\} value=\{m\.id\}>/.test(s.form)) f.push('la valeur envoyée n’est pas l’identifiant du métier')
    ok('MF-4', 'métiers', f, 'METIERS de contrat.ts, valeur = identifiant')
  }
  {
    const f = []
    if (!/corps\.societe/.test(s.route)) f.push('la route ne surveille pas societe')
    const piege = s.form.match(/<label className="lp-mq-piege"[\s\S]*?<\/label>/)?.[0] ?? ''
    if (!/name="societe"/.test(piege)) f.push('le piège ne s’appelle pas societe')
    if (!/tabIndex=\{-1\}/.test(piege)) f.push('le piège est dans le parcours clavier')
    if (!/aria-hidden="true"/.test(piege)) f.push('le piège est lu par les lecteurs d’écran')
    if (!/\.lp-mq-piege\{position:absolute!important;left:-10000px/.test(s.css)) f.push('le piège est visible à l’écran')
    ok('MF-5', 'piège à robots', f, 'societe, hors clavier, hors écran')
  }
  {
    const f = []
    if (!/setEtat\(\{ type: 'ok', message: j\.message \|\|/.test(s.form)) f.push('le message de la route n’est pas affiché')
    if (/48 ?h|vous écrira|sous \d/i.test(s.form)) f.push('le composant écrit sa propre promesse (délai ou « vous écrira »)')
    ok('MF-6', 'pas de promesse propre', f, 'message de la route affiché tel quel')
  }
  return res
}

let rouge = 0
for (const r of juger(SRC)) { console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.id} — ${r.nom} : ${r.detail}`); if (!r.ok) rouge++ }

const remplacer = (s, a, b) => { if (!s.includes(a)) throw new Error(`sabotage sans prise : ${a.slice(0, 60)}`); return s.replace(a, b) }
const SABOTAGES = [
  ['section hors drapeau', () => ({ page: remplacer(SRC.page, "{actif('prospectsEntrant') ? (\n          <section className=\"lp-blk\" id=\"maquette\">", "{true ? (\n          <section className=\"lp-blk\" id=\"maquette\">") })],
  ['drapeau rebaissé', () => ({ flags: remplacer(SRC.flags, 'prospectsEntrant: true', 'prospectsEntrant: false') })],
  ['mauvaise adresse de route', () => ({ form: remplacer(SRC.form, "fetch('/api/prospects/entrant'", "fetch('/api/contact'") })],
  ['site ou Instagram non envoyé', () => ({ form: remplacer(SRC.form, "          site_ou_instagram: champ('site_ou_instagram'),\n", '') })],
  ['accord envoyé en chaîne', () => ({ form: remplacer(SRC.form, "accord: f.get('accord') === 'on',", "accord: champ('accord'),") })],
  ['case pré-cochée', () => ({ form: remplacer(SRC.form, '<input type="checkbox" name="accord" required />', '<input type="checkbox" name="accord" required defaultChecked />') })],
  ['lien vers la notice retiré', () => ({ form: remplacer(SRC.form, '<a href="/confidentialite#prospection">', '<a href="/confidentialite">') })],
  ['liste de métiers recopiée', () => ({ form: remplacer(SRC.form, '<option value="" disabled>Choisir</option>', '<option value="" disabled>Choisir</option><option value="menuisier">Menuisier</option>') })],
  ['piège renommé', () => ({ form: remplacer(SRC.form, '<input name="societe" tabIndex={-1}', '<input name="entreprise2" tabIndex={-1}') })],
  ['piège visible', () => ({ css: remplacer(SRC.css, '.lp-mq-piege{position:absolute!important;left:-10000px', '.lp-mq-piege{position:relative;left:0') })],
  ['promesse écrite dans le composant', () => ({ form: remplacer(SRC.form, "message: j.message || 'Merci, votre demande est enregistrée.'", "message: 'Merci : vous recevrez votre maquette sous 48 h.'") })],
]
let manques = 0
for (const [nom, fab] of SABOTAGES) {
  const rouges = juger({ ...SRC, ...fab() }).filter((r) => !r.ok).map((r) => r.id)
  if (rouges.length) console.log(`  sabotage vu    : ${nom} → ${rouges.join(', ')}`)
  else { console.log(`  sabotage MANQUÉ : ${nom} → tout reste vert`); manques++ }
}
const tout = rouge === 0 && manques === 0
console.log(tout ? `✓ maquette-formulaire : PASS — 6 critères verts, ${SABOTAGES.length} sabotages vus` : `✗ maquette-formulaire : FAIL — ${rouge} critère(s) rouge(s), ${manques} sabotage(s) manqué(s)`)
process.exitCode = tout ? 0 : 1
