# `lib/ai/` — l'IA de Presti, plus haute et plus adaptable (v5 §7)

Le moteur reste `lib/ai.ts` (cadrage déterministe `analyzeLead`, prompts, paliers, thinking
adaptatif, chiffrage). Ce dossier l'**enrichit** sans le réécrire.

## Ce qui existe

| Fichier | Rôle |
|---|---|
| `metiers.ts` | 8 profils métier (plombier, électricien, menuisier, maçon, peintre, carreleur, couvreur, paysagiste) : vocabulaire, 3 questions de qualification, pièges, unités, TVA. `profilMetier(artisans.metier)` fait une correspondance souple (« Plombier-chauffagiste » → plombier), repli générique. `regleTva` : la **franchise en base prime** sur la TVA du métier. |
| `playbooks.ts` | Un playbook par intention (`analyzeLead().primary`) : urgence → sécurité d'abord puis créneau ; devis → surface, matériaux, photos, accès ; RDV → créneaux ; réclamation → escalade humaine immédiate. **3 questions max sur toute la conversation** (`questionsDejaPosees(history)` compte celles déjà posées). |
| `exemples.ts` | Few-shot : les 3 dernières réponses manuelles de l'artisan, ses 3 derniers devis acceptés, ses prix (`prix_artisan`). Injectés comme **exemples de ton et de forme, jamais comme faits** ; plafond ~1 500 tokens. `avecPrix: true` seulement pour le chiffrage. |
| `outils.ts` | Tool use : `consulter_prix`, `consulter_disponibilites` (texte libre rendu tel quel), `creer_devis_brouillon` (via `lib/devisAuto.ts`, source `'outil'`, un seul par conversation), `demander_photo`, `proposer_rdv`, `escalader`. **`repondreAvecOutils(...)`** fait la boucle (4 tours, 40 s) et rend `{ texte, actions[], tier, model, routage, … }`. Les exécuteurs sont fermés sur l'artisan et le lead de la conversation : aucun identifiant ne vient du modèle. Exécuteurs injectables pour les tests. |
| `routage.ts` | `routerModele({ plan, demande, signaux })` : Standard par défaut ; Pro automatique sur complexité (`COMPLEXE_KEYWORDS`, multi-postes, réclamation, contraintes) **si `peut(plan, 'plateforme.ia.auto')`** ; Expert uniquement sur demande explicite. Rend `tier`, `model` et un `libelle` (« répondu avec Pro »). |
| `antiFabrication.ts` | Filtre étendu : capacités non déclarées (déplacement gratuit, atelier, délai chiffré, 7j/7, garantie/certification, prestation absente de `artisans.services`) par comparaison au profil, + montants chiffrés. `assainirReponse` régénère **une fois** avec le rappel nommé, puis **dégrade** (retire la phrase). Actif dès que l'appelant fournit `services`/`horaires`/`zone`/`bio` dans l'objet artisan — sans ces champs, les routes historiques gardent exactement leur comportement. |

Branchement dans `lib/ai.ts` : `generateLeadReply`, `generateConversationReply` (via `preparerConversation`, partagé avec l'assistant à outils), `generateRelanceReply` et `generateDevis` reçoivent le bloc métier, le profil déclaré, le playbook et les exemples. `analyzeLead` gagne `multiPostes`. Le parsing qui ignore les blocs `thinking` est inchangé.

## Comment tester

```bash
# Tests unitaires purs (aucun appel IA, aucune base) — 94 assertions
node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/ia-unit-e2e.mjs

# Éval (consomme des crédits) : 8 métiers × 5 intentions, scoring automatique + 3 cas à relire
node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/ai-eval.mjs --tiers standard,pro --metiers 4 --expert --outils
node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/ai-eval.mjs --avant   # version HEAD de lib/ai.ts (copie dans le scratchpad)

npx tsc --noEmit
```

`scripts/ts-loader.mjs` résout `@/lib/...` et les imports sans extension pour Node — plus besoin de tsx.

## Ce que l'éval a montré

Voir le tableau avant/après dans le rapport de sprint (`plans/journal-v5.md`, bloc §7). Critères : ton respecté (vouvoiement/tutoiement + signature), aucun prix chiffré, ≤ 3 questions, aucune capacité non déclarée, < 900 caractères, vocabulaire du métier présent.

## Pièges connus

- `temperature` est déprécié sur le 5-series : ne jamais le remettre. Thinking = `{ type: 'adaptive' }` (via `genParams`).
- Un prix consulté par l'outil sert au devis ; le filtre retire tout montant qui fuirait dans le texte.
- Le streaming (`onDelta`) ne peut pas régénérer : le filtre étendu vit dans `repondreAvecOutils` et dans les chemins non-stream.
