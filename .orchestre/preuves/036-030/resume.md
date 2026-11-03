# 036-030 — Branchement réel des agents n8n, jusqu'à la boîte « À valider » : résumé et preuves

## Ressources utilisées

- **Inventaire de la session** (hôte d'agents Oracle, sans écran) :
  - outil Skill ;
  - MCP `cerveau`, en lecture seule ici ;
  - MCP `n8n-oracle`, n8n d'Oracle 2.45.7, dans le périmètre de la tâche (`n8n-oracle:presti-`).

  Pas de MCP Supabase ni de réseau sortant. Les connecteurs marketing, Figma et Slack ne servent pas ce lot, et je ne les ai pas appelés. Les skills de vidéo non plus (aucune vidéo).
- **Skill `reseau-neuronal`** et **MCP `cerveau`** :
  - `regles_pour` (« brancher n8n sur les données réelles… publier un workflow n8n ») n'a rendu qu'une règle, celle des comptes non Presti, sans objet ici ;
  - `chercher` (« n8n_lecture… presti-accuse-reception ») a rendu le registre § 23 bis A, le brief `c4-n8n-accuse-reception.md` (lectures HTTP GET par « Supabase account ») et la carte du code (0189 à 0193).

  Effet : j'ai lu par la **voie des workflows publiés** (« Supabase account », filtre par compte), et je n'ai rien écrit dans le vault.
- **L'audit `audit-0311-fonctionnement.md`** (036-029), lu en entier. Ses quatre coupures, puis ses gestes 2, ont donné la table avant/après de `branchement-reel.md` maillon par maillon : S10, S11, S12, G6, G8 et § 2.
- **`plans/011-cadrage-01-11/p5-entreprise/fiche-methode-n8n.md`**, points 1 à 10.
  - Point 6 (« l'idempotence, c'est la clé unique en base ») : `on_conflict=artisan_id,cle` et l'index complet de 0194.
  - Point 8 (« Supabase account » passe outre la RLS) : un filtre par compte sur chaque lecture. Le juge l'impose (L7).
  - Point 2 (publier les enfants d'abord) : aucun enfant n'a changé, le Cerveau seul a été republié.
  - Point 10 (la validation reste dans les cartes « À valider » de Presti) : la boîte dans l'outil de gestion, aucun « send and wait » dans n8n.
- **`mode-ombre.md`** (036-012), l.15, l.22, l.36 et l.41. En ombre, rien ne part, même en Signature, et il n'y a pas de brouillon dans la boîte. D'où :
  - les chefs reçoivent toujours `simulation: true` ;
  - une mise en file du pilote devient une carte.
- **MCP `n8n-oracle`** :
  - `get_workflow_best_practices` (`data_persistence`) : écriture groupée (un seul POST de toutes les cartes), anti-doublon par identifiant unique, erreur gérée sans perte (`onError: continueRegularOutput`) ;
  - `get_workflow_details` : relu avant de toucher, puis l'export final ;
  - `update_workflow` (6 lots), `execute_workflow` (996, puis les bancs 1007 et 1016), `test_workflow` (999, avec données épinglées) et `get_workflow_execution` ;
  - `publish_workflow` (Cerveau seul) et `search_workflows`.
- **Skill `presti-design`** : les jetons de `app/base.css` seulement, corail `--accent` en liseré de carte, `--ok` pour une carte validée. La boîte reprend l'outil de gestion (036-020) : classes `gst-groupe`, `crm-sous`, `psh-btn primary/ghost` (les boutons réels du CRM), `atl-fait` pour la ligne « Fait : … ». Focus visible, zones de clic de 40 px.
- **Le schéma, vérité du code** :
  - `0185_automatisation.sql` : `evenements_metier`, `faits_sans_texte` l.55-66, clé unique l.135 ;
  - `0189_role_lecture_n8n.sql` ;
  - `0193_systeme_agents.sql` : `departements_reglages` l.184-226, vue l.425, marque l.444-469 ;
  - `0157_assistant_actions.sql` ;
  - `app/api/assistant/actions/route.ts` (modèle de la réclamation atomique) et `app/crm/client.ts` (`appel`, mode exemple).
- **Les contrats et bancs de 036-001 et 036-005** : `contrats/cerveau.json`, `contrats/accueil.json`, et la forme d'une carte de chef (`effets_prevus`, `ecrire_carte`) relue dans `.orchestre/preuves/036-001/essais-n8n.json`.
- Ni les vidéos analysées (`plans/analyse-videos.md`, `docs/connaissance-videos/`) ni `fiches-videos.md` n'ont été relues pour ce lot. Il n'y a ni page vitrine ni contenu, et l'audit les a déjà rapprochées du CRM (§ 4).

## Ce qui est fait

Le détail maillon par maillon, avec avant, après et preuve, est dans `plans/011-cadrage-01-11/p6-signature/branchement-reel.md`.

| Fichier | Rôle |
|---|---|
| `lib/evenements/ecrivain.ts` | écrivain des événements : idempotent, sans texte libre, ne lève jamais, abandonne au bout de 1,5 s |
| `app/api/leads/route.ts` | `demande_recue` rangé après l'enregistrement de la demande, derrière `systemeAgents` (baissé) |
| `lib/agents/n8n/cerveau-reel.mjs` | source unique des nœuds Code et des lectures du Cerveau (recopiée octet pour octet dans n8n) |
| `lib/agents/n8n/cartes.ts` | ce que la boîte montre (jamais une carte sans source) et ce qu'un clic change (`en_cours` ou `refusee`, jamais `executee`) |
| `app/api/assistant/agents/route.ts` | GET des cartes du compte, POST valider ou refuser (réclamation atomique) ; n'envoie rien ; 404 si le drapeau est baissé |
| `app/crm/BoiteAgents.tsx`, `app/crm/Gestion.tsx`, `app/crm/crm.css` | boîte « À valider » dans l'outil de gestion |
| `lib/flags.ts` | drapeau neuf `boiteAgents: false` |
| `supabase/migrations/0194_cartes_agents.sql` et son jumeau | colonnes des cartes d'agents, garde « naît à valider », clé unique, voie de lecture de n8n ; **non appliquée** |
| `scripts/branchement-reel-qa.mjs`, `scripts/tout-verifier.mjs` | le juge à mutants et son entrée dans `SUITES` |
| n8n `presti-cerveau` (`596OC5mL2aMBq6SD`) | 35 nœuds : 3 `noOp` retirés, 6 lectures, 5 nœuds Code neufs, 2 écritures (carte, marque) ; republié |

## Exécutions n8n relues (rapatriées sans retouche : `essais-n8n.json`, par `rapatrier.mjs`)

| Exécution | Workflow | Mode | Ce qu'elle prouve |
|---|---|---|---|
| **996** | `presti-cerveau` | manuel, **sans données épinglées** | La lecture réelle répond. `departements_reglages` → HTTP 200, `[]` (en-tête `content-range */*`), donc la table de 0193 existe en production. Ensuite : `Interrupteur général` → `{ interrupteur_general: false, comptes: [], lecture: "ok" }`, puis `Bilan du passage` → `arret: interrupteur_general_coupe`. Aucune écriture. |
| **999** | `presti-cerveau` | `test_workflow`, lectures, chefs et **écritures épinglés** (scénario fictif `scenario-ombre.mjs`) | Compte A en ombre : 2 cartes (`h:decision:exemple-a1`, `-a1-pilote`), chacune avec 4 sources, `origine: agent`, `statut: en_attente`. Compte B en simulation (son accueil est « ombre », mais « tous » est en simulation) : 0 carte. La carte visant un autre compte est refusée, le doublon écarté. Marques : A {E1, E2}, B {E3, E5}. Bilan : `rejets: [type_sans_departement, demande_introuvable]`, `effets_faits: 0`, `cartes_ecrites: 2`, `marques: 4`. |
| **1007** | `presti-banc-cerveau` | manuel, fictif | réussie. Studio : `{ cartes: 16, pilote: 0, escalades: 4, spam: 2 }`. Signature : `{ cartes: 4, pilote: 13, escalades: 3, spam: 1 }`. Aucune erreur. |
| **1016** | `presti-banc-argent` | manuel, fictif | réussie. Devis : 3 et 5 cartes. Facturation : 4 et 3 cartes, plus 2 pilotes. Aucune erreur. |

## Sortie du juge et de ses mutants (`juge.log`)

```
branchement-reel-qa (036-030) — hors ligne

✅ dépôt : toutes les règles E, L, O, C, B, S tiennent
  ✓ mutant tué — demande cassée si l’écriture échoue (route) : E10
  ✓ mutant tué — demande cassée si l’écriture échoue (écrivain qui relance l’exception) : E5 (client qui lève)
  ✓ mutant tué — écriture sans délai (base muette = demande bloquée) : E5 (base muette)
  ✓ mutant tué — écriture non idempotente : E4
  ✓ mutant tué — texte libre dans les faits : E3
  ✓ mutant tué — lecture vide restante dans le Cerveau : L2
  ✓ mutant tué — lecture sans filtre de compte : L7
  ✓ mutant tué — code n8n différent de la source : L9
  ✓ mutant tué — palier réel servi : L13
  ✓ mutant tué — porte de simulation ouverte en ombre : L14
  ✓ mutant tué — carte sans source (n8n) : O2
  ✓ mutant tué — carte sans source (écran) : C2
  ✓ mutant tué — carte écrite en simulation : O1
  ✓ mutant tué — carte d’un autre compte écrite : O1
  ✓ mutant tué — bouton qui envoie en Studio (route) : B5
  ✓ mutant tué — bouton qui exécute (valider = exécutée) : C5
  ✓ mutant tué — boîte visible avec le drapeau baissé (composant) : B2
  ✓ mutant tué — boîte visible avec le drapeau baissé (drapeau levé) : B1
  ✓ mutant tué — route ouverte avec le drapeau baissé : B3
  ✓ mutant tué — décision sur la carte d’un autre compte : B6
  ✓ mutant tué — migration sans exigence de source : C9
  ✓ mutant tué — index de clé partiel (on_conflict cassé) : C11
  ✓ mutant tué — juge absent du lanceur : S1

mutants : 23/23 tués

VERT
```

Les cinq mutants du Cerveau, marqués comme tels dans le juge, changent la source **et** l'export. La comparaison octet pour octet ne les voit donc pas : c'est le comportement rejoué hors ligne qui les tue. Les mutants « lecture vide » et « carte sans source » rougissent sur l'export rapatrié lui-même.

## Suites voisines rejouées (une à la fois)

- **Vertes** :
  - `outil-gestion-qa`, `cerveau-accueil-n8n-qa`, `systeme-agents-schema-qa`, `interface-p6-qa`, `p6-transverse-qa` ;
  - `migrations-jumelles-e2e` (596 verts, 0194 comprise) ;
  - `accuse-reception-n8n-qa`, `crm-connecte-qa`, `plateforme-formulaire-qa`, `pilote-qa`, `securite-durcissements-qa`, `reponse-seule-n8n-qa`.
- **Rouges avant moi** : je les ai rejoués avec mes deux ajouts à la route **retirés**, et ils restent rouges à l'identique.
  - `canaux-reseaux-qa` (A1 : fin de `lib/flags.ts`, déjà prise par `systemeAgents` et `connexions`, rouge aussi sans `boiteAgents`) ;
  - `ecrans-offre-qa`, `formulaire-site-qa`, `proposition-qa`, `qualification-qa`, `verrou-insertion-qa`, `verrou-maj-qa`.
- **Rouges propres à l'hôte**, sans lien avec mes fichiers :
  - `agents-routes-qa` (AR-2, AR-8, AR-10 : `lib/flags.ts` et `tsconfig.json` diffèrent de HEAD dans cet arbre de travail) ;
  - `fermeture-e2e` (`.env.local` absent) ;
  - `media-octets-qa` (`spawn E2BIG`) ;
  - `parcours-commande-qa` (références de commit absentes).

## Risques et points à valider

1. **0194 n'est pas posée.** Sans elle :
   - la lecture de la vue des événements par « Supabase account » est refusée (0193 l'avait retirée à `service_role`) ;
   - une carte ne peut pas s'écrire.

   Le Cerveau s'arrête alors sans effet : ce n'est pas une panne, mais rien n'avance. Il faut l'essai à sec, puis le « go » de Benj.
2. **Le Cerveau est publié et tourne chaque minute.** Aujourd'hui, il fait **une** lecture GET et s'arrête, car aucun compte n'est en marche. Les quatre autres lectures ne partent que si un compte ouvre son interrupteur.
3. **La marque « traité »** est aussi posée en palier simulation, quand un vrai compte y est en marche. C'est voulu : sinon le même événement repasserait chaque minute, avec un appel au modèle. Elle porte aussi sur les événements sautés ou rejetés, journalisés. La demande reste dans l'app.
4. **À poser hors de mon périmètre** : l'appel de `evenementRelanceDue` dans `app/api/cron/relances/route.ts` (une ligne, derrière `systemeAgents`).
5. **Le TypeScript n'a été ni typé ni compilé ici** (interdit sur l'hôte). Point à surveiller : l'affectation de `supabaseAdmin` au type `ClientEvenements` de l'écrivain (`upsert(...args: any[])`). La session principale fait `npm run typecheck`, puis `npm run build`, avec `PRESTI_DIST=.next-prod` si c'est un sous-agent.
6. **La boîte n'a pas de capture d'écran** (drapeau baissé, pas d'écran sur l'hôte) : le cycle presti-verify est à faire au moment de lever `boiteAgents`.
