# Presti — l'application

SaaS pour artisans : répond aux demandes de devis en moins d'une minute et relance à leur place, pour ne plus perdre de chantiers.

## Étape 1 (actuelle) — Socle + authentification
Inscription / connexion / déconnexion d'un artisan via Supabase. Testable seul.

## Démarrer (≈ 5 min)
1. **Crée un projet Supabase** (gratuit) : https://supabase.com → *New project*.
2. Dans Supabase → *Project Settings → API* : copie l'**URL du projet** et la clé **anon public**.
3. Copie `.env.local.example` en **`.env.local`** et colle tes 2 valeurs.
4. Dans Supabase → *SQL Editor* : colle et exécute `supabase/migrations/0001_artisans.sql`.
5. (Dev) Supabase → *Authentication → Providers → Email* : décoche **« Confirm email »** pour tester sans email de confirmation.
6. Installe et lance :
   ```bash
   npm install
   npm run dev
   ```
7. Ouvre **http://localhost:3000** → crée un compte → connecte-toi → tu arrives sur le tableau de bord. ✅

## Stack
Next.js (App Router, TypeScript) · Supabase (auth + Postgres). À venir : Claude (réponses/devis), Stripe (abonnements), Resend (emails).

## Suite
Plan de dev complet dans le vault Obsidian : `Documents/SaaS/Produit/Plan-Developpement.md` (étapes 2 → 10).
