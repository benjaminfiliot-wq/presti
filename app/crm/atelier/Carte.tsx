'use client'

import { useState } from 'react'
import { LIBELLES_TYPE_BATIMENT, peutValider, TYPES_BATIMENT, typeDuChantier, type TypeBat } from '@/lib/crm/carte'
import type { ChantierA } from '@/lib/crm/atelier'
import { Lien } from '../mode'

// La CARTE de l'atelier (lot 5, drapeau crmAtelierVivant, migration 0172) côté écran : le type de bâtiment d'un chantier (choisi ou
// déduit), « Valider le chantier » quand toutes ses tâches sont faites (il quitte la carte, il reste partout ailleurs) et « Remettre
// sur la carte ». Dans l'EXEMPLE et la démonstration, tout est SIMULÉ : la maquette montre l'effet, rien n'est enregistré, et on le dit.

export type QuoiCarte = { action: 'valider' | 'remettre' } | { type: TypeBat | null }
export type ActionsCarte = {
  /** Exemple ou démonstration : rien n'est écrit, l'effet est montré. */
  simule: boolean
  validationAuto: boolean
  agir: (id: string, quoi: QuoiCarte) => Promise<{ ok: boolean; texte: string }>
}

/** Le sélecteur du type de bâtiment : « Automatique · <type déduit> », puis les treize types. */
export function ChoixTypeBatiment({ valeur, deduit, onChange, disabled, id }: { valeur: TypeBat | null; deduit: TypeBat; onChange: (t: TypeBat | null) => void; disabled?: boolean; id?: string }) {
  return (
    <select id={id} data-atelier-type value={valeur ?? ''} disabled={disabled} onChange={(e) => onChange((e.target.value || null) as TypeBat | null)}>
      <option value="">{`Automatique · ${LIBELLES_TYPE_BATIMENT[deduit]}`}</option>
      {TYPES_BATIMENT.map((t) => <option key={t} value={t}>{LIBELLES_TYPE_BATIMENT[t]}</option>)}
    </select>
  )
}

/** La section « Sur la carte » du panneau d'un chantier : sa forme, et sa validation. */
export function CarteChantierPanneau({ c, actions }: { c: ChantierA; actions: ActionsCarte }) {
  const [occupe, setOccupe] = useState(false)
  const [note, setNote] = useState<{ ok: boolean; texte: string } | null>(null)
  const t = typeDuChantier({ type_batiment: c.typeBatiment, titre: c.titre, objet: c.objet })
  const deduit = typeDuChantier({ titre: c.titre, objet: c.objet }).type
  const taches = c.taches ?? null
  const validable = peutValider({ statut: c.statut, taches, retire_carte_le: c.retireCarte ?? null })
  const reste = taches ? Math.max(0, taches.total - taches.faites) : 0
  async function faire(quoi: QuoiCarte) {
    setOccupe(true); setNote(null)
    const r = await actions.agir(c.id, quoi)
    setOccupe(false); setNote(r)
  }
  return (
    <div className="atl-carte-chantier" data-atelier-carte-chantier>
      <h3 className="crm-sous">Sur la carte</h3>
      <label className="atl-metier">
        <span>Bâtiment</span>
        <ChoixTypeBatiment valeur={t.deduit ? null : t.type} deduit={deduit} disabled={occupe} onChange={(v) => void faire({ type: v })} />
      </label>
      <p className="atl-origine">{t.deduit ? 'déduit du titre et du devis' : 'choisi par vous'}</p>
      {validable ? (
        <>
          <p className="atl-role">Toutes les tâches sont faites. Validé, le chantier <b>quitte la carte</b> ; il reste dans la liste des chantiers, sa fiche, le pipeline et les factures.</p>
          <div className="crm-boutons">
            <button type="button" className="psh-btn primary" data-atelier-valider disabled={occupe} onClick={() => void faire({ action: 'valider' })}>{occupe ? 'Validation…' : 'Valider le chantier'}</button>
          </div>
        </>
      ) : c.statut !== 'annule' && (
        <p className="crm-vide" data-atelier-valider-attente>{taches && taches.total > 0
          ? `« Valider le chantier » s’offrira quand ${reste > 1 ? `les ${reste} tâches restantes seront cochées` : 'la dernière tâche sera cochée'}.`
          : '« Valider le chantier » s’offre quand ses tâches sont toutes faites (ou quand il est terminé).'}</p>
      )}
      {actions.validationAuto && <p className="atl-origine" data-atelier-auto>Validation automatique : à la dernière tâche cochée (Réglages de l’atelier).</p>}
      {note && <p className={`crm-note${note.ok ? '' : ' atl-stock-erreur'}`} role="status">{note.texte}</p>}
    </div>
  )
}

/** Le bandeau qui suit une validation : ce qui s'est passé, et le chemin du retour. */
export function BandeauValide({ titre, simule, onRemettre, onFermer, occupe }: { titre: string; simule: boolean; onRemettre: () => void; onFermer: () => void; occupe?: boolean }) {
  return (
    <div className="atl-valide" role="status" data-atelier-valide>
      <span><b>« {titre} » est validé.</b> Il quitte la carte et reste dans la liste des chantiers, sa fiche, le pipeline et les factures.{simule ? ' Exemple : rien n’est enregistré.' : ''}</span>
      <button type="button" className="psh-btn ghost" data-atelier-remettre disabled={occupe} onClick={onRemettre}>Remettre sur la carte</button>
      <Lien className="psh-btn ghost" href="/crm?vue=chantiers">Voir la liste</Lien>
      <button type="button" className="atl-arrivee-fermer" aria-label="Fermer" onClick={onFermer}>×</button>
    </div>
  )
}
