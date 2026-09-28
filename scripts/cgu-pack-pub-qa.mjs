#!/usr/bin/env node
// scripts/cgu-pack-pub-qa.mjs — le juge du bloc « 3 ter. Le pack pubs locales » des CGU (fiche 026-131), écrit par Claude
// Code AVANT le bloc qu'il juge (fiche 026-108, « Ce qu'il faut faire », point 4). Contrat : scripts/fixtures/026-pubs-
// contenu/contrat-pack.json → cgu (seule source des phrases exigées).
//
// Lecture statique de app/cgu/page.tsx : le titre exact, sa place (après le bloc « 3 bis » id="site", avant « 4. Support »
// id="support" ; le bloc « 3 ter. Droit de rétractation » id="retractation" peut se trouver entre les deux, inchangé),
// le bloc 3 bis identique à HEAD (non-régression), les phrases exigées du contrat dans le bloc du pack (balises ôtées,
// apostrophes repliées), et « garanti » nulle part hors des deux phrases qui l'emploient légitimement. npm run typecheck.
//
// Critères : CG-1 titre et place · CG-2 bloc 3 bis inchangé (non-régression) · CG-3 phrases exigées · CG-4 aucune promesse
// interdite · CG-5 npm run typecheck vert.
//
// Usage :
//   node scripts/cgu-pack-pub-qa.mjs [--racine=<dossier>]
//   node scripts/cgu-pack-pub-qa.mjs --temoin     CG-2 seul (non-régression)
// Codes : 0 vert · 1 un critère rouge · 2 appel invalide. N'écrit que sous .orchestre/travail/cgu-pack-pub-qa/.
import fs from 'node:fs'
import path from 'node:path'
import { R, lireOptionsOuQuitter, git, lancer } from './fixtures/025/commun.mjs'
import { creerRapport, court, lf, dossierTravail } from './lib/sql-essai.mjs'
import { CONTRAT } from './fixtures/026-pubs-contenu/commun.mjs'

const NOM = 'cgu-pack-pub-qa'
const FICHE = '026-131'
const PAGE = 'app/cgu/page.tsx'
const CG = CONTRAT.cgu
const IDS = ['CG-1', 'CG-2', 'CG-3', 'CG-4', 'CG-5']

const o = lireOptionsOuQuitter(process.argv.slice(2), { connues: [] })
const refuser = (m) => { console.error(`✗ ${NOM} : ${m}`); process.exit(2) }
if (o.positionnels.length) refuser(`argument(s) inattendu(s) : ${o.positionnels.join(' ')}`)
const racine = o.racine
const aff = (p) => String(p).split(path.sep).join('/')
function lireSi(f) { try { const b = fs.readFileSync(f); return b.length ? lf(b.toString('utf8')) : '' } catch { return null } }

/** Replie les apostrophes (’ → ') pour comparer un texte recopié sans dépendre du glyphe choisi par l'auteur du bloc. */
const replierApostrophes = (t) => String(t).replace(/[’‘]/g, "'")
/** Le bloc « <h2 id="…">…</h2> » suivi de tout ce qui précède le prochain <h2 …> (ou la fin) : { titre, corps, entier, debut, fin }. */
function blocDe(texte, id) {
  const reTitre = new RegExp(`<h2[^>]*\\bid="${id}"[^>]*>([\\s\\S]*?)</h2>`)
  const m = reTitre.exec(texte)
  if (!m) return null
  const finTitre = m.index + m[0].length
  const suivant = /<h2[^>]*>/.exec(texte.slice(finTitre))
  const fin = suivant ? finTitre + suivant.index : texte.length
  return { titre: m[1], corps: texte.slice(finTitre, fin), entier: texte.slice(m.index, fin), debut: m.index, fin }
}
const sansBalises = (t) => replierApostrophes(t).replace(/<[^>]+>/g, ' ').replace(/&rsquo;/g, "'").replace(/\s+/g, ' ').trim()

function jugerBloc(s, texte) {
  // CG-1 — titre exact, à la bonne place
  const titreAttendu = `<h2 id="${CG.id}">${CG.titre_h2}</h2>`
  const iTitre = texte.indexOf(titreAttendu)
  const iSite = texte.indexOf(`id="${CG.apres_id}"`)
  const iSupport = texte.indexOf(`id="${CG.avant_id}"`)
  if (iTitre < 0) s.echoue('CG-1', `titre exact introuvable : « ${titreAttendu} »`)
  if (iSite < 0) s.echoue('CG-1', `bloc id="${CG.apres_id}" introuvable : la place ne peut pas se vérifier`)
  if (iSupport < 0) s.echoue('CG-1', `bloc id="${CG.avant_id}" introuvable : la place ne peut pas se vérifier`)
  if (iTitre >= 0 && iSite >= 0 && iTitre <= iSite) s.echoue('CG-1', `le bloc « ${CG.id} » n'est pas après id="${CG.apres_id}"`)
  if (iTitre >= 0 && iSupport >= 0 && iTitre >= iSupport) s.echoue('CG-1', `le bloc « ${CG.id} » n'est pas avant id="${CG.avant_id}"`)
  if (!s.enEchec('CG-1')) s.passe('CG-1', `« ${CG.titre_h2} » présent, après id="${CG.apres_id}" et avant id="${CG.avant_id}"`)

  const pubs = blocDe(texte, CG.id)
  if (!pubs) { s.echoue('CG-3', `bloc id="${CG.id}" introuvable : non jugé (CG-1)`); s.echoue('CG-4', `bloc id="${CG.id}" introuvable : non jugé (CG-1)`); return }
  const plat = sansBalises(pubs.corps).toLowerCase()

  // CG-3 — les phrases exigées
  const manquantes = CG.phrases_exigees.filter((p) => !plat.includes(replierApostrophes(p).toLowerCase()))
  if (manquantes.length) s.echoue('CG-3', `phrase(s) absente(s) du bloc : ${manquantes.map((p) => `« ${p} »`).join(' ; ')}`)
  else s.passe('CG-3', `${CG.phrases_exigees.length} phrases exigées présentes dans le bloc « ${CG.id} »`)

  // CG-4 — aucune promesse interdite ; « garanti » seulement dans les deux phrases permises
  const echecs4 = []
  for (const mot of CG.mots_interdits) if (plat.includes(mot.toLowerCase())) echecs4.push(`« ${mot} »`)
  const permisPlages = CG.phrases_garanti_permises.map((p) => { const q = replierApostrophes(p).toLowerCase(); const i = plat.indexOf(q); return i < 0 ? null : [i, i + q.length] }).filter(Boolean)
  const re = /garanti/gi
  let m2
  while ((m2 = re.exec(plat))) { if (!permisPlages.some(([a, b]) => m2.index >= a && m2.index < b)) { echecs4.push(`« garanti » hors des deux phrases permises, à « …${court(plat.slice(Math.max(0, m2.index - 30), m2.index + 30), 70)}… »`); break } }
  if (echecs4.length) for (const e of echecs4) s.echoue('CG-4', e)
  else s.passe('CG-4', `aucun mot interdit (${CG.mots_interdits.join(', ')}) ; « garanti » seulement dans les ${CG.phrases_garanti_permises.length} phrases permises`)
}

function jugerNonRegression(s) {
  const iciTexte = lireSi(path.join(racine, PAGE))
  const head = git(['show', `HEAD:${PAGE}`])
  if (head.code !== 0) { s.echoue('CG-2', `${PAGE} introuvable dans HEAD : la comparaison ne prouverait rien`); return }
  const blocHead = blocDe(lf(head.stdout), CG.apres_id)
  if (!blocHead) { s.echoue('CG-2', `bloc id="${CG.apres_id}" introuvable dans HEAD:${PAGE}`); return }
  if (iciTexte === null) { s.echoue('CG-2', `${PAGE} absent ou vide (racine ${aff(racine)})`); return }
  const blocIci = blocDe(iciTexte, CG.apres_id)
  if (!blocIci) { s.echoue('CG-2', `bloc id="${CG.apres_id}" introuvable (racine ${aff(racine)})`); return }
  if (blocIci.entier !== blocHead.entier) s.echoue('CG-2', `le bloc id="${CG.apres_id}" (« 3 bis ») a changé par rapport à HEAD`)
  else s.passe('CG-2', `bloc id="${CG.apres_id}" identique à HEAD (${blocHead.entier.length} caractères)`)
}

function jugerTypecheck(s) {
  const tb = path.join(dossierTravail(NOM), 'tsbuildinfo', Buffer.from(path.resolve(racine)).toString('hex').slice(0, 16))
  fs.mkdirSync(path.dirname(tb), { recursive: true })
  const r = lancer('npm', ['run', 'typecheck', '--', '--listFiles', '--tsBuildInfoFile', tb], { cwd: racine, timeout: 300_000, shell: process.platform === 'win32' })
  if (r.code !== 0) { s.echoue('CG-5', `npm run typecheck en code ${r.code}${r.signal ? ` (signal ${r.signal})` : ''} : ${court(r.derniereLigne || r.sortie, 200)}`); return }
  if (!r.sortie.split('\n').some((l) => l.replace(/\\/g, '/').includes(PAGE))) s.echoue('CG-5', `${PAGE} n'apparaît pas parmi les fichiers vérifiés (--listFiles) : le typecheck ne le voit pas`)
  else s.passe('CG-5', `npm run typecheck vert, ${PAGE} vérifié`)
}

// ── Le jugement ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const s = creerRapport(NOM, IDS, { entete: `${NOM} (${FICHE}) — racine ${aff(racine)}${o.temoin ? ' — témoin' : ''}` })
if (o.temoin) {
  for (const id of IDS) if (id !== 'CG-2') s.saute(id, `témoin : critère de fabrication, prouvé par le PASS de ${FICHE}`)
  jugerNonRegression(s)
  process.exit(s.fin())
}
const texte = lireSi(path.join(racine, PAGE))
if (texte === null) { for (const id of IDS) if (id !== 'CG-2') s.echoue(id, `${PAGE} absent ou vide (racine ${aff(racine)})`) }
else jugerBloc(s, texte)
jugerNonRegression(s)
jugerTypecheck(s)
process.exit(s.fin())
