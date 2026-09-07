'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiDirection, reconfirmationValide } from './client'
import Fraicheur from './Fraicheur'
import Reconfirmer, { type Portee } from './Reconfirmer'
import { relTime, euros } from '@/lib/direction/fraicheur'
import { actif } from '@/lib/flags'

// Direction → Clients → la fiche d'un artisan (prompt v10 §2.2, J2b).
//
// Ce qu'on voit : son compte, son abonnement lu en direct chez Stripe, ce qu'il fait (des COMPTES : demandes,
// devis, factures — jamais leur contenu), son canal d'arrivée, et ce que la direction a fait sur son compte.
// Ce qu'on peut : offrir des crédits, suspendre, réactiver, lui écrire, ouvrir son portail de facturation.
// Chaque action demande le mot de passe et laisse une trace.
type Sourcee<T> = { valeur: T | null; source: string; a: string; cache: boolean; erreur?: string }
type Abonnement = { statut: string; offre: string | null; montant: number | null; periode_fin: string | null; annulation_prevue: boolean; moyen: string | null }
type Fiche = {
  artisan: { id: string; nom: string | null; email: string | null; metier: string | null; tel: string | null; slug: string | null; plan: string | null; offre: string; credits: number | null; inscrit_le: string; suppression_demandee_le: string | null; fondateur: boolean; client_stripe: boolean }
  abonnement: Sourcee<Abonnement | null>
  suspension: { motif: string; message: string | null; depuis: string } | null
  usage: { leads: number; devis: number; factures: number }
  apport: { statutLisible: string; preuve: string; compte: boolean; taux: number; raison: string; apporteur: string | null } | null
  journal: { id: string; action: string; acteur_email: string | null; avant: unknown; apres: unknown; cree_le: string }[]
  a: string
}
const STATUTS: Record<string, string> = { active: 'actif', trialing: 'en essai', past_due: 'impayé', canceled: 'résilié', unpaid: 'impayé', paused: 'en pause', incomplete: 'incomplet' }
const ACTIONS_JOURNAL: Record<string, string> = { artisan_credits: 'Crédits offerts', artisan_suspendu: 'Compte suspendu', artisan_reactive: 'Compte réactivé', artisan_email: 'Message envoyé', apport_ajoute: 'Apport déclaré', apport_modifie: 'Apport modifié' }

export default function Fiche({ id, role, signaler, onRetour }: { id: string; role: 'direction' | 'lecture'; signaler: (m: { type: 'ok' | 'err'; text: string }) => void; onRetour: () => void }) {
  const [d, setD] = useState<Fiche | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [aConfirmer, setAConfirmer] = useState<{ action: string; portee: Portee; faire: () => Promise<void> } | null>(null)
  const [maintenant] = useState(() => Date.now())

  const charger = useCallback(async () => {
    const r = await apiDirection<Fiche>(`/api/direction/clients/${id}`)
    if (!r.ok) { setErreur(r.data.error ?? 'Fiche indisponible pour l’instant.'); return }
    setErreur(null); setD(r.data)
  }, [id])
  useEffect(() => { void charger() }, [charger])

  const agir = useCallback(async (corps: Record<string, unknown>, portee: Portee, libelle: string) => {
    setBusy(libelle)
    try {
      const r = await apiDirection<{ message?: string; url?: string }>(`/api/direction/clients/${id}/action`, { method: 'POST', body: JSON.stringify(corps) }, true)
      if (r.ok) {
        signaler({ type: 'ok', text: r.data.message ?? 'C’est fait.' })
        if (r.data.url) window.open(r.data.url, '_blank', 'noopener')
        void charger()
        return
      }
      if (['reconfirmation_requise', 'expire', 'rejoue', 'portee'].includes(r.data.code ?? '')) {
        setAConfirmer({ action: libelle, portee: (r.data.portee as Portee) ?? portee, faire: async () => { await agir(corps, portee, libelle) } })
        return
      }
      signaler({ type: 'err', text: r.data.error ?? 'Action refusée.' })
    } finally { setBusy(null) }
  }, [charger, id, signaler])

  function demander(corps: Record<string, unknown>, portee: Portee, libelle: string) {
    if (!reconfirmationValide(portee)) { setAConfirmer({ action: libelle, portee, faire: async () => { await agir(corps, portee, libelle) } }); return }
    void agir(corps, portee, libelle)
  }

  function crediter() {
    const n = Number(window.prompt('Combien de crédits offrir ? (1 à 500)'))
    if (!Number.isInteger(n) || n < 1 || n > 500) return
    const motif = window.prompt('Pourquoi ? (le motif est journalisé)')
    if (!motif?.trim()) return
    demander({ action: 'crediter', credits: n, motif: motif.trim() }, 'argent', 'offrir des crédits')
  }
  function suspendre() {
    const motif = window.prompt('Pourquoi suspendre ce compte ? (motif interne, journalisé)')
    if (!motif?.trim()) return
    const message = window.prompt('Message affiché à l’artisan quand il tentera de se connecter (facultatif) :') ?? ''
    demander({ action: 'suspendre', motif: motif.trim(), message }, 'artisan', 'suspendre ce compte')
  }
  function reactiver() {
    const motif = window.prompt('Motif de la réactivation (facultatif) :') ?? ''
    demander({ action: 'reactiver', motif }, 'artisan', 'réactiver ce compte')
  }
  function ecrire() {
    const modele = window.prompt('Quel message ? bonjour · aide · paiement')
    if (!modele?.trim()) return
    demander({ action: 'email', modele: modele.trim() }, 'artisan', 'écrire à cet artisan')
  }

  const a = d?.artisan
  const abo = d?.abonnement?.valeur ?? null

  return (
    <>
      <button type="button" className="btn btn--ghost" style={{ marginBottom: '.8rem' }} onClick={onRetour}>← Tous les clients</button>
      {erreur ? <div className="tool-card"><p className="notif-erreur" role="alert">{erreur}</p><button type="button" className="btn btn--primary" onClick={() => void charger()}>Réessayer</button></div> : null}
      {!d || !a ? <div className="tool-card"><p className="muted">Chargement…</p></div> : (
        <>
          <div className="tool-card" data-fiche={a.id}>
            <h2>{a.nom || 'Sans nom'}{a.metier ? <small className="muted"> · {a.metier}</small> : null}</h2>
            <p className="muted" style={{ margin: '0 0 .8rem' }}>
              {a.offre} · {a.credits ?? 0} crédit{(a.credits ?? 0) > 1 ? 's' : ''} · inscrit {relTime(a.inscrit_le, maintenant)}
              {a.slug ? <> · <a href={`https://prestiapp.fr/p/${a.slug}`} target="_blank" rel="noopener">sa page</a></> : null}
            </p>
            {d.suspension ? (
              <p className="notif-erreur" data-suspendu>Compte suspendu depuis {relTime(d.suspension.depuis, maintenant)} — {d.suspension.motif}</p>
            ) : null}
            {a.suppression_demandee_le ? <p className="notif-etat" data-etat="suppression">Suppression demandée le {new Date(a.suppression_demandee_le).toLocaleDateString('fr-FR')}.</p> : null}
            <div className="dir-ligne-actions">
              {role === 'direction' && actif('actionsArtisan') ? (
                <>
                  <button type="button" className="btn btn--ghost" disabled={!!busy} onClick={crediter} data-action="crediter">Offrir des crédits</button>
                  {d.suspension
                    ? <button type="button" className="btn btn--primary" disabled={!!busy} onClick={reactiver} data-action="reactiver">Réactiver</button>
                    : <button type="button" className="btn btn--ghost danger" disabled={!!busy || a.fondateur} onClick={suspendre} data-action="suspendre">Suspendre</button>}
                  <button type="button" className="btn btn--ghost" disabled={!!busy} onClick={ecrire} data-action="email">Lui écrire</button>
                  {a.client_stripe ? <button type="button" className="btn btn--ghost" disabled={!!busy} onClick={() => demander({ action: 'portail' }, 'artisan', 'ouvrir son portail de facturation')} data-action="portail">Portail de facturation</button> : null}
                </>
              ) : <span className="dir-src">{role === 'direction' ? 'actions bientôt disponibles' : 'lecture seule'}</span>}
            </div>
          </div>

          <div className="tool-card" data-abonnement>
            <h2>Abonnement</h2>
            {d.abonnement?.erreur ? <p className="notif-erreur">Stripe ne répond pas : {d.abonnement.erreur}</p>
              : !abo ? <p className="muted">Aucun abonnement Stripe — l’artisan est sur l’offre {a.offre}.</p>
              : (
                <p className="muted" style={{ margin: 0 }}>
                  <b>{STATUTS[abo.statut] ?? abo.statut}</b>{abo.montant != null ? <> · {euros(abo.montant)} par mois</> : null}
                  {abo.periode_fin ? <> · période jusqu’au {new Date(abo.periode_fin).toLocaleDateString('fr-FR')}</> : null}
                  {abo.annulation_prevue ? <> · <span className="pill warn"><span className="pdot" />résiliation prévue</span></> : null}
                  {abo.moyen ? <> · {abo.moyen}</> : null}
                  <br /><Fraicheur s={d.abonnement} maintenant={maintenant} />
                </p>
              )}
          </div>

          <div className="tool-card" data-usage>
            <h2>Son activité</h2>
            <p className="muted" style={{ margin: 0 }}>
              {d.usage.leads} demande{d.usage.leads > 1 ? 's' : ''} reçue{d.usage.leads > 1 ? 's' : ''} · {d.usage.devis} devis · {d.usage.factures} facture{d.usage.factures > 1 ? 's' : ''}.
              <br /><small>Des nombres, jamais leur contenu : ses conversations, ses devis et ses factures ne sont pas lisibles ici.</small>
            </p>
          </div>

          {d.apport ? (
            <div className="tool-card" data-apport>
              <h2>Arrivé par</h2>
              <p className="muted" style={{ margin: 0 }}>
                <b>{d.apport.apporteur ?? 'Apporteur'}</b> · <span className={`pill ${d.apport.compte ? 'ok' : 'muted'}`}><span className="pdot" />{d.apport.statutLisible}</span>
                <br />{d.apport.preuve}
                <br /><small>{d.apport.raison}</small>
              </p>
            </div>
          ) : null}

          <div className="tool-card" data-journal-artisan>
            <h2>Ce que la direction a fait sur ce compte</h2>
            {d.journal.length === 0 ? <p className="muted">Rien pour l’instant.</p> : (
              <ul className="sess">
                {d.journal.map((j) => (
                  <li key={j.id}>
                    <span className="sess-txt">
                      <b>{ACTIONS_JOURNAL[j.action] ?? j.action}</b>
                      <small>{relTime(j.cree_le, maintenant)} · {j.acteur_email ?? 'fondateur'}{j.apres ? ` · ${JSON.stringify(j.apres).slice(0, 90)}` : ''}</small>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
      {aConfirmer ? <Reconfirmer portee={aConfirmer.portee} action={aConfirmer.action} onConfirme={() => { const f = aConfirmer.faire; setAConfirmer(null); void f() }} onAnnule={() => setAConfirmer(null)} /> : null}
    </>
  )
}
