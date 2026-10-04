# 026-196 — reprise du 04/10/2026 soir (claude-code) : tout est prêt sauf les gestes de Benj

Ce n'est pas la preuve de mise en service : `mise-en-service.md` et `telephone.md` n'existent pas, parce que rien de ce qu'ils attestent n'a eu lieu. Aucune
valeur de jeton lue, écrite ou affichée ; rien posé sur l'usine ; aucune unité installée.

## Mesuré le 04/10 (lecture seule)

| Contrôle | Résultat |
|---|---|
| Coffre de l'usine (`usine-coffre.mjs noms`) | `PRESTI_JETON_USINE` seul : ni jeton de bot, ni jeton d'agent, ni identifiant de conversation, ni code |
| `presti-telegram` sous `gardien` | `inactive`, `not-found` (unité non installée) |
| Code déployé sur l'usine | `5ae83863`, origin/main `6d146f4a` : `usine-agents.mjs maj` à jouer (026-195 n'y est pas) |
| Agent `pont_telegram` en base (0112) | présent : capacités notifier, pause, consigne ; plafond d'euros 0 |
| `pont-telegram-qa.mjs --reel` | PT-1 à PT-16 PASS ; **PT-17 FAIL** ; **PT-R FAIL** (`verifier.log`) |

## Ce que seul Benj peut faire (rien ne se passe avant)

1. **Créer le bot** : Telegram, `@BotFather`, `/newbot`, nom « Presti Station ». Il garde le jeton (décision 5 : il ne passe jamais par la conversation).
2. **Déposer le jeton du bot**, dans son propre terminal (saisie masquée) : `node scripts/usine-coffre.mjs poser TELEGRAM_BOT_TOKEN`.
3. **Un « oui » unique** à : jeton de l'agent `pont_telegram` posé par Claude Code sans l'afficher ; mise à jour du code de l'usine ; installation et démarrage de `presti-telegram.service` (configuration persistante).
4. **Envoyer `/start <code>` au bot** dans les 10 min qui suivent le démarrage (le code lui est donné dans la conversation à ce moment-là), puis `/etat`, et dire ce qu'il a reçu.
5. **Confirmer la réception de l'alerte `digest`** (voir plus bas : celle de 7 h 30).

## Blocage indépendant de Benj : PT-17

`docs/agents/openclaw.md` ligne 101 dit que le conteneur n'a *aucune* des quatre variables Telegram, mais en les nommant ; PT-17 refuse tout nom cité dans un fichier
OpenClaw sans lire la négation. Même bot en service, le juge resterait rouge. `docs/**` est interdit à cette fiche. Correctif d'une ligne, déjà simulé contre la
règle PT-17 réelle (aucune erreur après remplacement) : **`fiche-pt17.md`** (même dossier), en-tête validée par `orchestre valider` (id 026-196b) : à déposer dans
`.orchestre/file/` pour qu'un exécutant la prenne.

## Les deux « [à vérifier] » de la fiche, tranchés

- **`presti-journal telegram` n'existe pas** (il n'accepte que chef, atelier, livreur, surveillance, config-codex). Lire le journal par `gardien` :
  `ssh -i ~/.ssh/presti-usine-gardien gardien@88.96.53.3 "sudo -n journalctl -u presti-telegram -n 20 --no-pager"`. La ligne cherchée : `telegram : appairage : chat <id>`
  (`scripts/usine/telegram.mjs` l. 181 ; une seule, écrite seulement pour un code juste).
- **Alerte d'essai `digest`** : aucun moyen de la créer sans envoyer autre chose (`envoyerAlertes` passe par les canaux réels). On attend le digest du veilleur de **7 h 30
  (heure de Paris)** ; le pont le relève dans la minute (relève de sortie toutes les 60 s) ; Benj confirme et on note l'heure dans `telephone.md`. Pas de ligne insérée
  à la main dans `alertes` (trace en production).

## Particularités de l'usine à connaître avant de lancer (mesurées)

- `gardien` n'a pas `sudo` dans `id -nG` mais `sudo -n true` réussit ; `/srv/presti-agents` n'est pas lisible sans sudo ni git sans `safe.directory` : tout passe par `sudo -n`.
- `usine-agents.mjs maj` **refuse** tant qu'un service `presti-*` tourne ; `presti-surveillance.service` tourne (`active running`, résultat success). Il faut donc
  `maj --forcer`, ou `arreter` puis `maj` : à dire à Benj dans le « oui » (la surveillance tourne pendant la mise à jour).
- Aucun minuteur `presti-*` n'est actif sur l'usine.

## Séquence après les points 1 à 3 (une quinzaine de minutes)

```
node scripts/usine-coffre.mjs noms                                     # TELEGRAM_BOT_TOKEN présent (nom seulement)
node scripts/usine-coffre.mjs poser-jeton-agent pont_telegram --nom=PRESTI_JETON_TELEGRAM
$env:TELEGRAM_CHAT_ID = 'aucun'
$env:TELEGRAM_CODE_APPAIRAGE = node -e "const c=require('crypto');const a='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='';for(const b of c.randomBytes(8))s+=a[b%32];process.stdout.write(s)"
node scripts/usine-coffre.mjs poser TELEGRAM_CHAT_ID --depuis-env=TELEGRAM_CHAT_ID
node scripts/usine-coffre.mjs poser TELEGRAM_CODE_APPAIRAGE --depuis-env=TELEGRAM_CODE_APPAIRAGE
node scripts/usine-agents.mjs maj --forcer                              # si le « oui » le couvre
ssh -i ~/.ssh/presti-usine-gardien gardien@88.96.53.3 \
  "sudo -n install -m 644 /srv/presti-agents/scripts/usine/systemd/presti-telegram.service /etc/systemd/system/ && sudo -n systemd-analyze verify /etc/systemd/system/presti-telegram.service && sudo -n systemctl daemon-reload && sudo -n systemctl enable --now presti-telegram && sudo -n sha256sum /etc/systemd/system/presti-telegram.service"
# → donner le code à Benj (il vaut 10 min) ; il envoie /start <code> ; puis journalctl (ci-dessus) : une seule ligne « appairage : chat <id> »
$env:TELEGRAM_CHAT_ID = '<id lu>' ; node scripts/usine-coffre.mjs poser TELEGRAM_CHAT_ID --depuis-env=TELEGRAM_CHAT_ID
$env:TELEGRAM_CODE_APPAIRAGE = 'epuise' ; node scripts/usine-coffre.mjs poser TELEGRAM_CODE_APPAIRAGE --depuis-env=TELEGRAM_CODE_APPAIRAGE
ssh … "sudo -n systemctl restart presti-telegram"
# Benj : /etat ; note dans telephone.md (réponse reçue, datée) ; digest de 7 h 30 noté ; puis :
node scripts/pont-telegram-qa.mjs --reel                                # PT-17 vert seulement après 026-196b
```

Aucune ligne après 10 min : nouveau code, on recommence. Deux lignes : ne rien poser, le dire à Benj. Jamais de `/pause` d'essai en production.
Puis `presti-ops/usine/LISEZMOI.md` (hors dépôt) : le service, ses quatre noms du coffre (noms seulement), `systemctl stop presti-telegram` pour l'arrêter.
