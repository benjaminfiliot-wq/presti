// CRM — l'ASSISTANT DE GESTION dans l'atelier (demande du fondateur du 21/10/2026). Module PUR (aucun réseau, aucune base, aucun envoi) :
// rejoué par scripts/crm-assistant-panneau-qa.mjs.
//
// Trois choses, et seulement elles :
//  1. le CONTEXTE passé à l'assistant quand l'artisan ouvre le panneau depuis un objet de la maquette ou une fiche (« ce chantier ») :
//     sa forme (type + identifiant) est lue ici, mais son LIBELLÉ et son appartenance au compte sont relus PAR LE SERVEUR (route
//     /api/assistant) — jamais crus de l'écran ni du modèle ;
//  2. les SUGGESTIONS rapides du panneau, selon le contexte ;
//  3. le FIL D'ACTIVITÉ du poste des assistants (ce que l'assistant vient de faire, tiré de assistant_actions, filtré par compte) et la
//     clé de l'objet de la maquette à mettre en évidence quand l'assistant a agi dessus.
// La règle du produit ne change pas : ce qui est interne est fait et noté au journal ; ce qui part chez un client attend la validation de
// l'artisan (ou le pilote automatique, offre Signature, avec dix minutes pour annuler).

export const TYPES_CONTEXTE = ['chantier', 'client', 'devis', 'facture', 'commande', 'categorie', 'article', 'vehicule', 'membre', 'rappel', 'conversation'] as const
export type TypeContexte = (typeof TYPES_CONTEXTE)[number]
/** Ce que l'écran envoie (type + identifiant) — le libellé affiché à l'artisan ne sert qu'à l'écran. */
export type ContexteBrut = { type: TypeContexte; id: string }
export type ContexteAssistant = ContexteBrut & { libelle: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** La référence d'un client du CRM (lib/crm/clients.ts, trouverGroupe) : une pièce (d, l, c, f) suivie de son identifiant. */
const REF_CLIENT = /^[dlcf]-[0-9a-f-]{36}$/i
const NOM_CATEGORIE_MAX = 80

/** Lit la forme d'un contexte venu du navigateur. Toute autre forme → null (le message part SANS contexte, rien n'est inventé). */
export function lireContexteBrut(brut: unknown): ContexteBrut | null {
  if (!brut || typeof brut !== 'object' || Array.isArray(brut)) return null
  const o = brut as Record<string, unknown>
  const type = o.type
  const id = typeof o.id === 'string' ? o.id.trim() : ''
  if (typeof type !== 'string' || !(TYPES_CONTEXTE as readonly string[]).includes(type) || !id) return null
  if (type === 'client') return REF_CLIENT.test(id) ? { type, id: id.toLowerCase() } : null
  if (type === 'categorie') return id.length <= NOM_CATEGORIE_MAX && !/[\u0000-\u001f<>]/.test(id) ? { type, id } : null
  return UUID.test(id) ? { type: type as TypeContexte, id: id.toLowerCase() } : null
}

export const MOT_CONTEXTE: Record<TypeContexte, string> = {
  chantier: 'chantier', client: 'client', devis: 'devis', facture: 'facture', commande: 'commande fournisseur', categorie: 'rayon de l’inventaire',
  article: 'article de l’inventaire', vehicule: 'véhicule', membre: 'membre de l’équipe', rappel: 'rappel', conversation: 'demande',
}

/** Nettoie un libellé relu en base pour l'insérer dans le message : une ligne, sans crochets ni guillemets, borné. */
export const libellePropre = (s: string | null | undefined): string =>
  String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/[[\]«»"]/g, '').replace(/\s+/g, ' ').trim().slice(0, 120)

/**
 * La phrase NEUTRE ajoutée en tête du message de l'artisan, côté serveur, une fois le contexte vérifié : le modèle sait de quoi
 * « ce chantier » parle, sans recevoir d'identifiant (il retrouve l'objet par son nom, avec ses outils de lecture, comme d'habitude).
 */
export function texteContexte(c: { type: TypeContexte; libelle: string }): string {
  const l = libellePropre(c.libelle)
  return l ? `[Contexte : ${MOT_CONTEXTE[c.type]} « ${l} »]` : ''
}

export type Suggestion = { texte: string; envoi: 'direct' | 'completer' }

/** Les suggestions rapides, selon ce qui est ouvert. `direct` : un clic l'envoie ; `completer` : elle va dans la barre, à finir. */
export function suggestionsPour(c: { type: TypeContexte } | null): Suggestion[] {
  const ou: Suggestion = { texte: 'Où j’en suis aujourd’hui ?', envoi: 'direct' }
  if (!c) return [ou, { texte: 'Qu’est-ce qui attend ma validation ?', envoi: 'direct' }, { texte: 'Commande ce qui manque en stock', envoi: 'completer' }, { texte: 'Qu’est-ce qui est à facturer ?', envoi: 'direct' }]
  switch (c.type) {
    case 'chantier': return [{ texte: 'Où en est ce chantier ?', envoi: 'direct' }, { texte: 'Coche les tâches finies de ce chantier : ', envoi: 'completer' }, { texte: 'Commande ce qui manque pour ce chantier', envoi: 'completer' }, { texte: 'Qu’est-ce qui reste à facturer sur ce chantier ?', envoi: 'direct' }]
    case 'devis': return [{ texte: 'Relance ce devis', envoi: 'direct' }, { texte: 'Où en est ce devis ?', envoi: 'direct' }, ou]
    case 'facture': return [{ texte: 'Relance cette facture', envoi: 'direct' }, { texte: 'Où en est cette facture ?', envoi: 'direct' }, ou]
    case 'commande': return [{ texte: 'Où en est cette commande ?', envoi: 'direct' }, { texte: 'Note cette commande comme reçue', envoi: 'completer' }, ou]
    case 'categorie': case 'article': return [{ texte: 'Qu’est-ce qui est en alerte dans ce rayon ?', envoi: 'direct' }, { texte: 'Commande ce qui manque', envoi: 'completer' }, { texte: 'Ajoute au stock : ', envoi: 'completer' }]
    case 'client': case 'conversation': return [{ texte: 'Résume-moi ce client', envoi: 'direct' }, { texte: 'Prépare une réponse à ce client', envoi: 'completer' }, ou]
    case 'membre': case 'vehicule': return [{ texte: 'Où est-il prévu cette semaine ?', envoi: 'direct' }, ou]
    case 'rappel': return [{ texte: 'Qu’ai-je à faire aujourd’hui ?', envoi: 'direct' }, ou]
  }
}

/** Le contexte d'un objet de la maquette (lib/crm/atelier.ts, ObjetScene) ; null pour un objet sans sujet précis (accueil, bureau…). */
export function contexteDeObjet(o: { type: string; ref: string; libelle: string }): ContexteAssistant | null {
  const c = (type: TypeContexte): ContexteAssistant | null => { const b = lireContexteBrut({ type, id: o.ref }); return b ? { ...b, libelle: o.libelle } : null }
  switch (o.type) {
    case 'chantier': return c('chantier')
    case 'vehicule': return c('vehicule')
    case 'membre': return c('membre')
    case 'categorie': return c('categorie')
    default: return null
  }
}

// ═══════════════════════ Le fil d'activité du poste des assistants ═══════════════════════

/** Une ligne de assistant_actions telle que la route d'activité la lit (jamais le contenu des messages ni des entrées). */
export type ActionLue = {
  id: string; artisan_id: string; outil: string; mode: 'direct' | 'confirmation'; statut: string; titre: string
  objet_type: string | null; objet_id: string | null; cree_le: string; maj_le: string
}
export type EtatActivite = 'fait' | 'a_confirmer' | 'ecarte' | 'annule' | 'echec' | 'en_cours' | 'expire'
export type LigneActivite = { id: string; quand: string; etat: EtatActivite; texte: string; objet: { type: string; id: string } | null }
export type CompteursActivite = { faitesAujourdhui: number; aConfirmer: number; envoyeesAujourdhui: number }

export const LIBELLE_ETAT: Record<EtatActivite, string> = {
  fait: 'Fait', a_confirmer: 'À confirmer', ecarte: 'Écartée', annule: 'Annulée', echec: 'Non exécutée', en_cours: 'En cours', expire: 'Expirée',
}

/** L'état lisible d'une action : une carte en attente dont l'échéance est passée est « expirée », pas « à confirmer ». */
export function etatDe(a: Pick<ActionLue, 'statut'> & { expire_le?: string | null }, maintenant: Date): EtatActivite {
  switch (a.statut) {
    case 'executee': return 'fait'
    case 'en_attente': return a.expire_le && Date.parse(a.expire_le) < maintenant.getTime() ? 'expire' : 'a_confirmer'
    case 'refusee': return 'ecarte'
    case 'annulee': return 'annule'
    case 'echec': return 'echec'
    case 'expiree': return 'expire'
    default: return 'en_cours'
  }
}

const premiereMaj = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
/** Une ligne d'affichage : sans caractère de contrôle, espaces resserrés, bornée (les guillemets « » restent : c'est du texte affiché). */
const uneLigne = (s: string | null | undefined): string => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160)

/** Le jour de Paris (AAAA-MM-JJ) d'un horodatage. */
export function jourDeParis(iso: string): string {
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return ''
  return new Date(t).toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' })
}

/**
 * Le fil d'activité : les actions de CE compte seulement (un artisan_id étranger est écarté même si la lecture l'avait laissé passer),
 * les plus récentes d'abord. `noms` : le nom lisible d'un objet (chantier « Dupont », devis D-…), relu par la route sous le même compte.
 */
export function filActivite(uid: string, actions: readonly (ActionLue & { expire_le?: string | null })[], noms: Readonly<Record<string, string>>, maintenant: Date, n = 12): LigneActivite[] {
  return actions
    .filter((a) => a.artisan_id === uid)
    .slice()
    .sort((a, b) => b.maj_le.localeCompare(a.maj_le) || b.id.localeCompare(a.id))
    .slice(0, n)
    .map((a) => {
      const nom = a.objet_id ? noms[a.objet_id] : undefined
      const titre = uneLigne(a.titre) || a.outil.replace(/_/g, ' ')
      const etat = etatDe(a, maintenant)
      const texte = `${premiereMaj(titre)}${nom && !titre.toLowerCase().includes(nom.toLowerCase()) ? ` — ${nom}` : ''}`
      return { id: a.id, quand: a.maj_le, etat, texte, objet: a.objet_type && a.objet_id ? { type: a.objet_type, id: a.objet_id } : null }
    })
}

/** Les compteurs du poste, sur les actions de CE compte : faites aujourd'hui (jour de Paris), cartes qui attendent, envois confirmés aujourd'hui. */
export function compteursActivite(uid: string, actions: readonly (ActionLue & { expire_le?: string | null })[], jour: string, maintenant: Date): CompteursActivite {
  const miennes = actions.filter((a) => a.artisan_id === uid)
  const aujourdhui = miennes.filter((a) => jourDeParis(a.maj_le) === jour)
  return {
    faitesAujourdhui: aujourdhui.filter((a) => a.statut === 'executee').length,
    aConfirmer: miennes.filter((a) => etatDe(a, maintenant) === 'a_confirmer').length,
    envoyeesAujourdhui: aujourdhui.filter((a) => a.statut === 'executee' && a.mode === 'confirmation').length,
  }
}

/**
 * La clé de l'objet de la maquette à mettre en évidence quand l'assistant a agi sur `o` (type d'objet de assistant_actions). null quand
 * l'objet n'a pas de place dans la maquette. `cles` : les clés présentes dans la scène (un objet hors maquette n'est jamais visé).
 */
export function cleSceneDe(
  o: { type: string; id: string } | null,
  d: { chantiers: readonly { id: string; taches?: unknown }[]; materiaux: readonly { id: string; categorie: string | null }[]; commandes?: readonly { id: string; chantier_id?: string | null; lignes?: readonly { materiau_id?: string | null }[] }[]; devisChantier?: Readonly<Record<string, string>> },
  cles: readonly string[],
): string | null {
  if (!o) return null
  const presente = (k: string | null) => (k && cles.includes(k) ? k : null)
  const rayon = (materiauId: string | null | undefined) => {
    const m = materiauId ? d.materiaux.find((x) => x.id === materiauId) : undefined
    if (!m) return null
    return presente(`categorie:${m.categorie ?? ''}`) ?? cles.find((k) => k.startsWith('categorie:') && k.slice(10).toLowerCase() === String(m.categorie ?? '').toLowerCase()) ?? null
  }
  switch (o.type) {
    case 'chantier': return presente(`chantier:${o.id}`)
    case 'membre': return presente(`membre:${o.id}`)
    case 'vehicule': return presente(`vehicule:${o.id}`)
    case 'article': case 'materiau': return rayon(o.id)
    case 'commande': {
      const c = d.commandes?.find((x) => x.id === o.id)
      if (c?.chantier_id && presente(`chantier:${c.chantier_id}`)) return `chantier:${c.chantier_id}`
      return rayon(c?.lignes?.find((l) => l.materiau_id)?.materiau_id ?? null)
    }
    case 'devis': { const ch = d.devisChantier?.[o.id]; return ch ? presente(`chantier:${ch}`) : presente('bureau') }
    case 'conversation': return presente('accueil')
    case 'facture': case 'rappel': case 'tarif': return presente('bureau')
    default: return null
  }
}

/** Le fil de l'EXEMPLE (données fictives, rien de lu) : ce que le poste montre dans l'exemple et la démonstration. */
export function activiteExemple(maintenant: Date): { lignes: LigneActivite[]; compteurs: CompteursActivite } {
  const il = (min: number) => new Date(maintenant.getTime() - min * 60_000).toISOString()
  const lignes: LigneActivite[] = [
    { id: 'ex-1', quand: il(3), etat: 'fait', texte: 'Tâche « carrelage » cochée — chantier Salle de bain Morel', objet: null },
    { id: 'ex-2', quand: il(11), etat: 'a_confirmer', texte: 'Relance préparée — devis DEV-2026-0042', objet: null },
    { id: 'ex-3', quand: il(26), etat: 'fait', texte: '12 sacs de colle ajoutés au stock de l’atelier', objet: null },
    { id: 'ex-4', quand: il(48), etat: 'fait', texte: 'Rappel posé : appeler le fournisseur demain à 9 h', objet: null },
  ]
  return { lignes, compteurs: { faitesAujourdhui: 3, aConfirmer: 1, envoyeesAujourdhui: 0 } }
}

/** « il y a 3 min » / « à 14:05 ». */
export function quandLisible(iso: string, maintenant: Date): string {
  const ms = maintenant.getTime() - Date.parse(iso)
  if (!Number.isFinite(ms)) return ''
  if (ms < 60_000) return 'à l’instant'
  if (ms < 3600_000) return `il y a ${Math.floor(ms / 60_000)} min`
  return new Date(iso).toLocaleTimeString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit' })
}

// ═══════════════════════ Les événements du navigateur (ouvrir le panneau, mettre en évidence) ═══════════════════════
// Une fiche, un panneau de la maquette ou une salle d'attente ouvre l'assistant SANS connaître le composant qui l'affiche : un événement
// du document, écouté par le panneau monté dans l'atelier (ou la fiche). La mise en évidence suit le même chemin.
export const EV_OUVRIR = 'presti:assistant-ouvrir'
export const EV_SURLIGNER = 'presti:assistant-surligner'
export const EV_ACTIVITE = 'presti:assistant-activite'
/** Durée de la mise en évidence d'un objet sur lequel l'assistant vient d'agir (2 à 3 s, demande du fondateur). */
export const DUREE_SURBRILLANCE_MS = 2600

/**
 * La réponse SIMULÉE du panneau dans l'exemple et la démonstration : aucun appel à /api/assistant, aucun crédit, rien de lu ni d'écrit.
 * Elle dit ce que l'assistant ferait sur les vraies données, en respectant la règle du produit (interne = fait et noté ; client = validé).
 */
export function reponseExemple(texte: string, c: { type: TypeContexte; libelle: string } | null): string {
  const t = texte.toLowerCase()
  const sur = c ? ` (${MOT_CONTEXTE[c.type]} « ${libellePropre(c.libelle)} »)` : ''
  const fin = ' Ici, c’est l’exemple : rien n’est lu ni enregistré.'
  if (/coche|fini|termin/.test(t)) return `Sur vos données, je cocherais les tâches que vous nommez${sur}, je mettrais l’avancement à jour et je l’inscrirais au journal — une action interne, annulable d’un clic.${fin}`
  if (/relan/.test(t)) return `Sur vos données, je préparerais la relance${sur} : une carte avec le texte exact, qui ne part qu’après votre « Confirmer » (ou après dix minutes si vous avez activé le pilote automatique, offre Signature).${fin}`
  if (/command|manque/.test(t)) return `Sur vos données, je listerais ce qui est sous son seuil${sur} et je préparerais la commande au fournisseur : vous la relisez avant tout envoi.${fin}`
  if (/factur/.test(t)) return `Sur vos données, je listerais ce qui reste à facturer${sur} ; une facture n’est émise qu’après votre confirmation.${fin}`
  if (/o[uù] j.en suis|où en est|aujourd/.test(t)) return `Sur vos données, je ferais le point${sur} : chantiers du jour, retards, devis qui attendent une réponse, factures échues et rappels.${fin}`
  return `Sur vos données, je lirais ce qu’il faut${sur} pour vous répondre, et je ferais ce qui se défait d’un clic ; ce qui part chez un client attendrait votre validation.${fin}`
}
