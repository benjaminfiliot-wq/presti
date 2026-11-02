# Analyse des vidéos du 01/11/2026 — pour les cinq chantiers de Presti

Livrable demandé par Benj le 01/11/2026. Sources : pipeline A (3 vidéos YouTube, 55 segments de 10 à 15 minutes, une carte par
segment puis une fiche par vidéo : `videos/references-2026-11-01/youtube/fiches/`) et pipeline B (10 TikToks en 4 thèmes :
`videos/references-2026-11-01/pipeline-b-fiches.json`, `ANALYSE-TIKTOK.md`). Chaque affirmation renvoie à un horodatage de la vidéo.
Les fiches sont recopiées telles qu’écrites par les pipelines ; la synthèse, le top 20, les hooks et les notes à créer sont de Claude Code.

## A — Les 3 vidéos YouTube

### The ONLY Ai Agency Course You Need To Watch in 2026 (O3A2xnBadFo, 5 h 00) — priorité moyenne

Synthèse lisible : `videos/references-2026-11-01/youtube/fiches/O3A2xnBadFo.synthese.md`.

```json
{
  "video_id": "O3A2xnBadFo",
  "source": "youtube",
  "titre": "The ONLY Ai Agency Course You Need To Watch in 2026",
  "duree": "5 h 00",
  "resume": "Cours-fleuve de Tim Chao sur la vente de services IA en agence, mêlé à la promotion de son coaching et de ses logiciels (GTM, Lumina). Le cœur est une méthode de vente par appel de décision : cadre, questions de découverte, écart douleur/objectif, présentation courte, note d'alignement [01:19]-[01:48]. S'y ajoutent la spécialisation par niche [03:14], [04:13], le vocabulaire du métier [01:22], [04:00], l'onboarding client et le suivi à 14 ou 30 jours [00:12], [04:41], la délivrabilité e-mail avec domaine dédié [02:48]. Le reste, soit la majorité de la prospection décrite, est interdit pour Presti : SMS, LinkedIn automatique, appels, outils et leads payants, gros volumes. Tous les chiffres de revenus (172 000, 35 000, etc.) sont des affirmations du vidéaste, non vérifiables (affirmé).",
  "outils_mentions": [
    "[00:03] GTM (envoi e-mail, SMS, LinkedIn ; payant, exclu)",
    "[00:05] Twilio (numéros et SMS ; payant, exclu)",
    "[00:09] Apollo, Clay (listes de leads ; payant, exclu)",
    "[00:07] Discord (communauté, appels simulés)",
    "[00:09] Claude (personas de prospects, étude de marché [00:38])",
    "[00:49] Fathom (enregistrement et transcription d'appels ; à vérifier, risque payant)",
    "[00:56] Portail client (statut, mises à jour, support)",
    "[00:35] Lumina (SaaS de démos IA, payant)",
    "[02:35] Mailchimp (campagnes après export CSV)",
    "[02:48] Instantly, Google Workspace, IMAP (domaines et boîtes d'envoi)",
    "[03:31] Classifieur léger non-LLM pour trier les messages",
    "[04:08] Cluely (suggestions en direct pendant un appel ; payant, intrusif, exclu)",
    "[00:14] Loom (courtes vidéos de démonstration)"
  ],
  "workflows_decrits": [
    "[00:06] Script d'approche simple : se présenter, dire ce qu'on apporte, proposer de montrer sans vendre, réserver un appel.",
    "[00:12] Après livraison : bonus inattendu, point d'optimisation deux semaines plus tard, petites démos envoyées entre-temps.",
    "[00:29]-[00:30] Après réservation : page de remerciement avec vidéo et FAQ, puis rappels avant l'appel.",
    "[01:24]-[01:27] Appel de décision : intro courte, cadre annoncé, accord du prospect, décideur identifié dès le début.",
    "[01:31]-[01:36] Découverte : activité, chiffres, outils, douleurs, ce qui a déjà été tenté, objectif visé.",
    "[01:42]-[01:44] Permission, pitch court limité aux douleurs entendues, puis note d'alignement de 1 à 10 avec son motif.",
    "[00:49] Onboarding : formulaire d'information long rempli avant la fabrication, transcription de l'appel jointe au ticket.",
    "[02:39]-[02:40] Envoi ciblé : segmentation par profil, échantillon de destinataires validé avant l'envoi.",
    "[02:48]-[02:51] Prospection e-mail : domaine secondaire dédié, boîtes chauffées, montée progressive du volume.",
    "[04:41] Suivi client : formulaire initial, livraison, point à 30 jours, revente d'extras utiles."
  ],
  "strategies": [
    "[00:04] Se positionner comme spécialiste d'une niche.",
    "[03:14]-[03:16] Commencer par un seul métier, celui où les données publiques sont les meilleures.",
    "[00:08] Suivre les chiffres de chaque étape et corriger le maillon le plus faible.",
    "[01:22] Parler avec les mots exacts du prospect.",
    "[00:13] Laisser une séquence tourner environ 30 jours avant de juger.",
    "[00:16] Hiérarchiser : offre et message avant les détails de design ; trancher par les chiffres.",
    "[00:32] Les clients satisfaits recommandent : demander des recommandations.",
    "[02:26] Résoudre un problème précis, puis le suivant, jusqu'à un système unique.",
    "[04:03] Garder une présentation d'une ou deux phrases, identique à chaque appel.",
    "[04:36] Séparer vente et suivi client dans une équipe."
  ],
  "erreurs_a_eviter": [
    "[00:03] Prospection automatique par SMS et LinkedIn (GTM, Twilio) : interdite (art. L34-5 CPCE ; règle LinkedIn).",
    "[00:03] Appels de prospection, phone setters, power dialer : exclus [01:02], [03:51], [04:34].",
    "[00:05] Outils et leads payants (GTM, Lumina, Twilio, Apollo, Clay, Cluely, Instantly) : exclus.",
    "[00:50] Volumes de 900 à 50 000 e-mails par jour : Presti reste à 300 par jour au maximum [03:12].",
    "[01:41] Urgence artificielle (« pourquoi pas maintenant ») : fausse urgence, interdite.",
    "[01:45] Prix d'ancrage fictif (grosse licence puis version allégée) : interdit [01:46].",
    "[00:41] Références ou logos empruntés, cas clients d'autrui : faux témoignages [03:59].",
    "[01:32] Créer un sentiment d'ignorance avec des indicateurs obscurs : manipulatoire.",
    "[01:36] Gonfler l'ambition du prospect pour monter le prix : pression artificielle.",
    "[02:57] Ciblage par revenus, patrimoine, enfants : données personnelles de particuliers [04:55]-[04:56].",
    "[02:36] Cibler des particuliers (membres, décédés) par e-mail sans filtre : hors cadre.",
    "[03:06] Surveiller les réseaux sociaux des prospects pour déclencher l'envoi : exclu.",
    "[04:21] Construire trois semaines une solution avant d'avoir un client.",
    "[00:00] Revenus affirmés (172 000, 35 000, millions) : jamais repris comme preuve (affirmé)."
  ],
  "hooks_accroches": [
    "[01:27] Annoncer franchement qu'on vient vendre, pas parler technologie.",
    "[01:25] « À la fin, un oui ou un non ensemble. »",
    "[02:32] Image du paquebot contre le jet-ski, grand éditeur contre petite structure.",
    "[01:54] Image des trois engrenages : marketing, vente, livraison.",
    "[00:42] Raconter un problème vécu puis sa solution.",
    "[02:41] Opposer automatisation classique et vraie IA.",
    "[01:23] Réflexe de clarification : demander ce que le prospect veut dire.",
    "[04:13] Chercher son métier plus un logiciel sur Google pour montrer une niche négligée."
  ],
  "formats_contenu": [
    "[00:00] Cours long format face caméra avec extraits d'appels de groupe.",
    "[00:36] Vidéo de présentation de 4 à 6 minutes, seule partie scriptée.",
    "[00:42] Vidéo courte problème, solution, enseignement.",
    "[01:49] Liste courte des sept objections, découpable en carrousel.",
    "[01:54] Métaphore visuelle des engrenages, adaptable en motion design.",
    "[03:17] Courte vidéo FAQ par objection, placée sur la page du métier.",
    "[00:47] Vidéo de veille envoyée à la base de clients."
  ],
  "applicabilite_chantiers": {
    "cerveau_obsidian": {
      "pertinent": true,
      "actions": [
        "[04:19] Créer dans le vault une note par métier du bâtiment (plombier, électricien, maçon) : douleurs, objections, vocabulaire, tâches. Alimentation manuelle ; Hermes la lit via MCP cerveau avant toute rédaction. Voir aussi [00:59], [04:00], [04:48].",
        "[01:08] Créer une note « contexte Presti » (offre Studio/Signature, cible, ton, preuves réelles) que Hermes lit avant chaque campagne ou contenu ; version courte : pitch en deux phrases [04:03].",
        "[01:24] Créer une note « trame d'appel de démo artisan » : intro, cadre, questions, démo, décision ; y joindre les questions de découverte du bâtiment [01:31], [02:11] et la question de fin « note de 1 à 10 plus motif » [01:44].",
        "[01:49] Créer une note « objections artisans » (prix, temps, confiance, peur de l'informatique) avec la réponse validée à chacune ; compléter à la main après chaque échange [03:17].",
        "[01:22] Créer un lexique des mots d'artisans (devis, acompte, chantier, relance) à réutiliser dans toutes les copies.",
        "[02:48] Créer une note « règles d'envoi à froid » : domaine dédié, chauffe progressive, plafond 300 par jour, une campagne par métier [03:12].",
        "[04:41] Créer une note « rythme de suivi client » : formulaire initial, livraison, point à 30 jours."
      ]
    },
    "landing": {
      "pertinent": true,
      "actions": [
        "[04:03] Réécrire le titre de prestiapp.fr en une ou deux phrases : pour qui, quoi, résultat ; sans jargon IA [04:27], [03:46].",
        "[03:16] Décliner une page ou un bloc par métier (plombier, électricien, maçon) avec les mots du métier [04:13], [04:48].",
        "[01:49] Ajouter une FAQ qui répond d'avance aux objections (prix, temps, complexité) [03:17] ; courte vidéo par objection.",
        "[00:36] Tester une vidéo de présentation de 4 à 6 minutes (problème, démo devis et facture) avec le bouton de démo ou d'inscription juste dessous [03:29].",
        "[00:22] Ajouter un bloc « fuite » : temps et devis perdus sans la solution, face au prix réel Studio ou Signature, sans chiffre inventé.",
        "[01:25] Expliquer ce qui se passe après la demande de démo (questions, démonstration, prix, décision libre) [00:29].",
        "[00:41] N'afficher que de vrais cas clients Presti ; en attendant, montrer une démo du produit [04:23]."
      ]
    },
    "prospection": {
      "pertinent": true,
      "actions": [
        "[02:48] Envoyer le froid depuis un domaine secondaire dédié (pas prestiapp.fr) avec SPF, DKIM et DMARC ; vérifier d'abord la politique de Brevo gratuit et le coût du domaine [02:51].",
        "[02:51] Dans n8n, monter le volume par paliers sous 300 par jour, avec une campagne par métier et suivi par campagne dans Supabase [03:12].",
        "[00:52] Reprendre le pipeline trouver, personnaliser, envoyer, réserver avec n8n et Brevo, e-mail seulement, données professionnelles publiques, sans GTM.",
        "[01:48] Une seule douleur par e-mail, choisie par métier ; terminer par une demande de permission [01:42].",
        "[00:05] Stocker dans Supabase ouvertures, réponses et rendez-vous par variante ; Hermes rédige un bilan hebdomadaire du maillon faible [00:15]-[00:16].",
        "[02:39] Avant chaque envoi, échantillon de destinataires validé ; exclusion automatique des désinscrits et adresses invalides [02:36].",
        "[01:20] E-mail de confirmation avant démo avec un exemple concret ; relance unique qui s'arrête à la réponse ou au désabonnement [01:06], [02:05].",
        "[03:14] Commencer par un seul métier aux meilleures données publiques ; suivre la séquence au moins 30 jours avant de juger [00:13].",
        "[03:31] Contrôle de conformité avant envoi (désinscription, mention légale, ton sans fausse urgence) par règles ou petit modèle local gratuit."
      ]
    },
    "presti_assistant": {
      "pertinent": true,
      "actions": [
        "[02:39] Permettre la demande en langage naturel « relance les devis non signés depuis 30 jours » avec échantillon validé par l'artisan et exclusion des clients à ne pas relancer ; l'artisan valide en offre Studio [02:10], [04:08].",
        "[00:49] Onboarding court de l'artisan (métier, tarifs, mentions légales, clients types) stocké dans Supabase [01:08], [04:59].",
        "[04:00] Base de connaissance par métier dans Supabase (termes, tâches, douleurs) pour l'assistant [04:19].",
        "[02:35] Requête en langage naturel sur la base clients (par exemple chantiers de salle de bain de l'an dernier), sans export CSV.",
        "[02:33] Réponse e-mail immédiate hors horaires aux demandes entrantes d'un artisan, via n8n et Supabase.",
        "[02:12] Automatiser calcul d'acompte ou de prorata et relances d'impayés [04:07].",
        "[04:41] Rappel de bilan à 14 ou 30 jours après la mise en service d'un compte, planifié par n8n, avec idées tirées des usages réels [00:12].",
        "[03:31] Routeur léger pour les demandes simples, grand modèle pour les cas complexes ; alerte e-mail à Benj en cas d'échec d'un workflow [03:30]."
      ]
    },
    "contenu_videos": {
      "pertinent": true,
      "actions": [
        "[01:49] Carrousel « les 7 freins au devis numérique » avec une réponse concrète à chacun.",
        "[01:54] Motion design des trois engrenages (acquisition, devis, chantier) pour expliquer Presti.",
        "[04:48] Série « une douleur par métier du bâtiment » avec démo Presti, publiée à la main [01:48].",
        "[00:42] Vidéos courtes « problème rencontré puis solution » tirées de la construction de Presti.",
        "[02:19] Motion design avant/après « outils éparpillés vers un seul outil ».",
        "[01:24] Carrousel « déroulé d'une démo Presti en 4 étapes ».",
        "[03:19] Montrer d'abord le résultat avant/après (temps gagné sur un devis), puis expliquer ; vraie référence seulement avec l'accord d'un artisan [03:59]."
      ]
    }
  },
  "priorite": "moyenne",
  "sources_timestampes": [
    "[00:01] Lancer marketing, vente et livraison en parallèle plutôt que perfectionner un produit seul.",
    "[00:04] Se présenter comme spécialiste de la niche du prospect.",
    "[00:12] Bonus après livraison, point d'optimisation à deux semaines.",
    "[00:36] Vidéo de vente de 4 à 6 minutes, seule partie scriptée.",
    "[01:19] Cadre d'appel présenté étape par étape.",
    "[01:41] Question « pourquoi maintenant » : à rejeter comme urgence artificielle.",
    "[01:45] Prix d'ancrage fictif décrit : à rejeter.",
    "[02:39] Envoi ciblé avec échantillon validé et exclusion des désinscrits.",
    "[02:48] Froid depuis un domaine séparé du domaine principal.",
    "[03:16] Spécialisation par métier, une page par niche.",
    "[04:03] Présentation en une ou deux phrases réutilisée partout.",
    "[04:41] Point de suivi client à 30 jours.",
    "[04:55] Base de contacts avec patrimoine et enfants décrite : à rejeter."
  ]
}
```

### Launch A $100K/Month AI Agency In 7 Days (RWKyUJLi-kI, 4 h 05) — priorité moyenne

Synthèse lisible : `videos/references-2026-11-01/youtube/fiches/RWKyUJLi-kI.synthese.md`.

```json
{
  "video_id": "RWKyUJLi-kI",
  "source": "youtube",
  "titre": "Launch A $100K/Month AI Agency In 7 Days",
  "duree": "4 h 05",
  "resume": "Cours de Tim Chao sur la création d'une agence de services IA, puis longues séances de questions-réponses et de coaching d'appels de vente. Utile : le choix d'une niche et d'une offre [00:10], la page d'atterrissage à un seul objectif [00:18], le cadre d'appel et la découverte [00:30]-[00:34], [03:36]-[03:57], l'onboarding des 48 premières heures [01:48], la livraison avant la vente, la méthode « donner avant de demander » avec un actif gratuit personnalisé [02:44]-[02:50]. Le reste est de la promotion du coaching [01:00]-[01:44], des pubs Meta [02:06], des SMS et appels automatiques [02:12], du financement de clients [02:24] : exclu pour Presti. Les revenus cités (241 000, 54 000, contrats de 30 à 100 000, etc.) sont affirmés par le vidéaste, non vérifiables (affirmé). Cette vidéo recoupe fortement O3A2xnBadFo ; les actions ci-dessous n'ajoutent que ce qui diffère.",
  "outils_mentions": [
    "[00:15] TryGTM, Instantly (envoi et démos ; payants, exclus)",
    "[00:15] Power dialer, SMS et messages vocaux automatiques (exclus)",
    "[00:52] LinkedIn Sales Navigator (payant, exclu)",
    "[02:06] Pubs Meta (payantes, exclues)",
    "[02:12] SendBlue (relance SMS automatique ; exclu)",
    "[02:24] Payful (société de paiement, financement du client ; hors cadre)",
    "[00:36] Portail client (avancement, documents, support)",
    "[00:58] Claude en jeu de rôle pour simuler des prospects",
    "[00:48] Démos et audits publiés pour attirer des demandes"
  ],
  "workflows_decrits": [
    "[00:18] Page d'atterrissage à un seul objectif : titre, sous-titre, démo, formulaire minimal, page de remerciement [00:21].",
    "[00:30]-[00:34] Appel de découverte : cadre, logistique, douleurs, objectif, puis devis parcouru poste par poste.",
    "[00:36]-[00:37] Relance de la proposition, suivi à un mois après livraison, récupération des absents.",
    "[01:48] Onboarding des 48 premières heures et réponse rapide aux problèmes.",
    "[02:44]-[02:47] Méthode « dream 100 » : liste de 50 à 100 cibles, actif gratuit personnalisé joint au premier message.",
    "[03:09] Qualification : séparer les vrais contacts professionnels des faux leads.",
    "[03:36]-[03:42] Appel de découverte : douleur, objectif, urgence réelle, puis solution et prix ; pas de pitch ni de partage d'écran avant d'avoir compris."
  ],
  "strategies": [
    "[00:10] Choisir la niche selon trois critères et distinguer saturation et concurrence [00:11].",
    "[00:08] Formuler l'offre comme un résultat mesurable plutôt qu'un outil.",
    "[00:20] Variantes de message par niveau de client, mesurées par les chiffres.",
    "[00:27] Trier les prospects : relancer les intéressés, ne pas insister auprès des autres.",
    "[00:49] Passer par des partenaires qui détiennent déjà un carnet de clients [03:48].",
    "[01:18] Éduquer le prospect sur son problème avant de vendre.",
    "[01:48] Soigner la livraison avant de vendre davantage.",
    "[01:31] Entrer par une seule brique, laisser l'upsell au suivi [01:33].",
    "[02:26] Garantie conditionnée à des actions du client plutôt que remboursement libre.",
    "[03:26] Utiliser les vrais chiffres du prospect, pas des hypothèses."
  ],
  "erreurs_a_eviter": [
    "[00:05] Prospection par SMS, appels, phone setters, power dialer : interdits (art. L34-5 CPCE) [00:15], [00:26].",
    "[00:52] LinkedIn (Sales Navigator, messages en masse) : exclu [01:26], [02:49].",
    "[02:46] DM Instagram, « close friends », tags : messages privés automatiques ou assimilés, exclus [02:47], [01:36].",
    "[00:51] Plus de 300 e-mails par jour : exclu [01:39].",
    "[00:14] Capital de 5 à 10 000 et logiciels payants ; pubs Meta payantes [02:06], [01:24] : rien de payant.",
    "[02:12] Relance SMS automatique après formulaire (SendBlue) : exclu.",
    "[00:44] Pression à la décision (« ne réserve pas si tu doutes ») : fausse urgence, interdite.",
    "[02:25] Allégations de revenus et mises en scène de richesse : exclues.",
    "[03:01] Financer ses pubs avec une carte à 0 % : risque, hors cadre [02:24].",
    "[03:36] Monologues et pitch pendant la découverte ; partage d'écran trop tôt [03:41].",
    "[00:00] Revenus affirmés (241 000, 54 000, 3 M par mois) : jamais repris comme preuve (affirmé) [01:28], [02:41]."
  ],
  "hooks_accroches": [
    "[00:08] Titre d'offre chiffré (résultat mesurable) comme modèle d'accroche.",
    "[00:27] Image de l'or et de la terre : tri des clients.",
    "[01:18] Faire prendre conscience du problème avant de proposer.",
    "[03:43] Analogie du médecin : diagnostic avant ordonnance.",
    "[02:50] « Donner du concret » : joindre un exemple gratuit au premier message."
  ],
  "formats_contenu": [
    "[00:48] Démos et audits publics, avec appel à l'action doux.",
    "[00:23] Démos courtes d'un devis ou d'une relance.",
    "[00:42] Séances de coaching enregistrées, appels de vente commentés [03:12]-[04:02].",
    "[00:47] Extraits d'appels de groupe avec questions du public."
  ],
  "applicabilite_chantiers": {
    "cerveau_obsidian": {
      "pertinent": true,
      "actions": [
        "[00:10] Note « choix de niche et offre » : trois critères de niche et distinction saturation/concurrence, pour cadrer le ciblage des métiers du bâtiment.",
        "[03:36] Note « questions de découverte artisan » (pourquoi maintenant, que changer, à quoi ressemble la réussite) liée aux notes de prospection ; y ajouter l'ordre douleur, objectif, urgence réelle, solution, prix [03:42].",
        "[03:27] Après chaque échange, noter les mots exacts de l'artisan sur sa douleur, pour les réutiliser dans les e-mails.",
        "[01:48] Note « onboarding 48 h » : points de contact et petites réussites pour un nouvel artisan.",
        "[02:26] Note « garantie conditionnée à des actions », liée aux offres Studio et Signature.",
        "[02:44] Note « prospection dream 100 » et note « donner avant de demander » [02:59].",
        "[04:00] Note « méthode de revue d'appel » : noter et relire chaque démo, modèle fixe (objections, urgence, engagement).",
        "[00:58] Notes de persona d'artisan alimentées par des jeux de rôle avec Claude pilotés par Hermes."
      ]
    },
    "landing": {
      "pertinent": true,
      "actions": [
        "[00:18] Structurer prestiapp.fr autour d'un seul objectif : titre clair, sous-titre, démo courte, bouton de démo, preuves réelles ; formulaire minimal puis page de remerciement [00:21].",
        "[00:08] Accroche en résultat mesurable pour l'artisan (devis plus vite, relances faites), chiffres réels seulement.",
        "[02:12] Formulaire de demande de démo avec deux questions filtrantes (métier, taille) avant les coordonnées.",
        "[00:54] Variante de landing par métier (plombier, électricien).",
        "[03:26] Calculateur où l'artisan saisit ses propres chiffres (devis par mois, temps perdu) ; aucun exemple fictif.",
        "[01:31] Présenter Studio comme entrée simple et Signature comme palier supérieur [01:33].",
        "[03:42] Ordonner la page : problème, objectif, puis offres ; prix de départ clair, sans prix d'ancrage fictif [04:00].",
        "[02:26] Garantie formulée en conditions vraies (essai sans engagement), sans fausse urgence."
      ]
    },
    "prospection": {
      "pertinent": true,
      "actions": [
        "[02:50] Pour les 20 premiers artisans d'un métier et d'une ville, préparer avec Claude un mini-devis ou une maquette gratuite, joint à l'e-mail Brevo envoyé via n8n.",
        "[02:44] Liste manuelle de 50 à 100 artisans de sa ville dans Supabase, e-mails Brevo personnalisés sous 300 par jour ; lien de démo personnalisé généré par n8n [02:47].",
        "[00:49] Partenaires qui touchent beaucoup d'artisans (fédérations, groupements, cabinets comptables, négoces) : proposer un parrainage par e-mail [03:48], [03:51].",
        "[00:36] Dans n8n, relance de devis non répondu et suivi à un mois, par e-mail Brevo.",
        "[03:31] Terminer chaque e-mail par une seule question ouverte ; réponses types quand l'artisan répond « comment ça ? » [03:36].",
        "[03:09] Filtrer les réponses : étiqueter les adresses non professionnelles et non-décideurs [04:02].",
        "[02:49] Segmenter par métier et nommer le métier dans l'objet [03:02].",
        "[01:30] Avant chaque séquence, résumé des trois douleurs du métier ciblé."
      ]
    },
    "presti_assistant": {
      "pertinent": true,
      "actions": [
        "[01:41] Questionnaire d'onboarding en étapes, avec saisie à la dictée, sur la façon dont l'artisan fait devis, relances et factures ; réponses dans Supabase.",
        "[01:43] Écran de validation en un clic de chaque action proposée (relance, envoi de devis) avant exécution par n8n [01:40].",
        "[00:36] Rappel de relance de devis et suivi post-chantier à un mois ; espace client simple (avancement, documents) [00:37].",
        "[01:48] Séquence d'accueil sur 48 heures (premier devis guidé, e-mail de bienvenue Brevo) ; première réponse du support par l'assistant [01:48].",
        "[03:35] Onboarding : demander les outils utilisés, leur rôle et leur coût avant de configurer.",
        "[01:22] Garde-fous de sécurité et de confidentialité des données clients (RLS Supabase, tests d'accès entre tenants).",
        "[00:08] Détecter les demandes clients restées sans réponse et proposer une relance."
      ]
    },
    "contenu_videos": {
      "pertinent": true,
      "actions": [
        "[00:23] Démos courtes en motion design (devis généré, relance), publiées à la main ; appel à l'action doux [00:48].",
        "[03:43] Carrousel « diagnostic avant ordonnance ».",
        "[00:10] Carrousel « 3 critères pour choisir sa niche ».",
        "[02:36] Carrousel « pourquoi une garantie fondée sur des actions protège l'artisan et son client ».",
        "[02:50] Exemple de devis transformé en vidéo motion design pour un métier précis.",
        "[01:28] Histoire d'artisan débordé par l'administratif, seulement avec un cas réel autorisé."
      ]
    }
  },
  "priorite": "moyenne",
  "sources_timestampes": [
    "[00:10] Trois critères pour choisir une niche.",
    "[00:18] Page d'atterrissage à un seul objectif.",
    "[00:30] Cadre d'appel de découverte.",
    "[00:49] Partenaires détenteurs d'un carnet de clients.",
    "[01:18] Éduquer le prospect avant de vendre.",
    "[01:48] Livraison et onboarding 48 h.",
    "[02:12] Relance SMS automatique après formulaire : à rejeter.",
    "[02:26] Garantie conditionnée à des actions.",
    "[02:44] Méthode dream 100 avec actif gratuit.",
    "[03:36] Corrections d'appels de découverte : pas de monologue.",
    "[04:00] Revue d'appel enregistrée."
  ]
}
```

### How to Start an AI Agency in 2026 (k1adsrTHwPg, 1 h 27) — priorité basse

Synthèse lisible : `videos/references-2026-11-01/youtube/fiches/k1adsrTHwPg.synthese.md`.

```json
{
  "video_id": "k1adsrTHwPg",
  "source": "youtube",
  "titre": "How to Start an AI Agency in 2026",
  "duree": "1 h 27",
  "resume": "Vidéo surtout promotionnelle de Tim Chao : présentation de son coaching, de sa communauté et de ses outils [00:31]-[00:39], récits de revenus (affirmé) [00:24], monologue personnel final [01:12]-[01:27]. Le fond utile est mince : vendre en deux appels, découverte puis proposition [00:13], [00:49] ; trier les prospects plutôt que tous les convertir [00:16], [00:51] ; poser des questions avant de proposer, comme un médecin [00:46] ; tenir 60 à 90 jours avant de juger [00:12] ; alimenter une base de connaissance avec les comptes rendus d'échanges [00:36]. Le reste (SMS, appels en masse, LinkedIn, pubs, outils payants, fausse urgence) est exclu pour Presti. Tous les chiffres de revenus (174 000, 241 000, 350 000) sont affirmés, non vérifiables (affirmé).",
  "outils_mentions": [
    "[00:11] Apollo, Clay, GTM, Sales Navigator (listes et envois ; payants ou LinkedIn, exclus)",
    "[00:13] Fathom (notes d'appel), Calendly (réservation de l'audit)",
    "[00:31] AI Front Runners (plateforme de coaching du vidéaste ; payante, hors sujet)",
    "[00:35] Fonction « ask Tim » : IA branchée sur une base de connaissance de coaching",
    "[00:37] Portail client (démos, audits, périmètre)",
    "[00:56] Power dialer (appels en rafale ; exclu)",
    "[00:59] Instantly (e-mail en masse ; payant, exclu)",
    "[01:04] Google Sheet comme CRM de départ"
  ],
  "workflows_decrits": [
    "[00:13] Vente en deux appels : audit ou découverte gratuite, puis proposition.",
    "[00:16] Tri des prospects : chercher les raisons de disqualifier, se concentrer sur les sérieux.",
    "[00:36] Base de connaissance alimentée en continu par les enregistrements d'échanges.",
    "[00:42] Devis en étapes avec accords successifs avant le prix.",
    "[00:51] Au troisième report de rendez-vous, ne plus relancer.",
    "[01:12] Suivi du funnel envoyés, réponses, démos, abonnements pour repérer le maillon faible."
  ],
  "strategies": [
    "[00:05] Vendre un gain concret : temps ou argent.",
    "[00:07] Publier démos et audits pour montrer sa compétence.",
    "[00:12] Le succès arrive en retard : tenir 60 à 90 jours avant de juger.",
    "[00:40] Équilibrer nouveaux contacts et suivi des intéressés.",
    "[00:45] Face à « en quoi êtes-vous différent », poser des questions plutôt que se défendre.",
    "[00:52] Une démo de ce que le prospect n'a jamais vu déclenche l'envie.",
    "[01:05] Rendre le prospect conscient de son problème avant de vendre.",
    "[01:06] Séparer la découverte et la proposition.",
    "[01:00] Choisir les canaux selon le métier du prospect."
  ],
  "erreurs_a_eviter": [
    "[00:07] Prospection par LinkedIn automatisé, SMS et appels (« méthode nucléaire ») : interdite [00:32], [00:33].",
    "[00:11] E-mails par dizaines de milliers : le plafond Presti est 300 par jour.",
    "[00:11] Outils payants (Apollo, Clay, GTM, Instantly, plateforme de coaching, portail payant) : exclus [00:37], [00:59].",
    "[00:56] Power dialer, 200 à 300 appels par jour : exclu [01:00].",
    "[00:40] « Fenêtre qui se ferme », « remplacé par l'IA » : fausse urgence, interdite [00:52].",
    "[00:14] Étapes de PDF sans prix servant d'ancrage : prix d'ancrage fictif, interdit.",
    "[00:39] Victoires d'élèves citées comme preuve : témoignages non vérifiables, à ne pas imiter.",
    "[01:08] Faire croire que le premier appel est court alors qu'il y en a deux : manœuvre trompeuse.",
    "[00:43] Question de découverte qui pousse le prospect à craindre d'être laissé de côté : pression.",
    "[00:24] Revenus affirmés (174 000, 241 000, 350 000, 2 millions) : jamais repris comme preuve (affirmé) [00:30]."
  ],
  "hooks_accroches": [
    "[00:16] « Tamiser de l'or, pas faire de l'alchimie » : tri des clients.",
    "[00:46] Analogie du médecin qui interroge avant de prescrire.",
    "[00:13] « Audit gratuit » comme intitulé de prise de rendez-vous.",
    "[01:09] « J'ai des choses à vous montrer » : accroche sans pitch, à transformer en démo."
  ],
  "formats_contenu": [
    "[00:07] Démos et audits courts.",
    "[01:01] Publications courtes et régulières, une par jour.",
    "[00:35] Séance de questions-réponses en direct [00:48].",
    "[00:21] Vlog de communauté (mastermind)."
  ],
  "applicabilite_chantiers": {
    "cerveau_obsidian": {
      "pertinent": true,
      "actions": [
        "[00:36] Verser dans le vault un compte rendu court de chaque appel ou retour d'artisan (via n8n), pour qu'Hermes retrouve les dernières décisions.",
        "[00:35] Brancher l'interrogation du vault (MCP cerveau) pour répondre aux questions de Benj, sur le modèle d'une IA liée à une base de connaissance.",
        "[00:51] Note « règles de tri des prospects » : trois reports au plus, pipeline suivi.",
        "[00:13] Fiche modèle « appel de découverte artisan » (logiciels, effectif, tâches, procédures).",
        "[00:40] Note de suivi des prospects par état (répondu, refusé, intéressé) alimentée depuis Supabase."
      ]
    },
    "landing": {
      "pertinent": true,
      "actions": [
        "[00:52] Démo courte de devis et facture avant tout texte, sans fausse urgence ni faux témoignage.",
        "[00:13] Bouton « diagnostic gratuit de votre gestion » (formulaire Supabase) ; formulaire court métier et difficulté [01:08], [01:05].",
        "[00:14] Studio et Signature en deux options claires avec prix réels, jamais d'ancrage fictif.",
        "[00:05] Promesse en gain de temps et d'argent pour l'artisan, sans chiffre inventé."
      ]
    },
    "prospection": {
      "pertinent": true,
      "actions": [
        "[00:40] Étiqueter chaque artisan contacté dans Supabase ; n8n relance les intéressés dans la limite de 300 par jour (Brevo) ; partage hebdomadaire nouveaux envois et relances, rapport Hermes.",
        "[00:51] Dans n8n, compter les reports de rendez-vous par artisan et stopper les relances au troisième ; statut « à recontacter » avec un rappel unique [00:50].",
        "[00:16] Score de qualification dans n8n pour écarter les artisans peu adaptés avant l'envoi.",
        "[00:45] Dans les réponses, poser des questions sur le métier plutôt que défendre Presti.",
        "[01:09] Séquence proposant une démo de 20 minutes sans engagement ; deux étapes : démo puis offres [01:06].",
        "[01:12] Suivre le funnel dans Supabase ; mesurer sur 60 à 90 jours avant de conclure [00:12]."
      ]
    },
    "presti_assistant": {
      "pertinent": true,
      "actions": [
        "[00:42] Devis en étapes validées une à une (périmètre, délai, fourchette) avant le prix final.",
        "[00:46] L'assistant pose quelques questions sur le chantier avant de générer un devis.",
        "[00:35] Fonction « demande-moi » répondant à l'artisan depuis une base d'aide dans Supabase, alimentée par les questions réelles validées via n8n [00:36]."
      ]
    },
    "contenu_videos": {
      "pertinent": true,
      "actions": [
        "[00:52] Motion design court de démonstration (devis créé en quelques secondes).",
        "[00:46] Carrousel « diagnostiquer avant de proposer » (analogie du médecin appliquée au devis).",
        "[00:16] Carrousel « tamiser l'or » appliqué au tri des clients.",
        "[01:01] Rythme régulier de publications courtes publiées à la main, avec un seul appel à l'action : demander une démo [01:00]."
      ]
    }
  },
  "priorite": "basse",
  "sources_timestampes": [
    "[00:05] Vendre un gain de temps ou d'argent.",
    "[00:12] Succès en retard : tenir 60 à 90 jours.",
    "[00:13] Deux appels : découverte puis proposition.",
    "[00:16] Trier plutôt que convertir.",
    "[00:36] Base de connaissance alimentée par les échanges.",
    "[00:40] Fausse urgence « remplacé par l'IA » : à rejeter.",
    "[00:46] Analogie du médecin.",
    "[00:51] Trois reports puis arrêt.",
    "[00:56] Power dialer : à rejeter.",
    "[01:12] Suivi du funnel."
  ]
}
```

## B — Les TikToks, regroupés par thème

### Agents IA et SaaS IA vendus aux entreprises (5 vidéos)

#### Cinq agents IA « pas encore saturés » à vendre aux entreprises, sans coder (titre fixe à l'écran) — priorité haute

```json
{
  "video_id": "angelotturri-7698795221999471902",
  "source": "tiktok",
  "titre": "Cinq agents IA « pas encore saturés » à vendre aux entreprises, sans coder (titre fixe à l'écran)",
  "duree": "146,5 s (ffprobe 146,47 s) — 720×1280, 30 i/s",
  "resume": "Un vendeur d'agence IA, face caméra en selfie, plan unique (0 coupe détectée), énumère des agents à vendre aux patrons : recrutement qui appelle et trie les candidats (6,4-38,0 s), recouvrement des impayés jusqu'au paiement ou jusqu'au motif du refus (38,0-51,8 s), vente d'un contrat d'entretien après chaque chantier (58,1-69,0 s) et rappel d'entretien « 4,5 » (69,0-85,3 s), chiffrage à partir des prix pratiqués avec les anciens clients du CRM (85,3-117,3 s). Il vend ces briques groupées en « moteurs », les fait coder par un développeur (117,3-140,5 s) et finit par un appel à commenter le mot « AI » contre un guide (140,5-146,8 s). Débit 4,31 mots/s. Corrige l'analyse du 01/11 : la liste saute le n° 3 (après le n° 2 à 38,0 s vient « Number four » à 58,1 s, confirmé par le sous-titre incrusté à 58,8 s) ; l'appel final est « commente le mot », pas « appelle-moi » (sous-titres à 144,7-145,1 s ; « call me » est une erreur de faster-whisper).",
  "outils_mentions": [
    "CRM, non nommé (44,9 s ; 89,5 s)",
    "appel, SMS et e-mail automatisés vers candidats et clients (14,2-27,5 s ; 62,2-63,8 s)",
    "un développeur sous-traitant qui construit tout (130,4-134,4 s)",
    "aucun logiciel nommé"
  ],
  "workflows_decrits": [
    "Recrutement : candidature reçue → l'IA appelle (ou écrit) le candidat → tri selon les critères du patron → rendez-vous réservé, ou seulement pour ceux qui remplissent tous les critères (14,2-38,0 s)",
    "Recouvrement : lecture du CRM → qui doit quoi → relance de chaque débiteur jusqu'au paiement ou jusqu'à ce qu'il dise pourquoi il ne paie pas (42,8-51,8 s)",
    "Après chantier : à chaque chantier terminé, SMS au client pour lui proposer un contrat d'entretien ou un abonnement (60,8-69,0 s), puis rappel périodique d'entretien (69,0-82,7 s)",
    "Chiffrage : l'agent lit les prix pratiqués avec les anciens clients et propose un prix selon les critères (surface, nombre de pièces), envoyé au client ou utilisé en interne pour estimer plus vite (85,3-112,7 s)",
    "Vente : relances, rappels, appels et e-mails regroupés en un « moteur » (réputation, relance) vendu d'un bloc (117,3-130,4 s)"
  ],
  "strategies": [
    "Promesse chiffrée et ciblée dès le premier mot (0,0-6,4 s), répétée par un titre fixe en 3 lignes visible pendant les 146 s (planche)",
    "Chaque item suit le même gabarit : problème du patron → ce que fait l'agent → ce qu'il y gagne (ex. 7,9-14,2 puis 14,2-36,9 s)",
    "La vitesse comme argument : celui qui envoie l'estimation en premier emporte le client (112,7-117,3 s) — affirmé, aucune source",
    "Vendre un ensemble (« moteur ») plutôt que chaque brique (117,3-130,4 s)",
    "Aimant final : guide gratuit contre un mot en commentaire (140,5-146,8 s)"
  ],
  "erreurs_a_eviter": [
    "Annoncer 5 éléments et les numéroter 1, 2, 4, 4,5, 5 (38,0 → 58,1 s ; sous-titre à 58,8 s) : une liste mal comptée se remarque ; dans un carrousel Presti, la numérotation se vérifie avant publication",
    "Gains affirmés et invérifiables : « des dizaines de milliers de dollars par mois » de plus pour le patron (53,8-58,1 s), marge gardée de 80 à 85 % (137,6-140,5 s)",
    "Relancer « comme si le client avait déjà accepté » (82,7-85,3 s) : contraire aux règles de ton des relances Presti (zéro culpabilisation)",
    "Agent qui téléphone et prend des rendez-vous (14,2-25,9 s) : Presti ne gère ni appel ni rendez-vous, aucune pub ne doit le laisser croire",
    "Envoyer automatiquement un prix tiré des anciens chantiers (105,7-108,1 s) : chez Presti un devis accepté sert d'exemple de forme, jamais de prix à recopier (lib/ai/exemples.ts:4-5)",
    "146 s de face caméra sans aucun visuel d'appui, sous-titres minuscules posés sur le t-shirt (image 58,8 s)"
  ],
  "hooks_accroches": [
    "Liste promise d'emblée : cinq systèmes « pas encore saturés » à vendre tout de suite, qui rapportent ou font gagner du temps (0,0-6,4 s)",
    "Titre-promesse fixe en haut, 3 lignes blanc contour noir, présent de la 1re à la dernière seconde (hook.jpg, image 58,8 s)",
    "Main levée doigts écartés dès la 1re image (hook.jpg), doigts qui comptent ensuite (geste « 2 » vers ≈37 s sur la planche)",
    "Réassurance dans le titre : pas besoin de coder (hook.jpg)"
  ],
  "formats_contenu": [
    "Face caméra selfie, plan unique de 146,5 s, 0 coupe (détection de scène au seuil 0,3)",
    "Titre fixe 3 lignes en haut, blanc contour noir",
    "Sous-titres progressifs mot à mot, petits, au centre-bas (« comment » puis « comment the word », 144,7-145,1 s)",
    "Liste numérotée problème → agent → gain",
    "Appel à commenter un mot-clé contre un guide"
  ],
  "applicabilite_chantiers": {
    "cerveau_obsidian": {
      "pertinent": true,
      "actions": [
        "Déposer une tâche .orchestre de périmètre SaaS/… pour écrire la note « Les moteurs de Presti » : les fonctions existantes regroupées en 4 moteurs (réponse au prospect, devis, relances, après-chantier), chacune avec son fichier:ligne ; Hermes la lit par le MCP cerveau (« lire ») pour que landing, e-mails et pubs disent la même chose (idée du « moteur » vendu d'un bloc, 117,3-130,4 s)"
      ]
    },
    "landing": {
      "pertinent": true,
      "actions": [
        "Dans la refonte (cadrage P4, sections derrière landingV2), une section « une chaîne, pas une liste » : les moteurs reliés (message → réponse → devis → relance → facture → entretien) au lieu d'une grille de fonctions (117,3-130,4 s)"
      ]
    },
    "prospection": {
      "pertinent": true,
      "actions": [
        "Dans la séquence n8n (Oracle) → Brevo, une variante de premier e-mail bâtie comme un item de sa liste (38,0-51,8 s) : la facture qui traîne → Presti relance à J+3, J+10, J+21 et s'arrête au paiement ou à la réponse du client (lib/aide.ts:232) → le gain, sans chiffre ; plus la présentation de Presti, la démo de 10 min et l'essai (règle du premier message), puis rien avant 5 jours",
        "Tester en objet ou en 1re phrase l'angle vitesse posé en question (« qui envoie le devis en premier ? », 112,7-117,3 s, affirmé par lui) ; ne citer un délai de réponse de Presti que s'il figure dans plans/promesses.md"
      ]
    },
    "presti_assistant": {
      "pertinent": true,
      "actions": [
        "Relance d'impayé : quand le client répond, l'assistant lit la réponse, classe le motif (contestation, oubli, trésorerie, échéancier demandé), le range sur la facture dans Supabase (migration à poser par Claude Code après accord) et propose l'étape suivante en carte ; aujourd'hui la relance s'arrête à la réponse (lib/aide.ts:232) et le mot « motif » n'apparaît dans aucun lib/relancesImpayes*.ts (idée « jusqu'au paiement ou jusqu'à la raison », 49,8-51,8 s)",
        "Détecteur « chantier terminé → proposer l'entretien » planifié dans n8n (Oracle, route Presti à clé limitée, cadrage P3 §9.7) qui dépose une opportunité dans la boîte « À valider » (§9.4) et s'appuie sur l'outil existant envoyer_rappel_entretien (lib/assistant/outils-actions.ts:445, confirmé par l'artisan) (60,8-82,7 s)",
        "Chiffrage : garder la règle actuelle, prix de la source « artisan » (lib/prix/artisan.ts:5) affiché avec sa source (lib/prix/types.ts:24-26) ; si Benj veut un « prix pratiqué sur tes derniers chantiers » (85,3-104,5 s), c'est une nouvelle source déclarée dans SourceId (lib/prix/types.ts:13), datée et liée au devis d'origine — décision d'argent"
      ]
    },
    "contenu_videos": {
      "pertinent": true,
      "actions": [
        "Carrousel (gabarit HTML → PNG de .claude/workflows/post-du-jour.js, programmation par le workflow n8n prévu au cadrage P2) : couverture « 3 choses à faire après chaque chantier », une diapositive par chose — relance de la facture échue, demande d'avis, proposition d'entretien (dans le produit : lib/aide.ts:232, outils-actions.ts:445-452) — fin « Presti les prépare, tu valides » ; numérotation vérifiée",
        "Même liste en motion design 3D (moteur Offres v1) : titre fixe tout le film comme chez lui, un objet en héros par item (facture, étoile, clé), voix Fish ≥ 3,3 mots/s, aucun visage"
      ]
    }
  },
  "priorite": "haute",
  "sources_timestampes": [
    "0,0-6,4 s : annonce de la liste (transcription)",
    "6,4-38,0 s : agent de recrutement",
    "38,0-51,8 s : agent de recouvrement ; « jusqu'au paiement ou à la raison » 49,8-51,8 s",
    "51,8-58,1 s : gain mensuel affirmé",
    "58,1-69,0 s : entretien vendu après chantier ; 69,0-85,3 s : rappel « 4,5 » ; 82,7-85,3 s : ton « comme s'il avait accepté »",
    "85,3-117,3 s : chiffrage sur les prix passés ; 112,7-117,3 s : la vitesse gagne",
    "117,3-130,4 s : vente en « moteurs » ; 130,4-140,5 s : développeur, marge affirmée",
    "140,5-146,8 s : appel à commenter « AI »",
    "image 58,8 s (extraite) : sous-titre « Number four » juste après le n° 2",
    "images 144,7 et 145,1 s (recadrées) : sous-titre « comment » / « comment the word »",
    "hook.jpg (0-3 s) : titre fixe, main levée, sous-titres progressifs",
    "planche : plan unique ; ffmpeg scene>0,3 : 0 coupe ; 633 mots / 146,8 s parlées = 4,31 mots/s",
    "images extraites : C:/Users/benja/AppData/Local/Temp/claude/C--Users-benja-Documents-presti/b6e06ae6-7abe-49a0-baf6-ddf3a2f1d6b7/scratchpad/images-tiktok/<nom>-<t>.jpg (toutes les fiches)"
  ]
}
```

#### Arrêtez de construire des agents et des « cerveaux » — faites plutôt ça (titre en cartouche) — priorité haute

```json
{
  "video_id": "realbastianvolkis-7684021380060302625",
  "source": "tiktok",
  "titre": "Arrêtez de construire des agents et des « cerveaux » — faites plutôt ça (titre en cartouche)",
  "duree": "251,8 s (ffprobe 251,77 s) — 576×1024, ≈29,8 i/s",
  "resume": "Fondateur d'un éditeur de logiciel IA, face caméra au bureau, alternée avec un tableau blanc et des écrans filmés. Thèse : pour qu'une entreprise se serve de l'IA il faut quatre choses, un agent, une mémoire, des connexions et des compétences (68,2-71,8 s) ; il donne Claude Code, un cerveau Obsidian, MCP et CLI comme exemples des trois premières (71,8-78,6 s), qui sont de l'infrastructure à ne pas reconstruire (78,6-101,3 s) ; ce qui distingue une entreprise, ce sont ses compétences, flux et procédures (108,7-116,9 s), et une compétence n'est qu'un document d'instructions pas à pas (166,6-173,2 s). Un agent intégré au logiciel reste utile s'il connaît le logiciel et sait s'en servir (197,5-208,0 s), à côté des boutons manuels (209,6-221,4 s). Deux appels à réserver un appel (175,3-197,5 s et 236,6-251,7 s). Débit 3,60 mots/s. Corrige l'analyse du 01/11 : 37 coupes distinctes (44 détections dont 7 doublons à moins de 0,2 s), soit un plan toutes les ≈6,6 s et non 5,7 ; montage serré au début (11 coupes entre 7,5 et 27,9 s) puis lâche (plan le plus long 144,7-173,1 s).",
  "outils_mentions": [
    "Claude Code, exemple d'agent (71,8-73,7 s ; 104,5-108,7 s)",
    "Obsidian, exemple de mémoire (73,7-76,3 s)",
    "MCP et CLI, comme connexions (76,3-78,6 s)",
    "Hermes Agent sur Telegram (39,0-41,5 s)",
    "Linear et son agent intégré (208,0-221,4 s)",
    "ses propres agent de code, couche mémoire et constructeur d'agents (21,0-27,7 s)",
    "AWS, comme comparaison (92,0-98,9 s)",
    "Instagram (2,6-5,7 s)"
  ],
  "workflows_decrits": [
    "Pile IA d'entreprise en quatre couches : agent → mémoire → connexions → compétences ; les trois premières prises toutes faites, la quatrième écrite par l'entreprise (68,2-78,6 s ; 138,7-144,2 s)",
    "Accueil d'un nouveau client vu comme une compétence : un flux précis de processus que l'IA doit connaître pour servir le client (120,6-138,7 s)",
    "Double chemin dans un logiciel : créer un projet en le demandant à l'agent intégré, ou à la main en deux clics (209,6-221,4 s)",
    "Offre : infrastructure sous licence, le client n'écrit que ses compétences (184,9-197,5 s ; 248,9-251,7 s)"
  ],
  "strategies": [
    "Question binaire posée à l'entreprise dès 0 s, puis rejet de la « hype » (0,0-7,3 s)",
    "Légitimité en rafale avant le fond : revenus, produit, études de cas, agent de code, mémoire, Hermes (7,3-45,0 s), plans de ≈1,9 s",
    "Prévenir que la vidéo sera longue et ennuyeuse (46,5-49,3 s) + pastilles « maintenir pour 2x » et « vidéo approfondie » (image 13,0 s)",
    "Analogie concrète : construire AWS avant son site (92,0-101,3 s)",
    "Mot du tableau blanc montré pile quand il est dit (image 70,0 s : Memory / Connections / Skills sous le sous-titre « an agent, memory »)",
    "Premier appel à l'action au milieu (175,3-197,5 s), démonstration ensuite, second appel à la fin (236,6-251,7 s)"
  ],
  "erreurs_a_eviter": [
    "« Plus de 700 000 $ en vendant de l'IA » (7,3-12,0 s) et « études de cas sans fin » (15,5-21,0 s) : affirmé, non vérifiable",
    "Démonstration du double chemin filmée floue à la main (image 218,5 s) : la preuve visuelle ne se lit pas",
    "251 s de face caméra, sous-titres petits : beaucoup trop long pour une pub, visage réel",
    "Déconseiller de construire agent et mémoire tout en vantant les siens et en vendant sa licence (21,0-27,7 s ; 184,9-197,5 s) : un conseil qui sert la vente se voit"
  ],
  "hooks_accroches": [
    "Question oui/non à l'entreprise sur un mot à la mode, le « second cerveau » (0,0-2,6 s)",
    "Titre contrarien « arrêtez X, faites plutôt Y » en cartouche blanc, texte noir (hook.jpg)",
    "Écran derrière lui avec une sphère de particules (graphe de connaissances) dès la 1re image (hook.jpg), reprise vers 57-60 s",
    "Promesse de trier le vrai du faux pour les entreprises lassées de la hype (49,3-54,7 s)"
  ],
  "formats_contenu": [
    "Face caméra + tableau blanc écrit au feutre + écrans filmés au doigt, 576×1024",
    "Cartouche-titre permanent texte noir sur blanc ; pastilles « Hold for 2x speed » (haut droite) et « Ps. This is an in depth video » au début (hook.jpg, image 13,0 s)",
    "Sous-titres blancs centrés, petits",
    "Rafale de plans courts (11 coupes en 20 s) puis plans longs (jusqu'à 28 s)"
  ],
  "applicabilite_chantiers": {
    "cerveau_obsidian": {
      "pertinent": true,
      "actions": [
        "Ses quatre couches recouvrent l'architecture imposée (agent = Hermes / Claude Code, mémoire = vault via MCP cerveau, connexions = MCP) : ne pas construire de nouvelle couche mémoire, mettre l'effort dans la 4e (54,7-63,7 s ; 138,7-153,9 s)",
        "Écrire dans le vault, par une tâche .orchestre de périmètre SaaS/…, un playbook pas à pas par geste d'artisan (répondre à un prospect, relancer un devis, relancer un impayé, facturer une situation, proposer l'entretien), lisible par Hermes avec « lire » du MCP cerveau (166,6-173,2 s)",
        "Brancher Hermes (v0.21.5 installé, « branchement aux MCP à faire » selon presti/CLAUDE.md) au MCP cerveau et le commander depuis Telegram, l'usage qu'il décrit pour lui-même (39,0-41,5 s) ; la vidéo ne dit pas comment"
      ]
    },
    "landing": {
      "pertinent": false,
      "actions": []
    },
    "prospection": {
      "pertinent": false,
      "actions": []
    },
    "presti_assistant": {
      "pertinent": true,
      "actions": [
        "Compétences de l'assistant : un dossier par geste sur le modèle de lib/ai/cerveaux/ (instructions pas à pas + cas.jsonl + evaluer.mjs + score.json, cf. LISEZMOI.md), chargé selon l'intention que repère cadrerDemande (lib/assistant/cadrage.ts:137) ; le texte part du playbook du vault, la production n'appelle jamais le vault (108,7-116,9 s ; 166,6-173,2 s)",
        "Double chemin vérifié : un test qui parcourt les 52 actions de SPEC (lib/assistant/outils-actions.ts:58) et échoue si l'une n'a pas d'écran ou de route manuelle équivalente — règle déjà posée dans plans/016-assistant.md §3 (209,6-221,4 s ; 222,0-236,0 s)",
        "Détecteurs de la boîte « À valider » planifiés dans n8n qui appelle les routes Presti (cadrage P3 §9.7) plutôt qu'une nouvelle boucle d'agent codée ; l'effort va aux compétences (229,9-236,0 s)"
      ]
    },
    "contenu_videos": {
      "pertinent": true,
      "actions": [
        "Format « mots qui s'écrivent » : « tes clients · tes prix · tes chantiers · ton stock » tracés en Bricolage Grotesque 700 corail sur fond nuit au moment exact où la voix les dit, accolade, le dernier entouré — film « ce que l'assistant connaît de toi » (données réellement lues : docs/registre-traitements.md §20) (image 70,0 s ; 68,2-71,8 s)",
        "Ouverture en rafale de plans ≤ 2 s sur des écrans réels de Presti rendus proprement (devis, facture, relance), puis un plan long pour l'idée principale (montage 7,5-27,9 s puis 144,7-173,1 s)"
      ]
    }
  },
  "priorite": "haute",
  "sources_timestampes": [
    "0,0-7,3 s : question d'accroche, rejet de la hype",
    "7,3-45,0 s : légitimité (revenus affirmés 7,3-12,0 s ; Hermes sur Telegram 39,0-41,5 s)",
    "46,5-54,7 s : vidéo longue annoncée",
    "68,2-78,6 s : les quatre choses et leurs exemples",
    "78,6-101,3 s : infrastructure, analogie AWS",
    "108,7-116,9 s : compétences, flux, procédures",
    "166,6-173,2 s : une compétence = un document pas à pas",
    "175,3-197,5 s : 1er appel à réserver",
    "197,5-236,0 s : agent intégré, Linear, double chemin",
    "236,6-251,7 s : 2e appel",
    "image 13,0 s : cartouche, pastilles « Hold for 2x speed » et « Ps. This is an in depth video »",
    "image 70,0 s : tableau blanc Memory / Connections / Skills",
    "image 204,0 s : « cet agent connaît mon logiciel » sur une carte mentale floue",
    "image 218,5 s : démonstration floue des boutons",
    "ffmpeg scene>0,3 : 44 détections, 37 coupes distinctes ; 893 mots / 248,4 s parlées = 3,60 mots/s"
  ]
}
```

#### Arrêtez de construire des CRM avec l'IA — faites plutôt ça (titre en cartouche) — priorité haute

```json
{
  "video_id": "realbastianvolkis-7685717353828519170",
  "source": "tiktok",
  "titre": "Arrêtez de construire des CRM avec l'IA — faites plutôt ça (titre en cartouche)",
  "duree": "88,2 s (ffprobe 88,17 s) — 576×1024, ≈29,8 i/s",
  "resume": "Écran de paiements filmé au doigt en ouverture (0,0-13,8 s), puis la thèse : un logiciel « agentique », c'est un chatbot dans le logiciel qui le comprend et facture des crédits (26,4-33,4 s) ; avant, abonnements faibles et désabonnements (33,4-41,1 s), après, des clients qui paient beaucoup plus (41,1-50,9 s) ; la raison : supprimer la confusion (50,9-55,7 s), car un logiciel trop compliqué pour obtenir un résultat n'est plus payé (55,7-60,9 s) ; une IA qui comprend le logiciel et facture à l'usage donne un résultat plus vite (60,9-67,7 s) ; étude de cas contre le mot « agentic » ou lien en bio (67,7-88,2 s). À l'image, le « chatbot » est le panneau de planification de CodeSpring (30,5 s) : serveurs MCP listés, une question à la fois, une ligne d'action sous chaque réponse (« Updating features / project / audience / tech stack »), un compteur de crédits et une barre « Planning 62 % complete ». Débit 3,65 mots/s. Corrige l'analyse du 01/11 : titre en texte noir sur cartouche blanc (≈0-4 s), 16 coupes distinctes (17 détections) ; entre 27,3 et 50,9 s aucun raccord, un seul plan à la main qui parcourt l'écran.",
  "outils_mentions": [
    "CodeSpring, son produit (images 30,5 et 35,0 s)",
    "serveurs MCP Notion, Whop Docs et Context7 affichés dans le chat (image 30,5 s)",
    "tableau de paiements, plateforme non nommée (0,0-13,8 s)",
    "post sur X cité dans l'étude de cas (image 76,0 s)",
    "page d'étude de cas servie en localhost:3002 (image 84,0 s)"
  ],
  "workflows_decrits": [
    "Chat de planification : l'utilisateur décrit son application → l'agent ajoute les fonctions, pose une seule question à la fois (public, usage), écrit sous chaque réponse ce qu'il vient de mettre à jour, décompte les crédits et affiche l'avancement (image 30,5 s)",
    "Monétisation à l'usage : le chatbot facture des crédits à chaque usage (29,8-33,4 s ; 63,4-67,7 s)",
    "Capture de prospects : mot « agentic » en commentaire → lien envoyé → page d'étude de cas avec formulaire prénom + e-mail (80,5-85,6 s ; image 84,0 s)"
  ],
  "strategies": [
    "Preuve d'abord : macro sur une ligne de paiement « Succeeded » pointée du doigt, avec zoom (0,0-2,9 s, hook.jpg)",
    "Avant / après : tableau « Before Agentic SaaS » (lignes « Past due », désabonnement 28,39 %) annoté au feutre vert numérique (image 35,0 s), puis paiements élevés entourés (≈44-50 s, planche)",
    "Un seul ennemi nommé, la confusion (50,9-55,7 s), et sa règle « trop compliqué = plus personne ne paie » (55,7-60,9 s)",
    "Appui externe : post cité qui oppose un logiciel qui t'aide à faire et un logiciel qui laisse ton agent faire seul (image 76,0 s)",
    "Aimant à prospects : étude de cas gratuite (67,7-85,6 s) et pastille permanente « Free case study link in bio » (dès ≈9 s, planche)"
  ],
  "erreurs_a_eviter": [
    "Montants d'abonnés affichés et dits (0,0-13,8 s ; 41,1-50,9 s), « 700 000 $ » (13,8-18,4 s), « centaines d'entreprises, milliers d'avis » (18,4-23,9 s) : affirmé, non vérifiable ; aucun prix dans une pub Presti",
    "Désabonnement de 28,39 % montré comme preuve sans source ni période lisible (image 35,0 s)",
    "Annotations vertes partout (image 35,0 s) : dans la charte Presti le vert #38CD8C ne sert qu'à « validé », une annotation se fait au corail",
    "Page d'étude de cas filmée sur localhost:3002 (image 84,0 s) : une démo locale présentée comme produit ; chez Presti on ne montre que ce qui est en production",
    "Écran filmé au doigt, reflets et flou"
  ],
  "hooks_accroches": [
    "Premier mot : ce qu'un client paie chaque mois, le doigt sur la ligne (0,0-2,9 s)",
    "Titre contrarien qui attaque ce que le spectateur construit : des CRM faits à l'IA (hook.jpg)",
    "« On en a d'innombrables » puis un 2e exemple aussitôt (6,3-13,8 s)"
  ],
  "formats_contenu": [
    "Écran filmé au doigt en macro, plan à la main de 23 s qui parcourt l'écran (27,3-50,9 s), face caméra ; 576×1024",
    "Cartouche-titre texte noir sur blanc ≈0-4 s ; sous-titres blancs contour noir sur 3 lignes",
    "Pastilles noires « Hold for 2x speed » et « Free case study link in bio »",
    "Tableau avant / après annoté au feutre numérique ; page d'étude de cas avec formulaire"
  ],
  "applicabilite_chantiers": {
    "cerveau_obsidian": {
      "pertinent": false,
      "actions": []
    },
    "landing": {
      "pertinent": true,
      "actions": [
        "Refonte (cadrage P4) : sous-titre du haut de page sur l'angle « Presti fait le travail au lieu d'un logiciel de plus à apprendre » (promesse de la page à 84,0 s, réécrite), dit honnêtement : en Studio l'IA prépare et tu valides, en Signature elle envoie seule",
        "Bloc avant / après qualitatif (carnet, tableur, relance oubliée → une console qui prépare), aucun chiffre hors plans/promesses.md, annotations au corail (image 35,0 s)",
        "Formulaire court prénom + e-mail pour réserver la démo de 10 min (déjà promise dans chaque premier message), sur le modèle de la page à 84,0 s, sans chiffre de revenu"
      ]
    },
    "prospection": {
      "pertinent": false,
      "actions": []
    },
    "presti_assistant": {
      "pertinent": true,
      "actions": [
        "Dans le fil de app/assistant/page.tsx, afficher sous chaque réponse la ligne de ce qui vient d'être fait (« client retrouvé », « devis mis à jour »), comme les « Updating … » (image 30,5 s) ; libelleOutil sert déjà au journal (app/assistant/page.tsx:278), il suffit de le remonter dans la conversation",
        "Pour une tâche en plusieurs étapes (devis complet, situation de travaux) : une question à la fois et une barre d'avancement (image 30,5 s, « Planning 62 % complete »)",
        "Critère « zéro confusion » (50,9-60,9 s) : ajouter au harnais assistant-qa des demandes floues où l'assistant doit poser une seule question utile au lieu de renvoyer l'artisan vers un menu",
        "Solde de crédits visible dans l'assistant : les crédits existent déjà (creditsMois, lib/plans.ts:42) ; faire payer l'assistant à l'usage (29,8-33,4 s ; 63,4-67,7 s) reste une décision d'argent de Benj"
      ]
    },
    "contenu_videos": {
      "pertinent": true,
      "actions": [
        "Format « l'assistant au travail » : une demande tapée, puis des lignes d'action qui s'empilent et une barre qui se remplit jusqu'à une carte « À valider », en 3D sur fond nuit, corail, vert seulement au moment de la validation (image 30,5 s)",
        "Ouverture « preuve en macro » (0,0-2,9 s) : gros plan sur une carte devis marquée « Exemple » qui passe à « Validé », jamais un paiement ni un prix d'abonnement"
      ]
    }
  },
  "priorite": "haute",
  "sources_timestampes": [
    "0,0-13,8 s : paiements mensuels affirmés, doigt sur l'écran",
    "13,8-26,4 s : revenu total et références affirmés",
    "26,4-33,4 s : chatbot qui comprend le logiciel et facture des crédits",
    "33,4-50,9 s : avant / après",
    "50,9-60,9 s : la confusion",
    "60,9-67,7 s : usage facturé, résultat plus rapide",
    "67,7-88,2 s : étude de cas contre « agentic »",
    "image 30,5 s : chat CodeSpring (MCP, « Updating … », crédits, barre 62 %)",
    "image 35,0 s : « Before Agentic Saas », churn 28,39 %, annotations vertes",
    "image 76,0 s : post cité « logiciel qui aide » contre « agent qui fait »",
    "image 84,0 s : page d'étude de cas en localhost:3002, formulaire",
    "hook.jpg : macro « Succeeded £187.00 », cartouche-titre, sous-titre du montant",
    "ffmpeg scene>0,3 : 17 détections, 16 coupes ; 321 mots / 88,0 s parlées = 3,65 mots/s"
  ]
}
```

#### En route vers un logiciel IA à 1 M$ (titre en cartouche) — priorité basse

```json
{
  "video_id": "realbastianvolkis-7678336589503827202",
  "source": "tiktok",
  "titre": "En route vers un logiciel IA à 1 M$ (titre en cartouche)",
  "duree": "54,4 s (ffprobe 54,36 s) — 1080×1920, fréquence variable (nominale 59,94 i/s, moyenne ≈39 i/s)",
  "resume": "Épisode d'une série de récit de croissance qui démarre au milieu d'une phrase (0,0-3,5 s) : il passe au logiciel haut de gamme en vendant des licences de sa technologie (3,5-12,9 s) — un cerveau de connaissances monté pour une entreprise (12,9-18,8 s), des agents sous licence pour faire tourner l'activité (18,8-22,5 s), le remplacement d'un produit par un agent (22,5-28,6 s) — et vise des abonnements plus chers et des forfaits (28,6-48,9 s) ; vendre l'IA aux entreprises serait la meilleure opportunité du moment (50,1-54,3 s). À l'image : tableau de paiements clair pointé du doigt (≈0-8,4 s), sphère de particules (≈15,6-19,8 s), liste de paiements surtout « Failed » (image 33,0 s) présentée comme la preuve qu'un client voulait l'outil malgré une carte refusée (32,4-37,4 s). Débit 3,70 mots/s. Corrige l'analyse du 01/11 : aucun sous-titre incrusté (titre seul ≈0-3 s, vérifié sur l'image 25,0 s) ; 7 coupes distinctes (11 détections dont 4 doublons) ; fréquence variable ≈39 i/s, pas 29,97. Aucun chantier n'y trouve plus qu'une idée de cadrage pour l'offre sur devis.",
  "outils_mentions": [
    "CodeSpring, nom du produit dans la liste de paiements (image 33,0 s)",
    "tableau de paiements, plateforme non nommée (≈0-8,4 s)"
  ],
  "workflows_decrits": [
    "Offre « licence + mise en place » : cerveau de connaissances installé pour l'entreprise, agents sous licence qui font tourner l'activité, remplacement d'un produit par un agent (12,9-28,6 s)",
    "Montée en gamme tarifaire affirmée : abonnement bas → abonnement minimum plus élevé → forfaits (37,4-48,9 s)"
  ],
  "strategies": [
    "Format série « en route vers … » avec objectif chiffré public (titre ≈0-3 s ; 0,0-3,5 s)",
    "Recadrer des paiements échoués en preuve de demande (32,4-37,4 s ; image 33,0 s)",
    "Monter en gamme : forfaits plutôt qu'abonnement bas (37,4-48,9 s)"
  ],
  "erreurs_a_eviter": [
    "Récit de revenus invérifiables du début à la fin : 13 000 $, 2 000 $, 199 £/mois, forfaits de 3 000 à 10 000 $ (3,5-9,7 s ; 28,6-48,9 s)",
    "Montrer les paiements refusés d'un client et en faire un argument (image 33,0 s ; 32,4-37,4 s) : donnée de client à l'écran et argument manipulateur",
    "Aucun sous-titre (image 25,0 s) : sans le son, la vidéo ne dit rien",
    "Caméra grand-angle à la main qui tremble, images floues (hook.jpg, planche)",
    "Démarrer au milieu d'une phrase (0,0-3,5 s) : qui n'a pas vu l'épisode précédent ne sait pas de quoi on parle"
  ],
  "hooks_accroches": [
    "Titre de série à objectif chiffré, en cartouche blanc, sur un tableau de paiements pointé du doigt (hook.jpg, ≈0-3 s)",
    "Entrée au milieu d'une phrase, effet « suite d'épisode » (0,0-3,5 s)"
  ],
  "formats_contenu": [
    "Écran filmé au doigt + face caméra à la main, grand-angle ; 1080×1920 à fréquence variable",
    "Cartouche-titre texte noir sur blanc ≈0-3 s, aucun sous-titre",
    "Insert sphère de particules (≈15,6-19,8 s)"
  ],
  "applicabilite_chantiers": {
    "cerveau_obsidian": {
      "pertinent": false,
      "actions": []
    },
    "landing": {
      "pertinent": true,
      "actions": [
        "Page /entreprise prévue (offre « Presti pour l'entreprise », cadrage P3 §9.6, sans prix ni paiement en libre-service) : présenter l'offre sur devis comme une mise en place — données importées, procédures de l'entreprise écrites en compétences, niveaux d'autonomie convenus — d'après l'idée « licence + installation » (12,9-28,6 s) ; décision d'offre à Benj"
      ]
    },
    "prospection": {
      "pertinent": false,
      "actions": []
    },
    "presti_assistant": {
      "pertinent": false,
      "actions": []
    },
    "contenu_videos": {
      "pertinent": false,
      "actions": []
    }
  },
  "priorite": "basse",
  "sources_timestampes": [
    "0,0-12,9 s : passage au haut de gamme, licences",
    "12,9-28,6 s : cerveau, agents sous licence, remplacement d'un produit",
    "28,6-48,9 s : paiements et forfaits affirmés ; 32,4-37,4 s : carte refusée",
    "50,1-54,3 s : « meilleure opportunité »",
    "image 25,0 s : face caméra sans sous-titre",
    "image 33,0 s : liste de paiements « Failed » / « Succeeded », produit CodeSpring",
    "hook.jpg : cartouche-titre, doigt sur « $13.3K »",
    "ffprobe : r_frame_rate 2997/50, moyenne ≈39,0 i/s, 2 118 images ; ffmpeg scene>0,3 : 11 détections, 7 coupes ; 201 mots / 54,3 s = 3,70 mots/s"
  ]
}
```

#### Un client à 3 700 $ par an pour mon logiciel (titre en cartouche) — priorité moyenne

```json
{
  "video_id": "realbastianvolkis-7675806697113357590",
  "source": "tiktok",
  "titre": "Un client à 3 700 $ par an pour mon logiciel (titre en cartouche)",
  "duree": "39,9 s (ffprobe 39,94 s) — 1080×1920, ≈29,8 i/s",
  "resume": "Accroche sur un tableau de paiements sombre pointé du doigt (0,0-6,6 s) ; thèse : le logiciel va vers le paiement au résultat, parce qu'on peut garantir des résultats et facturer le travail fait (6,6-17,0 s) ; son logiciel développerait un produit entier, créerait des pages de référencement et gérerait un site (17,0-26,6 s) ; parti d'un projet « vibe codé » (26,6-35,4 s) ; renvoi vers son site (35,4-40,4 s). À l'image : tableau de tâches « Patient Document Translator » en colonnes Up Next / Building / Review, tâches marquées « Codex · passed » (image 19,0 s) ; page d'accueil violette au titre en trois douleurs avec une ligne de trois chiffres (image 22,0 s) ; main sur le visage (≈28 s) ; adresse tapée dans le navigateur (≈38-40 s). Débit 3,32 mots/s, juste au seuil. Corrige l'analyse du 01/11 : pas de sous-titres incrustés (titre seul ≈0-5 s, vérifié sur l'image 13,0 s) ; la page violette est à ≈20-25 s (pas 17-22) et le geste d'exaspération vers 28 s (pas 25) ; 5 coupes (10,2 ; 17,2 ; 25,3 ; 27,8 ; 36,1 s).",
  "outils_mentions": [
    "CodeSpring (codespring.app, 35,4-40,4 s ; images 19,0 et 22,0 s)",
    "Codex, étiquette « Codex · passed » sur les tâches (image 19,0 s)",
    "comptes connectés Discord et TradingView sur la fiche client (hook.jpg)"
  ],
  "workflows_decrits": [
    "Agent qui développe un produit : projet découpé en tâches (téléversement, OCR, traduction, résumé…) qui passent de « Up Next » à « Building », validées « Codex · passed », puis à « Review » (image 19,0 s ; 17,0-21,0 s)",
    "Pages de référencement et gestion de site faites par le logiciel (21,0-26,6 s) — affirmé, pas montré en détail"
  ],
  "strategies": [
    "Facturer le travail fait et le résultat plutôt que l'accès au logiciel (11,9-17,0 s)",
    "Récit d'origine modeste, projet « vibe codé », avec geste d'exaspération pour l'authenticité (26,6-35,4 s ; ≈28 s)",
    "Page d'accueil : trois douleurs dans le titre, ligne de trois chiffres dessous (image 22,0 s)",
    "Fin sur l'adresse tapée dans la barre du navigateur (≈38-40 s)"
  ],
  "erreurs_a_eviter": [
    "« 3 700 $ en 48 h » et un abonnement annuel de 3 000 $ (0,0-11,9 s) : affirmé ; l'accroche est un revenu",
    "« Nous pouvons garantir des résultats » (11,9-17,0 s) : promesse invérifiable, interdite dans une pub Presti",
    "Chiffres de la page d'accueil (3 644+, 12 230+, 98 %) sans source (image 22,0 s)",
    "Page violette sur fond spatial, interface bleutée : hors charte (jamais de bleu ni de cyan)",
    "Pas de sous-titres (image 13,0 s) et 3,32 mots/s : au seuil, sans marge"
  ],
  "hooks_accroches": [
    "Montant annuel d'un client en titre (cartouche ≈0-5 s) + doigt et zoom à la main sur la dépense du client (hook.jpg)",
    "Phrase de statut en entrée : il devient officiellement un logiciel haut de gamme (0,0-6,6 s, paraphrase)"
  ],
  "formats_contenu": [
    "Écran filmé à la main + face caméra ; 1080×1920",
    "Cartouche-titre texte noir sur blanc ≈0-5 s ; aucun sous-titre",
    "Fin sur l'adresse du site tapée au clavier"
  ],
  "applicabilite_chantiers": {
    "cerveau_obsidian": {
      "pertinent": false,
      "actions": []
    },
    "landing": {
      "pertinent": true,
      "actions": [
        "Refonte (cadrage P4) : tester un titre de haut de page en trois douleurs d'artisan (le devis promis, la relance oubliée, la paperasse du soir) sur le modèle de la page de l'image 22,0 s, sans ligne de chiffres tant que plans/promesses.md n'en source aucun ; phrase à faire approuver par Benj"
      ]
    },
    "prospection": {
      "pertinent": false,
      "actions": []
    },
    "presti_assistant": {
      "pertinent": true,
      "actions": [
        "Dessiner la boîte « À valider » (cadrage P3 §9.4, table d'opportunités dans Supabase) en trois colonnes comme le tableau de l'image 19,0 s : Repéré (opportunité détectée) → Préparé (brouillon de l'assistant) → À valider (geste de l'artisan) ; en Signature, les types passés au niveau 3 franchissent la dernière colonne seuls, avec l'annulation de 10 min (lib/pilote/regles.ts:24)"
      ]
    },
    "contenu_videos": {
      "pertinent": true,
      "actions": [
        "Plan « tableau qui se remplit seul » : des cartes d'artisan (relance, devis, facture) glissent de colonne en colonne et s'arrêtent sur « À valider », où un doigt ou un curseur valide (vert) ; illustre Studio sans écran filmé (image 19,0 s)"
      ]
    }
  },
  "priorite": "moyenne",
  "sources_timestampes": [
    "0,0-11,9 s : client à 3 700 $ affirmé, abonnement annuel",
    "11,9-17,0 s : garantir des résultats, facturer le travail fait",
    "17,0-26,6 s : produit développé, pages de référencement, site",
    "26,6-35,4 s : projet « vibe codé »",
    "35,4-40,4 s : adresse du site",
    "image 13,0 s : face caméra sans sous-titre",
    "image 19,0 s : tableau Up Next / Building / Review, « Codex · passed »",
    "image 22,0 s : page d'accueil violette, titre en trois douleurs, chiffres 3 644+ / 12 230+ / 98 %",
    "hook.jpg : cartouche-titre, zoom sur « Spend $3.7K »",
    "ffmpeg scene>0,3 : 5 coupes ; 134 mots / 40,4 s = 3,32 mots/s"
  ]
}
```

### Démonstration produit en motion design et en 3D (2 vidéos)

#### « Les tableaux Excel viennent officiellement de mourir » : un logiciel d'agence en 3D cliquable, fait avec Claude en 3 étapes — priorité haute

```json
{
  "video_id": "mikalianov-7702516743494733089",
  "source": "tiktok",
  "titre": "« Les tableaux Excel viennent officiellement de mourir » : un logiciel d'agence en 3D cliquable, fait avec Claude en 3 étapes",
  "duree": "40,47 s (ffprobe ; 576×1024, 30 i/s ; publiée le 30/10/2026 d'après l'identifiant TikTok)",
  "resume": "Tutoriel en français de 40,5 s, voix face caméra à 4,73 mots/s. De 0,0 à 3,0 s, le créateur annonce la mort des tableaux Excel devant un écran qui montre un entrepôt 3D isométrique. De 3,0 à 10,6 s, il montre un logiciel d'agence en 3D (client fictif « Novalis SA » : qui est en réunion, suivi de projet, devis en attente). De 10,6 à 31,7 s, il donne une méthode « avec Claude en 3 étapes » : décrire l'entreprise ou donner un export CRM/Excel, puis la faire designer en monde 3D cliquable à partir d'un plan ou d'une photo. De 31,7 à 40,4 s, la 3ᵉ étape reste cachée derrière un abonnement et le commentaire « CRM ». Le montage alterne écran partagé (motion design en haut, visage en bas) et motion design plein cadre aux moments clés, avec un geste d'interface par phrase : champ qui se tape, fichier qui file, frise d'étapes cochée en vert. C'est la forme « animer la fonctionnalité » exigée par Benj le 20/10. Deux des étapes recoupent des briques Presti existantes : l'atelier 3D qui s'adapte au métier et à la base, et l'import Excel de /chiffres.",
  "outils_mentions": [
    "Claude : transcrit « Cloud » (10,6-12,8 s ; 15,2-17,7 s), étiquette « Claude » à l'écran (12,5 s ; 18,5 s ; 21,0 s)",
    "Excel / tableur : sous-titre de 0,0-3,0 s, tableur gris présenté comme l'ancien (≈4,8 s), fichier « export_clients.xlsx » (21,0 s)",
    "Export de CRM comme source des vrais chiffres (19,1-21,5 s)",
    "Plan des locaux ou photo, fichier « plan.jpg » (26,1-27,9 s ; image à 26,5 s)",
    "Logiciel 3D montré sans nom de produit (client fictif « Novalis SA », 4,5 s)"
  ],
  "workflows_decrits": [
    "Étape 1 (15,2-22,9 s) : décrire à Claude son entreprise ou celle d'un client (équipe, clients, projets), ou lui donner un export de CRM ou d'Excel pour qu'il reprenne les vrais chiffres. À l'écran, le champ se tape (≈16,4 s), puis deux puces « Équipe · 30 » et « Clients · 10 » apparaissent (18,5 s).",
    "Étape 2 (22,9-31,7 s) : lui demander de designer l'entreprise comme un monde en 3D, lui fournir le plan des locaux ou une photo, puis rendre chaque partie cliquable (collaborateurs, salles, projets). À l'écran : invite tapée puis rendu 3D (≈26,0 s), plan.jpg (26,5 s), tableau des projets (31,5 s).",
    "Étape 3 (31,7-40,4 s) : non dévoilée, promise en message privé contre un abonnement et le commentaire « CRM ». Son contenu est inconnu (carte floutée « Construis-le avec ▇▇ », 34,0 s)."
  ],
  "strategies": [
    "Accroche « un outil familier est mort », appuyée par une preuve visuelle : le monde 3D est déjà à l'écran derrière la phrase. Vers 2,0-2,9 s, l'ancien (tableur sur le portable) et le nouveau (entrepôt 3D avec camion) tiennent dans le même cadre.",
    "Le résultat avant la méthode : 7,6 s de logiciel fini (3,0-10,6 s) avant la première étape.",
    "Boucle ouverte : trois étapes annoncées, la 3ᵉ floutée et cadenassée (12,5 s), puis grossie (14,0 s) et marquée « La plus importante » (≈14,5 s). La frise la rappelle à chaque étape (24,1 s ; 34,0 s).",
    "Un geste d'interface par phrase de voix, avec un contenu renouvelé environ toutes les 2 s. Le motion passe en plein cadre quand l'information structure le récit (6,0-8,3 / 10,7-15,3 / 23,0-26,2 / 30,0-34,7 s).",
    "Chiffres concrets à l'écran pour rendre l'outil crédible : 26/30 collaborateurs présents (4,5 s), « CHF 185'600 » de devis en attente, « 7 devis · 2 à relancer · 1 à signer » (9,5 s).",
    "Captation : abonnement et commentaire d'un mot-clé en échange de l'étape 3 en message privé (36,6-40,4 s), avec un faux bouton « S'abonner » et un faux champ de commentaire « CRM » (≈37,6-40,5 s)."
  ],
  "erreurs_a_eviter": [
    "Appât « commente CRM » et étape cachée (31,7-40,4 s) : la vidéo ne tient pas sa promesse et pousse à des messages privés en série, ce qui relève d'une décision de Benj. Dans un film Presti, l'étape 3 se révèle à l'écran.",
    "Palette hors charte : fond crème, et pastilles, numéros, puces et étape en cours en bleu (4,5-34,0 s). La charte Presti impose fond #0A0C11, accent corail #D97757 et jamais de bleu. Seule la coche verte des étapes validées (24,1 s ; 34,0 s) respecte déjà la règle du vert.",
    "Visage réel : moitié basse de 3,0 à 37,4 s, plein cadre ensuite. Interdit dans les films Presti.",
    "Cartes plates sur fond uni avec une vignette 3D : sans vraie 3D, la même recette (typographie et cartes) a valu à la pub v13 le verdict « très médiocre » (27/10). La copie d'une autre vidéo de ce créateur (référence du 18/10) a déjà donné un film CRM v1 « absolument nul » (20/10) : copier la grammaire, pas l'image.",
    "Montrer un geste qui n'existe pas dans le produit : chez Presti, un export Excel se dépose dans « Mes chiffres » (app/chiffres/ComptaArtisan.tsx:157, 252), pas dans l'assistant. Tant que l'import par le chat n'existe pas, le fichier du film doit filer vers « Mes chiffres ».",
    "Marque tierce à l'écran (étiquette « Claude », 12,5-24,1 s) : logos et marques sont interdits dans les pubs Presti.",
    "Chiffres présentés comme réels (CHF 185'600, 26/30) : dans une pub Presti, toute maquette fictive porte « Exemple. » pendant tout le film.",
    "Promesse « fais-le toi-même avec une IA » : hors sujet pour Presti, qui vend l'outil fini. Ne pas la transposer."
  ],
  "hooks_accroches": [
    "0,0-3,0 s : annonce de la mort « officielle » des tableaux Excel, face caméra avec geste « OK », pastille « Wow… l'IA revolution », entrepôt 3D sur l'écran derrière.",
    "10,6-15,2 s : la méthode tient en 3 étapes ; il faut rester jusqu'à la 3ᵉ, sans laquelle rien ne fonctionne.",
    "31,7-36,6 s : l'étape 3 est la plus importante, celle que la plupart ratent, et il serait trop facile de tout dévoiler dans une vidéo."
  ],
  "formats_contenu": [
    "Tutoriel 9:16 de 40 s, voix face caméra en français, 4,73 mots/s, 10 coupes nettes.",
    "Écran partagé (motion design en haut, visage en bas dans une chambre le soir) en alternance avec du motion design plein cadre. Visage plein cadre pour l'appel final (37,4-40,5 s).",
    "Motion design d'interface : fond crème, cartes blanches ombrées, titres à empattements (« Novalis SA », « 3 étapes », « Ton business », « Monde 3D »), pastille de section à contour bleu en haut à gauche, rendus 3D isométriques dans les cartes.",
    "Mots-clés de 1 à 3 mots en capitales, police à chasse fixe, sur un bandeau noir posé à la jonction des deux moitiés (4,5 ; 9,5 ; 18,5 ; 21,0 ; 26,5 s).",
    "Liste numérotée de 3 cartes, avec en dessous une frise de progression (pastilles 1-2-cadenas, coches vertes au fil des étapes)."
  ],
  "applicabilite_chantiers": {
    "cerveau_obsidian": {
      "pertinent": true,
      "actions": [
        "Par une tâche .orchestre de périmètre SaaS/wiki/…, ajouter la vidéo à « Références de Benj et ce qu'elles enseignent ». Elle est publiée le 30/10 d'après l'identifiant, donc distincte des envois du 18/10 et du 20/10. Ce qu'elle enseigne : un geste d'interface par phrase, le plein cadre aux moments clés, une frise d'étapes cochée en vert.",
        "Dans la même tâche, ajouter au tableau « Verdicts de Benj sur les films - historique » le verdict qui manque, celui du 20/10 au matin sur le film CRM v3 animé : « vidéo CRM super », avec la demande « panneaux de gestion, pipeline » (source : mémoire du 20/10 sur la consigne du film CRM animé). C'est le seul film de démonstration produit en 3D approuvé, donc la référence interne de ce thème.",
        "Corriger la §2 d'ANALYSE-TIKTOK.md : (1) les pastilles d'étape ont un contour bleu, elles ne sont pas grises ; (2) la 3ᵉ étape n'est jamais cochée (à 34,0 s, 1 et 2 sont cochées, 3 est en cours) ; (3) le mot mal transcrit est « designer » (bandeau « DE DESIGNER » à ≈24,1 s), pas « dessiner » ; (4) l'alternance écran partagé / plein cadre n'était pas relevée ; (5) le verdict « absolument nul » date du 20/10 ; (6) l'import existant est celui de /chiffres."
      ]
    },
    "landing": {
      "pertinent": true,
      "actions": [
        "Section « La chaîne complète » (app/page.tsx:232-237, quatre cartes empilées en CSS sans script) : ajouter une frise de pastilles 1-2-3-4 collée au-dessus des cartes, sur le modèle de 12,5 s / 24,1 s / 34,0 s. Pastille corail pour l'étape lue, vert #38CD8C seulement quand l'étape est « validée », jamais de bleu. À confier à un exécutant par une tâche .orchestre, avec la skill presti-design.",
        "Carte 1 de la même section : faire taper la demande du prospect lettre à lettre, comme le champ « Ton business » (≈16,4-18,5 s). Texte marqué « Exemple », animation coupée sous prefers-reduced-motion. Vérifier au navigateur, par captures à plusieurs instants, que l'animation se voit vraiment (leçon de la démo du 14/09)."
      ]
    },
    "prospection": {
      "pertinent": true,
      "actions": [
        "Option à soumettre à Benj sous forme de question à options. Dans le workflow n8n de prospection sur Oracle, après l'enrichissement du métier : faire rendre par Playwright l'atelier 3D au métier du prospect via /atelier-demo?metier=… (paramètres dans app/atelier-demo/Demo.tsx:17-20 ; page servie seulement si PRESTI_DEMO_ATELIER=1, page.tsx:12). L'image, marquée « Exemple », serait jointe ou liée dans le 1er e-mail Brevo. C'est l'étape « ton entreprise dessinée en 3D » (22,9-31,7 s) appliquée au prospect, et cela rejoint la piste « livrable à son nom » du cadrage du 01/11. À tester d'abord sur un petit lot, pour la délivrabilité (300 envois/jour)."
      ]
    },
    "presti_assistant": {
      "pertinent": true,
      "actions": [
        "Outil d'action « décrire mon entreprise » dans lib/assistant/outils-actions.ts. L'artisan dit en une phrase son métier, son lieu (chez moi, atelier, entrepôt, camion) et son équipe ; l'assistant propose une carte à valider qui enregistre métier et base en base. Aujourd'hui, ce réglage ne vit que dans le navigateur (app/crm/atelier/Atelier.tsx:99-115, aucune écriture serveur) et crm_reglages ne porte que validation_auto (supabase/migrations/0172_crm_carte_chantiers.sql:34-38). Claude Code écrit la migration et l'outil ; la maquette (lib/crm/infrastructure.ts) lit ensuite le réglage sur tous les appareils. Transposition de 15,2-19,1 s.",
        "Dépôt de fichier dans le chat /assistant, qui n'a aujourd'hui aucun champ fichier (app/assistant). Un export Excel/CSV glissé suivrait le circuit déjà en place dans /chiffres : lecture par lireClasseur (app/chiffres/ComptaArtisan.tsx:157), plan de colonnes contrôlé par validerPlanIA (l.116), puis aperçu à valider avant toute écriture. Transposition de 19,1-22,9 s."
      ]
    },
    "contenu_videos": {
      "pertinent": true,
      "actions": [
        "Film 9:16 « ton atelier en 3 étapes » : copie plan par plan de mikalianov aux mêmes instants (coupes à 3,0 / 6,0 / 8,3 / 10,7 / 15,3 / 23,0 / 26,2 / 30,0 / 34,7 / 37,4 s), en 3D plein cadre et sans visage. Partir du moteur de videos/crm-v3 (film CRM animé jugé « super » le 20/10) et de offres-v1. Étape 1 : le métier se tape, puis la base 3D pousse. Étape 2 : le village est cliquable, une maison s'ouvre sur sa fiche. Étape 3 révélée : « tu valides » (Studio). Passer par le workflow pub-10-sur-10, montrer la planche côte à côte à Benj avant le rendu complet, voix Fish de Benj à 3,3 mots/s ou plus (référence : 4,73).",
        "Ajouter au kit _kit-pub, en Bricolage Grotesque 700 et corail #D97757, les gestes de cette vidéo : champ qui se tape (≈16,4-18,5 s), fichier qui file le long d'un pointillé (≈20,2-22,2 s), carte qui grossit pour désigner l'étape clé (14,0 s), frise qui se coche en vert à chaque étape validée (24,1 / 34,0 s).",
        "Panneau chiffré qui jaillit d'un bâtiment 3D quand on le touche, comme « 7 devis · 2 à relancer · 1 à signer » (9,5 s), avec les vrais intitulés des tuiles Presti (« Devis en attente », app/crm/Tableau.tsx:22 ; « Relances dues », l.28) et des montants marqués « Exemple ».",
        "Carrousel 1080×1350 « 3 étapes » : en diapo 2, la liste à 3 cartes avec la 3ᵉ masquée (comme à 12,5 s) ; une diapo par étape avec sa pastille ; en dernière diapo, la révélation. À produire par un exécutant sur le gabarit presti-ops/publication/2026-10-30-inventaire-carrousel/generer.js."
      ]
    }
  },
  "priorite": "haute",
  "sources_timestampes": [
    "0,0-3,0 s (transcription et images d'accroche) : face caméra, geste « OK », pastille « Wow… l'IA revolution », sous-titre « les tableaux Excel viennent officiellement de mourir », entrepôt 3D isométrique sur l'écran derrière.",
    "≈2,0-2,9 s (images d'accroche ; planche ≈2,9 s) : la caméra glisse vers l'écran ; camion 3D à l'écran, tableur gris sur le portable en dessous.",
    "3,0 s (coupe détectée par ffmpeg) : passage à l'écran partagé, motion design sur fond crème en haut, visage en bas.",
    "4,5 s (image extraite) : titre « Novalis SA », pastille « VUE 3D », bureau 3D isométrique et panneau « Aujourd'hui au bureau » (26/30 présents, CHF 185'600 de devis en attente) ; bandeau « DE MARKETING ».",
    "≈4,8 s (planche) : bandeau « AU LIEU » sur une carte de tableur gris ; 4,6-7,0 s (transcription) : au lieu d'un tableur tout gris, on clique sur n'importe quel élément.",
    "6,0-8,3 s (coupes ; planche ≈6,7 s) : motion design plein cadre, sans visage (« SUR N'IMPORTE »).",
    "9,5 s (image) : carte « Suivi projet » (frise Lancement → Livraison, 62 %) et carte « Devis en attente CHF 185'600 · 7 devis · 2 à relancer · 1 à signer » ; bandeau « DE PROPOSITIONS ».",
    "10,6-15,2 s (transcription) : la méthode avec « Cloud » (Claude) en 3 étapes ; rester jusqu'à la 3ᵉ, sinon rien ne fonctionnera.",
    "12,5 s (image) : étiquette « Claude », titre « 3 étapes », cartes « 1 Décris ton business », « 2 Design-le en monde 3D », 3 floutée avec cadenas ; frise 1-2-cadenas en bas.",
    "14,0 s (image) : la 3ᵉ carte grossit ; ≈14,5 s (planche) : étiquette rouge « La plus importante ».",
    "15,2-22,9 s (transcription) : décrire son business (équipe, clients, projets) ou donner un export CRM/Excel, qui fournit les vrais chiffres.",
    "≈16,4 s (planche) puis 18,5 s (image) : champ « Ton business » tapé jusqu'à « …30 personnes, 4 salles de réunion, 13 projets en cours. », puis puces « Équipe · 30 » et « Clients · 10 ».",
    "≈20,2 s (planche), 21,0 s (image), ≈22,2 s (planche) : « export_clients.xlsx » glisse vers l'étiquette « Claude » le long d'un pointillé, puis un tableau de CRM apparaît ; bandeau « OU DE TON EXCEL ».",
    "22,9-26,1 s (transcription) et ≈24,1 s (planche, bandeau « DE DESIGNER ») : étape 2, faire designer l'entreprise comme un monde 3D ; frise avec 1 coché en vert et 2 en cours en bleu.",
    "≈26,0 s (planche) : invite tapée « open space, 4 salles de réunion, cafétéria, terrasse » et rendu 3D du bureau.",
    "26,5 s (image) : pastille « TON PLAN OU UNE PHOTO », carte « plan.jpg » (plan d'étage) ; bandeau « DONNE-LUI LE PLAN ».",
    "27,9-31,7 s (transcription) : rendre chaque partie cliquable (collaborateurs, salles, projets) ; ≈29,9 s (planche) : « CHAQUE PARTIE CLIQUABLE ».",
    "31,5 s (image) : pastille « PROJETS », tableau en colonnes (Lead → Négociation, montants en CHF), liste « 1 Collaborateurs / 2 Salles / 3 Projets ».",
    "31,7-36,6 s (transcription) et 34,0 s (image) : étape 3 cachée, carte floutée « Construis-le avec ▇▇ » avec cadenas ; frise avec 1 et 2 cochées en vert, 3 en cours.",
    "37,4 s (coupe) jusqu'à 40,5 s, et 36,6-40,4 s (transcription) : visage plein cadre, bouton « S'abonner », « COMMENTE CRM », réception de l'étape en message privé.",
    "Coupes au-dessus de 0,3 (ffmpeg) : 3,0 · 6,0 · 8,3 · 10,7 · 15,3 · 23,0 · 26,2 · 30,0 · 34,7 · 37,4 s.",
    "Débit : 191 mots pour 40,4 s parlées, soit 4,73 mots/s (transcription faster-whisper, fautes de reconnaissance comprises)."
  ]
}
```

#### L'accueil 3D de « Blitz » : un « empire » d'entrepreneurs connectés, filmé au téléphone — priorité moyenne

```json
{
  "video_id": "yova2n-7701424216331078945",
  "source": "tiktok",
  "titre": "L'accueil 3D de « Blitz » : un « empire » d'entrepreneurs connectés, filmé au téléphone",
  "duree": "33,17 s (ffprobe ; 1080×1920, 30 i/s ; publiée le 27/10/2026 d'après l'identifiant TikTok)",
  "resume": "Vlog en français de 33,2 s filmé au téléphone. Le fondateur de la plateforme « Blitz » montre son accueil dès la première image : une ville 3D isométrique au bord de la mer (0-3,6 s). Il parle d'un « empire » d'entrepreneurs connectés, « comme dans les jeux vidéo », où l'argent rentre (affirmé, 6,8-12,2 s). Il filme ensuite un ami qui découvre l'outil la nuit (14,2-19,3 s), puis montre un calendrier fiscal (échéances de TVA, 19,3-24,9 s) et une place de projets à rejoindre (25,0-28,1 s), avant le « lien en bio ». C'est le débit le plus rapide du thème (5,20 mots/s), avec un mot à la fois à l'écran, des pastilles de contexte qui changent et des filés flous en raccord. Pour Presti, seule la grammaire d'accroche se reprend : le monde 3D du produit en héros, les mots seuls et la caméra qui avance. Le tournage (écran filmé, visages, promesses d'argent) est hors charte.",
  "outils_mentions": [
    "Blitz, la plateforme de l'auteur : accueil en ville 3D isométrique (0,0-10,1 s), bâtiments « Blitz Club » (4,5 s)",
    "Calendrier fiscal de Blitz : TVA (déclaration CA3), acompte d'IS, taxe foncière (19,3-24,9 s ; images à 21,0 et 23,0 s)",
    "impots.gouv.fr, lien affiché à côté de chaque échéance (23,0 s)",
    "BlitzConnect : compteurs de la page, bouton « Publier un projet », vignettes de projets (25,8 et 27,5 s)"
  ],
  "workflows_decrits": [
    "Pas de tutoriel : un parcours produit montré dans cet ordre. D'abord l'accueil 3D (0,0-10,1 s). Puis le calendrier fiscal : clic sur la carte, puis liste des échéances avec le lien officiel (21,0 puis 23,0 s). Enfin la place de projets à publier ou à rejoindre (24,9-28,1 s).",
    "Promesse de présence en direct : le soir, tous les connectés seraient visibles en direct (15,7-19,3 s, affirmé, sans démonstration claire à l'écran)."
  ],
  "strategies": [
    "Le produit d'abord : l'accueil 3D occupe l'image dès la 1re seconde, la caméra avance vers lui jusqu'à la coupe de 3,6 s, et la voix commente.",
    "Mots seuls en capitales, au rythme de la voix (5,20 mots/s), ponctuation gardée (« BLITZ, », « D'EMPIRE. »).",
    "Une pastille de contexte par séquence, qui ajoute une promesse à l'image : connecter des entrepreneurs (0-2,9 s), investir dans les projets des autres (5,8-10,1 s), projets réels (10,1-12,2 s), découverte par un ami (14,2-≈17 s), échanger et progresser (19,3-≈28,3 s), lien en bio (≈32,2 s).",
    "Métaphore du jeu vidéo pour rendre le logiciel désirable (6,8-9,1 s).",
    "Preuve sociale filmée : un ami découvre l'outil la nuit (14,2-19,3 s).",
    "Récit d'une communauté qui démarre (« l'empire, il commence », 30,0-33,1 s), puis renvoi au lien en bio."
  ],
  "erreurs_a_eviter": [
    "Écran filmé au téléphone, flou et instable (illisible de 10,1 à 14,2 s). Benj a jugé « ultra nul » l'écran filmé simulé (19/10) et a refusé le film CRM v2 construit sur des captures réelles (20/10).",
    "Promesses d'argent invérifiables : « on fait de l'argent », « de l'argent qui rentre » (9,1-12,2 s, affirmé, sans chiffre), et pastille sur l'investissement dans les projets des autres (5,8-10,1 s).",
    "Visages réels et témoignage filmé (l'ami de 14,2 à 19,3 s ; l'auteur vers 29-31 s) : interdits dans les films Presti.",
    "Un émoji dans chaque pastille et des marques tierces lisibles sur les vignettes de projets (25,8-27,5 s).",
    "Compteurs à zéro laissés à l'écran (« Vues de ta page 0 », « Demandes reçues 0 », 25,8 s) : ils affaiblissent la preuve.",
    "Promesse fiscale « de A à Z » (19,3-24,9 s) : Presti ne fait aucune déclaration (« Déclaration URSSAF / impôts » est hors périmètre, cadrage P3 §4.1). Ne jamais la reprendre.",
    "Première action produit lisible (le clic sur « Calendrier fiscal ») seulement à 21,0 s : 20 s d'ambiance avant un geste que le spectateur peut suivre."
  ],
  "hooks_accroches": [
    "0,0-3,6 s : « regardez juste l'accueil de Blitz » sur la ville 3D, un mot à la fois à l'écran, pastille « On va connecter tellement d'entrepreneurs ».",
    "6,8-9,1 s : « c'est comme dans les jeux vidéo », sauf qu'ici on travaille.",
    "14,2-≈17 s : pastille « … découvre Blitz pour la 1ère fois » sur la réaction d'un ami."
  ],
  "formats_contenu": [
    "Vlog 9:16 de 33 s filmé au téléphone, voix française enthousiaste, 5,20 mots/s, 10 coupes.",
    "Écran réel filmé (moniteur de bureau le jour, portable la nuit), rue de nuit, selfie final.",
    "Sous-titres d'un seul mot, en capitales blanches grasses, au centre-bas.",
    "Pastille noire en haut, phrase courte et émoji, qui change à chaque séquence (six au total).",
    "Raccords en filés flous de caméra (10,1-14,2 s)."
  ],
  "applicabilite_chantiers": {
    "cerveau_obsidian": {
      "pertinent": true,
      "actions": [
        "Par une tâche de périmètre SaaS/wiki/…, ajouter la vidéo à « Références de Benj et ce qu'elles enseignent ». Ce qu'elle enseigne : le produit 3D en héros dès 0 s, un mot à la fois, une caméra qui avance. Ce qu'il ne faut pas reprendre : l'écran filmé flou, les visages, les promesses d'argent.",
        "Signaler une lacune dans le cadrage du 01/11. Le défaut proposé à la question V1 (cadrage-00-synthese : « une vraie capture de la plateforme est permise ») oublie le refus du 20/10 : le film CRM v2, construit sur des captures réelles, a été refusé (« c'est des animations de la fonctionnalité qu'il faut faire »). La seule forme « ordinateur filmé » saluée par Benj montrait une animation à l'écran (@tonytuyisenge, 07/10 et 11/10). À trancher par Benj avec ces deux précédents.",
        "Corriger la §10 d'ANALYSE-TIKTOK.md : (1) le calendrier fiscal n'existe pas côté artisan et sort du périmètre de l'assistant (cadrage P3 §4.1) ; (2) la structure décrite oublie la place de projets (24,9-28,1 s) et la pastille sur l'investissement (5,8-10,1 s) ; (3) il y a six pastilles, pas une."
      ]
    },
    "landing": {
      "pertinent": true,
      "actions": [
        "Pour la refonte P4, proposer comme premier écran l'atelier 3D vivant, l'objet réel du produit, à la place de l'anneau WebGL ObjetVivant (app/page.tsx:179). Une boucle muette courte, rendue depuis le moteur crm-v3, avec une caméra qui avance comme à 0-3,6 s ; une image fixe s'affiche en attendant, pour ne pas dégrader le LCP. Mention « Exemple » si des chantiers fictifs sont lisibles. Valider par Lighthouse avant tout push."
      ]
    },
    "prospection": {
      "pertinent": false,
      "actions": []
    },
    "presti_assistant": {
      "pertinent": true,
      "actions": [
        "Poser à Benj une question à options (.orchestre/en-cours/<id>.question.md) sur le calendrier fiscal vu à 19,3-24,9 s. Option 1 : le laisser hors périmètre, comme le prévoit le cadrage P3 §4.1. Option 2 : un détecteur de niveau 1 qui rappelle seulement la date d'une échéance de TVA et le lien impots.gouv.fr, sans montant ni dépôt, et qui ignore les artisans en franchise (l'assistant connaît déjà la franchise 293 B, lib/assistant/outils-actions.ts:132)."
      ]
    },
    "contenu_videos": {
      "pertinent": true,
      "actions": [
        "Accroche de 3,5 s : l'atelier vivant en plein cadre dès la 1re image, une caméra qui avance sans arrêt vers lui, un mot à la fois en capitales Bricolage Grotesque 700, voix Fish à 3,3 mots/s ou plus (référence : 5,20). Rendu Three.js depuis videos/crm-v3, jamais filmé sur un écran.",
        "Raccords : remplacer les filés flous filmés (10,1-14,2 s) par des vols de caméra 3D d'un bâtiment à l'autre. Le moteur crm-v3 a déjà des vols de 0,95 s entre les plans (passe 7 du 20/10), qui gardent l'image lisible.",
        "Pastille de contexte en haut, avec une phrase-fait sourcée par séquence (par exemple la relance des factures échues à J+3, J+10 et J+21, lib/aide.ts:232). En corail, sans émoji, et qui change à chaque coupe, comme les six pastilles de yova2n."
      ]
    }
  },
  "priorite": "moyenne",
  "sources_timestampes": [
    "0,0-3,6 s (images d'accroche ; coupe à 3,57 s) : moniteur de bureau montrant une ville 3D isométrique au bord de la mer, avec un message d'accueil personnalisé en haut de l'interface. La caméra avance vers l'écran ; pastille « On va connecter tellement d'entrepreneurs » ; mots seuls LES, REGARDEZ, JUSTE, L'ACCUEIL, BLITZ, POINT.",
    "0,0-6,8 s (transcription) : regarder l'accueil, une « espèce d'empire » où tout le monde est connecté. Le « jusqu'à » de la transcription est « juste » d'après les mots à l'écran.",
    "4,5 s (image extraite) : gros plan de l'écran, tour « Blitz » et bâtiments « Blitz Club », mot « D'EMPIRE. », pas de pastille.",
    "5,8-10,1 s (coupes ; planche ≈6,8 et ≈8,8 s) : la tour en plus gros, pastille sur l'investissement dans les projets des autres.",
    "6,8-12,2 s (transcription) : comme dans les jeux vidéo, mais on bosse et l'argent rentre (affirmé).",
    "10,1-14,2 s (coupes ; image 11,0 s ; planche ≈10,7 et ≈12,7 s) : bureau en mouvement puis écran, image filée et floue, pastille « Que des projets réels ».",
    "14,2-19,3 s (coupes ; image 15,5 s ; planche ≈14,6 et ≈18,5 s) : nuit, portable ouvert sur l'accueil 3D, un ami de profil dans la rue (pastille « … découvre Blitz pour la 1ère fois »), main sur le pavé tactile.",
    "19,3-24,9 s (transcription) : calendrier fiscal, déclarations de TVA, accompagnement « de A à Z ».",
    "21,0 s (image) : tableau de bord clair, carte « Calendrier fiscal » sous le curseur, liste « Mes notes & à-faire ».",
    "23,0 s (image) : liste d'échéances (TVA, déclaration CA3 ; IS, acompte trimestriel ; taxe foncière) avec lien impots.gouv.fr, bandeau vert « Tu es à jour ».",
    "24,9-27,0 s (transcription), 25,8 et 27,5 s (images) : BlitzConnect, avec « Vues de ta page 0 », « Demandes reçues 0 », bouton « Publier un projet », vignettes de projets de marques.",
    "28,1 s (coupe) puis 30,0 s (image) : interface sombre sur le portable, puis selfie de l'auteur dans la rue ; 30,0-33,1 s (transcription) : « l'empire, il commence ».",
    "≈32,2 s (planche) : pastille « Lien en bio » sur une image floue.",
    "Coupes au-dessus de 0,3 (ffmpeg) : 3,6 · 5,8 · 10,1 · 12,2 · 14,2 · 14,8 · 19,3 · 25,0 · 26,4 · 28,1 s.",
    "Débit : 172 mots pour 33,1 s parlées, soit 5,20 mots/s (transcription bruitée : c'est un ordre de grandeur)."
  ]
}
```

### Contenu automatisé : carrousels et pubs statiques (2 vidéos)

#### Carrousels automatisés par un agent IA (Hermes Agent) : un carrousel BTP rendu en code et publié sur Instagram — priorité haute

```json
{
  "video_id": "ghoost.000-7692934139833568544",
  "source": "tiktok",
  "titre": "Carrousels automatisés par un agent IA (Hermes Agent) : un carrousel BTP rendu en code et publié sur Instagram",
  "duree": "67,77 s (ffprobe 67,766667 s), 720×1280, 30 i/s ; 3 coupes à 9,33 / 13,40 / 21,37 s",
  "resume": "Face caméra (0-9,33 s puis 21,37-67,77 s), le créateur affirme que son agent Hermes a fabriqué seul et entièrement un carrousel (0,1-9,1 s ; 13,5-21,3 s), en code et non en image générée (21,3-24,9 s). Selon lui, cela évite la mention IA sur Instagram (26,3-29,3 s), et l'agent publie désormais seul ses carrousels sur Instagram (29,5-39,9 s). La seule preuve est un insert de 12 s d'écran de MacBook filmé (9,33-21,37 s) : l'application Hermes et ses sessions (10 s), puis le post final intégré dans le fil de l'agent, 7 diapositives pour artisans du BTP, publiées sur un compte atelier.btp à 7 abonnés (13,4-21,3 s). La fin annonce une vidéo YouTube (53,9-63,1 s) et une reprise possible sur TikTok (63,1-67,7 s). La vraie matière est le carrousel. Sa grammaire a déjà été décomposée le 30/10 (references/ref-2026-10-30-tiktok-carrousel-inventaire/DECOMPOSITION.md) et transposée en carrousel Inventaire (presti-ops/publication/2026-10-30-inventaire-carrousel), sans verdict de Benj consigné. C'est aussi la référence carrousel par défaut de cadrage-p2 (question 2).",
  "outils_mentions": [
    "Hermes Agent : dit (5,9-9,1 s ; 32,9-39,9 s), écrit dans le titre incrusté (0-67,8 s), application nommée Hermes dans la barre de menus avec les sessions Atelier Marketing, Hermes, Marketing, Atelier setup, Atelier (10 s). C'est un outil de l'architecture imposée de Presti : installé sur le PC en v0.21.5, branchement MCP à faire (presti/CLAUDE.md, relevé du 01/11).",
    "Instagram : publication automatique affirmée (29,5-39,9 s) ; post atelier.btp intégré dans le fil de l'agent (13,4-21,3 s).",
    "Canva (transcrit « Conva ») : cité comme la méthode lente (42,3-44,7 s).",
    "YouTube (« la plateforme rouge ») : miniature montrée par erreur (9,33-13,40 s), vidéo annoncée (53,9-63,1 s).",
    "TikTok : reprise des mêmes carrousels (63,1-66,3 s).",
    "Rendu « en code » : dit (21,3-24,9 s ; 44,7-49,1 s), jamais montré. La décomposition du 30/10 parle de HTML/CSS, mais cette transcription ne le dit pas."
  ],
  "workflows_decrits": [
    "Sujet → agent Hermes → carrousel rendu en code → post Instagram : affirmé (13,5-21,3 s ; 29,5-39,9 s). À l'écran on ne voit que le résultat : un aperçu de session qui annonce une publication (10 s) et le post intégré (13,4-21,3 s). Le fil signale encore 40 messages sous le post (13,8 s) : une fabrication en une seule commande n'est pas démontrée.",
    "L'agent présente son livrable image en deux tailles, haute résolution et aperçu (10 s).",
    "On peut ajouter des images au carrousel (49,1-53,9 s, dit).",
    "Le même carrousel peut être republié sur TikTok ou ailleurs (63,1-67,7 s, dit)."
  ],
  "strategies": [
    "Rendre en code plutôt qu'en image générée (21,3-24,9 s) : texte net, même charte d'une diapositive à l'autre, correction par simple changement de texte. C'est déjà le défaut de Presti (cadrage-p2 Q7 : aucune image générée par IA en phases 1 à 5).",
    "Récit en 7 diapositives, environ 1,1 s chacune à l'écran (13,4-21,3 s). 1/7 : deux constats de fin de chantier, puis une question sur le gain réel (13,8 s). 2/7 : idée reçue cassée en deux cartes, ce que voit le client face à ce qui reste (15,2-16,0 s). 3/7 : formule en arbre de cinq cases numérotées (16,4-17,2 s). 4/7 : exemple chiffré avec tableau de répartition (17,6 s). 5/7 : trois questions numérotées avant le prochain devis (18,1 s). 6/7 : écran produit de rentabilité avec jauges verte et rouge (19,1 s). 7/7 : essai sans carte bancaire et pilule « lien dans la bio » (20,1 s).",
    "Grammaire constante (13,8 ; 17,6 ; 18,1 ; 20,1 s) : marque en capitales espacées en haut à gauche, compteur n/7 en haut à droite, titre sur deux lignes dont la chute passe en orange, une ligne grise d'explication, un seul bloc visuel, points de pagination en bas.",
    "Démonstration sur une niche crédible : un produit BTP fictif (Atelier Pro) publié sur un compte à 7 abonnés (13,8 s) dont les sessions Hermes portent le même nom (10 s). C'est très probablement un compte de démonstration du créateur.",
    "Entonnoir du court vers le long : le TikTok renvoie vers une vidéo YouTube complète (53,9-63,1 s)."
  ],
  "erreurs_a_eviter": [
    "Récompense tardive : rien de concret avant 13,4 s, et un détour par la mauvaise image (9,1-13,5 s).",
    "Titre incrusté permanent posé sur la démonstration : il masque le haut des diapositives (13,8 s ; 17,6 s).",
    "Débit de 2,66 mots/s (179 mots pour 67,4 s parlées), sous le seuil de 3,3 de Benj. Le segment 13,5-21,3 s ne porte que 11 mots pendant que le carrousel défile.",
    "82 % de face caméra (0-9,33 s et 21,37-67,77 s), dont 46,4 s sans aucun visuel après la démonstration. S'y ajoutent un visage réel, des logos de marques de sport visibles sur toute la face caméra et un écran filmé sur fond bleu (9,33-21,37 s) : quatre interdits de la charte Presti.",
    "Se servir du rendu en code pour échapper à la mention IA (26,3-29,3 s) : c'est contraire à la règle de Presti, qui veut qu'un texte écrit par une IA soit signalé comme tel (docs/marketing/plateformes/README.md ; vault, wiki « Règles de publication vidéo »).",
    "Affirmé, non vérifiable : le code irait quinze fois plus vite que Canva (44,7-49,1 s) ; l'agent publierait seul (29,5-39,9 s). Seul le résultat est montré.",
    "Chiffres d'exemple sans aucune mention : la diapositive 4/7 donne CA, coûts, marge et pourcentage sans libellé d'exemple (17,6 s). Chez Presti, toute donnée fictive porte « Exemple fictif » (docs/presti/tiktok/carrousels-2026-10-10/legendes.md).",
    "Marge complète (CA moins matière, main-d'œuvre et dépenses, 16,4-17,6 s) : Presti ne calcule qu'une marge sur matériaux, estimée, qui n'est pas un bénéfice (lib/crm/chantier.ts:58-61 ; app/crm/Indicateurs.tsx:29). Ne pas transposer ces diapositives telles quelles."
  ],
  "hooks_accroches": [
    "Titre incrusté de 0 à 67,8 s qui promet d'automatiser ses carrousels avec des agents IA, Hermes nommé entre parenthèses : la promesse est écrite, la voix ne la dit pas.",
    "Voix d'ouverture (0,1-9,1 s) : il annonce quelque chose que l'IA a fait entièrement, sans montrer l'objet. Accroche faible.",
    "Miniature YouTube (10 s) : opposition « pas une image / un carrousel » à côté d'un logo Instagram.",
    "Diapositive 1/7 (13,8 s) : deux constats très courts de fin de chantier, puis une question sur le gain réel dont la chute est en orange, sous une petite étiquette de rubrique."
  ],
  "formats_contenu": [
    "TikTok vertical 9:16 face caméra, avec un insert d'écran d'ordinateur filmé (9,33-21,37 s).",
    "Carrousel Instagram de 7 diapositives, au format ≈4:5 d'après le post intégré (13,8 s ; 1080×1350 selon la décomposition du 30/10), fond nuit, accent orange.",
    "Miniature YouTube (10 s).",
    "Renvoi vers une vidéo YouTube longue (53,9-63,1 s)."
  ],
  "applicabilite_chantiers": {
    "cerveau_obsidian": {
      "pertinent": true,
      "actions": [
        "Par une tâche de périmètre SaaS/…, corriger la fiche de la référence du 30/10 (references/ref-2026-10-30-tiktok-carrousel-inventaire/DECOMPOSITION.md) avec ce que montre ce fichier. La diapositive chiffrée n'a pas de libellé d'exemple (17,6 s). atelier.btp a 7 abonnés et les sessions Hermes s'appellent Atelier (10 ; 13,8 s) : c'est probablement un compte de démonstration, pas un concurrent. Fabrication et publication sont affirmées, jamais montrées. Ce téléchargement dure 67,77 s en 720×1280.",
        "Écrire dans le vault la note « Gabarit carrousel 7 diapositives » : les archétypes de 13,8-20,1 s et les règles Presti (chute en corail #D97757, « Exemple fictif » sur toute valeur, marge toujours dite « sur matériaux, estimée », dernière diapositive sur l'essai gratuit sans carte, légende qui dit que l'IA a rédigé). Hermes la lit par le MCP cerveau avant chaque carrousel. Y consigner le verdict de Benj sur le carrousel Inventaire du 30/10, absent à ce jour (cadrage-p2 §1.2)."
      ]
    },
    "landing": {
      "pertinent": true,
      "actions": [
        "La diapositive 6/7 (19,1 s) apporte sa preuve par un écran produit. Presti a l'équivalent réel : la case « Marge sur matériaux, estimée » (app/crm/Indicateurs.tsx:29), déjà en vitrine (app/DemoSequence.tsx:37, scène 8 « Avec Signature »). Le titre de cette scène promet « combien il vous rapporte » : l'aligner sur le libellé prudent de l'écran, puisque lib/crm/chantier.ts:58-61 dit que ce n'est pas un bénéfice.",
        "Clore la landing (app/page.tsx) sur l'enchaînement des diapositives 5 à 7 (18,1-20,1 s) : trois questions que l'artisan se pose le soir, l'écran Presti qui y répond, puis « essai gratuit, sans carte bancaire ». C'est vrai chez Presti (lib/essaiGratuit.ts:5-8) ; ne pas citer de durée, elle dépend de l'offre (lib/plans.ts:108)."
      ]
    },
    "prospection": {
      "pertinent": false,
      "actions": []
    },
    "presti_assistant": {
      "pertinent": true,
      "actions": [
        "La question de la diapositive 1/7 (13,8 s) est une question d'artisan à laquelle l'assistant ne sait pas répondre. Son outil lire_chantiers (lib/assistant/crm.ts:98-136) ne calcule qu'avancement et retard et passe materiaux: [] (l.111), alors que la vue CRM porte déjà les indicateurs de chaque chantier (lib/crm/vue.ts:144-145). Ajouter à lire_chantiers la marge sur matériaux tirée de indicateurs() (lib/crm/chantier.ts:73-95), toujours dite estimée et signalée partielle si des sorties n'ont pas de prix (l.58-61), pour répondre à « combien j'ai gagné sur ce chantier ? ». Développement par Claude Code, avec un cas d'évaluation (skill presti-ai-lab).",
        "Transposer la jauge d'alerte de la diapositive 6/7 (19,1 s) : l'assistant prévient quand la marge sur matériaux estimée d'un chantier passe sous un seuil fixé par l'artisan. C'est un nouveau réglage, à décider avec Benj avant tout code."
      ]
    },
    "contenu_videos": {
      "pertinent": true,
      "actions": [
        "Faire un seul moteur de carrousel (gabarit HTML 1080×1350 avec les 7 archétypes de 13,8-20,1 s) à la place des generer.js réécrits à chaque carrousel (presti-ops/publication/2026-10-27-midi, 2026-10-29-midi, 2026-10-30-inventaire-carrousel ; cadrage-p2 §1.2). Charte : fond #0A0C11 ; chute en corail #D97757 là où la référence met de l'orange ; vert #38CD8C réservé à « validé » (la référence l'emploie pour « au budget », 19,1 s) ; Bricolage Grotesque 700 ; compteur n/7 ; mention « Exemple fictif » ajoutée d'office à toute valeur chiffrée. Travail de Claude Code.",
        "Monter le premier workflow métier du n8n d'Oracle, qui n'en a aucun aujourd'hui (presti/CLAUDE.md). Enchaînement : déclencheur aux créneaux de presti-ligne-editoriale (12 h 15, 18 h 15) → Hermes Agent, sous Orca, rédige les 7 textes à partir des faits prouvés de lib/crieur/faits.ts et des douleurs du vault (MCP) → le nœud HTML (generateHtmlTemplate) remplit le gabarit → Playwright rend le PNG, faute de nœud natif gratuit (à installer et vérifier dans le bac à sable d'Oracle) → le nœud Supabase écrit le post dans contenu_posts au statut en_attente → le nœud Slack sendAndWait poste la planche dans #presti-auto. On ne publie qu'après le oui de Benj sur la version exacte (lib/contenu/accord.ts : empreinteVersion l.34, verdictAccord l.114). Cela remplace la phase « Publier » de post-du-jour.js (l.102), qui n'attend personne, comme le propose cadrage-p2 Q1 par défaut.",
        "Ne pas prendre la vidéo elle-même comme référence de film (face caméra, écran filmé, 2,66 mots/s, titre posé sur la démonstration) : seule la grammaire du carrousel sert."
      ]
    }
  },
  "priorite": "haute",
  "sources_timestampes": [
    "Transcription (C:/Users/benja/Documents/presti/videos/references-2026-11-01/tiktok/ghoost.000-7692934139833568544.transcription.txt), 0,1-9,1 s : annonce d'un contenu fait entièrement par l'IA, dans son Hermes Agent.",
    "Transcription 9,1-13,5 s : la miniature YouTube n'était pas ce qu'il voulait montrer.",
    "Transcription 13,5-21,3 s : le carrousel fait par l'IA (11 mots en 7,8 s).",
    "Transcription 21,3-29,3 s : du code et pas des images générées, donc pas de mention IA à la publication.",
    "Transcription 29,5-39,9 s : l'agent poste seul des carrousels sur son Instagram.",
    "Transcription 39,9-49,1 s : beaucoup passent du temps sur Canva, alors que le code irait quinze fois plus vite (affirmé).",
    "Transcription 49,1-67,7 s : images ajoutables, vidéo YouTube à venir, reprise sur TikTok.",
    "Images extraites dans C:/Users/benja/AppData/Local/Temp/claude/C--Users-benja-Documents-presti/b6e06ae6-7abe-49a0-baf6-ddf3a2f1d6b7/scratchpad/images-tiktok/. ghoost.000-7692934139833568544-10.jpg : application Hermes, sessions, livrable haute résolution et aperçu. -13.8.jpg : post atelier.btp, 7 abonnés, diapositive 1/7, 40 messages plus bas. -14.4a17.jpg : diapositives 1/7, 2/7 (15,2-16,0 s) et 3/7 (16,4-16,8 s). -17.2.jpg : arbre de la 3/7. -17.6a21.jpg : 4/7 à 17,6 s sans libellé d'exemple, 5/7 à 18,1 s, 6/7 à 19,1 s, 7/7 à 20,1 s.",
    "Accroche 0-3 s (images-tiktok/ghoost.000-7692934139833568544.hook.jpg) : face caméra, casquette, micro-cravate, titre incrusté sur deux lignes.",
    "Planche (tiktok/ghoost.000-7692934139833568544.planche.jpg) : face caméra sur toutes les images, hors de l'insert 10-20 s.",
    "Mesures : ffprobe 67,766667 s, 720×1280, 30 i/s. ffmpeg scene>0,3 : coupes à 9,33 / 13,40 / 21,37 s. freezedetect (n=0,003, ≥ 1 s) : aucune image figée. Débit : 179 mots / 67,4 s parlées = 2,66 mots/s.",
    "Code Presti lu : lib/crm/chantier.ts:58-95, app/crm/Indicateurs.tsx:29, app/DemoSequence.tsx:37, lib/assistant/crm.ts:98-136, lib/crm/vue.ts:144-145, lib/essaiGratuit.ts:5-8, lib/plans.ts:108, .claude/workflows/post-du-jour.js:78 et :102, lib/contenu/accord.ts:34 et :114. Nœuds n8n vérifiés par search_nodes : Slack message.sendAndWait, HTML generateHtmlTemplate, Supabase row ; aucun nœud natif HTML vers image.",
    "Corrections de ANALYSE-TIKTOK.md. (a) La diapositive chiffrée n'est pas marquée « Exemple » (17,6 s) : c'est la transposition Presti du 30/10 qui ajoute « Exemple fictif ». (b) Le débit est de 2,66 mots/s et non 2,72, et le segment 13,5-21,3 s compte 11 mots, pas 8. (c) atelier.btp (7 abonnés, 13,8 s) est très probablement un compte de démonstration, pas un concurrent à surveiller. (d) Hermes Agent n'est plus un outil extérieur non vérifié, c'est l'outil d'orchestration imposé le 01/11. (e) La publication automatique que Presti a « déjà » tourne hors de n8n et sans l'accord de Benj (post-du-jour.js:102) : il reste à la migrer. (f) Ce carrousel n'est pas une idée neuve : il a été décomposé et transposé le 30/10.",
    "Correction de la décomposition du 30/10 : la transcription ne nomme ni LinkedIn ni Facebook (63,1-67,7 s : TikTok, ou ailleurs)."
  ]
}
```

#### 40 pubs statiques générées à partir d'une photo produit, avec un tri cocher / écarter / régénérer — priorité moyenne

```json
{
  "video_id": "sambutlerai-7682094375119146272",
  "source": "tiktok",
  "titre": "40 pubs statiques générées à partir d'une photo produit, avec un tri cocher / écarter / régénérer",
  "duree": "42,31 s (ffprobe 42,305011 s), 1080×1920, 30 i/s ; 0 coupe (scene>0,3)",
  "resume": "En écran partagé (canevas à nœuds en haut, le créateur face caméra en bas, sous-titres mot à mot), il présente un graphe qu'il dit avoir facturé 2 000 $ (0,0-4,0 s, affirmé). La photo d'un produit d'exemple, un sérum dentaire d'une marque tierce, alimente par des dizaines de fils des blocs de consignes réécrites pour ce produit (6 s), puis des nœuds de génération d'image (18 s). Il en sort des pubs statiques de styles très différents : pâte à modeler, SMS, tweet, « fondateur », anti-pub (12,1-23,2 s), question, liste de signes, zéro étoile, coupon (29,5-37,5 s). Un second nœud décline chaque pub en 9:16 (18 s ; 35 s). Il dit qu'un clic régénère 40 nouvelles pubs (23,2-30,2 s), qu'on écarte celles qu'on ne veut plus revoir et qu'on coche celles qui doivent inspirer la suite (30,2-38,4 s). Ces gestes ne sont jamais montrés (29,5-37,5 s). Fin : lui écrire en message privé pour avoir le même système (38,4-42,7 s).",
  "outils_mentions": [
    "Canevas à nœuds non identifié (0-42,3 s), avec des fils jaunes et verts entre les nœuds (6 s).",
    "Modèle d'image étiqueté « GPT IMAGE 2 » sur les nœuds de génération, qui ont pour entrées PROMPT et IMAGE 1/5 (18 s).",
    "Nœuds qui convertissent chaque pub en format vertical 9:16 (18 s ; 35 s).",
    "Produit d'exemple : sérum dentaire hismile V34, d'une marque tierce (6 s ; 35 s).",
    "Messages privés comme canal de vente du système (38,4-42,7 s)."
  ],
  "workflows_decrits": [
    "Entrée unique : une photo de produit (4,0-6,7 s ; image 6 s), reliée par des dizaines de fils à des blocs de texte présentés comme des consignes réécrites pour ce produit (6 s).",
    "Génération : chaque consigne entre avec l'image du produit dans un nœud d'image (18 s). 40 pubs toutes différentes sont annoncées (9,5-12,1 s), mais on ne peut pas les compter à l'écran.",
    "Déclinaison : un second nœud convertit chaque pub en 9:16 (18 s ; 35 s).",
    "Régénération : un clic redonnerait 40 nouvelles pubs (23,2-30,2 s, dit, non montré).",
    "Sélection : écarter une pub l'empêche de revenir, la cocher oriente les suivantes (30,2-38,4 s, dit ; aucune case ni croix visible entre 29,5 et 37,5 s)."
  ],
  "strategies": [
    "Montrer le volume avant d'expliquer : de 0 à 3 s, le haut de l'écran est un mur de vignettes reliées, et le sous-titre isole le prix du système de 1,5 s à au moins 2,5 s.",
    "Une image-métaphore : un seul objet d'où partent des dizaines de fils en éventail (6 s).",
    "Varier le style plutôt que les mots : une même consigne déclinée dans des formats très différents (12,1-23,2 s ; 29,5-37,5 s).",
    "Réduire le travail humain au tri : cocher, écarter, régénérer (23,2-38,4 s).",
    "Déclinaison 9:16 intégrée au même graphe (18 s ; 35 s).",
    "Rythme : 4,10 mots/s, sous-titres mot à mot, aucune coupe. Le canevas bouge environ les deux tiers du temps, avec 16 tenues de 0,5 s ou plus (13,8 s au total, la plus longue de 27,0 à 28,9 s)."
  ],
  "erreurs_a_eviter": [
    "Chiffre de revenu en accroche : le système aurait été facturé 2 000 $ (0,0-4,0 s). C'est affirmé, invérifiable et interdit dans une pub Presti.",
    "Volume et mécanique affirmés : les 40 pubs toutes différentes (9,5-12,1 s), la régénération (23,2-30,2 s) et le tri cocher / écarter (30,2-38,4 s) ne sont jamais montrés (29,5-37,5 s). Ne pas les citer comme prouvés.",
    "Fausse preuve sociale fabriquée : un « fondateur » au visage photoréaliste sorti d'un nœud d'image et un faux tweet de faux comptes (18 s), une pub « zéro étoile » (31,5 s). C'est contraire à la règle « aucun visage réel » et à l'interdiction des témoignages et notifications inventés.",
    "Coupon de remise (35 s) : ni remise ni prix d'abonnement dans une pub Presti.",
    "Marque tierce en produit d'exemple (6 s ; 35 s) : marques et logos sont interdits dans les pubs Presti.",
    "Génération d'image par IA (18 s) : contraire au défaut de cadrage-p2 Q7 (aucune image générée en phases 1 à 5) et, si le service est payant, à la règle « on ne paie aucun outil » (presti/CLAUDE.md, 01/11).",
    "Forme : face caméra le regard baissé de bout en bout, violet du produit qui domine, bandes noires qui mangent ≈24 % de la hauteur (6 s). Ce n'est pas une référence de film pour Presti."
  ],
  "hooks_accroches": [
    "Ouverture sur un mur de vignettes produit reliées par des fils, avant toute explication (0-3 s).",
    "Prix de vente du système dès la première phrase, isolé en sous-titre mot à mot (0,0-3,0 s).",
    "Image d'une entrée unique qui se ramifie en dizaines de sorties (6 s).",
    "Énumération rapide de styles reconnaissables pendant que le canevas passe de l'un à l'autre (12,1-23,2 s)."
  ],
  "formats_contenu": [
    "TikTok vertical en écran partagé, de haut en bas : ≈11 % de noir, canevas ≈44 %, face caméra ≈32 %, ≈12 % de noir (6 s).",
    "Pubs statiques et leur déclinaison 9:16 (18 s ; 35 s).",
    "Styles d'annonce dits ou vus : pâte à modeler et SMS (13,5-16,4 s), tweet et « fondateur » (16,4-19,1 s ; image 18 s), anti-pub (19,1-21,3 s), question directe (29,5 s), liste de signes (6 s ; 29,5 s), schéma dessiné à la main (30,5 s), zéro étoile (31,5 s), note de téléphone et coupon (35 s)."
  ],
  "applicabilite_chantiers": {
    "cerveau_obsidian": {
      "pertinent": true,
      "actions": [
        "Tenir dans le vault deux notes que Hermes lit par le MCP cerveau avant toute génération. « Variantes écartées » (format, phrase, raison donnée par Benj) garantit qu'une variante barrée ne revient jamais ; « Variantes cochées » sert d'exemples à la génération suivante. C'est la mécanique dite à 30,2-38,4 s, appliquée aux verdicts de Benj. Écriture par une tâche de périmètre SaaS/…, ou en étendant aux refus de Benj la note d'inbox que post-du-jour.js écrit déjà pour les refus du juge (l.98)."
      ]
    },
    "landing": {
      "pertinent": true,
      "actions": [
        "Section « automatique » de la landing (app/page.tsx) : reprendre l'image de 6 s avec un seul objet en héros, le message du prospect, d'où partent quatre fils corail vers quatre objets 3D (réponse, devis, relance, facture), sans le jaune ni le vert de la référence. Texte honnête selon l'offre : en Studio tout se prépare et l'artisan valide, en Signature ça part seul."
      ]
    },
    "prospection": {
      "pertinent": true,
      "actions": [
        "Option à soumettre à Benj pour trancher entre « validation humaine avant tout e-mail » et « prospection automatique » (presti/CLAUDE.md, point 4), avec la mécanique de 30,2-38,4 s. Hermes génère une banque d'objets et de premières phrases par métier à partir des faits prouvés (lib/crieur/faits.ts). Benj coche ou barre une fois la planche dans Slack #presti-auto (nœud n8n Slack sendAndWait). Le workflow n8n d'envoi Brevo (300 par jour) ne pioche ensuite que dans les phrases cochées, dans le cadre déjà fixé : un premier message qui présente Presti, la démo de 10 min et l'essai gratuit ; un message par artisan, puis 5 jours. Les phrases barrées vont dans la note « Variantes écartées ». Benj valide des phrases, pas chaque e-mail."
      ]
    },
    "presti_assistant": {
      "pertinent": true,
      "actions": [
        "Mémoire des refus : une carte écartée par l'artisan passe au statut refusee (lib/assistant/confirmation.ts:131), mais rien d'autre dans lib/assistant ne lit ce statut (grep : seulement sa définition, cartes.ts:15). Vérifier si l'historique passé au modèle (lib/assistant/boucle.ts:101-104, historique de l'écran) contient ces refus. Sinon, y joindre les dernières cartes écartées (type d'action, client) pour que l'assistant ne repropose pas la même chose : c'est la règle « écartée, elle ne revient pas » de 30,2-34,1 s."
      ]
    },
    "contenu_videos": {
      "pertinent": true,
      "actions": [
        "Ajouter l'étape qui manque : selon cadrage-p2 §0.2, pub-10-sur-10.js et post-du-jour.js ne s'arrêtent jamais pour demander l'avis de Benj avant le rendu complet. Produire 6 à 12 variantes bon marché (accroche de diapositive 1, titre, première image d'un film), rendues en une seule planche numérotée et postées dans Slack #presti-auto (défaut cadrage-p2 Q6). Benj répond par les numéros à garder ou à barrer ; la génération suivante part des variantes gardées (34,1-38,4 s), et les barrées ne reviennent pas (30,2-34,1 s). Le tout dans un workflow n8n, avec Hermes pour générer et contenu_posts pour les versions.",
        "Déclinaison 9:16 systématique (18 s ; 35 s), mais sans IA : le même gabarit HTML rendu une seconde fois en 1080×1920 pour TikTok et les stories.",
        "Formats à garder, en version honnête : liste de signes concrets (6 s ; 29,5 s), question directe (29,5 s), schéma dessiné (30,5 s), et la capture de note remplacée par une capture du vrai écran Presti marquée « Exemple fictif » (35 s). À exclure : faux tweet et « fondateur » au visage généré (18 s), zéro étoile (31,5 s), coupon (35 s)."
      ]
    }
  },
  "priorite": "moyenne",
  "sources_timestampes": [
    "Transcription (C:/Users/benja/Documents/presti/videos/references-2026-11-01/tiktok/sambutlerai-7682094375119146272.transcription.txt), 0,0-4,0 s : système facturé 2 000 $ (affirmé).",
    "Transcription 4,0-12,1 s : produit d'exemple ; des pubs statiques, 40 toutes différentes (affirmé).",
    "Transcription 12,1-23,2 s : formats pâte à modeler, SMS, tweet, fondateurs, anti-pub.",
    "Transcription 23,2-30,2 s : régénérer donne 40 nouvelles pubs.",
    "Transcription 30,2-34,1 s : écarter une pub pour qu'elle ne revienne pas ; 34,1-38,4 s : cocher pour en générer de semblables.",
    "Transcription 38,4-42,7 s : appel à lui envoyer un message.",
    "Accroche 0-3 s (images-tiktok/sambutlerai-7682094375119146272.hook.jpg) : mur de vignettes, face caméra, sous-titres mot à mot, prix isolé sur les images de 1,5 / 2,0 / 2,5 s.",
    "Images extraites dans C:/Users/benja/AppData/Local/Temp/claude/C--Users-benja-Documents-presti/b6e06ae6-7abe-49a0-baf6-ddf3a2f1d6b7/scratchpad/images-tiktok/. sambutlerai-7682094375119146272-6.jpg : photo produit, éventail de fils vers les consignes, sorties « liste de signes » et coupon, disposition de l'écran. -18.jpg : nœuds GPT IMAGE 2 avec entrées PROMPT et IMAGE 1/5, « fondateur » photoréaliste, faux tweet, colonne de conversion 9:16. -29a38.jpg : canevas de 29,5 à 37,5 s (question, schéma dessiné, zéro étoile, note, coupon), aucune case ni croix. -35.jpg : note de téléphone, coupon, conversion 9:16.",
    "Planche (tiktok/sambutlerai-7682094375119146272.planche.jpg) : écran partagé et sous-titres mot à mot sur toute la durée.",
    "Mesures : ffprobe 42,305011 s, 1080×1920, 30 i/s. scene>0,3 : 0 coupe. freezedetect sur la zone du canevas (n=0,003, ≥ 0,5 s) : 16 tenues, 13,8 s au total (33 %), la plus longue de 27,0 à 28,9 s. Débit : 175 mots / 42,7 s = 4,10 mots/s.",
    "Corrections de ANALYSE-TIKTOK.md. (a) Le canevas ne bouge pas sans arrêt : 16 tenues, 13,8 s sur 42,3 s. (b) L'éventail de 6 s part de la photo produit vers des blocs de consignes, pas directement vers 40 pubs, et ses fils ne se comptent pas. (c) Cocher, écarter et régénérer sont dits, jamais montrés. (d) Ajouts : déclinaison 9:16 par un second nœud (18 s ; 35 s), nœuds étiquetés GPT IMAGE 2 (18 s), canevas sur ≈44 % de la hauteur entre deux bandes noires (6 s).",
    "Code et cadrage Presti lus : lib/assistant/confirmation.ts:131, lib/assistant/cartes.ts:15, lib/assistant/boucle.ts:101-104, .claude/workflows/post-du-jour.js:98, presti/plans/011-cadrage-01-11/cadrage-p2.md (§0.2, Q6, Q7), presti/CLAUDE.md (architecture imposée, point 4)."
  ]
}
```

### Second cerveau : Obsidian, Anki, NotebookLM et IA (1 vidéo)

#### metakaihos : l'appli de notes « tout-en-un » à imaginer, sur un graphe planétaire (7,7 s, sans parole) — priorité moyenne

```json
{
  "video_id": "metakaihos-7701671513002429729",
  "source": "tiktok",
  "titre": "metakaihos : l'appli de notes « tout-en-un » à imaginer, sur un graphe planétaire (7,7 s, sans parole)",
  "duree": "7,7 s (ffprobe : 7,707 s ; piste vidéo 7,700 s = 462 images à 60 i/s ; 1080×1920 HEVC ; audio AAC 44,1 kHz stéréo)",
  "resume": "Teaser muet de 7,7 s. Un téléphone tenu à la main filme, dans une pièce sombre, l'écran d'un portable à clavier AZERTY. Une appli de notes y tourne en vue « Planetary » : un graphe circulaire de centaines de points et des amas étiquetés par thème ou par auteur (Robert Greene, Alex Hormozi, Économie, Prompts, PKM & LLM Wiki…). Chaque amas a ses compteurs « notes · îlots · lune · à relier ». En haut, une barre « 0 dues · 3 objectifs du jour → » ; en bas, une barre « Opus 5.5 Extra » avec une icône de chargement. Par-dessus, un texte anglais fixe de 5 lignes invite à imaginer une appli qui réunirait Obsidian, « Jev » (non identifié), Anki, NotebookLM et une IA ; l'interface, elle, est en français. Pas de parole (transcription vide), musique continue, un seul plan sans coupe. Un seul événement visuel : la caméra s'approche de 1,1 à 1,7 s pendant qu'un polyèdre rose s'illumine au centre, puis recule à 1,8 s ; ensuite, seules les étiquettes du graphe changent. Trois corrections à l'analyse du matin : ce n'est pas une boucle sans couture, l'écran est animé, et l'idée d'une constellation sur la landing tombe (la direction A est sans WebGL). Pour Presti, la vidéo apporte des motifs d'interface pour le réseau neuronal et l'accueil de la console : santé du réseau, révision espacée, priorités du jour. Elle donne aussi une idée de plan 3D. Ce n'est pas une référence de forme, et elle n'apporte rien à la prospection ni à la landing.",
  "outils_mentions": [
    "Obsidian, « Jev » (non identifié, peut-être une coquille), Anki, NotebookLM, ChatGPT et Claude : nommés dans le texte superposé (0,0-7,7 s)",
    "« Opus 5.5 Extra » : libellé lu dans la barre du bas de l'appli, à côté d'une icône de chargement et du mot « Auto » (3,5 s)",
    "Appli de notes non nommée, vue « Planetary », barre ZOOM FAR · 0 dues · 3 objectifs du jour → · Planetary · Tous les liens · Verrouiller (1,0 s)",
    "Ordinateur portable à clavier AZERTY (touches è, ç, à, §), touches de fonction de type Mac (loupe, micro, lune), menu « Window » en haut à gauche (3,5 s ; 7,5 s)"
  ],
  "workflows_decrits": [
    "Aucun flux de travail n'est expliqué : pas de voix, un seul texte fixe (0,0-7,7 s). Le compte ne dit ni si l'appli existe ni comment l'obtenir.",
    "Flux implicite vu à l'écran, non expliqué : les notes rangées par thème deviennent des amas d'un graphe circulaire, chacun avec ses compteurs. Exemples : Robert Greene 58 notes · 2 îlots · 1 lune · 2 à relier (1,0 s) ; Alex Hormozi 157 notes · 2 îlots · 1 lune · 80 à relier (3,5 s) ; tasks 0 note · 6 à relier (1,4 s).",
    "Révision et objectifs dans la même vue : un compteur « 0 dues » et une pastille cliquable « 3 objectifs du jour → » dans la barre du haut (1,0 s). Comme Anki est cité dans le texte, « dues » se lit comme des cartes de révision à faire (interprétation).",
    "Une IA dans la même fenêtre : barre du bas « Auto · Opus 5.5 Extra » avec icône de chargement (3,5 s), sous une orbe rose-violet à facettes (1,4 s ; 7,5 s). Aucune question ni réponse n'est visible.",
    "Un amas « PKM & LLM Wiki — 9 notes » (1,0 s ; 1,4 s) : le compte range aussi des notes selon le motif « LLM Wiki », celui que suit le vault de Presti (vault/wiki/concepts/Système neuronal du cerveau.md, §2)."
  ],
  "strategies": [
    "Teaser par contradiction (lecture probable) : le texte présente comme hypothétique une appli que l'écran montre déjà en marche (compteurs, barre d'IA). Ni explication, ni lien, ni appel à l'action (0,0-7,7 s). L'effet visé (faire demander où la trouver) est une interprétation : aucun chiffre d'audience n'est disponible.",
    "Promesse de consolidation : une liste de cinq outils additionnés par des « + », adressée à des gens qui les utilisent déjà séparément (0,0-7,7 s).",
    "L'interface est le seul héros : vrai écran, vrai clavier, pièce sombre, aucun visage (0,0-7,7 s).",
    "La densité visuelle sert d'accroche : des centaines de points, des orbites et des étiquettes chiffrées donnent l'impression d'un savoir énorme et rangé avant toute lecture (dès 0,0 s).",
    "Un seul événement visuel, placé tôt : la caméra s'approche (1,1-1,7 s) pendant qu'un polyèdre rose s'illumine au centre du graphe (1,3-1,7 s), puis elle recule (1,8 s). Le reste du film est presque immobile.",
    "Rebond en deux temps dans le texte : quatre lignes de proposition, une ligne vide, puis une relance de deux mots (0,0-7,7 s).",
    "Produit en français (étiquettes « objectifs du jour », « à relier », « îlots »), accroche en anglais (1,0 s ; 3,5 s) : viser plus large que la langue du produit (interprétation)."
  ],
  "erreurs_a_eviter": [
    "Copier la forme : 7,7 s muettes, texte fixe, écran filmé au téléphone. C'est contraire à la règle « aucune vidéo TikTok sans voix Fish » (memoire/tiktok-voix-fish-avant-publication.md) et à la charte (objets en héros, 3D).",
    "Copier le rythme : un seul mouvement de caméra (1,1-1,8 s), puis un cadre presque fixe jusqu'à 7,7 s. La règle Presti demande un visuel neuf toutes les 0,5-0,9 s et une caméra jamais à l'arrêt (memoire-presti/pub-v3-horrible-lenteur-2610.md).",
    "Copier la palette : cercles et rayons bleu pâle, rose et rouge (1,4 s ; 3,5 s). La charte veut un seul accent corail #D97757, jamais de bleu ni de cyan, et réserve le vert #38CD8C à « validé ».",
    "Citer des marques (Obsidian, Anki, NotebookLM, ChatGPT, Claude) ou un nom de modèle (« Opus 5.5 Extra », 3,5 s) : c'est interdit dans nos films. Dans la console, l'artisan ne parle qu'à l'assistant de Presti (CLAUDE.md, architecture imposée, point 2).",
    "Promettre « une appli qui réunit tout » sans montrer ce qu'elle fait. Chaque outil cité dans une accroche Presti doit exister en production (lib/flags.ts fait foi) ; sinon, la promesse n'est pas vérifiable.",
    "Filmer un vrai écran pour une pub avant que Benj ait tranché : la question V1 est ouverte (plans/011-cadrage-01-11/cadrage-00-synthese.md:103).",
    "Correction de l'analyse du matin (ANALYSE-TIKTOK.md:235) : ce n'est pas une boucle sans couture. Le cadre final (7,5 s, large, clavier sur deux rangées) ne raccorde pas avec le cadre initial (0,0 s, serré). Une boucle Presti doit raccorder la première et la dernière image.",
    "Correction de l'analyse du matin (ANALYSE-TIKTOK.md:238) : pas de constellation 3D sur la landing par défaut. La direction A recommandée retire le WebGL (ObjetVivant, plans/011-cadrage-01-11/cadrage-p4.md:140) et se veut « sans WebGL » (l.174).",
    "Prendre « Jev » pour un outil connu : il n'est pas identifié (coquille possible), il n'y a rien à en tirer.",
    "La vidéo ne contient aucun chiffre de revenu ni aucune promesse chiffrée. Les compteurs de notes sont ceux du compte, pas une preuve à citer."
  ],
  "hooks_accroches": [
    "Texte d'ouverture, fixe du début à la fin : « Imagine an app that brings together obsidian + Jev + Anki » (0,0-7,7 s). Suivent NotebookLM, une IA, puis une relance de deux mots sous une ligne vide.",
    "Accroche visuelle : graphe planétaire dense, orbe lumineuse à facettes en bas, traits rouges qui convergent vers un point à droite du graphe (0,0 s).",
    "Seul relais d'attention, avant 2 s : la caméra s'approche et un polyèdre s'illumine au centre (1,1-1,7 s)."
  ],
  "formats_contenu": [
    "Un plan unique de 7,7 s en 9:16 (1080×1920, 60 i/s), sans coupe : score de changement de scène maxi 0,09, pour un seuil de 0,3.",
    "Un écran réel de portable filmé au téléphone tenu à la main, dans une pièce sombre. Le clavier reste en bas du cadre, sauf pendant le rapprochement (1,2-1,7 s).",
    "Texte superposé blanc, centré, sur 5 lignes, immobile de 0,0 à 7,7 s, sans aucune animation de texte.",
    "Son : musique seule, sans parole (transcription vide) ; moyenne -16,5 dB, crête -6,4 dB.",
    "Ni appel à l'action, ni lien, ni visage ; pas de boucle raccordée."
  ],
  "applicabilite_chantiers": {
    "cerveau_obsidian": {
      "pertinent": true,
      "actions": [
        "Afficher en permanence la santé du réseau. Ajouter au serveur MCP cerveau un 5ᵉ outil en lecture seule (outils déclarés dans C:/Users/benja/Documents/cerveau/src/mcp.mjs, l.11-26), calculé sur l'index que la tâche « Cerveau Presti » reconstruit toutes les 15 min. Pour chacune des 6 cartes de wiki/, il rend le nombre de notes, d'« îlots » (groupes reliés entre eux mais pas à la carte) et de notes « à relier » (aucun lien entrant) : c'est le format des étiquettes vues à 1,0 et 3,5 s. Claude Code l'écrit. Un workflow n8n le fait appeler chaque soir par Hermes, dont le branchement MCP reste à faire (CLAUDE.md, « Où chaque outil tourne »). Puis la tâche de rangement de 21 h 30 (périmètre SaaS/…) recopie les 6 lignes en tête de wiki/hot.md, que chaque session reçoit au démarrage. Aujourd'hui, les orphelins ne sortent que quand on lance /claude-obsidian:wiki-lint.",
        "Réviser façon Anki (« 0 dues », 1,0 s). Le même outil compte les règles (regle: true dans la mémoire) et les entrées de décision dont la date de mise à jour dépasse un intervalle croissant, à fixer par Benj ; quoi_de_neuf les rend sous « à revoir ». L'agent qui les relit confronte chaque fait au code ou à la base, puis le reconfirme (nouvelle date) ou le corrige par une tâche SaaS/…. Cela complète src/contradictions.mjs, qui compare la mémoire et le vault mais jamais le code. Motif mesuré le 01/11 : CLAUDE.md annonçait 87 routes, 21 drapeaux et 85 migrations, alors que le dépôt en compte 224, 57 et 168 (plans/011-cadrage-01-11/cadrage-00-synthese.md:38)."
      ]
    },
    "landing": {
      "pertinent": false,
      "actions": []
    },
    "prospection": {
      "pertinent": false,
      "actions": []
    },
    "presti_assistant": {
      "pertinent": true,
      "actions": [
        "Barre « à valider + priorités du jour » sur l'accueil de la console (app/dashboard/page.tsx), d'après la barre du haut lue à 1,0 s. « N à valider » compte les cartes assistant_actions au statut en_attente non expirées (lib/assistant/cartes.ts:15 et :18, validité 24 h). « 3 priorités du jour → » reprend les trois premières lignes du briefing (lib/assistant/briefing.ts : devis sans réponse depuis 7 jours l.35, impayé de 30 jours l.37, stock sous le seuil l.72). Aujourd'hui, ce briefing n'est calculé que si l'artisan le demande (outil briefing_du_matin, lib/assistant/outils.ts:70). Le calcul se fait par le code, sans appel au modèle (briefing.ts:99) et sans migration. La flèche ouvre /assistant, puis la boîte « À valider » quand elle existera (plans/011-cadrage-01-11/cadrage-p3.md §4). Construit par Claude Code.",
        "Quand le « Briefing du matin » niveau 1 sera construit (prévu dans cadrage-p3.md §4 : notification dans l'appli + e-mail), le borner à trois priorités avec la même flèche vers la boîte « À valider ». Un workflow n8n le déclenche à heure fixe (instance Oracle, qui tire et ne reçoit pas) : c'est la forme de la pastille « 3 objectifs du jour → ». La sortie du briefing compte comme texte de tiers (lib/pilote/regles.ts:132) : elle propose, elle ne déclenche jamais le Pilote."
      ]
    },
    "contenu_videos": {
      "pertinent": true,
      "actions": [
        "Un plan de 2 à 3 s pour une pub sur l'assistant, dans le moteur Three.js d'offres-v1 (consigne memoire-presti/pubs-repartir-du-moteur-offres-2610 ; ce moteur a déjà une orbe parmi ses objets). Reprendre la grammaire, pas le décor : un réseau dense dont le nœud central s'illumine pendant que la caméra s'approche (1,1-1,7 s). Les nœuds sont des objets d'artisan (devis, chantier, facture, téléphone), reliés par des fils corail #D97757 ; leurs compteurs « 3 à relancer » passent au vert #38CD8C à la validation. Fond #0A0C11, aucune orbite bleue (la référence en a, 3,5 s). Caméra jamais à l'arrêt, un visuel neuf toutes les 0,5-0,9 s, alors que la référence ne bouge presque plus de 1,8 à 7,7 s.",
        "L'accroche « tout réunir » (voir les hooks réutilisables) se dit à la voix Fish, à 3,3 mots/s ou plus, en ouverture sur le réseau qui se forme, avec des noms d'outils génériques (carnet, tableur, messagerie). Jamais en texte fixe muet, comme dans la référence (memoire/tiktok-voix-fish-avant-publication.md).",
        "Couverture de carrousel 1080×1350 dans la chaîne post-du-jour.js (l.7) : un arrêt sur image du réseau recoloré et une seule phrase en Bricolage Grotesque 700. Elle va dans la file « à valider » (défaut P2-Q1 du 01/11) et n'est jamais publiée directement."
      ]
    }
  },
  "priorite": "moyenne",
  "sources_timestampes": [
    "0,0-7,7 s : texte blanc fixe de 5 lignes au centre, identique sur les images extraites à 0,0 ; 1,0 ; 1,4 ; 3,5 et 7,5 s. La planche et les images d'accroche concordent.",
    "0,0 s (image) : étiquettes Intelligence Artificielle — 4 notes, Module 2 — 5 notes, Dale Carnegie, Robert Greene, Morgan Housel ; traits rouges qui convergent vers un point à droite du graphe.",
    "1,0 s (barre du haut recadrée, ×2) : ZOOM FAR · 0 dues · 3 objectifs du jour → · Planetary · Tous les liens · Verrouiller.",
    "1,0 s (recadrage) : Robert Greene — 58 notes · 2 îlots · 1 lune · 2 à relier ; Économie — … 2 îlots · 11 à relier ; PKM & LLM Wiki — 9 notes.",
    "1,1-1,7 s (images toutes les 0,1 s) : la caméra s'approche, la barre du haut touche le bord du cadre à 1,2 s ; le recul est achevé à 1,8 s.",
    "1,3-1,7 s : polyèdre rose lumineux au centre du graphe, avec des traits rouges vers PKM & LLM Wiki, Neuroplasticité — 40 notes et tasks — 0 note · 6 à relier (image à 1,4 s).",
    "3,5 s (recadrage) : Alex Hormozi — 157 notes · 2 îlots · 1 lune · 80 à relier ; Morgan Housel — 53 notes · 4 îlots ; Prompts — 24 notes · 7 à relier ; Firmware.",
    "3,5 s (bas recadré, ×2) : « Auto » à gauche, « Opus 5.5 Extra » et une icône de chargement au centre, un texte coupé « commu… » à droite.",
    "3,5 s et 7,5 s : clavier AZERTY (è, ç, à, §), touches de fonction loupe, micro et lune, menu « Window » en haut à gauche.",
    "7,5 s : étiquettes Dr MAXWELL MALTZ — 10 notes, Module 2 — 5 notes, Prompts — 24 notes · 7 à relier. Les étiquettes changent pendant le plan.",
    "0,0-7,7 s : aucune coupe, score de changement de scène maxi 0,09 (à 0,02 s) pour un seuil de 0,3. Moyenne par demi-seconde : 0,0139-0,0176 avant 2,0 s, 0,0044-0,0111 ensuite.",
    "0,0-7,7 s : transcription faster-whisper vide (seule ligne : langue: en). Audio continu, aucun silence de plus de 0,3 s sous -40 dB ; volume moyen -16,5 dB, crête -6,4 dB (volumedetect).",
    "≈0,6-0,9 ; 2,9-3,2 ; 3,9-4,2 ; 6,2-6,4 s : impulsions graves sur la forme d'onde et sur le spectre, puis bandes tonales tenues de ≈3,1 s à la fin : profil de musique.",
    "0,0 s contre 7,5 s : cadre serré au début, plus large à la fin (clavier sur deux rangées) : la boucle ne raccorde pas.",
    "ffprobe : 7,707 s (piste vidéo 7,700 s, 462 images), 1080×1920, HEVC 60 i/s ; AAC 44,1 kHz stéréo, 65,6 kb/s."
  ]
}
```

## Rapport de synthèse

Treize vidéos ont été analysées le 01/11 : trois cours YouTube sur les agences d'IA (10 h 32 en tout, découpés en 55 segments, une
carte par segment) et dix TikToks. **Les trois cours sont surtout de la promotion** : coaching et logiciels payants du vidéaste,
revenus affirmés (172 000, 241 000, « millions ») que rien ne vérifie et que Presti ne citera jamais. Environ un tiers des
segments donne une méthode réutilisable, et les trois cours se recoupent : RWKyUJLi-kI et k1adsrTHwPg reprennent largement
O3A2xnBadFo.

**Ce qui vaut pour Presti** tient en quatre méthodes. Vendre par la découverte : douleur, objectif, urgence réelle, puis
solution et prix, dans les mots exacts de l'artisan (RWKyUJLi-kI [03:36], [03:42]). Prospecter étroit : une campagne par métier,
une seule douleur par message, une question ouverte pour finir, la méthode « dream 100 » par ville (O3A2xnBadFo [03:16], [01:48] ;
RWKyUJLi-kI [02:44], [03:31]). Soigner la délivrabilité : domaine d'envoi secondaire SPF, DKIM et DMARC, montée progressive
sous 300 par jour, mesure sur 30 à 90 jours avant de juger (O3A2xnBadFo [02:48], [02:51], [00:13] ; k1adsrTHwPg [00:12]).
Garder l'artisan aux commandes : validation en un clic avant chaque action, questions avant de chiffrer, onboarding court
(RWKyUJLi-kI [01:43], [01:41] ; k1adsrTHwPg [00:46]).

**Les TikToks servent surtout la forme.** Le carrousel BTP de ghoost.000 donne un gabarit de sept diapositives, et
mikalianov une grammaire d'animation de fonctionnalité : carte par carte, champ qui se tape, frise d'étapes. yova2n met le
produit 3D en accroche, à plus de 5 mots par seconde. La liste d'« agents à vendre » d'angelotturri recoupe des fonctions
que Presti a déjà : relance des impayés, contrat d'entretien, chiffrage sur les prix de l'artisan. Enfin,
realbastianvolkis décrit l'assistant comme « agent + mémoire + connexions + compétences », avec un bouton manuel pour chaque
action automatique.

**Ce qu'on rejette** : la prospection par SMS, appels ou LinkedIn automatisé (art. L34-5 du CPCE et règles de Benj ; le SMS
entre l'artisan et ses propres clients, lui, est décidé par Benj le 01/11) ; tout outil payant cité (Apollo, Clay, Instantly,
GTM, Twilio…), remplacé par n8n, Brevo gratuit, SearXNG, Crawlee, Firecrawl et ScrapeGraphAI auto-hébergés ; les volumes au-delà de 300
e-mails par jour ; la fausse urgence, les prix d'ancrage et les témoignages empruntés. Les synthèses de segments disaient
« publication manuelle » pour le contenu : c'est dépassé par l'ADR-006 (2 à 3 validations par format, puis automatique sous QA).

**Par chantier.** Réseau neuronal : notes par métier, objections, fiche de découverte, compte rendu d'échange versé par n8n.
Landing : un seul objectif par page, titre sans jargon d'IA, démo avant le texte, FAQ des objections, calculateur, trois offres.
Prospection : délivrabilité, campagne par métier, dream 100, score avant envoi, bilan hebdomadaire du maillon faible. Assistant :
cartes à valider, questions avant devis, compétences métier écrites. Contenu : carrousel en sept temps, animation de
fonctionnalité, produit 3D en accroche.

## Top 20 des actions

Classées par chantier (dans l'ordre des chantiers), puis par priorité. Chaque action cite sa source.

| # | Chantier | Priorité | Action | Source |
|---|---|---|---|---|
| 1 | Réseau neuronal | haute | Une note « client type » par métier du bâtiment : douleurs, objections, vocabulaire. Dossier `30 Prospection/01 ICP` (modèle Client). | O3A2xnBadFo [04:19] |
| 2 | Réseau neuronal | haute | Compléter les objections et leurs réponses (`30 Prospection/03 Objections` ; les deux notes de septembre citent d'anciens prix) | O3A2xnBadFo [01:49] ; RWKyUJLi-kI [03:36] |
| 3 | Réseau neuronal | moyenne | Fiche de découverte artisan et règles de tri des prospects, pour que Hermes les lise avant de produire | k1adsrTHwPg [00:13], [00:51] |
| 4 | Landing | haute | Un seul objectif par page : titre d'une ou deux phrases sans jargon d'IA, sous-titre, démo, un bouton | O3A2xnBadFo [04:03] ; RWKyUJLi-kI [00:18], [00:21] |
| 5 | Landing | haute | Démo courte d'un devis et d'une facture avant tout texte ; frise en trois étapes | k1adsrTHwPg [00:52] ; mikalianov 3-34 s |
| 6 | Landing | moyenne | FAQ qui répond d'avance aux objections, et explication de ce qui suit une demande de démo | O3A2xnBadFo [01:49], [01:25] |
| 7 | Landing | moyenne | Calculateur où l'artisan met ses propres chiffres (demandes perdues, temps de devis) | RWKyUJLi-kI [03:26] |
| 8 | Landing | moyenne | Studio en entrée, Signature en palier, « Presti pour l'entreprise » sur démonstration, prix réels | RWKyUJLi-kI [01:31] ; k1adsrTHwPg [00:14] ; décision de Benj du 01/11 |
| 9 | Prospection | haute | Domaine d'envoi secondaire SPF, DKIM, DMARC et montée progressive sous 300 par jour (Brevo gratuit) | O3A2xnBadFo [02:48], [02:51] ; ADR-004 |
| 10 | Prospection | haute | Une campagne par métier, une seule douleur par message, une question ouverte pour finir | O3A2xnBadFo [03:16], [01:48] ; RWKyUJLi-kI [03:31] |
| 11 | Prospection | haute | « Dream 100 » par ville : 50 à 100 artisans, e-mail très personnalisé (données réelles : Claude Code, jamais freellmapi) | RWKyUJLi-kI [02:44], [02:50] |
| 12 | Prospection | moyenne | Score de qualification avant l'envoi ; arrêt des relances au troisième report de rendez-vous | k1adsrTHwPg [00:16], [00:51] |
| 13 | Prospection | moyenne | Bilan hebdomadaire du maillon faible du tunnel, en chiffres agrégés, sans donnée de prospect | O3A2xnBadFo [00:08] ; k1adsrTHwPg [00:40] |
| 14 | Prospection | moyenne | Passer par les partenaires qui touchent beaucoup d'artisans : groupements, cabinets comptables, négoces | RWKyUJLi-kI [00:49], [03:48] |
| 15 | Assistant | haute | Validation en un clic avant chaque action, et un bouton manuel pour chaque action automatique | RWKyUJLi-kI [01:43] ; realbastianvolkis 53,2-61,0 s |
| 16 | Assistant | haute | Questions sur le chantier avant de générer le devis ; devis en étapes validées une à une | k1adsrTHwPg [00:46], [00:42] |
| 17 | Assistant | moyenne | Onboarding court avec dictée et séquence d'accueil sur 48 heures | RWKyUJLi-kI [01:41], [01:48] ; O3A2xnBadFo [00:49] |
| 18 | Assistant | moyenne | Compétences métier écrites, un document par geste d'artisan, lues par l'assistant | realbastianvolkis 68,2-71,8 s, 166,6-173,2 s |
| 19 | Contenu | haute | Gabarit de carrousel en sept diapositives : douleur, idée reçue cassée, schéma, exemple marqué « Exemple », checklist, bénéfice, essai | ghoost.000 14-21 s |
| 20 | Contenu | haute | Animation de fonctionnalité carte par carte, produit 3D en accroche, plus de 5 mots par seconde | mikalianov 3-34 s ; yova2n 0-3 s |

## Hooks, angles et formats pour le chantier 5

**Hooks** (la structure se reprend, jamais les phrases : chaque texte est écrit pour Presti et validé par Benj) :
- annoncer la mort d'une vieille habitude : le carnet, le tableur, le devis promis jamais envoyé (mikalianov 0-3 s) ;
- « les employés que tu n'as pas à embaucher », en liste numérotée de ce que Presti fait déjà (angelotturri 6,4-117,3 s) ;
- « le premier qui répond emporte le chantier », sans chiffre inventé (angelotturri) ;
- le contre-pied « arrêtez de… » (realbastianvolkis), à réserver aux formats éducatifs.

**Angles** : une douleur par métier en série (O3A2xnBadFo [04:48]) ; « diagnostic avant ordonnance » (RWKyUJLi-kI [03:43]) ;
l'analogie du médecin et « tamiser l'or » pour le tri des clients (k1adsrTHwPg [00:46], [00:16]) ; problème puis solution
(O3A2xnBadFo [00:42]) ; une entrée et des dizaines de sorties en éventail pour montrer « automatique » (sambutlerai).

**Formats** : carrousel BTP en sept temps, fond nuit et mot-clé chaud (ghoost.000) ; animation de fonctionnalité plein cadre
en charte Presti (mikalianov) ; produit 3D en héros avec des mots un par un (yova2n) ; démo d'un devis créé en quelques secondes
(k1adsrTHwPg [00:52]).

**Cadre** :
- rythme d'au moins 3,3 mots par seconde, avec un visuel neuf toutes les 0,5 à 0,9 s (règle de Benj du 26/10 ; les références
  vont de 3,3 à 5,2 mots par seconde) ;
- ni vrais logos de marques, ni prix d'abonnement dans une vidéo ;
- les 2-3 premiers contenus de chaque format sont validés par Benj (ADR-006) ;
- références de forme candidates, au choix de Benj : mikalianov et yova2n.

## Notes Obsidian à créer

Propositions : chacune naîtrait au premier statut de son modèle (outil `creer_note`), et Benj la valide.

| Type | Note | Dossier |
|---|---|---|
| Décision (proposée) | SMS : jamais pour prospecter, oui entre l'artisan et ses propres clients (rappel, devis prêt, paiement), avec STOP | `10 Presti/04 Décisions` |
| Client type | Une note par métier (plombier, électricien, menuisier, maçon, peintre) : douleurs, objections, vocabulaire | `30 Prospection/01 ICP` |
| Playbook | Campagne e-mail par métier : une douleur, une question, sous 300 par jour | `30 Prospection/02 Playbooks` |
| Playbook | « Dream 100 » par ville | `30 Prospection/02 Playbooks` |
| Playbook | Montée en charge d'un domaine d'envoi (SPF, DKIM, DMARC, rythme) | `30 Prospection/02 Playbooks` |
| Apprentissage | Les objections des artisans et ce qui y répond (d'après les trois cours) | `30 Prospection/03 Objections` |
| Playbook | Carrousel BTP en sept diapositives ; animation de fonctionnalité | `40 Vidéos/02 Formats` |
| Apprentissage | Les dix TikToks du 01/11 et ce qu'ils enseignent, à ajouter à « Références de Benj et ce qu'elles enseignent » | `40 Vidéos/04 Références` |
| Prompt | Bilan hebdomadaire du maillon faible, rédigé par Hermes sur des chiffres agrégés | `50 Automatisations/04 Prompts` |
| Apprentissage | Les revenus annoncés par les vidéos de formation ne sont jamais cités : invérifiables | `90 Apprentissages` |
| Erreur | Un exécutant gratuit a rendu un squelette qui collait aux titres attendus par un vérificateur faible : un vérificateur doit contrôler le fond (tâche 031-004, 01/11) | `90 Apprentissages` |
