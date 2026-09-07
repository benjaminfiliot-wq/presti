import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { estDirection, estRefus, reponseRefus, exigerDomaine, domaineRefuse } from '@/lib/direction/garde'
import { exigerReconfirmation } from '@/lib/direction/reconfirmation'
import { lireUserAgent } from '@/lib/userAgent'
import { stripe } from '@/lib/stripe'
import { sendEmail, EMAIL_ENTREPRISE } from '@/lib/email'
import { journaliser, refusJournal } from '@/lib/direction/journal'
import { oublier } from '@/lib/direction/fraicheur'
import { actif } from '@/lib/flags'
import { createHash } from 'node:crypto'
import { type Action } from '@/lib/direction/journal'
import { changerOffre, rembourser, mettreEnPause, reprendre } from '@/lib/direction/stripe-actions'
import { alignerSurAbonnement } from '@/lib/abonnementSync'
import { OFFRES, type PlanPayant } from '@/lib/plans'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/controle/clients/<id>/action — agir sur un artisan (prompt v10 §2.2, J2b).
//
// Quatre actions, chacune re-confirmée (mot de passe, portée « artisan » ou « argent »), journalisée avant/après,
// et bornée dans le code :
//   crediter    — 1 à 500 crédits, motif obligatoire (transaction : crédits + journal)
//   suspendre   — accès coupé, données conservées, sessions fermées, message pour l'artisan (transaction)
//   reactiver   — lève la suspension (transaction)
//   portail     — un lien de portail Stripe POUR LE CLIENT, à lui transmettre ; rien n'est modifié
//   email       — un message depuis l'adresse de Presti, avec un modèle, jamais un texte inventé sur son dos
//
// Ce que cette route ne fait pas : changer d'offre, rembourser, mettre en pause. Ces trois-là écrivent chez
// Stripe et attendent leur suite en mode test (J2b, seconde moitié) — on ne livre pas un bouton qui touche à
// l'argent sans l'avoir éprouvé.
type Corps = { action?: unknown; credits?: unknown; motif?: unknown; message?: unknown; modele?: unknown; vers?: unknown; montant?: unknown; jusqu_au?: unknown }
const MODELES: Record<string, { sujet: string; texte: (nom: string) => string }> = {
  bonjour: { sujet: 'Un mot de Presti', texte: (n) => `Bonjour ${n},\n\nJe voulais simplement prendre de vos nouvelles sur votre utilisation de Presti. Si quelque chose coince, répondez à ce message : je lis tout.\n\nBenjamin — Presti` },
  aide: { sujet: 'Besoin d’un coup de main ?', texte: (n) => `Bonjour ${n},\n\nJ’ai vu que votre compte était un peu en veille. Si vous voulez qu’on prenne dix minutes pour le régler ensemble, répondez à ce message avec deux créneaux qui vous vont.\n\nBenjamin — Presti` },
  paiement: { sujet: 'Votre paiement n’est pas passé', texte: (n) => `Bonjour ${n},\n\nVotre dernier paiement a été refusé par votre banque. Rien n’est perdu : vous pouvez mettre votre moyen de paiement à jour depuis Paramètres → Abonnement.\n\nBenjamin — Presti` },
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!actif('actionsArtisan')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  const f = await estDirection(req)
  if (estRefus(f)) return reponseRefus(f)
  const perimetre = exigerDomaine(f, 'artisan.actions', 'ecrire')
  if (domaineRefuse(perimetre)) return reponseRefus(perimetre)
  const { id } = await ctx.params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Artisan inconnu.' }, { status: 404 })
  const b = (await req.json().catch(() => null)) as Corps | null
  const action = typeof b?.action === 'string' ? b.action : ''
  const motif = typeof b?.motif === 'string' ? b.motif.trim().slice(0, 300) : ''
  const u = lireUserAgent(req.headers.get('user-agent'))
  const agent = `${u.appareil} · ${u.navigateur}`.slice(0, 120)

  const { data: a } = await supabaseAdmin.from('artisans').select('id, nom, email, plan, is_founder, stripe_customer_id, stripe_subscription_id').eq('id', id).maybeSingle()
  if (!a) return NextResponse.json({ error: 'Artisan inconnu.' }, { status: 404 })

  // Le corps est validé AVANT de consommer le jeton (leçon du 07/09 : une demande invalide le brûlait).
  if (action === 'crediter') {
    const credits = Number(b?.credits)
    if (!Number.isInteger(credits) || credits < 1 || credits > 500) return NextResponse.json({ error: 'Entre 1 et 500 crédits.' }, { status: 400 })
    if (!motif) return NextResponse.json({ error: 'Un motif est obligatoire : il sera dans le journal.' }, { status: 400 })
    const refus = await exigerReconfirmation(req, f.uid, 'argent')
    if (refus) return refus
    const { data, error } = await supabaseAdmin.rpc('offrir_credits', { p_acteur: f.uid, p_acteur_email: f.email, p_artisan: id, p_credits: credits, p_motif: motif, p_ip: f.ip, p_agent: agent })
    if (error) { console.error('[direction] offrir_credits :', error.message); return NextResponse.json({ error: 'Rien n’a été fait.', code: 'transaction' }, { status: 503 }) }
    const r = data as { etat?: string; apres?: number }
    if (r?.etat !== 'ok') return NextResponse.json({ error: r?.etat === 'hors_bornes' ? 'Entre 1 et 500 crédits.' : r?.etat === 'motif_requis' ? 'Un motif est obligatoire.' : 'Artisan inconnu.' }, { status: 400 })
    oublier('chiffres:')
    return NextResponse.json({ ok: true, message: `${credits} crédit${credits > 1 ? 's' : ''} offert${credits > 1 ? 's' : ''} — il en a maintenant ${r.apres}.` })
  }

  if (action === 'suspendre') {
    const message = typeof b?.message === 'string' ? b.message.trim().slice(0, 400) : ''
    if (!motif) return NextResponse.json({ error: 'Un motif est obligatoire.' }, { status: 400 })
    if (a.is_founder) return NextResponse.json({ error: 'Un fondateur ne se suspend pas.' }, { status: 400 })
    const refus = await exigerReconfirmation(req, f.uid, 'artisan')
    if (refus) return refus
    const { data, error } = await supabaseAdmin.rpc('suspendre_artisan', { p_acteur: f.uid, p_acteur_email: f.email, p_artisan: id, p_motif: motif, p_message: message || null, p_ip: f.ip, p_agent: agent })
    if (error) { console.error('[direction] suspendre_artisan :', error.message); return NextResponse.json({ error: 'Rien n’a été fait.', code: 'transaction' }, { status: 503 }) }
    const r = data as { etat?: string }
    const messages: Record<string, string> = { deja: 'Ce compte est déjà suspendu.', fondateur: 'Un fondateur ne se suspend pas.', artisan_inconnu: 'Artisan inconnu.', motif_requis: 'Un motif est obligatoire.' }
    if (r?.etat !== 'ok') return NextResponse.json({ error: messages[r?.etat ?? ''] ?? 'Suspension refusée.' }, { status: 400 })
    return NextResponse.json({ ok: true, message: 'Compte suspendu : accès coupé, données conservées, sessions fermées.' })
  }

  if (action === 'reactiver') {
    const refus = await exigerReconfirmation(req, f.uid, 'artisan')
    if (refus) return refus
    const { data, error } = await supabaseAdmin.rpc('reactiver_artisan', { p_acteur: f.uid, p_acteur_email: f.email, p_artisan: id, p_motif: motif || null, p_ip: f.ip, p_agent: agent })
    if (error) { console.error('[direction] reactiver_artisan :', error.message); return NextResponse.json({ error: 'Rien n’a été fait.', code: 'transaction' }, { status: 503 }) }
    const r = data as { etat?: string }
    if (r?.etat === 'pas_suspendu') return NextResponse.json({ ok: true, deja: true, message: 'Ce compte n’était pas suspendu.' })
    if (r?.etat !== 'ok') return NextResponse.json({ error: 'Réactivation refusée.' }, { status: 400 })
    return NextResponse.json({ ok: true, message: 'Compte réactivé : l’artisan peut se reconnecter.' })
  }

  // ── Les trois actions qui écrivent chez Stripe ─────────────────────────────────────────────────────
  // Ici, l'action et sa trace ne peuvent PAS tenir dans une transaction : Stripe est à l'autre bout d'un
  // réseau. On écrit donc deux lignes — l'intention avant l'appel, le résultat après. Si le journal refuse
  // l'intention, l'appel n'a pas lieu. Une intention restée seule est exactement le signal qu'il faut
  // aller regarder chez Stripe : c'est la propriété qu'on veut, pas un défaut.
  if (action === 'offre' || action === 'rembourser' || action === 'pause' || action === 'reprendre') {
    if (!stripe) return NextResponse.json({ error: 'Stripe n’est pas configuré.' }, { status: 503 })
    if (!motif) return NextResponse.json({ error: 'Un motif est obligatoire : il sera dans le journal.' }, { status: 400 })

    const vers = typeof b?.vers === 'string' ? (b.vers as PlanPayant) : null
    const montant = b?.montant == null ? null : Number(b.montant)
    const jusquAu = typeof b?.jusqu_au === 'string' && b.jusqu_au ? new Date(b.jusqu_au) : null
    if (action === 'offre' && (!vers || !OFFRES.some((o) => o.id === vers))) return NextResponse.json({ error: `Offre attendue : ${OFFRES.map((o) => o.id).join(', ')}.` }, { status: 400 })
    if (action === 'rembourser' && montant != null && !(Number.isFinite(montant) && montant > 0)) return NextResponse.json({ error: 'Montant invalide.' }, { status: 400 })
    if (action === 'pause' && jusquAu && Number.isNaN(jusquAu.getTime())) return NextResponse.json({ error: 'Date de reprise invalide.' }, { status: 400 })
    if (action !== 'rembourser' && !a.stripe_subscription_id) return NextResponse.json({ error: 'Cet artisan n’a pas d’abonnement Stripe.' }, { status: 400 })
    if (action === 'rembourser' && !a.stripe_customer_id) return NextResponse.json({ error: 'Cet artisan n’a pas de compte de facturation Stripe.' }, { status: 400 })

    const refus = await exigerReconfirmation(req, f.uid, 'argent')
    if (refus) return refus

    const ACTIONS: Record<string, Action> = { offre: 'artisan_offre', rembourser: 'artisan_rembourse', pause: 'artisan_pause', reprendre: 'artisan_pause' }
    const nom = ACTIONS[action]
    // La clé d'idempotence tient au JETON de re-confirmation, pas au motif.
    //
    // Avec le motif, elle était à la fois trop large et trop étroite (revue du 07/09) : deux gestes
    // voulus, identiques et légitimes, se heurtaient au rejeu d'idempotence de Stripe, qui renvoyait
    // la réponse de la première fois — la base, le journal et l'écran affirmaient alors un changement
    // que Stripe n'avait pas refait. Le jeton, lui, est à usage unique : un geste voulu deux fois
    // passe par deux mots de passe, donc deux clés, donc deux appels réels.
    const jeton = req.headers.get('x-presti-reconfirmation') ?? ''
    const clef = createHash('sha256').update(`${id}:${action}:${jeton}`).digest('hex').slice(0, 48)
    if (!(await journaliser({ acteur: f, action: nom, cible_type: 'artisan', cible_id: id, artisan_id: id, avant: { plan: a.plan }, apres: { statut: 'tenté', action, vers, montant, jusqu_au: jusquAu?.toISOString() ?? null, motif }, reconfirme: true }, req))) return refusJournal()

    let r: Awaited<ReturnType<typeof changerOffre>> | Awaited<ReturnType<typeof rembourser>> | Awaited<ReturnType<typeof mettreEnPause>>
    try {
      r = action === 'offre' ? await changerOffre(stripe, a.stripe_subscription_id!, vers!, clef)
        : action === 'rembourser' ? await rembourser(stripe, a.stripe_customer_id!, montant, motif, clef)
        : action === 'pause' ? await mettreEnPause(stripe, a.stripe_subscription_id!, jusquAu, clef)
        : await reprendre(stripe, a.stripe_subscription_id!, clef)
    } catch (e) {
      const m = (e as Error).message.slice(0, 160)
      await journaliser({ acteur: f, action: nom, cible_type: 'artisan', cible_id: id, artisan_id: id, apres: { statut: 'échec', erreur: m } }, req)
      return NextResponse.json({ error: `Stripe a refusé : ${m}` }, { status: 503 })
    }
    if (!r.ok) {
      await journaliser({ acteur: f, action: nom, cible_type: 'artisan', cible_id: id, artisan_id: id, apres: { statut: 'refusé', raison: r.message } }, req)
      return NextResponse.json({ error: r.message, code: r.code }, { status: 400 })
    }

    // Le plan en base suit ce que Stripe facture désormais — une seule fonction écrit cette vérité.
    let alignement: string | null = null
    if (action === 'offre' && 'sub' in r.valeur) alignement = (await alignerSurAbonnement(r.valeur.sub)).raison
    oublier(`client:abo:${a.stripe_subscription_id ?? '-'}`); oublier('chiffres:'); oublier('clients:')
    if (!(await journaliser({ acteur: f, action: nom, cible_type: 'artisan', cible_id: id, artisan_id: id, avant: { plan: a.plan }, apres: { statut: 'fait', resume: r.message, alignement, motif }, reconfirme: true }, req))) {
      return NextResponse.json({ ok: true, message: `${r.message} ⚠️ Le résultat n’a pas pu être journalisé — l’intention, elle, l’est. Vérifiez le tableau de bord Stripe.` })
    }
    return NextResponse.json({ ok: true, message: alignement ? `${r.message} (${alignement})` : r.message })
  }

  if (action === 'portail') {
    // Un lien pour LUI, à lui transmettre — on ne se connecte pas à sa place, et rien n'est modifié.
    // Mais ce lien ouvre son moyen de paiement et sa résiliation : il se re-confirme comme le reste
    // (revue du 07/09 — il partait sans mot de passe, et sa trace disait « artisan_email »).
    if (!a.stripe_customer_id) return NextResponse.json({ error: 'Cet artisan n’a pas de compte de facturation Stripe.' }, { status: 400 })
    if (!stripe) return NextResponse.json({ error: 'Stripe n’est pas configuré.' }, { status: 503 })
    if (!motif) return NextResponse.json({ error: 'Un motif est obligatoire : il sera dans le journal.' }, { status: 400 })
    const refus = await exigerReconfirmation(req, f.uid, 'argent')
    if (refus) return refus
    // L'intention AVANT l'appel : un lien créé sans trace serait pire qu'une trace sans lien.
    if (!(await journaliser({ acteur: f, action: 'artisan_portail', cible_type: 'artisan', cible_id: id, artisan_id: id, apres: { statut: 'tenté', motif }, reconfirme: true }, req))) return refusJournal()
    try {
      const p = await stripe.billingPortal.sessions.create({ customer: a.stripe_customer_id, return_url: 'https://prestiapp.fr/parametres?onglet=abonnement' }, { timeout: 6000, maxNetworkRetries: 0 })
      await journaliser({ acteur: f, action: 'artisan_portail', cible_type: 'artisan', cible_id: id, artisan_id: id, apres: { statut: 'lien créé', motif }, reconfirme: true }, req)
      return NextResponse.json({ ok: true, url: p.url, message: 'Lien de portail créé — valable quelques minutes, à transmettre à l’artisan.' })
    } catch (e) {
      const m = (e as Error).message.slice(0, 160)
      await journaliser({ acteur: f, action: 'artisan_portail', cible_type: 'artisan', cible_id: id, artisan_id: id, apres: { statut: 'échec', erreur: m } }, req)
      return NextResponse.json({ error: `Stripe : ${m}` }, { status: 503 })
    }
  }

  if (action === 'email') {
    const modele = typeof b?.modele === 'string' ? b.modele : ''
    const m = MODELES[modele]
    if (!m) return NextResponse.json({ error: `Modèle attendu : ${Object.keys(MODELES).join(', ')}.` }, { status: 400 })
    if (!a.email) return NextResponse.json({ error: 'Cet artisan n’a pas d’adresse.' }, { status: 400 })
    const refus = await exigerReconfirmation(req, f.uid, 'artisan')
    if (refus) return refus
    // L'intention AVANT l'envoi. Auparavant l'email partait, PUIS on journalisait : si le journal
    // tombait, la route répondait « action refusée » alors que l'artisan avait reçu le message, et il
    // n'en restait aucune trace (revue du 07/09). Un email ne se rattrape pas.
    if (!(await journaliser({ acteur: f, action: 'artisan_email', cible_type: 'artisan', cible_id: id, artisan_id: id, apres: { statut: 'tenté', modele }, reconfirme: true }, req))) return refusJournal()
    const r = await sendEmail({ to: a.email, subject: m.sujet, text: m.texte(a.nom || 'à vous'), replyTo: EMAIL_ENTREPRISE })
    await journaliser({ acteur: f, action: 'artisan_email', cible_type: 'artisan', cible_id: id, artisan_id: id, apres: { statut: r.ok ? 'envoyé' : 'échec', modele }, reconfirme: true }, req)
    if (!r.ok) return NextResponse.json({ error: 'L’email n’est pas parti.' }, { status: 503 })
    return NextResponse.json({ ok: true, message: 'Message envoyé depuis l’adresse de Presti.' })
  }

  return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 })
}
