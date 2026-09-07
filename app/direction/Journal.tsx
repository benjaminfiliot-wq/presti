'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiDirection } from './client'
import { relTime } from '@/lib/direction/fraicheur'

// Le journal de direction (prompt v10 §1) : qui, quoi, quand, avant/après, IP. Lisible par les deux rôles, mais
// le rôle « lecture » ne reçoit ni adresse ni appareil (la colonne n'apparaît pas).
//
// Corrections de la revue du 07/09 : le détail se déplie par un vrai bouton (clavier et lecteur d'écran, 44 px
// sur téléphone) ; une erreur ne se transforme plus en « aucune action » ; « Plus ancien » ne peut plus doubler
// les lignes (double-clic) ni s'empiler.
type Ligne = { id: string; acteur_id: string | null; acteur_email: string | null; action: string; cible_type: string | null; cible_id: string | null; artisan_id: string | null; avant: unknown; apres: unknown; ip?: string | null; agent?: string | null; reconfirme: boolean; cree_le: string }
const LIBELLES: Record<string, string> = { reconfirmation: 'Re-confirmation', ban_ip: 'Adresse bannie', deban_ip: 'Adresse débannie', alerte_acquittee: 'Alerte acquittée', reglage_modifie: 'Réglage modifié', role_modifie: 'Rôle modifié' }

export default function Journal({ role }: { role: 'direction' | 'lecture' }) {
  const [lignes, setLignes] = useState<Ligne[] | null>(null)
  const [suivant, setSuivant] = useState<string | null>(null)
  const [ouverte, setOuverte] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [maintenant] = useState(() => Date.now())

  const charger = useCallback(async (avant?: string | null) => {
    setBusy(true)
    const r = await apiDirection<{ lignes?: Ligne[]; suivant?: string | null }>(`/api/direction/journal?limite=50${avant ? `&avant=${encodeURIComponent(avant)}` : ''}`)
    setBusy(false)
    // Une erreur ne vide pas la liste : on ne sait pas s'il y a des lignes, on le dit.
    if (!r.ok) { setErreur(r.data.error ?? 'Journal indisponible pour l’instant.'); return }
    setErreur(null)
    setLignes((l) => {
      if (!avant) return r.data.lignes ?? []
      const vus = new Set((l ?? []).map((x) => x.id))
      return [...(l ?? []), ...(r.data.lignes ?? []).filter((x) => !vus.has(x.id))]
    })
    setSuivant(r.data.suivant ?? null)
  }, [])
  useEffect(() => { void charger() }, [charger])

  const colonnes = role === 'direction' ? 6 : 5

  return (
    <div className="tool-card" data-journal>
      <h2>Journal de direction</h2>
      <p className="muted" style={{ margin: '0 0 .9rem' }}>
        Chaque action d’un fondateur : qui, quoi, quand, avant et après{role === 'direction' ? ', depuis quelle adresse' : ''}. Immuable, gardé 24 mois.
      </p>
      <div className="psh-tablewrap dir-table">
        <table className="psh-dtable">
          <thead><tr><th>Quand</th><th>Qui</th><th>Action</th><th>Cible</th><th>Confirmée</th>{role === 'direction' ? <th>Adresse</th> : null}</tr></thead>
          <tbody>
            {erreur ? <tr><td colSpan={colonnes}><span className="notif-erreur" role="alert">{erreur}</span> <button type="button" className="btn btn--ghost" onClick={() => void charger()}>Réessayer</button></td></tr>
              : lignes === null ? <tr><td colSpan={colonnes} className="muted">Chargement…</td></tr>
              : lignes.length === 0 ? <tr><td colSpan={colonnes} className="muted" data-journal-vide>Aucune action pour l’instant.</td></tr>
              : lignes.map((l) => (
                <tr key={l.id} data-action={l.action} className={ouverte === l.id ? 'on' : ''}>
                  <td data-lab="Quand"><time dateTime={l.cree_le} title={new Date(l.cree_le).toLocaleString('fr-FR')}>{relTime(l.cree_le, maintenant)}</time></td>
                  <td data-lab="Qui">{l.acteur_email ?? 'fondateur'}{l.acteur_id ? <small className="muted"> · {l.acteur_id.slice(0, 8)}</small> : null}</td>
                  <td data-lab="Action">
                    {l.avant || l.apres ? (
                      <button type="button" className="dir-dep" aria-expanded={ouverte === l.id} aria-controls={`dir-j-${l.id}`} onClick={() => setOuverte((o) => (o === l.id ? null : l.id))}>
                        {LIBELLES[l.action] ?? l.action}
                      </button>
                    ) : <b>{LIBELLES[l.action] ?? l.action}</b>}
                    {ouverte === l.id ? <pre className="dir-json" id={`dir-j-${l.id}`}>{l.avant ? `avant : ${JSON.stringify(l.avant)}\n` : ''}{l.apres ? `après : ${JSON.stringify(l.apres)}` : ''}</pre> : null}
                  </td>
                  <td data-lab="Cible">{l.cible_type ? `${l.cible_type} ${l.cible_id ?? ''}` : '—'}</td>
                  <td data-lab="Confirmée">{l.reconfirme ? <span className="pill ok"><span className="pdot" />oui</span> : <span className="pill muted">—</span>}</td>
                  {role === 'direction' ? <td data-lab="Adresse"><code>{l.ip ?? '—'}</code>{l.agent ? <small className="muted"> · {l.agent}</small> : null}</td> : null}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {suivant && !erreur ? <button type="button" className="btn btn--ghost" style={{ marginTop: '.8rem' }} disabled={busy} onClick={() => void charger(suivant)}>{busy ? 'Chargement…' : 'Plus ancien'}</button> : null}
    </div>
  )
}
