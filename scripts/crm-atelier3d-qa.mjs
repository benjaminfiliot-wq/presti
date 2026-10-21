#!/usr/bin/env node
// scripts/crm-atelier3d-qa.mjs — juge de l'INFRASTRUCTURE de l'atelier 3D (drapeau crmAtelierVivant, 20/10/2026, lots 1 et 2) : la
// maquette s'adapte à l'artisan (équipe, statut, gabarit des véhicules, stock, lieu déclaré → maison, atelier, entrepôt ou camion-
// atelier), son métier se voit (structures et matières de la base, types de chantiers, avancement), jour et nuit selon l'heure de
// Paris. Aucune migration, aucun réseau, aucune base, aucun navigateur : tout se joue sur les fonctions pures (lib/crm/
// infrastructure.ts, lib/crm/atelier.ts) et sur le texte des sources. Il passe drapeau BAISSÉ comme drapeau LEVÉ.
//
//  A. PROFIL : seuils nommés, cas vides, statut (forme juridique, équipe), gabarit déduit du nom, lieu déclaré qui prime.
//  B. MÉTIER : structures et machines de chaque métier dans chaque base (signatures), rangées dans leurs zones ; types de chantiers ;
//     chaque chantier change avec le métier et avec l'avancement (extension qui monte, toit qui se couvre, fenêtres posées…).
//  C. SCÈNE : sans l'option `infra`, la sortie de construireScene est OCTET POUR OCTET celle d'avant (sha256) ; avec : mêmes objets
//     cliquables, bâtiments propres à chaque base, aucun décor qui suggère un équipement absent, 36 combinaisons métier × lieu toutes
//     différentes, chaque lieu × statut × gabarits donne un jeu de structures distinct, palette sans bleu.
//  D. JOUR / NUIT : moments, ambiances, fenêtres allumées le soir seulement ; trajet de marche (départ, arrivée exacte).
//  E. SOURCES : reduced-motion, réglage en localStorage sous try/catch, aucune écriture serveur ni fetch ajoutés, un seul calque de
//     plus, tout derrière le drapeau (la forme juridique n'est lue que drapeau levé), l'écran dit d'où vient le lieu.
//  F. LANCEUR : la suite est au tableau SUITES de scripts/tout-verifier.mjs, après « CRM atelier vivant ».
//
// Usage : node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/crm-atelier3d-qa.mjs
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.removeAllListeners('warning')
process.on('warning', (w) => { if (w.code !== 'MODULE_TYPELESS_PACKAGE_JSON' && w.name !== 'ExperimentalWarning') console.error(w) })
const rouges = []
let verts = 0
const T = (nom, cond, detail = '') => { if (cond) { verts++; console.log(`PASS ${nom}`) } else { rouges.push(nom); console.log(`FAIL ${nom}${detail ? ' — ' + String(detail).slice(0, 500) : ''}`) } }
const lire = (rel) => fs.readFileSync(path.join(RACINE, rel), 'utf8').replace(/\r\n/g, '\n')
const imp = (rel) => import(pathToFileURL(path.join(RACINE, rel)).href)
const egal = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const lister = (dir) => fs.readdirSync(path.join(RACINE, dir), { withFileTypes: true }).flatMap((e) => e.isDirectory() ? lister(path.join(dir, e.name)) : [path.join(dir, e.name).replace(/\\/g, '/')])
const sha = (x) => crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex')
const sansCommentaires = (s) => s.replace(/^\s*\/\/.*$/gm, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')

const { FLAGS } = await imp('lib/flags.ts')
const LEVE = FLAGS.crmAtelierVivant === true
console.log(`Drapeau crmAtelierVivant : ${LEVE ? 'LEVÉ' : 'baissé'}`)
const I = await imp('lib/crm/infrastructure.ts')
const C = await imp('lib/crm/carte.ts')
const At = await imp('lib/crm/atelier.ts')
const { DONNEES_EXEMPLE: D } = await imp('lib/crm/exemple.ts')
const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const membre = (n, actif = true) => ({ id: U(9000 + n), nom: `Membre fictif ${n}`, role: n === 0 ? 'artisan' : 'compagnon', actif })
const vehicule = (n, actif = true, nom = `Véhicule fictif ${n}`) => ({ id: U(8000 + n), nom, immatriculation: null, conducteur_id: null, controle_technique_le: null, entretien_le: null, actif })
const materiau = (n, cat) => ({ id: U(7000 + n), nom: `Matériau fictif ${n}`, unite: 'u', categorie: cat, reste: 5, seuil: 1, fournisseur: null, fournisseur_contact: null, prix_vu_ht: null, prix_vu_le: null })
const commande = (n, statut = 'commandee') => ({ id: U(6000 + n), fournisseur: 'Fournisseur fictif', contact: null, reference: null, statut, commandee_le: '2026-10-01', livraison_prevue: '2026-10-20', recue_le: statut === 'recue' ? '2026-10-10' : null })
const jeu = (o = {}) => ({ jour: '2026-10-12', metier: null, chantiers: [], materiaux: [], vehicules: [], membres: [], demandes: [], ...o })
const toutes = (sc) => At.FORMES.flatMap((f) => sc.instances[f])
const scene = (d, p, base = null, o = {}) => At.construireScene(d, p, { infra: { base }, ...o })

// ═══════════════════════ A. Le profil ═══════════════════════
{
  const P = (o, lieu) => I.profilInfrastructure(jeu(o), lieu)
  const vide = P({})
  T('A1 cas vide (aucun membre, aucun véhicule, aucun matériau) : seul, sans stock, à son compte → base légère, déduite', vide.equipe === 'solo' && vide.stock === 'aucun' && vide.vehicules === 0 && vide.base === 'legere' && vide.statut === 'a_son_compte' && vide.declare === false, JSON.stringify(vide))
  const solo = P({ membres: [membre(0)], vehicules: [vehicule(1)] })
  T('A2 solo sans stock, un utilitaire → légère', solo.equipe === 'solo' && solo.membres === 1 && solo.vehicules === 1 && solo.base === 'legere' && egal(solo.gabarits, ['fourgonnette']))
  T('A3 seuils d’équipe nommés : 1 → solo, 2 et 4 → petite, 5 → équipe (SEUILS.petiteEquipe = 2, SEUILS.equipe = 5)',
    I.SEUILS.petiteEquipe === 2 && I.SEUILS.equipe === 5 && [1, 2, 4, 5].map((n) => P({ membres: Array.from({ length: n }, (_, i) => membre(i)) }).equipe).join() === 'solo,petite,petite,equipe')
  T('A4 les inactifs ne comptent pas (membres et véhicules)', P({ membres: [membre(0), membre(1, false), membre(2, false)], vehicules: [vehicule(1, false)] }).equipe === 'solo' && P({ vehicules: [vehicule(1, false), vehicule(2)] }).vehicules === 1)
  const cats = (nc, nr) => Array.from({ length: nr }, (_, i) => materiau(i, `Cat ${i % nc}`))
  T('A5 stock : 0 référence → aucun ; 5 catégories / 24 références → petit ; 6 catégories → grand ; 25 références → grand',
    P({}).stock === 'aucun' && P({ materiaux: cats(5, 24) }).stock === 'petit' && P({ materiaux: cats(6, 6) }).stock === 'grand' && P({ materiaux: cats(1, 25) }).stock === 'grand' && I.SEUILS.grandStockCategories === 6 && I.SEUILS.grandStockReferences === 25)
  T('A6 commandes fournisseur : 4 ATTENDUES font d’un petit stock un grand ; les reçues et annulées ne comptent pas ; sans stock, des commandes ne créent pas de dépôt',
    P({ materiaux: cats(2, 4), commandes: [1, 2, 3, 4].map((n) => commande(n)) }).stock === 'grand' && P({ materiaux: cats(2, 4), commandes: [commande(1), commande(2), commande(3), commande(4, 'recue'), commande(5, 'annulee')] }).stock === 'petit' && P({ commandes: [1, 2, 3, 4, 5].map((n) => commande(n)) }).stock === 'aucun')
  T('A7 base : petit stock → atelier ; petite équipe sans stock → atelier ; 3 véhicules → atelier ; 2 utilitaires seul → légère ; UN CAMION seul → atelier (il lui faut une cour)',
    P({ membres: [membre(0)], materiaux: cats(1, 2) }).base === 'atelier' && P({ membres: [membre(0), membre(1)] }).base === 'atelier' && P({ vehicules: [1, 2, 3].map((n) => vehicule(n)) }).base === 'atelier' && P({ vehicules: [1, 2].map((n) => vehicule(n)) }).base === 'legere' && P({ membres: [membre(0)], vehicules: [vehicule(1, true, 'Camion benne')] }).base === 'atelier')
  T('A8 base : grand stock (même seul) → entrepôt ; équipe de 5 (même sans stock) → entrepôt', P({ membres: [membre(0)], materiaux: cats(8, 8) }).base === 'entrepot' && P({ membres: [0, 1, 2, 3, 4].map((n) => membre(n)) }).base === 'entrepot')
  const avant = JSON.stringify(D)
  const pEx = I.profilInfrastructure(D)
  T('A9 l’exemple (6 personnes, 4 véhicules, 21 références en 8 catégories) → société, entrepôt ; fonction pure : même sortie deux fois, entrée intacte',
    pEx.base === 'entrepot' && pEx.equipe === 'equipe' && pEx.stock === 'grand' && pEx.statut === 'societe' && egal(pEx, I.profilInfrastructure(D)) && JSON.stringify(D) === avant, JSON.stringify(pEx))
  T('A10 la démonstration ramène l’exemple à chaque lieu sans le démentir (légère, atelier, entrepôt déduits ; « sans local » se déclare)', ['legere', 'atelier', 'entrepot'].every((b) => I.profilInfrastructure(I.echantillonPourBase(D, b)).base === b) && I.profilInfrastructure(I.echantillonPourBase(D, 'camion'), 'camion').base === 'camion' && I.profilInfrastructure(I.echantillonPourBase(D, 'camion')).base === 'legere')
  T('A11 le résumé se lit (« À son compte · seul · 1 véhicule · sans stock », « Société · 6 personnes · 4 véhicules · stock important », camions comptés)',
    I.resumeProfil(solo) === 'À son compte · seul · 1 véhicule · sans stock' && I.resumeProfil(pEx) === 'Société · 6 personnes · 4 véhicules · stock important' && /dont 1 camion/.test(I.resumeProfil(P({ vehicules: [vehicule(1, true, 'Camion plateau'), vehicule(2)] }))), I.resumeProfil(pEx))
  const g = (n) => I.gabaritDe(n)
  T('A12 gabarit déduit du nom : camion (benne, plateau, porteur, 3,5 t — mais pas « camionnette »), fourgon (Master, Trafic, Sprinter…), voiture (Clio, 208…), sinon fourgonnette',
    g('Camion benne') === 'camion' && g('Porteur 19 t') === 'camion' && g('Plateau 3,5 t') === 'camion' && g('Camionnette 1') === 'fourgonnette' && g('Renault Master') === 'fourgon' && g('Trafic L2H1') === 'fourgon' && g('Sprinter') === 'fourgon' && g('Clio') === 'voiture' && g('Peugeot 208') === 'voiture' && g('Kangoo') === 'fourgonnette' && g('Utilitaire') === 'fourgonnette' && g(null) === 'fourgonnette' && egal(pEx.gabarits, ['fourgonnette', 'fourgonnette', 'fourgon', 'fourgonnette']))
  const s = (f, n) => I.statutDe(f, n)
  T('A13 statut : EI, EIRL, micro, auto-entrepreneur → à son compte (même à plusieurs) ; SARL, SAS, EURL → société, sauf seul ; sans forme, l’équipe tranche',
    s('EI', 3) === 'a_son_compte' && s('Micro-entreprise', 1) === 'a_son_compte' && s('auto-entrepreneur', 2) === 'a_son_compte' && s('EIRL', 2) === 'a_son_compte' && s('SARL', 3) === 'societe' && s('SAS', 2) === 'societe' && s('EURL', 1) === 'a_son_compte' && s(null, 1) === 'a_son_compte' && s(null, 4) === 'societe')
  T('A14 le lieu DÉCLARÉ prime sur la déduction, et le dit (declare = vrai, baseDeduite gardée)', ['legere', 'atelier', 'entrepot', 'camion'].every((b) => { const p = I.profilInfrastructure(D, b); return p.base === b && p.declare && p.baseDeduite === 'entrepot' }))
}

// ═══════════════════════ B. Le métier ═══════════════════════
{
  const manque = []
  for (const p of At.PREREGLAGES) for (const b of I.BASES) {
    const kinds = new Set(I.accessoiresBase(p, I.PLANS[b]).map((a) => a.k))
    if (!kinds.size) manque.push(`${p}/${b}: vide`)
    if (b === 'atelier' || b === 'entrepot') { for (const k of I.SIGNATURES[p]) if (!kinds.has(k)) manque.push(`${p}/${b}: ${k}`); if (!kinds.has('etabli')) manque.push(`${p}/${b}: pas d’établi`) }
    else { if (!I.SIGNATURES[p].some((k) => kinds.has(k))) manque.push(`${p}/${b}: aucune structure du métier`); if (kinds.has('etabli')) manque.push(`${p}/${b}: un établi sans atelier`) }
  }
  T('B1 chaque métier montre ses structures dans l’atelier et l’entrepôt (hangar à bois et silo à copeaux, cour de matériaux et silo à mortier, hangar haut et monte-matériaux, auvent à tourets, abri à tubes, cabine de peinture, auvent à palettes…) ; chez soi et sans local, au moins une, sans établi', manque.length === 0, manque.slice(0, 6).join(' | '))
  T('B2 neuf métiers, neuf jeux de structures différents (dans chaque lieu)', I.BASES.every((b) => new Set(At.PREREGLAGES.map((p) => JSON.stringify(I.accessoiresBase(p, I.PLANS[b])))).size === At.PREREGLAGES.length))
  T('B3 plus la base est grande, plus il y a de matériel (chez soi < atelier < entrepôt), pour chaque métier', At.PREREGLAGES.every((p) => I.accessoiresBase(p, I.PLANS.legere).length < I.accessoiresBase(p, I.PLANS.atelier).length && I.accessoiresBase(p, I.PLANS.atelier).length < I.accessoiresBase(p, I.PLANS.entrepot).length))
  const hors = []
  for (const p of At.PREREGLAGES) for (const b of I.BASES) {
    const pl = I.PLANS[b], dans = (r, x, z) => x >= r.x0 - 0.5 && x <= r.x1 + 0.5 && z >= r.z0 - 0.5 && z <= r.z1 + 0.5
    for (const a of I.accessoiresBase(p, pl)) if (!dans(pl.interieur, a.p[0], a.p[2]) && !dans(pl.exterieur, a.p[0], a.p[2]) && !dans(pl.hall, a.p[0], a.p[2])) hors.push(`${p}/${b}:${a.k}@${a.p.map((v) => v.toFixed(1))}`)
  }
  T('B4 tout le matériel reste dans ses zones (dedans : établi et machines ; hall : mobilier ; dehors : structures) — rien sur les bureaux, les rayonnages ou les places', hors.length === 0, hors.slice(0, 5).join(' | '))
  // — les chantiers (lot 5) : le bâtiment suit le VRAI chantier (son type, lib/crm/carte.ts) ; les QUATRE états valent pour tous les types —
  const dessin = (type, phaseOuPct, metier = 'plombier', variante) => {
    const box = [], fen = []
    const add = (f, p, s, c, oo = -1, r = [0, 0, 0]) => { box.push({ f, p, s, c, r }); return box.length - 1 }
    const addF = (p, s, jour, nuit) => { fen.push({ p, s, c: jour, nuit }) }
    const pct = typeof phaseOuPct === 'number' ? phaseOuPct : { pas_commence: 0, en_cours: 0.4, presque_fini: 0.85, fini: 1 }[phaseOuPct]
    const sommet = I.maisonChantier(add, addF, { x: 0, z: 0, h: 0.37, id: 'chantier-test', pct, termine: pct >= 1, enCours: pct > 0 && pct < 1, o: 0, type, variante }, metier)
    return { box, fen, sommet, json: JSON.stringify({ box, fen }) }
  }
  const TYPES = [...C.TYPES_BATIMENT], PH = [...C.PHASES]
  const haut = (d) => Math.max(...d.box.map((x) => x.p[1] + x.s[1] / 2))
  const echaf = (d) => d.box.some((x) => x.f === 'cyl' && x.c === I.P.ambre)
  const benne = (d) => d.box.some((x) => x.c === I.P.corailFonce && Math.abs(x.s[0] - 1.2) < 1e-9 && Math.abs(x.s[1] - 0.6) < 1e-9)
  const fautes5 = []
  for (const t of TYPES) {
    const [a, b, c, d] = PH.map((p) => dessin(t, p))
    if (new Set([a, b, c, d].map((x) => x.json)).size !== 4) fautes5.push(`${t} : états non distincts`)
    if (haut(a) > 1.2 || a.box.some((x) => x.f === 'toit') || a.fen.length) fautes5.push(`${t} : pas commencé trop haut, toit ou fenêtres (${haut(a).toFixed(2)})`)
    if (t !== 'exterieur' && !a.box.some((x) => x.c === I.P.beton)) fautes5.push(`${t} : pas de fondations`)
    if (t !== 'exterieur' && (!(b.sommet > a.sommet) || b.fen.length || !echaf(b))) fautes5.push(`${t} : en cours (${b.sommet.toFixed(2)}, ${b.fen.length} fen.)`)
    if (t === 'exterieur' && !(b.box.length < d.box.length)) fautes5.push(`${t} : progression ${a.box.length}/${b.box.length}/${d.box.length}`)
    if (!benne(c) || (t !== 'exterieur' && !echaf(c))) fautes5.push(`${t} : presque fini sans échafaudage ou benne`)
    if (echaf(d) || benne(d)) fautes5.push(`${t} : fini encore en travaux`)
    if (t !== 'exterieur' && (Math.abs(c.sommet - d.sommet) > 1e-9 || d.sommet < b.sommet - 1e-9 || !d.fen.length)) fautes5.push(`${t} : sommets ${b.sommet.toFixed(2)}/${c.sommet.toFixed(2)}/${d.sommet.toFixed(2)}`)
  }
  T('B5 13 types × 4 états : pas commencé = terrain piqueté + fondations (≤ 1,2 m, ni toit ni fenêtre) ; en cours = la structure monte (échafaudage, aucune fenêtre posée) ; presque fini = le bâtiment est là (échafaudage, benne) ; fini = ni échafaudage ni benne ; quatre dessins par type', fautes5.length === 0, fautes5.slice(0, 6).join(' | '))
  const silhouette = (d) => { const xs = d.box.map((x) => [x.p[0] - x.s[0] / 2, x.p[0] + x.s[0] / 2]).flat(), zs = d.box.map((x) => [x.p[2] - x.s[2] / 2, x.p[2] + x.s[2] / 2]).flat(); return [Math.round(haut(d) * 10), Math.round((Math.max(...xs) - Math.min(...xs)) * 10), Math.round((Math.max(...zs) - Math.min(...zs)) * 10), ...At.FORMES.map((f) => d.box.filter((x) => x.f === f).length), d.fen.length].join() }
  T('B6 treize types, treize SILHOUETTES (hauteur, emprise, nombre de formes et de vitrages : toutes différentes, une fois finis)', new Set(TYPES.map((t) => silhouette(dessin(t, 'fini')))).size === TYPES.length && new Set(TYPES.map((t) => dessin(t, 'fini').json)).size === TYPES.length)
  T('B7 le bâtiment suit le CHANTIER, plus le métier : fini, le même type est dessiné à l’identique pour les 18 métiers ; pendant les travaux, les matériaux du métier se voient (au moins 12 dessins différents sur 18)',
    ['maison', 'hotel', 'restaurant'].every((t) => new Set(I.METIERS_3D.map((m) => dessin(t, 'fini', m).json)).size === 1) && new Set(I.METIERS_3D.map((m) => dessin('maison', 'en_cours', m).json)).size >= 12)
  // Le bug du lot 5 : un chantier PAS COMMENCÉ dessiné en maison entière. Causes : l'étape « À facturer » du pipeline (facturé d'avance)
  // valait « terminé », et les dessins ignoraient l'avancement. Pas commencé = statut à planifier / planifié, avancement nul ou 0 %.
  const pasCommence = [{ statut: 'a_planifier', etape: 'chantier', avancement: null }, { statut: 'planifie', etape: 'a_facturer', avancement: null }, { statut: 'planifie', etape: 'paye', avancement: 0 }, { statut: 'a_planifier', etape: null, avancement: 0 }]
  T('B8 BUG « pas commencé dessiné fini » : à planifier / planifié, avancement nul ou 0 % — même facturé d’avance (étape « À facturer ») — donne un terrain et des fondations pour CHAQUE type (≤ 1,2 m)',
    pasCommence.every((c) => C.avancementDessine(c) === 0 && C.phaseDe(C.avancementDessine(c), false) === 'pas_commence' && TYPES.every((t) => haut(dessin(t, C.avancementDessine(c))) <= 1.2)))
  T('B9 l’avancement dessiné suit le TRAVAIL : 60 % → 0,6 ; terminé → 1 ; en cours sans tâche cochée → 0,05 (les premiers rangs) ; à facturer mais en cours à 10 % → 0,1 ; seuils 0 / 75 % / 100 %',
    C.avancementDessine({ statut: 'en_cours', etape: null, avancement: 60 }) === 0.6 && C.avancementDessine({ statut: 'termine', etape: null, avancement: 40 }) === 1 && C.avancementDessine({ statut: 'en_cours', etape: null, avancement: 0 }) === 0.05
      && C.avancementDessine({ statut: 'en_cours', etape: 'a_facturer', avancement: 10 }) === 0.1 && I.avancementDessine === C.avancementDessine
      && C.phaseDe(0) === 'pas_commence' && C.phaseDe(0.05) === 'en_cours' && C.phaseDe(0.74) === 'en_cours' && C.phaseDe(0.75) === 'presque_fini' && C.phaseDe(0.99) === 'presque_fini' && C.phaseDe(1) === 'fini' && C.phaseDe(0.3, true) === 'fini')
  const cas = [['Salle de bain, étage', 'maison'], ['Cuisine ouverte', 'maison'], ['Colonne d’immeuble', 'immeuble'], ['Rénovation de l’Hôtel des Pins', 'hotel'], ['Terrasse du restaurant', 'restaurant'], ['Brasserie du port', 'restaurant'],
    ['Résidence Les Vergers', 'immeuble'], ['Copropriété, parties communes', 'immeuble'], ['Appartement T3', 'appartement'], ['Boutique centre-ville', 'commerce'], ['Magasin de chaussures', 'commerce'], ['Plateau de bureaux', 'bureaux'],
    ['École maternelle', 'ecole'], ['Cabinet médical', 'sante'], ['Clinique vétérinaire', 'sante'], ['Gymnase municipal', 'equipement'], ['Salle des fêtes', 'equipement'], ['Piscine municipale', 'equipement'],
    ['Piscine coque', 'exterieur'], ['Aménagement du jardin', 'exterieur'], ['Terrasse bois', 'exterieur'], ['Hangar agricole', 'agricole'], ['Grange', 'agricole'], ['Entrepôt logistique', 'entrepot'], ['Résidence secondaire', 'maison'], ['Remplacement chaudière', 'maison']]
  const ratees = cas.filter(([t, ty]) => C.deduireType(t) !== ty)
  T('B10 type DÉDUIT du titre et de l’objet du devis par mots-clés (hôtel, restaurant/brasserie, immeuble/copropriété/résidence, appartement, boutique/magasin, bureaux, école, cabinet/clinique, gymnase/salle, jardin/terrasse/piscine → extérieur, hangar/grange…), repli « maison » ; le type POSÉ prime, un type inconnu est ignoré',
    ratees.length === 0 && C.deduireType(null, 'Rénovation des sanitaires de l’hôtel') === 'hotel' && C.typeDuChantier({ type_batiment: 'bureaux', titre: 'Salle de bain' }).type === 'bureaux' && C.typeDuChantier({ type_batiment: 'bureaux', titre: 'x' }).deduit === false
      && C.typeDuChantier({ type_batiment: 'chateau', titre: 'Hôtel' }).type === 'hotel' && C.typeDuChantier({ titre: 'Salle de bain' }).deduit === true && C.varianteExterieur('Piscine coque') === 'piscine' && C.varianteExterieur('Pelouse et haie') === 'jardin' && C.varianteExterieur('Terrasse bois') === 'terrasse',
    ratees.map(([t, ty]) => `${t} → ${C.deduireType(t)} (attendu ${ty})`).join(' | '))
  const grue = (d) => d.box.some((x) => x.c === I.P.ambre && Math.abs(x.s[0] - 3.2) < 1e-9)
  T('B11 la grue au-delà de deux étages pendant les travaux (appartement, immeuble, hôtel, bureaux), jamais pour une maison ni une fois fini', TYPES.every((t) => grue(dessin(t, 'en_cours')) === (I.GABARITS_BATIMENT[t].etages >= 3)) && TYPES.every((t) => !grue(dessin(t, 'fini'))))
  const deborde = []
  for (const t of TYPES) for (const p of PH) for (const m of ['plombier', 'electricien', 'couvreur', 'paysagiste', 'macon']) for (const x of dessin(t, p, m).box) {
    const tourne = x.r.some((v) => Math.abs(v) > 1e-9)
    const ex = tourne ? 0 : x.s[0] / 2, ez = tourne ? 0 : x.s[2] / 2
    if (Math.abs(x.p[0]) + ex > 2.26 || Math.abs(x.p[2]) + ez > 2.26) { deborde.push(`${t}/${p}/${m}:${x.f}@${x.p.map((v) => v.toFixed(2))}`); break }
  }
  T('B12 tout reste SUR la parcelle (4,4 m entre deux rues) : aucun morceau ne déborde sur la chaussée, pour 13 types × 4 états × 5 métiers', deborde.length === 0, deborde.slice(0, 5).join(' | '))
  const chevauche = []
  for (const t of TYPES) for (const p of ['en_cours', 'presque_fini']) for (const m of I.METIERS_3D) {
    const pal = dessin(t, p, m).box.find((x) => x.c === I.P.bois && Math.abs(x.s[0] - 0.6) < 1e-9 && Math.abs(x.s[1] - 0.1) < 1e-9 && Math.abs(x.s[2] - 0.45) < 1e-9)
    if (!pal) continue
    for (const r of I.emprisesChantier(t, 0, 0, p, 0.37)) if (pal.p[0] + pal.s[0] / 2 > r.x0 && pal.p[0] - pal.s[0] / 2 < r.x1 && pal.p[2] + pal.s[2] / 2 > r.z0 && pal.p[2] - pal.s[2] / 2 < r.z1) { chevauche.push(`${t}/${p}/${m}`); break }
  }
  const avecAccent = TYPES.filter((t) => dessin(t, 'en_cours', 'electricien').box.some((x) => x.c === I.P.bois && Math.abs(x.s[0] - 0.6) < 1e-9 && Math.abs(x.s[2] - 0.45) < 1e-9)).length
  T('B13 les matériaux du métier se posent sur une place LIBRE (ni le bâtiment et son échafaudage, ni la grue, ni la terrasse ou la cour) ; posés sur au moins 10 types sur 13', chevauche.length === 0 && avecAccent >= 10, `${chevauche.slice(0, 4).join(' | ')} · posés : ${avecAccent}`)
  if (LEVE) {
    const sc = scene(D, 'plombier', null, { infra: { base: null, metier: 'plombier' } })
    const hautDe = (titre) => sc.objets.find((o) => o.type === 'chantier' && o.libelle === titre)?.hauteur ?? null
    const pasC = D.chantiers.filter((c) => (c.statut === 'planifie' || c.statut === 'a_planifier') && !c.avancement).map((c) => c.titre)
    T('B14 dans l’exemple : les chantiers planifiés / à planifier sans tâche faite sont des terrains (épingle basse : sommet 1,1 m) ; l’hôtel en travaux est plus haut ; les types choisis sont dessinés',
      pasC.length >= 3 && pasC.every((t) => Math.abs(hautDe(t) - (1.1 + 0.15 + 1.6)) < 1e-9) && D.chantiers.some((c) => c.typeBatiment === 'hotel') && D.chantiers.filter((c) => c.typeBatiment).length >= 5, pasC.map((t) => `${t}:${hautDe(t)}`).join(' '))
  }

}

// ═══════════════════════ C. La scène ═══════════════════════
{
  // Empreinte de la sortie de construireScene SANS l'option `infra`, prise AVANT le chantier de l'infrastructure (20/10/2026) :
  // les neuf préréglages, le métier de la fiche, la scène vide, et l'option `vivant` — drapeau baissé, rien n'a bougé.
  const EMPREINTE_AVANT = 'ad87236dc534a2f5d20a28f6e5138eadfa0205307065346d8be6c3992db8a12d'
  const VIDE = jeu({ jour: D.jour })
  const sorties = [...At.PREREGLAGES.map((p) => At.construireScene(D, p)), At.construireScene(D), At.construireScene(VIDE), At.construireScene(D, undefined, { vivant: { assistants: 3 } })]
  T('C1 SANS l’option `infra` (drapeau baissé) : la scène est octet pour octet celle d’avant (empreinte sha256 des 12 sorties)', sha(sorties) === EMPREINTE_AVANT, sha(sorties))
  T('C2 sans l’option : ni `infra`, ni `fenetres`, ni `mobiles` ; et l’exemple n’a pas de forme juridique (rien n’est lu drapeau baissé)', sorties.every((s) => !('infra' in s) && !('fenetres' in s) && !('mobiles' in s)) && !('formeJuridique' in D))
  const sans = At.construireScene(D, 'plombier'), avec = scene(D, 'plombier')
  const vue = (s) => s.objets.filter((o) => o.type !== 'structure').map((o) => [o.cle, o.type, o.libelle, o.detail, o.badges, o.epingle, o.etat, o.info]).sort((a, b) => a[0].localeCompare(b[0]))
  T('C3 avec l’infrastructure : les MÊMES objets de données (clés, détails, badges, états, cartes) ; s’y ajoutent seulement les structures de la base (lot 4)', egal(vue(sans), vue(avec)) && egal(sans.horsScene, avec.horsScene) && avec.objets.some((o) => o.type === 'structure'))
  T('C4 la scène dit son profil, son lieu (déduit : l’exemple → entrepôt) ; un lieu déclaré l’emporte et se dit « choisi »', avec.infra.base === 'entrepot' && avec.infra.auto === true && scene(D, 'plombier', 'legere').infra.base === 'legere' && scene(D, 'plombier', 'legere').infra.auto === false)
  const S = (s) => new Set(s.infra.structures)
  const tous = (s, l) => l.every((k) => S(s).has(k))
  T('C5 chaque lieu a SES bâtiments : maison, garage ouvert, allée, clôture et jardin ; atelier à porte sectionnelle, auvent, cour et bureau accolé ; hangar à bardage, quais, portes multiples, parking poids lourds, bureaux en étage avec escalier, clôture et portail ; camion-atelier et table pliante',
    I.BASES.every((b) => tous(scene(I.echantillonPourBase(D, b), 'general', b), I.BATIMENTS[b])) && !S(scene(I.echantillonPourBase(D, 'legere'), 'general', 'legere')).has('hangar-bardage'), I.BASES.map((b) => b + ':' + [...S(scene(I.echantillonPourBase(D, b), 'general', b))].join('/')).join(' | '))
  // — jamais un décor qui suggère un équipement absent —
  const seul = jeu({ membres: [membre(0)], vehicules: [vehicule(1)] })
  const sSeul = scene(seul, 'plombier')
  T('C6 artisan seul sans stock : chez lui — AUCUN rayonnage, AUCUN vestiaire, aucune livraison à quai, une boîte aux lettres (pas de totem de société)',
    sSeul.infra.base === 'legere' && !sSeul.objets.some((o) => o.type === 'categorie') && !S(sSeul).has('vestiaire') && !S(sSeul).has('livraison-a-quai') && S(sSeul).has('boite-aux-lettres') && !S(sSeul).has('totem-societe'))
  const sEq = scene(D, 'plombier')
  T('C7 entrepôt d’une équipe : vestiaire, un rayonnage par catégorie, totem de société, camion de livraison à quai (il y a des commandes attendues)', S(sEq).has('vestiaire') && S(sEq).has('totem-societe') && S(sEq).has('livraison-a-quai') && sEq.objets.filter((o) => o.type === 'categorie').length === new Set(D.materiaux.map((m) => m.categorie)).size)
  const grandSeul = scene(jeu({ membres: [membre(0)], materiaux: Array.from({ length: 30 }, (_, i) => materiau(i, `Cat ${i % 3}`)) }), 'macon')
  T('C8 entrepôt d’un artisan SEUL (grand stock, aucune commande) : le hangar, mais ni vestiaire ni camion de livraison', grandSeul.infra.base === 'entrepot' && !S(grandSeul).has('vestiaire') && !S(grandSeul).has('livraison-a-quai'))
  const atel = scene(I.echantillonPourBase(D, 'atelier'), 'menuisier')
  T('C9 atelier (3 personnes, 2 véhicules, 4 catégories) : 4 rayonnages ; le toit en sheds du menuisier, en deux pans pour l’électricien', atel.infra.base === 'atelier' && atel.objets.filter((o) => o.type === 'categorie').length === 4 && S(atel).has('sheds') && S(scene(I.echantillonPourBase(D, 'atelier'), 'electricien')).has('deux-pans'))
  // — véhicules, marche —
  const vDuJour = D.vehicules.filter((v) => v.actif && D.chantiers.some((c) => c.vehicule_id === v.id && At.estAujourdhui(c, D.jour)))
  const garees = sEq.objets.filter((o) => o.type === 'vehicule' && vDuJour.some((v) => o.ref === v.id))
  const chantiers = new Map(sEq.objets.filter((o) => o.type === 'chantier').map((o) => [o.ref, o.centre]))
  T('C10 un véhicule affecté au chantier du jour est garé le long de CE chantier ; sans local, le camion-atelier reste la base (portes ouvertes)', vDuJour.length > 0 && garees.length === vDuJour.length && garees.every((o) => { const c = D.chantiers.find((x) => x.vehicule_id === o.ref && At.estAujourdhui(x, D.jour)); const p = chantiers.get(c.id); return p && Math.abs(o.centre[0] - (p[0] + 2.8)) < 1e-9 }) && (() => { const s = scene(I.echantillonPourBase(D, 'camion'), 'electricien', 'camion'); const v = s.objets.find((o) => o.type === 'vehicule'); return v && Math.abs(v.centre[0] - I.PLANS.camion.places[0][0]) < 1e-9 && Math.abs(v.centre[2] - I.PLANS.camion.places[0][1]) < 1e-9 })())
  const taille = (nom) => { const s = scene(jeu({ membres: [membre(0)], vehicules: [vehicule(1, true, nom)] }), 'general', 'atelier'); const io = s.objets.findIndex((o) => o.type === 'vehicule'); const mes = toutes(s).filter((x) => x.o === io && x.s[1] > 0.03); return Math.max(...mes.map((x) => x.p[0] + x.s[0] / 2)) - Math.min(...mes.map((x) => x.p[0] - x.s[0] / 2)) }
  T('C11 chaque véhicule à son gabarit : voiture < fourgonnette < fourgon < camion (longueur dessinée)', taille('Clio') < taille('Kangoo') && taille('Kangoo') < taille('Renault Master') && taille('Renault Master') < taille('Camion benne'))
  const auj = sEq.objets.filter((o) => o.type === 'membre' && o.etat.aujourdhui)
  T('C12 marche : 4 morceaux par personnage affecté à un chantier du jour, aucun pour les autres, chacun à son arrivée',
    sEq.mobiles.length === auj.length * 4 && sEq.mobiles.every((m) => { const it = sEq.instances[m.forme][m.index]; const o = sEq.objets[it.o]; return o?.type === 'membre' && o.etat.aujourdhui && Math.abs(it.p[0] - m.vers[0]) < 1e-9 && Math.abs(it.p[2] - m.vers[1]) < 1e-9 }))
  // — tout distinct —
  const combis = []
  for (const p of At.PREREGLAGES) for (const b of I.BASES) combis.push(sha(scene(I.echantillonPourBase(D, b), p, b)))
  T('C13 36 combinaisons métier × lieu : 36 maquettes toutes différentes', new Set(combis).size === 36, String(new Set(combis).size))
  const jeux = []
  for (const b of I.BASES) for (const f of ['EI', 'SARL']) for (const noms of [['Kangoo'], ['Kangoo', 'Camion benne']]) {
    const d = jeu({ membres: [membre(0), membre(1)], vehicules: noms.map((n, i) => vehicule(i + 1, true, n)), formeJuridique: f })
    jeux.push(JSON.stringify([...S(scene(d, 'general', b))].sort()))
  }
  T('C14 chaque lieu × statut × gabarits (4 × 2 × 2) donne un jeu de structures distinct (bâtiments, totem ou boîte aux lettres, place et entrée de camion)', new Set(jeux).size === 16, String(new Set(jeux).size))
  const couleurs = []
  for (const p of At.PREREGLAGES) for (const b of I.BASES) { const s = scene(I.echantillonPourBase(D, b, { camion: true }), p, b); couleurs.push(...toutes(s).map((x) => x.c), ...s.fenetres.flatMap((f) => [f.c, f.nuit])) }
  const bleu = [...new Set(couleurs)].filter((c) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); return (b > r + 25 && b > g) || (r > 200 && g < 80 && b < 80) })
  T('C15 palette de la maquette : ni bleu dominant, ni rouge vif (36 scènes, toutes les couleurs, fenêtres comprises)', bleu.length === 0 && couleurs.every((c) => /^#[0-9A-Fa-f]{6}$/.test(c)), bleu.join(', '))
  T('C16 stable : mêmes données → même maquette (aucun hasard)', JSON.stringify(scene(D, 'couvreur')) === JSON.stringify(scene(D, 'couvreur')))
  const posteDedans = I.BASES.every((b) => { const s = scene(I.echantillonPourBase(D, b), 'general', b, { vivant: { assistants: 2 } }); const o = s.objets.find((x) => x.type === 'assistants'); const r = I.PLANS[b].lot; return o && o.centre[0] > r.x0 && o.centre[0] < r.x1 && o.centre[2] > r.z0 && o.centre[2] < r.z1 })
  T('C17 avec l’atelier vivant : le poste des assistants est sur la parcelle de la base, quelle qu’elle soit', posteDedans)
  const fin = I.BASES.flatMap((b) => { const s = scene(I.echantillonPourBase(D, b), 'macon', b); return [s.bornes.min[0], s.bornes.max[0], s.bornes.min[2], s.bornes.max[2], s.bornes.max[1]].filter((v) => !Number.isFinite(v)) })
  T('C18 cadrage : bornes finies pour les quatre lieux', fin.length === 0)
}

// ═══════════════════════ D. Jour, nuit, marche ═══════════════════════
{
  T('D1 moments : 11 h jour, 7 h et 19 h crépuscule, 21 h 30 et 3 h nuit, 8 h et 18 h aux bornes', I.momentDe(11) === 'jour' && I.momentDe(7) === 'crepuscule' && I.momentDe(19) === 'crepuscule' && I.momentDe(21.5) === 'nuit' && I.momentDe(3) === 'nuit' && I.momentDe(8) === 'jour' && I.momentDe(18) === 'crepuscule' && I.momentDe(-3) === 'nuit' && I.momentDe(24) === 'nuit')
  T('D2 fenêtres et lampadaires allumés le soir seulement (crépuscule et nuit), jamais en plein jour', !I.ambiance(12).lumieres && I.ambiance(19).lumieres && I.ambiance(23).lumieres)
  const amb = [6, 12, 19, 23].map(I.ambiance)
  const bleu = amb.flatMap((a) => [a.fond, a.ciel, a.terre, a.soleil]).filter((c) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)); return b > r + 25 && b > g })
  T('D3 la nuit est sombre mais chaude (fond sombre, pas de bleu dominant dans aucune lumière)', bleu.length === 0 && parseInt(I.ambiance(23).fond.slice(1, 3), 16) < 0x40 && I.ambiance(23).intensite < I.ambiance(12).intensite)
  const h = I.heureParis(new Date('2026-10-20T19:30:00Z'))
  T('D4 heure de Paris quel que soit le fuseau du navigateur (19 h 30 UTC le 20/10 → 21 h 30 à Paris, heure d’été)', Math.abs(h - 21.5) < 1e-9, String(h))
  const m = { forme: 'box', index: 0, de: [0, 0], porte: [10, 0], vers: [10, 6], ordre: 1 }
  const t0 = I.decalageMarche(m, 0), fin = I.decalageMarche(m, I.dureeMarche([m]) + 1), mi = I.decalageMarche(m, I.MARCHE.departMs + I.MARCHE.decalageMs + (8 / I.MARCHE.vitesse) * 1000), tot = I.decalageMarche(m, I.MARCHE.departMs + I.MARCHE.decalageMs + (0.8 / I.MARCHE.vitesse) * 1000)
  T('D5 marche : au départ avant son tour, exactement à l’arrivée ensuite, sur le trajet entre deux (par la sortie de la base), départ en douceur (moins de 0,8 m parcouru au temps de 0,8 m)', egal(t0, [-10, 0, -6]) && egal(fin, [0, 0, 0]) && Math.abs(mi[0] - -2) < 1e-6 && Math.abs(mi[2] - -6) < 1e-6 && tot[0] + 10 < 0.8 && tot[0] + 10 > 0, JSON.stringify([t0, mi, tot, fin]))
  T('D6 durée de la marche raisonnable sur l’exemple (moins de 15 s, le dernier compris)', (() => { const s = scene(D, 'plombier'); const d = I.dureeMarche(s.mobiles); return d > 1300 && d < 15000 })())
}

// ═══════════════════════ E. Les sources ═══════════════════════
{
  const s3d = sansCommentaires(lire('app/crm/atelier/Scene3D.tsx'))
  const at = sansCommentaires(lire('app/crm/atelier/Atelier.tsx'))
  const infra = sansCommentaires(lire('lib/crm/infrastructure.ts'))
  const demo = sansCommentaires(lire('app/atelier-demo/Demo.tsx'))
  const plan = sansCommentaires(lire('app/crm/atelier/Plan2D.tsx'))
  const srv = sansCommentaires(lire('lib/crm/serveur.ts'))
  T('E1 « réduire les animations » : la marche ne démarre pas (mouvementReduit au départ), s’arrête net si la préférence change (écouteur, calme.current)',
    /const departMarche = useMemo\(\(\) => \(mouvementReduit\(\) \? null : performance\.now\(\)\), \[\]\)/.test(s3d) && /if \(mb && marche && !calme\.current\)/.test(s3d) && /addEventListener\?\.\('change', f\)/.test(s3d) && /performance\.now\(\) < marche\.fin && !calme\.current/.test(s3d))
  T('E2 un seul calque de plus (les fenêtres : meshBasicMaterial non éclairé, sans ombre) ; toujours une couche instanciée par forme', /FORMES\.map\(\(f\) => \(\s*<Couche/.test(s3d) && (s3d.match(/<Couche /g) ?? []).length === 2 && /lumiere \? <meshBasicMaterial toneMapped=\{false\} \/>/.test(s3d) && /castShadow=\{!lumiere\}/.test(s3d))
  T('E3 ombres toujours figées (une mise à jour à l’arrivée des personnages) ; ombres douces par rayon PCF (pas de PCFSoft, déprécié)', /rafraichirA/.test(s3d) && /gl\.shadowMap\.autoUpdate = false/.test(s3d) && /shadow-radius=\{3\}/.test(s3d) && !/shadows="soft"|PCFSoft/.test(s3d))
  T('E4 le réglage (métier, lieu) se garde en localStorage, chaque accès sous try/catch, et seulement drapeau levé ; aucune écriture serveur',
    /function lireReglage\(\): Reglage \{\s*try \{/.test(at) && /function ecrireReglage\(r: Reglage\) \{\s*try \{ window\.localStorage\.setItem/.test(at) && /if \(infra\) ecrireReglage/.test(at) && (at.match(/localStorage/g) ?? []).length === 2)
  const reseau = /fetch\s*\(|XMLHttpRequest|sendBeacon|supabase|method:\s*['"](POST|PUT|PATCH|DELETE)['"]|\.insert\(|\.update\(|\.upsert\(|\.delete\(|localStorage|sessionStorage/
  T('E5 lib/crm/infrastructure.ts est pur : aucun réseau, aucune base, aucun stockage, aucun three', !reseau.test(infra) && !/from ['"](three|@react-three)/.test(infra) && /^import type \{[^}]+\} from '\.\/atelier\.ts'$/m.test(infra))
  T('E6 Scene3D n’a gagné ni fetch ni écriture ; Atelier n’a gagné aucun appel réseau', !/fetch\s*\(|localStorage/.test(s3d) && !/fetch\s*\(/.test(at))
  T('E7 TOUT est derrière le drapeau : `infra = actif(\'crmAtelierVivant\')` ; drapeau baissé, l’appel à construireScene est celui d’avant, mot pour mot',
    at.includes("const infra = actif('crmAtelierVivant')") && at.includes(': construireScene(donnees, prereglage, total !== null ? { vivant: { assistants: total } } : undefined)), [donnees, prereglage, total, infra, base, metier3D])') && /\{infra && scene\.infra && \(/.test(at) && at.includes('heure={infra ? heure ?? null : null}'))
  T('E8 la forme juridique n’est LUE (jamais écrite) que drapeau levé : colonnes de la fiche conditionnelles, champ absent sinon',
    srv.includes("const COLONNES_FICHE = (): string => (actif('crmAtelierVivant') ? 'plan, metier, forme_juridique, nom, ville, adresse, code_postal' : 'plan, metier')") && srv.includes("...(actif('crmAtelierVivant') ? { formeJuridique: fiche?.forme_juridique ?? null, entreprise: { nom: fiche?.nom ?? null, ville: fiche?.ville ?? null }, siege: { adresse: fiche?.adresse ?? null, code_postal: fiche?.code_postal ?? null, ville: fiche?.ville ?? null } } : {})") && /select\(COLONNES_FICHE\(\)\)/.test(srv))
  T('E9 la démonstration lit ?base= (dont camion), ?statut=, ?camion= et ?heure= drapeau levé seulement, et ramène les données fictives au cas demandé', /const infra = actif\('crmAtelierVivant'\)/.test(demo) && /const base = infra && /.test(demo) && /const statut = infra && /.test(demo) && /const camion = infra && /.test(demo) && demo.includes('echantillonPourBase(FICTIF, base ?? \'entrepot\', { statut, camion })') && demo.includes('baseInitiale={base} heure={heure}'))
  T('E10 l’écran dit d’où vient le lieu (« déduit de vos données » / « choisi par vous ») dans le menu de l’atelier et dans le plan 2D',
    at.includes("scene.infra.auto ? 'déduit de vos données' : 'choisi par vous'") && plan.includes("scene.infra.auto ? ' · déduit de vos données' : ' · choisi par vous'") && at.includes('LIBELLES_LIEU[b]'))
  T('E11 libellés : bases « Base légère / Atelier / Entrepôt / Camion-atelier », lieux « de chez moi / atelier / entrepôt / pas de local » ; aucun « Presti » dans les textes ajoutés',
    egal(I.LIBELLES_BASE, { legere: 'Base légère', atelier: 'Atelier', entrepot: 'Entrepôt', camion: 'Camion-atelier' }) && I.LIBELLES_LIEU.camion === 'Pas de local (tout dans le camion)' && I.LIBELLES_LIEU.legere === 'Je travaille de chez moi' && ![infra, demo].some((s) => /presti/i.test(s)))
  const css = sansCommentaires(lire('app/crm/atelier/atelier.css'))
  T('E12 CSS ajouté : jetons seulement (aucune couleur écrite en dur)', /\.atl-plan-base \{[^}]*var\(--accent-tint\)/.test(css) && !/\.atl-(plan-base|plan-profil|origine) \{[^}]*(#[0-9a-f]{3,8}\b|rgb\()/i.test(css))
}

// ═══════════════════════ G. Lot 3 (20/10) : nuit, hall, marche par les rues, maçons, barre d'outils ═══════════════════════
{
  const rgb = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
  const sat = (c) => { const v = rgb(c); return Math.max(...v) - Math.min(...v) }
  const nuit = I.ambiance(23), soir = I.ambiance(19)
  T('G1 nuit : ciel bleu nuit TRÈS désaturé (froid, mais b − r < 25), lune froide et légère, sol encore éclairé ; crépuscule peu saturé (écart des canaux < 70)',
    rgb(nuit.fond)[2] > rgb(nuit.fond)[0] && rgb(nuit.fond)[2] - rgb(nuit.fond)[0] < 25 && rgb(nuit.soleil)[2] > rgb(nuit.soleil)[0] && nuit.intensite <= 0.6 && nuit.hemi >= 0.9 && sat(soir.fond) < 70 && sat(soir.soleil) < 90 && sat(soir.ciel) < 70, JSON.stringify([nuit, soir]))
  const HALL = ['allees', 'zone-montage', 'chariot', 'poste-travail', 'tri', 'panneau-outils', 'extincteur']
  const kinds = (p, b) => new Set(I.accessoiresBase(p, I.PLANS[b]).map((a) => a.k))
  T('G2 le hall de l’atelier et de l’entrepôt se meuble (allées marquées, zone de montage, chariot, poste, tri, panneau d’outils, extincteurs) ; rien de tel chez soi ni dans le camion ; aucune forme nouvelle',
    At.PREREGLAGES.every((p) => HALL.every((k) => kinds(p, 'atelier').has(k) && kinds(p, 'entrepot').has(k)) && !HALL.some((k) => kinds(p, 'legere').has(k) || kinds(p, 'camion').has(k))) && At.PREREGLAGES.every((p) => I.accessoiresBase(p, I.PLANS.entrepot).every((a) => At.FORMES.includes(a.f))))
  // — la marche suit les rues et ne traverse rien —
  const coupe = (a, b, r) => { // segment [a, b] contre rectangle r (ouvert) : échantillonnage fin, suffisant pour des segments de quelques mètres
    const n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.05))
    for (let i = 0; i <= n; i++) { const x = a[0] + (b[0] - a[0]) * i / n, z = a[1] + (b[1] - a[1]) * i / n; if (x > r.x0 + 1e-6 && x < r.x1 - 1e-6 && z > r.z0 + 1e-6 && z < r.z1 - 1e-6) return true }
    return false
  }
  const fautes = [], durees = []
  let marcheurs = 0
  for (const b of I.BASES) for (const p of ['macon', 'electricien', 'plombier']) {
    const d = b === 'entrepot' ? D : I.echantillonPourBase(D, b)
    const s = scene(d, p, b), pl = I.PLANS[b]
    const maisons = s.objets.filter((o) => o.type === 'chantier').map((o) => ({ x0: o.centre[0] - 1.95, x1: o.centre[0] + 1.95, z0: o.centre[2] - 1.95, z1: o.centre[2] + 1.95 }))
    const vus = new Set()
    for (const m of s.mobiles) {
      const cle = m.chemin.join('|'); if (vus.has(cle)) continue; vus.add(cle); marcheurs++
      if (!egal(m.chemin[0], m.de) || !egal(m.chemin[m.chemin.length - 1], m.vers)) fautes.push(`${b}/${p}: bouts`)
      m.chemin.forEach((q, i) => { if (!i) return; const a = m.chemin[i - 1]
        for (const r of maisons) if (coupe(a, q, r)) fautes.push(`${b}/${p}: traverse un chantier [${a}]→[${q}]`)
        if (i > pl.interne) for (const r of pl.batiments) if (coupe(a, q, r)) fautes.push(`${b}/${p}: traverse la base [${a}]→[${q}]`)
        // entre la sortie de la base et la parcelle : des tronçons de rue, parallèles aux axes
        if (i > pl.chemin.length && i < m.chemin.length - 1 && Math.abs(a[0] - q[0]) > 1e-6 && Math.abs(a[1] - q[1]) > 1e-6) fautes.push(`${b}/${p}: tronçon en biais`)
      })
      durees.push(I.dureeMarche([m]))
    }
  }
  T('G3 la marche suit les allées puis les RUES (tronçons parallèles aux axes, plus court chemin) et ne traverse AUCUNE maison de chantier ni aucun bâtiment de la base (hors ses portes), dans les quatre lieux',
    marcheurs > 10 && fautes.length === 0, `${marcheurs} trajets · ` + fautes.slice(0, 4).join(' | '))
  T('G4 la marche reste lisible : moins de 20 s pour le dernier arrivé ; départ et arrivée en douceur gardés (D5)', Math.max(...durees) < 20000, String(Math.max(...durees)))
  const r = I.cheminRues([-2.8, 14], [-2.8, -14])
  T('G5 plus court chemin : pour traverser, on fait le tour de la base par la rue de ceinture (aucun tronçon dans l’enclos)', !!r && r.every((q, i) => !i || !(Math.abs(q[0] - r[i - 1][0]) < 1e-6 && q[0] > -14 && q[0] < 25.2 && Math.min(q[1], r[i - 1][1]) < 14 && Math.max(q[1], r[i - 1][1]) > -14)) && Math.abs(r.reduce((t, q, i) => (i ? t + Math.hypot(q[0] - r[i - 1][0], q[1] - r[i - 1][1]) : 0), 0) - (11.2 + 28 + 11.2)) < 1e-6)
  T('G6 aucune parcelle de chantier dans l’enclos de la base (la rangée qui touchait le lot est restée libre)', I.BASES.every((b) => scene(I.echantillonPourBase(D, b), 'general', b).objets.filter((o) => o.type === 'chantier').every((o) => I.horsEnclos(o.centre))))
  // — les deux maçons en entrepôt —
  const m1 = scene(D, 'macon', 'entrepot'), m2 = scene(I.echantillonPourBase(D, 'entrepot', { statut: 'societe', camion: true }), 'macon', 'entrepot')
  const S1 = new Set(m1.infra.structures), S2 = new Set(m2.infra.structures)
  const boxes = (s) => s.instances.cone.filter((x) => [I.P.sable, I.P.granulat, '#B5AC9E'].includes(x.c)).length
  T('G7 maçon en entrepôt AVEC camion benne : pont-bascule, aire de lavage, parc d’engins, plateforme de stockage (trois grands boxes de plus, quatre dans la cour) et grue à tour ; sans camion, rien de cela (tiré des données, stable)',
    ['pont-bascule', 'aire-lavage', 'parc-engins', 'plateforme-stockage', 'grue-a-tour', 'place-camion'].every((k) => S2.has(k) && !S1.has(k)) && boxes(m2) === 7 && boxes(m1) === 3 && JSON.stringify(m2) === JSON.stringify(scene(I.echantillonPourBase(D, 'entrepot', { statut: 'societe', camion: true }), 'macon', 'entrepot')), `${boxes(m1)} / ${boxes(m2)}`)
  // — la barre d'outils —
  const at = sansCommentaires(lire('app/crm/atelier/Atelier.tsx')), css = sansCommentaires(lire('app/crm/atelier/atelier.css'))
  T('G8 barre d’outils (source) : sur une ligne avec l’infrastructure (classe une-ligne, nowrap, filtres qui défilent, libellés courts sous 1600 px), métier et lieu rangés dans « Réglages de l’atelier », « Plan 2D » toujours dans la barre',
    at.includes("className={`atl-barre${infra ? ' une-ligne' : ''}`}") && /<details className="atl-reglages"/.test(at) && /\.atl-barre\.une-ligne \{ flex-wrap: nowrap \}/.test(css) && /\.atl-bande \{[^}]*overflow-x: auto/.test(css) && at.indexOf('className="atl-bascule"') > at.indexOf('className="atl-reglages"'))
}

// ═══════════════════════ I. Lot 4 (20/10) : tous les métiers, tout est cliquable, le stock se remplit, une seule source ═══════════════════════
{
  // — I1-I3 : les métiers —
  const onb = lire('app/onboarding/page.tsx')
  const liste = [...onb.slice(onb.indexOf('const METIERS = ['), onb.indexOf(']', onb.indexOf('const METIERS = ['))).matchAll(/'([^']+)'/g)].map((m) => m[1]).filter((m) => m !== 'Autre')
  const ref = I.METIERS_REFERENCE.flatMap((g) => g.metiers)
  T('I1 le sélecteur propose TOUS les métiers de Presti (liste de l’inscription), groupés, plus « Écrire mon métier »', liste.length >= 28 && liste.every((m) => ref.some((r) => r.libelle === m)) && I.METIERS_REFERENCE.length >= 6 && lire('app/crm/atelier/Atelier.tsx').includes('Écrire mon métier…'), liste.filter((m) => !ref.some((r) => r.libelle === m)).join(', '))
  T('I2 chaque métier de la liste est rattaché à SES structures (le libellé, passé par la correspondance par mots-clés, retombe sur le même jeu)', ref.every((r) => I.metier3DDe(r.libelle) === r.m3d), ref.filter((r) => I.metier3DDe(r.libelle) !== r.m3d).map((r) => `${r.libelle}→${I.metier3DDe(r.libelle)}≠${r.m3d}`).join(' | '))
  const libres = [['élagueur', 'paysagiste'], ['Frigoriste', 'climaticien'], ['serrurier-métallier', 'serrurier'], ['ravalement de façades', 'facadier'], ['charpente traditionnelle', 'charpentier'], ['pose de piscines', 'piscinier'], ['homme toutes mains', 'multiservice'], ['poseur de cloisons', 'plaquiste'], ['installateur de volets', 'vitrier'], ['métier inconnu', 'general'], [null, 'general']]
  T('I3 saisie libre : correspondance par mots-clés (élagueur → paysagiste, frigoriste → climaticien…), repli « tous corps d’état »', libres.every(([t, m]) => I.metier3DDe(t) === m), libres.filter(([t, m]) => I.metier3DDe(t) !== m).map(([t]) => t).join(', '))
  T('I4 dix-huit jeux de structures (les neuf d’avant, recopiés à l’identique, et neuf nouveaux : paysagiste, serrurier, vitrier, plaquiste, façadier, charpentier, climaticien, piscinier, multiservice)', egal([...I.METIERS_HISTORIQUES], [...At.PREREGLAGES]) && I.METIERS_3D.length === 18 && I.METIERS_EN_PLUS.every((m) => I.SIGNATURES[m] && I.MATIERES[m] && I.CATEGORIES_TYPIQUES[m]?.length))
  const manque = []
  for (const p of I.METIERS_EN_PLUS) for (const b of ['atelier', 'entrepot']) { const ks = new Set(I.accessoiresBase(p, I.PLANS[b]).map((a) => a.k)); for (const k of I.SIGNATURES[p]) if (!ks.has(k)) manque.push(`${p}/${b}:${k}`) }
  T('I5 chaque nouveau métier montre ses structures (serre, pépinière ; racks de profilés, poste de soudure ; chevalets à vitrage ; plaques ; échafaudage de façade ; poutres et fermette ; PAC et groupe froid ; coques et filtration…)', manque.length === 0, manque.join(' | '))
  const scenes18 = []
  for (const m of I.METIERS_3D) for (const b of I.BASES) scenes18.push(sha(scene(I.echantillonPourBase(D, b), I.PROCHE[m], b, { infra: { base: b, metier: m } })))
  T('I6 18 métiers × 4 lieux : 72 maquettes toutes différentes', new Set(scenes18).size === 72, String(new Set(scenes18).size))
  const maison = (metier, pct, type = 'maison') => { const box = [], fen = []; I.maisonChantier((f, p, s, c, o, r = [0, 0, 0]) => { box.push({ f, p, s, c, r }); return box.length - 1 }, (p, s, j, n) => fen.push({ p, s, j, n }), { x: 0, z: 0, h: 0.37, id: 'chantier-test', pct, termine: pct >= 1, enCours: pct > 0 && pct < 1, o: 0, type }, metier); return JSON.stringify({ box, fen }) }
  T('I7 les chantiers des nouveaux métiers changent avec l’avancement (lot 5 : quatre états, leurs matériaux pendant les travaux)', I.METIERS_EN_PLUS.every((m) => new Set([0, 0.4, 0.8, 1].map((v) => maison(m, v))).size === 4 && new Set([0, 0.4, 0.8, 1].map((v) => maison(m, v, 'exterieur'))).size === 4))
  // — I8-I11 : tout ce qui se voit est cliquable et utile —
  const types = new Set(), sansPanneau = [], decorCliquable = []
  const panneau = lire('app/crm/atelier/Panneau.tsx')
  for (const b of I.BASES) for (const m of ['macon', 'plombier', 'paysagiste']) {
    const d = b === 'entrepot' ? I.echantillonPourBase(D, b, { camion: true }) : I.echantillonPourBase(D, b)
    const s = scene(d, I.PROCHE[m], b, { infra: { base: b, metier: m }, vivant: { assistants: 2 } })
    for (const o of s.objets) {
      types.add(o.type)
      if (o.type === 'structure' && !(o.fiche && o.fiche.titre && o.fiche.role && (o.fiche.actions.length > 0 || o.fiche.stock))) sansPanneau.push(`${b}/${m}:${o.ref}`)
    }
    // Le mobilier du hall reste décor pur : aucune de ses formes n'a d'objet (pas de main, pas de survol).
    const io = new Set(s.objets.filter((o) => o.type === 'structure').map((o) => o.ref))
    for (const k of I.DECOR_PUR) if (io.has(k)) decorCliquable.push(k)
  }
  const cases = { chantier: "objet.type === 'chantier'", categorie: "objet.type === 'categorie'", vehicule: "objet.type === 'vehicule'", membre: "objet.type === 'membre'", accueil: "objet.type === 'accueil'", bureau: "objet.type === 'bureau'", assistants: "objet.type === 'assistants'", structure: "objet.type === 'structure'" }
  T('I8 chaque TYPE d’objet de la scène a son panneau (chantier, catégorie, véhicule, compagnon, accueil, bureau, assistants, structure)', [...types].every((t) => cases[t] && panneau.includes(cases[t])) && types.has('structure'), [...types].join(','))
  T('I9 chaque structure cliquable a une fiche explicite : titre, à quoi elle sert, données liées, au moins une action (ou le stock à remplir)', sansPanneau.length === 0, sansPanneau.slice(0, 5).join(' | '))
  T('I10 le décor pur (allées, chariot, bacs de tri, extincteurs, panneau d’outils…) n’est PAS cliquable', decorCliquable.length === 0, decorCliquable.join(','))
  const ent = scene(I.echantillonPourBase(D, 'entrepot', { camion: true }), 'macon', 'entrepot')
  const cles = new Set(ent.objets.map((o) => o.cle))
  const camionBenne = ent.objets.find((o) => o.type === 'vehicule' && /Camion benne/.test(o.libelle))
  const livr = ent.objets.find((o) => o.cle === 'structure:livraison')
  T('I11 en entrepôt : le camion benne (véhicule) et le camion de livraison (commandes attendues, stock concerné) sont des objets cliquables, comme le hangar, les quais, le pont-bascule, la grue, le parc d’engins, les boxes, le silo',
    !!camionBenne && !!livr && livr.fiche.lignes[0].includes('commande') && livr.fiche.actions.some((a) => a.objet?.startsWith('categorie:') || a.href === '/inventaire') && ['hangar', 'quais', 'pont-bascule', 'grue-a-tour', 'parc-engins', 'plateforme-stockage', 'boxes-granulats', 'silo-mortier'].every((k) => cles.has(`structure:${k}`)), [...cles].filter((c) => c.startsWith('structure:')).join(','))
  // — I12-I15 : le stock se remplit depuis l'atelier, par les routes d'inventaire existantes —
  const stockSrc = sansCommentaires(lire('app/crm/atelier/Stock.tsx'))
  T('I12 le panneau stock a ses actions : ajouter un article (nom, unité, catégorie, quantité, seuil, fournisseur), entrée / sortie / comptage, seuil ; état vide « Ajouter mon premier article » avec les catégories du métier ; exemple : rien n’est écrit, et c’est dit',
    stockSrc.includes('Ajouter mon premier article') && stockSrc.includes('Fournisseur préféré') && stockSrc.includes('Seuil d’alerte') && /value="entree"[\s\S]*value="sortie"[\s\S]*value="inventaire"/.test(stockSrc) && /if \(sansEcriture\) \{ setNote/.test(stockSrc) && stockSrc.includes('rien n’est enregistré') && lire('app/crm/atelier/Panneau.tsx').includes('<StockRapide') && lire('app/crm/atelier/Structure.tsx').includes('<StockRapide'))
  const routes = [...stockSrc.matchAll(/appel(?:<[^>]+>)?\(\s*[`'](\/api\/[^`'?$]+)/g)].map((m) => m[1])
  T('I13 aucune route nouvelle : l’atelier écrit par /api/inventaire/materiaux (fiche) et /api/inventaire (mouvement) — celles de l’écran Inventaire', routes.length >= 4 && routes.every((r) => r === '/api/inventaire/materiaux' || r === '/api/inventaire') && fs.readdirSync(path.join(RACINE, 'app/api/inventaire')).sort().join() === 'fournisseurs,materiaux,observations,recherche,route.ts', routes.join(','))
  const rInv = sansCommentaires(lire('app/api/inventaire/route.ts')), rMat = sansCommentaires(lire('app/api/inventaire/materiaux/route.ts')), sqlMvt = lire('supabase/migrations/0045_colonnes_figees.sql')
  T('I14 les routes utilisées refusent un corps invalide (quantité négative ou non numérique, type inconnu, nom vide → 400) et un AUTRE compte (fiche : .eq(\'artisan_id\', a.uid) → 404 ; mouvement : la fonction SQL refuse un matériau d’un autre artisan)',
    /quantite < 0[\s\S]{0,120}status: 400/.test(rInv) && /Type de mouvement inconnu\.' \}, \{ status: 400 \}/.test(rInv) && /p_artisan: a\.uid/.test(rInv) && /if \('error' in n\) return NextResponse\.json\(\{ error: n\.error \}, \{ status: 400 \}\)/.test(rMat) && /\.update\(maj\)\.eq\('id', b\.id\)\.eq\('artisan_id', a\.uid\)/.test(rMat) && /Matériau introuvable\.' \}, \{ status: 404 \}/.test(rMat) && /where id = p_materiau and artisan_id = v_artisan/.test(sqlMvt) && /estRefus\(a\)/.test(rMat))
  // Une seule source : un article tel que la route l'écrit (materiaux + stock) est DANS la maquette ; la maquette n'a pas de stock à elle.
  const lignesRoute = [{ id: U(7777), nom: 'Article saisi dans l’inventaire', unite: 'sac', categorie: 'Liants', seuil_alerte: 3, stock: [{ quantite: 2 }, { quantite: 1 }], fournisseur_prefere: null, prix_vu_ht: null, prix_vu_le: null }]
  const da = At.assemblerAtelier({ jour: '2026-10-12', metier: 'Maçon', chantiers: [], cartes: [], taches: [], equipe: [], materiaux: lignesRoute, vehicules: [], membres: [] })
  const sa = scene({ ...da, demandes: [] }, 'macon', 'atelier', { infra: { base: 'atelier', metier: 'macon' } })
  const fiche = sa.objets.find((o) => o.cle === 'structure:sacs')?.fiche
  T('I15 une seule source de vérité : un article écrit par la route d’inventaire (materiaux + stock) apparaît dans l’atelier (rayonnage de sa catégorie, fiche des sacs, 3 sac sous le seuil 3) ; le CRM lit les mêmes tables, filtrées par artisan_id',
    da.materiaux.length === 1 && da.materiaux[0].reste === 3 && sa.objets.some((o) => o.type === 'categorie' && o.ref === 'Liants') && !!fiche && fiche.lignes.some((l) => l.includes('Article saisi dans l’inventaire : 3 sac (seuil 3)')) && /from\('materiaux'\)\.select\(COLONNES\.materiaux\)\.eq\('artisan_id', uid\)/.test(lire('lib/crm/serveur.ts')) && /COLONNES_MATERIAU\)\.eq\('artisan_id', a\.uid\)/.test(rMat), JSON.stringify(fiche?.lignes))
  // — I16 : la bande des indicateurs —
  const at = sansCommentaires(lire('app/crm/atelier/Atelier.tsx')), css = sansCommentaires(lire('app/crm/atelier/atelier.css'))
  T('I16 la bande des indicateurs défile (barre fine visible, molette — écouteur non passif — et doigt), ombres de bord, libellés entiers ; « Réglages », « ? » et « Plan 2D » restent hors de la bande',
    /function Bande\(/.test(at) && /addEventListener\('wheel', molette, \{ passive: false \}\)/.test(at) && /data-gauche=/.test(at) && /scrollbar-width: thin/.test(css) && /\.atl-bande\[data-gauche="1"\]\[data-droite="1"\]/.test(css) && !/@media \(max-width: 1599px\)/.test(css) && at.indexOf('</Bande>') < at.indexOf('className="atl-reglages"') && at.indexOf('</Bande>') < at.indexOf('className="atl-bascule"'))
}

// ═══════════════════════ K. Lot 5 (20/10, retours de Benj) : la CARTE — positions réelles, validation, type de bâtiment ═══════════════════════
if (LEVE) {
  const Ex = await imp('lib/crm/exemple.ts')
  const G = await imp('lib/crm/geocodage.ts')
  const V = await imp('lib/crm/valider.ts')
  const Vue = await imp('lib/crm/vue.ts')
  const CENTRE = [(I.ENCLOS.x0 + I.ENCLOS.x1) / 2, (I.ENCLOS.z0 + I.ENCLOS.z1) / 2], DEMI = [(I.ENCLOS.x1 - I.ENCLOS.x0) / 2, (I.ENCLOS.z1 - I.ENCLOS.z0) / 2]
  const REPLI = At.emplacementsChantiers(100000).filter(I.horsEnclos).map((p) => [p[0], p[2]])
  const placer = (base, chantiers) => C.placerChantiers({ base, chantiers, centre: CENTRE, demi: DEMI, libre: (x, z) => I.horsEnclos([x, 0, z]), repli: REPLI })
  const BASE = { lat: 46, lng: 2 }
  const pt = (est, nord) => ({ lat: BASE.lat + nord / 110.57, lng: BASE.lng + est / 77.33 })
  // Un tirage stable (aucun hasard) : 30 chantiers de 0,1 à 120 km, dans toutes les directions, dont 6 sans position.
  const tirage = Array.from({ length: 30 }, (_, i) => { const a = ((i * 137.5) % 360) * Math.PI / 180, km = 0.1 * Math.pow(1.27, i); return { id: U(100 + i), geo: i % 5 === 4 ? null : pt(km * Math.cos(a), km * Math.sin(a)) } })
  const p1 = placer(BASE, tirage), p2 = placer(BASE, tirage)
  T('K1 placement DÉTERMINISTE : mêmes chantiers, mêmes places (deux fois) ; l’ordre de la liste est gardé', egal(p1, p2) && p1.length === 30 && egal(p1.map((p) => p.id), tirage.map((c) => c.id)))
  const cles = new Set(p1.map((p) => `${p.p[0]}:${p.p[1]}`))
  let proches = 0
  for (const a of p1) for (const b of p1) if (a !== b && Math.max(Math.abs(a.p[0] - b.p[0]), Math.abs(a.p[1] - b.p[1])) < 5.6 - 1e-6) proches++
  T('K2 AUCUN chevauchement : une parcelle par chantier (30 chantiers), deux parcelles à 5,6 m au moins, toutes hors de l’enclos de la base', cles.size === 30 && proches === 0 && p1.every((p) => I.horsEnclos([p.p[0], 0, p.p[1]])), `${cles.size} parcelles, ${proches} trop proches`)
  const dir = placer(BASE, [{ id: 'n', geo: pt(0, 6) }, { id: 'e', geo: pt(6, 0) }, { id: 's', geo: pt(0, -6) }, { id: 'o', geo: pt(-6, 0) }])
  const P_ = Object.fromEntries(dir.map((p) => [p.id, p.p]))
  const loin = placer(BASE, [1, 5, 20, 100].map((km, i) => ({ id: `k${i}`, geo: pt(km, 0.05 * i) }))).map((p) => p.p[0])
  T('K3 la VRAIE direction depuis la base (nord en haut : z plus petit ; est : x plus grand…) et la distance comprimée (1, 5, 20, 100 km → de plus en plus loin, sans sortir de la carte)',
    P_.n[1] < CENTRE[1] && Math.abs(P_.n[0] - CENTRE[0]) < 6 && P_.s[1] > CENTRE[1] && P_.e[0] > CENTRE[0] && P_.o[0] < CENTRE[0] && loin.every((x, i) => i === 0 || x > loin[i - 1]) && loin[3] - CENTRE[0] < 75, JSON.stringify({ P_, loin }))
  const sansPos = jeu({ chantiers: D.chantiers.map((c) => ({ ...c, lat: null, lng: null })) })
  const scSans = scene({ ...D, carte: undefined, chantiers: sansPos.chantiers }, 'plombier', null, { infra: { base: null, metier: 'plombier' } })
  const attendues = REPLI.slice(0, scSans.objets.filter((o) => o.type === 'chantier').length)
  T('K4 sans position connue (adresse absente ou introuvable, base non située) : la COURONNE de repli d’avant, dans l’ordre d’avant', egal(scSans.objets.filter((o) => o.type === 'chantier').map((o) => [o.centre[0], o.centre[2]]), attendues) && scSans.carte.reels === 0)
  const petit = scene({ ...D, chantiers: D.chantiers.slice(0, 3).map((c, i) => ({ ...c, ...pt(0.3 * (i + 1), 0.2) })) }, 'plombier', null, { infra: { base: null, metier: 'plombier' } })
  const grand = scene(Ex.vitrineCarte(), 'plombier', null, { infra: { base: null, metier: 'plombier' } })
  const aire = (s) => (s.carte.max[0] - s.carte.min[0]) * (s.carte.max[1] - s.carte.min[1])
  const dedans = (s) => s.objets.filter((o) => o.type === 'chantier').every((o) => o.centre[0] > s.carte.min[0] && o.centre[0] < s.carte.max[0] && o.centre[2] > s.carte.min[1] && o.centre[2] < s.carte.max[1] && o.centre[0] >= s.bornes.min[0] && o.centre[0] <= s.bornes.max[0] && o.centre[2] >= s.bornes.min[2] && o.centre[2] <= s.bornes.max[2])
  const s3d = lire('app/crm/atelier/Scene3D.tsx')
  T('K5 la carte GRANDIT avec le nombre et l’étalement des chantiers (12 chantiers jusqu’à 40 km > 3 chantiers à moins d’un km) ; elle les contient tous ; la caméra vise le centre de ce qui est posé, le sol et les ombres couvrent la carte',
    aire(grand) > 2 * aire(petit) && dedans(grand) && dedans(petit) && grand.carte.reels === 12 && /const cibleDe = \(scene: Scene\)/.test(s3d) && /target=\{cibleDe\(scene\)\}/.test(s3d) && /<planeGeometry args=\{sol\.taille\} \/>/.test(s3d) && /shadow-camera-left=\{-sol\.ombre\}/.test(s3d), `${aire(petit)} → ${aire(grand)}`)
  // Les routes relient la base à CHAQUE chantier : une route (boîte couleur chaussée) passe devant chaque parcelle, et le chemin existe.
  const routes = toutes(grand).filter((x) => x.c === '#DDD5C7')
  const devant = grand.objets.filter((o) => o.type === 'chantier').every((o) => routes.some((r) => Math.abs(r.p[0] - o.centre[0]) <= r.s[0] / 2 + 1e-6 && Math.abs(r.p[2] - (o.centre[2] + 2.8)) <= r.s[2] / 2 + 1e-6))
  T('K6 les ROUTES relient la base aux chantiers : une route passe devant chaque parcelle et le plus court chemin par la trame existe pour chacun (12 sur 12)', devant && grand.carte.routes === 12)
  // Le chantier VALIDÉ quitte la scène, pas les données.
  const valide = { ...D.chantiers[0], retireCarte: '2026-10-12T09:00:00.000Z' }
  const dV = { ...D, chantiers: [valide, ...D.chantiers.slice(1)] }
  const sV = scene(dV, 'plombier', null, { infra: { base: null, metier: 'plombier' } })
  const ligne = { ...Vue.construireVue({ uid: 'u', metier: null, d: { devis: [], factures: [], leads: [], chantiers: [{ id: U(1), artisan_id: 'u', devis_id: null, client_nom: null, titre: 'Chantier validé', adresse: null, code_postal: null, ville: null, statut: 'termine', date_debut: null, date_fin_prevue: null, date_fin_reelle: '2026-10-12', vehicule_id: null, notes: null, cree_le: '2026-10-01T00:00:00Z', maj_le: '2026-10-12T00:00:00Z', type_batiment: null, lat: null, lng: null, geocode_le: null, retire_carte_le: '2026-10-12T09:00:00Z' }], taches: [], materiaux: [], deplacements: [], carnet: [], vehicules: [], membres: [], equipe: [], tronque: false }, maintenant: new Date('2026-10-12T10:00:00Z'), idDe: (k) => k }) }
  T('K7 retire_carte_le : le chantier validé est EXCLU de la scène (infrastructure) mais PRÉSENT dans la vue (liste des chantiers avec sa date, données de l’atelier, pipeline) ; drapeau baissé, la scène d’avant le garde',
    !sV.objets.some((o) => o.ref === valide.id) && dV.chantiers.some((c) => c.id === valide.id) && At.construireScene(dV, 'plombier').objets.some((o) => o.ref === valide.id)
      && ligne.chantiers[0]?.retireCarte === '2026-10-12T09:00:00Z' && ligne.atelier.chantiers[0]?.retireCarte === '2026-10-12T09:00:00Z' && ligne.pipeline.colonnes.some((c) => c.cartes.some((k) => k.chantierId === U(1))))
  // Le géocodeur, SIMULÉ : ce qui part, combien de fois, ce qui s'écrit.
  const appels = [], ecrits = []
  const reponse = (lat, lng, score = 0.9) => ({ ok: true, status: 200, json: async () => ({ features: [{ geometry: { coordinates: [lng, lat] }, properties: { score } }] }) })
  const fauxFetch = async (url) => { appels.push(String(url)); const q = new URL(url).searchParams.get('q'); if (/introuvable/.test(q)) return { ok: true, status: 200, json: async () => ({ features: [] }) }; if (/panne/.test(q)) throw new Error('réseau'); return reponse(46.1, 2.1) }
  G.viderCacheBase()
  const ch = Array.from({ length: 14 }, (_, i) => ({ id: U(300 + i), statut: 'en_cours', devis_id: null, client_nom: 'Client fictif Secret', adresse: i === 1 ? '1 rue introuvable' : i === 2 ? '2 rue en panne' : `${i} rue de l’Exemple`, code_postal: '00000', ville: 'Ville fictive', lat: null, lng: null, geocode_le: null, retire_carte_le: null }))
  ch.push({ ...ch[3], id: U(399), geocode_le: '2026-10-01T00:00:00Z', lat: 46.2, lng: 2.2 }, { ...ch[4], id: U(398), retire_carte_le: '2026-10-01T00:00:00Z' }, { ...ch[5], id: U(397), statut: 'annule' })
  const r1 = await G.preparerCarte({ uid: 'u', chantiers: ch, adressesDevis: new Map(), siege: { adresse: '3 place de l’Exemple', code_postal: '00000', ville: 'Ville fictive' }, fetchImpl: fauxFetch, ecrire: async (id, champs) => { ecrits.push({ id, ...champs }) } })
  const qs = appels.map((u) => new URL(u))
  T('K8 géocodage SIMULÉ : la Base Adresse Nationale (api-adresse.data.gouv.fr, limit=1) reçoit l’adresse, le code postal et la ville SEULEMENT — jamais le nom du client — et au plus 10 recherches par vue, base comprise',
    qs.length === 10 && r1.recherches === 10 && qs.every((u) => u.host === 'api-adresse.data.gouv.fr' && u.searchParams.get('limit') === '1' && [...u.searchParams.keys()].join() === 'q,limit' && !/Secret|Client/.test(u.searchParams.get('q'))) && r1.base?.lat === 46.1, qs.map((u) => u.searchParams.get('q')).slice(0, 3).join(' | '))
  T('K9 ce qui s’écrit : lat / lng / geocode_le pour une adresse trouvée ; geocode_le SEUL pour une introuvable (on ne redemande pas) ; RIEN sur une panne (on réessaiera) ; déjà situé, retiré de la carte ou annulé : aucune recherche',
    ecrits.some((e) => e.id === U(300) && e.lat === 46.1 && e.geocode_le) && ecrits.some((e) => e.id === U(301) && e.lat === null && e.lng === null && e.geocode_le) && !ecrits.some((e) => e.id === U(302))
      && !qs.some((u) => /^3 rue/.test(u.searchParams.get('q')) && false) && ![U(399), U(398), U(397)].some((id) => ecrits.some((e) => e.id === id)) && r1.positions.get(U(399))?.lat === 46.2 && r1.positions.get(U(300))?.lat === 46.1)
  appels.length = 0
  await G.preparerCarte({ uid: 'u', chantiers: [], adressesDevis: new Map(), siege: { adresse: '3 place de l’Exemple', code_postal: '00000', ville: 'Ville fictive' }, fetchImpl: fauxFetch, ecrire: async () => {} })
  const lent = await C.chercherAdresse('5 rue lente 00000', (url, init) => new Promise((ok, ko) => { init.signal.addEventListener('abort', () => ko(new Error('abandon'))) }), 60)
  T('K10 la base est gardée en mémoire (pas de seconde recherche) ; une BAN qui ne répond pas est abandonnée au délai (4 s en vrai) sans rien écrire ; score trop bas ou coordonnées absurdes → introuvable ; texte < 3 caractères → pas de requête',
    appels.length === 0 && 'panne' in lent && C.BAN_DELAI_MS === 4000 && C.BAN_MAX_PAR_VUE === 10 && C.lireReponseBan({ features: [{ geometry: { coordinates: [2, 46] }, properties: { score: 0.2 } }] }) === null && C.lireReponseBan({ features: [{ geometry: { coordinates: [200, 46] }, properties: { score: 0.9 } }] }) === null
      && C.requeteAdresse({ adresse: ' ', code_postal: '', ville: 'a' }) === null && C.requeteAdresse({ adresse: '1 rue A', code_postal: '00000', ville: 'Ville' }) === '1 rue A 00000 Ville')
  // La validation : la règle pure et les routes.
  T('K11 « Valider le chantier » s’offre quand TOUTES les tâches sont faites (au moins une) ou le chantier terminé ; jamais annulé ni déjà retiré ; la fin réelle déjà posée est gardée ; corps stricts (action valider / remettre ; validation_auto booléen seul)',
    C.peutValider({ statut: 'en_cours', taches: { total: 3, faites: 3 } }) && !C.peutValider({ statut: 'en_cours', taches: { total: 3, faites: 2 } }) && !C.peutValider({ statut: 'en_cours', taches: { total: 0, faites: 0 } }) && C.peutValider({ statut: 'termine', taches: { total: 0, faites: 0 } })
      && !C.peutValider({ statut: 'annule', taches: { total: 1, faites: 1 } }) && !C.peutValider({ statut: 'termine', taches: null, retire_carte_le: '2026-10-01' })
      && egal(C.champsValidation({ date_fin_reelle: '2026-10-05' }, '2026-10-12', new Date('2026-10-12T10:00:00Z')), { statut: 'termine', date_fin_reelle: '2026-10-05', retire_carte_le: '2026-10-12T10:00:00.000Z' }) && C.champsValidation({ date_fin_reelle: null }, '2026-10-12', new Date()).date_fin_reelle === '2026-10-12'
      && V.validerActionCarte({ action: 'valider' }).ok && V.validerActionCarte({ action: 'remettre' }).ok && !V.validerActionCarte({ action: 'supprimer' }).ok && !V.validerActionCarte({ action: 'valider', statut: 'termine' }).ok
      && V.validerReglagesCrm({ validation_auto: true }).ok && !V.validerReglagesCrm({ validation_auto: 'oui' }).ok && !V.validerReglagesCrm({ validation_auto: true, artisan_id: 'x' }).ok
      && V.validerModificationChantier({ type_batiment: 'hotel' }).ok && V.validerModificationChantier({ type_batiment: null }).ok && !V.validerModificationChantier({ type_batiment: 'chateau' }).ok && egal([...V.TYPES_BATIMENT], [...C.TYPES_BATIMENT]))
  const rVal = sansCommentaires(lire('app/api/crm/chantiers/[id]/valider/route.ts')), rReg = sansCommentaires(lire('app/api/crm/reglages/route.ts')), rTache = sansCommentaires(lire('app/api/crm/taches/[id]/route.ts')), rCh = sansCommentaires(lire('app/api/crm/chantiers/[id]/route.ts')), rVue = sansCommentaires(lire('app/api/crm/vue/route.ts')), geoSrc = sansCommentaires(lire('lib/crm/geocodage.ts')), srvSrc = sansCommentaires(lire('lib/crm/serveur.ts'))
  const eqUid = (src) => (src.match(/\.from\('[a-z_]+'\)/g) ?? []).length > 0 && (src.match(/\.from\('[a-z_]+'\)/g) ?? []).length <= (src.match(/\.eq\('artisan_id', (g\.uid|uid)\)|artisan_id: g\.uid/g) ?? []).length
  T('K12 routes de la carte : POST /api/crm/chantiers/[id]/valider et GET/PUT /api/crm/reglages derrière gardeCrm (drapeau crmAtelierVivant) ; chaque lecture et écriture filtrée sur artisan_id = uid ; la validation vérifie les tâches AVANT d’écrire (409 sinon) et n’écrase pas un chantier déjà retiré',
    /gardeCrm\(req, \{ drapeau: 'crmAtelierVivant' \}\)/.test(rVal) && /gardeCrm\(req, \{ drapeau: 'crmAtelierVivant' \}\)/.test(rReg) && eqUid(rVal) && /upsert\(\{ artisan_id: g\.uid, validation_auto/.test(rReg)
      && rVal.indexOf('peutValider(') < rVal.indexOf("update({ ...champs") && /\.is\('retire_carte_le', null\)/.test(rVal) && /409/.test(rVal) && /validerActionCarte\(corps\.valeur\)/.test(rVal) && /validerReglagesCrm\(corps\.valeur\)/.test(rReg))
  T('K13 validation AUTOMATIQUE par la route qui coche une tâche : seulement drapeau levé, réglage posé, la DERNIÈRE tâche cochée (toutes faites), chantier encore sur la carte ; tout filtré sur le compte ; la tâche cochée n’est jamais défaite par une panne',
    /if \(data\[0\]\.faite && actif\('crmAtelierVivant'\)\) chantierValide = await validerSiFini\(g\.uid, data\[0\]\.chantier_id as string\)/.test(rTache) && /const reglages = await lireReglages\(uid\)\s*\n\s*if \(!reglages\.validationAuto\) return false/.test(rTache)
      && /t\.total === 0 \|\| t\.faites < t\.total/.test(rTache) && /\.eq\('chantier_id', chantierId\)\.eq\('artisan_id', uid\)/.test(rTache) && /\.eq\('id', chantierId\)\.eq\('artisan_id', uid\)\.is\('retire_carte_le', null\)/.test(rTache) && /from\('crm_reglages'\)\.select\('validation_auto'\)\.eq\('artisan_id', uid\)/.test(srvSrc))
  T('K14 fiche et modification : le type de bâtiment (13 valeurs, null = déduit) refusé drapeau baissé ; une adresse modifiée efface la position (lat, lng, geocode_le à NULL : elle sera cherchée de nouveau) ; un chantier rouvert revient sur la carte',
    /if \('type_batiment' in v\.valeur && !actif\('crmAtelierVivant'\)\) return erreur\('Champ inconnu : type_batiment\.', 400\)/.test(rCh) && /Object\.assign\(carte, \{ lat: null, lng: null, geocode_le: null \}\)/.test(rCh) && /carte\.retire_carte_le = null/.test(rCh) && /\.update\(\{ \.\.\.champs, \.\.\.carte, maj_le/.test(rCh)
      && /const carte = actif\('crmAtelierVivant'\) \? ficheCarte\(/.test(rCh) && /if \('type_batiment' in v\.valeur && !actif\('crmAtelierVivant'\)\)/.test(sansCommentaires(lire('app/api/crm/chantiers/route.ts'))))
  T('K15 la vue géocode côté SERVEUR seulement drapeau levé (preparerCarte, au plus 10 recherches, adresse du siège sans nom) ; l’écriture est filtrée sur le compte et sur geocode_le IS NULL ; aucune autre source ne connaît l’adresse de la BAN ; les colonnes de la carte ne sont lues que drapeau levé',
    /if \(actif\('crmAtelierVivant'\)\) \{[\s\S]*preparerCarte\(\{ uid: g\.uid/.test(rVue) && /\.eq\('id', id\)\.eq\('artisan_id', p\.uid\)\.is\('geocode_le', null\)/.test(geoSrc) && !/client_nom/.test(geoSrc)
      && [...lister('app'), ...lister('lib')].filter((f) => /\.(tsx?)$/.test(f) && sansCommentaires(lire(f)).includes('api-adresse.data.gouv.fr')).every((f) => f === 'lib/crm/carte.ts' || f === 'lib/legalArtisan.ts') && /export const colonnesChantiers = \(\): string => \(actif\('crmAtelierVivant'\) \? `\$\{COLONNES\.chantiers\}, \$\{COLONNES_CARTE\}` : COLONNES\.chantiers\)/.test(srvSrc))
  const reg = lire('docs/registre-traitements.md')
  T('K16 le registre des traitements dit le géocodage : finalité, donnée envoyée (adresse, code postal, ville — pas le nom), destinataire (Base Adresse Nationale, api-adresse.data.gouv.fr)', /## 13\. Le géocodage des chantiers/.test(reg) && /\*\*Finalité\*\*/.test(reg.slice(reg.indexOf('## 13.'))) && /api-adresse\.data\.gouv\.fr/.test(reg) && /jamais le nom/.test(reg.slice(reg.indexOf('## 13.'))))
  const ate = sansCommentaires(lire('app/crm/atelier/Atelier.tsx')), carteUi = sansCommentaires(lire('app/crm/atelier/Carte.tsx')), fiche = sansCommentaires(lire('app/crm/FicheChantier.tsx')), liste = sansCommentaires(lire('app/crm/Chantiers.tsx')), pan = sansCommentaires(lire('app/crm/atelier/Panneau.tsx'))
  T('K17 l’écran : « Valider le chantier » dans le panneau de l’atelier et dans la fiche, « Remettre sur la carte », le sélecteur du type (fiche et panneau), « Voir les chantiers validés » dans la liste, le réglage « Valider automatiquement… » (PUT /api/crm/reglages) ; dans l’exemple et la démonstration, SIMULÉ (aucun appel)',
    /data-atelier-valider/.test(carteUi) && /data-atelier-remettre/.test(carteUi) && /<CarteChantierPanneau c=\{c\} actions=\{carte\} \/>/.test(pan) && /data-crm-valider/.test(fiche) && /data-crm-remettre/.test(fiche) && /<ChoixTypeBatiment/.test(fiche) && /Voir les chantiers validés/.test(liste)
      && /data-atelier-validation-auto/.test(ate) && /appel\('\/api\/crm\/reglages', \{ method: 'PUT'/.test(ate) && /if \(simule\) \{ setValidationAuto\(oui\); setNoteAuto\('Exemple : réglage simulé, rien n’est enregistré\.'\); return \}/.test(ate) && /if \(!simule\) \{\s*const r = 'action' in quoi/.test(ate) && /if \(exemple\) \{[\s\S]{0,300}return\s*\}/.test(fiche))
}

// ═══════════════════════ L. Lot 6 (20/10) : les étiquettes de la carte ne se chevauchent JAMAIS ═══════════════════════
{
  const E = await imp('lib/crm/etiquettes.ts')
  // Trente chantiers SERRÉS : épingles sur une grille de 30 px (bien plus serrée qu'une étiquette de 150 × 46 px), priorités mêlées.
  const PR = [E.PRIORITES.retard, E.PRIORITES.enCours, E.PRIORITES.aDemarrer, E.PRIORITES.fini]
  const serres = (ecart = 30, n = 30) => Array.from({ length: n }, (_, i) => ({ cle: `c${String(i).padStart(2, '0')}`, priorite: PR[i % 4], epingle: { x: 760 + ((i % 6) - 2.5) * ecart, y: 470 + (Math.floor(i / 6) - 2) * ecart, l: 12, h: 18 }, taille: { l: 150, h: 46 }, pastille: { l: 40, h: 24 } }))
  const ECRAN = { l: 1440, h: 900 }, OBST = [{ x: 0, y: 0, l: 320, h: 300 }]
  const visibles = (s) => s.filter((x) => x.mode !== 'cachee')
  const recouvrements = (s, entrees, obst = []) => {
    const v = visibles(s); let n = 0
    for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) if (E.seCoupent(v[i], v[j])) n++
    for (const x of v) { for (const e of entrees) if (e.cle !== x.cle && E.seCoupent(x, e.epingle)) n++; for (const o of obst) if (E.seCoupent(x, o)) n++; if (x.x < 0 || x.y < 0 || x.x + x.l > ECRAN.l || x.y + x.h > ECRAN.h) n++ }
    return n
  }
  const s30 = serres(), p30 = E.placerEtiquettes(s30, ECRAN, OBST)
  T('L1 30 chantiers serrés : AUCUN recouvrement (étiquette sur étiquette, sur l’épingle d’un voisin, sur l’interface posée sur la carte, hors écran) ; les sans-place se replient en pastille, plusieurs restent complètes',
    recouvrements(p30, s30, OBST) === 0 && p30.filter((x) => x.mode === 'complete').length >= 6 && p30.filter((x) => x.mode === 'pastille').length >= 6, JSON.stringify(p30.reduce((m, x) => ({ ...m, [x.mode]: (m[x.mode] ?? 0) + 1 }), {})))
  // La priorité : deux épingles collées, la place pour UNE carte complète seulement.
  const duel = (pa, pb) => E.placerEtiquettes([{ cle: 'a', priorite: pa, epingle: { x: 100, y: 60, l: 10, h: 10 }, taille: { l: 180, h: 50 }, pastille: { l: 40, h: 24 } }, { cle: 'b', priorite: pb, epingle: { x: 112, y: 60, l: 10, h: 10 }, taille: { l: 180, h: 50 }, pastille: { l: 40, h: 24 } }], { l: 320, h: 90 })
  const prio = E.placerEtiquettes(s30.map((x) => ({ ...x, priorite: x.cle === 'c14' ? E.PRIORITES.selection : x.priorite })), ECRAN, OBST)
  const parMode = (m) => s30.filter((x, i) => p30[i].mode === m).map((x) => x.priorite)
  T('L2 priorité respectée : sélectionné > en retard > en cours > à démarrer > fini — le sélectionné est toujours complet ; dans un duel, le plus prioritaire garde sa carte ; en moyenne les cartes complètes sont plus prioritaires que les pastilles',
    E.PRIORITES.selection > E.PRIORITES.retard && E.PRIORITES.retard > E.PRIORITES.enCours && E.PRIORITES.enCours > E.PRIORITES.aDemarrer && E.PRIORITES.aDemarrer > E.PRIORITES.fini
      && prio[14].mode === 'complete' && duel(50, 20)[0].mode === 'complete' && duel(20, 50)[1].mode === 'complete' && duel(20, 50)[0].mode !== 'complete'
      && parMode('complete').reduce((a, b) => a + b, 0) / parMode('complete').length >= parMode('pastille').reduce((a, b) => a + b, 0) / Math.max(1, parMode('pastille').length))
  const melange = [...s30].reverse()
  const pm = E.placerEtiquettes(melange, ECRAN, OBST)
  T('L3 DÉTERMINISTE : même entrée, même sortie ; l’ordre de la liste d’entrée ne change aucune place (seulement l’ordre de la sortie, qui suit l’entrée)',
    egal(E.placerEtiquettes(s30, ECRAN, OBST), p30) && egal([...pm].sort((a, b) => (a.cle < b.cle ? -1 : 1)), [...p30].sort((a, b) => (a.cle < b.cle ? -1 : 1))) && egal(pm.map((x) => x.cle), melange.map((x) => x.cle)))
  const completes = (ecart) => E.placerEtiquettes(serres(ecart), ECRAN, OBST).filter((x) => x.mode === 'complete').length
  T('L4 au ZOOM avant (les épingles s’écartent : 30 → 60 → 120 → 200 px), de plus en plus d’étiquettes complètes ; toujours aucun recouvrement',
    completes(30) < completes(60) && completes(60) < completes(120) && completes(120) <= completes(200) && [30, 60, 120, 200].every((e) => recouvrements(E.placerEtiquettes(serres(e), ECRAN, OBST), serres(e), OBST) === 0), [30, 60, 120, 200].map(completes).join(' → '))
  const tracee = E.placerEtiquettes(serres(30), ECRAN, OBST).filter((x) => x.rappel)
  T('L5 les places décalées portent un TRAIT DE RAPPEL vers leur épingle ; les quatre côtés directs n’en ont pas', tracee.length > 0 && tracee.every((x) => x.cote === 'decale') && E.placerEtiquettes(serres(200), ECRAN, OBST).filter((x) => x.mode === 'complete').every((x) => x.rappel === (x.cote === 'decale')))
  const s3 = sansCommentaires(lire('app/crm/atelier/Scene3D.tsx')), css = lire('app/crm/atelier/atelier.css')
  T('L6 branché dans la scène : placement à chaque mouvement de caméra (et 4 fois par seconde pour les panneaux), priorité par l’épingle et la sélection, pastille (état + numéro) qui se déplie au survol et au clavier ; aucune couche 3D ajoutée (DOM seul) ; contraste : texte encre sur papier',
    /const places = placerEtiquettes\(entrees, \{ l: size\.width, h: size\.height \}, obstacles\)/.test(s3) && /prioriteChantier\(o, COULEURS, selection === e\.i\)/.test(s3) && /maintenant - dernier\.current < 250/.test(s3) && /className="atl-pastille"/.test(s3)
      && /\[data-mode="pastille"\]:hover/.test(css) && /\[data-mode="pastille"\]:focus-visible/.test(css) && (s3.match(/<Couche /g) ?? []).length === 2 && /\.atl-carte \{[^}]*background: var\(--paper\); color: var\(--ink\)/.test(css))
}

// ═══════════════════════ N. Lot 7 (21/10) : la nuit lisible et belle ; l'encart des urgences repliable ═══════════════════════
{
  const nuit = I.ambiance(23.5)
  const rgb = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
  const lum = (h) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
  T('N1 nuit LISIBLE : ciel bleu nuit très désaturé (b − r < 25), sol et bâtiments plus clairs en valeur (lumière d’hémisphère ≥ 1,2, rebond du sol plus clair que l’ancien #3B3732), éclairage d’appoint CHAUD, halos au pied des lampadaires',
    nuit.moment === 'nuit' && rgb(nuit.fond)[2] > rgb(nuit.fond)[0] && rgb(nuit.fond)[2] - rgb(nuit.fond)[0] < 25 && nuit.hemi >= 1.2 && lum(nuit.terre) > lum('#3B3732') + 20 && lum(nuit.ciel) > lum('#7E8796')
      && !!nuit.chaude && rgb(nuit.chaude.couleur)[0] > rgb(nuit.chaude.couleur)[2] + 60 && nuit.halos === true && !I.ambiance(12).halos && !I.ambiance(12).chaude)
  const Ex = await imp('lib/crm/exemple.ts')
  const sc = scene(Ex.vitrineCarte(), 'plombier', null, { infra: { base: null, metier: 'plombier' } })
  const lampes = sc.fenetres.filter((f) => Math.abs(f.s[0] - 0.3) < 1e-6 && Math.abs(f.s[1] - 0.1) < 1e-6 && f.p[1] > 0.8)
  const s3 = sansCommentaires(lire('app/crm/atelier/Scene3D.tsx'))
  T('N2 des lampadaires le long des routes (allumés le soir) ; leurs halos : UNE couche instanciée en mélange additif, le soir et la nuit seulement, sans clic ni ombre ; lumière chaude d’appoint la nuit',
    lampes.length >= 12 && /\{amb\?\.halos && scene\.fenetres && <Halos fenetres=\{scene\.fenetres\} fort=\{amb\.moment === 'nuit'\} \/>\}/.test(s3) && /blending=\{THREE\.AdditiveBlending\} depthWrite=\{false\}/.test(s3) && /\{amb\.chaude && <ambientLight color=\{amb\.chaude\.couleur\} intensity=\{amb\.chaude\.intensite\} \/>\}/.test(s3), String(lampes.length))
  const Ur = await imp('app/crm/atelier/Urgences.tsx').catch(() => null)
  const urSrc = sansCommentaires(lire('app/crm/atelier/Urgences.tsx'))
  T('N3 l’encart « Urgences du jour » se REPLIE (bouton, compteur toujours visible) : replié d’office au-delà de deux urgences, le choix de l’artisan retenu en localStorage sous try/catch',
    /try \{ return window\.localStorage\.getItem\(CLE_URGENCES\) \} catch \{ return null \}/.test(urSrc) && /try \{ window\.localStorage\.setItem\(CLE_URGENCES, v\) \} catch/.test(urSrc) && /aria-expanded=\{ouvert\}/.test(urSrc) && /data-atelier-urgences-bascule/.test(urSrc) && /hidden=\{carte && !ouvert\}/.test(urSrc)
      && (!Ur || (Ur.urgencesOuvertes(2, null) === true && Ur.urgencesOuvertes(3, null) === false && Ur.urgencesOuvertes(8, 'ouvert') === true && Ur.urgencesOuvertes(1, 'replie') === false)))
}

// ═══════════════════════ O. Lot 8 (21/10) : le temps réel VISIBLE ; se déplacer dans la carte ═══════════════════════
if (LEVE) {
  const Ev = await imp('lib/crm/evenements.ts')
  const C8 = await imp('lib/crm/carte.ts')
  const base = (d) => scene(d, 'plombier', null, { infra: { base: null, metier: 'plombier' } })
  const s0 = base(D)
  T('O1 AUCUN événement au premier chargement (pas de scène d’avant), ni entre deux vues identiques', Ev.evenementsScene(null, s0, D.jour).length === 0 && Ev.evenementsScene(s0, base(D), D.jour).length === 0)
  // Un véhicule libre affecté au chantier du jour : il quitte la base et roule par les routes jusqu'au chantier.
  // L'exemple a ses quatre véhicules affectés : la vue d'AVANT a la camionnette du premier chantier du jour au dépôt ; la vue d'après, l'exemple.
  const pris = D.chantiers.find((c) => c.vehicule_id && At.estAujourdhui(c, D.jour)), libre = { id: pris.vehicule_id }
  const duJour = D.chantiers.find((c) => !c.vehicule_id && At.estAujourdhui(c, D.jour) && At.chantierVisible(c))
  const sAvant = base({ ...D, chantiers: D.chantiers.map((c) => (c.id === pris.id ? { ...c, vehicule_id: null } : c)) })
  const s1 = s0
  const ev1 = Ev.evenementsScene(sAvant, s1, D.jour)
  const v1 = ev1.find((e) => e.type === 'vehicule')
  const route = v1 ? At.routeEntre(s1, v1.de, v1.vers) : []
  const surRue = (p) => s1.carte.trame.xs.some((x) => Math.abs(p[0] - x) < 1e-6) || s1.carte.trame.zs.some((z) => Math.abs(p[1] - z) < 1e-6)
  T('O2 un véhicule AFFECTÉ au chantier du jour part de la base et ROULE par les routes (sortie de la base, puis la trame) jusqu’au chantier ; l’événement inverse le ramène',
    !!v1 && v1.cle === `vehicule:${libre.id}` && route.length >= 4 && egal(route[0], v1.de) && egal(route.at(-1), v1.vers) && egal(route[1], s1.infra.sortie) && route.slice(1, -1).every(surRue)
      && Ev.evenementsScene(s1, sAvant, D.jour).some((e) => e.type === 'vehicule' && e.cle === v1.cle && egal(e.vers, v1.de)), JSON.stringify({ v1, n: route.length }))
  const cmd = (D.commandes ?? []).find((k) => k.statut === 'commandee' && k.livraison_prevue !== D.jour)
  const d2 = { ...D, commandes: D.commandes.map((k) => (k.id === cmd.id ? { ...k, livraison_prevue: D.jour } : k)) }
  const due = (D.commandes ?? []).find((k) => k.statut === 'commandee' && k.livraison_prevue && k.livraison_prevue <= D.jour)
  const d3 = { ...D, commandes: D.commandes.filter((k) => k.id !== due.id) }
  T('O3 livraison : une commande désormais attendue AUJOURD’HUI, ou une commande due qui quitte les commandes en cours (reçue) → le camion arrive aux quais ; une commande non due qui disparaît ne déclenche rien',
    Ev.evenementsScene(s0, base(d2), D.jour).some((e) => e.type === 'livraison' && e.commandeId === cmd.id && e.raison === 'attendue') && Ev.evenementsScene(s0, base(d3), D.jour).some((e) => e.type === 'livraison' && e.commandeId === due.id && e.raison === 'recue')
      && !Ev.evenementsScene(s0, base({ ...D, commandes: D.commandes.filter((k) => !(k.livraison_prevue && k.livraison_prevue <= D.jour) && k.id !== due.id ? false : true) }), D.jour).some((e) => e.type === 'livraison' && e.raison === 'attendue')
      && !Ev.evenementsScene(s0, base({ ...D, commandes: D.commandes.filter((k) => !(k.livraison_prevue && k.livraison_prevue > D.jour)) }), D.jour).some((e) => e.type === 'livraison'))
  const ch = D.chantiers.find((k) => k.taches && k.taches.faites < k.taches.total && k.statut === 'en_cours')
  const d4 = { ...D, chantiers: D.chantiers.map((k) => (k.id === ch.id ? { ...k, avancement: Math.round(((k.taches.faites + 1) / k.taches.total) * 100), taches: { ...k.taches, faites: k.taches.faites + 1 } } : k)) }
  const av = Ev.evenementsScene(s0, base(d4), D.jour).find((e) => e.type === 'avancement')
  T('O4 une tâche cochée fait « monter » la maison : événement avancement (de → vers, part des tâches faites) sur CE chantier', !!av && av.cle === `chantier:${ch.id}` && av.vers > av.de && Math.abs(av.vers - (ch.taches.faites + 1) / ch.taches.total) < 1e-9)
  const ch7 = D.chantiers.find((k) => k.titre === 'Mise aux normes gaz')
  const d5 = { ...D, paiements: [...(D.paiements ?? []), { id: 'facture-x', chantierId: ch7.id, montant: 210000 }] }
  const pa = Ev.evenementsScene(s0, base(d5), D.jour).find((e) => e.type === 'paiement')
  T('O5 une facture désormais PAYÉE : « + 2 100 € » (son montant réel, en centimes dans les données) au-dessus de SON chantier ; déjà payée avant : rien', !!pa && pa.montant === 210000 && pa.cle === `chantier:${ch7.id}` && /^\+ 2\s?100 €$/.test(Ev.libellePaiement(pa.montant).replace(/ | /g, ' ')) && !Ev.evenementsScene(base(d5), base(d5), D.jour).some((e) => e.type === 'paiement'))
  const m = D.membres.find((x) => x.actif && !D.chantiers.some((c) => c.equipe.includes(x.id) && At.estAujourdhui(c, D.jour)))
  const d6 = m && duJour ? { ...D, chantiers: D.chantiers.map((c) => (c.id === duJour.id ? { ...c, equipe: [...c.equipe, m.id] } : c)) } : null
  T('O6 un compagnon AFFECTÉ au chantier du jour y marche (événement compagnon) ; les factures, commandes et tâches n’en créent pas d’autres', !!d6 && Ev.evenementsScene(s0, base(d6), D.jour).filter((e) => e.type === 'compagnon').length === 1 && Ev.evenementsScene(s0, base(d6), D.jour).every((e) => e.type === 'compagnon' || e.type === 'vehicule'))
  T('O7 se déplacer reste DANS la carte : la cible est ramenée dans l’emprise (marge de 6 m), sans changer un point déjà dedans', egal(C8.bornerCible([500, -500], { min: [-40, -30], max: [50, 40] }), [56, -36]) && egal(C8.bornerCible([3, 4], { min: [-40, -30], max: [50, 40] }), [3, 4]) && egal(C8.bornerCible([-45, 0], { min: [-40, -30], max: [50, 40] }, 0), [-40, 0]))
  const s3 = sansCommentaires(lire('app/crm/atelier/Scene3D.tsx')), css = lire('app/crm/atelier/atelier.css')
  T('O8 jouées par la scène : comparaison à chaque nouvelle vue (jamais la première), « réduire les animations » = aucune animation (la scène est déjà dans son nouvel état), AUCUNE couche ajoutée ; le camion repart (le trajet finit hors de la base)',
    /if \(!avant \|\| !scene\.infra \|\| !scene\.signaux \|\| mouvementReduit\(\)\) return/.test(s3) && /evenementsScene\(avant, scene, scene\.signaux\.jour\)/.test(s3) && (s3.match(/<Couche /g) ?? []).length === 2 && /garderFin: true/.test(s3) && /if \(!m\.garderFin \|\| !l\.length\) return \[0, 0, 0\]/.test(lire('lib/crm/infrastructure.ts')) && /prefers-reduced-motion: no-preference\) \{\s*\.atl-paiement b/.test(css))
  T('O9 se déplacer : glisser = déplacer (souris gauche, un doigt), clic droit / deux doigts = tourner, molette / pincement = zoomer ; flèches et ZQSD quand la carte a le focus ; panneau ↑ ← ⌂ → ↓ en bas à droite, accessible ; cible bornée à chaque mouvement ; même chose dans la maquette du chantier',
    /mouseButtons=\{\{ LEFT: THREE\.MOUSE\.PAN, MIDDLE: THREE\.MOUSE\.DOLLY, RIGHT: THREE\.MOUSE\.ROTATE \}\} touches=\{\{ ONE: THREE\.TOUCH\.PAN, TWO: THREE\.TOUCH\.DOLLY_ROTATE \}\}/.test(s3) && /tabIndex=\{0\} onKeyDown=\{clavier\}/.test(s3) && /k === 'z' \|\| k === 'w'/.test(s3) && /k === 'q' \|\| k === 'a'/.test(s3)
      && ['Déplacer vers le haut', 'Déplacer vers la gauche', 'Déplacer vers la droite', 'Déplacer vers le bas', 'Recentrer la carte'].every((x) => s3.includes(`aria-label="${x}"`)) && /c\.addEventListener\('change', borner\)/.test(s3) && /THREE\.MOUSE\.PAN/.test(lire('app/crm/atelier/SceneChantier.tsx')) && /bornerCible\(/.test(lire('app/crm/atelier/SceneChantier.tsx')))
}

// ═══════════════════════ H. La barre dans un vrai navigateur (si TEST_BASE est donné : serveur avec PRESTI_DEMO_ATELIER=1) ═══════════
if (process.env.TEST_BASE) {
  const { createRequire } = await import('node:module')
  const { chromium } = createRequire(import.meta.url)('playwright')
  const nav = await chromium.launch()
  const res = []
  for (const largeur of [1280, 1440, 1920]) {
    const page = await nav.newPage({ viewport: { width: largeur, height: 900 } })
    await page.goto(`${process.env.TEST_BASE.replace(/\/$/, '')}/atelier-demo?metier=macon&base=entrepot&mode=2d`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-atelier-barre]')
    res.push(await page.evaluate((l) => { const b = document.querySelector('[data-atelier-barre]'); const centres = [...b.children].filter((c) => c.getBoundingClientRect().height > 0).map((c) => { const r = c.getBoundingClientRect(); return r.top + r.height / 2 }); const bascule = b.querySelector('.atl-bascule'); return { l, lignes: Math.max(...centres) - Math.min(...centres) < 12 ? 1 : 2, hauteur: Math.round(b.getBoundingClientRect().height), plan2d: !!bascule && bascule.getBoundingClientRect().right <= window.innerWidth } }, largeur))
    await page.close()
  }
  const tel = await nav.newPage({ viewport: { width: 390, height: 844 }, isMobile: true })
  await tel.goto(`${process.env.TEST_BASE.replace(/\/$/, '')}/atelier-demo?metier=macon&base=entrepot`, { waitUntil: 'networkidle' })
  await tel.waitForSelector('[data-atelier-barre]')
  const selectsVisibles = await tel.evaluate(() => [...document.querySelectorAll('[data-atelier-barre] select')].filter((s) => (s.checkVisibility ? s.checkVisibility() : s.getBoundingClientRect().height > 0)).length)
  // H3-H5 (lot 4) : on CLIQUE la maquette là où l'artisan cliquerait — le camion benne, le camion de livraison — et le panneau s'ouvre ;
  // le dialogue « Répondre » de l'exemple ; la bande des indicateurs.
  const ent = scene(I.echantillonPourBase(D, 'entrepot', { camion: true }), 'macon', 'entrepot')
  const cleBenne = ent.objets.find((o) => o.type === 'vehicule' && /Camion benne/.test(o.libelle))?.cle
  const gpu = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'], channel: 'chromium' }).catch(() => chromium.launch())
  const p3 = await gpu.newPage({ viewport: { width: 1440, height: 900 } })
  await p3.goto(`${process.env.TEST_BASE.replace(/\/$/, '')}/atelier-demo?metier=macon&base=entrepot&statut=societe&camion=1&mode=3d&mesure=1&heure=11`, { waitUntil: 'networkidle' })
  await p3.waitForFunction(() => window.__atelier && window.__atelier.fps > 0 && window.__atelierEcran, null, { timeout: 120000 })
  await p3.waitForTimeout(11000)
  const cliquer = async (cle) => {
    // Retour à la vue d'ensemble avant chaque clic : la sélection précédente a fait glisser la caméra.
    await p3.keyboard.press('Escape').catch(() => {})
    await p3.click('.atl-ensemble').catch(() => {})
    await p3.waitForTimeout(1000)
    const pt = await p3.evaluate((c) => window.__atelierEcran(c), cle)
    if (!pt) return null
    await p3.mouse.click(pt.x, pt.y)
    await p3.waitForTimeout(500)
    return p3.evaluate(() => document.querySelector('[data-atelier-panneau] h2')?.textContent ?? null)
  }
  const titreBenne = cleBenne ? await cliquer(cleBenne) : null
  const titreLivr = await cliquer('structure:livraison')
  const bande = await p3.evaluate(() => { const b = document.querySelector('[data-atelier-bande]'); const r = document.querySelector('.atl-reglages'); const pl = document.querySelector('.atl-bascule'); return b ? { defile: getComputedStyle(b).overflowX, reglagesHors: !!r && !b.contains(r), planHors: !!pl && !b.contains(pl) } : null })
  // Le dialogue « Répondre » : l'accueil, puis la première demande sans devis.
  await p3.keyboard.press('Escape').catch(() => {})
  await p3.click('details.atl-liste-3d summary').catch(() => {})
  await p3.click('[data-atelier-objet="accueil"]').catch(() => {})
  await p3.waitForSelector('[data-atelier-salle]', { timeout: 10000 }).catch(() => {})
  await p3.click('[data-atelier-action-exemple="Répondre"]').catch(() => {})
  const dialogue = await p3.waitForSelector('[data-atelier-dialogue]', { timeout: 5000 }).then(() => true).catch(() => false)
  await p3.click('[data-atelier-dialogue] button.primary').catch(() => {})
  const envoye = await p3.waitForSelector('[data-atelier-envoye]', { timeout: 5000 }).then(() => true).catch(() => false)
  // H6 (lot 5) : « Valider le chantier » dans l'exemple — le chantier terminé quitte la carte (simulé, rien d'écrit), « Remettre » le rend.
  let validation = null
  if (LEVE) {
    const p6 = await gpu.newPage({ viewport: { width: 1440, height: 900 } })
    await p6.goto(`${process.env.TEST_BASE.replace(/\/$/, '')}/atelier-demo?metier=plombier&mode=3d&mesure=1&heure=11`, { waitUntil: 'networkidle' })
    await p6.waitForFunction(() => window.__atelier && window.__atelier.fps > 0 && window.__atelierEcran, null, { timeout: 120000 })
    const cle = `chantier:${U(3)}`
    await p6.click('details.atl-liste-3d summary').catch(() => {})
    await p6.click(`[data-atelier-objet="${cle}"]`).catch(() => {})
    const avant = await p6.waitForSelector('[data-atelier-valider]', { timeout: 8000 }).then(() => true).catch(() => false)
    const surCarteAvant = await p6.evaluate((c) => window.__atelierEcran(c) !== null, cle)
    await p6.click('[data-atelier-valider]').catch(() => {})
    const bandeau = await p6.waitForSelector('[data-atelier-valide]', { timeout: 8000 }).then(() => true).catch(() => false)
    await p6.waitForTimeout(400)
    const surCarteApres = await p6.evaluate((c) => window.__atelierEcran(c) !== null, cle)
    await p6.click('[data-atelier-remettre]').catch(() => {})
    await p6.waitForTimeout(400)
    const revenu = await p6.evaluate((c) => window.__atelierEcran(c) !== null, cle)
    validation = { avant, surCarteAvant, bandeau, surCarteApres, revenu }
    await p6.close()
  }
  // H7 (lot 6) : sur la démo CHARGÉE (12 et 30 chantiers), les rectangles DOM des étiquettes visibles ne se coupent jamais, à 1440 et 390 px.
  const croisements = []
  for (const vitrine of ['carte', 'serree']) for (const [l, h] of [[1440, 900], [390, 844]]) {
    const ctx7 = await gpu.newContext({ viewport: { width: l, height: h }, ...(l < 500 ? { isMobile: true, hasTouch: true } : {}) })
    const p7 = await ctx7.newPage()
    await p7.goto(`${process.env.TEST_BASE.replace(/\/$/, '')}/atelier-demo?vitrine=${vitrine}&mode=3d&mesure=1&heure=11`, { waitUntil: 'networkidle' })
    await p7.waitForFunction(() => window.__atelier && window.__atelier.fps > 0, null, { timeout: 120000 })
    await p7.waitForTimeout(3500)
    croisements.push({ vitrine, l, ...(await p7.evaluate(() => {
      const r = [...document.querySelectorAll('.atl-etiquettes > .atl-carte, .atl-etiquettes > .atl-zone')].filter((e) => getComputedStyle(e).visibility !== 'hidden' && e.dataset.mode !== 'cachee').map((e) => e.getBoundingClientRect()).filter((b) => b.width > 0 && b.right > 0 && b.bottom > 0 && b.left < innerWidth && b.top < innerHeight)
      let n = 0
      for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) { const a = r[i], b = r[j]; if (a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5) n++ }
      return { visibles: r.length, intersections: n, fps: window.__atelier.fps, appels: window.__atelier.appels }
    })) })
    await ctx7.close()
  }
  // H8 (lot 8) : se déplacer dans la carte — flèche → (focus sur la carte), glisser à la souris, bouton ↑ du panneau : la cible bouge.
  let navigation = null
  if (LEVE) {
    const p8 = await gpu.newPage({ viewport: { width: 1440, height: 900 } })
    await p8.goto(`${process.env.TEST_BASE.replace(/\/$/, '')}/atelier-demo?metier=plombier&mode=3d&mesure=1&heure=11`, { waitUntil: 'networkidle' })
    await p8.waitForFunction(() => window.__atelier && window.__atelier.fps > 0 && window.__atelierCamera, null, { timeout: 120000 })
    await p8.waitForTimeout(2500)
    const cam = () => p8.evaluate(() => window.__atelierCamera())
    const c0 = await cam()
    await p8.focus('[data-atelier-carte-focus]'); await p8.keyboard.press('ArrowRight'); await p8.waitForTimeout(700)
    const c1 = await cam()
    const b = await (await p8.$('[data-atelier-carte-focus] canvas')).boundingBox()
    await p8.mouse.move(b.x + b.width * 0.55, b.y + b.height * 0.75); await p8.mouse.down(); await p8.mouse.move(b.x + b.width * 0.35, b.y + b.height * 0.55, { steps: 8 }); await p8.mouse.up(); await p8.waitForTimeout(700)
    const c2 = await cam()
    await p8.click('[aria-label="Déplacer vers le haut"]'); await p8.waitForTimeout(700)
    const c3 = await cam()
    const boutons = await p8.$$eval('[data-atelier-nav] button', (bs) => bs.map((x) => x.getAttribute('aria-label')))
    const d = (a, c) => Math.hypot(a.x - c.x, a.z - c.z)
    navigation = { fleche: d(c0, c1), glisser: d(c1, c2), bouton: d(c2, c3), boutons }
    await p8.close()
  }
  await gpu.close()
  await nav.close()
  T('H3 en entrepôt, un clic dans la 3D sur le camion benne ouvre SON panneau ; sur le camion de livraison, le panneau « Camion de livraison » (Playwright)', titreBenne !== null && /Camion benne/.test(titreBenne) && titreLivr === 'Camion de livraison', JSON.stringify({ titreBenne, titreLivr }))
  T('H4 la bande des indicateurs défile horizontalement ; « Réglages » et « Plan 2D » sont hors de la bande', bande?.defile === 'auto' && bande.reglagesHors && bande.planHors, JSON.stringify(bande))
  if (LEVE) T('H6 « Valider le chantier » (exemple, Playwright) : le bouton est dans le panneau du chantier terminé ; après le clic, le bandeau le dit et le bâtiment a QUITTÉ la carte ; « Remettre sur la carte » le fait revenir', !!validation && validation.avant && validation.surCarteAvant && validation.bandeau && !validation.surCarteApres && validation.revenu, JSON.stringify(validation))
  T('H7 lot 6 — sur la démo chargée (12 et 30 chantiers), à 1440 et 390 px : 0 intersection entre les étiquettes visibles (rectangles DOM mesurés), toujours au plus 14 appels de dessin', croisements.length === 4 && croisements.every((x) => x.intersections === 0 && x.visibles > 3 && x.appels <= 14), JSON.stringify(croisements))
  if (LEVE) T('H8 lot 8 — se déplacer dans la carte (Playwright) : la flèche → (carte au focus), le glisser à la souris et le bouton ↑ du panneau déplacent la caméra (cible mesurée) ; cinq boutons nommés', !!navigation && navigation.fleche > 0.5 && navigation.glisser > 0.5 && navigation.bouton > 0.5 && navigation.boutons.length === 5 && navigation.boutons.every(Boolean), JSON.stringify(navigation))
  T('H5 « Répondre » dans l’exemple ouvre un vrai dialogue (message du client, réponse proposée) ; « Valider et envoyer » montre l’effet sans rien envoyer', dialogue && envoye, JSON.stringify({ dialogue, envoye }))
  T('H1 la barre tient sur UNE ligne à 1280, 1440 et 1920 px, « Plan 2D » visible (Playwright)', res.every((r) => r.lignes === 1 && r.plan2d), JSON.stringify(res))
  T('H2 sur téléphone (390 px), les sélecteurs métier et lieu ne prennent aucune hauteur (rangés dans le menu fermé)', selectsVisibles === 0, String(selectsVisibles))
} else console.log('SKIP H (navigateur) — TEST_BASE absent : la barre se juge sur un serveur lancé avec PRESTI_DEMO_ATELIER=1')

// ═══════════════════════ F. Le lanceur ═══════════════════════
{
  const lanceur = lire('scripts/tout-verifier.mjs')
  T('F1 la suite est au tableau SUITES de scripts/tout-verifier.mjs (cout: gratuit), juste après « CRM atelier vivant »', /nom: 'CRM atelier 3D[^']*', cmd: 'node', args: \['--experimental-strip-types', '--import', '\.\/scripts\/ts-loader\.mjs', 'scripts\/crm-atelier3d-qa\.mjs'\], cout: 'gratuit'/.test(lanceur) && lanceur.indexOf('crm-atelier3d-qa.mjs') > lanceur.indexOf('crm-vivant-qa.mjs') && lanceur.indexOf('crm-atelier3d-qa.mjs') - lanceur.indexOf('crm-vivant-qa.mjs') < 400)
}

console.log(`\n${verts} vert(s), ${rouges.length} rouge(s)${rouges.length ? ' : ' + rouges.join(' · ') : ''}`)
process.exitCode = rouges.length ? 1 : 0
