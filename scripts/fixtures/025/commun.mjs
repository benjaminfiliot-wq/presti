// scripts/fixtures/025/commun.mjs — le socle des juges de la série 025 (fiche 025-01, points 1 à 3), écrit par Claude Code.
//
// Ce module ne juge rien seul : il donne aux juges (maquette-qa, formulaire-site-qa, verrou-site-qa, constructeur-ferme-qa,
// promesses-qa, webhook-muet-qa, parcours-commande-qa, prospects-hors-depot, juges-025-preuve) les mêmes outils :
//   - les options communes : --racine=<dossier> (défaut : la racine du dépôt) et --temoin ; --reel est lu mais refusé hors
//     de la racine du dépôt (on ne teste pas la production depuis un arbre figé) ;
//   - la sortie : une ligne « PASS <id> — … » ou « FAIL <id> — … » par critère déclaré, puis « <juge> : PASS » ou
//     « <juge> : FAIL — ids » ; code 0 seulement si chaque critère déclaré a été évalué et qu'aucun n'a échoué. Un critère
//     jamais évalué (exception, oubli) est un échec ;
//   - T1 : Lestraque régénéré dans .orchestre/travail/<juge>/lestraque/ (--sortie, jamais en place) : index.html et site.js
//     identiques octet pour octet aux fichiers suivis de public/sites-demo/lestraque/, styles.css différent au plus par sa
//     ligne 1 (la date du jour, generer.mjs:371) ; sur la racine du dépôt, Lestraque n'a en plus ni modification ni fichier
//     non suivi (les fiches 025 l'interdisent toutes) ;
//   - T2 : les neuf démos gelées sans modification (git diff --quiet HEAD) ni fichier non suivi (git ls-files --others
//     --exclude-standard : ce que git status montre ; les fichiers ignorés, comme serrurier/node_modules, ne partent pas en
//     production et sont seulement comptés) ; sur un arbre extrait (non Git), chaque fichier est comparé à son blob ;
//   - un serveur statique local (avec routes simulées, pour /api/leads) et Playwright, déjà dans node_modules ; les captures
//     sont prises par le juge lui-même, et une capture de 0 octet, illisible, aux mauvaises dimensions ou uniforme (écart-type
//     du gris < 8, seuil de telephone-qa.mjs TL-12) est un échec ;
//   - l'arbre de référence : git archive 1620723 extrait dans .orchestre/travail/025-01/reference/ par un lecteur tar écrit
//     ici (aucun tar du système, rien n'est écrit dans .git : git archive --output écrit dans .orchestre/travail/), sans
//     conversion de fins de ligne (core.autocrlf=false le temps de la commande : la configuration système de cette machine
//     vaut true et aurait mis des CRLF partout) ; chaque fichier est ensuite comparé à son blob, et l'arbre est réutilisé tant
//     qu'il reste identique ;
//   - les jeux d'essai de scripts/fixtures/025/ : leur lecture, le contrat matiere.artisan, et leur vérification.
//
// Index : R, FIXTURES, TRAVAIL, REFERENCE_COMMIT, REFERENCE_DOSSIER, DEMOS_GELEES, MAQUETTE_EXEMPLE, COMMANDE_EXEMPLE,
//   COMMANDE_SANS_CHIFFRES · sous, exigerSousTravail, dossierTravail, lireOuNull, taille, fichierNonVide, lireJson, sha256,
//   shaBlob, lancer · INVISIBLES, replier (autres graphies : NFKC, invisibles, cyrillique et grec de forme latine) · git,
//   estRacineGit, revParse, blobGit, lsTree, listerFichiers, COPIES_DE_DOCUMENTATION, gitGrepFichiers · instantaneDossier,
//   comparerInstantanes, preparerTemoin, analyserSortie · lireOptions, lireOptionsOuQuitter, creerSortie · t1, t2,
//   commitDeReference · defautsTypecheck (tsconfig.json et script typecheck de 1620723, @ts-nocheck, @ts-ignore ajoutés) ·
//   servir · lancerNavigateur, BUREAU, TELEPHONE, defilementHorizontal, verifierImage, capturer ·
//   extraireTar, verifierArbre, extraireReference · PREMIERE_PERSONNE, premierePersonneDuGenerateur, erreursArtisan,
//   lireMaquetteExemple, nomFictif, lireCommande, preparerCommande, verifierJeuxEssai · motsDe, motsDesMetiers, motsEtrangers.
//
// Le nom de l'entreprise fictive de maquette-exemple.json n'est écrit nulle part ici : il est lu dans le jeu d'essai (MQ-9 le
// cherche dans tous les fichiers suivis). Les juges font de même.
//
// Auto-vérification : node scripts/fixtures/025/commun.mjs [--racine=<dossier>] [--extraire-reference]
//   T1, T2, JE (jeux d'essai), SV (serveur), CAP (captures et leurs témoins négatifs), et REF avec --extraire-reference.
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

// ── Chemins et constantes ─────────────────────────────────────────────────────────────────────────────────────────────────
export const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
export const FIXTURES = path.join(R, 'scripts', 'fixtures', '025')
export const TRAVAIL = path.join(R, '.orchestre', 'travail')
export const REFERENCE_COMMIT = '1620723'
export const REFERENCE_DOSSIER = path.join(TRAVAIL, '025-01', 'reference')
export const DEMOS_GELEES = ['carreleur', 'chauffagiste', 'couvreur', 'electricien', 'macon', 'menuisier', 'peintre', 'plombier', 'serrurier']
export const MAQUETTE_EXEMPLE = path.join(FIXTURES, 'maquette-exemple.json')
export const COMMANDE_EXEMPLE = path.join(FIXTURES, 'commande-exemple')
export const COMMANDE_SANS_CHIFFRES = path.join(FIXTURES, 'commande-sans-chiffres.json')
const LESTRAQUE = 'public/sites-demo/lestraque'

// ── Petits outils ─────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Vrai si `enfant` est strictement sous `parent` (comparaison insensible à la casse sous Windows, comme path.relative). */
export function sous(parent, enfant) {
  const rel = path.relative(path.resolve(parent), path.resolve(enfant))
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel)
}
/** Lève une erreur si `p` n'est pas sous .orchestre/travail/ : aucun outil d'ici n'efface ni n'écrit ailleurs. */
export function exigerSousTravail(p) {
  if (!sous(TRAVAIL, p)) throw new Error(`${p} n'est pas sous ${TRAVAIL} : refusé (les juges n'écrivent que dans .orchestre/travail/)`)
  return path.resolve(p)
}
/** Un dossier de travail propre : .orchestre/travail/<juge>/<parties…>, vidé puis recréé. */
export function dossierTravail(juge, ...parties) {
  const d = exigerSousTravail(path.join(TRAVAIL, juge, ...parties))
  fs.rmSync(d, { recursive: true, force: true })
  fs.mkdirSync(d, { recursive: true })
  return d
}
export const lireOuNull = (f) => { try { return fs.readFileSync(f) } catch { return null } }
export const taille = (f) => { try { return fs.statSync(f).size } catch { return -1 } }
export const fichierNonVide = (f) => { try { const s = fs.statSync(f); return s.isFile() && s.size > 0 } catch { return false } }
export const lireJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'))
export const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex')
/** L'identifiant Git d'un contenu (blob) : sha1("blob <taille>\0" + contenu). */
export const shaBlob = (buf) => crypto.createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex')
const premiereLigne = (e) => String((e && e.message) || e).split('\n')[0].slice(0, 300)
const court = (s, n = 160) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t }

// ── Autres graphies (relecture à froid du 24/09) ───────────────────────────────────────────────────────────────────────────
// Un mot interdit caché par une autre graphie ne doit pas échapper à un juge : caractères invisibles (U+00AD, U+200B-D, U+2060,
// U+FEFF, U+180E), formes de compatibilité (NFKC : chiffres pleine chasse, lettres mathématiques, ligatures, ² → 2) et lettres
// cyrilliques ou grecques qui ont la forme d'une lettre latine (« mоins » avec un о cyrillique).
const CONFUSABLES = new Map(Object.entries({
  а: 'a', в: 'b', е: 'e', ё: 'ë', к: 'k', м: 'm', н: 'h', о: 'o', р: 'p', с: 'c', т: 't', у: 'y', х: 'x', ѕ: 's', і: 'i', ї: 'ï', ј: 'j', ԁ: 'd', ԛ: 'q', ԝ: 'w', ӏ: 'l', ү: 'y', һ: 'h',
  А: 'A', В: 'B', Е: 'E', Ё: 'Ë', К: 'K', М: 'M', Н: 'H', О: 'O', Р: 'P', С: 'C', Т: 'T', У: 'Y', Х: 'X', Ѕ: 'S', І: 'I', Ї: 'Ï', Ј: 'J', Ԛ: 'Q', Ԝ: 'W', Ӏ: 'I', Ү: 'Y', Һ: 'H',
  α: 'a', ε: 'e', ι: 'i', κ: 'k', ν: 'v', ο: 'o', ρ: 'p', τ: 't', υ: 'u', χ: 'x', γ: 'y',
  Α: 'A', Β: 'B', Ε: 'E', Ζ: 'Z', Η: 'H', Ι: 'I', Κ: 'K', Μ: 'M', Ν: 'N', Ο: 'O', Ρ: 'P', Τ: 'T', Υ: 'Y', Χ: 'X',
}))
const RE_CONFUSABLES = new RegExp(`[${[...CONFUSABLES.keys()].join('')}]`, 'gu')
export const INVISIBLES = /[­᠎​‌‍⁠﻿]/g
/** Le texte tel qu'un lecteur le lit : NFKC, invisibles retirés, lettres cyrilliques et grecques de forme latine ramenées au latin, NFC. */
export function replier(t) {
  return String(t ?? '').normalize('NFKC').replace(INVISIBLES, '').replace(RE_CONFUSABLES, (c) => CONFUSABLES.get(c)).normalize('NFC')
}

/** Lance une commande sans shell (un « | » ou un « & » d'argument reste un caractère). Pour npm sous Windows : shell: true. */
export function lancer(commande, args = [], { cwd = R, timeout = 240_000, env = {}, entree, shell = false } = {}) {
  const r = spawnSync(commande, args, { cwd, timeout, env: { ...process.env, ...env }, input: entree, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, shell, windowsHide: true })
  const stdout = r.stdout || '', stderr = r.stderr || ''
  const sortie = `${stdout}${stderr}`.trim()
  return { code: r.status, signal: r.signal, erreur: r.error ? premiereLigne(r.error) : null, stdout, stderr, sortie, derniereLigne: sortie.split('\n').filter((l) => l.trim()).pop() || '' }
}

// ── Git (lecture seule : GIT_OPTIONAL_LOCKS=0, aucune écriture opportuniste de l'index) ──────────────────────────────────────
export function git(args, { cwd = R, binaire = false } = {}) {
  const r = spawnSync('git', args, { cwd, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' }, maxBuffer: 1024 * 1024 * 1024, encoding: binaire ? 'buffer' : 'utf8', windowsHide: true })
  return { code: r.status, stdout: r.stdout ?? (binaire ? Buffer.alloc(0) : ''), stderr: r.stderr ? r.stderr.toString() : '', erreur: r.error ? premiereLigne(r.error) : null }
}
/** Vrai si `dossier` est la racine d'un dépôt Git (l'arbre extrait sous .orchestre/travail/ ne l'est pas : son toplevel est le dépôt). */
export function estRacineGit(dossier) {
  const r = git(['rev-parse', '--show-toplevel'], { cwd: dossier })
  if (r.code !== 0) return false
  const haut = path.resolve(r.stdout.trim())
  return path.relative(haut, path.resolve(dossier)) === ''
}
export function revParse(rev, { cwd = R } = {}) {
  const r = git(['rev-parse', '--verify', `${rev}^{commit}`], { cwd })
  if (r.code !== 0) throw new Error(`révision ${rev} introuvable : ${court(r.stderr)}`)
  return r.stdout.trim()
}
/** Le contenu suivi d'un fichier à une révision (blob brut, sans conversion de fins de ligne), ou null. */
export function blobGit(depot, rev, chemin) {
  const r = git(['cat-file', 'blob', `${rev}:${chemin.split(path.sep).join('/')}`], { cwd: depot, binaire: true })
  return r.code === 0 ? r.stdout : null
}
/** L'arbre suivi à une révision sous un préfixe : Map(chemin posix → { sha, taille, mode }). */
export function lsTree(depot, rev, prefixe = '') {
  const args = ['ls-tree', '-r', '-l', '-z', rev]
  if (prefixe) args.push('--', prefixe)
  const r = git(args, { cwd: depot, binaire: true })
  if (r.code !== 0) throw new Error(`git ls-tree ${rev} ${prefixe} : ${court(r.stderr)}`)
  const m = new Map()
  for (const e of r.stdout.toString('utf8').split('\0')) {
    if (!e) continue
    const tab = e.indexOf('\t')
    const [mode, type, sha, t] = e.slice(0, tab).split(/\s+/)
    if (type === 'blob') m.set(e.slice(tab + 1), { sha, taille: Number(t), mode })
    else throw new Error(`ls-tree : entrée ${type} non prise en charge (${e.slice(tab + 1)})`)
  }
  return m
}
/** Les fichiers d'un dossier (récursif), en chemins posix relatifs. */
export function listerFichiers(dossier) {
  const out = new Set()
  const rec = (rel) => {
    for (const e of fs.readdirSync(path.join(dossier, rel), { withFileTypes: true })) {
      const r2 = rel ? `${rel}/${e.name}` : e.name
      if (e.isDirectory()) rec(r2)
      else out.add(r2)
    }
  }
  if (fs.existsSync(dossier)) rec('')
  return out
}
/**
 * Les COPIES de documents que le dépôt porte à côté du produit : jamais du code, jamais ce qu'un juge de « fuite » cherche.
 *   - docs/contexte-cloud/ : 2 729 fichiers de contexte pour Claude cloud (30/09), des copies de notes, de fiches et d'inventaires
 *     du produit et de l'orchestre : un prix, une marque fictive ou un nom d'essai y sont cités tels quels (SO-1, SG-5, MQ-9
 *     rouges le 04/10 sans qu'aucune ligne de lib/, app/ ou components/ y soit pour rien) ;
 *   - docs/relais-fiches-claude/ : le lot de fiches prêtes préparé pour Claude cloud (30/09, 57 fichiers : copies de fiches, de preuves et
 *     de sources du PC ; la fiche 026-083 y cite le prix du Studio) ;
 *   - reprise-cloud/ : la reprise pour le cloud (déjà écartée par SO-1 depuis le 29/09) ;
 *   - .orchestre/preuves/ : les preuves des fiches (captures, journaux de juges, sorties de sabotages qui citent ces valeurs).
 * Le balayage continue de voir lib/, app/, components/, scripts/ (hors jeux d'essai et juges, selon chaque juge), public/ : voir
 * le sabotage de chaque juge dans .orchestre/preuves/reglages-0410/. Les juges de SÉCURITÉ qui cherchent une clé ou des données
 * de prospects (chef-qa CH-R6, prospects-hors-depot) n'utilisent pas cette fonction : ils doivent, eux, voir ces copies.
 */
export const COPIES_DE_DOCUMENTATION = ['docs/contexte-cloud/', 'docs/relais-fiches-claude/', 'reprise-cloud/', '.orchestre/preuves/']
/**
 * Les fichiers qui contiennent `motif` : git grep (fichiers suivis) sur la racine d'un dépôt, git grep --no-index (tous les
 * fichiers) sur un arbre extrait. Options : insensible (-i), exclure (préfixes posix à écarter du résultat, EN PLUS de
 * COPIES_DE_DOCUMENTATION, toujours écartées).
 */
export function gitGrepFichiers(racine, motif, { insensible = false, exclure = [] } = {}) {
  const args = ['grep', '-F', '-l', '-I', '-z']
  if (insensible) args.push('-i')
  if (!estRacineGit(racine)) args.splice(1, 0, '--no-index')
  args.push('-e', motif)
  const r = git(args, { cwd: racine, binaire: true })
  if (r.code !== 0 && r.code !== 1) throw new Error(`git grep : ${court(r.stderr)}`)
  const ecartes = [...COPIES_DE_DOCUMENTATION, ...exclure]
  return r.stdout.toString('utf8').split('\0').filter(Boolean).filter((f) => !ecartes.some((p) => f === p || f.startsWith(p.endsWith('/') ? p : `${p}/`)))
}

/**
 * Instantané d'un dossier (récursif) : Map(chemin posix → « taille:mtimeMs », ou l'empreinte sha1 du contenu avec contenu:
 * true). Sert à prouver que rien n'a été écrit (MQ-2 : « rien n'est écrit sous public/ »). Dossier absent → Map vide.
 */
export function instantaneDossier(dossier, { contenu = false } = {}) {
  const m = new Map()
  for (const rel of listerFichiers(dossier)) {
    const f = path.join(dossier, rel)
    const st = fs.statSync(f)
    m.set(rel, contenu ? shaBlob(fs.readFileSync(f)) : `${st.size}:${st.mtimeMs}`)
  }
  return m
}
/** Différence de deux instantanés → { ajoutes[], retires[], modifies[], egal } */
export function comparerInstantanes(avant, apres) {
  const ajoutes = [...apres.keys()].filter((k) => !avant.has(k))
  const retires = [...avant.keys()].filter((k) => !apres.has(k))
  const modifies = [...apres].filter(([k, v]) => avant.has(k) && avant.get(k) !== v).map(([k]) => k)
  return { ajoutes, retires, modifies, egal: !ajoutes.length && !retires.length && !modifies.length }
}
/**
 * Un arbre témoin pour --temoin : .orchestre/travail/<juge>/temoin/ (vidé), où sont copiés depuis `base` (R par défaut) les
 * chemins de `copier` (fichiers ou dossiers, posix relatifs ; un chemin absent est une erreur), puis superposés tous les
 * fichiers de `superposer` (défaut scripts/fixtures/025/temoins/<juge>/, s'il existe : les fichiers conformes du juge).
 * → le chemin de l'arbre, à passer comme racine.
 */
export function preparerTemoin(juge, { base = R, copier = [], superposer = path.join(FIXTURES, 'temoins', juge) } = {}) {
  if (!juge || !/^[a-z0-9-]+$/.test(juge)) throw new Error('preparerTemoin : nom de juge attendu ([a-z0-9-])')
  const dest = dossierTravail(juge, 'temoin')
  for (const rel of copier) {
    const src = path.join(base, rel)
    if (!(path.relative(base, src) === '' || sous(base, src)) || !fs.existsSync(src)) throw new Error(`preparerTemoin : ${rel} introuvable sous ${base}`)
    fs.cpSync(src, path.join(dest, rel), { recursive: true })
  }
  if (superposer && fs.existsSync(superposer)) fs.cpSync(superposer, dest, { recursive: true, force: true })
  return dest
}
/** Lit la sortie d'un juge de la série : { lignes: [{ verdict, id, detail }], juge, verdict ('PASS' | 'FAIL' | null), rouges[] } */
export function analyserSortie(texte) {
  const lignes = [], out = { lignes, juge: null, verdict: null, rouges: [] }
  for (const l of String(texte).split(/\r?\n/)) {
    const m = /^(PASS|FAIL) (\S+) — (.*)$/.exec(l)
    if (m) { lignes.push({ verdict: m[1], id: m[2], detail: m[3] }); continue }
    const f = /^(\S+) : (PASS|FAIL)(?: — (.*))?$/.exec(l)
    if (f) { out.juge = f[1]; out.verdict = f[2]; out.rouges = f[3] ? f[3].split(', ') : [] }
  }
  return out
}

// ── Options communes ──────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * --racine=<dossier> (défaut R), --temoin, --reel ; `connues` : les autres options du juge (ex. ['metier']). Toute option
 * inconnue est refusée (une faute de frappe ne doit pas changer le verdict en silence). Lève une Error si c'est invalide.
 */
export function lireOptions(argv = process.argv.slice(2), { connues = [] } = {}) {
  const valeurs = new Map(), drapeaux = new Set(), positionnels = []
  for (const a of argv) {
    if (!a.startsWith('--')) { positionnels.push(a); continue }
    const i = a.indexOf('=')
    if (i < 0) drapeaux.add(a.slice(2)); else valeurs.set(a.slice(2, i), a.slice(i + 1))
  }
  const permises = new Set(['racine', 'temoin', 'reel', ...connues])
  const inconnues = [...valeurs.keys(), ...drapeaux].filter((k) => !permises.has(k))
  if (inconnues.length) throw new Error(`option(s) inconnue(s) : ${inconnues.map((k) => `--${k}`).join(', ')}`)
  if (drapeaux.has('racine') || valeurs.get('racine') === '') throw new Error('--racine attend un dossier : --racine=<dossier>')
  if (valeurs.has('temoin') || valeurs.has('reel')) throw new Error('--temoin et --reel ne prennent pas de valeur')
  const brute = valeurs.get('racine')
  const racine = brute === undefined ? R : path.resolve(brute)
  if (!fs.existsSync(racine) || !fs.statSync(racine).isDirectory()) throw new Error(`--racine=${brute} : dossier introuvable`)
  const temoin = drapeaux.has('temoin'), reel = drapeaux.has('reel')
  if (reel && (temoin || path.relative(R, racine) !== '')) throw new Error('--reel se lance seul, sur la racine du dépôt (ni --temoin, ni --racine=…)')
  return {
    racine, racineParDefaut: path.relative(R, racine) === '', temoin, reel, positionnels,
    valeur: (nom) => valeurs.get(nom),
    drapeau: (nom) => drapeaux.has(nom),
    liste: (nom) => (valeurs.get(nom) ?? '').split(',').map((x) => x.trim()).filter(Boolean),
  }
}
/** lireOptions, ou message sur stderr et code 2 : un juge mal appelé ne sort jamais en code 0. */
export function lireOptionsOuQuitter(argv, opts) {
  try { return lireOptions(argv, opts) } catch (e) { console.error(`✗ ${premiereLigne(e)}`); process.exit(2) }
}

// ── Sortie : une ligne par critère ────────────────────────────────────────────────────────────────────────────────────────
/**
 * const s = creerSortie('maquette-qa', ['T1', 'T2', 'MQ-1', …], { racine, temoin })
 * s.passe(id, detail) · s.echoue(id, detail) · s.verdict(id, ok, detailOk, detailKo) · s.resultat(id, { ok, echecs, resume })
 * s.note(texte) · s.evalue(id) · s.enEchec(id) · await s.executer(async (s) => { … }) → imprime et pose process.exitCode.
 * Un échec est collant : un passe() après un echoue() ne le lève pas. Un id non déclaré qui reçoit un verdict est imprimé et
 * compte comme échec (faute de frappe dans le juge).
 */
export function creerSortie(juge, ids, { racine = R, temoin = false } = {}) {
  if (!Array.isArray(ids) || !ids.length || new Set(ids).size !== ids.length) throw new Error('creerSortie : liste d\'identifiants non vide et sans doublon attendue')
  const etat = new Map(ids.map((id) => [id, { passes: [], echecs: [] }]))
  const horsListe = new Set()
  const notes = []
  let fini = false, code = null
  const entree = (id) => { if (!etat.has(id)) { etat.set(id, { passes: [], echecs: [] }); horsListe.add(id) } return etat.get(id) }
  const s = {
    juge, ids,
    passe(id, detail = '') { entree(id).passes.push(String(detail)) },
    echoue(id, detail) { entree(id).echecs.push(String(detail || 'échec sans détail')) },
    verdict(id, ok, detailOk = '', detailKo = '') { if (ok) s.passe(id, detailOk); else s.echoue(id, detailKo || detailOk) },
    resultat(id, r) { if (r && r.ok) s.passe(id, r.resume || ''); else for (const d of (r && r.echecs && r.echecs.length ? r.echecs : ['résultat vide'])) s.echoue(id, d) },
    note(texte) { notes.push(String(texte)) },
    evalue: (id) => { const e = etat.get(id); return !!e && (e.passes.length + e.echecs.length) > 0 },
    enEchec: (id) => { const e = etat.get(id); return !!e && e.echecs.length > 0 },
    lignes() {
      const out = []
      for (const [id, e] of etat) {
        if (horsListe.has(id)) { out.push(`FAIL ${id} — critère non déclaré par le juge${e.echecs.length ? ` ; ${e.echecs.slice(0, 2).join(' ; ')}` : ''}`); continue }
        if (e.echecs.length) out.push(`FAIL ${id} — ${e.echecs.slice(0, 3).join(' ; ')}${e.echecs.length > 3 ? ` (et ${e.echecs.length - 3} autre(s))` : ''}`)
        else if (e.passes.length) out.push(`PASS ${id} — ${e.passes.filter(Boolean).join(' ; ') || 'conforme'}`)
        else out.push(`FAIL ${id} — non évalué`)
      }
      return out
    },
    fin() {
      if (fini) return code
      fini = true
      const lignes = s.lignes()
      const rouges = lignes.filter((l) => l.startsWith('FAIL ')).map((l) => l.split(' ')[1])
      console.log(`${juge} — racine ${racine}${temoin ? ' — témoin' : ''}`)
      for (const n of notes) console.log(`  · ${n}`)
      for (const l of lignes) console.log(l)
      console.log(rouges.length ? `${juge} : FAIL — ${rouges.join(', ')}` : `${juge} : PASS`)
      code = rouges.length ? 1 : 0
      process.exitCode = code
      return code
    },
    /** Lance le corps du juge ; une exception marque en échec tout critère encore non évalué, puis imprime. */
    async executer(corps) {
      try { await corps(s) } catch (e) {
        const msg = `interrompu : ${premiereLigne(e)}`
        let marque = false
        for (const id of ids) if (!s.evalue(id)) { s.echoue(id, msg); marque = true }
        if (!marque) { s.note(`exception après l'évaluation de tous les critères : ${premiereLigne(e)}`); s.echoue(ids[0], msg) }
      }
      return s.fin()
    },
  }
  return s
}

// ── T1 : Lestraque régénéré, identique ────────────────────────────────────────────────────────────────────────────────────
function premiereDifference(a, b) {
  const n = Math.min(a.length, b.length)
  let i = 0
  while (i < n && a[i] === b[i]) i++
  if (i === n && a.length === b.length) return null
  const ligne = a.subarray(0, i).toString('utf8').split('\n').length
  return `octet ${i} (ligne ${ligne}) : généré « ${court(a.subarray(Math.max(0, i - 20), i + 40).toString('utf8'), 70)} » / suivi « ${court(b.subarray(Math.max(0, i - 20), i + 40).toString('utf8'), 70)} » (${a.length} / ${b.length} octets)`
}
/** Lestraque suivi, modifié ou complété en place ? (racine d'un dépôt seulement) → liste de défauts */
function lestraqueEnPlace(racine) {
  const d = []
  const diff = git(['diff', '--quiet', 'HEAD', '--', `${LESTRAQUE}/`], { cwd: racine })
  if (diff.code === 1) {
    const noms = git(['diff', '--name-status', 'HEAD', '--', `${LESTRAQUE}/`], { cwd: racine }).stdout.trim().split('\n').filter(Boolean)
    d.push(`${LESTRAQUE}/ modifié en place (${noms.length} fichier(s) : ${noms.slice(0, 3).join(', ')})`)
  } else if (diff.code !== 0) d.push(`git diff sur ${LESTRAQUE}/ en erreur : ${court(diff.stderr || diff.erreur)}`)
  const autres = git(['ls-files', '--others', '--exclude-standard', '-z', '--', `${LESTRAQUE}/`], { cwd: racine }).stdout.split('\0').filter(Boolean)
  if (autres.length) d.push(`${autres.length} fichier(s) non suivi(s) dans ${LESTRAQUE}/ : ${autres.slice(0, 3).join(', ')}`)
  return d
}
/**
 * T1. Génère Lestraque depuis <racine>/public/sites-demo/generer.mjs dans .orchestre/travail/<juge>/lestraque/ (ou `sortie`,
 * sous .orchestre/travail/), puis compare aux fichiers suivis : blobs de HEAD si <racine> est la racine d'un dépôt, fichiers
 * de <racine>/public/sites-demo/lestraque/ si c'est un arbre extrait (= les fichiers suivis de son commit).
 * → { ok, echecs[], resume, sortie, faits[] }
 */
export function t1({ juge, racine = R, sortie } = {}) {
  if (!juge || !/^[a-z0-9-]+$/.test(juge)) throw new Error('t1 : nom de juge attendu ([a-z0-9-])')
  const dest = exigerSousTravail(sortie ?? path.join(TRAVAIL, juge, 'lestraque'))
  const echecs = [], faits = []
  const fin = (resume) => ({ ok: echecs.length === 0, echecs, faits, resume, sortie: dest })
  const generateur = path.join(racine, 'public', 'sites-demo', 'generer.mjs')
  if (!fichierNonVide(generateur)) { echecs.push(`${generateur} absent ou vide`); return fin('') }
  fs.rmSync(dest, { recursive: true, force: true })
  const g = lancer(process.execPath, [generateur, 'lestraque', `--sortie=${dest}`], { cwd: racine })
  if (g.code !== 0) { echecs.push(`génération de Lestraque en code ${g.code}${g.erreur ? ` (${g.erreur})` : ''} : ${court(g.derniereLigne)}`); return fin('') }
  const depot = estRacineGit(racine)
  const suivi = (f) => depot ? blobGit(racine, 'HEAD', `${LESTRAQUE}/${f}`) : lireOuNull(path.join(racine, LESTRAQUE, f))
  const origine = depot ? 'blob de HEAD' : 'fichier de l\'arbre extrait'
  const tailles = []
  for (const f of ['index.html', 'site.js']) {
    const a = lireOuNull(path.join(dest, f)), b = suivi(f)
    if (!a || !a.length) { echecs.push(`${f} généré absent ou vide`); continue }
    if (!b || !b.length) { echecs.push(`${f} suivi (${origine}) absent ou vide`); continue }
    const d = premiereDifference(a, b)
    if (d) echecs.push(`${f} diffère du suivi à l'${d}`)
    else tailles.push(`${f} ${a.length} o identique`)
  }
  {
    const a = lireOuNull(path.join(dest, 'styles.css')), b = suivi('styles.css')
    if (!a || !a.length) echecs.push('styles.css généré absent ou vide')
    else if (!b || !b.length) echecs.push(`styles.css suivi (${origine}) absent ou vide`)
    else {
      const ia = a.indexOf(0x0a), ib = b.indexOf(0x0a)
      if (ia < 0 || ib < 0) echecs.push('styles.css sans seconde ligne')
      else {
        const ra = a.subarray(ia + 1), rb = b.subarray(ib + 1)
        if (!ra.length || !rb.length) echecs.push('styles.css vide après sa ligne 1')
        else {
          const d = premiereDifference(ra, rb)
          if (d) echecs.push(`styles.css diffère après la ligne 1, à l'${d.replace(/ligne (\d+)/, (_, n) => `ligne ${Number(n) + 1}`)}`)
          else tailles.push(`styles.css ${a.length} o identique hors ligne 1${a.subarray(0, ia).equals(b.subarray(0, ib)) ? ' (ligne 1 identique aussi)' : ''}`)
        }
      }
    }
  }
  if (depot) for (const d of lestraqueEnPlace(racine)) echecs.push(d)
  faits.push(`généré par ${path.relative(R, generateur) || generateur} dans ${path.relative(R, dest)} ; comparé au ${origine}`)
  return fin(`${tailles.join(', ')} (${origine}${depot ? ', Lestraque intact en place' : ''})`)
}

// ── T2 : les neuf démos gelées ─────────────────────────────────────────────────────────────────────────────────────────────
/** Le commit d'un arbre extrait par extraireReference (fichier <dossier>.json), ou null. */
export function commitDeReference(racine) {
  try { return lireJson(`${path.resolve(racine)}.json`).commit || null } catch { return null }
}
/**
 * T2. Racine d'un dépôt : pour chaque démo gelée, des fichiers suivis dans HEAD, index.html non vide, git diff --quiet HEAD
 * (code 0) et aucun fichier non suivi (--exclude-standard ; les ignorés sont comptés dans les faits). Arbre extrait : mêmes
 * fichiers, blob pour blob, que le commit de l'extraction (ou HEAD du dépôt, faute de marque).
 * → { ok, echecs[], resume, faits[] }
 */
export function t2({ racine = R } = {}) {
  const echecs = [], faits = []
  const depot = estRacineGit(racine)
  let total = 0, ignores = 0
  const rev = depot ? 'HEAD' : (commitDeReference(racine) || 'HEAD')
  for (const m of DEMOS_GELEES) {
    const pref = `public/sites-demo/${m}/`
    let arbre
    try { arbre = lsTree(depot ? racine : R, rev, pref) } catch (e) { echecs.push(`${m} : ${premiereLigne(e)}`); continue }
    if (!arbre.size) { echecs.push(`${m} : aucun fichier suivi sous ${pref} à ${rev}`); continue }
    if (!fichierNonVide(path.join(racine, pref, 'index.html'))) echecs.push(`${m} : index.html absent ou vide`)
    total += arbre.size
    if (depot) {
      const d = git(['diff', '--quiet', 'HEAD', '--', pref], { cwd: racine })
      if (d.code === 1) {
        const noms = git(['diff', '--name-status', 'HEAD', '--', pref], { cwd: racine }).stdout.trim().split('\n').filter(Boolean)
        echecs.push(`${m} : modifiée (${noms.length} : ${noms.slice(0, 3).join(', ')})`)
      } else if (d.code !== 0) echecs.push(`${m} : git diff en erreur (${court(d.stderr || d.erreur)})`)
      const autres = git(['ls-files', '--others', '--exclude-standard', '-z', '--', pref], { cwd: racine }).stdout.split('\0').filter(Boolean)
      if (autres.length) echecs.push(`${m} : ${autres.length} fichier(s) non suivi(s) (${autres.slice(0, 3).join(', ')})`)
      const ign = git(['ls-files', '--others', '--ignored', '--exclude-standard', '-z', '--', pref], { cwd: racine }).stdout.split('\0').filter(Boolean)
      if (ign.length) { ignores += ign.length; faits.push(`${m} : ${ign.length} fichier(s) ignoré(s) par .gitignore (${[...new Set(ign.map((f) => f.slice(pref.length).split('/')[0]))].slice(0, 3).join(', ')}), hors T2`) }
    } else {
      const disque = listerFichiers(path.join(racine, pref))
      const manquants = [...arbre.keys()].filter((k) => !disque.has(k.slice(pref.length)))
      const intrus = [...disque].filter((k) => !arbre.has(pref + k))
      const differents = [...arbre].filter(([k, v]) => disque.has(k.slice(pref.length)) && shaBlob(fs.readFileSync(path.join(racine, k))) !== v.sha).map(([k]) => k)
      if (manquants.length) echecs.push(`${m} : ${manquants.length} fichier(s) manquant(s) (${manquants.slice(0, 3).join(', ')})`)
      if (intrus.length) echecs.push(`${m} : ${intrus.length} fichier(s) en trop (${intrus.slice(0, 3).join(', ')})`)
      if (differents.length) echecs.push(`${m} : ${differents.length} fichier(s) différent(s) de ${rev.slice(0, 7)} (${differents.slice(0, 3).join(', ')})`)
    }
  }
  return { ok: echecs.length === 0, echecs, faits, resume: `${DEMOS_GELEES.length} démos gelées, ${total} fichiers suivis, ${depot ? 'aucune modification ni fichier non suivi' : `identiques blob pour blob à ${rev.slice(0, 7)}`}${ignores ? ` (${ignores} ignoré(s) hors T2)` : ''}` }
}

// ── La configuration du typecheck ─────────────────────────────────────────────────────────────────────────────────────────
/**
 * « npm run typecheck est vert » ne prouve rien si le vérificateur a été assoupli : tsconfig.json de <racine> doit être celui de
 * 1620723 (fins de ligne ramenées à LF), et le script typecheck de package.json le même (aucune fiche 025 ne touche l'un ni
 * l'autre). Les fichiers jugés ne doivent porter aucun @ts-nocheck, ni plus de @ts-ignore / @ts-expect-error qu'à 1620723.
 * → liste des défauts (vide = conforme).
 */
// 28/09 : depuis 25bc2058 (27/09), les dossiers témoins des juges (scripts/fixtures/**/temoin(s) : du code faux exprès) sont
// exclus du typecheck du dépôt. Seuls ces deux ajouts à "exclude" sont admis, liste fermée ; tout le reste de tsconfig.json
// doit rester celui de REFERENCE_COMMIT (un "exclude" retiré ou un autre ajouté reste un assouplissement).
const EXCLUS_ADMIS = ['scripts/fixtures/**/temoins', 'scripts/fixtures/**/temoin']
function tsconfigEquivalent(ts, tsRef) {
  if (ts === tsRef) return true
  let a, b
  try { a = JSON.parse(tsRef); b = JSON.parse(ts) } catch { return false }
  const exA = Array.isArray(a.exclude) ? a.exclude : [], exB = Array.isArray(b.exclude) ? b.exclude : []
  if (exA.some((x) => !exB.includes(x)) || exB.some((x) => !exA.includes(x) && !EXCLUS_ADMIS.includes(x))) return false
  return JSON.stringify({ ...a, exclude: null }) === JSON.stringify({ ...b, exclude: null })
}
export function defautsTypecheck(racine, fichiersJuges = []) {
  const d = []
  const lf = (b) => (b ? b.toString('utf8').replace(/\r\n/g, '\n') : null)
  const tsRef = lf(blobGit(R, REFERENCE_COMMIT, 'tsconfig.json')), ts = lf(lireOuNull(path.join(racine, 'tsconfig.json')))
  if (ts === null) d.push('tsconfig.json absent de la racine')
  else if (tsRef === null) d.push(`tsconfig.json introuvable à ${REFERENCE_COMMIT}`)
  else if (!tsconfigEquivalent(ts, tsRef)) {
    const a = tsRef.split('\n'), b = ts.split('\n')
    const k = b.findIndex((l, i) => l !== a[i])
    d.push(`tsconfig.json diffère de ${REFERENCE_COMMIT} (ligne ${k + 1} : « ${court(b[k] ?? '(fin)', 70)} » au lieu de « ${court(a[k] ?? '(fin)', 70)} ») : le typecheck ne se juge qu'avec la configuration d'origine`)
  }
  let script = null, scriptRef = null
  try { script = JSON.parse(lf(lireOuNull(path.join(racine, 'package.json'))) || '{}').scripts?.typecheck ?? null } catch { d.push('package.json illisible') }
  try { scriptRef = JSON.parse(lf(blobGit(R, REFERENCE_COMMIT, 'package.json')) || '{}').scripts?.typecheck ?? null } catch { /* signalé ci-dessous */ }
  if (!scriptRef) d.push(`script typecheck introuvable à ${REFERENCE_COMMIT}`)
  else if (script !== scriptRef) d.push(`package.json : "typecheck" vaut ${JSON.stringify(script)}, ${JSON.stringify(scriptRef)} attendu (celui de ${REFERENCE_COMMIT})`)
  const compter = (t) => (String(t ?? '').match(/@ts-(?:ignore|expect-error)/g) || []).length
  for (const f of fichiersJuges) {
    const t = lf(lireOuNull(path.join(racine, f)))
    if (t === null) continue
    if (/@ts-nocheck/.test(t)) d.push(`${f} porte @ts-nocheck`)
    const avant = compter(lf(blobGit(R, REFERENCE_COMMIT, f)))
    if (compter(t) > avant) d.push(`${f} : ${compter(t)} @ts-ignore / @ts-expect-error, ${avant} à ${REFERENCE_COMMIT}`)
  }
  return d
}

// ── Serveur statique local ────────────────────────────────────────────────────────────────────────────────────────────────
const TYPES = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8', mjs: 'text/javascript; charset=utf-8', json: 'application/json; charset=utf-8', svg: 'image/svg+xml', xml: 'application/xml', txt: 'text/plain; charset=utf-8', webp: 'image/webp', avif: 'image/avif', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', ico: 'image/x-icon', woff2: 'font/woff2', woff: 'font/woff', mp4: 'video/mp4', webm: 'video/webm', pdf: 'application/pdf' }
/**
 * Sert un ou plusieurs dossiers (le premier qui a le fichier gagne) sur 127.0.0.1, port libre.
 * routes : { '/api/leads': async (q) => ({ statut, corps, entetes }) | { coupure: true } } ; q = { methode, chemin, recherche,
 * entetes, corps (Buffer), texte, json (ou undefined), t }. Une réponse { coupure: true } (ou null) coupe la connexion sans
 * réponse (erreur réseau côté page). entetes : ajoutés à chaque fichier servi (ex. une CSP). Toutes les requêtes sont
 * journalisées dans `requetes`. Un dossier demandé sans barre finale est redirigé (301) vers « …/ ».
 * → { base, port, requetes, fermer() }
 */
export async function servir(racines, { routes = {}, entetes = {} } = {}) {
  const dossiers = (Array.isArray(racines) ? racines : [racines]).map((d) => path.resolve(d))
  for (const d of dossiers) if (!fs.existsSync(d) || !fs.statSync(d).isDirectory()) throw new Error(`servir : ${d} n'est pas un dossier`)
  const requetes = []
  const srv = http.createServer(async (q, r) => {
    try {
      const url = new URL(q.url, 'http://local')
      let chemin
      try { chemin = decodeURIComponent(url.pathname) } catch { r.writeHead(400); return r.end() }
      const morceaux = []
      for await (const m of q) morceaux.push(m)
      const corps = Buffer.concat(morceaux)
      let json
      try { json = corps.length ? JSON.parse(corps.toString('utf8')) : undefined } catch { json = undefined }
      const entree = { methode: q.method, chemin, recherche: url.search, entetes: q.headers, corps, texte: corps.toString('utf8'), json, t: Date.now() }
      requetes.push(entree)
      if (Object.prototype.hasOwnProperty.call(routes, chemin)) {
        const rep = await routes[chemin](entree)
        if (!rep || rep.coupure) { q.socket.destroy(); return }
        const objet = rep.corps !== undefined && rep.corps !== null && typeof rep.corps === 'object' && !Buffer.isBuffer(rep.corps)
        r.writeHead(rep.statut ?? 200, { 'content-type': objet ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8', 'cache-control': 'no-store', ...(rep.entetes || {}) })
        return r.end(objet ? JSON.stringify(rep.corps) : (rep.corps ?? ''))
      }
      if (q.method !== 'GET' && q.method !== 'HEAD') { r.writeHead(405, { allow: 'GET, HEAD' }); return r.end() }
      for (const base of dossiers) {
        const f = path.join(base, chemin)
        if (!(path.relative(base, f) === '' || sous(base, f))) continue
        let st
        try { st = fs.statSync(f) } catch { continue }
        let cible = f
        if (st.isDirectory()) {
          if (!chemin.endsWith('/')) { r.writeHead(301, { location: `${url.pathname}/${url.search}` }); return r.end() }
          cible = path.join(f, 'index.html')
          if (!fs.existsSync(cible)) continue
        } else if (!st.isFile()) continue
        const ext = path.extname(cible).slice(1).toLowerCase()
        r.writeHead(200, { 'content-type': TYPES[ext] || 'application/octet-stream', 'cache-control': 'no-store', ...entetes })
        if (q.method === 'HEAD') return r.end()
        return fs.createReadStream(cible).pipe(r)
      }
      r.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); r.end('introuvable')
    } catch (e) {
      try { r.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' }); r.end(premiereLigne(e)) } catch { /* réponse déjà partie */ }
    }
  })
  const sockets = new Set()
  srv.on('connection', (s) => { sockets.add(s); s.on('close', () => sockets.delete(s)) })
  await new Promise((ok, ko) => { srv.once('error', ko); srv.listen(0, '127.0.0.1', ok) })
  const port = srv.address().port
  return { base: `http://127.0.0.1:${port}`, port, requetes, fermer: () => new Promise((ok) => { for (const s of sockets) s.destroy(); srv.close(() => ok()) }) }
}

// ── Playwright et captures ────────────────────────────────────────────────────────────────────────────────────────────────
/** Un navigateur de Playwright (node_modules) : 'chromium' (défaut), 'webkit' ou 'firefox'. À fermer par l'appelant. */
export async function lancerNavigateur(moteur = 'chromium', options = {}) {
  const pw = await import('playwright')
  if (!pw[moteur] || typeof pw[moteur].launch !== 'function') throw new Error(`moteur Playwright inconnu : ${moteur}`)
  return pw[moteur].launch({ headless: true, ...options })
}
export const BUREAU = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }
export const TELEPHONE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
/** Défilement horizontal de la page, en px CSS (0 = aucun) : max(scrollWidth de html et body) − innerWidth. */
export const defilementHorizontal = (page) => page.evaluate(() => Math.max(document.documentElement.scrollWidth, document.body ? document.body.scrollWidth : 0) - window.innerWidth)
/**
 * Examine une image sur le disque : présente, > 0 octet, lisible par sharp, au format attendu (jpeg pour .jpg/.jpeg, png pour
 * .png), aux dimensions attendues si données, ≤ maxOctets, et non uniforme (écart-type du gris ≥ ecartTypeMin, 8 par défaut).
 * → { ok, raisons[], octets, largeur, hauteur, format, ecartType, moyenne, partDominante }
 */
export async function verifierImage(fichier, { maxOctets = Infinity, largeur, hauteur, ecartTypeMin = 8, format } = {}) {
  const raisons = []
  const res = { ok: false, raisons, octets: taille(fichier), largeur: 0, hauteur: 0, format: '', ecartType: 0, moyenne: 0, partDominante: 1 }
  if (res.octets < 0) { raisons.push('absente'); return res }
  if (res.octets === 0) { raisons.push('0 octet'); return res }
  if (res.octets > maxOctets) raisons.push(`${res.octets} octets, ${maxOctets} au plus`)
  const attendu = format || ({ '.jpg': 'jpeg', '.jpeg': 'jpeg', '.png': 'png', '.webp': 'webp', '.avif': 'heif' })[path.extname(fichier).toLowerCase()]
  try {
    const sharp = (await import('sharp')).default
    const meta = await sharp(fichier).metadata()
    res.largeur = meta.width || 0; res.hauteur = meta.height || 0; res.format = meta.format || ''
    if (attendu && res.format !== attendu) raisons.push(`format ${res.format || 'inconnu'}, ${attendu} attendu`)
    if (largeur !== undefined && res.largeur !== largeur) raisons.push(`largeur ${res.largeur} px, ${largeur} attendue`)
    if (hauteur !== undefined && res.hauteur !== hauteur) raisons.push(`hauteur ${res.hauteur} px, ${hauteur} attendue`)
    const { data, info } = await sharp(fichier).removeAlpha().greyscale().raw().toBuffer({ resolveWithObject: true })
    const pas = info.channels, n = Math.floor(data.length / pas)
    if (!n) raisons.push('aucun pixel')
    else {
      const hist = new Float64Array(256)
      let somme = 0, carres = 0
      for (let i = 0; i < data.length; i += pas) { const v = data[i]; hist[v]++; somme += v; carres += v * v }
      res.moyenne = somme / n
      res.ecartType = Math.sqrt(Math.max(0, carres / n - res.moyenne ** 2))
      let pic = 0
      for (let v = 0; v < 256; v++) { let s = 0; for (let k = Math.max(0, v - 2); k <= Math.min(255, v + 2); k++) s += hist[k]; if (s > pic) pic = s }
      res.partDominante = pic / n
      if (res.ecartType < ecartTypeMin) raisons.push(`uniforme : écart-type du gris ${res.ecartType.toFixed(2)}, ${ecartTypeMin} au moins`)
    }
  } catch (e) { raisons.push(`illisible : ${premiereLigne(e)}`) }
  res.ok = raisons.length === 0
  return res
}
/**
 * Capture prise par le juge : efface d'abord `fichier` (jamais une capture d'avant), puis page.screenshot en JPEG (ou PNG si
 * .png), en pixels CSS par défaut, et la vérifie (verifierImage : dimensions = fenêtre, ou clip, sauf pleine page).
 * options : plein (pleine page), clip, qualite (JPEG, 80), maxOctets, ecartTypeMin, echelle ('css' | 'device').
 * → le résultat de verifierImage, avec `fichier`.
 */
export async function capturer(page, fichier, { plein = false, clip, qualite = 80, maxOctets = Infinity, ecartTypeMin = 8, echelle = 'css' } = {}) {
  fs.mkdirSync(path.dirname(fichier), { recursive: true })
  fs.rmSync(fichier, { force: true })
  const png = /\.png$/i.test(fichier)
  await page.screenshot({ path: fichier, type: png ? 'png' : 'jpeg', fullPage: plein, clip, scale: echelle, ...(png ? {} : { quality: qualite }) })
  const vp = page.viewportSize()
  const facteur = echelle === 'css' ? 1 : await page.evaluate(() => window.devicePixelRatio)
  const largeur = clip ? Math.round(clip.width * facteur) : plein ? undefined : vp && Math.round(vp.width * facteur)
  const hauteur = clip ? Math.round(clip.height * facteur) : plein ? undefined : vp && Math.round(vp.height * facteur)
  return { fichier, ...(await verifierImage(fichier, { maxOctets, ecartTypeMin, largeur, hauteur })) }
}

// ── L'arbre de référence (git archive <commit>) ──────────────────────────────────────────────────────────────────────────
function lirePax(buf) {
  const out = {}
  let i = 0
  while (i < buf.length) {
    const esp = buf.indexOf(0x20, i)
    if (esp < 0) break
    const long = parseInt(buf.subarray(i, esp).toString('ascii'), 10)
    if (!(long > 0)) break
    const enr = buf.subarray(esp + 1, i + long - 1) // sans le \n final
    const eg = enr.indexOf(0x3d)
    if (eg > 0) out[enr.subarray(0, eg).toString('utf8')] = enr.subarray(eg + 1).toString('utf8')
    i += long
  }
  return out
}
/** Lit une archive tar (ustar + pax, telle que git archive l'écrit) et l'écrit sous `dest`. → { commit, fichiers, octets } */
export function extraireTar(fichierTar, dest) {
  const fd = fs.openSync(fichierTar, 'r')
  const total = fs.fstatSync(fd).size
  const tete = Buffer.alloc(512)
  const champ = (b, debut, long) => { const s = b.subarray(debut, debut + long); const z = s.indexOf(0); return (z < 0 ? s : s.subarray(0, z)).toString('utf8') }
  const octal = (b, debut, long) => { const t = champ(b, debut, long).trim(); return t ? parseInt(t, 8) : 0 }
  let pos = 0, cheminPax = null, commit = null, fichiers = 0, octets = 0
  const lire = (debut, n) => { const b = Buffer.alloc(n); let lu = 0; while (lu < n) { const k = fs.readSync(fd, b, lu, n - lu, debut + lu); if (!k) throw new Error('archive tronquée'); lu += k } return b }
  try {
    for (;;) {
      if (pos + 512 > total) throw new Error('archive tronquée (pas de bloc de fin)')
      fs.readSync(fd, tete, 0, 512, pos)
      if (tete.every((x) => x === 0)) break
      let somme = 0
      for (let i = 0; i < 512; i++) somme += i >= 148 && i < 156 ? 32 : tete[i]
      if (somme !== octal(tete, 148, 8)) throw new Error(`en-tête tar corrompu à l'octet ${pos}`)
      const type = String.fromCharCode(tete[156] || 0x30)
      const long = octal(tete, 124, 12)
      const nom = champ(tete, 0, 100), prefixe = champ(tete, 345, 155)
      const contenu = long ? lire(pos + 512, long) : Buffer.alloc(0)
      pos += 512 + Math.ceil(long / 512) * 512
      if (type === 'g') { const p = lirePax(contenu); if (p.comment) commit = p.comment.trim(); continue }
      if (type === 'x') { cheminPax = lirePax(contenu).path ?? null; continue }
      const rel = cheminPax ?? (prefixe ? `${prefixe}/${nom}` : nom)
      cheminPax = null
      const cible = path.resolve(dest, rel)
      if (!sous(dest, cible)) throw new Error(`entrée hors de la destination : ${rel}`)
      if (type === '5') { fs.mkdirSync(cible, { recursive: true }); continue }
      if (type !== '0') throw new Error(`entrée tar de type « ${type} » non prise en charge : ${rel}`)
      fs.mkdirSync(path.dirname(cible), { recursive: true })
      fs.writeFileSync(cible, contenu)
      fichiers++; octets += long
    }
  } finally { fs.closeSync(fd) }
  return { commit, fichiers, octets }
}
/** Compare un arbre sur le disque au commit : mêmes fichiers, même blob chacun. → { ok, fichiers, octets, manquants, intrus, differents } */
export function verifierArbre(dossier, commit) {
  const arbre = lsTree(R, commit)
  const disque = listerFichiers(dossier)
  const manquants = [...arbre.keys()].filter((k) => !disque.has(k))
  const intrus = [...disque].filter((k) => !arbre.has(k))
  let octets = 0
  const differents = []
  for (const [k, v] of arbre) {
    if (!disque.has(k)) continue
    const b = fs.readFileSync(path.join(dossier, k))
    octets += b.length
    if (shaBlob(b) !== v.sha) differents.push(k)
  }
  return { ok: !manquants.length && !intrus.length && !differents.length && arbre.size > 0, fichiers: arbre.size, octets, manquants, intrus, differents }
}
/**
 * Extrait le commit (1620723 par défaut) dans .orchestre/travail/025-01/reference/ et écrit la marque reference.json à côté.
 * Réutilise l'arbre s'il est déjà là, marqué du même commit et identique blob pour blob ; sinon (ou forcer) le refait :
 * git archive --output=<dest>.tar (sous .orchestre/travail/), lecture tar ici, vérification, puis renommage atomique.
 * → { dest, commit (sha complet), fichiers, octets, reutilise }
 */
export function extraireReference({ commit = REFERENCE_COMMIT, dest = REFERENCE_DOSSIER, forcer = false } = {}) {
  exigerSousTravail(dest)
  const sha = revParse(commit)
  const marque = `${dest}.json`
  if (!forcer && fs.existsSync(dest) && commitDeReference(dest) === sha) {
    const v = verifierArbre(dest, sha)
    if (v.ok) return { dest, commit: sha, fichiers: v.fichiers, octets: v.octets, reutilise: true }
  }
  const partiel = `${dest}.partiel`, tar = `${dest}.tar`
  fs.rmSync(partiel, { recursive: true, force: true }); fs.rmSync(tar, { force: true })
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  try {
    const g = git(['-c', 'core.autocrlf=false', '-c', 'core.eol=lf', 'archive', '--format=tar', `--output=${tar.split(path.sep).join('/')}`, sha])
    if (g.code !== 0 || !fichierNonVide(tar)) throw new Error(`git archive ${sha.slice(0, 7)} en échec : ${court(g.stderr || g.erreur)}`)
    const x = extraireTar(tar, partiel)
    if (x.commit && x.commit !== sha) throw new Error(`l'archive porte le commit ${x.commit}, ${sha} attendu`)
    const v = verifierArbre(partiel, sha)
    if (!v.ok) throw new Error(`arbre extrait différent de ${sha.slice(0, 7)} : ${v.manquants.length} manquant(s), ${v.intrus.length} en trop, ${v.differents.length} différent(s) (${[...v.manquants, ...v.intrus, ...v.differents].slice(0, 3).join(', ')})`)
    fs.rmSync(dest, { recursive: true, force: true })
    fs.rmSync(marque, { force: true })
    for (let essai = 0; ; essai++) {
      try { fs.renameSync(partiel, dest); break } catch (e) { if (essai >= 4) throw e; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500) }
    }
    fs.writeFileSync(marque, `${JSON.stringify({ commit: sha, demande: commit, fichiers: v.fichiers, octets: v.octets, extrait_le: new Date().toISOString(), par: 'scripts/fixtures/025/commun.mjs extraireReference' }, null, 1)}\n`)
    return { dest, commit: sha, fichiers: v.fichiers, octets: v.octets, reutilise: false }
  } finally {
    fs.rmSync(tar, { force: true })
    fs.rmSync(partiel, { recursive: true, force: true })
  }
}

// ── Jeux d'essai ──────────────────────────────────────────────────────────────────────────────────────────────────────────
/** L'expression « première personne » de generer.mjs:200 (vérifierArtisan), recopiée ; voir premierePersonneDuGenerateur. */
export const PREMIERE_PERSONNE = /(?<![\p{L}])(?:je|me|moi|mon|ma|mes)(?![\p{L}])|(?<![\p{L}])[jm]’(?=\p{L})/iu
/** L'expression « première personne » lue dans <racine>/public/sites-demo/generer.mjs (le test sur a.citation), ou null. */
export function premierePersonneDuGenerateur(racine = R) {
  const src = lireOuNull(path.join(racine, 'public', 'sites-demo', 'generer.mjs'))
  if (!src) return null
  const m = /if \(!(\/(?:\\.|[^/\n])+\/[a-z]*)\.test\(a\.citation\)\)/.exec(src.toString('utf8'))
  if (!m) return null
  const fin = m[1].lastIndexOf('/')
  try { return new RegExp(m[1].slice(1, fin), m[1].slice(fin + 1)) } catch { return null }
}
const CLES_ARTISAN = ['prenom', 'nom', 'installation', 'parcours', 'citation', 'chiffres']
/**
 * Le contrat matiere.artisan (fiche 025-01, « Contrat matiere.artisan » ; bornes de generer.mjs:193-222) :
 * { prenom (1-40 signes), nom (1-60), installation (entier de 1960 à l'année en cours), parcours (1-140, une ligne),
 *   citation (20-160, première personne), chiffres: null ou trois { valeur (nombre > 0, 12 signes au plus), unite (12 au
 *   plus, facultatif), legende (1-60) } }. Signes comptés comme generer.mjs (String.length) ; valeur lue comme lui (virgule
 * décimale et espaces admis). → liste des défauts (vide = conforme).
 */
export function erreursArtisan(a, { annee = new Date().getFullYear() } = {}) {
  if (!a || typeof a !== 'object' || Array.isArray(a)) return ['artisan : objet attendu']
  const e = []
  for (const k of Object.keys(a)) if (!CLES_ARTISAN.includes(k)) e.push(`artisan.${k} : clé hors contrat`)
  const texte = (k, min, max) => {
    const v = a[k]
    if (typeof v !== 'string' || !v.trim()) { e.push(`artisan.${k} : texte non vide attendu`); return null }
    if (v.length < min || v.length > max) e.push(`artisan.${k} : ${v.length} signes, ${min} à ${max}`)
    return v
  }
  texte('prenom', 1, 40)
  texte('nom', 1, 60)
  if (!Number.isInteger(a.installation) || a.installation < 1960 || a.installation > annee) e.push(`artisan.installation « ${a.installation} » : entier de 1960 à ${annee}`)
  const p = texte('parcours', 1, 140)
  if (p !== null && /[\r\n]/.test(p)) e.push('artisan.parcours : une ligne (aucun retour à la ligne)')
  const c = texte('citation', 20, 160)
  if (c !== null && !PREMIERE_PERSONNE.test(c)) e.push(`artisan.citation « ${court(c, 60)} » : pas à la première personne`)
  if (!('chiffres' in a)) e.push('artisan.chiffres : null ou trois chiffres attendus (clé absente)')
  else if (a.chiffres !== null) {
    if (!Array.isArray(a.chiffres) || a.chiffres.length !== 3) e.push('artisan.chiffres : null ou exactement trois chiffres')
    else a.chiffres.forEach((x, i) => {
      if (!x || typeof x !== 'object' || Array.isArray(x)) { e.push(`artisan.chiffres[${i}] : objet attendu`); return }
      for (const k of Object.keys(x)) if (!['valeur', 'unite', 'legende'].includes(k)) e.push(`artisan.chiffres[${i}].${k} : clé hors contrat`)
      const brut = typeof x.valeur === 'number' ? String(x.valeur) : typeof x.valeur === 'string' ? x.valeur : null
      const n = brut === null ? NaN : Number(brut.replace(',', '.').replace(/\s/g, ''))
      if (brut === null || !brut.trim() || brut.length > 12 || !Number.isFinite(n) || n <= 0) e.push(`artisan.chiffres[${i}].valeur « ${x.valeur} » : nombre > 0 de 12 signes au plus`)
      if (x.unite !== undefined && x.unite !== null && x.unite !== '' && (typeof x.unite !== 'string' || x.unite.length > 12)) e.push(`artisan.chiffres[${i}].unite : texte de 12 signes au plus`)
      if (typeof x.legende !== 'string' || !x.legende.trim() || x.legende.length > 60) e.push(`artisan.chiffres[${i}].legende : 1 à 60 signes`)
    })
  }
  return e
}
/** maquette-exemple.json, lu et vérifié (lève une Error sur un défaut). */
export function lireMaquetteExemple() {
  const m = lireJson(MAQUETTE_EXEMPLE)
  const d = erreursMaquette(m)
  if (d.length) throw new Error(`maquette-exemple.json : ${d.join(' ; ')}`)
  return m
}
function erreursMaquette(m) {
  const e = []
  const permises = ['_', 'entreprise', 'metier', 'ville', 'communes', 'modele', 'source_fait']
  for (const k of Object.keys(m || {})) if (!permises.includes(k)) e.push(`clé hors format : ${k} (ni téléphone, ni SIREN, ni photo du prospect)`)
  for (const k of ['entreprise', 'metier', 'ville', 'modele']) if (typeof m[k] !== 'string' || !m[k].trim()) e.push(`${k} manque`)
  if (!Array.isArray(m.communes) || !m.communes.length || m.communes.some((c) => typeof c !== 'string' || !c.trim())) e.push('communes : liste de noms attendue')
  else if (!m.communes.includes(m.ville)) e.push('ville absente de communes')
  const f = m.source_fait
  if (!f || typeof f.fait !== 'string' || f.fait.trim().length < 20 || typeof f.source !== 'string' || !/^https:\/\/\S+$/.test(f.source) || typeof f.repere !== 'string' || f.repere.length < 6 || !f.fait.includes(f.repere)) e.push('source_fait : { fait (20 signes au moins, contient son repère), source (https), repere } attendu')
  return e
}
/** Le nom de l'entreprise fictive du jeu d'essai (MQ-9 le cherche ; ne jamais l'écrire dans un fichier suivi hors du jeu d'essai). */
export const nomFictif = () => lireMaquetteExemple().entreprise
/** commande.json d'un dossier de commande (défaut : le jeu d'essai). */
export const lireCommande = (dossier = COMMANDE_EXEMPLE) => lireJson(path.join(dossier, 'commande.json'))
/**
 * Copie le dossier de commande du jeu d'essai sous .orchestre/travail/ (`dans`, vidé d'abord) ; variante 'sans-chiffres' :
 * commande.json y est remplacé par commande-sans-chiffres.json. → le chemin du dossier prêt pour generer.mjs --source=.
 */
export function preparerCommande({ variante = 'complete', dans } = {}) {
  if (!['complete', 'sans-chiffres'].includes(variante)) throw new Error(`preparerCommande : variante « ${variante} » inconnue (complete, sans-chiffres)`)
  const d = exigerSousTravail(dans)
  fs.rmSync(d, { recursive: true, force: true })
  fs.cpSync(COMMANDE_EXEMPLE, d, { recursive: true })
  if (variante === 'sans-chiffres') fs.copyFileSync(COMMANDE_SANS_CHIFFRES, path.join(d, 'commande.json'))
  return d
}
const egal = (a, b) => JSON.stringify(a) === JSON.stringify(b)
/**
 * Vérifie les jeux d'essai contre le dépôt : format de maquette-exemple.json et unicité du nom (git grep, hors
 * scripts/fixtures/025/ et .orchestre/) ; commande.json (champs, contrat matiere.artisan avec trois chiffres) ; la variante
 * sans chiffres identique à chiffres: null près ; contenu.json identique au blob de Lestraque à 1620723 ; chaque photo
 * identique au blob de Lestraque, non vide, avec auteur, licence et source dans photos/attributions.json, et référencée ;
 * les bases de matiere.photos présentes. → { ok, echecs[], resume, faits[] }
 */
export function verifierJeuxEssai() {
  const echecs = [], faits = []
  // maquette
  let m = null
  try { m = lireJson(MAQUETTE_EXEMPLE) } catch (e) { echecs.push(`maquette-exemple.json illisible : ${premiereLigne(e)}`) }
  if (m) {
    for (const d of erreursMaquette(m)) echecs.push(`maquette-exemple.json : ${d}`)
    if (m.metier !== 'menuisier' || m.modele !== 'menuisier') echecs.push('maquette-exemple.json : métier et modèle menuisier attendus')
    if (typeof m.entreprise === 'string' && m.entreprise.trim()) {
      const ailleurs = gitGrepFichiers(R, m.entreprise, { exclure: ['scripts/fixtures/025', '.orchestre'] })
      if (ailleurs.length) echecs.push(`le nom fictif apparaît dans ${ailleurs.length} fichier(s) suivi(s) hors du jeu d'essai : ${ailleurs.slice(0, 3).join(', ')}`)
      if (typeof m.source_fait?.repere === 'string') {
        const rep = gitGrepFichiers(R, m.source_fait.repere, { exclure: ['scripts/fixtures/025', '.orchestre'] })
        if (rep.length) echecs.push(`le repère du fait sourcé apparaît dans ${rep.slice(0, 3).join(', ')}`)
      }
      faits.push(`maquette : ${m.communes?.length ?? 0} communes autour de ${m.ville}, modèle ${m.modele}, nom absent des fichiers suivis hors jeu d'essai`)
    }
  }
  // commande
  let c = null, s = null
  try { c = lireCommande() } catch (e) { echecs.push(`commande-exemple/commande.json illisible : ${premiereLigne(e)}`) }
  try { s = lireJson(COMMANDE_SANS_CHIFFRES) } catch (e) { echecs.push(`commande-sans-chiffres.json illisible : ${premiereLigne(e)}`) }
  let bases = new Set()
  if (c) {
    if (!/^[a-z0-9](?:[a-z0-9-]{1,48})[a-z0-9]$/.test(c.slug || '')) echecs.push(`commande.json : slug « ${c.slug} » invalide`)
    for (const k of ['nom', 'email', 'telephone', 'metier']) if (typeof c[k] !== 'string' || !c[k].trim()) echecs.push(`commande.json : ${k} manque`)
    if (!/^[^@\s]+@[^@\s]+\.invalid$/.test(c.email || '')) echecs.push('commande.json : e-mail fictif en .invalid attendu (RFC 2606)')
    if (!/^\+33 2 61 91 \d\d \d\d$/.test(c.telephone || '')) echecs.push('commande.json : téléphone de la plage 02 61 91 (fiction, Arcep) attendu')
    if (!Array.isArray(c.communes) || !c.communes.length) echecs.push('commande.json : communes manquent')
    if (!['existant', 'a_prendre', 'aucun'].includes(c.domaine_mode)) echecs.push('commande.json : domaine_mode invalide')
    if (!c.matiere || typeof c.matiere !== 'object') echecs.push('commande.json : matiere manque')
    else {
      const d = erreursArtisan(c.matiere.artisan)
      for (const x of d) echecs.push(`commande.json : ${x}`)
      if (!Array.isArray(c.matiere.artisan?.chiffres)) echecs.push('commande.json : trois chiffres attendus (la variante sans chiffres est à part)')
      if ((c.matiere.photos || []).length < 3) echecs.push('commande.json : 3 photos au moins (PHOTOS_MIN)')
      bases = new Set((c.matiere.photos || []).map((p) => p.base))
    }
  }
  if (c && s) {
    const attendu = JSON.parse(JSON.stringify(c)); if (attendu.matiere?.artisan) attendu.matiere.artisan.chiffres = null
    const sansNote = (o) => { const x = JSON.parse(JSON.stringify(o)); delete x._; return x }
    if (!egal(sansNote(s), sansNote(attendu))) echecs.push('commande-sans-chiffres.json : doit être commande.json avec matiere.artisan.chiffres = null, rien d\'autre')
    if (s.matiere?.artisan?.chiffres !== null) echecs.push('commande-sans-chiffres.json : chiffres doit valoir null')
    for (const x of erreursArtisan(s.matiere?.artisan)) echecs.push(`commande-sans-chiffres.json : ${x}`)
  }
  // contenu.json
  const contenu = lireOuNull(path.join(COMMANDE_EXEMPLE, 'contenu.json'))
  const contenuRef = blobGit(R, REFERENCE_COMMIT, `${LESTRAQUE}/contenu.json`)
  if (!contenu || !contenu.length) echecs.push('commande-exemple/contenu.json absent ou vide')
  else if (!contenuRef || !contenu.equals(contenuRef)) echecs.push(`commande-exemple/contenu.json diffère de ${LESTRAQUE}/contenu.json à ${REFERENCE_COMMIT}`)
  else {
    try { const j = JSON.parse(contenu.toString('utf8')); if (!j.pages?.['/']?.h1Ligne) echecs.push('contenu.json : pages["/"].h1Ligne manque (format v2)') } catch (e) { echecs.push(`contenu.json illisible : ${premiereLigne(e)}`) }
  }
  // photos
  const DP = path.join(COMMANDE_EXEMPLE, 'photos')
  let attributions = []
  try { attributions = lireJson(path.join(DP, 'attributions.json')) } catch (e) { echecs.push(`photos/attributions.json illisible : ${premiereLigne(e)}`) }
  const fichiers = [...listerFichiers(DP)].filter((f) => f !== 'attributions.json')
  const decrits = new Map()
  for (const a of Array.isArray(attributions) ? attributions : []) {
    const nomF = String(a.fichier || '').replace(/^images\//, '')
    if (!nomF || nomF.includes('/')) { echecs.push(`attribution sans fichier valide : ${court(JSON.stringify(a), 80)}`); continue }
    decrits.set(nomF, a)
    for (const k of ['auteur', 'licence', 'source', 'base']) if (typeof a[k] !== 'string' || !a[k].trim()) echecs.push(`photos/${nomF} : ${k} manque dans attributions.json`)
    if (typeof a.source === 'string' && !/^https:\/\//.test(a.source)) echecs.push(`photos/${nomF} : source non https`)
  }
  let octets = 0
  for (const f of fichiers) {
    const b = lireOuNull(path.join(DP, f))
    if (!b || !b.length) { echecs.push(`photos/${f} vide`); continue }
    octets += b.length
    if (!decrits.has(f)) echecs.push(`photos/${f} sans attribution`)
    const ref = blobGit(R, REFERENCE_COMMIT, `${LESTRAQUE}/images/${f}`)
    if (!ref || !b.equals(ref)) echecs.push(`photos/${f} n'est pas la photo de Lestraque du même nom`)
  }
  for (const f of decrits.keys()) if (!fichiers.includes(f)) echecs.push(`attribution de ${f} sans fichier dans photos/`)
  const basesPhotos = new Set([...decrits.values()].map((a) => a.base))
  for (const b of bases) if (!basesPhotos.has(b)) echecs.push(`matiere.photos cite la base « ${b} », absente de photos/`)
  if (fichiers.length < 6) echecs.push(`photos/ : ${fichiers.length} fichier(s), 6 au moins (3 photos × avif + webp)`)
  faits.push(`commande : ${fichiers.length} fichiers photo (${basesPhotos.size} bases, ${(octets / 1e6).toFixed(2)} Mo), ${[...new Set([...decrits.values()].map((a) => a.auteur))].length} auteurs`)
  return { ok: echecs.length === 0, echecs, faits, resume: `maquette-exemple.json, commande-exemple/ (${fichiers.length} photos de Lestraque attribuées, contenu.json = Lestraque à ${REFERENCE_COMMIT}) et commande-sans-chiffres.json conformes` }
}

// ── Les mots propres à chaque métier (relectures à froid du 24/09 : MQ-10 de maquette-qa, FS-9 de formulaire-site-qa) ──────
// Le dictionnaire n'est écrit nulle part ici : il est TIRÉ des modèles <racine>/maquettes/modeles/<m>/contenu.json. Un mot (4
// lettres au moins, replié par replier, sans accents, minuscules, « s » ou « x » final ôté au-delà de 4 lettres) est PROPRE au
// modèle m s'il revient au moins deux fois dans les textes de m (le nom du dossier et la clé metier comptent, les {marques}
// non, ni photos) et n'apparaît dans les textes d'aucun autre modèle. Deux fois : un mot du métier (« menuiserie », « bois »,
// « plomberie ») y revient ; un mot de phrase qui n'y est qu'une fois (« chaque », « détails », « trouve ») ne dit pas le
// métier, et le prendre ferait crier sur un cadre neutre.
/** Les mots d'un texte, comparables d'un modèle à l'autre. */
export function motsDe(texte) {
  const brut = replier(String(texte ?? '')).replace(/\{[\p{L}_]+\}/gu, ' ').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  return (brut.match(/\p{L}{4,}/gu) || []).map((w) => (w.length > 4 ? w.replace(/[sx]$/, '') : w))
}
const textesDeModele = (o, cle = '') => {
  if (typeof o === 'string') return [o]
  if (Array.isArray(o)) return o.flatMap((x) => textesDeModele(x))
  if (o && typeof o === 'object') return Object.entries(o).filter(([k]) => k !== 'photos' && k !== '_').flatMap(([k, v]) => textesDeModele(v, k))
  return []
}
/**
 * Les modèles de métier de <racine>/maquettes/modeles/ → { modeles: [m…], propres: Map(m → Map(mot → occurrences)),
 * illisibles: [m…] }. Un modèle sans contenu.json lisible est compté illisible.
 */
export function motsDesMetiers(racine = R) {
  const dir = path.join(racine, 'maquettes', 'modeles')
  const noms = fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort() : []
  const comptes = new Map(), illisibles = []
  for (const m of noms) {
    let j
    try { j = lireJson(path.join(dir, m, 'contenu.json')) } catch { illisibles.push(m); continue }
    const c = new Map()
    for (const w of motsDe([m, typeof j.metier === 'string' ? j.metier : '', ...textesDeModele(j)].join(' \n '))) c.set(w, (c.get(w) || 0) + 1)
    comptes.set(m, c)
  }
  const modeles = [...comptes.keys()]
  const propres = new Map(modeles.map((m) => [m, new Map([...comptes.get(m)].filter(([w, n]) => n >= 2 && modeles.every((x) => x === m || !comptes.get(x).has(w))))]))
  return { modeles, propres, illisibles }
}
/**
 * Les mots d'un texte propres à un AUTRE métier que `metier` (dico = motsDesMetiers) ; `admis` : textes dont les mots sont
 * permis (le jeu d'essai : entreprise, ville, communes…). → [{ mot, modele, extrait }] (un par mot).
 */
export function motsEtrangers(texte, metier, dico, admis = '') {
  const permis = new Set(motsDe(admis))
  const brut = replier(String(texte ?? ''))
  const hits = [], vus = new Set()
  for (const m of brut.matchAll(/\p{L}{4,}/gu)) {
    const [w] = motsDe(m[0])
    if (!w || permis.has(w) || vus.has(w)) continue
    for (const [x, mots] of dico.propres) {
      if (x === metier || !mots.has(w)) continue
      vus.add(w)
      hits.push({ mot: m[0], modele: x, extrait: court(brut.slice(Math.max(0, m.index - 40), m.index + m[0].length + 30), 90) })
    }
  }
  return hits
}

// ── Auto-vérification ─────────────────────────────────────────────────────────────────────────────────────────────────────
async function autoVerification() {
  const o = lireOptionsOuQuitter(process.argv.slice(2), { connues: ['extraire-reference'] })
  const extraire = o.drapeau('extraire-reference')
  const ids = [...(extraire ? ['REF'] : []), 'T1', 'T2', 'JE', 'SV', 'CAP']
  const s = creerSortie('commun-025', ids, { racine: o.racine, temoin: o.temoin })
  await s.executer(async () => {
    if (extraire) {
      const t0 = Date.now()
      const x = extraireReference()
      const v = verifierArbre(x.dest, x.commit)
      s.verdict('REF', v.ok && v.fichiers > 0, `${x.commit.slice(0, 7)} ${x.reutilise ? 'réutilisé' : 'extrait'} dans ${path.relative(R, x.dest)} : ${v.fichiers} fichiers, ${(v.octets / 1e6).toFixed(1)} Mo, identiques blob pour blob (${((Date.now() - t0) / 1000).toFixed(1)} s)`, `arbre différent : ${v.manquants.length} manquant(s), ${v.intrus.length} en trop, ${v.differents.length} différent(s)`)
    }
    const r1 = t1({ juge: 'commun-025', racine: o.racine })
    s.resultat('T1', r1); for (const f of r1.faits) s.note(`T1 : ${f}`)
    const r2 = t2({ racine: o.racine })
    s.resultat('T2', r2); for (const f of r2.faits) s.note(`T2 : ${f}`)
    const je = verifierJeuxEssai()
    s.resultat('JE', je); for (const f of je.faits) s.note(`JE : ${f}`)
    if (!r1.ok) { s.echoue('SV', 'pas de Lestraque généré à servir (T1)'); s.echoue('CAP', 'pas de Lestraque généré à capturer (T1)'); return }

    // SV : le serveur sert les octets du disque, refuse la sortie du dossier, redirige un dossier sans barre, joue ses routes
    const recus = []
    const srv = await servir(r1.sortie, { routes: {
      '/api/essai': (q) => { recus.push(q.json); return q.json && q.json.couper ? { coupure: true } : { statut: q.json && q.json.statut || 200, corps: { ok: true, recu: q.json } } },
    } })
    let nav = null
    try {
      const d = []
      const idx = await fetch(`${srv.base}/`); const corps = Buffer.from(await idx.arrayBuffer())
      if (idx.status !== 200 || !corps.equals(fs.readFileSync(path.join(r1.sortie, 'index.html')))) d.push(`/ → ${idx.status}, octets différents de index.html`)
      if ((await fetch(`${srv.base}/nexiste-pas.html`)).status !== 404) d.push('fichier absent ≠ 404')
      // quatre « .. » encodés mènent de .orchestre/travail/commun-025/lestraque à la racine du dépôt, où package.json existe
      // (fetch normaliserait « /../ » : requête brute)
      const statutBrut = (chemin) => new Promise((ok, ko) => { const q = http.get({ host: '127.0.0.1', port: srv.port, path: chemin }, (r) => { r.resume(); ok(r.statusCode) }); q.on('error', ko) })
      if (!fs.existsSync(path.join(r1.sortie, '..', '..', '..', '..', 'package.json'))) d.push('témoin de « .. » inopérant : package.json absent quatre dossiers au-dessus')
      const horsDossier = await statutBrut('/..%2f..%2f..%2f..%2fpackage.json')
      if (horsDossier !== 404) d.push(`sortie du dossier servi par « .. » : ${horsDossier}`)
      const redir = await fetch(`${srv.base}/mentions-legales`, { redirect: 'manual' })
      if (redir.status !== 301 || redir.headers.get('location') !== '/mentions-legales/') d.push(`dossier sans barre → ${redir.status} ${redir.headers.get('location')}`)
      const p1 = await fetch(`${srv.base}/api/essai`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ statut: 410, x: 'é' }) })
      if (p1.status !== 410 || (await p1.json()).recu?.x !== 'é') d.push('route simulée : statut ou corps JSON perdus')
      let coupee = false
      try { await fetch(`${srv.base}/api/essai`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ couper: true }) }) } catch { coupee = true }
      if (!coupee) d.push('coupure simulée : la requête a abouti')
      if (srv.requetes.filter((q) => q.chemin === '/api/essai').length !== 2 || recus.length !== 2) d.push('journal des requêtes incomplet')
      s.verdict('SV', !d.length, `index.html servi à l'octet près, 404, « .. » refusé, redirection 301, route JSON 410 et coupure réseau simulées, ${srv.requetes.length} requêtes journalisées`, d.join(' ; '))

      // CAP : captures de Lestraque par le juge, et trois témoins négatifs qui doivent échouer
      const DC = dossierTravail('commun-025', 'captures')
      nav = await lancerNavigateur('chromium')
      const faits = [], defauts = []
      for (const [nom, ctxOpts] of [['bureau', BUREAU], ['telephone', TELEPHONE]]) {
        const ctx = await nav.newContext(ctxOpts)
        const page = await ctx.newPage()
        await page.goto(`${srv.base}/`, { waitUntil: 'load' })
        await page.waitForTimeout(1200)
        const c = await capturer(page, path.join(DC, `lestraque-${nom}.jpg`), { maxOctets: 1024 * 1024 })
        const dh = await defilementHorizontal(page)
        faits.push(`${nom} ${c.largeur}×${c.hauteur} ${(c.octets / 1024).toFixed(0)} Ko, écart-type ${c.ecartType.toFixed(1)}, défilement horizontal ${dh} px`)
        if (!c.ok) defauts.push(`capture ${nom} : ${c.raisons.join(', ')}`)
        await ctx.close()
      }
      // témoins négatifs : une page uniforme, un fichier de 0 octet, un JPEG tronqué
      const ctx = await nav.newContext(BUREAU)
      const page = await ctx.newPage()
      await page.setContent('<!doctype html><html><body style="margin:0;background:#f4ede2"></body></html>')
      const uni = await capturer(page, path.join(DC, 'temoin-uniforme.jpg'))
      await ctx.close()
      if (uni.ok || !uni.raisons.some((r) => r.startsWith('uniforme'))) defauts.push('témoin uniforme accepté')
      fs.writeFileSync(path.join(DC, 'temoin-vide.jpg'), '')
      const vide = await verifierImage(path.join(DC, 'temoin-vide.jpg'))
      if (vide.ok || vide.raisons[0] !== '0 octet') defauts.push('témoin de 0 octet accepté')
      const bon = fs.readFileSync(path.join(DC, 'lestraque-bureau.jpg'))
      fs.writeFileSync(path.join(DC, 'temoin-tronque.jpg'), bon.subarray(0, 600))
      const tronque = await verifierImage(path.join(DC, 'temoin-tronque.jpg'))
      if (tronque.ok) defauts.push('témoin tronqué accepté')
      s.verdict('CAP', !defauts.length, `${faits.join(' ; ')} ; témoins refusés : uniforme (${uni.raisons[0]}), 0 octet, tronqué (${tronque.raisons[0] || '?'})`, defauts.join(' ; '))
    } finally {
      if (nav) await nav.close().catch(() => {})
      await srv.fermer()
    }
  })
}
const pareil = (a, b) => (process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b)
if (process.argv[1] && pareil(path.resolve(process.argv[1]), fileURLToPath(import.meta.url))) await autoVerification()
