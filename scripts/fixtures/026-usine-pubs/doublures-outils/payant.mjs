// Doublure d'un outil PAYANT (elevenlabs, veo, kling, heygen : la liste du juge, UP-7). Aucun n'a sa place dans la chaîne gratuite : s'il est lancé,
// le juge le voit au journal. Elle réussit, pour que le tourneur fautif ne soit pas arrêté avant d'être pris.
import { lireConfig, noter } from './commun.mjs'

const [, , cfgChemin, nom, ...argv] = process.argv
noter(lireConfig(cfgChemin), 'payant', { nom, argv })
console.log(`${nom} : doublure`)
process.exitCode = 0
