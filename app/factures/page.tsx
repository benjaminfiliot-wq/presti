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

  async function marquerPayee(f: Facture) {
    setBusy(f.id)
    const { data } = await supabase.auth.getSession()
    await fetch(`/api/factures/${f.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token}` }, body: JSON.stringify({ statut: 'payee' }) })
    await load(); setBusy(null)
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
          <div className="psh-tablewrap">
            <table className="psh-dtable">
              <thead><tr><th>Numéro</th><th>Client</th><th>Objet</th><th className="r">Montant TTC</th><th>Statut</th><th className="r">Actions</th></tr></thead>
              <tbody>
                {factures.map((f) => {
                  const b = BADGE[f.statut ?? 'emise'] ?? BADGE.emise
                  return (
                    <tr key={f.id}>
                      <td className="num">{f.numero ?? '—'}</td>
                      <td className="obj">{f.client_nom || 'Client'}</td>
                      <td className="muted">{f.objet || 'Sans objet'}</td>
                      <td className="amt">{eur(f.total_ttc ?? 0)}</td>
                      <td><span className={`pill ${b.pill}`}><span className="pdot" />{b.label}</span></td>
                      <td className="r" style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn btn--ghost" style={{ width: 'auto', padding: '.4rem .7rem', fontSize: '.82rem' }} disabled={busy === f.id} onClick={() => pdf(f)}>PDF</button>
                        {f.statut !== 'payee' && (
                          <button className="btn btn--ghost" style={{ width: 'auto', padding: '.4rem .7rem', fontSize: '.82rem', marginLeft: '.4rem' }} disabled={busy === f.id} onClick={() => marquerPayee(f)}>Marquer payée</button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AppShell>
  )
}
