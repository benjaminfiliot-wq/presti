# 026-152 — témoin de retrait-site-qa rouge sur l'arbre réel : correction d'une ligne de scripts/parcours-commande-qa.mjs (04/10)

## Le constat

`retrait-site-qa` RT-6 (non-régression) lance `node scripts/parcours-commande-qa.mjs --temoin`. Sur l'arbre RÉEL, sur le PC comme sur l'usine, et sans aucune mutation :

```
FAIL PC-1 … PC-12 — interrompu : preparerTemoin : proxy.ts introuvable sous …/.orchestre/travail/025-01/reference
retrait-site-qa : FAIL — RT-6
```

C'est la question de Codex du 04/10 (« le témoin RT-6 échoue sur la copie intacte »), et la raison pour laquelle le script de 026-152 ne pouvait pas sortir en code 0 : un juge rouge sur l'arbre intact n'est pas mutable (une faute ne se voit que si le critère était vert avant).

## La cause (aucune ligne du produit n'est en cause)

- `scripts/parcours-commande-qa.mjs`, mode `--temoin` sans `--racine`, construit son arbre témoin à partir de la RÉFÉRENCE 1620723 (`extraireReference()`), qui porte `middleware.ts`.
- 026-004 (28/09) a écrit `FICHIER_PROXY = existsSync(R/proxy.ts) ? 'proxy.ts' : 'middleware.ts'` : le nom est choisi sur **R**, pas sur l'arbre copié.
- 026-008 (29/09 23:35) a renommé `middleware.ts` en `proxy.ts` : depuis, R porte `proxy.ts`, la référence `middleware.ts`, et `preparerTemoin` cherche `proxy.ts` sous la référence.

## La correction (hors périmètre de la fiche, un seul endroit)

`construireTemoin` choisit le fichier d'entrée sur l'arbre qu'elle copie (`base`) :

```js
const fichierProxy = fs.existsSync(path.join(base, 'proxy.ts')) ? 'proxy.ts' : 'middleware.ts'
const dest = preparerTemoin(JUGE, { base, copier: COPIE_TEMOIN.map((f) => (f === FICHIER_PROXY ? fichierProxy : f)), superposer: null })
```

Rien d'assoupli : aucun critère, aucun jeu d'essai, aucun détecteur ne change ; seul le nom du fichier copié dans l'arbre témoin suit l'arbre d'où on le copie. Sur une racine donnée (`--racine=<d>`), `base` est cette racine : même comportement qu'avant.

## La preuve

`node --import ./scripts/ts-loader.mjs scripts/parcours-commande-qa.mjs --temoin` sur le PC après la correction : `parcours-commande-qa : PASS`, PC-1 à PC-12 verts (PC-5 : tsc vert en 80 s). `retrait-site-qa` complet sur l'usine : RT-6 vert, témoin en code 0 (197 s).

À consigner par le chef dans `.orchestre/decisions.md` avec les neuf autres corrections de juges du 04/10 (ligne « 026-152, neuf juges/fixtures… ») : cette correction fait dix ; elle n'a pas été écrite là par l'exécutant (`decisions.md` est dans `interdit`).
