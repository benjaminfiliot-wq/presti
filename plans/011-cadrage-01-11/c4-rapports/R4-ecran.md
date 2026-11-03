# R4 — Chantier 4, partie « écran » : l'accueil de la console devient l'assistant

Rédigé le 02/11/2026, en lecture seule : aucun fichier du dépôt ni du vault modifié, aucun commit, aucun build, aucun
typecheck, aucun test, aucune écriture en base. Le seul fichier écrit est ce rapport.
Notation : `chemin:ligne` = `main` (arbre de travail) ; `refonte-1018:chemin:ligne` = lu par `git show refonte-1018:<chemin>`.

---

## 0. En bref

1. **`consoleV2` existe, mais seulement sur la branche `refonte-1018`** (`refonte-1018:lib/flags.ts:182-189`, essai l.206).
   Il est absent de `main` (`lib/flags.ts:323` : `ESSAI = {}`). La branche a 37 commits d'avance et 19 de retard sur la
   base commune `74aa7060` (19/10, 05 h 53) ; `git cherry -v main refonte-1018` marque les 37 « + » : **aucun n'est sur `main`**.
2. **La piste A « Instrument » est déjà codée** pour la console sur cette branche : jetons (`refonte-1018:app/base.css:56-87`),
   composants `components/ui/` (commit `4216c11f`), coque `app/console/CoqueV2.tsx`, accueil « Aujourd'hui » (`app/dashboard/Aujourdhui.tsx`
   et `GET /api/aujourdhui`). Le jury de design à l'aveugle a jugé l'accueil **« réussi » en 1440 et en 390** au tour 2
   (`C:/Users/benja/Documents/presti-refonte/plans/refonte-1018/JURY.md`, fichier **non commité**).
3. **Sa signature, la règle graduée, n'existe que dans les maquettes HTML** (`presti-ops/refonte-1018/pistes/piste-a.css:31-36`,
   `:78-79`) : aucune ligne de code de la branche ne la porte.
4. **Sur `main`, tout ce qu'il faut pour l'assistant existe, mais éparpillé sur 5 écrans** : cartes et journal dans
   `/assistant`, file du pilote et réglages par type dans `/parametres` (`app/parametres/SectionPilote.tsx`), compteurs et
   « partira dans … » dans le CRM (Signature), réponses préparées dans `/messages`, relances d'impayés à valider dans `/factures`.
5. **Écran proposé** : `/dashboard` « Aujourd'hui », mobile d'abord, en 9 sections : bonjour et bilan, « Demander »,
   point du jour (3 priorités), **À valider** (4 sources réunies), **Part tout seul** (décompte de 10 minutes, Annuler,
   Tout arrêter) et « Fait pour vous », chiffres du mois, **réglage par type d'action**, Découvrir, votre lien.
6. **Drapeau : `consoleV2`**, à porter sur `main` **baissé** et en essai pour le fondateur et le compte de démonstration
   (`lib/essais.ts:7`, `:10-11`) ; sous-sections derrière les drapeaux déjà levés `assistant`, `piloteAutomatique`,
   `relancesImpayes`, `crm`. Aucun drapeau neuf pour cet écran ; les données futures (P2/P3) auront le leur, créé avec leur migration.

---

## 1. Ce que j'ai lu (réseau neuronal d'abord)

- Cerveau (`chercher` puis `lire`) : `vault/wiki/concepts/Refonte 18-10 pistes A et B.md` (lu en entier) ;
  `memoire/nuit-1510-crm-assistant.md` (« il ne sert pas à poser des questions », c'est un agent qui gère la plateforme) ;
  `vault/wiki/concepts/Positionnement automatique.md` (extraits) ; `qg/PASSATION-19-10.md` §3 (décisions de Benj du 19/10 :
  console A, landing B) ; `regles_pour` sur la tâche (aucune règle propre à un écran).
- Prompt de Benj en entier : `plans/011-cadrage-01-11/prompts-benj/p3-assistant.md` (écran 1 l.140-172, annexe 2 §5 l.591-593).
- Cadrage : `plans/011-cadrage-01-11/cadrage-p3.md` §1, §3, §4 (niveaux par type l.209-226), §5.2, §6 (drapeau `boiteAValider`
  proposé l.355) ; `cadrage-p4.md` §1.4 (verdict sur la branche).
- Annexe technique : `presti-ops/assistant-gestion/PROMPT-AUTOMATISATION-ARTISAN.md` §1 (l.34-48), couche 3 (l.169-178),
  couches 6-7 (l.238-262).
- Vidéos : `plans/analyse-videos.md` — barre « à valider + priorités du jour » (l.1442), briefing borné à 3 priorités (l.1443),
  ligne « ce qui vient d'être fait » (l.738), un geste manuel pour chaque action automatique (l.639 et Top 20 n°15, l.1531),
  mise en route courte (n°17, l.1533), pas de champ fichier dans `/assistant` (l.1010).
- Refonte : `refonte-1018:plans/refonte-1018/DIRECTION.md`, `AVANCEMENT.md`, `ARCHITECTURE.md` §2.3 ; `JURY.md` (copie de travail).
- Skill `.claude/skills/presti-design/SKILL.md` (lu en entier).
- Code : `git log`, `git show --stat`, `git show refonte-1018:<chemin>`, `git diff` (lecture), puis les fichiers de `main` cités.

---

## 2. Ce que contient la branche `refonte-1018` pour la console (vérifié par git)

| Élément | Où (branche) | État |
|---|---|---|
| Drapeau `consoleV2` | `lib/flags.ts:182-189` : « piste A « Instrument » validée par Benj le 19/10 » ; essai `ESSAI = { consoleV2: true }` l.206 | baissé au commit `3c591d88` (`3c591d88:lib/flags.ts:187`) puis **levé en dur par le commit TEMPORAIRE `3abfb98a`**, « à retirer par git revert avant fusion » (`AVANCEMENT.md:39`) |
| Jetons « Instrument » | `app/base.css:56-87` : rayons, élévations par la couleur, grille millimétrée (`--grille-trait`, `--grille-pas:24px` l.69), une seule lueur (l.71-73), aube réservée (l.75), encre sur corail `#1A0F0A` (l.78), échelle de titres (l.80), `--ligne-tableau:48px` et `--haut-barre-bas:64px` (l.82), durées à 0 sous mouvement réduit (l.87) | fait |
| Composants | `components/ui/base.tsx` : `Carte` l.12-27, `useCompteur` l.32-49, `TuileChiffre` l.55-71 (« — » sans donnée), `Bento` l.74-79, `Accordeon` l.82-93 (details natifs), `BarreEtat` l.96-104, `Squelette` l.107-116, `EtatVide` l.119-130, `PastilleOffre` l.133-138 (verrou serveur via `peut()`), `Statut` l.141-143 ; `Onglets.tsx` (ARIA, sans JS tout visible, l.1-5), `Toasts.tsx` (`toast()` l.16-19), `Carrousel`, `Slides`, `Palette` (Ctrl+K), `ChargementConsole.tsx:8-16`, `icones.tsx` (32 icônes) ; règles du CSS `ui.css:1-4` (un seul bouton principal, arêtes nettes, chiffres en mono) | fait |
| Coque v2 | `app/console/CoqueV2.tsx` : menu en groupes « Aujourd'hui · Clients · Atelier · Ma présence · Pilotage » l.29-55, compteurs par le calcul de Mes chiffres l.65-74, barre d'état l.220, **barre du bas sur téléphone** « Aujourd'hui · Messages · Devis · Factures · Plus » l.144-149 et l.231-241 ; fond millimétré `coque-v2.css:3-5`, barre du bas fixe avec zone sûre `coque-v2.css:83` et `:94` ; bascule dans `app/AppShell.tsx:114` et `:246-284` ; `lib/consoleV2Client.ts:34-45` (une requête `/api/essais` par page) | fait |
| Accueil « Aujourd'hui » | `app/dashboard/page.tsx:49-50` (`v2 ? <Aujourdhui /> : <TableauDeBordV1 />`) ; `app/dashboard/Aujourdhui.tsx` : chargement, erreur avec Réessayer et squelettes l.56-90, bonjour l.101-104, **3 actions du jour** l.106-133, chiffres du mois l.135-152, fil d'activité l.153-166, Découvrir l.169-191, lien l.193-201, barres de six mois l.206-223 ; liserés corail / ambre / rouge `aujourdhui.css:9-17` | fait, jury « réussi » |
| Route | `app/api/aujourdhui/route.ts` : contrat l.13-28, 404 hors essai l.43, **503 et aucune donnée sur une lecture ratée** l.59-62 et l.78, demandes à répondre (nouvelles ou réponse préparée) l.70-83, factures en retard l.85-90, fil l.92-103, Découvrir l.105-124, chiffres seulement si l'offre a `chiffres` l.126-134 | fait |
| Atelier `/outils/ui` | `app/outils/ui/*` (commit `262bfcf4`) | fait, 404 drapeau baissé |
| Pages 5.4 | Devis liste et fiche, Factures, Messages, squelettes ailleurs (commits `1a671f17` → `fbefb976`) | « squelette seulement : refonte visuelle de ces écrans À FAIRE » (copie de travail `presti-refonte`, `AVANCEMENT.md`, lignes non commitées) |
| Règle graduée | — | **absente du code** ; maquettes seulement (`piste-a.css:31-36`, `:78-79` ; `accueil.html:37`) |
| `presti-design` | — | **non mis à jour** : la règle « travail = Instrument, vitrine = Cinéma » prévue à l'étape 4 (`DIRECTION.md:68-69`) n'y est pas ; `git diff 74aa7060` de la skill est vide sur les deux branches |

Ce qui empêche une fusion simple (vérifié) :
- 17 fichiers modifiés des deux côtés depuis la base, dont `app/AppShell.tsx`, `app/assistant/page.tsx`, `lib/flags.ts`,
  `app/globals.css`, `app/page.tsx`, `scripts/assistant-qa.mjs` (`git diff --name-only` des deux côtés, comparés).
- `scripts/assistant-qa.mjs:1018` sur `main` exige `ESSAI = {}` : mettre `consoleV2` en essai le fait rougir. La branche a
  déjà le correctif (`3c591d88`, même assertion réécrite : « l'assistant n'est plus dans ESSAI »).
- `cadrage-p4.md` §1.4 conclut, pour la landing : « récupérable comme matière, pas comme base de merge ». La même
  conclusion vaut pour la console : on reporte les fichiers neufs tels quels et on refait à la main les 5 fichiers partagés
  (`AppShell.tsx`, `dashboard/page.tsx`, `lib/flags.ts`, `app/base.css`, `scripts/assistant-qa.mjs`), sans les deux commits TEMPORAIRES
  (`3abfb98a`, `dedfd033`).

---

## 3. Ce que la console actuelle (`main`) offre déjà

| Brique | Où | Ce qu'elle fait |
|---|---|---|
| Accueil v1 | `app/dashboard/page.tsx` | bonjour l.116, 4 compteurs de demandes l.139-160, lien de contact l.162-169, liste des demandes l.172-229 ; sans plateforme : 2 cartes d'offre l.120-136. Inchangé depuis la base (aucun diff `74aa7060..main`) |
| Assistant | `app/assistant/page.tsx` | conversation + poste à 3 onglets « À confirmer · Actions · Journal » l.252-289 ; cartes lues sous la RLS l.119-121 ; « À confirmer » = en attente non expirée l.164 ; briefing sur un bouton l.189 et l.242 ; exemples l.31-48 |
| Carte d'action | `app/assistant/CarteView.tsx:24-67` | statut, titre, lignes, avant/après, message exact, alertes ; **Confirmer / Écarter** l.57-58, **Annuler** quand elle se défait l.62, lien l.63 |
| Décisions | `app/api/assistant/actions/route.ts:16-20`, `:52` | `confirmer`, `refuser`, `annuler` ; confirmer une carte annule sa ligne de pilote l.54 |
| Moteur de conversation | `app/assistant/useConversation.ts:4`, `:49-54`, `:134` | un seul moteur, déjà partagé avec le panneau du CRM (`app/crm/assistant/PanneauAssistant.tsx:5-8`, plein écran au téléphone l.17) |
| Briefing | `lib/assistant/briefing.ts:44-101` (pur) ; exécuteur `lib/assistant/executeurs.ts:255-292` | rubriques (conversations, devis sans réponse ≥ 7 j l.35/l.60, impayés, urgents à 30 j l.37, stock sous le seuil, chantiers du jour et en retard, à facturer) ; **calculé seulement si on le demande** (outil `briefing_du_matin`) ; lectures en panne signalées l.278-289 |
| Pilote | `lib/pilote/regles.ts` | délai 10 min l.24, plafond 20/jour l.27, 24 h max l.29, 6 types l.33 et leurs libellés l.37-44, jamais automatiques l.70-73, `decisionPilote` l.139-157, « Partira dans 7 min » l.172-177 |
| File et réglages | `app/api/pilote/file/route.ts:15-41`, `app/api/pilote/reglages/route.ts:21-36`, garde `app/api/pilote/garde.ts:14-25` | lisible et annulable même hors Signature (F1) ; hors Signature, seul « couper » est permis (`reglages/route.ts:28-29`) ; drapeau baissé → 404 (`garde.ts:15`) |
| Écran du pilote | `app/parametres/SectionPilote.tsx` | interrupteur l.72-75, une case par type l.76-84, garde-fous écrits l.85-93, « Partira bientôt » + Annuler l.94-104, journal l.105-112 ; décompte 15 s et relecture 30 s l.32-37 |
| Activité visible | `app/crm/assistant/Activite.tsx:40-78`, `useActivite.ts:17-51` | 3 compteurs (faites aujourd'hui, à confirmer, partiront seules), file + Annuler, fil ; **route gardée CRM et Signature** (`app/api/crm/assistants/activite/route.ts:10`, `:17`) ; fonctions pures réutilisables `lib/crm/assistantCrm.ts:128-152` |
| Réponses préparées | `app/api/messages/route.ts:62`, `:84-96` | `valider` (avec texte modifié accepté, l.96) ou `rejeter` une proposition |
| Relances d'impayés à valider (Studio) | `app/api/factures/relances-auto/route.ts:44`, `.../a-valider/route.ts:12-14`, `:40-42` ; écran `app/factures/RelancesAuto.tsx:84` | `envoyer` (sujet et texte modifiables) ou `ecarter` ; migration `0181` |
| Devis préparés | `lib/devisAuto.ts:80-82` | brouillon `source` = `outil` ou `regle` |
| Imports (mise en route) | `app/tarifs/page.tsx:140` (tarif fournisseur), `app/inventaire/ImportCsv.tsx:1-2` (stock) | existent, aperçu puis validation |
| Drapeaux levés | `lib/flags.ts` : `assistant` l.161, `crm` l.172, `relancesImpayes` l.179, `crmAtelierVivant` l.224, `piloteAutomatique` l.243 ; essai vide l.323 | — |
| Offres | `lib/plans.ts` : `assistant` dès Studio l.75 ; Signature ajoute `plateforme.ia.auto`, `relances.auto`, `factures.relances.auto` l.80 et `assistant.pilote` l.89 ; relances « préparées » en Studio, « .auto » en Signature l.33-35 ; `peut()` l.134 | — |

**Constat** : la boîte « À valider » existe déjà en quatre morceaux (cartes, réponses préparées, relances d'impayés, devis
préparés), et le niveau d'autonomie se règle à quatre endroits (pilote dans Paramètres, relances dans Factures, mode de réponse
dans Ma plateforme `lib/plateformeConfig.ts:45` et `:183-185`, validation automatique du CRM). L'écran les réunit ; il n'en
réécrit aucun.

---

## 4. Réutilisable tel quel

| Pour l'écran | Pièce existante | Où |
|---|---|---|
| Coque, menu, barre du bas, barre d'état, Ctrl+K | `CoqueV2` | `refonte-1018:app/console/CoqueV2.tsx:76-247`, `coque-v2.css` |
| Bonjour, erreur sans zéros, squelettes | `Aujourdhui` (parties) | `refonte-1018:app/dashboard/Aujourdhui.tsx:56-104` |
| Rangée des 3 priorités, liserés par urgence | `.aj-prio`, `.aj-action` | `refonte-1018:app/dashboard/Aujourdhui.tsx:106-133`, `aujourdhui.css:8-24` |
| Chiffres du mois, barres | `Carte`, `TuileChiffre`, `Barres` | `refonte-1018:app/dashboard/Aujourdhui.tsx:135-152`, `:206-223` |
| Découvrir (aube), lien de contact | carrousel, carte « Votre lien » | `refonte-1018:app/dashboard/Aujourdhui.tsx:169-201` (textes à corriger : §9) |
| Données des 3 actions, chiffres, fil, Découvrir | `GET /api/aujourdhui` | `refonte-1018:app/api/aujourdhui/route.ts:40-149` |
| Cartes, états vides, squelettes, pastilles d'offre, onglets, accordéon, toasts | `components/ui/*` | §2 |
| Calcul du point du jour, sans modèle | `composerBriefing` + `executeursDeSession(ctx).briefing_du_matin()` | `lib/assistant/briefing.ts:44-101`, `lib/assistant/executeurs.ts:96`, `:255-292` ; contexte fourni par `gardeAssistant` (`lib/assistant/garde.ts:16-34`, `lib/assistant/session.ts:8-16`) |
| Contenu d'une carte à valider | type `Apercu` / `CarteAction` | `lib/assistant/cartes.ts:25-51` ; rendu `app/assistant/CarteView.tsx:24-67` |
| Décisions en un geste | routes existantes | cartes `app/api/assistant/actions/route.ts:16-20` ; réponses `app/api/messages/route.ts:84-96` ; relances `app/api/factures/relances-auto/a-valider/route.ts:40-42` |
| « Partira dans … », Annuler, Tout arrêter | file et réglages du pilote | `lib/pilote/regles.ts:172-177`, `app/api/pilote/file/route.ts:15-41`, `app/api/pilote/reglages/route.ts:21-36` |
| Libellés lisibles | types, motifs, statuts | `lib/pilote/regles.ts:37-44`, `:111-124` ; `app/parametres/SectionPilote.tsx:15` ; `app/assistant/CarteView.tsx:12-20` ; `lib/crm/assistantCrm.ts:96-98` |
| Fil « fait pour vous » et compteurs | `filActivite`, `compteursActivite`, `quandLisible` | `lib/crm/assistantCrm.ts:128-152`, `:200-206` (purs : réutilisables hors CRM) |
| Garde-fous écrits | texte de la note | `app/parametres/SectionPilote.tsx:85-93` |
| Rythme de relecture | battement 15 s, relecture 30 s si visible | `app/crm/assistant/Activite.tsx:19-24`, `useActivite.ts:17-18`, `:36-41` |
| Conversation dans une feuille | moteur commun | `app/assistant/useConversation.ts:134` ; modèle d'interaction `PanneauAssistant.tsx:16-17` |

---

## 5. Ce qui manque

| Manque | Pourquoi c'est bloquant pour l'écran | Dépend de | Remarque |
|---|---|---|---|
| Une route d'accueil qui réunit tout | aujourd'hui 4 sources « à valider », la file du pilote et le briefing demandent 6 lectures séparées ; la route de la branche rend 503 pour tout dès qu'une lecture échoue (`route.ts:59-62`) | rien (lectures de tables existantes) | une réponse par section, chacune avec son état (`ok`, `indisponible`, `hors offre`) : une panne ne vide pas tout l'écran |
| Lignes du briefing structurées | `SectionBriefing.lignes` est un `string[]` (`briefing.ts:42`) : pas d'identifiant, donc pas de lien vers l'objet ni de dédoublonnage avec « À valider » | rien | ajouter `{ id, type, href, montant, jours }` à côté du texte, même calcul |
| « Fait pour vous » hors CRM | la seule route d'activité exige le CRM et Signature (`activite/route.ts:10`, `:17`) ; Studio n'a rien | rien | réutiliser `filActivite` / `compteursActivite` sur `assistant_actions` (actions, pas lectures) + `actions_auto` |
| Composant règle graduée | signature de la piste A, absente du code | rien | 10 crans pour le délai d'annulation, 31 pour le mois (maquette `accueil.html:37`) ; `aria-hidden`, le texte « Partira dans 7 min » reste lu |
| « Modifier » sur une carte de l'assistant | `POST /api/assistant/actions` ne connaît que confirmer, refuser, annuler (l.36) | P2 (`opportunites`, `opportunites_decisions` : `cadrage-p3.md` §5.2) | existe déjà pour les réponses préparées (`messages/route.ts:96`) et les relances (`a-valider/route.ts:40`) |
| « Plus tard », « Refuser » avec motif, « Ne plus me proposer » | absents partout ; une carte expire en 24 h (`cartes.ts:18`) | P2 / P3 (`opportunites.reportee`, `detecteurs_reglages`) | demandés par l'annexe, couche 6 (`PROMPT-AUTOMATISATION-ARTISAN.md:242-246`) |
| Validation par lot | aucune route | P2 | « Envoyer les 4 relances » : côté serveur, clé d'idempotence par élément |
| Niveau 1 « me le signaler seulement » | aucun stockage : `pilote_reglages` ne dit que « part seul » ou non (`regles.ts:80-92`) | P3 (`autonomie_reglages`, `cadrage-p3.md:209-226`) | d'ici là, la position n'apparaît pas (« une fonctionnalité non finie n'apparaît pas ») |
| Un réglage unique par geste | « Réponses aux demandes » part seule par deux chemins (mode « auto » de Ma plateforme, `plateformeConfig.ts:183-185`, et type `reponse_prospect` du pilote) ; « Relances d'impayés » aussi (passage quotidien `factures.relances.auto`, `plans.ts:33-35`, et type `relance_impaye`) | P3 (`autonomie_reglages` « généralise `pilote_reglages` », `cadrage-p3.md` §5.2) | en v1 : la ligne du pilote, plus un lien vers le réglage qui vit ailleurs |
| Briefing poussé le matin | aucun type « briefing » (`lib/notificationsTypes.ts:5-11`), aucun déclencheur | P2 (n8n sur Oracle qui tire, `analyse-videos.md:1443` ; défaut 7 h 30, `cadrage-p3.md` Q7) | l'interrupteur n'apparaît sur l'écran qu'une fois l'envoi prouvé |
| Pièce jointe dans la conversation | `/assistant` n'a aucun champ fichier (`analyse-videos.md:1010`) | chantier 4, plus tard | ne pas dessiner de trombone avant |
| Mise en route d'un compte vide | rien ne guide ; le compte fondateur avait 0 tarif, 0 facture, 0 chantier, 0 stock le 29/10 (annexe 1 §D, non revérifié) | couche 0 | l'état vide renvoie vers les imports existants (§4) |
| Offre « Presti pour l'entreprise » | absente de `PlanId` (`lib/plans.ts:14`) | P5 (argent : session principale) | l'écran lit `peut()` : rien à prévoir de plus |
| Règle « travail = Instrument » dans `presti-design` | la skill ne la porte pas (§2) | rien | à écrire par l'agent principal |

---

## 6. Arborescence de l'écran (mobile d'abord)

Route `/dashboard`, entrée de menu « Aujourd'hui » (`refonte-1018:app/console/CoqueV2.tsx:32`), drapeau `consoleV2`.
Ordre de l'annexe 2 §5 (point du jour, À valider, fait seul, réglage), avec la zone de conversation près du haut, comme le
demande le prompt (« L'assistant IA est au centre de l'expérience », `p3-assistant.md:20`).

```text
Aujourd'hui                                                   [+ Devis]            ← en-tête de la coque v2
│
├─ 1. Bonjour, <nom>                                            (une ligne, chiffres en mono)
│     « 3 à valider · 1 part seul dans 7 min · 4 faites pour vous »  |  rien : « Rien n'attend votre clic. »
│
├─ 2. Demander à l'assistant                                    (Studio et au-dessus : capacité `assistant`)
│     [ Dites ce qu'il y a à faire…            ]  → la conversation s'ouvre (feuille plein écran au téléphone)
│     3 suggestions « à compléter » (EXEMPLES_ACTION, app/assistant/page.tsx:38-43)
│
├─ 3. Le point du jour                                          (calculé par le code : 0 appel au modèle, 0 crédit)
│     ┌ 3 priorités en rangée d'instruments (liseré rouge : urgent · ambre : à relancer · corail : client qui attend)
│     │   n en mono · ce que c'est · qui · [geste]  → ouvre l'objet ou la boîte « À valider » filtrée
│     └ « Tout le point du jour » (replié) : rubriques du briefing, une ligne par objet, un lien chacune
│
├─ 4. À valider                                                 (la boîte unique ; argent en jeu, puis client qui attend)
│     ├ Réponses préparées à vos demandes      [Envoyer]  [Modifier]  [Écarter]
│     ├ Relances d'impayés préparées           [Envoyer]  [Modifier]  [Écarter]
│     ├ Préparé par l'assistant                [Confirmer]  [Écarter]  (lien « Ouvrir » de la carte)
│     └ Devis préparés à relire                [Relire]  → /devis/<id>
│     chaque carte : le constat en une ligne · client · montant TTC (mono) · depuis combien de jours
│                    · le texte exact qui partira (replié) · « ce qui se passe après votre clic »
│
├─ 5. Part tout seul                                            (Signature + `piloteAutomatique`)
│     ├ « Partira dans 7 min — Relance facture F-031 »   ▕▏▏▏▏▏▏▏▏▏▕ (règle graduée, 10 crans)   [Annuler]
│     ├ [Tout arrêter]  coupe le pilote et annule tout ce qui attend, immédiatement
│     └ Fait pour vous aujourd'hui  |  Activité            (onglets)
│         parti seul · fait par l'assistant [Annuler quand ça se défait] · renvoyé à la main (motif lisible)
│     Studio : « En Studio, rien ne part sans votre clic. »  + pastille « Disponible avec Signature »
│
├─ 6. Vos chiffres du mois                                      (capacité `chiffres`, dès Studio)
│     4 tuiles (Facturé, En attente, En retard, Devis acceptés) + 6 barres · « Mes chiffres → »
│
├─ 7. Ce que l'assistant fait seul                              (replié ; un réglage par type d'action)
│     Réponses aux demandes        ( Je valide | Part seul après 10 min )
│     Relances de devis            ( Je valide | Part seul après 10 min )
│     Relances d'impayés           ( Je valide | Part seul après 10 min )   + lien « Relances automatiques » (Factures)
│     Envoi de devis               ( Je valide | Part seul, si tous les prix viennent de vos tarifs )
│     Envoi de factures émises     ( Je valide | Part seul après 10 min )
│     Autres messages à vos clients( Je valide | Part seul après 10 min )
│     Toujours vrai : jamais un prix estimé, jamais un paiement, 20 envois seuls par jour au plus, rien deux fois.
│
├─ 8. Découvrir                                                 (carrousel, aube ; seulement ce qui est levé et pas utilisé)
└─ 9. Votre lien de contact                                     [Copier]
```

Sur ordinateur (à partir de 1100 px) : 1 et 2 en pleine largeur ; colonne gauche 3 et 4 ; colonne droite 5, 6 et 7 ;
8 et 9 en pleine largeur. La conversation s'ouvre en panneau à droite.

### 6.1 Les données et les gestes, section par section

| § | Données affichées (source) | Geste en un clic (route) | Visible si |
|---|---|---|---|
| 1 | compteurs des §4 et §5, calculés côté serveur ; nom `artisans.nom` (`refonte-1018:app/api/aujourdhui/route.ts:46`) | — | toujours |
| 2 | — | envoi au moteur commun (`useConversation.ts:134`) ; les cartes produites arrivent dans le §4 (même identifiant : `app/assistant/page.tsx:84`) | `peut(plan,'assistant')` (`lib/plans.ts:75`) et drapeau `assistant` ; sinon pastille d'offre |
| 3 | `briefing_du_matin()` appelé par la route d'accueil avec le contexte de `gardeAssistant` ; on n'affiche que `titre`, `nombre` et les lignes, **jamais** `actions_possibles` (noms d'outils, `briefing.ts:55`, `:62`, `:68`, `:72`, `:78-80`) ni `a_savoir` (`:99`) ; sans assistant (compte Essai) : les 3 actions de la branche (`route.ts:70-90`) | ouvrir l'objet ; « Préparer les relances » passe par l'assistant et **coûte des crédits** (`CREDIT_COST`, `lib/plans.ts:116`) : le bouton le dit | toujours (contenu selon l'offre) |
| 4a | `assistant_actions` en attente et non expirées (`app/assistant/page.tsx:119-121`, `:164`) | `POST /api/assistant/actions { confirmer | refuser }` | drapeau `assistant` |
| 4b | `messages.etat = 'proposition'` des demandes ouvertes (`refonte-1018:app/api/aujourdhui/route.ts:73-81`) | `POST /api/messages { action: 'valider' | 'rejeter', message? }` (l.62, l.84-96) | `plateforme.conversation` (dès Studio) |
| 4c | `relances_impayes` au statut `a_valider` (`app/api/factures/relances-auto/route.ts:44`) | `POST /api/factures/relances-auto/a-valider { relance_id, action: 'envoyer' | 'ecarter', sujet?, texte? }` (l.40-42) | drapeau `relancesImpayes` (`lib/flags.ts:179`), migration `0181` |
| 4d | `devis` en brouillon, `source` `outil` ou `regle` (`lib/devisAuto.ts:80-82`) | « Relire » → `/devis/<id>` (l'envoi d'un devis est irréversible : il se fait dans l'écran Devis ou par une carte) | toujours |
| 5 | `GET /api/pilote/file` → `{ reglages, attente, recentes, delai_min, signature }` (`file/route.ts:11`, `:15-24`) ; actions directes exécutées avec de quoi se défaire (`CarteView.tsx:62`, `lib/assistant/confirmation.ts:138-157`) | Annuler une ligne : `POST /api/pilote/file { id, decision: 'annuler' }` (l.26-41 ; 409 → « déjà partie ou déjà annulée », `useActivite.ts:50`) ; Tout arrêter : `PUT /api/pilote/reglages { actif: false }` (annule toute la file, `lib/pilote/regles.ts:19`) ; Annuler une action directe : `POST /api/assistant/actions { annuler }` | `piloteAutomatique` (`lib/flags.ts:243`) ; contrôles actifs si `signature` vrai |
| 6 | `refonte-1018:app/api/aujourdhui/route.ts:126-134` (même calcul que Mes chiffres) | « Mes chiffres → » | `peut(plan,'chiffres')` ; sinon carte d'offre (`Aujourdhui.tsx:147-151`) |
| 7 | `GET /api/pilote/reglages` ; types et libellés `regles.ts:33`, `:37-44` | `PUT /api/pilote/reglages` (un type à la fois, comme `SectionPilote.tsx:80`) | `piloteAutomatique` ; hors Signature, position « Part seul » verrouillée (`reglages/route.ts:28-29`) |
| 8 | `refonte-1018:app/api/aujourdhui/route.ts:105-124` | vers l'écran ou l'offre | au moins une fonctionnalité levée non utilisée |
| 9 | `urlPlateforme()` | Copier + toast « Lien copié » | slug présent |

**Le délai de 10 minutes se lit avant le départ, pas après.** Le pilote ne fait rien partir plus tôt et rien sans l'avoir
montré (`lib/pilote/regles.ts:3-7`) : un e-mail parti ne se rattrape pas. L'écran écrit donc « Partira dans 7 min »
(`regles.ts:172-177`), jamais « Envoyé, annulable ». Seules les actions internes (brouillon, tarif, stock, tâche) se défont
après coup, sans limite de temps (`confirmation.ts:138-157`).

**Le point du jour ne répète pas « À valider ».** Une relance déjà préparée n'est pas listée une seconde fois comme « à faire » :
le dédoublonnage demande les identifiants qui manquent aux lignes du briefing (§5).

---

## 7. États vides et dégradés

Règle de la branche, à garder : une lecture ratée ne s'affiche jamais en zéros (`refonte-1018:app/api/aujourdhui/route.ts:27`,
`Aujourdhui.tsx:67`, `:79-80`) ; une valeur absente s'écrit « — » (`components/ui/base.tsx:3`). `EtatVide` dit ce que fait
l'écran et donne le premier geste (`base.tsx:119-130`).

| Cas | Ce qu'on montre | Premier geste |
|---|---|---|
| Chargement | squelettes de la branche (`Aujourdhui.tsx:82-86`) | — |
| Panne d'une section | « Le stock n'a pas pu être lu. » à la place de la section, le reste s'affiche | Réessayer |
| Panne d'une lecture du briefing | jamais « rien à signaler » quand `lectures_indisponibles` est présent (`executeurs.ts:278-289`) | Réessayer |
| Hors ligne | barre d'état « Hors ligne » (`base.tsx:96-104`, `CoqueV2.tsx:97-101`) ; gestes désactivés | — |
| Compte vide (aucun tarif, devis, facture, stock) | « Votre assistant n'a encore rien à préparer : il lui faut vos tarifs et vos clients. » | Importer un tarif (`/tarifs`) · Ajouter du stock (`/inventaire`) · Faire un premier devis |
| À valider vide | « Rien n'attend votre clic. Les réponses, relances et devis que l'assistant prépare arrivent ici. » (même esprit que `app/assistant/page.tsx:263`) | — |
| Part tout seul, pilote coupé | « Rien ne part sans votre clic. » (`SectionPilote.tsx:74`) | Choisir ce qui part seul (ouvre le §7) |
| Part tout seul, rien en attente | « Rien ne partira seul pour l'instant. » (`Activite.tsx:49`) | — |
| Fait pour vous vide | « Rien encore aujourd'hui. » | Demander à l'assistant |
| Point du jour vide (`rien_a_signaler`, `briefing.ts:89`) et lectures toutes réussies | « Rien à signaler ce matin. » | — |
| Compte Essai (sans plateforme ni assistant) | les 3 actions de la branche + pastilles « Disponible avec Studio » (`base.tsx:133-138`) | Voir les offres |
| Studio | §5 réduit à une phrase et une pastille Signature ; §7 visible, position « Part seul » verrouillée | Voir l'offre Signature |
| Compte rétrogradé avec une file encore pleine | file lisible, Annuler et Tout arrêter actifs, activation refusée (F1, `garde.ts:5-6`) | Annuler |

---

## 8. Mobile d'abord

- **Base 390 px**, puis `@media (min-width:900px)` et `(min-width:1100px)` : les seuils de la coque (barre du bas jusqu'à
  900 px, `coque-v2.css:83` ; barre d'état masquée sous 1100 px, l.82). Le CSS de la branche est écrit à l'envers
  (`max-width`, `aujourdhui.css:58-74`) : les sections neuves s'écrivent de la petite largeur vers la grande.
- **Cibles tactiles d'au moins 44 px** pour le geste principal d'une carte : `.ui-btn` fait 36 px (`ui.css:7`), `.ui-btn--xs`
  30 px (`ui.css:19`) ; sur téléphone, le geste principal prend la largeur de la carte.
- **Un seul bouton principal par écran** (`ui.css:3`) : je propose que ce soit le geste de la première carte « À valider »
  quand la boîte n'est pas vide, et « + Devis » sinon (à valider par Benj, §11).
- **La barre du bas reste** (« Aujourd'hui · Messages · Devis · Factures · Plus », `CoqueV2.tsx:144-149`) ; pas de bouton
  flottant par-dessus. Le bas du contenu laisse la place de la barre et de la zone sûre (`coque-v2.css:94`) : à vérifier en 390.
- **La conversation s'ouvre en feuille plein écran** au téléphone, avec le focus gardé et Échap pour fermer (le modèle du
  panneau du CRM, `PanneauAssistant.tsx:16-17`).
- **Densité « instrument »** : listes bornées à 5 lignes au téléphone (comme `aujourdhui.css:72`), « Tout voir » pour la suite ;
  chiffres et décomptes en JetBrains Mono (`ui.css:23`) ; une seule lueur au survol et au focus ; aucune ombre hors ce qui flotte.
- **Aucun défilement de côté en 390** (contrôle mécanique de la refonte, `DIRECTION.md:21-23` ; correctifs `f17081fc`).
- **Mouvement réduit** : durées à 0 (`base.css:87`), compteurs à leur valeur finale (`base.tsx:36`), décompte en texte seulement.
- **Pas de verre** (`backdrop-filter`) : il coûte cher sur un téléphone d'entrée de gamme (`DIRECTION.md:52`) ; l'aube reste
  réservée à « Découvrir » (`aujourdhui.css:1-2`, `:45`).
- **Une seule requête d'ouverture**, puis relecture toutes les 30 s quand l'onglet est visible et un battement de 15 s pour les
  décomptes (`useActivite.ts:17-18`, `:36-41` ; `Activite.tsx:19-24`) : la console est l'écran le plus utilisé, « sur téléphone,
  en extérieur » (`DIRECTION.md:75-76`).

---

## 9. Vocabulaire devant l'artisan

**Jamais** (prompt `p3-assistant.md:49`, annexe 1 §F `:503`, annexe 2 §5 `:593`) : agent, workflow, n8n, MCP, prompt, LLM,
pipeline. **Ni les mots internes de ce chantier** : détecteur, opportunité, file, idempotence, tic, outil, palier, modèle,
Hermes, Orca. Les dix « agents » du prompt restent invisibles : l'artisan ne voit qu'**un** assistant (annexe 2 §3.4 : ils
« deviennent des familles d'outils et de détecteurs de l'assistant existant »).

**Les mots de l'écran** : « l'assistant a préparé », « à valider », « Envoyer », « Écarter », « Partira dans 7 min »,
« Annuler », « Tout arrêter », « Fait pour vous », « Je valide », « Part seul après 10 min », « Rien n'attend votre clic ».
Le mot « automatique » se dit selon l'offre (Studio : « préparé automatiquement, vous validez » ; Signature : « part seul »),
comme la grille (`lib/plans.ts:226-227`, `:239-240`).

**Pièges relevés dans les textes actuels** (à ne pas recopier sur l'accueil) :
- le journal de `/assistant` affiche la valeur brute `ok` / `refus` / `erreur` dans sa pastille (`app/assistant/page.tsx:279`) ;
- son titre nomme le fournisseur du modèle (« assistant IA (Claude, Anthropic) », `page.tsx:180`) ; la transparence RGPD est
  dans la note sous la saisie (`page.tsx:248`), qu'on garde dans la feuille de conversation, pas dans un titre ;
- le choix « Modèle » et ses crédits par message (`page.tsx:237-241`) reste sur `/assistant`, pas sur l'accueil ;
- sans titre, le fil d'activité affiche le nom brut de l'outil (`a.outil.replace(/_/g, ' ')`, `lib/crm/assistantCrm.ts:136`) ;
- le résumé du briefing parle de « rubrique(s) » et de « lecture(s) indisponible(s) » (`executeurs.ts:290`) : texte pour le
  journal, pas pour l'écran ;
- **deux textes de « Découvrir » sur la branche sont devenus faux depuis le 25/10** : « Les impayés se relancent seuls »
  (`refonte-1018:app/dashboard/Aujourdhui.tsx:36`) ne vaut plus qu'en Signature (Studio : relances préparées, `lib/plans.ts:33-35`,
  migration `0181`) ; « Tout ce qui part chez un client attend votre confirmation » (`Aujourdhui.tsx:38`) est faux en
  Signature avec le pilote (`lib/pilote/regles.ts:3-7`). Ils doivent dépendre de l'offre.

---

## 10. Le drapeau : `consoleV2`

**Recommandation : réutiliser `consoleV2`**, comme le demande l'annexe 2 §5 (« vérifie si `consoleV2` existe déjà sur la branche
`refonte-1018` avant d'en créer un »). Il existe, il porte déjà l'accueil « Aujourd'hui » jugé « réussi » par le jury, et un
second drapeau ferait vivre deux accueils concurrents.

1. **Le porter sur `main` baissé**, avec l'essai pour le fondateur et le compte de démonstration : `consoleV2: false` et
   `ESSAI = { consoleV2: true }`, comme au commit `3c591d88` (`3c591d88:lib/flags.ts:187`, `:202`). Le mécanisme existe sur `main`
   (`lib/flags.ts:318-325`, `lib/essais.ts:10-11`, `app/api/essais/route.ts:8-13`).
2. **Ne jamais porter `3abfb98a` ni `dedfd033`** (levées en dur « pour la prévisualisation »).
3. **Adapter `scripts/assistant-qa.mjs:1018`** (exige un essai vide) comme la branche l'a fait.
4. **À l'intérieur de l'écran, les drapeaux déjà levés sur `main` gardent leur rôle** : `assistant` (§2, §4a), `piloteAutomatique`
   (§5, §7), `relancesImpayes` (§4c), `crm` (rubriques CRM du §3). Les verrous d'offre restent côté serveur (`peut()`,
   `lib/plans.ts:134`) ; les pastilles ne sont qu'une présentation (`base.tsx:132-138`).
5. **Les données futures ont leur propre drapeau, créé avec leur migration** (migration collée PUIS drapeau levé,
   `.claude/rules/migration-production.md`) : quand la boîte lira `opportunites` (P2), le cadrage propose `boiteAValider`
   (`cadrage-p3.md:355`) ; le niveau 1 et le réglage unifié suivront `autonomie_reglages` (P3). L'écran ne change pas de drapeau.

Option écartée : un drapeau neuf (par exemple `accueilAssistant`) qui poserait l'accueil neuf dans la coque actuelle. Il éviterait
de porter la coque v2, mais mêlerait deux systèmes visuels sur le même écran, et l'annexe demande de partir de `consoleV2`.

---

## 11. Ordre de construction proposé (pas réversibles, chacun compilable et déployable)

1. **Porter la matière de la branche** sur `main`, sans fusion : fichiers neufs tels quels (`components/ui/*`,
   `app/console/*`, `lib/consoleV2Client.ts`, `app/dashboard/Aujourdhui.tsx`, `aujourdhui.css`, `app/api/aujourdhui`,
   `app/api/console/recherche`, bloc de jetons de `app/base.css`) ; les 5 fichiers partagés refaits à la main ; `consoleV2`
   baissé et en essai ; textes de « Découvrir » selon l'offre.
2. **Étendre `GET /api/aujourdhui`** en route d'accueil, une réponse par section : point du jour (`executeursDeSession`),
   les 4 sources « À valider », la file et les réglages du pilote, « Fait pour vous ».
3. **Sections** : À valider (le contenu de `CarteView` dans une `Carte` v2), Part tout seul avec la règle graduée, point du jour,
   réglage par type à deux positions.
4. **La feuille de conversation** sur l'accueil (moteur commun).
5. **Tests hors ligne, capables de rougir, inscrits dans `SUITES`** (`scripts/tout-verifier.mjs`) : 4 sources → cartes, tri par
   argent en jeu, dédoublonnage, aucun mot interdit dans les textes rendus, Studio sans contrôle « Part seul » actif,
   « Partira dans … » jamais « Envoyé », panne d'une section sans zéros ; mutation prouvée.
6. **Avec P2 et P3** (après leurs migrations) : `boiteAValider`, Modifier / Plus tard / motif / lot, niveau 1, briefing poussé.

Le build, la prévisualisation et le passage du jury reviennent à l'agent principal (interdits aux sous-agents, `.claude/rules/securite.md`).

---

## 12. Incohérences relevées (à corriger ou à trancher)

- **Le seuil d'un devis à relancer diffère d'un écran à l'autre** : `jours > 7` et dans sa validité pour l'accueil et Mes chiffres
  (`lib/tableau-de-bord/calculer.ts:115`, `:309`), `jours >= 7` sans borne de validité pour le briefing (`lib/assistant/briefing.ts:35`,
  `:60`). Sur un même accueil, un devis envoyé il y a 7 jours pile, ou expiré, compterait dans le point du jour et pas dans
  « À relancer » : la règle « deux chiffres, un écran » casse. Un seul calcul doit nourrir les deux.
- Commentaires restés à « Signature » alors que l'assistant est en Studio depuis le 25/10 (`lib/plans.ts:73-75`) :
  `lib/assistant/acces.ts:1` et `:8`, `app/crm/assistant/PanneauAssistant.tsx:12`. Le code, lui, lit bien `peut()`.
- La note du vault « Refonte 18-10 pistes A et B » dit « le choix de Benj n'est pas tracé dans `plans/` » : il l'est sur la branche
  (`refonte-1018:plans/refonte-1018/AVANCEMENT.md:24`, commentaire `refonte-1018:lib/flags.ts:182`) et dans `qg/PASSATION-19-10.md` §3.
  La copie de `plans/refonte-1018/` sur `main` est non suivie et date du 18/10 (`git status` : `?? plans/refonte-1018/`).
- `JURY.md` et les 7 dernières lignes d'`AVANCEMENT.md` ne vivent que dans la copie de travail `C:/Users/benja/Documents/presti-refonte`
  (non commités) : perdus si cette copie disparaît.

---

## 13. Points à valider par Benj (chacun avec un défaut)

1. **Porter la coque v2 entière avec l'accueil, en essai sur son compte et le compte de démonstration ?** Défaut : oui.
2. **Le niveau 1 (« me le signaler seulement ») se montre-t-il avant les détecteurs ?** Défaut : non, il apparaît avec eux.
3. **Le bouton principal de l'écran** : le geste de la première carte « À valider » quand il y en a une. Défaut : oui, sinon « + Devis ».
4. **Le point du jour se calcule à l'ouverture, sans modèle et sans crédit ; « Préparer les relances » passe par l'assistant et
   affiche son coût.** Défaut : oui.

---

## 14. Ce que je n'ai pas pu vérifier

- Les planches et captures PNG (`presti-ops/refonte-1018/pistes/planche-accueil-390.png`…) : la garde de lecture du dépôt a refusé
  l'image. Je m'appuie sur `DIRECTION.md`, `ARCHITECTURE.md` §2.3, `AVANCEMENT.md` et `JURY.md`.
- Aucun build, typecheck ni test (consigne de lecture seule et RAM de 7,9 Go).
- Les conflits de fusion ne sont pas simulés : `git merge-tree --write-tree` écrirait des objets dans `.git`, écarté. Seule la liste
  des 17 fichiers touchés des deux côtés est prouvée.
- Aucune donnée de production lue : les comptes « 0 ligne » du 29/10 viennent de l'annexe 1 §D, non revérifiés.
- La prévisualisation Vercel de la branche n'a pas été ouverte (réseau, jeton propre à chaque déploiement).
- Le bas de page de la coque au téléphone (place de la barre du bas et de la zone sûre) n'est pas vérifié en rendu.
