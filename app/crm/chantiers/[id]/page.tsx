'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import AppShell from '@/app/AppShell'
import FicheChantier from '../../FicheChantier'

// La fiche chantier en pleine page (le contenu vit dans app/crm/FicheChantier.tsx, partagé avec le panneau de l'atelier).
export default function FicheChantierPage() {
  const { id } = useParams<{ id: string }>()
  const [titre, setTitre] = useState('Chantier')
  return (
    <AppShell active="crm" title={titre} crumb="CRM atelier · Fiche chantier" wide>
      <p><a className="crm-retour" href="/crm?vue=chantiers">← Tous les chantiers</a></p>
      <FicheChantier id={id} onTitre={setTitre} />
    </AppShell>
  )
}
