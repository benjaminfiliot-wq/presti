'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { api, dateFr, type SectionProps } from './commun'

// Accès du support (v11 §5) — l'écran où la porte s'ouvre, et le seul.
//
// Trois principes tenus par la mise en page elle-même, pas par le texte :
//
//   1. OUVRIR ET REFUSER ONT LA MÊME TAILLE. Un « Refuser » en petit lien gris sous un gros bouton
//      plein n'est pas un choix, c'est un couloir. Ici les deux boutons font la même largeur.
//   2. FERMER NE DEMANDE RIEN. Pas de confirmation, pas de motif obligatoire. Une fermeture qu'on
//      rend pénible est une fermeture qui n'arrive pas.
//   3. CE QUI A ÉTÉ LU RESTE VISIBLE, longtemps après. Une trace qu'on ne montre que pendant
//      l'accès ne sert à rien : c'est après coup qu'on veut vérifier.
//
// La promesse affichée vient du serveur (`promesse`) et non d'ici : ce qui est promis à l'artisan
// et ce que le code applique doivent avoir une seule source.

type Acces = {
  id: string; element_type: string; element_titre: string | null; motif: string | null
  demande_le: string; notifie_le: string | null; ouvert_le: string | null; expire_le: string | null
  refuse_le: string | null; ferme_le: string | null; ferme_motif: string | null
  etat: 'non_notifie' | 'en_attente' | 'ouvert' | 'expire' | 'refuse' | 'ferme'
  lectures: number
}
type Lecture = { id: string; acces_id: string; vue: string; element_type: string; acteur_nom: string; lu_le: string }
type Etat = { acces: Acces[]; lectures: Lecture[]; verrou: { pose_le: string } | null; promesse: string }
/** Ce que l'artisan peut désigner en demandant de l'aide. Ses propres pièces, lues sous RLS. */
type Element = { type: 'devis' | 'facture' | 'lead'; id: string; libelle: string }

const VUES: Record<string, string> = {
  forme: 'la forme (statut, dates, nombre de lignes)',
  chiffres: 'les montants',
  photos: 'le nombre et le poids des photos',
  envoi: 'l’état d’envoi (remis, rejeté)',
}

const heure = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

export default function CarteSupport({ signaler }: { signaler: SectionProps['signaler'] }) {
  const [e, setE] = useState<Etat | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [detail, setDetail] = useState<string | null>(null)
  const [ouvrirDemande, setOuvrirDemande] = useState(false)
  const [sujet, setSujet] = useState('')
  const [message, setMessage] = useState('')
  const [element, setElement] = useState('')
  const [elements, setElements] = useState<Element[]>([])

  const charger = useCallback(async () => {
    const r = await api<Etat>('/api/securite/acces-support')
    setE(r.ok ? r.data : { acces: [], lectures: [], verrou: null, promesse: '' })
  }, [])
  useEffect(() => { charger() }, [charger])

  // Ses pièces récentes, lues sous RLS avec son propre jeton : c'est LUI qui désigne ce dont il
  // parle, et Presti ne pourra demander à regarder que ça (0075).
  useEffect(() => {
    if (!ouvrirDemande || elements.length) return
    void (async () => {
      const uid = (await supabase.auth.getUser()).data.user?.id ?? ''
      if (!uid) return
      const [d, f, l] = await Promise.all([
        supabase.from('devis').select('id, numero').eq('artisan_id', uid).order('created_at', { ascending: false }).limit(10),
        supabase.from('factures').select('id, numero').eq('artisan_id', uid).order('created_at', { ascending: false }).limit(10),
        supabase.from('leads').select('id, created_at').eq('artisan_id', uid).order('created_at', { ascending: false }).limit(10),
      ])
      setElements([
        ...(d.data ?? []).map((x) => ({ type: 'devis' as const, id: x.id, libelle: `Devis n° ${x.numero ?? '?'}` })),
        ...(f.data ?? []).map((x) => ({ type: 'facture' as const, id: x.id, libelle: `Facture n° ${x.numero ?? '?'}` })),
        ...(l.data ?? []).map((x) => ({ type: 'lead' as const, id: x.id, libelle: `Conversation du ${new Date(x.created_at).toLocaleDateString('fr-FR')}` })),
      ])
    })()
  }, [ouvrirDemande, elements.length])

  async function envoyerDemande() {
    if (busy) return
    if (message.trim().length < 10) { signaler({ type: 'err', text: 'Décrivez votre problème en quelques mots.' }); return }
    setBusy('demande')
    const el = elements.find((x) => `${x.type}:${x.id}` === element)
    const r = await api<{ message?: string; note?: string }>('/api/support/demande', {
      method: 'POST',
      body: JSON.stringify({ sujet: sujet.trim(), message: message.trim(), ...(el ? { element: { type: el.type, id: el.id } } : {}) }),
    })
    setBusy(null)
    if (!r.ok) { signaler({ type: 'err', text: r.data.error ?? 'Votre message n’est pas parti.' }); return }
    signaler({ type: 'ok', text: [r.data.message, r.data.note].filter(Boolean).join(' ') })
    setSujet(''); setMessage(''); setElement(''); setOuvrirDemande(false)
    charger()
  }

  async function decider(acces: string, decision: 'ouvrir' | 'refuser' | 'fermer', cle: string) {
    if (busy) return
    setBusy(cle)
    const r = await api<{ message?: string }>('/api/securite/acces-support', { method: 'POST', body: JSON.stringify({ acces, decision }) })
    setBusy(null)
    signaler(r.ok ? { type: 'ok', text: r.data.message ?? 'C’est fait.' } : { type: 'err', text: r.data.error ?? 'Rien n’a été fait.' })
    if (r.ok) charger()
  }

  async function verrou(pose: boolean) {
    if (busy) return
    setBusy('verrou')
    const r = await api<{ message?: string }>('/api/securite/acces-support', { method: 'POST', body: JSON.stringify({ decision: pose ? 'verrouiller' : 'deverrouiller' }) })
    setBusy(null)
    signaler(r.ok ? { type: 'ok', text: r.data.message ?? 'C’est fait.' } : { type: 'err', text: r.data.error ?? 'Rien n’a été fait.' })
    if (r.ok) charger()
  }

  if (!e) return <div className="tool-card"><h2>Accès du support</h2><p className="muted">Chargement…</p></div>

  const attente = e.acces.filter((x) => x.etat === 'en_attente')
  const ouverts = e.acces.filter((x) => x.etat === 'ouvert')
  const passes = e.acces.filter((x) => !['en_attente', 'ouvert'].includes(x.etat))
  const verrouille = !!e.verrou

  return (
    <div className="tool-card">
      <h2>Accès du support</h2>
      <p className="muted" style={{ margin: '0 0 .9rem' }}>{e.promesse || 'Un accès de support dure une heure, ne montre que la forme de l’élément, et chaque consultation est inscrite ci-dessous.'}</p>

      {/* La porte d'entrée. Sans elle, rien de ce qui suit ne peut jamais commencer : un accès de
          support exige un ticket, et c'est le seul endroit qui en crée un. */}
      {!ouvrirDemande ? (
        <button type="button" className="btn btn--ghost" style={{ width: 'auto', margin: '0 0 1rem' }} onClick={() => setOuvrirDemande(true)} data-support-demander>
          Demander de l’aide
        </button>
      ) : (
        <div className="sup-demande" style={{ marginBottom: '1rem' }}>
          <b>Demander de l’aide</b>
          <label htmlFor="sup-sujet">En deux mots</label>
          <input id="sup-sujet" value={sujet} maxLength={160} onChange={(ev) => setSujet(ev.target.value)} placeholder="Mon devis ne part pas" />
          <label htmlFor="sup-message">Ce qui se passe</label>
          <textarea id="sup-message" value={message} rows={4} onChange={(ev) => setMessage(ev.target.value)} placeholder="Décrivez ce que vous avez fait et ce qui arrive…" />
          <label htmlFor="sup-element">À propos de quoi ? (facultatif)</label>
          <select id="sup-element" value={element} onChange={(ev) => setElement(ev.target.value)}>
            <option value="">Rien en particulier</option>
            {elements.map((x) => <option key={`${x.type}:${x.id}`} value={`${x.type}:${x.id}`}>{x.libelle}</option>)}
          </select>
          <small className="muted">
            {element
              ? 'Si nous avons besoin de regarder cet élément, nous vous le demanderons — c’est vous qui ouvrez, pour une heure.'
              : 'Sans élément joint, nous ne pourrons rien demander à regarder : nous répondrons par écrit.'}
          </small>
          <div className="sup-choix">
            <button type="button" className="btn btn--primary" disabled={!!busy} onClick={envoyerDemande}>{busy === 'demande' ? '…' : 'Envoyer'}</button>
            <button type="button" className="btn btn--ghost" disabled={!!busy} onClick={() => setOuvrirDemande(false)}>Annuler</button>
          </div>
        </div>
      )}

      {verrouille && e.verrou ? (
        <div className="sup-verrou on">
          <b>Personne ne peut demander à regarder votre compte.</b>
          <span>Verrou posé le {dateFr(e.verrou.pose_le, true)}. Une demande est refusée avant même d’arriver sur cet écran.</span>
          <button type="button" className="btn btn--ghost" disabled={!!busy} onClick={() => verrou(false)}>{busy === 'verrou' ? '…' : 'Lever le verrou'}</button>
        </div>
      ) : null}

      {attente.length ? (
        <>
          <h3 className="sup-titre">{attente.length > 1 ? attente.length + ' demandes en attente' : 'Une demande en attente'}</h3>
          {attente.map((x) => (
            <div className="sup-demande" key={x.id}>
              <b>{x.element_titre || 'Un élément de votre compte'}</b>
              {x.motif ? <p className="sup-motif">« {x.motif} »</p> : null}
              <small>Demandé le {dateFr(x.demande_le, true)}. Tant que vous n’avez pas ouvert, <b>rien n’est visible</b>.</small>
              {/* Les deux gestes ont la même largeur : refuser est une réponse, pas un renoncement. */}
              <div className="sup-choix">
                <button type="button" className="btn btn--primary" disabled={!!busy} onClick={() => decider(x.id, 'ouvrir', 'o-' + x.id)}>
                  {busy === 'o-' + x.id ? '…' : 'Ouvrir une heure'}
                </button>
                <button type="button" className="btn btn--ghost" disabled={!!busy} onClick={() => decider(x.id, 'refuser', 'r-' + x.id)}>
                  {busy === 'r-' + x.id ? '…' : 'Refuser'}
                </button>
              </div>
            </div>
          ))}
        </>
      ) : null}

      {ouverts.length ? (
        <>
          <h3 className="sup-titre">Accès ouvert{ouverts.length > 1 ? 's' : ''} en ce moment</h3>
          {ouverts.map((x) => (
            <div className="sup-demande ouvert" key={x.id}>
              <b>{x.element_titre || 'Un élément de votre compte'}</b>
              <small>
                Ouvert{x.ouvert_le ? ' le ' + dateFr(x.ouvert_le, true) : ''}{x.expire_le ? ', se referme seul à ' + heure(x.expire_le) : ''}.
                {' '}{x.lectures === 0 ? 'Rien n’a encore été consulté.' : x.lectures + ' consultation' + (x.lectures > 1 ? 's' : '') + ' — le détail plus bas.'}
              </small>
              <div className="sup-choix un">
                <button type="button" className="btn btn--ghost danger" disabled={!!busy} onClick={() => decider(x.id, 'fermer', 'f-' + x.id)}>
                  {busy === 'f-' + x.id ? '…' : 'Fermer maintenant'}
                </button>
              </div>
            </div>
          ))}
        </>
      ) : null}

      {!attente.length && !ouverts.length && !verrouille ? (
        <p className="muted" data-support-vide>Aucune demande en cours. Personne ne regarde votre compte.</p>
      ) : null}

      {passes.length ? (
        <>
          <h3 className="sup-titre">Ce qui s’est passé avant</h3>
          <ul className="sess">
            {passes.map((x) => (
              <li key={x.id}>
                <span className="sess-txt">
                  <b>{x.element_titre || 'Un élément'}</b>
                  <small>
                    {x.etat === 'refuse' && x.refuse_le ? 'Refusé le ' + dateFr(x.refuse_le, true)
                      : x.etat === 'expire' && x.ouvert_le ? 'Ouvert le ' + dateFr(x.ouvert_le, true) + ', expiré seul'
                      : x.etat === 'non_notifie' ? 'Demandé le ' + dateFr(x.demande_le, true) + ' — jamais confirmé, donc jamais ouvrable'
                      : 'Fermé' + (x.ferme_le ? ' le ' + dateFr(x.ferme_le, true) : '') + (x.ferme_motif === 'artisan' ? ' par vous' : x.ferme_motif === 'horloge' ? ' par l’horloge' : x.ferme_motif === 'ticket' ? ' avec la demande d’aide' : ' par Presti')}
                    {x.lectures ? ' · ' + x.lectures + ' consultation' + (x.lectures > 1 ? 's' : '') : ' · rien de consulté'}
                  </small>
                </span>
                {x.lectures ? (
                  <button type="button" className="btn btn--ghost" onClick={() => setDetail(detail === x.id ? null : x.id)}>
                    {detail === x.id ? 'Masquer' : 'Voir'}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {/* Le journal des lectures : qui, quoi, quand. Toujours consultable, jamais effaçable. */}
      {e.lectures.length ? (
        <>
          <h3 className="sup-titre">Ce qui a été consulté</h3>
          <ul className="sup-lectures">
            {e.lectures.filter((l) => !detail || l.acces_id === detail).map((l) => (
              <li key={l.id}>
                <b>{l.acteur_nom}</b> a consulté {VUES[l.vue] ?? l.vue} · {dateFr(l.lu_le, true)}
              </li>
            ))}
          </ul>
          <p className="muted" style={{ fontSize: '.82rem', margin: '.4rem 0 0' }}>
            Cette liste part avec vos données quand vous les exportez, et personne chez Presti ne peut en retirer une ligne.
          </p>
        </>
      ) : null}

      {!verrouille ? (
        <div className="sup-verrou">
          <b>Ne plus jamais me demander</b>
          <span>Presti ne pourra plus demander à regarder quoi que ce soit. Vous garderez l’aide par message — simplement, personne ne verra votre compte. Réversible à tout moment.</span>
          <button type="button" className="btn btn--ghost" disabled={!!busy} onClick={() => verrou(true)}>{busy === 'verrou' ? '…' : 'Poser le verrou'}</button>
        </div>
      ) : null}
    </div>
  )
}
