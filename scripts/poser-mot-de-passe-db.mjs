// Pose le mot de passe Postgres dans .env.local SANS qu'il passe par un chat, un journal ou
// un commit : il est demandé à la saisie (masqué), écrit dans le fichier, puis testé en direct.
//
// Usage : node scripts/poser-mot-de-passe-db.mjs
// (Supabase → Project Settings → Database → « Reset database password » si tu ne l'as pas.)

import fs from 'node:fs'
import readline from 'node:readline'
import pg from 'pg'

const chemin = new URL('../.env.local', import.meta.url)

function demander(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    // Saisie masquée : on n'affiche rien pendant la frappe.
    const sortie = rl.output
    rl.question(question, (rep) => { sortie.write('\n'); rl.close(); resolve(rep.trim()) })
    rl._writeToOutput = (s) => { if (s.includes(question)) sortie.write(question) }
  })
}

const mdp = await demander('Mot de passe Postgres (saisie masquée, puis Entrée) : ')
if (!mdp) { console.error('Rien saisi.'); process.exit(1) }

// Test AVANT d'écrire : on ne remplace pas une valeur par une autre qui ne marche pas.
const client = new pg.Client({
  host: 'aws-0-eu-central-1.pooler.supabase.com', port: 5432, user: 'postgres.gorcdvmueakcncsmrouo',
  password: mdp, database: 'postgres', ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000,
})
try {
  await client.connect(); await client.query('select 1'); await client.end()
} catch (e) {
  console.error('❌ La base refuse ce mot de passe :', e.message)
  console.error('   Vérifie qu’il vient bien de Supabase → Project Settings → Database (bouton Reset si besoin).')
  process.exit(2)
}

let contenu = fs.readFileSync(chemin, 'utf8')
const ligne = `SUPABASE_DB_PASSWORD=${mdp}`
contenu = /^SUPABASE_DB_PASSWORD=.*$/m.test(contenu) ? contenu.replace(/^SUPABASE_DB_PASSWORD=.*$/m, ligne) : contenu.replace(/\s*$/, '\n') + ligne + '\n'
fs.writeFileSync(chemin, contenu)
console.log('✅ Mot de passe vérifié et enregistré dans .env.local. Dis « c’est fait » à Claude.')
