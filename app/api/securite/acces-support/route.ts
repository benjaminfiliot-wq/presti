import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { authArtisan, estEchec } from '@/lib/authArtisan'
import { actif } from '@/lib/flags'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// L'écran de l'artisan sur les accès de support. C'est ici, et nulle part ailleurs, que la porte
// s'ouvre.
//
//   GET  → ses demandes, ses accès, ce qui a été lu, et son verrou.
//   POST → { acces, decision: 'ouvrir' | 'refuser' | 'fermer' }
//          { decision: 'verrouiller' | 'deverrouiller' }  — sans `acces` : ça porte sur le compte.
//
// Le fondateur n'a aucun chemin vers cette route : elle passe par `authArtisan`, et l'identifiant
// transmis aux fonctions SQL vient de la SESSION, jamais du corps de la requête. Les fonctions
// revérifient elles-mêmes que la fenêtre appartient bien à celui qui parle — le contrôle est en
// base, pas seulement ici.
//
// OUVRIR est le seul geste qui demande de la volonté. REFUSER et FERMER ne demandent rien : pas de
// confirmation, pas d'explication, pas de « êtes-vous sûr ». Une fermeture qu'on rend pénible est
// une fermeture qui n'arrive pas.

export async function GET(req: Request) {
  if (!actif('supportArtisan')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  const s = await authArtisan(req)
  if (estEchec(s)) return NextResponse.json({ error: s.error }, { status: s.status })

  const [acces, lectures, verrou] = await Promise.all([
    supabaseAdmin.from('acces_support')
      .select('id, element_type, element_titre, motif, demande_le, notifie_le, ouvert_le, expire_le, refuse_le, ferme_le, ferme_motif')
      .eq('artisan_id', s.uid).order('demande_le', { ascending: false }).limit(50),
    supabaseAdmin.from('acces_support_lectures')
      .select('id, acces_id, vue, element_type, acteur_nom, lu_le')
      .eq('artisan_id', s.uid).order('lu_le', { ascending: false }).limit(200),
    supabaseAdmin.from('support_verrou').select('pose_le').eq('artisan_id', s.uid).maybeSingle(),
  ])

  const maintenant = Date.now()
  const lignes = (acces.data ?? []).map((a) => ({
    ...a,
    // L'état est calculé ici et nulle part ailleurs : deux écrans qui le déduiraient chacun de leur
    // côté finiraient par ne pas dire la même chose.
    etat: a.refuse_le ? 'refuse'
      : a.ferme_le ? 'ferme'
      : a.ouvert_le && a.expire_le && Date.parse(a.expire_le) > maintenant ? 'ouvert'
      : a.ouvert_le ? 'expire'
      : a.notifie_le ? 'en_attente'
      : 'non_notifie',
    lectures: (lectures.data ?? []).filter((l) => l.acces_id === a.id).length,
  }))

  return NextResponse.json({
    acces: lignes,
    lectures: lectures.data ?? [],
    verrou: verrou.data ? { pose_le: verrou.data.pose_le } : null,
    // Écrit ici plutôt que dans l'écran : la promesse et le code doivent venir du même endroit.
    promesse: 'Un accès de support dure une heure, ne montre que la forme de l’élément — jamais le contenu de vos échanges, ni les coordonnées de vos clients, ni vos photos — et chaque consultation est inscrite ci-dessous.',
    a: new Date().toISOString(),
  })
}

export async function POST(req: Request) {
  if (!actif('supportArtisan')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  const s = await authArtisan(req)
  if (estEchec(s)) return NextResponse.json({ error: s.error }, { status: s.status })

  const b = (await req.json().catch(() => null)) as { acces?: unknown; decision?: unknown; motif?: unknown } | null
  const acces = typeof b?.acces === 'string' && /^[0-9a-f-]{36}$/i.test(b.acces) ? b.acces : ''
  const decision = typeof b?.decision === 'string' ? b.decision : ''
  // Le verrou porte sur le COMPTE, pas sur une fenêtre : lui réclamer un identifiant d'accès serait
  // un refus incompréhensible pour l'artisan qui veut juste fermer la porte une fois pour toutes.
  const SUR_UNE_FENETRE = ['ouvrir', 'refuser', 'fermer']
  const SUR_LE_COMPTE = ['verrouiller', 'deverrouiller']
  if (![...SUR_UNE_FENETRE, ...SUR_LE_COMPTE].includes(decision)) return NextResponse.json({ error: 'Décision inconnue.' }, { status: 400 })
  if (SUR_UNE_FENETRE.includes(decision) && !acces) return NextResponse.json({ error: 'Demande inconnue.' }, { status: 400 })

  const { data: a } = await supabaseAdmin.from('artisans').select('email').eq('id', s.uid).maybeSingle()
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  const agent = 'espace artisan'

  if (SUR_LE_COMPTE.includes(decision)) {
    const pose = decision === 'verrouiller'
    const { data, error } = await supabaseAdmin.rpc('regler_verrou_support', {
      p_artisan: s.uid, p_pose: pose, p_email: a?.email ?? '', p_ip: ip, p_agent: agent,
    })
    if (error) { console.error('[support] verrou :', error.message); return NextResponse.json({ error: 'Rien n’a été fait.' }, { status: 503 }) }
    const r = data as { etat?: string; fenetres?: number }
    if (r?.etat === 'deja') return NextResponse.json({ ok: true, verrou: pose, message: pose ? 'Le verrou était déjà posé.' : 'Le verrou était déjà levé.' })
    if (r?.etat !== 'ok') return NextResponse.json({ error: 'Rien n’a été fait.' }, { status: 400 })
    // Le nombre de fenêtres refermées est dit, jamais tu : poser le verrou ferme ce qui était ouvert,
    // et l'artisan doit savoir que ça vient de se produire.
    return NextResponse.json({
      ok: true, verrou: pose,
      message: pose
        ? `Verrou posé. Personne ne peut plus demander à regarder votre compte${r.fenetres ? ` — ${r.fenetres} accès en cours ${r.fenetres > 1 ? 'ont été fermés' : 'a été fermé'}` : ''}.`
        : 'Verrou levé. Presti pourra de nouveau demander — et vous devrez toujours accepter.',
    })
  }

  if (decision === 'ouvrir') {
    const { data, error } = await supabaseAdmin.rpc('ouvrir_acces_support', {
      p_acces: acces, p_artisan: s.uid, p_artisan_email: a?.email ?? '', p_ip: ip, p_agent: agent,
    })
    if (error) { console.error('[support] ouvrir :', error.message); return NextResponse.json({ error: 'Rien n’a été fait.' }, { status: 503 }) }
    const r = data as { etat?: string; expire_le?: string; titre?: string }
    const REFUS: Record<string, string> = {
      inconnu: 'Cette demande n’existe pas.',
      refuse: 'Vous avez déjà refusé cette demande.',
      deja: 'Cet accès est déjà ouvert.',
      non_notifie: 'Cette demande n’a pas été confirmée : elle ne peut pas s’ouvrir.',
      ticket_ferme: 'La demande d’aide correspondante est close.',
    }
    if (r?.etat !== 'ok') return NextResponse.json({ error: REFUS[r?.etat ?? ''] ?? 'Ouverture impossible.', expire_le: r?.expire_le }, { status: 400 })
    return NextResponse.json({
      ok: true, expire_le: r.expire_le,
      message: `Accès ouvert pour une heure sur ${r.titre || 'cet élément'}. Vous pouvez le refermer quand vous voulez.`,
    })
  }

  if (decision === 'refuser') {
    const motif = typeof b?.motif === 'string' ? b.motif.trim().slice(0, 120) : ''
    const { data, error } = await supabaseAdmin.rpc('refuser_acces_support', {
      p_acces: acces, p_motif: motif, p_par: s.uid, p_par_email: a?.email ?? '', p_ip: ip, p_agent: agent,
    })
    if (error) { console.error('[support] refuser :', error.message); return NextResponse.json({ error: 'Rien n’a été fait.' }, { status: 503 }) }
    const r = data as { etat?: string }
    if (r?.etat === 'deja_ouvert') return NextResponse.json({ error: 'Cet accès est déjà ouvert : fermez-le plutôt.' }, { status: 400 })
    if (r?.etat !== 'ok' && r?.etat !== 'deja') return NextResponse.json({ error: 'Cette demande n’existe pas.' }, { status: 400 })
    return NextResponse.json({ ok: true, message: 'Refusé. Nous ne redemanderons pas la même chose.' })
  }

  const { data, error } = await supabaseAdmin.rpc('fermer_acces_support', {
    p_acces: acces, p_motif: 'artisan', p_par: s.uid, p_par_email: a?.email ?? '', p_ip: ip, p_agent: agent,
  })
  if (error) { console.error('[support] fermer :', error.message); return NextResponse.json({ error: 'Rien n’a été fait.' }, { status: 503 }) }
  const r = data as { etat?: string; lectures?: number }
  if (r?.etat !== 'ok' && r?.etat !== 'deja') return NextResponse.json({ error: 'Cette demande n’existe pas.' }, { status: 400 })
  return NextResponse.json({
    ok: true,
    message: r?.etat === 'deja' ? 'Cet accès était déjà fermé.'
      : `Accès fermé. ${r.lectures ?? 0} consultation${(r.lectures ?? 0) > 1 ? 's ont' : ' a'} eu lieu — vous en avez le détail ci-dessous.`,
  })
}
