'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { exporterCsv, lireCsv, tableauxDeBord, type ChampCanonique, type Ligne } from '@/lib/comptaImport'
import { exporterJournal, lignesStockeesValides, type FichierCompta } from '@/lib/comptaArtisan'
import { lireClasseur } from '@/lib/comptaClasseur'
import { appliquerPlan, colonnesAmbigues, completerPlan, construireEchantillon, fusionnerLignes, planParRegles, validerPlanIA, type Etape, type Plan, type ResultatAssistant } from '@/lib/comptaAssistant'
import Tableur from './Tableur'

// Source n° 2 du tableau de bord : les fichiers de l'artisan (refonte du 12/10/2026).
//
// Le parcours est AUTOMATIQUE : l'artisan dépose, l'assistant range (et raconte ce qu'il fait réellement : feuilles
// lues, colonnes reconnues, dates et montants remis au même format, doublons retirés, lignes rejetées), le rangement
// est appliqué d'office au tableau de bord en APERÇU, et l'artisan valide d'un clic. On ne lui pose une question QUE
// pour une colonne ambiguë (lib/comptaAssistant.ts, colonnesAmbigues).
//
// Les lignes restent dans ce navigateur (localStorage, une clé par compte) : seule la FORME des fichiers part vers
// l'assistant, chiffres masqués. Aucune ligne d'exemple, aucun chiffre fictif : sans fichier, ce bloc n'affiche rien
// d'autre que la zone de dépôt.

const MAX_FICHIER = 5 * 1024 * 1024
const CHAMPS: { valeur: ChampCanonique | 'debit' | 'credit' | ''; nom: string }[] = [
  { valeur: '', nom: 'Ignorer' }, { valeur: 'date', nom: 'Date' }, { valeur: 'libelle', nom: 'Libellé' },
  { valeur: 'tiers', nom: 'Client ou fournisseur' }, { valeur: 'montant', nom: 'Montant' },
  { valeur: 'debit', nom: 'Débit (dépense)' }, { valeur: 'credit', nom: 'Crédit (recette)' },
  { valeur: 'sens', nom: 'Recette ou dépense' }, { valeur: 'categorie', nom: 'Catégorie' },
  { valeur: 'statut', nom: 'Statut payé ou impayé' }, { valeur: 'source', nom: 'Source' },
]
const NOM_CHAMP = { date: 'la date', montant: 'le montant', tiers: 'le client ou le fournisseur' } as const

type EtapeVue = Etape & { id: number; enCours?: boolean }
type Dernier = { fichiers: FichierCompta[]; plan: Plan; resultat: ResultatAssistant; avant: Ligne[]; lignes: Ligne[]; ajoutees: number; dejaLa: number }
/** Ce que le tableau de bord doit compter : les lignes validées, ou l'aperçu d'un rangement pas encore validé. */
export type EtatImport = { artisanId: string; lignes: Ligne[]; apercu: boolean; ajoutees: number }

const quantite = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`

function enregistrerFichier(contenu: string, nom: string) {
  const adresse = URL.createObjectURL(new Blob([contenu], { type: 'text/csv;charset=utf-8' }))
  const lien = document.createElement('a')
  lien.href = adresse
  lien.download = nom
  lien.click()
  setTimeout(() => URL.revokeObjectURL(adresse), 1000)
}

export default function ComptaArtisan({ artisanId, obtenirJeton, onLignes }: { artisanId: string; obtenirJeton?: () => Promise<string | null>; onLignes?: (etat: EtatImport) => void }) {
  const [validees, setValidees] = useState<Ligne[] | null>(null)
  const [compteCharge, setCompteCharge] = useState(artisanId)
  const [message, setMessage] = useState('')
  const [travail, setTravail] = useState(false)
  const [etapes, setEtapes] = useState<EtapeVue[]>([])
  const [dernier, setDernier] = useState<Dernier | null>(null)
  const [survol, setSurvol] = useState(false)
  const compteActif = useRef(artisanId)
  const generation = useRef(0)
  const arret = useRef<AbortController | null>(null)
  const numeroEtape = useRef(0)
  const signaler = useRef(onLignes)
  compteActif.current = artisanId
  signaler.current = onLignes
  const cleStockage = `presti-compta-artisan:${artisanId}`

  useEffect(() => {
    generation.current++
    arret.current?.abort()
    setTravail(false)
    setValidees(null)
    setCompteCharge(artisanId)
    setEtapes([])
    setDernier(null)
    setMessage('')
    try {
      const brut = localStorage.getItem(cleStockage)
      if (brut) {
        const lignes = JSON.parse(brut) as unknown
        if (!lignesStockeesValides(lignes)) throw new Error('Lignes enregistrées invalides')
        setValidees(lignes)
      }
    } catch { setMessage('Les lignes enregistrées dans ce navigateur sont illisibles. Redéposez vos fichiers Excel ou CSV.') }
    return () => { generation.current++; arret.current?.abort() }
  }, [cleStockage, artisanId])

  const memeCompte = compteCharge === artisanId
  // Le tableau de bord compte l'aperçu tant qu'il n'est ni validé ni annulé ; sinon, les lignes validées.
  useEffect(() => {
    // Chaque envoi porte le compte auquel il appartient : le tableau de bord ignore des lignes d'un autre compte,
    // même pendant le rendu qui suit un changement de compte (avant que cet effet ne reparte).
    if (!memeCompte) { signaler.current?.({ artisanId, lignes: [], apercu: false, ajoutees: 0 }); return }
    signaler.current?.(dernier && !travail ? { artisanId, lignes: dernier.lignes, apercu: true, ajoutees: dernier.ajoutees } : { artisanId, lignes: validees ?? [], apercu: false, ajoutees: 0 })
  }, [validees, dernier, travail, memeCompte, artisanId])

  const questions = useMemo(() => (dernier ? colonnesAmbigues(dernier.fichiers, dernier.plan) : []), [dernier])

  function enregistrer(lignes: Ligne[]): boolean {
    try {
      if (lignes.length) localStorage.setItem(cleStockage, JSON.stringify(lignes))
      else localStorage.removeItem(cleStockage)
      setValidees(lignes.length ? lignes : null)
      return true
    } catch {
      setMessage('Enregistrement impossible dans ce navigateur. Exportez vos lignes et vérifiez l’espace disponible.')
      return false
    }
  }

  // L'avis de l'assistant sur la forme des fichiers. Toute panne rend null : les règles prennent le relais.
  async function demanderIA(fichiers: FichierCompta[], signal: AbortSignal): Promise<{ plan: Plan | null; raison: string }> {
    if (!obtenirJeton) return { plan: null, raison: 'assistant indisponible ici' }
    const jeton = await obtenirJeton().catch(() => null)
    if (!jeton) return { plan: null, raison: 'session expirée' }
    const echantillon = construireEchantillon(fichiers)
    const reponse = await fetch('/api/compta/assistant', { method: 'POST', signal, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jeton}` }, body: JSON.stringify({ echantillon }) })
    const corps = await reponse.json().catch(() => null) as { plan?: unknown; error?: string } | null
    if (!reponse.ok || !corps?.plan) return { plan: null, raison: corps?.error ?? 'l’assistant n’a pas répondu' }
    const ia = validerPlanIA(corps.plan, echantillon)
    if (!ia) return { plan: null, raison: 'réponse illisible' }
    return { plan: completerPlan(ia, planParRegles(fichiers)), raison: '' }
  }

  // Le récit de ce que le moteur a réellement fait, chiffres compris (aucun n'est écrit à l'avance).
  function recit(resultat: ResultatAssistant, ajoutees: number, dejaLa: number): Etape[] {
    const lignes = resultat.rangement.lignes
    const recettes = lignes.filter((l) => l.sens === 'recette').length
    const out: Etape[] = [...resultat.etapes]
    if (lignes.length) out.push({ texte: `${quantite(lignes.length, 'ligne lue', 'lignes lues')} : dates et montants remis au même format (${quantite(recettes, 'recette', 'recettes')}, ${quantite(lignes.length - recettes, 'dépense', 'dépenses')}).`, ton: 'ok' })
    if (dejaLa) out.push({ texte: `${quantite(dejaLa, 'ligne déjà présente', 'lignes déjà présentes')} dans vos chiffres : pas comptée${dejaLa > 1 ? 's' : ''} deux fois.`, ton: 'info' })
    if (ajoutees) out.push({ texte: `${quantite(ajoutees, 'ligne ajoutée', 'lignes ajoutées')} au tableau de bord en aperçu. Vérifiez, puis validez.`, ton: 'ok' })
    return out
  }

  async function deposer(liste: FileList | null) {
    // Copie immédiate : la FileList du champ est vidée dès que le champ est remis à zéro.
    const selection = Array.from(liste ?? [])
    if (!selection.length || travail) return
    const compte = artisanId
    const tour = ++generation.current
    const encoreValide = () => tour === generation.current && compte === compteActif.current
    const controle = new AbortController()
    arret.current = controle
    numeroEtape.current = 0
    const journal: EtapeVue[] = []
    const noter = (e: Etape, enCours = false) => {
      journal.forEach((x) => { x.enCours = false })
      journal.push({ ...e, enCours, id: ++numeroEtape.current })
      if (encoreValide()) setEtapes([...journal])
    }
    setTravail(true)
    setMessage('')
    setDernier(null)
    try {
      noter({ texte: `Lecture de ${quantite(selection.length, 'fichier', 'fichiers')}…`, ton: 'info' }, true)
      const fichiers: FichierCompta[] = []
      for (const fichier of selection) {
        if (!/\.(csv|xlsx)$/i.test(fichier.name)) throw new Error(`${fichier.name} : choisissez un fichier Excel .xlsx ou CSV. Les anciens .xls et les classeurs à macros ne sont pas lus.`)
        if (fichier.size > MAX_FICHIER) throw new Error(`${fichier.name} : 5 Mo maximum par fichier.`)
        if (/\.xlsx$/i.test(fichier.name)) fichiers.push(...await lireClasseur(await fichier.arrayBuffer(), fichier.name))
        else fichiers.push({ nom: fichier.name, texte: await fichier.text(), sensParDefaut: 'recette' })
        if (!encoreValide()) return
      }
      noter({ texte: `${quantite(selection.length, 'fichier lu', 'fichiers lus')}, ${quantite(fichiers.length, 'feuille', 'feuilles')} à comprendre.`, ton: 'ok' })
      noter({ texte: 'L’assistant étudie la forme de vos feuilles : en-têtes, colonnes, lignes de total…', ton: 'info' }, true)
      let plan: Plan
      try {
        const avis = await demanderIA(fichiers, controle.signal)
        if (!encoreValide()) return
        if (avis.plan) { plan = avis.plan; noter({ texte: 'Structure de chaque feuille comprise.', ton: 'ok' }) }
        else { plan = planParRegles(fichiers); noter({ texte: `Rangement avec les règles de base (${avis.raison}).`, ton: 'attention' }) }
      } catch (erreur) {
        if (controle.signal.aborted || !encoreValide()) return
        plan = planParRegles(fichiers)
        noter({ texte: `Rangement avec les règles de base (${erreur instanceof Error ? 'connexion interrompue' : 'erreur'}).`, ton: 'attention' })
      }
      const resultat = appliquerPlan(fichiers, plan)
      const avant = validees ?? []
      const fusion = fusionnerLignes(avant, resultat.rangement.lignes)
      recit(resultat, fusion.ajoutees, fusion.dejaLa).forEach((e) => noter(e))
      if (!fusion.ajoutees) {
        noter({ texte: resultat.rangement.lignes.length ? 'Rien de nouveau : toutes ces lignes sont déjà dans vos chiffres.' : 'Aucune ligne exploitable dans ces fichiers. Ouvrez le détail pour indiquer les colonnes vous-même.', ton: 'attention' })
      }
      setDernier({ fichiers, plan, resultat, avant, lignes: fusion.lignes, ajoutees: fusion.ajoutees, dejaLa: fusion.dejaLa })
    } catch (erreur) {
      if (encoreValide()) setMessage(erreur instanceof Error ? erreur.message : 'Fichier illisible. Rien n’a été modifié.')
    } finally {
      if (encoreValide()) { setTravail(false); setEtapes((e) => e.map((x) => ({ ...x, enCours: false }))) }
    }
  }

  function arreter() {
    arret.current?.abort()
    generation.current++
    setTravail(false)
    setDernier(null)
    setEtapes((e) => [...e.map((x) => ({ ...x, enCours: false })), { id: ++numeroEtape.current, texte: 'Arrêté : rien n’a été modifié.', ton: 'attention' }])
  }

  function valider() {
    if (!dernier) return
    if (enregistrer(dernier.lignes)) {
      setEtapes((e) => [...e, { id: ++numeroEtape.current, texte: `Validé : ${quantite(dernier.ajoutees, 'ligne enregistrée', 'lignes enregistrées')} dans vos chiffres.`, ton: 'ok' }])
      setDernier(null)
    }
  }

  function annuler() {
    setDernier(null)
    setEtapes([])
    setMessage('Rangement annulé : vos chiffres n’ont pas bougé.')
  }

  // L'artisan tranche une colonne ambiguë, ou corrige une feuille mal lue : le même rangement est rejoué.
  function corriger(feuille: number, colonne: number, champ: string) {
    if (!dernier) return
    const p = dernier.plan.feuilles[feuille]
    const colonnes: Plan['feuilles'][number]['colonnes'] = Object.fromEntries(Object.entries(p.colonnes).filter(([cle, i]) => i !== colonne && cle !== champ))
    if (champ) colonnes[champ as keyof typeof colonnes] = colonne
    const ligneEntete = p.ligneEntete >= 0 ? p.ligneEntete : 0
    const plan: Plan = { ...dernier.plan, feuilles: dernier.plan.feuilles.map((f, i) => i === feuille ? { ...f, role: 'donnees', ligneEntete, colonnes, raison: 'Colonnes indiquées par vous.' } : f) }
    const resultat = appliquerPlan(dernier.fichiers, plan)
    const fusion = fusionnerLignes(dernier.avant, resultat.rangement.lignes)
    setDernier({ ...dernier, plan, resultat, lignes: fusion.lignes, ajoutees: fusion.ajoutees, dejaLa: fusion.dejaLa })
  }

  function modifierLignes(lignes: Ligne[]) {
    if (!lignesStockeesValides(lignes)) { setMessage('Modification refusée : une ligne serait invalide.'); return }
    enregistrer(lignes)
  }

  function effacer() {
    try { localStorage.removeItem(cleStockage) } catch { /* rien */ }
    setValidees(null)
    setDernier(null)
    setEtapes([])
  }

  const nbValidees = memeCompte ? validees?.length ?? 0 : 0

  return <section className="ca" data-compta-artisan aria-labelledby="ca-titre">
    <div className={`ca-hero${memeCompte && travail ? ' ca-hero--actif' : ''}`}>
      <div className="ca-hero-texte">
        <p className="ca-eyebrow">Source 2 · vos fichiers</p>
        <h2 id="ca-titre">Ajoutez vos dépenses et vos ventes hors Presti. <span>L’assistant range tout.</span></h2>
        <p>Relevés de banque, cahier de recettes, factures fournisseurs : déposez-les tels quels, même en désordre. L’assistant reconnaît les colonnes, écarte les lignes de total et les doublons, classe vos dépenses, et les ajoute au tableau de bord. Vous n’avez qu’à valider.</p>
        <p className="ca-note">Les montants restent sur cet appareil : seule la forme des fichiers (en-têtes et textes, chiffres masqués) part vers l’assistant. Un crédit Standard par dépôt. Vos factures Presti sont déjà comptées : ne les redéposez pas, elles le seraient deux fois.</p>
      </div>
      <label className={`ca-depot${survol ? ' ca-depot--survol' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setSurvol(true) }} onDragLeave={() => setSurvol(false)}
        onDrop={(e) => { e.preventDefault(); setSurvol(false); void deposer(e.dataTransfer.files) }}>
        <span className="ca-depot-icone" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></svg></span>
        <b>{memeCompte && travail ? 'L’assistant range vos fichiers…' : 'Déposez vos Excel ou CSV'}</b>
        <small>ou touchez pour les choisir · .xlsx, .csv · 5 Mo max</small>
        <input type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" multiple disabled={memeCompte && travail} data-compta-fichier aria-label="Choisir des fichiers Excel ou CSV" onChange={(e) => { void deposer(e.target.files); e.target.value = '' }} />
      </label>
    </div>
    {memeCompte && message && <p role="status" className="ca-message">{message}</p>}

    {memeCompte && etapes.length > 0 && <section className={`psh-panel ca-agent${travail ? ' ca-agent--actif' : ''}`} data-compta-agent aria-live="polite" aria-labelledby="ca-agent-titre">
      <div className="ca-entete">
        <div><p className="ca-eyebrow">Assistant comptable</p><h3 id="ca-agent-titre">{travail ? 'L’assistant range vos fichiers' : dernier && dernier.ajoutees ? 'Rangement prêt : à valider' : 'Rangement terminé'}</h3></div>
        <div className="ca-actions">
          {travail && <button type="button" className="ca-secondaire" data-compta-arreter onClick={arreter}>Arrêter</button>}
        </div>
      </div>
      <ol className="ca-etapes">{etapes.map((e) => <li key={e.id} className={`ca-etape ca-etape--${e.enCours ? 'encours' : e.ton}`}><i aria-hidden="true" /><span>{e.texte}</span></li>)}</ol>

      {!travail && dernier && questions.length > 0 && <div className="ca-questions" data-compta-questions>
        <p className="ca-eyebrow">{questions.length > 1 ? `${questions.length} questions` : 'Une question'} avant de valider</p>
        {questions.map((q) => <label key={`${q.feuille}-${q.champ}`} className="ca-question">
          <span>Dans « {q.nomFeuille} », quelle colonne donne {NOM_CHAMP[q.champ]} ?</span>
          <select value={q.choisie ?? ''} onChange={(e) => corriger(q.feuille, Number(e.target.value), q.champ)}>
            {q.choisie === null && <option value="">Choisir…</option>}
            {q.candidates.map((c) => <option key={c.colonne} value={c.colonne}>{c.entete}</option>)}
          </select>
        </label>)}
      </div>}

      {!travail && dernier && dernier.ajoutees > 0 && <div className="ca-valider">
        <button type="button" className="ca-primaire" data-compta-valider onClick={valider}>{dernier.ajoutees > 1 ? `Valider ces ${dernier.ajoutees} lignes` : 'Valider cette ligne'}</button>
        <button type="button" className="ca-secondaire" data-compta-annuler onClick={annuler}>Annuler</button>
        <small>Le tableau de bord les compte déjà, marquées « aperçu ». Rien n’est enregistré avant votre validation.</small>
      </div>}

      {!travail && dernier && <details className="ca-detail" data-compta-detail>
        <summary>Voir ce que l’assistant a décidé, feuille par feuille</summary>
        {dernier.fichiers.map((f, i) => {
          const p = dernier.plan.feuilles[i]
          const entetes = (lireCsv(f.texte)[Math.max(0, p.ligneEntete)] ?? []).map((x) => x.trim()).slice(0, 15)
          return <div key={`${f.nom}-${i}`} className="ca-fichier" data-compta-feuille>
            <h4>{f.nom}</h4>
            <p className={p.role === 'donnees' ? '' : 'ca-erreur'}>{p.role === 'donnees' ? 'Comptée' : 'Mise de côté'} · {p.raison}</p>
            <div className="ca-colonnes">{entetes.map((nom, j) => {
              const champ = Object.entries(p.colonnes).find(([, k]) => k === j)?.[0] ?? ''
              return <label key={j}>{nom || `Colonne ${j + 1}`}<select aria-label={`${f.nom} : ${nom || `colonne ${j + 1}`}`} value={champ} onChange={(e) => corriger(i, j, e.target.value)}>{CHAMPS.map((c) => <option key={c.valeur} value={c.valeur}>{c.nom}</option>)}</select></label>
            })}</div>
          </div>
        })}
        {dernier.resultat.rangement.rejets.length > 0 && <div data-compta-raisons><h4>Lignes mises de côté</h4><ul>{dernier.resultat.rangement.rejets.slice(0, 50).map((r, i) => <li key={i}>{r.fichier}, ligne {r.ligne} : {r.raison}</li>)}</ul></div>}
      </details>}
    </section>}

    {nbValidees > 0 && validees && <details className="psh-panel ca-lignes" data-compta-lignes>
      <summary><b>Vos lignes importées</b> <span className="ca-note">{quantite(nbValidees, 'ligne', 'lignes')} · modifiables comme dans Excel</span></summary>
      <div className="ca-actions ca-actions--gauche">
        <button type="button" className="ca-secondaire" onClick={() => enregistrerFichier(exporterJournal(validees), 'comptabilite-journal-detaille.csv')}>Exporter les lignes pour le comptable</button>
        <button type="button" className="ca-secondaire" onClick={() => enregistrerFichier(exporterCsv(tableauxDeBord(validees)), 'comptabilite-totaux-fichiers.csv')}>Exporter les totaux de vos fichiers</button>
        <button type="button" className="ca-secondaire" data-compta-effacer onClick={effacer}>Effacer les lignes importées</button>
      </div>
      <Tableur lignes={validees} onChange={modifierLignes} />
    </details>}
  </section>
}
