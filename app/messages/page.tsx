'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/app/AppShell'

type Lead = {
  id: string; nom_prospect: string | null; contact: string | null; message: string | null
  statut: string | null; created_at: string; updated_at: string | null; lu_le: string | null
}
type Msg = { id: string; sens: 'in' | 'out'; type: string | null; contenu: string; sent_at: string }

const STATUT: Record<string, { label: string; pill: string }> = {
  nouveau: { label: 'Nouveau', pill: 'info' },
  en_discussion: { label: 'En discussion', pill: 'info' },
  repondu: { label: 'Répondu', pill: 'ok' },
  gagne: { label: 'Gagné', pill: 'ok' },
  perdu: { label: 'Perdu', pill: 'muted' },
}
const initials = (n?: string | null) => (n || '?').trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? '').join('') || '?'
const heure = (s: string) => {
  const d = new Date(s); const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  return sameDay ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}
const isUnread = (l: Lead) => !l.lu_le && (l.statut === 'nouveau' || l.statut === 'en_discussion' || !l.statut)

export default function MessagesPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [leads, setLeads] = useState<Lead[]>([])
  const [sel, setSel] = useState<string | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [devAuto, setDevAuto] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const threadRef = useRef<HTMLDivElement>(null)

  const loadLeads = useCallback(async () => {
    const { data } = await supabase
      .from('leads')
      .select('id, nom_prospect, contact, message, statut, created_at, updated_at, lu_le')
      .order('updated_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
    setLeads((data as Lead[]) ?? [])
  }, [])

  const loadThread = useCallback(async (leadId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('id, sens, type, contenu, sent_at')
      .eq('lead_id', leadId)
      .order('sent_at', { ascending: true })
    setMsgs((data as Msg[]) ?? [])
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const { data: prof } = await supabase.from('artisans').select('id').eq('id', data.session.user.id).maybeSingle()
      if (!prof) { router.replace('/onboarding'); return }
      await loadLeads()
      setReady(true)
    })
  }, [router, loadLeads])

  // Rafraîchit le fil sélectionné + la liste (léger polling pour voir arriver les messages du prospect).
  useEffect(() => {
    if (!sel) return
    const id = setInterval(() => { loadThread(sel); loadLeads() }, 10000)
    return () => clearInterval(id)
  }, [sel, loadThread, loadLeads])

  useEffect(() => { const el = threadRef.current; if (el) el.scrollTop = el.scrollHeight }, [msgs])

  async function open(l: Lead) {
    setSel(l.id); setErr(null); setDraft('')
    await loadThread(l.id)
    if (isUnread(l)) {
      await supabase.from('leads').update({ lu_le: new Date().toISOString() }).eq('id', l.id)
      setLeads((prev) => prev.map((x) => (x.id === l.id ? { ...x, lu_le: new Date().toISOString() } : x)))
    }
  }

  async function envoyer() {
    const text = draft.trim()
    if (!text || !sel || sending) return
    setSending(true); setErr(null)
    const optimistic: Msg = { id: `tmp-${Date.now()}`, sens: 'out', type: 'manuel', contenu: text, sent_at: new Date().toISOString() }
    setMsgs((m) => [...m, optimistic]); setDraft('')
    const { data } = await supabase.auth.getSession()
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token}` },
      body: JSON.stringify({ action: 'reply', lead_id: sel, message: text }),
    })
    setSending(false)
    if (!res.ok) { const d = await res.json().catch(() => ({})); setErr(d.error ?? 'Envoi échoué.'); return }
    await loadThread(sel); await loadLeads()
  }

  async function devisAutomatique() {
    if (!sel || devAuto) return
    setDevAuto(true); setErr(null)
    const { data } = await supabase.auth.getSession()
    const res = await fetch('/api/devis/auto', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token}` },
      body: JSON.stringify({ lead_id: sel }),
    })
    const d = await res.json().catch(() => ({}))
    setDevAuto(false)
    if (!res.ok) { setErr(d.outOfCredits ? 'Crédits épuisés — rechargez pour le devis auto.' : (d.error ?? 'Devis auto impossible.')); return }
    router.push(`/devis/${d.id}`)
  }

  async function suggererIA() {
    if (!sel || suggesting) return
    setSuggesting(true); setErr(null)
    const { data } = await supabase.auth.getSession()
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token}` },
      body: JSON.stringify({ action: 'suggest', lead_id: sel }),
    })
    setSuggesting(false)
    const d = await res.json().catch(() => ({}))
    if (!res.ok) { setErr(d.outOfCredits ? 'Crédits épuisés — répondez à la main ou rechargez.' : (d.error ?? 'Suggestion indisponible.')); return }
    if (d.reply) setDraft(d.reply)
  }

  const selLead = leads.find((l) => l.id === sel) || null
  const contactEmail = selLead?.contact && selLead.contact.includes('@')
  const unreadCount = leads.filter(isUnread).length

  return (
    <AppShell active="messages" title="Messages" crumb={`Boîte de réception${unreadCount ? ` · ${unreadCount} non lu${unreadCount > 1 ? 's' : ''}` : ''}`} wide>
      {!ready ? (
        <p className="muted">Chargement…</p>
      ) : leads.length === 0 ? (
        <div className="psh-panel">
          <div className="psh-empty">Aucune conversation pour l’instant.<br />Partagez votre lien (onglet « Ma page ») : chaque contact démarre ici une conversation à laquelle l’IA répond en direct.</div>
        </div>
      ) : (
        <div className={`inbox${sel ? ' has-sel' : ''}`}>
          {/* Liste des conversations */}
          <div className="inbox-list">
            {leads.map((l) => {
              const b = STATUT[l.statut ?? 'nouveau'] ?? STATUT.nouveau
              return (
                <button key={l.id} className={`inbox-item${sel === l.id ? ' on' : ''}${isUnread(l) ? ' unread' : ''}`} onClick={() => open(l)}>
                  <span className="inbox-ava">{initials(l.nom_prospect || l.contact)}</span>
                  <span className="inbox-meta">
                    <span className="inbox-top"><b>{l.nom_prospect || l.contact || 'Prospect'}</b><span className="inbox-time">{heure(l.updated_at || l.created_at)}</span></span>
                    <span className="inbox-prev">{l.message || 'Nouvelle demande'}</span>
                    <span className={`pill ${b.pill}`}><span className="pdot" />{b.label}</span>
                  </span>
                  {isUnread(l) && <span className="inbox-dot" aria-label="Non lu" />}
                </button>
              )
            })}
          </div>

          {/* Fil sélectionné */}
          {selLead ? (
            <div className="inbox-thread">
              <div className="inbox-thead">
                <button className="inbox-back" onClick={() => setSel(null)} aria-label="Retour">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                </button>
                <span className="inbox-ava lg">{initials(selLead.nom_prospect || selLead.contact)}</span>
                <div className="inbox-who">
                  <b>{selLead.nom_prospect || 'Prospect'}</b>
                  <span>{selLead.contact || 'contact non précisé'}</span>
                </div>
                <div className="inbox-actions">
                  <button className="btn btn--primary" style={{ width: 'auto' }} disabled={devAuto} onClick={devisAutomatique} title="L'IA chiffre la conversation et crée un devis complet, prêt à relire">
                    {devAuto ? 'L’IA chiffre…' : '⚡ Devis auto'}
                  </button>
                  <button className="btn btn--ghost" style={{ width: 'auto' }} onClick={() => router.push(`/devis/nouveau?lead=${selLead.id}`)}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M12 18v-6M9 15h6" /></svg>
                    Devis manuel
                  </button>
                </div>
              </div>

              <div className="inbox-msgs" ref={threadRef}>
                {msgs.length === 0 && <div className="inbox-empty-thread muted">Cette conversation démarre. Écrivez le premier message.</div>}
                {msgs.map((m) => (
                  <div key={m.id} className={`ibub ${m.sens === 'in' ? 'in' : 'out'}`}>
                    <div className="ibub-txt">{m.contenu.split('\n').map((line, j, arr) => <span key={j}>{line}{j < arr.length - 1 ? <br /> : null}</span>)}</div>
                    <span className="ibub-tag">{m.sens === 'in' ? 'Prospect' : m.type === 'reponse_auto' ? 'IA' : 'Vous'} · {heure(m.sent_at)}</span>
                  </div>
                ))}
              </div>

              <div className="inbox-compose">
                <textarea
                  value={draft} onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyer() } }}
                  placeholder={contactEmail ? 'Votre réponse (envoyée par email au prospect)…' : 'Votre réponse (visible sur la plateforme du prospect)…'}
                  rows={2}
                />
                <div className="inbox-cbar">
                  <button className="btn btn--ghost" style={{ width: 'auto' }} disabled={suggesting} onClick={suggererIA}>
                    {suggesting ? 'L’IA rédige…' : '⚡ Suggérer une réponse'}
                  </button>
                  <button className="btn btn--primary" style={{ width: 'auto' }} disabled={sending || !draft.trim()} onClick={envoyer}>
                    {sending ? 'Envoi…' : 'Envoyer'}
                  </button>
                </div>
                {err && <div className="msg err" style={{ marginTop: '.6rem' }}>{err}</div>}
              </div>
            </div>
          ) : (
            <div className="inbox-thread empty">
              <div className="inbox-placeholder muted">Sélectionnez une conversation pour la lire et y répondre.</div>
            </div>
          )}
        </div>
      )}
    </AppShell>
  )
}
