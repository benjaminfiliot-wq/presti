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
import Comptabilite from './Comptabilite'
import Reglages from './Reglages'
import Cerveaux from './Cerveaux'
import Sites from './Sites'
import Packs from './Packs'
import BarreEtat from './BarreEtat'
import Recherche from './Recherche'
import Visiteurs from './Visiteurs'
import Demandes from './Demandes'
import { actif } from '@/lib/flags'
import { CLE_NE_PAS_COMPTER, hoteMesure } from '@/lib/audience'

// Le Poste de contrôle (prompt v11 §1) — UN seul écran depuis lequel Benj dirige l'entreprise.
// Il a d'abord vécu sous /direction (v10) à côté d'un /controle « façon Jarvis » ; les deux ont
// fusionné ici, et l'ancienne adresse redirige en permanence.
// J1 : « Aujourd'hui » et « Journal ». Les onglets suivants (Clients & abonnements, Messagerie, Comptabilité,
// Santé, Artisans, Réglages) n'apparaissent que livrés : rien de non fini n'est visible.
//
// L'accès se vérifie sur la route la plus LÉGÈRE (`journal?limite=1`, une lecture) et non plus sur l'état complet
// (six appels réseau) : l'écran s'ouvrait en huit secondes, et une base muette (migration pas encore collée, 503)
// ou un plafond atteint (429) le laissaient sur « Vérification de l’accès… » pour toujours (revue du 07/09).
type Onglet = 'aujourdhui' | 'visiteurs' | 'clients' | 'apports' | 'messagerie' | 'comptabilite' | 'cerveaux' | 'journal' | 'reglages' | 'sites' | 'demandes' | 'packs'
type Message = { type: 'ok' | 'err'; text: string } | null
// Le rail ne montre que ce qui existe : un onglet dont la migration n'est pas collée mènerait à un 404.
const ONGLETS: Onglet[] = [
  'aujourdhui' as const,
  ...(actif('audience') ? (['visiteurs'] as const) : []),
  ...(actif('apports') ? (['clients', 'apports'] as const) : []),
  ...(actif('messagerie') ? (['messagerie'] as const) : []),
  ...(actif('comptabilite') ? (['comptabilite'] as const) : []),
  ...(actif('siteCommande') ? (['sites'] as const) : []),
  ...(actif('packPub') ? (['packs'] as const) : []),
  ...(actif('demandesEcosysteme') ? (['demandes'] as const) : []),
  'cerveaux' as const,
  'journal' as const,
  'reglages' as const,
]
const TITRES: Record<Onglet, string> = { aujourdhui: 'Aujourd’hui', visiteurs: 'Visiteurs', clients: 'Clients & abonnements', apports: 'Apports', messagerie: 'Messagerie', comptabilite: 'Comptabilité', cerveaux: 'Cerveaux', journal: 'Journal', reglages: 'Réglages', sites: 'Sites', demandes: 'Demandes', packs: 'Packs pubs' }
const ic = (d: ReactNode) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
const iconeStation = ic(<><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></>)
// L'adresse de la station (drapeau `pilotage`) : la décision des liens du digest n'est gardée que si c'est un UUID.
const adresseStation = (decision: string | null) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decision ?? '') ? `/controle/station?decision=${decision}` : '/controle/station'
const NAV: { id: Onglet; label: string; detail: string; icone: ReactNode }[] = [
  { id: 'aujourdhui', label: 'Aujourd’hui', detail: 'État, à faire, chiffres, fil', icone: ic(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>) },
  { id: 'visiteurs', label: 'Visiteurs', detail: 'Qui regarde le site, en direct', icone: ic(<><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>) },
  { id: 'clients', label: 'Clients', detail: 'Offres, crédits, canal d’arrivée', icone: ic(<><circle cx="9" cy="8" r="3" /><path d="M3 20v-1a5 5 0 0 1 5-5h2a5 5 0 0 1 5 5v1" /><path d="M17 8h4M19 6v4" /></>) },
  { id: 'apports', label: 'Apports', detail: 'Qui a amené qui, et la preuve', icone: ic(<><path d="M4 12h8M12 8l4 4-4 4" /><path d="M16 4h4v16h-4" /></>) },
  { id: 'messagerie', label: 'Messagerie', detail: 'Les emails de l’entreprise', icone: ic(<><path d="M3 6h18v12H3z" /><path d="m3 7 9 6 9-6" /></>) },
  { id: 'comptabilite', label: 'Comptabilité', detail: 'TVA, achats, échéances, relevé', icone: ic(<><path d="M4 4h16v16H4z" /><path d="M8 9h8M8 13h5" /><path d="M15 17h3" /></>) },
  { id: 'sites', label: 'Sites', detail: 'Commandes de site et validation', icone: ic(<><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></>) },
  { id: 'packs', label: 'Packs pubs', detail: 'Pubs locales à regarder et livrer', icone: ic(<><rect x="2" y="2" width="20" height="20" rx="2" /><path d="M7 2v20M17 2v20M2 12h20M2 7h5M2 17h5M17 17h5M17 7h5" /></>) },
  { id: 'demandes', label: 'Demandes', detail: 'Un travail pour l’écosystème', icone: ic(<><path d="M4 5h16v11H9l-5 4z" /><path d="M8 9h8M8 12h5" /></>) },
  { id: 'cerveaux', label: 'Cerveaux', detail: 'Scores, cas et dernière amélioration', icone: ic(<><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" /><path d="M12 6v6l4 2" /></>) },
  { id: 'journal', label: 'Journal', detail: 'Chaque action, avant et après', icone: ic(<><path d="M4 4h12l4 4v12H4z" /><path d="M8 12h8M8 16h5" /></>) },
  { id: 'reglages', label: 'Réglages', detail: 'Équipe, seuils, comptes connectés', icone: ic(<><circle cx="12" cy="12" r="3" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></>) },
]

function PosteInner() {
  const router = useRouter()
  const params = useSearchParams()
  const [role, setRole] = useState<'direction' | 'lecture' | null>(null)
  const [refus, setRefus] = useState<string | null>(null)
  const [fiche, setFiche] = useState<string | null>(null)
  const [msg, setMsg] = useState<Message>(null)
  const minuteur = useRef<number | undefined>(undefined)
  // Les compteurs du rail viennent de la barre d'état : une seule requête les porte déjà, en refaire
  // une par onglet serait payer deux fois la même information.
  const [compteurs, setCompteurs] = useState<{ aFaire: number | null; messages: number | null }>({ aFaire: null, messages: null })
  const [recherche, setRecherche] = useState(false)
  const demande = params.get('onglet')
  const onglet: Onglet = ONGLETS.includes(demande as Onglet) ? (demande as Onglet) : 'aujourdhui'
  // Les liens du digest (?onglet=pilotage&decision=<uuid>) mènent à la station, quand le drapeau pilotage est levé.
  useEffect(() => { if (demande === 'pilotage' && actif('pilotage')) router.replace(adresseStation(params.get('decision'))) }, [demande, params, router]) // pilotage → station

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
  // Un navigateur qui ouvre le Poste est celui d'un fondateur : ses passages sur la vitrine ne gonflent pas la
  // mesure d'audience. Seulement si aucun choix n'est posé — « compter ce navigateur » (onglet Visiteurs) reste.
  // Et seulement sur un hôte MESURÉ : le stockage est propre à chaque origine, une clé posée sur qg.prestiapp.fr ne
  // serait jamais lue par la vitrine (revue du 14/09) — là-bas, l'onglet Visiteurs propose le lien d'exclusion.
  useEffect(() => { try { if (hoteMesure(window.location.hostname) && localStorage.getItem(CLE_NE_PAS_COMPTER) === null) localStorage.setItem(CLE_NE_PAS_COMPTER, 'non') } catch { /* stockage fermé */ } }, [])

  // Ctrl+K (⌘K sur Mac) ouvre la recherche depuis n'importe où — sauf pendant qu'on écrit ailleurs.
  useEffect(() => {
    const sur = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setRecherche(true) }
    }
    window.addEventListener('keydown', sur)
    return () => window.removeEventListener('keydown', sur)
  }, [])

  const signaler = useCallback((m: Exclude<Message, null>) => {
    setMsg(m)
    window.clearTimeout(minuteur.current)
    minuteur.current = window.setTimeout(() => setMsg(null), 6000)
  }, [])
  function aller(e: React.MouseEvent, id: Onglet) { e.preventDefault(); setMsg(null); setFiche(null); router.replace(`/controle?onglet=${id}`, { scroll: false }) }

  return (
    <AppShell active="controle" title="Poste de contrôle" crumb={TITRES[onglet]} wide>
      <BarreEtat onCompteurs={setCompteurs} onRecherche={() => setRecherche(true)} />
      <div className="param-layout dir-layout">
        <nav className="param-nav" aria-label="Vues du Poste de contrôle">
          <div className="param-nav-grp">
            <div className="param-nav-lab">Poste de contrôle{role === 'lecture' ? ' · lecture' : ''}</div>
            {actif('pilotage') ? <a href="/controle/station" onClick={(ev) => { ev.preventDefault(); router.push('/controle/station') }}>{iconeStation}<span><b>Station</b><small>Mission Control : agents, argent, attention</small></span></a> : null}
            {NAV.filter((e) => ONGLETS.includes(e.id)).map((e) => {
              // Un compteur ne s'affiche que s'il y a quelque chose à faire : un « 0 » permanent
              // devient un décor, et un décor ne se remarque plus le jour où il compte.
              //  : hors périmètre, le compteur vaut null et l'onglet n'affiche simplement rien --
              // il ne dit surtout pas « 0 en attente », ce qui serait une information qu'on n'a pas.
              const n = e.id === 'aujourdhui' ? (compteurs.aFaire ?? 0) : e.id === 'messagerie' ? (compteurs.messages ?? 0) : 0
              return (
                <a key={e.id} href={`/controle?onglet=${e.id}`} className={onglet === e.id ? 'on' : ''} aria-current={onglet === e.id ? 'page' : undefined} onClick={(ev) => aller(ev, e.id)}>
                  {e.icone}<span><b>{e.label}{n > 0 ? <span className="ctl-compteur" aria-label={`${n} en attente`}>{n > 99 ? '99+' : n}</span> : null}</b><small>{e.detail}</small></span>
                </a>
              )
            })}
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
            : onglet === 'comptabilite' ? <Comptabilite role={role} signaler={signaler} />
            : onglet === 'sites' ? <Sites role={role} signaler={signaler} />
            : onglet === 'packs' ? <Packs role={role} signaler={signaler} />
            : onglet === 'demandes' ? <Demandes role={role} signaler={signaler} />
            : onglet === 'reglages' ? <Reglages role={role} signaler={signaler} />
            : onglet === 'messagerie' ? <Messagerie role={role} signaler={signaler} onArtisan={(id) => { setFiche(id); router.replace('/controle?onglet=clients', { scroll: false }) }} />
            : onglet === 'visiteurs' ? <Visiteurs />
            : onglet === 'cerveaux' ? <Cerveaux role={role} />
            : onglet === 'journal' ? <Journal role={role} />
            : <Aujourdhui role={role} signaler={signaler} />}
          {msg ? <div className={`msg${msg.type === 'err' ? ' err' : ''}`} role="status">{msg.text}</div> : null}
        </div>
      </div>
      <Recherche
        ouvert={recherche}
        onFermer={() => setRecherche(false)}
        onAller={(r) => {
          // On va où le résultat vit : la fiche pour un artisan, le fil pour un message.
          setMsg(null)
          if (r.type === 'artisan' && r.cible) { setFiche(r.cible); router.replace('/controle?onglet=clients', { scroll: false }); return }
          setFiche(null)
          router.replace(`/controle?onglet=${r.onglet}`, { scroll: false })
        }}
      />
    </AppShell>
  )
}

export default function PostePage() {
  return <Suspense fallback={<AppShell active="controle" title="Poste de contrôle"><div className="tool-card"><p className="muted">Chargement…</p></div></AppShell>}><PosteInner /></Suspense>
}
