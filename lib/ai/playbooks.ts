// Playbooks de qualification par intention (v5 §7) — branchés sur `analyzeLead`.
//
// Un playbook dit, pour une intention détectée déterministiquement, DANS QUEL ORDRE
// l'assistant avance : ce qui prime (sécurité, escalade), les questions utiles, et la
// SUITE à proposer une fois qu'on en sait assez (devis brouillon, RDV, rappel). Chaque
// playbook plafonne à 3 questions sur TOUTE la conversation : au-delà, on ne questionne
// plus, on propose. C'est ce qui empêche l'assistant de faire passer un interrogatoire.
//
// Module pur : testable avec `node --experimental-strip-types`.
import type { ProfilMetier } from './metiers'

export type Intention = 'urgence' | 'reclamation' | 'rdv' | 'prix' | 'info'

export type Playbook = {
  intention: Intention
  titre: string
  /** Ce qui passe avant tout le reste. */
  priorite: string
  /** Les questions utiles, dans l'ordre (3 au plus seront posées). */
  questions: string[]
  /** La suite à proposer quand on en sait assez, ou quand le plafond est atteint. */
  suite: string
  /** Outils de l'assistant pertinents pour cette intention (lib/ai/outils.ts). */
  outils: string[]
  /** Réclamation : l'humain reprend la main tout de suite. */
  escaladeImmediate: boolean
}

export const MAX_QUESTIONS = 3

export const PLAYBOOKS: Record<Intention, Playbook> = {
  urgence: {
    intention: 'urgence',
    titre: 'URGENCE',
    priorite: 'SÉCURITÉ D’ABORD : donne le geste immédiat qui limite les dégâts (couper l’arrivée d’eau générale / couper le courant au disjoncteur général / fermer le gaz, aérer, ne rien allumer), en une phrase claire. Puis rassure : la demande est prise au sérieux.',
    questions: ['Avez-vous pu couper (l’eau / le courant / le gaz) ?', 'Où exactement et depuis quand ?', 'À quelle adresse et à quel numéro peut-on vous joindre tout de suite ?'],
    suite: 'propose un CRÉNEAU d’intervention ou un rappel immédiat (outil proposer_rdv après consulter_disponibilites) — sans promettre une heure précise que l’artisan n’a pas déclarée.',
    outils: ['consulter_disponibilites', 'proposer_rdv', 'escalader'],
    escaladeImmediate: false,
  },
  reclamation: {
    intention: 'reclamation',
    titre: 'RÉCLAMATION',
    priorite: 'ESCALADE HUMAINE IMMÉDIATE : accuse réception avec sérieux, dis que l’artisan reprend personnellement le dossier et le recontacte, sans reconnaître de faute ni promettre de geste. Aucune question technique : l’humain s’en charge.',
    questions: ['Quel est le meilleur moment et le meilleur moyen pour que l’artisan vous rappelle ?'],
    suite: 'appelle l’outil escalader(motif) et termine par « il vous recontacte personnellement » — pas de devis, pas de RDV automatique.',
    outils: ['escalader'],
    escaladeImmediate: true,
  },
  rdv: {
    intention: 'rdv',
    titre: 'RENDEZ-VOUS',
    priorite: 'Le client veut une date : consulte les disponibilités déclarées (outil consulter_disponibilites) et propose des créneaux UNIQUEMENT dans ce cadre ; sinon demande ses disponibilités.',
    questions: ['Quels jours et quelles plages horaires vous arrangent ?', 'Adresse du chantier (pour organiser la tournée) ?', 'Est-ce pour une visite de chiffrage ou une intervention ?'],
    suite: 'propose 2 ou 3 créneaux compatibles (outil proposer_rdv) ou un rappel téléphonique pour caler la date.',
    outils: ['consulter_disponibilites', 'proposer_rdv'],
    escaladeImmediate: false,
  },
  prix: {
    intention: 'prix',
    titre: 'DEVIS / PRIX',
    priorite: 'AUCUN chiffre dans le message. Qualifie ce qu’il faut pour chiffrer : surface ou quantités, matériaux ou matériel, photos, accès, délai souhaité.',
    questions: ['Surface / quantités / dimensions ?', 'Matériaux ou matériel souhaités (ou déjà achetés) ?', 'Une ou deux photos de l’existant, et l’accès (étage, ascenseur, stationnement) ?'],
    suite: 'quand tu as l’essentiel (ou après 3 questions), propose de PRÉPARER UN DEVIS (outil creer_devis_brouillon) que l’artisan validera — c’est le devis qui portera les prix.',
    outils: ['demander_photo', 'consulter_prix', 'creer_devis_brouillon'],
    escaladeImmediate: false,
  },
  info: {
    intention: 'info',
    titre: 'INFORMATION / DEMANDE OUVERTE',
    priorite: 'Réponds utilement à ce qui est demandé, puis cadre le besoin avec les questions du métier qui manquent.',
    questions: ['Pouvez-vous préciser ce qui est à faire et où ?', 'Dimensions ou quantités approximatives ?', 'Une photo de l’existant ?'],
    suite: 'propose la prochaine étape concrète : devis brouillon, visite, ou rappel.',
    outils: ['demander_photo', 'creer_devis_brouillon', 'proposer_rdv'],
    escaladeImmediate: false,
  },
}

/**
 * Le playbook d'une intention, enrichi des questions du métier quand elles sont plus
 * précises que les génériques (devis / info). Toujours plafonné à MAX_QUESTIONS.
 */
export function playbookPour(intention: Intention, metier?: ProfilMetier | null): Playbook {
  const base = PLAYBOOKS[intention] ?? PLAYBOOKS.info
  if ((intention === 'prix' || intention === 'info') && metier && metier.id !== 'generique') {
    return { ...base, questions: metier.questions.slice(0, MAX_QUESTIONS) }
  }
  return { ...base, questions: base.questions.slice(0, MAX_QUESTIONS) }
}

/** Nombre de questions dans un texte (une phrase interrogative = une question). */
export function compterQuestions(texte: string): number {
  return ((texte || '').match(/\?/g) || []).length
}

/** Questions déjà posées par l'assistant / l'artisan dans le fil (messages sortants). */
export function questionsDejaPosees(history: { sens: 'in' | 'out'; contenu: string }[]): number {
  let n = 0
  for (const t of history) if (t.sens === 'out') n += compterQuestions(t.contenu)
  return n
}

/** Le bloc injecté dans le prompt système, calé sur ce qui a DÉJÀ été demandé. */
export function blocPlaybook(pb: Playbook, ctx: { questionsDejaPosees?: number; avecOutils?: boolean } = {}): string {
  const deja = Math.max(0, ctx.questionsDejaPosees ?? 0)
  const reste = Math.max(0, MAX_QUESTIONS - deja)
  const consigneQuestions =
    reste === 0
      ? `PLAFOND ATTEINT : ${deja} question(s) déjà posée(s) dans cette conversation → tu ne poses PLUS AUCUNE question. Tu proposes la suite.`
      : `Questions utiles si l’information manque, dans cet ordre (${deja} déjà posée(s), il t’en reste ${reste} au maximum, en UNE salve) : ${pb.questions.map((q, i) => `(${i + 1}) ${q}`).join(' ')}`
  const outils = ctx.avecOutils && pb.outils.length ? `\n- Outils pertinents : ${pb.outils.join(', ')}.` : ''
  return `

PLAYBOOK ${pb.titre} :
- ${pb.priorite}
- ${consigneQuestions}
- Suite à proposer : ${pb.suite}${outils}`
}
