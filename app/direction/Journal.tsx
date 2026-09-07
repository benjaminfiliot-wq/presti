'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiDirection } from './client'
import { relTime } from '@/lib/direction/fraicheur'

// Le journal de direction (prompt v10 §1) : qui, quoi, quand, avant/après, IP. Lisible par les deux rôles.
// Tableau statique (J1), repli en cartes ≤ 620 px (CSS .dir-table), pagination « plus ancien ».
type Ligne = { id: string; acteur_id: string | null; acteur_email: string | null; action: string; cible_type: string | null; cible_id: string | null; artisan_id: string | null; avant: unknown; apres: unknown; ip: string | null; agent: string | null; reconfirme: boolean; cree_le: string }
const LIBELLES: Record<string, string> = { reconfirmation: 'Re-confirmation', ban_ip: 'IP bannie', deban_ip: 'IP débannie', alerte_acquittee: 'Alerte acquittée', reglage_modifie: 'Réglage modifié', role_modifie: 'Rôle modifié' }

export default function Journal() {
  const [lignes, setLignes] = useState<Ligne[] | null>(null)
  const [suivant, setSuivant] = useState<string | null>(null)
  const [ouverte, setOuverte] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [maintenant] = useState(() => Date.now())
  // Le rôle « lecture » ne reçoit ni ip ni agent : la colonne existe, vide, plutôt qu'un tableau bancal.

  const charger = useCallback(async (avant?: string | null) => {
    const r = await apiDirection<{ lignes?: Ligne[]; suivant?: string | null }>(`/api/direction/journal?limite=50${avant ? `&avant=${encodeURIComponent(avant)}` : ''}`)
    if (!r.ok) { setErreur(r.data.error ?? 'Journal indisponible.'); setLignes((l) => l ?? []); return }
    setLignes((l) => (avant ? [...(l ?? []), ...(r.data.lignes ?? [])] : (r.data.lignes ?? [])))
    setSuivant(r.data.suivant ?? null)
  }, [])
  useEffect(() => { void charger() }, [charger])

  return (
    <div className="tool-card" data-journal>
      <h2>Journal de direction</h2>
      <p className="muted" style={{ margin: '0 0 .9rem' }}>Chaque action d’un fondateur : qui, quoi, quand, avant et après, depuis quelle adresse. Immuable, gardé 24 mois.</p>
      {erreur ? <p className="notif-erreur" role="alert">{erreur}</p> : null}
      <div className="psh-tablewrap dir-table">
        <table className="psh-dtable">
          <thead><tr><th>Quand</th><th>Qui</th><th>Action</th><th>Cible</th><th>Confirmée</th><th>Adresse</th></tr></thead>
          <tbody>
            {lignes === null ? <tr><td colSpan={6} className="muted">Chargement…</td></tr>
              : lignes.length === 0 ? <tr><td colSpan={6} className="muted" data-journal-vide>Aucune action pour l’instant.</td></tr>
              : lignes.map((l) => (
                <tr key={l.id} data-action={l.action} className={ouverte === l.id ? 'on' : ''} onClick={() => setOuverte((o) => (o === l.id ? null : l.id))} style={{ cursor: 'pointer' }}>
                  <td data-lab="Quand"><time dateTime={l.cree_le} title={new Date(l.cree_le).toLocaleString('fr-FR')}>{relTime(l.cree_le, maintenant)}</time></td>
                  <td data-lab="Qui">{l.acteur_email ?? 'fondateur'}{l.acteur_id ? <small className="muted"> · {l.acteur_id.slice(0, 8)}</small> : null}</td>
                  <td data-lab="Action"><b>{LIBELLES[l.action] ?? l.action}</b>{ouverte === l.id && (l.avant || l.apres) ? <pre className="dir-json">{l.avant ? `avant : ${JSON.stringify(l.avant)}\n` : ''}{l.apres ? `après : ${JSON.stringify(l.apres)}` : ''}</pre> : null}</td>
                  <td data-lab="Cible">{l.cible_type ? `${l.cible_type} ${l.cible_id ?? ''}` : '—'}</td>
                  <td data-lab="Confirmée">{l.reconfirme ? <span className="pill ok"><span className="pdot" />oui</span> : <span className="pill muted">—</span>}</td>
                  <td data-lab="Adresse">{l.ip === undefined ? <span className="muted">—</span> : <><code>{l.ip ?? '—'}</code>{l.agent ? <small className="muted"> · {l.agent}</small> : null}</>}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {suivant ? <button type="button" className="btn btn--ghost" style={{ marginTop: '.8rem' }} onClick={() => charger(suivant)}>Plus ancien</button> : null}
    </div>
  )
}
