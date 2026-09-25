// Faux script : il ajoute au rapport honnête une mutation que le juge n'attrape pas (un commentaire), avec un extrait
// recopié d'une autre mutation. Le méta-juge, qui la refait lui-même, doit échouer à MP-3.
import { lancer, ecrireRapport, MUTATIONS, JUGE, COMMANDE } from './mutations-commun.mjs'
const entrees = lancer(MUTATIONS)
entrees.push({
  juge: JUGE, commande: COMMANDE, fichier: 'lib/module.mjs',
  avant: "/** le signe d'un nombre, 1 pour zéro */", apres: "/** le signe d'un nombre */",
  critere: 'XQ-2', extrait: entrees.find((e) => e.critere === 'XQ-2').extrait, duree_s: 0.1,
})
ecrireRapport(entrees)
