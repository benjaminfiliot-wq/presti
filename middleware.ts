import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Le sous-domaine qg.prestiapp.fr = le QG (poste de contrôle), séparé de l'app client.
// La racine de qg.* est réécrite vers /controle ; les autres chemins (login, /devis/…) restent normaux.
export function middleware(req: NextRequest) {
  const host = req.headers.get('host') || ''
  if (host.startsWith('qg.') && req.nextUrl.pathname === '/') {
    const url = req.nextUrl.clone()
    url.pathname = '/controle'
    return NextResponse.rewrite(url)
  }
  return NextResponse.next()
}

export const config = { matcher: ['/'] }
