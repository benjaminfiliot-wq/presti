'use client'

import { useState } from 'react'
import { relTime } from '@/lib/direction/fraicheur'
import { apiDirection } from '../../client'
import { compteursDe } from '../Barre'
import type { BarreDonnees, Env } from '../Station'
import Fenetre, { Corps, ListeTaches, Onglets, Tuile, type SalleProps, type TacheServie } from './Fenetre'
import { lienSur, messagePanne, usePanneau, type Rep } from './lecture'

// L'Usine à sites (fiche 026-120, §4.5) : les commandes de sites, de la commande payée à la mise en ligne, et le travail du
// Livreur. COMMANDES · MOIS est LE MÊME objet que COMMANDES dans la barre (barre.commandes_mois) ; l'aperçu est le lien signé
// que la route sert, ouvert dans un nouvel onglet — jamais d'aperçu sans lien. La mise en ligne se fait dans l'onglet Sites du
// Poste (026-078) : ici, une carte y mène.
type Commande = { id: string; etape: string; depuis: string; apercu: string | null; metier: string | null; commune: string | null }
type Vue = { commandes: Commande[]; aValider: number }
type Livreur = { taches: TacheServie[] }

const ETAPES: [string, string][] = [['payee', 'payée'], ['generee', 'générée'], ['validee', 'validée'], ['en_ligne', 'en ligne']]
const ONGLETS = [{ cle: 'livreur', libelle: 'LIVREUR' }, { cle: 'a_valider', libelle: 'À VALIDER' }, { cle: 'livrees', libelle: 'LIVRÉES' }, { cle: 'atelier', libelle: 'ATELIER' }]

function Ligne({ c }: { c: Commande }) {
  const rang = ETAPES.findIndex(([cle]) => cle === c.etape)
  const lien = lienSur(c.apercu)
  return (
    <li className="mc-commande" data-commande={c.id.slice(0, 8)} data-etape={c.etape}>
      <div className="mc-commande-tete">
        <span className="mc-gras">{c.metier ?? '—'}</span>
        <span>{c.commune ?? '—'}</span>
        <small className="mc-doux">{relTime(c.depuis)}</small>
      </div>
      <ol className="mc-etapes" aria-label="Étapes de la commande">
        {ETAPES.map(([cle, libelle], i) => (
          <li key={cle} data-atteinte={i <= rang ? 'oui' : 'non'} aria-current={i === rang ? 'step' : undefined}>{libelle}</li>
        ))}
      </ol>
      {c.etape === 'retiree' ? <small className="mc-doux">retirée</small> : null}
      {lien ? <a className="mc-lien" href={lien} target="_blank" rel="noopener noreferrer">Voir l’aperçu</a> : null}
    </li>
  )
}

export default function Usine({ barre, equipage, poser, onFermer }: SalleProps & { barre: Env<BarreDonnees> | null }) {
  const etat = usePanneau(() => apiDirection<Rep<Vue>>('/api/controle/station?vue=salle&salle=usine'))
  const livreur = usePanneau(() => apiDirection<Rep<Livreur>>('/api/controle/station?vue=agent&nom=livreur'))
  const [onglet, setOnglet] = useState('livreur')
  const compteurs = compteursDe(barre, null, null, null)
  const commandes = compteurs.find((c) => c.cle === 'commandes_mois')
  const enLigne = compteurs.find((c) => c.cle === 'sites_en_ligne')
  const v = etat.rep?.valeur ?? null
  const ensemble = (liste: Commande[], vide: string) => (liste.length === 0 ? <p className="mc-etat">{vide}</p> : <ul className="mc-liste mc-commandes" data-groupe="commandes">{liste.map((c) => <Ligne key={c.id} c={c} />)}</ul>)
  const carte = (n: number) => (n > 0 ? <a className="mc-carte-valider" data-carte-a-valider href="/controle?onglet=sites">{n} {n > 1 ? 'sites' : 'site'} à valider → Mettre en ligne</a> : null)

  return (
    <Fenetre cle="usine" titre="Usine à sites" onFermer={onFermer} etat={etat} resume={{ equipage, poser, taches: v?.commandes?.length ?? null }}>
      <div className="mc-tuiles" data-groupe="usine">
        <Tuile libelle="COMMANDES · MOIS" attribut="commandes-mois" note={commandes?.note}>{commandes?.valeur ?? '…'}</Tuile>
        <Tuile libelle="À VALIDER" attribut="a-valider" note="à relire">{v ? v.aValider : '…'}</Tuile>
        <Tuile libelle="EN GÉNÉRATION" attribut="en-generation" note="payées, pas encore générées">{v ? v.commandes.filter((c) => c.etape === 'payee').length : '…'}</Tuile>
        <Tuile libelle="EN LIGNE" attribut="en-ligne" note={enLigne?.note}>{enLigne?.valeur ?? '…'}</Tuile>
      </div>
      <Corps etat={etat} quoi="Usine à sites">
        {(vue) => (
          <>
            <Onglets liste={ONGLETS} actif={onglet} choisir={setOnglet} nom="Usine à sites" />
            {onglet === 'livreur' ? (
              <>
                {carte(vue.aValider)}
                {ensemble(vue.commandes, 'Aucune commande. Quand un artisan paie son site, elle apparaît ici pour le Livreur.')}
                <h3 className="mc-titre-zone">TÂCHES RÉCENTES DU LIVREUR</h3>
                {livreur.rep?.valeur ? <ListeTaches taches={livreur.rep.valeur.taches ?? []} /> : livreur.rep ? <p className="mc-panne">{messagePanne('Livreur', livreur.rep.erreur ?? livreur.rep.manque ?? 'pas de réponse')}</p> : livreur.panne ? <p className="mc-panne">{messagePanne('Livreur', livreur.panne)}</p> : <p className="mc-etat">Chargement…</p>}
              </>
            ) : null}
            {onglet === 'a_valider' ? <>{carte(vue.aValider)}{ensemble(vue.commandes.filter((c) => c.etape === 'generee'), 'Aucun site à valider.')}</> : null}
            {onglet === 'livrees' ? ensemble(vue.commandes.filter((c) => c.etape === 'en_ligne' || c.etape === 'retiree'), 'Aucun site livré pour l’instant.') : null}
            {onglet === 'atelier' ? (
              <>
                <p className="mc-etat">Les maquettes se jugent dans l’Atelier, avant qu’un artisan ne paie.</p>
                <button type="button" className="mc-bouton" onClick={() => poser({ salle: 'atelier' })}>Ouvrir l’Atelier des maquettes</button>
              </>
            ) : null}
          </>
        )}
      </Corps>
    </Fenetre>
  )
}
