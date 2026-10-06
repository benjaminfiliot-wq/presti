# Tableau de bord de gestion de l'artisan — `/chiffres`

Écran livré le 06/10/2026 (pas encore poussé). Entrée « Mes chiffres » dans le groupe Pilotage de l'espace connecté
(`app/AppShell.tsx`). Il ne remplace pas `/dashboard`, qui reste la boîte des demandes : `/chiffres` répond à « où en est
mon argent, et mon activité ? », calculé à partir de ce qui est déjà dans Presti — aucune saisie, aucun tableur.

## Ce que l'artisan y voit

| Bloc | Définition exacte (voir `lib/tableau-de-bord/calculer.ts`) |
|---|---|
| Facturé ce mois / mois dernier / année | factures émises ou payées, rangées par `date_emission` (heure de Paris). Brouillons, factures annulées et **avoirs** exclus. |
| Variation | écart en % avec le mois précédent ; « rien à comparer » si le mois précédent est à zéro (jamais un faux 0 %). |
| Encaissé | factures `payee` émises cette année. La base ne garde pas la date du règlement : pas d'« encaissé ce mois ». |
| En attente / en retard | factures `emise` ; en retard = échéance **strictement** passée. Sans échéance : en attente. |
| Devis (12 mois) | envoyés = tout sauf brouillon ; acceptés ; taux = acceptés / envoyés (`—` s'il n'y en a aucun). |
| Délai demande → devis | pour chaque demande, son premier devis, mesuré jusqu'à l'envoi (à défaut la création). Moyenne. |
| Devis à relancer | statut `envoye`, plus de 7 jours, et encore dans sa durée de validité (`validite_jours`, 90 par défaut). |
| Demandes par mois et par canal | 6 mois ; un canal vide s'appelle « Autre ». |
| Types de chantier / villes | top 5 ; casse, accents et tirets regroupés (« lyon » = « Lyon »). |

**Franchise en base (art. 293 B) :** un seul montant par pièce, `total_ttc`, qui en franchise est le prix payé. Le module ne lit jamais
`total_tva` ni `total_ht`, et aucun mot TVA / HT / TTC n'apparaît à l'écran (le juge le vérifie sur le HTML rendu).

## Isolation

Chaque requête de la page porte `.eq('artisan_id', uid)` (un fondateur voit les lignes de tous sous RLS, migration 0006), la page n'écrit
rien et n'utilise jamais la clé de service ; et `calculer()` écarte de toute façon une ligne qui n'a pas l'`artisan_id` demandé.
Un chargement en échec affiche une erreur, jamais des zéros.

## Limites connues (constatées en production le 06/10)

- **La table `clients` est vide** (0 ligne) et `devis.client_adresse` / `factures.adresse_chantier` ne sont jamais remplies : le bloc
  « Villes » affichera son message vide tant qu'aucun écran n'écrit la ville d'un client. Suite possible : l'enregistrer à la création du
  devis, ou la lire dans l'adresse de la demande.
- Seuls 6 leads sur 88 ont un `type_chantier` : le bloc « Types de chantier » est maigre tant que la qualification n'est pas meilleure.
- Aucune migration n'a été écrite ni appliquée : tout est calculé côté application, sur des requêtes simples (1 000 lignes au plus par
  table ; au-delà, l'écran le dit au lieu de présenter des totaux incomplets).
- Un avoir est toujours total dans Presti : si un avoir partiel existe un jour, l'exclusion « facture annulée + avoir » est à revoir.

## À AJOUTER À LA VITRINE (règle de la maison — non fait dans cette passe, la landing n'a pas été touchée)

Une fonctionnalité livrée doit se voir sur la landing. Le support est `app/DemoSequence.tsx` (un scénario, pas un catalogue ; chaque scène
est une **capture réelle** prise par `scripts/demo-captures.mjs`, rien n'est dessiné à la main).

1. **Une sixième scène à la suite de « Vous validez, le client accepte »** : `{ heure: 'Fin de mois', titre: 'Vos chiffres, sans tableur',
   texte: 'Ce que vous avez facturé, ce qui est encaissé, ce qui traîne, les devis à relancer — calculé à partir de vos devis et factures.',
   appareil: 'ordinateur', image: '/demo/scene-6.webp', focus: '50% 0%' }`. Penser à `aria-label` de la région (« le parcours en N scènes »
   est dérivé de `SCENES.length`) et aux variantes `-390` / `-520` produites par le script d'images.
2. **La capture** : dans `scripts/demo-captures.mjs`, après la scène 4, semer pour le compte de démonstration (API admin, comme le reste du
   script) 4 à 6 factures sur les trois derniers mois — dont une payée, une émise et une **échue** — et 2 devis envoyés depuis plus de 7 jours,
   ouvrir `/chiffres` en bureau, capturer `scene-6`, puis détruire le compte comme aujourd'hui. Sans ces lignes l'écran est vide et ne montre rien.
   Aucune TVA à l'image (franchise) ; les noms de clients de la capture sont fictifs.
3. **Une rangée `.lp-feat`** « Vos chiffres en un coup d'œil » (même gabarit que les autres rangées) pointant vers cette scène.
4. Si la sixième scène allonge trop le défilement automatique (4,8 s par scène), la mettre derrière un drapeau de `lib/flags.ts` tant que la
   capture n'est pas prise : « une fonctionnalité non finie n'apparaît pas ».

## Vérifier

```bash
node scripts/tableau-de-bord-qa.mjs                  # critères TB-1 … TB-18
node scripts/tableau-de-bord-qa.mjs --preuve-echecs  # + chaque sabotage doit rendre un critère rouge
npm run typecheck
```
