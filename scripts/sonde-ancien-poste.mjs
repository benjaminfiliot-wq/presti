// Sonde : un PARTENAIRE peut-il lire les prospects des artisans par l'ancien poste de contrôle ?
//
// La revue adversariale du mode support (07/09) a trouvé ceci : les six routes `/api/control/*`
// (sans « e ») — l'ancien poste, remplacé par `/controle` — gardent leur porte avec
// `artisans.is_founder`, la COLONNE brute. La migration 0070 a corrigé la FONCTION `is_founder()`
// pour en exclure le partenaire, mais une colonne n'est pas une fonction : ces routes n'ont jamais
// vu la correction.
//
// Or `/api/control/stats` rend `nom`, `contact` et `message` des 120 derniers prospects de TOUS les
// artisans. Si un compte `is_founder = true` mais `role_interne = 'partenaire'` obtient ces données,
// c'est une fuite en production des clients que les artisans nous confient — exactement ce que le
// prompt v11 §5 interdit, et ce que je croyais avoir fermé.
//
// Cette sonde crée ce compte-là, essaie les six routes, et le supprime. Elle ne lit jamais le
// contenu obtenu : elle compte, et dit lesquelles ont cédé.
//
// Usage : node scripts/sonde-ancien-poste.mjs [https://prestiapp.fr]

import crypto from 'node:crypto'
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { verifierSessionTest } from './lib/connexion-test.mjs'

const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split(/\r?\n/).filter(Boolean).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
for (const [k, v] of Object.entries(env)) if (!process.env[k]) process.env[k] = v

const BASE = process.argv[2] || 'https://prestiapp.fr'
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const marque = `anciensposte-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`
const comptes = []

/** Un PARTENAIRE : `is_founder = true` (le contrat le lui laisse), `role_interne = 'partenaire'`. */
async function partenaireDeTest() {
  const email = `${marque}@presti-test.invalid`
  const password = `Anc-${crypto.randomBytes(9).toString('base64url')}-1`
  const { data: u, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error || !u?.user?.id) throw new Error(`création : ${error?.message}`)
  comptes.push(u.user.id)
  const { error: eA } = await admin.from('artisans').insert({
    id: u.user.id, email, nom: 'Sonde ancien poste', metier: 'Test', slug: marque, plan: 'gratuit',
    is_founder: true, role_interne: 'partenaire',
  })
  if (eA) throw new Error(`fiche : ${eA.message}`)
  const pub = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data: s } = await pub.auth.signInWithPassword({ email, password })
  if (!s?.session?.access_token) throw new Error('session impossible')
  await verifierSessionTest(s.session.access_token)
  return s.session.access_token
}

async function menage() {
  for (const id of comptes) {
    await admin.from('artisans').update({ is_founder: false, role_interne: null }).eq('id', id).then(() => {}, () => {})
    await admin.from('direction_roles').delete().eq('user_id', id).then(() => {}, () => {})
    await admin.rpc('purger_compte_test', { p_id: id }).then(() => {}, () => {})
    await admin.from('artisans').delete().eq('id', id).then(() => {}, () => {})
    await admin.auth.admin.deleteUser(id).catch(() => {})
  }
  const { count } = await admin.from('artisans').select('id', { count: 'exact', head: true }).like('email', `%${marque}%`)
  if (count) console.error(`\n⚠️  ${count} compte(s) de sonde SUBSISTENT — ils portent is_founder, à vérifier à la main.`)
}

const ROUTES = ['/api/control/stats', '/api/control/inbox', '/api/control/security', '/api/control/stripe', '/api/control/agents']

try {
  const jeton = await partenaireDeTest()
  console.log(`\n══ Un partenaire face à l’ancien poste de contrôle · ${BASE} ══\n`)
  let cedees = 0
  for (const r of ROUTES) {
    const rep = await fetch(`${BASE}${r}`, { headers: { Authorization: `Bearer ${jeton}` } })
    const corps = await rep.json().catch(() => null)
    if (rep.status === 200) {
      cedees++
      // On COMPTE ce qui sort, on ne le lit pas : ce sont les clients de vrais artisans.
      const quoi = corps?.leadsList ? `${corps.leadsList.length} prospect(s) avec nom, contact et message`
        : corps?.devisList ? `${corps.devisList.length} devis`
        : corps?.messages ? `${corps.messages.length} email(s) de l’entreprise`
        : `${Object.keys(corps ?? {}).length} champ(s)`
      console.log(`  ⛔ ${r.padEnd(24)} 200 — ${quoi}`)
      if (corps?.leadsList?.length) console.log(`     … et ${corps.devisList?.length ?? 0} devis, ${corps.clientsList?.length ?? 0} clients agrégés`)
    } else {
      console.log(`  ✅ ${r.padEnd(24)} ${rep.status} — ${String(corps?.error ?? '').slice(0, 60)}`)
    }
  }
  console.log(`\n${cedees ? `⛔ ${cedees} route(s) ont cédé : un partenaire lit les données des clients des artisans.` : '✅ aucune route ne cède.'}\n`)
} catch (e) {
  console.error('\n💥', e?.message ?? e)
} finally {
  await menage()
}
