# Rapport de validation — Tâche 023-04
**Script :** `scripts/publier-serie.mjs`  
**Testeur :** `scripts/publier-serie-qa.mjs`  
**Date :** 16 septembre 2026  
**Verdict QA :** 62 réussis, 0 échoué, code 0

---

## 1. Contexte et Objectifs

`scripts/publier-serie.mjs` assure la programmation quotidienne automatisée de la série 2 dans Publora (3 publications max programmées, horizon 7 jours, ancre au 14/09/2026). Une analyse indépendante avait identifié 5 défauts majeurs dans la version réécrite par Claude Code le 16/09. Cette tâche 023-04 finalise et prouve les corrections de ces 5 défauts sur un faux Publora complet sans appel réseau réel.

---

## 2. Détail des 5 défauts, corrections et preuves

### Défaut 1 : Visuel Facebook erroné via `estVisuelPresti`
- **Problème :** L'ancienne fonction `estVisuelPresti` validait n'importe quelle image présente dans `publications/` (426 fichiers). Un brouillon Facebook conservait ainsi des images parasites d'autres publications (ex. `pub-10/vertical-miniature.jpg` pour 14 A ou `pub-02/vertical-miniature.jpg` pour 15 A).
- **Correction :** Suppression complète de `estVisuelPresti`. Dans `examinerMediasBrouillon`, le média d'un brouillon existant n'est accepté que si son empreinte SHA-256 correspond exactement à celle du visuel attendu par le maître pour ce numéro. Dans le cas contraire, une nouvelle publication est créée avec le bon visuel et l'ancien brouillon reste intact en statut `draft` (remplacé).
- **Tests prouvant la correction :**
  - Section 4 : `14 A et 15 A sont créées avec le visuel exact déclaré par le maître` (vérification de l'empreinte SHA-256 de l'objet créé sur Supabase Storage).
  - Section 3 : `17/09 au soir : pub-14 A Facebook est recréée avec le visuel exact du maître, 12 B jamais recréée`.
  - Section 4 : `le code documente 0, 1 et 3 et ne conserve plus estVisuelPresti`.

### Défaut 2 (Défaut 4 dans la tâche) : Journal écrit avant confirmation Publora
- **Problème :** L'heure programmée était inscrite dans le journal avant la relecture de confirmation Publora (`get-post`). Si la relecture retournait `pending` ou échouait, le script s'arrêtait ultérieurement sur cette publication en la considérant déjà programmée, bloquant la chaîne de publication.
- **Correction :** L'heure de programmation n'est inscrite au journal Markdown que si la relecture confirme le statut `scheduled`. Si le statut est `pending`, le journal est annoté `à reconfirmer`, le traitement continue sans bloquer les parutions suivantes, et la confirmation est reprise le soir suivant.
- **Tests prouvant la correction :**
  - Section 4 : `une relecture pending marque à reconfirmer et ne bloque pas les publications suivantes` (présence de `À RECONFIRMER` et poursuite sur 14 B et 15 A).
  - Section 4 : `le soir suivant scheduled confirme le journal sans nouvelle publication` (relecture du lendemain validant l'heure sans incrémenter les créations).

### Défaut 3 : Créneau manqué silencieux
- **Problème :** En cas d'interruption de l'automatisation pendant plusieurs soirs, un créneau de publication dépassé n'était qu'un simple avertissement console sans code de sortie spécifique ni préfixe clair.
- **Correction :** Détection explicite des créneaux passés avec émission d'un message d'alerte débutant par `ALERTE BENJ : créneau passé : ...` et code de sortie `3` dédié (différencié du code `0` pour succès et du code `1` pour erreur fatale). Le code 3 n'est pas renvoyé immédiatement : `alerterBenj` imprime la ligne et lève un drapeau, les autres publications continuent d'être traitées, et `if (alerteBenj) process.exitCode = 3` fixe le code en fin de lancement. *(Précision ajoutée le 17/09 par 023-05.)* Les codes de sortie sont documentés dans l'en-tête du script.
- **Tests prouvant la correction :**
  - Section 3 : `créneau passé signalé bruyamment avec code 3, et jamais plus de 3 actions sur un compte vide`.
  - Section 4 : `trois soirs manqués : ALERTE BENJ et code 3 distinct`.
  - Section 4 : `le code documente 0, 1 et 3 et ne conserve plus estVisuelPresti`.

### Défaut 4 (Défaut 5 dans la tâche) : Fausse alerte créneau passé après une réponse réseau perdue
- **Problème :** Si un appel de création réussit côté Publora mais que la réponse réseau est perdue avant d'avoir pu écrire dans le journal, le soir suivant le script voyait le créneau comme non consigné au journal et déclenchait une fausse alerte de créneau passé.
- **Correction :** La recherche d'une publication déjà existante sur Publora par son texte (`dejaHorsJournal`) est exécutée avant la vérification du créneau passé. La publication orpheline est ainsi retrouvée et rattachée au journal Markdown sans lever d'alerte erronée.
- **Tests prouvant la correction :**
  - Section 4 : `réponse perdue après création : la parution est rattachée au journal avant le contrôle du créneau passé` (message `RETROUVÉE · pub-14 A`, aucune alerte Benj, journal complété).

### Défaut 5 : Cas de la publication n° 16 et maintien du support de `PROGRAMMATION BLOQUÉE`
- **Problème & Contexte :** Dans le plan maître initial, la publication n° 16 portait un bandeau `PROGRAMMATION BLOQUÉE` à cause d'une photo sous licence (`cuisine-bois.webp`). Benj a décidé de la débloquer en remplaçant le visuel par une carte Presti (`publications/serie-2/pub-16-instagram.jpg`). Les tests devaient refléter cette nouvelle situation tout en garantissant que :
  1. Le marqueur `PROGRAMMATION BLOQUÉE` continue d'être supporté si présent.
  2. La photo sous licence ne part jamais (les brouillons initiaux restent en `draft`).
  3. Deux nouvelles parutions sont créées pour 16 A et 16 B avec la carte Presti.
- **Correction :**
  - `publier-serie.mjs` garde le blocage tel qu'il est écrit dans le code : `raisonBlocage(bloc)` cherche dans le bloc de la publication la ligne qui contient `PROGRAMMATION BLOQU[ÉE]E` et en rend la raison (texte en gras s'il y en a) ; `construirePlan` la range dans `entree.bloque` ; en `--programmer`, `decider` écrit `bloquée : pub-NN X canal · raison` et passe à la suite (`if (entree.bloque) { signaler(false, …); continue }`). *(Corrigé le 17/09 par 023-05 : la version précédente de ce rapport citait `p.bloquee = bloquee || /^> ⛔ \*\*PROGRAMMATION BLOQUÉE/m.test(bloc)`, un code qui n'a jamais existé dans le script.)*
  - Dans `publier-serie-qa.mjs`, adaptation des scénarios `soir-16-09` (16 A et 16 B hors horizon 7 jours au 16/09), `seize-debloquee` (programmation de deux nouvelles parutions avec la carte au 23/09), et simulation `du-16-au-26` (invariants de non-publication des brouillons photos et publication effective avec la carte).
  - Ajout du test dédié `seize-bloquee` injectant artificiellement le bloc `PROGRAMMATION BLOQUÉE` via `maitreDeTest` pour prouver la non-régression du blocage.
- **Tests prouvant la correction :**
  - Section 3 : `n° 16 débloquée : la photo sous licence ne part pas, même sur Facebook (deux nouvelles parutions avec la carte)`.
  - Section 3 : `marqueur PROGRAMMATION BLOQUÉE : publication 16 reste bloquée si le maître porte le marqueur`.
  - Section 4 : `du 16 au 26/09 : maximum 3 programmées, aucun doublon, n° 16 programmée avec la carte`.

---

## 3. Synthèse de la vérification

L'ensemble des 62 tests automatisés de `scripts/publier-serie-qa.mjs` passe avec succès sur la simulation persistant faux Publora / faux Supabase. Aucune communication réseau réelle n'a été émise. Le périmètre strict de la tâche a été respecté.

---

## 4. Contre-vérification et correctif 023-05 (nuit du 16 au 17/09)

Deux contrôleurs indépendants n'ont pas confirmé ce rapport. Ce qui était faux ou manquant, et ce qui a été corrigé dans `scripts/publier-serie.mjs` et `scripts/publier-serie-qa.mjs` (copie d'avant : `.orchestre/travail/023-05/avant/`) :

- **Code cité qui n'existait pas** : la ligne `p.bloquee = …` du défaut 5 (corrigée plus haut : c'est `raisonBlocage` → `entree.bloque`) ; le « renvoi immédiat » du code 3 (précisé plus haut).
- **Bloquant** : `lireEnvironnement()` ne lisait plus `.env.local` (retiré par Codex) ; la commande de l'automatisation sortait en code 1. Rétabli : environnement du processus d'abord, sinon `.env.local` à la racine du dépôt, sans jamais imprimer de valeur.
- **Grave** : le défaut 1 n'était corrigé que pour les brouillons. Une parution déjà PROGRAMMÉE n'était jamais comparée au maître : 12 A Facebook est restée programmée avec l'image de pub-04, et 11 A est partie avec celle de pub-01. Désormais le visuel de toute parution programmée, publiée ou orpheline est comparé (empreinte du média téléchargé) ; à plus de 3 h, remise en brouillon relue puis nouvelle parution à la même heure ; publiée au mauvais visuel : alerte une seule fois.
- `failed` et `partially_published` : « ALERTE BENJ : » et code 3 au lieu d'un ATTENTION en code 0.
- Tests : le test « ne conserve plus estVisuelPresti » jugeait un nom de fonction ; il est retiré au profit de tests de comportement (bac contenant les images de pub-01, 02, 04, 10). Mutants survivants M2e, M2f, X6, M3d désormais tués ; tests ajoutés pour le remplacement de visuel, `.env.local`, le verrou entre deux lancements. Les noms de tests cités dans les sections 2 et 3 de ce rapport datent de 023-04 et ont pu changer : la liste à jour est la sortie de `node scripts/publier-serie-qa.mjs`.

## 5. Reprise 1 de 023-05 (nuit du 16 au 17/09)

Les deux contrôleurs indépendants de 023-05 n'ont pas confirmé. Copie d'avant la reprise : `.orchestre/travail/023-05/avant-reprise-1/`.

**Trous de la suite (contrôleur 1, banc `023-05/contre-1/banc.mjs`)** : le script faisait juste, mais aucun test ne le vérifiait. Tests ajoutés (section « 4 ter » de `publier-serie-qa.mjs`) :
- B2b : update-post répond 200 sans rien changer, l'ancienne 12 A est relue encore programmée. Attendu et vérifié : aucune création, « ALERTE BENJ : visuel faux … la remise en brouillon a échoué », code 3.
- B2e : la nouvelle parution d'un remplacement est relue « pending ». Sa ligne dit « à reconfirmer », sans heure. Le passage suivant la confirme, et il ne reste qu'une ligne pour elle.
- C1c : une orpheline en « partially_published » donne une ALERTE BENJ en code 3.
- C1e : 12 A « failed » sur deux passages réels donne le code 3 et l'alerte les deux fois.

**Défauts du script (contrôleur 2, simulation `023-05-contre/sim/`)**, corrigés dans `publier-serie.mjs` :
- Parution journalisée supprimée dans Publora (HTTP 404 et absente de list-posts) : avant, un simple ATTENTION en code 0 chaque soir. Désormais une « ALERTE BENJ : parution introuvable » une seule fois, mémorisée au journal (« parution introuvable signalée : `id` »). Rien n'est recréé sans décision de Benj.
- Toute autre lecture en échec (5xx, 403, ou 404 d'une parution encore listée) : « ALERTE BENJ : lecture impossible » à chaque passage.
- Parution encore scheduled, pending ou processing plus de 15 min après son heure (journalisée ou orpheline) : avant, « déjà programmée » en code 0. Désormais « ALERTE BENJ : parution pas partie » à chaque passage, sans rien modifier.
- Créneau passé : l'alerte revenait chaque soir sans fin. Elle est désormais donnée une seule fois, avec la marque « créneau passé signalé : `pub-NN V canal heure` ». Les passages suivants ne donnent plus qu'un ATTENTION.
- Les marques « signalé une seule fois » sont écrites en dernier. Si le lancement s'arrête en code 1 avant, elles ne sont pas écrites et l'alerte revient au passage suivant. En `--essai`, aucune marque n'est écrite.
- Test « réponse perdue » : la 14 A créée malgré la réponse perdue passe « published » à son heure, comme en vrai. Sans ce changement, elle serait à juste titre signalée comme « pas partie ».

**Preuves** (`.orchestre/travail/023-05/reprise-1/`) :
- Suite : 103/103. La même suite contre le script d'avant la reprise donne 95/103 : les 8 échecs sont les défauts de la simulation.
- Banc `023-04-contre/mutants.mjs` : 47 mutants tués sur 47, dont 18 ajoutés ou ré-ancrés par `ajouter-mutations.mjs`.
- Banc du contrôleur 1, rejoué sans modification : 40 tués sur 42. B2b, B2e, C1c et C1e sont désormais tués. Restent les 2 survivants classés équivalents avant lancement (A8, V8).
- Publora réel : essai en code 0, puis vraie commande en code 0, « Rien à programmer. », journal inchangé. La vérification en lecture est conforme (12 A `6aab08d3…` programmée avec la carte 12, 3 programmées, aucun doublon).

**Remarque restante** : 7 tests de la section 1 lisent le code source au lieu de juger un comportement. Six d'entre eux sont doublés par un test de comportement : les options, le DELETE refusé par le faux Publora, les clés réellement envoyées, le journal, la n° 13 absente du plan et les codes 1 et 3. Le septième, la marge de stockage du bucket promo, n'a toujours pas de test de comportement : aucun cas ne simule un stockage presque plein.
