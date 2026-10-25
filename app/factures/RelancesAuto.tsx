'use client'

// Le réglage des relances AUTOMATIQUES des factures impayées (migration 0159, lib/relancesImpayes.ts). N'est montré que si le
// serveur répond (drapeau levé, offre, tables en place) : la page Factures ne promet rien qui ne marche pas.
// Tout ce qui s'affiche (aperçu, calendrier, état d'une facture) vient du module pur lib/relancesImpayes.ts, le même que celui du passage quotidien.
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { jourParis } from '@/lib/comptaTableau'
import {
  DESCRIPTION_VARIABLES, ECART_MIN, JOUR_MAX, JOUR_MIN, JOURS_PAR_DEFAUT, lireRelanceRetouchee, lireReglagesRelances, MAX_RELANCES, messageAValider, messageComplet,
  MESSAGE_VALIDE_MAX, PIED_AUTOMATIQUE, PIED_VALIDE, SUJET_MAX, TEXTES_PAR_DEFAUT, TEXTE_MAX, texteDeLaRelance, variablesDe, VARIABLES, type Rang, type ReglagesRelances,
} from '@/lib/relancesImpayes'
import { centimes, euros } from '@/lib/comptaTableau'
import './relances-auto.css'

/** Une relance préparée par le passage quotidien, qui attend l'artisan (offre Studio, migration 0181). */
export type RelanceAValider = {
  id: string; facture_id: string; rang: number; jour: string; destinataire: string; sujet: string; texte: string
  numero: string | null; client_nom: string | null; total_ttc: number | string | null
}

export type DonneesRelances = {
  reglages: ReglagesRelances
  journal: { facture_id: string; rang: number; jour: string; statut: string; envoyee_le: string | null }[]
  arrets: { facture_id: string; raison: 'artisan' | 'reponse_client'; le: string; reprise_le: string | null }[]
  /** 25/10 (Benj) : true en Signature (`factures.relances.auto`, elles partent seules) ; false en Studio (préparées, vous les validez). */
  auto?: boolean
  a_valider?: RelanceAValider[]
}

const dateFr = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/')

/** Une relance préparée : relire, retoucher, envoyer ou écarter. Rien ne part sans ce clic. */
function RelancePreparee({ r, obtenirJeton, apresAction }: { r: RelanceAValider; obtenirJeton: () => Promise<string | null>; apresAction: () => void }) {
  const [sujet, setSujet] = useState(r.sujet)
  const [texte, setTexte] = useState(r.texte)
  const [enCours, setEnCours] = useState<'envoyer' | 'ecarter' | null>(null)
  const [etat, setEtat] = useState<{ texte: string; erreur: boolean } | null>(null)

  async function agir(action: 'envoyer' | 'ecarter') {
    if (action === 'envoyer') { const lu = lireRelanceRetouchee(sujet, texte); if (!lu.ok) { setEtat({ texte: lu.erreur, erreur: true }); return } }
    setEnCours(action); setEtat(null)
    const jeton = await obtenirJeton()
    const corps = action === 'envoyer' ? { relance_id: r.id, action, sujet, texte } : { relance_id: r.id, action }
    const rep = jeton ? await fetch('/api/factures/relances-auto/a-valider', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jeton}` }, body: JSON.stringify(corps) }).catch(() => null) : null
    const res = rep ? await rep.json().catch(() => null) as { error?: string } | null : null
    setEnCours(null)
    if (rep?.ok) { setEtat({ texte: action === 'envoyer' ? 'Relance envoyée.' : 'Relance écartée : elle ne partira pas.', erreur: false }); apresAction() }
    else setEtat({ texte: res?.error ?? 'Action impossible. Réessayez.', erreur: true })
  }

  return (
    <li className="rel-valider-item" data-relance-a-valider={r.id}>
      <div className="rel-valider-tete">
        <strong>Facture {r.numero?.trim() || '(sans numéro)'} — {r.client_nom?.trim() || 'client'}</strong>
        <span>Relance {r.rang}{r.total_ttc !== null ? ` · ${euros(centimes(r.total_ttc))} TTC` : ''} · préparée le {dateFr(r.jour)} · pour {r.destinataire}</span>
      </div>
      <figure className="rel-apercu">
        <figcaption>Aperçu du message</figcaption>
        <pre>{texte}</pre>
      </figure>
      <details className="rel-details">
        <summary>Relire et retoucher avant d’envoyer</summary>
        <label className="rel-texte">Sujet
          <input type="text" maxLength={SUJET_MAX} value={sujet} onChange={(e) => setSujet(e.target.value)} />
        </label>
        <label className="rel-texte">Message
          <textarea rows={9} maxLength={MESSAGE_VALIDE_MAX} value={texte} onChange={(e) => setTexte(e.target.value)} />
        </label>
      </details>
      <div className="rel-valider-actions">
        <button type="button" className="btn" disabled={enCours !== null} onClick={() => agir('envoyer')}>{enCours === 'envoyer' ? 'Envoi…' : 'Envoyer'}</button>
        <button type="button" className="rel-lien" disabled={enCours !== null} onClick={() => agir('ecarter')}>{enCours === 'ecarter' ? 'Écart…' : 'Écarter'}</button>
        {etat && <span className={etat.erreur ? 'rel-erreur' : 'rel-ok'} role={etat.erreur ? 'alert' : 'status'}>{etat.texte}</span>}
      </div>
    </li>
  )
}

export default function RelancesAuto({ donnees, obtenirJeton, nomArtisan, apresEnregistrement }: {
  donnees: DonneesRelances; obtenirJeton: () => Promise<string | null>; nomArtisan: string | null; apresEnregistrement: () => void
}) {
  // Studio par défaut quand le serveur ne dit rien : on ne promet jamais un envoi automatique qui n'a pas lieu.
  const auto = donnees.auto === true
  const aValider = donnees.a_valider ?? []
  const [actif, setActif] = useState(donnees.reglages.actif)
  const [jours, setJours] = useState<number[]>(donnees.reglages.jours)
  const [textes, setTextes] = useState<Record<Rang, string>>({
    1: donnees.reglages.textes[1] ?? TEXTES_PAR_DEFAUT[1], 2: donnees.reglages.textes[2] ?? TEXTES_PAR_DEFAUT[2], 3: donnees.reglages.textes[3] ?? TEXTES_PAR_DEFAUT[3],
  })
  const [etat, setEtat] = useState<{ texte: string; erreur: boolean } | null>(null)
  const [envoi, setEnvoi] = useState(false)
  useEffect(() => { setActif(donnees.reglages.actif) }, [donnees.reglages.actif])

  // Exemple fixe pour l'aperçu : le texte se lit tel que le client le recevra.
  const echeanceExemple = useMemo(() => jourParis(new Date(Date.now() - 12 * 86_400_000)), [])
  const apercu = (rang: Rang, retard: number) =>
    (auto ? messageComplet : messageAValider)(texteDeLaRelance(rang, { textes: { [rang]: textes[rang] } }, variablesDe({ client: 'M. Durand', numero: 'F-2026-0042', totalTtc: 1280, echeance: echeanceExemple, joursRetard: retard, artisan: nomArtisan })))

  async function enregistrer(e: FormEvent) {
    e.preventDefault()
    const corps = { actif, jours, textes: Object.fromEntries(([1, 2, 3] as Rang[]).filter((r) => r <= jours.length).map((r) => [String(r), textes[r]])) }
    const lu = lireReglagesRelances(corps)
    if (!lu.ok) { setEtat({ texte: lu.erreur, erreur: true }); return }
    setEnvoi(true); setEtat({ texte: 'Enregistrement…', erreur: false })
    const jeton = await obtenirJeton()
    const rep = jeton ? await fetch('/api/factures/relances-auto', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jeton}` }, body: JSON.stringify(corps) }).catch(() => null) : null
    const r = rep ? await rep.json().catch(() => null) as { error?: string } | null : null
    setEnvoi(false)
    if (rep?.ok) {
      setEtat({
        texte: !actif ? 'Enregistré. Aucune relance n’est préparée ni envoyée tant que la case n’est pas cochée.'
          : auto ? 'Enregistré. Les relances partent seules chaque matin, selon ce calendrier.'
          : 'Enregistré. Chaque matin, les relances dues sont préparées selon ce calendrier ; elles ne partent que quand vous les validez ici.',
        erreur: false,
      })
      apresEnregistrement()
    }
    else setEtat({ texte: r?.error ?? 'Enregistrement impossible.', erreur: true })
  }

  const premier = jours[0] ?? JOURS_PAR_DEFAUT[0]
  const reglerJour = (i: number, v: number) => setJours(jours.map((x, k) => (k === i ? v : x)))
  const ajouter = () => setJours([...jours, Math.min(JOUR_MAX, (jours.at(-1) ?? 0) + 7)])
  const retirer = (i: number) => setJours(jours.filter((_, k) => k !== i))
  const variables = VARIABLES.map((v) => <code key={v} title={DESCRIPTION_VARIABLES[v]}>{`{${v}}`}</code>).reduce<ReactNode[]>((a, c, i) => (i ? [...a, ' ', c] : [c]), [])

  return (
    <section className="psh-panel rel-auto" aria-labelledby="rel-auto-titre" data-relances-auto data-relances-mode={auto ? 'auto' : 'a-valider'}>
      {aValider.length > 0 && (
        <div className="rel-valider" aria-labelledby="rel-valider-titre" data-relances-a-valider>
          <p className="rel-eyebrow">À valider</p>
          <h3 id="rel-valider-titre">{aValider.length === 1 ? 'Une relance est prête' : `${aValider.length} relances sont prêtes`} : rien ne part sans vous</h3>
          <p className="rel-note">Préparées automatiquement chaque matin, selon votre calendrier. Relisez, retouchez si besoin, puis envoyez — ou écartez celles qui n’ont plus lieu d’être. Tant qu’une relance attend, la facture n’en reçoit pas d’autre.</p>
          <ul className="rel-valider-liste">
            {aValider.map((r) => <RelancePreparee key={r.id} r={r} obtenirJeton={obtenirJeton} apresAction={apresEnregistrement} />)}
          </ul>
        </div>
      )}
      <form onSubmit={enregistrer}>
        <p className="rel-eyebrow">Impayés</p>
        <h2 id="rel-auto-titre">{auto ? 'Relancer automatiquement mes factures échues' : 'Préparer les relances de mes factures échues'}</h2>
        <label className="rel-case">
          <input type="checkbox" checked={actif} onChange={(e) => setActif(e.target.checked)} />
          <span>{auto ? 'Oui, relancer mes clients par e-mail à ma place' : 'Oui, préparer chaque matin les relances de mes clients — je les valide avant qu’elles partent'}</span>
        </label>
        <p className="rel-etat" aria-live="polite">
          {!actif
            ? 'Désactivé : Presti ne prépare ni n’envoie aucune relance au sujet de vos factures tant que vous ne cochez pas cette case.'
            : auto
              ? `Actif : les relances partent seules, la première ${premier} jour${premier > 1 ? 's' : ''} après l’échéance. Dès qu’une facture est payée ou annulée, ou que le client répond, les relances de cette facture s’arrêtent.`
              : `Actif : les relances sont préparées automatiquement, la première ${premier} jour${premier > 1 ? 's' : ''} après l’échéance, et vous les validez ici — rien ne part sans vous. Dès qu’une facture est payée ou annulée, ou que le client répond, ses relances s’arrêtent.`}
        </p>

        <details className="rel-details" open>
          <summary>Calendrier et messages</summary>
          <p className="rel-note">Chaque relance part au nom de {nomArtisan?.trim() || 'votre entreprise'}{auto ? '' : ', une fois que vous l’avez validée'} ; vos clients vous répondent directement par e-mail. Jamais deux messages le même jour au même client, pas plus de dix relances {auto ? '' : 'préparées '}par jour.</p>
          <ol className="rel-liste">
            {jours.map((j, i) => {
              const rang = (i + 1) as Rang
              return (
                <li key={rang} className="rel-relance">
                  <div className="rel-ligne">
                    <label>Relance {rang} : <input type="number" inputMode="numeric" min={JOUR_MIN} max={JOUR_MAX} value={j} onChange={(e) => reglerJour(i, Number(e.target.value))} aria-label={`Jours après l’échéance pour la relance ${rang}`} /> jours après l’échéance</label>
                    {jours.length > 1 && i === jours.length - 1 && <button type="button" className="rel-lien" onClick={() => retirer(i)}>Retirer</button>}
                  </div>
                  <label className="rel-texte">Votre message
                    <textarea rows={7} maxLength={TEXTE_MAX} value={textes[rang]} onChange={(e) => setTextes({ ...textes, [rang]: e.target.value })} />
                  </label>
                  <div className="rel-actions-texte">
                    <button type="button" className="rel-lien" onClick={() => setTextes({ ...textes, [rang]: TEXTES_PAR_DEFAUT[rang] })} disabled={textes[rang] === TEXTES_PAR_DEFAUT[rang]}>Rétablir le texte par défaut</button>
                  </div>
                  <figure className="rel-apercu">
                    <figcaption>Aperçu, avec une facture d’exemple</figcaption>
                    <pre>{apercu(rang, j)}</pre>
                  </figure>
                </li>
              )
            })}
          </ol>
          {jours.length < MAX_RELANCES && <button type="button" className="rel-lien rel-ajout" onClick={ajouter}>Ajouter une relance</button>}
          <p className="rel-note">Variables disponibles dans votre texte : {variables}. Laissez au moins {ECART_MIN} jours entre deux messages ; pas de lien dans le texte. Ajouté en bas de chaque message : « {auto ? PIED_AUTOMATIQUE : PIED_VALIDE} »</p>
        </details>

        <div className="rel-pied">
          <button type="submit" className="btn" disabled={envoi}>Enregistrer</button>
          {etat && <span className={etat.erreur ? 'rel-erreur' : 'rel-ok'} role={etat.erreur ? 'alert' : 'status'}>{etat.texte}</span>}
        </div>
        <p className="rel-note">Les factures échues depuis longtemps au moment où vous activez ne sont pas relancées en rafale : demandez leur relance à l’assistant, ou depuis « Mes chiffres ».</p>
      </form>
    </section>
  )
}
