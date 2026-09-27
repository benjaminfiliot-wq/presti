# L'horloge des agents (TÉMOIN de 026-032, pour éprouver HS-7)

L'horloge tourne dans Supabase, chaque minute, par pg_cron et pg_net. Rien ne dépend du poste.

## Poser le secret

Dans le tableau de bord Supabase, ouvrir Integrations › Vault, puis « Add new secret ». Nom : `cron_secret`. Valeur : celle de
`CRON_SECRET`, recopiée depuis Vercel (Settings › Environment Variables). La valeur ne passe jamais par Claude Code, par un
fichier ni par un message.

## Le changer

Même écran, « Edit ». Changer `CRON_SECRET` sur Vercel, c'est aussi le changer dans le Vault : il faut le changer aux deux
endroits, sinon le tic répond 401.

## Arrêter l'horloge

Sur l'ordre de Benj, Claude Code exécute `select cron.unschedule('presti-agents-tic')` par `execute_sql`.

## La voir

La Salle des machines de la station, ou Claude Code par `execute_sql` : `select public.ops_horloge_etat(60)`.
