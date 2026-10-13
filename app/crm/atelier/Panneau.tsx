'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { LIBELLES_ROLE, LIBELLES_STATUT_CHANTIER, type RoleMembre, type StatutChantier } from '@/lib/crm/valider'
import { preparerCommande, texteCommande, chantierVisible, type DonneesAtelier, type ObjetScene } from '@/lib/crm/atelier'
import { dateFr, euros, enCentimes } from '../client'
import FicheChantier from '../FicheChantier'
import { Lien, useExemple } from '../mode'

// Le panneau qui s'ouvre au clic sur un objet de la maquette — le MÊME en 3D et dans le repli 2D (mêmes données, mêmes
// actions). Chaque action passe par un chemin qui existe déjà :
//   • chantier   → la fiche chantier (app/crm/FicheChantier.tsx) : tâches, matériel réservé / sortie, Notifier, Facturer ;
//   • catégorie  → l'inventaire de la catégorie et « Préparer la commande » (une liste à relire, copier, envoyer soi-même) ;
//   • véhicule, membre, accueil, bureau → leurs fiches et les liens vers les écrans existants.
// En page de démonstration (`demo`, /atelier-demo), rien n'est lu ni écrit : les actions sont désactivées et le disent.
// Dans l'EXEMPLE du CRM (app/crm/mode.tsx), la fiche chantier s'ouvre sur ses données fictives, ses boutons ne font rien
// partir, et les liens vers les écrans hors CRM sont inertes.
export default function Panneau({ objet, donnees, demo, onFermer, onVue2D }: {
  objet: ObjetScene; donnees: DonneesAtelier; demo: boolean; onFermer: () => void; onVue2D: (vue: string) => void
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
        <span className="atl-type">{({ chantier: 'Chantier', categorie: 'Inventaire', vehicule: 'Véhicule', membre: 'Équipe', accueil: 'Accueil', bureau: 'Bureau' } as const)[objet.type]}</span>
        <h2 id="atl-panneau-titre" ref={titre} tabIndex={-1}>{objet.libelle}</h2>
        <button type="button" className="atl-fermer" onClick={onFermer} aria-label="Fermer le panneau">×</button>
      </header>
      <div className="atl-panneau-corps">
        {objet.type === 'chantier' && <PanneauChantier objet={objet} donnees={donnees} demo={demo} />}
        {objet.type === 'categorie' && <PanneauInventaire objet={objet} donnees={donnees} demo={demo} />}
        {objet.type === 'vehicule' && <PanneauVehicule objet={objet} donnees={donnees} />}
        {objet.type === 'membre' && <PanneauMembre objet={objet} donnees={donnees} />}
        {objet.type === 'accueil' && <PanneauAccueil donnees={donnees} />}
        {objet.type === 'bureau' && (
          <div className="atl-pile">
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

function PanneauChantier({ objet, donnees, demo }: { objet: ObjetScene; donnees: DonneesAtelier; demo: boolean }) {
  const exemple = useExemple()
  const c = donnees.chantiers.find((x) => x.id === objet.ref)
  const [complet, setComplet] = useState(false)
  if (!c) return <p className="crm-vide">Ce chantier n’est plus dans vos données.</p>
  const vehicule = donnees.vehicules.find((v) => v.id === c.vehicule_id)
  const equipe = donnees.membres.filter((m) => c.equipe.includes(m.id))
  return (
    <div className="atl-pile">
      <p className="atl-statut"><i style={{ background: objet.epingle ?? undefined }} aria-hidden="true" />{objet.detail}</p>
      {c.avancement !== null && <div className="atl-barre" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={c.avancement} aria-label="Avancement des tâches"><span style={{ width: `${c.avancement}%` }} /></div>}
      <dl className="atl-dl">
        <dt>Client</dt><dd>{c.client ?? '—'}</dd>
        <dt>Statut</dt><dd>{LIBELLES_STATUT_CHANTIER[c.statut as StatutChantier] ?? c.statut}</dd>
        <dt>Début</dt><dd>{dateFr(c.date_debut)}</dd>
        <dt>Fin prévue</dt><dd>{dateFr(c.date_fin_prevue)}</dd>
        <dt>Camionnette</dt><dd>{vehicule ? `${vehicule.nom}${vehicule.immatriculation ? ` · ${vehicule.immatriculation}` : ''}` : '—'}</dd>
        <dt>Équipe</dt><dd>{equipe.length ? equipe.map((m) => m.nom).join(', ') : '—'}</dd>
      </dl>
      {demo && !exemple ? (
        <p className="crm-note">Démonstration : la fiche complète, les tâches, le matériel, « Notifier le client » et « Facturer » s’ouvrent ici sur un vrai compte.</p>
      ) : complet ? (
        <FicheChantier id={c.id} compacte />
      ) : (
        <div className="crm-boutons">
          <button type="button" className="psh-btn primary" onClick={() => setComplet(true)}>Tâches, matériel et actions</button>
          <Lien className="psh-btn ghost" href={`/crm/chantiers/${c.id}`}>Fiche complète</Lien>
        </div>
      )}
    </div>
  )
}

function PanneauInventaire({ objet, donnees, demo }: { objet: ObjetScene; donnees: DonneesAtelier; demo: boolean }) {
  const ms = useMemo(() => {
    const autres = objet.ref === 'Autres catégories'
    return donnees.materiaux.filter((m) => {
      const k = (m.categorie ?? '').trim() || 'Sans catégorie'
      return autres ? !objetsCategories(donnees).slice(0, 9).includes(k) : k === objet.ref
    }).sort((a, b) => Number(b.seuil > 0 && b.reste <= b.seuil) - Number(a.seuil > 0 && a.reste <= a.seuil) || a.nom.localeCompare(b.nom, 'fr'))
  }, [objet.ref, donnees])
  const alertes = ms.filter((m) => m.seuil > 0 && m.reste <= m.seuil)
  const [commande, setCommande] = useState(false)
  return (
    <div className="atl-pile">
      <div className="atl-chiffres">
        <div><span className="lab">Références</span><b className="tnum">{ms.length}</b></div>
        <div><span className="lab">Alertes</span><b className={`tnum${alertes.length ? ' atl-alerte' : ''}`}>{alertes.length}</b></div>
      </div>
      <ul className="atl-liste">
        {ms.map((m) => {
          const bas = m.seuil > 0 && m.reste <= m.seuil
          const vieux = m.prix_vu_le ? (Date.parse(donnees.jour) - Date.parse(m.prix_vu_le)) / 86_400_000 > 30 : false
          return (
            <li key={m.id} className={bas ? 'bas' : ''}>
              <span><b>{m.nom}</b><br /><span className="muted">{m.fournisseur ?? 'Sans fournisseur'}{m.prix_vu_ht !== null ? ` · vu ${euros(enCentimes(m.prix_vu_ht))} HT le ${dateFr(m.prix_vu_le)}${vieux ? ' (à revérifier)' : ''}` : ''}</span></span>
              <span className="tnum atl-qte">{m.reste} {m.unite}{m.seuil > 0 ? <small> / seuil {m.seuil}</small> : null}</span>
            </li>
          )
        })}
      </ul>
      <div className="crm-boutons">
        <button type="button" className="psh-btn primary" disabled={!alertes.length} title={alertes.length ? 'Une liste à relire avant tout envoi' : 'Aucun matériau sous son seuil dans cette catégorie'} onClick={() => setCommande(true)}>Préparer la commande</button>
        {!demo && <Lien className="psh-btn ghost" href="/inventaire">Ouvrir l’inventaire</Lien>}
      </div>
      {commande && <Commandes donnees={donnees} materiaux={alertes} />}
    </div>
  )
}

const objetsCategories = (d: DonneesAtelier) => [...new Set(d.materiaux.map((m) => (m.categorie ?? '').trim() || 'Sans catégorie'))].sort((a, b) => a.localeCompare(b, 'fr'))

/** J4 — la commande fournisseur : regroupée par fournisseur, quantités proposées et modifiables, texte à copier. Rien ne part d'ici. */
function Commandes({ donnees, materiaux }: { donnees: DonneesAtelier; materiaux: DonneesAtelier['materiaux'] }) {
  const commandes = useMemo(() => preparerCommande(materiaux, donnees.jour), [materiaux, donnees.jour])
  const [qte, setQte] = useState<Record<string, number>>({})
  const [copie, setCopie] = useState<string | null>(null)
  return (
    <div className="atl-commande" aria-label="Commande préparée">
      <p className="crm-note">Quantités proposées : de quoi revenir au double du seuil. Changez-les, puis copiez le texte pour votre fournisseur : rien n’est envoyé d’ici.</p>
      {commandes.map((c) => {
        const texte = texteCommande(c, qte, null)
        const mail = c.contact && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c.contact) ? c.contact : null
        return (
          <section key={c.fournisseur} className="atl-commande-f">
            <h3>{c.fournisseur}</h3>
            <ul>
              {c.lignes.map((l) => (
                <li key={l.materiau_id}>
                  <label>
                    <span>{l.nom} <span className="muted">(reste {l.reste} {l.unite})</span></span>
                    <input type="number" min={1} step={1} inputMode="numeric" aria-label={`Quantité de ${l.nom}`} value={qte[l.materiau_id] ?? l.quantite}
                      onChange={(e) => setQte({ ...qte, [l.materiau_id]: Math.max(1, Math.round(Number(e.target.value) || 1)) })} />
                    <span className="muted">{l.unite}</span>
                  </label>
                  {l.prix_vu_ht !== null && <small className="muted">Prix vu {euros(enCentimes(l.prix_vu_ht))} HT le {dateFr(l.prix_vu_le)}{l.prixAVerifier ? ' — à revérifier' : ''}</small>}
                </li>
              ))}
            </ul>
            <div className="crm-boutons">
              <button type="button" className="psh-btn ghost" onClick={() => { void navigator.clipboard?.writeText(texte).then(() => setCopie(c.fournisseur), () => setCopie(null)) }}>Copier la commande</button>
              {mail && <a className="psh-btn ghost" href={`mailto:${mail}?subject=${encodeURIComponent('Commande')}&body=${encodeURIComponent(texte)}`}>Ouvrir dans ma messagerie</a>}
            </div>
            {copie === c.fournisseur && <p className="crm-message" role="status">Commande copiée. Collez-la dans votre e-mail ou votre espace fournisseur.</p>}
          </section>
        )
      })}
    </div>
  )
}

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
