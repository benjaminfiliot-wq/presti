// Les trois modes de réponse (auto · assistée · manuelle) — prompt v7, bloc 1. Sans aucun appel IA.
//
// Symptôme rapporté : « dès qu'on passe en assisté ou en manuel, la plateforme demande une
// validation, on ne peut plus revenir en arrière, et les trois modes finissent par se comporter
// pareil ». Ce que cette suite exige, pour CHAQUE offre (Essai, Essentiel, Signature), CHAQUE mode
// et CHAQUE route qui décide (/api/conversation, /api/conversation/stream, et la première réponse
// de /api/leads) :
//   1. la décision ne dépend que de `plateforme_config.mode_reponse` — l'ancien booléen
//      `artisans.reponse_auto` est posé à l'OPPOSÉ à chaque fois, et doit être ignoré ;
//   2. les routes rendent un motif explicite (`raison`) : 'credits' quand l'assistant AURAIT
//      répondu (le compte de test est à zéro crédit, donc rien ne part chez Anthropic),
//      'assistee', 'manuelle', 'humain', et 'verrou_offre' quand l'offre n'a pas l'assistant
//      autonome — jamais un silence ;
//   3. l'aller-retour auto → assistée → manuelle → auto ne perd rien ;
//   4. GET /api/plateforme/config dit le mode tel que le serveur l'applique (mode_effectif + motif) ;
//   5. « je prends la main » puis « je rends la main » : l'assistant se tait, puis reprend ;
//   6. zéro message d'assistant produit, zéro crédit consommé : la preuve qu'aucun appel IA n'a eu lieu.
//
// Usage : node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/modes-e2e.mjs
import fs from 'node:fs'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const BASE = process.env.TEST_BASE || 'https://prestiapp.fr'
const SB = process.env.NEXT_PUBLIC_SUPABASE_URL
const admin = createClient(SB, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { peut } = await import('../lib/plans.ts')

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`) } }
const comptes = []
const MDP = 'Modes-' + crypto.randomBytes(8).toString('hex') + '-Aa1'

async function compte(plan) {
  const email = `modes-${plan}-${Date.now()}-${crypto.randomBytes(2).toString('hex')}@presti-test.invalid`
  const { data: u, error } = await admin.auth.admin.createUser({ email, password: MDP, email_confirm: true })
  if (error) throw new Error(error.message)
  comptes.push(u.user.id)
  // ZÉRO crédit : l'assistant « voudrait » répondre en mode auto mais ne peut pas — la route rend
  // alors 'credits', ce qui prouve la décision sans dépenser un centime chez Anthropic.
  const { error: eA } = await admin.from('artisans').upsert({ id: u.user.id, email, nom: `Modes ${plan}`, metier: 'Plombier', slug: `modes-${plan}-${Date.now()}`, plan, credits: 0, credits_reset_le: new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10), plateforme_active: true, leads_pause: false, aide_vues: ['visite:console'] })
  if (eA) throw new Error(eA.message)
  const pub = createClient(SB, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data: s } = await pub.auth.signInWithPassword({ email, password: MDP })
  return { uid: u.user.id, email, plan, jeton: s?.session?.access_token ?? null }
}
async function regler(uid, mode, reponseAutoLegacy) {
  const { error } = await admin.from('plateforme_config').upsert({ artisan_id: uid, mode_reponse: mode, maj_le: new Date().toISOString() }, { onConflict: 'artisan_id' })
  if (error) throw new Error('config : ' + error.message)
  // L'ancien booléen est posé à l'OPPOSÉ du mode : s'il est encore lu quelque part, ça se voit.
  await admin.from('artisans').update({ reponse_auto: reponseAutoLegacy }).eq('id', uid)
}
async function lead(uid) {
  const { data, error } = await admin.from('leads').insert({ artisan_id: uid, nom_prospect: 'Test Modes', contact: 'modes@presti-test.invalid', message: 'Fuite sous évier', type_chantier: 'Plomberie', statut: 'nouveau', token: crypto.randomUUID() }).select('id, token').single()
  if (error) throw new Error('lead : ' + error.message)
  return data
}
const ecrire = async (route, token, message) => {
  const r = await fetch(`${BASE}${route}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': 'presti-modes-e2e' }, body: JSON.stringify({ token, message }) })
  const ct = r.headers.get('content-type') || ''
  if (ct.includes('text/event-stream')) return { status: r.status, flux: true }
  return { status: r.status, ...(await r.json().catch(() => ({}))) }
}
const config = async (jeton) => { const r = await fetch(`${BASE}/api/plateforme/config`, { headers: { Authorization: `Bearer ${jeton}` } }); return { status: r.status, ...(await r.json().catch(() => ({}))) } }
const attendu = (plan, mode) => mode === 'manuelle' ? 'manuelle' : mode === 'assistee' ? 'assistee' : (peut(plan, 'plateforme.ia.auto') ? 'credits' : 'verrou_offre')

try {
  const PLANS = ['gratuit', 'essentiel', 'signature']
  const MODES = ['auto', 'assistee', 'manuelle']
  const C = {}
  for (const p of PLANS) C[p] = await compte(p)
  T('trois comptes de test connectés (Essai, Essentiel, Signature)', PLANS.every((p) => C[p].jeton))

  console.log('\n── 1. La matrice : offre × mode × route — l’ancien booléen est ignoré, le motif est explicite')
  for (const p of PLANS) for (const mode of MODES) {
    await regler(C[p].uid, mode, mode === 'auto' ? false : true)
    for (const route of ['/api/conversation', '/api/conversation/stream']) {
      const l = await lead(C[p].uid)
      const r = await ecrire(route, l.token, 'Bonjour, vous êtes disponible cette semaine ?')
      T(`${p} · ${mode} · ${route.replace('/api/conversation', 'conv')} → ${attendu(p, mode)}`, r.status === 200 && r.raison === attendu(p, mode) && !r.flux, `HTTP ${r.status} · raison=${r.raison ?? '—'}${r.flux ? ' (flux !)' : ''}`)
    }
  }

  console.log('\n── 2. La première réponse (/api/leads) suit le même mode')
  await regler(C.signature.uid, 'manuelle', true)
  const { data: art } = await admin.from('artisans').select('slug').eq('id', C.signature.uid).single()
  const r1 = await fetch(`${BASE}/api/leads`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: art.slug, contact: '06 00 00 00 13', nom_prospect: 'Test Modes', message: 'Fuite sous évier, urgent' }) })
  const j1 = await r1.json().catch(() => ({}))
  T('nouvelle demande en mode manuelle → raison manuelle, aucune réponse', r1.status === 200 && j1.raison === 'manuelle' && !j1.reply, `HTTP ${r1.status} raison=${j1.raison ?? '—'}`)

  console.log('\n── 3. L’aller-retour : auto → assistée → manuelle → auto, sans rien perdre')
  for (const mode of ['auto', 'assistee', 'manuelle', 'auto']) {
    await regler(C.signature.uid, mode, mode !== 'auto')
    const { data: c } = await admin.from('plateforme_config').select('mode_reponse').eq('artisan_id', C.signature.uid).single()
    const l = await lead(C.signature.uid)
    const r = await ecrire('/api/conversation/stream', l.token, 'Et pour un devis ?')
    T(`Signature repasse en ${mode} : base=${c?.mode_reponse}, serveur → ${attendu('signature', mode)}`, c?.mode_reponse === mode && r.raison === attendu('signature', mode), `raison=${r.raison ?? '—'}`)
  }

  console.log('\n── 4. Le serveur dit le mode qu’il applique vraiment (GET /api/plateforme/config)')
  await regler(C.essentiel.uid, 'auto', true)
  const ce = await config(C.essentiel.jeton)
  T('Essentiel en « auto » → mode_effectif = assistee, motif = verrou_offre', ce.status === 200 && ce.mode_reponse === 'auto' && ce.mode_effectif === 'assistee' && ce.motif === 'verrou_offre', `HTTP ${ce.status} ${JSON.stringify(ce).slice(0, 120)}`)
  await regler(C.signature.uid, 'auto', false)
  const cs = await config(C.signature.jeton)
  T('Signature en « auto » → mode_effectif = auto, sans motif', cs.status === 200 && cs.mode_effectif === 'auto' && !cs.motif, JSON.stringify(cs).slice(0, 120))
  T('… et l’offre minimale de l’assistant autonome est annoncée (studio)', cs.offre_auto === 'studio' && ce.offre_auto === 'studio', `${ce.offre_auto} / ${cs.offre_auto}`)

  console.log('\n── 5. Je prends la main, puis je la rends')
  const l5 = await lead(C.signature.uid)
  const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${C.signature.jeton}` }
  const p1 = await fetch(`${BASE}/api/messages`, { method: 'POST', headers: H, body: JSON.stringify({ action: 'prise_en_main', lead_id: l5.id, valeur: true }) })
  T('prise de main acceptée', p1.status === 200)
  const r5a = await ecrire('/api/conversation/stream', l5.token, 'Vous êtes là ?')
  T('l’assistant se tait sur ce fil (humain)', r5a.raison === 'humain', `raison=${r5a.raison ?? '—'}`)
  const v1 = await (await fetch(`${BASE}/api/conversation?token=${l5.token}`)).json()
  T('le client voit que l’artisan a la main', v1.prise_en_main === true)
  const p2 = await fetch(`${BASE}/api/messages`, { method: 'POST', headers: H, body: JSON.stringify({ action: 'rendre_main', lead_id: l5.id }) })
  T('« rendre la main » existe et répond', p2.status === 200, `HTTP ${p2.status}`)
  const r5b = await ecrire('/api/conversation/stream', l5.token, 'Et maintenant ?')
  T('l’assistant reprend (auto → credits, sans dépense)', r5b.raison === 'credits', `raison=${r5b.raison ?? '—'}`)
  const v2 = await (await fetch(`${BASE}/api/conversation?token=${l5.token}`)).json()
  T('le client voit que l’assistant a repris', v2.prise_en_main === false)

  console.log('\n── 6. Aucun appel IA n’a eu lieu')
  const ids = PLANS.map((p) => C[p].uid)
  const { data: leadsTest } = await admin.from('leads').select('id').in('artisan_id', ids)
  const { count } = await admin.from('messages').select('id', { count: 'exact', head: true }).in('lead_id', (leadsTest ?? []).map((l) => l.id)).eq('type', 'reponse_auto')
  T('zéro message d’assistant produit sur les fils de test', (count ?? 0) === 0, `${count} message(s)`)
  const { data: cr } = await admin.from('artisans').select('credits').in('id', ids)
  T('zéro crédit consommé', (cr ?? []).every((a) => a.credits === 0), JSON.stringify(cr))
} catch (e) {
  ko++; console.log('  ❌ exception —', e instanceof Error ? e.message : e)
} finally {
  for (const id of comptes) { const { error } = await admin.rpc('purger_compte_test', { p_id: id }); if (error) console.log('  ⚠️ purge :', error.message) }
  console.log(`\n🧹 ${comptes.length} compte(s) de test purgé(s)`)
}

console.log(`\n${ko ? '❌' : '✅'} ${ok} réussis, ${ko} échoués`)
process.exitCode = ko ? 1 : 0
setTimeout(() => process.exit(process.exitCode), 200)
