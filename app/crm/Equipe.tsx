'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { LIBELLES_ROLE, ROLES_MEMBRE, type RoleMembre } from '@/lib/crm/valider'
import { appel, dateFr } from './client'
import type { Membre, Vehicule } from './types'

// L'équipe et les véhicules de l'entreprise. Minimisation : un membre = un nom, un rôle, un téléphone facultatif.
export default function EquipeVue() {
  const [membres, setMembres] = useState<Membre[] | null>(null)
  const [vehicules, setVehicules] = useState<Vehicule[] | null>(null)
  const [erreur, setErreur] = useState('')
  const [message, setMessage] = useState<{ texte: string; erreur: boolean } | null>(null)

  const charger = useCallback(async () => {
    const [m, v] = await Promise.all([appel<{ membres: Membre[] }>('/api/crm/equipe'), appel<{ vehicules: Vehicule[] }>('/api/crm/vehicules')])
    if (!m.ok || !v.ok) { setErreur((!m.ok ? m.erreur : !v.ok ? v.erreur : '') || 'Lecture impossible.'); return }
    setErreur(''); setMembres(m.corps.membres); setVehicules(v.corps.vehicules)
  }, [])
  useEffect(() => { void charger() }, [charger])

  async function agir(chemin: string, method: string, body: unknown | undefined, ok: string) {
    setMessage(null)
    const r = await appel(chemin, { method, body })
    if (!r.ok) { setMessage({ texte: r.erreur, erreur: true }); return false }
    setMessage({ texte: ok, erreur: false }); await charger(); return true
  }

  if (erreur) return <div className="psh-panel"><div className="psh-empty" role="alert">{erreur}</div></div>
  if (!membres || !vehicules) return <p className="muted" role="status">Lecture de l’équipe et des véhicules…</p>
  const nomMembre = (id: string | null) => membres.find((m) => m.id === id)?.nom ?? '—'

  return (
    <div className="crm-pile">
      {message && <p className={`crm-message${message.erreur ? ' erreur' : ''}`} role={message.erreur ? 'alert' : 'status'}>{message.texte}</p>}
      <div className="crm-grille2">
        <section className="psh-panel" aria-labelledby="crm-equipe">
          <header><h2 id="crm-equipe">Équipe</h2><span className="tag">{membres.length}</span></header>
          <div className="crm-corps">
            {membres.length === 0 ? <p className="crm-vide">Personne pour l’instant. Ajoutez-vous, vos compagnons et apprentis pour les affecter aux chantiers.</p> : (
              <ul className="crm-liste">
                {membres.map((m) => (
                  <li key={m.id}>
                    <span><strong>{m.nom}</strong> · {LIBELLES_ROLE[m.role as RoleMembre] ?? m.role}{m.telephone ? ` · ${m.telephone}` : ''}{!m.actif ? ' · inactif' : ''}</span>
                    <span className="crm-actions-ligne">
                      <button type="button" className="psh-btn ghost" onClick={() => void agir(`/api/crm/equipe/${m.id}`, 'PATCH', { actif: !m.actif }, m.actif ? `${m.nom} est marqué inactif.` : `${m.nom} est de nouveau actif.`)}>{m.actif ? 'Marquer inactif' : 'Réactiver'}</button>
                      <button type="button" className="psh-btn ghost danger" onClick={() => { if (confirm(`Retirer ${m.nom} de l’équipe ? Ses tâches restent, sans personne affectée.`)) void agir(`/api/crm/equipe/${m.id}`, 'DELETE', undefined, `${m.nom} est retiré de l’équipe.`) }}>Retirer</button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <FormMembre onCreer={(b) => agir('/api/crm/equipe', 'POST', b, 'Membre ajouté.')} />
          </div>
        </section>
        <section className="psh-panel" aria-labelledby="crm-vehicules">
          <header><h2 id="crm-vehicules">Véhicules</h2><span className="tag">{vehicules.length}</span></header>
          <div className="crm-corps">
            {vehicules.length === 0 ? <p className="crm-vide">Aucun véhicule pour l’instant.</p> : (
              <ul className="crm-liste">
                {vehicules.map((v) => (
                  <li key={v.id}>
                    <span><strong>{v.nom}</strong>{v.immatriculation ? ` · ${v.immatriculation}` : ''}<br />
                      <span className="muted">Conducteur : {nomMembre(v.conducteur_id)} · CT : {dateFr(v.controle_technique_le)} · Entretien : {dateFr(v.entretien_le)}</span></span>
                    <span className="crm-actions-ligne">
                      <button type="button" className="psh-btn ghost danger" onClick={() => { if (confirm(`Supprimer ${v.nom} ? Les chantiers qui l’utilisent n’auront plus de camionnette.`)) void agir(`/api/crm/vehicules/${v.id}`, 'DELETE', undefined, `${v.nom} est supprimé.`) }}>Supprimer</button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <FormVehicule membres={membres} onCreer={(b) => agir('/api/crm/vehicules', 'POST', b, 'Véhicule ajouté.')} />
          </div>
        </section>
      </div>
    </div>
  )
}

function FormMembre({ onCreer }: { onCreer: (b: unknown) => Promise<boolean> }) {
  const [nom, setNom] = useState(''), [role, setRole] = useState<RoleMembre>('compagnon'), [tel, setTel] = useState('')
  const [envoi, setEnvoi] = useState(false)
  async function soumettre(e: FormEvent) {
    e.preventDefault(); setEnvoi(true)
    const ok = await onCreer({ nom, role, ...(tel.trim() ? { telephone: tel } : {}) })
    setEnvoi(false); if (ok) { setNom(''); setTel('') }
  }
  return (
    <form className="crm-form crm-form-ligne" onSubmit={soumettre} aria-label="Ajouter un membre">
      <label className="crm-champ">Nom<input required maxLength={120} value={nom} onChange={(e) => setNom(e.target.value)} /></label>
      <label className="crm-champ">Rôle<select value={role} onChange={(e) => setRole(e.target.value as RoleMembre)}>{ROLES_MEMBRE.map((r) => <option key={r} value={r}>{LIBELLES_ROLE[r]}</option>)}</select></label>
      <label className="crm-champ">Téléphone (facultatif)<input type="tel" maxLength={30} value={tel} onChange={(e) => setTel(e.target.value)} /></label>
      <button className="psh-btn primary" type="submit" disabled={envoi || !nom.trim()}>{envoi ? 'Ajout…' : 'Ajouter'}</button>
    </form>
  )
}

function FormVehicule({ membres, onCreer }: { membres: Membre[]; onCreer: (b: unknown) => Promise<boolean> }) {
  const [nom, setNom] = useState(''), [immat, setImmat] = useState(''), [conducteur, setConducteur] = useState(''), [ct, setCt] = useState(''), [entretien, setEntretien] = useState('')
  const [envoi, setEnvoi] = useState(false)
  async function soumettre(e: FormEvent) {
    e.preventDefault(); setEnvoi(true)
    const ok = await onCreer({ nom, ...(immat.trim() ? { immatriculation: immat } : {}), ...(conducteur ? { conducteur_id: conducteur } : {}), ...(ct ? { controle_technique_le: ct } : {}), ...(entretien ? { entretien_le: entretien } : {}) })
    setEnvoi(false); if (ok) { setNom(''); setImmat(''); setConducteur(''); setCt(''); setEntretien('') }
  }
  return (
    <form className="crm-form crm-form-ligne" onSubmit={soumettre} aria-label="Ajouter un véhicule">
      <label className="crm-champ">Nom<input required maxLength={80} placeholder="Camionnette 1" value={nom} onChange={(e) => setNom(e.target.value)} /></label>
      <label className="crm-champ">Immatriculation<input maxLength={20} value={immat} onChange={(e) => setImmat(e.target.value)} /></label>
      <label className="crm-champ">Conducteur<select value={conducteur} onChange={(e) => setConducteur(e.target.value)}><option value="">—</option>{membres.filter((m) => m.actif).map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}</select></label>
      <label className="crm-champ">Contrôle technique<input type="date" value={ct} onChange={(e) => setCt(e.target.value)} /></label>
      <label className="crm-champ">Entretien<input type="date" value={entretien} onChange={(e) => setEntretien(e.target.value)} /></label>
      <button className="psh-btn primary" type="submit" disabled={envoi || !nom.trim()}>{envoi ? 'Ajout…' : 'Ajouter'}</button>
    </form>
  )
}
