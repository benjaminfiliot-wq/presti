'use client'

import { Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/app/AppShell'
import { apiDirection } from './client'
import Aujourdhui from './Aujourdhui'
import Journal from './Journal'
import Clients from './Clients'
import Fiche from './Fiche'
import Apports from './Apports'
import Messagerie from './Messagerie'
import { actif } from '@/lib/flags'

// Le Poste de contrôle (prompt v11 §1) — UN seul écran depuis lequel Benj dirige l'entreprise.
// Il a d'abord vécu sous /direction (v10) à côté d'un /controle « façon Jarvis » ; les deux ont
// fusionné ici, et l'ancienne adresse redirige en permanence.
// J1 : « Aujourd'hui » et « Journal ». Les onglets suivants (Clients & abonnements, Messagerie, Comptabilité,
// Santé, Artisans, Réglages) n'apparaissent que livrés : rien de non fini n'est visible.
//
// L'accès se vérifie sur la route la plus LÉGÈRE (`journal?limite=1`, une lecture) et non plus sur l'état complet
// (six appels réseau) : l'écran s'ouvrait en huit secondes, et une base muette (migration pas encore collée, 503)
// ou un plafond atteint (429) le laissaient sur « Vérification de l'accès… » pour toujours (revue du 07/09).
type Onglet = 'aujourdhui' | 'clients' | 'apports' | 'messagerie' | 'journal'
type Message = { type: 'ok' | 'err'; text: string } | null
// Le rail ne montre que ce qui existe : un onglet dont la migration n'est pas collée mènerait à un 404.
const ONGLETS: Onglet[] = [
  'aujourdhui' as const,
  ...(actif('apports') ? (['clients', 'apports'] as const) : []),
  ...(actif('messagerie') ? (['messagerie'] as const) : []),
  'journal' as const,
]
const TITRES: Record<Onglet, string> = { aujourdhui: 'Aujourd’hui', clients: 'Clients & abonnements', apports: 'Apports', messagerie: 'Messagerie', journal: 'Journal' }
const ic = (d: ReactNode) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
const NAV: { id: Onglet; label: string; detail: string; icone: ReactNode }[] = [
  { id: 'aujourdhui', label: 'Aujourd’hui', detail: 'État, à faire, chiffres, fil', icone: ic(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>) },
  { id: 'clients', label: 'Clients', detail: 'Offres, crédits, canal d’arrivée', icone: ic(<><circle cx="9" cy="8" r="3" /><path d="M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1" /><path d="M17 8h4M19 6v4" /></>) },
  { id: 'apports', label: 'Apports', detail: 'Qui a amené qui, et la preuve', icone: ic(<><path d="M4 12h8M12 8l4 4-4 4" /><path d="M16 4h4v16h-4" /></>) },
  { id: 'messagerie', label: 'Messagerie', detail: 'Les emails de l’entreprise', icone: ic(<><path d="M3 6h18v12H3z" /><path d="m3 7 9 6 9-6" /></>) },
  { id: 'journal', label: 'Journal', detail: 'Chaque action, avant et après', icone: ic(<><path d="M4 4h12l4 4v12H4z" /><path d="M8 12h8M8 16h5" /></>) },
]

function PosteInner() {
  const router = useRouter()
  const params = useSearchParams()
  const [role, setRole] = useState<'direction' | 'lecture' | null>(null)
  const [refus, setRefus] = useState<string | null>(null)
  const [fiche, setFiche] = useState<string | null>(null)
  const [msg, setMsg] = useState<Message>(null)
  const minuteur = useRef<number | undefined>(undefined)
  const demande = params.get('onglet')
  const onglet: Onglet = ONGLETS.includes(demande as Onglet) ? (demande as Onglet) : 'aujourdhui'

  const verifier = useCallback(async () => {
    setRefus(null)
    const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }))
    if (!data.session) { router.replace(`/login?retour=${encodeURIComponent(window.location.pathname + window.location.search)}`); return }
    const r = await apiDirection<{ role?: 'direction' | 'lecture' }>('/api/controle/journal?limite=1')
    if (r.status === 403 || r.status === 404) { router.replace('/dashboard'); return }
    if (r.status === 401) { router.replace(`/login?retour=${encodeURIComponent(window.location.pathname + window.location.search)}`); return }
    // 503 (migration absente, base injoignable), 429, réseau : on le DIT, avec de quoi réessayer.
    if (!r.ok) { setRefus(r.data.error ?? 'Le Poste de contrôle ne répond pas pour l’instant.'); return }
    setRole(r.data.role ?? 'direction')
  }, [router])

  useEffect(() => { void verifier() }, [verifier])
  useEffect(() => () => window.clearTimeout(minuteur.current), [])

  const signaler = useCallback((m: Exclude<Message, null>) => {
    setMsg(m)
    window.clearTimeout(minuteur.current)
    minuteur.current = window.setTimeout(() => setMsg(null), 6000)
  }, [])
  function aller(e: React.MouseEvent, id: Onglet) { e.preventDefault(); setMsg(null); setFiche(null); router.replace(`/controle?onglet=${id}`, { scroll: false }) }

  return (
    <AppShell active="controle" title="Poste de contrôle" crumb={TITRES[onglet]} wide>
      <div className="param-layout dir-layout">
        <nav className="param-nav" aria-label="Vues du Poste de contrôle">
          <div className="param-nav-grp">
            <div className="param-nav-lab">Poste de contrôle{role === 'lecture' ? ' · lecture' : ''}</div>
            {NAV.filter((e) => ONGLETS.includes(e.id)).map((e) => (
              <a key={e.id} href={`/controle?onglet=${e.id}`} className={onglet === e.id ? 'on' : ''} aria-current={onglet === e.id ? 'page' : undefined} onClick={(ev) => aller(ev, e.id)}>
                {e.icone}<span><b>{e.label}</b><small>{e.detail}</small></span>
              </a>
            ))}
          </div>
        </nav>
        <div className="param-main dir-main" key={onglet}>
          {refus ? (
            <div className="tool-card" data-controle-refus>
              <h2>Le Poste de contrôle ne répond pas</h2>
              <p className="notif-erreur" role="alert">{refus}</p>
              <p className="muted">Si la migration <code>0065</code> vient d’être collée, réessayez. Sinon, l’espace se rouvrira de lui-même dès que la base répondra.</p>
              <button type="button" className="btn btn--primary" onClick={() => void verifier()}>Réessayer</button>
            </div>
          ) : role === null ? <div className="tool-card"><p className="muted">Vérification de l’accès…</p></div>
            : onglet === 'clients' ? (fiche ? <Fiche id={fiche} role={role} signaler={signaler} onRetour={() => setFiche(null)} /> : <Clients onOuvrir={setFiche} />)
            : onglet === 'apports' ? <Apports role={role} signaler={signaler} />
            : onglet === 'messagerie' ? <Messagerie role={role} signaler={signaler} onArtisan={(id) => { setFiche(id); router.replace('/controle?onglet=clients', { scroll: false }) }} />
            : onglet === 'journal' ? <Journal role={role} />
            : <Aujourdhui role={role} signaler={signaler} />}
          {msg ? <div className={`msg${msg.type === 'err' ? ' err' : ''}`} role="status">{msg.text}</div> : null}
        </div>
      </div>
    </AppShell>
  )
}

export default function PostePage() {
  return <Suspense fallback={<AppShell active="controle" title="Poste de contrôle"><div className="tool-card"><p className="muted">Chargement…</p></div></AppShell>}><PosteInner /></Suspense>
}
