## Ressources utilisées

- **Le réseau neuronal, skill `reseau-neuronal` puis MCP `cerveau`** : `regles_pour` (« agents, n8n, Gmail, données client, envoi automatique… ») n'a rendu aucune règle propre à ce lot ; `chercher` trois fois (impayé/motif ; devis/prix sourcé/repère ; plan) a rendu p6 B7 et B9, `premiere-reponse.md`, `R3-videos.md` (« le motif se range sur la facture, migration à poser après accord ») et `chantier-4-assistant-plan.md` S2 (un prix estimé ne part pas seul). Effet : le motif existe déjà en colonne (migration 0185 préparée), donc aucune question à options ; rien n'est écrit dans le vault.
- **Le prompt 6, `plans/011-cadrage-01-11/prompts-benj/p6-signature-et-sur-mesure-0311.md`** (lignes A14, B7, B9 et tableau des départements, l.81, 104, 106, 333-335) : donne les trois règles du juge (« facture quand le chantier est fini » + « Ask you » = une carte ; la relance s'arrête sur un paiement ou un motif, jamais sur le silence ; un prix d'ancien chantier est un repère cité).
- **La première réponse, `plans/011-cadrage-01-11/p6-signature/premiere-reponse.md`** (lue en entier) : ligne 036-005 du § 4, tableau Studio / Signature du § 3.3 (`OUTILS_JAMAIS_AUTO`, `envoi_devis` si toutes les lignes sont sourcées), décisions par défaut. Effet : « l'émission reste un clic » devient la règle E1, et Studio / Signature la règle A.
- **Les vidéos déjà analysées** : `plans/011-cadrage-01-11/p5-entreprise/fiches-videos-restructureai.md` fiche 8 (l.255-300, la vidéo du 29/10 : étape « Ask you » avant l'envoi, retard important remonté d'abord au patron, contrôle quotidien des paiements) ; `plans/analyse-videos.md` et `docs/connaissance-videos/` vus par les extraits que rend `cerveau` (pas relus en entier). `fiche-methode-n8n.md` et `fiches-depots.md` ne sont PAS relus ici : la méthode (contrat en nœud Code, parent qui route, un seul retour, workflow d'erreur commun) est reprise des gabarits construits de 035-003 à 036-001.
- **Le MCP `n8n-oracle`** : `get_workflow_best_practices` (`human_in_the_loop` : pas de fiche détaillée, connaissance générale), `get_workflow_sdk_reference`, `validate_workflow`, `create_workflow_from_code` (le banc), `update_workflow` (les deux chefs, 11 lots), `get_workflow_details`, `test_workflow`, `get_workflow_execution`. Les lots ont été recopiés par trois sous-agents Sonnet et Haiku, **vérifiés octet pour octet** par `rapatrier.mjs` (voir « La copie »).
- **Les gabarits construits**, appelés et non refaits : `lib-relancer`, `lib-decider`, `lib-rediger-message` (modèle épinglé), `lib-porte-conformite`, `lib-executer`, `lib-journaliser` (035-003 à 035-005) ; le squelette de 036-001 (mêmes identifiants n8n, le Cerveau les appelle déjà) ; le moteur de rejeu `scripts/demo-entreprise-qa.mjs`.
- **Le code de l'application, vérité du juge** : `lib/pilote/regles.ts` (`ligneSourcee`, `prixSources` l.116-124, `decisionPilote` l.272, `OUTILS_JAMAIS_AUTO` l.79-82), `lib/relancesImpayes.ts` (`JOURS_PAR_DEFAUT` l.38, `contestationDuClient`), `lib/factureDepuisDevis.ts:64` (`simulerFacture`), `lib/devisAuto.ts:25`, `lib/plans.ts` (`peut`), migration `0185` (`relances_impayes_arrets.motif`).
- **Sécurité, skill `ecc:security-review`** appliqué à mon propre diff, en lecture seule : aucun secret (motifs de `garde-commit`), aucun identifiant posé dans les trois exports, aucune adresse e-mail, aucun nœud d'envoi ni d'écriture, lectures toutes filtrées sur `artisan_id`. `presti-audit-attaque` et `supabase-postgres-best-practices` n'ont pas servi : pas de route, pas de SQL écrit. Les skills de design et de vidéo ne servent pas ce lot.

## Ce qui est construit : n8n d'Oracle, tout INACTIF, jamais publié, aucun identifiant

| Workflow | Id n8n | Nœuds | Rôle |
|---|---|---|---|
| `presti-dep-devis` | `dNikTYPKKsivUbd3` | 23 | remplace le squelette de 036-001 : carte « préparer le devis », carte « devis prêt » avec la source de chaque prix ou « estimé », repère cité |
| `presti-dep-facturation` | `bNAF6Xzx5On853kD` | 30 | remplace le squelette : carte « facture prête » (« Ask you »), relance d'impayé jusqu'au paiement ou au motif, cartes de motif |
| `presti-banc-argent` | `LRO3Jng6Te4Xn7Pg` | 7 | le banc : deux comptes (Studio, Signature), 12 événements de devis et 14 de facturation fictifs « Exemple. », jamais planifié |

Réglages relus (`get_workflow_details`) : `active: false`, aucune version publiée, workflow d'erreur `lib-erreur-commune`, fuseau Europe/Paris, succès non sauvés. `callerIds` des chefs : le Cerveau (`596OC5mL2aMBq6SD`) et le banc ; celui du banc : `none`. Aucun identifiant n'a été créé ni modifié. Le modèle n'est jamais appelé.

Chaîne des chefs, comme l'Accueil de 036-001 : porte « simulation » → trois ou quatre lectures (emplacements épinglés, requête dans la note, **toutes filtrées sur `artisan_id`**) → « Constituer les dossiers » (lit une fois, rejette un événement d'un autre compte, d'un autre département ou en double) → décision (`lib-decider`) → [rédaction d'une relance, `lib-rediger-message`, modèle épinglé] → porte de conformité → exécution (`lib-executer`, interrupteurs relus) → journal → « Assembler ». La facturation commence par `lib-relancer`.

## La règle « le code calcule, n8n route »

- Aucun nœud ne calcule, ne convertit ni ne somme un montant : les centimes entiers et les textes affichés viennent de la base ou de l'application (`simulerFacture`) et sont recopiés. Les vues étroites qui les rendent (`n8n_config_agents`, `n8n_devis_prets`, `n8n_devis_lignes`, `n8n_apercus_facture`, `n8n_factures_argent`) **ne sont pas écrites ici** (`supabase/**` hors périmètre) : leurs requêtes sont dans les contrats.
- Le chef Devis ne passe **aucun prix** à `lib-decider` (qui, lui, additionne les lignes quand on lui en donne) : écart évité, voir ci-dessous. `lib-rediger-message` et la porte, eux, convertissent en texte et en centimes (socle de 035, inchangé) ; la porte refuse tout montant du texte qui n'est pas le fait (règle G7, essayée avec un modèle qui ajoute 100 €).
- Le juge le prouve en deux couches : G6 (syntaxe : ni `Math`, ni `reduce`, ni opérateur arithmétique, ni montant additionné) et G6 sémantique (tout montant d'une sortie est un montant LU). Deux mutants distincts les font rougir.

## Comportements, tels que rejoués (banc, lundi 9 novembre 2026, 10 h)

- **Devis.** Studio : 3 cartes (une « préparer », deux « devis prêt »), 0 ligne du pilote. Signature : 5 cartes, 0 ligne du pilote ; un devis aux lignes toutes sourcées, un avec un repère d'ancien chantier (statut « estimé », repère cité), un en escalade, un dont la provenance est vide (donc « estimé »), un déjà parti (non traité), le doublon et l'événement de l'autre compte rejetés.
- **Facturation.** Studio : « facture prête », relance 1 préparée (statut à valider), litige → carte d'escalade, motif non rangé → carte « ranger le motif ». Signature : « facture prête » de type solde (1 facture déduite), **2 lignes du pilote** (silence de 25 jours → relance 3 ; motif « oubli » → les relances reprennent), contestation → carte « à relire », « dit avoir payé » → carte « vérifier le paiement », motif « autre » → carte, facture payée → relance arrêtée par le paiement.
- Studio ne fait rien partir seul. L'émission d'une facture est toujours une carte.

## La copie (rapatrier.mjs)

`COPIE : les nœuds Code, les autres nœuds et les liens de n8n sont ceux de la fabrique, octet pour octet` (chefs) ; le code des trois nœuds Code du banc aussi. Les empreintes SHA-256 sont dans `empreintes-code.json`.

## Les essais n8n (`essais-n8n.json`)

| Exécution | Ce qui est prouvé |
|---|---|
| 539 | `presti-dep-devis`, compte Signature, quatre dossiers : les nœuds Code de n8n, sur les sorties épinglées des `lib-*`, rendent **la même sortie que le rejeu hors ligne** |
| 550 | `presti-dep-facturation`, compte Signature : idem (`success`, 28 nœuds relus) |
| 568 | sonde du banc : n8n n'appelle un sous-workflow que dans sa version **publiée** (aucune ici, voulu) ; les deux chefs répondent « Workflow is not active and cannot be executed » ; bilan : aucune carte, aucune ligne du pilote, aucun statut « ok » (fail-closed) |

Les sorties épinglées à la place des appels sont celles des exports des `lib-*` rejoués (règle P1), sauf la rédaction, dont le texte vient du modèle épinglé du juge.

## Le juge `scripts/devis-facture-n8n-qa.mjs`

Hors ligne, il lit les exports de n8n, les contrats et le code de l'application ; il ne lit jamais la fabrique. Sortie du 03/11/2026 :

```
    ✓ devis et facturation (3 exports, 3 essais n8n rejoués) : S, C, M1, G2, G4, G6, G7, D1 à D4, E1 à E3, B1 à B6, A1 à A4, I1, M2, R1, N1, P1, H1, H2 tenus
      ✓ « un prix sans source présenté comme sourcé (la règle des prix ôtée) » → D1 devis DEV-EX-0003 ligne 2 : « source » alors que l'application dit non sourcée (estimé)
      ✓ « un prix d’ancien chantier (repère) traité comme une source » → D1 devis DEV-EX-0003 ligne 2 : « source » alors que l'application dit non sourcée (estimé)
      ✓ « « tous les prix sont sourcés » affirmé à tort » → D3 devis DEV-EX-0003 : tous_prix_sources=true alors que prixSources du code dit false
      ✓ « une ligne du pilote pour un devis (cible forcée) » → A0 rejeu de presti-dep-devis en erreur (erreur devis : aucune ligne du pilote n est permise ici | erreur devis : aucune ligne du pilote n est permise
      ✓ « une facture émise par n8n (une écriture dans les factures) » → G4 presti-dep-facturation : effet ecrire_facture hors de la liste fermée (ecrire_carte, mettre_en_file_pilote, inserer_journal)
      ✓ « une facture prête qui part seule (l’émission envoyée au pilote) » → A0 rejeu de presti-dep-facturation en erreur (erreur geste non permis dans le pilote : escalader_litige | erreur geste non permis 
      ✓ « un montant calculé dans un nœud Code (un produit) » → G6 presti-dep-facturation / Assembler : un opérateur arithmétique dans un nœud (somme, produit, quotient ou reste)
      ✓ « un montant calculé hors syntaxe visible (une somme de deux faits) » → G6 presti-dep-devis / Assembler : un montant additionné ou soustrait dans un nœud
      ✓ « un montant calculé par le modèle (la porte ôtée pour les relances) » → G7 un montant inventé par le modèle passe la porte (4 effet(s) et 0 relance(s) préparés sur 4 ; refus 4)
      ✓ « un modèle dans un chef » → G2 presti-dep-facturation / Calculer (modèle) : un modèle dans un chef (la rédaction vit dans lib-rediger-message, modèle épinglé)
      ✓ « une relance d’impayé après paiement » → B1 facture FAC-EX-0025 payée : une relance ou une carte part encore (la relance s'arrête sur un paiement)
      ✓ « un motif rangé ignoré » → B2 facture FAC-EX-0026 : relancée alors qu'un motif (litige) est rangé (la relance s'arrête sur un motif)
      ✓ « la relance arrêtée sur le silence (au-delà de 7 jours) » → B4 facture FAC-EX-0034 : échue depuis plus de 20 jours, sans paiement ni motif, et pourtant plus relancée (la relance ne s'arrête pas sur 
      ✓ « un motif « oubli » qui arrête les relances » → B3 motif « oubli » (0037) : les relances devaient continuer
      ✓ « un paiement marqué sans l’artisan » → E3 presti-dep-facturation : un effet touche à l'argent (marquer_facture_payee) : n8n n'émet, n'encaisse ni ne marque rien
      ✓ « Studio qui envoie (offre, niveau et pilote forcés partout) » → A1 presti-dep-facturation : studio fait partir seul relance_impaye (Studio prépare, l'artisan valide)
      ✓ « Signature : un type non activé qui part » → A2 variante « type non activé » : Signature fait partir relance_impaye alors que ce type n'est pas activé
      ✓ « une contestation qui part seule (l’escalade ignorée) » → A4 facture FAC-EX-0036 : le client conteste et la relance part seule : une contestation rend la relance en carte « à relire »
      ✓ « le même dossier rejoué recrée une carte (clés ignorées) » → I1 presti-dep-devis : le même lot rejoué recrée 8 carte(s) ou ligne(s) du pilote
      ✓ « un événement d’un autre compte accepté » → M2 presti-dep-devis : l'événement d'un autre compte n'est pas rejeté
      ✓ « une lecture sans filtre artisan_id » → M1 presti-dep-facturation / Lire les factures (simulation : épinglé) : requête sans filtre artisan_id (« Supabase account » passe outre la RLS)
      ✓ « une lecture absente qui fait agir (configuration par défaut) » → R1 presti-dep-devis : sans lecture, des cartes ou des lignes du pilote sont prévues
      ✓ « un workflow actif » → S1 presti-dep-devis : actif ou publié
      ✓ « un chef appelable par tous » → S2 presti-dep-facturation : politique d'appel any/596OC5mL2aMBq6SD,LRO3Jng6Te4Xn7Pg (attendu : 596OC5mL2aMBq6SD,LRO3Jng6Te4Xn7Pg)
      ✓ « un nœud d’envoi dans un chef » → G4 presti-dep-devis / Envoyer : nœud d'envoi, d'écriture ou de lecture réelle (n8n-nodes-base.emailSend) : interdit en simulation
      ✓ « la porte « simulation » contournée » → G4 presti-dep-facturation / Appeler lib-relancer : atteignable sans passer la porte « simulation »
      ✓ « un contrat versionné retouché » → C1 presti-dep-devis : le schéma de son « Contrat d’entrée » diffère de contrats/devis.json
      ✓ « une sortie n8n retouchée après coup » → N1 essai 539 (presti-dep-devis) : la sortie rejouée diffère de celle de n8n
      ✓ « une sortie épinglée retouchée » → P1 essai 539 / Appeler lib-decider : la sortie épinglée n'est pas celle que rend lib-decider rejoué
    devis-facture-n8n-qa : 29 mutants, 29 rouges (69 s)
    OK
```

## Écarts au plan et points à valider (réversibles, défauts appliqués)

1. **`envoi_devis` ne part jamais seul dans n8n.** `lib-decider@1` et la porte rangent `envoyer_devis` parmi les gestes de p5:226 (« devis engageant »), et la porte exige un texte pour tout envoi. La carte « devis prêt » montre donc, ligne par ligne, source ou « estimé », et l'envoi reste un clic ; la règle du pilote de l'application (toutes les lignes sourcées, `lib/pilote/regles.ts:272`) continue de jouer tant que n8n ne la remplace pas. Pour ouvrir l'envoi seul dans n8n : `lib-decider@2` et `lib-porte-conformite@2` (gestes P5:226 par offre), puis accord de Benj.
2. **L'envoi d'une facture déjà émise (`envoi_facture`) n'est pas porté** : même cause (la porte exige un texte, `lib-rediger-message@1` ne rédige que des relances). Il reste au pilote de l'application ; `lib-rediger-message@2` est nécessaire.
3. **Le motif.** La colonne existe (`relances_impayes_arrets.motif`, 0185, préparée, non appliquée) : oubli, dit_avoir_paye, litige, autre. « Contestation » se range sous litige, « échéancier » sous autre ; deux valeurs dédiées seraient un amendement à 0185, à valider par Benj. Motif non rangé : relances arrêtées et carte « ranger le motif ». Les cartes de motif (`ranger_motif_impaye`, `verifier_paiement`, `escalader_litige`, `traiter_impaye_a_la_main`) sont de nouveaux gestes de carte : l'application devra savoir les lire (lot 036-011).
4. **`lib-decider` additionne des lignes** quand on lui en passe (`reduce`) : le chef Devis n'en passe pas. À corriger dans `lib-decider@2` (hors périmètre).
5. **Les chefs lisent leur configuration eux-mêmes** : le Cerveau (`Aiguiller`) n'alimente la configuration que de l'Accueil, et `presti-cerveau` n'est pas dans ce périmètre. Le contrat d'entrée des chefs reste celui de 036-001 ; les faits d'un événement sont vérifiés par le chef (un fait absent ne produit aucune carte). Le banc glisse ses lectures dans `config.lectures_simulees`, honoré seulement quand `simulation` est vrai.
6. **Une porte qui refuse un envoi seul** (heures, plafond) n'est pas re-présentée en carte dans le même passage (même limite que 036-001, point 2).
7. **Lecteur de paiements (Stripe de l'artisan)** : fiche seulement, section `a_venir` de `contrats/facturation.json` ; aucun nœud.
8. **À faire par la session principale / Benj** : ajouter aux `callerIds` de `lib-relancer`, `lib-decider`, `lib-rediger-message`, `lib-porte-conformite`, `lib-executer` et `lib-journaliser` les chefs `dNikTYPKKsivUbd3` et `bNAF6Xzx5On853kD` ; écrire les vues étroites ; publier les enfants avant les parents ; inscrire le juge dans `SUITES` (lot 036-012). Poser les `callerIds` m'a demandé de ne passer que `callerPolicy` et `callerIds` à `setWorkflowSettings` : avec le jeu complet, n8n refuse parce que `lib-erreur-commune` n'est pas publié.

## Fichiers (16, budget 16)

- `scripts/devis-facture-n8n-qa.mjs`
- `plans/011-cadrage-01-11/p6-signature/contrats/devis.json` et `facturation.json`
- `.orchestre/preuves/036-005/` : `construire.mjs`, `codes.mjs`, `pins.mjs`, `rapatrier.mjs`, `resume.md`, `essais-n8n.json`, `empreintes-code.json`, les trois `*.workflow.json`, `verifier.log` (écrit par `orchestre.mjs`), `avant.txt`, `decisions-avant.md`.

Aucun fichier modifié dans `app/**`, `lib/**`, `supabase/**`, `scripts/n8n-specs-qa.mjs`, `scripts/lib-*-qa.mjs`, `scripts/pilote-qa.mjs`, ni dans le vault. Aucun workflow existant hors périmètre n'a été touché. Rien n'a été commité, poussé, construit, migré, publié ni activé.
