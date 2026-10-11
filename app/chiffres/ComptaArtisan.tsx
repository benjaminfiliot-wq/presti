'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { exporterCsv, formatEuros, type ChampCanonique, type Ligne, type Sens } from '@/lib/comptaImport'
import { calculerVue, exporterJournal, lignesStockeesValides, preparerRelance, rangerFichiers, type FichierCompta } from '@/lib/comptaArtisan'
import { lireClasseur } from '@/lib/comptaClasseur'
import Tableur from './Tableur'

const CHAMPS: { valeur: ChampCanonique | ''; nom: string }[] = [
  { valeur: '', nom: 'Ignorer' }, { valeur: 'date', nom: 'Date' }, { valeur: 'libelle', nom: 'Libellé' },
  { valeur: 'tiers', nom: 'Client ou fournisseur' }, { valeur: 'montant', nom: 'Montant' },
  { valeur: 'sens', nom: 'Recette ou dépense' }, { valeur: 'categorie', nom: 'Catégorie' },
  { valeur: 'statut', nom: 'Statut payé ou impayé' }, { valeur: 'source', nom: 'Source' },
]
const EXEMPLE = 'Date;Client;Montant;Type;Statut;Catégorie\n01/03/2026;Client exemple;120,00;Vente;Impayé;\n02/03/2026;Fournisseur exemple;40,00;Achat;Payé;Matériel'
const MAX_FICHIER = 5 * 1024 * 1024

function enregistrerCsv(contenu: string, nom = 'comptabilite-tableau-de-bord.csv') {
  const adresse = URL.createObjectURL(new Blob([contenu], { type: 'text/csv;charset=utf-8' }))
  const lien = document.createElement('a')
  lien.href = adresse
  lien.download = nom
  lien.click()
  setTimeout(() => URL.revokeObjectURL(adresse), 1000)
}

export default function ComptaArtisan({ artisanId }: { artisanId: string }) {
  const [fichiers, setFichiers] = useState<FichierCompta[]>([])
  const [validees, setValidees] = useState<Ligne[] | null>(null)
  const [compteCharge, setCompteCharge] = useState(artisanId)
  const [message, setMessage] = useState('')
  const [brouillon, setBrouillon] = useState<string | null>(null)
  const [lecture, setLecture] = useState(false)
  const compteActif = useRef(artisanId)
  const generationLecture = useRef(0)
  compteActif.current = artisanId
  const cleStockage = `presti-compta-artisan:${artisanId}`

  useEffect(() => {
    generationLecture.current++
    setLecture(false)
    setValidees(null)
    setCompteCharge(artisanId)
    setFichiers([])
    setMessage('')
    setBrouillon(null)
    try {
      const brut = localStorage.getItem(cleStockage)
      if (brut) {
        const lignes = JSON.parse(brut) as unknown
        if (!lignesStockeesValides(lignes)) throw new Error('Lignes enregistrées invalides')
        setValidees(lignes)
      }
    } catch { setMessage('Les données enregistrées dans ce navigateur sont illisibles. Réimportez vos fichiers Excel ou CSV.') }
    return () => { generationLecture.current++ }
  }, [cleStockage])

  const rangement = useMemo(() => rangerFichiers(compteCharge === artisanId ? fichiers : []), [fichiers, compteCharge, artisanId])
  const vue = useMemo(() => validees && compteCharge === artisanId ? calculerVue(validees) : null, [validees, compteCharge, artisanId])
  const exempleLignes = useMemo(() => rangerFichiers([{ nom: 'exemple.csv', texte: EXEMPLE, sensParDefaut: 'recette' }]).lignes, [])
  const exemple = useMemo(() => calculerVue(exempleLignes), [exempleLignes])

  async function charger(selection: FileList | null) {
    if (!selection || lecture) return
    const compte = artisanId
    const generation = ++generationLecture.current
    const encoreValide = () => generation === generationLecture.current && compte === compteActif.current
    setLecture(true)
    const ajouts: FichierCompta[] = []
    try {
      for (const fichier of Array.from(selection)) {
        if (!/\.(csv|xlsx)$/i.test(fichier.name)) throw new Error('Choisissez un fichier Excel .xlsx ou CSV. Les anciens .xls et les classeurs à macros ne sont pas lus.')
        if (fichier.size > MAX_FICHIER) throw new Error('Fichier trop volumineux : 5 Mo maximum par fichier.')
        if (/\.xlsx$/i.test(fichier.name)) ajouts.push(...await lireClasseur(await fichier.arrayBuffer(), fichier.name))
        else ajouts.push({ nom: fichier.name, texte: await fichier.text(), sensParDefaut: 'recette' })
      }
      if (!encoreValide()) return
      setFichiers((precedents) => [...precedents, ...ajouts])
      setMessage('')
      setBrouillon(null)
    } catch (erreur) {
      if (encoreValide()) setMessage(erreur instanceof Error ? erreur.message : 'Fichier illisible. Aucun nouveau fichier ajouté.')
    } finally {
      if (encoreValide()) setLecture(false)
    }
  }

  function changerColonne(fichier: number, colonne: number, champ: ChampCanonique | '') {
    setFichiers((precedents) => precedents.map((f, i) => i === fichier ? {
      ...f, colonnes: { ...f.colonnes, [colonne]: champ || null },
    } : f))
  }

  function valider() {
    if (!rangement.lignes.length || rangement.rejets.some((r) => r.ligne === 1)) return
    try {
      localStorage.setItem(cleStockage, JSON.stringify(rangement.lignes))
      setValidees(rangement.lignes)
      setFichiers([])
      setMessage('Rangement validé et enregistré dans ce navigateur. Vos fichiers n’ont pas été envoyés.')
    } catch { setMessage('Enregistrement impossible dans ce navigateur. Téléchargez votre export et vérifiez l’espace disponible.') }
  }

  // Une cellule corrigée dans le tableur : même contrôle qu'au chargement, puis même stockage.
  function enregistrerModifications(lignes: Ligne[]) {
    if (!lignesStockeesValides(lignes)) { setMessage('Modification refusée : une ligne serait invalide.'); return }
    try {
      localStorage.setItem(cleStockage, JSON.stringify(lignes))
      setValidees(lignes)
      setBrouillon(null)
    } catch { setMessage('Enregistrement impossible dans ce navigateur. Téléchargez votre export et vérifiez l’espace disponible.') }
  }

  const affichage = vue ?? exemple
  const donneesExemple = vue === null
  const maximum = Math.max(1, ...affichage.tableaux.parMois.map((m) => Math.max(m.recettes, m.depenses)))

  return <section className="ca" data-compta-artisan aria-labelledby="ca-titre">
    <div className="psh-panel ca-intro">
      <div><p className="ca-eyebrow">Votre comptabilité</p><h2 id="ca-titre">Dépose tes fichiers</h2>
        <p>Déposez vos fichiers Excel ou CSV de recettes et dépenses. Presti propose un rangement que vous vérifiez avant de le valider.</p>
        <p className="ca-note">Le fichier est lu ici, dans votre navigateur. Aucun envoi. Après validation, les lignes restent dans ce navigateur, pour ce compte.</p>
      </div>
      <label className="ca-depot">{compteCharge === artisanId && lecture ? 'Lecture des fichiers…' : 'Choisir des fichiers Excel ou CSV'}<input type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" multiple disabled={compteCharge === artisanId && lecture} data-compta-fichier onChange={(e) => { void charger(e.target.files); e.target.value = '' }} /></label>
    </div>
    <p className="ca-note">Chaque feuille remplie du classeur .xlsx apparaît séparément : retirez les feuilles de synthèse pour éviter de compter les totaux deux fois. Les formules utilisent seulement leur résultat enregistré dans Excel ; aucune formule ni macro n’est exécutée. Les données validées ne sont pas synchronisées sur vos autres appareils.</p>
    {compteCharge === artisanId && message && <p role="status" className="ca-message">{message}</p>}

    {compteCharge === artisanId && fichiers.length > 0 && <section className="psh-panel ca-rangement" data-compta-rangement aria-labelledby="ca-rangement-titre">
      <div className="ca-entete"><div><p className="ca-eyebrow">Avant validation</p><h3 id="ca-rangement-titre">Rangement proposé</h3></div><button type="button" className="ca-secondaire" onClick={() => { generationLecture.current++; setLecture(false); setFichiers([]) }}>Annuler</button></div>
      <div className="ca-compteurs"><span><b data-compta-retenues>{rangement.lignes.length}</b> lignes reconnues</span><span><b data-compta-doublons>{rangement.doublons}</b> doublons retirés</span><span><b data-compta-rejets>{rangement.rejets.length}</b> lignes rejetées</span></div>
      {rangement.fichiers.map(({ nom, rapport }, i) => <div key={`${nom}-${i}`} className="ca-fichier">
        <h4>{nom}</h4><button type="button" className="ca-secondaire" onClick={() => setFichiers((avant) => avant.filter((_, j) => j !== i))}>Retirer cette feuille ou ce fichier</button>
        <label>Si aucune colonne « type » : <select value={fichiers[i].sensParDefaut} onChange={(e) => setFichiers((avant) => avant.map((f, j) => j === i ? { ...f, sensParDefaut: e.target.value as Sens } : f))}><option value="recette">Recettes</option><option value="depense">Dépenses</option></select></label>
        <div className="ca-colonnes">{rapport.colonnes.map((colonne, j) => <label key={j}>{colonne.entete || `Colonne ${j + 1}`}<select aria-label={`${nom} : ${colonne.entete || `colonne ${j + 1}`}`} value={colonne.champ ?? ''} onChange={(e) => changerColonne(i, j, e.target.value as ChampCanonique | '')}>{CHAMPS.map((c) => <option key={c.valeur} value={c.valeur}>{c.nom}</option>)}</select></label>)}</div>
        {rapport.erreur && <p role="alert" className="ca-erreur">{rapport.erreur}</p>}
      </div>)}
      <div className="ca-apercu"><h4>Lignes retenues</h4><div className="ca-defile"><table><thead><tr><th>Date</th><th>Tiers</th><th>Libellé</th><th>Type</th><th>Montant</th><th>Statut</th></tr></thead><tbody>{rangement.lignes.map((l, i) => <tr key={i}><td>{l.date}</td><td>{l.tiers}</td><td>{l.libelle || '—'}</td><td>{l.sens === 'recette' ? 'Recette' : 'Dépense'}</td><td>{formatEuros(l.montant)}</td><td>{l.statut === 'impaye' ? 'Impayé' : l.statut === 'paye' ? 'Payé' : 'Non renseigné'}</td></tr>)}</tbody></table></div></div>
      {rangement.rejets.length > 0 && <div data-compta-raisons><h4>Lignes rejetées, à corriger dans le fichier</h4><ul>{rangement.rejets.map((r, i) => <li key={i}>{r.fichier}, ligne {r.ligne} : {r.raison}</li>)}</ul></div>}
      <button type="button" className="ca-primaire" data-compta-valider disabled={!rangement.lignes.length || rangement.rejets.some((r) => r.ligne === 1)} onClick={valider}>Valider ce rangement</button>
    </section>}

    <section className={`ca-tableau ${donneesExemple ? 'ca-exemple' : ''}`} data-compta-tableau aria-label="Tableau de bord comptable">
      <div className="ca-entete"><div><p className="ca-eyebrow">Tableau de bord {donneesExemple ? '· EXEMPLE' : '· Fichiers validés'}</p><h3>{donneesExemple ? 'Aperçu avec données fictives' : 'Vos chiffres importés'}</h3></div>
        {!donneesExemple && <div className="ca-actions"><button type="button" className="ca-secondaire" onClick={() => enregistrerCsv(exporterCsv(affichage.tableaux))}>Exporter les totaux CSV</button><button type="button" className="ca-secondaire" onClick={() => enregistrerCsv(exporterJournal(validees ?? []), 'comptabilite-journal-detaille.csv')}>Exporter les lignes pour le comptable</button><button type="button" className="ca-secondaire" onClick={() => { localStorage.removeItem(cleStockage); setValidees(null); setBrouillon(null) }}>Effacer les données importées</button></div>}
      </div>
      {donneesExemple && <p className="ca-note">EXEMPLE — ces montants et ces noms sont fictifs. Déposez et validez vos CSV pour voir vos propres chiffres.</p>}
      <div className="ca-kpis"><article><span>Chiffre d’affaires · recettes</span><b data-compta-recettes>{formatEuros(affichage.tableaux.recettes)}</b></article><article><span>Dépenses</span><b data-compta-depenses>{formatEuros(affichage.tableaux.depenses)}</b></article><article><span>Bénéfice</span><b data-compta-benefice>{formatEuros(affichage.tableaux.benefice)}</b></article><article className="ca-impaye"><span>Impayés</span><b data-compta-impayes>{formatEuros(affichage.tableaux.impayes.montant)}</b><small>{affichage.tableaux.impayes.nombre} ligne(s)</small></article></div>
      <div className="ca-grille"><section className="psh-panel"><h4>Impayés à relancer</h4>{affichage.impayes.length ? <ul className="ca-impayes-liste">{affichage.impayes.map((l, i) => <li key={i} data-compta-impaye><div><b>{l.tiers}</b><small>{l.date} · {l.libelle || 'Sans libellé'}</small></div><strong>{formatEuros(l.montant)}</strong>{!donneesExemple && <button type="button" className="ca-secondaire" onClick={() => setBrouillon(preparerRelance(l))}>Préparer la relance</button>}</li>)}</ul> : <p>Aucun impayé signalé dans les lignes importées.</p>}</section>
        <section className="psh-panel"><h4>Dépenses par catégorie</h4>{affichage.tableaux.depensesParCategorie.length ? <ul className="ca-categories">{affichage.tableaux.depensesParCategorie.map((c) => <li key={c.categorie}><span>{c.categorie}</span><b>{formatEuros(c.montant)}</b></li>)}</ul> : <p>Aucune dépense.</p>}</section>
      </div>
      <section className="psh-panel"><h4>Chiffres par mois</h4><div className="ca-mois">{affichage.tableaux.parMois.map((m) => <div className="ca-mois-ligne" key={m.mois}><b>{m.mois}</b><div className="ca-barres"><span style={{ width: `${m.recettes / maximum * 100}%` }} title={`Recettes ${formatEuros(m.recettes)}`} /><span style={{ width: `${m.depenses / maximum * 100}%` }} title={`Dépenses ${formatEuros(m.depenses)}`} /></div><small>Recettes {formatEuros(m.recettes)} · Dépenses {formatEuros(m.depenses)}</small></div>)}</div></section>
      {donneesExemple ? <Tableur lignes={exempleLignes} /> : <Tableur lignes={validees ?? []} onChange={enregistrerModifications} />}
      <p className="ca-note">Ces recettes incluent les impayés : elles ne représentent pas les sommes encaissées. Le statut vient de vos fichiers ; un statut absent reste « non renseigné ». Un nouveau rangement validé remplace le précédent.</p>
    </section>
    {compteCharge === artisanId && brouillon && <section className="psh-panel ca-brouillon" data-compta-brouillon><h4>Brouillon de relance à relire</h4><p>Rien n’a été envoyé. Vérifiez les informations avant de copier ce texte.</p><textarea value={brouillon} onChange={(e) => setBrouillon(e.target.value)} aria-label="Brouillon de relance" rows={7} /></section>}
  </section>
}
