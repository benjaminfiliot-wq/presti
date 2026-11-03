import { notFound } from 'next/navigation'
import { actif } from '@/lib/flags'
import Connexions from '../Connexions'

export const metadata = { title: 'Connexions' }

// Drapeau `systemeAgents` baissé : 404, rien dans le DOM.
export default function Page() {
  if (!actif('systemeAgents')) notFound()
  return <Connexions />
}
