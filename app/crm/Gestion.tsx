'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { actif } from '@/lib/flags'
import { peut } from '@/lib/plans'
import BoiteAgents from './BoiteAgents'
import { OUTILS } from './outils/vue'

// L'OUTIL DE GESTION (03/11/2026, demande de Benj, mot pour mot : « j'avais juste demandé qu'on puisse tout voir via l'outil de gestion,
// donc le CRM. Juste tu vires tout ce qui va être devis, facture et tout, et tout va dans l'outil de gestion : là tu peux aller sur son
// CRM 3D ou voir le dashboard normal, et après tu peux accéder à tes devis et tout. »).
//
// Cet écran est le point d'entrée : /crm sans paramètre. Il ne lit AUCUNE donnée (aucun appel à l’API du CRM) : il s'ouvre pour tous les
// comptes, y compris ceux dont l'offre n'a pas le CRM 3D, parce que c'est par ici qu'on atteint maintenant les devis et les factures.
// Rien n'est supprimé : chaque adresse (/devis, /factures, /inventaire, /tarifs, /chiffres…) répond comme avant, seul le chemin change.

/** Les deux portes. `3d` ouvre l'atelier vivant (onglet « atelier » du CRM), `tableau` le tableau de bord normal. */
export const PORTES = [
  { cle: '3d', label: 'CRM 3D', href: '/crm?vue=atelier', detail: 'Votre entreprise en maquette : chantiers, clients, stock et équipe, à jour toute seule. Un clic sur un objet ouvre sa fiche.' },
  { cle: 'tableau', label: 'Tableau de bord', href: '/dashboard', detail:'La vue normale : ce qui est à faire aujourd’hui, vos demandes, vos chiffres du jour.' },
] as const

export type EcranGestion = { cle: string; label: string; href: string; detail: string; groupe: 'Pièces' | 'Chantiers et clients' | 'Pilotage'; drapeau?: 'crmPlanning' }

/** Chaque écran métier qui a quitté le menu principal, et où on le trouve maintenant. L'ordre est celui de l'affichage. */
export const ECRANS: readonly EcranGestion[] = [
  { cle: 'devis', label: 'Devis', href: '/devis', detail: 'Préparer, envoyer, suivre la signature.', groupe: 'Pièces' },
  { cle: 'factures', label: 'Factures', href: '/factures', detail: 'Émettre, encaisser, relancer les impayés.', groupe: 'Pièces' },
  { cle: 'tarifs', label: 'Mes tarifs', href: '/tarifs', detail: 'Votre bibliothèque de prix.', groupe: 'Pièces' },
  { cle: 'inventaire', label: 'Stock', href: '/inventaire', detail: 'Matériaux, seuils, commandes fournisseurs.', groupe: 'Pièces' },
  { cle: 'clients', label: 'Clients', href: '/crm?vue=clients', detail: 'Fiches client et historique.', groupe: 'Chantiers et clients' },
  { cle: 'chantiers', label: 'Chantiers', href: '/crm?vue=chantiers', detail: 'Statuts, tâches, matériel réservé.', groupe: 'Chantiers et clients' },
  { cle: 'planning', label: 'Planning', href: '/crm?vue=planning', detail: 'La semaine et l’agenda.', groupe: 'Chantiers et clients', drapeau: 'crmPlanning' },
  { cle: 'equipe', label: 'Équipe et véhicules', href: '/crm?vue=equipe', detail: 'Qui est où, avec quoi.', groupe: 'Chantiers et clients' },
  { cle: 'pipeline', label: 'Pipeline', href: '/crm?vue=pipeline', detail: 'Demandes, devis, signatures, paiements.', groupe: 'Pilotage' },
  { cle: 'chiffres', label: 'Mes chiffres', href: '/chiffres', detail: 'Chiffre d’affaires, marges, import Excel.', groupe: 'Pilotage' },
]

const GROUPES = ['Pièces', 'Chantiers et clients', 'Pilotage'] as const

/** Un petit bloc isométrique, purement décoratif : il annonce la maquette sans télécharger la scène 3D (three) avant le clic. */
function Maquette() {
  return (
    <svg className="gst-maquette" viewBox="0 0 120 80" aria-hidden="true" focusable="false">
      <g strokeLinejoin="round" strokeWidth="1">
        <path className="gst-sol" d="M60 8 112 36 60 64 8 36z" />
        <path className="gst-f1" d="M30 38 42 32 54 38 42 44z" /><path className="gst-f2" d="M30 38 42 44v12L30 50z" /><path className="gst-f3" d="M42 44 54 38v12L42 56z" />
        <path className="gst-f1" d="M62 28 78 20 94 28 78 36z" /><path className="gst-f2" d="M62 28 78 36v16L62 44z" /><path className="gst-f3" d="M78 36 94 28v16L78 52z" />
        <path className="gst-f1" d="M56 46 66 41 76 46 66 51z" /><path className="gst-f2" d="M56 46 66 51v7L56 53z" /><path className="gst-f3" d="M66 51 76 46v7L66 58z" />
      </g>
    </svg>
  )
}

export default function Gestion() {
  // Le plan sert à UNE chose : annoncer « Offre Signature » sur la porte 3D d'un compte qui ne l'a pas. Lecture ratée : pas de badge, la porte reste ouverte
  // (la page du CRM dit alors elle-même ce qui manque).
  const [plan, setPlan] = useState<string | null | undefined>(undefined)
  // 036-033 : un fondateur compte comme Business pour « Mes outils », comme dans les routes du circuit (lib/connexions/serveur.ts).
  const [fondateur, setFondateur] = useState(false)
  useEffect(() => {
    let vivant = true
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (!data.session) return
        const { data: prof } = await supabase.from('artisans').select('plan, is_founder').eq('id', data.session.user.id).maybeSingle()
        const p = prof as { plan?: string | null; is_founder?: boolean | null } | null
        if (vivant) { setPlan(p?.plan ?? null); setFondateur(p?.is_founder === true) }
      } catch { /* pas de badge */ }
    })()
    return () => { vivant = false }
  }, [])
  const sans3D = plan !== undefined && !peut(plan, 'crm')
  // 036-033 : le lien « Mes outils » n'existe que drapeau `connexions` levé ET si l'offre ouvre au moins un outil (peut()). Drapeau
  // baissé : rien dans le DOM (la page /crm/outils répond 404).
  const outils = actif('connexions') && plan !== undefined && OUTILS.some((o) => peut(fondateur ? 'business' : plan, o.capacite))

  return (
    <div className="gst" data-gestion>
      <h2 className="gst-titre">Que voulez-vous ouvrir ?</h2>
      <div className="gst-portes" role="group" aria-label="Deux façons d’ouvrir l’outil de gestion">
        {PORTES.map((p) => (
          <a key={p.cle} className={`gst-porte gst-porte-${p.cle}`} href={p.href} data-gestion-porte={p.cle}>
            {p.cle === '3d' && <Maquette />}
            <span className="gst-porte-texte">
              <b>{p.label}{p.cle === '3d' && sans3D ? <span className="pill warn gst-badge">Offre Signature</span> : null}</b>
              <span>{p.detail}</span>
            </span>
          </a>
        ))}
      </div>
      {/* 036-030 : les cartes préparées par les agents n8n, à valider (drapeau boiteAgents baissé : ne rend rien). */}
      <BoiteAgents />
      {GROUPES.map((g) => {
        const liste = ECRANS.filter((e) => e.groupe === g && (!e.drapeau || actif(e.drapeau)))
        return (
          <section key={g} className="gst-groupe" aria-labelledby={`gst-g-${g.length}`}>
            <h3 className="crm-sous" id={`gst-g-${g.length}`}>{g}</h3>
            <ul className="gst-liste">
              {liste.map((e) => (
                <li key={e.cle}>
                  <a href={e.href} data-gestion-ecran={e.cle}><b>{e.label}</b><span>{e.detail}</span></a>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
      {outils ? (
        <section className="gst-groupe" aria-labelledby="gst-g-outils" data-gestion-outils>
          <h3 className="crm-sous" id="gst-g-outils">Mes outils</h3>
          <ul className="gst-liste">
            <li>
              <a href="/crm/outils" data-gestion-ecran="outils"><b>Mes outils</b><span>Gmail, Google Agenda, Google Drive : connecter, voir, retirer.</span></a>
            </li>
          </ul>
        </section>
      ) : null}
    </div>
  )
}
