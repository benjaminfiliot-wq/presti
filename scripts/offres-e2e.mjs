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
  // 25/10 (Benj) : deux offres vendues ; l'Essentiel n'est plus proposé (identifiant gardé pour les comptes hérités, capacités de l'Essai).
  T('deux offres payantes, dans l’ordre des prix', OFFRES.map((o) => o.id).join(',') === 'studio,signature' && OFFRES[0].prix < OFFRES[1].prix)
  T('les capacités s’empilent (Studio ⊇ Essai, Signature ⊇ Studio)',
    PLANS.gratuit.capacites.every((c) => PLANS.studio.capacites.includes(c)) && PLANS.studio.capacites.every((c) => PLANS.signature.capacites.includes(c)))
  // 15/10 (Benj) : la plateforme commence avec Studio (absente de l'Essai et de l'ancien Essentiel).
  T('la plateforme commence avec Studio : absente de l’Essai et de l’ancien Essentiel, présente en Studio et Signature', !peut('gratuit', 'plateforme.conversation') && !peut('essentiel', 'plateforme.conversation') && peut('studio', 'plateforme.conversation') && peut('signature', 'plateforme.conversation'))
  T('la grille publique ne contient aucune ligne sous drapeau BAISSÉ', GRILLE.every((l) => !l.flag || FLAGS[l.flag]), GRILLE.filter((l) => l.flag && !FLAGS[l.flag]).map((l) => l.label).join(', '))
  // La grille s'ouvre sur le niveau d'automatisation (15/10), et la plateforme est la ligne qui suit.
  T('la plateforme est parmi les premières lignes de la grille (après le niveau d’automatisation)', GRILLE.slice(0, 3).some((l) => l.groupe === 'Plateforme'), GRILLE.slice(0, 3).map((l) => l.groupe).join(','))

  console.log('\n── 1. Le serveur respecte la matrice, formule par formule')
  // L'Essai (sans offre) d'abord : il remplace l'Essentiel, plus vendu, comme compte « sans les capacités verrouillées ».
  for (const plan of ['gratuit', 'studio', 'signature']) {
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
