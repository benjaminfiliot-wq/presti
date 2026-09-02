'use client'

import '@/app/globals.css' // UI de l'espace connecté (toutes les pages console passent par AppShell)
import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type Nav = { key: string; label: string; href?: string; soon?: boolean; icon: ReactNode }

const ic = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
)

const NAV: { group: string; items: Nav[] }[] = [
  {
    group: 'Pilotage',
    items: [
      { key: 'dashboard', label: 'Tableau de bord', href: '/dashboard', icon: ic(<><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>) },
      { key: 'messages', label: 'Messages', href: '/messages', icon: ic(<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></>) },
      { key: 'devis', label: 'Devis', href: '/devis', icon: ic(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M8 13h8M8 17h5" /></>) },
      { key: 'factures', label: 'Factures', href: '/factures', icon: ic(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M9 15h6" /></>) },
      { key: 'profil', label: 'Ma page', href: '/profil', icon: ic(<><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></>) },
      { key: 'plateforme', label: 'Ma plateforme', href: '/plateforme', icon: ic(<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><path d="M8 9h8M8 13h5" /></>) },
      { key: 'abonnement', label: 'Abonnement', href: '/abonnement', icon: ic(<><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>) },
    ],
  },
  {
    group: 'Outils IA',
    items: [
      { key: 'outils', label: 'Réponses instantanées', href: '/outils', icon: ic(<><path d="M12 3 4 7v6c0 4 3.4 6.5 8 8 4.6-1.5 8-4 8-8V7z" /><path d="m9 12 2 2 4-4" /></>) },
    ],
  },
]

type ArtisanInfo = { nom: string | null; metier: string | null; plan: string | null; is_founder: boolean | null; credits: number | null; logo_url: string | null }

const PLAN_LABEL: Record<string, string> = { gratuit: 'Essai gratuit', essentiel: 'Offre Essentiel', studio: 'Offre Studio', signature: 'Offre Signature', pro: 'Offre Pro', business: 'Offre Business' }

function initials(nom: string | null) {
  if (!nom) return 'P'
  return nom.trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? '').join('') || 'P'
}

export default function AppShell({
  active,
  title,
  crumb,
  actions,
  wide,
  children,
}: {
  active: string
  title: string
  crumb?: string
  actions?: ReactNode
  wide?: boolean
  children: ReactNode
}) {
  const router = useRouter()
  const [a, setA] = useState<ArtisanInfo | null>(null)
  const [open, setOpen] = useState(false)
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return
      // select('*') : tolère l'absence de la colonne is_founder tant que la migration 0003 n'est pas appliquée.
      const { data: prof } = await supabase
        .from('artisans')
        .select('*')
        .eq('id', data.session.user.id)
        .maybeSingle()
      if (prof) setA(prof as ArtisanInfo)
      // Conversations non lues (badge Messages). Tolère l'absence de la colonne lu_le.
      try {
        const { count } = await supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .is('lu_le', null)
          .in('statut', ['nouveau', 'en_discussion'])
        setUnread(count ?? 0)
      } catch { /* colonne pas encore migrée : pas de badge */ }
    })
  }, [])

  async function logout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const isFounder = !!a?.is_founder

  return (
    <div className={`psh-app${open ? ' open' : ''}`}>
      <div className="psh-scrim" onClick={() => setOpen(false)} />
      <aside className="psh-side">
        <a className="psh-sbrand" href="/dashboard">
          <span className="psh-logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21 L21 21" /><path d="M6 21 L6 10 L12 6 L18 10 L18 21" /><path d="M10 21 L10 15 L14 15 L14 21" /></svg>
          </span>
          <span><b>Presti</b><small>Console artisan</small></span>
        </a>

        {isFounder && (
          <>
            <div className="psh-navlabel">Fondateur</div>
            <nav className="psh-nav">
              <a className={active === 'controle' ? 'on' : ''} href="/controle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3" /></svg>
                Poste de contrôle
              </a>
            </nav>
          </>
        )}

        {NAV.map((g) => (
          <div key={g.group}>
            <div className="psh-navlabel">{g.group}</div>
            <nav className="psh-nav">
              {g.items.map((it) =>
                it.soon ? (
                  <a key={it.key} className={it.key === active ? 'on' : ''} aria-disabled="true" style={{ cursor: 'default', opacity: 0.6 }}>
                    {it.icon}{it.label}<span className="count">bientôt</span>
                  </a>
                ) : (
                  <a key={it.key} className={it.key === active ? 'on' : ''} href={it.href}>
                    {it.icon}{it.label}
                    {it.key === 'messages' && unread > 0 && <span className="count alert">{unread}</span>}
                  </a>
                )
              )}
            </nav>
          </div>
        ))}

        <div className="psh-foot">
          <div className="psh-founder">
            {a?.logo_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <span className="psh-ava has-logo"><img src={a.logo_url} alt="" /></span>
              : <span className="psh-ava">{initials(a?.nom ?? null)}</span>}
            <span className="psh-who">
              <b>{a?.nom || 'Mon compte'}</b>
              {isFounder
                ? <span className="founder">Fondateur · Accès total</span>
                : <span>{PLAN_LABEL[a?.plan ?? 'gratuit'] ?? 'Essai gratuit'} · <strong style={{ color: 'var(--accent-ink)' }}>{a?.credits ?? 0}</strong> crédits</span>}
            </span>
          </div>
          <button className="psh-logout" onClick={logout}>Déconnexion</button>
        </div>
      </aside>

      <div className="psh-main">
        <div className="psh-top">
          <button className="psh-hamb" onClick={() => setOpen(true)} aria-label="Ouvrir le menu">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <button className="psh-back" onClick={() => router.back()} aria-label="Retour" title="Retour">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <div className="psh-th">
            {crumb && <span className="psh-crumb">{crumb}</span>}
            <h1>{title}</h1>
          </div>
          {actions && <div className="psh-actions">{actions}</div>}
        </div>
        <div className={`psh-content${wide ? ' wide' : ''}`}>{children}</div>
      </div>
    </div>
  )
}
