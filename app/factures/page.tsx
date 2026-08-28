'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/app/AppShell'

type Facture = { id: string; numero: string | null; objet: string | null; client_nom: string | null; statut: string | null; total_ttc: number | null; date_echeance: string | null }

const BADGE: Record<string, { label: string; pill: string }> = {
  emise: { label: 'Émise', pill: 'info' },
  payee: { label: 'Payée', pill: 'ok' },
  annulee: { label: 'Annulée', pill: 'crit' },
}
const eur = (n: number) => `${(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`

export default function FacturesList() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [factures, setFactures] = useState<Facture[]>([])
  const [busy, setBusy] = useState<string | null>(null)

  async function load() {
    const { data: fs } = await supabase.from('factures').select('id, numero, objet, client_nom, statut, total_ttc, date_echeance').order('created_at', { ascending: false })
    setFactures((fs as Facture[]) ?? [])
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

  async function pdf(f: Facture) {
    setBusy(f.id)
    const { data } = await supabase.auth.getSession()
    const res = await fetch(`/api/factures/${f.id}/pdf`, { headers: { Authorization: `Bearer ${data.session?.access_token}` } })
    setBusy(null)
    if (!res.ok) return
    const url = URL.createObjectURL(await res.blob())
    const a = document.createElement('a'); a.href = url; a.download = `${f.numero || 'facture'}.pdf`; a.click()
    URL.revokeObjectURL(url)
  }

  async function setStatut(f: Facture, statut: string) {
    setBusy(f.id)
    const { data } = await supabase.auth.getSession()
    const res = await fetch(`/api/factures/${f.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token}` }, body: JSON.stringify({ statut }) })
    if (!res.ok) alert('Action impossible. Réessaie dans un instant.')
    await load(); setBusy(null)
  }

  async function annuler(f: Facture) {
    if (!confirm(`Annuler la facture ${f.numero || ''} ? Elle reste dans la liste (statut « annulée »), comme l'exige la loi — impossible de la supprimer.`)) return
    await setStatut(f, 'annulee')
  }

  return (
    <AppShell active="factures" title="Factures" crumb="Vos documents">
      {!ready ? (
        <p className="muted">Chargement…</p>
      ) : factures.length === 0 ? (
        <div className="psh-panel">
          <div className="psh-empty">Aucune facture pour l’instant.<br />Ouvrez un devis et cliquez « Créer la facture » : Presti reprend les lignes, applique la bonne numérotation et sort un PDF conforme.</div>
        </div>
      ) : (
        <div className="psh-panel">
          <div className="doc-list">
            {factures.map((f) => {
              const b = BADGE[f.statut ?? 'emise'] ?? BADGE.emise
              const active = f.statut !== 'annulee'
              return (
                <div className="doc-card" key={f.id}>
                  <div className="dc-main" onClick={() => pdf(f)} title="Voir le PDF">
                    <div className="dc-top">
                      <span className="dc-num">{f.numero ?? '—'}</span>
                      <span className={`pill ${b.pill}`}><span className="pdot" />{b.label}</span>
                    </div>
                    <span className="dc-cli">{f.client_nom || 'Client'}</span>
                    <span className="dc-obj">{f.objet || 'Sans objet'}</span>
                  </div>
                  <span className="dc-amt">{eur(f.total_ttc ?? 0)}</span>
                  <div className="dc-actions">
                    <button className="btn btn--ghost" disabled={busy === f.id} onClick={() => pdf(f)}>PDF</button>
                    {active && f.statut !== 'payee' && (
                      <button className="btn btn--ghost" disabled={busy === f.id} onClick={() => setStatut(f, 'payee')}>Marquer payée</button>
                    )}
                    {active && (
                      <button className="btn btn--ghost danger" disabled={busy === f.id} onClick={() => annuler(f)}>Annuler</button>
                    )}
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
