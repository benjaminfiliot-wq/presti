#!/usr/bin/env node
// scripts/modele/corpus-chef.mjs — étape 0 du modèle maison (docs/agents/modele-maison.md) : le corpus d'entraînement du Chef léger.
//
// Lit les paires (entree.md → plan.json) enregistrées par les cycles du Chef (copiées d'abord de l'usine, /home/agents/travail/chef, dans un dossier de travail LOCAL hors dépôt :
// .orchestre/travail/modele-maison/chef, ignoré par git), ne garde que celles qui comptent :
//   · le plan existe, se lit, et passe validerPlan (scripts/chef/commun.mjs) À LA DATE du cycle (l'échéance d'une décision se juge à ce moment-là) ;
//   · le plan a été APPLIQUÉ sans écart : un rapport appliquer-*.json de code 0, sans écart, qui couvre toutes les clés du plan (aux tâches écartées près) ;
//   · aucune tâche du plan n'est écartée par les règles d'AUJOURD'HUI (filtrerTaches) : entraîner un modèle à écrire ce que l'on jette n'a pas de sens (--tolere-ecartees pour les garder) ;
//   · ni l'état ni le plan ne contiennent d'adresse e-mail, de téléphone, de SIREN/SIRET, de secret, ni un motif de la garde des prospects (motifProspects, scripts/usine/garde-prospects.mjs) ;
//   · la paire n'est pas un doublon exact d'une paire déjà gardée.
// Écrit un JSONL (une ligne = { messages: [system, user, assistant] }) et un rapport JSON ; imprime le décompte : trouvés, gardés, refusés par motif, longueurs en jetons approximatifs.
//
// Usage : node scripts/modele/corpus-chef.mjs [--dossier=<copie locale du dossier chef>] [--sortie=<corpus.jsonl>] [--rapport=<rapport.json>] [--tolere-ecartees]
//   code 0 : écrit ; code 2 : dossier absent ou vide.
// La fonction `construire` est pure (aucune écriture) : le juge scripts/modele-corpus-qa.mjs l'exerce sur des dossiers fabriqués.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { RACINE, EMAIL, validerPlan, filtrerTaches } from '../chef/commun.mjs'
import { chercherSecrets } from '../instantane-quotidien.mjs'
import { motifProspects } from '../usine/garde-prospects.mjs'
import { systemeCourt, messageUtilisateur } from './prompt-chef.mjs'

export const DOSSIER_DEFAUT = path.join(RACINE, '.orchestre', 'travail', 'modele-maison', 'chef')
export const SORTIE_DEFAUT = path.join(RACINE, '.orchestre', 'travail', 'modele-maison', 'corpus-chef.jsonl')
export const RAPPORT_DEFAUT = path.join(RACINE, '.orchestre', 'travail', 'modele-maison', 'corpus-chef.rapport.json')
/** Signes par jeton, pour l'ESTIMATION des longueurs (le français et le JSON d'un tokenizer Qwen) : la mesure réelle est dans docs/agents/modele-maison-mesures.md. */
export const SIGNES_PAR_JETON = 3.0
export const jetons = (s) => Math.ceil([...String(s)].length / SIGNES_PAR_JETON)

const DOSSIER_CYCLE = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/
const RAPPORT_APPLICATION = /^appliquer-.*\.json$/
const FENETRE_APPLICATION_MS = 45 * 60_000

/** Luhn : un SIREN (9 chiffres) et un SIRET (14) le respectent ; ce test écarte la plupart des identifiants numériques ordinaires. */
export function luhn(chiffres) {
  let somme = 0
  for (let i = 0; i < chiffres.length; i++) {
    let c = Number(chiffres[chiffres.length - 1 - i])
    if (i % 2 === 1) { c *= 2; if (c > 9) c -= 9 }
    somme += c
  }
  return somme % 10 === 0
}
const SIREN = /(?<![\d.])(\d{3}[ .]?\d{3}[ .]?\d{3})(?:[ .]?\d{5})?(?![\d.])/g
/** Rend le motif d'une donnée d'identité qu'un corpus ne doit jamais porter (e-mail, téléphone, SIREN/SIRET, secret, garde des prospects), ou null. */
export function motifIdentite(texte) {
  const t = String(texte)
  if (EMAIL.test(t)) return 'adresse e-mail'
  const secret = chercherSecrets(t)[0]
  if (secret) return `secret (${secret})`
  for (const m of t.matchAll(SIREN)) if (luhn(m[1].replace(/\D/g, ''))) return 'numéro SIREN/SIRET (9 ou 14 chiffres, Luhn)'
  return motifProspects(t)
}

export function dateDuDossier(nom) {
  const m = DOSSIER_CYCLE.exec(nom)
  return m ? new Date(`${m[1]}T${m[2]}:${m[3]}:${m[4]}.${m[5]}Z`) : null
}
const lire = (f) => { try { return fs.readFileSync(f, 'utf8') } catch { return null } }
const json = (t) => { try { return JSON.parse(t) } catch { return undefined } }
const stable = (v) => JSON.stringify(v, (_k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, x[k]])) : x))
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex')
const liste = (v) => (Array.isArray(v) ? v : [])
const clesDuPlan = (plan) => [...liste(plan?.taches), ...liste(plan?.decisions)].map((x) => x?.cle_idempotence)

/** Le rapport d'application qui correspond à un cycle : le premier, après le dossier et avant le suivant, de même cycle et de clés cohérentes avec le plan. Ne se réutilise pas. */
function rapportDe(plan, debut, finMs, rapports, pris) {
  const cles = new Set(clesDuPlan(plan))
  for (const r of rapports) {
    if (pris.has(r.nom) || r.cycle !== plan.cycle) continue
    if (!(r.le > debut.getTime() && r.le < Math.min(finMs, debut.getTime() + FENETRE_APPLICATION_MS))) continue
    const envoyees = (r.requetes || []).filter((q) => q.genre !== 'battement').map((q) => q.cle)
    if (!envoyees.every((c) => cles.has(c))) continue
    return r
  }
  return null
}

/** Rend les paires jugées d'un dossier de cycles. Pure : aucune écriture. `maintenant` n'est pas utilisé (chaque plan se juge à la date de son cycle). */
export function construire(dossier, { tolereEcartees = false } = {}) {
  const sortie = { dossier, trouves: 0, gardes: [], refus: [], motifs_tous: {} }
  const noms = fs.readdirSync(dossier).filter((n) => DOSSIER_CYCLE.test(n) && fs.statSync(path.join(dossier, n)).isDirectory()).sort()
  const rapports = fs.readdirSync(dossier).filter((n) => RAPPORT_APPLICATION.test(n)).map((nom) => {
    const j = json(lire(path.join(dossier, nom)))
    return j && typeof j === 'object' ? { ...j, nom, le: Date.parse(j.le) } : null
  }).filter((r) => r && Number.isFinite(r.le)).sort((a, b) => a.le - b.le)
  const pris = new Set()
  const vus = new Set()
  noms.forEach((nom, i) => {
    sortie.trouves++
    const debut = dateDuDossier(nom)
    const finMs = i + 1 < noms.length ? dateDuDossier(noms[i + 1]).getTime() : Infinity
    const motifs = []
    const refuser = (motif, detail = '') => motifs.push(detail ? `${motif} : ${detail}` : motif)
    const entree = lire(path.join(dossier, nom, 'entree.md'))
    const brut = lire(path.join(dossier, nom, 'plan.json'))
    let plan
    if (entree === null || !entree.trim()) refuser('entrée absente ou vide')
    if (brut === null || !brut.trim()) refuser('pas de plan écrit (quota, délai ou échec du modèle)')
    else {
      plan = json(brut)
      if (plan === undefined || plan === null || typeof plan !== 'object' || Array.isArray(plan)) { refuser('plan illisible (JSON invalide)'); plan = undefined }
    }
    let rapport = null
    if (plan) {
      // Le rapport d'abord : un plan se juge À L'INSTANT où il a été appliqué (l'échéance d'une décision doit tomber entre +1 h et +7 j de ce moment-là, pas du début du cycle).
      rapport = rapportDe(plan, debut, finMs, rapports, pris)
      if (rapport) pris.add(rapport.nom)
      const ecarts = validerPlan(plan, plan.cycle, rapport ? new Date(rapport.le) : debut)
      if (ecarts.length) refuser('plan invalide pour validerPlan', ecarts[0])
      else if (!rapport) refuser("plan jamais appliqué (aucun rapport d'application cohérent)")
      else {
        const ecartees = filtrerTaches(plan).ecartees
        if (rapport.code !== 0 || (rapport.ecarts || []).length) refuser('appliqué avec écart', `code ${rapport.code}, ${(rapport.ecarts || []).length} écart(s)`)
        else if ((rapport.requetes || []).filter((q) => q.genre !== 'battement').length < clesDuPlan(plan).length - (Array.isArray(rapport.ecartees) ? rapport.ecartees.length : 0)) refuser('application incomplète (clés du plan non envoyées)')
        if (ecartees.length && !tolereEcartees) refuser("tâche écartée par les règles d'aujourd'hui", `${ecartees.length} : ${ecartees[0].raison}`)
      }
    }
    // La garde d'identité se joue toujours, même quand le plan est déjà refusé : le rapport dit combien de paires portaient une donnée sensible.
    if (entree) { const m = motifIdentite(entree); if (m) refuser('donnée sensible dans l\'état', m) }
    if (brut) { const m = motifIdentite(brut); if (m) refuser('donnée sensible dans le plan', m) }
    if (!motifs.length) {
      const cle = sha(`${entree}\u0000${stable(plan)}`)
      if (vus.has(cle)) refuser('doublon exact d\'une paire déjà gardée')
      else vus.add(cle)
    }
    for (const m of motifs) { const court = m.split(' : ')[0]; sortie.motifs_tous[court] = (sortie.motifs_tous[court] || 0) + 1 }
    if (motifs.length) { sortie.refus.push({ cycle: nom, mode: plan?.cycle ?? null, motif: motifs[0].split(' : ')[0], motifs }); return }
    const date = (clesDuPlan(plan).map((c) => /^chef:(\d{4}-\d{2}-\d{2}):/.exec(c)?.[1]).find(Boolean)) || nom.slice(0, 10)
    const messages = [
      { role: 'system', content: systemeCourt(plan.cycle) },
      { role: 'user', content: messageUtilisateur(plan.cycle, date, entree) },
      { role: 'assistant', content: JSON.stringify(plan) },
    ]
    sortie.gardes.push({ cycle: nom, mode: plan.cycle, messages, taches: (plan.taches || []).length, decisions: (plan.decisions || []).length, cles: clesDuPlan(plan) })
  })
  return sortie
}

const mediane = (a) => { const t = [...a].sort((x, y) => x - y); return t.length ? (t.length % 2 ? t[(t.length - 1) / 2] : Math.round((t[t.length / 2 - 1] + t[t.length / 2]) / 2)) : 0 }
const stats = (a) => a.length ? { n: a.length, min: Math.min(...a), mediane: mediane(a), moyenne: Math.round(a.reduce((x, y) => x + y, 0) / a.length), max: Math.max(...a) } : { n: 0 }
const lignes = (t) => new Set(String(t).split('\n').map((l) => l.trim()).filter(Boolean))
const jaccard = (a, b) => { let c = 0; for (const x of a) if (b.has(x)) c++; return c / (a.size + b.size - c || 1) }

/** Le rapport chiffré d'un résultat de `construire`. */
export function rapporter(r) {
  const par_motif = {}
  for (const x of r.refus) par_motif[x.motif] = (par_motif[x.motif] || 0) + 1
  const mode = (m) => r.gardes.filter((g) => g.mode === m).length
  const etats = r.gardes.map((g) => lignes(g.messages[1].content))
  // La plus proche voisine de chaque état gardé : un corpus de 30 paires dont les états sont identiques à 95 % ne fait pas 30 exemples variés.
  const voisines = etats.map((e, i) => etats.reduce((m, f, j) => (j === i ? m : Math.max(m, jaccard(e, f))), 0))
  const taches = r.gardes.flatMap((g) => g.cles).filter((c) => /^chef:/.test(c))
  return {
    trouves: r.trouves,
    gardes: r.gardes.length,
    gardes_par_cycle: { leger: mode('leger'), plein: mode('plein') },
    refuses: r.refus.length,
    refuses_par_motif: par_motif,
    motifs_toutes_causes: r.motifs_tous,
    jetons_estimes: {
      signes_par_jeton: SIGNES_PAR_JETON,
      systeme: stats(r.gardes.map((g) => jetons(g.messages[0].content))),
      entree: stats(r.gardes.map((g) => jetons(g.messages[1].content))),
      sortie: stats(r.gardes.map((g) => jetons(g.messages[2].content))),
      sortie_leger: stats(r.gardes.filter((g) => g.mode === 'leger').map((g) => jetons(g.messages[2].content))),
    },
    diversite: {
      cles_distinctes: new Set(taches).size,
      cles_au_total: taches.length,
      etats_voisins_a_90_pourcent_ou_plus: voisines.filter((v) => v >= 0.9).length,
      similarite_voisine_mediane: Number((voisines.length ? [...voisines].sort((a, b) => a - b)[Math.floor(voisines.length / 2)] : 0).toFixed(3)),
    },
    gardes_liste: r.gardes.map((g) => ({ cycle: g.cycle, mode: g.mode, taches: g.taches, decisions: g.decisions })),
    refuses_liste: r.refus.map((x) => ({ cycle: x.cycle, mode: x.mode, motif: x.motif, detail: x.motifs[0].includes(' : ') ? x.motifs[0].split(' : ').slice(1).join(' : ').slice(0, 160) : '' })),
  }
}

/** Écrit le JSONL du corpus : une ligne par paire gardée. */
export function ecrireCorpus(r, fichier) {
  fs.mkdirSync(path.dirname(fichier), { recursive: true })
  fs.writeFileSync(fichier, r.gardes.map((g) => JSON.stringify({ messages: g.messages })).join('\n') + (r.gardes.length ? '\n' : ''))
}

const estPrincipal = !!process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (estPrincipal) {
  const arg = (nom, defaut) => { const a = process.argv.slice(2).find((x) => x.startsWith(`--${nom}=`)); return a ? a.slice(nom.length + 3) : defaut }
  const dossier = path.resolve(arg('dossier', DOSSIER_DEFAUT))
  const sortie = path.resolve(arg('sortie', SORTIE_DEFAUT))
  const fRapport = path.resolve(arg('rapport', RAPPORT_DEFAUT))
  if (!fs.existsSync(dossier) || !fs.readdirSync(dossier).some((n) => DOSSIER_CYCLE.test(n))) {
    console.error(`✗ aucun dossier de cycle dans ${dossier} : copier d'abord /home/agents/travail/chef de l'usine`)
    process.exitCode = 2
  } else {
    const tolere = process.argv.includes('--tolere-ecartees')
    const r = construire(dossier, { tolereEcartees: tolere })
    const rap = rapporter(r)
    // Ce que vaudrait le corpus si l'on gardait aussi les plans dont une tâche est écartée aujourd'hui (le Chef a passé la nuit du 05-06/10 à écrire de la maintenance de preneur).
    const large = tolere ? r : construire(dossier, { tolereEcartees: true })
    rap.si_tolerance_ecartees = { gardes: large.gardes.length, leger: large.gardes.filter((g) => g.mode === 'leger').length, plein: large.gardes.filter((g) => g.mode === 'plein').length }
    ecrireCorpus(r, sortie)
    fs.mkdirSync(path.dirname(fRapport), { recursive: true })
    fs.writeFileSync(fRapport, JSON.stringify(rap, null, 2) + '\n')
    console.log(`plans trouvés : ${rap.trouves} · gardés : ${rap.gardes} (léger ${rap.gardes_par_cycle.leger}, plein ${rap.gardes_par_cycle.plein}) · refusés : ${rap.refuses}`)
    for (const [m, n] of Object.entries(rap.refuses_par_motif).sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(3)} × ${m}`)
    console.log(`dont motifs relevés toutes causes confondues : ${JSON.stringify(rap.motifs_toutes_causes)}`)
    console.log(`si l'on tolère les tâches écartées aujourd'hui : ${rap.si_tolerance_ecartees.gardes} gardés (léger ${rap.si_tolerance_ecartees.leger}, plein ${rap.si_tolerance_ecartees.plein})`)
    const j = rap.jetons_estimes
    console.log(`jetons estimés (≈ ${j.signes_par_jeton} signes/jeton) : système ${j.systeme.mediane ?? '-'} · entrée médiane ${j.entree.mediane ?? '-'} (max ${j.entree.max ?? '-'}) · sortie médiane ${j.sortie.mediane ?? '-'} (max ${j.sortie.max ?? '-'}), léger ${j.sortie_leger.mediane ?? '-'}`)
    console.log(`diversité : ${rap.diversite.cles_distinctes} clés de tâche distinctes sur ${rap.diversite.cles_au_total} ; ${rap.diversite.etats_voisins_a_90_pourcent_ou_plus} états gardés à 90 % ou plus d'un autre (similarité voisine médiane ${rap.diversite.similarite_voisine_mediane})`)
    console.log(`→ ${sortie}\n→ ${fRapport}`)
  }
}
