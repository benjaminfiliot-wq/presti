# 026-043 — contre-vérification indépendante (28/09, 2026-09-28T11:25Z–11:48Z)

Contre-vérification de la fiche `026-043` (verdict déclaré par l'exécutant : VERT, `node scripts/agents-llm-qa.mjs` →
PASS, LL-1 à LL-18 verts, confirmé par `node scripts/orchestre.mjs verifier 026-043` → PASS · 168s ·
`.orchestre/preuves/026-043/verifier.log`). Elle ne relit pas le journal de l'autre agent : elle relance elle-même le
verifier de la fiche et sabote elle-même la production qu'il juge (`lib/agents/moteurs.ts`, `lib/agents/llm.ts`),
jamais `scripts/agents-llm-qa.mjs` (le juge lui-même).

## Moyen

1. **D'abord Codex sur l'usine (économie de Claude)** :
   ```
   cd presti && node ../presti-ops/usine/revue-codex.mjs 026-043 --sabotages=4
   ```
   Résultat : **code 125 (NON JUGÉ)**. `usine executer` a construit le paquet (430 fichiers, 6,3 Mo, 53,1 s) puis l'a
   refusé avant tout envoi sur l'usine — 3 motifs bloquants sur les 3 nécessaires pour tout arrêter :
   - `.orchestre/fait/026-069.md:42` — « motif nom sensible : valeur (JSON, YAML, minuscules) » : en fait le jeton
     d'essai inventé `JETON-TEMOIN-7f3a`, cité dans le texte de la fiche 026-069 comme donnée de fixture.
   - `lib/agents/llm.ts:82` — même motif : la ligne `const RE_SECRET = /\bsk-[A-Za-z0-9_-]{6,}\b|.../g`, l'**expression
     régulière que 026-043 écrit elle-même pour masquer un secret dans les données envoyées à un moteur** (LL-9) —
     elle ressemble, à la lettre, à ce qu'elle est censée détecter.
   - `scripts/vigile-qa.mjs:640` — « motif URL avec identifiants » : le fixture de test `https://moi:mdp@exemple.invalid`
     (`moi`/`mdp`, domaine `.invalid`), une URL de test factice pour `VG-5`.

   Aucun des trois n'est un secret réel. Le journal (`.orchestre/travail/revue-codex/026-043/executer.log`) montre
   aussi une vingtaine de motifs similaires **écartés** ailleurs (dont `lib/agents/llm.ts:356` et `:434`, deux autres
   endroits de 026-043) comme « valeur qui n'a pas la forme d'une clé, ou référence de code » — la reconnaissance des
   sentinelles de test fonctionne donc par endroits, mais pas sur ces trois lignes précises, qui restent hors
   périmètre de 026-043 (026-069 et vigile-qa.mjs) sauf pour `llm.ts:82`, qui EST du périmètre mais n'est pas un
   défaut du module (c'est la ligne qui protège justement contre la fuite d'un secret). Le contrôle du paquet est un
   tout-ou-rien : aucune revue Codex n'a pu partir, `verdict.json` n'existe pas. Conformément à la consigne (125 =
   pas jugé), la contre-vérification est passée aux sabotages manuels — comme pour 026-142 la veille, sur le même
   type de blocage.

2. **Sabotages manuels réversibles de la PRODUCTION** (jamais de `scripts/agents-llm-qa.mjs`, le `verifier` exact de
   la fiche — un sabotage qui le toucherait ne compterait pas). Pour chacun : édition minimale ciblant un critère
   précis → `node scripts/agents-llm-qa.mjs` (le verifier complet, 18 critères) → lecture du rapport (le bon critère,
   et lui seul, doit rougir) → restauration à l'identique depuis la sauvegarde faite avant tout sabotage →
   `sha256sum` comparé à l'empreinte de départ → à la fin, un dernier passage complet doit revenir PASS.

   Empreinte de base (avant tout sabotage, 2026-09-28T11:25:45Z, témoin initial : PASS LL-1 à LL-18, code 0) :
   ```
   da6d4f344f44824378ca8ca60b8ceb35ceac0deb0a24d7f1aee9f195ed6b5a1d  lib/agents/moteurs.ts
   6c7ec6170db3fa0d0da91b139ce07ce37149abce1e975143ceb4b538855f4c48  lib/agents/llm.ts
   ```
   (sauvegardes hors dépôt, dans le scratchpad de session, avant tout sabotage.)

## Les sabotages

| # | Fichier | Sabotage | Critère visé | Rougi ? | Seul critère touché ? | sha256 restauré |
|---|---|---|---|---|---|---|
| 1 | `moteurs.ts` | `MOTEUR_DE` : retrait de l'enveloppe `gelerProfond(...)` (table non gelée) | LL-1 | ✗ « MOTEUR_DE n'est pas gelé (Object.isFrozen) » + 4 sous-entrées non gelées | oui pour LL-1 ; **mais un FAIL LL-15 isolé et non reproductible est apparu au même passage** (« studio : lancements Codex = 2 (attendu 1) ») — voir note plus bas | `da6d4f…6b5a1d` = base |
| 2 | `moteurs.ts` | `veille_pubs` (personnelles:true) : `moteur: 'codex'` → `moteur: 'freellmapi'` | LL-4 | ✗ « veille_pubs a personnelles:true mais moteur:'freellmapi' » + « entrées sur freellmapi : veille_pubs, douleurs » | oui (17 autres verts) | `da6d4f…6b5a1d` = base |
| 3a | `moteurs.ts` | `CATALOGUE.codex.d1` : `'oui'` → `'non'` | LL-13 | ✗ mais **sabotage rejeté** : il fait aussi rougir LL-4, LL-5, LL-6, LL-7, LL-8, LL-9, LL-12, LL-14 (`codex` devient inadmissible pour tout agent D1 dans `creerLecteur`) — trop large pour « le bon critère, lui seul » ; restauré sans compter dans les 4, refait proprement en 3b | — | `da6d4f…6b5a1d` = base (restauré avant de continuer) |
| 3b | `moteurs.ts` | Ajout d'une 22ᵉ entrée bidon `'sabotage_temoin_026_043'` dans `CATALOGUE` (liste fermée à 21 ids) | LL-13 | ✗ « CATALOGUE : ids en trop sabotage_temoin_026_043 » | oui (17 autres verts) | `da6d4f…6b5a1d` = base |
| 4 | `llm.ts` | `enregistrerCoutFn(agent, 0, resultat.detail)` → `enregistrerCoutFn(agent, 0.01, resultat.detail)` (montant du coût) | LL-8 | ✗ « montant inscrit = 0.01 (attendu 0) » | oui (17 autres verts) | `6c7ec6…4c48` = base |

**4 sabotages retenus : #1 (LL-1), #2 (LL-4), #3b (LL-13), #4 (LL-8)**, plus la tentative #3a écartée et refaite —
5 sabotages appliqués au total, dépassant le minimum de 4 demandé.

### Note sur le FAIL LL-15 du sabotage #1

Au passage du sabotage #1, `FAIL LL-15 — studio : lancements Codex = 2 (attendu 1, le repli est Ollama)` est apparu
en plus de `FAIL LL-1`. LL-15 dépend d'une horloge avancée artificiellement (`avancerHorloge`) et d'une échéance de
quota à 5 s de vraie horloge système dans un test séparé (`creerLecteur('studio')`, sans rapport avec le gel de
`MOTEUR_DE` — geler ou non un objet ne change aucune valeur qu'il porte). Après restauration du fichier à l'identique
(témoin du sabotage #1), LL-15 est repassé PASS sans aucune autre intervention — et il est resté PASS sur tous les
passages suivants (sabotages #2, #3a, #3b, #4, témoin final), soit 5 passages verts sur 6. Conclusion : un flake
préexistant du juge, sensible à la charge/l'horloge réelle pendant l'exécution de `LL15`, **non causé par le
sabotage #1** ni par 026-043 — signalé ici comme point d'attention pour une fiche de suite sur la robustesse du
verifier, hors périmètre de 026-043.

## Témoin final (après restauration complète, 2026-09-28T11:48:38Z)

```
PASS LL-1 … PASS LL-18
agents-llm-qa : PASS
code=0
```

Empreintes finales (identiques à la base) :
```
da6d4f344f44824378ca8ca60b8ceb35ceac0deb0a24d7f1aee9f195ed6b5a1d  lib/agents/moteurs.ts
6c7ec6170db3fa0d0da91b139ce07ce37149abce1e975143ceb4b538855f4c48  lib/agents/llm.ts
```
Confirmé aussi par `diff -q` (fichiers restaurés contre les copies faites avant tout sabotage) : identiques.

`git status --short -- lib/agents/moteurs.ts lib/agents/llm.ts` avant et après toute la contre-vérification :
```
?? lib/agents/llm.ts
?? lib/agents/moteurs.ts
```
Inchangé (les deux fichiers restent non commités, aucune marque de modification). Aucun autre fichier du dépôt n'a
été touché par cette contre-vérification ; seul `.orchestre/travail/revue-codex/026-043/executer.log` (écrit par
`revue-codex.mjs` avant son refus de paquet) et ce fichier de preuve ont été ajoutés, tous deux dans le périmètre
autorisé (`.orchestre/preuves/026-043/`, `.orchestre/travail/`).

## Verdict de la contre-vérification

**VERT confirmé.** Le verifier de 026-043 (`scripts/agents-llm-qa.mjs`, LL-1 à LL-18) détecte correctement, un par
un et sans faux positif croisé, un sabotage ciblé sur chacun des 4 critères visés (LL-1, LL-4, LL-13, LL-8), et
revient PASS une fois la production restaurée à l'identique (empreintes sha256 et `diff` égales). La tentative 3a a
montré une chose utile en plus : l'invariant « une donnée personnelle ne va jamais à un moteur non-D1 » est en fait
protégé à deux niveaux redondants (`CATALOGUE.<id>.d1` **et** `MOTEUR_DE.<agent>.moteur`) — casser l'un des deux
verrous fait tomber une cascade de critères plutôt qu'un seul, ce qui est plus sûr, pas moins, même si ça ne répond
pas à la consigne « le bon critère, lui seul » pour ce sabotage précis (remplacé par 3b).

Codex sur l'usine n'a pas pu juger (125, paquet refusé — deux motifs hors périmètre de 026-043 et un motif dans son
périmètre mais qui n'est pas un défaut, `llm.ts:82`, le détecteur de secrets qui ressemble à un secret) ; la
contre-vérification manuelle, exigée par la consigne dans ce cas, prend le relais et est concluante.

Aucun fichier n'a été laissé modifié hors de `.orchestre/preuves/026-043/` et `.orchestre/travail/`. Rien n'a été
commité.
