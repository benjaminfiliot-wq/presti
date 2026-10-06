# Vercel — les variables qui débloquent l'envoi de la prospection (06/10/2026)

Pourquoi : chaque passage du facteur répond aujourd'hui `en_attente_gmail` et `en_attente_meta` (lu dans `net._http_response` le 06/10 à 12 h 50 UTC) : sans ces variables, **aucun message ne peut partir**, même quand l'envoi à froid sera ouvert. Les valeurs sont des mots de passe et des jetons : c'est Benj qui les colle, Claude ne les saisit pas.

**Où :** https://vercel.com/presti1/presti/settings/environment-variables (projet de prestiapp.fr ; si le nom du projet diffère, Projets → presti → Settings → Environment Variables). Environnement : **Production** seulement.

## 1. Gmail d'envoi (le facteur, le standardiste, le répondeur) — rien à créer
La boîte `benjaminfiliot@gmail.com` a DÉJÀ un mot de passe d'application sur Vercel (`IMAP_USER` / `IMAP_PASS`, celle du Poste de contrôle). Il suffit de recopier :
| Variable à ajouter | Valeur |
|---|---|
| `PROSPECTION_GMAIL_USER` | la même que `IMAP_USER` (`benjaminfiliot@gmail.com`) |
| `PROSPECTION_GMAIL_PASS` | la même que `IMAP_PASS` (bouton « œil » sur `IMAP_PASS`, copier, coller ; les espaces du mot de passe Google sont retirés par le code) |
| `ACQ_ADRESSE_REPONSE` | `benjaminfiliot@gmail.com` (là où arrivent les réponses des prospects) |

## 2. Messages Instagram / Facebook (facteur Meta)
| Variable | Où la trouver |
|---|---|
| `META_PAGE_TOKEN` | developers.facebook.com → Outils → Explorateur de l'API Graph → choisir l'application Presti → « Obtenir un jeton de page » pour la Page Presti, avec les droits `pages_messaging`, `instagram_basic`, `instagram_manage_messages` → puis le transformer en jeton longue durée (Outils → Débogueur de jeton d'accès → « Prolonger ») |
| `META_IG_ID` | dans le même explorateur : requête `me/accounts?fields=instagram_business_account` avec le jeton de page → le nombre `instagram_business_account.id` (compte @prestiapp) |
(Si la vérification d'identité Meta n'est pas terminée, cette partie attend : la partie Gmail suffit pour démarrer.)

## 3. Après avoir collé
1. Dire « c'est posé » : Claude pousse un commit (Vercel ne lit une nouvelle variable qu'au déploiement suivant), attend l'état READY (`node scripts/deploiement-etat.mjs`), déclenche un passage du facteur par la base (`net.http_get` avec le secret du coffre) et lit la réponse : elle doit dire `"gmail":"ok"` (et `"meta":"ok"` si la partie 2 est posée).
2. L'envoi à froid reste fermé tant que Benj ne l'ouvre pas (`acq_envoi_froid_ouvrir`, migration 0131) ; les plafonds du palier P0 s'appliquent ensuite.
