'use client'

import { apiDirection } from '../../client'
import Fenetre, { Corps, type SalleProps } from './Fenetre'
import { estNombre, usePanneau, type Rep } from './lecture'

// Le panneau de la salle Observatoire (fiche 026-189) : la France au hublot, en lecture seule et AGRÉGÉE par département. Pour chaque
// département : les prospects trouvés, ceux qui ont été contactés et ceux qui ont dit oui. Jamais un nom, jamais une entreprise : seuls les
// trois nombres servis s'écrivent. La carte des centres de département (table fixe sous licence ouverte, à vérifier) n'est pas dessinée ici.
type Departement = { departement: string; trouves: number | null; contactes: number | null; oui: number | null }
type Vue = { departements: Departement[] }

const nb = (x: number | null | undefined) => (estNombre(x) ? String(x) : '—')

export default function Observatoire({ equipage, poser, onFermer }: SalleProps) {
  const etat = usePanneau(() => apiDirection<Rep<Vue>>('/api/controle/station?vue=salle&salle=observatoire'))
  const v = etat.rep?.valeur ?? null
  return (
    <Fenetre cle="observatoire" titre="Observatoire" onFermer={onFermer} etat={v ? etat : null} resume={{ equipage, poser, taches: v?.departements?.length ?? null }}>
      <Corps etat={etat} quoi="Observatoire">
        {(vue) => (
          <>
            <h3 className="mc-titre-zone">PAR DÉPARTEMENT</h3>
            {vue.departements.length === 0 ? <p className="mc-etat">Aucun prospect trouvé pour l’instant.</p> : (
              <ul className="mc-liste" data-groupe="departements">
                {vue.departements.map((d) => {
                  const part = estNombre(d.trouves) && d.trouves > 0 && estNombre(d.contactes) ? Math.min(100, Math.round((d.contactes / d.trouves) * 100)) : 0
                  return (
                    <li key={d.departement} data-departement={d.departement}>
                      <b className="mc-chiffre">{d.departement}</b>
                      <span>trouvés <span className="mc-chiffre">{nb(d.trouves)}</span></span>
                      <span>contactés <span className="mc-chiffre">{nb(d.contactes)}</span></span>
                      <span>oui <span className="mc-chiffre">{nb(d.oui)}</span></span>
                      <div className="mc-barre-progres" role="presentation"><span style={{ width: `${part}%` }} /></div>
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        )}
      </Corps>
    </Fenetre>
  )
}
