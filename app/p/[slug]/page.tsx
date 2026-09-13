import type { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { suspensionEnCours, MESSAGE_PUBLIC_INDISPONIBLE } from '@/lib/suspension'
import PlatChat from './PlatChat'
import { computeResponseDelay } from '@/lib/platStats'
import { lisibleSur } from '@/lib/contrast'
import { FOND_THEME, fondDuTheme } from '@/lib/themeFonds'
import { headers } from 'next/headers'
import { notFound, permanentRedirect, redirect } from 'next/navigation'
import { chemins, modeDepuisHote, urlPlateforme } from '@/lib/urls'
import { artisanParAncienSlug } from '@/lib/slugRedirect'
import { getPlateformeConfig } from '@/lib/plateformeConfig'
import {
  ACCENT_DEFAUT, THEMES_PLAT, decoderApercu, fondEffectif, plateformeStyleToCss, plateformeStyleToData,
  resolvePlateformeStyle, type ApercuPayload,
} from '@/lib/plateformeStyle'

// LA PLATEFORME (v4 §A1/§A2) : une application de conversation à la marque de l'artisan,
// pas une page de contact décorée. La présentation (prestations, réalisations) vit sur le SITE.
// White-label absolu : aucune mention de Presti.
//
// Apparence avancée (§9 G2) : `plateforme_config.apparence` est résolue par lib/plateformeStyle,
// qui n'émet QUE les écarts au défaut — un artisan qui n'a rien réglé garde sa page au pixel près.
// Aperçu : `?apercu=1&style=<base64>` applique un style NON enregistré, seulement dans ce mode
// (la page est noindex quoi qu'il arrive), pour le cadre du volet « Apparence ».

type Service = { nom?: string; description?: string }
type Artisan = {
  id: string
  nom: string | null; metier: string | null; slug: string | null; ville: string | null
  bio: string | null; services: Service[] | null; zone_intervention: string | null
  photo_url: string | null; logo_url: string | null; plateforme_active: boolean | null
  accent: string | null; theme: string | null; leads_pause: boolean | null
  domaine: string | null; domaine_verifie: boolean | null
}
type Params = { params: Promise<{ slug: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> }

async function getArtisan(slug: string): Promise<Artisan | null> {
  const { data } = await supabaseAdmin
    .from('artisans')
    .select('id, nom, metier, slug, ville, bio, services, zone_intervention, photo_url, logo_url, plateforme_active, accent, theme, leads_pause, domaine, domaine_verifie')
    .eq('slug', slug)
    .maybeSingle()
  return (data as Artisan) ?? null
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const a = await getArtisan(slug)
  // Page inexistante : on écrase tout ce que le layout racine fournit (marque Presti).
  if (!a) return { title: { absolute: 'Page introuvable' }, description: 'Cette page n’existe pas.', applicationName: 'Page introuvable', authors: [], keywords: [], robots: { index: false, follow: false }, alternates: { canonical: undefined }, openGraph: { title: 'Page introuvable', description: 'Cette page n’existe pas.', siteName: ' ' }, twitter: { card: 'summary', title: 'Page introuvable', description: 'Cette page n’existe pas.' } }
  const t = `${a.nom}${a.metier ? ` — ${a.metier}` : ''}`
  const d = a.bio || `${a.nom}${a.metier ? `, ${a.metier}` : ''}${a.zone_intervention ? ` à ${a.zone_intervention}` : ''}. Décrivez votre besoin, réponse rapide.`
  return {
    // Titre + OG ABSOLUS : marque de l'artisan seule.
    title: { absolute: t },
    description: d,
    applicationName: a.nom || undefined,
    authors: a.nom ? [{ name: a.nom }] : undefined,
    robots: { index: false, follow: false },
    // `url` DOIT être écrasée : sans elle, l'OG hérite de https://prestiapp.fr (la landing Presti)
    // défini dans le layout racine → fuite white-label dans les partages.
    // La canonique manquait : elle retombait sur celle du layout racine, donc sur la
    // landing Presti. Fuite de marque, et canonique fausse — sur la page où l'artisan
    // envoie ses clients.
    // Les mots-clés marketing de Presti étaient servis ici, hérités du layout racine.
    keywords: [a.metier, a.zone_intervention].filter(Boolean) as string[],
    // L'adresse publique ne contient jamais « presti » dès qu'un domaine neutre ou perso existe (lib/urls).
    alternates: { canonical: urlPlateforme(a) },
    openGraph: { title: t, description: d, type: 'website', url: urlPlateforme(a), ...(a.nom ? { siteName: a.nom } : {}) },
    twitter: { card: 'summary_large_image', title: t, description: d },
  }
}

export default async function PlateformePage({ params, searchParams }: Params) {
  const { slug } = await params
  const sp = (await searchParams) ?? {}
  const a = await getArtisan(slug)
  const host = (await headers()).get('host')

  // Ancienne adresse → nouvelle, définitivement (308) : un lien envoyé avant le changement
  // continue de mener à la bonne conversation.
  if (!a) {
    const actuel = await artisanParAncienSlug(slug)
    if (actuel) permanentRedirect(chemins(modeDepuisHote(host, actuel), actuel.slug).plateforme)
  }

  // Vrai 404 pour un lien inexistant ; message poli (200) si l'artisan a désactivé sa plateforme.
  if (!a) notFound()

  // Domaine vérifié : comme le site, la page de conversation ne reste pas sur une adresse Presti
  // (trouvé par domaine-perso-e2e le 05/09 : le site redirigeait, pas la conversation).
  if (a.domaine && a.domaine_verifie && host && host !== a.domaine && host !== `www.${a.domaine}`) redirect(`https://${a.domaine}/demande`)
  // Compte suspendu par la direction (v15 §5) : la même page neutre — le client d'un artisan n'a pas à savoir.
  if (await suspensionEnCours(a.id)) {
    return <main className="plat"><div className="plat-mid"><div className="plat-404"><b>Page indisponible</b><span>{MESSAGE_PUBLIC_INDISPONIBLE}</span></div></div></main>
  }
  if (a.plateforme_active === false) {
    return <main className="plat"><div className="plat-mid"><div className="plat-404"><b>Page indisponible</b><span>Ce lien de contact n&apos;est plus actif pour le moment.</span></div></div></main>
  }

  // Persona + apparence enregistrées (défauts si aucune ligne : rien ne change).
  const cfg = await getPlateformeConfig(a.id)

  // Aperçu du volet Apparence : un style passé en query, appliqué UNIQUEMENT avec ?apercu=1.
  const apercu = sp.apercu === '1'
  const ap: ApercuPayload | null = apercu ? decoderApercu(typeof sp.style === 'string' ? sp.style : null) : null

  const themeBrut = ap?.theme ?? a.theme
  const theme = (THEMES_PLAT as readonly string[]).includes(themeBrut || '') ? (themeBrut as string) : 'atelier'
  const accentBrut = ap?.accent ?? a.accent
  const accent = /^#[0-9a-fA-F]{6}$/.test(accentBrut || '') ? (accentBrut as string) : ACCENT_DEFAUT
  const style = resolvePlateformeStyle(ap?.apparence ?? cfg.apparence)
  const styleVars = plateformeStyleToCss(style, theme)
  const styleData = plateformeStyleToData(style)
  const fond = fondEffectif(style, theme)
  // Accent LISIBLE pour les petits textes : l'accent brut passe rarement 4,5:1 en 12 px.
  // En schéma « auto », l'encre dépend du réglage de l'appareil du client : les deux variantes
  // sont posées, plat.css choisit (la variable inline gagnerait sinon sur la media query).
  const encre = style.schema === 'auto' && !style.fond
    ? { '--pc-ink-clair': lisibleSur(accent, fondDuTheme(theme)), '--pc-ink-sombre': lisibleSur(accent, FOND_THEME.nuit) }
    : { '--pc-ink': lisibleSur(accent, fond) }

  const services = (Array.isArray(a.services) ? a.services : []).map((s) => (s?.nom || '').trim()).filter(Boolean)
  // Délai de réponse RÉEL mesuré sur 30 j (jamais inventé ; masqué s'il y a trop peu de données).
  const delai = apercu ? null : await computeResponseDelay(a.id)

  const avatar = (ap && 'avatar_url' in ap ? ap.avatar_url : cfg.avatar_url) || a.logo_url || a.photo_url
  const amorces = ap && ap.amorces !== undefined ? ap.amorces : cfg.amorces
  const messageAccueil = ap && ap.message_accueil !== undefined ? ap.message_accueil : cfg.message_accueil
  const nomAssistant = ap && ap.nom_assistant !== undefined ? ap.nom_assistant : cfg.nom_assistant

  return (
    <main className="plat plat-app" style={{ ['--pc' as string]: accent, ...encre, ...styleVars } as React.CSSProperties} data-theme={theme} {...styleData} {...(apercu ? { 'data-apercu': '1' } : {})}>
      <PlatChat
        slug={a.slug as string}
        infosHref={chemins(modeDepuisHote(host, a), a.slug).infos}
        artisanNom={a.nom || 'Votre artisan'}
        metier={a.metier}
        avatar={avatar}
        logoUrl={a.logo_url || a.photo_url}
        services={services}
        paused={a.leads_pause === true}
        delai={delai}
        nomAssistant={nomAssistant}
        accueilTitre={style.accueil_titre}
        accueilSousTitre={messageAccueil}
        amorcesPerso={amorces}
        apercu={apercu}
        theme={theme}
        accent={accent}
      />
    </main>
  )
}
