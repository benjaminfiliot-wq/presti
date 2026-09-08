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
  offre: string | null; souscrit_le: string | null; compte: boolean; tauxPct: number; taux_pct: number | null; raison: string; maj_le: string
  score: number | null
  signaux: { cle: string; sens: 'pour' | 'contre'; poids: number; detail: string; constate_le: string }[]
  confiance: string | null
  revue_le: string | null
  file: 'a_valider' | 'signales' | 'valides'
}
const FILES: { id: Ligne['file']; label: string }[] = [
  { id: 'a_valider', label: 'À valider' },
  { id: 'signales', label: 'Signalés' },
  { id: 'valides', label: 'Validés' },
]
type Reponse = { lignes: Ligne[]; resume: { total: number; comptes: number; a_20: number; a_10: number }; apporteurs: { code: string; nom: string; actif: boolean; lien: string }[]; role: 'direction' | 'lecture'; a: string }

export default function Apports({ role, signaler }: { role: 'direction' | 'lecture'; signaler: (m: { type: 'ok' | 'err'; text: string }) => void }) {
  const [d, setD] = useState<Reponse | null>(null)
  // Trois files (v11 §4.4). « Signalés » d'abord ne serait pas une bonne idée : la file par défaut est
  // celle qui demande une décision, pas celle qui inquiète.
  const [file, setFile] = useState<Ligne['file']>('a_valider')
  const [ouvert, setOuvert] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [copie, setCopie] = useState<string | null>(null)
  const [aConfirmer, setAConfirmer] = useState<{ action: string; faire: () => Promise<void> } | null>(null)
  const [maintenant] = useState(() => Date.now())

  const charger = useCallback(async () => {
    const r = await apiDirection<Reponse>('/api/controle/apports')
    if (!r.ok) { setErreur(r.data.error ?? 'Registre indisponible pour l’instant.'); return }
    setErreur(null); setD(r.data)
  }, [])
  useEffect(() => { void charger() }, [charger])

  // Les trois décisions du §4.4. « Valider » ne demande pas de motif : approuver ce qui est déjà
  // documenté n'a rien à expliquer. Contester et refuser, si — ils coûtent de l'argent à quelqu'un,
  // et il en est averti par email.
  type Decision = 'valider' | 'contester' | 'refuser'
  const LIBELLE: Record<Decision, string> = { valider: 'valider cet apport', contester: 'contester cet apport', refuser: 'refuser cet apport' }

  const changer = useCallback(async (l: Ligne, decision: Decision, motif: string) => {
    setBusy(l.id)
    try {
      const r = await apiDirection<{ message?: string }>(`/api/controle/apports/${l.id}/statut`, { method: 'POST', body: JSON.stringify({ decision, motif }) }, true)
      if (r.ok) { signaler({ type: 'ok', text: r.data.message ?? 'C’est fait.' }); void charger(); return }
      if (['reconfirmation_requise', 'expire', 'rejoue', 'portee'].includes(r.data.code ?? '')) {
        setAConfirmer({ action: LIBELLE[decision], faire: async () => { await changer(l, decision, motif) } })
        return
      }
      signaler({ type: 'err', text: r.data.error ?? 'Action refusée.' })
    } finally { setBusy(null) }
  }, [charger, signaler])

  // 0077 — la fourchette du contrat (art. 5). Benjamin décide, entre les deux, apport par apport.
  const reglerTaux = useCallback(async (l: Ligne, valeur: number | null) => {
    setBusy(l.id)
    try {
      const r = await apiDirection<{ message?: string }>('/api/controle/apports', {
        method: 'PATCH', body: JSON.stringify({ artisan_id: l.artisan.id, taux_pct: valeur }),
      }, true)
      if (r.ok) { signaler({ type: 'ok', text: r.data.message ?? 'C’est fait.' }); void charger(); return }
      if (['reconfirmation_requise', 'expire', 'rejoue', 'portee'].includes(r.data.code ?? '')) {
        setAConfirmer({ action: `régler la commission à ${valeur === null ? 'la valeur par défaut' : valeur + ' %'}`, faire: async () => { await reglerTaux(l, valeur) } })
        return
      }
      signaler({ type: 'err', text: r.data.error ?? 'Action refusée.' })
    } finally { setBusy(null) }
  }, [charger, signaler])

  function demander(l: Ligne, decision: Decision) {
    let motif = ''
    if (decision !== 'valider') {
      const saisi = window.prompt(decision === 'contester'
        ? 'Pourquoi contestez-vous cet apport ? (la commission passe à 10 %, et l’apporteur en est averti)'
        : 'Pourquoi refusez-vous cet apport ? (l’apporteur en est averti)')
      // Annuler doit ANNULER : `null` n'est pas une chaîne vide.
      if (saisi === null) return
      motif = saisi.trim()
      if (!motif) { signaler({ type: 'err', text: 'Un motif est obligatoire : il part à l’apporteur et reste au journal.' }); return }
    } else if (!window.confirm(`Valider cet apport ? La commission de ${l.tauxPct} % sera due sur ${l.artisan.nom || 'cet artisan'}.`)) return
    if (!reconfirmationValide('artisan')) { setAConfirmer({ action: LIBELLE[decision], faire: async () => { await changer(l, decision, motif) } }); return }
    void changer(l, decision, motif)
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
        <div className="dir-ligne-actions" style={{ marginBottom: '.8rem' }}>
          {FILES.map((x) => {
            const n = (d?.lignes ?? []).filter((l) => l.file === x.id).length
            return (
              <button key={x.id} type="button" className={`btn ${file === x.id ? 'btn--primary' : 'btn--ghost'}`}
                onClick={() => setFile(x.id)} data-file={x.id}>{x.label}{n ? ` ${n}` : ''}</button>
            )
          })}
        </div>
        <div className="psh-tablewrap dir-table">
          <table className="psh-dtable">
            <thead><tr><th>Artisan</th><th>Apporteur</th><th>Comment on le sait</th><th>Compte ?</th><th>Depuis</th>{role === 'direction' ? <th>Décision</th> : null}</tr></thead>
            <tbody>
              {!d ? <tr><td colSpan={6} className="muted">Chargement…</td></tr>
                : d.lignes.filter((l) => l.file === file).length === 0
                  ? <tr><td colSpan={6} className="muted" data-apports-vide>{d.lignes.length === 0 ? 'Aucun apport enregistré. Le premier viendra du lien ci-dessus.' : 'Rien dans cette file.'}</td></tr>
                : d.lignes.filter((l) => l.file === file).map((l) => (
                  <tr key={l.id} data-apport={l.statut}>
                    <td data-lab="Artisan"><b>{l.artisan.nom || 'Sans nom'}</b>{l.artisan.metier ? <small className="muted"> · {l.artisan.metier}</small> : null}</td>
                    <td data-lab="Apporteur">{l.apporteur?.nom ?? '—'}</td>
                    <td data-lab="Comment on le sait">
                      <span className={`pill ${l.statut === 'prouve' ? 'ok' : l.statut === 'retire' ? 'muted' : l.statut === 'conteste' ? 'warn' : 'info'}`}><span className="pdot" />{l.statutLisible}</span>
                      <small className="muted" style={{ display: 'block', marginTop: 4 }}>{l.preuve}</small>
                    </td>
                    <td data-lab="Compte ?">
                      {l.compte ? <span className="pill ok"><span className="pdot" />{l.tauxPct} %</span> : <span className="pill muted"><span className="pdot" />non</span>}
                      <small className="muted" style={{ display: 'block', marginTop: 4 }}>{l.raison}</small>
                      {/* Le taux affiché vient du serveur : un apport contesté montre 10 % même réglé à 20,
                          parce que c'est le contrat qui tranche, pas le réglage. */}
                      {l.compte ? (
                        <label className="apport-taux">
                          <span>Commission</span>
                          <select value={l.taux_pct ?? ''} disabled={busy === l.id}
                            onChange={(e) => reglerTaux(l, e.target.value === '' ? null : Number(e.target.value))}
                            aria-label={`Commission pour ${l.artisan.nom || 'cet artisan'}`}>
                            <option value="">par défaut</option>
                            {[10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map((n) => <option key={n} value={n}>{n} %</option>)}
                          </select>
                        </label>
                      ) : null}
                      {l.score !== null && l.statut !== 'prouve' ? (
                        <>
                          <button type="button" className="dir-dep" style={{ marginTop: 4 }} onClick={() => setOuvert(ouvert === l.id ? null : l.id)} data-signaux={l.id}>
                            Confiance : {l.confiance} ({l.score}/100) — {ouvert === l.id ? 'masquer' : 'pourquoi ?'}
                          </button>
                          {ouvert === l.id ? (
                            <ul className="sess" style={{ marginTop: 6 }}>
                              {l.signaux.length === 0 ? <li><span className="sess-txt"><small>Aucun signal : ni pour, ni contre.</small></span></li>
                                : l.signaux.map((sg) => (
                                  <li key={sg.cle}>
                                    <span className="sess-txt">
                                      <small>{sg.sens === 'pour' ? '✓' : '✗'} {sg.detail}</small>
                                    </span>
                                  </li>
                                ))}
                              <li><span className="sess-txt"><small className="muted">Ce score trie la file, il ne décide de rien. Aucun système ne prouve qu’une conversation a eu lieu hors ligne.</small></span></li>
                            </ul>
                          ) : null}
                        </>
                      ) : null}
                    </td>
                    <td data-lab="Depuis">{l.souscrit_le ? relTime(l.souscrit_le, maintenant) : '—'}</td>
                    {role === 'direction' ? (
                      <td data-lab="Actions">
                        {l.statut !== 'retire' ? (
                          <>
                            {!l.revue_le ? <button type="button" className="btn btn--primary" disabled={busy === l.id} onClick={() => demander(l, 'valider')} data-valider={l.id}>Valider</button> : null}
                            {l.statut !== 'conteste' ? <button type="button" className="btn btn--ghost" disabled={busy === l.id} onClick={() => demander(l, 'contester')}>Contester</button> : null}
                            <button type="button" className="btn btn--ghost danger" disabled={busy === l.id} onClick={() => demander(l, 'refuser')}>Refuser</button>
                            {l.revue_le ? <small className="muted" style={{ display: 'block' }}>revu {relTime(l.revue_le, maintenant)}</small> : null}
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
