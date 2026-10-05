#!/usr/bin/env node
// scripts/chef-garde-prospects-qa.mjs — juge de la règle du 05/10/2026 : le plan du chef ne peut pas contenir une tâche LIBRE dont le
// texte déclenche la garde des données de prospects (scripts/usine/garde-prospects.mjs).
//
// POURQUOI : « cibler les prospects » dans le pourquoi d'une veille e-commerce a fait refuser la tâche par le preneur
// (donnees_personnelles) ; trois échecs en une heure ont ouvert le disjoncteur de l'agent et gelé toute la file (05/10, 19 h 33 UTC).
//
// Usage : node scripts/chef-garde-prospects-qa.mjs            (code 0 : PASS ; code 1 : critère rouge)
// Ce juge n'ajoute que des critères ; il ne dit rien des autres règles du validateur (chef-qa.mjs les juge).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { validerPlan } from './chef/commun.mjs'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const rouges = []
const ok = (nom, cond, detail = '') => { console.log(`${cond ? '✅' : '❌'} ${nom}${cond || !detail ? '' : ' — ' + detail}`); if (!cond) rouges.push(nom) }

const tache = (type, objet, pourquoi, cle = 'essai-a') => ({
  type, capacite: type, cle_idempotence: `chef:2026-10-05:${cle}`, objet, sortante: false,
  charge: { titre: 'Veille e-commerce', pourquoi },
})
const plan = (taches) => ({
  cycle: 'plein', brief: ['a', 'b', 'c'], compte_rendu: ['un', 'deux', 'trois'], consignes_lues: [], taches, decisions: [],
})
const fautes = (taches) => validerPlan(plan(taches), 'plein')

const propre = tache('veille', 'Identifier cinq produits de bricolage à petit prix sur AliExpress avec prix vendus sur eBay.fr', 'Priorité de Benj : trouver des produits adaptés au compte de bricolage.')
ok('GP-1 une tâche libre propre est acceptée', fautes([propre]).length === 0, JSON.stringify(fautes([propre])))

const sale = tache('veille', 'Identifier cinq produits de bricolage à petit prix sur AliExpress avec prix vendus sur eBay.fr', 'Les données serviront à cibler les prospects de la prochaine campagne.', 'essai-b')
const fs1 = fautes([sale])
ok('GP-2 « prospects » dans le pourquoi : plan refusé, avec le motif nommé', fs1.length > 0 && fs1.some((x) => /prospect/i.test(x) && /reformule/.test(x)), JSON.stringify(fs1))

const tel = tache('verification', 'Vérifier que les numéros de téléphone des artisans ne fuient pas dans les journaux', 'Sécurité des données.', 'essai-c')
ok('GP-3 « numéros de téléphone des artisans » dans l\'objet : plan refusé', fautes([tel]).length > 0)

const siren = tache('recherche', 'Rechercher le SIREN des entreprises du bâtiment les plus actives sur la région', 'Préparer la veille.', 'essai-d')
ok('GP-4 « SIREN » dans l\'objet : plan refusé', fautes([siren]).length > 0)

const code = tache('code', 'Écrire un script qui compte les prospects recensés chaque nuit dans la base', 'Mesure interne du recensement.', 'essai-e')
ok('GP-5 une tâche de code (jamais prise par le preneur) peut parler de prospects', fautes([code]).length === 0, JSON.stringify(fautes([code])))

// Sabotage : sans l'appel à motifProspects, GP-2 doit devenir rouge. On le vérifie dans le source, sans rien écrire.
const source = fs.readFileSync(path.join(ICI, 'chef', 'commun.mjs'), 'utf8')
ok('GP-6 le validateur appelle bien motifProspects (importé de garde-prospects.mjs)', /import \{ motifProspects \} from '\.\.\/usine\/garde-prospects\.mjs'/.test(source) && /motifProspects\(\[t\.objet, t\.charge\.titre, t\.charge\.pourquoi\]/.test(source))

console.log(rouges.length ? `chef-garde-prospects-qa : ÉCHEC (${rouges.join(', ')})` : 'chef-garde-prospects-qa : PASS (6 critères)')
process.exitCode = rouges.length ? 1 : 0
