// scripts/promesses-qa.mjs — le juge des promesses (fiche 025-06, et 025-05 pour /profil), cahier : .orchestre/brouillons-ecosysteme/
// 025-01.md, point 8. Écrit par Claude Code ; aucun exécutant n'y touche (règle 1 de CLAUDE.md:23).
//
// Le juge lit le texte des fichiers .ts et .tsx de app/** et lib/** sous --racine (défaut : la racine du dépôt), par PHRASE. Il ne
// cherche pas dans le fichier brut : il le parse avec le compilateur TypeScript (node_modules/typescript) et en tire les « unités
// de texte » que l'écran, les métadonnées ou le lecteur du code voient :
//   - chaque élément JSX racine (ses enfants mis bout à bout selon la règle d'espaces de JSX ; <b>, <em>, <a>, <Link>… sont en
//     ligne ; <p>, <div>, <li>, <h1>…, <button>, <br>… et tout composant qui a des enfants coupent la phrase) ; une expression
//     {…} qui ne contient que des chaînes est remplacée par chacune de ses valeurs possibles tour à tour ({x ? 'Studio' :
//     'Signature'} donne une variante « Studio » et une variante « Signature » ; {x && ', prête'} en donne une sans rien) ;
//   - chaque chaîne ('…', "…", `…`), gabarit `…${…}…` et concaténation '…' + '…', sa valeur cuite (’ → ’) ;
//   - chaque commentaire (// consécutifs réunis, /* … */), ce que la fiche vise aussi (l'exception « commentaire » de PR-2) ;
// puis décode les entités HTML (&apos;, &#39;, &rsquo;, &nbsp;…), ramène les trois graphies de l'apostrophe (', ’, &apos;, et
// aussi ʼ ‘ ´) à ’, les espaces insécables et fines à une espace, retire les caractères invisibles (U+00AD, U+200B-D, U+2060,
// U+FEFF, U+180E), normalise en NFKC et ramène au latin les lettres cyrilliques et grecques de forme latine (commun.mjs,
// replier : « mоins » avec un о cyrillique est lu « moins »). Une phrase finit à . ! ? … suivi d'une espace, ou à une coupure
// (bloc JSX, ligne vide). Une phrase ne déborde jamais d'une chaîne sur la suivante : le titre et la description de
// app/layout.tsx sont deux unités. Mais un motif de PR-1 ou PR-2 COUPÉ par une coupure (« moins d’une<br />minute », « moins
// d’une <Mot>minute</Mot> ») est un défaut en soi : il est dans le texte de l'unité mis bout à bout sans être dans aucune de ses
// phrases. [a, b].join(sep) est assemblé comme une concaténation (en JSX et hors JSX).
//
//   PR-1  aucune phrase ne contient « moins d'une minute » (et, choix du juge, ses synonymes « moins d'1 minute », « moins de 60
//         / soixante secondes ») sans « prête(s) » ou « prépar… » dans la même phrase. Exception : lib/platStats.ts (la médiane
//         mesurée, affichée seulement sous 60 s).
//   PR-2  aucune phrase ne contient « dans la seconde ». Exceptions, resserrées par le juge sur ce que la fiche nomme : dans
//         lib/aide.ts, la phrase du test de notification (elle contient « notification ») ; dans app/api/account/delete/route.ts,
//         un commentaire.
//   PR-3  aucune unité ne contient « Présence en ligne soignée », « Inclus dès Studio », « Inclus dès Signature » ou « Inclus dans
//         l'offre Signature » (casse ignorée, apostrophes ramenées) ; et, sur la ligne source (entités décodées), « Inclus dès »
//         ou « Inclus dans l'offre » suivi plus loin sur la ligne de studio / signature (PLANS.studio.label, ${…}).
//   PR-4  aucune phrase où Presti, l'assistant ou l'IA « répond » (répond, répondre, répondra, répondrait, répondu…) seul, tout
//         seul, automatiquement ou à votre place sans nommer Studio ou Signature. Choix du juge : le complément est cherché
//         après le verbe dans la même proposition (jusqu'à « : ; — – ( ) « » », « et », « ou », « mais », « puis », « car »,
//         « sinon », 12 mots au plus ; les virgules et « jour et nuit » ne coupent pas), ou juste avant (tout seul, automatiquement, à votre place,
//         6 mots) ; « seul » précédé d'un article (« une seule question ») n'est pas le complément ; un verbe nié (« ne répond
//         pas », « n'y répond ») n'est pas une promesse. « Nommer » : Studio ou Signature (majuscule : « la signature » du devis
//         n'en est pas une) dans la phrase ; pour une chaîne valeur d'un objet, aussi sa clé ou celle de l'objet (studio:,
//         signature:) ou une valeur sœur (label: 'Studio') — c'est le cas de l'accroche de lib/plans.ts. Exception unique : la
//         description du mode « auto » de app/plateforme/Reglages.tsx (ligne qui porte id: 'auto'), tant que ce fichier verrouille
//         ce mode par l'offre (peut(plan, 'plateforme.ia.auto')) : l'écran affiche alors l'offre requise.
//   PR-5  app/layout.tsx : chaque titre de l'objet metadata (title, ou son default / absolute ; pas template) fait 70 signes au plus
//         et n'est pas vide ; ses descriptions (metadata.description, obligatoire ; openGraph / twitter s'il y en a) 160 au plus,
//         non vides. app/page.tsx et app/manifest.ts : au moins une description chacun, et chacune de 160 signes au plus, non
//         vide. Les valeurs sont résolues dans le fichier (constantes, gabarits, concaténations) ; une valeur qu'on ne peut pas
//         résoudre est un échec. Signes = points de code après NFC.
//   PR-6  lib/plans.ts : tout le fichier, fins de ligne ramenées à LF, est identique à HEAD (racine d'un dépôt) ou au commit de
//         l'arbre extrait (<racine>.json, sinon HEAD du dépôt), hors la chaîne accroche de la propriété studio de PLANS, qui peut
//         changer (et doit rester une chaîne littérale non vide). Rien n'exige qu'elle ait changé : après le commit de 025-06,
//         HEAD la porte (PR-3 exige déjà que « Présence en ligne soignée » s'en aille).
//
// Substance (aucun critère ne passe sur du vide) : PR-1 à PR-4 échouent si app/ ou lib/ manque, si un fichier .ts/.tsx ne se
// parse pas, si un des fichiers que les fiches nomment est absent ou vide, ou si l'un d'eux a perdu plus de la moitié de ses
// phrases de prose par rapport au commit de référence (le profil : plus des deux tiers, 025-05 y retire l'éditeur). Chaque
// détecteur est de plus éprouvé à chaque lancement sur des sondes écrites ici (phrases fautives qu'il doit voir, phrases justes
// qu'il doit laisser) : un détecteur aveugle fait échouer son critère.
// Mise à jour du 27/09 (000-geo-presti) : les questions et réponses de la FAQ ont quitté app/faq/page.tsx pour lib/faq.ts, source
// partagée par /faq et par le FAQPage (JSON-LD) de l'accueil. La prose d'un fichier surveillé compte donc aussi celle de ses
// sources de texte (SOURCES_DE_TEXTE : app/faq/page.tsx → lib/faq.ts), phrases distinctes sur l'ensemble, mais SEULEMENT si le
// fichier importe la source (import de valeur) ET s'en sert hors de l'import (sourcesUtilisees) : un module orphelin ne montre
// rien, une page vidée qui ne le lit plus reste un défaut, comme avant. La référence reste la page seule à 1620723.
//
// --temoin : l'arbre témoin de l'état « après ». Le juge extrait app/ et lib/ du commit de référence (git archive, rien n'est
// écrit dans .git) dans .orchestre/travail/promesses-qa/temoin/, y applique les corrections de
// scripts/fixtures/025/temoins/promesses-qa/corrections.json (chaque « ancien » doit s'y trouver une fois, et chaque fichier
// corrigé doit être dans le périmètre de 025-05 ou de 025-06 : le témoin prouve que ces deux fiches suffisent à passer), marque
// l'arbre du commit (temoin.json), puis juge PR-1 à PR-8 sur cet arbre (025-15 y est simulée : scène du héros réécrite,
// landingVideo baissé). --temoin ne prend pas --racine.
//
//   PR-7  (relecture à froid du 24/09, G2) la landing (app/page.tsx et les composants de app/ qu'il importe, trois niveaux ;
//         commentaires exclus : ce que l'écran montre) ne dit ni « réponse en direct », ni « répondu en N s » (répond, réponse…
//         en / sous / après N s, secondes, min), ni « dans la seconde », ni un engagement de date dans une réponse montrée (je,
//         j’, nous, on + rappeler, passer, venir, intervenir, envoyer, répondre… + aujourd’hui, demain, ce soir, dans la journée,
//         dans l’heure, sous N, un jour de la semaine, à N h…) ; et un composant de app/ qui montre une demande contenant un mot
//         d'escalade par défaut (escalade_mots de <racine>/lib/plateformeConfig.ts : « fuite », « urgence »…) dit aussi que
//         l'artisan est alerté (alerte, escalade, prévenu) : sur ces mots, Presti ne répond pas seul. Détecteur éprouvé sur des
//         sondes (fautes vues, scènes justes laissées).
//   PR-8  (G1) la vidéo de la landing : les composants que FLAGS.landingVideo met à l'écran (branche vraie d'une condition sur le
//         drapeau, et app/DemoVideo.tsx) et les vidéos qu'ils citent (/demo/hero.mp4) ; affichée si landingVideo n'est pas
//         littéralement false (lib/flags.ts, arbre syntaxique) ou si un de ces composants est rendu hors d'une condition vraie sur
//         landingVideo. Affichée, chaque vidéo /x/y.mp4 doit avoir public/x/y.textes.json { video: "public/x/y.mp4", sha256 (du
//         fichier actuel : une vidéo refilmée se relit), textes: [les textes incrustés] }, et chaque texte passe PR-1, PR-2, PR-4
//         et PR-7. Sans ce fichier, la vidéo actuelle impose landingVideo = false. Détecteur éprouvé sur des sondes.
//
// PR-9 à PR-12 : revue avant mise en ligne du 25/09 (.orchestre/preuves/025-relectures/revue-avant-mise-en-ligne-2026-09-25.md),
// fiche 025-20, écrits par Claude Code.
//   PR-9  (D14) dans app/faq/page.tsx, chaque unité qui dit ce que vaut un crédit (« 1 crédit = … ») dit aussi ce que coûte le modèle
//         Expert : « Expert » et « N crédits » (ou « en consomme N »), N = CREDIT_COST.expert de <racine>/lib/plans.ts — comme la
//         landing. Et aucune phrase de app/page.tsx ni de la FAQ ne donne au modèle Expert un autre coût. Détecteur éprouvé.
//         Mise à jour du 27/09 (000-geo-presti) : la FAQ, c'est app/faq/page.tsx et les sources de texte qu'elle importe et lit
//         (lib/faq.ts) ; « la FAQ dit encore ce que vaut un crédit » ne compte que ces fichiers-là. La règle « 1 crédit = … dit
//         aussi le coût Expert » et l'interdit d'un autre coût Expert portent sur la page, app/page.tsx ET lib/faq.ts même si la
//         page cessait de l'importer (l'accueil le lit aussi, dans son FAQPage).
//   PR-10 (D16) aucune phrase de app/** ni de lib/** (commentaires exclus) ne dit que les relances vont « jusqu’à la réponse » (ou
//         « jusqu’à leur réponse », « jusqu’à ce que … ») : elles s'arrêtent après CADENCE_RELANCES (<racine>/lib/relances.ts) ; et
//         une phrase qui compte les relances (« trois relances ») dit ce nombre. Détecteur éprouvé.
//   PR-11 (D15) l'article d'aide « plateforme » (<racine>/lib/aide.ts, chargé) ne propose le mode Automatique qu'avec l'offre qui
//         le permet : chaque texte qui nomme ce mode (« automatique », pas « automatiquement ») nomme aussi la première offre où
//         peut(plan, 'plateforme.ia.auto') est vrai (<racine>/lib/plans.ts, chargé : « Studio »). Détecteur éprouvé.
//   PR-12 (D17) un texte de l'aide (ARTICLES de <racine>/lib/aide.ts) qui promet la suppression d'un site renvoie vers Paramètres →
//         « Données & confidentialité », où app/parametres/SectionDonnees.tsx propose « Supprimer le site » sans condition (et ce
//         bouton y est toujours) ; « Données & suppressions » (/profil) ne l'affiche que pour un site publié. Détecteur éprouvé.
//
// Sortie : une ligne par critère (PASS/FAIL PR-n — …), code 0 seulement si les douze sont verts ; le relevé complet des phrases en
// défaut est écrit dans .orchestre/travail/promesses-qa/releve.txt (releve-temoin.txt pour le témoin).
//
// API (pour constructeur-ferme-qa.mjs, CF-7) : pr1Fichier(racine, 'app/profil/page.tsx') → { ok, violations, phrases } ;
// examinerTexte([{ chemin, source }]) ; unitesDeTexte(chemin, source) ; examinerMeta ; comparerPlans ; construireTemoin.
//
// Usage : node scripts/promesses-qa.mjs [--racine=<dossier>] | node scripts/promesses-qa.mjs --temoin
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import {
  R, FIXTURES, TRAVAIL, REFERENCE_COMMIT, lireOptionsOuQuitter, creerSortie, git, estRacineGit, blobGit, commitDeReference,
  listerFichiers, dossierTravail, extraireTar, exigerSousTravail, revParse, lireJson, sous, replier,
} from './fixtures/025/commun.mjs'

const JUGE = 'promesses-qa'
const IDS = ['PR-1', 'PR-2', 'PR-3', 'PR-4', 'PR-5', 'PR-6', 'PR-7', 'PR-8', 'PR-9', 'PR-10', 'PR-11', 'PR-12']
const PARA = '\u2029' // coupure de phrase interne (bloc JSX, ligne vide, expression qui contient du JSX)
const court = (s, n = 150) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t }
const premiereLigne = (e) => String((e && e.message) || e).split('\n')[0].slice(0, 300)

// Les fichiers que les fiches nomment (relevé de 025-06, /profil de 025-05, les exceptions) : présents, non vides, avec leur prose.
export const SURVEILLES = [
  'app/layout.tsx', 'app/page.tsx', 'app/faq/page.tsx', 'app/dashboard/page.tsx', 'app/manifest.ts', 'app/DemoSequence.tsx',
  'lib/plans.ts', 'app/profil/page.tsx', 'lib/aide.ts', 'lib/platStats.ts', 'app/api/account/delete/route.ts',
  'app/HeroApp.tsx', // 025-15 (relecture à froid du 24/09) : la scène est réécrite, pas vidée
]
// Les sources de texte d'un fichier surveillé (000-geo-presti, 27/09) : le texte de la FAQ vit dans lib/faq.ts, lu par /faq et par le
// FAQPage de l'accueil. Comptées avec le fichier seulement s'il les importe et s'en sert (sourcesUtilisees).
export const SOURCES_DE_TEXTE = { 'app/faq/page.tsx': ['lib/faq.ts'] }
/** Les sources de SOURCES_DE_TEXTE[chemin] que `source` importe (import de valeur) ET utilise hors de l'import → [chemins] */
export function sourcesUtilisees(chemin, source) {
  const attendues = SOURCES_DE_TEXTE[chemin] || []
  if (!attendues.length || !source) return []
  const sf = ts.createSourceFile(chemin, source, ts.ScriptTarget.Latest, true, /\.tsx$/.test(chemin) ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const out = []
  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier) || !st.importClause || st.importClause.isTypeOnly) continue
    const spec = st.moduleSpecifier.text
    const base = spec.startsWith('@/') ? spec.slice(2) : spec.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(chemin), spec)) : null
    const cible = base && attendues.find((a) => [a, a.replace(/\.tsx?$/, ''), a.replace(/\/index\.tsx?$/, '')].includes(base))
    if (!cible) continue
    const ic = st.importClause, noms = new Set()
    if (ic.name) noms.add(ic.name.text)
    if (ic.namedBindings && ts.isNamespaceImport(ic.namedBindings)) noms.add(ic.namedBindings.name.text)
    else if (ic.namedBindings) for (const el of ic.namedBindings.elements) if (!el.isTypeOnly) noms.add(el.name.text)
    let lue = false
    const visite = (n) => {
      if (lue || ts.isImportDeclaration(n)) return
      // un nom lu comme valeur : ni la propriété de `x.nom`, ni une clé d'objet, ni une position de type
      if (ts.isIdentifier(n) && noms.has(n.text) && !(ts.isPropertyAccessExpression(n.parent) && n.parent.name === n) && !(ts.isPropertyAssignment(n.parent) && n.parent.name === n) && !ts.isTypeQueryNode(n.parent)) { lue = true; return }
      ts.forEachChild(n, visite)
    }
    visite(sf)
    if (lue && !out.includes(cible)) out.push(cible)
  }
  return out
}
// Part minimale des phrases de prose gardées par rapport au commit de référence.
const PART_MIN = { 'app/profil/page.tsx': 1 / 3 }
const PART_DEFAUT = 1 / 2
// Périmètres de 025-05 et 025-06 (brouillons du 24/09) : les seuls fichiers que les corrections du témoin ont le droit de toucher.
export const PERIMETRES = new Set([
  'app/profil/page.tsx', 'app/api/site/generate/route.ts', 'lib/flags.ts', 'lib/aide.ts', // 025-05
  'app/layout.tsx', 'app/page.tsx', 'app/faq/page.tsx', 'app/dashboard/page.tsx', 'app/manifest.ts', 'app/DemoSequence.tsx', 'lib/plans.ts', // 025-06
  'app/HeroApp.tsx', // 025-15 (lib/flags.ts, son autre fichier, est déjà dans 025-05)
])
const CORRECTIONS = path.join(FIXTURES, 'temoins', JUGE, 'corrections.json')

// ── Normalisation du texte ────────────────────────────────────────────────────────────────────────────────────────────────
const ENTITES = {
  apos: '\'', quot: '"', amp: '&', lt: '<', gt: '>', nbsp: '\u00a0', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', laquo: '«',
  raquo: '»', hellip: '…', mdash: '—', ndash: '–', thinsp: '\u2009', ensp: '\u2002', emsp: '\u2003', shy: '\u00ad', zwj: '\u200d',
  zwnj: '\u200c', eacute: 'é', egrave: 'è', ecirc: 'ê', euml: 'ë', agrave: 'à', acirc: 'â', auml: 'ä', ccedil: 'ç', ocirc: 'ô',
  ouml: 'ö', ucirc: 'û', ugrave: 'ù', uuml: 'ü', icirc: 'î', iuml: 'ï', oelig: 'œ', aelig: 'æ', euro: '€', middot: '·', bull: '•',
  prime: '′', rarr: '→', larr: '←', deg: '°', times: '×', copy: '©', reg: '®', trade: '™', sup2: '²',
}
export function decoderEntites(t) {
  return String(t).replace(/&(#[xX][0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]*);/g, (m, c) => {
    if (c[0] === '#') {
      const n = c[1] === 'x' || c[1] === 'X' ? parseInt(c.slice(2), 16) : parseInt(c.slice(1), 10)
      try { return String.fromCodePoint(n) } catch { return m }
    }
    return ENTITES[c] ?? ENTITES[c.toLowerCase()] ?? m
  })
}
/** Texte pour la comparaison : entités décodées, NFC, invisibles retirés, espaces spéciales → espace, apostrophes → ’, espaces réduites. */
export function normaliser(t) {
  // replier (commun.mjs) : NFKC, invisibles ôtés, lettres cyrilliques et grecques de forme latine ramenées au latin (« mоins »)
  return replier(decoderEntites(t))
    .replace(/[\u00ad\u200b\u200c\u200d\u2060\ufeff]/g, '')
    .replace(/[\u00a0\u202f\u2000-\u200a\u3000\t\r\n\f\v]/g, ' ')
    .replace(/['\u2019\u02bc\u2018\u00b4\u2032]/g, '’')
    .replace(/ {2,}/g, ' ')
}

// ── Unités de texte d'un fichier ──────────────────────────────────────────────────────────────────────────────────────────
// Éléments JSX en ligne (tout le reste, et tout composant qui a des enfants hors Link, coupe la phrase).
const EN_LIGNE = new Set(['a', 'abbr', 'b', 'bdi', 'bdo', 'cite', 'code', 'data', 'dfn', 'em', 'i', 'kbd', 'mark', 'q', 's', 'samp', 'small', 'span', 'strong', 'sub', 'sup', 'time', 'u', 'var', 'wbr', 'del', 'ins', 'Link', 'Fragment', 'React.Fragment', ''])
const deballer = (e) => {
  while (e && (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || ts.isTypeAssertionExpression(e) || ts.isNonNullExpression(e) || (ts.isSatisfiesExpression && ts.isSatisfiesExpression(e)))) e = e.expression
  return e
}
const uniq = (l) => [...new Set(l)]
/** Variantes linéaires d'une suite de listes d'alternatives : la suite des premières, puis chaque autre alternative à sa place. */
function combiner(listes, max = 64) {
  const base = listes.map((l) => l[0])
  const out = [base]
  listes.forEach((l, i) => { for (let k = 1; k < l.length && out.length < max; k++) { const v = base.slice(); v[i] = l[k]; out.push(v) } })
  return out
}
const contientJsx = (n) => { let oui = false; const r = (x) => { if (oui) return; if (ts.isJsxElement(x) || ts.isJsxSelfClosingElement(x) || ts.isJsxFragment(x)) { oui = true; return } ts.forEachChild(x, r) }; r(n); return oui }
const estChaine = (n) => ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)

/** Les valeurs de texte possibles d'une expression (chaînes cuites) ; marque dans `inl` les nœuds de chaîne ainsi absorbés. */
function alternatives(expr, inl) {
  const e = deballer(expr)
  if (!e) return ['']
  if (estChaine(e)) { inl.add(e); return [e.text] }
  if (ts.isTemplateExpression(e)) { inl.add(e); return variantesGabarit(e, inl) }
  if (ts.isConditionalExpression(e)) return uniq([...alternatives(e.whenTrue, inl), ...alternatives(e.whenFalse, inl)])
  if (ts.isBinaryExpression(e)) {
    const k = e.operatorToken.kind
    if (k === ts.SyntaxKind.AmpersandAmpersandToken) return uniq([...alternatives(e.right, inl), ''])
    if (k === ts.SyntaxKind.BarBarToken || k === ts.SyntaxKind.QuestionQuestionToken) return uniq([...alternatives(e.left, inl), ...alternatives(e.right, inl)])
    if (k === ts.SyntaxKind.PlusToken) return uniq(combiner([alternatives(e.left, inl), alternatives(e.right, inl)]).map((v) => v.join('')))
  }
  if (ts.isNumericLiteral(e)) return [e.text]
  // ['en moins', 'd’une', 'minute'].join(' ') : les éléments assemblés, pas chacun à part
  if (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && e.expression.name.text === 'join' && ts.isArrayLiteralExpression(deballer(e.expression.expression))) {
    const sep = e.arguments.length ? alternatives(e.arguments[0], inl)[0] : ','
    const elements = deballer(e.expression.expression).elements.map((x) => alternatives(x, inl))
    return uniq(combiner(elements).map((v) => v.join(sep)))
  }
  const lits = []
  const rec = (n) => {
    if (estChaine(n)) { inl.add(n); lits.push(n.text) } else if (ts.isTemplateExpression(n)) { inl.add(n); lits.push(...variantesGabarit(n, inl)) } else ts.forEachChild(n, rec)
  }
  rec(e)
  return lits.length ? uniq([...lits, '']) : ['']
}
function variantesGabarit(t, inl) {
  const listes = [[t.head.text]]
  for (const sp of t.templateSpans) { listes.push(alternatives(sp.expression, inl)); listes.push([sp.literal.text]) }
  return uniq(combiner(listes).map((v) => v.join('')))
}
/** Nettoyage d'un texte JSX, règle de Babel (cleanJSXElementLiteralChild) : lignes rognées, lignes vides retirées, jointes d'une espace. */
function nettoyerTexteJsx(v) {
  const lignes = v.split(/\r\n|\n|\r/)
  let derniere = 0
  lignes.forEach((l, i) => { if (/[^ \t]/.test(l)) derniere = i })
  let s = ''
  lignes.forEach((l, i) => {
    let t = l.replace(/\t/g, ' ')
    if (i !== 0) t = t.replace(/^ +/, '')
    if (i !== lignes.length - 1) t = t.replace(/ +$/, '')
    if (t) { if (i !== derniere) t += ' '; s += t }
  })
  return s
}
/** Morceaux d'une chaîne : une ligne source chacun, ligne vide → coupure. */
function morceauxChaine(texte, ligne) {
  const out = []
  String(texte).split(/\r\n|\n|\r/).forEach((l, i, tout) => {
    if (!l.trim() && i > 0 && i < tout.length - 1) out.push({ t: PARA, ligne: ligne + i })
    else out.push({ t: normaliser(l) + (i < tout.length - 1 ? ' ' : ''), ligne: ligne + i })
  })
  return out
}
/** Le contexte d'une chaîne valeur d'un objet : sa clé, la clé de l'objet, les chaînes sœurs. */
function contexteObjet(n) {
  const p = n.parent
  if (!p || !ts.isPropertyAssignment(p) || p.initializer !== n) return null
  const cle = (x) => (x && x.name && (ts.isIdentifier(x.name) || ts.isStringLiteral(x.name)) ? x.name.text : '')
  const obj = p.parent
  const cles = [cle(p)]
  const valeurs = []
  if (obj && ts.isObjectLiteralExpression(obj)) {
    if (obj.parent && ts.isPropertyAssignment(obj.parent)) cles.push(cle(obj.parent))
    for (const q of obj.properties) if (q !== p && ts.isPropertyAssignment(q) && estChaine(deballer(q.initializer))) valeurs.push(deballer(q.initializer).text)
  }
  return { cles, valeurs }
}

/**
 * Les unités de texte d'un fichier .ts/.tsx. → { unites: [{ genre, ligne, variantes: [[{ t, ligne }]], contexte }], erreurs, sf }
 * genre : 'jsx' | 'chaine' | 'gabarit' | 'concat' | 'commentaire'.
 */
export function unitesDeTexte(chemin, source) {
  const kind = /\.tsx$/i.test(chemin) ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const sf = ts.createSourceFile(chemin, source, ts.ScriptTarget.Latest, true, kind)
  const ligneDe = (pos) => sf.getLineAndCharacterOfPosition(Math.max(0, Math.min(pos, source.length))).line + 1
  const unites = []
  const inl = new Set()
  const textesJsx = []
  const nomBalise = (n) => (ts.isJsxFragment(n) ? '' : (ts.isJsxElement(n) ? n.openingElement.tagName : n.tagName).getText(sf))
  const coupe = (n) => { const nom = nomBalise(n); return !EN_LIGNE.has(nom) }

  function segmentsJsx(n, segs) {
    const bloc = coupe(n)
    if (ts.isJsxSelfClosingElement(n)) { segs.push([[{ t: bloc && !/^[A-Z]/.test(nomBalise(n)) ? PARA : ' ', ligne: ligneDe(n.getStart(sf)) }]]); return }
    if (bloc) segs.push([[{ t: PARA, ligne: ligneDe(n.getStart(sf)) }]])
    for (const ch of n.children) {
      if (ch.kind === ts.SyntaxKind.JsxText) {
        textesJsx.push([ch.pos, ch.end])
        const t = nettoyerTexteJsx(ch.text)
        if (t) { const decal = ch.text.search(/\S/); segs.push([[{ t: normaliser(t), ligne: ligneDe(ch.pos + Math.max(0, decal)) }]]) }
      } else if (ts.isJsxExpression(ch)) {
        if (!ch.expression) continue
        if (contientJsx(ch.expression)) { segs.push([[{ t: PARA, ligne: ligneDe(ch.getStart(sf)) }]]); continue }
        const l = ligneDe(ch.getStart(sf))
        segs.push(alternatives(ch.expression, inl).map((a) => [{ t: normaliser(a), ligne: l }]))
      } else segmentsJsx(ch, segs)
    }
    if (bloc) segs.push([[{ t: PARA, ligne: ligneDe(n.end) }]])
  }
  const estEnfantJsx = (n) => n.parent && (ts.isJsxElement(n.parent) || ts.isJsxFragment(n.parent))
  const estDansConcat = (n) => { const p = n.parent; return p && ts.isBinaryExpression(p) && p.operatorToken.kind === ts.SyntaxKind.PlusToken }
  const contientChaine = (n) => { let oui = false; const r = (x) => { if (oui) return; if (estChaine(x) || ts.isTemplateExpression(x)) { oui = true; return } if (ts.isBinaryExpression(x) && x.operatorToken.kind === ts.SyntaxKind.PlusToken) ts.forEachChild(x, r) }; ts.forEachChild(n, r); return oui }

  const visiter = (n) => {
    if ((ts.isJsxElement(n) || ts.isJsxFragment(n)) && !estEnfantJsx(n)) {
      const segs = []
      segmentsJsx(n, segs)
      unites.push({ genre: 'jsx', ligne: ligneDe(n.getStart(sf)), variantes: combiner(segs).map((v) => v.flat()), contexte: null })
    } else if (estChaine(n) && !inl.has(n)) {
      const l = ligneDe(n.getStart(sf))
      unites.push({ genre: 'chaine', ligne: l, variantes: [morceauxChaine(n.text, l)], contexte: contexteObjet(n) })
    } else if (ts.isTemplateExpression(n) && !inl.has(n)) {
      inl.add(n)
      const l = ligneDe(n.getStart(sf))
      unites.push({ genre: 'gabarit', ligne: l, variantes: variantesGabarit(n, inl).map((a) => morceauxChaine(a, l)), contexte: contexteObjet(n) })
    } else if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.PlusToken && !estDansConcat(n) && !inl.has(n) && contientChaine(n) && !contientJsx(n)) {
      const l = ligneDe(n.getStart(sf))
      unites.push({ genre: 'concat', ligne: l, variantes: alternatives(n, inl).map((a) => morceauxChaine(a, l)), contexte: contexteObjet(n) })
    } else if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === 'join' && ts.isArrayLiteralExpression(deballer(n.expression.expression))
      && !inl.has(n) && deballer(n.expression.expression).elements.some((x) => estChaine(deballer(x)) || ts.isTemplateExpression(deballer(x))) && !contientJsx(n)) {
      inl.add(n)
      const l = ligneDe(n.getStart(sf))
      unites.push({ genre: 'concat', ligne: l, variantes: alternatives(n, inl).map((a) => morceauxChaine(a, l)), contexte: contexteObjet(n) })
    }
    ts.forEachChild(n, visiter)
  }
  visiter(sf)

  // Commentaires : les trivia devant et derrière chaque jeton (getChildren inclut les jetons), hors texte JSX.
  const vus = new Map()
  const prendre = (r) => { if (r && !vus.has(r.pos)) vus.set(r.pos, r) }
  const tout = (n) => {
    if (n.kind !== ts.SyntaxKind.JsxText) {
      for (const r of ts.getLeadingCommentRanges(source, n.pos) || []) prendre(r)
      for (const r of ts.getTrailingCommentRanges(source, n.end) || []) prendre(r)
    }
    for (const c of n.getChildren(sf)) tout(c)
  }
  tout(sf)
  const dansJsx = (pos) => textesJsx.some(([a, b]) => pos >= a && pos < b)
  const coms = [...vus.values()].filter((r) => !dansJsx(r.pos)).sort((a, b) => a.pos - b.pos)
  let groupe = null
  const fermer = () => { if (groupe) unites.push({ genre: 'commentaire', ligne: groupe[0].ligne, variantes: [groupe], contexte: null }); groupe = null }
  let derniereLigne = -10
  for (const r of coms) {
    const brut = source.slice(r.pos, r.end)
    const l0 = ligneDe(r.pos)
    if (r.kind === ts.SyntaxKind.SingleLineCommentTrivia) {
      const t = brut.replace(/^\/\/+!?\s?/, '')
      if (!groupe || l0 !== derniereLigne + 1) { fermer(); groupe = [] }
      groupe.push(t.trim() ? { t: `${normaliser(t)} `, ligne: l0 } : { t: PARA, ligne: l0 })
      derniereLigne = l0
    } else {
      fermer()
      const corps = brut.replace(/^\/\*+!?/, '').replace(/\*+\/$/, '')
      groupe = corps.split(/\r\n|\n|\r/).map((l, i) => { const t = l.replace(/^\s*\*+ ?/, ''); return t.trim() ? { t: `${normaliser(t)} `, ligne: l0 + i } : { t: PARA, ligne: l0 + i } })
      fermer()
      derniereLigne = -10
    }
  }
  fermer()
  return { unites, erreurs: (sf.parseDiagnostics || []).map((d) => `ligne ${ligneDe(d.start)} : ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`), sf }
}

/** Les phrases d'une variante (suite de morceaux) : [{ texte, ligne }]. */
export function phrasesDe(morceaux) {
  const texte = morceaux.map((m) => m.t).join('')
  const debuts = []
  let k = 0
  for (const m of morceaux) { debuts.push(k); k += m.t.length }
  const ligneA = (off) => { let i = 0; while (i + 1 < debuts.length && debuts[i + 1] <= off) i++; return morceaux[i] ? morceaux[i].ligne : 0 }
  const out = []
  let debut = 0
  const pousser = (a, b) => {
    const brut = texte.slice(a, b)
    const decal = brut.search(/[^\s\u2029]/)
    const t = brut.replace(/\u2029/g, ' ').replace(/\s+/g, ' ').trim()
    if (t) out.push({ texte: t, ligne: ligneA(a + Math.max(0, decal)) })
  }
  const re = /[.!?…]+[»”"’)\]]*(?=[\s\u2029]|$)|\u2029/g
  let m
  while ((m = re.exec(texte))) { const fin = m.index + m[0].length; pousser(debut, fin); debut = fin }
  pousser(debut, texte.length)
  return out
}

// ── Les règles PR-1 à PR-4 ────────────────────────────────────────────────────────────────────────────────────────────────
const L = '\\p{L}'
const RE_MINUTE = /moins\s*d’\s*(?:une|1)\s*minute|moins\s+de\s+(?:60|soixante)\s+secondes/iu
const RE_PRETE = new RegExp(`(?<!${L})(?:prêtes?|prépar${L}*)(?!${L})`, 'iu')
const RE_SECONDE = /dans\s+la\s+seconde/iu
const PR3_MOTIFS = [
  [/présence\s+en\s+ligne\s+soignée/iu, 'Présence en ligne soignée'],
  [/inclus\s+dès\s+(?:l’offre\s+|la\s+formule\s+)?studio/iu, 'Inclus dès Studio'],
  [/inclus\s+dès\s+(?:l’offre\s+|la\s+formule\s+)?signature/iu, 'Inclus dès Signature'],
  [/inclus\s+dans\s+l’offre\s+signature/iu, 'Inclus dans l’offre Signature'],
]
const RE_VERBE = new RegExp(`(?<!${L})répond(?:re|ra|rait|ront|raient|u|ue|us|ues|ant)?(?!${L})`, 'giu')
const RE_SUJET = new RegExp(`(?<!${L})(?:presti|assistant|ia)(?!${L})`, 'iu')
const RE_NOMME = new RegExp(`(?<!${L})(?:Studio|Signature)(?!${L})`, 'u')
const RE_CLE_NOMME = /^(?:studio|signature)$/i
const RE_MODIF_APRES = new RegExp(`(?<!${L})(?:tout\\s+seule?s?|seule?s?|automatiquement|[àa]\\s+votre\\s+place)(?!${L})`, 'giu')
const RE_MODIF_AVANT = new RegExp(`(?<!${L})(?:tout\\s+seule?s?|automatiquement|[àa]\\s+votre\\s+place)(?!${L})`, 'iu')
const RE_COUPURE = /[:;—–()«»[\]]|\s(?:et|ou|mais|puis|car|sinon)\s/iu
const RE_JOUR_NUIT = new RegExp(`(?<!${L})(?:jour\\s+et\\s+nuit|nuit\\s+et\\s+jour)(?!${L})`, 'giu')
const RE_NEGATION = new RegExp(`(?:^|[^${'\\p{L}'}])(?:ne\\s+|n’\\s*)(?:(?:y|lui|leur|vous|les|en|me|te|se)\\s+)?$`, 'iu')
const RE_ARTICLE_AVANT = new RegExp(`(?:^|[^${'\\p{L}'}])(?:un|une|le|la|les|l’|d’un|d’une|du|des|au|aux|ce|cette|son|sa|ses|votre|vos|notre|nos)\\s*$`, 'iu')
const RE_PRONOM = /(?:^|[^\p{L}])(?:il|elle)\s+(?:y\s+|vous\s+|leur\s+|lui\s+)?$/iu
const mots = (s, n, depuisFin = false) => { const m = s.trim().split(/\s+/).filter(Boolean); return (depuisFin ? m.slice(-n) : m.slice(0, n)).join(' ') }

/** PR-4 sur une phrase : le complément fautif trouvé, ou null. */
export function promesseSeule(phrase, { unite = '', contexte = null } = {}) {
  if (RE_NOMME.test(phrase)) return null
  if (contexte && (contexte.cles.some((c) => RE_CLE_NOMME.test(c)) || contexte.valeurs.some((v) => RE_NOMME.test(v)))) return null
  RE_VERBE.lastIndex = 0
  let m
  while ((m = RE_VERBE.exec(phrase))) {
    const avant = phrase.slice(0, m.index)
    if (RE_NEGATION.test(avant)) continue
    const sujet = RE_SUJET.test(phrase) || (RE_PRONOM.test(avant) && RE_SUJET.test(unite))
    if (!sujet) continue
    // « jour et nuit » ne coupe pas la proposition (« répond à vos clients, jour et nuit, à votre place »)
    let apres = phrase.slice(m.index + m[0].length).replace(RE_JOUR_NUIT, (x) => x.replace(/\s+et\s+/iu, '-et-'))
    const c = RE_COUPURE.exec(apres)
    if (c) apres = apres.slice(0, c.index)
    apres = mots(apres, 12)
    RE_MODIF_APRES.lastIndex = 0
    let x
    while ((x = RE_MODIF_APRES.exec(apres))) {
      if (/^seule?s?$/i.test(x[0]) && RE_ARTICLE_AVANT.test(apres.slice(0, x.index))) continue
      return `${m[0]} … ${x[0]}`
    }
    let av = avant.replace(RE_JOUR_NUIT, (x) => x.replace(/\s+et\s+/iu, '-et-'))
    let dernier = -1, y
    const g = new RegExp(RE_COUPURE.source, 'giu')
    while ((y = g.exec(av))) dernier = y.index + y[0].length
    if (dernier >= 0) av = av.slice(dernier)
    av = mots(av, 6, true)
    const z = RE_MODIF_AVANT.exec(av)
    if (z) return `${z[0]} … ${m[0]}`
  }
  return null
}
function exceptionPR4(chemin, ligneSource, sourceFichier) {
  return chemin === 'app/plateforme/Reglages.tsx' && /id:\s*'auto'/.test(ligneSource || '') && /peut\(\s*plan\s*,\s*'plateforme\.ia\.auto'\s*\)/.test(sourceFichier || '')
}

/**
 * Examine des fichiers [{ chemin (posix, relatif à la racine), source }] → { violations: { 'PR-1': [...], … 'PR-4': [...] },
 * erreurs: [chemin : erreur de syntaxe], unites, phrases, prose: Map(chemin → nombre de phrases de prose),
 * proseTextes: Map(chemin → Set des phrases de prose distinctes) }.
 * Une violation : { id, chemin, ligne, phrase, motif }.
 */
export function examinerTexte(fichiers) {
  const violations = { 'PR-1': [], 'PR-2': [], 'PR-3': [], 'PR-4': [] }
  const vus = new Set()
  const noter = (id, chemin, ligne, phrase, motif) => {
    const cle = `${id}|${chemin}|${ligne}|${phrase}`
    if (vus.has(cle)) return
    vus.add(cle)
    violations[id].push({ id, chemin, ligne, phrase, motif })
  }
  const erreurs = []
  const prose = new Map(), proseTextes = new Map()
  let nUnites = 0, nPhrases = 0
  for (const { chemin, source } of fichiers) {
    let res
    try { res = unitesDeTexte(chemin, source) } catch (e) { erreurs.push(`${chemin} : analyse impossible (${premiereLigne(e)})`); continue }
    for (const e of res.erreurs.slice(0, 2)) erreurs.push(`${chemin} : ${e}`)
    const lignesSource = source.split(/\r\n|\n|\r/)
    let nProse = 0
    const proseVue = new Set()
    for (const u of res.unites) {
      nUnites++
      const texteUnite = u.variantes.map((v) => v.map((x) => x.t).join('')).join(' ')
      for (const v of u.variantes) {
        const toutTexte = v.map((x) => x.t).join('').replace(/\u2029/g, ' ')
        for (const [re, nom] of PR3_MOTIFS) if (re.test(toutTexte)) noter('PR-3', chemin, u.ligne, court(toutTexte), nom)
        const phrases = phrasesDe(v)
        // un motif COUP\u00c9 par une balise qui fait bloc (<br />, un composant, <p>\u2026) : il n'est dans aucune phrase, mais il est dans le
        // texte de l'unit\u00e9 mis bout \u00e0 bout. Une promesse d\u00e9coup\u00e9e ainsi est une promesse (relecture du 24/09 : \u00ab moins d\u2019une<br />minute \u00bb).
        // Mesure : le motif trouv\u00e9 dans le texte o\u00f9 les coupures valent une espace, et dont l'\u00e9tendue contient une coupure.
        const brutV = v.map((x) => x.t).join('')
        const ligneA = (off) => { let k = 0; for (const x of v) { if (off < k + x.t.length) return x.ligne; k += x.t.length } return u.ligne }
        for (const [re, id, nom] of [[RE_MINUTE, 'PR-1', 'moins d\u2019une minute'], [RE_SECONDE, 'PR-2', 'dans la seconde']]) {
          for (const m of toutTexte.matchAll(new RegExp(re.source, 'giu'))) {
            if (!brutV.slice(m.index, m.index + m[0].length).includes(PARA)) continue
            const extrait = toutTexte.slice(Math.max(0, m.index - 60), m.index + m[0].length + 40).replace(/\s+/g, ' ').trim()
            if (id === 'PR-1' && chemin === 'lib/platStats.ts') continue
            if (id === 'PR-2' && ((chemin === 'app/api/account/delete/route.ts' && u.genre === 'commentaire') || (chemin === 'lib/aide.ts' && /notification/i.test(extrait)))) continue
            noter(id, chemin, ligneA(m.index), `\u2026${extrait}\u2026`, `${nom}, coup\u00e9 par une balise`)
          }
        }
        for (const p of phrases) {
          nPhrases++
          if (!proseVue.has(p.texte) && (p.texte.match(/\p{L}{2,}/gu) || []).length >= 4 && /\s/.test(p.texte)) { proseVue.add(p.texte); nProse++ }
          if (RE_MINUTE.test(p.texte) && !RE_PRETE.test(p.texte) && chemin !== 'lib/platStats.ts') noter('PR-1', chemin, p.ligne, p.texte, RE_MINUTE.exec(p.texte)[0])
          if (RE_SECONDE.test(p.texte)) {
            const excepte = (chemin === 'lib/aide.ts' && /notification/i.test(p.texte)) || (chemin === 'app/api/account/delete/route.ts' && u.genre === 'commentaire')
            if (!excepte) noter('PR-2', chemin, p.ligne, p.texte, 'dans la seconde')
          }
          const f = promesseSeule(p.texte, { unite: texteUnite, contexte: u.contexte })
          if (f && !exceptionPR4(chemin, lignesSource[p.ligne - 1], source)) noter('PR-4', chemin, p.ligne, p.texte, f)
        }
      }
    }
    // PR-3 sur la ligne source : « Inclus dès » / « Inclus dans l'offre » suivi de studio / signature, même par une expression.
    lignesSource.forEach((brute, i) => {
      const l = normaliser(brute)
      const a = /inclus\s+dès/iu.exec(l)
      if (a && /studio|signature/i.test(l.slice(a.index + a[0].length))) noter('PR-3', chemin, i + 1, court(l.trim()), 'Inclus dès … Studio/Signature (ligne source)')
      const b = /inclus\s+dans\s+l’offre/iu.exec(l)
      if (b && /signature/i.test(l.slice(b.index + b[0].length))) noter('PR-3', chemin, i + 1, court(l.trim()), 'Inclus dans l’offre … Signature (ligne source)')
    })
    prose.set(chemin, nProse)
    proseTextes.set(chemin, proseVue)
  }
  return { violations, erreurs, unites: nUnites, phrases: nPhrases, prose, proseTextes }
}

// ── Lecture de la racine ──────────────────────────────────────────────────────────────────────────────────────────────────
/** Les .ts/.tsx de app/ et lib/ sous `racine` → { fichiers: [{ chemin, source }], defauts } */
export function lireCorpus(racine) {
  const fichiers = [], defauts = []
  for (const d of ['app', 'lib']) {
    const dossier = path.join(racine, d)
    if (!fs.existsSync(dossier) || !fs.statSync(dossier).isDirectory()) { defauts.push(`${d}/ absent sous ${racine}`); continue }
    const liste = [...listerFichiers(dossier)].filter((f) => /\.tsx?$/i.test(f)).sort()
    if (!liste.length) defauts.push(`${d}/ ne contient aucun .ts/.tsx`)
    for (const rel of liste) fichiers.push({ chemin: `${d}/${rel}`, source: fs.readFileSync(path.join(dossier, rel), 'utf8') })
  }
  return { fichiers, defauts }
}
/** Le commit auquel comparer : HEAD d'un dépôt, sinon le commit de l'arbre extrait (<racine>.json), sinon HEAD du dépôt. */
function baseDe(racine) {
  if (estRacineGit(racine)) return { depot: racine, rev: 'HEAD', nom: 'HEAD' }
  const c = commitDeReference(racine)
  return c ? { depot: R, rev: c, nom: c.slice(0, 7) } : { depot: R, rev: 'HEAD', nom: 'HEAD du dépôt' }
}
/** Substance : fichiers surveillés présents, non vides, avec au moins une part de leurs phrases de prose de la référence. */
function substance(corpus, ex) {
  const defauts = [...corpus.defauts]
  const parChemin = new Map(corpus.fichiers.map((f) => [f.chemin, f]))
  const ref = examinerTexte(SURVEILLES.map((c) => ({ chemin: c, source: (blobGit(R, REFERENCE_COMMIT, c) || Buffer.alloc(0)).toString('utf8') })).filter((f) => f.source))
  for (const c of SURVEILLES) {
    const f = parChemin.get(c)
    if (!f) { defauts.push(`${c} absent`); continue }
    if (!f.source.trim()) { defauts.push(`${c} vide`); continue }
    // la prose du fichier et celle des sources de texte qu'il importe et lit (lib/faq.ts pour la FAQ), phrases distinctes
    const sources = sourcesUtilisees(c, f.source).filter((x) => parChemin.has(x))
    const n = sources.length ? new Set([c, ...sources].flatMap((x) => [...(ex.proseTextes.get(x) || [])])).size : (ex.prose.get(c) || 0)
    const nr = ref.prose.get(c) || 0
    const nom = sources.length ? `${c} (avec ${sources.join(', ')}, qu’il importe et lit)` : c
    const part = PART_MIN[c] ?? PART_DEFAUT
    if (!nr) defauts.push(`${c} : aucune phrase de prose à ${REFERENCE_COMMIT} (référence illisible)`)
    else if (n < Math.ceil(nr * part)) defauts.push(`${nom} : ${n} phrase(s) de prose, ${Math.ceil(nr * part)} au moins (${Math.round(part * 100)} % des ${nr} de ${REFERENCE_COMMIT})`)
  }
  for (const e of ex.erreurs) defauts.push(`syntaxe : ${e}`)
  // sondes de sourcesUtilisees : importée et lue → comptée ; importée sans être lue, import de type, clé homonyme, absente → non
  const P = 'app/faq/page.tsx', rendu = 'export default function P() { return <main>{FAQ.map((f) => <p key={f.question}>{f.reponse}</p>)}</main> }\n'
  const sondes = [
    [`import { FAQ } from '@/lib/faq'\n${rendu}`, ['lib/faq.ts']],
    [`import { FAQ as Q } from '../../lib/faq'\nexport default function P() { return <main>{Q.length}</main> }\n`, ['lib/faq.ts']],
    [`import { FAQ } from '@/lib/faq'\nexport default function P() { return <main>Rien</main> }\n`, []],
    [`import type { FAQ } from '@/lib/faq'\n${rendu}`, []],
    [`import { FAQ } from '@/lib/faq'\nconst o = { FAQ: 1 }\nexport default function P() { return <main>{o.FAQ}</main> }\n`, []],
    [`const FAQ = [{ question: 'Q ?', reponse: 'R.' }]\n${rendu}`, []],
  ]
  sondes.forEach(([src, attendu], i) => { const r = sourcesUtilisees(P, src); if (JSON.stringify(r) !== JSON.stringify(attendu)) defauts.push(`détecteur : sonde ${i + 1} de sourcesUtilisees mal jugée (${JSON.stringify(r)} au lieu de ${JSON.stringify(attendu)})`) })
  return defauts
}

// ── PR-5 : titre et descriptions ──────────────────────────────────────────────────────────────────────────────────────────
function sourceFichier(chemin, source) { return ts.createSourceFile(chemin, source, ts.ScriptTarget.Latest, true, /\.tsx$/.test(chemin) ? ts.ScriptKind.TSX : ts.ScriptKind.TS) }
function constantes(sf) {
  const m = new Map()
  for (const st of sf.statements) if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name) && d.initializer) m.set(d.name.text, d.initializer)
  return m
}
/** La valeur de chaîne d'une expression, résolue dans le fichier (constantes, gabarits, concaténations), ou null. */
function resoudre(expr, consts, prof = 0) {
  const e = deballer(expr)
  if (!e || prof > 8) return null
  if (estChaine(e)) return e.text
  if (ts.isIdentifier(e)) return consts.has(e.text) ? resoudre(consts.get(e.text), consts, prof + 1) : null
  if (ts.isTemplateExpression(e)) {
    let s = e.head.text
    for (const sp of e.templateSpans) { const v = resoudre(sp.expression, consts, prof + 1); if (v === null) return null; s += v + sp.literal.text }
    return s
  }
  if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.PlusToken) { const a = resoudre(e.left, consts, prof + 1), b = resoudre(e.right, consts, prof + 1); return a === null || b === null ? null : a + b }
  return null
}
const nomProp = (p) => (p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) ? p.name.text : null)
const prop = (obj, nom) => obj && ts.isObjectLiteralExpression(obj) ? obj.properties.find((p) => ts.isPropertyAssignment(p) && nomProp(p) === nom) : undefined
const signes = (s) => [...String(s).normalize('NFC')].length
/** PR-5 sur les sources de app/layout.tsx, app/page.tsx et app/manifest.ts (null = absent). → { ok, echecs, faits } */
export function examinerMeta({ layout, page, manifest }) {
  const echecs = [], faits = []
  const mesurer = (quoi, v, max) => {
    if (v === null || v === undefined) { echecs.push(`${quoi} : valeur non résolue dans le fichier`); return }
    const n = signes(v)
    if (!v.trim()) echecs.push(`${quoi} vide`)
    else if (n > max) echecs.push(`${quoi} : ${n} signes, ${max} au plus (« ${court(v, 90)} »)`)
    else faits.push(`${quoi} ${n}/${max}`)
  }
  // layout
  if (layout === null || layout === undefined || !layout.trim()) echecs.push('app/layout.tsx absent ou vide')
  else {
    const sf = sourceFichier('app/layout.tsx', layout)
    const consts = constantes(sf)
    const init = consts.get('metadata')
    const meta = init && deballer(init)
    if (!meta || !ts.isObjectLiteralExpression(meta)) echecs.push('app/layout.tsx : objet metadata introuvable')
    else {
      const t = prop(meta, 'title')
      if (!t) echecs.push('app/layout.tsx : metadata.title absent')
      else {
        const ti = deballer(t.initializer)
        if (ts.isObjectLiteralExpression(ti)) {
          const choisi = prop(ti, 'absolute') || prop(ti, 'default')
          if (!choisi) echecs.push('app/layout.tsx : metadata.title sans default ni absolute')
          else mesurer(`titre (metadata.title.${nomProp(choisi)})`, resoudre(choisi.initializer, consts), 70)
        } else mesurer('titre (metadata.title)', resoudre(ti, consts), 70)
      }
      const d = prop(meta, 'description')
      if (!d) echecs.push('app/layout.tsx : metadata.description absente')
      else mesurer('app/layout.tsx metadata.description', resoudre(d.initializer, consts), 160)
      for (const bloc of ['openGraph', 'twitter']) {
        const b = prop(meta, bloc)
        const o = b && deballer(b.initializer)
        if (!o || !ts.isObjectLiteralExpression(o)) continue
        const bt = prop(o, 'title'), bd = prop(o, 'description')
        if (bt) mesurer(`app/layout.tsx metadata.${bloc}.title`, resoudre(bt.initializer, consts), 70)
        if (bd) mesurer(`app/layout.tsx metadata.${bloc}.description`, resoudre(bd.initializer, consts), 160)
      }
    }
  }
  // page et manifeste : toutes les propriétés description du fichier
  for (const [chemin, src] of [['app/page.tsx', page], ['app/manifest.ts', manifest]]) {
    if (src === null || src === undefined || !src.trim()) { echecs.push(`${chemin} absent ou vide`); continue }
    const sf = sourceFichier(chemin, src)
    const consts = constantes(sf)
    const trouvees = []
    const rec = (n) => { if (ts.isPropertyAssignment(n) && nomProp(n) === 'description') trouvees.push(n); ts.forEachChild(n, rec) }
    rec(sf)
    if (!trouvees.length) { echecs.push(`${chemin} : aucune description`); continue }
    for (const p of trouvees) mesurer(`${chemin}:${sf.getLineAndCharacterOfPosition(p.getStart(sf)).line + 1} description`, resoudre(p.initializer, consts), 160)
  }
  return { ok: echecs.length === 0, echecs, faits }
}

// ── PR-6 : lib/plans.ts ───────────────────────────────────────────────────────────────────────────────────────────────────
/** La chaîne accroche de la propriété studio (objet qui a une accroche) → { debut, fin, valeur, litterale } ou { erreur }. */
function accrocheStudio(source) {
  const sf = sourceFichier('lib/plans.ts', source)
  const trouvees = []
  const rec = (n) => {
    if (ts.isPropertyAssignment(n) && nomProp(n) === 'studio') {
      const o = deballer(n.initializer)
      const a = prop(o, 'accroche')
      if (a) trouvees.push(a)
    }
    ts.forEachChild(n, rec)
  }
  rec(sf)
  if (trouvees.length !== 1) return { erreur: `${trouvees.length} propriété(s) studio avec accroche (1 attendue)` }
  const init = trouvees[0].initializer
  return { debut: init.getStart(sf), fin: init.end, valeur: estChaine(init) ? init.text : null, litterale: estChaine(init) }
}
/** PR-6 : `apres` identique à `avant` hors la chaîne accroche de studio. → { ok, echecs, resume } */
export function comparerPlans(avant, apres, nomBase = 'HEAD') {
  const echecs = []
  if (avant === null || avant === undefined || !avant.trim()) return { ok: false, echecs: [`lib/plans.ts de ${nomBase} introuvable`], resume: '' }
  if (apres === null || apres === undefined || !apres.trim()) return { ok: false, echecs: ['lib/plans.ts absent ou vide'], resume: '' }
  const lf = (s) => s.replace(/\r\n/g, '\n')
  const a = lf(avant), b = lf(apres)
  const xa = accrocheStudio(a), xb = accrocheStudio(b)
  if (xa.erreur) return { ok: false, echecs: [`${nomBase} : ${xa.erreur}`], resume: '' }
  if (xb.erreur) return { ok: false, echecs: [xb.erreur], resume: '' }
  if (!xb.litterale) echecs.push('l’accroche de studio n’est plus une chaîne littérale')
  else if (!xb.valeur.trim()) echecs.push('l’accroche de studio est vide')
  const ra = a.slice(0, xa.debut) + '\u0000ACCROCHE\u0000' + a.slice(xa.fin)
  const rb = b.slice(0, xb.debut) + '\u0000ACCROCHE\u0000' + b.slice(xb.fin)
  if (ra !== rb) {
    const la = ra.split('\n'), lb = rb.split('\n')
    let i = 0
    while (i < Math.max(la.length, lb.length) && la[i] === lb[i]) i++
    let n = 0
    for (let k = 0; k < Math.max(la.length, lb.length); k++) if (la[k] !== lb[k]) n++
    echecs.push(`lib/plans.ts diffère de ${nomBase} hors l’accroche de studio : ${n} ligne(s), la première ligne ${i + 1} : « ${court((lb[i] ?? '(absente)').replace('\u0000ACCROCHE\u0000', '<accroche>'), 90)} » au lieu de « ${court((la[i] ?? '(absente)').replace('\u0000ACCROCHE\u0000', '<accroche>'), 90)} »`)
  }
  const change = xa.valeur !== xb.valeur
  return { ok: echecs.length === 0, echecs, resume: `identique à ${nomBase} hors l’accroche de studio, ${change ? `changée : « ${court(xa.valeur, 70)} » → « ${court(xb.valeur, 70)} »` : `inchangée (« ${court(xb.valeur, 70)} »)`}` }
}

// ── PR-7 : la landing ne montre pas une réponse que Presti ne fait pas (relecture à froid du 24/09, G2) ───────────────────
/** Les fichiers de la landing : app/page.tsx et les composants de app/ (ou components/) qu'il importe, trois niveaux. */
export function fichiersLanding(racine) {
  const vus = new Set(), aFaire = [['app/page.tsx', 0]], out = []
  while (aFaire.length) {
    const [rel, prof] = aFaire.shift()
    if (vus.has(rel)) continue
    vus.add(rel)
    const f = path.join(racine, rel)
    if (!fs.existsSync(f)) continue
    const source = fs.readFileSync(f, 'utf8')
    out.push({ chemin: rel, source })
    if (prof >= 3) continue
    for (const m of source.matchAll(/(?:^|\n)\s*import\s+(?!type\s)[^'"]*?from\s+['"]([^'"]+)['"]/g)) {
      const spec = m[1]
      const base = spec.startsWith('@/') ? spec.slice(2) : spec.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(rel), spec)) : null
      if (!base || !/^(?:app|components)\//.test(base)) continue // lib/ : les données partagées, jugées par PR-1 à PR-4
      const cible = ['.tsx', '.ts', '/index.tsx', '/index.ts'].map((e) => base + e).find((c) => fs.existsSync(path.join(racine, c)))
      if (cible) aFaire.push([cible, prof + 1])
    }
  }
  return out
}
const RE_EN_DIRECT = new RegExp(`(?<!${L})r[ée]pon(?:se|ses|d|dre|du|due|dent)\\s+en\\s+direct(?!${L})`, 'iu')
const RE_REPONDU_EN = new RegExp(`(?<!${L})r[ée]pon(?:du|due|dus|dues|d|dent|se|ses)\\s+(?:en|sous|après|au\\s+bout\\s+de)\\s+\\d+(?:[.,]\\d+)?\\s*(?:s|sec|secondes?|min|minutes?|mn)(?!${L})`, 'iu')
const JOURS = 'lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche'
const RE_ENGAGEMENT = new RegExp(`(?<!${L})(?:je|j’|nous|on)\\s*(?:vous\\s+|te\\s+|lui\\s+|leur\\s+|y\\s+)?(?:rappel${L}*|recontact${L}*|passe|passerai|passerons|passons|viens|viendr${L}*|venons|interviens|interviendr${L}*|intervenons|reviens|reviendr${L}*|revenons|enverr${L}*|envoie|envoyons|serai|serons|arrive|arriverai|arrivons|répond${L}*|occupe|occuperai)(?!${L})[^.!?]{0,80}?(?<!${L})(?:aujourd’hui|demain|après-demain|ce\\s+(?:soir|matin|midi|week-end)|cette\\s+(?:semaine|nuit|après-midi)|la\\s+semaine\\s+prochaine|dans\\s+la\\s+(?:journée|matinée|soirée|semaine)|dans\\s+l’heure|dans\\s+(?:les\\s+)?\\d+\\s*(?:h|heures?|jours?|min(?:utes?)?)|d’ici\\s+(?:ce\\s+soir|demain|\\d|la\\s+fin|${JOURS})|sous\\s+\\d+|avant\\s+(?:ce\\s+soir|demain|midi|la\\s+fin|${JOURS})|${JOURS}|à\\s+\\d{1,2}\\s*h)(?!${L})`, 'iu')
const RE_ALERTE = new RegExp(`(?<!${L})(?:alert${L}*|escalad${L}*|prévenu${L}*|prévient|prévenir)(?!${L})`, 'iu')
const REGLES_PR7 = [[RE_EN_DIRECT, '« réponse en direct »'], [RE_REPONDU_EN, '« répondu en N s »'], [RE_SECONDE, '« dans la seconde »'], [RE_ENGAGEMENT, 'engagement de date dans une réponse montrée']]
const plier = (t) => normaliser(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
/** Les mots d'escalade par défaut, lus dans lib/plateformeConfig.ts (escalade_mots: [...]) → liste, vide si illisible. */
export function motsEscalade(source) {
  const m = /escalade_mots\s*:\s*\[([^\]]*)\]/.exec(String(source || ''))
  return m ? [...m[1].matchAll(/['"`]([^'"`]+)['"`]/g)].map((x) => x[1]).filter(Boolean) : []
}
/** PR-7 (et les textes incrustés de PR-8) sur des phrases → [{ motif, extrait }] */
function reglesPR7(texte) {
  const out = []
  for (const [re, nom] of REGLES_PR7) { const m = re.exec(texte); if (m) out.push({ motif: `${nom} : « ${court(m[0], 70)} »` }) }
  return out
}
/**
 * PR-7 sur les fichiers de la landing [{ chemin, source }] → [{ chemin, ligne, phrase, motif }] : commentaires exclus (ce
 * que l'écran montre) ; une demande qui contient un mot d'escalade par défaut, dans un composant de app/, doit s'accompagner
 * de l'alerte de l'artisan (alerte, escalade, prévenu…) : Presti n'y répond pas seul.
 */
export function examinerLanding(fichiers, { escalade = [] } = {}) {
  const v = [], vus = new Set()
  const noter = (x) => { const k = `${x.chemin}|${x.ligne}|${x.motif}`; if (!vus.has(k)) { vus.add(k); v.push(x) } }
  const mots = escalade.map(plier).filter(Boolean)
  for (const { chemin, source } of fichiers) {
    let res
    try { res = unitesDeTexte(chemin, source) } catch (e) { noter({ chemin, ligne: 0, phrase: '', motif: `analyse impossible (${premiereLigne(e)})` }); continue }
    const phrases = []
    for (const u of res.unites) { if (u.genre === 'commentaire') continue; for (const va of u.variantes) phrases.push(...phrasesDe(va)) }
    for (const p of phrases) for (const r of reglesPR7(p.texte)) noter({ chemin, ligne: p.ligne, phrase: p.texte, motif: r.motif })
    if (chemin.startsWith('app/') && mots.length) {
      const avec = phrases.map((p) => ({ p, mot: mots.find((w) => new RegExp(`(?<![\\p{L}])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'u').test(plier(p.texte))) })).find((x) => x.mot)
      if (avec && !phrases.some((p) => RE_ALERTE.test(p.texte))) noter({ chemin, ligne: avec.p.ligne, phrase: avec.p.texte, motif: `mot d’escalade « ${avec.mot} » montré sans l’alerte de l’artisan (lib/plateformeConfig.ts : Presti n’y répond pas seul, il alerte)` })
    }
  }
  return v
}

// ── PR-8 : la vidéo de la landing et ses textes incrustés (G1) ────────────────────────────────────────────────────────────
/** La valeur de FLAGS.landingVideo dans lib/flags.ts : true, false, ou null (absente ou non littérale). */
export function valeurLandingVideo(source) {
  if (!source) return null
  const sf = sourceFichier('lib/flags.ts', source)
  let v
  const rec = (n) => { if (v === undefined && ts.isPropertyAssignment(n) && nomProp(n) === 'landingVideo') { const i = deballer(n.initializer); v = i.kind === ts.SyntaxKind.TrueKeyword ? true : i.kind === ts.SyntaxKind.FalseKeyword ? false : null } ts.forEachChild(n, rec) }
  rec(sf)
  return v === undefined ? null : v
}
const RE_DRAPEAU = /FLAGS\s*\.\s*landingVideo|FLAGS\s*\[\s*['"]landingVideo['"]\s*\]|actif\(\s*['"]landingVideo['"]\s*\)/
/** Un nœud JSX est-il rendu seulement quand landingVideo est vrai (ternaire, &&, if, en remontant) ? */
function gardeParLandingVideo(noeud, sf) {
  for (let n = noeud, p = noeud.parent; p; n = p, p = p.parent) {
    let cond = null, pol = 0
    if (ts.isConditionalExpression(p)) { if (n === p.whenTrue) { cond = p.condition; pol = 1 } else if (n === p.whenFalse) { cond = p.condition; pol = -1 } }
    else if (ts.isBinaryExpression(p) && n === p.right && p.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) { cond = p.left; pol = 1 }
    else if (ts.isIfStatement(p)) { if (n === p.thenStatement) { cond = p.expression; pol = 1 } else if (n === p.elseStatement) { cond = p.expression; pol = -1 } }
    if (!cond) continue
    const t = cond.getText(sf).replace(/\s+/g, ' ').trim()
    if (!RE_DRAPEAU.test(t)) continue
    const nie = /^!\s*\(?\s*(?:FLAGS|actif)/.test(t)
    if ((pol === 1 && !nie) || (pol === -1 && nie)) return true
  }
  return false
}
/**
 * PR-8 : { flags (source de lib/flags.ts), landing ([{ chemin, source }]), lire (rel → Buffer | null) } → { ok, echecs, faits }.
 * La vidéo est affichée si landingVideo n'est pas littéralement false, ou si un composant qui la porte (fichier de la landing
 * qui cite un .mp4/.webm) est rendu hors d'une condition vraie sur landingVideo. Affichée : chaque vidéo /x/y.mp4 a son
 * public/x/y.textes.json { video, sha256, textes: [...] } (sha256 du fichier vidéo actuel), et chaque texte passe PR-1, PR-2,
 * PR-4 et PR-7.
 */
export function examinerVideo({ flags, landing, lire }) {
  const echecs = [], faits = []
  const valeur = valeurLandingVideo(flags)
  const nomDe = (c) => path.posix.basename(c).replace(/\.tsx?$/, '')
  const arbres = landing.map((f) => ({ ...f, sf: sourceFichier(f.chemin, f.source) }))
  // les composants de la vidéo de la landing : ceux que landingVideo met à l'écran (branche vraie d'une condition sur le
  // drapeau), et app/DemoVideo.tsx (celui que lib/flags.ts et app/page.tsx nomment) s'il est dans la landing
  const porteurs = new Set(landing.some((f) => f.chemin === 'app/DemoVideo.tsx') ? ['DemoVideo'] : [])
  for (const f of arbres) {
    const rec = (n) => { if ((ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) && /^[A-Z]/.test(n.tagName.getText(f.sf)) && gardeParLandingVideo(ts.isJsxOpeningElement(n) ? n.parent : n, f.sf)) porteurs.add(n.tagName.getText(f.sf)); ts.forEachChild(n, rec) }
    rec(f.sf)
  }
  const videos = new Map() // chemin public → fichiers qui la citent
  for (const f of landing) if (porteurs.has(nomDe(f.chemin))) for (const m of f.source.matchAll(/['"`](\/[\w./-]+\.(?:mp4|webm|mov|m4v))['"`]/g)) videos.set(m[1], [...(videos.get(m[1]) || []), f.chemin])
  // chaque rendu d'un de ces composants hors du fichier qui le définit : sous une condition vraie sur landingVideo ?
  const horsGarde = []
  for (const f of arbres) {
    const rec = (n) => {
      if ((ts.isJsxSelfClosingElement(n) || ts.isJsxOpeningElement(n)) && porteurs.has(n.tagName.getText(f.sf)) && nomDe(f.chemin) !== n.tagName.getText(f.sf)) {
        if (!gardeParLandingVideo(ts.isJsxOpeningElement(n) ? n.parent : n, f.sf)) horsGarde.push(`${f.chemin}:${f.sf.getLineAndCharacterOfPosition(n.getStart(f.sf)).line + 1} <${n.tagName.getText(f.sf)}>`)
      }
      ts.forEachChild(n, rec)
    }
    rec(f.sf)
  }
  const porteursListe = [...porteurs]
  const affichee = videos.size > 0 && (valeur !== false || horsGarde.length > 0)
  if (!videos.size) { faits.push('aucune vidéo citée par la landing'); return { ok: true, echecs, faits } }
  if (!affichee) { faits.push(`landingVideo = false et ${porteursListe.join(', ')} rendu(s) seulement sous landingVideo : vidéo(s) ${[...videos.keys()].join(', ')} non affichée(s)`); return { ok: true, echecs, faits } }
  const pourquoi = valeur === true ? 'landingVideo = true' : valeur === null ? 'landingVideo absent ou non littéral' : `rendue hors de landingVideo (${horsGarde.join(', ')})`
  for (const [v] of videos) {
    const relVideo = `public${v}`
    const relTextes = `public${v.replace(/\.[a-z0-9]+$/i, '')}.textes.json`
    const buf = lire(relVideo)
    const brut = lire(relTextes)
    if (!brut) { echecs.push(`${pourquoi} : ${relTextes} absent — les textes incrustés de ${relVideo} ne sont pas relus ; baisser landingVideo ou lister ces textes`); continue }
    let j
    try { j = JSON.parse(brut.toString('utf8')) } catch (e) { echecs.push(`${relTextes} illisible : ${premiereLigne(e)}`); continue }
    if (!j || !Array.isArray(j.textes) || !j.textes.length || j.textes.some((t) => typeof t !== 'string' || !t.trim())) { echecs.push(`${relTextes} : « textes » doit être une liste non vide de phrases`); continue }
    if (j.video !== relVideo) echecs.push(`${relTextes} : video « ${j.video} », « ${relVideo} » attendu`)
    const sha = buf ? crypto.createHash('sha256').update(buf).digest('hex') : null
    if (!sha) echecs.push(`${relVideo} absent : rien à relire`)
    else if (j.sha256 !== sha) echecs.push(`${relTextes} : sha256 « ${court(j.sha256, 16)} » ≠ ${sha.slice(0, 16)}… de ${relVideo} (vidéo refilmée sans relire ses textes)`)
    for (const t of j.textes) {
      const phrases = phrasesDe([{ t: normaliser(t), ligne: 0 }]).map((p) => p.texte)
      for (const p of phrases.length ? phrases : [normaliser(t)]) {
        if (RE_MINUTE.test(p) && !RE_PRETE.test(p)) echecs.push(`${relTextes} : PR-1 « ${court(p, 90)} »`)
        if (RE_SECONDE.test(p)) echecs.push(`${relTextes} : PR-2 « ${court(p, 90)} »`)
        const f4 = promesseSeule(p)
        if (f4) echecs.push(`${relTextes} : PR-4 [${f4}] « ${court(p, 90)} »`)
        for (const r of reglesPR7(p)) echecs.push(`${relTextes} : PR-7 ${r.motif}`)
      }
    }
    if (!echecs.length) faits.push(`${pourquoi} : ${relTextes} (${j.textes.length} texte(s), sha256 de ${relVideo} à jour) passe PR-1, PR-2, PR-4 et PR-7`)
  }
  return { ok: !echecs.length, echecs, faits }
}

// ── Sondes : chaque détecteur doit voir les fautes et laisser les phrases justes ──────────────────────────────────────────
const S = (chemin, source) => ({ chemin, source })
export const SONDES_TEXTE = [
  // PR-1 : vues
  { id: 'PR-1', voit: true, nom: 'apostrophe droite', f: S('app/s1.ts', 'export const T = "Presti — Répondez en moins d\'une minute"\nexport const D = "Presti prépare la réponse."') },
  { id: 'PR-1', voit: true, nom: 'apostrophe typographique', f: S('lib/s2.ts', "export const a = 'Réponse en moins d’une minute'") },
  { id: 'PR-1', voit: true, nom: '&apos; en JSX', f: S('app/s3.tsx', 'export const A = () => <p>Réponse en moins d&apos;une minute</p>') },
  { id: 'PR-1', voit: true, nom: '&#39; coupé par <b>', f: S('app/s4.tsx', 'export const A = () => <p>Presti répond en moins d&#39;une <b>minute</b>, jour et nuit.</p>') },
  { id: 'PR-1', voit: true, nom: 'insécable et \\u2019 échappé', f: S('lib/s5.ts', "export const a = 'moins d\\u2019une\u00a0minute'") },
  { id: 'PR-1', voit: true, nom: 'deux phrases', f: S('app/s6.ts', "export const a = 'Presti prépare votre devis. La réponse part en moins d’une minute.'") },
  { id: 'PR-1', voit: true, nom: 'commentaire', f: S('app/s7.ts', "// Presti répond en moins d'une minute\nexport const x = 1") },
  { id: 'PR-1', voit: true, nom: 'variante sans la condition', f: S('app/s8.tsx', "export const A = ({ ok }: { ok: boolean }) => <p>Réponse en moins d’une minute{ok ? ', prête à envoyer' : ''}</p>") },
  { id: 'PR-1', voit: true, nom: 'gabarit', f: S('app/s9.ts', "const m = 'minute'\nexport const a = `Presti répond en moins d’une ${m === 'x' ? 'heure' : 'minute'}`") },
  { id: 'PR-1', voit: true, nom: 'synonyme 60 secondes', f: S('app/s10.ts', "export const a = 'Réponse en moins de 60 secondes'") },
  { id: 'PR-1', voit: true, nom: 'titre puis description prête (pas de débordement)', f: S('app/s11.tsx', 'export const A = () => <div><h1>Réponse en moins d&apos;une minute</h1><p>Presti la prépare, vous l’envoyez.</p></div>') },
  // PR-1 : vues sous une autre graphie (relecture du 24/09)
  { id: 'PR-1', voit: true, nom: 'coupé par <br />', f: S('app/s43.tsx', 'export const A = () => <p>Presti répond en moins d’une<br />minute.</p>') },
  { id: 'PR-1', voit: true, nom: 'coupé par un composant', f: S('app/s44.tsx', 'const M = ({ children }: { children: string }) => <>{children}</>\nexport const A = () => <p>Presti répond en moins d’une <M>minute</M>.</p>') },
  { id: 'PR-1', voit: true, nom: 'o cyrillique', f: S('app/s45.ts', "export const a = 'Presti répond en mоins d’une minute'") },
  { id: 'PR-1', voit: true, nom: 'espace de largeur nulle', f: S('app/s46.ts', "export const a = 'Presti répond en moi​ns d’une minute'") },
  { id: 'PR-1', voit: true, nom: '[…].join en JSX', f: S('app/s47.tsx', "export const A = () => <p>Presti répond {['en moins', 'd’une', 'minute'].join(' ')}.</p>") },
  { id: 'PR-1', voit: true, nom: '[…].join hors JSX', f: S('lib/s48.ts', "export const a = ['Réponse en moins', 'd’une minute'].join(' ')") },
  // PR-1 : laissées
  { id: 'PR-1', voit: false, nom: 'réponse prête', f: S('app/s12.tsx', 'export const A = () => <p>Une réponse prête en moins d&apos;une minute.</p>') },
  { id: 'PR-1', voit: false, nom: 'phrase juste suivie d’un <br />', f: S('app/s49.tsx', 'export const A = () => <p>Une réponse prête en moins d’une minute.<br />Vous l’envoyez.</p>') },
  { id: 'PR-1', voit: false, nom: 'Presti la prépare', f: S('app/s13.ts', "export const a = 'Presti la prépare en moins d’une minute, vous l’envoyez.'") },
  { id: 'PR-1', voit: false, nom: 'exception platStats', f: S('lib/platStats.ts', "export const a = 'Répond en moins d’une minute'") },
  // PR-2
  { id: 'PR-2', voit: true, nom: 'démo', f: S('app/DemoSequence.tsx', "export const s = [{ titre: 'L’assistant répond, dans la seconde' }]") },
  { id: 'PR-2', voit: true, nom: 'aide hors notification', f: S('lib/aide.ts', "export const a = 'Le client reçoit sa réponse dans la seconde.'") },
  { id: 'PR-2', voit: true, nom: 'coupé par <br />', f: S('app/s50.tsx', 'export const A = () => <p>L’assistant répond dans la<br />seconde.</p>') },
  { id: 'PR-2', voit: true, nom: 'suppression, hors commentaire', f: S('app/api/account/delete/route.ts', "export const a = 'Votre compte est supprimé dans la seconde.'") },
  { id: 'PR-2', voit: false, nom: 'test de notification', f: S('lib/aide.ts', "export const a = 'Touchez « M’envoyer un test » : la notification doit arriver dans la seconde.'") },
  { id: 'PR-2', voit: false, nom: 'commentaire de la suppression', f: S('app/api/account/delete/route.ts', '// Avant, ce bouton supprimait tout dans la seconde.\nexport const x = 1') },
  // PR-3
  { id: 'PR-3', voit: true, nom: 'accroche', f: S('lib/s20.ts', "export const P = { studio: { label: 'Studio', accroche: 'Présence en ligne soignée, et l’assistant qui répond seul.' } }") },
  { id: 'PR-3', voit: true, nom: 'Inclus dès {…}', f: S('app/s21.tsx', "export const A = ({ n }: { n: number }) => <span>Inclus dès {n === 2 ? 'Studio' : 'Signature'}</span>") },
  { id: 'PR-3', voit: true, nom: 'Inclus dès ${PLANS.studio.label}', f: S('app/s22.ts', 'declare const PLANS: any\nexport const a = `Inclus dès ${PLANS.studio.label}`') },
  { id: 'PR-3', voit: true, nom: 'Inclus dans l&apos;offre Signature', f: S('app/s23.tsx', 'export const A = () => <small>Montrez vos chantiers. Inclus dans l&apos;offre Signature.</small>') },
  { id: 'PR-3', voit: false, nom: 'Studio seul', f: S('app/s24.tsx', 'export const A = () => <p>Avec Studio, l’assistant peut répondre seul.</p>') },
  // PR-4 : vues
  { id: 'PR-4', voit: true, nom: 'y répond automatiquement', f: S('app/s30.ts', "export const a = 'Chaque demande arrive dans votre espace, Presti y répond automatiquement, et vous génère un devis.'") },
  { id: 'PR-4', voit: true, nom: 'qui répond seul, sans offre', f: S('app/s31.ts', "export const a = 'L’assistant qui répond seul, jour et nuit.'") },
  { id: 'PR-4', voit: true, nom: 'à votre place', f: S('app/s32.ts', "export const a = 'Presti répond à vos clients, jour et nuit, à votre place.'") },
  { id: 'PR-4', voit: true, nom: 'tout seul coupé par <b>', f: S('app/s33.tsx', 'export const A = () => <p>Presti <b>répond</b> tout seul.</p>') },
  { id: 'PR-4', voit: true, nom: 'peut répondre seule (IA)', f: S('app/s34.ts', "export const a = 'L’IA peut répondre seule à vos prospects.'") },
  { id: 'PR-4', voit: true, nom: 'pronom il', f: S('app/s35.tsx', 'export const A = () => <p>Presti est votre standard. Il y répond automatiquement.</p>') },
  // PR-4 : laissées
  { id: 'PR-4', voit: false, nom: 'avec Studio ou Signature', f: S('app/s36.ts', "export const a = 'Avec Studio ou Signature, l’assistant peut répondre seul, jour et nuit.'") },
  { id: 'PR-4', voit: false, nom: 'accroche de studio (label sœur)', f: S('lib/s37.ts', "export const P = { studio: { label: 'Studio', accroche: 'L’assistant qui répond seul, jour et nuit.' } }") },
  { id: 'PR-4', voit: false, nom: 'négation', f: S('lib/s38.ts', "export const a = 'Un client écrit « fuite » : l’assistant ne répond pas seul, vous êtes alerté.'") },
  { id: 'PR-4', voit: false, nom: 'relance automatique', f: S('app/s39.ts', "export const a = 'Presti prépare la réponse et relance automatiquement jusqu’à la réponse.'") },
  { id: 'PR-4', voit: false, nom: 'liste de modes', f: S('app/s40.ts', "export const a = 'Réglez comment l’assistant répond à vos clients : automatiquement, après votre validation, ou jamais.'") },
  { id: 'PR-4', voit: false, nom: 'une seule question', f: S('app/s41.ts', "export const a = 'Presti répond à une seule question à la fois.'") },
  { id: 'PR-4', voit: false, nom: 'la signature du devis', f: S('app/s42.ts', "export const a = 'Presti relance tout seul jusqu’à la signature, et prépare la réponse.'") },
]
const LAYOUT_OK = 'const TITLE = "Presti — la réponse prête, vous l’envoyez"\nconst DESC = "Chaque demande arrive dans Presti."\nexport const metadata = { title: { default: TITLE, template: "%s · Presti" }, description: DESC }'
const PAGE_OK = "export const X = { description: 'Chaque demande arrive dans Presti.' }"
const MANIF_OK = "export default function m() { return { name: 'Presti', description: 'Chaque demande arrive dans Presti.' } }"
export const SONDES_META = [
  { voit: false, nom: 'conforme', f: { layout: LAYOUT_OK, page: PAGE_OK, manifest: MANIF_OK } },
  { voit: false, nom: '70 et 160 signes pile', f: { layout: `export const metadata = { title: '${'a'.repeat(70)}', description: '${'b'.repeat(160)}' }`, page: PAGE_OK, manifest: MANIF_OK } },
  { voit: true, nom: 'titre de 71 signes', f: { layout: `const TITLE = '${'a'.repeat(71)}'\nexport const metadata = { title: { default: TITLE }, description: 'x' }`, page: PAGE_OK, manifest: MANIF_OK } },
  { voit: true, nom: 'description de 161 signes (concaténation)', f: { layout: `const D = '${'b'.repeat(100)}' + '${'c'.repeat(61)}'\nexport const metadata = { title: 'T', description: D }`, page: PAGE_OK, manifest: MANIF_OK } },
  { voit: true, nom: 'description vide', f: { layout: LAYOUT_OK, page: "export const X = { description: '   ' }", manifest: MANIF_OK } },
  { voit: true, nom: 'manifeste sans description', f: { layout: LAYOUT_OK, page: PAGE_OK, manifest: "export default function m() { return { name: 'Presti' } }" } },
  { voit: true, nom: 'titre non résolu', f: { layout: "declare function f(): string\nexport const metadata = { title: f(), description: 'x' }", page: PAGE_OK, manifest: MANIF_OK } },
  { voit: true, nom: 'layout vide', f: { layout: '', page: PAGE_OK, manifest: MANIF_OK } },
]
const PLANS_BASE = "export const PLANS = {\n  essentiel: { label: 'Essentiel', accroche: 'Pour ne plus louper une demande.', prixMois: 29 },\n  studio: { label: 'Studio', accroche: 'Présence en ligne soignée.', prixMois: 59 },\n}\nexport const G = { studio: 'Standard + Pro' }\n"
export const SONDES_PLANS = [
  { voit: false, nom: 'accroche de studio changée', apres: PLANS_BASE.replace('Présence en ligne soignée.', () => 'L’assistant qui répond seul, jour et nuit.') },
  { voit: false, nom: 'identique, en CRLF', apres: PLANS_BASE.replace(/\n/g, '\r\n') },
  { voit: true, nom: 'prix changé', apres: PLANS_BASE.replace('prixMois: 59', () => 'prixMois: 58') },
  { voit: true, nom: 'accroche d’essentiel changée', apres: PLANS_BASE.replace('Pour ne plus louper une demande.', () => 'Autre.') },
  { voit: true, nom: 'accroche de studio vide', apres: PLANS_BASE.replace('Présence en ligne soignée.', () => '') },
  { voit: true, nom: 'accroche de studio calculée', apres: PLANS_BASE.replace("'Présence en ligne soignée.'", () => 'String(1)') },
  { voit: true, nom: 'fichier vide', apres: '' },
]
// PR-7 : des scènes de landing (fichiers app/…) ; mots d'escalade ceux de lib/plateformeConfig.ts par défaut
const ESC = ['urgence', 'fuite', 'degat des eaux', 'inondation', 'gaz', 'assurance']
export const SONDES_LANDING = [
  { voit: true, nom: 'barre « réponse en direct »', f: S('app/H1.tsx', 'export const A = () => <div><span className="u">presti · réponse en direct</span></div>') },
  { voit: true, nom: '« répondu en 41 s »', f: S('app/H2.tsx', 'export const A = () => <div className="b">Bonjour Marie.<span className="st">Presti · répondu en 41 s</span></div>') },
  { voit: true, nom: '« répond en 30 secondes »', f: S('app/H3.tsx', "export const t = 'L’assistant répond en 30 secondes.'") },
  { voit: true, nom: '« dans la seconde »', f: S('app/H4.tsx', 'export const A = () => <p>Réponse envoyée dans la seconde.</p>') },
  { voit: true, nom: '« je vous rappelle dans la journée »', f: S('app/H5.tsx', 'export const A = () => <p>Bonjour Marie ! Je vous rappelle dans la journée pour convenir d&apos;un passage.</p>') },
  { voit: true, nom: '« j’arrive demain »', f: S('app/H6.tsx', "export const t = 'Bien reçu, j’arrive demain matin.'") },
  { voit: true, nom: '« nous passons sous 48 h »', f: S('app/H7.tsx', "export const t = 'Nous passons sous 48 h.'") },
  { voit: true, nom: 'fuite sans alerte', f: S('app/H8.tsx', 'export const A = () => <div><p>Fuite sous mon évier, vous pouvez passer ?</p><p>Presti a préparé une réponse, à envoyer.</p></div>') },
  { voit: false, nom: 'réponse préparée, sans date', f: S('app/H9.tsx', 'export const A = () => <div><span>presti · demande entrante</span><p>Bonjour, je voudrais changer mon chauffe-eau.</p><p>Presti a préparé une réponse, à valider avant l’envoi.</p></div>') },
  { voit: false, nom: 'fuite avec alerte', f: S('app/H10.tsx', 'export const A = () => <div><p>Fuite sous mon évier, vous pouvez passer ?</p><p>Mot d’urgence repéré : vous êtes alerté tout de suite, Presti ne répond pas à votre place.</p></div>') },
  { voit: false, nom: 'question du prospect datée', f: S('app/H11.tsx', 'export const A = () => <p>Vous pouvez passer cette semaine ?</p>') },
  { voit: false, nom: 'commentaire', f: S('app/H12.tsx', '// l’ancienne scène disait « répondu en 41 s »\nexport const x = 1') },
]
// PR-8 : lib/flags.ts, app/page.tsx, app/DemoVideo.tsx et un public/ simulé
const FLAGS_V = (v) => `export const FLAGS = {\n  /** §5 — vidéo hero */\n  landingVideo: ${v},\n  audience: true,\n} as const\n`
const PAGE_V = "import DemoVideo from '@/app/DemoVideo'\nimport DemoSequence from '@/app/DemoSequence'\nimport { FLAGS } from '@/lib/flags'\nexport default function P() { return <main>{FLAGS.landingVideo ? <DemoVideo /> : <DemoSequence />}</main> }\n"
const PAGE_NUE = "import DemoVideo from '@/app/DemoVideo'\nexport default function P() { return <main><DemoVideo /></main> }\n"
const VIDEO_V = 'export default function DemoVideo() { return <video src="/demo/hero.mp4" muted /> }\n'
const MP4 = Buffer.from('vidéo de sonde')
const SHA = crypto.createHash('sha256').update(MP4).digest('hex')
const TEXTES = (textes, sha = SHA) => Buffer.from(JSON.stringify({ video: 'public/demo/hero.mp4', sha256: sha, textes }))
const LANDING_V = (page) => [S('app/page.tsx', page), S('app/DemoVideo.tsx', VIDEO_V), S('app/DemoSequence.tsx', 'export default function DemoSequence() { return <ol><li>Une demande arrive dans Presti.</li></ol> }\n')]
const PUBLIC_V = (textes) => (rel) => (rel === 'public/demo/hero.mp4' ? MP4 : rel === 'public/demo/hero.textes.json' ? textes : null)
export const SONDES_VIDEO = [
  { voit: false, nom: 'drapeau baissé, vidéo sous le drapeau', f: { flags: FLAGS_V('false'), landing: LANDING_V(PAGE_V), lire: PUBLIC_V(null) } },
  { voit: true, nom: 'drapeau levé, sans liste des textes', f: { flags: FLAGS_V('true'), landing: LANDING_V(PAGE_V), lire: PUBLIC_V(null) } },
  { voit: true, nom: 'drapeau levé, texte « dans la seconde »', f: { flags: FLAGS_V('true'), landing: LANDING_V(PAGE_V), lire: PUBLIC_V(TEXTES(['L’assistant répond dans la seconde, dans votre ton.'])) } },
  { voit: true, nom: 'drapeau levé, liste d’une autre vidéo (sha256)', f: { flags: FLAGS_V('true'), landing: LANDING_V(PAGE_V), lire: PUBLIC_V(TEXTES(['Chaque demande arrive dans Presti.'], '0'.repeat(64))) } },
  { voit: false, nom: 'drapeau levé, textes justes et à jour', f: { flags: FLAGS_V('true'), landing: LANDING_V(PAGE_V), lire: PUBLIC_V(TEXTES(['Chaque demande arrive dans Presti.', 'La réponse est prête en moins d’une minute : Presti la prépare, vous l’envoyez.'])) } },
  { voit: true, nom: 'drapeau calculé, sans liste', f: { flags: FLAGS_V("process.env.X === '1'"), landing: LANDING_V(PAGE_V), lire: PUBLIC_V(null) } },
  { voit: true, nom: 'drapeau baissé mais vidéo rendue sans condition', f: { flags: FLAGS_V('false'), landing: LANDING_V(PAGE_NUE), lire: PUBLIC_V(null) } },
]
/** Éprouve les détecteurs sur les sondes. → Map(id → { ok, echecs, n }) */
export function eprouver() {
  const out = new Map(IDS.map((id) => [id, { ok: true, echecs: [], n: 0 }]))
  const r7 = out.get('PR-7')
  for (const s of SONDES_LANDING) { r7.n++; let v; try { v = examinerLanding([s.f], { escalade: ESC }) } catch (e) { r7.ok = false; r7.echecs.push(`sonde « ${s.nom} » : ${premiereLigne(e)}`); continue } if ((v.length > 0) !== s.voit) { r7.ok = false; r7.echecs.push(`sonde « ${s.nom} » ${s.voit ? 'non vue' : `vue à tort (${court(v[0]?.motif, 70)})`}`) } }
  const r8 = out.get('PR-8')
  for (const s of SONDES_VIDEO) { r8.n++; let x; try { x = examinerVideo(s.f) } catch (e) { r8.ok = false; r8.echecs.push(`sonde « ${s.nom} » : ${premiereLigne(e)}`); continue } if (x.ok === s.voit) { r8.ok = false; r8.echecs.push(`sonde « ${s.nom} » ${s.voit ? 'non vue' : `vue à tort (${court(x.echecs[0], 90)})`}`) } }
  for (const s of SONDES_TEXTE) {
    const r = out.get(s.id)
    r.n++
    let v
    try { v = examinerTexte([s.f]) } catch (e) { r.ok = false; r.echecs.push(`sonde « ${s.nom} » : ${premiereLigne(e)}`); continue }
    const vu = v.violations[s.id].length > 0
    if (vu !== s.voit) { r.ok = false; r.echecs.push(`sonde « ${s.nom} » ${s.voit ? 'non vue' : `vue à tort (${court(v.violations[s.id][0]?.phrase, 70)})`}`) }
    if (!s.voit && v.erreurs.length) { r.ok = false; r.echecs.push(`sonde « ${s.nom} » : ${v.erreurs[0]}`) }
  }
  const r5 = out.get('PR-5')
  for (const s of SONDES_META) { r5.n++; const x = examinerMeta(s.f); if (x.ok === s.voit) { r5.ok = false; r5.echecs.push(`sonde « ${s.nom} » ${s.voit ? 'non vue' : `vue à tort (${x.echecs[0]})`}`) } }
  const r6 = out.get('PR-6')
  for (const s of SONDES_PLANS) { r6.n++; const x = comparerPlans(PLANS_BASE, s.apres, 'la sonde'); if (x.ok === s.voit) { r6.ok = false; r6.echecs.push(`sonde « ${s.nom} » ${s.voit ? 'non vue' : `vue à tort (${x.echecs[0]})`}`) } }
  return out
}

// ── Le témoin ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
/**
 * app/ et lib/ du commit de base (corrections.json, 1620723) extraits sous .orchestre/travail/promesses-qa/temoin/, corrigés
 * par corrections.json, marqués temoin.json. → { dest, commit, fichiers, corrections, defauts[] }
 */
export function construireTemoin() {
  const conf = lireJson(CORRECTIONS)
  const defauts = []
  if (!Array.isArray(conf.corrections) || !conf.corrections.length) throw new Error('corrections.json : liste « corrections » vide')
  const sha = revParse(conf.base || REFERENCE_COMMIT)
  const dest = dossierTravail(JUGE, 'temoin')
  const tar = exigerSousTravail(path.join(TRAVAIL, JUGE, 'temoin.tar'))
  fs.rmSync(tar, { force: true })
  let x
  try {
    const g = git(['-c', 'core.autocrlf=false', '-c', 'core.eol=lf', 'archive', '--format=tar', `--output=${tar.split(path.sep).join('/')}`, sha, 'app', 'lib'])
    if (g.code !== 0 || !fs.existsSync(tar)) throw new Error(`git archive ${sha.slice(0, 7)} app lib en échec : ${court(g.stderr || g.erreur)}`)
    x = extraireTar(tar, dest)
  } finally { fs.rmSync(tar, { force: true }) }
  fs.writeFileSync(`${dest}.json`, `${JSON.stringify({ commit: sha, par: 'scripts/promesses-qa.mjs --temoin', fichiers: x.fichiers }, null, 1)}\n`)
  const touches = new Set()
  for (const c of conf.corrections) {
    if (typeof c.fichier !== 'string' || typeof c.ancien !== 'string' || typeof c.nouveau !== 'string' || !c.ancien) { defauts.push(`correction mal formée : ${court(JSON.stringify(c), 80)}`); continue }
    if (!PERIMETRES.has(c.fichier)) defauts.push(`${c.fichier} hors des périmètres de 025-05 et 025-06`)
    const f = path.join(dest, c.fichier)
    if (!sous(dest, f) || !fs.existsSync(f)) { defauts.push(`${c.fichier} absent du témoin`); continue }
    const src = fs.readFileSync(f, 'utf8')
    const n = src.split(c.ancien).length - 1
    if (n !== 1) { defauts.push(`${c.fichier} : « ${court(c.ancien, 60)} » trouvé ${n} fois, 1 attendue`); continue }
    fs.writeFileSync(f, src.replace(c.ancien, () => c.nouveau))
    touches.add(c.fichier)
  }
  return { dest, commit: sha, fichiers: x.fichiers, corrections: conf.corrections.length, touches: [...touches], defauts }
}

// ── PR-9 à PR-12 (revue avant mise en ligne du 25/09, fiche 025-20) ──────────────────────────────────────────────────────
/** Transpile et charge un module de <racine>/lib (et ce qu'il importe par ./ ou @/) ; tout autre import est une doublure muette. */
function chargerLib(racine, relatif) {
  const caches = new Map()
  const muet = () => new Proxy(function () {}, { get: (_, k) => (k === 'then' ? undefined : muet()), apply: () => muet() })
  const charger = (f) => {
    if (caches.has(f)) return caches.get(f).exports
    const js = ts.transpileModule(fs.readFileSync(f, 'utf8'), { fileName: f, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
    const module = { exports: {} }
    caches.set(f, module)
    const req = (spec) => {
      const base = spec.startsWith('@/') ? path.join(racine, spec.slice(2)) : spec.startsWith('.') ? path.resolve(path.dirname(f), spec) : null
      if (base) for (const e of ['', '.ts', '/index.ts']) if (fs.existsSync(base + e) && fs.statSync(base + e).isFile()) return charger(base + e)
      return muet()
    }
    new Function('exports', 'require', 'module', '__filename', '__dirname', 'process', js)(module.exports, req, module, f, path.dirname(f), { env: {} })
    return module.exports
  }
  const f = path.join(racine, relatif)
  if (!fs.existsSync(f)) throw new Error(`${relatif} absent`)
  return charger(f)
}
const textesDeValeur = (o) => (typeof o === 'string' ? [o] : Array.isArray(o) ? o.flatMap(textesDeValeur) : o && typeof o === 'object' ? Object.values(o).flatMap(textesDeValeur) : [])
const texteUnite = (u) => normaliser(u.variantes.map((v) => v.map((x) => x.t).join('')).join(' ').split(PARA).join(' '))
/** PR-9 : les défauts d'une unité de la FAQ pour un coût Expert `n` → liste (pur) */
export function defautsCoutCredit(texte, n) {
  const t = normaliser(texte)
  if (!/(?<![\p{L}\d])1\s*crédit\s*=/iu.test(t)) return []
  const ok = /expert/i.test(t) && new RegExp(`(?<!\\d)${n}\\s*crédits|en\\s+consomme\\s+${n}(?!\\d)|consomme\\s+${n}(?!\\d)`, 'iu').test(t)
  return ok ? [] : [`« ${court(t, 110)} » : le coût du modèle Expert (${n} crédits) n’y est pas`]
}
/** PR-9 : une phrase qui donne au modèle Expert un autre coût que `n` → liste (pur) */
export function defautsCoutExpert(phrase, n) {
  const m = /expert\s*(?:=|:|consomme|en\s+consomme|coûte)\s*(\d+)\s*crédits?|(\d+)\s*crédits?\s+(?:avec|pour)\s+(?:le\s+)?(?:modèle\s+)?expert/iu.exec(normaliser(phrase))
  if (!m) return []
  const k = Number(m[1] ?? m[2])
  return k === n ? [] : [`« ${court(phrase, 100)} » : Expert à ${k} crédit(s), ${n} dans lib/plans.ts`]
}
function jugerPR9(racine, corpus) {
  const echecs = [], faits = []
  const plans = corpus.fichiers.find((f) => f.chemin === 'lib/plans.ts')?.source || ''
  const n = Number((/CREDIT_COST[^=]*=\s*\{[^}]*\bexpert\s*:\s*(\d+)/.exec(plans) || [])[1])
  if (!n) return { echecs: ['lib/plans.ts : CREDIT_COST.expert illisible'], faits }
  const PAGE_FAQ = 'app/faq/page.tsx'
  const page = corpus.fichiers.find((f) => f.chemin === PAGE_FAQ)
  if (!page) return { echecs: [`${PAGE_FAQ} absent`], faits }
  // La FAQ montrée par /faq : la page et les sources de texte qu'elle importe et lit (lib/faq.ts depuis 000-geo-presti, 27/09).
  const montree = new Set([PAGE_FAQ, ...sourcesUtilisees(PAGE_FAQ, page.source)])
  // Les textes de la FAQ où qu'ils soient : la page et toutes ses sources déclarées, même non importées (l'accueil lit lib/faq.ts).
  const textesFaq = corpus.fichiers.filter((f) => f.chemin === PAGE_FAQ || (SOURCES_DE_TEXTE[PAGE_FAQ] || []).includes(f.chemin))
  let unitesCredit = 0
  for (const f of textesFaq) for (const u of unitesDeTexte(f.chemin, f.source).unites) {
    if (u.genre === 'commentaire') continue
    const t = texteUnite(u)
    if (/(?<![\p{L}\d])1\s*crédit\s*=/iu.test(t) && montree.has(f.chemin)) unitesCredit++
    for (const d of defautsCoutCredit(t, n)) echecs.push(`${f.chemin}:${u.ligne} ${d}`)
  }
  for (const f of corpus.fichiers.filter((x) => x.chemin === 'app/page.tsx' || textesFaq.includes(x))) for (const u of unitesDeTexte(f.chemin, f.source).unites) {
    if (u.genre === 'commentaire') continue
    for (const v of u.variantes) for (const p of phrasesDe(v)) for (const d of defautsCoutExpert(p.texte, n)) echecs.push(`${f.chemin}:${p.ligne} ${d}`)
  }
  const sondes = [defautsCoutCredit('1 crédit = 1 réponse ou 1 devis généré par l’IA.', n).length === 1, !defautsCoutCredit(`1 crédit = 1 réponse ou 1 devis (${n} crédits avec le modèle Expert).`, n).length, defautsCoutExpert(`Expert = ${n + 1} crédits`, n).length === 1]
  if (sondes.some((x) => !x)) echecs.push(`détecteur : sonde(s) mal jugée(s) (${sondes.map((x, i) => (x ? '' : i + 1)).filter(Boolean).join(', ')})`)
  if (!unitesCredit) echecs.push(`la FAQ (${[...montree].join(' + ')}) ne dit plus ce que vaut un crédit (« 1 crédit = … »)`)
  if (!echecs.length) faits.push(`${unitesCredit} unité(s) de la FAQ (${[...montree].join(' + ')}) disent « 1 crédit = … » avec le coût Expert (${n} crédits, lib/plans.ts) ; aucun autre coût Expert (${textesFaq.map((f) => f.chemin).join(', ')}, app/page.tsx) ; détecteur éprouvé sur 3 sondes`)
  return { echecs: [...new Set(echecs)], faits }
}
const NOMBRES_RELANCES = { deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6 }
/** PR-10 : les défauts d'une phrase sur les relances pour `n` relances → liste (pur) */
export function defautsRelances(phrase, n) {
  const t = normaliser(phrase), d = []
  if (/relanc/iu.test(t) && /jusqu’\s*(?:à|au)\s+(?:la\s+|leur\s+|sa\s+|votre\s+|une\s+)?(?:réponse|signature)|jusqu’\s*à\s+ce\s+qu/iu.test(t)) d.push(`« ${court(t, 110)} » : les relances s’arrêtent après ${n}, pas « jusqu’à la réponse »`)
  const m = /(?<![\p{L}\d])(\d+|deux|trois|quatre|cinq|six)\s+relances?(?![\p{L}])/iu.exec(t)
  if (m) { const k = /^\d+$/.test(m[1]) ? Number(m[1]) : NOMBRES_RELANCES[m[1].toLowerCase()]; if (k !== n) d.push(`« ${court(t, 100)} » : ${k} relances, ${n} dans lib/relances.ts`) }
  return d
}
function jugerPR10(corpus) {
  const echecs = [], faits = []
  const src = corpus.fichiers.find((f) => f.chemin === 'lib/relances.ts')?.source || ''
  const cad = /CADENCE_RELANCES\s*=\s*\[([^\]]*)\]/.exec(src)
  const n = cad ? cad[1].split(',').filter((x) => x.trim()).length : 0
  if (!n) return { echecs: ['lib/relances.ts : CADENCE_RELANCES illisible'], faits }
  let vues = 0
  for (const f of corpus.fichiers) for (const u of unitesDeTexte(f.chemin, f.source).unites) {
    if (u.genre === 'commentaire') continue
    for (const v of u.variantes) for (const p of phrasesDe(v)) { if (/relanc/i.test(p.texte)) vues++; for (const d of defautsRelances(p.texte, n)) echecs.push(`${f.chemin}:${p.ligne} ${d}`) }
  }
  const sondes = [defautsRelances('Les relances sont automatiques jusqu’à la réponse.', n).length === 1, defautsRelances('Presti relance automatiquement vos prospects jusqu’à leur réponse.', n).length === 1, !defautsRelances(`${n === 3 ? 'Trois' : n} relances automatiques, puis rien.`, n).length]
  if (sondes.some((x) => !x)) echecs.push(`détecteur : sonde(s) mal jugée(s) (${sondes.map((x, i) => (x ? '' : i + 1)).filter(Boolean).join(', ')})`)
  if (!echecs.length) faits.push(`${vues} phrase(s) sur les relances dans app/ et lib/ : aucune « jusqu’à la réponse », nombre de relances = ${n} (CADENCE_RELANCES) ; détecteur éprouvé sur 3 sondes`)
  return { echecs: [...new Set(echecs)], faits }
}
/** PR-11 : les défauts de textes d'aide pour l'offre `offre` → liste (pur) */
export function defautsModeAuto(textes, offre) {
  return textes.filter((t) => /(?<!\p{L})automatique(?!\p{L})/iu.test(t) && !new RegExp(`(?<!\\p{L})${offre}(?!\\p{L})`, 'u').test(t)).map((t) => `« ${court(t, 110)} » propose le mode Automatique sans dire qu’il faut l’offre ${offre}`)
}
function jugerPR11(racine) {
  let aide, plans
  try { aide = chargerLib(racine, 'lib/aide.ts'); plans = chargerLib(racine, 'lib/plans.ts') } catch (e) { return { echecs: [`lib/aide.ts ou lib/plans.ts non chargé : ${premiereLigne(e)}`], faits: [] } }
  const cles = Object.keys(plans.PLANS || {})
  const k = cles.find((p) => { try { return plans.peut(p, 'plateforme.ia.auto') === true } catch { return false } })
  const offre = k ? (plans.PLANS[k].label || k) : null
  if (!offre) return { echecs: ['lib/plans.ts : aucune offre ne permet plateforme.ia.auto'], faits: [] }
  const art = (aide.ARTICLES || []).find((a) => a.id === 'plateforme')
  if (!art) return { echecs: ['article d’aide « plateforme » absent'], faits: [] }
  const textes = textesDeValeur(art)
  const echecs = defautsModeAuto(textes, offre)
  const sondes = [defautsModeAuto(['Choisissez le mode de réponse : Automatique, Assistée ou Manuelle.'], offre).length === 1, !defautsModeAuto([`Automatique (${offre} et au-delà), Assistée ou Manuelle.`], offre).length, !defautsModeAuto(['Chaque devis généré automatiquement consomme un crédit.'], offre).length]
  if (sondes.some((x) => !x)) echecs.push('détecteur : sonde(s) mal jugée(s)')
  return { echecs, faits: echecs.length ? [] : [`article « plateforme » : ${textes.filter((t) => /(?<!\p{L})automatique(?!\p{L})/iu.test(t)).length} texte(s) qui nomment le mode Automatique, chacun avec l’offre ${offre} (première offre où plateforme.ia.auto est permis, lib/plans.ts) ; détecteur éprouvé sur 3 sondes`] }
}
const RE_SUPPRIME_SITE = /supprim\p{L}*\s+(?:le|votre|un|du)\s+site|site[^.]{0,60}?supprim/iu
/** PR-12 : les défauts de textes d'aide → liste (pur) */
export function defautsSuppressionSite(textes, sectionDonnees) {
  const d = []
  const promesses = textes.filter((t) => RE_SUPPRIME_SITE.test(t))
  for (const t of promesses) if (!/Données\s*&(?:amp;)?\s*confidentialité/u.test(t)) d.push(`« ${court(t, 110)} » : la suppression du site est promise ailleurs que dans Paramètres → Données & confidentialité`)
  if (promesses.length && !/id:\s*'site_supprimer'/.test(sectionDonnees || '')) d.push('app/parametres/SectionDonnees.tsx ne propose plus « site_supprimer »')
  return d
}
function jugerPR12(racine) {
  let aide
  try { aide = chargerLib(racine, 'lib/aide.ts') } catch (e) { return { echecs: [`lib/aide.ts non chargé : ${premiereLigne(e)}`], faits: [] } }
  const textes = (aide.ARTICLES || []).flatMap(textesDeValeur)
  const f = path.join(racine, 'app', 'parametres', 'SectionDonnees.tsx')
  const sd = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : ''
  const echecs = defautsSuppressionSite(textes, sd)
  const sondes = [defautsSuppressionSite(['Si vous avez un site existant, vous pouvez le supprimer depuis « Données & suppressions ».'], "{ id: 'site_supprimer' }").length === 1, !defautsSuppressionSite(['Pour supprimer votre site : Paramètres → Données & confidentialité.'], "{ id: 'site_supprimer' }").length, defautsSuppressionSite(['Pour supprimer votre site : Paramètres → Données & confidentialité.'], '').length === 1]
  if (sondes.some((x) => !x)) echecs.push('détecteur : sonde(s) mal jugée(s)')
  const n = textes.filter((t) => RE_SUPPRIME_SITE.test(t)).length
  return { echecs, faits: echecs.length ? [] : [`${textes.length} texte(s) des articles d’aide : ${n} promesse(s) de suppression du site, ${n ? 'chacune vers Paramètres → Données & confidentialité (site_supprimer proposé)' : 'aucune'} ; détecteur éprouvé sur 3 sondes`] }
}

// ── API pour constructeur-ferme-qa (CF-7) ─────────────────────────────────────────────────────────────────────────────────
/** PR-1 sur un fichier de `racine` (défaut app/profil/page.tsx) → { ok, violations, phrases, erreurs } ; fichier absent ou vide : ok false. */
export function pr1Fichier(racine = R, chemin = 'app/profil/page.tsx') {
  const f = path.join(racine, chemin)
  const source = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : ''
  if (!source.trim()) return { ok: false, violations: [], phrases: 0, erreurs: [`${chemin} absent ou vide`] }
  const ex = examinerTexte([{ chemin, source }])
  return { ok: ex.violations['PR-1'].length === 0 && ex.erreurs.length === 0 && ex.phrases > 0, violations: ex.violations['PR-1'], phrases: ex.phrases, erreurs: ex.erreurs }
}

// ── Le juge ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function juger() {
  const o = lireOptionsOuQuitter(process.argv.slice(2), { connues: ['critere'] })
  if (o.reel) { console.error('✗ promesses-qa n’a pas de mode --reel (le juge ne lit que des fichiers)'); process.exit(2) }
  if (o.positionnels.length) { console.error(`✗ argument inattendu : ${o.positionnels.join(' ')}`); process.exit(2) }
  if (o.temoin && !o.racineParDefaut) { console.error('✗ --temoin construit son propre arbre (commit de référence + corrections.json) : pas de --racine'); process.exit(2) }
  // --critere=PR-1,…,PR-8 (25/09) : seuls ces critères sont déclarés et imprimés (une fiche juge sa part : 025-19 garde PR-1 à
  // PR-8 pendant que PR-9 à PR-12 attendent 025-20) ; les verdicts des autres vont dans une sortie « ombre » jamais imprimée.
  const ids = o.valeur('critere') === undefined ? IDS : o.liste('critere')
  if (o.drapeau('critere') || !ids.length || ids.some((x) => !IDS.includes(x))) { console.error(`✗ --critere attend des critères de ${IDS.join(', ')}`); process.exit(2) }
  const s0 = creerSortie(JUGE, ids, { racine: o.racine, temoin: o.temoin })
  const ombre = creerSortie(JUGE, IDS, { racine: o.racine, temoin: o.temoin })
  const vers = (id) => (ids.includes(id) ? s0 : ombre)
  const s = { ...s0, passe: (id, d) => vers(id).passe(id, d), echoue: (id, d) => vers(id).echoue(id, d), verdict: (id, ok, a, b) => vers(id).verdict(id, ok, a, b), resultat: (id, r) => vers(id).resultat(id, r), evalue: (id) => vers(id).evalue(id), enEchec: (id) => vers(id).enEchec(id), note: (t) => s0.note(t) }
  if (ids !== IDS) s0.note(`--critere : seulement ${ids.join(', ')}`)
  await s0.executer(async () => {
    let racine = o.racine
    if (o.temoin) {
      const t = construireTemoin()
      s.note(`témoin : app/ et lib/ de ${t.commit.slice(0, 7)} (${t.fichiers} fichiers) dans ${path.relative(R, t.dest)}, ${t.corrections} correction(s) de ${path.relative(R, CORRECTIONS)} sur ${t.touches.length} fichier(s) : ${t.touches.join(', ')}`)
      if (t.defauts.length) { for (const id of IDS) s.echoue(id, `témoin invalide : ${t.defauts.slice(0, 2).join(' ; ')}`); return }
      racine = t.dest
    }
    const sondes = eprouver()
    const corpus = lireCorpus(racine)
    const ex = examinerTexte(corpus.fichiers)
    const manques = substance(corpus, ex)
    s.note(`${corpus.fichiers.length} fichiers .ts/.tsx lus sous app/ et lib/, ${ex.unites} unités de texte, ${ex.phrases} phrases examinées`)

    // relevé complet
    const tout = Object.values(ex.violations).flat()
    const releve = exigerSousTravail(path.join(TRAVAIL, JUGE, o.temoin ? 'releve-temoin.txt' : 'releve.txt'))
    fs.mkdirSync(path.dirname(releve), { recursive: true })
    fs.writeFileSync(releve, `${JUGE} — racine ${racine} — ${new Date().toISOString()}\n${tout.length} phrase(s) en défaut\n${tout.map((v) => `${v.id}\t${v.chemin}:${v.ligne}\t[${v.motif}]\t${v.phrase}`).join('\n')}\n${manques.length ? `\nsubstance :\n${manques.join('\n')}\n` : ''}`)
    if (tout.length || manques.length) s.note(`relevé complet : ${path.relative(R, releve)}`)

    const resume = { 'PR-1': '« moins d’une minute » toujours avec « prête » ou « prépare »', 'PR-2': '« dans la seconde » seulement aux deux exceptions', 'PR-3': 'aucune des quatre formules', 'PR-4': 'aucune réponse seule sans Studio ou Signature' }
    for (const id of ['PR-1', 'PR-2', 'PR-3', 'PR-4']) {
      const v = ex.violations[id]
      const so = sondes.get(id)
      for (const m of manques) s.echoue(id, `substance : ${m}`)
      for (const x of v) s.echoue(id, `${x.chemin}:${x.ligne} [${x.motif}] « ${court(x.phrase, 110)} »`)
      for (const e of so.echecs) s.echoue(id, `détecteur : ${e}`)
      if (!v.length && !manques.length && so.ok) s.passe(id, `${resume[id]} (${ex.phrases} phrases, ${corpus.fichiers.length} fichiers) ; détecteur éprouvé sur ${so.n} sondes`)
    }

    // PR-5
    const lire = (c) => { const f = path.join(racine, c); return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null }
    const m5 = examinerMeta({ layout: lire('app/layout.tsx'), page: lire('app/page.tsx'), manifest: lire('app/manifest.ts') })
    const so5 = sondes.get('PR-5')
    for (const e of m5.echecs) s.echoue('PR-5', e)
    for (const e of so5.echecs) s.echoue('PR-5', `détecteur : ${e}`)
    if (m5.ok && so5.ok) s.passe('PR-5', `${m5.faits.join(', ')} ; détecteur éprouvé sur ${so5.n} sondes`)

    // PR-7 : la landing
    const landing = fichiersLanding(racine)
    const escalade = motsEscalade(lire('lib/plateformeConfig.ts'))
    const v7 = examinerLanding(landing, { escalade })
    const so7 = sondes.get('PR-7')
    if (!landing.some((f) => f.chemin === 'app/page.tsx')) s.echoue('PR-7', 'app/page.tsx absent : pas de landing à lire')
    if (!escalade.length) s.echoue('PR-7', 'lib/plateformeConfig.ts : escalade_mots par défaut illisibles')
    for (const x of v7) s.echoue('PR-7', `${x.chemin}:${x.ligne} [${x.motif}] « ${court(x.phrase, 110)} »`)
    for (const e of so7.echecs) s.echoue('PR-7', `détecteur : ${e}`)
    for (const m of manques) s.echoue('PR-7', `substance : ${m}`)
    if (!s.enEchec('PR-7')) s.passe('PR-7', `${landing.length} fichier(s) de la landing (${landing.map((f) => f.chemin).join(', ')}) : ni « réponse en direct », ni « répondu en N s », ni « dans la seconde », ni date promise ; mots d’escalade (${escalade.join(', ')}) jamais montrés sans l’alerte ; détecteur éprouvé sur ${so7.n} sondes (mutation : « répondu en 41 s », « je vous rappelle dans la journée », fuite sans alerte → vues)`)

    // PR-8 : la vidéo de la landing
    const r8 = examinerVideo({ flags: lire('lib/flags.ts'), landing, lire: (rel) => { const f = path.join(racine, rel); return fs.existsSync(f) ? fs.readFileSync(f) : null } })
    const so8 = sondes.get('PR-8')
    for (const e of r8.echecs) s.echoue('PR-8', e)
    for (const e of so8.echecs) s.echoue('PR-8', `détecteur : ${e}`)
    if (!s.enEchec('PR-8')) s.passe('PR-8', `${r8.faits.join(' ; ')} ; détecteur éprouvé sur ${so8.n} sondes (mutation : drapeau levé sans liste, texte « dans la seconde », sha256 périmé → vus)`)

    // PR-6
    const base = baseDe(racine)
    const avant = blobGit(base.depot, base.rev, 'lib/plans.ts')
    const r6 = comparerPlans(avant ? avant.toString('utf8') : null, lire('lib/plans.ts'), base.nom)
    const so6 = sondes.get('PR-6')
    for (const e of r6.echecs) s.echoue('PR-6', e)
    for (const e of so6.echecs) s.echoue('PR-6', `détecteur : ${e}`)
    if (r6.ok && so6.ok) s.passe('PR-6', `${r6.resume} ; détecteur éprouvé sur ${so6.n} sondes`)

    // PR-9 à PR-12 (revue avant mise en ligne du 25/09, fiche 025-20)
    for (const [id, f] of [['PR-9', () => jugerPR9(racine, corpus)], ['PR-10', () => jugerPR10(corpus)], ['PR-11', () => jugerPR11(racine)], ['PR-12', () => jugerPR12(racine)]]) {
      let r
      try { r = f() } catch (e) { r = { echecs: [`exception : ${premiereLigne(e)}`], faits: [] } }
      for (const e of r.echecs) s.echoue(id, e)
      if (!r.echecs.length) s.passe(id, r.faits.join(' ; '))
    }
  })
}

const pareil = (a, b) => (process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b)
if (process.argv[1] && pareil(path.resolve(process.argv[1]), fileURLToPath(import.meta.url))) await juger()
