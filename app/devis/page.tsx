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

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const { data: prof } = await supabase.from('artisans').select('id').eq('id', data.session.user.id).maybeSingle()
      if (!prof) { router.replace('/onboarding'); return }
      const { data: ds } = await supabase.from('devis').select('id, numero, objet, client_nom, statut, total_ttc, date_emission').order('created_at', { ascending: false })
      setDevis((ds as Devis[]) ?? [])
      setReady(true)
    })
  }, [router])

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
          <div className="psh-tablewrap">
            <table className="psh-dtable">
              <thead><tr><th>Numéro</th><th>Client</th><th>Objet</th><th className="r">Montant TTC</th><th>Statut</th></tr></thead>
              <tbody>
                {devis.map((d) => {
                  const b = BADGE[d.statut ?? 'brouillon'] ?? BADGE.brouillon
                  return (
                    <tr key={d.id} onClick={() => router.push(`/devis/${d.id}`)} style={{ cursor: 'pointer' }}>
                      <td className="num">{d.numero ?? '—'}</td>
                      <td className="obj">{d.client_nom || 'Client'}</td>
                      <td className="muted">{d.objet || 'Sans objet'}</td>
                      <td className="amt">{eur(d.total_ttc ?? 0)}</td>
                      <td><span className={`pill ${b.pill}`}><span className="pdot" />{b.label}</span></td>
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
