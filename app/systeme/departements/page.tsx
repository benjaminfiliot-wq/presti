import { notFound } from 'next/navigation'
import { actif } from '@/lib/flags'
import Departements from '../Departements'

export const metadata = { title: 'Mes départements' }

// Drapeau `systemeAgents` baissé : 404, rien dans le DOM.
export default function Page() {
  if (!actif('systemeAgents')) notFound()
  return <Departements />
}
