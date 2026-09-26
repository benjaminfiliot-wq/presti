import { stripe } from '@/lib/stripe'
import { sourcer } from '@/lib/direction/fraicheur'

/** Le chiffre d'affaires encaissé depuis le 1er janvier — l'assiette du seuil de franchise. */
export const caDeLAnnee = () => sourcer('compta:ca-annee', 'stripe', async () => {
  if (!stripe) throw new Error('Stripe n’est pas configuré.')
  const debut = Math.floor(Date.UTC(new Date().getUTCFullYear(), 0, 1) / 1000)
  let total = 0, curseur: string | undefined
  for (let page = 0; page < 12; page++) {
    const l = await stripe.invoices.list({ status: 'paid', limit: 100, created: { gte: debut }, ...(curseur ? { starting_after: curseur } : {}) }, { timeout: 20_000, maxNetworkRetries: 0 })
    for (const f of l.data) total += f.amount_paid ?? 0
    if (!l.has_more || !l.data.length) break
    curseur = l.data[l.data.length - 1].id
  }
  return total
}, 300_000)

export function situerTva(caCents: number | null, reglages: Record<string, number | string>) {
  const seuil = Number(reglages.tva_seuil_franchise_cents) || 0
  const seuilMajore = Number(reglages.tva_seuil_majore_cents) || 0
  const alerteA = Number(reglages.tva_alerte_pourcent) || 80

  return {
    seuil,
    seuilMajore,
    alerteA,
    pourcent: caCents !== null && seuil > 0 ? Math.round((caCents / seuil) * 1000) / 10 : null,
    alerte: caCents !== null && seuil > 0 && caCents >= seuil * (alerteA / 100),
    depasse: caCents !== null && seuil > 0 && caCents >= seuil,
  }
}

export function margeDuMois({
  encaisse,
  achatsMoisCents,
  coutIaEur,
}: {
  encaisse: { net: number }
  achatsMoisCents: number
  coutIaEur?: number | null
}) {
  const estimation = coutIaEur == null
  const recettesNettesCents = Math.round(encaisse.net * 100)
  const coutIaCents = coutIaEur != null ? Math.round(coutIaEur * 100) : 0
  const depensesCents = achatsMoisCents + coutIaCents

  return {
    recettesNettes: encaisse.net,
    depenses: depensesCents / 100,
    marge: (recettesNettesCents - depensesCents) / 100,
    estimation
  }
}

export function ventesSites(lignes: { etat: string; prix_cents: number | null }[]) {
  let payee = 0, generee = 0, validee = 0, en_ligne = 0, retiree = 0
  let encaisseCents = 0
  for (const l of lignes) {
    if (l.etat === 'payee') payee++
    else if (l.etat === 'generee') generee++
    else if (l.etat === 'validee') validee++
    else if (l.etat === 'en_ligne') en_ligne++
    else if (l.etat === 'retiree') retiree++
    else continue

    encaisseCents += l.prix_cents ?? 0
  }
  return { payee, generee, validee, en_ligne, retiree, encaisseCents }
}
