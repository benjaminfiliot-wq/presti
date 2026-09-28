# Contre-vérification 026-069 — 28/09

Vérifie la fiche PASS de 026-069 (`verdicts.jsonl` : `PASS`, dernière ligne `2026-09-28T11:20:32Z`, `33s`, dossier `fait`). Rien touché hors `.orchestre/preuves/026-069/` et `.orchestre/travail/` ; aucun commit. Le dépôt tourne avec plusieurs sessions concurrentes (moteur actif, `git status` très chargé sur des fiches sans rapport) : chaque sabotage a été fait, vérifié puis restauré individuellement, jamais laissé en place pendant qu'une autre écriture aurait pu survenir.

## Moyen

**1. Revue Codex sur l'usine** — `cd presti && node ../presti-ops/usine/revue-codex.mjs 026-069 --sabotages=4` (journal complet : `.orchestre/travail/revue-codex/026-069/executer.log`).

→ **code 125, NON JUGÉ.** Raison exacte rendue par l'outil :

```
⚠ revue-codex 026-069 : NON JUGÉ (125) — l'usine n'a rien rendu de cette revue (executer : code 125)
  ✗ usine executer : contrôle du paquet, 3 problème(s) — rien n'est envoyé
    .orchestre/fait/026-069.md:42 : motif nom sensible : valeur (JSON, YAML, minuscules)
    lib/agents/llm.ts:82 : motif nom sensible : valeur (JSON, YAML, minuscules)
    scripts/vigile-qa.mjs:640 : motif URL avec identifiants (schéma://utilisateur:mot de passe@hôte)
```

Le contrôle du paquet (`usine executer`) a refusé d'envoyer quoi que ce soit sur l'usine : les 3 « problèmes » cités sont dans des fichiers **hors du périmètre de 026-069** (`lib/agents/llm.ts` et `scripts/vigile-qa.mjs` n'apparaissent ni dans `perimetre` ni dans les `fichiers` de la fiche ; `.orchestre/fait/026-069.md:42` cite `NOTICE_URL` d'essai en `github.io`, un faux positif du motif « nom sensible » sur une valeur d'essai, pas un secret). Aucun `verdict.json` n'a été produit : **aucune revue Codex n'a eu lieu**, conforme au protocole (jamais un faux vert quand le paquet est refusé).

Code 125 → bascule sur le repli imposé par la fiche : au moins 4 sabotages faits moi-même sur la PRODUCTION (jamais sur `scripts/juges-026-acquisition-preuve.mjs`, qui EST le verifier de la fiche).

**2. Quatre sabotages réversibles de la production**, chacun choisi pour rougir précisément l'un des trois critères que `verifier` (`node scripts/juges-026-acquisition-preuve.mjs --lot=2`) évalue réellement pour le lot 2 (JP-2 : sur la référence, premier critère en échec avec l'id attendu ; JP-3 : `--auto-controle` vert ; JP-5 : `echecs-attendus.md` porte un extrait réel ≥ 20 signes, retrouvé dans la sortie). Protocole identique ×4 : copie + sha256 avant modification → modification d'un seul point de code ou d'une seule valeur de fixture → `node scripts/juges-026-acquisition-preuve.mjs --lot=2` rejoué en entier (le vrai verifier de la fiche, pas une commande approchante) → constat du rouge exact → restauration depuis la copie → sha256 recontrôlé identique → `verifier` rejoué, revenu PASS, avant de passer au sabotage suivant (jamais deux sabotages actifs en même temps).

## Sabotages et critères rougis

| # | Fichier | Point sabotage | Critère visé | Sabotage actif (`verifier --lot=2`) | Après restauration | sha256 (avant = après) |
|---|---|---|---|---|---|---|
| 1 | `scripts/vigie-meta-qa.mjs` (l. 391) | `s.juger('VM-1', e1, …)` → `s.juger('VM-1X', e1, …)` (l'id du critère « module absent » ne correspond plus à celui attendu par le registre) | **JP-2** (et, en cascade, JP-5 : sans extrait valide côté JP-2, la ligne du tableau tombe dans la branche « aucun », détectée aussi par JP-5) | `❌ JP-2 vigie-meta-qa sur la référence : premier critère « ❌ VM-1X module absent : … », « ❌ VM-1 … » attendu` ; `❌ JP-5 vigie-meta-qa : l'extrait « (aucun : ❌ VM-1X module absent : …) » ne se retrouve pas dans la sortie` — `FAIL — JP-2, JP-5` | `PASS` (JP-2, JP-3, JP-5 verts) | `b1e2acad7415f97c312623e50223bef3a476b7faf325c85892c2fb235709153d` |
| 2 | `scripts/fixtures/026-acquisition/pieges/empreinte.txt` | contenu remplacé par 65 zéros (empreinte factice ne correspondant plus au SHA-256 réel de `pieges/corpus.json`) | **JP-3** (`conformite-qa --auto-controle`, AC-1) | `❌ JP-3 conformite-qa --auto-controle : code 1, ❌ AC-1 empreinte.txt (000…000) ne correspond pas au SHA-256 recalculé de corpus.json (407a1a10…)` — `FAIL — JP-3` (JP-2 et JP-5 restés verts) | `PASS` | `2559b62f32490ca2e2c82491e8270a3ab108b1fbf0ddb67d7adb5bd3b7ed52a0` |
| 3 | `scripts/redacteur-qa.mjs` (l. 440) | `e1.push(\`module absent : ${rel(f)}\`)` → `e1.push('absent')` (message du critère RD-1 réduit à 6 signes, sous le seuil de 20 exigé par JP-5, sans changer l'id ni casser le préfixe que JP-2 vérifie) | **JP-5** (isolé — la fiche prouve ici que le seuil de 20 signes de JP-5 est réellement vérifié, indépendamment de JP-2) | `❌ JP-5 redacteur-qa : extrait de 13 signes (20 au moins)` — `FAIL — JP-5` (JP-2 resté vert : « ❌ RD-1 absent » commence toujours par « ❌ RD-1 », donc conforme au format que JP-2 contrôle, seule sa longueur y échoue) | `PASS` | `03d5bdc32b7a014511a733c0db147f52a7f9797ffe2a631db15adf322eb2a97c` |
| 4 | `scripts/fixtures/026-acquisition/meta/reperes.json` (page A) | `domaine_attendu: "plomberie-temoin.invalid"` → `"plomberie-sabotee.invalid"` (le domaine que le juge doit retrouver ne correspond plus aux légendes réelles de la page A) | **JP-3** (`vigie-meta-qa --auto-controle`, AC-1 — mécanisme différent du sabotage 2 : donnée de fixture plutôt qu'empreinte) | `❌ JP-3 vigie-meta-qa --auto-controle : code 1, ❌ AC-1 artisan.A : domaine recalculé "plomberie-temoin.invalid", "plomberie-sabotee.invalid" attendu` — `FAIL — JP-3` (JP-2 et JP-5 restés verts) | `PASS` | `b8c755d80d4d7af06619fa61a1634583c9af8fed3077cf94d21c7009a8b21d03` |

Chaque sabotage a rougi **exactement** le(s) critère(s) visé(s), sans faux rouge ailleurs : les trois lignes de `verifier --lot=2` (JP-2, JP-3, JP-5) réagissent chacune à un défaut réel introduit dans la production livrée par 026-069, ce qui exclut un juge muet ou un faux vert permanent.

## Vérification finale (verifier officiel de la fiche, après les 4 restaurations)

`node scripts/juges-026-acquisition-preuve.mjs --lot=2` :

```
juges-026-acquisition-preuve --lot=2 — fiche 026-069, 3 juge(s) au registre du lot
✅ JP-2 référence 86ce0f3 (reference.txt) réutilisée, identique blob pour blob sous .orchestre/travail/026-acquisition/reference (2648 fichiers), ancêtre de HEAD ; vigie-meta-qa → code 1, « ❌ VM-1 module absent : … » ; conformite-qa → code 1, « ❌ CO-1 module absent : … » ; redacteur-qa → code 1, « ❌ RD-1 module absent : … »
✅ JP-3 vigie-meta-qa --auto-controle : code 0 (AC-1, AC-2, AC-3) ; conformite-qa --auto-controle : code 0 (AC-1, AC-1, AC-2) ; redacteur-qa --auto-controle : code 0 (AC-1, AC-2, AC-3)
✅ JP-5 3 ligne(s) écrites dans .orchestre/preuves/026-069/echecs-attendus.md (section du lot 2), chaque extrait de 20 signes au moins relu et retrouvé dans la sortie produite ; sorties complètes sous .orchestre/travail/026-acquisition/sorties-lot-2
juges-026-acquisition-preuve --lot=2 : PASS
```

Identique au verdict d'origine (`verifier.log` : PASS, JP-2/JP-3/JP-5 verts, mêmes messages « module absent » sur la référence). **Non-régression du lot 1** (déjà rejouée par l'exécutant d'origine, non refaite ici pour ne pas allonger inutilement le run — le lot 1 n'a pas été touché par mes 4 sabotages, tous confinés au lot 2).

## Restauration bit à bit (sha256 des 15 fichiers du périmètre, avant campagne de sabotage vs après les 4 restaurations)

Les 15 fichiers de production du périmètre (les 3 juges + les jeux d'essai `meta/`, `messages/`, `pieges/`) ont été rehashés en bloc après les 4 sabotages/restaurations : `diff` entre le relevé d'avant et le relevé d'après est vide, aucune des 15 lignes n'a changé — restauration confirmée pour les 4 fichiers touchés ET pour les 11 fichiers jamais touchés (aucun effet de bord). `scripts/juges-026-acquisition-preuve.mjs` (le verifier lui-même, jamais sabordé) n'a subi aucune modification (`git status` le confirme, aucune entrée).

## Verdict de la contre-vérification

**VERT, confirmé.** La revue Codex n'a pas pu juger (125, contrôle du paquet de l'usine refusé sur deux fichiers hors périmètre et un faux positif sur une valeur d'essai — sans rapport avec le contenu de 026-069) ; le repli par sabotage montre que les 3 critères réellement évalués par `verifier` (JP-2, JP-3, JP-5) sont tous chargés et discriminants : un module encore absent, un auto-contrôle cassé (par une empreinte ou une donnée de fixture fausse) ou un extrait de preuve trop court font chacun rougir la bonne ligne, jamais une autre. Restauration octet pour octet vérifiée par sha256 sur les 15 fichiers du périmètre, aux 4 étapes, avec un témoin PASS entre chaque sabotage.
