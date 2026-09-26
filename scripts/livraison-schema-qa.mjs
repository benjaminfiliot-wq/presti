// scripts/livraison-schema-qa.mjs — juge de la migration de livraison de sites_commandes (fiche 026-018, lot A ; critères SC
// de 026-021), écrit par Claude Code AVANT la migration qu'il juge. L'exécutant qui le lance n'y touche jamais (CLAUDE.md:23).
//
//   node scripts/livraison-schema-qa.mjs --numero=<N> [--racine=<dossier>] [--temoin] [--reel]
//
//   --numero=<N>  la migration jugée : supabase/migrations/<N>_livraison_commandes.sql (0103 pour 026-021 ; seul numéro
//                 connu, table FICHES ci-dessous : un autre numéro est un appel invalide, code 2).
//   --racine=<d>  lit le SQL, les jumeaux, le contrôle et lib/siteCommande.ts sous <d> (défaut : le dépôt). SC-9 compare
//                 <d>/supabase/ au HEAD du dépôt qui contient ce script.
//   --temoin      seulement SC-9 (NR) et la règle commune des preuves vides (SC-PV).
//   --reel        Claude Code seulement, après l'application par le connecteur Supabase : SC-10 par PostgREST (clé de
//                 service et clé anonyme lues dans .env.local sans rien afficher), lignes d'essai marquées
//                 essai-026-lt-<horodatage> en @presti-test.invalid, ménage dans un finally (code 1 s'il échoue).
//
// Le SQL se lit sans commentaires par `sansCommentaires` de scripts/sql-nu.mjs (celui de la racine, sinon celui du dépôt),
// jamais par recherche de texte brute. ETATS vient de <racine>/lib/siteCommande.ts, importé dans un processus enfant par
// ts-loader (SC-3). Sortie : une ligne par critère, puis « livraison-schema-qa : PASS|FAIL ». Code 0 seulement si tout est
// vert ; 1 sinon ; 2 si l'appel est invalide ou si un préalable de --reel manque. Un fichier absent fait échouer SC-1 avec
// son chemin ; les critères suivants sont alors « non jugés ». Écriture seulement sous .orchestre/travail/livraison-schema-qa/.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  R, DEPOT_GIT, lireOptions, refuserAppel, creerSortie, court, premiereLigne, lireOuNull, sha256, lf, dossierTravail, lancer,
  lancerEnfant, preparerEnfant, resultatEnfant, importer, differentsDeHead, jugerPreuvesVides, chargerEnvLocal, marqueEssai,
} from './fixtures/026-livraison-tresor/commun.mjs'

const JUGE = 'livraison-schema-qa'
const CE_SCRIPT = fileURLToPath(import.meta.url)
const FICHES = { '0103': '026-021' }
const o = lireOptions(process.argv.slice(2), { connues: ['numero'] })
const RAC = o.racine

// ═══ Le processus enfant (SC-3) : ETATS de <racine>/lib/siteCommande.ts ═════════════════════════════════════════════════
if (o.enfant === 'etats') {
  await preparerEnfant({ racines: [RAC], doubles: {} })
  const { m, erreur } = await importer(RAC, 'lib/siteCommande.ts')
  resultatEnfant(JUGE, { etats: m && Array.isArray(m.ETATS) ? [...m.ETATS] : null, erreur })
} else {

// ═══ Le juge ════════════════════════════════════════════════════════════════════════════════════════════════════════════
const N = o.valeurs.numero
if (!N || !FICHES[N]) refuserAppel(JUGE, `--numero=<N> attendu parmi ${Object.keys(FICHES).join(', ')} (reçu : ${N ?? 'rien'})`)
if (o.inconnues.length || o.positionnels.length) refuserAppel(JUGE, `option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
if (o.temoin && o.reel) refuserAppel(JUGE, '--temoin et --reel ne vont pas ensemble')
if (!fs.existsSync(RAC) || !fs.statSync(RAC).isDirectory()) refuserAppel(JUGE, `--racine introuvable : ${RAC}`)
const FICHE = FICHES[N]
const MIG = `supabase/migrations/${N}_livraison_commandes.sql`
const JUMEAU = `supabase/migrations/_A_COLLER_sql_editor_${N}.sql`
const NU = `supabase/migrations/_A_COLLER_sql_editor_${N}_NU.sql`
const CTRL = `supabase/controles/${N}_livraison_commandes.sql`
const QUATRE = [MIG, JUMEAU, NU, CTRL]
const rel = (p) => path.relative(R, p).split(path.sep).join('/') || '.'
const mode = o.temoin ? 'témoin' : o.reel ? 'réel' : 'complet'
const IDS = o.temoin ? ['SC-9', 'SC-PV'] : ['SC-1', 'SC-2', 'SC-3', 'SC-4', 'SC-5', 'SC-6', 'SC-7', 'SC-8', 'SC-9', ...(o.reel ? ['SC-10'] : []), 'SC-PV']
const s = creerSortie(JUGE, IDS, `${JUGE} --numero=${N} — fiche ${FICHE}, racine ${rel(RAC)}, mode ${mode}`, { nr: ['SC-9'] })

// Le contrat de la fiche 026-021 (tableau du point 1, index du point 3).
const COLONNES = {
  entreprise: { type: 'text' },
  achat_public: { type: 'boolean', notNull: true, defaut: 'false' },
  cgu_acceptees_le: { type: 'timestamptz' },
  lien_envoye_le: { type: 'timestamptz' },
  lien_envois: { type: 'integer', notNull: true, defaut: '0', check: 'lien_envois>=0' },
  rattachee_le: { type: 'timestamptz' },
  courriels: { type: 'jsonb', notNull: true, defaut: "'{}'::jsonb" },
  search_console_le: { type: 'timestamptz' },
  compte_supprime_le: { type: 'timestamptz' },
  retiree_le: { type: 'timestamptz' },
  dossier_jeton_hash: { type: 'text' },
  dossier_expire_le: { type: 'timestamptz' },
  dossier_envoye_le: { type: 'timestamptz' },
  fichiers_purges_le: { type: 'timestamptz' },
  generation_demandee_le: { type: 'timestamptz' },
  generation_tentatives: { type: 'integer', notNull: true, defaut: '0', check: 'generation_tentatives>=0' },
  generation_duree_s: { type: 'integer', check: 'generation_duree_s>=0' },
}
const INDEX = [
  { cols: 'compte_supprime_le', pred: "etat='en_ligne'andcompte_supprime_leisnotnull", dit: "(compte_supprime_le) where etat = 'en_ligne' and compte_supprime_le is not null" },
  { cols: 'cree_le', pred: "etat='brouillon'andachat_public", dit: "(cree_le) where etat = 'brouillon' and achat_public" },
  { cols: 'lower(email)', pred: 'artisan_idisnullandachat_public', dit: '(lower(email)) where artisan_id is null and achat_public' },
]
const CONTRAINTE = 'sites_commandes_etat_check'
const TABLE = /^(?:public\.)?"?sites_commandes"?$/i

// ── Le tokenizer SQL de la racine (sinon celui du dépôt) ────────────────────────────────────────────────────────────────
let sansCommentairesSql = null, MARQUE_CONTROLE = null, outilSql = null
for (const base of [RAC, R]) {
  const f = path.join(base, 'scripts', 'sql-nu.mjs')
  if (!fs.existsSync(f)) continue
  try { const m = await import(pathToFileURL(f).href); sansCommentairesSql = m.sansCommentaires; MARQUE_CONTROLE = m.MARQUE_CONTROLE; outilSql = f; break } catch { /* suivant */ }
}
/** Les instructions d'un SQL déjà sans commentaires, coupées aux « ; » hors chaînes et hors blocs $tag$. */
function instructionsSql(sql) {
  const out = []
  let cour = '', i = 0
  while (i < sql.length) {
    const c = sql[i]
    if (c === "'") { let j = i + 1; while (j < sql.length) { if (sql[j] === "'") { if (sql[j + 1] === "'") j += 2; else { j++; break } } else j++ } cour += sql.slice(i, j); i = j; continue }
    if (c === '$') { const m = /^\$[A-Za-z_]*\$/.exec(sql.slice(i)); if (m) { const f = sql.indexOf(m[0], i + m[0].length); const j = f < 0 ? sql.length : f + m[0].length; cour += sql.slice(i, j); i = j; continue } }
    if (c === ';') { if (cour.trim()) out.push(cour.trim()); cour = ''; i++; continue }
    cour += c; i++
  }
  if (cour.trim()) out.push(cour.trim())
  return out
}
/** Le texte hors chaînes (les littéraux remplacés par '…') : pour chercher des mots-clés sans se faire piéger par un texte. */
const horsChaines = (sql) => sql.replace(/'(?:[^']|'')*'/g, "'…'").replace(/\$([A-Za-z_]*)\$[\s\S]*?\$\1\$/g, '$$$$')
const serre = (t) => String(t).toLowerCase().replace(/\s+/g, '')
/** Découpe une liste « a, b(c, d), e » aux virgules de niveau 0, hors chaînes. */
function virgules(t) {
  const out = []; let n = 0, cour = '', q = false
  for (const c of t) {
    if (c === "'") q = !q
    if (!q && c === '(') n++
    if (!q && c === ')') n--
    if (!q && c === ',' && n === 0) { out.push(cour.trim()); cour = ''; continue }
    cour += c
  }
  if (cour.trim()) out.push(cour.trim())
  return out
}
const TYPES = { 'timestamp with time zone': 'timestamptz', int: 'integer', int4: 'integer', bool: 'boolean' }
/** « integer not null default 0 check (x >= 0) » → { type, notNull, defaut, check } (défaut et contrainte serrés). */
function definition(t) {
  const d = t.trim().replace(/\s+/g, ' ')
  const m = /^(timestamp with time zone|[a-z_][\w]*(?:\s*\[\])?)\s*(.*)$/i.exec(d)
  if (!m) return null
  const type = TYPES[m[1].toLowerCase()] ?? m[1].toLowerCase()
  let reste = m[2]
  const out = { type, notNull: false, defaut: null, check: null, autre: [] }
  while (reste.trim()) {
    reste = reste.trim()
    let x
    if ((x = /^not null\b/i.exec(reste))) { out.notNull = true; reste = reste.slice(x[0].length); continue }
    if ((x = /^null\b/i.exec(reste))) { reste = reste.slice(x[0].length); continue }
    if ((x = /^default\s+/i.exec(reste))) {
      reste = reste.slice(x[0].length)
      // L'expression par défaut va jusqu'au prochain mot-clé de niveau 0.
      let n = 0, q = false, j = 0
      for (; j < reste.length; j++) {
        const c = reste[j]
        if (c === "'") q = !q
        if (q) continue
        if (c === '(') n++
        if (c === ')') n--
        if (n === 0 && /^\s+(not\s+null|null|check|constraint|references|unique|primary)\b/i.test(reste.slice(j))) break
      }
      out.defaut = serre(reste.slice(0, j)); reste = reste.slice(j); continue
    }
    if ((x = /^(?:constraint\s+\w+\s+)?check\s*\(/i.exec(reste))) {
      let n = 1, j = x[0].length
      for (; j < reste.length && n > 0; j++) { if (reste[j] === '(') n++; else if (reste[j] === ')') n-- }
      out.check = serre(reste.slice(x[0].length, j - 1)).replace(/^\((.*)\)$/, '$1'); reste = reste.slice(j); continue
    }
    out.autre.push(reste); break
  }
  return out
}

const lire = (r) => { const t = lireOuNull(path.join(RAC, r)); return t === null ? null : lf(t) }
const sql = o.temoin ? null : lire(MIG)
let analyse = null

// ── SC-1 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
if (!o.temoin) {
  await s.critere('SC-1', () => {
    if (!outilSql) return { echecs: ['scripts/sql-nu.mjs introuvable (ni dans la racine ni dans le dépôt) : le SQL ne peut pas se lire sans commentaires'] }
    if (sql === null) return { echecs: [`${MIG} absent : la migration de la fiche ${FICHE} n'existe pas (encore)`] }
    if (!sql.trim()) return { echecs: [`${MIG} fait 0 octet`] }
    const nu = sansCommentairesSql(sql)
    const inst = instructionsSql(nu)
    const e = []
    const colonnes = new Map(), autres = [], index = [], contraintes = [], drops = [], commentaires = []
    for (const [k, t] of inst.entries()) {
      const hc = horsChaines(t)
      if (/^(begin|commit|start\s+transaction)$/i.test(hc.trim())) continue
      let m
      if ((m = /^alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?([\w."]+)\s+([\s\S]*)$/i.exec(t))) {
        if (!TABLE.test(m[1])) { e.push(`instruction ${k + 1} : alter table ${m[1]} (une autre table que public.sites_commandes)`); continue }
        for (const action of virgules(m[2])) {
          let a
          if ((a = /^add\s+column\s+(?:if\s+not\s+exists\s+)?"?(\w+)"?\s+([\s\S]+)$/i.exec(action))) {
            if (colonnes.has(a[1].toLowerCase())) e.push(`colonne ${a[1]} ajoutée deux fois`)
            colonnes.set(a[1].toLowerCase(), { brut: a[2], def: definition(a[2]), k })
          } else if ((a = /^drop\s+constraint\s+(if\s+exists\s+)?"?(\w+)"?\s*(cascade|restrict)?$/i.exec(action))) drops.push({ nom: a[2], siExiste: !!a[1], k, action })
          else if ((a = /^add\s+constraint\s+"?(\w+)"?\s+check\s*\(([\s\S]*)\)\s*(not\s+valid)?$/i.exec(action))) contraintes.push({ nom: a[1], expr: a[2], k })
          else autres.push({ k, action: court(action, 100) })
        }
      } else if ((m = /^create\s+(unique\s+)?index\s+(?:concurrently\s+)?(?:if\s+not\s+exists\s+)?"?(\w+)"?\s+on\s+(?:only\s+)?([\w."]+)\s*(?:using\s+\w+\s*)?\(([\s\S]*?)\)\s*(?:where\s+([\s\S]+))?$/i.exec(t))) {
        if (!TABLE.test(m[3])) { e.push(`instruction ${k + 1} : index ${m[2]} sur ${m[3]} (une autre table)`); continue }
        index.push({ nom: m[2], unique: !!m[1], cols: serre(m[4]), pred: m[5] ? serre(m[5]).replace(/^\((.*)\)$/, '$1') : null, k })
      } else if ((m = /^comment\s+on\s+column\s+([\w."]+)\s+is\s+'/i.exec(t))) {
        const parties = m[1].replace(/"/g, '').split('.')
        const col = parties.pop(), table = parties.join('.')
        if (!TABLE.test(table) || !COLONNES[col.toLowerCase()]) e.push(`instruction ${k + 1} : comment on column ${m[1]} (hors des 17 colonnes de sites_commandes)`)
        else commentaires.push(col)
      } else autres.push({ k, action: court(t, 100) })
    }
    analyse = { inst, colonnes, autres, index, contraintes, drops, nu }
    for (const [nom, attendu] of Object.entries(COLONNES)) {
      const c = colonnes.get(nom)
      if (!c) { e.push(`colonne ${nom} absente`); continue }
      const d = c.def
      if (!d) { e.push(`colonne ${nom} : définition illisible « ${court(c.brut, 60)} »`); continue }
      if (d.type !== attendu.type) e.push(`colonne ${nom} : type ${d.type}, ${attendu.type} attendu`)
      if (d.notNull !== !!attendu.notNull) e.push(`colonne ${nom} : ${d.notNull ? 'not null en trop' : 'not null manquant'}`)
      if ((d.defaut ?? null) !== (attendu.defaut ?? null)) e.push(`colonne ${nom} : défaut ${d.defaut ?? 'aucun'}, ${attendu.defaut ?? 'aucun'} attendu`)
      if ((d.check ?? null) !== (attendu.check ?? null)) e.push(`colonne ${nom} : contrainte ${d.check ?? 'aucune'}, ${attendu.check ?? 'aucune'} attendue`)
      if (d.autre.length) e.push(`colonne ${nom} : clause inattendue « ${court(d.autre.join(' '), 60)} »`)
    }
    for (const nom of colonnes.keys()) if (!COLONNES[nom]) e.push(`colonne ${nom} ajoutée : elle n'est pas dans le tableau de la fiche`)
    for (const a of autres) e.push(`instruction ${a.k + 1} hors contrat (ni colonne, ni contrainte d'état, ni index) : « ${a.action} »`)
    return { echecs: e, detail: `${MIG} : ${colonnes.size} colonnes ajoutées à public.sites_commandes, exactement les 17 du tableau (type, défaut et contrainte de chacune), aucune autre table touchée (${inst.length} instruction(s) lues sans commentaires par ${rel(outilSql)})` }
  })
  if (s.enEchec('SC-1') && !analyse) s.nonJuges(['SC-2', 'SC-3', 'SC-4', 'SC-5', 'SC-6', 'SC-7', 'SC-8', 'SC-9', ...(o.reel ? ['SC-10'] : [])], `${MIG} illisible ou absent (SC-1)`)
}

if (analyse) {
  const { inst, drops, contraintes, index, nu } = analyse
  const hcTout = horsChaines(nu)

  // ── SC-2 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
  await s.critere('SC-2', () => {
    const e = []
    const motifs = [[/\bdrop\s+table\b/i, 'drop table'], [/\bdrop\s+column\b/i, 'drop column'], [/\bdelete\s+from\b|\bdelete\b/i, 'delete'], [/(^|[^\w.])update\s+[\w."]+\s+set\b/i, 'update'], [/\btruncate\b/i, 'truncate'], [/\balter\s+column\s+"?\w+"?\s+(?:set\s+data\s+)?type\b/i, 'alter … type']]
    for (const [k, t] of inst.entries()) {
      const hc = horsChaines(t)
      for (const [re, nom] of motifs) if (re.test(hc)) e.push(`instruction ${k + 1} : ${nom} — « ${court(t, 90)} »`)
      if (/\bdrop\b/i.test(hc) && !/^alter\s+table/i.test(hc.trim())) e.push(`instruction ${k + 1} : suppression hors alter table — « ${court(t, 90)} »`)
    }
    for (const d of drops) {
      if (d.nom.toLowerCase() !== CONTRAINTE) e.push(`drop constraint ${d.nom} : seule ${CONTRAINTE} peut être supprimée`)
      else if (!d.siExiste) e.push(`drop constraint ${CONTRAINTE} sans « if exists »`)
      else if (/cascade/i.test(d.action)) e.push(`drop constraint ${CONTRAINTE} … cascade`)
      else if (!contraintes.some((c) => c.nom.toLowerCase() === CONTRAINTE && (c.k > d.k || (c.k === d.k)))) e.push(`${CONTRAINTE} supprimée sans être recréée après, dans le même fichier`)
    }
    // Une autre forme de drop dans un alter table (drop default, drop not null, drop index…) : hors de la seule suppression permise.
    for (const [k, t] of inst.entries()) {
      const hc = horsChaines(t)
      if (!/^alter\s+table/i.test(hc.trim())) continue
      for (const a of virgules(hc.replace(/^alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?[\w."]+\s+/i, ''))) if (/\bdrop\b/i.test(a) && !/^drop\s+constraint\s+(?:if\s+exists\s+)?"?sites_commandes_etat_check"?$/i.test(a.trim())) e.push(`instruction ${k + 1} : « ${court(a, 80)} » (seule la contrainte d'état peut être supprimée)`)
    }
    return { echecs: [...new Set(e)], detail: `aucune instruction destructrice ; ${drops.length ? `seule suppression : drop constraint if exists ${CONTRAINTE}, recréée plus loin dans le fichier` : 'aucune suppression'}` }
  })

  // ── SC-3 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
  await s.critere('SC-3', () => {
    const r = lancerEnfant({ juge: JUGE, script: CE_SCRIPT, racine: RAC, mode: 'etats', timeout: 60_000 })
    if (!r.res) return { echecs: [`ETATS illisible : l'enfant (ts-loader) a rendu le code ${r.code}${r.erreur ? ` (${r.erreur})` : ''} — ${court(r.sortie.trim().split(/\r?\n/).pop(), 160)}`] }
    if (!r.res.etats) return { echecs: [`lib/siteCommande.ts n'exporte pas ETATS (${r.res.erreur ?? 'export absent'})`] }
    const attendu = [...r.res.etats, 'retiree']
    const c = contraintes.filter((x) => x.nom.toLowerCase() === CONTRAINTE)
    if (c.length !== 1) return { echecs: [`${c.length} « add constraint ${CONTRAINTE} » dans ${MIG}, 1 attendue`] }
    if (!drops.some((d) => d.nom.toLowerCase() === CONTRAINTE && d.k <= c[0].k)) return { echecs: [`${CONTRAINTE} recréée sans « drop constraint if exists » avant elle`] }
    const m = /^\s*\(?\s*etat\s+in\s*\(([\s\S]*)\)\s*\)?\s*$/i.exec(c[0].expr)
    if (!m) return { echecs: [`la contrainte n'a pas la forme « check (etat in (…)) » : « ${court(c[0].expr, 90)} »`] }
    const liste = virgules(m[1]).map((x) => x.trim().replace(/::text$/i, ''))
    const lus = liste.map((x) => (/^'([^']*)'$/.exec(x) ?? [])[1] ?? `?${x}`)
    const e = []
    if (JSON.stringify(lus) !== JSON.stringify(attendu)) e.push(`la contrainte liste ${JSON.stringify(lus)}, ${JSON.stringify(attendu)} attendu (ETATS de lib/siteCommande.ts, dans l'ordre, suivis de 'retiree')`)
    return { echecs: e, detail: `${CONTRAINTE} recréée avec ${lus.map((x) => `'${x}'`).join(', ')} : ETATS de lib/siteCommande.ts (importé par ts-loader) suivis de 'retiree'` }
  })

  // ── SC-4 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
  await s.critere('SC-4', () => {
    const e = []
    for (const [re, nom] of [[/\bgrant\b/i, 'grant'], [/\bcreate\s+(?:or\s+replace\s+)?policy\b/i, 'create policy'], [/\bdisable\s+row\s+level\s+security\b/i, 'disable row level security'], [/\bsecurity\s+definer\b/i, 'security definer']]) if (re.test(hcTout)) e.push(`${nom} présent dans ${MIG}`)
    return { echecs: e, detail: 'ni grant, ni create policy, ni disable row level security, ni fonction security definer' }
  })

  // ── SC-5 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
  await s.critere('SC-5', () => {
    const e = []
    for (const x of INDEX) {
      const t = index.filter((i) => i.cols === serre(x.cols))
      if (!t.length) { e.push(`index ${x.dit} absent`); continue }
      if (!t.some((i) => i.pred === x.pred)) e.push(`index sur (${x.cols}) : prédicat « ${t.map((i) => i.pred ?? 'aucun').join(' | ')} », « ${x.dit.replace(/^\([^)]*\)\) where |^\([^)]*\) where /, '')} » attendu`)
    }
    const connus = new Set(INDEX.map((x) => serre(x.cols)))
    for (const i of index) if (!connus.has(i.cols)) e.push(`index ${i.nom} sur (${i.cols}) : hors des trois index de la fiche`)
    if (index.length !== 3) e.push(`${index.length} index créés, 3 attendus`)
    return { echecs: [...new Set(e)], detail: `les trois index partiels, prédicats exacts : ${index.map((i) => i.nom).join(', ')}` }
  })

  // ── SC-6 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
  await s.critere('SC-6', () => {
    const e = []
    const TRAV = dossierTravail(JUGE, 'jumeaux')
    const outil = fs.existsSync(path.join(RAC, 'scripts', 'sql-nu.mjs')) ? path.join(RAC, 'scripts', 'sql-nu.mjs') : outilSql
    for (const j of [JUMEAU, NU]) {
      const t = lire(j)
      if (t === null) { e.push(`${j} absent`); continue }
      if (!t.trim()) { e.push(`${j} fait 0 octet`); continue }
      // Le contrôle après collage (après MARQUE_CONTROLE) est la seule liberté d'un jumeau : il est retiré avant la comparaison.
      const i = MARQUE_CONTROLE ? t.indexOf(MARQUE_CONTROLE) : -1
      const f = path.join(TRAV, path.basename(j))
      fs.writeFileSync(f, i >= 0 ? t.slice(0, i) : t)
      const r = lancer(process.execPath, [outil, '--verifier', path.join(RAC, MIG), f], { cwd: RAC, timeout: 60_000 })
      if (r.code !== 0) e.push(`${j} ≠ ${MIG} (sql-nu --verifier, code ${r.code}) : ${court(r.sortie, 160)}`)
    }
    const e2e = fs.existsSync(path.join(RAC, 'scripts', 'migrations-jumelles-e2e.mjs')) ? path.join(RAC, 'scripts', 'migrations-jumelles-e2e.mjs') : path.join(R, 'scripts', 'migrations-jumelles-e2e.mjs')
    const r = lancer(process.execPath, [e2e], { cwd: RAC, timeout: 120_000 })
    const bilan = r.stdout.trim().split(/\r?\n/).pop()
    if (r.code !== 0) e.push(`migrations-jumelles-e2e en code ${r.code} : ${court(r.stdout.split(/\r?\n/).filter((l) => /❌/.test(l)).slice(0, 2).join(' | ') || bilan, 200)}`)
    return { echecs: e, detail: `${path.basename(JUMEAU)} et ${path.basename(NU)} portent le même SQL que ${path.basename(MIG)} (sql-nu --verifier, contrôle final retiré) ; migrations-jumelles-e2e vert (${court(bilan, 60)})` }
  })

  // ── SC-7 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
  await s.critere('SC-7', () => {
    const t = lire(CTRL)
    if (t === null) return { echecs: [`${CTRL} absent`] }
    if (!t.trim()) return { echecs: [`${CTRL} fait 0 octet`] }
    const nuC = sansCommentairesSql(t)
    const hc = horsChaines(nuC)
    const e = []
    const ecriture = /\b(insert\s+into|update\s+[\w."]+\s+set|delete\s+from|truncate|alter\s+(?:table|index|function|policy)|drop\s+\w+|create\s+(?:or\s+replace\s+)?(?:table|index|function|policy|view|trigger|type|schema)|grant|revoke|comment\s+on|do\s+\$|call\s+\w+|copy\s+\w+|refresh\s+materialized|vacuum|reindex|cluster|lock\s+table|set\s+(?:role|session))\b/i.exec(hc)
    if (ecriture) e.push(`${CTRL} écrit : « ${court(ecriture[0], 40)} »`)
    const noms = [...Object.keys(COLONNES), CONTRAINTE, ...index.map((i) => i.nom)]
    const bas = nuC.toLowerCase()
    for (const n of noms) if (!bas.includes(n.toLowerCase())) e.push(`${n} n'est pas contrôlé`)
    if (!/\bpg_constraint\b/i.test(hc)) e.push('la contrainte n’est pas lue dans pg_constraint')
    if (!bas.includes('retiree')) e.push('le contrôle de la contrainte ne cherche pas \'retiree\'')
    if (!/\binformation_schema\s*\.\s*columns\b/i.test(hc)) e.push('les colonnes ne sont pas lues dans information_schema.columns')
    if (!/'oui/i.test(nuC) || !/'non/i.test(nuC)) e.push('pas de réponse « oui » / « non » dans le contrôle')
    // Lignes de réponse : une par select (unions comprises), plus, pour chaque liste « values (…), (…) », ses tuples en trop.
    let lignes = (hc.match(/\bunion\s+all\b/gi) ?? []).length + instructionsSql(nuC).length
    for (const m of hc.matchAll(/\bvalues\s*(?=\()/gi)) {
      let i = m.index + m[0].length, tuples = 0
      for (;;) {
        while (/\s/.test(hc[i] ?? '')) i++
        if (hc[i] !== '(') break
        let n = 0
        for (; i < hc.length; i++) { if (hc[i] === '(') n++; else if (hc[i] === ')') { n--; if (n === 0) { i++; break } } }
        tuples++
        while (/\s/.test(hc[i] ?? '')) i++
        if (hc[i] !== ',') break
        i++
      }
      if (tuples > 1) lignes += tuples - 1
    }
    if (lignes < noms.length) e.push(`${lignes} ligne(s) de réponse, ${noms.length} attendues (17 colonnes, la contrainte, 3 index)`)
    return { echecs: e, detail: `${CTRL} : lecture seule, une réponse oui/non pour chacune des 17 colonnes (information_schema.columns), la contrainte (pg_constraint, 'retiree') et les ${index.length} index` }
  })

  // ── SC-8 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
  await s.critere('SC-8', () => {
    const base = fs.existsSync(path.join(RAC, '.orchestre', 'preuves')) ? RAC : DEPOT_GIT
    const f = path.join(base, '.orchestre', 'preuves', FICHE, 'essai-a-sec.md')
    const rel = (p) => path.relative(DEPOT_GIT, p).split(path.sep).join('/')
    const e = []
    if (!fs.existsSync(f)) return { echecs: [`${rel(f)} absent : l'essai à sec n'a pas été consigné`] }
    const t = fs.readFileSync(f, 'utf8')
    if (!t.length) return { echecs: [`${rel(f)} fait 0 octet`] }
    const phrase = `essai-a-sec-${N}: toutes les instructions ont passé`
    if (!t.includes(phrase)) e.push(`${rel(f)} ne contient pas la phrase exacte « ${phrase} »`)
    const nuOctets = (() => { try { return fs.readFileSync(path.join(RAC, NU)) } catch { return null } })()
    if (!nuOctets) e.push(`${NU} absent : empreinte impossible`)
    else {
      const h = sha256(nuOctets)
      if (!t.toLowerCase().includes(h)) e.push(`${rel(f)} ne porte pas l'empreinte SHA-256 du jumeau nu courant (${h.slice(0, 16)}…) : l'essai a tourné sur une autre version`)
    }
    return { echecs: e, detail: `${rel(f)} : la phrase « ${phrase} » et l'empreinte SHA-256 du jumeau nu courant` }
  })
}

// ── SC-9 (NR) ────────────────────────────────────────────────────────────────────────────────────────────────────────────
if (o.temoin || analyse) {
  await s.critere('SC-9', () => {
    const d = differentsDeHead(RAC, 'supabase', QUATRE)
    return { echecs: d.map((x) => `${x} (hors des quatre fichiers de la fiche)`), detail: `supabase/ identique à HEAD hors ${QUATRE.map((x) => path.basename(x)).join(', ')} (git diff --quiet${o.racineParDefaut ? '' : ', appliqué à la copie'})` }
  })
}

// ── SC-10 (--reel) ───────────────────────────────────────────────────────────────────────────────────────────────────────
let codeMenage = 0
if (o.reel && analyse) {
  chargerEnvLocal()
  const SB = process.env.NEXT_PUBLIC_SUPABASE_URL, SVC = process.env.SUPABASE_SERVICE_ROLE_KEY, ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!SB || !SVC || !ANON) { s.echoue('SC-10', 'préalable absent : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_ANON_KEY manque (.env.local)'); s.finir(); process.exit(2) }
  const marque = marqueEssai()
  const crees = []
  const h = (cle) => ({ apikey: cle, Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' })
  const rest = (chemin, init = {}, cle = SVC) => fetch(`${SB}/rest/v1/${chemin}`, { ...init, headers: { ...h(cle), ...(init.headers ?? {}) }, signal: AbortSignal.timeout(20_000) })
  const e = []
  try {
    const cols = Object.keys(COLONNES).join(',')
    const r1 = await rest(`sites_commandes?select=${cols}&limit=1`)
    if (r1.status !== 200) e.push(`select des 17 colonnes en service_role : ${r1.status} ${court(await r1.text(), 120)}`)
    const ligne = (etat) => ({ email: `${marque}.${etat}@presti-test.invalid`, etat, metier: 'Essai', entreprise: marque })
    const r2 = await rest('sites_commandes?select=id', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(ligne('retiree')) })
    const j2 = await r2.json().catch(() => null)
    if (Array.isArray(j2) && j2[0]?.id) crees.push(j2[0].id)
    if (r2.status !== 201) e.push(`insertion etat = 'retiree' : ${r2.status} ${court(JSON.stringify(j2), 120)}, 201 attendu`)
    const r3 = await rest('sites_commandes?select=id', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(ligne('inconnu')) })
    const j3 = await r3.json().catch(() => null)
    if (Array.isArray(j3) && j3[0]?.id) crees.push(j3[0].id)
    if (!(r3.status >= 400 && r3.status < 500 && String(j3?.code) === '23514')) e.push(`insertion etat = 'inconnu' : ${r3.status} ${court(JSON.stringify(j3), 120)}, refus de contrainte (23514) attendu`)
    const r4 = await rest('sites_commandes?select=dossier_jeton_hash&limit=1', {}, ANON)
    const j4 = await r4.json().catch(() => null)
    if (!((r4.status === 401 || r4.status === 403) || String(j4?.code) === '42501')) e.push(`select de dossier_jeton_hash en anon : ${r4.status} ${court(JSON.stringify(j4), 120)}, refus attendu`)
  } catch (err) { e.push(`PostgREST interrompu : ${premiereLigne(err)}`) } finally {
    try {
      const r = await rest(`sites_commandes?email=like.${encodeURIComponent(`${marque}.%`)}`, { method: 'DELETE', headers: { Prefer: 'return=representation' } })
      const reste = await rest(`sites_commandes?select=id&email=like.${encodeURIComponent(`${marque}.%`)}`)
      const j = await reste.json().catch(() => null)
      if (!r.ok || !Array.isArray(j) || j.length) { e.push(`ménage incomplet : ${Array.isArray(j) ? j.length : '?'} ligne(s) ${marque} restante(s)`); codeMenage = 1 }
    } catch (err) { e.push(`ménage interrompu : ${premiereLigne(err)}`); codeMenage = 1 }
  }
  s.juger('SC-10', e, `PostgREST : select des 17 colonnes → 200 ; insertion 'retiree' (${marque}, @presti-test.invalid) → 201 ; 'inconnu' → refus 23514 ; dossier_jeton_hash en anon → refusé ; ménage fait (${crees.length} ligne(s) d'essai retirée(s))`)
}

// ── La règle commune des preuves vides ───────────────────────────────────────────────────────────────────────────────────
jugerPreuvesVides(s, 'SC', RAC, FICHE)
const code = s.finir()
process.exit(codeMenage || code)
}
