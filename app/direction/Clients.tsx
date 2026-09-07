'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiDirection } from './client'
import Fraicheur from './Fraicheur'
import { relTime } from '@/lib/direction/fraicheur'

// Direction → Clients (prompt v10 §2.2, J2) : qui sont-ils, où en sont-ils, et **par qui sont-ils arrivés**.
// Le canal d'acquisition vient du Registre des apports : « organique », ou « apporté par X » avec la force de
// la preuve. Jamais une saisie libre, jamais une déclaration non étayée.
type Canal = { type: 'organique' } | { type: 'apporte'; apporteur: string | null; code: string | null; statut: string; compte: boolean; raison: string }
type Ligne = { id: string; nom: string | null; metier: string | null; plan: string | null; offre: string; credits: number | null; inscrit_le: string; abonne: boolean; derniere_activite: string | null; suppression_demandee_le: string | null; canal: Canal }
type Reponse = { lignes: Ligne[]; resume: { total: number; payants: number; apportes: number }; source: { source: string; a: string; cache: boolean }; a: string }

export default function Clients() {
  const [d, setD] = useState<Reponse | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [maintenant] = useState(() => Date.now())

  const charger = useCallback(async (recherche: string) => {
    const r = await apiDirection<Reponse>(`/api/direction/clients${recherche ? `?q=${encodeURIComponent(recherche)}` : ''}`)
    if (!r.ok) { setErreur(r.data.error ?? 'Liste indisponible pour l’instant.'); return }
    setErreur(null); setD(r.data)
  }, [])
  useEffect(() => { void charger('') }, [charger])
  useEffect(() => {
    const t = setTimeout(() => void charger(q), 350)
    return () => clearTimeout(t)
  }, [q, charger])

  return (
    <div className="tool-card" data-clients>
      <h2>Clients &amp; abonnements</h2>
      <p className="muted" style={{ margin: '0 0 .9rem' }}>
        {d ? <>{d.resume.total} artisan{d.resume.total > 1 ? 's' : ''} · {d.resume.payants} abonné{d.resume.payants > 1 ? 's' : ''} · {d.resume.apportes} apporté{d.resume.apportes > 1 ? 's' : ''}</> : 'Chargement…'}
        {d ? <> · <Fraicheur s={d.source} maintenant={maintenant} /></> : null}
      </p>
      <label htmlFor="dir-cli-q" className="visually-hidden">Rechercher un artisan</label>
      <input id="dir-cli-q" type="search" placeholder="Chercher un nom, un métier, une adresse…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 380, marginBottom: '.9rem' }} />
      {erreur ? <p className="notif-erreur" role="alert">{erreur}</p> : null}
      <div className="psh-tablewrap dir-table">
        <table className="psh-dtable">
          <thead><tr><th>Artisan</th><th>Offre</th><th>Crédits</th><th>Inscrit</th><th>Dernière activité</th><th>Arrivé par</th></tr></thead>
          <tbody>
            {!d ? <tr><td colSpan={6} className="muted">Chargement…</td></tr>
              : d.lignes.length === 0 ? <tr><td colSpan={6} className="muted" data-clients-vide>Aucun artisan ne correspond.</td></tr>
              : d.lignes.map((l) => (
                <tr key={l.id} data-client={l.id}>
                  <td data-lab="Artisan"><b>{l.nom || 'Sans nom'}</b>{l.metier ? <small className="muted"> · {l.metier}</small> : null}{l.suppression_demandee_le ? <span className="pill warn" style={{ marginLeft: 6 }}><span className="pdot" />suppression demandée</span> : null}</td>
                  <td data-lab="Offre">{l.offre}{l.abonne ? <span className="pill ok" style={{ marginLeft: 6 }}><span className="pdot" />abonné</span> : null}</td>
                  <td data-lab="Crédits">{l.credits ?? '—'}</td>
                  <td data-lab="Inscrit"><time dateTime={l.inscrit_le}>{relTime(l.inscrit_le, maintenant)}</time></td>
                  <td data-lab="Dernière activité">{l.derniere_activite ? relTime(l.derniere_activite, maintenant) : <span className="muted">jamais</span>}</td>
                  <td data-lab="Arrivé par">
                    {l.canal.type === 'organique' ? <span className="muted">Organique</span> : (
                      <span title={l.canal.raison}>
                        <b>{l.canal.apporteur ?? 'Apporteur'}</b>
                        <span className={`pill ${l.canal.compte ? 'ok' : 'warn'}`} style={{ marginLeft: 6 }}><span className="pdot" />{l.canal.statut === 'prouve' ? 'prouvé' : l.canal.statut}</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
