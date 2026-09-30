'use client'

import { lire, messagePanne } from './Barre'
import type { Commandement as CommandementDonnees, Env } from './Station'

// Le Commandement : l'objectif actif signé « PAR LE CHEF » et sa barre, les missions chiffrées, le dernier succès, le niveau
// et sa barre vers le seuil suivant, les trois lignes du dernier compte rendu du Chef. Tout est servi ; le niveau et la
// mission en euros viennent de l'enveloppe `argent` (elle peut être hors périmètre : on le dit, on n'invente rien).
type Props = { env: Env<CommandementDonnees> | null; erreurVue: string | null; onFermer?: () => void }

const pourcent = (x: number | null | undefined) => `${Math.round(Math.max(0, Math.min(1, x ?? 0)) * 100)} %`

export default function Commandement({ env, erreurVue, onFermer }: Props) {
  const l = lire(env, erreurVue)
  const c = l.etat === 'ok' ? l.valeur : null
  const argent = c ? lire(c.argent) : null
  const missions = c ? [...c.missions, ...(argent?.etat === 'ok' ? argent.valeur.missions : [])] : []
  return (
    <section className="mc-zone" data-zone="commandement" aria-label="Commandement">
      <div className="mc-zone-tete">
        <h2 className="mc-titre-zone">COMMANDEMENT</h2>
        {onFermer ? <button type="button" className="mc-icone" data-fermer-commandement aria-label="Fermer le Commandement" onClick={onFermer}>×</button> : null}
      </div>
      {l.etat === 'chargement' ? <p className="mc-etat">Chargement…</p> : null}
      {l.etat === 'panne' ? <p className="mc-etat mc-panne" role="alert">{messagePanne('Commandement', l.raison)}</p> : null}
      {l.etat === 'hors' ? <p className="mc-etat">— · hors périmètre</p> : null}
      {c ? (
        <>
          {c.objectif ? (
            <div className="mc-objectif" data-objectif>
              <div className="mc-objectif-l">{c.objectif.libelle}</div>
              <div className="mc-barre-progres" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((c.objectif.progression ?? 0) * 100)}><span style={{ width: pourcent(c.objectif.progression) }} /></div>
              <small className="mc-signature">{c.objectif.par}</small>
            </div>
          ) : <p className="mc-etat">Aucun objectif fixé par le Chef</p>}
          <ul className="mc-missions">
            {missions.map((m) => (
              <li key={m.cle} data-mission={m.cle} data-atteinte={m.atteinte ? 'oui' : 'non'}>
                <span>{m.libelle}</span>
                <b>{m.texte}</b>
              </li>
            ))}
          </ul>
          {argent?.etat === 'hors' ? <p className="mc-etat">Niveau et argent : — · hors périmètre</p> : null}
          {argent?.etat === 'panne' ? <p className="mc-etat mc-panne">{messagePanne('Niveau', argent.raison)}</p> : null}
          {argent?.etat === 'ok' ? (
            <div className="mc-niveau" data-niveau>
              <b>LV.{argent.valeur.niveau.lv}</b>
              <div className="mc-barre-progres"><span style={{ width: pourcent(argent.valeur.niveau.part) }} /></div>
              <small>{argent.valeur.niveau.texte}</small>
            </div>
          ) : null}
          <p className="mc-succes" data-dernier-succes>{c.succes ? <>Dernier succès : <b>{c.succes.libelle}</b></> : 'Aucun succès pour l’instant'}</p>
          {c.compteRendu.length ? (
            <ul className="mc-compte-rendu" data-compte-rendu aria-label="Dernier compte rendu du Chef">
              {c.compteRendu.slice(0, 3).map((ligne, i) => <li key={i}>{ligne}</li>)}
            </ul>
          ) : null}
        </>
      ) : null}
    </section>
  )
}
