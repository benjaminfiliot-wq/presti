'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { LIBELLES_ROLE, LIBELLES_STATUT_CHANTIER, type RoleMembre, type StatutChantier } from '@/lib/crm/valider'
import { chantierVisible, initiales, styleAvatar, type DonneesAtelier, type ObjetScene } from '@/lib/crm/atelier'
import { estStockBas, type Alerte, type ResumeAlertes } from '@/lib/crm/alertes'
import { enCours, libelleCommande, type CommandeA } from '@/lib/crm/commandes'
import { appel, dateFr, enCentimes, estErreur, euros } from '../client'
import FicheChantier from '../FicheChantier'
import Frise from '../Frise'
import Indicateurs from '../Indicateurs'
import { Lien, useExemple } from '../mode'
import { DialogueRelance, FicheCommande, PreparerCommande } from './Commande'
import { PosteAssistantsPanneau, SalleAttentePanneau } from './Vivant'
import PanneauStructure from './Structure'
import StockRapide from './Stock'
import { CarteChantierPanneau, type ActionsCarte } from './Carte'
import { CATEGORIES_TYPIQUES, metier3DDe, type Metier3D } from '@/lib/crm/infrastructure'
import type { PosteAssistants } from '@/lib/crm/assistants'
import type { Vue } from '@/lib/crm/vue'

// Le panneau qui s'ouvre au clic sur un objet de la maquette — le MÊME en 3D et dans le repli 2D (mêmes données, mêmes
// actions). Chaque action passe par un chemin qui existe déjà :
//   • chantier   → la fiche chantier (app/crm/FicheChantier.tsx) : tâches, matériel réservé / sortie, Notifier, Facturer ;
//   • catégorie  → l'inventaire de la catégorie et « Préparer la commande » (une liste à relire, copier, envoyer soi-même) ;
//   • véhicule, membre, accueil, bureau → leurs fiches et les liens vers les écrans existants.
// En page de démonstration (`demo`, /atelier-demo), rien n'est lu ni écrit : les actions sont désactivées et le disent.
// Dans l'EXEMPLE du CRM (app/crm/mode.tsx), la fiche chantier s'ouvre sur ses données fictives, ses boutons ne font rien
// partir, et les liens vers les écrans hors CRM sont inertes.
export default function Panneau({ objet, donnees, demo, resume, onFermer, onVue2D, onChange, vue, poste, metier, onChoisir, carte }: {
  objet: ObjetScene; donnees: DonneesAtelier; demo: boolean; resume: ResumeAlertes; onFermer: () => void; onVue2D: (vue: string) => void; onChange: () => void
  /** Drapeau crmAtelierVivant levé seulement : la Vue (salle d'attente de l'accueil) et le poste des assistants. Absents : les panneaux d'avant. */
  vue?: Vue; poste?: PosteAssistants | null
  /** Infrastructure (même drapeau) : le métier 3D de la maquette (stock : catégories typiques) et l'ouverture d'un autre objet par sa clé. */
  metier?: Metier3D; onChoisir?: (cle: string) => void
  /** La carte (lot 5, même drapeau) : type de bâtiment et validation du chantier. Absente : le panneau d'avant. */
  carte?: ActionsCarte
}) {
  const titre = useRef<HTMLHeadingElement>(null)
  // Le focus va au titre du panneau qui s'ouvre (lecteur d'écran et clavier) ; Échap le ferme.
  useEffect(() => { titre.current?.focus() }, [objet.cle])
  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') onFermer() }
    document.addEventListener('keydown', f)
    return () => document.removeEventListener('keydown', f)
  }, [onFermer])
  return (
    <aside className="atl-panneau" aria-labelledby="atl-panneau-titre" data-atelier-panneau={objet.type}>
      <header>
        <span className="atl-type">{({ chantier: 'Chantier', categorie: 'Inventaire', vehicule: 'Véhicule', membre: 'Équipe', accueil: 'Accueil', bureau: 'Bureau', assistants: 'Assistants', structure: 'Installation' } as const)[objet.type]}</span>
        <h2 id="atl-panneau-titre" ref={titre} tabIndex={-1}>{objet.libelle}</h2>
        <button type="button" className="atl-fermer" onClick={onFermer} aria-label="Fermer le panneau">×</button>
      </header>
      <div className="atl-panneau-corps">
        {objet.type === 'chantier' && <PanneauChantier objet={objet} donnees={donnees} demo={demo} resume={resume} onChange={onChange} carte={carte} />}
        {objet.type === 'categorie' && <PanneauInventaire objet={objet} donnees={donnees} demo={demo} onChange={onChange} metier={metier} />}
        {objet.type === 'structure' && <PanneauStructure objet={objet} donnees={donnees} metier={metier ?? metier3DDe(donnees.metier)} onVue2D={onVue2D} onChoisir={onChoisir} onChange={onChange} />}
        {objet.type === 'vehicule' && <PanneauVehicule objet={objet} donnees={donnees} />}
        {objet.type === 'membre' && <PanneauMembre objet={objet} donnees={donnees} />}
        {objet.type === 'accueil' && (vue ? <SalleAttentePanneau vue={vue} jour={donnees.jour} onVue2D={onVue2D} /> : <PanneauAccueil donnees={donnees} />)}
        {objet.type === 'assistants' && poste && <PosteAssistantsPanneau poste={poste} onVue2D={onVue2D} />}
        {objet.type === 'bureau' && (
          <div className="atl-pile">
            {donnees.entreprise?.nom && <p className="atl-role" data-atelier-entreprise><b>{donnees.entreprise.nom}</b>{donnees.entreprise.ville ? ` · ${donnees.entreprise.ville}` : ''}{donnees.formeJuridique ? ` · ${donnees.formeJuridique}` : ''}<br /><span className="muted">Repris de votre profil : rien à ressaisir.</span></p>}
            <p className="crm-vide">Le bureau ouvre les vues classiques du CRM, sur les mêmes données.</p>
            <div className="crm-boutons">
              {(['tableau', 'pipeline', 'chantiers', 'clients'] as const).map((v) => (
                <button key={v} type="button" className="psh-btn ghost" onClick={() => onVue2D(v)}>{({ tableau: 'Tableau de bord', pipeline: 'Pipeline', chantiers: 'Chantiers', clients: 'Clients' })[v]}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}

const ICONES: Record<Alerte['type'], string> = { retard: '⏱', livraison: '🚚', attendue: '📦', stock: '▦', facturer: '€', sans_equipe: '👷' }

function PanneauChantier({ objet, donnees, demo, resume, onChange, carte }: { objet: ObjetScene; donnees: DonneesAtelier; demo: boolean; resume: ResumeAlertes; onChange: () => void; carte?: ActionsCarte }) {
  const exemple = useExemple()
  const c = donnees.chantiers.find((x) => x.id === objet.ref)
  const [complet, setComplet] = useState(false)
  const [commande, setCommande] = useState<{ id: string; vue: 'fiche' | 'relance' } | null>(null)
  const [preparer, setPreparer] = useState<string[] | null>(null)
  const [faites, setFaites] = useState<Set<string>>(() => new Set())
  const [message, setMessage] = useState<{ texte: string; erreur: boolean } | null>(null)
  // Un autre chantier choisi : ce qui était ouvert dans le panneau se referme.
  useEffect(() => { setComplet(false); setCommande(null); setPreparer(null); setFaites(new Set()); setMessage(null) }, [objet.cle])
  if (!c) return <p className="crm-vide">Ce chantier n’est plus dans vos données.</p>
  const vehicule = donnees.vehicules.find((v) => v.id === c.vehicule_id)
  const equipe = donnees.membres.filter((m) => c.equipe.includes(m.id) && m.actif)
  const alertes = resume.parChantier.get(c.id) ?? []
  const t = c.taches
  const ouvertes = (t?.ouvertes ?? []).filter((x) => !faites.has(x.id))
  const resteOuvert = t ? t.total - t.faites - faites.size : 0
  const surPlace = !!objet.info?.surPlace

  async function cocher(id: string) {
    setMessage(null)
    setFaites((s) => new Set(s).add(id))
    const r = await appel(`/api/crm/taches/${id}`, { method: 'PATCH', body: { faite: true } })
    if (!r.ok) { setFaites((s) => { const n = new Set(s); n.delete(id); return n }); setMessage({ texte: r.erreur, erreur: estErreur(r) }); return }
    onChange()
  }
  const commandeOuverte = commande ? (donnees.commandes ?? []).find((x) => x.id === commande.id) ?? null : null

  return (
    <div className="atl-pile">
      <p className="atl-statut"><i style={{ background: objet.epingle ?? undefined }} aria-hidden="true" />{objet.detail}</p>
      {c.avancement !== null && <div className="atl-barre" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={c.avancement} aria-label="Avancement des tâches"><span style={{ width: `${c.avancement}%` }} /></div>}
      {/* La frise du dossier et la colonne d'indicateurs (plan du 18/10, n°3 et n°2) : les mêmes que la fiche chantier. */}
      {c.frise && <Frise frise={c.frise} onChange={onChange} sansAction={demo && !exemple} />}
      {c.indicateurs && <Indicateurs ind={c.indicateurs} chantierId={c.id} dansLaFiche={false} />}

      <h3 className="crm-sous">{surPlace ? 'Sur place aujourd’hui' : 'Équipe affectée'}{equipe.length ? <span className="tnum"> · {equipe.length}</span> : null}</h3>
      {equipe.length === 0 ? <p className="crm-vide">{surPlace ? 'Personne n’est affecté à ce chantier.' : 'Aucune équipe affectée pour le moment.'}</p> : (
        <ul className="atl-gens">
          {equipe.map((m) => (
            <li key={m.id}><i style={styleAvatar(m.role)} aria-hidden="true">{initiales(m.nom)}</i><span><b>{m.nom}</b><small>{LIBELLES_ROLE[m.role as RoleMembre] ?? m.role}</small></span></li>
          ))}
        </ul>
      )}

      <h3 className="crm-sous">Urgences et alertes{alertes.length ? <span className="tnum"> · {alertes.length}</span> : null}</h3>
      {alertes.length === 0 ? <p className="crm-vide">Rien à signaler sur ce chantier.</p> : (
        <ul className="atl-alertes">
          {alertes.map((a) => {
            const cmd = a.commandeId ? (donnees.commandes ?? []).find((x) => x.id === a.commandeId) ?? null : null
            return (
              <li key={a.cle} className={`atl-alerte-carte g-${a.gravite}`}>
                <p className="atl-alerte-titre"><span aria-hidden="true">{ICONES[a.type]}</span> <b>{a.titre}</b></p>
                <p className="atl-alerte-detail">{a.detail}</p>
                <div className="crm-boutons">
                  {cmd && <button type="button" className="psh-btn primary" onClick={() => setCommande({ id: cmd.id, vue: 'relance' })}>Relancer le fournisseur</button>}
                  {cmd && <button type="button" className="psh-btn ghost" onClick={() => setCommande({ id: cmd.id, vue: 'fiche' })}>Ouvrir la commande</button>}
                  {a.type === 'stock' && <button type="button" className="psh-btn primary" onClick={() => setPreparer(a.materiauIds)}>Préparer la commande</button>}
                  {(a.type === 'retard' || a.type === 'facturer') && !demo && <button type="button" className="psh-btn ghost" onClick={() => setComplet(true)}>{a.type === 'retard' ? 'Ouvrir le chantier' : 'Ouvrir pour facturer'}</button>}
                  {a.type === 'sans_equipe' && <Lien className="psh-btn ghost" href={`/crm/chantiers/${c.id}`}>Affecter l’équipe</Lien>}
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {commandeOuverte && commande && (
        commande.vue === 'relance'
          ? <DialogueRelance commande={commandeOuverte} jour={donnees.jour} signature={null} onFermer={() => setCommande(null)} onChange={onChange} />
          : <FicheCommande commande={commandeOuverte} donnees={donnees} onChange={onChange} onRelancer={() => setCommande({ id: commandeOuverte.id, vue: 'relance' })} />
      )}
      {commande && !commandeOuverte && <p className="crm-message" role="status">Cette commande n’est plus en attente : elle a été clôturée.</p>}
      {preparer && (
        <PreparerCommande donnees={donnees} materiaux={donnees.materiaux.filter((m) => preparer.includes(m.id) && estStockBas(m))} onChange={onChange} />
      )}

      <h3 className="crm-sous">Tâches ouvertes{t && t.total ? <span className="tnum"> · {Math.max(0, resteOuvert)}</span> : null}</h3>
      {!t || t.total === 0 ? <p className="crm-vide">Aucune tâche sur ce chantier : elles se créent depuis les lignes du devis, dans la fiche.</p> : ouvertes.length === 0 && resteOuvert <= 0 ? <p className="crm-vide">Toutes les tâches sont faites.</p> : (
        <ul className="atl-taches">
          {ouvertes.map((x) => {
            const m = x.membre_id ? donnees.membres.find((y) => y.id === x.membre_id) : null
            return (
              <li key={x.id}>
                <button type="button" className="atl-coche" aria-label={`Marquer faite : ${x.libelle}`} onClick={() => void cocher(x.id)}><span aria-hidden="true" /></button>
                <span>{x.libelle}{m ? <small> · {m.nom}</small> : null}</span>
              </li>
            )
          })}
          {resteOuvert > ouvertes.length && <li className="atl-plus">+ {resteOuvert - ouvertes.length} autre{resteOuvert - ouvertes.length > 1 ? 's' : ''} dans la fiche du chantier</li>}
        </ul>
      )}
      {carte && <CarteChantierPanneau c={c} actions={carte} />}
      {t && t.total > 0 && <p className="atl-faites"><b className="tnum">{t.faites + faites.size}</b> tâche{t.faites + faites.size > 1 ? 's' : ''} terminée{t.faites + faites.size > 1 ? 's' : ''} sur <span className="tnum">{t.total}</span>{t.faitesAujourdhui + faites.size > 0 ? <> · <span className="tnum">{t.faitesAujourdhui + faites.size}</span> aujourd’hui</> : null}</p>}
      {message && <p className={`crm-message${message.erreur ? ' erreur' : ''}`} role="status">{message.texte}</p>}

      <dl className="atl-dl">
        <dt>Client</dt><dd>{c.client ?? '—'}</dd>
        <dt>Statut</dt><dd>{LIBELLES_STATUT_CHANTIER[c.statut as StatutChantier] ?? c.statut}</dd>
        <dt>Début</dt><dd>{dateFr(c.date_debut)}</dd>
        <dt>Fin prévue</dt><dd>{dateFr(c.date_fin_prevue)}</dd>
        <dt>Camionnette</dt><dd>{vehicule ? `${vehicule.nom}${vehicule.immatriculation ? ` · ${vehicule.immatriculation}` : ''}` : '—'}</dd>
      </dl>
      {demo && !exemple ? (
        <p className="crm-note">Démonstration : la fiche complète, les tâches, le matériel, « Notifier le client » et « Facturer » s’ouvrent ici sur un vrai compte.</p>
      ) : complet ? (
        <FicheChantier key={`${t?.faites ?? 0}/${t?.total ?? 0}/${c.statut}`} id={c.id} compacte />
      ) : (
        <div className="crm-boutons">
          <button type="button" className="psh-btn primary" onClick={() => setComplet(true)}>Tâches, matériel et actions</button>
          <Lien className="psh-btn ghost" href={`/crm/chantiers/${c.id}`}>Fiche complète</Lien>
        </div>
      )}
    </div>
  )
}

function PanneauInventaire({ objet, donnees, demo, onChange, metier }: { objet: ObjetScene; donnees: DonneesAtelier; demo: boolean; onChange: () => void; metier?: Metier3D }) {
  const ms = useMemo(() => {
    const autres = objet.ref === 'Autres catégories'
    return donnees.materiaux.filter((m) => {
      const k = (m.categorie ?? '').trim() || 'Sans catégorie'
      return autres ? !objetsCategories(donnees).slice(0, 9).includes(k) : k === objet.ref
    }).sort((a, b) => Number(estStockBas(b)) - Number(estStockBas(a)) || a.nom.localeCompare(b.nom, 'fr'))
  }, [objet.ref, donnees])
  const alertes = ms.filter(estStockBas)
  const attendu = useMemo(() => {
    const m = new Map<string, CommandeA>()
    for (const c of enCours(donnees.commandes ?? [])) for (const l of c.lignes) if (l.materiau_id && !m.has(l.materiau_id)) m.set(l.materiau_id, c)
    return m
  }, [donnees.commandes])
  const [commande, setCommande] = useState(false)
  return (
    <div className="atl-pile">
      <div className="atl-chiffres">
        <div><span className="lab">Références</span><b className="tnum">{ms.length}</b></div>
        <div><span className="lab">Alertes</span><b className={`tnum${alertes.length ? ' atl-alerte' : ''}`}>{alertes.length}</b></div>
      </div>
      <ul className="atl-liste">
        {ms.map((m) => {
          const bas = estStockBas(m)
          const vieux = m.prix_vu_le ? (Date.parse(donnees.jour) - Date.parse(m.prix_vu_le)) / 86_400_000 > 30 : false
          const cmd = attendu.get(m.id)
          return (
            <li key={m.id} className={bas ? 'bas' : ''}>
              <span><b>{m.nom}</b><br /><span className="muted">{m.fournisseur ?? 'Sans fournisseur'}{m.prix_vu_ht !== null ? ` · vu ${euros(enCentimes(m.prix_vu_ht))} HT le ${dateFr(m.prix_vu_le)}${vieux ? ' (à revérifier)' : ''}` : ''}</span>
                {cmd && <><br /><span className="atl-commandee">Commandé · {cmd.livraison_prevue < donnees.jour ? `livraison en retard (annoncée le ${dateFr(cmd.livraison_prevue)})` : `livraison le ${dateFr(cmd.livraison_prevue)}`} · {libelleCommande(cmd)}</span></>}</span>
              <span className="tnum atl-qte">{m.reste} {m.unite}{m.seuil > 0 ? <small> / seuil {m.seuil}</small> : null}</span>
            </li>
          )
        })}
      </ul>
      {donnees.commandesDisponibles === false && <p className="crm-note" role="note">Le suivi des commandes n’est pas encore installé sur cette base : vous pouvez préparer une commande, pas l’enregistrer.</p>}
      <div className="crm-boutons">
        <button type="button" className="psh-btn primary" disabled={!alertes.length} title={alertes.length ? 'Une liste à relire avant tout envoi' : 'Aucun matériau sous son seuil dans cette catégorie'} onClick={() => setCommande(true)}>Préparer la commande</button>
        {!demo && <Lien className="psh-btn ghost" href="/inventaire">Ouvrir l’inventaire</Lien>}
      </div>
      {commande && <PreparerCommande donnees={donnees} materiaux={alertes} onChange={onChange} />}
      {/* Infrastructure (drapeau crmAtelierVivant) : remplir le stock de cette catégorie sur place (./Stock.tsx). */}
      {metier && <StockRapide donnees={donnees} articles={ms} famille={objet.ref === 'Autres catégories' ? null : objet.ref} suggestions={CATEGORIES_TYPIQUES[metier]} onChange={onChange} />}
    </div>
  )
}

const objetsCategories = (d: DonneesAtelier) => [...new Set(d.materiaux.map((m) => (m.categorie ?? '').trim() || 'Sans catégorie'))].sort((a, b) => a.localeCompare(b, 'fr'))

function PanneauVehicule({ objet, donnees }: { objet: ObjetScene; donnees: DonneesAtelier }) {
  const v = donnees.vehicules.find((x) => x.id === objet.ref)
  if (!v) return <p className="crm-vide">Ce véhicule n’est plus dans vos données.</p>
  const conducteur = donnees.membres.find((m) => m.id === v.conducteur_id)
  const chantiers = donnees.chantiers.filter((c) => c.vehicule_id === v.id && chantierVisible(c))
  const echeance = (d: string | null) => d ? (d < donnees.jour ? `${dateFr(d)} (dépassé)` : dateFr(d)) : '—'
  return (
    <div className="atl-pile">
      <dl className="atl-dl">
        <dt>Immatriculation</dt><dd>{v.immatriculation ?? '—'}</dd>
        <dt>Conducteur</dt><dd>{conducteur?.nom ?? '—'}</dd>
        <dt>Contrôle technique</dt><dd>{echeance(v.controle_technique_le)}</dd>
        <dt>Entretien</dt><dd>{echeance(v.entretien_le)}</dd>
        <dt>Aujourd’hui</dt><dd>{objet.etat.aujourdhui ? objet.detail.split('→ ').pop() : 'Au dépôt'}</dd>
      </dl>
      {chantiers.length > 0 && <><h3 className="crm-sous">Chantiers affectés</h3><ul className="atl-liste">{chantiers.map((c) => <li key={c.id}><Lien href={`/crm/chantiers/${c.id}`}>{c.titre}</Lien><span className="muted">{dateFr(c.date_debut)}</span></li>)}</ul></>}
    </div>
  )
}

function PanneauMembre({ objet, donnees }: { objet: ObjetScene; donnees: DonneesAtelier }) {
  const m = donnees.membres.find((x) => x.id === objet.ref)
  if (!m) return <p className="crm-vide">Cette personne n’est plus dans votre équipe.</p>
  const planning = donnees.chantiers.filter((c) => c.equipe.includes(m.id) && chantierVisible(c)).sort((a, b) => String(a.date_debut ?? '9').localeCompare(String(b.date_debut ?? '9')))
  return (
    <div className="atl-pile">
      <dl className="atl-dl"><dt>Rôle</dt><dd>{LIBELLES_ROLE[m.role as RoleMembre] ?? m.role}</dd><dt>Aujourd’hui</dt><dd>{objet.detail}</dd></dl>
      <h3 className="crm-sous">Planning</h3>
      {planning.length === 0 ? <p className="crm-vide">Affecté à aucun chantier ouvert.</p> : (
        <ul className="atl-liste">{planning.map((c) => <li key={c.id}><Lien href={`/crm/chantiers/${c.id}`}>{c.titre}</Lien><span className="muted tnum">{dateFr(c.date_debut)} → {dateFr(c.date_fin_prevue)}</span></li>)}</ul>
      )}
    </div>
  )
}

function PanneauAccueil({ donnees }: { donnees: DonneesAtelier }) {
  if (!donnees.demandes.length) return <p className="crm-vide">Aucune nouvelle demande. Elles arrivent ici depuis votre page de conversation et votre boîte e-mail.</p>
  return (
    <ul className="atl-liste">
      {donnees.demandes.map((dm) => (
        <li key={dm.id}>
          <span><b>{dm.titre}</b><br /><span className="muted">{dm.client ?? 'Sans nom'} · {dateFr(dm.recue_le)}{dm.recue_le === donnees.jour ? ' · aujourd’hui' : ''}</span></span>
          <span className="crm-actions-ligne"><Lien className="psh-btn ghost" href="/messages">Répondre</Lien><Lien className="psh-btn ghost" href={`/devis/nouveau?lead=${dm.id}`}>Créer le devis</Lien></span>
        </li>
      ))}
    </ul>
  )
}
