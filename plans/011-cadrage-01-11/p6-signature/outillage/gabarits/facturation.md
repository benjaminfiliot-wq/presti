# gabarit-artisan-facturation — Facturation et encaissement

Fiche du gabarit outillé (tâche 036-014, prompt 6, outillage, lot 2). Ligne 4 de la matrice de `OUTILLAGE.md` § 5 : paiements lus dans Stripe (lecture seule) ; facture déjà émise envoyée ; PDF dans Drive ou OneDrive ; export au comptable dans Sheets ou Excel ; Relanceur d'impayés (agent), opt-in, jusqu'au paiement ou au motif.

**Inactif, en simulation, sans identifiant.** Identifiant n8n d'Oracle : `CiVwoXSNMvn98Lhu` (jamais publié, jamais activé). Export : `.orchestre/preuves/036-014/gabarit-artisan-facturation.workflow.json`. Juges : `scripts/n8n-specs-qa.mjs` (R1 à R23) et `scripts/gabarits-argent-qa.mjs`.

## Le geste

Un déclencheur planifié (n8n d'Oracle n'est pas exposé : aucun webhook), les lectures de la plateforme (API REST de Supabase, filtre du compte sur chaque requête), un nœud Code qui constitue **un seul dossier par passage**, puis la **porte « simulation »** : sa sortie « vrai » ne fait que journaliser ce qui serait fait ; seule sa sortie « faux » atteint le modèle et les outils d'écriture. Une simulation absente ou illisible est une erreur, jamais un « faux ».

**Le code calcule les montants, jamais le modèle.** Aucun nœud Code ne contient un opérateur arithmétique (le juge le lit sur l'arbre syntaxique). Un montant est lu (centimes entiers ou texte rendus par la base ou par le code de l'application) et seulement comparé.

## Les quatre dossiers, un par passage et dans cet ordre

| Dossier | Quand | Ce qui se passe |
|---|---|---|
| `paiement_lu` | une facture échue dont un paiement Stripe est lu : `paid`, non remboursé, **même identifiant de facture, même montant en centimes** (comparaison, jamais une somme) | la relance s'arrête ; une carte « vérifier le paiement » (marquer payée est un clic de l'artisan, `OUTILS_JAMAIS_AUTO`) |
| `envoi_facture` | une facture **déjà émise** et pas encore envoyée | Signature, pilote `envoi_facture` : PDF rangé, envoi Gmail ou Outlook avec le PDF, export au comptable, registre. Studio : une carte |
| `relance_impaye` | échue, **opt-in de l'artisan** (`relances_impayes.actif`), palier atteint (J+3, J+10, J+21, `lib/relancesImpayes.ts:38`), ni paiement ni motif rangé autre qu'« oubli » ni contestation | Signature : envoi seul (`factures.relances.auto` et type `relance_impaye`). Studio : une carte portant la relance préparée |
| `facture_prete` | chantier terminé, aperçu `simulerFacture` valide, pas encore facturé | **une carte, toujours** (l'étape « Ask you » de la vidéo A14) : `creer_facture` est dans `OUTILS_JAMAIS_AUTO`, l'émission est un clic |

**Une facture non émise ne part jamais** : le dossier ne retient que `emise = vrai`, et « Décider de la voie » refuse une seconde fois (`voie = aucune`).

Une contestation (vraie ou **non lue**) ou un motif « litige », « dit avoir payé », « autre » : une carte « à relire », aucune relance. Le motif « oubli » laisse les relances continuer. La relance s'arrête sur un paiement ou un motif, **jamais sur le silence** (B7).

## Stripe : lecture seule

Le nœud Stripe fait `charge` / `getAll` ; l'outil d'agent fait `charge` / `get`. Aucune écriture : ni remboursement, ni paiement, ni client. Le juge rougit sur toute autre opération.

## Le modèle ne place que des variables

Le Relanceur d'impayés écrit un texte avec `{client}`, `{numero}`, `{montant}`, `{echeance}`, `{retard}`, `{artisan}` (les variables de `lib/relancesImpayes.ts`). « Revalider le texte » **rejette** tout chiffre suivi d'un signe monétaire, tout lien, toute variable inconnue, puis remplace les variables par les valeurs **lues** (texte rendu par la base : `1 200,00 € TTC`).

## Les nœuds

| Nœud | Outil | Lit / écrit | Porte | Rôle |
|---|---|---|---|---|
| Tous les jours à 8 h 30 | Déclencheur planifié |  | avant la porte | Déclencheur à intervalle : n8n d'Oracle n'est pas exposé à Internet, aucun webhook (R22). |
| Préparer | Code | calcule (sans montant) | avant la porte |  |
| Relire la configuration | HTTP | lit `n8n_config_agents` | avant la porte | Configuration du compte. relances_impayes.actif est l'OPT-IN de l'artisan (lib/relancesImpayes.ts) ; jours = J+3, J+10, J+21. |
| Lire les factures | HTTP | lit `n8n_factures_argent` | avant la porte | Factures telles que l'application les a émises : montants écrits par le code. Une facture NON émise a emise = faux. |
| Lire les chantiers terminés | HTTP | lit `n8n_apercus_facture` | avant la porte | Aperçu de la facture rendu par simulerFacture (lib/factureDepuisDevis.ts:64) : « la facture est prête quand le chantier est fini » (A14). |
| Lire les paiements Stripe | Stripe | lit (charge) | avant la porte | LECTURE SEULE : les paiements reçus sur le Stripe de l'artisan (contrôle quotidien des paiements, A14). Aucune opération d'écriture (jamais de remboursement, ni de paiement, ni de client). Le code compare, il n'additionne rien. |
| Constituer le dossier | Code | calcule (sans montant) | avant la porte | Un seul dossier par passage : paiement lu, facture émise à envoyer, impayé échu, chantier terminé. |
| Faut-il rédiger ? | If |  | avant la porte | Seule la relance d'impayé est rédigée par le modèle. |
| Porte simulation (modèle) | If |  | PORTE | Vrai : simulation, rien ne part (le modèle n'est pas appelé : sa sortie vient d'un enregistrement daté). Faux : l'effet réel. Une simulation absente ou illisible est une erreur, jamais un « faux ». |
| Modèle enregistré (simulation) | Code | calcule (sans montant) | avant la porte |  |
| Relanceur d'impayés | Agent IA | appelle le modèle | derrière la porte (sortie « faux ») | Un agent par spécialiste : Claude, un parseur à schéma strict, des outils de LECTURE seulement. Atteint par la sortie « faux » de la porte (appeler le modèle est un effet). |
| Claude (Haiku 5.5) | Modèle Claude |  | sous-nœud de l’agent |  |
| Schéma du rappel | Parseur structuré |  | sous-nœud de l’agent |  |
| Lire un paiement (Stripe) | Outil : Stripe | lit | outil de lecture de l’agent | Lecture seule d'un paiement du Stripe de l'artisan. |
| Lire le fil (Gmail) | Outil : Gmail | lit | outil de lecture de l’agent | Le dernier échange avec le client sur Gmail (a-t-il dit avoir payé ?). |
| Lire le message (Outlook) | Outil : Outlook | lit | outil de lecture de l’agent | Le dernier échange avec le client sur Outlook. |
| Contrôleur de conflit (lib-controler-conflit) | Outil : sous-workflow | lit | outil de lecture de l’agent | Le contrôleur de conflit (A20) offert à l'agent en lecture. |
| Revalider le texte | Code | calcule (sans montant) | avant la porte | R18 : hors schéma = rejet. Le modèle ne place que des variables ; le CODE les remplace par les valeurs lues. |
| Décider de la voie | Code | calcule (sans montant) | avant la porte | Une facture non émise ne part jamais ; l'émission est toujours un clic (creer_facture ∈ OUTILS_JAMAIS_AUTO). |
| Porte simulation (effets) | If |  | PORTE | Vrai : simulation, rien ne part (seuls les effets prévus sont journalisés). Faux : l'effet réel. Une simulation absente ou illisible est une erreur, jamais un « faux ». |
| Effets prévus | Code | calcule (sans montant) | avant la porte |  |
| Choisir la voie | Switch |  | derrière la porte (sortie « faux ») | Fallback = aucune (facture non émise) : rien. |
| Déposer la carte | HTTP | écrit `opportunites` | derrière la porte (sortie « faux ») | Facture prête (« Ask you »), paiement lu à vérifier, relance préparée (Studio), contestation à relire : toujours une carte. |
| Lire le destinataire | HTTP | lit `n8n_destinataires` | derrière la porte (sortie « faux ») | Lue AU MOMENT d'envoyer, après la porte. |
| Quoi envoyer ? | Switch |  | derrière la porte (sortie « faux ») |  |
| Lire le PDF de la facture (rendu par le code) | HTTP | écrit `n8n_pdf_facture` | derrière la porte (sortie « faux ») | Le PDF est rendu par le CODE de l'application (lib/DevisPDF.tsx, lib/envoisPdfServeur.ts) : la fonction n8n_pdf_facture rend le fichier en base64, avec les montants déjà écrits. n8n ne compose aucun document. À écrire dans la base |
| Convertir en fichier PDF | Convertir en fichier |  | derrière la porte (sortie « faux ») |  |
| Choisir le stockage | Switch |  | derrière la porte (sortie « faux ») |  |
| Ranger le PDF dans Google Drive | Google Drive | écrit (upload) | derrière la porte (sortie « faux ») | Le PDF rendu par l'application est rangé dans le Drive de l'artisan (un dossier par client et par chantier : à régler dans la copie). |
| Ranger le PDF dans OneDrive | OneDrive | écrit (upload) | derrière la porte (sortie « faux ») | Le PDF rendu par l'application est rangé dans le OneDrive de l'artisan. |
| Choisir l'export comptable | Switch |  | derrière la porte (sortie « faux ») |  |
| Exporter vers Google Sheets | Google Sheets | écrit (append) | derrière la porte (sortie « faux ») | Export au comptable : une ligne par facture envoyée, dans le classeur Google Sheets de l'artisan. Les montants sont ceux de la base, recopiés. |
| Exporter vers Excel | Excel | écrit (append) | derrière la porte (sortie « faux ») | Export au comptable dans le classeur Excel (OneDrive) de l'artisan. |
| Choisir la messagerie | Switch |  | derrière la porte (sortie « faux ») |  |
| Envoyer la facture par Gmail | Gmail | écrit (send) | derrière la porte (sortie « faux ») | Envoi depuis la boîte Gmail de l'artisan, à son nom. Atteint par la sortie « faux » de la porte seulement. |
| Envoyer la facture par Outlook | Outlook | écrit (send) | derrière la porte (sortie « faux ») | Envoi depuis la boîte Outlook de l'artisan, à son nom. |
| Relance Gmail | Gmail | écrit (send) | derrière la porte (sortie « faux ») | Envoi depuis la boîte Gmail de l'artisan, à son nom. Atteint par la sortie « faux » de la porte seulement. |
| Relance Outlook | Outlook | écrit (send) | derrière la porte (sortie « faux ») | Envoi depuis la boîte Outlook de l'artisan, à son nom. |
| SMS préparé | Code | calcule (sans montant) | derrière la porte (sortie « faux ») | Étape gratuite : un lien sms: que l'artisan ouvre sur son téléphone (lib/sms/lien.ts:10). Rien ne part de ce gabarit. |
| Inscrire au registre | HTTP | écrit `assistant_actions` | derrière la porte (sortie « faux ») | Registre commun (lib/relancesRegistre.ts). Idempotent. |
| Inscrire le palier | HTTP | écrit `relances_impayes` | derrière la porte (sortie « faux ») | Le palier envoyé : la relance suivante attend son jour (J+3, J+10, J+21). |

## Ce que l'agent lit

Un paiement Stripe (`charge` / `get`), le fil Gmail, le message Outlook, le contrôleur de conflit.

## Pour la copie d'un client

1. Un déploiement crée `client-<slug>-<département>` à partir de ce gabarit (OUTILLAGE.md O1) : accord écrit du client, « go » de Benj, décision O3 (voie a ou b pour les identifiants).
2. Le client branche **lui-même** ses comptes dans « Connecter » ; chaque nœud d'outil reçoit alors l'identifiant du client et de lui seul. Un agent n'en saisit aucun.
3. Remplacer dans le nœud « Préparer » l'identifiant d'exemple par le compte de l'artisan ; renseigner les classeurs, dossiers et feuilles (champs vides dans les nœuds Drive, Sheets, Excel, OneDrive).
4. Ajouter la copie aux `callerIds` des sous-workflows qu'elle appelle, puis publier ces sous-workflows avant la copie (n8n n'appelle un sous-workflow que dans sa version publiée).
5. Passer `simulation` à faux dans la configuration du compte **en dernier**, après la fin des essais à blanc ; l'interrupteur général et celui du département restent fermés tant que la copie n'est pas validée.
6. Supprimer les nœuds des outils que le client n'utilise pas (par exemple Excel s'il est sur Google) : la copie ne garde que ses outils.
7. Les vues étroites lues par le gabarit (`n8n_*`) et les fonctions de PDF (`n8n_pdf_*`) sont à écrire dans la base, par migration, avec le « go » écrit de Benj (elles ne sont pas dans ce lot).
8. Le pied d'un rappel d'impayé est, dans l'application, `PIED_AUTOMATIQUE` ; ici le juge commun exige la **mention d'assistant** (R20) sur tout envoi en aval d'un modèle. À trancher par Benj : étendre R4/R20 pour accepter `PIED_AUTOMATIQUE` ou garder la mention.
9. Le délai d'annulation de 10 minutes du pilote est lu dans la base (`delai_annulation_ecoule`) : le premier passage dépose la carte, le passage suivant envoie.
