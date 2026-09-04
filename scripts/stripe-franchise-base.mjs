// Remet la facturation en cohérence avec le régime RÉEL de l'entreprise : franchise en base de
// TVA (art. 293 B du CGI), comme l'annoncent les mentions légales de prestiapp.fr.
//
// Le problème corrigé : deux immatriculations à la TVA avaient été déclarées dans Stripe, actives
// du jour, alors qu'aucune immatriculation n'existe auprès de l'administration. Stripe aurait
// facturé 20 % à chaque abonnement — une TVA collectée sans y avoir droit, en contradiction avec
// les mentions légales du site. Aucun client n'ayant encore payé, la correction est sans effet
// rétroactif.
//
//   node scripts/stripe-franchise-base.mjs            → état des lieux
//   node scripts/stripe-franchise-base.mjs --appliquer → met fin aux immatriculations
import fs from 'node:fs'
import Stripe from 'stripe'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const cle = process.env.STRIPE_SECRET_KEY
if (!cle) { console.log('❌ STRIPE_SECRET_KEY absente'); process.exit(1) }
const stripe = new Stripe(cle)
const APPLIQUER = process.argv.includes('--appliquer')

// Garde-fou : on ne touche à rien si des paiements existent déjà. Mettre fin à une
// immatriculation alors que de la TVA a été collectée demanderait un traitement comptable,
// pas un script.
const subs = await stripe.subscriptions.list({ limit: 1, status: 'all' })
const factures = await stripe.invoices.list({ limit: 1 })
if (subs.data.length || factures.data.length) {
  console.log('⛔ Des abonnements ou des factures existent déjà. Ne touche pas aux immatriculations sans ton comptable.')
  process.exit(1)
}
console.log('Aucun abonnement, aucune facture : la correction est sans conséquence.\n')

const regs = await stripe.tax.registrations.list({ limit: 20 })
const actives = regs.data.filter((r) => r.status === 'active' || r.status === 'scheduled')
console.log(`${actives.length} immatriculation(s) déclarée(s) dans Stripe :`)
for (const r of actives) {
  console.log(`  ${r.id} · ${r.country} · ${r.status} · depuis le ${new Date(r.active_from * 1000).toISOString().slice(0, 10)}`)
}

if (!APPLIQUER) {
  console.log('\nRelance avec --appliquer pour y mettre fin. Rien n’a été modifié.')
  process.exit(0)
}

for (const r of actives) {
  try {
    // `expires_at: 'now'` clôt l'immatriculation sans effacer l'historique : Stripe garde la
    // trace de la période couverte, ce qui est le comportement correct pour une déclaration.
    await stripe.tax.registrations.update(r.id, { expires_at: 'now' })
    console.log(`  ✅ ${r.id} — close`)
  } catch (e) {
    console.log(`  ❌ ${r.id} — ${String(e.message).slice(0, 160)}`)
  }
}

const apres = await stripe.tax.registrations.list({ limit: 20 })
const restantes = apres.data.filter((r) => r.status === 'active' || r.status === 'scheduled')
console.log(`\nImmatriculations encore actives : ${restantes.length}`)
console.log(restantes.length === 0
  ? '✅ Stripe ne collectera plus de TVA. Le régime déclaré correspond de nouveau aux mentions légales.'
  : '⚠️  Il en reste : termine à la main dans Stripe → Taxes → Immatriculations.')
