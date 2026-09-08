'use client'

import { useCallback, useEffect, useState } from 'react'
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

  const charger = useCallback(async () => {
    const r = await api<Etat>('/api/securite/acces-support')
    setE(r.ok ? r.data : { acces: [], lectures: [], verrou: null, promesse: '' })
  }, [])
  useEffect(() => { charger() }, [charger])

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
