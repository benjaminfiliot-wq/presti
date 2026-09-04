// Test permanent — la provenance des prix dans un devis RÉELLEMENT généré par l'IA (v4 §8/F4).
//
// Les tests unitaires prouvent que `sourceLigneValide` filtre bien. Celui-ci prouve la
// chose qui compte vraiment : sur un vrai appel au modèle, en production, chaque ligne
// de devis ressort avec une provenance honnête — et le prix que l'artisan a renseigné
// est effectivement repris, au lieu d'une moyenne nationale.
//
// Coûte des crédits IA (un artisan de test fondateur, supprimé ensuite).
// Usage : node scripts/devis-source-e2e.mjs

import fs from 'node:fs'
import crypto from 'node:crypto'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const BASE = process.env.TEST_BASE || 'https://prestiapp.fr'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`) } }

const email = `verif-devis-${Date.now()}@presti-test.invalid`
const motDePasse = crypto.randomBytes(18).toString('base64url')
let uid = null

// Un prix volontairement ATYPIQUE : s'il ressort tel quel, c'est bien celui de l'artisan
// qui a été utilisé, et pas une moyenne du marché qui tomberait par hasard au même endroit.
const PRIX_PROPRE = 813.5

try {
  const { data: u, error } = await sb.auth.admin.createUser({ email, password: motDePasse, email_confirm: true })
  if (error) throw new Error('compte de test : ' + error.message)
  uid = u.user.id
  await sb.from('artisans').insert({
    id: uid, email, nom: 'Vérif Devis', metier: 'Plombier', slug: `verif-devis-${Date.now()}`,
    plan: 'business', is_founder: true, tva_regime: 'reel',
  })
  await sb.from('prix_artisan').insert([
    { artisan_id: uid, designation: 'Chauffe-eau 200 L thermodynamique posé', unite: 'u', prix_ht: PRIX_PROPRE, tva_taux: 5.5, fournisseur: 'Cedeo', reference: 'CED-2001', source: 'import', source_detail: 'tarif.csv', date_prix: '2026-02-12' },
    { artisan_id: uid, designation: 'Dépose et évacuation ancien ballon', unite: 'u', prix_ht: 96, tva_taux: 10, fournisseur: 'Cedeo', reference: 'CED-0009', source: 'import', source_detail: 'tarif.csv', date_prix: '2026-02-12' },
  ])

  const nav = await chromium.launch()
  const page = await (await nav.newContext()).newPage()
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', motDePasse)
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await page.waitForURL(/outils|dashboard|profil/, { timeout: 30000 })

  console.log('\n── Génération d’un devis par l’IA, en production')
  const res = await page.evaluate(async (base) => {
    const jetons = Object.keys(localStorage).filter((k) => k.includes('auth-token'))
    const brut = jetons.length ? JSON.parse(localStorage.getItem(jetons[0])) : null
    const t = brut?.access_token
    const r = await fetch(`${base}/api/devis/generer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ description: "Remplacement d'un chauffe-eau 200 L par un modèle thermodynamique dans une maison de 1995, avec dépose et évacuation de l'ancien ballon." }),
    })
    return { statut: r.status, corps: await r.json().catch(() => null) }
  }, BASE)

  T('la génération aboutit', res.statut === 200, `${res.statut} ${JSON.stringify(res.corps)?.slice(0, 200)}`)
  const lignes = res.corps?.lignes ?? []
  T('des lignes sont produites', lignes.length >= 2, `${lignes.length} lignes`)

  console.log('\n── Chaque ligne porte une provenance, et aucune n’est inventée')
  const AUTORISEES = new Set([
    'estimation',
    'ordre de grandeur du marché',
    'vos tarifs · Cedeo · 12/02/2026',
  ])
  const provenances = lignes.map((l) => l.source_prix)
  T('toutes les lignes ont une provenance', provenances.every((s) => typeof s === 'string' && s.length > 0), JSON.stringify(provenances))
  T('aucune provenance hors de celles réellement transmises',
    provenances.every((s) => AUTORISEES.has(s)), JSON.stringify(provenances.filter((s) => !AUTORISEES.has(s))))
  // Le vrai risque : un nom de grossiste cité pour un prix qui n'en vient pas.
  const grossistes = /point\.?p|rexel|sonepar|legallais|cedeo|batiprix|batichiffrage|brico|leroy/i
  const usurpation = lignes.filter((l) => grossistes.test(l.source_prix || '') && l.source_prix !== 'vos tarifs · Cedeo · 12/02/2026')
  T('aucun nom de fournisseur cité à tort', usurpation.length === 0, JSON.stringify(usurpation.map((l) => l.source_prix)))

  console.log('\n── Le prix de l’artisan est réellement repris')
  const reprises = lignes.filter((l) => l.source_prix === 'vos tarifs · Cedeo · 12/02/2026')
  T('au moins une ligne s’appuie sur ses tarifs', reprises.length >= 1,
    JSON.stringify(lignes.map((l) => [l.designation, l.prix_unitaire_ht, l.source_prix])))
  const auPrix = lignes.some((l) => Math.abs(Number(l.prix_unitaire_ht) - PRIX_PROPRE) < 0.01)
  T(`son prix atypique (${PRIX_PROPRE} €) ressort tel quel`, auPrix,
    JSON.stringify(lignes.map((l) => l.prix_unitaire_ht)))

  await nav.close()
} catch (e) {
  ko++; console.log('  ❌ exception :', e.message)
} finally {
  if (uid) {
    await sb.from('prix_artisan').delete().eq('artisan_id', uid)
    await sb.from('artisans').delete().eq('id', uid)
    await sb.auth.admin.deleteUser(uid)
    console.log('🧹 artisan, tarifs et compte de test supprimés')
  }
}

console.log(`\n${ko === 0 ? '✅' : '❌'} ${ok} réussis, ${ko} échoués\n`)
process.exit(ko === 0 ? 0 : 1)
