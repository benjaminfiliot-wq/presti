// Existence juridique des surfaces de l'artisan (v4 §16.5, correctif du 2026-09-03).
//
// Le défaut trouvé par l'audit : le site vitrine et la plateforme de contact n'avaient
// AUCUNE mention légale ni information sur les données. Or :
//  • un site professionnel doit porter les mentions de l'article 6-III de la LCEN ;
//  • la plateforme collecte nom, coordonnées, description de panne, photos de domicile
//    et adresse IP, sans dire un mot des finalités, des durées ni des droits (RGPD art. 13).
// Et c'est l'ARTISAN qui est responsable de traitement : c'est lui que la CNIL
// sanctionnerait, pour un site que Presti a produit.
//
// Règle tenue ici, la même que partout : **aucune donnée inventée**. Un champ que
// l'artisan n'a pas renseigné n'est pas comblé par une formule creuse — on écrit
// honnêtement qu'il manque, et on le lui dit dans sa console.

export type ArtisanLegal = {
  nom: string | null
  metier: string | null
  forme_juridique: string | null
  siret: string | null
  adresse: string | null
  code_postal: string | null
  ville: string | null
  tel_public: string | null
  email_public: string | null
  tva_num: string | null
  assurance_nom: string | null
  assurance_contrat: string | null
  assurance_activites: string | null
  assurance_zone: string | null
  zone_intervention: string | null
}

export type Mention = { cle: string; label: string; valeur: string | null; obligatoire: boolean }

/** Ce qui doit figurer sur les mentions légales, avec ce qui manque clairement identifié. */
export function mentionsObligatoires(a: ArtisanLegal): Mention[] {
  const adresse = [a.adresse, [a.code_postal, a.ville].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  return [
    { cle: 'nom', label: 'Dénomination', valeur: a.nom, obligatoire: true },
    { cle: 'forme', label: 'Forme juridique', valeur: a.forme_juridique, obligatoire: true },
    { cle: 'siret', label: 'SIRET', valeur: a.siret, obligatoire: true },
    { cle: 'adresse', label: 'Adresse', valeur: adresse || null, obligatoire: true },
    { cle: 'contact', label: 'Contact', valeur: [a.tel_public, a.email_public].filter(Boolean).join(' · ') || null, obligatoire: true },
    { cle: 'tva', label: 'N° de TVA intracommunautaire', valeur: a.tva_num, obligatoire: false },
    {
      cle: 'assurance',
      label: 'Assurance professionnelle',
      valeur: a.assurance_nom
        ? [a.assurance_nom,
           a.assurance_contrat ? `contrat n° ${a.assurance_contrat}` : null,
           a.assurance_activites, a.assurance_zone].filter(Boolean).join(', ')
        : null,
      // Obligatoire pour les métiers du bâtiment (garantie décennale, art. L.241-1 c. ass.).
      obligatoire: true,
    },
  ]
}

/** Les mentions obligatoires qui manquent — sert à prévenir l'artisan dans sa console. */
export function mentionsManquantes(a: ArtisanLegal): string[] {
  return mentionsObligatoires(a).filter((m) => m.obligatoire && !m.valeur).map((m) => m.label)
}

/**
 * Les traitements de données opérés sur les surfaces de l'artisan.
 * Écrits ici une fois pour toutes : l'artisan n'a pas à rédiger une politique de
 * confidentialité, et surtout il ne doit pas avoir à deviner ce que l'outil collecte.
 */
export const TRAITEMENTS: { finalite: string; donnees: string; base: string; duree: string }[] = [
  {
    finalite: 'Répondre à votre demande de devis et échanger avec vous',
    donnees: 'Nom, coordonnées (email ou téléphone), description de votre projet, photos que vous envoyez, historique de la conversation',
    base: 'Mesures précontractuelles prises à votre demande (RGPD art. 6.1.b)',
    duree: '3 ans à compter de notre dernier échange',
  },
  {
    finalite: 'Établir un devis, puis une facture si les travaux sont réalisés',
    donnees: 'Nom, adresse de facturation, adresse du chantier, détail des prestations et montants',
    base: 'Exécution du contrat, puis obligation légale de conservation comptable',
    duree: '10 ans pour les pièces comptables (art. L. 102 B du LPF)',
  },
  {
    finalite: 'Protéger le service contre les abus (envois massifs, robots)',
    donnees: 'Adresse IP, horodatage des envois',
    base: 'Intérêt légitime à préserver le service',
    duree: '12 mois',
  },
]

/** Les sous-traitants réellement utilisés — ceux-là et pas d'autres. */
export const SOUS_TRAITANTS: { nom: string; role: string; lieu: string }[] = [
  { nom: 'Presti', role: 'Éditeur de l’outil : hébergement des demandes, rédaction assistée des réponses', lieu: 'France' },
  { nom: 'Supabase', role: 'Base de données et stockage des photos', lieu: 'Union européenne (Francfort)' },
  { nom: 'Vercel', role: 'Hébergement du site et de la plateforme', lieu: 'États-Unis, encadré par les clauses contractuelles types' },
  { nom: 'Anthropic', role: 'Modèle d’intelligence artificielle qui aide à rédiger les réponses', lieu: 'États-Unis, encadré par les clauses contractuelles types' },
  { nom: 'Resend', role: 'Envoi des emails (réponses, relances, devis)', lieu: 'États-Unis, encadré par les clauses contractuelles types' },
]

/** Phrase d'information affichée AU MOMENT de la collecte (RGPD art. 13). */
export function noticeCollecte(nomArtisan: string | null): string {
  const qui = nomArtisan?.trim() || 'l’artisan'
  return `Vos coordonnées et votre message sont transmis à ${qui} pour répondre à votre demande, et conservés 3 ans. Vous pouvez y accéder, les corriger ou les faire supprimer à tout moment.`
}
