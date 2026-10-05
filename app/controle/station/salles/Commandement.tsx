'use client'

import type { ReactNode } from 'react'
import { apiDirection } from '../../client'
import type { Env } from '../Station'
import Fenetre, { Corps, type SalleProps } from './Fenetre'
import { HORS_PERIMETRE, heure, messagePanne, usePanneau, type Rep } from './lecture'

// Le panneau de la salle Commandement (fiche 026-188) : ce que le Chef a décidé et où il en est, en lecture seule. L'objectif actif
// signé « PAR LE CHEF » et sa barre, les missions (barre, valeur, cible, ce qu'elles débloquent), les succès, les trois lignes du
// dernier compte rendu et les consignes reçues par le Chef. Le niveau et les missions en euros viennent de l'enveloppe `argent`
// (comptabilité) : refusée, le panneau dit « hors périmètre », jamais 0. Tout est servi ; l'écran n'ordonne, ne filtre et ne calcule
// rien, n'affiche aucun texte comme du HTML et n'a aucun bouton d'envoi.
type Objectif = { libelle: string; par: string; progression: number | null }
type Mission = { cle: string; libelle: string; valeur?: number | null; cible?: number | null; texte: string; atteinte: boolean; debloque?: string | null }
type Succes = { cle: string; libelle: string; debloque: boolean; le: string | null }
type Consigne = { id: number | string; le: string | null; texte: string; cible: string | null }
type Argent = { niveau: { lv: number; part: number | null; texte: string }; missions: Mission[] }
type Vue = {
  objectif: Objectif | null
  missions: Mission[]
  tousSucces: Succes[]
  compteRendu: string[]
  consignes: Consigne[]
  argent: Env<Argent> | null
}

const pourcent = (x: number | null | undefined) => `${Math.round(Math.max(0, Math.min(1, x ?? 0)) * 100)} %`

function Barre({ part, nom }: { part: number | null | undefined; nom: string }) {
  const n = Math.round(Math.max(0, Math.min(1, part ?? 0)) * 100)
  return (
    <div className="mc-barre-progres" role="progressbar" aria-label={nom} aria-valuemin={0} aria-valuemax={100} aria-valuenow={n}>
      <span style={{ width: `${n}%` }} />
    </div>
  )
}

function LigneMission({ m }: { m: Mission }) {
  return (
    <li data-mission={m.cle} data-atteinte={m.atteinte ? 'oui' : 'non'}>
      <span>
        {m.libelle}
        {m.debloque ? <small className="mc-doux"> {m.debloque}</small> : null}
      </span>
      <b>{m.texte}</b>
    </li>
  )
}

/** Le niveau et les euros : l'enveloppe `argent` servie, ou « hors périmètre » / la panne / le manque dits en clair. Jamais un 0. */
function NiveauEtEuros({ argent }: { argent: Env<Argent> | null }): ReactNode {
  if (!argent) return <p className="mc-etat">—</p>
  if (argent.nonMesure) return <p className="mc-etat">{HORS_PERIMETRE}</p>
  if (!argent.valeur) return <p className="mc-etat">{argent.erreur ? messagePanne('Niveau', argent.erreur) : argent.manque ?? '—'}</p>
  const { niveau, missions } = argent.valeur
  return (
    <>
      <div className="mc-niveau" data-niveau>
        <b>LV.{niveau.lv}</b>
        <Barre part={niveau.part} nom="Progression vers le niveau suivant" />
        <small>{niveau.texte}</small>
      </div>
      {missions.length ? <ul className="mc-missions" data-groupe="missions-euros">{missions.map((m) => <LigneMission key={m.cle} m={m} />)}</ul> : null}
    </>
  )
}

export default function Commandement({ equipage, poser, onFermer }: SalleProps) {
  const etat = usePanneau(() => apiDirection<Rep<Vue>>('/api/controle/station?vue=salle&salle=commandement'))
  const v = etat.rep?.valeur ?? null
  return (
    <Fenetre cle="commandement" titre="Commandement" onFermer={onFermer} etat={etat} resume={{ equipage, poser, taches: v?.missions?.length ?? null }}>
      <Corps etat={etat} quoi="Commandement">
        {(vue) => (
          <>
            <h3 className="mc-titre-zone">OBJECTIF</h3>
            {vue.objectif ? (
              <div className="mc-objectif" data-objectif>
                <div className="mc-objectif-l">{vue.objectif.libelle}</div>
                <Barre part={vue.objectif.progression} nom="Progression de l'objectif" />
                <small className="mc-signature">{vue.objectif.par} · {pourcent(vue.objectif.progression)}</small>
              </div>
            ) : <p className="mc-etat">Aucun objectif fixé par le Chef</p>}

            <h3 className="mc-titre-zone">MISSIONS</h3>
            {vue.missions.length ? <ul className="mc-missions" data-groupe="missions">{vue.missions.map((m) => <LigneMission key={m.cle} m={m} />)}</ul> : <p className="mc-etat">Aucune mission pour l’instant.</p>}

            <h3 className="mc-titre-zone">NIVEAU ET EUROS</h3>
            <NiveauEtEuros argent={vue.argent} />

            <h3 className="mc-titre-zone">SUCCÈS</h3>
            {vue.tousSucces.length ? (
              <ul className="mc-liste" data-groupe="succes">
                {vue.tousSucces.map((s) => (
                  <li key={s.cle} data-succes={s.cle} data-debloque={s.debloque ? 'oui' : 'non'}>
                    <span>{s.debloque ? '✓ ' : '· '}{s.libelle}</span>
                    {s.le ? <small className="mc-chiffre"> {heure(s.le)}</small> : null}
                  </li>
                ))}
              </ul>
            ) : <p className="mc-etat">Aucun succès pour l’instant.</p>}

            <h3 className="mc-titre-zone">DERNIER COMPTE RENDU DU CHEF</h3>
            {vue.compteRendu.length ? (
              <ul className="mc-compte-rendu" data-compte-rendu aria-label="Dernier compte rendu du Chef">
                {vue.compteRendu.slice(0, 3).map((ligne, i) => <li key={i}>{ligne}</li>)}
              </ul>
            ) : <p className="mc-etat">Pas de compte rendu pour l’instant.</p>}

            <h3 className="mc-titre-zone">CONSIGNES REÇUES PAR LE CHEF</h3>
            {vue.consignes.length ? (
              <ol className="mc-liste mc-fil" data-groupe="consignes">
                {vue.consignes.map((c) => (
                  <li key={c.id} data-consigne={c.id}>
                    <div className="mc-meta"><small className="mc-chiffre">{heure(c.le)}</small>{c.cible ? <small className="mc-doux"> → {c.cible}</small> : null}</div>
                    <p className="mc-texte-exact">{c.texte}</p>
                  </li>
                ))}
              </ol>
            ) : <p className="mc-etat">Aucune consigne reçue.</p>}
          </>
        )}
      </Corps>
    </Fenetre>
  )
}
