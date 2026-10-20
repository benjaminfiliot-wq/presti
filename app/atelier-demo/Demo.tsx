'use client'

import '@/app/globals.css'
import '@/app/crm/crm.css'
import { useEffect, useState } from 'react'
import Atelier from '@/app/crm/atelier/Atelier'
import { PREREGLAGES, FILTRES, type DonneesAtelier, type Filtre, type Prereglage } from '@/lib/crm/atelier'
import { DONNEES_EXEMPLE, JOUR_EXEMPLE, VUE_EXEMPLE, vitrineCarte, vitrineEtats, vitrineTypes } from '@/lib/crm/exemple'
import { estTypeBat } from '@/lib/crm/carte'
import type { NomVue } from '@/app/crm/atelier/Scene3D'
import { actif } from '@/lib/flags'
import { BASES, echantillonPourBase, METIERS_3D, type Base, type Metier3D, type Statut } from '@/lib/crm/infrastructure'

// Données FICTIVES de démonstration — jamais affichées à un artisan : cette page n'est servie qu'avec PRESTI_DEMO_ATELIER=1.
// Paramètres : ?metier=plombier&vue=ensemble|atelier|chantiers|dessus&filtre=retard&mode=3d|2d&mesure=1&vide=1
// Drapeau crmAtelierVivant levé seulement : &base=legere|atelier|entrepot (le jeu fictif est ramené à ce que la base suppose,
// lib/crm/infrastructure.ts, echantillonPourBase), &base=camion (sans local), &statut=societe|a_son_compte (forme juridique fictive),
// &camion=1 (le dernier véhicule devient un camion benne) et &heure=0..24 (jour, crépuscule, nuit). Drapeau baissé : ignorés.
// Lot 4 (même drapeau) : ?metier= accepte tous les métiers 3D (paysagiste, serrurier…), &stock=vide montre un stock vide, et la Vue
// fictive (lib/crm/exemple.ts) est passée à l'atelier : salle d'attente et poste des assistants, avec leurs dialogues d'exemple.
// Lot 5 (même drapeau) : &vitrine=etats&type=hotel (les quatre états d'un type), &vitrine=types (un chantier fini par type),
// &vitrine=carte (douze chantiers à leur direction réelle), &sansbase=1 (la base de l'artisan n'est pas située : couronne de repli).
const JOUR = JOUR_EXEMPLE
const FICTIF = DONNEES_EXEMPLE
const VIDE: DonneesAtelier = { jour: JOUR, metier: null, chantiers: [], materiaux: [], vehicules: [], membres: [], demandes: [] }

export default function Demo() {
  const [p, setP] = useState<URLSearchParams | null>(null)
  useEffect(() => { setP(new URLSearchParams(window.location.search)) }, [])
  if (!p) return null
  const metier = (PREREGLAGES as readonly string[]).includes(p.get('metier') ?? '') ? (p.get('metier') as Prereglage) : undefined
  const vue = (['ensemble', 'atelier', 'chantiers', 'dessus'] as const).find((v) => v === p.get('vue'))
  const filtre = (FILTRES as readonly string[]).includes(p.get('filtre') ?? '') ? (p.get('filtre') as Filtre) : null
  const mode = p.get('mode') === '2d' ? '2d' : p.get('mode') === '3d' ? '3d' : undefined
  const infra = actif('crmAtelierVivant')
  const base = infra && (BASES as readonly string[]).includes(p.get('base') ?? '') ? (p.get('base') as Base) : null
  const h = Number(p.get('heure'))
  const heure = infra && p.get('heure') !== null && Number.isFinite(h) && h >= 0 && h <= 24 ? h : null
  const statut = infra && (p.get('statut') === 'societe' || p.get('statut') === 'a_son_compte') ? (p.get('statut') as Statut) : undefined
  const camion = infra && p.get('camion') === '1'
  const metier3D = infra && (METIERS_3D as readonly string[]).includes(p.get('metier') ?? '') && !metier ? (p.get('metier') as Metier3D) : undefined
  const brut = p.get('vide') === '1' ? VIDE : base || statut || camion ? echantillonPourBase(FICTIF, base ?? 'entrepot', { statut, camion }) : FICTIF
  const vitrine = infra ? p.get('vitrine') : null
  const avecVitrine = vitrine === 'etats' ? vitrineEtats(estTypeBat(p.get('type')) ? (p.get('type') as string) : 'maison') : vitrine === 'types' ? vitrineTypes() : vitrine === 'carte' ? vitrineCarte() : brut
  const sansBase = infra && p.get('sansbase') === '1' ? { ...avecVitrine, carte: undefined, chantiers: avecVitrine.chantiers.map((c) => ({ ...c, lat: null, lng: null })) } : avecVitrine
  const donnees = infra && p.get('stock') === 'vide' ? { ...sansBase, materiaux: [], reservations: [] } : sansBase
  return (
    <main style={{ background: 'var(--paper)', minHeight: '100vh', padding: 16 }}>
      <p className="crm-note" style={{ marginBottom: 8 }}>Démonstration interne · données fictives · rien n’est lu ni écrit.</p>
      <Atelier donnees={donnees} demo mesure={p.get('mesure') === '1'} prereglageInitial={metier} vueInitiale={vue as NomVue | undefined} filtreInitial={filtre} forcer={mode} baseInitiale={base} heure={heure} metierInitial={metier3D} vue={infra && p.get('vide') !== '1' ? VUE_EXEMPLE : undefined} />
    </main>
  )
}
