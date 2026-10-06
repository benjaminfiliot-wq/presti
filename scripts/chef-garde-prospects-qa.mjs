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

const propre = tache('tri', 'Classer les six catégories de produits du document produits-candidats selon les cinq critères et lister ce qui manque', 'Priorité de Benj : trouver des produits adaptés au compte de bricolage.')
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

// 06/10 : le preneur n'a pas de web ; une tâche de lecture qui l'exige est refusée dans le plan.
const web1 = tache('recherche', 'Relever les annonces eBay actives pour un kit de tournevis et noter les prix demandés', 'Alimenter la marge.', 'essai-f')
const fw = fautes([web1])
ok('GP-7 une recherche qui exige le web (annonces eBay) : plan refusé, avec la raison', fw.length > 0 && fw.some((x) => /exige du web/.test(x)), JSON.stringify(fw))
const web2 = tache('veille', 'Observer les vidéos TikTok virales de bricolage cette semaine', 'Repérer la demande.', 'essai-g')
ok('GP-8 une veille sur TikTok : plan refusé', fautes([web2]).length > 0)
const redac = tache('redaction_interne', 'Écrire le titre et la description d\'une annonce eBay.fr pour un kit de tournevis de précision', 'Préparer la mise en ligne.', 'essai-h')
ok('GP-9 une rédaction d\'annonce eBay (travail d\'écriture) reste permise', fautes([redac]).length === 0, JSON.stringify(fautes([redac])))
const tri = tache('tri', 'Trier les quatorze tâches en file par domaine et lister les blocages', 'Fluidifier la file.', 'essai-i')
ok('GP-10 un tri de la file interne reste permis', fautes([tri]).length === 0, JSON.stringify(fautes([tri])))

// 06/10 : la maintenance des agents n'est pas une tâche libre (le Chef y avait dépensé 60 tâches en une nuit).
const m1 = tache('verification', 'Évaluer l\'état actuel de l\'agent preneur après son disjoncteur pour identifier les blocages persistants', 'Suivre la reprise.', 'essai-j')
const fm = fautes([m1])
ok('GP-11 une vérification sur le preneur ou son disjoncteur : plan refusé, avec la raison', fm.length > 0 && fm.some((x) => /maintenance des agents/.test(x)), JSON.stringify(fm))
const m2 = tache('redaction_interne', 'Documenter la tâche 026-151 de l\'orchestre et les leçons des échecs récurrents', 'Mémoire.', 'essai-k')
ok('GP-12 une rédaction sur une tâche 026-xxx de l\'orchestre : plan refusé', fautes([m2]).length > 0)
const m3 = tache('redaction_interne', 'Écrire trois scripts vidéo de vingt secondes pour le niveau laser, à destination du compte Brico Travaux', 'E-commerce.', 'essai-l')
ok('GP-13 un script vidéo e-commerce reste permis', fautes([m3]).length === 0, JSON.stringify(fautes([m3])))

// Sabotage : sans l'appel à motifProspects, GP-2 doit devenir rouge. On le vérifie dans le source, sans rien écrire.
const source = fs.readFileSync(path.join(ICI, 'chef', 'commun.mjs'), 'utf8')
ok('GP-6 le validateur appelle bien motifProspects (importé de garde-prospects.mjs)', /import \{ motifProspects \} from '\.\.\/usine\/garde-prospects\.mjs'/.test(source) && /motifProspects\(\[t\.objet, t\.charge\.titre, t\.charge\.pourquoi\]/.test(source))

console.log(rouges.length ? `chef-garde-prospects-qa : ÉCHEC (${rouges.join(', ')})` : 'chef-garde-prospects-qa : PASS (13 critères)')
process.exitCode = rouges.length ? 1 : 0
