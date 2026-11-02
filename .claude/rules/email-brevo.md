# E-mail en masse — Brevo gratuit (décision verrouillée)

Décision de Benj du 01/11/2026 (addendum §4) : option A retenue, Brevo plan gratuit.
Pourquoi : vault `C:/Users/benja/Documents/SaaS`, notes posées le 01/11/2026 (phase 1.4) :
`10 Presti/04 Décisions/ADR-004 — Brevo gratuit pour l'e-mail en masse.md`,
`10 Presti/04 Décisions/ADR-005 — Prospection e-mail automatique.md`.

## Le plan gratuit
- 300 e-mails/jour maximum, non cumulables d'un jour sur l'autre.
- 100 000 contacts stockés.
- Automatisations Brevo limitées à 2 000 contacts uniques.
- Intégration n8n native : node Brevo (contacts + envoi) et Brevo Trigger.
- Le branding Brevo est présent sur les e-mails.

## Règles d'usage
- La prospection e-mail automatique respecte le plafond de 300/jour.
- Le workflow n8n vérifie le quota restant avant chaque campagne.
- Plafond atteint : la campagne est mise en file pour le lendemain. Jamais bloquée, jamais perdue.
- Les relances de factures et de devis clients vivent dans un workflow n8n distinct de la
  prospection froide, pour ne pas consommer le même quota.
- Brevo Trigger capte les réponses, les bounces et les désabonnements, et met à jour Supabase
  en temps réel.

## Garde-fous de la prospection automatique (ADR-005)
- Plafond de 300/jour.
- Opt-out.
- Exclusion.
- Journalisation.
- Aucune validation de Benj n'est demandée avant l'envoi (`autonomie-abonnements.md`).

## Seuil de bascule
- Moins de 9 000 e-mails/mois : Brevo gratuit suffit.
- Plus de 9 000/mois, ou plus de 2 000 contacts uniques en automatisation :
  basculer vers Listmonk auto-hébergé sur Oracle + SES,
  en remplaçant seulement le node Brevo par un node HTTP Request.

## Ce qui ne change pas
- Toute automatisation d'envoi vit dans n8n (`architecture-outils.md`).
- Aucune clé Brevo dans un fichier versionné (`securite.md`).
- Aucune donnée de prospect envoyée à un modèle gratuit en ligne (`securite.md`).
