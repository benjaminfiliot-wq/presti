'use client'

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/app/AppShell'
import { LIBELLES_STATUT_CHANTIER, type StatutChantier } from '@/lib/crm/valider'
import { appel, dateFr, dateHeureFr, enCentimes, euros, LIBELLES_DEMANDE, LIBELLES_DEVIS, LIBELLES_FACTURE, TON_STATUT_CHANTIER } from '../../client'

// La fiche client 360° : coordonnées, demandes, devis, factures, chantiers, notes, prochain rendez-vous. Le client est
// reconstitué à partir des pièces (lib/crm/clients.ts) ; l'adresse de la page est son empreinte, ou une de ses pièces.
type Fiche = {
  client: { id: string; nom: string | null; email: string | null; telephone: string | null; adresse: string | null }
  demandes: { id: string; statut: string | null; type_chantier: string | null; canal: string | null; ville: string | null; created_at: string | null }[]
  devis: { id: string; numero: string | null; objet: string | null; statut: string | null; total_ttc: number | null; date_emission: string | null; accepte_le: string | null }[]
  factures: { id: string; numero: string | null; statut: string | null; total_ttc: number | null; date_emission: string | null; date_echeance: string | null; avoir_de: string | null }[]
  chantiers: { id: string; titre: string; statut: string; date_debut: string | null; date_fin_prevue: string | null }[]
  notes: { id: string; texte: string; cree_le: string }[]
  prochainRendezVous: null
  prochainChantier: { id: string; titre: string; date_debut: string } | null
  signe: number | null
}

export default function FicheClientPage() {
  const router = useRouter()
  const { ref } = useParams<{ ref: string }>()
  const [f, setF] = useState<Fiche | null>(null)
  const [erreur, setErreur] = useState('')
  const [texte, setTexte] = useState('')
  const [message, setMessage] = useState<{ texte: string; erreur: boolean } | null>(null)

  const charger = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    if (!data.session) { router.replace('/login'); return }
    const r = await appel<Fiche>(`/api/crm/clients?ref=${encodeURIComponent(ref)}`)
    if (!r.ok) { setErreur(r.erreur); return }
    setErreur(''); setF(r.corps)
  }, [ref, router])
  useEffect(() => { void charger() }, [charger])

  async function ajouterNote(e: FormEvent) {
    e.preventDefault()
    if (!f) return
    setMessage(null)
    const r = await appel('/api/crm/notes', { method: 'POST', body: { texte, client: f.client.id } })
    if (!r.ok) { setMessage({ texte: r.erreur, erreur: true }); return }
    setTexte(''); await charger()
  }
  async function supprimerNote(id: string) {
    if (!confirm('Supprimer cette note ?')) return
    const r = await appel(`/api/crm/notes/${id}`, { method: 'DELETE' })
    if (!r.ok) { setMessage({ texte: r.erreur, erreur: true }); return }
    await charger()
  }

  return (
    <AppShell active="crm" title={f?.client.nom ?? 'Client'} crumb="CRM atelier · Fiche client" wide>
      <p><a className="crm-retour" href="/crm?vue=clients">← Tous les clients</a></p>
      {erreur ? <div className="psh-panel"><div className="psh-empty" role="alert">{erreur}</div></div>
        : !f ? <p className="muted" role="status">Lecture de la fiche…</p>
          : (
            <div className="crm-fiche">
              {message && <p className={`crm-message${message.erreur ? ' erreur' : ''}`} role={message.erreur ? 'alert' : 'status'}>{message.texte}</p>}
              <section className="psh-panel crm-entete" aria-labelledby="crm-client-nom">
                <div className="crm-entete-haut"><div><h2 id="crm-client-nom">{f.client.nom ?? 'Client sans nom'}</h2></div></div>
                <div className="crm-entete-chiffres">
                  <div><span className="lab">E-mail</span><span>{f.client.email ? <a href={`mailto:${f.client.email}`}>{f.client.email}</a> : '—'}</span></div>
                  <div><span className="lab">Téléphone</span><span>{f.client.telephone ? <a href={`tel:${f.client.telephone}`}>{f.client.telephone}</a> : '—'}</span></div>
                  <div><span className="lab">Adresse</span><span>{f.client.adresse ?? '—'}</span></div>
                  <div><span className="lab">Total signé</span><span className="tnum">{euros(f.signe)}</span></div>
                  <div><span className="lab">Prochain rendez-vous</span><span title="Presti n’a pas encore d’agenda de rendez-vous pour vos clients.">—</span></div>
                  <div><span className="lab">Prochain chantier</span><span>{f.prochainChantier ? <a href={`/crm/chantiers/${f.prochainChantier.id}`}>{dateFr(f.prochainChantier.date_debut)} · {f.prochainChantier.titre}</a> : '—'}</span></div>
                </div>
              </section>

              <div className="crm-grille2">
                <Bloc titre="Demandes" vide="Aucune demande reçue de ce client." n={f.demandes.length}>
                  {f.demandes.map((d) => <li key={d.id}><a href="/messages">{d.type_chantier ?? 'Demande'}{d.ville ? ` · ${d.ville}` : ''}</a><span className="muted">{dateFr(d.created_at)} · {LIBELLES_DEMANDE[d.statut ?? ''] ?? d.statut ?? '—'}</span></li>)}
                </Bloc>
                <Bloc titre="Devis" vide="Aucun devis." n={f.devis.length}>
                  {f.devis.map((d) => <li key={d.id}><a href={`/devis/${d.id}`}>{[d.numero, d.objet].filter(Boolean).join(' · ') || 'Devis'}</a><span className="tnum">{euros(enCentimes(d.total_ttc))} · {LIBELLES_DEVIS[d.statut ?? ''] ?? d.statut}</span></li>)}
                </Bloc>
                <Bloc titre="Factures" vide="Aucune facture." n={f.factures.length}>
                  {f.factures.map((x) => <li key={x.id}><a href="/factures">{x.numero ?? 'Facture'}{x.avoir_de ? ' (avoir)' : ''}</a><span className="tnum">{euros(enCentimes(x.total_ttc))} · {LIBELLES_FACTURE[x.statut ?? ''] ?? x.statut} · {dateFr(x.date_emission)}</span></li>)}
                </Bloc>
                <Bloc titre="Chantiers" vide="Aucun chantier." n={f.chantiers.length}>
                  {f.chantiers.map((c) => <li key={c.id}><a href={`/crm/chantiers/${c.id}`}>{c.titre}</a><span className={`pill ${TON_STATUT_CHANTIER[c.statut] ?? 'muted'}`}>{LIBELLES_STATUT_CHANTIER[c.statut as StatutChantier] ?? c.statut}</span></li>)}
                </Bloc>
              </div>

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
                    <label className="crm-champ">Nouvelle note<textarea rows={3} maxLength={4000} value={texte} onChange={(e) => setTexte(e.target.value)} /></label>
                    <div><button className="psh-btn ghost" type="submit" disabled={!texte.trim()}>Ajouter la note</button></div>
                  </form>
                </div>
              </section>
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
