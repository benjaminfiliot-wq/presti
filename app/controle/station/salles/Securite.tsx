'use client'

import { apiDirection } from '../../client'
import Fenetre, { Corps, Pastille, Tuile, type SalleProps } from './Fenetre'
import { heure, jour, usePanneau, type Rep } from './lecture'

// Le panneau de la salle Sécurité (fiche 026-189) : ce que la station sait de la défense, en lecture seule. Les bans, les erreurs des
// dernières 24 h, les disjoncteurs ouverts, la pause générale et son historique, tels que servis (sous le domaine `securite`).
// Une sous-partie refusée se dit « hors périmètre », jamais 0. Aucun bouton : on ne lève pas une pause d'ici.
type Pause = { active?: boolean; source?: string | null; motif?: string | null; depuis?: string | null; historique?: { le?: string | null; actif?: boolean; motif?: string | null; texte?: string | null }[] }
type Disjoncteur = { cle?: string; nom?: string; libelle?: string; motif?: string | null; depuis?: string | null } | string
type Vue = { bans: number; erreurs: number; disjoncteurs: Disjoncteur[]; pause: Pause }

const nomDe = (d: Disjoncteur) => (typeof d === 'string' ? d : d.libelle ?? d.nom ?? d.cle ?? '—')
const motifDe = (d: Disjoncteur) => (typeof d === 'string' ? null : d.motif ?? null)

export default function Securite({ equipage, poser, onFermer }: SalleProps) {
  const etat = usePanneau(() => apiDirection<Rep<Vue>>('/api/controle/station?vue=salle&salle=securite'))
  const v = etat.rep?.valeur ?? null
  return (
    <Fenetre cle="securite" titre="Sécurité" onFermer={onFermer} etat={v ? etat : null} resume={{ equipage, poser, taches: v?.disjoncteurs?.length ?? null }}>
      <Corps etat={etat} quoi="Sécurité">
        {(vue) => (
          <>
            <div className="mc-tuiles" data-groupe="defense">
              <Tuile libelle="BANS" attribut="bans">{vue.bans}</Tuile>
              <Tuile libelle="ERREURS · 24 H" attribut="erreurs">{vue.erreurs}</Tuile>
              <Tuile libelle="PAUSE GÉNÉRALE" attribut="pause" note={vue.pause?.source ? `source : ${vue.pause.source}` : undefined}>
                <Pastille ton={vue.pause?.active ? 'crit' : 'ok'}>{vue.pause?.active ? 'EN PAUSE' : 'EN MARCHE'}</Pastille>
              </Tuile>
            </div>
            {vue.pause?.active && vue.pause.motif ? <p className="mc-texte-exact" data-pause-motif>{vue.pause.motif}</p> : null}
            <h3 className="mc-titre-zone">DISJONCTEURS OUVERTS</h3>
            {vue.disjoncteurs.length === 0 ? <p className="mc-etat">Aucun disjoncteur ouvert.</p> : (
              <ul className="mc-liste" data-groupe="disjoncteurs">
                {vue.disjoncteurs.map((d, i) => <li key={i}><span>{nomDe(d)}</span>{motifDe(d) ? <small className="mc-doux">{motifDe(d)}</small> : null}</li>)}
              </ul>
            )}
            {vue.pause?.historique?.length ? (
              <>
                <h3 className="mc-titre-zone">HISTORIQUE DE LA PAUSE</h3>
                <ol className="mc-liste mc-fil" data-groupe="historique-pause">
                  {vue.pause.historique.map((h, i) => (
                    <li key={i}>
                      <div className="mc-meta"><small className="mc-chiffre">{jour(h.le)} {heure(h.le)}</small><Pastille ton={h.actif ? 'crit' : 'ok'}>{h.actif ? 'pause' : 'reprise'}</Pastille></div>
                      {h.motif ?? h.texte ? <p className="mc-texte-exact">{h.motif ?? h.texte}</p> : null}
                    </li>
                  ))}
                </ol>
              </>
            ) : null}
          </>
        )}
      </Corps>
    </Fenetre>
  )
}
