# gabarit-artisan-devis — Devis

Fiche du gabarit outillé (tâche 036-014, prompt 6, outillage, lot 2). Ligne 2 de la matrice de `OUTILLAGE.md` § 5 : Rédacteur de lignes (Claude, parseur ; outils : tarifs dans Sheets ou Excel) ; montants par le code ; PDF dans Drive ou OneDrive ; envoi Gmail ou Outlook en Signature seulement si tous les prix viennent des tarifs ; brouillon et carte en Studio ; signature Yousign ou DocuSign par l'API.

**Inactif, en simulation, sans identifiant.** Identifiant n8n d'Oracle : `ywIdvdqFQS7S7oQ0` (jamais publié, jamais activé). Export : `.orchestre/preuves/036-014/gabarit-artisan-devis.workflow.json`. Juges : `scripts/n8n-specs-qa.mjs` (R1 à R23) et `scripts/gabarits-argent-qa.mjs`.

## Le geste

Un déclencheur planifié (n8n d'Oracle n'est pas exposé : aucun webhook), les lectures de la plateforme (API REST de Supabase, filtre du compte sur chaque requête), un nœud Code qui constitue **un seul dossier par passage**, puis la **porte « simulation »** : sa sortie « vrai » ne fait que journaliser ce qui serait fait ; seule sa sortie « faux » atteint le modèle et les outils d'écriture. Une simulation absente ou illisible est une erreur, jamais un « faux ».

**Le code calcule les montants, jamais le modèle.** Aucun nœud Code ne contient un opérateur arithmétique (le juge le lit sur l'arbre syntaxique). Un montant est lu (centimes entiers ou texte rendus par la base ou par le code de l'application) et seulement comparé.

## Les trois voies (nœud « Décider de la voie », copie de `decisionPilote` pour `envoi_devis`, `lib/pilote/regles.ts:272`)

| Voie | Quand | Ce qui se passe |
|---|---|---|
| `envoi` | Signature (`assistant.pilote`), pilote actif, type `envoi_devis` activé, aucune escalade, **toutes** les lignes sourcées (par le chef ET par la revalidation), plafond du jour non atteint, délai d'annulation de 10 minutes écoulé | PDF rangé (Drive ou OneDrive), envoi Gmail ou Outlook avec le PDF, signature Yousign ou DocuSign si le client l'a choisie, registre |
| `brouillon` | Studio, ou type non activé | brouillon Gmail ou Outlook dans la vraie boîte de l'artisan (il le relit et l'envoie), PDF rangé, registre. Jamais d'envoi |
| `carte` | escalade, un prix estimé, plafond, annulation en cours, devis pas encore chiffré par l'application | rien de plus : la carte « devis prêt » est écrite par le chef `presti-dep-devis` |

Un prix vient des tarifs de l'artisan (`lib/prix/`), lu dans la vue `n8n_tarifs_artisan` : entier en centimes avec sa provenance (« vos tarifs · … », « tarif de l'artisan », « prix donné par l'artisan », copie de `SOURCE_OK`). Sinon la ligne est « estimée », **sans prix**, et ne part jamais seule. Un prix d'ancien chantier (lu par le code dans `n8n_reperes_prix`) est un repère cité sur la ligne estimée, jamais une source (B9). Le total affiché est celui que le chef `presti-dep-devis` lit dans la base, recopié tel quel.

Le modèle ne voit **aucun prix** : son entrée ne contient que les références, désignations et unités des tarifs ; son schéma (`additionalProperties: false`) n'a aucun champ de montant ; « Revalider les lignes » rejette toute clé en trop.

## Les nœuds

| Nœud | Outil | Lit / écrit | Porte | Rôle |
|---|---|---|---|---|
| Toutes les 10 minutes | Déclencheur planifié |  | avant la porte | Déclencheur à intervalle : n8n d'Oracle n'est pas exposé à Internet, aucun webhook (R22). |
| Préparer | Code | calcule (sans montant) | avant la porte |  |
| Relire la configuration | HTTP | lit `n8n_config_agents` | avant la porte | Configuration du compte (offre, pilote, interrupteurs, simulation). Vue étroite à écrire (hors de ce lot). |
| Lire les demandes à chiffrer | HTTP | lit `n8n_demandes_a_chiffrer` | avant la porte | Demandes qualifiées, déjà déposées dans la plateforme (une entrée = la même demande que la page /p). Vue étroite à écrire. |
| Lire les tarifs | HTTP | lit `n8n_tarifs_artisan` | avant la porte | Les tarifs de l'artisan (lib/prix/) : la SEULE source d'un prix sourcé. Entiers en centimes, rendus par la base. |
| Lire les devis prêts | HTTP | lit `n8n_devis_prets` | avant la porte | Les devis que l'application a chiffrés : total écrit par le code. |
| Lire les lignes des devis | HTTP | lit `n8n_devis_lignes` | avant la porte | Les lignes chiffrées, avec la source de chaque prix et le repère d'un ancien chantier (cité, jamais une source). |
| Constituer le dossier | Code | calcule (sans montant) | avant la porte | Un seul dossier par passage. Interrupteurs fermés ou lecture absente : rien. |
| Porte simulation (modèle) | If |  | PORTE | Vrai : simulation, rien ne part (le modèle n'est pas appelé : sa sortie vient d'un enregistrement daté). Faux : l'effet réel. Une simulation absente ou illisible est une erreur, jamais un « faux ». |
| Modèle enregistré (simulation) | Code | calcule (sans montant) | avant la porte |  |
| Rédacteur de lignes | Agent IA | appelle le modèle | derrière la porte (sortie « faux ») | Un agent par spécialiste : Claude, un parseur à schéma strict, des outils de LECTURE seulement. Atteint par la sortie « faux » de la porte (appeler le modèle est un effet). |
| Claude (Sonnet 5.5) | Modèle Claude |  | sous-nœud de l’agent |  |
| Schéma des lignes | Parseur structuré |  | sous-nœud de l’agent |  |
| Tarifs (Google Sheets) | Outil : Google Sheets | lit | outil de lecture de l’agent | Si l'artisan tient ses tarifs dans Google Sheets : l'agent lit les lignes, jamais ne les modifie. |
| Tarifs (Excel) | Outil : Excel | lit | outil de lecture de l’agent | Si l'artisan tient ses tarifs dans Excel (OneDrive) : recherche d'une référence. |
| Lire le fil (Gmail) | Outil : Gmail | lit | outil de lecture de l’agent | La demande reçue par e-mail : lecture du fil. |
| Lire le message (Outlook) | Outil : Outlook | lit | outil de lecture de l’agent | La demande reçue sur Outlook : lecture du message. |
| Pièces du chantier (Drive) | Outil : Google Drive | lit | outil de lecture de l’agent | Photos et plans déposés par le client dans le dossier du chantier. |
| Revalider les lignes | Code | calcule (sans montant) | avant la porte | R18 : hors schéma = rejet. Le prix de chaque ligne est LU dans les tarifs, jamais écrit par le modèle. |
| Préparer l'appel du chef | Code | calcule (sans montant) | avant la porte |  |
| Appeler presti-dep-devis (montants par le code) | Exécuter un sous-workflow | appelle | avant la porte | Le chef Devis (036-005), inactif tant qu'il n'est pas publié : il lit le total écrit par le code de l'application et la source de chaque prix, et prépare la carte « devis prêt ». Appelé avec la simulation du gabarit. Ses callerIds |
| Décider de la voie | Code | calcule (sans montant) | avant la porte | Copie de decisionPilote pour envoi_devis (lib/pilote/regles.ts). Studio : brouillon et carte. Signature : envoi seul si TOUS les prix viennent des tarifs. |
| Porte simulation (effets) | If |  | PORTE | Vrai : simulation, rien ne part (seuls les effets prévus sont journalisés). Faux : l'effet réel. Une simulation absente ou illisible est une erreur, jamais un « faux ». |
| Effets prévus | Code | calcule (sans montant) | avant la porte |  |
| Choisir la voie | Switch |  | derrière la porte (sortie « faux ») | Fallback = carte : la carte « devis prêt » est écrite par le chef, rien d'autre à faire. |
| Lire le destinataire | HTTP | lit `n8n_destinataires` | derrière la porte (sortie « faux ») | Lue AU MOMENT d'envoyer, après la porte : le contact du client ne sert qu'à ce nœud d'envoi. |
| Lire le PDF du devis (rendu par le code) | HTTP | écrit `n8n_pdf_devis` | derrière la porte (sortie « faux ») | Le PDF est rendu par le CODE de l'application (lib/DevisPDF.tsx, lib/envoisPdfServeur.ts) : la fonction n8n_pdf_devis rend le fichier en base64, avec les montants déjà écrits. n8n ne compose aucun document. À écrire dans la base ( |
| Convertir en fichier PDF | Convertir en fichier |  | derrière la porte (sortie « faux ») |  |
| Choisir le stockage | Switch |  | derrière la porte (sortie « faux ») |  |
| Ranger le PDF dans Google Drive | Google Drive | écrit (upload) | derrière la porte (sortie « faux ») | Le PDF rendu par l'application est rangé dans le Drive de l'artisan (un dossier par client et par chantier : à régler dans la copie). |
| Ranger le PDF dans OneDrive | OneDrive | écrit (upload) | derrière la porte (sortie « faux ») | Le PDF rendu par l'application est rangé dans le OneDrive de l'artisan. |
| Choisir la messagerie | Switch |  | derrière la porte (sortie « faux ») |  |
| Envoyer par Gmail | Gmail | écrit (send) | derrière la porte (sortie « faux ») | Envoi depuis la boîte Gmail de l'artisan, à son nom. Atteint par la sortie « faux » de la porte seulement. |
| Envoyer par Outlook | Outlook | écrit (send) | derrière la porte (sortie « faux ») | Envoi depuis la boîte Outlook de l'artisan, à son nom. |
| Brouillon Gmail | Gmail | écrit (create) | derrière la porte (sortie « faux ») | Studio : le brouillon est écrit dans la vraie boîte Gmail de l'artisan, qui le relit et l'envoie de chez lui. |
| Brouillon Outlook | Outlook | écrit (create) | derrière la porte (sortie « faux ») | Studio : brouillon dans la boîte Outlook de l'artisan. |
| Choisir la signature électronique | Switch |  | derrière la porte (sortie « faux ») | Fallback = aucune signature demandée. |
| Demander la signature (Yousign) | HTTP | écrit `signature_requests` | derrière la porte (sortie « faux ») | Signature électronique par l'API Yousign (hôte écrit en dur). Crée la demande ; le document, le signataire et l'activation sont les appels suivants de la fiche connecteur. La clé API est celle du client, branchée par lui dans la c |
| Demander la signature (DocuSign) | HTTP | écrit `envelopes` | derrière la porte (sortie « faux ») | Signature électronique par l'API DocuSign (hôte écrit en dur ; le COMPTE_DOCUSIGN_DU_CLIENT du chemin est remplacé dans la copie). Enveloppe créée en brouillon. |
| Inscrire au registre | HTTP | écrit `assistant_actions` | derrière la porte (sortie « faux ») | Dépôt de chaque action dans la plateforme (registre commun : jamais deux envois pour le même devis). Idempotent. |
| Bilan | Code | calcule (sans montant) | derrière la porte (sortie « faux ») |  |
| Lire les repères de prix | HTTP | lit `n8n_reperes_prix` | avant la porte | Prix déjà pratiqués par l'artisan sur d'anciens chantiers : un REPÈRE cité dans le devis (B9), jamais une source de prix. Le modèle ne les voit pas. |

## Ce que l'agent lit (outils de lecture seulement, R23)

Tarifs dans Google Sheets (`read`) ou Excel (`lookup`), fil Gmail (`get`), message Outlook (`get`), pièces du chantier dans Drive (`search`). L'écriture se fait après la porte, sur le chemin principal. Les prix déjà pratiqués (repères, B9) ne sont PAS offerts à l'agent : le code les lit dans `n8n_reperes_prix` et les cite sur les lignes estimées (l'outil HTTP de l'agent est un type de nœud retiré par n8n).

## La porte

Deux portes « simulation » : l'une devant le **modèle** (en simulation il vient d'un enregistrement daté, le nœud « Modèle enregistré »), l'autre devant **tous les effets** (PDF, rangement, brouillon, envoi, signature, registre). En simulation, « Effets prévus » rend la liste de ce qui serait fait.

## Marque blanche

Chaque envoi part de la boîte de l'artisan, à son nom, avec la mention « Message rédigé et envoyé automatiquement par l'assistant de <enseigne> » (R4, R20) ; l'attribution « envoyé avec n8n » est coupée ; aucun « Presti » dans un message.

## Pour la copie d'un client

1. Un déploiement crée `client-<slug>-<département>` à partir de ce gabarit (OUTILLAGE.md O1) : accord écrit du client, « go » de Benj, décision O3 (voie a ou b pour les identifiants).
2. Le client branche **lui-même** ses comptes dans « Connecter » ; chaque nœud d'outil reçoit alors l'identifiant du client et de lui seul. Un agent n'en saisit aucun.
3. Remplacer dans le nœud « Préparer » l'identifiant d'exemple par le compte de l'artisan ; renseigner les classeurs, dossiers et feuilles (champs vides dans les nœuds Drive, Sheets, Excel, OneDrive).
4. Ajouter la copie aux `callerIds` des sous-workflows qu'elle appelle, puis publier ces sous-workflows avant la copie (n8n n'appelle un sous-workflow que dans sa version publiée).
5. Passer `simulation` à faux dans la configuration du compte **en dernier**, après la fin des essais à blanc ; l'interrupteur général et celui du département restent fermés tant que la copie n'est pas validée.
6. Supprimer les nœuds des outils que le client n'utilise pas (par exemple Excel s'il est sur Google) : la copie ne garde que ses outils.
7. Les vues étroites lues par le gabarit (`n8n_*`) et les fonctions de PDF (`n8n_pdf_*`) sont à écrire dans la base, par migration, avec le « go » écrit de Benj (elles ne sont pas dans ce lot).
8. Les valeurs « …_DU_CLIENT » (dossier Drive, classeur Sheets, classeur Excel ; feuille et table Excel : des GUID d’éxemple au format Graph) sont des repères sans valeur : n8n refuse de tester un workflow dont un champ requis est vide ; la copie les remplace par ceux du client.
8bis. Signature électronique : renseigner l'identifiant de compte DocuSign dans le chemin de l'API (`COMPTE_DOCUSIGN_DU_CLIENT`) ; Yousign : seule la création de la demande est portée, le document, le signataire et l'activation sont les appels suivants de la fiche connecteur (036-017).
9. L'envoi seul d'un devis est la règle du pilote de l'application ; dans n8n, `lib-decider@1` le réserve aux cartes (`envoyer_devis` est parmi les gestes de p5:226). Tant que `lib-decider@2` n'existe pas, ce gabarit applique la règle lui-même, et son envoi reste derrière « go » de Benj avant tout client réel.
