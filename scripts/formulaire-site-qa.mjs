// scripts/formulaire-site-qa.mjs — le juge de la fiche 025-03 (le formulaire réel des sites générés par --source), écrit par
// Claude Code (fiche 025-01, point 5). Les verdicts sont à lui : un exécutant ne le modifie pas (CLAUDE.md:23).
//
// Usage :
//   node scripts/formulaire-site-qa.mjs                     FS-1 à FS-12, T1 et T2 sur le dépôt
//   node scripts/formulaire-site-qa.mjs --racine=<dossier>  la même chose, tout lu et généré depuis <dossier> (l'arbre de
//                                                           référence .orchestre/travail/025-01/reference/, par exemple)
//   node scripts/formulaire-site-qa.mjs --temoin            T1 et T2 sur la racine ; FS-1 à FS-11 sur le témoin « après »
//   node scripts/formulaire-site-qa.mjs --reel              la production (Claude Code seulement, après déploiement ; seul)
//   … --critere=FS-6,FS-11                                  ne juge que ces critères (les autres ne sont ni déclarés ni
//                                                           imprimés, et le travail qu'ils demandent est sauté) : les fiches
//                                                           025-14 (tout sauf FS-11) et 025-17 (FS-6, FS-11) sont jugées
//                                                           chacune sur sa part ; le verdict entier reste celui sans --critere.
// Sortie : une ligne « PASS <id> — … » ou « FAIL <id> — … » par critère, puis « formulaire-site-qa : PASS » ou
// « formulaire-site-qa : FAIL — ids » ; code 0 seulement si tout est vert, 1 sinon, 2 si les options sont invalides.
// Écrit seulement sous .orchestre/travail/formulaire-site-qa/ (site/, site-sans-chiffres/, commande-sans-chiffres/, captures/,
// lestraque/ pour T1, temoin/ et reel/). Aucun site n'est généré en place.
//
// Critères (fiche 025-01 §5) :
//   FS-1 `<racine>/public/sites-demo/generer.mjs --source=<dépôt>/scripts/fixtures/025/commande-exemple
//        --sortie=.orchestre/travail/formulaire-site-qa/site` (cwd <racine>) sort en code 0 ; et la sortie a de la substance :
//        index.html non vide, avec un <form> et le nom de la commande dans son texte ; le dossier source (contenu, octet pour
//        octet) et <racine>/public/ (taille et date de chaque fichier) sont intacts après la génération.
//   FS-2 aucun <form> des pages générées ne porte data-demo, aucune page ne dit « Démonstration : rien… / aucune donnée… » ;
//        chaque formulaire de devis (qui a un champ contact) a un champ piège name="website" ; dans le navigateur (Chromium
//        1440×900 et WebKit 390×844 tactile), le piège est un champ de saisie (pas type=hidden), vide au chargement,
//        tabindex="-1", rendu mais hors écran (sa boîte est entièrement hors de [0, largeur du document] × [0, hauteur du
//        document]) ; son étiquette éventuelle est invisible aussi.
//   FS-3 contre un /api/leads simulé par le juge : le formulaire rempli par le juge (projet et commune choisis hors de la
//        première option, un texte repère, un numéro de la plage de fiction 02 61 91) envoie UNE requête POST, en
//        application/json, dont le corps est un objet {slug, contact, nom_prospect, message, website} : slug = celui de
//        commande.json, contact = le numéro saisi, nom_prospect = le nom saisi s'il y a un champ nom (sinon null ou ""),
//        message contient le projet, la commune et le texte repère, website = "". Toute autre clé doit être lue par la route
//        (photos, variant, deferContact — et deferContact n'est jamais true). Vérifié à chacun des dix envois de FS-4.
//   FS-4 cinq réponses du /api/leads simulé, dans Chromium 1440×900 et WebKit 390×844 : 200 (le corps de production,
//        route.ts:169) → l'état « demande reçue » est visible, le repli ne l'est pas ; 404, 410, 500 et coupure réseau (socket
//        détruit sans réponse) → le repli est visible et « demande reçue » ne l'est pas. Le repli = au moins un lien tel: (le
//        téléphone de site.json) et un lien mailto: (son e-mail) qui n'étaient pas visibles avant l'envoi, visibles après, et
//        leur plus petit ancêtre commun (hauteur ≤ 1,5 écran), visible lui aussi. « Visible » = rendu, visibility:visible,
//        opacité effective ≥ 0,9, de taille non nulle, et document.elementFromPoint en son centre, une fois amené au centre de
//        l'écran, rend l'élément ou l'un de ses descendants (attente de 5 s au plus, relevé toutes les 150 ms, pour les
//        transitions). Une capture de l'écran est prise à chaque issue et doit être valable (JPEG non vide, non uniforme).
//   FS-5 la variante chiffres: null (commande-sans-chiffres.json, copiée par preparerCommande) génère en code 0 un accueil dont
//        le plateau — la section qui contient le <blockquote> de la citation — montre la citation (visible) et la signature
//        « prénom nom », sans aucun chiffre : ni <dl>, ni élément de classe *chiffre*, ni légende des chiffres de la variante
//        complète dans la page, ni aucun caractère 0-9 dans le texte du plateau une fois l'année d'installation retirée ;
//        contrôle du détecteur : le plateau du site complet (FS-1) montre bien ses trois légendes.
//   FS-6 lecture statique de <racine>/app/api/leads/route.ts (arbre syntaxique de TypeScript, commentaires ignorés) :
//        artisanParAncienSlug importée de lib/slugRedirect (qui l'exporte toujours) et appelée dans le corps de POST (pas dans
//        une fonction imbriquée, où l'ordre de lecture ne dit plus l'ordre d'exécution), après l'instruction
//        de la recherche par slug (.from('artisans')….eq('slug', …)), sous une garde qui teste l'absence de son résultat (if
//        (!artisan), artisan == null, ?? ou ||), avant le premier { status: 404 } qui suit ; elle reçoit le slug de la requête
//        (le second argument de .eq('slug', …)) ; son résultat est gardé (const x = await …, x = await …, déstructuration) et
//        une nouvelle recherche (.from / .eq / .rpc / .in / .match…) le lit dans ses arguments avant ce 404 — ou l'appel est lui-même
//        dans les arguments de cette recherche : un appel au résultat jeté, suivi d'une recherche quelconque, ne retrouve rien
//        (relecture du 24/09) ; isBanned( et le test du piège website restent avant la recherche.
//   FS-7 les médias du site généré (avif, webp, jpg, png, gif, mp4, webm…) sont tous, octet pour octet, des fichiers de
//        <source>/photos/ ; au moins trois photos du dossier source (trois bases), dont une référencée par index.html ; aucune
//        image référencée par une page ou une feuille de styles n'est absente de la sortie ni prise hors d'elle (http…).
//   FS-8 (relecture à froid du 24/09, G4) le site de FS-1 (commande sans domaine) porte l'adresse de lib/urls.ts partout :
//        BASE_PRESTI (lu dans <racine>/lib/urls.ts) préfixe chaque canonique (depuis le 25/09, D21, le domaine seulement : le
//        chemin — /site-genere/<id>, pas /site/<slug> — est jugé par GV-5 de scripts/generateur-vente-qa.mjs),
//        og:url, og:image, adresse JSON-LD (url, @id, image, logo, et toute adresse d'un domaine « presti » ou .invalid),
//        <loc> de sitemap.xml et ligne Sitemap: de robots.txt ; aucune adresse d'un autre domaine « presti » (presti.fr) ni d'un
//        domaine de démonstration (.invalid) dans les pages, le sitemap et robots.txt ; chacune des six sortes d'adresse existe.
//        Mutation : la canonique de l'accueil passée sur presti.fr doit être vue.
//   FS-9 (G3) les libellés du formulaire de devis sont ceux du métier de la commande : scripts/fixtures/025/commande-plombier.json
//        (plombier FICTIF), posée dans une copie de commande-exemple/, génère en code 0 ; le texte de chaque formulaire de devis
//        (libellés, légendes, placeholders, aria-label, title, value, boutons, notes ; les <option> viennent de la commande et
//        sont ôtées) ne porte aucun mot PROPRE à un autre modèle de <racine>/maquettes/modeles/ (commun.mjs, motsDesMetiers :
//        dictionnaire tiré des modèles, pas écrit ici). Mutation : un mot propre à un autre modèle glissé dans le formulaire.
//   FS-10 (M1) une commande sans téléphone ni e-mail (celle du jeu d'essai, les deux clés ôtées : ce que /site/commander envoie)
//        génère en code 0 ; dans ses pages et scripts, aucun lien tel: sans numéro (6 chiffres au moins), aucun mailto: sans
//        adresse, ni « undefined » / « null » à la place d'une coordonnée ; l'accueil a un repli (role="alert", classe *echec* ou
//        *repli*) qui dit quelque chose (trois mots au moins) et ne renvoie pas vers rien (« au . », « au  ou », « à . »).
//        Mutation : le repli d'aujourd'hui, à liens vides, doit être vu.
//   FS-11 (M7) un compte purgé ne reçoit plus de demande : <racine>/app/api/leads/route.ts, transpilée par TypeScript et lancée
//        dans le juge contre un faux Supabase (fonction artisan_par_ancien_slug de 0051, doublures muettes pour l'IA, l'e-mail,
//        la sécurité), répond 404 sans rien enregistrer pour l'ancienne adresse d'un compte purgé (slug supprime-…, ancien slug
//        gardé par le trigger de 0051) et pour son adresse supprime-… ; et 200 avec une demande enregistrée pour l'ancienne et
//        l'actuelle adresse d'un compte vivant, et pour un compte en pause (la pause garde les demandes). Sur un 404, le site
//        montre le repli (FS-4). Sondes : une route minimale sans exclusion doit échouer, la même avec exclusion passer.
//   FS-12 (fiche 025-22, défaut D01 de la relecture du 25/09, ajouté le 25/09) une demande qui porte l'identifiant de sa commande
//        de site (champ `commande`) va à l'artisan de sites_commandes.artisan_id, jamais à celui qui porte le slug : même
//        chargement que FS-11 (la route transpilée contre un faux Supabase), mais le faux Supabase PROJETTE les colonnes
//        demandées (une colonne non lue dans le select vaut absente, comme en production) et tient une table sites_commandes.
//        Onze envois : commande en ligne d'un artisan vivant (avec son slug, sans slug, avec le slug d'un autre compte) →
//        200 et une demande pour cet artisan ; D01 — commande d'un compte purgé (slug supprime-…) dont l'adresse a été reprise
//        par un inconnu → 404 ; commande d'un compte effacé (artisan_id nul) → 404 ; d'un compte en suppression
//        (suppression_demandee_le posée) → 404 ; commande pas en ligne (validee) → 404 ; commande inconnue → 404 (pas de
//        repli par le slug) ; commande illisible → 400 ou 404 ; commande en ligne d'un compte en pause vivant → 200 paused ;
//        sans commande, l'adresse d'aujourd'hui → 200. Sur un refus, aucune demande enregistrée, pour personne ; jamais une
//        demande chez l'inconnu qui a repris l'adresse. Sondes, à chaque passage : une route minimale correcte doit passer ;
//        ses mutations — état non contrôlé, comptes purgés ou en suppression non écartés, repli par le slug quand la
//        commande ne mène à personne, commande ignorée (la route d'aujourd'hui), suppression_demandee_le non lue dans le
//        select — doivent être vues.
//   T1, T2 scripts/fixtures/025/commun.mjs (Lestraque régénéré identique ; les neuf démos gelées intactes).
//
// --temoin (fiche 025-01 §1 : « non-régression ou jeu d'essai conforme ») : T1 et T2 sur la racine (le dépôt), qui doivent
//   passer aujourd'hui ; FS-1 à FS-7 sur l'arbre témoin .orchestre/travail/formulaire-site-qa/temoin/, construit à chaque
//   passage : lib/slugRedirect.ts, lib/urls.ts et maquettes/modeles/ copiés du dépôt, puis scripts/fixtures/025/temoins/
//   formulaire-site-qa/ superposé, suffixe .temoin retiré (public/sites-demo/generer.mjs : un générateur --source minimal, adresse
//   de lib/urls.ts, libellés neutres, repli adapté aux coordonnées données ; app/api/leads/route.ts : la route de 1620723 avec le
//   repli par l'ancienne adresse, comptes purgés écartés, et, depuis le 25/09, le routage par la commande de FS-12). Les jeux
//   d'essai restent ceux du dépôt (scripts/fixtures/025/).
//
// --reel (fiche 025-01 §5 ; jamais lancé par un exécutant, ni par ce juge sans cette option) : FS-R1 compte d'essai créé par
//   l'API d'administration (@presti-test.invalid, leads_pause: true, est_demo: true) ; FS-R2 site généré avec son slug (copie
//   de commande-exemple) et corps capturé à l'envoi de son formulaire contre le /api/leads simulé, contact = un numéro ;
//   FS-R3 slug changé par l'administration (l'ancien rejoint slugs_anciens, trigger de 0051) ; FS-R4 ce corps, tel quel, envoyé
//   par Node à https://prestiapp.fr/api/leads → 200, paused: true (route.ts:163-169 : gardée, sans IA ni e-mail) et une seule
//   demande en base, à ce contact ; FS-R5 compte purgé (purger_compte_test) → le même envoi répond hors 2xx ; FS-R6 ménage dans
//   un finally (messages, demandes, compte), relu : rien ne reste ; FS-R7 node scripts/zero-demo-e2e.mjs → code 0. Aucun
//   navigateur ne parle à la production. Les clés viennent de .env.local, jamais affichées.
//
// Choix du juge (la fiche ne tranche pas) :
//   - Le site est servi à la racine d'un serveur local (commun.mjs, servir) ; toute requête vers un autre hôte est coupée, sauf
//     un POST vers …/api/leads d'un autre hôte (une adresse absolue https://prestiapp.fr/api/leads, par exemple) : il reçoit
//     la même réponse simulée, avec les en-têtes CORS. Le site ne parle donc jamais à la production.
//   - Les champs sont trouvés par leur rôle, pas par leur nom : le formulaire est celui qui propose le projet choisi ; le projet,
//     la commune et le délai sont les <select> qui proposent la valeur choisie ; le message est le premier <textarea> ; le
//     contact est name="contact", ou le champ tel/email, ou celui dont l'étiquette dit téléphone, e-mail ou contact.
//   - Le téléphone et l'e-mail attendus dans le repli sont lus dans <sortie>/site.json (clés telephone, email ou email_public)
//     et doivent être ceux de commande.json ; faute de site.json dans la sortie, ceux de commande.json (noté).
//   - « Demande reçue » : /demande\s+(est\s+)?(bien\s+)?re[çc]ue/i dans le texte d'un élément, le plus profond qui le contient.
//     Ce qui était déjà visible avant l'envoi (liens tel:/mailto: attendus, texte « demande reçue » d'une étape ou d'une
//     question) est marqué et ne compte pas comme l'état d'après. Une page qui change d'adresse après l'envoi (remerciement,
//     erreur) est sondée à son tour : tous ses liens y sont nouveaux, et sur un 200 le repli n'y est pas cherché.
//   - Un envoi = une requête POST …/api/leads émise par la page (événement request de Playwright). Sur une coupure, la pile
//     réseau de Chromium rejoue d'elle-même le POST (le serveur en reçoit jusqu'à cinq copies) : chaque copie reçue est
//     vérifiée, mais seul le compte côté page dit « un envoi par clic ».
//   - FS-7 lit src, srcset, poster, data-src(set), imagesrcset, url() et href sur <link> seulement : un <a href> vers la page
//     Commons d'une photo (« File:….jpg ») est un crédit, pas une image affichée.
//   - Les erreurs JavaScript de la page et les requêtes coupées vers d'autres hôtes sont notées, pas comptées en échec : un
//     formulaire cassé par elles échoue de lui-même à FS-3 ou FS-4.
//
// Les fonctions de jugement sont exportées (essais de mutation dans .orchestre/travail/025-01/) ; le juge ne tourne que lancé
// directement.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import {
  R, FIXTURES, TRAVAIL, COMMANDE_EXEMPLE, BUREAU, TELEPHONE,
  exigerSousTravail, listerFichiers, lireOuNull, fichierNonVide, shaBlob, lancer,
  instantaneDossier, comparerInstantanes, preparerTemoin, lireOptionsOuQuitter, creerSortie, t1, t2,
  servir, lancerNavigateur, capturer, preparerCommande, lireCommande, lireJson,
} from './fixtures/025/commun.mjs'

export const JUGE = 'formulaire-site-qa'
export const IDS = ['FS-1', 'FS-2', 'FS-3', 'FS-4', 'FS-5', 'FS-6', 'FS-7', 'FS-8', 'FS-9', 'FS-10', 'FS-11', 'FS-12', 'T1', 'T2']
export const IDS_REEL = ['FS-R1', 'FS-R2', 'FS-R3', 'FS-R4', 'FS-R5', 'FS-R6', 'FS-R7']
const ICI = path.join(TRAVAIL, JUGE)
const PROD = 'https://prestiapp.fr/api/leads'
const EXT_MEDIA = /\.(?:avif|webp|jpe?g|png|gif|bmp|tiff?|heic|heif|jxl|mp4|webm|mov|m4v|ogv)$/i
const CLES_CORPS = ['slug', 'contact', 'nom_prospect', 'message', 'website']
// `commande` (25/09, D01 de la revue avant mise en ligne) : l'identifiant de commande du formulaire d'un site commandé
// (data-commande, fiche 025-21), lu par la route depuis la fiche 025-22 (FS-12)
const CLES_LUES_PAR_LA_ROUTE = ['photos', 'variant', 'deferContact', 'commande'] // app/api/leads/route.ts:34-39
const NUMERO_ESSAI = '02 61 91 00 25' // plage réservée à la fiction (Arcep, décision 2019-0954, art. 2.5.12)

const court = (s, n = 160) => { const t = String(s ?? '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t }
const premiereLigne = (e) => String((e && e.message) || e).split('\n')[0].slice(0, 300)
const rel = (p) => path.relative(R, p).split(path.sep).join('/') || '.'
const norm = (s) => String(s ?? '').normalize('NFC').replace(/[‘’ʼ']/g, '’').replace(/\s+/g, ' ').trim()
const texteHtml = (html) => String(html).replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, '\'').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ')
const pagesHtml = (site) => [...listerFichiers(site)].filter((f) => /\.html?$/i.test(f)).sort()

/** Le téléphone de tel: ramené à ses chiffres, +33 → 0 (tel:+33261913847 et tel:0261913847 sont le même numéro). */
export const chiffresTel = (t) => { const d = String(t ?? '').replace(/[^\d+]/g, ''); return d.startsWith('+33') ? `0${d.slice(3)}` : d.startsWith('0033') ? `0${d.slice(4)}` : d.replace(/^\+/, '') }

// ── Génération ────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Lance <racine>/public/sites-demo/generer.mjs --source=<source> --sortie=<sortie> (sortie sous .orchestre/travail/, vidée). */
export function genererSource({ racine, source, sortie, timeout = 240_000 }) {
  exigerSousTravail(sortie)
  fs.rmSync(sortie, { recursive: true, force: true })
  fs.mkdirSync(path.dirname(sortie), { recursive: true })
  const generateur = path.join(racine, 'public', 'sites-demo', 'generer.mjs')
  if (!fichierNonVide(generateur)) return { code: null, absent: true, generateur, sortie, derniereLigne: `${generateur} absent ou vide`, secondes: 0 }
  const t0 = Date.now()
  const g = lancer(process.execPath, [generateur, `--source=${source}`, `--sortie=${sortie}`], { cwd: racine, timeout })
  return { ...g, generateur, sortie, secondes: (Date.now() - t0) / 1000 }
}

/** FS-1. → { ok, echecs, resume, site (le dossier généré s'il est jugeable, sinon null) } */
export function jugerGeneration({ racine, source = COMMANDE_EXEMPLE, sortie = path.join(ICI, 'site'), commande = lireCommande(source) }) {
  const echecs = []
  const avantSource = instantaneDossier(source, { contenu: true })
  const publicRacine = path.join(racine, 'public')
  const avantPublic = instantaneDossier(publicRacine)
  const g = genererSource({ racine, source, sortie })
  let site = null, octets = 0, n = 0
  if (g.absent) echecs.push(g.derniereLigne)
  else if (g.code !== 0) echecs.push(`generer.mjs --source=${rel(source)} --sortie=${rel(sortie)} sort en code ${g.code}${g.signal ? ` (${g.signal})` : ''}${g.erreur ? ` (${g.erreur})` : ''} : « ${court(g.derniereLigne, 200)} »`)
  else {
    const idx = path.join(sortie, 'index.html')
    const html = lireOuNull(idx)
    n = listerFichiers(sortie).size
    if (!html || !html.length) echecs.push(`code 0 mais ${rel(idx)} absent ou vide (${n} fichier(s) dans la sortie)`)
    else {
      octets = html.length
      const h = html.toString('utf8')
      if (!/<form\b/i.test(h)) echecs.push('index.html sans <form>')
      if (!norm(texteHtml(h)).includes(norm(commande.nom))) echecs.push(`le nom « ${commande.nom} » n'est pas dans le texte d'index.html`)
      site = sortie
    }
  }
  const dS = comparerInstantanes(avantSource, instantaneDossier(source, { contenu: true }))
  if (!dS.egal) echecs.push(`le générateur a touché le dossier source ${rel(source)} (${[...dS.ajoutes.map((f) => `+${f}`), ...dS.retires.map((f) => `-${f}`), ...dS.modifies.map((f) => `~${f}`)].slice(0, 4).join(', ')})`)
  const dP = comparerInstantanes(avantPublic, instantaneDossier(publicRacine))
  if (!dP.egal) echecs.push(`écriture sous ${rel(publicRacine)}/ pendant la génération (${[...dP.ajoutes.map((f) => `+${f}`), ...dP.retires.map((f) => `-${f}`), ...dP.modifies.map((f) => `~${f}`)].slice(0, 4).join(', ')})`)
  return { ok: !echecs.length, echecs, site, resume: `code 0 en ${g.secondes?.toFixed(1)} s ; ${n} fichiers dans ${rel(sortie)}, index.html ${octets} o avec un formulaire et « ${commande.nom} » ; source et ${rel(publicRacine)}/ intacts` }
}

// ── FS-2, partie statique ─────────────────────────────────────────────────────────────────────────────────────────────────
export function jugerFormulaireStatique(site) {
  const echecs = [], faits = []
  const pages = pagesHtml(site)
  let formulaires = 0, devis = 0
  for (const p of pages) {
    const h = fs.readFileSync(path.join(site, p), 'utf8')
    for (const m of h.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/gi)) {
      formulaires++
      if (/(?:^|\s)data-demo(?:[\s=>]|$)/i.test(m[1])) echecs.push(`${p} : <form ${court(m[1], 80)}> porte data-demo`)
      if (/\bname\s*=\s*["']?contact\b/i.test(m[2]) || /class\s*=\s*["'][^"']*devis/i.test(m[1])) {
        devis++
        if (!/\bname\s*=\s*["']?website["'\s>/]/i.test(m[2])) echecs.push(`${p} : formulaire de devis sans champ name="website"`)
      }
    }
    const demo = /D[ée]monstration\s*:\s*(?:rien|aucune)[^<]{0,60}/i.exec(texteHtml(h))
    if (demo) echecs.push(`${p} : « ${court(demo[0], 70)} »`)
  }
  if (!pages.includes('index.html')) echecs.push('index.html absent')
  if (!devis) echecs.push(`aucun formulaire de devis (${formulaires} <form> dans ${pages.length} page(s))`)
  faits.push(`${pages.length} page(s), ${devis} formulaire(s) de devis sans data-demo ni mention de démonstration, chacun avec name="website"`)
  return { ok: !echecs.length, echecs, faits }
}

// ── FS-6 : lecture de route.ts ────────────────────────────────────────────────────────────────────────────────────────────
const echapperRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
/**
 * FS-6 sur le source de route.ts (et celui de lib/slugRedirect.ts, pour vérifier qu'elle y est toujours exportée).
 * → { ok, echecs[], faits[] }
 */
export async function analyserRoute(src, { slugRedirect = null } = {}) {
  const ts = (await import('typescript')).default
  const echecs = [], faits = []
  const fin = () => ({ ok: !echecs.length, echecs, faits })
  if (!src || !String(src).trim()) { echecs.push('route.ts absent ou vide'); return fin() }
  const sf = ts.createSourceFile('route.ts', String(src), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const texte = (n) => n.getText(sf)
  const ligne = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1
  // l'import (éventuellement renommé, ou par espace de noms : import * as x from '@/lib/slugRedirect')
  let alias = null, espace = null, module = null
  for (const st of sf.statements) {
    const nb = ts.isImportDeclaration(st) && st.importClause?.namedBindings
    if (!nb) continue
    if (ts.isNamespaceImport(nb) && /(?:^|\/)slugRedirect(?:\.ts)?$/.test(st.moduleSpecifier.text)) { espace = nb.name.text; alias = alias || `${espace}.artisanParAncienSlug`; module = st.moduleSpecifier.text }
    if (ts.isNamedImports(nb)) for (const el of nb.elements) if ((el.propertyName || el.name).text === 'artisanParAncienSlug') { alias = el.name.text; module = st.moduleSpecifier.text }
  }
  if (!alias) echecs.push('artisanParAncienSlug n\'est pas importée')
  else if (!/(?:^|\/)lib\/slugRedirect(?:\.ts)?$/.test(module)) echecs.push(`artisanParAncienSlug importée de « ${module} », lib/slugRedirect attendu`)
  if (slugRedirect !== null && !/export\s+(?:async\s+)?function\s+artisanParAncienSlug\b|export\s+const\s+artisanParAncienSlug\b/.test(String(slugRedirect))) echecs.push('lib/slugRedirect.ts n\'exporte plus artisanParAncienSlug')
  // POST
  let post = null
  for (const st of sf.statements) {
    const exporte = st.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    if (!exporte) continue
    if (ts.isFunctionDeclaration(st) && st.name?.text === 'POST' && st.body) post = st.body
    if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) {
      if (ts.isIdentifier(d.name) && d.name.text === 'POST' && d.initializer && (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer))) post = d.initializer.body
    }
  }
  if (!post) { echecs.push('aucune fonction exportée POST'); return fin() }
  const noeuds = []
  const parcourir = (n) => { noeuds.push(n); ts.forEachChild(n, parcourir) }
  parcourir(post)
  const appelDe = (n, nom) => ts.isCallExpression(n) && ((ts.isIdentifier(n.expression) && n.expression.text === nom)
    || (nom.includes('.') && ts.isPropertyAccessExpression(n.expression) && ts.isIdentifier(n.expression.expression) && `${n.expression.expression.text}.${n.expression.name.text}` === nom))
  // la recherche par slug : .eq('slug', …) sur une chaîne qui part de .from('artisans')
  const recherche = noeuds.find((n) => ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === 'eq'
    && n.arguments[0] && ts.isStringLiteralLike(n.arguments[0]) && n.arguments[0].text === 'slug' && /\.from\(\s*['"`]artisans['"`]\s*\)/.test(texte(n)))
  if (!recherche) { echecs.push('recherche par slug (.from(\'artisans\')….eq(\'slug\', …)) introuvable dans POST'); return fin() }
  let instr = recherche
  while (instr.parent && !ts.isBlock(instr.parent) && instr.parent !== post) instr = instr.parent
  faits.push(`recherche par slug l. ${ligne(instr)}`)
  // la variable qui reçoit le résultat, et celles qui en dérivent
  const noms = new Set()
  if (ts.isVariableStatement(instr)) for (const d of instr.declarationList.declarations) {
    if (ts.isObjectBindingPattern(d.name)) { for (const el of d.name.elements) if ((el.propertyName || el.name).getText(sf) === 'data' && ts.isIdentifier(el.name)) noms.add(el.name.text) }
    else if (ts.isIdentifier(d.name)) { noms.add(`${d.name.text}.data`); noms.add(`${d.name.text}?.data`) }
  }
  // le premier 404 après la recherche
  const statut404 = noeuds.find((n) => ts.isPropertyAssignment(n) && n.name.getText(sf) === 'status' && ts.isNumericLiteral(n.initializer) && n.initializer.text === '404' && n.pos > instr.end)
  if (!statut404) echecs.push('plus aucun { status: 404 } après la recherche par slug')
  // les variables déclarées entre la recherche et ce 404 qui en dérivent (const trouve = artisan ?? …)
  for (let tour = 0; tour < 4; tour++) for (const n of noeuds) {
    if (!ts.isVariableDeclaration(n) || !ts.isIdentifier(n.name) || !n.initializer || n.pos < instr.end || (statut404 && n.pos > statut404.pos)) continue
    if ([...noms].some((x) => new RegExp(`(?<![\\w$.])${echapperRe(x)}(?![\\w$])`).test(texte(n.initializer)))) noms.add(n.name.text)
  }
  if (!noms.size) { echecs.push(`le résultat de la recherche (l. ${ligne(instr)}) n'est rangé dans aucune variable lisible`); return fin() }
  const alt = [...noms].map(echapperRe).join('|')
  const refNom = new RegExp(`(?<![\\w$.])(?:${alt})(?![\\w$])`)
  const testAbsence = new RegExp(`!\\s*\\(?\\s*(?:${alt})(?![\\w$])|(?<![\\w$.])(?:${alt})(?![\\w$])[\\w$.?]*\\s*={2,3}\\s*(?:null|undefined)\\b|\\b(?:null|undefined)\\s*={2,3}\\s*(?:${alt})(?![\\w$])`)
  const testPresence = new RegExp(`^\\(?\\s*(?:${alt})[\\w$.?]*\\s*\\)?$`)
  // l'appel à artisanParAncienSlug
  const appels = alias ? noeuds.filter((n) => appelDe(n, alias)) : []
  if (alias && !appels.length) echecs.push(`artisanParAncienSlug importée mais jamais appelée dans POST${noeudsHors(sf, ts, alias, post) ? ' (appelée hors de POST)' : ''}`)
  const gardee = (appel) => {
    for (let c = appel, a = appel.parent; a && a !== post; c = a, a = a.parent) {
      if (ts.isIfStatement(a)) {
        if (c === a.thenStatement && testAbsence.test(texte(a.expression))) return `if (${court(texte(a.expression), 40)}) l. ${ligne(a)}`
        if (c === a.elseStatement && testPresence.test(texte(a.expression).trim())) return `else de if (${court(texte(a.expression), 40)}) l. ${ligne(a)}`
      }
      if (ts.isBinaryExpression(a) && c === a.right && [ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.BarBarToken].includes(a.operatorToken.kind) && refNom.test(texte(a.left))) return `${court(texte(a.left), 30)} ${a.operatorToken.getText(sf)} … l. ${ligne(a)}`
      if (ts.isConditionalExpression(a) && ((c === a.whenTrue && testAbsence.test(texte(a.condition))) || (c === a.whenFalse && testPresence.test(texte(a.condition).trim())))) return `? : l. ${ligne(a)}`
      if (ts.isFunctionLike(a)) return { imbriquee: ligne(a) } // l'ordre de lecture ne dit plus l'ordre d'exécution
    }
    return null
  }
  // le slug reçu : second argument de .eq('slug', …) dans la recherche ; l'ancienne adresse se cherche avec lui
  const sansBlancs = (t) => t.replace(/\s+/g, '')
  const slugRecu = recherche.arguments[1] && /^[\w$.?]+$/.test(sansBlancs(texte(recherche.arguments[1]))) ? sansBlancs(texte(recherche.arguments[1])) : null
  // l'argument nomme-t-il le slug reçu ? identifiants et accès de propriété de l'argument (le texte d'une chaîne ne compte pas :
  // artisanParAncienSlug('ancien-slug') ne reçoit pas le slug)
  const nommeSlug = (arg) => { let oui = false; const v = (n) => { if (oui) return; if ((ts.isIdentifier(n) || ts.isPropertyAccessExpression(n)) && sansBlancs(texte(n)) === slugRecu) oui = true; else ts.forEachChild(n, v) }; v(arg); return oui }
  const refSlug = slugRecu ? { test: (arg) => nommeSlug(arg) } : null
  /** Les noms qui reçoivent le résultat d'un appel (const x = await appel(…), const { slug: y } = …, x = await appel(…)). */
  const recoit = (appel) => {
    let n = appel
    while (n.parent && (ts.isAwaitExpression(n.parent) || ts.isParenthesizedExpression(n.parent) || ts.isAsExpression(n.parent) || ts.isNonNullExpression(n.parent))) n = n.parent
    const p = n.parent, out = []
    if (p && ts.isVariableDeclaration(p) && p.initializer === n) {
      if (ts.isIdentifier(p.name)) out.push(p.name.text)
      else if (ts.isObjectBindingPattern(p.name) || ts.isArrayBindingPattern(p.name)) for (const el of p.name.elements) if (ts.isBindingElement(el) && ts.isIdentifier(el.name)) out.push(el.name.text)
    } else if (p && ts.isBinaryExpression(p) && p.operatorToken.kind === ts.SyntaxKind.EqualsToken && p.right === n && ts.isIdentifier(p.left)) out.push(p.left.text)
    return out
  }
  const RELANCES = ['eq', 'rpc', 'from', 'in', 'match', 'filter', 'or', 'ilike']
  const estRelance = (n) => ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && RELANCES.includes(n.expression.name.text)
  const bons = []
  for (const ap of appels) {
    const d = []
    if (ap.getStart(sf) < instr.end) d.push(`l. ${ligne(ap)} avant la fin de la recherche par slug (l. ${ligne(instr)})`)
    if (statut404 && ap.getStart(sf) > statut404.getStart(sf)) d.push(`l. ${ligne(ap)} après le 404 (l. ${ligne(statut404)})`)
    const g = gardee(ap)
    if (g && g.imbriquee) d.push(`l. ${ligne(ap)} dans une fonction imbriquée (l. ${g.imbriquee}) : l'appel doit être dans le corps de POST, où l'ordre se lit`)
    else if (!g) d.push(`l. ${ligne(ap)} sans garde sur l'absence de ${[...noms].filter((x) => !x.includes('.')).join(' / ') || 'l\'artisan'} (if (!…), == null, ?? ou ||)`)
    // l'appel reçoit le slug de la requête (pas une constante, pas autre chose)
    if (refSlug && !ap.arguments.some((a) => refSlug.test(a))) d.push(`l. ${ligne(ap)} : artisanParAncienSlug(${court(ap.arguments.map(texte).join(', '), 40)}) ne reçoit pas le slug de la requête (${slugRecu})`)
    // la nouvelle recherche SE SERT du résultat : soit elle nomme la variable qui le reçoit, soit l'appel est dans ses arguments.
    // Un appel dont le résultat est jeté, suivi d'une recherche quelconque, ne retrouve rien.
    const recus = recoit(ap)
    // un identifiant de l'argument (pas un nom de propriété, pas le texte d'une chaîne) est une des variables qui reçoivent le résultat
    const lit = (arg) => { let oui = false; const v = (n) => { if (oui) return; if (ts.isIdentifier(n) && recus.includes(n.text) && !(n.parent && ts.isPropertyAccessExpression(n.parent) && n.parent.name === n)) oui = true; else ts.forEachChild(n, v) }; v(arg); return oui }
    const refRecu = recus.length ? { test: lit } : null
    let dedans = null
    for (let a = ap.parent; a && a !== post && !ts.isBlock(a); a = a.parent) if (estRelance(a) && a.arguments.some((x) => x.pos <= ap.pos && ap.end <= x.end)) { dedans = a; break }
    const relance = statut404 && (dedans || noeuds.some((n) => estRelance(n) && n.getStart(sf) > ap.getEnd() && n.getStart(sf) < statut404.getStart(sf)
      && refRecu && n.arguments.some((x) => refRecu.test(x))))
    if (!recus.length && !dedans) d.push(`l. ${ligne(ap)} : le résultat d'artisanParAncienSlug n'est ni gardé dans une variable ni passé à la recherche : il est jeté`)
    else if (!relance) d.push(`l. ${ligne(ap)} : aucune nouvelle recherche de l'artisan (.from / .eq / .rpc…) qui se serve de ${recus.length ? recus.join(' / ') : 'son résultat'} entre cet appel et le 404`)
    if (d.length) echecs.push(`artisanParAncienSlug ${d.join(', ')}`)
    else bons.push(`appel l. ${ligne(ap)} (${g}), 404 l. ${ligne(statut404)}`)
  }
  if (appels.length && !bons.length && !echecs.some((e) => e.startsWith('artisanParAncienSlug l.'))) echecs.push('aucun appel conforme')
  if (bons.length) faits.push(...bons)
  // isBanned et le piège website avant la recherche
  const banni = noeuds.find((n) => appelDe(n, 'isBanned'))
  if (!banni) echecs.push('isBanned( n\'est plus appelée dans POST')
  else if (banni.getEnd() > instr.getStart(sf)) echecs.push(`isBanned( l. ${ligne(banni)} n'est plus avant la recherche par slug (l. ${ligne(instr)})`)
  else faits.push(`isBanned l. ${ligne(banni)}`)
  const piege = noeuds.find((n) => ts.isIfStatement(n) && /(?<![\w$])website(?![\w$])/.test(texte(n.expression)))
  if (!piege) echecs.push('le test du piège website n\'est plus dans POST')
  else if (piege.getEnd() > instr.getStart(sf)) echecs.push(`le test du piège website l. ${ligne(piege)} n'est plus avant la recherche par slug (l. ${ligne(instr)})`)
  else faits.push(`piège website l. ${ligne(piege)}`)
  return fin()
}
function noeudsHors(sf, ts, alias, post) {
  let hors = false
  const p = (n) => { if (n === post) return; if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === alias) hors = true; ts.forEachChild(n, p) }
  p(sf)
  return hors
}

// ── FS-7 : les photos ─────────────────────────────────────────────────────────────────────────────────────────────────────
const baseDe = (nom) => path.posix.basename(nom).replace(/-\d+\.[a-z0-9]+$/i, '')
/** Les références d'images des pages et feuilles de styles d'un site → { internes: [{ page, url, fichier }], externes: [{ page, url }] } */
export function referencesMedias(site) {
  const internes = [], externes = []
  for (const f of [...listerFichiers(site)].filter((x) => /\.(?:html?|css)$/i.test(x))) {
    const src = fs.readFileSync(path.join(site, f), 'utf8')
    const urls = []
    if (/\.css$/i.test(f)) for (const m of src.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi)) urls.push(m[2])
    else {
      // balise par balise : src, poster, srcset… partout ; href seulement sur <link> (préchargement, icône) — un <a href> vers
      // la page Commons d'une photo (« File:….jpg ») est un crédit, pas une image affichée
      for (const t of src.matchAll(/<([a-z][a-z0-9-]*)\b((?:[^>"']|"[^"]*"|'[^']*')*)>/gi)) {
        const balise = t[1].toLowerCase(), attrs = t[2]
        for (const m of attrs.matchAll(/\s(src|poster|data-src|href)\s*=\s*(["'])([^"']*)\2/gi)) if (m[1].toLowerCase() !== 'href' || balise === 'link') urls.push(m[3])
        for (const m of attrs.matchAll(/\s(?:srcset|data-srcset|imagesrcset)\s*=\s*(["'])([^"']*)\1/gi)) for (const c of m[2].split(',')) { const u = c.trim().split(/\s+/)[0]; if (u) urls.push(u) }
      }
      for (const m of src.matchAll(/url\(\s*(&quot;|['"]?)([^'")&]+)\1\s*\)/gi)) urls.push(m[2])
    }
    for (const u0 of urls) {
      const u = u0.trim()
      if (!u || u.startsWith('data:') || u.startsWith('#') || u.startsWith('mailto:') || u.startsWith('tel:')) continue
      const sansQ = u.split(/[?#]/)[0]
      if (!EXT_MEDIA.test(sansQ)) continue
      if (/^(?:[a-z]+:)?\/\//i.test(u)) { externes.push({ page: f, url: u }); continue }
      let chemin
      try { chemin = decodeURI(sansQ) } catch { chemin = sansQ }
      const fichier = chemin.startsWith('/') ? path.join(site, chemin) : path.join(site, path.posix.dirname(f), chemin)
      internes.push({ page: f, url: u, fichier: path.relative(site, fichier).split(path.sep).join('/') })
    }
  }
  return { internes, externes }
}
/** FS-7. → { ok, echecs, faits } */
export function jugerPhotos({ site, source }) {
  const echecs = [], faits = []
  const dp = path.join(source, 'photos')
  const parSha = new Map()
  for (const f of listerFichiers(dp)) if (EXT_MEDIA.test(f)) { const b = fs.readFileSync(path.join(dp, f)); if (b.length) parSha.set(shaBlob(b), f) }
  if (!parSha.size) echecs.push(`aucune photo non vide dans ${rel(dp)}`)
  const medias = [...listerFichiers(site)].filter((f) => EXT_MEDIA.test(f)).sort()
  const etrangers = [], vides = [], bases = new Set()
  for (const f of medias) {
    const b = fs.readFileSync(path.join(site, f))
    if (!b.length) { vides.push(f); continue }
    const nom = parSha.get(shaBlob(b))
    if (nom) bases.add(baseDe(nom)); else etrangers.push(f)
  }
  if (etrangers.length) echecs.push(`${etrangers.length} média(s) étranger(s) au dossier source : ${etrangers.slice(0, 5).join(', ')}${etrangers.length > 5 ? '…' : ''}`)
  if (vides.length) echecs.push(`${vides.length} média(s) de 0 octet : ${vides.slice(0, 3).join(', ')}`)
  if (bases.size < 3) echecs.push(`${bases.size} photo(s) du dossier source dans le site (3 bases au moins)`)
  const { internes, externes } = referencesMedias(site)
  const presents = listerFichiers(site)
  const manquantes = internes.filter((r) => !presents.has(r.fichier))
  if (manquantes.length) echecs.push(`${manquantes.length} image(s) référencée(s) absente(s) de la sortie : ${[...new Set(manquantes.map((r) => `${r.page} → ${r.url}`))].slice(0, 4).join(', ')}`)
  if (externes.length) echecs.push(`${externes.length} image(s) prise(s) hors du site : ${[...new Set(externes.map((r) => `${r.page} → ${r.url}`))].slice(0, 3).join(', ')}`)
  const accueil = internes.filter((r) => r.page === 'index.html' && presents.has(r.fichier))
  if (!accueil.length) echecs.push('index.html ne référence aucune photo présente')
  faits.push(`${medias.length} média(s), tous identiques à un fichier de ${rel(dp)} (${bases.size} photos : ${[...bases].slice(0, 6).join(', ')}${bases.size > 6 ? '…' : ''}) ; ${internes.length} référence(s), aucune absente ni externe`)
  return { ok: !echecs.length, echecs, faits }
}

// ── Le navigateur : aides injectées dans la page ──────────────────────────────────────────────────────────────────────────
const AIDES_PAGE = `(() => {
  if (window.__juge025) return
  const norm = (s) => String(s || '').normalize('NFC').replace(/[\\u2018\\u2019\\u02BC']/g, '’').replace(/\\s+/g, ' ').trim()
  const desc = (n) => n ? n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + (n.classList && n.classList.length ? '.' + [...n.classList].slice(0, 2).join('.') : '') : 'rien'
  const cadres = () => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok)))
  const pause = (ms) => new Promise((ok) => setTimeout(ok, ms))
  function tester(el) {
    if (!el || !el.isConnected) return { ok: false, raison: 'absent du document' }
    if (!el.getClientRects().length) return { ok: false, raison: 'non rendu (display:none, hidden)' }
    const cs = getComputedStyle(el)
    if (cs.visibility !== 'visible') return { ok: false, raison: 'visibility:' + cs.visibility }
    let op = 1
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) op *= parseFloat(getComputedStyle(n).opacity || '1')
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) return { ok: false, raison: 'taille ' + r.width.toFixed(0) + '×' + r.height.toFixed(0) }
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2
    if (cx < 0 || cy < 0 || cx >= innerWidth || cy >= innerHeight) return { ok: false, raison: 'centre hors de l’écran (' + cx.toFixed(0) + ', ' + cy.toFixed(0) + ')' }
    const vu = document.elementFromPoint(cx, cy)
    if (!vu || !(vu === el || el.contains(vu))) return { ok: false, raison: 'centre recouvert par ' + desc(vu) }
    if (op < 0.9) return { ok: false, raison: 'opacité effective ' + op.toFixed(2) }
    return { ok: true, raison: desc(el) + ' : elementFromPoint(' + cx.toFixed(0) + ', ' + cy.toFixed(0) + ') → ' + desc(vu) + ', opacité ' + op.toFixed(2) }
  }
  async function visible(el, attente) {
    const fin = performance.now() + (attente || 0)
    for (;;) {
      if (el && el.isConnected && el.getClientRects().length) { try { el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' }) } catch (e) { el.scrollIntoView({ block: 'center', inline: 'nearest' }) } }
      await cadres()
      const r = tester(el)
      if (r.ok || performance.now() >= fin) return r
      await pause(150)
    }
  }
  const telDe = (h) => { const d = String(h || '').replace(/[^\\d+]/g, ''); return d.startsWith('+33') ? '0' + d.slice(3) : d.startsWith('0033') ? '0' + d.slice(4) : d.replace(/^\\+/, '') }
  function liens(tel, mail) {
    const out = { tel: [], mail: [] }
    for (const a of document.querySelectorAll('a[href]')) {
      let h = a.getAttribute('href') || ''
      try { h = decodeURIComponent(h) } catch (e) {}
      if (/^tel:/i.test(h) && telDe(h.slice(4)) === tel) out.tel.push(a)
      const m = /^mailto:([^?]*)(\\?.*)?$/i.exec(h)
      if (m && m[1].trim().toLowerCase() === mail) out.mail.push(a)
    }
    return out
  }
  function recues() {
    const re = /demande\\s+(?:est\\s+)?(?:bien\\s+)?re[çc]ue/i
    const els = [...document.body.querySelectorAll('*')].filter((e) => !['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT'].includes(e.tagName) && re.test(norm(e.textContent)))
    return els.filter((e) => ![...e.children].some((c) => re.test(norm(c.textContent))))
  }
  function ancetreCommun(a, b) { for (let n = a; n; n = n.parentElement) if (n.contains(b)) return n; return null }
  window.__juge025 = {
    norm, desc, tester, visible,
    /** Repère le formulaire et ses champs (data-juge-champ), et juge le piège (FS-2). */
    formulaire(choix) {
      const forms = [...document.querySelectorAll('form')]
      const proposes = (s, v) => [...s.options].some((o) => norm(o.textContent) === norm(v))
      const f = forms.find((x) => [...x.querySelectorAll('select')].some((s) => proposes(s, choix.projet))) || forms.find((x) => x.elements.namedItem('contact')) || null
      if (!f) return { ok: false, raison: 'aucun formulaire ne propose le projet « ' + choix.projet + ' » ni n’a de champ contact (' + forms.length + ' <form>)' }
      f.setAttribute('data-juge-champ', 'form')
      const hp0 = f.elements.namedItem('website')
      const hp = hp0 && hp0.length !== undefined && !hp0.tagName ? hp0[0] : hp0
      const selects = [...f.querySelectorAll('select')]
      const champ = {}
      for (const k of ['projet', 'commune', 'delai']) { const s = choix[k] && selects.find((x) => proposes(x, choix[k]) && !x.hasAttribute('data-juge-champ')); if (s) { s.setAttribute('data-juge-champ', k); champ[k] = true } }
      const saisies = [...f.querySelectorAll('input, textarea')].filter((x) => x !== hp && !['hidden', 'submit', 'button', 'checkbox', 'radio', 'file', 'reset', 'image'].includes((x.type || '').toLowerCase()))
      const etiquette = (x) => norm([...(x.labels || [])].map((l) => l.textContent).join(' ') + ' ' + (x.getAttribute('aria-label') || '') + ' ' + (x.placeholder || ''))
      const message = saisies.find((x) => x.tagName === 'TEXTAREA')
      const nc = f.elements.namedItem('contact')
      const contact = (nc && nc.tagName && nc !== hp ? nc : null) || saisies.find((x) => x !== message && (['tel', 'email'].includes((x.type || '').toLowerCase()) || /^(?:tel|email)$/.test(x.getAttribute('autocomplete') || '') || /t[ée]l[ée]phone|e-?mail|contact/i.test(etiquette(x))))
      const nom = saisies.find((x) => x !== message && x !== contact && (/^(?:nom|nom_prospect|name|prenom)$/i.test(x.name || '') || /^(?:name|given-name|family-name)$/.test(x.getAttribute('autocomplete') || '') || /votre nom|nom et pr[ée]nom|^nom\\b|pr[ée]nom/i.test(etiquette(x))))
      if (message) message.setAttribute('data-juge-champ', 'message')
      if (contact) contact.setAttribute('data-juge-champ', 'contact')
      if (nom) nom.setAttribute('data-juge-champ', 'nom')
      const envoi = f.querySelector('button[type=submit], input[type=submit]') || f.querySelector('button:not([type])')
      if (envoi) envoi.setAttribute('data-juge-champ', 'envoi')
      // le piège
      const piege = { present: !!hp }
      if (hp) {
        const r = hp.getBoundingClientRect()
        const L = r.left + scrollX, T = r.top + scrollY, D = r.right + scrollX, B = r.bottom + scrollY
        const W = Math.max(document.documentElement.scrollWidth, innerWidth), H = Math.max(document.documentElement.scrollHeight, innerHeight)
        Object.assign(piege, {
          balise: hp.tagName.toLowerCase(), type: (hp.type || '').toLowerCase(), tabindex: hp.getAttribute('tabindex'), valeur: hp.value, autocomplete: hp.getAttribute('autocomplete'),
          rendu: hp.getClientRects().length > 0, boite: [L, T, D, B].map((v) => Math.round(v)), document: [W, H],
          horsEcran: hp.getClientRects().length > 0 && (D <= 0 || B <= 0 || L >= W || T >= H), dansForm: f.contains(hp) || hp.form === f,
          etiquettes: [...(hp.labels || [])].map((l) => { const q = l.getBoundingClientRect(); const lL = q.left + scrollX, lT = q.top + scrollY, lD = q.right + scrollX, lB = q.bottom + scrollY
            const cachee = !l.getClientRects().length || getComputedStyle(l).visibility !== 'visible' || q.width < 1 || q.height < 1 || lD <= 0 || lB <= 0 || lL >= W || lT >= H
            return { texte: norm(l.textContent).slice(0, 40), cachee } }),
        })
      }
      return { ok: true, dataDemo: f.hasAttribute('data-demo'), champ: { ...champ, message: !!message, contact: !!contact, nom: !!nom, envoi: !!envoi }, piege, action: f.getAttribute('action') || '', methode: f.getAttribute('method') || '' }
    },
    /** Marque les liens tel:/mailto: attendus qui sont déjà visibles avant l'envoi. */
    async marquerAvant(tel, mail) {
      const l = liens(tel, mail), vus = []
      // un lien non rendu (display:none, [hidden]) ne peut pas l'être sans que la page change : pas d'attente pour lui
      for (const a of [...l.tel, ...l.mail]) { if (!a.getClientRects().length) continue; const r = await visible(a, 1500); if (r.ok) { a.setAttribute('data-juge-avant', ''); vus.push(a.getAttribute('href')) } }
      // de même, un « demande reçue » déjà lisible dans le texte de la page (une étape, une question) n'est pas l'état d'après l'envoi
      for (const e of recues()) { if (!e.getClientRects().length) continue; const r = await visible(e, 1500); if (r.ok) { e.setAttribute('data-juge-avant', ''); vus.push('« ' + norm(e.textContent).slice(0, 30) + ' »') } }
      scrollTo(0, 0)
      return vus
    },
    /** L'état après l'envoi : « demande reçue » visible ? repli (nouveaux tel: et mailto: visibles, ancêtre commun visible) ? */
    async etat(tel, mail, attendu, attente) {
      const fin = performance.now() + attente
      const repli = async () => {
        const l = liens(tel, mail)
        const nt = l.tel.filter((a) => !a.hasAttribute('data-juge-avant')), nm = l.mail.filter((a) => !a.hasAttribute('data-juge-avant'))
        const vt = [], vm = [], raisons = []
        for (const a of nt) { const r = await visible(a, 0); if (r.ok) vt.push(a); else raisons.push('tel: ' + r.raison) }
        for (const a of nm) { const r = await visible(a, 0); if (r.ok) vm.push(a); else raisons.push('mailto: ' + r.raison) }
        if (!nt.length) raisons.push('aucun nouveau lien tel: vers le téléphone attendu (' + l.tel.length + ' déjà visible(s) avant l’envoi)')
        if (!nm.length) raisons.push('aucun nouveau lien mailto: vers l’e-mail attendu (' + l.mail.length + ' déjà visible(s) avant l’envoi)')
        if (!vt.length || !vm.length) return { ok: false, raison: raisons.join(' ; ') }
        const c = ancetreCommun(vt[0], vm[0])
        if (!c || c === document.body || c === document.documentElement || c.tagName === 'MAIN') return { ok: false, raison: 'tel: et mailto: sans conteneur commun (ancêtre : ' + desc(c) + ')' }
        if (c.getBoundingClientRect().height > 1.5 * innerHeight) return { ok: false, raison: 'conteneur commun ' + desc(c) + ' plus haut qu’un écran et demi' }
        const rc = await visible(c, 0)
        if (!rc.ok) return { ok: false, raison: 'conteneur ' + desc(c) + ' : ' + rc.raison }
        return { ok: true, conteneur: c, raison: 'repli ' + desc(c) + ' : ' + rc.raison + ' ; tel: ' + vt[0].getAttribute('href') + ', mailto: ' + vm[0].getAttribute('href') }
      }
      const recu = async () => {
        const els = recues().filter((e) => !e.hasAttribute('data-juge-avant')), raisons = []
        for (const e of els) { const r = await visible(e, 0); if (r.ok) return { ok: true, element: e, raison: '« ' + norm(e.textContent).slice(0, 40) + ' » : ' + r.raison }; raisons.push(desc(e) + ' ' + r.raison) }
        return { ok: false, raison: els.length ? raisons.join(' ; ') : 'aucun texte « demande reçue » dans la page' }
      }
      let rp, rc
      for (;;) {
        if (attendu === 'recu') { rc = await recu(); if (rc.ok || performance.now() >= fin) break }
        else { rp = await repli(); if (rp.ok || performance.now() >= fin) break }
        await pause(150)
      }
      // l'autre état ne doit pas être visible
      if (attendu === 'recu') { rp = await repli(); if (rc.ok) await visible(rc.element, 0) }
      else { rc = await recu(); if (rp.ok) await visible(rp.conteneur, 0) }
      return { recu: { ok: rc.ok, raison: rc.raison }, repli: { ok: rp.ok, raison: rp.raison } }
    },
  }
})()`

/** Les valeurs choisies et saisies par le juge. */
export function choixDe(commande, marque = crypto.randomBytes(3).toString('hex')) {
  const projets = commande.devis?.projets || [], delais = commande.devis?.delais || [], communes = commande.communes || []
  return {
    projet: projets[1] || projets[0] || '', commune: communes[2] || communes.at(-1) || '', delai: delais[1] || delais[0] || '',
    texte: `Repère FS3-${marque} : placard sous la rampe, chêne clair.`, contact: NUMERO_ESSAI, nom: 'Prospect Essai',
  }
}
/** Le téléphone et l'e-mail attendus dans le repli : <site>/site.json, sinon commande.json. */
export function attendusRepli(site, commande) {
  const echecs = []
  let origine = 'commande.json (site.json absent de la sortie)', tel = commande.telephone, mail = commande.email
  const sj = lireOuNull(path.join(site, 'site.json'))
  if (sj) {
    try {
      const j = JSON.parse(sj.toString('utf8'))
      const t = j.telephone, m = j.email ?? j.email_public ?? j.contact?.email
      if (chiffresTel(t) !== chiffresTel(commande.telephone)) echecs.push(`site.json → telephone « ${t} », commande.json « ${commande.telephone} »`)
      if (String(m || '').toLowerCase() !== String(commande.email || '').toLowerCase()) echecs.push(`site.json → e-mail « ${m} », commande.json « ${commande.email} »`)
      tel = t; mail = m; origine = 'site.json de la sortie'
    } catch (e) { echecs.push(`site.json illisible : ${premiereLigne(e)}`) }
  }
  return { tel: chiffresTel(tel), mail: String(mail || '').trim().toLowerCase(), origine, echecs }
}

/** FS-3 : un corps reçu contre ce qui a été saisi. → liste de défauts */
export function defautsCorps(q, { slug, choix, champNom }) {
  const d = []
  if (q.methode !== 'POST') d.push(`méthode ${q.methode}`)
  const ct = String(q.entetes?.['content-type'] || '')
  if (!/application\/json/i.test(ct)) d.push(`content-type « ${ct || 'absent'} »`)
  const j = q.json
  if (!j || typeof j !== 'object' || Array.isArray(j)) { d.push(`corps non JSON objet : « ${court(q.texte, 80)} »`); return d }
  for (const k of CLES_CORPS) if (!(k in j)) d.push(`clé ${k} absente`)
  const autres = Object.keys(j).filter((k) => !CLES_CORPS.includes(k))
  const inconnues = autres.filter((k) => !CLES_LUES_PAR_LA_ROUTE.includes(k))
  if (inconnues.length) d.push(`clé(s) que la route ne lit pas : ${inconnues.join(', ')}`)
  if (j.deferContact === true) d.push('deferContact: true (le contact serait différé)')
  if (j.slug !== slug) d.push(`slug « ${j.slug} », « ${slug} » attendu`)
  if (typeof j.contact !== 'string' || j.contact.replace(/\s/g, '') !== choix.contact.replace(/\s/g, '')) d.push(`contact « ${j.contact} », « ${choix.contact} » saisi`)
  if (champNom) { if (norm(j.nom_prospect) !== norm(choix.nom)) d.push(`nom_prospect « ${j.nom_prospect} », « ${choix.nom} » saisi`) }
  else if (!(j.nom_prospect === null || j.nom_prospect === '' || typeof j.nom_prospect === 'string')) d.push(`nom_prospect ${JSON.stringify(j.nom_prospect)} (null ou texte attendu)`)
  const m = norm(j.message).toLowerCase()
  if (typeof j.message !== 'string' || !m) d.push('message vide')
  else {
    for (const [quoi, v] of [['projet', choix.projet], ['commune', choix.commune], ['texte saisi', choix.texte]]) if (v && !m.includes(norm(v).toLowerCase())) d.push(`message sans le ${quoi} « ${v} »`)
    if (j.message.length > 5000) d.push(`message de ${j.message.length} signes (5 000 au plus, route.ts:15)`)
  }
  if (j.website !== '') d.push(`website ${JSON.stringify(j.website)}, "" attendu`)
  return d
}

export const SCENARIOS = [
  { nom: '200', statut: 200, corps: { ok: true, leadId: '00000000-0000-4000-8000-000000025003', token: 'jeton-essai-025-03', paused: true, reply: null }, attendu: 'recu' },
  { nom: '404', statut: 404, corps: { error: 'Artisan introuvable' }, attendu: 'repli' },
  { nom: '410', statut: 410, corps: { error: 'Ce lien de contact n’est plus actif pour le moment.' }, attendu: 'repli' },
  { nom: '500', statut: 500, corps: { error: 'Service momentanément indisponible' }, attendu: 'repli' },
  { nom: 'coupure', coupure: true, attendu: 'repli' },
]
export const MOTEURS = [['chromium', BUREAU, 'bureau 1440×900'], ['webkit', TELEPHONE, 'téléphone 390×844']]

/**
 * FS-2 (navigateur), FS-3 et FS-4 : le site servi, un contexte neuf par scénario et par moteur.
 * → { fs2: { ok, echecs, faits }, fs3: {…}, fs4: {…}, corps: [les corps reçus], notes: [] }
 */
export async function jugerNavigateur({ site, commande, scenarios = SCENARIOS, moteurs = MOTEURS, captures = path.join(ICI, 'captures'), choix = choixDe(commande) }) {
  const r = { fs2: { echecs: [], faits: [] }, fs3: { echecs: [], faits: [] }, fs4: { echecs: [], faits: [] }, corps: [], notes: [] }
  const att = attendusRepli(site, commande)
  for (const e of att.echecs) r.fs4.echecs.push(e)
  if (!att.tel || !att.mail) r.fs4.echecs.push(`téléphone ou e-mail attendus introuvables (${att.origine})`)
  r.notes.push(`repli attendu : tel ${att.tel}, mailto ${att.mail} (${att.origine})`)
  // les captures d'un passage précédent ne comptent jamais : dossier vidé
  exigerSousTravail(captures)
  fs.rmSync(captures, { recursive: true, force: true })
  fs.mkdirSync(captures, { recursive: true })
  let scenario = null
  const recus = []
  const recevoir = (entree) => {
    recus.push({ ...entree, scenario: scenario?.nom })
    if (!scenario) return { statut: 503, corps: { error: 'aucun scénario' } }
    return scenario.coupure ? { coupure: true } : { statut: scenario.statut, corps: scenario.corps }
  }
  const srv = await servir(site, { routes: { '/api/leads': recevoir } })
  const externes = []
  let nav = null
  try {
    for (const [moteur, vue, libelle] of moteurs) {
      nav = await lancerNavigateur(moteur)
      for (const sc of scenarios) {
        scenario = sc
        const ctx = await nav.newContext({ ...vue, serviceWorkers: 'block' })
        await ctx.addInitScript({ content: AIDES_PAGE })
        await ctx.route('**/*', async (route) => {
          const req = route.request(), url = req.url()
          if (url.startsWith(`${srv.base}/`) || url === srv.base) return route.continue()
          let u = null
          try { u = new URL(url) } catch { /* ignoré */ }
          if (u && /^https?:$/.test(u.protocol) && u.pathname === '/api/leads') {
            const cors = { 'access-control-allow-origin': req.headers().origin || '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'POST, OPTIONS' }
            if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
            const texte = req.postData() || ''
            let json
            try { json = texte ? JSON.parse(texte) : undefined } catch { json = undefined }
            const rep = recevoir({ methode: req.method(), chemin: u.pathname, url, entetes: req.headers(), texte, json, t: Date.now(), externe: true })
            if (!rep || rep.coupure) return route.abort('connectionreset')
            return route.fulfill({ status: rep.statut, headers: { ...cors, 'content-type': 'application/json; charset=utf-8' }, body: JSON.stringify(rep.corps) })
          }
          externes.push(url.slice(0, 120))
          return route.abort('blockedbyclient')
        })
        const page = await ctx.newPage()
        const erreurs = [], dialogues = [], envois = []
        // les envois comptés côté page : sur une coupure, la pile réseau de Chromium rejoue d'elle-même le POST sur une
        // nouvelle connexion (le serveur en reçoit jusqu'à cinq pour un seul fetch) — ce n'est pas un double envoi du site
        page.on('request', (q) => { try { if (q.method() === 'POST' && new URL(q.url()).pathname === '/api/leads') envois.push(q.url()) } catch { /* ignoré */ } })
        page.on('pageerror', (e) => erreurs.push(premiereLigne(e)))
        page.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}) })
        const tag = `${libelle}, ${sc.nom}`
        try {
          await page.goto(`${srv.base}/`, { waitUntil: 'load', timeout: 60_000 })
          await page.waitForTimeout(600)
          const f = await page.evaluate((c) => window.__juge025.formulaire(c), choix)
          if (!f.ok) { r.fs2.echecs.push(`${tag} : ${f.raison}`); r.fs3.echecs.push(`${tag} : ${f.raison}`); r.fs4.echecs.push(`${tag} : ${f.raison}`); continue }
          if (sc === scenarios[0]) {
            // FS-2 dans le navigateur (une fois par moteur)
            const p = f.piege, d = []
            if (f.dataDemo) d.push('le formulaire porte data-demo')
            if (!p.present) d.push('aucun champ name="website"')
            else {
              if (!p.dansForm) d.push('le champ website n\'appartient pas au formulaire')
              if (!['input', 'textarea'].includes(p.balise) || p.type === 'hidden') d.push(`piège <${p.balise} type="${p.type}"> : un champ de saisie est attendu (un robot saute type=hidden)`)
              if (p.tabindex !== '-1') d.push(`piège tabindex=${p.tabindex === null ? 'absent' : `"${p.tabindex}"`}, "-1" attendu`)
              if (p.valeur !== '') d.push(`piège pré-rempli (« ${court(p.valeur, 30)} »)`)
              if (!p.rendu) d.push('piège non rendu (display:none) : hors écran attendu')
              else if (!p.horsEcran) d.push(`piège dans la page, boîte [${p.boite.join(', ')}] dans [0, 0, ${p.document.join(', ')}]`)
              const vues = p.etiquettes.filter((e) => !e.cachee)
              if (vues.length) d.push(`étiquette du piège visible : « ${vues[0].texte} »`)
            }
            if (d.length) r.fs2.echecs.push(`${libelle} : ${d.join(' ; ')}`)
            else r.fs2.faits.push(`${libelle} : sans data-demo, piège <${p.balise} type=${p.type}> tabindex=-1 vide, boîte [${p.boite.join(', ')}] hors du document ${p.document.join('×')}${p.autocomplete ? ` (autocomplete=${p.autocomplete})` : ' (autocomplete absent, « off » conseillé)'}`)
            if (!f.champ.contact || !f.champ.envoi) r.notes.push(`${libelle} : champs trouvés ${JSON.stringify(f.champ)}`)
          }
          // remplir
          const d3 = []
          const champ = (k) => page.locator(`[data-juge-champ="${k}"]`)
          for (const k of ['projet', 'commune', 'delai']) {
            if (f.champ[k]) await champ(k).selectOption({ label: await champ(k).evaluate((s, v) => [...s.options].find((o) => window.__juge025.norm(o.textContent) === window.__juge025.norm(v))?.label || v, choix[k]) })
            else if (k !== 'delai') d3.push(`aucun choix « ${choix[k]} » (${k})`)
          }
          if (f.champ.message) await champ('message').fill(choix.texte); else d3.push('aucun <textarea> pour le message')
          if (f.champ.contact) await champ('contact').fill(choix.contact); else d3.push('champ contact introuvable')
          if (f.champ.nom) await champ('nom').fill(choix.nom)
          if (!f.champ.envoi) d3.push('aucun bouton d\'envoi')
          if (d3.length) { r.fs3.echecs.push(`${tag} : ${d3.join(' ; ')}`); r.fs4.echecs.push(`${tag} : formulaire non rempli`); continue }
          const avant = await page.evaluate(([t, m]) => window.__juge025.marquerAvant(t, m), [att.tel, att.mail])
          const n0 = recus.length, url0 = page.url().split('#')[0]
          await champ('envoi').scrollIntoViewIfNeeded()
          await champ('envoi').click({ timeout: 10_000 })
          const limite = Date.now() + 6000
          while (recus.length === n0 && Date.now() < limite) await page.waitForTimeout(100)
          // un site peut aussi mener à une page de remerciement ou d'erreur : la sonde est réinjectée (addInitScript) et relancée
          const sonde = () => page.evaluate(([t, m, a]) => window.__juge025.etat(t, m, a, 5000), [att.tel, att.mail, sc.attendu])
          let et
          for (let essai = 0; ; essai++) {
            try { et = await sonde(); break } catch (e) {
              if (!/context was destroyed|navigat|Target closed/i.test(String(e?.message)) || essai >= 4) throw e
              await page.waitForTimeout(400)
              await page.waitForLoadState('load', { timeout: 20_000 }).catch(() => {})
            }
          }
          const navigue = page.url().split('#')[0] !== url0
          if (navigue) r.notes.push(`${tag} : la page a changé d'adresse après l'envoi (${court(page.url().replace(srv.base, ''), 60)})`)
          // sur une nouvelle page, tous ses liens sont « nouveaux » : une page de remerciement qui redonne téléphone et e-mail
          // n'est pas un repli affiché à tort
          if (navigue && sc.attendu === 'recu') et.repli = { ok: false, raison: 'page de remerciement : sans objet' }
          await page.waitForTimeout(300)
          const nouveaux = recus.slice(n0).filter((q) => q.chemin === '/api/leads')
          // FS-3 : chaque corps reçu (une coupure en fait recevoir plusieurs copies) ; un seul envoi par clic, compté côté page
          if (!nouveaux.length) r.fs3.echecs.push(`${tag} : aucune requête sur /api/leads après l'envoi${srv.requetes.some((q) => q.methode !== 'GET') ? ` (vues : ${srv.requetes.filter((q) => q.methode !== 'GET').map((q) => `${q.methode} ${q.chemin}`).slice(-3).join(', ')})` : ''}`)
          else {
            if (envois.length !== 1) r.fs3.echecs.push(`${tag} : ${envois.length} requête(s) POST /api/leads émises par la page pour un clic`)
            const d = [...new Set(nouveaux.flatMap((q) => defautsCorps(q, { slug: commande.slug, choix, champNom: f.champ.nom })))]
            if (d.length) r.fs3.echecs.push(`${tag} : ${d.join(' ; ')}`)
            r.corps.push({ scenario: sc.nom, moteur, url: nouveaux[0].url || `${srv.base}${nouveaux[0].chemin}`, externe: !!nouveaux[0].externe, json: nouveaux[0].json, recus: nouveaux.length })
          }
          // FS-4
          const d4 = []
          if (sc.attendu === 'recu') {
            if (!et.recu.ok) d4.push(`« demande reçue » non visible : ${et.recu.raison}`)
            if (et.repli.ok) d4.push(`le repli s'affiche sur un 200 : ${et.repli.raison}`)
          } else {
            if (!et.repli.ok) d4.push(`repli non visible : ${et.repli.raison}`)
            if (et.recu.ok) d4.push(`« demande reçue » visible alors que l'envoi a échoué : ${et.recu.raison}`)
          }
          const fichier = path.join(captures, `fs4-${moteur}-${sc.nom}.jpg`)
          const c = await capturer(page, fichier, { maxOctets: 1536 * 1024 })
          if (!c.ok) d4.push(`capture ${path.basename(fichier)} : ${c.raisons.join(', ')}`)
          if (dialogues.length) r.notes.push(`${tag} : boîte de dialogue « ${court(dialogues[0], 60)} »`)
          if (erreurs.length) r.notes.push(`${tag} : erreur JavaScript « ${court(erreurs[0], 90)} »`)
          if (d4.length) r.fs4.echecs.push(`${tag} : ${d4.join(' ; ')}`)
          else r.fs4.faits.push({ libelle, scenario: sc.nom, attendu: sc.attendu, raison: sc.attendu === 'recu' ? et.recu.raison : et.repli.raison, ecart: c.ecartType, avant })
        } catch (e) {
          const m = `${tag} : interrompu (${premiereLigne(e)})`
          r.fs3.echecs.push(m); r.fs4.echecs.push(m)
        } finally {
          await ctx.close().catch(() => {})
        }
      }
      await nav.close().catch(() => {}); nav = null
    }
  } finally {
    if (nav) await nav.close().catch(() => {})
    await srv.fermer()
  }
  if (externes.length) r.notes.push(`${externes.length} requête(s) vers d'autres hôtes coupée(s) par le juge (${[...new Set(externes.map((u) => { try { return new URL(u).host } catch { return u } }))].slice(0, 4).join(', ')})`)
  const ok3 = r.corps.length === scenarios.length * moteurs.length
  if (!ok3 && !r.fs3.echecs.length) r.fs3.echecs.push(`${r.corps.length} corps reçus pour ${scenarios.length * moteurs.length} envois`)
  if (r.corps.length) {
    const c = r.corps[0]
    const rejeux = r.corps.filter((x) => x.recus > 1)
    r.fs3.faits.push(`${r.corps.length} envois (${moteurs.map((m) => m[0]).join(', ')}) : un POST application/json émis par la page à chaque clic, vers ${c.externe ? c.url : '/api/leads (même origine)'} ; ${JSON.stringify({ ...c.json, message: court(c.json?.message, 70) })}${rejeux.length ? ` ; ${rejeux.map((x) => `${x.moteur} ${x.scenario} : ${x.recus} copies reçues (rejeu de la pile réseau), toutes conformes`).join(', ')}` : ''}`)
  }
  for (const k of ['fs2', 'fs3', 'fs4']) r[k].ok = !r[k].echecs.length && (k !== 'fs2' || r.fs2.faits.length === moteurs.length) && (k !== 'fs4' || r.fs4.faits.length === scenarios.length * moteurs.length)
  if (!r.fs2.ok && !r.fs2.echecs.length) r.fs2.echecs.push('piège non jugé dans le navigateur')
  if (!r.fs4.ok && !r.fs4.echecs.length) r.fs4.echecs.push('issues non jugées')
  // le résumé de FS-4 : par moteur, ce qui a été vu, où, et les captures
  r.fs4.resume = moteurs.map(([, , libelle]) => {
    const f = r.fs4.faits.filter((x) => x.libelle === libelle)
    if (!f.length) return `${libelle} : rien`
    const recu = f.find((x) => x.attendu === 'recu'), replis = f.filter((x) => x.attendu === 'repli')
    return `${libelle} : ${recu ? `${recu.scenario} → ${court(recu.raison, 110)}` : ''}${replis.length ? ` ; ${replis.map((x) => x.scenario).join(', ')} → ${court(replis[0].raison, 150)}` : ''} ; ${f.length} captures valables (écart-type ≥ ${Math.min(...f.map((x) => x.ecart)).toFixed(0)})${f[0].avant.length ? ` ; déjà visible(s) avant l'envoi, donc hors repli : ${f[0].avant.join(', ')}` : ''}`
  }).join(' | ')
  return r
}

// ── FS-5 : le plateau sans chiffres ───────────────────────────────────────────────────────────────────────────────────────
const SONDE_PLATEAU = `async ([citation, signature, annee, legendes]) => {
  const J = window.__juge025
  const bq = [...document.querySelectorAll('blockquote')].find((b) => J.norm(b.textContent).includes(J.norm(citation)))
  if (!bq) return { ok: false, raison: 'aucun <blockquote> ne porte la citation' }
  const sec = bq.closest('section') || bq.parentElement
  const vis = await J.visible(bq, 3000)
  const texte = J.norm(sec.innerText)
  const sansAnnee = texte.split(String(annee)).join(' ')
  const chiffres = sec.querySelectorAll('dl, [class*="chiffre"]').length
  const page = J.norm(document.body.innerText).toLowerCase()
  return { ok: true, visible: vis, section: J.desc(sec), signee: texte.includes(J.norm(signature)), chiffres, digits: (sansAnnee.match(/[0-9]+/g) || []).slice(0, 5),
    legendesPlateau: legendes.filter((l) => texte.toLowerCase().includes(J.norm(l).toLowerCase())).length,
    legendesPage: legendes.filter((l) => page.includes(J.norm(l).toLowerCase())) }
}`
/** Le HTML de la section qui contient la citation (index.html), ou null. */
function sectionDeCitation(html, citation) {
  const echappe = citation.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const i = Math.max(html.indexOf(echappe), html.indexOf(citation))
  if (i < 0) return null
  const debut = html.lastIndexOf('<section', i), fin = html.indexOf('</section>', i)
  return debut < 0 || fin < 0 ? null : html.slice(debut, fin)
}
export async function jugerPlateau({ racine, siteComplet, commande }) {
  const echecs = [], faits = []
  const a = commande.matiere.artisan
  const legendes = (a.chiffres || []).map((c) => c.legende)
  const sortie = path.join(ICI, 'site-sans-chiffres')
  const src = preparerCommande({ variante: 'sans-chiffres', dans: path.join(ICI, 'commande-sans-chiffres') })
  if (lireCommande(src).matiere?.artisan?.chiffres !== null) echecs.push('jeu d\'essai : la variante n\'a pas chiffres: null')
  const g = genererSource({ racine, source: src, sortie })
  if (g.absent || g.code !== 0) { echecs.push(`variante chiffres: null : ${g.absent ? g.derniereLigne : `code ${g.code} : « ${court(g.derniereLigne, 200)} »`}`); return { ok: false, echecs, faits } }
  const html = lireOuNull(path.join(sortie, 'index.html'))
  if (!html || !html.length) { echecs.push('variante chiffres: null : index.html absent ou vide'); return { ok: false, echecs, faits } }
  const sec = sectionDeCitation(html.toString('utf8'), a.citation)
  if (!sec) echecs.push('index.html : la citation n\'est dans aucune <section>')
  else {
    if (/class\s*=\s*["'][^"']*chiffre/i.test(sec)) echecs.push('le plateau (HTML) a un élément de classe *chiffre*')
    for (const l of legendes) if (norm(texteHtml(sec)).includes(norm(l))) echecs.push(`le plateau (HTML) porte la légende « ${l} »`)
  }
  const signature = `${a.prenom} ${a.nom}`
  const sonder = async (site) => {
    const srv = await servir(site)
    const nav = await lancerNavigateur('chromium')
    try {
      const ctx = await nav.newContext({ ...BUREAU, serviceWorkers: 'block' })
      await ctx.addInitScript({ content: AIDES_PAGE })
      await ctx.route('**/*', (route) => (route.request().url().startsWith(srv.base) ? route.continue() : route.abort('blockedbyclient')))
      const page = await ctx.newPage()
      await page.goto(`${srv.base}/`, { waitUntil: 'load', timeout: 60_000 })
      await page.waitForTimeout(600)
      const s = await page.evaluate(`(${SONDE_PLATEAU})(${JSON.stringify([a.citation, signature, a.installation, legendes])})`)
      const cap = s.ok && s.visible.ok ? await capturer(page, path.join(ICI, 'captures', `fs5-${path.basename(site)}.jpg`), { maxOctets: 1536 * 1024 }) : null
      return { ...s, capture: cap }
    } finally { await nav.close().catch(() => {}); await srv.fermer() }
  }
  const s = await sonder(sortie)
  if (!s.ok) echecs.push(`sans chiffres : ${s.raison}`)
  else {
    if (!s.visible.ok) echecs.push(`sans chiffres : citation non visible (${s.visible.raison})`)
    if (!s.signee) echecs.push(`sans chiffres : la signature « ${signature} » n'est pas dans le plateau`)
    if (s.chiffres) echecs.push(`sans chiffres : ${s.chiffres} élément(s) <dl> ou *chiffre* dans le plateau ${s.section}`)
    if (s.digits.length) echecs.push(`sans chiffres : chiffres dans le texte du plateau (${s.digits.join(', ')})`)
    if (s.legendesPage.length) echecs.push(`sans chiffres : légende(s) de la variante complète dans la page (« ${s.legendesPage[0]} »)`)
    if (s.capture && !s.capture.ok) echecs.push(`capture du plateau : ${s.capture.raisons.join(', ')}`)
  }
  // contrôle du détecteur : le site complet montre ses trois légendes dans le plateau
  if (!siteComplet) echecs.push('contrôle impossible : pas de site complet (FS-1)')
  else {
    const c = await sonder(siteComplet)
    if (!c.ok || c.legendesPlateau !== legendes.length || !c.chiffres) echecs.push(`contrôle : le plateau du site complet ne montre pas ses ${legendes.length} chiffres (${c.ok ? `${c.legendesPlateau} légende(s), ${c.chiffres} élément(s) *chiffre*` : c.raison}) — le détecteur ne distingue rien`)
    else faits.push(`contrôle : plateau complet ${c.section} avec ${c.legendesPlateau} légendes et ${c.chiffres} élément(s) *chiffre*`)
  }
  if (s.ok && !echecs.length) faits.unshift(`code 0 ; plateau ${s.section} : citation visible (${court(s.visible.raison, 90)}), signée « ${signature} », 0 élément *chiffre*, aucun chiffre hors l'année ${a.installation}`)
  return { ok: !echecs.length, echecs, faits }
}

// ── FS-8 : l'adresse du site sans domaine (relecture à froid du 24/09, G4) ────────────────────────────────────────────────
/** L'adresse publique d'un site sans domaine, lue dans <racine>/lib/urls.ts : BASE_PRESTI + le chemin « site » du mode presti. */
// 25/09 (revue avant mise en ligne, D21) : FS-8 ne juge plus que le DOMAINE (celui de BASE_PRESTI). Le chemin /site/<slug> qu'il
// exigeait est le site historique, pas le site généré, servi sous /site-genere/<id> : GV-5 de scripts/generateur-vente-qa.mjs
// juge, par le service simulé, que chaque adresse mène à sa page. `slug` reste accepté (appelants).
export function adresseSansDomaine(racine, _slug) {
  const src = lireOuNull(path.join(racine, 'lib', 'urls.ts'))?.toString('utf8') || ''
  const base = (/export\s+const\s+BASE_PRESTI\s*=\s*['"`](https?:\/\/[^'"`]+?)\/?['"`]/.exec(src) || [])[1]
  return base ? { base: base.replace(/\/$/, ''), hote: new URL(base).hostname, origine: 'lib/urls.ts (BASE_PRESTI)' } : null
}
/** Les fichiers d'un site que lisent les moteurs et les réseaux (pages, sitemap.xml, robots.txt) → Map(rel → texte). */
export function fichiersPublics(site) {
  const m = new Map()
  for (const f of [...listerFichiers(site)].sort()) if (/\.(?:html?|xml|txt)$/i.test(f)) m.set(f, fs.readFileSync(path.join(site, f), 'utf8'))
  return m
}
const HOTES_EXTERNES = /(?:^|\.)(?:schema\.org|wikimedia\.org|wikipedia\.org|creativecommons\.org|google\.[a-z.]+|googleapis\.com|gstatic\.com|w3\.org|sitemaps\.org)$/i
/** FS-8 sur les fichiers d'un site → { echecs, faits } */
export function defautsAdresse(fichiers, attendu, slug) {
  const echecs = [], n = { canon: 0, ogurl: 0, ogimg: 0, ld: 0, loc: 0, robots: 0 }
  const verifier = (ou, quoi, u) => { if (!String(u).startsWith(attendu.base)) echecs.push(`${ou} : ${quoi} « ${court(u, 90)} », ${attendu.base}… attendu (${attendu.origine})`) }
  for (const [f, t] of fichiers) {
    if (/\.html?$/i.test(f)) {
      for (const m of t.matchAll(/<link\b[^>]*\brel\s*=\s*["']canonical["'][^>]*>/gi)) { const h = /\bhref\s*=\s*["']([^"']*)["']/i.exec(m[0]); n.canon++; verifier(f, 'canonique', h ? h[1] : '(sans href)') }
      for (const m of t.matchAll(/<meta\b[^>]*\bproperty\s*=\s*["']og:(url|image)["'][^>]*>/gi)) { const c = /\bcontent\s*=\s*["']([^"']*)["']/i.exec(m[0]); n[m[1].toLowerCase() === 'url' ? 'ogurl' : 'ogimg']++; verifier(f, `og:${m[1]}`, c ? c[1] : '(sans content)') }
      for (const m of t.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
        let j
        try { j = JSON.parse(m[1]) } catch { echecs.push(`${f} : JSON-LD illisible`); continue }
        const urls = []
        const tous = (o, k = '') => { if (typeof o === 'string') { if (/^https?:\/\//i.test(o)) urls.push([k, o]) } else if (o && typeof o === 'object') for (const [kk, v] of Object.entries(o)) tous(v, kk) }
        tous(j)
        for (const [k, u] of urls) {
          let h = ''
          try { h = new URL(u).hostname } catch { /* illisible */ }
          if (['url', '@id', 'image', 'logo'].includes(k) || /presti/i.test(h) || h.endsWith('.invalid') || u.includes(`/${slug}`)) { n.ld++; if (!HOTES_EXTERNES.test(h)) verifier(f, `JSON-LD ${k}`, u) }
        }
      }
    }
    if (/sitemap[^/]*\.xml$/i.test(f)) for (const m of t.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) { n.loc++; verifier(f, 'loc', m[1]) }
    if (/(?:^|\/)robots\.txt$/i.test(f)) for (const m of t.matchAll(/^\s*sitemap\s*:\s*(\S+)/gim)) { n.robots++; verifier(f, 'Sitemap', m[1]) }
    // toute adresse d'un domaine « presti » autre que celui de lib/urls.ts, ou d'un domaine de démonstration (.invalid)
    for (const m of t.matchAll(/https?:\/\/[^\s"'<>)]+/gi)) {
      let h = ''
      try { h = new URL(m[0]).hostname } catch { continue }
      if ((/presti/i.test(h) && h !== attendu.hote) || h.endsWith('.invalid')) echecs.push(`${f} : adresse « ${court(m[0], 80)} » (domaine ${h}, ${attendu.hote} attendu)`)
    }
  }
  const manque = [['canonique', n.canon], ['og:url', n.ogurl], ['og:image', n.ogimg], ['JSON-LD', n.ld], ['sitemap.xml <loc>', n.loc], ['robots.txt Sitemap:', n.robots]].filter(([, x]) => !x).map(([k]) => k)
  if (manque.length) echecs.push(`rien à juger pour : ${manque.join(', ')} (le site doit les porter)`)
  return { echecs: [...new Set(echecs)], faits: [`${n.canon} canonique(s), ${n.ogurl} og:url, ${n.ogimg} og:image, ${n.ld} adresse(s) JSON-LD, ${n.loc} <loc>, ${n.robots} Sitemap: — toutes sous ${attendu.base}`] }
}
export function jugerAdresse({ racine, site, commande }) {
  const attendu = adresseSansDomaine(racine, commande.slug)
  if (commande.domaine) return { ok: false, echecs: ['jeu d’essai : la commande a un domaine, FS-8 juge le cas sans domaine'], faits: [] }
  if (!attendu) return { ok: false, echecs: [`${rel(path.join(racine, 'lib', 'urls.ts'))} : BASE_PRESTI illisible`], faits: [] }
  const fichiers = fichiersPublics(site)
  const r = defautsAdresse(fichiers, attendu, commande.slug)
  // mutation : la canonique de l'accueil renvoyée sur un autre domaine doit être vue
  const mute = new Map(fichiers)
  const idx = mute.get('index.html') || ''
  const faux = attendu.base.replace(`://${attendu.hote}`, `://presti.fr`)
  mute.set('index.html', idx.replace(/(<link\b[^>]*\brel\s*=\s*["']canonical["'][^>]*\bhref\s*=\s*["'])[^"']*/i, `$1${faux}/`))
  const vue = defautsAdresse(mute, attendu, commande.slug).echecs.some((e) => e.includes(faux))
  if (!vue && /rel\s*=\s*["']canonical/i.test(idx)) r.echecs.push(`détecteur aveugle : une canonique ${faux}/ n’est pas vue`)
  if (!r.echecs.length) r.faits.push(`mutation : canonique de l’accueil sur ${faux}/ → vue`)
  return { ok: !r.echecs.length, echecs: r.echecs, faits: [`sans domaine, adresse attendue ${attendu.base} (${attendu.origine})`, ...r.faits] }
}

// ── FS-9 : les libellés du formulaire sont ceux du métier (G3) ────────────────────────────────────────────────────────────
export const COMMANDE_PLOMBIER = path.join(FIXTURES, 'commande-plombier.json')
/** Le texte d'un formulaire de devis : libellés, légendes, placeholders, aria-label, title, boutons et notes (options exclues : elles viennent de la commande). */
export function texteFormulaire(html) {
  const f = /<form\b[^>]*>[\s\S]*?<\/form>/gi
  const formes = [...String(html).matchAll(f)].map((m) => m[0]).filter((x) => /\bname\s*=\s*["']?contact\b/i.test(x) || /class\s*=\s*["'][^"']*devis/i.test(x.slice(0, 300)))
  const morceaux = []
  for (const x of formes) {
    const sansOptions = x.replace(/<option\b[\s\S]*?<\/option>/gi, ' ')
    morceaux.push(texteHtml(sansOptions))
    for (const a of sansOptions.matchAll(/\b(?:placeholder|aria-label|title|value)\s*=\s*"([^"]*)"/gi)) morceaux.push(a[1])
  }
  return { n: formes.length, texte: morceaux.join('\n') }
}
export async function jugerLibellesMetier({ racine }) {
  const { motsDesMetiers, motsEtrangers } = await import('./fixtures/025/commun.mjs')
  const echecs = [], faits = []
  const plombier = lireJson(COMMANDE_PLOMBIER)
  const dico = motsDesMetiers(racine)
  if (dico.modeles.length < 2) return { ok: false, echecs: [`${dico.modeles.length} modèle(s) de métier sous maquettes/modeles/ : pas de dictionnaire des métiers (deux modèles au moins)`], faits }
  const src = exigerSousTravail(path.join(ICI, 'commande-plombier'))
  fs.rmSync(src, { recursive: true, force: true })
  fs.cpSync(COMMANDE_EXEMPLE, src, { recursive: true })
  fs.writeFileSync(path.join(src, 'commande.json'), `${JSON.stringify(plombier, null, 2)}\n`)
  const sortie = path.join(ICI, 'site-plombier')
  const g = genererSource({ racine, source: src, sortie })
  if (g.absent || g.code !== 0) return { ok: false, echecs: [`commande de plombier : ${g.absent ? g.derniereLigne : `code ${g.code} : « ${court(g.derniereLigne, 200)} »`}`], faits }
  const admis = [plombier.nom, ...plombier.communes, ...(plombier.devis?.projets || []), ...(plombier.devis?.delais || [])].join(' ')
  let formulaires = 0
  let texteAccueil = ''
  for (const p of pagesHtml(sortie)) {
    const { n, texte } = texteFormulaire(fs.readFileSync(path.join(sortie, p), 'utf8'))
    formulaires += n
    if (p === 'index.html') texteAccueil = texte
    for (const h of motsEtrangers(texte, plombier.metier, dico, admis)) echecs.push(`${p} : « ${h.mot} » (propre au modèle ${h.modele}) dans le formulaire d’un plombier : « ${h.extrait} »`)
  }
  if (!formulaires) echecs.push('aucun formulaire de devis dans le site du plombier')
  // mutation : un libellé du menuisier (ou d'un autre métier) glissé dans le formulaire doit être vu
  const autre = dico.modeles.find((x) => x !== plombier.metier && dico.propres.get(x).size)
  const mot = autre ? [...dico.propres.get(autre)].sort((a, b) => b[1] - a[1])[0][0] : null
  const vue = mot ? motsEtrangers(`${texteAccueil}\nLe projet, la pièce, le ${mot}`, plombier.metier, dico, admis).some((h) => h.modele === autre) : false
  if (!vue) echecs.push(`détecteur aveugle : « ${mot} » (propre à ${autre}) glissé dans le formulaire n’est pas vu`)
  if (!echecs.length) faits.push(`commande de plombier générée (${g.secondes.toFixed(1)} s) : ${formulaires} formulaire(s) sans mot propre à un autre métier (dictionnaire tiré de ${dico.modeles.length} modèles : ${[...dico.propres].map(([m, x]) => `${m} ${[...x.keys()].join('/') || '—'}`).join(', ')}) ; mutation : « ${mot} » glissé → vu`)
  return { ok: !echecs.length, echecs, faits }
}

// ── FS-10 : le repli d'une commande sans téléphone ni e-mail (M1) ─────────────────────────────────────────────────────────
/** Les défauts de liens et de repli d'un site → liste */
export function defautsReplis(fichiers) {
  const d = []
  for (const [f, t] of fichiers) {
    if (!/\.html?$/i.test(f) && !/\.js$/i.test(f)) continue
    for (const m of t.matchAll(/href\s*=\s*["']\s*tel:([^"']*)["']/gi)) if (m[1].replace(/\D/g, '').length < 6) d.push(`${f} : lien « tel:${m[1]} » sans numéro`)
    for (const m of t.matchAll(/href\s*=\s*["']\s*mailto:([^"']*)["']/gi)) if (!/^[^@\s?]+@[^@\s?]+\.[^@\s?]+/.test(decodeURIComponent(m[1]).trim())) d.push(`${f} : lien « mailto:${m[1]} » sans adresse`)
    if (/(?:tel|mailto):(?:undefined|null)\b|>\s*(?:undefined|null)\s*</i.test(t)) d.push(`${f} : « undefined » ou « null » écrit à la place d’une coordonnée`)
    if (!/\.html?$/i.test(f)) continue
    for (const m of t.matchAll(/<(?:div|p|section|aside)\b[^>]*(?:role\s*=\s*["']alert["']|class\s*=\s*["'][^"']*(?:echec|repli)[^"']*["'])[^>]*>([\s\S]*?)<\/(?:div|p|section|aside)>/gi)) {
      const x = texteHtml(m[1]).replace(/\s+/g, ' ').trim()
      if ((x.match(/\p{L}{2,}/gu) || []).length < 3) d.push(`${f} : repli vide ou presque (« ${court(x, 60)} »)`)
      const pendant = /(?<![\p{L}])(?:au|à|a|ou)\s*(?:[.,;:!]|$)|(?<![\p{L}])au\s+ou(?![\p{L}])/iu.exec(x)
      if (pendant) d.push(`${f} : repli qui renvoie vers rien : « ${court(x, 110)} »`)
    }
  }
  return [...new Set(d)]
}
export function jugerReplisSansCoordonnees({ racine }) {
  const echecs = [], faits = []
  const c = lireCommande()
  const variante = structuredClone(c)
  delete variante.telephone; delete variante.email
  variante._ = `Copie de commande-exemple/commande.json par ${JUGE} (FS-10) : ni téléphone ni e-mail, comme une commande faite par /site/commander.`
  const src = exigerSousTravail(path.join(ICI, 'commande-sans-coordonnees'))
  fs.rmSync(src, { recursive: true, force: true })
  fs.cpSync(COMMANDE_EXEMPLE, src, { recursive: true })
  fs.writeFileSync(path.join(src, 'commande.json'), `${JSON.stringify(variante, null, 2)}\n`)
  const sortie = path.join(ICI, 'site-sans-coordonnees')
  const g = genererSource({ racine, source: src, sortie })
  if (g.absent || g.code !== 0) return { ok: false, echecs: [`commande sans téléphone ni e-mail : ${g.absent ? g.derniereLigne : `code ${g.code} : « ${court(g.derniereLigne, 200)} »`}`], faits }
  const fichiers = new Map([...listerFichiers(sortie)].filter((f) => /\.(?:html?|js)$/i.test(f)).map((f) => [f, fs.readFileSync(path.join(sortie, f), 'utf8')]))
  const idx = fichiers.get('index.html') || ''
  if (!/<form\b/i.test(idx)) echecs.push('index.html sans formulaire')
  if (!/role\s*=\s*["']alert["']|class\s*=\s*["'][^"']*(?:echec|repli)/i.test(idx)) echecs.push('index.html : aucun repli (role="alert", classe *echec* ou *repli*) : l’échec d’envoi ne serait pas dit')
  echecs.push(...defautsReplis(fichiers))
  // mutation : le repli d'aujourd'hui (liens vides) doit être vu
  const sonde = new Map([['sonde.html', '<div class="devis__echec" role="alert">L’envoi n’a pas abouti. Appelez-moi au <a href="tel:"></a> ou écrivez-moi à <a href="mailto:"></a>.</div>']])
  const vus = defautsReplis(sonde)
  if (vus.length < 2) echecs.push(`détecteur aveugle : le repli à liens vides n’est pas vu (${vus.length} défaut(s))`)
  if (!echecs.length) faits.push(`commande sans téléphone ni e-mail générée (${g.secondes.toFixed(1)} s) : ${fichiers.size} fichier(s), aucun lien tel:/mailto: vide, repli présent et qui ne renvoie pas vers rien ; mutation : repli « Appelez-moi au  ou écrivez-moi à . » → vu`)
  return { ok: !echecs.length, echecs, faits }
}

// ── FS-11 : un compte purgé ne reçoit plus de demande par son ancienne adresse (M7) ──────────────────────────────────────
// La route réelle (<racine>/app/api/leads/route.ts), transpilée par TypeScript et lancée dans ce processus contre un FAUX
// Supabase en mémoire : lib/slugRedirect.ts (et tout autre module de <racine>/lib/ qu'elle importerait) est chargé de la
// racine ; supabaseAdmin est le faux ; les modules de sécurité, d'IA, d'e-mail, de crédits… sont remplacés par des doublures
// muettes (rien ne part). La base simulée tient deux artisans : un compte PURGÉ (lib/purgeComptes.ts : slug supprime-<8>,
// e-mail anonymisé, leads_pause, site et page éteints ; le trigger de 0051 a gardé l'ancien slug dans slugs_anciens) et un
// compte VIVANT dont l'adresse a changé (0051). La fonction artisan_par_ancien_slug est celle de 0051 (slugs_anciens @> [slug]).
const PURGE_ID = '00000000-0000-4000-8000-0000000251a1'
const VIVANT_ID = '00000000-0000-4000-8000-0000000251b2'
const PAUSE_ID = '00000000-0000-4000-8000-0000000251c3'
// 15/10 (Benj) : la plateforme commence avec Studio — les comptes de ces bases sont en Studio : ce juge règle le routage par slug et par commande, pas l'offre
// (le refus d'un compte Essai / Essentiel est jugé par scripts/plateforme-formulaire-qa.mjs).
function baseSimulee() {
  return {
    artisans: [
      { id: PURGE_ID, slug: 'supprime-00000000', slugs_anciens: ['ancien-essai-025'], nom: 'Menuiserie Purgée (identité d’émetteur gardée)', metier: 'menuisier', email: 'supprime-00000000@supprime.invalid', email_public: null, tel_public: null, leads_pause: true, site_active: false, plateforme_active: false, suppression_demandee_le: null, plan: 'essentiel', is_founder: false, ton_style: null, services: [], zone_intervention: null, bio: null, tva_regime: null, assurance_nom: null, domaine: null, domaine_verifie: false },
      { id: VIVANT_ID, slug: 'nouveau-essai-025', slugs_anciens: ['vieux-essai-025'], nom: 'Atelier Vivant', metier: 'menuisier', email: 'atelier@vivant.invalid', leads_pause: false, site_active: true, plateforme_active: true, suppression_demandee_le: null, plan: 'studio', is_founder: false, ton_style: null, services: [], zone_intervention: null, bio: null, tva_regime: null, assurance_nom: null, domaine: null, domaine_verifie: false },
      { id: PAUSE_ID, slug: 'pause-essai-025', slugs_anciens: [], nom: 'Atelier En Pause', metier: 'plombier', email: 'atelier@pause.invalid', leads_pause: true, site_active: true, plateforme_active: true, suppression_demandee_le: null, plan: 'studio', is_founder: false, ton_style: null, services: [], zone_intervention: null, bio: null, tva_regime: null, assurance_nom: null, domaine: null, domaine_verifie: false },
    ],
    leads: [], messages: [],
  }
}
export const SCENARIOS_PURGE = [
  { nom: 'compte purgé, ancienne adresse', slug: 'ancien-essai-025', attendu: 404 },
  { nom: 'compte purgé, adresse supprime-…', slug: 'supprime-00000000', attendu: 404 },
  { nom: 'compte vivant, ancienne adresse (0051)', slug: 'vieux-essai-025', attendu: 200, artisan: VIVANT_ID },
  { nom: 'compte vivant, adresse actuelle', slug: 'nouveau-essai-025', attendu: 200, artisan: VIVANT_ID },
  { nom: 'compte en pause (vivant)', slug: 'pause-essai-025', attendu: 200, artisan: PAUSE_ID },
]
const likeRe = (motif, casse) => new RegExp(`^${String(motif).split('').map((c) => (c === '%' ? '.*' : c === '_' ? '.' : c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('')}$`, casse ? 'i' : '')
/** Liste de colonnes PostgREST découpée au premier niveau (les parenthèses des ressources jointes sont gardées). */
function decouperColonnes(liste) {
  const out = []
  let prof = 0, cur = ''
  for (const c of String(liste)) {
    if (c === '(') prof++
    if (c === ')') prof--
    if (c === ',' && prof === 0) { out.push(cur.trim()); cur = '' } else cur += c
  }
  if (cur.trim()) out.push(cur.trim())
  return out
}
/** FS-12 : une ligne réduite aux colonnes demandées, comme PostgREST ; « alias:table!indice(colonnes) » suit la clé étrangère. */
function projeterLigne(base, table, ligne, colonnes) {
  if (colonnes === undefined || colonnes === null || String(colonnes).trim() === '*') return { ...ligne }
  const out = {}
  for (const item of decouperColonnes(colonnes)) {
    if (item === '*') { Object.assign(out, ligne); continue }
    const emb = /^(?:([\w$]+)\s*:\s*)?([\w$]+)(?:\s*!\s*([\w$]+))?\s*\(([\s\S]*)\)$/.exec(item)
    if (emb) {
      const [, alias, cible, indice, sous] = emb
      const lignesCible = base[cible] || []
      const fk = Object.keys(ligne).filter((k) => k.endsWith('_id') && (indice && indice !== 'inner' && indice !== 'left' ? indice.includes(k) : k === `${cible.replace(/s$/, '')}_id`)).sort((a, b) => b.length - a.length)[0]
      if (fk) { const r = lignesCible.find((x) => x.id === ligne[fk]); out[alias || cible] = r ? projeterLigne(base, cible, r, sous) : null }
      else out[alias || cible] = lignesCible.filter((x) => x[`${table.replace(/s$/, '')}_id`] === ligne.id).map((x) => projeterLigne(base, cible, x, sous))
      continue
    }
    const col = /^(?:([\w$]+)\s*:\s*)?([\w$]+)(?:::[\w$]+)?$/.exec(item)
    if (col) { out[col[1] || col[2]] = ligne[col[2]] === undefined ? null : ligne[col[2]]; continue }
    return { ...ligne } // expression non simulée : la ligne entière
  }
  return out
}
function fauxSupabase(base, { projeter = false } = {}) {
  const journal = []
  const filtre = (op, col, val) => {
    const v = (r) => r[col]
    switch (op) {
      case 'eq': return (r) => v(r) === val
      case 'neq': return (r) => v(r) !== val
      case 'gt': return (r) => v(r) > val
      case 'gte': return (r) => v(r) >= val
      case 'lt': return (r) => v(r) < val
      case 'lte': return (r) => v(r) <= val
      case 'like': return (r) => typeof v(r) === 'string' && likeRe(val, false).test(v(r))
      case 'ilike': return (r) => typeof v(r) === 'string' && likeRe(val, true).test(v(r))
      case 'is': return (r) => (v(r) ?? null) === (val === 'null' ? null : val)
      case 'in': { const l = Array.isArray(val) ? val : String(val).replace(/^\(|\)$/g, '').split(',').map((x) => x.trim().replace(/^"|"$/g, '')); return (r) => l.includes(v(r)) }
      case 'cs': case 'contains': { const l = Array.isArray(val) ? val : String(val).replace(/^\{|\}$/g, '').split(',').map((x) => x.trim()); return (r) => Array.isArray(v(r)) && l.every((x) => v(r).includes(x)) }
      default: throw new Error(`faux Supabase : opérateur « ${op} » non simulé`)
    }
  }
  const lireOr = (expr) => String(expr).split(',').map((p) => { const [c, op, ...reste] = p.split('.'); const neg = op === 'not'; const vraiOp = neg ? reste.shift() : op; const f = filtre(vraiOp, c, reste.join('.')); return neg ? (r) => !f(r) : f })
  class Requete {
    constructor(table) { this.table = table; this.filtres = []; this.op = 'select'; this.valeur = null; this.unique = null; this.lim = null; this.colonnes = null }
    select(c) { this.colonnes = c ?? '*'; return this }
    insert(v) { this.op = 'insert'; this.valeur = v; return this }
    upsert(v) { this.op = 'insert'; this.valeur = v; return this }
    update(v) { this.op = 'update'; this.valeur = v; return this }
    delete() { this.op = 'delete'; return this }
    eq(c, v) { this.filtres.push(filtre('eq', c, v)); return this }
    neq(c, v) { this.filtres.push(filtre('neq', c, v)); return this }
    gt(c, v) { this.filtres.push(filtre('gt', c, v)); return this }
    gte(c, v) { this.filtres.push(filtre('gte', c, v)); return this }
    lt(c, v) { this.filtres.push(filtre('lt', c, v)); return this }
    lte(c, v) { this.filtres.push(filtre('lte', c, v)); return this }
    like(c, v) { this.filtres.push(filtre('like', c, v)); return this }
    ilike(c, v) { this.filtres.push(filtre('ilike', c, v)); return this }
    is(c, v) { this.filtres.push(filtre('is', c, v)); return this }
    in(c, v) { this.filtres.push(filtre('in', c, v)); return this }
    contains(c, v) { this.filtres.push(filtre('cs', c, v)); return this }
    not(c, op, v) { const f = filtre(op, c, v); this.filtres.push((r) => !f(r)); return this }
    filter(c, op, v) { this.filtres.push(filtre(op, c, v)); return this }
    match(o) { for (const [c, v] of Object.entries(o)) this.eq(c, v); return this }
    or(expr) { const fs2 = lireOr(expr); this.filtres.push((r) => fs2.some((f) => f(r))); return this }
    order() { return this }
    range() { return this }
    limit(n) { this.lim = n; return this }
    maybeSingle() { this.unique = 'maybe'; return this }
    single() { this.unique = 'single'; return this }
    then(ok, ko) { return Promise.resolve().then(() => this.executer()).then(ok, ko) }
    executer() {
      const t = base[this.table] || (base[this.table] = [])
      journal.push({ table: this.table, op: this.op, valeur: this.valeur })
      let lignes
      if (this.op === 'insert') {
        lignes = (Array.isArray(this.valeur) ? this.valeur : [this.valeur]).map((v) => ({ id: crypto.randomUUID(), token: crypto.randomBytes(8).toString('hex'), ...v }))
        t.push(...lignes)
      } else {
        lignes = t.filter((r) => this.filtres.every((f) => f(r)))
        if (this.op === 'update') for (const r of lignes) Object.assign(r, this.valeur)
        if (this.op === 'delete') base[this.table] = t.filter((r) => !lignes.includes(r))
      }
      if (this.lim !== null) lignes = lignes.slice(0, this.lim)
      // FS-12 : comme PostgREST, seulement les colonnes demandées (une écriture sans .select() ne rend rien).
      if (projeter) lignes = this.op !== 'select' && this.colonnes === null ? [] : lignes.map((l) => projeterLigne(base, this.table, l, this.colonnes))
      const copie = JSON.parse(JSON.stringify(lignes))
      if (this.unique === 'single') return copie.length === 1 ? { data: copie[0], error: null } : { data: null, error: { message: `${copie.length} ligne(s), une attendue` } }
      if (this.unique === 'maybe') return copie.length > 1 ? { data: null, error: { message: 'plusieurs lignes' } } : { data: copie[0] ?? null, error: null }
      return { data: copie, error: null }
    }
  }
  return {
    journal,
    from: (t) => new Requete(t),
    rpc: async (nom, args = {}) => {
      journal.push({ table: `rpc:${nom}`, op: 'rpc', valeur: args })
      if (nom === 'artisan_par_ancien_slug') { const r = base.artisans.find((a) => (a.slugs_anciens || []).includes(args.p_slug)); return { data: r ? [{ slug: r.slug, domaine: r.domaine ?? null, domaine_verifie: r.domaine_verifie ?? null }] : [], error: null } }
      return { data: null, error: { message: `faux Supabase : rpc « ${nom} » non simulée` } }
    },
    storage: { from: () => ({ upload: async () => ({ error: null }), getPublicUrl: () => ({ data: { publicUrl: 'https://stockage.invalid/x' } }) }) },
    auth: { admin: {}, getUser: async () => ({ data: { user: null }, error: null }) },
  }
}
const muet = () => new Proxy(function () {}, { get: (_, k) => (k === 'then' ? undefined : muet()), apply: () => Promise.resolve(undefined) })
function doublures(sb, journal) {
  const note = (quoi) => (...a) => { journal.push({ table: `doublure:${quoi}`, op: 'appel', valeur: a.length }); return Promise.resolve(undefined) }
  return {
    'next/server': { NextResponse: { json: (corps, init = {}) => ({ __reponse: true, status: init.status ?? 200, corps }) } },
    '@/lib/supabaseAdmin': { supabaseAdmin: sb },
    '@/lib/security': { getIp: () => '203.0.113.25', isBanned: async () => false, recordAbuse: note('recordAbuse'), ipPseudonyme: () => 'ip-essai' },
    '@/lib/limites': { consommerLimite: async () => true, consommerLimiteStricte: async () => true },
    '@/lib/suspension': { suspensionEnCours: async () => false, MESSAGE_PUBLIC_INDISPONIBLE: 'Ce lien de contact n’est plus actif pour le moment.' },
    '@/lib/ai': { qualifyLead: () => ({ urgence: 'normale', type_chantier: null }), generateLeadReply: async () => ({ text: 'réponse d’essai' }) },
    '@/lib/plateformeConfig': { getPlateformeConfig: async () => ({}), decisionReponse: () => ({ ok: false, raison: 'assistee' }) },
    '@/lib/email': { sendEmail: note('sendEmail'), notifierEntreprise: note('notifierEntreprise') },
    '@/lib/notifications': { notifierArtisan: note('notifierArtisan') },
    '@/lib/credits': { consumeCredit: async () => ({ ok: false }), rendreCredit: note('rendreCredit') },
    '@/lib/alerteService': { signalerPanneIA: note('signalerPanneIA') },
    '@/lib/quotaMedia': { porteMonnaieConversation: async () => ({ accepte: () => false, octets: () => 0 }) },
    '@/lib/stripe': { stripe: muet() },
  }
}
/** Charge <racine>/app/api/leads/route.ts (ou `routeSource`) dans ce processus, contre le faux Supabase → { POST, journal, base, traces } */
export async function chargerRoute({ racine, routeSource = null, base = baseSimulee(), projeter = false }) {
  const ts = (await import('typescript')).default
  const { createRequire } = await import('node:module')
  const requireNode = createRequire(import.meta.url)
  const sb = fauxSupabase(base, { projeter })
  const traces = []
  const consoleMuette = { log: () => {}, info: () => {}, debug: () => {}, warn: (...a) => traces.push(`warn ${a.map(String).join(' ')}`), error: (...a) => traces.push(`error ${a.map(String).join(' ')}`) }
  const stubs = doublures(sb, sb.journal)
  const caches = new Map()
  const resoudre = (spec, depuis) => {
    const cands = []
    if (spec.startsWith('@/')) cands.push(path.join(racine, spec.slice(2)))
    else if (spec.startsWith('.')) cands.push(path.resolve(path.dirname(depuis), spec))
    else return null
    for (const c of cands) for (const e of ['', '.ts', '.tsx', '.js', '.mjs', '/index.ts']) if (fs.existsSync(c + e) && fs.statSync(c + e).isFile()) return c + e
    return null
  }
  const charger = (fichier, source) => {
    if (caches.has(fichier)) return caches.get(fichier).exports
    const js = ts.transpileModule(source ?? fs.readFileSync(fichier, 'utf8'), { fileName: fichier, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText
    const module = { exports: {} }
    caches.set(fichier, module)
    const req = (spec) => {
      if (Object.prototype.hasOwnProperty.call(stubs, spec)) return stubs[spec]
      if (spec.startsWith('node:') || requireNode('node:module').builtinModules.includes(spec)) return requireNode(spec)
      const f = resoudre(spec, fichier)
      if (f) return charger(f)
      return muet() // paquet npm ou module absent : doublure muette
    }
    new Function('exports', 'require', 'module', '__filename', '__dirname', 'console', 'process', js)(module.exports, req, module, fichier, path.dirname(fichier), consoleMuette, { env: {} })
    return module.exports
  }
  const routeFichier = path.join(racine, 'app', 'api', 'leads', 'route.ts')
  if (routeSource === null && !fichierNonVide(routeFichier)) throw new Error('app/api/leads/route.ts absent ou vide')
  const mod = charger(routeFichier, routeSource)
  if (typeof mod.POST !== 'function') throw new Error('route.ts n’exporte pas POST')
  return { POST: mod.POST, journal: sb.journal, base, traces }
}
/** Joue les scénarios de SCENARIOS_PURGE, une base neuve chacun → { echecs, faits } */
export async function jouerPurge({ racine, routeSource = null }) {
  const echecs = [], faits = []
  for (const sc of SCENARIOS_PURGE) {
    const r = await chargerRoute({ racine, routeSource })
    const req = { json: async () => ({ slug: sc.slug, contact: NUMERO_ESSAI, nom_prospect: null, message: 'Projet : Escalier · Commune : Rennes · Quand : Dans les trois mois', website: '' }), headers: new Headers({ 'x-forwarded-for': '203.0.113.25' }) }
    let rep
    try { rep = await r.POST(req) } catch (e) { echecs.push(`${sc.nom} : POST lève ${premiereLigne(e)}`); continue }
    const statut = rep?.status
    const inseres = r.base.leads
    const d = []
    if (statut !== sc.attendu) d.push(`répond ${statut} (${court(JSON.stringify(rep?.corps), 80)}), ${sc.attendu} attendu`)
    if (sc.attendu === 404 && inseres.length) d.push(`${inseres.length} demande(s) enregistrée(s) pour ${inseres.map((l) => l.artisan_id === PURGE_ID ? 'le compte purgé' : l.artisan_id).join(', ')} : perdue(s)`)
    if (sc.attendu === 200 && !(inseres.length === 1 && inseres[0].artisan_id === sc.artisan)) d.push(`${inseres.length} demande(s) enregistrée(s) (${inseres.map((l) => l.artisan_id).join(', ') || 'aucune'}), une pour ${sc.artisan} attendue`)
    if (d.length) echecs.push(`${sc.nom} (slug ${sc.slug}) : ${d.join(', ')}${r.traces.length ? ` [journal de la route : ${court(r.traces.join(' | '), 160)}]` : ''}`)
    else faits.push(`${sc.nom} → ${statut}`)
  }
  return { echecs, faits }
}
// Sondes du détecteur : une route minimale qui retrouve l'ancienne adresse sans écarter les comptes purgés (doit échouer),
// et la même qui les écarte (doit passer). Elles importent le vrai lib/slugRedirect de la racine.
const ROUTE_SONDE = (garde) => `import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { artisanParAncienSlug } from '@/lib/slugRedirect'
export async function POST(req: Request) {
  const b = await req.json()
  let { data: a } = await supabaseAdmin.from('artisans').select('id, slug, leads_pause').eq('slug', b.slug).maybeSingle()
  if (!a) { const x = await artisanParAncienSlug(b.slug); if (x) a = (await supabaseAdmin.from('artisans').select('id, slug').eq('slug', x.slug).maybeSingle()).data }
  ${garde}
  if (!a) return NextResponse.json({ error: 'Artisan introuvable' }, { status: 404 })
  await supabaseAdmin.from('leads').insert({ artisan_id: a.id, contact: b.contact })
  return NextResponse.json({ ok: true })
}
`
export async function jugerComptePurge({ racine }) {
  const echecs = [], faits = []
  let r
  try { r = await jouerPurge({ racine }) } catch (e) { return { ok: false, echecs: [`route non chargée contre le faux Supabase : ${premiereLigne(e)}`], faits } }
  echecs.push(...r.echecs)
  let sondes = ''
  try {
    const mauvaise = await jouerPurge({ racine, routeSource: ROUTE_SONDE('') })
    const bonne = await jouerPurge({ racine, routeSource: ROUTE_SONDE("if (a && String(a.slug).startsWith('supprime-')) a = null") })
    if (!mauvaise.echecs.some((e) => e.startsWith(SCENARIOS_PURGE[0].nom))) echecs.push('détecteur aveugle : une route qui ne filtre pas les comptes purgés passe le scénario du compte purgé')
    if (bonne.echecs.length) echecs.push(`détecteur trop strict : une route qui écarte les comptes purgés échoue (${court(bonne.echecs[0], 120)})`)
    sondes = `mutation : route sans exclusion → ${mauvaise.echecs.length} scénario(s) rouge(s), vue ; route avec exclusion → verte`
  } catch (e) { echecs.push(`sondes du détecteur : ${premiereLigne(e)}`) }
  if (!echecs.length) faits.push(`${rel(path.join(racine, 'app', 'api', 'leads', 'route.ts'))} contre un faux Supabase (0051 simulée) : ${r.faits.join(', ')} ; ${sondes} ; sur un 404, le site montre le repli (FS-4)`)
  return { ok: !echecs.length, echecs, faits }
}

// ── FS-12 : la demande d'un site commandé va à l'artisan de sa commande, jamais à celui qui porte le slug (D01) ──────────────
// Le scénario de D01 : l'artisan A (slug martin-plomberie-025) a un site commandé en ligne ; son compte est purgé (slug
// supprime-…, ancien slug gardé par 0051) ; un inconnu reprend le slug. Par le slug, chaque prospect du site de A irait chez
// l'inconnu. Par la commande (sites_commandes.artisan_id), la demande est refusée (404) et le site montre son repli (FS-4).
const CMD = {
  ok: '00000000-0000-4000-8000-00000025c001', purge: '00000000-0000-4000-8000-00000025c002', efface: '00000000-0000-4000-8000-00000025c003',
  suppression: '00000000-0000-4000-8000-00000025c004', validee: '00000000-0000-4000-8000-00000025c005', pause: '00000000-0000-4000-8000-00000025c006',
  inconnue: '00000000-0000-4000-8000-00000025c0ff',
}
const A_COMMANDE = '00000000-0000-4000-8000-0000000252a1'
const A_PURGE = '00000000-0000-4000-8000-0000000252b2'
const A_REPRISE = '00000000-0000-4000-8000-0000000252c3'
const A_SUPPRESSION = '00000000-0000-4000-8000-0000000252d4'
const A_PAUSE = '00000000-0000-4000-8000-0000000252e5'
const NOMS_ARTISANS = { [A_COMMANDE]: 'l’artisan de la commande', [A_PURGE]: 'le compte purgé', [A_REPRISE]: 'l’inconnu qui a repris l’adresse', [A_SUPPRESSION]: 'le compte en suppression', [A_PAUSE]: 'le compte en pause' }
function baseCommandes() {
  const art = (x) => ({ slugs_anciens: [], metier: 'plombier', email_public: null, tel_public: null, leads_pause: false, site_active: false, plateforme_active: true, suppression_demandee_le: null, plan: 'studio', is_founder: false, ton_style: null, services: [], zone_intervention: null, bio: null, tva_regime: null, assurance_nom: null, domaine: null, domaine_verifie: false, credits: 0, ...x })
  const cmd = (x) => ({ email: 'commande@exemple.invalid', domaine_mode: 'existant', metier: 'plombier', communes: ['Rennes'], prix_cents: 30000, ...x })
  return {
    artisans: [
      art({ id: A_COMMANDE, slug: 'atelier-commande-025', nom: 'Atelier de la Commande', email: 'atelier@commande.invalid' }),
      art({ id: A_PURGE, slug: 'supprime-00000000', slugs_anciens: ['martin-plomberie-025'], nom: 'Plomberie Purgée', email: 'supprime-00000000@supprime.invalid', leads_pause: true, plateforme_active: false }),
      art({ id: A_REPRISE, slug: 'martin-plomberie-025', nom: 'Inconnu qui a repris l’adresse', email: 'inconnu@reprise.invalid' }),
      art({ id: A_SUPPRESSION, slug: 'atelier-suppression-025', nom: 'Atelier en suppression', email: 'atelier@suppression.invalid', suppression_demandee_le: '2026-09-10T08:00:00.000Z' }),
      art({ id: A_PAUSE, slug: 'atelier-pause-025', nom: 'Atelier en pause', email: 'atelier@pause.invalid', leads_pause: true }),
    ],
    sites_commandes: [
      cmd({ id: CMD.ok, artisan_id: A_COMMANDE, etat: 'en_ligne', domaine: 'atelier-commande.invalid' }),
      cmd({ id: CMD.purge, artisan_id: A_PURGE, etat: 'en_ligne', domaine: 'martin-plomberie.invalid' }),
      cmd({ id: CMD.efface, artisan_id: null, etat: 'en_ligne', domaine: 'efface.invalid' }),
      cmd({ id: CMD.suppression, artisan_id: A_SUPPRESSION, etat: 'en_ligne', domaine: 'suppression.invalid' }),
      cmd({ id: CMD.validee, artisan_id: A_COMMANDE, etat: 'validee', domaine: 'atelier-commande-bis.invalid' }),
      cmd({ id: CMD.pause, artisan_id: A_PAUSE, etat: 'en_ligne', domaine: 'pause.invalid' }),
    ],
    leads: [], messages: [], relances: [],
  }
}
export const SCENARIOS_COMMANDE = [
  { nom: 'commande en ligne, artisan vivant, son slug', corps: { commande: CMD.ok, slug: 'atelier-commande-025' }, attendu: [200], artisan: A_COMMANDE },
  { nom: 'commande en ligne, sans slug', corps: { commande: CMD.ok }, attendu: [200], artisan: A_COMMANDE },
  { nom: 'commande en ligne, slug d’un autre compte (la commande décide)', corps: { commande: CMD.ok, slug: 'martin-plomberie-025' }, attendu: [200], artisan: A_COMMANDE },
  { nom: 'D01 : commande d’un compte purgé, adresse reprise par un inconnu', corps: { commande: CMD.purge, slug: 'martin-plomberie-025' }, attendu: [404] },
  { nom: 'commande d’un compte effacé (artisan_id nul), adresse reprise', corps: { commande: CMD.efface, slug: 'martin-plomberie-025' }, attendu: [404] },
  { nom: 'commande d’un compte en suppression', corps: { commande: CMD.suppression, slug: 'atelier-suppression-025' }, attendu: [404] },
  { nom: 'commande pas en ligne (validee)', corps: { commande: CMD.validee, slug: 'atelier-commande-025' }, attendu: [404] },
  { nom: 'commande inconnue (pas de repli par le slug)', corps: { commande: CMD.inconnue, slug: 'atelier-commande-025' }, attendu: [404] },
  { nom: 'commande illisible', corps: { commande: 'pas-une-commande', slug: 'atelier-commande-025' }, attendu: [400, 404] },
  { nom: 'commande en ligne, compte en pause (vivant)', corps: { commande: CMD.pause }, attendu: [200], artisan: A_PAUSE, paused: true },
  { nom: 'sans commande : l’adresse, comme aujourd’hui', corps: { slug: 'atelier-commande-025' }, attendu: [200], artisan: A_COMMANDE },
]
/** Joue SCENARIOS_COMMANDE, une base neuve chacun, colonnes projetées → { echecs, faits } */
export async function jouerCommandes({ racine, routeSource = null }) {
  const echecs = [], faits = []
  for (const sc of SCENARIOS_COMMANDE) {
    const r = await chargerRoute({ racine, routeSource, base: baseCommandes(), projeter: true })
    const corps = { contact: NUMERO_ESSAI, nom_prospect: null, message: 'Projet : Chauffe-eau · Commune : Rennes · Quand : Dans le mois', website: '', ...sc.corps }
    const req = { json: async () => JSON.parse(JSON.stringify(corps)), headers: new Headers({ 'x-forwarded-for': '203.0.113.25' }) }
    let rep
    try { rep = await r.POST(req) } catch (e) { echecs.push(`${sc.nom} : POST lève ${premiereLigne(e)}`); continue }
    const statut = rep?.status
    const inseres = r.base.leads
    const qui = inseres.map((l) => NOMS_ARTISANS[l.artisan_id] || l.artisan_id).join(', ') || 'aucune'
    const d = []
    if (!sc.attendu.includes(statut)) d.push(`répond ${statut} (${court(JSON.stringify(rep?.corps), 80)}), ${sc.attendu.join(' ou ')} attendu`)
    if (inseres.some((l) => l.artisan_id === A_REPRISE)) d.push('une demande enregistrée chez l’inconnu qui a repris l’adresse : ses prospects partent chez un tiers')
    if (sc.attendu[0] !== 200 && inseres.length) d.push(`${inseres.length} demande(s) enregistrée(s) (${qui}) alors que la demande est refusée`)
    if (sc.attendu[0] === 200 && !(inseres.length === 1 && inseres[0].artisan_id === sc.artisan)) d.push(`demandes enregistrées : ${qui} ; une pour ${NOMS_ARTISANS[sc.artisan]} attendue`)
    if (sc.paused && rep?.corps?.paused !== true) d.push('réponse sans paused: true')
    if (d.length) echecs.push(`${sc.nom} : ${d.join(', ')}${r.traces.length ? ` [journal de la route : ${court(r.traces.join(' | '), 160)}]` : ''}`)
    else faits.push(`${sc.nom} → ${statut}`)
  }
  return { echecs, faits }
}
// Sondes du détecteur de FS-12 : une route minimale correcte (doit passer) et ses mutations (chacune doit être vue).
const ROUTE_SONDE_COMMANDE = `import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export async function POST(req: Request) {
  const b = await req.json()
  let a: any = null
  if (b.commande !== undefined) {
    if (typeof b.commande !== 'string' || !UUID.test(b.commande)) return NextResponse.json({ error: 'Lien invalide' }, { status: 400 })
    const { data: c } = await supabaseAdmin.from('sites_commandes').select('artisan_id, etat').eq('id', b.commande).maybeSingle()
    if (c && c.artisan_id && c.etat === 'en_ligne') {
      a = (await supabaseAdmin.from('artisans').select('id, slug, leads_pause, suppression_demandee_le').eq('id', c.artisan_id).maybeSingle()).data
      if (a && (String(a.slug).startsWith('supprime-') || a.suppression_demandee_le)) a = null
    }
    // REPLI
  } else {
    a = (await supabaseAdmin.from('artisans').select('id, slug, leads_pause').eq('slug', b.slug).maybeSingle()).data
  }
  if (!a) return NextResponse.json({ error: 'Artisan introuvable' }, { status: 404 })
  await supabaseAdmin.from('leads').insert({ artisan_id: a.id, contact: b.contact })
  return NextResponse.json({ ok: true, ...(a.leads_pause ? { paused: true } : {}) })
}
`
export const MUTATIONS_COMMANDE = [
  { nom: 'état de la commande non contrôlé', de: "c.etat === 'en_ligne'", vers: 'true' },
  { nom: 'comptes purgés ou en suppression non écartés', de: "      if (a && (String(a.slug).startsWith('supprime-') || a.suppression_demandee_le)) a = null\n", vers: '' },
  { nom: 'repli par le slug quand la commande ne mène à personne', de: '    // REPLI', vers: "    if (!a) a = (await supabaseAdmin.from('artisans').select('id, slug, leads_pause').eq('slug', b.slug).maybeSingle()).data" },
  { nom: 'commande ignorée (la route d’aujourd’hui)', de: 'if (b.commande !== undefined) {', vers: 'if (false) {' },
  { nom: 'suppression_demandee_le non lue dans le select', de: "select('id, slug, leads_pause, suppression_demandee_le')", vers: "select('id, slug, leads_pause')" },
]
export async function jugerRoutageCommande({ racine }) {
  const echecs = [], faits = []
  let r
  try { r = await jouerCommandes({ racine }) } catch (e) { return { ok: false, echecs: [`route non chargée contre le faux Supabase : ${premiereLigne(e)}`], faits } }
  echecs.push(...r.echecs)
  const vues = []
  try {
    const bonne = await jouerCommandes({ racine, routeSource: ROUTE_SONDE_COMMANDE })
    if (bonne.echecs.length) echecs.push(`détecteur trop strict : une route minimale correcte échoue (${court(bonne.echecs[0], 160)})`)
    for (const m of MUTATIONS_COMMANDE) {
      if (!ROUTE_SONDE_COMMANDE.includes(m.de)) { echecs.push(`sonde « ${m.nom} » cassée`); continue }
      const mute = await jouerCommandes({ racine, routeSource: ROUTE_SONDE_COMMANDE.replace(m.de, () => m.vers) })
      if (!mute.echecs.length) echecs.push(`détecteur aveugle : la mutation « ${m.nom} » passe`)
      else vues.push(`${m.nom} → vue`)
    }
  } catch (e) { echecs.push(`sondes du détecteur : ${premiereLigne(e)}`) }
  if (!echecs.length) faits.push(`${rel(path.join(racine, 'app', 'api', 'leads', 'route.ts'))} contre un faux Supabase (colonnes projetées, sites_commandes) : ${r.faits.join(', ')} ; sondes : route minimale correcte verte, ${vues.join(', ')} ; sur un 404, le site montre le repli (FS-4)`)
  return { ok: !echecs.length, echecs, faits }
}

// ── Témoin ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** .orchestre/travail/formulaire-site-qa/temoin/ : lib/slugRedirect.ts, lib/urls.ts et maquettes/modeles/ du dépôt + les fixtures du témoin, suffixe .temoin retiré. */
export function construireTemoin() {
  const d = preparerTemoin(JUGE, { copier: ['lib/slugRedirect.ts', 'lib/urls.ts', 'maquettes/modeles'] })
  let n = 0
  for (const f of listerFichiers(d)) if (f.endsWith('.temoin')) { fs.renameSync(path.join(d, f), path.join(d, f.slice(0, -'.temoin'.length))); n++ }
  if (n < 2) throw new Error(`témoin incomplet : ${n} fichier(s) .temoin dans ${rel(path.join(FIXTURES, 'temoins', JUGE))}`)
  return d
}

// ── --reel ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function chargerEnv() {
  const f = path.join(R, '.env.local')
  if (!fs.existsSync(f)) return
  for (const l of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}
async function reel(s) {
  chargerEnv()
  const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL, SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!URL_SB || !SERVICE) throw new Error('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis (.env.local)')
  const { createClient } = await import('@supabase/supabase-js')
  const admin = createClient(URL_SB, SERVICE, { auth: { persistSession: false } })
  const marque = `${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`
  const email = `essai-025-formulaire-${marque}@presti-test.invalid`
  const ancien = `essai-025-fs-${marque}`, nouveau = `${ancien}-bis`
  const numero = '02 61 91 02 53' // plage de fiction : aucun SMS, aucun e-mail possible
  const sansEspaces = (x) => String(x ?? '').replace(/\s/g, '')
  let id = null
  const leads = new Set()
  const envoyer = async (corps) => {
    const r = await fetch(PROD, { method: 'POST', headers: { 'content-type': 'application/json', 'user-agent': 'presti formulaire-site-qa --reel (fiche 025-01)' }, body: JSON.stringify(corps), signal: AbortSignal.timeout(30_000) })
    let j = null
    try { j = await r.json() } catch { /* corps non JSON */ }
    return { statut: r.status, json: j }
  }
  try {
    // FS-R1 — le compte d'essai
    const { data: u, error } = await admin.auth.admin.createUser({ email, password: `Essai-025-${crypto.randomBytes(12).toString('hex')}`, email_confirm: true })
    if (error || !u?.user?.id) throw new Error(`création du compte : ${error?.message || 'sans identifiant'}`)
    id = u.user.id
    const { error: eA } = await admin.from('artisans').upsert({ id, email, nom: 'Essai 025 formulaire', metier: 'Menuisier', slug: ancien, plan: 'essentiel', leads_pause: true, est_demo: true })
    if (eA) throw new Error(`fiche artisan : ${eA.message}`)
    const { data: a1 } = await admin.from('artisans').select('slug, leads_pause, est_demo').eq('id', id).maybeSingle()
    s.verdict('FS-R1', a1?.slug === ancien && a1.leads_pause === true && a1.est_demo === true, `compte ${email} (leads_pause, est_demo), slug ${ancien}`, `fiche relue : ${JSON.stringify(a1)}`)
    if (s.enEchec('FS-R1')) throw new Error('FS-R1 en échec')
    // FS-R2 — le site généré avec ce slug, et le corps que son formulaire envoie
    const dossier = preparerCommande({ dans: path.join(ICI, 'reel', 'commande') })
    const cmd = lireCommande(dossier); cmd.slug = ancien
    fs.writeFileSync(path.join(dossier, 'commande.json'), `${JSON.stringify(cmd, null, 2)}\n`)
    const g = genererSource({ racine: R, source: dossier, sortie: path.join(ICI, 'reel', 'site') })
    let corps = null
    if (g.code === 0) {
      const choix = { ...choixDe(cmd), contact: numero }
      const nav = await jugerNavigateur({ site: g.sortie, commande: cmd, scenarios: [SCENARIOS[0]], moteurs: [MOTEURS[0]], captures: path.join(ICI, 'reel', 'captures'), choix })
      corps = nav.corps[0]?.json ?? null
      s.verdict('FS-R2', nav.fs3.ok && corps?.slug === ancien && corps.website === '' && sansEspaces(corps.contact) === sansEspaces(numero), `site généré (${g.secondes.toFixed(1)} s) ; corps envoyé : slug ${corps?.slug}, contact ${corps?.contact}`, nav.fs3.echecs.join(' ; ') || `corps ${JSON.stringify(corps)}`)
    } else s.echoue('FS-R2', `génération en code ${g.code} : ${court(g.derniereLigne)}`)
    if (!corps || s.enEchec('FS-R2')) throw new Error('FS-R2 en échec')
    // FS-R3 — le slug changé par l'administration
    const { error: eS } = await admin.from('artisans').update({ slug: nouveau }).eq('id', id)
    const { data: a2 } = await admin.from('artisans').select('slug, slugs_anciens').eq('id', id).maybeSingle()
    s.verdict('FS-R3', !eS && a2?.slug === nouveau && (a2.slugs_anciens || []).includes(ancien), `slug ${ancien} → ${nouveau}, l'ancien dans slugs_anciens`, `${eS ? eS.message : ''} relu : ${JSON.stringify(a2)}`)
    if (s.enEchec('FS-R3')) throw new Error('FS-R3 en échec')
    // FS-R4 — l'envoi réel avec l'ancien slug
    const e1 = await envoyer(corps)
    if (e1.json?.leadId) leads.add(e1.json.leadId)
    const { data: enBase } = await admin.from('leads').select('id, contact, canal').eq('artisan_id', id)
    for (const l of enBase || []) leads.add(l.id)
    s.verdict('FS-R4', e1.statut === 200 && e1.json?.ok === true && e1.json?.paused === true && (enBase || []).length === 1 && enBase[0].id === e1.json.leadId && sansEspaces(enBase[0].contact) === sansEspaces(numero),
      `${PROD} → 200 paused ; 1 demande en base (${enBase?.[0]?.id}, contact ${numero}, canal ${enBase?.[0]?.canal})`, `réponse ${e1.statut} ${court(JSON.stringify(e1.json), 120)} ; en base : ${JSON.stringify(enBase)}`)
    // FS-R5 — le compte purgé : l'ancien slug ne mène plus nulle part
    const { error: eP } = await admin.rpc('purger_compte_test', { p_id: id })
    const e2 = await envoyer(corps)
    if (e2.json?.leadId) leads.add(e2.json.leadId)
    s.verdict('FS-R5', !eP && !(e2.statut >= 200 && e2.statut < 300), `compte purgé ; même envoi → ${e2.statut}`, `${eP ? `purge : ${eP.message} ; ` : ''}même envoi → ${e2.statut} ${court(JSON.stringify(e2.json), 100)}`)
  } catch (e) {
    s.note(`--reel interrompu : ${premiereLigne(e)}`)
    for (const k of ['FS-R1', 'FS-R2', 'FS-R3', 'FS-R4', 'FS-R5']) if (!s.evalue(k)) s.echoue(k, `non lancé (${premiereLigne(e)})`)
  } finally {
    // FS-R6 — le ménage, quoi qu'il arrive, relu
    const d = []
    try {
      if (leads.size) {
        const ids = [...leads]
        const { error: m1 } = await admin.from('messages').delete().in('lead_id', ids)
        const { error: m2 } = await admin.from('leads').delete().in('id', ids)
        if (m1 || m2) d.push(`suppression des demandes : ${(m1 || m2).message}`)
      }
      if (id) {
        const { data: resteA } = await admin.from('artisans').select('id').eq('id', id).maybeSingle()
        const { data: resteU } = await admin.auth.admin.getUserById(id)
        if (resteA || resteU?.user) { const { error } = await admin.rpc('purger_compte_test', { p_id: id }); if (error) d.push(`purge : ${error.message}`) }
        const { data: a } = await admin.from('artisans').select('id').eq('id', id).maybeSingle()
        const { data: uu } = await admin.auth.admin.getUserById(id)
        const { count: nl } = await admin.from('leads').select('id', { count: 'exact', head: true }).eq('artisan_id', id)
        if (a) d.push('la fiche artisan reste')
        if (uu?.user) d.push('le compte de connexion reste')
        if (nl) d.push(`${nl} demande(s) restent`)
      }
      if (leads.size) { const { count } = await admin.from('leads').select('id', { count: 'exact', head: true }).in('id', [...leads]); if (count) d.push(`${count} demande(s) restent`) }
    } catch (e) { d.push(`ménage interrompu : ${premiereLigne(e)}`) }
    s.verdict('FS-R6', !d.length, `rien ne reste (${id ? 'compte, fiche' : 'aucun compte créé'}${leads.size ? `, ${leads.size} demande(s)` : ''})`, `${d.join(' ; ')} — À NETTOYER À LA MAIN (${email})`)
  }
  // FS-R7 — le garde-fou de la production
  const z = lancer(process.execPath, ['scripts/zero-demo-e2e.mjs'], { cwd: R, timeout: 300_000 })
  s.verdict('FS-R7', z.code === 0, 'node scripts/zero-demo-e2e.mjs → code 0', `zero-demo-e2e en code ${z.code} : ${court(z.derniereLigne)}`)
}

// ── Le juge ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function principal() {
  const o = lireOptionsOuQuitter(process.argv.slice(2), { connues: ['critere'] })
  if (o.positionnels.length) { console.error(`✗ argument(s) inattendu(s) : ${o.positionnels.join(' ')}`); process.exit(2) }
  const ids = o.valeur('critere') === undefined ? IDS : o.liste('critere')
  if (o.drapeau('critere') || !ids.length || ids.some((x) => !IDS.includes(x))) { console.error(`✗ --critere attend des critères de ${IDS.join(', ')} (ex. --critere=FS-6,FS-11)`); process.exit(2) }
  if (o.reel && ids !== IDS) { console.error('✗ --critere ne se combine pas avec --reel'); process.exit(2) }
  if (o.reel) {
    const s = creerSortie(JUGE, IDS_REEL, { racine: o.racine })
    s.note(`production : ${PROD} — compte d'essai, ménage dans un finally`)
    await s.executer(reel)
    return
  }
  // --critere : la sortie ne déclare que les critères choisis ; les verdicts des autres vont dans une sortie « ombre » jamais
  // imprimée (enEchec, evalue restent justes), et le travail qui ne sert qu'à eux est sauté.
  const choisis = new Set(ids)
  const veut = (...xs) => xs.some((x) => choisis.has(x))
  const s0 = creerSortie(JUGE, ids, { racine: o.racine, temoin: o.temoin })
  const ombre = creerSortie(JUGE, IDS, { racine: o.racine, temoin: o.temoin })
  const vers = (id) => (choisis.has(id) ? s0 : ombre)
  const s = {
    ...s0,
    passe: (id, d) => vers(id).passe(id, d),
    echoue: (id, d) => vers(id).echoue(id, d),
    verdict: (id, ok, a, b) => vers(id).verdict(id, ok, a, b),
    resultat: (id, r) => vers(id).resultat(id, r),
    evalue: (id) => vers(id).evalue(id),
    enEchec: (id) => vers(id).enEchec(id),
  }
  if (ids !== IDS) s0.note(`--critere : seulement ${ids.join(', ')} (les autres critères ne sont pas jugés)`)
  await s0.executer(async () => {
    let racineFS = o.racine
    if (o.temoin) {
      racineFS = construireTemoin()
      s.note(`témoin : FS-1 à FS-12 sur ${rel(racineFS)} (générateur --source et route.ts de scripts/fixtures/025/temoins/${JUGE}/, lib/slugRedirect.ts du dépôt) ; T1 et T2 sur ${rel(o.racine)}`)
    }
    const commande = lireCommande()
    // FS-1 (et le site qu'il génère, lu par FS-2, FS-3, FS-4, FS-5, FS-7, FS-8)
    const g = veut('FS-1', 'FS-2', 'FS-3', 'FS-4', 'FS-5', 'FS-7', 'FS-8') ? jugerGeneration({ racine: racineFS, commande }) : { site: null }
    if (veut('FS-1')) s.resultat('FS-1', g)
    // FS-2, FS-3, FS-4
    if (!veut('FS-2', 'FS-3', 'FS-4')) { /* non demandés (--critere) */ } else if (!g.site) for (const k of ['FS-2', 'FS-3', 'FS-4']) s.echoue(k, 'pas de site généré à juger (FS-1)')
    else {
      const st = jugerFormulaireStatique(g.site)
      const nv = await jugerNavigateur({ site: g.site, commande })
      for (const n of nv.notes) s.note(n)
      s.verdict('FS-2', st.ok && nv.fs2.ok, [...st.faits, ...nv.fs2.faits].join(' ; '), [...st.echecs, ...nv.fs2.echecs].join(' ; '))
      s.verdict('FS-3', nv.fs3.ok, nv.fs3.faits.join(' ; '), nv.fs3.echecs.join(' ; '))
      s.verdict('FS-4', nv.fs4.ok, `${nv.fs4.faits.length} issues sur ${SCENARIOS.length * MOTEURS.length} — ${nv.fs4.resume}`, nv.fs4.echecs.join(' ; '))
    }
    // FS-5
    if (veut('FS-5')) {
      const p = await jugerPlateau({ racine: racineFS, siteComplet: g.site, commande })
      s.verdict('FS-5', p.ok, p.faits.join(' ; '), p.echecs.join(' ; '))
    }
    // FS-6
    if (veut('FS-6')) {
      const route = path.join(racineFS, 'app', 'api', 'leads', 'route.ts')
      const r6 = await analyserRoute(lireOuNull(route)?.toString('utf8'), { slugRedirect: lireOuNull(path.join(racineFS, 'lib', 'slugRedirect.ts'))?.toString('utf8') ?? '' })
      s.verdict('FS-6', r6.ok, `${rel(route)} : ${r6.faits.join(', ')}`, `${rel(route)} : ${r6.echecs.join(' ; ')}`)
    }
    // FS-7
    if (!veut('FS-7')) { /* non demandé (--critere) */ } else if (!g.site) s.echoue('FS-7', 'pas de site généré à juger (FS-1)')
    else { const r7 = jugerPhotos({ site: g.site, source: COMMANDE_EXEMPLE }); s.verdict('FS-7', r7.ok, r7.faits.join(' ; '), r7.echecs.join(' ; ')) }
    // FS-8 à FS-11 (relectures à froid du 24/09)
    if (!veut('FS-8')) { /* non demandé (--critere) */ } else if (!g.site) s.echoue('FS-8', 'pas de site généré à juger (FS-1)')
    else { const r8 = jugerAdresse({ racine: racineFS, site: g.site, commande }); s.verdict('FS-8', r8.ok, r8.faits.join(' ; '), r8.echecs.join(' ; ')) }
    if (veut('FS-9')) { const r9 = await jugerLibellesMetier({ racine: racineFS }); s.verdict('FS-9', r9.ok, r9.faits.join(' ; '), r9.echecs.join(' ; ')) }
    if (veut('FS-10')) { const r10 = jugerReplisSansCoordonnees({ racine: racineFS }); s.verdict('FS-10', r10.ok, r10.faits.join(' ; '), r10.echecs.join(' ; ')) }
    if (veut('FS-11')) { const r11 = await jugerComptePurge({ racine: racineFS }); s.verdict('FS-11', r11.ok, r11.faits.join(' ; '), r11.echecs.join(' ; ')) }
    if (veut('FS-12')) { const r12 = await jugerRoutageCommande({ racine: racineFS }); s.verdict('FS-12', r12.ok, r12.faits.join(' ; '), r12.echecs.join(' ; ')) }
    // T1, T2
    if (veut('T1')) { const r1 = t1({ juge: JUGE, racine: o.racine }); s.resultat('T1', r1); for (const f of r1.faits) s.note(`T1 : ${f}`) }
    if (veut('T2')) { const r2 = t2({ racine: o.racine }); s.resultat('T2', r2); for (const f of r2.faits) s.note(`T2 : ${f}`) }
  })
}
const pareil = (a, b) => (process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b)
if (process.argv[1] && pareil(path.resolve(process.argv[1]), fileURLToPath(import.meta.url))) await principal()
