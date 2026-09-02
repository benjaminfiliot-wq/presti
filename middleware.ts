import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Hôtes « maison » (jamais un domaine perso d'artisan) → aucune réécriture multi-tenant.
function isPrestiHost(host: string): boolean {
  const h = host.replace(/:\d+$/, '')
  return h === 'prestiapp.fr' || h === 'www.prestiapp.fr' || h.endsWith('.vercel.app')
    || h === 'localhost' || h.endsWith('.localhost') || h.startsWith('127.0.0.1')
}

// Résout le slug d'un domaine perso (offre Signature) via Supabase REST. Ne s'exécute que pour
// un hôte custom sur la racine « / » (trafic rare) → coût négligeable sur le chemin chaud.
async function slugForDomain(host: string): Promise<string | null> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!base || !key) return null
  try {
    const r = await fetch(`${base}/rest/v1/artisans?domaine=eq.${encodeURIComponent(host)}&select=slug&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store',
    })
    if (!r.ok) return null
    const rows = await r.json()
    return Array.isArray(rows) && rows[0]?.slug ? rows[0].slug : null
  } catch { return null }
}

export async function middleware(req: NextRequest) {
  const host = (req.headers.get('host') || '').toLowerCase()

  // Sous-domaine QG (poste de contrôle) — inchangé.
  if (host.startsWith('qg.') && req.nextUrl.pathname === '/') {
    const url = req.nextUrl.clone(); url.pathname = '/controle'
    return NextResponse.rewrite(url)
  }

  // Domaine perso : la racine du domaine de l'artisan sert son site vitrine.
  if (req.nextUrl.pathname === '/' && !isPrestiHost(host)) {
    const bare = host.replace(/:\d+$/, '')
    const slug = await slugForDomain(bare) || (bare.startsWith('www.') ? await slugForDomain(bare.slice(4)) : null)
    if (slug) {
      const url = req.nextUrl.clone(); url.pathname = `/site/${slug}`
      return NextResponse.rewrite(url)
    }
  }

  return NextResponse.next()
}

export const config = { matcher: ['/'] }
