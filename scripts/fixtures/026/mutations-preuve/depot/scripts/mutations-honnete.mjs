// Le script de mutations honnête : chaque mutation est réellement faite et attrapée. Le méta-juge doit sortir en code 0.
import { lancer, ecrireRapport, MUTATIONS } from './mutations-commun.mjs'
ecrireRapport(lancer(MUTATIONS))
