import { notFound } from 'next/navigation'
import { actif } from '@/lib/flags'
import Outils from './Outils'

// /crm/outils — « Mes outils » (tâche 036-033). Drapeau `connexions` baissé (lib/flags.ts) : 404 rendu par le serveur, avant tout
// composant ; rien dans le DOM, et l'outil de gestion (app/crm/Gestion.tsx) ne montre aucun lien. La garde lit `actif`, comme les
// routes du circuit (lib/connexions/serveur.ts) : l'écran et ses routes s'ouvrent ensemble, jamais l'un sans l'autre.
// L'offre se décide ensuite par peut() (./Outils.tsx), outil par outil.
export const dynamic = 'force-dynamic'

export default function Page() {
  if (!actif('connexions')) notFound()
  return <Outils />
}
