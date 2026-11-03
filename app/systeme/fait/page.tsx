import { notFound } from 'next/navigation'
import { actif } from '@/lib/flags'
import Fait from '../Fait'

export const metadata = { title: 'Ce qui a été fait' }

// Drapeau `systemeAgents` baissé : 404, rien dans le DOM.
export default function Page() {
  if (!actif('systemeAgents')) notFound()
  return <Fait />
}
