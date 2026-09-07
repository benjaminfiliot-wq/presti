import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getIp, isBanned } from '@/lib/security'
import { consommerLimite } from '@/lib/limites'
import { CODE, valeurCookie, enteteCookieApport } from '@/lib/apports'
import { actif } from '@/lib/flags'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /a/<code> — le lien d'apport (prompt v10 §2.2). Il pose une empreinte signée puis renvoie à l'accueil.
//
// Ce que cette route NE fait pas : afficher quoi que ce soit, dire si le code existe (un code inconnu redirige
// exactement pareil — inutile d'offrir un moyen de deviner les codes), écrire en base, ni suivre qui que ce soit
// au-delà de cette unique finalité.
export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params
  const propre = (code || '').toLowerCase().trim()
  const accueil = new URL('/', req.url)
  const ip = getIp(req)

  // Un lien public : on le protège comme les autres (ban, plafond), sans jamais bloquer un visiteur légitime.
  // Sans la migration 0067, aucun apporteur n'existe : le lien renvoie à l'accueil, sans empreinte.
  if (!actif('apports')) return NextResponse.redirect(accueil, 302)
  if (await isBanned(ip)) return NextResponse.redirect(accueil, 302)
  if (!CODE.test(propre)) return NextResponse.redirect(accueil, 302)
  if (!(await consommerLimite(`apport:${ip}`, 30, 3600))) return NextResponse.redirect(accueil, 302)

  const { data: apporteur } = await supabaseAdmin.from('apporteurs').select('code').eq('code', propre).eq('actif', true).maybeSingle()
  const reponse = NextResponse.redirect(accueil, 302)
  // Code inconnu : même redirection, sans cookie. Le visiteur ne voit aucune différence.
  if (!apporteur) return reponse

  const referent = req.headers.get('referer')
  reponse.headers.set('Set-Cookie', enteteCookieApport(valeurCookie(propre, referent ? new URL(referent).host : undefined)))
  return reponse
}
