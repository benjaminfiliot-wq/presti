// Le poste de pilotage de la plateforme (v5 §9 G1), contre la production.
//
// Ce qu'on prouve, dans l'ordre où l'artisan le vivra en démo :
//  1. mode ASSISTÉ : le client écrit → rien ne lui part, une PROPOSITION attend l'artisan,
//     invisible du client ; l'artisan la valide → elle devient réelle, le client la voit ;
//  2. « Je prends la main » : l'assistant se tait, le client en est informé ;
//  3. une règle d'automatisation de bout en bout : qualifié + photo → devis brouillon (source
//     'regle'), UN SEUL même si on rejoue ; acceptation par le client → facture d'acompte ;
//  4. isolation : un autre artisan ne peut ni voir ni valider la proposition.
//
// Coût : 2 réponses IA + 1 chiffrage (compte de test Signature, crédits neufs). Nettoyé en finally.
// Usage : node scripts/pilotage-e2e.mjs

import fs from 'node:fs'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const BASE = process.env.TEST_BASE || 'https://prestiapp.fr'
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const admin = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? `\n     → ${d}` : ''}`) } }
const attendre = (ms) => new Promise((r) => setTimeout(r, ms))

async function compte(plan, nom) {
  const email = `verif-pilotage-${nom}-${Date.now()}@presti-test.invalid`
  const mdp = crypto.randomBytes(18).toString('base64url')
  const { data: u, error } = await admin.auth.admin.createUser({ email, password: mdp, email_confirm: true })
  if (error) throw new Error('compte : ' + error.message)
  await admin.from('artisans').insert({
    id: u.user.id, email, nom: `Vérif ${nom}`, metier: 'Menuisier', slug: `verif-pilotage-${nom}-${Date.now()}`, plan,
    plateforme_active: true, reponse_auto: true, credits: 600,
    forme_juridique: 'EI', siret: '12345678900012', adresse: '1 rue du Test', code_postal: '17230', ville: 'Marans',
    assurance_nom: 'Assureur Test', assurance_contrat: 'CT-0001', tva_regime: 'franchise',
  })
  const pub = createClient(URL, ANON, { auth: { persistSession: false } })
  const { data: s } = await pub.auth.signInWithPassword({ email, password: mdp })
  return { uid: u.user.id, jeton: s.session.access_token }
}
const api = (chemin, jeton, corps, methode = 'POST') => fetch(BASE + chemin, {
  method: methode, headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}) },
  ...(corps ? { body: JSON.stringify(corps) } : {}),
})
// Le client écrit sur la plateforme (route streaming = celle de PlatChat). On lit la réponse JSON
// quand l'assistant ne répond pas, ou le flux SSE jusqu'au bout quand il répond.
async function clientEcrit(token, message) {
  const r = await api('/api/conversation/stream', null, { token, message })
  const ct = r.headers.get('content-type') || ''
  if (ct.includes('application/json')) return { status: r.status, ...(await r.json()) }
  const texte = await r.text()
  const done = [...texte.matchAll(/data: (\{.*\})/g)].map((m) => JSON.parse(m[1])).find((o) => o.t === 'done')
  // Comme le navigateur du client : une fois la réponse reçue, il déclenche les règles
  // d'automatisation (route dédiée, idempotente — voir app/api/conversation/regles).
  if (done?.v) await api('/api/conversation/regles', null, { token }).catch(() => {})
  return { status: r.status, reply: done?.v ?? null, sse: true }
}

const comptes = []
try {
  const A = await compte('signature', 'a'); comptes.push(A.uid)
  const B = await compte('signature', 'b'); comptes.push(B.uid)

  // Une conversation (lead) de A, comme si un client venait d'écrire depuis sa plateforme.
  const token = crypto.randomUUID()
  const { data: lead } = await admin.from('leads').insert({
    artisan_id: A.uid, nom_prospect: 'Client Test', contact: 'client-test@presti-test.invalid',
    message: 'Bonjour, je voudrais une bibliothèque sur mesure en chêne, 2 m de large, dans le salon.', statut: 'nouveau', token,
    type_chantier: 'Menuiserie', photos: ['test/0.webp'],
  }).select('id').single()

  console.log('\n── 1. Mode assisté : l’assistant PRÉPARE, l’artisan VALIDE')
  await admin.from('plateforme_config').upsert({ artisan_id: A.uid, mode_reponse: 'assistee', modele: 'standard' }, { onConflict: 'artisan_id' })
  const r1 = await clientEcrit(token, 'Quelles essences proposez-vous, et sous quel délai ?')
  T('rien ne part au client', r1.reply == null && r1.raison === 'assistee', JSON.stringify(r1).slice(0, 120))
  await attendre(1500)
  const { data: props } = await admin.from('messages').select('id, etat, contenu, modele').eq('lead_id', lead.id).eq('etat', 'proposition')
  T('une proposition attend dans le fil', (props?.length ?? 0) === 1, `${props?.length ?? 0} proposition(s)`)
  T('elle porte le modèle qui l’a écrite', props?.[0]?.modele === 'standard', props?.[0]?.modele)
  const vueClient = await (await fetch(`${BASE}/api/conversation?token=${token}`)).json()
  T('le client NE la voit PAS', !(vueClient.messages ?? []).some((m) => m.sens === 'out' && m.contenu === props?.[0]?.contenu))

  // Isolation : B ne peut pas valider la proposition de A.
  const rB = await api('/api/messages', B.jeton, { action: 'valider', lead_id: lead.id, message_id: props?.[0]?.id })
  T('un autre artisan ne peut pas la valider', rB.status === 404, `HTTP ${rB.status}`)
  const { data: pB } = await createClient(URL, ANON, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${B.jeton}` } } })
    .from('messages').select('id').eq('lead_id', lead.id)
  T('ni la lire (RLS)', (pB?.length ?? 0) === 0, `${pB?.length ?? 0} ligne(s) lisibles`)

  const rV = await api('/api/messages', A.jeton, { action: 'valider', lead_id: lead.id, message_id: props?.[0]?.id, message: props?.[0]?.contenu + '\n(validé)' })
  T('l’artisan valide (texte retouché)', rV.status === 200, `HTTP ${rV.status}`)
  const vueClient2 = await (await fetch(`${BASE}/api/conversation?token=${token}`)).json()
  T('le client la voit maintenant', (vueClient2.messages ?? []).some((m) => m.sens === 'out' && /\(validé\)$/.test(m.contenu)))

  console.log('\n── 2. « Je prends la main »')
  const rM = await api('/api/messages', A.jeton, { action: 'prise_en_main', lead_id: lead.id, valeur: true })
  T('la prise de main est enregistrée', rM.status === 200 && rM.ok !== false)
  const r2 = await clientEcrit(token, 'Et pour la teinte ?')
  T('l’assistant se tait', r2.reply == null && r2.raison === 'humain', JSON.stringify(r2).slice(0, 120))
  const vueClient3 = await (await fetch(`${BASE}/api/conversation?token=${token}`)).json()
  T('le client sait qu’un humain a la main', vueClient3.prise_en_main === true)
  await api('/api/messages', A.jeton, { action: 'prise_en_main', lead_id: lead.id, valeur: false })

  console.log('\n── 3. Une règle de bout en bout : qualifié + photo → devis → acceptation → acompte')
  await admin.from('plateforme_config').upsert({ artisan_id: A.uid, mode_reponse: 'auto', modele: 'standard' }, { onConflict: 'artisan_id' })
  await admin.from('regles_automatisation').upsert({ artisan_id: A.uid, prereglage: 'reactif', actif: true,
    maillons: { devis_auto: true, photo_requise: true, modele: 'standard', notifier: false, validation: true, envoyer_apres_validation: true, acompte_pct: 30 } }, { onConflict: 'artisan_id' })
  const r3 = await clientEcrit(token, 'Chêne massif, finition huilée. Voici la photo du mur.')
  T('l’assistant répond au client', typeof r3.reply === 'string' && r3.reply.length > 20, JSON.stringify(r3).slice(0, 120))
  await attendre(2500)
  const { data: devis1 } = await admin.from('devis').select('id, numero, statut, source').eq('lead_id', lead.id)
  T('un devis brouillon a été créé par la règle', (devis1 ?? []).some((d) => d.source === 'regle' && d.statut === 'brouillon'), JSON.stringify(devis1))
  T('et il n’est PAS parti (maillon validation)', !(devis1 ?? []).some((d) => d.statut === 'envoye'))
  // Rejouer un message : la règle ne doit PAS créer un second devis.
  const r4 = await clientEcrit(token, 'Ah, et une étagère de plus si possible.')
  await attendre(2500)
  const { data: devis2 } = await admin.from('devis').select('id').eq('lead_id', lead.id).eq('source', 'regle')
  T('jamais deux devis automatiques pour une conversation', (devis2?.length ?? 0) === 1, `${devis2?.length ?? 0} devis 'regle'`)
  void r4

  // L'artisan valide = envoie le devis (statut envoye) ; le client accepte ; l'acompte se facture.
  const dId = (devis1 ?? []).find((d) => d.source === 'regle')?.id
  await admin.from('devis').update({ statut: 'envoye' }).eq('id', dId)
  const rA = await api('/api/conversation/devis', null, { token, action: 'accepter' })
  const jA = await rA.json().catch(() => ({}))
  T('le client accepte le devis', rA.status === 200 && jA.statut === 'accepte', `HTTP ${rA.status} ${JSON.stringify(jA)}`)
  T('une facture d’acompte est créée à l’acceptation', !!jA.facture?.numero, JSON.stringify(jA))
  if (jA.facture?.numero) {
    // Le numéro est propre à CHAQUE artisan (FAC-2026-0001 existe chez plusieurs comptes) : filtrer par artisan, sinon maybeSingle() renvoie null.
    const { data: f } = await admin.from('factures').select('acompte_pct, verrouillee, devis_id').eq('artisan_id', A.uid).eq('numero', jA.facture.numero).maybeSingle()
    T('  …à 30 %, scellée, rattachée au devis', f?.acompte_pct === 30 && f?.verrouillee === true && f?.devis_id === dId, JSON.stringify(f))
  }
} catch (e) {
  ko++; console.log('  ❌ exception :', e.message)
} finally {
  for (const uid of comptes) {
    const { data: ls } = await admin.from('leads').select('id').eq('artisan_id', uid)
    for (const l of ls ?? []) await admin.from('messages').delete().eq('lead_id', l.id)
    await admin.from('factures_lignes').delete().in('facture_id', (await admin.from('factures').select('id').eq('artisan_id', uid)).data?.map((f) => f.id) ?? [])
    await admin.from('factures').delete().eq('artisan_id', uid)
    await admin.from('devis_lignes').delete().in('devis_id', (await admin.from('devis').select('id').eq('artisan_id', uid)).data?.map((d) => d.id) ?? [])
    await admin.from('devis').delete().eq('artisan_id', uid)
    await admin.from('leads').delete().eq('artisan_id', uid)
    await admin.from('regles_automatisation').delete().eq('artisan_id', uid)
    await admin.from('plateforme_config').delete().eq('artisan_id', uid)
    await admin.from('artisans').delete().eq('id', uid)
    await admin.auth.admin.deleteUser(uid).catch(() => {})
  }
  if (comptes.length) console.log(`\n🧹 ${comptes.length} comptes de test supprimés (et tout ce qu'ils avaient créé)`)
}
console.log(`\n${ok} réussis, ${ko} échoués\n`)
process.exit(ko ? 1 : 0)
