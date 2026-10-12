'use client'

import './assistant.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import { notFound, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/app/AppShell'
import { enEssai, ouvertPour } from '@/lib/flags'
import { CREDIT_COST, messageVerrou, peut } from '@/lib/plans'
import { TIERS, tierAllowed, type Tier } from '@/lib/models'
import { LIBELLE_OUTIL, type NomOutil } from '@/lib/assistant/outils'
import { PLAFOND_TOURS, MESSAGE_MAX, HISTORIQUE_MESSAGES_MAX } from '@/lib/assistant/cadrage'
import type { Brouillon } from '@/lib/assistant/boucle'

// L'assistant de gestion (plans/016-assistant.md, jalons A1 lecture et A2 brouillons). Il lit les données de l'artisan
// par les mêmes chemins que les écrans, et ne fait rien partir : un brouillon s'ouvre dans l'écran habituel (Devis,
// Messages), où l'artisan le relit et le valide lui-même.

type Bulle = { role: 'artisan' | 'assistant'; texte: string; brouillons?: Brouillon[]; consultes?: string[]; erreur?: boolean }
type LigneJournal = { id: string; cree_le: string; outil: string; resultat: string; resume: string; objet_type: string | null; objet_id: string | null }

const EXEMPLES = [
  'Qu’est-ce qui est en alerte dans mon stock ?',
  'Quelles factures sont impayées ?',
  'Qui attend une réponse de ma part ?',
  'Où en est mon chiffre du mois ?',
]
const nouvelId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : '00000000-0000-4000-8000-' + Math.random().toString(16).slice(2, 14).padEnd(12, '0'))
const heure = (iso: string) => new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
const libelleOutil = (o: string) => (o in LIBELLE_OUTIL ? LIBELLE_OUTIL[o as NomOutil] : o)

export default function PageAssistant() {
  if (!enEssai('assistant')) notFound()
  return <Assistant />
}

function Assistant() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [uid, setUid] = useState<string | null>(null)
  const [bloque, setBloque] = useState<string | null>(null)
  const [plan, setPlan] = useState('gratuit')
  const [tier, setTier] = useState<Tier>('standard')
  const [conversation, setConversation] = useState(nouvelId)
  const [bulles, setBulles] = useState<Bulle[]>([])
  const [saisie, setSaisie] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [consulte, setConsulte] = useState<string | null>(null)
  const [restants, setRestants] = useState(PLAFOND_TOURS)
  const [journal, setJournal] = useState<LigneJournal[] | null>(null)
  const [journalErreur, setJournalErreur] = useState(false)
  const filRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const id = data.session.user.id
      if (!ouvertPour('assistant', id)) { router.replace('/dashboard'); return } // essai : compte hors liste
      setUid(id)
      const { data: art } = await supabase.from('artisans').select('plan, is_founder').eq('id', id).maybeSingle()
      const p = art?.is_founder ? 'business' : (art?.plan as string) || 'gratuit'
      setPlan(p)
      if (!art?.is_founder && !peut(p, 'assistant')) setBloque(`L’assistant de gestion n’est pas dans votre offre. ${messageVerrou('assistant')}`)
      setReady(true)
    })
  }, [router])

  useEffect(() => { const el = filRef.current; if (el) el.scrollTop = el.scrollHeight }, [bulles, consulte])

  const chargerJournal = useCallback(async () => {
    if (!uid) return
    // Lu sous la RLS, comme les autres écrans : l'artisan ne voit que son journal (migration 0150).
    const { data, error } = await supabase.from('assistant_journal')
      .select('id, cree_le, outil, resultat, resume, objet_type, objet_id')
      .eq('artisan_id', uid).order('cree_le', { ascending: false }).limit(30)
    setJournalErreur(!!error)
    setJournal((data as LigneJournal[] | null) ?? [])
  }, [uid])

  const envoyer = async (texte: string) => {
    const message = texte.trim()
    if (!message || enCours) return
    const historique = bulles.filter((b) => !b.erreur).slice(-HISTORIQUE_MESSAGES_MAX).map((b) => ({ role: b.role, texte: b.texte }))
    setBulles((x) => [...x, { role: 'artisan', texte: message }])
    setSaisie('')
    setEnCours(true)
    setConsulte(null)
    const consultes: string[] = []
    const ajouterAssistant = (b: Omit<Bulle, 'role'>) => setBulles((x) => [...x, { role: 'assistant', ...b }])
    try {
      const t = (await supabase.auth.getSession()).data.session?.access_token
      const r = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ conversation_id: conversation, message, historique, modele: tier }),
      })
      if (!r.ok || !r.body || !(r.headers.get('content-type') || '').includes('ndjson')) {
        const d = await r.json().catch(() => ({}))
        if (d?.code === 'plafond') setRestants(0)
        ajouterAssistant({ texte: d?.error || 'L’assistant est indisponible pour l’instant.', erreur: true })
        return
      }
      const lecteur = r.body.getReader()
      const decodeur = new TextDecoder()
      let reste = ''
      let fini = false
      for (;;) {
        const { value, done } = await lecteur.read()
        if (done) break
        reste += decodeur.decode(value, { stream: true })
        const lignes = reste.split('\n')
        reste = lignes.pop() ?? ''
        for (const l of lignes) {
          if (!l.trim()) continue
          let ev: { e?: string; libelle?: string; texte?: string; brouillons?: Brouillon[]; consultes?: string[]; restants?: number; message?: string }
          try { ev = JSON.parse(l) } catch { continue }
          if (ev.e === 'consulte' && ev.libelle) { consultes.push(ev.libelle); setConsulte(ev.libelle) }
          else if (ev.e === 'fin') {
            fini = true
            if (typeof ev.restants === 'number') setRestants(ev.restants)
            ajouterAssistant({ texte: ev.texte || '', brouillons: ev.brouillons ?? [], consultes: ev.consultes ?? consultes })
          } else if (ev.e === 'erreur') {
            fini = true
            ajouterAssistant({ texte: ev.message || 'L’assistant n’a pas pu répondre.', erreur: true })
          }
        }
      }
      if (!fini) ajouterAssistant({ texte: 'La réponse a été interrompue. Réessayez.', erreur: true })
    } catch {
      ajouterAssistant({ texte: 'Connexion perdue. Réessayez dans un instant.', erreur: true })
    } finally {
      setEnCours(false)
      setConsulte(null)
      if (journal !== null) void chargerJournal()
    }
  }

  const nouvelleConversation = () => { setConversation(nouvelId()); setBulles([]); setRestants(PLAFOND_TOURS) }

  if (!ready) return <AppShell active="assistant" title="Assistant de gestion"><div className="tool-card"><p className="muted">Chargement…</p></div></AppShell>
  if (bloque) {
    return (
      <AppShell active="assistant" title="Assistant de gestion">
        <div className="psh-panel asst-verrou"><p>{bloque}</p><a className="btn btn--primary" style={{ width: 'auto' }} href="/abonnement">Voir les offres</a></div>
      </AppShell>
    )
  }

  const paliers = TIERS.filter((x) => plan === 'business' || tierAllowed(x.value, plan))
  return (
    <AppShell active="assistant" title="Assistant de gestion" crumb="Lit vos données, prépare des brouillons : rien ne part sans vous" wide
      actions={<button type="button" className="btn btn--ghost" style={{ width: 'auto' }} onClick={nouvelleConversation} disabled={enCours}>Nouvelle conversation</button>}>
      <div className="asst">
        <section className="psh-panel asst-panneau" aria-label="Conversation avec l’assistant">
          <div className="asst-fil" ref={filRef} aria-live="polite">
            {bulles.length === 0 ? (
              <div className="asst-accueil">
                <p className="asst-accueil-titre">Posez une question sur votre activité.</p>
                <p className="muted">Stock et alertes, devis, factures et impayés, conversations en attente, chiffres du mois. Il peut aussi préparer un devis brouillon ou une réponse à un client, que vous relisez et validez dans l’écran habituel.</p>
                <div className="asst-exemples">
                  {EXEMPLES.map((e) => <button key={e} type="button" className="asst-exemple" onClick={() => void envoyer(e)}>{e}</button>)}
                </div>
              </div>
            ) : bulles.map((b, i) => (
              <div key={i} className={`asst-bulle ${b.role}${b.erreur ? ' erreur' : ''}`}>
                <div className="asst-texte">{b.texte.split('\n').map((l, j) => <span key={j}>{l}<br /></span>)}</div>
                {b.brouillons?.length ? (
                  <div className="asst-brouillons">
                    {b.brouillons.map((d, j) => (
                      <div key={j} className="asst-brouillon">
                        <span className="asst-brouillon-lab">{d.type === 'devis' ? 'Brouillon de devis' : 'Réponse préparée'} · {d.libelle}</span>
                        <span className="asst-brouillon-note">Rien n’est parti. Vous le relisez et le validez dans {d.type === 'devis' ? 'l’écran Devis' : 'Messages'}.</span>
                        <a className="btn btn--primary" style={{ width: 'auto' }} href={d.lien}>Ouvrir le brouillon</a>
                      </div>
                    ))}
                  </div>
                ) : null}
                {b.role === 'assistant' && b.consultes?.length ? <span className="asst-consultes">A consulté : {b.consultes.join(', ')}</span> : null}
              </div>
            ))}
            {enCours ? <div className="asst-bulle assistant attente" role="status"><span className="asst-point" aria-hidden="true" />{consulte ? `L’assistant consulte : ${consulte}…` : 'L’assistant réfléchit…'}</div> : null}
          </div>

          <form className="asst-saisie" onSubmit={(e) => { e.preventDefault(); void envoyer(saisie) }}>
            <textarea value={saisie} maxLength={MESSAGE_MAX} rows={2} disabled={enCours || restants <= 0}
              onChange={(e) => setSaisie(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void envoyer(saisie) } }}
              placeholder={restants <= 0 ? 'Conversation terminée : ouvrez-en une nouvelle.' : 'Votre question…'} aria-label="Votre question à l’assistant" />
            <div className="asst-barre">
              <label className="asst-palier">Modèle
                <select value={tier} onChange={(e) => setTier(e.target.value as Tier)} disabled={enCours}>
                  {paliers.map((p) => <option key={p.value} value={p.value}>{p.label} · {CREDIT_COST[p.value]} crédit{CREDIT_COST[p.value] > 1 ? 's' : ''} par message</option>)}
                </select>
              </label>
              <span className="asst-restants muted">{restants} message{restants > 1 ? 's' : ''} restant{restants > 1 ? 's' : ''} dans cette conversation</span>
              <button type="submit" className="btn btn--primary" style={{ width: 'auto' }} disabled={enCours || !saisie.trim() || restants <= 0}>{enCours ? '…' : 'Envoyer'}</button>
            </div>
            <p className="asst-note muted">Un devis brouillon ou une réponse préparée consomment aussi leurs crédits, comme les boutons « Devis auto » et « Proposer une réponse ».</p>
          </form>
        </section>

        <details className="psh-panel asst-journal" onToggle={(e) => { if ((e.currentTarget as HTMLDetailsElement).open && journal === null) void chargerJournal() }}>
          <summary>Journal de l’assistant</summary>
          <div className="asst-journal-corps">
            {journal === null ? <p className="muted">Chargement…</p>
              : journalErreur ? <p className="muted">Le journal est indisponible pour l’instant.</p>
              : journal.length === 0 ? <p className="muted">Rien encore : chaque donnée consultée et chaque brouillon préparé s’inscrivent ici.</p>
              : (
                <ul>
                  {journal.map((l) => (
                    <li key={l.id}>
                      <span className="asst-j-date">{heure(l.cree_le)}</span>
                      <span className="asst-j-outil">{libelleOutil(l.outil)}</span>
                      <span className={`pill ${l.resultat === 'ok' ? 'ok' : l.resultat === 'refus' ? 'warn' : 'crit'}`}>{l.resultat}</span>
                      <span className="asst-j-resume">{l.resume}</span>
                      {l.objet_type === 'devis' && l.objet_id ? <a href={`/devis/${l.objet_id}`}>Ouvrir</a> : l.objet_type === 'conversation' && l.objet_id ? <a href={`/messages?lead=${l.objet_id}`}>Ouvrir</a> : null}
                    </li>
                  ))}
                </ul>
              )}
          </div>
        </details>
      </div>
    </AppShell>
  )
}
