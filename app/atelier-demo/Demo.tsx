'use client'

import '@/app/globals.css'
import '@/app/crm/crm.css'
import { useEffect, useState } from 'react'
import Atelier from '@/app/crm/atelier/Atelier'
import { PREREGLAGES, FILTRES, estAujourdhui, type DonneesAtelier, type Filtre, type Prereglage } from '@/lib/crm/atelier'
import { DONNEES_EXEMPLE, EQUIPE_EXEMPLE, ficheChantierExemple, JOUR_EXEMPLE, VUE_EXEMPLE, vitrineCarte, vitrineEtats, vitrineSerree, vitrineTypes } from '@/lib/crm/exemple'
import PlanChantier from '@/app/crm/PlanChantier'
import { ModeExemple } from '@/app/crm/mode'
import { estTypeBat, type TypeBat } from '@/lib/crm/carte'
import type { NomVue } from '@/app/crm/atelier/Scene3D'
import { actif } from '@/lib/flags'
import { BASES, echantillonPourBase, METIERS_3D, type Base, type Metier3D, type Statut } from '@/lib/crm/infrastructure'

// Données FICTIVES de démonstration — jamais affichées à un artisan : cette page n'est servie qu'avec PRESTI_DEMO_ATELIER=1.
// Paramètres : ?metier=plombier&vue=ensemble|atelier|chantiers|dessus&filtre=retard&mode=3d|2d&mesure=1&vide=1
// Drapeau crmAtelierVivant levé seulement : &base=legere|atelier|entrepot (le jeu fictif est ramené à ce que la base suppose,
// lib/crm/infrastructure.ts, echantillonPourBase), &base=camion (sans local), &statut=societe|a_son_compte (forme juridique fictive),
// &camion=1 (le dernier véhicule devient un camion benne) et &heure=0..24 (jour, crépuscule, nuit). Drapeau baissé : ignorés.
// Lot 4 (même drapeau) : ?metier= accepte tous les métiers 3D (paysagiste, serrurier…), &stock=vide montre un stock vide, et la Vue
// fictive (lib/crm/exemple.ts) est passée à l'atelier : salle d'attente et poste des assistants, avec leurs dialogues d'exemple.
// Lot 5 (même drapeau) : &vitrine=etats&type=hotel (les quatre états d'un type), &vitrine=types (un chantier fini par type),
// &vitrine=carte (douze chantiers à leur direction réelle), &sansbase=1 (la base de l'artisan n'est pas située : couronne de repli).
// Lot 6 : &vitrine=serree (trente chantiers serrés : placement des étiquettes).
// Lot 7 : ?plan=<n> (le plan du chantier n° n de l'exemple : schéma et maquette 3D, en mode exemple — rien n'est écrit) ; &type= force
// le type du bâtiment (hotel, restaurant…).
// Lot 8 : &evenement=vehicule|livraison|tout — au bout de &apres= ms (5 000 par défaut), les données changent comme une relecture en
// direct (un véhicule affecté au chantier du jour, une commande attendue aujourd'hui, une tâche cochée, une facture payée de l'exemple).
const JOUR = JOUR_EXEMPLE
const FICTIF = DONNEES_EXEMPLE
const VIDE: DonneesAtelier = { jour: JOUR, metier: null, chantiers: [], materiaux: [], vehicules: [], membres: [], demandes: [] }

export default function Demo() {
  const [p, setP] = useState<URLSearchParams | null>(null)
  useEffect(() => { setP(new URLSearchParams(window.location.search)) }, [])
  const [apres, setApres] = useState(false)
  useEffect(() => { if (!p?.get('evenement')) return; const t = setTimeout(() => setApres(true), Number(p.get('apres') ?? 5000) || 5000); return () => clearTimeout(t) }, [p])
  if (!p) return null
  const metier = (PREREGLAGES as readonly string[]).includes(p.get('metier') ?? '') ? (p.get('metier') as Prereglage) : undefined
  const vue = (['ensemble', 'atelier', 'chantiers', 'dessus'] as const).find((v) => v === p.get('vue'))
  const filtre = (FILTRES as readonly string[]).includes(p.get('filtre') ?? '') ? (p.get('filtre') as Filtre) : null
  const mode = p.get('mode') === '2d' ? '2d' : p.get('mode') === '3d' ? '3d' : undefined
  const infra = actif('crmAtelierVivant')
  const base = infra && (BASES as readonly string[]).includes(p.get('base') ?? '') ? (p.get('base') as Base) : null
  const h = Number(p.get('heure'))
  const heure = infra && p.get('heure') !== null && Number.isFinite(h) && h >= 0 && h <= 24 ? h : null
  const statut = infra && (p.get('statut') === 'societe' || p.get('statut') === 'a_son_compte') ? (p.get('statut') as Statut) : undefined
  const camion = infra && p.get('camion') === '1'
  const metier3D = infra && (METIERS_3D as readonly string[]).includes(p.get('metier') ?? '') && !metier ? (p.get('metier') as Metier3D) : undefined
  const brut = p.get('vide') === '1' ? VIDE : base || statut || camion ? echantillonPourBase(FICTIF, base ?? 'entrepot', { statut, camion }) : FICTIF
  const vitrine = infra ? p.get('vitrine') : null
  const avecVitrine = vitrine === 'etats' ? vitrineEtats(estTypeBat(p.get('type')) ? (p.get('type') as string) : 'maison') : vitrine === 'types' ? vitrineTypes() : vitrine === 'carte' ? vitrineCarte() : vitrine === 'serree' ? vitrineSerree() : brut
  const sansBase = infra && p.get('sansbase') === '1' ? { ...avecVitrine, carte: undefined, chantiers: avecVitrine.chantiers.map((c) => ({ ...c, lat: null, lng: null })) } : avecVitrine
  const donneesAvant = infra && p.get('stock') === 'vide' ? { ...sansBase, materiaux: [], reservations: [] } : sansBase
  // Le véhicule : AVANT, la camionnette du premier chantier du jour est encore au dépôt ; APRÈS, elle y est affectée (elle part).
  const quoi = infra ? p.get('evenement') ?? '' : ''
  const sansVehicule = (d: DonneesAtelier): DonneesAtelier => { const pris = d.chantiers.find((c) => c.vehicule_id && estAujourdhui(c, d.jour)); return pris ? { ...d, chantiers: d.chantiers.map((c) => (c.id === pris.id ? { ...c, vehicule_id: null } : c)) } : d }
  const donnees = quoi && apres ? evenementDemo(donneesAvant, quoi) : quoi === 'vehicule' || quoi === 'tout' ? sansVehicule(donneesAvant) : donneesAvant
  const nPlan = Number(p.get('plan'))
  if (infra && Number.isInteger(nPlan) && nPlan > 0) {
    const f = ficheChantierExemple(`00000000-0000-4000-8000-${String(nPlan).padStart(12, '0')}`)
    if (!f) return <main style={{ padding: 16 }}><p>Ce chantier n’existe pas dans l’exemple.</p></main>
    const type = estTypeBat(p.get('type')) ? (p.get('type') as TypeBat) : f.carte ? f.carte.type ?? f.carte.typeDeduit : null
    return (
      <main style={{ background: 'var(--paper)', minHeight: '100vh', padding: 16, maxWidth: 1180 }}>
        <p className="crm-note" style={{ marginBottom: 8 }}>Démonstration interne · données fictives · rien n’est lu ni écrit. Chantier : {f.chantier.titre}</p>
        <ModeExemple actif>
          <PlanChantier titre={f.chantier.titre} taches={f.taches} membres={EQUIPE_EXEMPLE.membres} metier={p.get('metierPlan') ?? 'Plombier'} typeBatiment={type} cocher={() => {}} agir={async () => false} />
        </ModeExemple>
      </main>
    )
  }
  return (
    <main style={{ background: 'var(--paper)', minHeight: '100vh', padding: 16 }}>
      <p className="crm-note" style={{ marginBottom: 8 }}>Démonstration interne · données fictives · rien n’est lu ni écrit.</p>
      <Atelier donnees={donnees} demo mesure={p.get('mesure') === '1'} prereglageInitial={metier} vueInitiale={vue as NomVue | undefined} filtreInitial={filtre} forcer={mode} baseInitiale={base} heure={heure} metierInitial={metier3D} vue={infra && p.get('vide') !== '1' ? VUE_EXEMPLE : undefined} />
    </main>
  )
}

/** La relecture « en direct » de la démonstration : les mêmes données, avec ce qu'un artisan vient de faire (données fictives). */
function evenementDemo(d: DonneesAtelier, quoi: string): DonneesAtelier {
  let x = d
  const tout = quoi === 'tout'
  // (Le véhicule : les données d'origine l'affectent déjà — la vue d'avant l'avait laissé au dépôt.)
  if (quoi === 'livraison' || tout) {
    const c = (x.commandes ?? []).find((k) => k.statut === 'commandee' && k.livraison_prevue !== x.jour)
    if (c) x = { ...x, commandes: (x.commandes ?? []).map((k) => (k.id === c.id ? { ...k, livraison_prevue: x.jour } : k)) }
  }
  if (tout) {
    const c = x.chantiers.find((k) => k.taches && k.taches.faites < k.taches.total && k.statut === 'en_cours')
    if (c && c.taches) x = { ...x, chantiers: x.chantiers.map((k) => (k.id === c.id && k.taches ? { ...k, avancement: Math.round(((k.taches.faites + 1) / k.taches.total) * 100), taches: { ...k.taches, faites: k.taches.faites + 1, ouvertes: k.taches.ouvertes.slice(1) } } : k)) }
    // La facture émise de l'exemple (« Mise aux normes gaz », 2 100 € TTC) devient payée : son montant réel.
    const ch = x.chantiers.find((k) => k.titre === 'Mise aux normes gaz')
    if (ch) x = { ...x, paiements: [...(x.paiements ?? []), { id: 'facture-602', chantierId: ch.id, montant: 210000 }] }
  }
  return x
}
