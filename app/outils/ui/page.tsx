// /outils/ui — l'atelier des composants de la console v2 (refonte 18/10, étape 4.3) : chaque composant, dans chacun de ses
// états, sur des données d'EXEMPLE. Page interne : derrière le drapeau `consoleV2`. En production, drapeau baissé : 404.
// Sur une prévisualisation ou un serveur local, elle s'affiche (c'est là qu'on la regarde et qu'on la photographie).
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { actif } from '@/lib/flags'
import Atelier from './Atelier'

export const metadata: Metadata = { title: 'Atelier des composants · Presti', robots: { index: false, follow: false } }

export default function Page() {
  if (!actif('consoleV2') && process.env.VERCEL_ENV === 'production') notFound()
  return <Atelier />
}
