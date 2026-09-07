// Sonde : pourquoi la boîte de l'entreprise ne ramène rien, en PRODUCTION.
//
// Benj, le 07/09 : « le système de mail de l'entreprise marche pas ». Avant de réparer quoi que ce
// soit, il faut savoir CE QUI échoue — et la réponse n'est pas la même selon l'endroit :
//
//   • `.env.local` (ma machine) n'a aucune variable IMAP ; Vercel en a deux, IMAP_USER et IMAP_PASS,
//     posées sur la production seule. Les deux environnements ne disent donc pas la même chose, et
//     tester en local ne prouve rien sur la production.
//   • le bouton « Relever » existe, mais AUCUN cron ne l'appelle : même configurée, la boîte n'est
//     relevée que si quelqu'un clique.
//
// Cette sonde interroge la production avec une vraie session de fondateur, et rapporte mot pour mot
// ce que la route répond. Elle ne répare rien : elle constate.
//
// Elle crée un fondateur de test en production — la garde du Poste de contrôle l'exige — et le
// SUPPRIME dans un `finally`, privilèges d'abord. Le 07/09, deux scripts ont laissé traîner un
// compte administrateur en prod : on ne recommence pas.
//
// Usage : node scripts/sonde-boite.mjs [https://prestiapp.fr]

import crypto from 'node:crypto'
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { verifierSessionTest } from './lib/connexion-test.mjs'

const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split(/\r?\n/).filter(Boolean).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
for (const [k, v] of Object.entries(env)) if (!process.env[k]) process.env[k] = v

const BASE = process.argv[2] || 'https://prestiapp.fr'
const URL_SB = env.NEXT_PUBLIC_SUPABASE_URL, SERVICE = env.SUPABASE_SERVICE_ROLE_KEY, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const admin = createClient(URL_SB, SERVICE, { auth: { persistSession: false } })

const marque = `sonde-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`
const comptes = []

async function fondateurDeTest() {
  const email = `${marque}@presti-test.invalid`
  const password = `Sonde-${crypto.randomBytes(9).toString('base64url')}-1`
  const { data: u, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error || !u?.user?.id) throw new Error(`création : ${error?.message}`)
  comptes.push(u.user.id)
  const { error: eA } = await admin.from('artisans').insert({
    id: u.user.id, email, nom: 'Sonde boîte', metier: 'Test', slug: marque, plan: 'gratuit', is_founder: true,
  })
  if (eA) throw new Error(`fiche : ${eA.message}`)
  const pub = createClient(URL_SB, ANON, { auth: { persistSession: false } })
  const { data: s } = await pub.auth.signInWithPassword({ email, password })
  const jeton = s?.session?.access_token
  if (!jeton) throw new Error('session impossible')
  await verifierSessionTest(jeton)
  return jeton
}

const api = async (chemin, jeton, init = {}) => {
  const r = await fetch(`${BASE}${chemin}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jeton}`, ...(init.headers ?? {}) } })
  const t = await r.text()
  let j = null
  try { j = JSON.parse(t) } catch { /* le statut reste lisible même sans JSON */ }
  return { statut: r.status, data: j, brut: t.slice(0, 300) }
}

async function main() {
  console.log(`\n══ La boîte de l’entreprise, vue depuis ${BASE} ══\n`)
  const jeton = await fondateurDeTest()

  // 1. Ce que la production dit de sa propre configuration.
  const reg = await api('/api/controle/reglages', jeton)
  const boite = reg.data?.connectes?.find((c) => c.cle === 'imap')
  console.log('1. Configuration vue par la production')
  console.log(`   ${reg.statut === 200 ? '' : `(réglages : HTTP ${reg.statut}) `}boîte de l’entreprise : ${boite ? (boite.configure ? '✅ branchée' : '❌ ABSENTE') : 'inconnue'}`)

  // 2. Ce que la boîte contient déjà.
  const av = await api('/api/controle/courriers?statut=tous', jeton)
  console.log(`\n2. Ce qui est déjà en base`)
  console.log(`   ${av.statut === 200 ? `${av.data?.fils?.length ?? 0} fil(s) · ${av.data?.aTraiter ?? 0} à traiter · configurée=${av.data?.configuree}` : `HTTP ${av.statut} — ${av.brut}`}`)
  for (const f of (av.data?.fils ?? []).slice(0, 5)) console.log(`     · ${f.correspondant} — « ${f.sujet ?? 'sans objet'} » (${f.messages} msg, ${f.statut})`)

  // 3. La relève elle-même — c'est ici qu'on saura.
  console.log(`\n3. Relève`)
  const t0 = Date.now()
  const r = await api('/api/controle/courriers/relever', jeton, { method: 'POST', body: '{}' })
  const s = Math.round((Date.now() - t0) / 1000)
  if (r.statut === 200) console.log(`   ✅ HTTP 200 en ${s} s — ${r.data?.lus ?? '?'} message(s) examiné(s), ${r.data?.nouveaux ?? '?'} nouveau(x) · boîte « ${r.data?.boite} »`)
  else console.log(`   ❌ HTTP ${r.statut} en ${s} s — ${r.data?.error ?? r.brut}`)

  // 4. Après.
  const ap = await api('/api/controle/courriers?statut=tous', jeton)
  console.log(`\n4. Après la relève : ${ap.data?.fils?.length ?? 0} fil(s)`)
  for (const f of (ap.data?.fils ?? []).slice(0, 8)) console.log(`     · ${f.correspondant} — « ${f.sujet ?? 'sans objet'} » (${f.messages} msg, ${f.statut})`)
}

/** Le ménage, garanti : privilèges retirés d'abord, compte supprimé ensuite. */
async function menage() {
  for (const id of comptes) {
    await admin.from('direction_roles').delete().eq('user_id', id).then(() => {}, () => {})
    await admin.from('artisans').update({ is_founder: false, plan: 'gratuit' }).eq('id', id).then(() => {}, () => {})
    await admin.from('journal_direction').delete().eq('acteur_id', id).then(() => {}, () => {})
    await admin.rpc('purger_compte_test', { p_id: id }).then(() => {}, () => {})
    await admin.from('artisans').delete().eq('id', id).then(() => {}, () => {})
    await admin.auth.admin.deleteUser(id).catch(() => {})
  }
  const { count } = await admin.from('artisans').select('id', { count: 'exact', head: true }).like('email', `%${marque}%`)
  if (count) console.error(`\n⚠️  ${count} compte(s) de sonde SUBSISTENT — ils portent des privilèges, à vérifier à la main.`)
  else if (comptes.length) console.log(`\n🧹 compte de sonde purgé`)
}

main()
  .catch((e) => { console.error('\n💥', e?.message ?? e) })
  .finally(async () => { await menage(); console.log('') })
