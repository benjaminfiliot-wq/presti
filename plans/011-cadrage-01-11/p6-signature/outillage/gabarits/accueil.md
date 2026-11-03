# Les gabarits OUTILLÉS de l'Accueil et réponse (tâche 036-013, prompt 6, outillage, lot 1)

Écrit le 03/11/2026 par Claude Code (hôte d'agents Oracle). Spécification suivie : `../OUTILLAGE.md` (décisions O1 à O6, matrice § 5 ligne 1, règles R21 à R23).
Les exports sont dans `.orchestre/preuves/036-013/`, le juge est `scripts/gabarits-accueil-qa.mjs` (46 mutants), la garde commune est `scripts/n8n-specs-qa.mjs` (R1 à R23 tenues).

## Ce qui est construit

Quatre workflows dans le n8n d'Oracle, **inactifs, jamais publiés, sans identifiant, sans webhook**. Le gabarit est découpé en quatre pour rester lisible, et parce que les entrées
et les sorties n'ont pas le même rythme. La règle « tout message arrive d'abord dans la plateforme » (p6:269-285) fixe l'ordre : deux gabarits **déposent**, un gabarit **répond**, un gabarit **envoie**.

| Gabarit | Id n8n | Nœuds | Rôle |
|---|---|---|---|
| `gabarit-artisan-accueil-boite` | `jHLRIQWCfc5Gvknm` | 14 | Gmail, Outlook, IMAP (et les e-mails de notification des plateformes de devis) → dépôt dans la plateforme |
| `gabarit-artisan-accueil-leads` | `WYLdqfoVOLHSdSoY` | 14 | Facebook Lead Ads lu par l'API Graph → dépôt |
| `gabarit-artisan-accueil-reponse` | `UVOEbLSzSEKe5sJp` | 40 | événements de la plateforme (page `/p`, WhatsApp, Telegram, Messenger, Instagram, SMS, et les dépôts des deux autres) → deux agents Claude → chef `presti-dep-accueil` → carte, brouillon, file du pilote, journal |
| `gabarit-artisan-accueil-envoi` | `QZSMHbM6D5taI04i` | 18 | réponses dues du pilote (Signature) → Gmail, Outlook, SMTP, WhatsApp, Telegram, Messenger, Instagram |

(Un premier `gabarit-artisan-accueil-boite`, `H231TUAvAE6UA8IU`, a été **archivé** : n8n refuse de poser le workflow d'erreur par `update_workflow` tant que `lib-erreur-commune` n'est pas publié ; les réglages se posent à la création.)

## Les nœuds, l'outil, ce qu'ils lisent, ce qu'ils écrivent

### `-boite`
| Nœud | Outil | Lit | Écrit |
|---|---|---|---|
| Nouvel e-mail Gmail / Outlook / IMAP | déclencheurs à intervalle de 5 min (`gmailTrigger` 1.4, `microsoftOutlookTrigger` 1, `emailReadImap` 2.2) | la boîte du client (non lus) | rien |
| Normaliser un e-mail (Code) | — | l'e-mail, la source par `$prevNode` | rien |
| Compte de cette copie (Set) | — | — | `organisation_id` = `A_RENSEIGNER_A_LA_COPIE` (posé à la copie) |
| Lire les réglages (HTTP GET) | Supabase | `v_accueil_reglages` : simulation, offre, interrupteurs | rien |
| Dédoublonner et classer (Code) | — | les messages du passage | rien. Clé `em:<compte>:<Message-ID>`, une conversation par client (`c:<adresse>`), filtres AUTOMATIQUE et INDESIRABLE **identiques à `lib/releveCanal.ts`**, plateformes de devis (Habitatpresto, Travaux.com, Quotatis, StarOfService, MesDépanneurs) déposées **sans réponse au client** |
| Porte simulation | If | `simulation` | rien |
| Dépôt prévu (Code) | — | — | rien : la liste des dépôts qui auraient lieu |
| Déposer dans la plateforme (HTTP POST) | Supabase | — | `rpc/deposer_message`, clé idempotente, canal d'origine gardé |
| Journaliser le dépôt (HTTP POST) | Supabase | — | une ligne « fait », sans le texte |

### `-leads`
Cadence de 15 min → réglages → **première porte** → faux : `Lire les leads Facebook` (nœud Facebook Graph, **GET**, champs nommés, formulaire lu dans les réglages) ; vrai : `Leads enregistrés (simulation)`, un lead fictif au format de l'API, **Facebook n'est pas appelé**. Puis `Normaliser les leads` (clé `fl:<compte>:<lead>`, un lead sans moyen de contact ignoré), **seconde porte**, dépôt et journal comme pour la boîte.

### `-reponse`
| Nœud | Outil | Lit | Écrit |
|---|---|---|---|
| Cadence (5 min), Compte, Lire les réglages, Lire les événements non traités | horaire + Supabase | `v_accueil_reglages`, `v_accueil_evenements` (50 au plus) | rien |
| Regrouper par conversation (Code) | — | les événements | rien. **Un doublon reçu par deux canaux = une conversation, un travail** ; texte masqué (adresses, numéros) avant le modèle ; interrupteur coupé = rien |
| **Porte simulation (modèle)** | If | `simulation` | Vrai : le modèle n'est pas appelé, `Réponse enregistrée (simulation)` ; faux : les agents |
| Photo jointe ? → Lire la photo (Anthropic) → Joindre la description | nœud Anthropic (image) | la photo (URL signée) | rien. Un chiffre ou un prix dans la description la fait refuser |
| **Qualificateur** | AI Agent 3.1, Claude `claude-haiku-5-5`, parseur structuré (JSON Schema saisi, `autoFix` faux) | — | rien. Outils de **lecture** : fil Gmail, message Outlook, `lib-trier-demande` (`outil: lecture`), `lib-lire-photo` (`outil: lecture`) |
| Revalider la qualification (Code) | — | — | rien : hors schéma, l'exécution s'arrête |
| **Rédacteur** | AI Agent 3.1, Claude, parseur, outils de lecture (fil Gmail, message Outlook) | — | rien |
| Revalider la proposition (Code) | — | — | rien : aucun chiffre, prix, `TVA`, `TTC` ni nom d'éditeur |
| Préparer la demande au chef, **Appeler presti-dep-accueil** | Execute Workflow (`Ls0oFcQzzAk0rWcP`) | — | rien. Le tri, la qualification, la décision et la porte de conformité restent **ceux du chef** |
| Aiguiller les effets (Code) | — | la sortie du chef | rien. Traduit en voies : carte, file du pilote, brouillon, journal |
| **Porte simulation (écritures)** | If | `simulation` | Vrai : `Effets prévus` ; faux : `Quelle voie ?` |
| Écrire la carte / Mettre en file du pilote / Écrire le journal | Supabase POST | — | `opportunites`, `pilote_file`, `journal_agents`, filtre `organisation_id` dans le corps |
| Lire le destinataire → Brouillon Gmail / Brouillon Outlook | Supabase GET puis Gmail, Outlook | l'adresse du client **au moment d'écrire le brouillon** | un brouillon dans la boîte du client, jamais un envoi |

### `-envoi`
Cadence (1 min) → réglages → `Lire les envois dus` (lecture **au moment d'envoyer**, déclarée `lecture-pour-envoi`) → `Contrôle avant envoi` (les conditions du pilote, un doute vaut un refus) → **porte simulation** → faux : `Par quel canal ?` → `Répondre par Gmail`, `Outlook`, `SMTP`, `WhatsApp`, `Telegram`, `Répondre sur Messenger`, `Répondre sur Instagram` (nœud Facebook Graph, POST) → `Marquer l’action partie` ; ce qui ne peut pas partir → `Repasser en carte`.

## La porte « simulation »

Deux portes dans `-reponse` et `-leads`, une dans `-boite` et `-envoi` ; chaque effet (écriture, envoi, lecture chez Facebook, appel du modèle) n'est atteint que par la sortie « faux » d'une porte : un If, une condition booléenne « vrai » sur `simulation`, typage strict. `simulation` vaut vrai **sauf si les réglages disent exactement faux** (fail-closed) ; une ligne de réglages absente ne laisse rien passer. Le juge refait ce calcul avec son propre code (code `P`) ; la garde commune le fait aussi (R15).

## Ce qui est épinglé dans les essais (`essais-n8n.json`)

| Exécution | Ce qui est prouvé |
|---|---|
| 615 (`-boite`) | quatre courriels : un doublon (même Message-ID) ignoré, une lettre automatique ignorée, **deux dépôts dans UNE conversation** |
| 617 (`-leads`) | un lead enregistré, Facebook non appelé, un dépôt prévu |
| 623 (`-reponse`, **Studio**) | un courriel Gmail et un WhatsApp avec photo : 2 cartes, **1 brouillon Gmail**, 0 file du pilote, 0 envoi. Pin = la sortie du chef de 036-001 (essai 470, compte Studio), **journal tronqué à 2 lignes** |
| 627 (**Signature, type activé**) | un client écrit par Outlook puis WhatsApp : **UNE demande** (`canaux: outlook, whatsapp`), 1 ligne du pilote (envoi par WhatsApp), 1 carte d'escalade, 0 brouillon. Pin = la sortie du chef de 036-001 (essai 470, compte Signature), journal tronqué |
| 628 (**Signature sans le type**) | 1 carte, ni file du pilote ni brouillon. **Pin dérivé** de l'essai 470 : la ligne du pilote est remplacée par une carte de motif `type`, comme le rend `lib-decider` ; ce n'est pas une sortie réelle du chef |
| 629 (**spam**) | le journal seulement. Pin = la sortie du chef de 036-001 (essai 487) |
| 624 (`-envoi`, Signature, type activé) | Gmail, WhatsApp et SMTP prévus à l'envoi ; opposition = carte ; réponse de 5 minutes = attend |
| 625, 626 | Signature sans le type : carte (motif `type`) ; **Studio : carte (motif `offre`)**, jamais d'envoi |

Le juge **rejoue en plus** `-reponse` avec les sorties **complètes et réelles** du chef (`.orchestre/preuves/036-001/essais-n8n.json`, essais 470 et 487).

## Ce qu'il faudra pour la copie d'un client (O3)

1. Poser `organisation_id` dans le nœud `Compte de cette copie` (quatre workflows).
2. Brancher **ses** identifiants, lui-même : Gmail, Outlook, IMAP (et SMTP), WhatsApp Business, Telegram, Facebook (Messenger, Instagram, Lead Ads), Anthropic (modèle et photo), Supabase. Aucun agent n'en crée (`securite.md`). Voie (a) ou (b) de O3 : décision de Benj.
3. Ajouter l'id de chaque copie dans les `callerIds` de `presti-dep-accueil` (il n'accepte aujourd'hui que le Cerveau et le banc) et publier les enfants avant les parents (sondes 499 et 501 de 036-001 : à trois étages, n8n 2.45.7 appelle la version publiée).
4. Poser côté base ce qui n'existe pas encore (migration, accord écrit de Benj) : les vues `v_accueil_reglages`, `v_accueil_evenements`, `v_accueil_destinataires`, `v_accueil_envois_dus` (avec une colonne `organisation_id` égale à `artisan_id`), la fonction `deposer_message`, et les tables `pilote_file` et `journal_agents` (noms retenus ici, **absents des migrations** relevées au 03/11 ; `opportunites` existe, `0185_automatisation.sql:227`).
5. Passer le palier : simulation → ombre → réel, un compte à la fois (`OUTILLAGE.md` § 10).

## Écarts et risques (dits, pas cachés)

1. **Le chef refuse le réel** (« Hors simulation : effet réel non branché », 036-001). Tant que le pas 4 n'est pas fait, la voie « faux » du modèle s'arrête chez lui. Les gabarits sont donc prouvés en simulation seulement.
2. **Les canaux du chef** : `presti-dep-accueil@1` n'accepte que `page_p`, `email`, `telegram`. WhatsApp, Messenger, Instagram et SMS lui sont présentés comme `page_p` avec le vrai canal dans `champs.canal` ; courriel, lead Facebook et plateforme de devis comme `email`. La réponse repart par le **vrai** canal, décidé par le gabarit. Élargir l'énumération du chef est un autre lot.
3. **`lib-trier-demande` et `lib-lire-photo` en outils** reçoivent ce que l'agent leur passe, pas l'enveloppe `@1` que leur « Contrat d'entrée » exige. Branchés comme demandé, ils répondront « hors contrat » tant qu'un enrobage d'entrée n'existe pas. Aucun essai ne les appelle.
4. **`ecrire_note`** (note de qualification) n'est pas écrite par les gabarits : seule la carte, le pilote, le journal et le brouillon le sont.
5. **La mention d'IA est sur le brouillon de Studio** (la garde R4 et R20 l'exige pour tout envoi ou brouillon en aval d'un modèle). L'artisan l'efface s'il veut ; à trancher par Benj.
6. **Studio et IMAP** : pas de brouillon (le dossier Brouillons se remplit par `lib-boite-brouillon`, 036-003) ; une carte seulement. **Studio et canaux de messagerie** : une carte seulement.
7. **SMS (Twilio)** et **LinkedIn** ne sont pas branchés : une réponse due sur ces canaux repasse en carte (motif `canal_non_branche`).
8. **Formes des entrées** : les champs lus des déclencheurs Gmail (`from.value`, `messageId`, `threadId`), Outlook (`internetMessageId`, `conversationId`) et IMAP (`textPlain`, `from`) sont écrits avec défense mais **jamais vus sur un vrai compte** : à vérifier au premier branchement.
9. **Test avec `maintenant`** : `-envoi` accepte une colonne `maintenant` dans les réglages pour figer l'heure d'un essai ; absente en production, l'heure est celle du serveur.
10. **Les `webhookId`** que n8n pose sur Gmail, Outlook, SMTP, WhatsApp et Telegram (pour l'envoi avec attente) sont inertes : aucun nœud n'utilise `sendAndWait`, le juge le vérifie (code `W`).
11. **Le juge n'est pas dans `SUITES`** de `scripts/tout-verifier.mjs` (hors périmètre) : à inscrire par la session principale (lot 036-012). Durée : quelques secondes, aucun appel au modèle.
