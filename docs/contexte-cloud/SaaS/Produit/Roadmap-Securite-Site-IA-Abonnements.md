---
type: produit
sujet: roadmap post-QG (sécurité → site → IA → abonnements)
date: 2026-08-27
---

# Roadmap — Sécurité → Site → IA → Abonnements

> Basé sur les 5 vidéos ([[Videos-decortiquees]]) + demandes de Benj. **Règle d'or : pas de vibecoding**, tout vérifié.

## Phase A — Fondation qualité & tests *(en cours)*
- [x] **Pages légales** : CGU, Politique de confidentialité (RGPD), Mentions légales → `/cgu` `/confidentialite` `/mentions-legales`
- [x] **FAQ** + **données structurées** (schema FAQPage → rich results) + SoftwareApplication sur la landing
- [ ] **Agent d'audit sécurité** du code (auth, RLS, secrets, validation) — lancé
- [ ] **Skills** réutilisables : `presti-verify`, `presti-design`, `presti-legal-fr`
- [ ] **Suite de tests** (smoke-test : routes, endpoints, intégrations)

## Phase B — Marque / INPI  ⚠️ RISQUE TROUVÉ
- [x] Vérif faite (agent). **Homonyme exact `presti.ai`** = startup SaaS IA française (Paris, Station F, YC, ~3,5 M$), même classes 9/42, vertical différent (e-commerce vs BTP). **Risque MOYEN→ÉLEVÉ**. Détail : [[INPI-marque-Presti]].
- [ ] **Décision Benj** : garder « Presti » nu (risqué) / distinctif (« Presti Pro/Devis ») / renommer (shortlist Réacto/Sitô). Idéalement valider avec un conseil PI avant dépôt (~190 €/classe).

## Phase C — Refonte du site (#2)  ✅ v1 LIVRÉE (27/08)
- [x] Landing **orientée solutions + démos** : 3 blocs (réponse instantanée=mini-chat, devis=mini-devis, relances=timeline animée au reveal).
- [x] **Cartes de réassurance** animées (✓ Rapide/Fiable/Sécurisé/Sans carte — V2, les ✓ se dessinent).
- [x] Section **IA/adaptabilité** (puces : métiers, ton, cas particuliers, 3 niveaux).
- [x] Fix bug : headers crème → sombres (cohérence dark).
- [x] Vérifié live (DOM + styles calculés) + smoke-test 17/17.
- ADN dark cinématique conservé. **Anim niveau à pousser encore** si Benj veut (v1 = solide + robuste, pas gadget).

## Phase D — IA (#3)
- **Amélioration considérable** de l'intelligence + **adaptabilité largement supérieure** (s'adapte à toute demande : chiffrage, ton, cas particuliers).
- **Augmentation des fonctionnalités**.

## Phase E — Abonnements (#4)
**Modèle à crédits.** (⚠️ le comptage réel des crédits = à implémenter côté serveur, se branche avec la facturation.)
- **Essai gratuit** : très limité — **1 à 3 essais** seulement, qui donnent « les meilleures stratégies ». S'arrête là.
- **Palier 1 — Basique** : fonctionnalités de base = **devis + facturation**, **crédits limités**.
- **Palier 2 — (plus cher)** : + **création de site web** + accès à **tous les modèles IA SAUF le dernier** (le dernier = utilisable **5 à 10 fois max**, selon crédits). Système de crédits.
- **Palier 3 — (le plus cher)** : + **système de réponse automatique** (avec **mise en place d'une page web** dédiée), le tout avec un **taux/crédits limités**.

---

## 🛡️ Principes qualité — ANTI-VIBECODING (V1 + insistance Benj)
1. **Jamais de code “au feeling”** : chaque changement est réfléchi, typé, testé.
2. **Cycle systématique** : éditer → `npm run build` (0 erreur) → déployer → **vérifier en direct** (DOM/endpoints via navigateur + curl) avant de dire « c'est bon ».
3. **Corrections incrémentales** : fixer l'existant, ne pas tout raser ([[benj-corrections-incrementales]]).
4. **Sécurité par défaut** : auth sur chaque route, secrets côté serveur uniquement, isolation des données par compte.
5. **Données structurées** (schema.org) sur les pages publiques → rich results.
6. **Une erreur en prod coûte cher** → on vérifie, on ne devine pas.
