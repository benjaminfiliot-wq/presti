# Kit Prospection & Validation — Alexandre

> 📌 **Écrit pour Alexandre — c'est Benj qui reprend.** Depuis le **2026-09-08**, la collaboration est terminée et Benj mène la prospection **seul** ([[Journal-Decisions]]). La méthode reste bonne, c'est le porteur qui change.
> ⚠️ Une réserve : le **playbook de mining Reddit** ne sert pas à distribuer Presti. Le canal a été tranché le 2026-08-05 — **local** (Facebook, forums métier, bouche-à-oreille), les artisans français ne sont pas sur Reddit. Ce kit reste l'outil de **recherche de problème** pour un nouveau produit, pas le canal d'acquisition de Presti.

> Ton outil de terrain. Il sert à 2 choses : **(1) TROUVER le problème** à résoudre en minant les communautés, et **(2) le VALIDER** avec de vrais prospects. Tout est copiable — remplis juste les [crochets].

## Le funnel de découverte (l'ordre à suivre)

1. **MINER** → repérer sur Reddit les douleurs qui reviennent (playbook plus bas) → liste de candidats.
2. **STRESS-TEST** → passer chaque candidat au **Prompt 1** (investisseur sceptique) → écarter les faibles.
3. **VALIDER** → sur le survivant, poser les **10 questions du Prompt 2** à de vrais prospects (DM/appel).
4. **NOTER** → ramener les réponses brutes dans le vault (voir "Où noter" en bas). C'est Benj + Claude qui scorent ensuite.

⚠️ Les prompts 1 et 2 ne *trouvent* pas le problème — ils *trient et valident*. C'est le **mining (étape 1)** qui fait remonter les vrais problèmes. Donc on commence TOUJOURS par miner.

---

## 🔎 Playbook de mining Reddit (étape 1 — le plus important)

**But :** ramener des douleurs réelles, dans les mots des gens, chez des pros **qui ont du budget**.

**Où chercher — subs de pros/indés qui gagnent de l'argent (on vise ceux-là, pas le grand public) :**
- Business/freelance : r/Entrepreneur, r/smallbusiness, r/freelance, r/agency, r/SaaS, r/indiehackers
- E-commerce : r/ecommerce, r/FulfillmentByAmazon, r/Etsy, r/dropship
- Marketing/agences : r/PPC, r/marketing, r/SEO, r/socialmedia
- Tech/services : r/msp, r/webdev, r/bookkeeping, r/Accounting
- Créa/contenu : r/NewTubers, r/youtubers, r/videography, r/editors, r/podcasting
- Métiers/terrain : r/Construction, r/HVAC, r/electricians, r/realtors, r/personaltraining

**Quoi taper dans la barre de recherche d'un sub** (une expression à la fois) :
`I wish there was a tool` · `is there a tool` · `anyone know a tool` · `how do you guys handle` ·
`hate doing` · `waste of time` · `so tedious` · `manually every` · `spreadsheet`

**Quoi ramener pour chaque douleur trouvée** (copie-colle ça dans le vault) :
- Le **lien** du thread + la **phrase exacte** de la douleur
- Le sub + le nombre d'upvotes/commentaires (= à quel point ça résonne)
- Est-ce qu'ils **paient déjà** un truc pour ça ? (outil, freelance, VA) → LE signal le plus important
- Qui souffre exactement (métier précis)

**Règle Reddit :** toujours **value-first**. Tu observes, tu aides, tu ne spammes JAMAIS ta promo (ban direct).

---

## 🧪 Prompt 1 — Stress-test "investisseur sceptique"

> À lancer sur chaque idée qui sort du mining, avant de perdre du temps dessus.

```
Voici mon idée de SaaS : [idée]. Joue le rôle d'un investisseur sceptique.
Donne-moi les 5 raisons pour lesquelles cette idée peut échouer.
Ensuite, donne-moi 3 signaux qui indiqueraient qu'il y a un vrai marché.
```

**Comment lire le résultat :**
- Les **5 raisons d'échec** = ta checklist de trucs à vérifier (si t'as pas de réponse à une, c'est un risque ouvert).
- Les **3 signaux de marché** = exactement ce que tu dois aller **confirmer sur Reddit** (est-ce que ces signaux existent pour de vrai ?).

---

## 🎤 Prompt 2 — 10 questions de validation (interview prospect)

> À utiliser sur le problème survivant, avec de vrais gens de la niche.

```
Je construis un outil qui résout [décris le problème]. Mon client cible est [décris qui il est].
Écris-moi 10 questions de validation que je peux poser à de vrais clients potentiels.
Les questions doivent être spécifiques. Elles ne doivent pas orienter les réponses.
Elles doivent forcer des réponses honnêtes. Inclus des questions sur leur comportement actuel,
leurs dépenses actuelles, leurs plus grandes frustrations, et ce qui les ferait passer
immédiatement à une nouvelle solution.
```

**Règles d'or quand tu poses les questions (façon Mom Test) — sinon les gens te mentent gentiment :**
- Parle de **LEUR passé et de leur quotidien**, pas de ton idée. Ton idée doit presque pas apparaître.
- **Zéro question au futur** (« est-ce que tu utiliserais / paierais… ? ») → les gens sur-promettent.
- Un **compliment n'est pas une donnée** (« super idée ! » = politesse). Ramène au concret : « la dernière fois que c'est arrivé, t'as fait quoi ? »
- Le seul vrai « oui » = quelqu'un qui donne son **temps, son contact, ou son argent**.

---

## 📥 Où noter les trouvailles (pour que rien ne se perde)

- **Douleurs minées sur Reddit** → `Recherche/` (ou balance-les en vrac dans `Idees-Vrac/Inbox`, on trie après).
- **Réponses d'interviews** → `Validation/` (une note par personne : `Interview-[qui]-AAAA-MM-JJ`).
- Dis juste « note ça » à Claude et il range au bon endroit.
