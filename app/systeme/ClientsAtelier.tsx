'use client'
import { useRef, useState } from 'react'
import Link from 'next/link'
import Coque, { Lecture } from './Coque'
import { PanneauQuestion } from './Cartes'
import { cleEmail, cleNom } from '@/lib/crm/clients'
import { dateFr, dateHeureFr, eur, useLecture } from './donnees'

type ClientL = { id: string; nom: string | null; email: string | null; demandes: number; devis: number; factures: number; chantiers: number; derniere: string | null }
type Donnees = {
  signature: boolean; offre: 'studio' | 'signature'; nom: string | null; metier: string | null; lu_le: string; tronque: boolean
  signeMois: { nombre: number; montant: number } | null; devisEnAttente: { nombre: number; montant: number } | null; aEncaisser: { montant: number; dossiers: number } | null
  clientsActifs: number; clients: ClientL[]
  chantiers: { id: string; titre: string; client: string | null; statut: string; date_debut: string | null }[]
}

// Le CRM « atelier » (maquette crm-atelier.html) : il LIT les fonctions existantes de lib/crm/ (par /api/systeme/clients) et ne modifie rien ;
// app/crm reste tel quel (l'atelier 3D est relié par un lien). Les onglets pointent vers les vues existantes.
const ONGLETS = [['atelier', 'Atelier'], ['tableau', 'Tableau de bord'], ['pipeline', 'Suivi des devis'], ['chantiers', 'Chantiers'], ['clients', 'Clients'], ['planning', 'Planning'], ['equipe', 'Équipe & véhicules']] as const

/** Lire, aperçu, valider : l'aperçu se fait dans le navigateur, sur le fichier choisi, contre les fiches déjà là. Rien n'est écrit. */
type LigneImport = { nom: string; email: string | null; statut: 'nouvelle' | 'fusion' | 'verifier' | 'doublon'; raison?: string }
function lireFichier(texte: string, existants: ClientL[]): LigneImport[] {
  const sep = texte.split('\n')[0]!.includes(';') ? ';' : texte.split('\n')[0]!.includes('\t') ? '\t' : ','
  const lignes = texte.split(/\r?\n/).filter((l) => l.trim()).map((l) => l.split(sep).map((c) => c.replace(/^"|"$/g, '').trim()))
  const [entete, ...corps] = lignes
  if (!entete) return []
  const idx = (re: RegExp) => entete.findIndex((h) => re.test(h.toLowerCase()))
  const iNom = idx(/nom|client/), iMail = idx(/mail/)
  const parNom = new Set(existants.map((c) => cleNom(c.nom)).filter(Boolean)), parMail = new Set(existants.map((c) => cleEmail(c.email)).filter(Boolean))
  const vus = new Set<string>(); const sortie: LigneImport[] = []
  for (const l of corps) {
    const nom = iNom >= 0 ? l[iNom] ?? '' : '', email = iMail >= 0 ? l[iMail] || null : null
    const cle = `${cleNom(nom) ?? ''}|${cleEmail(email) ?? ''}`
    if (!nom) { sortie.push({ nom: '(sans nom)', email, statut: 'verifier', raison: 'nom absent' }); continue }
    if (vus.has(cle)) { sortie.push({ nom, email, statut: 'doublon', raison: 'doublon dans le fichier' }); continue }
    vus.add(cle)
    const connu = (email && parMail.has(cleEmail(email))) || parNom.has(cleNom(nom))
    sortie.push({ nom, email, statut: connu ? 'fusion' : 'nouvelle' })
  }
  return sortie
}

function Import({ existants }: { existants: ClientL[] }) {
  const [fichier, setFichier] = useState<{ nom: string; lignes: LigneImport[] } | null>(null)
  const entree = useRef<HTMLInputElement>(null)
  const n = (s: LigneImport['statut']) => fichier?.lignes.filter((l) => l.statut === s).length ?? 0
  async function choisir(f: File | undefined) { if (!f) return; setFichier({ nom: f.name, lignes: lireFichier(await f.text(), existants) }) }
  return (
    <section className="carte import" data-import aria-labelledby="titre-import">
      <div className="section-tete" style={{ marginBottom: 0 }}><h2 id="titre-import">Importer votre ancien fichier clients</h2><p>Rien n’est écrit avant votre validation.</p></div>
      <ol className="etapes">
        <li className={fichier ? 'fini' : ''} aria-current={fichier ? undefined : 'step'} data-etape="lire"><span className="rond">1</span>Lire{fichier ? ` · ${fichier.nom}, ${fichier.lignes.length} lignes` : ''}{fichier ? <span className="sr"> (terminée)</span> : null}</li>
        <li aria-current={fichier ? 'step' : undefined} data-etape="apercu"><span className="rond">2</span>Vérifier l’aperçu</li>
        <li data-etape="valider"><span className="rond">3</span>Valider l’import</li>
      </ol>
      <button type="button" className="btn petit" onClick={() => entree.current?.click()}>Choisir un fichier (.csv)</button>
      <input ref={entree} type="file" accept=".csv,text/csv" hidden onChange={(e) => choisir(e.target.files?.[0])} />
      {fichier ? (<>
        <div className="table-defile" tabIndex={0} role="region" aria-label="Aperçu de l’import"><table className="apercu-table">
          <thead><tr><th scope="col">Client</th><th scope="col">E-mail</th><th scope="col">Ce qui sera fait</th></tr></thead>
          <tbody>{fichier.lignes.slice(0, 8).map((l, i) => <tr key={i}><td>{l.nom}</td><td>{l.email ?? ''}</td><td><span className={`etat ${l.statut === 'nouvelle' ? 'ok' : l.statut === 'verifier' ? 'attente' : 'neutre'}`}>{l.statut === 'nouvelle' ? 'nouvelle fiche' : l.statut === 'fusion' ? 'fusionné avec sa fiche' : l.statut === 'doublon' ? 'ignoré : doublon' : `à vérifier : ${l.raison}`}</span></td></tr>)}</tbody>
        </table></div>
        <div className="bilan"><span className="etat ok">{n('nouvelle')} nouvelles fiches</span><span className="etat neutre">{n('fusion')} fusionnées</span><span className="etat attente">{n('verifier')} à vérifier</span><span className="etat neutre">{n('doublon')} doublons ignorés</span></div>
        <p className="source">Chaque chiffre importé portera « lu dans {fichier.nom} le {dateFr(new Date().toISOString())} ». Une ligne à vérifier n’entre pas tant que vous ne l’avez pas corrigée.</p>
        <div className="import-fin">
          <button type="button" className="feu" disabled aria-disabled="true">Valider l’import ({n('nouvelle') + n('fusion')} fiches)</button>
          <Link className="btn petit" href="/crm?vue=clients" data-manuel>Saisir les clients moi-même</Link>
          <button type="button" className="btn petit discret" onClick={() => setFichier(null)}>Annuler</button>
        </div>
        <p className="fait">fait : <b>fichier lu dans votre navigateur</b> · rien n’a été envoyé ni écrit · l’écriture passera par le circuit contrôlé, pas encore ouvert</p>
      </>) : null}
    </section>
  )
}

export default function ClientsAtelier() {
  const { lecture } = useLecture<Donnees>('clients')
  const d = lecture.etat === 'ok' ? lecture.donnees : null
  const questions = (d?.chantiers ?? []).filter((c) => !c.date_debut).map((c) => ({ id: c.id, texte: `Chantier ${c.client ?? c.titre} : quelle est la date de début ?`, href: '/crm?vue=chantiers' }))
  const lu = d ? dateHeureFr(d.lu_le) : ''
  return (
    <Coque ecran="clients" signature={d?.signature} nom={d?.nom} metier={d?.metier}>
      {lecture.etat !== 'ok' ? <Lecture etat={lecture.etat} message={lecture.etat === 'erreur' ? lecture.message : undefined} /> : (<>
        <div className="tete">
          <div><h1>Clients et chantiers</h1><p className="sous">Votre atelier, vos clients et vos chantiers, au même endroit qu’avant. Vos assistants tiennent tout à jour et vous posent leurs questions une par une.</p></div>
          <div className="droite"><Link className="btn plein" href="/crm?vue=clients">Nouveau client</Link></div>
        </div>
        <nav className="onglets-crm" data-onglets-crm aria-label="Vues du CRM">
          {ONGLETS.map(([k, l]) => <Link key={k} href={`/crm?vue=${k}`} {...(k === 'clients' ? { 'aria-current': 'page' as const } : {})}>{l}</Link>)}
        </nav>
        <div className="grille">
          <div>
            <section className="chiffres entre" aria-label="Indicateurs">
              {d!.signeMois ? <div className="carte chiffre" data-chiffre data-source="devis"><h3>Signé ce mois-ci</h3><span className="gros">{eur(d!.signeMois.montant)}</span><span className="source">lu dans <b>vos devis signés</b> le {lu}</span></div> : null}
              {d!.devisEnAttente ? <div className="carte chiffre" data-chiffre data-source="devis"><h3>Devis sans réponse</h3><span className="gros">{eur(d!.devisEnAttente.montant)}</span><span className="source">lu dans <b>vos devis</b> le {lu}</span></div> : null}
              <div className="carte chiffre" data-chiffre data-source="fiches"><h3>Clients</h3><span className="gros">{d!.clientsActifs}{d!.tronque ? '+' : ''}</span><span className="source">lu dans <b>vos fiches clients</b> le {dateFr(d!.lu_le)}</span></div>
              {d!.aEncaisser ? <div className="carte chiffre" data-chiffre data-source="factures"><h3>Reste à encaisser</h3><span className="gros">{eur(d!.aEncaisser.montant)}</span><span className="source">lu dans <b>vos factures</b> le {lu}</span></div> : null}
            </section>

            <figure className="carte atelier">
              <svg viewBox="0 0 900 250" role="img" aria-label={`Schéma de la vue atelier : l’atelier, le dépôt et vos chantiers en cours${d!.chantiers.length ? ` (${d!.chantiers.slice(0, 3).map((c) => c.client ?? c.titre).join(', ')})` : ''}`}>
                <rect width="900" height="250" fill="var(--noir-2)" />
                <g fill="none" stroke="var(--ivoire-2)" strokeWidth="1.5"><path d="M90 170l90-45 90 45-90 45z" /><path d="M90 170v-50l90-45 90 45v50" /><path d="M180 75v50" /></g>
                <text x="180" y="236" fill="var(--ivoire-2)" fontSize="14" textAnchor="middle">Atelier et dépôt</text>
                {d!.chantiers.slice(0, 3).map((c, i) => (
                  <g key={c.id}><g fill="none" strokeWidth="1.5" stroke={['var(--accent)', 'var(--ivoire-2)', 'var(--gris-chaud)'][i]}><path d={`M${430 + i * 150} 150l50-25 50 25-50 25z M${430 + i * 150} 150v-30l50-25 50 25v30`} /></g>
                    <text x={480 + i * 150} y="200" fill="var(--encre)" fontSize="13" textAnchor="middle">{(c.client ?? c.titre).slice(0, 22)}</text></g>
                ))}
              </svg>
              <figcaption>La vue atelier en 3D reste la même : vos chantiers en cours, l’équipe, le stock. Ici, son schéma.<Link className="btn petit" href="/crm?vue=atelier">Ouvrir l’atelier</Link></figcaption>
            </figure>

            <section className="carte fiche" aria-labelledby="fiche-liste">
              <div className="fiche-tete"><div><h2 id="fiche-liste">Vos fiches clients</h2><p>Les {Math.min(12, d!.clients.length)} plus récentes, lues dans vos devis, factures et chantiers.</p></div></div>
              {d!.clients.length ? (
                <ul className="historique" aria-label="Fiches clients">
                  {d!.clients.slice(0, 12).map((c) => (
                    <li key={c.id} data-action="fiche-client" data-statut="fait"><time dateTime={c.derniere ?? undefined}>{c.derniere ? dateFr(c.derniere) : '—'}</time>
                      <div><p className="quoi"><Link href={`/crm/clients/${encodeURIComponent(c.id)}`}>{c.nom ?? 'Client sans nom'}</Link></p>
                        <p className="fait">fait : <b>fiche tenue à jour</b> · {c.devis} devis, {c.factures} facture{c.factures > 1 ? 's' : ''}, {c.chantiers} chantier{c.chantiers > 1 ? 's' : ''} rattachés</p></div></li>
                  ))}
                </ul>
              ) : <p className="vide">Aucune fiche pour l’instant. Elles se créent avec votre première demande, devis ou facture.</p>}
            </section>
            <Import existants={d!.clients} />
          </div>
          <aside className="panneau carte" data-panneau-questions aria-label="Les questions de votre assistant"><PanneauQuestion questions={questions} /></aside>
        </div>
      </>)}
    </Coque>
  )
}
