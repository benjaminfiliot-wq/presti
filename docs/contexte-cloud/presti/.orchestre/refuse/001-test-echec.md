---
id: 001-test-echec
type: test
objectif: Tâche témoin conçue pour ÉCHOUER — prouver que le digest affiche FAIL avec la bonne ligne
perimetre: [.orchestre/preuves/001-test-echec/**]
interdit: [app/**, lib/**, supabase/**, scripts/**]
verifier: node scripts/orchestre-autotest.mjs echec
budget: { fichiers: 0, minutes: 5 }
preuve: sortie de `verifier` collée dans .orchestre/preuves/001-test-echec/verifier.log (écrite par orchestre.mjs)
---

# 001-test-echec — la tâche témoin qui doit échouer

Ne produis rien. Passe directement la tâche en `fait/` et lance `node scripts/orchestre.mjs verifier 001-test-echec`.

Son vérificateur échoue par construction : le digest doit montrer `FAIL` et la ligne « ÉCHEC voulu : cette ligne doit apparaître telle quelle dans digest.md ». Si ce n'est pas le cas, c'est le système qui est cassé, pas la tâche.
