# Les gabarits n8n et le vrai schéma — tâche 036-031, 03/11/2026

Écart 1 de l'audit de conformité (`audit-0311-conformite.md`, 036-028) : « 52 des 61 objets de base appelés par les gabarits n'existent pas ».
Ce fichier reprend les 61, un par ligne. Pour chacun : qui l'appelle, l'objet réel qui existe déjà (fichier de migration et ligne), ou
« manquant », et la correction faite.

**Résultat** :
- 60 des 61 objets sont rattachés à un objet qui **existe** dans `supabase/migrations/`.
- Un seul est vraiment **manquant** : `rpc/deposer_message`. Il est écrit, **sans être appliqué**, dans
  `supabase/migrations/0195_deposer_message.sql`, avec son jumeau `_A_COLLER_sql_editor_0195_deposer_message_NU.sql`.
- Deux autres appels (`rpc/n8n_pdf_devis`, `rpc/n8n_pdf_facture`) ne sont pas des objets de base. Un PDF ne se rend pas dans Postgres :
  c'est le code de l'app qui le rend. Ils restent « manquant hors base », à trancher (point 3 plus bas). Aucune table n'a été inventée pour
  eux.

## Ce qui a guidé les rattachements

- **Le compte s'appelle `artisan_id`**, partout. Il n'y a aucune colonne `organisation_id` : 0185:17 et 0193:36 l'écrivent. 0183
  (`organisations`) n'est pas posée. Chaque requête des gabarits filtre désormais `artisan_id=eq.<compte>` : la clé de service passe outre la
  RLS (0193:33-34). Le filtre `organisation_id` qui doublait `artisan_id` (« organisation_id=eq.X & artisan_id=eq.X ») est retiré.
- **Une carte se pose dans `assistant_actions`**, à la forme « carte d'agent » de 0194 (0194:66-85) :
  - `origine` vaut `agent`, `mode` vaut `confirmation`, `statut` vaut `en_attente`, avec une échéance à 7 jours ;
  - `departement`, `motif` sans donnée de client, `sources`, `cle` ;
  - l'écriture passe par `on_conflict=artisan_id,cle` : l'index est complet, 0194:101.

  C'est la table que lisent les écrans (`audit-0311-fonctionnement.md`, point 4). Ce n'est pas `opportunites` : personne ne la lit, et son
  index unique partiel (0185:262) est refusé par PostgREST en `on_conflict`.
- **La file du pilote n'est jamais écrite par un gabarit.** La vraie file, c'est `actions_auto` (0174:28). Seule l'app la remplit
  (`lib/pilote/serveur.ts:117`, `piloterCarte`), et seule l'app envoie (p6:368, audit 036-028 exigence 9). « Mettre en file du pilote »
  devient donc une carte d'agent avec `apercu.pilote_en_reel: true` : c'est la même décision que le Cerveau de 036-030 pour l'ombre.
- **Ce qui s'est fait devient un fait** dans `evenements_metier` (0185:125) :
  - un « registre » ou un « journal » écrit une ligne de type `devis_envoye`, `facture_relancee`, `message_depose`…, sous la clé `fait:<clé>` ;
  - les faits sont sans texte libre (0185:21, `faits_sans_texte`), et sans doublon (`on_conflict=artisan_id,cle`, unique 0185:134) ;
  - on n'écrit plus dans `assistant_actions` avec `mode: 'n8n'`, que 0157:37 refuse, ni avec `statut: 'executee'`, que 0194:84 refuse pour
    une carte d'agent.
- **Une vue « dérivée » attendue par un gabarit est un événement.** Exemples : relances dues, demandes à chiffrer, chantier à facturer,
  stock sous le seuil, page du matin, rapport de la semaine.
  - Ces constats sont produits par les détecteurs et le Cerveau. Ils passent par `n8n_evenements_a_traiter` (0193:425), lisible par la clé
    de service depuis 0194:110.
  - Les nombres sont lus dans `faits` par des alias PostgREST (`qualifiee:faits->qualifiee`). Ils ont été calculés par le code qui a écrit
    le fait, jamais par n8n.
- **La configuration n'est plus une vue inventée.** `v_accueil_reglages` (×4), `n8n_config_agents` (×3) et les colonnes absentes de
  `pilote_reglages` (×3) sont remplacées par une chaîne de huit lectures réelles :

  | Lecture | Source |
  |---|---|
  | `departements_reglages` | 0193:184 |
  | `artisans` | 0001:4 |
  | `pilote_reglages` | 0174:20 |
  | `plateforme_config` | 0032:4 |
  | `actions_auto`, départs du pilote sur 24 h | 0174:28 |
  | `evenements_metier`, faits déjà écrits | 0185:125 |
  | `assistant_actions`, cartes déjà posées | 0194 |
  | `connexions`, sans les colonnes de secret | 0193:99 |

  Un nœud Code les compose ensuite. Il garde le **nom** du nœud qu'il remplace, si bien que les nœuds suivants n'ont pas changé. Une
  lecture absente ou en erreur laisse les interrupteurs fermés et la simulation active (côté sûr). Ce que la base ne porte pas reste vide,
  jamais deviné.

## Les 61 objets

Légende de la colonne « Appelé par » : L = lecture, É = écriture. Les gabarits `ent-*` sont des exports de 036-016 et 036-018 qui ne sont
**pas dans n8n** (`search_workflows` « gabarit-ent » : 0, audit 036-028 § 3). Leur correction se fera à leur pose. Les fichiers d'export
sont hors du périmètre de cette tâche.

| # | Objet appelé | Appelé par | Objet réel (migration:ligne) ou manquant | Correction faite |
|---|---|---|---|---|
| 1 | `articles_sous_seuil` | operations (L) | existe : `n8n_evenements_a_traiter` type `stock_sous_seuil`, objet `materiau` (0193:425) ; matériaux et seuil dans `materiaux` (0040:7) et `stock` (0040:35) | n8n : lecture de la vue des événements, `quantite`, `seuil` et `commande_ouverte` lus dans `faits` |
| 2 | `assistant_actions` | devis, facturation, suivi (É registre) ; apres, operations (É carte) | existe : 0157:31, plus les colonnes de carte d'agent de 0194:66-70 | registre → fait `evenements_metier` (plus de `mode: 'n8n'`) ; carte → forme 0194, `on_conflict=artisan_id,cle` |
| 3 | `briefing_organisation` | direction (L) | existe : `n8n_evenements_a_traiter` type `page_du_matin` (0193:425), chiffres dans `faits` | n8n : lecture des faits du dernier événement |
| 4 | `chantiers` | apres, operations (L) | existe : 0141:61 (`date_fin_reelle`, `devis_id`, statut `termine` ou `en_cours`) | n8n : colonnes réelles et alias (`fini_le:date_fin_reelle`, client par `...devis(client_id)`), filtre `artisan_id` |
| 5 | `clients` | apres, operations (L) | existe : 0002:24 (`email`, `tel`) | n8n : `telephone:tel`, filtre `artisan_id` ; `telegram_chat` n'existe pas, retiré |
| 6 | `couts_ia_jour` | direction (L) | existe : 0193:315 | n8n : `part_externe_centimes` absent, remplacé par `externe` et `departement` (somme faite par le code de la page) ; filtre `artisan_id` |
| 7 | `entreprise_actions` | 9 gabarits ent (É) | existe : `evenements_metier` (0185:125) | pas dans n8n ; à la pose : faits `fait:<clé>` |
| 8 | `entreprise_attestations` | ent-administratif (L) | manquant, hors offre vendue : aucun équivalent ; l'Entreprise sur mesure n'est pas vendue (p6:16-17) | pas dans n8n ; aucune table créée |
| 9 | `entreprise_autonomie` | 9 gabarits ent (L) | existe : `autonomie_reglages` (0185:186) et `pilote_reglages` (0174:20) | pas dans n8n |
| 10 | `entreprise_cartes` | 9 gabarits ent (É) | existe : `assistant_actions`, cartes d'agent (0157:31, 0194:66) | pas dans n8n |
| 11 | `entreprise_chantiers` | ent-finance, ent-operations (L) | existe : `chantiers` (0141:61) | pas dans n8n |
| 12 | `entreprise_charte` | ent-marketing (L) | manquant, hors offre vendue | pas dans n8n ; aucune table créée |
| 13 | `entreprise_chiffres` | ent-direction (L) | existe : `n8n_evenements_a_traiter` type `page_du_matin` (0193:425) | pas dans n8n |
| 14 | `entreprise_configuration` | 9 gabarits ent (L) | existe : `departements_reglages` (0193:184) et les mêmes lectures composées | pas dans n8n |
| 15 | `entreprise_contenus` | ent-leads, ent-marketing (L/É) | manquant, hors offre vendue (contenus marketing) | pas dans n8n ; aucune table créée |
| 16 | `entreprise_contrats` | ent-apres-vente (L) | existe : `crm_apres_chantier` (0165:19), réglage entretien ; rappels `crm_rappels` (0162:22) | pas dans n8n |
| 17 | `entreprise_conversations` | ent-accueil, ent-leads (L/É) | existe : `leads` (0010:6) et `messages` (0010:19) ; dépôt par `deposer_message` (0195) | pas dans n8n |
| 18 | `entreprise_cout_ia` | ent-direction (L) | existe : `couts_ia_jour` (0193:315) | pas dans n8n |
| 19 | `entreprise_desinscrits` | ent-leads, ent-ventes (L) | existe : `relances_exclusions` (0185:390), `sms_oppositions` (0186:101), `crm_apres_opposition` (0171:14) | pas dans n8n |
| 20 | `entreprise_echeances` | ent-administratif (L) | existe : `crm_rappels` (0162:22) | pas dans n8n |
| 21 | `entreprise_equipes` | ent-operations (L) | manquant en base posée : `membres` est dans 0183:98, non posée | pas dans n8n ; dépend de la pose de 0183 |
| 22 | `entreprise_evenements_canaux` | ent-accueil, ent-leads, ent-apres-vente (É) | existe : `canaux_evenements` (0139:47) et `evenements_metier` (0185:125) | pas dans n8n |
| 23 | `entreprise_factures` | ent-finance (L) | existe : `factures` (0006:10) | pas dans n8n |
| 24 | `entreprise_formats` | ent-marketing (L) | manquant, hors offre vendue | pas dans n8n ; aucune table créée |
| 25 | `entreprise_grille` | ent-accueil (L) | existe : grille de qualification figée dans le code (Cerveau 036-030 et composer 036-031), pas en base | pas dans n8n |
| 26 | `entreprise_imports` | ent-operations (É) | existe : `mouvements_stock` (0189:47) et `prix_artisan` (0038:8, source `import`) | pas dans n8n |
| 27 | `entreprise_indicateurs` | ent-leads, -marketing, -direction, -finance (L) | existe : faits de `n8n_evenements_a_traiter` (0193:425) | pas dans n8n |
| 28 | `entreprise_messages_recus` | ent-accueil, ent-leads (É) | existe : `messages` (0010:19), par `deposer_message` (0195) | pas dans n8n |
| 29 | `entreprise_messages_sortants` | ent-accueil, ent-apres-vente (É) | existe : cartes d'agent `assistant_actions` (0194:66) ; l'envoi reste à l'app | pas dans n8n |
| 30 | `entreprise_notes_interet` | ent-ventes (É) | existe : `evenements_metier` (0185:125), un fait sans texte | pas dans n8n |
| 31 | `entreprise_pieces_attendues` | ent-administratif (L) | manquant, hors offre vendue | pas dans n8n ; aucune table créée |
| 32 | `entreprise_propositions` | ent-ventes (L/É) | existe : `devis` (0002:36) et `devis_lignes` (0002:59) | pas dans n8n |
| 33 | `entreprise_rapports` | ent-direction (L) | existe : `n8n_evenements_a_traiter` type `rapport_semaine` (0193:425) | pas dans n8n |
| 34 | `entreprise_relances` | ent-administratif, -apres-vente, -finance (L/É) | existe : `relances_impayes` (0159:41) et `crm_rappels` (0162:22) | pas dans n8n |
| 35 | `entreprise_tarifs` | ent-ventes, ent-finance (L) | existe : `prix_artisan` (0038:8) | pas dans n8n |
| 36 | `evenements_metier` | apres, direction, operations (L/É) | existe : 0185:125 (unique `artisan_id, cle` 0185:134 ; `traite_le` 0193:400) | n8n : `artisan_id` au lieu d'`organisation_id`, `on_conflict=artisan_id,cle` ajouté (sans lui, un doublon rendait 409) ; operations lit `traite_le=is.null` |
| 37 | `journal_agents` | accueil-boite, -leads, -reponse (É) | existe : `evenements_metier` (0185:125) | n8n : fait `message_depose`, `lead_depose` ou journal de l'accueil, clé `fait:…`, sans texte de décision |
| 38 | `messages` | suivi (É) | existe : 0010:19 (`lead_id`, `sens`, `type`, `contenu`), `externe_id` (0036:31), `etat` (0050:18) | n8n : ni `organisation_id` ni `cle` (colonnes absentes) ; `externe_id = n8n:<clé>` ; pas d'`on_conflict` (aucun index unique : voir risque 2) |
| 39 | `n8n_apercus_facture` | facturation (L) | existe : `n8n_evenements_a_traiter` type `facture_a_emettre` (0193:425) | n8n : `faits->chantier_termine`, `deja_facturee`, `apercu_ok`, `apercu_type` |
| 40 | `n8n_config_agents` | devis, facturation, suivi (L) | existe : lectures composées (`departements_reglages` 0193:184, `artisans` 0001:4, `pilote_reglages` 0174:20, `plateforme_config` 0032:4, `actions_auto` 0174:28, `evenements_metier` 0185:125, `assistant_actions` 0194, `connexions` 0193:99) | n8n : 8 lectures et un Code « composer » au nom du nœud remplacé |
| 41 | `n8n_demandes_a_chiffrer` | devis (L) | existe : `n8n_evenements_a_traiter` type `devis_a_preparer`, objet `lead` (0193:425) | n8n : `lead_id:objet_id`, `devis_id`, `qualifiee`, `escalade` lus dans `faits` ; le résumé de la demande n'est pas un fait (sans texte) |
| 42 | `n8n_destinataires` | devis, facturation, suivi (L) | existe : `leads.contact` (0010:9) ; `clients.email` et `clients.tel` (0002:27) par `factures` et `devis` | n8n : devis lit `leads` ; facturation et suivi lisent `...clients(client_email:email,client_telephone:tel)` |
| 43 | `n8n_devis_lignes` | devis (L) | existe : `devis_lignes` (0002:59 ; `source_prix` 0038:42) | n8n : `rang:ordre`, compte filtré par `devis!inner(artisan_id)` |
| 44 | `n8n_devis_prets` | devis (L) | existe : `devis` (0002:36 ; `total_ttc`, 0189:40) | n8n : `devis_id:id`, `statut=eq.brouillon`, `artisan_id` |
| 45 | `n8n_factures_argent` | facturation (L) | existe : `factures` (0006:10 ; `payee_le` 0140:18, `envoyee_le` 0187:30) | n8n : colonnes réelles ; retard et paliers non portés (voir risque 3) |
| 46 | `n8n_relances_dues` | suivi (L) | existe : `n8n_evenements_a_traiter` type `relance_due` (0193:425) | n8n : `paliers_envoyes`, `stop`, `opposition`… lus dans `faits` |
| 47 | `n8n_reperes_prix` | devis (L) | existe : `prix_artisan` source `devis_valide` (0038:18) | n8n : `repere_chantier_le:date_prix` |
| 48 | `n8n_tarifs_artisan` | devis (L) | existe : `prix_artisan` (0038:8) | n8n : `prix_ht` en euros (numeric), `source_prix:source` ; aucun prix en centimes (voir point 1) |
| 49 | `opportunites` | accueil-reponse, facturation, suivi (É) | existe : 0185:227, mais ni lue ni écrivable en `on_conflict` (index partiel 0185:262) ; la carte réelle est `assistant_actions` (0194) | n8n : cartes d'agent `assistant_actions?on_conflict=artisan_id,cle` |
| 50 | `pilote_file` | accueil-envoi, accueil-reponse (L/É) | existe : `actions_auto` (0174:28) | n8n : accueil-reponse dépose une carte (`pilote_en_reel`) ; accueil-envoi lit et marque `actions_auto` (`statut`, `motif`, `traite_le`) |
| 51 | `pilote_reglages` | apres, direction, operations (L) | existe : 0174:20 (`actif`, `types` seulement) | n8n : lecture composée (comme 40) ; `offre`, `canal_direction`, `outil_*` viennent d'`artisans` et de `connexions`, ou restent vides |
| 52 | `rapport_hebdo_organisation` | direction (L) | existe : `n8n_evenements_a_traiter` type `rapport_semaine` (0193:425) | n8n : lecture des faits |
| 53 | `relances_impayes` | facturation (É) | existe : 0159:41 (unique `facture_id, rang` 0159:51) | n8n : `on_conflict=facture_id,rang`, `artisan_id`, `jour`, `destinataire` en minuscules ; plus de `cle` |
| 54 | `rendez_vous` | operations (L) | existe : `crm_rappels` (0162:22 ; `echeance`, `heure`) ; les rendez-vous eux-mêmes sont dans l'Agenda lu par le gabarit | n8n : `echeance=eq.<demain>`, `fait_le=is.null` |
| 55 | `rpc/deposer_message` | accueil-boite, accueil-leads (É) | **manquant** : écrit dans `0195_deposer_message.sql` (non appliquée) ; s'appuie sur `leads`, `messages`, `evenements_metier` | n8n : corps `{ p: { artisan_id, … } }` |
| 56 | `rpc/n8n_pdf_devis` | devis (L) | manquant hors base : un PDF est rendu par le code de l'app, pas par Postgres | non corrigé (point 3) |
| 57 | `rpc/n8n_pdf_facture` | facturation (L) | manquant hors base : idem | non corrigé (point 3) |
| 58 | `v_accueil_destinataires` | accueil-reponse (L) | existe : `leads` (0010:6 ; `contact`) | n8n : `conversation_cle:id,adresse_client:contact` |
| 59 | `v_accueil_envois_dus` | accueil-envoi (L) | existe : `actions_auto` (0174:28) | n8n : `statut=eq.a_partir`, `part_le<=maintenant` ; texte et adresses absents de la file (voir risque 1) |
| 60 | `v_accueil_evenements` | accueil-reponse (L) | existe : `n8n_evenements_a_traiter` (0193:425) | n8n : `conversation_cle:objet_id`, `donnees:faits`, `canal_origine:faits->>canal` |
| 61 | `v_accueil_reglages` | accueil-boite, -envoi, -leads, -reponse (L) | existe : lectures composées (comme 40) | n8n : 8 lectures et un Code « composer » au nom du nœud remplacé |

Bilan : 61 objets. **55 existent**, dont 27 `entreprise_*` sur 27, aucun corrigé dans n8n parce qu'ils n'y sont pas. **6 sont
manquants** :
- 1 vraiment manquant et migré : `deposer_message`, en 0195 ;
- 2 hors base : les PDF ;
- 4 `entreprise_*` hors offre vendue : attestations, charte, contenus et formats, pièces attendues ;
- 1 qui dépend de 0183 : `entreprise_equipes`.

Le compte « 52 sur 61 » de l'audit venait d'une comparaison de **noms**. Les rattachements ci-dessus montrent que les besoins étaient
couverts par des objets existants sous un autre nom.

## Les corrections dans n8n

- **10 gabarits `gabarit-artisan-*`**, inactifs, sans identifiant, modifiés par `update_workflow` (version « 036-031 : vrai schéma »).
  - 50 nœuds HTTP sont repointés (`corrections.txt`).
  - 10 lectures de configuration deviennent 80 lectures réelles et 10 nœuds Code « composer ».
  - Aucun autre nœud Code n'est touché.
- Exports après correction : `.orchestre/preuves/036-031/gabarit-artisan-*.workflow.json`. Le fabricant est `corriger.mjs`, les opérations
  sont dans `ops-*.json`, le relevé ligne à ligne dans `corrections.txt`.
- Rien n'est activé ni publié. Les portes « simulation » sont inchangées. Aucun envoi.

## Juges

Rejoués un à un sur les exports corrigés : `n8n-specs-qa`, puis `gabarits-accueil-qa`, `gabarits-argent-qa` et `gabarits-terrain-qa`. Les
sorties sont dans `.orchestre/preuves/036-031/juge-*.log`, et le résumé dans `.orchestre/preuves/036-031/resume.md`.

Avant, les quatre juges étaient verts sur les anciens exports (`juge-n8n-specs-avant.log`, code 0). **Après, ils sont rouges.** Je ne les
ai pas modifiés : ils sont hors de mon périmètre (`scripts/`). Voici pourquoi chacun rougit, motif par motif.

1. **Ils exigent `organisation_id`**, une colonne qui n'existe nulle part (0185:17, 0193:36).
   - `n8n-specs-qa` R14 (`scripts/n8n-specs-qa.mjs:244-247`) attend un seul paramètre `organisation_id=eq.…` sur chaque requête : 107
     manquements. `gabarits-terrain-qa` fait de même (`scripts/gabarits-terrain-qa.mjs:121-124`).
   - PostgREST refuse un filtre sur une colonne inconnue (400) : garder ce filtre, c'est garder des gabarits qui ne lisent rien.
   - Les écritures gardent le mot `organisation_id` comme source de la valeur (`artisan_id: $json.organisation_id`). Seule l'écriture dans
     `messages` rougit (R14 et H2) : la table n'a pas de colonne de compte, et y ajouter `organisation_id` ferait refuser l'insertion.
2. **R7 interdit les alias et les jointures dans `select=`** : 20 manquements.
   - Les alias (`lead_id:objet_id`, `qualifiee:faits->qualifiee`) renomment une colonne réelle au nom que lit le nœud Code suivant. Ils
     n'élargissent rien.
   - Les jointures (`...clients(email,tel)`, `devis!inner(artisan_id)`) lisent des colonnes nommées, filtrées par compte.
   - Sans eux, il faudrait réécrire les nœuds Code des gabarits.
3. **Les rejeux des essais n8n** (`gabarits-accueil-qa` N et C, `gabarits-argent-qa` E1 sur le suivi) rougissent : « lecture non épinglée :
   Lire les départements (base) ».
   - Les essais enregistrés en 036-013 et 036-014 épinglent les anciens nœuds de lecture. Les 8 lectures neuves n'ont aucune épingle, donc
     le composer voit « rien lu », ferme les interrupteurs et ne fait rien (côté sûr).
   - Il faut rejouer les essais (`test_workflow` avec épingles) sur les gabarits corrigés. Je ne l'ai pas fait dans cette tâche.
4. **Le juge de l'accueil cherche les anciennes adresses** (« T outil absent : carte et journal », « D les événements de la plateforme ne
   sont pas lus ») : `opportunites`, `pilote_file`, `journal_agents`, `v_accueil_evenements`. Ce sont des objets absents ou non lus.
5. **Un mutant de `gabarits-terrain-qa` survit** (« un dépôt sans clé d'idempotence ») : il cherche le texte `cle: $json.cle`, et la clé est
   désormais assainie (`cle: String($json.cle).replace(…)`).
6. **Corrigé ici** : R19 (Code inconnus du registre), en inscrivant les 10 Code composer dans
   `.orchestre/preuves/036-031/empreintes-code.json`. Corrigé aussi R7 « colonne interdite (nom) », en retirant `nom` de la lecture
   d'`artisans`, dans n8n comme dans l'export.

La suite à donner est **une tâche à part** sur `scripts/`, qui ferait trois choses :
- accepter `artisan_id=eq.…` (ou `id=eq.…` sur `artisans`) dans R14 et dans le juge du terrain ;
- admettre les alias et jointures en lecture seule de colonnes nommées ;
- rejouer les essais n8n des gabarits corrigés, puis mettre à jour les adresses attendues par le juge de l'accueil.

## Points à valider (Benj)

1. **Les prix en centimes.**
   - `prix_artisan.prix_ht` est en euros, `numeric(12,2)` (0038:13). `devis_lignes.prix_unitaire_ht` et `devis.total_ttc` aussi.
   - Les gabarits d'argent attendent des centimes entiers, et leur juge interdit tout calcul dans un nœud Code (règle M).
   - Aujourd'hui, une ligne lue sans centimes devient donc « estimée, sans prix ». C'est le côté sûr : rien n'est envoyé seul.
   - Deux options :
     - (a) une colonne calculée en base, par une fonction PostgREST `prix_unitaire_ht_centimes(prix_artisan)`, dans une 0196 ;
     - (b) le gabarit lit le montant rendu par l'app.
2. **`deposer_message` est exécutable par `service_role`, en plus de `n8n_lecture`.** La consigne disait « droits du rôle n8n_lecture
   seulement ». Mais l'unique identifiant de n8n est la clé de service : aucun identifiant Postgres de `n8n_lecture` n'existe (0194:24-27,
   même décision pour `n8n_evenements_a_traiter`). Sans ce droit, les gabarits ne pourraient pas l'appeler. Option : retirer `service_role`
   le jour où Benj crée l'identifiant Postgres de `n8n_lecture`.
3. **Les PDF de devis et de facture** (`rpc/n8n_pdf_*`) : ce sont des routes de l'app à exposer à n8n, par jeton, ou le gabarit les laisse à
   l'app. Ce n'est pas une migration.

## Risques restants (écrits, non cachés)

1. **Deux expéditeurs.**
   - `gabarit-artisan-accueil-envoi` lit `actions_auto` en `a_partir` et enverrait lui-même. Le tic de l'app (`lib/pilote/executeur.ts:216`)
     lit la même file.
   - Les deux ne doivent jamais tourner ensemble : le gabarit reste inactif tant que l'app est l'expéditeur, ce qui est le cas permis par
     p6:368.
   - La file ne porte ni texte ni adresse : ils sont dans la carte (`ref_id`) et dans `leads.contact`. Une lecture de plus est à poser avant
     tout essai.
2. **`messages` n'a aucun index unique.** Le dépôt d'une relance dans la conversation (suivi) peut être écrit deux fois si un passage est
   rejoué entre l'envoi et le fait. `deposer_message` (0195) règle ce cas pour les messages **reçus** (verrou et empreinte), pas pour les
   relances envoyées.
3. **Les champs dérivés** (retard, paliers, opposition, consentement, destination de la page de direction, formulaire Lead Ads) ne sont pas
   en base.
   - Ils arrivent par les `faits` d'un événement, ou restent vides.
   - Vides, les gabarits ne font rien : interrupteur fermé, pas de destinataire, ou carte au lieu d'envoi. C'est le côté sûr, mais tant que
     les détecteurs n'écrivent pas ces types d'événements (`relance_due`, `devis_a_preparer`, `facture_a_emettre`, `stock_sous_seuil`,
     `page_du_matin`, `rapport_semaine`), ces branches ne voient rien.
4. **Ordre de pose** : 0185, 0193, 0194, puis 0195. Ensuite seulement, un essai à blanc d'un gabarit sur un compte de test, toujours
   inactif. Sans 0194, l'écriture d'une carte échoue (colonnes absentes), et rien n'est écrit.
