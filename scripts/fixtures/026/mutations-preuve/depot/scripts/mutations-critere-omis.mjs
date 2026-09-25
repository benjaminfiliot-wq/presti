// Faux script : il ne mute que XQ-1 et omet XQ-2, pourtant imposé par la liste de la fiche. Le méta-juge doit échouer à MP-2.
import { lancer, ecrireRapport, MUTATIONS } from './mutations-commun.mjs'
ecrireRapport(lancer(MUTATIONS.filter((m) => m.critere === 'XQ-1')))
