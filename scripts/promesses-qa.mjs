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
//
// --temoin : l'arbre témoin de l'état « après ». Le juge extrait app/ et lib/ du commit de référence (git archive, rien n'est
// écrit dans .git) dans .orchestre/travail/promesses-qa/temoin/, y applique les corrections de
// scripts/fixtures/025/temoins/promesses-qa/corrections.json (chaque « ancien » doit s'y trouver une fois, et chaque fichier
// corrigé doit être dans le périmètre de 025-05 ou de 025-06 : le témoin prouve que ces deux fiches suffisent à passer), marque
// l'arbre du commit (temoin.json), puis juge PR-1 à PR-6 sur cet arbre. --temoin ne prend pas --racine.
//
// Sortie : une ligne par critère (PASS/FAIL PR-n — …), code 0 seulement si les six sont verts ; le relevé complet des phrases en
// défaut est écrit dans .orchestre/travail/promesses-qa/releve.txt (releve-temoin.txt pour le témoin).
//
// API (pour constructeur-ferme-qa.mjs, CF-7) : pr1Fichier(racine, 'app/profil/page.tsx') → { ok, violations, phrases } ;
// examinerTexte([{ chemin, source }]) ; unitesDeTexte(chemin, source) ; examinerMeta ; comparerPlans ; construireTemoin.
//
// Usage : node scripts/promesses-qa.mjs [--racine=<dossier>] | node scripts/promesses-qa.mjs --temoin
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import {
  R, FIXTURES, TRAVAIL, REFERENCE_COMMIT, lireOptionsOuQuitter, creerSortie, git, estRacineGit, blobGit, commitDeReference,
  listerFichiers, dossierTravail, extraireTar, exigerSousTravail, revParse, lireJson, sous, replier,
} from './fixtures/025/commun.mjs'

const JUGE = 'promesses-qa'
const IDS = ['PR-1', 'PR-2', 'PR-3', 'PR-4', 'PR-5', 'PR-6']
const PARA = '\u2029' // coupure de phrase interne (bloc JSX, ligne vide, expression qui contient du JSX)
const court = (s, n = 150) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t }
const premiereLigne = (e) => String((e && e.message) || e).split('\n')[0].slice(0, 300)

// Les fichiers que les fiches nomment (relevé de 025-06, /profil de 025-05, les exceptions) : présents, non vides, avec leur prose.
export const SURVEILLES = [
  'app/layout.tsx', 'app/page.tsx', 'app/faq/page.tsx', 'app/dashboard/page.tsx', 'app/manifest.ts', 'app/DemoSequence.tsx',
  'lib/plans.ts', 'app/profil/page.tsx', 'lib/aide.ts', 'lib/platStats.ts', 'app/api/account/delete/route.ts',
]
// Part minimale des phrases de prose gardées par rapport au commit de référence.
const PART_MIN = { 'app/profil/page.tsx': 1 / 3 }
const PART_DEFAUT = 1 / 2
// Périmètres de 025-05 et 025-06 (brouillons du 24/09) : les seuls fichiers que les corrections du témoin ont le droit de toucher.
export const PERIMETRES = new Set([
  'app/profil/page.tsx', 'app/api/site/generate/route.ts', 'lib/flags.ts', 'lib/aide.ts', // 025-05
  'app/layout.tsx', 'app/page.tsx', 'app/faq/page.tsx', 'app/dashboard/page.tsx', 'app/manifest.ts', 'app/DemoSequence.tsx', 'lib/plans.ts', // 025-06
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
 * erreurs: [chemin : erreur de syntaxe], unites, phrases, prose: Map(chemin → nombre de phrases de prose) }.
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
  const prose = new Map()
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
  }
  return { violations, erreurs, unites: nUnites, phrases: nPhrases, prose }
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
    const n = ex.prose.get(c) || 0, nr = ref.prose.get(c) || 0
    const part = PART_MIN[c] ?? PART_DEFAUT
    if (!nr) defauts.push(`${c} : aucune phrase de prose à ${REFERENCE_COMMIT} (référence illisible)`)
    else if (n < Math.ceil(nr * part)) defauts.push(`${c} : ${n} phrase(s) de prose, ${Math.ceil(nr * part)} au moins (${Math.round(part * 100)} % des ${nr} de ${REFERENCE_COMMIT})`)
  }
  for (const e of ex.erreurs) defauts.push(`syntaxe : ${e}`)
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
/** Éprouve les détecteurs sur les sondes. → Map(id → { ok, echecs, n }) */
export function eprouver() {
  const out = new Map(IDS.map((id) => [id, { ok: true, echecs: [], n: 0 }]))
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
  const o = lireOptionsOuQuitter(process.argv.slice(2), { connues: [] })
  if (o.reel) { console.error('✗ promesses-qa n’a pas de mode --reel (le juge ne lit que des fichiers)'); process.exit(2) }
  if (o.positionnels.length) { console.error(`✗ argument inattendu : ${o.positionnels.join(' ')}`); process.exit(2) }
  if (o.temoin && !o.racineParDefaut) { console.error('✗ --temoin construit son propre arbre (commit de référence + corrections.json) : pas de --racine'); process.exit(2) }
  const s = creerSortie(JUGE, IDS, { racine: o.racine, temoin: o.temoin })
  await s.executer(async (s) => {
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

    // PR-6
    const base = baseDe(racine)
    const avant = blobGit(base.depot, base.rev, 'lib/plans.ts')
    const r6 = comparerPlans(avant ? avant.toString('utf8') : null, lire('lib/plans.ts'), base.nom)
    const so6 = sondes.get('PR-6')
    for (const e of r6.echecs) s.echoue('PR-6', e)
    for (const e of so6.echecs) s.echoue('PR-6', `détecteur : ${e}`)
    if (r6.ok && so6.ok) s.passe('PR-6', `${r6.resume} ; détecteur éprouvé sur ${so6.n} sondes`)
  })
}

const pareil = (a, b) => (process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b)
if (process.argv[1] && pareil(path.resolve(process.argv[1]), fileURLToPath(import.meta.url))) await juger()
