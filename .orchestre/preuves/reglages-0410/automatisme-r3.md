# Lot « tout est automatique » : textes, juge de 026-122, migration 0124 (audit C §5.3, §5.4, §5.8, R3)

Décision de Benj du 04/10 (~12 h, `.orchestre/decisions-chef-0410.md` D-0410-1) : les contrôles automatiques (juges, pause générale,
opposition/STOP, réservation, plafonds, coût nul) remplacent l'accord individuel sur chaque publication et chaque envoi.
Inchangé : `envoi_froid`, les clés Publora, les variables de coût et l'ouverture d'un canal sortant restent des gestes séparés de Benj.
Application de 0124 et ses attaques : `application-0124.md`. Verdicts bruts des rejeux sur l'usine : `automatisme-r3-usine.txt`.

## 1. Textes et commentaires alignés (aucune ligne de code de comportement)

Avant : « jamais de publication / envoi sans accord individuel ». Après : « les contrôles automatiques (juges, pause générale, plafonds, doublons,
chiffres vérifiés, coût nul, suspension à la pause) remplacent l'accord individuel (décision du 30/09, confirmée par Benj le 04/10) ».

| Fichier | Quoi |
|---|---|
| `app/api/cron/contenu/route.ts` | commentaire d'en-tête : ce que la route ne fera JAMAIS devient « publier sous pause générale ou sans ces contrôles » |
| `lib/contenu/metaPublier.ts` | commentaire du contrôle complet (ligne 102) ; les trois autres mentions (4, 110, 119) disent déjà « aucun accord individuel » |
| `lib/contenu/lignes.ts` | docblock de `accordValide` : lecture d'une ancienne carte, plus le chemin d'autorisation Instagram/Facebook (seul le chemin TikTok l'exige encore) |
| `lib/contenu/brief.ts` | commentaire + valeur du champ `restant` : `'accord_individuel_de_benj'` devient `'controles_automatiques_de_la_ligne'` (aucun autre fichier de `lib/`, `app/`, `scripts/` ne lisait l'ancienne valeur ; `contenu-qa --partie=boucle` BO-3 PASS) |
| `lib/crieur/juge.ts` | commentaire d'en-tête : le Crieur dépose en brouillon PUIS programme lui-même, sous contrôles |
| `docs/agents/pause-generale.md` | le Crieur : plus d'accord ; la pause SUSPEND les publications programmées (`lib/crieur/pauseProgrammees.ts`), 503 si une suspension n'est pas confirmée |
| `docs/marketing/` : `README`, `accord`, `schema-contenu`, `plateformes/README`, `lignes/README`, `voix/README`, `communaute/README`, `offre/registre-promesses`, `accroches/README`, `tiktok-publication` | accord individuel remplacé par les contrôles ; `tiktok-publication` et `accord` disent que le chemin TikTok l'exige encore (voir §5) |

Faute de référence trouvée en chemin : `scripts/garde-plafond-qa.mjs` citait `docs/marketing/README.md:33` (numéro de ligne devenu faux : 37). L'étiquette cite
maintenant la règle (« Outils gratuits seulement »), aucune logique de critère n'a bougé.

## 2. Juge de 026-122 : `crieur-qa --partie=route` (correction de juge, rien d'assoupli)

| Fiche | Juge | Critère | Défaut du juge | Correction |
|---|---|---|---|---|
| 026-122 | `scripts/crieur-qa.mjs` | **CR-7BIS** | interdisait l'écriture de `'programmee'` (règle R24 du 27/09, caduque depuis la décision) : FAIL sur le code déployé | ne se relâche pas, il change d'objet : (a) sonde de `programmerPublication` sur faux transport : refuse tout coût qui n'est pas exactement le nombre 0 (7 valeurs : absent, null, `'0'`, −1, 1, 0,01, NaN) **avant tout appel**, un seul `PUT /update-post/<id>` avec clé et `{ status:'scheduled', scheduledTime }`, clé idempotente `crieur-…` exigée, créneau passé refusé, réponse qui ne confirme pas `scheduled` refusée ; (b) texte de la route : `programmerPublication(` précédée du dépôt, coût littéral `0` en 4e argument, `PUBLORA_COUT_PAR_PUBLICATION_EUR !== '0'` exigé AVANT `creerPublication(`, intention `programmation_en_cours` inscrite avant l'appel, `sortiePermise` relue entre dépôt, programmation et écriture de `'programmee'`, `signalerProgrammees` importée et appelée après chaque lecture de la pause, `suspendrePublication(` présente, jamais `'programmee'` inséré à la réservation |
| 026-122 | idem | **CR-17** | exigeait `pauseGenerale()` de `lib/agents/pause` (qui ouvrait en cas de doute) ; la route utilise `sortiePermise()` de `lib/agents/sortie` depuis 0ac78df0 | exige la porte FAIL-CLOSED (plus stricte) : import de `@/lib/agents/sortie`, aucun import de `@/lib/agents/pause`, `(await sortiePermise()).permise` COMMANDE la sortie, placée après le jeton et avant `crieur_posts` et `creerPublication(` |
| 026-122 | idem | **CR-7** | non hermétique : la sonde héritait de l'environnement de la machine (`commun.mjs:108`, `{ ...process.env, ...env }`) et `lib/crieur/publora.ts` lève sans `PUBLORA_API_KEY` ; le PASS dépendait de qui rendait le verdict | le juge pose lui-même une clé FACTICE (la sonde n'appelle que le faux transport) et neutralise `PUBLORA_COUT_PAR_PUBLICATION_EUR` |

**Preuve que le juge attrape toujours les vraies fautes** (`scripts/sabotages-crieur-qa-0410.mjs`, sabotage posé DANS un bac gelé de l'usine, juge rejoué, fichier restauré) :

- témoins verts : M0 (aucune faute), H1 (clé Publora absente et coût déclaré 0,5 dans l'environnement), H2 (clé quelconque et coût 0) : **VERT** ×3 ;
- **PRIS ×10** : M1 programmation sans coût nul exigé (route) → CR-7BIS ; M2 `programmerPublication` accepte un coût inconnu → CR-7BIS ; M3 `'programmee'` écrit sans relire la pause
  après la demande → CR-7BIS ; M4 pause sans suspension des programmées → CR-7BIS ; M5 `'programmee'` inséré d'emblée à la réservation → CR-7BIS ; M6 coût `1` passé à
  `programmerPublication` → CR-7BIS ; M7 pause lue par `pauseGenerale` (ouvre au doute) → CR-17 ; M8 première lecture de la pause neutralisée → CR-17 ; M9 `scheduledTime` envoyé
  dans `create-post` → CR-7 ; M10 jeton non contrôlé → CR-5. Les autres rouges signalés (CR-9) sont l'échec de typecheck que le sabotage provoque lui-même.

**Rejeux sur l'usine, arbre propre** (HEAD `22bd752d` + les fichiers de ce lot, dans un `git worktree` : aucun travail d'une autre session dans le paquet) :
`crieur-qa --partie=route` PASS (CR-5 à CR-19, CR-NR, **CR-9 typecheck compris**) ; `contenu-qa` 13 parties PASS ; `crieur-route-qa` CR-1 à CR-10 PASS ;
`crieur-suspension-qa` CS-1 à CS-6 PASS (ces deux-là se lancent avec `node --import ./scripts/ts-loader.mjs`) ; `garde-pause-qa` GP-1 à GP-7 PASS **après** le correctif du §3 ;
`comptable-qa` CPT-1 à CPT-8 PASS.

Sur l'arbre SALE du PC (avec le travail en cours d'autres sessions), `crieur-qa` rendait FAIL CR-9 : `npm run typecheck` rouge sur
`app/controle/station` (propriété `salle` inconnue), sans rapport avec le Crieur. Ce n'est pas un verdict sur ce lot ; l'arbre propre est le bon repère.

## 3. Une VRAIE faute trouvée par un juge existant : `garde-pause-qa` GP-2 (corrigée dans le code, pas dans le juge)

`lib/direction/comptable.ts` (fiche 026-243, commit `ca6de263` du 04/10 20:14) : `moteurParDefaut` appelait `creerLecteur('comptable')` de `lib/agents/llm.ts`
sans lire la pause générale avant : un libellé comptable pouvait déclencher un appel au modèle sous pause. GP-2 l'a vu (« appelle creerLecteur … sans lire la pause avant »), le juge n'a pas été touché.
Correctif : `moteurParDefaut` lit `sortiePermise()` (chargé à l'appel, aucun effet de bord à l'import) AVANT `creerLecteur` et, sous pause ou dans le doute, lève `ErreurComptable('moteur', …)` :
`libelle()` retombe sur `LIBELLE_FIXE`, sans appel. Rejeu : GP-2 PASS (12 voies de sortie dérivées), `comptable-qa` CPT-1 à CPT-8 PASS.

## 4. Migration 0124

Voir `application-0124.md` : appliquée à 14:48 (Paris), avant que je reprenne le lot (passage précédent, d'après les fichiers laissés) ; ce soir vérifiée (empreintes fichier = base, contrôle 11/11, essai « état réel » 28/28 sous
quatre attaques, aucune trace) ; `supabase/controles/0124_automatisme_sous_gardes.sql` ajouté au dépôt.

## 5. Ce qui reste (volontairement hors de ce lot)

- **Le chemin TikTok exige encore l'accord individuel** (`scripts/contenu/publier-tiktok.mjs`, juge `contenu-qa --partie=tiktok` TT-2 « accord individuel exact requis ») : c'est du
  code et un juge à changer, pas un texte ; les docs le disent noir sur blanc (`docs/marketing/accord.md`, `tiktok-publication.md`, `README.md`). Pour Instagram/Facebook et pour la
  garde d'envoi, la décision est appliquée.
- **Le SAV garde son propre compteur** (`lib/agents/sav/repondeurClient.ts:30`, « un brouillon attend l'accord individuel de Benj au plus 24 h » et le compteur D18 des 20
  approbations, fiche 026-245) : règle propre du SAV, non couverte par D-0410-1 (« publication » et « envoi » du Crieur, du Facteur et du Répondeur) ; à trancher par le chef.
- `garde-plafond-qa` est rouge sur HEAD (GF-5 : `scripts/usine/openclaw/essai-local.mjs` appelle un fournisseur payant sans passer par `autoriserDepense` ; GF-6 : promotion d'une
  dépense sans `--benj`) : pas de ce lot (seule l'étiquette Publora a changé), à reprendre par le lot du coût / de l'usine.
- Les PASS de `scripts/prospection-sql-qa.mjs` PG-9 et des essais `0099.sql` parlent du jumeau de 0099 (l'ancien comportement avec accord) : ils restent justes tant qu'ils jugent 0099, ils ne
  jugent pas l'état de la base.
- Gestes de Benj inchangés : `PUBLORA_API_KEY` et `PUBLORA_COUT_PAR_PUBLICATION_EUR` dans Vercel (la route refuse de programmer tant que cette dernière n'est pas exactement `'0'`),
  ouverture d'`envoi_froid`, plafonds non nuls des canaux `facebook`, `instagram`, `linkedin`, `formulaire_site` (aujourd'hui 0/0).
