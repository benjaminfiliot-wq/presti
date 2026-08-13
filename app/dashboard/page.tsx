'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type Artisan = {
  id: string
  nom: string | null
  metier: string | null
  slug: string | null
}

type Lead = {
  id: string
  nom_prospect: string | null
  contact: string | null
  message: string | null
  statut: string | null
  created_at: string
}

type Message = { lead_id: string; sens: string | null; type: string | null; contenu: string | null }

const STATUTS: { value: string; label: string; bg: string; fg: string }[] = [
  { value: 'nouveau', label: 'Nouveau', bg: '#FEF3C7', fg: '#92400E' },
  { value: 'repondu', label: 'Répondu', bg: '#D1FAE5', fg: '#065F46' },
  { value: 'gagne', label: 'Gagné 🎉', bg: '#0E5C4A', fg: '#ffffff' },
  { value: 'perdu', label: 'Perdu', bg: '#F3F4F6', fg: '#6B7280' },
]

function statutMeta(v: string | null) {
  return STATUTS.find((s) => s.value === v) ?? { value: v ?? '', label: v ?? '—', bg: '#F3F4F6', fg: '#6B7280' }
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

export default function Dashboard() {
  const router = useRouter()
  const [artisan, setArtisan] = useState<Artisan | null>(null)
  const [ready, setReady] = useState(false)
  const [copied, setCopied] = useState(false)
  const [leads, setLeads] = useState<Lead[]>([])
  const [replies, setReplies] = useState<Record<string, string>>({})
  const [open, setOpen] = useState<string | null>(null)

  async function loadLeads(artisanId: string) {
    const { data: ls } = await supabase
      .from('leads')
      .select('id, nom_prospect, contact, message, statut, created_at')
      .eq('artisan_id', artisanId)
      .order('created_at', { ascending: false })
    setLeads((ls as Lead[]) ?? [])

    const { data: ms } = await supabase
      .from('messages')
      .select('lead_id, sens, type, contenu')
      .eq('sens', 'out')
      .eq('type', 'reponse_auto')
    const map: Record<string, string> = {}
    for (const m of (ms as Message[]) ?? []) {
      if (m.lead_id && m.contenu && !map[m.lead_id]) map[m.lead_id] = m.contenu
    }
    setReplies(map)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        router.replace('/login')
        return
      }
      const { data: prof } = await supabase
        .from('artisans')
        .select('id, nom, metier, slug')
        .eq('id', data.session.user.id)
        .maybeSingle()
      if (!prof) {
        router.replace('/onboarding')
        return
      }
      setArtisan(prof as Artisan)
      await loadLeads((prof as Artisan).id)
      setReady(true)
    })
  }, [router])

  async function changeStatut(leadId: string, statut: string) {
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, statut } : l)))
    await supabase.from('leads').update({ statut, updated_at: new Date().toISOString() }).eq('id', leadId)
  }

  async function logout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  function copyLink() {
    if (!artisan?.slug) return
    const link = `${window.location.origin}/l/${artisan.slug}`
    navigator.clipboard?.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!ready || !artisan) {
    return (
      <main className="wrap">
        <p className="muted">Chargement…</p>
      </main>
    )
  }

  const link = typeof window !== 'undefined' ? `${window.location.origin}/l/${artisan.slug}` : `/l/${artisan.slug}`
  const nouveaux = leads.filter((l) => l.statut === 'nouveau').length

  return (
    <main className="wrap">
      <div className="card">
        <div className="brand"><span className="dot" />Presti</div>
        <h1>Bonjour {artisan.nom}</h1>
        <p className="muted">{artisan.metier} · ton espace</p>

        <label style={{ marginTop: '1.4rem' }}>Ton lien de contact (à coller sur Le Bon Coin, Google, Facebook)</label>
        <div className="linkbox">
          <span className="linkbox-url">{link}</span>
          <button type="button" className="linkbox-btn" onClick={copyLink}>{copied ? '✓ Copié' : 'Copier'}</button>
        </div>

        <button onClick={logout} style={{ background: 'transparent', color: 'var(--soft)', border: '1px solid var(--line)', marginTop: '1.6rem' }}>Se déconnecter</button>
      </div>

      <div className="card" style={{ marginTop: '1.2rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.15rem' }}>
          Vos demandes {nouveaux > 0 && <span style={{ fontSize: '.85rem', color: '#92400E', background: '#FEF3C7', padding: '.1rem .5rem', borderRadius: 999, marginLeft: '.4rem' }}>{nouveaux} nouveau{nouveaux > 1 ? 'x' : ''}</span>}
        </h2>

        {leads.length === 0 && (
          <p className="muted" style={{ marginTop: '1rem' }}>Aucune demande pour l'instant. Dès qu'un client remplira votre lien, elle apparaîtra ici.</p>
        )}

        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '.7rem' }}>
          {leads.map((l) => {
            const meta = statutMeta(l.statut)
            const isOpen = open === l.id
            const isMail = typeof l.contact === 'string' && l.contact.includes('@')
            return (
              <div key={l.id} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '.85rem 1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.6rem', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <strong>{l.nom_prospect || 'Client'}</strong>
                    <span className="muted" style={{ marginLeft: '.5rem', fontSize: '.85rem' }}>{formatDate(l.created_at)}</span>
                    <div style={{ fontSize: '.9rem' }}>
                      {isMail
                        ? <a href={`mailto:${l.contact}`} style={{ color: 'var(--green)' }}>{l.contact}</a>
                        : <a href={`tel:${l.contact}`} style={{ color: 'var(--green)' }}>{l.contact}</a>}
                    </div>
                  </div>
                  <span style={{ background: meta.bg, color: meta.fg, padding: '.2rem .6rem', borderRadius: 999, fontSize: '.8rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{meta.label}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : l.id)}
                  style={{ background: 'transparent', color: 'var(--soft)', border: 'none', padding: '.4rem 0 0', fontSize: '.85rem', cursor: 'pointer', width: 'auto' }}
                >
                  {isOpen ? '▾ Masquer le détail' : '▸ Voir le détail'}
                </button>

                {isOpen && (
                  <div style={{ marginTop: '.6rem', borderTop: '1px solid var(--line)', paddingTop: '.7rem' }}>
                    <p style={{ margin: '0 0 .3rem', fontSize: '.8rem', fontWeight: 600, color: 'var(--soft)' }}>Sa demande</p>
                    <p style={{ margin: '0 0 .9rem', whiteSpace: 'pre-wrap' }}>{l.message || <span className="muted">(aucun message)</span>}</p>

                    <p style={{ margin: '0 0 .3rem', fontSize: '.8rem', fontWeight: 600, color: 'var(--soft)' }}>Réponse envoyée automatiquement</p>
                    {replies[l.id]
                      ? <p style={{ margin: '0 0 .9rem', whiteSpace: 'pre-wrap', background: '#F0FDF4', border: '1px solid #D1FAE5', borderRadius: 8, padding: '.7rem' }}>{replies[l.id]}</p>
                      : <p className="muted" style={{ margin: '0 0 .9rem' }}>Pas encore de réponse automatique pour cette demande.</p>}

                    <label style={{ fontSize: '.8rem' }}>Statut</label>
                    <select value={l.statut ?? 'nouveau'} onChange={(e) => changeStatut(l.id, e.target.value)}>
                      {STATUTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
