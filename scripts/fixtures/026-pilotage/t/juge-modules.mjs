// scripts/fixtures/026-pilotage/t/juge-modules.mjs — l'ENFANT de station-themes-qa (TH-2 à TH-6, TH-8 ; fiche 026-171), écrit par
// Claude Code. Il tourne sous `node --import scripts/ts-loader.mjs` (les modules jugés sont du TypeScript à syntaxe effaçable),
// dans son propre processus : un module qui boucle ou qui plante ne tue pas le juge (timeout, code de sortie).
//
//   node --no-warnings --import ./scripts/ts-loader.mjs t/juge-modules.mjs --racine=<arbre> --critere=TH-<n> [--theme=<clé>]
//
// Il rend UNE ligne « @@ {"echecs":[…],"detail":"…"} » (ou {"prealable":"…"}). Il n'écrit rien, ne lit ni .env.local ni
// presti-secrets, n'ouvre aucune connexion. Le JUGEMENT (schéma, dispositions, réglages) est celui de scripts/fixtures/026-pilotage/t
// et k : le module jugé n'y a jamais la parole sur ce qu'il faut refuser.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { gelerProfond } from '../a/commun.mjs'
import { T, themeEssai, schemaTheme, avecPortrait, materialiser, dispositionDefauts, portesAtteintes, copie, jeuT } from './outils.mjs'

const arg = (n) => process.argv.slice(2).find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3)
const racine = path.resolve(arg('racine') ?? '.')
const critere = arg('critere')
const rendre = (o) => { console.log(`@@ ${JSON.stringify(o)}`); process.exit(0) }
const importer = (rel) => import(pathToFileURL(path.join(racine, rel)).href)
const court = (t, n = 90) => { const x = String(t ?? '').replace(/\s+/g, ' ').trim(); return x.length > n ? `${x.slice(0, n - 1)}…` : x }
const egal = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const echecs = []
const notes = []

let V
try { V = await import('../k/validateur.mjs') } catch (e) { rendre({ prealable: `k/validateur.mjs illisible (${court(e.message)})` }) }
const schema = schemaTheme(), essai = themeEssai()
// Un thème dont un champ a le mauvais type fait jeter le validateur de k dans ses contraintes hors schéma : c'est un refus.
const oracle = (t) => { try { return [...V.validerSchema(t, schema), ...V.contraintesTheme(t)] } catch (e) { return [`validateur : ${court(e.message, 60)}`] } }

async function appeler(f, ...args) {
  try { return { r: f(...args) } } catch (e) { return { erreur: court(e?.message ?? e) } }
}

// ── TH-2 : validerTheme suit le schéma ─────────────────────────────────────────────────────────────────────────────────────
function mutationsDuSchema(valeur) {
  const out = []
  const lire = (chemin) => chemin.reduce((x, k) => x?.[k], valeur)
  const fabriquer = (chemin, f) => { const c = copie(valeur); f(chemin.length ? chemin.slice(0, -1).reduce((x, k) => x[k], c) : c, chemin.at(-1), c); return c }
  const ajouter = (nom, t) => out.push({ nom, theme: t })
  const marche = (sc, chemin) => {
    const v = lire(chemin), nom = chemin.join('.') || 'racine'
    if (v === undefined) return
    const types = Array.isArray(sc.type) ? sc.type : sc.type ? [sc.type] : []
    if (types.length) {
      const faux = types.includes('string') ? 12 : types.includes('integer') ? 'x' : types.includes('boolean') ? 'oui' : types.includes('array') ? {} : types.includes('object') ? [] : null
      if (faux !== null) ajouter(`type de ${nom}`, chemin.length ? fabriquer(chemin, (p, k) => { p[k] = faux }) : faux)
    }
    if (sc.enum && typeof v === 'string') ajouter(`énumération de ${nom}`, fabriquer(chemin, (p, k) => { p[k] = 'zzz-inconnu' }))
    if (typeof v === 'number' && sc.minimum !== undefined) ajouter(`minimum de ${nom}`, fabriquer(chemin, (p, k) => { p[k] = sc.minimum - 1 }))
    if (typeof v === 'string' && sc.pattern) {
      for (const c of ['', 'x', '#GGGGGG', 'a b', 'http://exemple.invalid/x', 'A'.repeat(70)]) {
        const m = fabriquer(chemin, (p, k) => { p[k] = c })
        if (oracle(m).length) ajouter(`motif de ${nom} (« ${court(c, 12)} »)`, m)
      }
    }
    if (Array.isArray(v)) {
      if (sc.minItems) ajouter(`minItems de ${nom}`, fabriquer(chemin, (p, k) => { p[k] = v.slice(0, sc.minItems - 1) }))
      if (sc.maxItems) ajouter(`maxItems de ${nom}`, fabriquer(chemin, (p, k) => { p[k] = [...v, v[0]] }))
      if (sc.items && v.length) marche(sc.items, [...chemin, 0])
    }
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const k of sc.required ?? []) if (k in v) ajouter(`champ requis ${nom}.${k}`, fabriquer([...chemin, k], (p, kk) => { delete p[kk] }))
      if (sc.additionalProperties === false) ajouter(`champ inconnu dans ${nom}`, fabriquer([...chemin, 'zz_inconnu'], (p, kk) => { p[kk] = 1 }))
      for (const [k, s] of Object.entries(sc.properties ?? {})) marche(s, [...chemin, k])
    }
  }
  marche(schema, [])
  return out
}
async function th2() {
  const M = await importer('lib/pilotage/theme.ts')
  const { validerTheme, CLES_THEME } = M
  if (typeof validerTheme !== 'function') return echecs.push('theme.ts n\'exporte pas validerTheme')
  if (!Array.isArray(CLES_THEME) || !egal([...CLES_THEME], ['station', 'vaisseau'])) echecs.push(`CLES_THEME = ${JSON.stringify(CLES_THEME)}, ["station","vaisseau"] attendu (la liste fermée)`)
  const bons = [['le thème d\'essai de 026-170', essai], ['le thème d\'essai avec son bloc portrait', avecPortrait(essai)]]
  const polygone = copie(essai); polygone.emplacements[3].forme = { type: 'polygone', points: [[16, 16], [40, 16], [40, 40], [16, 40]] }
  bons.push(['un emplacement en polygone', polygone])
  for (const [nom, t] of bons) {
    gelerProfond(t)
    const { r, erreur } = await appeler(validerTheme, t)
    if (erreur) echecs.push(`validerTheme jette sur ${nom} : ${erreur}`)
    else if (!r || r.ok !== true) echecs.push(`validerTheme refuse ${nom} : ${court(JSON.stringify(r?.raisons?.slice(0, 2)))}`)
    else if (!egal(r.theme, t)) echecs.push(`validerTheme rend un autre thème que celui reçu pour ${nom}`)
  }
  const muts = mutationsDuSchema(avecPortrait(essai))
  // Les contraintes hors schéma que le schéma annonce dans sa description (le validateur de k les porte).
  const hors = [
    ['deux emplacements réservés', (t) => { t.emplacements.find((x) => !x.reservee).reservee = true }],
    ['réservé avec un poste', (t) => { t.emplacements.find((x) => x.reservee).poste = { x: 8, y: 8 } }],
    ['emplacement ordinaire sans poste', (t) => { t.emplacements[0].poste = null }],
    ['aucun emplacement réservé', (t) => { t.emplacements.find((x) => x.reservee).reservee = false }],
    ['emplacement en double', (t) => { t.emplacements[1].cle = t.emplacements[0].cle }],
    ['portrait : réservé avec un poste', (t) => { t.portrait.emplacements.find((x) => x.reservee).poste = { x: 8, y: 8 } }],
    ['portrait : deux réservés', (t) => { t.portrait.emplacements[0].reservee = true }],
    ['arête vers un nœud inconnu', (t) => { t.coursives.aretes[0].de = 'inconnu' }],
    ['portrait : arête vers un nœud inconnu', (t) => { t.portrait.coursives.aretes[0].a = 'inconnu' }],
    ['tracé du tapis coupé', (t) => { t.tapis.trace.splice(5, 2) }], // hors des étapes (points 3 et 10) : seule la continuité peut refuser
    ['étape hors du tracé', (t) => { t.tapis.etapes[0].x += 1 }],
    ['défaut manquant', (t) => { t.defauts.pop() }],
    ['avatar « defaut » absent', (t) => { t.avatars = t.avatars.filter((a) => a.cle !== 'defaut') }],
    ['adresse dans une plaque', (t) => { t.emplacements[0].plaque.texte = '//exemple.invalid' }],
    ['adresse https dans le nom', (t) => { t.nom = 'https://exemple.invalid/x' }],
    ['champ de code à la racine', (t) => { t.script = 'alert(1)' }],
    ['champ de code dans un emplacement', (t) => { t.emplacements[1].onclick = 'x()' }],
    ['polygone à deux points', (t) => { t.emplacements[2].forme = { type: 'polygone', points: [[0, 0], [8, 8]] } }],
  ]
  for (const [nom, f] of hors) { const t = avecPortrait(essai); f(t); muts.push({ nom, theme: t }) }
  muts.push({ nom: 'null', theme: null }, { nom: 'un texte', theme: 'station' }, { nom: 'une liste', theme: [] })
  let refusees = 0
  const acceptees = []
  for (const m of muts) {
    if (m.theme !== null && typeof m.theme === 'object' && oracle(m.theme).length === 0) continue // la mutation n'est pas une faute du schéma : rien à exiger
    const { r, erreur } = await appeler(validerTheme, m.theme)
    if (erreur) { acceptees.push(`${m.nom} (jette : ${erreur})`); continue }
    if (r && r.ok === false && Array.isArray(r.raisons) && r.raisons.length && r.raisons.every((x) => typeof x === 'string' && x)) refusees++
    else acceptees.push(m.nom)
  }
  if (refusees < 100) echecs.push(`le jeu de fautes du schéma ne compte que ${refusees} fautes jugeables (100 au moins : le juge est cassé, pas le module)`)
  if (acceptees.length) echecs.push(`validerTheme accepte ${acceptees.length} thème(s) que le schéma refuse : ${acceptees.slice(0, 4).join(' ; ')}${acceptees.length > 4 ? ' ; …' : ''}`)
  notes.push(`les trois thèmes conformes acceptés ; ${refusees} fautes du schéma refusées avec leurs raisons (champ requis retiré, champ inconnu, type, énumération, minimum, motif, minItems, maxItems, hors schéma)`)
}

// ── TH-3 : validerDisposition ──────────────────────────────────────────────────────────────────────────────────────────────
async function th3() {
  const M = await importer('lib/pilotage/disposition.ts')
  const { validerDisposition } = M
  if (typeof validerDisposition !== 'function') return echecs.push('disposition.ts n\'exporte pas validerDisposition')
  const J = jeuT('dispositions.json')
  let ok = 0
  const juger = async (cas, attendu) => {
    const { theme, disposition } = materialiser(essai, cas)
    gelerProfond(theme); gelerProfond(disposition)
    const a = await appeler(validerDisposition, theme, disposition)
    if (a.erreur) return echecs.push(`« ${cas.nom} » : validerDisposition jette (${a.erreur})`)
    const b = await appeler(validerDisposition, theme, disposition)
    if (!egal(a.r, b.r)) return echecs.push(`« ${cas.nom} » : deux appels, deux verdicts`)
    const r = a.r
    if (attendu) { if (r?.ok === true && !('raison' in r)) ok++; else echecs.push(`« ${cas.nom} » refusée à tort : ${court(r?.raison)}`); return }
    if (r?.ok !== false || typeof r.raison !== 'string' || !r.raison) echecs.push(`« ${cas.nom} » acceptée (elle doit l'être refusée : ${cas.raison})`)
    else if (!new RegExp(cas.raison, 'i').test(r.raison)) echecs.push(`« ${cas.nom} » refusée pour une autre raison : « ${court(r.raison)} » (attendu : /${cas.raison}/)`)
    else ok++
  }
  for (const c of J.valides) await juger(c, true)
  for (const c of J.refusees) await juger(c, false)
  // Une entrée illisible n'est jamais un plantage : un refus.
  const { theme } = materialiser(essai, { portrait: true })
  for (const [nom, x] of [['null', null], ['undefined', undefined], ['une liste', []], ['sans salles', {}], ['des salles en liste', { salles: [] }]]) {
    const a = await appeler(validerDisposition, theme, x)
    if (a.erreur) echecs.push(`validerDisposition jette sur une disposition « ${nom} » (${a.erreur}) : un refus attendu`)
    else if (a.r?.ok !== false) echecs.push(`validerDisposition accepte une disposition « ${nom} »`)
  }
  const a = await appeler(validerDisposition, null, dispositionDefauts(essai))
  if (a.erreur) echecs.push(`validerDisposition jette sur un thème nul (${a.erreur})`)
  else if (a.r?.ok !== false) echecs.push('validerDisposition accepte un thème nul')
  // Le calcul du juge sur les défauts : tout est relié (sinon le jeu d'essai est faux, pas le module).
  const base = avecPortrait(essai)
  for (const v of [base, base.portrait]) if (portesAtteintes(v.emplacements, v.coursives, 'commandement').size !== 21) echecs.push('le jeu d\'essai du juge : toutes les portes ne sont pas reliées par défaut (juge cassé)')
  notes.push(`${ok}/${J.valides.length + J.refusees.length} dispositions jugées comme le juge (${J.valides.length} valides, ${J.refusees.length} refusées avec leur raison en français), au bureau et en portrait, entrées gelées, entrées illisibles refusées sans plantage`)
}

// ── TH-4, TH-5, TH-6 : les réglages ───────────────────────────────────────────────────────────────────────────────────────
const CLES = ['theme', 'mise_en_page', 'nuit', 'equipage', 'salles', 'couleurs', 'affichage']
async function th4() {
  const M = await importer('lib/pilotage/reglages.ts')
  const { validerReglages, CLES_REGLAGES } = M
  if (typeof validerReglages !== 'function') return echecs.push('reglages.ts n\'exporte pas validerReglages')
  if (!Array.isArray(CLES_REGLAGES) || !egal([...CLES_REGLAGES].sort(), [...CLES].sort())) echecs.push(`CLES_REGLAGES = ${JSON.stringify(CLES_REGLAGES)}, les sept clés ${CLES.join(', ')} attendues`)
  const theme = essai
  let bons = 0, refus = 0
  for (const c of jeuT('reglages-valides.json').cas) {
    const brut = copie(c.brut)
    gelerProfond(brut)
    const a = await appeler(validerReglages, brut, theme)
    if (a.erreur) echecs.push(`validerReglages jette sur « ${c.nom} » : ${a.erreur}`)
    else if (a.r?.ok !== true) echecs.push(`« ${c.nom} » refusé à tort : ${court(JSON.stringify(a.r?.raisons?.slice(0, 2)))}`)
    else if (!egal(a.r.reglages, c.brut)) echecs.push(`« ${c.nom} » : les réglages rendus ne sont pas ceux reçus`)
    else bons++
  }
  for (const p of jeuT('reglages-pieges.json').pieges) {
    const brut = copie(p.brut)
    if (p.generer?.remplissage) brut.remplissage = 'x'.repeat(p.generer.remplissage)
    const a = await appeler(validerReglages, brut, theme)
    if (a.erreur) { echecs.push(`validerReglages jette sur le piège « ${p.nom} » : ${a.erreur}`); continue }
    const r = a.r
    if (r?.ok !== false || !Array.isArray(r.raisons) || !r.raisons.length || !r.raisons.every((x) => typeof x === 'string' && x)) { echecs.push(`le piège « ${p.nom} » est accepté (ou sans raison)`); continue }
    if (!new RegExp(p.raison, 'i').test(r.raisons.join(' | '))) { echecs.push(`le piège « ${p.nom} » est refusé pour une autre raison : « ${court(r.raisons.join(' | '))} » (attendu : /${p.raison}/)`); continue }
    if (p.cleInconnue && !(Array.isArray(r.clesPermises) && egal([...r.clesPermises].sort(), [...CLES].sort()))) { echecs.push(`le piège « ${p.nom} » : la liste des clés permises manque ou est fausse (clesPermises = ${JSON.stringify(r.clesPermises)})`); continue }
    refus++
  }
  const cyc = {}; cyc.c = cyc
  for (const [nom, x] of [['une référence circulaire', cyc], ['une fonction', () => 1], ['undefined', undefined]]) {
    const a = await appeler(validerReglages, x, theme)
    if (a.erreur) echecs.push(`validerReglages jette sur ${nom} (${a.erreur}) : un refus attendu`)
    else if (a.r?.ok !== false) echecs.push(`validerReglages accepte ${nom}`)
  }
  if ({}.polluee !== undefined || {}.x !== undefined) echecs.push('Object.prototype est pollué après les pièges')
  notes.push(`${bons} jeux de réglages valides acceptés à l'identique (bornes comprises), ${refus} pièges refusés pour la bonne raison (clé inconnue avec la liste des sept clés, couleur, noms de 17 signes, plaque de 25, titre d'un signe, avatar hors liste, HTML, :root, 65 Ko…)`)
}
async function th5() {
  const { fusionner } = await importer('lib/pilotage/reglages.ts')
  if (typeof fusionner !== 'function') return echecs.push('reglages.ts n\'exporte pas fusionner')
  const J = jeuT('reglages-valides.json').defauts
  const d = copie(J.defauts), r = copie(J.reglages)
  gelerProfond(d); gelerProfond(r)
  const a = await appeler(fusionner, d, r)
  if (a.erreur) return echecs.push(`fusionner jette sur des entrées gelées (${a.erreur}) : elle ne doit rien modifier`)
  if (!egal(a.r, J.attendu)) echecs.push(`fusionner rend ${court(JSON.stringify(a.r), 160)}, ${court(JSON.stringify(J.attendu), 160)} attendu (les réglages l'emportent clé par clé, une clé absente garde le défaut)`)
  if (!egal(d, J.defauts) || !egal(r, J.reglages)) echecs.push('fusionner a modifié une de ses entrées')
  const b = await appeler(fusionner, copie(J.defauts), a.r)
  if (b.erreur || !egal(b.r, a.r)) echecs.push('fusionner(défauts, fusionner(défauts, réglages)) ≠ fusionner(défauts, réglages) : rejouer change le résultat')
  const c = await appeler(fusionner, a.r, copie(J.reglages))
  if (c.erreur || !egal(c.r, a.r)) echecs.push('fusionner(fusionner(défauts, réglages), réglages) ≠ fusionner(défauts, réglages) : rejouer change le résultat')
  for (const [nom, x] of [['undefined', undefined], ['null', null], ['{}', {}]]) {
    const z = await appeler(fusionner, copie(J.defauts), x)
    if (z.erreur || !egal(z.r, J.defauts)) echecs.push(`fusionner(défauts, ${nom}) ne rend pas les défauts`)
  }
  if (a.r && (a.r === d || a.r.couleurs === d.couleurs)) echecs.push('fusionner rend un objet partagé avec ses défauts (une copie attendue)')
  const p = await appeler(fusionner, {}, JSON.parse('{"__proto__":{"pollue":1},"constructor":{"prototype":{"pollue":2}}}'))
  if ({}.pollue !== undefined) echecs.push('fusionner pollue Object.prototype (__proto__)')
  void p
  notes.push('les réglages l\'emportent clé par clé (en profondeur), une clé absente garde le défaut, entrées gelées intactes, rejouer ne change rien, aucune pollution de prototype')
}
function doublureNoeud(nom, journal) {
  const ecrire = (quoi, cle, valeur) => journal.push({ nom, quoi, cle: String(cle), valeur: valeur === undefined ? undefined : String(valeur) })
  const styles = new Map(), attrs = new Map()
  const style = new Proxy({ setProperty: (k, v) => { ecrire('style', k, v); styles.set(String(k), String(v)) }, removeProperty: (k) => { ecrire('style-retire', k); styles.delete(String(k)) }, getPropertyValue: (k) => styles.get(String(k)) ?? '' }, { set(_, k, v) { ecrire('style', k, v); styles.set(String(k), String(v)); return true } })
  const dataset = new Proxy({}, { set(_, k, v) { const a = `data-${String(k).replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`; ecrire('attribut', a, v); attrs.set(a, String(v)); return true } })
  const n = {
    nodeType: 1, style, dataset,
    setAttribute: (k, v) => { ecrire('attribut', k, v); attrs.set(String(k), String(v)) },
    removeAttribute: (k) => { ecrire('attribut-retire', k); attrs.delete(String(k)) },
    getAttribute: (k) => attrs.get(String(k)) ?? null,
    classList: { add: (...c) => ecrire('classe', c.join(' ')), remove: (...c) => ecrire('classe', c.join(' ')), toggle: (c) => ecrire('classe', c), contains: () => false },
    insertAdjacentHTML: (_, h) => ecrire('html', 'insertAdjacentHTML', h),
    appendChild: (x) => ecrire('enfant', 'appendChild', x?.nodeName ?? '?'), append: () => ecrire('enfant', 'append'), replaceChildren: () => ecrire('enfant', 'replaceChildren'),
    set innerHTML(v) { ecrire('html', 'innerHTML', v) }, get innerHTML() { return '' },
    set outerHTML(v) { ecrire('html', 'outerHTML', v) }, get outerHTML() { return '' },
    set textContent(v) { ecrire('texte', 'textContent', v) }, get textContent() { return '' },
    set className(v) { ecrire('classe', 'className', v) }, get className() { return '' },
  }
  return { n, styles, attrs }
}
async function th6() {
  const M = await importer('lib/pilotage/reglages.ts')
  const { appliquerReglages } = M
  if (typeof appliquerReglages !== 'function') return echecs.push('reglages.ts n\'exporte pas appliquerReglages')
  const theme = essai
  const JETONS = Object.keys(theme.palette)
  const jl = []
  const racineDoc = doublureNoeud('documentElement', jl), corps = doublureNoeud('body', jl)
  const doc = { documentElement: racineDoc.n, body: corps.n, head: doublureNoeud('head', jl).n, write: (h) => jl.push({ nom: 'document', quoi: 'html', cle: 'write', valeur: h }), createElement: () => doublureNoeud('element', jl).n, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] }
  const anciens = { document: globalThis.document, window: globalThis.window }
  globalThis.document = doc
  globalThis.window = { document: doc }
  try {
    const piege = '<img src=x onerror=alert(1)>'
    const cas = [
      ['réglages posés', { mise_en_page: 'flottante', couleurs: { '--mc-fond': '#0A0B0C', '--mc-accent': '#c949ba' }, nuit: { actif: true } }, { fond: '#0A0B0C', accent: '#c949ba', page: 'flottante' }],
      ['aucun réglage', {}, { fond: theme.palette['--mc-fond'], accent: theme.palette['--mc-accent'], page: theme.mise_en_page }],
      ['réglages hostiles (non validés)', { mise_en_page: 'colonnes', couleurs: { '--mc-fond': '#010203', ':root': '#ff0000', color: 'red', '--autre': '#000000', '--mc-sol': 'url(http://exemple.invalid/x)' }, affichage: { titre: piege }, equipage: { chef: { nom: piege } } }, { fond: '#010203', accent: theme.palette['--mc-accent'], page: 'colonnes' }],
    ]
    for (const [nom, reglages, att] of cas) {
      const j = []
      const { n, styles, attrs } = doublureNoeud('mc', j)
      const r0 = jl.length
      const a = await appeler(appliquerReglages, n, gelerProfond(copie(reglages)), gelerProfond(copie(theme)))
      if (a.erreur) { echecs.push(`« ${nom} » : appliquerReglages jette (${a.erreur})`); continue }
      const ecrits = j.filter((x) => x.nom === 'mc')
      void ecrits
      if (jl.length > r0) echecs.push(`« ${nom} » : écriture hors du nœud passé (${jl.slice(r0).slice(0, 2).map((x) => `${x.nom}.${x.quoi} ${x.cle}`).join(', ')}) : jamais sur document.documentElement ni body`)
      const html = j.filter((x) => x.quoi === 'html' || x.quoi === 'enfant')
      if (html.length) echecs.push(`« ${nom} » : du HTML ou des enfants posés sur le nœud (${html[0].cle}) : les textes se posent en texte`)
      for (const jeton of JETONS) if (!styles.has(jeton)) echecs.push(`« ${nom} » : le jeton ${jeton} n'est pas posé`)
      if (styles.get('--mc-fond')?.toLowerCase() !== att.fond.toLowerCase()) echecs.push(`« ${nom} » : --mc-fond = ${styles.get('--mc-fond')}, ${att.fond} attendu`)
      if (styles.get('--mc-accent')?.toLowerCase() !== att.accent.toLowerCase()) echecs.push(`« ${nom} » : --mc-accent = ${styles.get('--mc-accent')}, ${att.accent} attendu`)
      const horsJetons = [...styles.keys()].filter((k) => !JETONS.includes(k))
      if (horsJetons.length) echecs.push(`« ${nom} » : des propriétés hors des jetons de la palette posées (${horsJetons.join(', ')})`)
      for (const [k, v] of styles) if (!/^#[0-9A-Fa-f]{6}$/.test(v)) echecs.push(`« ${nom} » : ${k} = « ${court(v, 30)} », une couleur #RRGGBB attendue`)
      if (attrs.get('data-mise-en-page') !== att.page) echecs.push(`« ${nom} » : data-mise-en-page = ${attrs.get('data-mise-en-page')}, ${att.page} attendu`)
      const autres = [...attrs.keys()].filter((k) => !/^data-[a-z-]+$/.test(k))
      if (autres.length) echecs.push(`« ${nom} » : attributs hors data-* posés (${autres.join(', ')})`)
      const classes = j.filter((x) => x.quoi === 'classe')
      if (classes.length) echecs.push(`« ${nom} » : des classes posées sur le nœud`)
      // Rejouer : même état.
      const j2 = []
      const b = doublureNoeud('mc', j2)
      await appeler(appliquerReglages, b.n, copie(reglages), copie(theme)); await appeler(appliquerReglages, b.n, copie(reglages), copie(theme))
      if (!egal([...b.styles], [...styles]) || !egal([...b.attrs], [...attrs])) echecs.push(`« ${nom} » : appliquer deux fois ne rend pas le même état`)
    }
    for (const [nom, x] of [['null', null], ['undefined', undefined]]) {
      const r0 = jl.length
      await appeler(appliquerReglages, x, {}, copie(theme))
      if (jl.length > r0) echecs.push(`appliquerReglages(${nom}, …) écrit sur le document (${jl[r0].nom})`)
    }
  } finally {
    globalThis.document = anciens.document; globalThis.window = anciens.window
    if (anciens.document === undefined) delete globalThis.document
    if (anciens.window === undefined) delete globalThis.window
  }
  notes.push('les dix jetons --mc-* et data-mise-en-page posés sur le seul nœud passé (rien sur document.documentElement ni body, aucune propriété hors palette, aucune couleur invalide, aucun HTML), rejouer ne change rien')
}

// ── TH-8 : le graphe et le tapis d'un thème livré (validerDisposition du thème sur ses `defauts`, puis le calcul du juge) ───
async function th8() {
  const cle = arg('theme')
  const fichier = path.join(racine, 'public', 'station', 'themes', cle, 'theme.json')
  const t = JSON.parse(fs.readFileSync(fichier, 'utf8'))
  const { validerDisposition } = await importer('lib/pilotage/disposition.ts')
  if (typeof validerDisposition !== 'function') return echecs.push('lib/pilotage/disposition.ts n\'exporte pas validerDisposition (026-173)')
  const a = await appeler(validerDisposition, t, dispositionDefauts(t))
  if (a.erreur) echecs.push(`validerDisposition jette sur ${cle} (${a.erreur})`)
  else if (a.r?.ok !== true) echecs.push(`validerDisposition refuse les defauts du thème ${cle} : ${court(a.r?.raison)}`)
  // Le calcul du juge, indépendant : toutes les portes (la réservée exceptée : sa porte est fermée) touchent le graphe du Commandement.
  const vues = [['bureau', t]]
  if (t.portrait) vues.push(['portrait', t.portrait])
  for (const [nom, v] of vues) {
    const d = t.defauts.find((x) => x.salle === 'commandement')?.emplacement
    const reliees = portesAtteintes(v.emplacements, v.coursives, d)
    const seuls = v.emplacements.filter((e) => !e.reservee && !reliees.has(e.cle)).map((e) => e.cle)
    if (seuls.length) echecs.push(`${nom} : ${seuls.slice(0, 4).join(', ')} ${seuls.length > 1 ? 'ne sont pas reliés' : 'n\'est pas relié'} au Commandement (graphe du juge)`)
  }
  const pas = t.grille.pas, tr = t.tapis.trace
  for (let i = 1; i < tr.length; i++) if (Math.abs(tr[i].x - tr[i - 1].x) > pas || Math.abs(tr[i].y - tr[i - 1].y) > pas || (tr[i].x === tr[i - 1].x && tr[i].y === tr[i - 1].y)) { echecs.push(`le tapis saute entre les points ${i - 1} et ${i} (calcul du juge)`); break }
  notes.push(`validerDisposition accepte les defauts du thème ${cle} au bureau${t.portrait ? ' et en portrait' : ''} ; les ${t.emplacements.length - 1} portes ordinaires touchent le graphe du Commandement (calcul du juge) ; tapis continu sur ${tr.length} points`)
}

const CRITERES = { 'TH-2': th2, 'TH-3': th3, 'TH-4': th4, 'TH-5': th5, 'TH-6': th6, 'TH-8': th8 }
try {
  if (!CRITERES[critere]) rendre({ prealable: `critère ${critere} inconnu` })
  await CRITERES[critere]()
  rendre({ echecs, detail: notes.join(' ; ') })
} catch (e) {
  rendre({ echecs: [`${critere} interrompu : ${court(e?.stack?.split('\n').slice(0, 2).join(' ') ?? e?.message ?? e, 200)}`], detail: '' })
}
void fs; void T
