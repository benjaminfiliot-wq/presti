// La serif éditoriale de la landing v2 (direction « claude.com × mistral.ai », Benj, 02/11 au soir) : Fraunces, chargée ICI et non
// dans app/layout.tsx, pour que seules les pages de la landing la téléchargent. Police variable : les axes `opsz` (taille optique, fine
// en très grand) et `SOFT` (empattements adoucis, plus chaleureux) suffisent ; aucune graisse fixe à télécharger en plus.
// Préchargée : le h1 du premier écran est écrit avec elle. `display: swap` : le texte ne l'attend jamais.
import { Fraunces } from 'next/font/google'

export const serif = Fraunces({
  subsets: ['latin'],
  axes: ['opsz', 'SOFT'],
  style: ['normal', 'italic'],
  variable: '--lp3-serif',
  display: 'swap',
  preload: true,
})
