import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { exigerCapacite } from '@/lib/accesOffreServeur'
import { messageVerrou, peut } from '@/lib/plans'
import { contrastRatio, lisibleSur } from '@/lib/contrast'
import { getPlateformeConfig } from '@/lib/plateformeConfig'
import {
  ACCENT_DEFAUT, ACCENT_VISIBILITE_CIBLE, ACCENT_VISIBILITE_MIN, THEMES_PLAT, amorcesSures, couleurHex, diffPlateformeStyle, fondEffectif,
  resolvePlateformeStyle, urlMediaSure,
} from '@/lib/plateformeStyle'

// Apparence de la plateforme (sprint J-1 §9 G2). LE seul chemin d'écriture des colonnes
// avancées (`apparence`, `avatar_url`, `amorces` — figées côté navigateur par 0053) :
//  - tout passe d'abord par `plateforme.gestion` (Studio+, 15/10) ;
//  - thème + accent (colonnes `artisans`) : toutes les offres qui ont l'écran ;
//  - le reste : `peut(plan, 'plateforme.personnalisation_avancee')` (Studio+), sinon 403.
// Contraste : un accent ou une couleur secondaire illisible est CORRIGÉ (lisibleSur) et
// la correction est renvoyée — on ne publie pas une page où le texte de l'artisan disparaît.

export const runtime = 'nodejs'

const CAPACITE = 'plateforme.personnalisation_avancee' as const

async function charger(uid: string) {
  const { data: a } = await supabaseAdmin.from('artisans')
    .select('id, plan, slug, theme, accent, logo_url, photo_url').eq('id', uid).maybeSingle()
  if (!a) return null
  const cfg = await getPlateformeConfig(uid)
  return { a, cfg }
}

export async function GET(req: Request) {
  // 15/10 : l'écran « Ma plateforme » (donc son volet Apparence, thème et accent compris) commence avec Studio — 403 sinon.
  const s = await exigerCapacite(req, 'plateforme.gestion', 'L’écran « Ma plateforme »')
  if ('reponse' in s) return s.reponse
  const r = await charger(s.uid)
  if (!r) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })
  const { a, cfg } = r
  return NextResponse.json({
    ok: true,
    slug: a.slug,
    theme: (THEMES_PLAT as readonly string[]).includes(a.theme || '') ? a.theme : 'atelier',
    accent: couleurHex(a.accent) || ACCENT_DEFAUT,
    apparence: diffPlateformeStyle(resolvePlateformeStyle(cfg.apparence)),
    avatar_url: cfg.avatar_url,
    amorces: cfg.amorces ?? [],
    message_accueil: cfg.message_accueil,
    nom_assistant: cfg.nom_assistant,
    logo: a.logo_url || a.photo_url || null,
    avance: peut(a.plan, CAPACITE),
    verrou: messageVerrou(CAPACITE),
  })
}

export async function POST(req: Request) {
  // 15/10 : l'écran « Ma plateforme » (donc son volet Apparence, thème et accent compris) commence avec Studio — 403 sinon.
  const s = await exigerCapacite(req, 'plateforme.gestion', 'L’écran « Ma plateforme »')
  if ('reponse' in s) return s.reponse
  const r = await charger(s.uid)
  if (!r) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })
  const { a, cfg } = r
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })

  const corrections: Record<string, string> = {}
  const artisanPatch: Record<string, unknown> = {}
  const cfgPatch: Record<string, unknown> = {}

  // ── Thème + accent : toutes les offres.
  const theme = typeof body.theme === 'string' && (THEMES_PLAT as readonly string[]).includes(body.theme) ? body.theme : (a.theme || 'atelier')
  if ('theme' in body) {
    if (typeof body.theme !== 'string' || !(THEMES_PLAT as readonly string[]).includes(body.theme)) return NextResponse.json({ error: 'Ambiance inconnue.' }, { status: 400 })
    artisanPatch.theme = theme
  }
  // Le style courant (ou celui envoyé) décide du fond réel sur lequel on mesure la lisibilité.
  const styleEnvoye = 'apparence' in body && body.apparence && typeof body.apparence === 'object'
  const style = resolvePlateformeStyle(styleEnvoye ? body.apparence : cfg.apparence)
  const fond = fondEffectif(style, theme)

  if ('accent' in body) {
    const accent = couleurHex(body.accent)
    if (!accent) return NextResponse.json({ error: 'Couleur d’accent invalide (format #RRGGBB).' }, { status: 400 })
    // Les boutons, bulles et points de la frise portent l'accent : trop proche du fond, ils
    // disparaissent. On garde sa teinte, on assombrit/éclaircit juste ce qu'il faut (le texte, lui,
    // a toujours son encre dérivée à 4,6:1 — voir page.tsx / lisibleSur).
    const lisible = contrastRatio(accent, fond) >= ACCENT_VISIBILITE_MIN ? accent : lisibleSur(accent, fond, ACCENT_VISIBILITE_CIBLE).toUpperCase()
    if (lisible !== accent) corrections.accent = lisible
    artisanPatch.accent = lisible
  }

  // ── Réglages avancés : Studio+ seulement. Revenir au défaut (tout effacer) reste permis à tous.
  const diff = styleEnvoye ? diffPlateformeStyle(style) : null
  const avatar = 'avatar_url' in body ? urlMediaSure(body.avatar_url) : undefined
  const amorces = 'amorces' in body ? amorcesSures(body.amorces) : undefined
  const demandeAvance = (diff && Object.keys(diff).length > 0) || !!avatar || (amorces && amorces.length > 0)
  if (demandeAvance && !peut(a.plan, CAPACITE)) {
    return NextResponse.json({ error: `La personnalisation avancée n’est pas dans votre offre. ${messageVerrou(CAPACITE)}`, verrou: true }, { status: 403 })
  }

  if (styleEnvoye && diff) {
    // Les images doivent être À LUI : le dossier du bucket est son identifiant.
    if (style.fond_image && !style.fond_image.includes(`/artisan-media/${s.uid}/`)) return NextResponse.json({ error: 'Image de fond invalide.' }, { status: 400 })
    if (style.accent2 && contrastRatio(style.accent2, fond) < 4.5) {
      const lisible = lisibleSur(style.accent2, fond).toUpperCase()
      corrections.accent2 = lisible
      style.accent2 = lisible
    }
    cfgPatch.apparence = diffPlateformeStyle(style)
  }
  if (avatar !== undefined) {
    if ('avatar_url' in body && body.avatar_url && !avatar) return NextResponse.json({ error: 'Avatar invalide.' }, { status: 400 })
    if (avatar && !avatar.includes(`/artisan-media/${s.uid}/`)) return NextResponse.json({ error: 'Avatar invalide.' }, { status: 400 })
    cfgPatch.avatar_url = avatar
  }
  if (amorces !== undefined) cfgPatch.amorces = amorces.length ? amorces : null
  if ('message_accueil' in body) {
    const m = typeof body.message_accueil === 'string' ? body.message_accueil.replace(/\s+/g, ' ').trim().slice(0, 200) : ''
    cfgPatch.message_accueil = m || null
  }

  if (Object.keys(artisanPatch).length) {
    const { error } = await supabaseAdmin.from('artisans').update(artisanPatch).eq('id', s.uid)
    if (error) return NextResponse.json({ error: 'Enregistrement impossible.' }, { status: 500 })
  }
  if (Object.keys(cfgPatch).length) {
    const { error } = await supabaseAdmin.from('plateforme_config')
      .upsert({ artisan_id: s.uid, ...cfgPatch, maj_le: new Date().toISOString() }, { onConflict: 'artisan_id' })
    if (error) return NextResponse.json({ error: 'Enregistrement impossible.' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    corrections,
    theme: (artisanPatch.theme as string | undefined) ?? theme,
    accent: (artisanPatch.accent as string | undefined) ?? couleurHex(a.accent) ?? ACCENT_DEFAUT,
    apparence: (cfgPatch.apparence as Record<string, unknown> | undefined) ?? diffPlateformeStyle(resolvePlateformeStyle(cfg.apparence)),
  })
}
