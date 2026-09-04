'use client'

import { Suspense, useCallback, useEffect, useState, type ReactNode } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { actif } from '@/lib/flags'
import AppShell from '@/app/AppShell'
import SectionProfil from './SectionProfil'
import SectionLegal from './SectionLegal'
import SectionAbonnement from './SectionAbonnement'
import SectionSecurite from './SectionSecurite'
import SectionDonnees from './SectionDonnees'
import type { Artisan, Message } from './commun'

// Paramètres (sprint J-1 §6) : une page, une navigation à gauche, l'URL qui suit (`?onglet=`).
// Les anciens liens `?onglet=legal|securite|donnees` continuent de marcher.
//
// Plateforme, Site, Canaux, Apparence et Aide ne sont PAS des copies : ce sont des liens vers
// les écrans qui existent déjà, avec une ligne qui dit ce qu'on y règle. On n'a pas déplacé
// ces réglages pour le plaisir de déplacer.

type Onglet = 'profil' | 'legal' | 'abonnement' | 'securite' | 'donnees'
type Entree = { id: string; label: string; detail: string; icone: ReactNode; href?: string }

const ic = (d: ReactNode) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>

const NAV: { groupe: string; entrees: Entree[] }[] = [
  { groupe: 'Compte', entrees: [
    { id: 'profil', label: 'Profil', detail: 'Photo, nom, adresse, emails reçus', icone: ic(<><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></>) },
    { id: 'legal', label: 'Entreprise & légal', detail: 'SIRET, TVA, assurance, IBAN', icone: ic(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></>) },
    { id: 'abonnement', label: 'Abonnement & usage', detail: 'Formule, crédits, paiements', icone: ic(<><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>) },
  ] },
  { groupe: 'Vos outils', entrees: [
    { id: 'plateforme', label: 'Plateforme', detail: 'Assistant, automatisations, reprise en main', href: '/plateforme', icone: ic(<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><path d="M8 9h8M8 13h5" /></>) },
    { id: 'site', label: 'Site', detail: 'Contenu, réalisations, publication', href: '/profil', icone: ic(<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M8 4v5" /></>) },
    { id: 'canaux', label: 'Canaux', detail: 'Votre boîte email branchée', href: '/messages/canaux', icone: ic(<><path d="M4 4h16v16H4z" /><path d="m4 7 8 6 8-6" /></>) },
    { id: 'apparence', label: 'Apparence', detail: 'Thème, couleur, style du site', href: '/profil#apparence', icone: ic(<><circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 0 0 18c1.2 0 1.7-.8 1.2-1.8-.6-1.2.2-2.2 1.5-2.2H16a5 5 0 0 0 5-5c0-4.9-4-9-9-9z" /><circle cx="8" cy="10" r="1" fill="currentColor" /><circle cx="12" cy="7" r="1" fill="currentColor" /><circle cx="16" cy="10" r="1" fill="currentColor" /></>) },
  ] },
  { groupe: 'Protection', entrees: [
    { id: 'securite', label: 'Sécurité', detail: 'Mot de passe, sessions ouvertes', icone: ic(<><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></>) },
    { id: 'donnees', label: 'Données & confidentialité', detail: 'Export, suppressions', icone: ic(<><ellipse cx="12" cy="6" rx="8" ry="3" /><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6" /><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></>) },
    { id: 'aide', label: 'Aide', detail: actif('aideCentre') ? 'Le centre d’aide, tout expliqué' : 'C’est quoi, cet écran ?', href: actif('aideCentre') ? '/aide' : undefined, icone: ic(<><circle cx="12" cy="12" r="9" /><path d="M9.6 9.3a2.5 2.5 0 0 1 4.9.7c0 1.6-2.5 2-2.5 3.5" /><circle cx="12" cy="17" r=".6" fill="currentColor" /></>) },
  ] },
]
const ONGLETS: Onglet[] = ['profil', 'legal', 'abonnement', 'securite', 'donnees']
const TITRES: Record<Onglet, string> = { profil: 'Profil', legal: 'Entreprise & légal', abonnement: 'Abonnement & usage', securite: 'Sécurité', donnees: 'Données & confidentialité' }

function ParametresInner() {
  const router = useRouter()
  const params = useSearchParams()
  const [a, setA] = useState<Artisan | null>(null)
  const [msg, setMsg] = useState<Message>(null)
  const demande = params.get('onglet')
  const onglet: Onglet = ONGLETS.includes(demande as Onglet) ? (demande as Onglet) : 'profil'

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const { data: row } = await supabase.from('artisans').select('*').eq('id', data.session.user.id).maybeSingle()
      if (!row) { router.replace('/onboarding'); return }
      setA({ ...(row as Artisan), email: row.email ?? data.session.user.email ?? null })
    })
  }, [router])

  const patch = useCallback((p: Partial<Artisan>) => setA((prev) => (prev ? { ...prev, ...p } : prev)), [])
  const signaler = useCallback((m: Message) => {
    setMsg(m)
    if (m?.type === 'ok') setTimeout(() => setMsg((cur) => (cur === m ? null : cur)), 3200)
  }, [])

  function aller(e: React.MouseEvent, id: string) {
    e.preventDefault()
    setMsg(null)
    router.replace(`/parametres?onglet=${id}`, { scroll: false })
  }

  const contenu = !a ? <div className="tool-card"><p className="muted">Chargement…</p></div>
    : onglet === 'profil' ? <SectionProfil a={a} patch={patch} signaler={signaler} />
    : onglet === 'legal' ? <SectionLegal key={a.id} a={a} patch={patch} signaler={signaler} />
    : onglet === 'abonnement' ? <SectionAbonnement a={a} patch={patch} signaler={signaler} />
    : onglet === 'securite' ? <SectionSecurite a={a} patch={patch} signaler={signaler} />
    : <SectionDonnees a={a} patch={patch} signaler={signaler} />

  return (
    <AppShell active="parametres" title="Paramètres" crumb={TITRES[onglet]} wide>
      <div className="param-layout">
        <nav className="param-nav" aria-label="Sections des paramètres">
          {NAV.map((g) => (
            <div key={g.groupe} className="param-nav-grp">
              <div className="param-nav-lab">{g.groupe}</div>
              {g.entrees.map((e) => e.href ? (
                <a key={e.id} href={e.href} className="param-nav-lien">
                  {e.icone}<span><b>{e.label}</b><small>{e.detail}</small></span>
                  <svg className="param-nav-ext" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg>
                </a>
              ) : e.id === 'aide' ? (
                <button key={e.id} type="button" className="param-nav-lien" onClick={() => (document.querySelector('.psh-aide') as HTMLButtonElement | null)?.click()}>
                  {e.icone}<span><b>{e.label}</b><small>{e.detail}</small></span>
                </button>
              ) : (
                <a key={e.id} href={`/parametres?onglet=${e.id}`} className={onglet === e.id ? 'on' : ''} aria-current={onglet === e.id ? 'page' : undefined} onClick={(ev) => aller(ev, e.id)}>
                  {e.icone}<span><b>{e.label}</b><small>{e.detail}</small></span>
                </a>
              ))}
            </div>
          ))}
        </nav>
        <div className="param-main" key={onglet}>
          {contenu}
          {msg ? <div className={`msg${msg.type === 'err' ? ' err' : ''}`} role="status">{msg.text}</div> : null}
        </div>
      </div>
    </AppShell>
  )
}

export default function ParametresPage() {
  return <Suspense fallback={<AppShell active="parametres" title="Paramètres"><div className="tool-card"><p className="muted">Chargement…</p></div></AppShell>}><ParametresInner /></Suspense>
}
