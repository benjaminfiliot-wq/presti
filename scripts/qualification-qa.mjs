// scripts/qualification-qa.mjs — le juge de la qualification d'une demande entrante (lib/qualification.ts) : le type de
// chantier lu dans le message, sans modèle d'IA (vague 2 de la refonte, 06/10/2026).
//
// Pourquoi : le tableau de bord /chiffres range les demandes par type de chantier. Relevé en production le 06/10 : 6 demandes sur
// 88 en avaient un ; mais 76 des 88 n'appartiennent plus à aucun compte (artisan_id vide, comptes de test supprimés) et ne
// s'affichent chez personne. Sur les 12 rattachées, 6 restaient sans type : « mitigeur », « vitre », « Un escalier » semé sans
// passer par la route, et toute demande arrivée par email (lib/releveCanal.ts n'appelait pas la qualification).
//
// Critères :
//   QU-1  cas réels (les demandes de production, sans nom ni contact, recopiées telles quelles fautes comprises) : le type attendu,
//         lu dans le MESSAGE seul (métier absent) ;
//   QU-2  les quatre métiers de la cible (docs/presti/STRATEGIE-GLOBALE-0610.md §1) : vocabulaire courant → bon type ;
//   QU-3  priorités : « fenêtre de toit » → Toiture, « compteur d'eau » → Plomberie, « mitigeur … fuite » → Plomberie ;
//   QU-4  pièges : aucune demande sans chantier ne reçoit de type (« prise en charge », « ma demande porte sur », « imPORTEant »,
//         « couverture décennale », « savoir », message vide, charabia) ;
//   QU-5  repli sur le métier quand le message ne tranche pas, et seulement dans ce cas ;
//   QU-6  câblage : la route du formulaire (app/api/leads/route.ts) écrit qualif.type_chantier, lib/ai.ts délègue à typeChantier,
//         et la relève email (lib/releveCanal.ts) écrit type_chantier: typeChantier(…) dans son insert.
//   QU-7  la VILLE (lib/ville.ts, décision 2 de Benj, 0133) : un nom n'est une ville que s'il est celui d'une commune de la liste
//         FERMÉE ; « à Noël », « à domicile », « poêle à bois », « sommier à lattes », « à la ronde », « dites-le à Yves » ne
//         donnent jamais une ville ; code postal vérifié ; le nom le plus long l'emporte ; les huit cas réels n'ont pas de ville ;
//   QU-8  câblage de la ville : les deux inserts (formulaire, email) écrivent ville: villeDe(message), la migration 0133 borne
//         la colonne, et la liste compte au moins 1 900 communes (17, 85, 79 en entier et les villes de 10 000 habitants).
// Sabotages (toujours joués) : sept copies dégradées du module ou des sources ; chacune doit faire rougir au moins un critère.
// Sortie : une ligne par critère, puis une par sabotage ; code 0 seulement si tout est vert et chaque sabotage est vu.
//
// Usage : node scripts/qualification-qa.mjs
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const lire = (rel) => fs.readFileSync(path.join(R, rel), 'utf8')
const SRC = { qualif: lire('lib/qualification.ts'), route: lire('app/api/leads/route.ts'), ai: lire('lib/ai.ts'), releve: lire('lib/releveCanal.ts'), ville: lire('lib/ville.ts'), migration: lire('supabase/migrations/0133_leads_ville.sql') }

// Node ≥ 22.6 retire les types d'un .ts importé (lib/qualification.ts n'importe rien). L'avertissement est coupé pour la lisibilité.
process.removeAllListeners('warning')
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'qualif-qa-'))
let n = 0
async function charger(source) {
  const f = path.join(TMP, `q${n++}.ts`)
  fs.writeFileSync(f, source)
  return import(pathToFileURL(f).href)
}

// [message, métier, attendu]
const REELS = [
  ['-fuite sur mon evier', null, 'Plomberie'],
  ['Bonjour, mon chauffe-eau de 200 L ne chauffe plus depuis hier soir. Pouvez-vous passer cette semaine ?', null, 'Plomberie'],
  ['Bonjour, je voudrais une bibliothèque sur mesure en chêne dans le salon, environ 2,40 m de large, du sol au plafond. Vous pouvez me faire un devis ?', null, 'Menuiserie'],
  ["bonjour j'ai besoin li'ntslation d'un panneau electrique", null, 'Électricité'],
  ['Bonjour, je voudrais un devis pour remplacer un mitigeur de cuisine et vérifier une petite fuite sous l’évier.', null, 'Plomberie'],
  ['Un escalier', null, 'Menuiserie'],
  ["bonjour je veux qutre vitre 120x40 dans ma chambre ce n'est pas en remplacement c'est un ajout", null, 'Vitrerie'],
  ["j'ai besoin d'installer une chaudière", null, 'Chauffage'],
]
const CIBLE = [
  ['Le robinet de la salle de bain goutte, il faudrait changer le mitigeur', null, 'Plomberie'],
  ['Entretien annuel de ma pompe à chaleur, vous faites ?', null, 'Chauffage'],
  ['Installation d’un poêle à granulés dans le séjour', null, 'Chauffage'],
  ['Je vends ma maison, il faut remettre le tableau aux normes', null, 'Électricité'],
  ['Pose d’une borne de recharge pour ma voiture dans le garage', null, 'Électricité'],
  ['Ajouter deux prises et des spots dans la chambre', null, 'Électricité'],
  ['Remplacer trois fenêtres PVC par du bois', null, 'Menuiserie'],
  ['Pose d’un parquet chêne massif dans le salon', null, 'Menuiserie'],
  ['Des meubles sur mesure sous l’escalier', null, 'Menuiserie'],
  ['Il manque des tuiles depuis le coup de vent', null, 'Toiture'],
  ['Démoussage et nettoyage des gouttières', null, 'Toiture'],
  ['Poser un Velux dans les combles', null, 'Toiture'],
]
const PRIORITES = [
  ['Ma fenêtre de toit laisse passer l’eau', null, 'Toiture'],
  ['Le compteur d’eau tourne alors que tout est fermé', null, 'Plomberie'],
  ['Remplacer un mitigeur de cuisine et une fuite sous l’évier', null, 'Plomberie'],
]
const PIEGES = [
  ['Bonjour, vous êtes disponible ?', null],
  ['Je voudrais savoir vos tarifs', null],
  ['C’est important, rappelez-moi', null],
  ['Je cherche une entreprise sérieuse, avez-vous de l’espace dans votre planning ?', null], // « prise », « pac » en sous-chaîne
  ['Ma demande porte sur une prise en charge par mon assurance', null],
  ['Prise de rendez-vous pour un premier contact', null],
  ['Vous avez une couverture décennale ?', null],
  ['Je cherche un appartement meublé', null],
  ['ergéergerverber', null],
  [',jj', null],
  ['', null],
  [null, null],
]
const REPLIS = [
  ['Je voudrais un devis', 'Chauffagiste', 'Chauffage'],
  ['Bonjour, pouvez-vous me rappeler ?', 'Couvreur zingueur', 'Toiture'],
  ['Bonjour, pouvez-vous me rappeler ?', 'Électricien', 'Électricité'],
  ['Un escalier en chêne', 'Plombier-chauffagiste', 'Menuiserie'], // le message l'emporte sur le métier
  ['Bonjour, pouvez-vous me rappeler ?', null, null],
]

// [message, ville attendue]
const VILLES = [
  ['Un escalier à Marans', 'Marans'],
  ['devis à la rochelle svp', 'La Rochelle'],
  ['Chantier à La Rochelle (17000), pour une porte', 'La Rochelle'],
  ['17230 Marans', 'Marans'],
  ['Adresse : 12 rue du Port, Marans 17230', 'Marans'],
  ['Je suis secteur de Niort', 'Niort'],
  ['Une maison sur Luçon', 'Luçon'],
  ['Résidence secondaire à Saint-Martin-de-Ré', 'Saint-Martin-de-Ré'],
  ['Un appartement aux Sables-d’Olonne', "Les Sables-d'Olonne"],
  ['Une longère à côté de Rochefort', 'Rochefort'],
  ['On habite à Aytré, chantier ensuite à Niort', 'Aytré'],
  ['Pose à Sens (89)', 'Sens'],
  ['Maison à Yves 17340', 'Yves'],
  ['75015 Paris, 3e étage', 'Paris'],
]
const SANS_VILLE = [
  'Livraison à Noël si possible', 'Avant Pâques ou à Pâques', 'Intervention à domicile', 'Un poêle à bois dans le séjour',
  'Changer le sommier à lattes', 'Le meilleur artisan à la ronde', 'Le moteur sur le tablier du volet', 'Dites-le à Yves, mon voisin',
  'Rue à sens unique', '17000 Niort', 'à saint martin', 'Un chauffe-eau à gaz', 'Chantier à 2 km', 'Vers 14 h à la maison',
  '', null,
]

function juger(mod, src, ville) {
  const res = []
  const verifier = (id, nom, cas, attendu) => {
    const fautes = []
    for (const c of cas) {
      const obtenu = mod.typeChantier(c[0], c[1])
      const voulu = attendu(c)
      if (obtenu !== voulu) fautes.push(`« ${String(c[0]).slice(0, 48)} »${c[1] ? ` (${c[1]})` : ''} → ${obtenu ?? 'null'}, ${voulu ?? 'null'} attendu`)
    }
    res.push({ id, nom, ok: fautes.length === 0, detail: fautes.length ? fautes.join(' ; ') : `${cas.length} cas` })
  }
  verifier('QU-1', 'cas réels de production', REELS, (c) => c[2])
  verifier('QU-2', 'les quatre métiers de la cible', CIBLE, (c) => c[2])
  verifier('QU-3', 'priorités entre familles', PRIORITES, (c) => c[2])
  verifier('QU-4', 'pièges sans chantier', PIEGES, () => null)
  verifier('QU-5', 'repli sur le métier', REPLIS, (c) => c[2])
  const cablage = []
  if (!/qualifyLead\(\s*message\s*,\s*artisan\.metier\s*\)/.test(src.route)) cablage.push('route : qualifyLead(message, artisan.metier) absent')
  if (!/type_chantier:\s*qualif\.type_chantier/.test(src.route)) cablage.push('route : type_chantier: qualif.type_chantier absent de l’insert')
  if (!/type_chantier:\s*typeChantier\(\s*msg\s*,\s*metier\s*\)/.test(src.ai)) cablage.push('lib/ai.ts : qualifyLead ne délègue pas à typeChantier(msg, metier)')
  if (/const TYPE_CHANTIER\s*[:=]/.test(src.ai)) cablage.push('lib/ai.ts : une seconde liste TYPE_CHANTIER (deux vérités)')
  const insertReleve = src.releve.slice(src.releve.indexOf(".from('leads').insert("), src.releve.indexOf(".from('leads').insert(") + 600)
  if (!src.releve.includes(".from('leads').insert(") || !/type_chantier:\s*typeChantier\(\s*message\s*,\s*metier\s*\)/.test(insertReleve)) cablage.push('lib/releveCanal.ts : l’insert de la demande email n’écrit pas type_chantier: typeChantier(message, metier)')
  if (!/from '@\/lib\/qualification'/.test(src.releve)) cablage.push('lib/releveCanal.ts : n’importe pas lib/qualification')
  res.push({ id: 'QU-6', nom: 'câblage formulaire + email', ok: cablage.length === 0, detail: cablage.join(' ; ') || 'route, lib/ai.ts et relève email branchés' })

  const fautesVille = []
  for (const [m, attendu] of VILLES) { const o = ville.villeDe(m); if (o !== attendu) fautesVille.push(`« ${m} » → ${o ?? 'null'}, ${attendu} attendu`) }
  for (const m of SANS_VILLE) { const o = ville.villeDe(m); if (o !== null) fautesVille.push(`« ${m} » → ${o}, null attendu`) }
  for (const c of REELS) { const o = ville.villeDe(c[0]); if (o !== null) fautesVille.push(`cas réel « ${String(c[0]).slice(0, 40)} » → ${o}, null attendu`) }
  res.push({ id: 'QU-7', nom: 'ville par liste fermée', ok: fautesVille.length === 0, detail: fautesVille.join(' ; ') || `${VILLES.length} villes, ${SANS_VILLE.length + REELS.length} messages sans ville` })

  const cablageVille = []
  for (const [nom, code] of [['route', src.route], ['relève', src.releve]]) {
    if (!/from '@\/lib\/ville'/.test(code)) cablageVille.push(`${nom} : n’importe pas lib/ville`)
    if (!/ville:\s*villeDe\(\s*message\s*\)/.test(code)) cablageVille.push(`${nom} : l’insert n’écrit pas ville: villeDe(message)`)
  }
  if (!/add column if not exists ville text/.test(src.migration) || !/leads_ville_borne check \(ville is null or char_length\(ville\) between 1 and 80\)/.test(src.migration)) cablageVille.push('0133 : colonne ou borne absente')
  if (!(ville.NB_COMMUNES >= 1900)) cablageVille.push(`liste de ${ville.NB_COMMUNES} communes (1 900 attendues au moins)`)
  res.push({ id: 'QU-8', nom: 'câblage de la ville', ok: cablageVille.length === 0, detail: cablageVille.join(' ; ') || `formulaire et email écrivent la ville ; 0133 bornée ; ${ville.NB_COMMUNES} communes` })
  return res
}

let rouge = 0
const base = await charger(SRC.qualif)
if (typeof base.typeChantier !== 'function') { console.error('✗ lib/qualification.ts n’exporte pas typeChantier'); process.exit(2) }
const baseVille = await charger(SRC.ville)
if (typeof baseVille.villeDe !== 'function') { console.error('✗ lib/ville.ts n’exporte pas villeDe'); process.exit(2) }
for (const r of juger(base, SRC, baseVille)) { console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.id} — ${r.nom} : ${r.detail}`); if (!r.ok) rouge++ }

// Sabotages : chacun doit rendre au moins un critère rouge.
const remplacer = (s, a, b) => { if (!s.includes(a)) throw new Error(`sabotage sans prise : ${a.slice(0, 50)}`); return s.replace(a, b) }
const SABOTAGES = [
  ['un mot réel retiré (« bibliotheque »)', () => ({ qualif: remplacer(SRC.qualif, "'bibliotheque', ", '') })],
  ['recherche par sous-chaîne au lieu du mot entier', () => ({ qualif: remplacer(SRC.qualif, 'return new RegExp(kk.length >= 6', 'return n.includes(kk) || new RegExp(kk.length >= 6') })],
  ['tournures neutres oubliées', () => ({ qualif: remplacer(SRC.qualif, 'for (const tour of TOURNURES_NEUTRES)', 'for (const tour of [])') })],
  ['Menuiserie passée avant Toiture', () => {
    const l = SRC.qualif.split('\n'); const iT = l.findIndex((x) => x.includes("label: 'Toiture'")); const iM = l.findIndex((x) => x.includes("label: 'Menuiserie'"))
    ;[l[iT], l[iM]] = [l[iM], l[iT]]; return { qualif: l.join('\n') }
  }],
  ['repli sur le métier coupé', () => ({ qualif: remplacer(SRC.qualif, 'return metierToType(metier)\n}', 'return null\n}') })],
  ['accents gardés à la normalisation', () => {
    const l = SRC.qualif.split('\n'); const i = l.findIndex((x) => x.includes('retire les accents'))
    if (i < 0) throw new Error('sabotage sans prise : ligne « retire les accents »')
    l[i] = ''; return { qualif: l.join('\n') }
  }],
  ['« électrique » retiré (seul « electric » reste)', () => ({ qualif: remplacer(SRC.qualif, "'electrique', ", '') })],
  ['relève email sans type de chantier', () => ({ releve: remplacer(SRC.releve, 'type_chantier: typeChantier(message, metier),', '') })],
  ['route du formulaire sans type de chantier', () => ({ route: remplacer(SRC.route, 'type_chantier: qualif.type_chantier,', '') })],
  ['ville : liste ouverte (tout nom après « à » devient une ville)', () => ({ ville: remplacer(SRC.ville, 'if (!c) continue', "if (!c) return { nom: tranche.map((m) => m.brut).join(' '), cps: [], majuscule: false, codeExige: false }") })],
  ['ville : majuscule non exigée pour les noms communs', () => ({ ville: remplacer(SRC.ville, 'if (c.majuscule && !tranche.some(', 'if (false && !tranche.some(') })],
  ['ville : prénom accepté sans code postal', () => ({ ville: remplacer(SRC.ville, 'if (c.codeExige) return null', 'if (false) return null') })],
  ['ville : code postal non vérifié', () => ({ ville: remplacer(SRC.ville, 'if (code) return c.cps.includes(code) ? c : null', 'if (code) return c') })],
  ['ville : le nom le plus court l’emporte', () => ({ ville: remplacer(SRC.ville, 'for (let l = Math.min(MOTS_MAX, mots.length - debut); l >= 1; l--)', 'for (let l = 1; l <= Math.min(MOTS_MAX, mots.length - debut); l++)') })],
  ['ville : « aux » ne vaut plus « à Les »', () => ({ ville: remplacer(SRC.ville, "[['au'], 'le'], [['aux'], 'les'],", "[['au'], 'le'],") })],
  ['ville : une commune retirée de la liste (Marans)', () => ({ ville: remplacer(SRC.ville, 'Marans|17230;', '') })],
  ['ville : route du formulaire sans ville', () => ({ route: remplacer(SRC.route, 'ville: villeDe(message),', '') })],
  ['ville : relève email sans ville', () => ({ releve: remplacer(SRC.releve, 'ville: villeDe(message),', '') })],
  ['ville : 0133 sans borne', () => ({ migration: remplacer(SRC.migration, 'between 1 and 80', 'between 1 and 800') })],
]
let manques = 0
for (const [nom, fab] of SABOTAGES) {
  const s = { ...SRC, ...fab() }
  const mod = s.qualif === SRC.qualif ? base : await charger(s.qualif)
  const modVille = s.ville === SRC.ville ? baseVille : await charger(s.ville)
  const rouges = juger(mod, s, modVille).filter((r) => !r.ok).map((r) => r.id)
  if (rouges.length) console.log(`  sabotage vu    : ${nom} → ${rouges.join(', ')}`)
  else { console.log(`  sabotage MANQUÉ : ${nom} → tout reste vert`); manques++ }
}
fs.rmSync(TMP, { recursive: true, force: true })
const ok = rouge === 0 && manques === 0
console.log(ok ? `✓ qualification : PASS — 8 critères verts, ${SABOTAGES.length} sabotages vus` : `✗ qualification : FAIL — ${rouge} critère(s) rouge(s), ${manques} sabotage(s) manqué(s)`)
process.exitCode = ok ? 0 : 1
