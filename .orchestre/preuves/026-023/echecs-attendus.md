# Échecs attendus des juges du lot B (026-023) sur leur arbre de référence

Écrit par `node scripts/juges-026-lt-preuve.mjs --lot=B` le 2026-09-29T03:29:32Z. Chaque juge est lancé par la preuve elle-même : sur l'arbre de référence extrait par `git archive` (`.orchestre/travail/026-lt-preuve/reference`), avec `--racine`, puis avec `--temoin` sur l'arbre courant. L'extrait est la première ligne de critère de la sortie, recopiée telle quelle (seul `|` est échappé en `\|`), puis relue ici et retrouvée dans la sortie par la preuve.

| Juge | Fiche jugée | Commit de référence | Critère attendu en échec | Code | Extrait réel de sa sortie | Verdict du témoin |
|---|---|---|---|---|---|---|
| achat-public-qa | 026-025 | `4041ec9` | AP-1 | 1 | ❌ AP-1 lib/siteAchatPublic.ts absent ; lib/siteCommandeServeur.ts n'exporte pas parametresCheckoutSite ; lib/siteCommandeServeur.ts n'exporte pas poserSessionStripePublique ; app/api/site/commander/public/route.ts absent ; app/api/site/commander/public/renvoyer/route.ts absent | PASS, code 0 (NR : AP-10) |
| lien-connexion-qa | 026-027 | `4041ec9` | LC-1 | 1 | ❌ LC-1 app/api/auth/lien/route.ts absent ; lib/siteAchatPublic.ts absent ; app/connexion/lien/page.tsx absente | PASS, code 0 (NR : LC-9) |
| complement-dossier-qa | 026-030 | `4041ec9` | CD-1 | 1 | ❌ CD-1 app/api/site/commander/complement/route.ts absente ; lib/siteCommande.ts n'exporte pas erreursFabrication ; lib/siteCommandeServeur.ts n'exporte pas completerDossier ; lib/siteCommandeServeur.ts n'exporte pas commandesACompleter | PASS, code 0 (NR : CD-3) |
| achat-ecrans-qa | 026-035 | `4041ec9` | EA-1 | 1 | ❌ EA-1 app/site/acheter/page.tsx absente ; app/site/commander/merci/page.tsx absente | PASS, code 0 (NR : EA-10) |
