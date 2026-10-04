'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { apiDirection, reconfirmationValide } from '../client'
import Reconfirmer, { type Portee } from '../Reconfirmer'
import type { Role } from './Station'
import './gestes.css'

// 026-117 — Les gestes de la station Mission Control :
// - Trancher les décisions ouvertes (2 à 7 options, recommandation, reconfirmation)
// - Rendre un appel (rendez-vous réservé ou réponse)
// - AUTO : couper ou rallumer tout sous mot de passe
// - Pause/Reprendre d'un agent sous mot de passe
// - Consigne à un agent (champ 200 signes max, sans mot de passe)
// - Gestes du fondateur sur l'envoi (Salle des envois)

type Appel = { chemin: string; corps: Record<string, unknown>; portee: Portee | null; action: string }

export function useGeste(apres?: () => void) {
  const [boite, setBoite] = useState<{ portee: Portee; action: string; appel: Appel } | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const envoyer = useCallback(async (a: Appel) => {
    const r = await apiDirection<{ portee?: Portee }>(a.chemin, { method: 'POST', body: JSON.stringify(a.corps) }, !!a.portee)
    if (!r.ok && ['reconfirmation_requise', 'expire', 'rejoue', 'portee'].includes(r.data.code ?? '')) {
      const p = (r.data.portee ?? a.portee ?? 'securite') as Portee
      setBoite({ portee: p, action: a.action, appel: { ...a, portee: p } })
      return
    }
    setMessage(r.ok ? 'C’est fait.' : r.data.error ?? `Refusé (code ${r.status}).`)
    if (r.ok) apres?.()
  }, [apres])

  const lancer = useCallback((a: Appel) => {
    setMessage(null)
    if (a.portee && !reconfirmationValide(a.portee)) {
      setBoite({ portee: a.portee, action: a.action, appel: a })
      return
    }
    void envoyer(a)
  }, [envoyer])

  const rendu = (
    <>
      {boite ? (
        <Reconfirmer
          portee={boite.portee}
          action={boite.action}
          onAnnule={() => setBoite(null)}
          onConfirme={() => {
            const a = boite.appel
            setBoite(null)
            void envoyer(a)
          }}
        />
      ) : null}
      {message ? <p data-message-geste className="mc-petit" role="status">{message}</p> : null}
    </>
  )

  return { lancer, rendu }
}

function Motif({ titre, valider, annuler }: { titre: string; valider: (m: string) => void; annuler: () => void }) {
  const [m, setM] = useState('')
  const ok = m.trim().length >= 3 && m.trim().length <= 200

  return (
    <form
      data-motif
      className="mc-motif-bloc"
      onClick={(e) => e.stopPropagation()}
      onSubmit={(e) => {
        e.preventDefault()
        if (ok) valider(m.trim())
      }}
    >
      <label className="mc-petit">
        {titre}
        <input
          data-champ-motif
          value={m}
          maxLength={200}
          onChange={(e) => setM(e.target.value)}
          autoFocus
        />
      </label>
      <div className="mc-motif-actions">
        <button type="submit" data-motif-ok disabled={!ok}>Valider</button>
        <button type="button" onClick={annuler}>Annuler</button>
      </div>
    </form>
  )
}

export function InterrupteurAuto({ auto, role }: { auto: { actif: boolean; texte: string } | null; role: Role }) {
  const [motif, setMotif] = useState(false)
  const { lancer, rendu } = useGeste()

  if (!auto) return <span data-auto data-actif="inconnu">AUTO —</span>
  if (role === 'lecture') {
    return <span data-auto data-actif={auto.actif ? 'oui' : 'non'}>{auto.texte}</span>
  }

  return (
    <span className="mc-auto">
      <button
        type="button"
        data-auto
        data-actif={auto.actif ? 'oui' : 'non'}
        aria-label={auto.actif ? 'Tout mettre en pause' : 'Tout reprendre'}
        onClick={() => setMotif(true)}
      >
        {auto.texte}
      </button>
      {motif ? (
        <Motif
          titre={auto.actif ? 'Tout mettre en pause : motif' : 'Tout reprendre : motif'}
          annuler={() => setMotif(false)}
          valider={(m) => {
            setMotif(false)
            lancer({
              chemin: '/api/controle/pause',
              corps: { actif: auto.actif, motif: m },
              portee: 'securite',
              action: auto.actif ? 'tout mettre en pause' : 'tout reprendre',
            })
          }}
        />
      ) : null}
      {rendu}
    </span>
  )
}

export function PauseAgent({ nom, etat }: { nom: string; etat?: string }) {
  const [motif, setMotif] = useState(false)
  const { lancer, rendu } = useGeste()
  const pause = etat !== 'pause'

  return (
    <span
      className="mc-pause-agent"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        data-pause-agent={nom}
        onClick={() => setMotif(true)}
      >
        {pause ? 'Pause' : 'Reprendre'}
      </button>
      {motif ? (
        <Motif
          titre={`${pause ? 'Pause' : 'Reprise'} de ${nom} : motif`}
          annuler={() => setMotif(false)}
          valider={(m) => {
            setMotif(false)
            lancer({
              chemin: `/api/controle/pilotage/agents/${encodeURIComponent(nom)}`,
              corps: { pause, motif: m },
              portee: 'securite',
              action: `${pause ? 'mettre en pause' : 'reprendre'} ${nom}`,
            })
          }}
        />
      ) : null}
      {rendu}
    </span>
  )
}

export function ConsigneAgent({ nom, libelle }: { nom: string; libelle?: string }) {
  const [ouvert, setOuvert] = useState(false)
  const [texte, setTexte] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const net = texte.trim()
  const ok = net.length >= 3 && net.length <= 200

  async function validerConsigne(e: React.FormEvent) {
    e.preventDefault()
    if (!ok) return
    const r = await apiDirection<{ ok?: boolean }>('/api/controle/pilotage/consignes', {
      method: 'POST',
      body: JSON.stringify({ texte: net, agent: nom }),
    })
    setMessage(r.ok ? `Consigne prise en compte : ${net}` : r.data.error ?? `Refusé (code ${r.status}).`)
    if (r.ok) setTexte('')
  }

  return (
    <span
      className="mc-consigne-agent"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        data-consigne-agent={nom}
        aria-label={`Laisser une consigne à ${libelle ?? nom}`}
        onClick={() => setOuvert((x) => !x)}
      >
        ✉
      </button>
      {ouvert ? (
        <form
          data-champ-consigne={nom}
          className="mc-consigne-bloc"
          onSubmit={validerConsigne}
        >
          <input
            data-texte-consigne
            aria-label={`Consigne à ${libelle ?? nom}`}
            value={texte}
            maxLength={200}
            onChange={(e) => setTexte(e.target.value.slice(0, 200))}
            autoFocus
          />
          <div className="mc-consigne-actions">
            <button type="submit" data-envoi-consigne disabled={!ok}>Valider</button>
            <button type="button" onClick={() => setOuvert(false)}>Fermer</button>
          </div>
        </form>
      ) : null}
      {message ? <p data-message-consigne className="mc-petit" role="status">{message}</p> : null}
    </span>
  )
}

// ── Les feuilles ─────────────────────────────────────────────────────────────────────────────────────────────────────────
type OptionDecision = { cle: string; libelle: string; recommandee?: boolean }
type CarteDecision = {
  id: string
  question: string
  contexte: string
  montant: string | null
  options: OptionDecision[]
  libelleDefaut: string
  portee: Portee | null
  epinglee?: boolean
}
type CarteAppel = {
  id: string
  nom: string
  tel: string | null
  lignes: [string, string]
  source: string
  sourceAppel?: 'rdv' | 'reponse'
}

export function FeuilleDecisions({ role, decision, fermer }: { role: Role; decision?: string; fermer: () => void }) {
  const [rep, setRep] = useState<{ ok: boolean; status: number; data: { valeur?: { cartes: CarteDecision[]; autres: number }; error?: string } } | null>(null)
  const epinglee = useRef<HTMLDivElement | null>(null)

  const lire = useCallback(async () => {
    const r = await apiDirection<{ cartes: CarteDecision[]; autres: number }>(
      `/api/controle/pilotage?bloc=decider${decision ? `&decision=${decision}` : ''}`
    )
    setRep(r)
  }, [decision])

  const { lancer, rendu } = useGeste(() => void lire())

  useEffect(() => {
    void lire()
  }, [lire])

  useEffect(() => {
    if (!rep?.ok || !epinglee.current) return
    const reduit = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    epinglee.current.scrollIntoView({ block: 'center', behavior: reduit ? 'auto' : 'auto' })
  }, [rep])

  const v = rep?.ok ? rep.data?.valeur : null

  return (
    <section data-feuille="decisions" role="dialog" aria-modal="true" aria-label="Décisions" className="mc-feuille">
      <div className="mc-feuille-tete">
        <h2>Décisions</h2>
        <button type="button" data-fermer onClick={fermer}>Fermer</button>
      </div>
      {role === 'lecture' ? <p className="mc-petit">lecture seule</p> : null}
      {rep && !rep.ok ? <p className="mc-panne">Décisions ne répond pas : {rep.data?.error ?? rep.status}</p> : null}
      {(v?.cartes as CarteDecision[] | undefined)?.map((c) => (
        <div
          key={c.id}
          data-carte-decision={c.id}
          data-epinglee={c.epinglee ? '' : undefined}
          ref={c.epinglee ? epinglee : undefined}
          className="mc-carte-decision"
        >
          <b>{c.question}</b>
          <p className="mc-petit">{c.contexte}</p>
          {c.montant ? <p className="mc-mono">{c.montant}</p> : null}
          <p data-libelle-defaut>{c.libelleDefaut}</p>
          {role === 'direction' ? (
            <div className="mc-choix">
              {c.options.map((o) => (
                <button
                  key={o.cle}
                  type="button"
                  data-choix={o.cle}
                  data-recommandee={o.recommandee ? '' : undefined}
                  onClick={() =>
                    lancer({
                      chemin: `/api/controle/pilotage/decisions/${c.id}`,
                      corps: { choix: o.cle },
                      portee: c.portee,
                      action: c.question,
                    })
                  }
                >
                  {o.libelle}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ))}
      {v && v.autres > 0 ? <p className="mc-petit">{v.autres} autres décisions</p> : null}
      {rendu}
    </section>
  )
}

export function FeuilleAppels({ role, fermer }: { role: Role; fermer: () => void }) {
  const [rep, setRep] = useState<{ ok: boolean; status: number; data: { valeur?: { appels: CarteAppel[] }; error?: string } } | null>(null)

  const lire = useCallback(async () => {
    const r = await apiDirection<{ appels: CarteAppel[] }>('/api/controle/pilotage?bloc=appeler')
    setRep(r)
  }, [])

  const { lancer, rendu } = useGeste(() => void lire())

  useEffect(() => {
    void lire()
  }, [lire])

  const v = rep?.ok ? rep.data?.valeur : null

  return (
    <section data-feuille="appels" role="dialog" aria-modal="true" aria-label="Appels à rendre" className="mc-feuille">
      <div className="mc-feuille-tete">
        <h2>Appels à rendre</h2>
        <button type="button" data-fermer onClick={fermer}>Fermer</button>
      </div>
      {rep && !rep.ok ? <p className="mc-panne">Appels ne répond pas : {rep.data?.error ?? rep.status}</p> : null}
      {(v?.appels as CarteAppel[] | undefined)?.map((a) => (
        <div key={a.id} data-carte-appel={a.id} data-source={a.source} className="mc-carte-decision">
          <b>{a.nom}</b> · <span className="mc-petit">{a.source}</span>
          <p className="mc-petit">{a.lignes[0]}<br />{a.lignes[1]}</p>
          {a.tel ? (
            <a href={a.tel} data-appeler>Appeler</a>
          ) : (
            <p className="mc-petit">pas de numéro : le Répondeur a proposé un créneau</p>
          )}
          {role === 'direction' && (a.sourceAppel === 'rdv' || a.sourceAppel === 'reponse') ? (
            <button
              type="button"
              data-appel-rendu
              onClick={() =>
                lancer({
                  chemin: `/api/controle/pilotage/appels/${a.id}${a.sourceAppel === 'rdv' ? '?source=rdv' : ''}`,
                  corps: {},
                  portee: null,
                  action: 'appel rendu',
                })
              }
            >
              Appel rendu
            </button>
          ) : null}
        </div>
      ))}
      {rendu}
    </section>
  )
}

// ── GestesEnvoi (Salle des envois) ────────────────────────────────────────────────────────────────────────────────────────
type Gestes = {
  envoi_froid: boolean
  epreuve_passee: boolean
  epreuve_le: string | null
  mesure_a_sec: boolean
  notice_verifiee_le: string | null
  technologies_pause: string[]
  modeles_suspendus: string[]
}
const OUVERTURE = Date.parse('2026-10-12T00:00:00+02:00')
export const CONFIRMATION_OUVERTURE = 'Ouvrir l’envoi à froid ? Les agents rempliront les formulaires de contact des artisans dès lundi, 8 h.'
export const PHRASE_PLAFOND = 'Au-delà de 40 par jour, c’est ta décision : les agents ne montent jamais seuls au-dessus.'

function raisonFermee(g: Gestes): string | null {
  if (Date.now() < OUVERTURE) return 'Pas avant le lundi 12/10.'
  if (!g.mesure_a_sec) return 'La mesure à sec n’a pas réussi.'
  if (!g.epreuve_passee) return 'L’épreuve de bout en bout n’a pas encore réussi.'
  if (!g.notice_verifiee_le || Date.now() - Date.parse(g.notice_verifiee_le) > 7 * 86_400_000) {
    return 'La notice en ligne n’est pas vérifiée.'
  }
  return null
}

export function GestesEnvoi({
  gestes,
  canaux,
  role = 'direction',
}: {
  gestes: Gestes
  canaux?: { canal: string; sante: string; libelle?: string }[]
  role?: Role
}) {
  const { lancer, rendu } = useGeste()
  const [confirmer, setConfirmer] = useState<{ texte: string; appel: Appel } | null>(null)
  const [palier, setPalier] = useState('P1')
  const [parJour, setParJour] = useState('20')

  if (role === 'lecture') return null

  const n = Number(parJour)
  const nValide = Number.isInteger(n) && n >= 0 && n <= 300
  const demander = (texte: string, corps: Record<string, unknown>, action: string) =>
    setConfirmer({ texte, appel: { chemin: '/api/controle/pilotage/gestes', corps, portee: 'securite', action } })
  const fermee = raisonFermee(gestes)
  const arretes = (canaux ?? []).filter((c) => c.sante === 'arretee')

  return (
    <section data-gestes-envoi className="mc-gestes-envoi">
      <h3 className="mc-maj">Gestes du fondateur</h3>
      {!gestes.envoi_froid ? (
        <div>
          <button
            type="button"
            data-geste="ouvrir_envoi_froid"
            disabled={!!fermee}
            onClick={() => demander(CONFIRMATION_OUVERTURE, { geste: 'ouvrir_envoi_froid' }, 'ouvrir l’envoi à froid')}
          >
            Ouvrir l’envoi à froid
          </button>
          {fermee ? <p data-raison-fermee className="mc-petit">{fermee}</p> : null}
        </div>
      ) : null}
      {gestes.technologies_pause?.map((t) => (
        <button
          key={t}
          type="button"
          data-geste="reprendre_technologie"
          data-technologie={t}
          onClick={() => demander(`Reprendre la technologie ${t} ?`, { geste: 'reprendre_technologie', technologie: t }, `reprendre ${t}`)}
        >
          Reprendre la technologie {t}
        </button>
      ))}
      {arretes.map((c) => (
        <button
          key={c.canal}
          type="button"
          data-geste="rouvrir_canal"
          data-canal={c.canal}
          onClick={() => demander(`Rouvrir le canal ${c.libelle ?? c.canal} ?`, { geste: 'rouvrir_canal', canal: c.canal }, `rouvrir ${c.canal}`)}
        >
          Rouvrir le canal {c.libelle ?? c.canal}
        </button>
      ))}
      {gestes.modeles_suspendus?.map((m) => (
        <button
          key={m}
          type="button"
          data-geste="lever_modele"
          data-modele={m}
          data-modele-suspendu={m}
          onClick={() => demander(`Lever la suspension de ${m} ?`, { geste: 'lever_modele', modele: m }, `lever ${m}`)}
        >
          Lever la suspension · {m}
        </button>
      ))}
      <form
        data-geste="palier_plafond"
        onSubmit={(e) => {
          e.preventDefault()
          if (nValide) demander(`Plafond du palier ${palier} : ${n} formulaires par jour ?`, { geste: 'palier_plafond', palier, par_jour: n }, 'changer le plafond')
        }}
      >
        <label className="mc-petit">
          Palier
          <select data-palier-choix value={palier} onChange={(e) => setPalier(e.target.value)}>
            {['P0', 'P1', 'P2', 'P3', 'P4'].map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <label className="mc-petit">
          Formulaires par jour
          <input
            data-par-jour
            type="number"
            min={0}
            max={300}
            step={1}
            value={parJour}
            onChange={(e) => setParJour(e.target.value)}
          />
        </label>
        {nValide && n > 40 ? <p data-phrase-plafond className="mc-petit">{PHRASE_PLAFOND}</p> : null}
        {!nValide ? <p className="mc-panne" data-plafond-refuse>De 0 à 300 formulaires par jour.</p> : null}
        <button type="submit" disabled={!nValide}>Plafond du palier</button>
      </form>
      {confirmer ? (
        <div data-confirmation role="alertdialog" aria-label="Confirmation">
          <p>{confirmer.texte}</p>
          <div>
            <button
              type="button"
              data-confirmer
              onClick={() => {
                const a = confirmer.appel
                setConfirmer(null)
                lancer(a)
              }}
            >
              Confirmer
            </button>
            <button type="button" onClick={() => setConfirmer(null)}>Annuler</button>
          </div>
        </div>
      ) : null}
      {rendu}
    </section>
  )
}
