'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/app/AppShell'
import Conversations from '@/app/plateforme/Conversations'
import Automatisations from '@/app/plateforme/Automatisations'
import Reglages from '@/app/plateforme/Reglages'
import { afficher, urlPlateforme } from '@/lib/urls'

// « Ma plateforme » = le poste de pilotage de l'artisan (v5 §9 G1), en trois volets :
// Conversations (ce que voit le client, en miroir, plus ce qu'il ne voit pas),
// Automatisations (le lien réponse auto ↔ devis/facture auto), Réglages (l'assistant).
// Avant : un formulaire. L'artisan ne pouvait ni voir ni reprendre une conversation d'ici.

type Volet = 'conversations' | 'automatisations' | 'reglages'

function PlateformeInner() {
  const router = useRouter()
  const params = useSearchParams()
  const [ready, setReady] = useState(false)
  const [uid, setUid] = useState('')
  const [plan, setPlan] = useState<string | null>(null)
  const [reponseAuto, setReponseAuto] = useState<boolean | null>(null)
  const [slug, setSlug] = useState('')
  const [dom, setDom] = useState<{ domaine: string | null; domaine_verifie: boolean | null }>({ domaine: null, domaine_verifie: null })
  const [active, setActive] = useState(true)
  const [pause, setPause] = useState(false)
  const [copied, setCopied] = useState(false)
  const [nonLus, setNonLus] = useState(0)
  const voletParam = params.get('volet')
  const [volet, setVolet] = useState<Volet>(voletParam === 'automatisations' || voletParam === 'reglages' ? voletParam : 'conversations')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const id = data.session.user.id
      setUid(id)
      const { data: a } = await supabase.from('artisans').select('slug, plan, plateforme_active, reponse_auto, leads_pause, domaine, domaine_verifie').eq('id', id).maybeSingle()
      if (!a) { router.replace('/onboarding'); return }
      setSlug(a.slug ?? ''); setPlan(a.plan ?? null); setReponseAuto(a.reponse_auto ?? null)
      setActive(a.plateforme_active !== false); setPause(a.leads_pause === true)
      setDom({ domaine: a.domaine ?? null, domaine_verifie: a.domaine_verifie ?? null })
      setReady(true)
    })
  }, [router])

  async function copier() {
    try { await navigator.clipboard.writeText(urlPlateforme({ slug, ...dom })); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* ignore */ }
  }
  async function changerPause(v: boolean) {
    setPause(v)
    await supabase.from('artisans').update({ leads_pause: v }).eq('id', uid)
  }

  const lien = slug ? urlPlateforme({ slug, ...dom }) : ''
  const VOLETS: { id: Volet; label: string }[] = [
    { id: 'conversations', label: `Conversations${nonLus ? ` · ${nonLus}` : ''}` },
    { id: 'automatisations', label: 'Automatisations' },
    { id: 'reglages', label: 'Réglages' },
  ]

  if (!ready) return <AppShell active="plateforme" title="Ma plateforme"><div className="tool-card"><p className="muted">Chargement…</p></div></AppShell>

  return (
    <AppShell active="plateforme" title="Ma plateforme" wide
      crumb={active ? (pause ? 'Demandes en pause' : 'En ligne') : 'Désactivée'}
      actions={lien ? (
        <div className="pil-lien">
          <span className="pil-lien-txt" title={lien}>{afficher(lien)}</span>
          <button type="button" className="btn btn--ghost" style={{ width: 'auto', margin: 0 }} onClick={copier}>{copied ? 'Copié' : 'Copier le lien'}</button>
          <a className="btn btn--ghost" style={{ width: 'auto', margin: 0 }} href={lien} target="_blank" rel="noopener">Voir comme un client</a>
        </div>
      ) : undefined}>
      {!active ? <p className="pil-bandeau" style={{ marginTop: 0 }}>Votre plateforme est désactivée : le lien affiche un message poli. Réactivez-la depuis <a href="/profil">Ma page</a>.</p> : null}

      <div className="pil-volets" role="tablist" aria-label="Volets du poste de pilotage">
        {VOLETS.map((v) => (
          <button key={v.id} type="button" role="tab" aria-selected={volet === v.id} className={volet === v.id ? 'on' : ''} onClick={() => setVolet(v.id)}>{v.label}</button>
        ))}
      </div>

      {volet === 'conversations' ? <Conversations onCompte={setNonLus} /> : null}
      {volet === 'automatisations' ? <Automatisations uid={uid} plan={plan} /> : null}
      {volet === 'reglages' ? <Reglages uid={uid} reponseAuto={reponseAuto} pause={pause} onPause={changerPause} /> : null}
    </AppShell>
  )
}

export default function PlateformePage() {
  return <Suspense><PlateformeInner /></Suspense>
}
