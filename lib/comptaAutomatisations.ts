// Les automatisations de la compta de l'artisan (12/10/2026) — la partie PURE : quoi envoyer, à qui, quand.
// L'envoi lui-même (lecture de la base, Resend, mémoire de ce qui est parti) vit dans
// lib/comptaAutomatisationsTour.ts, appelé par la tâche planifiée quotidienne (app/api/cron/relances).
//
//  (b) Alerte impayé : un e-mail à l'artisan quand une facture reste impayée au-delà de N jours. « Jours
//      d'impayé » = jours de retard après l'échéance quand la facture en a une, sinon jours depuis l'émission.
//      Chaque facture n'est signalée qu'une fois (table compta_alertes_envoyees, migration 0139).
//  (c) Export mensuel : le 1er jour où la tâche passe dans un mois, le journal des factures du mois précédent
//      part en CSV à l'adresse que l'artisan a donnée (son comptable). Une seule fois par mois (dernier_export_mois).
//
// Les deux sont derrière un drapeau (lib/flags.ts : comptaAlerteImpayes, comptaExportMensuel), baissé tant que
// la migration 0139 n'est pas appliquée et que l'envoi n'a pas été vu arriver. Baissés : rien n'est lu, rien ne part,
// et l'écran n'en parle pas.
import { calculerCompta, centimes, decalerMois, euros, jourParis, type FacturePresti, type Impaye } from './comptaTableau.ts'

export const ALERTE_JOURS_PAR_DEFAUT = 15
export const ALERTE_JOURS_MIN = 1
export const ALERTE_JOURS_MAX = 180
const EMAIL_SIMPLE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export type Reglages = { alerte_impayes: boolean; alerte_jours: number; export_mensuel: boolean; export_email: string | null; dernier_export_mois: string | null }
export const REGLAGES_PAR_DEFAUT: Reglages = { alerte_impayes: false, alerte_jours: ALERTE_JOURS_PAR_DEFAUT, export_mensuel: false, export_email: null, dernier_export_mois: null }

/** Valide ce que l'artisan envoie depuis l'écran. Null + raison si c'est refusé ; rien n'est deviné. */
export function lireReglages(brut: unknown): { ok: true; reglages: Pick<Reglages, 'alerte_impayes' | 'alerte_jours' | 'export_mensuel' | 'export_email'> } | { ok: false; erreur: string } {
  if (typeof brut !== 'object' || brut === null) return { ok: false, erreur: 'Réglages illisibles.' }
  const b = brut as Record<string, unknown>
  if (typeof b.alerte_impayes !== 'boolean' || typeof b.export_mensuel !== 'boolean') return { ok: false, erreur: 'Réglages illisibles.' }
  const jours = Number(b.alerte_jours)
  if (!Number.isInteger(jours) || jours < ALERTE_JOURS_MIN || jours > ALERTE_JOURS_MAX) return { ok: false, erreur: `Le délai d’alerte va de ${ALERTE_JOURS_MIN} à ${ALERTE_JOURS_MAX} jours.` }
  const email = typeof b.export_email === 'string' ? b.export_email.trim().toLowerCase() : ''
  if (email && (email.length > 254 || !EMAIL_SIMPLE.test(email) || /[\r\n,;<>]/.test(email))) return { ok: false, erreur: 'Adresse e-mail du comptable invalide.' }
  if (b.export_mensuel && !email) return { ok: false, erreur: 'Indiquez l’adresse e-mail qui recevra l’export.' }
  return { ok: true, reglages: { alerte_impayes: b.alerte_impayes, alerte_jours: jours, export_mensuel: b.export_mensuel, export_email: email || null } }
}

export const joursImpaye = (i: Impaye): number => (i.echeance ? i.joursRetard : i.joursDepuisEmission)

/** Les factures Presti à signaler aujourd'hui : impayées depuis au moins `jours`, jamais signalées. */
export function facturesASignaler(p: { artisanId: string; factures: readonly FacturePresti[]; jours: number; dejaSignalees: ReadonlySet<string>; maintenant: Date }): Impaye[] {
  const vue = calculerCompta({ artisanId: p.artisanId, factures: p.factures, devis: [], demandes: [], lignes: [], periode: 'mois', maintenant: p.maintenant })
  return vue.impayes.filter((i) => i.origine === 'presti' && i.ref && !p.dejaSignalees.has(i.ref) && joursImpaye(i) >= p.jours)
}

const dateFr = (iso: string) => iso.split('-').reverse().join('/')

export function messageAlerte(factures: readonly Impaye[]): { sujet: string; texte: string } {
  const total = factures.reduce((n, f) => n + f.montant, 0)
  const lignes = factures.map((f) => `- ${f.client}, ${f.libelle} du ${dateFr(f.emission)} : ${euros(f.montant)}, ${f.echeance ? `${f.joursRetard} jours après l’échéance du ${dateFr(f.echeance)}` : `émise il y a ${f.joursDepuisEmission} jours`}`)
  return {
    sujet: factures.length > 1 ? `${factures.length} factures impayées à relancer` : 'Une facture impayée à relancer',
    texte: [
      'Bonjour,',
      '',
      `${factures.length > 1 ? 'Ces factures restent impayées' : 'Cette facture reste impayée'} (${euros(total)} au total) :`,
      ...lignes,
      '',
      'Ouvrez « Mes chiffres » dans Presti : le brouillon de relance est prêt, il ne reste qu’à le relire.',
      '',
      'Vous recevez cet e-mail parce que l’alerte impayés est active dans Mes chiffres. Une facture n’est signalée qu’une fois ; décochez l’alerte pour ne plus rien recevoir.',
    ].join('\n'),
  }
}

/** Le mois à exporter aujourd'hui (le mois précédent), ou null s'il est déjà parti. */
export function moisAExporter(maintenant: Date, dernierExport: string | null): string | null {
  const precedent = decalerMois(jourParis(maintenant).slice(0, 7), -1)
  return dernierExport && dernierExport >= precedent ? null : precedent
}

const NOMS_MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
export const moisEnMots = (cle: string) => `${NOMS_MOIS[+cle.slice(5, 7) - 1]} ${cle.slice(0, 4)}`

// Une cellule qui commence par = + - @ serait lue comme une formule par Excel : on la neutralise.
const cellule = (v: string) => `"${(/^[\s]*[=+\-@]|^[\t\r\n]/.test(v) ? "'" : '') + v.replace(/"/g, '""')}"`
const montantCsv = (c: number) => `${c < 0 ? '-' : ''}${(Math.abs(c) / 100).toFixed(2).replace('.', ',')}`

/**
 * Le journal des factures d'un mois, pour le comptable : TOUTES les pièces émises ce mois-là (factures, avoirs,
 * factures annulées), brouillons exclus, avec leur montant tel qu'il figure sur la pièce. Le comptable doit voir
 * l'avoir ET la facture qu'il annule : c'est l'inverse du tableau de bord, qui ne compte ni l'un ni l'autre.
 */
export function journalFacturesCsv(factures: readonly FacturePresti[], artisanId: string, mois: string): { csv: string; nombre: number } {
  const pieces = factures
    .filter((f) => f && f.artisan_id === artisanId && f.statut !== 'brouillon' && typeof f.date_emission === 'string' && f.date_emission.slice(0, 7) === mois)
    .sort((a, b) => (a.date_emission ?? '').localeCompare(b.date_emission ?? '') || (a.numero ?? '').localeCompare(b.numero ?? ''))
  const statut = (s: string | null | undefined) => (s === 'payee' ? 'Payée' : s === 'annulee' ? 'Annulée' : 'Émise')
  const entetes = ['Date', 'Numéro', 'Nature', 'Client', 'Montant', 'Statut', 'Échéance', 'Réglée le']
  // Le montant est écrit par ce module (chiffres, virgule, signe) : il n'est pas neutralisé, sinon l'avoir « -700,00 »
  // deviendrait du texte dans Excel. Tout le reste (numéro, client…) peut venir d'une saisie : neutralisé.
  const lignes = pieces.map((f) => [
    cellule(dateFr(f.date_emission!.slice(0, 10))), cellule(f.numero ?? ''), cellule(f.avoir_de ? 'Avoir' : 'Facture'), cellule(f.client_nom ?? ''),
    `"${montantCsv(centimes(f.total_ttc))}"`, cellule(statut(f.statut)), cellule(f.date_echeance ? dateFr(f.date_echeance.slice(0, 10)) : ''), cellule(f.payee_le ? dateFr(f.payee_le.slice(0, 10)) : ''),
  ].join(';'))
  return { csv: '﻿' + [entetes.map(cellule).join(';'), ...lignes].join('\r\n'), nombre: pieces.length }
}
