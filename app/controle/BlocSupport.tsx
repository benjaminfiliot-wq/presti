'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiDirection } from './client'
import { relTime } from '@/lib/direction/fraicheur'

// Poste de contrôle → fiche d'un artisan → le bloc « Support ».
//
// C'est le seul endroit du Poste de contrôle qui mène à une donnée de client d'artisan, et il est
// écrit pour qu'on n'oublie jamais dans quel état on se trouve :
//
//   · un ticket sans élément désigné n'a PAS de bouton. Pas un bouton grisé : pas de bouton. Le
//     bouton grisé donne l'impression d'un droit qu'on aurait si on insistait ;
//   · une demande envoyée affiche « en attente de SA réponse », et rien d'autre n'est proposé ;
//   · une fenêtre ouverte affiche l'heure à laquelle elle se referme et ce qui a déjà été lu ;
//   · un verrou posé remplace tout le bloc par une phrase : il n'y a rien à tenter.
//
// Les quatre vues sont quatre boutons distincts, chacun nommé par ce qu'il montre. Un menu
// déroulant aurait laissé croire à un catalogue ; ce sont quatre lectures, et il n'y en a pas plus.

type Acces = {
  id: string; element_type: string; element_titre: string | null; motif: string | null
  demande_le: string; notifie_le: string | null; ouvert_le: string | null; expire_le: string | null
  refuse_le: string | null; refuse_motif: string | null; ferme_le: string | null; ferme_motif: string | null
  etat: 'non_notifie' | 'en_attente' | 'ouvert' | 'expire' | 'refuse' | 'ferme'
  lectures: number
}
type Ticket = {
  id: string; sujet: string | null; ouvert_le: string; ferme_le: string | null
  element_type: string | null; element_id: string | null; element_titre: string | null
  demandable: boolean; acces: Acces[]
}
type Etat = { verrou: { pose_le: string } | null; tickets: Ticket[]; lectures: { id: string; acces_id: string; vue: string; acteur_nom: string; lu_le: string }[] }

const VUES = [
  { cle: 'forme', libelle: 'La forme', dit: 'statut, dates, nombre de lignes' },
  { cle: 'chiffres', libelle: 'Les montants', dit: 'totaux, remise, acompte' },
  { cle: 'photos', libelle: 'Les photos', dit: 'combien, quel poids — jamais les images' },
  { cle: 'envoi', libelle: 'L’envoi', dit: 'remis, rejeté, à quelle date' },
] as const

export default function BlocSupport({ artisan, role, signaler, confirmer }: {
  artisan: string
  role: 'direction' | 'lecture'
  signaler: (m: { type: 'ok' | 'err'; text: string }) => void
  /** La boite de reconfirmation appartient a la fiche : demander un acces la traverse comme les
   *  huit autres actions. Deux boites finiraient par ne pas dire la meme chose. */
  confirmer: (libelle: string, faire: () => Promise<void>) => void
}) {
  const [e, setE] = useState<Etat | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [motif, setMotif] = useState<Record<string, string>>({})
  const [lu, setLu] = useState<{ titre: string; vue: string; portee: string; donnees: unknown } | null>(null)
  const [maintenant] = useState(() => Date.now())

  const charger = useCallback(async () => {
    const r = await apiDirection<Etat>(`/api/controle/support?artisan=${artisan}`)
    setE(r.ok ? r.data : { verrou: null, tickets: [], lectures: [] })
  }, [artisan])
  useEffect(() => { charger() }, [charger])

  const envoyer = useCallback(async (t: Ticket, m: string): Promise<void> => {
    setBusy(t.id)
    try {
      const r = await apiDirection<{ message?: string; code?: string }>('/api/controle/support/demander', {
        method: 'POST',
        body: JSON.stringify({ ticket: t.id, type: t.element_type, element: t.element_id, titre: t.element_titre, motif: m }),
      }, true)
      if (r.ok) {
        signaler({ type: 'ok', text: r.data.message ?? 'Demande envoyée. Il décide.' })
        setMotif((p) => ({ ...p, [t.id]: '' }))
        charger()
        return
      }
      if (['reconfirmation_requise', 'expire', 'rejoue', 'portee'].includes(r.data.code ?? '')) {
        confirmer('demander à regarder un élément de son compte', () => envoyer(t, m))
        return
      }
      signaler({ type: 'err', text: r.data.error ?? 'Rien n’a été fait.' })
    } finally { setBusy(null) }
  }, [charger, confirmer, signaler])

  function demander(t: Ticket) {
    const m = (motif[t.id] ?? '').trim()
    if (busy) return
    if (m.length < 10) { signaler({ type: 'err', text: 'Écrivez le motif : l’artisan le lira tel quel.' }); return }
    void envoyer(t, m)
  }

  async function lire(acces: string, vue: string) {
    if (busy) return
    setBusy(`${acces}-${vue}`)
    const r = await apiDirection<{ titre?: string; vue?: string; portee?: string; donnees?: unknown }>(`/api/controle/support/lire?acces=${acces}&vue=${vue}`)
    setBusy(null)
    if (!r.ok) { signaler({ type: 'err', text: r.data.error ?? 'Lecture refusée.' }); charger(); return }
    setLu({ titre: r.data.titre ?? '', vue: r.data.vue ?? vue, portee: r.data.portee ?? '', donnees: r.data.donnees })
    charger() // la lecture vient de laisser deux traces : le compteur doit bouger tout de suite
  }

  if (!e) return <p className="muted">Chargement du support…</p>

  if (e.verrou) {
    return (
      <div className="dir-bloc" data-support="verrouille">
        <h3>Support</h3>
        <p className="notif-etat">
          Cet artisan a posé un verrou le {new Date(e.verrou.pose_le).toLocaleDateString('fr-FR')} : <b>personne ne peut demander à regarder son compte</b>.
          Il reste joignable par message — c’est par là qu’il faut passer, et il n’y a rien à tenter d’autre.
        </p>
      </div>
    )
  }

  const ouverts = e.tickets.filter((t) => !t.ferme_le)
  const clos = e.tickets.filter((t) => t.ferme_le)

  return (
    <div className="dir-bloc" data-support="actif">
      <h3>Support</h3>

      {!e.tickets.length ? (
        <p className="muted" data-support-vide>Aucune demande d’aide. Sans demande de sa part, il n’y a rien à demander à regarder.</p>
      ) : null}

      {ouverts.map((t) => (
        <div className="sup-ticket" key={t.id}>
          <b>{t.sujet || 'Demande d’aide'}</b>
          <small className="muted">Ouverte {relTime(t.ouvert_le, maintenant)}{t.element_titre ? ` · à propos de ${t.element_titre}` : ' · aucun élément joint'}</small>

          {t.acces.map((a) => (
            <div className="sup-acces" key={a.id} data-etat={a.etat}>
              <span className="sup-acces-etat">
                {a.etat === 'en_attente' ? <>Demandé, <b>en attente de sa réponse</b>. Il a été prévenu par email.</>
                  : a.etat === 'ouvert' ? <><b>Ouvert</b>{a.expire_le ? ` jusqu’à ${new Date(a.expire_le).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}` : ''} · {a.lectures} consultation{a.lectures > 1 ? 's' : ''}</>
                  : a.etat === 'refuse' ? <>Refusé{a.refuse_motif ? ` — « ${a.refuse_motif} »` : ''}. On ne redemande pas la même chose.</>
                  : a.etat === 'expire' ? <>Expiré tout seul après une heure.</>
                  : a.etat === 'non_notifie' ? <>La notification n’est pas partie : cette demande ne s’ouvrira jamais.</>
                  : <>Fermé{a.ferme_motif === 'artisan' ? ' par lui' : a.ferme_motif === 'horloge' ? ' par l’horloge' : ''} · {a.lectures} consultation{a.lectures > 1 ? 's' : ''}</>}
              </span>

              {a.etat === 'ouvert' && role === 'direction' ? (
                <div className="sup-vues">
                  {VUES.map((v) => (
                    <button key={v.cle} type="button" className="btn btn--ghost" disabled={!!busy}
                      onClick={() => lire(a.id, v.cle)} data-vue={v.cle} title={v.dit}>
                      {busy === `${a.id}-${v.cle}` ? '…' : v.libelle}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}

          {/* Pas de bouton du tout quand il n'y a rien à demander : un bouton grisé laisse croire à
              un droit qu'on obtiendrait en insistant. */}
          {t.demandable && role === 'direction' && !t.acces.some((a) => ['en_attente', 'ouvert'].includes(a.etat)) ? (
            <div className="sup-demander">
              <label htmlFor={`motif-${t.id}`}>Pourquoi vous avez besoin de regarder {t.element_titre} — il le lira mot pour mot</label>
              <input id={`motif-${t.id}`} value={motif[t.id] ?? ''} maxLength={300}
                onChange={(ev) => setMotif((p) => ({ ...p, [t.id]: ev.target.value }))}
                placeholder="pour comprendre pourquoi l’envoi est resté bloqué" />
              <button type="button" className="btn btn--ghost" disabled={!!busy || (motif[t.id] ?? '').trim().length < 10}
                onClick={() => demander(t)} data-action="support-demander">
                {busy === t.id ? 'Envoi…' : 'Demander à regarder'}
              </button>
              <small className="muted">Il reçoit un email, il décide. Sans son clic, rien ne s’ouvre — et une heure plus tard, ça se referme seul.</small>
            </div>
          ) : null}

          {!t.element_id ? (
            <small className="muted">Il n’a joint aucun élément : il n’y a rien à demander à regarder ici. Répondez-lui par écrit.</small>
          ) : null}
        </div>
      ))}

      {clos.length ? (
        <details className="sup-clos">
          <summary>{clos.length} demande{clos.length > 1 ? 's' : ''} close{clos.length > 1 ? 's' : ''}</summary>
          <ul>
            {clos.map((t) => (
              <li key={t.id}>
                {t.sujet || 'Demande d’aide'} · fermée {relTime(t.ferme_le!, maintenant)}
                {t.acces.length ? ` · ${t.acces.reduce((n, a) => n + a.lectures, 0)} consultation(s)` : ''}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {/* Ce qui a été lu s'affiche ici, jamais dans une nouvelle page : on ne quitte pas la fiche
          pour voir la forme d'un devis, et le rappel de portée reste sous les yeux. */}
      {lu ? (
        <div className="sup-lu" role="status">
          <div className="sup-lu-tete">
            <b>{lu.titre || 'Élément'} · {VUES.find((v) => v.cle === lu.vue)?.libelle ?? lu.vue}</b>
            <button type="button" className="dir-dep" onClick={() => setLu(null)}>fermer</button>
          </div>
          <dl className="sup-lu-corps">
            {Object.entries((lu.donnees ?? {}) as Record<string, unknown>).map(([k, v]) => (
              <div key={k}>
                <dt>{k.replace(/_/g, ' ')}</dt>
                <dd>{v === null ? '—' : typeof v === 'boolean' ? (v ? 'oui' : 'non') : String(v)}</dd>
              </div>
            ))}
          </dl>
          <small className="muted">{lu.portee}</small>
        </div>
      ) : null}
    </div>
  )
}
