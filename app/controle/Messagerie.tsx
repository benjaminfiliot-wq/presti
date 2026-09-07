'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiDirection, reconfirmationValide } from './client'
import Fraicheur from './Fraicheur'
import Reconfirmer from './Reconfirmer'
import { relTime } from '@/lib/direction/fraicheur'
import { NATURES, GROUPES, libelleNature, raisonDuMotif } from '@/lib/direction/natures'

// Direction → Messagerie (prompt v10 §2.3, J3) : la boîte de l'ENTREPRISE.
//
// Les emails reçus à l'adresse de Presti, les messages du formulaire « Nous écrire » (qui y arrivent
// par email), les réponses des artisans. Groupés par fil, avec un statut qu'on fait descendre.
// Ce qu'on n'y verra jamais : les conversations d'un artisan avec ses clients.
type Fil = { fil: string; sujet: string | null; correspondant: string; email: string; dernier: string; messages: number; statut: string; artisan_id: string | null; nature: string; nature_source: string; nature_motif: string | null }
type Liste = { fils: Fil[]; aTraiter: number; parNature: Record<string, number>; nature: string; configuree: boolean; role: 'direction' | 'lecture'; source: { source: string; a: string; cache: boolean }; a: string }
type Message = { id: string; sens: string; correspondant_email: string; correspondant_nom: string | null; sujet: string | null; corps: string | null; recu_le: string; statut: string; nature?: string; nature_source?: string; nature_motif?: string | null; repondre_a?: string | null }
type Detail = { fil: string; messages: Message[]; artisan: { id: string; nom: string | null; metier: string | null } | null; role: string }

const STATUTS: { id: string; label: string }[] = [
  { id: 'a_traiter', label: 'À traiter' },
  { id: 'repondu', label: 'Répondu' },
  { id: 'classe', label: 'Classé' },
  { id: 'tous', label: 'Tout' },
]

export default function Messagerie({ role, signaler, onArtisan }: { role: 'direction' | 'lecture'; signaler: (m: { type: 'ok' | 'err'; text: string }) => void; onArtisan: (id: string) => void }) {
  const [d, setD] = useState<Liste | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [filtre, setFiltre] = useState('a_traiter')
  // « toutes » par défaut : une nature est un filtre, pas un dossier. Un défaut sur une nature
  // précise retirerait le reste du courrier de la vue principale sans que personne ne le demande.
  const [nature, setNature] = useState('toutes')
  const [q, setQ] = useState('')
  const [ouvert, setOuvert] = useState<string | null>(null)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [reponse, setReponse] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [aConfirmer, setAConfirmer] = useState<{ action: string; faire: () => Promise<void> } | null>(null)
  const [maintenant] = useState(() => Date.now())

  const charger = useCallback(async (statut: string, recherche: string, nat: string) => {
    const r = await apiDirection<Liste>(`/api/controle/courriers?statut=${statut}&nature=${nat}${recherche ? `&q=${encodeURIComponent(recherche)}` : ''}`)
    if (!r.ok) { setErreur(r.data.error ?? 'Boîte indisponible pour l’instant.'); return }
    setErreur(null); setD(r.data)
  }, [])
  useEffect(() => { const t = setTimeout(() => void charger(filtre, q, nature), q ? 350 : 0); return () => clearTimeout(t) }, [filtre, q, nature, charger])

  const ouvrir = useCallback(async (fil: string) => {
    setOuvert(fil); setDetail(null); setReponse('')
    const r = await apiDirection<Detail>(`/api/controle/courriers/${encodeURIComponent(fil)}`)
    if (!r.ok) { signaler({ type: 'err', text: r.data.error ?? 'Fil indisponible.' }); setOuvert(null); return }
    setDetail(r.data)
  }, [signaler])

  const agir = useCallback(async (fil: string, corps: Record<string, unknown>, libelle: string, reconfirme: boolean) => {
    setBusy(libelle)
    try {
      const r = await apiDirection<{ message?: string }>(`/api/controle/courriers/${encodeURIComponent(fil)}/action`, { method: 'POST', body: JSON.stringify(corps) }, reconfirme)
      if (r.ok) {
        signaler({ type: 'ok', text: r.data.message ?? 'C’est fait.' })
        setReponse('')
        void charger(filtre, q, nature)
        if (ouvert) void ouvrir(ouvert)
        return
      }
      if (['reconfirmation_requise', 'expire', 'rejoue', 'portee'].includes(r.data.code ?? '')) {
        setAConfirmer({ action: libelle, faire: async () => { await agir(fil, corps, libelle, true) } })
        return
      }
      signaler({ type: 'err', text: r.data.error ?? 'Action refusée.' })
    } finally { setBusy(null) }
  }, [charger, filtre, q, nature, ouvert, ouvrir, signaler])

  async function relever() {
    setBusy('relever')
    try {
      const r = await apiDirection<{ message?: string }>('/api/controle/courriers/relever', { method: 'POST' })
      signaler(r.ok ? { type: 'ok', text: r.data.message ?? 'Boîte relevée.' } : { type: 'err', text: r.data.error ?? 'Relève impossible.' })
      if (r.ok) void charger(filtre, q, nature)
    } finally { setBusy(null) }
  }

  function repondre() {
    if (!ouvert || reponse.trim().length < 2) return
    if (!reconfirmationValide('artisan')) { setAConfirmer({ action: 'envoyer cette réponse', faire: async () => { await agir(ouvert, { action: 'repondre', texte: reponse }, 'envoyer cette réponse', true) } }); return }
    void agir(ouvert, { action: 'repondre', texte: reponse }, 'envoyer cette réponse', true)
  }

  return (
    <>
      <div className="tool-card" data-messagerie>
        <h2>Messagerie de l’entreprise</h2>
        <p className="muted" style={{ margin: '0 0 .9rem' }}>
          {d ? <>{d.aTraiter} fil{d.aTraiter > 1 ? 's' : ''} à traiter · <Fraicheur s={d.source} maintenant={maintenant} /></> : 'Chargement…'}
          <br /><small>Les emails de Presti — jamais les conversations d’un artisan avec ses clients.</small>
        </p>
        {d && !d.configuree ? <p className="notif-etat" data-non-configuree>La boîte de l’entreprise n’est pas connectée : rien à relever pour l’instant.</p> : null}
        {erreur ? <div><p className="notif-erreur" role="alert">{erreur}</p><button type="button" className="btn btn--primary" onClick={() => void charger(filtre, q, nature)}>Réessayer</button></div> : null}

        <div className="dir-ligne-actions" style={{ marginBottom: '.8rem' }}>
          {STATUTS.map((s) => (
            <button key={s.id} type="button" className={`btn ${filtre === s.id ? 'btn--primary' : 'btn--ghost'}`} onClick={() => setFiltre(s.id)} data-filtre={s.id}>{s.label}</button>
          ))}
          {role === 'direction' ? <button type="button" className="btn btn--ghost" disabled={busy === 'relever'} onClick={() => void relever()} data-relever>{busy === 'relever' ? 'Relève en cours…' : 'Relever la boîte'}</button> : null}
        </div>
        {/* Les piles, par URGENCE. Aucune n'est masquée : « Rien à faire » décrit le geste attendu,
            pas un dossier caché — du courrier qu'on ne voit plus est du courrier perdu. */}
        <div className="dir-natures" data-natures>
          <button type="button" className={`btn ${nature === 'toutes' ? 'btn--primary' : 'btn--ghost'}`} onClick={() => setNature('toutes')} data-nature="toutes">Toutes</button>
          {GROUPES.map((g) => (
            <span key={g.titre} className="dir-nature-groupe">
              <small className="muted">{g.titre}</small>
              {g.natures.map((cle) => {
                const n = d?.parNature?.[cle] ?? 0
                return (
                  <button key={cle} type="button" className={`btn ${nature === cle ? 'btn--primary' : 'btn--ghost'}`} onClick={() => setNature(cle)} data-nature={cle}>
                    {libelleNature(cle)}{n ? <span className="dir-compte">{n}</span> : null}
                  </button>
                )
              })}
            </span>
          ))}
        </div>
        <label htmlFor="dir-msg-q" className="visually-hidden">Rechercher dans la messagerie</label>
        <input id="dir-msg-q" type="search" placeholder="Chercher un sujet, une adresse, un mot…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 380, marginBottom: '.9rem' }} />

        {!d ? <p className="muted">Chargement…</p>
          : d.fils.length === 0 ? <p className="muted" data-messagerie-vide>{filtre === 'a_traiter' ? 'Rien à traiter. La boîte est à jour.' : 'Aucun message ne correspond.'}</p>
          : (
            <ul className="sess" data-fils>
              {d.fils.map((f) => (
                <li key={f.fil} data-fil={f.fil}>
                  <button type="button" className="dir-dep" onClick={() => void ouvrir(f.fil)} data-ouvrir-fil={f.fil} style={{ textAlign: 'left' }}>
                    <b>{f.sujet || '(sans objet)'}</b>
                  </button>
                  <small className="muted" style={{ display: 'block' }}>
                    {f.correspondant} · {relTime(f.dernier, maintenant)}
                    {f.messages > 1 ? ` · ${f.messages} messages` : ''}
                    {f.statut === 'a_traiter' ? <span className="pill warn" style={{ marginLeft: 6 }}><span className="pdot" />à traiter</span> : null}
                    <span className={`pill nat-${f.nature}`} style={{ marginLeft: 6 }} data-fil-nature={f.nature}>{libelleNature(f.nature)}</span>
                    {f.artisan_id ? <button type="button" className="dir-dep" style={{ marginLeft: 6 }} onClick={() => onArtisan(f.artisan_id!)}>voir l’artisan</button> : null}
                  </small>
                </li>
              ))}
            </ul>
          )}
      </div>

      {ouvert ? (
        <div className="tool-card" data-fil-ouvert={ouvert}>
          <button type="button" className="btn btn--ghost" style={{ marginBottom: '.8rem' }} onClick={() => { setOuvert(null); setDetail(null) }}>← Retour à la boîte</button>
          {!detail ? <p className="muted">Chargement du fil…</p> : (
            <>
              <h2>{detail.messages[0]?.sujet || '(sans objet)'}</h2>
              {detail.artisan ? <p className="muted" style={{ marginTop: 0 }}>Rattaché à <button type="button" className="dir-dep" onClick={() => onArtisan(detail.artisan!.id)}>{detail.artisan.nom || 'cet artisan'}</button>{detail.artisan.metier ? ` · ${detail.artisan.metier}` : ''}</p> : null}

              {(() => {
                // La raison vient du premier message REÇU du fil : c'est lui qui a été classé.
                const ref = detail.messages.find((m) => m.sens === 'recu') ?? detail.messages[0]
                if (!ref?.nature) return null
                const manuel = ref.nature_source === 'manuel'
                return (
                  <div className="dir-rangement" data-rangement={ref.nature}>
                    <p className="muted" style={{ margin: 0 }}>
                      {manuel
                        ? <>Rangé <b>à la main</b> en « {libelleNature(ref.nature)} ».</>
                        : <>Rangé automatiquement en <b>{libelleNature(ref.nature)}</b> — {raisonDuMotif(ref.nature_motif ?? null)}</>}
                    </p>
                    {ref.nature_motif === 'interne:non-repertorie' ? (
                      <p className="notif-etat" style={{ margin: '.4rem 0 0' }} data-non-repertorie>
                        Cette notification vient de Presti mais aucune règle ne la reconnaît — une alerte a peut-être été ajoutée au code sans sa règle de classement.
                      </p>
                    ) : null}
                    {ref.repondre_a ? (
                      <p className="muted" style={{ margin: '.4rem 0 0' }} data-repondre-a={ref.repondre_a}>
                        Reçu par le formulaire du site : votre réponse partira à <b>{ref.repondre_a}</b>.
                      </p>
                    ) : null}
                    {role === 'direction' ? (
                      <label style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem', marginTop: '.5rem' }}>
                        <span className="muted">Ranger plutôt en</span>
                        <select value={ref.nature} disabled={!!busy} data-changer-nature
                          onChange={(e) => { const v = e.target.value; if (v !== ref.nature && ouvert) void agir(ouvert, { action: 'classer', nature: v }, `ranger ce fil en « ${libelleNature(v)} »`, false) }}>
                          {NATURES.map((n) => <option key={n.cle} value={n.cle}>{n.libelle}</option>)}
                        </select>
                      </label>
                    ) : null}
                  </div>
                )
              })()}
              <ul className="sess" data-messages>
                {detail.messages.map((m) => (
                  <li key={m.id} data-sens={m.sens}>
                    <span className="sess-txt">
                      <b>{m.sens === 'envoye' ? 'Presti' : (m.correspondant_nom || m.correspondant_email)}</b>
                      <small>{relTime(m.recu_le, maintenant)}</small>
                      <span style={{ display: 'block', whiteSpace: 'pre-wrap', marginTop: '.4rem' }}>{m.corps || <em className="muted">(message sans texte)</em>}</span>
                    </span>
                  </li>
                ))}
              </ul>

              {role === 'direction' ? (
                <>
                  <label htmlFor="dir-reponse" style={{ display: 'block', marginTop: '1rem', fontWeight: 600 }}>Répondre</label>
                  <textarea id="dir-reponse" rows={5} value={reponse} onChange={(e) => setReponse(e.target.value)} placeholder="Votre réponse part depuis l’adresse de Presti, dans ce fil." maxLength={10000} style={{ width: '100%' }} data-reponse />
                  <div className="dir-ligne-actions">
                    <button type="button" className="btn btn--primary" disabled={!!busy || reponse.trim().length < 2} onClick={repondre} data-envoyer>{busy === 'envoyer cette réponse' ? 'Envoi…' : 'Envoyer'}</button>
                    <button type="button" className="btn btn--ghost" disabled={!!busy} onClick={() => void agir(ouvert, { action: 'classer', statut: 'classe' }, 'classer ce fil', false)} data-classer>Classer</button>
                    <button type="button" className="btn btn--ghost" disabled={!!busy} onClick={() => void agir(ouvert, { action: 'classer', statut: 'a_traiter' }, 'remettre à traiter', false)} data-a-traiter>Remettre à traiter</button>
                  </div>
                </>
              ) : <p className="muted">Lecture seule.</p>}
            </>
          )}
        </div>
      ) : null}

      {aConfirmer ? <Reconfirmer portee="artisan" action={aConfirmer.action} onConfirme={() => { const f = aConfirmer.faire; setAConfirmer(null); void f() }} onAnnule={() => setAConfirmer(null)} /> : null}
    </>
  )
}
