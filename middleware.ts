import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Les surfaces de l'artisan (site, plateforme) sont servies sur DES ADRESSES SANS « PRESTI »
// (v5, demande de Benj). Trois hôtes possibles, résolus ici vers les routes internes :
//
//   <slug>.<domaine-neutre>      /            → /site/<slug>
//                                /demande     → /p/<slug>
//                                /infos-legales → /site/<slug>/infos-legales
//   <domaine-neutre>             /<slug>, /<slug>/demande, /<slug>/infos-legales  (sans DNS joker)
//   <domaine perso de l'artisan> /, /demande, /infos-legales                       (offre Signature)
//
// prestiapp.fr, *.vercel.app et localhost ne sont JAMAIS réécrits : ce sont les hôtes maison.

const DOMAINE_NEUTRE = (process.env.NEXT_PUBLIC_DOMAINE_NEUTRE || '').trim().toLowerCase() || null

// Hôtes « maison » (jamais un domaine perso d'artisan) → aucune réécriture multi-tenant.
function isPrestiHost(host: string): boolean {
  const h = host.replace(/:\d+$/, '')
  return h === 'prestiapp.fr' || h === 'www.prestiapp.fr' || h.endsWith('.vercel.app')
    || h === 'localhost' || h.endsWith('.localhost') || h.startsWith('127.0.0.1')
}

// Résout le slug d'un domaine perso (offre Signature) via Supabase REST. Ne s'exécute que pour
// un hôte custom (trafic rare) → coût négligeable sur le chemin chaud.
async function slugForDomain(host: string): Promise<string | null> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!base || !key) return null
  try {
    const r = await fetch(`${base}/rest/v1/artisans?domaine=eq.${encodeURIComponent(host)}&domaine_verifie=is.true&select=slug&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store',
    })
    if (!r.ok) return null
    const rows = await r.json()
    return Array.isArray(rows) && rows[0]?.slug ? rows[0].slug : null
  } catch { return null }
}

// Un slug d'artisan : lettres, chiffres, tirets. Jamais un point (fichiers), jamais un chemin technique.
const SLUG_OK = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
// Chemins de l'APPLICATION Presti (manifeste, service worker, page hors-ligne, marque) : jamais servis sur un
// hôte qui n'est pas maison. Sans cela, mondomaine.fr/manifest.webmanifest renvoyait le manifeste « Presti »
// et /sw.js le worker Presti sur le domaine perso d'un artisan (revue v9 J1, 06/09). Ces chemins portent un
// point : le matcher général les exclut, ils sont donc listés à part dans `config.matcher`.
const CHEMINS_APP_PRESTI = /^\/(manifest\.webmanifest|sw\.js|hors-ligne(\.html)?|marque\/.*)$/
const CHEMINS_TECHNIQUES = new Set(['api', '_next', 'login', 'signup', 'onboarding', 'cgu', 'faq', 'mentions-legales', 'confidentialite', 'aide', 'site', 'p', 'controle'])

/** Traduit un chemin « à la marque » vers la route interne. `null` si ce n'est pas une surface artisan. */
function cibleInterne(slug: string, chemin: string): string | null {
  if (chemin === '/' || chemin === '') return `/site/${slug}`
  if (chemin === '/demande') return `/p/${slug}`
  if (chemin === '/infos-legales') return `/site/${slug}/infos-legales`
  return null
}

export async function middleware(req: NextRequest) {
  const host = (req.headers.get('host') || '').toLowerCase()
  const bare = host.replace(/:\d+$/, '')
  const chemin = req.nextUrl.pathname

  // Sous-domaine QG (poste de contrôle) — inchangé.
  if (bare.startsWith('qg.') && chemin === '/') {
    const url = req.nextUrl.clone(); url.pathname = '/controle'
    return NextResponse.rewrite(url)
  }

  if (isPrestiHost(bare)) return NextResponse.next()

  // Hôte d'artisan (sous-domaine neutre, domaine neutre, domaine perso) : les chemins de l'app Presti n'y
  // existent pas → la 404 neutre du segment /site (white-label), quel que soit l'artisan.
  if (CHEMINS_APP_PRESTI.test(chemin)) {
    const url = req.nextUrl.clone(); url.pathname = '/site/-/introuvable'
    return NextResponse.rewrite(url)
  }

  // Domaine neutre de Presti, en sous-domaine : <slug>.<neutre>
  if (DOMAINE_NEUTRE && bare.endsWith(`.${DOMAINE_NEUTRE}`)) {
    const slug = bare.slice(0, -(DOMAINE_NEUTRE.length + 1))
    if (slug === 'www') {
      // www.<neutre>/<slug>… se comporte comme <neutre>/<slug>…
    } else if (SLUG_OK.test(slug)) {
      const cible = cibleInterne(slug, chemin)
      if (cible) { const url = req.nextUrl.clone(); url.pathname = cible; return NextResponse.rewrite(url) }
      return NextResponse.next()
    }
  }

  // Domaine neutre en chemin : <neutre>/<slug>[/demande|/infos-legales]
  if (DOMAINE_NEUTRE && (bare === DOMAINE_NEUTRE || bare === `www.${DOMAINE_NEUTRE}`)) {
    const [, premier = '', ...reste] = chemin.split('/')
    if (premier && SLUG_OK.test(premier) && !CHEMINS_TECHNIQUES.has(premier)) {
      const cible = cibleInterne(premier, '/' + reste.join('/'))
      if (cible) { const url = req.nextUrl.clone(); url.pathname = cible; return NextResponse.rewrite(url) }
    }
    return NextResponse.next()
  }

  // Domaine perso : la racine sert le site, /demande la plateforme, /infos-legales les mentions.
  // Domaine perso d'un artisan (vérifié en base — un domaine saisi mais jamais vérifié ne
  // détourne rien). Les trois surfaces sont réécrites ; TOUT AUTRE chemin est envoyé sous
  // /site/<slug>/… où l'attrape-tout sert la 404 de l'artisan : avant, mondomaine.fr/login ou
  // /cgu servaient les pages de Presti sur le domaine de l'artisan (suite domaine-perso-e2e).
  const slug = await slugForDomain(bare) || (bare.startsWith('www.') ? await slugForDomain(bare.slice(4)) : null)
  if (slug) {
    const url = req.nextUrl.clone()
    url.pathname = cibleInterne(slug, chemin) ?? `/site/${slug}${chemin}`
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

// On ne passe PAS par le middleware pour les fichiers statiques ni l'API : le matcher exclut
// tout chemin contenant un point (favicon.ico, robots.txt, images) et les routes techniques.
// Les chemins de l'app Presti (avec un point) y sont ajoutés explicitement : voir CHEMINS_APP_PRESTI.
export const config = { matcher: ['/((?!api|_next|.*\\..*).*)', '/manifest.webmanifest', '/sw.js', '/hors-ligne.html', '/marque/:path*'] }
