# Journal d'apprentissage — AUDIT

Mémoire vivante de la catégorie Audit. Chaque agent AJOUTE une entrée après mission
(format dans `PROTOCOLE.md`). Les faits durables sont promus dans `audit.md`.

## 2026-08-31 — presti-auditeur — Amorçage + audit plateforme conversation
- Contexte : audit de la nouvelle plateforme de conversation (leads/messages, jetons).
- Constat : `/api/conversation` et `/api/messages` insèrent des messages via service_role
  APRÈS contrôle de propriété (pas d'INSERT client sur `messages` = correct). Jeton de
  conversation = uuid non devinable, validé par regex avant toute requête. Honeypot +
  ban IP + anti-flood + plafond de tours en place. XSS JSON-LD corrigé (`<`).
- Décision : posture jugée saine sur ce périmètre ; à re-vérifier après chaque nouvelle route publique.
- À retenir : **toute route publique** doit passer par le trio ban IP + honeypot +
  rate-limit, et toute insertion de message serveur doit précéder d'un contrôle de propriété.

## 2026-08-31 — presti-audit-conformite — Vérif mentions devis/facture
- Contexte : rappel des obligations légales artisan.
- À retenir : assurance décennale = mention OBLIGATOIRE sur les devis ; TVA choisie ligne
  par ligne ; franchise en base = mention art. 293 B CGI. Vérifier que `lib/DevisPDF.tsx`
  et l'éditeur les rendent toujours quand renseignées.
