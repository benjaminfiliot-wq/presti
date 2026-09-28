// scripts/fixtures/026-pilotage/c/controles.mjs — les contrôles propres au lot c (026-104, écrits par Claude Code), déclarés
// par c/lot.mjs et lancés par scripts/juges-026-pilotage-preuve.mjs --lot=c ; controleJeuxPartie sert aussi TM-3 du mode
// --temoin de pilotage-ecran-qa.
//
//   controleJeux (JA-3)   chaque jeu d'essai de c/jeux/ passe son contrat : les vues par s/contrat-vues.mjs (026-067), les
//                         réglages par validerReglages, les blocs par c/contrat-blocs.mjs, la trésorerie, les jauges, les
//                         packs et le rôle par leur forme ; aucun jeu sans validateur ; aucun `_piege` dans un fichier (le
//                         juge le pose en servant) ; les pièges des deux contrats sont refusés (JC-3 : une vue sans source,
//                         une valeur numérique nue, un texte de bulle avec « @ » ou 9 chiffres, une carte Attention hors des
//                         quatre couleurs, et les pièges des blocs) ; c/jeux/ est exactement ce que fabriquer-jeux.mjs
//                         produit, et le témoin DÉRIVÉ exactement ce que fabriquer-temoin.mjs produit.
//   controleAppels (JA-6) --partie=carte → code 2 et le renvoi à 026-172 ; pilotage-recette sans option → code 2 (préalable) ;
//                         JC-6 lu dans le source : chaque JPEG que les juges du lot écrivent sort d'un page.screenshot(,
//                         l'image d'avant effacée au même chemin.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { validerVue, validerReglages, PIEGES } from '../s/contrat-vues.mjs'
import { validerBloc, PIEGES_BLOCS } from './contrat-blocs.mjs'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const R = path.resolve(ICI, '..', '..', '..', '..')
const JEUX = path.join(ICI, 'jeux')
const posix = (p) => p.split(path.sep).join('/')
const lireJeu = (rel) => JSON.parse(fs.readFileSync(path.join(JEUX, rel), 'utf8'))
// Les fins de ligne ne comptent pas : un checkout avec core.autocrlf rend CRLF ce que les fabriques écrivent en LF.
const lf = (t) => String(t).replace(/\r\n/g, '\n')
const cl = (x) => JSON.parse(JSON.stringify(x))
const court = (t, n = 140) => { const s = String(t ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? `${s.slice(0, n - 1)}…` : s }
function lister(d, rel = '') { return fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? lister(path.join(d, e.name), path.join(rel, e.name)) : [posix(path.join(rel, e.name))])) }
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/
const enveloppe = (e) => !!e && typeof e === 'object' && typeof e.source === 'string' && ISO.test(String(e.a)) && 'valeur' in e

// ── Le validateur de chaque jeu, choisi par son nom ──────────────────────────────────────────────────────────────────────
const VUE_DIRECT = ['attention-ordre.json', 'attention-vide.json', 'barre-sources.json', 'commandement-complet.json', 'direct-503.json']
const VUE_FIL = ['fil-nouvelle-bulle.json', 'fil-crieur.json']
const SALLE_DE = { 'reunion-en-cours.json': 'reunion', 'reunion-close.json': 'reunion', 'envois-formulaire-ferme.json': 'envois', 'salle-envois-gestes.json': 'envois', 'salle-machines-sans-ia.json': 'machines' }
const BLOC_DE = { 'decider.json': 'decider', 'decider-epinglee.json': 'decider', 'decider-sept-options.json': 'decider', 'appeler.json': 'appeler', 'entonnoir.json': 'entonnoir', 'code.json': 'code', 'code-perime.json': 'code' }
function validerJeu(rel, j) {
  const E = []
  if (!j || typeof j !== 'object' || typeof j._lisez_moi !== 'string' || !j._lisez_moi.trim() || !Number.isInteger(j.statut) || !('reponse' in j)) return ['forme { _lisez_moi, statut, reponse } attendue']
  if (JSON.stringify(j).includes('"_piege"')) E.push('un champ _piege dans le fichier (le juge le pose en servant)')
  const nom = path.posix.basename(rel)
  const v = (rep, opts) => validerVue(rep, opts).map((x) => `${opts.vue}${opts.salle ? `:${opts.salle}` : ''} : ${x}`)
  let m
  if ((m = /^vues\/(direct|fil)\.json$/.exec(rel))) E.push(...v(j.reponse, { vue: m[1] }))
  else if ((m = /^vues\/salle-([\w-]+)\.json$/.exec(rel))) E.push(...v(j.reponse, { vue: 'salle', salle: m[1] }))
  else if ((m = /^vues\/agent-([\w-]+)\.json$/.exec(rel))) E.push(...v(j.reponse, { vue: 'agent', nom: m[1] }))
  else if (VUE_DIRECT.includes(nom)) E.push(...v(j.reponse, { vue: 'direct' }))
  else if (VUE_FIL.includes(nom)) E.push(...v(j.reponse, { vue: 'fil' }))
  else if (nom === 'fil-injection.json') { E.push(...v(j.reponse, { vue: 'fil' }), ...v(j.apres, { vue: 'fil' })); if (!j.activite?.agent || !j.activite?.texte) E.push('fil-injection : activite { agent, texte } attendue') }
  else if (SALLE_DE[nom]) E.push(...v(j.reponse, { vue: 'salle', salle: SALLE_DE[nom] }))
  else if (/^experience-[\w-]+\.json$/.test(nom)) E.push(...v(j.reponse, { vue: 'salle', salle: 'experience' }))
  else if (/^tapis(-plus-un)?\.json$/.test(nom)) { const d = cl(lireJeu('vues/direct.json').reponse); d.valeur.tapis = j.reponse; E.push(...v(d, { vue: 'direct' })) }
  else if (['reglages.json', 'reglages-flottante.json', 'reglages-neon.json'].includes(nom)) E.push(...validerReglages(j.reponse).map((x) => `reglages : ${x}`))
  else if (BLOC_DE[nom]) E.push(...validerBloc(j.reponse, BLOC_DE[nom]).map((x) => `bloc ${BLOC_DE[nom]} : ${x}`))
  else if (['reglages-404.json', 'packs-404.json'].includes(nom)) { if (j.statut !== 404) E.push(`statut ${j.statut}, 404 attendu`) }
  else if (nom === 'tresorerie-503.json') { if (j.statut !== 503 || typeof j.reponse?.error !== 'string') E.push('503 et { error } attendus') }
  else if (nom === 'tresorerie.json') {
    const t = j.reponse
    for (const k of ['jour', 'sept_jours', 'mois']) if (!enveloppe(t?.encaisse?.[k])) E.push(`encaisse.${k} : enveloppe { valeur, source, a } attendue`)
    for (const k of ['mrr', 'ventes_sites', 'depenses_mois', 'cout_ia', 'marge', 'tva']) if (!enveloppe(t?.[k])) E.push(`${k} : enveloppe { valeur, source, a } attendue`)
    if (!ISO.test(String(t?.a))) E.push('a : ISO attendu')
    const m0 = t?.encaisse?.mois?.valeur
    if (m0 && Math.abs(m0.brut - m0.frais - m0.net) > 0.011) E.push('encaisse.mois : brut − frais ≠ net')
  } else if (nom === 'jauges.json') {
    const js = j.reponse?.jauges
    if (!Array.isArray(js) || !js.length) E.push('jauges : liste attendue')
    else for (const g of js) if (typeof g.cle !== 'string' || typeof g.libelle !== 'string' || !Number.isInteger(g.utilise) || !Number.isInteger(g.plafond) || !['ok', 'attention', 'pleine'].includes(g.etat)) E.push(`jauge ${g.cle} : { cle, libelle, utilise, plafond, etat ok|attention|pleine } attendu`)
    if (!ISO.test(String(j.reponse?.a))) E.push('jauges.a : ISO attendu')
  } else if (nom === 'packs.json') {
    if (!Array.isArray(j.reponse?.packs) || j.reponse.packs.some((p) => typeof p.id !== 'string' || typeof p.metier !== 'string' || typeof p.commune !== 'string' || typeof p.etat !== 'string')) E.push('packs : [{ id, metier, commune, etat }] attendu')
  } else if (/^role-(direction|lecture)\.json$/.test(nom)) { const role = nom.slice(5, -5); if (j.reponse?.role !== role || !Array.isArray(j.reponse?.lignes)) E.push(`{ lignes: [], role: '${role}' } attendu`) }
  else E.push('jeu sans validateur : ajoutez-le à c/controles.mjs')
  return E
}

/** Les jeux d'une partie du juge d'écran (TM-3 du mode --temoin). */
const JEUX_PARTIE = {
  station: ['vues/direct.json', 'vues/fil.json', 'tresorerie.json', 'tresorerie-503.json', 'reglages.json', 'reglages-404.json', 'reglages-flottante.json', 'reglages-neon.json', 'direct-503.json', 'attention-ordre.json', 'attention-vide.json', 'fil-nouvelle-bulle.json', 'fil-injection.json', 'role-direction.json', 'role-lecture.json'],
  vues: ['commandement-complet.json', 'barre-sources.json', 'vues/fil.json', 'tresorerie.json', 'reglages.json', 'role-direction.json', 'role-lecture.json'],
  salles: ['vues/salle-recettes.json', 'vues/salle-tresorerie.json', 'vues/salle-usine.json', 'vues/salle-atelier.json', 'vues/salle-reunion.json', 'vues/salle-envois.json', 'vues/salle-standard.json', 'vues/salle-redaction.json', 'vues/salle-machines.json', 'vues/salle-experience.json', 'vues/salle-ecommerce.json', 'vues/salle-repos.json', 'vues/salle-commandement.json', 'vues/agent-chef.json', 'vues/agent-facteur.json', 'vues/agent-facteur_usine.json', 'vues/agent-repondeur.json', 'vues/agent-livreur.json', 'vues/agent-modele.json', 'jauges.json', 'reunion-en-cours.json', 'reunion-close.json', 'envois-formulaire-ferme.json', 'salle-machines-sans-ia.json', 'tresorerie.json', 'role-lecture.json'],
  'salles-suite': ['tapis.json', 'entonnoir.json', 'fil-crieur.json', 'packs.json', 'packs-404.json', 'code.json', 'code-perime.json', 'vues/salle-envois.json', 'vues/salle-radar.json', 'vues/salle-crieur.json', 'vues/salle-studio.json', 'vues/salle-chantier.json'],
  fil: ['vues/fil.json', 'fil-injection.json', 'fil-nouvelle-bulle.json', 'reglages-flottante.json', 'role-lecture.json'],
  gestes: ['decider.json', 'decider-epinglee.json', 'decider-sept-options.json', 'appeler.json', 'salle-envois-gestes.json', 'role-lecture.json'],
  experience: ['experience-sans-vente.json', 'experience-une-vente.json', 'experience-en-cours.json', 'experience-arretee.json', 'experience-gagnante.json', 'vues/salle-experience.json'],
}
export function controleJeuxPartie(partie) {
  const liste = JEUX_PARTIE[partie]
  if (!liste) return { echecs: [`partie « ${partie} » inconnue`], detail: '' }
  const e = []
  for (const rel of liste) {
    let j
    try { j = lireJeu(rel) } catch (err) { e.push(`${rel} illisible : ${court(err.message, 80)}`); continue }
    for (const x of validerJeu(rel, j)) e.push(`${rel} : ${x}`)
  }
  return { echecs: e, detail: `${liste.length} jeux de la partie ${partie} au contrat (s/contrat-vues.mjs, c/contrat-blocs.mjs, formes de la trésorerie, des jauges, des packs et du rôle)` }
}

// ── JA-3 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const EXIGES_JC3 = ['vue-sans-source', 'valeur-numerique-nue', 'bulle-arobase', 'bulle-neuf-chiffres', 'couleur-violette']
export async function controleJeux() {
  const e = []
  const fichiers = lister(JEUX).filter((f) => f.endsWith('.json')).sort()
  if (lister(JEUX).length !== fichiers.length) e.push('un fichier de c/jeux/ n’est pas un .json')
  let n = 0
  for (const rel of fichiers) {
    let j
    try { j = lireJeu(rel) } catch (err) { e.push(`${rel} illisible : ${court(err.message, 80)}`); continue }
    const d = validerJeu(rel, j)
    for (const x of d.slice(0, 3)) e.push(`${rel} : ${x}`)
    if (!d.length) n++
  }
  for (const [partie, liste] of Object.entries(JEUX_PARTIE)) for (const rel of liste) if (!fichiers.includes(rel)) e.push(`jeu ${rel} de la partie ${partie} absent`)
  // Les pièges des deux contrats : chacun refusé ; les originaux acceptés (sinon le refus ne prouverait rien).
  const J = { direct: lireJeu('vues/direct.json').reponse, fil: lireJeu('vues/fil.json').reponse, ecommerce: lireJeu('vues/salle-ecommerce.json').reponse, standard: lireJeu('vues/salle-standard.json').reponse, presti: lireJeu('vues/salle-presti.json').reponse, observatoire: lireJeu('vues/salle-observatoire.json').reponse, reglages: lireJeu('reglages.json').reponse }
  const refuses = [], nonFabriques = []
  for (const p of PIEGES) {
    let f
    try { f = p.fabriquer(J) } catch { nonFabriques.push(p.nom); continue }
    const d = f.opts.reglages ? validerReglages(f.reponse) : validerVue(f.reponse, f.opts)
    if (!d.length) e.push(`piège ${p.nom} (${p.raison}) accepté par s/contrat-vues.mjs`)
    else refuses.push(p.nom)
  }
  for (const k of EXIGES_JC3) if (!refuses.includes(k)) e.push(`JC-3 : le piège ${k} n'est pas refusé sur les jeux du lot c`)
  const B = { decider: lireJeu('decider.json').reponse, appeler: lireJeu('appeler.json').reponse, entonnoir: lireJeu('entonnoir.json').reponse, code: lireJeu('code.json').reponse }
  for (const [k, r] of Object.entries(B)) { const d = validerBloc(r, k); if (d.length) e.push(`bloc ${k} d'origine refusé : ${d[0]}`) }
  let blocsRefuses = 0
  for (const p of PIEGES_BLOCS) { const d = validerBloc(p.fabriquer(B), p.bloc); if (!d.length) e.push(`piège ${p.nom} accepté par c/contrat-blocs.mjs`); else blocsRefuses++ }
  // Les jeux sont ceux que fabriquer-jeux.mjs produit, et le témoin dérivé celui que fabriquer-temoin.mjs produit.
  const { jeux, texteJeu } = await import('./fabriquer-jeux.mjs')
  const tous = jeux()
  const faux = Object.entries(tous).filter(([rel, x]) => { try { return lf(fs.readFileSync(path.join(JEUX, rel), 'utf8')) !== lf(texteJeu(x)) } catch { return true } }).map(([rel]) => rel)
  const enTrop = fichiers.filter((f) => !(f in tous))
  if (faux.length) e.push(`c/jeux/ pas à jour (node scripts/fixtures/026-pilotage/c/fabriquer-jeux.mjs) : ${faux.slice(0, 4).join(', ')}`)
  if (enTrop.length) e.push(`jeux que fabriquer-jeux.mjs ne produit pas : ${enTrop.slice(0, 4).join(', ')}`)
  const { derives, ROUTES_RE0 } = await import('./fabriquer-temoin.mjs')
  for (const [rel, t] of Object.entries(derives())) { let s = null; try { s = lf(fs.readFileSync(path.join(ICI, 'temoin', `${rel}.temoin`), 'utf8')) } catch { /* absent */ } if (s !== lf(t)) e.push(`témoin dérivé ${rel} pas à jour (node scripts/fixtures/026-pilotage/c/fabriquer-temoin.mjs)`) }
  for (const [rel, lot] of Object.entries(ROUTES_RE0)) {
    const ici = path.join(ICI, 'temoin', `${rel}.temoin`), la = path.join(ICI, '..', lot, 'temoin', `${rel}.temoin`)
    if (!fs.existsSync(ici) || !fs.statSync(ici).size) e.push(`route ${rel} absente du témoin (RE-0)`)
    else if (fs.existsSync(la) && lf(fs.readFileSync(ici, 'utf8')) !== lf(fs.readFileSync(la, 'utf8'))) e.push(`route ${rel} du témoin différente de celle du lot ${lot}`)
  }
  return { echecs: e, detail: `${n}/${fichiers.length} jeux au contrat (vues par s/contrat-vues.mjs, réglages, blocs par c/contrat-blocs.mjs, trésorerie, jauges, packs, rôle), aucun _piege dans les fichiers ; ${refuses.length} pièges des vues refusés (dont ${EXIGES_JC3.join(', ')}${nonFabriques.length ? ` ; ${nonFabriques.length} sans objet sur ces jeux : ${nonFabriques.join(', ')}` : ''}), ${blocsRefuses}/${PIEGES_BLOCS.length} pièges des blocs refusés ; c/jeux/ = fabriquer-jeux.mjs (${Object.keys(tous).length} jeux) ; témoin dérivé et routes de RE-0 à jour` }
}

// ── JA-6 : les appels refusés, et JC-6 ────────────────────────────────────────────────────────────────────────────────────
export function controleAppels(ctx) {
  const e = []
  const r1 = ctx.lancerNode(['scripts/pilotage-ecran-qa.mjs', '--partie=carte'], { nom: 'ecran-partie-carte' })
  if (r1.code !== 2) e.push(`--partie=carte : code ${r1.code}, 2 attendu`)
  if (!/partie retirée par la décision Claw3D du 25\/09/.test(r1.sortie) || !/scripts\/station-ecran-qa\.mjs \(026-172\)/.test(r1.sortie)) e.push(`--partie=carte : « ${court(r1.sortie, 120)} », le renvoi à scripts/station-ecran-qa.mjs (026-172) attendu`)
  const r2 = ctx.lancerNode(['scripts/pilotage-ecran-qa.mjs', '--partie=inconnue'], { nom: 'ecran-partie-inconnue' })
  if (r2.code !== 2) e.push(`--partie=inconnue : code ${r2.code}, 2 attendu`)
  const r3 = ctx.lancerNode(['scripts/pilotage-recette.mjs'], { nom: 'recette-sans-option' })
  if (r3.code !== 2) e.push(`pilotage-recette sans option : code ${r3.code}, 2 (préalable) attendu`)
  if (!/^(✅|❌) RE-0\b/m.test(r3.sortie) || !/préalable/i.test(r3.sortie)) e.push(`pilotage-recette sans option : ses critères statiques puis le préalable attendus (« ${court(r3.sortie.trim().split(/\r?\n/).pop(), 100)} »)`)
  // JC-6 : chaque JPEG écrit sort d'un page.screenshot( du juge, l'image d'avant effacée au même chemin.
  const lireS = (rel) => { try { return fs.readFileSync(path.join(R, rel), 'utf8') } catch { return null } }
  const commun = lireS('scripts/fixtures/026-pilotage/c/commun.mjs') ?? ''
  const cap = /export async function capturer\(page, fichier\) \{([\s\S]*?)\n\}/.exec(commun)
  if (!cap) e.push('c/commun.mjs : capturer(page, fichier) introuvable')
  else {
    const corps = cap[1], iRm = corps.indexOf('fs.rmSync(fichier'), iShot = corps.indexOf('page.screenshot({ path: fichier')
    if (iRm < 0 || iShot < 0 || iRm > iShot) e.push('capturer : l’image d’avant n’est pas effacée avant page.screenshot( au même chemin')
  }
  const sources = ['scripts/pilotage-ecran-qa.mjs', 'scripts/pilotage-recette.mjs', ...fs.readdirSync(path.join(ICI, 'parties')).map((f) => `scripts/fixtures/026-pilotage/c/parties/${f}`)]
  let jpg = 0
  for (const rel of sources) {
    const s = lireS(rel)
    if (s === null) { e.push(`${rel} absent`); continue }
    s.split(/\r?\n/).forEach((l, i) => {
      if (!/\.jpe?g['"`]/.test(l)) return
      jpg++
      const ecrit = /\b(writeFileSync|copyFileSync|renameSync|writeFile|createWriteStream|cpSync|linkSync)\(/.test(l)
      const permis = /capturer\(|cheminCapture\(|for \(const nom of \['bureau\.jpg', 'telephone\.jpg'\]\)|defautsCapture\(|jugerCaptures\(/.test(l)
      if (ecrit || !permis) e.push(`${rel}:${i + 1} : un JPEG hors de capturer( (« ${court(l.trim(), 80)} »)`)
    })
  }
  return { echecs: e, detail: `--partie=carte → code 2 et le renvoi à 026-172 ; --partie=inconnue → code 2 ; pilotage-recette sans option → RE-0 puis code 2 (préalable) ; JC-6 : ${jpg} mention(s) de JPEG dans ${sources.length} sources, toutes par capturer( (l’image d’avant effacée, puis page.screenshot( au même chemin)` }
}
