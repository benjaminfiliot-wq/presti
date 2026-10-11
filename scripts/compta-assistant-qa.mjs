// L'assistant comptable (refonte du 11/10/2026) : des fichiers en désordre → des lignes justes.
// Teste la partie pure (lib/comptaAssistant.ts) sans réseau ni IA : le masquage de ce qui part
// vers l'IA, la validation de sa réponse, l'application d'un plan, les règles de secours, et que
// chaque nombre du bilan en mots sort du calcul. Données fictives uniquement.
//   node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/compta-assistant-qa.mjs
import assert from 'node:assert/strict'
import {
  appliquerPlan, bilanEnMots, categorieParRegles, completerPlan, construireEchantillon,
  fusionnerLignes, planParRegles, validerPlanIA, CATEGORIES_DEPENSES,
} from '../lib/comptaAssistant.ts'
import { calculerVue } from '../lib/comptaArtisan.ts'
import { formatEuros } from '../lib/comptaImport.ts'

let n = 0
const ok = (cond, msg) => { assert.ok(cond, msg); n++ }
const egal = (a, b, msg) => { assert.deepEqual(a, b, msg); n++ }

// 1. Un relevé bancaire comme on en exporte : titre, date d'édition, en-tête en ligne 4,
//    colonnes Débit / Crédit, ligne de solde, catégories à trouver.
const releve = {
  nom: 'releve-fictif.csv', sensParDefaut: 'recette', texte: [
    'Banque Fictive;;;',
    'Relevé de compte édité le 01/09/2026;;;',
    ';;;',
    'Date;Libellé;Débit;Crédit',
    '02/08/2026;PRLV ASSURANCE FICTIVE DECENNALE;145,20;',
    '03/08/2026;VIR CLIENT FICTIF DUPONT;;1 250,00',
    '05/08/2026;CB POINT P FICTIF;389,90;',
    '05/08/2026;CB POINT P FICTIF;389,90;',
    '09/08/2026;CB STATION ESSO FICTIVE;72,15;',
    ';Solde au 31/08/2026;;642,75',
  ].join('\n'),
}
// 2. Un cahier de recettes à montant signé, et une feuille de synthèse qui doublerait tout.
const signe = { nom: 'cahier.xlsx · Mouvements', sensParDefaut: 'recette', texte: 'Date;Client;Montant;Statut\n10/08/2026;Client Fictif A;980,00;Impayé\n12/08/2026;Fournisseur Fictif;-120,00;Payé\n15/08/2026;Client Fictif B;450,00;Payé' }
const synthese = { nom: 'cahier.xlsx · Synthèse', sensParDefaut: 'recette', texte: 'Mois;Total recettes;Total dépenses\nAoût;1430,00;120,00' }

// — Les règles seules (l'IA en panne) —
const regles = planParRegles([releve, signe, synthese])
egal(regles.feuilles[0].ligneEntete, 2, 'en-tête trouvé sous le titre (lignes vides non comptées)')
egal(regles.feuilles[0].colonnes, { date: 0, libelle: 1, debit: 2, credit: 3 }, 'débit et crédit reconnus')
ok(regles.feuilles[1].montantSigne, 'montant signé détecté')
egal(regles.feuilles[2].role, 'vide', 'synthèse sans date ni montant écartée')
const r = appliquerPlan([releve, signe, synthese], regles)
egal(r.rangement.lignes.length, 7, '4 lignes du relevé (doublon retiré) + 3 du cahier')
egal(r.rangement.doublons, 1, 'le paiement Point P en double est retiré')
egal(r.totauxIgnores, 1, 'la ligne de solde n’est pas comptée')
const vue = calculerVue(r.rangement.lignes)
egal(vue.tableaux.recettes, 125000 + 98000 + 45000, 'recettes au centime')
egal(vue.tableaux.depenses, 14520 + 38990 + 7215 + 12000, 'dépenses au centime, montant signé rendu positif')
egal(vue.tableaux.impayes.montant, 98000, 'impayé du cahier')
const cat = Object.fromEntries(r.rangement.lignes.filter((l) => l.sens === 'depense').map((l) => [l.libelle || l.tiers, l.categorie]))
egal(cat['PRLV ASSURANCE FICTIVE DECENNALE'], 'Assurances')
egal(cat['CB POINT P FICTIF'], 'Matériaux et fournitures')
egal(cat['CB STATION ESSO FICTIVE'], 'Carburant et déplacements')
egal(categorieParRegles('Facture 2026-031 sans indice'), null, 'pas de catégorie inventée')

// — Ce qui part vers l'IA : aucun chiffre en clair —
const ech = construireEchantillon([releve, signe, synthese])
const tout = JSON.stringify(ech.feuilles.map((f) => [f.apercu, f.valeurs]))
ok(!/[0-8]/.test(tout), 'tous les chiffres sont masqués')
ok(tout.includes('99/99/9999') && tout.includes('999,99'), 'la forme reste lisible')
ok(!JSON.stringify(ech.feuilles[0].valeurs).includes('9 999,99'), 'un montant n’est pas une valeur textuelle')

// — La réponse de l'IA n'est jamais crue sur parole —
const repIA = {
  feuilles: [
    { role: 'donnees', ligneEntete: 2, colonnes: { date: 0, libelle: 1, debit: 2, credit: 3 }, montantSigne: false, sensParDefaut: 'depense', raison: 'Relevé : débits en dépenses, 1250 € en crédit.' },
    { role: 'donnees', ligneEntete: 0, colonnes: { date: 0, tiers: 1, montant: 2, statut: 3 }, montantSigne: true, sensParDefaut: 'recette', raison: 'Cahier de recettes.' },
    { role: 'synthese', ligneEntete: 0, colonnes: {}, montantSigne: false, sensParDefaut: 'recette', raison: 'Totaux par mois.' },
  ],
  categories: [
    { valeur: 'CB STATION ESSO FICTIVE', categorie: 'Véhicule' },
    { valeur: 'Texte jamais envoyé', categorie: 'Repas' },
    { valeur: 'CB POINT P FICTIF', categorie: 'Catégorie inventée' },
  ],
}
const ia = validerPlanIA(repIA, ech)
ok(ia && ia.feuilles.every(Boolean), 'plan valide accepté')
ok(!/\d/.test(ia.feuilles[0].raison), 'aucun chiffre dans une explication de l’IA')
egal(ia.categories.length, 1, 'catégorie pour un texte non envoyé ou hors liste : refusée')
egal(validerPlanIA({ ...repIA, feuilles: repIA.feuilles.slice(0, 2) }, ech), null, 'nombre de feuilles faux : tout refusé')
const pieges = [
  { colonnes: { date: 0, montant: 40 } },
  { colonnes: { date: 0, montant: 0 } },
  { colonnes: { date: 0, libelle: 1 } },
  { colonnes: { date: 0, montant: 2, debit: 3 } },
  { colonnes: { date: 0, montant: 2, inconnu: 3 } },
  { ligneEntete: 99 },
  { role: 'supprimer' },
  { sensParDefaut: 'autre' },
]
for (const p of pieges) egal(validerPlanIA({ ...repIA, feuilles: [{ ...repIA.feuilles[0], ...p }, repIA.feuilles[1], repIA.feuilles[2]] }, ech).feuilles[0], null, `feuille piégée refusée : ${JSON.stringify(p)}`)
const complet = completerPlan(validerPlanIA({ ...repIA, feuilles: [{ ...repIA.feuilles[0], colonnes: { date: 0, montant: 40 } }, repIA.feuilles[1], repIA.feuilles[2]] }, ech), regles)
egal(complet.feuilles[0].colonnes, regles.feuilles[0].colonnes, 'feuille refusée : les règles prennent le relais')

// — Le plan de l'IA appliqué —
const planIA = completerPlan(ia, regles)
const r2 = appliquerPlan([releve, signe, synthese], planIA)
egal(r2.ignorees.map((x) => x.nom), ['cahier.xlsx · Synthèse'], 'la synthèse est mise de côté, pas recomptée')
egal(calculerVue(r2.rangement.lignes).tableaux.depenses, vue.tableaux.depenses, 'mêmes montants que les règles : les chiffres ne dépendent pas de l’IA')
egal(r2.rangement.lignes.find((l) => l.libelle === 'CB STATION ESSO FICTIVE').categorie, 'Véhicule', 'la catégorie de l’IA passe avant les règles')
const casse = { nom: 'casse.csv', sensParDefaut: 'depense', texte: 'Titre;;\nDate;Fournisseur;Montant\n01/08/2026;Fictif;12,00\npas une date;Fictif;3,00' }
const r3 = appliquerPlan([casse], planParRegles([casse]))
egal(r3.rangement.rejets[0].ligne, 4, 'le rejet cite la ligne du fichier de l’artisan')
// Les lignes vides comptent dans la numérotation d'Excel ; une ligne « TOTAL » en capitales est une somme.
const trous = { nom: 'trous.csv', sensParDefaut: 'recette', texte: 'Mes chantiers;;\n;;\nDate;Client;Montant\n01/08/2026;Fictif;12,00\n;;\npas une date;Fictif;3,00\n;TOTAL;15,00' }
const r4 = appliquerPlan([trous], planParRegles([trous]))
egal(r4.rangement.rejets.map((x) => x.ligne), [6], 'ligne vide comprise : le rejet cite la ligne 6, comme Excel')
egal(r4.totauxIgnores, 1, 'la ligne TOTAL (capitales) n’est pas comptée')
ok(r4.etapes[0].texte.includes('en-tête trouvé ligne 3'), 'l’en-tête est cité à sa ligne réelle')
ok(r.etapes.some((e) => e.texte.includes('en-tête trouvé ligne 4')), 'relevé : en-tête cité ligne 4, sous le titre et la ligne vide')

// — Bilan en mots : chaque nombre sort du calcul —
const bilan = bilanEnMots(r2.rangement.lignes).join(' ')
const t = calculerVue(r2.rangement.lignes).tableaux
for (const m of [t.recettes, t.depenses, t.benefice, t.impayes.montant]) ok(bilan.includes(formatEuros(m)), `bilan cite ${formatEuros(m)}`)
const cites = bilan.match(/\d[\d\s  ]*,\d{2}\s?€/g) ?? []
const permis = new Set([t.recettes, t.depenses, t.benefice, t.impayes.montant, ...t.depensesParCategorie.map((c) => c.montant), ...t.parMois.map((m) => m.recettes)].map(formatEuros))
ok(cites.every((c) => permis.has(c)), 'aucun montant cité qui ne soit un total calculé')

// — Fusion : un second dépôt du même fichier n'ajoute rien —
const f1 = fusionnerLignes([], r.rangement.lignes)
const f2 = fusionnerLignes(f1.lignes, r.rangement.lignes)
egal([f2.ajoutees, f2.dejaLa, f2.lignes.length], [0, r.rangement.lignes.length, r.rangement.lignes.length])
ok(CATEGORIES_DEPENSES.includes('Autre'), 'liste fermée')

console.log(`PASS assistant comptable : ${n} assertions (en-tête décalé, débit/crédit, montant signé, solde et synthèse écartés, doublon, catégories, masquage, ${pieges.length} pièges de réponse IA refusés, bilan sans chiffre inventé, fusion).`)
