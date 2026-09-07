import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { estFondateur, estRefus, reponseRefus } from '@/lib/direction/garde'
import { sourcer, type Sourcee } from '@/lib/direction/fraicheur'
import { stripe } from '@/lib/stripe'
import { planConf } from '@/lib/plans'
import { verdict, preuveLisible, libelleStatut, type Statut } from '@/lib/direction/apports'
import { actif } from '@/lib/flags'
import { pauseLisible } from '@/lib/direction/stripe-actions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/direction/clients/<id> — la fiche d'un artisan (prompt v10 §2.2).
//
// Ce qu'elle montre : son compte, son abonnement Stripe LU EN DIRECT (jamais une copie en base), sa chronologie
// (inscription, actions de direction le concernant, suspensions), son canal d'arrivée.
// Ce qu'elle ne montre pas, et ne montrera pas : le contenu de ses conversations, de ses devis, de ses factures.
// Le §1 est clair — les données de l'artisan restent les siennes. On compte, on ne lit pas.
type Abonnement = { statut: string; offre: string | null; montant: number | null; periode_fin: string | null; annulation_prevue: boolean; moyen: string | null; pause: string | null }

const abonnementStripe = (id: string | null): Promise<Sourcee<Abonnement | null>> => sourcer(`client:abo:${id ?? '-'}`, 'stripe', async () => {
  if (!id) return null
  if (!stripe) throw new Error('Stripe n’est pas configuré.')
  const s = await stripe.subscriptions.retrieve(id, { expand: ['default_payment_method'] }, { timeout: 6000, maxNetworkRetries: 0 })
  const item = s.items.data[0]
  const carte = (s.default_payment_method && typeof s.default_payment_method === 'object' && 'card' in s.default_payment_method)
    ? (s.default_payment_method.card as { brand?: string; last4?: string } | null) : null
  const fin = (s as unknown as { current_period_end?: number }).current_period_end
  return {
    statut: s.status,
    offre: String(s.metadata?.plan ?? item?.price?.nickname ?? ''),
    montant: item?.price?.unit_amount != null ? item.price.unit_amount / 100 : null,
    periode_fin: fin ? new Date(fin * 1000).toISOString() : null,
    annulation_prevue: !!s.cancel_at_period_end,
    // La carte n'est jamais lue par Presti : Stripe en rend une description, quatre chiffres et une marque.
    moyen: carte ? `${carte.brand ?? 'carte'} •••• ${carte.last4 ?? '????'}` : null,
    // Une facturation en pause n'apparaît nulle part dans le statut Stripe (il reste « active ») :
    // sans cette ligne, la direction croirait prélever alors qu'elle ne prélève rien.
    pause: pauseLisible(s),
  }
}, 30_000)

/** La dernière facture payée : montant encaissé, déjà rendu, reste. Sans elle, la fiche proposait de
 *  rembourser « la totalité » sans jamais dire combien d'argent partait (revue du 07/09). */
const derniereFacture = (client: string | null): Promise<Sourcee<{ montant: number; rendu: number; restant: number; date: string } | null>> =>
  sourcer(`client:facture:${client ?? '-'}`, 'stripe', async () => {
    if (!client || !stripe) return null
    const l = await stripe.invoices.list({ customer: client, status: 'paid', limit: 1, expand: ['data.payments'] }, { timeout: 6000, maxNetworkRetries: 0 })
    const f = l.data[0]
    if (!f) return null
    const paiement = f.payments?.data?.[0]?.payment?.payment_intent
    const intention = typeof paiement === 'string' ? paiement : undefined
    const rendu = intention
      ? (await stripe.refunds.list({ payment_intent: intention, limit: 100 }, { timeout: 6000, maxNetworkRetries: 0 })).data
          .filter((r) => r.status !== 'failed' && r.status !== 'canceled').reduce((n, r) => n + (r.amount ?? 0), 0) / 100
      : 0
    const montant = (f.amount_paid ?? 0) / 100
    return { montant, rendu, restant: Math.max(0, montant - rendu), date: new Date((f.created ?? 0) * 1000).toISOString() }
  }, 30_000)

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const f = await estFondateur(req)
  if (estRefus(f)) return reponseRefus(f)
  const { id } = await ctx.params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Artisan inconnu.' }, { status: 404 })

  const { data: a, error } = await supabaseAdmin.from('artisans')
    .select('id, nom, email, metier, tel, plan, credits, credits_reset_le, stripe_customer_id, stripe_subscription_id, created_at, suppression_demandee_le, slug, is_founder')
    .eq('id', id).maybeSingle()
  if (error) return NextResponse.json({ error: 'Fiche indisponible pour l’instant.' }, { status: 503 })
  if (!a) return NextResponse.json({ error: 'Artisan inconnu.' }, { status: 404 })

  const [abo, { data: suspensions }, { data: journal }, leads, devis, factures, facture] = await Promise.all([
    abonnementStripe(a.stripe_subscription_id),
    supabaseAdmin.from('suspensions').select('id, motif, message, suspendu_le, levee_le, levee_motif').eq('artisan_id', id).order('suspendu_le', { ascending: false }).limit(10),
    supabaseAdmin.from('journal_direction').select('id, action, acteur_email, avant, apres, cree_le').eq('artisan_id', id).order('cree_le', { ascending: false }).limit(30),
    // On COMPTE, on ne lit pas : ni nom de prospect, ni message, ni montant de devis.
    supabaseAdmin.from('leads').select('id', { count: 'exact', head: true }).eq('artisan_id', id),
    supabaseAdmin.from('devis').select('id', { count: 'exact', head: true }).eq('artisan_id', id),
    supabaseAdmin.from('factures').select('id', { count: 'exact', head: true }).eq('artisan_id', id).then((r) => ({ count: r.count ?? 0, error: r.error }), (e) => ({ count: 0, error: e as { message: string } })),
    derniereFacture(a.stripe_customer_id),
  ])
  // Un comptage raté vaut « — », jamais « 0 » : un zéro affirme que l'artisan n'a rien fait.
  const erreurUsage = [leads.error, devis.error, factures.error].find(Boolean)

  const apport = actif('apports')
    ? (await supabaseAdmin.from('registre_apports').select('id, statut, preuve, piece, motif, apporteur_id').eq('artisan_id', id).maybeSingle()).data
    : null
  const apporteur = apport ? (await supabaseAdmin.from('apporteurs').select('code, nom').eq('id', apport.apporteur_id).maybeSingle()).data : null
  const v = apport ? verdict(apport as { statut: Statut; piece: string | null; motif: string | null }) : null
  const enCours = (suspensions ?? []).find((s) => !s.levee_le) ?? null

  return NextResponse.json({
    artisan: {
      id: a.id, nom: a.nom, email: a.email, metier: a.metier, tel: a.tel, slug: a.slug,
      plan: a.plan, offre: planConf(a.plan).label, credits: a.credits, credits_reset_le: a.credits_reset_le,
      inscrit_le: a.created_at, suppression_demandee_le: a.suppression_demandee_le, fondateur: a.is_founder,
      client_stripe: !!a.stripe_customer_id,
    },
    abonnement: abo,
    suspension: enCours ? { motif: enCours.motif, message: enCours.message, depuis: enCours.suspendu_le } : null,
    historique_suspensions: suspensions ?? [],
    usage: { leads: leads.count ?? 0, devis: devis.count ?? 0, factures: factures.count ?? 0, ...(erreurUsage ? { erreur: 'base injoignable' } : {}) },
    derniereFacture: facture.valeur,
    apport: apport && v ? { statut: apport.statut, statutLisible: libelleStatut(apport.statut as Statut), preuve: preuveLisible(apport as never), compte: v.compte, taux: v.taux, raison: v.raison, apporteur: apporteur?.nom ?? null } : null,
    journal: journal ?? [],
    role: f.role, a: new Date().toISOString(),
  })
}
