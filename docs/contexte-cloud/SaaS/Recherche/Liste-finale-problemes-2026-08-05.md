# Liste finale de problèmes (2026-08-05)

> Synthèse de TOUT ce que Benj a dit. **Contraintes verrouillées :**
> - **SaaS pur** (self-serve, récurrent) — pas de done-for-you.
> - **Cible = non-initiés à l'IA (30-50+), petits commerçants/artisans/pros locaux** qui ne peuvent pas résoudre le problème eux-mêmes.
> - **Canal = Reddit** (Alexandre) + potentiellement FB local.
> - Solo au code + IA (Benj), 0 €, indépendant OFM/YouTube.
>
> **Règle de design (le wedge anti-concurrence) :** ultra-simple, un seul job, un bouton, zéro config. Les outils existants sont trop complexes/chers pour ce client → ils le ratent. C'est là qu'on gagne.

---

### 1. Répondre aux avis Google (e-réputation) — 🟢 reco n°1
- **Qui :** commerces/pros locaux (resto, salon, garage, cabinet) qui reçoivent des avis Google et n'y répondent jamais.
- **Douleur :** avis ignorés (surtout négatifs) = classement Google et confiance qui chutent → clients perdus. Google favorise les fiches qui répondent.
- **Aujourd'hui :** ils ignorent, ou répondent 1 fois sur 10, maladroitement.
- **Le SaaS :** connecte ta fiche Google → l'IA rédige une réponse pro à chaque avis → 1 clic pour publier (ou auto). Récurrent (les avis tombent en continu).
- **Pourquoi gagnable :** Birdeye & co sont chers et pensés pour agences/chaînes ; rien de simple et cheap pour le solo. Trou net.

### 2. Devis & factures à la voix pour artisans — 🟢
- **Qui :** artisans 40-60 ans (plombier, élec, maçon) qui détestent la paperasse.
- **Douleur :** faire un devis propre = galère → ils repoussent, perdent des chantiers, facturent en retard.
- **Aujourd'hui :** Word bricolé, carnet, ou rien.
- **Le SaaS :** tu **dictes le chantier à la voix** → l'IA sort un devis/facture pro (PDF) + relance le paiement. Récurrent.
- **Pourquoi gagnable :** les logiciels de devis (Batappli, Jobber…) sont trop complets/complexes/chers pour un solo. L'angle **voix + ultra-simple** est fait pour le non-tech.

### 3. Rester visible sur Google sans effort — 🟡
- **Qui :** commerces avec fiche Google négligée → invisibles en recherche locale.
- **Le SaaS :** l'IA poste updates/photos/horaires/Q&A et optimise la fiche automatiquement. Récurrent.
- **Pourquoi gagnable :** le local SEO est vendu cher par des agences ; un autopilote simple à ~30 €/mois pour le solo = trou.

### 4. Ne plus rater les demandes clients (réponse + RDV auto) — 🟡
- **Qui :** petits pros qui ratent des leads faute de répondre à temps.
- **Douleur :** un prospect sans réponse en 1h va chez le concurrent.
- **Le SaaS :** l'IA répond aux messages/demandes de devis 24/7 et propose un créneau. Récurrent.
- **Pourquoi gagnable :** chatbots/CRM trop techos ; version "zéro config" pour non-tech.

### 5. Autopilote réseaux sociaux pour commerce local — 🟡
- **Qui :** commerçants qui "savent qu'il faut poster" mais n'ont ni temps ni codes.
- **Le SaaS :** l'IA génère et publie leurs posts FB/Insta chaque semaine, zéro effort.
- **Pourquoi gagnable :** Buffer/Hootsuite trop complexes, agences chères ; autopilote simple = trou.
- ⚠️ ROI moins direct que 1-4, volonté de payer plus faible → plus bas dans la liste.

---

## Reco & prochain pas
- **Mon vote : n°1 (avis Google)** — ROI le plus clair, le plus simple à builder, récurrent, budget prouvé. **n°2 (devis voix artisans)** juste derrière (meilleure UX non-tech).
- Une fois le choix fait → **stress-test Prompt 1** + **10 questions de validation Prompt 2** → interviews avant tout code.
