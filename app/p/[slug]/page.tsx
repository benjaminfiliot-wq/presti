import type { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import PlatChat from './PlatChat'
import { computeResponseDelay } from '@/lib/platStats'
import { lisibleSur } from '@/lib/contrast'
import { fondDuTheme } from '@/lib/themeFonds'
import { headers } from 'next/headers'
import { permanentRedirect } from 'next/navigation'
import { chemins, modeDepuisHote, urlPlateforme } from '@/lib/urls'
import { artisanParAncienSlug } from '@/lib/slugRedirect'

// LA PLATEFORME (v4 §A1/§A2) : une application de conversation à la marque de l'artisan,
// pas une page de contact décorée. La présentation (prestations, réalisations) vit sur le SITE.
// White-label absolu : aucune mention de Presti.

type Service = { nom?: string; description?: string }
type Artisan = {
  id: string
  nom: string | null; metier: string | null; slug: string | null; ville: string | null
  bio: string | null; services: Service[] | null; zone_intervention: string | null
  photo_url: string | null; logo_url: string | null; plateforme_active: boolean | null
  accent: string | null; theme: string | null; leads_pause: boolean | null
  domaine: string | null; domaine_verifie: boolean | null
}

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
  if (!a) return { title: { absolute: 'Page introuvable' }, robots: { index: false } }
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

export default async function PlateformePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const a = await getArtisan(slug)
  const host = (await headers()).get('host')

  // Ancienne adresse → nouvelle, définitivement (308) : un lien envoyé avant le changement
  // continue de mener à la bonne conversation.
  if (!a) {
    const actuel = await artisanParAncienSlug(slug)
    if (actuel) permanentRedirect(chemins(modeDepuisHote(host, actuel), actuel.slug).plateforme)
  }

  if (!a || a.plateforme_active === false) {
    return <main className="plat"><div className="plat-mid"><div className="plat-404"><b>Page introuvable</b><span>Ce lien de contact n&apos;existe pas ou n&apos;est plus actif.</span></div></div></main>
  }

  const accent = /^#[0-9a-fA-F]{6}$/.test(a.accent || '') ? (a.accent as string) : '#D97757'
  const theme = ['atelier', 'nuit', 'epure', 'chantier', 'bleu', 'vitrine'].includes(a.theme || '') ? (a.theme as string) : 'atelier'
  const services = (Array.isArray(a.services) ? a.services : []).map((s) => (s?.nom || '').trim()).filter(Boolean)
  // Délai de réponse RÉEL mesuré sur 30 j (jamais inventé ; masqué s'il y a trop peu de données).
  const delai = await computeResponseDelay(a.id)

  return (
    <main className="plat plat-app" style={{ ['--pc' as string]: accent, ['--pc-ink' as string]: lisibleSur(accent, fondDuTheme(theme)) }} data-theme={theme}>
      <PlatChat
        slug={a.slug as string}
        infosHref={chemins(modeDepuisHote(host, a), a.slug).infos}
        artisanNom={a.nom || 'Votre artisan'}
        metier={a.metier}
        avatar={a.logo_url || a.photo_url}
        services={services}
        paused={a.leads_pause === true}
        delai={delai}
      />
    </main>
  )
}
