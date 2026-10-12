'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/app/AppShell'
import { appel, dateHeureFr } from './client'
import type { Vue } from './types'
import TableauCrmVue from './Tableau'
import PipelineVue from './Pipeline'
import ChantiersVue from './Chantiers'
import ClientsVue from './Clients'
import EquipeVue from './Equipe'
import Atelier from './atelier/Atelier'
import { DONNEES_EXEMPLE } from '@/lib/crm/exemple'

// CRM « atelier vivant » — les vues 2D (jalon J2), utilisables sans la 3D (J3).
//
// Une seule lecture (GET /api/crm/vue) alimente le tableau de bord, le pipeline, les chantiers et les clients : tout est
// calculé côté serveur par lib/crm/* à partir des VRAIES pièces du compte. Une lecture ratée n'affiche pas des zéros : elle
// affiche l'erreur. Aucune donnée d'exemple.
const ONGLETS = [
  { id: 'atelier', label: 'Atelier' },
  { id: 'tableau', label: 'Tableau de bord' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'chantiers', label: 'Chantiers' },
  { id: 'clients', label: 'Clients' },
  { id: 'equipe', label: 'Équipe & véhicules' },
] as const
type Onglet = (typeof ONGLETS)[number]['id']
const CLE_ONGLET = 'presti-crm-onglet'

export default function Crm() {
  const router = useRouter()
  const [onglet, setOnglet] = useState<Onglet>('atelier')
  // L'atelier d'exemple (données fictives, rien en base) : montré d'office tant que le compte n'a rien à mettre dans l'atelier.
  const [exemple, setExemple] = useState<boolean | null>(null)
  const [vue, setVue] = useState<Vue | null>(null)
  const [erreur, setErreur] = useState<{ message: string; verrou: boolean } | null>(null)
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    const depuisUrl = new URLSearchParams(window.location.search).get('vue')
    let memo: string | null = null
    try { memo = localStorage.getItem(CLE_ONGLET) } catch { /* préférence perdue : le tableau de bord */ }
    const choisi = [depuisUrl, memo].find((x) => ONGLETS.some((o) => o.id === x))
    if (choisi) setOnglet(choisi as Onglet)
  }, [])

  const charger = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    if (!data.session) { router.replace('/login'); return }
    const r = await appel<Vue>('/api/crm/vue')
    setChargement(false)
    if (!r.ok && r.status === 404) { router.replace('/dashboard'); return } // essai : compte hors liste
    if (!r.ok) { setErreur({ message: r.erreur, verrou: r.status === 403 && r.code === 'offre' }); return }
    setErreur(null)
    setVue(r.corps)
  }, [router])

  useEffect(() => {
    void charger()
    const revoir = () => { if (document.visibilityState === 'visible') void charger() }
    document.addEventListener('visibilitychange', revoir)
    return () => document.removeEventListener('visibilitychange', revoir)
  }, [charger])

  const choisir = (o: Onglet) => {
    setOnglet(o)
    try { localStorage.setItem(CLE_ONGLET, o) } catch { /* rien */ }
    const u = new URL(window.location.href); u.searchParams.set('vue', o); window.history.replaceState(null, '', u)
  }

  return (
    <AppShell active="crm" title="CRM atelier" crumb="Offre Signature · chantiers, clients, pipeline" wide>
      {erreur ? (
        <div className="psh-panel crm-verrou" role={erreur.verrou ? 'status' : 'alert'}>
          <div className="psh-empty">
            <p>{erreur.message}</p>
            {erreur.verrou ? <a className="psh-btn primary" href="/abonnement">Voir les offres</a> : <p className="muted">Rien n’est affiché plutôt que des chiffres faux.</p>}
          </div>
        </div>
      ) : chargement || !vue ? (
        <p className="muted" role="status">Lecture de vos demandes, devis, factures et chantiers…</p>
      ) : (
        <>
          <div className="crm-onglets" role="tablist" aria-label="Vues du CRM">
            {ONGLETS.map((o) => (
              <button key={o.id} type="button" role="tab" id={`crm-onglet-${o.id}`} aria-selected={onglet === o.id} aria-controls={`crm-vue-${o.id}`}
                className={onglet === o.id ? 'on' : ''} onClick={() => choisir(o.id)}>
                {o.label}
              </button>
            ))}
            <span className="crm-maj" aria-live="polite">Lu à {dateHeureFr(vue.maintenant).slice(-5)}</span>
          </div>
          {vue.tronque && <p className="crm-note" role="note">Votre historique dépasse 2 000 pièces : seules les plus récentes sont comptées.</p>}
          <section id={`crm-vue-${onglet}`} role="tabpanel" aria-labelledby={`crm-onglet-${onglet}`} className="crm-vue">
            {/* La maquette n'est montée que sur son onglet : le morceau 3D n'est jamais chargé ailleurs. */}
            {onglet === 'atelier' && (() => {
              const a = vue.atelier
              const vide = !a.chantiers.length && !a.materiaux.length && !a.vehicules.length && !a.membres.length && !a.demandes.length
              const montrer = exemple ?? vide
              return (
                <>
                  <div className="crm-note crm-exemple" role="note">
                    {montrer
                      ? <>Exemple : un atelier de plombier avec des données fictives, pour voir ce que donne le CRM. Rien n’est enregistré.{' '}<button type="button" className="psh-btn" onClick={() => setExemple(false)}>Voir mon atelier</button></>
                      : <>{vide ? 'Votre atelier est encore vide : il se remplit avec vos devis signés, vos chantiers, votre stock et votre équipe.' : 'Votre atelier, d’après vos données.'}{' '}<button type="button" className="psh-btn" onClick={() => setExemple(true)}>Voir l’atelier d’exemple</button></>}
                  </div>
                  {montrer
                    ? <Atelier key="exemple" donnees={DONNEES_EXEMPLE} demo />
                    : <Atelier key="mien" donnees={a} onVue2D={(v) => { if (ONGLETS.some((o) => o.id === v)) choisir(v as Onglet) }} />}
                </>
              )
            })()}
            {onglet === 'tableau' && <TableauCrmVue t={vue.tableau} />}
            {onglet === 'pipeline' && <PipelineVue p={vue.pipeline} onChange={charger} />}
            {onglet === 'chantiers' && <ChantiersVue chantiers={vue.chantiers} devisSignes={vue.devisSignesSansChantier} onChange={charger} />}
            {onglet === 'clients' && <ClientsVue clients={vue.clients} />}
            {onglet === 'equipe' && <EquipeVue />}
          </section>
        </>
      )}
    </AppShell>
  )
}
