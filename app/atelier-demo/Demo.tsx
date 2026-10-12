'use client'

import '@/app/globals.css'
import '@/app/crm/crm.css'
import { useEffect, useState } from 'react'
import Atelier from '@/app/crm/atelier/Atelier'
import { PREREGLAGES, FILTRES, type DonneesAtelier, type Filtre, type Prereglage } from '@/lib/crm/atelier'
import { DONNEES_EXEMPLE, JOUR_EXEMPLE } from '@/lib/crm/exemple'
import type { NomVue } from '@/app/crm/atelier/Scene3D'

// Données FICTIVES de démonstration — jamais affichées à un artisan : cette page n'est servie qu'avec PRESTI_DEMO_ATELIER=1.
// Paramètres : ?metier=plombier&vue=ensemble|atelier|chantiers|dessus&filtre=retard&mode=3d|2d&mesure=1&vide=1
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
  return (
    <main style={{ background: 'var(--paper)', minHeight: '100vh', padding: 16 }}>
      <p className="crm-note" style={{ marginBottom: 8 }}>Démonstration interne · données fictives · rien n’est lu ni écrit.</p>
      <Atelier donnees={p.get('vide') === '1' ? VIDE : FICTIF} demo mesure={p.get('mesure') === '1'} prereglageInitial={metier} vueInitiale={vue as NomVue | undefined} filtreInitial={filtre} forcer={mode} />
    </main>
  )
}
