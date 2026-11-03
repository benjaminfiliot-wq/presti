# Fiche connecteur — Google Drive et Google Sheets (et leurs équivalents Microsoft) (tâche 036-009)

> Écrite le 03/11/2026 sur l'hôte d'agents d'Oracle, par Claude Code. Format : p6 § 0.4
> (`plans/011-cadrage-01-11/prompts-benj/p6-signature-et-sur-mesure-0311.md:235-262`, lignes « Google Drive / OneDrive » et « Google Sheets /
> Excel »). Même application OAuth que Gmail et l'agenda (`gmail.md`) ; code « Connecter / Retirer » dans `lib/connexions/` derrière le drapeau
> `connexions` baissé (`lib/flags.ts:344`). Rien n'a été relu sur Internet depuis cet hôte : à vérifier à la date du geste.

| Champ | Google Drive + Google Sheets (fournisseur `google_drive`) |
|---|---|
| **Portées demandées** | `openid`, `email`, `https://www.googleapis.com/auth/drive.file` : **seulement les fichiers que Presti crée, ou que l'artisan ouvre lui-même à Presti** par le sélecteur de fichiers Google (Picker). C'est aussi la portée de Sheets : un classeur choisi par l'artisan dans le sélecteur se lit par l'API Sheets avec `drive.file`. Jamais `drive` ni `drive.readonly` (tout le Drive), jamais `spreadsheets` (tous les classeurs). `lib/connexions/oauth.ts`, `PORTEES.google_drive`. |
| **Ce qu'on lit** | Sheets : le classeur que l'artisan a choisi (clients, tarifs, stock), par le **circuit contrôlé** existant lecture → aperçu → validation (`lib/comptaImport.ts`, `lib/comptaClasseur.ts`) : rien n'entre en base sans l'aperçu validé par l'artisan ; aucune donnée inventée. Drive : rien d'autre que les fichiers créés par Presti. |
| **Ce qu'on écrit** | Un dossier par client et par chantier, créé par Presti : photos reçues, devis et factures en PDF (`lib/DevisPDF.tsx`, `lib/envoisPdfServeur.ts`), PV, attestations ; un export de tableau pour l'artisan ou son comptable. Toujours une copie : la source de vérité reste Supabase. Jamais de suppression d'un fichier de l'artisan. |
| **Où vit l'autorisation** | Table `connexions` (`0193_systeme_agents.sql:99-128`), fournisseur `google_drive` : `secret_app` (`CANAUX_KEY`) et `secret_n8n` (`BOITE_CLE_N8N`), format v1 de `lib/secretBox.ts:21-30`, liés à la ligne (`lib/connexions/chiffrement.ts`). n8n ouvre `secret_n8n` à l'exécution (HTTP Request), jamais un identifiant n8n par artisan. |
| **Retrait par le client** | « Retirer » → `POST /api/connexions/retirer` : révocation chez Google au mieux, état `retiree`, deux secrets effacés. Les fichiers déjà déposés **restent à l'artisan** dans son Drive (ce sont les siens) ; Presti n'y accède plus. |
| **Expiration, refus** | `jetonUtilisable` (`lib/connexions/etat.ts`) : `invalid_grant` → `expiree`, une alerte, l'archiviste se tait (les PDF restent dans Presti, rien n'est perdu) ; panne → silence, sans alerte ; rien ne plante. |
| **Quotas de l'API** | Quotas des API Drive et Sheets par projet et par utilisateur (pages officielles « Usage limits » de Drive et de Sheets), à relever le jour du geste. Dépôt à l'événement (devis envoyé, facture émise, photo reçue), jamais en boucle. |
| **Coût** | API gratuites. `drive.file` est une portée **non sensible** : pas d'évaluation de sécurité ; la vérification de la marque de l'application reste nécessaire (à confirmer sur la console). Le stockage est celui du Drive de l'artisan (son abonnement Google, pas le nôtre). |
| **Le test qui le prouve** | `node scripts/connexions-qa.mjs` : portée `drive.file` exacte (section C), parcours complet avec essai de lecture et refus sur essai raté (section F, `google_drive`), retrait et Google injoignable au retrait (section G). L'import par le circuit contrôlé est prouvé par les juges existants de « Mes chiffres ». |

## OneDrive et Excel (Microsoft)

Même chemin que `outlook.md` : permission déléguée la plus étroite (`Files.ReadWrite.AppFolder`, le dossier de l'application seulement, à confirmer ;
jamais `Files.ReadWrite.All`), fournisseur `onedrive` déjà prévu par 0193, mêmes secrets, même retrait, même expiration. Le code Microsoft n'est pas
écrit dans ce lot.

## Gestes préparés pour Benj (aucun n'est fait)

Ceux de `gmail.md` (application OAuth, variables, migrations puis drapeau), plus : activer les API Drive, Sheets et Picker dans le projet Google Cloud,
et créer la clé d'API **restreinte au domaine** que demande le sélecteur de fichiers (geste de compte, réservé).
