'use client'

import { useState } from 'react'
import AppShell from '@/app/AppShell'
import Conversations from '@/app/plateforme/Conversations'

// La boîte de réception = le volet « Conversations » du poste de pilotage (v5 §9).
// Un seul composant, deux entrées : ici pour ceux qui viennent par « Messages »,
// et dans « Ma plateforme » pour piloter l'assistant au même endroit.
export default function MessagesPage() {
  const [nonLus, setNonLus] = useState(0)
  return (
    <AppShell active="messages" title="Messages" crumb={`Boîte de réception${nonLus ? ` · ${nonLus} non lu${nonLus > 1 ? 's' : ''}` : ''}`} wide
      actions={<a className="btn btn--ghost" style={{ width: 'auto' }} href="/messages/canaux">Canaux</a>}>
      <Conversations onCompte={setNonLus} />
    </AppShell>
  )
}
