'use client'

import { Suspense, useCallback, useEffect, useState, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/app/AppShell'
import { apiDirection } from './client'
import Aujourdhui from './Aujourdhui'
import Journal from './Journal'

// Le Centre de direction (prompt v10) — un seul écran, des vues (rail d'onglets, motif app/parametres/page.tsx).
// J1 : « Aujourd'hui » et « Journal ». Les onglets suivants (Clients & abonnements, Messagerie, Comptabilité,
// Santé, Artisans, Réglages) n'apparaissent que livrés : rien de non fini n'est visible.
type Onglet = 'aujourdhui' | 'journal'
type Message = { type: 'ok' | 'err'; text: string } | null
const ONGLETS: Onglet[] = ['aujourdhui', 'journal']
const TITRES: Record<Onglet, string> = { aujourdhui: 'Aujourd’hui', journal: 'Journal' }
const ic = (d: ReactNode) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
const NAV: { id: Onglet; label: string; detail: string; icone: ReactNode }[] = [
  { id: 'aujourdhui', label: 'Aujourd’hui', detail: 'État, à faire, chiffres, fil', icone: ic(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>) },
  { id: 'journal', label: 'Journal', detail: 'Chaque action, avant et après', icone: ic(<><path d="M4 4h12l4 4v12H4z" /><path d="M8 12h8M8 16h5" /></>) },
]

function DirectionInner() {
  const router = useRouter()
  const params = useSearchParams()
  const [role, setRole] = useState<'direction' | 'lecture' | null>(null)
  const [msg, setMsg] = useState<Message>(null)
  const demande = params.get('onglet')
  const onglet: Onglet = ONGLETS.includes(demande as Onglet) ? (demande as Onglet) : 'aujourdhui'

  useEffect(() => {
    // Garde cliente : sans session → connexion ; pas fondateur (403) ou espace fermé (404) → tableau de bord.
    // La vraie garde est côté API (lib/direction/garde.ts) : cette page ne contient aucune donnée.
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const r = await apiDirection<{ role?: 'direction' | 'lecture' }>('/api/direction/etat')
      if (r.status === 403 || r.status === 404) { router.replace('/dashboard'); return }
      if (r.status === 401) { router.replace('/login'); return }
      setRole(r.data.role ?? 'direction')
    })
  }, [router])

  const signaler = useCallback((m: Exclude<Message, null>) => { setMsg(m); setTimeout(() => setMsg(null), 6000) }, [])
  function aller(e: React.MouseEvent, id: Onglet) { e.preventDefault(); setMsg(null); router.replace(`/direction?onglet=${id}`, { scroll: false }) }

  return (
    <AppShell active="direction" title="Direction" crumb={TITRES[onglet]} wide>
      <div className="param-layout dir-layout">
        <nav className="param-nav" aria-label="Vues de la direction">
          <div className="param-nav-grp">
            <div className="param-nav-lab">Direction{role === 'lecture' ? ' · lecture' : ''}</div>
            {NAV.map((e) => (
              <a key={e.id} href={`/direction?onglet=${e.id}`} className={onglet === e.id ? 'on' : ''} aria-current={onglet === e.id ? 'page' : undefined} onClick={(ev) => aller(ev, e.id)}>
                {e.icone}<span><b>{e.label}</b><small>{e.detail}</small></span>
              </a>
            ))}
          </div>
        </nav>
        <div className="param-main dir-main" key={onglet}>
          {role === null ? <div className="tool-card"><p className="muted">Vérification de l’accès…</p></div>
            : onglet === 'journal' ? <Journal />
            : <Aujourdhui role={role} signaler={signaler} />}
          {msg ? <div className={`msg${msg.type === 'err' ? ' err' : ''}`} role="status">{msg.text}</div> : null}
        </div>
      </div>
    </AppShell>
  )
}

export default function DirectionPage() {
  return <Suspense fallback={<AppShell active="direction" title="Direction"><div className="tool-card"><p className="muted">Chargement…</p></div></AppShell>}><DirectionInner /></Suspense>
}
