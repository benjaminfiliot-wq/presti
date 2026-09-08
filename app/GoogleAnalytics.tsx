'use client'

import Script from 'next/script'
import { usePathname } from 'next/navigation'

// Google Analytics 4 — inerte tant que NEXT_PUBLIC_GA_ID n'est pas défini (Vercel).
// Renseigne NEXT_PUBLIC_GA_ID = "G-XXXXXXXXXX" pour l'activer.
//
// LA GARDE DE CHEMIN N'EST PAS UNE PRÉCAUTION, C'EST LA CONDITION POUR QUE NOS PAGES DISENT VRAI.
//
// Le layout racine enveloppe TOUTES les routes, et un layout de segment ne peut pas s'en soustraire
// (il n'a ni `<html>` ni `<body>`). Le jour où la clé est posée sur Vercel, gtag se chargerait donc :
//
//   · sur le site de chaque artisan, dont la page légale affirme « ce site ne dépose aucun cookie
//     publicitaire et ne vous suit sur aucun autre site » — nous ferions mentir l'artisan sur SON
//     site, à SES visiteurs, sous SA responsabilité ;
//   · sur la page où le prospect écrit sa demande, qui est une surface de l'artisan ;
//   · sur nos propres pages de réinitialisation de mot de passe, où le jeton est dans l'URL —
//     et une URL part dans la mesure d'audience.
//
// Aucun bandeau de consentement n'existe dans ce dépôt : `_ga` n'est pas un cookie nécessaire, donc
// la mesure ne se justifie que là où nous n'avons rien promis d'autre — la vitrine et les pages
// publiques de Presti.
const INTERDITS = [
  '/site/', // le site vitrine d'un artisan, sous sa marque et sa responsabilité
  '/p/', // la plateforme où le client de l'artisan écrit
  '/demande', // la même chose, sur un domaine personnalisé
  '/reset-password', // le jeton de réinitialisation est dans l'URL
  '/parametres', // l'espace de l'artisan : rien à mesurer, et des identifiants dans les chemins
  '/controle', // le poste de contrôle
]

export default function GoogleAnalytics() {
  const id = process.env.NEXT_PUBLIC_GA_ID
  const chemin = usePathname() ?? ''
  if (!id) return null
  if (INTERDITS.some((p) => chemin === p || chemin.startsWith(p))) return null
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${id}');
      `}</Script>
    </>
  )
}
