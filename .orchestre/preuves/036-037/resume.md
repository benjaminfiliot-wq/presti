# 036-037 — Le centre d'aide, remis à jour du 03/11

## Ressources utilisées

| Ressource | Ce qu'elle a changé dans le travail |
|---|---|
| MCP `cerveau` — `regles_pour` (« aide, textes publics, promesses ») | Aucune règle propre à l'aide ; il a rappelé le cadre (rien sur un compte non Presti). |
| MCP `cerveau` — `chercher` (« centre d'aide promesse non tenue assistants mode ombre boîte À valider ») | Il a mené à `plans/promesses-2026-10.md` (audit des promesses de l'aide) et à `p6-signature/mode-ombre.md`. Conséquence : aucune promesse d'envoi par les assistants, et le mot « mode essai » repris de la boîte. |
| `plans/011-cadrage-01-11/p6-signature/RAPPORT-0311.md` | La liste de ce qui a changé le 03/11 (prix 30/60, Entreprise, outil de gestion, « Mes outils », boîte « À valider » en mode essai, départements mis en marche compte par compte). L'aide n'a rien ajouté au-delà. |
| Skill `design:ux-copy` | Relecture des textes neufs : mêmes mots que l'écran. Le bouton est cité « Reconnecter Gmail » (avec le nom de l'outil) et le message après « Valider » mot pour mot (« Carte validée. Rien n’est parti »), avec un contrôle neuf au juge. |
| Skill `presti-verify` | Rappel du cycle complet : build, déploiement et vérification en direct sont **hors de portée** de cette session (interdits ici). Ils sont listés plus bas pour la session principale. |
| Le code, lu à la ligne (`lib/plans.ts`, `app/crm/Gestion.tsx`, `app/crm/BoiteAgents.tsx`, `app/crm/outils/vue.tsx`, `app/api/assistant/agents/route.ts`, `lib/agents/n8n/cartes.ts`, `app/OffreEntreprise.tsx`, `app/entreprise/page.tsx`, `app/contact/page.tsx`, `app/AppShell.tsx`, `lib/flags.ts`) | La source de chaque phrase neuve (tableau plus bas). Les prix, le nom de l'offre Entreprise, les départements et le chemin de « Mes outils » sont **lus** dans le code, jamais recopiés. |
| Juges voisins (`scripts/connecter-ecran-qa.mjs`) | Son contrôle C6 interdit d'écrire `/crm/outils` dans `app/` ailleurs que dans l'écran gardé. J'ai donc créé `PAGE_MES_OUTILS` dans `lib/aide.ts`. Il a aussi fourni le modèle des captures hors ligne (TypeScript transpilé, `renderToStaticMarkup`, Playwright sans réseau). |

Non chargés, faute d'objet ici : le MCP n8n-oracle (absent du périmètre), et les skills vidéo et animation (aucune vidéo, aucune animation touchée).

## Ce qui a changé (6 fichiers, tous dans le périmètre)

- `lib/aide.ts`
  - Quatre articles neufs : `gestion`, `assistants`, `mes-outils` et `entreprise`.
  - Chacun porte un champ `drapeau`, et `ARTICLES = articlesVisibles(TOUS_ARTICLES)` : un article dont le drapeau est baissé n'apparaît nulle part, ni dans le centre d'aide, ni dans le panneau « ? », ni dans la recherche.
  - L'article `crm` s'appelle maintenant « CRM 3D » ; on l'ouvre par « Outil de gestion » puis la porte « CRM 3D ».
  - L'article `offres` gagne une ligne qui renvoie vers l'offre Entreprise.
  - `PAGE_MES_OUTILS` est exporté.
- `lib/aideAutomatique.ts`
  - Les offres des sujets neufs entrent dans `CAPACITE_AIDE`. L'Entreprise prend la valeur `'sur_devis'`, avec le type `PastilleAide` : sa pastille dit « Sur devis », jamais « Gratuit ».
  - `prixParMois()` est lu dans `PLANS`, et `ENTREPRISE_AIDE` vient de `PLANS.entreprise.surDevis`.
  - Ligne « CRM 3D » ; deux lignes neuves dans « Qui a quoi » : « Mes outils » (`connexions`) et « Vos assistants » (`boiteAgents`).
  - Une entrée neuve dans « Ce qui est automatique » : `assistants-essai` (`boiteAgents`).
- `app/aide/TableauOffres.tsx` : une ligne « Prix par mois » et, sous le tableau, l'offre Entreprise « sur devis, sans prix public », avec le lien `/entreprise`.
- `app/aide/PastilleOffre.tsx` : la pastille « Sur devis ».
- `app/aide/page.tsx`
  - Groupes dans l'ordre du nouveau menu : Tableau de bord, Messages, **Outil de gestion** (`/crm` et « Mes outils »), puis Outil de gestion · Devis, Factures, Mes tarifs, Stock, CRM 3D, Mes chiffres, etc.
  - Libellés d'écran propres au centre d'aide (« Outil de gestion », « CRM 3D · … »).
- `scripts/aide-automatique-qa.mjs`
  - Le juge charge seul le résolveur TypeScript : `verifier` le lance sans `--import`.
  - Sections 9 (le 03/11) et 10 (captures) ajoutées, plus un effaceur de commentaires ligne à ligne. L'ancien `sansCommentaires` avalait du code dès qu'un commentaire contenait `app/**`, ce qui aurait fait passer le contrôle des prix à vide.

## Chaque phrase neuve et sa source

| Phrase de l'aide (résumé fidèle) | Source |
|---|---|
| Studio et Signature, avec leur prix par mois (article « offres » et ligne « Prix par mois ») | `lib/plans.ts:115-118` (`prixMois` 30 et 60), lus par `${PLANS.x.prixMois}` et `prixParMois()` |
| Une troisième offre, « Presti pour l’entreprise », sur mesure (équipe, outils, automatisations), même autonomie que Signature | `lib/plans.ts:15-18`, `:120` (label, accroche) |
| Pas de prix public : le prix se fixe sur devis, après un premier rendez-vous, dans une proposition | `lib/plans.ts:120` (`surDevis`) ; `app/OffreEntreprise.tsx:38`, `:57` ; `app/entreprise/page.tsx:112` |
| Gestes : la carte dans Abonnement, « Tout savoir sur l’offre Entreprise », « Parler à l’équipe » | `app/OffreEntreprise.tsx:57-63` ; `app/abonnement/page.tsx:9` |
| La page « Parlons de votre entreprise » s'ouvre avec son formulaire | `app/contact/page.tsx:24-34`, `:73` |
| Crédits de l'Entreprise : ceux de Signature, tant que le contrat n'en fixe pas d'autres | `lib/plans.ts:119-120` |
| Devis, factures, tarifs et stock ne sont plus dans le menu ; tout s'ouvre depuis « Outil de gestion » | `app/AppShell.tsx:40-44` |
| Deux portes : « CRM 3D » (maquette) et « Tableau de bord » (vue normale) | `app/crm/Gestion.tsx:19-22` |
| Trois groupes et leurs douze écrans (Pièces, Chantiers et clients, Pilotage) | `app/crm/Gestion.tsx:27-38` (Planning sous `crmPlanning`, levé : `lib/flags.ts:191`) |
| Les anciennes adresses marchent toujours ; l'écran n'envoie rien | `app/crm/Gestion.tsx:14-16` |
| Sans Signature, la porte « CRM 3D » porte « Offre Signature » | `app/crm/Gestion.tsx:75`, `:88` |
| La boîte « À valider » s'affiche sous les deux portes s'il y a des propositions | `app/crm/Gestion.tsx:95` ; `app/crm/BoiteAgents.tsx:48-50` |
| Les sept départements (Accueil, Devis, Suivi, Facturation, Après-chantier, Opérations, Direction) | `lib/agents/n8n/cartes.ts:11-16`, lus par `departements()` |
| Chaque proposition : département, texte, « Pourquoi », « Sources » | `app/crm/BoiteAgents.tsx:88-100` |
| Mode essai : rien n'est envoyé à vos clients, répondez comme d’habitude ; « Valider » ou « Refuser » sert à régler les assistants | `app/crm/BoiteAgents.tsx:60-63` ; `app/api/assistant/agents/route.ts:14-18` ; `lib/agents/n8n/cartes.ts:4-6` |
| Après « Valider » : « Carte validée. Rien n’est parti » | `app/crm/BoiteAgents.tsx:40` |
| « Déjà traitées » ; le compteur de propositions en attente | `app/crm/BoiteAgents.tsx:72-73`, `:56` |
| Les départements se mettent en marche un par un, compte par compte, réglés par l’équipe Presti ; sinon la boîte n'apparaît pas | `RAPPORT-0311.md`, « Vers 21 h 30 » et « Vers 22 h » ; `app/crm/BoiteAgents.tsx:48-50` |
| Valider ou refuser ne consomme pas de crédit | `app/api/assistant/agents/route.ts` (aucun appel aux crédits) |
| Vos assistants dès Studio | `app/api/assistant/agents/route.ts:18-19` (`gardeAssistant`, capacité `assistant`) ; `lib/plans.ts` STUDIO |
| « Mes outils » : trois outils Google seulement, avec le rôle de chacun (Gmail en lecture seule ; Agenda : créneaux occupés, ni titre ni invités ; Drive : seulement les fichiers créés pour vous ou ouverts par vous) | `app/crm/outils/vue.tsx:17-24` |
| Le lien « Mes outils » en bas de l'outil de gestion, dès Studio | `app/crm/Gestion.tsx:76-78`, `:111-119` |
| « Connecter Gmail / Google Agenda / Google Drive » ; laisser toutes les cases cochées, sinon rien n'est branché | `app/crm/outils/vue.tsx:165`, `:55` (`portee_refusee`) |
| « Connecté » seulement après une vraie lecture réussie | `app/crm/outils/vue.tsx:86-93`, `:224` |
| « Retirer », puis « Retirer l’accès » : autorisation effacée tout de suite, rien n'est supprimé chez Google | `app/crm/outils/vue.tsx:142`, `:150-154` |
| « Reconnecter Gmail » : le travail est en pause, rien n'est perdu, il reprend dès la reconnexion | `app/crm/outils/vue.tsx:146`, `:165` |
| Chaque sujet sous son drapeau : gestion → `crm`, assistants → `boiteAgents`, Mes outils → `connexions` ; l'Entreprise sans drapeau (carte montrée à tous) | `lib/flags.ts:172`, `:340-349` ; `app/AppShell.tsx:44` ; `app/crm/BoiteAgents.tsx:18` ; `app/crm/Gestion.tsx:78` ; `app/OffreEntreprise.tsx` (aucun `actif`) |

Ce qui n'a **pas** été écrit, et que le juge interdit :
- que les assistants envoient seuls (le palier réel n'est pas servi) ;
- qu'un autre outil que Google se branche ;
- un prix pour l'Entreprise, un chiffre de gain ou un témoignage ;
- un prix tapé en dur.

## Sortie du juge (`node scripts/aide-automatique-qa.mjs`, sans `--import`)

Sortie complète : `sortie-juge.txt` (114 contrôles, dont 24 mutants). Sections 9 et 10 :

```
── 9. Le 03/11 : prix, Entreprise, outil de gestion, « Mes outils », « Vos assistants »
  ✅ l’effaceur de commentaires garde le code (la phrase des prix de lib/aide.ts y reste)
  ✅ aucun prix d’offre écrit en dur dans l’aide (lib/aide.ts, lib/aideAutomatique.ts, app/aide/*)
  ✅ (mutation) « 30 € par mois » écrit en dur dans l’article des offres est vu
  ✅ (mutation) un prix Signature écrit en dur dans le tableau est vu
  ✅ l’article des offres dit les prix de lib/plans.ts (Studio 30 €, Signature 60 €)
  ✅ (mutation) un ancien prix (59 €) dans le texte rendu est vu
  ✅ « Qui a quoi » a une ligne « Prix par mois » calculée par prixParMois (lu dans PLANS)
  ✅ l’article Entreprise porte la pastille « Sur devis », jamais « Gratuit »
  ✅ (mutation) une pastille Entreprise rendue « gratuit » est vue
  ✅ article « Presti pour l’entreprise » : présent, sur devis, sans prix public
  ✅ article Entreprise : aucun montant, aucun chiffre de gain, aucun témoignage
  ✅ (mutation) « 30 % de temps gagné » est vu
  ✅ (mutation) un témoignage « … » — Marc, plombier, est vu
  ✅ (mutation) un prix Entreprise (« 199 € ») est vu
  ✅ sous « Qui a quoi » : l’offre Entreprise, sur devis, vers /entreprise (lue dans PLANS.entreprise)
  ✅ les gestes de l’article Entreprise existent sur la carte et la page
  ✅ l’article « Outil de gestion » nomme les 12 portes et écrans de app/crm/Gestion.tsx
  ✅ (mutation) un article qui oublie « Factures » est vu
  ✅ le menu n’a plus Devis, Factures, Mes tarifs, Inventaire, et a « Outil de gestion » (l’article le dit)
  ✅ (mutation) « Devis » remis au menu est vu
  ✅ /crm ouvre d’abord l’outil de gestion : le panneau « ? » de /crm montre son article
  ✅ plus aucun « CRM atelier » dans l’aide : l’écran s’appelle « Outil de gestion », la maquette « CRM 3D »
  ✅ les « Réglages liés » des sujets neufs ne montrent aucun libellé périmé (« CRM atelier »)
  ✅ (mutation) « Vos assistants » qui renvoie vers /crm est vu
  ✅ (mutation) un « CRM atelier » resté dans un titre est vu
  ✅ les outils à brancher lus dans app/crm/outils/vue.tsx : Gmail, Google Agenda, Google Drive (tous Google)
  ✅ aucun outil absent n’est annoncé dans les sujets du 03/11 (Google seulement)
  ✅ (mutation) « Connecter Outlook » annoncé est vu
  ✅ (mutation) « Slack se branche aussi » est vu
  ✅ l’article « Mes outils » nomme chaque outil réel, son bouton « Connecter … » et le retrait
  ✅ les gestes cités existent dans la vue
  ✅ « Mes outils » commence à l’offre où l’écran l’ouvre (canaux.email : Studio)
  ✅ aucun texte des assistants ne promet un envoi seul
  ✅ (mutation) « vos assistants répondent seuls à vos clients » est vu
  ✅ (mutation) « l’assistant envoie la relance à votre place » est vu
  ✅ chaque texte des assistants dit « rien n’est envoyé »
  ✅ le code est toujours en mode essai : la boîte le dit et la route n’envoie rien (sinon, l’aide est à revoir)
  ✅ l’article nomme les 7 départements de lib/agents/n8n/cartes.ts, la boîte « À valider », « Valider » et « Refuser »
  ✅ le message cité après « Valider » est celui de la boîte (« Carte validée. Rien n’est parti »)
  ✅ « Vos assistants » commence à l’offre de la garde de la boîte (assistant : Studio)
  ✅ chaque sujet neuf porte le drapeau de son écran (gestion → crm, assistants → boiteAgents, mes-outils → connexions ; Entreprise : aucun)
  ✅ (mutation) « Mes outils » sans drapeau est vu
  ✅ les écrans sont bien gardés par ces drapeaux (et l’Entreprise par aucun)
  ✅ les drapeaux des articles existent dans lib/flags.ts
  ✅ ARTICLES = les articles dont le drapeau est levé (articlesVisibles)
  ✅ (mutation) drapeau boiteAgents baissé : « Vos assistants » disparaît de l’aide
  ✅ (mutation) drapeau connexions baissé : « Mes outils » disparaît, de l’aide comme du tableau
  ✅ l’entrée « automatique » des assistants et la ligne du tableau sont sous boiteAgents
  ✅ chaque sujet neuf a son groupe dans /aide (Outil de gestion : /crm et /crm/outils)
── 10. Les captures
  ✅ le rendu contient les prix lus dans PLANS, la ligne Entreprise et les quatre sujets
  ✅ capture-1440.png : PNG de 1440 px, sans débordement horizontal (0), 0 requête sortante refusée
  ✅ capture-390.png : PNG de 390 px, sans débordement horizontal (0), 0 requête sortante refusée
✅ 114 contrôles passés, 0 échecs
```

Les mutants demandés par la tâche, et le contrôle qui les voit :
- **prix écrit en dur** : « 30 € par mois » dans l'article, un prix Signature dans le tableau, un ancien prix (59 €) ;
- **promesse d'envoi seul** : deux phrases fautives ;
- **outil absent annoncé** : Outlook, Slack ;
- **sujet sans drapeau** : « Mes outils » sans drapeau, plus les drapeaux `boiteAgents` et `connexions` baissés.

Il s'y ajoute les mutants de l'Entreprise (gain, témoignage, montant, pastille « gratuit »), de l'outil de gestion (« Factures » oublié, « Devis » remis au menu) et de « CRM atelier » (titre, réglage lié).

## Captures 390 et 1440

`capture-1440.png` (1440 × 7093) et `capture-390.png` (390 × 13018) sont prises **par le juge** : les vrais composants (`TableauOffres`, `Automatique`, `ArticleCorps`, `PastilleOffre`) sont transpilés et rendus avec le CSS de l'app, sans réseau. Je les ai regardées découpées en tranches.
- **Vu sur les deux** : les quatre articles neufs ouverts ; la ligne « Prix par mois » (0 €, 30 €, 60 €) ; « Presti pour l’entreprise : une offre sur mesure… sur devis, sans prix public » ; la pastille « Sur devis » ; l'entrée « Vos assistants préparent des propositions, en mode essai ».
- **Corrigés grâce à elles** :
  - les prix coupés sur deux lignes (« 30 € par mois » → « 30 € » sous « Prix par mois ») ;
  - la pastille « Gratuit » de l'Entreprise (→ « Sur devis ») ;
  - le réglage lié « CRM atelier » (→ retiré des sujets neufs).
- **Limite** : c'est le contenu du centre d'aide hors de la coque `AppShell` (pas de menu latéral), car la page réelle exige une session Supabase.

## Autres suites qui lisent l'aide (une à une, après les changements)

- **Vertes** : `tableau-de-bord-qa`, `domaine-sans-site-qa`, `promesses-suite-qa` (10/10), et `connecter-ecran-qa` (48/48, 16/16 mutants).
  - Cette dernière a d'abord rougi sur C6 (`/crm/outils` écrit dans `app/aide/page.tsx`). C'est corrigé avec `PAGE_MES_OUTILS`.
  - En passant, cette suite a **réécrit ses propres captures** dans `.orchestre/preuves/036-033/` (hors de mon périmètre ; même code, même rendu ; dossier non suivi par git).
- **Rouges, pour des causes étrangères à ce lot** (elles ne lisent pas les textes touchés ici) :
  - `ecrans-offre-qa` : 1 échec sur 197, sur la page publique `/p/[slug]` (`MESSAGE_PUBLIC_SANS_PLATEFORME`).
  - `essais-gratuits-qa` : 6 échecs EG-2 et EG-3, sur les prix de la session de paiement après le changement de prix du 03/11.
  - `aide-videos-qa` : 23 échecs. Les fichiers `public/aide-videos/*.mp4` manquent sur cette copie, et les sous-titres de `lib/aide-videos.json` sont à refaire (`aide-videos-anime.mjs`).
  - `constructeur-ferme-qa` et `promesses-qa` : référence git `1620723` illisible sur cette copie, `lib/plans.ts` différent de HEAD (prix du 03/11), typage rouge dans `lib/evenements/departements.ts` (interdit à ce lot), 12 bulles `profil.style.*` absentes.

## Points à valider par la session principale

1. **Typage et build** : interdits ici, à jouer côté PC.
   - Seul changement de type public : `offreAide()` rend `PastilleAide` (`OffreAide | 'sur_devis' | null`) et `PastilleOffre` l'accepte. Ses deux autres appelants, `app/AidePanneau.tsx:90` et `app/aide/VideoAide.tsx:19`, ne font que transmettre la valeur.
   - `lib/aide.ts` importe maintenant `lib/flags.ts` et `lib/agents/n8n/cartes.ts` (deux modules sans import).
2. **Hors périmètre, encore périmé** :
   - `app/AidePanneau.tsx:39-42` nomme encore `/crm` « CRM atelier » (réglages liés du panneau « ? » et de l'article CRM 3D) ;
   - la vidéo `crm` de `lib/aide-videos.json` dit « CRM atelier ».
   À confier à une tâche dont c'est le périmètre.
3. **Panneau « ? » de `/crm`** : il montre maintenant l'article « Outil de gestion » (placé avant « CRM 3D »), y compris dans la vue 3D, puisque `articlePour` ne distingue pas `?vue=atelier`.
4. **Après la mise en ligne**, ouvrir `/aide` connecté :
   - les groupes « Outil de gestion · … » ;
   - la ligne « Prix par mois » ;
   - les quatre sujets ;
   - « Mes outils » absent si `connexions` est baissé.
