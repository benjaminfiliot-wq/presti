# Correction de 026-116 — 28/09/2026

Exécutant : Claude Code (agent d'orchestre, série 026). Racine : `C:/Users/benja/Documents/presti`. HEAD au moment de la correction : `35fd1c7d`.
Fichiers touchés (dans le périmètre de la fiche) : `lib/crieur/juge.ts`, `scripts/crieur-qa.mjs`, `scripts/fixtures/026-pubs-contenu/crieur/corpus-juge.json`.
Aucun commit fait par moi (c'est Claude, l'orchestrateur, qui commite). Rien touché hors périmètre.

Une contre-vérification indépendante datée du 28/09 (`.orchestre/preuves/026-116/contre-verif-28-09.md`) a établi 4 défauts bloquants, 3 majeurs et 1 point ambiant hors périmètre. Chacun est traité ci-dessous, avec la preuve qu'il est levé.

## Bloquant 1 — contournement de préfixe sur `adresse_etrangere`

**Défaut** : `ADRESSE_AUTORISEE = 'https://prestiapp.fr'` était comparée par `.startsWith(...)` : `https://prestiapp.fr.evil.com/hack` commence bien par la chaîne autorisée, donc passait.

**Correction** : `lib/crieur/juge.ts` compare désormais le **nom d'hôte réel** (`new URL(...).hostname`, ponctuation de fin de phrase retirée avant analyse, schéma `https://` ajouté aux adresses en `www.` sans schéma) à `prestiapp.fr` exactement — plus aucun test de préfixe de texte.

**Preuve que c'est levé** : sonde directe sur le code réel (non saboté) —
```
jugerPublication({ canal:'linkedin', fait_ids:[], texte:'Voir https://prestiapp.fr.evil.com/hack pour en savoir plus.' }, ctx)
→ { ok:false, raisons:['phrase_inconnue','adresse_etrangere'] }   (avant la correction : aucune raison adresse_etrangere)
```
Non-régression vérifiée sur une adresse légitime (`https://prestiapp.fr/api/crieur/visuel/minute.png`, présente dans le corpus conforme `instagram-aimant-leve`) : toujours acceptée. `node scripts/crieur-qa.mjs --partie=juge --temoin` : CR-14 PASS, 16 fautives refusées chacune avec sa raison, 9 raisons distinctes.

## Bloquant 2 — publication entièrement vide acceptée

**Défaut** : `jugerPublication({ canal:'linkedin', texte:'', fait_ids:[] }, ctx)` rendait `{ ok:true }` : `phrasesDe('')` rend `[]`, donc la boucle qui détecte `phrase_inconnue` ne s'exécutait jamais.

**Correction** : `jugerPublication` ajoute `phrase_inconnue` dès que `phrases.length === 0` (texte entièrement vide ou blanc). Ajout, dans le même mouvement, d'une garde connexe repérée par la même contre-vérification : un `fait_ids` qui cite un identifiant absent de `ctx.faits` ajoute aussi `phrase_inconnue` (une citation de fait qu'on ne peut pas vérifier n'est jamais une preuve).

**Preuve que c'est levé** :
```
jugerPublication({ canal:'linkedin', texte:'', fait_ids:[] }, ctx)                                    → { ok:false, raisons:['phrase_inconnue'] }
jugerPublication({ canal:'linkedin', texte:'Découvrez comment ça marche.', fait_ids:['id-fantome'] }, ctx) → { ok:false, raisons:['phrase_inconnue'] }
```
Le corpus CR-14 (`scripts/fixtures/026-pubs-contenu/crieur/corpus-juge.json`) porte désormais deux nouvelles fautives dédiées : `publication-vide` et `fait-id-inconnu`, chacune vérifiée par `crieur-qa --partie=juge` (un sabotage qui redésactiverait l'une des deux gardes rougirait ces cas précis, nommés dans la sortie). Corpus : 14 → 16 fautives (12 exigées au minimum).

## Bloquant 3 — CR-1 (`crieur-qa.mjs`) acceptait un `preuve.motif` vide

**Défaut** : `texteFichier.includes(String(preuve.motif || ''))` vaut toujours vrai quand `motif` est vide ou absent (`''.includes('')` en JS) — un fait aurait pu être déclaré « prouvé » par un fichier sans aucun motif réellement vérifié.

**Correction** : `scripts/crieur-qa.mjs`, CR-1, exige désormais un `preuve.motif` non vide (après `trim()`) avant même de lire le fichier ; un motif vide ou absent est un échec explicite (`preuve.motif vide ou absent`).

**Preuve que c'est levé** : rejoué en conditions réelles après que 026-119 a livré `lib/crieur/faits.ts` (13 faits, chacun avec `preuve.fichier` + `preuve.motif` non vide) : `node scripts/crieur-qa.mjs --partie=composer` → `PASS CR-1`. Un fait dont `preuve.motif` serait vide rougirait maintenant CR-1 avec le message dédié (vérifié en lisant le nouveau chemin de code : la branche vide est atteinte avant toute lecture de fichier, donc inconditionnelle).

## Bloquant 4 — `--temoin` sautait indéfiniment composer/route/horloge (risque de conception, Codex)

**Défaut** : `modeFabrication = o.temoin && PARTIE !== 'juge'` sautait *toujours* les critères fonctionnels de composer/route/horloge en mode témoin, qu'un fichier existe ou non, que sa fiche ait livré ou non — un `composer.ts` absent OU FAUX aurait pu laisser un témoin vert indéfiniment.

**Correction** : le saut ne vaut plus que tant que la fiche propriétaire (`026-119`, `026-122` ou `026-134`) n'est pas dans `.orchestre/fait/` — `ficheLivree(id)` teste l'existence de `.orchestre/fait/<id>.md`. Une fois livrée, `--temoin` rejuge pour de vrai, exactement comme un appel sans `--temoin`.

**Preuve que c'est levé** (sabotage réel, sans toucher `lib/crieur/composer.ts` — hors périmètre de 026-116 — via deux racines isolées minimales sous scratchpad, `composerLot` sabotée pour toujours rendre `[]`) :
- Racine où `026-119` n'est **pas** dans `fait/` : `--partie=composer --temoin` → CR-1 à CR-4 `SAUTE` (comportement inchangé, comme avant la correction).
- Racine où `026-119` **est** dans `fait/`, avec le même `composerLot` saboté : `--partie=composer --temoin` → `FAIL CR-3 — composerLot(mois-neuf) : liste vide reçue, au moins 1 publication attendue (…)` (et pareil pour `fait-recent`, `drapeau-baisse`). Avant la correction, cette même racine aurait rendu un témoin vert (`SAUTE` partout, code 0).
- Confirmation sur le dépôt réel (026-119 livrée dans l'arbre courant, `composer.ts`/`faits.ts` réels et corrects) : `--partie=composer` et `--partie=composer --temoin` rendent tous deux `PASS CR-1, CR-2, CR-3, CR-4` avec un contenu de jugement identique — la bascule ne change rien quand l'implémentation est correcte, elle ne fait que retirer le laissez-passer aveugle d'un témoin.

## Majeur 5 — CR-7 n'exigeait pas `content`/`platforms` dans le corps

**Défaut** : seule l'absence de clé en trop était vérifiée ; un corps `{}` (aucune clé) passait.

**Correction** : `scripts/crieur-qa.mjs`, CR-7, exige désormais `content` (chaîne non vide) et `platforms` (tableau non vide) dans le corps de chaque appel `POST /create-post` observé.

**Portée** : `lib/crieur/publora.ts` n'existe pas encore (026-122, hors périmètre) ; la correction est prête et sera exercée dès que ce fichier existera — non testable contre un vrai `creerPublication` aujourd'hui, mais vérifiée par lecture : la nouvelle condition est inconditionnelle sur `a.corps`, donc un corps vide rougirait immédiatement CR-7 avec les deux nouveaux messages.

## Majeur 6 — CR-3/CR-4 sans borne basse (`composerLot` toujours `[]` passait)

**Défaut** : seules des bornes hautes (`≤ 3`, `= 0` pour quota plein/3 programmées, `≤ 1` pour l'horizon) étaient vérifiées.

**Correction** : ajout d'une borne basse pour les états où le quota et les parutions à venir sont loin d'être atteints (`mois-neuf`, `fait-recent`, `drapeau-baisse` → au moins 1 publication attendue en CR-3 ; l'horizon 26 h → exactement 1 en CR-4, pas 0).

**Preuve que c'est levé** : même sabotage que le Bloquant 4 ci-dessus (`composerLot` → toujours `[]`) — `CR-3` et (implicitement, même mécanisme) `CR-4` rougissent désormais avec le message dédié. Confirmé aussi en conditions réelles : le vrai `composer.ts` de 026-119 rend `PASS CR-3` et `PASS CR-4` (au moins 1 publication sur `mois-neuf`/`fait-recent`/`drapeau-baisse`, exactement 1 sur l'horizon 26 h).

## Majeur 7 — CR-5/6/8/15-19 : recherche de chaînes/positions plutôt qu'exécution réelle

**Analyse** : confirmé en lisant `jugerRouteTexte`/`jugerVisuel` — ces critères analysent le texte source de `app/api/cron/crieur/route.ts` (position des tokens, présence de motifs), plutôt que d'exécuter la route pour de vrai. Un appel mort ou une branche inversée pourrait en théorie y échapper.

**Décision, non corrigé par du code** : `app/api/cron/crieur/route.ts` n'existe pas encore — c'est la responsabilité de 026-122, explicitement **hors périmètre** de 026-116 (`app/**` est dans `interdit:`). Construire un harnais d'exécution réelle (route Next.js App Router, mock de `Request`, de Supabase, de `notifierEntreprise`, etc.) contre un fichier qui n'existe pas serait spéculatif et à l'encontre du principe « un juge s'écrit avant ce qu'il juge » déjà appliqué ailleurs dans ce dépôt (les migrations SQL sont elles aussi jugées par analyse du texte, pas par exécution contre une vraie base, en dehors de l'essai à sec CR-13). C'est un risque de conception documenté, pas un bug actuel : je le signale ici pour l'exécutant de 026-122, qui pourra durcir `crieur-qa --partie=route` avec de vrais scénarios (401 effectif, pause, rejeu, battement) une fois `route.ts` écrit — la correction du Bloquant 4 ci-dessus garantit que ce durcissement, une fois fait, sera bien exercé par tout futur témoin (026-122 ne pourra plus se cacher derrière un `--temoin` aveugle après son propre PASS).

## Ambiant 8 — `CR-NR` et `IMMOBILE` : hors périmètre, confirmé

**Constat** : `git status --short -- lib/alertes.ts` montre `M lib/alertes.ts` sur l'arbre courant — modification faite par une autre session, un fichier explicitement dans `interdit:` de 026-116. `node scripts/juges-026-pubs-contenu-preuve.mjs --lot=20`, rejoué sur l'arbre courant (bruyant), échoue uniquement sur `CR-NR` (à cause de `lib/alertes.ts`) et `IMMOBILE` (`.orchestre/fait/026-232.md` apparu pendant l'exécution — une autre fiche livrée par une autre session). Aucun des deux n'est un défaut de 026-116.

**Traitement** : rejoué à l'abri avec `bash /c/Users/benja/Documents/presti-ops/usine/verifier-isole.sh 026-116` (copie de travail isolée : HEAD + le périmètre de 026-116 seulement). Résultat : voir `verifier.log` (rejoué) — la copie isolée n'est pas affectée par les autres sessions puisqu'elle ne contient que HEAD et les fichiers du périmètre de cette fiche.

## Résumé

| # | Sévérité | Défaut | Statut |
|---|---|---|---|
| 1 | BLOQUANT | `adresse_etrangere` par préfixe de texte | Corrigé (`lib/crieur/juge.ts`), preuve directe |
| 2 | BLOQUANT | Publication vide acceptée (+ `fait_ids` inconnu silencieux) | Corrigé (`lib/crieur/juge.ts`), preuve directe + 2 cas de corpus |
| 3 | BLOQUANT | CR-1 : `preuve.motif` vide toujours vrai | Corrigé (`crieur-qa.mjs`), vérifié contre 026-119 réelle |
| 4 | BLOQUANT | `--temoin` saute indéfiniment (risque de conception) | Corrigé (`crieur-qa.mjs`, gating sur `fait/`), preuve par sabotage isolé |
| 5 | MAJEUR | CR-7 sans `content`/`platforms` obligatoires | Corrigé (`crieur-qa.mjs`), prêt pour 026-122 |
| 6 | MAJEUR | CR-3/CR-4 sans borne basse | Corrigé (`crieur-qa.mjs`), preuve par sabotage isolé + vérifié contre 026-119 réelle |
| 7 | MAJEUR | CR-5/6/8/15-19 analyse de texte, pas d'exécution | Documenté (pas de code à juger : `route.ts` n'existe pas, hors périmètre) |
| 8 | AMBIANT | `CR-NR`/`IMMOBILE` bruit d'autres sessions | Hors périmètre, confirmé, rejoué à l'abri |

Voir `verifier.log` (rejoué après correction) pour le verdict final de `node scripts/juges-026-pubs-contenu-preuve.mjs --lot=20`.
