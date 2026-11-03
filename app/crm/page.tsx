'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/app/AppShell'
import Gestion from './Gestion'
import { appel, bloquerEcritures, dateHeureFr } from './client'
import type { Vue } from './types'
import TableauCrmVue from './Tableau'
import PipelineVue from './Pipeline'
import ChantiersVue from './Chantiers'
import ClientsVue from './Clients'
import { actif } from '@/lib/flags'
import PlanningVue from './Planning'
import EquipeVue from './Equipe'
import Atelier, { prechargerScene3D } from './atelier/Atelier'
import { BANDEAU_EXEMPLE, ecrireChoix, lireChoix, ModeExemple } from './mode'
import { useTempsReel } from './useTempsReel'
import { DONNEES_EXEMPLE, EQUIPE_EXEMPLE, JOUR_EXEMPLE, VUE_EXEMPLE } from '@/lib/crm/exemple'

// CRM « atelier vivant ».
//
// Une seule lecture (GET /api/crm/vue) alimente le tableau de bord, le pipeline, les chantiers, les clients et l'atelier :
// tout est calculé côté serveur par lib/crm/vue.ts à partir des VRAIES pièces du compte. Une lecture ratée n'affiche pas
// des zéros : elle affiche l'erreur.
//
// L'EXEMPLE (13/10, demande de Benj) : un seul interrupteur en haut du CRM, « Voir l'exemple / Voir mes données », d'office
// sur l'exemple quand le compte est vide. En exemple, TOUS les onglets montrent lib/crm/exemple.ts (calculé par le même
// lib/crm/vue.ts), // lignes fictives, rien de réel ne s'y mêle, et aucune écriture ne part (app/crm/mode.tsx, app/crm/client.ts).
//
// TEMPS RÉEL (15/10) : quand une donnée du compte change (dossier déplacé, devis signé, tâche cochée, stock modifié, chantier mis à
// jour…), Supabase Realtime le dit (app/crm/useTempsReel.ts, filtré sur le compte) et l'écran RELIT la même vue — le même calcul serveur,
// jamais un chiffre recomposé dans le navigateur. Une relecture qui ne change rien ne redessine rien (même contenu : même objet).
const ONGLETS = [
  { id: 'atelier', label: 'Atelier' },
  { id: 'tableau', label: 'Tableau de bord' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'chantiers', label: 'Chantiers' },
  { id: 'clients', label: 'Clients' },
  // 18/10, lot 3 (plan du 18/10, n°6) : le planning de la semaine et le lien d'agenda.
  { id: 'planning', label: 'Planning' },
  { id: 'equipe', label: 'Équipe & véhicules' },
] as const
// Les onglets montrés : le planning n'apparaît qu'avec son drapeau (lib/flags.ts, crmPlanning).
const ONGLETS_VISIBLES = ONGLETS.filter((o) => o.id !== 'planning' || actif('crmPlanning'))
type Onglet = (typeof ONGLETS)[number]['id']
const CLE_ONGLET = 'presti-crm-onglet'

/** Le compte n'a encore rien que le CRM sache montrer. */
const compteVide = (v: Vue) => v.pipeline.vide && !v.chantiers.length && !v.clients.length
  && !v.atelier.materiaux.length && !v.atelier.vehicules.length && !v.atelier.membres.length

/**
 * Le point d'entrée de l'OUTIL DE GESTION (03/11, demande de Benj). /crm sans paramètre s'ouvre sur le choix « CRM 3D » ou « Tableau de bord »
 * puis sur les écrans métier (app/crm/Gestion.tsx) : aucune lecture de données, donc ouvert à tous les comptes. Toute adresse qui nomme une
 * vue (?vue=…, ?exemple=1, ?mesure=1) ouvre le CRM tel qu'avant : rien n'est supprimé, les liens et signets existants marchent.
 */
export default function Crm() {
  const [porte, setPorte] = useState<'?' | 'choix' | 'vue'>('?')
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    setPorte(p.has('vue') || p.get('exemple') === '1' || p.get('mesure') === '1' ? 'vue' : 'choix')
  }, [])
  if (porte === 'vue') return <CrmVue />
  return (
    <AppShell active="crm" title="Outil de gestion" crumb="Devis, factures, stock, clients, chantiers" wide>
      {porte === 'choix' ? <Gestion /> : <p className="muted" role="status">Ouverture…</p>}
    </AppShell>
  )
}

function CrmVue() {
  const router = useRouter()
  const [onglet, setOnglet] = useState<Onglet>('atelier')
  // Le choix explicite de l'artisan (retenu pour cet onglet du navigateur) ; null = la règle : exemple si le compte est vide.
  const [choix, setChoix] = useState<'exemple' | 'donnees' | null>(null)
  const [vue, setVue] = useState<Vue | null>(null)
  const [uid, setUid] = useState<string | null>(null)
  const [luA, setLuA] = useState<string | null>(null)
  const empreinte = useRef('')
  const [erreur, setErreur] = useState<{ message: string; verrou: boolean } | null>(null)
  const [chargement, setChargement] = useState(true)
  // « ?mesure=1 » : la maquette publie ses mesures (première image, images/s) pour scripts/crm-exemple-qa.mjs.
  const [mesure, setMesure] = useState(false)

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    setMesure(p.get('mesure') === '1')
    let memo: string | null = null
    try { memo = localStorage.getItem(CLE_ONGLET) } catch { /* préférence perdue : l'atelier */ }
    const choisi = [p.get('vue'), memo].find((x) => ONGLETS_VISIBLES.some((o) => o.id === x))
    if (choisi) setOnglet(choisi as Onglet)
    setChoix(p.get('exemple') === '1' ? 'exemple' : lireChoix())
    // La maquette 3D se télécharge PENDANT la lecture des données, pas après (recette du 12/10 : premier affichage lent).
    if (!choisi || choisi === 'atelier') prechargerScene3D()
  }, [])

  const charger = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    if (!data.session) { router.replace('/login'); return }
    setUid(data.session.user.id)
    const r = await appel<Vue>('/api/crm/vue')
    setChargement(false)
    if (!r.ok && r.status === 404) { router.replace('/dashboard'); return } // essai : compte hors liste
    if (!r.ok) { setErreur({ message: r.erreur, verrou: r.status === 403 && r.code === 'offre' }); return }
    setErreur(null)
    // Même contenu qu'à la lecture précédente (hors l'heure de lecture) : on garde l'objet, rien ne se redessine ni ne se recalcule.
    const sans = JSON.stringify({ ...r.corps, maintenant: '' })
    if (sans !== empreinte.current) { empreinte.current = sans; setVue(r.corps) }
    setLuA(r.corps.maintenant)
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
    const u = new URL(window.location.href); u.searchParams.set('vue', o); u.searchParams.delete('exemple'); window.history.replaceState(null, '', u)
  }
  const basculer = (v: 'exemple' | 'donnees') => {
    setChoix(v); ecrireChoix(v)
    const u = new URL(window.location.href); u.searchParams.delete('exemple'); window.history.replaceState(null, '', u)
  }

  const vide = vue ? compteVide(vue) : false
  const exemple = !!vue && (choix ? choix === 'exemple' : vide)
  // En exemple, rien ne change jamais : aucune écoute.
  const { lien, dernier } = useTempsReel({ uid, actif: !!vue && !exemple, surChangement: charger, sans: vue && vue.rappels && !vue.rappels.disponibles ? ['crm_rappels'] : [] })
  // Posé pendant le rendu, avant tout clic possible : en exemple, app/crm/client.ts refuse toute écriture.
  bloquerEcritures(exemple)
  const v = exemple ? VUE_EXEMPLE : vue

  return (
    <AppShell active="crm" title="CRM atelier" crumb="Offre Signature · chantiers, clients, pipeline" wide>
      {erreur ? (
        <div className="psh-panel crm-verrou" role={erreur.verrou ? 'status' : 'alert'}>
          <div className="psh-empty">
            <p>{erreur.message}</p>
            {erreur.verrou ? <a className="psh-btn primary" href="/abonnement">Voir les offres</a> : <p className="muted">Rien n’est affiché plutôt que des chiffres faux.</p>}
          </div>
        </div>
      ) : chargement || !v ? (
        <p className="muted" role="status">Lecture de vos demandes, devis, factures et chantiers…</p>
      ) : (
        <ModeExemple actif={exemple}>
         <div className={`crm-racine${onglet === 'atelier' ? ' crm-plein' : ''}`}>
          <p className="crm-retour-gestion"><a className="crm-retour" href="/crm" data-gestion-retour>← Outil de gestion</a></p>
          <div className={`crm-mode${exemple ? ' exemple' : ''}`} role="note" data-crm-mode={exemple ? 'exemple' : 'donnees'}>
            {exemple ? (
              <>
                <p><b>{BANDEAU_EXEMPLE}</b> Un plombier imaginaire, au {JOUR_EXEMPLE.split('-').reverse().join('/')} : tous les onglets montrent les mêmes chantiers, clients et montants. Les boutons disent ce qu’ils feraient, sans rien envoyer.{vide ? ' Votre CRM se remplira avec vos demandes, devis, factures et chantiers.' : ''}</p>
                <button type="button" className="psh-btn primary" onClick={() => basculer('donnees')}>Voir mes données</button>
              </>
            ) : (
              <>
                <p>{vide ? 'Votre CRM est encore vide : il se remplit avec vos demandes, vos devis signés, vos chantiers, votre stock et votre équipe.' : 'Vos données, lues à l’instant.'}</p>
                <button type="button" className="psh-btn ghost" onClick={() => basculer('exemple')}>Voir l’exemple</button>
              </>
            )}
          </div>
          <div className="crm-onglets" role="tablist" aria-label="Vues du CRM">
            {ONGLETS_VISIBLES.map((o) => (
              <button key={o.id} type="button" role="tab" id={`crm-onglet-${o.id}`} aria-selected={onglet === o.id} aria-controls={`crm-vue-${o.id}`}
                className={onglet === o.id ? 'on' : ''} onClick={() => choisir(o.id)}>
                {o.label}
              </button>
            ))}
            <span className="crm-maj">{exemple ? 'Exemple' : `Lu à ${dateHeureFr(luA ?? v.maintenant).slice(-5)}`}</span>
          </div>
          {v.tronque && <p className="crm-note" role="note">Votre historique dépasse 2 000 pièces : seules les plus récentes sont comptées.</p>}
          <section id={`crm-vue-${onglet}`} role="tabpanel" aria-labelledby={`crm-onglet-${onglet}`} className="crm-vue">
            {/* La maquette n'est montée que sur son onglet : le morceau 3D n'est chargé qu'ici (et préchargé pendant la lecture). */}
            {onglet === 'atelier' && (() => {
              // « Atelier vivant » (drapeau crmAtelierVivant) : l'atelier reçoit la Vue entière, l'exemple compris (mêmes données fictives, rien d'écrit).
              const vivant = actif('crmAtelierVivant')
              const versVue = (x: string) => { if (ONGLETS_VISIBLES.some((o) => o.id === x)) choisir(x as Onglet) }
              return exemple
                ? <Atelier key="exemple" donnees={DONNEES_EXEMPLE} demo onVue2D={versVue} mesure={mesure} vue={vivant ? VUE_EXEMPLE : undefined} />
                : <Atelier key="mien" donnees={v.atelier} onVue2D={versVue} mesure={mesure} onChange={() => void charger()} lien={lien} dernier={dernier} vue={vivant ? v : undefined} />
            })()}
            {onglet === 'tableau' && <TableauCrmVue t={v.tableau} r={v.rappels} onChange={charger} />}
            {onglet === 'pipeline' && <PipelineVue p={v.pipeline} onChange={charger} jour={v.tableau.jour} />}
            {onglet === 'chantiers' && <ChantiersVue chantiers={v.chantiers} devisSignes={v.devisSignesSansChantier} onChange={charger} />}
            {onglet === 'clients' && <ClientsVue clients={v.clients} />}
            {onglet === 'planning' && actif('crmPlanning') && <PlanningVue atelier={v.atelier} rappels={v.rappels?.liste ?? []} jour={v.tableau.jour} onChange={charger} />}
            {onglet === 'equipe' && <EquipeVue key={exemple ? 'exemple' : 'mien'} donnees={exemple ? EQUIPE_EXEMPLE : undefined} />}
          </section>
         </div>
        </ModeExemple>
      )}
    </AppShell>
  )
}
