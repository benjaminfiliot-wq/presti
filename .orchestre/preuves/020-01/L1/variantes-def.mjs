// variantes-def.mjs — les paramètres des variantes de L1 (au plus six), lus par reglage.mjs et final.mjs.
const LUM = (a) => `rgba(255,214,150,${+a.toFixed(3)})`, OMB = (a) => `rgba(10,7,4,${+a.toFixed(3)})`
// deux faisceaux (lumière a à 0° et 180°) et deux ombres (o à 90° et 270°), chaque bascule passe par le transparent
export const deuxLobes = (a, o) => {
  const s = []
  for (const b of [0, 180]) s.push(`${LUM(a)} ${b}deg`, `${LUM(a / 2)} ${b + 25}deg`, `${LUM(0)} ${b + 45}deg`, `${OMB(0)} ${b + 45}deg`, `${OMB(o / 2)} ${b + 65}deg`, `${OMB(o)} ${b + 90}deg`, `${OMB(o / 2)} ${b + 115}deg`, `${OMB(0)} ${b + 135}deg`, `${LUM(0)} ${b + 135}deg`, `${LUM(a / 2)} ${b + 155}deg`)
  s.push(`${LUM(a)} 360deg`)
  return `conic-gradient(from 0deg,${s.join(',')})`
}
export const VARIANTES = {
  temoin: null,
  // V1 : la variante « rai » de cahier/cdc-c2-variantes.mjs:40-46, un tour en 12 s (au lieu de 20) dans le sens −, intensité relevée (.75/.55 → .95/.7)
  'v1-rai-12s-fort': { P: 12, sens: -1, taille: 106, conique: `conic-gradient(from 0deg,${LUM(0)} 0deg,${LUM(0.95)} 26deg,${LUM(0)} 58deg,${OMB(0)} 150deg,${OMB(0.7)} 205deg,${OMB(0)} 265deg,${LUM(0)} 360deg)`, masque: 'transparent 7%,#000 24%,#000 72%,transparent 100%' },
  // V2 : deux faisceaux et deux ombres en alternance douce, calque agrandi à 140vw pour couvrir la page, 12 s
  'v2-deux-faisceaux-12s': { P: 12, sens: -1, taille: 140, conique: `conic-gradient(from 0deg,${LUM(0.7)} 0deg,${LUM(0.35)} 25deg,${LUM(0)} 45deg,${OMB(0)} 45deg,${OMB(0.25)} 65deg,${OMB(0.5)} 90deg,${OMB(0.25)} 115deg,${OMB(0)} 135deg,${LUM(0)} 135deg,${LUM(0.35)} 155deg,${LUM(0.7)} 180deg,${LUM(0.35)} 205deg,${LUM(0)} 225deg,${OMB(0)} 225deg,${OMB(0.25)} 245deg,${OMB(0.5)} 270deg,${OMB(0.25)} 295deg,${OMB(0)} 315deg,${LUM(0)} 315deg,${LUM(0.35)} 335deg,${LUM(0.7)} 360deg)`, masque: 'transparent 6%,#000 20%,#000 72%,transparent 100%' },
  // V3 : V2 en 10 s, lumière et ombre relevées (.85/.6), calque de 170vw (même trou central en px, fondu extérieur long)
  'v3-deux-faisceaux-10s-fort': { P: 10, sens: -1, taille: 170, conique: deuxLobes(0.85, 0.6), masque: 'transparent 5%,#000 17%,#000 72%,transparent 100%' },
  // V4 : V2 en 8 s (la borne rapide du cahier), intensité de V2, calque de 170vw
  'v4-deux-faisceaux-8s': { P: 8, sens: -1, taille: 170, conique: deuxLobes(0.7, 0.5), masque: 'transparent 5%,#000 17%,#000 72%,transparent 100%' },
  // V5 : V3 tombe à 2,852 en 1280×800 quand un faisceau clair vise la bande haute du tiers droit du titre (analyse-r12.json).
  // Lumière plafonnée à .40 (hausse de luminance ≈ proportionnelle : .041 × .40/.85), le mouvement reporté sur l'ombre (.95) ;
  // 9 s par tour : les paires de C2-a tombent à 100° et 120° de rotation, où deux lobes changent presque au maximum.
  'v5-ombre-portee-9s': { P: 9, sens: -1, taille: 170, conique: deuxLobes(0.4, 0.95), masque: 'transparent 5%,#000 17%,#000 72%,transparent 100%' },
  // V6 : V5 tient C2-a et R-12 mais ses creux d'écart par image (0,0052 à 0,0055) laissent 0,875 à 1,25 s « figées ».
  // +18 % de mouvement : lumière .50, ombre 1, 8,5 s par tour (paires de C2-a à 106° et 127°). Contraste 1280×800 attendu ≈ 3,08.
  'v6-ombre-portee-8s5': { P: 8.5, sens: -1, taille: 170, conique: deuxLobes(0.5, 1), masque: 'transparent 5%,#000 17%,#000 72%,transparent 100%' },
}
