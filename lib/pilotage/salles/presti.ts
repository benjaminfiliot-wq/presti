// 026-178 — la salle Presti, celle du produit : clients() et cerveaux() de lib/controle/lectures (026-174) sous `clients` — des
// NOMBRES d'artisans, jamais un nom ni une adresse —, le MRR (lib/direction/stripe.ts) sous `comptabilite`, et le NOMBRE de tickets
// de support ouverts (ticketsOuverts : `{ nombre }`, jamais un contenu) sous `support` en lecture.
import { sourcer } from '@/lib/direction/fraicheur'
import type { Contexte } from '../station'
import { lignes, nombre } from './outils'

export async function lire(c: Contexte) {
  const k = await c.deps.lectures.clients()
  if ('indisponible' in k) throw new Error(k.indisponible)
  const cerveaux = await c.deps.lectures.cerveaux()
  return {
    artisans_actifs: lignes(k.lignes).filter((a) => !a.suppression_demandee_le).length,
    payants: nombre(k.resume?.payants),
    cerveaux: lignes(cerveaux).map((x) => ({ id: x.id ?? null, score: x.score ?? null, reussis: x.reussis ?? null, total: x.total ?? null, cas: nombre(x.cas), ouverts: nombre(x.ouverts) })),
    mrr: await sourcer('salle.presti.mrr', 'stripe', async () => {
      const m = await c.deps.mrr()
      if (m.erreur || !m.valeur) throw new Error(m.erreur ?? 'MRR non mesuré')
      return m.valeur.mrr
    }),
    tickets: await c.env('salle.presti.tickets', async () => ({ nombre: nombre((await c.deps.lectures.ticketsOuverts()).nombre) })),
  }
}
