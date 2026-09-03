// Personnalisation avancée du site vitrine (v4 §7/E1).
//
// Principe de non-régression, tenu par construction : `styleToCss` n'émet QUE les
// propriétés qui s'écartent du défaut. Un artisan qui n'a jamais ouvert le mode avancé
// obtient un objet de style vide, donc exactement le rendu d'aujourd'hui. Rien à raser.
//
// Tout passe par des variables CSS et deux ou trois attributs `data-*` : pas une seule
// règle CSS par artisan, pas de feuille générée. Le site reste un fichier statique.

export type CoupleId = 'atelier' | 'chantier' | 'epure' | 'presse' | 'signature' | 'moderne' | 'solide' | 'classique'
export type Echelle = 'compacte' | 'normale' | 'ample'
export type Bouton = 'plein' | 'contour' | 'souligne'
export type Rythme = 'serre' | 'normal' | 'aere'
export type Texture = 'aucune' | 'grain' | 'papier' | 'bruit'
export type Motion = 'aucune' | 'sobre' | 'cinematique'

export type SiteStyle = {
  v: 1
  couple: CoupleId
  taille: number        // taille de base du texte, en px (15 → 19)
  echelle: Echelle      // écart entre les tailles de titres
  interlettrage: number // titres, en em (-0.04 → 0.02)
  accent2: string | null // couleur secondaire (null = dérivée de l'accent)
  fond: string | null    // fond personnalisé (null = celui du thème)
  rayon: number          // angles, en px (0 → 24)
  filet: number          // épaisseur des traits, en px (1 → 3)
  bouton: Bouton
  rythme: Rythme         // hauteur des sections
  largeur: number        // largeur maximale du contenu, en px (900 → 1400)
  texture: Texture
  texture_force: number  // 0 → 100
  motion: Motion
}

export const STYLE_DEFAUT: SiteStyle = {
  v: 1, couple: 'atelier', taille: 16, echelle: 'normale', interlettrage: 0,
  accent2: null, fond: null, rayon: 14, filet: 1, bouton: 'plein',
  rythme: 'normal', largeur: 1180, texture: 'aucune', texture_force: 40, motion: 'sobre',
}

// ── Les 8 couples de polices. Les variables `--f-*` sont déclarées dans app/layout.tsx
// (next/font, preload:false pour tout ce qui n'est pas le couple par défaut).
export const COUPLES: { id: CoupleId; nom: string; pour: string; display: string; texte: string }[] = [
  { id: 'atelier', nom: 'Atelier', pour: 'Chaleureux, artisanal, éditorial', display: 'var(--f-fraunces),Georgia,serif', texte: 'var(--f-body),system-ui,sans-serif' },
  { id: 'chantier', nom: 'Chantier', pour: 'Direct, robuste, lisible de loin', display: 'var(--f-archivo),Impact,sans-serif', texte: 'var(--f-plex),system-ui,sans-serif' },
  { id: 'epure', nom: 'Épuré', pour: 'Sobre et moderne, une seule police', display: 'var(--f-manrope),system-ui,sans-serif', texte: 'var(--f-manrope),system-ui,sans-serif' },
  { id: 'presse', nom: 'Presse', pour: 'Sérieux, informatif, très lisible', display: 'var(--f-newsreader),Georgia,serif', texte: 'var(--f-plex),system-ui,sans-serif' },
  { id: 'signature', nom: 'Signature', pour: 'Haut de gamme, sur-mesure', display: 'var(--f-instrument),Georgia,serif', texte: 'var(--f-manrope),system-ui,sans-serif' },
  { id: 'moderne', nom: 'Moderne', pour: 'Contemporain, architecturé', display: 'var(--f-display),system-ui,sans-serif', texte: 'var(--f-body),system-ui,sans-serif' },
  { id: 'solide', nom: 'Solide', pour: 'Affirmé, du caractère', display: 'var(--f-syne),system-ui,sans-serif', texte: 'var(--f-body),system-ui,sans-serif' },
  { id: 'classique', nom: 'Classique', pour: 'Rassurant, intemporel', display: 'var(--f-lora),Georgia,serif', texte: 'var(--f-plex),system-ui,sans-serif' },
]

const ECHELLES: Record<Echelle, number> = { compacte: 0.88, normale: 1, ample: 1.14 }
const RYTHMES: Record<Rythme, number> = { serre: 0.75, normal: 1, aere: 1.3 }

// ── Réglages préréglés par métier (§E1 : « ce qui rend la personnalisation utilisable
// par quelqu'un qui n'a aucun goût déclaré »). Chacun est une combinaison qu'on assume,
// pas une moyenne : un couvreur et un paysagiste ne doivent pas se ressembler.
export const PRESETS_METIER: { id: string; nom: string; theme: string; accent: string; style: Partial<SiteStyle> }[] = [
  { id: 'menuisier', nom: 'Menuisier', theme: 'atelier', accent: '#A9743F', style: { couple: 'atelier', rayon: 6, texture: 'papier', texture_force: 35, rythme: 'aere', bouton: 'plein' } },
  { id: 'plombier', nom: 'Plombier', theme: 'bleu', accent: '#1E6FA8', style: { couple: 'epure', rayon: 12, texture: 'aucune', rythme: 'normal', bouton: 'plein' } },
  { id: 'electricien', nom: 'Électricien', theme: 'nuit', accent: '#E8B93B', style: { couple: 'moderne', rayon: 4, texture: 'bruit', texture_force: 25, interlettrage: -0.02, bouton: 'contour' } },
  { id: 'macon', nom: 'Maçon', theme: 'chantier', accent: '#8A8177', style: { couple: 'chantier', rayon: 0, filet: 2, texture: 'grain', texture_force: 45, rythme: 'serre', bouton: 'plein' } },
  { id: 'peintre', nom: 'Peintre', theme: 'vitrine', accent: '#C2543F', style: { couple: 'signature', rayon: 20, texture: 'aucune', rythme: 'aere', echelle: 'ample', bouton: 'souligne' } },
  { id: 'carreleur', nom: 'Carreleur', theme: 'epure', accent: '#3C6E63', style: { couple: 'epure', rayon: 2, filet: 1, texture: 'aucune', largeur: 1280, bouton: 'contour' } },
  { id: 'couvreur', nom: 'Couvreur', theme: 'chantier', accent: '#6B4A3A', style: { couple: 'chantier', rayon: 0, filet: 2, texture: 'grain', texture_force: 55, bouton: 'plein' } },
  { id: 'paysagiste', nom: 'Paysagiste', theme: 'atelier', accent: '#4A7B3F', style: { couple: 'classique', rayon: 24, texture: 'papier', texture_force: 25, rythme: 'aere', echelle: 'ample', bouton: 'plein' } },
]

const borne = (v: unknown, min: number, max: number, def: number) => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def
}
const parmi = <T extends string>(v: unknown, liste: readonly T[], def: T): T => (liste.includes(v as T) ? (v as T) : def)
const couleur = (v: unknown): string | null => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : null)

/** Lit ce qui est stocké en base et en fait un style sûr : rien ne peut sortir des bornes. */
export function resolveStyle(stored: unknown): SiteStyle {
  const s = (stored && typeof stored === 'object' ? stored : {}) as Partial<SiteStyle>
  return {
    v: 1,
    couple: parmi(s.couple, COUPLES.map((c) => c.id), STYLE_DEFAUT.couple),
    taille: borne(s.taille, 15, 19, STYLE_DEFAUT.taille),
    echelle: parmi(s.echelle, ['compacte', 'normale', 'ample'] as const, STYLE_DEFAUT.echelle),
    interlettrage: borne(s.interlettrage, -0.04, 0.02, STYLE_DEFAUT.interlettrage),
    accent2: couleur(s.accent2),
    fond: couleur(s.fond),
    rayon: borne(s.rayon, 0, 24, STYLE_DEFAUT.rayon),
    filet: borne(s.filet, 1, 3, STYLE_DEFAUT.filet),
    bouton: parmi(s.bouton, ['plein', 'contour', 'souligne'] as const, STYLE_DEFAUT.bouton),
    rythme: parmi(s.rythme, ['serre', 'normal', 'aere'] as const, STYLE_DEFAUT.rythme),
    largeur: borne(s.largeur, 900, 1400, STYLE_DEFAUT.largeur),
    texture: parmi(s.texture, ['aucune', 'grain', 'papier', 'bruit'] as const, STYLE_DEFAUT.texture),
    texture_force: borne(s.texture_force, 0, 100, STYLE_DEFAUT.texture_force),
    motion: parmi(s.motion, ['aucune', 'sobre', 'cinematique'] as const, STYLE_DEFAUT.motion),
  }
}

/**
 * Variables CSS à poser sur la racine `.site`.
 * N'émet QUE ce qui s'écarte du défaut : un artisan qui n'a rien réglé garde,
 * au pixel près, le site qu'il avait avant l'existence de ce mode avancé.
 */
export function styleToCss(s: SiteStyle): Record<string, string> {
  const css: Record<string, string> = {}
  const c = COUPLES.find((x) => x.id === s.couple)
  if (c && s.couple !== STYLE_DEFAUT.couple) { css['--sfd'] = c.display; css['--sfb'] = c.texte }
  if (s.taille !== STYLE_DEFAUT.taille) css['--sfs'] = `${s.taille}px`
  if (s.echelle !== STYLE_DEFAUT.echelle) css['--sscale'] = String(ECHELLES[s.echelle])
  if (s.interlettrage !== STYLE_DEFAUT.interlettrage) css['--stitle-ls'] = `${s.interlettrage}em`
  if (s.accent2) css['--pc2'] = s.accent2
  if (s.fond) { css['--sbg'] = s.fond; css['--sbg2'] = `color-mix(in srgb, ${s.fond} 92%, #000)` }
  if (s.rayon !== STYLE_DEFAUT.rayon) css['--srad'] = `${s.rayon}px`
  if (s.filet !== STYLE_DEFAUT.filet) css['--sbw'] = `${s.filet}px`
  if (s.rythme !== STYLE_DEFAUT.rythme) css['--srhythm'] = String(RYTHMES[s.rythme])
  if (s.largeur !== STYLE_DEFAUT.largeur) css['--swrap'] = `${s.largeur}px`
  if (s.texture !== 'aucune') css['--stex'] = String(s.texture_force / 100)
  return css
}

/** Attributs `data-*` : ce qui ne se règle pas avec un nombre (variantes de forme). */
export function styleToData(s: SiteStyle): Record<string, string> {
  const d: Record<string, string> = {}
  if (s.interlettrage !== STYLE_DEFAUT.interlettrage) d['data-ls'] = '1'
  if (s.bouton !== STYLE_DEFAUT.bouton) d['data-bouton'] = s.bouton
  if (s.texture !== 'aucune') d['data-texture'] = s.texture
  if (s.motion !== STYLE_DEFAUT.motion) d['data-motion'] = s.motion
  return d
}
