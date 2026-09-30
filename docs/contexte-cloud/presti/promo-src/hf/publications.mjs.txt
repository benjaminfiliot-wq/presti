// Les dix publications, en plans — v2, réécrite le 2026-09-10.
//
// ── POURQUOI CETTE RÉÉCRITURE ────────────────────────────────────────────────────────────────
//
// Benj, après avoir regardé la v1 : « je comprend rien a ce qu'il dit ça a pas de logique juste
// présente ce qu'on fait et les différentes fonctionnalités rien de plus simple ? » puis « rajoute
// aussi des termes du bâtiment, productivité, efficacité, simplicité ».
//
// Il avait raison, et ça se voit en relisant la v1 d'affilée : les dix publications s'ouvraient sur
// un aveu ou une histoire — « Quelqu'un s'est abonné », « Je l'ai testée, elle a raté », « Voilà
// tout ce qu'elle contient ». Un registre de transparence radicale qui ne fonctionne que pour
// quelqu'un qui SAIT DÉJÀ ce qu'est Presti. **Aucune des dix ne disait ce que fait le logiciel.**
// Pour un artisan qui découvre la marque dans son fil, c'était illisible.
//
// La v2 applique trois règles :
//   1. UNE publication = UNE fonctionnalité, nommée dès l'ouverture.
//   2. Le vocabulaire est celui du métier : chantier, poste, fourniture, main-d'œuvre, camion,
//      dépôt, atelier, tournée, acompte, TVA, réception. Pas de vocabulaire de logiciel.
//   3. Chaque publication répond à « qu'est-ce que j'y gagne » : du temps gagné, une perte évitée,
//      ou une chose de moins à gérer. Productivité, efficacité, simplicité.
//
// La v1 est conservée en archive de session ; son registre servira peut-être plus tard, pour une
// audience qui connaît déjà le produit.
//
// ── LA MÉCANIQUE, INCHANGÉE ──────────────────────────────────────────────────────────────────
//
// Une vidéo est une LISTE DE PLANS. `d` est la DURÉE, jamais le temps de départ : les départs sont
// calculés par `scripts/hf-composer.mjs`, ce qui rend impossible le trou d'une image entre deux
// plans, et impossible aussi de casser tout le montage en rallongeant un plan du milieu.
//
// `fonde` n'est pas une note de bas de page : c'est **la ligne de code qui autorise la vidéo à dire
// ce qu'elle dit**. Une publication dont le `fonde` ne se vérifie pas ne se monte pas.
//
// Types de plan : ouverture · titre · coupe · capture (plein | defilement | carte) · code · marque
// Règles appliquées par le générateur : six mots maximum par titre, police calculée, zone sûre,
// dérive continue sur chaque plan, refus d'agrandir une capture de plus de 1,6 ×.

export const PUBLICATIONS = {
  // ───────────────────────────────────────────────────────────────────────────────────────────
  // 01 · CE QUE FAIT PRESTI — la publication qui manquait totalement à la v1.
  '01': {
    titre: 'Presti, en vingt secondes',
    canal: 'LinkedIn + Facebook',
    fonde:
      'lib/plans.ts:36-41 — le socle `BASE` contient `plateforme.conversation`, `devis.ia`, `factures` et ' +
      '`relances` : tout ce qui est montré est dans TOUTES les formules, essai compris. ' +
      'app/plateforme/Conversations.tsx:352 — bouton « Proposer une réponse » → app/api/messages/route.ts:117 ' +
      '(action suggest, aucun verrou d’offre) : la réponse se PROPOSE en un clic, elle n’est pas prête d’elle-même ' +
      '(app/api/leads/route.ts:188-212 ne prépare rien au premier message ; seule conversation/stream/route.ts:127 ' +
      'écrit une proposition, à partir du deuxième). app/api/messages/route.ts:99 et :164 — la relance s’arme sur la ' +
      'RÉPONSE de l’artisan ; app/api/cron/relances/route.ts:56 — elle ne part que si le client n’a pas répondu ' +
      '(statut `repondu`), jamais sur un devis ni une facture. app/api/devis/[id]/envoyer/route.ts:17-21 — l’envoi ' +
      'exige l’artisan. app/devis/[id]/page.tsx:203 — la facture se crée depuis le devis (lib/factureDepuisDevis.ts:31-36).',
    plans: [
      { d: 1.7, type: 'ouverture', kicker: 'Presti', titre: 'Le bureau qui suit.' },
      { d: 1.5, type: 'titre', titre: 'Un client vous écrit.' },
      { d: 1.9, type: 'capture', mode: 'carte', img: 'd-demande.png', legende: 'À 19 h, vous êtes sur le chantier.' },
      { d: 1.5, type: 'titre', titre: 'La réponse, proposée en un clic.', accent: true },
      { d: 1.5, type: 'titre', titre: 'Le client se tait, relance automatique.' },
      { d: 0.12, type: 'coupe' },
      { d: 1.6, type: 'titre', titre: 'Le devis se chiffre.' },
      { d: 1.9, type: 'capture', mode: 'defilement', img: 'd-apercu-devis.png', zoom: 1.16, de: 0.0, vers: 0.2, legende: 'Poste par poste.' },
      { d: 1.5, type: 'titre', titre: 'Vous relisez. Vous envoyez.' },
      { d: 0.12, type: 'coupe' },
      { d: 1.6, type: 'titre', titre: 'La facture suit.' },
      { d: 1.8, type: 'titre', titre: 'Tout au même endroit.', accent: true },
      { d: 1.6, type: 'titre', titre: 'Un seul outil.' },
      { d: 2.4, type: 'marque', mot: 'Le bureau qui suit le chantier.' },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────────────────────
  // 02 · LA RÉPONSE — plateforme.conversation + canaux.email, socle.
  '02': {
    titre: 'Le premier qui répond emporte le chantier',
    canal: 'LinkedIn',
    fonde:
      'lib/plans.ts:36-41 — `plateforme.conversation` et `canaux.email` sont dans `BASE`, donc dès ' +
      'l’essai. `plateforme.ia.auto` est dans `STUDIO` (:44) à 59 € (:60), verrou lib/plateformeConfig.ts:160 : ' +
      'la réponse SEULE s’ouvre à 59 €. En dessous, la PREMIÈRE demande n’a pas de proposition : ' +
      'app/api/leads/route.ts:188-212 ignore `comportement: preparer` (seul app/api/conversation/stream/route.ts:127 ' +
      'en écrit une, au 2e message du client). D’où « Vous demandez, elle rédige » : bouton « Proposer une réponse » ' +
      '(app/plateforme/Conversations.tsx:352) → /api/messages `suggest` (app/api/messages/route.ts:117-135) → brouillon ' +
      'dans la zone de saisie (:227), un pouce sur « Envoyer » (:353). Jamais « prête », jamais « envoyée ».',
    plans: [
      { d: 1.7, type: 'ouverture', kicker: '22 h 40', titre: 'Une demande arrive.' },
      { d: 1.5, type: 'titre', titre: 'Vous avez fini à 19 h.' },
      { d: 1.4, type: 'titre', titre: 'Demain, cinq heures de chantier.', sourd: true },
      { d: 0.12, type: 'coupe' },
      { d: 1.7, type: 'titre', titre: 'Vous demandez, elle rédige.', accent: true },
      { d: 1.9, type: 'capture', mode: 'carte', img: 'crop-rep.png', legende: 'Elle a lu la demande.' },
      { d: 1.5, type: 'titre', titre: 'Pas un message automatique.' },
      { d: 0.12, type: 'coupe' },
      { d: 1.6, type: 'titre', titre: 'Vous validez d’un pouce.' },
      { d: 1.7, type: 'titre', titre: 'Dès 59 €/mois, elle répond seule.' },
      { d: 1.5, type: 'titre', titre: 'Sur votre page, à votre marque.' },
      { d: 2.0, type: 'titre', titre: 'Le client n’attend plus.', accent: true },
      { d: 2.4, type: 'marque', mot: 'Le premier qui répond emporte le chantier.' },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────────────────────
  // 03 · LE DEVIS — devis.ia + devis.prix_artisan, socle.
  '03': {
    titre: 'Le chantier se chiffre pendant que vous roulez',
    canal: 'LinkedIn + Facebook',
    fonde:
      'lib/plans.ts:32-42 — `devis.ia` et `devis.prix_artisan` sont dans `BASE`. ' +
      'lib/plateformeConfig.ts:21 — `devis_auto` n’a que trois valeurs et aucune n’envoie ; ' +
      'lib/devisAuto.ts:82 pose `statut: brouillon`.',
    plans: [
      { d: 1.7, type: 'ouverture', kicker: 'Le devis', titre: 'Décrivez le chantier.' },
      { d: 1.8, type: 'capture', mode: 'defilement', img: 'd-lignes-devis.png', zoom: 1.14, de: 0.0, vers: 0.35, legende: 'Les postes se posent.' },
      { d: 1.5, type: 'titre', titre: 'Main-d’œuvre et fournitures.' },
      { d: 1.5, type: 'titre', titre: 'Les quantités. La TVA.' },
      { d: 0.12, type: 'coupe' },
      { d: 1.8, type: 'titre', titre: 'Sur vos prix à vous.', accent: true },
      { d: 1.8, type: 'capture', mode: 'carte', img: 'd-total-devis.png', legende: 'Et le total.', souligne: true },
      { d: 0.12, type: 'coupe' },
      { d: 1.6, type: 'titre', titre: 'Puis il s’arrête.' },
      { d: 1.7, type: 'capture', mode: 'carte', img: 'd-brouillon.png', legende: 'Il vous attend en brouillon.' },
      { d: 1.5, type: 'titre', titre: 'Vous relisez. Vous envoyez.' },
      { d: 1.8, type: 'titre', titre: 'Le devis du soir, supprimé.', accent: true },
      { d: 2.4, type: 'marque', mot: 'Votre nom, votre prix, votre clic.' },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────────────────────
  // 04 · LA FACTURE — factures + factures.electronique, socle.
  '04': {
    titre: 'La facture ne se ressaisit pas',
    canal: 'Facebook',
    fonde:
      'lib/plans.ts:32-42 — `factures` ET `factures.electronique` sont dans `BASE`, donc dans les ' +
      'trois formules et dans l’essai. Le tableau comparatif du même fichier : ' +
      '« Factures + facture électronique » est à `true` pour essentiel, studio et signature.',
    plans: [
      { d: 1.7, type: 'ouverture', kicker: 'Chantier réceptionné', titre: 'La facture, maintenant.' },
      { d: 1.5, type: 'titre', titre: 'Le devis est accepté.' },
      { d: 1.6, type: 'titre', titre: 'Vous ne retapez rien.', accent: true },
      { d: 0.12, type: 'coupe' },
      { d: 1.6, type: 'titre', titre: 'Les postes passent.' },
      { d: 1.5, type: 'titre', titre: 'La remise est reprise.' },
      { d: 1.5, type: 'titre', titre: 'La TVA est calculée.' },
      { d: 0.12, type: 'coupe' },
      { d: 1.8, type: 'titre', titre: 'Format électronique compris.', accent: true },
      { d: 1.6, type: 'titre', titre: 'Dans les trois formules.' },
      { d: 1.7, type: 'titre', titre: 'Et dans l’essai gratuit.' },
      { d: 1.9, type: 'titre', titre: 'Le samedi de paperasse.' },
      { d: 1.6, type: 'titre', titre: 'Vous le récupérez.', accent: true },
      { d: 2.4, type: 'marque', mot: 'La facture suit le devis.' },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────────────────────
  // 05 · LE SITE — site.essentiel + site.domaine_perso, socle.
  '05': {
    titre: 'Votre vitrine, à votre nom, comprise',
    canal: 'LinkedIn',
    fonde:
      'lib/plans.ts:36-41 — `site.essentiel` ET `site.domaine_perso` sont dans `BASE` : le nom de ' +
      'domaine sans « presti » est pour tous (décision Benj du 04/09, en commentaire dans le code). ' +
      'app/api/domain/route.ts:33 et app/profil/page.tsx:600 verrouillent par `peut` sur `site.domaine_perso`. ' +
      'app/site/[slug]/page.tsx:442-449 — le logo est rendu en tête de page sur toute adresse. ' +
      'Pas « dans l’onglet » : middleware.ts:109 réécrit /site/<slug>/icon vers l’attrape-tout 404 sur un domaine perso.',
    plans: [
      { d: 1.7, type: 'ouverture', kicker: 'Votre vitrine', titre: 'Un site à votre nom.' },
      { d: 1.6, type: 'titre', titre: 'Votre nom de domaine.', accent: true },
      { d: 1.7, type: 'titre', titre: 'Dès la formule d’entrée.' },
      { d: 0.12, type: 'coupe' },
      { d: 1.8, type: 'titre', titre: 'Vos coordonnées. Vos couleurs.' },
      { d: 1.9, type: 'capture', mode: 'carte', img: 'd-lien-contact.png', legende: 'Un lien à coller partout.', souligne: true },
      { d: 0.12, type: 'coupe' },
      { d: 1.9, type: 'titre', titre: 'Votre logo en tête de page.' },
      { d: 1.7, type: 'titre', titre: 'Vos clients ne voient que vous.', accent: true },
      { d: 1.6, type: 'titre', titre: 'Rien à installer.' },
      { d: 1.7, type: 'titre', titre: 'Rien à maintenir.' },
      { d: 2.4, type: 'marque', mot: 'Votre adresse, pas la mienne.' },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────────────────────
  // 06 · L'INVENTAIRE — inventaire.stock, à partir de Studio (59 €).
  '06': {
    titre: 'Camion et atelier : un seul inventaire',
    canal: 'Facebook + Instagram',
    fonde:
      'lib/plans.ts:42-48 — `inventaire.stock` est dans `STUDIO`, donc à partir de 59 €. Le tableau ' +
      'comparatif le confirme : « Stock par lieu, scan, seuils » est `false` pour essentiel. ' +
      'La vidéo le DIT, elle ne le cache pas. app/inventaire/page.tsx:34 — LIEUX = atelier, camion.',
    // ── Réécrite le 2026-09-10 : Benj « celle du camion, c'est pas clair » ────────────────────
    //
    // Il avait raison, et le défaut se nomme : la version précédente ne disait jamais CE QUE
    // C'EST. Elle enchaînait des lieux et des seuils sans nommer la fonctionnalité. Plus trois
    // mots fautifs pour un artisan :
    //   • « à la réception » — pour lui, c'est la réception DE CHANTIER, pas une livraison ;
    //   • « un seul compte » — on lit « compte bancaire », pas « inventaire unique » ;
    //   • « l'alerte tombe avant la panne » — une panne, c'est une machine, pas un stock vide.
    // Et « À partir de 59 € » arrivait sans dire de quoi.
    //
    // ── Contrôle du 2026-09-13 : deux mots de plus, même famille ─────────────────────────────
    //   • « Votre matériel » — c'est l'outillage ; l'écran compte des matériaux, et s'appelle
    //     « Votre stock » (page.tsx:159, :195). On prend son mot.
    //   • « au dépôt » — la vidéo nomme deux lieux, la console n'en connaît que deux
    //     (page.tsx:34). Le trajet qu'on évite, c'est le retour à l'atelier.
    plans: [
      { d: 1.7, type: 'ouverture', kicker: 'Votre stock', titre: 'Presti le compte.' },
      { d: 1.5, type: 'titre', titre: 'Dans le camion.' },
      { d: 1.4, type: 'titre', titre: 'Et à l’atelier.' },
      { d: 1.7, type: 'titre', titre: 'Un seul inventaire pour deux.', accent: true },
      { d: 0.12, type: 'coupe' },
      { d: 1.7, type: 'titre', titre: 'Vous scannez ce qui arrive.' },
      { d: 1.6, type: 'titre', titre: 'Vous fixez un minimum.' },
      { d: 1.8, type: 'titre', titre: 'En dessous, l’inventaire le signale.', accent: true },
      { d: 0.12, type: 'coupe' },
      { d: 1.7, type: 'titre', titre: 'Avant de partir sans la pièce.' },
      { d: 1.6, type: 'titre', titre: 'Plus d’aller-retour à l’atelier.' },
      { d: 1.8, type: 'titre', titre: 'L’inventaire ouvre à 59 €/mois.', sourd: true },
      { d: 2.4, type: 'marque', mot: 'Savoir ce qu’on a, avant d’en manquer.' },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────────────────────
  // 07 · LA RECHERCHE FOURNISSEURS — inventaire.recherche_ia, Studio.
  '07': {
    titre: 'La référence se trouve sans quitter le chantier',
    canal: 'Instagram',
    fonde:
      'lib/plans.ts:44-48 — `inventaire.recherche_ia` est dans `STUDIO` (59 €). Le tableau ' +
      'comparatif : « Recherche IA chez vos fournisseurs » — `false` pour essentiel, ' +
      '« Standard + Pro » pour studio, « + Expert » pour signature.',
    plans: [
      { d: 1.7, type: 'ouverture', kicker: 'Une référence', titre: 'Il vous manque une pièce.' },
      { d: 1.5, type: 'titre', titre: 'Vous êtes sur le chantier.' },
      { d: 1.6, type: 'titre', titre: 'Trois catalogues à ouvrir.', sourd: true },
      { d: 0.12, type: 'coupe' },
      { d: 1.8, type: 'titre', titre: 'Décrivez-la, simplement.', accent: true },
      { d: 1.6, type: 'titre', titre: 'Chez vos fournisseurs à vous.' },
      { d: 1.7, type: 'titre', titre: 'Sans quitter l’application.' },
      { d: 0.12, type: 'coupe' },
      { d: 1.7, type: 'titre', titre: 'Le prix. La référence.' },
      { d: 1.6, type: 'titre', titre: 'Le temps de recherche.' },
      { d: 1.8, type: 'titre', titre: 'Vous le gardez.', accent: true },
      { d: 1.7, type: 'titre', titre: 'À partir de 59 €/mois.', sourd: true },
      { d: 2.4, type: 'marque', mot: 'Chercher, c’est du temps non facturé.' },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────────────────────
  // 08 · LES RELANCES — relances, socle.
  '08': {
    titre: 'Le client se tait. Presti relance.',
    canal: 'Facebook',
    fonde:
      'app/api/messages/route.ts:99 et :164 — planifierRelances(lead.id) n’a que CES DEUX appelants ' +
      'dans tout le dépôt (réponse manuelle de l’artisan, ou proposition de l’assistant qu’il valide), ' +
      'tous deux sur sa RÉPONSE. Deux insertions directes posent la même cadence après la PREMIÈRE ' +
      'réponse de l’assistant en son nom (app/api/leads/route.ts:299, app/api/leads/contact/route.ts:87-92) : ' +
      'encore une réponse, jamais un devis. L’envoi d’un devis (app/api/devis/[id]/envoyer/route.ts:29) ' +
      'ne fait que LIRE le lead ; lib/devisAuto.ts:103 pose statut « devis », que ' +
      'app/api/cron/relances/route.ts:56-60 saute. Donc : la relance suit une réponse restée sans suite. ' +
      'Cadence : lib/relances.ts:20 CADENCE_RELANCES = [2, 5, 10] (J+2, J+5, J+10), cron quotidien à 8 h ' +
      '(vercel.json) — d’où « Deux jours passent », pas une semaine. Zéro pression : lib/ai.ts:659 et :689. ' +
      'lib/plans.ts:36-41 — `relances` est dans `BASE` : trois formules et essai.',
    plans: [
      { d: 1.7, type: 'ouverture', kicker: 'Vous avez répondu', titre: 'Puis plus rien.' },
      { d: 1.5, type: 'titre', titre: 'Deux jours passent.' },
      { d: 1.6, type: 'titre', titre: 'Vous avez trois chantiers.', sourd: true },
      { d: 1.5, type: 'titre', titre: 'Le client s’est tu.' },
      { d: 0.12, type: 'coupe' },
      { d: 1.8, type: 'titre', titre: 'Presti relance pour vous.', accent: true },
      { d: 1.6, type: 'titre', titre: 'La relance part seule.' },
      { d: 1.7, type: 'titre', titre: 'Courte, polie, à votre nom.' },
      { d: 0.12, type: 'coupe' },
      { d: 1.7, type: 'titre', titre: 'Trois relances, zéro pression.' },
      { d: 1.8, type: 'titre', titre: 'Sans que vous y pensiez.', accent: true },
      { d: 1.6, type: 'titre', titre: 'Compris dans les trois.' },
      { d: 2.4, type: 'marque', mot: 'Relancer, c’est déjà signer un peu.' },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────────────────────
  // 09 · LES CANAUX — canaux.email (socle), whatsapp (Studio), reseaux (Signature).
  '09': {
    titre: 'Une seule boîte à relever',
    canal: 'LinkedIn + Facebook',
    fonde:
      'lib/plans.ts:32-42 — `canaux.email` est dans `BASE`, et `plateforme.conversation` aussi : ' +
      'ce sont les DEUX SEULS canaux que la vidéo a le droit de citer. ' +
      '⛔ `canaux.whatsapp` et `canaux.reseaux` existent dans la grille CIBLE mais leurs drapeaux ' +
      'sont BAISSÉS (lib/flags.ts:68 et :70, « vendu dans la grille cible, pas construit »), et ' +
      'lib/plans.ts:143 les filtre hors de la grille affichée. Ils ne se citent pas.',
    plans: [
      { d: 1.7, type: 'ouverture', kicker: 'Vos messages', titre: 'Ils arrivent de partout.' },
      { d: 1.6, type: 'titre', titre: 'Le mail. Votre page.' },
      { d: 1.5, type: 'titre', titre: 'Le bouton de votre site.' },
      { d: 1.6, type: 'titre', titre: 'Et une demande se perd.', sourd: true },
      { d: 0.12, type: 'coupe' },
      { d: 1.9, type: 'capture', mode: 'carte', img: 'crop-msg.png', legende: 'Tout arrive au même endroit.' },
      { d: 1.7, type: 'titre', titre: 'Votre boîte, branchée.', accent: true },
      { d: 0.12, type: 'coupe' },
      // ⛔ Ces deux plans disaient « WhatsApp à partir de 59 € » et « Les réseaux à 99 € ».
      //    C'était FAUX. lib/flags.ts:68 et :70 — `canauxWhatsapp: false` et `canauxReseaux: false`, avec
      //    ce commentaire dans le code : « vendu dans la grille cible, PAS CONSTRUIT. Reste caché
      //    tant que c'est vrai. » Et lib/plans.ts:143 filtre ces lignes hors de la grille tarifaire,
      //    donc le site ne les montre pas non plus.
      //
      //    Mon `fonde` notait pourtant « les deux derniers sont derrière des drapeaux ». J'avais vu
      //    qu'ils existaient sans jamais lire leur VALEUR. Citer un drapeau ne dispense pas de
      //    l'ouvrir.
      { d: 1.6, type: 'titre', titre: 'Votre page de conversation aussi.' },
      { d: 1.7, type: 'titre', titre: 'Les deux dans la même boîte.' },
      { d: 1.8, type: 'titre', titre: 'Une seule boîte à relever.', accent: true },
      { d: 1.6, type: 'titre', titre: 'Plus de demande oubliée.' },
      { d: 2.4, type: 'marque', mot: 'Un seul endroit à regarder.' },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────────────────────
  // 10 · LES FORMULES — lib/plans.ts, chiffres exacts.
  '10': {
    titre: '29, 59, 99. Et l’essai sans carte.',
    canal: 'Facebook + Instagram',
    fonde:
      'lib/plans.ts:58-61 — Essai 3 crédits / 0 € · Essentiel 80 crédits / 29 € · Studio 250 / 59 € · ' +
      'Signature 600 / 99 €. `plateforme.ia.auto` est dans `STUDIO` (:44). Le domaine perso est ' +
      'dans `BASE` (:34), donc dans les trois. TVA non applicable, art. 293 B (app/page.tsx:170).',
    plans: [
      { d: 1.7, type: 'ouverture', kicker: 'Sans engagement', titre: 'Trois formules. Un essai.' },
      { d: 1.6, type: 'titre', titre: 'Essai : trois crédits.' },
      { d: 1.6, type: 'titre', titre: 'Sans carte bancaire.', accent: true },
      { d: 0.12, type: 'coupe' },
      { d: 1.7, type: 'titre', titre: '29 €/mois : vous validez tout.' },
      { d: 1.7, type: 'titre', titre: '59 €/mois : elle répond seule.' },
      { d: 1.7, type: 'titre', titre: '99 €/mois : le chiffrage expert.' },
      { d: 0.12, type: 'coupe' },
      { d: 1.9, type: 'capture', mode: 'carte', img: 'd-chiffrer-ia.png', legende: 'Standard, Pro, Expert.' },
      { d: 1.7, type: 'titre', titre: 'Votre domaine dans les trois.' },
      { d: 1.8, type: 'titre', titre: 'On paie à la réponse.', accent: true },
      { d: 1.6, type: 'titre', titre: 'Pas au client.' },
      { d: 2.4, type: 'marque', mot: 'TVA non applicable, art. 293 B.' },
    ],
  },

// ───────────────────────────────────────────────────────────────────────────────────────────
  // 11 · LA CONFIDENTIALITÉ DES CONVERSATIONS — supportArtisan, toutes formules, essai compris.
  //
  // Ce que la vague 1 aurait raté ici : lib/plans.ts ne contient AUCUNE capacité « support » pour
  // ce mécanisme (la ligne support.prioritaire:139 est autre chose — la priorité de traitement,
  // Signature). L’autorisation ne vient pas des formules mais du drapeau : les deux routes artisan
  // ne testent que actif('supportArtisan') et authArtisan, zéro contrôle de plan. Et l’ÉCRAN
  // existe — app/parametres/CarteSupport.tsx affiche les demandes, le journal des consultations
  // (:236-249) et les deux boutons du verrou (:154-160 lever, :252-258 poser). Rien ici n’est
  // déduit d’une capacité déclarée.
  //
  // Contrôle vague 2 : « Jamais la nature des travaux » a été ramené à « le détail des travaux »,
  // parce que la vue « forme » d’une conversation rend `type_chantier` (0074:393), un libellé parmi
  // douze (lib/ai.ts:250-263 : Plomberie, Cuisine, Salle de bain…). La désignation des lignes d’un
  // devis ne passe jamais ; une catégorie en un mot, si. Le carton dit ce que le code tient.
  '11': {
    titre: 'La porte naît fermée',
    canal: 'LinkedIn',
    fonde:
      'lib/flags.ts:48 — `supportArtisan: true`, levé le 08/09 après 0074+0075 en base ' +
      '(plans/journal-final.md:834-861). AUCUN contrôle de formule : ' +
      'app/api/securite/acces-support/route.ts:26-28 ne teste que le drapeau et authArtisan ' +
      '(grep plan|formule|capacite vide sur les 145 lignes) ; lib/plans.ts:58 — l’essai « gratuit » ' +
      'existe ; app/parametres/SectionSecurite.tsx:184 monte la carte pour tout artisan — c’est vrai ' +
      'dès l’essai gratuit. ' +
      'supabase/migrations/0074_support.sql:104-131 — `ouvert_le` et `expire_le` naissent NULL ; ' +
      'le commentaire de table (:126) dit « Elle naît fermée ». ' +
      'supabase/migrations/0074_support.sql:290 — `if not found or v.artisan_id <> p_artisan` ; ' +
      'app/api/securite/acces-support/route.ts:103-106 passe `p_artisan: s.uid`, jamais le corps. ' +
      'supabase/migrations/0074_support.sql:299 — `v_expire := now() + interval` d’une heure, DANS ' +
      'ouvrir_acces_support : l’heure part du clic de l’artisan, pas de la demande (commentaire :130). ' +
      'supabase/migrations/0074_support.sql:448-451 et :466-469 — « lignes » rend ordre/quantite/unite/' +
      'prix_unitaire_ht/tva_taux ; la colonne `designation` (0002_devis.sql:63) n’est pas ' +
      'sélectionnée : le détail des travaux ne sort jamais. ⚠ :393 — la vue « forme » d’une ' +
      'conversation rend `type_chantier`, un libellé parmi douze (lib/ai.ts:250-263 : Plomberie, ' +
      'Cuisine…) : d’où « le détail », pas « la nature ». ' +
      ':389-400 — la vue « forme » n’a aucun champ nom ; `contact` sort silhouetté (le domaine reste). ' +
      ':410-420 — « photos » rend des noms de fichiers de la forme 0.jpg (app/api/leads/route.ts:133), ' +
      'jamais une image. ' +
      'supabase/migrations/0074_support.sql:404 — la clé « longueur » rend `length(coalesce(m.contenu, …))` : ' +
      'la longueur, jamais le texte. ' +
      'supabase/migrations/0074_support.sql:476-482 — lire_sous_support écrit journal_direction ET ' +
      'acces_support_lectures dans la même transaction que la donnée rendue ; ' +
      'app/api/securite/acces-support/route.ts:34-36 rend ces lectures à l’artisan et ' +
      'app/parametres/CarteSupport.tsx:236-249 les affiche. Trigger d’immuabilité : 0074:170-185, ' +
      'réécrit par 0076_support_purge.sql:30-48 (UPDATE refusé ; DELETE refusé 24 mois, sauf ' +
      'suppression du compte). ' +
      'supabase/migrations/0074_support.sql:92-102 — table support_verrou ; demander_acces_support ' +
      'renvoie « verrouille » avant d’atteindre l’écran de l’artisan (0074:203-206, repris dans la ' +
      'version vivante 0075_support_element.sql:49-50) ; boutons en CarteSupport.tsx:154-160 (lever) ' +
      'et :252-258 (poser).',
    plans: [
      { d: 1.7, type: 'ouverture', kicker: 'Vos conversations', titre: 'La porte naît fermée.' },
      { d: 1.5, type: 'titre', titre: 'Presti demande. Vous ouvrez.' },
      { d: 1.6, type: 'titre', titre: 'Une heure après votre clic.', accent: true },
      { d: 0.12, type: 'coupe' },
      { d: 1.6, type: 'titre', titre: 'On voit sept lignes, un total.' },
      { d: 1.6, type: 'titre', titre: 'Jamais le détail des travaux.' },
      { d: 1.6, type: 'titre', titre: 'Ni le nom du client.' },
      { d: 1.6, type: 'titre', titre: 'Le texte ne sort jamais.', accent: true },
      { d: 0.12, type: 'coupe' },
      { d: 1.6, type: 'titre', titre: 'Chaque lecture laisse une trace.' },
      { d: 1.5, type: 'titre', titre: 'Vous la lisez aussi.' },
      { d: 0.12, type: 'coupe' },
      { d: 1.6, type: 'titre', titre: 'Un verrou. Plus aucune demande.', accent: true },
      { d: 1.4, type: 'titre', titre: 'Toutes les formules. Essai compris.' },
      { d: 2.4, type: 'marque', mot: 'La porte ne s’ouvre qu’avec votre clic.' },
    ],
  },

// ───────────────────────────────────────────────────────────────────────────────────────────
  // 12 · LE GARDE-FOU DE L’IA — le seul garde-fou réellement EXÉCUTÉ (avec le 422 des mentions
  // du devis). Ce n’est pas une consigne dans un prompt : c’est du code qui relit le texte
  // généré avant qu’il soit proposé. Aucun drapeau, aucune formule : il tourne dès que le profil
  // de l’artisan contient un élément (lib/ai.ts:52-54). Le chemin filtré commun à TOUTES les
  // formules est la proposition du mode assisté — le mode par défaut (lib/plateformeConfig.ts:45).
  // La réponse automatique de la route des leads (lib/ai.ts:450-451) n’est atteinte qu’en mode
  // auto, verrouillé sous Studio (lib/plateformeConfig.ts:160) : la vidéo ne s’y adosse pas.
  '12': {
    titre: 'L’IA répond, le code relit',
    canal: 'LinkedIn + Facebook',
    fonde:
      'lib/ai/antiFabrication.ts:69-128 — `MOTIFS_CAPACITE`, 7 expressions régulières / 6 familles ' +
      '(déplacement :71 et :77, atelier :83, délai :89, permanence :95, garantie :105, prestation :111), ' +
      'chacune avec son test `declare(profil)` contre le texte du profil réel construit par `texteProfil` :36-43. ' +
      'lib/ai/antiFabrication.ts:145-162 `detecterCapacitesNonDeclarees` — boucle `for (const phrase of phrases(texte))`, ' +
      'donc phrase par phrase (`phrases` :137). ' +
      'lib/ai/antiFabrication.ts:165-171 `detecterPrixChiffres` ; la phrase porteuse du montant est retirée :205. ' +
      'lib/ai/antiFabrication.ts:185-209 `assainirReponse` : détecter → régénérer UNE fois (`regenere = true` :195, ' +
      'pas de boucle) → dégrader en retirant la phrase (`retirerPhrases` :206). ' +
      'Branchement que la vidéo montre : app/api/conversation/stream/route.ts:114-132 — mode assisté, ' +
      '`decision.comportement` vaut `preparer`, `generateConversationReply` appelé SANS `onDelta` (:121) → ' +
      'lib/ai.ts:637-639 `assainirReponse`, puis insertion en `etat: proposition` (:127) et notification ' +
      '« Réponse proposée — à valider » (:132). Ce chemin n’a aucun verrou de formule : le mode assisté est le mode ' +
      'par défaut (lib/plateformeConfig.ts:45 `CONFIG_DEFAUT`) et le mode auto y est ramené sous Studio ' +
      '(lib/plateformeConfig.ts:160 `modeEffectif`, :182-186 `decisionReponse`). ' +
      'L’autre branchement, lib/ai.ts:450-451 (`generateLeadReply`, app/api/leads/route.ts:240), n’est atteint ' +
      'qu’en mode auto (`decision.ok`, Studio 59 € et plus) : à l’Essai et à 29 €, la route des leads prend la ' +
      'branche :188-211 qui ne génère rien — la vidéo ne dit donc PAS « la première réponse au client ». ' +
      'Preuve : scripts/ia-unit-e2e.mjs, lancé avec `node --experimental-strip-types --import ./scripts/ts-loader.mjs`, ' +
      'exécuté le 2026-09-13 → 158 réussis, 0 échoués pour TOUTE la suite IA ; les deux blocs du filtre ' +
      '(« 3. Anti-fabrication étendu » :129-168 et « les huit cas de l’audit final » :229-246) en comptent 36 ' +
      '(26 + 10, comptage exécuté) — c’est le chiffre que dit le carton. ' +
      'Formule : `plateforme.conversation` est dans `BASE` (lib/plans.ts:36-41), et `BASE` est le jeu de ' +
      'l’essai gratuit, d’Essentiel 29 €, de Studio 59 € et de Signature 99 € (lib/plans.ts:57-63) ; le filtre ' +
      'lui-même n’est conditionné à aucune capacité ni à aucun drapeau de lib/flags.ts.',
    plans: [
      { d: 1.8, type: 'ouverture', kicker: 'Le garde-fou', titre: 'L’IA répond. Le code relit.' },
      { d: 1.6, type: 'titre', titre: 'La réponse proposée, avant validation.' },
      { d: 1.7, type: 'titre', titre: 'Sept règles lisent chaque phrase.' },
      { d: 2.0, type: 'titre', titre: 'Déplacement, atelier, délai, permanence, garantie, prestation.' },
      { d: 0.12, type: 'coupe' },
      { d: 1.6, type: 'titre', titre: 'Comparé à votre profil déclaré.' },
      { d: 1.7, type: 'titre', titre: 'Un montant part avec sa phrase.' },
      { d: 1.6, type: 'titre', titre: 'Le prix vit dans le devis.' },
      { d: 0.12, type: 'coupe' },
      { d: 1.7, type: 'titre', titre: 'Réécrite une fois. Sinon, supprimée.' },
      { d: 1.7, type: 'titre', titre: 'Trente-six vérifications, zéro échec.', sourd: true },
      { d: 1.8, type: 'titre', titre: 'Dès l’essai. Toutes les formules.', accent: true },
      { d: 2.4, type: 'marque', mot: 'L’IA répond. Le code relit ses promesses.' },
    ],
  },

// ───────────────────────────────────────────────────────────────────────────────────────────
  // 13 · LES COMPTES CLIENTS — lien magique, aucun mot de passe. Aucun drapeau, aucun palier.
  //
  // Ce que la section 13 des faits vérifiés interdit et que cette vidéo ne dit donc PAS :
  //   • pas d’« historique » ni de « retrouve ses demandes partout » — la liste « Mes demandes »
  //     vient du localStorage (PlatChat.tsx:104, 179-197) et `leads.client_plateforme_id` n’est
  //     ÉCRIT nulle part : aucune conversation n’est rattachée à un compte ;
  //   • pas d’« espace client » avec devis et factures — cet écran n’existe pas, le compte tient
  //     en une ligne de barre latérale (PlatChat.tsx:403-407) ;
  //   • pas de « il faut un compte pour écrire » — le fil se rouvre par jeton uuid, sans compte
  //     (app/api/conversation/route.ts:13-16 ; PlatChat.tsx:401 « Compte client — facultatif ») ;
  //   • pas de « 24 h » : c’est VINGT minutes, et l’email le dit au client mot pour mot ;
  //   • pas de « vos clients restent chez vous » ni de « sur votre domaine » : le lien n’est sur
  //     le domaine de l’artisan que s’il est vérifié (lib/urls.ts:30), sinon prestiapp.fr/p/<slug>
  //     (lib/urls.ts:40,51), et l’adresse d’envoi reste contact@prestiapp.fr (lib/email.ts:14,26).
  //     Le fait prouvé est l’étanchéité entre artisans, et c’est ce que dit le carton.
  '13': {
    titre: 'Vos clients entrent sans mot de passe',
    canal: 'Facebook',
    fonde:
      'Aucun drapeau : lib/flags.ts n’a pas d’entrée « comptes clients » et la ligne de grille ' +
      'lib/plans.ts:125 ne porte pas de `flag:` → publiée sans condition. Formule : `BASE`, ' +
      'lib/plans.ts:37 (`plateforme.comptes_clients`) → essai gratuit (plan `gratuit` = BASE, :58) ' +
      '+ 29 + 59 + 99 €, et aucun `peut(plan, …)` ne l’oppose à personne dans tout le dépôt. ' +
      'Implémentation : lib/clientAuth.ts:14 `DUREE_LIEN_MIN = 20` et :28 `expire_le` = maintenant ' +
      '+ 20 min, :44 refus si expiré · lib/clientAuth.ts:43-46 usage unique (`utilise_le`, « Ce ' +
      'lien a déjà servi. ») · lib/clientAuth.ts:16-17 sha256 du jeton en base, le jeton en clair ' +
      'n’existe que dans l’email · lib/clientAuth.ts:13,70 `DUREE_SESSION_J = 30` et :100-101 ' +
      'cookie de même durée, httpOnly + Secure + SameSite=Lax · ' +
      'supabase/migrations/0034_clients_plateforme.sql:8-19 la table n’a AUCUNE colonne de mot de ' +
      'passe, et :18 `unique (artisan_id, email)` → même email chez deux artisans = deux comptes ' +
      'étanches, « aucune donnée croisée » (en-tête :6-7 ; création scopée lib/clientAuth.ts:49-56) · ' +
      'app/api/p/auth/route.ts:66,69 « à votre nom » : `fromName` = le nom de l’artisan et ' +
      '`replyTo` = son email — c’est le NOM D’AFFICHAGE de l’expéditeur, l’adresse reste ' +
      'contact@prestiapp.fr (lib/email.ts:14,24-27) ; le lien (:63, urlPlateforme) n’est sur le ' +
      'domaine de l’artisan que s’il est vérifié (lib/urls.ts:30), sinon prestiapp.fr/p/<slug> ' +
      '(lib/urls.ts:40,51) — la vidéo ne promet ni l’un ni l’autre. Email : route.ts:64-70 ' +
      '`critique: true`, texte « Ce lien est valable 20 minutes et ne fonctionne qu’une fois. » (:68). ' +
      'Écran : app/p/[slug]/PlatChat.tsx:411-416 champ email + bouton « Recevoir mon lien » ; ' +
      ':201-219 consommation de `?connexion=` puis lecture de la session ; :403-407 le compte ' +
      'connecté (nom ou email + « Se déconnecter »). Vérifications écrites : ' +
      'scripts/comptes-clients-e2e.mjs:57-58 (rejeu = 400), :61-64 (cookie copié avant ' +
      'déconnexion refusé après), :72-76 (deux artisans, deux comptes, ids différents).',
    plans: [
      { d: 1.7, type: 'ouverture', kicker: 'Comptes clients', titre: 'Vos clients, sans mot de passe.' },
      { d: 1.5, type: 'titre', titre: 'Il tape son adresse email.' },
      { d: 1.6, type: 'titre', titre: 'Un lien arrive dans sa boîte.' },
      { d: 0.12, type: 'coupe' },
      { d: 1.7, type: 'titre', titre: 'Un clic, il est connecté.', accent: true },
      { d: 1.5, type: 'titre', titre: 'Le lien vaut vingt minutes.' },
      { d: 0.12, type: 'coupe' },
      { d: 1.6, type: 'titre', titre: 'Et il ne sert qu’une fois.' },
      { d: 1.6, type: 'titre', titre: 'L’email part à votre nom.' },
      { d: 1.5, type: 'titre', titre: 'Trente jours sans se reconnecter.' },
      { d: 0.12, type: 'coupe' },
      { d: 1.7, type: 'titre', titre: 'Aucune donnée partagée entre artisans.' },
      { d: 1.8, type: 'titre', titre: 'Inclus dès l’essai gratuit.', accent: true },
      { d: 2.4, type: 'marque', mot: 'Vos clients entrent sans mot de passe.' },
    ],
  },

// ───────────────────────────────────────────────────────────────────────────────────────────
  // 14 · LES PRIX — vos tarifs d’abord, le marché en repère. Socle (BASE), donc dès l’essai.
  '14': {
    titre: 'Vos prix passent en premier',
    canal: 'LinkedIn',
    fonde:
      'lib/prix/index.ts:26-42 — `catalogueDe` charge les prix de l’artisan (table `prix_artisan`, ' +
      'lib/prix/artisan.ts:26-33, .eq(\'actif\', true) :30, limite 150 — les plus récentes par date_prix), ' +
      'les place en tête (:38) et retire du lot tout poste du marché dont la désignation normalisée ' +
      'existe déjà chez lui (:34-35, commentaire du code : « plutôt que de proposer deux prix ' +
      'contradictoires pour la même chose ») — filtre par égalité STRICTE de désignation normalisée, ' +
      'd’où le carton « Même poste, votre prix gagne » et pas une garantie absolue. Appelé sur les DEUX ' +
      'chemins de chiffrage : app/api/devis/generer/route.ts:48 et lib/devisAuto.ts:57, d’où « Chaque ' +
      'devis y puise ». L’artisan saisit ses tarifs sur app/tarifs/page.tsx (ajout unitaire :182-186, ' +
      'import d’un tarif fournisseur :140-146, champ `fournisseur` :185 ; lien « Mes tarifs » ' +
      'app/AppShell.tsx:34) — lib/ai.ts:904 les annonce au modèle comme « prix réels, négociés — À ' +
      'PRIVILÉGIER ». ⚠️ Un import accepte 3 000 lignes (app/api/tarifs/route.ts:12) mais le moteur n’en ' +
      'reçoit que 150 : on ne dit donc jamais « repris toujours ». Le complément vient de la table ' +
      '`postes_types` (supabase/migrations/0002_devis.sql:76-80, semée :101-133) : 33 lignes comptées ' +
      'une par une, 8 métiers — Plombier 5, Électricien 5, Chauffagiste 4, Couvreur 4, Maçon 4, ' +
      'Menuisier 4, Peintre 4, Carreleur 3 — et VÉRIFIÉ EN PRODUCTION le 2026-09-13 (select metier, ' +
      "count(*) sur postes_types : mêmes comptes, toutes les lignes en min/max) ; lecture par égalité " +
      "stricte sur le métier (lib/prix/marche.ts:28-33, .eq('metier', metier).limit(60)). Jamais un " +
      'chiffre figé : colonnes prix_ht_min / prix_ht_max (0002_devis.sql:79) et lib/ai.ts:909 envoie la ' +
      'fourchette brute « min-max € ». L’étiquette est littéralement « ordre de grandeur du marché » ' +
      '(lib/prix/types.ts:50-51) ; toute provenance absente du catalogue retombe sur « estimation » ' +
      '(types.ts:69-73, appelé à lib/ai.ts:970). Dès l’essai : `devis.ia` et `devis.prix_artisan` sont ' +
      'dans BASE (lib/plans.ts:39), donc dans gratuit / essentiel / studio / signature (:58-61) — aucun ' +
      'palier à annoncer, et la ligne publique « Devis chiffrés par l’IA, sur vos prix » est cochée ' +
      'pour les trois offres (:129). Source unique tenue par le pré-commit : scripts/garde-commit.mjs:41-44 ' +
      'refuse tout montant en € dans les mémos de lib/ai.ts (motif écrit :38-40 — 23 postes sur 24 ' +
      'avaient fini par diverger entre le code et la table). NON DIT, VOLONTAIREMENT : aucun écran ne ' +
      'liste les 33 lignes (rien à filmer) ; `source_prix` est stocké (lib/lignes.ts:28-29) mais affiché ' +
      'nulle part ; aucune fraîcheur (marche.ts:46 retourne null) ; « prix ferme » et « prix du marché » ' +
      'sont interdits même en négation ; et « votre métier est couvert » serait FAUX — l’inscription ' +
      'propose 29 métiers (app/onboarding/page.tsx:10-16) contre 8 servis, d’où le carton gris qui ' +
      'annonce huit métiers sans détour. Pas de capture : aucune n’existe pour ce sujet.',
    plans: [
      { d: 2.0, type: 'ouverture', kicker: 'Le chiffrage', titre: 'Vos prix passent en premier.' },
      { d: 1.8, type: 'titre', titre: 'Vos tarifs négociés, chez votre fournisseur.' },
      { d: 1.7, type: 'titre', titre: 'Une saisie. Chaque devis y puise.' },
      { d: 0.12, type: 'coupe' },
      { d: 1.8, type: 'titre', titre: 'Un poste jamais chiffré chez vous.' },
      { d: 1.9, type: 'titre', titre: 'Un ordre de grandeur du marché.' },
      { d: 1.8, type: 'titre', titre: 'Une fourchette, jamais un chiffre figé.' },
      { d: 0.12, type: 'coupe' },
      { d: 1.7, type: 'titre', titre: 'Huit métiers, trente-trois postes.', sourd: true },
      { d: 1.9, type: 'titre', titre: 'Même poste, votre prix gagne.', accent: true },
      { d: 1.7, type: 'titre', titre: 'Dès l’essai, sans supplément.' },
      { d: 2.4, type: 'marque', mot: 'Vos prix d’abord. Le marché en repère.' },
    ],
  },

// ───────────────────────────────────────────────────────────────────────────────────────────
  // 15 · LES TROIS MOTEURS — Standard / Pro / Expert, choisis à la main sur le devis.
  // Aucune capture : /outils affiche le même sélecteur avec le libellé « Moteur de chiffrage »
  // alors qu'il rédige une réponse, pas un devis — une capture mentirait sur l'écran.
  // Aucun nom de modèle à l'écran : lib/models.ts:2-3 en fait une décision produit.
  // Contrôle : « tout de suite » retiré (le code dit « voie rapide », pas « immédiat ») ;
  // « trois crédits » précisé PAR CHIFFRAGE — l'entrée 10 emploie « trois crédits » pour la
  // dotation de l'essai, et Signature en donne 600 par mois (lib/plans.ts:61).
  '15': {
    titre: 'Standard, Pro, Expert : les trois moteurs',
    canal: 'Facebook + Instagram',
    fonde:
      'lib/models.ts:6-10 — MODEL_BY_TIER mappe standard/pro/expert sur trois vrais modèles ' +
      'différents (mapping serveur uniquement, jamais affiché : lib/models.ts:2-3). ' +
      'lib/ai.ts:20-23 — supportsThinking() est une regex qui exclut Haiku 4.5 : Standard reste ' +
      'sur la voie rapide. lib/ai.ts:30-35 — genParams n’ajoute thinking:{type:"adaptive"} qu’aux ' +
      'modèles capables (Pro/Expert). lib/ai.ts:937 — le chiffrage d’un devis passe par ' +
      'genParams(model, 2200) ; lib/ai.ts:887-936 — UN SEUL prompt system (catalogue de prix, TVA ' +
      'ligne par ligne, provenance obligatoire) construit sans jamais tester le modèle : seul le ' +
      'moteur change. app/devis/[id]/page.tsx:34 (useState<Tier>("standard")), :270 (<ModelSelect/>) ' +
      'et :130 (body { model: tier }) — c’est l’artisan qui choisit à la main ; lib/ai/routage.ts:46-50 ' +
      '— « Expert : jamais automatique ». lib/plans.ts:56-61 — gratuit et essentiel (29 €) : ' +
      'tiers ["standard"] ; studio (59 €) : ["standard","pro"] ; signature (99 €) : ' +
      '["standard","pro","expert"]. lib/plans.ts:67 — CREDIT_COST = { standard: 1, pro: 1, expert: 3 }, ' +
      'débité À CHAQUE CHIFFRAGE via app/api/devis/generer/route.ts:40 puis lib/credits.ts:17.',
    plans: [
      { d: 1.7, type: 'ouverture', kicker: 'Le chiffrage', titre: 'Trois moteurs. Vous choisissez.' },
      { d: 1.5, type: 'titre', titre: 'Standard, Pro, Expert.' },
      { d: 1.7, type: 'titre', titre: 'Standard chiffre directement.' },
      { d: 1.8, type: 'titre', titre: 'Pro et Expert réfléchissent avant.', accent: true },
      { d: 0.12, type: 'coupe' },
      { d: 1.6, type: 'titre', titre: 'Mêmes règles de métreur.' },
      { d: 1.7, type: 'titre', titre: 'Seul le moteur change.', accent: true },
      { d: 1.6, type: 'titre', titre: 'Vous décidez selon le chantier.' },
      { d: 0.12, type: 'coupe' },
      { d: 1.6, type: 'titre', titre: 'Standard dès l’essai gratuit.' },
      { d: 1.6, type: 'titre', titre: 'Pro à partir de 59 €/mois.' },
      { d: 1.5, type: 'titre', titre: 'Expert à 99 €/mois.' },
      { d: 1.6, type: 'titre', titre: 'Trois crédits par chiffrage.', accent: true },
      { d: 2.4, type: 'marque', mot: 'Vous choisissez le moteur. Presti chiffre.' },
    ],
  },

// ───────────────────────────────────────────────────────────────────────────────────────────
  // 16 · LA PAGE DE CONVERSATION À VOTRE MARQUE — white-label de /p/[slug], socle (essai compris).
  // Aucun mot sur le NOM DE DOMAINE : c'est un sujet distinct, et le piège documenté de la vague 1.
  // Aucun mot sur « nos couleurs » : l'accent par défaut EST le corail de Presti (voir fonde).
  '16': {
    titre: 'La page de conversation à votre marque',
    canal: 'Instagram',
    fonde:
      'app/p/[slug]/page.tsx sert la page, et lib/flags.ts:13-71 ne contient AUCUNE entrée pour ' +
      'elle : rien ne la garde. lib/plans.ts:37 met `plateforme.conversation` dans `BASE`, donc ' +
      'dès l’essai à 0 € (PLANS.gratuit, lib/plans.ts:58, `capacites: BASE`, `prixMois: 0`, ' +
      'accroche « sans carte ») ; vérifié par scripts/abonnement-e2e.mjs:187 (`peut` sur `gratuit` ' +
      'et `plateforme.conversation`) et :185 (aucun identifiant Stripe sur l’essai). Le client ' +
      'écrit dans un fil : scripts/plateforme-e2e.mjs:33 contrôle le composeur (.pchat-composer ' +
      'textarea) et :42-43 les bulles du fil (.pchat-row.me / .them). La marque affichée est celle ' +
      'de l’artisan : app/p/[slug]/page.tsx:55 `title: { absolute: nom — métier }`, :106-107 la ' +
      'couleur d’accent de l’artisan (validée #rrggbb) est posée :129 en variable CSS `--pc` sur ' +
      'toute la page, et app/p/[slug]/icon.tsx:16-22 rend SON logo (sinon ses initiales sur SA ' +
      'couleur) comme favicon de l’onglet — le commentaire ligne 4 rappelle que l’onglet affichait ' +
      'avant celui de Presti ; app/p/[slug]/apple-icon.tsx fait de même pour iOS. ' +
      'app/p/[slug]/layout.tsx:17-25 efface le manifeste, le mode « app iOS » et la couleur de ' +
      'thème hérités du layout racine. Le white-label est TESTÉ, pas commenté : ' +
      'scripts/plateforme-e2e.mjs:37 charge /p/<slug>, retire la chaîne « prestiapp.fr » du HTML ' +
      'rendu et affirme qu’il ne reste plus aucun « presti » dans la page. ⚠️ La vidéo ne dit ' +
      'JAMAIS « ni nos couleurs » : la couleur d’accent PAR DÉFAUT est le corail de Presti — ' +
      'supabase/migrations/0014_accent.sql:2 (`default \'#D97757\'`), lib/plateformeStyle.ts:42 ' +
      '(`ACCENT_DEFAUT = \'#D97757\'`), app/profil/page.tsx:102 et :228 — le même #D97757 que ' +
      'app/globals.css:1101 (`--co`) et scripts/hf-composer.mjs:43 (`CORAIL`). Un artisan qui n’a ' +
      'pas touché sa couleur a donc la nôtre sur sa page. « Votre couleur » = celle qu’il choisit ' +
      'dans Profil (app/profil/page.tsx:353), pour toutes les offres, essai compris ' +
      '(app/api/plateforme/apparence/route.ts:66-86, « Thème + accent : toutes les offres »). ' +
      'Ce que la page n’a JAMAIS de Presti, quelle que soit la formule : le nom (test :37) et le ' +
      'logo (icon.tsx, apple-icon.tsx) — c’est ce que dit le carton « Ni notre logo, ni notre nom ».',
    plans: [
      { d: 1.8, type: 'ouverture', kicker: 'Votre marque', titre: 'Votre page de conversation.' },
      { d: 1.6, type: 'titre', titre: 'Le client décrit son chantier.' },
      { d: 1.5, type: 'titre', titre: 'Il écrit, comme un message.' },
      { d: 1.6, type: 'titre', titre: 'Sur une page à vous.' },
      { d: 0.12, type: 'coupe' },
      { d: 1.6, type: 'titre', titre: 'Votre nom. Votre couleur.' },
      { d: 1.6, type: 'titre', titre: 'Votre logo dans l’onglet.' },
      { d: 1.7, type: 'titre', titre: 'Le client voit votre entreprise.' },
      { d: 0.12, type: 'coupe' },
      { d: 1.9, type: 'titre', titre: 'Votre page, sans mention de Presti.', accent: true },
      { d: 1.6, type: 'titre', titre: 'Ni notre logo, ni notre nom.' },
      { d: 1.9, type: 'titre', titre: 'Dès l’essai. Sans carte.', accent: true },
      { d: 2.4, type: 'marque', mot: 'Votre page de conversation, à votre marque.' },
    ],
  },

// ───────────────────────────────────────────────────────────────────────────────────────────
  // 17 · LA PERSONNALISATION DE LA PAGE — plateforme.personnalisation_avancee (STUDIO).
  // Deux étages, et la vidéo les sépare : ambiance + accent pour tout le monde dès l’essai,
  // le reste (polices, fond, avatar, amorces) à 59 €. Le palier est DIT à l’écran, plan 6.
  '17': {
    titre: 'Votre page de conversation, à votre image',
    canal: 'Instagram',
    fonde:
      'lib/flags.ts:66 → `plateformePersona: true`. app/api/plateforme/apparence/route.ts:66-86 — ' +
      'l’ambiance et la couleur d’accent sont traitées AVANT tout verrou, donc dans toutes les ' +
      'offres et dès l’essai (PLANS.gratuit, prixMois: 0, lib/plans.ts:58). Six ambiances : ' +
      'lib/plateformeStyle.ts:41 `THEMES_PLAT` et app/plateforme/Apparence.tsx:35-37. ' +
      'route.ts:92-95 → `if (demandeAvance && !peut(a.plan, CAPACITE)) … 403` avec ' +
      'CAPACITE = `plateforme.personnalisation_avancee`, placée dans le tableau STUDIO ' +
      '(lib/plans.ts:44) : polices, fond, avatar et amorces commencent donc à 59 € ' +
      '(PLANS.studio, prixMois: 59, lib/plans.ts:60), et l’interface pose le cadenas ' +
      '(Apparence.tsx:174). Huit couples de polices : lib/siteStyle.ts:43-52, importés par ' +
      'lib/plateformeStyle.ts:13, posés en `--pfd`/`--pfb` (:117). Quatre fonds : ' +
      'Apparence.tsx:233 (« Celui de l’ambiance / Une couleur / Un dégradé / Une photo ») et ' +
      'lib/plateformeStyle.ts:129 (dégradé) / :131 (photo). Quatre amorces au plus : ' +
      'lib/plateformeStyle.ts:207-211 `amorcesSures`, quatre champs à l’écran ' +
      '(Apparence.tsx:210-213) et quatre boutons cliquables chez le client ' +
      '(app/p/[slug]/PlatChat.tsx:456, `onClick={() => envoyer(a)}`). Contraste : ' +
      'ACCENT_VISIBILITE_MIN = 2.2 et CIBLE = 3 (lib/plateformeStyle.ts:47-48), correction posée ' +
      'à route.ts:83 (accent) et :100-104 (couleur secondaire). NB : cette vidéo ne parle QUE de ' +
      'la page de conversation /p/[slug] — le site vitrine a son propre système (lib/siteStyle.ts) ' +
      'et sa propre ligne de grille (lib/plans.ts:127).',
    plans: [
      { d: 1.8, type: 'ouverture', kicker: 'Votre page', titre: 'Celle où le client écrit.' },
      { d: 1.5, type: 'titre', titre: 'Vous choisissez son allure.' },
      { d: 1.5, type: 'titre', titre: 'Six ambiances, une couleur d’accent.' },
      { d: 1.5, type: 'titre', titre: 'Tout ça, dès l’essai gratuit.' },
      { d: 0.12, type: 'coupe' },
      { d: 1.7, type: 'titre', titre: 'Le reste ouvre à 59 €/mois.', sourd: true },
      { d: 1.6, type: 'titre', titre: 'Huit couples de polices.' },
      { d: 1.6, type: 'titre', titre: 'Couleur, dégradé, ou votre photo.' },
      { d: 1.5, type: 'titre', titre: 'Votre avatar, vos amorces.' },
      { d: 1.6, type: 'titre', titre: 'Quatre phrases, prêtes à cliquer.' },
      { d: 0.12, type: 'coupe' },
      { d: 1.7, type: 'titre', titre: 'Une couleur illisible est corrigée.' },
      { d: 1.6, type: 'titre', titre: 'Votre page reste lisible.', accent: true },
      { d: 2.4, type: 'marque', mot: 'Votre page, à votre image.' },
    ],
  },

// ───────────────────────────────────────────────────────────────────────────────────────────
  // 18 · LES TROIS NIVEAUX DE SITE VITRINE — une formule, un niveau, des blocs en plus.
  // Chaque palier est ANNONCÉ AVEC SON PRIX : la vague 1 s’est brûlée en vendant les photos de
  // chantier « dès la formule d’entrée » alors que lib/siteLayout.ts:29 met gallery au niveau 2.
  // Contrôle du 2026-09-13 : « secteur + disponibilités » retiré de l’argument Studio (ils
  // s’affichent déjà au niveau 1, page.tsx:259-265 et :370-374) ; « six blocs » devient
  // « jusqu’à six blocs » (hero et contact seuls sont garantis) ; Essentiel vaut 29 €, pas « dès ».
  '18': {
    titre: 'Trois niveaux de site vitrine',
    canal: 'Facebook',
    fonde:
      'lib/plans.ts:58-61 — siteMax: 1 (essai gratuit + Essentiel 29 €), 2 (Studio 59 €), ' +
      '3 (Signature 99 €) ; prixMois: 0 / 29 / 59 / 99, sans autre tarif (OFFRES, :102-103). ' +
      'lib/plans.ts:79 — siteMaxForPlan(plan) = planConf(plan).siteMax ?? 1. ' +
      'lib/siteLayout.ts:27-31 — SECTION_MIN_TIER : hero/contact/services/about/process/faq/zone = 1 ; ' +
      'trust + gallery = 2 ; slides, words, features, manifesto, avantapres = 3. ' +
      'lib/siteLayout.ts:38-49 — defaultLayout : 13 identifiants au niveau 3 (:44), 8 au niveau 2 (:46), ' +
      '6 au niveau 1 (:47) ; :64-65 — seuls hero et contact sont garantis, les autres sections rendent ' +
      'null sans contenu (page.tsx:352 services, :365 about, :380 process, :391 faq) — d’où « jusqu’à ». ' +
      'lib/siteLayout.ts:61 — resolveLayout filtre côté SERVEUR : ' +
      '.filter((s) => s.on !== false && SECTION_MIN_TIER[s.id] <= tier). ' +
      'app/site/[slug]/page.tsx:136 — const tier = Math.min(Number(a.site_tier), siteMaxForPlan(a.plan)) : ' +
      'le niveau rendu est borné par la formule courante, à chaque affichage. ' +
      'app/site/[slug]/page.tsx:177 + :331 — showReal = realisations.length > 0 && tier >= 2 : la galerie ' +
      'de chantiers n’existe qu’au niveau 2 ; aux niveaux 1 et 2 le hero n’a pas d’image (:236, tier === 3). ' +
      'app/site/[slug]/page.tsx:274 — le bandeau (trust) rend si tier >= 2 et au moins 2 faits déclarés ' +
      '(:201-203 zone, horaires ; :210-212 délai mesuré, prestations ou téléphone) ; son libellé console est ' +
      '« Bandeau confiance » (app/profil/page.tsx:20). ⚠️ page.tsx:259-265 et :370-374 — la zone et les ' +
      'horaires s’affichent DÉJÀ au niveau 1 (hero, à-propos) : ce n’est pas un argument Studio. ' +
      'app/site/[slug]/page.tsx:194 — const showAvantApres = tier >= 3 && aaPairs.length > 0 ; ' +
      'app/profil/page.tsx:581-582 — le bloc de dépôt avant/après n’apparaît que si siteMax >= 3.',
    plans: [
      { d: 1.7, type: 'ouverture', kicker: 'Votre site vitrine', titre: 'Trois niveaux au choix.' },
      { d: 1.5, type: 'titre', titre: 'Essentiel, 29 €/mois.' },
      { d: 1.6, type: 'titre', titre: 'Accueil, prestations, questions, contact.' },
      { d: 1.4, type: 'titre', titre: 'Jusqu’à six blocs, dès l’essai.' },
      { d: 0.12, type: 'coupe' },
      { d: 1.5, type: 'titre', titre: 'Studio, 59 €/mois.' },
      { d: 1.7, type: 'titre', titre: 'Vos chantiers en photos.', accent: true },
      { d: 1.5, type: 'titre', titre: 'Plus un bandeau confiance.' },
      { d: 0.12, type: 'coupe' },
      { d: 1.5, type: 'titre', titre: 'Signature, 99 €/mois.' },
      { d: 1.8, type: 'titre', titre: 'Avant/après, jusqu’à treize blocs.', accent: true },
      { d: 0.12, type: 'coupe' },
      { d: 1.7, type: 'titre', titre: 'Le niveau suit votre formule.' },
      { d: 2.4, type: 'marque', mot: 'Votre vitrine, à votre échelle.' },
    ],
  },

// ───────────────────────────────────────────────────────────────────────────────────────────
  // 19 · L’EXPORT DES DONNÉES — aucun drapeau, aucun verrou d’offre, donc AUCUN PRIX à l’écran.
  //      ⛔ lib/plans.ts:47 range 'export' dans STUDIO et lib/plans.ts:138 barre l’Essentiel, mais
  //         AUCUN code ne lit cette capacité : zéro appel `peut(…, 'export')` dans app/ et lib/
  //         (grep vérifié, zéro résultat), la route ne demande qu’une session (route.ts:71-73) et
  //         lib/aide.ts:370 annonce disponibleAvec: 'essentiel'. Citer 59 € ici serait l’erreur
  //         WhatsApp en miroir. Cette vidéo ne prononce aucun prix, aucune formule.
  //      ⛔ Jamais « toutes vos données » : l’export prend 12 jeux, la base en compte plus de
  //         cinquante. On nomme ce qu’on emporte, on ne totalise pas.
  //      ⛔ Jamais « inventaire » : route.ts:31 interroge une table `inventaire` qui n’existe dans
  //         aucune migration (les fiches sont dans `materiaux`), l’erreur est avalée et le fichier
  //         sort vide pour tout le monde. À signaler à Benj — surtout pas à filmer.
  '19': {
    titre: 'Emporter vos données',
    canal: 'LinkedIn',
    fonde:
      'app/api/donnees/export/route.ts — GET authentifié (l.71-73), et RIEN d’autre : aucune ' +
      'lecture du plan, aucun `peut(…, ’export’)` nulle part dans app/ ni lib/. Collecte de ' +
      '12 jeux (l.22-67) dont conversations, messages, devis, factures, clients_plateforme et ' +
      'tarifs (prix_artisan, l.30 → clé `tarifs` l.59) ; messages relus par lots (l.49-54). ' +
      'LISEZ-MOI.txt puis un JSON par jeu (l.94-99), la ligne l.98 rappelant les obligations de ' +
      'conservation (10 ans, pièces comptables). PDF de CHAQUE devis et facture régénérés depuis ' +
      'la base avec le moteur d’envoi (l.102-109, renderPdfToBuffer + DevisPDF + buildPdfData — ' +
      'le même que /api/devis/[id]/pdf, commentaire l.13-14), un PDF raté n’interrompant pas ' +
      'l’archive (l.110-113). Sortie : flux ZIP, Content-Type application/zip, filename ' +
      '"mes-donnees-presti-${jour}.zip" avec jour = date du jour (l.74 et l.123-128). Écrivain ZIP ' +
      'maison : lib/zip.ts:48-95. Bouton réel : app/parametres/SectionDonnees.tsx:28-51 et :109 ' +
      '(« Télécharger mon archive (.zip) »), texte d’écran :107 « Vos données vous appartiennent — ' +
      'à tout moment, sans condition ». Preuve bout en bout : scripts/parametres-e2e.mjs:167-201 ' +
      '(signature ZIP 0x04034b50, répertoire central, noms de fichiers, JSON non doublement encodés).',
    plans: [
      { d: 1.7, type: 'ouverture', kicker: 'Vos données', titre: 'Un bouton. Une archive.' },
      { d: 1.6, type: 'titre', titre: 'Vos devis. Vos factures.' },
      { d: 1.6, type: 'titre', titre: 'Vos clients, vos conversations.' },
      { d: 1.5, type: 'titre', titre: 'Et tous vos messages.' },
      { d: 1.5, type: 'titre', titre: 'Vos tarifs aussi.' },
      { d: 0.12, type: 'coupe' },
      { d: 1.8, type: 'titre', titre: 'Vos PDF partent avec.', accent: true },
      { d: 1.7, type: 'titre', titre: 'Vos pièces comptables, chez vous.' },
      { d: 0.12, type: 'coupe' },
      { d: 1.7, type: 'titre', titre: 'Une archive datée du jour.' },
      { d: 1.6, type: 'titre', titre: 'Sans rien demander à personne.' },
      { d: 1.8, type: 'titre', titre: 'À tout moment, sans condition.', accent: true },
      { d: 2.4, type: 'marque', mot: 'Vos données vous appartiennent. Emportez-les.' },
    ],
  },

// ───────────────────────────────────────────────────────────────────────────────────────────
  // 20 · LES RÈGLES D'AUTOMATISATION — plateforme.regles, SIGNATURE uniquement (99 €).
  // Le mot « règle » est au SINGULIER partout : artisan_id est la clé primaire de la table, il
  // n'y a qu'une règle par artisan. Et on ne dit jamais « seuls les Signature voient le
  // constructeur » (l'onglet est ouvert à tous, sans condition) : on dit que la règle S'EXÉCUTE
  // en Signature — le verrou est côté serveur, lib/reglesServeur.ts:33.
  '20': {
    titre: 'Votre règle d’automatisation',
    canal: 'LinkedIn + Facebook',
    fonde:
      'lib/flags.ts:56 — `plateformeRegles: true`. lib/plans.ts:49-51 — `plateforme.regles` est ' +
      'dans `SIGNATURE` seulement (ni BASE, ni STUDIO), et :61 fixe `prixMois: 99` ; le verrou ' +
      'serveur est relu à lib/reglesServeur.ts:32-33 (`peut(art?.plan, …)` refuse sans la capacité ' +
      '`plateforme.regles`), ce que confirme scripts/regles-verrou-e2e.mjs:40-42. La règle : ' +
      'supabase/migrations/0050_pilotage.sql:46-49 — table `regles_automatisation`, `artisan_id` en ' +
      'CLÉ PRIMAIRE (une seule règle par artisan), colonne `maillons` jsonb ; les 7 maillons à ' +
      'lib/regles.ts:18-33, réécrits en phrase par `phraseRegle` :81-92 (rendue en direct à ' +
      'app/plateforme/Automatisations.tsx:61, `aria-live`). Le défaut : lib/regles.ts:47 et :61 — ' +
      '`MAILLONS_DEFAUT = PREREGLAGES.equilibre.maillons`, `validation: true`. L’envoi sans clic : ' +
      'lib/regles.ts:122 `envoyerSansValidation = !m.validation && m.envoyer_apres_validation`, et ' +
      'Automatisations.tsx:80 le dit à l’écran (« sans ce maillon, le devis part seul dans la ' +
      'conversation ») ; l’envoi passe par lib/reglesServeur.ts:59-60 — statut `envoye` + message ' +
      'inséré DANS LA CONVERSATION (aucun email au prospect). Les garde-fous : ' +
      '0050_pilotage.sql:68 (`unique index devis_regle_par_lead_idx` sur `devis (lead_id)`, partiel ' +
      'sur la source `regle`) doublé par lib/regles.ts:112 ; lib/reglesServeur.ts:56-62 ' +
      '(`mentionsManquantesEmission` avant l’envoi, liste bloquante lib/legalArtisan.ts:88 : siret, ' +
      'assurance…) ; lib/regles.ts:111 (« l’artisan a pris la main »). L’acompte : ' +
      'lib/reglesServeur.ts:80-83 (`acompteApresAcceptation`) appelé à ' +
      'app/api/conversation/devis/route.ts:88, puis `creerFacture(..., acomptePct)` :90 et message ' +
      '« Facture d’acompte <n°> (<N> %) » :93.',
    plans: [
      { d: 1.7, type: 'ouverture', kicker: 'Offre Signature', titre: 'Votre règle d’automatisation.' },
      { d: 1.5, type: 'titre', titre: 'Une phrase. Sept maillons.' },
      { d: 0.12, type: 'coupe' },
      { d: 1.6, type: 'titre', titre: 'Besoin qualifié, devis brouillon prêt.' },
      { d: 1.6, type: 'titre', titre: 'Par défaut, vous validez.', accent: true },
      { d: 0.12, type: 'coupe' },
      { d: 1.5, type: 'titre', titre: 'Ou vous décochez la validation.' },
      { d: 1.5, type: 'titre', titre: 'Le devis part seul.' },
      { d: 1.4, type: 'titre', titre: 'Dans la conversation, sans clic.' },
      { d: 0.12, type: 'coupe' },
      { d: 1.4, type: 'titre', titre: 'Jamais deux devis automatiques par conversation.' },
      { d: 1.4, type: 'titre', titre: 'Sans SIRET ni assurance, rien.' },
      { d: 1.4, type: 'titre', titre: 'Reprenez la main, elle se tait.' },
      { d: 1.5, type: 'titre', titre: 'Le client accepte, l’acompte se facture.', accent: true },
      { d: 1.6, type: 'titre', titre: 'Elle tourne en Signature, 99 €/mois.', sourd: true },
      { d: 2.4, type: 'marque', mot: 'Votre règle tourne, vous tenez le chantier.' },
    ],
  },
}
