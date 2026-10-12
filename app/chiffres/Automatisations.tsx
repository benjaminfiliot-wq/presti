'use client'

// Les réglages des automatisations de la compta (alerte impayés, export mensuel au comptable).
// N'existe à l'écran QUE si son drapeau est levé (lib/flags.ts) : la règle de la maison est qu'on ne promet pas
// ce qui ne marche pas encore. Les deux sont baissés tant que la migration 0139 n'est pas appliquée.
import { useEffect, useState, type FormEvent } from 'react'
import { actif } from '@/lib/flags'
import { ALERTE_JOURS_MAX, ALERTE_JOURS_MIN, REGLAGES_PAR_DEFAUT, type Reglages } from '@/lib/comptaAutomatisations'

export const automatisationsVisibles = () => actif('comptaAlerteImpayes') || actif('comptaExportMensuel')

export default function Automatisations({ obtenirJeton }: { obtenirJeton: () => Promise<string | null> }) {
  const alerte = actif('comptaAlerteImpayes')
  const exporte = actif('comptaExportMensuel')
  const [r, setR] = useState<Reglages | null>(null)
  const [etat, setEtat] = useState('')
  const [erreur, setErreur] = useState(false)

  useEffect(() => {
    if (!alerte && !exporte) return
    let vivant = true
    ;(async () => {
      const jeton = await obtenirJeton()
      const rep = jeton ? await fetch('/api/compta/reglages', { headers: { Authorization: `Bearer ${jeton}` } }).catch(() => null) : null
      const corps = rep?.ok ? await rep.json().catch(() => null) as { reglages?: Reglages } | null : null
      if (!vivant) return
      if (corps?.reglages) setR({ ...REGLAGES_PAR_DEFAUT, ...corps.reglages })
      else setErreur(true)
    })()
    return () => { vivant = false }
  }, [alerte, exporte, obtenirJeton])

  if (!alerte && !exporte) return null

  async function enregistrer(e: FormEvent) {
    e.preventDefault()
    if (!r) return
    setEtat('Enregistrement…')
    const jeton = await obtenirJeton()
    const rep = jeton ? await fetch('/api/compta/reglages', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jeton}` }, body: JSON.stringify(r) }).catch(() => null) : null
    const corps = rep ? await rep.json().catch(() => null) as { error?: string } | null : null
    setEtat(rep?.ok ? 'Enregistré.' : corps?.error ?? 'Enregistrement impossible.')
  }

  return (
    <section className="psh-panel cpt-auto" aria-labelledby="cpt-auto-titre" data-compta-automatisations>
      <p className="ca-eyebrow">Automatisations</p>
      <h2 id="cpt-auto-titre">Laissez Presti surveiller pour vous</h2>
      {erreur ? <p role="alert">Réglages indisponibles pour le moment.</p> : !r ? <p className="muted">Chargement…</p> : (
        <form onSubmit={enregistrer} className="cpt-auto-form">
          {alerte && <fieldset>
            <legend>Alerte impayés</legend>
            <label className="cpt-case"><input type="checkbox" checked={r.alerte_impayes} onChange={(e) => setR({ ...r, alerte_impayes: e.target.checked })} /> M’écrire quand une facture reste impayée</label>
            <label>Au-delà de <input type="number" min={ALERTE_JOURS_MIN} max={ALERTE_JOURS_MAX} value={r.alerte_jours} onChange={(e) => setR({ ...r, alerte_jours: Number(e.target.value) })} /> jours (après l’échéance, ou après l’émission si la facture n’en a pas)</label>
          </fieldset>}
          {exporte && <fieldset>
            <legend>Export mensuel pour le comptable</legend>
            <label className="cpt-case"><input type="checkbox" checked={r.export_mensuel} onChange={(e) => setR({ ...r, export_mensuel: e.target.checked })} /> Envoyer chaque début de mois le journal des factures du mois précédent (CSV)</label>
            <label>Adresse du comptable <input type="email" autoComplete="off" value={r.export_email ?? ''} onChange={(e) => setR({ ...r, export_email: e.target.value })} /></label>
            {r.dernier_export_mois && <small>Dernier export envoyé : {r.dernier_export_mois.split('-').reverse().join('/')}</small>}
          </fieldset>}
          <div className="ca-actions ca-actions--gauche"><button type="submit" className="ca-primaire">Enregistrer</button><span role="status" className="ca-note">{etat}</span></div>
        </form>
      )}
    </section>
  )
}
