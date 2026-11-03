import { notFound } from 'next/navigation'
import { actif } from '@/lib/flags'
import Vue from './Vue'

// Garde serveur : drapeau baissé = réponse 404 et aucun contenu du tableau dans le DOM.
export default function TableauDeBord() {
  if (!actif('tableauComplet')) notFound()
  return <Vue />
}
