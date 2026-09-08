// Applique une migration SQL directement, dans une transaction.
//
// Pourquoi cet outil existe : le 08/09, Benj a tenté trois fois de coller 0074 dans le SQL Editor.
// La première a échoué sur un fichier que j'avais cassé ; la troisième a échoué parce que l'éditeur
// avait perdu les deux premières lettres du fichier (« drop » arrivé en « op »). Un fichier de 400
// lignes collé à la main est une manipulation qui rate, et la faire recommencer n'est pas une
// réponse.
//
// Ce que l'outil garantit, et qui manque au copier-coller :
//
//   · TOUT OU RIEN. `begin` … `commit` : une erreur au milieu ne laisse pas une demi-migration en
//     base. Le SQL Editor le fait aussi, mais seulement si le texte arrive entier — ce qui est
//     précisément ce qui a lâché ;
//   · le fichier arrive INTACT, lu sur le disque, jamais retapé ni sélectionné à la souris ;
//   · il DIT ce qu'il a fait, en vérifiant après coup que les objets attendus existent.
//
// Il ne prend pas de décision : il applique le fichier qu'on lui nomme, et rien d'autre.
//
// Usage : node scripts/appliquer-migration.mjs supabase/migrations/0074_support.sql
//         node scripts/appliquer-migration.mjs <fichier> --verifier-seulement

import fs from 'node:fs'
import pg from 'pg'

const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split(/\r?\n/).filter(Boolean).filter((l) => !l.startsWith('#'))
  .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))

const fichier = process.argv[2]
const verifierSeulement = process.argv.includes('--verifier-seulement')
if (!fichier) { console.error('Usage : node scripts/appliquer-migration.mjs <fichier.sql>'); process.exit(2) }
if (!env.DIRECT_URL) { console.error('DIRECT_URL absente de .env.local : pas de connexion directe.'); process.exit(2) }

const sql = fs.readFileSync(fichier, 'utf8')
console.log(`\n══ ${fichier} — ${sql.split('\n').length} lignes ══\n`)

const client = new pg.Client({ connectionString: env.DIRECT_URL, ssl: { rejectUnauthorized: false } })
await client.connect()

try {
  if (!verifierSeulement) {
    await client.query('begin')
    try {
      await client.query(sql)
      await client.query('commit')
      console.log('✅ Appliquée et validée (une seule transaction).')
    } catch (e) {
      await client.query('rollback').catch(() => {})
      // Le message de Postgres est reproduit tel quel : c'est lui qui dit la vérité, pas moi.
      console.error(`❌ Refusée — RIEN n'a été appliqué (rollback).\n   ${e.code ?? ''} ${e.message}`)
      if (e.position) {
        const avant = sql.slice(0, Number(e.position))
        const ligne = avant.split('\n').length
        console.error(`   à la ligne ${ligne} du fichier : ${sql.split('\n')[ligne - 1]?.trim().slice(0, 120)}`)
      }
      process.exitCode = 1
    }
  }

  // Ce qui est là après coup. Une migration qui « passe » sans rien créer est déjà arrivée.
  console.log('\n── Ce qui existe maintenant ──')
  const objets = await client.query(`
    select 'table'    as genre, table_name as nom from information_schema.tables
      where table_schema = 'public' and table_name in ('tickets','acces_support','acces_support_lectures','support_verrou')
    union all
    select 'fonction' as genre, routine_name from information_schema.routines
      where routine_schema = 'public' and routine_name like '%support%'
    union all
    select 'colonne'  as genre, 'tickets.' || column_name from information_schema.columns
      where table_schema = 'public' and table_name = 'tickets' and column_name like 'element%'
    order by genre, nom`)
  for (const r of objets.rows) console.log(`  ✅ ${r.genre.padEnd(9)} ${r.nom}`)
  if (!objets.rows.length) console.log('  (aucun objet du mode support — la migration n’a pas pris)')

  const policies = await client.query(`
    select tablename, policyname from pg_policies
     where schemaname = 'public' and policyname like 'founders_all_%' order by tablename`)
  console.log(`\n── Les policies « le fondateur voit tout » ──`)
  if (!policies.rows.length) console.log('  ✅ aucune : la vue passe désormais par la porte tracée')
  else for (const r of policies.rows) console.log(`  ⚠️  encore là : ${r.policyname} sur ${r.tablename}`)
} finally {
  await client.end()
  console.log('')
}
