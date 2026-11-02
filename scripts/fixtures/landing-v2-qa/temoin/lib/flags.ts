// Témoin de scripts/landing-v2-qa.mjs (tâche 033-002) : un lib/flags.ts réduit, landingV2 baissé. Gabarit de test, jamais une proposition de texte.
export const FLAGS = {
  landingV2: false,
  canauxWhatsapp: false,
  canauxReseaux: false,
  inventaireOcr: false,
  prospectsEntrant: true,
} as const

export type Flag = keyof typeof FLAGS

export const actif = (f: Flag): boolean => FLAGS[f]
