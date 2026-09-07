// Pose sur Vercel une variable déjà présente dans `.env.local`, SANS jamais l'afficher ni la faire passer par
// une ligne de commande (donc jamais dans un journal, un historique de shell ou une conversation).
//
//   node scripts/poser-env.mjs ANTHROPIC_ADMIN_KEY
//   node scripts/poser-env.mjs ANTHROPIC_ADMIN_KEY --prod
//
// Benj colle la ligne `CLE=valeur` dans `.env.local` (le fichier est ignoré par git et jamais lu par personne
// d'autre) et me dit « c'est fait » : ce script fait le reste. Il ne dit que le nom de la variable, sa longueur
// et le code de retour de Vercel.
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'

const [cle, ...flags] = process.argv.slice(2)
if (!cle || !/^[A-Z0-9_]{3,64}$/.test(cle)) { console.log('usage : node scripts/poser-env.mjs NOM_DE_LA_VARIABLE [--prod]'); process.exit(2) }

const lignes = fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8').split(/\r?\n/) : []
const ligne = lignes.find((l) => l.startsWith(`${cle}=`))
if (!ligne) {
  console.log(`❌ ${cle} n'est pas dans .env.local.`)
  console.log(`   Ajoutez-y une ligne « ${cle}=… » (sans guillemets, sans espace autour du =), puis relancez.`)
  process.exit(1)
}
const valeur = ligne.slice(cle.length + 1).trim().replace(/^["']|["']$/g, '')
if (!valeur) { console.log(`❌ ${cle} est vide dans .env.local.`); process.exit(1) }

// Un garde-fou : la clé d'USAGE (sk-ant-api…) n'a rien à faire là où on attend une clé d'ADMINISTRATION.
if (cle === 'ANTHROPIC_ADMIN_KEY' && !/^sk-ant-admin/.test(valeur)) {
  console.log('❌ Cette valeur ne ressemble pas à une clé d’administration Anthropic (elle commence par « sk-ant-admin »).')
  console.log('   Une clé d’usage (« sk-ant-api… ») ne sait pas lire les coûts de l’organisation. À créer dans la console Anthropic → Settings → Admin keys.')
  process.exit(1)
}

console.log(`${cle} : ${valeur.length} caractères, trouvée dans .env.local.`)
const r = spawnSync(process.execPath, ['scripts/vercel-env.mjs', cle, valeur, ...flags], { encoding: 'utf8' })
const sortie = `${r.stdout ?? ''}${r.stderr ?? ''}`.replace(valeur, '[valeur masquée]')
console.log(sortie.trim())
if (r.status !== 0) process.exit(1)
console.log(`\n✅ ${cle} est sur Vercel. Elle s’appliquera au prochain déploiement — je le déclenche.`)
