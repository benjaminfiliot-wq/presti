'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/app/AppShell'
import { supabase } from '@/lib/supabaseClient'
import { chargerTableau } from '@/lib/tableau/charger'
import { calculerTableau, type Bloc, type ListeTableau, type VueTableau } from '@/lib/tableau/calculer'
import styles from './tableau.module.css'

const horodatage = (iso: string) => `lu le ${new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', hour: 'numeric', timeZone: 'Europe/Paris' }).format(new Date(iso)).replace(':', ' h ')}`
const euros = (centimes: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(centimes / 100)
const moisFr = (cle: string) => new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'Europe/Paris' }).format(new Date(`${cle}-01T12:00:00Z`))

const ONGLETS = [
  { id: 'apercu', libelle: 'Vue d’ensemble', cible: '#apercu' },
  { id: 'tresorerie', libelle: 'Trésorerie', cible: '#tableau-graphique' },
  { id: 'priorites', libelle: 'Priorités', cible: '#priorites' },
  { id: 'activite', libelle: 'Clients & stock', cible: '#activite' },
  { id: 'details', libelle: 'Détails', cible: '#vue-detaillee' },
] as const

function Icone({ nom }: { nom: 'encaisse' | 'attente' | 'retard' | 'demandes' | 'valider' | 'grille' | 'devis' | 'factures' | 'clients' | 'stock' | 'reglages' | 'chiffres' }) {
  switch (nom) {
    case 'encaisse':
      return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="3" /><path d="M2 10h20M16 14h2" /></svg>
    case 'attente':
      return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
    case 'retard':
      return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /><path d="M12 9v4M12 17h.01" /></svg>
    case 'demandes':
      return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
    case 'valider':
      return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 12 2 2 4-4" /><rect x="3" y="4" width="18" height="16" rx="3" /></svg>
    case 'grille':
      return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
    case 'devis':
      return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></svg>
    case 'factures':
      return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 2v20l3-2 3 2 2-2 2 2 3-2 3 2V2l-3 2-3-2-2 2-2-2-3 2-3-2Z" /><path d="M8 10h8M8 14h6" /></svg>
    case 'clients':
      return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>
    case 'stock':
      return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m7.5 4.27 9 5.15M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5M12 22V12" /></svg>
    case 'chiffres':
      return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3v18h18" /><path d="m7 15 4-4 4 3 5-6" /></svg>
    case 'reglages':
      return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></svg>
  }
}

function FlecheEvolution({ haut }: { haut: boolean }) {
  return <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {haut ? <path d="M4 12 12 4M6 4h6v6" /> : <path d="m4 4 8 8M12 6v6H6" />}
  </svg>
}

function Source({ source, luLe }: { source: string; luLe: string }) {
  return <span className={styles.source} tabIndex={0} title={`Source : ${source}. ${horodatage(luLe)}`} aria-label={`Source : ${source}. ${horodatage(luLe)}`}>ⓘ<span className={styles.info}>Source : {source}. {horodatage(luLe)}</span></span>
}

function Bande({ vue }: { vue: VueTableau }) {
  const jour = vue.blocs.find((b) => b.id === 'jour')!
  const argent = vue.blocs.find((b) => b.id === 'argent')!
  const anPasse = argent.indicateurs[1]?.valeur
  const chiffres = [
    { ...argent.indicateurs[0], evolution: argent.indicateurs[0].evolution ?? vue.evolutionEncaisse, source: argent.source, etat: 'maitresse', icone: 'encaisse' as const, sousTexte: anPasse ? `An passé : ${anPasse}` : 'Carte maîtresse · mois en cours' },
    { ...argent.indicateurs[2], source: argent.source, etat: 'neutre', icone: 'attente' as const, sousTexte: 'Factures émises à régler' },
    { ...argent.indicateurs[3], source: argent.source, etat: 'crit', icone: 'retard' as const, sousTexte: 'Échéance dépassée' },
    { ...jour.indicateurs[0], source: jour.source, etat: 'neutre', icone: 'demandes' as const, sousTexte: 'Prospects à traiter' },
    { ...jour.indicateurs[3], source: jour.source, etat: 'warn', icone: 'valider' as const, sousTexte: 'Actions de l’assistant' },
  ]
  return <section className={styles.bande} aria-label="Chiffres clés">
    {chiffres.map((chiffre) => {
      const evo = chiffre.evolution ?? null
      return <article className={`${styles.chiffreCle} ${styles[chiffre.etat]}`} key={chiffre.libelle}>
        <div className={styles.chiffreTitre}>
          <div className={styles.chiffreEnteteGauche}>
            <span>{chiffre.libelle}</span>
            <Source source={chiffre.source} luLe={vue.luLe} />
          </div>
          <span className={styles.iconeCarte}><Icone nom={chiffre.icone} /></span>
        </div>
        <strong>{chiffre.valeur ?? '—'}</strong>
        <div className={styles.chiffrePied}>
          {evo !== null ? <small className={evo >= 0 ? styles.evolutionPositive : styles.evolutionNegative}>
            <FlecheEvolution haut={evo >= 0} />
            {evo > 0 ? '+' : ''}{evo} % par rapport au mois précédent
          </small> : <span className={styles.sousTexteCarte}>{chiffre.sousTexte}</span>}
        </div>
      </article>
    })}
  </section>
}

function Graphique({ vue }: { vue: VueTableau }) {
  const max = Math.max(1, ...vue.mois.map((m) => m.encaisses ?? 0))
  const precedent = vue.blocs.find((b) => b.id === 'argent')?.indicateurs[1].valeur
  const actuel = vue.blocs.find((b) => b.id === 'argent')?.indicateurs[0].valeur
  return <section className={`${styles.section} ${styles.graphiqueSection}`} aria-labelledby="tableau-graphique">
    <header className={styles.sectionEntete}>
      <div>
        <p className={styles.kicker}>TRÉSORERIE · 12 MOIS</p>
        <h2 id="tableau-graphique">Encaissements mensuels</h2>
      </div>
      <div className={styles.enteteDroite}>
        {actuel && <span className={styles.pastilleResume}>Ce mois : <strong>{actuel}</strong></span>}
        <Source source="factures.total_ttc, statut, payee_le, avoir_de" luLe={vue.luLe} />
      </div>
    </header>
    <svg className={styles.graphique} viewBox="0 0 720 205" role="img" aria-label="Encaissements par mois sur douze mois">
      <line x1="0" y1="38" x2="720" y2="38" className={styles.grilleAxe} />
      <line x1="0" y1="78" x2="720" y2="78" className={styles.grilleAxe} />
      <line x1="0" y1="118" x2="720" y2="118" className={styles.grilleAxe} />
      <line x1="0" y1="158" x2="720" y2="158" className={styles.axe} />
      {vue.mois.map((m, i) => {
        const hauteur = m.encaisses === null ? 0 : Math.max(m.encaisses > 0 ? 6 : 0, (m.encaisses / max) * 124)
        return <g key={m.cle} tabIndex={0} aria-label={`${moisFr(m.cle)} ${m.cle.slice(0, 4)} : ${m.encaisses === null ? 'donnée indisponible' : euros(m.encaisses)}`}>
          <title>{moisFr(m.cle)} {m.cle.slice(0, 4)} : {m.encaisses === null ? 'donnée indisponible' : euros(m.encaisses)}</title>
          <rect x={i * 60 + 14} y="34" width="32" height="124" rx="8" className={styles.pisteBaton} />
          <rect x={i * 60 + 14} y={158 - hauteur} width="32" height={hauteur} rx="8" className={i === 11 ? styles.batonActuel : styles.baton} />
          <text x={i * 60 + 30} y="184" textAnchor="middle" className={styles.moisGraphique}>{moisFr(m.cle)}</text>
        </g>
      })}
    </svg>
    {vue.mois.every((m) => m.encaisses === null) && <p className={styles.vide}>Aucun règlement daté pour cette période.</p>}
    <div className={styles.piedGraphique}>
      {precedent && <p className={styles.annotation}>Repère · encaissé l’an passé : <strong>{precedent}</strong></p>}
      {vue.blocs.find((b) => b.id === 'argent')?.note && <p className={styles.note}>{vue.blocs.find((b) => b.id === 'argent')?.note}</p>}
    </div>
  </section>
}

function Liste({ liste, luLe }: { liste: ListeTableau; luLe: string }) {
  return <section className={`${styles.section} ${styles.listeSection}`} aria-labelledby={`liste-${liste.id}`} data-liste={liste.id}>
    <header className={styles.sectionEntete}>
      <div className={styles.titreAvecCompteur}>
        <h2 id={`liste-${liste.id}`}>{liste.titre}</h2>
        <span className={styles.compteurListe}>{liste.lignes.length}</span>
      </div>
      <Source source={liste.source} luLe={luLe} />
    </header>
    {liste.lignes.length ? <ul className={styles.lignes}>{liste.lignes.map((ligne) => <li key={ligne.id}>
      <Link href={ligne.href}>
        <span className={styles.ligneLibelle}>{ligne.libelle}</span>
        <span className={`${styles.ligneComplement} ${ligne.etat ? styles[ligne.etat] : ''}`}>{ligne.complement}</span>
        <span aria-hidden="true" className={styles.fleche}>↗</span>
      </Link>
    </li>)}</ul> : <p className={styles.vide}>{liste.vide}</p>}
    <Link className={styles.voirTout} href={liste.href}>Voir l’écran <span aria-hidden="true">↗</span></Link>
  </section>
}

function Section({ bloc, luLe }: { bloc: Bloc; luLe: string }) {
  const aDonnees = bloc.indicateurs.some((i) => i.valeur !== null) || !!bloc.details?.length
  return <section className={styles.section} aria-labelledby={`tableau-${bloc.id}`} data-bloc={bloc.id}>
    <header className={styles.sectionEntete}>
      <h2 id={`tableau-${bloc.id}`}>{bloc.titre}</h2>
      <Source source={bloc.source} luLe={luLe} />
    </header>
    {!aDonnees && <p className={styles.vide}>{bloc.vide}</p>}
    <dl className={styles.grille}>
      {bloc.indicateurs.map((i) => <div className={styles.indicateur} key={i.libelle}>
        <dt>{i.libelle}</dt><dd>{i.valeur ?? '—'}</dd>
      </div>)}
    </dl>
    {bloc.details && bloc.details.length > 0 && <ul className={styles.details}>{bloc.details.map((detail) => <li key={detail}>{detail}</li>)}</ul>}
    {bloc.note && <p className={styles.note}>{bloc.note}</p>}
  </section>
}

export default function Vue() {
  const router = useRouter()
  const [vue, setVue] = useState<VueTableau | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)
  const [maintenant, setMaintenant] = useState(Date.now())
  const [ongletActif, setOngletActif] = useState<string>('apercu')

  const relire = useCallback(async () => {
    setEnCours(true)
    try {
      const { data: utilisateur, error: erreurSession } = await supabase.auth.getUser()
      if (erreurSession || !utilisateur.user) { router.replace('/login'); return }
      const artisanId = utilisateur.user.id
      const donnees = await chargerTableau(supabase, artisanId)
      setVue(calculerTableau(donnees, artisanId, new Date()))
      setErreur(null)
    } catch {
      setErreur('Lecture indisponible. Vos chiffres précédents restent affichés ; réessayez.')
    } finally { setEnCours(false) }
  }, [router])

  useEffect(() => {
    void relire()
    const relecture = window.setInterval(() => { if (document.visibilityState === 'visible') void relire() }, 30_000)
    const horloge = window.setInterval(() => setMaintenant(Date.now()), 10_000)
    return () => { window.clearInterval(relecture); window.clearInterval(horloge) }
  }, [relire])

  const age = vue ? Math.max(0, Math.floor((maintenant - new Date(vue.luLe).getTime()) / 1000)) : 0
  const ageTexte = age < 60 ? `il y a ${age} s` : `il y a ${Math.floor(age / 60)} min`
  return <AppShell active="dashboard" title="Tableau de bord" crumb="Votre entreprise en direct" wide>
    <main className={styles.tableau} id="apercu">
      <div className={styles.barreHaute}>
        <div className={styles.marque}>
          <span className={styles.marquePastille} aria-hidden="true">P</span>
          <span className={styles.marqueNom}>Pilotage</span>
        </div>
        <nav className={styles.pastilles} aria-label="Sections du tableau de bord">
          {ONGLETS.map((o) => <a
            key={o.id}
            href={o.cible}
            onClick={() => setOngletActif(o.id)}
            className={ongletActif === o.id ? styles.pastilleActive : styles.pastille}
          >
            {o.libelle}
          </a>)}
        </nav>
        <div className={styles.actualisation} role="status">
          <span className={styles.pointDirect} aria-hidden="true" />
          <span>{vue ? `Mis à jour ${ageTexte}` : 'Lecture en cours…'}</span>
          <button type="button" disabled={enCours} onClick={() => void relire()} aria-label="Actualiser le tableau">↻</button>
        </div>
      </div>

      <div className={styles.cadre}>
        <aside className={styles.railIcones} aria-label="Accès rapides">
          <Link href="/tableau-de-bord" className={styles.iconeRailActive} title="Tableau de bord" aria-label="Tableau de bord"><Icone nom="grille" /></Link>
          <Link href="/devis" className={styles.iconeRail} title="Devis" aria-label="Devis"><Icone nom="devis" /></Link>
          <Link href="/factures" className={styles.iconeRail} title="Factures" aria-label="Factures"><Icone nom="factures" /></Link>
          <Link href="/crm" className={styles.iconeRail} title="Clients et chantiers" aria-label="Clients et chantiers"><Icone nom="clients" /></Link>
          <Link href="/inventaire" className={styles.iconeRail} title="Stock et tarifs" aria-label="Stock et tarifs"><Icone nom="stock" /></Link>
          <Link href="/chiffres" className={styles.iconeRail} title="Mes chiffres" aria-label="Mes chiffres"><Icone nom="chiffres" /></Link>
          <span className={styles.separateurRail} aria-hidden="true" />
          <Link href="/parametres" className={styles.iconeRail} title="Paramètres" aria-label="Paramètres"><Icone nom="reglages" /></Link>
        </aside>

        <div className={styles.contenu}>
          <div className={styles.entete}>
            <div>
              <p className={styles.surtitre}>POSTE DE PILOTAGE</p>
              <h1>Votre entreprise</h1>
            </div>
            <p className={styles.sousTitreEntete}>Vue temps réel de l’argent, des relances et de vos chantiers.</p>
          </div>
          {erreur && <p role="alert" className={styles.erreur}>{erreur}</p>}
          {!vue ? <p className={styles.vide}>Lecture de vos données…</p> : <>
            <Bande vue={vue} />
            <div className={styles.principal} id="priorites">
              <Graphique vue={vue} />
              <div className={styles.listesPrioritaires}>{vue.listes.slice(0, 3).map((liste) => <Liste key={liste.id} liste={liste} luLe={vue.luLe} />)}</div>
            </div>
            <div className={styles.listesSecondaires} id="activite">{vue.listes.slice(3).map((liste) => <Liste key={liste.id} liste={liste} luLe={vue.luLe} />)}</div>
            <h2 className={styles.sousTitre} id="vue-detaillee">Vue détaillée</h2>
            <div className={styles.sections}>{vue.blocs.filter((b) => b.id !== 'argent').map((bloc) => <Section key={bloc.id} bloc={bloc} luLe={vue.luLe} />)}</div>
          </>}
        </div>
      </div>
    </main>
  </AppShell>
}
