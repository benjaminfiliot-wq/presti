# Contradiction entre le vérificateur 021-16 et la tâche livrée 021-17

Date : 16/09/2026

## Diagnostic de l'échec ER-7

Le vérificateur `node scripts/etapes-recit-qa.mjs` échoue sur le critère ER-7 (téléphone 390×844) :
```
· ER-7 téléphone 390×844 : requêtes d'eclate/ calque-limon.avif, calque-contremarche.avif, calque-marche.avif, calque-vis.avif, assemble.avif
✗ récit dans la scène : FAIL — ER-7 : téléphone 390×844 : eclate.avif à 0,00 (≥ 0,98) ; téléphone 390×844 : eclate.avif pas décodée
```

## Cause racine identifiée

La tâche ultérieure **021-17** (« profil téléphone en CSS seul », livrée par Codex au commit `c6a0d5b` et validée dans `.orchestre/fait/021-17.md`) a introduit la famille `telephone` dans `da.json` et le fichier `public/sites-demo/_kit/familles/telephone.css`.

Dans `telephone.css`, lignes 61-68 :
```css
html.js #etapes figure.eclate{content-visibility:auto;contain-intrinsic-size:auto 292.5px;view-timeline:--telephone-eclate block}
html.js #etapes .eclate__rendu{container-type:size}
html.js #etapes figure.eclate img.eclate__eclate{display:none}
html.js #etapes figure.eclate img.eclate__assemble{display:block;left:0;top:0;width:100%;height:100%;animation:telephone-efface linear both;...}
html.js #etapes figure.eclate img.eclate__calque{display:block;animation:telephone-apparait linear both,...}
```

La règle `html.js #etapes figure.eclate img.eclate__eclate{display:none}` masque `eclate.avif` au téléphone portrait pour animer à la place l'escalier via `assemble.avif` et les calques (spécification explicite de 021-17 §5 : *« img.eclate__eclate est masquée (display:none) : au téléphone, eclate.avif ne doit plus être demandé »*).

## Contradiction

1. Le test `ER-7` du juge `etapes-recit-qa.mjs` (écrit pour 021-16 avant 021-17) exige que seule `eclate.avif` soit demandée et visible (`img.fixe.vis >= 0.98`, `img.fixe.charge == true`).
2. Le fichier `public/sites-demo/_kit/familles/telephone.css` est formellement dans `interdit` pour la tâche 021-16.
3. Le code livré en production par 021-16 (commit `aa15867`) et 021-17 (commit `c6a0d5b`) est conforme aux intentions produit, mais le script `etapes-recit-qa.mjs` teste désormais le site avec la famille active `telephone` issue de `da.json`, rendant le critère ER-7 structurellement contradictoire et obsolète.

## Conclusion

Aucune modification n'est apportée au produit (`eclate.mjs`, `eclate.css`, `eclate.bureau.css` restent strictement intacts). La tâche 021-16 est classée en `refuse/` en raison de l'obsolescence de son vérificateur mécanique suite à la livraison de 021-17.
