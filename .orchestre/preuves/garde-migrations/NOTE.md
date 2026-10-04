# Essai à sec des migrations 0122 et 0123 (30/09, Claude Code, sous-agent)

Rien n'a été appliqué à la base réelle. Les deux migrations ont été jouées sur un PostgreSQL 16 local jetable, monté avec les
migrations réelles 0096-0099, 0105, 0106, 0111, 0117, 0120 et 0121 (les autres, sans rapport avec les envois, manquent : stockage,
pgmq, pg_cron, vault). `monter-base-essai.sh <nom> <fichiers…>` remonte une base ; les trois `essai-*.sql` se jouent avec psql.

- essai-0122-messagerie.sql : réservation, doublon de clé, pause, accord échu, plafond, échec qui relâche, incertain,
  réconciliation, orphelins, transitions refusées, envoye direct refusé (33 contrôles, tous « OK »).
- essai-0122-formulaires.sql : porteur (réserve, plafond du jour, pas de redonné après bail), consignation avec preuve, échec qui
  relâche, lignes legacy envoye/approuve toujours modifiables, exemption essai_e2e bornée (.invalid).
- essai-0123.sql : STOP hors fil non classé, expéditeur gardé, Répondeur ne le reçoit pas.
- Course à 8 sessions sur un même envoi : 1 seule réservation gagne ; deux lignes de même clé en parallèle : 1 seule gagne.
- Rejeu de 0122 et 0123 sur une base déjà migrée : sans erreur. Les jumeaux nus (scripts/sql-nu.mjs) jouent le même essai.
