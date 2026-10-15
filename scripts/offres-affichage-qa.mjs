// Les offres AFFICHÉES = les offres VERROUILLÉES (un seul calcul, une seule écriture).
//
// Benj (15/10) : « pour les abonnements, il n'y a pas marqué le CRM, même pour la Signature ». La landing coupait la liste à cinq
// lignes (`.slice(0, 5)`) : le CRM et l'assistant, ajoutés en fin de grille, n'apparaissaient jamais sur la carte. Ce juge
// échoue si :
//   • une capacité d'une offre (PLANS[...].capacites) n'est annoncée par AUCUNE ligne de la grille (GRILLE_COMPLETE) ;
//   • une capacité du type `Capacite` n'est ni dans une offre ni déclarée « hors formules » ;
//   • une cellule contredit PLANS (une ligne dit « — » alors que l'offre a la capacité, ou « oui » alors qu'elle ne l'a pas) ;
//   • une ligne du CRM ou de l'assistant n'est pas dans la liste de Signature (ou apparaît chez Essentiel / Studio) ;
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

// 6. Le juge se teste : ces mutations DOIVENT être vues.
const clone = () => JSON.parse(JSON.stringify(PLANS))
const m1 = clone(); m1.signature.capacites.push('site.slides3d')
ok(nonAnnoncees(m1, GRILLE_COMPLETE).includes('signature:site.slides3d'), 'mutation 1 non vue : capacité ajoutée à Signature sans ligne')
const m2 = clone(); m2.studio.capacites.push('crm')
ok(m2.studio.capacites.includes('crm') && !GRILLE_COMPLETE.some((l) => l.capacites.includes('crm') && l.cellules.studio !== false), 'mutation 2 non vue : le CRM ouvert à Studio ne contredirait pas la grille')
const sans = GRILLE_COMPLETE.filter((l) => !l.capacites.includes('assistant'))
ok(nonAnnoncees(PLANS, sans).includes('signature:assistant'), 'mutation 3 non vue : ligne de l\'assistant retirée sans que le juge ne la réclame')

if (echecs.length) {
  console.log(`❌ offres-affichage-qa : ${echecs.length} échec(s) sur ${n} contrôles`)
  for (const e of echecs) console.log('  - ' + e)
  process.exit(1)
}
console.log(`✅ offres-affichage-qa : ${n}/${n} contrôles — ${GRILLE.length} lignes visibles, Signature : ${listes.signature.length} lignes dont CRM et assistant`)
