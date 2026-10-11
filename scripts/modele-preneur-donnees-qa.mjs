#!/usr/bin/env node
// scripts/modele-preneur-donnees-qa.mjs — juge des données du modèle maison « presti-preneur » (scripts/modele/donnees-preneur.mjs, preneur-gardes.mjs, preneur-taches.mjs) — 06/10/2026.
//
// POURQUOI : les ENTRÉES de ces paires sont parties chez un modèle gratuit (freellmapi) et partiront sur Kaggle ; leurs SORTIES finiront dans les poids du
// modèle qui écrira les textes de l'écosystème (annonces eBay, accroches, scripts, réponses aux acheteurs, textes Presti). Le juge relit :
//   · tout ce qui a été ENVOYÉ au maître (envois.jsonl) et tout ce qui est GARDÉ : aucune donnée de prospect (garde du module + motifs PROPRES au juge +
//     noms des entreprises prospectées, lus localement et jamais affichés) ;
//   · chaque sortie gardée : les gardes du preneur (nombresNonSources, controlerSortie) ET une garde des nombres propre au juge, les promesses, le français ;
//   · la forme (consigne système exacte du preneur), les doublons, la fuite d'une tâche de l'épreuve, la reproduction octet pour octet depuis le cache ;
// puis le sabote : chaque sabotage doit rendre rouge le critère qu'il vise.
//
// Usage : node scripts/modele-preneur-donnees-qa.mjs [--donnees=<jsonl>]     (code 0 : PASS ; code 1 : critère rouge)
import fs from 'node:fs'
import path from 'node:path'
import { construireConsigne } from './usine/preneur.mjs'
import { fautesSortie, motifIdentitePreneur, contientNomProspect, nomsProspects } from './modele/preneur-gardes.mjs'
import { construireEntrees, construirePaires, F_DONNEES, F_CACHE, F_ENVOIS, MIN_PAIRES } from './modele/donnees-preneur.mjs'
import { EPREUVE } from './modele/preneur-taches.mjs'

const arg = (nom, defaut) => { const a = process.argv.slice(2).find((x) => x.startsWith(`--${nom}=`)); return a ? a.slice(nom.length + 3) : defaut }
const fDonnees = path.resolve(arg('donnees', F_DONNEES))
const rouges = []
const ok = (nom, cond, detail = '') => { console.log(`${cond ? '✅' : '❌'} ${nom}${cond || !detail ? '' : ' — ' + detail}`); if (!cond) rouges.push(nom) }
const lireJsonl = (f) => { try { return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean) } catch { return [] } }

// ── les motifs PROPRES du juge (indépendants du module) ─────────────────────────────────────────────────────────────────
const COURRIEL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/
const TEL = /(?:\+33|0033|\b0)\s?[1-9](?:[\s.-]?\d{2}){4}\b/
const luhn = (s) => { let t = 0; for (let i = 0; i < s.length; i++) { let c = Number(s[s.length - 1 - i]); if (i % 2) { c *= 2; if (c > 9) c -= 9 } t += c } return t % 10 === 0 }
const SIREN = /(?<![\d.])(\d{3}[ .]?\d{3}[ .]?\d{3})(?:[ .]?\d{5})?(?![\d.])/g
const RUE = /\b\d{1,4}\s*,?\s+(?:rue|avenue|boulevard|chemin|impasse|all[ée]e|place)\b/i
function motifPropre(t) {
  if (COURRIEL.test(t)) return 'courriel'
  if (TEL.test(t)) return 'téléphone'
  for (const m of t.matchAll(SIREN)) if (luhn(m[1].replace(/\D/g, ''))) return 'SIREN'
  if (RUE.test(t)) return 'adresse'
  if (/prospect|d[ée]marchage/i.test(t)) return 'prospect'
  return null
}
const noms = nomsProspects()
const identite = (t) => motifPropre(t) || motifIdentitePreneur(t) || (contientNomProspect(t, noms) ? 'nom de prospect' : null)

// La garde des nombres PROPRE au juge : tout nombre de deux chiffres ou plus de la sortie (hors citations [n] et numérotation de ligne) doit se lire
// dans les sources, à l'écriture près (espaces des milliers, virgule ou point).
const chiffres = (s) => String(s).replace(/[   ](?=\d{3}\b)/g, '').replace(/,/g, '.')
function nombresDuJuge(sortie, sources) {
  const src = ` ${chiffres(sources).replace(/[^\d.]+/g, ' ')} `
  const t = chiffres(sortie).replace(/\[\d+\]/g, ' ').replace(/^\s*(?:[-*]\s*)?\d+[.)]\s/gm, ' ').replace(/\b\d{1,2}(?:\.\d)?\s?(?:-|–|à)\s?\d{1,2}(?:\.\d)?\s?s(?:ec(?:onde)?s?)?\b/g, ' ').replace(/\b\d{1,2}:\d{2}\b/g, ' ')
  return [...new Set((t.match(/\d+(?:\.\d+)?/g) || []).filter((n) => n.replace(/\D/g, '').length >= 2 && !src.includes(` ${n} `) && !src.includes(` ${n}.`) && !new RegExp(`(^|[^\\d.])${n.replace('.', '\\.')}(?!\\d)`).test(chiffres(sources))))]
}

// ── les entrées de référence (pour l'attendu et la consigne exacte) ────────────────────────────────────────────────────
const { entrees } = construireEntrees()
const parUser = new Map(entrees.map((e) => [e.utilisateur, e]))
const SYSTEMES = new Set([construireConsigne({ type: 'redaction_interne', objet: 'x', charge: {} }, []).systeme, construireConsigne({ type: 'redaction_interne', objet: 'x', charge: {} }, [{ source: 'a:1-1', extrait: 'b' }]).systeme])
const objetsEpreuve = EPREUVE.map((t) => t.objet.trim())

/** Les critères, sur des lignes JSONL de données et des lignes d'envois. Rend { rouge: Map, mesures }. */
export function juger(lignes, envois) {
  const rouge = new Map()
  const faute = (c, d) => { if (!rouge.has(c)) rouge.set(c, d) }
  const m = { n: lignes.length, impossibles: 0, sansSavoir: 0, ecom: 0, presti: 0, maxSignes: 0, envois: envois.length }
  if (lignes.length < MIN_PAIRES || lignes.length > 400) faute('nombre', `${lignes.length} paires (${MIN_PAIRES} à 400 attendues)`)
  const brutes = new Set(), users = new Set()
  lignes.forEach((brut, i) => {
    if (brutes.has(brut)) faute('doublons', `ligne ${i + 1} identique à une précédente`); brutes.add(brut)
    let o
    try { o = JSON.parse(brut) } catch { faute('format', `ligne ${i + 1} illisible`); return }
    const msg = o?.messages
    if (!Array.isArray(msg) || msg.length !== 3 || msg[0]?.role !== 'system' || msg[1]?.role !== 'user' || msg[2]?.role !== 'assistant') { faute('format', `ligne ${i + 1} : system/user/assistant attendus`); return }
    if (!SYSTEMES.has(msg[0].content)) faute('format', `ligne ${i + 1} : consigne système différente de celle du preneur`)
    if (!/^Type de tâche : redaction_interne\nTravail à faire : \S/.test(msg[1].content)) faute('format', `ligne ${i + 1} : message utilisateur hors forme`)
    if (users.has(msg[1].content)) faute('doublons', `ligne ${i + 1} : entrée déjà vue`); users.add(msg[1].content)
    const objet = /^Travail à faire : (.*)$/m.exec(msg[1].content)?.[1]?.trim()
    if (objetsEpreuve.includes(objet)) faute('fuite', `ligne ${i + 1} : tâche de l'épreuve`)
    const nPassages = (msg[1].content.match(/^\[\d+\] \S+:\d+-\d+$/gm) || []).length
    const ref = parUser.get(msg[1].content)
    const attendu = ref?.attendu ?? 'travail'
    const consigne = { systeme: msg[0].content, utilisateur: msg[1].content }
    const f = fautesSortie(consigne, msg[2].content, { attendu, nPassages, noms })
    if (f.length) faute('sorties', `ligne ${i + 1} : ${f[0]}`)
    const n = nombresDuJuge(msg[2].content, `${msg[0].content}\n${msg[1].content}`)
    if (attendu === 'travail' && n.length) faute('sorties', `ligne ${i + 1} : nombre absent des sources (juge) : ${n.slice(0, 3).join(', ')}`)
    for (const [k, t] of [['entrée', `${msg[0].content}\n${msg[1].content}`], ['sortie', msg[2].content]]) { const a = identite(t); if (a) faute('identité', `ligne ${i + 1} (${k}) : ${a}`) }
    m.maxSignes = Math.max(m.maxSignes, [...(msg[0].content + msg[1].content + msg[2].content)].length)
    if (attendu === 'impossible' || /^\s*IMPOSSIBLE\b/i.test(msg[2].content)) { m.impossibles++; faute('impossible', `ligne ${i + 1} : une réponse IMPOSSIBLE (la v1 en a appris à refuser des tâches faisables)`) }
    if (!nPassages) m.sansSavoir++
    if (/eBay|TikTok|acheteur|nettoyeur|aspirateur|souffleur/i.test(objet ?? '')) m.ecom++
    if (/Presti|artisan/i.test(objet ?? '')) m.presti++
  })
  envois.forEach((brut, i) => {
    let o
    try { o = JSON.parse(brut) } catch { faute('envois', `envoi ${i + 1} illisible`); return }
    const texte = (o.messages || []).map((x) => x.content).join('\n')
    const a = identite(texte)
    if (a) faute('envois', `envoi ${i + 1} : ${a}`)
    if (objetsEpreuve.some((ob) => texte.includes(`Travail à faire : ${ob}\n`))) faute('envois', `envoi ${i + 1} : une tâche de l'épreuve est partie chez le maître`)
  })
  // ≈ 3 signes par jeton en français (Qwen) : 8 000 signes ≈ 2 600 jetons, la longueur que l'entraînement garde sur un T4
  if (m.maxSignes > 8000) faute('longueur', `${m.maxSignes} signes au plus`)
  return { rouge, mesures: m }
}

// ── 1. les données écrites et les envois ─────────────────────────────────────────────────────────────────────────────
const lignes = lireJsonl(fDonnees)
const envois = lireJsonl(F_ENVOIS)
ok('le JSONL des données existe', lignes.length > 0, `${fDonnees} vide ou absent : node scripts/modele/donnees-preneur.mjs --distiller d'abord`)
ok('des envois au maître sont journalisés', envois.length > 0, `${F_ENVOIS} absent`)
ok('les noms des prospects connus sont chargés (garde des noms active)', noms.length >= 50, `${noms.length} noms`)
const { rouge, mesures } = juger(lignes, envois)
for (const c of ['nombre', 'format', 'doublons', 'sorties', 'identité', 'envois', 'fuite', 'longueur', 'impossible']) ok(`données — ${c}`, !rouge.has(c), rouge.get(c))
console.log(`   ${mesures.n} paires · ${mesures.envois} envois relus · ${mesures.impossibles} IMPOSSIBLE · ${mesures.sansSavoir} sans Savoir · e-commerce ${mesures.ecom} · Presti ${mesures.presti} · ${mesures.maxSignes} signes au plus`)
ok('couverture : e-commerce et Presti (40 paires chacun au moins)', mesures.ecom >= 40 && mesures.presti >= 40, `e-commerce ${mesures.ecom}, Presti ${mesures.presti}`)
ok('couverture : des entrées sans Savoir (20 au moins)', mesures.sansSavoir >= 20, `${mesures.sansSavoir} sans Savoir`)

// ── 2. l'épreuve est à part, et les données sont exactement ce que le générateur écrit depuis le cache ─────────────────
const ep = construireEntrees({ epreuve: true }).entrees
ok("l'épreuve compte 12 entrées, toutes hors des tâches d'entraînement", ep.length === 12 && ep.every((e) => !entrees.some((x) => x.utilisateur === e.utilisateur || x.id === e.id)), `${ep.length} entrées`)
const cache = lireJsonl(F_CACHE).map((l) => JSON.parse(l))
const refait = construirePaires(entrees, cache).paires.map((p) => JSON.stringify({ messages: p.messages }))
ok('reproductible : le générateur réécrit le même JSONL depuis le cache, ligne pour ligne', refait.length === lignes.length && refait.every((l, i) => l === lignes[i]), `${refait.length} lignes refaites contre ${lignes.length}`)

// ── 3. les sabotages ─────────────────────────────────────────────────────────────────────────────────────────────────
if (lignes.length >= MIN_PAIRES + 1) {
  const objet = (l) => JSON.parse(l)
  const remettre = (o) => JSON.stringify(o)
  const travail = lignes.map((l, i) => [l, i]).filter(([l]) => parUser.get(objet(l).messages[1].content)?.attendu === 'travail' && /\[1\]/.test(objet(l).messages[2].content)).map(([, i]) => i)
  const iT = travail[0], iT2 = travail[1], iT3 = travail[2]
  const changer = (i, fn) => lignes.map((l, k) => { if (k !== i) return l; const o = objet(l); fn(o.messages); return remettre(o) })
  const ajoutSortie = (i, texte) => changer(i, (m) => { m[2].content = `${m[2].content}\n${texte}` })
  // un nom de prospect réel, pris en mémoire (jamais affiché)
  const nomReel = noms.find((n) => n.length >= 2)?.join(' ') ?? 'nom inconnu'
  // un SIREN de neuf chiffres qui passe la clé de Luhn
  let siren = '123456780'
  for (let k = 0; k < 10; k++) { const s = `12345678${k}`; if (luhn(s)) { siren = s; break } }
  const envoiSabote = (texte) => [...envois.slice(0, -1), JSON.stringify({ ...JSON.parse(envois.at(-1)), messages: [{ role: 'user', content: texte }] })]
  const sabotages = [
    ['un prix inventé (39,90 €) dans une sortie', 'sorties', ajoutSortie(iT, 'Prix conseillé : 39,90 €.'), envois],
    ['un nombre inventé sans unité (2 500 abonnés) dans une sortie', 'sorties', ajoutSortie(iT2, 'Objectif : 2 500 abonnés.'), envois],
    ['une promesse « garanti à vie »', 'sorties', ajoutSortie(iT3, 'Produit garanti à vie.'), envois],
    ['une sortie en anglais', 'sorties', changer(iT, (m) => { m[2].content = 'Summary of the task for the team.\n\nThis is the answer to the task and it is written in English for you, with the details of the work that you asked for in the message. The team will read it and use it for the next video, and it is the final version of the text for the product page. [1]' }), envois],
    ['une citation [9] hors des passages', 'sorties', ajoutSortie(iT2, 'Voir aussi [9].'), envois],
    ['un IMPOSSIBLE paresseux sur un travail faisable', 'sorties', changer(iT, (m) => { m[2].content = 'IMPOSSIBLE : je n’ai pas accès au fichier demandé dans la tâche.' }), envois],
    ['un téléphone dans une entrée', 'identité', changer(iT, (m) => { m[1].content = m[1].content.replace('</donnees_tache>', 'Rappel au 06 12 34 56 78\n</donnees_tache>') }), envois],
    ["le nom d'une entreprise prospectée dans une entrée", 'identité', changer(iT2, (m) => { m[1].content = m[1].content.replace('</donnees_tache>', `Pour ${nomReel}\n</donnees_tache>`) }), envois],
    ['une adresse dans une sortie', 'identité', ajoutSortie(iT3, 'Retour au 12 rue des Lilas.'), envois],
    ['un SIREN valide dans un envoi au maître', 'envois', lignes, envoiSabote(`Travail à faire : fiche de l'entreprise ${siren.slice(0, 3)} ${siren.slice(3, 6)} ${siren.slice(6)}`)],
    ["une tâche de l'épreuve envoyée au maître", 'envois', lignes, envoiSabote(`Type de tâche : redaction_interne\nTravail à faire : ${objetsEpreuve[5]}\n<donnees_tache>`)],
    ['une ligne en double', 'doublons', [...lignes.slice(0, -1), lignes[0]], envois],
    [`${MIN_PAIRES - 1} paires seulement`, 'nombre', lignes.slice(0, MIN_PAIRES - 1), envois],
    ['une autre consigne système', 'format', changer(iT, (m) => { m[0].content = 'Tu es un assistant.' }), envois],
    ["une paire IMPOSSIBLE (tâche du web) remise dans les données", 'impossible', (() => { const e = entrees.find((x) => x.attendu === 'impossible'); return [...lignes.slice(1), JSON.stringify({ messages: [{ role: 'system', content: e.systeme }, { role: 'user', content: e.utilisateur }, { role: 'assistant', content: 'IMPOSSIBLE : la tâche exige les chiffres du jour, absents des extraits.' }] })] })(), envois],
    ["une tâche de l'épreuve glissée dans les données", 'fuite', changer(iT2, (m) => { m[1].content = m[1].content.replace(/^Travail à faire : .*$/m, `Travail à faire : ${objetsEpreuve[2]}`) }), envois],
  ]
  for (const [nom, critere, l, e] of sabotages) {
    const r = juger(l, e)
    ok(`sabotage attrapé — ${nom} → ${critere}`, r.rouge.has(critere), `critères rouges : ${[...r.rouge.keys()].join(', ') || 'aucun'}`)
  }
}

console.log(rouges.length ? `\n❌ ${rouges.length} critère(s) rouge(s)` : '\n✅ PASS — données du preneur')
process.exitCode = rouges.length ? 1 : 0
