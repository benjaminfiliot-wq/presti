'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type Devis = {
  id: string
  numero: string | null
  objet: string | null
  client_nom: string | null
  statut: string | null
  total_ttc: number | null
  date_emission: string | null
}

const BADGE: Record<string, { label: string; bg: string; fg: string }> = {
  brouillon: { label: 'Brouillon', bg: '#F3F4F6', fg: '#6B7280' },
  envoye: { label: 'Envoyé', bg: '#FEF3C7', fg: '#92400E' },
  accepte: { label: 'Accepté 🎉', bg: '#D1FAE5', fg: '#065F46' },
  refuse: { label: 'Refusé', bg: '#FBE9E7', fg: '#B23129' },
  expire: { label: 'Expiré', bg: '#F3F4F6', fg: '#6B7280' },
}

export default function DevisList() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [devis, setDevis] = useState<Devis[]>([])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const { data: prof } = await supabase.from('artisans').select('id').eq('id', data.session.user.id).maybeSingle()
      if (!prof) { router.replace('/onboarding'); return }
      const { data: ds } = await supabase
        .from('devis')
        .select('id, numero, objet, client_nom, statut, total_ttc, date_emission')
        .order('created_at', { ascending: false })
      setDevis((ds as Devis[]) ?? [])
      setReady(true)
    })
  }, [router])

  async function logout() { await supabase.auth.signOut(); router.replace('/login') }

  return (
    <>
      <div className="appbar">
        <div className="appbar-in">
          <span className="brand"><span className="dot" />Presti</span>
          <div className="appbar-links">
            <a className="applink" href="/outils">Générateurs</a>
            <a className="applink active" href="/devis">Devis</a>
            <a className="applink" href="/dashboard">Mes demandes</a>
            <button className="applink" onClick={logout}>Déconnexion</button>
          </div>
        </div>
      </div>

      <main className="app-wrap">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.4rem' }}>
          <div>
            <h1 style={{ margin: 0 }}>Devis</h1>
            <p className="muted" style={{ margin: '.2rem 0 0' }}>Créez un devis conforme en quelques secondes.</p>
          </div>
          <a className="btn btn--primary" style={{ marginLeft: 'auto' }} href="/devis/nouveau">+ Nouveau devis</a>
        </div>

        {!ready && <p className="muted">Chargement…</p>}

        {ready && devis.length === 0 && (
          <div className="tool-card">
            <p className="muted" style={{ margin: 0 }}>Aucun devis pour l&apos;instant. Cliquez sur « Nouveau devis » : décrivez le chantier, l&apos;IA le chiffre, vous ajustez.</p>
          </div>
        )}

        {devis.map((d) => {
          const b = BADGE[d.statut ?? 'brouillon'] ?? BADGE.brouillon
          return (
            <a key={d.id} href={`/devis/${d.id}`} className="devis-list-row" style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}>
              <span className="devis-num">{d.numero ?? '—'}</span>
              <div style={{ minWidth: 0 }}>
                <strong>{d.client_nom || 'Client'}</strong>
                <div className="muted" style={{ fontSize: '.88rem' }}>{d.objet || 'Sans objet'}</div>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{(d.total_ttc ?? 0).toFixed(2)} € TTC</span>
              <span className="devis-badge" style={{ background: b.bg, color: b.fg }}>{b.label}</span>
            </a>
          )
        })}
      </main>
    </>
  )
}
