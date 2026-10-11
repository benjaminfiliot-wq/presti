# Vercel — les variables de la prospection (mis à jour le 07/10/2026 après l'incident de la boîte personnelle)

**Où :** https://vercel.com/presti1/presti/settings/environment-variables (projet de prestiapp.fr). Environnement : **Production** seulement. Les valeurs sont des mots de passe et des jetons : c'est Benj qui les colle, Claude ne les saisit pas.

## 0. L'incident du 06/10 — à lire d'abord

- Ce qui s'est passé : le 06/10, la prospection a été branchée par défaut sur la boîte « de l'entreprise » (`IMAP_USER` / `IMAP_PASS`). Or cette boîte est **ton Gmail personnel**. Du 06/10 ~16 h UTC au 07/10 matin, le standardiste y a relevé plus d'un millier de messages personnels (aucun lié à la prospection), les a recopiés dans la table des réponses (`ops.reponses`), en a tiré 32 oppositions et 122 signaux STOP (comptes du 07/10 09 h UTC, après la dernière relève : 1 149 messages). **Aucune réponse automatique n'est partie** (aucun envoi préparé depuis ces messages : vérifié en base le 07/10).
- Ce qui est fait (07/10, commit « repli sur la boîte de l'entreprise COUPÉ » + migration 0134) :
  1. **Le repli est coupé** pour tous les usages de prospection (relève du standardiste, réponse du répondeur, envoi du facteur et du rédacteur, lien de l'atelier, avis du second juge). Sans les variables de la section 1, chaque route rend `en_attente_gmail` : rien n'est lu, rien ne part. La boîte personnelle n'est même plus ouverte.
  2. Le répondeur ne répond plus qu'aux messages d'un fil ouvert par nous (un de nos envois cité, une conversation sur nos canaux, ou un prospect à qui nous avons déjà écrit).
  3. Les lignes recopiées sont **neutralisées, pas supprimées** : classe `neutralisee` (la classe d'origine est gardée dans `classe_avant_neutralisation`), `neutralisee_le` posé ; les 32 oppositions sont échues (`expire_le` = le 07/10, `neutralisee_le` posé) ; les 122 signaux STOP sont passés en `stop_neutralise`. (Entre la migration et le déploiement, une dernière relève a réactivé 4 de ces oppositions et ajouté 2 messages et 2 STOP : neutralisés de même à 09 h UTC, après la première passe du standardiste en `en_attente_gmail`.) Aucun agent ne les classe, n'y répond ni n'en tire quoi que ce soit, et le pilotage ne les affiche plus.
- Le juge qui le prouve : `node --import ./scripts/ts-loader.mjs scripts/boite-prospection-qa.mjs` (BP-17 à BP-32).

## 1. TA DÉCISION DU 07/10 — « on fait par mon mail mais on ne touche pas à mes mails perso » : le mode « fil seul »

Ce mode est codé (commit « mode fil seul ») et **éteint tant que la variable n'est pas posée**. Ce qu'il fait :

- **Envoi** depuis ta boîte (`IMAP_USER`), avec l'en-tête **Reply-To = ton adresse « plus »** : la partie avant `@` de ton adresse, suivie de `+presti`, puis `@` et le domaine. Elle est calculée par le code à partir de `IMAP_USER` : rien à écrire, rien à créer (Gmail livre ces messages dans ta boîte normale).
- **Relève** : le standardiste ne demande à Gmail QUE les messages adressés (À ou Cc) à cette adresse « plus » — deux filtres côté serveur (`HEADER TO/CC` et la recherche Gmail `X-GM-RAW`). Aucun autre message n'est listé, ouvert ni lu, **même s'il vient d'un prospect connu** : un prospect qui répond à notre envoi répond au Reply-To, donc arrive dans le fil ; le reste est ta correspondance, on n'y touche pas.
- **Réponses** : la base garde la barrière « fil ouvert par nous » (migration 0134).
- L'ancien repli large (`PROSPECTION_AUTORISER_BOITE_ENTREPRISE`) est **supprimé du code** : même posée, cette variable ne fait plus rien. Ne la pose pas.

### Ce qu'il faut coller (Claude ne l'a PAS posé : un changement de configuration de production demande ton accord direct)

**Où :** https://vercel.com/presti1/presti/settings/environment-variables → « Add New » → Environnement **Production** seulement.

| Variable | Valeur |
|---|---|
| `PROSPECTION_BOITE_ENTREPRISE_FIL_SEUL` | `oui` (exactement, en minuscules) |

Et vérifie sur la même page :
- `PROSPECTION_GMAIL_USER` / `PROSPECTION_GMAIL_PASS` : **absentes** (sinon c'est la boîte dédiée qui est prise) ;
- `ACQ_ADRESSE_REPONSE` : **absente** (recommandé). Si elle est posée avec une autre valeur que ton adresse « plus », le mode se coupe tout seul (sécurité : il refuserait de relever ou de faire répondre hors du fil).

Puis dis « c'est posé » à Claude : il pousse un commit vide de redéploiement (Vercel ne lit une variable qu'au déploiement suivant), attend READY (`node scripts/deploiement-etat.mjs`) et fait l'essai ci-dessous.

### L'essai en production (sans toucher à tes mails perso)

1. Depuis une adresse que nous contrôlons (une autre boîte à toi ou à Presti, PAS ta boîte elle-même), envoie un court message d'essai à ton adresse « plus » (objet « Essai fil presti »). C'est un envoi de message : il se fait avec ton accord, par toi ou par Claude si tu le lui demandes explicitement.
2. Claude lit la réponse de la passe suivante du standardiste (`net._http_response`, toutes les 5 min) : elle doit dire `"etat":"ok"` et `"messages":1` — un seul message, alors que ta boîte en reçoit d'autres entre-temps : la preuve que rien d'autre n'est lu. Puis il compte les lignes nouvelles de `ops.reponses` (une seule, reçue après l'heure de l'essai) sans lire les 1 149 lignes neutralisées.
3. La ligne d'essai est ensuite neutralisée (même marque que celles du 06/10, motif « essai_fil_presti ») : elle n'est ni classée ni répondue.
4. Si `"messages"` vaut plus que 1 : Claude retire aussitôt la variable (ou te demande de le faire) et le mode repart à l'arrêt.

## 1 bis. (Autre voie) une boîte Gmail DÉDIÉE à la prospection

Si tu préfères un jour une boîte séparée : elle passe toujours avant le mode « fil seul ».

1. Crée un nouveau compte Gmail réservé à la prospection (ex. un nom au nom de Presti), active la validation en deux étapes, puis crée un **mot de passe d'application** (Compte Google → Sécurité → Mots de passe des applications).
2. Sur Vercel, ajoute :

| Variable | Valeur |
|---|---|
| `PROSPECTION_GMAIL_USER` | l'adresse de la **nouvelle** boîte |
| `PROSPECTION_GMAIL_PASS` | son mot de passe d'application (les espaces du mot de passe Google sont retirés par le code) |
| `ACQ_ADRESSE_REPONSE` | l'adresse où les prospects répondent : la même nouvelle boîte |

3. Dis « c'est posé » : Claude pousse un commit (Vercel ne lit une nouvelle variable qu'au déploiement suivant), attend l'état READY (`node scripts/deploiement-etat.mjs`), déclenche un passage du facteur et du standardiste et vérifie `"gmail":"ok"`.
   - Note technique : le curseur de relève (`acq_curseur` « gmail ») garde la position de l'ancienne boîte ; à la première relève de la nouvelle boîte, Claude vérifie que la relève repart bien du début de la nouvelle boîte (l'identifiant UIDVALIDITY change) avant de laisser tourner.

**À ne pas faire :** poser `PROSPECTION_AUTORISER_BOITE_ENTREPRISE=oui` (ancien repli large, supprimé du code le 07/10 : sans effet, mais interdite). Aucun fichier du dépôt ne pose ni cette variable ni `PROSPECTION_BOITE_ENTREPRISE_FIL_SEUL` (juge BP-24) : elles ne se posent que sur Vercel.

## 2. TA DÉCISION n° 2 — purger, ou non, les lignes neutralisées

Elles ne gênent plus rien (aucun agent ne les lit), mais elles contiennent des copies de tes messages personnels dans la base. Les supprimer définitivement est **ta** décision ; Claude ne l'a pas fait. Si tu dis « purge », voici ce qui serait supprimé (et seulement cela) :

- `ops.reponses` où `neutralisee_le is not null` (les messages recopiés) ;
- `ops.opposition` où `neutralisee_le is not null and expire_le is not null` (les oppositions tirées de ces messages et toujours échues ; une vraie opposition reposée depuis sur la même clé a perdu sa marque et n'est pas touchée) ;
- `ops.signaux` où `type = 'stop_neutralise'`.

Les comptes se lisent avant : `select count(*) from ops.reponses where neutralisee_le is not null;` (idem pour les deux autres). Sans réponse de ta part, rien n'est supprimé.

## 3. Messages Instagram / Facebook (facteur Meta) — inchangé

| Variable | Où la trouver |
|---|---|
| `META_PAGE_TOKEN` | developers.facebook.com → Outils → Explorateur de l'API Graph → choisir l'application Presti → « Obtenir un jeton de page » pour la Page Presti, avec les droits `pages_messaging`, `instagram_basic`, `instagram_manage_messages` → puis le transformer en jeton longue durée (Outils → Débogueur de jeton d'accès → « Prolonger ») |
| `META_IG_ID` | dans le même explorateur : requête `me/accounts?fields=instagram_business_account` avec le jeton de page → le nombre `instagram_business_account.id` (compte @prestiapp) |

(Si la vérification d'identité Meta n'est pas terminée, cette partie attend.)

## 4. L'envoi à froid

Il reste fermé tant que tu ne l'ouvres pas (`acq_envoi_froid_ouvrir`, migration 0131) ; les plafonds du palier P0 s'appliquent ensuite. Cet incident n'y a rien changé.
