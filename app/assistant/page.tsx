'use client'

import './assistant.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { notFound, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/app/AppShell'
import { enEssai } from '@/lib/flags'
import { CREDIT_COST, messageVerrou, peut } from '@/lib/plans'
import { TIERS, tierAllowed, type Tier } from '@/lib/models'
import { MESSAGE_MAX } from '@/lib/assistant/cadrage'
import type { CarteAction, StatutAction } from '@/lib/assistant/cartes'
import { CarteView, heure, libelleOutil } from './CarteView'
import { useConversationAssistant } from './useConversation'

// L'assistant de gestion — le POSTE DE COMMANDE (plans/016-assistant.md, jalon A3). L'artisan gère sa plateforme en parlant :
// l'assistant lit, prépare et AGIT (devis, factures, tarifs, stock, CRM, messages). Trois zones :
//  • la conversation (à gauche) : l'artisan écrit, l'assistant répond, les CARTES d'action s'affichent sous sa réponse ;
//  • le poste (à droite) : « À confirmer » (ce qui attend son clic), « Actions » (ce qui a été fait, avec Annuler quand c'est
//    possible), « Journal » (ce que l'assistant a lu ou préparé) ;
//  • la barre de commande, avec des exemples et le briefing du matin.
// Tout ce qui part chez un client, toute facture émise, tout encaissement, toute suppression et tout lot de prix passe par une carte
// que l'artisan confirme : rien n'est fait avant son clic (le serveur le garantit, pas seulement cet écran).

// La conversation elle-même (envoi, flux, cartes, décisions) vit dans ./useConversation.ts : le même moteur sert le panneau de
// l'assistant dans le CRM (app/crm/assistant/PanneauAssistant.tsx).
type LigneJournal = { id: string; cree_le: string; outil: string; resultat: string; resume: string; objet_type: string | null; objet_id: string | null }
type LigneAction = { id: string; outil: string; mode: 'direct' | 'confirmation'; statut: StatutAction; titre: string; apercu: CarteAction | null; resultat_resume: string | null; cree_le: string; expire_le: string | null; libelle_annulation: string | null }

/** Les exemples qui LISENT : un clic les envoie. */
const EXEMPLES_LECTURE = [
  'Briefing du matin',
  'Qu’est-ce qui est en alerte dans mon stock ?',
  'Quelles factures sont impayées ?',
  'Qui attend une réponse de ma part ?',
]
/** Les exemples qui AGISSENT : un clic les met dans la barre de commande, à compléter (nom du client, quantité…) avant d’envoyer. */
const EXEMPLES_ACTION = [
  'Fais le devis de Mme Martin pour 12 m² de carrelage',
  'Relance les factures impayées de plus de 30 jours',
  'Augmente mes tarifs de pose de 5 %',
  'Ajoute 20 boîtes de vis inox au stock de l’atelier',
]
const EXEMPLES_CRM = [
  'Où en sont mes chantiers ?',
  'Qui est sur quel chantier aujourd’hui ?',
  'Qu’est-ce qui est à facturer ?',
]
/** Une ligne de la table des actions (lue sous la RLS) devient la carte que l'écran sait afficher. */
function carteDeLigne(l: LigneAction): CarteAction {
  const a = (l.apercu ?? {}) as Partial<CarteAction>
  return {
    titre: a.titre ?? l.titre, lignes: a.lignes ?? [], avant_apres: a.avant_apres ?? [], message: a.message ?? null, alertes: a.alertes ?? [],
    irreversible: !!a.irreversible, lien: a.lien ?? null,
    id: l.id, outil: l.outil as CarteAction['outil'], mode: l.mode, statut: l.statut,
    annulable: l.statut === 'executee' && !!l.libelle_annulation, annulation_libelle: l.libelle_annulation,
    resultat: l.resultat_resume, cree_le: l.cree_le, expire_le: l.expire_le,
  }
}

export default function PageAssistant() {
  if (!enEssai('assistant')) notFound()
  return <Assistant />
}

function Assistant() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [uid, setUid] = useState<string | null>(null)
  const [bloque, setBloque] = useState<string | null>(null)
  const [plan, setPlan] = useState('gratuit')
  const [tier, setTier] = useState<Tier>('pro')
  const [crm, setCrm] = useState(false)
  const [saisie, setSaisie] = useState('')
  const [onglet, setOnglet] = useState<'confirmer' | 'actions' | 'journal'>('confirmer')
  const [journal, setJournal] = useState<LigneJournal[] | null>(null)
  const [journalErreur, setJournalErreur] = useState(false)
  // Le journal ne garde que l'identifiant de l'objet (RGPD) : les noms se relisent ici, sous la RLS, à l'affichage.
  const [nomsObjets, setNomsObjets] = useState<Record<string, string>>({})
  const [actionsLues, setActionsLues] = useState<boolean | null>(null)
  // Après chaque réponse ou décision : relire les actions (et le journal s'il est ouvert). Une référence, posée plus bas, quand les
  // deux lectures existent.
  const apres = useRef<() => void>(() => {})
  // Les cartes d'action, par identifiant : une carte vue dans la conversation et dans le poste est LA MÊME (une décision la met à jour partout).
  const { bulles, enCours, consulte, restants, cartes, fusionnerCartes, occupees, erreursCartes, annonce, envoyer: envoyerAuServeur, decider, nouvelleConversation } = useConversationAssistant({
    tier,
    onCartes: (nouvelles) => { if (nouvelles.some((c) => c.statut === 'en_attente')) setOnglet('confirmer') },
    onApres: () => apres.current(),
  })
  const filRef = useRef<HTMLDivElement>(null)
  const saisieRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const id = data.session.user.id
      // Essai (lib/flags.ts ESSAI) : le serveur dit si CE compte y a accès ; sinon retour au tableau de bord.
      const essai = await fetch('/api/essais', { headers: { Authorization: `Bearer ${data.session.access_token}` } })
        .then((r) => (r.ok ? r.json() : {})).catch(() => ({})) as { assistant?: boolean; crm?: boolean }
      if (essai.assistant !== true) { router.replace('/dashboard'); return }
      setUid(id)
      const { data: art } = await supabase.from('artisans').select('plan, is_founder').eq('id', id).maybeSingle()
      const p = art?.is_founder ? 'business' : (art?.plan as string) || 'gratuit'
      setPlan(p)
      // Pro par défaut quand l'offre le permet (même crédit que Standard) : un agent qui agit a besoin du bon outillage.
      setTier(tierAllowed('pro', p) ? 'pro' : 'standard')
      // Les exemples CRM ne s'affichent que si le CRM est ouvert au compte (la route décide seule de ses outils).
      setCrm(essai.crm === true && peut((art?.plan as string) || 'gratuit', 'crm'))
      if (!art?.is_founder && !peut(p, 'assistant')) setBloque(`L’assistant de gestion n’est pas dans votre offre. ${messageVerrou('assistant')}`)
      setReady(true)
    })
  }, [router])

  useEffect(() => { const el = filRef.current; if (el) el.scrollTop = el.scrollHeight }, [bulles, consulte])

  const chargerActions = useCallback(async () => {
    if (!uid) return
    // Lues sous la RLS, comme le journal : l'artisan ne voit que SES actions (migration 0157). Table absente : la liste reste vide.
    const { data, error } = await supabase.from('assistant_actions')
      .select('id, outil, mode, statut, titre, apercu, resultat_resume, cree_le, expire_le, libelle_annulation:annulation->>libelle')
      .eq('artisan_id', uid).order('cree_le', { ascending: false }).limit(40)
    if (error) { setActionsLues(false); return }
    setActionsLues(true)
    fusionnerCartes(((data ?? []) as unknown as LigneAction[]).map(carteDeLigne))
  }, [uid, fusionnerCartes])
  useEffect(() => { if (ready && uid && !bloque) void chargerActions() }, [ready, uid, bloque, chargerActions])

  const chargerJournal = useCallback(async () => {
    if (!uid) return
    // Lu sous la RLS, comme les autres écrans : l'artisan ne voit que son journal (migration 0150).
    const { data, error } = await supabase.from('assistant_journal')
      .select('id, cree_le, outil, resultat, resume, objet_type, objet_id')
      .eq('artisan_id', uid).order('cree_le', { ascending: false }).limit(30)
    setJournalErreur(!!error)
    const lignes = (data as LigneJournal[] | null) ?? []
    setJournal(lignes)
    const ids = (t: string) => [...new Set(lignes.filter((l) => l.objet_type === t && l.objet_id).map((l) => l.objet_id as string))]
    const [convs, devis] = await Promise.all([
      ids('conversation').length ? supabase.from('leads').select('id, nom_prospect').eq('artisan_id', uid).in('id', ids('conversation')) : Promise.resolve({ data: [] }),
      ids('devis').length ? supabase.from('devis').select('id, numero, client_nom').eq('artisan_id', uid).in('id', ids('devis')) : Promise.resolve({ data: [] }),
    ])
    const noms: Record<string, string> = {}
    for (const l of (convs.data ?? []) as { id: string; nom_prospect: string | null }[]) if (l.nom_prospect?.trim()) noms[l.id] = l.nom_prospect.trim()
    for (const d of (devis.data ?? []) as { id: string; numero: string | null; client_nom: string | null }[]) {
      const n = [d.numero, d.client_nom?.trim()].filter(Boolean).join(' · ')
      if (n) noms[d.id] = n
    }
    setNomsObjets(noms)
  }, [uid])
  useEffect(() => { if (onglet === 'journal' && journal === null) void chargerJournal() }, [onglet, journal, chargerJournal])

  apres.current = () => { void chargerActions(); if (journal !== null) void chargerJournal() }

  const envoyer = async (texte: string) => {
    if (!texte.trim() || enCours) return
    setSaisie('')
    await envoyerAuServeur(texte)
  }

  const preparer = (texte: string) => { setSaisie(texte); saisieRef.current?.focus() }

  const liste = useMemo(() => Object.values(cartes).sort((a, b) => b.cree_le.localeCompare(a.cree_le)), [cartes])
  const maintenant = Date.now()
  const aConfirmer = liste.filter((c) => c.statut === 'en_attente' && !(c.expire_le && Date.parse(c.expire_le) < maintenant))
  const faites = liste.filter((c) => c.statut !== 'en_attente' || (c.expire_le && Date.parse(c.expire_le) < maintenant))

  if (!ready) return <AppShell active="assistant" title="Assistant de gestion"><div className="tool-card"><p className="muted">Chargement…</p></div></AppShell>
  if (bloque) {
    return (
      <AppShell active="assistant" title="Assistant de gestion">
        <div className="psh-panel asst-verrou"><p>{bloque}</p><a className="btn btn--primary" style={{ width: 'auto' }} href="/abonnement">Voir les offres</a></div>
      </AppShell>
    )
  }

  const paliers = TIERS.filter((x) => plan === 'business' || tierAllowed(x.value, plan))
  const carteDe = (id: string) => cartes[id]
  const vue = (c: CarteAction) => c.statut === 'en_attente' && c.expire_le && Date.parse(c.expire_le) < maintenant ? { ...c, statut: 'expiree' as StatutAction } : c
  return (
    <AppShell active="assistant" title="Assistant de gestion" crumb={`Dès l’offre Studio · assistant IA (Claude, Anthropic) · il gère vos devis, factures, stock et tarifs à votre demande${crm ? ', et votre CRM' : ' (le CRM : offre Signature)'} : ce qui part chez un client attend votre clic${peut(plan, 'assistant.pilote') ? ', sauf ce que vous confiez au Pilote automatique' : ''}`} wide
      actions={<button type="button" className="btn btn--ghost" style={{ width: 'auto' }} onClick={nouvelleConversation} disabled={enCours}>Nouvelle conversation</button>}>
      <div className="asst">
        <section className="psh-panel asst-panneau" aria-label="Conversation avec l’assistant">
          <div className="asst-fil" ref={filRef} aria-live="polite">
            {bulles.length === 0 ? (
              <div className="asst-accueil">
                <p className="asst-accueil-titre">Dites ce qu’il y a à faire.</p>
                <p className="muted">Devis, factures, relances, stock, tarifs{crm ? ', chantiers et équipe' : ''} : l’assistant les gère à votre place. Il fait directement ce qui se défait d’un clic (brouillons, tarifs, stock, tâches) ; ce qui part chez un client, une facture émise, un encaissement, une suppression ou un lot de prix s’affiche d’abord sur une carte, et ne se fait qu’après votre « Confirmer ».</p>
                <button type="button" className="btn btn--primary asst-briefing" style={{ width: 'auto' }} onClick={() => void envoyer('Briefing du matin')} disabled={enCours}>Briefing du matin</button>
                <p className="asst-groupe">Commandes à compléter</p>
                <div className="asst-exemples">
                  {EXEMPLES_ACTION.map((e) => <button key={e} type="button" className="asst-exemple action" onClick={() => preparer(e)}>{e}</button>)}
                </div>
                <p className="asst-groupe">Questions</p>
                <div className="asst-exemples">
                  {[...EXEMPLES_LECTURE.slice(1), ...(crm ? EXEMPLES_CRM : [])].map((e) => <button key={e} type="button" className="asst-exemple" onClick={() => void envoyer(e)}>{e}</button>)}
                </div>
              </div>
            ) : bulles.map((b, i) => (
              <div key={i} className={`asst-bulle ${b.role}${b.erreur ? ' erreur' : ''}`}>
                <div className="asst-texte">{b.texte.split('\n').map((l, j) => <span key={j}>{l}<br /></span>)}</div>
                {b.carteIds?.length ? (
                  <div className="asst-cartes">
                    {b.carteIds.map((id) => carteDe(id)).filter((c): c is CarteAction => !!c).map((c) => <CarteView key={c.id} c={vue(c)} occupee={!!occupees[c.id]} erreur={erreursCartes[c.id]} onDecision={decider} />)}
                  </div>
                ) : null}
                {b.brouillons?.length ? (
                  <div className="asst-brouillons">
                    {b.brouillons.map((d, j) => d.type === 'tableau' ? (
                      // 29/10 — un classeur Excel fabriqué par l'assistant (exporter_tableau) : le lien EST le fichier, il se télécharge.
                      <div key={j} className="asst-brouillon">
                        <span className="asst-brouillon-lab">Tableau Excel · {d.libelle}</span>
                        <span className="asst-brouillon-note">Fabriqué à partir de vos données, tel quel : rien n’a été modifié.</span>
                        <a className="btn btn--primary" style={{ width: 'auto' }} href={d.lien} download={d.fichier}>Télécharger</a>
                      </div>
                    ) : (
                      <div key={j} className="asst-brouillon">
                        <span className="asst-brouillon-lab">{d.type === 'devis' ? 'Brouillon de devis' : 'Réponse préparée'} · {d.libelle}</span>
                        <span className="asst-brouillon-note">Rien n’est parti. Vous le relisez et le validez dans {d.type === 'devis' ? 'l’écran Devis' : 'Messages'}.</span>
                        <a className="btn btn--primary" style={{ width: 'auto' }} href={d.lien}>Ouvrir le brouillon</a>
                      </div>
                    ))}
                  </div>
                ) : null}
                {b.role === 'assistant' && b.consultes?.length ? <span className="asst-consultes">A consulté : {b.consultes.join(', ')}</span> : null}
              </div>
            ))}
            {enCours ? <div className="asst-bulle assistant attente" role="status"><span className="asst-point" aria-hidden="true" />{consulte ? `L’assistant travaille : ${consulte}…` : 'L’assistant réfléchit…'}</div> : null}
          </div>

          <form className="asst-saisie" onSubmit={(e) => { e.preventDefault(); void envoyer(saisie) }}>
            <textarea ref={saisieRef} value={saisie} maxLength={MESSAGE_MAX} rows={2} disabled={enCours || restants <= 0}
              onChange={(e) => setSaisie(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void envoyer(saisie) } }}
              placeholder={restants <= 0 ? 'Conversation terminée : ouvrez-en une nouvelle.' : 'Votre commande ou votre question…'} aria-label="Votre commande à l’assistant" />
            <div className="asst-barre">
              <label className="asst-palier">Modèle
                <select value={tier} onChange={(e) => setTier(e.target.value as Tier)} disabled={enCours}>
                  {paliers.map((p) => <option key={p.value} value={p.value}>{p.label} · {CREDIT_COST[p.value]} crédit{CREDIT_COST[p.value] > 1 ? 's' : ''} par message</option>)}
                </select>
              </label>
              <button type="button" className="asst-exemple" onClick={() => void envoyer('Briefing du matin')} disabled={enCours || restants <= 0}>Briefing du matin</button>
              <span className="asst-restants muted">{restants} message{restants > 1 ? 's' : ''} restant{restants > 1 ? 's' : ''} dans cette conversation</span>
              <button type="submit" className="btn btn--primary" style={{ width: 'auto' }} disabled={enCours || !saisie.trim() || restants <= 0}>{enCours ? '…' : 'Envoyer'}</button>
            </div>
            <p className="asst-note muted">Un devis ou une réponse préparés par le moteur consomment aussi leurs crédits, comme les boutons « Devis auto » et « Proposer une réponse ». Confirmer, écarter ou annuler une carte ne coûte rien.</p>
            {/* Transparence (audit RGPD du 12/10) : dire qui génère les réponses et ce qui lui est transmis. */}
            <p className="asst-note asst-ia muted">Assistant IA (Claude, Anthropic) : vos questions et les données de votre compte utiles à la réponse lui sont transmises pour la rédiger ; les e-mails et téléphones de vos clients sont masqués avant l’envoi. Il ne chiffre qu’avec vos tarifs. Vérifiez les chiffres importants dans l’écran concerné.</p>
          </form>
        </section>

        <aside className="psh-panel asst-poste" aria-label="Poste de commande">
          <div className="asst-onglets" role="tablist" aria-label="Poste de commande">
            {([['confirmer', 'À confirmer', aConfirmer.length], ['actions', 'Actions', faites.length], ['journal', 'Journal', 0]] as const).map(([cle, nom, n]) => (
              <button key={cle} type="button" role="tab" id={`asst-tab-${cle}`} aria-selected={onglet === cle} aria-controls={`asst-pan-${cle}`} className={`asst-onglet${onglet === cle ? ' actif' : ''}`} onClick={() => setOnglet(cle)}>
                {nom}{n > 0 ? <span className={`asst-compte${cle === 'confirmer' ? ' alerte' : ''}`}>{n}</span> : null}
              </button>
            ))}
          </div>
          <div className="asst-poste-corps" role="tabpanel" id={`asst-pan-${onglet}`} aria-labelledby={`asst-tab-${onglet}`}>
            {onglet === 'confirmer' ? (
              aConfirmer.length ? aConfirmer.map((c) => <CarteView key={c.id} c={c} occupee={!!occupees[c.id]} erreur={erreursCartes[c.id]} onDecision={decider} />)
                : <p className="muted asst-vide">{actionsLues === false ? 'Les actions de l’assistant ne sont pas encore ouvertes sur ce compte.' : 'Rien n’attend votre clic. Ce que l’assistant prépare pour un client (envoi, relance, facture, suppression, lot de prix) apparaît ici.'}</p>
            ) : null}
            {onglet === 'actions' ? (
              faites.length ? faites.map((c) => <CarteView key={c.id} c={vue(c)} occupee={!!occupees[c.id]} erreur={erreursCartes[c.id]} onDecision={decider} />)
                : <p className="muted asst-vide">Aucune action pour l’instant. Chaque chose que l’assistant fait pour vous s’inscrit ici, avec « Annuler » quand elle peut se défaire.</p>
            ) : null}
            {onglet === 'journal' ? (
              journal === null ? <p className="muted asst-vide">Chargement…</p>
                : journalErreur ? <p className="muted asst-vide">Le journal est indisponible pour l’instant.</p>
                : journal.length === 0 ? <p className="muted asst-vide">Rien encore : chaque donnée consultée, chaque brouillon et chaque action s’inscrivent ici.</p>
                : (
                  <ul className="asst-journal-liste">
                    {journal.map((l) => (
                      <li key={l.id}>
                        <span className="asst-j-date">{heure(l.cree_le)}</span>
                        <span className="asst-j-outil">{libelleOutil(l.outil)}</span>
                        <span className={`pill ${l.resultat === 'ok' ? 'ok' : l.resultat === 'refus' ? 'warn' : 'crit'}`}>{l.resultat}</span>
                        <span className="asst-j-resume">{l.resume}{l.objet_id && nomsObjets[l.objet_id] ? ` · ${nomsObjets[l.objet_id]}` : ''}</span>
                        {l.objet_type === 'devis' && l.objet_id ? <a href={`/devis/${l.objet_id}`}>Ouvrir</a> : l.objet_type === 'conversation' && l.objet_id ? <a href={`/messages?lead=${l.objet_id}`}>Ouvrir</a> : null}
                      </li>
                    ))}
                  </ul>
                )
            ) : null}
          </div>
          <p className="asst-annonce" role="status" aria-live="polite">{annonce}</p>
        </aside>
      </div>
    </AppShell>
  )
}
