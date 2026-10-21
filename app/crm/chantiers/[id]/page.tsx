'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import AppShell from '@/app/AppShell'
import FicheChantier from '../../FicheChantier'
import { bloquerEcritures } from '../../client'
import { BandeauFicheExemple, Lien, ModeExemple, useModeFiche } from '../../mode'
import { enEssai } from '@/lib/flags'
import AssistantCrm, { BoutonDemander } from '../../assistant/PanneauAssistant'
import type { ContexteAssistant } from '@/lib/crm/assistantCrm'

// La fiche chantier en pleine page (le contenu vit dans app/crm/FicheChantier.tsx, partagé avec le panneau de l'atelier).
// « ?exemple=1 » : la fiche d'un chantier de l'atelier d'exemple (lib/crm/exemple.ts), sans lecture ni écriture.
// 21/10 — l'assistant de gestion s'ouvre ICI, sur ce chantier (bouton « Assistant » de l'en-tête, « Demander à l'assistant ») ; dans
// l'exemple, ses réponses sont simulées et rien n'est écrit (app/crm/assistant/PanneauAssistant.tsx).
export default function FicheChantierPage() {
  const { id } = useParams<{ id: string }>()
  const [titre, setTitre] = useState('Chantier')
  const exemple = useModeFiche()
  bloquerEcritures(exemple !== false)
  const assistant = enEssai('assistant') && exemple !== null
  const contexte: ContexteAssistant = { type: 'chantier', id, libelle: titre }
  return (
    <AppShell active="crm" title={titre} crumb="CRM atelier · Fiche chantier" wide
      actions={assistant ? <AssistantCrm simule={exemple === true} contexteSelection={contexte} /> : undefined}>
      {exemple !== null && (
        <ModeExemple actif={exemple}>
          {exemple && <BandeauFicheExemple />}
          <p className="crm-boutons"><Lien className="crm-retour" href="/crm?vue=chantiers">← Tous les chantiers</Lien>{assistant && <BoutonDemander contexte={contexte} />}</p>
          <FicheChantier id={id} onTitre={setTitre} />
        </ModeExemple>
      )}
    </AppShell>
  )
}
