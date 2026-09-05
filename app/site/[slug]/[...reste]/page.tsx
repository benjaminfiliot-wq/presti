import { notFound } from 'next/navigation'

// Attrape-tout du segment (audit final, G-4.1) : sans lui, une sous-adresse non routée
// (/site/<slug>/xyz) tombait sur la 404 RACINE — titre, favicon, OG et « Retour à l'accueil »
// de Presti sur la surface d'un artisan (fuite white-label sur domaine perso). Ici, notFound()
// sert le not-found.tsx du segment, neutre.
export const dynamic = 'force-static'

export default function SousAdresseInexistante() {
  notFound()
}
