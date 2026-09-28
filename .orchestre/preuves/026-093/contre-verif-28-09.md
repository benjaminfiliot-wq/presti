# 026-093 — contre-vérification indépendante (28/09)

## Revue Codex sur l'usine : NON JUGÉ (125)

```
cd presti && node ../presti-ops/usine/revue-codex.mjs 026-093 --sabotages=4
⚠ revue-codex 026-093 : NON JUGÉ (125) — l'usine n'a rien rendu de cette revue (executer : code 125)
  ✗ usine executer : contrôle du paquet, 8 problème(s) — rien n'est envoyé
    .orchestre/fait/026-041.md:72 : motif sk- (clé Anthropic / OpenAI)
    scripts/agents-llm-qa.mjs:100 : motif sk- (clé Anthropic / OpenAI)
    scripts/agents-llm-qa.mjs:101 : motif sk- (clé Anthropic / OpenAI)
```

Le scanner de secrets de `usine.mjs` a refusé le paquet (bac = HEAD + tout le non-commité du poste, qui porte
en ce moment des motifs `sk-` dans des fichiers sans rapport avec 026-093 — `.orchestre/fait/026-041.md` et
`scripts/agents-llm-qa.mjs`). Rien n'a été envoyé à Codex ; aucun verdict Codex à lire. Ce n'est pas un défaut
de 026-093 : c'est l'état du poste (beaucoup de sessions concurrentes, cf. `.orchestre/preuves/026-093/avant.txt`)
qui bloque *toute* revue-codex tant que ces deux fichiers restent non commités avec ces motifs.

→ Bascule sur la consigne : au moins 4 sabotages réversibles faits moi-même, sur la PRODUCTION (pas le juge).

## Méthode

Témoin (le `verifier` exact de l'en-tête de la fiche) : `node --import ./scripts/ts-loader.mjs scripts/redacteur-v2-qa.mjs`.

Pour chaque sabotage : sauvegarde de `lib/siteRedacteur.ts` dans le scratchpad (sha256 + `git hash-object` notés),
un seul changement ciblé dans la production (`lib/siteRedacteur.ts`, jamais `scripts/redacteur-v2-qa.mjs` ni les
fixtures du juge), relance du témoin en entier (mode complet, les 10 critères RV + RV-PV), lecture du critère
qui rougit, restauration par copie depuis la sauvegarde, `sha256sum` comparé à l'avant. `scripts/commande-rediger.mjs`
n'a jamais été touché (sha256 et blob git identiques du début à la fin). Aucun fichier hors production n'a été
modifié ; seuls `.orchestre/preuves/026-093/` et `.orchestre/travail/` (écrits par le témoin lui-même) ont bougé.

- Avant tout sabotage : `lib/siteRedacteur.ts` sha256 `43d11a4c…f2f53e8`, blob git `f788c6df…29513`.
- `scripts/commande-rediger.mjs` (jamais touché) : sha256 `4ed2fd93…8fef2ee7`, blob git `907ad3ae…e038ad`, constant sur toute la session.
- Témoin AVANT sabotage : **PASS** (10/10 + RV-PV, 171 s).

## Sabotages

| # | Sabotage de la production (`lib/siteRedacteur.ts`) | Code témoin | Critère rougi | Restauré |
|---|---|---|---|---|
| S1 | ligne « Éditeur de la plateforme : Presti. » → ajout d'une marque non substituée `{entreprise}` dans les mentions légales | 1 | **RV-2** — `marque(s) restante(s) : {entreprise}` | oui (sha256 identique) |
| S2 | section « contact » de l'accueil : ajout de `commande.matiere.artisan?.citation` (la phrase signée de l'artisan) dans un bloc `p` | 1 | **RV-4** — la phrase signée retrouvée dans le script ET les 4 appels de la fonction (sans/fautif/propre/panne) | oui (sha256 identique) |
| S3 | début de `redigerContenuV2` : ajout d'une lecture `process.env.SABOTAGE_S3` (sonde inerte, aucun effet sur la sortie) | 1 | **RV-8** — « lit process.env dans son source » (contrôle statique) ET « exécuté, il lit process.env : SABOTAGE_S3 » (espion à l'exécution) | oui (sha256 identique) |
| S4 | en tête de fichier : `const _sabotageS4TypeError: number = 'ceci-n-est-pas-un-nombre'` (faute de type pure, jamais exécutée pour ce qu'elle vaut — le loader ne fait que retirer les annotations) | 1 | **RV-10** — `tsc --noEmit` : `lib/siteRedacteur.ts(21,7): error TS2322: Type 'string' is not assignable to type 'number'.` | oui (sha256 identique) |

**4/4 sabotages rougis sur le bon critère**, chacun un seul critère (aucune collatérale) : le juge exécute réellement
`redigerContenuV2` (dans un enfant à l'environnement vide, avec espions fs/`process.env`) et relit le texte produit —
ce n'est pas un test de présence.

Remarque sur S4 : le passage rouge de S4 a aussi affiché une seconde erreur `tsc`, sans rapport avec 026-093
(`app/p/[slug]/icon.tsx(13,11): error TS2339`), provenant visiblement d'une autre session concurrente sur le
même poste (le témoin AVANT sabotage et le témoin final, tous deux sans cette erreur, l'encadrent). Non imputable
à ce sabotage ni à 026-093 ; à surveiller si elle réapparaît dans un futur `verifier` de cette fiche.

## Restauration

- `lib/siteRedacteur.ts` après le 4ᵉ sabotage : sha256 `43d11a4c…f2f53e8` — **identique** à l'avant.
- `scripts/commande-rediger.mjs` : sha256 `4ed2fd93…8fef2ee7` — **identique**, jamais modifié.
- `git hash-object` des deux fichiers après restauration : `f788c6df…29513` et `907ad3ae…e038ad` — identiques aux blobs d'avant.
- Témoin final (`node --import ./scripts/ts-loader.mjs scripts/redacteur-v2-qa.mjs`) : **PASS**, 10/10 + RV-PV, 155 s
  (RV-1…RV-9 verts, RV-10 `tsc --noEmit vert sur presti en 155 s`, RV-PV 3 fichiers non vides).

## Conclusion

Aucun défaut établi sur 026-093 : le témoin est redevenu vert après restauration byte-for-byte des deux fichiers de
la production, et les 4 sabotages ont chacun rougi exactement le critère qu'ils visaient (RV-2, RV-4, RV-8, RV-10),
ce qui confirme que `redacteur-v2-qa.mjs` juge réellement le comportement de `redigerContenuV2` / `commande-rediger.mjs`
et pas seulement leur présence. La revue Codex sur l'usine n'a pas pu se prononcer (125, paquet refusé par le
scanner de secrets sur des fichiers étrangers à cette fiche) : ce n'est pas un verdict, seulement une case non
remplie — compensée ici par les 4 sabotages maison.

Verdict : **VERT confirmé**.
