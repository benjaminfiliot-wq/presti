// Le verrou SERVEUR des règles d'automatisation — sans aucun appel IA.
//
// Ce que ce test protège : un artisan Essentiel peut écrire une règle « réactif » depuis son
// navigateur (la RLS l'y autorise), mais le serveur ne doit JAMAIS l'exécuter — sinon il obtient
// le chiffrage automatique et l'acompte, réservés à Signature. Le contrôle se fait AVANT tout
// appel au modèle : si le verrou manquait, la fonction tenterait un chiffrage… et échouerait
// ici en 401, parce que la clé Anthropic locale est désactivée pendant le sprint. Le test
// resterait rouge sans rien dépenser.
//
// Usage : node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/regles-verrou-e2e.mjs
import fs from 'node:fs'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { declencherRegles } = await import('../lib/reglesServeur.ts')
const { peut } = await import('../lib/plans.ts')

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`) } }
const comptes = []

async function compte(plan) {
  const email = `verrou-${plan}-${Date.now()}-${crypto.randomBytes(2).toString('hex')}@presti-test.invalid`
  const { data: u, error } = await admin.auth.admin.createUser({ email, password: crypto.randomBytes(18).toString('base64url'), email_confirm: true })
  if (error) throw new Error(error.message)
  comptes.push(u.user.id)
  await admin.from('artisans').upsert({ id: u.user.id, email, nom: `Verrou ${plan}`, metier: 'Plombier', slug: `verrou-${plan}-${Date.now()}`, plan, credits: 50, plateforme_active: true })
  await admin.from('regles_automatisation').upsert({ artisan_id: u.user.id, prereglage: 'reactif', actif: true,
    maillons: { devis_auto: true, photo_requise: false, modele: 'standard', notifier: false, validation: true, envoyer_apres_validation: false, acompte_pct: 30 } }, { onConflict: 'artisan_id' })
  const { data: lead } = await admin.from('leads').insert({ artisan_id: u.user.id, message: 'Fuite sous évier, cuisine', type_chantier: 'Plomberie', statut: 'nouveau', token: crypto.randomUUID() }).select('*').single()
  return { uid: u.user.id, email, lead }
}

console.log('\n── La matrice des offres')
T('Essentiel n’a pas les règles', peut('essentiel', 'plateforme.regles') === false)
T('Studio n’a pas les règles', peut('studio', 'plateforme.regles') === false)
T('Signature a les règles', peut('signature', 'plateforme.regles') === true)

try {
  console.log('\n── Le serveur refuse d’exécuter la règle d’un Essentiel')
  const E = await compte('essentiel')
  const r = await declencherRegles({ lead: E.lead, nbReponsesIA: 2, artisanEmail: E.email, artisanNom: 'Verrou' })
  T('la règle ne fait rien', r.fait === 'rien', JSON.stringify(r).slice(0, 120))
  T('… et dit pourquoi : réservé à une offre supérieure', /réservé/i.test(r.pourquoi ?? ''), r.pourquoi)
  const { data: dv } = await admin.from('devis').select('id').eq('artisan_id', E.uid)
  T('aucun devis n’a été créé', (dv ?? []).length === 0)
} catch (e) {
  ko++; console.log('  ❌ exception —', e instanceof Error ? e.message : e)
} finally {
  for (const id of comptes) { await admin.rpc('purger_compte_test', { p_id: id }).catch(() => {}) }
  console.log(`\n🧹 ${comptes.length} compte(s) de test purgé(s)`)
}

console.log(`\n${ko ? '❌' : '✅'} ${ok} réussis, ${ko} échoués`)
process.exit(ko ? 1 : 0)
