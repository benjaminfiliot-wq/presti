'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiDirection, reconfirmationValide } from './client'
import Reconfirmer from './Reconfirmer'
import { relTime } from '@/lib/direction/fraicheur'

// Poste de contrôle → Réglages (prompt v11 §3, J6).
//
// Ce qui se règle ici : les valeurs qui changent par décret ou par décision — seuils de TVA, taux
// URSSAF, alerte de budget. Et les rôles de l'équipe.
//
// Ce qui NE se règle PAS ici, et c'est écrit à l'écran : les drapeaux de fonctionnalité. Un drapeau
// suppose une migration collée et du code déployé ; le lever depuis un bouton ferait apparaître un
// espace vide ou des 503 sans que rien ne prévienne. Ils se lèvent par un commit, relu et versionné.
// L'écran les montre pour qu'on sache où on en est — c'est déjà utile.
type Reglage = { cle: string; valeur: unknown; description: string | null; maj_le: string; modifiable: boolean; libelle?: string; type?: string; unite?: string; options?: string[]; min?: number; max?: number }
type Connecte = { cle: string; nom: string; configure: boolean; detail: string | null }
type Membre = { id: string; nom: string | null; email: string | null; roleInterne: string | null; roleCentre: string | null }
type Data = { reglages: Reglage[]; connectes: Connecte[]; equipe: Membre[]; drapeaux: { cle: string; actif: boolean }[]; drapeauxLecture: string; role: string; a: string }

export default function Reglages({ role, signaler }: { role: 'direction' | 'lecture'; signaler: (m: { type: 'ok' | 'err'; text: string }) => void }) {
  const [d, setD] = useState<Data | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [aConfirmer, setAConfirmer] = useState<{ action: string; faire: () => Promise<void> } | null>(null)
  const [maintenant] = useState(() => Date.now())

  const charger = useCallback(async () => {
    const r = await apiDirection<Data>('/api/controle/reglages')
    if (!r.ok) { setErreur(r.data.error ?? 'Réglages indisponibles pour l’instant.'); return }
    setErreur(null); setD(r.data)
  }, [])
  useEffect(() => { void charger() }, [charger])

  const agir = useCallback(async (corps: Record<string, unknown>, libelle: string) => {
    setBusy(libelle)
    try {
      const r = await apiDirection<{ message?: string }>('/api/controle/reglages', { method: 'POST', body: JSON.stringify(corps) }, true)
      if (r.ok) { signaler({ type: 'ok', text: r.data.message ?? 'C’est fait.' }); void charger(); return }
      if (['reconfirmation_requise', 'expire', 'rejoue', 'portee'].includes(r.data.code ?? '')) {
        setAConfirmer({ action: libelle, faire: async () => { await agir(corps, libelle) } }); return
      }
      signaler({ type: 'err', text: r.data.error ?? 'Action refusée.' })
    } finally { setBusy(null) }
  }, [charger, signaler])

  function demander(corps: Record<string, unknown>, libelle: string) {
    if (!reconfirmationValide('reglages')) { setAConfirmer({ action: libelle, faire: async () => { await agir(corps, libelle) } }); return }
    void agir(corps, libelle)
  }

  function modifier(r: Reglage) {
    const actuel = typeof r.valeur === 'string' ? r.valeur : String(r.valeur ?? '')
    const q = r.options?.length
      ? `${r.libelle ?? r.cle} ? (${r.options.join(' · ')})`
      : `${r.libelle ?? r.cle} ?${r.unite ? ` (en ${r.unite})` : ''}${r.min !== undefined ? ` — entre ${r.min} et ${r.max}` : ''}`
    const v = window.prompt(q, actuel)
    if (v === null) return
    if (!v.trim()) { signaler({ type: 'err', text: 'Valeur vide.' }); return }
    demander({ action: 'reglage', cle: r.cle, valeur: v.trim() }, `modifier « ${r.libelle ?? r.cle} »`)
  }

  function changerRole(m: Membre) {
    const cible = m.roleInterne === 'partenaire' ? 'fondateur' : 'partenaire'
    const texte = cible === 'partenaire'
      ? `Passer ${m.nom ?? 'cette personne'} en PARTENAIRE ?\n\nElle perdra : les actions sur un artisan, la comptabilité, la santé, la sécurité, les réglages, et l’accès aux devis et factures des artisans.`
      : `Passer ${m.nom ?? 'cette personne'} en FONDATEUR ?\n\nElle aura accès à TOUT : la comptabilité, les actions sur les artisans, les réglages, et les données que les artisans confient à Presti.`
    if (!window.confirm(texte)) return
    demander({ action: 'role', id: m.id, role: cible }, `changer le rôle de ${m.nom ?? 'cette personne'}`)
  }

  return (
    <>
      {erreur ? <div className="tool-card"><p className="notif-erreur" role="alert">{erreur}</p><button type="button" className="btn btn--primary" onClick={() => void charger()}>Réessayer</button></div> : null}

      <div className="tool-card" data-equipe>
        <h2>L’équipe</h2>
        {!d ? <p className="muted">Chargement…</p> : (
          <ul className="sess">
            {d.equipe.map((m) => (
              <li key={m.id} data-membre={m.id}>
                <span className="sess-txt">
                  <b>{m.nom || m.email}</b>
                  <small>
                    {m.roleInterne === 'partenaire' ? 'Partenaire — ses apports, son relevé, la lecture des clients, ses fils de messagerie'
                      : m.roleInterne === 'fondateur' ? 'Fondateur — accès complet'
                      : 'Sans rôle d’entreprise'}
                  </small>
                </span>
                {role === 'direction' && d.equipe.length > 1 ? (
                  <button type="button" className="btn btn--ghost" disabled={!!busy} onClick={() => changerRole(m)} data-role={m.id}>
                    {m.roleInterne === 'partenaire' ? 'Passer fondateur' : 'Passer partenaire'}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="tool-card" data-reglages>
        <h2>Valeurs</h2>
        <p className="muted" style={{ margin: '0 0 .8rem' }}>Seuils et taux. Ils changent par décret ou par décision : ni l’un ni l’autre ne devrait demander un déploiement.</p>
        {!d ? <p className="muted">Chargement…</p> : (
          <ul className="dir-controles">
            {d.reglages.map((r) => (
              <li key={r.cle} data-reglage={r.cle}>
                <span>
                  <b>{r.libelle ?? r.cle}</b>
                  {r.description ? <><br /><small className="muted">{r.description}</small></> : null}
                </span>
                <span className="dir-src">
                  {typeof r.valeur === 'number' && r.cle.endsWith('_cents') ? `${(r.valeur / 100).toLocaleString('fr-FR')} €` : String(r.valeur)}
                  {r.unite && !r.cle.endsWith('_cents') ? ` ${r.unite}` : ''}
                  {r.maj_le ? <> · {relTime(r.maj_le, maintenant)}</> : null}
                </span>
                {role === 'direction' && r.modifiable ? <button type="button" className="btn btn--ghost" disabled={!!busy} onClick={() => modifier(r)}>Modifier</button> : <span />}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="tool-card" data-connectes>
        <h2>Comptes connectés</h2>
        <p className="muted" style={{ margin: '0 0 .8rem' }}>On dit si la configuration existe, jamais ce qu’elle contient : une clé lisible depuis un écran est une clé qui finit par fuiter.</p>
        {!d ? <p className="muted">Chargement…</p> : (
          <ul className="dir-controles">
            {d.connectes.map((c) => (
              <li key={c.cle} data-connecte={c.cle}>
                <span className={`pill ${c.configure ? 'ok' : 'warn'}`}><span className="pdot" />{c.configure ? 'branché' : 'absent'}</span>
                <span><b>{c.nom}</b>{c.detail ? <small className="muted"> · {c.detail}</small> : null}</span>
                <span />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="tool-card" data-drapeaux>
        <h2>Fonctionnalités</h2>
        <p className="muted" style={{ margin: '0 0 .8rem' }}>{d?.drapeauxLecture ?? 'En lecture seule.'}</p>
        {!d ? <p className="muted">Chargement…</p> : (
          <div className="dir-ligne-actions">
            {d.drapeaux.map((f) => (
              <span key={f.cle} className={`pill ${f.actif ? 'ok' : ''}`} data-drapeau={f.cle}>
                <span className="pdot" />{f.cle}
              </span>
            ))}
          </div>
        )}
      </div>

      {aConfirmer ? <Reconfirmer portee="reglages" action={aConfirmer.action} onConfirme={() => { const f = aConfirmer.faire; setAConfirmer(null); void f() }} onAnnule={() => setAConfirmer(null)} /> : null}
    </>
  )
}
