// Les offres AFFICHÉES = les offres VERROUILLÉES (un seul calcul, une seule écriture).
//
// Benj (15/10) : « pour les abonnements, il n'y a pas marqué le CRM, même pour la Signature ». La landing coupait la liste à cinq
// lignes (`.slice(0, 5)`) : le CRM et l'assistant, ajoutés en fin de grille, n'apparaissaient jamais sur la carte. Ce juge
// échoue si :
//   • une capacité d'une offre (PLANS[...].capacites) n'est annoncée par AUCUNE ligne de la grille (GRILLE_COMPLETE) ;
//   • une capacité du type `Capacite` n'est ni dans une offre ni déclarée « hors formules » ;
//   • une cellule contredit PLANS (une ligne dit « — » alors que l'offre a la capacité, ou « oui » alors qu'elle ne l'a pas) ;
//   • une ligne du CRM ou de l'assistant n'est pas dans la liste de Signature (ou apparaît chez Essentiel / Studio) ;
//   • 15/10 : AUCUNE capacité de la plateforme (page de conversation, réponse, comptes clients, relances, domaine, boîte e-mail…) dans Essentiel ni l'Essai ;
//   • 15/10 : « Ma plateforme » et « Mes chiffres » ne sont pas à Studio et au-dessus seulement (Essentiel et Essai exclus), ou l'automatique de
//     « Mes chiffres » n'est pas Signature seulement, ou la carte Essentiel en annonce encore quelque chose ;
//   • une page de vente recoupe la liste (.slice sur pointsForts), ne rend pas <OffreDetail />, ou recopie un prix en dur.
// Il s'attaque aussi lui-même : trois mutations de PLANS que le juge DOIT voir.
//
// Usage : node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/offres-affichage-qa.mjs

import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const RACINE = process.cwd()
const P = await import(pathToFileURL(path.join(RACINE, 'lib/plans.ts')).href)
const { PLANS, GRILLE, GRILLE_COMPLETE, CAPACITES_HORS_FORMULES, pointsForts, detailOffre } = P
const PAYANTS = ['essentiel', 'studio', 'signature']

const echecs = []
let n = 0
const ok = (cond, msg) => { n++; if (!cond) echecs.push(msg) }

/** Les capacités d'une offre qu'aucune ligne (même dont le drapeau est baissé) n'annonce. */
const nonAnnoncees = (plans, grille) => {
  const sortie = []
  for (const id of PAYANTS) for (const c of plans[id].capacites) if (!grille.some((l) => l.capacites.includes(c))) sortie.push(`${id}:${c}`)
  return sortie
}

// 1. Chaque capacité de chaque offre est annoncée par une ligne.
const manquantes = nonAnnoncees(PLANS, GRILLE_COMPLETE)
ok(manquantes.length === 0, `capacité(s) d'offre annoncée(s) par aucune ligne de la grille : ${manquantes.join(', ')}`)

// 2. Toute capacité du type est dans une offre ou déclarée hors formules.
const src = fs.readFileSync(path.join(RACINE, 'lib/plans.ts'), 'utf8')
const bloc = src.match(/export type Capacite =([\s\S]*?)type Plan = /)?.[1] ?? ''
const toutes = [...bloc.matchAll(/'([a-z_.]+)'/g)].map((m) => m[1])
ok(toutes.length >= 20, `type Capacite illisible (${toutes.length} capacités trouvées)`)
for (const c of toutes) {
  const dansUneOffre = PAYANTS.some((id) => PLANS[id].capacites.includes(c)) || PLANS.business.capacites.includes(c)
  ok(dansUneOffre || CAPACITES_HORS_FORMULES.includes(c), `la capacité « ${c} » n'est dans aucune offre ni déclarée hors formules`)
}

// 3. Les cellules disent ce que PLANS dit.
for (const l of GRILLE_COMPLETE) {
  for (const id of PAYANTS) {
    const cell = l.cellules[id]
    const a = l.capacites.map((c) => PLANS[id].capacites.includes(c))
    if (!l.capacites.length) continue
    if (cell === false) ok(!a[0], `« ${l.label} » : « — » pour ${id}, qui a pourtant la capacité ${l.capacites[0]}`)
    if (cell === true) ok(a.every(Boolean), `« ${l.label} » : « oui » pour ${id}, qui n'a pas toutes les capacités ${l.capacites.join(', ')}`)
  }
}

// 4. Signature : le CRM et l'assistant sont dans sa liste, et seulement dans la sienne (tant que les drapeaux sont levés).
const listes = Object.fromEntries(PAYANTS.map((id) => [id, pointsForts(id)]))
const details = Object.fromEntries(PAYANTS.map((id) => [id, detailOffre(id).lignes.map((x) => x.texte)]))
for (const l of GRILLE) {
  for (const id of PAYANTS) {
    const attendu = l.cellules[id] !== false && l.cellules[id] !== ''
    const t = P.texteCellule(l, l.cellules[id])
    if (attendu) ok(listes[id].includes(t) && details[id].includes(t), `« ${l.label} » (${id}) absente de la carte de l'offre`)
    else ok(!listes[id].some((x) => x.startsWith(l.label)), `« ${l.label} » apparaît dans la carte de ${id}, qui ne l'a pas`)
  }
}
for (const cap of ['crm', 'assistant']) {
  const lignes = GRILLE.filter((l) => l.capacites.includes(cap))
  ok(lignes.length >= 1, `aucune ligne visible pour la capacité ${cap} (drapeau baissé ?)`)
  for (const l of lignes) {
    ok(listes.signature.includes(P.texteCellule(l, l.cellules.signature)), `Signature ne montre pas « ${l.label} »`)
    ok(l.cellules.essentiel === false && l.cellules.studio === false, `« ${l.label} » est ouverte à une offre sans la capacité ${cap}`)
  }
}

// 5. Les pages de vente rendent TOUTE la liste et ne recopient aucun prix.
const PAGES = ['app/page.tsx', 'app/abonnement/page.tsx']
for (const f of PAGES) {
  const s = fs.readFileSync(path.join(RACINE, f), 'utf8')
  ok(/<OffreDetail\b/.test(s), `${f} ne rend pas <OffreDetail /> (le détail complet de chaque offre)`)
  ok(!/pointsForts\([^)]*\)\s*\.slice/.test(s), `${f} coupe la liste des offres (.slice sur pointsForts)`)
  ok(!/\b(29|59|99)\s?(€|euros)/.test(s.replace(/\/\/.*$/gm, '')), `${f} recopie un prix d'offre en dur (lib/plans.ts est la source)`)
}
const comp = fs.readFileSync(path.join(RACINE, 'app/Comparatif.tsx'), 'utf8')
ok(/GRILLE/.test(comp) && !/slice\(/.test(comp), 'app/Comparatif.tsx doit rendre toute la GRILLE')

// 5 bis. 15/10 (Benj) : « Ma plateforme » et « Mes chiffres » commencent avec Studio, pour TOUS les comptes ; l'automatique de « Mes chiffres »
// n'est qu'en Signature. La grille le dit, ligne par ligne, depuis PLANS ; rien n'en est annoncé en Essentiel ni dans l'Essai.
const DE = { gratuit: PLANS.gratuit, essentiel: PLANS.essentiel, studio: PLANS.studio, signature: PLANS.signature, business: PLANS.business }
for (const [cap, attendu] of [['plateforme.gestion', { gratuit: 0, essentiel: 0, studio: 1, signature: 1, business: 1 }], ['chiffres', { gratuit: 0, essentiel: 0, studio: 1, signature: 1, business: 1 }], ['chiffres.auto', { gratuit: 0, essentiel: 0, studio: 0, signature: 1, business: 1 }]]) {
  for (const [id, v] of Object.entries(attendu)) ok(DE[id].capacites.includes(cap) === !!v, `${cap} : ${id} ${v ? 'devrait' : 'ne devrait pas'} l'avoir`)
}
for (const cap of ['plateforme.gestion', 'chiffres', 'chiffres.auto']) {
  const lignes = GRILLE_COMPLETE.filter((l) => l.capacites.includes(cap))
  ok(lignes.length >= 1, `aucune ligne de la grille n'annonce ${cap}`)
  for (const l of lignes) ok(l.cellules.essentiel === false, `« ${l.label} » : Essentiel ne devrait pas l'avoir (${cap})`)
}
for (const l of GRILLE_COMPLETE.filter((x) => x.capacites.includes('chiffres.auto'))) ok(l.cellules.studio === false && l.cellules.signature !== false, `« ${l.label} » : l'automatique de Mes chiffres est Signature seulement`)
for (const l of GRILLE_COMPLETE.filter((x) => x.capacites.includes('plateforme.personnalisation_avancee'))) ok(l.cellules.essentiel === false || l.cellules.essentiel === '', `« ${l.label} » : la personnalisation de la plateforme n'est plus dans Essentiel`)
ok(!listes.essentiel.some((t) => /Ma plateforme|Mes chiffres|Thème/.test(t)), 'la carte Essentiel annonce encore « Ma plateforme », « Mes chiffres » ou le thème')
ok(listes.studio.some((t) => /Ma plateforme/.test(t)) && listes.studio.some((t) => /Mes chiffres/.test(t)), 'la carte Studio doit annoncer « Ma plateforme » et « Mes chiffres »')
ok(detailOffre('studio').lignes.some((x) => x.nouveau && /Mes chiffres/.test(x.texte)) && detailOffre('studio').lignes.some((x) => x.nouveau && /Ma plateforme/.test(x.texte)), 'Studio doit montrer « Ma plateforme » et « Mes chiffres » comme NOUVEAUX par rapport à Essentiel')
// Un drapeau baissé ne fait rien annoncer : tant que 0140 n'est pas appliquée, aucune ligne d'automatisation de Mes chiffres n'est visible.
ok(GRILLE.filter((l) => l.capacites.includes('chiffres.auto')).every((l) => l.flag && P.GRILLE.includes(l)), "une ligne d'automatisation de Mes chiffres est visible sans drapeau")

// 5 ter. 15/10 (Benj) : « La plateforme n'est disponible qu'à partir de Studio. Dans Essentiel il n'y a PAS de plateforme. » Aucune ligne de la
// grille qui annonce une capacité de la plateforme n'est ouverte à Essentiel ni à l'Essai ; la carte Essentiel n'en dit rien et dit ce qui RESTE.
const CAPS_PLATEFORME = ['plateforme.conversation', 'plateforme.comptes_clients', 'plateforme.domaine_perso', 'site.domaine_perso', 'relances', 'canaux.email', 'plateforme.ia.auto', 'plateforme.personnalisation_avancee', 'plateforme.gestion']
for (const cap of CAPS_PLATEFORME) {
  ok(PLANS.essentiel.capacites.includes(cap) === false && PLANS.gratuit.capacites.includes(cap) === false, `${cap} : Essentiel et Essai n'ont PAS la plateforme`)
  ok(PLANS.studio.capacites.includes(cap), `${cap} : Studio a la plateforme`)
  const lignes = GRILLE_COMPLETE.filter((l) => l.capacites.includes(cap))
  ok(lignes.length >= 1, `aucune ligne de la grille n'annonce ${cap}`)
  for (const l of lignes) ok(l.cellules.essentiel === false || l.cellules.essentiel === '', `« ${l.label} » : Essentiel ne devrait pas l'avoir (${cap})`)
}
{
  // La ligne « Niveau d’automatisation » dit justement « pas de plateforme » : elle est vérifiée à part (AUTOMATISATION).
  const lignesEssentiel = listes.essentiel.filter((t) => !/^Niveau d’automatisation/.test(t))
  const intrus = lignesEssentiel.filter((t) => /plateforme|Page de conversation|conversations|nom de domaine|Comptes clients|boîte email|Réponse aux demandes|Personnalisation/i.test(t))
  ok(intrus.length === 0, 'la carte Essentiel annonce encore un élément de la plateforme : ' + intrus.join(' | '))
}
ok(listes.essentiel.some((t) => /Devis chiffrés par l’IA/.test(t)) && listes.essentiel.some((t) => /Factur-X/.test(t)), 'la carte Essentiel doit garder les devis chiffrés par l’IA et les factures + Factur-X')
ok(/pas de plateforme/i.test(P.AUTOMATISATION.essentiel) && /plateforme/i.test(P.AUTOMATISATION.studio) && !/plateforme/i.test(P.AUTOMATISATION.essentiel.replace(/pas de plateforme/i, '')), "AUTOMATISATION : Essentiel dit « pas de plateforme », Studio la nomme")
ok(listes.studio.some((t) => /La plateforme : page de conversation/.test(t)) && detailOffre('studio').lignes.some((x) => x.nouveau && /La plateforme/.test(x.texte)), 'Studio doit montrer « La plateforme » comme NOUVELLE par rapport à Essentiel')
ok(P.PLANS.gratuit.capacites.length === PLANS.essentiel.capacites.length, "l'Essai garde les mêmes capacités qu'Essentiel")

// 6. Le juge se teste : ces mutations DOIVENT être vues.
const clone = () => JSON.parse(JSON.stringify(PLANS))
const m1 = clone(); m1.signature.capacites.push('site.slides3d')
ok(nonAnnoncees(m1, GRILLE_COMPLETE).includes('signature:site.slides3d'), 'mutation 1 non vue : capacité ajoutée à Signature sans ligne')
const m2 = clone(); m2.studio.capacites.push('crm')
ok(m2.studio.capacites.includes('crm') && !GRILLE_COMPLETE.some((l) => l.capacites.includes('crm') && l.cellules.studio !== false), 'mutation 2 non vue : le CRM ouvert à Studio ne contredirait pas la grille')
const sans = GRILLE_COMPLETE.filter((l) => !l.capacites.includes('assistant'))
ok(nonAnnoncees(PLANS, sans).includes('signature:assistant'), 'mutation 3 non vue : ligne de l\'assistant retirée sans que le juge ne la réclame')

// 7. Mutations 15/10 : Essentiel qui récupère « Mes chiffres » ou « Ma plateforme », Studio qui récupère l'automatique de Mes chiffres → vues.
const m4 = clone(); m4.essentiel.capacites.push('chiffres')
ok(GRILLE_COMPLETE.some((l) => l.capacites.includes('chiffres') && l.cellules.essentiel === false && m4.essentiel.capacites.includes('chiffres')), 'mutation 4 non vue : Essentiel qui a « Mes chiffres » contredirait la cellule « — »')
const m5 = clone(); m5.studio.capacites.push('chiffres.auto')
ok(GRILLE_COMPLETE.some((l) => l.capacites.includes('chiffres.auto') && l.cellules.studio === false && m5.studio.capacites.includes('chiffres.auto')), "mutation 5 non vue : Studio qui a l'automatique de Mes chiffres contredirait la cellule « — »")
const m6 = clone(); m6.essentiel.capacites.push('plateforme.gestion')
ok(m6.essentiel.capacites.includes('plateforme.gestion') && GRILLE_COMPLETE.filter((l) => l.capacites.includes('plateforme.gestion')).every((l) => l.cellules.essentiel === false), 'mutation 6 non vue')

// 15/10 : Essentiel qui récupère la page de conversation → contredirait la cellule « — ».
const m7 = clone(); m7.essentiel.capacites.push('plateforme.conversation')
ok(m7.essentiel.capacites.includes('plateforme.conversation') && GRILLE_COMPLETE.filter((l) => l.capacites.includes('plateforme.conversation')).every((l) => l.cellules.essentiel === false), 'mutation 7 non vue : Essentiel qui a la page de conversation')

if (echecs.length) {
  console.log(`❌ offres-affichage-qa : ${echecs.length} échec(s) sur ${n} contrôles`)
  for (const e of echecs) console.log('  - ' + e)
  process.exit(1)
}
console.log(`✅ offres-affichage-qa : ${n}/${n} contrôles — ${GRILLE.length} lignes visibles, Signature : ${listes.signature.length} lignes dont CRM et assistant`)
