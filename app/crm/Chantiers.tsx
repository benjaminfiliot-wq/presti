'use client'

import { useState, type FormEvent } from 'react'
import { LIBELLES_STATUT_CHANTIER, type StatutChantier } from '@/lib/crm/valider'
import { AIDE_TEXTE_LIBRE, appel, dateFr, estErreur, euros, enCentimes, itineraire, TON_STATUT_CHANTIER } from './client'
import { Lien } from './mode'
import type { ChantierListe, DevisSigne } from './types'

// Les chantiers : la liste (statut, avancement, retard) et la création — depuis un devis SIGNÉ (le titre, le client et le
// montant viennent du devis ; les tâches peuvent naître de ses lignes), ou libre pour un petit dépannage.
export default function ChantiersVue({ chantiers, devisSignes, onChange }: { chantiers: ChantierListe[]; devisSignes: DevisSigne[]; onChange: () => Promise<void> | void }) {
  const [mode, setMode] = useState<'devis' | 'libre'>(devisSignes.length ? 'devis' : 'libre')
  const [devisId, setDevisId] = useState('')
  const [titre, setTitre] = useState('')
  const [client, setClient] = useState('')
  const [taches, setTaches] = useState(true)
  const [envoi, setEnvoi] = useState(false)
  const [message, setMessage] = useState<{ texte: string; erreur: boolean } | null>(null)

  async function creer(e: FormEvent) {
    e.preventDefault()
    setEnvoi(true); setMessage(null)
    const body = mode === 'devis' ? { devis_id: devisId, generer_taches: taches } : { titre, ...(client.trim() ? { client_nom: client } : {}) }
    const r = await appel<{ id: string; taches: number; avertissements: string[] }>('/api/crm/chantiers', { method: 'POST', body })
    setEnvoi(false)
    if (!r.ok) { setMessage({ texte: r.erreur, erreur: estErreur(r) }); return }
    window.location.href = `/crm/chantiers/${r.corps.id}`
  }

  return (
    <div className="crm-pile">
      <section className="psh-panel" aria-labelledby="crm-liste-chantiers">
        <header><h2 id="crm-liste-chantiers">Chantiers</h2><span className="tag">{chantiers.length}</span></header>
        {chantiers.length === 0 ? (
          <div className="psh-empty">Aucun chantier pour l’instant. Créez-en un ci-dessous, depuis un devis signé ou pour un dépannage.</div>
        ) : (
          <div className="psh-tablewrap">
            <table className="psh-dtable crm-table crm-table-cartes">
              <thead><tr><th>Chantier</th><th>Client</th><th>Statut</th><th>Avancement</th><th>Début</th><th>Fin prévue</th></tr></thead>
              <tbody>
                {chantiers.map((c) => (
                  <tr key={c.id}>
                    <td className="crm-td-titre"><Lien className="obj" href={`/crm/chantiers/${c.id}`}>{c.titre}</Lien>{c.devis_numero && <span className="num"> · {c.devis_numero}</span>}
                      {c.adresse && <Lien className="crm-itineraire" href={itineraire(c.adresse)} title={`Itinéraire vers ${c.adresse}`}>Itinéraire</Lien>}</td>
                    <td data-label="Client">{c.client ?? '—'}</td>
                    <td data-label="Statut"><span className={`pill ${TON_STATUT_CHANTIER[c.statut] ?? 'muted'}`}>{LIBELLES_STATUT_CHANTIER[c.statut as StatutChantier] ?? c.statut}</span></td>
                    <td data-label="Avancement"><Avancement pct={c.avancement.pct} faites={c.avancement.faites} total={c.avancement.total} /></td>
                    <td data-label="Début" className="tnum">{dateFr(c.date_debut)}</td>
                    <td data-label="Fin prévue" className="tnum">{dateFr(c.date_fin_prevue)}{c.retard ? <span className="pill crit crm-retard">{c.retard} j</span> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="psh-panel" aria-labelledby="crm-nouveau">
        <header><h2 id="crm-nouveau">Nouveau chantier</h2></header>
        <form className="crm-form" onSubmit={creer}>
          <fieldset className="crm-choix">
            <legend className="crm-sr">Origine du chantier</legend>
            <label><input type="radio" name="crm-mode" checked={mode === 'devis'} onChange={() => setMode('devis')} disabled={!devisSignes.length} /> Depuis un devis signé</label>
            <label><input type="radio" name="crm-mode" checked={mode === 'libre'} onChange={() => setMode('libre')} /> Sans devis (dépannage)</label>
          </fieldset>
          {mode === 'devis' ? (
            devisSignes.length ? (
              <>
                <label className="crm-champ">Devis signé
                  <select required value={devisId} onChange={(e) => setDevisId(e.target.value)}>
                    <option value="">Choisir…</option>
                    {devisSignes.map((d) => (
                      <option key={d.id} value={d.id}>{[d.numero, d.objet, d.client_nom].filter(Boolean).join(' · ') || 'Devis sans objet'} — {euros(enCentimes(d.total_ttc))}</option>
                    ))}
                  </select>
                </label>
                <label className="crm-coche"><input type="checkbox" checked={taches} onChange={(e) => setTaches(e.target.checked)} /> Créer une tâche par ligne du devis (modifiables ensuite)</label>
              </>
            ) : <p className="crm-vide">Aucun devis signé sans chantier.</p>
          ) : (
            <>
              <label className="crm-champ">Nature des travaux<input required maxLength={200} value={titre} onChange={(e) => setTitre(e.target.value)} /></label>
              <label className="crm-champ">Client (facultatif)<input maxLength={200} value={client} onChange={(e) => setClient(e.target.value)} /></label>
              <p className="crm-aide">{AIDE_TEXTE_LIBRE}</p>
            </>
          )}
          {message && <p className={`crm-message${message.erreur ? ' erreur' : ''}`} role={message.erreur ? 'alert' : 'status'}>{message.texte}</p>}
          <div><button className="psh-btn primary" type="submit" disabled={envoi || (mode === 'devis' && !devisId)}>{envoi ? 'Création…' : 'Créer le chantier'}</button></div>
        </form>
      </section>
    </div>
  )
}

export function Avancement({ pct, faites, total }: { pct: number | null; faites: number; total: number }) {
  if (pct === null) return <span className="muted" title="Aucune tâche : l’avancement se calcule sur les tâches cochées.">—</span>
  return (
    <span className="crm-avancement" title={`${faites} tâche${faites > 1 ? 's' : ''} faite${faites > 1 ? 's' : ''} sur ${total}`}>
      <span className="crm-barre" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Avancement"><span style={{ width: `${pct}%` }} /></span>
      <span className="tnum">{pct} %</span>
    </span>
  )
}
