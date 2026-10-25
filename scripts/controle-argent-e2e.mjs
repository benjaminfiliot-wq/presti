// Les gestes du Centre de direction qui touchent à l'ARGENT (prompt v10 §2.2), éprouvés en mode TEST.
//
// Pourquoi une suite à part : ces trois gestes-là — changer d'offre, rembourser, mettre en pause — écrivent
// chez Stripe. On ne les prouve donc pas en production, où la clé est réelle : on les prouve ici, contre de
// vrais objets Stripe de test, avec de vraies cartes de test, et un vrai remboursement de fausse monnaie.
// Le chemin d'accès (garde, re-confirmation, journal) est prouvé ailleurs, en production, par
// controle-e2e.mjs. Les deux moitiés se rejoignent : la logique est éprouvée là où elle est sûre, l'accès
// là où il est réel.
//
// Ce que la suite vérifie :
//   1. le prix nommé d'une offre est créé une fois, puis retrouvé (pas un produit jetable par changement) ;
//   2. un changement d'offre remplace bien l'article, facture le prorata, et REFUSE de refaire le même ;
//   3. deux appels avec la même clé d'idempotence ne changent l'offre qu'une fois ;
//   4. l'alignement en base : une montée complète les crédits, une descente ne RETIRE rien ;
//   5. un remboursement respecte ses bornes — pas plus que ce qui reste encaissé, motif obligatoire,
//      deux clics identiques ne rendent l'argent qu'une fois ;
//   6. la pause : refusée deux fois de suite, refusée au-delà de trois mois, reprise proprement ;
//   7. la trace : un abonnement en pause se LIT sur la fiche (statut Stripe seul, il resterait « actif »).
//
// PRÉREQUIS (.env.local, jamais affichés) :
//   STRIPE_SECRET_KEY_TEST     clé de TEST (sk_test_… / rk_test_…). Une clé réelle est REFUSÉE, sans option
//                              pour passer outre : ici on rembourse pour de vrai, on ne joue pas avec ça.
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (pour la moitié « alignement en base »)
//
// Usage : node --import ./scripts/ts-loader.mjs scripts/controle-argent-e2e.mjs
// Syntaxe : node --check scripts/controle-argent-e2e.mjs
// Purge de secours : node scripts/purger-comptes-test.mjs

import fs from 'node:fs'
import crypto from 'node:crypto'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { PLANS } from '../lib/plans.ts'
import { prixOffre, changerOffre, rembourser, mettreEnPause, reprendre, pauseLisible } from '../lib/direction/stripe-actions.ts'

for (const f of ['.env.local']) {
  if (!fs.existsSync(f)) continue
  for (const l of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}

const CLE = process.env.STRIPE_SECRET_KEY_TEST
const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY

// Garde-fou sans échappatoire : cette suite crée des remboursements. Une clé réelle est refusée, point.
if (!CLE || !/^(sk|rk)_test_/.test(CLE)) {
  console.log('\n⛔ STRIPE_SECRET_KEY_TEST doit être une clé de TEST (sk_test_… ou rk_test_…).')
  console.log('   Cette suite rembourse réellement : aucune option ne permet de la lancer sur une clé réelle.')
  console.log('\nRien n’a été créé.\n')
  process.exit(2)
}

const s = new Stripe(CLE)
const admin = URL_SB && SERVICE ? createClient(URL_SB, SERVICE, { auth: { persistSession: false } }) : null

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? `\n     → ${d}` : ''}`) } }
const SAUT = (n, why) => console.log(`  ⏭  ${n} — ${why}`)
const clef = () => `e2e-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`

const aNettoyer = { clients: [], comptes: [], utilisateurs: [] }
const cents = (p) => Math.round(PLANS[p].prixMois * 100)

/** Un client de test avec une carte qui marche, un abonnement Studio, et sa première facture payée.
 *  (25/10 : l'Essentiel n'est plus vendu, prixOffre/changerOffre ne connaissent que Studio et Signature.) */
async function abonneDeTest(nom) {
  const c = await s.customers.create({ name: nom, email: `${nom}-${Date.now()}@presti-test.invalid` })
  aNettoyer.clients.push(c.id)
  const pm = await s.paymentMethods.attach('pm_card_visa', { customer: c.id })
  await s.customers.update(c.id, { invoice_settings: { default_payment_method: pm.id } })
  const prix = await prixOffre(s, 'studio')
  const sub = await s.subscriptions.create({
    customer: c.id, items: [{ price: prix }],
    metadata: { plan: 'studio', uid: 'e2e' },
    payment_behavior: 'error_if_incomplete',
  })
  return { client: c.id, sub }
}

async function main() {
  console.log('\n══ Gestes d’argent du Centre de direction — mode TEST Stripe ══\n')
  console.log(`  Clé : ${CLE.slice(0, 12)}… (test) · aucun euro réel ne bouge.\n`)

  // ── 1. Le prix nommé ────────────────────────────────────────────────────────────────────────────────
  console.log('1. Le prix d’une offre est nommé, et créé une seule fois')
  const p1 = await prixOffre(s, 'studio')
  const p2 = await prixOffre(s, 'studio')
  T('deux demandes du prix Studio rendent le MÊME prix', p1 === p2, `${p1} vs ${p2}`)
  const objet = await s.prices.retrieve(p1)
  T('le prix Studio vaut ce que dit la matrice', objet.unit_amount === cents('studio'), `${objet.unit_amount} ≠ ${cents('studio')}`)
  T('il porte une clé de recherche lisible', objet.lookup_key === 'presti_studio_mensuel', String(objet.lookup_key))
  T('il est mensuel et en euros', objet.recurring?.interval === 'month' && objet.currency === 'eur')

  // ── 2. Changer d'offre ──────────────────────────────────────────────────────────────────────────────
  console.log('\n2. Changer d’offre : l’article est remplacé, le prorata est facturé')
  const A = await abonneDeTest('presti-e2e-offre')
  T('l’abonné de test part bien sur Studio', A.sub.items.data[0].price.unit_amount === cents('studio'))

  const k = clef()
  const monte = await changerOffre(s, A.sub.id, 'signature', k)
  T('la montée en Signature est acceptée', monte.ok, monte.ok ? '' : monte.message)
  if (monte.ok) {
    T('l’abonnement facture désormais le tarif Signature', monte.valeur.sub.items.data[0].price.unit_amount === cents('signature'))
    T('un seul article sur l’abonnement (pas d’empilement)', monte.valeur.sub.items.data.length === 1, `${monte.valeur.sub.items.data.length} articles`)
    T('la métadonnée de plan suit', monte.valeur.sub.metadata?.plan === 'signature', String(monte.valeur.sub.metadata?.plan))
    T('le prorata est annoncé avant d’écrire', monte.valeur.prorata !== null && monte.valeur.prorata > 0, `prorata = ${monte.valeur.prorata}`)
  }

  const redite = await changerOffre(s, A.sub.id, 'signature', clef())
  T('repasser sur l’offre déjà en cours est REFUSÉ', !redite.ok && redite.code === 'deja', redite.ok ? 'accepté' : redite.message)

  // Idempotence : la même clé, deux fois, ne doit pas empiler deux changements facturés (ici la descente vers Studio).
  const kIdem = clef()
  const d1 = await changerOffre(s, A.sub.id, 'studio', kIdem)
  const d2 = await changerOffre(s, A.sub.id, 'studio', kIdem)
  T('premier retour en Studio accepté', d1.ok, d1.ok ? '' : d1.message)
  T('le second, même clé, ne refacture rien (refusé « déjà »)', !d2.ok && d2.code === 'deja', d2.ok ? 'accepté deux fois' : d2.message)
  const apresStudio = await s.subscriptions.retrieve(A.sub.id)
  T('l’abonnement est sur Studio, une seule fois', apresStudio.items.data.length === 1 && apresStudio.items.data[0].price.unit_amount === cents('studio'))

  // La partie 3 éprouve une MONTÉE alignée en base : l'abonnement repart sur Signature.
  const remonte = await changerOffre(s, A.sub.id, 'signature', clef())
  T('nouvelle montée en Signature acceptée (pour l’alignement en base)', remonte.ok, remonte.ok ? '' : remonte.message)

  const inconnue = await changerOffre(s, A.sub.id, 'business', clef())
  T('une offre hors matrice est refusée', !inconnue.ok, inconnue.ok ? 'acceptée' : '')

  // ── 3. L'alignement en base ─────────────────────────────────────────────────────────────────────────
  console.log('\n3. La base suit ce que Stripe facture (le trou du portail, revue du 07/09)')
  await alignement()
  async function alignement() {
  if (!admin) return SAUT('alignement en base', 'Supabase non configuré dans .env.local')
    const { alignerSurAbonnement, planDepuisMontant } = await import('../lib/abonnementSync.ts')
    T('un montant de la matrice désigne son offre', planDepuisMontant(cents('studio')) === 'studio', String(planDepuisMontant(cents('studio'))))
    T('un montant inconnu ne désigne rien (pas de repli hasardeux)', planDepuisMontant(1234) === null)
    T('un montant absent ne désigne rien', planDepuisMontant(null) === null)

    // `artisans.id` référence l'utilisateur GoTrue : on crée donc le compte avant la fiche.
    const emailTest = `argent-${Date.now()}@presti-test.invalid`
    const { data: u, error: eUser } = await admin.auth.admin.createUser({ email: emailTest, password: crypto.randomBytes(18).toString('base64url'), email_confirm: true })
    const uid = u?.user?.id
    if (eUser || !uid) return SAUT('alignement en base', `compte de test refusé : ${eUser?.message ?? 'sans identifiant'}`)
    const { error: eIns } = await admin.from('artisans').insert({
      id: uid, email: emailTest, nom: 'Argent E2E', metier: 'Plombier',
      slug: `argent-e2e-${Date.now()}`, plan: 'studio', credits: 12,
      stripe_customer_id: A.client, stripe_subscription_id: A.sub.id,
    })
    if (eIns) { aNettoyer.utilisateurs.push(uid); return SAUT('alignement en base', `insertion refusée : ${eIns.message}`) }
      aNettoyer.comptes.push(uid); aNettoyer.utilisateurs.push(uid)
      const sub = await s.subscriptions.retrieve(A.sub.id)
      const r = await alignerSurAbonnement({ ...sub, metadata: { ...sub.metadata, uid } })
      T('la montée est appliquée en base', r.applique && r.plan === 'signature', r.raison)
      const apres = (await admin.from('artisans').select('plan, credits').eq('id', uid).single()).data
      T('le plan en base est celui que Stripe facture', apres?.plan === 'signature', String(apres?.plan))
      // La montée sert la DIFFÉRENCE des forfaits, pas le forfait entier : l'artisan avait 12 crédits
      // sur Studio (250), il en avait donc consommé 238 ; en Signature (600) il doit en avoir 362,
      // pas 600. Servir le forfait entier était le bug trouvé par la revue du 07/09 — un aller-retour
      // d'offre donnait alors des crédits sans fin pour un prorata net nul.
      const attendus = 12 + (PLANS.signature.creditsMois - PLANS.studio.creditsMois)
      T('la montée sert la différence des forfaits, jamais le forfait entier', apres?.credits === attendus, `${apres?.credits} au lieu de ${attendus}`)

      // Descente : on ne retire RIEN de ce qui reste du mois.
      await admin.from('artisans').update({ credits: 40 }).eq('id', uid)
      const bas = await changerOffre(s, A.sub.id, 'studio', clef())
      T('la descente vers Studio est acceptée chez Stripe', bas.ok, bas.ok ? '' : bas.message)
      if (bas.ok) {
        const r2 = await alignerSurAbonnement({ ...bas.valeur.sub, metadata: { ...bas.valeur.sub.metadata, uid } })
        const apres2 = (await admin.from('artisans').select('plan, credits').eq('id', uid).single()).data
        T('le plan redescend en base', apres2?.plan === 'studio', `${apres2?.plan} — ${r2.raison}`)
        T('aucun crédit n’est REPRIS à la descente', apres2?.credits === 40, `${apres2?.credits} au lieu de 40`)
      }

      // Un abonnement résilié ne redescend pas le plan ici : c'est `deleted` qui tranche.
      const rAnnule = await alignerSurAbonnement({ ...(await s.subscriptions.retrieve(A.sub.id)), status: 'canceled', metadata: { uid } })
      T('un abonnement résilié ne touche pas au plan ici', !rAnnule.applique && /canceled/.test(rAnnule.raison), rAnnule.raison)
      T('un abonnement sans artisan connu ne casse rien', !(await alignerSurAbonnement({ ...(await s.subscriptions.retrieve(A.sub.id)), metadata: {}, customer: 'cus_inexistant_e2e' })).applique)
  }

  // ── 4. Rembourser ───────────────────────────────────────────────────────────────────────────────────
  console.log('\n4. Rembourser : bornes tenues, argent rendu une seule fois')
  const B = await abonneDeTest('presti-e2e-remb')
  const facture = (await s.invoices.list({ customer: B.client, status: 'paid', limit: 1 })).data[0]
  const paye = (facture?.amount_paid ?? 0) / 100
  T('la première facture de l’abonné est payée', paye === PLANS.studio.prixMois, `${paye} € au lieu de ${PLANS.studio.prixMois} €`)

  T('sans motif, c’est refusé', !(await rembourser(s, B.client, 5, '   ', clef())).ok)
  const trop = await rembourser(s, B.client, paye + 10, 'test dépassement', clef())
  T('au-delà de ce qui a été encaissé, c’est refusé', !trop.ok && trop.code === 'plafond', trop.ok ? 'accepté' : trop.message)
  T('un montant négatif est refusé', !(await rembourser(s, B.client, -5, 'test négatif', clef())).ok)

  const kR = clef()
  const partiel = await rembourser(s, B.client, 10, 'geste commercial e2e', kR)
  T('un remboursement partiel passe', partiel.ok, partiel.ok ? '' : partiel.message)
  if (partiel.ok) {
    T('Stripe a bien rendu 10 €', partiel.valeur.refund.amount === 1000, String(partiel.valeur.refund.amount))
    T('le motif est attaché au remboursement chez Stripe', partiel.valeur.refund.metadata?.motif === 'geste commercial e2e')
    T('l’origine « direction » est tracée chez Stripe', partiel.valeur.refund.metadata?.origine === 'direction')
    const bis = await rembourser(s, B.client, 10, 'geste commercial e2e', kR)
    T('deux clics identiques ne rendent l’argent qu’une fois', bis.ok && bis.valeur.refund.id === partiel.valeur.refund.id, bis.ok ? `${bis.valeur.refund.id} ≠ ${partiel.valeur.refund.id}` : bis.message)
    const total = (await s.refunds.list({ payment_intent: partiel.valeur.refund.payment_intent, limit: 10 })).data
      .reduce((n, r) => n + r.amount, 0)
    T('un seul remboursement existe chez Stripe', total === 1000, `${total} centimes rendus au total`)
  }

  const C = await s.customers.create({ name: 'presti-e2e-sans-facture' })
  aNettoyer.clients.push(C.id)
  const rien = await rembourser(s, C.id, null, 'rien à rendre', clef())
  T('un client sans facture payée : refus explicite', !rien.ok && rien.code === 'rien', rien.ok ? 'accepté' : rien.message)

  // ── 5. Pause et reprise ─────────────────────────────────────────────────────────────────────────────
  console.log('\n5. La pause : on ne prélève plus, l’accès continue')
  const D = await abonneDeTest('presti-e2e-pause')
  const dans30 = new Date(Date.now() + 30 * 86_400_000)
  const pause = await mettreEnPause(s, D.sub.id, dans30, clef())
  T('la mise en pause est acceptée', pause.ok, pause.ok ? '' : pause.message)
  if (pause.ok) {
    T('Stripe n’encaissera plus (comportement « void »)', pause.valeur.pause_collection?.behavior === 'void')
    T('la reprise est datée', !!pause.valeur.pause_collection?.resumes_at)
    T('le statut Stripe reste « active » — d’où la ligne dédiée sur la fiche', pause.valeur.status === 'active', pause.valeur.status)
    T('la fiche sait le dire en français', /en pause jusqu’au/.test(pauseLisible(pause.valeur) ?? ''), String(pauseLisible(pause.valeur)))
  }
  T('mettre en pause deux fois est refusé', !(await mettreEnPause(s, D.sub.id, dans30, clef())).ok)

  const E = await abonneDeTest('presti-e2e-pause-longue')
  const dans200 = new Date(Date.now() + 200 * 86_400_000)
  const tropLongue = await mettreEnPause(s, E.sub.id, dans200, clef())
  T('au-delà de trois mois, c’est une résiliation : refusé', !tropLongue.ok && tropLongue.code === 'plafond', tropLongue.ok ? 'accepté' : tropLongue.message)
  T('une reprise dans le passé est refusée', !(await mettreEnPause(s, E.sub.id, new Date(Date.now() - 86_400_000), clef())).ok)
  T('reprendre un abonnement qui n’est pas en pause est refusé', !(await reprendre(s, E.sub.id, clef())).ok)

  const repris = await reprendre(s, D.sub.id, clef())
  T('la reprise passe', repris.ok, repris.ok ? '' : repris.message)
  if (repris.ok) {
    T('plus aucune pause sur l’abonnement', !repris.valeur.pause_collection)
    T('la fiche n’annonce plus de pause', pauseLisible(repris.valeur) === null)
  }

  // ── Ménage ──────────────────────────────────────────────────────────────────────────────────────────
  console.log('\n6. Ménage : rien ne reste derrière')
  let nettoyes = 0
  for (const c of aNettoyer.clients) { try { await s.customers.del(c); nettoyes++ } catch (e) { console.log(`  ⚠️  client ${c} : ${e.message}`) } }
  T('les clients Stripe de test sont supprimés (abonnements compris)', nettoyes === aNettoyer.clients.length, `${nettoyes}/${aNettoyer.clients.length}`)
  if (admin && aNettoyer.comptes.length) {
    const { error } = await admin.from('artisans').delete().in('id', aNettoyer.comptes)
    T('les artisans de test sont supprimés de la base', !error, error?.message ?? '')
  }
  if (admin && aNettoyer.utilisateurs.length) {
    let effaces = 0
    for (const u of aNettoyer.utilisateurs) { const { error } = await admin.auth.admin.deleteUser(u); if (!error) effaces++ }
    T('les comptes de connexion de test sont supprimés', effaces === aNettoyer.utilisateurs.length, `${effaces}/${aNettoyer.utilisateurs.length}`)
  }

  console.log(`\n══ ${ok} vérifications passées, ${ko} en échec ══\n`)
  process.exit(ko === 0 ? 0 : 1)
}

main().catch(async (e) => {
  console.error('\n💥 La suite s’est arrêtée :', e?.message ?? e)
  for (const c of aNettoyer.clients) await s.customers.del(c).catch(() => {})
  if (admin && aNettoyer.comptes.length) await admin.from('artisans').delete().in('id', aNettoyer.comptes)
  if (admin) for (const u of aNettoyer.utilisateurs) await admin.auth.admin.deleteUser(u).catch(() => {})
  console.error('   (le ménage a quand même été fait)\n')
  process.exit(1)
})
