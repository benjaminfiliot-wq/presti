# 026-165 — durcissement du 28/09 (mission « juges à durcir »)

Suite de `.orchestre/preuves/026-165/contre-verif-28-09.md` (verdict : « le VERT n'est pas confirmé : un trou
bloquant dans le juge », défaut **D1**). `scripts/agents/mesure-a-sec.mjs` est à la fois la production ET son propre
juge (autotest) — un seul fichier, dans le périmètre de la fiche ; l'exécutant est `claude-code`.

## 1. Le défaut (D1, bloquant)

MS-4 comptait toute tentative de requête non-GET du navigateur, **bloquée ou non**, comme une faute. Le témoin nu
n'avait jamais de page qui tente un POST : MS-4 y était donc toujours vert, sans rien éprouver. Le fixture
`faute: 'post'` (page « eligible » avec un `fetch(...POST...)`) n'existait que dans `--preuve-echecs`, et même là, la
formule comptait la tentative bloquée exactement comme une tentative qui sort — la garde retirée (sabotage manuel de
la contre-vérification : `return bloquer('non_get')` supprimé) rougissait MS-4 **de toute façon**, garde ou pas : le
juge ne distinguait jamais « la garde a marché » de « la garde a été retirée ». D'où : « la faute est comptée
attrapée alors que le site d'essai a reçu le POST, et le verifier reste VERT » (aucun signal réel, sabotée ou non).

## 2. Correction

Trois changements dans `scripts/agents/mesure-a-sec.mjs`, jamais de production séparée à toucher (même fichier) :

1. **La page « eligible » tente TOUJOURS un POST au chargement** (`<script src="/assets/p.js">` avec
   `fetch('/contact', { method: 'POST', ... })`), plus seulement quand `faute === 'post'` : chaque passe (témoin
   nu compris) exerce désormais réellement la garde.
2. **`ctx.gardeLevee`** (nouveau, `faute === 'post'` en pose la valeur) : dans `ouvrirUne`, la ligne qui bloquait la
   requête (`return bloquer('non_get')`) est sautée UNIQUEMENT sous ce drapeau — jamais en dehors de l'autotest —
   reproduisant EXACTEMENT le bogue que la contre-vérification avait planté à la main (retrait de cette ligne),
   sans jamais modifier cette ligne pour de vrai.
3. **MS-4 redéfini** : `tentatives >= 1` (la page en tente toujours une — sinon le critère ne prouve rien) **ET**
   `sorties === 0` (aucune requête `envoyee: true` dans le journal du navigateur) **ET** `recusNonGet === 0` (rien
   reçu par le témoin) **ET** `!nonGetSortis` **ET** `docs >= 2`. Une tentative bloquée (`envoyee: false`,
   `route.abort()`) n'est plus une faute ; seule une tentative qui **sort** l'est.

L'entrée `fautes` de `--preuve-echecs` (`faute: 'post'`) vise désormais « la garde anti-POST retirée
(`ctx.gardeLevee`) », toujours sur MS-4.

## 3. Preuve — rejeu du verifier officiel, PASS

```
$ node scripts/orchestre.mjs verifier 026-165
✓ 026-165 : PASS · 124s
```

Sortie complète (celle qui fait foi, avec le nom d'hôte de l'usine) : `.orchestre/preuves/026-165/verifier.log`.
Extraits du témoin nu (désormais significatif) :

```
✓ MS-4 : navigateur : 1 tentative(s) non-GET (la page « eligible » en tente une à chaque passe), 0 sortie(s) du
  navigateur, 0 confirmée(s) par requestfinished ; reçues par le témoin : 0 ; appels interdits dans le source : 0 ;
  pages ouvertes : 2
```

Et la preuve des échecs (chaque faute plantée rougit son critère, 4/4) :

```
✓ attrapée : la garde anti-POST retirée (ctx.gardeLevee) : le POST tenté par le témoin sort jusqu’au site → MS-4
  rouge (… 1 sortie(s) du navigateur … reçues par le témoin : 1 …)
fautes attrapées : 4 sur 4
Verdict VERT : autotest et preuve des échecs sur presti-usine
```

## 4. Preuve par sabotage — la régression réelle (retrait littéral de la garde) rougit maintenant tout le verifier

Contrairement au dispositif d'origine (dont le seul point d'exercice, `--preuve-echecs`, ne testait rien de réel), la
correction rend le **témoin nu lui-même** sensible à une vraie régression du code de production, pas seulement au
mécanisme de test intégré.

Sabotage (reproduit EXACTEMENT celui de `contre-verif-28-09.md`, sur le fichier durci — pas via `ctx.gardeLevee`,
mais en retirant vraiment la ligne) :

```diff
- if (methode !== 'GET' && methode !== 'HEAD') { site.nonGet = (site.nonGet || 0) + 1; if (!ctx.gardeLevee) return bloquer('non_get') }
+ if (methode !== 'GET' && methode !== 'HEAD') { site.nonGet = (site.nonGet || 0) + 1 } // garde retirée sans condition
```

Rejeu complet (`node --import ./scripts/ts-loader.mjs scripts/agents/mesure-a-sec.mjs --autotest --preuve-echecs`,
relancé sur `presti-usine` comme le fait le script lui-même) :

```
✗ MS-4 (témoin nu) : navigateur : 1 tentative(s) non-GET, 1 sortie(s) du navigateur, 1 confirmée(s) par
  requestfinished ; reçues par le témoin : 1 ; …
…
Verdict ROUGE : autotest et preuve des échecs sur presti-usine
· usine executer : commande finie en 105 s sur l’usine, code 1 (seule)
```

**Avant le durcissement, cette régression exacte laissait le verifier VERT (constaté par la contre-vérification :
« Code 0, VERT »). Après, elle rougit MS-4 dans le témoin nu lui-même — pas seulement dans un sous-test dédié — et
fait échouer tout le verifier (code 1).**

Restauration : `cp` depuis la copie durcie sauvegardée avant le sabotage, sha256 identique avant/après.

```
sha256 (avant sabotage = après restauration) : afda9c3d656b5b99c1db25a993336995fd7b1de35b0aeb5eceb608d30ce45ea7
```

Traces : `.orchestre/travail/durcissement-026-165/` (`mesure-a-sec.mjs.durci` la copie de sauvegarde,
`sabotage-run.log` le rejeu saboté complet, `verifier-final.log` le rejeu final restauré).

## 5. Ce qui reste hors de ce durcissement (mineur, hors scope de cette mission)

D2 (verdict du rapport jamais jugé), D3 (`mesurer()` jamais exercée par le verifier), D4 (écart de lettre sur le
POST), D5 (MS-8 tenu par un détour), D6 (stock estimé gonflé), D7 (hors périmètre — migrations 0111/0106) : tous
classés MINEUR ou HORS PÉRIMÈTRE par la contre-vérification, non traités ici (mission limitée au bloquant D1).
