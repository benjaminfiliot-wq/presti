# 026-036 — application de 0100 (28/09)

Préalables : essai à sec vert, contre-vérification indépendante verte (contre-verif-28-09.md, attaques refusées, zéro trace).

1. `apply_migration` (projet gorcdvmueakcncsmrouo, nom 0100_ops_file_argent), contenu exact du fichier : succès (pgmq installé par la migration, pas besoin du geste « Activer Queues »).
2. md5(prosrc) en base = corps du fichier : 5/5 (ops_argent_envoyer, _lire, _fait, _etat, _essai_effacer).
3. Contrôle `supabase/controles/0100_ops_file_argent.sql` : 6/6 « oui ».
4. `node scripts/argent-sql-qa.mjs --reel` : PASS FA-8 (envoi, relecture après délai, fait une seule fois, clé anonyme refusée).
5. Zéro trace : 0 message, 0 en file, 0 archivé, 0 événement argent_abandonne.
