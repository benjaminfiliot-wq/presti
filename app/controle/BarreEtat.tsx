'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiDirection } from './client'
import { relTime, euros } from '@/lib/direction/fraicheur'

// La barre d'état permanente du Poste de contrôle (prompt v11 §1).
//
// Cinq choses qu'on veut savoir sans cliquer : le service tient debout ou non, ce qui est entré ce
// mois-ci, ce qui rentre chaque mois, ce que l'IA coûte face au budget, et depuis quand ces chiffres
// datent. Elle est montée sur toutes les vues, donc elle doit être discrète et ne jamais mentir.
//
// Ce qu'elle ne fait pas : afficher un zéro quand elle ne sait pas. Une valeur absente est remplacée
// par sa raison, en gris. Un « 0 € » à la place d'une panne de Stripe serait pire que rien — il se
// lirait comme une mauvaise nouvelle au lieu d'une information manquante.
type S<T> = { valeur: T | null; source: string; a: string; cache: boolean; erreur?: string; manque?: string }
type Barre = {
  service: S<{ etat: 'ok' | 'degrade' | 'incident'; detail: string; ms: number }> | null
  mrr: S<{ mrr: number; abonnements: number; enPause?: number; abonnementsEnPause?: number }> | null
  encaisse: S<{ brut: number; net: number; paiements: number }> | null
  coutIA: S<{ euros: number; budget: number | null; perimetre?: string; estimation?: boolean }> | null
  compteurs: S<{ aFaire: number | null; messages: number | null; clients: number }> | null
  synchro: string
  a: string
}

const ETATS = { ok: { mot: 'Service normal', classe: 'ok' }, degrade: { mot: 'Service dégradé', classe: 'warn' }, incident: { mot: 'Incident', classe: 'crit' } } as const

/** Une valeur, ou la raison de son absence — jamais un chiffre inventé. */
function Valeur({ s, rendu, titre }: { s: S<unknown> | null; rendu: (v: never) => string; titre: string }) {
  if (!s) return null
  const absente = s.valeur === null || s.erreur || s.manque
  return (
    <span className="ctl-barre-item" data-mesure={titre}>
      <span className="ctl-barre-lab">{titre}</span>
      {absente
        ? <span className="ctl-barre-vide" title={s.erreur ?? s.manque ?? 'indisponible'}>—</span>
        : <b className="ctl-barre-val">{rendu(s.valeur as never)}</b>}
    </span>
  )
}

export default function BarreEtat({ onCompteurs, onRecherche }: {
  onCompteurs?: (c: { aFaire: number | null; messages: number | null }) => void
  onRecherche?: () => void
}) {
  const [d, setD] = useState<Barre | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [maintenant, setMaintenant] = useState(() => Date.now())

  const charger = useCallback(async () => {
    const r = await apiDirection<Barre>('/api/controle/barre')
    if (!r.ok) { setErreur(r.data.error ?? 'État indisponible.'); return }
    setErreur(null); setD(r.data); setMaintenant(Date.now())
    if (r.data.compteurs?.valeur && onCompteurs) onCompteurs({ aFaire: r.data.compteurs.valeur.aFaire, messages: r.data.compteurs.valeur.messages })
  }, [onCompteurs])

  useEffect(() => { void charger() }, [charger])
  // Un rafraîchissement discret : la barre est permanente, elle ne doit pas dater d'une heure.
  useEffect(() => {
    const t = setInterval(() => void charger(), 120_000)
    return () => clearInterval(t)
  }, [charger])

  const etat = d?.service?.valeur?.etat
  const e = etat ? ETATS[etat] : null

  return (
    <div className={`ctl-barre${e ? ` ${e.classe}` : ''}`} role="status" data-barre-etat>
      {erreur ? (
        <span className="ctl-barre-item"><span className="notif-erreur" style={{ margin: 0, padding: '2px 8px' }}>{erreur}</span>
          <button type="button" className="dir-dep" onClick={() => void charger()}>Réessayer</button></span>
      ) : (
        <>
          {d?.service ? (
            <span className="ctl-barre-item" data-mesure="service">
              <span className={`pdot ${e?.classe ?? ''}`} aria-hidden="true" />
              <b className="ctl-barre-val">{e?.mot ?? '…'}</b>
              <span className="ctl-barre-lab">{d.service.valeur?.detail ?? d.service.erreur ?? ''}</span>
            </span>
          ) : null}
          <Valeur s={d?.encaisse ?? null} titre="Encaissé ce mois" rendu={(v: { net: number }) => euros(v.net)} />
          <Valeur s={d?.mrr ?? null} titre="MRR" rendu={(v: { mrr: number; abonnementsEnPause?: number }) => `${euros(v.mrr)}${v.abonnementsEnPause ? ` (${v.abonnementsEnPause} en pause)` : ''}`} />
          <Valeur s={d?.coutIA ?? null} titre={d?.coutIA?.valeur?.perimetre === 'produit' ? 'Coût IA du produit' : 'Facture Anthropic'}
            rendu={(v: { euros: number; budget: number | null; perimetre?: string; estimation?: boolean }) =>
              // Le budget ne s'affiche QUE s'il porte sur la même chose que le montant : mettre le coût
              // du produit face au budget de l'organisation ferait lire une marge qui n'existe pas.
              // Et une estimation porte son « ≈ », comme la tuile — deux écritures du même chiffre se
              // liraient comme deux chiffres.
              `${v.estimation ? '≈ ' : ''}${euros(v.euros)}${v.budget && v.perimetre !== 'produit' ? ` / ${euros(v.budget)}` : ''}`} />
          <span className="ctl-barre-fin">
            {d ? <span className="dir-src" title={`Chiffres établis ${relTime(d.synchro, maintenant)}`}>synchro {relTime(d.synchro, maintenant)}</span> : <span className="dir-src">chargement…</span>}
            <button type="button" className="ctl-barre-k" onClick={onRecherche} aria-label="Rechercher (Ctrl+K)" title="Rechercher — Ctrl+K">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
              <kbd>Ctrl K</kbd>
            </button>
          </span>
        </>
      )}
    </div>
  )
}
