# Journal d'apprentissage — MAILS

Mémoire vivante de la catégorie Mails. Chaque agent AJOUTE une entrée après mission
(format dans `PROTOCOLE.md`). Les faits durables sont promus dans `mails.md`.

## 2026-08-31 — presti-mails-delivrabilite — Domaine Resend VERIFIED
- Contexte : vérification Resend demandée par Benj.
- Constat : `prestiapp.fr` = **verified** (DKIM `resend._domainkey`, SPF `send`, MX `send`
  posés chez OVH et propagés). Envoi de test (contact@prestiapp.fr → benjaminfiliot@gmail.com)
  accepté (HTTP 200 + id Resend).
- Décision : les emails partent désormais aux vraies adresses (réponses auto, notifs, relances).
- À retenir : domaine neuf → surveiller bounces/plaintes, montée en charge progressive ;
  1er email possible en spam le temps d'établir la réputation. Envisager de durcir DMARC
  (`p=none` → `quarantine`) une fois la réputation établie.

## 2026-08-31 — presti-mails-cycle — Garde-fous confirmés
- À retenir : conversation multi-tour = ton vivant, PAS de « Bonjour »/signature à chaque
  message ; jamais de prix chiffré ; toujours une prochaine étape. Relances J+2/5/10, stop
  à la réponse. Éval via `scripts/ai-eval.mjs` avant/après tout changement de prompt.
