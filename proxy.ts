import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { surfaceDuDomaine } from '@/lib/surfaceDomaine'
import { stationHorsWebPourHote } from '@/lib/stationHorsWeb'

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
  // Tout sous-domaine de prestiapp.fr est maison : qg. (la console), www., et ceux à venir. Sans cette ligne,
  // les chemins de l'app (manifeste, sw.js, marque) renvoyaient la 404 artisan sur qg.prestiapp.fr (revue v9 J1).
  return h === 'prestiapp.fr' || h.endsWith('.prestiapp.fr') || h.endsWith('.vercel.app')
    || h === 'localhost' || h.endsWith('.localhost') || h.startsWith('127.0.0.1')
}

// Résout le slug d'un domaine perso (offre Signature) via Supabase REST. Ne s'exécute que pour
// un hôte custom (trafic rare) → coût négligeable sur le chemin chaud.
async function slugForDomain(host: string): Promise<{ slug: string; site_active: boolean | null } | null> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!base || !key) return null
  try {
    const r = await fetch(`${base}/rest/v1/artisans?domaine=eq.${encodeURIComponent(host)}&domaine_verifie=is.true&select=slug,site_active&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store',
    })
    if (!r.ok) return null
    const rows = await r.json()
    return Array.isArray(rows) && rows[0]?.slug ? rows[0] : null
  } catch { return null }
}

// Un site à la demande EN LIGNE sur son domaine (v15 §3.2) : tout le domaine est le site généré, servi par
// app/site-genere/[commande]. Même mécanique que slugForDomain : REST, hôte custom seulement, coût négligeable.
async function commandeForDomain(host: string): Promise<string | null> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!base || !key) return null
  try {
    const r = await fetch(`${base}/rest/v1/sites_commandes?domaine=eq.${encodeURIComponent(host)}&etat=eq.en_ligne&select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store',
    })
    if (!r.ok) return null
    const rows = await r.json()
    return Array.isArray(rows) && rows[0]?.id ? String(rows[0].id) : null
  } catch { return null }
}
// Un slug d'artisan : lettres, chiffres, tirets. Jamais un point (fichiers), jamais un chemin technique.
const SLUG_OK = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
// Chemins de l'APPLICATION Presti (manifeste, service worker, page hors-ligne, marque) : jamais servis sur un
// hôte qui n'est pas maison. Sans cela, mondomaine.fr/manifest.webmanifest renvoyait le manifeste « Presti »
// et /sw.js le worker Presti sur le domaine perso d'un artisan (revue v9 J1, 06/09). Le matcher ci-dessous laisse passer les chemins à point (seuls api et _next/ en sortent) : ils arrivent ici, et cette liste les refuse.
// station/ (026-179) : les thèmes de la carte (public/station/themes/<clé>/…) ne se servent jamais sur le domaine d'un artisan, comme marque/.
const CHEMINS_APP_PRESTI = /^\/(manifest\.webmanifest|sw\.js|hors-ligne(\.html)?|marque\/.*|station\/.*|\.well-known\/.*)$/
const CHEMINS_TECHNIQUES = new Set(['api', '_next', 'a', 'login', 'signup', 'onboarding', 'cgu', 'faq', 'mentions-legales', 'confidentialite', 'aide', 'site', 'p', 'controle'])

/** Traduit un chemin « à la marque » vers la route interne. `null` si ce n'est pas une surface artisan. */
function cibleInterne(slug: string, chemin: string): string | null {
  if (chemin === '/' || chemin === '') return `/site/${slug}`
  if (chemin === '/demande') return `/p/${slug}`
  if (chemin === '/infos-legales') return `/site/${slug}/infos-legales`
  return null
}

export async function proxy(req: NextRequest) {
  const host = (req.headers.get('host') || '').toLowerCase()
  const bare = host.replace(/:\d+$/, '')
  const chemin = req.nextUrl.pathname

  // Sous-domaine QG (poste de contrôle) — inchangé.
  if (bare.startsWith('qg.') && chemin === '/') {
    const url = req.nextUrl.clone(); url.pathname = '/controle'
    return NextResponse.rewrite(url)
  }

  // La station n'est pas servie depuis le site (demande de Benj, 05/10/2026) : 404 sur tout hôte non local. Voir lib/stationHorsWeb.ts.
  if ((chemin === '/controle/station' || chemin.startsWith('/controle/station/')) && stationHorsWebPourHote(bare)) {
    const url = req.nextUrl.clone(); url.pathname = '/_station-hors-web'
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
  // Un site généré en ligne sur ce domaine : tout le domaine est le site (chemins, fichiers, tout).
  const commande = await commandeForDomain(bare) || (bare.startsWith('www.') ? await commandeForDomain(bare.slice(4)) : null)
  if (commande) {
    const url = req.nextUrl.clone()
    url.pathname = `/site-genere/${commande}${chemin}`
    return NextResponse.rewrite(url)
  }
  const artisan = await slugForDomain(bare) || (bare.startsWith('www.') ? await slugForDomain(bare.slice(4)) : null)
  if (artisan) {
    const url = req.nextUrl.clone()
    const cible = chemin === '/' && surfaceDuDomaine({ siteActif: artisan.site_active, commandeEnLigne: false }) === 'contact'
      ? `/p/${artisan.slug}`
      : cibleInterne(artisan.slug, chemin)
    url.pathname = cible ?? `/site/${artisan.slug}${chemin}`
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

// On ne passe PAS par le proxy pour l'API ni pour _next/ : le matcher ne laisse sortir que ces deux préfixes. Un chemin à
// point (favicon.ico, robots.txt, manifest.webmanifest) arrive donc dans proxy() ; sur un hôte d'artisan, ceux de l'app Presti
// sont refusés par CHEMINS_APP_PRESTI.
export const config = { matcher: ['/((?!api|_next/).*)'] }
