'use client'

// L'ASSISTANT DE GESTION DANS LE CRM (demande du fondateur du 21/10/2026 : « utilisable directement dans le CRM, sans changer d'écran »).
//
// Un bouton fixe « Assistant » (barre de l'atelier, fiche chantier) ouvre un panneau latéral de conversation. AUCUN second moteur : le
// panneau parle à POST /api/assistant et POST /api/assistant/actions par le même module que la page /assistant
// (app/assistant/useConversation.ts), et montre les mêmes cartes (app/assistant/CarteView.tsx). Les règles ne changent pas : ce qui est
// interne est fait et noté au journal ; ce qui part chez un client attend « Confirmer » (ou le pilote automatique, offre Signature).
//
//  • CONTEXTE : l'objet sélectionné dans la maquette, ou la fiche ouverte (« ce chantier »), part avec le message — { type, id } seulement ;
//    le serveur le relit sous le compte et l'écarte s'il n'est pas à lui (lib/crm/contexteAssistantServeur.ts).
//  • OFFRE : l'assistant est Signature (capacité `assistant`, lib/plans.ts) ; sinon le bouton est verrouillé et mène à /abonnement.
//  • EXEMPLE et démonstration : réponses SIMULÉES (lib/crm/assistantCrm.ts, reponseExemple) — aucun appel à /api/assistant, rien d'écrit.
//  • Après une réponse : la vue du CRM est relue (onApres), le poste relit son fil, et les objets sur lesquels l'assistant a agi sont mis
//    en évidence dans la maquette (surligner).
//  • ACCESSIBILITÉ : dialogue modal (aria-modal), focus porté dans le panneau et rendu au bouton à la fermeture, Tab qui reste dans le
//    panneau, Échap qui ferme ; sur téléphone, le panneau prend tout l'écran.
import '@/app/assistant/assistant.css'
import './assistant-crm.css'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { appel } from '../client'
import { enEssai } from '@/lib/flags'
import { messageVerrou, peut } from '@/lib/plans'
import { tierAllowed, type Tier } from '@/lib/models'
import { MESSAGE_MAX } from '@/lib/assistant/cadrage'
import { EV_OUVRIR, MOT_CONTEXTE, reponseExemple, suggestionsPour, type ContexteAssistant } from '@/lib/crm/assistantCrm'
import { CarteView } from '@/app/assistant/CarteView'
import { useConversationAssistant, type Bulle } from '@/app/assistant/useConversation'
import { abonnerAcces, lireAcces, ouvrirAssistant, publierAcces, signalerActivite, surligner, type AccesAssistant } from './evenements'

type Acces = AccesAssistant

/** Qui peut ouvrir le panneau : drapeau et essai (`/api/essais`), puis l'offre lue sous la RLS. Simulé (exemple, démonstration) : ouvert, sans rien lire. */
function useAcces(simule: boolean): { acces: Acces; uid: string | null; tier: Tier } {
  const [acces, setAcces] = useState<Acces>(simule ? 'ok' : 'attente')
  const [uid, setUid] = useState<string | null>(null)
  const [tier, setTier] = useState<Tier>('standard')
  useEffect(() => {
    if (simule) { setAcces('ok'); return }
    let fini = false
    void (async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) { if (!fini) setAcces('absent'); return }
      // Le seul accès réseau du CRM passe par appel() (lecture : jamais bloquée en exemple, et le mode simulé ne vient pas ici).
      const lu = await appel<{ assistant?: boolean }>('/api/essais')
      const essai = lu.ok ? lu.corps : {}
      if (fini) return
      // Une fonctionnalité non ouverte à ce compte n'apparaît pas (règle des drapeaux).
      if (essai.assistant !== true) { setAcces('absent'); return }
      const { data: art } = await supabase.from('artisans').select('plan, is_founder').eq('id', data.session.user.id).maybeSingle()
      if (fini) return
      const plan = art?.is_founder ? 'business' : (art?.plan as string) || 'gratuit'
      setUid(data.session.user.id)
      setTier(tierAllowed('pro', plan) ? 'pro' : 'standard')
      setAcces(art?.is_founder || peut(plan, 'assistant') ? 'ok' : 'verrou')
    })()
    return () => { fini = true }
  }, [simule])
  return { acces, uid, tier }
}

const FOCUSABLES = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function AssistantCrm({ simule, contexteSelection = null, onApres, ouvrirAuDemarrage = false }: {
  /** Exemple du CRM ou démonstration : réponses simulées, aucun appel, rien d'écrit. */
  simule: boolean
  /** L'objet sélectionné dans la maquette, ou la fiche ouverte : le contexte du bouton « Assistant ». */
  contexteSelection?: ContexteAssistant | null
  /** Après une réponse de l'assistant : relire la vue du CRM (la maquette et les panneaux se mettent à jour). */
  onApres?: () => void
  /** Page de démonstration (« ?assistant=1 ») : le panneau s'ouvre tout de suite (captures). */
  ouvrirAuDemarrage?: boolean
}) {
  const { acces, uid, tier } = useAcces(simule)
  // Les boutons « Demander à l'assistant » (fiches, panneaux de la maquette) lisent cet état : ouvrir, ou renvoyer vers les offres.
  useEffect(() => { publierAcces(acces); return () => publierAcces('attente') }, [acces])
  const [ouvert, setOuvert] = useState(false)
  const [contexte, setContexte] = useState<ContexteAssistant | null>(null)
  const bouton = useRef<HTMLButtonElement>(null)
  const retour = useRef<HTMLElement | null>(null)

  const ouvrir = useCallback((c: ContexteAssistant | null) => {
    const actif = document.activeElement as HTMLElement | null
    retour.current = actif && actif !== document.body ? actif : bouton.current
    setContexte(c)
    setOuvert(true)
  }, [])
  const fermer = useCallback(() => {
    setOuvert(false)
    // Le focus revient là où il était (le bouton « Assistant » ou « Demander à l'assistant »).
    window.setTimeout(() => (retour.current && document.contains(retour.current) ? retour.current : bouton.current)?.focus(), 0)
  }, [])

  // « Demander à l'assistant » depuis une fiche ou un panneau : un événement du document (app/crm/assistant/evenements.ts).
  useEffect(() => {
    if (acces !== 'ok') return
    const f = (e: Event) => ouvrir((e as CustomEvent<ContexteAssistant | null>).detail ?? null)
    window.addEventListener(EV_OUVRIR, f)
    return () => window.removeEventListener(EV_OUVRIR, f)
  }, [acces, ouvrir])
  useEffect(() => { if (ouvrirAuDemarrage && acces === 'ok') ouvrir(contexteSelection) }, [ouvrirAuDemarrage, acces]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!enEssai('assistant') || acces === 'absent' || acces === 'attente') return null
  if (acces === 'verrou') {
    return (
      <a className="aca-bouton verrou" href="/abonnement" title={messageVerrou('assistant')} data-assistant-bouton="verrou" aria-label={`Assistant de gestion — ${messageVerrou('assistant')} Voir les offres.`}>
        <Cadenas /> Assistant <span className="aca-offre">Signature</span>
      </a>
    )
  }
  return (
    <>
      <button ref={bouton} type="button" className="aca-bouton" aria-haspopup="dialog" aria-expanded={ouvert} data-assistant-bouton="ouvrir"
        onClick={() => (ouvert ? fermer() : ouvrir(contexteSelection))}
        title={contexteSelection ? `Demander à l’assistant — ${MOT_CONTEXTE[contexteSelection.type]} « ${contexteSelection.libelle} »` : 'Demander à l’assistant de gestion'}>
        <i className="aca-pouls" aria-hidden="true" />Assistant
      </button>
      {ouvert && <Panneau simule={simule} uid={uid} tier={tier} contexte={contexte} onRetirerContexte={() => setContexte(null)} onFermer={fermer} onApres={onApres} />}
    </>
  )
}

/**
 * « Demander à l'assistant » depuis une fiche ou le panneau d'un objet : ouvre le panneau avec CE contexte. Hors offre : renvoie vers
 * /abonnement. Rien tant que le panneau n'a pas dit si l'assistant est ouvert à ce compte (aucun bouton mort).
 */
export function BoutonDemander({ contexte, className = 'psh-btn ghost' }: { contexte: ContexteAssistant | null; className?: string }) {
  const acces = useSyncExternalStore(abonnerAcces, lireAcces, () => 'attente' as AccesAssistant)
  if (acces === 'verrou') return <a className={className} href="/abonnement" title={messageVerrou('assistant')} data-assistant-demander="verrou"><Cadenas /> Demander à l’assistant</a>
  if (acces !== 'ok') return null
  return <button type="button" className={className} onClick={() => ouvrirAssistant(contexte)} data-assistant-demander={contexte?.type ?? 'general'}>Demander à l’assistant</button>
}

function Cadenas() {
  return <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 1 1 6 0v3H9Z" /></svg>
}

function Panneau({ simule, uid, tier, contexte, onRetirerContexte, onFermer, onApres }: {
  simule: boolean; uid: string | null; tier: Tier; contexte: ContexteAssistant | null
  onRetirerContexte: () => void; onFermer: () => void; onApres?: () => void
}) {
  const boite = useRef<HTMLElement>(null)
  const saisieRef = useRef<HTMLTextAreaElement>(null)
  const filRef = useRef<HTMLDivElement>(null)
  const [saisie, setSaisie] = useState('')
  const [retenu, setRetenu] = useState<'oui' | 'non' | null>(null)
  const debut = useRef<string>(new Date().toISOString())

  // Après une réponse (vraies données) : relire la vue du CRM, le fil du poste, et mettre en évidence ce que l'assistant a touché.
  const apres = useCallback(() => {
    onApres?.()
    signalerActivite()
    if (!uid) return
    void (async () => {
      const { data } = await supabase.from('assistant_actions').select('objet_type, objet_id').eq('artisan_id', uid).gte('maj_le', debut.current).limit(12)
      const objets = ((data ?? []) as { objet_type: string | null; objet_id: string | null }[]).filter((o) => o.objet_type && o.objet_id).map((o) => ({ type: o.objet_type as string, id: o.objet_id as string }))
      if (objets.length) surligner(objets)
    })()
  }, [onApres, uid])
  const conv = useConversationAssistant({
    tier, contexte: simule ? null : contexte,
    onApres: apres,
    onContexte: (c) => setRetenu(contexte ? (c ? 'oui' : 'non') : null),
  })
  // L'exemple : une conversation SIMULÉE, tenue ici, sans réseau.
  const [bullesExemple, setBullesExemple] = useState<Bulle[]>([])
  const bulles = simule ? bullesExemple : conv.bulles
  const enCours = simule ? false : conv.enCours

  const envoyer = async (texte: string) => {
    const t = texte.trim()
    if (!t || enCours) return
    setSaisie('')
    if (simule) {
      setBullesExemple((x) => [...x, { role: 'artisan', texte: t }, { role: 'assistant', texte: reponseExemple(t, contexte) }])
      // La maquette montre où l'assistant agirait (rien n'est écrit).
      if (contexte && ['chantier', 'vehicule', 'membre'].includes(contexte.type)) surligner({ type: contexte.type, id: contexte.id })
      return
    }
    debut.current = new Date(Date.now() - 2000).toISOString()
    await conv.envoyer(t)
  }

  // Focus dans le panneau à l'ouverture ; Tab reste dedans ; Échap ferme (sans fermer aussi le panneau de l'objet en dessous).
  useEffect(() => { saisieRef.current?.focus() }, [])
  useEffect(() => {
    const clavier = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onFermer(); return }
      if (e.key !== 'Tab' || !boite.current) return
      const f = [...boite.current.querySelectorAll<HTMLElement>(FOCUSABLES)].filter((x) => x.offsetParent !== null || x === document.activeElement)
      if (!f.length) return
      const premier = f[0], dernier = f[f.length - 1]
      if (!boite.current.contains(document.activeElement)) { e.preventDefault(); premier.focus(); return }
      if (e.shiftKey && document.activeElement === premier) { e.preventDefault(); dernier.focus() }
      else if (!e.shiftKey && document.activeElement === dernier) { e.preventDefault(); premier.focus() }
    }
    window.addEventListener('keydown', clavier, true)
    return () => window.removeEventListener('keydown', clavier, true)
  }, [onFermer])
  useEffect(() => { const el = filRef.current; if (el) el.scrollTop = el.scrollHeight }, [bulles, conv.consulte])

  const suggestions = suggestionsPour(contexte)
  const maintenant = Date.now()
  return (
    <div className="acp-fond" onMouseDown={(e) => { if (e.target === e.currentTarget) onFermer() }} data-assistant-panneau-fond>
      <aside ref={boite} className="acp" role="dialog" aria-modal="true" aria-labelledby="acp-titre" aria-describedby="acp-regle" data-assistant-panneau={simule ? 'exemple' : 'reel'}>
        <header className="acp-tete">
          <div>
            <h2 id="acp-titre"><i className="aca-pouls" aria-hidden="true" />Assistant de gestion</h2>
            <p id="acp-regle" className="acp-regle">Il fait ce qui se défait d’un clic ; ce qui part chez un client attend votre « Confirmer ».</p>
          </div>
          <button type="button" className="acp-fermer" onClick={onFermer} aria-label="Fermer l’assistant">×</button>
        </header>
        {contexte && (
          <div className="acp-contexte" data-assistant-contexte={contexte.type}>
            <span>À propos de : <b>{MOT_CONTEXTE[contexte.type]} « {contexte.libelle} »</b>{retenu === 'non' ? <span className="muted"> — non retrouvé dans vos données : l’assistant répond sans.</span> : null}</span>
            <button type="button" className="acp-retirer" onClick={() => { onRetirerContexte(); setRetenu(null) }} aria-label="Ne plus parler de cet élément">×</button>
          </div>
        )}
        {simule && <p className="acp-exemple" role="note">Exemple : réponses simulées, rien n’est lu, envoyé ni enregistré.</p>}
        <div className="acp-fil" ref={filRef} aria-live="polite">
          {bulles.length === 0 && (
            <p className="muted acp-accueil">{contexte ? `Que voulez-vous faire pour ce ${MOT_CONTEXTE[contexte.type]} ?` : 'Dites ce qu’il y a à faire : chantiers, tâches, stock, devis, factures, relances.'}</p>
          )}
          {bulles.map((b, i) => (
            <div key={i} className={`asst-bulle ${b.role}${b.erreur ? ' erreur' : ''}`}>
              <div className="asst-texte">{b.texte.split('\n').map((l, j) => <span key={j}>{l}<br /></span>)}</div>
              {b.carteIds?.length ? (
                <div className="asst-cartes">
                  {b.carteIds.map((id) => conv.cartes[id]).filter(Boolean).map((c) => {
                    const v = c.statut === 'en_attente' && c.expire_le && Date.parse(c.expire_le) < maintenant ? { ...c, statut: 'expiree' as const } : c
                    return <CarteView key={c.id} c={v} occupee={!!conv.occupees[c.id]} erreur={conv.erreursCartes[c.id]} onDecision={conv.decider} />
                  })}
                </div>
              ) : null}
              {b.brouillons?.length ? b.brouillons.map((d, j) => <a key={j} className="asst-carte-lien" href={d.lien}>{d.type === 'devis' ? 'Ouvrir le brouillon de devis' : 'Ouvrir la réponse préparée'} · {d.libelle}</a>) : null}
            </div>
          ))}
          {enCours && <div className="asst-bulle assistant attente" role="status"><span className="asst-point" aria-hidden="true" />{conv.consulte ? `L’assistant travaille : ${conv.consulte}…` : 'L’assistant réfléchit…'}</div>}
        </div>
        <div className="acp-suggestions" role="group" aria-label="Suggestions">
          {suggestions.map((s) => (
            <button key={s.texte} type="button" className={`asst-exemple${s.envoi === 'completer' ? ' action' : ''}`} disabled={enCours} data-assistant-suggestion={s.envoi}
              onClick={() => { if (s.envoi === 'direct') void envoyer(s.texte); else { setSaisie(s.texte); saisieRef.current?.focus() } }}>
              {s.texte}
            </button>
          ))}
        </div>
        <form className="acp-saisie" onSubmit={(e) => { e.preventDefault(); void envoyer(saisie) }}>
          <textarea ref={saisieRef} value={saisie} maxLength={MESSAGE_MAX} rows={2} disabled={enCours || (!simule && conv.restants <= 0)}
            onChange={(e) => setSaisie(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void envoyer(saisie) } }}
            placeholder={!simule && conv.restants <= 0 ? 'Conversation terminée : ouvrez-en une nouvelle.' : 'Votre commande ou votre question…'} aria-label="Votre commande à l’assistant" />
          <div className="acp-barre">
            {!simule && <button type="button" className="psh-btn ghost" onClick={conv.nouvelleConversation} disabled={enCours}>Nouvelle conversation</button>}
            {!simule && <a className="acp-lien" href="/assistant">Ouvrir le poste complet</a>}
            <button type="submit" className="psh-btn primary" disabled={enCours || !saisie.trim()}>{enCours ? '…' : 'Envoyer'}</button>
          </div>
        </form>
        <p className="acp-annonce crm-sr" role="status" aria-live="polite">{simule ? '' : conv.annonce}</p>
      </aside>
    </div>
  )
}
