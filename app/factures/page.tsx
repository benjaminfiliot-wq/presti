'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/app/AppShell'
import { estNatif, partagerFichier, vibrer } from '@/lib/natif'

type Facture = { id: string; numero: string | null; objet: string | null; client_nom: string | null; statut: string | null; total_ttc: number | null; date_echeance: string | null; avoir_de: string | null }

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

  // Le filtre est ici EN PLUS de la RLS, pas à sa place : la migration 0074 a retiré aux
  // fondateurs la vue sur les lignes des autres, et cette ligne dit la même chose une seconde
  // fois. Deux verrous pour la même porte, parce que celui du navigateur se lit plus vite.
  async function load() {
    const { data: fs } = await supabase.from('factures').select('id, numero, objet, client_nom, statut, total_ttc, date_echeance, avoir_de').eq('artisan_id', (await supabase.auth.getUser()).data.user?.id ?? '').order('created_at', { ascending: false })
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
    if (estNatif()) return pdfNatif(f) // la coque (v9) : pas d'onglet ni de dossier Téléchargements — la feuille de partage
    // Ouvre un onglet DANS le geste utilisateur (sinon bloqué par le navigateur, surtout mobile).
    const win = window.open('', '_blank')
    setBusy(f.id)
    const { data } = await supabase.auth.getSession()
    const res = await fetch(`/api/factures/${f.id}/pdf`, { headers: { Authorization: `Bearer ${data.session?.access_token}` } })
    setBusy(null)
    if (!res.ok) { win?.close(); alert('Impossible d’ouvrir le PDF. Réessaie dans un instant.'); return }
    const url = URL.createObjectURL(await res.blob())
    if (win) win.location.href = url
    else { const a = document.createElement('a'); a.href = url; a.download = `${f.numero || 'facture'}.pdf`; a.click() }
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }

  /** Le XML Factur-X : la même pièce que le PDF, dans le format que réclament les comptables et
   *  les donneurs d'ordre publics. Téléchargé plutôt qu'ouvert : aucun navigateur ne sait l'afficher. */
  async function facturx(f: Facture) {
    setBusy(f.id)
    const { data } = await supabase.auth.getSession()
    const res = await fetch(`/api/factures/${f.id}/facturx`, { headers: { Authorization: `Bearer ${data.session?.access_token}` } })
    setBusy(null)
    if (!res.ok) {
      const corps = await res.json().catch(() => ({} as { error?: string }))
      alert(corps.error ?? 'Impossible de produire la facture électronique pour l’instant.')
      return
    }
    const url = URL.createObjectURL(await res.blob())
    const a = document.createElement('a')
    a.href = url; a.download = `${f.numero || 'facture'}.xml`; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }

  /** Dans l'application : le PDF part par la feuille native (Fichiers, Mail, WhatsApp…). */
  async function pdfNatif(f: Facture) {
    setBusy(f.id)
    const { data } = await supabase.auth.getSession()
    const res = await fetch(`/api/factures/${f.id}/pdf`, { headers: { Authorization: `Bearer ${data.session?.access_token}` } })
    setBusy(null)
    if (!res.ok) { alert('Impossible d’ouvrir le PDF. Réessaie dans un instant.'); return }
    const r = await partagerFichier(`${f.numero || 'facture'}.pdf`, await res.blob(), { titre: `Facture ${f.numero || ''}`.trim(), texte: 'Votre facture, en pièce jointe.' })
    if (r === 'natif' || r === 'web') void vibrer('leger')
    if (r === 'aucun') alert('Partage impossible sur cet appareil.')
  }

  async function setStatut(f: Facture, statut: string) {
    setBusy(f.id)
    const { data } = await supabase.auth.getSession()
    const res = await fetch(`/api/factures/${f.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token}` }, body: JSON.stringify({ statut }) })
    if (!res.ok) alert('Action impossible. Réessaie dans un instant.')
    await load(); setBusy(null)
  }

  async function annuler(f: Facture) {
    // Une facture émise s'annule par un AVOIR : pièce négative, numérotée dans la même séquence,
    // conservée comme la facture (art. 289 CGI). Le statut « annulée » est posé par l'avoir.
    if (!confirm(`Émettre un avoir qui annule la facture ${f.numero || ''} ? L'avoir est une pièce négative, numérotée et conservée comme la facture — rien n'est supprimé.`)) return
    setBusy(f.id)
    const { data } = await supabase.auth.getSession()
    const res = await fetch(`/api/factures/${f.id}/avoir`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token}` }, body: '{}' })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) alert(d.error || 'Avoir impossible. Réessaie dans un instant.')
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
          <div className="doc-list">
            {factures.map((f) => {
              const b = BADGE[f.statut ?? 'emise'] ?? BADGE.emise
              const active = f.statut !== 'annulee' && !f.avoir_de
              return (
                <div className="doc-card" key={f.id}>
                  <div className="dc-main" onClick={() => pdf(f)} title="Voir le PDF">
                    <div className="dc-top">
                      <span className="dc-num">{f.numero ?? '—'}</span>
                      <span className={`pill ${b.pill}`}><span className="pdot" />{f.avoir_de ? 'Avoir' : b.label}</span>
                    </div>
                    <span className="dc-cli">{f.client_nom || 'Client'}</span>
                    <span className="dc-obj">{f.objet || 'Sans objet'}</span>
                  </div>
                  <span className="dc-amt">{eur(f.total_ttc ?? 0)}</span>
                  <div className="dc-actions">
                    <button className="btn btn--ghost" disabled={busy === f.id} onClick={() => pdf(f)}>PDF</button>
                    {/* Factur-X : vendu dans les trois offres, et jusqu'au 08/09 aucun écran ne
                        permettait de l'obtenir. Seulement sur une facture émise : un brouillon
                        n'a pas de pièce électronique à produire. */}
                    {f.statut && f.statut !== 'brouillon'
                      ? <button className="btn btn--ghost" disabled={busy === f.id} onClick={() => facturx(f)} title="Facture électronique (Factur-X), pour votre comptable ou un donneur d'ordre public">XML</button>
                      : null}
                    {active && f.statut !== 'payee' && (
                      <button className="btn btn--ghost" disabled={busy === f.id} onClick={() => setStatut(f, 'payee')}>Marquer payée</button>
                    )}
                    {active && (
                      <button className="btn btn--ghost danger" disabled={busy === f.id} onClick={() => annuler(f)}>Émettre un avoir</button>
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
