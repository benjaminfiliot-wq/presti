'use client'

import Marque from './Marque'

import '@/app/globals.css' // UI de l'espace connecté (toutes les pages console passent par AppShell)
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { actif, enEssai, type Flag } from '@/lib/flags'
import { peut, type Capacite } from '@/lib/plans'
import AidePanneau, { articlePour } from '@/app/AidePanneau'
import { videoPour } from '@/lib/aideVideos'
import Visite, { VISITES, type Etape } from '@/app/Visite'
// v9 §2 — l'app installable : invitation (Android/iOS) et service worker + bandeau de mise à jour.
// Montés ICI, dans la console : jamais sur la landing ni sur une surface artisan (white-label).
import InstallerApp from '@/app/InstallerApp'
import MiseAJour from '@/app/MiseAJour'
import { desabonnerCetAppareil } from '@/lib/pushClient'
// v9 J3 — la coque native : écran de lancement, notifications natives, bouton retour, réseau. Inerte dans un navigateur.
import NatifPont from '@/app/NatifPont'
// Refonte 18/10 (étape 5.1) : la console v2, derrière le drapeau consoleV2 (essai : lib/essais.ts). Même chargement, autre coque.
import CoqueV2 from '@/app/console/CoqueV2'
import VisiteSlides from '@/app/console/VisiteSlides'
import { essaisDuCompte, useConsoleV2 } from '@/lib/consoleV2Client'

type Nav = { key: string; label: string; href?: string; soon?: boolean; icon: ReactNode; essai?: Flag; offre?: string; cap?: Capacite }

const ic = (d: ReactNode) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
)

const NAV: { group: string; items: Nav[] }[] = [
  {
    group: 'Pilotage',
    items: [
      { key: 'dashboard', label: 'Tableau de bord', href: '/dashboard', icon: ic(<><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>) },
      { key: 'messages', label: 'Messages', href: '/messages', offre: 'Studio', cap: 'plateforme.conversation', icon: ic(<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></>) },
      { key: 'devis', label: 'Devis', href: '/devis', icon: ic(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M8 13h8M8 17h5" /></>) },
      { key: 'factures', label: 'Factures', href: '/factures', icon: ic(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M9 15h6" /></>) },
      { key: 'chiffres', label: 'Mes chiffres', href: '/chiffres', offre: 'Studio', cap: 'chiffres', icon: ic(<><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20H2" /></>) },
      // CRM atelier (0141) : absent du menu tant que le drapeau `crm` est baissé. 19/10 : `cap` posé — sans lui, la pastille
      // « Signature » s'affichait aussi aux comptes déjà en Signature (audit 18/10 §2.1). Même chose pour l'assistant.
      ...(enEssai('crm') ? [{ key: 'crm', essai: 'crm' as Flag, offre: 'Signature', cap: 'crm' as Capacite, label: 'CRM atelier', href: '/crm', icon: ic(<><path d="M3 21h18" /><path d="M5 21V9l7-5 7 5v12" /><path d="M9 21v-6h6v6" /></>) }] : []),
      { key: 'tarifs', label: 'Mes tarifs', href: '/tarifs', icon: ic(<><path d="M20.6 13.4 12 22l-9-9V4a1 1 0 0 1 1-1h9z" /><circle cx="7.5" cy="7.5" r="1.4" /></>) },
      { key: 'inventaire', label: 'Inventaire', href: '/inventaire', icon: ic(<><path d="M3 7l9-4 9 4v10l-9 4-9-4z" /><path d="M3 7l9 4 9-4M12 11v10" /></>) },
      { key: 'profil', label: 'Ma page', href: '/profil', icon: ic(<><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></>) },
      ...(actif('siteCommandeVente') ? [{ key: 'site', label: 'Commander mon site', href: '/site/commander', icon: ic(<><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><path d="M8 21h8M12 17v4" /></>) }] : []),
      { key: 'plateforme', label: 'Ma plateforme', href: '/plateforme', offre: 'Studio', cap: 'plateforme.gestion', icon: ic(<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><path d="M8 9h8M8 13h5" /></>) },
      { key: 'abonnement', label: 'Abonnement', href: '/abonnement', icon: ic(<><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>) },
    ],
  },
  {
    group: 'Outils IA',
    items: [
      { key: 'outils', label: 'Réponses instantanées', href: '/outils', offre: 'Studio', cap: 'plateforme.conversation', icon: ic(<><path d="M12 3 4 7v6c0 4 3.4 6.5 8 8 4.6-1.5 8-4 8-8V7z" /><path d="m9 12 2 2 4-4" /></>) },
      // 016 A1/A2 — l'assistant de gestion (Signature). Drapeau baissé : l'entrée n'existe pas.
      ...(enEssai('assistant') ? [{ key: 'assistant', essai: 'assistant' as Flag, offre: 'Signature', cap: 'assistant' as Capacite, label: 'Assistant de gestion', href: '/assistant', icon: ic(<><path d="M4 5h16v10H9l-5 4z" /><path d="M8 9h8M8 12h5" /><path d="M17 3l.6 1.4L19 5l-1.4.6L17 7l-.6-1.4L15 5l1.4-.6z" /></>) }] : []),
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

// Le bandeau ne lit que la FORME de l'accès : un état, un titre, une heure de fin. Ni le motif
// détaillé, ni le jeton, ni rien de l'élément concerné.
type AccesSupport = { id: string; etat: string; element_titre: string | null; expire_le: string | null }

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
  const v2 = useConsoleV2()
  const [a, setA] = useState<ArtisanInfo | null>(null)
  const [uid, setUid] = useState<string | null>(null)
  const [essais, setEssais] = useState<Partial<Record<Flag, boolean>>>({})
  const [menuOuvert, setMenuOuvert] = useState(false)
  const [open, setOpen] = useState(false)
  // v8 A1.2 — le tiroir se referme après une navigation (sinon il masque la page suivante sur mobile),
  // et à Échap. Le bouton de menu annonce son état (aria-expanded) et ce qu'il ouvre (aria-controls).
  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    // v9 J3 — bouton retour Android (app/NatifPont.tsx) : tiroir ouvert → il se ferme, et c'était ça, le retour.
    const onRetour = (e: Event) => { e.preventDefault(); setOpen(false) }
    document.addEventListener('keydown', onKey)
    window.addEventListener('presti:retour', onRetour)
    return () => { document.removeEventListener('keydown', onKey); window.removeEventListener('presti:retour', onRetour) }
  }, [open])
  const [unread, setUnread] = useState(0)
  const [support, setSupport] = useState<AccesSupport | null>(null)
  // §4 B1/B3 — panneau « C'est quoi ? » et visite guidée
  const [aideOuverte, setAideOuverte] = useState(false)
  const [visite, setVisite] = useState(false)
  const [recherche, setRecherche] = useState('')
  useEffect(() => { setRecherche(window.location.search) }, [pathname])
  const article = articlePour(pathname ?? '', recherche, active)
  const video = videoPour(pathname ?? '')
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
      // Fonctionnalités en essai (lib/flags.ts ESSAI) : le serveur dit si CE compte y a accès.
      if (enEssai('crm') || enEssai('assistant') || enEssai('consoleV2')) {
        // Une seule requête par page, partagée avec useConsoleV2 (lib/consoleV2Client.ts).
        essaisDuCompte().then((e) => setEssais(e as Partial<Record<Flag, boolean>>)).catch(() => {})
      }
      // Première ouverture de la console : la visite guidée, une seule fois par artisan. Jamais lancée d'elle-même sur le
      // CRM (recette du 12/10) : elle montre le menu, pas le CRM, et recouvrait l'atelier à la première visite. Elle
      // reste rejouable depuis le panneau « ? », et partira à la prochaine page de la console.
      if (prof && actif('aideVisites') && VISITES.console?.length && !/^\/crm(\/|$)/.test(window.location.pathname)) {
        const vues = (prof as ArtisanInfo).aide_vues
        const deja = (Array.isArray(vues) ? vues : lireLocal()).includes('visite:console')
        if (!deja) setTimeout(() => setVisite(true), 700)
      }
      // Conversations non lues (badge Messages). Tolère l'absence de la colonne lu_le.
      // `.eq('artisan_id')` : sans lui, un fondateur comptait les conversations de TOUS les
      // artisans — la policy `founders_all_leads` le lui permettait, et son badge mentait.
      try {
        const { count } = await supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('artisan_id', data.session.user.id)
          .is('lu_le', null)
          .in('statut', ['nouveau', 'en_discussion'])
        setUnread(count ?? 0)
      } catch { /* colonne pas encore migrée : pas de badge */ }

      // Mode support : si Presti attend une réponse, ou regarde en ce moment, ça se voit sur TOUS
      // les écrans. Un accès qu'on ne peut voir qu'en allant le chercher dans les Paramètres est un
      // accès qu'on oublie ouvert.
      if (actif('supportArtisan')) {
        try {
          const r = await fetch('/api/securite/acces-support', { headers: { Authorization: `Bearer ${data.session.access_token}` } })
          if (r.ok) {
            const d = (await r.json()) as { acces?: AccesSupport[] }
            // L'ouvert passe avant l'attente : c'est celui où quelqu'un peut regarder maintenant.
            setSupport(d.acces?.find((x) => x.etat === 'ouvert') ?? d.acces?.find((x) => x.etat === 'en_attente') ?? null)
          }
        } catch { /* le bandeau n'est pas une raison de casser la console */ }
      }
    })
  }, [router])

  async function logout() {
    // v9 J2 — cet appareil cesse de recevoir les notifications AVANT que la session se ferme (revue du 06/09).
    const { data } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }))
    await Promise.race([desabonnerCetAppareil(data.session?.access_token), new Promise((r) => setTimeout(r, 2000))])
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

  // Refonte 18/10 — console v2 (drapeau consoleV2) : même chargement, même aide, même visite, même mode support ;
  // seule la coque change (app/console/CoqueV2.tsx). Drapeau baissé et compte hors essai : la coque ci-dessous, intacte.
  if (v2) {
    const bandeaux = (
      <>
        {a?.suppression_demandee_le && active !== 'parametres' ? (
          <a className="psh-grace" href="/parametres?onglet=donnees" role="status">
            <b>Votre compte sera supprimé le {new Date(new Date(a.suppression_demandee_le).getTime() + 30 * 86400000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}.</b>
            <span>Annuler ou exporter vos données →</span>
          </a>
        ) : null}
        {support && active !== 'parametres' ? (
          <a className={`psh-support${support.etat === 'ouvert' ? ' ouvert' : ''}`} href="/parametres?onglet=securite" role="status">
            {support.etat === 'ouvert'
              ? <><b>Presti peut consulter {support.element_titre || 'élément de votre compte'}{support.expire_le ? ` jusqu’à ${new Date(support.expire_le).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : ''}.</b><span>Fermer maintenant →</span></>
              : <><b>Presti demande à regarder {support.element_titre || 'un élément de votre compte'}.</b><span>Rien n’est visible tant que vous n’avez pas ouvert. Répondre →</span></>}
          </a>
        ) : null}
        <InstallerApp />
      </>
    )
    const boutonAide = (article || (video && actif('aideCentre'))) ? (
      <button type="button" className="psh-aide" data-visite="aide" onClick={() => setAideOuverte(true)} aria-label="C’est quoi, cet écran ?" title="C’est quoi, cet écran ?" aria-haspopup="dialog" aria-expanded={aideOuverte}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M9.6 9.3a2.5 2.5 0 0 1 4.9.7c0 1.6-2.5 2-2.5 3.5" /><circle cx="12" cy="17" r=".6" fill="currentColor" /></svg>
      </button>
    ) : null
    const revoir = actif('aideVisites') && VISITES.console?.length ? () => { setAideOuverte(false); setTimeout(() => setVisite(true), 250) } : undefined
    return (
      <>
        <CoqueV2 active={active} title={title} crumb={crumb} actions={actions} wide={wide} artisan={a} uid={uid} essais={essais} unread={unread}
          bandeaux={bandeaux} aide={boutonAide} onRevoirVisite={revoir} onLogout={logout} tiroirExterne={visite ? open : undefined}>
          {children}
        </CoqueV2>
        <AidePanneau article={article} video={video} open={aideOuverte} onClose={fermerAide} onRevoirVisite={revoir} />
        {/* 5.3 : en v2, la visite guidée est un diaporama (app/console/VisiteSlides.tsx), même mémoire que l'ancienne. */}
        {actif('aideVisites') && visite && !aideOuverte && <VisiteSlides onFin={finVisite} />}
        <MiseAJour />
        <NatifPont />
      </>
    )
  }

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

        {/* La navigation défile ; la marque et le pied restent. Sans ce conteneur, le menu du compte
            partait sous la ligne de flottaison dès qu'un écran faisait moins de 740 px de haut. */}
        <div className="psh-side-scroll">
        {isFounder && (
          <>
            <div className="psh-navlabel">Fondateur</div>
            <nav className="psh-nav">
              {/* UNE seule entrée (v11 §1) : « Direction » et « Poste de contrôle » menaient au même
                  endroit depuis la fusion, et deux liens vers un même écran font hésiter pour rien. */}
              <a className={active === 'controle' || active === 'direction' ? 'on' : ''} href="/controle">
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
              {g.items.filter((it) => !it.essai || essais[it.essai] === true).map((it) =>
                it.soon ? (
                  <a key={it.key} className={it.key === active ? 'on' : ''} aria-disabled="true" style={{ cursor: 'default', opacity: 0.6 }}>
                    {it.icon}{it.label}<span className="count">bientôt</span>
                  </a>
                ) : (
                  <a key={it.key} className={it.key === active ? 'on' : ''} href={it.href} data-visite={`nav-${it.key}`}>
                    {it.icon}{it.label}
                    {/* 15/10 : la plateforme (Ma plateforme, Messages, Réponses instantanées) et « Mes chiffres » commencent avec Studio — le badge n'apparaît que pour un compte qui n'a pas l'écran. */}
                    {it.offre && (!it.cap || (a && !peut(a.is_founder ? 'business' : a.plan, it.cap))) && <span className="count" title={it.cap ? `Disponible avec l’offre ${it.offre}` : undefined}>{it.offre}</span>}
                    {it.key === 'messages' && unread > 0 && <span className="count alert">{unread}</span>}
                  </a>
                )
              )}
            </nav>
          </div>
        ))}
        </div>

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
            <h1 tabIndex={-1}>{title}</h1>
          </div>
          {actions && <div className="psh-actions">{actions}</div>}
          {(article || (video && actif('aideCentre'))) && (
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
          {/* Mode support — le bandeau dit ce qui est vrai MAINTENANT, et rappelle qu'une demande
              ne montre rien. C'est la différence entre « on me demande » et « on me regarde ». */}
          {support && active !== 'parametres' ? (
            <a className={`psh-support${support.etat === 'ouvert' ? ' ouvert' : ''}`} href="/parametres?onglet=securite" role="status">
              {support.etat === 'ouvert' ? (
                <>
                  <b>Presti peut consulter {support.element_titre || 'élément de votre compte'}{support.expire_le ? ` jusqu’à ${new Date(support.expire_le).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : ''}.</b>
                  <span>Fermer maintenant →</span>
                </>
              ) : (
                <>
                  <b>Presti demande à regarder {support.element_titre || 'un élément de votre compte'}.</b>
                  <span>Rien n’est visible tant que vous n’avez pas ouvert. Répondre →</span>
                </>
              )}
            </a>
          ) : null}
          <InstallerApp />
          {children}
        </div>
      </div>

      <AidePanneau
        article={article}
        video={video}
        open={aideOuverte}
        onClose={fermerAide}
        onRevoirVisite={actif('aideVisites') && VISITES.console?.length ? () => { setAideOuverte(false); setTimeout(() => setVisite(true), 250) } : undefined}
      />
      {actif('aideVisites') && visite && !aideOuverte && <Visite surface="console" onEtape={etapeVisite} onFin={finVisite} />}
      <MiseAJour />
      <NatifPont />
    </div>
  )
}
