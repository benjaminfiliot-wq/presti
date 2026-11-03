'use client'

import { useCallback, useEffect, useState } from 'react'
import { actif } from '@/lib/flags'
import { libelleStatut, type CarteAgent, type Decision } from '@/lib/agents/n8n/cartes'
import { appel } from './client'

// La boîte « À valider » de l'outil de gestion (tâche 036-030, audit 036-029 § 2) : les cartes que les départements n8n ont préparées
// (assistant_actions, origine « agent »). Pour chaque carte : ce qui est proposé, pourquoi (le motif et la source de chaque fait), la
// ligne « Fait : … » quand c'est fait, et deux boutons : Valider, Refuser.
// Le clic NOTE la décision par POST /api/assistant/agents ; il n'envoie rien (ni e-mail, ni SMS) : sur Studio, rien ne part sans ce
// clic, et ce clic lui-même ne fait rien partir tant que le mode réel n'est pas ouvert. Drapeau boiteAgents baissé : le composant ne
// rend rien et n'appelle rien (« une fonctionnalité non finie n'apparaît pas »).

type Etat = { phase: 'chargement' } | { phase: 'erreur'; message: string } | { phase: 'pret'; cartes: CarteAgent[] }

export default function BoiteAgents() {
  if (!actif('boiteAgents')) return null
  return <Boite />
}

function Boite() {
  const [etat, setEtat] = useState<Etat>({ phase: 'chargement' })
  const [enCours, setEnCours] = useState<string | null>(null)
  const [avis, setAvis] = useState<string | null>(null)

  const charger = useCallback(async () => {
    const r = await appel<{ cartes: CarteAgent[] }>('/api/assistant/agents')
    setEtat(r.ok ? { phase: 'pret', cartes: r.corps.cartes ?? [] } : { phase: 'erreur', message: r.erreur })
  }, [])
  useEffect(() => { void charger() }, [charger])

  const decider = async (c: CarteAgent, decision: Decision) => {
    setEnCours(c.id); setAvis(null)
    const r = await appel<{ ok: boolean; carte: CarteAgent | null }>('/api/assistant/agents', { method: 'POST', body: { id: c.id, decision } })
    setEnCours(null)
    if (r.ok && r.corps.carte) {
      const neuve = r.corps.carte
      setEtat((e) => (e.phase === 'pret' ? { phase: 'pret', cartes: e.cartes.map((x) => (x.id === neuve.id ? neuve : x)) } : e))
      setAvis(decision === 'valider' ? 'Carte validée. Rien n’est parti : le mode réel n’est pas ouvert.' : 'Carte refusée : rien ne sera fait.')
    } else {
      setAvis(r.ok ? 'La décision n’a pas pu être lue.' : r.erreur)
      void charger()
    }
  }

  const aValider = etat.phase === 'pret' ? etat.cartes.filter((c) => c.statut === 'a_valider') : []
  const traitees = etat.phase === 'pret' ? etat.cartes.filter((c) => c.statut !== 'a_valider').slice(0, 10) : []

  return (
    <section className="gst-groupe bag" aria-labelledby="bag-titre" data-boite-agents>
      <h3 className="crm-sous bag-titre" id="bag-titre">
        À valider{etat.phase === 'pret' && aValider.length > 0 ? <span className="pill bag-compte">{aValider.length}</span> : null}
      </h3>
      <p className="bag-aide">Ce que vos assistants ont préparé. Rien ne part sans votre accord.</p>
      {avis ? <p className="bag-avis" role="status">{avis}</p> : null}
      {etat.phase === 'chargement' ? <p className="muted" role="status">Chargement…</p> : null}
      {etat.phase === 'erreur' ? <p className="bag-erreur" role="alert">{etat.message}</p> : null}
      {etat.phase === 'pret' && aValider.length === 0 ? <p className="bag-vide">Aucune carte à valider pour le moment.</p> : null}
      {aValider.length > 0 ? (
        <ul className="bag-liste">
          {aValider.map((c) => <Carte key={c.id} c={c} occupe={enCours === c.id} decider={decider} />)}
        </ul>
      ) : null}
      {traitees.length > 0 ? (
        <details className="bag-historique">
          <summary>Déjà traitées ({traitees.length})</summary>
          <ul className="bag-liste">
            {traitees.map((c) => <Carte key={c.id} c={c} occupe={false} decider={decider} />)}
          </ul>
        </details>
      ) : null}
    </section>
  )
}

function Carte({ c, occupe, decider }: { c: CarteAgent; occupe: boolean; decider: (c: CarteAgent, d: Decision) => void }) {
  const ouverte = c.statut === 'a_valider'
  return (
    <li className="bag-carte" data-statut={c.statut} data-carte-agent={c.id}>
      <div className="bag-tete">
        <span className="pill bag-dep">{c.nomDepartement}</span>
        <b className="bag-titre-carte">{c.titre}</b>
      </div>
      {c.proposition?.texte ? (
        <blockquote className="bag-proposition">
          {c.proposition.objet ? <b>{c.proposition.objet}</b> : null}
          <span>{c.proposition.texte}</span>
        </blockquote>
      ) : null}
      <p className="bag-pourquoi"><b>Pourquoi :</b> {c.motif}</p>
      <details className="bag-sources">
        <summary>Sources ({c.sources.length})</summary>
        <ul>{c.sources.map((s, i) => <li key={i}><span>{s.fait}</span> <code>{s.source}</code></li>)}</ul>
      </details>
      {c.statut === 'faite' ? <p className="atl-fait"><b>Fait :</b> {c.fait}</p> : !ouverte ? <p className="bag-statut">{libelleStatut(c)}</p> : null}
      {ouverte ? (
        <div className="bag-actions">
          <button type="button" className="psh-btn primary" disabled={occupe} onClick={() => decider(c, 'valider')} data-decision="valider">Valider</button>
          <button type="button" className="psh-btn ghost" disabled={occupe} onClick={() => decider(c, 'refuser')} data-decision="refuser">Refuser</button>
        </div>
      ) : null}
    </li>
  )
}
