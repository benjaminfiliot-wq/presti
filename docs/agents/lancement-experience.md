# Lancer une expérience après la première vente

Fiche 026-227. Code : `scripts/chef/lancer-experience.mjs` (`lancerExperience`, `conclureExperience`, `arreterExperience`). Juge : `node scripts/juges-026-completude-qa.mjs --partie=experience`. Contrat : `--contrat=experience`.

« Expérience » désigne une **mesure bornée**, pas une autorisation d'agir sur les clients. Le module tient un registre d'expériences et refuse, avant toute écriture et tout événement, ce qui n'est pas prouvé. Il ne contacte personne, ne dépense rien, n'appelle aucune IA (donc aucune donnée de prospect ne part vers un Cloud gratuit), ne bascule aucun drapeau et ne modifie aucun prix.

## Statut de mise en service

Inactif tant que 026-220, 026-226 et 026-103 n'ont pas de PASS (`verdicts.jsonl` et `fait/`) : la ligne de commande refuse l'usage réel et répond « en attente ». L'essai fictif `--a-sec` reste permis : il écrit sous `.orchestre/travail/experiences-a-sec/`, marque ses événements `a_sec: true` et ne vaut pas une mise en service. Aucune expérience ne rouvre le froid avant le **12/10** (portée `froid` refusée avant cette date).

## Ce qui est exigé avant le premier événement

1. **Première vente réelle** : au moins une vente `statut: "encaisse"`, `confirme: true`, `test: false`, avec une `source` (identifiant de l'événement du système de vente). Un devis, une commande en attente, un événement de test, un encaissement non confirmé, sans source ou **sans indicateur** (« confirmé » ou « test » absent n'est pas un « non ») ne comptent pas. Système de vente muet ou liste illisible : « première vente non prouvée », refus.
2. **Cadre complet** : `id` (minuscules, chiffres, tirets), `version` (entier ≥ 1), `source` (`douleurs-AAAA-MM` issue de la passe 026-226, ou `decision-benj`), `objectif`, `metrique { nom, depart, sens? }` (`sens` : `baisse` ou `hausse`), `horizon_jours`, `population` (un segment, jamais des personnes), `seuil_arret`, `cout_max_eur` (≥ 0), `touche` (portées : clients, prix, droits, messages, froid, achat, envoi, site, contenu, interne). Un champ manquant ou une portée inconnue : refus `cadre`.
3. **Aucune donnée personnelle ni secret** dans la demande (adresse e-mail, téléphone, jeton) : refus `donnee_personnelle` ou `secret`.
4. **Gardes** : une portée sensible (clients, prix, droits, messages, froid, achat, envoi) inscrit `a_valider_par: ['claude-code', 'benj']` dans l'enregistrement ; **Benj autorise tout achat ou envoi**, séparément de l'accord sur l'objectif. Ce module n'en fait aucun.

## Les cinq états

`proposée` → `approuvée` → `en cours` → `arrêtée` ou `conclue`.

- Sans accord de Benj sur l'**objectif exact** : l'expérience est enregistrée `proposée`, sans événement. Relancer le même id avec l'accord la fait démarrer.
- Avec accord (`accord_benj { id, objectif, date, expire_le? }`) : `approuvée` écrite, **un** événement `demarrage` (clé d'idempotence `experience:<id>:v<version>:demarrage`), puis `en cours`. Une coupure entre les deux laisse `approuvée` : la reprise réémet la même clé, jamais un second démarrage aveugle.
- Un accord sur un autre objectif, daté du futur, expiré ou incomplet est refusé (`accord_autre_objectif`, `accord_invalide`, `accord_perime`) ; il n'est jamais pris pour un accord.
- **Un id = une expérience** : le deuxième lancement identique rend `deja: true`, sans événement ni écriture. Un objectif, une métrique, un horizon, une population, un seuil, un coût ou une portée **modifiés** : refus `nouvel_accord` (nouvelle version ou nouvel id, avec un nouvel accord).

## Mesurer, arrêter, conclure

- `conclureExperience({ id, mesure: { valeur, source, periode, cout_eur? } })` : seule une expérience `en cours` se conclut. Valeur, source ou période absente : **`arrêtée`, conclusion « non mesuré »**, voie suspendue, `succes: false` ; la valeur n'est jamais remplacée par 0 ni par un succès.
- `arreterExperience({ id, motif })` : arrêt forcé (seuil atteint, ordre de Benj). Même conclusion « non mesuré », événement `suspension` si elle avait démarré.
- Coût constaté supérieur à `cout_max_eur` : `arrêtée` (« arrêt : coût maximum dépassé »), bilan conservé.
- Une expérience `arrêtée` ou `conclue` n'est plus modifiée (reprise : `deja: true`).

## Le bilan

Trois sections séparées (`bilanEnTexte`) : **observation** (valeur, départ, période, source), **inférence** (écart au départ ; jugé « amélioration » ou « dégradation » seulement si le sens de la métrique est déclaré), **décision** (« recommandation soumise à Benj ; aucun drapeau ni prix modifié »), plus les **limites** (une seule mesure, aucun groupe témoin, coût non fourni ou dépassé). `succes` reste `null` : le module ne décide pas qu'une expérience a réussi. Aucune bascule de drapeau produit ni modification de prix ne découle du bilan.

## Ligne de commande

```
node scripts/chef/lancer-experience.mjs --lancer=<demande.json> --ventes=<ventes.json> [--a-sec]
node scripts/chef/lancer-experience.mjs --conclure=<id> --mesure=<mesure.json> [--a-sec]
node scripts/chef/lancer-experience.mjs --arreter=<id> --motif="…" [--a-sec]
node scripts/chef/lancer-experience.mjs --etat=<id> [--a-sec]
```

Codes : 0 fait (reprise identique comprise) ; 2 usage ou fichier illisible ; 3 refus avec son critère, ou fiche en attente. Les sorties ne portent que l'id, l'état et le critère. `ventes.json` doit être l'**export du système de vente** (rapprochement du Comptable, lecture seule), jamais un fichier tapé à la main : le module ne peut pas prouver l'origine d'un fichier, l'honnêteté de l'export reste une règle d'exploitation. Les événements vont dans le journal local `evenements.jsonl` du dossier de travail ; les brancher au bus est un geste distinct.

## Limites connues

- La première vente se lit dans une liste fournie ; sans elle (`--ventes` absent), tout lancement est refusé.
- Le `seuil_arret` est un texte écrit avant le départ : il ne s'évalue pas tout seul, l'arrêt se déclenche par `--arreter` ou par la mesure.
- Un service ou un modèle mis à jour exige un nouveau contrôle des permissions, droits et coûts avant activation ; sans preuve, l'outil reste inactif et le repli (`--a-sec`, refus nommé) reste visible.
