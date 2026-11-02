# 032-003 — les dix détecteurs dans n8n (chantier 4, lot L3 n8n) : résumé de preuve

Fait le 02/11/2026 par Claude Code (session lancée par Benj). Réseau neuronal lu d'abord : `regles_pour` sur « n8n, détecteurs, relances,
factures, offres » (rien d'autre que la règle n8n-first et les règles Brevo, sans objet ici) ; `chercher` puis plan du chantier 4 (§0, §0 bis
« Ce que n8n lit », §9, §13, §16), prompt de Benj (`p3-assistant.md` §3.1-§3.4, §6-§7) et son bloc des offres corrigé.

## Ce qui existe maintenant

| Livrable | Où | État |
|---|---|---|
| Workflow `presti-detecteurs` | n8n d'Oracle, id `J8pduyxn9seR8Z9t`, projet personnel de Benj (`S2WEcbpHoXOWFMVB`), aucun dossier | **inactif, jamais publié** (`active: false`, `activeVersionId: null`), 34 nœuds, fuseau `Europe/Paris` |
| Brief (nœuds, requêtes, colonnes permises au fichier:ligne) | `plans/011-cadrage-01-11/briefs/c4-n8n-detecteurs.md` | écrit |
| Export du workflow | `.orchestre/preuves/032-003/presti-detecteurs.workflow.json` | tiré par `get_workflow_details` après la dernière modification ; aucun secret (l'identifiant n'y figure que par son id et son nom) |
| Juge hors ligne | `scripts/detecteurs-n8n-qa.mjs` | vert, 18 mutants sur 18 le font rougir |

Le workflow : déclencheur à 6 h 45 → lecture de connexion (nœud Supabase, `getAll`, 1 ligne de `regles_automatisation`) → preuve de
connexion (ne garde que `{ connexion, lignes }`) → contexte (jour de Paris, mode `simulation`, seuils) → copie figée des capacités → 15
lectures **GET** sur `https://gorcdvmueakcncsmrouo.supabase.co/rest/v1/<table>`, `select=` limité aux colonnes permises, filtrées par compte
(`artisan_id=in.(…)` des comptes Studio, Signature, Entreprise hors démo) → 10 nœuds Code détecteurs (n° 5 coupé) → niveau proposé selon
l'offre (copie des capacités, jamais `plan === …`) → bilan par détecteur, seule sortie. Aucune écriture, aucun envoi, aucun Slack, aucun modèle.

## Le nœud HTTP accepte-t-il l'identifiant « Supabase account » ? Oui, à la configuration

`get_node_types` (HTTP Request 4.5) propose `authentication: 'predefinedCredentialType'` avec `nodeCredentialType` ; `validate_workflow`
a rendu `{"valid":true,"nodeCount":34}` ; après création, les 15 nœuds HTTP portent `supabaseApi: dTewDK98MLrNckNG « Supabase account »`
(lu dans l'export). Aucun contournement, aucun identifiant créé ni modifié. **Non prouvé à l'exécution** : la tâche n'autorise qu'une
lecture réelle (ci-dessous) ; les 15 lectures n'ont tourné que sur données fictives.

## La lecture réelle de connexion : l'identifiant est mal réglé (constat pour Benj)

- Exécution **319** (manuelle, le 02/11 à 15 h 04 UTC), la chaîne coupée juste après « Preuve de connexion » pour qu'aucune autre table ne
  soit lue, puis rétablie (opérations `removeConnection` puis `addConnection`, historique des versions du workflow).
- Résultat : `success`, mais le nœud Supabase n'a rendu **aucune ligne** : un seul élément, une **page HTML de 85 226 caractères**
  (`<!DOCTYPE html>…<meta name="sentry-trace"…`), découpée en clés 0, 1, 2… La « preuve » d'alors disait `connexion: ok, lignes: 0` : à tort.
- Lecture : le champ **Host** de l'identifiant « Supabase account » ne vise pas l'API du projet (`https://gorcdvmueakcncsmrouo.supabase.co`)
  mais une page web (probablement le tableau de bord de Supabase). Le nœud Supabase envoie la clé de l'identifiant à cet hôte : à vérifier.
- **Geste de Benj** (réglage de compte, interdit à un agent) : dans n8n, identifiant « Supabase account », mettre Host =
  `https://gorcdvmueakcncsmrouo.supabase.co` (sans `/rest/v1`), puis relancer une seule exécution manuelle de la lecture de connexion.
- Correctif côté workflow : « Preuve de connexion » est devenue stricte (une réponse qui n'est pas une ligne de `regles_automatisation`
  arrête le passage avec « hôte de l'identifiant Supabase mal réglé ? »). Les nœuds HTTP n'en dépendent pas : leur adresse est écrite en dur.

## L'essai sur données fictives (test_workflow)

Exécution **320** (`success`, 313 ms), jour de Paris `2026-11-02`, deux comptes fictifs (`…0001` Studio, `…0002` Signature, relances
d'impayés cochées et réponse en mode `auto`), identifiants inventés, aucun nom. Bilan rendu par n8n :

| n° | détecteur | nombre | montant (centimes) | niveaux 1 / 2 / 3 |
|---|---|---|---|---|
| 1 | facture_echue | 2 | 170000 | 0 / 1 / 1 |
| 2 | chantier_a_facturer | 2 | 410000 | 0 / 2 / 0 |
| 3 | devis_signe_sans_acompte | 1 | 60000 | 0 / 1 / 0 |
| 4 | devis_sans_reponse | 2 | 230000 | 0 / 1 / 1 |
| 5 | facture_jamais_envoyee | 0 | 0 | 0 / 0 / 0 |
| 6 | demande_sans_reponse | 2 | 0 | 0 / 1 / 1 |
| 7 | demande_sans_devis | 1 | 0 | 0 / 1 / 0 |
| 8 | devis_bientot_expire | 1 | 150000 | 0 / 0 / 1 |
| 9 | stock_sous_seuil | 2 | 0 | 0 / 2 / 0 |
| 10 | demande_avis | 1 | 0 | 0 / 1 / 0 |

C'est le bilan calculé à la main avant l'essai, et `detecteurs-n8n-qa` le rejoue hors ligne à l'identique (`essaiN8n`).

## La vérification

`node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/detecteurs-n8n-qa.mjs` → `OK`, code 0 : structure (inactif,
types permis, Supabase `getAll` sur `regles_automatisation` seulement, 15 GET sans corps ni en-tête, `select=` ⊆ colonnes permises, aucune
colonne nom/email/contact/adresse/message/contenu/texte, filtres `eq.`/`in.`/`is.`, aucun appel réseau dans un nœud Code) ; copies (capacités =
`lib/plans.ts` pour Studio, Signature, Entreprise ; `OUTILS_JAMAIS_AUTO` et `OUTILS_EXECUTABLES_PILOTE` = `lib/pilote/regles.ts` ; seuils =
`lib/relancesImpayes.ts`, `lib/apresChantier.ts`, `lib/tableau-de-bord/calculer.ts`) ; 61 cas fictifs (déclenche, se tait, J+3 pile, J+1,
J+2, J-7 pile, condition disparue, changement de clé d'étape, Studio ≤ 2 même en « auto », n° 5 muet, n° 7 jamais 3 même tout coché, une
facture jamais émise seule, aucun champ personnel dans un constat, idempotence) ; 18 mutants, dont le comparateur inversé du n° 4
(`age > validite` → `age < validite`), tous rouges. Premier passage : le mutant « appel réseau » a réellement tenté un `fetch` vers
`exemple.invalid` (domaine réservé, rien n'est parti) ; le rejeu tourne depuis dans un bac à sable sans `fetch`, `require` ni `process`.

## Réserves et points à valider par Benj

1. **Identifiant « Supabase account »** : hôte à corriger (ci-dessus) ; tant qu'il ne l'est pas, aucune lecture réelle ne peut aboutir.
2. **Seuils sans source dans le code** : demande sans réponse à 1 et 3 jours (n° 6) ; devis bientôt expiré à 7 jours (n° 8). Défauts du lot.
3. **Écarts assumés au plan §9** : n° 2 lit l'absence de facture standard ou de solde, pas l'étape `a_facturer` du CRM (dérivée du journal) ;
   n° 9 tient une commande `commandee` sur le chantier pour couvrante (les lignes de commande, du texte, ne sont pas lues) ; n° 10 ne lit pas
   l'opposition (`crm_apres_opposition` n'a que l'empreinte d'une adresse) : l'envoi la vérifie déjà (refus 409, 0171) ; n° 1 ne vérifie pas
   l'adresse du client (n8n ne la lit pas) ni le registre commun S4 : la relance réelle les vérifie.
4. **Pas encore lus** : les cartes et refus récents (`opportunites_decisions`, 0185, vague 2) ; les drapeaux de `lib/flags.ts` (le constat les
   nomme seulement). Pagination et filtre `in.(…)` non exercés à l'échelle (adresse longue si les comptes se comptent par centaines).
5. **Branche d'erreur** (règle 26 du §0 bis) : absente, la tâche interdisant tout message Slack ; à poser au lot L12 avant toute publication,
   avec la section « Lectures de n8n sur le serveur Oracle » du registre des traitements (plan §0 bis).
6. **Lanceur** : `detecteurs-n8n-qa` n'est pas dans `SUITES` de `scripts/tout-verifier.mjs` (hors périmètre de la tâche) ; à y inscrire par
   la session principale, sinon personne ne le rejoue.

Ni commit, ni push, ni build, ni typecheck, ni migration ; aucun secret lu ni affiché ; aucun autre workflow touché ; `app/`, `lib/`,
`supabase/` intacts (lus seulement).
