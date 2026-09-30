# L'horloge 24 h/24 (pg_cron + pg_net + Supabase Vault)

Presti reste en Vercel Hobby : une tâche planifiée au plus par jour, et les deux sont prises.
L'horloge 24 h/24 vit donc dans Supabase — pg_cron programme, pg_net appelle — indépendante du
poste et de Vercel. Chaque minute, elle règle les baux expirés et les décisions échues dans la
base, puis appelle le tic (`GET /api/agents/tic`) avec un jeton lu dans le Vault, jamais dans ce
dépôt ni dans une conversation.

## Poser le secret `cron_secret` (Benj, seul lui le peut)

1. Tableau de bord Supabase du projet Presti › **Vault** (dans Integrations, ou directement
   Database › Vault selon la version de l'écran) › **Add new secret**.
2. Nom : `cron_secret`. Valeur : celle de `CRON_SECRET` sur Vercel (Settings › Environment
   Variables), recopiée à la main.
3. Enregistrer.

La valeur ne passe jamais par Claude Code, par un fichier du dépôt ni par un message : elle se
recopie une seule fois, de Vercel au Vault, dans l'écran du tableau de bord. Aucun bloc SQL ne la
pose : la fonction du Vault qui écrirait un secret ne s'exécute jamais depuis ce dépôt.

Sans ce secret, la minute ne fait aucun appel : elle écrit un événement `horloge_sans_secret` (une
fois par heure au plus) et s'arrête là. Rien n'est cassé, rien ne part.

## Le changer

Même écran Vault, **Edit** sur la ligne `cron_secret`. Le rappel qui compte : changer
`CRON_SECRET` sur Vercel ne suffit pas — il faut le changer **aux deux endroits**. Oublié, le tic
répond 401 à chaque minute (« le secret du Vault ne correspond pas à `CRON_SECRET` de Vercel »).

## Arrêter l'horloge

Claude Code exécute, par `execute_sql` (connecteur Supabase), sur l'ordre de Benj :

```sql
select cron.unschedule('presti-agents-tic');
```

Le ménage quotidien (`presti-cron-menage`) peut continuer : il ne fait qu'effacer les vieilles
lignes de `cron.job_run_details`, rien qui dépende du tic.

## La voir

- La Salle des machines de la station (Mission Control) ;
- ou Claude Code, par `execute_sql` : `select public.ops_horloge_etat(60);` — job actif, secret
  présent (un booléen, jamais sa valeur), exécutions réussies et échouées, trous de plus de 5 min,
  réponses par code HTTP sur 6 h au plus, dernière exécution.
