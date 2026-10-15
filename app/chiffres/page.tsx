'use client'

import './chiffres.css'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/app/AppShell'
import EcranVerrouille from '@/app/EcranVerrouille'
import { peut } from '@/lib/plans'
import TableauCompta from './TableauCompta'
import ComptaArtisan, { type EtatImport } from './ComptaArtisan'
import Automatisations, { automatisationsVisibles } from './Automatisations'
import { calculerCompta, PERIODE_PAR_DEFAUT, PERIODES, type DemandePresti, type DevisPresti, type FacturePresti, type Impaye, type PeriodeId } from '@/lib/comptaTableau'
import { calculer } from '@/lib/tableau-de-bord/calculer'
import { preparerRelance } from '@/lib/comptaArtisan'

// « Mes chiffres » : le tableau de bord comptable de l'artisan (refonte du 12/10/2026).
//
// Source 1, sans import : les factures, devis et demandes du compte, lus CÔTÉ SERVEUR par GET /api/compta/tableau
// (filtrés sur la session). Source 2 : les fichiers de l'artisan, rangés par l'assistant (ComptaArtisan), gardés dans
// ce navigateur. Les deux sont additionnés par UN seul calcul (lib/comptaTableau.ts), qui dit d'où vient chaque chiffre.
//
// La page ne fait que lire. Une lecture ratée n'affiche PAS des zéros : « 0 € facturé » sur une panne est un mensonge.
// Aucune donnée d'exemple : sans pièce ni fichier, l'écran dit ce qui va apparaître et comment commencer.
type Charge = { factures: FacturePresti[]; devis: DevisPresti[]; demandes: DemandePresti[]; maintenant: Date; tronque: boolean }
type Lu = { maintenant?: string; automatisations?: boolean; code?: string; offre?: string; factures?: FacturePresti[]; devis?: DevisPresti[]; demandes?: DemandePresti[]; tronque?: boolean; error?: string }
const CLE_PERIODE = 'presti-chiffres-periode'

// Le jeton de session : relu à chaque appel, jamais gardé.
const jetonSession = async () => (await supabase.auth.getSession()).data.session?.access_token ?? null
const heure = (d: Date) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })

export default function Chiffres() {
  const router = useRouter()
  const [artisanId, setArtisanId] = useState<string | null>(null)
  const [charge, setCharge] = useState<Charge | null>(null)
  const [erreur, setErreur] = useState('')
  // 15/10 : « Mes chiffres » commence avec Studio. Le serveur répond 403 { code: 'offre' } aux autres comptes — l'écran l'explique.
  const [verrou, setVerrou] = useState(false)
  // Les automatisations de l'écran (alerte impayés, export mensuel) : Signature (`chiffres.auto`), dit par le serveur.
  const [auto, setAuto] = useState(false)
  const [plan, setPlan] = useState<string | null>(null)
  const [periode, setPeriode] = useState<PeriodeId>(PERIODE_PAR_DEFAUT)
  const [importe, setImporte] = useState<EtatImport>({ artisanId: '', lignes: [], apercu: false, ajoutees: 0 })
  const [brouillon, setBrouillon] = useState<string | null>(null)

  useEffect(() => {
    try { const p = localStorage.getItem(CLE_PERIODE); if (p && PERIODES.some((x) => x.id === p)) setPeriode(p as PeriodeId) } catch { /* préférence perdue : la période par défaut */ }
  }, [])

  const charger = useCallback(async (uid: string, vivant: () => boolean) => {
    const jeton = await jetonSession()
    if (!jeton) { router.replace('/login'); return }
    const rep = await fetch('/api/compta/tableau', { headers: { Authorization: `Bearer ${jeton}` }, cache: 'no-store' }).catch(() => null)
    const corps = rep ? await rep.json().catch(() => null) as Lu | null : null
    if (!vivant()) return
    if (rep?.status === 403 && corps?.code === 'offre') { setVerrou(true); return }
    if (!rep?.ok || !corps || !Array.isArray(corps.factures) || !Array.isArray(corps.devis) || !Array.isArray(corps.demandes)) {
      setErreur(corps?.error ?? 'Vos chiffres n’ont pas pu être chargés. Rechargez la page dans un instant.')
      return
    }
    const quand = corps.maintenant ? new Date(corps.maintenant) : new Date()
    setErreur(''); setAuto(corps.automatisations === true)
    setCharge({ factures: corps.factures, devis: corps.devis, demandes: corps.demandes, maintenant: Number.isNaN(quand.getTime()) ? new Date() : quand, tronque: !!corps.tronque })
    setArtisanId(uid)
  }, [router])

  useEffect(() => {
    let ouvert = true
    const vivant = () => ouvert
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const uid = data.session.user.id
      const { data: prof } = await supabase.from('artisans').select('id, plan').eq('id', uid).maybeSingle()
      if (!vivant()) return
      if (!prof) { router.replace('/onboarding'); return }
      setPlan((prof.plan as string | null) ?? null)
      // L'offre ne donne pas l'écran : on l'explique tout de suite, sans lire ni monter quoi que ce soit (le serveur refuse aussi).
      if (!peut(prof.plan as string | null, 'chiffres')) { setVerrou(true); return }
      setArtisanId(uid)
      await charger(uid, vivant)
    })
    // Revenir sur l'onglet relit les données : une facture payée entre-temps change le tableau sans recharger la page.
    const revoir = () => { if (document.visibilityState === 'visible') supabase.auth.getSession().then(({ data }) => { if (data.session && vivant()) void charger(data.session.user.id, vivant) }) }
    document.addEventListener('visibilitychange', revoir)
    return () => { ouvert = false; document.removeEventListener('visibilitychange', revoir) }
  }, [router, charger])

  // Un brouillon de relance appartient au compte qui l'a préparé.
  useEffect(() => { setBrouillon(null) }, [artisanId])

  const choisirPeriode = (p: PeriodeId) => { setPeriode(p); try { localStorage.setItem(CLE_PERIODE, p) } catch { /* rien */ } }

  // Les lignes importées ne comptent que pour le compte qui les a envoyées (jamais celles d'un compte précédent).
  const importeDuCompte = importe.artisanId === artisanId ? importe : null
  const vue = useMemo(
    () => (charge && artisanId ? calculerCompta({ artisanId, factures: charge.factures, devis: charge.devis, demandes: charge.demandes, lignes: importeDuCompte?.lignes ?? [], periode, maintenant: charge.maintenant }) : null),
    [charge, artisanId, importeDuCompte, periode],
  )
  // Les blocs « devis à relancer » et « vos chantiers » restent ceux du calcul de gestion (lib/tableau-de-bord/calculer.ts) ;
  // aucun montant de chiffre d'affaires n'en est affiché ici : il n'y a qu'un chiffre d'affaires, celui de lib/comptaTableau.ts.
  const indicateurs = useMemo(
    () => (charge && artisanId ? calculer({ artisanId, factures: charge.factures, devis: charge.devis, demandes: charge.demandes, maintenant: charge.maintenant }) : null),
    [charge, artisanId],
  )

  function relancer(i: Impaye) {
    setBrouillon(preparerRelance({ ligne: 1, date: i.emission.split('-').reverse().join('/'), libelle: i.origine === 'presti' ? `notre facture ${i.numero ?? ''}`.trim() : i.libelle, tiers: i.client, sens: 'recette', montant: i.montant, categorie: '', statut: 'impaye', source: i.ref }))
    requestAnimationFrame(() => document.getElementById('cpt-brouillon')?.focus())
  }

  if (verrou) {
    return <AppShell active="chiffres" title="Mes chiffres" crumb="Réservé à l’offre Studio et au-dessus"><EcranVerrouille ecran="chiffres" plan={plan} /></AppShell>
  }

  return (
    <AppShell active="chiffres" title="Mes chiffres" crumb="Tableau de bord comptable">
      {erreur ? (
        <div className="psh-panel"><div className="psh-empty" role="alert">{erreur}<br />Rien n’est affiché plutôt que des totaux faux.</div></div>
      ) : !vue || !charge ? (
        <p className="muted" role="status">Lecture de vos factures, devis et demandes…</p>
      ) : (
        <TableauCompta vue={vue} indicateurs={indicateurs} periode={periode} onPeriode={choisirPeriode} onRelance={relancer} majLe={heure(charge.maintenant)} apercu={importeDuCompte?.apercu ? importeDuCompte.ajoutees : 0} tronque={charge.tronque} />
      )}
      {brouillon !== null && (
        <section className="psh-panel cpt-brouillon" data-compta-brouillon aria-labelledby="cpt-brouillon-titre">
          <div className="ca-entete"><h2 id="cpt-brouillon-titre">Brouillon de relance à relire</h2><button type="button" className="ca-secondaire" onClick={() => setBrouillon(null)}>Fermer</button></div>
          <p className="cpt-note">Rien n’a été envoyé. Relisez, puis copiez ce texte dans votre e-mail ou votre SMS.</p>
          <textarea id="cpt-brouillon" value={brouillon} onChange={(e) => setBrouillon(e.target.value)} aria-label="Brouillon de relance" rows={7} />
          <div className="ca-actions ca-actions--gauche"><button type="button" className="ca-secondaire" onClick={() => { void navigator.clipboard?.writeText(brouillon) }}>Copier le texte</button></div>
        </section>
      )}
      {artisanId && <ComptaArtisan artisanId={artisanId} obtenirJeton={jetonSession} onLignes={setImporte} />}
      {artisanId && automatisationsVisibles() && (auto
        ? <Automatisations obtenirJeton={jetonSession} />
        : <section className="psh-panel cpt-auto" data-compta-automatisations-verrou><p className="ca-eyebrow">Automatisations</p><h2>Laissez Presti surveiller pour vous</h2><p className="cpt-note">L’alerte sur les impayés et l’export mensuel à votre comptable sont des automatisations de l’offre Signature. <a href="/abonnement">Voir les offres</a></p></section>)}
    </AppShell>
  )
}
