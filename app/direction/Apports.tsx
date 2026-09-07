'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiDirection, reconfirmationValide } from './client'
import Reconfirmer from './Reconfirmer'
import { relTime } from '@/lib/direction/fraicheur'

// Direction → Apports (prompt v10 §2.2 et §2.4 ; demande de Benj du 07/09 : « je veux m'assurer qu'il apporte
// des clients avec preuve »).
//
// Chaque ligne dit COMMENT on le sait, et si elle compte. Un apport prouvé l'est par le serveur : personne, pas
// même ici, ne peut transformer une déclaration en preuve — on peut seulement contester, retirer, ou joindre
// une pièce. Le lien d'apport se copie d'un clic : c'est lui qui fabrique les preuves.
type Ligne = {
  id: string
  artisan: { id: string; nom?: string | null; metier?: string | null; plan?: string | null; inscrit_le?: string }
  apporteur: { code: string; nom: string } | null
  statut: string; statutLisible: string; preuve: string; piece: string | null; motif: string | null
  offre: string | null; souscrit_le: string | null; compte: boolean; taux: number; raison: string; maj_le: string
}
type Reponse = { lignes: Ligne[]; resume: { total: number; comptes: number; a_20: number; a_10: number }; apporteurs: { code: string; nom: string; actif: boolean; lien: string }[]; role: 'direction' | 'lecture'; a: string }

export default function Apports({ role, signaler }: { role: 'direction' | 'lecture'; signaler: (m: { type: 'ok' | 'err'; text: string }) => void }) {
  const [d, setD] = useState<Reponse | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [copie, setCopie] = useState<string | null>(null)
  const [aConfirmer, setAConfirmer] = useState<{ action: string; faire: () => Promise<void> } | null>(null)
  const [maintenant] = useState(() => Date.now())

  const charger = useCallback(async () => {
    const r = await apiDirection<Reponse>('/api/direction/apports')
    if (!r.ok) { setErreur(r.data.error ?? 'Registre indisponible pour l’instant.'); return }
    setErreur(null); setD(r.data)
  }, [])
  useEffect(() => { void charger() }, [charger])

  const changer = useCallback(async (l: Ligne, statut: 'conteste' | 'retire', motif: string) => {
    setBusy(l.id)
    try {
      const r = await apiDirection<{ message?: string }>(`/api/direction/apports/${l.id}/statut`, { method: 'POST', body: JSON.stringify({ statut, motif }) }, true)
      if (r.ok) { signaler({ type: 'ok', text: r.data.message ?? 'C’est fait.' }); void charger(); return }
      if (['reconfirmation_requise', 'expire', 'rejoue', 'portee'].includes(r.data.code ?? '')) {
        setAConfirmer({ action: statut === 'conteste' ? 'contester cet apport' : 'retirer cet apport', faire: async () => { await changer(l, statut, motif) } })
        return
      }
      signaler({ type: 'err', text: r.data.error ?? 'Action refusée.' })
    } finally { setBusy(null) }
  }, [charger, signaler])

  function demander(l: Ligne, statut: 'conteste' | 'retire') {
    const motif = window.prompt(statut === 'conteste' ? 'Pourquoi contestez-vous cet apport ? (la commission passe à 10 %)' : 'Pourquoi retirez-vous cet apport du registre ?')
    if (!motif || !motif.trim()) return
    if (!reconfirmationValide('artisan')) { setAConfirmer({ action: statut === 'conteste' ? 'contester cet apport' : 'retirer cet apport', faire: async () => { await changer(l, statut, motif.trim()) } }); return }
    void changer(l, statut, motif.trim())
  }

  async function copier(lien: string) {
    try { await navigator.clipboard.writeText(lien); setCopie(lien); setTimeout(() => setCopie(null), 3000) }
    catch { signaler({ type: 'err', text: 'Copie impossible : sélectionnez le lien à la main.' }) }
  }

  return (
    <>
      <div className="tool-card" data-apports-liens>
        <h2>Le lien d’apport</h2>
        <p className="muted" style={{ margin: '0 0 .9rem' }}>
          Quand quelqu’un arrive par ce lien puis crée son compte, il entre au registre avec sa preuve : la date d’arrivée et l’empreinte posée par le serveur. C’est cette empreinte qui fait la différence entre « apporté » et « déclaré ».
        </p>
        {!d ? <p className="muted">Chargement…</p> : d.apporteurs.length === 0 ? <p className="muted">Aucun apporteur pour l’instant.</p> : (
          <ul className="sess" data-apporteurs>
            {d.apporteurs.map((a) => (
              <li key={a.code}>
                <span className="sess-txt"><b>{a.nom}{!a.actif ? <em>inactif</em> : null}</b><small><code>{a.lien}</code></small></span>
                <button type="button" className="btn btn--ghost" onClick={() => void copier(a.lien)}>{copie === a.lien ? 'Copié ✅' : 'Copier'}</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="tool-card" data-apports>
        <h2>Registre des apports</h2>
        <p className="muted" style={{ margin: '0 0 .9rem' }}>
          {d ? <>{d.resume.total} ligne{d.resume.total > 1 ? 's' : ''} · {d.resume.comptes} compte{d.resume.comptes > 1 ? 'nt' : ''} pour la commission ({d.resume.a_20} à 20 %, {d.resume.a_10} à 10 %)</> : 'Chargement…'}
        </p>
        {erreur ? <p className="notif-erreur" role="alert">{erreur}</p> : null}
        <div className="psh-tablewrap dir-table">
          <table className="psh-dtable">
            <thead><tr><th>Artisan</th><th>Apporteur</th><th>Comment on le sait</th><th>Compte ?</th><th>Depuis</th>{role === 'direction' ? <th>Actions</th> : null}</tr></thead>
            <tbody>
              {!d ? <tr><td colSpan={6} className="muted">Chargement…</td></tr>
                : d.lignes.length === 0 ? <tr><td colSpan={6} className="muted" data-apports-vide>Aucun apport enregistré. Le premier viendra du lien ci-dessus.</td></tr>
                : d.lignes.map((l) => (
                  <tr key={l.id} data-apport={l.statut}>
                    <td data-lab="Artisan"><b>{l.artisan.nom || 'Sans nom'}</b>{l.artisan.metier ? <small className="muted"> · {l.artisan.metier}</small> : null}</td>
                    <td data-lab="Apporteur">{l.apporteur?.nom ?? '—'}</td>
                    <td data-lab="Comment on le sait">
                      <span className={`pill ${l.statut === 'prouve' ? 'ok' : l.statut === 'retire' ? 'muted' : l.statut === 'conteste' ? 'warn' : 'info'}`}><span className="pdot" />{l.statutLisible}</span>
                      <small className="muted" style={{ display: 'block', marginTop: 4 }}>{l.preuve}</small>
                    </td>
                    <td data-lab="Compte ?">
                      {l.compte ? <span className="pill ok"><span className="pdot" />{Math.round(l.taux * 100)} %</span> : <span className="pill muted"><span className="pdot" />non</span>}
                      <small className="muted" style={{ display: 'block', marginTop: 4 }}>{l.raison}</small>
                    </td>
                    <td data-lab="Depuis">{l.souscrit_le ? relTime(l.souscrit_le, maintenant) : '—'}</td>
                    {role === 'direction' ? (
                      <td data-lab="Actions">
                        {l.statut !== 'retire' ? (
                          <>
                            {l.statut !== 'conteste' ? <button type="button" className="btn btn--ghost" disabled={busy === l.id} onClick={() => demander(l, 'conteste')}>Contester</button> : null}
                            <button type="button" className="btn btn--ghost danger" disabled={busy === l.id} onClick={() => demander(l, 'retire')}>Retirer</button>
                          </>
                        ) : <span className="muted">—</span>}
                      </td>
                    ) : null}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {aConfirmer ? <Reconfirmer portee="artisan" action={aConfirmer.action} onConfirme={() => { const f = aConfirmer.faire; setAConfirmer(null); void f() }} onAnnule={() => setAConfirmer(null)} /> : null}
    </>
  )
}
