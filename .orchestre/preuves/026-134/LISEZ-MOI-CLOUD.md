# 026-134 — état (fiche produite depuis une session cloud le 30/09)

- `0104_crieur.sql`, ses deux jumeaux et son contrôle sont écrits. `node scripts/crieur-qa.mjs --partie=horloge` : **PASS** (CR-10 à CR-13 et CR-NR), sortie dans `verifier-direct.log`.
- L'essai à sec a tourné sur la production par le connecteur Supabase (`essai-a-sec.txt`) : huit clés à `true`, `APRES rien_ne_reste=true` ; **rien n'a été appliqué**.
- Contre-vérification : `contre-verif-cloud.md` (8 sabotages, sha256 identique avant/après ; deux limites du juge notées).
- **L'orchestre n'a pas pu rendre le verdict officiel** : le disjoncteur a coupé la fiche après trois baux Codex expirés (verdicts du 30/09) et elle est restée dans `file/` (`rejouer --forcer` n'agit que sur `refuse/`). Sur le PC : la mettre en `refuse/` puis `node scripts/orchestre.mjs rejouer 026-134 --forcer`, `prochaine --agent=claude-code --tache=026-134`, `verifier 026-134`, la passer en `fait/`, `verifier` encore.
- **À faire avant l'application** : l'accord de Benj sur le diff (`supabase/**`, règle de la fiche) ; le déploiement de la route `/api/cron/crieur` (026-122, Codex : pas encore faite) ; `apply_migration` nommée `0104_crieur` avec le corps exact du fichier ; le contrôle (`supabase/controles/0104_crieur.sql`, toutes les lignes à « oui »). Le secret `cron_secret` est déjà dans le Vault (0101).
- **Dire à Benj qu'un essai à sec a tourné sur la production** (règle de la fiche).
