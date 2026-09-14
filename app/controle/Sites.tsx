'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiDirection } from './client'
import { LIBELLE_ETAT, type EtatCommande } from '@/lib/siteCommande'

type Commande = {
  id: string
  artisan: { id: string; nom?: string | null; metier?: string | null; slug?: string | null } | null
  email: string
  etat: string
  domaine_mode: string
  domaine: string | null
  metier: string
  metiers_secondaires: string[]
  communes: string[]
  prix_cents: number
  paye_le: string | null
  genere_le: string | null
  valide_le: string | null
  en_ligne_le: string | null
  scores: { performance?: number; accessibility?: number; 'best-practices'?: number; seo?: number } | null
  verifications: any | null
  consigne: string | null
  regenerations: number
  cree_le: string
  modifie_le: string
  apercu?: string | null
}

const ETATS_FILTRE = [
  { id: '', label: 'Toutes' },
  { id: 'payee', label: 'Payées' },
  { id: 'generee', label: 'Générées' },
  { id: 'validee', label: 'Validées' },
  { id: 'en_ligne', label: 'En ligne' },
]

export default function Sites({ role, signaler }: { role: 'direction' | 'lecture'; signaler?: (m: { type: 'ok' | 'err'; text: string }) => void }) {
  const [commandes, setCommandes] = useState<Commande[] | null>(null)
  const [etatFiltre, setEtatFiltre] = useState<string>('')
  const [ouverte, setOuverte] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [consignes, setConsignes] = useState<Record<string, string>>({})
  const [dnsParCommande, setDnsParCommande] = useState<Record<string, { type: string; name: string; value: string }[]>>({})

  const charger = useCallback(async (filtre: string) => {
    const url = `/api/controle/sites${filtre ? `?etat=${filtre}` : ''}`
    const r = await apiDirection<{ commandes?: Commande[] }>(url)
    if (!r.ok) {
      setErreur(r.data.error ?? 'Commandes de site indisponibles pour l’instant.')
      return
    }
    setErreur(null)
    setCommandes(r.data.commandes ?? [])
  }, [])

  useEffect(() => {
    void charger(etatFiltre)
  }, [charger, etatFiltre])

  const agir = async (id: string, actionType: 'valider' | 'regenerer', consigneText?: string) => {
    setBusyId(id)
    try {
      let body: { action: string; consigne?: string }
      if (actionType === 'valider') {
        body = { action: 'valider' }
      } else {
        if (!consigneText || consigneText.trim().length < 10) {
          signaler?.({ type: 'err', text: 'Une consigne d’au moins 10 signes est obligatoire pour renvoyer en génération.' })
          setBusyId(null)
          return
        }
        body = { action: 'regenerer', consigne: consigneText.trim() }
      }
      const r = await apiDirection<{ message?: string; error?: string }>(`/api/controle/sites/${id}`, {
        method: 'POST',
        body: JSON.stringify(body),
      }, true)
      if (r.ok) {
        signaler?.({ type: 'ok', text: actionType === 'valider' ? 'Site validé.' : 'Site renvoyé en génération.' })
        void charger(etatFiltre)
        setOuverte(null)
      } else {
        signaler?.({ type: 'err', text: r.data.error ?? 'Action refusée.' })
      }
    } finally {
      setBusyId(null)
    }
  }

  const mettreEnLigne = async (c: Commande) => {
    if (c.etat !== 'validee') return
    const domaineTexte = c.domaine || 'son domaine'
    if (!window.confirm(`Le site sera servi sur ${domaineTexte} — les enregistrements DNS seront à donner à l'artisan.`)) {
      return
    }
    setBusyId(c.id)
    try {
      const r = await apiDirection<{ ok?: boolean; commande?: Commande; dns?: { type: string; name: string; value: string }[]; error?: string }>(
        `/api/controle/sites/${c.id}`,
        {
          method: 'POST',
          body: JSON.stringify({ action: 'mettre_en_ligne' }),
        },
        true
      )
      if (r.ok) {
        signaler?.({ type: 'ok', text: 'Site mis en ligne.' })
        if (r.data.dns && r.data.dns.length > 0) {
          setDnsParCommande((prev) => ({ ...prev, [c.id]: r.data.dns! }))
        }
        void charger(etatFiltre)
      } else {
        signaler?.({ type: 'err', text: r.data.error ?? 'Mise en ligne refusée.' })
      }
    } finally {
      setBusyId(null)
    }
  }

  const colonnes = 6

  return (
    <div className="tool-card" data-sites>
      <h2>Commandes de sites</h2>
      <p className="muted" style={{ margin: '0 0 .9rem' }}>
        Suivi des sites à la demande et relecture des aperçus générés avant validation (300 € une fois).
      </p>

      <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {ETATS_FILTRE.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`btn ${etatFiltre === f.id ? 'btn--primary' : 'btn--ghost'}`}
            onClick={() => setEtatFiltre(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="psh-tablewrap dir-table">
        <table className="psh-dtable">
          <thead>
            <tr>
              <th>Artisan</th>
              <th>Métier & Communes</th>
              <th>État</th>
              <th>Scores Lighthouse</th>
              <th>Régénérations</th>
              <th>Payée le</th>
            </tr>
          </thead>
          <tbody>
            {erreur ? (
              <tr>
                <td colSpan={colonnes}>
                  <span className="notif-erreur" role="alert">{erreur}</span>{' '}
                  <button type="button" className="btn btn--ghost" onClick={() => void charger(etatFiltre)}>Réessayer</button>
                </td>
              </tr>
            ) : commandes === null ? (
              <tr>
                <td colSpan={colonnes} className="muted">Chargement…</td>
              </tr>
            ) : commandes.length === 0 ? (
              <tr>
                <td colSpan={colonnes} className="muted" data-sites-vide>Aucune commande de site pour l’instant.</td>
              </tr>
            ) : (
              commandes.map((c) => {
                const estOuverte = ouverte === c.id
                const s = c.scores
                return (
                  <tr key={c.id} data-site-id={c.id} className={estOuverte ? 'on' : ''}>
                    <td data-lab="Artisan">
                      <button
                        type="button"
                        className="dir-dep"
                        aria-expanded={estOuverte}
                        onClick={() => setOuverte(estOuverte ? null : c.id)}
                      >
                        <b>{c.artisan?.nom ?? c.email}</b>
                      </button>
                      {c.artisan?.metier ? <small className="muted"> · {c.artisan.metier}</small> : null}
                    </td>
                    <td data-lab="Métier & Communes">
                      <b>{c.metier}</b> <small className="muted">({c.communes.length} commune{c.communes.length > 1 ? 's' : ''})</small>
                      {estOuverte && (
                        <div style={{ marginTop: '.5rem', fontSize: '.85rem' }} className="muted">
                          Domaine : {c.domaine_mode} ({c.domaine || 'aucun'})<br />
                          Communes : {c.communes.join(', ')}<br />
                          {c.metiers_secondaires?.length ? <>Secondaires : {c.metiers_secondaires.join(', ')}<br /></> : null}
                          {c.consigne ? <>Consigne précédente : {c.consigne}<br /></> : null}
                          {c.verifications?.blocs ? (
                            <details style={{ marginTop: '.3rem' }}>
                              <summary>Rapport QA ({c.verifications.blocs.filter((b: any) => !b.passe).length} échec(s))</summary>
                              <ul>
                                {c.verifications.blocs.map((b: any, idx: number) => (
                                  <li key={idx} style={{ color: b.passe ? 'inherit' : 'red' }}>
                                    {b.nom} : {b.passe ? 'Passé' : `Échec (${b.mesure} vs ${b.attendu})`}
                                  </li>
                                ))}
                              </ul>
                            </details>
                          ) : null}

                          {c.apercu && (
                            <div style={{ marginTop: '.6rem' }}>
                              <a
                                href={c.apercu}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn--ghost"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem' }}
                              >
                                Ouvrir l'aperçu privé ↗
                              </a>
                              <p style={{ margin: '.3rem 0 0', fontSize: '.8rem', fontStyle: 'italic' }} className="muted">
                                lien privé, ne pas le partager ; il ne s'indexe pas.
                              </p>
                            </div>
                          )}

                          {c.etat === 'generee' && role === 'direction' && (
                            <div style={{ marginTop: '.8rem', padding: '.6rem', background: 'rgba(0,0,0,0.03)', borderRadius: '6px' }}>
                              <div style={{ display: 'flex', gap: '.5rem', marginBottom: '.5rem' }}>
                                <button
                                  type="button"
                                  className="btn btn--primary"
                                  disabled={busyId === c.id}
                                  onClick={() => void agir(c.id, 'valider')}
                                >
                                  {busyId === c.id ? 'Patientez…' : 'Valider'}
                                </button>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
                                <label style={{ fontSize: '.8rem' }}>Renvoyer en génération (consigne obligatoire) :</label>
                                <input
                                  type="text"
                                  className="input"
                                  placeholder="Ex: Changer les photos de la toiture, corriger le texte..."
                                  value={consignes[c.id] || ''}
                                  onChange={(e) => setConsignes({ ...consignes, [c.id]: e.target.value })}
                                />
                                <button
                                  type="button"
                                  className="btn btn--ghost"
                                  disabled={busyId === c.id || !consignes[c.id] || consignes[c.id].trim().length < 10}
                                  onClick={() => void agir(c.id, 'regenerer', consignes[c.id])}
                                >
                                  {busyId === c.id ? 'Patientez…' : 'Renvoyer en génération'}
                                </button>
                              </div>
                            </div>
                          )}

                          {c.etat === 'validee' && role === 'direction' && (
                            <div style={{ marginTop: '.8rem', padding: '.6rem', background: 'rgba(0,0,0,0.03)', borderRadius: '6px' }}>
                              <button
                                type="button"
                                className="btn btn--primary"
                                disabled={busyId === c.id}
                                onClick={() => void mettreEnLigne(c)}
                              >
                                {busyId === c.id ? 'Patientez…' : 'Mettre en ligne'}
                              </button>
                            </div>
                          )}

                          {dnsParCommande[c.id] && dnsParCommande[c.id].length > 0 && (
                            <div style={{ marginTop: '.8rem', padding: '.6rem', background: 'rgba(0,0,0,0.03)', borderRadius: '6px' }} data-dns>
                              <strong style={{ fontSize: '.85rem' }}>Enregistrements DNS à fournir :</strong>
                              <ul style={{ listStyle: 'none', padding: 0, margin: '.4rem 0 .5rem', fontSize: '.85rem' }}>
                                {dnsParCommande[c.id].map((rec, idx) => (
                                  <li key={idx} style={{ display: 'flex', gap: '.5rem', alignItems: 'center', marginBottom: '.3rem', flexWrap: 'wrap' }}>
                                    <span>type : <code>{rec.type}</code></span> ·{' '}
                                    <span>nom : <code>{rec.name}</code></span> ·{' '}
                                    <span>valeur : <code>{rec.value}</code></span>
                                    <button
                                      type="button"
                                      className="btn btn--ghost"
                                      style={{ fontSize: '.75rem', padding: '.1rem .4rem' }}
                                      onClick={() => void navigator.clipboard?.writeText(rec.value)}
                                      title="Copier la valeur"
                                    >
                                      Copier valeur
                                    </button>
                                  </li>
                                ))}
                              </ul>
                              <p style={{ margin: 0, fontSize: '.8rem', fontStyle: 'italic' }} className="muted">
                                à poser chez le registrar du domaine par l'artisan ; le sitemap est à soumettre dans la Search Console (Benj).
                              </p>
                            </div>
                          )}

                          {c.etat === 'en_ligne' && (
                            <div style={{ marginTop: '.8rem', padding: '.6rem', background: 'rgba(0,0,0,0.03)', borderRadius: '6px' }}>
                              <div style={{ fontSize: '.85rem' }}>
                                <strong>Site public :</strong>{' '}
                                <a href={`/site-genere/${c.id}/`} target="_blank" rel="noopener noreferrer">
                                  /site-genere/{c.id}/
                                </a>
                                {c.domaine ? (
                                  <>
                                    {' · '}
                                    <a href={`https://${c.domaine}`} target="_blank" rel="noopener noreferrer">
                                      https://{c.domaine}
                                    </a>
                                  </>
                                ) : null}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td data-lab="État">
                      <span className={`pill ${c.etat === 'en_ligne' || c.etat === 'validee' ? 'ok' : c.etat === 'generee' ? 'warn' : 'muted'}`}>
                        <span className="pdot" />
                        {LIBELLE_ETAT[c.etat as EtatCommande] ?? c.etat}
                      </span>
                    </td>
                    <td data-lab="Scores Lighthouse">
                      {s ? (
                        <div style={{ fontSize: '.85rem' }}>
                          <span style={{ color: (s.performance ?? 0) >= 95 ? 'green' : 'red' }}>Perf: {s.performance ?? '—'}%</span> ·{' '}
                          <span style={{ color: (s.seo ?? 0) >= 95 ? 'green' : 'red' }}>SEO: {s.seo ?? '—'}%</span>
                          <br />
                          <small className="muted">Acc: {s.accessibility ?? '—'}% · Pratiques: {s['best-practices'] ?? '—'}%</small>
                        </div>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td data-lab="Régénérations">
                      {c.regenerations > 0 ? <span className="pill warn">{c.regenerations}</span> : '0'}
                    </td>
                    <td data-lab="Payée le">
                      <time dateTime={c.paye_le || ''}>{c.paye_le ? new Date(c.paye_le).toLocaleDateString('fr-FR') : '—'}</time>
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
