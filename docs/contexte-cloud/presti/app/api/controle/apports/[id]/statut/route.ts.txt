import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { estDirection, estRefus, reponseRefus, exigerDomaine, domaineRefuse } from '@/lib/direction/garde'
import { exigerReconfirmation } from '@/lib/direction/reconfirmation'
import { libelleStatut, type Statut } from '@/lib/direction/apports'
import { lireUserAgent } from '@/lib/userAgent'
import { actif } from '@/lib/flags'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST /api/controle/apports/<id>/statut — contester, retirer, ou joindre une pièce (contrat art. 5).
//
// Ce que la fonction refuse, et c'est le cœur de « avec preuve » : on ne transforme JAMAIS un apport déclaré en
// apport prouvé. Une preuve est établie par le serveur, à l'inscription, ou pas du tout. On peut contester, on
// peut retirer, on peut joindre une pièce — on ne réécrit pas l'histoire.
const STATUTS: Statut[] = ['declare', 'conteste', 'retire']

// Les trois décisions du §4.4, et ce qu'elles font vraiment :
//   valider  — l'apport compte, la commission est due. Le STATUT ne change pas (un déclaré reste un
//              déclaré, un prouvé reste un prouvé) : c'est la REVUE qui est datée et signée.
//   contester— la règle du contrat s'applique : 10 % au lieu de 20 %, motif obligatoire.
//   refuser  — l'apport ne compte pas, motif obligatoire, et l'apporteur en est averti.
const DECISIONS = { valider: null, contester: 'conteste', refuser: 'retire' } as const
type Decision = keyof typeof DECISIONS

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!actif('apports')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  const f = await estDirection(req)
  if (estRefus(f)) return reponseRefus(f)
  const perimetre = exigerDomaine(f, 'apports.decision', 'ecrire')
  if (domaineRefuse(perimetre)) return reponseRefus(perimetre)
  const { id } = await ctx.params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Ligne inconnue.' }, { status: 404 })
  const b = (await req.json().catch(() => null)) as { statut?: unknown; decision?: unknown; motif?: unknown; piece?: unknown } | null
  const decision = (typeof b?.decision === 'string' && b.decision in DECISIONS ? b.decision : null) as Decision | null
  const statut = decision ? DECISIONS[decision] : (STATUTS.includes(b?.statut as Statut) ? (b!.statut as Statut) : null)
  const motif = typeof b?.motif === 'string' ? b.motif.trim().slice(0, 300) : null
  const piece = typeof b?.piece === 'string' ? b.piece.trim().slice(0, 500) : null
  if (!statut && !decision) return NextResponse.json({ error: `Décision attendue : valider, contester ou refuser.` }, { status: 400 })
  if (decision && decision !== 'valider' && !motif) return NextResponse.json({ error: 'Un motif est obligatoire pour contester ou refuser.' }, { status: 400 })

  // « Valider » ne touche pas au statut : il DATE et SIGNE la revue. Un apport validé sort de la file
  // « à valider » sans que son histoire soit réécrite — le déclaré reste déclaré.
  if (decision === 'valider') {
    const refusV = await exigerReconfirmation(req, f.uid, 'artisan')
    if (refusV) return refusV
    const { data: avant } = await supabaseAdmin.from('registre_apports').select('id, statut, score, revue_le').eq('id', id).maybeSingle()
    if (!avant) return NextResponse.json({ error: 'Cette ligne du registre n’existe pas.' }, { status: 404 })
    const { error: eMaj } = await supabaseAdmin.from('registre_apports')
      .update({ revue_le: new Date().toISOString(), revue_par: f.uid }).eq('id', id)
    if (eMaj) return NextResponse.json({ error: 'Rien n’a été fait.', code: 'transaction' }, { status: 503 })
    const { journaliser, refusJournal } = await import('@/lib/direction/journal')
    if (!(await journaliser({
      acteur: f, action: 'apport_modifie', cible_type: 'apport', cible_id: id, artisan_id: null,
      avant: { revue: avant.revue_le, statut: avant.statut, score: avant.score },
      apres: { revue: 'validée', statut: avant.statut, motif }, reconfirme: true,
    }, req))) return refusJournal()
    return NextResponse.json({ ok: true, message: 'Apport validé : la commission est due.' })
  }
  if (!statut) return NextResponse.json({ error: `Statut attendu : ${STATUTS.map(libelleStatut).join(', ')}.` }, { status: 400 })
  if ((statut === 'conteste' || statut === 'retire') && !motif) return NextResponse.json({ error: 'Un motif est obligatoire pour contester ou retirer.' }, { status: 400 })
  const refus = await exigerReconfirmation(req, f.uid, 'artisan')
  if (refus) return refus
  const u = lireUserAgent(req.headers.get('user-agent'))
  const { data, error } = await supabaseAdmin.rpc('changer_statut_apport', {
    p_acteur: f.uid, p_acteur_email: f.email, p_ligne: id, p_statut: statut, p_motif: motif, p_piece: piece,
    p_ip: f.ip, p_agent: `${u.appareil} · ${u.navigateur}`.slice(0, 120),
  })
  if (error) { console.error('[direction] changer_statut_apport :', error.message); return NextResponse.json({ error: 'Changement impossible : rien n’a été fait.', code: 'transaction' }, { status: 503 }) }
  const r = data as { etat?: string; journal?: string }
  const messages: Record<string, string> = {
    inconnue: 'Cette ligne du registre n’existe pas.',
    statut_invalide: 'Statut refusé.',
    piece_requise: 'Une pièce est obligatoire pour un apport déclaré.',
    preuve_non_falsifiable: 'Une preuve s’établit à l’inscription : un apport déclaré ne devient pas prouvé.',
  }
  if (r?.etat !== 'ok') return NextResponse.json({ error: messages[r?.etat ?? ''] ?? 'Changement refusé.', code: r?.etat }, { status: 400 })

  // La décision est datée et signée, comme une validation : une ligne contestée ou refusée est revue.
  await supabaseAdmin.from('registre_apports').update({ revue_le: new Date().toISOString(), revue_par: f.uid }).eq('id', id)

  // L'apporteur est averti d'une décision qui lui coûte (§4.4). Sans bloquer : un email qui ne part
  // pas ne doit pas annuler une décision déjà écrite et journalisée.
  if (decision === 'contester' || decision === 'refuser') {
    try {
      const { data: l } = await supabaseAdmin.from('registre_apports').select('apporteur_id').eq('id', id).maybeSingle()
      const { data: ap } = l ? await supabaseAdmin.from('apporteurs').select('nom, artisan_id').eq('id', l.apporteur_id).maybeSingle() : { data: null }
      const { data: dest } = ap?.artisan_id ? await supabaseAdmin.from('artisans').select('email').eq('id', ap.artisan_id).maybeSingle() : { data: null }
      if (dest?.email) {
        const { sendEmail, EMAIL_ENTREPRISE } = await import('@/lib/email')
        await sendEmail({
          to: dest.email, critique: true, replyTo: EMAIL_ENTREPRISE,
          subject: decision === 'refuser' ? 'Un apport n’a pas été retenu' : 'Un apport a été contesté',
          text: `Bonjour ${ap?.nom ?? ''},\n\n${decision === 'refuser'
            ? 'Un apport que vous aviez déclaré n’a pas été retenu.'
            : 'Un apport que vous aviez déclaré a été contesté : la commission applicable passe à 10 % (article 5 du contrat).'}\n\nMotif : ${motif}\n\nVous pouvez en discuter en répondant à ce message.\n\nBenjamin — Presti`,
        })
      }
    } catch (e) { console.error('[apports] avis à l’apporteur :', e instanceof Error ? e.message : e) }
  }

  return NextResponse.json({ ok: true, message: `Apport ${libelleStatut(statut).toLowerCase()}.`, journal: r.journal })
}
