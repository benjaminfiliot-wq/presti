'use client'

// La fiche d'un devis PARTI (envoyé, accepté, refusé, expiré) en LECTURE — console v2 (refonte 18/10, étape 5.4 ;
// ARCHITECTURE.md §2.4). Audit 18/10, défaut 5 : un devis envoyé restait un formulaire, avec « Chiffrer avec l'IA » et
// « Tout effacer & recommencer ». Ici : ce qui est parti chez le client, tel quel, et les gestes qui ont un sens à ce stade.
// L'éditeur reste à un clic (« Modifier ») : la logique métier et les routes ne changent pas.
import '@/components/ui/ui.css'
import './fiche-lecture.css'
import { Statut } from '@/components/ui/base'

type Ligne = { designation: string; quantite: string; unite: string; prix_unitaire_ht: string; tva_taux: number }
type Totaux = { total_ht: number; total_tva: number; total_ttc: number }

const eur = (n: number) => `${(Number.isFinite(n) ? n : 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
const STATUTS: Record<string, { libelle: string; ton: 'neutre' | 'accent' | 'warn' | 'ok' | 'crit' }> = {
  envoye: { libelle: 'Envoyé', ton: 'accent' }, accepte: { libelle: 'Accepté', ton: 'ok' }, refuse: { libelle: 'Refusé', ton: 'crit' }, expire: { libelle: 'Expiré', ton: 'neutre' }, brouillon: { libelle: 'Brouillon', ton: 'neutre' },
}
// Une date seule (date_emission) s'affiche sans heure ; un horodatage avec l'heure.
const quand = (iso: string | null) => (!iso ? null : iso.length === 10 ? new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR') : new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }))

export default function FicheLecture({ statut, objet, client, lignes, totaux, remisePct, remiseMontant, acomptePct, acompteMontant, validiteJours, dates, mentionTva, franchise }: {
  statut: string; objet: string
  client: { nom: string; email: string; adresse: string }
  lignes: Ligne[]; totaux: Totaux; remisePct: number; remiseMontant: number; acomptePct: number; acompteMontant: number; validiteJours: number
  dates: { cree: string | null; envoye: string | null; accepte: string | null }
  mentionTva: string; franchise: boolean
}) {
  const s = STATUTS[statut] ?? STATUTS.brouillon
  const pleines = lignes.filter((l) => l.designation.trim())
  const joursSansReponse = dates.envoye ? Math.floor((Date.now() - new Date(dates.envoye).getTime()) / 86_400_000) : null
  return (
    <div className="fl">
      <div className="fl-tete"><Statut ton={s.ton}>{s.libelle}</Statut>{objet ? <h2>{objet}</h2> : null}</div>
      <div className="fl-grille">
        <section className="ui-carte fl-lignes" aria-label="Lignes du devis">
          <div className="ui-carte-t"><h3>Lignes du devis</h3><span className="ui-carte-act ui-mono">validité {validiteJours} jours</span></div>
          <div className="fl-tab-cadre">
            <table className="fl-tab">
              <thead><tr><th>Désignation</th><th className="d">Qté</th><th className="d">PU HT</th>{franchise ? null : <th className="d">TVA</th>}<th className="d">Total HT</th></tr></thead>
              <tbody>
                {pleines.map((l, k) => {
                  const q = Number(l.quantite) || 0, pu = Number(l.prix_unitaire_ht) || 0
                  return (
                    <tr key={k}>
                      <td>{l.designation}</td>
                      <td className="d ui-mono">{q.toLocaleString('fr-FR')} {l.unite}</td>
                      <td className="d ui-mono">{eur(pu)}</td>
                      {franchise ? null : <td className="d ui-mono">{String(l.tva_taux).replace('.', ',')} %</td>}
                      <td className="d ui-mono">{eur(q * pu)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <dl className="fl-totaux">
            {remisePct > 0 ? <><dt>Remise {remisePct} %</dt><dd className="ui-mono">− {eur(remiseMontant)}</dd></> : null}
            <dt>Total HT</dt><dd className="ui-mono">{eur(totaux.total_ht)}</dd>
            {franchise ? null : <><dt>TVA</dt><dd className="ui-mono">{eur(totaux.total_tva)}</dd></>}
            <dt className="fl-ttc">Total TTC</dt><dd className="fl-ttc ui-mono">{eur(totaux.total_ttc)}</dd>
            {acomptePct > 0 ? <><dt>Acompte {acomptePct} %</dt><dd className="ui-mono">{eur(acompteMontant)}</dd></> : null}
          </dl>
          {franchise ? <p className="fl-mention">{mentionTva}</p> : null}
        </section>
        <aside className="fl-cote">
          <section className="ui-carte" aria-label="Client">
            <div className="ui-carte-t"><h3>Client</h3></div>
            <dl className="fl-meta">
              <dt>Nom</dt><dd>{client.nom || '—'}</dd>
              <dt>E-mail</dt><dd className="ui-mono">{client.email || '—'}</dd>
              <dt>Chantier</dt><dd>{client.adresse || '—'}</dd>
            </dl>
          </section>
          <section className="ui-carte" aria-label="Historique">
            <div className="ui-carte-t"><h3>Historique</h3></div>
            <ol className="fl-frise">
              {[
                ...(dates.cree ? [{ d: dates.cree, t: 'Devis établi', c: 'fait' }] : []),
                ...(dates.envoye ? [{ d: dates.envoye, t: `Envoyé à ${client.nom || 'votre client'}`, c: 'fait' }] : []),
                ...(dates.accepte ? [{ d: dates.accepte, t: 'Accepté par le client', c: 'fait ok' }] : []),
              ].sort((x, y) => (x.d < y.d ? -1 : 1)).map((e) => <li key={e.t} className={e.c}><time className="ui-mono">{quand(e.d)}</time>{e.t}</li>)}
              {statut === 'refuse' ? <li className="crit">Refusé</li> : null}
              {statut === 'expire' ? <li>Expiré</li> : null}
              {statut === 'envoye' && joursSansReponse !== null && joursSansReponse > 7 ? <li className="a-venir"><time className="ui-mono">aujourd’hui</time>Sans réponse depuis {joursSansReponse} jours : une relance est conseillée.</li> : null}
            </ol>
          </section>
        </aside>
      </div>
    </div>
  )
}
