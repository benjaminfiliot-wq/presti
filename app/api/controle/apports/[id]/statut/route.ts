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

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!actif('apports')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  const f = await estDirection(req)
  if (estRefus(f)) return reponseRefus(f)
  const perimetre = exigerDomaine(f, 'apports.decision', 'ecrire')
  if (domaineRefuse(perimetre)) return reponseRefus(perimetre)
  const { id } = await ctx.params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Ligne inconnue.' }, { status: 404 })
  const b = (await req.json().catch(() => null)) as { statut?: unknown; motif?: unknown; piece?: unknown } | null
  const statut = STATUTS.includes(b?.statut as Statut) ? (b!.statut as Statut) : null
  const motif = typeof b?.motif === 'string' ? b.motif.trim().slice(0, 300) : null
  const piece = typeof b?.piece === 'string' ? b.piece.trim().slice(0, 500) : null
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
  return NextResponse.json({ ok: true, message: `Apport ${libelleStatut(statut).toLowerCase()}.`, journal: r.journal })
}
