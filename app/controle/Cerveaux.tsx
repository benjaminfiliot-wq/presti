'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiDirection } from './client'
import { relTime } from '@/lib/direction/fraicheur'

type CerveauItem = {
  id: string
  score: number | null
  reussis: number | null
  total: number | null
  date: string | null
  cas: number
  ouverts: number
  derniereEntree: string | null
}

export default function Cerveaux({ role }: { role: 'direction' | 'lecture' }) {
  const [cerveaux, setCerveaux] = useState<CerveauItem[] | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [maintenant] = useState(() => Date.now())

  const charger = useCallback(async () => {
    const r = await apiDirection<{ cerveaux?: CerveauItem[] }>('/api/controle/cerveaux')
    if (!r.ok) {
      setErreur(r.data.error ?? 'Cerveaux indisponibles pour l’instant.')
      return
    }
    setErreur(null)
    setCerveaux(r.data.cerveaux ?? [])
  }, [])

  useEffect(() => {
    void charger()
  }, [charger])

  return (
    <div className="tool-card" data-cerveaux>
      <h2>Cerveaux</h2>
      <p className="muted" style={{ margin: '0 0 .9rem' }}>
        Un score = des cas de référence rejoués contre le cerveau tel qu’il est. Un score qui baisse ne se fusionne pas.
      </p>
      <div className="psh-tablewrap dir-table">
        <table className="psh-dtable">
          <thead>
            <tr>
              <th>Cerveau</th>
              <th>Score</th>
              <th>Réussis / Total</th>
              <th>Cas</th>
              <th>Ouverts</th>
              <th>Dernière amélioration</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {erreur ? (
              <tr>
                <td colSpan={7}>
                  <span className="notif-erreur" role="alert">{erreur}</span>{' '}
                  <button type="button" className="btn btn--ghost" onClick={() => void charger()}>
                    Réessayer
                  </button>
                </td>
              </tr>
            ) : cerveaux === null ? (
              <tr>
                <td colSpan={7} className="muted">
                  Chargement…
                </td>
              </tr>
            ) : cerveaux.length === 0 ? (
              <tr>
                <td colSpan={7} className="muted" data-cerveaux-vide>
                  Aucun cerveau trouvé.
                </td>
              </tr>
            ) : (
              cerveaux.map((c) => {
                const scoreClass =
                  c.score === null
                    ? 'muted'
                    : c.score >= 90
                    ? 'ok'
                    : c.score >= 70
                    ? 'warn'
                    : 'err'
                return (
                  <tr key={c.id} data-cerveau={c.id}>
                    <td data-lab="Cerveau">
                      <b>{c.id}</b>
                    </td>
                    <td data-lab="Score">
                      {c.score !== null ? (
                        <span className={`pill ${scoreClass}`}>
                          <span className="pdot" />
                          {c.score} %
                        </span>
                      ) : (
                        <span className="pill muted">—</span>
                      )}
                    </td>
                    <td data-lab="Réussis / Total">
                      {c.reussis !== null && c.total !== null ? `${c.reussis} / ${c.total}` : '—'}
                    </td>
                    <td data-lab="Cas">{c.cas}</td>
                    <td data-lab="Ouverts">{c.ouverts}</td>
                    <td data-lab="Dernière amélioration">
                      {c.derniereEntree ? <span title={c.derniereEntree}>{c.derniereEntree}</span> : <span className="muted">—</span>}
                    </td>
                    <td data-lab="Date">
                      {c.date ? (
                        <time dateTime={c.date} title={new Date(c.date).toLocaleString('fr-FR')}>
                          {relTime(c.date, maintenant)}
                        </time>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
