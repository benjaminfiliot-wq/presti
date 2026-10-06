'use client'

import './chiffres.css'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/app/AppShell'
import Tableau from './Tableau'
import { calculer, type LigneDemande, type LigneDevis, type LigneFacture } from '@/lib/tableau-de-bord/calculer'

// Tableau de bord de gestion : cette page LIT et ne fait rien d'autre. Chaque requête porte
// `.eq('artisan_id', …)` EN PLUS de la RLS (un fondateur voit les lignes de tous les artisans sous
// RLS : sans ce filtre, son tableau additionnerait toute la base) ; le module de calcul écarte de
// toute façon une ligne qui n'est pas la sienne. Jamais de clé de service ici, jamais d'écriture.
//
// Un chargement raté n'affiche PAS des zéros : « 0 € facturé » sur une panne réseau est un mensonge.
const LIMITE = 1000

type Charge = { factures: LigneFacture[]; devis: LigneDevis[]; demandes: LigneDemande[]; tronque: boolean }

export default function Chiffres() {
  const router = useRouter()
  const [charge, setCharge] = useState<Charge | null>(null)
  const [erreur, setErreur] = useState(false)
  const [maintenant, setMaintenant] = useState<Date | null>(null)
  const [artisanId, setArtisanId] = useState<string | null>(null)

  useEffect(() => {
    let vivant = true
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const uid = data.session.user.id
      const { data: prof } = await supabase.from('artisans').select('id').eq('id', uid).maybeSingle()
      if (!prof) { router.replace('/onboarding'); return }
      const [f, d, l] = await Promise.all([
        supabase.from('factures').select('id, artisan_id, statut, date_emission, date_echeance, total_ttc, devis_id, avoir_de').eq('artisan_id', uid).order('date_emission', { ascending: false }).limit(LIMITE),
        supabase.from('devis').select('id, artisan_id, numero, client_nom, statut, date_emission, total_ttc, envoye_le, accepte_le, created_at, lead_id, validite_jours').eq('artisan_id', uid).order('created_at', { ascending: false }).limit(LIMITE),
        supabase.from('leads').select('id, artisan_id, canal, statut, created_at, type_chantier, ville').eq('artisan_id', uid).order('created_at', { ascending: false }).limit(LIMITE),
      ])
      if (!vivant) return
      if (f.error || d.error || l.error) { setErreur(true); return }
      const factures = (f.data ?? []) as LigneFacture[]
      const devis = (d.data ?? []) as LigneDevis[]
      const demandes = (l.data ?? []) as LigneDemande[]
      setArtisanId(uid)
      setMaintenant(new Date())
      setCharge({ factures, devis, demandes, tronque: [factures, devis, demandes].some((x) => x.length >= LIMITE) })
    })
    return () => { vivant = false }
  }, [router])

  const indicateurs = useMemo(
    () => (charge && artisanId && maintenant ? calculer({ artisanId, factures: charge.factures, devis: charge.devis, demandes: charge.demandes, maintenant }) : null),
    [charge, artisanId, maintenant],
  )

  return (
    <AppShell active="chiffres" title="Mes chiffres" crumb="Tableau de bord de gestion">
      {erreur ? (
        <div className="psh-panel"><div className="psh-empty" role="alert">Vos chiffres n’ont pas pu être chargés. Rechargez la page dans un instant.<br />Rien n’est affiché plutôt que des totaux faux.</div></div>
      ) : !indicateurs || !charge ? (
        <p className="muted">Chargement…</p>
      ) : (
        <Tableau i={indicateurs} tronque={charge.tronque} />
      )}
    </AppShell>
  )
}
