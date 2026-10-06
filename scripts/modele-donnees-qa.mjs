#!/usr/bin/env node
// scripts/modele-donnees-qa.mjs — juge des données d'entraînement du modèle maison « presti-chef-leger » (scripts/modele/donnees-chef-leger.mjs, chef-leger-entree.mjs) — 06/10/2026.
//
// POURQUOI : ce que ces paires contiennent finit dans les poids d'un modèle qui écrira les plans du Chef. Un plan invalide y apprend au modèle ce que le validateur refuse,
// une tâche que le filtre écarte y apprend ce que l'on jette, un doublon pèse deux fois, une donnée d'identité sort de nos machines (le JSONL part sur Kaggle), et une
// entrée de l'épreuve qui fuirait dans les données rendrait la mesure sur l'usine flatteuse et fausse. Le juge relit le JSONL écrit avec les critères ci-dessous, en partie
// avec SES PROPRES motifs (courriel, téléphone, SIREN de Luhn, « prospect »), puis le sabote dix fois : chaque sabotage doit rendre rouge le critère qu'il vise.
//
// Usage : node scripts/modele-donnees-qa.mjs [--donnees=<jsonl>] [--dossier=<copie locale des cycles>]     (code 0 : PASS ; code 1 : critère rouge)
import fs from 'node:fs'
import path from 'node:path'
import { validerPlan, filtrerTaches, TYPES } from './chef/commun.mjs'
import { motifIdentite } from './modele/corpus-chef.mjs'
import { jugerSortie } from './modele/base-chef.mjs'
import { SYSTEME_CHEF_LEGER, compacterEntree, messageChefLeger, blocs } from './modele/chef-leger-entree.mjs'
import { construire, lireGraines, CYCLES_EPREUVE, GRAINE_MAX, SORTIE_DEFAUT, DOSSIER_DEFAUT } from './modele/donnees-chef-leger.mjs'

const arg = (nom, defaut) => { const a = process.argv.slice(2).find((x) => x.startsWith(`--${nom}=`)); return a ? a.slice(nom.length + 3) : defaut }
const fDonnees = path.resolve(arg('donnees', SORTIE_DEFAUT))
const dossier = path.resolve(arg('dossier', DOSSIER_DEFAUT))
const rouges = []
const ok = (nom, cond, detail = '') => { console.log(`${cond ? '✅' : '❌'} ${nom}${cond || !detail ? '' : ' — ' + detail}`); if (!cond) rouges.push(nom) }

// Les motifs propres du juge (indépendants du module) : une donnée d'identité ne doit passer ni par la garde du module ni par celle-ci.
const COURRIEL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/
const TEL = /(?:\+33|0033|\b0)\s?[1-9](?:[\s.-]?\d{2}){4}\b/
const luhn = (s) => { let t = 0; for (let i = 0; i < s.length; i++) { let c = Number(s[s.length - 1 - i]); if (i % 2) { c *= 2; if (c > 9) c -= 9 } t += c } return t % 10 === 0 }
const SIREN = /(?<![\d.])(\d{3}[ .]?\d{3}[ .]?\d{3})(?:[ .]?\d{5})?(?![\d.])/g
function motifPropre(t) {
  if (COURRIEL.test(t)) return 'courriel'
  if (TEL.test(t)) return 'téléphone'
  for (const m of t.matchAll(SIREN)) if (luhn(m[1].replace(/\D/g, ''))) return 'SIREN'
  if (/prospect|d[ée]marchage/i.test(t)) return 'prospect'
  return null
}

/** Les critères, sur une liste de lignes JSONL. Rend { rouge: Set<critère>, mesures }. `epreuve` : les messages utilisateur des cycles de l'épreuve. */
export function juger(lignes, { epreuve = [] } = {}) {
  const rouge = new Map()
  const faute = (c, d) => { if (!rouge.has(c)) rouge.set(c, d) }
  const mesures = { n: lignes.length, types: {}, cles: new Set(), sansTache: 0, avecConsignes: 0, impossibles: 0, maxSignes: 0 }
  if (lignes.length < 250 || lignes.length > 400) faute('nombre', `${lignes.length} paires (250 à 400 attendues)`)
  const users = new Set(), plans = new Set(), brutes = new Set()
  lignes.forEach((brut, i) => {
    if (brutes.has(brut)) faute('doublons', `ligne ${i + 1} identique à une précédente`); brutes.add(brut)
    let o
    try { o = JSON.parse(brut) } catch { faute('format', `ligne ${i + 1} illisible`); return }
    const m = o?.messages
    if (!Array.isArray(m) || m.length !== 3 || m[0]?.role !== 'system' || m[1]?.role !== 'user' || m[2]?.role !== 'assistant') { faute('format', `ligne ${i + 1} : messages system/user/assistant attendus`); return }
    if (m[0].content !== SYSTEME_CHEF_LEGER) faute('format', `ligne ${i + 1} : consigne système différente`)
    if (!/^Cycle : leger\. Date : \d{4}-\d{2}-\d{2}\.\n<donnees_etat>\n/.test(m[1].content)) faute('format', `ligne ${i + 1} : message utilisateur hors forme`)
    if (users.has(m[1].content)) faute('doublons', `ligne ${i + 1} : état déjà vu`); users.add(m[1].content)
    if (plans.has(m[2].content)) faute('doublons', `ligne ${i + 1} : plan déjà vu`); plans.add(m[2].content)
    mesures.maxSignes = Math.max(mesures.maxSignes, [...(m[0].content + m[1].content + m[2].content)].length)
    let plan
    try { plan = JSON.parse(m[2].content) } catch { faute('validité', `ligne ${i + 1} : plan illisible`); return }
    const ecarts = validerPlan(plan, 'leger')
    if (ecarts.length) faute('validité', `ligne ${i + 1} : ${ecarts[0]}`)
    const ec = filtrerTaches(plan).ecartees
    if (ec.length) faute('filtre', `ligne ${i + 1} : ${ec[0].raison}`)
    const j = jugerSortie(m[2].content, 'leger', m[1].content)
    const c = j.ecarts.filter((e) => /consigne/.test(e))
    if (c.length) faute('consignes', `ligne ${i + 1} : ${c[0]}`)
    for (const [k, t] of [['état', m[1].content], ['plan', m[2].content]]) {
      const a = motifIdentite(t) || motifPropre(t)
      if (a) faute('identité', `ligne ${i + 1} (${k}) : ${a}`)
    }
    if (epreuve.includes(m[1].content)) faute('fuite', `ligne ${i + 1} : entrée d'un cycle de l'épreuve`)
    // la date du plan est celle de l'en-tête
    const date = /Date : (\d{4}-\d{2}-\d{2})/.exec(m[1].content)?.[1]
    if ((plan.taches || []).some((t) => !String(t.cle_idempotence).startsWith(`chef:${date}:`))) faute('dates', `ligne ${i + 1} : clé d'une autre date que l'en-tête`)
    for (const t of plan.taches || []) { mesures.types[t.type] = (mesures.types[t.type] || 0) + 1; mesures.cles.add(String(t.cle_idempotence).split(':')[2]) }
    if (!(plan.taches || []).length) mesures.sansTache++
    if ((plan.consignes_lues || []).length) mesures.avecConsignes++
    mesures.impossibles += (plan.consignes_lues || []).filter((l) => l.suite === 'impossible').length
  })
  // ≈ 2,8 signes par jeton (mesuré le 06/10) : 3 500 jetons au plus, pour tenir dans une séquence d'entraînement de 4 096.
  if (mesures.maxSignes / 2.8 > 3500) faute('longueur', `${mesures.maxSignes} signes ≈ ${Math.round(mesures.maxSignes / 2.8)} jetons`)
  return { rouge, mesures }
}

// ── 1. les données écrites ─────────────────────────────────────────────────────────────────────────────────────────
const existe = fs.existsSync(fDonnees)
ok('le JSONL des données existe', existe, `${fDonnees} absent : node scripts/modele/donnees-chef-leger.mjs d'abord`)
const lignes = existe ? fs.readFileSync(fDonnees, 'utf8').split('\n').filter(Boolean) : []
const aDossier = fs.existsSync(dossier)
const epreuve = aDossier ? CYCLES_EPREUVE.filter((n) => fs.existsSync(path.join(dossier, n, 'entree.md'))).map((n) => messageChefLeger(n.slice(0, 10), fs.readFileSync(path.join(dossier, n, 'entree.md'), 'utf8'))) : []
const { rouge, mesures } = juger(lignes, { epreuve })
for (const c of ['nombre', 'format', 'validité', 'filtre', 'consignes', 'doublons', 'identité', 'fuite', 'dates', 'longueur']) ok(`données — ${c}`, !rouge.has(c), rouge.get(c))
console.log(`   ${mesures.n} paires · types ${JSON.stringify(mesures.types)} · ${mesures.cles.size} mots-clés de tâche · ${mesures.sansTache} plans sans tâche · ${mesures.avecConsignes} avec consignes (${mesures.impossibles} « impossible ») · ${mesures.maxSignes} signes au plus`)
ok('couverture : 6 types de tâche au moins', Object.keys(mesures.types).length >= 6 && Object.keys(mesures.types).every((t) => TYPES.includes(t)), JSON.stringify(mesures.types))
ok('couverture : 25 mots-clés de tâche distincts au moins', mesures.cles.size >= 25, String(mesures.cles.size))
ok('couverture : des plans sans tâche (pause, file saturée) et des consignes impossibles', mesures.sansTache >= 5 && mesures.impossibles >= 10, `${mesures.sansTache} sans tâche, ${mesures.impossibles} impossibles`)

// ── 2. l'épreuve est hors des graines, et les données sont exactement ce que le générateur écrit ────────────────
if (aDossier) {
  const graines = lireGraines(dossier)
  ok("aucune graine n'est un cycle de l'épreuve ni postérieure au 06/10 12:05", graines.every((g) => !CYCLES_EPREUVE.includes(g.nom) && g.nom <= GRAINE_MAX), graines.map((g) => g.nom).filter((n) => n > GRAINE_MAX).join(', '))
  ok("les 5 entrées de l'épreuve sont présentes localement", epreuve.length === 5, `${epreuve.length}/5`)
  let meta = { n: 340, graine: 20261006 }
  try { meta = JSON.parse(fs.readFileSync(fDonnees + '.meta.json', 'utf8')) } catch { /* réglages par défaut du générateur */ }
  const refait = construire(graines, { n: meta.n, graine: meta.graine }).gardees.map((x) => JSON.stringify(x))
  ok('reproductible : le générateur réécrit le même JSONL, ligne pour ligne', refait.length === lignes.length && refait.every((l, i) => l === lignes[i]), `${refait.length} lignes refaites contre ${lignes.length}`)
  // la compaction ne perd rien d'utile : mêmes agents, mêmes compteurs, mêmes questions, mêmes consignes, sur chaque entrée réelle
  let perte = null
  for (const nom of [...graines.map((g) => g.nom), ...CYCLES_EPREUVE]) {
    const f = path.join(dossier, nom, 'entree.md')
    if (!fs.existsSync(f)) continue
    const brut = fs.readFileSync(f, 'utf8')
    const b = blocs(brut), c = blocs(compacterEntree(brut))
    const eb = JSON.parse(b.find((x) => x.nom === 'donnees_etat').contenu), ec = JSON.parse(c.find((x) => x.nom === 'donnees_etat').contenu)
    const memes = JSON.stringify(eb.agents.map((a) => a.nom)) === JSON.stringify(ec.agents.map((a) => a.nom)) && JSON.stringify(eb.taches) === JSON.stringify(ec.taches)
      && JSON.stringify((eb.decisions_ouvertes || []).map((d) => d.question)) === JSON.stringify((ec.decisions_ouvertes || []).map((d) => d.question))
      && eb.agents.filter((a) => a.disjoncteur_ouvert).length === ec.agents.filter((a) => a.disjoncteur_ouvert).length
      && eb.agents.filter((a) => a.en_pause).length === ec.agents.filter((a) => a.en_pause).length
      && b.filter((x) => x.nom !== 'donnees_etat').map((x) => x.nom).join() === c.filter((x) => x.nom !== 'donnees_etat').map((x) => x.nom).join()
    const cb = b.find((x) => x.nom === 'consignes_benj'), cc = c.find((x) => x.nom === 'consignes_benj')
    const memesConsignes = !cb || JSON.stringify(JSON.parse(cb.contenu).map((x) => [x.id, x.texte])) === JSON.stringify(JSON.parse(cc.contenu).map((x) => [x.id, x.texte]))
    if (!memes || !memesConsignes) { perte = nom; break }
  }
  ok('la compaction garde agents, compteurs, questions, pauses, disjoncteurs, blocs et consignes de chaque entrée réelle', perte === null, perte ?? '')
} else console.log(`ℹ️  ${dossier} absent : critères de l'épreuve, de la reproduction et de la compaction non joués`)

// ── 3. les sabotages : chacun doit rendre rouge le critère qu'il vise ────────────────────────────────────────────
if (lignes.length >= 251) {
  const objet = (l) => JSON.parse(l)
  const remettre = (o) => JSON.stringify(o)
  const avecPlan = (l, fn) => { const o = objet(l); const p = JSON.parse(o.messages[2].content); fn(p, o); o.messages[2].content = JSON.stringify(p); return remettre(o) }
  const iPlein = lignes.findIndex((l) => JSON.parse(objet(l).messages[2].content).taches.length === 3)
  const iTache = (type) => lignes.findIndex((l) => JSON.parse(objet(l).messages[2].content).taches.some((t) => t.type === type))
  const iConsigne = lignes.findIndex((l) => JSON.parse(objet(l).messages[2].content).consignes_lues.length > 0)
  const remplacer = (i, nouvelle) => lignes.map((l, k) => (k === i ? nouvelle : l))
  const sabotages = [
    ['une 4e tâche dans un plan léger', 'validité', remplacer(iPlein, avecPlan(lignes[iPlein], (p) => { p.taches.push({ ...p.taches[0], cle_idempotence: p.taches[0].cle_idempotence + '-bis', objet: p.taches[0].objet + ' (bis)' }) }))],
    ['« preneur » dans une relecture', 'filtre', (() => { const i = iTache('relecture'); return remplacer(i, avecPlan(lignes[i], (p) => { const t = p.taches.find((x) => x.type === 'relecture'); t.objet = "Relire le journal du preneur et lister les échecs de la nuit, une ligne chacun" })) })()],
    ['une ligne en double', 'doublons', [...lignes.slice(0, -1), lignes[0]]],
    ['un téléphone dans un état', 'identité', remplacer(5, (() => { const o = objet(lignes[5]); o.messages[1].content = o.messages[1].content.replace('</donnees_etat>', 'rappel au 06 12 34 56 78\n</donnees_etat>'); return remettre(o) })())],
    ['« prospect » dans une tâche de contenu (que le filtre ne lit pas)', 'identité', (() => { const i = iTache('contenu'); return remplacer(i, avecPlan(lignes[i], (p) => { const t = p.taches.find((x) => x.type === 'contenu'); t.charge.pourquoi = 'Pour convaincre les prospects de la semaine.' })) })()],
    ['une consigne sans sa ligne', 'consignes', remplacer(iConsigne, avecPlan(lignes[iConsigne], (p) => { p.consignes_lues.pop() }))],
    ['249 paires seulement', 'nombre', lignes.slice(0, 249)],
    ['une autre consigne système', 'format', remplacer(3, (() => { const o = objet(lignes[3]); o.messages[0].content = 'Tu es un assistant.'; return remettre(o) })())],
    ['une clé de tâche datée d’un autre jour', 'dates', remplacer(iPlein, avecPlan(lignes[iPlein], (p) => { p.taches[0].cle_idempotence = p.taches[0].cle_idempotence.replace(/chef:\d{4}-\d{2}-\d{2}/, 'chef:2025-01-01') }))],
    ...(epreuve.length ? [["une entrée de l'épreuve glissée dans les données", 'fuite', remplacer(7, (() => { const o = objet(lignes[7]); o.messages[1].content = epreuve[0]; return remettre(o) })())]] : []),
  ]
  for (const [nom, critere, saboteees] of sabotages) {
    const r = juger(saboteees, { epreuve })
    ok(`sabotage attrapé — ${nom} → ${critere}`, r.rouge.has(critere), `critères rouges : ${[...r.rouge.keys()].join(', ') || 'aucun'}`)
  }
}

console.log(rouges.length ? `\n❌ ${rouges.length} critère(s) rouge(s)` : '\n✅ PASS — données du Chef léger')
process.exitCode = rouges.length ? 1 : 0
