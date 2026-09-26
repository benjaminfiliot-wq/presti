
## Le code et l'arbre de travail

(Section témoin de la fiche 026-002 : l'autotest de `instantane-quotidien-qa` l'ajoute à une copie de ce document. La vraie section est écrite par 026-005.)

Chaque jour, `scripts/instantane-quotidien.mjs --pousser` fige l'arbre de travail dans un commit hors de `main` et le pousse sur une branche `instantane-AAAA-MM-JJ` du dépôt privé de sauvegarde. Récupérer un fichier :

```
git fetch https://github.com/benjaminfiliot-wq/presti-sauvegarde.git instantane-2026-09-26
git show FETCH_HEAD:app/page.tsx
```

Le journal est `.orchestre/travail/sauvegardes.jsonl`.
