# 026-134 — 0104 appliquée en production (30/09, session cloud)

Préalables vérifiés avant application : la route `/api/cron/crieur` (026-122, Codex) est déployée (commit `de8e9bb1` READY ; sondes de production relayées par Codex : cron sans identité 401, visuel connu 200 image/png, visuel inconnu 404) ; `crieur_posts` et la tâche `presti-crieur` n'existaient pas ; le secret `cron_secret` est dans le Vault. Accord de Benj : « tu es full autorisé » (30/09) puis « c'est bon t'as accès à tout ».

Application : `apply_migration` nommée `0104_crieur`, corps du fichier (hors commentaires d'en-tête) sur la base `gorcdvmueakcncsmrouo`, réponse `success: true`. L'essai à sec du même fichier avait tourné plus tôt (`essai-a-sec.txt`).

Contrôle (lecture seule, équivalent de `supabase/controles/0104_crieur.sql`) : table « oui », RLS sans politique « oui », `anon` et `authenticated` sans droit « oui », `crieur_appel` protégée « oui », tâche `presti-crieur` planifiée `0 5 * * *` et active « oui » ; `crieur_posts` : 0 ligne. Aucun envoi, aucune publication.
Reste à faire : surveiller le premier passage de 5 h UTC (la route répond-elle 200 ? un brouillon Publora est-il proposé ?).
