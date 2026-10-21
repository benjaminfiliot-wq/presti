import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { generateConversationReply, type ConvTurn } from '@/lib/ai'
import { consumeCredit, rendreCredit } from '@/lib/credits'
import { signalerPanneIA } from '@/lib/alerteService'
import { resolveModel } from '@/lib/models'
import { getPlateformeConfig, personaDe, tonDeReponse } from '@/lib/plateformeConfig'
import { exigerCapacite } from '@/lib/accesOffreServeur'
import { repondreServeur, validerPropositionServeur } from '@/lib/envoisServeur'
import { annulerParRef } from '@/lib/pilote/serveur'

export const runtime = 'nodejs'
export const maxDuration = 60

// Boîte de réception artisan : répondre à un prospect dans le fil, ou demander à
// l'IA une suggestion de réponse. Authentifié (Bearer) + vérification de propriété
// du lead. L'insertion de messages passe par le service_role (aucune policy INSERT
// cliente sur `messages`), donc TOUJOURS après contrôle que le lead appartient à l'artisan.

type Lead = {
  id: string; artisan_id: string; nom_prospect: string | null
  contact: string | null; message: string | null; statut: string | null; prise_en_main: boolean | null
  canal: string | null
}

// 15/10 (Benj) : « Messages » fait partie de la plateforme, qui commence avec Studio. Session valide d'abord (révocation, suspension, double
// authentification), puis l'offre lue en base : 403 { code: 'offre' } sans rien lire ni écrire, aucun crédit touché.
async function gardeMessages(req: Request) {
  const g = await exigerCapacite(req, 'plateforme.conversation', 'L’écran « Messages »')
  if ('reponse' in g) return { error: g.reponse }
  return { uid: g.uid }
}

async function ownedLead(leadId: string, uid: string): Promise<Lead | null> {
  const { data } = await supabaseAdmin
    .from('leads')
    .select('id, artisan_id, nom_prospect, contact, message, statut, prise_en_main, canal')
    .eq('id', leadId)
    .maybeSingle()
  const lead = (data as Lead) ?? null
  if (!lead || lead.artisan_id !== uid) return null
  return lead
}

async function history(leadId: string): Promise<ConvTurn[]> {
  const { data } = await supabaseAdmin
    .from('messages')
    .select('sens, contenu, sent_at')
    .eq('lead_id', leadId)
    .order('sent_at', { ascending: true })
    .limit(120)
  return ((data as { sens: 'in' | 'out'; contenu: string }[]) ?? []).map((m) => ({ sens: m.sens, contenu: m.contenu }))
}

export async function POST(req: Request) {
  try {
    const auth = await gardeMessages(req)
    if ('error' in auth) return auth.error
    const uid = auth.uid

    const body = await req.json().catch(() => null)
    const ACTIONS = ['reply', 'suggest', 'valider', 'rejeter', 'prise_en_main', 'rendre_main', 'escalader'] as const
    type Action = typeof ACTIONS[number]
    const action: Action = (ACTIONS as readonly string[]).includes(body?.action) ? body.action : 'reply'
    const leadId = typeof body?.lead_id === 'string' ? body.lead_id : ''
    if (!leadId) return NextResponse.json({ error: 'Conversation manquante' }, { status: 400 })

    const lead = await ownedLead(leadId, uid)
    if (!lead) return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 })

    // ── Poste de pilotage (v5 §9) : prise de main, escalade, propositions de l'assistant.
    // « Rendre la main » a son propre nom (v7, 1d) : avant, il fallait savoir envoyer
    // `prise_en_main` avec `valeur:false` — l'audit l'a cru absent, et l'écran ne l'offrait
    // qu'en retour du même bouton. Le geste est désormais explicite, dans l'API et à l'écran.
    if (action === 'prise_en_main' || action === 'rendre_main' || action === 'escalader') {
      const valeur = action === 'escalader' ? true : action === 'rendre_main' ? false : body?.valeur !== false
      await supabaseAdmin.from('leads').update({
        prise_en_main: valeur, prise_en_main_le: valeur ? new Date().toISOString() : null,
        ...(action === 'escalader' ? { urgence: 'urgent', lu_le: null } : {}),
        updated_at: new Date().toISOString(),
      }).eq('id', lead.id)
      return NextResponse.json({ ok: true, prise_en_main: valeur })
    }
    if (action === 'valider' || action === 'rejeter') {
      const messageId = typeof body?.message_id === 'string' ? body.message_id : ''
      const { data: prop } = await supabaseAdmin.from('messages').select('id, contenu, etat').eq('id', messageId).eq('lead_id', lead.id).maybeSingle()
      if (!prop || prop.etat !== 'proposition') return NextResponse.json({ error: 'Proposition introuvable ou déjà traitée.' }, { status: 404 })
      if (action === 'rejeter') {
        await supabaseAdmin.from('messages').update({ etat: 'rejete' }).eq('id', prop.id)
        await annulerParRef(uid, 'proposition', prop.id as string, 'écartée par l’artisan').catch(() => {})
        return NextResponse.json({ ok: true })
      }
      // Valider = le message devient réel pour le client et part (lib/envoisServeur.ts, même fonction que le pilote automatique,
      // avec la réclamation d'envoi qui empêche un double départ). Texte éventuellement retouché par l'artisan.
      await annulerParRef(uid, 'proposition', prop.id as string, 'validée par l’artisan').catch(() => {})
      const r = await validerPropositionServeur(uid, lead, prop.id as string, typeof body?.message === 'string' ? body.message : null)
      return NextResponse.json(r.json, { status: r.status })
    }

    const { data: artisan } = await supabaseAdmin
      .from('artisans')
      .select('nom, metier, ton_style, email, is_founder, plan')
      .eq('id', uid)
      .maybeSingle()

    // ── Suggestion IA : renvoie un brouillon que l'artisan pourra éditer avant d'envoyer.
    //    L'artisan CHOISIT le modèle (Standard/Pro/Expert) ; on respecte sa formule.
    if (action === 'suggest') {
      // Le modèle ne se choisit plus ici : il vient de « Ma plateforme → Intelligence »
      // (v4 §B1 — l'IA vit dans la plateforme, la boîte de réception ne fait que proposer).
      const cfg = await getPlateformeConfig(uid)
      const { tier, model, downgraded } = resolveModel(cfg.modele || 'standard', artisan?.plan)
      const credit = await consumeCredit(uid, tier, !!artisan?.is_founder)
      if (!credit.ok) return NextResponse.json({ error: credit.error, outOfCredits: true }, { status: 402 })
      const turns = await history(leadId)
      if (!turns.length) { await rendreCredit(uid, tier, !!artisan?.is_founder); return NextResponse.json({ error: 'Aucun message à traiter.' }, { status: 400 }) }
      try {
        const reply = await generateConversationReply(
          { nom: artisan?.nom ?? null, metier: artisan?.metier ?? null, ton_style: tonDeReponse(cfg, artisan?.ton_style) },
          { nom_prospect: lead.nom_prospect, contact: lead.contact, message: lead.message },
          turns,
          model,
          undefined,
          { persona: personaDe(cfg) },
        )
        return NextResponse.json({ ok: true, reply, tier, downgraded })
      } catch (e) {
        // La suggestion a échoué : l'entreprise le sait, le crédit revient (audit final, E, M5).
        console.error('[messages] suggestion IA:', e)
        await signalerPanneIA('suggestion de réponse (/api/messages)', e)
        await rendreCredit(uid, tier, !!artisan?.is_founder)
        return NextResponse.json({ error: 'La suggestion n’a pas pu être produite. Réessayez dans un instant.' }, { status: 502 })
      }
    }

    // ── Réponse de l'artisan (envoyée telle quelle dans le fil + par le canal ou l'e-mail) : lib/envoisServeur.ts.
    const contenu = typeof body?.message === 'string' ? body.message.trim().slice(0, 4000) : ''
    if (!contenu) return NextResponse.json({ error: 'Message vide' }, { status: 400 })
    const r = await repondreServeur(uid, lead, contenu)
    return NextResponse.json(r.json, { status: r.status })
  } catch (e) {
    console.error('[messages] POST:', e)
    return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 500 })
  }
}
