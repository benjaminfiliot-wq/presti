# Décisions et état du relais

- Décision directe de Benj du 30/09 : conserver l'écosystème actuel, ne pas migrer vers StarNet. Claude fait les fiches et vérifie ; la station web Presti et l'usine restent distinctes.
- Station Claw3D : interface web React/Phaser dans /controle/station, derrière les droits fondateur. Les agents métier tournent dans le bus/routes/SQL/minuteurs ; le moteur de développement distribue des fiches et ne remplace pas les métiers.
- Répartition cloud/PC : Claude cloud conserve juges et migrations, explicitement 026-171, 026-170, 026-194, 026-083. Un seul écrivain par fiche. Claude utilise ses branches claude/… ; Codex garde ses fiches habituelles. Conserver les fichiers PC régénérés contexte.md, digest.md et verdicts.jsonl pendant une synchronisation.
- Main vérifié avant ce paquet : de8e9bb1, Crieur 026-122, déploiement READY. 026-167 et 026-259 ont leurs PASS finaux et sont déployées. Claude peut appliquer 0104 ; aucune application nouvelle de cette migration par Codex n'est revendiquée.
- 026-092 : implémentation PC et masquage financier prêts à relire, FAIL RA-4 du harnais busAgents false/true ; le dernier journal complet précède deux masquages. Ne pas annoncer PASS.
- 026-151 : FAIL officiel MP-1/MP-3. 32 mutations définies, 25 exécutées, 23 détectées, deux survivantes ORB-6 et promotion prix ORB-9, sept non exécutées sur témoins source/quota rouges. Corriger les juges, pas masquer les résultats. MP-4 confirme intégrité du test et nettoyage.
- 026-152 : anciens blocages des juges AP-9 et démarrage Next/Turbopack repérés encore présents ; pas de nouveau verdict.
- Le marqueur moteur.stop du PC a été posé pour éviter les départs concurrents avec Claude cloud ; il ne constitue pas un diagnostic de l'état des services distants. Vérifier les services et quotas en direct avant une reprise.
- Autres IA : Gemini/Antigravity a produit des corrections et audits vérifiés indépendamment. Les essais Hermes/Ollama Cloud et OpenClaw/freellmapi ont rencontré des quotas ; les essais locaux Ollama ont expiré sans résultat exploitable, Laya était peu fiable. État historique du relais, pas disponibilité actuelle. Ne pas confondre installation présente et production prouvée. Ne pas recommencer aveuglément les quotas.

## Accès aux travaux 092/151

- https://github.com/benjaminfiliot-wq/presti/pull/2#issuecomment-5917221803
- https://github.com/benjaminfiliot-wq/presti/pull/3#issuecomment-5917222128
- Branche codex/relais-cloud-0930, commit 81463ca92c2614e698c7137a68a013b41c5e840f : sources courantes non validées, rapports exacts, contrats et photographie du dépôt outil.

Ces points sont l'état du relais, pas une déclaration que tout le chantier est terminé. Les sources datées et les observations PC priment sur les anciennes notes ou résumés ; vérifier les différences avant d'écrire.
