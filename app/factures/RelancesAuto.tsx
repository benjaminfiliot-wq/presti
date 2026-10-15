'use client'

// Le réglage des relances AUTOMATIQUES des factures impayées (migration 0159, lib/relancesImpayes.ts). N'est montré que si le
// serveur répond (drapeau levé, offre, tables en place) : la page Factures ne promet rien qui ne marche pas.
// Tout ce qui s'affiche (aperçu, calendrier, état d'une facture) vient du module pur lib/relancesImpayes.ts, le même que celui du passage quotidien.
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { jourParis } from '@/lib/comptaTableau'
import {
  DESCRIPTION_VARIABLES, ECART_MIN, JOUR_MAX, JOUR_MIN, JOURS_PAR_DEFAUT, lireReglagesRelances, MAX_RELANCES, messageComplet, PIED_AUTOMATIQUE,
  TEXTES_PAR_DEFAUT, TEXTE_MAX, texteDeLaRelance, variablesDe, VARIABLES, type Rang, type ReglagesRelances,
} from '@/lib/relancesImpayes'
import './relances-auto.css'

export type DonneesRelances = {
  reglages: ReglagesRelances
  journal: { facture_id: string; rang: number; jour: string; statut: string; envoyee_le: string | null }[]
  arrets: { facture_id: string; raison: 'artisan' | 'reponse_client'; le: string; reprise_le: string | null }[]
}

export default function RelancesAuto({ donnees, obtenirJeton, nomArtisan, apresEnregistrement }: {
  donnees: DonneesRelances; obtenirJeton: () => Promise<string | null>; nomArtisan: string | null; apresEnregistrement: () => void
}) {
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
    messageComplet(texteDeLaRelance(rang, { textes: { [rang]: textes[rang] } }, variablesDe({ client: 'M. Durand', numero: 'F-2026-0042', totalTtc: 1280, echeance: echeanceExemple, joursRetard: retard, artisan: nomArtisan })))

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
    if (rep?.ok) { setEtat({ texte: actif ? 'Enregistré. Les relances partent chaque matin, selon ce calendrier.' : 'Enregistré. Aucune relance ne part tant que la case n’est pas cochée.', erreur: false }); apresEnregistrement() }
    else setEtat({ texte: r?.error ?? 'Enregistrement impossible.', erreur: true })
  }

  const premier = jours[0] ?? JOURS_PAR_DEFAUT[0]
  const reglerJour = (i: number, v: number) => setJours(jours.map((x, k) => (k === i ? v : x)))
  const ajouter = () => setJours([...jours, Math.min(JOUR_MAX, (jours.at(-1) ?? 0) + 7)])
  const retirer = (i: number) => setJours(jours.filter((_, k) => k !== i))
  const variables = VARIABLES.map((v) => <code key={v} title={DESCRIPTION_VARIABLES[v]}>{`{${v}}`}</code>).reduce<ReactNode[]>((a, c, i) => (i ? [...a, ' ', c] : [c]), [])

  return (
    <section className="psh-panel rel-auto" aria-labelledby="rel-auto-titre" data-relances-auto>
      <form onSubmit={enregistrer}>
        <p className="rel-eyebrow">Impayés</p>
        <h2 id="rel-auto-titre">Relancer automatiquement mes factures échues</h2>
        <label className="rel-case">
          <input type="checkbox" checked={actif} onChange={(e) => setActif(e.target.checked)} />
          <span>Oui, relancer mes clients par e-mail à ma place</span>
        </label>
        <p className="rel-etat" aria-live="polite">
          {actif
            ? `Actif : première relance ${premier} jour${premier > 1 ? 's' : ''} après l’échéance. Dès qu’une facture est payée ou annulée, ou que le client répond, les relances de cette facture s’arrêtent.`
            : 'Désactivé : Presti ne contacte aucun de vos clients au sujet de vos factures tant que vous ne cochez pas cette case.'}
        </p>

        <details className="rel-details" open>
          <summary>Calendrier et messages</summary>
          <p className="rel-note">Chaque relance part au nom de {nomArtisan?.trim() || 'votre entreprise'} ; vos clients vous répondent directement par e-mail. Jamais deux messages le même jour au même client, pas plus de dix relances par jour.</p>
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
          <p className="rel-note">Variables disponibles dans votre texte : {variables}. Laissez au moins {ECART_MIN} jours entre deux messages ; pas de lien dans le texte. Ajouté en bas de chaque message : « {PIED_AUTOMATIQUE} »</p>
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
