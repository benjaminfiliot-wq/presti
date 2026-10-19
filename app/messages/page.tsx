'use client'

import { useEffect, useState } from 'react'
import AppShell from '@/app/AppShell'
import EcranVerrouille from '@/app/EcranVerrouille'
import Conversations from '@/app/plateforme/Conversations'
// Refonte 18/10 (étape 5.4, drapeau consoleV2) : squelette, titre court, bouton « Canaux » au format de la console v2.
import { useConsoleV2 } from '@/lib/consoleV2Client'
import { Squelette } from '@/components/ui/base'
import { supabase } from '@/lib/supabaseClient'
import { peut } from '@/lib/plans'

// La boîte de réception = le volet « Conversations » du poste de pilotage (v5 §9).
// Un seul composant, deux entrées : ici pour ceux qui viennent par « Messages »,
// et dans « Ma plateforme » pour piloter l'assistant au même endroit.
//
// 15/10 (Benj) : « Messages » fait partie de la plateforme, qui commence avec Studio. Un compte d'une autre offre voit l'écran verrouillé
// (aucun volet monté, donc aucune lecture) ; /api/messages refuse de toute façon (403).
export default function MessagesPage() {
  const v2 = useConsoleV2()
  const [nonLus, setNonLus] = useState(0)
  const [plan, setPlan] = useState<string | null>(null)
  const [pret, setPret] = useState(false)
  useEffect(() => {
    let vivant = true
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user.id
      if (!uid) { if (vivant) setPret(true); return }
      const { data: prof } = await supabase.from('artisans').select('plan').eq('id', uid).maybeSingle()
      if (!vivant) return
      setPlan((prof?.plan as string | null | undefined) ?? null)
      setPret(true)
    })
    return () => { vivant = false }
  }, [])

  if (!pret) return <AppShell active="messages" title="Messages" wide>{v2 ? <Squelette variante="tableau" lignes={5} etiquette="Chargement de vos messages…" /> : <div className="tool-card"><p className="muted">Chargement…</p></div>}</AppShell>
  if (!peut(plan, 'plateforme.conversation')) {
    return <AppShell active="messages" title="Messages" crumb="Réservé à l’offre Studio et au-dessus"><EcranVerrouille ecran="messages" plan={plan} /></AppShell>
  }
  return (
    <AppShell active="messages" title="Messages" crumb={v2 ? (nonLus ? `${nonLus} non lu${nonLus > 1 ? 's' : ''}` : 'Boîte de réception') : `Boîte de réception${nonLus ? ` · ${nonLus} non lu${nonLus > 1 ? 's' : ''}` : ''}`} wide
      actions={v2 ? <a className="ui-btn ui-btn--s" href="/messages/canaux">Canaux</a> : <a className="btn btn--ghost" style={{ width: 'auto' }} href="/messages/canaux">Canaux</a>}>
      <Conversations onCompte={setNonLus} />
    </AppShell>
  )
}
