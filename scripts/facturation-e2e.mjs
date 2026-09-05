// Test permanent — conformité de facturation (v4 §10).
//
// Ce qu'on prouve :
//   1. la mention de franchise n'est PAS figée : elle suit la date et le choix de
//      l'artisan (recodification CGI → CIBS au 01/09/2026, tolérance au 31/12/2027) ;
//   2. le SIREN du client est réellement vérifié (clé de Luhn), pas juste compté ;
//   3. une facture ÉMISE est scellée : ni ses montants, ni son numéro, ni son client ne
//      peuvent changer, et elle ne peut pas être supprimée. Le verrou est en BASE, donc
//      il tient même si un jour du code oublie de le vérifier.
//
// Usage : node scripts/facturation-e2e.mjs

import fs from 'node:fs'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import {
  mentionFranchise, sirenValide, basesParTaux, empreinte,
  toleranceCgiEncoreValable, codeExonerationParDefaut, MOTIFS_EXONERATION,
} from '../lib/facturation.ts'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`) } }

console.log('\n── 1. La mention de franchise suit la loi, pas une constante')
const avant = new Date('2026-01-15')
const apres = new Date('2026-10-01')
const bienApres = new Date('2028-03-01')
T('avant le 01/09/2026, « auto » cite le CGI', /293 B du CGI/.test(mentionFranchise('auto', avant)), mentionFranchise('auto', avant))
T('pendant la tolérance, « auto » cite encore le CGI — la même référence que Presti sur ses propres documents', /293 B du CGI/.test(mentionFranchise('auto', apres)), mentionFranchise('auto', apres))
T('passé la tolérance, « auto » bascule sur le CIBS', /CIBS/.test(mentionFranchise('auto', bienApres)), mentionFranchise('auto', bienApres))
T('un artisan peut garder le CGI pendant la tolérance', /293 B du CGI/.test(mentionFranchise('cgi', apres)))
T('passé la tolérance, le CGI n’est plus servi même sur demande', /CIBS/.test(mentionFranchise('cgi', bienApres)), mentionFranchise('cgi', bienApres))
T('« cibs » force la nouvelle référence à toute date', /CIBS/.test(mentionFranchise('cibs', avant)))
T('la tolérance est bien ouverte aujourd’hui', toleranceCgiEncoreValable(new Date('2027-06-01')) === true)
T('et fermée en 2028', toleranceCgiEncoreValable(bienApres) === false)

console.log('\n── 2. SIREN : la clé est vérifiée, pas seulement la longueur')
T('SIREN valide accepté (Danone, 552032534)', sirenValide('552032534'))
T('SIRET valide accepté (14 chiffres)', sirenValide('55203253400646'))
T('les espaces ne gênent pas', sirenValide('552 032 534'))
T('un chiffre modifié est refusé', !sirenValide('552032535'))
T('9 chiffres au hasard sont refusés', !sirenValide('123456789'))
T('trop court : refusé', !sirenValide('5520325'))
T('vide : refusé', !sirenValide('') && !sirenValide(null))
T('La Poste, seule exception connue, est acceptée', sirenValide('356000000'))

console.log('\n── 3. Bases HT par taux (exigées par EN 16931)')
const lignes = [
  { quantite: 2, prix_unitaire_ht: 100, tva_taux: 10 },
  { quantite: 1, prix_unitaire_ht: 50, tva_taux: 10 },
  { quantite: 3, prix_unitaire_ht: 20, tva_taux: 20 },
  { quantite: 1, prix_unitaire_ht: 80, tva_taux: 5.5 },
]
const bases = basesParTaux(lignes)
T('un bloc par taux, dans l’ordre', bases.map((b) => b.taux).join(',') === '5.5,10,20', JSON.stringify(bases.map((b) => b.taux)))
T('base 10 % = 250 €', bases.find((b) => b.taux === 10).base_ht === 250, JSON.stringify(bases))
T('TVA 10 % = 25 €', bases.find((b) => b.taux === 10).tva === 25)
T('TVA 5,5 % arrondie au centime', bases.find((b) => b.taux === 5.5).tva === 4.4, String(bases.find((b) => b.taux === 5.5)?.tva))
const remisees = basesParTaux(lignes, 10)
T('la remise s’applique à chaque base', remisees.find((b) => b.taux === 10).base_ht === 225, JSON.stringify(remisees))

console.log('\n── 4. Motifs d’exonération codifiés')
T('la franchise a un code par défaut', codeExonerationParDefaut('franchise') === 'VATEX-FR-FRANCHISE')
T('un assujetti n’en a pas', codeExonerationParDefaut('reel') === null)
T('tous les motifs ont un code et une mention', MOTIFS_EXONERATION.every((m) => m.code && m.label && m.mention))

console.log('\n── 5. Empreinte')
const e1 = await empreinte('facture A')
const e2 = await empreinte('facture A')
const e3 = await empreinte('facture B')
T('même contenu, même empreinte', e1 === e2)
T('contenu différent, empreinte différente', e1 !== e3)
T('64 caractères hexadécimaux (SHA-256)', /^[0-9a-f]{64}$/.test(e1), e1)

console.log('\n── 6. Une facture émise est scellée — verrou en BASE')
let uid = null
try {
  const email = `verif-fact-${Date.now()}@presti-test.invalid`
  const { data: u, error } = await sb.auth.admin.createUser({ email, password: crypto.randomUUID(), email_confirm: true })
  if (error) throw new Error('compte de test : ' + error.message)
  uid = u.user.id
  await sb.from('artisans').insert({ id: uid, email, nom: 'Vérif Facture', metier: 'Plombier', slug: `verif-fact-${Date.now()}`, plan: 'studio' })

  const { data: f, error: ef } = await sb.from('factures').insert({
    artisan_id: uid, numero: 'FAC-2026-0001', statut: 'emise', objet: 'Test',
    client_nom: 'Client Test', client_siren: '552032534',
    total_ht: 1000, total_tva: 100, total_ttc: 1100,
    date_emission: new Date().toISOString().slice(0, 10),
  }).select('id').single()
  if (ef) throw new Error('création facture : ' + ef.message)

  // Tant qu'elle n'est pas scellée, on peut encore corriger : c'est voulu (brouillon).
  const { error: eLibre } = await sb.from('factures').update({ total_ht: 1200 }).eq('id', f.id)
  T('avant scellement, la correction reste possible', !eLibre, eLibre?.message)

  await sb.from('factures').update({ verrouillee: true, emise_le: new Date().toISOString(), empreinte: await empreinte('x') }).eq('id', f.id)

  const { error: eMontant } = await sb.from('factures').update({ total_ht: 9999 }).eq('id', f.id)
  T('après scellement, le montant est refusé', !!eMontant, 'la modification a été acceptée !')
  const { error: eNumero } = await sb.from('factures').update({ numero: 'FAC-2026-9999' }).eq('id', f.id)
  T('le numéro est refusé', !!eNumero)
  const { error: eClient } = await sb.from('factures').update({ client_nom: 'Quelqu’un d’autre' }).eq('id', f.id)
  T('le client est refusé', !!eClient)
  const { error: eSiren } = await sb.from('factures').update({ client_siren: '111111111' }).eq('id', f.id)
  T('le SIREN est refusé', !!eSiren)

  // Ce qui doit RESTER modifiable : l'état de règlement, et les notes.
  const { error: eStatut } = await sb.from('factures').update({ statut: 'payee' }).eq('id', f.id)
  T('le passage à « payée » reste possible', !eStatut, eStatut?.message)

  const { error: eSuppr } = await sb.from('factures').delete().eq('id', f.id)
  T('la suppression est refusée (conservation 10 ans)', !!eSuppr, 'la facture a été supprimée !')
  const { count } = await sb.from('factures').select('id', { count: 'exact', head: true }).eq('id', f.id)
  T('elle est toujours là', count === 1, `${count}`)

  // Nettoyage : on lève le verrou côté service_role pour pouvoir retirer la pièce de test.
  await sb.from('factures').update({ verrouillee: false }).eq('id', f.id)
  await sb.from('factures').delete().eq('id', f.id)
} catch (e) {
  ko++; console.log('  ❌ exception :', e.message)
} finally {
  if (uid) {
    await sb.from('artisans').delete().eq('id', uid)
    await sb.auth.admin.deleteUser(uid)
    console.log('🧹 artisan de test supprimé')
  }
}

console.log(`\n${ko === 0 ? '✅' : '❌'} ${ok} réussis, ${ko} échoués\n`)
process.exit(ko === 0 ? 0 : 1)
