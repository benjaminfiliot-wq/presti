'use client'

import { useEffect, useId, useState, type FormEvent } from 'react'
import { echeancesRapides, LIBELLES_RAPPEL, messageRelanceDevis, TYPES_RAPPEL, type AFaire, type DevisARelancer, type Rappel, type TypeRappel } from '@/lib/crm/rappels'
import { AIDE_TEXTE_LIBRE, appel, dateFr, estErreur, euros } from './client'
import { Lien, useExemple } from './mode'

// Les RAPPELS et RENDEZ-VOUS de l'artisan (plan du 18/10, n°1) : poser un rappel en deux touchers sur n'importe quelle fiche,
// cocher, décaler d'un jour ; « À faire aujourd'hui » ; et la relance d'un devis resté sans réponse, préparée puis envoyée
// SEULEMENT après relecture et confirmation. Toutes les données viennent du serveur (lib/crm/vue.ts, lib/crm/rappels.ts) ; chaque
// écriture passe par appel() — refusée avant le réseau en mode exemple.

export type CibleRappel = { client: string } | { lead_id: string } | { devis_id: string } | { chantier_id: string }
type Message = { texte: string; erreur: boolean } | null

/** Le bouton « Me le rappeler » et son petit formulaire : un choix rapide (demain, dans 3 jours, lundi) ou une date, l'heure facultative. */
export function MeLeRappeler({ cible, jour, onChange, compact = false, libelle = 'Me le rappeler' }: { cible: CibleRappel; jour: string; onChange?: () => void | Promise<void>; compact?: boolean; libelle?: string }) {
  const id = useId()
  const [ouvert, setOuvert] = useState(false)
  const [type, setType] = useState<TypeRappel>('rappeler')
  const [echeance, setEcheance] = useState(echeancesRapides(jour)[0].echeance)
  const [heure, setHeure] = useState('')
  const [texte, setTexte] = useState('')
  const [occupe, setOccupe] = useState(false)
  const [message, setMessage] = useState<Message>(null)
  // Sur une carte du pipeline (compact) : d'abord les trois choix rapides seulement ; le formulaire complet sur « Autre date… ».
  const [complet, setComplet] = useState(!compact)
  async function poser(e?: FormEvent, rapide?: string) {
    e?.preventDefault()
    setOccupe(true); setMessage(null)
    const r = await appel('/api/crm/rappels', { method: 'POST', body: { ...cible, type, echeance: rapide ?? echeance, heure: heure || null, texte: texte || null } })
    setOccupe(false)
    if (!r.ok) { setMessage({ texte: r.erreur, erreur: estErreur(r) }); return }
    setMessage({ texte: `Rappel posé pour le ${dateFr(rapide ?? echeance)}${heure ? ` à ${heure}` : ''}.`, erreur: false })
    setOuvert(false); setTexte(''); setHeure('')
    await onChange?.()
  }
  return (
    <div className={`crm-rappel-poser${compact ? ' compact' : ''}`}>
      <button type="button" className="psh-btn ghost" aria-expanded={ouvert} aria-controls={`${id}-f`} onClick={() => { setOuvert(!ouvert); if (compact) setComplet(false) }}>{libelle}</button>
      {/* Les choix rapides restent dans la page, masqués (`hidden`) tant que le panneau est fermé : ouvrir et fermer ne
          crée ni ne détruit rien (18/10 : monter et démonter ce groupe sur chaque carte du pipeline faisait tomber l'onglet
          sous le juge crm-exemple-qa). L'élément visé par aria-controls existe donc toujours. */}
      {!complet && (
        <div id={`${id}-f`} className="crm-rappel-rapides" role="group" aria-label="Me le rappeler" hidden={!ouvert}>
          {echeancesRapides(jour).map((x) => <button key={x.libelle} type="button" className="psh-btn ghost" disabled={occupe} onClick={() => void poser(undefined, x.echeance)}>{x.libelle} <span className="muted tnum">{dateFr(x.echeance).slice(0, 5)}</span></button>)}
          <button type="button" className="psh-btn ghost" onClick={() => setComplet(true)}>Autre date…</button>
        </div>
      )}
      {complet && (
        <form id={`${id}-f`} className="crm-rappel-form" onSubmit={(e) => void poser(e)} aria-label="Poser un rappel" hidden={!ouvert}>
          <div className="crm-rappel-rapides" role="group" aria-label="Échéance rapide">
            {echeancesRapides(jour).map((x) => <button key={x.libelle} type="button" className="psh-btn ghost" disabled={occupe} onClick={() => void poser(undefined, x.echeance)}>{x.libelle} <span className="muted tnum">{dateFr(x.echeance).slice(0, 5)}</span></button>)}
          </div>
          <div className="crm-form-ligne">
            <label className="crm-champ">Type<select value={type} onChange={(e) => setType(e.target.value as TypeRappel)}>{TYPES_RAPPEL.map((t) => <option key={t} value={t}>{LIBELLES_RAPPEL[t]}</option>)}</select></label>
            <label className="crm-champ">Le<input type="date" required min={jour} value={echeance} onChange={(e) => setEcheance(e.target.value)} /></label>
            <label className="crm-champ">Heure (facultatif)<input type="time" value={heure} onChange={(e) => setHeure(e.target.value)} /></label>
          </div>
          <label className="crm-champ">Pour quoi faire (facultatif)<input maxLength={300} value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Ex. : rappeler pour la date du métré" aria-describedby={`${id}-aide`} /></label>
          <p className="crm-aide" id={`${id}-aide`}>{AIDE_TEXTE_LIBRE}</p>
          <div className="crm-boutons"><button type="submit" className="psh-btn primary" disabled={occupe || !echeance}>{occupe ? 'Enregistrement…' : 'Poser le rappel'}</button><button type="button" className="psh-btn ghost" onClick={() => setOuvert(false)}>Annuler</button></div>
        </form>
      )}
      {message && <p className={`crm-message${message.erreur ? ' erreur' : ''}`} role={message.erreur ? 'alert' : 'status'}>{message.texte}</p>}
    </div>
  )
}

/** Une liste de rappels : cocher (fait), décaler d'un jour, supprimer. `avecCible` : le dossier visé, avec son lien. */
export function ListeRappels({ rappels, jour, onChange, avecCible = false, vide = 'Aucun rappel.' }: { rappels: readonly Rappel[]; jour: string; onChange?: () => void | Promise<void>; avecCible?: boolean; vide?: string }) {
  const [locaux, setLocaux] = useState<Record<string, boolean>>({})
  const [message, setMessage] = useState<Message>(null)
  async function agir(r: Rappel, method: 'PATCH' | 'DELETE', body?: unknown) {
    setMessage(null)
    if (method === 'PATCH' && body && typeof body === 'object' && 'fait' in body) setLocaux((l) => ({ ...l, [r.id]: !!(body as { fait: boolean }).fait }))
    const res = await appel(`/api/crm/rappels/${r.id}`, { method, body })
    if (!res.ok) { setLocaux((l) => { const n = { ...l }; delete n[r.id]; return n }); setMessage({ texte: res.erreur, erreur: estErreur(res) }); return }
    await onChange?.()
  }
  if (!rappels.length) return <p className="crm-vide">{vide}</p>
  return (
    <>
      <ul className="crm-rappels">
        {rappels.map((r) => {
          const fait = r.id in locaux ? locaux[r.id] : !!r.fait_le
          const demain = new Date(Date.UTC(+r.echeance.slice(0, 4), +r.echeance.slice(5, 7) - 1, +r.echeance.slice(8, 10) + 1)).toISOString().slice(0, 10)
          return (
            <li key={r.id} className={`${fait ? 'fait' : ''}${r.retard > 0 && !fait ? ' retard' : ''}`}>
              <label className="crm-coche">
                <input type="checkbox" checked={fait} disabled={!!r.envoye_le} onChange={(e) => void agir(r, 'PATCH', { fait: e.target.checked })} />
                <span>
                  <b>{LIBELLES_RAPPEL[r.type as TypeRappel] ?? 'Rappel'}</b>{r.texte ? ` · ${r.texte}` : ''}
                  <span className="crm-rappel-quand tnum">{r.echeance === jour ? 'Aujourd’hui' : dateFr(r.echeance)}{r.heure ? ` · ${r.heure.slice(0, 5)}` : ''}{r.retard > 0 && !fait ? ` · ${r.retard} j de retard` : ''}{r.origine === 'systeme' ? ' · posé par Presti' : r.origine === 'assistant' ? ' · posé par l’assistant' : ''}</span>
                  {avecCible && <span className="crm-rappel-cible">{r.cible.href ? <Lien href={r.cible.href}>{r.cible.libelle}</Lien> : r.cible.libelle}</span>}
                </span>
              </label>
              {!fait && !r.envoye_le && (
                <span className="crm-actions-ligne">
                  <button type="button" className="psh-btn ghost" title="Décaler d’un jour" onClick={() => void agir(r, 'PATCH', { echeance: r.echeance < jour ? new Date(Date.UTC(+jour.slice(0, 4), +jour.slice(5, 7) - 1, +jour.slice(8, 10) + 1)).toISOString().slice(0, 10) : demain })}>+1 j</button>
                  <button type="button" className="psh-btn ghost danger" aria-label={`Supprimer le rappel « ${LIBELLES_RAPPEL[r.type as TypeRappel] ?? 'Rappel'} » du ${dateFr(r.echeance)}`} onClick={() => { if (confirm('Supprimer ce rappel ?')) void agir(r, 'DELETE') }}>×</button>
                </span>
              )}
            </li>
          )
        })}
      </ul>
      {message && <p className={`crm-message${message.erreur ? ' erreur' : ''}`} role={message.erreur ? 'alert' : 'status'}>{message.texte}</p>}
    </>
  )
}

/** Le bloc « À faire aujourd'hui » du tableau de bord : en retard et aujourd'hui, puis les 7 jours qui viennent. */
export function AFaireAujourdhui({ a, jour, disponibles, onChange }: { a: AFaire; jour: string; disponibles: boolean; onChange?: () => void | Promise<void> }) {
  const [semaine, setSemaine] = useState(false)
  return (
    <section className="psh-panel" aria-labelledby="crm-afaire">
      <header><h2 id="crm-afaire">À faire aujourd’hui</h2><span className={`tag tnum${a.enRetard.length ? ' crm-tag-retard' : ''}`}>{a.total}</span></header>
      <div className="crm-corps">
        {!disponibles ? <p className="crm-vide">Les rappels s’installent : ils apparaîtront ici dès que la mise à jour de votre espace sera terminée.</p>
          : <ListeRappels rappels={[...a.enRetard, ...a.aujourdhui]} jour={jour} onChange={onChange} avecCible vide="Rien de prévu aujourd’hui. Posez un rappel depuis une fiche ou une carte du pipeline (« Me le rappeler »)." />}
        {disponibles && a.semaine.length > 0 && (
          <>
            <button type="button" className="crm-lien-bouton psh-btn ghost" aria-expanded={semaine} onClick={() => setSemaine(!semaine)}>Les 7 prochains jours ({a.semaine.length})</button>
            {semaine && <ListeRappels rappels={a.semaine} jour={jour} onChange={onChange} avecCible />}
          </>
        )}
      </div>
    </section>
  )
}

/** Les devis à relancer (la tuile « Relances dues », rendue actionnable) : préparer le message, le relire, l'envoyer. */
export function RelancesDevis({ liste, onChange }: { liste: readonly DevisARelancer[]; onChange?: () => void | Promise<void> }) {
  const [ouvert, setOuvert] = useState<string | null>(null)
  return (
    <section className="psh-panel" aria-labelledby="crm-relances" id="crm-relances-dues">
      <header><h2 id="crm-relances">Devis à relancer</h2><span className="tag tnum">{liste.length}</span></header>
      <div className="crm-corps">
        {!liste.length ? <p className="crm-vide">Aucun devis envoyé sans réponse depuis plus de 7 jours.</p> : (
          <ul className="crm-liste">
            {liste.map((d) => (
              <li key={d.devisId} className="crm-relance">
                <span>
                  <Lien href={`/devis/${d.devisId}`}>{[d.numero ? `Devis ${d.numero}` : 'Devis', d.client].filter(Boolean).join(' · ')}</Lien>
                  <span className="muted"> · {euros(d.montant)} · {d.dateSure ? `envoyé il y a ${d.jours} j` : `émis il y a ${d.jours} j (date d’envoi inconnue)`}{d.relances ? ` · relancé ${d.relances} fois` : ''}</span>
                </span>
                <button type="button" className="psh-btn primary" aria-expanded={ouvert === d.devisId} onClick={() => setOuvert(ouvert === d.devisId ? null : d.devisId)}>Relancer</button>
                {ouvert === d.devisId && <DialogueRelance d={d} onFermer={() => setOuvert(null)} onChange={onChange} />}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

/** Préparer → relire → confirmer : rien ne part avant « Envoyer », et l'envoi demande encore une confirmation. */
export function DialogueRelance({ d, onFermer, onChange }: { d: DevisARelancer; onFermer: () => void; onChange?: () => void | Promise<void> }) {
  const id = useId()
  const devisId = d.devisId
  const exemple = useExemple()
  const [etat, setEtat] = useState<'lecture' | 'pret' | 'envoi' | 'envoye'>('lecture')
  const [texte, setTexte] = useState('')
  const [dest, setDest] = useState<string | null>(null)
  const [message, setMessage] = useState<Message>(null)
  // Préparer n'écrit rien : c'est une lecture (POST pour porter l'identifiant dans le corps). En exemple, appel() la refuse et le dit.
  useEffect(() => {
    let vivant = true
    // En exemple : le même message, préparé ici par la même fonction pure (rien n'est lu ni envoyé).
    if (exemple) { setTexte(messageRelanceDevis({ client: d.client, numero: d.numero, objet: d.objet, envoyeLe: d.envoyeLe, dateSure: d.dateSure, relances: d.relances, signature: null })); setDest(d.email); setEtat('pret'); return }
    void appel<{ message: string; destinataire: string }>('/api/crm/relances', { method: 'POST', body: { devis_id: devisId } }).then((r) => {
      if (!vivant) return
      if (!r.ok) { setMessage({ texte: r.erreur, erreur: estErreur(r) }); return }
      setTexte(r.corps.message); setDest(r.corps.destinataire); setEtat('pret')
    })
    return () => { vivant = false }
  }, [devisId, exemple, d])
  async function envoyer() {
    if (!dest || !confirm(`Envoyer cette relance par e-mail à ${dest} ?`)) return
    setEtat('envoi'); setMessage(null)
    const r = await appel<{ relances: number; prochainRappel: string | null }>('/api/crm/relances/envoyer', { method: 'POST', body: { devis_id: devisId, message: texte } })
    if (!r.ok) { setEtat('pret'); setMessage({ texte: r.erreur, erreur: estErreur(r) }); return }
    setEtat('envoye')
    setMessage({ texte: `Relance envoyée.${r.corps.prochainRappel ? ` Un rappel est posé pour le ${dateFr(r.corps.prochainRappel)} si le client ne répond pas.` : ''}`, erreur: false })
    await onChange?.()
  }
  return (
    <div className="crm-notif crm-relance-dialogue">
      {etat === 'lecture' && !message && <p className="muted" role="status">Préparation du message…</p>}
      {(etat === 'pret' || etat === 'envoi') && (
        <>
          <label className="crm-champ" htmlFor={`${id}-t`}>Message au client{dest ? ` (${dest})` : ''} — rien n’est envoyé avant « Envoyer »</label>
          <textarea id={`${id}-t`} rows={8} maxLength={4000} value={texte} onChange={(e) => setTexte(e.target.value)} aria-describedby={`${id}-a`} />
          <p className="crm-aide" id={`${id}-a`}>Sans lien : le devis est déjà chez le client. {AIDE_TEXTE_LIBRE}</p>
          <div className="crm-boutons">
            <button type="button" className="psh-btn primary" disabled={etat === 'envoi' || texte.trim().length < 10} onClick={() => void envoyer()}>{etat === 'envoi' ? 'Envoi…' : 'Envoyer'}</button>
            <button type="button" className="psh-btn ghost" onClick={onFermer}>Annuler</button>
          </div>
        </>
      )}
      {message && <p className={`crm-message${message.erreur ? ' erreur' : ''}`} role={message.erreur ? 'alert' : 'status'}>{message.texte}</p>}
      {etat === 'envoye' && <div><button type="button" className="psh-btn ghost" onClick={onFermer}>Fermer</button></div>}
    </div>
  )
}
