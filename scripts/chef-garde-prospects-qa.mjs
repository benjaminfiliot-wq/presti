#!/usr/bin/env node
// scripts/chef-garde-prospects-qa.mjs — juge du filtre des tâches libres du chef (05 et 06/10/2026).
//
// POURQUOI : le preneur de tâches libres n'a NI web, NI fichiers, et sa garde refuse les données de prospects. Trois sortes de tâches du chef le faisaient échouer
// trois fois (donnees_personnelles ou « impossible ») et ouvraient son disjoncteur : « cibler les prospects » (05/10, 19 h 33 UTC), « relever les annonces eBay
// actives » (06/10, 6 h 33 UTC, deux heures d'arrêt), et la maintenance du preneur lui-même (60 tâches en une nuit).
// Ces règles ne REFUSENT PAS le plan (les modèles gratuits ne savaient pas se corriger : le cycle de 11 h 38 est sorti vide) : elles ÉCARTENT les tâches
// concernées au moment de les créer (scripts/chef/appliquer.mjs, via filtrerTaches de scripts/chef/commun.mjs). Le reste du plan passe.
//
// Usage : node scripts/chef-garde-prospects-qa.mjs            (code 0 : PASS ; code 1 : critère rouge)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { validerPlan, filtrerTaches, tacheEcartee } from './chef/commun.mjs'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const rouges = []
const ok = (nom, cond, detail = '') => { console.log(`${cond ? '✅' : '❌'} ${nom}${cond || !detail ? '' : ' — ' + detail}`); if (!cond) rouges.push(nom) }

const tache = (type, objet, pourquoi, cle) => ({
  type, capacite: type, cle_idempotence: `chef:2026-10-05:cle-${cle}`, objet, sortante: false,
  charge: { titre: 'Tâche du chef', pourquoi },
})
const plan = (taches) => ({ cycle: 'plein', brief: ['a', 'b', 'c'], compte_rendu: ['un', 'deux', 'trois'], consignes_lues: [], taches, decisions: [] })

// ── les tâches permises
const propre = tache('tri', 'Classer les six catégories de produits du document produits-candidats selon les cinq critères et lister ce qui manque', 'Priorité de Benj : des produits adaptés au compte de bricolage.', 'a1')
ok('GP-1 un tri de documents internes est gardé', tacheEcartee(propre) === null, String(tacheEcartee(propre)))
const redac = tache('redaction_interne', "Écrire le titre et la description d'une annonce eBay.fr pour un kit de tournevis de précision", 'Préparer la mise en ligne.', 'a2')
ok("GP-2 une rédaction d'annonce eBay (travail d'écriture) est gardée", tacheEcartee(redac) === null, String(tacheEcartee(redac)))
const script = tache('redaction_interne', 'Écrire trois scripts vidéo de vingt secondes pour le niveau laser, à destination du compte Brico Travaux', 'E-commerce.', 'a3')
ok('GP-3 un script vidéo e-commerce est gardé', tacheEcartee(script) === null, String(tacheEcartee(script)))
const code = tache('code', 'Écrire un script qui compte les prospects recensés chaque nuit dans la base', 'Mesure interne du recensement.', 'a4')
ok('GP-4 une tâche de code (jamais prise par le preneur) peut parler de prospects et de web', tacheEcartee(code) === null)

// ── les tâches écartées
const prosp = tache('veille', 'Choisir cinq produits de bricolage à petit prix pour le compte Brico Travaux', 'Les données serviront à cibler les prospects de la prochaine campagne.', 'b1')
ok('GP-5 « prospects » dans le pourquoi : tâche écartée, motif nommé', /prospect/i.test(tacheEcartee(prosp) ?? ''), String(tacheEcartee(prosp)))
ok("GP-6 « numéros de téléphone des artisans » dans l'objet : écartée", tacheEcartee(tache('verification', 'Vérifier que les numéros de téléphone des artisans ne fuient pas dans les journaux', 'Sécurité.', 'b2')) !== null)
ok("GP-7 « SIREN » dans l'objet : écartée", tacheEcartee(tache('recherche', 'Rechercher le SIREN des entreprises du bâtiment les plus actives sur la région', 'Préparer la veille.', 'b3')) !== null)
const web1 = tache('recherche', 'Relever les annonces eBay actives pour un kit de tournevis et noter les prix demandés', 'Alimenter la marge.', 'c1')
ok('GP-8 une recherche qui exige le web (annonces eBay) : écartée, raison « web »', /web/.test(tacheEcartee(web1) ?? ''), String(tacheEcartee(web1)))
ok('GP-9 une veille sur TikTok : écartée', tacheEcartee(tache('veille', 'Observer les vidéos TikTok virales de bricolage cette semaine', 'Repérer la demande.', 'c2')) !== null)
const m1 = tache('verification', "Évaluer l'état actuel de l'agent preneur après son disjoncteur pour identifier les blocages persistants", 'Suivre la reprise.', 'd1')
ok('GP-10 une vérification sur le preneur ou son disjoncteur : écartée, raison « maintenance »', /maintenance/.test(tacheEcartee(m1) ?? ''), String(tacheEcartee(m1)))
ok("GP-11 une rédaction sur une tâche 026-xxx de l'orchestre : écartée", tacheEcartee(tache('redaction_interne', "Documenter la tâche 026-151 de l'orchestre et les leçons des échecs récurrents", 'Mémoire.', 'd2')) !== null)

// ── le plan, lui, n'est JAMAIS refusé à cause de ces tâches (c'est le point du 06/10), et le filtre sépare sans modifier
const mixte = plan([propre, web1, m1])
ok('GP-12 validerPlan accepte un plan qui contient des tâches à écarter (il ne le refuse plus en bloc)', validerPlan(mixte, 'plein').length === 0, JSON.stringify(validerPlan(mixte, 'plein')))
const { gardees, ecartees } = filtrerTaches(mixte)
ok('GP-13 filtrerTaches : 1 gardée, 2 écartées avec leur clé et leur raison, le plan intact', gardees.length === 1 && gardees[0] === propre && ecartees.length === 2 && ecartees.every((e) => e.cle.startsWith('chef:') && e.raison.length > 10) && mixte.taches.length === 3, JSON.stringify(ecartees))
ok('GP-14 filtrerTaches : un plan sans tâches ou illisible ne plante pas', filtrerTaches(plan([])).gardees.length === 0 && filtrerTaches(null).ecartees.length === 0 && filtrerTaches({}).gardees.length === 0)

// ── appliquer.mjs n'envoie QUE les tâches gardées (sabotage visible : un appliquer qui reprend plan.taches) ; lecture du source, la substance des cas est ci-dessus
const appliquer = fs.readFileSync(path.join(ICI, 'chef', 'appliquer.mjs'), 'utf8')
ok('GP-15 appliquer.mjs filtre avant d\'envoyer : il appelle filtrerTaches et n\'envoie que les gardées', /filtrerTaches\(plan\)/.test(appliquer) && /\.\.\.gardees\.map\(/.test(appliquer) && !/\.\.\.plan\.taches\.map\(/.test(appliquer))
const commun = fs.readFileSync(path.join(ICI, 'chef', 'commun.mjs'), 'utf8')
ok('GP-16 le filtre repose sur la garde des prospects du preneur (import de garde-prospects.mjs)', /import \{ motifProspects \} from '\.\.\/usine\/garde-prospects\.mjs'/.test(commun))

console.log(rouges.length ? `chef-garde-prospects-qa : ÉCHEC (${rouges.join(', ')})` : 'chef-garde-prospects-qa : PASS (16 critères)')
process.exitCode = rouges.length ? 1 : 0
