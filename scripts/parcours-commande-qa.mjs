// scripts/parcours-commande-qa.mjs — le juge de la fiche 025-09 (le dossier /site/commander recueille la voix de l'artisan),
// écrit par Claude Code (fiche 025-01, point 10). Les exécutants n'y touchent pas (CLAUDE.md, règle 1).
//
// Usage : node scripts/parcours-commande-qa.mjs [--racine=<dossier>] [--temoin]
//   --racine=<dossier> : tout est lu et lancé depuis ce dossier (défaut : la racine du dépôt) : lib/siteCommande.ts,
//                        app/site/commander/page.tsx, scripts/ts-loader.mjs, public/sites-demo/generer.mjs, package.json,
//                        tsconfig.json. Rien n'y est écrit (npm run typecheck y tourne avec --incremental false, hors dépôt).
//   --temoin           : le juge construit l'état « après » de 025-09 et s'y juge entier (PC-1 à PC-5), voir « Témoin ».
//   Pas de --reel : ce juge ne touche ni la base ni la production (refusé, code 2).
// Sortie : une ligne PASS/FAIL par critère, puis « parcours-commande-qa : PASS » ou « … : FAIL — ids » ; code 0 seulement si
// les cinq sont verts ; code 2 sur une option invalide.
//
// Critères (fiche 025-01, point 10 ; contrat « matiere.artisan » de la même fiche) :
//   PC-1 lib/siteCommande.ts, importé par scripts/ts-loader.mjs dans un processus à part (node --experimental-strip-types
//        --import <racine>/scripts/ts-loader.mjs, cwd = racine), garde et borne matiere.artisan. Chaque cas est un brouillon
//        complet (commande-exemple/commande.json du jeu d'essai, valide sur tout le reste) dont seul matiere.artisan change ;
//        N = nettoyerBrouillon(brouillon), E = erreursAvantPaiement(N) (c'est ce que font PUT /api/site/commander/brouillon
//        puis POST /api/site/commander). Trois sortes de cas :
//        - « accepté » : E vide, et N.matiere.artisan identique à l'entrée (garde) : l'artisan du jeu d'essai, sa variante
//          chiffres: null, un chiffre sans unité, 1960 et l'année en cours, toutes les bornes hautes (40, 60, 140, 160, 12, 12,
//          60) et basses (1, 1, 1, 20, 1) du contrat, et chaque citation que l'expression de generer.mjs accepte ;
//        - « refusé » : E non vide : artisan absent, null, texte ou liste ; chacun des six champs absent ; textes vides ou
//          blancs ; installation 1959, année + 1, texte, null, 0 ; citation de 19 signes ; chaque citation que l'expression de
//          generer.mjs refuse, dont les pièges « même », « âme », « nous-mêmes » (une expression naïve en \b y voit « me » ou
//          « mes ») ; chiffres [], deux chiffres, texte, un chiffre null, valeur 0, négative, non numérique, vide ou absente,
//          légende vide ou absente ;
//        - « toléré » (refus OU borne) : dépassements d'une unité de chaque borne, parcours sur deux lignes, apostrophe droite
//          (« J'assemble »), quatre chiffres, valeur nombre, « 2,5 », « 1 200 », unité null, installation 2000.5 ou « 2011 »,
//          clés en trop, HTML, entrées énormes (10 000 signes, 50 chiffres).
//        Sur TOUS les cas : N ne lève pas d'exception ; E est une liste de phrases ; N.matiere.artisan est null/absent ou un objet
//        borné (clés du contrat seulement, textes ≤ bornes, au plus trois chiffres, aucune balise HTML) ; et si E est vide,
//        N.matiere.artisan respecte tout le contrat (commun.mjs erreursArtisan, la citation passant l'expression de generer.mjs)
//        — ce qui peut payer peut être généré. Enfin les erreurs des champs absents se distinguent : prénom/nom, installation,
//        parcours, citation, chiffres donnent cinq listes différentes (« les erreurs exigent chaque champ »).
//        L'expression « première personne » est LUE dans <racine>/public/sites-demo/generer.mjs (le test de a.citation,
//        :200 à 1620723 ; commun.mjs premierePersonneDuGenerateur) ; les attendus des citations en sont déduits.
//   PC-2 PRIX_SITE_CENTS, PRIX_SITE_TEXTE, DELAI_ANNONCE, ETATS (ordre compris) et TRANSITIONS (ensembles) exportés par le
//        module de la racine égalent ceux de lib/siteCommande.ts à 1620723 (blob importé de la même façon, hors dépôt).
//   PC-3 app/site/commander/page.tsx, lu par l'analyseur de TypeScript (commentaires exclus) : ETAPES a une entrée « Votre
//        parcours » ; son id est rendu (etape === '<id>' && …, ternaire, if ou case) ; dans ce rendu (et les composants ou
//        fonctions locaux qu'il appelle), un champ de saisie par donnée du contrat (prenom, nom, installation, parcours,
//        citation, valeur, unite, legende : input, textarea, select ou composant dont les attributs nomment la donnée) ; le
//        choix « Je préfère ne pas donner de chiffres » est le libellé (≤ 3 éléments au-dessus) d'une case ou d'un bouton qui
//        touche `chiffres` ; au moins un placeholder commence par « Exemple », ceux du parcours et de la phrase signée aussi,
//        et aucun n'est marqué « Ex: », « Ex. » ou « par ex. ».
//   PC-4 plus aucun texte « proposez-m » dans la page (textes repliés par commun.mjs replier : invisibles, NFKC, lettres d'un
//        autre alphabet ; et mis bout à bout, pour un mot découpé entre deux textes) ; un contrôle nomme 'a_prendre' et son libellé dit que l'artisan
//        réserve lui-même le domaine, à son nom (« je le réserve à mon nom… »), sans « proposez », ni « nous / Presti / on
//        réserve » ; MODES_DOMAINE contient toujours 'a_prendre'.
//   PC-5 npm run typecheck -- --listFiles (cwd = racine ; plus --incremental false hors du dépôt, pour n'y rien écrire) sort
//        en code 0 et a bien lancé tsc --noEmit ; package.json garde "typecheck": "tsc --noEmit" ; la liste du programme
//        compte lib/siteCommande.ts et app/site/commander/page.tsx ; aucun @ts-nocheck dans ces deux fichiers, et pas plus de
//        @ts-ignore / @ts-expect-error qu'à 1620723 ; tsconfig.json identique à 1620723 (commun.mjs defautsTypecheck).
//
// Témoin (--temoin) : scripts/fixtures/025/temoins/parcours-commande-qa/ contient l'état « après » minimal de 025-09 :
//   lib/siteCommande.ts.temoin (lib/siteCommande.ts de 1620723 + matiere.artisan) et app/site/commander/page.tsx.temoin (une
//   page réduite aux étapes, aux champs et aux libellés que PC-3 et PC-4 lisent). Extension .temoin : le tsconfig du dépôt
//   inclut **/*.ts(x), scripts/ compris ; ces fichiers n'entrent donc jamais dans le typecheck du dépôt. Le juge :
//   1. extrait (ou réutilise) l'arbre de référence 1620723 (commun.mjs extraireReference, .orchestre/travail/025-01/reference/)
//      — ou prend --racine=<dossier> s'il est donné avec --temoin ;
//   2. en copie app/, lib/, middleware.ts, tsconfig.json, package.json, scripts/ts-loader.mjs et public/sites-demo/generer.mjs
//      dans .orchestre/travail/parcours-commande-qa/temoin/ (commun.mjs preparerTemoin) ;
//   3. y pose chaque fichier *.temoin sans son extension, puis se juge sur ce dossier comme sur une racine.
//   Le témoin part de l'arbre figé, pas du dépôt : il reste vert après les PASS des autres fiches 025 (juges-025-preuve.mjs
//   le rejoue). Le dossier témoin est refait à chaque passage et laissé pour inspection.
//
// Écritures : .orchestre/travail/parcours-commande-qa/ seulement (sonde-<pid>/, supprimé à la sortie ; temoin/ avec --temoin).
// Aucun secret lu, aucune commande Git d'écriture, rien n'est régénéré en place.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'
import {
  R, FIXTURES, REFERENCE_COMMIT, PREMIERE_PERSONNE, COMMANDE_SANS_CHIFFRES,
  lireOptionsOuQuitter, creerSortie, lancer, lireOuNull, lireJson, blobGit, estRacineGit, commitDeReference,
  dossierTravail, extraireReference, preparerTemoin, listerFichiers, premierePersonneDuGenerateur, erreursArtisan, lireCommande,
  defautsTypecheck, replier,
} from './fixtures/025/commun.mjs'

const JUGE = 'parcours-commande-qa'
const IDS = ['PC-1', 'PC-2', 'PC-3', 'PC-4', 'PC-5']
const LIB = 'lib/siteCommande.ts'
const PAGE = 'app/site/commander/page.tsx'
const LOADER = 'scripts/ts-loader.mjs'
const GENERATEUR = 'public/sites-demo/generer.mjs'
const TEMOIN_FIXTURES = path.join(FIXTURES, 'temoins', JUGE)
const COPIE_TEMOIN = ['app', 'lib', 'middleware.ts', 'tsconfig.json', 'package.json', LOADER, GENERATEUR]
const CLES = ['prenom', 'nom', 'installation', 'parcours', 'citation', 'chiffres']
const MAX = { prenom: 40, nom: 60, parcours: 140, citation: 160 }
const MAX_CHIFFRE = { valeur: 12, unite: 12, legende: 60 }
const CONSTANTES = ['PRIX_SITE_CENTS', 'PRIX_SITE_TEXTE', 'DELAI_ANNONCE', 'ETATS', 'TRANSITIONS']
const rel = (p) => path.relative(R, p).split(path.sep).join('/') || '.'
const court = (t, n = 110) => { const s = String(t ?? '').replace(/\s+/g, ' ').trim(); return s.length > n ? `${s.slice(0, n - 1)}…` : s }
const liste = (xs, n = 6) => `${xs.slice(0, n).join(', ')}${xs.length > n ? `, … (${xs.length} en tout)` : ''}`
const pareil = (a, b) => (process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b)

// ── La sonde : un processus à part, chargé par le ts-loader de la racine, qui importe le module et joue les cas ────────────
const SONDE = `// Sonde de ${JUGE} (écrite par le juge à chaque passage, supprimée à la sortie).
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
const [modulePath, casPath, sortiePath] = process.argv.slice(2)
const court = (e) => String((e && e.stack) || e).split('\\n').slice(0, 3).join(' | ').slice(0, 400)
const out = { importe: false, exports: {}, constantes: {}, cas: [] }
try {
  const m = await import(pathToFileURL(modulePath).href)
  out.importe = true
  for (const k of Object.keys(m)) out.exports[k] = typeof m[k]
  for (const k of ${JSON.stringify([...CONSTANTES, 'MODES_DOMAINE'])}) out.constantes[k] = k in m ? { valeur: m[k] } : { absent: true }
  const cas = JSON.parse(fs.readFileSync(casPath, 'utf8'))
  if (typeof m.nettoyerBrouillon === 'function' && typeof m.erreursAvantPaiement === 'function') {
    for (const c of cas) {
      const r = { id: c.id }
      let n
      try { n = m.nettoyerBrouillon(structuredClone(c.entree)); r.N = JSON.parse(JSON.stringify(n ?? null)) } catch (e) { r.exceptionN = court(e) }
      if (!r.exceptionN) { try { r.E = m.erreursAvantPaiement(n) } catch (e) { r.exceptionE = court(e) } }
      out.cas.push(r)
    }
  }
} catch (e) { out.erreur = court(e) }
fs.writeFileSync(sortiePath, JSON.stringify(out))
`
function sonder({ cwd, module, loader, cas, dossier, nom }) {
  if (!fs.existsSync(module) || !fs.statSync(module).size) return { importe: false, erreur: `${rel(module)} absent ou vide` }
  if (!fs.existsSync(loader)) return { importe: false, erreur: `${rel(loader)} absent : le module ne peut pas être importé par le ts-loader` }
  const fc = path.join(dossier, `cas-${nom}.json`), fo = path.join(dossier, `resultat-${nom}.json`)
  fs.writeFileSync(fc, JSON.stringify(cas))
  fs.rmSync(fo, { force: true })
  const r = lancer(process.execPath, ['--experimental-strip-types', '--disable-warning=ExperimentalWarning', '--import', pathToFileURL(loader).href, path.join(dossier, 'sonde.mjs'), module, fc, fo], { cwd, timeout: 180_000 })
  const brut = lireOuNull(fo)
  if (!brut || !brut.length) return { importe: false, erreur: `sonde sans résultat (code ${r.code}${r.erreur ? `, ${r.erreur}` : ''}) : ${court(r.derniereLigne, 200)}` }
  let j
  try { j = JSON.parse(brut.toString('utf8')) } catch (e) { return { importe: false, erreur: `résultat de sonde illisible : ${e.message}` } }
  if (!j.importe && !j.erreur) j.erreur = 'import en échec'
  return j
}
/** Le module de 1620723 (et ce qu'il importe par @/ ou ./), posé hors dépôt dans <dossier>/avant/, pour PC-2. */
function sonderReference(dossier) {
  const base = path.join(dossier, 'avant')
  const aFaire = [LIB], faits = new Set()
  while (aFaire.length) {
    const f = aFaire.shift()
    if (faits.has(f)) continue
    faits.add(f)
    const b = blobGit(R, REFERENCE_COMMIT, f)
    if (!b) { if (f === LIB) return { importe: false, erreur: `${LIB} introuvable à ${REFERENCE_COMMIT}` }; continue }
    fs.mkdirSync(path.dirname(path.join(base, f)), { recursive: true })
    fs.writeFileSync(path.join(base, f), b)
    for (const m of b.toString('utf8').matchAll(/from\s+'(@\/[^']+|\.{1,2}\/[^']+)'/g)) {
      const cible = m[1].startsWith('@/') ? m[1].slice(2) : path.posix.normalize(path.posix.join(path.posix.dirname(f), m[1]))
      aFaire.push(/\.(ts|tsx|mjs|js)$/.test(cible) ? cible : `${cible}.ts`)
    }
  }
  return sonder({ cwd: base, module: path.join(base, LIB), loader: path.join(R, LOADER), cas: [], dossier, nom: 'reference' })
}

// ── Les cas de PC-1 ───────────────────────────────────────────────────────────────────────────────────────────────────────
const NAIVE = /\b(?:je|me|moi|mon|ma|mes)\b|\b[jm]['’]/i // ce qu'une expression en \b (ASCII) accepterait : pour prouver les pièges
const CITATIONS = [
  'J’assemble chaque escalier à l’atelier, marche après marche.',
  'Le dernier coup de rabot, c’est toujours moi qui le donne.',
  'Qu’on m’appelle tôt ou tard, le chantier reste propre.',
  'MON atelier est à Rennes, et il le restera longtemps.',
  'Chaque marche passe entre mes mains avant la pose.',
  'Ma règle : aucune pièce ne sort sans être poncée deux fois.',
  'On me confie un plan, on repart avec un escalier.',
  'C’est la même main qui travaille, du relevé à la pose.',
  'L’âme du chêne reste visible dans chaque pièce livrée.',
  'Nous posons chaque escalier nous-mêmes, sans sous-traitance.',
  'Un escalier posé en huit semaines, du relevé à la pose.',
  'Menuiserie, escaliers et dressings sur mesure, montés en atelier.',
]
const PIEGES = ['C’est la même main qui travaille, du relevé à la pose.', 'L’âme du chêne reste visible dans chaque pièce livrée.', 'Nous posons chaque escalier nous-mêmes, sans sous-traitance.']
const GROUPES = { 'sans-prenom': 'prénom et nom', 'sans-nom': 'prénom et nom', 'sans-installation': 'installation', 'sans-parcours': 'parcours', 'sans-citation': 'citation', 'sans-chiffres': 'chiffres' }

function construireCas({ annee, estPremiere }) {
  const commande = lireCommande()
  const sansChiffres = lireJson(COMMANDE_SANS_CHIFFRES)
  const base = structuredClone(commande)
  delete base._; if (base.matiere) delete base.matiere._photos
  const A = structuredClone(commande.matiere.artisan)
  const S = structuredClone(sansChiffres.matiere.artisan)
  const cas = []
  const ajouter = (id, libelle, artisan, attendu, { absent = false } = {}) => {
    const entree = structuredClone(base)
    if (absent) delete entree.matiere.artisan; else entree.matiere.artisan = structuredClone(artisan)
    cas.push({ id, libelle, entree, artisan: absent ? undefined : artisan, attendu })
  }
  const avec = (champs) => ({ ...structuredClone(A), ...champs })
  const sans = (k) => { const a = structuredClone(A); delete a[k]; return a }
  const chiffre = (i, champs, retirer = []) => { const a = structuredClone(A); a.chiffres[i] = { ...a.chiffres[i], ...champs }; for (const k of retirer) delete a.chiffres[i][k]; return a }
  const citationAttendue = (c) => (c.length >= 20 && c.length <= 160 && estPremiere(c) ? 'accepte' : 'refuse')
  const r = (n, c) => c.repeat(n)

  // acceptés
  ajouter('valide', 'l’artisan du jeu d’essai (trois chiffres)', A, 'accepte')
  ajouter('valide-sans-chiffres', 'la variante chiffres: null (« je préfère ne pas »)', S, 'accepte')
  ajouter('sans-unite', 'un chiffre sans unité (facultative)', chiffre(1, {}, ['unite']), 'accepte')
  ajouter('installation-1960', 'installation 1960', avec({ installation: 1960 }), 'accepte')
  ajouter('installation-annee', `installation ${annee}`, avec({ installation: annee }), 'accepte')
  const hautes = avec({ prenom: r(40, 'A'), nom: r(60, 'B'), parcours: r(140, 'P'), citation: `Je ${r(156, 'a')}.` })
  hautes.chiffres[0] = { valeur: '123456789012', unite: r(12, 'u'), legende: r(60, 'l') }
  ajouter('bornes-hautes', 'toutes les bornes hautes (40, 60, 140, 160 ; 12, 12, 60)', hautes, 'accepte')
  const basses = avec({ prenom: 'É', nom: 'O', parcours: 'C', citation: 'Je pose mes marches.' })
  basses.chiffres[2] = { valeur: '8', unite: 'semaines', legende: 'x' }
  ajouter('bornes-basses', 'toutes les bornes basses (1, 1, 1, 20 ; légende 1)', basses, 'accepte')
  CITATIONS.forEach((c, i) => ajouter(`citation-${i + 1}`, `citation « ${court(c, 48)} »`, avec({ citation: c }), citationAttendue(c)))
  ajouter('citation-19', 'citation de 19 signes', avec({ citation: 'Je pose mes marches' }), 'refuse')
  const droite = 'J\'assemble chaque escalier à l\'atelier, marche après marche.'
  ajouter('apostrophe-droite', 'citation à l’apostrophe droite (« J\'assemble »)', avec({ citation: droite }), estPremiere(droite) ? 'accepte' : 'tolere')
  // refusés
  ajouter('sans-artisan', 'matiere.artisan absent', null, 'refuse', { absent: true })
  ajouter('artisan-null', 'artisan null', null, 'refuse')
  ajouter('artisan-texte', 'artisan en texte', 'Camille Lestraque, menuisier depuis 2011', 'refuse')
  ajouter('artisan-liste', 'artisan en liste', [], 'refuse')
  for (const k of CLES) ajouter(`sans-${k}`, `${k} absent`, sans(k), 'refuse')
  ajouter('prenom-blanc', 'prénom blanc', avec({ prenom: '   ' }), 'refuse')
  ajouter('nom-vide', 'nom vide', avec({ nom: '' }), 'refuse')
  ajouter('parcours-vide', 'parcours vide', avec({ parcours: '' }), 'refuse')
  ajouter('citation-vide', 'citation vide', avec({ citation: '' }), 'refuse')
  ajouter('installation-1959', 'installation 1959', avec({ installation: 1959 }), 'refuse')
  ajouter('installation-future', `installation ${annee + 1}`, avec({ installation: annee + 1 }), 'refuse')
  ajouter('installation-texte', 'installation « deux mille »', avec({ installation: 'deux mille' }), 'refuse')
  ajouter('installation-null', 'installation null', avec({ installation: null }), 'refuse')
  ajouter('installation-zero', 'installation 0', avec({ installation: 0 }), 'refuse')
  ajouter('chiffres-vide', 'chiffres []', avec({ chiffres: [] }), 'refuse')
  ajouter('chiffres-deux', 'deux chiffres', avec({ chiffres: structuredClone(A.chiffres.slice(0, 2)) }), 'refuse')
  ajouter('chiffres-texte', 'chiffres « aucun »', avec({ chiffres: 'aucun' }), 'refuse')
  ajouter('chiffre-null', 'un chiffre null parmi trois', avec({ chiffres: [A.chiffres[0], null, A.chiffres[2]] }), 'refuse')
  ajouter('valeur-zero', 'valeur « 0 »', chiffre(0, { valeur: '0' }), 'refuse')
  ajouter('valeur-negative', 'valeur « -3 »', chiffre(0, { valeur: '-3' }), 'refuse')
  ajouter('valeur-mot', 'valeur « beaucoup »', chiffre(0, { valeur: 'beaucoup' }), 'refuse')
  ajouter('valeur-vide', 'valeur vide', chiffre(0, { valeur: '' }), 'refuse')
  ajouter('sans-valeur', 'valeur absente', chiffre(0, {}, ['valeur']), 'refuse')
  ajouter('legende-vide', 'légende vide', chiffre(2, { legende: '' }), 'refuse')
  ajouter('sans-legende', 'légende absente', chiffre(2, {}, ['legende']), 'refuse')
  // tolérés : refus ou borne (l'invariant et les bornes tranchent)
  ajouter('prenom-41', 'prénom de 41 signes', avec({ prenom: r(41, 'A') }), 'tolere')
  ajouter('nom-61', 'nom de 61 signes', avec({ nom: r(61, 'B') }), 'tolere')
  ajouter('parcours-141', 'parcours de 141 signes', avec({ parcours: r(141, 'P') }), 'tolere')
  ajouter('citation-161', 'citation de 161 signes', avec({ citation: `Je ${r(157, 'a')}.` }), 'tolere')
  ajouter('legende-61', 'légende de 61 signes', chiffre(0, { legende: r(61, 'l') }), 'tolere')
  ajouter('unite-13', 'unité de 13 signes', chiffre(0, { unite: r(13, 'u') }), 'tolere')
  ajouter('valeur-13', 'valeur de 13 signes', chiffre(0, { valeur: '1234567890123' }), 'tolere')
  ajouter('parcours-deux-lignes', 'parcours sur deux lignes', avec({ parcours: 'CAP de menuisier,\nhuit ans en atelier d’escaliers.' }), 'tolere')
  ajouter('chiffres-quatre', 'quatre chiffres', avec({ chiffres: [...structuredClone(A.chiffres), structuredClone(A.chiffres[0])] }), 'tolere')
  ajouter('valeur-nombre', 'valeur en nombre (180)', chiffre(1, { valeur: 180 }), 'tolere')
  ajouter('valeur-virgule', 'valeur « 2,5 »', chiffre(1, { valeur: '2,5' }), 'tolere')
  ajouter('valeur-espace', 'valeur « 1 200 »', chiffre(1, { valeur: '1 200' }), 'tolere')
  ajouter('unite-null', 'unité null', chiffre(1, { unite: null }), 'tolere')
  ajouter('installation-decimale', 'installation 2000.5', avec({ installation: 2000.5 }), 'tolere')
  ajouter('installation-chaine', 'installation « 2011 »', avec({ installation: '2011' }), 'tolere')
  const intrus = avec({ email: 'atelier@exemple.invalid', photo: 'https://exemple.invalid/p.jpg' })
  intrus.chiffres[0] = { ...intrus.chiffres[0], source: 'inventée' }
  ajouter('cles-en-trop', 'clés hors contrat (email, photo, chiffres[0].source)', intrus, 'tolere')
  ajouter('html', 'HTML dans le prénom et la citation', avec({ prenom: '<b>Camille</b>', citation: 'Je pose <img src=x onerror=alert(1)> chaque marche moi-même.' }), 'tolere')
  const enorme = avec({ prenom: r(10000, 'A'), nom: r(10000, 'B'), parcours: r(10000, 'P'), citation: `Je ${r(3000, 'pose ')}` })
  enorme.chiffres = Array.from({ length: 50 }, () => ({ valeur: '12', unite: 'ans', legende: r(10000, 'l') }))
  ajouter('enorme', 'entrées énormes (10 000 signes, 50 chiffres)', enorme, 'tolere')
  return cas
}

/** Le jeu du juge est-il sain ? (longueurs voulues, pièges réels, des deux côtés de l'expression) → défauts */
function controlerJeu(cas, estPremiere) {
  const d = []
  const par = new Map(cas.map((c) => [c.id, c]))
  const long = (id, k) => par.get(id).artisan[k].length
  const attendus = [['bornes-hautes', 'prenom', 40], ['bornes-hautes', 'nom', 60], ['bornes-hautes', 'parcours', 140], ['bornes-hautes', 'citation', 160], ['bornes-basses', 'citation', 20], ['citation-19', 'citation', 19], ['prenom-41', 'prenom', 41], ['nom-61', 'nom', 61], ['parcours-141', 'parcours', 141], ['citation-161', 'citation', 161]]
  for (const [id, k, n] of attendus) if (long(id, k) !== n) d.push(`${id}.${k} fait ${long(id, k)} signes, ${n} voulus`)
  for (const p of PIEGES) if (estPremiere(p) || !NAIVE.test(p)) d.push(`le piège « ${court(p, 40)} » n’en est pas un (générateur ${estPremiere(p)}, naïve ${NAIVE.test(p)})`)
  const acc = CITATIONS.filter(estPremiere).length, ref = CITATIONS.length - acc
  if (acc < 5 || ref < 4) d.push(`citations dégénérées : ${acc} acceptées et ${ref} refusées par le générateur (5 et 4 au moins)`)
  const v = erreursArtisan(par.get('valide').artisan).filter((x) => !/première personne/.test(x))
  if (v.length || !estPremiere(par.get('valide').artisan.citation)) d.push(`l’artisan du jeu d’essai n’est pas au contrat : ${v.join(' ; ') || 'citation'}`)
  if (!par.get('valide').artisan.chiffres?.length || par.get('valide-sans-chiffres').artisan.chiffres !== null) d.push('jeu d’essai : trois chiffres puis chiffres: null attendus')
  return d
}

const egalChiffre = (n, a) => n && typeof n === 'object' && String(n.valeur) === String(a.valeur) && (n.unite ?? '') === (a.unite ?? '') && n.legende === a.legende
/** N garde-t-il l'artisan valide à l'identique ? → null ou la première différence */
function differenceGarde(N, a) {
  if (N === undefined || N === null) return `perdu (${N === null ? 'null' : 'absent'} après nettoyerBrouillon)`
  if (typeof N !== 'object' || Array.isArray(N)) return `devenu ${Array.isArray(N) ? 'une liste' : typeof N}`
  for (const k of ['prenom', 'nom', 'parcours', 'citation']) if (N[k] !== a[k]) return `${k} « ${court(N[k], 40)} » au lieu de « ${court(a[k], 40)} »`
  if (N.installation !== a.installation) return `installation ${JSON.stringify(N.installation)} au lieu de ${a.installation}`
  if (a.chiffres === null) return N.chiffres === null ? null : `chiffres ${court(JSON.stringify(N.chiffres), 40)} au lieu de null`
  if (!Array.isArray(N.chiffres) || N.chiffres.length !== a.chiffres.length) return `chiffres ${court(JSON.stringify(N.chiffres), 60)}`
  for (let i = 0; i < a.chiffres.length; i++) if (!egalChiffre(N.chiffres[i], a.chiffres[i])) return `chiffres[${i}] ${court(JSON.stringify(N.chiffres[i]), 60)} au lieu de ${court(JSON.stringify(a.chiffres[i]), 60)}`
  return null
}
const BALISE = /<\/?[a-z!][^>]*>/i
/** N est-il borné ? (null/absent, ou objet aux clés du contrat, textes ≤ bornes, ≤ 3 chiffres, sans balise) → défauts */
function defautsBorne(N) {
  if (N === undefined || N === null) return []
  if (typeof N !== 'object' || Array.isArray(N)) return [`artisan gardé en ${Array.isArray(N) ? 'liste' : typeof N}`]
  const d = []
  for (const k of Object.keys(N)) if (!CLES.includes(k)) d.push(`clé « ${k} » gardée`)
  for (const [k, max] of Object.entries(MAX)) if (typeof N[k] === 'string' && N[k].length > max) d.push(`${k} de ${N[k].length} signes (${max} au plus)`)
  for (const k of ['prenom', 'nom', 'parcours', 'citation']) if (typeof N[k] === 'string' && BALISE.test(N[k])) d.push(`balise HTML gardée dans ${k}`)
  if (N.chiffres !== undefined && N.chiffres !== null) {
    if (!Array.isArray(N.chiffres)) d.push(`chiffres gardé en ${typeof N.chiffres}`)
    else {
      if (N.chiffres.length > 3) d.push(`${N.chiffres.length} chiffres gardés (3 au plus)`)
      N.chiffres.forEach((c, i) => {
        if (c === null || c === undefined) return
        if (typeof c !== 'object' || Array.isArray(c)) { d.push(`chiffres[${i}] gardé en ${typeof c}`); return }
        for (const k of Object.keys(c)) if (!(k in MAX_CHIFFRE)) d.push(`clé « chiffres[${i}].${k} » gardée`)
        for (const [k, max] of Object.entries(MAX_CHIFFRE)) {
          const v = typeof c[k] === 'number' ? String(c[k]) : c[k]
          if (typeof v === 'string' && v.length > max) d.push(`chiffres[${i}].${k} de ${v.length} signes (${max} au plus)`)
          if (typeof v === 'string' && BALISE.test(v)) d.push(`balise HTML gardée dans chiffres[${i}].${k}`)
        }
      })
    }
  }
  return d
}

function jugerPC1(s, { sonde, cas, jeu, reGen, ligneGen, identique }) {
  const d = []
  if (!sonde.importe) { s.echoue('PC-1', `${LIB} non importé par ${LOADER} : ${sonde.erreur}`); return }
  for (const f of ['nettoyerBrouillon', 'erreursAvantPaiement']) if (sonde.exports[f] !== 'function') d.push(`${f} n’est pas exporté en fonction (${sonde.exports[f] || 'absent'})`)
  if (d.length) { for (const x of d) s.echoue('PC-1', x); return }
  if (!reGen) d.push(`expression « première personne » introuvable dans ${GENERATEUR} (if (!/…/.test(a.citation))) : les attendus des citations viennent de la copie de commun.mjs`)
  for (const x of jeu) d.push(`jeu du juge : ${x}`)
  const res = new Map(sonde.cas.map((r) => [r.id, r]))
  const K = { exceptions: [], forme: [], garde: [], refus: [], acceptation: [], invariant: [], borne: [] }
  const erreursDe = new Map()
  for (const c of cas) {
    const r = res.get(c.id)
    if (!r) { K.exceptions.push(`${c.id} : sans résultat`); continue }
    if (r.exceptionN) { K.exceptions.push(`nettoyerBrouillon lève sur « ${c.libelle} » : ${court(r.exceptionN, 90)}`); continue }
    if (r.exceptionE) { K.exceptions.push(`erreursAvantPaiement lève sur « ${c.libelle} » : ${court(r.exceptionE, 90)}`); continue }
    if (!Array.isArray(r.E) || r.E.some((x) => typeof x !== 'string' || !x.trim())) { K.forme.push(`${c.id} : ${court(JSON.stringify(r.E), 60)}`); continue }
    erreursDe.set(c.id, r.E)
    const N = r.N && typeof r.N === 'object' && r.N.matiere && typeof r.N.matiere === 'object' ? r.N.matiere.artisan : undefined
    for (const x of defautsBorne(N)) K.borne.push(`${c.id} : ${x}`)
    if (!r.E.length) {
      const v = erreursArtisan(N).filter((x) => !/pas à la première personne$/.test(x))
      if (N && typeof N === 'object' && typeof N.citation === 'string' && !(reGen || PREMIERE_PERSONNE).test(N.citation)) v.push(`citation « ${court(N.citation, 40)} » refusée par l’expression de generer.mjs`)
      if (v.length) K.invariant.push(`${c.id} payable mais hors contrat : ${court(v.join(' ; '), 120)}`)
    }
    if (c.attendu === 'accepte') {
      if (r.E.length) K.acceptation.push(`${c.id} (« ${court(r.E[0], 70)} »)`)
      const g = differenceGarde(N, c.artisan)
      if (g) K.garde.push(`${c.libelle} : ${g}`)
    } else if (c.attendu === 'refuse' && !r.E.length) K.refus.push(c.id)
  }
  // les erreurs exigent chaque champ : cinq groupes, cinq listes différentes
  const distinctes = []
  const ids = Object.keys(GROUPES).filter((id) => erreursDe.has(id) && erreursDe.get(id).length)
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    if (GROUPES[ids[i]] === GROUPES[ids[j]]) continue
    const a = JSON.stringify([...erreursDe.get(ids[i])].sort()), b = JSON.stringify([...erreursDe.get(ids[j])].sort())
    if (a === b) distinctes.push(`${ids[i]} = ${ids[j]} (« ${court(erreursDe.get(ids[i])[0], 60)} »)`)
  }
  if (K.exceptions.length) d.push(`exceptions : ${liste(K.exceptions, 3)}`)
  if (K.forme.length) d.push(`erreursAvantPaiement ne rend pas une liste de phrases : ${liste(K.forme, 3)}`)
  if (K.garde.length) d.push(`garde : nettoyerBrouillon ne garde pas matiere.artisan à l’identique — ${liste(K.garde, 2)}`)
  if (K.refus.length) d.push(`refus attendu, aucune erreur : ${liste(K.refus, 8)}`)
  if (K.acceptation.length) d.push(`acceptation attendue, erreurs rendues : ${liste(K.acceptation, 3)}`)
  if (K.invariant.length) d.push(`invariant : ${liste(K.invariant, 2)}`)
  if (K.borne.length) d.push(`borne : ${liste(K.borne, 4)}`)
  if (distinctes.length) d.push(`les erreurs ne distinguent pas les champs absents : ${liste(distinctes, 3)}`)
  if (d.length) { for (const x of d) s.echoue('PC-1', x); return }
  const n = (a) => cas.filter((c) => c.attendu === a).length
  s.passe('PC-1', `${cas.length} cas importés par ${LOADER} : ${n('accepte')} acceptés et gardés à l’identique, ${n('refuse')} refusés, ${n('tolere')} tolérés (refus ou borne) ; bornes et invariant « payable ⇒ générable » tenus partout ; cinq groupes de champs absents, cinq listes d’erreurs ; expression première personne lue à ${GENERATEUR}:${ligneGen}${identique ? '' : ' (différente de la copie de commun.mjs : celle du générateur fait foi)'}, pièges « même », « âme », « nous-mêmes » refusés`)
}

// ── PC-2 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const canon = (k, v) => {
  if (k === 'TRANSITIONS' && v && typeof v === 'object' && !Array.isArray(v)) return JSON.stringify(Object.keys(v).sort().map((e) => [e, Array.isArray(v[e]) ? [...v[e]].sort() : v[e]]))
  return JSON.stringify(v)
}
function jugerPC2(s, apres, avant) {
  if (!avant.importe) { s.echoue('PC-2', `référence ${LIB}@${REFERENCE_COMMIT} illisible : ${avant.erreur}`); return }
  if (!apres.importe) { s.echoue('PC-2', `${LIB} non importé : ${apres.erreur}`); return }
  const d = []
  for (const k of CONSTANTES) {
    const a = apres.constantes?.[k], b = avant.constantes?.[k]
    if (!b || b.absent) { d.push(`${k} absent de la référence`); continue }
    if (!a || a.absent) { d.push(`${k} n’est plus exporté`); continue }
    if (canon(k, a.valeur) !== canon(k, b.valeur)) d.push(`${k} vaut ${court(JSON.stringify(a.valeur), 70)} au lieu de ${court(JSON.stringify(b.valeur), 70)}`)
  }
  if (d.length) { for (const x of d) s.echoue('PC-2', x); return }
  const v = (k) => avant.constantes[k].valeur
  s.passe('PC-2', `identiques à ${REFERENCE_COMMIT} : PRIX_SITE_CENTS ${v('PRIX_SITE_CENTS')}, PRIX_SITE_TEXTE « ${v('PRIX_SITE_TEXTE')} », DELAI_ANNONCE « ${v('DELAI_ANNONCE')} », ETATS ${[].concat(v('ETATS')).join(' → ')}, TRANSITIONS (${Object.keys(v('TRANSITIONS') || {}).length} états)`)
}

// ── Lecture de la page par l'analyseur de TypeScript ──────────────────────────────────────────────────────────────────────
const ENTITES = { '&apos;': '’', '&#39;': '’', '&rsquo;': '’', '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&laquo;': '«', '&raquo;': '»' }
const norm = (t) => replier(String(t).replace(/&(?:apos|#39|rsquo|nbsp|amp|quot|laquo|raquo);/g, (m) => ENTITES[m])).replace(/[  ]/g, ' ').replace(/'/g, '’').replace(/\s+/g, ' ').trim()
const visiter = (n, f) => { f(n); ts.forEachChild(n, (c) => visiter(c, f)) }
const nu = (e) => { while (e && (ts.isParenthesizedExpression(e) || ts.isAsExpression(e) || (ts.isSatisfiesExpression && ts.isSatisfiesExpression(e)) || ts.isTypeAssertionExpression(e) || ts.isNonNullExpression(e))) e = e.expression; return e }
const estLitteral = (n) => ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)
function textesDe(n) {
  const out = []
  visiter(n, (x) => {
    if (ts.isJsxText(x)) { const t = norm(x.text); if (t) out.push(t) } else if (estLitteral(x) || ts.isTemplateHead(x) || ts.isTemplateMiddle(x) || ts.isTemplateTail(x)) { const t = norm(x.text); if (t) out.push(t) }
  })
  return out
}
/** Le texte d'un élément JSX tel qu'il s'affiche à peu près : textes JSX et chaînes hors attributs. */
function texteVisible(n) {
  const out = []
  const rec = (x) => {
    if (ts.isJsxAttributes(x)) return
    if (ts.isJsxText(x) || estLitteral(x)) out.push(x.text)
    ts.forEachChild(x, rec)
  }
  rec(n)
  return norm(out.join(' '))
}
function elementsJsx(racines) {
  const out = []
  for (const r of racines) visiter(r, (x) => {
    if (ts.isJsxSelfClosingElement(x)) out.push({ el: x, ouvrant: x })
    else if (ts.isJsxElement(x)) out.push({ el: x, ouvrant: x.openingElement })
  })
  return out
}
const tagDe = (e) => e.ouvrant.tagName.getText()
const attribut = (e, nom) => e.ouvrant.attributes.properties.find((p) => ts.isJsxAttribute(p) && p.name.getText() === nom)
const typeDe = (e) => { const a = attribut(e, 'type'); return a && a.initializer && ts.isStringLiteral(a.initializer) ? a.initializer.text : '' }
const aEvenement = (e) => e.ouvrant.attributes.properties.some((p) => ts.isJsxAttribute(p) && /^on(Change|Click|Input)$/.test(p.name.getText()))
/** Les attributs de l'élément nomment-ils `champ` (identifiant, propriété, ou chaîne) ? Les noms d'attributs ne comptent pas. */
function nomme(e, champ, { chaines = true, identifiants = true } = {}) {
  let oui = false
  visiter(e.ouvrant.attributes, (x) => {
    if (oui) return
    if (identifiants && ts.isIdentifier(x) && x.text === champ && !(x.parent && ts.isJsxAttribute(x.parent) && x.parent.name === x)) oui = true
    if (chaines && estLitteral(x) && x.text === champ) oui = true
  })
  return oui
}
const estSaisie = (e) => { const t = tagDe(e); return (t === 'input' && !/^(radio|checkbox|button|submit|reset|hidden|file|image)$/i.test(typeDe(e))) || t === 'textarea' || t === 'select' || /^[A-Z]/.test(t) }
const estChoix = (e) => { const t = tagDe(e); return (t === 'input' && /^(checkbox|radio)$/i.test(typeDe(e))) || t === 'button' || /^[A-Z]/.test(t) || aEvenement(e) }
function ancetresJsx(e, n = 3) {
  const out = []
  let p = e.el.parent
  while (p && out.length < n) { if (ts.isJsxElement(p)) out.push(p); p = p.parent }
  return out
}
/** Les valeurs possibles d'une expression de placeholder → { valeurs[], nonResolu } */
function resoudre(expr, sf, prof = 0) {
  const e = nu(expr)
  const res = { valeurs: [], nonResolu: false }
  const ajouter = (r) => { res.valeurs.push(...r.valeurs); res.nonResolu ||= r.nonResolu }
  if (!e || prof > 6) { res.nonResolu = true; return res }
  if (estLitteral(e)) res.valeurs.push(e.text)
  else if (ts.isTemplateExpression(e)) res.valeurs.push(`${e.head.text}…`)
  else if (ts.isConditionalExpression(e)) { ajouter(resoudre(e.whenTrue, sf, prof + 1)); ajouter(resoudre(e.whenFalse, sf, prof + 1)) }
  else if (ts.isBinaryExpression(e) && [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(e.operatorToken.kind)) { ajouter(resoudre(e.left, sf, prof + 1)); ajouter(resoudre(e.right, sf, prof + 1)) }
  else if (ts.isBinaryExpression(e) && e.operatorToken.kind === ts.SyntaxKind.PlusToken) { const g = resoudre(e.left, sf, prof + 1); res.valeurs.push(...g.valeurs.map((v) => `${v}…`)); res.nonResolu ||= g.nonResolu }
  else if (ts.isIdentifier(e) || ts.isPropertyAccessExpression(e)) {
    const chemin = []
    let x = e
    while (ts.isPropertyAccessExpression(x)) { chemin.unshift(x.name.text); x = nu(x.expression) }
    if (!ts.isIdentifier(x)) { res.nonResolu = true; return res }
    let init = null
    visiter(sf, (n) => { if (!init && ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === x.text && n.initializer) init = n.initializer })
    for (const k of chemin) {
      const o = nu(init)
      const p = o && ts.isObjectLiteralExpression(o) ? o.properties.find((q) => ts.isPropertyAssignment(q) && q.name.getText().replace(/^['"]|['"]$/g, '') === k) : null
      init = p ? p.initializer : null
    }
    if (init) ajouter(resoudre(init, sf, prof + 1)); else res.nonResolu = true
  } else res.nonResolu = true
  return res
}
function placeholders(e, sf) {
  const a = attribut(e, 'placeholder')
  if (!a) return null
  if (!a.initializer) return { valeurs: [''], nonResolu: false }
  if (ts.isStringLiteral(a.initializer)) return { valeurs: [a.initializer.text], nonResolu: false }
  if (ts.isJsxExpression(a.initializer)) return resoudre(a.initializer.expression, sf)
  return { valeurs: [], nonResolu: true }
}
function lirePage(racine) {
  const brut = lireOuNull(path.join(racine, PAGE))
  if (!brut || !brut.length) return { erreur: `${PAGE} absent ou vide` }
  const src = brut.toString('utf8')
  const sf = ts.createSourceFile(PAGE, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  return { sf, src }
}
/** Les nœuds rendus quand l'étape vaut `id` (etape === id && …, ternaire, if, case), avec les composants/fonctions locaux appelés. */
function regionEtape(sf, id) {
  const region = []
  visiter(sf, (n) => {
    if (ts.isBinaryExpression(n) && [ts.SyntaxKind.EqualsEqualsEqualsToken, ts.SyntaxKind.EqualsEqualsToken].includes(n.operatorToken.kind) && [n.left, n.right].some((x) => ts.isStringLiteral(nu(x)) && nu(x).text === id)) {
      let c = n, p = n.parent
      while (p && ts.isParenthesizedExpression(p)) { c = p; p = p.parent }
      if (p && ts.isBinaryExpression(p) && p.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken && p.left === c) region.push(p.right)
      else if (p && ts.isConditionalExpression(p) && p.condition === c) region.push(p.whenTrue)
      else if (p && ts.isIfStatement(p) && p.expression === c) region.push(p.thenStatement)
    }
    if (ts.isCaseClause(n) && ts.isStringLiteral(n.expression) && n.expression.text === id) region.push(...n.statements)
  })
  if (!region.length) return region
  const decl = new Map()
  visiter(sf, (n) => {
    if (ts.isFunctionDeclaration(n) && n.name && n.body) decl.set(n.name.text, n.body)
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer && (ts.isArrowFunction(nu(n.initializer)) || ts.isFunctionExpression(nu(n.initializer)))) decl.set(n.name.text, nu(n.initializer).body)
  })
  const vus = new Set()
  for (let i = 0; i < region.length; i++) visiter(region[i], (x) => {
    if (ts.isIdentifier(x) && decl.has(x.text) && !vus.has(x.text)) {
      vus.add(x.text)
      const corps = decl.get(x.text)
      let jsx = false
      visiter(corps, (y) => { if (ts.isJsxElement(y) || ts.isJsxSelfClosingElement(y) || ts.isJsxFragment(y)) jsx = true })
      if (jsx) region.push(corps)
    }
  })
  return region
}

const CHAMPS_PAGE = ['prenom', 'nom', 'installation', 'parcours', 'citation', 'valeur', 'unite', 'legende']
const CHOIX = 'Je préfère ne pas donner de chiffres'
function jugerPC3(s, page) {
  if (page.erreur) { s.echoue('PC-3', page.erreur); return }
  const { sf } = page
  let etapes = null
  visiter(sf, (n) => { if (!etapes && ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === 'ETAPES' && n.initializer) etapes = nu(n.initializer) })
  if (!etapes || !ts.isArrayLiteralExpression(etapes)) { s.echoue('PC-3', 'la liste ETAPES (tableau littéral) est introuvable dans la page'); return }
  const noms = etapes.elements.map((el) => textesDe(el).join(' / '))
  const entree = etapes.elements.find((el) => textesDe(el).some((t) => /votre parcours/i.test(t)))
  if (!entree) { s.echoue('PC-3', `ETAPES n’a aucune étape « Votre parcours » (${noms.map((n) => `« ${court(n, 30)} »`).join(', ')})`); return }
  const o = nu(entree)
  const pid = o && ts.isObjectLiteralExpression(o) ? o.properties.find((p) => ts.isPropertyAssignment(p) && p.name.getText() === 'id' && estLitteral(nu(p.initializer))) : null
  if (!pid) { s.echoue('PC-3', 'l’étape « Votre parcours » de ETAPES n’a pas d’id littéral'); return }
  const id = nu(pid.initializer).text
  const region = regionEtape(sf, id)
  if (!region.length) { s.echoue('PC-3', `l’étape « Votre parcours » (id « ${id} ») n’est jamais rendue : aucun etape === '${id}' && …, ternaire, if ou case`); return }
  const d = []
  const ctrl = elementsJsx(region)
  const saisies = ctrl.filter(estSaisie)
  const manquants = CHAMPS_PAGE.filter((c) => !saisies.some((e) => nomme(e, c)))
  if (manquants.length) d.push(`aucun champ de saisie dans l’étape pour ${manquants.join(', ')} (${saisies.length} champ(s) trouvé(s))`)
  // le choix « je préfère ne pas »
  const choix = ctrl.filter((e) => estChoix(e) && nomme(e, 'chiffres'))
  const cible = norm(CHOIX).toLowerCase()
  const lie = choix.some((e) => ancetresJsx(e).some((a) => texteVisible(a).toLowerCase().includes(cible)))
  const present = region.some((r) => textesDe(r).some((t) => t.toLowerCase().includes(cible)))
  if (!present) d.push(`le choix « ${CHOIX} » manque dans l’étape`)
  else if (!lie) d.push(`le texte « ${CHOIX} » n’est le libellé d’aucune case ou bouton qui touche chiffres (${choix.length} contrôle(s) sur chiffres)`)
  // exemples en placeholder
  const pl = []
  for (const e of saisies) {
    const champs = CHAMPS_PAGE.filter((c) => nomme(e, c))
    if (!champs.length) continue
    const p = placeholders(e, sf)
    if (p) pl.push({ champs, ...p })
  }
  const toutes = pl.flatMap((p) => p.valeurs.map(norm))
  if (!toutes.some((v) => /^Exemple\b/.test(v))) d.push(`aucun placeholder de l’étape ne commence par « Exemple » (${toutes.length ? toutes.map((v) => `« ${court(v, 30)} »`).slice(0, 4).join(', ') : 'aucun placeholder lisible'})`)
  for (const p of pl.filter((q) => q.champs.some((c) => c === 'parcours' || c === 'citation'))) {
    if (p.nonResolu) d.push(`placeholder de ${p.champs.join('/')} illisible par le juge (écrivez-le en littéral ou en constante du fichier)`)
    for (const v of p.valeurs.map(norm)) if (!/^Exemple\b/.test(v)) d.push(`placeholder de ${p.champs.join('/')} non marqué « Exemple » : « ${court(v, 50)} »`)
  }
  const marquesAutres = [...new Set(elementsJsx(region).map((e) => placeholders(e, sf)).filter(Boolean).flatMap((p) => p.valeurs.map(norm)).filter((v) => /^(ex\b|ex\s*[.:]|e\.g\.|par ex)/i.test(v) && !/^Exemple\b/.test(v)))]
  if (marquesAutres.length) d.push(`exemple marqué autrement que « Exemple : » : ${marquesAutres.map((v) => `« ${court(v, 40)} »`).join(', ')}`)
  s.verdict('PC-3', !d.length, `étape « ${id} » (« Votre parcours ») dans ETAPES et rendue ; ${CHAMPS_PAGE.length} champs du contrat saisis (${saisies.length} champs dans l’étape) ; « ${CHOIX} » libelle une case sur chiffres ; ${toutes.filter((v) => /^Exemple\b/.test(v)).length} placeholder(s) « Exemple … », aucun « Ex: »`, d.join(' ; '))
}

const RESERVE = /(?<![\p{L}])je\s+(?:le\s+|l’|me\s+le\s+)?réserv|réserv\p{L}*\s+(?:\p{L}+\s+)?moi-même/iu
const A_MON_NOM = /(?<![\p{L}])à\s+mon\s+nom(?![\p{L}])/iu
const INTERDIT = /proposez|(?<![\p{L}])(?:nous|presti|on)\s+(?:vous\s+)?(?:le\s+|l’)?réserv/iu
function jugerPC4(s, page, sonde) {
  if (page.erreur) { s.echoue('PC-4', page.erreur); return }
  const { sf } = page
  const d = []
  // textes repliés (invisibles, NFKC, cyrillique : norm), un par un puis mis bout à bout (« propo{''}sez-moi »)
  const restes = textesDe(sf).filter((t) => /proposez-m/i.test(t))
  if (restes.length) d.push(`« proposez-m… » est toujours dans la page : ${restes.map((t) => `« ${court(t, 60)} »`).join(', ')}`)
  else if (/proposez-m/i.test(textesDe(sf).join('').replace(/\s+/g, ''))) d.push('« proposez-m… » est toujours dans la page, découpé entre plusieurs textes')
  const options = elementsJsx([sf]).filter((e) => (estChoix(e) || estSaisie(e)) && nomme(e, 'a_prendre', { identifiants: false }))
  let bon = null
  const libelles = []
  if (!options.length) d.push('aucun contrôle de la page ne nomme l’option a_prendre')
  for (const e of options) {
    const l = ancetresJsx(e).map(texteVisible).find((t) => t && t.replace(/a_prendre/g, '').trim()) || ''
    libelles.push(l)
    if (RESERVE.test(l) && A_MON_NOM.test(l) && !INTERDIT.test(l)) bon = l
  }
  if (options.length && !bon) d.push(`le libellé de l’option a_prendre ne dit pas que l’artisan réserve lui-même le domaine, à son nom : ${libelles.map((l) => `« ${court(l, 80)} »`).join(', ') || '(sans libellé)'}`)
  const mauvais = libelles.filter((l) => INTERDIT.test(l))
  if (bon && mauvais.length) d.push(`un autre libellé de l’option a_prendre promet encore une réservation par Presti : « ${court(mauvais[0], 80)} »`)
  const modes = sonde.importe ? sonde.constantes?.MODES_DOMAINE : null
  if (!modes || modes.absent || !Array.isArray(modes.valeur) || !modes.valeur.includes('a_prendre')) d.push(`MODES_DOMAINE de ${LIB} ne contient plus 'a_prendre' (${sonde.importe ? court(JSON.stringify(modes?.valeur), 60) : `module non importé : ${sonde.erreur}`})`)
  s.verdict('PC-4', !d.length, `plus de « proposez-m » ; option a_prendre : « ${court(bon, 90)} » ; MODES_DOMAINE garde 'a_prendre'`, d.join(' ; '))
}

// ── PC-5 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const compterIgnore = (t) => (String(t).match(/@ts-(?:ignore|expect-error)/g) || []).length
function jugerPC5(s, racine) {
  const d = []
  let pkg = null
  try { pkg = lireJson(path.join(racine, 'package.json')) } catch (e) { d.push(`package.json illisible : ${e.message}`) }
  let refPkg = null
  try { refPkg = JSON.parse(blobGit(R, REFERENCE_COMMIT, 'package.json').toString('utf8')) } catch { /* consigné plus bas */ }
  const attendu = refPkg?.scripts?.typecheck || 'tsc --noEmit'
  if (pkg && pkg.scripts?.typecheck !== attendu) d.push(`package.json : "typecheck" vaut ${JSON.stringify(pkg.scripts?.typecheck)}, ${JSON.stringify(attendu)} attendu`)
  for (const f of [LIB, PAGE]) {
    const t = lireOuNull(path.join(racine, f))
    if (!t || !t.length) { d.push(`${f} absent ou vide`); continue }
    if (/@ts-nocheck/.test(t.toString('utf8'))) d.push(`${f} porte @ts-nocheck`)
    const avant = compterIgnore(blobGit(R, REFERENCE_COMMIT, f) || '')
    const apres = compterIgnore(t.toString('utf8'))
    if (apres > avant) d.push(`${f} : ${apres} @ts-ignore / @ts-expect-error (${avant} à ${REFERENCE_COMMIT})`)
  }
  // tsconfig.json de 1620723 (un typecheck vert sous une configuration assouplie ne prouve rien ; relecture du 24/09)
  for (const x of defautsTypecheck(racine).filter((m) => /tsconfig/.test(m))) d.push(x)
  // npm run typecheck, une seule passe : --listFiles donne en plus le programme (les deux fichiers jugés y sont-ils ?)
  const commande = `npm run typecheck -- --listFiles${path.relative(R, racine) === '' ? '' : ' --incremental false'}`
  const t0 = Date.now()
  const r = lancer(commande, [], { cwd: racine, shell: true, timeout: 600_000 })
  const duree = ((Date.now() - t0) / 1000).toFixed(1)
  const fichiers = r.stdout.split(/\r?\n/).map((x) => x.trim()).filter((x) => /^(?:[A-Za-z]:[\\/]|\/)/.test(x) && !/\(\d+,\d+\): error TS/.test(x)).map((x) => path.resolve(x))
  const projet = fichiers.filter((x) => !/[\\/]node_modules[\\/]/.test(x))
  for (const f of [LIB, PAGE]) if (!fichiers.some((x) => pareil(x, path.resolve(racine, f)))) d.push(`${f} hors du programme de tsc (${projet.length} fichiers du projet listés)`)
  if (!/tsc --noEmit/.test(r.sortie)) d.push(`${commande} n’a pas lancé tsc --noEmit (code ${r.code}) : ${court(r.derniereLigne, 120)}`)
  if (r.code !== 0) {
    const erreurs = r.sortie.split(/\r?\n/).filter((x) => /error TS\d+/.test(x))
    d.push(`${commande} en code ${r.code}${r.erreur ? ` (${r.erreur})` : ''} en ${duree} s : ${erreurs.length} erreur(s) TS${erreurs.length ? ` — ${erreurs.slice(0, 2).map((x) => court(x.replace(/\\/g, '/').replace(racine.replace(/\\/g, '/'), ''), 140)).join(' | ')}` : ` — ${court(r.derniereLigne, 140)}`}`)
  }
  s.verdict('PC-5', !d.length, `${commande} : code 0 en ${duree} s (tsc --noEmit, ${projet.length} fichiers du projet dont ${LIB} et ${PAGE}, sans @ts-nocheck ni @ts-ignore ajouté)`, d.join(' ; '))
}

// ── Témoin ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function construireTemoin(o) {
  const base = o.racineParDefaut ? extraireReference().dest : o.racine
  const dest = preparerTemoin(JUGE, { base, copier: COPIE_TEMOIN, superposer: null })
  const poses = []
  for (const f of listerFichiers(TEMOIN_FIXTURES)) {
    if (!f.endsWith('.temoin')) continue
    const cible = f.slice(0, -'.temoin'.length)
    const src = path.join(TEMOIN_FIXTURES, f)
    if (!fs.statSync(src).size) throw new Error(`témoin ${f} vide`)
    fs.mkdirSync(path.dirname(path.join(dest, cible)), { recursive: true })
    fs.copyFileSync(src, path.join(dest, cible))
    poses.push(cible)
  }
  for (const f of [LIB, PAGE]) if (!poses.includes(f)) throw new Error(`témoin incomplet : ${rel(TEMOIN_FIXTURES)}/${f}.temoin manque`)
  return { dest, base, poses }
}

// ── Principal ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const o = lireOptionsOuQuitter(process.argv.slice(2), { connues: [] })
if (o.reel) { console.error('✗ --reel : ce juge ne teste ni la base ni la production (fiche 025-01, point 10)'); process.exit(2) }
if (o.positionnels.length) { console.error(`✗ argument(s) inattendu(s) : ${o.positionnels.join(' ')}`); process.exit(2) }
let racine = o.racine, temoin = null, echecTemoin = null
if (o.temoin) { try { temoin = construireTemoin(o); racine = temoin.dest } catch (e) { echecTemoin = e } }
const s = creerSortie(JUGE, IDS, { racine, temoin: o.temoin })
await s.executer(async (s) => {
  if (echecTemoin) throw echecTemoin
  if (temoin) s.note(`témoin : ${rel(temoin.base)} (${commitDeReference(temoin.base) ? `arbre de ${commitDeReference(temoin.base).slice(0, 7)}` : 'racine donnée'}) copié, puis ${temoin.poses.join(', ')} posés depuis ${rel(TEMOIN_FIXTURES)}/`)
  else s.note(estRacineGit(racine) ? `racine : le dépôt (${rel(racine)})` : `racine : ${rel(racine)}${commitDeReference(racine) ? ` (arbre extrait de ${commitDeReference(racine).slice(0, 7)})` : ''}`)
  const W = dossierTravail(JUGE, `sonde-${process.pid}`)
  try {
    fs.writeFileSync(path.join(W, 'sonde.mjs'), SONDE)
    // l'expression « première personne » du générateur de la racine
    const reGen = premierePersonneDuGenerateur(racine)
    const srcGen = (lireOuNull(path.join(racine, GENERATEUR)) || '').toString('utf8')
    const iGen = srcGen.search(/\.test\(a\.citation\)/)
    const ligneGen = iGen >= 0 ? srcGen.slice(0, iGen).split('\n').length : '?'
    const re = reGen ? new RegExp(reGen.source, reGen.flags.replace(/[gy]/g, '')) : PREMIERE_PERSONNE
    const estPremiere = (c) => re.test(c)
    const identique = !!reGen && reGen.source === PREMIERE_PERSONNE.source && reGen.flags === PREMIERE_PERSONNE.flags
    const cas = construireCas({ annee: new Date().getFullYear(), estPremiere })
    const jeu = controlerJeu(cas, estPremiere)
    const sonde = sonder({ cwd: racine, module: path.join(racine, LIB), loader: path.join(racine, LOADER), cas: cas.map(({ id, entree }) => ({ id, entree })), dossier: W, nom: 'racine' })
    if (sonde.importe) {
      const res = new Map(sonde.cas.map((r) => [r.id, r]))
      for (const id of Object.keys(GROUPES)) { const e = res.get(id)?.E; if (Array.isArray(e)) s.note(`erreurs pour ${id} : ${e.length ? e.map((x) => `« ${court(x, 70)} »`).join(' ; ') : '(aucune)'}`) }
    }
    jugerPC1(s, { sonde, cas, jeu, reGen, ligneGen, identique })
    jugerPC2(s, sonde, sonderReference(W))
    const page = lirePage(racine)
    jugerPC3(s, page)
    jugerPC4(s, page, sonde)
    if (!page.erreur) s.note(`phrase de 025-09 (non jugée ici) « Votre site parle avec votre voix : nous n’inventons rien. » : ${textesDe(page.sf).some((t) => t.includes('Votre site parle avec votre voix')) ? 'présente' : 'absente'}`)
    jugerPC5(s, racine)
  } finally {
    fs.rmSync(W, { recursive: true, force: true })
  }
})
