// La purge des comptes après 30 jours — sans aucun appel IA.
//
// Ce que ce test protège (auditeur B, bloquant n°2) : un compte qui a émis une facture ne peut
// pas être effacé — le trigger `factures_conservees` (0041) l'interdit, à raison (10 ans,
// art. L. 102 B du LPF). Avant, la purge avalait cette erreur : le compte restait entier pour
// toujours, l'artisan croyait ses données effacées, et personne n'était prévenu. Maintenant :
//   · compte SANS facture émise → effacé pour de bon (ligne artisan et utilisateur auth) ;
//   · compte AVEC facture émise → ANONYMISÉ : conversations, devis brouillons, coordonnées,
//     images, accès effacés ; les factures émises, les devis qu'elles citent et l'identité
//     d'émetteur (nom, SIRET, adresse) restent, comme la loi l'exige (art. 17.3 b RGPD).
//
// Usage : node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/purge-comptes-e2e.mjs
import fs from 'node:fs'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const SB = process.env.NEXT_PUBLIC_SUPABASE_URL
const admin = createClient(SB, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { purgerComptes, JOURS_DE_GRACE } = await import('../lib/purgeComptes.ts')

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`) } }
const comptes = []
const MDP = 'Purge-Test-' + crypto.randomBytes(6).toString('hex')

async function compte(nom, avecFacture) {
  const email = `purge-${nom}-${Date.now()}-${crypto.randomBytes(2).toString('hex')}@presti-test.invalid`
  const { data: u, error } = await admin.auth.admin.createUser({ email, password: MDP, email_confirm: true })
  if (error) throw new Error(error.message)
  const id = u.user.id
  comptes.push({ id, email })
  const demande = new Date(Date.now() - (JOURS_DE_GRACE + 1) * 86400000).toISOString()
  const { error: eA } = await admin.from('artisans').upsert({ id, email, nom: `Purge ${nom}`, metier: 'Plombier', slug: `purge-${nom}-${Date.now()}`, plan: 'essentiel',
    tel_public: '06 00 00 00 00', email_public: email, bio: 'Bio personnelle', siret: '12345678900012', adresse: '1 rue du Test', code_postal: '17230', ville: 'Marans',
    site_active: true, plateforme_active: true, suppression_demandee_le: demande })
  if (eA) throw new Error(eA.message)
  const { data: lead } = await admin.from('leads').insert({ artisan_id: id, message: 'Fuite', type_chantier: 'Plomberie', statut: 'nouveau', token: crypto.randomUUID() }).select('id').single()
  await admin.from('messages').insert({ lead_id: lead.id, sens: 'in', type: 'manuel', contenu: 'Bonjour' })
  let facture = null
  if (avecFacture) {
    const { data: cl } = await admin.from('clients').insert({ artisan_id: id, nom: 'Client Facturé', email: 'client@presti-test.invalid' }).select('id').single()
    const { data: dv } = await admin.from('devis').insert({ artisan_id: id, client_id: cl.id, numero: 'D-TEST-1', statut: 'accepte', total_ht: 100, total_ttc: 100 }).select('id').single()
    await admin.from('devis').insert({ artisan_id: id, numero: 'D-TEST-2', statut: 'brouillon', total_ht: 10, total_ttc: 10 })
    const { data: f, error: eF } = await admin.from('factures').insert({ artisan_id: id, client_id: cl.id, devis_id: dv.id, numero: 'F-TEST-1', client_nom: 'Client Facturé',
      statut: 'emise', date_emission: new Date().toISOString().slice(0, 10), total_ht: 100, total_tva: 0, total_ttc: 100, verrouillee: true, emise_le: new Date().toISOString() }).select('id').single()
    if (eF) throw new Error('facture : ' + eF.message)
    facture = f.id
  }
  return { id, email, facture }
}

const connexion = async (email) => {
  const r = await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: MDP }) })
  return r.ok
}

try {
  const sans = await compte('sans', false)
  const avec = await compte('avec', true)
  T('les deux comptes se connectent avant la purge', (await connexion(sans.email)) && (await connexion(avec.email)))

  console.log('\n── La purge tourne')
  const r = await purgerComptes()
  console.log('  résultat :', JSON.stringify(r))
  T('aucune erreur globale', !r.erreur, r.erreur)

  console.log('\n── Compte SANS facture émise : effacé pour de bon')
  const { data: aS } = await admin.from('artisans').select('id').eq('id', sans.id).maybeSingle()
  T('la ligne artisan a disparu', !aS)
  const { data: uS } = await admin.auth.admin.getUserById(sans.id)
  T('l’utilisateur auth a disparu', !uS?.user)
  T('… et ne peut plus se connecter', !(await connexion(sans.email)))

  console.log('\n── Compte AVEC facture émise : anonymisé, pas effacé')
  const { data: aA } = await admin.from('artisans').select('*').eq('id', avec.id).maybeSingle()
  T('la ligne artisan existe encore', !!aA)
  T('le compte est marqué anonymisé (email de remplacement)', /^supprime-.*@anonyme\.invalid$/.test(aA?.email ?? ''), aA?.email)
  T('la date de demande est effacée (plus jamais repris par la purge)', aA?.suppression_demandee_le == null)
  T('téléphone, email public, bio : effacés', aA && aA.tel_public == null && aA.email_public == null && aA.bio == null)
  T('site et plateforme : coupés', aA && aA.site_active === false && aA.plateforme_active === false)
  T('identité d’émetteur conservée (nom, SIRET, adresse — mentions légales de la facture)', aA && aA.nom === 'Purge avec' && aA.siret === '12345678900012' && aA.adresse === '1 rue du Test')
  const { count: nl } = await admin.from('leads').select('id', { count: 'exact', head: true }).eq('artisan_id', avec.id)
  T('conversations effacées', nl === 0, `${nl} lead(s)`)
  const { data: dvs } = await admin.from('devis').select('numero').eq('artisan_id', avec.id)
  T('le devis brouillon est effacé, le devis facturé reste', (dvs ?? []).map((d) => d.numero).join() === 'D-TEST-1', JSON.stringify(dvs))
  const { data: fs_ } = await admin.from('factures').select('id, verrouillee, client_nom').eq('artisan_id', avec.id)
  T('la facture émise est toujours là, verrouillée', (fs_ ?? []).length === 1 && fs_[0].verrouillee === true && fs_[0].client_nom === 'Client Facturé')
  const { data: uA } = await admin.auth.admin.getUserById(avec.id)
  T('l’utilisateur auth est banni', !!uA?.user?.banned_until, JSON.stringify(uA?.user?.banned_until))
  T('… son email est remplacé', /@anonyme\.invalid$/.test(uA?.user?.email ?? ''), uA?.user?.email)
  T('… et il ne peut plus se connecter', !(await connexion(avec.email)))

  console.log('\n── Une seconde purge ne retouche pas le compte anonymisé')
  const r2 = await purgerComptes()
  T('rien à faire', (r2.purges ?? 0) === 0 && (r2.anonymises ?? 0) === 0, JSON.stringify(r2))
} catch (e) {
  ko++; console.log('  ❌ exception —', e instanceof Error ? e.message : e)
} finally {
  for (const c of comptes) {
    // Le compte anonymisé porte un email de remplacement : on lui rend son email de test pour la purge de test.
    await admin.from('artisans').update({ email: c.email }).eq('id', c.id)
    try { await admin.auth.admin.updateUserById(c.id, { email: c.email }) } catch {}
    const { error } = await admin.rpc('purger_compte_test', { p_id: c.id })
    if (error && !/réservé/.test(error.message)) console.log('  ⚠️ purge de test :', error.message)
  }
  console.log(`\n🧹 ${comptes.length} compte(s) de test purgé(s)`)
}

console.log(`\n${ko ? '❌' : '✅'} ${ok} réussis, ${ko} échoués`)
process.exit(ko ? 1 : 0)
