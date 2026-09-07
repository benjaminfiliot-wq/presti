import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { estFondateur, estDirection, estRefus, reponseRefus, exigerDomaine, domaineRefuse } from '@/lib/direction/garde'
import { exigerReconfirmation } from '@/lib/direction/reconfirmation'
import { verdict, preuveLisible, libelleStatut, type Statut } from '@/lib/direction/apports'
import { lireUserAgent } from '@/lib/userAgent'
import { CODE } from '@/lib/apports'
import { actif } from '@/lib/flags'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// /api/controle/apports — le Registre des apports (prompt v10 §2.2 ; « avec preuve », 07/09).
//
// GET  : le registre, chaque ligne avec sa preuve en clair et son verdict (compte ou non, et pourquoi).
//        Un apporteur de rôle « lecture » ne voit QUE ses lignes, et jamais les pièces des autres.
// POST : déclarer un apport à la main — pièce obligatoire, re-confirmation (portée « artisan »), journalisé.
const agent = (req: Request) => { const u = lireUserAgent(req.headers.get('user-agent')); return `${u.appareil} · ${u.navigateur}`.slice(0, 120) }

type LigneBase = {
  id: string; artisan_id: string; apporteur_id: string; statut: Statut
  preuve: Record<string, unknown> | null; piece: string | null; motif: string | null
  premier_contact_le: string | null; souscrit_le: string | null; offre_souscription: string | null
  cree_le: string; maj_le: string
}

export async function GET(req: Request) {
  if (!actif('apports')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  const f = await estFondateur(req)
  if (estRefus(f)) return reponseRefus(f)
  const perimetre = exigerDomaine(f, 'apports', 'voir')
  if (domaineRefuse(perimetre)) return reponseRefus(perimetre)
  const [{ data: apporteurs, error: eA }, { data: lignes, error: eL }] = await Promise.all([
    supabaseAdmin.from('apporteurs').select('id, code, nom, artisan_id, actif').order('cree_le'),
    // Le partenaire ne voit que les apports qu'il a lui-même amenés (v11 §5) : on borne à SES codes.
    (perimetre.borne
      ? supabaseAdmin.from('registre_apports').select('id, artisan_id, apporteur_id, statut, preuve, piece, motif, premier_contact_le, souscrit_le, offre_souscription, cree_le, maj_le')
          .in('apporteur_id', (await supabaseAdmin.from('apporteurs').select('id').eq('artisan_id', f.uid)).data?.map((a) => a.id) ?? ['00000000-0000-0000-0000-000000000000'])
          .order('cree_le', { ascending: false })
      : supabaseAdmin.from('registre_apports').select('id, artisan_id, apporteur_id, statut, preuve, piece, motif, premier_contact_le, souscrit_le, offre_souscription, cree_le, maj_le')
          .order('cree_le', { ascending: false })),
  ])
  if (eA || eL) return NextResponse.json({ error: 'Registre indisponible pour l’instant.' }, { status: 503 })

  // Le rôle « lecture » ne voit que SON registre (il est apporteur), et sans les pièces des autres.
  const miens = (apporteurs ?? []).filter((a) => a.artisan_id === f.uid).map((a) => a.id)
  const visibles = f.role === 'direction' ? (lignes ?? []) : (lignes ?? []).filter((l) => miens.includes(l.apporteur_id))

  const ids = [...new Set(visibles.map((l) => l.artisan_id))]
  const { data: artisans } = ids.length
    ? await supabaseAdmin.from('artisans').select('id, nom, metier, plan, created_at').in('id', ids)
    : { data: [] as { id: string; nom: string | null; metier: string | null; plan: string | null; created_at: string }[] }

  const parCode = new Map((apporteurs ?? []).map((a) => [a.id, a]))
  const parArtisan = new Map((artisans ?? []).map((a) => [a.id, a]))
  const sorties = visibles.map((l) => {
    const ligne = l as LigneBase
    const v = verdict(ligne)
    const ap = parCode.get(ligne.apporteur_id)
    const ar = parArtisan.get(ligne.artisan_id)
    return {
      id: ligne.id,
      artisan: ar ? { id: ar.id, nom: ar.nom, metier: ar.metier, plan: ar.plan, inscrit_le: ar.created_at } : { id: ligne.artisan_id },
      apporteur: ap ? { code: ap.code, nom: ap.nom } : null,
      statut: ligne.statut, statutLisible: libelleStatut(ligne.statut),
      preuve: preuveLisible(ligne as never),
      piece: ligne.piece, motif: ligne.motif,
      offre: ligne.offre_souscription, souscrit_le: ligne.souscrit_le, premier_contact_le: ligne.premier_contact_le,
      compte: v.compte, taux: v.taux, raison: v.raison,
      maj_le: ligne.maj_le,
    }
  })
  const comptes = sorties.filter((s) => s.compte)
  return NextResponse.json({
    lignes: sorties,
    resume: { total: sorties.length, comptes: comptes.length, a_20: comptes.filter((s) => s.taux === 0.2).length, a_10: comptes.filter((s) => s.taux === 0.1).length },
    apporteurs: (apporteurs ?? []).filter((a) => f.role === 'direction' || a.artisan_id === f.uid).map((a) => ({ code: a.code, nom: a.nom, actif: a.actif, lien: `https://prestiapp.fr/a/${a.code}` })),
    role: f.role, a: new Date().toISOString(),
  })
}

export async function POST(req: Request) {
  if (!actif('apports')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  const f = await estDirection(req)
  if (estRefus(f)) return reponseRefus(f)
  const b = (await req.json().catch(() => null)) as { artisan_id?: unknown; code?: unknown; piece?: unknown } | null
  const artisan = typeof b?.artisan_id === 'string' ? b.artisan_id.trim() : ''
  const code = typeof b?.code === 'string' ? b.code.toLowerCase().trim() : ''
  const piece = typeof b?.piece === 'string' ? b.piece.trim().slice(0, 500) : ''
  if (!/^[0-9a-f-]{36}$/i.test(artisan)) return NextResponse.json({ error: 'Artisan inconnu.' }, { status: 400 })
  if (!CODE.test(code)) return NextResponse.json({ error: 'Code d’apport invalide.' }, { status: 400 })
  if (!piece) return NextResponse.json({ error: 'Une pièce est obligatoire : un apport déclaré sans preuve ne compte pas.', code: 'piece_requise' }, { status: 400 })
  const refus = await exigerReconfirmation(req, f.uid, 'artisan')
  if (refus) return refus
  const { data, error } = await supabaseAdmin.rpc('declarer_apport', {
    p_acteur: f.uid, p_acteur_email: f.email, p_artisan: artisan, p_code: code, p_piece: piece, p_ip: f.ip, p_agent: agent(req),
  })
  if (error) { console.error('[direction] declarer_apport :', error.message); return NextResponse.json({ error: 'Déclaration impossible : rien n’a été fait.', code: 'transaction' }, { status: 503 }) }
  const r = data as { etat?: string; ligne?: string }
  const messages: Record<string, string> = {
    piece_requise: 'Une pièce est obligatoire.',
    artisan_inconnu: 'Cet artisan n’existe pas.',
    code_inconnu: 'Ce code d’apport n’existe pas, ou l’apporteur est inactif.',
    deja: 'Cet artisan est déjà au registre.',
  }
  if (r?.etat !== 'ok') return NextResponse.json({ error: messages[r?.etat ?? ''] ?? 'Déclaration refusée.', code: r?.etat }, { status: 400 })
  return NextResponse.json({ ok: true, message: 'Apport déclaré, avec sa pièce.', ligne: r.ligne })
}
