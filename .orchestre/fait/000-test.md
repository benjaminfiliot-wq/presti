---
id: 000-test
type: test
objectif: Prouver l'aller-retour du système — créer un fichier témoin que le vérificateur contrôle
perimetre: [.orchestre/preuves/000-test/**]
interdit: [app/**, lib/**, supabase/**, scripts/**]
verifier: node scripts/orchestre-autotest.mjs pass
budget: { fichiers: 1, minutes: 5 }
preuve: sortie de `verifier` collée dans .orchestre/preuves/000-test/verifier.log (écrite par orchestre.mjs)
---

# 000-test — la tâche témoin qui doit passer

Crée le fichier `.orchestre/preuves/000-test/bonjour.txt` contenant exactement le mot `bonjour` (une ligne, sans autre texte).

C'est tout. Cette tâche existe pour prouver que la chaîne prochaine → travail → fait/ → verifier → digest fonctionne de bout en bout.
