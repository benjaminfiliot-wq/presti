// Doublure de lib/alertes (026-045), pour file-argent-qa et tic-qa : chaque fonction exportée par lib/alertes.ts est un
// espion qui consigne son appel (et, pour enregistrerPassage, ses trois arguments). Rien n'est envoyé ni écrit.
import { jouer } from './commun-doublures.mjs'

export const CRONS_ATTENDUS = []
export const MOTIFS = []
export const envoyerAlertes = (alertes) => jouer('alertes.envoyerAlertes', alertes, () => (Array.isArray(alertes) ? alertes.length : 0))
export const garderAlerte = (al) => jouer('alertes.garderAlerte', al, undefined)
export const enregistrerPassage = (nom, detail = {}, reussi = true) => jouer('alertes.enregistrerPassage', { nom, detail, reussi }, undefined)
export const enregistrerErreur = (contexte, erreur) => jouer('alertes.enregistrerErreur', { contexte, erreur: String(erreur?.message ?? erreur) }, undefined)
export const alertePaiement = () => []
export const coutIADuMois = async () => null
export const estimationDepuisLesCredits = async () => ({ credits: 0, euros: 0 })
export const ronde = (opts) => jouer('alertes.ronde', opts ?? {}, () => ({ candidates: [], envoyees: [], ignorees: [] }))
