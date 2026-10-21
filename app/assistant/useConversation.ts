'use client'

// L'assistant de gestion — la CONVERSATION côté navigateur, partagée par la page /assistant et le panneau de l'assistant dans le CRM
// (app/crm/assistant/PanneauAssistant.tsx). Un seul moteur : POST /api/assistant (flux NDJSON) et POST /api/assistant/actions pour les
// décisions sur les cartes. Ce module ne fait que parler à ces deux routes et tenir l'état de l'écran ; rien n'est décidé ici.
import { useCallback, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { HISTORIQUE_MESSAGES_MAX, PLAFOND_TOURS } from '@/lib/assistant/cadrage'
import type { Brouillon } from '@/lib/assistant/boucle'
import type { CarteAction } from '@/lib/assistant/cartes'
import type { Tier } from '@/lib/models'
import type { ContexteBrut } from '@/lib/crm/assistantCrm'
import type { Decision } from './CarteView'

// `signature` : posée par le serveur sur chaque réponse de l'assistant, renvoyée telle quelle dans l'historique (sans
// elle, le serveur écarte la réponse : audit d'attaque du 12/10, B3).
export type Bulle = { role: 'artisan' | 'assistant'; texte: string; signature?: string | null; brouillons?: Brouillon[]; carteIds?: string[]; consultes?: string[]; erreur?: boolean }

export const jetonDe = async () => (await supabase.auth.getSession()).data.session?.access_token

export type OptionsConversation = {
  tier: Tier
  /** L'objet du CRM ouvert à l'écran (« ce chantier ») : { type, id } seulement, VÉRIFIÉ par le serveur. */
  contexte?: ContexteBrut | null
  /** Une réponse vient d'arriver avec des cartes : l'écran peut basculer sur « À confirmer ». */
  onCartes?: (nouvelles: CarteAction[]) => void
  /** Après chaque réponse ou décision (réussie ou non) : relire actions, journal, vue du CRM… */
  onApres?: () => void
  /** Le contexte que le serveur a RETENU (ou null s'il l'a écarté). */
  onContexte?: (c: { type: string; libelle: string } | null) => void
}

export function useConversationAssistant(o: OptionsConversation) {
  // L'identifiant de la conversation est donné par le SERVEUR au premier message (audit d'attaque du 12/10, B2).
  const [conversation, setConversation] = useState<string | null>(null)
  const [bulles, setBulles] = useState<Bulle[]>([])
  const [enCours, setEnCours] = useState(false)
  const [consulte, setConsulte] = useState<string | null>(null)
  const [restants, setRestants] = useState(PLAFOND_TOURS)
  // Les cartes d'action, par identifiant : une carte vue dans la conversation et dans le poste est LA MÊME.
  const [cartes, setCartes] = useState<Record<string, CarteAction>>({})
  const [occupees, setOccupees] = useState<Record<string, boolean>>({})
  const [erreursCartes, setErreursCartes] = useState<Record<string, string>>({})
  const [annonce, setAnnonce] = useState('')
  const { tier, contexte, onCartes, onApres, onContexte } = o

  const fusionnerCartes = useCallback((lues: CarteAction[]) => setCartes((x) => ({ ...x, ...Object.fromEntries(lues.map((c) => [c.id, c])) })), [])

  const decider = useCallback(async (id: string, decision: Decision) => {
    if (occupees[id]) return
    setOccupees((x) => ({ ...x, [id]: true }))
    setErreursCartes((x) => { const { [id]: _, ...reste } = x; void _; return reste })
    try {
      const r = await fetch('/api/assistant/actions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await jetonDe()}` }, body: JSON.stringify({ id, decision }) })
      const d = await r.json().catch(() => ({})) as { ok?: boolean; error?: string; carte?: CarteAction; resume?: string }
      if (d.carte) setCartes((x) => ({ ...x, [d.carte!.id]: d.carte! }))
      if (!r.ok || !d.ok) setErreursCartes((x) => ({ ...x, [id]: d.error || 'L’action n’a pas pu être traitée. Réessayez dans un instant.' }))
      else setAnnonce(decision === 'confirmer' ? `Fait : ${d.resume ?? ''}` : decision === 'annuler' ? `Annulé : ${d.resume ?? ''}` : 'Carte écartée.')
    } catch {
      setErreursCartes((x) => ({ ...x, [id]: 'Connexion perdue. Réessayez dans un instant.' }))
    } finally {
      setOccupees((x) => ({ ...x, [id]: false }))
      onApres?.()
    }
  }, [occupees, onApres])

  const envoyer = useCallback(async (texte: string): Promise<boolean> => {
    const message = texte.trim()
    if (!message || enCours) return false
    const historique = bulles.filter((b) => !b.erreur).slice(-HISTORIQUE_MESSAGES_MAX).map((b) => ({ role: b.role, texte: b.texte, ...(b.role === 'assistant' && b.signature ? { signature: b.signature } : {}) }))
    setBulles((x) => [...x, { role: 'artisan', texte: message }])
    setEnCours(true)
    setConsulte(null)
    const consultes: string[] = []
    const ajouterAssistant = (b: Omit<Bulle, 'role'>) => setBulles((x) => [...x, { role: 'assistant', ...b }])
    try {
      const t = await jetonDe()
      const r = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ ...(conversation ? { conversation_id: conversation } : {}), message, historique, modele: tier, ...(contexte ? { contexte: { type: contexte.type, id: contexte.id } } : {}) }),
      })
      if (!r.ok || !r.body || !(r.headers.get('content-type') || '').includes('ndjson')) {
        const d = await r.json().catch(() => ({}))
        if (d?.code === 'plafond') setRestants(0)
        // Conversation inconnue du serveur (expirée, autre compte) : la prochaine question en ouvre une nouvelle.
        if (d?.code === 'conversation') setConversation(null)
        if (typeof d?.conversation_id === 'string') setConversation(d.conversation_id)
        ajouterAssistant({ texte: d?.error || 'L’assistant est indisponible pour l’instant.', erreur: true })
        return false
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
          let ev: { e?: string; id?: string; libelle?: string; texte?: string; signature?: string | null; brouillons?: Brouillon[]; cartes?: CarteAction[]; consultes?: string[]; restants?: number; message?: string; contexte?: { type: string; libelle: string } | null }
          try { ev = JSON.parse(l) } catch { continue }
          if (ev.e === 'conversation' && typeof ev.id === 'string') { setConversation(ev.id); if ('contexte' in ev) onContexte?.(ev.contexte ?? null) }
          else if (ev.e === 'consulte' && ev.libelle) { consultes.push(ev.libelle); setConsulte(ev.libelle) }
          else if (ev.e === 'fin') {
            fini = true
            if (typeof ev.restants === 'number') setRestants(ev.restants)
            const nouvelles = ev.cartes ?? []
            if (nouvelles.length) { setCartes((x) => ({ ...x, ...Object.fromEntries(nouvelles.map((c) => [c.id, c])) })); onCartes?.(nouvelles) }
            ajouterAssistant({ texte: ev.texte || '', signature: ev.signature ?? null, brouillons: ev.brouillons ?? [], carteIds: nouvelles.map((c) => c.id), consultes: ev.consultes ?? consultes })
          } else if (ev.e === 'erreur') {
            fini = true
            ajouterAssistant({ texte: ev.message || 'L’assistant n’a pas pu répondre.', erreur: true })
          }
        }
      }
      if (!fini) ajouterAssistant({ texte: 'La réponse a été interrompue. Réessayez.', erreur: true })
      return fini
    } catch {
      ajouterAssistant({ texte: 'Connexion perdue. Réessayez dans un instant.', erreur: true })
      return false
    } finally {
      setEnCours(false)
      setConsulte(null)
      onApres?.()
    }
  }, [bulles, conversation, contexte, enCours, onApres, onCartes, onContexte, tier])

  const nouvelleConversation = useCallback(() => { setConversation(null); setBulles([]); setRestants(PLAFOND_TOURS) }, [])

  return { conversation, bulles, enCours, consulte, restants, cartes, fusionnerCartes, occupees, erreursCartes, annonce, setAnnonce, envoyer, decider, nouvelleConversation }
}
