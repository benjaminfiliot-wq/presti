import {
  ACCROCHES_PACK, CTA_PACK, PHOTOS_PACK_MAX, PHOTOS_PACK_MIN,
  ROLES_PHOTO_PACK, TEXTE_VOIX_MAX, TEXTE_VOIX_MIN, VOIX_PACK,
  type MatierePack, type PhotoPack,
} from '@/lib/packPub'

type Erreur = { champ: string; message: string }
type Contexte = { uid: string; urlSupabase: string; photosDuSite: string[]; decennaleDeclaree: boolean }

const objet = (valeur: unknown): Record<string, unknown> =>
  valeur !== null && typeof valeur === 'object' && !Array.isArray(valeur) ? valeur as Record<string, unknown> : {}

const texte = (valeur: unknown, maximum: number): string =>
  (typeof valeur === 'string' ? valeur : '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().slice(0, maximum)

/** Garde les seules adresses apportées par l'artisan ou déjà présentes sur son dernier site. */
function adresseAutorisee(valeur: unknown, contexte: Contexte): valeur is string {
  if (typeof valeur !== 'string' || !valeur || valeur.length > 2000) return false
  if (contexte.photosDuSite.includes(valeur)) return true
  const prefixe = `${contexte.urlSupabase.replace(/\/+$/, '')}/storage/v1/object/public/artisan-media/${contexte.uid}/`
  if (!valeur.startsWith(prefixe)) return false
  const suite = valeur.slice(prefixe.length)
  return !!suite && !/[?#\\]/.test(suite) && !suite.split('/').some((segment) => segment === '..' || segment === '.' || /%2e|%2f|%5c/i.test(segment))
}

export function nettoyerDossierPack(
  entree: unknown,
  contexte: Contexte,
): { ok: true; dossier: MatierePack } | { ok: false; erreurs: Erreur[] } {
  const source = objet(entree)
  const faitsBruts = objet(source.faits)
  const erreurs: Erreur[] = []
  const erreur = (champ: string, message: string) => erreurs.push({ champ, message })

  const photosBrutes = Array.isArray(source.photos) ? source.photos : []
  if (photosBrutes.length < PHOTOS_PACK_MIN || photosBrutes.length > PHOTOS_PACK_MAX) {
    erreur('photos', `Ajoutez de ${PHOTOS_PACK_MIN} à ${PHOTOS_PACK_MAX} photos.`)
  }
  const photos: PhotoPack[] = photosBrutes.slice(0, PHOTOS_PACK_MAX).map((brute, index) => {
    const photo = objet(brute)
    const champ = `photos.${index}`
    const url = photo.url
    if (!adresseAutorisee(url, contexte)) erreur(`${champ}.url`, 'Cette photo ne provient pas de votre espace.')
    const role = ROLES_PHOTO_PACK.find((r) => r === photo.role)
    if (!role) erreur(`${champ}.role`, 'Choisissez un rôle de photo valide.')
    const personnes = photo.personnes === true
    const accord_personnes = photo.accord_personnes === true
    if (photo.personnes !== undefined && typeof photo.personnes !== 'boolean') erreur(`${champ}.personnes`, 'Indiquez si des personnes sont visibles.')
    if (photo.accord_personnes !== undefined && typeof photo.accord_personnes !== 'boolean') erreur(`${champ}.accord_personnes`, 'Indiquez si les personnes ont donné leur accord.')
    if (personnes && !accord_personnes) erreur(`${champ}.accord_personnes`, 'L’accord des personnes visibles est nécessaire.')
    if (role === 'equipe' && !personnes) erreur(`${champ}.personnes`, 'Une photo d’équipe montre des personnes.')
    const paire = texte(photo.paire, 20)
    return { url: typeof url === 'string' ? url : '', role: role ?? 'chantier', personnes, accord_personnes, ...(paire ? { paire } : {}) }
  })

  let logo_url: string | null = null
  if (source.logo_url !== undefined && source.logo_url !== null && source.logo_url !== '') {
    if (adresseAutorisee(source.logo_url, contexte)) logo_url = source.logo_url
    else erreur('logo_url', 'Ce logo ne provient pas de votre espace.')
  }

  const metier = texte(faitsBruts.metier, 40)
  const ville = texte(faitsBruts.ville, 60)
  if (!metier) erreur('faits.metier', 'Indiquez votre métier.')
  if (!ville) erreur('faits.ville', 'Indiquez votre ville.')
  const communesBrutes = Array.isArray(faitsBruts.communes) ? faitsBruts.communes : []
  const communes = communesBrutes.slice(0, 5).map((c) => texte(c, 60)).filter(Boolean)
  const cta = CTA_PACK.find((c) => c === faitsBruts.cta)
  if (!cta) erreur('faits.cta', 'Choisissez une action valide.')
  const telephone = texte(faitsBruts.telephone, 24)
  if (cta === 'appel' && !/^(?:0[1-9](?:[ .-]?\d{2}){4}|\+33[1-9](?:[ .-]?\d{2}){4})$/.test(telephone)) {
    erreur('faits.telephone', 'Indiquez un numéro français valide pour être appelé.')
  }
  const accroche = ACCROCHES_PACK.find((a) => a === source.accroche)
  if (!accroche) erreur('accroche', 'Choisissez une accroche proposée.')
  const voix = VOIX_PACK.find((v) => v === source.voix)
  if (!voix) erreur('voix', 'Choisissez une option de voix valide.')
  const texteVoixBrut = texte(source.texte_voix, TEXTE_VOIX_MAX + 1)
  const texte_voix = texteVoixBrut.slice(0, TEXTE_VOIX_MAX)
  if (voix === 'synthese') {
    if (texte_voix.length < TEXTE_VOIX_MIN) erreur('texte_voix', 'Le texte de la voix est trop court.')
    if (texteVoixBrut.length > TEXTE_VOIX_MAX) erreur('texte_voix', 'Le texte de la voix est trop long.')
    if (/\d/.test(texte_voix)) erreur('texte_voix', 'Écrivez les nombres en lettres.')
  }
  if (source.consentement_droits !== true) erreur('consentement_droits', 'Confirmez les droits sur vos photos.')

  if (erreurs.length) return { ok: false, erreurs }
  return {
    ok: true,
    dossier: {
      photos, logo_url,
      faits: {
        metier, ville, communes,
        duree_travaux: texte(faitsBruts.duree_travaux, 40) || null,
        materiaux: texte(faitsBruts.materiaux, 60) || null,
        decennale: contexte.decennaleDeclaree && faitsBruts.decennale === true,
        cta: cta!, telephone: telephone || null,
      },
      accroche: accroche!, voix: voix!, texte_voix: voix === 'synthese' ? texte_voix : null,
      consentement_droits: true,
    },
  }
}
