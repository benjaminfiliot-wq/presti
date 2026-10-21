// lib/canaux/reseaux.ts — « Vos réseaux » (21/10/2026, drapeau canauxLiens) : la voie SANS API, utilisable aujourd'hui par tout
// artisan sur tous les réseaux. Pour chaque réseau, un lien vers SA page de conversation (marque blanche : lib/urls.ts,
// urlPlateforme — son domaine quand il en a un) marqué de la source (?src=instagram), le texte prêt à coller (bio, message
// d'accueil ou réponse automatique NATIVE du réseau), un QR code. La demande arrive dans la messagerie avec la pastille du réseau
// (leads.origine, migration 0177) et l'IA y répond comme à toute demande de la page.
//
// Module PUR, sans dépendance : lu par le navigateur (l'écran, la page /p) comme par le serveur (app/api/leads, qui n'écrit
// l'origine que si elle est dans la LISTE FERMÉE ci-dessous). Aucun texte produit ici ne dit « Presti » : le client voit l'artisan.

export const ORIGINES = [
  'whatsapp', 'instagram', 'facebook', 'linkedin', 'tiktok', 'google', 'leboncoin', 'telegram', 'youtube', 'pinterest',
  'site', 'email', 'sms', 'carte', 'flyer', 'vehicule',
] as const
export type Origine = typeof ORIGINES[number]

export const LIBELLE_ORIGINE: Record<Origine, string> = {
  whatsapp: 'WhatsApp', instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn', tiktok: 'TikTok', google: 'Google',
  leboncoin: 'Le Bon Coin', telegram: 'Telegram', youtube: 'YouTube', pinterest: 'Pinterest', site: 'Site internet',
  email: 'Signature e-mail', sms: 'SMS', carte: 'Carte de visite', flyer: 'Flyer', vehicule: 'Véhicule',
}

/** L'origine d'une demande, seulement si elle est dans la liste fermée (minuscules, 20 caractères au plus) ; null sinon. */
export function lireOrigine(x: unknown): Origine | null {
  if (typeof x !== 'string') return null
  const v = x.trim().toLowerCase()
  return v.length <= 20 && (ORIGINES as readonly string[]).includes(v) ? (v as Origine) : null
}

/** Le lien de la page de conversation marqué de sa source. `base` : urlPlateforme(artisan). */
export function lienAvecSource(base: string, origine: Origine): string {
  try {
    const u = new URL(base)
    u.searchParams.set('src', origine)
    return u.toString()
  } catch {
    return `${base}${base.includes('?') ? '&' : '?'}src=${origine}`
  }
}

export type FicheReseau = {
  origine: Origine
  /** Où coller le lien (chemin dans l'application du réseau). */
  ou: string
  /** Le texte court (bio, description, bouton). */
  bio: string
  /** Le message d'accueil / la réponse automatique NATIVE du réseau, quand il en a une ; null sinon. */
  accueil: string | null
  /** Où régler ce message automatique. */
  ouAccueil: string | null
  /** Une remarque honnête (limite du réseau). */
  note?: string
}

/** Les réseaux affichés à l'écran, dans cet ordre (les autres origines restent acceptées par /api/leads). */
export const RESEAUX_AFFICHES: readonly Origine[] = ['whatsapp', 'instagram', 'facebook', 'linkedin', 'tiktok', 'google', 'leboncoin', 'site', 'email', 'carte']

/**
 * Les textes à coller, pour UN réseau. `nom` : le nom de l'entreprise de l'artisan ; `lien` : lienAvecSource(...). Jamais « Presti ».
 * Les chemins des réglages sont ceux des applications au 21/10/2026 (ils bougent : l'écran dit « environ »).
 */
export function ficheReseau(origine: Origine, nomBrut: string | null | undefined, lien: string): FicheReseau {
  const nom = (nomBrut ?? '').trim().slice(0, 80) || 'notre entreprise'
  const accueil = `Bonjour et merci pour votre message ! Pour recevoir une réponse rapide (et un devis si besoin), décrivez votre besoin ici, photos bienvenues : ${lien}\n— ${nom}`
  switch (origine) {
    case 'whatsapp': return {
      origine, ou: 'WhatsApp Business → Paramètres → Outils pour les professionnels → Profil → Site web (et dans votre statut).',
      bio: `Demande de devis en 1 minute : ${lien}`,
      accueil, ouAccueil: 'WhatsApp Business → Outils pour les professionnels → Message d’accueil (et Message d’absence).',
    }
    case 'instagram': return {
      origine, ou: 'Instagram → Modifier le profil → Liens → Ajouter un lien externe.',
      bio: `Devis rapide : ${lien}`,
      accueil, ouAccueil: 'Meta Business Suite → Boîte de réception → Automatisations → Réponse instantanée (Instagram).',
    }
    case 'facebook': return {
      origine, ou: 'Votre Page → Modifier les détails → Site web ; ou le bouton d’action de la Page → « Envoyer un message » → lien.',
      bio: `Une question, un devis ? Écrivez-nous ici : ${lien}`,
      accueil, ouAccueil: 'Meta Business Suite → Boîte de réception → Automatisations → Réponse instantanée (Messenger).',
    }
    case 'linkedin': return {
      origine, ou: 'Votre Page entreprise → Modifier la Page → Bouton personnalisé (« Nous contacter ») → URL ; et la section Coordonnées de votre profil.',
      bio: `Un projet ? Décrivez-le en une minute : ${lien}`,
      accueil: `Bonjour, merci pour votre message. Pour vous répondre vite et précisément, vous pouvez décrire votre projet ici : ${lien}\n— ${nom}`,
      ouAccueil: 'LinkedIn n’a pas de réponse automatique : gardez ce texte pour répondre en un collage.',
    }
    case 'tiktok': return {
      origine, ou: 'TikTok (compte professionnel) → Modifier le profil → Site web.',
      bio: `Devis en 1 minute : ${lien}`,
      accueil: null, ouAccueil: null,
      note: 'Le lien cliquable dans la bio dépend du type de compte TikTok (compte professionnel).',
    }
    case 'google': return {
      origine, ou: 'Fiche d’établissement Google → Modifier le profil → Coordonnées → Site web (ou lien de prise de rendez-vous).',
      bio: lien,
      accueil: null, ouAccueil: null,
      note: 'La messagerie de la fiche Google a été arrêtée par Google le 31/07/2024 : le lien du site est la voie qui reste.',
    }
    case 'leboncoin': return {
      origine, ou: 'Le Bon Coin n’autorise pas les liens dans les annonces.',
      bio: '', accueil: null, ouAccueil: null,
      note: 'Branchez plutôt la boîte e-mail qui reçoit les notifications Le Bon Coin : chaque message arrive ici avec une réponse préparée.',
    }
    case 'email': return {
      origine, ou: 'Votre messagerie → Réglages → Signature.',
      bio: `Demande de devis en ligne : ${lien}`, accueil: null, ouAccueil: null,
    }
    case 'carte': case 'flyer': case 'vehicule': return {
      origine, ou: 'Imprimez le QR code ci-dessous (carte de visite, flyer, véhicule, devis papier).',
      bio: `Scannez pour une demande de devis — ${nom}`, accueil: null, ouAccueil: null,
    }
    default: return { origine, ou: 'Collez le lien là où vos clients vous trouvent.', bio: `Écrivez-nous ici : ${lien}`, accueil: null, ouAccueil: null }
  }
}
