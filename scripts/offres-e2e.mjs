// Les offres = les verrous (v5 §3). Pour chaque formule et chaque capacité verrouillée côté
// serveur, la réponse est 200 ou 403 EXACTEMENT comme la matrice de lib/plans.ts le dit.
//
// Pourquoi ce test : l'audit v4 avait trouvé quatre endroits qui racontaient quatre histoires
// (landing, /abonnement, verrous, aide). Désormais une seule matrice — et ce test prouve que
// le serveur la respecte, formule par formule. Il lit la matrice lui-même : si Benj change
// une ligne dans lib/plans.ts, le test change d'attente sans qu'on le retouche.
//
// Usage : node --experimental-strip-types scripts/offres-e2e.mjs

import fs from 'node:fs'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { PLANS, peut, GRILLE, OFFRES } from '../lib/plans.ts'
import { FLAGS } from '../lib/flags.ts'
import { verifierSessionTest } from './lib/connexion-test.mjs'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const BASE = process.env.TEST_BASE || 'https://prestiapp.fr'
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const admin = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? `\n     → ${d}` : ''}`) } }

// Les points d'entrée verrouillés, et la capacité qui les ouvre. Aucun n'appelle l'IA.
const VERROUS = [
  { capacite: 'inventaire.stock', methode: 'GET', chemin: '/api/inventaire' },
  { capacite: 'site.domaine_perso', methode: 'POST', chemin: '/api/domain', corps: { domaine: 'exemple-verif-offres.invalid' } },
]

const comptes = []
try {
  console.log('\n── 0. La grille elle-même')
  T('trois offres payantes, dans l’ordre des prix', OFFRES.map((o) => o.id).join(',') === 'essentiel,studio,signature' && OFFRES[0].prix < OFFRES[1].prix && OFFRES[2].prix > OFFRES[1].prix)
  T('les capacités s’empilent (Studio ⊇ Essentiel, Signature ⊇ Studio)',
    PLANS.essentiel.capacites.every((c) => PLANS.studio.capacites.includes(c)) && PLANS.studio.capacites.every((c) => PLANS.signature.capacites.includes(c)))
  T('la plateforme est sur les trois offres', ['essentiel', 'studio', 'signature'].every((p) => peut(p, 'plateforme.conversation')))
  T('la grille publique ne contient aucune ligne sous drapeau BAISSÉ', GRILLE.every((l) => !l.flag || FLAGS[l.flag]), GRILLE.filter((l) => l.flag && !FLAGS[l.flag]).map((l) => l.label).join(', '))
  T('la plateforme est la PREMIÈRE ligne de la grille', GRILLE[0]?.groupe === 'Plateforme', GRILLE[0]?.groupe)

  console.log('\n── 1. Le serveur respecte la matrice, formule par formule')
  for (const plan of ['essentiel', 'studio', 'signature']) {
    const email = `verif-offres-${plan}-${Date.now()}@presti-test.invalid`
    const mdp = crypto.randomBytes(18).toString('base64url')
    const { data: u, error } = await admin.auth.admin.createUser({ email, password: mdp, email_confirm: true })
    if (error) throw new Error('compte de test : ' + error.message)
    comptes.push(u.user.id)
    await admin.from('artisans').insert({ id: u.user.id, email, nom: `Vérif ${plan}`, metier: 'Plombier', slug: `verif-offres-${plan}-${Date.now()}`, plan })
    const pub = createClient(URL, ANON, { auth: { persistSession: false } })
    const { data: s } = await pub.auth.signInWithPassword({ email, password: mdp })
    await verifierSessionTest(s?.session?.access_token)
    const jeton = s?.session?.access_token
    if (!jeton) throw new Error('connexion impossible pour ' + plan)

    for (const v of VERROUS) {
      const attendu = peut(plan, v.capacite) ? 'ouvert' : 'fermé'
      const r = await fetch(BASE + v.chemin, {
        method: v.methode,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jeton}` },
        ...(v.corps ? { body: JSON.stringify(v.corps) } : {}),
      })
      const ferme = r.status === 403
      const bon = attendu === 'fermé' ? ferme : !ferme
      T(`${PLANS[plan].label} · ${v.capacite} → ${attendu}`, bon, `HTTP ${r.status}`)
      if (attendu === 'fermé') {
        const d = await r.json().catch(() => ({}))
        T(`  …et le message dit avec quelle offre`, /Disponible avec l’offre/.test(d.error ?? ''), d.error)
      }
    }
    // Si Signature a réellement posé un domaine de test chez Vercel, on le retire.
    if (plan === 'signature') await fetch(BASE + '/api/domain', { method: 'DELETE', headers: { Authorization: `Bearer ${jeton}` } }).catch(() => {})
  }
} catch (e) {
  ko++; console.log('  ❌ exception :', e.message)
} finally {
  for (const uid of comptes) {
    await admin.from('artisans').delete().eq('id', uid)
    await admin.auth.admin.deleteUser(uid).catch(() => {})
  }
  if (comptes.length) console.log(`\n🧹 ${comptes.length} comptes de test supprimés`)
}

console.log(`\n${ok} réussis, ${ko} échoués\n`)
process.exit(ko ? 1 : 0)
