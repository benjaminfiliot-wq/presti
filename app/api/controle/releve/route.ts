import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { estFondateur, estRefus, reponseRefus, exigerDomaine, domaineRefuse } from '@/lib/direction/garde'
import { exigerReconfirmation } from '@/lib/direction/reconfirmation'
import { journaliser, refusJournal } from '@/lib/direction/journal'
import { calculerReleve, bornesDuMois, type LigneClient } from '@/lib/controle/releve'
import { verdict, type Statut } from '@/lib/direction/apports'
import { stripe } from '@/lib/stripe'
import { actif } from '@/lib/flags'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Le relevé mensuel du partenaire (contrat art. 4.2 — prompt v11 §3).
//
//   GET  ?mois=AAAA-MM  → le relevé du mois, recalculé s'il est en brouillon, RELU s'il est arrêté.
//   POST { mois, action: 'arreter' | 'payer' | 'facture' }
//
// Le relevé est de l'argent réel entre deux personnes. Trois principes en découlent :
//
//   • il se VÉRIFIE : le détail client par client accompagne toujours le total. Un relevé qu'on ne peut
//     pas recompter à la main ne vaut rien ;
//   • une fois ARRÊTÉ, il est figé (trigger 0071). Recalculer un mois clos changerait un montant déjà
//     annoncé, et plus personne ne pourrait se fier à ce qu'il a reçu ;
//   • le partenaire LIT le sien, il ne l'arrête pas. C'est Benjamin qui engage l'entreprise.

/** Ce que Stripe a encaissé dans le mois, par client. Le mois est celui de l'ENCAISSEMENT. */
/** `tronque` : Stripe avait encore des pages au dernier tour. Le chiffre est alors INCOMPLET,
 *  et un relevé incomplet qui se tait est un relevé faux. */
async function encaissementsDuMois(debut: string, fin: string): Promise<{ par: Map<string, number>; tronque: boolean }> {
  const parClient = new Map<string, number>()
  let tronque = false
  if (!stripe) return { par: parClient, tronque }
  const options = { timeout: 20_000, maxNetworkRetries: 0 } as const
  let curseur: string | undefined
  // Les paiements réussis du mois : on lit les factures payées, elles portent le client ET le montant
  // réellement encaissé (une facture partiellement payée ne compte que ce qui est entré).
  for (let page = 0; page < 10; page++) {
    const l = await stripe.invoices.list({
      status: 'paid', limit: 100, created: { gte: Math.floor(Date.parse(debut) / 1000), lt: Math.floor(Date.parse(fin) / 1000) },
      ...(curseur ? { starting_after: curseur } : {}),
    }, options)
    for (const f of l.data) {
      const client = typeof f.customer === 'string' ? f.customer : f.customer?.id
      if (!client) continue
      parClient.set(client, (parClient.get(client) ?? 0) + (f.amount_paid ?? 0))
    }
    if (!l.has_more || !l.data.length) break
    curseur = l.data[l.data.length - 1].id
    // Dernier tour et Stripe en a encore : on s'arrête, mais on le DIT. Une borne muette rend un
    // relevé faux en silence — et c'est un chiffre qui engage de l'argent dû au partenaire.
    if (page === 9 && l.has_more) tronque = true
  }
  return { par: parClient, tronque }
}

/** Les remboursements RÉUSSIS du mois, par client Stripe, en centimes positifs (article 5.4).
 *
 *  Une facture remboursée reste « payée » chez Stripe : sans cette lecture, la commission d'un client
 *  remboursé resterait acquise au partenaire alors que l'argent est reparti. */
async function remboursementsDuMois(debut: string, fin: string): Promise<{ par: Map<string, number>; tronque: boolean }> {
  const parClient = new Map<string, number>()
  let tronque = false
  if (!stripe) return { par: parClient, tronque }
  const options = { timeout: 20_000, maxNetworkRetries: 0 } as const
  let curseur: string | undefined
  for (let page = 0; page < 10; page++) {
    const l = await stripe.refunds.list({
      limit: 100, created: { gte: Math.floor(Date.parse(debut) / 1000), lt: Math.floor(Date.parse(fin) / 1000) },
      // La charge est développée dans la requête : un appel par remboursement ferait dépasser le
      // délai de la route dès qu'il y en a quelques dizaines.
      expand: ['data.charge'],
      ...(curseur ? { starting_after: curseur } : {}),
    }, options)
    for (const r of l.data) {
      // Un remboursement en attente ou échoué n'a rien retiré à personne : le déduire ferait payer
      // au partenaire une opération qui n'a pas eu lieu.
      if (r.status !== 'succeeded') continue
      const charge = typeof r.charge === 'string' ? null : r.charge
      const client = typeof charge?.customer === 'string' ? charge.customer : charge?.customer?.id
      if (!client) continue
      parClient.set(client, (parClient.get(client) ?? 0) + (r.amount ?? 0))
    }
    if (!l.has_more || !l.data.length) break
    curseur = l.data[l.data.length - 1].id
  }
  return { par: parClient, tronque }
}

async function construire(mois: string) {
  const bornes = bornesDuMois(mois)
  if (!bornes) return null

  const [{ data: artisans }, { data: apports }, { data: achats }] = await Promise.all([
    supabaseAdmin.from('artisans').select('id, nom, stripe_customer_id, est_demo, is_founder'),
    actif('apports')
      ? supabaseAdmin.from('registre_apports').select('artisan_id, statut, piece, motif')
      : Promise.resolve({ data: [] as { artisan_id: string; statut: string; piece: string | null; motif: string | null }[] }),
    supabaseAdmin.from('achats').select('ttc_cents, date_facture')
      .gte('date_facture', bornes.debut.slice(0, 10)).lt('date_facture', bornes.fin.slice(0, 10)),
  ])

  const [enc, remb] = await Promise.all([
    encaissementsDuMois(bornes.debut, bornes.fin),
    remboursementsDuMois(bornes.debut, bornes.fin),
  ])
  const encaisse = enc.par, rembourse = remb.par
  // Au-delà de mille factures dans le mois, la lecture s'arrête. Le chiffre devient incomplet, et
  // c'est de l'argent dû au partenaire : ça se dit, ça ne se devine pas.
  const incomplet = enc.tronque || remb.tronque
  const parApport = new Map((apports ?? []).map((a) => [a.artisan_id, a]))

  const clients: LigneClient[] = []
  for (const a of artisans ?? []) {
    // Les comptes de démonstration et les fondateurs ne comptent dans aucun chiffre (v11 §2.3) — et
    // certainement pas dans un relevé qui engage de l'argent.
    if (a.est_demo || a.is_founder || !a.stripe_customer_id) continue
    const cents = encaisse.get(a.stripe_customer_id) ?? 0
    const rendu = rembourse.get(a.stripe_customer_id) ?? 0
    // Un mois sans encaissement mais AVEC un remboursement compte quand même : l'article 5.4 traite
    // le remboursement comme un encaissement négatif, et l'écarter ici revenait à garder une
    // commission sur de l'argent reparti. C'est la doctrine écrite en tête de lib/controle/releve.ts,
    // que ce filtre contredisait deux lignes après l'avoir lue.
    if (cents <= 0 && rendu <= 0) continue
    const ap = parApport.get(a.id)
    // Le taux vient du REGISTRE, jamais d'une saisie : prouvé ou saisi 20 %, contesté 10 %, sinon 0.
    const v = ap ? verdict(ap as { statut: Statut; piece: string | null; motif: string | null }) : null
    clients.push({
      artisan_id: a.id, nom: a.nom, encaisse: cents, rembourse: rendu,
      tauxApport: v?.compte ? v.tauxPct : 0,
      statutApport: ap?.statut ?? null,
    })
  }

  const couts = (achats ?? []).reduce((n, x) => n + (x.ttc_cents ?? 0), 0)
  // L'aveu voyage AVEC le chiffre : séparés, l'un finirait affiché sans l'autre.
  return { ...calculerReleve(mois, clients, couts), incomplet }
}

export async function GET(req: Request) {
  // Drapeau baissé = cet espace n'existe pas : 404 avant tout, y compris avant l'identité.
  if (!actif('comptabilite')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  const f = await estFondateur(req)
  if (estRefus(f)) return reponseRefus(f)
  const perimetre = exigerDomaine(f, 'releve.partenaire', 'voir')
  if (domaineRefuse(perimetre)) return reponseRefus(perimetre)

  const u = new URL(req.url)
  const mois = u.searchParams.get('mois') ?? new Date().toISOString().slice(0, 7)
  if (!bornesDuMois(mois)) return NextResponse.json({ error: 'Mois attendu : AAAA-MM.' }, { status: 400 })

  const { data: partenaire } = await supabaseAdmin.from('artisans')
    .select('id, nom, email').eq('role_interne', 'partenaire').limit(1).maybeSingle()
  if (!partenaire) return NextResponse.json({ error: 'Aucun partenaire n’est déclaré.', code: 'sans_partenaire' }, { status: 404 })

  const { data: enBase } = await supabaseAdmin.from('reversements')
    .select('*').eq('partenaire_id', partenaire.id).eq('mois', mois).maybeSingle()

  // Un relevé arrêté se RELIT, il ne se recalcule pas : ses chiffres ont été annoncés.
  if (enBase && enBase.statut !== 'brouillon') {
    return NextResponse.json({
      mois, fige: true, statut: enBase.statut, partenaire: { nom: partenaire.nom },
      releve: {
        mois, encaisse: enBase.encaisse_cents, couts: enBase.couts_cents, resultat: enBase.resultat_cents,
        commission: enBase.commission_cents, base: enBase.resultat_cents - enBase.commission_cents,
        interessement: enBase.interessement_cents, dûAuPartenaire: enBase.du_cents,
        partFondateur: enBase.part_fondateur_cents, clients: enBase.detail ?? [],
      },
      arrete_le: enBase.arrete_le, paye_le: enBase.paye_le, facture_recue: enBase.facture_recue,
      a: new Date().toISOString(),
    })
  }

  const releve = await construire(mois)
  if (!releve) return NextResponse.json({ error: 'Mois invalide.' }, { status: 400 })
  return NextResponse.json({
    mois, fige: false, statut: 'brouillon', partenaire: { nom: partenaire.nom }, releve,
    source: { source: 'stripe', a: new Date().toISOString(), cache: false },
    a: new Date().toISOString(),
  })
}

export async function POST(req: Request) {
  // Drapeau baissé = cet espace n'existe pas : 404 avant tout, y compris avant l'identité.
  if (!actif('comptabilite')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  const f = await estFondateur(req)
  if (estRefus(f)) return reponseRefus(f)
  // Arrêter un relevé engage l'entreprise : c'est de la comptabilité, pas de la lecture.
  const perimetre = exigerDomaine(f, 'comptabilite', 'ecrire')
  if (domaineRefuse(perimetre)) return reponseRefus(perimetre)

  const b = (await req.json().catch(() => null)) as { mois?: unknown; action?: unknown; note?: unknown } | null
  const mois = typeof b?.mois === 'string' ? b.mois : ''
  const action = typeof b?.action === 'string' ? b.action : ''
  if (!bornesDuMois(mois)) return NextResponse.json({ error: 'Mois attendu : AAAA-MM.' }, { status: 400 })
  if (!['arreter', 'payer', 'facture'].includes(action)) return NextResponse.json({ error: 'Action attendue : arreter, payer, facture.' }, { status: 400 })

  const { data: partenaire } = await supabaseAdmin.from('artisans')
    .select('id, nom').eq('role_interne', 'partenaire').limit(1).maybeSingle()
  if (!partenaire) return NextResponse.json({ error: 'Aucun partenaire n’est déclaré.' }, { status: 404 })

  if (action === 'arreter') {
    // Un mois qui n'est pas fini ne s'arrête pas : le dernier encaissement n'a pas eu lieu.
    const bornes = bornesDuMois(mois)!
    if (Date.parse(bornes.fin) > Date.now()) return NextResponse.json({ error: 'Ce mois n’est pas terminé : son dernier encaissement n’a pas eu lieu.', code: 'mois_en_cours' }, { status: 400 })

    const refus = await exigerReconfirmation(req, f.uid, 'argent')
    if (refus) return refus
    const r = await construire(mois)
    if (!r) return NextResponse.json({ error: 'Mois invalide.' }, { status: 400 })

    if (!(await journaliser({
      acteur: f, action: 'reversement_modifie', cible_type: 'reversement', cible_id: mois,
      apres: { statut: 'arrêté', du: r.dûAuPartenaire, encaisse: r.encaisse, commission: r.commission }, reconfirme: true,
    }, req))) return refusJournal()

    const { error } = await supabaseAdmin.from('reversements').upsert({
      partenaire_id: partenaire.id, mois, statut: 'arrete',
      encaisse_cents: r.encaisse, couts_cents: r.couts, resultat_cents: r.resultat,
      commission_cents: r.commission, interessement_cents: r.interessement,
      du_cents: r.dûAuPartenaire, part_fondateur_cents: r.partFondateur,
      detail: r.clients, arrete_le: new Date().toISOString(), arrete_par: f.uid,
    }, { onConflict: 'partenaire_id,mois' })
    if (error) { console.error('[releve] arrêté :', error.message); return NextResponse.json({ error: 'Rien n’a été fait.', code: 'transaction' }, { status: 503 }) }
    return NextResponse.json({ ok: true, message: `Relevé de ${mois} arrêté : ${(r.dûAuPartenaire / 100).toFixed(2).replace('.', ',')} € dus à ${partenaire.nom ?? 'le partenaire'}.` })
  }

  // Paiement et réception de facture : des faits qui arrivent APRÈS l'arrêté, pas des chiffres révisés.
  const champ = action === 'payer' ? { statut: 'paye', paye_le: new Date().toISOString() } : { facture_recue: true }
  const { data, error } = await supabaseAdmin.from('reversements').update(champ)
    .eq('partenaire_id', partenaire.id).eq('mois', mois).select('id').maybeSingle()
  if (error) return NextResponse.json({ error: 'Rien n’a été fait.', code: 'transaction' }, { status: 503 })
  if (!data) return NextResponse.json({ error: 'Ce relevé n’existe pas encore : arrêtez-le d’abord.' }, { status: 404 })
  await journaliser({ acteur: f, action: 'reversement_modifie', cible_type: 'reversement', cible_id: mois, apres: champ }, req)
  return NextResponse.json({ ok: true, message: action === 'payer' ? 'Relevé marqué payé.' : 'Facture du partenaire marquée reçue.' })
}
