// GET /site-genere/<commande>/<chemin…> — la diffusion d'un site généré à la demande (v15 §3.2).
//
// Deux cas, une seule route :
//   • la commande est EN LIGNE : tout le monde peut lire (c'est le site de l'artisan, servi sous son domaine par le
//     middleware, ou sous ce chemin sur prestiapp.fr) — cache long, index autorisé ;
//   • sinon : APERÇU PRIVÉ — il faut le jeton (`?apercu=<jeton>`, posé ensuite en cookie pour naviguer), la réponse
//     porte `X-Robots-Tag: noindex` et n'est pas mise en cache. Sans jeton : 404 neutre, comme si rien n'existait.
// Sur un hôte Presti (aperçu), les liens absolus du HTML/CSS sont réécrits pour rester sous /site-genere/<id>/.
import { createHash, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { cheminObjet, lireFichier, reecrireLiens } from '@/lib/sitesGeneres'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const introuvable = () => new NextResponse('Page introuvable.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noindex' } })
const hotePresti = (h: string) => { const x = h.replace(/:\d+$/, '').toLowerCase(); return x === 'prestiapp.fr' || x.endsWith('.prestiapp.fr') || x.endsWith('.vercel.app') || x === 'localhost' || x.startsWith('127.0.0.1') }

export async function GET(req: Request, ctx: { params: Promise<{ commande: string; chemin?: string[] }> }) {
  const { commande, chemin } = await ctx.params
  if (!UUID.test(commande)) return introuvable()
  const { data: c } = await supabaseAdmin.from('sites_commandes').select('id, etat, apercu_jeton').eq('id', commande).maybeSingle()
  if (!c) return introuvable()
  const url = new URL(req.url)
  const enLigne = c.etat === 'en_ligne'
  const nomCookie = `presti_apercu_${c.id.slice(0, 8)}`
  let jetonRecu: string | null = null
  if (!enLigne) {
    const cookie = req.headers.get('cookie') ?? ''
    const m = cookie.match(new RegExp(`(?:^|;\\s*)${nomCookie}=([^;]+)`))
    jetonRecu = url.searchParams.get('apercu') || (m ? decodeURIComponent(m[1]) : null)
    if (!c.apercu_jeton || !jetonRecu || !memeJeton(jetonRecu, c.apercu_jeton)) return introuvable()
  }
  const cheminUrl = '/' + (chemin ?? []).join('/') + (url.pathname.endsWith('/') && (chemin ?? []).length ? '/' : '')
  const objet = cheminObjet(c.id, cheminUrl)
  if (!objet) return introuvable()
  const fichier = await lireFichier(objet)
  if (!fichier) return introuvable()

  const entetes: Record<string, string> = { 'Content-Type': fichier.type }
  // Servi sur un domaine Presti, le site généré partage l'origine de l'espace artisan (et sa session dans le
  // stockage du navigateur). Le bac à sable lui donne une origine opaque : ses scripts tournent, mais ne
  // lisent plus rien de prestiapp.fr (audit offensif du 11/10, M3). Sur le domaine de l'artisan : inchangé.
  if (hotePresti(req.headers.get('host') ?? '')) entetes['Content-Security-Policy'] = 'sandbox allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation'
  let corps: ArrayBuffer | string = fichier.corps
  const texte = fichier.type.startsWith('text/html') || fichier.type.startsWith('text/css')
  if (texte && hotePresti(req.headers.get('host') ?? '')) corps = reecrireLiens(new TextDecoder().decode(fichier.corps), c.id, fichier.type)
  if (enLigne) {
    entetes['Cache-Control'] = texte ? 'public, max-age=300, s-maxage=3600' : 'public, max-age=86400, s-maxage=604800, immutable'
  } else {
    entetes['Cache-Control'] = 'private, no-store'
    entetes['X-Robots-Tag'] = 'noindex, nofollow'
    // Le jeton reçu en query est posé en cookie pour que les liens internes de l'aperçu marchent sans le répéter.
    if (url.searchParams.get('apercu')) entetes['Set-Cookie'] = `${nomCookie}=${encodeURIComponent(jetonRecu ?? '')}; Path=/site-genere/${c.id}; HttpOnly; SameSite=Lax; Max-Age=86400${url.protocol === 'https:' ? '; Secure' : ''}`
  }
  return new NextResponse(corps, { status: 200, headers: entetes })
}

/** Comparaison en temps constant : la durée de la réponse ne dit rien du jeton attendu. */
function memeJeton(recu: string, attendu: string): boolean {
  const a = createHash('sha256').update(recu).digest()
  const b = createHash('sha256').update(attendu).digest()
  return timingSafeEqual(a, b)
}
