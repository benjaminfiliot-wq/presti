'use client'

// Le générateur de devis gratuit de prestiapp.fr (27/10/2026) : utile sans compte, rien n'est envoyé à un serveur.
//  • Les saisies restent dans le navigateur (localStorage, enveloppé de try/catch : navigation privée ou stockage bloqué ⇒ la page
//    marche quand même, elle oublie seulement au rechargement).
//  • Le PDF est celui du navigateur (window.print → « Enregistrer au format PDF ») : la feuille est la seule chose imprimée
//    (règles @media print de app/ressources.css).
//  • Les mentions vérifiées en direct sont celles de lib/seoDevis.ts (MENTIONS_DEVIS), chacune avec son texte officiel.
//  • Aucun prix n'est proposé : un modèle de métier (?metier=plombier) remplit les lignes, jamais les montants.

import { useEffect, useMemo, useState } from 'react'
import { MENTIONS_DEVIS, SOURCES, metierParSlug } from '@/lib/seoDevis'

type Ligne = { id: string; designation: string; unite: string; qte: string; pu: string; tva: string }
type Etat = {
  numero: string; date: string; validite: string
  entNom: string; entForme: string; entAdresse: string; entSiret: string; entContact: string; entTvaIntra: string
  franchise: boolean
  assureur: string; assuranceContrat: string; assuranceZone: string
  clientNom: string; clientAdresse: string; lieu: string; nature: string
  lignes: Ligne[]
  tauxHoraire: string; decompte: string; deplacement: string
  gratuit: 'gratuit' | 'payant'; coutDevis: string
  dechets: string; pieces: boolean; conditions: string
}

const CLE = 'presti-generateur-devis-v1'
const TAUX = ['20', '10', '5.5', '0']
const nouvelId = () => Math.random().toString(36).slice(2, 10)
const ligneVide = (): Ligne => ({ id: nouvelId(), designation: '', unite: 'u', qte: '1', pu: '', tva: '20' })
/** La date du jour, à l'heure du visiteur (toISOString donnerait la veille entre minuit et 1 h ou 2 h à Paris). */
const aujourdHui = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// `jour` vide au premier rendu : la page est pré-rendue au build, une date posée là ne serait pas celle du visiteur (écart
// d'hydratation). Le jour et l'année se posent au montage.
const ETAT_VIDE = (jour = ''): Etat => ({
  numero: jour ? `D-${jour.slice(0, 4)}-001` : '', date: jour, validite: '30',
  entNom: '', entForme: '', entAdresse: '', entSiret: '', entContact: '', entTvaIntra: '',
  franchise: false,
  assureur: '', assuranceContrat: '', assuranceZone: '',
  clientNom: '', clientAdresse: '', lieu: '', nature: '',
  lignes: [ligneVide(), ligneVide(), ligneVide()],
  tauxHoraire: '', decompte: '', deplacement: '',
  gratuit: 'gratuit', coutDevis: '',
  dechets: '', pieces: true, conditions: '',
})

/** « 12,5 » ou « 12.5 » → 12.5 ; vide ou illisible → 0. */
const nombre = (v: string): number => {
  const n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}
const euros = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n)
const tauxTexte = (t: string) => `${String(t).replace('.', ',')} %`
const dateFr = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

type Statut = 'ok' | 'manque' | 'option'

export default function Generateur() {
  const [e, setE] = useState<Etat>(() => ETAT_VIDE())
  const [pret, setPret] = useState(false)

  // Au montage : ce qui a été saisi avant (si le navigateur le permet), puis le modèle de métier demandé par l'adresse.
  useEffect(() => {
    let base = ETAT_VIDE(aujourdHui())
    try {
      const brut = window.localStorage.getItem(CLE)
      if (brut) base = { ...base, ...(JSON.parse(brut) as Partial<Etat>) }
    } catch { /* stockage indisponible : on repart d'un devis vide */ }
    try {
      const slug = new URLSearchParams(window.location.search).get('metier')
      const m = slug ? metierParSlug(slug) : undefined
      if (m) {
        base = {
          ...base,
          nature: m.nature,
          lignes: m.lignes.map((l) => ({ id: nouvelId(), designation: l.designation, unite: l.unite, qte: String(l.qte), pu: '', tva: '20' })),
        }
        // Le modèle est appliqué UNE fois : sans cela, recharger la page remplacerait les prix saisis par les lignes vides du modèle.
        window.history.replaceState(null, '', window.location.pathname)
      }
    } catch { /* adresse illisible : rien à pré-remplir */ }
    setE(base)
    setPret(true)
  }, [])

  useEffect(() => {
    if (!pret) return
    try { window.localStorage.setItem(CLE, JSON.stringify(e)) } catch { /* rien : la page marche sans */ }
  }, [e, pret])

  const maj = <K extends keyof Etat>(k: K, v: Etat[K]) => setE((p) => ({ ...p, [k]: v }))
  const majLigne = (id: string, k: keyof Ligne, v: string) =>
    setE((p) => ({ ...p, lignes: p.lignes.map((l) => (l.id === id ? { ...l, [k]: v } : l)) }))
  const ajouterLigne = () => setE((p) => ({ ...p, lignes: [...p.lignes, ligneVide()] }))
  const retirerLigne = (id: string) => setE((p) => ({ ...p, lignes: p.lignes.length > 1 ? p.lignes.filter((l) => l.id !== id) : p.lignes }))
  const toutEffacer = () => {
    if (!window.confirm('Effacer tout le devis ?')) return
    setE(ETAT_VIDE(aujourdHui()))
  }

  // Les lignes réellement chiffrées, et les totaux par taux de TVA.
  const lignesPleines = e.lignes.filter((l) => l.designation.trim())
  const calcul = useMemo(() => {
    const parTaux = new Map<string, number>()
    let ht = 0
    for (const l of e.lignes) {
      if (!l.designation.trim()) continue
      const total = nombre(l.qte) * nombre(l.pu)
      ht += total
      const t = e.franchise ? '0' : l.tva
      parTaux.set(t, (parTaux.get(t) ?? 0) + total)
    }
    const tva = [...parTaux.entries()].filter(([t]) => nombre(t) > 0).map(([t, base]) => ({ taux: t, base, montant: Math.round(base * nombre(t)) / 100 }))
    const totalTva = tva.reduce((s, x) => s + x.montant, 0)
    return { ht, tva, ttc: ht + totalTva }
  }, [e.lignes, e.franchise])

  const lignesChiffrees = lignesPleines.length > 0 && lignesPleines.every((l) => nombre(l.qte) > 0 && nombre(l.pu) > 0)
  const statuts: Record<string, Statut> = {
    date: e.date ? 'ok' : 'manque',
    entreprise: e.entNom.trim() && e.entAdresse.trim() ? 'ok' : 'manque',
    siret: e.entSiret.trim() ? 'ok' : 'manque',
    assurance: e.assureur.trim() && e.assuranceZone.trim() ? 'ok' : 'option',
    client: e.clientNom.trim() ? 'ok' : 'manque',
    lieu: e.lieu.trim() || e.clientAdresse.trim() ? 'ok' : 'manque',
    nature: e.nature.trim() ? 'ok' : 'manque',
    lignes: lignesChiffrees ? 'ok' : 'manque',
    tauxHoraire: e.tauxHoraire.trim() && e.decompte.trim() ? 'ok' : 'manque',
    deplacement: e.deplacement.trim() ? 'ok' : 'option',
    totaux: lignesChiffrees ? 'ok' : 'manque',
    validite: nombre(e.validite) > 0 ? 'ok' : 'manque',
    gratuit: e.gratuit === 'gratuit' || nombre(e.coutDevis) > 0 ? 'ok' : 'manque',
    dechets: e.dechets.trim() ? 'ok' : 'manque',
    pieces: e.pieces ? 'ok' : 'option',
  }
  const nbOk = MENTIONS_DEVIS.filter((m) => statuts[m.cle] === 'ok').length

  const champ = (id: string, label: string, k: keyof Etat, opts: { placeholder?: string; type?: string; aide?: string; multi?: boolean } = {}) => (
    <label className="dv-champ" htmlFor={`dv-${id}`}>
      <span>{label}</span>
      {opts.multi
        ? <textarea id={`dv-${id}`} rows={2} value={String(e[k] ?? '')} placeholder={opts.placeholder} onChange={(ev) => maj(k, ev.target.value as never)} />
        : <input id={`dv-${id}`} type={opts.type ?? 'text'} value={String(e[k] ?? '')} placeholder={opts.placeholder} onChange={(ev) => maj(k, ev.target.value as never)} />}
      {opts.aide ? <small>{opts.aide}</small> : null}
    </label>
  )

  return (
    <div className="dv-grille">
      {/* ── Le formulaire ─────────────────────────────────────────── */}
      <form className="dv-form res-noprint" onSubmit={(ev) => ev.preventDefault()} aria-label="Saisie du devis">
        <fieldset>
          <legend>Votre entreprise</legend>
          {champ('ent-nom', 'Nom ou dénomination', 'entNom', { placeholder: 'Ex. : Durand Plomberie' })}
          {champ('ent-forme', 'Forme juridique', 'entForme', { placeholder: 'Ex. : entreprise individuelle, SARL, SAS…' })}
          {champ('ent-adresse', 'Adresse', 'entAdresse', { multi: true })}
          <div className="dv-duo">
            {champ('ent-siret', 'SIRET', 'entSiret', { placeholder: '14 chiffres' })}
            {champ('ent-tva', 'N° de TVA intracommunautaire', 'entTvaIntra', { aide: 'Si vous en avez un.' })}
          </div>
          {champ('ent-contact', 'Téléphone et e-mail', 'entContact')}
          <label className="dv-coche">
            <input type="checkbox" checked={e.franchise} onChange={(ev) => maj('franchise', ev.target.checked)} />
            <span>Je suis en franchise en base de TVA (micro-entreprise) : le devis porte « TVA non applicable, article 293 B du CGI ».</span>
          </label>
        </fieldset>

        <fieldset>
          <legend>Assurance décennale</legend>
          <p className="dv-note">Obligatoire sur le devis lorsque vos travaux relèvent de la garantie décennale.</p>
          {champ('ass-nom', 'Assureur et ses coordonnées', 'assureur')}
          <div className="dv-duo">
            {champ('ass-contrat', 'N° de contrat', 'assuranceContrat')}
            {champ('ass-zone', 'Zone géographique couverte', 'assuranceZone', { placeholder: 'Ex. : France métropolitaine' })}
          </div>
        </fieldset>

        <fieldset>
          <legend>Le client et le chantier</legend>
          {champ('cl-nom', 'Nom du client', 'clientNom')}
          {champ('cl-adresse', 'Adresse du client', 'clientAdresse', { multi: true })}
          {champ('lieu', 'Lieu d’exécution', 'lieu', { aide: 'Laissez vide si c’est l’adresse du client.' })}
          {champ('nature', 'Nature exacte des travaux', 'nature', { multi: true, placeholder: 'Ce que vous allez faire, en une ou deux phrases.' })}
        </fieldset>

        <fieldset>
          <legend>Le décompte</legend>
          <div className="dv-lignes" role="list">
            {e.lignes.map((l, i) => (
              <div className="dv-ligne" role="listitem" key={l.id}>
                <label className="dv-l-des"><span>Ligne {i + 1} · désignation</span>
                  <input value={l.designation} onChange={(ev) => majLigne(l.id, 'designation', ev.target.value)} placeholder="Prestation ou produit" />
                </label>
                <label><span>Qté</span><input inputMode="decimal" value={l.qte} onChange={(ev) => majLigne(l.id, 'qte', ev.target.value)} /></label>
                <label><span>Unité</span><input value={l.unite} onChange={(ev) => majLigne(l.id, 'unite', ev.target.value)} placeholder="u, h, m², ml…" /></label>
                <label><span>PU HT (€)</span><input inputMode="decimal" value={l.pu} onChange={(ev) => majLigne(l.id, 'pu', ev.target.value)} placeholder="à chiffrer" /></label>
                {e.franchise ? null : (
                  <label><span>TVA</span>
                    <select value={l.tva} onChange={(ev) => majLigne(l.id, 'tva', ev.target.value)}>
                      {TAUX.map((t) => <option key={t} value={t}>{tauxTexte(t)}</option>)}
                    </select>
                  </label>
                )}
                <button type="button" className="dv-moins" onClick={() => retirerLigne(l.id)} aria-label={`Retirer la ligne ${i + 1}`} disabled={e.lignes.length <= 1}>×</button>
              </div>
            ))}
          </div>
          <button type="button" className="lp-btn lp-btn--g dv-plus" onClick={ajouterLigne}>Ajouter une ligne</button>
          <div className="dv-duo">
            {champ('taux-h', 'Taux horaire de main-d’œuvre TTC', 'tauxHoraire', { placeholder: 'Ex. : 00,00 € TTC de l’heure' })}
            {champ('deplacement', 'Frais de déplacement', 'deplacement', { aide: 'S’il y en a.' })}
          </div>
          {champ('decompte', 'Modalités de décompte du temps', 'decompte', { placeholder: 'Comment le temps passé sera compté.' })}
          {champ('dechets', 'Enlèvement et gestion des déchets', 'dechets', { multi: true, placeholder: 'Comment les déchets sont enlevés et traités, et leur coût.' })}
        </fieldset>

        <fieldset>
          <legend>Le devis</legend>
          <div className="dv-trio">
            {champ('numero', 'Numéro', 'numero')}
            {champ('date', 'Date', 'date', { type: 'date' })}
            {champ('validite', 'Validité (jours)', 'validite', { type: 'number' })}
          </div>
          <div className="dv-duo">
            <label className="dv-champ" htmlFor="dv-gratuit"><span>Ce devis est</span>
              <select id="dv-gratuit" value={e.gratuit} onChange={(ev) => maj('gratuit', ev.target.value as Etat['gratuit'])}>
                <option value="gratuit">gratuit</option><option value="payant">payant</option>
              </select>
            </label>
            {e.gratuit === 'payant' ? champ('cout', 'Coût du devis (€ TTC)', 'coutDevis') : <span />}
          </div>
          {champ('conditions', 'Conditions de paiement', 'conditions', { multi: true, placeholder: 'Acompte, échéances, moyens de paiement.' })}
          <label className="dv-coche">
            <input type="checkbox" checked={e.pieces} onChange={(ev) => maj('pieces', ev.target.checked)} />
            <span>Informer le client qu’il peut conserver les pièces remplacées (dépannage, réparation, entretien).</span>
          </label>
        </fieldset>

        <div className="dv-actions">
          <button type="button" className="lp-btn lp-btn--p" onClick={() => window.print()}>Télécharger en PDF</button>
          <button type="button" className="lp-btn lp-btn--g" onClick={toutEffacer}>Tout effacer</button>
        </div>
        <p className="dv-note">Dans la fenêtre d’impression, choisissez « Enregistrer au format PDF ». Vos saisies restent dans ce navigateur : rien n’est envoyé.</p>
      </form>

      {/* ── La feuille, et les mentions vérifiées ─────────────────── */}
      <div className="dv-droite">
        <section className="dv-verif res-noprint" aria-label="Mentions obligatoires">
          <p className="dv-score"><b>{nbOk}</b> mentions sur {MENTIONS_DEVIS.length}</p>
          <ul>
            {MENTIONS_DEVIS.map((m) => {
              const s = statuts[m.cle] ?? 'manque'
              return (
                <li key={m.cle} className={`dv-m dv-m--${s}`}>
                  <i aria-hidden="true" />
                  <span>{m.label}{m.condition ? <em> ({m.condition})</em> : null}</span>
                  <span className="sr-only">{s === 'ok' ? ' : présente' : s === 'option' ? ' : à vérifier' : ' : manquante'}</span>
                </li>
              )
            })}
          </ul>
          <p className="dv-note">Liste tirée de la fiche <a href={SOURCES.servicePublicBatiment.url} target="_blank" rel="noopener noreferrer">service-public.fr</a>. Elle ne remplace pas la vérification de votre situation.</p>
        </section>

        <article className="dv-papier" aria-label="Aperçu du devis">
          <header className="dv-p-tete">
            <div className="dv-p-ent">
              <b>{e.entNom || 'Votre entreprise'}</b>
              {e.entForme ? <span>{e.entForme}</span> : null}
              {e.entAdresse ? <span className="dv-pre">{e.entAdresse}</span> : null}
              {e.entSiret ? <span>SIRET : {e.entSiret}</span> : null}
              {e.entTvaIntra && !e.franchise ? <span>TVA intracommunautaire : {e.entTvaIntra}</span> : null}
              {e.entContact ? <span>{e.entContact}</span> : null}
            </div>
            <div className="dv-p-doc">
              <h2>Devis</h2>
              <span>N° {e.numero}</span>
              <span>Établi le {dateFr(e.date)}</span>
              {nombre(e.validite) > 0 ? <span>Valable {nombre(e.validite)} jours</span> : null}
              <span>Devis {e.gratuit}{e.gratuit === 'payant' && nombre(e.coutDevis) > 0 ? ` : ${euros(nombre(e.coutDevis))} TTC` : ''}</span>
            </div>
          </header>

          <div className="dv-p-client">
            <div><small>Client</small><b>{e.clientNom || 'Nom du client'}</b>{e.clientAdresse ? <span className="dv-pre">{e.clientAdresse}</span> : null}</div>
            <div><small>Lieu d’exécution</small><span className="dv-pre">{e.lieu || e.clientAdresse || '—'}</span></div>
          </div>

          {e.nature ? <p className="dv-p-nature"><small>Nature des travaux</small>{e.nature}</p> : null}

          <table className="dv-p-table">
            <thead>
              <tr><th scope="col">Désignation</th><th scope="col">Qté</th><th scope="col">Unité</th><th scope="col">PU HT</th>{e.franchise ? null : <th scope="col">TVA</th>}<th scope="col">Total HT</th></tr>
            </thead>
            <tbody>
              {lignesPleines.length === 0 ? (
                <tr><td colSpan={e.franchise ? 5 : 6} className="dv-vide">Ajoutez vos lignes à gauche.</td></tr>
              ) : lignesPleines.map((l) => (
                <tr key={l.id}>
                  <td>{l.designation}</td>
                  <td>{String(nombre(l.qte)).replace('.', ',')}</td>
                  <td>{l.unite}</td>
                  <td>{nombre(l.pu) > 0 ? euros(nombre(l.pu)) : 'à chiffrer'}</td>
                  {e.franchise ? null : <td>{tauxTexte(l.tva)}</td>}
                  <td>{euros(nombre(l.qte) * nombre(l.pu))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="dv-p-totaux">
            <div><span>Total HT</span><b>{euros(calcul.ht)}</b></div>
            {e.franchise ? (
              <p className="dv-p-mention">TVA non applicable, article 293 B du CGI</p>
            ) : calcul.tva.map((t) => (
              <div key={t.taux}><span>TVA {tauxTexte(t.taux)} sur {euros(t.base)}</span><b>{euros(t.montant)}</b></div>
            ))}
            <div className="dv-p-ttc"><span>{e.franchise ? 'Net à payer' : 'Total TTC'}</span><b>{euros(e.franchise ? calcul.ht : calcul.ttc)}</b></div>
          </div>

          <dl className="dv-p-conditions">
            {e.tauxHoraire ? <><dt>Taux horaire de main-d’œuvre</dt><dd>{e.tauxHoraire}</dd></> : null}
            {e.decompte ? <><dt>Décompte du temps</dt><dd>{e.decompte}</dd></> : null}
            {e.deplacement ? <><dt>Frais de déplacement</dt><dd>{e.deplacement}</dd></> : null}
            {e.dechets ? <><dt>Déchets du chantier</dt><dd>{e.dechets}</dd></> : null}
            {e.conditions ? <><dt>Conditions de paiement</dt><dd className="dv-pre">{e.conditions}</dd></> : null}
            {e.assureur ? <><dt>Assurance décennale</dt><dd>{[e.assureur, e.assuranceContrat ? `contrat n° ${e.assuranceContrat}` : '', e.assuranceZone ? `zone couverte : ${e.assuranceZone}` : ''].filter(Boolean).join(', ')}</dd></> : null}
          </dl>
          {e.pieces ? <p className="dv-p-mention">Vous pouvez conserver les pièces, éléments ou appareils remplacés.</p> : null}

          <footer className="dv-p-accord">
            <div>
              <b>Bon pour accord</b>
              <span>Date, signature du client, précédées de la mention « Devis reçu avant l’exécution des travaux ».</span>
            </div>
            <i aria-hidden="true" />
          </footer>
        </article>
      </div>
    </div>
  )
}
