// La palette du pixel art de la station, reprise de l'atelier (~/claw3d-pixel, src/features/retro-office/pixel/config.ts, notre code du 25/09).
// Seule la palette est reprise : ni PIXEL_MODE ni PIXEL_TRUTH_MODE, qui se coupaient par « ?pixel=0 » dans l'adresse (un interrupteur de vérité).

/**
 * Palette réduite, façon vidéos de référence :
 * espace et coque violets, néons magenta et cyan, intérieur chaud, accents d'état.
 * Échantillons trevsagents (approx.) : néon #C949BA, intérieur #CF9782, fond #750C9C.
 */
export const PIXEL_PALETTE: string[] = [
  // espace, coque
  "#0b0418",
  "#1b0b33",
  "#2e1152",
  "#4a1675",
  "#750c9c",
  // néons magenta
  "#a0288f",
  "#c949ba",
  "#ff6ad5",
  // néons cyan
  "#1d6f8a",
  "#2fc6e0",
  "#9bf6ff",
  // intérieur chaud
  "#3b1f2b",
  "#6b3a3a",
  "#9c5b4b",
  "#cf9782",
  "#f2c7a5",
  // neutres froids
  "#5a5470",
  "#8f87a8",
  "#d8d0e8",
  "#fff4f0",
  // accents d'état
  "#3bd16f",
  "#f2d15c",
  "#ff4d6d",
  "#4d7cff",
];
