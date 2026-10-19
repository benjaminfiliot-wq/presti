'use client'

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/app/AppShell'
import { LIBELLES_STATUT_CHANTIER, type StatutChantier } from '@/lib/crm/valider'
import type { FicheClient as Fiche } from '@/lib/crm/vue'
import { comptes, filtrer, FILTRES_CHRONO, jourEvenement, LIBELLES_FILTRE_CHRONO, type FiltreChrono } from '@/lib/crm/chronologie'
import { LIBELLES_RAPPEL, type TypeRappel } from '@/lib/crm/rappels'
import { ficheClientExemple } from '@/lib/crm/exemple'
import { AIDE_TEXTE_LIBRE, appel, bloquerEcritures, dateFr, dateHeureFr, enCentimes, estErreur, euros, LIBELLES_DEMANDE, LIBELLES_DEVIS, LIBELLES_FACTURE, TON_STATUT_CHANTIER } from '../../client'
import { BandeauFicheExemple, Lien, ModeExemple, useModeFiche } from '../../mode'
import Frise from '../../Frise'
import { ListeRappels, MeLeRappeler } from '../../Rappels'

// La fiche client (plan du 18/10, n°4) : en tête, de quoi agir (appeler, écrire, une note, un rappel, un nouveau devis) et le
// prochain rendez-vous ; puis chaque dossier avec sa frise, les rappels, et UN fil daté de tout ce qui s'est passé avec ce client
// (lib/crm/chronologie.ts), filtrable : Tout · Échanges · Argent · Chantiers · Notes. Les pièces rangées par type restent
// accessibles, repliées. Le client est reconstitué à partir des pièces (lib/crm/clients.ts) ; l'adresse de la page est son
// empreinte, ou une de ses pièces. La forme est celle de lib/crm/vue.ts (construireFicheClient). « ?exemple=1 » : un client de
// l'atelier d'exemple (lib/crm/exemple.ts), sans lecture ni écriture.
export default function FicheClientPage() {
  const exemple = useModeFiche()
  bloquerEcritures(exemple !== false)
  return exemple === null ? null : <ModeExemple actif={exemple}><Contenu exemple={exemple} /></ModeExemple>
}

function Contenu({ exemple }: { exemple: boolean }) {
  const router = useRouter()
  const { ref } = useParams<{ ref: string }>()
  const [f, setF] = useState<Fiche | null>(() => (exemple ? ficheClientExemple(ref) : null))
  const [erreur, setErreur] = useState(() => (exemple && !ficheClientExemple(ref) ? 'Ce client n’existe pas dans l’exemple.' : ''))
  const [texte, setTexte] = useState('')
  const [message, setMessage] = useState<{ texte: string; erreur: boolean } | null>(null)
  const [filtre, setFiltre] = useState<FiltreChrono>('tout')
  const champNote = useRef<HTMLTextAreaElement>(null)

  const charger = useCallback(async () => {
    if (exemple) return
    const { data } = await supabase.auth.getSession()
    if (!data.session) { router.replace('/login'); return }
    const r = await appel<Fiche>(`/api/crm/clients?ref=${encodeURIComponent(ref)}`)
    if (!r.ok) { setErreur(r.erreur); return }
    setErreur(''); setF(r.corps)
  }, [ref, router, exemple])
  useEffect(() => { void charger() }, [charger])

  async function ajouterNote(e: FormEvent) {
    e.preventDefault()
    if (!f) return
    setMessage(null)
    const r = await appel('/api/crm/notes', { method: 'POST', body: { texte, client: f.client.id } })
    if (!r.ok) { setMessage({ texte: r.erreur, erreur: estErreur(r) }); return }
    setTexte(''); await charger()
  }
  async function supprimerNote(id: string) {
    if (!confirm('Supprimer cette note ?')) return
    const r = await appel(`/api/crm/notes/${id}`, { method: 'DELETE' })
    if (!r.ok) { setMessage({ texte: r.erreur, erreur: estErreur(r) }); return }
    await charger()
  }

  const fil = f ? filtrer(f.chronologie, filtre) : []
  const nb = f ? comptes(f.chronologie) : null
  const rdv = f?.prochainRendezVous ?? null
  return (
    <AppShell active="crm" title={f?.client.nom ?? 'Client'} crumb="CRM atelier · Fiche client" wide>
      {exemple && <BandeauFicheExemple />}
      <p><Lien className="crm-retour" href="/crm?vue=clients">← Tous les clients</Lien></p>
      {erreur ? <div className="psh-panel"><div className="psh-empty" role="alert">{erreur}</div></div>
        : !f ? <p className="muted" role="status">Lecture de la fiche…</p>
          : (
            <div className="crm-fiche">
              {message && <p className={`crm-message${message.erreur ? ' erreur' : ''}`} role={message.erreur ? 'alert' : 'status'}>{message.texte}</p>}
              <section className="psh-panel crm-entete" aria-labelledby="crm-client-nom">
                <div className="crm-entete-haut"><div><h2 id="crm-client-nom">{f.client.nom ?? 'Client sans nom'}</h2></div></div>
                {/* Agir d'abord : appeler et écrire ouvrent le téléphone et la messagerie de l'appareil ; rien ne part tout seul. */}
                <div className="crm-boutons crm-client-actions">
                  {f.client.telephone ? <a className="psh-btn primary" href={`tel:${f.client.telephone.replace(/[^\d+]/g, '')}`}>Appeler</a> : <button type="button" className="psh-btn primary" disabled title="Aucun téléphone connu pour ce client">Appeler</button>}
                  {f.derniereDemande ? <Lien className="psh-btn ghost" href="/messages">Écrire</Lien> : f.client.email ? <a className="psh-btn ghost" href={`mailto:${f.client.email}`}>Écrire</a> : <button type="button" className="psh-btn ghost" disabled title="Ni conversation ni adresse e-mail">Écrire</button>}
                  <button type="button" className="psh-btn ghost" onClick={() => { champNote.current?.focus(); champNote.current?.scrollIntoView({ block: 'center' }) }}>+ Note</button>
                  {/* « + Rappel » EST le bouton du rappel (choix rapides, puis « Autre date… ») : un seul geste, et rien ne se monte ni ne se
                      démonte à chaque ouverture (18/10, voir app/crm/Rappels.tsx). */}
                  {f.rappelsDisponibles
                    ? <MeLeRappeler cible={{ client: f.client.id }} jour={f.jour} onChange={charger} compact libelle="+ Rappel" />
                    : <button type="button" className="psh-btn ghost" disabled title="Les rappels arrivent avec la prochaine mise à jour">+ Rappel</button>}
                  <Lien className="psh-btn ghost" href={f.derniereDemande ? `/devis/nouveau?lead=${f.derniereDemande}` : '/devis/nouveau'}>Nouveau devis</Lien>
                </div>
                <div className="crm-entete-chiffres">
                  <div><span className="lab">E-mail</span><span>{f.client.email ? <a href={`mailto:${f.client.email}`}>{f.client.email}</a> : '—'}</span></div>
                  <div><span className="lab">Téléphone</span><span>{f.client.telephone ? <a href={`tel:${f.client.telephone}`}>{f.client.telephone}</a> : '—'}</span></div>
                  <div><span className="lab">Adresse</span><span>{f.client.adresse ?? '—'}</span></div>
                  <div><span className="lab">Total signé</span><span className="tnum">{euros(f.signe)}</span></div>
                  <div><span className="lab">Prochain rendez-vous</span><span>{rdv ? `${dateFr(rdv.echeance)}${rdv.heure ? ` · ${rdv.heure.slice(0, 5)}` : ''} · ${LIBELLES_RAPPEL[rdv.type as TypeRappel] ?? 'Rendez-vous'}` : '—'}</span></div>
                  <div><span className="lab">Prochain chantier</span><span>{f.prochainChantier ? <Lien href={`/crm/chantiers/${f.prochainChantier.id}`}>{dateFr(f.prochainChantier.date_debut)} · {f.prochainChantier.titre}</Lien> : '—'}</span></div>
                </div>
              </section>

              {f.dossiers.length > 0 && (
                <section className="psh-panel" aria-labelledby="crm-client-dossiers">
                  <header><h2 id="crm-client-dossiers">Dossiers</h2><span className="tag tnum">{f.dossiers.length}</span></header>
                  <ul className="crm-corps crm-dossiers">
                    {f.dossiers.map((x) => (
                      <li key={x.cle}>
                        <p className="crm-dossier-titre"><b>{x.titre}</b>{x.montant !== null ? <span className="tnum"> · {euros(x.montant)}</span> : null}{x.aEncaisser > 0 ? <span className="pill warn tnum">{euros(x.aEncaisser)} à encaisser</span> : null}</p>
                        <Frise frise={x.frise} onChange={charger} />
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <div className="crm-grille2">
                <section className="psh-panel" aria-labelledby="crm-client-fil">
                  <header><h2 id="crm-client-fil">Tout ce qui s’est passé</h2><span className="tag tnum">{f.chronologie.length}</span></header>
                  <div className="crm-corps">
                    <div className="crm-filtres-fil" role="group" aria-label="Filtrer le fil">
                      {FILTRES_CHRONO.map((x) => (
                        <button key={x} type="button" className={filtre === x ? 'on' : ''} aria-pressed={filtre === x} onClick={() => setFiltre(x)}>{LIBELLES_FILTRE_CHRONO[x]} <span className="tnum">{nb?.[x] ?? 0}</span></button>
                      ))}
                    </div>
                    {fil.length === 0 ? <p className="crm-vide">Rien dans ce filtre.</p> : (
                      <ol className="crm-fil">
                        {fil.map((e, i) => {
                          const jour = jourEvenement(e.quand)
                          const nouveauJour = i === 0 || jourEvenement(fil[i - 1].quand) !== jour
                          return (
                            <li key={e.cle} className={`f-${e.famille}`}>
                              {nouveauJour && <p className="crm-fil-jour">{jour === f.jour ? 'Aujourd’hui' : dateFr(jour)}</p>}
                              <div className="crm-fil-evt">
                                <i aria-hidden="true" />
                                <div>
                                  <p className="crm-fil-titre">{e.href ? <Lien href={e.href}>{e.titre}</Lien> : e.titre}{e.montant !== null ? <span className="tnum"> · {euros(e.montant)}</span> : null}{/T/.test(e.quand) ? <time className="tnum">{dateHeureFr(e.quand).slice(-5)}</time> : null}</p>
                                  {e.detail && <p className="crm-fil-detail">{e.detail}</p>}
                                </div>
                              </div>
                            </li>
                          )
                        })}
                      </ol>
                    )}
                  </div>
                </section>

                <div className="crm-pile">
                  <section className="psh-panel" aria-labelledby="crm-client-rappels">
                    <header><h2 id="crm-client-rappels">Rappels et rendez-vous</h2><span className="tag tnum">{f.rappels.filter((r) => !r.fait_le).length}</span></header>
                    <div className="crm-corps">
                      {!f.rappelsDisponibles ? <p className="crm-vide">Les rappels s’installent : ils apparaîtront ici dès la mise à jour de votre espace.</p> : (
                        <>
                          <ListeRappels rappels={f.rappels.filter((r) => !r.fait_le)} jour={f.jour} onChange={charger} avecCible vide="Aucun rappel pour ce client." />
                          <MeLeRappeler cible={{ client: f.client.id }} jour={f.jour} onChange={charger} libelle="+ Rappel ou rendez-vous" />
                        </>
                      )}
                    </div>
                  </section>

                  <section className="psh-panel" aria-labelledby="crm-client-notes">
                    <header><h2 id="crm-client-notes">Notes</h2></header>
                    <div className="crm-corps">
                      {f.notes.length === 0 ? <p className="crm-vide">Aucune note.</p> : (
                        <ul className="crm-notes">{f.notes.map((n) => (
                          <li key={n.id}><p>{n.texte}</p><span className="muted tnum">{dateHeureFr(n.cree_le)}</span>
                            <button type="button" className="psh-btn ghost danger" aria-label="Supprimer cette note" onClick={() => void supprimerNote(n.id)}>×</button></li>
                        ))}</ul>
                      )}
                      <form className="crm-form" onSubmit={ajouterNote} aria-label="Ajouter une note sur ce client">
                        <label className="crm-champ">Nouvelle note<textarea ref={champNote} rows={3} maxLength={4000} value={texte} onChange={(e) => setTexte(e.target.value)} aria-describedby="crm-aide-note-client" /></label>
                        <p className="crm-aide" id="crm-aide-note-client">{AIDE_TEXTE_LIBRE}</p>
                        <div><button className="psh-btn ghost" type="submit" disabled={!texte.trim()}>Ajouter la note</button></div>
                      </form>
                    </div>
                  </section>
                </div>
              </div>

              <details className="crm-pieces-type">
                <summary>Les pièces, rangées par type</summary>
                <div className="crm-grille2">
                  <Bloc titre="Demandes" vide="Aucune demande reçue de ce client." n={f.demandes.length}>
                    {f.demandes.map((d) => <li key={d.id}><Lien href="/messages">{d.type_chantier ?? 'Demande'}{d.ville ? ` · ${d.ville}` : ''}</Lien><span className="muted">{dateFr(d.created_at)} · {LIBELLES_DEMANDE[d.statut ?? ''] ?? d.statut ?? '—'}</span></li>)}
                  </Bloc>
                  <Bloc titre="Devis" vide="Aucun devis." n={f.devis.length}>
                    {f.devis.map((d) => <li key={d.id}><Lien href={`/devis/${d.id}`}>{[d.numero, d.objet].filter(Boolean).join(' · ') || 'Devis'}</Lien><span className="tnum">{euros(enCentimes(d.total_ttc))} · {LIBELLES_DEVIS[d.statut ?? ''] ?? d.statut}</span></li>)}
                  </Bloc>
                  <Bloc titre="Factures" vide="Aucune facture." n={f.factures.length}>
                    {f.factures.map((x) => <li key={x.id}><Lien href="/factures">{x.numero ?? 'Facture'}{x.avoir_de ? ' (avoir)' : ''}</Lien><span className="tnum">{euros(enCentimes(x.total_ttc))} · {LIBELLES_FACTURE[x.statut ?? ''] ?? x.statut} · {dateFr(x.date_emission)}</span></li>)}
                  </Bloc>
                  <Bloc titre="Chantiers" vide="Aucun chantier." n={f.chantiers.length}>
                    {f.chantiers.map((c) => <li key={c.id}><Lien href={`/crm/chantiers/${c.id}`}>{c.titre}</Lien><span className={`pill ${TON_STATUT_CHANTIER[c.statut] ?? 'muted'}`}>{LIBELLES_STATUT_CHANTIER[c.statut as StatutChantier] ?? c.statut}</span></li>)}
                  </Bloc>
                </div>
              </details>
            </div>
          )}
    </AppShell>
  )
}

function Bloc({ titre, vide, n, children }: { titre: string; vide: string; n: number; children: ReactNode }) {
  const id = `crm-bloc-${titre.toLowerCase()}`
  return (
    <section className="psh-panel" aria-labelledby={id}>
      <header><h2 id={id}>{titre}</h2><span className="tag tnum">{n}</span></header>
      <div className="crm-corps">{n === 0 ? <p className="crm-vide">{vide}</p> : <ul className="crm-liste">{children}</ul>}</div>
    </section>
  )
}
