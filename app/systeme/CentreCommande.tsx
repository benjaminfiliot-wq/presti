'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import Coque, { Lecture, PasEncore } from './Coque'
import { CarteAValider, PanneauQuestion, type CarteBrute } from './Cartes'
import { decider, dateFr, dateHeureFr, eur, heureFr, useLecture } from './donnees'

type Donnees = {
  signature: boolean; offre: 'studio' | 'signature'; nom: string | null; metier: string | null
  cartes: CarteBrute[]; cartesDisponibles: boolean
  file: { id: string; libelle: string; part_le: string }[]
  leads: { id: string; nom_prospect: string | null; type_chantier: string | null; canal: string | null; created_at: string }[]
  facturesEnRetard: { id: string; numero: string | null; client: string | null; montant: number; echeance: string | null }[]
  devisSansReponse: { nombre: number; montant: number; premier: { client: string | null; numero: string | null } | null }
  chantiers: { id: string; titre: string; client_nom: string | null; statut: string; date_debut: string | null }[]
  calculeLe: string
}

export default function CentreCommande() {
  const { lecture, relire } = useLecture<Donnees>('accueil')
  const [cochees, setCochees] = useState<Record<string, boolean>>({})
  const [lotEnCours, setLotEnCours] = useState(false)
  const [annonce, setAnnonce] = useState('')
  const d = lecture.etat === 'ok' ? lecture.donnees : null
  const cartes = d?.cartes ?? []
  const choisies = useMemo(() => cartes.filter((c) => cochees[c.id] !== false), [cartes, cochees])
  const questions = (d?.chantiers ?? []).filter((c) => !c.date_debut).map((c) => ({ id: c.id, texte: `Chantier ${c.client_nom ?? c.titre} : quelle est la date de début ?`, href: '/crm?vue=chantiers' }))

  async function toutValider() {
    setLotEnCours(true)
    for (const c of choisies) await decider(c.id, 'confirmer')
    setLotEnCours(false); relire()
  }

  return (
    <Coque ecran="accueil" aValider={lecture.etat === 'ok' ? cartes.length : null} signature={d?.signature} nom={d?.nom} metier={d?.metier}>
      {lecture.etat !== 'ok' ? <Lecture etat={lecture.etat} message={lecture.etat === 'erreur' ? lecture.message : undefined} /> : (
        <div className="grille">
          <div>
            <p role="status" className="sr">{annonce}</p>
            <h1 className="salut">Bonjour. Voici votre journée.</h1>
            <p className="salut-sous">{cartes.length
              ? `${cartes.length} chose${cartes.length > 1 ? 's attendent' : ' attend'} votre feu vert.`
              : 'Rien n’attend votre feu vert pour le moment.'}</p>

            <section aria-label="La barre du jour" className="jour entre">
              <div className="carte jour-compte"><span className="chiffre mono">{cartes.length}</span><span className="lib">à valider<br />avant de partir</span></div>
              {d!.leads[0] ? (
                <article className="carte prio" data-priorite="1">
                  <span className="nature">À répondre</span>
                  <Link className="quoi" href="/assistant">{d!.leads[0].type_chantier ?? 'Nouvelle demande'}, {d!.leads[0].nom_prospect ?? 'un prospect'}</Link>
                  <span className="detail">Demande reçue à <span className="nb">{heureFr(d!.leads[0].created_at)}</span>.</span>
                </article>
              ) : null}
              {d!.devisSansReponse.nombre ? (
                <article className="carte prio relancer" data-priorite="2">
                  <span className="nature">À relancer</span>
                  <Link className="quoi" href="/crm?vue=pipeline">{d!.devisSansReponse.nombre} devis sans réponse</Link>
                  <span className="detail"><span className="nb">{eur(d!.devisSansReponse.montant)}</span> TTC, envoyés il y a plus de 5 jours.</span>
                </article>
              ) : null}
              {d!.facturesEnRetard[0] ? (
                <article className="carte prio retard" data-priorite="3">
                  <span className="nature">En retard de paiement</span>
                  <Link className="quoi" href="/factures">Facture {d!.facturesEnRetard[0].numero ?? ''}, {d!.facturesEnRetard[0].client ?? 'client'}</Link>
                  <span className="detail"><span className="nb">{eur(d!.facturesEnRetard[0].montant)}</span>, échéance passée le <span className="nb">{dateFr(d!.facturesEnRetard[0].echeance)}</span>.</span>
                </article>
              ) : null}
            </section>

            <section className="section carte matin" aria-labelledby="titre-matin">
              <div className="matin-tete"><h2 id="titre-matin">Votre matin, en une page</h2><span className="matin-heure">calculée à <span className="nb">{heureFr(d!.calculeLe)}</span> sur vos demandes, devis et factures</span></div>
              <div className="matin-grille">
                <div className="bloc"><h3>Arrivé depuis 3 jours</h3><span className="gros mono">{d!.leads.length}</span><p>{d!.leads.length ? 'demandes reçues sur votre page.' : 'aucune nouvelle demande.'}</p></div>
                <div className="bloc"><h3>Devis sans réponse</h3><span className="gros mono">{eur(d!.devisSansReponse.montant)}</span><p>{d!.devisSansReponse.nombre} devis envoyés il y a plus de 5 jours.</p></div>
                <div className="bloc"><h3>Factures en retard</h3><span className="gros mono">{d!.facturesEnRetard.length ? eur(d!.facturesEnRetard.reduce((s, f) => s + f.montant, 0)) : '0 €'}</span><p>{d!.facturesEnRetard.length} facture{d!.facturesEnRetard.length > 1 ? 's' : ''} à échéance passée.</p></div>
              </div>
              <span className="source">Chiffres comptés par le logiciel sur vos données du <b>{dateHeureFr(d!.calculeLe)}</b>. Aucun montant n’est estimé par l’IA.</span>
              <div className="matin-fin">La page s’arrête ici : la suite, c’est vous qui la validez.<a className="btn petit" href="#a-valider">Aller aux {cartes.length} cartes</a></div>
            </section>

            {d!.file.length ? (
              <section className="section" aria-labelledby="titre-delai">
                <div className="section-tete"><h2 id="titre-delai">Part dans quelques minutes</h2><p>Encore annulable dans « Ce qui a été fait ».</p><div className="droite"><Link className="btn petit" href="/systeme/fait">Ouvrir</Link></div></div>
                <div className="carte file">{d!.file.map((f) => <div key={f.id} className="ligne"><span /><p className="titre">{f.libelle} <span className="nb">· part à {heureFr(f.part_le)}</span></p></div>)}</div>
              </section>
            ) : null}

            <section className="section" id="a-valider" aria-labelledby="titre-valider">
              <div className="section-tete"><h2 id="titre-valider">À valider</h2><p>{d!.signature ? 'Ce qui n’est pas réglé sur « part seul » attend ici.' : 'En Studio, rien ne part sans votre feu vert.'}</p></div>
              {!d!.cartesDisponibles ? <PasEncore>Les cartes de l’assistant ne sont pas encore ouvertes sur votre compte.</PasEncore>
                : !cartes.length ? <p className="carte vide">Aucune carte n’attend votre feu vert.</p> : (
                  <div className="carte">
                    <div className="barre-lot">
                      <label><input type="checkbox" className="coche" checked={choisies.length === cartes.length} onChange={(e) => setCochees(Object.fromEntries(cartes.map((c) => [c.id, e.target.checked])))} /> {choisies.length} carte{choisies.length > 1 ? 's' : ''} sélectionnée{choisies.length > 1 ? 's' : ''}</label>
                      <button type="button" className="feu lot" disabled={!choisies.length || lotEnCours} onClick={toutValider} data-tout-valider>Tout valider ({choisies.length})</button>
                    </div>
                    <div className="file entre">
                      {cartes.map((c) => <CarteAValider key={c.id} c={c} nom={d!.nom} coche={cochees[c.id] !== false} onCoche={(v) => setCochees((o) => ({ ...o, [c.id]: v }))} onFait={(m) => { setAnnonce(m); relire() }} />)}
                    </div>
                  </div>
                )}
            </section>
          </div>

          <aside className="rail" aria-label="Colonne de droite">
            <PanneauQuestion questions={questions} />
            <section className="carte recents" aria-label="Récents">
              <h3>Chantiers en cours</h3>
              <ul>{d!.chantiers.length ? d!.chantiers.map((c) => <li key={c.id}>{c.client_nom ?? c.titre}<span className="nb">{c.date_debut ? `début le ${dateFr(c.date_debut)}` : 'sans date'}</span></li>) : <li>Aucun chantier en cours</li>}</ul>
            </section>
          </aside>
        </div>
      )}
    </Coque>
  )
}
