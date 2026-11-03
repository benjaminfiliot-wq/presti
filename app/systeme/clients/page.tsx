import { notFound } from 'next/navigation'
import { actif } from '@/lib/flags'
import ClientsAtelier from '../ClientsAtelier'

export const metadata = { title: 'Clients et chantiers' }

// Drapeau `systemeAgents` baissé : 404, rien dans le DOM.
export default function Page() {
  if (!actif('systemeAgents')) notFound()
  return <ClientsAtelier />
}
