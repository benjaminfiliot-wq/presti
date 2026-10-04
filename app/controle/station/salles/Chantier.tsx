'use client'

import { apiDirection } from '../../client'
import { relTime } from '@/lib/direction/fraicheur'
import Fenetre, { Corps, Pastille, type SalleProps } from './Fenetre'
import { usePanneau, type Rep } from './lecture'

// Le Chantier du code (fiche 026-164, §4.5) : la file de l'orchestre, ce qui est en cours, les verrous vieux, les derniers PASS
// et FAIL, les PR et les lignes d'Attention, tels que le dernier relevé du poste les a servis, avec l'âge de ce relevé. Le poste
// peut être éteint : l'âge le dit, et un relevé périmé affiche sa phrase servie en évidence. Lecture seule, toutes les minutes.
type Code = {
  file: string[]
  enCours: { id: string; agent: string }[]
  verrousVieux: string[]
  derniers: { id: string; verdict: string }[]
  prs: { ouvertes: number; texte: string }
  attention: string[]
  perime: boolean
  message: string | null
  publie_le: string | null
}

const UNE_MINUTE = 60_000
const estBloc = (corps: any) => !!corps && typeof corps === 'object' && 'bloc' in corps
const tonVerdict = (v: string) => (/^pass$/i.test(v) ? 'ok' : /^fail$/i.test(v) ? 'crit' : 'muet')

export default function Chantier({ equipage, poser, onFermer }: SalleProps) {
  const etat = usePanneau(() => apiDirection<Rep<Code>>('/api/controle/pilotage?bloc=code'), estBloc, UNE_MINUTE)
  return (
    <Fenetre cle="chantier" titre="Chantier du code" onFermer={onFermer} etat={etat} resume={{ equipage, poser, taches: etat.rep?.valeur?.enCours?.length ?? null }}>
      <Corps etat={etat} quoi="Chantier du code">
        {(v) => (
          <>
            {v.perime && v.message ? <p className="mc-panne" role="alert" data-perime>{v.message}</p> : null}
            <p className="mc-petit" data-age-releve>{`relevé ${relTime(v.publie_le)}`}</p>
            <h3 className="mc-titre-zone">FILE</h3>
            {v.file.length === 0 ? <p className="mc-etat">La file est vide.</p> : (
              <ul className="mc-liste" data-groupe="file">{v.file.map((id) => <li key={id}><span className="mc-chiffre">{id}</span></li>)}</ul>
            )}
            <h3 className="mc-titre-zone">EN COURS</h3>
            {v.enCours.length === 0 ? <p className="mc-etat">Aucune tâche en cours.</p> : (
              <ul className="mc-liste" data-groupe="en-cours">
                {v.enCours.map((t) => <li key={t.id}><span className="mc-chiffre">{t.id}</span><span className="mc-doux">{t.agent}</span></li>)}
              </ul>
            )}
            {v.verrousVieux.length ? (
              <>
                <h3 className="mc-titre-zone">VERROUS VIEUX</h3>
                <ul className="mc-liste" data-groupe="verrous">{v.verrousVieux.map((id) => <li key={id}><span className="mc-chiffre">{id}</span></li>)}</ul>
              </>
            ) : null}
            <h3 className="mc-titre-zone">DERNIERS VERDICTS</h3>
            {v.derniers.length === 0 ? <p className="mc-etat">Aucun verdict récent.</p> : (
              <ul className="mc-liste" data-groupe="derniers">
                {v.derniers.map((d) => <li key={`${d.id}-${d.verdict}`}><span className="mc-chiffre">{d.id}</span><Pastille ton={tonVerdict(d.verdict)}>{d.verdict}</Pastille></li>)}
              </ul>
            )}
            <h3 className="mc-titre-zone">PR</h3>
            <p data-prs>{v.prs.texte}</p>
            {v.attention.length ? (
              <>
                <h3 className="mc-titre-zone">ATTENTION</h3>
                <ul className="mc-liste" data-groupe="attention">{v.attention.map((l) => <li key={l}><span>{l}</span></li>)}</ul>
              </>
            ) : null}
          </>
        )}
      </Corps>
    </Fenetre>
  )
}
