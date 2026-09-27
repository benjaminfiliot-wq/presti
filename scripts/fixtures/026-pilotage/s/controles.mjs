// scripts/fixtures/026-pilotage/s/controles.mjs — les contrôles propres au lot s (fiche 026-067), lancés par
// scripts/juges-026-pilotage-preuve.mjs --lot=s (déclarés dans s/lot.mjs, `controles`).
//   controleJeux (JA-3)    : s/contrat-vues.mjs valide chaque jeu d'essai de s/ qui se dit conforme, et refuse chacun des
//                            pièges (une ligne par piège, avec la raison) ; les jeux d'essai sont sans nom réel ni clé
//                            réelle, et portent ce que la fiche 026-067 y demande ;
//   controleSecrets (JA-4) : station-reunion-qa et station-logique-qa ne lisent ni .env.local, ni agents.env, ni
//                            presti-secrets : lu dans le source (lecturesDeSecrets du lot a), puis vérifié à l'exécution, en
//                            témoin, sous un piège des lectures qui refuse et consigne toute lecture d'un tel chemin.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { R, TRAVAIL, court, exigerSousTravail, listerFichiers } from '../a/commun.mjs'
import { lecturesDeSecrets, jetonsDans, RE_CHEMIN_SECRET } from '../a/jeux.mjs'
import { S, jeuS, TEMOIN_S, CLES_SALLE_ATTENDUES } from './commun.mjs'
import { validerVue, validerReglages, PIEGES } from './contrat-vues.mjs'
import { SCENARIOS } from './faux-codex.mjs'

const rel = (f) => path.relative(R, f).split(path.sep).join('/')
const MOTIFS_VEILLEUR = ['pause_generale', 'panne_agent', 'argent_bloque', 'coupe_circuit', 'usine_injoignable', 'envoi_sans_verdicts', 'canal_arrete', 'gmail_bloque', 'notice_perimee', 'jauge_pleine', 'paiement_non_rattache', 'taches_bloquees', 'disjoncteur', 'quota_haut', 'jeton_externe', 'agent_muet', 'stockage', 'orchestre', 'technologie_en_pause', 'modele_suspendu', 'changer_message', 'bilan', 'vercel_pro']

export async function controleJeux() {
  const e = [], lignes = []
  // 1) Chaque réponse qui se dit conforme passe le contrat.
  const conformes = [...listerFichiers(S)].filter((f) => /^[^/]+\.json$/.test(f)).map((f) => ({ f, j: jeuS(f) })).filter((x) => x.j.conforme === true)
  for (const { f, j } of conformes) {
    const d = f === 'reglages.json' ? validerReglages(j.reponse) : validerVue(j.reponse, j.opts)
    if (d.length) e.push(`${f} se dit conforme et ne passe pas le contrat : ${d.slice(0, 2).join(' ; ')}`)
  }
  const avoir = ['vue-direct.json', 'vue-fil.json', 'barre-complete.json', 'salle-ecommerce.json', 'salle-standard.json', 'salle-redaction.json', 'salle-machines.json', 'salle-machines-sans-mesure.json', 'salle-a-venir.json', 'reglages.json', ...['commandement', 'radar', 'audience', 'securite', 'presti', 'observatoire', 'repos'].map((s) => `salle-${s}.json`)]
  for (const f of avoir) if (!conformes.some((x) => x.f === f)) e.push(`${f} absent (ou sans conforme: true)`)
  const mesure = jeuS('salle-machines-sans-mesure.json').reponse?.valeur
  if (!(mesure?.usine?.valeur === null && mesure?.usine?.manque)) e.push('salle-machines-sans-mesure.json : usine doit être nulle avec son manque')
  // 2) Chaque piège est refusé, pour sa raison.
  const jeux = { direct: jeuS('vue-direct.json').reponse, fil: jeuS('vue-fil.json').reponse, ecommerce: jeuS('salle-ecommerce.json').reponse, standard: jeuS('salle-standard.json').reponse, presti: jeuS('salle-presti.json').reponse, observatoire: jeuS('salle-observatoire.json').reponse, reglages: jeuS('reglages.json').reponse }
  const exiges = ['vue-sans-source', 'valeur-numerique-nue', 'bulle-arobase', 'bulle-neuf-chiffres', 'bulle-http', 'bandeau-arobase', 'couleur-violette', 'huit-cartes', 'agent-sans-salle-ni-point', 'champ-texte_brut', 'champ-destinataire', 'champ-entreprise', 'champ-email', 'champ-telephone', 'zero-hors-perimetre', 'ecommerce-chiffre', 'ecommerce-tableau', 'salle-inconnue', 'reglage-cle-inconnue']
  for (const x of exiges) if (!PIEGES.some((p) => p.nom === x)) e.push(`piège « ${x} » absent de contrat-vues.mjs`)
  for (const p of PIEGES) {
    const { reponse, opts } = p.fabriquer(jeux)
    const d = opts.reglages ? validerReglages(reponse) : validerVue(reponse, opts)
    if (!d.length) e.push(`piège « ${p.nom} » (${p.raison}) accepté par le contrat`)
    else lignes.push(`${p.nom} → refusé (${p.raison} : « ${court(d[0], 70)} »)`)
  }
  // 3) Les jeux d'essai : ce que la fiche y demande, sans nom réel ni clé réelle.
  const A = jeuS('agents.json').agents, EV = jeuS('evenements.json')
  for (const n of ['facteur', 'repondeur', 'experience']) if (!A.some((a) => a.nom === n)) e.push(`agents.json sans ${n}`)
  if (!A.some((a) => a.nom.includes('inconnu'))) e.push('agents.json sans nom inconnu')
  if (EV.evenements.length !== 60) e.push(`evenements.json : ${EV.evenements.length} événements, 60 attendus`)
  for (const t of ['tache_prise', 'passage', 'battement', 'reunion_ouverte', 'reunion_close', 'reunion_abandonnee', 'consigne', 'consigne_lue']) if (!EV.evenements.some((x) => x.type === t)) e.push(`evenements.json sans ${t}`)
  if (EV.evenements.filter((x) => x.type === 'reunion_compte_rendu').length !== 5) e.push('evenements.json : cinq reunion_compte_rendu attendus')
  for (const p of EV.pieges) if (!EV.evenements.some((x) => (x.resume ?? '').includes(p))) e.push(`evenements.json : le piège « ${p} » n’est dans aucun résumé`)
  const al = jeuS('alertes.json').alertes.map((x) => x.motif)
  for (const m of [...MOTIFS_VEILLEUR, 'boite_deconnectee', 'liste_noire', 'usine_injoignable', 'jeton_meta_expire']) if (!al.includes(m)) e.push(`alertes.json sans le motif ${m}`)
  for (const s of ['conforme', 'six-lignes', 'ligne-141', 'quatre-idees', 'cle-hors-format', 'vide', 'delai']) if (!SCENARIOS.includes(s)) e.push(`faux-codex.mjs sans le scénario ${s}`)
  const V = jeuS('verdicts.json').verdicts
  for (const k of ['fondateur', 'sante_sans_comptabilite', 'sante_et_clients_sans_comptabilite', 'lecture_seule']) if (!V[k]) e.push(`verdicts.json sans « ${k} »`)
  if (jeuS('departements.json').departements.some((d) => !('departement' in d))) e.push('departements.json : une ligne sans département')
  if (typeof jeuS('tickets.json').ticketsOuverts?.nombre !== 'number' || !jeuS('tickets.json').pieges?.length) e.push('tickets.json : un nombre et un contenu piégé attendus')
  if (jeuS('activite-salles.json').activite.some((x) => !CLES_SALLE_ATTENDUES.includes(x.salle) || x.salle === 'ecommerce')) e.push('activite-salles.json : une salle hors des 20 (ou ecommerce)')
  let fichiers = 0
  for (const f of listerFichiers(S)) {
    if (!/\.(json|mjs|md|temoin)$/.test(f)) continue
    fichiers++
    const t = fs.readFileSync(path.join(S, f), 'utf8')
    for (const j of jetonsDans(t)) e.push(`${f}:${j.ligne} porte une clé réelle (${j.nom})`)
    if (f.endsWith('.json')) for (const m of t.matchAll(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g)) if (!/temoin/i.test(m[0]) || !/\.invalid$/.test(m[0])) e.push(`${f} : l’adresse « ${m[0]} » n’est pas une adresse de témoin en .invalid`)
    if (f.endsWith('.json')) for (const m of t.matchAll(/\b(?:M\.|Mme|Madame|Monsieur)\s+([A-ZÀ-Ý][\p{L}-]+(?:\s+[A-ZÀ-Ý][\p{L}-]+)?)/gu)) if (!/Témoin/.test(m[1])) e.push(`${f} : « ${m[0]} » sans « Témoin »`)
  }
  for (const f of listerFichiers(TEMOIN_S)) if (!f.endsWith('.temoin') || !fs.statSync(path.join(TEMOIN_S, f)).size) e.push(`témoin : ${f} sans suffixe .temoin ou vide`)
  return { echecs: e, detail: `${conformes.length} réponses conformes passent s/contrat-vues.mjs ; ${PIEGES.length} pièges refusés, un par un : ${lignes.join(' ; ')} ; ${fichiers} fichiers de s/ sans clé réelle ni nom réel ; alertes, événements, agents, verdicts, départements, tickets et scénarios du faux modèle au contrat de la fiche` }
}

const PIEGE = (journal) => String.raw`// Piège des lectures de secrets du lot s (JA-4 de 026-067), écrit par scripts/fixtures/026-pilotage/s/controles.mjs.
import fs from 'node:fs'
import fsp from 'node:fs/promises'
const RE = ${RE_CHEMIN_SECRET.toString()}
const J = ${JSON.stringify(journal)}
const vise = (p) => { try { return RE.test(String(p instanceof URL ? p.pathname : p).replace(/\\/g, '/')) } catch { return false } }
const noter = (quoi, p) => { try { fs.appendFileSync(J, process.pid + ' ' + quoi + ' ' + String(p) + '\n') } catch {} }
for (const [o, noms] of [[fs, ['readFileSync', 'openSync', 'existsSync', 'statSync', 'readFile', 'open', 'createReadStream']], [fsp, ['readFile', 'open']]]) {
  for (const n of noms) {
    const f = o[n]
    if (typeof f !== 'function') continue
    o[n] = function (p, ...a) {
      if (vise(p)) { noter(n, p); if (n === 'existsSync') return false; throw new Error('lecture refusée par le piège du lot s : ' + p) }
      return f.call(this, p, ...a)
    }
  }
}
if (typeof process.loadEnvFile === 'function') { process.loadEnvFile = function (p) { noter('loadEnvFile', p ?? '.env'); throw new Error('loadEnvFile refusé par le piège du lot s') } }
`

export async function controleSecrets(ctx) {
  const e = [], vus = []
  const L = await import(pathToFileURL(path.join(S, 'lot.mjs')).href)
  // 1) Lu dans le source.
  const sources = [path.join(R, 'scripts', 'station-reunion-qa.mjs'), path.join(R, 'scripts', 'station-logique-qa.mjs'), ...[...listerFichiers(S)].filter((f) => /^[^/]+\.mjs$/.test(f)).map((f) => path.join(S, f))]
  for (const f of sources) {
    const src = fs.readFileSync(f, 'utf8')
    for (const l of lecturesDeSecrets(src)) e.push(`${rel(f)}${l.ligne ? `:${l.ligne}` : ''} lit un secret : ${l.quoi}`)
    for (const j of jetonsDans(src)) e.push(`${rel(f)}:${j.ligne} porte une clé réelle (${j.nom})`)
  }
  // 2) À l'exécution, sous le piège des lectures.
  const d = exigerSousTravail(path.join(TRAVAIL, 'juges-026-pilotage', `lectures-${ctx.lot}`))
  fs.rmSync(d, { recursive: true, force: true })
  fs.mkdirSync(path.join(d, 'leurres'), { recursive: true })
  const leurre = path.join(d, 'leurres', ['', 'env', 'local'].join('.'))
  fs.writeFileSync(leurre, 'LEURRE_TEMOIN=1\n')
  const journal = path.join(d, 'journal.log'), piege = path.join(d, 'piege-lectures.mjs')
  fs.writeFileSync(piege, PIEGE(journal))
  const env = { NODE_OPTIONS: `--import=${pathToFileURL(piege).href}` }
  const lu = () => { try { return fs.readFileSync(journal, 'utf8').trim() } catch { return '' } }
  const t = ctx.lancerNode(['-e', `const fs = require('node:fs'); let a = 'lu', b = 'lu'; try { fs.readFileSync(${JSON.stringify(leurre)}) } catch { a = 'refuse' } try { fs.readFileSync(${JSON.stringify(path.join(S, 'lot.mjs'))}) } catch { b = 'refuse' } console.log(a + ' ' + b)`], { nom: 'piege-lectures-temoin', env, timeout: 60_000 })
  if (t.stdout.trim().split(/\r?\n/).pop() !== 'refuse lu') e.push(`le piège des lectures ne refuse pas le leurre ou gêne une lecture ordinaire (« ${court(t.sortie, 80)} »)`)
  if (!lu().includes(leurre)) e.push('le piège des lectures ne consigne pas le leurre')
  fs.rmSync(journal, { force: true })
  for (const j of L.juges.filter((x) => /station-(reunion|logique)-qa/.test(x.commande))) {
    const base = [...(j.loader === true ? ['--import', './scripts/ts-loader.mjs'] : []), j.commande, ...j.arguments]
    const x = ctx.lancerNode([...base, '--temoin'], { nom: `lectures-${path.basename(j.commande, '.mjs')}`, env, timeout: 600_000 })
    vus.push(`${path.basename(j.commande, '.mjs')} --temoin → ${x.code}`)
    if (x.code !== 0) e.push(`${j.commande} --temoin sous le piège des lectures : code ${x.code}, 0 attendu (« ${court(x.sortie.trim().split(/\r?\n/).filter((l) => l.startsWith('❌'))[0] ?? x.sortie.trim().split(/\r?\n/).pop(), 120)} »)`)
  }
  const jl = lu()
  if (jl) e.push(`lecture de secret consignée sous le piège : ${court(jl.split('\n')[0], 120)}`)
  return { echecs: e, detail: `${sources.length} sources lus (station-reunion-qa, station-logique-qa, modules de s/) : aucune lecture de .env.local, agents.env ni presti-secrets, aucune clé réelle ; piège des lectures prouvé sur un leurre ; ${vus.join(', ')} sous le piège, rien consigné (station-route-qa ne lit .env.local que sur la racine réelle, pour ses comptes d’essai : --harnais et le vivant, jamais sous la preuve)` }
}
