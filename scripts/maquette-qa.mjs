// scripts/maquette-qa.mjs — le juge des fiches 025-02 (mode --maquette de public/sites-demo/generer.mjs, scripts/maquette-capturer.mjs,
// modèle maquettes/modeles/menuisier/) et 025-11 (modèles plombier, électricien, couvreur), écrit par Claude Code (fiche 025-01,
// point 4). Les exécutants n'y touchent pas (CLAUDE.md, règle 1).
//
// Usage : node scripts/maquette-qa.mjs [--metier=a,b] [--racine=<dossier>] [--temoin]
//   --metier=a,b   les métiers jugés (défaut : celui du jeu d'essai, menuisier). Chaque métier a son modèle dans
//                  <racine>/maquettes/modeles/<métier>/ ; le jeu d'essai scripts/fixtures/025/maquette-exemple.json est repris avec
//                  metier = modele = <métier> dans .orchestre/travail/maquette-qa/jeux/<métier>.json (même entreprise fictive, même ville).
//   --racine=<d>   tout est lu et lancé depuis <d> : generer.mjs, maquettes/modeles/, scripts/maquette-capturer.mjs, lib/ai.ts, les
//                  site.json et les photos des démos, public/ (MQ-2), et T1, T2, MQ-9. Défaut : la racine du dépôt.
//   --temoin       non-régression et jeu d'essai conforme (voir « Le témoin » plus bas) : doit passer sur l'état actuel du dépôt.
// Sortie : une ligne « PASS|FAIL <id> — … » par critère (MQ-1 à MQ-11, T1, T2), puis « maquette-qa : PASS » ou « maquette-qa : FAIL — ids ».
// Code 0 seulement si tout est vert ; 2 si le juge est mal appelé. Aucune ligne n'imprime le nom de l'entreprise fictive (MQ-9 le
// cherche dans le dépôt) : il est remplacé par ‹entreprise›, son slug par ‹slug›, le repère du fait sourcé par ‹repère›.
//
// Les critères (fiche 025-01, point 4 ; ce que le juge mesure exactement) :
//   MQ-1 node <racine>/public/sites-demo/generer.mjs --maquette=<jeu> --sortie=<dépôt>/.orchestre/travail/maquette-qa/<métier> (cwd
//        <racine>, dossier de sortie effacé avant) sort en code 0 ; le modèle <racine>/maquettes/modeles/<métier>/ existe et n'est pas
//        vide ; la sortie a un index.html non vide qui nomme l'entreprise et la ville du jeu d'essai, et aucune page ne garde une
//        marque {…} non remplacée.
//   MQ-2 même commande, --sortie sous <racine>/public : <racine>/public/sites-demo/essai (la fiche), la même en chemin relatif
//        (public/sites-demo/essai, cwd <racine>), et sous Windows <racine>/PUBLIC/sites-demo/essai (même dossier, autre casse) ; et,
//        025-02 §1, <racine>/essai-maquette-qa (dans le dépôt, hors de .orchestre/travail/) ; et <racine>/.orchestre/travail/../../
//        public/sites-demo/essai, écrit tel quel (une liste blanche par préfixe avant normalisation). Chaque essai : code ≠ 0, la cible n'existe
//        pas après, et l'instantané de <racine>/public/ (taille et date de chaque fichier) est inchangé. L'instantané est aussi pris
//        autour de chaque génération de MQ-1 : la maquette n'écrit jamais sous public/. Le refus ne prouve rien si le générateur ne
//        fait aucune maquette : MQ-2 exige MQ-1 vert pour le premier métier. Une cible déjà présente n'est pas essayée (FAIL) ; une
//        cible créée par un générateur fautif est effacée par le juge (elle n'existait pas avant l'essai).
//   MQ-3 chaque page .html de la sortie : au moins une <meta name="robots"> DANS L'EN-TÊTE INTERPRÉTÉ (avant <body>, hors
//        commentaires, script, style, template, noscript : une meta en commentaire n'est lue par aucun moteur), et chaque meta robots
//        ou googlebot porte noindex et nofollow, sans index, follow ni all ; son dernier <footer> (hors commentaires et scripts) dit
//        « Maquette privée préparée par Presti pour <entreprise>. » et « Rien n’est publié » ; une page qui a un <form> dit « Maquette :
//        rien n’est envoyé » (025-02 §6). Au rendu de l'accueil au bureau : les deux phrases du pied sont dans le texte visible
//        (innerText, casse ignorée), et document.head porte une meta robots, chacune en noindex, nofollow.
//   MQ-4 texte examiné : le texte de chaque page (corps entier, y compris ce qui est caché : <details> fermés, menus, texte pour
//        lecteurs d'écran ; plus <title> et la meta description) et le texte visible (innerText) de l'accueil à 1440×900 et à 390×844,
//        lignes de crédits « Photos d’illustration » ôtées ; plus le texte que les feuilles de styles écrivent (content: des .css de
//        la sortie et des <style>, chaînes et attr(…) ; et, au rendu, celui des ::before / ::after de chaque élément). Les autres
//        graphies sont repliées avant la recherche (commun.mjs, replier : NFKC, U+200B-D, U+2060, U+00AD, U+FEFF ôtés, lettres
//        cyrilliques et grecques de forme latine ramenées au latin : « R​GE », « 1⁠998 », « сertifié » sont vus). On y refuse :
//          - les motifs de findFabrications lus dans <racine>/lib/ai.ts (sinon ceux du dépôt), plus leur copie par le juge en Unicode
//            (\w ne voit pas « certifié ») : durée en années (chiffres ou lettres), %, prix, labels (RGE, Qualibat, Qualifelec, QualiPAC,
//            décennale, certifi…, labellis…, agréé…, garantie + chiffre), superlatifs ; « depuis|dès|en <année> », « m² » ou « m2 »,
//            un délai chiffré (h, heures, jours, semaines, mois, min), les avis (étoiles, « x/5 », « avis clients », témoignages) ;
//            une occurrence déjà présente dans le jeu d'essai (entreprise, ville, communes) est admise, comme dans findFabrications ;
//          - les formules de CLICHES (<racine>/public/sites-demo/generer.mjs, sinon celui du dépôt) ;
//          - tout ce qui est propre à une démo du dépôt (site.json de chaque dossier de <racine>/public/sites-demo/) : nom, téléphone,
//            SIREN, assureur et numéro de décennale, prénom et nom de l'artisan, son parcours, sa citation, la phrase de rappel du
//            devis, l'hôte de url_base ; ville et communes absentes du jeu d'essai, pour les démos du même métier et celles au format
//            v2 (Lestraque, d'où dérivent les modèles) seulement (« Lattes », commune d'une démo de serrurier, est un mot de
//            couvreur) ; et « fictif / fictive » (la maquette s'adresse à une entreprise réelle) ;
//          - un lien tel: d'au moins six chiffres (maquette.json n'a pas de téléphone : il serait inventé ou recopié) ;
//          - le fait sourcé du jeu d'essai (texte ou repère) dans le HTML de la sortie, commentaires et attributs compris ;
//          - un <blockquote> qui contient autre chose que la marque « À compléter avec vous », un <q> non vide ;
//        et on exige, à chaque taille d'écran, au moins cinq zones marquées « À compléter avec vous » (025-02 §3 : trois cases de
//        chiffres, la phrase signée, le parcours), chacune visible une fois amenée au centre de l'écran (boîte non nulle, visibility
//        visible, opacité cumulée ≥ 0,5, elementFromPoint au centre de sa première boîte de ligne sur elle ou un descendant — un
//        ancêtre touché est un calque posé dessus, comme le ::after d'une section —, marque dans son innerText), et aucun chiffre
//        dans le texte visible des sections (ou blocs) qui les portent, ::before et ::after compris.
//   MQ-5 images de la sortie = fichiers .avif .webp .jpg .jpeg .png .gif (hors capture-bureau.jpg et capture-telephone.jpg de MQ-8 ;
//        .svg et .ico, pictogrammes du kit, ne sont pas des photos) : au moins une ; chacune décrite, avec auteur et licence non vides,
//        dans un fichier d'attributions de la sortie (…attributions….json : une liste, ou un objet dont une clé porte la liste ;
//        entrée trouvée par son champ fichier, relatif au fichier d'attributions, ou par son nom s'il est unique) ; chacune identique
//        octet pour octet à une photo d'une démo du même métier dans <racine>/public/sites-demo/*/images/ (site.json → metier, ou nom
//        du dossier), avec le même auteur et la même licence que dans les attributions de cette démo (025-02 §5, 025-11 §3). Chaque
//        page : ses images (src, srcset, url() de la page et des feuilles de style de la sortie) existent dans la sortie (une image
//        hors de la sortie est refusée) ; si elle en montre, son pied porte « Photos d’illustration » et, après cette mention, chaque
//        auteur et chaque licence de ses images, et « modifiée » si une source est déclarée modifiée (generer.mjs:880, CC BY-SA). Une
//        image demandée hors de 127.0.0.1 pendant le rendu (MQ-7) est aussi un échec de MQ-5.
//   MQ-6 le dossier de sortie, fichiers de MQ-8 compris (« le dossier complet », 025-02 §7), pèse 3 000 000 octets au plus.
//   MQ-7 le juge sert la sortie en local et capture le haut de l'accueil à 1440×900 et à 390×844 (dpr 3, mobile, tactile), en JPEG,
//        dans .orchestre/travail/maquette-qa/captures/<métier>-bureau.jpg et -telephone.jpg (jamais dans la sortie) : fichier > 0 octet,
//        1 000 000 octets au plus, JPEG lisible aux dimensions de la fenêtre, écart-type du gris ≥ 8 ; à 390 px, aucun défilement
//        horizontal (defilementHorizontal = 0, scrollTo(99999) laisse scrollX à 0, innerWidth = 390) ; aucune ressource de la page en
//        4xx, 5xx ou échec (sauf /favicon.ico que Chromium demande seul) ; aucune requête hors de 127.0.0.1 (bloquée et comptée : la
//        maquette se suffit, sinon ses 3 Mo ne veulent rien dire).
//   MQ-8 node <racine>/scripts/maquette-capturer.mjs <sortie> (captures d'avant effacées) sort en code 0 et écrit capture-bureau.jpg et
//        capture-telephone.jpg dans <sortie> : JPEG, > 0 octet, 1 000 000 octets au plus, écart-type du gris ≥ 8, dimensions de la
//        fenêtre (1440×900 à l'échelle 1 ou 2, 390×844 à l'échelle 1, 2 ou 3 : le haut de l'accueil, pas la page entière) ; rien n'est
//        écrit sous <racine>/public/ ; et, une fois par passage, sur un dossier dont l'accueil est une page unie, il sort en code ≠ 0
//        (« code 1 sur une capture vide », 025-02 §7 : une capture unie est vide).
//   MQ-9 le nom de l'entreprise fictive, son slug, son mot distinctif (et son slug) et le repère du fait sourcé, en git grep -F -i -I :
//        dans aucun fichier suivi de <racine>, ni (dépôt Git) dans aucun fichier non suivi et non ignoré (il partirait au prochain
//        commit), hors de scripts/fixtures/025/ (le jeu d'essai) et de .orchestre/ (fiches et preuves). Sur un arbre extrait (non
//        Git) : tous ses fichiers (git grep --no-index).
//   MQ-10 (relecture à froid du 24/09, G3) les libellés du métier : la maquette est générée pour CHAQUE modèle de
//        <racine>/maquettes/modeles/ (jeu d'essai repris avec metier = modele = <m>, sortie .orchestre/travail/maquette-qa/mq10/<m>
//        ou celle de MQ-1 pour un métier déjà jugé) ; le texte de chaque page (titre, description, corps entier, lignes de crédits
//        ôtées), ses attributs alt, title, aria-label et placeholder et le texte des content: CSS ne portent aucun mot PROPRE à
//        un autre modèle. Le dictionnaire est tiré des modèles eux-mêmes (commun.mjs, motsDesMetiers : un mot qui revient au moins
//        deux fois dans les textes d'un modèle et n'apparaît dans aucun autre ; aujourd'hui « menuiserie », « bois »,
//        « plomberie »…) ; les mots du jeu d'essai (entreprise, ville, communes) sont admis. Deux modèles au moins, chacun
//        générable. Détecteur éprouvé à chaque passage : un mot propre à un autre modèle ajouté au texte du premier métier doit
//        être vu (mutation).
//   MQ-11 (M8) la capture destinée au prospect porte le crédit de chaque photo visible : pour chaque métier jugé, après MQ-8, le
//        juge ouvre l'accueil à 1440×900 et à 390×844 ; chaque photo (img, ou image de fond) qui occupe au moins 2 % du haut
//        visible doit avoir, DANS ce haut, son auteur et sa licence (et « modifiée » si ses attributions le disent) écrits dans
//        un élément visible (boîte entièrement dans la fenêtre, visibility visible, opacité cumulée ≥ 0,9, police ≥ 10 px,
//        elementFromPoint en son centre sur lui) ; puis la capture du capteur (capture-bureau.jpg, capture-telephone.jpg de
//        MQ-8) est comparée à celle que le juge prend lui-même, en gris et à mi-échelle : écart moyen ≤ 12 sur toute l'image
//        (c'est bien le haut de la page), et, dans la boîte de chaque crédit, écart ≤ la moitié de celui que produit le même
//        haut crédit caché (mutation : le juge cache les crédits, recapture, et cet écart doit valoir 4 au moins ; il vérifie
//        aussi que sa recherche ne les trouve plus). Un crédit incrusté par le capteur hors de la page n'est donc pas vu : le
//        crédit vit dans la page (légende de la photo du haut), et la capture le montre.
//   T1   Lestraque régénéré dans .orchestre/travail/maquette-qa/lestraque/ : index.html et site.js identiques, styles.css hors ligne 1
//        (scripts/fixtures/025/commun.mjs, t1) ; T2 : les neuf démos gelées intactes (t2). Jugés après les générations : un mode
//        maquette qui toucherait Lestraque ou une démo gelée en place est pris.
//
// Le témoin (--temoin) :
//   - T1, T2 et MQ-9 sur la racine (le dépôt par défaut) : ils passent aujourd'hui et doivent le rester ;
//   - MQ-1 à MQ-8, MQ-10 et MQ-11 sur l'arbre témoin .orchestre/travail/maquette-qa/temoin/, fait par preparerTemoin (commun.mjs) :
//     copie depuis la racine des site.json de chaque démo, puis, pour chaque modèle du témoin, de
//     public/sites-demo/<démo>/attributions.json et des photos qu'il nomme, puis superposition de
//     scripts/fixtures/025/temoins/maquette-qa/ : un faux public/sites-demo/generer.mjs qui ne sait faire que --maquette (refus sous
//     public/ et dans l'arbre hors de .orchestre/travail/ ; libellés tirés du modèle, crédit de la photo du haut en légende), deux
//     modèles minimaux maquettes/modeles/menuisier/ et plombier/ et un faux scripts/maquette-capturer.mjs. Ce témoin simule l'état
//     « après » des fiches 025-02 et 025-14 : il prouve que chaque critère peut passer. Ce n'est pas une implémentation de
//     référence (ses modèles ne sont pas au format v2).
//   - métier : celui du jeu d'essai (menuisier) ; --metier est refusé avec --temoin.
//
// Choix du juge (la fiche ne tranche pas) :
//   - Mo = 1 000 000 octets (1 Mo = 1 000 000, 3 Mo = 3 000 000).
//   - « Chaque page » = chaque fichier .html de la sortie ; le rendu (MQ-3 visible, MQ-4 zones, MQ-7) porte sur l'accueil (index.html).
//   - Le texte statique d'une page : balises ôtées (script, style, template et commentaires retirés), blocs séparés par des lignes,
//     entités décodées, espaces insécables et apostrophes typographiques ramenés à l'espace et à « ' » pour les comparaisons.
//   - Remesure : une zone qui n'est pas encore visible est relue toutes les 250 ms pendant 3 s (apparitions au défilement).
//   - Chaque métier est jugé à part : une exception dans un métier fait échouer ses critères MQ-1 à MQ-8, sans arrêter les autres.
import fs from 'node:fs'
import path from 'node:path'
import {
  R, FIXTURES, TRAVAIL, MAQUETTE_EXEMPLE,
  lireOptionsOuQuitter, creerSortie, t1, t2, servir, lancerNavigateur, BUREAU, TELEPHONE, capturer, verifierImage,
  defilementHorizontal, exigerSousTravail, dossierTravail, lancer, taille, fichierNonVide, lireJson, sha256, listerFichiers,
  instantaneDossier, comparerInstantanes, preparerTemoin, estRacineGit, git, lireMaquetteExemple, replier, motsDesMetiers, motsEtrangers,
} from './fixtures/025/commun.mjs'

const JUGE = 'maquette-qa'
const IDS = ['MQ-1', 'MQ-2', 'MQ-3', 'MQ-4', 'MQ-5', 'MQ-6', 'MQ-7', 'MQ-8', 'MQ-9', 'MQ-10', 'MQ-11', 'T1', 'T2']
const PAR_METIER = ['MQ-1', 'MQ-3', 'MQ-4', 'MQ-5', 'MQ-6', 'MQ-7', 'MQ-8', 'MQ-11']
const MO = 1_000_000
const MAX_CAPTURE = 1 * MO
const MAX_DOSSIER = 3 * MO
const ZONES_MIN = 5
const RESERVES = new Set(['lestraque', 'temoin', 'jeux', 'captures', 'capturer-vide', 'mq10'])
const EXCLUS_MQ9 = ['scripts/fixtures/025', '.orchestre']
const IMAGE = /\.(?:avif|webp|jpe?g|png|gif)$/i
const CAPTURES_MQ8 = ['capture-bureau.jpg', 'capture-telephone.jpg']
const MARQUE = /[àÀaA]\s+compl[éÉeE]ter\s+avec\s+vous/iu
const MARQUE_G = new RegExp(MARQUE.source, 'giu')
const TEMOIN_SOURCE = path.join(FIXTURES, 'temoins', JUGE)

// ── Options ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
const o = lireOptionsOuQuitter(process.argv.slice(2), { connues: ['metier'] })
const refuser = (m) => { console.error(`✗ ${m}`); process.exit(2) }
if (o.positionnels.length) refuser(`argument(s) inattendu(s) : ${o.positionnels.join(' ')} — usage : node scripts/maquette-qa.mjs [--metier=a,b] [--racine=<dossier>] [--temoin]`)
if (o.reel) refuser('maquette-qa n’a pas de mode --reel : tout se juge en local')
const metierDonne = o.valeur('metier') !== undefined
if (o.drapeau('metier') || (metierDonne && !o.liste('metier').length)) refuser('--metier attend une liste : --metier=menuisier,plombier')
if (o.temoin && metierDonne) refuser('--temoin juge le seul métier du témoin (celui du jeu d’essai) : sans --metier')
for (const m of o.liste('metier')) {
  if (!/^[a-z][a-z0-9-]{1,40}$/.test(m)) refuser(`--metier : « ${m} » n’est pas un nom de métier ([a-z0-9-])`)
  if (RESERVES.has(m)) refuser(`--metier : « ${m} » est un nom réservé par le juge (${[...RESERVES].join(', ')})`)
}
if (new Set(o.liste('metier')).size !== o.liste('metier').length) refuser('--metier : métier en double')

// ── Sortie, masquée : le nom fictif n'est jamais imprimé ──────────────────────────────────────────────────────────────────
const s = creerSortie(JUGE, IDS, { racine: o.racine, temoin: o.temoin })
let MASQUES = []
const masquer = (t) => { let x = String(t ?? ''); for (const [a, b] of MASQUES) if (a) x = x.split(a).join(b); return x }
const passe = (id, d) => s.passe(id, masquer(d))
const echoue = (id, d) => s.echoue(id, masquer(d))
const note = (d) => s.note(masquer(d))
const premiereLigne = (e) => String((e && e.message) || e).split('\n')[0].slice(0, 300)
const court = (t, n = 110) => { const x = String(t ?? '').replace(/\s+/g, ' ').trim(); return x.length > n ? `${x.slice(0, n - 1)}…` : x }
const relR = (p) => { const r = path.relative(R, p); return r && !r.startsWith('..') && !path.isAbsolute(r) ? r.split(path.sep).join('/') : p }
const slugDe = (t) => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
const echapperRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// ── Texte d'une page ──────────────────────────────────────────────────────────────────────────────────────────────────────
const ENTITES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', laquo: '«', raquo: '»', hellip: '…', ndash: '–', mdash: '—', middot: '·', copy: '©', reg: '®', trade: '™', euro: '€', sup2: '²', sup3: '³', deg: '°', times: '×', percnt: '%', num: '#', star: '☆', starf: '★', thinsp: '\u2009', ensp: '\u2002', emsp: '\u2003', shy: '', eacute: 'é', egrave: 'è', ecirc: 'ê', euml: 'ë', agrave: 'à', acirc: 'â', auml: 'ä', ccedil: 'ç', icirc: 'î', iuml: 'ï', ocirc: 'ô', ouml: 'ö', ugrave: 'ù', ucirc: 'û', uuml: 'ü', oelig: 'œ', aelig: 'æ', Eacute: 'É', Egrave: 'È', Ecirc: 'Ê', Agrave: 'À', Acirc: 'Â', Ccedil: 'Ç', Icirc: 'Î', Ocirc: 'Ô', Ucirc: 'Û', OElig: 'Œ' }
const decoder = (t) => String(t).replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (tout, e) => {
  if (e[0] === '#') { const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); try { return String.fromCodePoint(n) } catch { return tout } }
  return ENTITES[e] ?? ENTITES[e.toLowerCase()] ?? tout
})
/** Pour comparer : autres graphies repliées (commun.mjs, replier : NFKC, invisibles ôtés, cyrillique et grec de forme latine),
 *  apostrophes et tirets ramenés, espaces spéciales → espace, blancs de ligne réduits (les \n restent). */
const norm = (t) => replier(t).replace(/[’‘ʼ′`]/g, "'").replace(/[\u2010\u2011]/g, '-').replace(/[\u00a0\u202f\u2007\u2009\u2002\u2003\u200a]/g, ' ').replace(/\u00ad/g, '').replace(/[ \t\f\v\r]+/g, ' ')
const BLOCS = 'address|article|aside|blockquote|br|button|dd|details|div|dl|dt|fieldset|figcaption|figure|footer|form|h[1-6]|header|hr|label|legend|li|main|nav|ol|option|p|section|select|summary|table|tbody|td|textarea|tfoot|th|thead|tr|ul'
const RE_BLOCS = new RegExp(`<\\/?(?:${BLOCS})\\b[^>]*>`, 'gi')
function texteHtml(html) {
  const t = String(html).replace(/<!--[\s\S]*?-->/g, ' ').replace(/<(script|style|template)\b[\s\S]*?<\/\1\s*>/gi, ' ').replace(RE_BLOCS, '\n').replace(/<[^>]*>/g, '')
  return norm(decoder(t)).split('\n').map((l) => l.trim()).filter(Boolean).join('\n')
}
function attributs(balise) {
  const a = {}
  const corps = String(balise).replace(/^<[^\s>]+/, '').replace(/\/?>$/, '')
  for (const m of corps.matchAll(/([^\s=<>"'/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) a[m[1].toLowerCase()] = decoder(m[2] ?? m[3] ?? m[4] ?? '')
  return a
}
/** Le HTML que le navigateur interprète : commentaires, script, style, template, noscript et textarea ôtés (une <meta> ou un
 *  <footer> écrits là ne sont ni lus par un moteur ni affichés). */
const sansInerte = (html) => String(html).replace(/<!--[\s\S]*?(?:-->|$)/g, ' ').replace(/<(script|style|template|noscript|textarea)\b[\s\S]*?(?:<\/\1\s*>|$)/gi, ' ')
function lirePages(dossier) {
  return [...listerFichiers(dossier)].filter((f) => /\.html?$/i.test(f)).sort().map((rel) => {
    const html = fs.readFileSync(path.join(dossier, rel), 'utf8')
    const b = html.search(/<body\b/i), fb = html.search(/<\/body\s*>/i)
    const corps = b >= 0 ? html.slice(b, fb > b ? fb : undefined) : html
    // les <meta> comptées sont celles de l'en-tête interprété : avant <body> (ou </head>), hors commentaires et scripts
    const propre = sansInerte(html)
    const finTete = [propre.search(/<body\b/i), propre.search(/<\/head\s*>/i)].filter((i) => i >= 0)
    const tete = finTete.length ? propre.slice(0, Math.min(...finTete)) : propre
    const metas = [...tete.matchAll(/<meta\b[^>]*>/gi)].map((m) => attributs(m[0]))
    const metasHorsTete = [...html.matchAll(/<meta\b[^>]*>/gi)].length - metas.length
    const bp = propre.search(/<body\b/i), fbp = propre.search(/<\/body\s*>/i)
    const corpsPropre = bp >= 0 ? propre.slice(bp, fbp > bp ? fbp : undefined) : propre
    const pieds = [...corpsPropre.matchAll(/<footer\b[\s\S]*?<\/footer\s*>/gi)].map((m) => m[0])
    return {
      rel, html, corps, corpsPropre, metas, metasHorsTete,
      titre: norm(decoder((/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i.exec(html) || [])[1] || '')).trim(),
      description: norm(metas.find((a) => (a.name || '').toLowerCase() === 'description')?.content || '').trim(),
      texte: texteHtml(corps),
      pied: pieds.length ? texteHtml(pieds.at(-1)) : null,
    }
  })
}
const sansCredits = (texte) => norm(texte).split('\n').filter((l) => !/Photos d'illustration/i.test(l)).join('\n')
const sansCommentairesHtml = (html) => String(html).replace(/<!--[\s\S]*?(?:-->|$)/g, ' ')
/** Une chaîne CSS décodée : \201C (hexadécimal, espace facultative), \" et continuation de ligne. */
const decoderCss = (s) => String(s).replace(/\\\r?\n/g, '').replace(/\\([0-9a-fA-F]{1,6})[ \t\n]?/g, (_, h) => { try { return String.fromCodePoint(parseInt(h, 16)) } catch { return '' } }).replace(/\\([\s\S])/g, '$1')
/** Les textes que des déclarations content: affichent : chaînes, et valeurs des attributs lus par attr(…) dans les pages. */
function textesDeContent(css, pages) {
  const out = []
  for (const m of String(css).replace(/\/\*[\s\S]*?\*\//g, ' ').matchAll(/(?:^|[;{\s])content\s*:([^;}]*)/gi)) {
    for (const s of m[1].matchAll(/(["'])((?:\\[\s\S]|(?!\1)[^\\])*)\1|attr\(\s*([\w-]+)/g)) {
      if (s[3]) { for (const p of pages) for (const a of p.corpsPropre.matchAll(new RegExp(`\\s${echapperRe(s[3])}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'gi'))) if (a[2].trim()) out.push(decoder(a[2])) }
      else if (decoderCss(s[2]).trim()) out.push(decoderCss(s[2]))
    }
  }
  return out
}

// ── Motifs de MQ-4 ────────────────────────────────────────────────────────────────────────────────────────────────────────
const MOTIFS_JUGE = [
  [/(?<![\p{L}\p{N}])\d{1,3}\s*ans?(?![\p{L}])/giu, 'durée en années'],
  [/(?<![\p{L}])(?:un|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|vingt|trente|quarante|cinquante|soixante|cent)\s+(?:ans|années)(?![\p{L}])/giu, 'durée en années (en lettres)'],
  [/\d+\s*%/gu, 'pourcentage'],
  [/\d[\d .,\u00a0\u202f]*\s*(?:€|euros?(?![\p{L}]))/giu, 'prix'],
  [/(?<![\p{L}])(?:RGE|Qualibat|Qualifelec|QualiPAC|Qualit'?EnR|Qualisol|Qualibois|Handibat|décennale|decennale|certifi\p{L}*|labellis\p{L}*|agr[ée][ée]\p{L}*|garantie\s+\d)/giu, 'label, certification ou garantie'],
  [/(?<![\p{L}])(?:le meilleur|la meilleure|les meilleur(?:e)?s|num[ée]ro\s*(?:1|un)|n°\s*1|leader|incontournable|expert\s+reconnu|référence\s+(?:du|de la|des|en))(?![\p{L}])/giu, 'superlatif'],
  [/(?<![\p{L}])(?:depuis|dès|des|en)\s+(?:1[89]|20)\d{2}(?!\d)/giu, 'année'],
  [/m\s?²|(?<![\p{L}\p{N}])m2(?![\p{L}\p{N}])/giu, 'surface'],
  [/(?<![\p{L}\p{N}])\d+(?:[.,]\d+)?\s*(?:h|heures?|jours?|semaines?|mois|minutes?|min)(?![\p{L}])/giu, 'délai chiffré'],
  [/★|⭐|☆|(?<![\p{N}])\d(?:[.,]\d)?\s*\/\s*5(?![\p{N}])|(?<![\p{L}])(?:avis\s+(?:clients?|google|vérifiés?)|témoignages?)(?![\p{L}])/giu, 'avis'],
  [/(?<![\p{L}])ficti(?:f|fs|ve|ves)(?![\p{L}])/giu, '« fictif » (la maquette s’adresse à une entreprise réelle)'],
]
/** Les littéraux d'expression d'un bloc de source, une par ligne (« /…/flags, // commentaire »). */
function litterauxParLigne(bloc) {
  const out = []
  for (const l of bloc.split(/\r?\n/)) {
    const m = /^\s*\/(.+)\/([dgimsuy]*),\s*(?:\/\/.*)?$/.exec(l.replace(/\r$/, ''))
    if (!m) continue
    try { out.push(new RegExp(m[1], m[2].includes('g') ? m[2] : `${m[2]}g`)) } catch { /* ligne illisible : ignorée, comptée plus bas */ }
  }
  return out
}
/** Les motifs de findFabrications (lib/ai.ts:1054) de la racine, sinon ceux du dépôt. → { motifs[], origine } */
function motifsFindFabrications(racine) {
  for (const base of [racine, R]) {
    const src = (() => { try { return fs.readFileSync(path.join(base, 'lib', 'ai.ts'), 'utf8') } catch { return null } })()
    if (!src) continue
    const i = src.indexOf('export function findFabrications')
    const j = i < 0 ? -1 : src.indexOf('const pats', i)
    const k = j < 0 ? -1 : src.indexOf('\n  ]', j)
    if (k < 0) continue
    const motifs = litterauxParLigne(src.slice(j, k))
    if (motifs.length >= 3) return { motifs, origine: `${relR(path.join(base, 'lib', 'ai.ts'))} (${motifs.length} motifs)` }
  }
  return { motifs: [], origine: 'illisibles (copie du juge seule)' }
}
/** CLICHES de generer.mjs:204, de la racine, sinon du dépôt. */
function motifsCliches(racine) {
  for (const base of [racine, R]) {
    const f = path.join(base, 'public', 'sites-demo', 'generer.mjs')
    const src = (() => { try { return fs.readFileSync(f, 'utf8') } catch { return null } })()
    const m = src && /const CLICHES = \[([^\n]*)\]\s*\n/.exec(src)
    if (!m) continue
    const motifs = []
    for (const x of m[1].matchAll(/\/((?:\\.|\[(?:\\.|[^\]\\])*\]|[^/\\\n[])+)\/([dgimsuy]*)/g)) { try { motifs.push(new RegExp(x[1], x[2].includes('g') ? x[2] : `${x[2]}g`)) } catch { /* ignoré */ } }
    if (motifs.length) return { motifs, origine: `${relR(f)} (${motifs.length})` }
  }
  return { motifs: [], origine: 'introuvables' }
}
/** Ce qui est propre aux démos du dépôt (site.json), à ne jamais voir dans une maquette. → [{ re, quoi }] */
function fuitesDesDemos(racine, ex) {
  const dansJeu = norm([ex.entreprise, ex.ville, ...ex.communes].join(' | ')).toLowerCase()
  const out = []
  const dir = path.join(racine, 'public', 'sites-demo')
  const dossiers = fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name) : []
  let demos = 0
  for (const d of dossiers) {
    let sj
    try { sj = lireJson(path.join(dir, d, 'site.json')) } catch { continue }
    demos++
    // les lieux (ville, communes) ne sont cherchés que dans les maquettes du même métier que la démo, ou si la démo est au format
    // v2 (Lestraque, d'où dérivent les modèles) : « Lattes », commune du serrurier de Montpellier, est aussi un mot de couvreur
    let v2 = false
    try { v2 = !!lireJson(path.join(dir, d, 'contenu.json'))?.pages?.['/']?.h1Ligne } catch { /* sans contenu.json */ }
    const metierDemo = sj.metier || d
    const ajoute = (t, quoi, mot = false, lieu = false) => {
      if (typeof t !== 'string') return
      const x = norm(t).trim()
      if (x.length < 4 || dansJeu.includes(x.toLowerCase())) return
      out.push({ re: new RegExp(mot ? `(?<![\\p{L}\\p{N}])${echapperRe(x)}(?![\\p{L}\\p{N}])` : echapperRe(x), 'u'), quoi: `${d}/site.json → ${quoi}`, lieu, demo: d, metier: metierDemo, v2 })
    }
    ajoute(sj.nom, 'nom'); ajoute(sj.ville, 'ville', true, true)
    for (const c of Array.isArray(sj.communes) ? sj.communes : []) ajoute(c, 'communes', true, true)
    ajoute(sj.siren, 'siren', true)
    ajoute(sj.decennale?.assureur, 'décennale.assureur'); ajoute(sj.decennale?.numero, 'décennale.numero', true)
    const a = sj.artisan
    if (a && typeof a === 'object') { if (a.prenom && a.nom) ajoute(`${a.prenom} ${a.nom}`, 'artisan'); ajoute(a.nom, 'artisan.nom', true); ajoute(a.parcours, 'artisan.parcours'); ajoute(a.citation, 'artisan.citation') }
    ajoute(sj.devis?.rappel, 'devis.rappel')
    try { ajoute(new URL(sj.url_base).hostname, 'url_base') } catch { /* sans url_base */ }
    if (typeof sj.telephone === 'string') {
      const ch = sj.telephone.replace(/\D/g, '')
      const national = ch.startsWith('33') ? `0${ch.slice(2)}` : ch
      if (national.length >= 9) out.push({ re: new RegExp(`(?<!\\d)(?:${national}|${ch})(?!\\d)`), quoi: `${d}/site.json → telephone`, chiffres: true })
    }
  }
  return { fuites: out, demos }
}
/** Les occurrences des motifs dans un texte : [{ quoi, extrait }] (une par motif et par jeton). */
function chercher(texte, motifs, admis = '') {
  const t = norm(texte), vus = new Set(), hits = []
  for (const [re, quoi] of motifs) {
    re.lastIndex = 0
    for (const m of t.matchAll(re.global ? re : new RegExp(re.source, `${re.flags}g`))) {
      const tok = m[0].trim()
      if (!tok || (admis && admis.includes(tok.toLowerCase()))) continue
      const cle = `${quoi}|${tok.toLowerCase()}`
      if (vus.has(cle)) continue
      vus.add(cle)
      hits.push({ quoi, extrait: `« ${tok} » dans « ${court(t.slice(Math.max(0, m.index - 40), m.index + tok.length + 40), 100)} »` })
    }
  }
  return hits
}

// ── Photos des démos (provenance, MQ-5) ──────────────────────────────────────────────────────────────────────────────────
function indexPhotos(racine) {
  const dir = path.join(racine, 'public', 'sites-demo')
  const parTaille = new Map(), demos = new Map()
  const noms = fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name) : []
  for (const d of noms) {
    let metier = d
    try { metier = lireJson(path.join(dir, d, 'site.json')).metier || d } catch { /* sans site.json : le nom du dossier */ }
    const attr = new Map()
    try { for (const a of lireJson(path.join(dir, d, 'attributions.json'))) if (a && typeof a.fichier === 'string') attr.set(path.posix.basename(a.fichier), a) } catch { /* sans attributions */ }
    demos.set(d, { metier, attr })
    for (const f of listerFichiers(path.join(dir, d, 'images'))) {
      if (!IMAGE.test(f)) continue
      const chemin = path.join(dir, d, 'images', f)
      const t = taille(chemin)
      if (!parTaille.has(t)) parTaille.set(t, [])
      parTaille.get(t).push({ chemin, demo: d, nom: path.posix.basename(f) })
    }
  }
  const cache = new Map()
  const empreinte = (f) => { if (!cache.has(f)) cache.set(f, sha256(fs.readFileSync(f))); return cache.get(f) }
  return {
    demos,
    source(fichier) {
      const cands = parTaille.get(taille(fichier)) || []
      if (!cands.length) return null
      const e = empreinte(fichier)
      return cands.find((c) => empreinte(c.chemin) === e) || null
    },
  }
}

// ── Aides de jugement ─────────────────────────────────────────────────────────────────────────────────────────────────────
const poids = (dir) => [...listerFichiers(dir)].reduce((n, f) => n + Math.max(0, taille(path.join(dir, f))), 0)
const mo = (n) => `${(n / MO).toFixed(2)} Mo`
const dossierNonVide = (d) => { try { return [...listerFichiers(d)].some((f) => taille(path.join(d, f)) > 0) } catch { return false } }
function instantanePublic(racine) { return instantaneDossier(path.join(racine, 'public')) }
function ecritsSous(avant, apres) {
  const c = comparerInstantanes(avant, apres)
  return c.egal ? null : `${[...c.ajoutes.map((f) => `+${f}`), ...c.modifies.map((f) => `~${f}`), ...c.retires.map((f) => `-${f}`)].slice(0, 4).join(', ')}${c.ajoutes.length + c.modifies.length + c.retires.length > 4 ? '…' : ''} (${c.ajoutes.length} ajouté(s), ${c.modifies.length} modifié(s), ${c.retires.length} retiré(s))`
}
function generer(racine, jeu, sortie, { cwd = racine } = {}) {
  const GEN = path.join(racine, 'public', 'sites-demo', 'generer.mjs')
  return lancer(process.execPath, [GEN, `--maquette=${jeu}`, `--sortie=${sortie}`], { cwd, timeout: 240_000 })
}
const codeDe = (r) => (r.code === null ? `arrêté (${r.signal || r.erreur || 'délai dépassé'})` : `code ${r.code}`)
/** La ligne qui explique une sortie : la première ligne d'erreur (« …Error: », « ✗ ») d'un plantage, sinon la dernière ligne
 *  qui n'est pas « Node.js vXX » (un plantage de Node finit par sa version). */
function messageDe(r) {
  const lignes = String(r.sortie || '').split('\n').map((l) => l.trim()).filter((l) => l && !/^Node\.js v\d/.test(l))
  return lignes.find((l) => /^(?:[A-Za-z]*Error\b|✗)/.test(l)) || lignes.at(-1) || ''
}

// MQ-2 : les essais de sortie interdite
function essaisSortieInterdite(racine, jeu) {
  const cibles = [
    { sortie: path.join(racine, 'public', 'sites-demo', 'essai'), cible: path.join(racine, 'public', 'sites-demo', 'essai'), quoi: '<racine>/public/sites-demo/essai' },
    { sortie: 'public/sites-demo/essai', cible: path.join(racine, 'public', 'sites-demo', 'essai'), quoi: 'public/sites-demo/essai (relatif)' },
    ...(process.platform === 'win32' ? [{ sortie: path.join(racine, 'PUBLIC', 'sites-demo', 'essai'), cible: path.join(racine, 'public', 'sites-demo', 'essai'), quoi: '<racine>/PUBLIC/sites-demo/essai (autre casse)' }] : []),
    { sortie: path.join(racine, 'essai-maquette-qa'), cible: path.join(racine, 'essai-maquette-qa'), quoi: '<racine>/essai-maquette-qa (dépôt, hors .orchestre/travail)' },
    // un chemin qui COMMENCE par .orchestre/travail mais en ressort par « .. » : une liste blanche par préfixe, faite avant de
    // normaliser le chemin, l'accepterait (chaîne écrite telle quelle : path.join ôterait les « .. »)
    { sortie: [racine, '.orchestre', 'travail', '..', '..', 'public', 'sites-demo', 'essai'].join(path.sep), cible: path.join(racine, 'public', 'sites-demo', 'essai'), quoi: '<racine>/.orchestre/travail/../../public/sites-demo/essai (préfixe permis, « .. »)' },
  ]
  const defauts = [], faits = []
  for (const c of cibles) {
    if (fs.existsSync(c.cible)) { defauts.push(`${c.quoi} existe déjà : essai impossible, le juge n’y touche pas`); continue }
    const avant = instantanePublic(racine)
    const r = generer(racine, jeu, c.sortie)
    const apres = instantanePublic(racine)
    const creee = fs.existsSync(c.cible)
    const ecrit = ecritsSous(avant, apres)
    if (creee) fs.rmSync(c.cible, { recursive: true, force: true }) // elle n'existait pas avant l'essai
    if (r.code === 0 || r.code === null) defauts.push(`${c.quoi} : ${codeDe(r)} (refus attendu, code ≠ 0)`)
    if (creee) defauts.push(`${c.quoi} : la cible a été créée (effacée par le juge)`)
    if (ecrit) defauts.push(`${c.quoi} : écrit sous public/ : ${ecrit}`)
    faits.push(`${c.quoi} → ${codeDe(r)}${messageDe(r) ? ` « ${court(messageDe(r), 70)} »` : ''}`)
  }
  return { defauts, faits }
}

// Le rendu de l'accueil : captures (MQ-7), texte visible (MQ-3, MQ-4), zones (MQ-4), requêtes (MQ-5, MQ-7)
async function examinerRendu(nav, sortie, m) {
  const dossierCaptures = exigerSousTravail(path.join(TRAVAIL, JUGE, 'captures'))
  fs.mkdirSync(dossierCaptures, { recursive: true })
  const srv = await servir(sortie)
  const res = { vues: [] }
  try {
    for (const [nom, opts] of [['bureau', BUREAU], ['telephone', TELEPHONE]]) {
      const vue = { nom, externes: [], manques: [], zones: [], chiffres: [], texte: '' }
      res.vues.push(vue)
      const ctx = await nav.newContext({ ...opts, reducedMotion: 'no-preference' })
      try {
        await ctx.route('**/*', (route) => {
          const u = route.request().url()
          let hote = ''
          try { hote = new URL(u).hostname } catch { /* data:, blob: */ }
          if (hote === '127.0.0.1' || /^(?:data|blob):/i.test(u)) return route.continue()
          vue.externes.push({ type: route.request().resourceType(), url: court(u, 90) })
          return route.abort()
        })
        const page = await ctx.newPage()
        const local = (u) => { try { const x = new URL(u); return x.hostname === '127.0.0.1' && x.pathname !== '/favicon.ico' } catch { return false } }
        page.on('response', (r) => { if (r.status() >= 400 && local(r.url())) vue.manques.push(`${r.status()} ${new URL(r.url()).pathname}`) })
        page.on('requestfailed', (q) => { if (local(q.url())) vue.manques.push(`échec ${new URL(q.url()).pathname} (${q.failure()?.errorText || '?'})`) })
        const rep = await page.goto(`${srv.base}/`, { waitUntil: 'load', timeout: 60_000 })
        vue.statut = rep ? rep.status() : null
        await page.evaluate(() => (document.fonts ? document.fonts.ready.then(() => 1) : 1))
        await page.evaluate(() => window.scrollTo(0, 0))
        await page.waitForTimeout(1200)
        vue.capture = await capturer(page, path.join(dossierCaptures, `${m}-${nom}.jpg`), { maxOctets: MAX_CAPTURE })
        vue.defilement = await defilementHorizontal(page)
        vue.essaiDefilement = await page.evaluate(() => { const y = window.scrollY; window.scrollTo({ left: 99999, top: y, behavior: 'instant' }); const x = window.scrollX; window.scrollTo({ left: 0, top: y, behavior: 'instant' }); return { x, largeur: window.innerWidth } })
        vue.texte = await page.evaluate(() => [document.title, document.body ? document.body.innerText : ''].join('\n'))
        // ce que lisent les moteurs (les <meta> de document.head, pas celles d'un commentaire ni du corps) et ce que voit le
        // visiteur du pied (innerText du dernier <footer>) ; le texte des ::before / ::after (absent de innerText)
        vue.robots = await page.evaluate(() => [...document.head.querySelectorAll('meta')].filter((x) => /^(?:robots|googlebot)$/i.test(x.getAttribute('name') || '')).map((x) => ({ name: x.getAttribute('name'), content: x.getAttribute('content') || '' })))
        vue.pied = await page.evaluate(() => { const f = [...document.querySelectorAll('footer')].at(-1); return f ? f.innerText : null })
        vue.pseudo = await page.evaluate(() => {
          const out = []
          for (const el of document.querySelectorAll('*')) for (const p of ['::before', '::after']) {
            const c = getComputedStyle(el, p).content
            if (!c || c === 'none' || c === 'normal') continue
            let t = ''
            for (const m of c.matchAll(/"((?:\\.|[^"\\])*)"|attr\(\s*([\w-]+)\s*\)/g)) t += m[1] !== undefined ? m[1].replace(/\\(.)/g, '$1') : (el.getAttribute(m[2]) || '')
            if (t.trim()) out.push(t)
          }
          return out
        })
        // les zones « À compléter avec vous » : éléments les plus profonds qui portent la marque
        const n = await page.evaluate((src) => {
          const re = new RegExp(src, 'iu')
          const t = (el) => (el.textContent || '').replace(/[\u00a0\u202f]/g, ' ')
          const tous = [...document.body.querySelectorAll('*')].filter((el) => !['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT'].includes(el.tagName) && re.test(t(el)))
          const feuilles = tous.filter((el) => ![...el.children].some((c) => re.test(t(c))))
          feuilles.forEach((el, i) => el.setAttribute('data-maquette-qa-zone', String(i)))
          return feuilles.length
        }, MARQUE.source)
        for (let i = 0; i < n; i++) {
          await page.evaluate((i) => document.querySelector(`[data-maquette-qa-zone="${i}"]`)?.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }), i)
          let etat
          const t0 = Date.now()
          do {
            await page.waitForTimeout(250)
            etat = await page.evaluate(({ i, src }) => {
              const re = new RegExp(src, 'iu')
              const el = document.querySelector(`[data-maquette-qa-zone="${i}"]`)
              if (!el) return { visible: false, raison: 'disparue du DOM' }
              // le centre de la première boîte de ligne (un élément en ligne sur deux lignes a un centre de boîte vide) ; pour le
              // test, pointer-events forcé à auto sur la zone : elementFromPoint doit tomber sur elle ou un de ses descendants
              // (un ancêtre touché, c'est un calque — ::after d'une section, voile — posé dessus)
              const r = el.getClientRects()[0] || el.getBoundingClientRect()
              let op = 1
              for (let e = el; e && e.nodeType === 1; e = e.parentElement) op *= parseFloat(getComputedStyle(e).opacity || '1')
              const cx = r.left + r.width / 2, cy = r.top + r.height / 2
              const dansEcran = r.width >= 2 && r.height >= 2 && cx >= 0 && cy >= 0 && cx < window.innerWidth && cy < window.innerHeight
              const pe = el.style.getPropertyValue('pointer-events'), prio = el.style.getPropertyPriority('pointer-events')
              el.style.setProperty('pointer-events', 'auto', 'important')
              const hit = dansEcran ? document.elementFromPoint(cx, cy) : null
              if (pe) el.style.setProperty('pointer-events', pe, prio); else el.style.removeProperty('pointer-events')
              const dessus = !!hit && (hit === el || el.contains(hit))
              const lu = re.test((el.innerText || '').replace(/[\u00a0\u202f]/g, ' '))
              const vis = getComputedStyle(el).visibility
              const raisons = []
              if (!dansEcran) raisons.push(`boîte ${Math.round(r.width)}×${Math.round(r.height)} hors de l’écran ou vide`)
              if (dansEcran && !dessus) raisons.push(`recouverte par ${hit ? hit.tagName.toLowerCase() + (typeof hit.className === 'string' && hit.className ? '.' + hit.className.trim().split(/\s+/)[0] : '') : 'rien'}`)
              if (op < 0.5) raisons.push(`opacité ${op.toFixed(2)}`)
              if (vis !== 'visible') raisons.push(`visibility ${vis}`)
              if (!lu) raisons.push('marque absente du texte rendu')
              return { visible: raisons.length === 0, raison: raisons.join(', '), balise: el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/)[0] : '') }
            }, { i, src: MARQUE.source })
          } while (!etat.visible && Date.now() - t0 < 3000)
          vue.zones.push(etat)
        }
        // aucun chiffre dans les sections (ou blocs) qui portent les zones
        vue.chiffres = await page.evaluate(() => {
          const out = [], vus = new Set()
          for (const el of document.querySelectorAll('[data-maquette-qa-zone]')) {
            const bloc = el.closest('section') || el.closest('article, aside, figure, dl, div') || el.parentElement
            if (!bloc || vus.has(bloc)) continue
            vus.add(bloc)
            // le texte du bloc, plus celui de ses ::before / ::after (chaînes et attr(), pas les compteurs)
            let pseudo = ''
            for (const e of [bloc, ...bloc.querySelectorAll('*')]) for (const p of ['::before', '::after']) {
              const c = getComputedStyle(e, p).content
              if (!c || c === 'none' || c === 'normal') continue
              for (const m of c.matchAll(/"((?:\\.|[^"\\])*)"|attr\(\s*([\w-]+)\s*\)/g)) pseudo += ` ${m[1] !== undefined ? m[1] : (e.getAttribute(m[2]) || '')}`
            }
            const t = `${bloc.innerText || ''}${pseudo}`.replace(/\s+/g, ' ')
            const m = /\d/.exec(t)
            if (m) out.push(`${bloc.tagName.toLowerCase()}${typeof bloc.className === 'string' && bloc.className ? '.' + bloc.className.trim().split(/\s+/)[0] : ''} : « ${t.slice(Math.max(0, m.index - 40), m.index + 40).trim()} »`)
          }
          return out
        })
      } finally { await ctx.close() }
    }
  } finally { await srv.fermer() }
  return res
}

// ── Un métier : MQ-1, puis MQ-3 à MQ-8 ────────────────────────────────────────────────────────────────────────────────────
async function jugerMetier({ m, jeu, racine, ex, premier, nav, index, fab, cliches, fuites }) {
  const pre = `${m} : `
  const sortie = exigerSousTravail(path.join(TRAVAIL, JUGE, m))
  fs.rmSync(sortie, { recursive: true, force: true })
  const PUBLIC_MQ2 = [] // écrits sous public/ par la génération de MQ-1, jugés dans MQ-2

  // MQ-1
  const GEN = path.join(racine, 'public', 'sites-demo', 'generer.mjs')
  const modele = path.join(racine, 'maquettes', 'modeles', m)
  const d1 = []
  if (!dossierNonVide(modele)) d1.push(`modèle maquettes/modeles/${m}/ absent ou vide`)
  let g = null
  if (!fichierNonVide(GEN)) d1.push('public/sites-demo/generer.mjs absent ou vide')
  else {
    const avant = instantanePublic(racine)
    g = generer(racine, jeu, sortie)
    const ecrit = ecritsSous(avant, instantanePublic(racine))
    if (ecrit) PUBLIC_MQ2.push(`${pre}la génération de MQ-1 a écrit sous public/ : ${ecrit}`)
    if (g.code !== 0) d1.unshift(`generer.mjs --maquette=${relR(jeu)} --sortie=${relR(sortie)} : ${codeDe(g)}${messageDe(g) ? ` « ${court(messageDe(g), 120)} »` : ''}`)
  }
  let pages = []
  if (g && g.code === 0) {
    if (!fichierNonVide(path.join(sortie, 'index.html'))) d1.push('code 0 mais index.html absent ou vide dans la sortie')
    else {
      pages = lirePages(sortie)
      const accueil = pages.find((p) => p.rel === 'index.html')
      const texteAccueil = norm(`${accueil.titre}\n${accueil.texte}`)
      if (!texteAccueil.includes(norm(ex.entreprise))) d1.push('l’accueil ne nomme pas l’entreprise du jeu d’essai')
      if (!new RegExp(`(?<![\\p{L}])${echapperRe(norm(ex.ville))}(?![\\p{L}])`, 'u').test(texteAccueil)) d1.push(`l’accueil ne nomme pas la ville du jeu d’essai (${ex.ville})`)
      for (const p of pages) {
        const marques = [...new Set([...`${p.titre}\n${p.description}\n${p.texte}`.matchAll(/\{[\p{L}_]+\}/gu)].map((x) => x[0]))]
        if (marques.length) d1.push(`${p.rel} : marque(s) non remplacée(s) ${marques.slice(0, 4).join(' ')}`)
      }
    }
  }
  if (d1.length) for (const d of d1) echoue('MQ-1', pre + d)
  else passe('MQ-1', `${pre}code 0, ${pages.length} page(s), accueil ${taille(path.join(sortie, 'index.html'))} o qui nomme l’entreprise et ${ex.ville}, modèle maquettes/modeles/${m}/`)

  // MQ-2 (premier métier : le refus n'a de sens que si la même commande fait une maquette)
  if (premier) {
    const e = essaisSortieInterdite(racine, jeu)
    const defauts = [...e.defauts, ...PUBLIC_MQ2]
    if (s.enEchec('MQ-1') || d1.length) defauts.unshift(`${pre}le refus ne prouve rien : la même commande, avec une sortie permise, ne produit pas de maquette (MQ-1) ; essais : ${e.faits.join(' ; ')}`)
    if (defauts.length) for (const d of defauts) echoue('MQ-2', d)
    else passe('MQ-2', `refus : ${e.faits.join(' ; ')} ; rien d’écrit sous public/, aucune cible créée`)
  } else if (PUBLIC_MQ2.length) for (const d of PUBLIC_MQ2) echoue('MQ-2', d)

  if (d1.length) {
    for (const id of ['MQ-3', 'MQ-4', 'MQ-5', 'MQ-6', 'MQ-7', 'MQ-8', 'MQ-11']) echoue(id, `${pre}pas de maquette à juger (MQ-1)`)
    return { sortie, ok: false }
  }

  // MQ-3 (statique)
  const d3 = []
  const phrase = norm(`Maquette privée préparée par Presti pour ${ex.entreprise}.`)
  for (const p of pages) {
    const robots = p.metas.filter((a) => /^(?:robots|googlebot)$/i.test(a.name || ''))
    if (!robots.some((a) => a.name.toLowerCase() === 'robots')) d3.push(`${p.rel} : aucune <meta name="robots"> dans l’en-tête interprété${p.metasHorsTete ? ` (${p.metasHorsTete} <meta> en commentaire, en script ou hors de <head>, que les moteurs ne lisent pas)` : ''}`)
    for (const a of robots) {
      const j = (a.content || '').toLowerCase().split(',').map((x) => x.trim()).filter(Boolean)
      if (!j.includes('noindex') || !j.includes('nofollow') || j.some((x) => ['index', 'follow', 'all'].includes(x))) d3.push(`${p.rel} : <meta name="${a.name}" content="${a.content}"> (noindex, nofollow attendu)`)
    }
    if (p.pied === null) d3.push(`${p.rel} : aucun <footer>`)
    else {
      const pied = norm(p.pied).replace(/\n/g, ' ')
      if (!pied.includes(phrase)) d3.push(`${p.rel} : le pied ne dit pas « Maquette privée préparée par Presti pour ‹entreprise›. » (lu : « ${court(pied, 90)} »)`)
      if (!/Rien n'est publié/.test(pied)) d3.push(`${p.rel} : le pied ne dit pas « Rien n’est publié »`)
    }
    if (/<form\b/i.test(p.corpsPropre) && !/Maquette ?: ?rien n'est envoyé/i.test(norm(p.texte).replace(/\n/g, ' '))) d3.push(`${p.rel} : un formulaire sans « Maquette : rien n’est envoyé »`)
  }

  // MQ-4 (statique)
  const d4 = []
  const admis = norm([ex.entreprise, ex.ville, ...ex.communes, ex.metier].join(' ')).toLowerCase()
  const motifs = [...MOTIFS_JUGE, ...fab.motifs.map((re) => [re, 'findFabrications']), ...cliches.motifs.map((re) => [re, 'formule de CLICHES'])]
  const hitsVus = new Set()
  const signaler = (ou, h) => { const cle = `${h.quoi}|${h.extrait.split(' dans ')[0]}`; if (hitsVus.has(cle)) return; hitsVus.add(cle); d4.push(`${ou} : ${h.quoi} ${h.extrait}`) }
  const examinerTexte = (ou, texte) => {
    const t = sansCredits(texte)
    for (const h of chercher(t, motifs, admis)) signaler(ou, h)
    const tChiffres = t.replace(/(?<=\d)[\s.\-]+(?=\d)/g, '')
    for (const f of fuites.fuites) {
      if (f.lieu && !f.v2 && f.metier !== m && f.demo !== m) continue
      const mm = f.re.exec(f.chiffres ? tChiffres : t)
      if (mm) signaler(ou, { quoi: `repris d’une démo (${f.quoi})`, extrait: `« ${court(mm[0], 60)} »` })
    }
  }
  for (const p of pages) {
    examinerTexte(p.rel, `${p.titre}\n${p.description}\n${p.texte}`)
    for (const tel of p.corps.matchAll(/href\s*=\s*["']?\s*tel:([^"'\s>]*)/gi)) if (tel[1].replace(/\D/g, '').length >= 6) signaler(p.rel, { quoi: 'lien tel: (maquette.json n’a pas de téléphone)', extrait: `« tel:${court(tel[1], 30)} »` })
    for (const b of p.corpsPropre.matchAll(/<blockquote\b[^>]*>([\s\S]*?)<\/blockquote\s*>/gi)) {
      const reste = texteHtml(b[1]).replace(MARQUE_G, ' ').replace(/[^\p{L}\p{N}]+/gu, '')
      if (reste) d4.push(`${p.rel} : <blockquote> rempli « ${court(texteHtml(b[1]), 80)} » (seule la marque « À compléter avec vous » y est admise)`)
    }
    for (const q of p.corpsPropre.matchAll(/<q\b[^>]*>([\s\S]*?)<\/q\s*>/gi)) if (texteHtml(q[1]).replace(/[^\p{L}\p{N}]+/gu, '')) d4.push(`${p.rel} : citation <q> « ${court(texteHtml(q[1]), 80)} »`)
    const brut = norm(decoder(p.html))
    const sf = ex.source_fait
    if (brut.includes(norm(sf.repere)) || brut.includes(norm(sf.fait))) d4.push(`${p.rel} : le fait sourcé du jeu d’essai (jamais affiché) est dans le HTML`)
  }
  // le texte écrit par les feuilles de styles (content: des ::before / ::after, chaînes et attr()) : absent du DOM et de
  // innerText, mais affiché ; examiné comme le texte des pages (feuilles .css de la sortie et blocs <style>)
  const feuilles = [...listerFichiers(sortie)].filter((f) => /\.css$/i.test(f)).map((f) => [f, fs.readFileSync(path.join(sortie, f), 'utf8')])
  for (const p of pages) for (const m of sansCommentairesHtml(p.html).matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)) feuilles.push([`${p.rel} <style>`, m[1]])
  let textesCss = 0
  for (const [ou, css] of feuilles) {
    const textes = textesDeContent(css, pages)
    textesCss += textes.length
    if (textes.length) examinerTexte(`${ou} (content: CSS)`, textes.join('\n'))
  }

  // MQ-5 (statique)
  const d5 = [], faits5 = []
  const fichiers = [...listerFichiers(sortie)]
  const images = fichiers.filter((f) => IMAGE.test(f) && !CAPTURES_MQ8.includes(f))
  if (!images.length) d5.push('aucune image dans la sortie (des photos d’illustration du métier sont attendues)')
  const declarees = new Map(), parNom = new Map()
  const fichiersAttr = fichiers.filter((f) => /attributions?[^/]*\.json$/i.test(path.posix.basename(f)))
  if (images.length && !fichiersAttr.length) d5.push('aucun fichier d’attributions (…attributions….json) dans la sortie')
  for (const fa of fichiersAttr) {
    let liste
    try { liste = lireJson(path.join(sortie, fa)) } catch (e) { d5.push(`${fa} illisible : ${premiereLigne(e)}`); continue }
    if (!Array.isArray(liste)) liste = Object.values(liste || {}).find(Array.isArray) || []
    for (const a of liste) {
      if (!a || typeof a.fichier !== 'string') continue
      const rel = path.posix.normalize(path.posix.join(path.posix.dirname(fa), a.fichier.replace(/\\/g, '/')))
      declarees.set(rel, a)
      const nom = path.posix.basename(rel)
      parNom.set(nom, [...(parNom.get(nom) || []), a])
    }
  }
  const attributionDe = (img) => declarees.get(img) || ((parNom.get(path.posix.basename(img)) || []).length === 1 ? parNom.get(path.posix.basename(img))[0] : null)
  const provenances = new Map()
  for (const img of images) {
    const a = attributionDe(img)
    if (!a) { d5.push(`${img} : aucune entrée dans un fichier d’attributions`); continue }
    for (const k of ['auteur', 'licence']) if (typeof a[k] !== 'string' || !a[k].trim()) d5.push(`${img} : ${k} vide ou absent dans les attributions`)
    const src = index.source(path.join(sortie, img))
    if (!src) { d5.push(`${img} : ne vient d’aucune photo des démos du dépôt (public/sites-demo/*/images/, octet pour octet)`); continue }
    const demo = index.demos.get(src.demo)
    provenances.set(img, { ...src, metier: demo.metier })
    if (demo.metier !== m && src.demo !== m) d5.push(`${img} : photo de ${src.demo} (${demo.metier}), pas du métier ${m}`)
    const ref = demo.attr.get(src.nom)
    if (!ref) d5.push(`${img} : ${src.demo}/images/${src.nom} n’a pas d’attribution dans sa démo`)
    else {
      for (const k of ['auteur', 'licence']) if (String(ref[k] || '').trim() !== String(a[k] || '').trim()) d5.push(`${img} : ${k} « ${court(a[k], 40)} » ≠ « ${court(ref[k], 40)} » dans ${src.demo}/attributions.json`)
      if (/^oui\b/i.test(String(ref.modifiee || '').trim())) provenances.get(img).modifiee = true
    }
  }
  // les images de chaque page, et sa ligne de crédits
  // url() : seulement les chemins d'images (les polices et le reste des feuilles ne sont pas des photos ; une ressource hors de
  // la sortie, quelle qu'elle soit, est prise par MQ-7)
  const urlsImages = (texte, depuis) => [...texte.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi)].map((u) => decoder(u[2]).trim()).filter((u) => IMAGE.test(u.split(/[?#]/)[0])).map((url) => ({ depuis, url }))
  const cssRefs = fichiers.filter((x) => /\.css$/i.test(x)).flatMap((f) => urlsImages(fs.readFileSync(path.join(sortie, f), 'utf8'), f))
  let creditsAccueil = null // auteurs et licences des photos de l'accueil, cherchés ensuite dans le texte rendu
  const cible = (depuis, u) => { const c = decodeURIComponent(u.split(/[?#]/)[0]); return c.startsWith('/') ? path.posix.normalize(c.slice(1)) : path.posix.normalize(path.posix.join(path.posix.dirname(depuis), c)) }
  for (const p of pages) {
    const refs = []
    for (const b of p.corps.matchAll(/<(?:img|source)\b[^>]*>/gi)) {
      const a = attributs(b[0])
      if (a.src) refs.push({ depuis: p.rel, url: a.src })
      for (const k of ['srcset', 'data-srcset', 'data-src']) if (a[k]) for (const part of a[k].split(',')) { const u = part.trim().split(/\s+/)[0]; if (u) refs.push({ depuis: p.rel, url: u }) }
    }
    refs.push(...urlsImages(p.html, p.rel))
    for (const l of p.html.matchAll(/<link\b[^>]*>/gi)) {
      const a = attributs(l[0])
      if (!/stylesheet/i.test(a.rel || '') || !a.href || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(a.href)) continue
      const feuille = cible(p.rel, a.href)
      for (const c of cssRefs) if (c.depuis === feuille) refs.push(c)
    }
    const montrees = new Set()
    for (const r of refs) {
      const u = r.url.trim()
      if (!u || /^(?:data:|#|blob:)/i.test(u)) continue
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(u)) { d5.push(`${p.rel} : image hors de la sortie « ${court(u, 70)} »`); continue }
      let rel
      try { rel = cible(r.depuis, u) } catch { d5.push(`${p.rel} : adresse d’image illisible « ${court(u, 70)} »`); continue }
      if (!fichiers.includes(rel)) { d5.push(`${p.rel} : image manquante ${rel} (demandée par ${r.depuis})`); continue }
      if (IMAGE.test(rel)) montrees.add(rel)
    }
    if (!montrees.size) { if (p.rel === 'index.html' && images.length) d5.push('index.html ne montre aucune des images de la sortie'); continue }
    const pied = p.pied === null ? '' : norm(p.pied).replace(/\n/g, ' ')
    const k = pied.search(/Photos d'illustration/i)
    if (k < 0) { d5.push(`${p.rel} : montre ${montrees.size} photo(s) et son pied n’a pas la ligne « Photos d’illustration : auteurs (licences) »`); continue }
    const credits = pied.slice(k)
    const auteurs = new Set(), licences = new Set()
    let modifiee = false
    for (const img of montrees) { const a = attributionDe(img); if (a) { if (a.auteur) auteurs.add(norm(a.auteur).trim()); if (a.licence) licences.add(norm(a.licence).trim()) } if (provenances.get(img)?.modifiee) modifiee = true }
    for (const x of auteurs) if (!credits.includes(x)) d5.push(`${p.rel} : l’auteur « ${x} » manque à la ligne de crédits du pied`)
    for (const x of licences) if (!credits.includes(x)) d5.push(`${p.rel} : la licence « ${x} » manque à la ligne de crédits du pied`)
    if (modifiee && !/modifi[ée]e/i.test(credits)) d5.push(`${p.rel} : une photo est déclarée modifiée dans sa démo et la ligne de crédits ne dit pas « modifiée »`)
    if (p.rel === 'index.html') creditsAccueil = { auteurs: [...auteurs], licences: [...licences] }
    faits5.push(`${p.rel} : ${montrees.size} image(s), ${auteurs.size} auteur(s) et ${licences.size} licence(s) au pied`)
  }

  // Rendu : MQ-7, MQ-3 et MQ-4 visibles, MQ-5 (requêtes)
  const d7 = [], faits7 = []
  const rendu = await examinerRendu(nav, sortie, m)
  const vb = rendu.vues.find((v) => v.nom === 'bureau')
  // casse ignorée : innerText applique text-transform
  const texteVu = norm(vb.texte).replace(/\n/g, ' ').toLowerCase()
  if (!texteVu.includes(norm(`Maquette privée préparée par Presti pour ${ex.entreprise}`).toLowerCase())) d3.push('index.html : la phrase du pied n’est pas dans le texte rendu au bureau (cachée ?)')
  if (!/rien n'est publié/.test(texteVu)) d3.push('index.html : « Rien n’est publié » n’est pas dans le texte rendu au bureau (caché ?)')
  // ce que lit un moteur : les <meta> de document.head après interprétation (une meta en commentaire, en script ou dans le corps n'y est pas)
  if (!(vb.robots || []).some((a) => /^robots$/i.test(a.name))) d3.push('index.html rendu : aucune <meta name="robots"> dans document.head (ce que lisent les moteurs)')
  for (const a of vb.robots || []) {
    const j = a.content.toLowerCase().split(',').map((x) => x.trim()).filter(Boolean)
    if (!j.includes('noindex') || !j.includes('nofollow') || j.some((x) => ['index', 'follow', 'all'].includes(x))) d3.push(`index.html rendu : <meta name="${a.name}" content="${a.content}"> dans document.head (noindex, nofollow attendu)`)
  }
  // les crédits des photos de l'accueil, visibles (texte rendu au bureau), pas seulement écrits dans le pied
  if (creditsAccueil) {
    if (!/photos d'illustration/.test(texteVu)) d5.push('index.html : la ligne « Photos d’illustration » n’est pas dans le texte rendu au bureau (cachée ?)')
    for (const x of [...creditsAccueil.auteurs, ...creditsAccueil.licences]) if (!texteVu.includes(x.toLowerCase())) d5.push(`index.html : « ${x} » n’est pas dans le texte rendu au bureau (crédit caché ?)`)
  }
  for (const v of rendu.vues) {
    const taillesAttendues = v.nom === 'bureau' ? '1440×900' : '390×844'
    if (v.statut !== 200) d7.push(`${v.nom} : l’accueil répond ${v.statut}`)
    if (!v.capture.ok) d7.push(`capture ${v.nom} (${taillesAttendues}) : ${v.capture.raisons.join(', ')}`)
    for (const x of v.manques.slice(0, 4)) d7.push(`${v.nom} : ressource ${x}`)
    if (v.externes.length) {
      d7.push(`${v.nom} : ${v.externes.length} requête(s) hors de 127.0.0.1, bloquée(s) : ${v.externes.slice(0, 3).map((x) => `${x.type} ${x.url}`).join(', ')}`)
      for (const x of v.externes.filter((e) => e.type === 'image')) d5.push(`${v.nom} : image demandée hors de la sortie ${x.url}`)
    }
    if (v.nom === 'telephone' && (v.defilement > 0 || v.essaiDefilement.x > 0 || v.essaiDefilement.largeur !== 390)) d7.push(`390 px : défilement horizontal (${v.defilement} px de trop, scrollX ${v.essaiDefilement.x} après scrollTo(99999), innerWidth ${v.essaiDefilement.largeur})`)
    faits7.push(`${v.nom} ${v.capture.largeur}×${v.capture.hauteur} ${Math.round(v.capture.octets / 1000)} ko, écart-type ${v.capture.ecartType.toFixed(1)}, défilement horizontal ${v.defilement} px → ${relR(v.capture.fichier)}`)
    // MQ-4 au rendu
    examinerTexte(`index.html (${v.nom}, texte visible)`, v.texte)
    if ((v.pseudo || []).length) examinerTexte(`index.html (${v.nom}, texte des ::before / ::after)`, v.pseudo.join('\n'))
    const visibles = v.zones.filter((z) => z.visible)
    if (visibles.length < ZONES_MIN) d4.push(`${v.nom} : ${visibles.length} zone(s) « À compléter avec vous » visible(s) sur ${v.zones.length} marquée(s), ${ZONES_MIN} attendues (trois chiffres, la phrase signée, le parcours)${v.zones.filter((z) => !z.visible).slice(0, 2).map((z) => ` ; ${z.balise || '?'} : ${z.raison}`).join('')}`)
    for (const c of v.chiffres.slice(0, 3)) d4.push(`${v.nom} : chiffre dans le bloc des zones ${c}`)
  }

  // MQ-8
  const d8 = [], faits8 = []
  const CAP = path.join(racine, 'scripts', 'maquette-capturer.mjs')
  if (!fichierNonVide(CAP)) d8.push('scripts/maquette-capturer.mjs absent ou vide')
  else {
    for (const f of CAPTURES_MQ8) fs.rmSync(path.join(sortie, f), { force: true })
    const avant = instantanePublic(racine)
    const r = lancer(process.execPath, [CAP, sortie], { cwd: racine, timeout: 240_000 })
    const ecrit = ecritsSous(avant, instantanePublic(racine))
    if (ecrit) d8.push(`le capteur a écrit sous public/ : ${ecrit}`)
    if (r.code !== 0) d8.push(`maquette-capturer.mjs ${relR(sortie)} : ${codeDe(r)}${messageDe(r) ? ` « ${court(messageDe(r), 100)} »` : ''}`)
    for (const [f, l, h, echelles] of [['capture-bureau.jpg', 1440, 900, [1, 2]], ['capture-telephone.jpg', 390, 844, [1, 2, 3]]]) {
      const v = await verifierImage(path.join(sortie, f), { maxOctets: MAX_CAPTURE, format: 'jpeg' })
      const bonneTaille = echelles.some((k) => v.largeur === l * k && v.hauteur === h * k)
      if (!v.ok) d8.push(`${f} : ${v.raisons.join(', ')}`)
      else if (!bonneTaille) d8.push(`${f} : ${v.largeur}×${v.hauteur} px, ${l}×${h} attendu (× ${echelles.join(', ')}) : le haut de l’accueil, pas la page entière`)
      else faits8.push(`${f} ${v.largeur}×${v.hauteur} ${Math.round(v.octets / 1000)} ko, écart-type ${v.ecartType.toFixed(1)}`)
    }
    if (premier) {
      const vide = dossierTravail(JUGE, 'capturer-vide')
      fs.writeFileSync(path.join(vide, 'index.html'), '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="robots" content="noindex, nofollow"><title>Page unie</title></head><body style="margin:0;background:#f4ede2"></body></html>\n')
      const rv = lancer(process.execPath, [CAP, vide], { cwd: racine, timeout: 240_000 })
      if (rv.code === 0 || rv.code === null) d8.push(`sur une page unie (${relR(vide)}), le capteur sort en ${codeDe(rv)} : une capture vide doit le faire échouer (code 1, 025-02 §7)`)
      else faits8.push(`page unie refusée (${codeDe(rv)})`)
    }
  }

  // MQ-11 (après MQ-8 : les captures du capteur)
  let r11
  try { r11 = await mq11({ sortie, nav, m, attributionDe }) } catch (e) { r11 = { d: [`interrompu : ${premiereLigne(e)}`], faits: [] } }

  // MQ-6 (après MQ-8 : le dossier complet)
  const p6 = poids(sortie)
  const d6 = []
  if (p6 <= 0) d6.push('dossier de sortie vide')
  if (p6 > MAX_DOSSIER) {
    const gros = [...listerFichiers(sortie)].map((f) => [f, taille(path.join(sortie, f))]).sort((a, b) => b[1] - a[1]).slice(0, 3)
    d6.push(`${p6} octets (${mo(p6)}), 3 Mo (3 000 000 octets) au plus ; les plus lourds : ${gros.map(([f, t]) => `${f} ${mo(t)}`).join(', ')}`)
  }

  // verdicts du métier
  const rendre = (id, defauts, resume) => { if (defauts.length) for (const d of defauts) echoue(id, pre + d); else passe(id, pre + resume) }
  rendre('MQ-3', d3, `${pages.length} page(s) en noindex, nofollow ; pied « Maquette privée préparée par Presti pour ‹entreprise›. Rien n’est publié. » présent et rendu${pages.some((p) => /<form\b/i.test(p.corpsPropre)) ? ' ; formulaire « Maquette : rien n’est envoyé »' : ''} ; au rendu, <meta robots> noindex, nofollow dans document.head et pied lu dans innerText`)
  rendre('MQ-4', d4, `aucun motif (${MOTIFS_JUGE.length} du juge, findFabrications ${fab.origine}, CLICHES ${cliches.origine}), rien de repris de ${fuites.demos} démo(s), aucun lien tel:, fait sourcé absent, aucun blockquote rempli ; autres graphies repliées (invisibles, NFKC, cyrillique et grec), texte des feuilles de styles (${textesCss} content:) et des ::before / ::after rendus examinés ; zones visibles ${rendu.vues.map((v) => `${v.nom} ${v.zones.filter((z) => z.visible).length}`).join(', ')}, sans chiffre autour`)
  rendre('MQ-5', d5, `${images.length} image(s), chacune attribuée et identique à une photo de ${[...new Set([...provenances.values()].map((x) => x.demo))].join(', ')} (métier ${m}) avec le même auteur et la même licence ; ${faits5.join(' ; ')}`)
  rendre('MQ-6', d6, `${p6} octets (${mo(p6)}) avec les captures de MQ-8, 3 Mo au plus`)
  rendre('MQ-7', d7, faits7.join(' ; '))
  rendre('MQ-8', d8, faits8.join(' ; '))
  rendre('MQ-11', r11.d, r11.faits.join(' ; '))
  return { sortie, ok: true }
}

// ── MQ-11 : le crédit de chaque photo visible, dans le haut capturé ──────────────────────────────────────────────────────
/** Dans la page : les photos qui occupent au moins 2 % du haut visible (img, image de fond) → [{ chemin, surface }] */
const PHOTOS_DU_HAUT = () => {
  const W = innerWidth, H = innerHeight, out = []
  const inter = (r) => Math.max(0, Math.min(r.right, W) - Math.max(r.left, 0)) * Math.max(0, Math.min(r.bottom, H) - Math.max(r.top, 0))
  const opac = (el) => { let o = 1; for (let e = el; e && e.nodeType === 1; e = e.parentElement) o *= parseFloat(getComputedStyle(e).opacity || '1'); return o }
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el)
    const urls = []
    if (el.tagName === 'IMG' && (el.currentSrc || el.src)) urls.push(el.currentSrc || el.src)
    if (cs.backgroundImage && cs.backgroundImage !== 'none') for (const m of cs.backgroundImage.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) urls.push(new URL(m[1], location.href).href)
    if (!urls.length) continue
    const s = inter(el.getBoundingClientRect())
    if (s < 0.02 * W * H || cs.visibility !== 'visible' || opac(el) < 0.1) continue
    for (const u of urls) { try { out.push({ chemin: decodeURIComponent(new URL(u).pathname), surface: Math.round(s) }) } catch { /* data: */ } }
  }
  return out
}
/** Dans la page : pour chaque texte cherché, l'élément le plus profond qui le porte, lisible dans le haut ? Marque les trouvés
 *  (data-mq11-credit). → [{ cle, ok, raison, boite }] */
const CREDITS_DU_HAUT = (besoins) => {
  const norm = (t) => String(t || '').normalize('NFKC').replace(/[   ]/g, ' ').replace(/[’‘ʼ]/g, "'").replace(/\s+/g, ' ').toLowerCase()
  const W = innerWidth, H = innerHeight
  const res = []
  for (const b of besoins) {
    const cible = norm(b.texte)
    const tous = [...document.body.querySelectorAll('*')].filter((el) => !['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT'].includes(el.tagName) && norm(el.innerText).includes(cible))
    const feuilles = tous.filter((el) => ![...el.children].some((c) => norm(c.innerText).includes(cible)))
    let trouve = null
    for (const el of feuilles) {
      const r = el.getBoundingClientRect()
      const r0 = el.getClientRects()[0] || r
      const dedans = r.width >= 1 && r.height >= 1 && r.left >= -1 && r.top >= -1 && r.right <= W + 1 && r.bottom <= H + 1
      let op = 1
      for (let e = el; e && e.nodeType === 1; e = e.parentElement) op *= parseFloat(getComputedStyle(e).opacity || '1')
      const cs = getComputedStyle(el)
      const police = parseFloat(cs.fontSize) || 0
      const pe = el.style.getPropertyValue('pointer-events'), prio = el.style.getPropertyPriority('pointer-events')
      el.style.setProperty('pointer-events', 'auto', 'important')
      const hit = dedans ? document.elementFromPoint(r0.left + r0.width / 2, r0.top + r0.height / 2) : null
      if (pe) el.style.setProperty('pointer-events', pe, prio); else el.style.removeProperty('pointer-events')
      const dessus = !!hit && (hit === el || el.contains(hit))
      const raisons = []
      if (!dedans) raisons.push(`hors du haut capturé (boîte ${Math.round(r.top)}–${Math.round(r.bottom)} px, fenêtre ${H} px)`)
      else if (!dessus) raisons.push(`recouvert par ${hit ? hit.tagName.toLowerCase() : 'rien'}`)
      if (op < 0.9) raisons.push(`opacité ${op.toFixed(2)}`)
      if (cs.visibility !== 'visible') raisons.push(`visibility ${cs.visibility}`)
      if (police < 10) raisons.push(`police de ${police} px`)
      const balise = el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className.trim() ? `.${el.className.trim().split(/\s+/)[0]}` : '')
      if (!raisons.length) { el.setAttribute('data-mq11-credit', '1'); trouve = { ok: true, balise, boite: { x: r.left, y: r.top, l: r.width, h: r.height } }; break }
      if (!trouve) trouve = { ok: false, balise, raison: raisons.join(', ') }
    }
    res.push({ cle: b.cle, ...(trouve || { ok: false, raison: 'absent du texte de la page' }) })
  }
  return res
}
/** Écart moyen (0-255) entre deux images en gris de même taille, sur toute l'image ou dans une boîte { x, y, l, h } (pixels). */
function ecartMoyen(a, b, largeur, hauteur, boite = null) {
  const x0 = boite ? Math.max(0, Math.floor(boite.x)) : 0, y0 = boite ? Math.max(0, Math.floor(boite.y)) : 0
  const x1 = boite ? Math.min(largeur, Math.ceil(boite.x + boite.l)) : largeur, y1 = boite ? Math.min(hauteur, Math.ceil(boite.y + boite.h)) : hauteur
  let s = 0, n = 0
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { s += Math.abs(a[y * largeur + x] - b[y * largeur + x]); n++ }
  return n ? s / n : 0
}
async function grisDemi(fichier, largeur, hauteur) {
  const sharp = (await import('sharp')).default
  const { data } = await sharp(fichier).resize(largeur, hauteur, { fit: 'fill' }).removeAlpha().greyscale().raw().toBuffer({ resolveWithObject: true })
  return data
}
async function mq11({ sortie, nav, m, attributionDe }) {
  const d = [], faits = []
  const capteur = { bureau: path.join(sortie, 'capture-bureau.jpg'), telephone: path.join(sortie, 'capture-telephone.jpg') }
  for (const [nom, f] of Object.entries(capteur)) if (!fichierNonVide(f)) d.push(`${nom} : ${path.basename(f)} absente ou vide (le capteur de MQ-8 n’a rien écrit)`)
  if (d.length) return { d, faits }
  const dossierCaptures = exigerSousTravail(path.join(TRAVAIL, JUGE, 'captures'))
  fs.mkdirSync(dossierCaptures, { recursive: true })
  const srv = await servir(sortie)
  let prouve = false
  try {
    for (const [nom, opts] of [['bureau', BUREAU], ['telephone', TELEPHONE]]) {
      const ctx = await nav.newContext({ ...opts, reducedMotion: 'no-preference' })
      try {
        await ctx.route('**/*', (route) => { let h = ''; try { h = new URL(route.request().url()).hostname } catch { /* data: */ } return h === '127.0.0.1' || /^(?:data|blob):/i.test(route.request().url()) ? route.continue() : route.abort() })
        const page = await ctx.newPage()
        await page.goto(`${srv.base}/`, { waitUntil: 'load', timeout: 60_000 })
        await page.evaluate(() => (document.fonts ? document.fonts.ready.then(() => 1) : 1))
        await page.evaluate(() => window.scrollTo(0, 0))
        await page.waitForTimeout(1200)
        const vues = await page.evaluate(PHOTOS_DU_HAUT)
        const photos = new Map()
        for (const v of vues) {
          const rel = v.chemin.replace(/^\/+/, '')
          if (!IMAGE.test(rel) || photos.has(rel)) continue
          photos.set(rel, { surface: v.surface, a: attributionDe(rel) })
        }
        if (!photos.size) { d.push(`${nom} : aucune photo dans le haut de l’accueil (MQ-11 veut au moins la photo du haut, créditée)`); continue }
        const besoins = []
        for (const [rel, p] of photos) {
          if (!p.a) { d.push(`${nom} : ${rel} visible dans le haut, sans attribution dans la sortie`); continue }
          besoins.push({ cle: `${rel} → auteur « ${p.a.auteur} »`, texte: String(p.a.auteur || '').trim() }, { cle: `${rel} → licence « ${p.a.licence} »`, texte: String(p.a.licence || '').trim() })
          if (/^oui\b/i.test(String(p.a.modifiee || '').trim())) besoins.push({ cle: `${rel} → « modifiée »`, texte: 'modifi' })
        }
        const credits = besoins.length ? await page.evaluate(CREDITS_DU_HAUT, besoins.filter((b) => b.texte)) : []
        for (const c of credits.filter((x) => !x.ok)) d.push(`${nom} : ${c.cle} n’est pas lisible dans le haut capturé (${c.raison}${c.balise ? `, ${c.balise}` : ''})`)
        const boites = credits.filter((x) => x.ok).map((x) => x.boite)
        // la capture du juge, puis celle du capteur, comparées en gris à mi-échelle
        const vp = page.viewportSize()
        const L = Math.round(vp.width / 2), H = Math.round(vp.height / 2)
        const moi = await capturer(page, path.join(dossierCaptures, `${m}-mq11-${nom}.jpg`), { maxOctets: MAX_CAPTURE })
        if (!moi.ok) { d.push(`${nom} : capture du juge invalide (${moi.raisons.join(', ')})`); continue }
        const A = await grisDemi(capteur[nom], L, H), B = await grisDemi(moi.fichier, L, H)
        const global = ecartMoyen(A, B, L, H)
        if (global > 12) d.push(`${nom} : la capture du capteur diffère du haut de l’accueil vu par le juge (écart moyen ${global.toFixed(1)}, 12 au plus) — pleine page, autre page ou crédit incrusté hors de la page ?`)
        if (boites.length) {
          // mutation : les crédits cachés, le juge recapture ; sa recherche ne doit plus les trouver, et l'écart dans leurs boîtes doit se voir
          await page.evaluate(() => { for (const el of document.querySelectorAll('[data-mq11-credit]')) el.style.setProperty('visibility', 'hidden', 'important') })
          const apres = await page.evaluate(CREDITS_DU_HAUT, besoins.filter((b) => b.texte))
          if (apres.some((x) => x.ok)) d.push(`${nom} : détecteur aveugle — crédits cachés, la recherche les trouve encore (${apres.filter((x) => x.ok).map((x) => x.cle).join(', ')})`)
          const sans = await capturer(page, path.join(dossierCaptures, `${m}-mq11-${nom}-sans-credit.jpg`), { maxOctets: MAX_CAPTURE })
          const C = await grisDemi(sans.fichier, L, H)
          for (const [i, b] of boites.entries()) {
            const bb = { x: b.x / 2 - 1, y: b.y / 2 - 1, l: b.l / 2 + 2, h: b.h / 2 + 2 }
            const ok = ecartMoyen(A, B, L, H, bb), mut = ecartMoyen(C, B, L, H, bb)
            if (mut < 4) d.push(`${nom} : crédit ${i + 1} : le cacher ne change presque rien à l’image (écart ${mut.toFixed(1)}, 4 au moins) — texte illisible sur son fond ?`)
            else if (ok > mut / 2) d.push(`${nom} : crédit ${i + 1} (${credits.filter((x) => x.ok)[i]?.cle}) absent ou différent sur la capture du capteur (écart ${ok.toFixed(1)} dans sa boîte, ${(mut / 2).toFixed(1)} au plus ; crédit caché : ${mut.toFixed(1)})`)
            else faits.push(`${nom} crédit ${i + 1} : écart ${ok.toFixed(1)} (caché : ${mut.toFixed(1)})`)
          }
          prouve = prouve || !apres.some((x) => x.ok)
        }
        faits.unshift(`${nom} : ${photos.size} photo(s) dans le haut, ${credits.filter((x) => x.ok).length}/${credits.length} mention(s) de crédit lisibles dedans, capture du capteur à ${global.toFixed(1)} d’écart moyen de celle du juge`)
      } finally { await ctx.close() }
    }
  } finally { await srv.fermer() }
  if (!d.length && !prouve) d.push('mutation non jouée : aucun crédit trouvé à cacher')
  if (!d.length) faits.push('mutation : crédits cachés → recherche vide et écart mesuré dans leurs boîtes → vue')
  return { d, faits }
}

// ── MQ-10 : aucun libellé d'un autre métier ───────────────────────────────────────────────────────────────────────────────
/** Le texte qu'une page donne à lire (titre, description, corps sans crédits, alt / title / aria-label / placeholder, content: CSS). */
function texteLibelles(sortie) {
  const pages = lirePages(sortie)
  const morceaux = []
  for (const p of pages) {
    morceaux.push(p.titre, p.description, sansCredits(p.texte))
    for (const b of p.corpsPropre.matchAll(/<[a-z][^>]*>/gi)) {
      const a = attributs(b[0])
      for (const k of ['alt', 'title', 'aria-label', 'placeholder']) if (a[k]) morceaux.push(a[k])
    }
  }
  const feuilles = [...listerFichiers(sortie)].filter((f) => /\.css$/i.test(f)).map((f) => fs.readFileSync(path.join(sortie, f), 'utf8'))
  for (const p of pages) for (const x of sansCommentairesHtml(p.html).matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)) feuilles.push(x[1])
  for (const css of feuilles) morceaux.push(...textesDeContent(css, pages))
  return { pages: pages.length, texte: morceaux.filter(Boolean).join('\n') }
}
function mq10({ racine, ex, generes }) {
  const dico = motsDesMetiers(racine)
  const d = [], faits = []
  if (dico.illisibles.length) d.push(`modèle(s) illisible(s) (contenu.json) : ${dico.illisibles.join(', ')}`)
  const avecMots = dico.modeles.filter((m) => dico.propres.get(m).size)
  if (dico.modeles.length < 2) { d.push(`${dico.modeles.length} modèle(s) sous maquettes/modeles/ : il en faut deux au moins pour dire ce qui est propre à un métier`); return { d, faits } }
  if (avecMots.length < 2) d.push(`dictionnaire dégénéré : ${avecMots.length} modèle(s) ont des mots propres (${[...dico.propres].map(([m, x]) => `${m} ${x.size}`).join(', ')})`)
  const admis = [ex.entreprise, ex.ville, ...ex.communes].join(' ')
  const dJeux = dossierTravail(JUGE, 'mq10', 'jeux')
  let sonde = null
  for (const m of dico.modeles) {
    let sortie = generes.get(m)
    if (!sortie) {
      const jeu = path.join(dJeux, `${m}.json`)
      fs.writeFileSync(jeu, `${JSON.stringify({ ...ex, _: `Copie de scripts/fixtures/025/maquette-exemple.json par ${JUGE} (MQ-10) pour le modèle ${m}.`, metier: m, modele: m }, null, 1)}\n`)
      sortie = exigerSousTravail(path.join(TRAVAIL, JUGE, 'mq10', m))
      fs.rmSync(sortie, { recursive: true, force: true })
      const g = generer(racine, jeu, sortie)
      if (g.code !== 0 || !fichierNonVide(path.join(sortie, 'index.html'))) { d.push(`${m} : la maquette ne se génère pas (${codeDe(g)}${messageDe(g) ? ` « ${court(messageDe(g), 90)} »` : ''})`); continue }
    }
    const { pages, texte } = texteLibelles(sortie)
    const hits = motsEtrangers(texte, m, dico, admis)
    for (const h of hits) d.push(`${m} : « ${h.mot} » (propre au modèle ${h.modele}) dans « ${h.extrait} »`)
    faits.push(`${m} ${pages} page(s)${hits.length ? '' : ', rien d’un autre métier'}`)
    if (!sonde) {
      const autre = dico.modeles.find((x) => x !== m && dico.propres.get(x).size)
      if (autre) {
        const mot = [...dico.propres.get(autre)].sort((a, b) => b[1] - a[1])[0][0]
        sonde = { m, autre, mot, vu: motsEtrangers(`${texte}\nIllustration : ${mot}`, m, dico, admis).some((h) => h.modele === autre) }
      }
    }
  }
  if (!sonde) d.push('mutation non jouée : aucun mot propre à un autre modèle pour éprouver le détecteur')
  else if (!sonde.vu) d.push(`détecteur aveugle : « ${sonde.mot} » (propre à ${sonde.autre}) ajouté au texte de ${sonde.m} n’est pas vu`)
  const resume = `${dico.modeles.length} modèles, dictionnaire tiré d’eux (${[...dico.propres].map(([m, x]) => `${m} : ${[...x.keys()].join(', ') || '—'}`).join(' ; ')}) ; ${faits.join(', ')}${sonde?.vu ? ` ; mutation : « ${sonde.mot} » ajouté à ${sonde.m} → vu` : ''}`
  return { d, faits: [resume] }
}

// ── MQ-9 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function mq9(racine, ex) {
  const mots = ex.entreprise.split(/\s+/).filter((w) => w.length >= 8).sort((a, b) => b.length - a.length)
  const motifs = [...new Set([ex.entreprise, slugDe(ex.entreprise), ...(mots.length ? [mots[0], slugDe(mots[0])] : []), ex.source_fait.repere].filter((x) => x && x.length >= 6))]
  const args = (extra) => ['grep', ...extra, '-F', '-l', '-I', '-z', '-i', ...motifs.flatMap((x) => ['-e', x])]
  const garder = (sortie) => sortie.toString('utf8').split('\0').filter(Boolean).filter((f) => !EXCLUS_MQ9.some((p) => f === p || f.startsWith(`${p}/`)))
  const d = []
  let suivis = [], nonSuivis = []
  if (estRacineGit(racine)) {
    const r1 = git(args([]), { cwd: racine, binaire: true })
    if (r1.code !== 0 && r1.code !== 1) d.push(`git grep en erreur : ${court(r1.stderr)}`)
    suivis = garder(r1.stdout)
    const r2 = git(args(['--untracked']), { cwd: racine, binaire: true })
    if (r2.code !== 0 && r2.code !== 1) d.push(`git grep --untracked en erreur : ${court(r2.stderr)}`)
    nonSuivis = garder(r2.stdout).filter((f) => !suivis.includes(f))
  } else {
    // arbre extrait (non Git) : tous ses fichiers, en un seul git grep --no-index (comme gitGrepFichiers de commun.mjs, tous les
    // motifs d'un coup)
    const r = git(args(['--no-index']), { cwd: racine, binaire: true })
    if (r.code !== 0 && r.code !== 1) d.push(`git grep --no-index en erreur : ${court(r.stderr)}`)
    suivis = garder(r.stdout)
  }
  if (suivis.length) d.push(`${suivis.length} fichier(s) suivi(s) : ${suivis.slice(0, 4).join(', ')}`)
  if (nonSuivis.length) d.push(`${nonSuivis.length} fichier(s) non suivi(s) et non ignoré(s), qui partiraient au prochain commit : ${nonSuivis.slice(0, 4).join(', ')}`)
  if (d.length) for (const x of d) echoue('MQ-9', `le nom fictif, son slug ou le repère du fait sourcé : ${x}`)
  else passe('MQ-9', `${motifs.length} motifs (nom, slug, mot distinctif, repère ; -F -i) absents des fichiers ${estRacineGit(racine) ? 'suivis et non suivis non ignorés' : 'de l’arbre (--no-index)'}, hors ${EXCLUS_MQ9.map((p) => `${p}/`).join(' et ')}`)
}

// ── Le témoin ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
function construireTemoin(base) {
  const dirModeles = path.join(TEMOIN_SOURCE, 'maquettes', 'modeles')
  const modeles = fs.readdirSync(dirModeles, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort()
  if (!modeles.includes('menuisier') || modeles.length < 2) throw new Error(`${relR(dirModeles)} : le modèle menuisier et un autre au moins attendus (MQ-10)`)
  const copier = new Set()
  for (const nom of modeles) {
    const modele = lireJson(path.join(dirModeles, nom, 'contenu.json'))
    const demo = modele?.photos?.demo
    const photos = modele?.photos?.fichiers
    if (typeof demo !== 'string' || !/^[a-z0-9-]+$/.test(demo) || !Array.isArray(photos) || !photos.length || photos.some((f) => typeof f !== 'string' || !/^[a-z0-9.-]+$/.test(f))) throw new Error(`${relR(dirModeles)}/${nom}/contenu.json : photos { demo, fichiers[] } attendu`)
    copier.add(`public/sites-demo/${demo}/attributions.json`)
    for (const f of photos) copier.add(`public/sites-demo/${demo}/images/${f}`)
  }
  const dir = path.join(base, 'public', 'sites-demo')
  const siteJson = fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory() && fs.existsSync(path.join(dir, e.name, 'site.json'))).map((e) => `public/sites-demo/${e.name}/site.json`)
  const liste = [...siteJson, ...copier]
  return { arbre: preparerTemoin(JUGE, { base, copier: liste }), copies: liste.length, demos: siteJson.length, modeles }
}

// ── Déroulé ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
await s.executer(async () => {
  const ex = lireMaquetteExemple()
  const mot = ex.entreprise.split(/\s+/).filter((w) => w.length >= 8).sort((a, b) => b.length - a.length)[0]
  MASQUES = [[ex.entreprise, '‹entreprise›'], [slugDe(ex.entreprise), '‹slug›'], ...(mot ? [[mot, '‹mot›'], [slugDe(mot), '‹mot›']] : []), [ex.source_fait.repere, '‹repère›']]
  const racineNR = o.racine
  const metiers = metierDonne ? o.liste('metier') : [ex.metier]
  if (!metiers.length || metiers.some((m) => RESERVES.has(m))) throw new Error(`métier du jeu d’essai invalide : ${ex.metier}`)

  // MQ-9 d'abord (rapide), sur la racine
  mq9(racineNR, ex)

  // la racine des critères MQ-1 à MQ-8
  let racine = racineNR
  if (o.temoin) {
    const t = construireTemoin(racineNR)
    racine = t.arbre
    note(`témoin : MQ-1 à MQ-8, MQ-10 et MQ-11 jugés sur ${relR(racine)} (${t.copies} fichiers copiés depuis la racine, dont ${t.demos} site.json de démos, puis ${relR(TEMOIN_SOURCE)}/ superposé : modèles ${t.modeles.join(', ')}) ; T1, T2 et MQ-9 sur la racine`)
  }

  // les jeux d'essai par métier
  const jeux = new Map()
  const autres = metiers.filter((m) => !(m === ex.metier && m === ex.modele))
  const dJeux = autres.length ? dossierTravail(JUGE, 'jeux') : null
  for (const m of metiers) {
    if (!autres.includes(m)) { jeux.set(m, MAQUETTE_EXEMPLE); continue }
    const f = path.join(dJeux, `${m}.json`)
    fs.writeFileSync(f, `${JSON.stringify({ ...ex, _: `Copie de scripts/fixtures/025/maquette-exemple.json par ${JUGE} pour le métier ${m}.`, metier: m, modele: m }, null, 1)}\n`)
    jeux.set(m, f)
  }

  const fab = motifsFindFabrications(racine)
  const cliches = motifsCliches(racine)
  const fuites = fuitesDesDemos(racine, ex)
  const index = indexPhotos(racine)
  note(`findFabrications : ${fab.origine} ; CLICHES : ${cliches.origine} ; ${fuites.fuites.length} chaînes propres à ${fuites.demos} démo(s)`)

  const nav = await lancerNavigateur('chromium')
  const generes = new Map() // MQ-10 reprend les maquettes déjà générées par MQ-1
  try {
    let premier = true
    for (const m of metiers) {
      try {
        const r = await jugerMetier({ m, jeu: jeux.get(m), racine, ex, premier, nav, index, fab, cliches, fuites })
        if (r?.ok) generes.set(m, r.sortie)
      } catch (e) {
        for (const id of [...PAR_METIER, ...(premier ? ['MQ-2'] : [])]) echoue(id, `${m} : interrompu : ${premiereLigne(e)}`)
      }
      premier = false
    }
  } finally { await nav.close().catch(() => {}) }

  // MQ-10, sur tous les modèles de la racine jugée
  try {
    const r10 = mq10({ racine, ex, generes })
    if (r10.d.length) for (const x of r10.d) echoue('MQ-10', x); else passe('MQ-10', r10.faits.join(' ; '))
  } catch (e) { echoue('MQ-10', `libellés des métiers : interrompu : ${premiereLigne(e)}`) }

  // non-régression, après les générations
  const r1 = t1({ juge: JUGE, racine: racineNR })
  s.resultat('T1', { ...r1, echecs: r1.echecs.map(masquer) })
  for (const f of r1.faits) note(`T1 : ${f}`)
  const r2 = t2({ racine: racineNR })
  s.resultat('T2', { ...r2, echecs: r2.echecs.map(masquer) })
  for (const f of r2.faits) note(`T2 : ${f}`)
})
