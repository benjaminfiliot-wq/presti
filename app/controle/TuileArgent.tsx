'use client'

import { useEffect, useState } from 'react'
import { apiDirection } from './client'
import Fraicheur from './Fraicheur'
import { euros } from '@/lib/direction/fraicheur'

type Sourcee<T> = { valeur: T | null; source: string; a: string; cache?: boolean; erreur?: string; manque?: string }
type Encaisse = { net: number }
type Donnees = {
  encaisse: { jour: Sourcee<Encaisse>; sept_jours: Sourcee<Encaisse>; mois: Sourcee<Encaisse> }
  mrr: Sourcee<{ mrr: number }>
  ventes_sites: Sourcee<{ encaisseCents: number; payee: number; generee: number; validee: number; en_ligne: number; retiree: number }>
  depenses_mois: Sourcee<number>
  cout_ia: Sourcee<number>
  marge: Sourcee<{ marge: number; estimation: boolean }>
  tva: Sourcee<{ pourcent: number | null; alerte: boolean; depasse: boolean }>
  a: string
}

function Valeur({ titre, source, nombre, estimation = false, unite = 'euro' }: { titre: string; source: Sourcee<unknown>; nombre: number | null | undefined; estimation?: boolean; unite?: 'euro' | 'pourcent' }) {
  const maintenant = Date.now()
  const mesure = source.valeur !== null && typeof nombre === 'number' && Number.isFinite(nombre)
  return <div style={{ minWidth: 0, padding: '.65rem 0' }}>
    <div className="muted" style={{ fontSize: '.85rem' }}>{titre}</div>
    <strong style={{ display: 'block', fontSize: 'clamp(1.1rem, 4vw, 1.45rem)', overflowWrap: 'anywhere' }}>
      {mesure ? `${estimation ? '≈ ' : ''}${unite === 'euro' ? euros(nombre) : `${nombre} %`}` : 'non mesuré'}
    </strong>
    {mesure && estimation ? <small className="muted">estimation · </small> : null}
    <Fraicheur s={source} maintenant={maintenant} />
  </div>
}

export default function TuileArgent({ donnees }: { donnees?: Donnees }) {
  const [chargees, setChargees] = useState<Donnees | null>(null)
  const [erreur, setErreur] = useState(false)
  useEffect(() => {
    if (donnees) return
    let actif = true
    void apiDirection<Donnees>('/api/controle/tresorerie').then((reponse) => {
      if (!actif) return
      if (reponse.ok) setChargees(reponse.data)
      else setErreur(true)
    })
    return () => { actif = false }
  }, [donnees])
  const d = donnees ?? chargees
  return <section className="tool-card" data-tuile-argent style={{ minWidth: 0, overflow: 'hidden' }}>
    <h2>Argent</h2>
    {!d ? <p className="muted">{erreur ? 'Trésorerie indisponible.' : 'Chargement…'}</p> : (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: '0 .9rem' }}>
        <Valeur titre="Encaissé aujourd’hui" source={d.encaisse.jour} nombre={d.encaisse.jour.valeur?.net} />
        <Valeur titre="Encaissé sur 7 jours" source={d.encaisse.sept_jours} nombre={d.encaisse.sept_jours.valeur?.net} />
        <Valeur titre="Encaissé ce mois" source={d.encaisse.mois} nombre={d.encaisse.mois.valeur?.net} />
        <Valeur titre="Abonnements mensuels" source={d.mrr} nombre={d.mrr.valeur?.mrr} />
        <Valeur titre="Sites vendus" source={d.ventes_sites} nombre={d.ventes_sites.valeur?.encaisseCents != null ? d.ventes_sites.valeur.encaisseCents / 100 : null} />
        <Valeur titre="Achats du mois" source={d.depenses_mois} nombre={d.depenses_mois.valeur != null ? d.depenses_mois.valeur / 100 : null} />
        <Valeur titre="Coût IA du mois" source={d.cout_ia} nombre={d.cout_ia.valeur} />
        <Valeur titre="Marge du mois" source={d.marge} nombre={d.marge.valeur?.marge} estimation={d.marge.valeur?.estimation} />
        <Valeur titre="Seuil de TVA" source={d.tva} nombre={d.tva.valeur?.pourcent} unite="pourcent" />
      </div>
    )}
  </section>
}
