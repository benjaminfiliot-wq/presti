# Contre-vérification du 04/10 — 026-194 (Claude Code, régularisation)

Cause du FAIL rejoué ce jour : `--preuve-echecs` de `pont-telegram-qa` et `usine-durcie-qa` prenait l'ARBRE COURANT pour référence des échecs (« aucun fichier du pont »). Depuis que 026-195 et 026-197 ont livré leurs fichiers (fusion du 04/10), l'arbre courant les contient, le juge y passe PT-1 / UD-1 et la preuve rendait « code 0, 1 attendu » : un défaut de JUGE (preuve périmée par l'avancement de la production), pas de produit. Correction sans affaiblir : la référence est un arbre témoin VIDE (dossier vide frère de `.orchestre/travail/<juge>`), même attente (code 1, « FAIL PT-1 » / « FAIL UD-1 » en premier), `--temoin` toujours exigé en code 0.

Les quatre sabotages ci-dessous sont joués dans un bac JETABLE de l'usine (`usine.mjs executer --nom=sab-194`) : le fichier est modifié, le juge rendu, le fichier remis (`mv .sabbak`), puis les deux juges sont rejoués verts. Rien n'a été modifié sur le PC. Sortie réelle (lignes FAIL du juge) :

```
### S1-docs-absent-sed : docs/agents/telegram.md modifié (39 ligne(s) touchée(s))
FAIL PT-1 — docs/agents/telegram.md : 0 octet
FAIL PT-2 — non jugé : PT-1 en échec (fichiers du pont absents)
FAIL PT-3 — non jugé : PT-1 en échec (fichiers du pont absents)
FAIL PT-4 — non jugé : PT-1 en échec (fichiers du pont absents)
### code juge : 1
### S2-service-user-root : scripts/usine/systemd/presti-telegram.service modifié (2 ligne(s) touchée(s))
FAIL PT-13 — User=root : agents attendu
### code juge : 1
### S3-durcir-sans-pipefail : scripts/usine/durcir.sh modifié (2 ligne(s) touchée(s))
FAIL UD-1 — première commande « set -eu », « set -euo pipefail » attendu
### code juge : 1
### S4-durcir-ufw : scripts/usine/durcir.sh modifié (1 ligne(s) touchée(s))
FAIL UD-2 — sous-critère(s) en échec : UD-2f
FAIL UD-2f — ufw écrit dans le script ; [frais] appel ufw allow 22 ; [NFS monté] appel ufw allow 22 ; [second passage] appel ufw allow 22 ; [déjà durci] appel ufw allow 22
### code juge : 1
### contrôle : après remise, juges verts
pont-telegram-qa : PASS
usine-durcie-qa : PASS
```

| # | Sabotage (réversible) | Juge | Résultat attendu | Obtenu |
|---|---|---|---|---|
| S1 | `docs/agents/telegram.md` vidé | pont-telegram-qa | PT-1 rouge | FAIL PT-1 — « docs/agents/telegram.md : 0 octet » (code 1) |
| S2 | `User=agents` → `User=root` dans `presti-telegram.service` | pont-telegram-qa | PT-13 rouge | FAIL PT-13 — « User=root : agents attendu » (code 1) |
| S3 | `set -euo pipefail` → `set -eu` dans `durcir.sh` | usine-durcie-qa | UD-1 rouge | FAIL UD-1 — « première commande « set -eu » » (code 1) |
| S4 | `ufw allow 22` ajouté dans `durcir.sh` | usine-durcie-qa | UD-2 / UD-2f rouges | FAIL UD-2f — « ufw écrit dans le script » aux quatre états (code 1) |

Témoin : `--preuve-echecs` des deux juges rend PASS (arbre témoin vide : code 1, « FAIL PT-1 … absent » / « FAIL UD-1 — scripts/usine/durcir.sh absent » ; `--temoin` code 0).
