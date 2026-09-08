'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiDirection, reconfirmationValide } from './client'
import Fraicheur from './Fraicheur'
import Reconfirmer from './Reconfirmer'
import { relTime } from '@/lib/direction/fraicheur'
import { enEuros } from '@/lib/controle/releve'

// Poste de contrôle → Comptabilité (prompt v11 §3, J5).
//
// Ce que Benj vient y chercher, dans cet ordre : où j'en suis du seuil de TVA, ce que je dois payer
// bientôt, ce que j'ai dépensé, et ce que je dois à Alexandre ce mois-ci.
//
// La règle de l'écran : **une estimation ne s'affiche jamais comme un montant dû**. Un chiffre estimé
// porte son « ≈ » et le dit en toutes lettres ; un seuil vient de la base et son origine est écrite.
type S<T> = { valeur: T | null; source: string; a: string; cache: boolean; erreur?: string }
type Achat = { id: string; fournisseur: string; libelle: string | null; categorie: string; date_facture: string; ht_cents: number; tva_cents: number; ttc_cents: number; payee: boolean; echeance: string | null; origine: string }
type Obligation = { id: string; type: string; libelle: string; echeance: string; montant_cents: number | null; estime: boolean }
type Compta = {
  ventes: { annee: S<number>; mois: S<{ brut: number; net: number; paiements: number }> }
  tva: { regime: string; seuil: number; seuilMajore: number; alerteA: number; ca: number | null; pourcent: number | null; alerte: boolean; depasse: boolean; source: string; a: string; erreur?: string }
  achats: { lignes: Achat[]; totalAnnee: number; impayes: number; resteAPayer: number; tvaSubie: number }
  obligations: Obligation[]
  tresorerie: { net: number; encaisse: number; depenses: number } | null
  a: string
}
type Releve = {
  mois: string; fige: boolean; statut: string; partenaire: { nom: string | null }
  /** `incomplet` : la lecture Stripe s'est arrêtée à mille factures. Le chiffre est partiel. */
  releve: { encaisse: number; couts: number; resultat: number; commission: number; interessement: number; dûAuPartenaire: number; partFondateur: number; incomplet?: boolean; clients: { nom: string | null; encaisse: number; commission: number; tauxApport: number; statutApport: string | null }[] }
  arrete_le?: string | null; paye_le?: string | null; facture_recue?: boolean
}

const CATEGORIES: Record<string, string> = {
  hebergement: 'Hébergement', base: 'Base de données', ia: 'IA', email: 'Emails', domaine: 'Domaine',
  store: 'Stores', paiement: 'Paiement', assurance: 'Assurance', comptable: 'Comptable', materiel: 'Matériel', autre: 'Autre',
}

/** Le mois précédent, en AAAA-MM : celui qu'on arrête, puisqu'il est fini. */
function moisPrecedent(): string {
  const d = new Date()
  d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - 1)
  return d.toISOString().slice(0, 7)
}

export default function Comptabilite({ role, signaler }: { role: 'direction' | 'lecture'; signaler: (m: { type: 'ok' | 'err'; text: string }) => void }) {
  const [d, setD] = useState<Compta | null>(null)
  const [rel, setRel] = useState<Releve | null>(null)
  const [mois, setMois] = useState(moisPrecedent)
  const [erreur, setErreur] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [aConfirmer, setAConfirmer] = useState<{ action: string; faire: () => Promise<void> } | null>(null)
  const [maintenant] = useState(() => Date.now())

  const charger = useCallback(async () => {
    const r = await apiDirection<Compta>('/api/controle/compta')
    if (!r.ok) { setErreur(r.data.error ?? 'Comptabilité indisponible pour l’instant.'); return }
    setErreur(null); setD(r.data)
  }, [])
  const chargerReleve = useCallback(async (m: string) => {
    const r = await apiDirection<Releve>(`/api/controle/releve?mois=${m}`)
    setRel(r.ok ? r.data : null)
    if (!r.ok && r.data.code !== 'sans_partenaire') signaler({ type: 'err', text: r.data.error ?? 'Relevé indisponible.' })
  }, [signaler])

  useEffect(() => { void charger() }, [charger])
  useEffect(() => { void chargerReleve(mois) }, [mois, chargerReleve])

  const agir = useCallback(async (chemin: string, corps: Record<string, unknown>, libelle: string) => {
    setBusy(libelle)
    try {
      const r = await apiDirection<{ message?: string }>(chemin, { method: 'POST', body: JSON.stringify(corps) }, true)
      if (r.ok) { signaler({ type: 'ok', text: r.data.message ?? 'C’est fait.' }); void charger(); void chargerReleve(mois); return }
      if (['reconfirmation_requise', 'expire', 'rejoue', 'portee'].includes(r.data.code ?? '')) {
        setAConfirmer({ action: libelle, faire: async () => { await agir(chemin, corps, libelle) } }); return
      }
      signaler({ type: 'err', text: r.data.error ?? 'Action refusée.' })
    } finally { setBusy(null) }
  }, [charger, chargerReleve, mois, signaler])

  function demander(chemin: string, corps: Record<string, unknown>, libelle: string) {
    if (!reconfirmationValide('argent')) { setAConfirmer({ action: libelle, faire: async () => { await agir(chemin, corps, libelle) } }); return }
    void agir(chemin, corps, libelle)
  }

  function deposerAchat() {
    const fournisseur = window.prompt('Fournisseur ? (Vercel, Supabase, Anthropic, OVH…)')
    if (fournisseur === null) return
    if (!fournisseur.trim()) { signaler({ type: 'err', text: 'Le fournisseur est obligatoire.' }); return }
    const ttc = window.prompt('Montant TTC en euros ? (ex : 24,90)')
    if (ttc === null) return
    if (!/^\d+([.,]\d{1,2})?$/.test(ttc.trim())) { signaler({ type: 'err', text: 'Montant illisible : écrivez 24,90.' }); return }
    const date = window.prompt('Date de la facture ? (AAAA-MM-JJ)', new Date().toISOString().slice(0, 10))
    if (date === null) return
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) { signaler({ type: 'err', text: 'Date attendue : AAAA-MM-JJ.' }); return }
    const categorie = window.prompt(`Catégorie ? ${Object.keys(CATEGORIES).join(' · ')}`, 'hebergement')
    if (categorie === null) return
    demander('/api/controle/compta', { action: 'achat', fournisseur: fournisseur.trim(), ttc: ttc.trim(), date_facture: date.trim(), categorie: categorie.trim() }, 'enregistrer cet achat')
  }

  function arreter() {
    if (!rel?.releve) return
    if (!window.confirm(`${rel.releve.incomplet ? '⚠️ Ce relevé est INCOMPLET : la lecture Stripe s’est arrêtée à mille factures pour ce mois. Ne l’arrêtez pas en l’état.\n\n' : ''}Arrêter le relevé de ${mois} ?\n\n${enEuros(rel.releve.dûAuPartenaire)} seront dus à ${rel.partenaire.nom ?? 'le partenaire'}.\n\nUne fois arrêté, ses chiffres sont figés : ils lui auront été annoncés.`)) return
    demander('/api/controle/releve', { mois, action: 'arreter' }, 'arrêter ce relevé')
  }

  const t = d?.tva

  return (
    <>
      {erreur ? <div className="tool-card"><p className="notif-erreur" role="alert">{erreur}</p><button type="button" className="btn btn--primary" onClick={() => void charger()}>Réessayer</button></div> : null}

      {/* ── Le seuil de TVA : ce qui change la vie de l'entreprise le jour où il tombe ── */}
      <div className="tool-card" data-tva>
        <h2>TVA</h2>
        {!t ? <p className="muted">Chargement…</p> : (
          <>
            <p className="muted" style={{ margin: '0 0 .7rem' }}>
              Régime : <b>{t.regime}</b>. Presti ne facture pas de TVA et ne la récupère pas sur ses achats.
            </p>
            {t.ca === null ? (
              <p className="notif-erreur">Chiffre d’affaires indisponible : {t.erreur ?? 'source injoignable'}. Le seuil ne peut pas être situé.</p>
            ) : (
              <>
                <p style={{ margin: '0 0 .5rem', fontSize: '1.4rem', fontWeight: 700 }} data-tva-ca>
                  {enEuros(t.ca)} <small className="muted" style={{ fontSize: '.85rem', fontWeight: 400 }}>encaissés depuis le 1<sup>er</sup> janvier</small>
                </p>
                <div className="ctl-jauge" role="img" aria-label={`${t.pourcent ?? 0} % du seuil de franchise`}>
                  <span style={{ width: `${Math.min(100, t.pourcent ?? 0)}%` }} className={t.depasse ? 'crit' : t.alerte ? 'warn' : 'ok'} />
                </div>
                <p className="muted" style={{ margin: '.5rem 0 0' }}>
                  {t.pourcent} % du seuil de franchise ({enEuros(t.seuil)}). Seuil majoré : {enEuros(t.seuilMajore)}.
                  <br /><Fraicheur s={{ source: t.source, a: t.a, cache: false }} maintenant={maintenant} />
                </p>
                {t.depasse ? (
                  <p className="notif-erreur" data-tva-alerte style={{ marginTop: '.7rem' }}>
                    Seuil dépassé. Trois choses changent le même jour : les prix affichés, les mentions légales, et l’interrupteur de TVA chez Stripe.
                  </p>
                ) : t.alerte ? (
                  <p className="notif-etat" data-tva-alerte style={{ marginTop: '.7rem' }}>
                    Plus de {t.alerteA} % du seuil. Il reste {enEuros(t.seuil - t.ca)} avant de devoir facturer la TVA.
                  </p>
                ) : null}
              </>
            )}
          </>
        )}
      </div>

      {/* ── Ce qui tombe bientôt ── */}
      <div className="tool-card" data-obligations>
        <h2>Échéances</h2>
        {!d ? <p className="muted">Chargement…</p>
          : d.obligations.length === 0 ? <p className="muted">Aucune échéance enregistrée. URSSAF, CFE et impôt s’ajouteront ici.</p>
          : (
            <ul className="sess">
              {d.obligations.map((o) => (
                <li key={o.id}>
                  <span className="sess-txt">
                    <b>{o.libelle}</b>
                    <small>
                      {new Date(o.echeance).toLocaleDateString('fr-FR')} · {relTime(o.echeance, maintenant)}
                      {o.montant_cents != null ? ` · ${o.estime ? '≈ ' : ''}${enEuros(o.montant_cents)}` : ''}
                      {o.estime ? ' (estimation, pas un montant dû)' : ''}
                    </small>
                  </span>
                  {role === 'direction' ? <button type="button" className="btn btn--ghost" disabled={!!busy} onClick={() => demander('/api/controle/compta', { action: 'obligation_payee', id: o.id }, 'marquer cette échéance payée')}>Payée</button> : null}
                </li>
              ))}
            </ul>
          )}
      </div>

      {/* ── Le relevé du partenaire ── */}
      <div className="tool-card" data-releve>
        <h2>Relevé du partenaire</h2>
        <div className="dir-ligne-actions" style={{ marginBottom: '.8rem' }}>
          <label htmlFor="rel-mois" className="visually-hidden">Mois du relevé</label>
          <input id="rel-mois" type="month" value={mois} onChange={(e) => setMois(e.target.value)} style={{ maxWidth: 180 }} data-releve-mois />
          {rel?.fige ? <span className="pill ok"><span className="pdot" />arrêté{rel.paye_le ? ' et payé' : ''}</span> : <span className="pill"><span className="pdot" />brouillon</span>}
        </div>
        {!rel?.releve ? <p className="muted">Aucun relevé pour ce mois.</p> : (
          <>
            <div className="psh-tablewrap dir-table">
            <table className="psh-dtable" data-releve-detail>
              <thead><tr><th>Client</th><th>Encaissé</th><th>Apport</th><th>Commission</th></tr></thead>
              <tbody>
                {rel.releve.clients.length === 0 ? <tr><td colSpan={4} className="muted">Aucun encaissement ce mois-ci.</td></tr>
                  : rel.releve.clients.map((c, i) => (
                    <tr key={i}>
                      <td data-lab="Client">{c.nom || 'Sans nom'}</td>
                      <td data-lab="Encaissé">{enEuros(c.encaisse)}</td>
                      <td data-lab="Apport">{c.tauxApport > 0 ? `${c.tauxApport} %${c.statutApport ? ` · ${c.statutApport}` : ''}` : <span className="muted">—</span>}</td>
                      <td data-lab="Commission">{c.commission > 0 ? enEuros(c.commission) : <span className="muted">—</span>}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            </div>
            {/* Le calcul, écrit ligne à ligne : un relevé qu'on ne peut pas recompter à la main ne vaut rien. */}
            <ul className="dir-controles" style={{ marginTop: '.8rem' }} data-releve-calcul>
              <li><span>Encaissé</span><span /><b>{enEuros(rel.releve.encaisse)}</b></li>
              <li><span>Coûts directs du mois</span><span /><b>− {enEuros(rel.releve.couts)}</b></li>
              <li><span>Résultat distribuable</span><span /><b>{enEuros(rel.releve.resultat)}</b></li>
              <li><span>Commission sur apports (20 % du chiffre d’affaires apporté)</span><span /><b>{enEuros(rel.releve.commission)}</b></li>
              <li><span>Intéressement (20 % du reste)</span><span /><b>{enEuros(rel.releve.interessement)}</b></li>
              <li><span><b>Dû à {rel.partenaire.nom ?? 'le partenaire'}</b></span><span /><b>{enEuros(rel.releve.dûAuPartenaire)}</b></li>
              <li><span>Part de Benjamin</span><span /><b>{enEuros(rel.releve.partFondateur)}</b></li>
            </ul>
            {role === 'direction' && !rel.fige ? (
              <div className="dir-ligne-actions">
                <button type="button" className="btn btn--primary" disabled={!!busy} onClick={arreter} data-arreter>Arrêter ce relevé</button>
              </div>
            ) : null}
            {rel.fige ? (
              <div className="dir-ligne-actions">
                {!rel.paye_le && role === 'direction' ? <button type="button" className="btn btn--ghost" disabled={!!busy} onClick={() => demander('/api/controle/releve', { mois, action: 'payer' }, 'marquer ce relevé payé')} data-payer>Marquer payé</button> : null}
                {!rel.facture_recue && role === 'direction' ? <button type="button" className="btn btn--ghost" disabled={!!busy} onClick={() => demander('/api/controle/releve', { mois, action: 'facture' }, 'marquer la facture reçue')}>Facture reçue</button> : null}
                <span className="dir-src">arrêté {rel.arrete_le ? relTime(rel.arrete_le, maintenant) : ''} · les chiffres sont figés</span>
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* ── Les achats ── */}
      <div className="tool-card" data-achats>
        <h2>Achats</h2>
        {!d ? <p className="muted">Chargement…</p> : (
          <>
            <p className="muted" style={{ margin: '0 0 .8rem' }}>
              {enEuros(d.achats.totalAnnee)} dépensés cette année · {d.achats.impayes} facture{d.achats.impayes > 1 ? 's' : ''} à payer ({enEuros(d.achats.resteAPayer)})
              <br /><small>TVA subie : {enEuros(d.achats.tvaSubie)} — non déductible en franchise en base, gardée pour la pièce.</small>
            </p>
            {role === 'direction' ? <div className="dir-ligne-actions" style={{ marginBottom: '.8rem' }}><button type="button" className="btn btn--ghost" disabled={!!busy} onClick={deposerAchat} data-deposer>Déposer une facture</button></div> : null}
            <div className="psh-tablewrap dir-table">
              <table className="psh-dtable">
                <thead><tr><th>Fournisseur</th><th>Catégorie</th><th>Date</th><th>TTC</th><th>État</th></tr></thead>
                <tbody>
                  {d.achats.lignes.length === 0 ? <tr><td colSpan={5} className="muted" data-achats-vide>Aucune facture enregistrée cette année.</td></tr>
                    : d.achats.lignes.map((a) => (
                      <tr key={a.id}>
                        <td data-lab="Fournisseur"><b>{a.fournisseur}</b>{a.libelle ? <small className="muted"> · {a.libelle}</small> : null}</td>
                        <td data-lab="Catégorie">{CATEGORIES[a.categorie] ?? a.categorie}</td>
                        <td data-lab="Date">{new Date(a.date_facture).toLocaleDateString('fr-FR')}</td>
                        <td data-lab="TTC">{enEuros(a.ttc_cents)}</td>
                        <td data-lab="État">{a.payee ? <span className="pill ok"><span className="pdot" />payée</span> : <span className="pill warn"><span className="pdot" />à payer</span>}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {aConfirmer ? <Reconfirmer portee="argent" action={aConfirmer.action} onConfirme={() => { const f = aConfirmer.faire; setAConfirmer(null); void f() }} onAnnule={() => setAConfirmer(null)} /> : null}
    </>
  )
}
