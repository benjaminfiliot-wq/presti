# L'outil de gestion — tout passe par le CRM (tâche 036-020, prompt 6, 03/11/2026)

Demande de Benj, 03/11 : « tu vires tout ce qui va être devis, facture et tout, et tout va dans l'outil de gestion : là tu peux aller sur son
CRM 3D ou voir le dashboard normal, et après tu peux accéder à tes devis et tout. »

## Ce qui change (navigation et point d'entrée seulement)
- **Menu principal** (`app/AppShell.tsx`, tableau `NAV`) : Tableau de bord, Messages, Outil de gestion, Mes chiffres, Ma page, Ma plateforme,
  Abonnement, puis Réponses instantanées et l'assistant. Sortis : Devis, Factures, Mes tarifs, Inventaire.
- **Outil de gestion** = `/crm` sans paramètre (`app/crm/Gestion.tsx`) : deux portes, « CRM 3D » (`/crm?vue=atelier`) et « Tableau de bord »
  (`/dashboard`), puis les écrans métier : Devis, Factures, Mes tarifs, Stock (`/inventaire`), Clients, Chantiers, Planning (drapeau
  `crmPlanning`), Équipe et véhicules, Pipeline, Mes chiffres. L'écran ne lit aucune donnée : il s'ouvre pour tous les comptes (le CRM 3D est
  Signature ; la porte l'annonce par un badge).
- **CRM 3D** : l'atelier vivant du 20/10 (`app/crm/atelier/`, three chargé à la demande, repli 2D, mouvement réduit respecté), inchangé ; en
  plus la fiche de chaque objet porte la ligne « fait : … » (`app/crm/atelier/LigneFait.tsx`, même fil que le poste des assistants, seulement
  les actions « faites » sur cet objet, sinon « rien de récent »).
- Dans le CRM, un lien « ← Outil de gestion » ramène au choix.

## Ce qui ne change pas
Aucune route, page ni fonction supprimée : `/devis`, `/factures`, `/tarifs`, `/inventaire`, `/chiffres`, `/crm?vue=…` répondent comme avant
(le juge compare aux 273 pages et routes du dernier commit). Les écrans `app/systeme/` restent derrière leur drapeau baissé.

## Choix à connaître
- « Mes chiffres » reste au menu : `scripts/tableau-de-bord-qa.mjs` (TB-15) et `scripts/ecrans-offre-qa.mjs` l'exigent, hors périmètre ; il est aussi
  listé dans l'outil de gestion.
- « À valider » n'est pas au menu : l'écran n'existe que dans `app/systeme/` (drapeau `systemeAgents` baissé) ; à ajouter quand il sera levé.
- Vidéos du 01/11 (`plans/analyse-videos.md` l.933 « Excel est mort », l.1051 « Blitz », l.672 « Arrêtez de construire des CRM ») : un monde 3D
  cliquable de l'entreprise, produit d'abord, geste d'interface par action. L'atelier existant les remplit déjà (chantiers, clients via
  chantiers, stock par catégories, équipe, véhicules, assistants) ; je n'y ai pas touché au-delà de la ligne « fait ».
