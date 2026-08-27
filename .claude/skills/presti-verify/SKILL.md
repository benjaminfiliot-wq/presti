---
name: presti-verify
description: >-
  Discipline de vérification anti-vibecoding pour Presti. À utiliser AVANT de dire "c'est bon" / "fait" /
  "déployé" sur tout changement de code Presti, et pour tester le déploiement. Déclenche : "vérifie",
  "teste", "c'est bon ?", après un build/deploy, avant d'annoncer une feature prête.
---

# Presti — Vérifier (jamais de vibecoding)

Règle : **on ne devine pas, on vérifie**. Une erreur en prod coûte cher. Ne jamais annoncer "c'est bon"
sans avoir bouclé ce cycle.

## Cycle obligatoire à chaque changement
1. **Éditer** proprement (typé, gestion d'erreur, pas de `any` gratuit, pas de secret côté client).
2. **Build** : `npm run build` → **0 erreur**. Un warning "unused" = on nettoie.
3. **Commit + push** (déploiement Vercel auto sur `main`). Si le push GitHub échoue (réseau), retry.
4. **Attendre le déploiement** (~50 s) puis **VÉRIFIER EN DIRECT** :
   - Routes publiques → `curl -s -o /dev/null -w "%{http_code}" https://presti-ashen.vercel.app<route>` = 200.
   - Rendu réel → naviguer dans le navigateur (mcp Browser) puis inspecter le **DOM/CSS via `javascript_tool`**
     (le pane ne "composite" pas → screenshots KO, mais lecture DOM/positions/styles OK).
   - Endpoints protégés → obtenir un token fondateur (login password grant) et tester la réponse JSON.

## Rappels spécifiques Presti
- **Variables d'env Vercel** : ne s'activent qu'après **REDÉPLOIEMENT** (piège classique). Pour diagnostiquer,
  un endpoint temporaire qui liste `Object.keys(process.env)` filtrés (noms seulement, jamais les valeurs).
- **DNS** : le cache local (SFR) est en retard → vérifier via `nslookup <domaine> 8.8.8.8` ou
  `curl --resolve <domaine>:443:76.76.21.21 ...` (IP Vercel).
- **Comptes de test** : les créer via l'API admin Supabase, **les supprimer après**. Benj veut **zéro démo** en base.
- **Founder** : benjaminfiliot@gmail.com / (mot de passe temp). `is_founder` + plan business.

## Suite de tests
Lancer `node scripts/smoke-test.mjs` (racine du repo) : teste routes publiques, pages légales/FAQ + schema,
auth fondateur, endpoints `/api/control/*`, flux devis (create → pdf → payer). Nettoie ses données de test.

## Checklist "feature prête"
- [ ] build 0 erreur — [ ] déployé — [ ] routes 200 — [ ] DOM/rendu vérifié en direct —
  [ ] endpoints testés — [ ] données de test nettoyées — [ ] cockpit de liens à jour si nouveau lien.
