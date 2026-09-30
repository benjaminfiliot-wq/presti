import { lienPilotage } from './liens'
import type { ChargePush } from '@/lib/push'

export const MOTIFS_POUSSES = [
  'paiement', 'appel', 'panne_agent', 'argent_bloque', 'coupe_circuit',
  'digest', 'usine_injoignable', 'canal_arrete', 'gmail_bloque',
] as const

type MotifPousse = typeof MOTIFS_POUSSES[number]

const CHARGES: Record<MotifPousse, Omit<ChargePush, 'tag'>> = {
  paiement: { titre: 'Paiement', ligne: 'Un paiement demande votre attention. Le détail est dans le Poste.', url: lienPilotage({ bloc: 'argent' }), renotify: true },
  appel: { titre: 'Appel à rendre', ligne: 'Quelqu’un demande à être rappelé.', url: lienPilotage({ bloc: 'appeler' }), renotify: true },
  panne_agent: { titre: 'Agent en panne', ligne: 'Un agent ne donne plus signe de vie depuis plus de 2 h.', url: lienPilotage({ bloc: 'agents' }), renotify: true },
  argent_bloque: { titre: 'Argent bloqué', ligne: 'Une commande payée n’avance pas.', url: lienPilotage({ bloc: 'argent' }), renotify: true },
  coupe_circuit: { titre: 'Agents en pause', ligne: 'Des coûts sans recette ce mois : une décision vous attend.', url: lienPilotage({ bloc: 'decider' }) },
  digest: { titre: 'Le point du Pilotage', ligne: 'Décisions, appels et argent du jour : tout est dans le Poste.', url: lienPilotage() },
  usine_injoignable: { titre: 'Usine injoignable', ligne: 'L’usine ne donne plus signe de vie. Le détail est dans le Poste.', url: lienPilotage({ bloc: 'agents' }), renotify: true },
  canal_arrete: { titre: 'Canal arrêté', ligne: 'Un canal d’envoi est arrêté. Le détail est dans le Poste.', url: lienPilotage({ bloc: 'envois' }), renotify: true },
  gmail_bloque: { titre: 'Gmail bloqué', ligne: 'La boîte de prospection est bloquée. Le détail est dans le Poste.', url: lienPilotage({ bloc: 'envois' }), renotify: true },
}

export function chargeFondateur(motif: string): ChargePush | null {
  if (!MOTIFS_POUSSES.some(m => m === motif)) return null
  const connu = motif as MotifPousse
  return { ...CHARGES[connu], tag: `pilotage-${connu}` }
}
