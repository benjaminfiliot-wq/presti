'use client'

import { useState } from 'react'
import { euros } from '@/lib/direction/fraicheur'
import { apiDirection } from '../../client'
import type { Env, Tresorerie as TresorerieServie } from '../Station'
import Fenetre, { Corps, Onglets, Tuile, type SalleProps } from './Fenetre'
import { HORS_PERIMETRE, ecrire, estNombre, jour, usePanneau, type Rep } from './lecture'

// La Trésorerie (fiche 026-120, §4.5) : ce que les agents dépensent, par agent, par nature, par modèle et par tâche ; les
// abonnements à part ; la marge et le seuil de TVA de la trésorerie (026-059, deux chiffres un écran). Aucune pastille de crédit
// de clé : le coût se lit par modèle. Une répartition non mesurée dit son manque, jamais « 0 € ».
type Agent = { nom: string; libelle?: string; cout_mois_eur: number; appels: number }
type Tache = { id?: string; tache?: string; numero?: number; agent?: string; libelle?: string; type?: string; eur?: number; montant_eur?: number }
type Modele = { fournisseur: string; modele: string; appels: number; eur: number }
type Achat = { fournisseur: string; libelle?: string; ttc_eur: number; date_facture?: string }
type Vue = { parAgent: Agent[]; parTache: Tache[]; modeles: Modele[]; total_modeles_eur: number; abonnements: Achat[]; parNature: Env<Record<string, number>> }

const NATURES: [string, string][] = [['texte', 'Texte'], ['image', 'Image'], ['video', 'Vidéo'], ['voix', 'Voix']]
const appels = (n: number) => `${n} ${n > 1 ? 'appels' : 'appel'}`

export default function Tresorerie({ tresorerie, equipage, poser, onFermer }: SalleProps & { tresorerie: TresorerieServie | null }) {
  const etat = usePanneau(() => apiDirection<Rep<Vue>>('/api/controle/station?vue=salle&salle=tresorerie'))
  const [onglet, setOnglet] = useState('vue')
  const libelles = new Map((equipage?.valeur?.agents ?? []).map((a) => [a.nom, a.libelle]))
  const v = etat.rep?.valeur ?? null
  const ONGLETS = [{ cle: 'vue', libelle: 'Vue d’ensemble' }, { cle: 'depenses', libelle: `Dépenses (${v?.parTache?.length ?? 0})` }]

  const nature = (n: Env<Record<string, number>>) => {
    if (n.valeur) {
      const x = n.valeur
      return (
        <ul className="mc-liste mc-natures" data-groupe="natures">
          {NATURES.map(([cle, libelle]) => (estNombre(x[cle]) ? <li key={cle}><span>{libelle}</span><span className="mc-chiffre">{euros(x[cle])}</span></li> : null))}
        </ul>
      )
    }
    return <p className="mc-etat">{n.nonMesure ? HORS_PERIMETRE : n.manque ?? n.erreur ?? '—'}</p>
  }

  return (
    <Fenetre cle="tresorerie" titre="Trésorerie" onFermer={onFermer} etat={etat} resume={{ equipage, poser, taches: v?.parTache?.length ?? null }}>
      <Corps etat={etat} quoi="Trésorerie">
        {(vue) => (
          <>
            <Onglets liste={ONGLETS} actif={onglet} choisir={setOnglet} nom="Trésorerie" />
            {onglet === 'vue' ? (
              <>
                <div className="mc-tuiles" data-groupe="argent">
                  <Tuile libelle="MARGE · MOIS">{ecrire(tresorerie?.marge, euros, 'Trésorerie')}</Tuile>
                  <Tuile libelle="DÉPENSÉ · MOIS">{ecrire(tresorerie?.depenses_mois, euros, 'Trésorerie')}</Tuile>
                  <Tuile libelle="TVA">{ecrire(tresorerie?.tva as Env<{ texte?: string }> | undefined, (t) => t.texte ?? '—', 'Trésorerie')}</Tuile>
                </div>
                <h3 className="mc-titre-zone">PAR AGENT</h3>
                {vue.parAgent.length === 0 ? <p className="mc-etat">Aucune dépense d’agent ce mois-ci.</p> : (
                  <ul className="mc-liste" data-groupe="par-agent">
                    {vue.parAgent.map((a) => (
                      <li key={a.nom}><span>{a.libelle ?? libelles.get(a.nom) ?? a.nom}</span><span className="mc-petit">{appels(a.appels)}</span><span className="mc-chiffre">{euros(a.cout_mois_eur)}</span></li>
                    ))}
                  </ul>
                )}
                <h3 className="mc-titre-zone">PAR NATURE · TEXTE, IMAGE, VIDÉO, VOIX</h3>
                {nature(vue.parNature)}
                <h3 className="mc-titre-zone">PAR MODÈLE</h3>
                {vue.modeles.length === 0 ? <p className="mc-etat">Aucun appel de modèle ce mois-ci.</p> : (
                  <ul className="mc-liste" data-groupe="par-modele">
                    {vue.modeles.map((m) => (
                      <li key={`${m.fournisseur}/${m.modele}`}><span>{`${m.modele} · ${m.fournisseur} · ${appels(m.appels)}`}</span><span className="mc-chiffre">{euros(m.eur)}</span></li>
                    ))}
                    <li className="mc-total"><span>Total des modèles</span><span className="mc-chiffre" data-total-modeles>{euros(vue.total_modeles_eur)}</span></li>
                  </ul>
                )}
                <h3 className="mc-titre-zone">ABONNEMENTS · À PART</h3>
                {vue.abonnements.length === 0 ? <p className="mc-etat">Aucun achat ce mois-ci.</p> : (
                  <ul className="mc-liste" data-groupe="abonnements">
                    {vue.abonnements.map((a, i) => (
                      <li key={`${a.fournisseur}-${i}`}><span>{`${a.fournisseur}${a.libelle ? ` · ${a.libelle}` : ''}${a.date_facture ? ` · ${jour(a.date_facture)}` : ''}`}</span><span className="mc-chiffre">{euros(a.ttc_eur)}</span></li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              vue.parTache.length === 0 ? <p className="mc-etat">Aucune dépense d’agent ce mois-ci.</p> : (
                <ol className="mc-liste" data-groupe="par-tache">
                  {vue.parTache.map((t, i) => {
                    const id = t.id ?? t.tache ?? (t.numero !== undefined ? String(t.numero) : String(i + 1))
                    const montant = t.eur ?? t.montant_eur
                    return <li key={`${id}-${i}`}><span>{`#${id.slice(0, 8)} · ${t.agent ?? '—'} · ${t.libelle ?? t.type ?? '—'}`}</span><span className="mc-chiffre">{euros(montant)}</span></li>
                  })}
                </ol>
              )
            )}
          </>
        )}
      </Corps>
    </Fenetre>
  )
}
