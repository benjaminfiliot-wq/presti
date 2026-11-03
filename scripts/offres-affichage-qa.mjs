// Les offres AFFICHÉES = les offres VERROUILLÉES (un seul calcul, une seule écriture).
//
// Benj (15/10) : « pour les abonnements, il n'y a pas marqué le CRM, même pour la Signature ». La landing coupait la liste à cinq
// lignes (`.slice(0, 5)`) : le CRM et l'assistant, ajoutés en fin de grille, n'apparaissaient jamais sur la carte. Ce juge
// échoue si :
//   • une capacité d'une offre (PLANS[...].capacites) n'est annoncée par AUCUNE ligne de la grille (GRILLE_COMPLETE) ;
//   • une capacité du type `Capacite` n'est ni dans une offre ni déclarée « hors formules » ;
//   • une cellule contredit PLANS (une ligne dit « — » alors que l'offre a la capacité, ou « oui » alors qu'elle ne l'a pas) ;
//   • une ligne du CRM ou du Pilote n'est pas dans la liste de Signature (ou apparaît chez Studio) ; une ligne de l'assistant n'est pas
//     dans les deux offres (25/10 : l'assistant de gestion est en Studio) ;
//   • 15/10 : AUCUNE capacité de la plateforme (page de conversation, réponse, comptes clients, relances, domaine, boîte e-mail…) dans l'Essai
//     (ni dans l'ancien Essentiel, qui a les mêmes capacités) ;
//   • 15/10 : « Ma plateforme » et « Mes chiffres » ne sont pas à Studio et au-dessus seulement, ou l'automatique de « Mes chiffres » n'est
//     pas Signature seulement ;
//   • 25/10 (Benj, deux offres) : « Studio : tout est automatisé, mais il faut valider, sinon ça ne s'envoie pas. Signature : tout part
//     automatiquement. » Ce qui part SEUL (réponse, relances de conversation et d'impayés, Pilote, règles) est Signature seulement, et les
//     cellules de Studio disent « vous validez » quand celles de Signature disent que ça part seul ; l'Essentiel n'est plus une offre vendue ;
//   • une page de vente recoupe la liste (.slice sur pointsForts), ne rend pas <OffreDetail />, ou recopie un prix en dur.
// Il s'attaque aussi lui-même : des mutations de PLANS que le juge DOIT voir.
//
// Usage : node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/offres-affichage-qa.mjs

import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const RACINE = process.cwd()
const P = await import(pathToFileURL(path.join(RACINE, 'lib/plans.ts')).href)
const { PLANS, GRILLE, GRILLE_COMPLETE, CAPACITES_HORS_FORMULES, pointsForts, detailOffre } = P
const PAYANTS = ['studio', 'signature']

const echecs = []
let n = 0
const ok = (cond, msg) => { n++; if (!cond) echecs.push(msg) }

/** Les capacités d'une offre qu'aucune ligne (même dont le drapeau est baissé) n'annonce. */
const nonAnnoncees = (plans, grille) => {
  const sortie = []
  for (const id of PAYANTS) for (const c of plans[id].capacites) if (!grille.some((l) => l.capacites.includes(c))) sortie.push(`${id}:${c}`)
  return sortie
}

// 0. 25/10 : deux offres vendues, Studio puis Signature ; l'Essentiel n'est plus dans le tunnel.
ok(JSON.stringify(P.OFFRES.map((o) => o.id)) === JSON.stringify(PAYANTS), `OFFRES doit valoir ${PAYANTS.join(', ')} (lu : ${P.OFFRES.map((o) => o.id).join(', ')})`)
ok(JSON.stringify(Object.keys(P.ESSAI_JOURS).sort()) === JSON.stringify([...PAYANTS].sort()), "ESSAI_JOURS ne connaît que les deux offres vendues")
ok(GRILLE_COMPLETE.every((l) => Object.keys(l.cellules).sort().join() === [...PAYANTS].sort().join()), 'chaque ligne de la grille a exactement deux cellules (Studio, Signature)')

// 1. Chaque capacité de chaque offre est annoncée par une ligne.
const manquantes = nonAnnoncees(PLANS, GRILLE_COMPLETE)
ok(manquantes.length === 0, `capacité(s) d'offre annoncée(s) par aucune ligne de la grille : ${manquantes.join(', ')}`)

// 2. Toute capacité du type est dans une offre ou déclarée hors formules.
const src = fs.readFileSync(path.join(RACINE, 'lib/plans.ts'), 'utf8')
const bloc = src.match(/export type Capacite =([\s\S]*?)type Plan = /)?.[1] ?? ''
const toutes = [...bloc.matchAll(/'([a-z_.]+)'/g)].map((m) => m[1])
ok(toutes.length >= 20, `type Capacite illisible (${toutes.length} capacités trouvées)`)
for (const c of toutes) {
  const dansUneOffre = PAYANTS.some((id) => PLANS[id].capacites.includes(c)) || PLANS.entreprise.capacites.includes(c) || PLANS.business.capacites.includes(c)
  ok(dansUneOffre || CAPACITES_HORS_FORMULES.includes(c), `la capacité « ${c} » n'est dans aucune offre ni déclarée hors formules`)
}

// 2 bis. 02/11 (chantier 4) : l'offre Entreprise sur mesure. Elle reprend Signature À L'IDENTIQUE et ajoute les membres d'organisation ;
// elle reste hors du tunnel en libre-service (ni OFFRES, ni ESSAI_JOURS, ni colonne de la grille) et n'a pas de prix public.
const ENTREPRISE_ATTENDUE = [...PLANS.signature.capacites, 'organisation.membres']
ok(JSON.stringify(PLANS.entreprise?.capacites) === JSON.stringify(ENTREPRISE_ATTENDUE), `Entreprise doit valoir Signature plus organisation.membres (lu : ${PLANS.entreprise?.capacites?.join(', ')})`)
ok(PLANS.entreprise?.surDevis === true && PLANS.entreprise?.prixMois === 0, 'Entreprise : sur devis, sans prix public')
ok(!P.OFFRES.some((o) => o.id === 'entreprise'), 'Entreprise ne doit pas entrer dans OFFRES (le Checkout en libre-service)')
ok(!Object.hasOwn(P.ESSAI_JOURS, 'entreprise'), 'Entreprise ne doit pas avoir d’essai sans carte')
ok(GRILLE_COMPLETE.every((l) => !Object.hasOwn(l.cellules, 'entreprise')), 'la grille publique n’a pas de colonne Entreprise')
ok(P.offreDeReference('entreprise') === 'signature' && P.offreDeReference('business') === 'signature' && P.offreDeReference('studio') === 'studio' && P.offreDeReference('gratuit') === null, 'offreDeReference : Signature pour Signature, Business et Entreprise ; Studio pour Studio ; rien pour l’essai')
ok(/Presti pour l’entreprise/.test(P.messageVerrou('organisation.membres')), `messageVerrou('organisation.membres') doit nommer l’offre Entreprise (lu : ${P.messageVerrou('organisation.membres')})`)
// Studio, Signature, le tunnel, les essais, la promesse d'automatisation et la grille n'ont pas bougé d'un octet (empreintes relevées
// le 02/11 vers 5 h, AVANT l'ajout de l'Entreprise).
const { createHash } = await import('node:crypto')
const empreinte = async (x) => createHash('sha256').update(JSON.stringify(x)).digest('hex')
// 03/11/2026 : Studio et Signature réinscrits après le changement de prix voulu par Benj (Studio 59 → 30 €, Signature 99 → 60 €,
// anciens montants gardés dans anciensPrixMois pour les abonnements ouverts avant). Avant : studio 488dadcb…, signature 5a4c3086…,
// offres 9db31c0e…
const AVANT = {
  studio: '2c61a06c5f517ea54264c9f5a3195d8f74f06019228ffa8a3198a5bd1bb31d3c',
  signature: '9f5f8aba4555d533e961fe2ee791ef07c63a54edab8ba5d33665ea16ede20fbc',
  offres: '1dafc43284b40d89b32d7fcc9b295b17a3f63348a951f08beeedec7005d8d528',
  essai: 'bb4f9f97bf486334548cf26490f51b3ce71bf98e38bd3e3989fb8b1fa72be165',
  automatisation: 'c8e896fd40a88fd67cf92da84b4b1997507734e7b2453582a3f46c003eff3112',
  grille: '5687bafb906f1adfeea908b5770ccef09f4d4edfc96c57c83b081de664ddee1e',
}
const grilleEmpreinte = (g) => g.map((l) => ({ g: l.groupe, l: l.label, c: l.capacites, k: l.cellules, f: l.flag ?? null }))
const MAINTENANT = { studio: await empreinte(PLANS.studio), signature: await empreinte(PLANS.signature), offres: await empreinte(P.OFFRES), essai: await empreinte(P.ESSAI_JOURS), automatisation: await empreinte(P.AUTOMATISATION), grille: await empreinte(grilleEmpreinte(GRILLE_COMPLETE)) }
for (const k of Object.keys(AVANT)) ok(MAINTENANT[k] === AVANT[k], `${k} a changé depuis l’ajout de l’Entreprise (empreinte ${MAINTENANT[k].slice(0, 12)}… au lieu de ${AVANT[k].slice(0, 12)}…)`)

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

// 4. Chaque ligne visible est sur la carte des offres qui l'ont, et seulement sur celles-là. Le CRM et le Pilote : Signature seulement ;
//    l'assistant de gestion : les deux offres (25/10).
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
for (const cap of ['crm', 'assistant.pilote']) {
  const lignes = GRILLE.filter((l) => l.capacites.includes(cap))
  ok(lignes.length >= 1, `aucune ligne visible pour la capacité ${cap} (drapeau baissé ?)`)
  for (const l of lignes) {
    ok(listes.signature.includes(P.texteCellule(l, l.cellules.signature)), `Signature ne montre pas « ${l.label} »`)
    ok(l.cellules.studio === false, `« ${l.label} » est ouverte à Studio, qui n'a pas la capacité ${cap}`)
  }
}
{
  const lignes = GRILLE.filter((l) => l.capacites.includes('assistant'))
  ok(lignes.length >= 1, 'aucune ligne visible pour la capacité assistant (drapeau baissé ?)')
  for (const l of lignes) for (const id of PAYANTS) ok(listes[id].includes(P.texteCellule(l, l.cellules[id])), `${id} ne montre pas « ${l.label} » (l'assistant est en Studio depuis le 25/10)`)
}

// 5. Les pages de vente rendent TOUTE la liste et ne recopient aucun prix.
const PAGES = ['app/page.tsx', 'app/abonnement/page.tsx']
for (const f of PAGES) {
  const s = fs.readFileSync(path.join(RACINE, f), 'utf8')
  ok(/<OffreDetail\b/.test(s), `${f} ne rend pas <OffreDetail /> (le détail complet de chaque offre)`)
  ok(!/pointsForts\([^)]*\)\s*\.slice/.test(s), `${f} coupe la liste des offres (.slice sur pointsForts)`)
  ok(!/\b(29|30|59|60|99)\s?(€|euros)/.test(s.replace(/\/\/.*$/gm, '')), `${f} recopie un prix d'offre en dur (lib/plans.ts est la source)`)
  ok(!/PLANS\.essentiel|ESSAI_JOURS\.essentiel|'essentiel'/.test(s), `${f} propose encore l'offre Essentiel (plus vendue depuis le 25/10)`)
}
const comp = fs.readFileSync(path.join(RACINE, 'app/Comparatif.tsx'), 'utf8')
ok(/GRILLE/.test(comp) && !/slice\(/.test(comp), 'app/Comparatif.tsx doit rendre toute la GRILLE')

// 5 bis. 15/10 (Benj) : « Ma plateforme » et « Mes chiffres » commencent avec Studio, pour TOUS les comptes ; l'automatique de « Mes chiffres »
// n'est qu'en Signature. La grille le dit, ligne par ligne, depuis PLANS ; rien n'en est dans l'Essai (ni dans l'ancien Essentiel).
const DE = { gratuit: PLANS.gratuit, essentiel: PLANS.essentiel, studio: PLANS.studio, signature: PLANS.signature, business: PLANS.business }
for (const [cap, attendu] of [['plateforme.gestion', { gratuit: 0, essentiel: 0, studio: 1, signature: 1, business: 1 }], ['chiffres', { gratuit: 0, essentiel: 0, studio: 1, signature: 1, business: 1 }], ['chiffres.auto', { gratuit: 0, essentiel: 0, studio: 0, signature: 1, business: 1 }]]) {
  for (const [id, v] of Object.entries(attendu)) ok(DE[id].capacites.includes(cap) === !!v, `${cap} : ${id} ${v ? 'devrait' : 'ne devrait pas'} l'avoir`)
}
for (const cap of ['plateforme.gestion', 'chiffres', 'chiffres.auto']) ok(GRILLE_COMPLETE.some((l) => l.capacites.includes(cap)), `aucune ligne de la grille n'annonce ${cap}`)
for (const l of GRILLE_COMPLETE.filter((x) => x.capacites.includes('chiffres.auto'))) ok(l.cellules.studio === false && l.cellules.signature !== false, `« ${l.label} » : l'automatique de Mes chiffres est Signature seulement`)
ok(listes.studio.some((t) => /Ma plateforme/.test(t)) && listes.studio.some((t) => /Mes chiffres/.test(t)), 'la carte Studio doit annoncer « Ma plateforme » et « Mes chiffres »')
// Un drapeau baissé ne fait rien annoncer : aucune ligne d'automatisation de Mes chiffres n'est visible sans son drapeau.
ok(GRILLE.filter((l) => l.capacites.includes('chiffres.auto')).every((l) => l.flag && P.GRILLE.includes(l)), "une ligne d'automatisation de Mes chiffres est visible sans drapeau")

// 5 ter. 15/10 (Benj) : la plateforme commence avec Studio. Aucune de ses capacités dans l'Essai ni dans l'ancien Essentiel ; toutes en Studio,
// sauf la réponse qui part SEULE, Signature seulement depuis le 25/10.
const CAPS_PLATEFORME = ['plateforme.conversation', 'plateforme.comptes_clients', 'plateforme.domaine_perso', 'site.domaine_perso', 'relances', 'canaux.email', 'plateforme.personnalisation_avancee', 'plateforme.gestion']
const plateformeHorsEssai = (plans) => [...CAPS_PLATEFORME, 'plateforme.ia.auto'].filter((cap) => plans.gratuit.capacites.includes(cap) || plans.essentiel.capacites.includes(cap))
ok(plateformeHorsEssai(PLANS).length === 0, `l'Essai (ou l'ancien Essentiel) a une capacité de la plateforme : ${plateformeHorsEssai(PLANS).join(', ')}`)
for (const cap of CAPS_PLATEFORME) {
  ok(PLANS.studio.capacites.includes(cap), `${cap} : Studio a la plateforme`)
  ok(GRILLE_COMPLETE.some((l) => l.capacites.includes(cap)), `aucune ligne de la grille n'annonce ${cap}`)
}
ok(listes.studio.some((t) => /Devis chiffrés par l’IA/.test(t)) && listes.studio.some((t) => /Factur-X/.test(t)), 'la carte Studio doit annoncer les devis chiffrés par l’IA et les factures + Factur-X')
ok(listes.studio.some((t) => /La plateforme : page de conversation/.test(t)), 'la carte Studio doit annoncer « La plateforme »')
ok(JSON.stringify([...PLANS.gratuit.capacites].sort()) === JSON.stringify([...PLANS.essentiel.capacites].sort()), "l'Essai et l'ancien Essentiel ont les mêmes capacités (aucun compte hérité ne garde la plateforme)")

// 5 quater. 25/10 (Benj) : ce qui part SEUL est Signature ; Studio prépare et l'artisan valide. Les cellules le disent avec les mêmes mots.
const SEUL_SIGNATURE = ['plateforme.ia.auto', 'relances.auto', 'factures.relances.auto', 'assistant.pilote', 'plateforme.regles']
for (const cap of SEUL_SIGNATURE) ok(!PLANS.studio.capacites.includes(cap) && PLANS.signature.capacites.includes(cap), `${cap} : Signature seulement (rien ne part seul en Studio)`)
ok(PLANS.studio.capacites.includes('assistant') && PLANS.studio.capacites.includes('relances') && PLANS.studio.capacites.includes('factures.relances'), 'Studio prépare : assistant, relances de conversation et d’impayés')
/** Les cellules « automatique / vous validez » qui contredisent les capacités d'un jeu de PLANS. */
const contradictionsAuto = (plans) => {
  const d = []
  for (const [capAuto, motLigne] of [['plateforme.ia.auto', /^Réponse aux demandes/], ['relances.auto', /^Relances des conversations/], ['factures.relances.auto', /^Relances des factures impayées/]]) {
    const l = GRILLE_COMPLETE.find((x) => motLigne.test(x.label))
    if (!l) { d.push(`ligne ${motLigne} introuvable`); continue }
    for (const id of PAYANTS) {
      const t = String(l.cellules[id])
      const seul = /automatique|partent seules|part seule/.test(t) && !/vous (la|les) validez/.test(t)
      if (plans[id].capacites.includes(capAuto) !== seul) d.push(`« ${l.label} » (${id}) : « ${t} » contredit ${capAuto}`)
    }
  }
  return d
}
ok(contradictionsAuto(PLANS).length === 0, contradictionsAuto(PLANS).join(' · '))
ok(/valid/.test(P.AUTOMATISATION.studio) && /rien ne part sans vous/.test(P.AUTOMATISATION.studio), 'AUTOMATISATION : Studio dit que vous validez et que rien ne part sans vous')
ok(/tout part automatiquement/.test(P.AUTOMATISATION.signature) && /jamais un prix estimé ni un paiement sans vous/.test(P.AUTOMATISATION.signature), 'AUTOMATISATION : Signature dit que tout part automatiquement, jamais un prix estimé ni un paiement sans vous')
ok(detailOffre('signature').lignes.some((x) => x.nouveau && /^Réponse aux demandes/.test(x.texte) && /automatique/.test(x.texte)), 'Signature doit montrer la réponse AUTOMATIQUE comme nouvelle par rapport à Studio')

// 6. Le juge se teste : ces mutations DOIVENT être vues.
const clone = () => JSON.parse(JSON.stringify(PLANS))
const m1 = clone(); m1.signature.capacites.push('site.slides3d')
ok(nonAnnoncees(m1, GRILLE_COMPLETE).includes('signature:site.slides3d'), 'mutation 1 non vue : capacité ajoutée à Signature sans ligne')
const m2 = clone(); m2.studio.capacites.push('crm')
ok(m2.studio.capacites.includes('crm') && !GRILLE_COMPLETE.some((l) => l.capacites.includes('crm') && l.cellules.studio !== false), 'mutation 2 non vue : le CRM ouvert à Studio ne contredirait pas la grille')
const sans = GRILLE_COMPLETE.filter((l) => !l.capacites.includes('assistant'))
ok(nonAnnoncees(PLANS, sans).includes('studio:assistant'), 'mutation 3 non vue : ligne de l\'assistant retirée sans que le juge ne la réclame')

// 7. Mutations : l'Essai qui récupère « Mes chiffres » ou la page de conversation, Studio qui récupère l'automatique de Mes chiffres ou la
//    réponse qui part seule, Signature qui la perd → vues.
const m4 = clone(); m4.gratuit.capacites.push('plateforme.gestion')
ok(plateformeHorsEssai(m4).includes('plateforme.gestion'), "mutation 4 non vue : l'Essai qui a « Ma plateforme »")
const m5 = clone(); m5.studio.capacites.push('chiffres.auto')
ok(GRILLE_COMPLETE.some((l) => l.capacites.includes('chiffres.auto') && l.cellules.studio === false && m5.studio.capacites.includes('chiffres.auto')), "mutation 5 non vue : Studio qui a l'automatique de Mes chiffres contredirait la cellule « — »")
const m6 = clone(); m6.essentiel.capacites.push('plateforme.conversation')
ok(plateformeHorsEssai(m6).includes('plateforme.conversation'), "mutation 6 non vue : l'ancien Essentiel qui a la page de conversation")
const m7 = clone(); m7.studio.capacites.push('plateforme.ia.auto')
ok(contradictionsAuto(m7).some((x) => /\(studio\)/.test(x)), 'mutation 7 non vue : Studio dont la réponse partirait seule contredirait « vous la validez »')
const m8 = clone(); m8.signature.capacites = m8.signature.capacites.filter((c) => c !== 'relances.auto')
ok(contradictionsAuto(m8).some((x) => /Relances des conversations.*\(signature\)/.test(x)), 'mutation 8 non vue : Signature sans relances.auto contredirait « elles partent seules »')
// 02/11 : les mutations de l'Entreprise et de l'empreinte DOIVENT être vues.
const m9 = clone(); m9.studio.capacites = m9.studio.capacites.filter((c) => c !== 'assistant')
ok((await empreinte(m9.studio)) !== AVANT.studio, 'mutation 9 non vue : une capacité ôtée à Studio ne change pas son empreinte')
const m10 = [...P.OFFRES, { id: 'entreprise', label: 'Entreprise', prix: 0, credits: 600, accroche: '' }]
ok(m10.some((o) => o.id === 'entreprise') && (await empreinte(m10)) !== AVANT.offres, 'mutation 10 non vue : l’Entreprise ajoutée à OFFRES ne change pas l’empreinte du tunnel')
const m11 = clone(); m11.entreprise.capacites = m11.entreprise.capacites.filter((c) => c !== 'crm')
ok(JSON.stringify(m11.entreprise.capacites) !== JSON.stringify(ENTREPRISE_ATTENDUE), 'mutation 11 non vue : une Entreprise qui perd le CRM de Signature passerait')

if (echecs.length) {
  console.log(`❌ offres-affichage-qa : ${echecs.length} échec(s) sur ${n} contrôles`)
  for (const e of echecs) console.log('  - ' + e)
  process.exit(1)
}
console.log(`✅ offres-affichage-qa : ${n}/${n} contrôles — ${GRILLE.length} lignes visibles, Signature : ${listes.signature.length} lignes dont CRM et Pilote, Studio : ${listes.studio.length} lignes dont l'assistant`)
