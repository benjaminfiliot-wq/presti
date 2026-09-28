# 026-060 — application de 0105 (28/09)

Préalables : essai à sec vert (OA-1 à OA-13), contre-vérification indépendante verte (contre-verif-28-09.md : 19 attaques refusées, zéro trace ; le rouge d'OA-6 venait de lib/siteRedacteur.ts modifié au même moment par 026-093, commitée depuis).

1. `apply_migration` (projet gorcdvmueakcncsmrouo, nom 0105_acquisition_socle), contenu exact du fichier : succès.
2. md5(prosrc) en base = corps du fichier : 14/14 fonctions acq_*.
3. Contrôle `supabase/controles/0105_acquisition_socle.sql` : 22/22 « oui ».
4. `node scripts/ops-acquisition-qa.mjs --migration=socle --reel --confirmer-reel` : PASS (OA-R : 15 agents et leurs périodes, acq_en_pause, curseur, clé anonyme refusée 401 42501).
5. Ménage : le schéma ops étant fermé à service_role, le juge écrit son ménage pour le connecteur ; passé par execute_sql, strictement sur la marque essai-026-acq-1790589430936 : 2 oppositions, 3 prospects (.invalid), 1 curseur effacés. Zéro trace ensuite. Le jeton Meta n'est pas posé (coffre vide, geste de mise en service).
