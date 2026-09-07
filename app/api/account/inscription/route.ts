import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { authArtisan as verifierSession, estEchec } from '@/lib/authArtisan'
import { consommerLimite } from '@/lib/limites'
import { notifierEntreprise } from '@/lib/email'
import { lireApport, preuveDepuisCookie, CODE } from '@/lib/apports'
import { actif } from '@/lib/flags'

export const runtime = 'nodejs'

// Nouvel artisan inscrit → un email court à contact@prestiapp.fr (sprint J-1 §15).
//
// Pourquoi une route et pas un déclencheur SQL : le profil est créé côté navigateur (upsert
// PostgREST depuis /onboarding) et Postgres n'envoie pas d'email. La page appelle donc
// cette route juste après, avec le jeton de l'artisan — on ne notifie que pour le porteur
// du jeton, jamais pour un identifiant reçu dans le corps.
//
// Une seule notification par artisan : compteur atomique à 1 sur 24 h (lib/limites), et
// on n'annonce que les profils créés il y a moins d'une heure (rejouer la route sur un
// vieux compte n'envoie rien).
export async function POST(req: Request) {
  try {
    const session = await verifierSession(req)
    if (estEchec(session)) return NextResponse.json({ error: session.error }, { status: session.status })

    // Registre des apports (v10 J2) : si ce navigateur porte une empreinte d'apport signée — ou si un code a
    // été saisi à l'inscription — l'artisan y est inscrit avec sa preuve. Jamais bloquant : une erreur ici ne doit
    // pas gêner l'artisan qui vient de créer son compte.
    await rattacherApport(req, session.uid).catch(() => {})

    const { data: a } = await supabaseAdmin.from('artisans')
      .select('nom, email, metier, tel, slug, created_at').eq('id', session.uid).maybeSingle()
    if (!a) return NextResponse.json({ ok: true, notifie: false })

    const age = a.created_at ? Date.now() - new Date(a.created_at).getTime() : Infinity
    if (age > 60 * 60 * 1000) return NextResponse.json({ ok: true, notifie: false })
    if (!(await consommerLimite(`inscription:${session.uid}`, 1, 24 * 60 * 60))) return NextResponse.json({ ok: true, notifie: false })

    const r = await notifierEntreprise(
      `Nouvel artisan — ${a.nom || a.email || session.uid}`,
      `Un artisan vient de créer son profil.\n\nNom : ${a.nom || '—'}\nMétier : ${a.metier || '—'}\nEmail : ${a.email || '—'}\nTéléphone : ${a.tel || '—'}\nPage : https://prestiapp.fr/p/${a.slug || ''}\n\nÀ suivre dans /controle.`,
    )
    return NextResponse.json({ ok: true, notifie: r.ok })
  } catch (e) {
    console.error('[account/inscription]', e)
    return NextResponse.json({ ok: true, notifie: false }) // jamais bloquant pour l'artisan
  }
}

/** Inscrit l'artisan au registre des apports, si et seulement si le serveur peut le PROUVER. */
async function rattacherApport(req: Request, uid: string): Promise<void> {
  if (!actif('apports')) return
  const parLien = lireApport(req)
  let code = parLien?.code ?? null
  let source: 'lien' | 'code_saisi' = 'lien'
  let preuve: Record<string, unknown> | null = parLien ? preuveDepuisCookie(parLien) : null
  if (!code) {
    // Le code saisi par l'artisan lui-même : moins fort que le lien, et dit comme tel (statut « saisi »).
    const corps = (await req.clone().json().catch(() => null)) as { code_apport?: unknown } | null
    const saisi = typeof corps?.code_apport === 'string' ? corps.code_apport.toLowerCase().trim() : ''
    if (!CODE.test(saisi)) return
    code = saisi; source = 'code_saisi'
    preuve = { code: saisi, source: 'code_saisi', inscription: new Date().toISOString() }
  }
  const { data, error } = await supabaseAdmin.rpc('rattacher_apport', { p_artisan: uid, p_code: code, p_source: source, p_preuve: preuve })
  if (error) { console.error('[apports] rattachement :', error.message); return }
  if (data !== 'ok') console.log('[apports] non rattaché :', data)
}
