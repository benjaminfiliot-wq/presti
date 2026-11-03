## Ressources utilisées
- **MCP cerveau** (`regles_pour` sur « modifier le menu principal et le CRM 3D » : aucune règle spécifique ; `chercher` : aucune note) — rien n'a contraint le travail, les règles du dépôt (`.claude/rules/`) ont servi.
- **Skill presti-design** : accent corail uniquement, jetons de `app/base.css` (`--accent-tint`, `--surface`, `--ease-out`…), mouvement court et coupé en `prefers-reduced-motion`, densité d'un outil de travail.
- **plans/analyse-videos.md** (l.933 « Les tableaux Excel viennent officiellement de mourir », l.1051 accueil 3D « Blitz », l.672 « Arrêtez de construire des CRM avec l'IA ») : le produit d'abord, un monde cliquable ; l'atelier 3D existant les remplit déjà, la fiche gagne la ligne « fait : ».
- **Code existant** `app/crm/atelier/` (Scene3D, Atelier, Panneau, `useActivite`), `lib/crm/assistantCrm.ts` : réutilisés, pas réécrits.
- Non utilisés, faute d'écran : skills threejs-webgl / emil-design-eng (pas de nouvelle scène 3D à écrire), MCP n8n (aucune automatisation).

## Ce qui a été fait
- `app/AppShell.tsx` : Devis, Factures, Mes tarifs, Inventaire sortis du menu ; « CRM atelier » devient « Outil de gestion » (sans badge Signature) ; hunks 032-041 (coque v2) intacts.
- `app/crm/Gestion.tsx` (neuf) : deux portes « CRM 3D » / « Tableau de bord », puis tous les écrans métier. `app/crm/page.tsx` : `/crm` sans paramètre l'ouvre, avec `?vue=` / `?exemple=1` / `?mesure=1` le CRM d'avant ; lien « ← Outil de gestion ».
- `app/crm/atelier/LigneFait.tsx` (neuf) + `Panneau.tsx` : la ligne « fait : … » dans la fiche de chaque objet. `app/crm/crm.css` : styles.
- `scripts/outil-gestion-qa.mjs` (juge) et `plans/011-cadrage-01-11/p6-signature/outil-gestion.md`.

## Preuves (sorties de commandes, Oracle, 03/11)
- `node scripts/outil-gestion-qa.mjs` : 44/44, 5 mutants tués sur 5 (écran inatteignable, route supprimée, porte 3D absente, « Devis » au menu, scène 3D débranchée).
- `npx tsc --noEmit` : sortie vide, code 0.
- Suites voisines rejouées : `ecrans-offre-qa` 1 échec (page publique plateforme, sans lien avec ce lot), `aide-videos-qa` : menu → vidéo vert, échecs seulement sur les fichiers .mp4 absents de cette copie, `crm-qa` : G10 (`app/console/clients/page.tsx`, coque v2) ; `tableau-de-bord-qa` B/C (coque v2) et `accueil-qa` mutants M9-M15 : tous hors périmètre, non touchés. Je n'ai pas de rejeu « avant » (git stash interdit) : à comparer au PC.

## Limites, à dire franchement
- **Aucune capture 390/1440 px** : pas de build ni de serveur ici (gardes). Le juge est statique ; le rendu réel (portes, grille, fiche « fait ») reste à voir au PC.
- Le surlignage du menu sur `/devis` et `/factures` (leur `active`) ne se fait plus : ces pages sont hors périmètre ; et la visite guidée (`app/Visite.tsx`, cible `nav-devis`) vise une entrée disparue — à régler hors de ce lot.
- `/dashboard` n'a pas de barre d'accès à l'outil de gestion (hors périmètre) : on y revient par le menu.
- La ligne « fait » ne voit que les 12 dernières actions du fil des assistants.
