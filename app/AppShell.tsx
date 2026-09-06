'use client'

import Marque from './Marque'

import '@/app/globals.css' // UI de l'espace connecté (toutes les pages console passent par AppShell)
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { actif } from '@/lib/flags'
import AidePanneau, { articlePour } from '@/app/AidePanneau'
import Visite, { VISITES, type Etape } from '@/app/Visite'
// v9 §2 — l'app installable : invitation (Android/iOS) et service worker + bandeau de mise à jour.
// Montés ICI, dans la console : jamais sur la landing ni sur une surface artisan (white-label).
import InstallerApp from '@/app/InstallerApp'
import MiseAJour from '@/app/MiseAJour'

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
      { key: 'tarifs', label: 'Mes tarifs', href: '/tarifs', icon: ic(<><path d="M20.6 13.4 12 22l-9-9V4a1 1 0 0 1 1-1h9z" /><circle cx="7.5" cy="7.5" r="1.4" /></>) },
      { key: 'inventaire', label: 'Inventaire', href: '/inventaire', icon: ic(<><path d="M3 7l9-4 9 4v10l-9 4-9-4z" /><path d="M3 7l9 4 9-4M12 11v10" /></>) },
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
  // §4 B4 — le centre d'aide n'apparaît que lorsqu'il est fini (drapeau).
  ...(actif('aideCentre') ? [{
    group: 'Aide',
    items: [
      { key: 'aide', label: 'Centre d’aide', href: '/aide', icon: ic(<><circle cx="12" cy="12" r="9" /><path d="M9.6 9.3a2.5 2.5 0 0 1 4.9.7c0 1.6-2.5 2-2.5 3.5" /><circle cx="12" cy="17" r=".6" fill="currentColor" /></>) },
    ],
  }] : []),
]

// §4 B3 — mémoire des visites guidées : la base (artisans.aide_vues) d'abord, localStorage en
// repli si elle ne répond pas ou si la colonne n'est pas encore migrée.
const CLE_LOCALE = 'presti.aide_vues'
const lireLocal = (): string[] => { try { const v = JSON.parse(localStorage.getItem(CLE_LOCALE) || '[]'); return Array.isArray(v) ? v : [] } catch { return [] } }
const ecrireLocal = (v: string[]) => { try { localStorage.setItem(CLE_LOCALE, JSON.stringify(v)) } catch { /* stockage indisponible : la visite reviendra, ce n'est pas grave */ } }

type ArtisanInfo = { nom: string | null; metier: string | null; plan: string | null; is_founder: boolean | null; credits: number | null; logo_url: string | null; email: string | null; aide_vues?: string[] | null; suppression_demandee_le?: string | null }

// Menu de profil (v4 §C1) — l'accès à tout ce qui touche au compte, au même endroit.
// Sprint J-1 §6 : trois entrées, celles qu'on cherche vraiment depuis un avatar. Le reste
// (page, plateforme) est déjà dans la navigation principale — pas deux fois.
const PROFIL_MENU: { href: string; label: string; icone: string }[] = [
  { href: '/parametres', label: 'Paramètres', icone: '⚙' },
  { href: '/parametres?onglet=abonnement', label: 'Abonnement & usage', icone: '💳' },
  { href: '/parametres?onglet=securite', label: 'Sécurité', icone: '🔒' },
]

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
  const pathname = usePathname()
  const [a, setA] = useState<ArtisanInfo | null>(null)
  const [uid, setUid] = useState<string | null>(null)
  const [menuOuvert, setMenuOuvert] = useState(false)
  const [open, setOpen] = useState(false)
  // v8 A1.2 — le tiroir se referme après une navigation (sinon il masque la page suivante sur mobile),
  // et à Échap. Le bouton de menu annonce son état (aria-expanded) et ce qu'il ouvre (aria-controls).
  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])
  const [unread, setUnread] = useState(0)
  // §4 B1/B3 — panneau « C'est quoi ? » et visite guidée
  const [aideOuverte, setAideOuverte] = useState(false)
  const [visite, setVisite] = useState(false)
  const [recherche, setRecherche] = useState('')
  useEffect(() => { setRecherche(window.location.search) }, [pathname])
  const article = articlePour(pathname ?? '', recherche, active)
  const fermerAide = useCallback(() => setAideOuverte(false), [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return
      // §6 — 2FA activée mais session au mot de passe seul (jeton aal1) : les routes
      // refuseraient tout. On demande le code tout de suite, ici, plutôt que d'attendre
      // qu'un écran affiche « Double authentification requise » à chaque clic.
      if (actif('mfa')) {
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
        if (aal?.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
          const retour = window.location.pathname + window.location.search
          router.replace(`/login?mfa=1&retour=${encodeURIComponent(retour)}`)
          return
        }
      }
      // v7 bloc 2 — session d'avant le code email, ou obtenue sans lui : toutes les routes
      // répondraient 401. On le sait tout de suite, ici, et on renvoie se connecter (un code part).
      if (actif('codeEmail')) {
        const r = await fetch('/api/auth/code', { headers: { Authorization: `Bearer ${data.session.access_token}` } }).catch(() => null)
        const d = r ? await r.json().catch(() => ({})) as { code?: string } : {}
        if (r && r.status === 401 && d.code === 'code_requis') {
          const retour = window.location.pathname + window.location.search
          await supabase.auth.signOut().catch(() => {})
          router.replace(`/login?verif=1&retour=${encodeURIComponent(retour)}`)
          return
        }
      }
      // select('*') : tolère l'absence de la colonne is_founder tant que la migration 0003 n'est pas appliquée.
      const { data: prof } = await supabase
        .from('artisans')
        .select('*')
        .eq('id', data.session.user.id)
        .maybeSingle()
      setUid(data.session.user.id)
      if (prof) setA(prof as ArtisanInfo)
      // Première ouverture de la console : la visite guidée, une seule fois par artisan.
      if (prof && actif('aideVisites') && VISITES.console?.length) {
        const vues = (prof as ArtisanInfo).aide_vues
        const deja = (Array.isArray(vues) ? vues : lireLocal()).includes('visite:console')
        if (!deja) setTimeout(() => setVisite(true), 700)
      }
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
  }, [router])

  async function logout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const isFounder = !!a?.is_founder

  // Fin de visite (terminée ou « Plus tard ») : on la marque comme vue, sinon elle
  // reviendrait à chaque page — et elle reste rejouable depuis le panneau « ? ».
  const finVisite = useCallback(async () => {
    setVisite(false); setOpen(false)
    const cle = 'visite:console'
    const local = lireLocal()
    if (!local.includes(cle)) ecrireLocal([...local, cle])
    if (!uid) return
    const nouvelles = Array.from(new Set([...(a?.aide_vues ?? []), cle]))
    setA((p) => (p ? { ...p, aide_vues: nouvelles } : p))
    const { error } = await supabase.from('artisans').update({ aide_vues: nouvelles }).eq('id', uid)
    if (error) { /* colonne pas encore migrée ou base muette : le repli localStorage suffit */ }
  }, [uid, a?.aide_vues])
  const etapeVisite = useCallback((e: Etape) => setOpen(!!e.menu), [])

  return (
    <div className={`psh-app${open ? ' open' : ''}`}>
      <div className="psh-scrim" onClick={() => setOpen(false)} />
      <aside className="psh-side" id="psh-side" data-visite="sidebar">
        <a className="psh-sbrand" href="/dashboard">
          <span className="psh-logo marque" aria-hidden="true">
            <Marque size={34} />
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
                  <a key={it.key} className={it.key === active ? 'on' : ''} href={it.href} data-visite={`nav-${it.key}`}>
                    {it.icon}{it.label}
                    {it.key === 'messages' && unread > 0 && <span className="count alert">{unread}</span>}
                  </a>
                )
              )}
            </nav>
          </div>
        ))}

        <div className="psh-foot">
          {/* Menu de profil (§C1) : tout ce qui touche au compte, au même endroit. */}
          {menuOuvert ? (
            <>
              {/* Capteur de clic hors menu — un <div> et non un <button> : le style global
                  button{background:var(--green)} repeindrait tout l'écran en accent. */}
              <div className="psh-menu-scrim" onClick={() => setMenuOuvert(false)} aria-hidden="true" />
              <div className="psh-menu" role="menu">
                <div className="psh-menu-id">
                  {a?.logo_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <span className="psh-ava has-logo psh-menu-ava"><img src={a.logo_url} alt="" /></span>
                    : <span className="psh-ava psh-menu-ava">{initials(a?.nom ?? null)}</span>}
                  <b>{a?.nom || 'Mon compte'}</b>
                  {a?.email ? <span>{a.email}</span> : null}
                  <span className="psh-menu-plan">
                    {isFounder ? 'Fondateur · Accès total' : `${PLAN_LABEL[a?.plan ?? 'gratuit'] ?? 'Essai gratuit'} · ${a?.credits ?? 0} crédits`}
                  </span>
                </div>
                <nav>
                  {PROFIL_MENU.map((m) => (
                    <a key={m.href} href={m.href} role="menuitem"><span aria-hidden="true">{m.icone}</span>{m.label}</a>
                  ))}
                </nav>
                <button className="psh-menu-out" onClick={logout} role="menuitem">↩ Se déconnecter</button>
              </div>
            </>
          ) : null}
          <button className="psh-founder" onClick={() => setMenuOuvert((v) => !v)} aria-haspopup="menu" aria-expanded={menuOuvert}>
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
            <span className="psh-chev" aria-hidden="true">⌃</span>
          </button>
        </div>
      </aside>

      <div className="psh-main">
        <div className="psh-top">
          <button className="psh-hamb" onClick={() => setOpen((v) => !v)} aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={open} aria-controls="psh-side">
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
          {article && (
            <button type="button" className="psh-aide" data-visite="aide" onClick={() => setAideOuverte(true)} aria-label="C’est quoi, cet écran ?" title="C’est quoi, cet écran ?" aria-haspopup="dialog" aria-expanded={aideOuverte}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M9.6 9.3a2.5 2.5 0 0 1 4.9.7c0 1.6-2.5 2-2.5 3.5" /><circle cx="12" cy="17" r=".6" fill="currentColor" /></svg>
            </button>
          )}
        </div>
        <div className={`psh-content${wide ? ' wide' : ''}`}>
          {/* §6 — suppression du compte programmée : le rappel est partout, l'annulation à un clic. */}
          {a?.suppression_demandee_le && active !== 'parametres' ? (
            <a className="psh-grace" href="/parametres?onglet=donnees" role="status">
              <b>Votre compte sera supprimé le {new Date(new Date(a.suppression_demandee_le).getTime() + 30 * 86400000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}.</b>
              <span>Annuler ou exporter vos données →</span>
            </a>
          ) : null}
          <InstallerApp />
          {children}
        </div>
      </div>

      <AidePanneau
        article={article}
        open={aideOuverte}
        onClose={fermerAide}
        onRevoirVisite={actif('aideVisites') && VISITES.console?.length ? () => { setAideOuverte(false); setTimeout(() => setVisite(true), 250) } : undefined}
      />
      {actif('aideVisites') && visite && !aideOuverte && <Visite surface="console" onEtape={etapeVisite} onFin={finVisite} />}
      <MiseAJour />
    </div>
  )
}
