'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import AppShell from '@/app/AppShell'
import FicheChantier from '../../FicheChantier'
import { bloquerEcritures } from '../../client'
import { BandeauFicheExemple, Lien, ModeExemple, useModeFiche } from '../../mode'

// La fiche chantier en pleine page (le contenu vit dans app/crm/FicheChantier.tsx, partagé avec le panneau de l'atelier).
// « ?exemple=1 » : la fiche d'un chantier de l'atelier d'exemple (lib/crm/exemple.ts), sans lecture ni écriture.
export default function FicheChantierPage() {
  const { id } = useParams<{ id: string }>()
  const [titre, setTitre] = useState('Chantier')
  const exemple = useModeFiche()
  bloquerEcritures(exemple !== false)
  return (
    <AppShell active="crm" title={titre} crumb="CRM atelier · Fiche chantier" wide>
      {exemple !== null && (
        <ModeExemple actif={exemple}>
          {exemple && <BandeauFicheExemple />}
          <p><Lien className="crm-retour" href="/crm?vue=chantiers">← Tous les chantiers</Lien></p>
          <FicheChantier id={id} onTitre={setTitre} />
        </ModeExemple>
      )}
    </AppShell>
  )
}
