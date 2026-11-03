# 036-033 — « Mes outils » : le bouton « Connecter » dans l'outil de gestion

## Ressources utilisées

| Ressource | Ce qu'elle a changé |
|---|---|
| MCP `cerveau` · `regles_pour` | M'a rendu `decisions-benj-0311-apres-midi` : « tout passe par l'outil de gestion, pas d'écrans neufs ». Les écrans `app/systeme/` sont jugés inutiles et restent derrière leur drapeau. Conséquence : l'écran vit sous `/crm/outils`, avec un lien depuis `Gestion.tsx`. Il ne lit pas `/api/systeme/connexions`, gardée par `systemeAgents`. |
| MCP `cerveau` · `chercher` + `lire` | Fiche `connecteurs/gmail.md` et `audit-0311-fonctionnement.md` (S2, S3) : Gmail reste fermé tant que `GOOGLE_VERIFICATION_GMAIL !== 'accordee'`. L'écran ne le devine donc pas : il affiche le refus 409 de la route (« Cet outil n'est pas encore ouvert. »). La note confirme aussi que 0193 est posée (03/11 vers 18 h) : la lecture directe de `connexions` est donc possible. |
| Skill `presti-design` | Jetons du socle `app/base.css` (corail `--accent`, `--surface`, `--ok`/`--crit` et leurs teintes, `--font-display`/`--font-mono`), aucun bleu ni violet ; console sombre. Classes déjà là reprises : `.pill`, `.crm-retour`, `.gst-groupe`, `.gst-liste`, `.crm-sous`. |
| Skill `frontend-design` | Un seul signe distinctif, le **rail** de chaque carte : corail quand l'outil est branché et vérifié, éteint sinon. Tout le reste reste sobre. Textes écrits du côté de l'artisan : « Connecter Google Drive », « Retirer l'accès », « Garder ». Une erreur dit quoi faire (« Recommencez en laissant tout coché »). |
| Skill `ecc:make-interfaces-feel-better` | `text-wrap: balance/pretty`, chiffres `tabular-nums`, transitions à propriétés nommées (jamais `all`), cibles d'au moins 40 px (36 px pour le « Retirer » secondaire). Il a aussi fait voir un piège : `button{width:100%;margin-top:1.4rem}` (`app/globals.css:10`) étirait « Retirer » sur toute la largeur. C'est corrigé et vu sur la capture. |
| Skill `emil-design-eng` | Pression `scale(.97)` sur les boutons, survol seulement sous `(hover: hover) and (pointer: fine)`, aucune animation d'entrée (l'écran est consulté souvent), `prefers-reduced-motion` coupe tout. La confirmation du geste destructeur s'ouvre dans la ligne, sans fenêtre modale. |
| Critique de design (grille `design:design-critique`, appliquée à la main sur les captures) | 1ʳᵉ passe : « Retirer » pesait plus lourd que « Connecter », avec un vide au-dessus (règle globale du bouton). 2ᵉ passe : corrigé. La hiérarchie est maintenant plein (corail) > discret (contour) > danger (seulement dans la confirmation). |
| Lecture du code jugé de 036-009 | `lib/connexions/routes.ts`, `oauth.ts`, `etat.ts`, `serveur.ts`, `app/api/connexions/**`, migration 0193 (RLS `connexions_lecture`, droits par colonne). Le juge relit ces fichiers à chaque passage : rien n'y est recopié à la main. |
| `typescript` + `react-dom/server` + Playwright (Chromium local) | Ils rendent la vue hors de Next, pressent ses boutons et prennent les captures. Toute requête du navigateur est refusée : zéro réseau. |
| Non chargés, et pourquoi | Skills 3D, scroll et vidéo (hyperframes, motion-doctrine, gsap…) : aucune animation de scène dans cet écran. MCP n8n : hors périmètre. `security-review` : remplacé par les tests D1 à D4 et G3 du juge, et les mutants M8 à M10 et M15. |

## Ce qui est livré (périmètre seulement)

- `app/crm/outils/page.tsx` est un composant serveur. Sa première instruction est `if (!actif('connexions')) notFound()`. Drapeau baissé : 404, rien dans le DOM.
- `app/crm/outils/vue.tsx` n'a aucune importation à l'exécution. Il porte :
  - le catalogue `OUTILS` (Gmail, Google Agenda, Google Drive) ;
  - les routes et `COLONNES_LUES` ;
  - les messages du retour (`MOTIFS_RETOUR`, `avisDuRetour`) ;
  - `urlGoogleSure` et la vue sans état.
- `app/crm/outils/Outils.tsx` est le conteneur client :
  - **lecture** : `supabase.from('connexions').select(COLONNES_LUES)`, par la RLS et les droits par colonne de 0193, sans aucune colonne chiffrée. Table absente : « pas encore ouverte », jamais une fausse liste ;
  - **offre** : `peut(plan, o.capacite)` outil par outil. Un fondateur compte comme `business`, comme dans `lib/connexions/serveur.ts` ;
  - **Connecter** : `POST /api/connexions/google/demarrer { fournisseur }` rend `{ url }`. Le navigateur ne part que si l'adresse est `https://accounts.google.com/o/oauth2/…` ;
  - **Retirer** : seulement après la confirmation de CETTE ligne, par `POST /api/connexions/retirer { id }`.
- `app/crm/Gestion.tsx` : une section « Mes outils ». Elle n'apparaît que si `actif('connexions')` et qu'au moins un outil passe `peut()`. Le plan est lu avec `is_founder`, sans toucher au badge 3D.
- `app/crm/crm.css` : le bloc `.mo-*`.
- `scripts/connecter-ecran-qa.mjs` : le juge, ajouté à `SUITES` du lanceur, juste après 036-030.

## Le retour de Google — point à valider (hors de mon périmètre)

La route de retour renvoie vers **`/dashboard?connexion=ok`** ou **`/dashboard?connexion=refus&motif=…`** (`lib/connexions/routes.ts:50`, `retourVers`). Or `lib/connexions/**` et `app/dashboard/**` me sont interdits. Dans ce cadre, l'écran fait deux choses :

1. Il lit `?connexion=ok|refus&motif=…&outil=…` et affiche « Gmail connecté. » ou l'erreur en clair. Les 12 motifs que la route peut rendre ont chacun leur phrase (test F1).
2. Au clic sur « Connecter », il garde dans l'onglet l'outil et l'heure (`sessionStorage`, rien de secret). Si l'artisan revient sur « Mes outils » sans paramètre, la base relue dit « Gmail connecté. » (lecture réussie après le clic) ou l'échec de l'essai de lecture.

Pour que l'artisan atterrisse directement sur cet écran, la session principale doit changer **une ligne**, `lib/connexions/routes.ts:50` :
- `'/dashboard?connexion=ok'` devient `` `/crm/outils?connexion=ok&outil=${f}` ``, et de même pour le refus ;
- `retourVers` doit pour cela recevoir `etat.fournisseur` ;
- `scripts/connexions-qa.mjs:394` et `:432` attendent `/dashboard?connexion=ok` : il faut les mettre à jour.

Tant que ce n'est pas fait, le test F7 du juge l'affiche : « la route de retour mène aujourd'hui à /dashboard ».

## Captures (prises par le juge, vues avant d'être citées)

Les captures rendent la vue avec des données fictives (`atelier.exemple@example.com`). Le drapeau n'est forcé que dans le banc, jamais dans `lib/flags.ts`. Les polices `next/font` ne se chargent pas hors de Next : la police est celle du système.

- `capture-1440.png` : Gmail connecté et vérifié (rail corail), Google Agenda « À reconnecter », Google Drive « Non branché », avec l'avis « Gmail connecté. ».
- `capture-390.png` : le même état en mobile, sans débordement horizontal (mesuré par le juge).
- `capture-390-confirmer.png` : la confirmation du retrait ouverte (« Retirer l'accès » / « Garder »).

## Sortie du juge (`node scripts/connecter-ecran-qa.mjs`, code 0)

```
ok   A0 le circuit est lisible (FOURNISSEURS_GOOGLE, CAPACITE)
ok   A1 chaque outil déclaré a un circuit OAuth (FOURNISSEURS_GOOGLE) — gmail,google_agenda,google_drive
ok   A2 chaque outil pose la même question d'offre que le circuit (CAPACITE)
ok   A3 OUTILS (chargé) = OUTILS (lu) : aucun outil ajouté hors de la liste
ok   A4 rendu : chaque outil affiché a son circuit, et il y en a — gmail,google_agenda,google_drive
ok   A5 rendu : seuls les outils permis par l'offre sont montrés (liste reçue = liste rendue)
ok   B1 « Connecter » → /api/connexions/google/demarrer : la route existe et répond à POST
ok   B2 « Retirer » → /api/connexions/retirer : la route existe et répond à POST
ok   B3 la route de retour de Google existe (GET)
ok   B4 le conteneur appelle demarrer en POST { fournisseur }
ok   B5 le conteneur appelle retirer en POST { id }
ok   B6 aucune autre route n'est appelée par l'écran
ok   B7 rendu : un « Connecter » par outil, qui demande le bon fournisseur
ok   C1 la page lit le drapeau `connexions` par actif() de lib/flags
ok   C2 drapeau baissé : notFound() est la première instruction de la page (404 serveur, rien dans le DOM)
ok   C3 la page n'est pas un composant client (la garde tourne sur le serveur)
ok   C4 l'outil de gestion a exactement un lien « Mes outils »
ok   C5 ce lien n'est rendu que drapeau levé et offre permise (actif + peut)
ok   C6 aucun autre lien vers /crm/outils dans app/ (un lien non gardé apparaîtrait drapeau baissé)
ok   C7 état présent du drapeau lu dans lib/flags.ts (information : baissé = 404) — connexions: false
ok   D1 vue.tsx : aucun jeton, secret, clé ni module serveur
ok   D1 Outils.tsx : aucun jeton, secret, clé ni module serveur
ok   D1 page.tsx : aucun jeton, secret, clé ni module serveur
ok   D1 Gestion.tsx : aucun jeton, secret, clé ni module serveur
ok   D2 colonnes lues ⊆ droits de 0193 pour le navigateur, sans colonne chiffrée
ok   D3 la seule lecture de connexions passe par COLONNES_LUES
ok   D4 le HTML rendu ne porte ni jeton ni secret
ok   E1 rendu : un « Retirer » par compte branché
ok   E2 presser « Retirer » demande la confirmation et ne retire rien
ok   E3 sans confirmation ouverte, aucun bouton ne retire
ok   E4 confirmation ouverte : « Retirer l'accès » retire CETTE connexion, et un « Garder » existe
ok   E5 le conteneur refuse un retrait dont la ligne n'est pas confirmée
ok   E6 le texte de confirmation dit ce qui se passe
ok   F1 chaque motif de refus de la route a son message en clair (12 motifs)
ok   F2 « ?connexion=ok » après Gmail → « Gmail connecté. »
ok   F3 « ?connexion=refus&motif=… » → l'erreur en clair, nommant l'outil
ok   F4 un motif inconnu → un message, jamais du vide
ok   F5 le conteneur lit connexion, motif (et outil) dans l'adresse, puis nettoie l'adresse
ok   F6 rendu : l'avis est annoncé (role=status ou alert)
ok   F7 information : la route de retour mène aujourd'hui à /dashboard (lib/connexions/routes.ts, hors périmètre)
ok   G1 l'offre passe par peut(), outil par outil, fondateur = business comme le serveur
ok   G2 aucun verrou d'offre en dur (plan === …)
ok   G3 le navigateur ne part que vers accounts.google.com en https
ok   G4 hors offre : aucun outil, un renvoi vers les offres
ok   G5 table absente ou erreur : un message, jamais une fausse liste
ok   H capture-1440.png : PNG 1440 px de large, 102856 octets, sans débordement horizontal, 0 requête sortante refusée
ok   H capture-390.png : PNG 390 px de large, 92378 octets, sans débordement horizontal, 0 requête sortante refusée
ok   H capture-390-confirmer.png : PNG 390 px de large, 102461 octets, sans débordement horizontal, 0 requête sortante refusée

juge : 48/48

mutants :
tué      M1 bouton vers une route absente (demarrer → commencer) (B1)
tué      M2 « Retirer » vers une route absente (B2)
tué      M3 outil sans circuit affiché (Outlook) (A1, A2, A3, A4)
tué      M4 outil au verrou d'offre recopié de travers (Drive sur canaux.email) (A2)
tué      M5 écran visible avec le drapeau baissé (garde de la page retirée) (C2)
tué      M6 écran visible avec le drapeau baissé (page passée côté client) (C3)
tué      M7 lien « Mes outils » rendu drapeau baissé (C5)
tué      M8 jeton ou secret dans le client (colonne chiffrée lue) (D1, D2)
tué      M9 jeton ou secret dans le client (jeton manipulé par le conteneur) (D1)
tué      M10 jeton ou secret dans le client (module serveur importé) (D1)
tué      M11 « Retirer » sans confirmation (le bouton retire directement) (E2)
tué      M12 « Retirer » sans confirmation (garde du conteneur retirée) (E5)
tué      M13 un motif de refus sans message (portee_elargie) (F1)
tué      M14 « Gmail connecté » jamais dit (F2)
tué      M15 adresse de Google non contrôlée avant de partir (G3)
tué      M16 verrou d'offre contourné (tous les outils, quelle que soit l'offre) (G1)

mutants tués : 16/16
```

## Autres juges rejoués (fichiers voisins touchés)

- `node scripts/outil-gestion-qa.mjs` (Gestion.tsx modifié) : 44/44, 5 mutants sur 5 tués.
- `node scripts/branchement-reel-qa.mjs` (Gestion.tsx porte la boîte de 036-030) : VERT, 23 mutants sur 23.
- Syntaxe TSX des quatre fichiers contrôlée par `ts.transpileModule` : 0 diagnostic. **Ce n'est pas un typage.**

## Ce qui reste à la session principale

1. Le typage et la compilation de production, interdits ici (garde Orca : dossier partagé) : `PRESTI_DIST=.next-prod` devant.
2. Décider du retour : la ligne de `lib/connexions/routes.ts:50`, décrite plus haut.
3. Lever `connexions` au moment voulu. 0193 est posée (mémoire du 03/11) et `GOOGLE_OAUTH_*` sont rangés. Gmail reste fermé tant que `GOOGLE_VERIFICATION_GMAIL` n'est pas `accordee` ; l'écran affiche alors le refus de la route.
4. Budget : 7 fichiers touchés pour 6 prévus. La page serveur, la vue pure et le conteneur sont séparés : la garde tourne ainsi côté serveur, et la vue se juge hors de Next.
