// scripts/fixtures/026-livraison-tresor/commun.mjs — le socle des juges du domaine « livraison et trésorerie » (fiche
// 026-018), écrit par Claude Code. Les fiches d'exécutant ne le modifient jamais (scripts/fixtures/** est dans leur
// `interdit`) ; les lots B, C et D (026-023, 026-029, 026-026) l'importent tel quel.
//
// Règles communes à tous les juges du domaine (026-018, point 1) :
//   --racine=<dossier>  lit le code de ce dossier (défaut : le dépôt). « HEAD » et la référence sont ceux du dépôt git
//                       qui contient ce script : une copie sans .git se compare au dépôt d'origine.
//   --temoin            ne lance que les critères de non-régression, marqués « (NR) » dans la sortie.
//   --reel              Claude Code seulement : charge .env.local lui-même, sans rien afficher (chargerEnvLocal).
//   Sortie : une ligne par critère (« ✅ SC-3 … » ou « ❌ SC-3 … »), puis « <juge> : PASS » ou « <juge> : FAIL — ids ».
//   Code 0 seulement si tout est vert ; 1 sinon ; 2 pour un appel invalide ou un préalable absent (drapeau baissé,
//   fiche amont pas PASS, variable absente en --reel), jamais confondu avec un PASS.
//   Le code TypeScript est importé dans un PROCESSUS ENFANT (`node --import ./scripts/ts-loader.mjs <juge> --enfant=…`),
//   où un crochet de résolution sert les doublures de a/doublures.mjs (base en mémoire, sendEmail factice, Stripe figé…)
//   et où fetch est piégé : api.resend.com, api.stripe.com, api.github.com et *.supabase.co sont refusés et consignés
//   hors --reel (et tout autre hôte hors 127.0.0.1 aussi).
//   Un fichier de 0 octet dans le dossier de preuves de la fiche jugée est un échec (critère « <P>-PV », lancé dans
//   tous les modes) ; une capture vide ou uniforme aussi (TA-8).
//   Le juge n'écrit que sous .orchestre/travail/<juge>/.
//   En --reel : lignes d'essai marquées essai-026-lt-<horodatage>, adresses en @presti-test.invalid (que lib/email.ts
//   n'envoie jamais), ménage dans un finally, code 1 si le ménage échoue.
//
// Index : A, R, TRAVAIL, LOADER, DOUBLURES, PREUVE_A, REFERENCE, HOTES_PIEGES · court, premiereLigne, sous,
//   exigerSousTravail, dossierTravail, lireJson, jeu, lireOuNull, sha256, shaBlob, lf · lancer, git · lireOptions,
//   creerSortie, refuserAppel · sansCommentaires, importsDe, exportsNommes, corpsDeFonction, instructions ·
//   texteA, lireRacine, baseAvant, diffLignes, blocs, inchangesDepuisHead · preuvesVides · chargerEnvLocal, marqueEssai ·
//   CROCHET, lancerEnfant, preparerEnfant, resultatEnfant · lsTree, listerFichiers, extraireTar, verifierArbre,
//   extraireReference · typecheck · egalAuCentime, valeurDe, egalProfond.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { register } from 'node:module'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

// ── Chemins ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const A = path.dirname(fileURLToPath(import.meta.url))
export const R = path.resolve(A, '..', '..', '..')
/**
 * La racine du dépôt git qui contient R. D'ordinaire R lui-même ; dans une copie sans .git posée sous
 * .orchestre/travail/ (celle du méta-juge des mutations, lancée avec cwd = la copie), c'est le dépôt d'origine : HEAD,
 * l'historique et les preuves se lisent là, et les chemins de git restent relatifs à sa racine.
 */
export const DEPOT_GIT = (() => {
  const r = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: R, encoding: 'utf8', windowsHide: true, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } })
  const t = (r.stdout ?? '').trim()
  return r.status === 0 && t ? path.resolve(t) : R
})()
export const TRAVAIL = path.join(R, '.orchestre', 'travail')
export const LOADER = path.join(R, 'scripts', 'ts-loader.mjs')
export const DOSSIER_A = path.join(A, 'a')
export const DOUBLURES = path.join(DOSSIER_A, 'doublures.mjs')
/** La fiche du lot A (preuve-a.json) : la référence du domaine y est écrite ; les lots B à D relisent ce même sha. */
export const PREUVE_A = (() => { try { return JSON.parse(fs.readFileSync(path.join(A, 'preuve-a.json'), 'utf8')) } catch { return null } })()
export const REFERENCE = PREUVE_A && /^[0-9a-f]{40}$/.test(PREUVE_A.reference ?? '') ? PREUVE_A.reference : null
/** Les hôtes que JL-3 surveille nommément (tout autre hôte hors 127.0.0.1 est aussi refusé). */
export const HOTES_PIEGES = ['api.resend.com', 'api.stripe.com', 'api.github.com', '.supabase.co']

// ── Petits outils ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export const court = (t, n = 160) => { const x = String(t ?? '').replace(/\s+/g, ' ').trim(); return x.length > n ? `${x.slice(0, n - 1)}…` : x }
export const premiereLigne = (e) => String((e && e.message) || e).split('\n')[0].slice(0, 300)
export function sous(parent, enfant) {
  const rel = path.relative(path.resolve(parent), path.resolve(enfant))
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel)
}
export function exigerSousTravail(p) {
  if (!sous(TRAVAIL, p)) throw new Error(`${p} n'est pas sous ${TRAVAIL} : refusé (les juges n'écrivent que dans .orchestre/travail/)`)
  return path.resolve(p)
}
/** .orchestre/travail/<parties…>, vidé puis recréé. */
export function dossierTravail(...parties) {
  const d = exigerSousTravail(path.join(TRAVAIL, ...parties))
  fs.rmSync(d, { recursive: true, force: true })
  fs.mkdirSync(d, { recursive: true })
  return d
}
export const lireJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'))
/** Un jeu d'essai du lot A, relu à chaque appel (copie neuve). */
export const jeu = (nom) => lireJson(path.join(DOSSIER_A, nom))
export const lireOuNull = (f) => { try { return fs.readFileSync(f, 'utf8') } catch { return null } }
export const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex')
export const shaBlob = (buf) => crypto.createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex')
/** Fins de ligne ramenées à \n (le dépôt est en core.autocrlf=true : on compare le texte, pas les octets de fin). */
export const lf = (t) => (t == null ? t : String(t).replace(/\r\n/g, '\n'))

// ── Processus ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Lance une commande sans shell. → { code, signal, stdout, stderr, sortie, erreur, duree } */
export function lancer(commande, args = [], { cwd = R, timeout = 300_000, env, entree } = {}) {
  const t0 = Date.now()
  const r = spawnSync(commande, args, { cwd, timeout, env: env ?? process.env, input: entree, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, windowsHide: true })
  const stdout = r.stdout || '', stderr = r.stderr || ''
  return { code: r.status, signal: r.signal, stdout, stderr, sortie: `${stdout}${stderr}`, erreur: r.error ? premiereLigne(r.error) : null, duree: (Date.now() - t0) / 1000 }
}
/** Git en lecture seule (GIT_OPTIONAL_LOCKS=0 : aucune écriture opportuniste de l'index). */
export function git(args, { cwd = DEPOT_GIT, binaire = false } = {}) {
  const r = spawnSync('git', args, { cwd, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' }, maxBuffer: 1024 * 1024 * 1024, encoding: binaire ? 'buffer' : 'utf8', windowsHide: true })
  return { code: r.status, stdout: r.stdout ?? (binaire ? Buffer.alloc(0) : ''), stderr: r.stderr ? r.stderr.toString() : '', erreur: r.error ? premiereLigne(r.error) : null }
}

// ── Options et sortie ─────────────────────────────────────────────────────────────────────────────────────────────────────
/** → { valeurs, drapeaux, positionnels, inconnues, racine, racineParDefaut, temoin, reel, enfant } */
export function lireOptions(argv, { connues = [] } = {}) {
  const valeurs = {}, drapeaux = new Set(), positionnels = [], inconnues = []
  for (const a of argv) {
    const m = /^--([\w-]+)(?:=([\s\S]*))?$/.exec(a)
    if (!m) { positionnels.push(a); continue }
    if (m[2] === undefined) drapeaux.add(m[1]); else valeurs[m[1]] = m[2]
    if (![...connues, 'racine', 'temoin', 'reel', 'enfant'].includes(m[1])) inconnues.push(a)
  }
  const racine = valeurs.racine ? path.resolve(R, valeurs.racine) : R
  return { valeurs, drapeaux, positionnels, inconnues, racine, racineParDefaut: path.resolve(racine) === path.resolve(R), temoin: drapeaux.has('temoin'), reel: drapeaux.has('reel'), enfant: valeurs.enfant ?? null }
}
/** Appel invalide : une ligne, code 2 (jamais confondu avec un PASS). */
export function refuserAppel(juge, motif) { console.log(`${juge} : appel refusé — ${motif}`); process.exit(2) }

/**
 * La sortie d'un juge : une ligne d'en-tête, une ligne par critère (« ✅ ID détail » ou « ❌ ID détail » ; « (NR) » après
 * l'identifiant d'un critère de non-régression), puis « <nom> : PASS » ou « <nom> : FAIL — ids ». Un critère déclaré et
 * jamais évalué est un échec.
 */
export function creerSortie(nom, ids, entete, { nr = [] } = {}) {
  const res = new Map()
  const NR = new Set(nr)
  console.log(entete)
  const ligne = (t) => String(t ?? '').replace(/\s*\r?\n\s*/g, ' · ').trim()
  const noter = (id, ok, detail) => {
    if (!ids.includes(id)) ids.push(id)
    const marque = NR.has(id) ? `${id} (NR)` : id
    if (res.has(id)) { const r = res.get(id); if (r.ok && !ok) r.ok = false; console.log(`${ok ? '✅' : '❌'} ${marque} ${ligne(detail)} (complément)`); return }
    res.set(id, { ok, detail: ligne(detail) })
    console.log(`${ok ? '✅' : '❌'} ${marque} ${ligne(detail) || (ok ? 'conforme' : 'en échec')}`)
  }
  const s = {
    passe: (id, detail) => noter(id, true, detail),
    echoue: (id, detail) => noter(id, false, detail),
    juger: (id, echecs, detailOk) => (echecs.length ? noter(id, false, echecs.slice(0, 6).join(' ; ') + (echecs.length > 6 ? ` ; … (${echecs.length} défauts)` : '')) : noter(id, true, detailOk)),
    async critere(id, f) {
      try { const r = await f(); if (r && typeof r === 'object' && 'echecs' in r) s.juger(id, r.echecs, r.detail); else if (r !== undefined) s.juger(id, [], String(r)) } catch (e) { noter(id, false, `interrompu : ${premiereLigne(e)}`) }
    },
    nonJuges(liste, raison) { for (const id of liste) if (!res.has(id)) noter(id, false, `non jugé : ${raison}`) },
    enEchec: (id) => res.has(id) && !res.get(id).ok,
    evalue: (id) => res.has(id),
    finir(codeSiRouge = 1) {
      for (const id of ids) if (!res.has(id)) noter(id, false, 'non évalué')
      const rouges = ids.filter((id) => !res.get(id).ok)
      console.log(rouges.length ? `${nom} : FAIL — ${rouges.join(', ')}` : `${nom} : PASS`)
      return rouges.length ? codeSiRouge : 0
    },
  }
  return s
}

// ── Lecture de source ─────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * Le source TypeScript sans ses commentaires (// et /* *\/), chaînes, gabarits (avec ${…} imbriqués) et expressions
 * régulières respectés ; les fins de ligne sont gardées (les positions restent justes). Repris de la fiche 026-012.
 */
export function sansCommentaires(src) {
  const s = String(src)
  let out = '', i = 0
  const pile = []
  let prec = ''
  const regexPossible = () => prec === '' || /[(,=:[!&|?{};+\-*%<>~^]$/.test(prec) || /\b(?:return|typeof|case|do|else|in|of|void|throw|new|delete|await|yield)$/.test(out.trimEnd())
  while (i < s.length) {
    const c = s[i], d = s[i + 1]
    if (c === '/' && d === '/') { while (i < s.length && s[i] !== '\n') { out += ' '; i++ } continue }
    if (c === '/' && d === '*') { const f = s.indexOf('*/', i + 2); const fin = f < 0 ? s.length : f + 2; out += s.slice(i, fin).replace(/[^\n]/g, ' '); i = fin; continue }
    if (c === '"' || c === "'") {
      let j = i + 1
      while (j < s.length && s[j] !== c && s[j] !== '\n') j += s[j] === '\\' ? 2 : 1
      out += s.slice(i, j + 1); i = j + 1; prec = c; continue
    }
    if (c === '`' || (c === '}' && pile.length && pile[pile.length - 1] === 0)) {
      if (c === '}') pile.pop()
      let j = i + 1
      out += c
      while (j < s.length && s[j] !== '`' && !(s[j] === '$' && s[j + 1] === '{')) { out += s[j]; if (s[j] === '\\') { out += s[j + 1] ?? ''; j += 2 } else j++ }
      if (s[j] === '$') { out += '${'; pile.push(0); i = j + 2; prec = '{'; continue }
      out += s[j] ?? ''; i = j + 1; prec = '`'; continue
    }
    if (c === '/' && regexPossible()) {
      let j = i + 1, classe = false
      while (j < s.length && s[j] !== '\n') {
        if (s[j] === '\\') { j += 2; continue }
        if (s[j] === '[') classe = true
        else if (s[j] === ']') classe = false
        else if (s[j] === '/' && !classe) break
        j++
      }
      if (s[j] === '/') { j++; while (/[a-z]/i.test(s[j] ?? '')) j++; out += s.slice(i, j); i = j; prec = '/'; continue }
    }
    if (c === '{' && pile.length) pile[pile.length - 1]++
    if (c === '}' && pile.length) pile[pile.length - 1]--
    out += c
    if (!/\s/.test(c)) prec = c
    i++
  }
  return out
}
/** Les imports d'un source : [{ spec, noms: [nom local], type, genre, texte }] (statiques, effets, dynamiques littéraux). */
export function importsDe(src) {
  const s = sansCommentaires(src)
  const out = []
  for (const m of s.matchAll(/(?:^|[;\n}])\s*(import\s+(type\s+)?([\w$*{}\s,]*?)\s*from\s*(['"])([^'"]+)\4)/g)) {
    const liste = m[3]
    const noms = []
    const acc = /\{([^}]*)\}/.exec(liste)
    if (acc) for (const p of acc[1].split(',')) { const x = p.trim().replace(/^type\s+/, ''); if (x) noms.push(x.split(/\s+as\s+/).pop().trim()) }
    const defaut = liste.replace(/\{[^}]*\}/, '').replace(/\*\s+as\s+[\w$]+/, '').split(',').map((x) => x.trim()).filter(Boolean)
    noms.push(...defaut)
    const ns = /\*\s+as\s+([\w$]+)/.exec(liste); if (ns) noms.push(ns[1])
    out.push({ spec: m[5], noms, type: !!m[2], genre: 'import', texte: m[1] })
  }
  for (const m of s.matchAll(/(?:^|[;\n}])\s*(import\s*(['"])([^'"]+)\2)/g)) out.push({ spec: m[3], noms: [], type: false, genre: 'effet', texte: m[1] })
  for (const m of s.matchAll(/\bimport\s*\(\s*(['"`])([^'"`$]+)\1\s*\)/g)) out.push({ spec: m[2], noms: [], type: false, genre: 'dynamique', texte: m[0] })
  return out
}
/** Les noms exportés d'un source (déclarations, listes `export { a, b as c }`). */
export function exportsNommes(src) {
  const s = sansCommentaires(src)
  const noms = new Set()
  for (const m of s.matchAll(/\bexport\s+(?:declare\s+)?(?:async\s+)?(?:function\*?|const|let|var|class|type|interface|enum)\s+([\w$]+)/g)) noms.add(m[1])
  for (const m of s.matchAll(/\bexport\s*\{([^}]*)\}/g)) for (const p of m[1].split(',')) { const x = p.trim().split(/\s+as\s+/).pop()?.replace(/^type\s+/, '').trim(); if (x) noms.add(x) }
  return [...noms]
}
/** L'indice de l'accolade fermante qui répond à celle de `ouvre` (source déjà sans commentaires ; chaînes sautées). */
export function fermante(s, ouvre) {
  let n = 0
  for (let i = ouvre; i < s.length; i++) {
    const c = s[i]
    if (c === '"' || c === "'" || c === '`') { const q = c; i++; while (i < s.length && s[i] !== q) { if (s[i] === '\\') i++; i++ } continue }
    if (c === '{') n++
    else if (c === '}') { n--; if (n === 0) return i }
  }
  return -1
}
/**
 * Le corps d'une fonction nommée (function nom(…) {…}, const nom = (…) => {…}, const nom = async function …), dans le
 * source SANS commentaires. → { debut, fin, corps } (indices de l'accolade ouvrante et fermante) ou null.
 */
export function corpsDeFonction(sc, nom) {
  const re = new RegExp(`(?:\\bfunction\\s*\\*?\\s*${nom}\\s*\\(|\\b(?:const|let|var)\\s+${nom}\\s*(?::[^=]+)?=\\s*(?:async\\s*)?(?:function\\b[^(]*)?\\()`)
  const m = re.exec(sc)
  if (!m) return null
  // La parenthèse des paramètres, puis la première accolade qui suit leur fermeture (le type de retour peut en porter).
  let i = m.index + m[0].length - 1, n = 0
  for (; i < sc.length; i++) { if (sc[i] === '(') n++; else if (sc[i] === ')') { n--; if (n === 0) break } }
  let j = i + 1
  // Sauter un type de retour (`: Promise<{ a: b }>`), puis `=>`.
  while (j < sc.length && sc[j] !== '{' && sc[j] !== '=') j++
  if (sc[j] === ':' || (sc[j] === '{' && /:\s*$/.test(sc.slice(i + 1, j)))) { /* type objet en retour : rare, on prend l'accolade suivante */ }
  if (sc[j] === '=' && sc[j + 1] === '>') { j += 2; while (/\s/.test(sc[j] ?? '')) j++; if (sc[j] !== '{') return { debut: j, fin: j, corps: '' } }
  // Un type de retour littéral objet (`): { a: number } {`) : on saute les accolades équilibrées suivies d'une autre.
  let debut = sc.indexOf('{', j)
  if (debut < 0) return null
  let f = fermante(sc, debut)
  const apres = sc.slice(f + 1).match(/^\s*(=>\s*)?\{/)
  if (apres && /:\s*$/.test(sc.slice(i + 1, debut))) { debut = f + 1 + apres[0].length - 1; f = fermante(sc, debut) }
  if (f < 0) return null
  return { debut, fin: f, corps: sc.slice(debut + 1, f) }
}
/** Les instructions de premier niveau d'un corps (sans commentaires), découpées aux `;` et aux fins de bloc de niveau 0. */
export function instructions(corps) {
  const out = []
  let n = 0, debut = 0
  for (let i = 0; i < corps.length; i++) {
    const c = corps[i]
    if (c === '"' || c === "'" || c === '`') { const q = c; i++; while (i < corps.length && corps[i] !== q) { if (corps[i] === '\\') i++; i++ } continue }
    if (c === '{' || c === '(' || c === '[') n++
    else if (c === '}' || c === ')' || c === ']') {
      n--
      if (n === 0 && c === '}') {
        const reste = corps.slice(i + 1)
        if (!/^\s*(else\b|catch\b|finally\b|\)|,|\.|;)/.test(reste)) { const t = corps.slice(debut, i + 1).trim(); if (t) out.push(t); debut = i + 1 }
      }
    } else if (c === ';' && n === 0) { const t = corps.slice(debut, i).trim(); if (t) out.push(t); debut = i + 1 }
    else if (c === '\n' && n === 0) {
      // Sans point-virgule (style du dépôt) : une ligne finie à niveau 0 termine l'instruction si la suivante n'est pas une suite.
      const t = corps.slice(debut, i).trim()
      const suite = corps.slice(i + 1).trimStart()
      if (t && !/[,(=+\-*/&|?:.]$/.test(t) && !/^[.?:)\]}&|+\-*/,]/.test(suite)) { out.push(t); debut = i + 1 }
    }
  }
  const t = corps.slice(debut).trim(); if (t) out.push(t)
  return out
}

// ── Versions d'un fichier ─────────────────────────────────────────────────────────────────────────────────────────────────
/** Le texte d'un fichier à une révision du dépôt (fins de ligne en \n), ou null s'il n'y existe pas. */
export function texteA(rev, chemin) {
  const r = git(['show', `${rev}:${chemin}`], { binaire: true })
  return r.code === 0 ? lf(r.stdout.toString('utf8')) : null
}
/** Le texte d'un fichier de la racine jugée (fins de ligne en \n), ou null. */
export const lireRacine = (racine, rel) => lf(lireOuNull(path.join(racine, rel)))
/**
 * La version « d'avant la fiche » d'un fichier : celle du plus récent commit de l'historique de HEAD qui ne contient pas
 * `marqueur` (une expression régulière). Le jugement donne la même base avant et après le commit de la fiche jugée :
 * avant, c'est HEAD ; après, c'est le parent du commit qui a introduit le marqueur. → { commit, texte } (texte null si le
 * fichier n'existait pas encore).
 */
export function baseAvant(chemin, marqueur) {
  const tete = git(['rev-parse', 'HEAD']).stdout.trim()
  const aHead = texteA('HEAD', chemin)
  if (aHead === null || !marqueur.test(aHead)) return { commit: tete, texte: aHead }
  const l = git(['log', '--format=%H', 'HEAD', '--', chemin])
  const commits = l.stdout.split(/\r?\n/).filter(Boolean)
  for (const c of commits) {
    const t = texteA(c, chemin)
    if (t === null || !marqueur.test(t)) return { commit: c, texte: t }
  }
  // Le fichier porte le marqueur depuis sa création : la base est le parent du plus ancien commit, où il n'existait pas.
  return { commit: commits.at(-1) ? `${commits.at(-1)}^` : tete, texte: null }
}
/**
 * Diff ligne à ligne (plus longue sous-suite commune ; blancs de fin ignorés). → { ajouts: [{ i, texte, pos }], retraits:
 * [{ i, texte }] } : `i` est l'indice dans son fichier, `pos` l'indice de l'ancien fichier devant lequel la ligne s'insère.
 */
export function diffLignes(avant, apres) {
  const a = (avant ?? '').split('\n').map((l) => l.replace(/\s+$/, '')), b = (apres ?? '').split('\n').map((l) => l.replace(/\s+$/, ''))
  // Préfixe et suffixe communs d'abord : le tableau ne couvre que le milieu.
  let p = 0; while (p < a.length && p < b.length && a[p] === b[p]) p++
  let s = 0; while (s < a.length - p && s < b.length - p && a[a.length - 1 - s] === b[b.length - 1 - s]) s++
  const A = a.slice(p, a.length - s), B = b.slice(p, b.length - s)
  if (A.length * B.length > 25_000_000) throw new Error(`diff trop grand (${A.length} × ${B.length} lignes)`)
  const L = Array.from({ length: A.length + 1 }, () => new Uint32Array(B.length + 1))
  for (let i = A.length - 1; i >= 0; i--) for (let j = B.length - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1])
  const ajouts = [], retraits = []
  let i = 0, j = 0
  while (i < A.length && j < B.length) {
    if (A[i] === B[j]) { i++; j++ } else if (L[i + 1][j] >= L[i][j + 1]) { retraits.push({ i: p + i, texte: A[i] }); i++ } else { ajouts.push({ i: p + j, texte: B[j], pos: p + i }); j++ }
  }
  for (; i < A.length; i++) retraits.push({ i: p + i, texte: A[i] })
  for (; j < B.length; j++) ajouts.push({ i: p + j, texte: B[j], pos: p + i })
  return { ajouts, retraits }
}
/** Regroupe des lignes (indices croissants) en blocs contigus : [[{i,texte}…], …]. */
export function blocs(lignes) {
  const out = []
  for (const l of lignes) { const d = out.at(-1); if (d && d.at(-1).i === l.i - 1) d.push(l); else out.push([l]) }
  return out
}
/** Les instructions d'import blanchies (remplacées par autant de fins de ligne) : les numéros de ligne restent justes. */
export const blanchirImports = (t) => String(t ?? '')
  .replace(/^[ \t]*import\s[^;]*?from\s*['"][^'"]+['"][ \t]*;?/gm, (m) => m.replace(/[^\n]/g, ''))
  .replace(/^[ \t]*import\s*['"][^'"]+['"][ \t]*;?/gm, (m) => m.replace(/[^\n]/g, ''))
/**
 * « Le diff de <fichier> se limite à un appel de `nom` dans un try/catch (et à son import) » : compare `cur` à `base`.
 * Les imports : aucun retiré, seul `nom` ajouté. Le reste : aucune ligne retirée, et les lignes ajoutées forment au plus
 * un bloc (exactement un si `exact`) de la forme « try { … nom( … } catch … { … } », avec un seul appel à `nom`, sans
 * `throw` dans son catch, et, si `dansFonction`, à l'intérieur du corps de cette fonction. → { echecs, blocs }
 */
export function ajoutTryCatch(base, cur, { nom, exact = true, dansFonction = null }) {
  const e = []
  const cle = (i) => i.noms.map((n) => `${i.spec}#${n}`)
  const avant = new Set(importsDe(base ?? '').flatMap(cle)), apres = importsDe(cur ?? '').flatMap(cle)
  for (const n of avant) if (!apres.includes(n)) e.push(`import retiré : ${n.replace('#', ' → ')}`)
  for (const n of apres) if (!avant.has(n) && !n.endsWith(`#${nom}`)) e.push(`import ajouté hors contrat : ${n.replace('#', ' → ')}`)
  const d = diffLignes(blanchirImports(base), blanchirImports(cur))
  for (const x of d.retraits) if (x.texte.trim()) e.push(`ligne ${x.i + 1} de la base retirée ou changée : « ${court(x.texte, 70)} »`)
  const groupes = blocs(d.ajouts).filter((g) => g.some((l) => l.texte.trim()))
  const lignesCur = String(cur ?? '').split('\n')
  let zone = null
  if (dansFonction) {
    const sc = sansCommentaires(cur ?? '')
    const c = corpsDeFonction(sc, dansFonction)
    if (!c) e.push(`fonction ${dansFonction} introuvable`)
    else zone = [sc.slice(0, c.debut).split('\n').length - 1, sc.slice(0, c.fin).split('\n').length - 1]
  }
  for (const g of groupes) {
    const utiles = g.filter((l) => l.texte.trim() && !/^\s*\/\//.test(l.texte))
    const texte = sansCommentaires(utiles.map((l) => l.texte).join('\n')).trim()
    const appels = (texte.match(new RegExp(`\\b${nom}\\s*\\(`, 'g')) ?? []).length
    const forme = /^try\s*\{[\s\S]*\}\s*catch\b[\s\S]*\}$/.test(texte)
    const lieu = `lignes ${g[0].i + 1}-${g.at(-1).i + 1}`
    if (!forme) e.push(`${lieu} ajoutées hors d'un try/catch : « ${court(texte, 90)} »`)
    if (appels !== 1) e.push(`${lieu} : ${appels} appel(s) à ${nom}(, 1 attendu`)
    const iCatch = texte.search(/\}\s*catch\b/)
    if (iCatch >= 0 && /\bthrow\b/.test(texte.slice(iCatch))) e.push(`${lieu} : le catch relance (throw)`)
    if (/\bawait\s+Promise\.all\b/.test(texte)) e.push(`${lieu} : appel groupé avec d'autres (Promise.all)`)
    if (zone && (g[0].i < zone[0] || g.at(-1).i > zone[1])) e.push(`${lieu} hors du corps de ${dansFonction} (lignes ${zone[0] + 1}-${zone[1] + 1})`)
  }
  if (exact && groupes.length !== 1) e.push(`${groupes.length} bloc(s) ajouté(s), exactement un try/catch autour de ${nom}() attendu`)
  if (!exact && groupes.length > 1) e.push(`${groupes.length} blocs ajoutés, un au plus`)
  void lignesCur
  return { echecs: [...new Set(e)], blocs: groupes.length }
}
/** Les entrées { nom, maxHeures } de `export const CRONS_ATTENDUS … = [ … ]`, et le texte sans cette déclaration. */
export function cronsAttendus(t) {
  const s = String(t ?? '')
  const m = /export\s+const\s+CRONS_ATTENDUS\b[^=]*=\s*\[/.exec(s)
  if (!m) return null
  let n = 1, j = m.index + m[0].length
  for (; j < s.length && n > 0; j++) { if (s[j] === '[') n++; else if (s[j] === ']') n-- }
  const corps = s.slice(m.index + m[0].length, j - 1)
  const entrees = [...corps.matchAll(/\{\s*nom\s*:\s*['"]([^'"]+)['"]\s*,\s*maxHeures\s*:\s*(\d+)\s*\}/g)].map((x) => ({ nom: x[1], maxHeures: Number(x[2]) }))
  const nObjets = (corps.match(/\{/g) ?? []).length
  return { entrees, lisibles: nObjets === entrees.length, reste: s.slice(0, m.index) + s.slice(j) }
}
/**
 * Les fichiers suivis par HEAD sous `prefixe` (hors `exclus`) dont la version de la racine diffère de HEAD, ou qui
 * manquent dans la racine : la sémantique de `git diff --quiet HEAD -- <prefixe>` étendue à une copie sans .git.
 */
export function differentsDeHead(racine, prefixe, exclus = []) {
  const arbre = lsTree('HEAD', prefixe)
  const out = []
  for (const [chemin] of arbre) {
    if (exclus.includes(chemin)) continue
    const ici = lireRacine(racine, chemin)
    if (ici === null) { out.push(`${chemin} supprimé`); continue }
    if (ici !== texteA('HEAD', chemin)) out.push(`${chemin} modifié`)
  }
  return out
}

// ── Preuves ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * Le dossier de preuves de la fiche jugée : celui de la racine si elle en porte un (.orchestre/preuves/), sinon celui du
 * dépôt git (une copie de code, comme celle du méta-juge des mutations, n'a pas de preuves : ce sont celles du dépôt). → { dossier, vides, fichiers }
 */
export function preuvesVides(racine, fiche) {
  const base = fs.existsSync(path.join(racine, '.orchestre', 'preuves')) ? racine : DEPOT_GIT
  const dossier = path.join(base, '.orchestre', 'preuves', fiche)
  const vides = [], fichiers = []
  const rec = (d) => {
    if (!fs.existsSync(d)) return
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name)
      if (e.isDirectory()) rec(p)
      else { fichiers.push(p); if (fs.statSync(p).size === 0) vides.push(p) }
    }
  }
  rec(dossier)
  return { dossier, vides, fichiers }
}
/** La règle commune « un fichier de 0 octet est un échec », en critère <P>-PV (tous les modes). */
export function jugerPreuvesVides(s, prefixe, racine, fiche) {
  const p = preuvesVides(racine, fiche)
  const rel = (f) => (sous(DEPOT_GIT, f) ? path.relative(DEPOT_GIT, f) : f).split(path.sep).join('/')
  s.juger(`${prefixe}-PV`, p.vides.map((f) => `${rel(f)} fait 0 octet : une preuve vide est un mensonge, pas une preuve`),
    p.fichiers.length ? `${p.fichiers.length} fichier(s) dans ${rel(p.dossier)}, aucun de 0 octet` : `aucune preuve encore dans ${rel(p.dossier)} (rien de vide)`)
}

// ── --reel ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** .env.local → process.env, sans écraser ce qui est posé et sans rien afficher (comme scripts/site-deposer.mjs:17). */
export function chargerEnvLocal() {
  const f = path.join(R, '.env.local')
  if (!fs.existsSync(f)) return false
  for (const l of fs.readFileSync(f, 'utf8').split(/\r?\n/)) { const m = l.match(/^\s*([A-Z0-9_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '') }
  return true
}
/** La marque des lignes d'essai du domaine en --reel. */
export const marqueEssai = () => `essai-026-lt-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}`
/** Une fiche est-elle PASS (dernier verdict de .orchestre/verdicts.jsonl, dossier fait/) ? */
export function fichePass(id) {
  const t = lireOuNull(path.join(R, '.orchestre', 'verdicts.jsonl'))
  if (!t) return false
  let dernier = null
  for (const l of t.split(/\r?\n/)) { if (!l.includes(`"${id}"`)) continue; try { const v = JSON.parse(l); if (v.id === id) dernier = v } catch { /* ligne abîmée */ } }
  return dernier?.verdict === 'PASS' && fs.existsSync(path.join(R, '.orchestre', 'fait', `${id}.md`))
}

// ── Le processus enfant ───────────────────────────────────────────────────────────────────────────────────────────────────
// Le crochet : `@/x` → <racine>/x ; relatif sans extension → .ts, .tsx, /index.ts ; les modules doublés (clé : chemin sans
// extension relatif à la racine) → a/doublures.mjs?m=<nom> ; un paquet demandé depuis un fichier hors du dépôt se résout
// depuis le node_modules du dépôt ; un .tsx est transpilé par le paquet typescript du dépôt (JSX react-jsx).
export const CROCHET = String.raw`
import { statSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
let RACINES = [], DOUBLURES = '', DEPOT = '', DOUBLES = {}, ts = null
export async function initialize(d) { RACINES = d.racines; DOUBLURES = d.doublures; DEPOT = d.depot; DOUBLES = d.doubles }
const estFichier = (u) => { try { return statSync(fileURLToPath(u)).isFile() } catch { return false } }
const double = (m) => ({ url: DOUBLURES + '?m=' + m, shortCircuit: true, format: 'module' })
const min = (u) => decodeURIComponent(u).toLowerCase()
export async function resolve(spec, ctx, next) {
  let s = spec
  if (s.startsWith('@/')) {
    // La racine du fichier qui importe (une copie de référence importe dans sa propre racine), sinon la racine jugée.
    const r = RACINES.find((x) => ctx.parentURL && min(ctx.parentURL).startsWith(min(x))) ?? RACINES[0]
    s = new URL(s.slice(2), r).href
  }
  if (s.startsWith('.') || s.startsWith('file:')) {
    const base = s.startsWith('file:') ? s.split('?')[0] : new URL(s, ctx.parentURL).href
    const r = RACINES.find((x) => min(base).startsWith(min(x)))
    if (r) {
      const rel = decodeURIComponent(base.slice(r.length)).replace(/\.(ts|tsx|js|mjs)$/, '').replace(/\/index$/, '')
      if (DOUBLES[rel]) return double(DOUBLES[rel])
    }
    if (!s.startsWith('file:') || !s.includes('?')) for (const c of [base, base + '.ts', base + '.tsx', base + '/index.ts', base + '/index.tsx']) if (estFichier(c)) return next(c, ctx)
  }
  const paquet = !s.startsWith('.') && !s.startsWith('file:') && !s.startsWith('node:') && !s.startsWith('data:')
  const c2 = paquet && ctx.parentURL && !min(ctx.parentURL).startsWith(min(DEPOT)) ? { ...ctx, parentURL: DEPOT + 'package.json' } : ctx
  try { return await next(s, c2) } catch (e) {
    // « next/server » et consorts : un sous-chemin de paquet sans carte d'exports se résout avec son extension (.js),
    // comme le fait le bundler de Next.
    if (paquet && /^(@[^/]+\/)?[^/@]+\/.+/.test(s) && !/\.(m?js|cjs|json)$/.test(s)) return next(s + '.js', c2)
    throw e
  }
}
export async function load(url, ctx, next) {
  if (url.startsWith('file:') && /\.tsx(\?|$)/.test(url)) {
    if (!ts) ts = createRequire(DEPOT + 'package.json')('typescript')
    const src = readFileSync(fileURLToPath(url.split('?')[0]), 'utf8')
    const out = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, verbatimModuleSyntax: false }, fileName: fileURLToPath(url.split('?')[0]) })
    return { format: 'module', source: out.outputText, shortCircuit: true }
  }
  return next(url, ctx)
}`

/** Le marqueur de la ligne de résultat d'un enfant. */
const marque = (juge) => `@@${juge}@@ `
/**
 * Lance `script --enfant=<mode> --racine=<racine>` dans un processus enfant (node --import ./scripts/ts-loader.mjs), sous
 * le même environnement (le piège réseau d'une preuve, s'il y en a un, suit par NODE_OPTIONS). Sans ANTHROPIC_ADMIN_KEY,
 * sans clé Stripe ni Supabase ni Resend : l'enfant ne doit rien pouvoir joindre. → { code, sortie, res, erreur, duree }
 */
export function lancerEnfant({ juge, script, racine, mode, args = [], timeout = 180_000, env = {} }) {
  const e = { ...process.env, TZ: 'UTC', ...env }
  for (const k of ['ANTHROPIC_ADMIN_KEY', 'STRIPE_SECRET_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'RESEND_API_KEY', 'CRON_SECRET', 'VERCEL_TOKEN', 'GITHUB_TOKEN']) if (!(k in env)) delete e[k]
  e.NEXT_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:9/doublure' // jamais le vrai projet : une fuite viserait un port fermé
  const r = lancer(process.execPath, ['--import', pathToFileURL(LOADER).href, script, `--enfant=${mode}`, `--racine=${racine}`, ...args], { cwd: R, timeout, env: e })
  const l = r.stdout.split(/\r?\n/).find((x) => x.startsWith(marque(juge)))
  let res = null
  if (l) { try { res = JSON.parse(l.slice(marque(juge).length)) } catch { /* illisible */ } }
  return { code: r.code, sortie: r.sortie, res, erreur: r.erreur, duree: r.duree }
}
/**
 * Dans l'enfant : enregistre le crochet (racines : la racine jugée d'abord, puis d'éventuelles copies de référence),
 * piège fetch (consigné dans `reseau`), et rend l'état partagé des doublures.
 */
export async function preparerEnfant({ racines, doubles }) {
  const reseau = []
  globalThis.fetch = async (u) => { const x = String(u?.url ?? u); reseau.push(x); throw new Error(`réseau interdit dans un juge du domaine livraison-trésorerie (hors --reel) : ${x.slice(0, 80)}`) }
  const sep = (d) => pathToFileURL(path.resolve(d) + path.sep).href
  register(`data:text/javascript,${encodeURIComponent(CROCHET)}`, { data: { racines: racines.map(sep), doublures: pathToFileURL(DOUBLURES).href, depot: sep(R), doubles } })
  const D = await import(`${pathToFileURL(DOUBLURES).href}?m=juge`)
  return { D, reseau }
}
/** Dans l'enfant : écrit la ligne de résultat et sort. */
export function resultatEnfant(juge, res) {
  process.stdout.write(`${marque(juge)}${JSON.stringify(res)}\n`, () => process.exit(0))
}
/** Dans l'enfant : fige l'horloge (new Date() et Date.now() rendent `iso`) ; rend la fonction qui la libère. */
export function figerHorloge(iso) {
  const FIXE = new Date(iso).getTime()
  const Vraie = globalThis.Date
  class DateFigee extends Vraie {
    constructor(...a) { if (a.length === 0) super(FIXE); else super(...a) }
    static now() { return FIXE }
  }
  globalThis.Date = DateFigee
  return () => { globalThis.Date = Vraie }
}
/** Dans l'enfant : juge un critère, en rattachant à lui les appels réseau tentés et les appels refusés par les doublures. */
export async function jugerDans(res, id, f, { reseau = [], inconnues = [] } = {}) {
  const r0 = reseau.length, i0 = inconnues.length
  let r
  try { r = await f() } catch (e) { r = { echecs: [`interrompu : ${premiereLigne(e)}`] } }
  const echecs = [...(r?.echecs ?? [])]
  for (const u of reseau.slice(r0)) echecs.push(`appel réseau tenté hors --reel : ${court(u, 90)}`)
  for (const x of inconnues.slice(i0)) echecs.push(`doublure : ${court(x, 90)}`)
  res.criteres[id] = { echecs, detail: r?.detail ?? '' }
}
/** Importe <racine>/<rel> par URL de fichier ; → { m, erreur } (le message, sans pile). */
export async function importer(racine, rel) {
  try { return { m: await import(pathToFileURL(path.join(racine, rel)).href), erreur: null } } catch (e) { return { m: null, erreur: premiereLigne(e) } }
}

// ── L'arbre de référence (git archive <sha>) ─────────────────────────────────────────────────────────────────────────────
// Lecteur tar repris de la fiche 026-012 : rien n'est écrit dans .git, aucun tar du système, pas de conversion de fins de
// ligne (core.autocrlf=false le temps de l'archive).
export function lsTree(rev, prefixe = '') {
  const args = ['ls-tree', '-r', '-l', '-z', rev]
  if (prefixe) args.push('--', prefixe)
  const r = git(args, { binaire: true })
  if (r.code !== 0) throw new Error(`git ls-tree ${rev} : ${court(r.stderr)}`)
  const m = new Map()
  for (const e of r.stdout.toString('utf8').split('\0')) {
    if (!e) continue
    const tab = e.indexOf('\t')
    const [mode, type, sha, t] = e.slice(0, tab).split(/\s+/)
    if (type === 'blob') m.set(e.slice(tab + 1), { sha, taille: Number(t), mode })
  }
  return m
}
export function listerFichiers(dossier) {
  const out = new Set()
  const rec = (rel) => {
    for (const e of fs.readdirSync(path.join(dossier, rel), { withFileTypes: true })) {
      const r2 = rel ? `${rel}/${e.name}` : e.name
      if (e.isDirectory()) rec(r2); else out.add(r2)
    }
  }
  if (fs.existsSync(dossier)) rec('')
  return out
}
function lirePax(buf) {
  const out = {}
  let i = 0
  while (i < buf.length) {
    const esp = buf.indexOf(0x20, i)
    if (esp < 0) break
    const long = parseInt(buf.subarray(i, esp).toString('ascii'), 10)
    if (!(long > 0)) break
    const enr = buf.subarray(esp + 1, i + long - 1)
    const eg = enr.indexOf(0x3d)
    if (eg > 0) out[enr.subarray(0, eg).toString('utf8')] = enr.subarray(eg + 1).toString('utf8')
    i += long
  }
  return out
}
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
/** Mêmes fichiers que le commit (limités à `chemins`), même blob chacun. */
export function verifierArbre(dossier, commit, chemins = []) {
  const arbre = new Map()
  for (const c of chemins.length ? chemins : ['']) for (const [k, v] of lsTree(commit, c)) arbre.set(k, v)
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
 * Extrait <sha> (limité à `chemins`, des chemins de premier niveau) dans `dest` (sous .orchestre/travail/) par
 * `git archive`, écrit la marque <dest>.json ; réutilise l'arbre s'il porte la même marque et reste identique blob pour
 * blob. → { dest, commit, fichiers, octets, reutilise }
 */
export function extraireReference(sha, dest, chemins = []) {
  exigerSousTravail(dest)
  const r0 = git(['rev-parse', '--verify', `${sha}^{commit}`])
  if (r0.code !== 0) throw new Error(`référence ${sha} introuvable dans le dépôt : ${court(r0.stderr)}`)
  const commit = r0.stdout.trim()
  const existants = chemins.filter((c) => lsTree(commit, c).size > 0)
  const marque = `${dest}.json`
  const deja = (() => { try { const j = JSON.parse(fs.readFileSync(marque, 'utf8')); return j.commit === commit && JSON.stringify(j.chemins) === JSON.stringify(existants) } catch { return false } })()
  if (deja && fs.existsSync(dest)) {
    const v = verifierArbre(dest, commit, existants)
    if (v.ok) return { dest, commit, fichiers: v.fichiers, octets: v.octets, reutilise: true }
  }
  const partiel = `${dest}.partiel`, tar = `${dest}.tar`
  fs.rmSync(partiel, { recursive: true, force: true }); fs.rmSync(tar, { force: true })
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  try {
    const g = git(['-c', 'core.autocrlf=false', '-c', 'core.eol=lf', 'archive', '--format=tar', `--output=${tar.split(path.sep).join('/')}`, commit, ...(existants.length ? ['--', ...existants] : [])])
    if (g.code !== 0 || !fs.existsSync(tar)) throw new Error(`git archive ${commit.slice(0, 7)} en échec : ${court(g.stderr || g.erreur)}`)
    const x = extraireTar(tar, partiel)
    if (x.commit && x.commit !== commit) throw new Error(`l'archive porte le commit ${x.commit}, ${commit} attendu`)
    const v = verifierArbre(partiel, commit, existants)
    if (!v.ok) throw new Error(`arbre extrait différent de ${commit.slice(0, 7)} : ${v.manquants.length} manquant(s), ${v.intrus.length} en trop, ${v.differents.length} différent(s)`)
    fs.rmSync(dest, { recursive: true, force: true })
    fs.rmSync(marque, { force: true })
    for (let essai = 0; ; essai++) {
      try { fs.renameSync(partiel, dest); break } catch (e) { if (essai >= 4) throw e; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500) }
    }
    fs.writeFileSync(marque, `${JSON.stringify({ commit, chemins: existants, fichiers: v.fichiers, octets: v.octets, extrait_le: new Date().toISOString(), par: 'scripts/fixtures/026-livraison-tresor/commun.mjs extraireReference' }, null, 1)}\n`)
    return { dest, commit, fichiers: v.fichiers, octets: v.octets, reutilise: false }
  } finally {
    fs.rmSync(tar, { force: true })
    fs.rmSync(partiel, { recursive: true, force: true })
  }
}

// ── typecheck ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * `npm run typecheck` (tsc --noEmit) sur <racine>, sans shell : le tsc de <racine>/node_modules (sinon celui du dépôt), le
 * fichier incrémental rangé sous .orchestre/travail/<juge>/tsbuildinfo/ (jamais tsconfig.tsbuildinfo de la racine).
 */
export function typecheck(racine, juge) {
  const pkg = lireOuNull(path.join(racine, 'package.json'))
  let script = null
  try { script = JSON.parse(pkg).scripts?.typecheck ?? null } catch { /* illisible */ }
  if (!script || !/^tsc\b/.test(script)) return { ok: false, detail: `script typecheck absent ou inattendu dans ${path.join(racine, 'package.json')} (« ${script} »)` }
  const tsc = [path.join(racine, 'node_modules', 'typescript', 'bin', 'tsc'), path.join(R, 'node_modules', 'typescript', 'bin', 'tsc')].find((f) => fs.existsSync(f))
  if (!tsc) return { ok: false, detail: 'typescript introuvable dans node_modules' }
  const cle = sha256(path.resolve(racine).toLowerCase()).slice(0, 12)
  const info = exigerSousTravail(path.join(TRAVAIL, juge, 'tsbuildinfo', `${cle}.tsbuildinfo`))
  fs.mkdirSync(path.dirname(info), { recursive: true })
  const args = [tsc, ...script.replace(/^tsc\s*/, '').split(/\s+/).filter(Boolean), '--pretty', 'false', '--tsBuildInfoFile', info]
  const r = lancer(process.execPath, args, { cwd: racine, timeout: 15 * 60_000 })
  const erreurs = r.stdout.split(/\r?\n/).filter((l) => /error TS\d+/.test(l))
  if (r.code === 0) return { ok: true, detail: `tsc --noEmit vert sur ${path.basename(racine)} en ${r.duree.toFixed(0)} s` }
  return { ok: false, detail: `tsc --noEmit en code ${r.code}${r.erreur ? ` (${r.erreur})` : ''} en ${r.duree.toFixed(0)} s : ${erreurs.length} erreur(s) — ${court(erreurs.slice(0, 3).join(' | ') || r.sortie, 400)}` }
}

// ── Comparaisons ──────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Deux montants égaux au centime (null = null). */
export const egalAuCentime = (a, b) => (a === null || a === undefined || b === null || b === undefined ? a == b : Number.isFinite(a) && Number.isFinite(b) && Math.round(a * 100) === Math.round(b * 100))
/** La valeur d'une lecture sourcée ({ valeur, source, a… }) ou la valeur elle-même. */
export const valeurDe = (x) => (x && typeof x === 'object' && !Array.isArray(x) && 'valeur' in x && 'source' in x ? x.valeur : x)
/** Égalité profonde, montants au centime ; → liste des écarts (chemin : a ≠ b). */
export function egalProfond(a, b, chemin = '$', out = []) {
  if (typeof a === 'number' && typeof b === 'number') { if (!egalAuCentime(a, b)) out.push(`${chemin} : ${a} ≠ ${b}`); return out }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const cles = new Set([...Object.keys(a), ...Object.keys(b)])
    for (const k of cles) egalProfond(a[k], b[k], `${chemin}.${k}`, out)
    return out
  }
  if (a !== b && !(a == null && b == null)) out.push(`${chemin} : ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`)
  return out
}
