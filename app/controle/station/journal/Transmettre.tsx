'use client'

import { useCallback, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { apiDirection } from '../../client'
import type { Role } from '../Station'

// Le champ « ▶ Transmettre à l'équipage… » du Journal (fiche 026-123).
// La consigne de Benj part vers /api/controle/pilotage/consignes (fiche 026-074) : 3 à 200 signes, rognés, sans reconfirmation.
// Elle est une DONNÉE pour le Chef, jamais un ordre. Ici on n'ajoute aucune bulle : « BENJ ▸ … » apparaît quand le fil la sert.

const INVITE = '▶ Transmettre à l’équipage…'
const CONFIRMATION = 'Consigne transmise à l’équipage.'
const MAX_SIGNES = 200
const MIN_SIGNES = 3

type Statut = { ok: boolean; message: string }

export default function Transmettre({ role }: { role: Role }) {
  const [texte, setTexte] = useState('')
  const [statut, setStatut] = useState<Statut | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const enCours = useRef(false)

  const actif = texte.trim().length >= MIN_SIGNES && !envoi

  const saisir = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    // Une consigne tient sur une ligne, sans signe de contrôle (le serveur les refuse) : un retour à la ligne ou une
    // tabulation collés deviennent une espace.
    // eslint-disable-next-line no-control-regex
    setTexte(e.target.value.replace(/[\u0000-\u001f\u007f-\u009f]+/g, ' '))
    setStatut(null)
  }, [])

  const envoyer = useCallback(async () => {
    const rogne = texte.trim()
    if (rogne.length < MIN_SIGNES || enCours.current) return
    enCours.current = true
    setEnvoi(true)
    setStatut(null)
    const r = await apiDirection<{ error?: string }>('/api/controle/pilotage/consignes', { method: 'POST', body: JSON.stringify({ texte: rogne }) })
    enCours.current = false
    setEnvoi(false)
    if (r.ok) {
      setTexte('')
      setStatut({ ok: true, message: CONFIRMATION })
    } else {
      // Le refus (400, 403, 429, 503…) dit ce que le serveur a dit, et le texte reste dans le champ.
      setStatut({ ok: false, message: r.data?.error || `La consigne n’est pas partie (erreur ${r.status}).` })
    }
  }, [texte])

  const toucher = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      if (actif) void envoyer()
    }
  }, [actif, envoyer])

  if (role === 'lecture') return <p className="mc-jrn-lecture">Transmettre à l’équipage : lecture seule</p>

  return (
    <div data-transmettre>
      <div className="mc-jrn-saisie">
        <textarea
          value={texte}
          rows={2}
          maxLength={MAX_SIGNES}
          placeholder={INVITE}
          aria-label={INVITE}
          readOnly={envoi}
          enterKeyHint="send"
          autoComplete="off"
          onChange={saisir}
          onKeyDown={toucher}
        />
        <button type="button" className="mc-jrn-envoyer" disabled={!actif} onClick={() => { void envoyer() }}>Transmettre</button>
      </div>
      <div className="mc-jrn-pied">
        <p className={statut ? (statut.ok ? 'mc-jrn-statut' : 'mc-jrn-statut mc-jrn-statut-refus') : 'mc-jrn-statut'} role={statut && !statut.ok ? 'alert' : 'status'}>{statut?.message ?? ''}</p>
        <span className="mc-jrn-compteur">{texte.length}/{MAX_SIGNES}</span>
      </div>
    </div>
  )
}
