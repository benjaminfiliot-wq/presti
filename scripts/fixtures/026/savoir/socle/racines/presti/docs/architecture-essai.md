# Architecture (essai)

Le front et les routes API sont en Next.js ; les données vivent dans Supabase avec des règles RLS.
Les paiements passent par Stripe : les webhooks Stripe mettent à jour l'abonnement.
Chaque push déclenche un déploiement Vercel ; un déploiement en erreur se vérifie après chaque push.
