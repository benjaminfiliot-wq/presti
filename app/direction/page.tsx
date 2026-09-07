'use client'

import { Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/app/AppShell'
import { apiDirection } from './client'
import Aujourdhui from './Aujourdhui'
import Journal from './Journal'
import Clients from './Clients'
import Apports from './Apports'
import { actif } from '@/lib/flags'

// Le Centre de direction (prompt v10) — un seul écran, des vues (rail d'onglets, motif app/parametres/page.tsx).
// J1 : « Aujourd'hui » et « Journal ». Les onglets suivants (Clients & abonnements, Messagerie, Comptabilité,
// Santé, Artisans, Réglages) n'apparaissent que livrés : rien de non fini n'est visible.
//
// L'accès se vérifie sur la route la plus LÉGÈRE (`journal?limite=1`, une lecture) et non plus sur l'état complet
// (six appels réseau) : l'écran s'ouvrait en huit secondes, et une base muette (migration pas encore collée, 503)
// ou un plafond atteint (429) le laissaient sur « Vérification de l'accès… » pour toujours (revue du 07/09).
type Onglet = 'aujourdhui' | 'clients' | 'apports' | 'journal'
type Message = { type: 'ok' | 'err'; text: string } | null
const ONGLETS: Onglet[] = actif('apports') ? ['aujourdhui', 'clients', 'apports', 'journal'] : ['aujourdhui', 'journal']
const TITRES: Record<Onglet, string> = { aujourdhui: 'Aujourd’hui', clients: 'Clients & abonnements', apports: 'Apports', journal: 'Journal' }
const ic = (d: ReactNode) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
const NAV: { id: Onglet; label: string; detail: string; icone: ReactNode }[] = [
  { id: 'aujourdhui', label: 'Aujourd’hui', detail: 'État, à faire, chiffres, fil', icone: ic(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>) },
  { id: 'clients', label: 'Clients', detail: 'Offres, crédits, canal d’arrivée', icone: ic(<><circle cx="9" cy="8" r="3" /><path d="M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1" /><path d="M17 8h4M19 6v4" /></>) },
  { id: 'apports', label: 'Apports', detail: 'Qui a amené qui, et la preuve', icone: ic(<><path d="M4 12h8M12 8l4 4-4 4" /><path d="M16 4h4v16h-4" /></>) },
  { id: 'journal', label: 'Journal', detail: 'Chaque action, avant et après', icone: ic(<><path d="M4 4h12l4 4v12H4z" /><path d="M8 12h8M8 16h5" /></>) },
]

function DirectionInner() {
  const router = useRouter()
  const params = useSearchParams()
  const [role, setRole] = useState<'direction' | 'lecture' | null>(null)
  const [refus, setRefus] = useState<string | null>(null)
  const [msg, setMsg] = useState<Message>(null)
  const minuteur = useRef<number | undefined>(undefined)
  const demande = params.get('onglet')
  const onglet: Onglet = ONGLETS.includes(demande as Onglet) ? (demande as Onglet) : 'aujourdhui'

  const verifier = useCallback(async () => {
    setRefus(null)
    const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }))
    if (!data.session) { router.replace(`/login?retour=${encodeURIComponent(window.location.pathname + window.location.search)}`); return }
    const r = await apiDirection<{ role?: 'direction' | 'lecture' }>('/api/direction/journal?limite=1')
    if (r.status === 403 || r.status === 404) { router.replace('/dashboard'); return }
    if (r.status === 401) { router.replace(`/login?retour=${encodeURIComponent(window.location.pathname + window.location.search)}`); return }
    // 503 (migration absente, base injoignable), 429, réseau : on le DIT, avec de quoi réessayer.
    if (!r.ok) { setRefus(r.data.error ?? 'Direction indisponible pour l’instant.'); return }
    setRole(r.data.role ?? 'direction')
  }, [router])

  useEffect(() => { void verifier() }, [verifier])
  useEffect(() => () => window.clearTimeout(minuteur.current), [])

  const signaler = useCallback((m: Exclude<Message, null>) => {
    setMsg(m)
    window.clearTimeout(minuteur.current)
    minuteur.current = window.setTimeout(() => setMsg(null), 6000)
  }, [])
  function aller(e: React.MouseEvent, id: Onglet) { e.preventDefault(); setMsg(null); router.replace(`/direction?onglet=${id}`, { scroll: false }) }

  return (
    <AppShell active="direction" title="Direction" crumb={TITRES[onglet]} wide>
      <div className="param-layout dir-layout">
        <nav className="param-nav" aria-label="Vues de la direction">
          <div className="param-nav-grp">
            <div className="param-nav-lab">Direction{role === 'lecture' ? ' · lecture' : ''}</div>
            {NAV.filter((e) => ONGLETS.includes(e.id)).map((e) => (
              <a key={e.id} href={`/direction?onglet=${e.id}`} className={onglet === e.id ? 'on' : ''} aria-current={onglet === e.id ? 'page' : undefined} onClick={(ev) => aller(ev, e.id)}>
                {e.icone}<span><b>{e.label}</b><small>{e.detail}</small></span>
              </a>
            ))}
          </div>
        </nav>
        <div className="param-main dir-main" key={onglet}>
          {refus ? (
            <div className="tool-card" data-direction-refus>
              <h2>La direction ne répond pas</h2>
              <p className="notif-erreur" role="alert">{refus}</p>
              <p className="muted">Si la migration <code>0065</code> vient d’être collée, réessayez. Sinon, l’espace se rouvrira de lui-même dès que la base répondra.</p>
              <button type="button" className="btn btn--primary" onClick={() => void verifier()}>Réessayer</button>
            </div>
          ) : role === null ? <div className="tool-card"><p className="muted">Vérification de l’accès…</p></div>
            : onglet === 'clients' ? <Clients />
            : onglet === 'apports' ? <Apports role={role} signaler={signaler} />
            : onglet === 'journal' ? <Journal role={role} />
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
