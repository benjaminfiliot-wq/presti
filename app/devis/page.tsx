'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/app/AppShell'

type Devis = { id: string; numero: string | null; objet: string | null; client_nom: string | null; statut: string | null; total_ttc: number | null; date_emission: string | null }

const BADGE: Record<string, { label: string; pill: string }> = {
  brouillon: { label: 'Brouillon', pill: 'muted' },
  envoye: { label: 'Envoyé', pill: 'info' },
  accepte: { label: 'Accepté', pill: 'ok' },
  refuse: { label: 'Refusé', pill: 'crit' },
  expire: { label: 'Expiré', pill: 'muted' },
}
const eur = (n: number) => `${(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`

export default function DevisList() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [devis, setDevis] = useState<Devis[]>([])
  const [busy, setBusy] = useState<string | null>(null)

  async function load() {
    const { data: ds } = await supabase.from('devis').select('id, numero, objet, client_nom, statut, total_ttc, date_emission').order('created_at', { ascending: false })
    setDevis((ds as Devis[]) ?? [])
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const { data: prof } = await supabase.from('artisans').select('id').eq('id', data.session.user.id).maybeSingle()
      if (!prof) { router.replace('/onboarding'); return }
      await load()
      setReady(true)
    })
  }, [router])

  async function supprimer(d: Devis) {
    if (!confirm(`Supprimer le devis ${d.numero || ''} ? Cette action est définitive.`)) return
    setBusy(d.id)
    const { data } = await supabase.auth.getSession()
    const res = await fetch(`/api/devis/${d.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${data.session?.access_token}` } })
    if (res.ok) await load()
    else alert('Suppression impossible. Réessaie dans un instant.')
    setBusy(null)
  }

  const nouveau = (
    <a className="psh-btn primary" href="/devis/nouveau">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
      Nouveau devis
    </a>
  )

  return (
    <AppShell active="devis" title="Devis" crumb="Vos documents" actions={nouveau}>
      {!ready ? (
        <p className="muted">Chargement…</p>
      ) : devis.length === 0 ? (
        <div className="psh-panel">
          <div className="psh-empty">Aucun devis pour l’instant.<br />Cliquez sur « Nouveau devis » : décrivez le chantier, l’IA le chiffre, vous ajustez, et vous envoyez un PDF conforme.</div>
        </div>
      ) : (
        <div className="psh-panel">
          <div className="doc-list">
            {devis.map((d) => {
              const b = BADGE[d.statut ?? 'brouillon'] ?? BADGE.brouillon
              return (
                <div className="doc-card" key={d.id}>
                  <div className="dc-main" onClick={() => router.push(`/devis/${d.id}`)} title="Ouvrir le devis">
                    <div className="dc-top">
                      <span className="dc-num">{d.numero ?? '—'}</span>
                      <span className={`pill ${b.pill}`}><span className="pdot" />{b.label}</span>
                    </div>
                    <span className="dc-cli">{d.client_nom || 'Client'}</span>
                    <span className="dc-obj">{d.objet || 'Sans objet'}</span>
                  </div>
                  <span className="dc-amt">{eur(d.total_ttc ?? 0)}</span>
                  <div className="dc-actions">
                    <button className="btn btn--ghost" onClick={() => router.push(`/devis/${d.id}`)}>Ouvrir</button>
                    <button className="btn btn--ghost danger" disabled={busy === d.id} onClick={() => supprimer(d)}>Supprimer</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </AppShell>
  )
}
