'use client'

// La coque de la console v2 (refonte 18/10, étape 5.1 ; piste A « Instrument » ; plans/refonte-1018/ARCHITECTURE.md §2).
// AppShell garde le chargement (session, artisan, essais, non-lus, mode support…) et choisit la coque ; celle-ci ne fait que
// la présentation : menu GROUPÉ (Aujourd'hui · Clients · Atelier · Ma présence · Pilotage · Compte), repli en icônes,
// palette Ctrl+K, compteurs, barre d'état, barre du bas sur téléphone. Les conditions d'affichage des entrées (drapeaux,
// essais) sont celles d'AppShell ; les pastilles d'offre ne sont qu'une présentation : le verrou reste côté serveur (peut()).
import '@/components/ui/ui.css'
import './coque-v2.css'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { actif, enEssai, type Flag } from '@/lib/flags'
import { offreMinimale, peut, PLANS, type Capacite } from '@/lib/plans'
import { calculer } from '@/lib/tableau-de-bord/calculer'
import { Icone } from '@/components/ui/icones'
import { BarreEtat } from '@/components/ui/base'
import Palette, { type Commande } from '@/components/ui/Palette'
import Toasts from '@/components/ui/Toasts'
import Marque from '@/app/Marque'

export type ArtisanCoque = { nom: string | null; metier: string | null; plan: string | null; is_founder: boolean | null; credits: number | null; logo_url: string | null; email: string | null }
type Entree = { key: string; label: string; href: string; icone: string; cap?: Capacite; compteur?: 'messages' | 'devis' | 'factures'; essai?: Flag }
type Groupe = { titre: string | null; entrees: Entree[] }
type Compteurs = { devis: number; factures: number }

const CLE_REPLI = 'presti.menu-replie'

function groupes(essais: Partial<Record<Flag, boolean>>): Groupe[] {
  const ouvert = (f: Flag) => enEssai(f) && essais[f] === true
  const g: Groupe[] = [
    { titre: null, entrees: [{ key: 'dashboard', label: 'Aujourd’hui', href: '/dashboard', icone: 'jour' }] },
    { titre: 'Clients', entrees: [
      { key: 'messages', label: 'Messages', href: '/messages', icone: 'messages', cap: 'plateforme.conversation', compteur: 'messages' },
      { key: 'outils', label: 'Réponses instantanées', href: '/outils', icone: 'reponses', cap: 'plateforme.conversation' },
      { key: 'devis', label: 'Devis', href: '/devis', icone: 'devis', compteur: 'devis' },
      { key: 'factures', label: 'Factures', href: '/factures', icone: 'factures', compteur: 'factures' },
      ...(ouvert('crm') ? [{ key: 'crm', label: 'CRM', href: '/crm', icone: 'crm', cap: 'crm' as Capacite, essai: 'crm' as Flag }] : []),
    ] },
    { titre: 'Atelier', entrees: [
      { key: 'inventaire', label: 'Inventaire', href: '/inventaire', icone: 'inventaire' },
      { key: 'tarifs', label: 'Mes tarifs', href: '/tarifs', icone: 'tarifs' },
    ] },
    { titre: 'Ma présence', entrees: [
      { key: 'profil', label: 'Ma page', href: '/profil', icone: 'page' },
      { key: 'plateforme', label: 'Ma plateforme', href: '/plateforme', icone: 'plateforme', cap: 'plateforme.gestion' },
      ...(actif('siteCommandeVente') ? [{ key: 'site', label: 'Mon site', href: '/site/commander', icone: 'site' }] : []),
    ] },
    { titre: 'Pilotage', entrees: [
      { key: 'chiffres', label: 'Mes chiffres', href: '/chiffres', icone: 'chiffres', cap: 'chiffres' },
      ...(ouvert('assistant') ? [{ key: 'assistant', label: 'Assistant', href: '/assistant', icone: 'assistant', cap: 'assistant' as Capacite, essai: 'assistant' as Flag }] : []),
    ] },
  ]
  return g
}

const MENU_COMPTE: { href: string; label: string; icone: string }[] = [
  { href: '/parametres', label: 'Paramètres', icone: 'reglages' },
  { href: '/parametres?onglet=abonnement', label: 'Abonnement et usage', icone: 'abonnement' },
  { href: '/parametres?onglet=securite', label: 'Sécurité', icone: 'securite' },
]

const initiales = (nom: string | null) => (nom ? nom.trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? '').join('') || 'P' : 'P')

/** Les compteurs du menu : MÊME calcul que Mes chiffres (lib/tableau-de-bord/calculer.ts), sur les pièces du compte (RLS). */
async function lireCompteurs(uid: string): Promise<Compteurs | null> {
  const [d, f] = await Promise.all([
    supabase.from('devis').select('id, artisan_id, numero, client_nom, statut, date_emission, total_ttc, envoye_le, accepte_le, created_at, validite_jours').eq('artisan_id', uid).eq('statut', 'envoye').limit(1000),
    supabase.from('factures').select('id, artisan_id, statut, date_emission, date_echeance, total_ttc, devis_id, avoir_de').eq('artisan_id', uid).limit(1000),
  ])
  if (d.error || f.error) return null
  const i = calculer({ artisanId: uid, devis: d.data ?? [], factures: f.data ?? [], demandes: [], maintenant: new Date() })
  return { devis: i.aRelancer.total, factures: i.argent.nbEnRetard }
}

export default function CoqueV2({ active, title, crumb, actions, wide, children, artisan, uid, essais, unread, bandeaux, aide, onRevoirVisite, onLogout }: {
  active: string; title: string; crumb?: string; actions?: ReactNode; wide?: boolean; children: ReactNode
  artisan: ArtisanCoque | null; uid: string | null; essais: Partial<Record<Flag, boolean>>; unread: number
  bandeaux?: ReactNode; aide?: ReactNode; onRevoirVisite?: () => void; onLogout: () => void
}) {
  const pathname = usePathname()
  const [replie, setReplie] = useState(false)
  const [tiroir, setTiroir] = useState(false)
  const [compte, setCompte] = useState(false)
  const [palette, setPalette] = useState(false)
  const [compteurs, setCompteurs] = useState<Compteurs | null>(null)
  const [enLigne, setEnLigne] = useState(true)
  const plan = artisan?.is_founder ? 'business' : artisan?.plan ?? null
  const G = useMemo(() => groupes(essais), [essais])

  useEffect(() => { try { setReplie(localStorage.getItem(CLE_REPLI) === '1') } catch { /* rien */ } }, [])
  useEffect(() => { setTiroir(false); setCompte(false) }, [pathname])
  useEffect(() => { if (uid) void lireCompteurs(uid).then(setCompteurs).catch(() => setCompteurs(null)) }, [uid])
  useEffect(() => {
    const maj = () => setEnLigne(navigator.onLine)
    maj(); window.addEventListener('online', maj); window.addEventListener('offline', maj)
    return () => { window.removeEventListener('online', maj); window.removeEventListener('offline', maj) }
  }, [])

  const basculerRepli = useCallback(() => setReplie((v) => { const n = !v; try { localStorage.setItem(CLE_REPLI, n ? '1' : '0') } catch { /* rien */ } return n }), [])
  // `[` replie le menu ; Échap ferme le tiroir et le menu du compte. Jamais dans un champ de saisie.
  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement | null
      const saisie = !!cible && (cible.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(cible.tagName))
      if (e.key === 'Escape') { setTiroir(false); setCompte(false); return }
      if (!saisie && e.key === '[' && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); basculerRepli() }
    }
    const surRetour = (e: Event) => { if (tiroir) { e.preventDefault(); setTiroir(false) } }
    document.addEventListener('keydown', surTouche)
    window.addEventListener('presti:retour', surRetour)
    return () => { document.removeEventListener('keydown', surTouche); window.removeEventListener('presti:retour', surRetour) }
  }, [basculerRepli, tiroir])

  const valeurCompteur = (c?: Entree['compteur']) => c === 'messages' ? unread : c === 'devis' ? compteurs?.devis ?? 0 : c === 'factures' ? compteurs?.factures ?? 0 : 0
  const libelleCompteur = (c: Entree['compteur'], n: number) => c === 'messages' ? `${n} non lu${n > 1 ? 's' : ''}` : c === 'devis' ? `${n} à relancer` : `${n} en retard`

  const commandes: Commande[] = useMemo(() => [
    ...G.flatMap((g) => g.entrees.map((e) => ({ id: `aller-${e.key}`, groupe: 'Aller à', libelle: e.label, icone: e.icone, href: e.href, indice: e.cap && !peut(plan, e.cap) ? `Avec ${PLANS[offreMinimale(e.cap) ?? 'signature'].label}` : undefined }))),
    { id: 'creer-devis', groupe: 'Créer', libelle: 'Nouveau devis', icone: 'ajouter', href: '/devis/nouveau', motsCles: 'chiffrer' },
    { id: 'creer-materiau', groupe: 'Créer', libelle: 'Ajouter un matériau', icone: 'inventaire', href: '/inventaire', motsCles: 'stock' },
    ...(onRevoirVisite ? [{ id: 'aide-visite', groupe: 'Aide', libelle: 'Revoir la visite guidée', icone: 'aide', action: onRevoirVisite }] : []),
    ...(actif('aideCentre') ? [{ id: 'aide-centre', groupe: 'Aide', libelle: 'Centre d’aide', icone: 'aide', href: '/aide' }] : []),
    ...MENU_COMPTE.map((m) => ({ id: `compte-${m.href}`, groupe: 'Compte', libelle: m.label, icone: m.icone, href: m.href })),
  ], [G, plan, onRevoirVisite])

  const chercher = useCallback(async (q: string): Promise<Commande[]> => {
    const { data } = await supabase.auth.getSession()
    const jeton = data.session?.access_token
    if (!jeton) return []
    const r = await fetch(`/api/console/recherche?q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${jeton}` }, cache: 'no-store' })
    if (!r.ok) return []
    const j = (await r.json()) as { resultats?: { type: string; id: string; titre: string; detail: string; href: string }[] }
    const TYPE: Record<string, string> = { devis: 'Devis', facture: 'Facture', client: 'Client', materiau: 'Matériau' }
    const ICONE: Record<string, string> = { devis: 'devis', facture: 'factures', client: 'page', materiau: 'inventaire' }
    return (j.resultats ?? []).map((x) => ({ id: `r-${x.type}-${x.id}`, groupe: 'Résultats', libelle: x.detail ? `${x.titre} — ${x.detail}` : x.titre, icone: ICONE[x.type], indice: TYPE[x.type], href: x.href }))
  }, [])

  const credits = artisan ? { restants: artisan.credits ?? 0, total: artisan.is_founder ? null : PLANS[(artisan.plan ?? 'gratuit') as keyof typeof PLANS]?.creditsMois ?? null } : undefined
  const offre = artisan ? (artisan.is_founder ? 'Fondateur' : PLANS[(artisan.plan ?? 'gratuit') as keyof typeof PLANS]?.label ?? null) : null
  const BAS: { key: string; label: string; href?: string; icone: string; compteur?: Entree['compteur'] }[] = [
    { key: 'dashboard', label: 'Aujourd’hui', href: '/dashboard', icone: 'jour' },
    { key: 'messages', label: 'Messages', href: '/messages', icone: 'messages', compteur: 'messages' },
    { key: 'devis', label: 'Devis', href: '/devis', icone: 'devis', compteur: 'devis' },
    { key: 'factures', label: 'Factures', href: '/factures', icone: 'factures', compteur: 'factures' },
  ]
  const actifDansBas = BAS.some((b) => b.key === active)

  return (
    <div className={`c2-app${replie ? ' c2-replie' : ''}${tiroir ? ' c2-tiroir' : ''}`}>
      <a className="c2-evitement" href="#c2-contenu">Aller au contenu</a>
      <div className="c2-voile" onClick={() => setTiroir(false)} aria-hidden="true" />
      <aside className="c2-menu" id="c2-menu" aria-label="Menu de la console" data-visite="sidebar">
        <div className="c2-marque">
          <a href="/dashboard" className="c2-logo" aria-label="Presti, aujourd’hui"><span className="c2-logo-i marque" aria-hidden="true"><Marque size={26} /></span><b>Presti</b></a>
          <button type="button" className="c2-replier" onClick={basculerRepli} aria-pressed={replie} aria-label={replie ? 'Déplier le menu' : 'Replier le menu en icônes'} title={`${replie ? 'Déplier' : 'Replier'} le menu ( [ )`}><Icone nom="replier" /></button>
        </div>
        <button type="button" className="c2-cherche" onClick={() => setPalette(true)} aria-label="Rechercher ou aller à (Ctrl+K)" aria-haspopup="dialog">
          <Icone nom="cherche" /><span className="c2-lib">Rechercher…</span><span className="ui-kbd c2-lib">Ctrl K</span>
        </button>
        <nav className="c2-defile">
          {artisan?.is_founder ? (
            <div className="c2-groupe"><span className="c2-groupe-t c2-lib">Fondateur</span>
              <a className={`c2-it${active === 'controle' || active === 'direction' ? ' on' : ''}`} href="/controle" title="Poste de contrôle" aria-current={active === 'controle' ? 'page' : undefined}><Icone nom="controle" /><span className="c2-lib">Poste de contrôle</span></a>
            </div>
          ) : null}
          {G.map((g) => (
            <div className="c2-groupe" key={g.titre ?? 'jour'} role="group" aria-label={g.titre ?? 'Aujourd’hui'}>
              {g.titre ? <span className="c2-groupe-t c2-lib" aria-hidden="true">{g.titre}</span> : null}
              {g.entrees.map((e) => {
                const n = valeurCompteur(e.compteur)
                const verrou = e.cap && artisan && !peut(plan, e.cap) ? offreMinimale(e.cap) : null
                return (
                  <a key={e.key} className={`c2-it${e.key === active ? ' on' : ''}`} href={e.href} title={replie ? e.label : undefined} data-visite={`nav-${e.key}`} aria-current={e.key === active ? 'page' : undefined}>
                    <Icone nom={e.icone} />
                    <span className="c2-lib">{e.label}</span>
                    {n > 0 ? <span className={`c2-cpt${e.compteur === 'messages' ? '' : ' doux'}`} aria-label={libelleCompteur(e.compteur, n)}>{n}</span>
                      : verrou ? <span className="ui-offre c2-lib" title={`Disponible avec l’offre ${PLANS[verrou].label}`}>{PLANS[verrou].label}</span> : null}
                  </a>
                )
              })}
            </div>
          ))}
          {actif('aideCentre') ? (
            <div className="c2-groupe" role="group" aria-label="Aide">
              <span className="c2-groupe-t c2-lib" aria-hidden="true">Aide</span>
              <a className={`c2-it${active === 'aide' ? ' on' : ''}`} href="/aide" title={replie ? 'Centre d’aide' : undefined}><Icone nom="aide" /><span className="c2-lib">Aide et visite guidée</span></a>
            </div>
          ) : null}
        </nav>
        <div className="c2-pied">
          {compte ? (
            <div className="c2-compte-menu" role="menu">
              <div className="c2-compte-id"><b>{artisan?.nom || 'Mon compte'}</b>{artisan?.email ? <span>{artisan.email}</span> : null}</div>
              {MENU_COMPTE.map((m) => <a key={m.href} href={m.href} role="menuitem"><Icone nom={m.icone} />{m.label}</a>)}
              <button type="button" role="menuitem" onClick={onLogout}><Icone nom="sortie" />Se déconnecter</button>
            </div>
          ) : null}
          <button type="button" className="c2-compte" onClick={() => setCompte((v) => !v)} aria-haspopup="menu" aria-expanded={compte}>
            {artisan?.logo_url
              // eslint-disable-next-line @next/next/no-img-element
              ? <span className="c2-ava"><img src={artisan.logo_url} alt="" /></span>
              : <span className="c2-ava" aria-hidden="true">{initiales(artisan?.nom ?? null)}</span>}
            <span className="c2-lib c2-qui"><b>{artisan?.nom || 'Mon compte'}</b><small>{offre}{credits && credits.restants !== null ? <> · <span className="ui-mono">{credits.restants}{credits.total ? ` / ${credits.total}` : ''}</span> crédits</> : null}</small></span>
          </button>
        </div>
      </aside>

      <div className="c2-cadre">
        <header className="c2-entete">
          <button type="button" className="c2-burger ui-ctl" onClick={() => setTiroir(true)} aria-label="Ouvrir le menu" aria-expanded={tiroir} aria-controls="c2-menu"><Icone nom="menu" /></button>
          <div className="c2-titre">
            {crumb ? <span className="c2-fil">{crumb}</span> : null}
            <h1 tabIndex={-1}>{title}</h1>
          </div>
          <div className="c2-actions">
            <span className="c2-etat"><BarreEtat synchro={enLigne ? 'ok' : 'hors-ligne'} credits={credits} offre={offre} /></span>
            {actions}
            {aide}
          </div>
        </header>
        <main id="c2-contenu" className={`c2-contenu${wide ? ' large' : ''}`} tabIndex={-1}>
          {bandeaux}
          {children}
        </main>
      </div>

      <nav className="c2-bas" aria-label="Accès rapide">
        {BAS.map((b) => {
          const n = valeurCompteur(b.compteur)
          return (
            <a key={b.key} href={b.href} className={b.key === active ? 'on' : ''} aria-current={b.key === active ? 'page' : undefined}>
              <Icone nom={b.icone} />{b.label}{n > 0 ? <span className="c2-cpt" aria-label={libelleCompteur(b.compteur, n)}>{n}</span> : null}
            </a>
          )
        })}
        <button type="button" className={!actifDansBas ? 'on' : ''} onClick={() => setTiroir(true)} aria-expanded={tiroir} aria-controls="c2-menu"><Icone nom="plus" />Plus</button>
      </nav>

      <Palette commandes={commandes} chercher={chercher} ouvert={palette || undefined} onFermer={() => setPalette(false)} />
      <Toasts />
    </div>
  )
}
