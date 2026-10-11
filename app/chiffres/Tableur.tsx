'use client'

// Le tableur : les lignes validées de l'artisan, présentées comme un classeur Excel. Quatre feuilles
// (onglets en bas, comme dans Excel), tri par colonne, filtres, ligne de totaux toujours à jour,
// cellules modifiables, et le téléchargement d'un vrai .xlsx. Tout le calcul vit dans
// lib/comptaTableur.ts et lib/comptaXlsx.ts : ce composant ne fait qu'afficher et transmettre.
//
// Sans `onChange`, le tableur est en lecture seule : c'est le cas des données d'EXEMPLE.
import { useMemo, useState } from 'react'
import { formatEuros, type Ligne, type Sens, type Statut } from '@/lib/comptaImport'
import { ajouter, dateFr, filtrer, modifier, moisFr, moisPresents, recapCategories, recapClients, recapMensuel, supprimer, totaux, trier, type ColonneJournal, type Filtres, type Modification, type Saisie, type Tri } from '@/lib/comptaTableur'
import { classeurCompta, ecrireClasseur, lettre } from '@/lib/comptaXlsx'

type Onglet = 'journal' | 'mois' | 'categories' | 'clients'
const ONGLETS: { id: Onglet; nom: string }[] = [
  { id: 'journal', nom: 'Journal' }, { id: 'mois', nom: 'Par mois' },
  { id: 'categories', nom: 'Dépenses par catégorie' }, { id: 'clients', nom: 'Clients' },
]
const COLONNES: { id: ColonneJournal; nom: string; num?: boolean }[] = [
  { id: 'date', nom: 'Date' }, { id: 'libelle', nom: 'Libellé' }, { id: 'tiers', nom: 'Client ou fournisseur' },
  { id: 'sens', nom: 'Type' }, { id: 'categorie', nom: 'Catégorie' }, { id: 'statut', nom: 'Statut' },
  { id: 'recette', nom: 'Recette', num: true }, { id: 'depense', nom: 'Dépense', num: true },
]
const PAGE = 300
const SAISIE_VIDE: Saisie = { date: '', libelle: '', tiers: '', sens: 'depense', montant: '', categorie: '', statut: 'paye' }

function telecharger(octets: Uint8Array, nom: string) {
  const adresse = URL.createObjectURL(new Blob([octets as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const lien = document.createElement('a')
  lien.href = adresse
  lien.download = nom
  lien.click()
  setTimeout(() => URL.revokeObjectURL(adresse), 1000)
}

/** Une cellule texte modifiable : validée à la sortie du champ ou par Entrée, annulée par Échap. */
function CelluleTexte({ valeur, nom, onValider }: { valeur: string; nom: string; onValider?: (v: string) => void }) {
  if (!onValider) return <>{valeur || '—'}</>
  return <input key={valeur} className="ct-saisie" defaultValue={valeur} aria-label={nom} maxLength={200}
    onBlur={(e) => { if (e.currentTarget.value.trim() !== valeur) onValider(e.currentTarget.value) }}
    onKeyDown={(e) => {
      if (e.key === 'Enter') e.currentTarget.blur()
      if (e.key === 'Escape') { e.currentTarget.value = valeur; e.currentTarget.blur() }
    }} />
}

const Montant = ({ v, ton }: { v: number; ton?: boolean }) => <span className={ton && v < 0 ? 'ct-neg' : undefined}>{formatEuros(v)}</span>

export default function Tableur({ lignes, onChange }: { lignes: Ligne[]; onChange?: (lignes: Ligne[]) => void }) {
  const [onglet, setOnglet] = useState<Onglet>('journal')
  const [filtres, setFiltres] = useState<Filtres>({ texte: '', sens: '', statut: '', mois: '' })
  const [tri, setTri] = useState<Tri>({ colonne: 'date', ordre: 'desc' })
  const [visibles, setVisibles] = useState(PAGE)
  const [saisie, setSaisie] = useState<Saisie | null>(null)
  const [erreurSaisie, setErreurSaisie] = useState('')
  const modifiable = !!onChange

  const index = useMemo(() => new Map(lignes.map((l, i) => [l, i])), [lignes])
  const affichees = useMemo(() => trier(filtrer(lignes, filtres), tri), [lignes, filtres, tri])
  const somme = useMemo(() => totaux(affichees), [affichees])
  const mois = useMemo(() => recapMensuel(lignes), [lignes])
  const categories = useMemo(() => recapCategories(lignes), [lignes])
  const clients = useMemo(() => recapClients(lignes), [lignes])
  const listeMois = useMemo(() => moisPresents(lignes), [lignes])
  const filtre = !!(filtres.texte || filtres.sens || filtres.statut || filtres.mois)

  const changer = (i: number | undefined, m: Modification) => { if (onChange && i !== undefined) onChange(modifier(lignes, i, m)) }
  const trierPar = (c: ColonneJournal) => setTri((t) => ({ colonne: c, ordre: t.colonne === c && t.ordre === 'asc' ? 'desc' : 'asc' }))
  const filtrerMois = (m: string) => { setFiltres({ texte: '', sens: '', statut: '', mois: m }); setOnglet('journal'); setVisibles(PAGE) }

  function enregistrerSaisie() {
    if (!onChange || !saisie) return
    const r = ajouter(lignes, saisie)
    if (r.erreur) { setErreurSaisie(r.erreur); return }
    onChange(r.lignes)
    setSaisie(null)
    setErreurSaisie('')
  }

  const totalMois = totaux(lignes)
  const totalImpayes = mois.reduce((n, m) => n + m.impayes, 0)

  return <section className="psh-panel ct" data-compta-tableur aria-labelledby="ct-titre">
    <div className="ct-barre">
      <div><p className="ca-eyebrow">Tableur</p><h4 id="ct-titre">Vos lignes, rangées comme dans Excel</h4></div>
      <div className="ca-actions">
        {modifiable && onglet === 'journal' && <button type="button" className="ca-secondaire" data-compta-ajouter onClick={() => { setSaisie(saisie ? null : SAISIE_VIDE); setErreurSaisie('') }}>{saisie ? 'Fermer la saisie' : 'Ajouter une ligne'}</button>}
        <button type="button" className="ca-primaire" data-compta-xlsx onClick={() => telecharger(ecrireClasseur(classeurCompta(lignes)), `comptabilite-${new Date().toISOString().slice(0, 10)}.xlsx`)}>Télécharger en Excel (.xlsx)</button>
      </div>
    </div>

    {onglet === 'journal' && <>
      <div className="ct-filtres" role="search">
        <input type="search" placeholder="Chercher un client, un libellé, une catégorie" aria-label="Chercher dans les lignes" value={filtres.texte} onChange={(e) => { setFiltres({ ...filtres, texte: e.target.value }); setVisibles(PAGE) }} data-compta-chercher />
        <select aria-label="Filtrer par type" value={filtres.sens} onChange={(e) => setFiltres({ ...filtres, sens: e.target.value as Sens | '' })} data-compta-filtre-type><option value="">Recettes et dépenses</option><option value="recette">Recettes</option><option value="depense">Dépenses</option></select>
        <select aria-label="Filtrer par statut" value={filtres.statut} onChange={(e) => setFiltres({ ...filtres, statut: e.target.value as Statut | '' })}><option value="">Tous les statuts</option><option value="impaye">Impayés</option><option value="paye">Payés</option><option value="non_renseigne">Non renseignés</option></select>
        <select aria-label="Filtrer par mois" value={filtres.mois} onChange={(e) => setFiltres({ ...filtres, mois: e.target.value })}><option value="">Tous les mois</option>{listeMois.map((m) => <option key={m} value={m}>{moisFr(m)}</option>)}</select>
        {filtre && <button type="button" className="ca-secondaire" onClick={() => setFiltres({ texte: '', sens: '', statut: '', mois: '' })}>Effacer les filtres</button>}
      </div>

      {saisie && <div className="ct-ajout" data-compta-saisie>
        <label>Date<input value={saisie.date} placeholder="15/03/2026" onChange={(e) => setSaisie({ ...saisie, date: e.target.value })} /></label>
        <label>Type<select value={saisie.sens} onChange={(e) => setSaisie({ ...saisie, sens: e.target.value as Sens })}><option value="depense">Dépense</option><option value="recette">Recette</option></select></label>
        <label>{saisie.sens === 'recette' ? 'Client' : 'Fournisseur'}<input value={saisie.tiers} onChange={(e) => setSaisie({ ...saisie, tiers: e.target.value })} maxLength={200} /></label>
        <label>Libellé<input value={saisie.libelle} onChange={(e) => setSaisie({ ...saisie, libelle: e.target.value })} maxLength={200} /></label>
        <label>Montant (€)<input value={saisie.montant} inputMode="decimal" placeholder="120,50" onChange={(e) => setSaisie({ ...saisie, montant: e.target.value })} /></label>
        <label>Catégorie<input value={saisie.categorie} onChange={(e) => setSaisie({ ...saisie, categorie: e.target.value })} maxLength={200} /></label>
        <label>Statut<select value={saisie.statut} onChange={(e) => setSaisie({ ...saisie, statut: e.target.value as Statut })}><option value="paye">Payé</option><option value="impaye">Impayé</option><option value="non_renseigne">Non renseigné</option></select></label>
        <button type="button" className="ca-primaire" onClick={enregistrerSaisie} data-compta-saisie-ok>Ajouter</button>
        {erreurSaisie && <p role="alert" className="ca-erreur">{erreurSaisie}</p>}
      </div>}

      <div className="ct-grille" role="region" aria-label="Journal des lignes" tabIndex={0}>
        <table className="ct-table" data-compta-journal>
          <thead>
            <tr className="ct-lettres" aria-hidden="true"><th className="ct-coin" />{COLONNES.map((_, j) => <th key={j}>{lettre(j)}</th>)}{modifiable && <th />}</tr>
            <tr>
              <th className="ct-num" scope="col"><span className="visually-hidden">Ligne</span>1</th>
              {COLONNES.map((c) => <th key={c.id} scope="col" className={c.num ? 'ct-droite' : undefined} aria-sort={tri.colonne === c.id ? (tri.ordre === 'asc' ? 'ascending' : 'descending') : 'none'}>
                <button type="button" onClick={() => trierPar(c.id)} data-compta-trier={c.id}>{c.nom}<span aria-hidden="true">{tri.colonne === c.id ? (tri.ordre === 'asc' ? ' ▲' : ' ▼') : ''}</span></button>
              </th>)}
              {modifiable && <th scope="col"><span className="visually-hidden">Actions</span></th>}
            </tr>
          </thead>
          <tbody>
            {affichees.slice(0, visibles).map((l, k) => {
              const i = index.get(l)
              return <tr key={`${l.ligne}-${l.date}-${i}`} data-compta-ligne className={l.statut === 'impaye' ? 'ct-impaye' : undefined}>
                <th scope="row" className="ct-num">{k + 2}</th>
                <td className="ct-date">{dateFr(l.date)}</td>
                <td><CelluleTexte valeur={l.libelle} nom={`Libellé, ligne ${k + 2}`} onValider={modifiable ? (v) => changer(i, { champ: 'libelle', valeur: v }) : undefined} /></td>
                <td><CelluleTexte valeur={l.tiers} nom={`Client ou fournisseur, ligne ${k + 2}`} onValider={modifiable ? (v) => changer(i, { champ: 'tiers', valeur: v }) : undefined} /></td>
                <td>{modifiable ? <select className="ct-saisie" aria-label={`Type, ligne ${k + 2}`} value={l.sens} onChange={(e) => changer(i, { champ: 'sens', valeur: e.target.value as Sens })}><option value="recette">Recette</option><option value="depense">Dépense</option></select> : (l.sens === 'recette' ? 'Recette' : 'Dépense')}</td>
                <td><CelluleTexte valeur={l.categorie} nom={`Catégorie, ligne ${k + 2}`} onValider={modifiable ? (v) => changer(i, { champ: 'categorie', valeur: v }) : undefined} /></td>
                <td>{modifiable ? <select className="ct-saisie" aria-label={`Statut, ligne ${k + 2}`} value={l.statut} onChange={(e) => changer(i, { champ: 'statut', valeur: e.target.value as Statut })} data-compta-statut><option value="paye">Payé</option><option value="impaye">Impayé</option><option value="non_renseigne">Non renseigné</option></select> : (l.statut === 'impaye' ? 'Impayé' : l.statut === 'paye' ? 'Payé' : 'Non renseigné')}</td>
                <td className="ct-droite">{l.sens === 'recette' ? formatEuros(l.montant) : ''}</td>
                <td className="ct-droite">{l.sens === 'depense' ? formatEuros(l.montant) : ''}</td>
                {modifiable && <td><button type="button" className="ct-suppr" aria-label={`Supprimer la ligne ${k + 2}`} onClick={() => { if (i !== undefined && onChange && window.confirm('Supprimer cette ligne ? Elle disparaît de vos chiffres dans ce navigateur.')) onChange(supprimer(lignes, i)) }}>×</button></td>}
              </tr>
            })}
            {!affichees.length && <tr><td colSpan={COLONNES.length + (modifiable ? 2 : 1)} className="ct-vide">Aucune ligne ne correspond à ces filtres.</td></tr>}
          </tbody>
          <tfoot>
            <tr data-compta-totaux>
              <th scope="row" className="ct-num">Σ</th>
              <td colSpan={5}><b data-compta-total-nombre>{somme.nombre}</b> {somme.nombre > 1 ? 'lignes' : 'ligne'}{filtre ? ' filtrées' : ''} · Solde <b data-compta-total-solde><Montant v={somme.solde} ton /></b></td>
              <td className="ct-droite">Total</td>
              <td className="ct-droite"><b data-compta-total-recettes>{formatEuros(somme.recettes)}</b></td>
              <td className="ct-droite"><b data-compta-total-depenses>{formatEuros(somme.depenses)}</b></td>
              {modifiable && <td />}
            </tr>
          </tfoot>
        </table>
      </div>
      {affichees.length > visibles && <button type="button" className="ca-secondaire ct-plus" onClick={() => setVisibles((v) => v + PAGE)}>Afficher {Math.min(PAGE, affichees.length - visibles)} lignes de plus (sur {affichees.length})</button>}
    </>}

    {onglet === 'mois' && <div className="ct-grille" role="region" aria-label="Récapitulatif par mois" tabIndex={0}>
      <table className="ct-table" data-compta-feuille-mois>
        <thead><tr><th scope="col">Mois</th><th scope="col" className="ct-droite">Lignes</th><th scope="col" className="ct-droite">Recettes</th><th scope="col" className="ct-droite">Dépenses</th><th scope="col" className="ct-droite">Bénéfice</th><th scope="col" className="ct-droite">Bénéfice cumulé</th><th scope="col" className="ct-droite">Dont impayés</th></tr></thead>
        <tbody>{mois.map((m) => <tr key={m.mois}>
          <th scope="row"><button type="button" className="ct-lien" onClick={() => filtrerMois(m.mois)} title="Voir les lignes de ce mois">{moisFr(m.mois)}</button></th>
          <td className="ct-droite">{m.nombre}</td><td className="ct-droite">{formatEuros(m.recettes)}</td><td className="ct-droite">{formatEuros(m.depenses)}</td>
          <td className="ct-droite"><Montant v={m.benefice} ton /></td><td className="ct-droite"><Montant v={m.cumul} ton /></td><td className="ct-droite">{m.impayes ? <span className="ct-rouge">{formatEuros(m.impayes)}</span> : '—'}</td>
        </tr>)}</tbody>
        {mois.length > 0 && <tfoot><tr><th scope="row">Total</th><td className="ct-droite">{totalMois.nombre}</td><td className="ct-droite"><b>{formatEuros(totalMois.recettes)}</b></td><td className="ct-droite"><b>{formatEuros(totalMois.depenses)}</b></td><td className="ct-droite"><b><Montant v={totalMois.solde} ton /></b></td><td /><td className="ct-droite"><b>{formatEuros(totalImpayes)}</b></td></tr></tfoot>}
      </table>
    </div>}

    {onglet === 'categories' && <div className="ct-grille" role="region" aria-label="Dépenses par catégorie" tabIndex={0}>
      <table className="ct-table">
        <thead><tr><th scope="col">Catégorie</th><th scope="col" className="ct-droite">Lignes</th><th scope="col" className="ct-droite">Montant</th><th scope="col" className="ct-droite">Part</th></tr></thead>
        <tbody>{categories.length ? categories.map((c) => <tr key={c.categorie}><th scope="row">{c.categorie}</th><td className="ct-droite">{c.nombre}</td><td className="ct-droite">{formatEuros(c.montant)}</td><td className="ct-droite">{c.part === null ? '—' : `${String(c.part).replace('.', ',')} %`}</td></tr>) : <tr><td colSpan={4} className="ct-vide">Aucune dépense.</td></tr>}</tbody>
        {categories.length > 0 && <tfoot><tr><th scope="row">Total</th><td className="ct-droite">{categories.reduce((n, c) => n + c.nombre, 0)}</td><td className="ct-droite"><b>{formatEuros(totalMois.depenses)}</b></td><td className="ct-droite">100 %</td></tr></tfoot>}
      </table>
    </div>}

    {onglet === 'clients' && <div className="ct-grille" role="region" aria-label="Recettes par client" tabIndex={0}>
      <table className="ct-table">
        <thead><tr><th scope="col">Client</th><th scope="col" className="ct-droite">Lignes</th><th scope="col" className="ct-droite">Recettes</th><th scope="col" className="ct-droite">Dont impayés</th></tr></thead>
        <tbody>{clients.length ? clients.map((c) => <tr key={c.tiers}><th scope="row">{c.tiers}</th><td className="ct-droite">{c.nombre}</td><td className="ct-droite">{formatEuros(c.recettes)}</td><td className="ct-droite">{c.impayes ? <span className="ct-rouge">{formatEuros(c.impayes)}</span> : '—'}</td></tr>) : <tr><td colSpan={4} className="ct-vide">Aucune recette.</td></tr>}</tbody>
        {clients.length > 0 && <tfoot><tr><th scope="row">Total</th><td className="ct-droite">{clients.reduce((n, c) => n + c.nombre, 0)}</td><td className="ct-droite"><b>{formatEuros(totalMois.recettes)}</b></td><td className="ct-droite"><b>{formatEuros(totalImpayes)}</b></td></tr></tfoot>}
      </table>
    </div>}

    <div className="ct-onglets" role="tablist" aria-label="Feuilles du classeur">
      {ONGLETS.map((o) => <button key={o.id} type="button" role="tab" aria-selected={onglet === o.id} className={onglet === o.id ? 'actif' : undefined} onClick={() => setOnglet(o.id)} data-compta-onglet={o.id}>{o.nom}</button>)}
    </div>
    <p className="ca-note">{modifiable
      ? 'Cliquez dans une cellule pour la corriger : les totaux, le tableau de bord et les impayés se recalculent aussitôt. Les modifications restent dans ce navigateur ; un nouveau rangement validé les remplace. Le fichier Excel téléchargé contient les quatre feuilles, avec de vraies formules SOMME.'
      : 'EXEMPLE — tableur en lecture seule sur des données fictives. Validez vos fichiers pour corriger vos propres lignes.'}</p>
  </section>
}
