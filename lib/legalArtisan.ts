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
  mediateur_nom: string | null
  mediateur_url: string | null
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
    {
      cle: 'mediateur',
      label: 'Médiateur de la consommation',
      valeur: a.mediateur_nom
        ? [a.mediateur_nom, a.mediateur_url].filter(Boolean).join(' — ')
        : null,
      // Art. L.616-1 c. conso : obligatoire dès qu'on vend à des particuliers.
      // On ne l'invente pas : une page qui évoque « un médiateur » sans le nommer
      // est une affirmation non fondée de plus.
      obligatoire: true,
    },
  ]
}

/** Les mentions obligatoires qui manquent — sert à prévenir l'artisan dans sa console. */
export function mentionsManquantes(a: ArtisanLegal): string[] {
  return mentionsObligatoires(a).filter((m) => m.obligatoire && !m.valeur).map((m) => m.label)
}

// ── Mentions BLOQUANTES avant émission (audit v4 §3 : « 10/10 comptes ont siret = null »).
//
// Un devis ou une facture qui SORT sans ces mentions expose l'artisan : 15 € d'amende par
// mention manquante (art. L.441-9 c. com., art. 242 nonies A ann. II CGI), et jusqu'à
// 3 000 € pour l'absence de l'assurance décennale sur un devis du bâtiment (art. L.243-2
// c. assurances). On bloque donc l'ENVOI d'un devis et la CRÉATION d'une facture — jamais
// la sauvegarde d'un brouillon : l'artisan peut travailler, il ne peut pas émettre.
//
// Le médiateur (obligatoire sur le site) et le contact public ne bloquent pas ici : ils
// sont signalés dans la console, mais leur absence sur le document n'entraîne pas la
// même sanction, et bloquer davantage empêcherait de facturer.
export const MENTIONS_EMISSION: readonly string[] = ['nom', 'forme', 'siret', 'adresse', 'assurance']

/** Où l'artisan remplit ces mentions. Une seule vérité, réutilisée dans le message et le lien. */
export const OU_REMPLIR = { lien: '/parametres', label: 'Paramètres → Entreprise & légal' }

/** Les mentions dont l'absence interdit d'émettre (devis envoyé, facture créée). */
export function mentionsManquantesEmission(a: ArtisanLegal): string[] {
  return mentionsObligatoires(a)
    .filter((m) => MENTIONS_EMISSION.includes(m.cle) && !m.valeur)
    .map((m) => m.label)
}

/**
 * Le message rendu à l'artisan quand on refuse d'émettre : quoi remplir, et où.
 * `quoi` = « ce devis » / « cette facture ».
 */
export function messageMentionsBloquantes(manquantes: string[], quoi: string): string {
  const liste = manquantes.join(', ')
  return `Impossible d'émettre ${quoi} : il manque ${manquantes.length > 1 ? 'des mentions obligatoires' : 'une mention obligatoire'} (${liste}). ` +
    `Renseignez-${manquantes.length > 1 ? 'les' : 'la'} dans ${OU_REMPLIR.label}, puis réessayez. Votre brouillon est conservé.`
}

/** Colonnes à lire sur `artisans` pour appeler mentionsManquantesEmission (évite un select('*')). */
export const COLONNES_LEGALES =
  'nom, metier, forme_juridique, siret, adresse, code_postal, ville, tel_public, email_public, tva_num, assurance_nom, assurance_contrat, assurance_activites, assurance_zone, zone_intervention, mediateur_nom, mediateur_url'

/** Normalise une ligne `artisans` (colonnes possiblement absentes) en ArtisanLegal. */
export function versArtisanLegal(a: Record<string, unknown> | null | undefined): ArtisanLegal {
  const s = (k: string): string | null => {
    const v = a?.[k]
    return typeof v === 'string' && v.trim() ? v.trim() : null
  }
  return {
    nom: s('nom'), metier: s('metier'), forme_juridique: s('forme_juridique'), siret: s('siret'),
    adresse: s('adresse'), code_postal: s('code_postal'), ville: s('ville'),
    tel_public: s('tel_public'), email_public: s('email_public'), tva_num: s('tva_num'),
    assurance_nom: s('assurance_nom'), assurance_contrat: s('assurance_contrat'),
    assurance_activites: s('assurance_activites'), assurance_zone: s('assurance_zone'),
    zone_intervention: s('zone_intervention'), mediateur_nom: s('mediateur_nom'), mediateur_url: s('mediateur_url'),
  }
}

// ── Durées de conservation : ce qui est ANNONCÉ est ce qui est APPLIQUÉ.
//
// Le défaut trouvé par l'audit final (auditeur B, majeur C6) : ces pages annonçaient
// « 3 ans », « 12 mois » en toutes lettres, et aucune ligne de code ne les appliquait — rien
// n'était jamais purgé. Une durée promise que la base ne tient pas est le pire des deux
// mondes : elle ne protège personne et elle constitue l'écart démontrable qu'un contrôle
// cherche (RGPD art. 5.1 e « limitation de la conservation », art. 13.2 a « durée annoncée »).
//
// Les durées vivent donc ici en NOMBRES DE MOIS, pas en phrases. `lib/purgesRgpd.ts` les
// exécute, les pages légales les affichent via `libelleDuree`. Changer un chiffre change les
// deux d'un coup : le document et la base ne peuvent plus diverger.

/** Clés des durées — sert à relier un traitement affiché à la purge qui l'applique. */
export type CleDuree = 'conversation' | 'comptable' | 'anti_abus'

export const DUREES_MOIS: Record<CleDuree, number> = {
  /** Conversation (lead + messages) sans nouvel échange. Purgée par `purgerConversationsSansSuite`. */
  conversation: 36,
  /**
   * Pièces comptables : facture émise, et le devis / le client qu'elle cite.
   * Obligation légale (art. L. 102 B du LPF) : JAMAIS purgées par le cron — la durée figure
   * ici pour être affichée, pas pour déclencher une suppression automatique.
   */
  comptable: 120,
  /** Anti-abus : empreintes d'IP, horodatages d'abus, bannissements expirés. */
  anti_abus: 12,
}

/**
 * La durée telle qu'elle se lit sur les pages (« 12 mois », « 3 ans »), tirée du nombre
 * réellement appliqué. En dessous de deux ans on garde les mois : « 1 an » pour douze mois
 * se lit comme un arrondi, alors que la politique annonce précisément douze mois.
 */
export function libelleDuree(mois: number): string {
  return mois >= 24 && mois % 12 === 0 ? `${mois / 12} ans` : `${mois} mois`
}

/**
 * Les traitements de données opérés sur les surfaces de l'artisan.
 * Écrits ici une fois pour toutes : l'artisan n'a pas à rédiger une politique de
 * confidentialité, et surtout il ne doit pas avoir à deviner ce que l'outil collecte.
 */
export const TRAITEMENTS: { cle: CleDuree; finalite: string; donnees: string; base: string; duree: string }[] = [
  {
    cle: 'conversation',
    finalite: 'Répondre à votre demande de devis et échanger avec vous',
    donnees: 'Nom, coordonnées (email ou téléphone), description de votre projet, photos que vous envoyez, historique de la conversation',
    base: 'Mesures précontractuelles prises à votre demande (RGPD art. 6.1.b)',
    duree: `${libelleDuree(DUREES_MOIS.conversation)} à compter de notre dernier échange`,
  },
  {
    cle: 'comptable',
    finalite: 'Établir un devis, puis une facture si les travaux sont réalisés',
    donnees: 'Nom, adresse de facturation, adresse du chantier, détail des prestations et montants',
    base: 'Exécution du contrat, puis obligation légale de conservation comptable',
    duree: `${libelleDuree(DUREES_MOIS.comptable)} pour les pièces comptables (art. L. 102 B du LPF)`,
  },
  {
    cle: 'anti_abus',
    finalite: 'Protéger le service contre les abus (envois massifs, robots)',
    donnees: 'Empreinte pseudonymisée de l’adresse IP (jamais l’adresse en clair), horodatage des envois',
    base: 'Intérêt légitime à préserver le service',
    duree: libelleDuree(DUREES_MOIS.anti_abus),
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
  // La durée vient de DUREES_MOIS : la phrase de collecte et la purge qui l'applique ne
  // peuvent pas se contredire (audit final, auditeur B, C6).
  return `Vos coordonnées et votre message sont transmis à ${qui} pour répondre à votre demande, et conservés ${libelleDuree(DUREES_MOIS.conversation)}. Vous pouvez y accéder, les corriger ou les faire supprimer à tout moment.`
}
