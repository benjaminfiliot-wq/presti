'use client'

import { useEffect, useId, useState } from 'react'
import type { Rappel } from '@/lib/crm/rappels'
import {
  DESCRIPTION_VARIABLES_APRES, equipementDe, LIEN_AVIS_AUTORISE, PIED_APRES, remplirApres, REGLAGES_APRES_PAR_DEFAUT, sujetApres,
  TEXTES_APRES_PAR_DEFAUT, VARIABLES_APRES, type GenreApres, type ReglagesApres,
} from '@/lib/apresChantier'
import { appel, dateFr, estErreur } from './client'
import { useExemple } from './mode'

// L'APRÈS-CHANTIER dans la fiche d'un chantier (plan du 18/10, n°7, drapeau crmApresChantier) : les deux envois (« Demander un
// avis », « Proposer l'entretien »), désactivés par défaut et réglés une fois pour TOUS les chantiers ; puis, pour ce chantier,
// les rappels posés par le passage quotidien, chacun avec « Préparer le message ». Rien ne part sans « Envoyer » et une
// confirmation. En exemple : réglages et message montrés, rien n'est lu ni envoyé (appel() refuse les écritures).
type Message = { texte: string; erreur: boolean } | null
const REGLAGES_EXEMPLE: ReglagesApres = { avis: true, entretien: true, texte_avis: null, texte_entretien: null, actif_depuis: '2026-09-01T08:00:00Z' }
const GENRE_DE: Record<string, GenreApres> = { demande_avis: 'avis', entretien: 'entretien' }

export default function ApresChantier({ chantier, rappels, termine, onChange }: {
  chantier: { id: string; titre: string; client: string | null; textes: readonly (string | null)[] }
  rappels: readonly Rappel[]; termine: boolean; onChange?: () => void | Promise<void>
}) {
  const exemple = useExemple()
  const [reglages, setReglages] = useState<ReglagesApres | null>(exemple ? REGLAGES_EXEMPLE : null)
  const [indispo, setIndispo] = useState('')
  const [ouvert, setOuvert] = useState<string | null>(null)
  useEffect(() => {
    if (exemple) return
    let vivant = true
    void appel<{ reglages: ReglagesApres }>('/api/crm/apres-chantier').then((r) => {
      if (!vivant) return
      if (!r.ok) { setIndispo(r.erreur); return }
      setReglages(r.corps.reglages ?? REGLAGES_APRES_PAR_DEFAUT)
    })
    return () => { vivant = false }
  }, [exemple])
  const miens = rappels.filter((r) => r.type in GENRE_DE)
  const eq = equipementDe([chantier.titre, ...chantier.textes])
  return (
    <section className="psh-panel crm-apres" aria-labelledby="crm-apres-titre">
      <header><h2 id="crm-apres-titre">Après le chantier</h2></header>
      <div className="crm-corps">
        {indispo ? <p className="crm-vide">{indispo}</p> : !reglages ? <p className="muted" role="status">Lecture des réglages…</p> : (
          <>
            <ReglagesApresChantier reglages={reglages} onEnregistre={setReglages} />
            <ul className="crm-apres-etat">
              <li><b>Demande d’avis</b> · {!reglages.avis ? 'désactivée' : termine ? 'proposée 2 jours après la fin du chantier' : 'proposée 2 jours après la fin, quand le chantier sera terminé'}</li>
              <li><b>Entretien</b> · {!reglages.entretien ? 'désactivé' : eq ? `proposé avant la date anniversaire (${eq.nom})` : 'rien à entretenir repéré sur ce chantier (chaudière, pompe à chaleur, conduit de fumée)'}</li>
            </ul>
            {miens.length > 0 && (
              <ul className="crm-apres-liste">
                {miens.map((r) => (
                  <li key={r.id} className={r.envoye_le ? 'fait' : r.retard > 0 ? 'retard' : ''}>
                    <span><b>{r.type === 'demande_avis' ? 'Demande d’avis' : 'Entretien'}</b> · {r.envoye_le ? `envoyé le ${dateFr(r.envoye_le)}` : `à partir du ${dateFr(r.echeance)}`}</span>
                    {!r.envoye_le && !r.fait_le && (
                      <button type="button" className="psh-btn ghost" aria-expanded={ouvert === r.id} onClick={() => setOuvert(ouvert === r.id ? null : r.id)}>Préparer le message</button>
                    )}
                    {ouvert === r.id && <DialogueApres rappel={r} genre={GENRE_DE[r.type]} chantier={chantier} reglages={reglages} onFermer={() => setOuvert(null)} onChange={onChange} />}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </section>
  )
}

function ReglagesApresChantier({ reglages, onEnregistre }: { reglages: ReglagesApres; onEnregistre: (r: ReglagesApres) => void }) {
  const id = useId()
  const [r, setR] = useState(reglages)
  const [occupe, setOccupe] = useState(false)
  const [message, setMessage] = useState<Message>(null)
  async function enregistrer(suivant: ReglagesApres) {
    setR(suivant); setOccupe(true); setMessage(null)
    const res = await appel<{ reglages: ReglagesApres }>('/api/crm/apres-chantier', { method: 'PUT', body: { avis: suivant.avis, entretien: suivant.entretien, texte_avis: suivant.texte_avis, texte_entretien: suivant.texte_entretien } })
    setOccupe(false)
    if (!res.ok) { setR(reglages); setMessage({ texte: res.erreur, erreur: estErreur(res) }); return }
    onEnregistre(res.corps.reglages)
    setMessage({ texte: 'Réglage enregistré pour tous vos chantiers.', erreur: false })
  }
  return (
    <div className="crm-apres-reglages">
      <p className="crm-aide">Pour tous vos chantiers. Rien ne part tout seul : Presti vous le rappelle, vous relisez, vous envoyez.</p>
      <label className="crm-coche"><input type="checkbox" checked={r.avis} disabled={occupe} onChange={(e) => void enregistrer({ ...r, avis: e.target.checked })} /><span>Demander un avis au client, 2 jours après la fin du chantier</span></label>
      <label className="crm-coche"><input type="checkbox" checked={r.entretien} disabled={occupe} onChange={(e) => void enregistrer({ ...r, entretien: e.target.checked })} /><span>Proposer l’entretien d’une chaudière, d’une pompe à chaleur ou d’un conduit, avant la date anniversaire</span></label>
      <details className="crm-apres-textes">
        <summary>Modifier les textes</summary>
        {(['avis', 'entretien'] as const).map((g) => {
          const cle = g === 'avis' ? 'texte_avis' : 'texte_entretien'
          return (
            <label key={g} className="crm-champ" htmlFor={`${id}-${g}`}>{g === 'avis' ? 'Demande d’avis' : 'Entretien'}
              <textarea id={`${id}-${g}`} rows={6} maxLength={1500} defaultValue={r[cle] ?? TEXTES_APRES_PAR_DEFAUT[g]} aria-describedby={`${id}-v`}
                onBlur={(e) => { const v = e.target.value.trim(); const neuf = v === TEXTES_APRES_PAR_DEFAUT[g] ? null : v || null; if (neuf !== r[cle]) void enregistrer({ ...r, [cle]: neuf }) }} />
            </label>
          )
        })}
        <p className="crm-aide" id={`${id}-v`}>Variables : {VARIABLES_APRES.map((v) => `{${v}} (${DESCRIPTION_VARIABLES_APRES[v]})`).join(', ')}. Pas de lien dans le texte{LIEN_AVIS_AUTORISE ? '' : ' (le client retrouve votre fiche d’avis par votre nom)'}.</p>
      </details>
      {message && <p className={`crm-message${message.erreur ? ' erreur' : ''}`} role={message.erreur ? 'alert' : 'status'}>{message.texte}</p>}
    </div>
  )
}

function DialogueApres({ rappel, genre, chantier, reglages, onFermer, onChange }: {
  rappel: Rappel; genre: GenreApres; chantier: { titre: string; client: string | null; textes: readonly (string | null)[] }; reglages: ReglagesApres
  onFermer: () => void; onChange?: () => void | Promise<void>
}) {
  const id = useId()
  const exemple = useExemple()
  // En exemple : le même texte, rempli ici par la même fonction pure (rien n'est lu ni envoyé), calculé une fois à l'ouverture.
  const [initial] = useState(() => {
    if (!exemple) return null
    const eq = equipementDe([chantier.titre, ...chantier.textes])
    const modele = (genre === 'avis' ? reglages.texte_avis : reglages.texte_entretien) ?? TEXTES_APRES_PAR_DEFAUT[genre]
    return { texte: remplirApres(modele, { client: chantier.client ?? 'Madame, Monsieur', chantier: chantier.titre, artisan: 'Votre entreprise', equipement: eq?.nom ?? 'installation' }), sujet: sujetApres(genre, chantier.titre, eq?.nom ?? null) }
  })
  const [etat, setEtat] = useState<'lecture' | 'pret' | 'envoi' | 'envoye'>(initial ? 'pret' : 'lecture')
  const [texte, setTexte] = useState(initial?.texte ?? '')
  const [dest, setDest] = useState<string | null>(initial ? 'l’adresse du client' : null)
  const [sujet, setSujet] = useState(initial?.sujet ?? '')
  const [avert, setAvert] = useState<string[]>([])
  const [envoyable, setEnvoyable] = useState(!!initial)
  const [message, setMessage] = useState<Message>(null)
  // Préparer n'écrit rien (GET). Relu seulement si le rappel change : les modifications de l'artisan ne sont jamais écrasées.
  useEffect(() => {
    if (exemple) return
    let vivant = true
    void appel<{ texte: string; destinataire: string | null; sujet: string; avertissements: string[]; envoyable: boolean }>(`/api/crm/apres-chantier/message?rappel_id=${encodeURIComponent(rappel.id)}`).then((r) => {
      if (!vivant) return
      if (!r.ok) { setMessage({ texte: r.erreur, erreur: estErreur(r) }); return }
      setTexte(r.corps.texte); setDest(r.corps.destinataire); setSujet(r.corps.sujet); setAvert(r.corps.avertissements); setEnvoyable(r.corps.envoyable); setEtat('pret')
    })
    return () => { vivant = false }
  }, [rappel.id, exemple])
  async function envoyer() {
    if (!dest || !confirm(`Envoyer ce message par e-mail à ${dest} ?`)) return
    setEtat('envoi'); setMessage(null)
    const r = await appel('/api/crm/apres-chantier/message', { method: 'POST', body: { rappel_id: rappel.id, message: texte } })
    if (!r.ok) { setEtat('pret'); setMessage({ texte: r.erreur, erreur: estErreur(r) }); return }
    setEtat('envoye'); setMessage({ texte: 'Message envoyé.', erreur: false })
    await onChange?.()
  }
  return (
    <div className="crm-notif crm-relance-dialogue">
      {etat === 'lecture' && !message && <p className="muted" role="status">Préparation du message…</p>}
      {(etat === 'pret' || etat === 'envoi') && (
        <>
          {avert.map((a) => <p key={a} className="crm-message erreur" role="alert">{a}</p>)}
          <p className="crm-aide">Objet : {sujet}</p>
          <label className="crm-champ" htmlFor={`${id}-t`}>Message au client{dest ? ` (${dest})` : ''} — rien n’est envoyé avant « Envoyer »</label>
          <textarea id={`${id}-t`} rows={9} maxLength={1500} value={texte} onChange={(e) => setTexte(e.target.value)} aria-describedby={`${id}-p`} />
          <p className="crm-aide" id={`${id}-p`}>Ajouté en bas du message : « {PIED_APRES} » Sans lien, sans pièce jointe ; la réponse du client arrive dans votre boîte.</p>
          <div className="crm-boutons">
            <button type="button" className="psh-btn primary" disabled={!envoyable || etat === 'envoi' || texte.trim().length < 20} onClick={() => void envoyer()}>{etat === 'envoi' ? 'Envoi…' : 'Envoyer'}</button>
            <button type="button" className="psh-btn ghost" onClick={onFermer}>Annuler</button>
          </div>
        </>
      )}
      {message && <p className={`crm-message${message.erreur ? ' erreur' : ''}`} role={message.erreur ? 'alert' : 'status'}>{message.texte}</p>}
    </div>
  )
}
