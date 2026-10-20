'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { LIBELLES_STATUT_CHANTIER, STATUTS_CHANTIER, type StatutChantier } from '@/lib/crm/valider'
import { LIBELLES_ETAPES, type EtapeOuClasse } from '@/lib/crm/pipeline'
import { avancement as calculerAvancement } from '@/lib/crm/chantier'
import type { EntreeJournal, FicheChantier as Fiche } from '@/lib/crm/vue'
import { EQUIPE_EXEMPLE, ficheChantierExemple, INVENTAIRE_EXEMPLE } from '@/lib/crm/exemple'
import { AIDE_TEXTE_LIBRE, appel, dateFr, dateHeureFr, enCentimes, estErreur, euros, itineraire, LIBELLES_DEVIS, LIBELLES_FACTURE, TON_STATUT_CHANTIER } from './client'
import { Lien, useExemple } from './mode'
import { Avancement } from './Chantiers'
import Frise from './Frise'
import Indicateurs from './Indicateurs'
import { ListeRappels, MeLeRappeler } from './Rappels'
import Pieces from './Pieces'
import ApresChantier from './ApresChantier'
import PlanChantier from './PlanChantier'
import SuiviClient from './SuiviClient'
import { actif } from '@/lib/flags'
import { ChoixTypeBatiment } from './atelier/Carte'
import type { TypeBat } from '@/lib/crm/carte'
import type { Membre, Vehicule } from './types'

// La fiche chantier (plan 3.4) : client, adresse, nature des travaux, devis lié (TTC, statut, signé le), acompte,
// avancement, tâches cochables, équipe, camionnette, dates, matériaux réservés, notes, historique — et trois boutons qui
// n'appellent que des chemins EXISTANTS (lib/crm/chantier.ts, actionsChantier) : désactivés, ils disent pourquoi.
// La forme de la fiche est celle de lib/crm/vue.ts (construireFicheChantier), pour un vrai chantier comme pour l'exemple.
// En mode EXEMPLE (app/crm/mode.tsx) : la fiche vient de lib/crm/exemple.ts, rien n'est lu au serveur, et chaque bouton
// répond « Dans l'exemple, rien n'est envoyé » (app/crm/client.ts refuse l'écriture avant le réseau).
type MateriauInv = { id: string; nom: string; unite: string; stock: { lieu: string; quantite: number }[]; quantite_totale: number }

// Utilisée telle quelle par la page /crm/chantiers/[id] et, en colonne (compacte), par le panneau de l'atelier 3D.
export default function FicheChantier({ id, compacte = false, onTitre }: { id: string; compacte?: boolean; onTitre?: (titre: string) => void }) {
  const router = useRouter()
  const exemple = useExemple()
  const [ficheExemple] = useState(() => (exemple ? ficheChantierExemple(id) : null))
  const [fiche, setFiche] = useState<Fiche | null>(ficheExemple)
  const [erreur, setErreur] = useState(exemple && !ficheExemple ? 'Ce chantier n’existe pas dans l’exemple.' : '')
  const [message, setMessage] = useState<{ texte: string; erreur: boolean; lien?: { href: string; label: string } } | null>(null)
  const [membres, setMembres] = useState<Membre[]>(exemple ? EQUIPE_EXEMPLE.membres : [])
  const [vehicules, setVehicules] = useState<Vehicule[]>(exemple ? EQUIPE_EXEMPLE.vehicules : [])
  const [inventaire, setInventaire] = useState<MateriauInv[] | null>(exemple ? INVENTAIRE_EXEMPLE : null)

  useEffect(() => { if (ficheExemple) onTitre?.(ficheExemple.chantier.titre) }, [ficheExemple, onTitre])

  const charger = useCallback(async () => {
    if (exemple) return
    const { data } = await supabase.auth.getSession()
    if (!data.session) { router.replace('/login'); return }
    const r = await appel<Fiche>(`/api/crm/chantiers/${encodeURIComponent(id)}`)
    if (!r.ok) { setErreur(r.erreur); return }
    setErreur(''); setFiche(r.corps); onTitre?.(r.corps.chantier.titre)
  }, [id, router, onTitre, exemple])
  useEffect(() => {
    if (exemple) return
    void charger()
    void appel<{ membres: Membre[] }>('/api/crm/equipe').then((r) => { if (r.ok) setMembres(r.corps.membres) })
    void appel<{ vehicules: Vehicule[] }>('/api/crm/vehicules').then((r) => { if (r.ok) setVehicules(r.corps.vehicules) })
    void appel<{ materiaux: MateriauInv[] }>('/api/inventaire').then((r) => setInventaire(r.ok ? r.corps.materiaux : []))
  }, [charger, exemple])

  async function agir(chemin: string, method: string, body: unknown, ok: string | null) {
    setMessage(null)
    const r = await appel(chemin, { method, body })
    if (!r.ok) { setMessage({ texte: r.erreur, erreur: estErreur(r) }); return false }
    if (ok) setMessage({ texte: ok, erreur: false })
    await charger(); return true
  }

  return erreur ? <div className="psh-panel"><div className="psh-empty" role="alert">{erreur}</div></div>
    : !fiche ? <p className="muted" role="status">Lecture du chantier…</p>
      : <Contenu f={fiche} compacte={compacte} membres={membres} vehicules={vehicules} inventaire={inventaire} agir={agir} message={message} setMessage={setMessage} recharger={charger} />
}

/** Cocher une tâche répond tout de suite (sur le chantier, d'une main) ; si la base refuse, la case revient et le dit. */
function useTachesInstantanees(f: Fiche, setMessage: (m: { texte: string; erreur: boolean } | null) => void) {
  const [locales, setLocales] = useState<Record<string, boolean>>({})
  useEffect(() => { setLocales({}) }, [f])
  const taches = f.taches.map((t) => (t.id in locales ? { ...t, faite: locales[t.id] } : t))
  async function cocher(id: string, faite: boolean) {
    setLocales((l) => ({ ...l, [id]: faite })); setMessage(null)
    const r = await appel(`/api/crm/taches/${id}`, { method: 'PATCH', body: { faite } })
    if (!r.ok) { setLocales((l) => { const n = { ...l }; delete n[id]; return n }); setMessage({ texte: r.erreur, erreur: estErreur(r) }) }
  }
  return { taches, avancement: calculerAvancement(taches), cocher }
}

function Contenu({ f, compacte, membres, vehicules, inventaire, agir, message, setMessage, recharger }: {
  f: Fiche; compacte: boolean; membres: Membre[]; vehicules: Vehicule[]; inventaire: MateriauInv[] | null
  agir: (chemin: string, method: string, body: unknown, ok: string | null) => Promise<boolean>
  message: { texte: string; erreur: boolean; lien?: { href: string; label: string } } | null
  setMessage: (m: { texte: string; erreur: boolean; lien?: { href: string; label: string } } | null) => void
  recharger: () => Promise<void>
}) {
  const c = f.chantier, d = f.devis
  const { taches, avancement: av, cocher } = useTachesInstantanees(f, setMessage)
  const base = `/api/crm/chantiers/${c.id}`
  const client = d?.client_nom ?? c.client_nom
  const refClient = d ? `d-${d.id}` : `c-${c.id}`
  const adresse = [c.adresse, [c.code_postal, c.ville].filter(Boolean).join(' ')].filter(Boolean).join(', ') || d?.client_adresse || null
  const [notif, setNotif] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState<string | null>(null)

  async function facturer() {
    if (!d || !confirm(f.actions.facturer.solde ? 'Créer la facture du SOLDE (le devis, moins les acomptes déjà facturés) ? Une facture émise ne se modifie plus (elle s’annule par un avoir).' : 'Créer la facture de tout le devis ? Une facture émise ne se modifie plus (elle s’annule par un avoir).')) return
    setEnvoi('facturer'); setMessage(null)
    const r = await appel<{ id: string; numero: string }>('/api/factures', { method: 'POST', body: { devis_id: d.id } })
    setEnvoi(null)
    if (!r.ok) { setMessage({ texte: r.erreur, erreur: estErreur(r) }); return }
    setMessage({ texte: `Facture ${r.corps.numero} créée.`, erreur: false, lien: { href: '/factures', label: 'Voir les factures' } })
    await recharger()
  }
  async function notifier() {
    if (!d?.lead_id || !notif?.trim()) return
    setEnvoi('notifier'); setMessage(null)
    const r = await appel<{ emailed?: boolean; canal?: string; lien?: string }>('/api/messages', { method: 'POST', body: { action: 'reply', lead_id: d.lead_id, message: notif } })
    setEnvoi(null)
    if (!r.ok) { setMessage({ texte: r.erreur, erreur: estErreur(r) }); return }
    // On répète ce que la route a réellement fait : écrit dans la conversation, et envoyé par e-mail seulement si elle le dit.
    setMessage({ texte: r.corps.emailed ? 'Message écrit dans la conversation et envoyé par e-mail au client.' : r.corps.lien ? 'Message préparé : collez-le dans la conversation du canal d’origine.' : 'Message écrit dans la conversation du client.', erreur: false, ...(r.corps.lien ? { lien: { href: r.corps.lien, label: 'Ouvrir la conversation' } } : {}) })
    setNotif(null)
  }

  return (
    <div className="crm-fiche">
      {message && <p className={`crm-message${message.erreur ? ' erreur' : ''}`} role={message.erreur ? 'alert' : 'status'}>{message.texte}{message.lien && <> · <Lien href={message.lien.href}>{message.lien.label}</Lien></>}</p>}

      <section className="psh-panel crm-entete" aria-labelledby="crm-fiche-titre">
        <div className="crm-entete-haut">
          <div>
            <h2 id="crm-fiche-titre">{c.titre}</h2>
            <p className="muted">{client ? <Lien href={`/crm/clients/${refClient}`}>{client}</Lien> : 'Client sans nom'}{adresse ? ` · ${adresse}` : ''}</p>
            {adresse && <Lien className="psh-btn ghost crm-itineraire-bouton" href={itineraire(adresse)} title={`Ouvrir l’itinéraire vers ${adresse}`}>Itinéraire</Lien>}
          </div>
          <span className={`pill ${TON_STATUT_CHANTIER[c.statut] ?? 'muted'}`}>{LIBELLES_STATUT_CHANTIER[c.statut as StatutChantier] ?? c.statut}</span>
        </div>
        {/* La frise (où en est le dossier) remplace la ligne « Pipeline » ; les indicateurs disent l'argent et la matière. Dans le
            panneau de l'atelier, qui les montre déjà au-dessus, la fiche compacte ne les répète pas. */}
        {!compacte && <Frise frise={f.frise} onChange={recharger} ici={`/crm/chantiers/${c.id}`} />}
        {!compacte && <Indicateurs ind={{ ...f.indicateurs, avancement: av }} chantierId={c.id} dansLaFiche />}
        {compacte && (
          <div className="crm-entete-chiffres">
            <div><span className="lab">Avancement</span><Avancement {...av} /></div>
            <div><span className="lab">Devis</span>{d ? <span className="tnum">{euros(enCentimes(d.total_ttc))} · {LIBELLES_DEVIS[d.statut ?? ''] ?? d.statut}</span> : <span>—</span>}</div>
            <div><span className="lab">Retard</span>{f.retard ? <span className="pill crit">{f.retard} j</span> : <span>{f.retard === 0 ? 'Aucun' : '—'}</span>}</div>
          </div>
        )}
        <div className="crm-boutons">
          {/* Dans le panneau de l'atelier, « Fiche complète » ouvre la fiche chantier en pleine page ; sur cette page, le devis. */}
          {compacte ? <Lien className="psh-btn ghost" href={`/crm/chantiers/${c.id}`}>Fiche complète</Lien>
            : d ? <Lien className="psh-btn ghost" href={`/devis/${d.id}`} title="Ouvre le devis complet">Fiche complète</Lien>
            : <button type="button" className="psh-btn ghost" disabled title="Ce chantier n’a pas de devis lié." aria-describedby="crm-raison-fiche">Fiche complète</button>}
          <button type="button" className="psh-btn ghost" disabled={!f.actions.notifier.actif || envoi !== null} title={f.actions.notifier.raison ?? 'Préparer un message au client'} aria-describedby={f.actions.notifier.raison ? 'crm-raison-notifier' : undefined}
            onClick={() => setNotif(f.notificationPreparee)}>Notifier le client</button>
          <button type="button" className="psh-btn primary" disabled={!f.actions.facturer.actif || envoi !== null} title={f.actions.facturer.raison ?? 'Créer la facture du devis'} aria-describedby={f.actions.facturer.raison ? 'crm-raison-facturer' : undefined}
            onClick={() => void facturer()}>{envoi === 'facturer' ? 'Création…' : f.actions.facturer.solde ? 'Facturer le solde' : 'Facturer'}</button>
        </div>
        {f.carte && !compacte && <CarteFiche f={f} agir={agir} />}
        <ul className="crm-raisons">
          {!d && !compacte && <li id="crm-raison-fiche">Fiche complète : ce chantier n’a pas de devis lié.</li>}
          {f.actions.notifier.raison && <li id="crm-raison-notifier">Notifier : {f.actions.notifier.raison}</li>}
          {f.actions.facturer.raison && <li id="crm-raison-facturer">Facturer : {f.actions.facturer.raison}</li>}
        </ul>
        {notif !== null && (
          <div className="crm-notif">
            <label className="crm-champ">Message au client (rien n’est envoyé avant « Envoyer »)
              <textarea rows={7} maxLength={4000} value={notif} onChange={(e) => setNotif(e.target.value)} />
            </label>
            <p className="crm-aide">{AIDE_TEXTE_LIBRE}</p>
            <div className="crm-boutons">
              <button type="button" className="psh-btn primary" disabled={envoi !== null || !notif.trim()} onClick={() => void notifier()}>{envoi === 'notifier' ? 'Envoi…' : 'Envoyer au client'}</button>
              <button type="button" className="psh-btn ghost" onClick={() => setNotif(null)}>Annuler</button>
            </div>
          </div>
        )}
      </section>

      {/* Lot 5 (plan du 18/10, n°8) : le plan du chantier par pièce, un schéma. */}
      {actif('crmPlan') && <PlanChantier titre={c.titre} taches={taches} membres={membres} metier={f.metier ?? null} typeBatiment={f.carte ? f.carte.type ?? f.carte.typeDeduit : null} cocher={cocher} agir={agir} />}
      {actif('crmSuivi') && c.statut !== 'annule' && <SuiviClient chantierId={c.id} />}

      <div className={compacte ? 'crm-pile' : 'crm-grille2'}>
        <Taches f={f} taches={taches} faites={av.faites} cocher={cocher} base={base} membres={membres} agir={agir} />
        <div className="crm-pile">
          <Organisation key={JSON.stringify([c.statut, c.date_debut, c.date_fin_prevue, c.adresse, c.code_postal, c.ville, c.vehicule_id, f.equipe.map((m) => m.id)])} f={f} membres={membres} vehicules={vehicules} agir={agir} />
          <Materiaux f={f} base={base} inventaire={inventaire} agir={agir} />
        </div>
      </div>

      {/* Lot 3 (plan du 18/10, n°5) : les photos et pièces du chantier, privées. */}
      {actif('crmPieces') && <Pieces chantierId={c.id} leadId={d?.lead_id ?? null} clos={c.statut === 'annule'} />}

      <section className="psh-panel" aria-labelledby="crm-rappels-chantier">
        <header><h2 id="crm-rappels-chantier">Rappels et rendez-vous</h2><span className="tag tnum">{f.rappels.filter((r) => !r.fait_le).length}</span></header>
        <div className="crm-corps">
          {!f.rappelsDisponibles ? <p className="crm-vide">Les rappels s’installent : ils apparaîtront ici dès la mise à jour de votre espace.</p> : (
            <>
              <ListeRappels rappels={f.rappels.filter((r) => !r.fait_le)} jour={f.jour} onChange={recharger} vide="Aucun rappel sur ce chantier." />
              <MeLeRappeler cible={{ chantier_id: c.id }} jour={f.jour} onChange={recharger} libelle="+ Rappel ou rendez-vous" />
            </>
          )}
        </div>
      </section>

      {/* Lot 4 (plan du 18/10, n°7) : l'après-chantier, demande d'avis et entretien, chaque envoi confirmé par l'artisan. */}
      {actif('crmApresChantier') && <ApresChantier chantier={{ id: c.id, titre: c.titre, client, textes: [d?.objet ?? null] }} rappels={f.rappels} termine={c.statut === 'termine'} onChange={recharger} />}

      <div className={compacte ? 'crm-pile' : 'crm-grille2'}>
        <Notes f={f} agir={agir} />
        <section className="psh-panel" aria-labelledby="crm-historique">
          <header><h2 id="crm-historique">Historique</h2></header>
          <div className="crm-corps">
            {f.factures.length > 0 && (
              <>
                <h3 className="crm-sous">Factures du devis</h3>
                <ul className="crm-liste">{f.factures.map((x) => <li key={x.id}><span>{x.numero ?? 'Facture'} · {dateFr(x.date_emission)}{Number(x.acompte_pct) > 0 ? ' · acompte' : ''}{!x.comptee ? ' · non comptée' : ''}</span><span className="tnum">{euros(enCentimes(x.total_ttc))} · {LIBELLES_FACTURE[x.statut ?? ''] ?? x.statut}</span></li>)}</ul>
              </>
            )}
            <h3 className="crm-sous">Journal</h3>
            {f.journal.length === 0 ? <p className="crm-vide">Rien encore.</p> : (
              <ol className="crm-journal">{f.journal.map((j) => <li key={j.id}><time className="tnum">{dateHeureFr(j.cree_le)}</time><span>{phrase(j)}</span></li>)}</ol>
            )}
          </div>
        </section>
      </div>

      <section className="crm-danger">
        <button type="button" className="psh-btn ghost danger" onClick={async () => {
          if (!confirm('Supprimer ce chantier, ses tâches, ses réservations et son équipe ? Le devis n’est pas touché ; les matériaux déjà sortis restent sortis.')) return
          if (await agir(base, 'DELETE', undefined, null)) window.location.href = '/crm?vue=chantiers'
        }}>Supprimer le chantier</button>
      </section>
    </div>
  )
}

/**
 * La carte de l'atelier (lot 5, drapeau crmAtelierVivant) dans la fiche : le TYPE de bâtiment dessiné (déduit, ou choisi ici), et
 * « Valider le chantier » quand toutes les tâches sont faites — il quitte la carte, il reste ici, dans la liste, le pipeline et les
 * factures ; « Remettre sur la carte » le fait revenir. Dans l'exemple : simulé, rien n'est écrit.
 */
function CarteFiche({ f, agir }: { f: Fiche; agir: (chemin: string, method: string, body: unknown, ok: string | null) => Promise<boolean> }) {
  const exemple = useExemple()
  const carte = f.carte!
  const [simule, setSimule] = useState<{ retire: string | null; type: TypeBat | null } | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const retire = simule ? simule.retire : carte.retire
  const type = simule ? simule.type : carte.type
  const base = `/api/crm/chantiers/${f.chantier.id}`
  async function faire(quoi: { action: 'valider' | 'remettre' } | { type: TypeBat | null }) {
    setNote(null)
    if (exemple) {
      setSimule({ retire: 'action' in quoi ? (quoi.action === 'valider' ? new Date().toISOString() : null) : retire, type: 'action' in quoi ? type : quoi.type })
      setNote('Exemple : l’effet est montré, rien n’est enregistré.')
      return
    }
    if ('action' in quoi) await agir(`${base}/valider`, 'POST', quoi, quoi.action === 'valider' ? 'Chantier validé : il a quitté la carte de l’atelier.' : 'Chantier remis sur la carte.')
    else await agir(base, 'PATCH', { type_batiment: quoi.type }, 'Type de bâtiment enregistré : la carte le dessine.')
  }
  return (
    <div className="crm-carte-fiche" data-crm-carte-fiche>
      <label className="crm-champ crm-champ-court">Bâtiment sur la carte
        <ChoixTypeBatiment valeur={type} deduit={carte.typeDeduit} onChange={(t) => void faire({ type: t })} />
      </label>
      {retire ? (
        <p className="crm-carte-etat" data-crm-valide-le>
          <span className="pill ok">Validé</span> le {dateFr(retire)} : retiré de la carte de l’atelier.
          <button type="button" className="psh-btn ghost" data-crm-remettre onClick={() => void faire({ action: 'remettre' })}>Remettre sur la carte</button>
        </p>
      ) : carte.validable ? (
        <p className="crm-carte-etat">
          <button type="button" className="psh-btn primary" data-crm-valider onClick={() => void faire({ action: 'valider' })}>Valider le chantier</button>
          <span className="muted"> Toutes les tâches sont faites : il quitte la carte, il reste ici et dans vos chiffres.</span>
        </p>
      ) : (
        <p className="crm-carte-etat muted">« Valider le chantier » s’offre quand toutes ses tâches sont cochées.{carte.validationAuto ? ' Validation automatique activée : la dernière tâche cochée le validera.' : ''}</p>
      )}
      {note && <p className="crm-message" role="status">{note}</p>}
    </div>
  )
}

function phrase(j: EntreeJournal): string {
  const st = (s: string | null) => (s && s in LIBELLES_STATUT_CHANTIER ? LIBELLES_STATUT_CHANTIER[s as StatutChantier] : s ?? '—')
  if (j.objet === 'chantier' && j.champ === 'creation') return `Chantier créé (${st(j.vers)})`
  if (j.objet === 'chantier' && j.champ === 'statut') return `Statut : ${st(j.de)} → ${st(j.vers)}`
  if (j.objet === 'tache') return `${j.vers === 'true' ? 'Tâche faite' : 'Tâche rouverte'} : ${j.note ?? ''}`
  if (j.objet === 'materiau') return `Matériel sorti du stock (${j.note ?? ''})`
  if (j.champ === 'etape') return `Pipeline déplacé à la main : ${LIBELLES_ETAPES[(j.de ?? 'demande') as EtapeOuClasse] ?? j.de} → ${LIBELLES_ETAPES[(j.vers ?? 'demande') as EtapeOuClasse] ?? j.vers}`
  return `${j.champ} : ${j.de ?? '—'} → ${j.vers ?? '—'}`
}

type Agir = (chemin: string, method: string, body: unknown, ok: string | null) => Promise<boolean>

function Taches({ f, taches, faites, cocher, base, membres, agir }: { f: Fiche; taches: Fiche['taches']; faites: number; cocher: (id: string, faite: boolean) => void; base: string; membres: Membre[]; agir: Agir }) {
  const [libelle, setLibelle] = useState('')
  const [occupe, setOccupe] = useState(false)
  const lignesDevis = taches.filter((t) => t.devis_ligne_id).length
  async function ajouter(e: FormEvent) {
    e.preventDefault(); setOccupe(true)
    if (await agir(`${base}/taches`, 'POST', { libelle }, null)) setLibelle('')
    setOccupe(false)
  }
  return (
    <section className="psh-panel" aria-labelledby="crm-taches">
      <header><h2 id="crm-taches">Tâches</h2><span className="tag tnum">{faites} / {taches.length}</span></header>
      <div className="crm-corps">
        {taches.length === 0 ? <p className="crm-vide">Aucune tâche. {f.devis ? 'Générez-les depuis les lignes du devis, ou ajoutez-les à la main.' : 'Ajoutez-les à la main.'}</p> : (
          <ul className="crm-taches">
            {taches.map((t) => (
              <li key={t.id} className={t.faite ? 'faite' : ''}>
                <label className="crm-coche">
                  <input type="checkbox" checked={t.faite} onChange={(e) => cocher(t.id, e.target.checked)} />
                  <span>{t.libelle}{t.quantite !== null ? <span className="muted tnum"> · {t.quantite} {t.unite ?? ''}</span> : null}</span>
                </label>
                <span className="crm-actions-ligne">
                  <label><span className="crm-sr">Affecter « {t.libelle} » à</span>
                    <select value={t.membre_id ?? ''} onChange={(e) => void agir(`/api/crm/taches/${t.id}`, 'PATCH', { membre_id: e.target.value || null }, null)}>
                      <option value="">Personne</option>
                      {membres.filter((m) => m.actif || m.id === t.membre_id).map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
                    </select>
                  </label>
                  <button type="button" className="psh-btn ghost" onClick={() => { const n = prompt('Nouveau libellé', t.libelle); if (n && n.trim() && n.trim() !== t.libelle) void agir(`/api/crm/taches/${t.id}`, 'PATCH', { libelle: n }, null) }}>Renommer</button>
                  <button type="button" className="psh-btn ghost danger" aria-label={`Supprimer la tâche « ${t.libelle} »`} onClick={() => { if (confirm(`Supprimer « ${t.libelle} » ?`)) void agir(`/api/crm/taches/${t.id}`, 'DELETE', undefined, null) }}>×</button>
                </span>
              </li>
            ))}
          </ul>
        )}
        <form className="crm-form crm-form-ligne" onSubmit={ajouter} aria-label="Ajouter une tâche">
          <label className="crm-champ">Nouvelle tâche<input required maxLength={300} value={libelle} onChange={(e) => setLibelle(e.target.value)} /></label>
          <button className="psh-btn ghost" type="submit" disabled={occupe || !libelle.trim()}>Ajouter</button>
          {f.devis && <button className="psh-btn ghost" type="button" disabled={occupe} title={lignesDevis ? 'Ajoute seulement les lignes qui n’ont pas encore leur tâche' : 'Une tâche par ligne du devis'}
            onClick={async () => { setOccupe(true); await agir(`${base}/taches`, 'POST', { depuis_devis: true }, 'Tâches générées depuis les lignes du devis.'); setOccupe(false) }}>Générer depuis le devis</button>}
        </form>
      </div>
    </section>
  )
}

function Organisation({ f, membres, vehicules, agir }: { f: Fiche; membres: Membre[]; vehicules: Vehicule[]; agir: Agir }) {
  const c = f.chantier
  const [statut, setStatut] = useState<StatutChantier>(c.statut as StatutChantier)
  const [debut, setDebut] = useState(c.date_debut ?? '')
  const [fin, setFin] = useState(c.date_fin_prevue ?? '')
  const [adresse, setAdresse] = useState(c.adresse ?? '')
  const [cp, setCp] = useState(c.code_postal ?? '')
  const [ville, setVille] = useState(c.ville ?? '')
  const [vehicule, setVehicule] = useState(c.vehicule_id ?? '')
  const [equipe, setEquipe] = useState<string[]>(f.equipe.map((m) => m.id))
  const [occupe, setOccupe] = useState(false)
  async function enregistrer(e: FormEvent) {
    e.preventDefault(); setOccupe(true)
    await agir(`/api/crm/chantiers/${c.id}`, 'PATCH', {
      statut, date_debut: debut || null, date_fin_prevue: fin || null, adresse: adresse || null, code_postal: cp || null, ville: ville || null,
      vehicule_id: vehicule || null, equipe,
    }, 'Chantier enregistré.')
    setOccupe(false)
  }
  return (
    <section className="psh-panel" aria-labelledby="crm-orga">
      <header><h2 id="crm-orga">Organisation</h2></header>
      <form className="crm-form crm-corps" onSubmit={enregistrer}>
        <div className="crm-form-ligne">
          <label className="crm-champ">Statut<select value={statut} onChange={(e) => setStatut(e.target.value as StatutChantier)}>{STATUTS_CHANTIER.map((s) => <option key={s} value={s}>{LIBELLES_STATUT_CHANTIER[s]}</option>)}</select></label>
          <label className="crm-champ">Début<input type="date" value={debut} onChange={(e) => setDebut(e.target.value)} /></label>
          <label className="crm-champ">Fin prévue<input type="date" value={fin} min={debut || undefined} onChange={(e) => setFin(e.target.value)} /></label>
        </div>
        {c.date_fin_reelle && <p className="muted">Terminé le {dateFr(c.date_fin_reelle)}.</p>}
        <div className="crm-form-ligne">
          <label className="crm-champ crm-large">Adresse du chantier (si elle diffère du client)<input maxLength={300} value={adresse} onChange={(e) => setAdresse(e.target.value)} /></label>
          <label className="crm-champ">Code postal<input maxLength={10} value={cp} onChange={(e) => setCp(e.target.value)} /></label>
          <label className="crm-champ">Ville<input maxLength={80} value={ville} onChange={(e) => setVille(e.target.value)} /></label>
        </div>
        <label className="crm-champ">Camionnette
          <select value={vehicule} onChange={(e) => setVehicule(e.target.value)}>
            <option value="">Aucune</option>
            {vehicules.filter((v) => v.actif || v.id === c.vehicule_id).map((v) => <option key={v.id} value={v.id}>{v.nom}{v.immatriculation ? ` · ${v.immatriculation}` : ''}</option>)}
          </select>
        </label>
        <fieldset className="crm-equipe">
          <legend>Équipe affectée</legend>
          {membres.length === 0 ? <p className="crm-vide">Aucun membre : ajoutez votre équipe dans l’onglet « Équipe & véhicules ».</p>
            : membres.filter((m) => m.actif || equipe.includes(m.id)).map((m) => (
              <label key={m.id} className="crm-coche"><input type="checkbox" checked={equipe.includes(m.id)} onChange={(e) => setEquipe(e.target.checked ? [...equipe, m.id] : equipe.filter((x) => x !== m.id))} /> {m.nom}</label>
            ))}
        </fieldset>
        <div><button className="psh-btn primary" type="submit" disabled={occupe}>{occupe ? 'Enregistrement…' : 'Enregistrer'}</button></div>
      </form>
    </section>
  )
}

function Materiaux({ f, base, inventaire, agir }: { f: Fiche; base: string; inventaire: MateriauInv[] | null; agir: Agir }) {
  const [materiau, setMateriau] = useState('')
  const [quantite, setQuantite] = useState('')
  const [lieu, setLieu] = useState('atelier')
  const choisi = inventaire?.find((m) => m.id === materiau)
  const lieux = choisi?.stock?.length ? choisi.stock.map((s) => s.lieu) : ['atelier']
  const clos = f.chantier.statut === 'termine' || f.chantier.statut === 'annule'
  async function reserver(e: FormEvent) {
    e.preventDefault()
    if (await agir(`${base}/materiaux`, 'POST', { materiau_id: materiau, quantite, lieu }, 'Matériel réservé (le stock ne bouge qu’à la sortie).')) { setMateriau(''); setQuantite('') }
  }
  return (
    <section className="psh-panel" aria-labelledby="crm-materiaux">
      <header><h2 id="crm-materiaux">Matériaux réservés</h2><Lien className="tag" href="/inventaire">Inventaire</Lien></header>
      <div className="crm-corps">
        {f.materiaux.length === 0 ? <p className="crm-vide">Rien de réservé.</p> : (
          <ul className="crm-liste">
            {f.materiaux.map((r) => (
              <li key={r.id}>
                <span>{r.materiau?.nom ?? 'Matériau supprimé'} · <span className="tnum">{r.quantite} {r.materiau?.unite ?? ''}</span> · {r.lieu}</span>
                {r.statut === 'reserve' ? (
                  <span className="crm-actions-ligne">
                    <button type="button" className="psh-btn ghost" onClick={() => { if (confirm(`Sortir ${r.quantite} ${r.materiau?.unite ?? ''} de « ${r.materiau?.nom ?? ''} » du stock (${r.lieu}) ?`)) void agir(`/api/crm/materiaux/${r.id}`, 'PATCH', { action: 'sortir' }, 'Sorti du stock.') }}>Sortir du stock</button>
                    <button type="button" className="psh-btn ghost danger" onClick={() => void agir(`/api/crm/materiaux/${r.id}`, 'DELETE', undefined, 'Réservation annulée.')}>Annuler</button>
                  </span>
                ) : <span className="pill ok">Sorti le {dateFr(r.sorti_le)}</span>}
              </li>
            ))}
          </ul>
        )}
        {clos ? <p className="crm-note">Chantier clos : rouvrez-le pour réserver du matériel.</p>
          : inventaire === null ? <p className="muted">Lecture de l’inventaire…</p>
            : inventaire.length === 0 ? <p className="crm-vide">Votre inventaire est vide : ajoutez vos matériaux dans l’Inventaire pour les réserver ici.</p>
              : (
                <form className="crm-form crm-form-ligne" onSubmit={reserver} aria-label="Réserver un matériau">
                  <label className="crm-champ crm-large">Matériau<select required value={materiau} onChange={(e) => { setMateriau(e.target.value); setLieu('atelier') }}>
                    <option value="">Choisir…</option>
                    {inventaire.map((m) => <option key={m.id} value={m.id}>{m.nom} ({m.quantite_totale} {m.unite} en stock)</option>)}
                  </select></label>
                  <label className="crm-champ">Quantité<input required inputMode="decimal" value={quantite} onChange={(e) => setQuantite(e.target.value)} /></label>
                  <label className="crm-champ">Lieu<select value={lieu} onChange={(e) => setLieu(e.target.value)}>{[...new Set(lieux)].map((l) => <option key={l} value={l}>{l}</option>)}</select></label>
                  <button className="psh-btn ghost" type="submit" disabled={!materiau || !quantite.trim()}>Réserver</button>
                </form>
              )}
      </div>
    </section>
  )
}

function Notes({ f, agir }: { f: Fiche; agir: Agir }) {
  const [texte, setTexte] = useState('')
  async function ajouter(e: FormEvent) {
    e.preventDefault()
    if (await agir('/api/crm/notes', 'POST', { texte, chantier_id: f.chantier.id }, null)) setTexte('')
  }
  return (
    <section className="psh-panel" aria-labelledby="crm-notes">
      <header><h2 id="crm-notes">Notes</h2></header>
      <div className="crm-corps">
        {f.notes.length === 0 ? <p className="crm-vide">Aucune note.</p> : (
          <ul className="crm-notes">{f.notes.map((n) => (
            <li key={n.id}><p>{n.texte}</p><span className="muted tnum">{dateHeureFr(n.cree_le)}</span>
              <button type="button" className="psh-btn ghost danger" aria-label="Supprimer cette note" onClick={() => { if (confirm('Supprimer cette note ?')) void agir(`/api/crm/notes/${n.id}`, 'DELETE', undefined, null) }}>×</button></li>
          ))}</ul>
        )}
        <form className="crm-form" onSubmit={ajouter} aria-label="Ajouter une note">
          <label className="crm-champ">Nouvelle note<textarea rows={3} maxLength={4000} value={texte} onChange={(e) => setTexte(e.target.value)} aria-describedby="crm-aide-note-chantier" /></label>
          <p className="crm-aide" id="crm-aide-note-chantier">{AIDE_TEXTE_LIBRE}</p>
          <div><button className="psh-btn ghost" type="submit" disabled={!texte.trim()}>Ajouter la note</button></div>
        </form>
      </div>
    </section>
  )
}
