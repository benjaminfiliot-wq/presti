// Lanceur de migrations SQL (DDL) via connexion Postgres directe (session pooler Supabase).
// Usage : node scripts/run-migration.mjs supabase/migrations/0005_secure_privileges.sql
// Lit SUPABASE_DB_PASSWORD depuis .env.local (gitignoré). Ne logge jamais le mot de passe.
import fs from 'fs'
import pg from 'pg'

const env = Object.fromEntries(
  fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/).filter(Boolean)
    .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }),
)

const file = process.argv[2]
if (!file) { console.error('usage: node scripts/run-migration.mjs <chemin.sql>'); process.exit(1) }
if (!env.SUPABASE_DB_PASSWORD) { console.error('SUPABASE_DB_PASSWORD manquant dans .env.local'); process.exit(1) }
const sql = fs.readFileSync(file, 'utf8')

const client = new pg.Client({
  host: 'aws-0-eu-central-1.pooler.supabase.com',
  port: 5432,
  user: 'postgres.gorcdvmueakcncsmrouo',
  password: env.SUPABASE_DB_PASSWORD,
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
})

try {
  await client.connect()
  const who = await client.query('select current_user as u, current_database() as d')
  console.log(`connecté : ${who.rows[0].u} @ ${who.rows[0].d}`)
  await client.query(sql)
  console.log('✅ migration appliquée :', file)
} catch (e) {
  console.error('❌ échec migration :', e.message)
  process.exitCode = 1
} finally {
  await client.end()
}
