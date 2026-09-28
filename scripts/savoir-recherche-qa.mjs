#!/usr/bin/env node
// scripts/savoir-recherche-qa.mjs — le juge de l'auto-recherche (fiche 026-232, écrit par Claude Code, JAMAIS par
// l'exécutant qui produira l'outil : 026-233).
//
// Usage :
//   node scripts/savoir-recherche-qa.mjs [--partie=outil,cli] [--racine=<copie>]
//        SVR-1 (exports) et SVR-12 (hygiène) toujours, plus les SVR des parties choisies (les deux par défaut).
//        --racine juge une copie (témoin, sabotage) ; par défaut, le dépôt.
//   node scripts/savoir-recherche-qa.mjs --temoin          copie le témoin sous .orchestre/travail/ et le juge : rend 0.
//   node scripts/savoir-recherche-qa.mjs --preuve-echecs   le `verifier` de 026-232 : (a) le dépôt échoue, SVR-1 en premier ;
//        (b) le témoin est vert ; (c) chaque sabotage de sabotages.json fait échouer SON critère. Écrit
//        .orchestre/preuves/026-232/echecs-attendus.md avec les extraits réels.
//   node scripts/savoir-recherche-qa.mjs --reel            SVR-R1, SVR-R2 : la mise en service (026-241), sur le poste.
// Codes : 0 tout vert ; 1 un critère en échec ; 2 préalable manquant (argument inconnu, outil absent, usine injoignable).
// Tout se passe sous .orchestre/travail/savoir-recherche-qa/ (essais effacés en fin de passage, sauf
// SAVOIR_RECHERCHE_QA_GARDER=1). Aucun appel réseau hors 127.0.0.1 (l'espion du socle bloque le reste), aucune lecture de
// .env.local (sauf --reel) ni de presti-secrets, aucune vraie clé : les clés d'essai portent toutes « sentinelle ».
//
// ── Le contrat que ce juge fait respecter (026-233 le réalise ; le témoin le réalise déjà) ──────────────────────────────
// MODULE lib/savoir/recherche.ts — toutes les E/S par `deps`, aucun `fetch(`, aucun second client Firecrawl ; importe
//   `lireAvecFirecrawl` de @/lib/agents/lectureFirecrawl (le transport réel), `MOTEUR_DE` de @/lib/agents/moteurs (défaut
//   de deps.moteurs), `normaliser` de @/lib/savoir/index ; ni @/lib/ai ni @anthropic-ai/sdk ; imports node:, relatifs, @/.
//   · PLAFONDS_RECHERCHE, gelé en profondeur : { questionSignes: [3, 300], resultats: 8, extraitSignes: 600,
//     savoirParAgentEtJour: 200, webParAgentEtJour: 10, pagesWebParRecherche: 3, perplexityParJour: 5,
//     perplexityParRecherche: 1, besoinsParReponse: 2, relances: 1, creditsParLecture: 1, creditsParRecherche: 2 }.
//   · RECHERCHE_WEB_DE, gelé : ['chef', 'douleurs', 'redacteur_site', 'studio'] (cet ordre). · SEUIL_SAVOIR : nombre > 0.
//   · classesPour(agent, moteurs = MOTEUR_DE) : agent absent → ['public'] ; moteur hors { codex, ollama_local, claude }, ou
//     finissant par :cloud / -cloud (freellmapi, ollama_cloud, groq…) → ['public'] (28/09, relecture de 026-229 : la classe
//     interne ne va JAMAIS vers un moteur gratuit) ; personnelles: true sur codex ou ollama_local →
//     ['public', 'interne', 'prospects'] ; sinon ['public', 'interne']. demande.classes ne peut que restreindre.
//   · refusDonneePersonnelle(question, nomsProspects) → 'adresse' (courriel), 'numero' (0, +33 ou 0033 puis 9 chiffres,
//     espaces, points ou tirets permis), 'siren' (9 ou 14 chiffres valides selon Luhn), 'nom_prospect' (les jetons
//     normaliser() d'un nom apparaissent d'affilée dans ceux de la question), sinon null — dans cet ordre.
//   · chercher(demande = { agent, question, web?, classes? }, deps = { savoir(question, { k, classes }) → [{ texte, score,
//     source }] (valeur ou Promise), moteurs?, reglages (forme de docs/savoir/reglages.json), nomsProspects?,
//     firecrawl?: { chercher(requete) → { resultats: [{ url, titre? }] } | { refus }, lire(url) → { texte, url_finale,
//     methode, horodatage, robots } | { refus } }, perplexity?: (question) → { reponse, citations: [url | { url }] } |
//     { refus }, compteurs (objet du jour modifié EN PLACE : 'savoir:<agent>', 'web:<agent>', 'perplexity'),
//     credits: { restant } (décompté EN PLACE), journal(evenement), horloge: { maintenant() } }) :
//     1. question.trim() hors [3, 300] → refus 'question_hors_bornes', resultats [], ni savoir ni web (un événement au plus).
//     2. le savoir d'abord : classes = classesPour(agent, deps.moteurs ?? MOTEUR_DE) ∩ demande.classes ; si
//        compteurs['savoir:<agent>'] < 200 : +1 et deps.savoir(question, { k, classes }) ; tout résultat dont la source
//        n'est pas complète ({ racine, chemin } non vides, debut et fin entiers avec 1 ≤ debut ≤ fin, classe parmi public,
//        interne, prospects, sha256 hexadécimal de 64, synchronise_le une date) ou dont la classe n'est pas dans `classes`
//        est JETÉ (le filtre s'applique à la demande ET au retour) ; source recopiée telle quelle ; extrait = préfixe du
//        texte, 600 signes au plus ; tri par score décroissant, 8 au plus. Suffisant : 2 résultats ou plus et le meilleur
//        score ≥ SEUIL_SAVOIR.
//     3. le web, si demande.web === true, portes dans CET ordre : donnée personnelle (refusDonneePersonnelle(question,
//        deps.nomsProspects)) → web.etat 'refuse', web.raison = le genre, retour.refus 'donnee_personnelle' ; agent hors
//        RECHERCHE_WEB_DE → 'ferme' ('agent') ; interrupteurs.recherche_web éteint → 'ferme' ('interrupteur') ; savoir
//        suffisant → 'ferme' ('savoir_suffisant') ; compteurs['web:<agent>'] ≥ 10 → 'ferme' ('plafond'). Puis Firecrawl :
//        transport absent → 'indisponible' ('transport') ; credits.restant < 2 → 'ferme' ('credits') ; sinon −2 crédits,
//        firecrawl.chercher(question TELLE QUELLE, jamais augmentée d'un extrait : seul du public part au web), puis
//        firecrawl.lire des 3 premières url au plus (−1 crédit chacune, tant que la réserve et la place sous 8 le
//        permettent) ; page complète → { origine: 'web', extrait (600), source: { url, url_finale, lu_le: horodatage,
//        methode, robots } } ; une exception ou un refus du transport ne remonte jamais.
//     4. Perplexity, seulement si Firecrawl n'a rendu aucune page : deps.perplexity présent, interrupteurs.perplexity
//        allumé, reglages.perplexity.plan non vide, cout_par_requete_eur === 0, constate_le entre maintenant − 30 j et
//        maintenant, compteurs.perplexity < 5 → UN appel (question telle quelle), compteurs.perplexity + 1 ; chaque
//        citation → { origine: 'perplexity', extrait: réponse (600), source: { url, lu_le, via: 'perplexity' } }.
//        compteurs['web:<agent>'] + 1, une fois, dès qu'un appel fait une requête web ; web = { etat ('fait' dès qu'une
//        requête est partie), raison?, credits (consommés par cet appel), requetes (Firecrawl et Perplexity) }.
//     5. rend { id, agent, question_sha256 (sha256 hexadécimal de la question reçue), resultats (8 au plus en tout), web,
//        refus? }.
//     6. UN deps.journal({ type: 'savoir_recherche', objet: 'recherche:<id>', resume }) par appel, ces trois clés seules,
//        resume = `<n> résultat(s) · savoir <a> · web <b> · <c> crédit(s)` (+ ` · refus <refus>`), b = web + perplexity,
//        c = web.credits ; jamais la question, un extrait, une clé ni un jeton.
//   · avecRecherche(lecteur, agent, deps) → Lecteur (systeme, donnees) : si la réponse du modèle porte besoins_recherche
//     (tableau de chaînes, ou chaîne JSON qui le porte), les 2 premiers sont cherchés par chercher({ agent, question,
//     web: agent ∈ RECHERCHE_WEB_DE }, deps), puis le lecteur est rappelé UNE fois avec { ...donnees, resultats_recherche:
//     [{ question, resultats, refus? }] } et sa réponse est rendue telle quelle (ses besoins_recherche sont ignorés) ;
//     sans besoin, la première réponse est rendue telle quelle.
// CLI    node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/savoir/chercher.mjs --agent=<nom>
//        --question=<texte> [--web] [--base=https://prestiapp.fr] [--racine-travail=/home/agents/travail/savoir]
//        [--sortie=<fichier>] [--reglages=<dépôt>/docs/savoir/reglages.json]
//   --base : https, ou http vers 127.0.0.1, localhost ou [::1] seulement, sinon code 2 ; jeton PRESTI_JETON_<AGENT> absent
//   → code 2 ; dans les deux cas, rien d'autre (aucune requête, aucun fichier). Savoir : les index de
//   <racine-travail>/index/<compartiment>/ (écrits par scripts/savoir/indexer.mjs, lus par chercherIndex de
//   lib/savoir/index.ts), `general` toujours, `prospects` seulement si classesPour(agent, MOTEUR_DE) le contient ; chemin
//   d'index « racine:chemin » → source { racine, chemin } ; le fichier est RELU dans
//   <racine-travail>/<compartiment>/courant/fichiers/<racine>/<chemin> : absent, ou lignes debut–fin qui ne portent plus
//   le texte → résultat jeté ; sha256 = empreinte du fichier relu ; synchronise_le = celui de index/<c>/etat.json. Noms des
//   prospects (pour le refus, pour tous les agents, en mémoire seulement) : les valeurs des clés « entreprise » des
//   .json/.jsonl de <racine-travail>/prospects/courant/fichiers/. Journal : POST <base>/api/agents/evenements,
//   Authorization: Bearer <jeton>, corps JSON { type, objet, resume } ; non 2xx ou injoignable → code 3. Succès (code 0) :
//   le retour de chercher() en JSON dans --sortie (sinon sur la sortie standard) ; une ligne { le, id, agent,
//   question_sha256, n, origines: { savoir, web, perplexity }, credits, refus } dans <racine-travail>/recherches-<jour>.jsonl ;
//   une ligne { le, evenement: 'savoir recherche', agent, id, n, origines, web: <etat>, credits, code: 0 } au journal du
//   chef <racine-travail>/../chef/cycles.jsonl (ce que lit `presti-journal chef`, SVR-R2) ; compteurs du jour
//   <racine-travail>/compteurs-<jour>.json ; réserve <racine-travail>/credits-firecrawl.json ({ consommes }, restant =
//   reglages.firecrawl.reserve_credits − consommes), sérialisée par un verrou O_EXCL. Jamais la question, un extrait, une
//   clé ni un jeton dans ces fichiers. Hôtes nommés : 127.0.0.1, localhost, [::1], prestiapp.fr, api.firecrawl.dev,
//   api.perplexity.ai [à vérifier : hôtes exacts des deux API le jour de 026-233].
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const NOM = 'savoir-recherche-qa'
const ICI = path.dirname(fileURLToPath(import.meta.url))
const DEPOT = path.resolve(ICI, '..')
const FIX = path.join(ICI, 'fixtures', '026', 'savoir', 'recherche')
const TEMOIN_SRC = path.join(FIX, 'temoin')
const SABOTAGES_SRC = path.join(FIX, 'sabotages.json')
const ESSAIS_SRC = path.join(FIX, 'essais.json')
const NOMS_SRC = path.join(FIX, 'noms-prospects.json')
const CORPUS_SRC = path.join(FIX, 'corpus.json')
const SONDE_SRC = path.join(FIX, 'sonde-outil.mjs')
const FAUX_BUS = path.join(FIX, 'faux-bus.mjs')
const SOCLE = path.join(ICI, 'fixtures', '026', 'savoir', 'socle')
const SOCLE_TEMOIN = path.join(SOCLE, 'temoin')
const ESPION_RESEAU = path.join(SOCLE, 'espion-reseau.mjs')
const TS_LOADER = path.join(DEPOT, 'scripts', 'ts-loader.mjs')
const TSC = path.join(DEPOT, 'node_modules', 'typescript', 'bin', 'tsc')
const TRAVAIL = path.join(DEPOT, '.orchestre', 'travail', NOM)
const ESSAIS = path.join(TRAVAIL, 'e')
const PREUVES = path.join(DEPOT, '.orchestre', 'preuves', '026-232')
const WIN = process.platform === 'win32'

const GROUPES = ['outil', 'cli']
const SVR_DE_GROUPE = { outil: ['SVR-2', 'SVR-4', 'SVR-5', 'SVR-6', 'SVR-7', 'SVR-8', 'SVR-9', 'SVR-11'], cli: ['SVR-3', 'SVR-6', 'SVR-7', 'SVR-10', 'SVR-11'] }
const ORDRE = ['SVR-1', 'SVR-2', 'SVR-3', 'SVR-4', 'SVR-5', 'SVR-6', 'SVR-7', 'SVR-8', 'SVR-9', 'SVR-10', 'SVR-11', 'SVR-12']
const PREMIER_ECHEC_ATTENDU = 'SVR-1'
const CHEMINS = { module: 'lib/savoir/recherche.ts', cli: 'scripts/savoir/chercher.mjs', index: 'lib/savoir/index.ts', indexer: 'scripts/savoir/indexer.mjs' }
const PLAFONDS_ATTENDUS = { questionSignes: [3, 300], resultats: 8, extraitSignes: 600, savoirParAgentEtJour: 200, webParAgentEtJour: 10, pagesWebParRecherche: 3, perplexityParJour: 5, perplexityParRecherche: 1, besoinsParReponse: 2, relances: 1, creditsParLecture: 1, creditsParRecherche: 2 }
const WEB_DE_ATTENDU = ['chef', 'douleurs', 'redacteur_site', 'studio']
const EXPORTS_ATTENDUS = ['PLAFONDS_RECHERCHE', 'RECHERCHE_WEB_DE', 'SEUIL_SAVOIR', 'classesPour', 'refusDonneePersonnelle', 'chercher', 'avecRecherche']
const HOTES_PERMIS = ['127.0.0.1', 'localhost', '[::1]', 'prestiapp.fr', 'api.firecrawl.dev', 'api.perplexity.ai']
const CLES_EVENEMENT = ['objet', 'resume', 'type']
const CLES_LIGNE = ['agent', 'credits', 'id', 'le', 'n', 'origines', 'question_sha256', 'refus']
const RE_RESUME = /^(\d+) résultat\(s\) · savoir (\d+) · web (\d+) · (\d+) crédit\(s\)/

// ── petites mains ─────────────────────────────────────────────────────────────────────────────────────────────
const lire = (p) => fs.readFileSync(p, 'utf8')
const existe = (p) => fs.existsSync(p)
const lireJSON = (p) => JSON.parse(lire(p))
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex')
const rel = (p) => path.relative(DEPOT, p).split(path.sep).join('/')
const cle = (p) => { const r = path.resolve(String(p)); return WIN ? r.toLowerCase() : r }
const court = (s, n = 240) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t }
const nettoyer = (p) => fs.rmSync(p, { recursive: true, force: true, maxRetries: 3 })
function ecrire(p, contenu) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, contenu) }
function lireJournal(f) {
  if (!existe(f)) return []
  return lire(f).split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return { illisible: l } } })
}
const attendre = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
const estDate = (s) => typeof s === 'string' && Number.isFinite(Date.parse(s))
const estUrl = (s) => { if (typeof s !== 'string') return false; try { return ['http:', 'https:'].includes(new URL(s).protocol) } catch { return false } }
const nonVide = (s) => typeof s === 'string' && s.trim().length > 0
function canon(v) {
  if (Array.isArray(v)) return v.map(canon)
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])]))
  return v
}
const egal = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b))
const memeEnsemble = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && JSON.stringify([...a].sort()) === JSON.stringify([...b].sort())
function res(id, detail) { return { id, ok: detail.length === 0, detail } }
let ES_CACHE = null
const essais = () => (ES_CACHE ??= lireJSON(ESSAIS_SRC))
const noms = () => lireJSON(NOMS_SRC).noms
const corpus = () => lireJSON(CORPUS_SRC)
const importer = (p) => ['--import', pathToFileURL(p).href]
function lister(dossier) {
  const out = []
  const rec = (d) => {
    let entrees
    try { entrees = fs.readdirSync(d, { withFileTypes: true }) } catch { return }
    for (const e of entrees) { const p = path.join(d, e.name); if (e.isDirectory()) rec(p); else out.push(p) }
  }
  rec(dossier)
  return out.sort()
}
/** Tous les extraits (objets qui portent `extrait`) d'une valeur, à toute profondeur. */
function extraitsDe(v, out = []) {
  if (Array.isArray(v)) v.forEach((x) => extraitsDe(x, out))
  else if (v && typeof v === 'object') { if ('extrait' in v) out.push(v); for (const x of Object.values(v)) extraitsDe(x, out) }
  return out
}
function sentinellesToutes() { return Object.values(essais().sentinelles) }
function sentinellesCles() { const S = essais().sentinelles; return [S.firecrawl, S.perplexity, S.jeton_chef, S.jeton_facteur, S.jeton_douleurs] }

// Les réglages d'essai, à la forme de docs/savoir/reglages.json (026-229) : seul ce qui est nommé est allumé.
function reglagesDe(v = {}) {
  const inter = (actif) => (actif ? { actif: true, depuis: '2026-09-27', accord: 'sans accord requis : essai du juge savoir-recherche-qa' } : { actif: false, depuis: null, accord: null })
  return {
    version: 1,
    interrupteurs: { envoi: inter(false), semantique: inter(false), recherche_web: inter(!!v.recherche_web), perplexity: inter(!!v.perplexity), lecons_dans_consignes: inter(false), bilan_quotidien: inter(false) },
    semantique: { url: 'http://127.0.0.1:11434', modele: null },
    firecrawl: { reserve_credits: 1000, source: 'essai du juge savoir-recherche-qa', solde_constate: null },
    perplexity: { plan: v.plan ?? null, cout_par_requete_eur: v.cout ?? null, source: v.plan ? 'essai du juge savoir-recherche-qa' : null, constate_le: v.constate_le ?? null },
  }
}

// ── environnement des enfants : aucune vraie clé, aucun jeton réel ─────────────────────────────────────────────────
let ENV_BASE = null
function envBase() {
  if (ENV_BASE) return ENV_BASE
  const env = { ...process.env }
  for (const k of Object.keys(env)) if (/^(PRESTI_JETON_|FIRECRAWL|PERPLEXITY|SUPABASE|NEXT_PUBLIC_SUPABASE|SAVOIR_ESPION|SONDE_|FAUX_BUS|NODE_OPTIONS$)/i.test(k)) delete env[k]
  return (ENV_BASE = env)
}
/** Lance `node <args>` (jamais un shell), sortie en texte, délai borné. */
function noeud(args, { cwd = DEPOT, env = {}, timeout = 240000 } = {}) {
  const r = spawnSync(process.execPath, args, { cwd, env: { ...envBase(), ...env }, timeout, maxBuffer: 256 * 1024 * 1024, windowsHide: true })
  const sortie = r.stdout ? r.stdout.toString('utf8') : ''
  const erreur = r.stderr ? r.stderr.toString('utf8') : ''
  const delai = r.error?.code === 'ETIMEDOUT'
  return { code: delai ? 124 : (r.status ?? (r.error ? 127 : 1)), sortie, erreur, tout: `${sortie}\n${erreur}`, delai }
}

// ── critères de source ────────────────────────────────────────────────────────────────────────────────────────
function sourceSavoirComplete(s) {
  return !!s && typeof s === 'object' && nonVide(s.racine) && nonVide(s.chemin) && Number.isInteger(s.debut) && Number.isInteger(s.fin) &&
    s.debut >= 1 && s.fin >= s.debut && ['public', 'interne', 'prospects'].includes(s.classe) && /^[0-9a-f]{64}$/.test(String(s.sha256 || '')) && estDate(s.synchronise_le)
}
const sourceWebComplete = (s) => !!s && estUrl(s.url) && estUrl(s.url_finale) && estDate(s.lu_le) && nonVide(s.methode) && nonVide(s.robots)
const sourcePxComplete = (s) => !!s && estUrl(s.url) && estDate(s.lu_le) && s.via === 'perplexity'
function sourceComplete(r) {
  if (r?.origine === 'savoir') return sourceSavoirComplete(r.source)
  if (r?.origine === 'web') return sourceWebComplete(r.source)
  if (r?.origine === 'perplexity') return sourcePxComplete(r.source)
  return false
}
const resultatsDe = (x) => (Array.isArray(x?.retour?.resultats) ? x.retour.resultats : [])

// ═══════════════════════════════════════════ partie « outil » : la sonde ═══════════════════════════════════════════
function scenarios(ES) {
  const Q = ES.questions
  const R = (nom) => reglagesDe(ES.reglages[nom])
  const base = { fn: 'chercher', credits: 1000, compteurs: {}, firecrawl: 'normal', perplexity: 'normal', savoir: 'fort', reglages: R('web_perplexity_ok') }
  const ch = (nom, demande, x = {}) => ({ ...base, nom, demande, ...x })
  const faible = (nom, x = {}, agent = 'chef') => ch(nom, { agent, question: Q.faible, web: true }, { savoir: 'faible', reglages: R('web'), ...x })
  const px = (nom, reglages, x = {}) => ch(nom, { agent: 'chef', question: Q.faible, web: true }, { savoir: 'faible', firecrawl: 'vide', reglages: R(reglages), ...x })
  const systeme = 'SYSTEME-ESSAI : consigne du modèle d’essai.'
  const donnees = { mission: 'bilan', n: 3 }
  const reponses = [{ besoins_recherche: [...ES.besoins], brouillon: 'premier jet' }, { besoins_recherche: [ES.besoin_seconde_reponse], texte: 'réponse finale' }]
  const avec = (nom, agent, x = {}) => ({ ...base, fn: 'avecRecherche', nom, agent, systeme, donnees, reponses, reglages: R('eteint'), ...x })
  return [
    ch('s2_fort_chef', { agent: 'chef', question: Q.fort, web: true }),
    ch('s2_trop_court', { agent: 'chef', question: Q.trop_court, web: true }),
    ch('s2_trop_long', { agent: 'chef', question: 'Une question beaucoup trop longue pour la recherche. '.repeat(7), web: true }),
    ch('s2_plafond_savoir', { agent: 'chef', question: Q.fort }, { compteurs: { 'savoir:chef': 200 } }),
    faible('s4_web'),
    faible('s4_deux_faibles', { savoir: 'deux_faibles' }),
    faible('s4_credits_1', { credits: 1 }),
    faible('s4_interrupteur', { reglages: R('eteint') }),
    faible('s4_facteur', {}, 'facteur'),
    faible('s4_plafond_web', { compteurs: { 'web:chef': 10 } }),
    faible('s4_sans_transport', { firecrawl: 'absent' }),
    faible('s4_panne', { firecrawl: 'panne' }),
    px('s5_eteint', 'web_perplexity_eteint'),
    px('s5_sans_plan', 'web_perplexity_sans_plan'),
    px('s5_cout_inconnu', 'web_perplexity_cout_inconnu'),
    px('s5_cout_positif', 'web_perplexity_cout_positif'),
    px('s5_perime', 'web_perplexity_perime'),
    px('s5_ok', 'web_perplexity_ok'),
    px('s5_plafond', 'web_perplexity_ok', { compteurs: { perplexity: 5 } }),
    px('s5_firecrawl_rend', 'web_perplexity_ok', { firecrawl: 'normal' }),
    px('s5_absent', 'web_perplexity_ok', { perplexity: 'absent' }),
    ...['adresse', 'numero', 'numero_international', 'siren', 'nom_prospect', 'nom_prospect_casse'].map((k) => ch(`s6_${k}`, { agent: 'chef', question: Q[k], web: true }, { savoir: 'faible' })),
    ch('s7_douleurs', { agent: 'douleurs', question: Q.fort }),
    ch('s7_douleurs_elargi', { agent: 'douleurs', question: Q.fort, classes: ['public', 'interne', 'prospects'] }),
    ch('s7_facteur', { agent: 'facteur', question: Q.fort }),
    ch('s7_inconnu', { agent: 'inconnu_essai', question: Q.fort }),
    ch('s7_gratuit_perso', { agent: 'essai_gratuit_perso', question: Q.fort }),
    ch('s7_chef_restreint', { agent: 'chef', question: Q.fort, classes: ['public'] }),
    ch('s7_chef_elargi', { agent: 'chef', question: Q.fort, classes: ['public', 'interne', 'prospects'] }),
    avec('s9_chef', 'chef'),
    avec('s9_douleurs', 'douleurs'),
    avec('s9_sans_besoin', 'chef', { reponses: [{ texte: 'réponse directe, sans besoin' }] }),
    avec('s9_chef_web', 'chef', { savoir: 'faible', reglages: R('web') }),
    avec('s9_facteur_web', 'facteur', { savoir: 'faible', reglages: R('web') }),
    ch('s11_pannes', { agent: 'chef', question: Q.faible, web: true }, { savoir: 'faible', firecrawl: 'panne', perplexity: 'panne' }),
  ]
}
function lancerSonde(ctx) {
  if (ctx.sonde !== undefined) return ctx.sonde
  const mod = path.join(ctx.racine, CHEMINS.module)
  if (!existe(mod)) return (ctx.sonde = { absent: true })
  const d = path.join(ctx.e, 'outil')
  nettoyer(d)
  const ES = essais()
  const entree = { essais: ES, noms: noms(), scenarios: ctx.parties.has('outil') ? scenarios(ES) : [] }
  const pEntree = path.join(d, 'entree.json')
  const pSortie = path.join(d, 'sortie.json')
  const pEspion = path.join(d, 'espion-reseau.jsonl')
  ecrire(pEntree, JSON.stringify(entree))
  const r = noeud(['--experimental-strip-types', ...importer(TS_LOADER), ...importer(ESPION_RESEAU), SONDE_SRC], { cwd: ctx.racine, env: { SONDE_ENTREE: pEntree, SONDE_MODULE: mod, SONDE_SORTIE: pSortie, SAVOIR_ESPION_RESEAU: pEspion }, timeout: 300000 })
  let S = null
  try { S = lireJSON(pSortie) } catch { S = null }
  if (S) S.parNom = Object.fromEntries((S.scenarios || []).map((x) => [x.nom, x]))
  return (ctx.sonde = { S, r, reseau: lireJournal(pEspion) })
}
function outil(ctx) {
  const o = lancerSonde(ctx)
  if (o.absent) return { faute: `${CHEMINS.module} absent de la racine jugée — l'outil de recherche n'est pas encore écrit` }
  if (!o.S) return { faute: `sonde : aucune sortie (code ${o.r.code}) — ${court(o.r.tout, 200)}` }
  const imp = (o.S.erreurs || []).find((e) => e.startsWith('import du module'))
  if (imp) return { faute: court(imp, 240) }
  return { S: o.S }
}
function scen(S, nom, f) {
  const x = S.parNom?.[nom]
  if (!x) { f.push(`scénario ${nom} absent de la sonde`); return null }
  if (x.erreur) f.push(`${nom} : exception — ${court(x.erreur, 160)}`)
  return x.erreur ? null : x
}
const requetesWeb = (x) => x.fc.chercher.length + x.fc.lire.length + x.px.length

// ═══════════════════════════════════════════ partie « cli » : la ligne de commande ══════════════════════════════════
function lancerBus(dossier, mode) {
  const journal = path.join(dossier, `faux-bus-${mode}.jsonl`)
  const port = path.join(dossier, `faux-bus-${mode}.port`)
  const enfant = spawn(process.execPath, [FAUX_BUS], { env: { ...envBase(), FAUX_BUS_JOURNAL: journal, FAUX_BUS_PORT: port, FAUX_BUS_MODE: mode }, stdio: 'ignore', windowsHide: true })
  for (let i = 0; i < 100 && !(existe(port) && lire(port).trim()); i++) attendre(100)
  const p = existe(port) ? Number(lire(port).trim()) : 0
  return { journal, port: p, arreter: () => { try { enfant.kill() } catch { /* déjà mort */ } } }
}
function lignesRecherches(rt) {
  let fichiers = []
  try { fichiers = fs.readdirSync(rt).filter((n) => /^recherches-.*\.jsonl$/.test(n)).sort() } catch { return [] }
  return fichiers.flatMap((n) => lireJournal(path.join(rt, n)))
}
/** Durci le 28/09 (026-232, majeur latent) : compteurs-<jour>.json de <racine-travail>, ou null si absent/illisible. */
function compteursDuJour(rt) {
  let fichiers = []
  try { fichiers = fs.readdirSync(rt).filter((n) => /^compteurs-\d{4}-\d{2}-\d{2}\.json$/.test(n)).sort() } catch { return null }
  if (!fichiers.length) return null
  try { return lireJSON(path.join(rt, fichiers.at(-1))) } catch { return null }
}
function ecrireCorpus(rt, C) {
  const man = {}
  for (const c of ['general', 'prospects']) {
    const docs = C.documents.filter((d) => d.compartiment === c)
    const dir = path.join(rt, c, 'courant')
    const fichiers = docs.map((d) => {
      const b = Buffer.from(`${d.lignes.join('\n')}\n`)
      ecrire(path.join(dir, 'fichiers', d.racine, ...d.chemin.split('/')), b)
      man[`${d.racine}:${d.chemin}`] = { compartiment: c, classe: d.classe }
      return { racine: d.racine, chemin: d.chemin, classe: d.classe, sha256: sha256(b), octets: b.length, caviardages: 0, reclasse: false }
    })
    const nP = C.documents.filter((d) => d.compartiment === 'prospects').length
    ecrire(path.join(dir, 'manifeste.json'), JSON.stringify({ version: 1, compartiment: c, exporte_le: C.exporte_le, fichiers, non_lus: [], ...(c === 'general' ? { prospects_compte: nP } : {}) }, null, 2))
  }
  ecrire(path.join(rt, 'a-indexer'), JSON.stringify({ recu_le: C.exporte_le }))
  return man
}
const fichierCorpus = (rt, man, cleDoc) => { const [r, ...reste] = cleDoc.split(':'); return path.join(rt, man[cleDoc].compartiment, 'courant', 'fichiers', r, ...reste.join(':').split('/')) }
function lancerCli(ctx) {
  if (ctx.cli !== undefined) return ctx.cli
  const script = path.join(ctx.racine, CHEMINS.cli)
  if (!existe(script)) return (ctx.cli = { faute: `${CHEMINS.cli} absent de la racine jugée — la ligne de commande n'est pas encore écrite` })
  const indexeur = path.join(ctx.racine, CHEMINS.indexer)
  if (!existe(indexeur)) return (ctx.cli = { faute: `${CHEMINS.indexer} absent de la racine jugée : les index du corpus d'essai ne peuvent pas être construits (026-231)` })
  const d = path.join(ctx.e, 'cli')
  nettoyer(d)
  const rt = path.join(d, 'travail', 'savoir')
  const C = corpus()
  const man = ecrireCorpus(rt, C)
  const pReglages = path.join(d, 'reglages-eteint.json')
  ecrire(pReglages, JSON.stringify(reglagesDe({}), null, 2))
  const ix = noeud(['--experimental-strip-types', ...importer(TS_LOADER), indexeur, '--compartiment=tous', `--racine-travail=${rt}`, `--reglages=${pReglages}`], { cwd: ctx.racine, timeout: 180000 })
  if (ix.code !== 0 || !existe(path.join(rt, 'index', 'general', 'etat.json'))) return (ctx.cli = { faute: `indexeur de la racine jugée sur le corpus d'essai : code ${ix.code} — ${court(ix.tout, 200)}` })
  // Après l'indexation : un fichier retiré, un fichier décalé de deux lignes (ses passages indexés ne sont plus vrais).
  fs.rmSync(fichierCorpus(rt, man, C.retire_apres_index), { force: true })
  const pDecale = fichierCorpus(rt, man, C.decale_apres_index)
  fs.writeFileSync(pDecale, `Ligne ajoutée après l’indexation.\nSeconde ligne ajoutée après l’indexation.\n${lire(pDecale)}`)
  const S = essais().sentinelles
  const bus = lancerBus(d, 'accepte')
  const busRefus = lancerBus(d, 'refuse')
  try {
    if (!bus.port || !busRefus.port) return (ctx.cli = { faute: 'faux bus : aucun port (serveur d’essai non démarré)' })
    const jetons = { PRESTI_JETON_CHEF: S.jeton_chef, PRESTI_JETON_FACTEUR: S.jeton_facteur, PRESTI_JETON_DOULEURS: S.jeton_douleurs, FIRECRAWL_API_KEY: S.firecrawl, PERPLEXITY_API_KEY: S.perplexity }
    const { PRESTI_JETON_CHEF: _jc, ...sansJetonChef } = jetons
    const cas = {}
    // `reussite` : le cas doit rendre 0. Un code 3 (bus injoignable) sur un tel cas se rejoue UNE fois, à neuf : le
    // 28/09, le témoin a vu une fois le faux bus local injoignable sous la charge du PC (rouge de charge, pas un défaut) ;
    // un outil qui ne joint jamais le bus reste rouge au rejeu. Les relevés du cas sont ceux de la dernière tentative.
    const jouer = (nom, { agent, question, web = false, base = `http://127.0.0.1:${bus.port}`, env = jetons, reussite = true }) => {
      const sortie = path.join(d, 'sorties', `${nom}.json`)
      const espion = path.join(d, `espion-${nom}.jsonl`)
      fs.mkdirSync(path.dirname(sortie), { recursive: true })
      for (let tentative = 1; tentative <= 2; tentative++) {
        fs.rmSync(sortie, { force: true })
        fs.rmSync(espion, { force: true })
        const avant = { bus: lireJournal(bus.journal).length, refus: lireJournal(busRefus.journal).length, lignes: lignesRecherches(rt).length }
        const args = ['--experimental-strip-types', ...importer(TS_LOADER), ...importer(ESPION_RESEAU), script, `--agent=${agent}`, `--question=${question}`, ...(web ? ['--web'] : []), `--base=${base}`, `--racine-travail=${rt}`, `--sortie=${sortie}`, `--reglages=${pReglages}`]
        const r = noeud(args, { cwd: ctx.racine, env: { ...env, SAVOIR_ESPION_RESEAU: espion }, timeout: 120000 })
        const brut = existe(sortie) ? lire(sortie) : null
        let X = null
        try { X = brut ? JSON.parse(brut) : null } catch { X = null }
        cas[nom] = { nom, agent, question, web, r, brut, X, tentative, reseau: lireJournal(espion), bus: lireJournal(bus.journal).slice(avant.bus), busRefus: lireJournal(busRefus.journal).slice(avant.refus), lignes: lignesRecherches(rt).slice(avant.lignes) }
        if (!(reussite && r.code === 3 && tentative === 1)) break
        attendre(2000)
      }
    }
    jouer('chef', { agent: 'chef', question: C.questions.chef })
    jouer('cadre', { agent: 'chef', question: C.questions.cadre })
    jouer('retire', { agent: 'chef', question: C.questions.retire })
    jouer('modifie', { agent: 'chef', question: C.questions.modifie })
    jouer('facteur', { agent: 'facteur', question: C.questions.chef })
    jouer('douleurs', { agent: 'douleurs', question: C.questions.chef })
    jouer('nom_web', { agent: 'chef', question: C.questions.nom_prospect_web, web: true })
    jouer('sans_jeton', { agent: 'chef', question: C.questions.chef, env: sansJetonChef, reussite: false })
    jouer('base_distante', { agent: 'chef', question: C.questions.chef, base: `http://10.20.30.40:${bus.port}`, reussite: false })
    jouer('base_trompeuse', { agent: 'chef', question: C.questions.chef, base: `http://127.0.0.1.nip.io:${bus.port}`, reussite: false })
    jouer('bus_refuse', { agent: 'chef', question: C.questions.chef, base: `http://127.0.0.1:${busRefus.port}`, reussite: false })
    ctx.cli = { cas, rt, d, man, C, port: bus.port, journaux: [bus.journal, busRefus.journal] }
  } finally { bus.arreter(); busRefus.arreter() }
  return ctx.cli
}
function cli(ctx) {
  const c = lancerCli(ctx)
  return c.faute ? { faute: c.faute } : c
}
const SUCCES_CLI = ['chef', 'cadre', 'retire', 'modifie', 'facteur', 'douleurs', 'nom_web']
function casOk(c, nom, f) {
  const x = c.cas[nom]
  if (!x) { f.push(`cas ${nom} non joué`); return null }
  if (x.r.code !== 0) { f.push(`${nom} : code ${x.r.code} (attendu 0) — ${court(x.r.tout, 160)}`); return null }
  if (!x.brut || !x.brut.trim()) { f.push(`${nom} : --sortie vide ou absente (une sortie vide est refusée)`); return null }
  if (!x.X || !Array.isArray(x.X.resultats)) { f.push(`${nom} : --sortie illisible ou sans resultats`); return null }
  return x
}
/** Chaque extrait `savoir` se retrouve mot pour mot dans les lignes debut–fin du fichier cité, relu par le juge. */
function verifierSourcesCli(c, x, f) {
  for (const r of x.X.resultats.filter((y) => y.origine === 'savoir')) {
    const s = r.source
    if (!sourceSavoirComplete(s)) { f.push(`${x.nom} : source incomplète — ${court(JSON.stringify(s), 120)}`); continue }
    const cleDoc = `${s.racine}:${s.chemin}`
    if (!c.man[cleDoc]) { f.push(`${x.nom} : ${cleDoc} n'est pas un fichier du corpus (source inventée)`); continue }
    const p = fichierCorpus(c.rt, c.man, cleDoc)
    if (!existe(p)) { f.push(`${x.nom} : ${cleDoc} est cité mais n'existe plus (retiré après l'indexation) — source non vérifiable`); continue }
    const b = fs.readFileSync(p)
    const lignes = b.toString('utf8').split('\n')
    if (typeof r.extrait !== 'string' || !r.extrait.trim()) f.push(`${x.nom} : extrait vide (${cleDoc})`)
    else if (s.fin > lignes.length || !lignes.slice(s.debut - 1, s.fin).join('\n').includes(r.extrait)) f.push(`${x.nom} : l'extrait cité en ${cleDoc} lignes ${s.debut}–${s.fin} ne s'y retrouve pas mot pour mot (fichier relu par le juge)`)
    if (typeof r.extrait === 'string' && r.extrait.length > 600) f.push(`${x.nom} : extrait de ${r.extrait.length} signes (600 au plus)`)
    if (s.sha256 !== sha256(b)) f.push(`${x.nom} : sha256 de ${cleDoc} ≠ empreinte du fichier relu`)
    if (s.classe !== c.man[cleDoc].classe) f.push(`${x.nom} : classe ${s.classe} pour ${cleDoc} (le manifeste dit ${c.man[cleDoc].classe})`)
    if (s.synchronise_le !== c.C.exporte_le) f.push(`${x.nom} : synchronise_le ${s.synchronise_le} (attendu ${c.C.exporte_le}, celui de l'index)`)
  }
}
const reseauAutre = (x, port) => x.reseau.filter((e) => e.op !== 'ipc' && (!['127.0.0.1', 'localhost', '::1', '[::1]'].includes(String(e.hote).toLowerCase()) || Number(e.port) !== port))

// ═══════════════════════════════════════════ les critères ═══════════════════════════════════════════════════════
function svr1(ctx) {
  const mod = path.join(ctx.racine, CHEMINS.module)
  if (!existe(mod)) return res('SVR-1', [`${CHEMINS.module} absent de la racine jugée — le module n'existe pas encore (026-233)`])
  const o = lancerSonde(ctx)
  if (!o.S) return res('SVR-1', [`sonde : aucune sortie (code ${o.r.code}) — ${court(o.r.tout, 200)}`])
  const f = []
  for (const e of o.S.erreurs || []) f.push(court(e, 200))
  const S = o.S
  for (const n of EXPORTS_ATTENDUS) if (!(S.exports || []).includes(n)) f.push(`export manquant : ${n}`)
  for (const n of ['classesPour', 'refusDonneePersonnelle', 'chercher', 'avecRecherche']) if (S.types?.[n] && S.types[n] !== 'function') f.push(`${n} n'est pas une fonction`)
  if (S.plafonds) {
    if (!egal(S.plafonds.valeur, PLAFONDS_ATTENDUS)) f.push(`PLAFONDS_RECHERCHE : ${court(JSON.stringify(S.plafonds.valeur), 200)} (attendu ${JSON.stringify(PLAFONDS_ATTENDUS)})`)
    if (!S.plafonds.gele) f.push('PLAFONDS_RECHERCHE n’est pas gelé en profondeur')
  }
  if (S.webDe) {
    if (JSON.stringify(S.webDe.valeur) !== JSON.stringify(WEB_DE_ATTENDU)) f.push(`RECHERCHE_WEB_DE : ${JSON.stringify(S.webDe.valeur)} (attendu exactement ${JSON.stringify(WEB_DE_ATTENDU)})`)
    if (!S.webDe.gele) f.push('RECHERCHE_WEB_DE n’est pas gelé')
  }
  if (!(Number.isFinite(S.seuil) && S.seuil > 0)) f.push(`SEUIL_SAVOIR : ${JSON.stringify(S.seuil)} (attendu un nombre > 0)`)
  return res('SVR-1', f)
}

function svr2(ctx) {
  const O = outil(ctx)
  if (O.faute) return res('SVR-2', [O.faute])
  const { S } = O
  const ES = essais()
  const f = []
  const x = scen(S, 's2_fort_chef', f)
  if (x) {
    const R = resultatsDe(x)
    if (requetesWeb(x)) f.push(`savoir bien servi, web: true : ${x.fc.chercher.length} recherche(s) Firecrawl, ${x.fc.lire.length} lecture(s), ${x.px.length} appel(s) Perplexity reçus (attendu aucun : le savoir d'abord)`)
    if (x.credits !== 1000) f.push(`savoir bien servi : réserve ${x.credits} (attendu 1000, rien consommé)`)
    if (R.length < 2) f.push(`savoir bien servi : ${R.length} résultat(s) (le faux savoir en sert 12 valides au chef ; attendu 2 à 8)`)
    if (R.length > 8) f.push(`${R.length} résultats (8 au plus)`)
    for (const r of R) {
      if (r.origine !== 'savoir') f.push(`résultat d'origine ${r.origine} alors que le savoir suffit`)
      if (!sourceSavoirComplete(r.source)) { f.push(`résultat sans source complète : ${court(JSON.stringify(r.source), 140)}`); continue }
      const servi = x.servis.find((s) => s.source && s.source.racine === r.source.racine && s.source.chemin === r.source.chemin && s.source.debut === r.source.debut)
      if (!servi) { f.push(`source ${r.source.racine}:${r.source.chemin} inconnue du faux savoir (inventée)`); continue }
      if (!egal(servi.source, r.source)) f.push(`source de ${r.source.chemin} modifiée : ${court(JSON.stringify(r.source), 140)}`)
      if (typeof r.extrait !== 'string' || !r.extrait || !servi.texte.includes(r.extrait)) f.push(`extrait de ${r.source.chemin} absent du texte servi par le savoir`)
      if (typeof r.extrait === 'string' && r.extrait.length > 600) f.push(`extrait de ${r.extrait.length} signes pour ${r.source.chemin} (600 au plus)`)
    }
    const brut = JSON.stringify(x.retour)
    for (const m of ES.marqueurs_jetes) if (brut.includes(m)) f.push(`le résultat « ${m} » (source absente, incomplète, bornes ou classe invalides) est rendu`)
    if (x.retour?.question_sha256 !== sha256(ES.questions.fort)) f.push(`question_sha256 ${JSON.stringify(x.retour?.question_sha256)} ≠ sha256 de la question`)
    if (x.retour?.agent !== 'chef') f.push(`agent ${JSON.stringify(x.retour?.agent)} (attendu "chef")`)
    if (typeof x.retour?.id !== 'string' || !/^[A-Za-z0-9_.:-]{6,80}$/.test(x.retour.id)) f.push(`id ${JSON.stringify(x.retour?.id)} (attendu 6 à 80 signes [A-Za-z0-9_.:-])`)
    if (x.savoir.length !== 1 || x.savoir[0]?.question !== ES.questions.fort) f.push(`deps.savoir appelé ${x.savoir.length} fois (attendu une fois, avec la question telle quelle)`)
    if (x.compteurs?.['savoir:chef'] !== 1) f.push(`compteurs['savoir:chef'] = ${JSON.stringify(x.compteurs?.['savoir:chef'])} après une recherche (attendu 1)`)
  }
  for (const nom of ['s2_trop_court', 's2_trop_long']) {
    const y = scen(S, nom, f)
    if (!y) continue
    if (y.savoir.length || requetesWeb(y)) f.push(`${nom} : question hors bornes [3, 300], et pourtant ${y.savoir.length} appel(s) au savoir et ${requetesWeb(y)} requête(s) web`)
    if (y.retour?.refus !== 'question_hors_bornes') f.push(`${nom} : refus ${JSON.stringify(y.retour?.refus)} (attendu "question_hors_bornes")`)
    if (resultatsDe(y).length) f.push(`${nom} : ${resultatsDe(y).length} résultat(s) rendu(s)`)
  }
  const z = scen(S, 's2_plafond_savoir', f)
  if (z) {
    if (z.savoir.length) f.push('plafond du savoir atteint (200 par agent et par jour) : deps.savoir appelé quand même')
    if (resultatsDe(z).some((r) => r.origine === 'savoir')) f.push('plafond du savoir atteint : des résultats du savoir rendus quand même')
  }
  return res('SVR-2', f)
}

function svr3(ctx) {
  const c = cli(ctx)
  if (c.faute) return res('SVR-3', [c.faute])
  const f = []
  for (const nom of ['chef', 'cadre']) {
    const x = casOk(c, nom, f)
    if (x && !x.X.resultats.some((r) => r.origine === 'savoir')) f.push(`${nom} : aucun extrait du savoir rendu (le corpus d'essai répond à la question)`)
  }
  const retire = casOk(c, 'retire', f)
  const [rR, ...rC] = c.C.retire_apres_index.split(':')
  if (retire && retire.X.resultats.some((r) => r.source?.racine === rR && r.source?.chemin === rC.join(':'))) f.push(`retire : ${c.C.retire_apres_index}, retiré après l'indexation, est encore cité (résultat sans source vérifiable)`)
  casOk(c, 'modifie', f)
  for (const nom of SUCCES_CLI) { const x = c.cas[nom]; if (x?.r.code === 0 && x.X && Array.isArray(x.X.resultats)) verifierSourcesCli(c, x, f) }
  return res('SVR-3', f)
}

function svr4(ctx) {
  const O = outil(ctx)
  if (O.faute) return res('SVR-4', [O.faute])
  const { S } = O
  const ES = essais()
  const Q = ES.questions
  const f = []
  const x = scen(S, 's4_web', f)
  if (x) {
    const R = resultatsDe(x)
    const W = R.filter((r) => r.origine === 'web')
    if (!egal(x.fc.chercher, [Q.faible])) f.push(`savoir faible : recherches Firecrawl reçues ${court(JSON.stringify(x.fc.chercher), 160)} (attendu une seule, la question telle quelle)`)
    if (x.fc.lire.length !== 3) f.push(`savoir faible : ${x.fc.lire.length} lecture(s) Firecrawl reçue(s) (attendu 3 : trois pages au plus, la recherche en rend 5)`)
    for (const u of x.fc.lire) if (!ES.firecrawl.urls.includes(u)) f.push(`lecture d'une adresse que la recherche n'a pas rendue : ${u}`)
    if (x.credits !== 995) f.push(`réserve ${x.credits} après une recherche et trois lectures (attendu 995 : 5 crédits consommés)`)
    if (x.retour?.web?.credits !== 5) f.push(`web.credits ${JSON.stringify(x.retour?.web?.credits)} (attendu 5)`)
    if (x.retour?.web?.requetes !== 4) f.push(`web.requetes ${JSON.stringify(x.retour?.web?.requetes)} (attendu 4 : une recherche, trois lectures)`)
    if (x.retour?.web?.etat !== 'fait') f.push(`web.etat ${JSON.stringify(x.retour?.web?.etat)} (attendu "fait")`)
    if (!W.length) f.push('savoir faible : aucun résultat web rendu')
    for (const r of W) {
      if (!sourceWebComplete(r.source)) f.push(`résultat web sans url, url_finale, lu_le, methode ou robots : ${court(JSON.stringify(r.source), 140)}`)
      if (typeof r.extrait !== 'string' || r.extrait.length > 600 || !(x.pages[r.source?.url] || '').includes(r.extrait)) f.push(`extrait web de ${r.source?.url} : absent de la page lue ou de plus de 600 signes`)
    }
    if (R.length > 8) f.push(`${R.length} résultats (8 au plus)`)
    if (x.compteurs?.['web:chef'] !== 1) f.push(`compteurs['web:chef'] = ${JSON.stringify(x.compteurs?.['web:chef'])} après un appel web (attendu 1)`)
    if (x.px.length) f.push('Perplexity appelé alors que son interrupteur est éteint')
  }
  const y = scen(S, 's4_deux_faibles', f)
  if (y && y.fc.chercher.length !== 1) f.push(`deux résultats, le meilleur sous SEUIL_SAVOIR : ${y.fc.chercher.length} recherche(s) Firecrawl (attendu 1 : le savoir ne suffit pas)`)
  const fermes = [['s4_credits_1', 'réserve à 1 crédit', 'ferme', 'credits'], ['s4_interrupteur', 'recherche_web éteint', 'ferme', 'interrupteur'], ['s4_sans_transport', 'Firecrawl sans transport', 'indisponible', null]]
  for (const [nom, quoi, etat, raison] of fermes) {
    const z = scen(S, nom, f)
    if (!z) continue
    if (requetesWeb(z)) f.push(`${quoi} : ${requetesWeb(z)} requête(s) web reçue(s) (attendu aucune)`)
    if (z.retour?.web?.etat !== etat || (raison && z.retour?.web?.raison !== raison)) f.push(`${quoi} : web ${court(JSON.stringify(z.retour?.web), 120)} (attendu etat "${etat}"${raison ? `, raison "${raison}"` : ''})`)
  }
  const c1 = S.parNom?.s4_credits_1
  if (c1 && !c1.erreur && c1.credits !== 1) f.push(`réserve à 1 crédit : ${c1.credits} après l'appel (rien ne doit être consommé)`)
  for (const [nom, quoi] of [['s4_facteur', 'agent facteur (hors RECHERCHE_WEB_DE)'], ['s4_plafond_web', '11e appel web du jour']]) {
    const z = scen(S, nom, f)
    if (z && requetesWeb(z)) f.push(`${quoi} : ${requetesWeb(z)} requête(s) web reçue(s) (attendu aucune)`)
  }
  scen(S, 's4_panne', f)
  return res('SVR-4', f)
}

function svr5(ctx) {
  const O = outil(ctx)
  if (O.faute) return res('SVR-5', [O.faute])
  const { S } = O
  const ES = essais()
  const f = []
  const fermes = [['s5_eteint', 'interrupteur perplexity éteint'], ['s5_sans_plan', 'plan absent'], ['s5_cout_inconnu', 'coût inconnu'], ['s5_cout_positif', 'coût positif'], ['s5_perime', 'constat de plus de 30 jours'], ['s5_plafond', '6e appel du jour'], ['s5_firecrawl_rend', 'Firecrawl a rendu des pages'], ['s5_absent', 'transport absent']]
  for (const [nom, quoi] of fermes) {
    const z = scen(S, nom, f)
    if (z && z.px.length) f.push(`Perplexity, ${quoi} : ${z.px.length} appel(s) reçu(s) (attendu zéro)`)
  }
  const x = scen(S, 's5_ok', f)
  if (x) {
    if (!egal(x.px, [ES.questions.faible])) f.push(`cas permis (coût 0 constaté, Firecrawl vide) : appels Perplexity reçus ${court(JSON.stringify(x.px), 160)} (attendu exactement un, la question telle quelle)`)
    if (x.fc.chercher.length !== 1) f.push(`cas permis : ${x.fc.chercher.length} recherche(s) Firecrawl (Firecrawl d'abord, Perplexity en dernier)`)
    const P = resultatsDe(x).filter((r) => r.origine === 'perplexity')
    if (!P.length) f.push('cas permis : aucune citation Perplexity gardée')
    for (const r of P) {
      if (!sourcePxComplete(r.source)) f.push(`citation sans url, lu_le ou via "perplexity" : ${court(JSON.stringify(r.source), 120)}`)
      if (typeof r.extrait !== 'string' || r.extrait.length > 600 || !(x.pxReponses[0] || '').includes(r.extrait)) f.push('extrait Perplexity absent de la réponse reçue ou de plus de 600 signes')
    }
    for (const u of ES.perplexity.citations) if (!P.some((r) => r.source?.url === u)) f.push(`citation ${u} perdue (chaque citation est gardée avec son url)`)
    if (x.compteurs?.perplexity !== 1) f.push(`compteurs.perplexity = ${JSON.stringify(x.compteurs?.perplexity)} après un appel (attendu 1)`)
  }
  return res('SVR-5', f)
}

function svr6(ctx) {
  const f = []
  const ES = essais()
  const Q = ES.questions
  if (ctx.parties.has('outil')) {
    const O = outil(ctx)
    if (O.faute) f.push(O.faute)
    else {
      const { S } = O
      if (Array.isArray(S.refus)) ES.refus_attendus.forEach((a, i) => { if (S.refus[i] !== a.attendu) f.push(`refusDonneePersonnelle(« ${Q[a.question]} ») = ${JSON.stringify(S.refus[i])} (attendu ${JSON.stringify(a.attendu)})`) })
      else f.push('refusDonneePersonnelle : aucun résultat de la sonde')
      for (const k of ['adresse', 'numero', 'numero_international', 'siren', 'nom_prospect', 'nom_prospect_casse']) {
        const x = scen(S, `s6_${k}`, f)
        if (!x) continue
        if (requetesWeb(x)) f.push(`question avec ${k} et web: true : ${requetesWeb(x)} requête(s) web reçue(s) (attendu zéro)`)
        if (x.retour?.refus !== 'donnee_personnelle') f.push(`question avec ${k} : refus ${JSON.stringify(x.retour?.refus)} (attendu "donnee_personnelle")`)
        if (x.savoir.length !== 1 || !memeEnsemble(x.savoir[0]?.options?.classes, ES.classes_attendues.chef)) f.push(`question avec ${k} : le savoir n'est pas servi dans les classes du chef (${court(JSON.stringify(x.savoir.map((s) => s.options)), 100)})`)
        if (!resultatsDe(x).some((r) => r.origine === 'savoir')) f.push(`question avec ${k} : le savoir n'est plus servi (attendu le résultat public du faux savoir)`)
      }
      const w = S.parNom?.s4_web
      if (w && !w.erreur && w.fc.chercher[0] !== Q.faible) f.push(`cas permis : la requête reçue par le faux Firecrawl n'est pas exactement la question (${court(JSON.stringify(w.fc.chercher[0]), 120)})`)
      const p = S.parNom?.s5_ok
      if (p && !p.erreur && p.px[0] !== Q.faible) f.push(`cas permis : la requête reçue par le faux Perplexity n'est pas exactement la question (${court(JSON.stringify(p.px[0]), 120)})`)
      // 28/09 : seul du public part au web — aucune requête web ne porte un extrait, une sentinelle ou autre chose que la question.
      const sent = sentinellesToutes()
      const defs = Object.fromEntries(scenarios(ES).map((s) => [s.nom, s]))
      for (const x of S.scenarios || []) {
        const def = defs[x.nom]
        const permises = new Set(def?.fn === 'avecRecherche' ? ES.besoins.slice(0, 2) : [def?.demande?.question])
        for (const rq of [...x.fc.chercher, ...x.px]) {
          if (!permises.has(rq)) f.push(`${x.nom} : requête web reçue « ${court(rq, 100)} » — pas la question telle quelle`)
          if (sent.some((s) => String(rq).includes(s))) f.push(`${x.nom} : une sentinelle est partie au web`)
        }
        for (const u of x.fc.lire) if (!ES.firecrawl.urls.includes(u)) f.push(`${x.nom} : lecture Firecrawl d'une adresse inventée (${court(u, 100)})`)
      }
    }
  }
  if (ctx.parties.has('cli')) {
    const c = cli(ctx)
    if (c.faute) f.push(c.faute)
    else {
      const x = casOk(c, 'nom_web', f)
      if (x) {
        if (x.X.refus !== 'donnee_personnelle') f.push(`ligne de commande, --web et un nom du compartiment prospects dans la question : refus ${JSON.stringify(x.X.refus)} (attendu "donnee_personnelle" — les noms se lisent dans prospects/courant)`)
        if (x.X.web?.etat !== 'refuse') f.push(`ligne de commande, nom de prospect : web.etat ${JSON.stringify(x.X.web?.etat)} (attendu "refuse")`)
        if (reseauAutre(x, c.port).length) f.push(`ligne de commande, nom de prospect : connexion vers ${reseauAutre(x, c.port)[0].hote}`)
      }
    }
  }
  return res('SVR-6', f)
}

function svr7(ctx) {
  const f = []
  const ES = essais()
  const SP = ES.sentinelles.prospect
  const SI = ES.sentinelles.interne
  if (ctx.parties.has('outil')) {
    const O = outil(ctx)
    if (O.faute) f.push(O.faute)
    else {
      const { S } = O
      for (const [agent, attendu] of Object.entries(ES.classes_attendues)) if (!memeEnsemble(S.classes?.[agent], attendu)) f.push(`classesPour(${agent}) = ${JSON.stringify(S.classes?.[agent])} (attendu ${JSON.stringify(attendu)}${ES.moteurs[agent] && !['codex', 'ollama_local'].includes(ES.moteurs[agent].moteur) ? ' — 28/09 : interne jamais vers un moteur gratuit' : ''})`)
      const seulPublic = [['s7_douleurs', 'douleurs (freellmapi)'], ['s7_douleurs_elargi', 'douleurs qui demande toutes les classes'], ['s7_inconnu', 'agent inconnu'], ['s7_gratuit_perso', 'moteur gratuit qui se dit « personnelles »'], ['s7_chef_restreint', 'chef restreint à public']]
      for (const [nom, quoi] of seulPublic) {
        const x = scen(S, nom, f)
        if (!x) continue
        const autres = resultatsDe(x).filter((r) => r.source?.classe !== 'public')
        if (autres.length) f.push(`${quoi} : ${autres.length} résultat(s) de classe ${[...new Set(autres.map((r) => r.source?.classe))].join(', ')} (seul public est permis)`)
        const brut = JSON.stringify(x.retour)
        if (brut.includes(SP) || brut.includes(SI)) f.push(`${quoi} : une sentinelle ${brut.includes(SP) ? 'prospects' : 'interne'} dans la sortie`)
        if (!memeEnsemble(x.savoir[0]?.options?.classes, ['public'])) f.push(`${quoi} : deps.savoir demandé avec les classes ${JSON.stringify(x.savoir[0]?.options?.classes)} (attendu ["public"] : le filtre s'applique aussi à la demande)`)
        if (!resultatsDe(x).length) f.push(`${quoi} : aucun résultat public rendu (le faux savoir en sert)`)
      }
      const fa = scen(S, 's7_facteur', f)
      if (fa && !resultatsDe(fa).some((r) => r.source?.classe === 'prospects')) f.push('facteur (Codex, personnelles) : aucun résultat prospects alors que le faux savoir en sert un')
      const el = scen(S, 's7_chef_elargi', f)
      if (el) {
        if (resultatsDe(el).some((r) => r.source?.classe === 'prospects')) f.push('chef qui demande prospects : il en reçoit (demande.classes ne peut que restreindre)')
        if ((el.savoir[0]?.options?.classes || []).includes('prospects')) f.push('chef qui demande prospects : deps.savoir est appelé avec la classe prospects')
      }
      const ch = S.parNom?.s2_fort_chef
      if (ch && !ch.erreur) {
        if (resultatsDe(ch).some((r) => r.source?.classe === 'prospects') || JSON.stringify(ch.retour).includes(SP)) f.push('chef (personnelles: false) : un résultat prospects rendu')
        if (!resultatsDe(ch).some((r) => r.source?.classe === 'interne')) f.push('chef (Codex) : aucun résultat interne rendu alors qu’il y a droit')
        if (!memeEnsemble(ch.savoir[0]?.options?.classes, ES.classes_attendues.chef)) f.push(`chef : deps.savoir demandé avec ${JSON.stringify(ch.savoir[0]?.options?.classes)} (attendu ${JSON.stringify(ES.classes_attendues.chef)})`)
      }
    }
  }
  if (ctx.parties.has('cli')) {
    const c = cli(ctx)
    if (c.faute) f.push(c.faute)
    else {
      const chef = casOk(c, 'chef', f)
      if (chef) {
        if (chef.X.resultats.some((r) => r.source?.classe === 'prospects')) f.push('ligne de commande, chef : un résultat prospects rendu (l’index prospects n’est que pour un agent qui a la classe)')
        if (!chef.X.resultats.some((r) => r.source?.classe === 'interne')) f.push('ligne de commande, chef : aucun résultat interne (le corpus en a un qui répond)')
      }
      const fa = casOk(c, 'facteur', f)
      if (fa && !fa.X.resultats.some((r) => r.source?.classe === 'prospects')) f.push('ligne de commande, facteur : aucun résultat prospects (le corpus en a un qui répond)')
      const dl = casOk(c, 'douleurs', f)
      if (dl) {
        if (!dl.X.resultats.length) f.push('ligne de commande, douleurs : aucun résultat (le corpus a un document public qui répond)')
        const autres = dl.X.resultats.filter((r) => r.source?.classe !== 'public')
        if (autres.length) f.push(`ligne de commande, douleurs (freellmapi) : ${autres.length} résultat(s) ${[...new Set(autres.map((r) => r.source?.classe))].join(', ')} — 28/09 : interne jamais vers un moteur gratuit`)
        if (dl.brut.includes(SI) || dl.brut.includes(SP)) f.push('ligne de commande, douleurs : une sentinelle interne ou prospects dans la sortie')
      }
      for (const nom of ['chef', 'cadre', 'retire', 'modifie', 'douleurs', 'nom_web']) {
        const x = c.cas[nom]
        if (x && `${x.brut || ''}${x.r.tout}`.includes(SP)) f.push(`ligne de commande, ${nom} (${x.agent}, sans personnelles) : ${SP} dans la sortie`)
      }
      if (JSON.stringify(lignesRecherches(c.rt)).includes(SP)) f.push(`${SP} dans recherches-<jour>.jsonl`)
    }
  }
  return res('SVR-7', f)
}

function verifierEvenement(e, nom, x, f, question) {
  if (!e || typeof e !== 'object') { f.push(`${nom} : événement illisible`); return }
  if (!egal(Object.keys(e).sort(), CLES_EVENEMENT)) f.push(`${nom} : événement aux clés ${JSON.stringify(Object.keys(e))} (attendu exactement type, objet, resume : un champ inconnu vaut 400 à la route)`)
  if (e.type !== 'savoir_recherche' || !/^[a-z_]{2,40}$/.test(String(e.type))) f.push(`${nom} : type ${JSON.stringify(e.type)} (attendu "savoir_recherche")`)
  const R = typeof e.resume === 'string' ? e.resume : ''
  if (!R.length || R.length > 200) f.push(`${nom} : résumé de ${R.length} signes (1 à 200)`)
  if (question && question.length >= 12 && R.includes(question)) f.push(`${nom} : le résumé contient la question`)
  for (const s of [...sentinellesToutes(), ...essais().marqueurs_jetes]) if (R.includes(s)) f.push(`${nom} : le résumé contient ${s}`)
  for (const r of extraitsDe(x.retour)) { const t = String(r.extrait || '').slice(0, 40); if (t.length >= 12 && R.includes(t)) { f.push(`${nom} : le résumé contient un extrait`); break } }
  return R
}
function svr8(ctx) {
  const O = outil(ctx)
  if (O.faute) return res('SVR-8', [O.faute])
  const { S } = O
  const f = []
  const defs = Object.fromEntries(scenarios(essais()).map((s) => [s.nom, s]))
  let vus = 0
  for (const x of S.scenarios || []) {
    const def = defs[x.nom]
    if (!def || x.erreur) continue
    if (def.fn === 'chercher') {
      const hors = x.retour?.refus === 'question_hors_bornes'
      if (hors ? x.journal.length > 1 : x.journal.length !== 1) { f.push(`${x.nom} : ${x.journal.length} appel(s) à deps.journal (attendu ${hors ? 'un au plus' : 'un et un seul'})`); continue }
      if (!x.journal.length) continue
      vus++
      const e = x.journal[0]
      const R = verifierEvenement(e, x.nom, x, f, def.demande.question)
      if (e?.objet !== `recherche:${x.retour?.id}`) f.push(`${x.nom} : objet ${JSON.stringify(e?.objet)} (attendu "recherche:${x.retour?.id}")`)
      const m = RE_RESUME.exec(R || '')
      if (!m) { f.push(`${x.nom} : résumé « ${court(R, 80)} » hors format « <n> résultat(s) · savoir <a> · web <b> · <c> crédit(s) »`); continue }
      const res_ = resultatsDe(x)
      const nS = res_.filter((r) => r.origine === 'savoir').length
      if (Number(m[1]) !== res_.length || Number(m[2]) !== nS || Number(m[3]) !== res_.length - nS || Number(m[4]) !== (x.retour?.web?.credits ?? -1)) f.push(`${x.nom} : résumé « ${court(R, 80)} » ne compte pas ce que rend l'appel (${res_.length} résultats, savoir ${nS}, crédits ${x.retour?.web?.credits})`)
      if (x.retour?.refus && !R.includes(x.retour.refus)) f.push(`${x.nom} : refus ${x.retour.refus} absent du résumé`)
    } else {
      if (x.journal.length !== x.savoir.length) f.push(`${x.nom} : ${x.journal.length} événement(s) pour ${x.savoir.length} recherche(s) (un par recherche)`)
      for (const e of x.journal) { verifierEvenement(e, x.nom, x, f, null); if (!/^recherche:.+/.test(String(e?.objet))) f.push(`${x.nom} : objet ${JSON.stringify(e?.objet)} (attendu "recherche:<id>")`) }
    }
  }
  if (!vus) f.push('aucun événement vu : le journal n’est jamais appelé')
  return res('SVR-8', f)
}

function svr9(ctx) {
  const O = outil(ctx)
  if (O.faute) return res('SVR-9', [O.faute])
  const { S } = O
  const ES = essais()
  const f = []
  const def = scenarios(ES).find((s) => s.nom === 's9_chef')
  const x = scen(S, 's9_chef', f)
  if (x) {
    if (x.lecteur.length !== 2) f.push(`le modèle demande 5 recherches : lecteur appelé ${x.lecteur.length} fois (attendu 2 : une relance, une seule)`)
    if (!egal(x.savoir.map((s) => s.question), ES.besoins.slice(0, 2))) f.push(`recherches faites : ${court(JSON.stringify(x.savoir.map((s) => s.question)), 160)} (attendu exactement les 2 premiers besoins)`)
    if (x.savoir.some((s) => s.question === ES.besoin_seconde_reponse)) f.push('les besoins_recherche de la seconde réponse ont été cherchés (ils sont ignorés)')
    const L = x.lecteur[1]
    if (L) {
      if (L.systeme !== def.systeme) f.push('seconde lecture : la consigne système a changé')
      if (L.donnees?.mission !== 'bilan' || L.donnees?.n !== 3) f.push('seconde lecture : les données d’origine ne sont pas gardées')
      if (!('resultats_recherche' in (L.donnees || {}))) f.push('seconde lecture : resultats_recherche absent des données')
      const X = extraitsDe(L.donnees?.resultats_recherche)
      if (!X.length) f.push('seconde lecture : aucun extrait transmis')
      for (const r of X) if (!sourceComplete(r)) f.push(`seconde lecture : extrait transmis sans sa source complète (${court(JSON.stringify(r.source), 100)})`)
    }
    if (!egal(x.retour, def.reponses[1])) f.push('avecRecherche ne rend pas la seconde réponse du modèle telle quelle')
  }
  const d = scen(S, 's9_douleurs', f)
  if (d) {
    const L = d.lecteur[1]
    if (!L) f.push('douleurs : le lecteur n’est pas rappelé')
    else {
      const X = extraitsDe(L.donnees?.resultats_recherche)
      const hors = X.filter((r) => r.source?.classe === 'prospects' || r.source?.classe === 'interne')
      if (hors.length) f.push(`douleurs : ${hors.length} extrait(s) ${[...new Set(hors.map((r) => r.source.classe))].join(', ')} transmis au modèle (freellmapi : public seulement)`)
      const brut = JSON.stringify(L.donnees)
      if (brut.includes(ES.sentinelles.prospect) || brut.includes(ES.sentinelles.interne)) f.push('douleurs : une sentinelle prospects ou interne transmise au modèle')
    }
  }
  const sb = scen(S, 's9_sans_besoin', f)
  if (sb) {
    if (sb.lecteur.length !== 1 || sb.savoir.length) f.push(`réponse sans besoin : ${sb.lecteur.length} lecture(s), ${sb.savoir.length} recherche(s) (attendu 1 et 0)`)
    if (!egal(sb.retour, { texte: 'réponse directe, sans besoin' })) f.push('réponse sans besoin : pas rendue telle quelle')
  }
  const cw = scen(S, 's9_chef_web', f)
  if (cw && !egal(cw.fc.chercher, ES.besoins.slice(0, 2))) f.push(`chef (RECHERCHE_WEB_DE), savoir faible : recherches web ${court(JSON.stringify(cw.fc.chercher), 140)} (attendu les 2 besoins, web demandé)`)
  const fw = scen(S, 's9_facteur_web', f)
  if (fw && requetesWeb(fw)) f.push(`facteur (hors RECHERCHE_WEB_DE) : ${requetesWeb(fw)} requête(s) web (savoir seulement)`)
  return res('SVR-9', f)
}

function svr10(ctx) {
  const c = cli(ctx)
  if (c.faute) return res('SVR-10', [c.faute])
  const f = []
  const S = essais().sentinelles
  const x = casOk(c, 'chef', f)
  if (x) {
    if (x.bus.length !== 1) f.push(`chef : ${x.bus.length} requête(s) reçue(s) par le faux bus (attendu une)`)
    const b = x.bus[0]
    if (b) {
      if (b.methode !== 'POST' || b.url !== '/api/agents/evenements') f.push(`chef : ${b.methode} ${b.url} (attendu POST /api/agents/evenements)`)
      if (b.autorisation_sha256 !== sha256(`Bearer ${S.jeton_chef}`)) f.push('chef : Authorization ≠ « Bearer $PRESTI_JETON_CHEF »')
      if (b.statut !== 200) f.push(`chef : le faux bus a répondu ${b.statut} (corps ${court(b.corps, 120)})`)
      let corps = null
      try { corps = JSON.parse(b.corps) } catch { f.push('chef : corps illisible') }
      if (corps) {
        if (!egal(Object.keys(corps).sort(), CLES_EVENEMENT)) f.push(`chef : corps aux clés ${JSON.stringify(Object.keys(corps))} (attendu type, objet, resume)`)
        if (corps.type !== 'savoir_recherche' || corps.objet !== `recherche:${x.X.id}`) f.push(`chef : type ${JSON.stringify(corps.type)}, objet ${JSON.stringify(corps.objet)} (attendu savoir_recherche, recherche:${x.X.id})`)
      }
    }
    if (x.busRefus.length) f.push('chef : une requête est partie vers l’autre bus')
    if (x.lignes.length !== 1) f.push(`chef : ${x.lignes.length} ligne(s) ajoutée(s) à recherches-<jour>.jsonl (attendu une)`)
    const l = x.lignes[0]
    if (l) {
      if (!egal(Object.keys(l).sort(), CLES_LIGNE)) f.push(`recherches-<jour>.jsonl : clés ${JSON.stringify(Object.keys(l))} (attendu ${CLES_LIGNE.join(', ')})`)
      if (l.id !== x.X.id || l.agent !== 'chef' || l.question_sha256 !== sha256(x.question) || l.n !== x.X.resultats.length || !estDate(l.le)) f.push(`recherches-<jour>.jsonl : ligne ${court(JSON.stringify(l), 160)} ne décrit pas l’appel (id, agent, question_sha256, n, le)`)
      const o = l.origines || {}
      const compte = (k) => x.X.resultats.filter((r) => r.origine === k).length
      if (o.savoir !== compte('savoir') || o.web !== compte('web') || o.perplexity !== compte('perplexity')) f.push(`recherches-<jour>.jsonl : origines ${JSON.stringify(o)} (attendu les comptes de la sortie)`)
    }
    const journalChef = lireJournal(path.join(path.dirname(c.rt), 'chef', 'cycles.jsonl'))
    if (!journalChef.some((j) => j.evenement === 'savoir recherche' && j.id === x.X.id && j.code === 0 && estDate(j.le))) f.push('journal du chef (<racine-travail>/../chef/cycles.jsonl) : aucune ligne « savoir recherche » de cet appel (le, id, code 0)')
  }
  // Durci le 28/09 (contre-vérification 026-232, majeur latent) : les compteurs du jour et la réserve de crédits doivent
  // survivre d'un appel à l'autre — la ligne de commande est UN PROCESSUS PAR APPEL sur l'usine ; un outil qui repart de
  // zéro (compteurs) ou n'écrit jamais la réserve laisserait les plafonds de Benj (Perplexity ≤ 5/jour, web ≤ 10/agent/jour,
  // savoir ≤ 200) et la réserve Firecrawl sans effet en production, sans qu'aucun critère ne le voie.
  const chefReussis = SUCCES_CLI.filter((nom) => c.cas[nom]?.agent === 'chef' && c.cas[nom]?.r.code === 0)
  const cptr = compteursDuJour(c.rt)
  if (!chefReussis.length) f.push('aucun appel chef réussi : le compteur du jour ne peut pas être éprouvé')
  else if (!cptr) f.push("compteurs-<jour>.json absent ou illisible sous <racine-travail> (aucun appel réussi ne l'a écrit)")
  else if (cptr['savoir:chef'] !== chefReussis.length) f.push(`compteurs-<jour>.json : savoir:chef = ${JSON.stringify(cptr['savoir:chef'])} après ${chefReussis.length} appel(s) chef réussis (${chefReussis.join(', ')}) — chacun un processus séparé, attendu ${chefReussis.length} : le compteur doit être relu et incrémenté, pas repartir de zéro à chaque appel`)
  const nw = c.cas.nom_web
  if (nw && nw.r.code === 0) {
    const pCredits = path.join(c.rt, 'credits-firecrawl.json')
    if (!existe(pCredits)) f.push('credits-firecrawl.json absent après un appel --web (nom_web) : la réserve du jour n’est jamais écrite')
    else {
      let cr = null
      try { cr = lireJSON(pCredits) } catch { f.push('credits-firecrawl.json illisible') }
      if (cr) {
        if (cr.consommes !== 0) f.push(`credits-firecrawl.json : consommes = ${JSON.stringify(cr.consommes)} après un appel refusé avant tout transport (attendu 0, rien n'a été lu)`)
        if (cr.reserve_credits !== 1000) f.push(`credits-firecrawl.json : reserve_credits = ${JSON.stringify(cr.reserve_credits)} (attendu 1000, celui des réglages d'essai)`)
      }
    }
  }
  for (const nom of SUCCES_CLI) {
    const y = c.cas[nom]
    if (y?.r.code === 0 && y.bus.length !== 1) f.push(`${nom} : ${y.bus.length} événement(s) reçu(s) par le faux bus (un par appel)`)
    if (y && reseauAutre(y, c.port).length) f.push(`${nom} : connexion vers ${reseauAutre(y, c.port)[0].hote}:${reseauAutre(y, c.port)[0].port} (seul le faux bus est permis, web éteint)`)
  }
  if (c.cas.chef && !c.cas.chef.reseau.length) f.push('chef : l’espion réseau n’a rien relevé (il ne voit pas les connexions)')
  for (const [nom, quoi] of [['sans_jeton', 'jeton absent'], ['base_distante', '--base en http:// hors boucle locale'], ['base_trompeuse', '--base http://127.0.0.1.nip.io']]) {
    const y = c.cas[nom]
    if (!y) continue
    if (y.r.code !== 2) f.push(`${quoi} : code ${y.r.code} (attendu 2)`)
    if (y.bus.length || y.busRefus.length) f.push(`${quoi} : ${y.bus.length + y.busRefus.length} requête(s) au faux bus (attendu zéro)`)
    if (y.lignes.length) f.push(`${quoi} : une ligne écrite dans recherches-<jour>.jsonl (rien ne doit être fait)`)
    if (y.brut !== null) f.push(`${quoi} : une sortie a été écrite`)
    if (reseauAutre(y, c.port).length) f.push(`${quoi} : connexion tentée vers ${reseauAutre(y, c.port)[0].hote}`)
  }
  const br = c.cas.bus_refuse
  if (br) {
    if (br.r.code !== 3) f.push(`400 du faux bus : code ${br.r.code} (attendu 3)`)
    if (!br.busRefus.length) f.push('400 du faux bus : aucune requête reçue par le bus qui refuse')
  }
  // Jamais la question ni un extrait dans les lignes de recherche ni au journal du chef.
  const textes = [lignesRecherches(c.rt).map((l) => JSON.stringify(l)).join('\n'), existe(path.join(path.dirname(c.rt), 'chef', 'cycles.jsonl')) ? lire(path.join(path.dirname(c.rt), 'chef', 'cycles.jsonl')) : '']
  for (const y of Object.values(c.cas)) {
    for (const t of textes) {
      if (t.includes(y.question)) { f.push(`la question du cas ${y.nom} est écrite dans recherches-<jour>.jsonl ou au journal du chef`); break }
      const ext = extraitsDe(y.X).map((r) => String(r.extrait || '').slice(0, 40)).find((e) => e.length >= 12 && t.includes(e))
      if (ext) { f.push(`un extrait du cas ${y.nom} est écrit dans recherches-<jour>.jsonl ou au journal du chef`); break }
    }
  }
  return res('SVR-10', f)
}

function svr11(ctx) {
  const f = []
  const cles = sentinellesCles()
  if (ctx.parties.has('outil')) {
    const O = outil(ctx)
    if (O.faute) f.push(O.faute)
    else {
      const { S } = O
      const p = scen(S, 's11_pannes', f)
      if (p && !p.fc.chercher.length) f.push('pannes des transports : Firecrawl jamais appelé (le cas ne prouve rien)')
      for (const x of S.scenarios || []) {
        const brut = JSON.stringify({ retour: x.retour, journal: x.journal, erreur: x.erreur, lecteur: x.lecteur })
        for (const s of cles) if (brut.includes(s)) f.push(`${x.nom} : ${s} dans la sortie, le journal ou l’erreur (une clé ne sort jamais d’un transport)`)
      }
    }
  }
  if (ctx.parties.has('cli')) {
    const c = cli(ctx)
    if (c.faute) f.push(c.faute)
    else {
      const sources = []
      for (const y of Object.values(c.cas)) sources.push([`sortie standard et erreurs (${y.nom})`, y.r.tout], [`--sortie (${y.nom})`, y.brut || ''])
      for (const j of c.journaux) sources.push([`événements reçus (${path.basename(j)})`, existe(j) ? lire(j) : ''])
      for (const p of lister(path.join(c.d, 'travail'))) sources.push([`fichier du travail ${path.relative(c.d, p).split(path.sep).join('/')}`, fs.readFileSync(p).toString('utf8')])
      for (const [ou, t] of sources) for (const s of cles) if (t.includes(s)) f.push(`${s} dans ${ou}`)
    }
  }
  return res('SVR-11', f)
}

// ── SVR-12 : hygiène ─────────────────────────────────────────────────────────────────────────────────────────────
function git(args, cwd) { const r = spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true }); return r.status === 0 ? r.stdout.trim() : null }
let STATUT_AVANT_DEPOT = null
let TYPECHECK_DEPOT = null
const TYPECHECKS = new Map()
function importsDe(texte) {
  const out = []
  for (const re of [/\bfrom\s*['"]([^'"]+)['"]/g, /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g, /^\s*import\s+['"]([^'"]+)['"]/gm, /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g]) for (const m of texte.matchAll(re)) out.push(m[1])
  return out
}
/** Le source sans ses commentaires (chaînes et expressions régulières gardées), pour ne juger que le code. */
function sansCommentaires(src) {
  let out = ''
  let i = 0
  let prec = ''
  const n = src.length
  while (i < n) {
    const c = src[i]
    const s = src[i + 1]
    if (c === '/' && s === '/') { while (i < n && src[i] !== '\n') i++; continue }
    if (c === '/' && s === '*') { const j = src.indexOf('*/', i + 2); i = j < 0 ? n : j + 2; out += ' '; continue }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1
      while (j < n && src[j] !== c) { if (src[j] === '\\') j++; j++ }
      out += src.slice(i, j + 1); i = j + 1; prec = c; continue
    }
    if (c === '/' && (prec === '' || '(,=:[!&|?{};+-*%<>~^'.includes(prec) || /\b(return|typeof|case|in|of)\s*$/.test(out))) {
      let j = i + 1
      let classe = false
      while (j < n && src[j] !== '\n') { if (src[j] === '\\') { j += 2; continue } if (src[j] === '[') classe = true; else if (src[j] === ']') classe = false; else if (src[j] === '/' && !classe) break; j++ }
      out += src.slice(i, j + 1); i = j + 1; prec = '/'; continue
    }
    out += c
    if (!/\s/.test(c)) prec = c
    i++
  }
  return out
}
function typecheckCopie(ctx) {
  const mod = path.join(ctx.racine, CHEMINS.module)
  const idx = path.join(ctx.racine, CHEMINS.index)
  const k = sha256(`${existe(mod) ? lire(mod) : ''}\n${existe(idx) ? lire(idx) : ''}`)
  if (TYPECHECKS.has(k)) return TYPECHECKS.get(k)
  const posix = (p) => p.split(path.sep).join('/')
  const tsconfig = path.join(ctx.e, 'tsconfig-recherche.json')
  ecrire(tsconfig, JSON.stringify({ compilerOptions: { strict: true, noEmit: true, target: 'ES2022', lib: ['es2022'], module: 'esnext', moduleResolution: 'bundler', allowImportingTsExtensions: true, skipLibCheck: true, types: ['node'], typeRoots: [posix(path.join(DEPOT, 'node_modules', '@types'))], paths: { '@/*': [`${posix(ctx.racine)}/*`] } }, files: [posix(mod)] }, null, 2))
  const tc = noeud([TSC, '-p', tsconfig], { cwd: ctx.racine, timeout: 300000 })
  const v = tc.code === 0 ? null : court(tc.tout.split('\n').filter((l) => /error TS/.test(l)).slice(0, 3).join(' | ') || tc.tout, 300)
  TYPECHECKS.set(k, v)
  return v
}
function svr12(ctx) {
  const f = []
  const pMod = path.join(ctx.racine, CHEMINS.module)
  if (existe(pMod)) {
    const code = sansCommentaires(lire(pMod))
    if (!/import\s*\{[^}]*\blireAvecFirecrawl\b[^}]*\}\s*from\s*['"]@\/lib\/agents\/lectureFirecrawl(?:\.ts)?['"]/.test(code)) f.push(`${CHEMINS.module} n'importe pas lireAvecFirecrawl de @/lib/agents/lectureFirecrawl (la seule porte web)`)
    if (!/import\s*\{[^}]*\bMOTEUR_DE\b[^}]*\}\s*from\s*['"]@\/lib\/agents\/moteurs(?:\.ts)?['"]/.test(code)) f.push(`${CHEMINS.module} n'importe pas MOTEUR_DE de @/lib/agents/moteurs`)
    for (const s of importsDe(code)) {
      if (!/^(node:|\.{1,2}\/|@\/)/.test(s)) f.push(`${CHEMINS.module} importe « ${s} » (dépendance nouvelle : node:, relatif ou @/ seulement)`)
      if (/^@\/lib\/ai(\.ts)?$|(^|\/)ai(\.ts)?$|@anthropic-ai\/sdk/.test(s)) f.push(`${CHEMINS.module} importe ${s} (ni @/lib/ai ni @anthropic-ai/sdk : l'outil ne rédige pas)`)
    }
    if (/\bfetch\s*\(/.test(code)) f.push(`${CHEMINS.module} appelle fetch( (toutes les E/S passent par deps)`)
    if (/firecrawl\.dev/i.test(code)) f.push(`${CHEMINS.module} nomme l’API Firecrawl (un second client : lireAvecFirecrawl est la seule porte)`)
  }
  const pCli = path.join(ctx.racine, CHEMINS.cli)
  if (existe(pCli)) {
    const code = sansCommentaires(lire(pCli))
    for (const s of importsDe(code)) if (!/^(node:|\.{1,2}\/|@\/)/.test(s)) f.push(`${CHEMINS.cli} importe « ${s} » (dépendance nouvelle)`)
    const hotes = new Set([...code.matchAll(/\b(?:https?|wss?):\/\/(\[[^\]\s]+\]|[^/\s'"`:?#]+)/gi)].map((m) => m[1].toLowerCase()))
    for (const h of hotes) if (!h.startsWith('$') && !HOTES_PERMIS.includes(h)) f.push(`${CHEMINS.cli} nomme l'hôte ${h} (permis : ${HOTES_PERMIS.join(', ')})`)
  }
  const o = ctx.sonde
  if (o && !o.absent && o.reseau?.filter((e) => e.op !== 'ipc').length) f.push(`partie outil : ${o.reseau.length} connexion(s) relevée(s) par l'espion (ex. ${o.reseau[0].hote}) — le module ne touche jamais le réseau`)
  const pkgRacine = path.join(ctx.racine, 'package.json')
  if (cle(ctx.racine) === cle(DEPOT)) {
    const head = git(['show', 'HEAD:package.json'], DEPOT)
    const enArbre = existe(pkgRacine) ? lire(pkgRacine).replace(/\r\n/g, '\n').trim() : null
    if (head !== null && enArbre !== null && enArbre !== head.replace(/\r\n/g, '\n').trim()) f.push('package.json diffère de HEAD (aucune dépendance ne doit être ajoutée)')
    if (TYPECHECK_DEPOT === null) {
      const tc = noeud([TSC, '--noEmit'], { cwd: DEPOT, timeout: 900000 })
      TYPECHECK_DEPOT = tc.code === 0 ? '' : `npm run typecheck (tsc --noEmit) : code ${tc.code} — ${court(tc.tout.split('\n').filter((l) => /error TS/.test(l)).slice(0, 3).join(' | ') || tc.tout, 300)}`
    }
    if (TYPECHECK_DEPOT) f.push(TYPECHECK_DEPOT)
    const maintenant = git(['status', '--porcelain'], DEPOT) || ''
    const ensemble = (s) => new Set(s.split('\n').filter(Boolean).map((l) => l.slice(3)).filter((p) => !p.startsWith('.orchestre/travail/') && !p.startsWith('.orchestre/preuves/')))
    const avant = ensemble(STATUT_AVANT_DEPOT ?? maintenant)
    const nouveaux = [...ensemble(maintenant)].filter((p) => !avant.has(p))
    if (nouveaux.length) f.push(`git status : chemin(s) apparu(s) pendant ce passage, hors .orchestre/travail/ et preuves/ : ${nouveaux.slice(0, 6).join(' | ')}`)
  } else {
    if (existe(pkgRacine) && lire(pkgRacine) !== lire(path.join(DEPOT, 'package.json'))) f.push('package.json de la racine jugée diffère de celui du dépôt')
    if (existe(pMod)) { const v = typecheckCopie(ctx); if (v) f.push(`typecheck strict de ${CHEMINS.module} : ${v}`) }
  }
  return res('SVR-12', f)
}

// ── --reel : la mise en service (026-241), jugée sans qu'elle se juge elle-même ─────────────────────────────────────
// Sur le poste. SVR-R1 lit ops.evenements en production par rpc('ops_evenements_lire') avec la clé de service de
// .env.local, lue ici et JAMAIS affichée ; SVR-R2 lit le journal du chef par ssh (sudo -n -u agents presti-journal chef).
// Sans clé ssh, usine injoignable ou .env.local sans URL ni clé : code 2.
const lf = (s) => String(s).replace(/\r\n?/g, '\n')
function hoteUsine() {
  if (process.env.PRESTI_USINE) return process.env.PRESTI_USINE
  const u = path.join(DEPOT, 'scripts', 'usine.mjs')
  const m = /PRESTI_USINE \|\| '([^']+)'/.exec(existe(u) ? lire(u) : '')
  return m ? m[1] : 'usine@88.96.53.3'
}
function sshReel(commande, delai = 60000) {
  const cleSsh = path.join(os.homedir(), '.ssh', 'presti-usine')
  const r = spawnSync(process.env.PRESTI_SSH_BIN || 'ssh', ['-i', cleSsh, '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20', hoteUsine(), commande], { encoding: 'utf8', timeout: delai, windowsHide: true })
  return { code: r.status ?? 1, stdout: r.stdout || '', stderr: r.stderr || '' }
}
function envLocal() {
  const p = path.join(DEPOT, '.env.local')
  const t = existe(p) ? lire(p) : ''
  const v = (n) => { const l = t.split(/\r?\n/).find((x) => x.startsWith(`${n}=`)); return l ? l.slice(n.length + 1).trim().replace(/^["']|["']$/g, '') : null }
  return { url: v('NEXT_PUBLIC_SUPABASE_URL'), cle: v('SUPABASE_SERVICE_ROLE_KEY') }
}
async function reel() {
  const cleSsh = path.join(os.homedir(), '.ssh', 'presti-usine')
  if (!process.env.PRESTI_SSH_BIN && !existe(cleSsh)) { console.error(`✗ ${NOM} --reel : usine injoignable (clé ${cleSsh} absente)`); return 2 }
  const t = sshReel('echo presti-usine-ok', 30000)
  if (t.code !== 0 || !t.stdout.includes('presti-usine-ok')) { console.error(`✗ ${NOM} --reel : usine injoignable`); return 2 }
  const { url, cle: cleService } = envLocal()
  if (!url || !cleService) { console.error(`✗ ${NOM} --reel : .env.local sans URL Supabase ni clé de service (préalable)`); return 2 }
  const FENETRE = 7 * 86_400_000
  const R = []
  const critere = async (id, fn) => { const d = []; try { await fn(d) } catch (e) { d.push(`le juge a levé une erreur : ${court(e.message, 200)}`) } R.push(res(id, d)) }
  const reglages = lireJSON(path.join(DEPOT, 'docs', 'savoir', 'reglages.json'))
  await critere('SVR-R1', async (d) => {
    const vus = []
    let apres = 0
    for (let page = 0; page < 200; page++) {
      const r = await fetch(`${url}/rest/v1/rpc/ops_evenements_lire`, { method: 'POST', headers: { apikey: cleService, authorization: `Bearer ${cleService}`, 'content-type': 'application/json' }, body: JSON.stringify({ p_agent: 'lecture-savoir-recherche-qa', p_apres: apres, p_limite: 200 }), signal: AbortSignal.timeout(30000) })
      if (r.status !== 200) { d.push(`rpc ops_evenements_lire : HTTP ${r.status}`); return }
      const lignes = await r.json()
      if (!Array.isArray(lignes) || !lignes.length) break
      for (const e of lignes) if (e.agent === 'chef' && e.type === 'savoir_recherche' && Date.now() - Date.parse(e.le) <= FENETRE) vus.push(e)
      apres = Number(lignes.at(-1).id)
      if (lignes.length < 200) break
    }
    if (!vus.length) { d.push('aucun événement savoir_recherche de l’agent chef sur les 7 derniers jours en production (ops.evenements)'); return }
    for (const e of vus) {
      if (!/^recherche:.+/.test(String(e.objet))) d.push(`événement ${e.id} : objet ${JSON.stringify(e.objet)} (attendu recherche:<id>)`)
      if (!RE_RESUME.test(String(e.resume)) || String(e.resume).length > 200) d.push(`événement ${e.id} : résumé hors format`)
    }
  })
  await critere('SVR-R2', async (d) => {
    const j = sshReel('sudo -n -u agents /usr/local/bin/presti-journal chef 500')
    if (j.code !== 0) { d.push(`presti-journal chef : code ${j.code} — ${court(j.stderr, 120)}`); return }
    const lignes = lf(j.stdout).split('\n').map((l) => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)
    const recentes = lignes.filter((x) => x.evenement === 'savoir recherche' && Date.now() - Date.parse(x.le) <= FENETRE)
    if (!recentes.some((x) => x.code === 0)) d.push('journal du chef : aucune ligne « savoir recherche » en code 0 sur les 7 derniers jours')
    if (reglages.interrupteurs?.recherche_web?.actif !== true) {
      const web = recentes.filter((x) => x.web === 'fait' || Number(x.origines?.web) > 0 || Number(x.origines?.perplexity) > 0 || Number(x.credits) > 0)
      if (web.length) d.push(`journal du chef : ${web.length} ligne(s) web alors que recherche_web est éteint`)
    }
  })
  for (const l of imprimer(R)) console.log(l)
  return R.every((r) => r.ok) ? 0 : 1
}

// ── batterie ─────────────────────────────────────────────────────────────────────────────────────────────────────
const SVR_FN = { 'SVR-1': svr1, 'SVR-2': svr2, 'SVR-3': svr3, 'SVR-4': svr4, 'SVR-5': svr5, 'SVR-6': svr6, 'SVR-7': svr7, 'SVR-8': svr8, 'SVR-9': svr9, 'SVR-10': svr10, 'SVR-11': svr11, 'SVR-12': svr12 }
function idsPourParties(parties) {
  const ids = new Set(['SVR-1', 'SVR-12'])
  for (const p of parties) for (const id of SVR_DE_GROUPE[p]) ids.add(id)
  return ORDRE.filter((id) => ids.has(id))
}
function lancerBatterie(racine, parties, etiquette) {
  const ctx = { racine: path.resolve(racine), e: path.join(ESSAIS, etiquette), parties: new Set(parties) }
  nettoyer(ctx.e)
  fs.mkdirSync(ctx.e, { recursive: true })
  return idsPourParties(parties).map((id) => {
    try { return SVR_FN[id](ctx) } catch (e) { return res(id, [`le juge a levé une erreur : ${court(e.stack || e.message, 300)}`]) }
  })
}
function imprimer(resultats) {
  const lignes = []
  for (const r of resultats) {
    lignes.push(`${r.ok ? 'PASS' : 'FAIL'} ${r.id} — ${r.ok ? 'ok' : r.detail[0]}`)
    if (!r.ok) for (const d of r.detail.slice(1, 12)) lignes.push(`  ✗ ${d}`)
    if (!r.ok && r.detail.length > 12) lignes.push(`  … ${r.detail.length - 12} défaut(s) de plus`)
  }
  const echecs = resultats.filter((r) => !r.ok)
  lignes.push(`${NOM} : ${echecs.length ? 'FAIL' : 'PASS'} — ${echecs.length ? echecs.map((r) => r.id).join(', ') : 'tout vert'}`)
  return lignes
}
/** Le témoin, plus ce qu'il importe sans le posséder : l'index du témoin du socle (lu, jamais modifié) et deux modules du dépôt. */
function preparerTemoin(dossier) {
  nettoyer(dossier)
  fs.mkdirSync(dossier, { recursive: true })
  if (!existe(TEMOIN_SRC)) return false
  fs.cpSync(TEMOIN_SRC, dossier, { recursive: true })
  const copier = (de, vers) => { const cible = path.join(dossier, ...vers.split('/')); if (!existe(cible) && existe(de)) ecrire(cible, fs.readFileSync(de)) }
  copier(path.join(SOCLE_TEMOIN, 'lib', 'savoir', 'index.ts'), CHEMINS.index)
  copier(path.join(SOCLE_TEMOIN, 'scripts', 'savoir', 'indexer.mjs'), CHEMINS.indexer)
  copier(path.join(DEPOT, 'lib', 'agents', 'lectureFirecrawl.ts'), 'lib/agents/lectureFirecrawl.ts')
  copier(path.join(DEPOT, 'lib', 'agents', 'moteurs.ts'), 'lib/agents/moteurs.ts')
  return true
}
function menage() { if (process.env.SAVOIR_RECHERCHE_QA_GARDER !== '1') nettoyer(ESSAIS) }

// ── --preuve-echecs ──────────────────────────────────────────────────────────────────────────────────────────────
function preuveEchecs() {
  const t0 = Date.now()
  const rapport = []
  rapport.push('# 026-232 — preuve d\'échecs (savoir-recherche-qa)\n')
  rapport.push(`Généré le ${new Date().toISOString()} par \`node scripts/savoir-recherche-qa.mjs --preuve-echecs\`.\n`)
  rapport.push('28/09 : relecture de 026-229 appliquée au contrat — la classe `interne` ne va jamais vers un moteur gratuit : `classesPour` rend `["public"]` pour un agent sur freellmapi, ollama_cloud, un modèle `:cloud` ou groq (douleurs compris) ; Perplexity et Firecrawl ne reçoivent que du public (la question telle quelle, jamais un extrait). Critères SVR-6, SVR-7, SVR-9 ; sabotages S10, S11.\n')

  // (a) l'arbre courant : code ≠ 0, SVR-1 premier échec
  const resArbre = lancerBatterie(DEPOT, GROUPES, 'depot')
  const premier = resArbre.find((r) => !r.ok)
  const aOk = premier?.id === PREMIER_ECHEC_ATTENDU
  rapport.push(`## (a) Arbre courant du dépôt — attendu : échec, ${PREMIER_ECHEC_ATTENDU} en premier\n`)
  rapport.push(`\`\`\`\n${imprimer(resArbre).join('\n')}\n\`\`\`\n`)
  rapport.push(`Verdict (a) : ${aOk ? 'CONFORME' : 'NON CONFORME'} — premier échec réel : ${premier?.id || '(aucun)'}\n`)

  // (b) le témoin : vert
  const dossierTemoin = path.join(TRAVAIL, 'temoin')
  let bOk = false
  rapport.push('## (b) Témoin (scripts/fixtures/026/savoir/recherche/temoin/) — attendu : vert\n')
  if (!preparerTemoin(dossierTemoin)) rapport.push(`Témoin absent : \`${rel(TEMOIN_SRC)}\`. Non conforme.\n`)
  else {
    const resTemoin = lancerBatterie(dossierTemoin, GROUPES, 'temoin')
    rapport.push(`\`\`\`\n${imprimer(resTemoin).join('\n')}\n\`\`\`\n`)
    bOk = resTemoin.every((r) => r.ok)
    rapport.push(`Verdict (b) : ${bOk ? 'CONFORME' : 'NON CONFORME'}\n`)
  }

  // (c) chaque sabotage : code ≠ 0, son critère en échec
  rapport.push('## (c) Sabotages (scripts/fixtures/026/savoir/recherche/sabotages.json) — attendu : chaque sabotage fait échouer son critère\n')
  let cOk = false
  if (!existe(SABOTAGES_SRC)) rapport.push(`Absent : \`${rel(SABOTAGES_SRC)}\`. Non conforme.\n`)
  else {
    let sabotages = []
    try { sabotages = lireJSON(SABOTAGES_SRC) } catch (e) { rapport.push(`illisible : ${e.message}\n`) }
    const lignes = []
    let tousOk = Array.isArray(sabotages) && sabotages.length >= 8
    if (!tousOk) lignes.push(`sabotages.json : ${Array.isArray(sabotages) ? sabotages.length : 0} sabotage(s) (attendu au moins 8)`)
    const criteres = new Set()
    for (const s of Array.isArray(sabotages) ? sabotages : []) {
      const dossierSab = path.join(TRAVAIL, 'sab', String(s.id))
      preparerTemoin(dossierSab)
      const cible = path.join(dossierSab, ...String(s.fichier || '').split('/'))
      let applique = false
      if (s.fichier && existe(cible) && typeof s.avant === 'string' && typeof s.apres === 'string') {
        const contenu = lire(cible)
        // Un témoin extrait en CRLF (core.autocrlf) garde ses sabotages : les fins de ligne suivent celles du fichier.
        const crlf = contenu.includes('\r\n')
        const avant = crlf ? s.avant.replace(/\r?\n/g, '\r\n') : s.avant
        const apres = crlf ? s.apres.replace(/\r?\n/g, '\r\n') : s.apres
        if (contenu.split(avant).length === 2) { fs.writeFileSync(cible, contenu.replace(avant, () => apres)); applique = true }
      }
      if (!applique) { lignes.push(`${s.id} : remplacement introuvable ou ambigu dans le témoin (${s.fichier})`); tousOk = false; continue }
      // La partie où le sabotage agit (champ `parties`), sinon celles de son critère ; SVR-1 et SVR-12 tournent toujours.
      const groupesDuCritere = GROUPES.filter((g) => SVR_DE_GROUPE[g].includes(s.critere))
      const partiesSab = s.seul ? GROUPES : Array.isArray(s.parties) ? s.parties : groupesDuCritere.length ? groupesDuCritere : ['outil']
      const resSab = lancerBatterie(dossierSab, partiesSab, `sab-${s.id}`)
      const pris = resSab.find((r) => r.id === s.critere && !r.ok)
      const autres = resSab.filter((r) => !r.ok && r.id !== s.critere)
      const ok = Boolean(pris) && (!s.seul || autres.length === 0)
      if (!ok) tousOk = false
      criteres.add(s.critere)
      lignes.push(`${s.id} (${s.fichier}, partie ${partiesSab.join('+')}) → attendu ${s.critere}${s.seul ? ' SEUL' : ''} en échec : ${ok ? 'pris' : 'NON'} — ${pris ? court(pris.detail[0], 180) : `échecs : ${resSab.filter((r) => !r.ok).map((r) => r.id).join(', ') || 'aucun'}`}${autres.length ? ` (aussi : ${autres.map((r) => r.id).join(', ')})` : ''}`)
      nettoyer(dossierSab)
      if (process.env.SAVOIR_RECHERCHE_QA_GARDER !== '1') nettoyer(path.join(ESSAIS, `sab-${s.id}`))
    }
    const nonCouverts = ORDRE.filter((id) => !criteres.has(id))
    if (nonCouverts.length) { lignes.push(`critères sans sabotage : ${nonCouverts.join(', ')}`); tousOk = false }
    rapport.push(`\`\`\`\n${lignes.join('\n')}\n\`\`\`\n`)
    cOk = tousOk
    rapport.push(`Verdict (c) : ${cOk ? 'CONFORME' : 'NON CONFORME'}\n`)
  }

  const global = aOk && bOk && cOk
  rapport.push('## Bilan\n')
  rapport.push(`(a) ${aOk ? 'ok' : 'NON'} · (b) ${bOk ? 'ok' : 'NON'} · (c) ${cOk ? 'ok' : 'NON'} · ${Math.round((Date.now() - t0) / 1000)} s\n`)
  rapport.push(`**026-232 : ${global ? 'PASS' : 'FAIL'}**\n`)
  ecrire(path.join(PREUVES, 'echecs-attendus.md'), rapport.join('\n'))
  console.log(imprimer(resArbre).join('\n'))
  console.log(`\n--preuve-echecs : (a)=${aOk} (b)=${bOk} (c)=${cOk} → ${global ? 'PASS' : 'FAIL'}`)
  console.log(`preuve : ${rel(path.join(PREUVES, 'echecs-attendus.md'))}`)
  nettoyer(dossierTemoin)
  return global ? 0 : 1
}

// ── entrée ───────────────────────────────────────────────────────────────────────────────────────────────────────
async function principal() {
  const ARGS = process.argv.slice(2)
  const CONNUS = ['partie', 'racine', 'temoin', 'preuve-echecs', 'reel']
  for (const a of ARGS) {
    const m = /^--([a-z-]+)(=.*)?$/.exec(a)
    if (!m || !CONNUS.includes(m[1])) { console.error(`✗ ${NOM} : argument inconnu « ${a} » (attendus : --partie=, --racine=, --temoin, --preuve-echecs, --reel)`); return 2 }
  }
  const option = (nom) => { const a = ARGS.find((x) => x.startsWith(`--${nom}=`)); return a ? a.slice(nom.length + 3) : null }
  const drapeau = (nom) => ARGS.includes(`--${nom}`)
  const optPartie = option('partie')
  if (optPartie) for (const p of optPartie.split(',')) if (!GROUPES.includes(p)) { console.error(`✗ ${NOM} : partie inconnue « ${p} » (attendues : ${GROUPES.join(', ')})`); return 2 }
  const parties = optPartie ? optPartie.split(',') : GROUPES

  if (drapeau('reel')) return reel()
  for (const [quoi, p] of [['ts-loader', TS_LOADER], ['typescript', TSC], ['essais.json', ESSAIS_SRC], ['noms-prospects.json', NOMS_SRC], ['corpus.json', CORPUS_SRC], ['sonde-outil', SONDE_SRC], ['faux-bus', FAUX_BUS], ['espion-reseau (socle)', ESPION_RESEAU], ['index du témoin du socle', path.join(SOCLE_TEMOIN, 'lib', 'savoir', 'index.ts')]]) {
    if (!existe(p)) { console.error(`✗ ${NOM} : préalable absent — ${quoi} (${rel(p)})`); return 2 }
  }
  fs.mkdirSync(TRAVAIL, { recursive: true })
  STATUT_AVANT_DEPOT = git(['status', '--porcelain'], DEPOT) || ''
  try {
    if (drapeau('preuve-echecs')) return preuveEchecs()
    let racine = option('racine') ? path.resolve(option('racine')) : DEPOT
    let etiquette = option('racine') ? 'racine' : 'depot'
    if (drapeau('temoin')) {
      racine = path.join(TRAVAIL, 'temoin')
      etiquette = 'temoin'
      if (!preparerTemoin(racine)) { console.error(`✗ ${NOM} --temoin : ${rel(TEMOIN_SRC)} n'existe pas`); return 1 }
    }
    const resultats = lancerBatterie(racine, parties, etiquette)
    for (const l of imprimer(resultats)) console.log(l)
    return resultats.every((r) => r.ok) ? 0 : 1
  } finally { menage() }
}
process.exitCode = await principal()
