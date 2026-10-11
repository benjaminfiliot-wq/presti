'use client'

import { euros } from '@/lib/direction/fraicheur'
import { apiDirection } from '../../client'
import { PauseAgent } from '../Gestes'
import type { Env, Equipage, Role } from '../Station'
import Fenetre, { Corps, GENRE_DE, ListeTaches, Pastille, type PoserUrl, type TacheServie } from './Fenetre'
import { HORS_PERIMETRE, estNombre, heure, jour, messagePanne, usePanneau, type Rep } from './lecture'

// La fiche d'un agent (fiche 026-120, écran 3, §4.4) : qui il est, son état et son modèle, ses tâches récentes avec leur
// coût, et ce qui est propre à son métier — les consignes reçues (le Chef), les technologies de formulaire (les facteurs), les
// réponses exactes (le Répondeur, seul agent dont la fiche montre un texte de prospect). Pause : le geste du fondateur
// (026-117), pour le rôle direction seulement. Lue à l'ouverture puis toutes les 30 s, jamais fermée.
type Cout = { numero?: number; tache?: string; eur?: number; montant_eur?: number }
type Consigne = { id: number; le: string; texte: string; lue?: boolean; type?: string }
type Technologie = { technologie: string; envois?: number; echecs_affilee?: number; etat?: string }
type Reponse = { id: string; recu_le: string; classe?: string; texte_recu: string; reponse_envoyee: string | null }
type Vue = {
  nom: string; libelle: string; role: string; etat: string; cadence: string
  position?: { salle: string; motif: string }
  battement_le: string | null; prochain_le: string | null
  modele: { texte: string; source: string }; modele_le: string | null
  taches: TacheServie[]
  argent: Env<{ cout_mois_eur: number | null; coutParTache: Cout[] }>
  consignes?: Consigne[]; technologies?: Technologie[]; reponses?: Reponse[]
}

const tonEtat = (e: string) => (e === 'actif' ? 'ok' : e === 'pause' ? 'muet' : e === 'panne' || e === 'disjoncteur' ? 'crit' : 'warn')

export default function FicheAgent({ nom, role, equipage, onFermer }: { nom: string; role: Role; equipage: Env<Equipage> | null; poser?: PoserUrl; onFermer: () => void }) {
  const etat = usePanneau(() => apiDirection<Rep<Vue>>(`/api/controle/station?vue=agent&nom=${encodeURIComponent(nom)}`))
  const meta = (equipage?.valeur?.agents ?? []).find((a) => a.nom === nom)
  const v = etat.rep?.valeur ?? null
  const salle = v?.position?.salle ?? meta?.salle ?? ''
  return (
    <Fenetre cle={nom} attribut="data-fiche-agent" titre={v?.libelle ?? meta?.libelle ?? nom} genre={GENRE_DE[salle]} onFermer={onFermer} etat={etat}>
      <Corps etat={etat} quoi={meta?.libelle ?? nom}>
        {(vue) => {
          const couts = new Map<number, string>()
          const argent = vue.argent
          if (argent?.valeur) for (const c of argent.valeur.coutParTache ?? []) { const n = c.numero; const m = c.eur ?? c.montant_eur; if (n !== undefined && estNombre(m)) couts.set(n, euros(m)) }
          const coutMois = !argent ? '—' : argent.nonMesure ? HORS_PERIMETRE : argent.valeur ? (estNombre(argent.valeur.cout_mois_eur) ? euros(argent.valeur.cout_mois_eur) : '—') : messagePanne('Coûts', argent.erreur ?? argent.manque ?? 'pas de réponse')
          return (
            <>
              <dl className="mc-identite" data-groupe="identite">
                <div><dt>Nom</dt><dd>{vue.libelle}</dd></div>
                <div><dt>Rôle</dt><dd>{vue.role}</dd></div>
                <div><dt>État</dt><dd><Pastille ton={tonEtat(vue.etat)}>{vue.etat}</Pastille></dd></div>
                <div><dt>Cadence</dt><dd>{vue.cadence}</dd></div>
                <div><dt>Dernier battement</dt><dd className="mc-chiffre">{heure(vue.battement_le)}</dd></div>
                <div><dt>Prochain passage</dt><dd className="mc-chiffre">{heure(vue.prochain_le)}</dd></div>
                <div><dt>Modèle</dt><dd><span data-modele>{vue.modele?.texte ?? '—'}</span>{vue.modele_le ? <small className="mc-doux"> · posé le {jour(vue.modele_le)}</small> : null}</dd></div>
                <div><dt>Coût du mois</dt><dd className="mc-chiffre" data-cout-mois>{coutMois}</dd></div>
              </dl>
              {role === 'direction' ? <div className="mc-fiche-gestes"><PauseAgent nom={nom} etat={vue.etat} /></div> : null}
              <h3 className="mc-titre-zone">TÂCHES RÉCENTES</h3>
              <ListeTaches taches={vue.taches ?? []} couts={couts} />
              {nom === 'chef' ? (
                <>
                  <h3 className="mc-titre-zone">CONSIGNES REÇUES</h3>
                  {(vue.consignes ?? []).length === 0 ? <p className="mc-etat">Aucune consigne.</p> : (
                    <ul className="mc-liste" data-groupe="consignes">
                      {(vue.consignes ?? []).map((c) => (
                        <li key={c.id} data-consigne={c.id}>
                          <span className="mc-texte-exact">{c.texte}</span>
                          <small className="mc-doux">{heure(c.le)}</small>
                          {c.lue === true || c.type === 'consigne_lue' ? <Pastille ton="ok">reçue</Pastille> : <Pastille ton="muet">pas encore lue</Pastille>}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : null}
              {nom === 'facteur' || nom === 'facteur_usine' ? (
                <>
                  <h3 className="mc-titre-zone">TECHNOLOGIES DE FORMULAIRE</h3>
                  {(vue.technologies ?? []).length === 0 ? <p className="mc-etat">Aucune technologie servie.</p> : (
                    <ul className="mc-liste" data-groupe="technologies">
                      {(vue.technologies ?? []).map((g) => (
                        <li key={g.technologie} data-technologie={g.technologie}>
                          <span className="mc-gras">{g.technologie}</span>
                          {estNombre(g.envois) ? <span>{g.envois} {g.envois > 1 ? 'envois' : 'envoi'}</span> : null}
                          {g.etat ? <Pastille ton={g.etat === 'pause' ? 'crit' : 'ok'}>{g.etat === 'pause' ? 'en pause' : 'active'}</Pastille> : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : null}
              {nom === 'repondeur' ? (
                <>
                  <h3 className="mc-titre-zone">DERNIÈRES RÉPONSES</h3>
                  {(vue.reponses ?? []).length === 0 ? <p className="mc-etat">Aucune réponse reçue.</p> : (
                    <ol className="mc-liste mc-fil" data-groupe="reponses">
                      {(vue.reponses ?? []).map((r) => (
                        <li key={r.id} data-reponse={r.id}>
                          <div className="mc-meta"><small className="mc-chiffre">{heure(r.recu_le)}</small>{r.classe ? <Pastille ton="muet">{r.classe}</Pastille> : null}</div>
                          <p className="mc-texte-exact">{r.texte_recu}</p>
                          {r.reponse_envoyee ? <p className="mc-texte-exact mc-envoyee">↳ {r.reponse_envoyee}</p> : null}
                        </li>
                      ))}
                    </ol>
                  )}
                </>
              ) : null}
            </>
          )
        }}
      </Corps>
    </Fenetre>
  )
}
