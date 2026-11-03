import { notFound } from 'next/navigation'
import { actif } from '@/lib/flags'
import CentreCommande from './CentreCommande'

export const metadata = { title: 'Accueil' }

// Centre de commande. Drapeau `systemeAgents` baissé : 404, rien dans le DOM.
export default function Page() {
  if (!actif('systemeAgents')) notFound()
  return <CentreCommande />
}
