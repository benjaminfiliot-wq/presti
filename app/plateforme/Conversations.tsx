'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

// Le volet « Conversations » du poste de pilotage (v5 §9 G1) — et la boîte /messages, qui
// rend ce même composant. Une conversation = ce que voit le client, en miroir, plus ce que
// lui ne voit pas : les propositions de l'assistant en attente, la prise de main, les actions.

type Lead = {
  id: string; nom_prospect: string | null; contact: string | null; message: string | null
  statut: string | null; created_at: string; updated_at: string | null; lu_le: string | null
  urgence: string | null; type_chantier: string | null; photos: string[] | null; prise_en_main: boolean | null
}
type Msg = { id: string; sens: 'in' | 'out'; type: string | null; contenu: string; sent_at: string; etat: string | null; modele: string | null }

const STATUT: Record<string, { label: string; pill: string }> = {
  nouveau: { label: 'Nouveau', pill: 'info' },
  en_discussion: { label: 'En discussion', pill: 'info' },
  devis: { label: 'Devis', pill: 'info' },
  repondu: { label: 'Répondu', pill: 'ok' },
  gagne: { label: 'Gagné', pill: 'ok' },
  perdu: { label: 'Perdu', pill: 'muted' },
}
const MODELE: Record<string, string> = { standard: 'Standard', pro: 'Pro', expert: 'Expert' }
const initials = (n?: string | null) => (n || '?').trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? '').join('') || '?'
const heure = (s: string) => {
  const d = new Date(s); const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  return sameDay ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}
const isUnread = (l: Lead) => !l.lu_le && (l.statut === 'nouveau' || l.statut === 'en_discussion' || !l.statut)
const clos = (l: Lead) => l.statut === 'gagne' || l.statut === 'perdu'

/** L'état de pilotage d'une conversation — ce que l'artisan doit savoir en un coup d'œil. */
type Etat = 'humain' | 'validation' | 'ia' | 'clos'
function etatDe(l: Lead, enAttente: Set<string>): { e: Etat; label: string } {
  if (clos(l)) return { e: 'clos', label: 'Clos' }
  if (l.prise_en_main) return { e: 'humain', label: 'Vous avez la main' }
  if (enAttente.has(l.id)) return { e: 'validation', label: 'Attend votre validation' }
  return { e: 'ia', label: 'Assistant' }
}

export default function Conversations({ onCompte }: { onCompte?: (nonLus: number) => void }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [leads, setLeads] = useState<Lead[]>([])
  const [enAttente, setEnAttente] = useState<Set<string>>(new Set())
  const [filtre, setFiltre] = useState<'tous' | 'urgent' | 'validation' | 'humain'>('tous')
  const [sel, setSel] = useState<string | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [draft, setDraft] = useState('')
  const [edition, setEdition] = useState<Record<string, string>>({})
  const [sending, setSending] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [devAuto, setDevAuto] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [photosSignees, setPhotosSignees] = useState<string[]>([])
  const threadRef = useRef<HTMLDivElement>(null)

  const jeton = async () => (await supabase.auth.getSession()).data.session?.access_token
  const appel = async (corps: Record<string, unknown>) => {
    const t = await jeton()
    const r = await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify(corps) })
    const d = await r.json().catch(() => ({}))
    return { ok: r.ok, d }
  }

  const loadLeads = useCallback(async () => {
    const [{ data }, { data: props }] = await Promise.all([
      supabase.from('leads')
        .select('id, nom_prospect, contact, message, statut, created_at, updated_at, lu_le, urgence, type_chantier, photos, prise_en_main')
        .order('updated_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false }),
      supabase.from('messages').select('lead_id').eq('etat', 'proposition'),
    ])
    const rows = (data as Lead[]) ?? []
    const openUrgent = (l: Lead) => l.urgence === 'urgent' && !clos(l)
    rows.sort((a, b) => (openUrgent(b) ? 1 : 0) - (openUrgent(a) ? 1 : 0))
    setLeads(rows)
    setEnAttente(new Set(((props as { lead_id: string }[]) ?? []).map((p) => p.lead_id)))
    onCompte?.(rows.filter(isUnread).length)
  }, [onCompte])

  const loadThread = useCallback(async (leadId: string) => {
    const { data } = await supabase.from('messages')
      .select('id, sens, type, contenu, sent_at, etat, modele')
      .eq('lead_id', leadId).neq('etat', 'rejete').order('sent_at', { ascending: true })
    // `.neq` exclut aussi les NULL côté PostgREST : on refiltre ici pour garder les messages envoyés.
    const { data: nuls } = await supabase.from('messages')
      .select('id, sens, type, contenu, sent_at, etat, modele')
      .eq('lead_id', leadId).is('etat', null).order('sent_at', { ascending: true })
    const tous = new Map<string, Msg>()
    for (const m of [...((nuls as Msg[]) ?? []), ...((data as Msg[]) ?? [])]) tous.set(m.id, m)
    setMsgs(Array.from(tous.values()).sort((a, b) => a.sent_at.localeCompare(b.sent_at)))
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      await loadLeads()
      setReady(true)
      try {
        const dernier = Number(localStorage.getItem('presti-releve') || 0)
        if (Date.now() - dernier > 180000) {
          localStorage.setItem('presti-releve', String(Date.now()))
          const r = await fetch('/api/canaux/relever', { method: 'POST', headers: { Authorization: `Bearer ${data.session.access_token}` } })
          const j = await r.json().catch(() => null)
          if (j?.importes > 0) await loadLeads()
        }
      } catch { /* pas de boîte connectée : sans conséquence */ }
    })
  }, [router, loadLeads])

  useEffect(() => {
    if (!sel) return
    const id = setInterval(() => { loadThread(sel); loadLeads() }, 8000)
    return () => clearInterval(id)
  }, [sel, loadThread, loadLeads])

  useEffect(() => { const el = threadRef.current; if (el) el.scrollTop = el.scrollHeight }, [msgs])

  async function open(l: Lead) {
    setSel(l.id); setErr(null); setDraft(''); setPhotosSignees([]); setEdition({})
    await loadThread(l.id)
    if (Array.isArray(l.photos) && l.photos.length) {
      const t = await jeton()
      const r = await fetch('/api/leads/photos', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify({ lead: l.id }) })
      const d = await r.json().catch(() => ({}))
      setPhotosSignees(Array.isArray(d.urls) ? d.urls : [])
    }
    if (isUnread(l)) {
      await supabase.from('leads').update({ lu_le: new Date().toISOString() }).eq('id', l.id)
      setLeads((prev) => prev.map((x) => (x.id === l.id ? { ...x, lu_le: new Date().toISOString() } : x)))
    }
  }

  async function envoyer() {
    const text = draft.trim()
    if (!text || !sel || sending) return
    setSending(true); setErr(null)
    setMsgs((m) => [...m, { id: `tmp-${Date.now()}`, sens: 'out', type: 'manuel', contenu: text, sent_at: new Date().toISOString(), etat: null, modele: null }]); setDraft('')
    const { ok, d } = await appel({ action: 'reply', lead_id: sel, message: text })
    setSending(false)
    if (!ok) { setErr(d.error ?? 'Envoi échoué.'); return }
    await loadThread(sel); await loadLeads()
  }

  async function proposition(action: 'valider' | 'rejeter', m: Msg) {
    if (!sel || busy) return
    setBusy(m.id); setErr(null)
    const { ok, d } = await appel({ action, lead_id: sel, message_id: m.id, message: edition[m.id] })
    setBusy(null)
    if (!ok) { setErr(d.error ?? 'Action impossible.'); return }
    await loadThread(sel); await loadLeads()
  }

  async function priseEnMain(valeur: boolean) {
    if (!sel || busy) return
    setBusy('main'); setErr(null)
    const { ok, d } = await appel({ action: 'prise_en_main', lead_id: sel, valeur })
    setBusy(null)
    if (!ok) { setErr(d.error ?? 'Action impossible.'); return }
    setLeads((prev) => prev.map((x) => (x.id === sel ? { ...x, prise_en_main: valeur } : x)))
  }

  async function escalader() {
    if (!sel || busy) return
    setBusy('esc'); setErr(null)
    const { ok, d } = await appel({ action: 'escalader', lead_id: sel })
    setBusy(null)
    if (!ok) { setErr(d.error ?? 'Action impossible.'); return }
    await loadLeads()
  }

  async function devisAutomatique() {
    if (!sel || devAuto) return
    setDevAuto(true); setErr(null)
    const t = await jeton()
    const res = await fetch('/api/devis/auto', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify({ lead_id: sel }) })
    const d = await res.json().catch(() => ({}))
    setDevAuto(false)
    if (!res.ok) { setErr(d.outOfCredits ? 'Crédits épuisés — rechargez pour le devis auto.' : (d.error ?? 'Devis auto impossible.')); return }
    router.push(`/devis/${d.id}`)
  }

  async function suggererIA() {
    if (!sel || suggesting) return
    setSuggesting(true); setErr(null)
    const { ok, d } = await appel({ action: 'suggest', lead_id: sel })
    setSuggesting(false)
    if (!ok) { setErr(d.outOfCredits ? 'Crédits épuisés — répondez à la main ou rechargez.' : (d.error ?? 'Suggestion indisponible.')); return }
    if (d.reply) setDraft(d.reply)
    if (d.downgraded) setErr('Le modèle réglé n’est pas inclus dans votre formule — brouillon rédigé avec le meilleur modèle disponible.')
  }

  function proposerRdv() {
    // Aucun créneau inventé : on ouvre la phrase, l'artisan met SES disponibilités.
    setDraft((d) => d || 'Je peux passer voir le chantier. Quels créneaux vous arrangent parmi ceux-ci : … ?')
  }

  const selLead = leads.find((l) => l.id === sel) || null
  const contactEmail = selLead?.contact && selLead.contact.includes('@')
  const visibles = leads.filter((l) => {
    if (filtre === 'urgent') return l.urgence === 'urgent' && !clos(l)
    if (filtre === 'validation') return enAttente.has(l.id)
    if (filtre === 'humain') return l.prise_en_main === true
    return true
  })
  const nbValidation = leads.filter((l) => enAttente.has(l.id)).length
  const nbUrgent = leads.filter((l) => l.urgence === 'urgent' && !clos(l)).length

  if (!ready) return <p className="muted">Chargement…</p>
  if (leads.length === 0) return (
    <div className="psh-panel"><div className="psh-empty">Aucune conversation pour l’instant.<br />Partagez votre lien (onglet « Ma page ») : chaque contact démarre ici une conversation à laquelle l’assistant répond en direct.</div></div>
  )

  return (
    <div className={`inbox${sel ? ' has-sel' : ''}`}>
      <div className="inbox-list">
        <div className="pil-filtres" role="tablist" aria-label="Filtrer les conversations">
          {([['tous', 'Toutes'], ['validation', `À valider${nbValidation ? ` · ${nbValidation}` : ''}`], ['urgent', `Urgentes${nbUrgent ? ` · ${nbUrgent}` : ''}`], ['humain', 'Vous avez la main']] as const).map(([k, lab]) => (
            <button key={k} type="button" role="tab" aria-selected={filtre === k} className={filtre === k ? 'on' : ''} onClick={() => setFiltre(k)}>{lab}</button>
          ))}
        </div>
        {visibles.length === 0 ? <div className="muted" style={{ padding: '1rem' }}>Rien dans ce filtre.</div> : null}
        {visibles.map((l) => {
          const b = STATUT[l.statut ?? 'nouveau'] ?? STATUT.nouveau
          const et = etatDe(l, enAttente)
          return (
            <button key={l.id} className={`inbox-item${sel === l.id ? ' on' : ''}${isUnread(l) ? ' unread' : ''}`} onClick={() => open(l)}>
              <span className="inbox-ava">{initials(l.nom_prospect || l.contact)}</span>
              <span className="inbox-meta">
                <span className="inbox-top"><b>{l.nom_prospect || l.contact || 'Prospect'}</b><span className="inbox-time">{heure(l.updated_at || l.created_at)}</span></span>
                <span className="inbox-prev">{l.message || 'Nouvelle demande'}</span>
                <span className="inbox-tags">
                  <span className={`pil-etat ${et.e}`}>{et.label}</span>
                  {l.urgence === 'urgent' && !clos(l) ? <span className="qtag urgent">⚡ Urgent</span> : null}
                  {l.type_chantier ? <span className="qtag">{l.type_chantier}</span> : null}
                  <span className={`pill ${b.pill}`}><span className="pdot" />{b.label}</span>
                </span>
              </span>
              {isUnread(l) && <span className="inbox-dot" aria-label="Non lu" />}
            </button>
          )
        })}
      </div>

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
              <span className="inbox-tags" style={{ marginTop: 4 }}>
                {selLead.urgence === 'urgent' && !clos(selLead) ? <span className="qtag urgent">⚡ Urgent</span> : null}
                {selLead.type_chantier ? <span className="qtag">{selLead.type_chantier}</span> : null}
                {Array.isArray(selLead.photos) && selLead.photos.length ? <span className="qtag">{selLead.photos.length} photo{selLead.photos.length > 1 ? 's' : ''}</span> : null}
              </span>
            </div>
            <div className="inbox-actions">
              <button type="button" className={`btn ${selLead.prise_en_main ? 'btn--primary' : 'btn--ghost'}`} style={{ width: 'auto' }} disabled={busy === 'main'} onClick={() => priseEnMain(!selLead.prise_en_main)}
                title={selLead.prise_en_main ? 'Rendre la main à l’assistant' : 'L’assistant se tait sur cette conversation, le client le voit'}>
                {selLead.prise_en_main ? 'Vous avez la main' : 'Je prends la main'}
              </button>
              <button className="btn btn--primary" style={{ width: 'auto' }} disabled={devAuto} onClick={devisAutomatique} title="L'IA chiffre la conversation et crée un devis complet, prêt à relire">
                {devAuto ? 'L’IA chiffre…' : 'Créer un devis'}
              </button>
              <button className="btn btn--ghost" style={{ width: 'auto' }} onClick={proposerRdv}>Proposer un RDV</button>
              <button className="btn btn--ghost" style={{ width: 'auto' }} disabled={busy === 'esc' || selLead.prise_en_main === true} onClick={escalader} title="Marque la demande urgente et vous donne la main">Escalader</button>
            </div>
          </div>

          {selLead.prise_en_main ? <div className="pil-bandeau">Vous avez la main : l’assistant ne répond plus ici, et votre client en est informé.</div> : null}

          {Array.isArray(selLead.photos) && selLead.photos.length > 0 ? (
            <div className="inbox-photos">
              <span className="inbox-photos-lab">Photos du chantier</span>
              <div className="inbox-photos-grid">
                {photosSignees.map((src, i) => (
                  <a key={i} href={src} target="_blank" rel="noopener" className="inbox-photo" title="Ouvrir en grand">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Photo chantier ${i + 1}`} loading="lazy" />
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          <div className="inbox-msgs" ref={threadRef}>
            {msgs.length === 0 && <div className="inbox-empty-thread muted">Cette conversation démarre. Écrivez le premier message.</div>}
            {msgs.map((m) => m.etat === 'proposition' ? (
              <div key={m.id} className="pil-prop">
                <span className="pil-prop-k">Réponse proposée par l’assistant{m.modele ? ` (${MODELE[m.modele] ?? m.modele})` : ''} — rien n’est parti</span>
                <textarea rows={4} value={edition[m.id] ?? m.contenu} onChange={(e) => setEdition((p) => ({ ...p, [m.id]: e.target.value }))} />
                <div className="pil-prop-act">
                  <button type="button" className="btn btn--primary" disabled={busy === m.id} onClick={() => proposition('valider', m)}>{busy === m.id ? '…' : 'Valider et envoyer'}</button>
                  <button type="button" className="btn btn--ghost" disabled={busy === m.id} onClick={() => proposition('rejeter', m)}>Rejeter</button>
                </div>
              </div>
            ) : (
              <div key={m.id} className={`ibub ${m.sens === 'in' ? 'in' : 'out'}`}>
                <div className="ibub-txt">{m.contenu.replace(/\*\*(.+?)\*\*/g, '$1').split('\n').map((line, j, arr) => <span key={j}>{line}{j < arr.length - 1 ? <br /> : null}</span>)}</div>
                <span className="ibub-tag">{m.sens === 'in' ? 'Client' : m.type === 'reponse_auto' ? `Assistant${m.modele ? ` · ${MODELE[m.modele] ?? m.modele}` : ''}` : m.type === 'devis_envoye' ? 'Devis' : 'Vous'} · {heure(m.sent_at)}</span>
              </div>
            ))}
          </div>

          <div className="inbox-compose">
            <textarea value={draft} onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyer() } }}
              placeholder={contactEmail ? 'Votre réponse (envoyée par email au client)…' : 'Votre réponse (visible dans sa conversation)…'} rows={2} />
            <div className="inbox-cbar">
              <button className="btn btn--ghost" style={{ width: 'auto' }} disabled={suggesting} onClick={suggererIA} title="Rédige un brouillon que vous relisez — rien n’est envoyé sans vous">
                {suggesting ? 'Rédaction…' : 'Proposer une réponse'}
              </button>
              <button className="btn btn--primary" style={{ width: 'auto', marginLeft: 'auto' }} disabled={sending || !draft.trim()} onClick={envoyer}>{sending ? 'Envoi…' : 'Envoyer'}</button>
            </div>
            {err && <div className="msg err" style={{ marginTop: '.6rem' }}>{err}</div>}
          </div>
        </div>
      ) : (
        <div className="inbox-thread empty"><div className="inbox-placeholder muted">Sélectionnez une conversation pour la lire et y répondre.</div></div>
      )}
    </div>
  )
}
