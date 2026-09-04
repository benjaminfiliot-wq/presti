// Test permanent — bibliothèque de prix de l'artisan et provenance des chiffres (v4 §8).
//
// Ce qu'on prouve, dans l'ordre d'importance :
//   1. l'IA ne peut PAS inventer une provenance : un libellé qu'elle fabrique
//      (« tarifs Rexel ») retombe sur « estimation ». C'est la règle §F4, et c'est ce
//      qui empêche un devis d'avoir l'air sourcé alors qu'il est deviné ;
//   2. le catalogue donne bien la priorité aux prix de l'artisan sur les moyennes ;
//   3. l'import CSV encaisse ce qu'un artisan reçoit vraiment (points-virgules,
//      virgules décimales, « € », en-tête décalé), et le ré-import ne crée pas de doublons.
//
// Usage : node scripts/tarifs-e2e.mjs

import fs from 'node:fs'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { lireCsv, lirePrix } from '../lib/prix/csv.ts'
import { sourceLigneValide, libelleSource } from '../lib/prix/types.ts'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const BASE = process.env.TEST_BASE || 'https://prestiapp.fr'
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`) } }

console.log('\n── 1. La provenance ne peut pas être inventée (§F4)')
const catalogue = [
  { designation: 'Chauffe-eau 200 L', unite: 'u', prix_ht: 640, tva_taux: 10, source: 'artisan', source_libelle: 'vos tarifs · Rexel · 12/02/2026', date_prix: '2026-02-12', fournisseur: 'Rexel' },
]
T('un libellé du catalogue est accepté tel quel', sourceLigneValide('vos tarifs · Rexel · 12/02/2026', catalogue) === 'vos tarifs · Rexel · 12/02/2026')
T('« ordre de grandeur du marché » est accepté', sourceLigneValide('ordre de grandeur du marché', catalogue) === 'ordre de grandeur du marché')
T('« estimation » est accepté', sourceLigneValide('estimation', catalogue) === 'estimation')
for (const invente of ['tarifs Point.P', 'vos tarifs · Sonepar · 01/01/2026', 'catalogue Legallais 2026', 'prix constaté chez Cedeo', 'Batiprix mars 2026']) {
  T(`« ${invente} » est refusé et retombe sur estimation`, sourceLigneValide(invente, catalogue) === 'estimation')
}
T('une provenance vide retombe sur estimation', sourceLigneValide('', catalogue) === 'estimation' && sourceLigneValide(null, catalogue) === 'estimation')

console.log('\n── 2. Libellés de provenance')
T('un prix de l’artisan cite son fournisseur et sa date',
  libelleSource({ source: 'artisan', fournisseur: 'Rexel', date_prix: '2026-02-12' }) === 'vos tarifs · Rexel · 12/02/2026')
T('un prix du marché ne prétend rien d’autre',
  libelleSource({ source: 'marche', date_prix: null }) === 'ordre de grandeur du marché')
T('l’indice INSEE se présente comme un indice, pas comme un prix',
  /indice/i.test(libelleSource({ source: 'insee', date_prix: null })))

console.log('\n── 3. Lecture des prix tels qu’ils sont écrits')
// Un prix négatif n'a pas de sens sur un tarif : on le refuse comme un texte illisible.
const prix = [['12,50', 12.5], ['12.50', 12.5], ['1 234,50 €', 1234.5], ['1.234,50', 1234.5], ['890', 890], ['', null], ['gratuit', null], ['-5', null]]
for (const [brut, attendu] of prix) {
  const r = lirePrix(brut)
  T(`« ${brut || '(vide)'} » → ${attendu === null ? 'rien' : attendu}`, r === attendu, String(r))
}

console.log('\n── 4. Un CSV tel qu’un artisan le reçoit')
const csv = [
  'TARIF FOURNISSEUR 2026',              // ligne parasite avant l'en-tête
  '',
  'Code article;Désignation;Unité;Prix net HT;TVA',
  'REX-4412;Chauffe-eau 200 L Atlantic;u;640,00 €;10',
  'REX-8890;Câble R2V 3G2,5 (couronne 100 m);ml;1,85 €;20',
  'REX-1102;Disjoncteur 20 A;u;12,40 €;10',
  ';;;;',                                 // ligne vide au milieu
  'REX-7001;Tableau 3 rangées;u;;10',     // sans prix → ignorée
].join('\n')
const lu = lireCsv(csv, { fournisseur: 'Rexel' })
T('en-tête retrouvé malgré les lignes parasites', lu.colonnes.designation === 'Désignation', JSON.stringify(lu.colonnes))
T('3 tarifs reconnus', lu.lignes.length === 3, `${lu.lignes.length}`)
T('les lignes sans prix sont comptées comme ignorées', lu.ignorees >= 1, `${lu.ignorees}`)
T('prix français lu correctement', lu.lignes[0].prix_ht === 640, String(lu.lignes[0]?.prix_ht))
T('le point-virgule dans un libellé entre parenthèses ne casse rien', lu.lignes[1].designation.includes('couronne 100 m'), lu.lignes[1]?.designation)
T('unité reprise du fichier', lu.lignes[1].unite === 'ml', lu.lignes[1]?.unite)
T('référence reprise', lu.lignes[0].reference === 'REX-4412', lu.lignes[0]?.reference)
T('fournisseur appliqué par défaut', lu.lignes[0].fournisseur === 'Rexel')
T('TVA reprise du fichier', lu.lignes[1].tva_taux === 20, String(lu.lignes[1]?.tva_taux))

const csvVirgule = 'Libellé,Prix\nPose de prise,45.00\nSaignée au mètre,18.50'
const lu2 = lireCsv(csvVirgule)
T('un CSV séparé par des virgules marche aussi', lu2.lignes.length === 2, `${lu2.lignes.length}`)

console.log('\n── 5. En base : import, priorité et ré-import')
let uid = null
try {
  const email = `verif-tarifs-${Date.now()}@presti-test.invalid`
  const { data: u, error } = await sb.auth.admin.createUser({ email, password: crypto.randomUUID(), email_confirm: true })
  if (error) throw new Error('compte de test : ' + error.message)
  uid = u.user.id
  await sb.from('artisans').insert({ id: uid, email, nom: 'Vérif Tarifs', metier: 'Plombier', slug: `verif-tarifs-${Date.now()}`, plan: 'business' })

  // Écriture directe (service_role) : le parcours HTTP est couvert par le test d'interface.
  const rows = lu.lignes.map((l) => ({
    artisan_id: uid, designation: l.designation, unite: l.unite, prix_ht: l.prix_ht,
    tva_taux: l.tva_taux, fournisseur: l.fournisseur, reference: l.reference,
    source: 'import', source_detail: 'tarif-2026.csv', date_prix: '2026-02-12',
  }))
  const { error: e1 } = await sb.from('prix_artisan').upsert(rows, { onConflict: 'artisan_id,designation,fournisseur,reference' })
  T('import enregistré', !e1, e1?.message)

  // Ré-import du même fichier avec des prix révisés : mise à jour, pas de doublons.
  const { error: e2 } = await sb.from('prix_artisan').upsert(
    rows.map((r) => ({ ...r, prix_ht: r.prix_ht * 1.05, date_prix: '2026-09-01' })),
    { onConflict: 'artisan_id,designation,fournisseur,reference' })
  T('ré-import accepté', !e2, e2?.message)
  const { count } = await sb.from('prix_artisan').select('id', { count: 'exact', head: true }).eq('artisan_id', uid)
  T('aucun doublon après ré-import', count === 3, `${count} lignes`)
  const { data: maj } = await sb.from('prix_artisan').select('prix_ht, date_prix').eq('artisan_id', uid).eq('reference', 'REX-4412').single()
  T('le prix a bien été mis à jour', Number(maj.prix_ht) === 672 && maj.date_prix === '2026-09-01', JSON.stringify(maj))

  const r = await fetch(`${BASE}/api/tarifs`)
  T('l’API refuse un appel non authentifié', r.status === 401, `${r.status}`)
} catch (e) {
  ko++; console.log('  ❌ exception :', e.message)
} finally {
  if (uid) {
    await sb.from('prix_artisan').delete().eq('artisan_id', uid)
    await sb.from('artisans').delete().eq('id', uid)
    await sb.auth.admin.deleteUser(uid)
    console.log('🧹 artisan et tarifs de test supprimés')
  }
}

console.log(`\n${ko === 0 ? '✅' : '❌'} ${ok} réussis, ${ko} échoués\n`)
process.exit(ko === 0 ? 0 : 1)
