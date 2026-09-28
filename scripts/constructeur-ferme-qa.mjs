// scripts/constructeur-ferme-qa.mjs — le juge de la fiche 025-05 (« le constructeur de site sort de Ma page »), écrit par Claude
// Code (fiche 025-01, point 7). Statique : il lit les fichiers de la racine, les analyse avec le compilateur TypeScript du dépôt
// (node_modules/typescript, arbre syntaxique, jamais d'expressions régulières sur du JSX quand une structure est en jeu), et lance
// npm run typecheck. Il n'écrit que dans .orchestre/travail/constructeur-ferme-qa/. Aucun secret lu, aucun réseau.
//
// Usage : node scripts/constructeur-ferme-qa.mjs [--racine=<dossier>] [--temoin] [--critere=CF-8[,…]]
//   --racine=<dossier>  (défaut : la racine du dépôt) tout est lu dans ce dossier, et le typecheck y tourne.
//   --temoin            construit l'arbre témoin (voir plus bas) et y juge CF-1 à CF-10 : code 0 attendu. Ne se combine pas avec
//                       --racine ; pas de --reel (rien à tester en production).
//   --critere=CF-8[,…]  ne juge que ces critères (les autres ne sont ni déclarés ni imprimés) : l'essai de l'usine (fiche
//                       000-usine-cf8) ne juge que CF-8, le typecheck, sur un worktree de l'usine.
// Sortie : une ligne « PASS|FAIL CF-n — … » par critère, puis « constructeur-ferme-qa : PASS » ou « … : FAIL — ids » ; code 0
// seulement si les dix critères (ou ceux de --critere) sont verts (socle : scripts/fixtures/025/commun.mjs, creerSortie).
//
// La base des diffs (CF-2, CF-4, CF-8 ; CF-3 depuis le 27/09 : toujours 1620723, voir CF-3) : sur la racine d'un dépôt Git, HEAD (git diff, lecture seule, GIT_OPTIONAL_LOCKS=0),
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
//         Admis en plus (25/09, revue avant mise en ligne, D30, commit 9dca36e) : le test landingVideo remplacé à l'identique par
//         les trois lignes qui ne regardent que la vidéo de la démo (D30_RETRAIT, D30_AJOUTS) ; entière, elle est ôtée du diff
//         et de git diff --numstat (4 ajouts, 1 retrait) ; partielle ou retouchée, elle compte comme toute autre ligne.
//         Admis en plus (27/09, reprise de 026-023 : AP-9 de 026-025 impose la ligne siteAchatPublic, que CF-3 refusait) : les
//         lignes de CARTE que les fiches 026 déclarent, LISTE FERMÉE (CARTE_026, plus bas : un drapeau qui n'y est pas compte
//         comme toute autre ligne ajoutée). Chacune est lue comme un tableau de chaînes entre apostrophes droites, rien d'autre
//         (aucun code ne passe) ; « exacte » : le tableau que la fiche écrit ; « debut » (ligne que plusieurs fiches complètent) :
//         ce début, puis seulement des fichiers de route app/…/route.ts(x) sous les dossiers déclarés, sans doublon, présents
//         dans la racine et qui lisent eux-mêmes actif('<drapeau>') (la règle de fermeture-e2e.mjs) ; toujours : dans CARTE, une
//         seule fois, et le drapeau existe dans FLAGS (lib/flags.ts de la racine). Conforme, elle est ôtée du diff et comptée
//         dans git diff --numstat ; non conforme, elle est nommée et CF-3 échoue.
//         Base de CF-3 (même reprise) : sur la racine d'un dépôt, toujours 1620723, jamais HEAD : la ligne constructeurSite est
//         commitée depuis 71fcca8, et contre HEAD une fiche 026 qui ajoute sa ligne la faisait disparaître du diff.
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
//   CF-9  (relecture à froid du 24/09, M5 ; fiche 025-16) app/profil/page.tsx ne montre le prix du site que si la vente est
//         ouverte : chaque usage de SITE_A_LA_DEMANDE (titre, phrases, bouton, lien : le bloc entier), de PRIX_SITE_TEXTE ou de
//         PRIX_SITE_CENTS, et tout texte qui écrit la valeur de PRIX_SITE_TEXTE (lue dans lib/siteCommande.ts de la racine), est
//         sous actif('siteCommandeVente') (branche vraie, non niée ; à travers une constante JSX ou un petit composant, trois
//         niveaux : conditionsDe) — comme la landing (app/page.tsx) et lib/siteCommande.ts:13-15. Mutation à chaque passage :
//         SITE_A_LA_DEMANDE.titre ajouté hors garde doit être vu, le même sous la garde laissé.
//   CF-10 (M6) app/parametres/page.tsx ne renvoie vers aucun bloc absent de /profil : chaque lien interne écrit en littéral
//         (href: '…', href="…") mène à une page de app/ (app/**/page.tsx, groupes (x) ôtés, [param] joker) ; une ancre de
//         /profil (#x) existe comme id="x" dans app/profil/page.tsx ; une entrée qui renvoie vers /profil ne parle ni
//         d'apparence, de thème, de style, de réalisations, de publication, de contenu, ni de niveau (les blocs retirés par
//         025-05). Mêmes liens et ancres vérifiés dans lib/aide.ts (chaînes « /x#y » comprises, comme reglagesLies), et aucune
//         chaîne de lib/aide.ts ne parle du « niveau de site ». Mutation : une entrée « Apparence » vers /profil#sonde-absente
//         (deux défauts) et « niveau de site » ajouté à l'aide doivent être vus.
//   CF-11 (revue avant mise en ligne du 25/09, D34, fiche 025-20) tant que actif('constructeurSite') est faux (lib/flags.ts de la
//         racine, chargé), plus rien ne propose ni n'exécute « Réinitialiser le site » (aucune route ne peut réécrire les textes
//         effacés) : app/parametres/SectionDonnees.tsx rendue par React côté serveur (react-dom/server du dépôt, site publié) ne
//         montre ni « Réinitialiser le site » ni REINITIALISER, et montre toujours « Supprimer le site » ; app/api/donnees/route.ts
//         transpilée et appelée (session et base simulées) refuse site_reinitialiser en GET et en POST (4xx, et aucune écriture
//         dans artisans), et répond toujours 200 au récapitulatif de site_supprimer. Mutation : la page d'aujourd'hui est vue.
//
// L'arbre témoin (--temoin) : .orchestre/travail/constructeur-ferme-qa/temoin/ = la référence 1620723 (extraireReference,
// .orchestre/travail/025-01/reference/, réutilisée si intacte) réduite à ce que le typecheck et les diffs lisent (app, lib,
// middleware.ts, tsconfig.json, package.json et les deux scripts), puis chaque fichier <chemin>.temoin de
// scripts/fixtures/025/temoins/constructeur-ferme-qa/ copié sur <chemin> : les six fichiers de 025-05 tels que la fiche les
// veut (flags, route, page, aide, fermeture-e2e, site-sorti), plus l'état « après » de 025-16 (relectures à froid du 24/09 :
// bloc de vente de /profil sous actif('siteCommandeVente'), aide sans « niveau de site », et app/parametres/page.tsx sans les
// entrées vers les blocs retirés). Suffixe .temoin : ni tsc (include **/*.ts du tsconfig), ni next
// build, ni un lint ne les prennent pour du code du dépôt. La marque temoin.json (commit 1620723) donne la base des diffs. Chaque
// fichier témoin doit remplacer un fichier existant de la référence et en différer.

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'
import * as requireModule from 'node:module'
import ts from 'typescript'
import {
  R, FIXTURES, TRAVAIL, REFERENCE_COMMIT, sous, exigerSousTravail, dossierTravail, lireOuNull, fichierNonVide, sha256, lancer,
  git, estRacineGit, blobGit, listerFichiers, commitDeReference, extraireReference, preparerTemoin, lireOptionsOuQuitter, creerSortie,
  defautsTypecheck, replier,
} from './fixtures/025/commun.mjs'

const JUGE = 'constructeur-ferme-qa'
const IDS = ['CF-1', 'CF-2', 'CF-3', 'CF-4', 'CF-5', 'CF-6', 'CF-7', 'CF-8', 'CF-9', 'CF-10', 'CF-11']
const F = {
  flags: 'lib/flags.ts', route: 'app/api/site/generate/route.ts', profil: 'app/profil/page.tsx', aide: 'lib/aide.ts',
  fermeture: 'scripts/fermeture-e2e.mjs', sorti: 'scripts/site-sorti-des-formules-verifier.mjs',
  parametres: 'app/parametres/page.tsx', // CF-10 (relecture à froid du 24/09)
  donnees: 'app/parametres/SectionDonnees.tsx', routeDonnees: 'app/api/donnees/route.ts', // CF-11 (revue du 25/09, D34)
}
const TEMOIN_FIXTURES = path.join(FIXTURES, 'temoins', JUGE)
const TEMOIN_DOSSIER = path.join(TRAVAIL, JUGE, 'temoin')
// Next 16 (fiche 026-004) : `middleware.ts` devient `proxy.ts` — on copie celui des deux qui existe sur R (jamais les deux).
const FICHIER_PROXY = fs.existsSync(path.join(R, 'proxy.ts')) ? 'proxy.ts' : 'middleware.ts'
const TEMOIN_COPIER = ['app', 'lib', FICHIER_PROXY, 'tsconfig.json', 'package.json', F.fermeture, F.sorti]
const LIGNE_CARTE = "'constructeurSite': ['route', '/api/site/generate', 'POST', 'app/api/site/generate/route.ts']"
// CF-3 : la correction D30 de la revue avant mise en ligne (25/09, commit 9dca36e), lignes exactes, espaces de tête ôtés.
const D30_RETRAIT = ["T(`landingVideo=${FLAGS.landingVideo} ↔ vidéo ${/<video/.test(landing) ? 'présente' : 'absente'} sur la landing`, FLAGS.landingVideo === /<video/.test(landing))"]
const D30_AJOUTS = [
  '// La vidéo que landingVideo commande est celle de la démo (app/DemoVideo.tsx, /demo/hero.mp4) ; le bloc DemoSite a la sienne.',
  'const videoDemo = /<video[^>]*\\/demo\\/hero\\.mp4/.test(landing)',
  "T(`landingVideo=${FLAGS.landingVideo} ↔ vidéo de la démo ${videoDemo ? 'présente' : 'absente'} sur la landing`, FLAGS.landingVideo === videoDemo)",
]
// CF-3 : les lignes de CARTE déclarées par les fiches 026 (reprise de 026-023 du 27/09) — liste FERMÉE, source : le texte de
// chaque fiche dans .orchestre/brouillons-ecosysteme/026/. « exacte » : le tableau écrit par la fiche ; « debut » : la ligne
// que plusieurs fiches complètent de leurs fichiers de route, sous « dossiers » (et « requis » doit y être).
const CARTE_026 = [
  { drapeau: 'siteAchatPublic', fiches: '026-025', exacte: ['route', '/api/site/commander/public', 'POST', 'app/api/site/commander/public/route.ts', 'app/api/site/commander/public/renvoyer/route.ts'] },
  { drapeau: 'pilotage', fiches: '026-068, complétée par 026-074, 026-092, 026-177', debut: ['route', '/api/controle/pilotage', 'GET', 'app/api/controle/pilotage/route.ts'], dossiers: ['app/api/controle/pilotage/', 'app/api/controle/station/', 'app/api/agents/reunion/'] },
  { drapeau: 'busAgents', fiches: '026-042, complétée par 026-049, 026-195', debut: ['route', '/api/agents/etat', 'GET'], dossiers: ['app/api/agents/'], requis: ['app/api/agents/etat/route.ts'] },
  { drapeau: 'essaiFormulaire', fiches: '026-143', exacte: ['route', '/essai-formulaire/envoi', 'POST', 'app/essai-formulaire/envoi/route.ts', 'app/essai-formulaire/page.tsx'] },
  { drapeau: 'prospectsEntrant', fiches: '026-145', exacte: ['route', '/api/prospects/entrant', 'POST', 'app/api/prospects/entrant/route.ts'] },
  { drapeau: 'ecommerce', fiches: '026-176', exacte: ['note', 'branche réservée : rien n’est construit, attend les trois vidéos sources de Benj'] },
  { drapeau: 'stationCarte', fiches: '026-179', exacte: ['lu'] },
  { drapeau: 'aimantSite', fiches: '026-122', exacte: ['lu'] },
]
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
/**
 * Une ligne de CARTE lue strictement : 'cle': ['chaîne', …] (virgule finale admise), des chaînes entre apostrophes droites sans
 * barre oblique inverse ni retour à la ligne, et rien d'autre (ni gabarit, ni variable, ni appel). → { cle, valeurs } ou null.
 */
export function lireLigneCarte(texte) {
  const CH = "'[^'\\\\\\n]*'"
  const m = new RegExp(`^'([A-Za-z_]\\w*)'\\s*:\\s*\\[\\s*(${CH}(?:\\s*,\\s*${CH})*)\\s*\\]\\s*,?$`).exec(String(texte).trim())
  if (!m) return null
  return { cle: m[1], valeurs: [...m[2].matchAll(/'([^'\\\n]*)'/g)].map((x) => x[1]) }
}
/** Les noms de l'objet FLAGS de lib/flags.ts (arbre syntaxique) ; null si l'objet est introuvable. */
function drapeauxDeFlags(src) {
  if (!src) return null
  let objet = null
  parcourir(analyser(src, F.flags), (n) => { if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.name.text === 'FLAGS' && n.initializer) { const i = sansParentheses(n.initializer); if (ts.isObjectLiteralExpression(i)) objet = i } })
  return objet ? new Set(objet.properties.map(nomPropriete).filter(Boolean)) : null
}
/** Les défauts d'une ligne de CARTE déclarée par une fiche 026 (règle de CARTE_026) ; [] = conforme. */
export function defautsLigne026(regle, valeurs, racine) {
  const d = []
  if (regle.exacte) {
    if (JSON.stringify(valeurs) !== JSON.stringify(regle.exacte)) d.push(`[${valeurs.map((v) => `'${court(v, 40)}'`).join(', ')}] ≠ [${regle.exacte.map((v) => `'${court(v, 40)}'`).join(', ')}], la ligne écrite par la fiche`)
    return d
  }
  const debut = valeurs.slice(0, regle.debut.length), fichiers = valeurs.slice(regle.debut.length)
  if (JSON.stringify(debut) !== JSON.stringify(regle.debut)) d.push(`début [${debut.map((v) => `'${court(v, 40)}'`).join(', ')}], [${regle.debut.map((v) => `'${v}'`).join(', ')}] attendu`)
  const tous = [...regle.debut.filter((v) => /\/route\.tsx?$/.test(v)), ...fichiers]
  if (!tous.length) d.push('aucun fichier de route')
  for (const r of regle.requis ?? []) if (!tous.includes(r)) d.push(`${r} manque`)
  const vus = new Set()
  for (const fi of fichiers) {
    if (vus.has(fi)) { d.push(`${fi} en double`); continue }
    vus.add(fi)
    if (!/^app\/(?:[\w.()[\]-]+\/)+route\.tsx?$/.test(fi) || fi.split('/').includes('..')) { d.push(`« ${court(fi, 60)} » n'est pas un fichier de route app/…/route.ts`); continue }
    if (!regle.dossiers.some((x) => fi.startsWith(x))) { d.push(`${fi} hors de ${regle.dossiers.join(', ')}`); continue }
  }
  for (const fi of tous) {
    if (!/^app\/(?:[\w.()[\]-]+\/)+route\.tsx?$/.test(fi) || fi.split('/').includes('..')) continue
    const s = lireTexte(path.join(racine, fi))
    if (s === null) d.push(`${fi} introuvable dans la racine`)
    else if (!new RegExp(`actif\\(['"\`]${regle.drapeau}['"\`]\\)`).test(s)) d.push(`${fi} ne lit pas lui-même actif('${regle.drapeau}')`)
  }
  return d
}
/** La base de CF-3 : 1620723 sur la racine d'un dépôt (jamais HEAD, voir l'en-tête), la marque sur un arbre extrait. */
function baseCf3(racine) {
  if (estRacineGit(racine)) { const b = blobGit(racine, REFERENCE_COMMIT, F.fermeture); return { texte: b ? b.toString('utf8') : null, nom: REFERENCE_COMMIT, rev: REFERENCE_COMMIT, git: true } }
  return baseDe(racine, F.fermeture, null)
}
function cf3(racine) {
  const f = path.join(racine, F.fermeture), src = lireTexte(f)
  if (!src || !src.trim()) return ko(`${F.fermeture} absent ou vide`)
  const echecs = []
  const syntaxe = nodeCheck(f)
  if (syntaxe) echecs.push(syntaxe)
  const base = baseCf3(racine)
  if (base.texte === null) return ko(`${F.fermeture} absent de la base ${base.nom}`)
  const b = lignesDe(src)
  const brut = diffLignes(lignesDe(base.texte), b)
  // La correction D30 (commit 9dca36e, revue avant mise en ligne du 25/09) est admise, et elle seule : le test landingVideo
  // remplacé, à l'identique, par les trois lignes qui ne regardent que la vidéo de la démo. Retirée du diff si elle y est
  // entière ; partielle ou retouchée, elle reste dans le diff et le fait échouer.
  const d30 = D30_RETRAIT.every((l) => brut.retraits.some((x) => x.texte.trim() === l)) && D30_AJOUTS.every((l) => brut.ajouts.some((x) => x.texte.trim() === l))
  const sansD30 = d30 ? { retraits: brut.retraits.filter((x) => !D30_RETRAIT.includes(x.texte.trim())), ajouts: brut.ajouts.filter((x) => !D30_AJOUTS.includes(x.texte.trim())) } : brut
  const carte = blocCarte(b)
  if (!carte) echecs.push('objet CARTE introuvable')
  // Les lignes des fiches 026 (CARTE_026, liste fermée) : conformes, elles sont ôtées du diff ; sinon elles y restent, nommées.
  const drapeaux = drapeauxDeFlags(lireTexte(path.join(racine, F.flags)))
  const acceptees = []
  for (const x of sansD30.ajouts) {
    const lue = lireLigneCarte(x.texte)
    const regle = lue && CARTE_026.find((r) => r.drapeau === lue.cle)
    if (!regle) continue
    const defauts = defautsLigne026(regle, lue.valeurs, racine)
    if (!carte || !(x.i > carte.debut && x.i < carte.fin)) defauts.push(`hors de CARTE${carte ? ` (lignes ${carte.debut + 1}-${carte.fin + 1})` : ''}`)
    if (!drapeaux) defauts.push(`${F.flags} : objet FLAGS introuvable`)
    else if (!drapeaux.has(regle.drapeau)) defauts.push(`${regle.drapeau} n'est pas dans FLAGS de ${F.flags}`)
    if (carte) { const n = b.slice(carte.debut, carte.fin + 1).filter((l) => new RegExp(`^\\s*['"\`]?${regle.drapeau}['"\`]?\\s*:`).test(l)).length; if (n !== 1) defauts.push(`${n} clé(s) ${regle.drapeau} dans CARTE, une attendue`) }
    if (defauts.length) echecs.push(`ligne ${x.i + 1} « ${regle.drapeau} » (fiche ${regle.fiches}, liste fermée des fiches 026) refusée : ${defauts.slice(0, 4).join(' ; ')}${defauts.length > 4 ? ` ; … (${defauts.length} défauts)` : ''}`)
    else acceptees.push(x)
  }
  const d = { retraits: sansD30.retraits, ajouts: sansD30.ajouts.filter((x) => !acceptees.includes(x)) }
  const bonne = (t) => [LIGNE_CARTE, `${LIGNE_CARTE},`].includes(t.trim())
  const otees = [d30 ? 'correction D30' : '', acceptees.length ? `${acceptees.length} ligne(s) des fiches 026` : ''].filter(Boolean).join(' et ')
  if (d.retraits.length || d.ajouts.length !== 1) echecs.push(`diff contre ${base.nom}${otees ? ` (${otees} ôtée(s))` : ''} : ${d.ajouts.length} ligne(s) ajoutée(s), ${d.retraits.length} retirée(s) — exactement une ligne ajoutée attendue${d.ajouts.length + d.retraits.length ? ` (${resumeDiff(d)})` : ''}`)
  const ajout = d.ajouts.find((x) => bonne(x.texte))
  if (!ajout) echecs.push(`la ligne ${LIGNE_CARTE}, n'est pas ajoutée à l'identique`)
  if (carte) {
    if (ajout && !(ajout.i > carte.debut && ajout.i < carte.fin)) echecs.push(`la ligne ajoutée (${ajout.i + 1}) est hors de CARTE (lignes ${carte.debut + 1}-${carte.fin + 1})`)
    const cles = b.slice(carte.debut, carte.fin + 1).filter((l) => /['"`]?constructeurSite['"`]?\s*:/.test(l)).length
    if (cles !== 1) echecs.push(`${cles} clé(s) constructeurSite dans CARTE, une attendue`)
  }
  let git = ''
  if (base.git) {
    const ns = numstat(racine, base.rev, F.fermeture)
    const [aj, re] = [1 + (d30 ? D30_AJOUTS.length : 0) + acceptees.length, d30 ? D30_RETRAIT.length : 0]
    if (ns.erreur || ns.ajouts !== aj || ns.retraits !== re) echecs.push(`git diff --numstat ${base.rev} : ${ns.erreur || `${ns.ajouts} ajout(s), ${ns.retraits} retrait(s)`} ; ${aj} et ${re} attendus${otees ? ` (${otees} comprise(s))` : ''}`)
    else git = ` ; git diff --numstat ${base.rev.slice(0, 7)} : ${aj} ajout(s), ${re} retrait(s)${otees ? ` (${otees} comprise(s))` : ''}`
  }
  const lignes026 = acceptees.map((x) => `${lireLigneCarte(x.texte).cle} (ligne ${x.i + 1})`).join(', ')
  return { ok: !echecs.length, echecs, resume: `diff contre ${base.nom.slice(0, 7)} : une ligne ajoutée (${ajout ? ajout.i + 1 : '?'}), dans CARTE, à l'identique${d30 ? ', plus la correction D30 (9dca36e) à l’identique' : ''}${acceptees.length ? `, plus les lignes des fiches 026 conformes à la liste fermée : ${lignes026}` : ''} ; node --check vert${git}` }
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

// ── CF-9 : le prix du site n'est montré que si la vente est ouverte (relecture à froid du 24/09, M5) ────────────────────────
const NOMS_VENTE = ['SITE_A_LA_DEMANDE', 'PRIX_SITE_TEXTE', 'PRIX_SITE_CENTS']
function prixDuSite(racine) {
  const t = lireTexte(path.join(racine, 'lib', 'siteCommande.ts')) || ''
  const m = /export\s+const\s+PRIX_SITE_TEXTE\s*=\s*(['"`])([^'"`]+)\1/.exec(t)
  return m ? apostrophes(m[2]).replace(/\s+/g, ' ') : null
}
/** Les usages du bloc de vente et du prix dans une page, hors de actif('siteCommandeVente') → { echecs, vus } */
function horsVente(sf, prix) {
  const echecs = [], vus = []
  const sousVente = (n) => gardePositive(conditionsDe(n), (x) => estActif(x, 'siteCommandeVente'))
  parcourir(sf, (n) => {
    if (ts.isIdentifier(n) && NOMS_VENTE.includes(n.text) && !ts.isImportSpecifier(n.parent) && !(ts.isPropertyAccessExpression(n.parent) && n.parent.name === n)) {
      const quoi = ts.isPropertyAccessExpression(n.parent) && n.parent.expression === n ? `${n.text}.${n.parent.name.text}` : n.text
      vus.push(quoi)
      if (!sousVente(n)) echecs.push(`${quoi} (ligne ${ligneNoeud(sf, n)}) montré hors de actif('siteCommandeVente')`)
    }
    if (prix && (ts.isJsxText(n) || ts.isStringLiteralLike(n)) && apostrophes(n.text).replace(/\s+/g, ' ').includes(prix) && !sousVente(n)) echecs.push(`« ${court(n.text, 60)} » (ligne ${ligneNoeud(sf, n)}) écrit le prix du site (${prix}) hors de actif('siteCommandeVente')`)
  })
  return { echecs, vus }
}
function cf9(racine) {
  const src = lireTexte(path.join(racine, F.profil))
  if (!src || !src.trim()) return ko(`${F.profil} absent ou vide`)
  const prix = prixDuSite(racine)
  if (!prix) return ko('PRIX_SITE_TEXTE introuvable dans lib/siteCommande.ts : le prix du site ne peut pas être cherché')
  const r = horsVente(analyser(src, F.profil), prix)
  const echecs = [...r.echecs]
  if (!r.vus.length) echecs.push(`${F.profil} ne montre plus SITE_A_LA_DEMANDE (CF-5 l'exige, sous actif('siteCommandeVente'))`)
  // le détecteur : un titre ajouté hors garde doit être vu, le même sous la garde laissé
  const hors = horsVente(analyser(`${src}\nexport function SondeCF9() { return <p>{SITE_A_LA_DEMANDE.titre}</p> }\n`, F.profil), prix)
  const sous = horsVente(analyser(`${src}\nexport function SondeCF9() { return actif('siteCommandeVente') ? <p>{SITE_A_LA_DEMANDE.titre}</p> : null }\n`, F.profil), prix)
  if (hors.echecs.length !== r.echecs.length + 1) echecs.push(`détecteur : SITE_A_LA_DEMANDE.titre ajouté hors de actif('siteCommandeVente') non vu (${hors.echecs.length - r.echecs.length} écart)`)
  if (sous.echecs.length !== r.echecs.length) echecs.push('détecteur : SITE_A_LA_DEMANDE.titre ajouté SOUS actif(\'siteCommandeVente\') compté comme fautif')
  if (echecs.length) return ko(...echecs)
  return { ok: true, echecs: [], resume: `${r.vus.length} usage(s) du bloc de vente dans ${F.profil} (${[...new Set(r.vus)].join(', ')}), tous sous actif('siteCommandeVente'), et le prix ${prix} écrit nulle part ailleurs ; mutation : SITE_A_LA_DEMANDE.titre ajouté hors garde → vu, sous garde → laissé` }
}

// ── CF-10 : /parametres ne renvoie vers aucun bloc absent de /profil ; l'aide ne parle plus du niveau de site (M6) ───────────
const RETIRES_PROFIL = [['apparence', /apparence/], ['thème', /\bthemes?\b/], ['style', /\bstyles?\b/], ['réalisations', /realisation/], ['publication', /publication/], ['contenu du site', /\bcontenu\b/], ['niveau', /\bniveaux?\b/]]
const NIVEAU_DE_SITE = /\bniveaux?\s+(?:de|du)\s+(?:votre\s+|ton\s+)?site\b/
function routesDe(racine) {
  const out = []
  for (const r of listerFichiers(path.join(racine, 'app'))) {
    if (!/(^|\/)page\.(tsx|ts|jsx|js|mdx)$/.test(r)) continue
    const segs = r.split('/').slice(0, -1).filter((s) => !/^\(.*\)$/.test(s) && !s.startsWith('@'))
    const motif = segs.map((s) => (/^\[\[?\.\.\./.test(s) ? '.*' : /^\[.*\]$/.test(s) ? '[^/]+' : s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('/')
    out.push({ fichier: `app/${r}`, re: new RegExp(`^/${motif}/?$`) })
  }
  return out
}
function idsDe(sf) {
  const ids = new Set()
  parcourir(sf, (n) => {
    if (!ts.isJsxAttribute(n) || n.name.getText() !== 'id' || !n.initializer) return
    const i = n.initializer
    const v = ts.isStringLiteral(i) ? i.text : ts.isJsxExpression(i) && i.expression && ts.isStringLiteralLike(i.expression) ? i.expression.text : null
    if (v) ids.add(v)
  })
  return ids
}
/** Les liens internes écrits en littéral dans un fichier (href: '…', href="…", chaînes '/x#y') → [{ lien, ligne, entree (objet { label, detail } s'il y en a un) }] */
function liensDe(sf) {
  const out = []
  const texteDe = (o, k) => { const p = o && o.properties.find((x) => ts.isPropertyAssignment(x) && nomPropriete(x) === k); const t = []; if (p) parcourir(p.initializer, (x) => { if (ts.isStringLiteralLike(x)) t.push(x.text) }); return t.join(' ') }
  parcourir(sf, (n) => {
    const init = ts.isPropertyAssignment(n) && nomPropriete(n) === 'href' ? n.initializer : ts.isJsxAttribute(n) && n.name.getText() === 'href' ? n.initializer : null
    if (init) parcourir(init, (x) => {
      if (!ts.isStringLiteralLike(x) || !x.text.startsWith('/') || x.text.startsWith('//')) return
      const o = ts.isPropertyAssignment(n) && ts.isObjectLiteralExpression(n.parent) ? n.parent : null
      out.push({ lien: x.text, ligne: ligneNoeud(sf, x), entree: o ? { label: texteDe(o, 'label'), detail: texteDe(o, 'detail') } : null })
    })
    if (ts.isStringLiteralLike(n) && /^\/[\w\-/]*#[\w-]+$/.test(n.text) && !(n.parent && (ts.isPropertyAssignment(n.parent) || ts.isJsxAttribute(n.parent)))) out.push({ lien: n.text, ligne: ligneNoeud(sf, n), entree: null })
  })
  return out
}
function defautsLiens(nom, sf, { routes, idsProfil }) {
  const echecs = [], vus = []
  for (const l of liensDe(sf)) {
    const [chemin, ancre] = l.lien.split('#')
    const p = chemin.split('?')[0] || '/'
    const route = routes.find((r) => r.re.test(p))
    vus.push(l.lien)
    if (!route) { echecs.push(`${nom}:${l.ligne} : ${l.lien} ne mène à aucune page de app/`); continue }
    if (ancre && p.replace(/\/$/, '') === '/profil' && !idsProfil.has(ancre)) echecs.push(`${nom}:${l.ligne} : ${l.lien} — aucun bloc id="${ancre}" dans ${F.profil}`)
    if (p.replace(/\/$/, '') === '/profil' && l.entree) {
      const mots = RETIRES_PROFIL.filter(([, re]) => re.test(sansAccents(`${l.entree.label} ${l.entree.detail}`))).map(([m]) => m)
      if (mots.length) echecs.push(`${nom}:${l.ligne} : l'entrée « ${l.entree.label} » (« ${court(l.entree.detail, 50)} ») renvoie vers /profil pour ${mots.join(', ')}, blocs retirés de /profil (025-05)`)
    }
  }
  return { echecs, vus }
}
function cf10(racine) {
  const srcProfil = lireTexte(path.join(racine, F.profil)), srcParam = lireTexte(path.join(racine, F.parametres)), srcAide = lireTexte(path.join(racine, F.aide))
  for (const [f, t] of [[F.profil, srcProfil], [F.parametres, srcParam], [F.aide, srcAide]]) if (!t || !t.trim()) return ko(`${f} absent ou vide`)
  const ctx = { routes: routesDe(racine), idsProfil: idsDe(analyser(srcProfil, F.profil)) }
  if (!ctx.routes.length) return ko('aucune page trouvée sous app/ : lecture des routes impossible')
  const echecs = []
  const p = defautsLiens(F.parametres, analyser(srcParam, F.parametres), ctx)
  const a = defautsLiens(F.aide, analyser(srcAide, F.aide), ctx)
  echecs.push(...p.echecs, ...a.echecs)
  const niveau = (src) => { const sf = analyser(src, F.aide); const t = []; parcourir(sf, (n) => { if (ts.isStringLiteralLike(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n)) { const m = NIVEAU_DE_SITE.exec(sansAccents(n.text)); if (m) t.push(`${F.aide}:${ligneNoeud(sf, n)} : « ${court(n.text, 90)} » parle encore du niveau de site`) } }); return t }
  echecs.push(...niveau(srcAide))
  // le détecteur : une entrée qui renvoie vers un bloc retiré, et le niveau de site dans l'aide, doivent être vus
  const sp = defautsLiens(F.parametres, analyser(`${srcParam}\nexport const SONDE_CF10 = { id: 'sonde', label: 'Apparence', detail: 'Thème du site', href: '/profil#sonde-absente' }\n`, F.parametres), ctx)
  if (sp.echecs.length < p.echecs.length + 2) echecs.push(`détecteur : l'entrée sonde « Apparence » vers /profil#sonde-absente non vue (${sp.echecs.length - p.echecs.length} défaut(s) sur 2)`)
  if (niveau(`${srcAide}\nexport const SONDE_CF10 = 'modèles, inventaire, niveau de site'\n`).length !== niveau(srcAide).length + 1) echecs.push('détecteur : « niveau de site » ajouté à l\'aide non vu')
  if (echecs.length) return ko(...echecs)
  return { ok: true, echecs: [], resume: `${p.vus.length} lien(s) de ${F.parametres} et ${a.vus.length} de ${F.aide} vers des pages de app/ (${ctx.routes.length} pages), ancres de /profil présentes (${[...ctx.idsProfil].join(', ') || 'aucune'}), aucune entrée vers un bloc retiré ; ${F.aide} ne parle plus du niveau de site ; mutation : entrée « Apparence » vers /profil#sonde-absente → 2 défauts vus, « niveau de site » → vu` }
}

// ── CF-11 : plus de « Réinitialiser le site » tant que le constructeur est fermé (revue du 25/09, D34) ────────────────────
/** Transpile et charge <fichier> de <racine> ; stubs par spécificateur ; jsx 'react' = le vrai React du dépôt ; @/lib et ./ lus sous <racine>. */
function chargerCf11(racine, fichier, stubs = {}) {
  const { createRequire } = requireModule
  const requireDepot = createRequire(import.meta.url)
  const caches = new Map()
  const muet = () => new Proxy(function () {}, { get: (_, k) => (k === 'then' ? undefined : muet()), apply: () => muet() })
  const charger = (f) => {
    if (caches.has(f)) return caches.get(f).exports
    const js = ts.transpileModule(fs.readFileSync(f, 'utf8'), { fileName: f, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText
    const module = { exports: {} }
    caches.set(f, module)
    const req = (spec) => {
      if (Object.prototype.hasOwnProperty.call(stubs, spec)) return stubs[spec]
      if (spec === 'react' || spec === 'react/jsx-runtime' || spec === 'react-dom/server') return requireDepot(spec)
      const base = spec.startsWith('@/') ? path.join(racine, spec.slice(2)) : spec.startsWith('.') ? path.resolve(path.dirname(f), spec) : null
      if (base) for (const e of ['', '.ts', '.tsx', '/index.ts']) if (fs.existsSync(base + e) && fs.statSync(base + e).isFile()) return charger(base + e)
      return muet()
    }
    new Function('exports', 'require', 'module', '__filename', '__dirname', 'process', js)(module.exports, req, module, f, path.dirname(f), { env: {} })
    return module.exports
  }
  return charger(path.join(racine, fichier))
}
export const defautsReinit = (html) => (/R[ée]initialiser le site|REINITIALISER/.test(html) ? ['« Réinitialiser le site » est proposé'] : [])
async function cf11(racine) {
  let flags
  try { flags = chargerCf11(racine, F.flags) } catch (e) { return ko(`${F.flags} non chargé : ${premiereLigne(e)}`) }
  if (typeof flags.actif !== 'function') return ko(`${F.flags} n'exporte pas actif`)
  if (flags.actif('constructeurSite') !== false) return { ok: true, echecs: [], resume: 'constructeurSite ouvert : la réinitialisation reste permise (rien à juger)' }
  const echecs = []
  // la section Paramètres → Données & confidentialité, rendue
  const React = requireModule.createRequire(import.meta.url)('react'), { renderToStaticMarkup } = requireModule.createRequire(import.meta.url)('react-dom/server')
  let html = ''
  try {
    const mod = chargerCf11(racine, F.donnees, { '@/lib/supabaseClient': { supabase: {} }, '@/lib/natif': { estNatif: () => false, partagerFichier: async () => 'aucun' } })
    const a = { id: '00000000-0000-4000-8000-0000000020c1', nom: 'Essai', email: null, slug: 'essai-cf11', domaine: null, domaine_verifie: false, logo_url: null, plan: 'essentiel', is_founder: false, credits: 0, credits_reset_le: null, stripe_customer_id: null, stripe_subscription_id: null, notifications: null, suppression_demandee_le: null, site_active: true, plateforme_active: true }
    html = renderToStaticMarkup(React.createElement(mod.default, { a, patch: () => {}, signaler: () => {} }))
  } catch (e) { echecs.push(`${F.donnees} non rendue : ${premiereLigne(e)}`) }
  if (html) {
    for (const d of defautsReinit(html)) echecs.push(`${F.donnees} (site publié) : ${d}`)
    if (!/Supprimer le site/.test(html)) echecs.push(`${F.donnees} ne propose plus « Supprimer le site »`)
  }
  // la route
  const ecritures = []
  const base = { artisans: [{ id: '00000000-0000-4000-8000-0000000020c1', site_contenu: { apropos: 'Texte rédigé' }, site_layout: null, realisations: [], avant_apres: [], site_active: true, plateforme_active: true, theme: 'nuit' }] }
  class Req { constructor(t) { this.t = t; this.f = []; this.op = 'select'; this.v = null; this.u = null } select() { return this } update(v) { this.op = 'update'; this.v = v; return this } delete() { this.op = 'delete'; return this } eq(c, v) { this.f.push((r) => r[c] === v); return this } in() { return this } maybeSingle() { this.u = 1; return this } then(ok, ko2) { return Promise.resolve().then(() => { const l = (base[this.t] || []).filter((r) => this.f.every((g) => g(r))); if (this.op !== 'select') ecritures.push(`${this.op} ${this.t} ${JSON.stringify(this.v)}`); if (this.op === 'update') for (const r of l) Object.assign(r, this.v); return this.u ? { data: l[0] ?? null, error: null } : { data: l, error: null, count: l.length } }).then(ok, ko2) } }
  const sb = { from: (t) => new Req(t), storage: { from: () => ({ list: async () => ({ data: [] }), remove: async () => ({}) }) } }
  class Rep { constructor(c, i = {}) { this.status = i.status ?? 200; this.corps = c } static json(c, i = {}) { return new Rep(c, i) } }
  try {
    const route = chargerCf11(racine, F.routeDonnees, { 'next/server': { NextResponse: Rep }, '@/lib/supabaseAdmin': { supabaseAdmin: sb }, '@/lib/authArtisan': { authArtisan: async () => ({ uid: base.artisans[0].id }), estEchec: () => false }, '@/lib/media': { MEDIA_BUCKET: 'artisan-media' } })
    const get = async (action) => route.GET({ url: `https://prestiapp.fr/api/donnees?action=${action}`, headers: { get: () => 'Bearer essai' } })
    const g1 = await get('site_reinitialiser')
    if (!(g1?.status >= 400)) echecs.push(`GET ?action=site_reinitialiser → ${g1?.status} : le récapitulatif est encore proposé`)
    const p1 = await route.POST({ url: 'https://prestiapp.fr/api/donnees', headers: { get: () => 'Bearer essai' }, json: async () => ({ action: 'site_reinitialiser', confirm: 'SUPPRIMER' }) })
    if (!(p1?.status >= 400)) echecs.push(`POST site_reinitialiser → ${p1?.status} ${court(JSON.stringify(p1?.corps), 60)}`)
    const efface = ecritures.filter((e) => /site_contenu/.test(e))
    if (efface.length) echecs.push(`site_reinitialiser écrit encore dans artisans (${court(efface[0], 80)})`)
    const g2 = await get('site_supprimer')
    if (g2?.status !== 200) echecs.push(`GET ?action=site_supprimer → ${g2?.status} : le récapitulatif de la suppression du site a disparu`)
  } catch (e) { echecs.push(`${F.routeDonnees} non appelée : ${premiereLigne(e)}`) }
  if (!defautsReinit('<button>Réinitialiser le site</button>').length) echecs.push('détecteur aveugle')
  if (echecs.length) return ko(...echecs)
  return { ok: true, echecs: [], resume: `constructeurSite fermé : ${F.donnees} (site publié) sans « Réinitialiser le site », avec « Supprimer le site » ; ${F.routeDonnees} refuse site_reinitialiser en GET et POST sans rien écrire, récapitulatif de site_supprimer toujours servi ; mutation : « Réinitialiser le site » → vu` }
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
  const o = lireOptionsOuQuitter(process.argv.slice(2), { connues: ['critere'] })
  // --critere=CF-8[,…] : ne juge que ces critères (l'essai de l'usine, fiche 000-usine-cf8, ne juge que CF-8) ; les autres ne
  // sont ni déclarés ni imprimés, et le verdict ne vaut que pour eux.
  const ids = o.valeur('critere') === undefined ? IDS : o.liste('critere')
  if (o.drapeau('critere') || !ids.length || ids.some((x) => !IDS.includes(x))) { console.error(`✗ --critere attend des critères de ${IDS.join(', ')} (ex. --critere=CF-8)`); process.exit(2) }
  if (o.reel) { console.error(`✗ ${JUGE} n'a pas de mode --reel : tout est statique`); process.exit(2) }
  if (o.temoin && !o.racineParDefaut) { console.error(`✗ --temoin construit son arbre sur la référence ${REFERENCE_COMMIT} : ne pas le combiner avec --racine`); process.exit(2) }
  if (o.positionnels.length) { console.error(`✗ argument(s) inattendu(s) : ${o.positionnels.join(' ')}`); process.exit(2) }
  const racine = o.temoin ? TEMOIN_DOSSIER : o.racine
  const s = creerSortie(JUGE, ids, { racine, temoin: o.temoin })
  if (ids !== IDS) s.note(`--critere : seulement ${ids.join(', ')} (les autres critères ne sont pas jugés)`)
  await s.executer(async () => {
    if (o.temoin) {
      const t = construireTemoin()
      s.note(`témoin : référence ${t.commit.slice(0, 7)} (${t.reutilise ? 'arbre réutilisé' : 'arbre extrait'}) réduite à ${TEMOIN_COPIER.join(', ')}, puis ${t.poses.length} fichiers de ${rel(TEMOIN_FIXTURES)}/*.temoin : ${t.poses.join(', ')}`)
    }
    const b = baseDe(racine, F.fermeture, lireTexte(path.join(racine, F.fermeture)))
    s.note(`base des diffs : ${b.nom}${b.git ? ' (git diff, lecture seule)' : ` (blob de ${b.rev.slice(0, 7)})`}`)
    const juges = { 'CF-1': cf1, 'CF-2': cf2, 'CF-3': cf3, 'CF-4': cf4, 'CF-5': cf5, 'CF-6': cf6, 'CF-7': cf7, 'CF-8': cf8, 'CF-9': cf9, 'CF-10': cf10, 'CF-11': cf11 }
    for (const id of ids) {
      try { s.resultat(id, await juges[id](racine)) } catch (e) { s.echoue(id, `exception : ${premiereLigne(e)}`) }
    }
  })
}

export { cf1, cf2, cf3, cf4, cf5, cf6, cf7, cf8, cf9, cf10, cf11, construireTemoin, baseDe }

const pareil = (a, b) => (process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b)
if (process.argv[1] && pareil(path.resolve(process.argv[1]), fileURLToPath(import.meta.url))) await principal()
