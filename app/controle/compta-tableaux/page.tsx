'use client'

import { useMemo, useState } from 'react'
import { actif } from '@/lib/flags'
import { exporterCsv, formatEuros, nettoyerTableur, tableauxDeBord, type Sens } from '@/lib/comptaImport'

// Comptabilité → tableaux de bord (tâche 028-002).
//
// L'artisan dépose son tableur en désordre (export CSV de ses factures, dépenses, relevés). Presti le lit
// dans le navigateur — rien n'est envoyé ni enregistré — reconnaît les colonnes, nettoie les lignes, puis
// affiche les tableaux de bord. Chaque ligne rejetée est dite avec sa raison : rien n'est deviné en silence.
//
// Franchise en base (art. 293 B du CGI) : aucune TVA facturée. L'écran le dit ; il n'affiche aucun seuil.

export default function ComptaTableaux() {
  const [nomFichier, setNomFichier] = useState<string | null>(null)
  const [texte, setTexte] = useState<string | null>(null)
  const [sensDefaut, setSensDefaut] = useState<Sens>('recette')

  const rapport = useMemo(() => (texte === null ? null : nettoyerTableur(texte, { sensParDefaut: sensDefaut })), [texte, sensDefaut])
  const tableaux = useMemo(() => (rapport && !rapport.erreur ? tableauxDeBord(rapport.lignes) : null), [rapport])

  if (!actif('comptabilite')) return <div className="tool-card"><p className="muted">Cet espace n’est pas encore ouvert.</p></div>

  function charger(f: File | undefined) {
    if (!f) return
    setNomFichier(f.name)
    void f.text().then(setTexte)
  }

  function exporter() {
    if (!tableaux) return
    const blob = new Blob([exporterCsv(tableaux)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'tableaux-de-bord.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section data-compta-tableaux aria-labelledby="compta-titre">
      <h1 id="compta-titre">Comptabilité — tableaux de bord</h1>
      <div className="tool-card">
        <p className="muted" style={{ margin: '0 0 .8rem' }}>
          Déposez l’export CSV de votre tableur (factures, dépenses, relevés). Presti reconnaît les colonnes, nettoie les lignes et
          calcule les tableaux. Le fichier est lu dans votre navigateur : rien n’est envoyé ni enregistré.
        </p>
        <label htmlFor="compta-fichier">Fichier CSV</label>
        <input id="compta-fichier" type="file" accept=".csv,.txt,text/csv" data-compta-fichier
          onChange={(e) => charger(e.target.files?.[0])} style={{ display: 'block', margin: '.4rem 0 .8rem' }} />
        <label htmlFor="compta-sens">Si le fichier n’a pas de colonne « Type », ces lignes sont des</label>
        <select id="compta-sens" value={sensDefaut} onChange={(e) => setSensDefaut(e.target.value as Sens)} data-sens-defaut style={{ display: 'block', marginTop: '.4rem', maxWidth: 220 }}>
          <option value="recette">recettes (vos ventes)</option>
          <option value="depense">dépenses (vos achats)</option>
        </select>
      </div>

      {rapport?.erreur ? <div className="tool-card"><p className="notif-erreur" role="alert" data-compta-erreur>{rapport.erreur}</p></div> : null}

      {rapport && !rapport.erreur ? (
        <div className="tool-card" data-compta-nettoyage>
          <h2>Ce que Presti a nettoyé{nomFichier ? ` — ${nomFichier}` : ''}</h2>
          <ul className="dir-controles">
            <li><span>Lignes lues</span><span /><b data-lues>{rapport.lignesLues}</b></li>
            <li><span>Lignes retenues</span><span /><b data-retenues>{rapport.lignes.length}</b></li>
            <li><span>Doublons exacts retirés</span><span /><b data-doublons>{rapport.doublons}</b></li>
            <li><span>Lignes rejetées</span><span /><b data-rejetees>{rapport.rejets.length}</b></li>
          </ul>
          <p className="muted" style={{ margin: '.6rem 0' }}>
            Colonnes reconnues : {rapport.colonnes.map((c) => (c.champ ? `${c.entete} → ${c.champ}` : `${c.entete} (ignorée)`)).join(' · ')}
            {rapport.sensImpose ? ` · sans colonne « Type » : toutes les lignes sont des ${sensDefaut === 'recette' ? 'recettes' : 'dépenses'}.` : ''}
          </p>
          {rapport.rejets.length > 0 ? (
            <ul className="sess" data-rejets>
              {rapport.rejets.map((r) => <li key={r.ligne}><span className="sess-txt"><b>Ligne {r.ligne}</b><small>{r.raison}</small></span></li>)}
            </ul>
          ) : null}
        </div>
      ) : null}

      {tableaux ? (
        <>
          <div className="tool-card" data-compta-kpi>
            <h2>Vue d’ensemble{tableaux.periode.debut ? ` · du ${tableaux.periode.debut} au ${tableaux.periode.fin}` : ''}</h2>
            <ul className="dir-controles">
              <li><span>Recettes</span><span /><b data-recettes>{formatEuros(tableaux.recettes)}</b></li>
              <li><span>Dépenses</span><span /><b data-depenses>{formatEuros(tableaux.depenses)}</b></li>
              <li><span>Bénéfice</span><span /><b data-benefice>{formatEuros(tableaux.benefice)}</b></li>
              <li><span>Marge</span><span /><b>{tableaux.marge === null ? '—' : `${String(tableaux.marge).replace('.', ',')} %`}</b></li>
              <li><span>Factures impayées</span><span /><b data-impayes>{tableaux.impayes.nombre} · {formatEuros(tableaux.impayes.montant)}</b></li>
            </ul>
            <p className="muted" style={{ margin: '.6rem 0 0' }}>{tableaux.tva.mention}</p>
            <div className="dir-ligne-actions" style={{ marginTop: '.8rem' }}>
              <button type="button" className="btn btn--ghost" onClick={exporter} data-exporter>Exporter les tableaux (CSV)</button>
            </div>
          </div>

          <div className="tool-card" data-compta-depenses>
            <h2>Dépenses par catégorie</h2>
            <div className="psh-tablewrap dir-table">
              <table className="psh-dtable">
                <thead><tr><th>Catégorie</th><th>Montant</th><th>Part</th></tr></thead>
                <tbody>
                  {tableaux.depensesParCategorie.length === 0 ? <tr><td colSpan={3} className="muted">Aucune dépense.</td></tr>
                    : tableaux.depensesParCategorie.map((c) => (
                      <tr key={c.categorie}><td data-lab="Catégorie">{c.categorie}</td><td data-lab="Montant">{formatEuros(c.montant)}</td><td data-lab="Part">{c.part === null ? '—' : `${String(c.part).replace('.', ',')} %`}</td></tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="tool-card" data-compta-clients>
            <h2>Recettes par source et meilleurs clients</h2>
            <div className="psh-tablewrap dir-table">
              <table className="psh-dtable">
                <thead><tr><th>Source</th><th>Factures</th><th>Montant</th></tr></thead>
                <tbody>
                  {tableaux.sourcesClients.length === 0 ? <tr><td colSpan={3} className="muted">Aucune recette.</td></tr>
                    : tableaux.sourcesClients.map((s) => (
                      <tr key={s.source}><td data-lab="Source">{s.source}</td><td data-lab="Factures">{s.nombre}</td><td data-lab="Montant">{formatEuros(s.montant)}</td></tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div className="psh-tablewrap dir-table" style={{ marginTop: '.8rem' }}>
              <table className="psh-dtable">
                <thead><tr><th>Client</th><th>Encaissé</th></tr></thead>
                <tbody>
                  {tableaux.meilleursClients.map((c) => (
                    <tr key={c.tiers}><td data-lab="Client">{c.tiers}</td><td data-lab="Encaissé">{formatEuros(c.montant)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="tool-card" data-compta-mois>
            <h2>Par mois</h2>
            <div className="psh-tablewrap dir-table">
              <table className="psh-dtable">
                <thead><tr><th>Mois</th><th>Recettes</th><th>Dépenses</th><th>Bénéfice</th></tr></thead>
                <tbody>
                  {tableaux.parMois.map((m) => (
                    <tr key={m.mois}><td data-lab="Mois">{m.mois}</td><td data-lab="Recettes">{formatEuros(m.recettes)}</td><td data-lab="Dépenses">{formatEuros(m.depenses)}</td><td data-lab="Bénéfice">{formatEuros(m.benefice)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </section>
  )
}
