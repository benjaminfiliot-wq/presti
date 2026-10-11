'use client'

import { compteARebours } from '@/lib/pilotage/barre'
import { apiDirection } from '../../client'
import Fenetre, { Corps, Pastille, Tuile, type SalleProps } from './Fenetre'
import { jour, usePanneau, type Rep } from './lecture'

// La Salle de réunion (fiche 026-120, §4.5) : la prochaine réunion du Chef (compteARebours, le même texte que la barre), le
// bandeau « Réunion en cours » quand elle se tient, les lignes du dernier compte rendu dans l'ordre servi, l'objectif fixé
// « PAR LE CHEF » et les idées avec leur statut. Lecture seule : trancher une idée se fait dans Attention.
type Idee = { cle: string; question: string; statut: string; choix?: string | null }
type Objectif = { libelle: string; par?: string | null }
type Vue = {
  prochaine_le: string | null
  enCours: boolean
  derniere: { jour: string; statut: string; lignes: string[]; objectif?: unknown } | null
  idees: Idee[]
  objectif?: Objectif | null
}

/** L'objectif servi : au premier niveau de la vue, ou dans le dernier compte rendu (texte seul ou { libelle, par }). */
function objectifDe(v: Vue): Objectif | null {
  const brut = v.objectif ?? v.derniere?.objectif ?? null
  if (typeof brut === 'string') return { libelle: brut }
  if (brut && typeof brut === 'object' && typeof (brut as Objectif).libelle === 'string') return brut as Objectif
  return null
}
/** Le statut d'une idée : servi tel quel ; la forme brute de la base (ouverte, tranchée et son choix) est dite en français. */
function statutIdee(i: Idee): string {
  if (i.statut === 'ouverte') return 'à trancher dans Attention'
  if (i.statut === 'tranchee') return i.choix === 'lancer' ? 'lancée' : i.choix === 'reporter' ? 'reportée' : 'tranchée'
  return i.statut
}
const tonIdee = (s: string) => (/trancher/.test(s) ? 'warn' : /lanc/.test(s) ? 'ok' : 'muet')

export default function Reunion({ equipage, poser, onFermer }: SalleProps) {
  const etat = usePanneau(() => apiDirection<Rep<Vue>>('/api/controle/station?vue=salle&salle=reunion'))
  const v = etat.rep?.valeur ?? null
  return (
    <Fenetre cle="reunion" titre="Salle de réunion" onFermer={onFermer} etat={etat} resume={{ equipage, poser, taches: v?.idees?.length ?? null }}>
      <Corps etat={etat} quoi="Salle de réunion">
        {(vue) => {
          const objectif = objectifDe(vue)
          return (
            <>
              {vue.enCours ? <p className="mc-bandeau-reunion" data-reunion-en-cours role="status"><Pastille ton="actif">Réunion en cours</Pastille></p> : null}
              <div className="mc-tuiles" data-groupe="reunion">
                <Tuile libelle="PROCHAINE RÉUNION" attribut="prochaine">{vue.prochaine_le ? compteARebours(new Date(vue.prochaine_le), new Date()) : '—'}</Tuile>
              </div>
              <h3 className="mc-titre-zone">{vue.derniere ? `DERNIER COMPTE RENDU · ${jour(vue.derniere.jour)}` : 'DERNIER COMPTE RENDU'}</h3>
              {vue.derniere && vue.derniere.lignes?.length ? (
                <ol className="mc-liste mc-lignes" data-groupe="compte-rendu">
                  {vue.derniere.lignes.map((l, i) => <li key={i}>{l}</li>)}
                </ol>
              ) : <p className="mc-etat">Aucune réunion tenue pour l’instant.</p>}
              <h3 className="mc-titre-zone">OBJECTIF FIXÉ</h3>
              {objectif ? <p className="mc-objectif-fixe" data-objectif><span>{objectif.libelle}</span> <Pastille ton="actif">{objectif.par ?? 'PAR LE CHEF'}</Pastille></p> : <p className="mc-etat">Aucun objectif fixé.</p>}
              <h3 className="mc-titre-zone">IDÉES DE LA RÉUNION</h3>
              {(vue.idees ?? []).length === 0 ? <p className="mc-etat">Aucune idée pour l’instant.</p> : (
                <ul className="mc-liste" data-groupe="idees">
                  {(vue.idees ?? []).map((i) => { const s = statutIdee(i); return <li key={i.cle}><span>{i.question}</span><Pastille ton={tonIdee(s)}>{s}</Pastille></li> })}
                </ul>
              )}
            </>
          )
        }}
      </Corps>
    </Fenetre>
  )
}
