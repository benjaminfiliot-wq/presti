'use client'

import { useCallback, useEffect, useState } from 'react'
import { peut, messageVerrou } from '@/lib/plans'
import {
  DELAI_ANNULATION_MIN, LIBELLE_TYPE, PLAFOND_AUTO_JOUR, TYPES_PILOTE, texteDecompte,
  type LigneFile, type ReglagesPilote, type TypePilote,
} from '@/lib/pilote/regles'
import { api, dateFr, type SectionProps } from './commun'

// PILOTE AUTOMATIQUE (21/10/2026, offre Signature, drapeau piloteAutomatique) : l'artisan choisit, type par type, ce qui part SEUL
// après un délai d'annulation de 10 minutes. La liste « Partira dans … » et le bouton « Annuler » sont ici (et dans le poste des
// assistants du CRM). Les garde-fous ne sont pas des réglages : ils sont écrits pour être lus, pas pour être décochés.
type Etat = { reglages: ReglagesPilote; attente: LigneFile[]; recentes: LigneFile[] }
const LIBELLE_STATUT: Record<string, string> = { partie: 'Partie', annulee: 'Annulée', manuel: 'À valider à la main', echec: 'Échec', en_cours: 'En cours d’envoi', a_partir: 'En attente' }

export default function SectionPilote({ a, signaler }: SectionProps) {
  const plan = a.is_founder ? 'business' : a.plan
  const ouvert = peut(plan, 'assistant.pilote')
  const [etat, setEtat] = useState<Etat | null>(null)
  const [indispo, setIndispo] = useState<string | null>(null)
  const [maintenant, setMaintenant] = useState(() => new Date())
  const [occupe, setOccupe] = useState(false)

  const charger = useCallback(async () => {
    const r = await api<Etat>('/api/pilote/file')
    if (!r.ok) { setIndispo(r.data.error ?? 'Le pilote automatique est indisponible pour l’instant.'); return }
    setIndispo(null); setEtat({ reglages: r.data.reglages, attente: r.data.attente ?? [], recentes: r.data.recentes ?? [] })
  }, [])
  // F1 (audit du 21/10) : même rétrogradé hors Signature, l'artisan VOIT sa file et peut l'annuler ou couper le pilote.
  useEffect(() => { void charger() }, [charger])
  // Le décompte « Partira dans … » avance tout seul ; la file se relit toutes les 30 s.
  useEffect(() => {
    const t1 = setInterval(() => setMaintenant(new Date()), 15_000)
    const t2 = setInterval(() => void charger(), 30_000)
    return () => { clearInterval(t1); clearInterval(t2) }
  }, [charger])

  async function enregistrer(r: ReglagesPilote) {
    setOccupe(true)
    const rep = await api<{ reglages: ReglagesPilote; annulees: number }>('/api/pilote/reglages', { method: 'PUT', body: JSON.stringify(r) })
    setOccupe(false)
    if (!rep.ok) { signaler({ type: 'err', text: rep.data.error ?? 'Réglages non enregistrés.' }); return }
    signaler({ type: 'ok', text: rep.data.annulees ? `Enregistré. ${rep.data.annulees} action(s) en attente annulée(s) : elles restent à valider à la main.` : 'Enregistré.' })
    await charger()
  }
  async function annuler(id: string) {
    const rep = await api('/api/pilote/file', { method: 'POST', body: JSON.stringify({ id, decision: 'annuler' }) })
    if (!rep.ok) signaler({ type: 'err', text: rep.data.error ?? 'Annulation impossible.' })
    else signaler({ type: 'ok', text: 'Annulée : elle ne partira pas. Elle reste à valider à la main.' })
    await charger()
  }

  const r = etat?.reglages
  // Hors Signature : une bannière vers les offres ; seul « couper » reste possible (activer, cocher un type : Signature).
  if (!ouvert && (!r || (!r.actif && !(etat?.attente.length)))) {
    return (
      <div className="tool-card" id="pilote">
        <h2>Pilote automatique</h2>
        <p className="muted">Ce que vous choisissez part seul, après {DELAI_ANNULATION_MIN} minutes pour annuler. {messageVerrou('assistant.pilote')}</p>
        <a className="btn" href="/abonnement">Voir les offres</a>
      </div>
    )
  }
  return (
    <div className="tool-card" id="pilote">
      <h2>Pilote automatique</h2>
      <p className="muted">Ce qui attend aujourd’hui votre validation peut partir seul : vous êtes prévenu, et vous avez <strong>{DELAI_ANNULATION_MIN} minutes</strong> pour l’annuler.</p>
      {!ouvert && <p className="muted">{messageVerrou('assistant.pilote')} Vous pouvez encore couper le pilote et annuler ce qui attend. <a href="/abonnement">Voir les offres</a></p>}
      {indispo ? <p className="muted">{indispo}</p> : !r ? <p className="muted">Chargement…</p> : (
        <>
          <label className="param-ligne">
            <input type="checkbox" checked={r.actif} disabled={occupe || (!ouvert && !r.actif)} onChange={(e) => void enregistrer({ ...r, actif: e.target.checked })} />
            <span><b>{r.actif ? 'Pilote activé' : 'Pilote coupé'}</b><small>{r.actif ? 'Le couper annule tout ce qui attend, immédiatement.' : 'Rien ne part sans votre clic.'}</small></span>
          </label>
          <fieldset disabled={!r.actif || occupe || !ouvert} className="param-groupe">
            <legend>Ce qui part seul</legend>
            {TYPES_PILOTE.map((t: TypePilote) => (
              <label key={t} className="param-ligne">
                <input type="checkbox" checked={r.types[t] === true} onChange={(e) => void enregistrer({ ...r, types: { ...r.types, [t]: e.target.checked } })} />
                <span><b>{LIBELLE_TYPE[t].label}</b><small>{LIBELLE_TYPE[t].detail}</small></span>
              </label>
            ))}
          </fieldset>
          <div className="param-note" role="note">
            <b>Toujours vrai, quel que soit le réglage :</b>
            <ul>
              <li>jamais un prix qui ne vient pas de vos tarifs ou de vous : un devis avec une ligne estimée reste à valider à la main ;</li>
              <li>jamais un paiement, un encaissement, un remboursement ni une facture émise ;</li>
              <li>au plus {PLAFOND_AUTO_JOUR} envois automatiques par jour ;</li>
              <li>rien ne part pendant une pause, ni deux fois ; tout est inscrit ci-dessous.</li>
            </ul>
          </div>
          <h3>Partira bientôt</h3>
          {etat.attente.length === 0 ? <p className="muted">Rien en attente.</p> : (
            <ul className="param-liste">
              {etat.attente.map((l) => (
                <li key={l.id}>
                  <span><b>{l.libelle}</b><small>{LIBELLE_TYPE[l.type]?.label} · {l.statut === 'en_cours' ? 'En cours d’envoi' : texteDecompte(l.part_le, maintenant)}</small></span>
                  {l.statut === 'a_partir' && <button type="button" className="btn ghost" onClick={() => void annuler(l.id)} aria-label={`Annuler : ${l.libelle}`}>Annuler</button>}
                </li>
              ))}
            </ul>
          )}
          <h3>Journal</h3>
          {etat.recentes.length === 0 ? <p className="muted">Aucune action automatique pour l’instant.</p> : (
            <ul className="param-liste">
              {etat.recentes.map((l) => (
                <li key={l.id}><span><b>{l.libelle}</b><small>{LIBELLE_STATUT[l.statut] ?? l.statut}{l.traite_le ? ` · ${dateFr(l.traite_le, true)}` : ''}{l.motif ? ` · ${l.motif}` : ''}</small></span></li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
