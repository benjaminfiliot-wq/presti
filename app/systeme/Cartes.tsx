'use client'
import { useState } from 'react'
import Link from 'next/link'
import { libelleOutil } from '@/app/assistant/CarteView'
import { LIBELLE_TYPE, type TypePilote } from '@/lib/pilote/regles'
import { Icone } from './Coque'
import { decider, heureFr } from './donnees'

// Les briques communes aux écrans : la ligne « fait : … » (B4), le feu vert (la signature visuelle, seul vert de l'interface), et le
// chemin manuel (B3). Un bouton d'assistant n'existe jamais sans son chemin manuel à côté (le juge le vérifie).
export type CarteBrute = {
  id: string; outil: string; mode: string; statut: string; titre: string
  apercu?: { lignes?: { label: string; valeur: string }[]; alertes?: string[]; message?: { a: string; objet: string; texte: string } | null; lot?: { retenus: { numero: string; client: string | null }[]; exclus: { numero: string; client: string | null; motif: string }[] } } | null
  resultat_resume?: string | null; cree_le: string; expire_le?: string | null
}

/** « fait : … » = ce que l'étape de préparation a RÉELLEMENT enregistré sur la carte (ses lignes et ses alertes), jamais un texte inventé. */
export function ResumeFait({ c }: { c: CarteBrute }) {
  const l = c.apercu?.lignes ?? []
  const morceaux = [...l.slice(0, 3).map((x) => `${x.label} : ${x.valeur}`), ...((c.apercu?.alertes ?? []).slice(0, 2))]
  if (c.resultat_resume) morceaux.unshift(c.resultat_resume)
  if (!morceaux.length) return null
  return <p className="fait">fait : <b>{morceaux[0]}</b>{morceaux.length > 1 ? ` · ${morceaux.slice(1).join(' · ')}` : ''}</p>
}

/** Le nom d'une action en français ; un identifiant inconnu se dit « Action préparée », jamais tel quel. */
export const nomOutil = (o: string): string => { const l = libelleOutil(o); return l === o ? 'Action préparée' : l }
export const nomTypePilote = (t: string): string => LIBELLE_TYPE[t as TypePilote]?.label ?? 'Action préparée'

/** Le chemin manuel d'une carte : l'outil du métier où l'artisan fait la même chose lui-même. */
export function lienManuel(outil: string): { href: string; libelle: string } {
  if (/devis/.test(outil)) return { href: '/devis', libelle: 'Faire le devis moi-même' }
  if (/facture|encaiss|impay/.test(outil)) return { href: '/factures', libelle: 'Le faire moi-même' }
  if (/stock|article|tarif/.test(outil)) return { href: '/inventaire', libelle: 'Le faire moi-même' }
  return { href: '/assistant', libelle: 'Répondre moi-même' }
}

export function CarteAValider({ c, nom, coche, onCoche, onFait }: { c: CarteBrute; nom?: string | null; coche: boolean; onCoche: (v: boolean) => void; onFait: (message: string) => void }) {
  const [occupee, setOccupee] = useState(false)
  const [retour, setRetour] = useState('')
  const manuel = lienManuel(c.outil)
  const lot = c.apercu?.lot
  async function agir(d: 'confirmer' | 'refuser') {
    setOccupee(true)
    const r = await decider(c.id, d)
    setRetour(r.message); setOccupee(false)
    if (r.ok) onFait(r.message)
  }
  return (
    <article className="ligne" data-action={c.outil} data-statut="a-valider">
      <input type="checkbox" className="coche" checked={coche} onChange={(e) => onCoche(e.target.checked)} aria-label={`Sélectionner : ${c.titre}`} />
      <div>
        <span className="type">{nomOutil(c.outil)}</span>
        <p className="titre">{c.titre}</p>
        {c.apercu?.message ? <div className="apercu" data-surface="client"><span className="de">Message préparé, signé {nom ?? 'de votre nom'}</span>{c.apercu.message.texte}</div> : null}
        {lot ? (
          <div className="lot-detail">
            <div><b>Reçoivent ({lot.retenus.length})</b><br />{lot.retenus.map((r) => r.client ?? r.numero).join(', ')}</div>
            {lot.exclus.length ? <div><b>Exclu ({lot.exclus.length})</b><br />{lot.exclus.map((x) => `${x.client ?? x.numero} : ${x.motif}`).join(' · ')}</div> : null}
          </div>
        ) : null}
        <ResumeFait c={c} />
        {retour ? <p className="fait" role="status">{retour}</p> : null}
      </div>
      <div className="actions">
        <button type="button" className="feu" aria-label={`${lot ? 'Valider le lot' : 'Valider et envoyer'} : ${c.titre}`} disabled={occupee} onClick={() => agir('confirmer')}>{lot ? 'Valider le lot' : 'Valider et envoyer'}</button>
        <div className="rang">
          <Link className="btn petit" href={manuel.href} aria-label={`${manuel.libelle} : ${c.titre}`} data-manuel>{manuel.libelle}</Link>
          <button type="button" className="btn petit discret" aria-label={`Écarter : ${c.titre}`} disabled={occupee} onClick={() => agir('refuser')}>Écarter</button>
        </div>
      </div>
    </article>
  )
}

/** « Une question à la fois » (B4) : les questions sont des lacunes réelles (un chantier sans date de début) ; on répond dans l'outil
 *  du métier, rien n'est écrit d'ici. */
export function PanneauQuestion({ questions }: { questions: { id: string; texte: string; href: string }[] }) {
  const [rang, setRang] = useState(0)
  const q = questions[rang]
  return (
    <section className="carte assistant">
      <h2>Vos assistants</h2>
      {q ? (
        <div className="question" data-question="ouverte" aria-live="polite">
          <span className="pas">Question {rang + 1} sur {questions.length}{rang + 1 < questions.length ? ' · la suivante attend votre réponse' : ''}</span>
          <p>{q.texte}</p>
          <div className="choix">
            <Link className="btn petit" href={q.href}>Renseigner la date</Link>
            {questions.length > 1 ? <button type="button" className="btn petit discret" onClick={() => setRang((r) => (r + 1) % questions.length)}>Plus tard</button> : null}
          </div>
        </div>
      ) : <p className="vide">Aucune question en attente. Vos assistants vous en poseront une à la fois quand il leur manquera une information.</p>}
      <Link className="saisie" href="/assistant"><span>Demandez : « Quelles factures sont impayées ? »</span><span className="btn plein" aria-hidden="true"><Icone nom="envoi" /></span></Link>
    </section>
  )
}


export { heureFr }
