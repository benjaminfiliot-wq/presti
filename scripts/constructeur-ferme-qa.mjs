// scripts/constructeur-ferme-qa.mjs — le juge de la fiche 025-05 (« le constructeur de site sort de Ma page »), écrit par Claude
// Code (fiche 025-01, point 7). Statique : il lit les fichiers de la racine, les analyse avec le compilateur TypeScript du dépôt
// (node_modules/typescript, arbre syntaxique, jamais d'expressions régulières sur du JSX quand une structure est en jeu), et lance
// npm run typecheck. Il n'écrit que dans .orchestre/travail/constructeur-ferme-qa/. Aucun secret lu, aucun réseau.
//
// Usage : node scripts/constructeur-ferme-qa.mjs [--racine=<dossier>] [--temoin]
//   --racine=<dossier>  (défaut : la racine du dépôt) tout est lu dans ce dossier, et le typecheck y tourne.
//   --temoin            construit l'arbre témoin (voir plus bas) et y juge CF-1 à CF-8 : code 0 attendu. Ne se combine pas avec
//                       --racine ; pas de --reel (rien à tester en production).
// Sortie : une ligne « PASS|FAIL CF-n — … » par critère, puis « constructeur-ferme-qa : PASS » ou « … : FAIL — ids » ; code 0
// seulement si les huit critères sont verts (socle : scripts/fixtures/025/commun.mjs, creerSortie).
//
// La base des diffs (CF-2, CF-3, CF-4, CF-8) : sur la racine d'un dépôt Git, HEAD (git diff, lecture seule, GIT_OPTIONAL_LOCKS=0),
// et, si le fichier est identique à HEAD (travail déjà commité, ou pas commencé), le commit de référence 1620723 ; sur un arbre
// extrait (référence, témoin), le commit de sa marque <racine>.json (commitDeReference), sinon 1620723. Les fins de ligne sont
// normalisées (\r\n → \n : core.autocrlf vaut true sur cette machine). Sur un dépôt, git diff --numstat recoupe le diff ligne à
// ligne du juge ; les deux doivent donner les mêmes nombres.
//
//   CF-1  lib/flags.ts : l'objet FLAGS porte une seule propriété constructeurSite, de valeur false (littéral) ; importé dans un
//         processus à part (Node, types effacés), FLAGS.constructeurSite === false et actif('constructeurSite') === false.
//         Choix du juge (025-05 point 4) : un commentaire juste au-dessus, daté (jj/mm, aaaa-mm-jj ou « 24 septembre ») et qui dit
//         ce qu'il ferme (« /api/site/generate » ou « constructeur »).
//   CF-2  app/api/site/generate/route.ts : un seul POST exporté ; sa première instruction est
//         if (!actif('constructeurSite')) return NextResponse.json(…, { status: 404 }) (sans else, retour seul) ; actif importé de
//         '@/lib/flags', NextResponse de 'next/server' ; le fichier contient toujours « signalerPanneIA( » et « rendreCredit( »
//         (le test textuel de scripts/audit-final-e2e.mjs:153-155) et les deux sont de vrais appels. Choix du juge (025-05 point 5,
//         « le reste du fichier reste intact ») : contre la base, aucune ligne retirée ni modifiée ; chaque ligne ajoutée ne porte
//         que du code de la garde ou de l'import de '@/lib/flags', ou pas de code du tout (vide, commentaire seul) — jugé par les
//         jetons de l'arbre syntaxique : « /* … */ function actif() { return true } », fonction hissée qui rouvrirait la route, ou
//         du code collé sur la ligne de la garde, sont des lignes de code (relecture du 24/09).
//   CF-3  scripts/fermeture-e2e.mjs : se parse (node --check) ; contre la base, exactement une ligne ajoutée et aucune retirée ; elle
//         vaut, espaces de tête ôtés, 'constructeurSite': ['route', '/api/site/generate', 'POST', 'app/api/site/generate/route.ts']
//         (virgule finale admise, 025-05 point 6 l'écrit) ; elle est dans l'objet CARTE, qui n'a qu'une clé constructeurSite.
//   CF-4  scripts/site-sorti-des-formules-verifier.mjs : se parse ; contre la base, seule l'assertion de la ligne 48 (T("app/profil
//         …", /site_active/ …), cherchée par son texte) est retirée, remplacée au même endroit par un bloc de 1 à 10 lignes qui
//         est un appel T(…). Essai du bloc (processus à part, .orchestre/travail/constructeur-ferme-qa/cf4/) : le prélude de la
//         base (imports et aides, lignes 1-19) avec un T qui enregistre, puis le bloc lancé sur six textes de profil ; il doit
//         appeler T une fois par texte, sous le nom « app/profil : plus d'éditeur de site ; le site à la demande reste proposé »
//         (apostrophes ' ou ’, espaces normalisés), avec une condition vraie pour le profil de la racine débarrassé des quatre
//         mots, et fausse sans SITE_A_LA_DEMANDE, et fausse dès qu'un seul de genererSite, site-tiers, StyleAvance ou
//         /api/site/generate y est ajouté.
//   CF-5  app/profil/page.tsx :
//         - ne contient plus (fichier entier, commentaires compris) StyleAvance, PortfolioUpload, AvantApresUpload, site-tiers,
//           genererSite, /api/site/generate, « Réinitialiser le site », « Mon site est », « Inclus dès », « Inclus dans l’offre
//           Signature » (’, ' ou &apos;) ; choix du juge (025-05 point 1, les blocs retirés par leur titre) : ni titre
//           « Apparence », ni « Vos réalisations », « Agencer votre page », « Les textes de votre site », « Aperçu de votre site »,
//           « Rédiger mon site avec l’IA », « Régénérer avec l’IA », « Avant / après » ;
//         - l'objet enregistré (supabase.from('artisans').update|upsert({ … })) existe et n'a aucune des clés site_active,
//           site_tier, site_contenu (025-01), site_layout, realisations, avant_apres (025-05 point 1), à aucune profondeur ; un
//           étalement (…x) qui n'est pas un objet écrit sur place est refusé (clés invérifiables) ;
//         - SITE_A_LA_DEMANDE est importé de '@/lib/siteCommande' et rendu dans le JSX, et aucun de ses usages n'est sous une
//           condition (ternaire, &&, ||, ??, if, retour anticipé) qui lit l'état du site (variable d'état posée depuis
//           a.site_active, nom en siteActi…, ou .site_active), y compris à travers une constante JSX ou un petit composant
//           rendus plus loin (trois niveaux) ; SITE_A_LA_DEMANDE.bouton est rendu, et chaque usage de .bouton et .lien est sous
//           actif('siteCommandeVente') (branche vraie, non niée) ;
//         - « Supprimer le site » existe, et chacune de ses occurrences (texte JSX ou chaîne) est sous une condition vraie sur
//           l'état ENREGISTRÉ du site : une variable d'état posée au moins une fois depuis a.site_active et jamais par un geste
//           (e.target, .checked, fonction de mise à jour) ;
//         - gardés, par leur libellé dans le texte rendu (JSX et chaînes) et leur donnée : le lien (« Votre lien à partager »), la
//           page active (« Ma page est », clé plateforme_active), le logo (« Photo / logo », <LogoUpload), la bio (« Présentation
//           (bio) », bio), la zone (« Zone d'intervention », zone_intervention), les horaires (« Disponibilités », horaires), les
//           prestations (« Ce que vous proposez », services), les contacts (« Vos contacts », tel_public, email_public, reseaux),
//           le domaine (« Votre nom de domaine », /api/domain) et la suppression du compte (« Supprimer mon compte »,
//           /api/account/delete) ;
//         - choix du juge (025-05 point 1, « ne supprimer aucun fichier de composant ») : app/profil/StyleAvance.tsx,
//           app/PortfolioUpload.tsx et app/AvantApresUpload.tsx existent toujours, non vides (plus rien ne les importe : le
//           typecheck ne verrait pas leur disparition).
//   CF-6  lib/aide.ts : une seule entrée d'id 'profil', de page '/profil', avec un titre (5 signes au moins), aQuoiCaSert (20 au
//         moins) et au moins une étape ; aucun de ses textes (toutes les chaînes de l'objet, accents ôtés) ne parle d'apparence, de
//         thème, de réalisations, de niveau(x) ni de « Rédiger ou régénérer le site ». Choix du juge (025-05 point 8, « seulement
//         celles qu'aucun autre fichier de app/ n'utilise ») : toute bulle citée par <Info cle=…> dans app/** existe encore.
//   CF-7  app/profil/page.tsx (non vide) passe PR-1 (fiche 025-01 point 8) : toute phrase qui contient « moins d'une minute »
//         (', ’ ou &apos;) contient aussi « prête » ou « prépare » (phrasesMoinsUneMinute, exportée plus bas : phrase bornée par
//         . ! ? … ; < > { } " ` , une ligne vide, ou une apostrophe droite qui n'est pas entre deux lettres) ; ET la règle PR-1
//         de promesses-qa.mjs elle-même (pr1Fichier) est verte sur ce fichier : elle lit les autres graphies (relecture du 24/09).
//   CF-8  npm run typecheck vert sur la racine : `npm run typecheck -- --tsBuildInfoFile <…> --listFiles`, lancé dans la racine
//         (son package.json, son tsconfig.json) ; code 0 et aucune ligne « error TS » ; --listFiles prouve la substance : 100
//         fichiers de la racine au moins, dont les quatre fichiers TypeScript de 025-05, et lib.es5.d.ts pris dans le
//         node_modules trouvé ; aucun @ts-nocheck dans ces quatre fichiers, et pas plus de @ts-ignore/@ts-expect-error que dans
//         la base ; tsconfig.json et le script typecheck de package.json identiques à 1620723 (commun.mjs defautsTypecheck : un
//         typecheck vert sous une configuration assouplie ne prouve rien). Le fichier d'état incrémental de tsc est écrit dans .orchestre/travail/constructeur-ferme-qa/tsc/ (un par
//         racine) : le juge n'écrit jamais dans l'arbre jugé (ni tsconfig.tsbuildinfo à la racine du dépôt, ni fichier en trop
//         dans l'arbre extrait, que extraireReference revérifie blob pour blob).
//         node_modules d'un arbre extrait, qui n'en a pas : la résolution de TypeScript (moduleResolution bundler, typeRoots
//         par défaut) et le PATH que npm run donne (node_modules/.bin de chaque dossier parent) remontent les dossiers parents ;
//         la référence et le témoin sont sous .orchestre/travail/ du dépôt, donc ils trouvent <dépôt>/node_modules sans lien ni
//         copie. Mesuré le 24/09 : 325 fichiers de la référence vérifiés, les autres dans <dépôt>/node_modules, aucun tsc global
//         sur cette machine. NODE_PATH n'est pas lu par tsc ; une jonction node_modules dans l'arbre extrait le rendrait
//         différent de son commit et exposerait le node_modules du dépôt à un rm récursif : écartés. Le juge cherche le premier
//         node_modules/typescript en remontant depuis la racine et échoue en le disant s'il n'y en a pas.
//
// L'arbre témoin (--temoin) : .orchestre/travail/constructeur-ferme-qa/temoin/ = la référence 1620723 (extraireReference,
// .orchestre/travail/025-01/reference/, réutilisée si intacte) réduite à ce que le typecheck et les diffs lisent (app, lib,
// middleware.ts, tsconfig.json, package.json et les deux scripts), puis chaque fichier <chemin>.temoin de
// scripts/fixtures/025/temoins/constructeur-ferme-qa/ copié sur <chemin> : les six fichiers de 025-05 tels que la fiche les
// veut (flags, route, page, aide, fermeture-e2e, site-sorti). Suffixe .temoin : ni tsc (include **/*.ts du tsconfig), ni next
// build, ni un lint ne les prennent pour du code du dépôt. La marque temoin.json (commit 1620723) donne la base des diffs. Chaque
// fichier témoin doit remplacer un fichier existant de la référence et en différer.

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'
import {
  R, FIXTURES, TRAVAIL, REFERENCE_COMMIT, sous, exigerSousTravail, dossierTravail, lireOuNull, fichierNonVide, sha256, lancer,
  git, estRacineGit, blobGit, listerFichiers, commitDeReference, extraireReference, preparerTemoin, lireOptionsOuQuitter, creerSortie,
  defautsTypecheck, replier,
} from './fixtures/025/commun.mjs'

const JUGE = 'constructeur-ferme-qa'
const IDS = ['CF-1', 'CF-2', 'CF-3', 'CF-4', 'CF-5', 'CF-6', 'CF-7', 'CF-8']
const F = {
  flags: 'lib/flags.ts', route: 'app/api/site/generate/route.ts', profil: 'app/profil/page.tsx', aide: 'lib/aide.ts',
  fermeture: 'scripts/fermeture-e2e.mjs', sorti: 'scripts/site-sorti-des-formules-verifier.mjs',
}
const TEMOIN_FIXTURES = path.join(FIXTURES, 'temoins', JUGE)
const TEMOIN_DOSSIER = path.join(TRAVAIL, JUGE, 'temoin')
const TEMOIN_COPIER = ['app', 'lib', 'middleware.ts', 'tsconfig.json', 'package.json', F.fermeture, F.sorti]
const LIGNE_CARTE = "'constructeurSite': ['route', '/api/site/generate', 'POST', 'app/api/site/generate/route.ts']"
const NOM_ASSERTION = "app/profil : plus d'éditeur de site ; le site à la demande reste proposé"

// ── Petits outils ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const court = (s, n = 160) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t }
const premiereLigne = (e) => String((e && e.message) || e).split('\n')[0].slice(0, 300)
const lireTexte = (f) => { const b = lireOuNull(f); return b ? b.toString('utf8') : null }
const normEol = (t) => String(t).replace(/\r\n/g, '\n')
const lignesDe = (t) => normEol(t).split('\n')
const apostrophes = (t) => String(t).normalize('NFC').replace(/[’‘]/g, "'")
const ENTITES = { apos: "'", nbsp: ' ', quot: '"', amp: '&', rsquo: '’', lsquo: '‘', eacute: 'é', egrave: 'è', ecirc: 'ê', agrave: 'à', acirc: 'â', ccedil: 'ç', ocirc: 'ô', ucirc: 'û', icirc: 'î', Eacute: 'É' }
const decoder = (t) => apostrophes(String(t).replace(/&(#[xX][0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (m, c) => {
  if (c[0] === '#') { try { return String.fromCodePoint(c[1] === 'x' || c[1] === 'X' ? parseInt(c.slice(2), 16) : parseInt(c.slice(1), 10)) } catch { return m } }
  return ENTITES[c] ?? m
}))
const sansAccents = (t) => apostrophes(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const ligneDe = (texte, index) => texte.slice(0, index).split('\n').length
const rel = (p) => path.relative(R, p).split(path.sep).join('/') || '.'
const ko = (...echecs) => ({ ok: false, echecs, resume: '' })
const dossierJuge = () => { const d = exigerSousTravail(path.join(TRAVAIL, JUGE)); fs.mkdirSync(d, { recursive: true }); return d }

/** Diff ligne à ligne (plus longue sous-suite commune) → { ajouts: [{ i (index dans b), texte }], retraits: [{ i (dans a), texte }] } */
export function diffLignes(a, b) {
  const n = a.length, m = b.length
  let p = 0
  while (p < n && p < m && a[p] === b[p]) p++
  let s = 0
  while (s < n - p && s < m - p && a[n - 1 - s] === b[m - 1 - s]) s++
  const A = a.slice(p, n - s), B = b.slice(p, m - s), N = A.length, M = B.length
  const ajouts = [], retraits = []
  if ((N + 1) * (M + 1) > 16e6) { // trop grand pour la table : tout le milieu compte (le verdict reste un échec)
    A.forEach((t, k) => retraits.push({ i: p + k, texte: t })); B.forEach((t, k) => ajouts.push({ i: p + k, texte: t }))
    return { ajouts, retraits }
  }
  const L = new Int32Array((N + 1) * (M + 1)), W = M + 1
  for (let i = N - 1; i >= 0; i--) for (let j = M - 1; j >= 0; j--) L[i * W + j] = A[i] === B[j] ? L[(i + 1) * W + j + 1] + 1 : Math.max(L[(i + 1) * W + j], L[i * W + j + 1])
  let i = 0, j = 0
  while (i < N && j < M) {
    if (A[i] === B[j]) { i++; j++ } else if (L[(i + 1) * W + j] >= L[i * W + j + 1]) { retraits.push({ i: p + i, texte: A[i] }); i++ } else { ajouts.push({ i: p + j, texte: B[j] }); j++ }
  }
  for (; i < N; i++) retraits.push({ i: p + i, texte: A[i] })
  for (; j < M; j++) ajouts.push({ i: p + j, texte: B[j] })
  return { ajouts, retraits }
}
const resumeDiff = (d) => [...d.retraits.slice(0, 2).map((x) => `−${x.i + 1} « ${court(x.texte, 70)} »`), ...d.ajouts.slice(0, 2).map((x) => `+${x.i + 1} « ${court(x.texte, 70)} »`)].join(' ; ')

/**
 * La base d'un fichier pour les diffs : HEAD sur la racine d'un dépôt (1620723 si le fichier est identique à HEAD), le commit de
 * la marque sur un arbre extrait. → { texte (ou null), nom, rev, git (vrai : racine d'un dépôt, git diff --numstat possible) }
 */
function baseDe(racine, chemin, courant) {
  if (estRacineGit(racine)) {
    const head = blobGit(racine, 'HEAD', chemin)
    if (head && courant !== null && normEol(head.toString('utf8')) !== normEol(courant)) return { texte: head.toString('utf8'), nom: 'HEAD', rev: 'HEAD', git: true }
    const ref = blobGit(racine, REFERENCE_COMMIT, chemin)
    return { texte: ref ? ref.toString('utf8') : null, nom: `${REFERENCE_COMMIT} (fichier identique à HEAD)`, rev: REFERENCE_COMMIT, git: true }
  }
  const c = commitDeReference(racine) || REFERENCE_COMMIT
  const b = blobGit(R, c, chemin)
  return { texte: b ? b.toString('utf8') : null, nom: c.slice(0, 7), rev: c, git: false }
}
/** git diff --numstat <rev> -- <chemin> (lecture seule) → { ajouts, retraits } ou { erreur } */
function numstat(racine, rev, chemin) {
  const r = git(['diff', '--numstat', rev, '--', chemin], { cwd: racine })
  if (r.code !== 0) return { erreur: court(r.stderr || r.erreur) }
  const l = r.stdout.trim().split('\n').filter(Boolean)
  if (!l.length) return { ajouts: 0, retraits: 0 }
  const [aj, re] = l[0].split('\t')
  return { ajouts: Number(aj), retraits: Number(re) }
}
function nodeCheck(fichier) {
  const r = lancer(process.execPath, ['--check', fichier], { timeout: 30_000 })
  return r.code === 0 ? null : `node --check en code ${r.code} : ${court(r.sortie.split('\n').find((l) => /Error/.test(l)) || r.derniereLigne, 120)}`
}

// ── TypeScript : arbre syntaxique ─────────────────────────────────────────────────────────────────────────────────────────
const analyser = (texte, nom) => ts.createSourceFile(nom, texte, ts.ScriptTarget.Latest, true, /\.tsx$/.test(nom) ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
function parcourir(noeud, visite) { visite(noeud); ts.forEachChild(noeud, (c) => parcourir(c, visite)) }
const sansParentheses = (n) => { while (n && (ts.isParenthesizedExpression(n) || ts.isAsExpression(n) || (ts.isSatisfiesExpression && ts.isSatisfiesExpression(n)))) n = n.expression; return n }
const nomPropriete = (p) => (p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name) || ts.isNumericLiteral(p.name) || ts.isPrivateIdentifier(p.name)) ? p.name.text : null)
const ligneNoeud = (sf, n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1
const exporte = (st) => !!(ts.canHaveModifiers(st) && ts.getModifiers(st)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword))
const importeDe = (sf, module, nom) => sf.statements.some((d) => ts.isImportDeclaration(d) && ts.isStringLiteral(d.moduleSpecifier) && d.moduleSpecifier.text === module
  && d.importClause?.namedBindings && ts.isNamedImports(d.importClause.namedBindings) && d.importClause.namedBindings.elements.some((e) => e.name.text === nom && (!e.propertyName || e.propertyName.text === nom)))
const appelDe = (n, nom) => ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === nom
const estActif = (n, drapeau) => appelDe(n, 'actif') && n.arguments.length === 1 && ts.isStringLiteralLike(n.arguments[0]) && n.arguments[0].text === drapeau

/**
 * Les conditions qui gardent un nœud, en remontant : [{ cond, pol }] ; pol = 1 si le nœud est rendu quand cond est vraie, −1
 * sinon. Suit aussi, sur trois niveaux, un JSX rangé dans une constante ou un petit composant (const X = <…/>, const X = () =>
 * <…/>, function X() { … }) : les conditions de chaque endroit où X est cité s'ajoutent (union : un seul chemin sous condition
 * suffit à la compter).
 */
function conditionsDe(noeud, profondeur = 0) {
  const out = []
  const retourne = (s) => ts.isReturnStatement(s) || (ts.isBlock(s) && s.statements.some((x) => ts.isReturnStatement(x)))
  for (let n = noeud, p = noeud.parent; p; n = p, p = p.parent) {
    const nomRange = (ts.isVariableDeclaration(p) && n === p.initializer && ts.isIdentifier(p.name)) ? p.name
      : (ts.isFunctionDeclaration(p) && p.name && n === p.body) ? p.name : null
    if (nomRange && profondeur < 3) {
      parcourir(p.getSourceFile(), (x) => {
        if (ts.isIdentifier(x) && x.text === nomRange.text && x !== nomRange && !(ts.isPropertyAccessExpression(x.parent) && x.parent.name === x)) out.push(...conditionsDe(x, profondeur + 1))
      })
    }
    if (ts.isConditionalExpression(p)) {
      if (n === p.whenTrue) out.push({ cond: p.condition, pol: 1 }); else if (n === p.whenFalse) out.push({ cond: p.condition, pol: -1 })
    } else if (ts.isBinaryExpression(p) && n === p.right) {
      const op = p.operatorToken.kind
      if (op === ts.SyntaxKind.AmpersandAmpersandToken) out.push({ cond: p.left, pol: 1 })
      else if (op === ts.SyntaxKind.BarBarToken || op === ts.SyntaxKind.QuestionQuestionToken) out.push({ cond: p.left, pol: -1 })
    } else if (ts.isIfStatement(p)) {
      if (n === p.thenStatement) out.push({ cond: p.expression, pol: 1 }); else if (n === p.elseStatement) out.push({ cond: p.expression, pol: -1 })
    }
    if (ts.isBlock(p) || ts.isSourceFile(p)) { // retour anticipé : if (x) return … avant l'instruction qui contient le nœud
      for (const st of p.statements) { if (st === n) break; if (ts.isIfStatement(st) && retourne(st.thenStatement)) out.push({ cond: st.expression, pol: -1 }) }
    }
  }
  return out
}
/** Dans une condition, un nœud qui vérifie pred est-il lu tel quel ('positive'), sous un nombre impair de « ! » ('negative'), ou pas du tout (null) ? */
function reference(cond, pred) {
  let pos = false, neg = false
  const visite = (n, parite) => {
    if (pred(n)) { if (parite % 2) neg = true; else pos = true }
    const p2 = ts.isPrefixUnaryExpression(n) && n.operator === ts.SyntaxKind.ExclamationToken ? parite + 1 : parite
    ts.forEachChild(n, (c) => visite(c, p2))
  }
  visite(cond, 0)
  return pos ? 'positive' : neg ? 'negative' : null
}
/** Une des conditions garde-t-elle le nœud de façon positive (vraie quand pred est vrai) ? */
const gardePositive = (conds, pred) => conds.some((c) => { const r = reference(c.cond, pred); return r !== null && c.pol * (r === 'positive' ? 1 : -1) > 0 })

/** Les variables d'état du site dans une page : { tous (lues depuis site_active ou nommées siteActi…), enregistres (depuis la base, jamais par un geste) } */
function etatsDuSite(sf) {
  const paires = new Map() // setter → variable
  parcourir(sf, (n) => {
    if (ts.isVariableDeclaration(n) && ts.isArrayBindingPattern(n.name) && n.initializer && ts.isCallExpression(n.initializer) && /\buseState$/.test(n.initializer.expression.getText(sf))) {
      const [v, s] = n.name.elements
      if (v && s && ts.isBindingElement(v) && ts.isBindingElement(s) && ts.isIdentifier(v.name) && ts.isIdentifier(s.name)) paires.set(s.name.text, v.name.text)
    }
  })
  const depuisBase = new Set(), parGeste = new Set()
  parcourir(sf, (n) => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && paires.has(n.expression.text) && n.arguments[0]) {
      const a = n.arguments[0], t = a.getText(sf), v = paires.get(n.expression.text)
      if (/\bsite_active\b/.test(t)) depuisBase.add(v)
      if (/\.target\b|\.checked\b|\bevent\b/.test(t) || ts.isArrowFunction(a) || ts.isFunctionExpression(a)) parGeste.add(v)
    }
  })
  const tous = new Set([...depuisBase, ...[...paires.values()].filter((v) => /^siteActi/i.test(v))])
  return { tous, enregistres: new Set([...depuisBase].filter((v) => !parGeste.has(v))) }
}
const lit = (noms) => (n) => (ts.isIdentifier(n) && noms.has(n.text) && !(ts.isPropertyAccessExpression(n.parent) && n.parent.name === n))
  || (ts.isPropertyAccessExpression(n) && n.name.text === 'site_active')
const dansJsx = (n) => { for (let p = n.parent; p; p = p.parent) if (ts.isJsxExpression(p) || ts.isJsxAttribute(p)) return true; return false }
/** Le texte rendu d'une page : textes JSX et chaînes (hors imports), entités et apostrophes normalisées. */
function texteRendu(sf) {
  const morceaux = []
  parcourir(sf, (n) => {
    if (ts.isJsxText(n)) morceaux.push(n.text)
    else if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && !ts.isImportDeclaration(n.parent)) morceaux.push(n.text)
    else if (ts.isTemplateExpression(n)) morceaux.push(n.head.text, ...n.templateSpans.map((x) => x.literal.text))
  })
  return decoder(morceaux.join('\n'))
}

// ── PR-1 (fiche 025-01 point 8), recopiée ici pour CF-7 ──────────────────────────────────────────────────────────────────
/**
 * Les phrases d'un texte source qui contiennent « moins d'une minute » (', ’ ou &apos;) → [{ ligne, phrase, ok }] ; ok = la
 * phrase contient aussi « prête » ou « prépare ». Bornes d'une phrase : . ! ? … ; < > { } " ` , une ligne vide, ou une
 * apostrophe droite qui n'est pas entre deux lettres (délimiteur de chaîne) ; un retour à la ligne seul n'en est pas une (texte
 * JSX sur plusieurs lignes).
 */
export function phrasesMoinsUneMinute(source) {
  const t = decoder(normEol(source))
  const lettre = (c) => !!c && /\p{L}/u.test(c)
  const borne = (k) => {
    const c = t[k]
    if ('.!?…;<>{}"`'.includes(c)) return true
    if (c === "'" && !(lettre(t[k - 1]) && lettre(t[k + 1]))) return true
    if (c === '\n') { let x = k + 1; while (t[x] === ' ' || t[x] === '\t') x++; if (t[x] === '\n') return true }
    return false
  }
  const out = []
  for (const m of t.matchAll(/moins d'une minute/giu)) {
    let d = m.index, f = m.index + m[0].length
    while (d > 0 && !borne(d - 1)) d--
    while (f < t.length && !borne(f)) f++
    const phrase = t.slice(d, f).replace(/\s+/g, ' ').trim()
    out.push({ ligne: ligneDe(t, m.index), phrase, ok: /pr[êe]te|pr[ée]par/iu.test(phrase) })
  }
  return out
}

// ── CF-1 : le drapeau ─────────────────────────────────────────────────────────────────────────────────────────────────────
const DATE = /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b|\b20\d{2}-\d{2}-\d{2}\b|\b\d{1,2}(?:er)?\s+(?:janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre)\b/i
function cf1(racine) {
  const f = path.join(racine, F.flags), src = lireTexte(f)
  if (!src || !src.trim()) return ko(`${F.flags} absent ou vide`)
  const echecs = []
  const sf = analyser(src, F.flags)
  let objet = null
  parcourir(sf, (n) => { if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === 'FLAGS' && n.initializer) { const i = sansParentheses(n.initializer); if (ts.isObjectLiteralExpression(i)) objet = i } })
  if (!objet) return ko(`${F.flags} : objet FLAGS introuvable`)
  const props = objet.properties.filter((p) => nomPropriete(p) === 'constructeurSite')
  if (props.length !== 1) echecs.push(`${props.length} propriété(s) constructeurSite dans FLAGS, une attendue`)
  else {
    const p = props[0]
    if (!ts.isPropertyAssignment(p) || p.initializer.kind !== ts.SyntaxKind.FalseKeyword) echecs.push(`constructeurSite vaut « ${court(ts.isPropertyAssignment(p) ? p.initializer.getText(sf) : p.getText(sf), 60)} », le littéral false attendu`)
    const com = (ts.getLeadingCommentRanges(src, p.getFullStart()) || []).map((c) => src.slice(c.pos, c.end)).join('\n')
    if (!com.trim()) echecs.push("aucun commentaire au-dessus de constructeurSite (025-05 point 4 : un commentaire daté qui dit ce qu'il ferme)")
    else {
      if (!DATE.test(com)) echecs.push(`commentaire de constructeurSite sans date : « ${court(com, 90)} »`)
      if (!/\/api\/site\/generate|constructeur/i.test(com)) echecs.push(`commentaire de constructeurSite qui ne dit pas ce qu'il ferme (ni /api/site/generate, ni « constructeur ») : « ${court(com, 90)} »`)
    }
  }
  // La valeur réelle, dans un processus à part (le code jugé ne tourne jamais dans le juge).
  const r = lancer(process.execPath, ['--input-type=module', '-e',
    "const m = await import(process.env.CF1_URL); const v = m.FLAGS ? m.FLAGS.constructeurSite : 'FLAGS absent'; const a = typeof m.actif === 'function' ? m.actif('constructeurSite') : 'actif absent'; console.log('CF1 ' + JSON.stringify({ v, a }))"],
  { cwd: dossierJuge(), timeout: 30_000, env: { CF1_URL: pathToFileURL(f).href } })
  const l = r.stdout.split(/\r?\n/).filter((x) => x.startsWith('CF1 '))
  let valeur = null
  try { valeur = l.length === 1 ? JSON.parse(l[0].slice(4)) : null } catch { valeur = null }
  if (!valeur) echecs.push(`import de ${F.flags} en échec (code ${r.code}) : ${court(r.sortie.split('\n').find((x) => /Error/.test(x)) || r.derniereLigne, 120)}`)
  else if (valeur.v !== false || valeur.a !== false) echecs.push(`à l'exécution : FLAGS.constructeurSite = ${JSON.stringify(valeur.v)}, actif('constructeurSite') = ${JSON.stringify(valeur.a)} ; false et false attendus`)
  return { ok: !echecs.length, echecs, resume: `FLAGS.constructeurSite: false (ligne ${props[0] ? ligneNoeud(sf, props[0]) : '?'}), commentaire daté qui dit ce qu'il ferme ; à l'exécution FLAGS.constructeurSite === false et actif('constructeurSite') === false` }
}

// ── CF-2 : la route fermée ────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * Les lignes (indices à partir de 0) qui portent au moins un jeton de code hors des nœuds `zones` : feuilles de l'arbre syntaxique
 * (jetons ; commentaires et JSDoc exclus, ce sont des trivia), chacune marquant les lignes qu'elle couvre (une chaîne sur plusieurs
 * lignes les marque toutes).
 */
export function lignesDeCodeHors(sf, zones = []) {
  const out = new Set()
  const dans = (n) => zones.some((z) => n.getStart(sf) >= z.getStart(sf) && n.getEnd() <= z.getEnd())
  const visite = (n) => {
    if (n.kind === ts.SyntaxKind.EndOfFileToken) return
    if (n.kind >= ts.SyntaxKind.FirstJSDocNode && n.kind <= ts.SyntaxKind.LastJSDocNode) return
    const enfants = n.getChildren(sf)
    if (enfants.length) { for (const c of enfants) visite(c); return }
    if (n.getEnd() <= n.getStart(sf) || dans(n)) return
    const a = sf.getLineAndCharacterOfPosition(n.getStart(sf)).line, b = sf.getLineAndCharacterOfPosition(n.getEnd()).line
    for (let k = a; k <= b; k++) out.add(k)
  }
  visite(sf)
  return out
}
function defautsGarde(st, sf) {
  const d = []
  if (!st) return ['le POST est vide']
  if (!ts.isIfStatement(st)) return [`la première instruction du POST est « ${court(st.getText(sf), 80)} », pas la garde if (!actif('constructeurSite')) return …`]
  if (st.elseStatement) d.push('la garde a un else')
  const c = sansParentheses(st.expression)
  if (!(ts.isPrefixUnaryExpression(c) && c.operator === ts.SyntaxKind.ExclamationToken && estActif(sansParentheses(c.operand), 'constructeurSite'))) d.push(`condition « ${court(st.expression.getText(sf), 60)} », !actif('constructeurSite') attendu`)
  let ret = st.thenStatement
  if (ts.isBlock(ret)) ret = ret.statements.length === 1 ? ret.statements[0] : null
  if (!ret || !ts.isReturnStatement(ret) || !ret.expression) { d.push('la garde ne fait pas seulement « return NextResponse.json(…) »'); return d }
  const e = sansParentheses(ret.expression)
  const estJson = ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && ts.isIdentifier(e.expression.expression) && e.expression.expression.text === 'NextResponse' && e.expression.name.text === 'json'
  if (!estJson) { d.push(`la garde retourne « ${court(ret.expression.getText(sf), 60)} », NextResponse.json(…) attendu`); return d }
  const init = e.arguments[1] && sansParentheses(e.arguments[1])
  const statut = init && ts.isObjectLiteralExpression(init) ? init.properties.find((p) => nomPropriete(p) === 'status') : null
  if (!statut || !ts.isPropertyAssignment(statut) || !ts.isNumericLiteral(statut.initializer) || statut.initializer.text !== '404') d.push(`statut de la garde « ${statut ? court(statut.getText(sf), 30) : 'absent'} », status: 404 attendu (fermeture-e2e.mjs:214)`)
  return d
}
function cf2(racine) {
  const f = path.join(racine, F.route), src = lireTexte(f)
  if (!src || !src.trim()) return ko(`${F.route} absent ou vide`)
  const echecs = []
  const sf = analyser(src, F.route)
  const corps = []
  for (const st of sf.statements) {
    if (ts.isFunctionDeclaration(st) && st.name?.text === 'POST' && exporte(st)) corps.push(st.body)
    if (ts.isVariableStatement(st) && exporte(st)) for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name) && d.name.text === 'POST' && d.initializer) { const i = sansParentheses(d.initializer); if (ts.isArrowFunction(i) || ts.isFunctionExpression(i)) corps.push(i.body) }
  }
  let garde = null
  if (corps.length !== 1) echecs.push(`${corps.length} POST exporté(s), un attendu`)
  else if (!corps[0] || !ts.isBlock(corps[0])) echecs.push('le POST n\'a pas de corps entre accolades')
  else {
    garde = corps[0].statements[0]
    echecs.push(...defautsGarde(garde, sf))
  }
  if (!importeDe(sf, '@/lib/flags', 'actif')) echecs.push("actif n'est pas importé de '@/lib/flags'")
  if (!importeDe(sf, 'next/server', 'NextResponse')) echecs.push("NextResponse n'est pas importé de 'next/server'")
  for (const nom of ['signalerPanneIA', 'rendreCredit']) {
    let appels = 0
    parcourir(sf, (n) => { if (appelDe(n, nom)) appels++ })
    if (!new RegExp(`${nom}\\(`).test(src)) echecs.push(`« ${nom}( » a disparu (scripts/audit-final-e2e.mjs:153-155 l'exige)`)
    else if (!appels) echecs.push(`« ${nom}( » n'est plus appelé (seulement cité hors code)`)
  }
  // Le reste du fichier reste intact (025-05 point 5).
  const base = baseDe(racine, F.route, src)
  let faitBase = ''
  if (base.texte === null) echecs.push(`${F.route} absent de la base ${base.nom}`)
  else {
    const d = diffLignes(lignesDe(base.texte), lignesDe(src))
    if (d.retraits.length) echecs.push(`${d.retraits.length} ligne(s) de ${base.nom} retirée(s) ou modifiée(s) — le reste du fichier doit rester intact : ${resumeDiff({ ajouts: [], retraits: d.retraits })}`)
    // Une ligne ajoutée est permise si tout le code qu'elle porte (jetons de l'arbre syntaxique, commentaires exclus) appartient à la
    // garde ou à l'import de '@/lib/flags' : une ligne vide ou de commentaire seul passe, « /* … */ function actif() { … } » non,
    // ni du code collé sur la ligne de la garde (relecture du 24/09 : une fonction actif locale, hissée, rouvrait la route).
    const zones = [garde, ...sf.statements.filter((st) => ts.isImportDeclaration(st) && ts.isStringLiteral(st.moduleSpecifier) && st.moduleSpecifier.text === '@/lib/flags')].filter(Boolean)
    const horsZones = lignesDeCodeHors(sf, zones)
    const intrus = d.ajouts.filter((x) => horsZones.has(x.i))
    if (intrus.length) echecs.push(`${intrus.length} ligne(s) ajoutée(s) hors de la garde et de l'import de actif : ${intrus.slice(0, 2).map((x) => `+${x.i + 1} « ${court(x.texte, 70)} »`).join(' ; ')}`)
    faitBase = `diff contre ${base.nom} : ${d.ajouts.length} ligne(s) ajoutée(s), 0 retirée`
  }
  return { ok: !echecs.length, echecs, resume: `première instruction du POST (ligne ${garde ? ligneNoeud(sf, garde) : '?'}) : if (!actif('constructeurSite')) return NextResponse.json(…, { status: 404 }) ; signalerPanneIA( et rendreCredit( toujours appelés ; ${faitBase}` }
}

// ── CF-3 : la carte de fermeture-e2e ──────────────────────────────────────────────────────────────────────────────────────
/** Les lignes (index) de l'objet CARTE : de « const CARTE = { » à l'accolade qui le ferme (comptée hors chaînes). */
function blocCarte(lignes) {
  const debut = lignes.findIndex((l) => /^\s*const CARTE\s*=\s*\{/.test(l))
  if (debut < 0) return null
  let prof = 0
  for (let k = debut; k < lignes.length; k++) {
    const l = lignes[k].replace(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|\/\/.*$/g, '')
    for (const c of l) { if (c === '{') prof++; else if (c === '}') prof-- }
    if (prof === 0) return { debut, fin: k }
  }
  return null
}
function cf3(racine) {
  const f = path.join(racine, F.fermeture), src = lireTexte(f)
  if (!src || !src.trim()) return ko(`${F.fermeture} absent ou vide`)
  const echecs = []
  const syntaxe = nodeCheck(f)
  if (syntaxe) echecs.push(syntaxe)
  const base = baseDe(racine, F.fermeture, src)
  if (base.texte === null) return ko(`${F.fermeture} absent de la base ${base.nom}`)
  const b = lignesDe(src)
  const d = diffLignes(lignesDe(base.texte), b)
  const bonne = (t) => [LIGNE_CARTE, `${LIGNE_CARTE},`].includes(t.trim())
  if (d.retraits.length || d.ajouts.length !== 1) echecs.push(`diff contre ${base.nom} : ${d.ajouts.length} ligne(s) ajoutée(s), ${d.retraits.length} retirée(s) — exactement une ligne ajoutée attendue${d.ajouts.length + d.retraits.length ? ` (${resumeDiff(d)})` : ''}`)
  const ajout = d.ajouts.find((x) => bonne(x.texte))
  if (!ajout) echecs.push(`la ligne ${LIGNE_CARTE}, n'est pas ajoutée à l'identique`)
  const carte = blocCarte(b)
  if (!carte) echecs.push('objet CARTE introuvable')
  else {
    if (ajout && !(ajout.i > carte.debut && ajout.i < carte.fin)) echecs.push(`la ligne ajoutée (${ajout.i + 1}) est hors de CARTE (lignes ${carte.debut + 1}-${carte.fin + 1})`)
    const cles = b.slice(carte.debut, carte.fin + 1).filter((l) => /['"`]?constructeurSite['"`]?\s*:/.test(l)).length
    if (cles !== 1) echecs.push(`${cles} clé(s) constructeurSite dans CARTE, une attendue`)
  }
  let git = ''
  if (base.git) {
    const ns = numstat(racine, base.rev, F.fermeture)
    if (ns.erreur || ns.ajouts !== 1 || ns.retraits !== 0) echecs.push(`git diff --numstat ${base.rev} : ${ns.erreur || `${ns.ajouts} ajout(s), ${ns.retraits} retrait(s)`} ; 1 et 0 attendus`)
    else git = ` ; git diff --numstat ${base.rev} : 1 ajout, 0 retrait`
  }
  return { ok: !echecs.length, echecs, resume: `diff contre ${base.nom} : une ligne ajoutée (${ajout ? ajout.i + 1 : '?'}), dans CARTE, à l'identique ; node --check vert${git}` }
}

// ── CF-4 : l'assertion de site-sorti ──────────────────────────────────────────────────────────────────────────────────────
function casCF4(racine) {
  let conforme = (lireTexte(path.join(racine, F.profil)) || '')
    .replace(/genererSite/g, 'xxRetire1').replace(/site-tiers/g, 'xx-retire-2').replace(/StyleAvance/g, 'XxRetire3').replace(/\/api\/site\/generate/g, '/api/xx/retire4')
  if (!/SITE_A_LA_DEMANDE/.test(conforme)) conforme += '\n{SITE_A_LA_DEMANDE.titre}\n'
  const cas = [
    { nom: 'profil de la racine sans les quatre mots', profil: conforme, attendu: true },
    { nom: 'sans SITE_A_LA_DEMANDE', profil: conforme.replace(/SITE_A_LA_DEMANDE/g, 'SITE_XX_RETIRE'), attendu: false },
  ]
  for (const mot of ['genererSite', 'site-tiers', 'StyleAvance', '/api/site/generate']) cas.push({ nom: `avec « ${mot} »`, profil: `${conforme}\n${mot}\n`, attendu: false })
  return cas
}
function cf4(racine) {
  const f = path.join(racine, F.sorti), src = lireTexte(f)
  if (!src || !src.trim()) return ko(`${F.sorti} absent ou vide`)
  const echecs = []
  const syntaxe = nodeCheck(f)
  if (syntaxe) echecs.push(syntaxe)
  const base = baseDe(racine, F.sorti, src)
  if (base.texte === null) return ko(`${F.sorti} absent de la base ${base.nom}`)
  const a = lignesDe(base.texte), b = lignesDe(src)
  const iAncienne = a.findIndex((l) => /^T\(\s*["'`]app\/profil/.test(l.trim()))
  if (iAncienne < 0) return ko(`assertion d'origine T("app/profil …") introuvable dans la base ${base.nom}`)
  const d = diffLignes(a, b)
  const idx = d.ajouts.map((x) => x.i)
  const remplaceSeule = d.retraits.length === 1 && d.retraits[0].i === iAncienne
  const blocContigu = idx.length >= 1 && idx.length <= 10 && idx[0] === iAncienne && idx.every((v, k) => v === iAncienne + k)
  if (!remplaceSeule || !blocContigu) {
    echecs.push(`diff contre ${base.nom} : ${d.retraits.length} ligne(s) retirée(s), ${d.ajouts.length} ajoutée(s) — seule l'assertion de la ligne ${iAncienne + 1} doit être remplacée, au même endroit${d.ajouts.length + d.retraits.length ? ` (${resumeDiff(d)})` : ''}`)
    return { ok: false, echecs, resume: '' }
  }
  const bloc = d.ajouts.map((x) => x.texte).join('\n')
  if (!/^T\s*\(/.test(bloc.trim())) echecs.push(`le remplacement n'est pas un appel T(…) : « ${court(bloc, 80)} »`)
  if (base.git) {
    const ns = numstat(racine, base.rev, F.sorti)
    if (ns.erreur || ns.ajouts !== idx.length || ns.retraits !== 1) echecs.push(`git diff --numstat ${base.rev} : ${ns.erreur || `${ns.ajouts} ajout(s), ${ns.retraits} retrait(s)`} ; ${idx.length} et 1 attendus`)
  }
  // Essai du bloc, dans un processus à part : le prélude de la base (imports et aides), un T qui enregistre, six profils.
  const iPrelude = a.findIndex((l) => /^console\.log\(/.test(l))
  const prelude = a.slice(0, iPrelude < 0 ? 0 : iPrelude)
  const iT = prelude.findIndex((l) => /^const T = /.test(l))
  if (iT < 0) { echecs.push(`harnais : « const T = » introuvable dans le prélude de ${base.nom}`); return { ok: false, echecs, resume: '' } }
  prelude[iT] = 'const T = (nom, cond) => { globalThis.__cf4.push({ nom: String(nom), cond: !!cond }) }'
  const nonce = crypto.randomBytes(12).toString('hex')
  const D = dossierTravail(JUGE, 'cf4')
  const cas = casCF4(racine)
  fs.writeFileSync(path.join(D, 'cas.json'), JSON.stringify(cas.map((c) => c.profil)))
  fs.writeFileSync(path.join(D, 'harnais.mjs'), [
    "import __fs from 'node:fs'", ...prelude, '',
    "const __cas = JSON.parse(__fs.readFileSync(new URL('./cas.json', import.meta.url), 'utf8'))",
    'const __sorties = []',
    'for (const __c of __cas) {', '  globalThis.__cf4 = []', '  {', '    const profil = __c', bloc, '  }', '  __sorties.push(globalThis.__cf4)', '}',
    `console.log('${nonce} ' + JSON.stringify(__sorties))`, '',
  ].join('\n'))
  const r = lancer(process.execPath, [path.join(D, 'harnais.mjs')], { cwd: D, timeout: 30_000 })
  const l = r.stdout.split(/\r?\n/).filter((x) => x.startsWith(`${nonce} `))
  let sorties = null
  try { sorties = l.length === 1 ? JSON.parse(l[0].slice(nonce.length + 1)) : null } catch { sorties = null }
  if (!Array.isArray(sorties) || sorties.length !== cas.length) { echecs.push(`essai du bloc en échec (code ${r.code}) : ${court(r.sortie.split('\n').find((x) => /Error/.test(x)) || r.derniereLigne, 140)}`); return { ok: false, echecs, resume: '' } }
  const nomNorm = (s) => apostrophes(s).replace(/\s+/g, ' ').trim()
  cas.forEach((c, k) => {
    const appels = sorties[k]
    if (appels.length !== 1) { echecs.push(`profil « ${c.nom} » : ${appels.length} appel(s) de T, un attendu`); return }
    if (nomNorm(appels[0].nom) !== nomNorm(NOM_ASSERTION)) echecs.push(`nom de l'assertion « ${court(appels[0].nom, 90)} », « ${NOM_ASSERTION} » attendu`)
    if (appels[0].cond !== c.attendu) echecs.push(`profil « ${c.nom} » : l'assertion rend ${appels[0].cond}, ${c.attendu} attendu`)
  })
  const nomVu = [...new Set(sorties.flat().map((x) => x.nom))]
  return { ok: !echecs.length, echecs: [...new Set(echecs)], resume: `diff contre ${base.nom} : la ligne ${iAncienne + 1} seule remplacée par ${idx.length} ligne(s) ; « ${court(nomVu[0], 80)} » exige SITE_A_LA_DEMANDE et refuse genererSite, site-tiers, StyleAvance, /api/site/generate (6 profils essayés)` }
}

// ── CF-5 : la page ────────────────────────────────────────────────────────────────────────────────────────────────────────
const ABSENTS = ['StyleAvance', 'PortfolioUpload', 'AvantApresUpload', 'site-tiers', 'genererSite', '/api/site/generate', 'Réinitialiser le site', 'Mon site est', 'Inclus dès', "Inclus dans l'offre Signature"]
const TITRES_RETIRES = ['Vos réalisations', 'Agencer votre page', 'Les textes de votre site', 'Aperçu de votre site', "Rédiger mon site avec l'IA", "Régénérer avec l'IA", 'Avant / après']
const CLES_RETIREES = ['site_active', 'site_tier', 'site_contenu', 'site_layout', 'realisations', 'avant_apres']
const COMPOSANTS_GARDES = ['app/profil/StyleAvance.tsx', 'app/PortfolioUpload.tsx', 'app/AvantApresUpload.tsx']
const GARDES = [
  ['le lien', /Votre lien à partager/, [], null],
  ['la page active', /Ma page est/, ['plateforme_active'], null],
  ['le logo', /Photo \/ logo/, [], /<LogoUpload\b/],
  ['la bio', /Présentation \(bio\)/, ['bio'], null],
  ['la zone', /Zone d'intervention/, ['zone_intervention'], null],
  ['les horaires', /Disponibilités/, ['horaires'], null],
  ['les prestations', /Ce que vous proposez/, ['services'], null],
  ['les contacts', /Vos contacts/, ['tel_public', 'email_public', 'reseaux'], null],
  ['le domaine', /Votre nom de domaine/, [], /['"`]\/api\/domain['"`]/],
  ['la suppression du compte', /Supprimer mon compte/, [], /['"`]\/api\/account\/delete['"`]/],
]
function cf5(racine) {
  const f = path.join(racine, F.profil), src = lireTexte(f)
  if (!src || !src.trim()) return ko(`${F.profil} absent ou vide`)
  const echecs = []
  const sf = analyser(src, F.profil)
  const brut = decoder(normEol(src))
  // 1. ce qui a disparu — dans le source décodé, puis sous d'autres graphies (commun.mjs replier : invisibles, NFKC, cyrillique ;
  // blancs et insécables resserrés) et dans le texte rendu mis à plat (« Mon site{' '}est », « Mon <b>site</b> est »)
  const rendu = texteRendu(sf)
  const plat = (t) => apostrophes(replier(t)).replace(/\s+/g, ' ')
  const brutPlat = plat(brut), renduPlat = plat(rendu)
  for (const m of ABSENTS) {
    const i = brut.indexOf(apostrophes(m))
    if (i >= 0) echecs.push(`contient encore « ${m} » (ligne ${ligneDe(brut, i)})`)
    else if (brutPlat.includes(plat(m)) || renduPlat.includes(plat(m))) echecs.push(`contient encore « ${m} », sous une autre graphie (blancs, insécables, invisibles ou lettres d’un autre alphabet)`)
  }
  let apparence = null
  parcourir(sf, (n) => { if (!apparence && ts.isJsxText(n) && n.text.trim() === 'Apparence') apparence = n })
  if (apparence) echecs.push(`le bloc « Apparence » est toujours là (ligne ${ligneNoeud(sf, apparence)})`)
  for (const t of TITRES_RETIRES) if (rendu.includes(apostrophes(t)) || renduPlat.includes(plat(t))) echecs.push(`« ${t} » est toujours rendu`)
  // 2. l'objet enregistré
  const ecritures = []
  parcourir(sf, (n) => {
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && ['update', 'upsert'].includes(n.expression.name.text) && n.arguments[0]
      && /\.from\(\s*['"`]artisans['"`]\s*\)/.test(n.expression.expression.getText(sf))) {
      const o = sansParentheses(n.arguments[0])
      if (ts.isObjectLiteralExpression(o)) ecritures.push(o); else echecs.push(`objet enregistré non écrit sur place (ligne ${ligneNoeud(sf, n)}) : clés invérifiables`)
    }
  })
  const cles = new Set()
  if (!ecritures.length) echecs.push("objet enregistré introuvable : aucun supabase.from('artisans').update({ … })")
  for (const o of ecritures) {
    for (const p of o.properties) if (ts.isSpreadAssignment(p)) {
      const e = sansParentheses(p.expression)
      const surPlace = (x) => ts.isObjectLiteralExpression(sansParentheses(x))
      if (!(surPlace(e) || (ts.isConditionalExpression(e) && surPlace(e.whenTrue) && surPlace(e.whenFalse)) || (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && surPlace(e.right))))
        echecs.push(`étalement « ${court(p.getText(sf), 60)} » dans l'objet enregistré (ligne ${ligneNoeud(sf, p)}) : clés invérifiables`)
    }
    parcourir(o, (n) => { if (ts.isPropertyAssignment(n) || ts.isShorthandPropertyAssignment(n)) { const k = nomPropriete(n); if (k) cles.add(k) } })
  }
  const restantes = CLES_RETIREES.filter((k) => cles.has(k))
  if (restantes.length) echecs.push(`l'objet enregistré écrit encore ${restantes.join(', ')}`)
  // 3. le site à la demande, hors de toute condition sur l'état du site ; son bouton sous actif('siteCommandeVente')
  const etat = etatsDuSite(sf)
  const litEtat = lit(etat.tous)
  if (!importeDe(sf, '@/lib/siteCommande', 'SITE_A_LA_DEMANDE')) echecs.push("SITE_A_LA_DEMANDE n'est plus importé de '@/lib/siteCommande'")
  const usages = []
  parcourir(sf, (n) => { if (ts.isIdentifier(n) && n.text === 'SITE_A_LA_DEMANDE' && !ts.isImportSpecifier(n.parent) && dansJsx(n)) usages.push(n) })
  if (!usages.length) echecs.push("SITE_A_LA_DEMANDE n'est plus rendu dans le JSX")
  for (const u of usages) {
    const c = conditionsDe(u).find((x) => reference(x.cond, litEtat) !== null)
    if (c) echecs.push(`SITE_A_LA_DEMANDE (ligne ${ligneNoeud(sf, u)}) rendu sous la condition « ${court(c.cond.getText(sf), 50)} » : il doit l'être hors de toute condition siteActive`)
  }
  const membre = (u) => (ts.isPropertyAccessExpression(u.parent) && u.parent.expression === u ? u.parent.name.text : null)
  const boutons = usages.filter((u) => ['bouton', 'lien'].includes(membre(u)))
  if (!boutons.some((u) => membre(u) === 'bouton')) echecs.push('le bouton SITE_A_LA_DEMANDE.bouton a disparu')
  for (const u of boutons) if (!gardePositive(conditionsDe(u), (n) => estActif(n, 'siteCommandeVente'))) echecs.push(`SITE_A_LA_DEMANDE.${membre(u)} (ligne ${ligneNoeud(sf, u)}) n'est pas sous actif('siteCommandeVente')`)
  // 4. « Supprimer le site », seulement si le site enregistré est actif
  const supprimer = []
  parcourir(sf, (n) => { if ((ts.isJsxText(n) || ts.isStringLiteralLike(n)) && apostrophes(n.text).includes('Supprimer le site')) supprimer.push(n) })
  if (!supprimer.length) echecs.push('« Supprimer le site » a disparu (025-05 : le garder, seulement si le site enregistré est actif)')
  else if (!etat.enregistres.size) echecs.push("aucun état enregistré du site : pas de variable d'état posée depuis a.site_active sans être changée par un geste")
  else for (const n of supprimer) if (!gardePositive(conditionsDe(n), lit(etat.enregistres))) echecs.push(`« Supprimer le site » (ligne ${ligneNoeud(sf, n)}) n'est pas sous une condition vraie sur l'état enregistré du site (${[...etat.enregistres].join(', ')})`)
  // 5. les composants ne sont pas supprimés, seulement leur usage ici (025-05 point 1) : rien d'autre ne les importe, le
  // typecheck ne verrait pas leur disparition
  for (const c of COMPOSANTS_GARDES) if (!fichierNonVide(path.join(racine, c))) echecs.push(`${c} supprimé ou vidé (025-05 : retirer seulement son usage dans /profil)`)
  // 6. les champs gardés
  for (const [nom, libelle, donnees, code] of GARDES) {
    const manque = []
    if (!libelle.test(rendu)) manque.push(`libellé ${libelle.source.replace(/\\/g, '')}`)
    for (const k of donnees) if (!cles.has(k)) manque.push(`clé ${k} de l'objet enregistré`)
    if (code && !code.test(src)) manque.push(code.source.replace(/\\/g, ''))
    if (manque.length) echecs.push(`${nom} a disparu : ${manque.join(', ')}`)
  }
  return {
    ok: !echecs.length, echecs,
    resume: `aucun des ${ABSENTS.length} marqueurs de l'éditeur ni des ${TITRES_RETIRES.length + 1} blocs retirés ; objet enregistré sans ${CLES_RETIREES.join(', ')} ; SITE_A_LA_DEMANDE rendu hors condition (${usages.length} usage(s)), bouton sous actif('siteCommandeVente') ; « Supprimer le site » sous ${[...etat.enregistres].join(', ')} ; ${GARDES.length} champs gardés présents ; les ${COMPOSANTS_GARDES.length} composants toujours là`,
  }
}

// ── CF-6 : l'aide ─────────────────────────────────────────────────────────────────────────────────────────────────────────
function textesDe(noeud) {
  const t = []
  parcourir(noeud, (n) => {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) t.push(n.text)
    else if (ts.isTemplateExpression(n)) t.push(n.head.text, ...n.templateSpans.map((x) => x.literal.text))
  })
  return t
}
const INTERDITS_AIDE = [['apparence', /apparence/], ['thème', /\bthemes?\b/], ['réalisations', /realisation/], ['niveau de site', /\bniveaux?\b/], ['« Rédiger ou régénérer le site »', /rediger ou regenerer|regenerer (le|votre) site/]]
function cf6(racine) {
  const f = path.join(racine, F.aide), src = lireTexte(f)
  if (!src || !src.trim()) return ko(`${F.aide} absent ou vide`)
  const echecs = []
  const sf = analyser(src, F.aide)
  const entrees = []
  parcourir(sf, (n) => { if (ts.isObjectLiteralExpression(n)) { const id = n.properties.find((p) => ts.isPropertyAssignment(p) && nomPropriete(p) === 'id'); if (id && ts.isStringLiteralLike(id.initializer) && id.initializer.text === 'profil') entrees.push(n) } })
  if (entrees.length !== 1) return ko(`${entrees.length} entrée(s) d'id 'profil' dans ${F.aide}, une attendue`)
  const e = entrees[0]
  const val = (k) => { const p = e.properties.find((x) => ts.isPropertyAssignment(x) && nomPropriete(x) === k); return p ? p.initializer : null }
  const texte = (k) => { const v = val(k); return v ? textesDe(v).join('') : '' }
  if (texte('page') !== '/profil') echecs.push(`page « ${texte('page')} », '/profil' attendue`)
  if (texte('titre').trim().length < 5) echecs.push('titre vide ou trop court')
  if (texte('aQuoiCaSert').trim().length < 20) echecs.push('aQuoiCaSert vide ou trop court (20 signes au moins)')
  const etapes = val('commentOnSenSert')
  const nEtapes = etapes && ts.isArrayLiteralExpression(etapes) ? etapes.elements.filter((x) => textesDe(x).join('').trim()).length : 0
  if (!nEtapes) echecs.push('commentOnSenSert sans étape')
  const tout = sansAccents(textesDe(e).join(' \n '))
  for (const [nom, re] of INTERDITS_AIDE) { const m = re.exec(tout); if (m) echecs.push(`l'entrée « profil » parle encore de ${nom} (« …${court(tout.slice(Math.max(0, m.index - 30), m.index + m[0].length + 30), 80)}… »)`) }
  // Les bulles encore citées par app/** existent encore (025-05 point 8).
  const cles = new Set()
  parcourir(sf, (n) => { if (ts.isPropertyAssignment(n) && nomPropriete(n) === 'cle' && ts.isStringLiteralLike(n.initializer)) cles.add(n.initializer.text) })
  const citees = new Map()
  for (const r of listerFichiers(path.join(racine, 'app'))) {
    if (!/\.tsx?$/.test(r)) continue
    const t = lireTexte(path.join(racine, 'app', r)) || ''
    for (const m of t.matchAll(/<Info\b[^>]*?\bcle=(?:"([^"]+)"|'([^']+)'|\{\s*['"`]([^'"`]+)['"`]\s*\})/g)) { const k = m[1] || m[2] || m[3]; if (!citees.has(k)) citees.set(k, `app/${r}`) }
  }
  const manquantes = [...citees].filter(([k]) => !cles.has(k))
  if (!citees.size) echecs.push('aucune bulle <Info cle=…> trouvée dans app/ : lecture impossible ?')
  if (manquantes.length) echecs.push(`${manquantes.length} bulle(s) citée(s) par app/ mais absente(s) de ${F.aide} : ${manquantes.slice(0, 4).map(([k, fi]) => `${k} (${fi})`).join(', ')}`)
  return { ok: !echecs.length, echecs, resume: `entrée « profil » (ligne ${ligneNoeud(sf, e)}, ${nEtapes} étape(s)) sans apparence, thème, réalisations, niveau ni « Rédiger ou régénérer le site » ; ${citees.size} bulles citées par app/, toutes dans ${F.aide} (${cles.size} bulles)` }
}

// ── CF-7 : la promesse de :309 ────────────────────────────────────────────────────────────────────────────────────────────
async function cf7(racine) {
  const src = lireTexte(path.join(racine, F.profil))
  if (!src || !src.trim()) return ko(`${F.profil} absent ou vide`)
  const phrases = phrasesMoinsUneMinute(src)
  const fautives = phrases.filter((p) => !p.ok)
  const echecs = fautives.map((p) => `ligne ${p.ligne} : « ${court(p.phrase, 130)} » — ni « prête » ni « prépare » dans la phrase (PR-1)`)
  // la règle PR-1 elle-même (fiche : « passe la règle PR-1 de promesses-qa.mjs ») : son détecteur lit aussi les autres graphies
  // (motif coupé par une balise, [..].join, lettres d'un autre alphabet, invisibles), que la copie ci-dessus ne voit pas
  const { pr1Fichier } = await import('./promesses-qa.mjs')
  const pr1 = pr1Fichier(racine, F.profil)
  for (const v of pr1.violations) echecs.push(`PR-1 de promesses-qa : ligne ${v.ligne} [${v.motif}] « ${court(v.phrase, 110)} »`)
  for (const e of pr1.erreurs) echecs.push(`PR-1 de promesses-qa : ${e}`)
  if (!pr1.ok && !pr1.violations.length && !pr1.erreurs.length) echecs.push('PR-1 de promesses-qa : aucune phrase lue')
  if (echecs.length) return ko(...echecs)
  return { ok: true, echecs: [], resume: `${phrases.length ? `${phrases.length} phrase(s) « moins d'une minute », chacune avec « prête » ou « prépare » : ${phrases.map((p) => `ligne ${p.ligne} « ${court(p.phrase, 90)} »`).join(' ; ')}` : "aucune phrase « moins d'une minute » (trois graphies cherchées)"} ; PR-1 de promesses-qa.mjs vert sur ${F.profil} (${pr1.phrases} phrases)` }
}

// ── CF-8 : npm run typecheck ──────────────────────────────────────────────────────────────────────────────────────────────
function nodeModulesAtteignable(racine) {
  for (let d = path.resolve(racine); ; d = path.dirname(d)) {
    if (fichierNonVide(path.join(d, 'node_modules', 'typescript', 'package.json'))) return path.join(d, 'node_modules')
    if (path.dirname(d) === d) return null
  }
}
function cf8(racine) {
  const echecs = []
  const nm = nodeModulesAtteignable(racine)
  if (!nm) return ko(`aucun node_modules/typescript dans ${racine} ni ses parents : npm run typecheck ne peut pas tourner`)
  let script = null
  try { script = JSON.parse(lireTexte(path.join(racine, 'package.json')) || '{}').scripts?.typecheck ?? null } catch (e) { return ko(`package.json illisible : ${premiereLigne(e)}`) }
  if (!script || !/\btsc\b/.test(script)) return ko(`script typecheck « ${script} » : tsc attendu`)
  if (!fichierNonVide(path.join(racine, 'tsconfig.json'))) return ko('tsconfig.json absent ou vide')
  const D = exigerSousTravail(path.join(TRAVAIL, JUGE, 'tsc'))
  fs.mkdirSync(D, { recursive: true })
  const info = path.join(D, `${sha256(Buffer.from(path.resolve(racine).toLowerCase())).slice(0, 16)}.tsbuildinfo`)
  const t0 = Date.now()
  // Une seule chaîne de commande : shell: true pour npm.cmd sous Windows, et des arguments séparés déclencheraient DEP0190.
  const r = lancer(`npm run typecheck -- --tsBuildInfoFile "${info}" --listFiles`, [], { cwd: racine, shell: true, timeout: 900_000 })
  const duree = ((Date.now() - t0) / 1000).toFixed(1)
  const lignes = `${r.stdout}\n${r.stderr}`.split(/\r?\n/)
  const erreurs = lignes.filter((l) => /error TS\d+/.test(l))
  if (r.code !== 0 || erreurs.length) echecs.push(`npm run typecheck en code ${r.code}${r.erreur ? ` (${r.erreur})` : ''}, ${erreurs.length} erreur(s) TS : ${erreurs.slice(0, 3).map((l) => court(l, 140)).join(' | ') || court(r.derniereLigne, 140)}`)
  const fichiers = lignes.map((l) => l.trim()).filter((l) => /\.(?:d\.)?[cm]?tsx?$/.test(l) && path.isAbsolute(l))
  const dansRacine = fichiers.filter((x) => sous(racine, x) && !/[\\/]node_modules[\\/]/.test(x))
  const cle = (p) => path.resolve(p).toLowerCase()
  const vus = new Set(fichiers.map(cle))
  if (dansRacine.length < 100) echecs.push(`${dansRacine.length} fichier(s) de la racine dans le programme vérifié (--listFiles), 100 au moins attendus`)
  for (const x of [F.flags, F.route, F.profil, F.aide]) if (!vus.has(cle(path.join(racine, x)))) echecs.push(`${x} absent du programme vérifié (--listFiles)`)
  const es5 = fichiers.find((x) => /typescript[\\/]lib[\\/]lib\.es5\.d\.ts$/i.test(x))
  if (!es5 || !sous(nm, es5)) echecs.push(`lib.es5.d.ts ${es5 ? `pris dans ${es5}` : 'absent'}, ${nm} attendu`)
  for (const x of [F.flags, F.route, F.profil, F.aide]) {
    const t = lireTexte(path.join(racine, x)) ?? ''
    if (/@ts-nocheck/.test(t)) echecs.push(`${x} porte @ts-nocheck`)
    const n = (s) => (s.match(/@ts-(?:ignore|expect-error)/g) || []).length
    const base = baseDe(racine, x, t)
    if (base.texte !== null && n(t) > n(base.texte)) echecs.push(`${x} : ${n(t)} @ts-ignore/@ts-expect-error, ${n(base.texte)} dans ${base.nom}`)
  }
  for (const x of defautsTypecheck(racine)) echecs.push(x)
  return { ok: !echecs.length, echecs, resume: `npm run typecheck vert en ${duree} s : ${dansRacine.length} fichiers de la racine vérifiés, dont les quatre de 025-05 ; tsc et types de ${rel(nm)} ; aucun @ts-nocheck ni @ts-ignore ajouté ; tsconfig.json et script typecheck ceux de ${REFERENCE_COMMIT}` }
}

// ── L'arbre témoin ────────────────────────────────────────────────────────────────────────────────────────────────────────
function construireTemoin() {
  const ref = extraireReference()
  const dest = preparerTemoin(JUGE, { base: ref.dest, copier: TEMOIN_COPIER, superposer: null })
  if (path.resolve(dest) !== path.resolve(TEMOIN_DOSSIER)) throw new Error(`témoin préparé dans ${dest}, ${TEMOIN_DOSSIER} attendu`)
  const poses = []
  for (const r of [...listerFichiers(TEMOIN_FIXTURES)].sort()) {
    if (!r.endsWith('.temoin')) continue
    const cible = r.slice(0, -'.temoin'.length), src = path.join(TEMOIN_FIXTURES, r), dst = path.join(dest, cible)
    if (!fichierNonVide(src)) throw new Error(`témoin ${r} vide`)
    if (!fs.existsSync(dst)) throw new Error(`témoin ${r} : ${cible} n'existe pas dans la référence`)
    if (normEol(fs.readFileSync(src, 'utf8')) === normEol(fs.readFileSync(dst, 'utf8'))) throw new Error(`témoin ${r} identique à la référence`)
    fs.copyFileSync(src, dst)
    poses.push(cible)
  }
  const attendus = Object.values(F).sort()
  if (poses.sort().join('|') !== attendus.join('|')) throw new Error(`fichiers témoins : ${poses.join(', ') || 'aucun'} ; ${attendus.join(', ')} attendus`)
  fs.writeFileSync(`${dest}.json`, `${JSON.stringify({ commit: ref.commit, base: rel(ref.dest), fichiers: poses, par: 'scripts/constructeur-ferme-qa.mjs --temoin' }, null, 1)}\n`)
  return { dest, commit: ref.commit, poses, reutilise: ref.reutilise }
}

// ── Principal ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function principal() {
  const o = lireOptionsOuQuitter(process.argv.slice(2))
  if (o.reel) { console.error(`✗ ${JUGE} n'a pas de mode --reel : tout est statique`); process.exit(2) }
  if (o.temoin && !o.racineParDefaut) { console.error(`✗ --temoin construit son arbre sur la référence ${REFERENCE_COMMIT} : ne pas le combiner avec --racine`); process.exit(2) }
  if (o.positionnels.length) { console.error(`✗ argument(s) inattendu(s) : ${o.positionnels.join(' ')}`); process.exit(2) }
  const racine = o.temoin ? TEMOIN_DOSSIER : o.racine
  const s = creerSortie(JUGE, IDS, { racine, temoin: o.temoin })
  await s.executer(async () => {
    if (o.temoin) {
      const t = construireTemoin()
      s.note(`témoin : référence ${t.commit.slice(0, 7)} (${t.reutilise ? 'arbre réutilisé' : 'arbre extrait'}) réduite à ${TEMOIN_COPIER.join(', ')}, puis ${t.poses.length} fichiers de ${rel(TEMOIN_FIXTURES)}/*.temoin : ${t.poses.join(', ')}`)
    }
    const b = baseDe(racine, F.fermeture, lireTexte(path.join(racine, F.fermeture)))
    s.note(`base des diffs : ${b.nom}${b.git ? ' (git diff, lecture seule)' : ` (blob de ${b.rev.slice(0, 7)})`}`)
    const juges = { 'CF-1': cf1, 'CF-2': cf2, 'CF-3': cf3, 'CF-4': cf4, 'CF-5': cf5, 'CF-6': cf6, 'CF-7': cf7, 'CF-8': cf8 }
    for (const id of IDS) {
      try { s.resultat(id, await juges[id](racine)) } catch (e) { s.echoue(id, `exception : ${premiereLigne(e)}`) }
    }
  })
}

export { cf1, cf2, cf3, cf4, cf5, cf6, cf7, cf8, construireTemoin, baseDe }

const pareil = (a, b) => (process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b)
if (process.argv[1] && pareil(path.resolve(process.argv[1]), fileURLToPath(import.meta.url))) await principal()
