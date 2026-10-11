// Doublures des scripts de REPLI du poste (exporter.mjs, deposer.mjs, deposer-echantillon.mjs : usine-pubs-qa). Ils exigent la clé de service, que l'usine
// n'a jamais : le tourneur ne doit pas les lancer. S'il le fait, le juge le voit au journal ; la doublure échoue comme le vrai script échouerait sans clé.
import { lireConfig, noter } from './commun.mjs'

const [, , cfgChemin, nom, ...argv] = process.argv
noter(lireConfig(cfgChemin), 'repli', { nom, argv })
console.error(`✗ ${nom} : configuration Supabase absente`)
process.exitCode = 1
