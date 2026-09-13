'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiDirection, reconfirmationValide } from './client'
import Fraicheur from './Fraicheur'
import Reconfirmer, { type Portee } from './Reconfirmer'
import BlocSupport from './BlocSupport'
import { relTime, euros } from '@/lib/direction/fraicheur'
import { actif } from '@/lib/flags'

// Direction → Clients → la fiche d'un artisan (prompt v10 §2.2, J2b).
//
// Ce qu'on voit : son compte, son abonnement lu en direct chez Stripe, ce qu'il fait (des COMPTES : demandes,
// devis, factures — jamais leur contenu), son canal d'arrivée, et ce que la direction a fait sur son compte.
// Ce qu'on peut : offrir des crédits, suspendre, réactiver, lui écrire, ouvrir son portail de facturation.
// Chaque action demande le mot de passe et laisse une trace.
type Sourcee<T> = { valeur: T | null; source: string; a: string; cache: boolean; erreur?: string }
type Abonnement = { statut: string; offre: string | null; montant: number | null; periode_fin: string | null; annulation_prevue: boolean; moyen: string | null; pause: string | null }
type Fiche = {
  artisan: { id: string; nom: string | null; email: string | null; metier: string | null; tel: string | null; slug: string | null; plan: string | null; offre: string; credits: number | null; inscrit_le: string; suppression_demandee_le: string | null; fondateur: boolean; client_stripe: boolean }
  abonnement: Sourcee<Abonnement | null>
  suspension: { motif: string; message: string | null; depuis: string } | null
  usage: { leads: number; devis: number; factures: number; erreur?: string }
  derniereFacture: { montant: number; rendu: number; restant: number; date: string } | null
  apport: { statutLisible: string; preuve: string; compte: boolean; taux: number; raison: string; apporteur: string | null } | null
  journal: { id: string; action: string; acteur_email: string | null; avant: unknown; apres: unknown; cree_le: string }[]
  a: string
}
const OFFRES_POSSIBLES = ['essentiel', 'studio', 'signature'] as const
const STATUTS: Record<string, string> = { active: 'actif', trialing: 'en essai', past_due: 'impayé', canceled: 'résilié', unpaid: 'impayé', paused: 'en pause', incomplete: 'incomplet' }
// Ce que dit chaque modèle, pour le montrer AVANT de l'envoyer : un email ne se rattrape pas.
const MODELES = {
  bonjour: { libelle: 'Prendre des nouvelles', sujet: 'Un mot de Presti', apercu: 'Je voulais simplement prendre de vos nouvelles sur votre utilisation de Presti…' },
  aide: { libelle: 'Proposer un coup de main', sujet: 'Besoin d’un coup de main ?', apercu: 'J’ai vu que votre compte était un peu en veille. Si vous voulez qu’on prenne dix minutes…' },
  paiement: { libelle: 'Paiement refusé', sujet: 'Votre paiement n’est pas passé', apercu: 'Votre dernier paiement a été refusé par votre banque. Rien n’est perdu…' },
} as const satisfies Record<string, { libelle: string; sujet: string; apercu: string }>
const ACTIONS_JOURNAL: Record<string, string> = {
  // Le mode support (0074) : sans ces libellés, l'écran afficherait la clé technique — un
  // journal que l'artisan ne pourrait pas lire s'il le demandait.
  support_acces_demande: 'Accès de support demandé',
  support_acces_ouvert: 'Accès de support OUVERT par l’artisan',
  support_acces_refuse: 'Accès de support refusé par l’artisan',
  support_acces_ferme: 'Accès de support fermé',
  support_verrou_pose: 'Verrou posé par l’artisan (plus aucune demande possible)',
  support_verrou_leve: 'Verrou levé par l’artisan',
  support_ticket_ouvert: 'Ticket ouvert',
  support_ticket_ferme: 'Ticket fermé',
  artisan_credits: 'Crédits offerts', artisan_suspendu: 'Compte suspendu', artisan_reactive: 'Compte réactivé',
  artisan_email: 'Message envoyé', artisan_portail: 'Lien de portail', artisan_offre: 'Changement d’offre',
  artisan_rembourse: 'Remboursement', artisan_pause: 'Facturation en pause', artisan_essai: 'Essai prolongé',
  support_vu_comme: 'Mode support', apport_ajoute: 'Apport déclaré', apport_modifie: 'Apport modifié',
}

/** Ce qu'une ligne de journal raconte, en français — au lieu d'un JSON coupé au 90e caractère. */
function resumeJournal(apres: unknown): string {
  if (!apres || typeof apres !== 'object') return ''
  const o = apres as Record<string, unknown>
  const bouts: string[] = []
  if (typeof o.statut === 'string') bouts.push({ 'tenté': 'tenté', 'fait': 'fait', 'refusé': 'refusé', 'échec': 'échec', 'envoyé': 'envoyé' }[o.statut] ?? o.statut)
  if (typeof o.resume === 'string') bouts.push(o.resume)
  if (typeof o.motif === 'string') bouts.push(`motif : ${o.motif}`)
  if (typeof o.offerts === 'number') bouts.push(`${o.offerts} crédits`)
  return bouts.length ? ` · ${bouts.join(' · ')}` : ''
}

export default function Fiche({ id, role, signaler, onRetour }: { id: string; role: 'direction' | 'lecture'; signaler: (m: { type: 'ok' | 'err'; text: string }) => void; onRetour: () => void }) {
  const [d, setD] = useState<Fiche | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [aConfirmer, setAConfirmer] = useState<{ action: string; portee: Portee; faire: () => Promise<void> } | null>(null)
  const [lienPortail, setLienPortail] = useState<string | null>(null)
  const [maintenant] = useState(() => Date.now())
  // Le résultat d'une action s'affiche ICI, sous les boutons : le bandeau du Centre est en haut de
  // page, hors de l'écran quand on agit depuis le bas d'une fiche, et il s'efface au bout de six
  // secondes (revue du 07/09). Une erreur, elle, ne s'efface jamais toute seule.
  const [resultat, setResultat] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const dire = useCallback((m: { type: 'ok' | 'err'; text: string }) => { setResultat(m); signaler(m) }, [signaler])

  const charger = useCallback(async () => {
    const r = await apiDirection<Fiche>(`/api/controle/clients/${id}`)
    if (!r.ok) { setErreur(r.data.error ?? 'Fiche indisponible pour l’instant.'); return }
    setErreur(null); setD(r.data)
  }, [id])
  useEffect(() => { void charger() }, [charger])

  const agir = useCallback(async (corps: Record<string, unknown>, portee: Portee, libelle: string) => {
    setBusy(libelle)
    try {
      const r = await apiDirection<{ message?: string; url?: string }>(`/api/controle/clients/${id}/action`, { method: 'POST', body: JSON.stringify(corps) }, true)
      if (r.ok) {
        // Le lien de portail n'est PAS ouvert : il est destiné à l'artisan, pas au fondateur. L'ouvrir
        // connecterait Benj au compte Stripe de quelqu'un d'autre, et sur téléphone le bloqueur de
        // fenêtres le ferait disparaître sans rien dire (revue du 07/09). On le pose, on le copie.
        if (r.data.url) setLienPortail(r.data.url)
        dire({ type: 'ok', text: r.data.message ?? 'C’est fait.' })
        void charger()
        return
      }
      if (['reconfirmation_requise', 'expire', 'rejoue', 'portee'].includes(r.data.code ?? '')) {
        setAConfirmer({ action: libelle, portee: (r.data.portee as Portee) ?? portee, faire: async () => { await agir(corps, portee, libelle) } })
        return
      }
      dire({ type: 'err', text: r.data.error ?? 'Action refusée.' })
      // Un refus (« déjà suspendu », etc.) rafraîchit aussi l'écran : l'état affiché redevient l'état réel.
      void charger()
    } finally { setBusy(null) }
  }, [charger, id, dire])

  function demander(corps: Record<string, unknown>, portee: Portee, libelle: string) {
    if (!reconfirmationValide(portee)) { setAConfirmer({ action: libelle, portee, faire: async () => { await agir(corps, portee, libelle) } }); return }
    void agir(corps, portee, libelle)
  }

  /** Une question dont l'annulation ANNULE — `null` (Échap, Annuler) n'est pas la même chose qu'une
   *  chaîne vide, et confondre les deux faisait partir des actions que personne n'avait voulues. */
  function demanderTexte(question: string, obligatoire = true): string | null {
    const v = window.prompt(question)
    if (v === null) return null
    const t = v.trim()
    if (obligatoire && !t) { dire({ type: 'err', text: 'Un motif est obligatoire : il sera dans le journal.' }); return null }
    return t
  }

  function crediter() {
    const brut = window.prompt('Combien de crédits offrir ? (1 à 500)')
    if (brut === null) return
    const n = Number(brut.trim())
    // Une saisie invalide se DIT. Sortir en silence donnait un bouton qui a l'air mort.
    if (!Number.isInteger(n) || n < 1 || n > 500) { dire({ type: 'err', text: 'Un nombre entier entre 1 et 500.' }); return }
    const motif = demanderTexte('Pourquoi ? (le motif est journalisé)')
    if (motif === null) return
    demander({ action: 'crediter', credits: n, motif }, 'argent', 'offrir des crédits')
  }
  function suspendre() {
    const motif = demanderTexte('Pourquoi suspendre ce compte ? (motif interne, journalisé)')
    if (motif === null) { dire({ type: 'err', text: 'Suspension annulée : aucun motif saisi.' }); return }
    const message = window.prompt('Message affiché à l’artisan quand il tentera de se connecter (facultatif) :')
    if (message === null) return
    demander({ action: 'suspendre', motif, message: message.trim() }, 'artisan', 'suspendre ce compte')
  }
  function reactiver() {
    const motif = window.prompt('Motif de la réactivation (facultatif) :')
    if (motif === null) return
    demander({ action: 'reactiver', motif: motif.trim() }, 'artisan', 'réactiver ce compte')
  }
  function changerOffre(vers: 'essentiel' | 'studio' | 'signature') {
    const motif = demanderTexte(`Pourquoi passer cet artisan en ${vers} ? (journalisé)`)
    if (motif === null) return
    demander({ action: 'offre', vers, motif }, 'argent', `passer en ${vers}`)
  }
  function remboursement() {
    // On nomme le montant. « La totalité de la dernière facture » ne dit pas combien d'argent part.
    const f = d?.derniereFacture
    if (!f) { dire({ type: 'err', text: 'Aucune facture payée : il n’y a rien à rembourser.' }); return }
    const brut = window.prompt(`Combien rembourser ? (au maximum ${f.restant.toFixed(2)} € — facture du ${new Date(f.date).toLocaleDateString('fr-FR')}${f.rendu > 0 ? `, ${f.rendu.toFixed(2)} € déjà rendus` : ''})\nLaissez vide pour rendre les ${f.restant.toFixed(2)} €.`)
    if (brut === null) return
    const montant = brut.trim() === '' ? null : Number(brut.replace(',', '.'))
    if (montant !== null && !(Number.isFinite(montant) && montant > 0)) { dire({ type: 'err', text: 'Montant illisible : écrivez 59 ou 59,90.' }); return }
    if (montant !== null && montant > f.restant + 0.005) { dire({ type: 'err', text: `Au maximum ${f.restant.toFixed(2)} € sur cette facture.` }); return }
    const motif = demanderTexte('Motif du remboursement (obligatoire, journalisé)')
    if (motif === null) return
    if (!window.confirm(`Rembourser ${(montant ?? f.restant).toFixed(2)} € à ${a?.nom || 'cet artisan'} ? De l’argent quitte le compte, et ça ne s’annule pas.`)) return
    demander({ action: 'rembourser', montant, motif }, 'argent', 'rembourser')
  }
  function pause() {
    const enPause = !!abo?.pause
    const motif = demanderTexte(enPause ? 'Motif de la reprise (journalisé)' : 'Pourquoi mettre la facturation en pause ? (journalisé)')
    if (motif === null) return
    if (enPause) { demander({ action: 'reprendre', motif }, 'argent', 'reprendre la facturation'); return }
    const date = window.prompt('Reprise le (AAAA-MM-JJ, trois mois au maximum). Vide = dans trois mois :')
    if (date === null) return
    const t = date.trim()
    // Une date à la française relue par `new Date` se comprend à l'américaine, ou pas du tout :
    // 03/09/2026 devient le 9 mars. On n'accepte donc que la forme ISO, et on le dit (revue du 07/09).
    if (t && !/^\d{4}-\d{2}-\d{2}$/.test(t)) { dire({ type: 'err', text: 'Format attendu : AAAA-MM-JJ, par exemple 2026-12-01.' }); return }
    if (t) {
      const j = (new Date(`${t}T12:00:00`).getTime() - Date.now()) / 86_400_000
      if (!Number.isFinite(j)) { dire({ type: 'err', text: 'Date illisible.' }); return }
      if (j < 1) { dire({ type: 'err', text: 'La reprise doit être au moins demain.' }); return }
      if (j > 92) { dire({ type: 'err', text: 'Trois mois au maximum : au-delà, c’est une résiliation.' }); return }
    }
    demander({ action: 'pause', jusqu_au: t || null, motif }, 'argent', 'mettre la facturation en pause')
  }
  function ecrire(modele: 'bonjour' | 'aide' | 'paiement') {
    const m = MODELES[modele]
    if (!window.confirm(`Envoyer à ${a?.email ?? 'cet artisan'} ?\n\nObjet : ${m.sujet}\n\n${m.apercu}`)) return
    demander({ action: 'email', modele }, 'artisan', 'écrire à cet artisan')
  }
  function portail() {
    const motif = demanderTexte('Pourquoi ouvrir son portail de facturation ? (journalisé)')
    if (motif === null) return
    demander({ action: 'portail', motif }, 'argent', 'créer un lien de portail')
  }

  const a = d?.artisan
  const abo = d?.abonnement?.valeur ?? null

  return (
    <>
      <button type="button" className="btn btn--ghost" style={{ marginBottom: '.8rem' }} onClick={onRetour}>← Tous les clients</button>
      {erreur ? <div className="tool-card"><p className="notif-erreur" role="alert">{erreur}</p><button type="button" className="btn btn--primary" onClick={() => void charger()}>Réessayer</button></div> : null}
      {!d || !a ? (erreur ? null : <div className="tool-card"><p className="muted">Chargement…</p></div>) : (
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
                  <button type="button" className="btn btn--ghost" disabled={!!busy} onClick={crediter} data-action="crediter">{busy === 'offrir des crédits' ? 'Envoi…' : 'Offrir des crédits'}</button>
                  {d.suspension
                    ? <button type="button" className="btn btn--primary" disabled={!!busy} onClick={reactiver} data-action="reactiver">{busy === 'réactiver ce compte' ? 'Réactivation…' : 'Réactiver'}</button>
                    : <button type="button" className="btn btn--ghost danger" disabled={!!busy || a.fondateur} onClick={suspendre} data-action="suspendre">{busy === 'suspendre ce compte' ? 'Suspension…' : 'Suspendre'}</button>}
                  {/* Un modèle par bouton, nommé : « Lui écrire » puis une question ouverte ne disait ni
                      à qui, ni quoi (revue du 07/09). La confirmation montre l'adresse et le texte. */}
                  {(Object.keys(MODELES) as (keyof typeof MODELES)[]).map((k) => (
                    <button key={k} type="button" className="btn btn--ghost" disabled={!!busy} onClick={() => ecrire(k)} data-action={`email-${k}`}>{MODELES[k].libelle}</button>
                  ))}
                  {abo ? <>
                    {/* Une offre par bouton : taper « studio » dans une boîte de dialogue n'est pas une
                        interface, et une faute de frappe se terminait par un refus du serveur. */}
                    {OFFRES_POSSIBLES.filter((o) => o !== (abo.offre || '').toLowerCase()).map((o) => (
                      <button key={o} type="button" className="btn btn--ghost" disabled={!!busy} onClick={() => changerOffre(o)} data-action={`offre-${o}`}>Passer en {o}</button>
                    ))}
                    <button type="button" className="btn btn--ghost" disabled={!!busy} onClick={pause} data-action="pause">{abo.pause ? 'Reprendre la facturation' : 'Mettre en pause'}</button>
                  </> : null}
                  {a.client_stripe ? <button type="button" className="btn btn--ghost danger" disabled={!!busy || !d.derniereFacture} onClick={remboursement} data-action="rembourser">Rembourser{d.derniereFacture ? ` (${d.derniereFacture.restant.toFixed(2)} € au plus)` : ''}</button> : null}
                  {a.client_stripe ? <button type="button" className="btn btn--ghost" disabled={!!busy} onClick={portail} data-action="portail">Créer un lien de portail</button> : null}
                </>
              ) : <span className="dir-src">{role === 'direction' ? 'actions bientôt disponibles' : 'lecture seule'}</span>}
            </div>

            {/* Ce qui vient de se passer, DANS la fiche, sous les boutons. Un succès s'annonce, un
                refus reste affiché tant qu'on ne l'a pas lu. */}
            {resultat ? (
              <p className={resultat.type === 'ok' ? 'notif-etat' : 'notif-erreur'} role={resultat.type === 'ok' ? 'status' : 'alert'} data-resultat={resultat.type}>
                {resultat.text}
                {resultat.type === 'err' ? <> <button type="button" className="dir-dep" onClick={() => setResultat(null)}>fermer</button></> : null}
              </p>
            ) : null}

            {/* Le lien de portail : à transmettre à l'artisan, jamais à ouvrir soi-même. */}
            {lienPortail ? (
              <p className="notif-etat" data-lien-portail>
                Lien de portail pour {a.nom || 'cet artisan'} — valable quelques minutes, à lui transmettre :
                <br /><code style={{ wordBreak: 'break-all', fontSize: '.85em' }}>{lienPortail}</code>
                <br />
                <button type="button" className="btn btn--ghost" onClick={() => { void navigator.clipboard?.writeText(lienPortail).then(() => dire({ type: 'ok', text: 'Lien copié.' }), () => dire({ type: 'err', text: 'Copie refusée par le navigateur — sélectionnez le lien à la main.' })) }}>Copier le lien</button>
                <button type="button" className="btn btn--ghost" onClick={() => setLienPortail(null)}>Masquer</button>
              </p>
            ) : null}
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
                  {abo.pause ? <> · <span className="pill warn" data-pause><span className="pdot" />facturation {abo.pause}</span></> : null}
                  <br /><Fraicheur s={d.abonnement} maintenant={maintenant} />
                </p>
              )}
          </div>

          <div className="tool-card" data-usage>
            <h2>Son activité</h2>
            <p className="muted" style={{ margin: 0 }}>
              {d.usage.erreur
                ? <span className="notif-erreur">Comptes indisponibles : {d.usage.erreur}</span>
                : <>{d.usage.leads} demande{d.usage.leads > 1 ? 's' : ''} reçue{d.usage.leads > 1 ? 's' : ''} · {d.usage.devis} devis · {d.usage.factures} facture{d.usage.factures > 1 ? 's' : ''}.</>}
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

          {/* Le mode support. Place ici, entre ce qu'il fait et ce que la direction a fait : demander
              a regarder est une action, et elle se lit dans le meme fil que les autres. */}
          {actif('supportArtisan') ? (
            <div className="tool-card" data-support-carte>
              <BlocSupport
                artisan={a.id}
                role={role}
                signaler={dire}
                confirmer={(libelle, faire) => {
                  if (!reconfirmationValide('artisan')) { setAConfirmer({ action: libelle, portee: 'artisan', faire }); return }
                  void faire()
                }}
              />
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
                      <small>{relTime(j.cree_le, maintenant)} · {j.acteur_email ?? 'fondateur'}{resumeJournal(j.apres)}</small>
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
