// scripts/parcours-commande-qa.mjs — le juge de la fiche 025-09 (le dossier /site/commander recueille la voix de l'artisan),
// écrit par Claude Code (fiche 025-01, point 10). Les exécutants n'y touchent pas (CLAUDE.md, règle 1).
//
// Usage : node scripts/parcours-commande-qa.mjs [--racine=<dossier>] [--temoin]
//   --racine=<dossier> : tout est lu et lancé depuis ce dossier (défaut : la racine du dépôt) : lib/siteCommande.ts,
//                        app/site/commander/page.tsx, scripts/ts-loader.mjs, public/sites-demo/generer.mjs, package.json,
//                        tsconfig.json. Rien n'y est écrit (npm run typecheck y tourne avec --incremental false, hors dépôt).
//   --temoin           : le juge construit l'état « après » de 025-09 et s'y juge entier (PC-1 à PC-9), voir « Témoin ».
//   Pas de --reel : ce juge ne touche ni la base ni la production (refusé, code 2).
// Sortie : une ligne PASS/FAIL par critère, puis « parcours-commande-qa : PASS » ou « … : FAIL — ids » ; code 0 seulement si
// les douze sont verts ; code 2 sur une option invalide.
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
// Relectures à froid du 24/09 (fiche 025-16 ; défauts M2, M3, M4, M9 du résultat du workflow serie-025-usine) :
//   PC-6 (M4) le récapitulatif avant paiement montre l'étape « Votre parcours » : l'étape du paiement (entrée de ETAPES qui dit
//        « paiement » ou « récapitulatif ») est rendue, et dans ce rendu (hors attributs : ce que l'écran montre, pas un
//        onClick) un texte JSX dit « parcours », et des expressions lisent le nom ou le prénom, la phrase signée (citation) et
//        les chiffres DE L'ARTISAN (chaîne qui passe par .artisan, ou variable posée depuis …artisan). Et le champ du nom de
//        domaine (saisie qui nomme `domaine`) n'a que des placeholders « Exemple : … » (ni « Ex: », ni « Une idée ? »).
//        Mutation à chaque passage : sur la page jugée (si elle passe), les éléments du récapitulatif qui montrent la phrase
//        signée sont retirés du source, qui est relu : PC-6 doit rougir ; plus deux sondes (page avec et sans récapitulatif).
//   PC-7 (M2) aucune promesse sans code dans app/site/commander/page.tsx ni lib/siteCommande.ts (textes JSX, chaînes et
//        gabarits ; ni commentaires ni chemins d'import) : pas de « guide » ; aucun montant en euros hors la déclaration de
//        PRIX_SITE_TEXTE (« environ 10 € par an » est le prix d'un tiers) ; aucune action de Presti envers l'artisan
//        (« Presti m'envoie / vous enverra … ») : rien dans le code ne l'envoie. Mutation : un composant qui dit « Presti
//        m’envoie le guide (environ 10 € par an) » ajouté à la page doit être vu (trois motifs).
//   PC-8 (M3) un seul texte de délai : dans lib/siteCommande.ts, UNE constante exportée porte le délai en littéral (aujourd'hui
//        DELAI_ANNONCE, dont PC-2 garde la valeur) et aucun autre littéral du fichier n'en écrit un ; aucun délai écrit en dur
//        dans app/site/** ni app/api/site/** ; chaque phrase qui dit le délai (gabarits de lib/siteCommande.ts, gabarits et
//        JSX de tout fichier de app/ et lib/ qui importe une constante du délai de lib/siteCommande, constantes remplacées par
//        leur valeur) donne le MÊME texte, des deux mots avant le délai jusqu'à la fin de la phrase ; et ce texte dit à partir
//        de quoi le délai court (après / à compter de / dès + paiement, commande, ou une validation qualifiée : « validation
//        de … », « … par … » ; « après validation » seul est refusé : validation de quoi ?). Ailleurs dans app/ et lib/ (CGU,
//        courriel interne), un « N h ouvrées » écrit en dur doit valoir la constante. Mutation : une seconde phrase
//        « Livré sous {<constante>}. » ajoutée à la page doit être vue ; sondes : deux textes, « après validation » seul.
//   PC-9 (M9) un texte trop long est refusé, jamais coupé : pour les cas prenom-41, nom-61, parcours-141, parcours-300,
//        citation-161, citation-400, valeur-13, unite-13, legende-61 et enorme (ceux de PC-1), erreursAvantPaiement rend au
//        moins une erreur, dont une qui dit la borne du champ (le nombre : 40, 60, 140, 160, 12, 60 ; pas exigé pour enorme),
//        et nettoyerBrouillon ne garde jamais un début du texte : le champ est retiré (vide, absent, null) ou gardé tel quel
//        (nettoyé : balises ôtées, blancs repliés). Détecteur éprouvé sur quatre sondes (coupé et payable, refusé sans la
//        borne, refusé mais coupé, refusé et gardé : seul le dernier passe).
//   Conséquence sur PC-1 (bornes) : un texte gardé AU-DELÀ de sa borne était toujours un défaut (le nettoyage coupait) ; il
//        n'en est plus un s'il est la copie exacte de l'entrée nettoyée, s'il fait 2 000 signes au plus et si le cas est
//        refusé (E non vide) : c'est la seule façon de refuser sans couper ni effacer ce que l'artisan a écrit. Tout le reste
//        de PC-1 est inchangé, dont l'invariant « payable ⇒ générable » et le plafond de 2 000 signes pour ce qui est gardé.
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
// PC-10 à PC-12 : revue avant mise en ligne du 25/09 (.orchestre/preuves/025-relectures/revue-avant-mise-en-ligne-2026-09-25.md),
// fiche 025-20, écrits par Claude Code.
//   PC-10 (D18) <racine>/app/api/site/commander/route.ts, transpilée et appelée (POST) sans dossier en cours (session, Stripe et
//         base simulés) : le refus compte les écrans à remplir comme la page les montre — si sa phrase en dit un nombre (chiffres
//         ou lettres) avant « écrans » ou « étapes », c'est le rang de l'étape « paiement » dans ETAPES de <racine>/<PAGE> (4
//         aujourd'hui). Mutation : « les trois premiers écrans » avec quatre écrans : vu.
//         Mise à jour du 27/09 (000-retractation) : la route refuse d'abord, en 400, toute commande sans l'accord de renonciation
//         L221-28 (case obligatoire côté serveur, décision de Benj) ; le juge envoie donc { renonciationRetractation: true } pour
//         atteindre le refus « aucun dossier » qu'il juge. Rien n'est relâché : si la route répond encore par le refus de la
//         rétractation (ou par autre chose qu'un 400 qui compte les écrans), PC-10 rougit (« ne dit pas quels écrans remplir »).
//         L'exigence de l'accord elle-même est jugée par le juge de 000-retractation, pas ici.
//   PC-11 (D32) « Corriger » mène à l'étape du champ fautif : le routage de la page (let cible = '…' puis les if (err.includes(…))
//         cible = '…' qui le suivent, lus dans l'arbre syntaxique de <PAGE> et exécutés) appliqué aux erreurs réelles de
//         erreursAvantPaiement (sonde) : chaque dépassement de borne de l'artisan (prénom 41, nom 61, parcours 141, citation 161,
//         valeur, unité, légende d'un chiffre) et la phrase signée impersonnelle mènent à « parcours » ; un SIREN faux à
//         « matiere », une liste de communes vide à « zone », un domaine illisible à « domaine ». Mutation : le routage sans sa
//         ligne « Votre parcours » : vu.
//   PC-12 (D33) « J'… » et « m'… » tapés avec l'apostrophe droite comptent comme la première personne : nettoyerBrouillon puis
//         erreursAvantPaiement (sonde) acceptent « J'interviens toujours avec soin et propreté. » et « On m'appelle pour les
//         chantiers soignés du quartier. », gardent la phrase avec l'apostrophe typographique (’, celle que generer.mjs exige :
//         sans apostrophe droite entre deux lettres) et l'expression « première personne » du générateur de la racine l'accepte ;
//         « Le travail est toujours fait avec soin et propreté. » reste refusée.
const IDS = ['PC-1', 'PC-2', 'PC-3', 'PC-4', 'PC-5', 'PC-6', 'PC-7', 'PC-8', 'PC-9', 'PC-10', 'PC-11', 'PC-12']
const LIB = 'lib/siteCommande.ts'
const PAGE = 'app/site/commander/page.tsx'
const LOADER = 'scripts/ts-loader.mjs'
const GENERATEUR = 'public/sites-demo/generer.mjs'
const TEMOIN_FIXTURES = path.join(FIXTURES, 'temoins', JUGE)
// Next 16 (fiche 026-004) : `middleware.ts` devient `proxy.ts` — on copie celui des deux qui existe sur R (jamais les deux).
const FICHIER_PROXY = fs.existsSync(path.join(R, 'proxy.ts')) ? 'proxy.ts' : 'middleware.ts'
const COPIE_TEMOIN = ['app', 'lib', FICHIER_PROXY, 'tsconfig.json', 'package.json', LOADER, GENERATEUR]
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
  ajouter('parcours-300', 'parcours de 300 signes', avec({ parcours: r(300, 'Q') }), 'tolere') // PC-9 (M9)
  ajouter('citation-400', 'citation de 400 signes', avec({ citation: `Je ${r(396, 'b')}.` }), 'tolere') // PC-9 (M9)
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
  const attendus = [['bornes-hautes', 'prenom', 40], ['bornes-hautes', 'nom', 60], ['bornes-hautes', 'parcours', 140], ['bornes-hautes', 'citation', 160], ['bornes-basses', 'citation', 20], ['citation-19', 'citation', 19], ['prenom-41', 'prenom', 41], ['nom-61', 'nom', 61], ['parcours-141', 'parcours', 141], ['citation-161', 'citation', 161], ['parcours-300', 'parcours', 300], ['citation-400', 'citation', 400]]
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
// PC-9 (relecture à froid du 24/09, M9) : refuser sans couper. Un texte gardé au-delà de sa borne n'est admis que s'il est la
// copie exacte de l'entrée nettoyée (balises ôtées, blancs repliés : le nettoyage de lib/siteCommande.ts, sans la coupe), s'il
// fait PLAFOND_GARDE signes au plus, et si le cas est refusé (erreursAvantPaiement non vide).
const PLAFOND_GARDE = 2000
const nettoye = (v) => String(v ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
const gardeTelQuel = (v, entree, refuse) => refuse && typeof v === 'string' && (typeof entree === 'string' || typeof entree === 'number') && v === nettoye(entree) && v.length <= PLAFOND_GARDE
/** N est-il borné ? (null/absent, ou objet aux clés du contrat, textes ≤ bornes — ou gardés tels quels et refusés —, ≤ 3 chiffres,
 *  sans balise) → défauts. `entree` : l'artisan donné au nettoyage ; `refuse` : erreursAvantPaiement non vide. */
function defautsBorne(N, { entree, refuse = false } = {}) {
  if (N === undefined || N === null) return []
  if (typeof N !== 'object' || Array.isArray(N)) return [`artisan gardé en ${Array.isArray(N) ? 'liste' : typeof N}`]
  const d = []
  const E = entree && typeof entree === 'object' && !Array.isArray(entree) ? entree : {}
  for (const k of Object.keys(N)) if (!CLES.includes(k)) d.push(`clé « ${k} » gardée`)
  for (const [k, max] of Object.entries(MAX)) if (typeof N[k] === 'string' && N[k].length > max && !gardeTelQuel(N[k], E[k], refuse)) d.push(`${k} de ${N[k].length} signes (${max} au plus)`)
  for (const k of ['prenom', 'nom', 'parcours', 'citation']) if (typeof N[k] === 'string' && BALISE.test(N[k])) d.push(`balise HTML gardée dans ${k}`)
  if (N.chiffres !== undefined && N.chiffres !== null) {
    if (!Array.isArray(N.chiffres)) d.push(`chiffres gardé en ${typeof N.chiffres}`)
    else {
      if (N.chiffres.length > 3) d.push(`${N.chiffres.length} chiffres gardés (3 au plus)`)
      N.chiffres.forEach((c, i) => {
        if (c === null || c === undefined) return
        if (typeof c !== 'object' || Array.isArray(c)) { d.push(`chiffres[${i}] gardé en ${typeof c}`); return }
        for (const k of Object.keys(c)) if (!(k in MAX_CHIFFRE)) d.push(`clé « chiffres[${i}].${k} » gardée`)
        const ce = Array.isArray(E.chiffres) && E.chiffres[i] && typeof E.chiffres[i] === 'object' ? E.chiffres[i] : {}
        for (const [k, max] of Object.entries(MAX_CHIFFRE)) {
          const v = typeof c[k] === 'number' ? String(c[k]) : c[k]
          if (typeof v === 'string' && v.length > max && !gardeTelQuel(v, ce[k], refuse)) d.push(`chiffres[${i}].${k} de ${v.length} signes (${max} au plus)`)
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
    for (const x of defautsBorne(N, { entree: c.artisan, refuse: r.E.length > 0 })) K.borne.push(`${c.id} : ${x}`)
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

// ── Relectures à froid du 24/09 : PC-6 à PC-9 ─────────────────────────────────────────────────────────────────────────────
const analyserSource = (src, nom = PAGE) => ts.createSourceFile(nom, src, ts.ScriptTarget.Latest, true, /\.tsx$/.test(nom) ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
const ligneDe = (sf, n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1
/** Les textes montrés (JSX, chaînes, gabarits) sous un nœud, sans les imports ni ce que `exclure` écarte → [{ t, n }] */
function textesAffiches(racineNoeud, exclure = () => false) {
  const out = []
  const rec = (x) => {
    if (ts.isImportDeclaration(x) || ts.isExportDeclaration(x) || exclure(x)) return
    if (ts.isJsxText(x) || estLitteral(x) || ts.isTemplateHead(x) || ts.isTemplateMiddle(x) || ts.isTemplateTail(x)) { const t = norm(x.text); if (t) out.push({ t, n: x }) }
    ts.forEachChild(x, rec)
  }
  rec(racineNoeud)
  return out
}

// PC-6 (M4) : le récapitulatif avant paiement montre « Votre parcours », et le champ du domaine a des exemples marqués « Exemple »
const CHAMPS_RECAP = [['le nom ou le prénom', ['nom', 'prenom']], ['la phrase signée', ['citation']], ['les chiffres', ['chiffres']]]
const MARQUE_AUTRE = /^(?:ex\b|ex\s*[.:]|e\.g\.|par ex)|une\s+id[ée]e/i
function initialiseurs(sf) {
  const m = new Map()
  visiter(sf, (n) => { if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) m.set(n.name.text, n.initializer.getText(sf)) })
  return m
}
/** Les champs de l'artisan lus par ce que rendent les nœuds (attributs exclus : un onClick n'est pas montré) → champ → [nœuds] */
function lecturesArtisan(noeuds, sf) {
  const init = initialiseurs(sf)
  const lus = new Map()
  const rec = (x) => {
    if (ts.isJsxAttribute(x)) return
    if (ts.isPropertyAccessExpression(x) && ['nom', 'prenom', 'citation', 'chiffres'].includes(x.name.text)) {
      const noms = []
      let y = x.expression
      for (;;) {
        y = nu(y)
        if (ts.isPropertyAccessExpression(y)) { noms.push(y.name.text); y = y.expression } else if (ts.isElementAccessExpression(y)) y = y.expression
        else break
      }
      const racineId = ts.isIdentifier(y) ? y.text : ''
      if (noms.includes('artisan') || /artisan/i.test(racineId) || /\.artisan\b/.test(init.get(racineId) || '')) {
        if (!lus.has(x.name.text)) lus.set(x.name.text, [])
        lus.get(x.name.text).push(x)
      }
    }
    ts.forEachChild(x, rec)
  }
  for (const n of noeuds) rec(n)
  return lus
}
function etapePaiement(sf) {
  let etapes = null
  visiter(sf, (n) => { if (!etapes && ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === 'ETAPES' && n.initializer) etapes = nu(n.initializer) })
  if (!etapes || !ts.isArrayLiteralExpression(etapes)) return { erreur: 'la liste ETAPES (tableau littéral) est introuvable dans la page' }
  const entree = etapes.elements.find((el) => textesDe(el).some((t) => /paiement|récapitulatif/i.test(t)))
  if (!entree) return { erreur: 'ETAPES n’a aucune étape « paiement » ou « récapitulatif »' }
  const o = nu(entree)
  const pid = o && ts.isObjectLiteralExpression(o) ? o.properties.find((p) => ts.isPropertyAssignment(p) && p.name.getText() === 'id' && estLitteral(nu(p.initializer))) : null
  if (!pid) return { erreur: 'l’étape du paiement de ETAPES n’a pas d’id littéral' }
  return { id: nu(pid.initializer).text }
}
/** PC-6 sur une page analysée → { ok, echecs, faits, lus, region } */
function jugerRecap(sf) {
  const echecs = [], faits = []
  const ep = etapePaiement(sf)
  let region = [], lus = new Map()
  if (ep.erreur) echecs.push(ep.erreur)
  else {
    region = regionEtape(sf, ep.id)
    if (!region.length) echecs.push(`l’étape du paiement (id « ${ep.id} ») n’est jamais rendue : aucun etape === '${ep.id}' && …, ternaire, if ou case`)
    else {
      const libelles = []
      const rec = (x) => { if (ts.isJsxAttribute(x)) return; if (ts.isJsxText(x) && /parcours/i.test(x.text)) libelles.push(norm(x.text)); ts.forEachChild(x, rec) }
      region.forEach(rec)
      lus = lecturesArtisan(region, sf)
      const manque = CHAMPS_RECAP.filter(([, cs]) => !cs.some((c) => lus.has(c))).map(([n]) => n)
      if (!libelles.length) echecs.push(`le récapitulatif (étape « ${ep.id} ») ne dit « parcours » dans aucun texte affiché`)
      if (manque.length) echecs.push(`le récapitulatif (étape « ${ep.id} ») ne montre pas ${manque.join(', ')} de l’artisan (champs de l’artisan rendus : ${[...lus.keys()].join(', ') || 'aucun'})`)
      if (libelles.length && !manque.length) faits.push(`récapitulatif de l’étape « ${ep.id} » : « ${court(libelles[0], 40)} », et ${[...lus.keys()].join(', ')} de l’artisan rendus (hors attributs)`)
    }
  }
  const champs = elementsJsx([sf]).filter((e) => tagDe(e) === 'input' && estSaisie(e) && nomme(e, 'domaine'))
  if (!champs.length) echecs.push('champ du nom de domaine introuvable (input dont les attributs nomment domaine)')
  const pls = champs.map((e) => placeholders(e, sf)).filter(Boolean)
  const valeurs = [...new Set(pls.flatMap((p) => p.valeurs.map(norm)))]
  if (champs.length && !valeurs.length) echecs.push('champ du nom de domaine sans placeholder « Exemple : … »')
  if (pls.some((p) => p.nonResolu)) echecs.push('placeholder du champ du domaine illisible par le juge (écrivez-le en littéral ou en constante du fichier)')
  const mauvais = valeurs.filter((v) => !/^Exemple\b/.test(v) || MARQUE_AUTRE.test(v))
  if (mauvais.length) echecs.push(`placeholder(s) du champ du domaine hors « Exemple : … » : ${mauvais.map((v) => `« ${court(v, 40)} »`).join(', ')}`)
  else if (valeurs.length) faits.push(`champ du domaine : ${valeurs.map((v) => `« ${court(v, 40)} »`).join(', ')}`)
  return { ok: !echecs.length, echecs, faits, lus, region }
}
/** Mutation : les éléments du récapitulatif qui montrent la phrase signée, retirés du source → nouveau source, ou null */
function sansCitationAuRecap(src, sf, lus) {
  const coupes = []
  for (const n of lus.get('citation') || []) {
    let p = n.parent
    while (p && !(ts.isJsxElement(p) && p.parent && (ts.isJsxElement(p.parent) || ts.isJsxFragment(p.parent)))) p = p.parent
    if (p) coupes.push([p.getStart(sf), p.end])
  }
  if (!coupes.length) return null
  coupes.sort((a, b) => a[0] - b[0])
  const fusion = []
  for (const c of coupes) { const d = fusion[fusion.length - 1]; if (d && c[0] <= d[1]) d[1] = Math.max(d[1], c[1]); else fusion.push([...c]) }
  let out = src
  for (const [a, b] of fusion.reverse()) out = out.slice(0, a) + out.slice(b)
  return out
}
const SONDE_RECAP = (recap) => `const ETAPES = [{ id: 'parcours', nom: 'Votre parcours' }, { id: 'paiement', nom: 'Le paiement' }]
export default function P({ etape, brouillon }: any) {
  const artisan = brouillon.matiere.artisan
  return <main>{etape === 'paiement' && (<div><h3>Récapitulatif</h3><p>Domaine : {brouillon.domaine}</p>${recap}
    <input value={brouillon.domaine || ''} onChange={() => null} placeholder="Exemple : martin-plomberie.fr" /></div>)}</main>
}`
function jugerPC6(s, page) {
  if (page.erreur) { s.echoue('PC-6', page.erreur); return }
  const r = jugerRecap(page.sf)
  for (const e of r.echecs) s.echoue('PC-6', e)
  // le détecteur, éprouvé à chaque passage
  const d = []
  const bonne = jugerRecap(analyserSource(SONDE_RECAP('<p>Votre parcours : {artisan?.prenom} {artisan?.nom}</p><p>{artisan?.citation}</p><p>{artisan?.chiffres === null ? \'Sans chiffres\' : artisan?.chiffres?.map((c: any) => c.valeur).join(\', \')}</p>')))
  const vide = jugerRecap(analyserSource(SONDE_RECAP('<p onClick={() => artisan.citation}>Métier : {brouillon.metier}</p>')))
  if (!bonne.ok) d.push(`sonde avec récapitulatif jugée rouge (${court(bonne.echecs.join(' ; '), 120)})`)
  if (vide.ok || !vide.echecs.some((e) => /phrase signée/.test(e))) d.push('sonde sans récapitulatif (citation lue seulement dans un onClick) jugée verte')
  let mutation = ''
  if (r.ok) {
    const m = sansCitationAuRecap(page.src, page.sf, r.lus)
    if (!m) d.push('mutation non jouée : aucune phrase signée à retirer du récapitulatif')
    else {
      const rm = jugerRecap(analyserSource(m))
      if (rm.ok || !rm.echecs.some((e) => /phrase signée/.test(e))) d.push('mutation : la phrase signée retirée du récapitulatif, la page reste verte')
      else mutation = ` ; mutation : la phrase signée retirée du récapitulatif (${(r.lus.get('citation') || []).length} lecture(s)) → vue`
    }
  }
  for (const x of d) s.echoue('PC-6', `détecteur : ${x}`)
  if (r.ok && !d.length) s.passe('PC-6', `${r.faits.join(' ; ')} ; sondes avec et sans récapitulatif jugées justes${mutation}`)
}

// PC-7 (M2) : aucune promesse sans code dans la page ni dans lib/siteCommande.ts
const PROMESSES = [
  ['« guide »', /(?<![\p{L}])guides?(?![\p{L}])/iu],
  ['montant en euros (prix d’un tiers ou prix écrit en dur)', /\d[\d\s  .,]*\s*(?:€|euros?(?![\p{L}])|EUR(?![\p{L}]))/iu],
  ['action de Presti envers l’artisan', /presti\s+(?:vous|m’|me|te|t’|leur|lui)\s*(?:envoie|enverra|envoi|adresse|adressera|transmet|transmettra|fournit|fournira|remet|remettra|offre|offrira)/iu],
]
function promessesSansCode(fichiers) {
  const hits = []
  for (const { rel: f, sf, exclure } of fichiers) for (const { t, n } of textesAffiches(sf, exclure)) for (const [motif, re] of PROMESSES) if (re.test(t)) hits.push({ f, ligne: ligneDe(sf, n), motif, t })
  return hits
}
const exclurePrix = (x) => ts.isVariableDeclaration(x) && ts.isIdentifier(x.name) && x.name.text === 'PRIX_SITE_TEXTE'
function jugerPC7(s, page, racine) {
  if (page.erreur) { s.echoue('PC-7', page.erreur); return }
  const lib = lireOuNull(path.join(racine, LIB))
  if (!lib || !lib.length) { s.echoue('PC-7', `${LIB} absent ou vide`); return }
  const sfLib = analyserSource(lib.toString('utf8'), LIB)
  const fichiers = [{ rel: PAGE, sf: page.sf, exclure: () => false }, { rel: LIB, sf: sfLib, exclure: exclurePrix }]
  const hits = promessesSansCode(fichiers)
  for (const h of hits) s.echoue('PC-7', `${h.f}:${h.ligne} [${h.motif}] « ${court(h.t, 110)} »`)
  const sonde = analyserSource(`${page.src}\nexport function SondePC7() { return <p>Presti m’envoie le guide (environ 10 € par an).</p> }\n`)
  const vus = new Set(promessesSansCode([{ rel: PAGE, sf: sonde, exclure: () => false }]).filter((h) => h.t.includes('SondePC7') || /Presti m’envoie le guide/.test(h.t)).map((h) => h.motif))
  const aveugles = PROMESSES.map(([m]) => m).filter((m) => !vus.has(m))
  if (aveugles.length) s.echoue('PC-7', `détecteur aveugle : « Presti m’envoie le guide (environ 10 € par an) » ajouté à la page, ${aveugles.join(', ')} non vu(s)`)
  const n = fichiers.reduce((a, f) => a + textesAffiches(f.sf, f.exclure).length, 0)
  if (!hits.length && !aveugles.length) s.passe('PC-7', `${n} textes affichés de ${PAGE} et ${LIB} (déclaration de PRIX_SITE_TEXTE exceptée) : ni « guide », ni montant en euros, ni action promise de Presti ; mutation : « Presti m’envoie le guide (environ 10 € par an) » ajouté à la page → ${PROMESSES.length} motifs vus`)
}

// PC-8 (M3) : un seul texte de délai, qui dit à partir de quoi il court
// une durée (« 48 h ouvrées », « sous 48 h », « délai de 3 jours »), pas une heure du jour (« 8h-18h » d'un placeholder d'horaires)
const RE_DELAI = /(?<![\p{L}])(?:sous|en|dans|d’ici|délai\s+(?:annoncé\s+)?(?:de\s+)?|annoncé\s+de)\s+\d+\s*(?:h|heures?|jours?)(?![\p{L}])|(?<![\d\p{L}])\d+\s*(?:h|heures?|jours?)\s+ouvr\p{L}*/iu
const RE_H_OUVREES = /(?<![\d\p{L}])(\d+)\s*(h|heures?)\s+ouvr\p{L}*/giu
const IMPORTE_COMMANDE = /from\s+['"](?:@\/lib\/siteCommande|(?:\.\.?\/)+(?:lib\/)?siteCommande)['"]/
const SITE_COMMANDE_DIRS = ['app/site/commander/', 'app/api/site/commander/']
function constantesExportees(sf) {
  const decl = new Map()
  for (const st of sf.statements) if (ts.isVariableStatement(st) && st.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name) && d.initializer) decl.set(d.name.text, d)
  const valeurs = new Map()
  const evaluer = (e, prof = 0) => {
    e = nu(e)
    if (!e || prof > 8) return null
    if (estLitteral(e)) return e.text
    if (ts.isTemplateExpression(e)) { let t = e.head.text; for (const sp of e.templateSpans) t += (evaluer(sp.expression, prof + 1) ?? '…') + sp.literal.text; return t }
    if (ts.isIdentifier(e) && decl.has(e.text)) { if (!valeurs.has(e.text)) valeurs.set(e.text, evaluer(decl.get(e.text).initializer, prof + 1)); return valeurs.get(e.text) }
    return null
  }
  for (const [k, d] of decl) if (!valeurs.has(k)) valeurs.set(k, evaluer(d.initializer))
  return { decl, valeurs, evaluer }
}
/** La phrase qui dit le délai → { unite (deux mots avant le délai → fin de phrase, en minuscules), suite, phrase } */
function uniteDelai(texte, valeur) {
  const t = norm(texte), v = norm(valeur)
  const i = t.toLowerCase().indexOf(v.toLowerCase())
  if (i < 0) return null
  let debut = 0
  for (const m of t.slice(0, i).matchAll(/[.!?…]\s+(?=[A-ZÀ-ÖØ-Þ«"(])/gu)) debut = m.index + m[0].length
  const reste = t.slice(i + v.length)
  const mf = /[.!?…](?=\s+[A-ZÀ-ÖØ-Þ«"(]|\s*$)/u.exec(reste)
  const fin = mf ? i + v.length + mf.index : t.length
  const avant = t.slice(debut, i).trim().split(/\s+/).filter(Boolean).slice(-2).join(' ')
  const suite = t.slice(i + v.length, fin).trim().replace(/[.,;:!?…]+$/, '').toLowerCase()
  return { unite: `${avant} ${v} ${suite}`.replace(/\s+/g, ' ').trim().toLowerCase().replace(/[.,;:!?…]+$/, ''), suite, phrase: t.slice(debut, fin + 1).trim() }
}
function defautDepart(suite) {
  if (!/(?:après|à compter d|dès|à partir d)/i.test(suite)) return `« ${court(suite, 60) || '(rien après le délai)'} » : ne dit pas à partir de quoi le délai court`
  const valid = /valid\p{L}*/iu.exec(suite)
  if (valid) return /^\s+(?:[\p{L}’']+\s+){0,2}?(?:de|du|des|d’|par)\s*\p{L}/iu.test(suite.slice(valid.index + valid[0].length)) ? null : `« ${court(suite, 60)} » : validation de quoi, par qui ?`
  return /paiement|commande|réception/i.test(suite) ? null : `« ${court(suite, 60)} » : le départ n’est ni un paiement, ni une commande, ni une validation nommée`
}
/** Le texte rendu d'un élément JSX, constantes de lib/siteCommande.ts remplacées par leur valeur ; le reste en « … ». */
function rendreJsx(el, valeurs) {
  let out = ''
  const rec = (x) => {
    if (ts.isJsxText(x)) { out += x.text; return }
    if (ts.isJsxExpression(x)) {
      const e = nu(x.expression)
      if (!e) return
      if (estLitteral(e)) out += e.text
      else if (ts.isIdentifier(e) && typeof valeurs.get(e.text) === 'string') out += valeurs.get(e.text)
      else out += ' … '
      return
    }
    if (ts.isJsxElement(x)) { x.children.forEach(rec); return }
    if (ts.isJsxFragment(x)) { x.children.forEach(rec); return }
    if (ts.isJsxSelfClosingElement(x)) out += ' '
  }
  if (ts.isJsxElement(el) || ts.isJsxFragment(el)) el.children.forEach(rec)
  return out
}
function rendreGabarit(g, valeurs) {
  let t = g.head.text
  for (const sp of g.templateSpans) { const e = nu(sp.expression); t += (ts.isIdentifier(e) && typeof valeurs.get(e.text) === 'string' ? valeurs.get(e.text) : estLitteral(e) ? e.text : '…') + sp.literal.text }
  return t
}
/** PC-8 sur un ensemble de fichiers (rel → source) → { ok, echecs, faits } */
function jugerDelai(fichiers) {
  const echecs = [], faits = []
  const srcLib = fichiers.get(LIB)
  if (!srcLib) return { ok: false, echecs: [`${LIB} absent`], faits }
  const sfLib = analyserSource(srcLib, LIB)
  const { decl, valeurs } = constantesExportees(sfLib)
  const bases = [...decl].filter(([, d]) => estLitteral(nu(d.initializer)) && RE_DELAI.test(nu(d.initializer).text))
  if (bases.length !== 1) return { ok: false, echecs: [`${bases.length} constante(s) exportée(s) de ${LIB} écrivent un délai en littéral (${bases.map(([k]) => k).join(', ') || 'aucune'}) : une seule attendue`], faits }
  const [baseNom, baseDecl] = bases[0]
  const valeur = nu(baseDecl.initializer).text
  const delais = new Set([...valeurs].filter(([, v]) => typeof v === 'string' && v.includes(valeur)).map(([k]) => k))
  // aucun autre littéral du délai dans lib/siteCommande.ts, ni dans le parcours de commande
  for (const { t, n } of textesAffiches(sfLib, (x) => x === baseDecl)) if (RE_DELAI.test(t)) echecs.push(`${LIB}:${ligneDe(sfLib, n)} : délai écrit en dur hors de ${baseNom} (« ${court(t, 80)} »)`)
  const phrases = [] // { ou, unite, suite, phrase }
  const noter = (ou, texte) => { const u = uniteDelai(texte, valeur); if (u) phrases.push({ ou, ...u }); else echecs.push(`${ou} : la phrase rendue ne contient pas la valeur du délai (« ${court(texte, 80)} »)`) }
  visiter(sfLib, (x) => { if (ts.isTemplateExpression(x) && x.templateSpans.some((sp) => ts.isIdentifier(nu(sp.expression)) && delais.has(nu(sp.expression).text))) noter(`${LIB}:${ligneDe(sfLib, x)}`, rendreGabarit(x, valeurs)) })
  let lus = 1
  for (const [rel, src] of fichiers) {
    if (rel === LIB || !/\.tsx?$/.test(rel)) continue
    const dansCommande = SITE_COMMANDE_DIRS.some((d) => rel.startsWith(d))
    const importe = IMPORTE_COMMANDE.test(src) && [...delais].some((k) => src.includes(k))
    const heures = RE_H_OUVREES.test(src); RE_H_OUVREES.lastIndex = 0
    if (!dansCommande && !importe && !heures) continue
    lus++
    const sf = analyserSource(src, rel)
    if (dansCommande) for (const { t, n } of textesAffiches(sf)) if (RE_DELAI.test(t)) echecs.push(`${rel}:${ligneDe(sf, n)} : délai écrit en dur (« ${court(t, 80)} ») — il vient de ${baseNom}`)
    if (!dansCommande && heures) for (const { t, n } of textesAffiches(sf)) for (const m of t.matchAll(RE_H_OUVREES)) {
      if (!/^\s*\d+\s*(?:h|heures?)\s+ouvr/i.test(valeur) || m[1] !== valeur.match(/\d+/)[0]) echecs.push(`${rel}:${ligneDe(sf, n)} : « ${m[0]} » écrit en dur ne vaut pas ${baseNom} (« ${valeur} »)`)
      else faits.push(`${rel}:${ligneDe(sf, n)} « ${m[0]} » = ${baseNom}`)
    }
    if (!importe) continue
    visiter(sf, (x) => {
      if (!ts.isIdentifier(x) || !delais.has(x.text) || ts.isImportSpecifier(x.parent) || (ts.isPropertyAccessExpression(x.parent) && x.parent.name === x)) return
      const ou = `${rel}:${ligneDe(sf, x)}`
      const p = x.parent
      if (ts.isTemplateSpan(p) && p.expression === x) { noter(ou, rendreGabarit(p.parent, valeurs)); return }
      if (ts.isJsxExpression(p) && p.parent && (ts.isJsxElement(p.parent) || ts.isJsxFragment(p.parent))) { noter(ou, rendreJsx(p.parent, valeurs)); return }
      echecs.push(`${ou} : ${x.text} utilisé hors d'un texte que le juge sait lire (gabarit ou enfant JSX)`)
    })
  }
  if (!phrases.length) echecs.push(`aucune phrase ne dit le délai (${baseNom})`)
  const unites = [...new Set(phrases.map((p) => p.unite))]
  if (unites.length > 1) echecs.push(`${unites.length} textes pour un même délai : ${unites.map((u) => `« ${u} » (${phrases.filter((p) => p.unite === u).map((p) => p.ou).join(', ')})`).join(' ; ')}`)
  for (const u of unites) { const d = defautDepart(phrases.find((p) => p.unite === u).suite); if (d) echecs.push(`${phrases.filter((p) => p.unite === u).map((p) => p.ou).join(', ')} : ${d}`) }
  if (!echecs.length) faits.unshift(`${baseNom} « ${valeur} » seule constante du délai (${[...delais].join(', ')} en dérivent) ; ${phrases.length} phrase(s) dans ${lus} fichier(s), un seul texte : « ${unites[0]} »`)
  return { ok: !echecs.length, echecs, faits }
}
function fichiersDelai(racine, surcharge = new Map()) {
  const m = new Map()
  for (const d of ['app', 'lib']) for (const r of listerFichiers(path.join(racine, d))) {
    if (!/\.tsx?$/.test(r) || /(^|\/)node_modules\//.test(r)) continue
    const rel = `${d}/${r}`
    m.set(rel, surcharge.has(rel) ? surcharge.get(rel) : fs.readFileSync(path.join(racine, rel), 'utf8'))
  }
  return m
}
function jugerPC8(s, racine, page) {
  const r = jugerDelai(fichiersDelai(racine))
  for (const e of r.echecs) s.echoue('PC-8', e)
  // sondes du détecteur, et mutation de la page jugée
  const lib = "export const DELAI_ANNONCE = '48 h ouvrées'\n"
  const pageDe = (a, b) => `import { DELAI_ANNONCE } from '@/lib/siteCommande'\nexport default function P() { return <main><p>${a}</p><p>${b}</p></main> }\n`
  const sonde = (a, b) => jugerDelai(new Map([[LIB, lib], [PAGE, pageDe(a, b)]]))
  const d = []
  const juste = 'Livré sous {DELAI_ANNONCE} après la validation humaine de votre site par Presti.'
  if (!sonde(juste, `Le site est commandé. ${juste}`).ok) d.push('sonde « un seul texte, départ nommé » jugée rouge')
  if (sonde('Livré sous {DELAI_ANNONCE}.', juste).ok) d.push('sonde « deux textes » jugée verte')
  if (sonde('Livré sous {DELAI_ANNONCE} après validation.', 'Livré sous {DELAI_ANNONCE} après validation.').ok) d.push('sonde « après validation » seul jugée verte')
  if (sonde('Livré sous 48 h ouvrées après la validation humaine de votre site par Presti.', juste).ok) d.push('sonde « délai écrit en dur » jugée verte')
  let mutation = ''
  if (r.ok && !page.erreur) {
    const base = [...constantesExportees(analyserSource(fs.readFileSync(path.join(racine, LIB), 'utf8'), LIB)).decl].find(([, x]) => estLitteral(nu(x.initializer)) && RE_DELAI.test(nu(x.initializer).text))
    const m = jugerDelai(fichiersDelai(racine, new Map([[PAGE, `${page.src}\nexport function SondePC8() { return <p>Livré sous {${base[0]}}.</p> }\n`]])))
    if (m.ok) d.push(`mutation : « Livré sous {${base[0]}}. » ajouté à la page, PC-8 reste vert`)
    else mutation = ` ; mutation : « Livré sous {${base[0]}}. » ajouté à la page → vu`
  }
  for (const x of d) s.echoue('PC-8', `détecteur : ${x}`)
  if (r.ok && !d.length) s.passe('PC-8', `${r.faits.join(' ; ')} ; sondes (deux textes, « après validation » seul, délai en dur) vues${mutation}`)
}

// PC-9 (M9) : un texte trop long est refusé, jamais coupé
const TROP_LONGS = [
  ['prenom-41', 'prenom', 40], ['nom-61', 'nom', 60], ['parcours-141', 'parcours', 140], ['parcours-300', 'parcours', 140],
  ['citation-161', 'citation', 160], ['citation-400', 'citation', 160],
  ['valeur-13', 'chiffres.0.valeur', 12], ['unite-13', 'chiffres.0.unite', 12], ['legende-61', 'chiffres.0.legende', 60],
  ['enorme', null, null],
]
const CHAMPS_ENORME = ['prenom', 'nom', 'parcours', 'citation', 'chiffres.0.legende', 'chiffres.1.legende', 'chiffres.2.legende']
const champDe = (o, chemin) => chemin.split('.').reduce((x, k) => (x && typeof x === 'object' ? x[/^\d+$/.test(k) ? Number(k) : k] : undefined), o)
/** PC-9 sur des résultats de sonde → défauts (pur : éprouvé sur des sondes) */
function defautsTropLongs(cas, res, liste = TROP_LONGS) {
  const par = new Map(cas.map((c) => [c.id, c]))
  const d = []
  for (const [id, champ, borne] of liste) {
    const c = par.get(id), r = res.get(id)
    if (!c || !r) { d.push(`${id} : sans résultat`); continue }
    if (r.exceptionN || r.exceptionE || !Array.isArray(r.E)) { d.push(`${id} : exception ou résultat illisible`); continue }
    const N = r.N && r.N.matiere ? r.N.matiere.artisan : undefined
    const coupes = []
    for (const k of champ ? [champ] : CHAMPS_ENORME) {
      const entree = nettoye(champDe(c.artisan, k)), garde = champDe(N, k)
      const g = typeof garde === 'number' ? String(garde) : garde
      if (typeof g === 'string' && g && g !== entree && g.length < entree.length && entree.startsWith(g)) coupes.push(`${k} coupé à ${g.length} signes sur ${entree.length}`)
    }
    if (!r.E.length) d.push(`${id} : accepté (aucune erreur)${coupes.length ? `, ${coupes.join(', ')}` : ''}`)
    else if (coupes.length) d.push(`${id} : refusé, mais ${coupes.join(', ')} dans le brouillon`)
    if (r.E.length && borne && !r.E.some((e) => new RegExp(`(?<!\\d)${borne}(?!\\d)`).test(e))) d.push(`${id} : aucune erreur ne dit la borne (${borne}) : « ${court(r.E.join(' | '), 90)} »`)
  }
  return d
}
function jugerPC9(s, { sonde, cas }) {
  if (!sonde.importe) { s.echoue('PC-9', `${LIB} non importé par ${LOADER} : ${sonde.erreur}`); return }
  const res = new Map((sonde.cas || []).map((r) => [r.id, r]))
  const d = defautsTropLongs(cas, res)
  for (const x of d) s.echoue('PC-9', x)
  // le détecteur, sur quatre sondes (un parcours de 141 signes)
  const c = cas.find((x) => x.id === 'parcours-141')
  const avec = (parcours, E) => new Map([['parcours-141', { id: 'parcours-141', E, N: { matiere: { artisan: { ...c.artisan, parcours } } } }]])
  const un = [TROP_LONGS.find((x) => x[0] === 'parcours-141')]
  const p141 = c.artisan.parcours, p140 = p141.slice(0, 140), dit = ['Votre parcours : 140 signes au plus.']
  const essais = [['coupé et payable', avec(p140, []), true], ['refusé sans la borne', avec('', ['Votre parcours manque.']), true], ['refusé mais coupé', avec(p140, dit), true], ['refusé et gardé', avec(p141, dit), false]]
  const faux = essais.filter(([, r, rouge]) => (defautsTropLongs(cas, r, un).length > 0) !== rouge).map(([n]) => n)
  if (faux.length) s.echoue('PC-9', `détecteur : sonde(s) mal jugée(s) : ${faux.join(', ')}`)
  if (!d.length && !faux.length) {
    const garde = TROP_LONGS.filter(([id, k]) => k && typeof champDe(res.get(id)?.N?.matiere?.artisan, k) === 'string' && champDe(res.get(id).N.matiere.artisan, k).length > 0).length
    s.passe('PC-9', `${TROP_LONGS.length} cas trop longs refusés, chacun avec la borne dans une erreur (enorme excepté), aucun texte coupé (${garde} gardé(s) tel(s) quel(s), ${TROP_LONGS.length - 1 - garde} retiré(s)) ; détecteur éprouvé sur 4 sondes (coupé et payable, refusé sans la borne, refusé mais coupé → vus ; refusé et gardé → vert)`)
  }
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

// ── PC-10 : le refus sans dossier compte les écrans comme la page (D18) ────────────────────────────────────────────────────
const NOMBRES = { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8 }
/** Le rang de l'étape « paiement » dans ETAPES de la page (le nombre d'écrans à remplir avant de payer). */
function ecransAvantPaiement(sf) {
  let rang = null
  const visite = (n) => {
    if (rang !== null) return
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === 'ETAPES' && n.initializer && ts.isArrayLiteralExpression(n.initializer)) {
      const ids = n.initializer.elements.map((e) => (ts.isObjectLiteralExpression(e) ? e.properties.find((p) => ts.isPropertyAssignment(p) && p.name.getText(sf) === 'id') : null)).map((p) => (p && ts.isStringLiteralLike(p.initializer) ? p.initializer.text : null))
      const i = ids.indexOf('paiement')
      rang = i >= 0 ? i : -1
      return
    }
    ts.forEachChild(n, visite)
  }
  visite(sf)
  return rang
}
/** Les défauts d'un message de refus « aucun dossier » pour `n` écrans → liste (pur : éprouvé par la mutation) */
export function defautsCompteEcrans(message, n) {
  const d = []
  const m = /(?<![\p{L}\d])(\d+|un|une|deux|trois|quatre|cinq|six|sept|huit)\s+(?:premi[eè]re?s?\s+)?(?:écrans?|étapes?)/iu.exec(String(message))
  if (m) { const k = /^\d+$/.test(m[1]) ? Number(m[1]) : NOMBRES[m[1].toLowerCase()]; if (k !== n) d.push(`« ${court(message, 90)} » : ${k} écran(s), la page en montre ${n} avant le paiement`) }
  else if (!/écran|étape/i.test(String(message))) d.push(`« ${court(message, 90)} » ne dit pas quels écrans remplir`)
  return d
}
async function chargerRouteCommander(racine) {
  const fichier = path.join(racine, 'app', 'api', 'site', 'commander', 'route.ts')
  if (!fs.existsSync(fichier)) throw new Error('app/api/site/commander/route.ts absent')
  const caches = new Map()
  class Rep { constructor(corps, init = {}) { this.status = init.status ?? 200; this.corps = corps } static json(corps, init = {}) { return new Rep(corps, init) } }
  const faux = () => new Proxy(function () {}, { get: (_, k) => (k === 'then' ? undefined : faux()), apply: () => faux() })
  const stubs = {
    'next/server': { NextResponse: Rep },
    '@/lib/flags': { actif: () => true, FLAGS: {} },
    '@/lib/authArtisan': { authArtisan: async () => ({ uid: '00000000-0000-4000-8000-0000000020a1' }), estEchec: () => false },
    '@/lib/stripe': { stripe: faux() },
    '@/lib/supabaseAdmin': { supabaseAdmin: faux() },
    '@/lib/facturation': { mentionFranchise: () => '' },
    '@/lib/siteCommandeServeur': { brouillonDe: async () => null, poserSessionStripe: async () => {} },
    '@/lib/vercelDomains': { normalizeDomain: (d) => String(d || '').trim().toLowerCase() || null },
  }
  const charger = (f) => {
    if (caches.has(f)) return caches.get(f).exports
    const js = ts.transpileModule(fs.readFileSync(f, 'utf8'), { fileName: f, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText
    const module = { exports: {} }
    caches.set(f, module)
    const req = (spec) => {
      if (Object.prototype.hasOwnProperty.call(stubs, spec)) return stubs[spec]
      const base = spec.startsWith('@/') ? path.join(racine, spec.slice(2)) : spec.startsWith('.') ? path.resolve(path.dirname(f), spec) : null
      if (base) for (const e of ['', '.ts', '.tsx', '/index.ts']) if (fs.existsSync(base + e) && fs.statSync(base + e).isFile()) return charger(base + e)
      return faux()
    }
    new Function('exports', 'require', 'module', '__filename', '__dirname', 'process', js)(module.exports, req, module, f, path.dirname(f), { env: {} })
    return module.exports
  }
  return charger(fichier)
}
async function jugerPC10(s, racine, page) {
  if (page.erreur) { s.echoue('PC-10', page.erreur); return }
  const n = ecransAvantPaiement(page.sf)
  if (n === null || n < 1) { s.echoue('PC-10', `${PAGE} : ETAPES sans étape « paiement » lisible`); return }
  let rep
  // l'accord L221-28 est donné (000-retractation, 27/09) : sans lui, la route refuse avant de chercher le dossier
  try { const route = await chargerRouteCommander(racine); rep = await route.POST({ headers: { get: () => null }, json: async () => ({ renonciationRetractation: true }) }) } catch (e) { s.echoue('PC-10', `route non appelée : ${String(e && e.message || e).split('\n')[0].slice(0, 200)}`); return }
  const message = rep?.corps?.error
  const d = []
  if (rep?.status !== 400 || typeof message !== 'string') d.push(`sans dossier, la route répond ${rep?.status} ${court(JSON.stringify(rep?.corps), 80)} (400 et une phrase attendus)`)
  else d.push(...defautsCompteEcrans(message, n))
  const vu = defautsCompteEcrans('Aucun dossier en cours : remplissez d’abord les trois premiers écrans.', 4).length > 0
  if (!vu) d.push('détecteur aveugle : « trois premiers écrans » pour quatre écrans passe')
  s.verdict('PC-10', !d.length, `sans dossier : « ${court(message, 100)} » ; ${n} écrans avant le paiement dans ETAPES ; mutation : « trois premiers écrans » → vu`, d.join(' ; '))
}

// ── PC-11 : « Corriger » mène à l'étape du champ fautif (D32) ; PC-12 : l'apostrophe droite (D33) ─────────────────────────
/** Le routage de « Corriger » tiré de la page : (err) => étape, ou { erreur } */
export function routageCorriger(sf) {
  let decl = null
  const visite = (n) => { if (decl) return; if (ts.isVariableStatement(n) && n.declarationList.declarations.some((d) => ts.isIdentifier(d.name) && d.name.text === 'cible' && d.initializer && ts.isStringLiteralLike(d.initializer))) { decl = n; return } ts.forEachChild(n, visite) }
  visite(sf)
  if (!decl || !ts.isBlock(decl.parent)) return { erreur: 'routage de « Corriger » introuvable (let cible = \'…\' suivi de if (err.includes(…)) cible = \'…\')' }
  const st = decl.parent.statements, i = st.indexOf(decl)
  const suite = []
  for (const x of st.slice(i + 1)) { if (ts.isIfStatement(x) && /\bcible\s*=/.test(x.thenStatement.getText(sf))) suite.push(x); else break }
  if (!suite.length) return { erreur: 'routage de « Corriger » sans condition' }
  const code = [decl, ...suite].map((x) => x.getText(sf)).join('\n')
  const js = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText
  const variable = decl.declarationList.declarations.find((d) => d.name.text === 'cible').name.text
  try { return { route: new Function('err', `${js}\nreturn ${variable}`), code, lignes: suite.length } } catch (e) { return { erreur: `routage illisible : ${e.message}` } }
}
const CAS_PC11 = [
  ['prenom-41', 'parcours'], ['nom-61', 'parcours'], ['parcours-141', 'parcours'], ['citation-161', 'parcours'],
  ['valeur-13', 'parcours'], ['unite-13', 'parcours'], ['legende-61', 'parcours'],
]
function casSupplementaires() {
  const commande = lireCommande()
  const base = structuredClone(commande)
  delete base._; if (base.matiere) delete base.matiere._photos
  const A = structuredClone(commande.matiere.artisan)
  const avecArtisan = (champs) => { const e = structuredClone(base); e.matiere.artisan = { ...structuredClone(A), ...champs }; return e }
  const e = (f) => { const x = structuredClone(base); f(x); return x }
  return [
    { id: 'pc11-impersonnelle', entree: avecArtisan({ citation: 'Le travail est toujours fait avec soin et propreté.' }), etape: 'parcours' },
    { id: 'pc11-siren', entree: e((x) => { x.matiere.siren = '123456789' }), etape: 'matiere' },
    { id: 'pc11-sans-commune', entree: e((x) => { x.communes = [] }), etape: 'zone' },
    { id: 'pc11-domaine', entree: e((x) => { x.domaine_mode = 'existant'; x.domaine = 'pas un domaine' }), etape: 'domaine' },
    { id: 'pc12-j', entree: avecArtisan({ citation: 'J\'interviens toujours avec soin et propreté.' }), premiere: true },
    { id: 'pc12-m', entree: avecArtisan({ citation: 'On m\'appelle pour les chantiers soignés du quartier.' }), premiere: true },
    { id: 'pc12-impersonnelle', entree: avecArtisan({ citation: 'Le travail est toujours fait avec soin et propreté.' }), premiere: false },
  ]
}
function jugerPC11(s, { page, sonde, supp }) {
  if (page.erreur) { s.echoue('PC-11', page.erreur); return }
  const r = routageCorriger(page.sf)
  if (r.erreur) { s.echoue('PC-11', `${PAGE} : ${r.erreur}`); return }
  if (!sonde.importe || !supp.importe) { s.echoue('PC-11', `${LIB} non importé : ${sonde.erreur || supp.erreur}`); return }
  const res = new Map([...sonde.cas, ...supp.cas].map((x) => [x.id, x]))
  const attendus = [...CAS_PC11, ...casSupplementaires().filter((c) => c.etape).map((c) => [c.id, c.etape])]
  const d = [], vus = []
  const juger = (route) => {
    const out = []
    for (const [id, etape] of attendus) {
      const E = res.get(id)?.E
      if (!Array.isArray(E) || !E.length) { out.push(`${id} : aucune erreur à router (${res.get(id)?.exceptionN || res.get(id)?.exceptionE || 'E vide'})`); continue }
      for (const err of E) { let c; try { c = route(err) } catch (e) { c = `exception ${e.message}` } if (c !== etape) out.push(`${id} : « ${court(err, 70)} » → « ${c} », « ${etape} » attendue`) }
    }
    return out
  }
  d.push(...juger(r.route))
  // mutation : le routage sans sa dernière condition (celle qui mène à « Votre parcours »)
  const sans = r.code.split('\n').filter((l) => !/Votre parcours/.test(l)).join('\n')
  let vu = false
  try { const js = ts.transpileModule(sans, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText; vu = juger(new Function('err', `${js}\nreturn cible`)).length > 0 } catch { vu = false }
  if (!vu) d.push('détecteur aveugle : le routage privé de sa ligne « Votre parcours » passe')
  for (const [id, etape] of attendus) if (!d.some((x) => x.startsWith(`${id} :`))) vus.push(`${id}→${etape}`)
  s.verdict('PC-11', !d.length, `routage de ${PAGE} (${r.lignes} condition(s)) exécuté sur ${attendus.length} cas : ${vus.join(', ')} ; mutation : sans la ligne « Votre parcours » → vue`, d.join(' ; '))
}
function jugerPC12(s, { supp, reGen }) {
  if (!supp.importe) { s.echoue('PC-12', `${LIB} non importé : ${supp.erreur}`); return }
  const res = new Map(supp.cas.map((x) => [x.id, x]))
  const re = reGen ? new RegExp(reGen.source, reGen.flags.replace(/[gy]/g, '')) : PREMIERE_PERSONNE
  const d = [], faits = []
  for (const c of casSupplementaires().filter((x) => x.premiere !== undefined)) {
    const r = res.get(c.id)
    if (!r || r.exceptionN || r.exceptionE || !Array.isArray(r.E)) { d.push(`${c.id} : ${r?.exceptionN || r?.exceptionE || 'sans résultat'}`); continue }
    const cit = r.N?.matiere?.artisan?.citation
    if (c.premiere) {
      if (r.E.length) d.push(`« ${c.entree.matiere.artisan.citation} » refusée : ${court(r.E.join(' | '), 110)}`)
      if (typeof cit !== 'string' || /\p{L}'\p{L}/u.test(cit)) d.push(`« ${c.entree.matiere.artisan.citation} » gardée avec l’apostrophe droite (« ${cit} ») : generer.mjs la refuserait`)
      else if (!re.test(cit)) d.push(`« ${cit} » : l’expression « première personne » du générateur la refuse`)
      else faits.push(`« ${c.entree.matiere.artisan.citation} » → « ${cit} » acceptée`)
    } else if (!r.E.length) d.push(`« ${c.entree.matiere.artisan.citation} » (impersonnelle) acceptée`)
    else faits.push('la phrase impersonnelle reste refusée')
  }
  s.verdict('PC-12', !d.length, `${faits.join(' ; ')} ; générateur : ${reGen ? 'expression de generer.mjs' : 'expression de commun.mjs'}`, d.join(' ; '))
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
    for (const [id, f] of [['PC-6', () => jugerPC6(s, page)], ['PC-7', () => jugerPC7(s, page, racine)], ['PC-8', () => jugerPC8(s, racine, page)], ['PC-9', () => jugerPC9(s, { sonde, cas })]]) {
      try { f() } catch (e) { s.echoue(id, `exception : ${String(e && e.stack || e).split('\n').slice(0, 2).join(' | ').slice(0, 300)}`) }
    }
    // PC-10 à PC-12 (revue avant mise en ligne du 25/09, fiche 025-20)
    try { await jugerPC10(s, racine, page) } catch (e) { s.echoue('PC-10', `exception : ${String(e && e.stack || e).split('\n').slice(0, 2).join(' | ').slice(0, 300)}`) }
    const supp = sonder({ cwd: racine, module: path.join(racine, LIB), loader: path.join(racine, LOADER), cas: casSupplementaires().map(({ id, entree }) => ({ id, entree })), dossier: W, nom: 'supplementaires' })
    for (const [id, f] of [['PC-11', () => jugerPC11(s, { page, sonde, supp })], ['PC-12', () => jugerPC12(s, { supp, reGen })]]) {
      try { f() } catch (e) { s.echoue(id, `exception : ${String(e && e.stack || e).split('\n').slice(0, 2).join(' | ').slice(0, 300)}`) }
    }
    jugerPC5(s, racine)
  } finally {
    fs.rmSync(W, { recursive: true, force: true })
  }
})
