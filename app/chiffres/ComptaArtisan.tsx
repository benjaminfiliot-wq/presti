'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { exporterCsv, formatEuros, lireCsv, type ChampCanonique, type Ligne } from '@/lib/comptaImport'
import { calculerVue, exporterJournal, lignesStockeesValides, preparerRelance, rangerFichiers, type FichierCompta } from '@/lib/comptaArtisan'
import { lireClasseur } from '@/lib/comptaClasseur'
import { appliquerPlan, bilanEnMots, completerPlan, construireEchantillon, fusionnerLignes, planParRegles, validerPlanIA, type Etape, type Plan, type ResultatAssistant } from '@/lib/comptaAssistant'
import Tableur from './Tableur'

// La comptabilité faite par l'IA (refonte du 11/10/2026). L'artisan dépose ses fichiers tels quels ;
// l'assistant comprend leur forme, met de côté les totaux, classe les dépenses, et le tableau de bord
// se remplit. Il n'a rien à ranger lui-même : il relit, et corrige une cellule s'il le veut.
// Les montants ne quittent jamais ce navigateur : seule la forme des fichiers part vers l'IA.

const EXEMPLE = 'Date;Client;Montant;Type;Statut;Catégorie\n01/03/2026;Client exemple;120,00;Vente;Impayé;\n02/03/2026;Fournisseur exemple;40,00;Achat;Payé;Matériaux et fournitures'
const MAX_FICHIER = 5 * 1024 * 1024
const CHAMPS: { valeur: ChampCanonique | 'debit' | 'credit' | ''; nom: string }[] = [
  { valeur: '', nom: 'Ignorer' }, { valeur: 'date', nom: 'Date' }, { valeur: 'libelle', nom: 'Libellé' },
  { valeur: 'tiers', nom: 'Client ou fournisseur' }, { valeur: 'montant', nom: 'Montant' },
  { valeur: 'debit', nom: 'Débit (dépense)' }, { valeur: 'credit', nom: 'Crédit (recette)' },
  { valeur: 'sens', nom: 'Recette ou dépense' }, { valeur: 'categorie', nom: 'Catégorie' },
  { valeur: 'statut', nom: 'Statut payé ou impayé' }, { valeur: 'source', nom: 'Source' },
]

type EtapeVue = Etape & { id: number; enCours?: boolean }
type Dernier = { fichiers: FichierCompta[]; plan: Plan; resultat: ResultatAssistant; avant: Ligne[] }

function enregistrerCsv(contenu: string, nom = 'comptabilite-tableau-de-bord.csv') {
  const adresse = URL.createObjectURL(new Blob([contenu], { type: 'text/csv;charset=utf-8' }))
  const lien = document.createElement('a')
  lien.href = adresse
  lien.download = nom
  lien.click()
  setTimeout(() => URL.revokeObjectURL(adresse), 1000)
}

export default function ComptaArtisan({ artisanId, obtenirJeton }: { artisanId: string; obtenirJeton?: () => Promise<string | null> }) {
  const [validees, setValidees] = useState<Ligne[] | null>(null)
  const [compteCharge, setCompteCharge] = useState(artisanId)
  const [message, setMessage] = useState('')
  const [brouillon, setBrouillon] = useState<string | null>(null)
  const [travail, setTravail] = useState(false)
  const [etapes, setEtapes] = useState<EtapeVue[]>([])
  const [dernier, setDernier] = useState<Dernier | null>(null)
  const [survol, setSurvol] = useState(false)
  const compteActif = useRef(artisanId)
  const generation = useRef(0)
  const arret = useRef<AbortController | null>(null)
  const numeroEtape = useRef(0)
  compteActif.current = artisanId
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
    setBrouillon(null)
    try {
      const brut = localStorage.getItem(cleStockage)
      if (brut) {
        const lignes = JSON.parse(brut) as unknown
        if (!lignesStockeesValides(lignes)) throw new Error('Lignes enregistrées invalides')
        setValidees(lignes)
      }
    } catch { setMessage('Les données enregistrées dans ce navigateur sont illisibles. Redéposez vos fichiers Excel ou CSV.') }
    return () => { generation.current++; arret.current?.abort() }
  }, [cleStockage])

  const memeCompte = compteCharge === artisanId
  const vue = useMemo(() => validees && memeCompte ? calculerVue(validees) : null, [validees, memeCompte])
  const exempleLignes = useMemo(() => rangerFichiers([{ nom: 'exemple.csv', texte: EXEMPLE, sensParDefaut: 'recette' }]).lignes, [])
  const exemple = useMemo(() => calculerVue(exempleLignes), [exempleLignes])
  const bilan = useMemo(() => (validees && memeCompte ? bilanEnMots(validees) : []), [validees, memeCompte])

  function enregistrer(lignes: Ligne[]): boolean {
    try {
      localStorage.setItem(cleStockage, JSON.stringify(lignes))
      setValidees(lignes)
      return true
    } catch {
      setMessage('Enregistrement impossible dans ce navigateur. Téléchargez votre export et vérifiez l’espace disponible.')
      return false
    }
  }

  // L'avis de l'IA sur la forme des fichiers. Toute panne rend null : les règles prennent le relais.
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
    setBrouillon(null)
    setDernier(null)
    try {
      const fichiers: FichierCompta[] = []
      for (const fichier of selection) {
        if (!/\.(csv|xlsx)$/i.test(fichier.name)) throw new Error(`${fichier.name} : choisissez un fichier Excel .xlsx ou CSV. Les anciens .xls et les classeurs à macros ne sont pas lus.`)
        if (fichier.size > MAX_FICHIER) throw new Error(`${fichier.name} : 5 Mo maximum par fichier.`)
        if (/\.xlsx$/i.test(fichier.name)) fichiers.push(...await lireClasseur(await fichier.arrayBuffer(), fichier.name))
        else fichiers.push({ nom: fichier.name, texte: await fichier.text(), sensParDefaut: 'recette' })
        if (!encoreValide()) return
      }
      const nbFichiers = selection.length
      noter({ texte: `${nbFichiers} fichier${nbFichiers > 1 ? 's' : ''} lu${nbFichiers > 1 ? 's' : ''}, ${fichiers.length} feuille${fichiers.length > 1 ? 's' : ''} à comprendre.`, ton: 'ok' })
      noter({ texte: 'L’IA étudie la forme de vos fichiers : en-têtes, colonnes, feuilles de totaux…', ton: 'info' }, true)
      let plan: Plan
      try {
        const avis = await demanderIA(fichiers, controle.signal)
        if (!encoreValide()) return
        if (avis.plan) { plan = avis.plan; noter({ texte: 'L’IA a compris la structure de chaque feuille.', ton: 'ok' }) }
        else { plan = planParRegles(fichiers); noter({ texte: `Rangement avec les règles de base (${avis.raison}).`, ton: 'attention' }) }
      } catch (erreur) {
        if (controle.signal.aborted || !encoreValide()) return
        plan = planParRegles(fichiers)
        noter({ texte: `Rangement avec les règles de base (${erreur instanceof Error ? 'connexion interrompue' : 'erreur'}).`, ton: 'attention' })
      }
      const resultat = appliquerPlan(fichiers, plan)
      resultat.etapes.forEach((e) => noter(e))
      const avant = validees ?? []
      const fusion = fusionnerLignes(avant, resultat.rangement.lignes)
      if (!fusion.ajoutees && !resultat.rangement.lignes.length) {
        noter({ texte: 'Aucune ligne exploitable dans ces fichiers. Ouvrez le détail pour indiquer les colonnes vous-même.', ton: 'attention' })
        setDernier({ fichiers, plan, resultat, avant })
        return
      }
      if (!enregistrer(fusion.lignes)) return
      noter({ texte: `${fusion.ajoutees} ligne${fusion.ajoutees > 1 ? 's' : ''} ajoutée${fusion.ajoutees > 1 ? 's' : ''} à vos chiffres${fusion.dejaLa ? `, ${fusion.dejaLa} déjà présente${fusion.dejaLa > 1 ? 's' : ''}` : ''}. Tableau de bord à jour.`, ton: 'ok' })
      setDernier({ fichiers, plan, resultat, avant })
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
    setEtapes((e) => [...e.map((x) => ({ ...x, enCours: false })), { id: ++numeroEtape.current, texte: 'Arrêté : rien n’a été modifié.', ton: 'attention' }])
  }

  function annuler() {
    if (!dernier) return
    if (enregistrer(dernier.avant)) {
      if (!dernier.avant.length) { try { localStorage.removeItem(cleStockage) } catch { /* rien */ } setValidees(null) }
      setDernier(null)
      setEtapes([])
      setMessage('Rangement annulé : vos chiffres sont revenus à leur état précédent.')
    }
  }

  // L'artisan corrige une feuille que l'IA a mal lue : le même import est rejoué avec ses colonnes.
  function corriger(feuille: number, colonne: number, champ: string) {
    if (!dernier) return
    const p = dernier.plan.feuilles[feuille]
    const colonnes: Plan['feuilles'][number]['colonnes'] = Object.fromEntries(Object.entries(p.colonnes).filter(([cle, i]) => i !== colonne && cle !== champ))
    if (champ) colonnes[champ as keyof typeof colonnes] = colonne
    const ligneEntete = p.ligneEntete >= 0 ? p.ligneEntete : 0
    const plan: Plan = { ...dernier.plan, feuilles: dernier.plan.feuilles.map((f, i) => i === feuille ? { ...f, role: 'donnees', ligneEntete, colonnes, raison: 'Colonnes indiquées par vous.' } : f) }
    const resultat = appliquerPlan(dernier.fichiers, plan)
    const fusion = fusionnerLignes(dernier.avant, resultat.rangement.lignes)
    if (enregistrer(fusion.lignes)) setDernier({ ...dernier, plan, resultat })
  }

  function enregistrerModifications(lignes: Ligne[]) {
    if (!lignesStockeesValides(lignes)) { setMessage('Modification refusée : une ligne serait invalide.'); return }
    if (enregistrer(lignes)) setBrouillon(null)
  }

  const affichage = vue ?? exemple
  const donneesExemple = vue === null
  const maximum = Math.max(1, ...affichage.tableaux.parMois.map((m) => Math.max(m.recettes, m.depenses)))

  return <section className="ca" data-compta-artisan aria-labelledby="ca-titre">
    <div className={`ca-hero${travail ? ' ca-hero--actif' : ''}`}>
      <div className="ca-hero-texte">
        <p className="ca-eyebrow">Votre comptabilité, faite par l’IA</p>
        <h2 id="ca-titre">Déposez vos fichiers. <span>L’IA fait le reste.</span></h2>
        <p>Relevés de banque, cahier de recettes, factures fournisseurs : déposez-les tels quels, même en désordre. L’IA comprend les colonnes, écarte les lignes de total, classe vos dépenses et remplit votre tableau de bord.</p>
        <p className="ca-note">Les montants restent sur cet appareil : seule la forme des fichiers (en-têtes et textes, chiffres masqués) part vers l’IA. Un crédit Standard par dépôt.</p>
      </div>
      <label className={`ca-depot${survol ? ' ca-depot--survol' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setSurvol(true) }} onDragLeave={() => setSurvol(false)}
        onDrop={(e) => { e.preventDefault(); setSurvol(false); void deposer(e.dataTransfer.files) }}>
        <span className="ca-depot-icone" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></svg></span>
        <b>{memeCompte && travail ? 'L’IA travaille…' : 'Déposez vos Excel ou CSV'}</b>
        <small>ou cliquez pour les choisir · .xlsx, .csv · 5 Mo max</small>
        <input type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" multiple disabled={memeCompte && travail} data-compta-fichier onChange={(e) => { void deposer(e.target.files); e.target.value = '' }} />
      </label>
    </div>
    {memeCompte && message && <p role="status" className="ca-message">{message}</p>}

    {memeCompte && etapes.length > 0 && <section className={`psh-panel ca-agent${travail ? ' ca-agent--actif' : ''}`} data-compta-agent aria-live="polite" aria-labelledby="ca-agent-titre">
      <div className="ca-entete">
        <div><p className="ca-eyebrow">Assistant comptable</p><h3 id="ca-agent-titre">{travail ? 'Je range vos fichiers' : 'Rangement terminé'}</h3></div>
        <div className="ca-actions">
          {travail && <button type="button" className="ca-secondaire" onClick={arreter}>Arrêter</button>}
          {!travail && dernier && <button type="button" className="ca-secondaire" data-compta-annuler onClick={annuler}>Annuler ce rangement</button>}
        </div>
      </div>
      <ol className="ca-etapes">{etapes.map((e) => <li key={e.id} className={`ca-etape ca-etape--${e.enCours ? 'encours' : e.ton}`}><i aria-hidden="true" /><span>{e.texte}</span></li>)}</ol>
      {!travail && dernier && <details className="ca-detail" data-compta-detail>
        <summary>Voir ce que l’IA a décidé, feuille par feuille</summary>
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

    <section className={`ca-tableau ${donneesExemple ? 'ca-exemple' : ''}`} data-compta-tableau aria-label="Tableau de bord comptable">
      <div className="ca-entete"><div><p className="ca-eyebrow">Tableau de bord {donneesExemple ? '· EXEMPLE' : '· Vos fichiers'}</p><h3>{donneesExemple ? 'Aperçu avec données fictives' : 'Vos chiffres importés'}</h3></div>
        {!donneesExemple && <div className="ca-actions"><button type="button" className="ca-secondaire" onClick={() => enregistrerCsv(exporterCsv(affichage.tableaux))}>Exporter les totaux CSV</button><button type="button" className="ca-secondaire" onClick={() => enregistrerCsv(exporterJournal(validees ?? []), 'comptabilite-journal-detaille.csv')}>Exporter les lignes pour le comptable</button><button type="button" className="ca-secondaire" onClick={() => { try { localStorage.removeItem(cleStockage) } catch { /* rien */ } setValidees(null); setBrouillon(null); setDernier(null); setEtapes([]) }}>Effacer les données importées</button></div>}
      </div>
      {donneesExemple && <p className="ca-note">EXEMPLE : ces montants et ces noms sont fictifs. Déposez vos fichiers pour voir vos propres chiffres.</p>}
      {!donneesExemple && bilan.length > 0 && <div className="psh-panel ca-bilan" data-compta-bilan><p className="ca-eyebrow">Le point de l’assistant</p>{bilan.map((p, i) => <p key={i}>{p}</p>)}</div>}
      <div className="ca-kpis"><article><span>Chiffre d’affaires · recettes</span><b data-compta-recettes>{formatEuros(affichage.tableaux.recettes)}</b></article><article><span>Dépenses</span><b data-compta-depenses>{formatEuros(affichage.tableaux.depenses)}</b></article><article><span>Bénéfice</span><b data-compta-benefice>{formatEuros(affichage.tableaux.benefice)}</b></article><article className="ca-impaye"><span>Impayés</span><b data-compta-impayes>{formatEuros(affichage.tableaux.impayes.montant)}</b><small>{affichage.tableaux.impayes.nombre} ligne(s)</small></article></div>
      <div className="ca-grille"><section className="psh-panel"><h4>Impayés à relancer</h4>{affichage.impayes.length ? <ul className="ca-impayes-liste">{affichage.impayes.map((l, i) => <li key={i} data-compta-impaye><div><b>{l.tiers}</b><small>{l.date} · {l.libelle || 'Sans libellé'}</small></div><strong>{formatEuros(l.montant)}</strong>{!donneesExemple && <button type="button" className="ca-secondaire" onClick={() => setBrouillon(preparerRelance(l))}>Préparer la relance</button>}</li>)}</ul> : <p>Aucun impayé signalé dans les lignes importées.</p>}</section>
        <section className="psh-panel"><h4>Dépenses par catégorie</h4>{affichage.tableaux.depensesParCategorie.length ? <ul className="ca-categories">{affichage.tableaux.depensesParCategorie.map((c) => <li key={c.categorie}><span>{c.categorie}</span><b>{formatEuros(c.montant)}</b></li>)}</ul> : <p>Aucune dépense.</p>}</section>
      </div>
      <section className="psh-panel"><h4>Chiffres par mois</h4><div className="ca-mois">{affichage.tableaux.parMois.map((m) => <div className="ca-mois-ligne" key={m.mois}><b>{m.mois}</b><div className="ca-barres"><span style={{ width: `${m.recettes / maximum * 100}%` }} title={`Recettes ${formatEuros(m.recettes)}`} /><span style={{ width: `${m.depenses / maximum * 100}%` }} title={`Dépenses ${formatEuros(m.depenses)}`} /></div><small>Recettes {formatEuros(m.recettes)} · Dépenses {formatEuros(m.depenses)}</small></div>)}</div></section>
      {donneesExemple ? <Tableur lignes={exempleLignes} /> : <Tableur lignes={validees ?? []} onChange={enregistrerModifications} />}
      <p className="ca-note">Ces recettes incluent les impayés : elles ne représentent pas les sommes encaissées. Le statut vient de vos fichiers ; un statut absent reste « non renseigné ». Un nouveau dépôt s’ajoute aux chiffres déjà là, sans doubler une ligne identique.</p>
    </section>
    {memeCompte && brouillon && <section className="psh-panel ca-brouillon" data-compta-brouillon><h4>Brouillon de relance à relire</h4><p>Rien n’a été envoyé. Vérifiez les informations avant de copier ce texte.</p><textarea value={brouillon} onChange={(e) => setBrouillon(e.target.value)} aria-label="Brouillon de relance" rows={7} /></section>}
  </section>
}
