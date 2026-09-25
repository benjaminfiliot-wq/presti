// scripts/verrou-site-qa.mjs — le juge de la fiche 025-04 (migration 0093 : fermer la porte du site gratuit), écrit par Claude Code
// pour la fiche 025-01 (point 6). Lecture statique des migrations : aucune base n'est touchée, sauf avec --reel.
//
// Ce qui est jugé (dans <racine>, la racine du dépôt par défaut) :
//   VS-1  supabase/migrations/0093_site_fige.sql redéfinit public.lock_artisan_privileges() avec le corps de
//         0068_controle.sql:157-186, plus exactement quatre lignes « new.site_active := old.site_active; », site_tier,
//         site_contenu, site_origine, et rien de retiré. Mesuré ainsi :
//           - 0093 ne porte qu'une instruction SQL (commentaires ôtés), le create or replace function : « Rien d'autre » (025-04 §1) ;
//           - la définition précédente est la dernière des migrations 00NN_*.sql antérieures à 0093, et c'est bien
//             0068_controle.sql, lignes 157 à 187 (la fiche dit 157-186 : le « end $; » est à la ligne 187) ; aucune migration postérieure à 0068 (hors 0093) ne nomme la fonction, et aucune
//             postérieure à 0093 ne la redéfinit (0093 est la définition en vigueur) ;
//           - l'en-tête (tout ce qui précède le corps $$ … $$) est celui de 0068, espaces près ; après le corps, seulement « ; » ;
//           - le corps, ligne de code par ligne de code (commentaires ôtés, espaces de bord ôtés et répétés réduits, étiquette
//             $tag$ ramenée à $$), contient toutes les lignes de 0068 dans l'ordre (plus longue sous-suite commune) et, en plus,
//             exactement les quatre lignes attendues, une fois chacune (casse libre pour ces quatre-là) ;
//           - chacune des quatre est dans la branche « then » du bloc if current_user not in ('service_role', 'postgres'), à
//             sa profondeur 1 : ni dans le bloc « if old.origine_declaree is not null », ni après un else ;
//           - choix du juge : les quatre colonnes existent (une migration antérieure à 0093 les ajoute à public.artisans, aucune
//             ne les retire). Une affectation à une colonne absente ferait échouer CHAQUE mise à jour de artisans, /profil compris.
//         Les commentaires sont libres (ils sont notés, pas jugés).
//   VS-2  _A_COLLER_sql_editor_0093.sql et _A_COLLER_sql_editor_0093_NU.sql (supabase/migrations/) existent, se parsent et sont
//         équivalents (node <racine>/scripts/sql-nu.mjs --verifier), sur le modèle des jumeaux 0088 à 0092 (tous conformes à ces
//         règles le 24/09) :
//           - non vides ; « se parsent » : chaînes, blocs $tag$ et commentaires /* refermés, parenthèses équilibrées (aussi dans le
//             corps plpgsql), chaque instruction commence par une commande SQL connue ; ni CONSTANT ni U&'…' (les deux pièges de
//             scripts/migrations-jumelles-e2e.mjs, relevés le 08/09) ;
//           - sql-nu.mjs --verifier 0093_site_fige.sql _A_COLLER_sql_editor_0093.sql → code 0 (le jumeau porte la migration) ;
//           - sql-nu.mjs --verifier _A_COLLER_sql_editor_0093.sql <jumeau nu coupé à la marque de contrôle> → code 0 (le jumeau
//             nu entier diverge toujours à cause du contrôle de fin : le juge le coupe à MARQUE_CONTROLE, copie dans
//             .orchestre/travail/verrou-site-qa/nu/) ;
//           - la même égalité est refaite par le juge avec son propre découpage (sql-nu.mjs est lu dans la racine : un --verifier
//             qui répondrait toujours oui ne suffit pas) ;
//           - le jumeau nu sort de sql-nu.mjs : sa première ligne est la bande de 28 tirets qui nomme le fichier, et ce qui suit la
//             marque de contrôle est exactement supabase/controles/0093_site_fige.sql (sql-nu.mjs … --controle <ce fichier>).
//   VS-3  supabase/controles/0093_site_fige.sql contrôle chacune des quatre lignes dans pg_get_functiondef et répond « oui » :
//           - non vide, se parse, lecture seule (chaque instruction commence par select ou with ; aucun insert, update, delete,
//             create, alter, drop, grant, revoke, truncate… hors chaînes) ; lit pg_get_functiondef('public.lock_artisan_privileges()'
//             ::regprocedure) ;
//           - simulation : le juge reconstruit ce que pg_get_functiondef rend pour la fonction de 0093 (en-tête de Postgres, corps
//             recopié tel quel) et évalue chaque « case when … then '…' else '…' end » du contrôle (like, ilike, ~, ~*, !~, !~*,
//             position, strpos, and, or, not, parenthèses ; forme de supabase/controles/0092_audience_flux_nu.sql) ;
//           - pour chaque colonne, une ligne à elle : « oui » sur 0093 ; pas « oui » quand on retire sa ligne d'affectation, ni
//             quand on la remplace par un commentaire « -- site_x » (un contrôle qui ne chercherait que le nom de la colonne ne
//             contrôle pas la ligne) ; « oui » quand on retire une des trois autres ; pas « oui » sur la fonction de 0068 ;
//           - toute ligne qui peut répondre « oui » répond « oui » sur 0093 ; une ligne non simulable qui parle d'une colonne
//             site_* est un échec, une autre est seulement notée.
//         Si 0093 est absente ou non conforme, le contrôle est jugé contre la fonction attendue (0068 + les quatre lignes après
//         « new.est_demo := old.est_demo; »), et c'est noté.
//   VS-4  aucune autre migration n'a changé : chaque fichier de supabase/migrations/ suivi à 1620723 (REFERENCE_COMMIT) est
//         présent et identique (dépôt : git diff --no-renames 1620723 ; arbre extrait ou témoin : blob par blob, fins de ligne
//         CRLF ramenées à LF), et les seuls fichiers ajoutés sont les trois de 0093 — plus, tolérés et notés depuis le 24/09
//         (fiche 025-13), les fichiers d'un numéro SUPÉRIEUR à 0093 (00NN_*.sql, _A_COLLER_sql_editor_00NN[_NU].sql, numéro lu
//         dans le nom sur disque) ajoutés par des fiches postérieures ; un ajout de numéro ≤ 0093 reste refusé.
//   (VS-1, 24/09, fiche 025-13 : une migration postérieure à 0093 peut redéfinir lock_artisan_privileges, à condition de garder
//         toutes les lignes de 0093, son en-tête et les quatre lignes du site dans la branche then ; tout autre usage du nom
//         — ou une redéfinition qui en perd — reste rouge.)
//   --reel (VS-REEL, VS-MENAGE ; jamais lancé par un exécutant, lancé par Claude Code seulement, après le collage de 0093) :
//         un compte d'essai (@presti-test.invalid) est créé par l'API d'administration avec site_active = false, site_tier = 1,
//         site_contenu = {"verrou":"initial"}, site_origine = 'abonnement' ; avec SA PROPRE session (clé anon + mot de passe), il
//         écrit site_active = true, site_tier = 3, site_contenu = {"verrou":"force"}, site_origine = 'commande' ET une bio
//         marquée ; la bio doit changer (la mise à jour est bien passée : sans ce témoin, un refus de la RLS passerait pour un
//         verrou) et les quatre colonnes doivent être relues inchangées (par sa session et par l'administration) ; puis le
//         serveur (service_role) ouvre le site et le relit ouvert (les écritures légitimes passent toujours). Ménage dans un
//         finally : purger_compte_test, repli delete + deleteUser, puis relecture ; VS-MENAGE rouge (code 1) s'il reste quoi que ce
//         soit. Lit .env.local (URL, clé anon, clé service) sans jamais rien en afficher.
//
// Options (scripts/fixtures/025/commun.mjs, lireOptions) :
//   --racine=<dossier>  tout est lu dans ce dossier (supabase/migrations, supabase/controles, scripts/sql-nu.mjs) ; un arbre
//                       extrait (.orchestre/travail/025-01/reference) est comparé à son commit (reference.json), sinon à 1620723.
//   --temoin            juge l'arbre témoin : .orchestre/travail/verrou-site-qa/temoin/, où sont copiés depuis la racine les
//                       fichiers de supabase/migrations/ et supabase/controles/ suivis à 1620723 et scripts/sql-nu.mjs, puis
//                       superposé scripts/fixtures/025/temoins/verrou-site-qa/ (un 0093 conforme, ses deux jumeaux fabriqués par
//                       sql-nu.mjs --controle, et son contrôle). Ce témoin simule l'état « après » 025-04 ; VS-1 à VS-4 doivent y
//                       passer. Il n'y a pas de critère de non-régression propre à ce juge : le témoin rejoue donc les quatre, et
//                       VS-4 y vérifie au passage que les migrations de la racine sont toujours celles de 1620723.
//   --reel              voir plus haut ; seul, sur la racine du dépôt.
//
// Sortie : une ligne « PASS|FAIL <id> — … » par critère, puis « verrou-site-qa : PASS » ou « … : FAIL — ids » ; code 0 seulement si
// tout est vert (creerSortie). Le juge n'écrit que sous .orchestre/travail/verrou-site-qa/.
//
// Usage : node scripts/verrou-site-qa.mjs [--racine=<dossier>] [--temoin] | node scripts/verrou-site-qa.mjs --reel
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {
  R, FIXTURES, REFERENCE_COMMIT, creerSortie, lireOptionsOuQuitter, preparerTemoin, dossierTravail, lsTree, git, estRacineGit,
  commitDeReference, lireOuNull, shaBlob, lancer,
} from './fixtures/025/commun.mjs'

const JUGE = 'verrou-site-qa'
const COLONNES = ['site_active', 'site_tier', 'site_contenu', 'site_origine']
const LIGNE = (c) => `new.${c} := old.${c};`
const MIGRATION = '0093_site_fige.sql'
const JUMEAU = '_A_COLLER_sql_editor_0093.sql'
const JUMEAU_NU = '_A_COLLER_sql_editor_0093_NU.sql'
const CONTROLE = '0093_site_fige.sql'
const CONTROLE_REL = `supabase/controles/${CONTROLE}`
const AJOUTS_PERMIS = [MIGRATION, JUMEAU, JUMEAU_NU]
// La fiche cite 0068_controle.sql:157-186 ; le « end $$; » de cette définition est à la ligne 187 (186 = « return new; »).
const PRECEDENTE = { fichier: '0068_controle.sql', debut: 157, fin: 187 }
/** La marque que sql-nu.mjs pose avant le contrôle de fin (scripts/sql-nu.mjs:21, MARQUE_CONTROLE). */
const MARQUE_CONTROLE = '-- CONTROLE APRES COLLAGE (ne modifie rien) : ce qui suit ne fait que LIRE.'
const TETE_NU = new RegExp(`^-{28} ${JUMEAU_NU.replace(/\./g, '\\.')} — coller ce fichier EN ENTIER\\.`)
const CREE_FONCTION = /^create\s+or\s+replace\s+function\s+public\.lock_artisan_privileges\s*\(\s*\)/i
const DEFINIT = /\bcreate\s+(?:or\s+replace\s+)?function\s+(?:public\s*\.\s*)?"?lock_artisan_privileges"?\s*\(/i
const NOMME = /\block_artisan_privileges\b/i
const SI_EXTERIEUR = /^if current_user not in \('service_role', 'postgres'\) then$/i
const COMMANDES_SQL = new Set(['create', 'alter', 'drop', 'select', 'with', 'insert', 'update', 'delete', 'comment', 'grant', 'revoke', 'do', 'begin', 'commit', 'rollback', 'set', 'reset', 'notify', 'truncate', 'analyze', 'vacuum', 'refresh', 'lock', 'call', 'values', 'explain', 'reindex', 'security', 'table'])
const MOTS_ECRITURE = new Set(['insert', 'update', 'delete', 'merge', 'truncate', 'drop', 'alter', 'create', 'grant', 'revoke', 'copy', 'call', 'do', 'execute', 'perform', 'set', 'reset', 'lock', 'vacuum', 'analyze', 'refresh', 'comment', 'begin', 'commit', 'rollback', 'savepoint', 'notify', 'listen', 'reindex', 'cluster', 'discard', 'security', 'into'])

const premiere = (e) => String((e && e.message) || e).split('\n')[0].slice(0, 300)
const court = (x, n = 140) => { const t = String(x ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t }
/** Un fichier texte, fins de ligne ramenées à LF et BOM ôté, ou null s'il est absent. */
const lireTexte = (f) => { const b = lireOuNull(f); return b === null ? null : b.toString('utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n') }
const ligneDe = (texte, pos) => texte.slice(0, pos).split('\n').length
const chemins = (racine) => ({
  dir: path.join(racine, 'supabase', 'migrations'),
  M: path.join(racine, 'supabase', 'migrations', MIGRATION),
  A: path.join(racine, 'supabase', 'migrations', JUMEAU),
  N: path.join(racine, 'supabase', 'migrations', JUMEAU_NU),
  C: path.join(racine, 'supabase', 'controles', CONTROLE),
  sqlNu: path.join(racine, 'scripts', 'sql-nu.mjs'),
})

// ── Découpage du SQL (état par état, comme scripts/sql-nu.mjs) ──────────────────────────────────────────────────────────────
/**
 * Segments du SQL : { type: 'code' | 'chaine' | 'dollar' | 'ligne' | 'bloc', texte, pos, ferme?, tag?, corps? }. Un « -- » ne
 * commence un commentaire que hors chaîne et hors bloc $tag$ ; '' est une apostrophe dans une chaîne.
 */
function decouperSql(sql) {
  const seg = []
  let i = 0, code = '', debutCode = 0
  const vider = () => { if (code) seg.push({ type: 'code', texte: code, pos: debutCode }); code = '' }
  while (i < sql.length) {
    const c = sql[i], d = sql.slice(i, i + 2)
    if (c === "'") {
      let j = i + 1, ferme = false
      while (j < sql.length) { if (sql[j] === "'") { if (sql[j + 1] === "'") j += 2; else { j++; ferme = true; break } } else j++ }
      vider(); seg.push({ type: 'chaine', texte: sql.slice(i, j), pos: i, ferme }); i = j; continue
    }
    if (c === '$') {
      const m = /^\$(?:[A-Za-z_][A-Za-z_0-9]*)?\$/.exec(sql.slice(i))
      if (m) {
        const fin = sql.indexOf(m[0], i + m[0].length)
        const j = fin < 0 ? sql.length : fin + m[0].length
        vider(); seg.push({ type: 'dollar', texte: sql.slice(i, j), pos: i, tag: m[0], corps: sql.slice(i + m[0].length, fin < 0 ? sql.length : fin), ferme: fin >= 0 }); i = j; continue
      }
    }
    if (d === '--') { const nl = sql.indexOf('\n', i); const j = nl < 0 ? sql.length : nl; vider(); seg.push({ type: 'ligne', texte: sql.slice(i, j), pos: i }); i = j; continue }
    if (d === '/*') { const f = sql.indexOf('*/', i + 2); const j = f < 0 ? sql.length : f + 2; vider(); seg.push({ type: 'bloc', texte: sql.slice(i, j), pos: i, ferme: f >= 0 }); i = j; continue }
    if (!code) debutCode = i
    code += c; i++
  }
  vider()
  return seg
}
/** Le SQL sans commentaires hors blocs $tag$ (même règle que sansCommentaires de sql-nu.mjs). */
const sansCommentaires = (sql) => decouperSql(sql).filter((s) => s.type !== 'ligne' && s.type !== 'bloc').map((s) => s.texte).join('')
/** Le SQL sans commentaires, y compris dans le corps des blocs $tag$ (plpgsql). */
const sansCommentairesPartout = (sql) => decouperSql(sql).filter((s) => s.type !== 'ligne' && s.type !== 'bloc').map((s) => s.type === 'dollar' ? `${s.tag}${sansCommentairesPartout(s.corps)}${s.ferme ? s.tag : ''}` : s.texte).join('')
/** Le « SQL utile » de sql-nu.mjs (noyau) : sans commentaires, sans lignes vides, sans espaces de fin de ligne. */
const noyau = (sql) => sansCommentaires(sql).split('\n').map((l) => l.replace(/\s+$/, '')).filter((l) => l.trim()).join('\n')
/**
 * Les instructions (coupées aux « ; » de code) : { segs, code (sans commentaires hors blocs), debut (position du premier
 * caractère utile), fin (position du « ; », ou -1) }.
 */
function instructions(sql) {
  const res = []
  let cur = [], fin = -1
  const clore = () => {
    const utiles = cur.filter((s) => s.type !== 'ligne' && s.type !== 'bloc')
    const code = utiles.map((s) => s.texte).join('')
    if (code.trim()) {
      const s0 = utiles.find((s) => s.texte.trim())
      res.push({ segs: cur, code: code.trim(), debut: s0.pos + (s0.texte.length - s0.texte.trimStart().length), fin })
    }
    cur = []; fin = -1
  }
  for (const s of decouperSql(sql)) {
    if (s.type !== 'code') { cur.push(s); continue }
    let t = s.texte, p = s.pos, k
    while ((k = t.indexOf(';')) >= 0) { cur.push({ type: 'code', texte: t.slice(0, k + 1), pos: p }); fin = p + k; clore(); p += k + 1; t = t.slice(k + 1) }
    if (t) cur.push({ type: 'code', texte: t, pos: p })
  }
  clore()
  return res
}
/** Défauts de syntaxe d'un fichier SQL (vide = il se parse, au sens de migrations-jumelles-e2e.mjs et un peu plus). */
function defautsDeSyntaxe(sql, { commandes = COMMANDES_SQL } = {}) {
  const d = []
  const verifier = (texte, ou) => {
    let prof = 0, negatif = false
    for (const s of decouperSql(texte)) {
      if (s.type === 'chaine' && !s.ferme) d.push(`${ou}chaîne non refermée (ligne ${ligneDe(texte, s.pos)})`)
      if (s.type === 'dollar' && !s.ferme) d.push(`${ou}bloc ${s.tag} non refermé (ligne ${ligneDe(texte, s.pos)})`)
      if (s.type === 'bloc' && !s.ferme) d.push(`${ou}commentaire /* non refermé`)
      if (s.type === 'code') for (const c of s.texte) { if (c === '(') prof++; else if (c === ')') { prof--; if (prof < 0) negatif = true } }
      if (s.type === 'dollar' && s.ferme) verifier(s.corps, `corps ${s.tag} : `)
    }
    if (prof !== 0 || negatif) d.push(`${ou}parenthèses déséquilibrées (${prof > 0 ? `${prof} non refermée(s)` : negatif ? 'une « ) » avant sa « ( »' : `${-prof} de trop`})`)
  }
  verifier(sql, '')
  const ins = instructions(sql)
  if (!ins.length) d.push('aucune instruction SQL')
  for (const x of ins) {
    const mot = (/^[A-Za-z]+/.exec(x.code) || [''])[0].toLowerCase()
    if (!commandes.has(mot)) d.push(`instruction qui commence par « ${court(x.code, 30)} » (ligne ${ligneDe(sql, x.debut)})`)
  }
  const utile = sansCommentairesPartout(sql)
  if (/\bconstant\b/i.test(utile)) d.push('mot-clé CONSTANT (refusé par l’éditeur SQL le 08/09)')
  if (/U&'/.test(utile)) d.push('littéral U&\'…\' (dépend de standard_conforming_strings)')
  return d
}
/** Première divergence de deux textes ligne à ligne, pour un message. */
function divergence(a, b) {
  const x = a.split('\n'), y = b.split('\n')
  const n = x.findIndex((l, k) => l !== y[k])
  const k = n < 0 ? x.length : n
  return `ligne ${k + 1} du SQL utile : « ${court(x[k] ?? '(fin)', 70)} » / « ${court(y[k] ?? '(fin)', 70)} »`
}

// ── La fonction lock_artisan_privileges ──────────────────────────────────────────────────────────────────────────────────
/** Une ligne de code normalisée : espaces de bord ôtés, répétés réduits, « := » espacé, étiquette $tag$ ramenée à $$. */
const normaliserLigne = (l) => l.replace(/\$(?:[A-Za-z_][A-Za-z_0-9]*)?\$/g, '$$$$').replace(/\s*:=\s*/g, ' := ').replace(/\s+/g, ' ').trim()
const lignesDeCode = (corps) => sansCommentairesPartout(corps).split('\n').map(normaliserLigne).filter(Boolean)
/**
 * Analyse une instruction « create or replace function public.lock_artisan_privileges() » : { entete (normalisé, minuscules),
 * corps (brut, entre les $tag$), apres (code après le corps), lignes (de code du corps), dollars (nombre de blocs) }.
 */
function analyserDefinition(ins) {
  const iDollar = ins.segs.findIndex((s) => s.type === 'dollar')
  const avant = ins.segs.slice(0, iDollar < 0 ? ins.segs.length : iDollar).filter((s) => s.type === 'code' || s.type === 'chaine').map((s) => s.texte).join('')
  const apres = iDollar < 0 ? '' : ins.segs.slice(iDollar + 1).filter((s) => s.type === 'code' || s.type === 'chaine' || s.type === 'dollar').map((s) => s.texte).join('')
  const d = iDollar < 0 ? null : ins.segs[iDollar]
  return {
    entete: avant.replace(/\$(?:[A-Za-z_][A-Za-z_0-9]*)?\$/g, '$$$$').replace(/\s+/g, ' ').trim().toLowerCase(),
    corps: d ? d.corps : null, ferme: !!(d && d.ferme), tag: d ? d.tag : null,
    apres: apres.replace(/\s+/g, ''),
    dollars: ins.segs.filter((s) => s.type === 'dollar').length,
    lignes: d ? lignesDeCode(d.corps) : [],
  }
}
/** Plus longue sous-suite commune : { retires (indices de a), ajoutes (indices de b) }. */
function differenceLignes(a, b) {
  const n = a.length, m = b.length
  const L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1])
  const retires = [], ajoutes = []
  let i = 0, j = 0
  while (i < n && j < m) { if (a[i] === b[j]) { i++; j++ } else if (L[i + 1][j] >= L[i][j + 1]) retires.push(i++); else ajoutes.push(j++) }
  while (i < n) retires.push(i++)
  while (j < m) ajoutes.push(j++)
  return { retires, ajoutes }
}
/** Pour chaque indice de `cibles`, la pile des « if … then » ouverts : [{ ligne, branche: 'then' | 'else' }]. */
function piles(lignes, cibles) {
  const pile = [], res = new Map()
  lignes.forEach((l, j) => {
    const b = l.toLowerCase()
    if (/^end if\s*;$/.test(b)) { pile.pop(); return }
    if (b === 'else' || /^els(?:e)?if\b.*\bthen$/.test(b)) { if (pile.length) pile[pile.length - 1].branche = 'else'; return }
    if (/^if\b.*\bthen$/.test(b)) { pile.push({ ligne: l, branche: 'then' }); return }
    if (cibles.has(j)) res.set(j, pile.map((p) => ({ ...p })))
  })
  return res
}
/** Les migrations 00NN_*.sql de la racine, triées : { nom, num, texte, code (sans commentaires, blocs compris) }. */
function lireMigrations(racine) {
  const dir = chemins(racine).dir
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).filter((f) => /^\d{4}_.*\.sql$/.test(f)).sort().map((nom) => {
    const texte = lireTexte(path.join(dir, nom)) ?? ''
    return { nom, num: Number(nom.slice(0, 4)), texte, code: sansCommentairesPartout(texte) }
  })
}
/** La définition précédente (0068:157-186) lue dans la racine → { nom, debut, fin, def, echecs[] }. */
function definitionPrecedente(migs) {
  const echecs = []
  const avant = []
  for (const m of migs) {
    if (m.num >= 93) continue
    for (const ins of instructions(m.texte)) if (DEFINIT.test(ins.code)) avant.push({ m, ins })
  }
  if (!avant.length) return { echecs: ['aucune définition de lock_artisan_privileges dans les migrations antérieures à 0093'] }
  const der = avant[avant.length - 1]
  const debut = ligneDe(der.m.texte, der.ins.debut), fin = der.ins.fin < 0 ? -1 : ligneDe(der.m.texte, der.ins.fin)
  if (der.m.nom !== PRECEDENTE.fichier || debut !== PRECEDENTE.debut || fin !== PRECEDENTE.fin) echecs.push(`la dernière définition avant 0093 est ${der.m.nom}:${debut}-${fin}, ${PRECEDENTE.fichier}:${PRECEDENTE.debut}-${PRECEDENTE.fin} attendue (prémisse de la fiche)`)
  if (!CREE_FONCTION.test(der.ins.code)) echecs.push(`${der.m.nom}:${debut} n'est pas un « create or replace function public.lock_artisan_privileges() »`)
  const def = analyserDefinition(der.ins)
  if (!def.corps || !def.lignes.length) echecs.push(`${der.m.nom}:${debut} : corps illisible`)
  return { nom: der.m.nom, debut, fin, def, echecs }
}
/** Le corps attendu : celui de 0068, avec les quatre lignes après « new.est_demo := old.est_demo; » (même retrait). */
function corpsAttendu(corps0068) {
  const l = corps0068.split('\n')
  const k = l.findIndex((x) => normaliserLigne(x.replace(/--.*$/, '')) === 'new.est_demo := old.est_demo;')
  if (k < 0) throw new Error('0068 : ligne « new.est_demo := old.est_demo; » introuvable, corps attendu impossible à construire')
  const retrait = /^\s*/.exec(l[k])[0]
  return [...l.slice(0, k + 1), ...COLONNES.map((c) => `${retrait}${LIGNE(c)}`), ...l.slice(k + 1)].join('\n')
}
/** Ce que pg_get_functiondef rend pour cette fonction : en-tête de Postgres, corps (prosrc) tel qu'il a été collé. */
const defSimulee = (corps) => `CREATE OR REPLACE FUNCTION public.lock_artisan_privileges()\n RETURNS trigger\n LANGUAGE plpgsql\n SET search_path TO 'public'\nAS $function$${corps}$function$\n`

// ── VS-1 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** → { ok, echecs, faits, resume, corpsConforme (corps brut de 0093 si ses lignes sont conformes, sinon null), precedente } */
function vs1(racine) {
  const echecs = [], faits = []
  const fin = (resume, extra = {}) => ({ ok: echecs.length === 0, echecs, faits, resume, corpsConforme: null, ...extra })
  const migs = lireMigrations(racine)
  const prec = definitionPrecedente(migs)
  for (const e of prec.echecs) echecs.push(e)
  // aucune migration entre 0068 et 0093 ne nomme la fonction ; une migration postérieure à 0093 (fiche 025-13 : 0095) ne peut
  // que la REDÉFINIR en gardant 0093 entière — jugé plus bas, une fois 0093 lue (avant le 24/09 : toute postérieure était refusée)
  const posterieures = []
  for (const m of migs) {
    if (m.nom === MIGRATION || !NOMME.test(m.code)) continue
    if (m.num > 93) posterieures.push(m)
    else if (m.num > 68) echecs.push(`${m.nom} nomme lock_artisan_privileges (la dernière définition avant 0093 doit rester 0068)`)
  }
  const texte = lireTexte(chemins(racine).M)
  if (texte === null) { echecs.push(`supabase/migrations/${MIGRATION} absent`); return fin('', { precedente: prec }) }
  if (!texte.trim()) { echecs.push(`${MIGRATION} vide`); return fin('', { precedente: prec }) }
  const ins = instructions(texte)
  if (ins.length !== 1) echecs.push(`${MIGRATION} porte ${ins.length} instruction(s) SQL, une seule attendue (le create or replace function : « Rien d'autre »)${ins.length > 1 ? ` : ${ins.map((x) => `« ${court(x.code, 40)} »`).slice(0, 4).join(', ')}` : ''}`)
  const def = ins.map((x) => ({ x, d: CREE_FONCTION.test(x.code) })).filter((y) => y.d)
  if (def.length !== 1) { echecs.push(`${MIGRATION} : ${def.length} « create or replace function public.lock_artisan_privileges() », un attendu`); if (!def.length) return fin('', { precedente: prec }) }
  const d93 = analyserDefinition(def[0].x)
  for (const e of defautsDeSyntaxe(texte)) echecs.push(`${MIGRATION} ne se parse pas : ${e}`)
  if (d93.dollars !== 1 || !d93.ferme || d93.corps === null) echecs.push(`${MIGRATION} : un corps $$ … $$ refermé attendu (${d93.dollars} bloc(s))`)
  if (d93.apres !== ';') echecs.push(`${MIGRATION} : après le corps, « ; » seul attendu, trouvé « ${court(d93.apres, 40)} »`)
  let corpsConforme = null
  if (prec.def) {
    if (d93.entete !== prec.def.entete) echecs.push(`en-tête différent de ${prec.nom} : « ${court(d93.entete, 110)} » / « ${court(prec.def.entete, 110)} »`)
    const a = prec.def.lignes, b = d93.lignes
    const { retires, ajoutes } = differenceLignes(a, b)
    if (retires.length) echecs.push(`${retires.length} ligne(s) de ${prec.nom} retirée(s) ou modifiée(s) : ${retires.slice(0, 3).map((k) => `« ${court(a[k], 60)} »`).join(', ')}`)
    const attendues = COLONNES.map((c) => LIGNE(c))
    const ajouteesMin = ajoutes.map((j) => b[j].toLowerCase())
    const manquantes = attendues.filter((l) => !ajouteesMin.includes(l))
    const doubles = attendues.filter((l) => ajouteesMin.filter((x) => x === l).length > 1)
    const autres = ajoutes.filter((j) => !attendues.includes(b[j].toLowerCase()))
    if (manquantes.length) echecs.push(`ligne(s) manquante(s) : ${manquantes.map((l) => `« ${l} »`).join(', ')}`)
    if (doubles.length) echecs.push(`ligne(s) en double : ${doubles.join(', ')}`)
    if (autres.length) echecs.push(`${autres.length} ligne(s) de code en plus des quatre : ${autres.slice(0, 3).map((j) => `« ${court(b[j], 60)} »`).join(', ')}`)
    const ouvertes = piles(b, new Set(ajoutes))
    const malPlacees = []
    for (const j of ajoutes) {
      if (!attendues.includes(b[j].toLowerCase())) continue
      const p = ouvertes.get(j) || []
      if (!(p.length === 1 && SI_EXTERIEUR.test(p[0].ligne) && p[0].branche === 'then')) malPlacees.push(`« ${b[j]} » ${p.length ? `sous ${p.map((x) => `« ${court(x.ligne, 50)} »${x.branche === 'else' ? ' (branche else)' : ''}`).join(' > ')}` : 'hors de tout bloc if'}`)
    }
    if (malPlacees.length) echecs.push(`hors de la branche then du bloc « if current_user not in ('service_role', 'postgres') » (profondeur 1) : ${malPlacees.join(' ; ')}`)
    if (!manquantes.length && !doubles.length && !malPlacees.length && d93.corps !== null) corpsConforme = d93.corps
    const com = (x) => (x.match(/^\s*--.*$/gm) || []).length
    if (d93.corps !== null && prec.def.corps !== null && com(d93.corps) !== com(prec.def.corps)) faits.push(`commentaires du corps : ${com(d93.corps)} ligne(s) (${com(prec.def.corps)} dans ${prec.nom}) — libres, non jugés`)
    faits.push(`définition précédente : ${prec.nom}:${prec.debut}-${prec.fin} (${a.length} lignes de code) ; 0093 : ${b.length} lignes de code`)
  }
  // les redéfinitions postérieures à 0093 : permises seulement si elles gardent toutes les lignes de 0093 (plus longue sous-suite
  // commune), l'en-tête, et les quatre lignes du site dans la branche then du bloc current_user (profondeur 1)
  let enVigueur = MIGRATION
  for (const m of posterieures) {
    const d = []
    if (d93.corps === null) d.push('0093 illisible : redéfinition non comparable')
    else {
      for (const x of instructions(m.texte).filter((y) => NOMME.test(sansCommentairesPartout(y.code)))) {
        if (!CREE_FONCTION.test(x.code)) { d.push(`« ${court(x.code, 50)} » (seul « create or replace function public.lock_artisan_privileges() » est permis)`); continue }
        const dx = analyserDefinition(x)
        if (dx.entete !== d93.entete) d.push('en-tête différent de 0093')
        const { retires } = differenceLignes(d93.lignes, dx.lignes)
        if (retires.length) d.push(`${retires.length} ligne(s) de 0093 retirée(s) ou modifiée(s) : ${retires.slice(0, 2).map((k) => `« ${court(d93.lignes[k], 50)} »`).join(', ')}`)
        const p = piles(dx.lignes, new Set(dx.lignes.keys()))
        for (const c of COLONNES) {
          const j = dx.lignes.findIndex((l) => l.toLowerCase() === LIGNE(c))
          const pl = j < 0 ? null : p.get(j) || []
          if (j < 0) d.push(`« ${LIGNE(c)} » absente`)
          else if (!(pl.length === 1 && SI_EXTERIEUR.test(pl[0].ligne) && pl[0].branche === 'then')) d.push(`« ${LIGNE(c)} » hors de la branche then (profondeur 1)`)
        }
      }
    }
    if (d.length) echecs.push(`${m.nom} (postérieure à 0093) touche lock_artisan_privileges sans garder 0093 entière : ${d.slice(0, 3).join(' ; ')}`)
    else { faits.push(`${m.nom} redéfinit lock_artisan_privileges en gardant 0093 entière (ses lignes, les quatre colonnes du site dans la branche then) : c'est elle qui est en vigueur`); enVigueur = m.nom }
  }
  // les quatre colonnes existent (ajoutées à public.artisans avant 0093, jamais retirées)
  const origines = []
  for (const c of COLONNES) {
    const ajout = new RegExp(`\\balter\\s+table\\s+(?:if\\s+exists\\s+)?(?:only\\s+)?(?:public\\s*\\.\\s*)?artisans\\b[^;]*?\\badd\\s+(?:column\\s+)?(?:if\\s+not\\s+exists\\s+)?"?${c}"?\\s`, 'i')
    const retrait = new RegExp(`\\balter\\s+table\\s+(?:if\\s+exists\\s+)?(?:only\\s+)?(?:public\\s*\\.\\s*)?artisans\\b[^;]*?\\bdrop\\s+(?:column\\s+)?(?:if\\s+exists\\s+)?"?${c}"?\\b`, 'i')
    const ajoutees = migs.filter((m) => m.num < 93 && ajout.test(m.code)).map((m) => m.nom)
    const retirees = migs.filter((m) => m.num <= 93 && retrait.test(m.code)).map((m) => m.nom)
    if (!ajoutees.length) echecs.push(`colonne artisans.${c} ajoutée par aucune migration antérieure à 0093 : new.${c} ferait échouer chaque mise à jour`)
    else if (retirees.length) echecs.push(`colonne artisans.${c} retirée par ${retirees.join(', ')}`)
    else origines.push(`${c} (${ajoutees[0].slice(0, 4)})`)
  }
  return fin(`${MIGRATION} = ${prec.nom}:${prec.debut}-${prec.fin} à l'identique + les 4 lignes dans la branche then du bloc current_user, une seule instruction, en-tête identique ; ${enVigueur === MIGRATION ? 'dernière définition' : `redéfinie ensuite par ${enVigueur}, qui la garde entière`} ; colonnes ${origines.join(', ')}`, { corpsConforme, precedente: prec })
}

// ── VS-2 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function vs2(racine) {
  const echecs = [], faits = []
  const fin = (resume) => ({ ok: echecs.length === 0, echecs, faits, resume })
  const ch = chemins(racine)
  const m = lireTexte(ch.M), a = lireTexte(ch.A), n = lireTexte(ch.N), c = lireTexte(ch.C)
  for (const [nom, t] of [[JUMEAU, a], [JUMEAU_NU, n]]) {
    if (t === null) echecs.push(`supabase/migrations/${nom} absent`)
    else if (!t.trim()) echecs.push(`${nom} vide`)
  }
  if (echecs.length) return fin('')
  for (const [nom, t] of [[JUMEAU, a], [JUMEAU_NU, n]]) for (const d of defautsDeSyntaxe(t)) echecs.push(`${nom} ne se parse pas : ${d}`)
  // le jumeau nu sort de sql-nu.mjs : bande de tirets, puis le SQL, puis la marque et le contrôle de 0093
  if (!TETE_NU.test(n.split('\n')[0])) echecs.push(`${JUMEAU_NU} : première ligne « ${court(n.split('\n')[0], 60)} », la bande de 28 tirets de sql-nu.mjs attendue (fabriquer par node scripts/sql-nu.mjs <source> <destination> --controle supabase/controles/${CONTROLE})`)
  const morceaux = n.split(MARQUE_CONTROLE)
  if (morceaux.length !== 2) echecs.push(`${JUMEAU_NU} : ${morceaux.length - 1} marque(s) « ${MARQUE_CONTROLE.slice(3, 28)}… », une attendue`)
  const corpsNu = morceaux[0], pied = morceaux.length === 2 ? morceaux[1] : ''
  if (morceaux.length === 2) {
    if (c === null) echecs.push(`pied de ${JUMEAU_NU} invérifiable : supabase/controles/${CONTROLE} absent`)
    else if (pied.trim() !== c.trim()) echecs.push(`le contrôle en pied de ${JUMEAU_NU} n'est pas supabase/controles/${CONTROLE} (${divergence(c.trim(), pied.trim())}) : régénérer avec --controle supabase/controles/${CONTROLE}`)
  }
  // équivalences, par le découpage du juge
  const na = noyau(a), nn = noyau(corpsNu)
  if (!na.trim()) echecs.push(`${JUMEAU} : aucun SQL utile`)
  if (m === null) echecs.push(`${MIGRATION} absent : le jumeau ne peut pas être comparé à sa migration`)
  else if (noyau(m) !== na) echecs.push(`${JUMEAU} ne porte pas le SQL de ${MIGRATION} (juge : ${divergence(noyau(m), na)})`)
  if (na !== nn) echecs.push(`${JUMEAU_NU} (avant la marque) ne porte pas le SQL de ${JUMEAU} (juge : ${divergence(na, nn)})`)
  // équivalences, par node <racine>/scripts/sql-nu.mjs --verifier (l'outil de la fiche)
  const src = lireTexte(ch.sqlNu)
  if (src === null || !src.trim()) echecs.push('scripts/sql-nu.mjs absent de la racine : --verifier impossible')
  else {
    if (!src.includes(MARQUE_CONTROLE)) echecs.push('scripts/sql-nu.mjs de la racine ne pose plus la marque de contrôle attendue par le juge')
    const w = dossierTravail(JUGE, 'nu')
    const fNu = path.join(w, JUMEAU_NU)
    fs.writeFileSync(fNu, corpsNu, 'utf8')
    const paires = [...(m === null ? [] : [[ch.M, ch.A, `${MIGRATION} → ${JUMEAU}`]]), [ch.A, fNu, `${JUMEAU} → ${JUMEAU_NU} coupé à la marque`]]
    const vus = []
    for (const [x, y, nom] of paires) {
      const r = lancer(process.execPath, [ch.sqlNu, '--verifier', x, y], { cwd: racine, timeout: 60_000 })
      if (r.code !== 0 || !r.stdout.includes('✅')) echecs.push(`sql-nu.mjs --verifier ${nom} : code ${r.code}${r.erreur ? ` (${r.erreur})` : ''} — ${court(r.sortie, 160)}`)
      else vus.push(nom)
    }
    faits.push(`sql-nu.mjs --verifier vert : ${vus.join(' ; ') || 'aucun'}`)
  }
  return fin(`${JUMEAU} et ${JUMEAU_NU} présents, se parsent ; même SQL utile que ${MIGRATION} (${na.split('\n').length} lignes, sql-nu.mjs --verifier et le juge) ; nu sorti de sql-nu.mjs avec le contrôle de 0093 en pied`)
}

// ── VS-3 : lecture et simulation du contrôle ─────────────────────────────────────────────────────────────────────────────
/** Jetons d'un SQL sans commentaires : { t: 'lit' | 'mot' | 'nb' | 'op' | '(' | ')' | ',' | ';', v }. */
function jetons(s) {
  const out = []
  let i = 0
  while (i < s.length) {
    const c = s[i]
    if (/\s/.test(c)) { i++; continue }
    if ((c === 'e' || c === 'E') && s[i + 1] === "'") { // chaîne E'…' : échappements par barre oblique
      let j = i + 2, v = ''
      for (;;) {
        if (j >= s.length) throw new Error('chaîne E\'…\' non refermée')
        if (s[j] === '\\') { v += s[j + 1] ?? ''; j += 2; continue }
        if (s[j] === "'") { if (s[j + 1] === "'") { v += "'"; j += 2; continue } j++; break }
        v += s[j++]
      }
      out.push({ t: 'lit', v }); i = j; continue
    }
    if (c === "'") {
      let j = i + 1, v = ''
      for (;;) {
        if (j >= s.length) throw new Error('chaîne non refermée')
        if (s[j] === "'") { if (s[j + 1] === "'") { v += "'"; j += 2; continue } j++; break }
        v += s[j++]
      }
      out.push({ t: 'lit', v }); i = j; continue
    }
    if (c === '"') { const f = s.indexOf('"', i + 1); if (f < 0) throw new Error('identifiant "…" non refermé'); out.push({ t: 'mot', v: s.slice(i + 1, f).toLowerCase() }); i = f + 1; continue }
    if ('(),;[]'.includes(c)) { out.push({ t: c }); i++; continue }
    // 025-13 : « & » (tgtype & 3), « @> », « <@ » — la ligne du déclencheur sensible à BEFORE … FOR EACH ROW se lit, puis est notée
    // non simulée (exists sur pg_trigger : verrou-maj-qa VM-3 la simule)
    const op = /^(?:!~\*|!~|~\*|~|<>|!=|>=|<=|::|@>|<@|\|\||[=<>+\-*/%.&|])/.exec(s.slice(i))
    if (op) { out.push({ t: 'op', v: op[0] }); i += op[0].length; continue }
    const w = /^[A-Za-z_][\w$]*(?:\.[A-Za-z_][\w$]*)*/.exec(s.slice(i))
    if (w) { out.push({ t: 'mot', v: w[0].toLowerCase() }); i += w[0].length; continue }
    const nb = /^\d+(?:\.\d+)?/.exec(s.slice(i))
    if (nb) { out.push({ t: 'nb', v: Number(nb[0]) }); i += nb[0].length; continue }
    throw new Error(`caractère inattendu « ${c} »`)
  }
  return out
}
const texteJetons = (ts) => ts.map((x) => x.t === 'lit' ? `'${x.v}'` : x.t === 'mot' || x.t === 'op' || x.t === 'nb' ? String(x.v) : x.t).join(' ')
const echapperRe = (x) => x.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
/** Motif LIKE → RegExp ancrée (% = n'importe quoi, _ = un signe, échappement par défaut « \ »). */
function likeVersRegex(p, insensible, echap = '\\') {
  let r = ''
  for (let i = 0; i < p.length; i++) {
    const c = p[i]
    if (echap && c === echap) { i++; if (i < p.length) r += echapperRe(p[i]); continue }
    r += c === '%' ? '[\\s\\S]*' : c === '_' ? '[\\s\\S]' : echapperRe(c)
  }
  return new RegExp(`^${r}$`, insensible ? 'i' : '')
}
/** Expression régulière de Postgres (ARE, cas simples) → RegExp : classes POSIX, \m \M \y, « . » qui prend les fins de ligne. */
function areVersRegex(p, insensible) {
  let s = p.startsWith('***:') ? p.slice(4) : p
  s = s.replace(/\[\[:(space|alpha|digit|alnum|upper|lower):\]\]/g, (_, k) => ({ space: '\\s', alpha: '[A-Za-z]', digit: '\\d', alnum: '[A-Za-z0-9]', upper: '[A-Z]', lower: '[a-z]' })[k])
  s = s.replace(/\[:(space|alpha|digit|alnum|upper|lower):\]/g, (_, k) => ({ space: '\\s', alpha: 'A-Za-z', digit: '0-9', alnum: 'A-Za-z0-9', upper: 'A-Z', lower: 'a-z' })[k])
  s = s.replace(/(^|[^\\])\\[mMy]/g, '$1\\b')
  return new RegExp(s, `s${insensible ? 'i' : ''}`)
}
const ARGUMENT_VALIDE = /^(?:public\.)?lock_artisan_privileges(?:\(\))?$/i
/** L'opérande est-elle la définition de la fonction ? pg_get_functiondef('public.lock_artisan_privileges()'::regprocedure), un alias. */
function operandeValide(ops, alias) {
  let x = ops.slice()
  for (;;) {
    const n = x.length
    if (n >= 2 && x[n - 2].t === 'op' && x[n - 2].v === '::' && x[n - 1].t === 'mot') { x = x.slice(0, -2); continue }
    if (n >= 2 && x[0].t === '(' && x[n - 1].t === ')') {
      let p = 0, enveloppe = true
      for (let k = 0; k < n; k++) { if (x[k].t === '(') p++; else if (x[k].t === ')') p--; if (p === 0 && k < n - 1) { enveloppe = false; break } }
      if (enveloppe) { x = x.slice(1, -1); if (x[0]?.t === 'mot' && x[0].v === 'select') x = x.slice(1); continue }
    }
    break
  }
  if (x.length === 1 && x[0].t === 'mot' && alias.has(x[0].v)) return true
  return x.length === 6 && x[0].t === 'mot' && /^(?:pg_catalog\.)?pg_get_functiondef$/.test(x[0].v) && x[1].t === '(' && x[2].t === 'lit' && ARGUMENT_VALIDE.test(x[2].v)
    && x[3].t === 'op' && x[3].v === '::' && x[4].t === 'mot' && ['regprocedure', 'regproc'].includes(x[4].v) && x[5].t === ')'
}
/** Compile une condition de « case when » en fonction (texte de pg_get_functiondef) → booléen ; lève si non simulable. */
function compilerCondition(ts, alias) {
  let i = 0
  const t = (k = 0) => ts[i + k]
  const mot = (x, v) => !!x && x.t === 'mot' && (v === undefined || x.v === v)
  const comparateur = (k = 0) => {
    const x = t(k)
    if (!x) return 0
    if (mot(x, 'like') || mot(x, 'ilike')) return 1
    if (mot(x, 'not') && (mot(t(k + 1), 'like') || mot(t(k + 1), 'ilike'))) return 2
    if (x.t === 'op' && ['~', '~*', '!~', '!~*'].includes(x.v)) return 1
    if (mot(x, 'similar')) return -1
    return 0
  }
  const operande = (arret) => {
    const debut = i
    let p = 0
    while (i < ts.length) {
      const x = t()
      if (p === 0) {
        if (arret ? x.t === arret : comparateur() !== 0) break
        if (x.t === ')' || mot(x, 'and') || mot(x, 'or')) break
      }
      if (x.t === '(') p++; else if (x.t === ')') p--
      i++
    }
    const ops = ts.slice(debut, i)
    if (!ops.length || !operandeValide(ops, alias)) throw new Error(`opérande non simulée « ${court(texteJetons(ops), 70)} » (pg_get_functiondef('public.lock_artisan_privileges()'::regprocedure) attendu)`)
    return ops
  }
  const numerique = (f) => {
    const c = t(), n = t(1)
    if (c?.t !== 'op' || !['>', '>=', '=', '<>', '!=', '<', '<='].includes(c.v) || n?.t !== 'nb') throw new Error('comparaison à un nombre attendue après position/strpos')
    i += 2
    const v = n.v
    const cmp = { '>': (a) => a > v, '>=': (a) => a >= v, '=': (a) => a === v, '<>': (a) => a !== v, '!=': (a) => a !== v, '<': (a) => a < v, '<=': (a) => a <= v }[c.v]
    return (s) => cmp(f(s))
  }
  const atome = () => {
    if (mot(t(), 'position') && t(1)?.t === '(') {
      i += 2
      const l = t(); if (l?.t !== 'lit') throw new Error('position : chaîne attendue'); i++
      if (!mot(t(), 'in')) throw new Error('position : « in » attendu'); i++
      operande(')'); if (t()?.t !== ')') throw new Error('position : « ) » attendue'); i++
      return numerique((s) => s.indexOf(l.v) + 1)
    }
    if (mot(t(), 'strpos') && t(1)?.t === '(') {
      i += 2
      operande(','); if (t()?.t !== ',') throw new Error('strpos : « , » attendue'); i++
      const l = t(); if (l?.t !== 'lit') throw new Error('strpos : chaîne attendue'); i++
      if (t()?.t !== ')') throw new Error('strpos : « ) » attendue'); i++
      return numerique((s) => s.indexOf(l.v) + 1)
    }
    operande(null)
    const k = comparateur()
    if (k <= 0) throw new Error(k < 0 ? 'similar to non pris en charge' : `comparaison attendue (like, ilike, ~, ~*, !~, !~*, position, strpos) près de « ${court(texteJetons(ts.slice(i, i + 4)), 40)} »`)
    let neg = false
    if (k === 2) { neg = true; i++ }
    const x = t(); i++
    let sorte = x.v
    if (x.t === 'op') { if (sorte.startsWith('!')) { neg = !neg; sorte = sorte.slice(1) } }
    const l = t(); if (l?.t !== 'lit') throw new Error('motif littéral attendu après la comparaison'); i++
    let echap = '\\'
    if (mot(t(), 'escape')) { i++; const e = t(); if (e?.t !== 'lit') throw new Error('escape : chaîne attendue'); echap = e.v; i++ }
    const re = sorte === 'like' || sorte === 'ilike' ? likeVersRegex(l.v, sorte === 'ilike', echap) : areVersRegex(l.v, sorte === '~*')
    return (s) => re.test(s) !== neg
  }
  const non = () => {
    if (mot(t(), 'not') && comparateur() !== 2) { i++; const f = non(); return (s) => !f(s) }
    if (t()?.t === '(') {
      const sauve = i
      try { i++; const g = ou(); if (t()?.t !== ')') throw new Error('« ) » attendue'); i++; if (!comparateur()) return g } catch { /* une opérande entre parenthèses */ }
      i = sauve
    }
    return atome()
  }
  const et = () => { let g = non(); while (mot(t(), 'and')) { i++; const d = non(), a = g; g = (s) => a(s) && d(s) } return g }
  const ou = () => { let g = et(); while (mot(t(), 'or')) { i++; const d = et(), a = g; g = (s) => a(s) || d(s) } return g }
  const f = ou()
  if (i !== ts.length) throw new Error(`jeton inattendu « ${court(texteJetons(ts.slice(i, i + 4)), 40)} »`)
  return f
}
/** Les « case when … then '…' [when …] [else '…'] end » du contrôle : [{ n, branches: [{ cond, val, erreur }], sinon, litteraux }]. */
function lignesDuControle(ts, alias) {
  const lignes = []
  const mot = (x, v) => !!x && x.t === 'mot' && x.v === v
  for (let i = 0; i < ts.length; i++) {
    if (!mot(ts[i], 'case')) continue
    const ligne = { n: lignes.length + 1, branches: [], sinon: null, erreur: null, litteraux: [] }
    lignes.push(ligne)
    let j = i + 1
    if (!mot(ts[j], 'when')) { ligne.erreur = 'case <expression> when … (forme simple) non pris en charge'; continue }
    while (mot(ts[j], 'when')) {
      let k = j + 1, p = 0
      while (k < ts.length && !(p === 0 && mot(ts[k], 'then'))) { if (ts[k].t === '(') p++; else if (ts[k].t === ')') p--; if (mot(ts[k], 'case')) ligne.erreur = 'case imbriqué non pris en charge'; k++ }
      const cond = ts.slice(j + 1, k)
      const val = ts[k + 1]
      for (const x of cond) if (x.t === 'lit') ligne.litteraux.push(x.v)
      const b = { cond: null, val: val?.t === 'lit' ? val.v : null, erreur: null }
      if (val?.t !== 'lit') b.erreur = 'valeur de then non littérale'
      else { try { b.cond = compilerCondition(cond, alias) } catch (e) { b.erreur = premiere(e) } }
      ligne.branches.push(b)
      j = k + 2
    }
    if (mot(ts[j], 'else')) { if (ts[j + 1]?.t === 'lit') ligne.sinon = ts[j + 1].v; else ligne.erreur = ligne.erreur || 'valeur de else non littérale'; j += 2 }
    if (!mot(ts[j], 'end')) ligne.erreur = ligne.erreur || '« end » attendu'
    i = j
  }
  return lignes
}
/** La réponse d'une ligne sur un texte de pg_get_functiondef ; lève si non simulable. */
function repondre(ligne, def) {
  if (ligne.erreur) throw new Error(ligne.erreur)
  for (const b of ligne.branches) { if (b.erreur) throw new Error(b.erreur); if (b.cond(def)) return b.val }
  return ligne.sinon
}
/** Le corps sans la ligne d'affectation de `col` ; avec `commentaire`, remplacée par « -- col ». */
function sansLigne(corps, col, commentaire) {
  const cible = LIGNE(col)
  return corps.split('\n').flatMap((l) => {
    if (normaliserLigne(sansCommentairesPartout(l)).toLowerCase() !== cible) return [l]
    return commentaire ? [`${/^\s*/.exec(l)[0]}-- ${col}`] : []
  }).join('\n')
}
function vs3(racine, analyse1) {
  const echecs = [], faits = []
  const fin = (resume) => ({ ok: echecs.length === 0, echecs, faits, resume })
  const c = lireTexte(chemins(racine).C)
  if (c === null) { echecs.push(`${CONTROLE_REL} absent`); return fin('') }
  if (!c.trim()) { echecs.push(`${CONTROLE_REL} vide`); return fin('') }
  for (const d of defautsDeSyntaxe(c, { commandes: new Set(['select', 'with']) })) echecs.push(`${CONTROLE_REL} : ${d}`)
  let ts
  try { ts = jetons(sansCommentaires(c)) } catch (e) { echecs.push(`${CONTROLE_REL} illisible par le juge : ${premiere(e)}`); return fin('') }
  const ecritures = [...new Set(ts.filter((x) => x.t === 'mot' && MOTS_ECRITURE.has(x.v)).map((x) => x.v))]
  if (ecritures.length) echecs.push(`${CONTROLE_REL} n'est pas en lecture seule : ${ecritures.join(', ')}`)
  const alias = new Set()
  let lectures = 0
  for (let k = 0; k < ts.length; k++) {
    if (ts[k].t === 'mot' && /^(?:pg_catalog\.)?pg_get_functiondef$/.test(ts[k].v)) {
      if (!operandeValide(ts.slice(k, k + 6), alias)) { echecs.push(`${CONTROLE_REL} : pg_get_functiondef(${court(texteJetons(ts.slice(k + 2, k + 5)), 50)}) ne lit pas public.lock_artisan_privileges()`); continue }
      lectures++
      let q = k + 6
      while (ts[q]?.t === 'op' && ts[q].v === '::' && ts[q + 1]?.t === 'mot') q += 2
      if (ts[q]?.t === 'mot' && ts[q].v === 'as' && ts[q + 1]?.t === 'mot') alias.add(ts[q + 1].v)
    }
  }
  if (!lectures) { echecs.push(`${CONTROLE_REL} ne lit pas pg_get_functiondef('public.lock_artisan_privileges()'::regprocedure)`); return fin('') }
  // les textes simulés
  const prec = analyse1.precedente
  if (!prec || !prec.def || prec.def.corps === null) { echecs.push('fonction de 0068 illisible : simulation impossible (voir VS-1)'); return fin('') }
  let corps = analyse1.corpsConforme
  if (corps == null) { corps = corpsAttendu(prec.def.corps); faits.push(`${MIGRATION} absente ou non conforme : contrôle jugé contre la fonction attendue (0068 + les quatre lignes après new.est_demo)`) }
  const NEUF = defSimulee(corps), ANCIEN = defSimulee(prec.def.corps)
  const mutants = Object.fromEntries(COLONNES.map((col) => [col, { retire: defSimulee(sansLigne(corps, col, false)), commente: defSimulee(sansLigne(corps, col, true)) }]))
  for (const col of COLONNES) if (mutants[col].retire === NEUF) { echecs.push(`simulation : la ligne de ${col} est introuvable dans le corps jugé`); return fin('') }
  const lignes = lignesDuControle(ts, alias)
  if (!lignes.length) { echecs.push(`${CONTROLE_REL} : aucun « case when … then 'oui' … end » (forme de supabase/controles/0092_audience_flux_nu.sql)`); return fin('') }
  const parle = (l) => l.litteraux.some((x) => /site_/i.test(x.replace(/\\/g, '')))
  const specifiques = new Map(COLONNES.map((col) => [col, []]))
  const nonSimulees = []
  for (const l of lignes) {
    const peutOui = l.branches.some((b) => b.val === 'oui') || l.sinon === 'oui'
    let rep
    try {
      rep = { neuf: repondre(l, NEUF), ancien: repondre(l, ANCIEN) }
      for (const col of COLONNES) { rep[`${col}-`] = repondre(l, mutants[col].retire); rep[`${col}#`] = repondre(l, mutants[col].commente) }
    } catch (e) {
      if (parle(l) && peutOui) echecs.push(`ligne ${l.n} du contrôle non simulable : ${premiere(e)}`)
      else nonSimulees.push(`ligne ${l.n} (${premiere(e).slice(0, 60)})`)
      continue
    }
    if (peutOui && rep.neuf !== 'oui') echecs.push(`ligne ${l.n} du contrôle répond « ${rep.neuf ?? 'NULL'} » sur la fonction de 0093, « oui » attendu`)
    for (const col of COLONNES) {
      const autres = COLONNES.filter((x) => x !== col)
      if (rep.neuf === 'oui' && rep[`${col}-`] !== 'oui' && rep[`${col}#`] !== 'oui' && autres.every((x) => rep[`${x}-`] === 'oui' && rep[`${x}#`] === 'oui')) specifiques.get(col).push({ l, rep })
    }
  }
  const couvertes = []
  for (const col of COLONNES) {
    const s = specifiques.get(col)
    if (!s.length) {
      // pourquoi : une ligne qui parle de la colonne mais ne tient pas un des cas
      const proche = lignes.find((l) => l.litteraux.some((x) => x.replace(/\\/g, '').toLowerCase().includes(col)))
      echecs.push(`aucune ligne du contrôle ne vérifie « ${LIGNE(col)} » seule (« oui » sur 0093, pas « oui » sans elle ni quand elle est remplacée par « -- ${col} », « oui » sans une autre)${proche ? ` ; la ligne ${proche.n} en parle sans tenir ces cas` : ''}`)
      continue
    }
    const surAncien = s.filter(({ rep }) => rep.ancien === 'oui')
    if (surAncien.length === s.length) echecs.push(`la ligne ${s[0].l.n} (${col}) répond « oui » sur la fonction de 0068, qui ne fige pas ${col}`)
    else couvertes.push(`${col} (ligne ${s.find(({ rep }) => rep.ancien !== 'oui').l.n})`)
  }
  if (nonSimulees.length) faits.push(`ligne(s) non simulée(s), sans colonne site_* : ${nonSimulees.join(', ')}`)
  faits.push(`${lignes.length} ligne(s) case évaluée(s) contre pg_get_functiondef simulé ; ${lectures} lecture(s) de pg_get_functiondef`)
  return fin(`lecture seule ; une ligne « oui » par colonne, qui tombe sans sa ligne ou avec « -- colonne » à sa place et ne répond pas « oui » sur 0068 : ${couvertes.join(', ')}`)
}

// ── VS-4 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function vs4(racine) {
  const echecs = [], faits = []
  const fin = (resume) => ({ ok: echecs.length === 0, echecs, faits, resume })
  const prefixe = 'supabase/migrations/'
  const depot = estRacineGit(racine)
  const base = depot ? REFERENCE_COMMIT : (commitDeReference(racine) || REFERENCE_COMMIT)
  const arbre = lsTree(R, base, prefixe)
  if (arbre.size < 10) { echecs.push(`${arbre.size} migration(s) suivie(s) à ${base.slice(0, 7)} : la comparaison ne prouverait rien`); return fin('') }
  const ajoutes = [], changes = []
  if (depot) {
    const d = git(['diff', '--no-renames', '--name-status', '-z', base, '--', prefixe], { cwd: racine })
    if (d.code !== 0) { echecs.push(`git diff ${base.slice(0, 7)} en erreur : ${court(d.stderr || d.erreur)}`); return fin('') }
    const champs = d.stdout.split('\0').filter(Boolean)
    for (let k = 0; k + 1 < champs.length; k += 2) {
      const [statut, f] = [champs[k], champs[k + 1]]
      if (statut === 'A') ajoutes.push(f.slice(prefixe.length)); else changes.push(`${f.slice(prefixe.length)} (${statut === 'D' ? 'supprimé' : statut === 'M' ? 'modifié' : statut})`)
    }
    const o = git(['ls-files', '--others', '--exclude-standard', '-z', '--', prefixe], { cwd: racine })
    for (const f of o.stdout.split('\0').filter(Boolean)) ajoutes.push(f.slice(prefixe.length))
  } else {
    const dir = path.join(racine, prefixe)
    const disque = fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }) : []
    const noms = new Set()
    for (const e of disque) { if (e.isDirectory()) { changes.push(`${e.name}/ (dossier en trop)`); continue } noms.add(e.name) }
    for (const [f, v] of arbre) {
      const nom = f.slice(prefixe.length)
      if (!noms.has(nom)) { changes.push(`${nom} (absent)`); continue }
      const b = fs.readFileSync(path.join(dir, nom))
      if (shaBlob(b) !== v.sha && shaBlob(Buffer.from(b.toString('latin1').replace(/\r\n/g, '\n'), 'latin1')) !== v.sha) changes.push(`${nom} (modifié)`)
    }
    for (const nom of noms) if (!arbre.has(prefixe + nom)) ajoutes.push(nom)
  }
  // Tolérés (025-13, 24/09) : les fichiers d'un numéro SUPÉRIEUR à 0093 — migration 00NN_*.sql ou jumeau _A_COLLER_sql_editor_00NN[_NU].sql,
  // numéro lu dans le nom sur disque — ajoutés par des fiches postérieures (0094 de 025-12, 0095 de 025-13…) : ils ne sont pas
  // de 025-04 et leurs juges les jugent (verrou-insertion-qa, verrou-maj-qa ; VS-1 rougit si l'un d'eux redéfinit
  // lock_artisan_privileges sans garder 0093). Toujours refusés : toute modification d'une migration de 1620723, et tout ajout
  // d'un numéro inférieur ou égal à 0093 hors des trois de 0093 (0093_autre.sql, 0092b…, un jumeau d'une ancienne migration).
  const numero = (f) => { const m = /^(\d{4})_[^/]*\.sql$/.exec(f) || /^_A_COLLER_sql_editor_(\d{4})(?:_NU)?\.sql$/.exec(f); return m ? Number(m[1]) : null }
  const posterieurs = ajoutes.filter((f) => !AJOUTS_PERMIS.includes(f) && numero(f) !== null && numero(f) > 93)
  const intrus = ajoutes.filter((f) => !AJOUTS_PERMIS.includes(f) && !posterieurs.includes(f))
  if (changes.length) echecs.push(`${changes.length} migration(s) de ${base.slice(0, 7)} changée(s) : ${changes.slice(0, 4).join(', ')}${changes.length > 4 ? '…' : ''}`)
  if (intrus.length) echecs.push(`${intrus.length} fichier(s) ajouté(s) hors des trois de 0093 (et sans numéro supérieur à 0093) : ${intrus.slice(0, 4).join(', ')}`)
  const ceux = ajoutes.filter((f) => AJOUTS_PERMIS.includes(f))
  faits.push(`comparé à ${base.slice(0, 7)} ${depot ? 'par git diff (arbre de travail)' : 'blob par blob'} ; ajoutés : ${ceux.length ? ceux.join(', ') : 'aucun'}${posterieurs.length ? ` ; tolérés, numéro > 0093 (fiches postérieures) : ${posterieurs.join(', ')}` : ''}`)
  return fin(`${arbre.size} migrations de ${base.slice(0, 7)} présentes et identiques${ceux.length ? ` ; ${ceux.length} ajout(s) de 0093` : ''}, aucun autre ajout de 025-04${posterieurs.length ? ` (${posterieurs.length} fichier(s) de fiches postérieures, numéro > 0093, tolérés)` : ''}`)
}

// ── --reel ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Charge .env.local dans process.env (sans rien afficher). → vrai si le fichier existe. */
function chargerEnvLocal() {
  const b = lireOuNull(path.join(R, '.env.local'))
  if (!b) return false
  for (const l of b.toString('utf8').split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(l)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
  return true
}
const pareilJson = (a, b) => { const tri = (x) => x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, tri(x[k])])) : Array.isArray(x) ? x.map(tri) : x; return JSON.stringify(tri(a)) === JSON.stringify(tri(b)) }
async function essaiReel(s) {
  if (!chargerEnvLocal()) { s.echoue('VS-REEL', '.env.local absent : rien lancé'); s.passe('VS-MENAGE', 'aucun compte créé'); return }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anon || !service) { s.echoue('VS-REEL', 'URL, clé anon ou clé service absente de .env.local : rien lancé'); s.passe('VS-MENAGE', 'aucun compte créé'); return }
  const { createClient } = await import('@supabase/supabase-js')
  const opts = { auth: { persistSession: false, autoRefreshToken: false } }
  const admin = createClient(url, service, opts)
  const session = createClient(url, anon, opts)
  const marque = `${Date.now()}-${crypto.randomBytes(3).toString('hex')}`
  const email = `verrou-site-${marque}@presti-test.invalid`
  const motDePasse = crypto.randomBytes(24).toString('base64url')
  const INITIAL = { site_active: false, site_tier: 1, site_contenu: { verrou: 'initial' }, site_origine: 'abonnement' }
  const TENTE = { site_active: true, site_tier: 3, site_contenu: { verrou: 'force' }, site_origine: 'commande' }
  const COLS = 'site_active, site_tier, site_contenu, site_origine, bio'
  let uid = null
  try {
    const { data: u, error: eU } = await admin.auth.admin.createUser({ email, password: motDePasse, email_confirm: true })
    if (eU || !u?.user?.id) throw new Error(`création du compte d'essai : ${eU?.message || 'sans identifiant'}`)
    uid = u.user.id
    const { error: eA } = await admin.from('artisans').upsert({ id: uid, email, nom: 'Verrou site (essai)', metier: 'Menuisier', slug: `verrou-site-${marque}`, plan: 'essentiel', leads_pause: true, bio: 'avant', ...INITIAL })
    if (eA) throw new Error(`ligne artisans d'essai : ${eA.message}`)
    const { error: eS } = await session.auth.signInWithPassword({ email, password: motDePasse })
    if (eS) throw new Error(`connexion du compte d'essai : ${eS.message}`)
    const bio = `verrou-site-qa ${marque}`
    const { data: ecrit, error: eW } = await session.from('artisans').update({ ...TENTE, bio }).eq('id', uid).select(COLS)
    const d = []
    if (eW) d.push(`la mise à jour par la session de l'artisan est refusée (${eW.message}) : attendu, une mise à jour acceptée dont les quatre colonnes sont remises en place`)
    else if (!Array.isArray(ecrit) || ecrit.length !== 1) d.push(`la mise à jour par la session touche ${Array.isArray(ecrit) ? ecrit.length : '?'} ligne(s), une attendue (RLS ?)`)
    const { data: parSession } = await session.from('artisans').select(COLS).eq('id', uid).single()
    const { data: parAdmin } = await admin.from('artisans').select(COLS).eq('id', uid).single()
    for (const [qui, r] of [['session', parSession], ['administration', parAdmin]]) {
      if (!r) { d.push(`relecture par ${qui} impossible`); continue }
      if (r.bio !== bio) d.push(`relue par ${qui}, la bio n'a pas changé : la mise à jour n'est pas passée, le verrou n'est pas prouvé`)
      for (const col of COLONNES) if (!pareilJson(r[col], INITIAL[col])) d.push(`relue par ${qui}, ${col} = ${JSON.stringify(r[col])} (${JSON.stringify(INITIAL[col])} attendu) : le navigateur a écrit ${col}`)
    }
    // les écritures légitimes (serveur, service_role) passent toujours
    const { error: eO } = await admin.from('artisans').update({ site_active: true }).eq('id', uid)
    const { data: apresServeur } = await admin.from('artisans').select('site_active').eq('id', uid).single()
    if (eO || apresServeur?.site_active !== true) d.push(`le serveur (service_role) n'ouvre plus le site : ${eO?.message || `site_active = ${apresServeur?.site_active}`}`)
    s.verdict('VS-REEL', !d.length, `compte d'essai : sa session écrit les quatre colonnes et une bio ; bio changée, site_active, site_tier, site_contenu et site_origine relus inchangés (session et administration) ; le serveur ouvre toujours le site`, d.join(' ; '))
  } catch (e) {
    s.echoue('VS-REEL', `interrompu : ${premiere(e)}`)
  } finally {
    await session.auth.signOut().catch(() => {})
    if (!uid) s.passe('VS-MENAGE', 'aucun compte créé')
    else {
      const d = []
      const { error: eP } = await admin.rpc('purger_compte_test', { p_id: uid })
      if (eP) {
        d.push(`purger_compte_test : ${eP.message} (repli : delete + deleteUser)`)
        await admin.from('artisans').delete().eq('id', uid)
        await admin.auth.admin.deleteUser(uid).catch(() => {})
      }
      const { data: reste, error: eR } = await admin.from('artisans').select('id').eq('id', uid)
      const { data: auth } = await admin.auth.admin.getUserById(uid).catch(() => ({ data: null }))
      const restes = []
      if (eR) restes.push(`relecture impossible (${eR.message})`)
      if (Array.isArray(reste) && reste.length) restes.push('ligne artisans')
      if (auth?.user) restes.push('utilisateur auth')
      if (restes.length) s.echoue('VS-MENAGE', `compte d'essai ${uid} NON purgé : ${restes.join(', ')} restent${d.length ? ` ; ${d.join(' ; ')}` : ''}`)
      else s.passe('VS-MENAGE', `compte d'essai purgé et relu absent (artisans, auth)${d.length ? ` après repli : ${d.join(' ; ')}` : ''}`)
    }
  }
}

// ── Le juge ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** L'arbre témoin : copies de la racine (fichiers suivis à 1620723 sous supabase/migrations et supabase/controles, sql-nu.mjs), puis
 *  scripts/fixtures/025/temoins/verrou-site-qa/ par-dessus. → { dest, absents[] } */
function preparerTemoinVerrou(base) {
  const suivis = [...lsTree(R, REFERENCE_COMMIT, 'supabase/migrations/').keys(), ...lsTree(R, REFERENCE_COMMIT, 'supabase/controles/').keys(), 'scripts/sql-nu.mjs']
  const presents = suivis.filter((rel) => fs.existsSync(path.join(base, rel)))
  const superposer = path.join(FIXTURES, 'temoins', JUGE)
  if (!fs.existsSync(path.join(superposer, 'supabase', 'migrations', MIGRATION))) throw new Error(`témoin absent : ${path.relative(R, superposer)}/supabase/migrations/${MIGRATION}`)
  const dest = preparerTemoin(JUGE, { base, copier: presents, superposer })
  return { dest, absents: suivis.filter((rel) => !presents.includes(rel)) }
}
async function evaluer(s, id, f) {
  try {
    const r = await f()
    s.resultat(id, { ok: r.ok && r.echecs.length === 0, echecs: r.echecs, resume: r.resume })
    for (const x of r.faits || []) s.note(`${id} : ${x}`)
    return r
  } catch (e) { s.echoue(id, `interrompu : ${premiere(e)}`); return null }
}

const o = lireOptionsOuQuitter(process.argv.slice(2))
let racine = o.racine, erreurTemoin = null, absents = []
if (o.temoin) { try { const t = preparerTemoinVerrou(o.racine); racine = t.dest; absents = t.absents } catch (e) { erreurTemoin = e } }
const ids = ['VS-1', 'VS-2', 'VS-3', 'VS-4', ...(o.reel ? ['VS-REEL', 'VS-MENAGE'] : [])]
const s = creerSortie(JUGE, ids, { racine, temoin: o.temoin })
await s.executer(async (s) => {
  if (erreurTemoin) throw erreurTemoin
  if (o.temoin) s.note(`témoin : fichiers suivis à ${REFERENCE_COMMIT} copiés depuis ${o.racine}${absents.length ? ` (${absents.length} absent(s) : ${absents.slice(0, 3).join(', ')})` : ''}, puis scripts/fixtures/025/temoins/${JUGE}/ superposé`)
  const r1 = await evaluer(s, 'VS-1', () => vs1(racine))
  await evaluer(s, 'VS-2', () => vs2(racine))
  await evaluer(s, 'VS-3', () => {
    if (!r1) throw new Error('VS-1 interrompu : fonction de 0068 non lue')
    return vs3(racine, r1)
  })
  await evaluer(s, 'VS-4', () => vs4(racine))
  if (o.reel) await essaiReel(s)
})
