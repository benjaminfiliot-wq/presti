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
const sha = (x) => crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex')
const sansCommentaires = (s) => s.replace(/^\s*\/\/.*$/gm, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')

const { FLAGS } = await imp('lib/flags.ts')
const LEVE = FLAGS.crmAtelierVivant === true
console.log(`Drapeau crmAtelierVivant : ${LEVE ? 'LEVÉ' : 'baissé'}`)
const I = await imp('lib/crm/infrastructure.ts')
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
    for (const a of I.accessoiresBase(p, pl)) if (!dans(pl.interieur, a.p[0], a.p[2]) && !dans(pl.exterieur, a.p[0], a.p[2])) hors.push(`${p}/${b}:${a.k}@${a.p.map((v) => v.toFixed(1))}`)
  }
  T('B4 tout le matériel reste dans ses zones (dedans : établi et machines ; dehors : structures) — rien sur les bureaux, les rayonnages ou les places', hors.length === 0, hors.slice(0, 5).join(' | '))
  // — les chantiers —
  T('B5 les chantiers typiques changent avec le métier (immeubles et commerces pour l’électricien et le peintre, granges pour le couvreur, extensions pour le maçon, maisons en coupe pour le plombier et le carreleur) ; type stable par chantier',
    new Set(At.PREREGLAGES.map((p) => JSON.stringify(I.TYPES_CHANTIER[p]))).size >= 7 && I.TYPES_CHANTIER.electricien.includes('immeuble') && I.TYPES_CHANTIER.peintre.includes('commerce') && I.TYPES_CHANTIER.couvreur.includes('grange') && I.TYPES_CHANTIER.macon.includes('extension') && I.TYPES_CHANTIER.plombier.includes('coupe') && I.TYPES_CHANTIER.carreleur.includes('coupe') && I.typeChantier('macon', 0.37) === I.typeChantier('macon', 0.37))
  const maison = (metier, pct, o = {}) => {
    const box = [], fen = []
    const add = (f, p, s, c, oo = -1, r = [0, 0, 0]) => { box.push({ f, p, s, c, r }); return box.length - 1 }
    const addF = (p, s, jour, nuit) => { fen.push({ p, s, c: jour, nuit }) }
    const sommet = I.maisonChantier(add, addF, { x: 0, z: 0, w: 2.6, dd: 2.6, ht: 2.2, h: 0.37, id: 'chantier-fictif', pct, termine: pct >= 1, enCours: pct > 0 && pct < 1, o: 0, ...o }, metier)
    return { box, fen, sommet }
  }
  T('B6 chaque métier a SON chantier (à 40 %, neuf dessins différents) ; chacun change avec l’avancement (0 %, 40 %, 80 %, terminé : quatre dessins)', new Set(At.PREREGLAGES.map((p) => JSON.stringify(maison(p, 0.4)))).size === At.PREREGLAGES.length && At.PREREGLAGES.every((p) => new Set([0, 0.4, 0.8, 1].map((v) => JSON.stringify(maison(p, v)))).size === 4))
  const hautMurs = (pct) => Math.max(0, ...maison('macon', pct).box.filter((x) => x.c === I.P.parpaing && x.s[1] > 0.2).map((x) => x.p[1] + x.s[1] / 2))
  T('B7 maçon (extension) : les murs de parpaings montent avec l’avancement (20 % < 50 % < 90 %) ; terminée, l’extension est enduite (plus de parpaing nu)', hautMurs(0.2) < hautMurs(0.5) && hautMurs(0.5) < hautMurs(0.9) && hautMurs(1) === 0, [0.2, 0.5, 0.9, 1].map(hautMurs).join())
  const couvert = (pct) => maison('couvreur', pct).box.filter((x) => Math.abs(Math.abs(x.r[0]) - Math.PI / 4) < 1e-9 && x.s[1] === 0.08 && x.c !== I.P.bois).reduce((s, x) => s + x.s[0], 0)
  const chevrons = (pct) => maison('couvreur', pct).box.filter((x) => x.c === I.P.bois && Math.abs(Math.abs(x.r[0]) - Math.PI / 4) < 1e-9).length
  T('B8 couvreur : le toit se couvre avec l’avancement (tuiles croissantes, chevrons à nu décroissants) ; échafaudage tant que ce n’est pas fini', couvert(0.2) < couvert(0.6) && couvert(0.6) < couvert(1) && chevrons(0.2) > chevrons(0.6) && chevrons(1) === 0 && maison('couvreur', 0.5).box.some((x) => x.f === 'cyl' && x.c === I.P.ambre) && !maison('couvreur', 1).box.some((x) => x.f === 'cyl' && x.c === I.P.ambre))
  T('B9 menuisier : les fenêtres posées (vitres) augmentent avec l’avancement ; les baies non posées restent sombres', maison('menuisier', 0.2).fen.length < maison('menuisier', 0.6).fen.length && maison('menuisier', 0.6).fen.length < maison('menuisier', 1).fen.length && maison('menuisier', 0.2).box.filter((x) => x.c === I.P.ardoise).length > maison('menuisier', 1).box.filter((x) => x.c === I.P.ardoise).length)
  const carreaux = (pct) => maison('carreleur', pct).box.filter((x) => x.s[0] === 0.44 && x.s[1] === 0.03).length
  T('B10 carreleur (maison en coupe) : le sol se carrelle (0, 10, 24 carreaux à 0 %, 40 %, terminé)', carreaux(0) === 0 && carreaux(0.4) === 10 && carreaux(1) === 24, [0, 0.4, 1].map(carreaux).join())
  const allumees = (pct) => maison('electricien', pct).fen.filter((f) => f.nuit === I.P.lumiere).length
  T('B11 électricien (immeuble) : le soir, les pièces raccordées s’allument au fil du chantier (plus à 80 % qu’à 20 %)', allumees(0.2) < allumees(0.8), `${allumees(0.2)} / ${allumees(0.8)}`)
  const peint = (pct) => Math.max(0, ...maison('peintre', pct).box.filter((x) => I.PEINTURES.includes(x.c) && x.s[1] > 0.1).map((x) => x.s[1]))
  T('B12 peintre : la peinture neuve monte sur la façade avec l’avancement', peint(0.2) < peint(0.7))
  const plomb = (pct) => maison('plombier', pct).box.filter((x) => x.c === I.P.blanc && x.s[0] >= 0.36).length
  T('B13 plombier (maison en coupe) : les appareils de la salle d’eau se posent au fil du chantier ; l’immeuble monte plus haut qu’une maison', plomb(0.2) < plomb(0.8) && maison('electricien', 0.5).sommet > maison('menuisier', 0.5).sommet)
  T('B14 l’avancement dessiné est la donnée elle-même (60 % → 0,6), 1 si terminé ou à facturer, 0 sans donnée',
    I.avancementDessine({ statut: 'en_cours', etape: null, avancement: 60 }) === 0.6 && I.avancementDessine({ statut: 'termine', etape: null, avancement: 40 }) === 1 && I.avancementDessine({ statut: 'en_cours', etape: 'a_facturer', avancement: 10 }) === 1 && I.avancementDessine({ statut: 'planifie', etape: null, avancement: null }) === 0)
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
  const vue = (s) => s.objets.map((o) => [o.cle, o.type, o.libelle, o.detail, o.badges, o.epingle, o.etat, o.info]).sort((a, b) => a[0].localeCompare(b[0]))
  T('C3 avec l’infrastructure : les MÊMES objets cliquables (clés, détails, badges, états, cartes), seule la géométrie change', egal(vue(sans), vue(avec)) && egal(sans.horsScene, avec.horsScene))
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
    at.includes("const infra = actif('crmAtelierVivant')") && at.includes(': construireScene(donnees, prereglage, total !== null ? { vivant: { assistants: total } } : undefined)), [donnees, prereglage, total, infra, base])') && /\{infra && scene\.infra && \(/.test(at) && at.includes('heure={infra ? heure ?? null : null}'))
  T('E8 la forme juridique n’est LUE (jamais écrite) que drapeau levé : colonnes de la fiche conditionnelles, champ absent sinon',
    srv.includes("const COLONNES_FICHE = (): string => (actif('crmAtelierVivant') ? 'plan, metier, forme_juridique' : 'plan, metier')") && srv.includes("...(actif('crmAtelierVivant') ? { formeJuridique: fiche?.forme_juridique ?? null } : {})") && /select\(COLONNES_FICHE\(\)\)/.test(srv))
  T('E9 la démonstration lit ?base= (dont camion), ?statut=, ?camion= et ?heure= drapeau levé seulement, et ramène les données fictives au cas demandé', /const infra = actif\('crmAtelierVivant'\)/.test(demo) && /const base = infra && /.test(demo) && /const statut = infra && /.test(demo) && /const camion = infra && /.test(demo) && demo.includes('echantillonPourBase(FICTIF, base ?? \'entrepot\', { statut, camion })') && demo.includes('baseInitiale={base} heure={heure}'))
  T('E10 l’écran dit d’où vient le lieu (« déduit de vos données » / « choisi par vous ») dans le menu de l’atelier et dans le plan 2D',
    at.includes("scene.infra.auto ? 'déduit de vos données' : 'choisi par vous'") && plan.includes("scene.infra.auto ? ' · déduit de vos données' : ' · choisi par vous'") && at.includes('LIBELLES_LIEU[b]'))
  T('E11 libellés : bases « Base légère / Atelier / Entrepôt / Camion-atelier », lieux « de chez moi / atelier / entrepôt / pas de local » ; aucun « Presti » dans les textes ajoutés',
    egal(I.LIBELLES_BASE, { legere: 'Base légère', atelier: 'Atelier', entrepot: 'Entrepôt', camion: 'Camion-atelier' }) && I.LIBELLES_LIEU.camion === 'Pas de local (tout dans le camion)' && I.LIBELLES_LIEU.legere === 'Je travaille de chez moi' && ![infra, demo].some((s) => /presti/i.test(s)))
  const css = sansCommentaires(lire('app/crm/atelier/atelier.css'))
  T('E12 CSS ajouté : jetons seulement (aucune couleur écrite en dur)', /\.atl-plan-base \{[^}]*var\(--accent-tint\)/.test(css) && !/\.atl-(plan-base|plan-profil|origine) \{[^}]*(#[0-9a-f]{3,8}\b|rgb\()/i.test(css))
}

// ═══════════════════════ F. Le lanceur ═══════════════════════
{
  const lanceur = lire('scripts/tout-verifier.mjs')
  T('F1 la suite est au tableau SUITES de scripts/tout-verifier.mjs (cout: gratuit), juste après « CRM atelier vivant »', /nom: 'CRM atelier 3D[^']*', cmd: 'node', args: \['--experimental-strip-types', '--import', '\.\/scripts\/ts-loader\.mjs', 'scripts\/crm-atelier3d-qa\.mjs'\], cout: 'gratuit'/.test(lanceur) && lanceur.indexOf('crm-atelier3d-qa.mjs') > lanceur.indexOf('crm-vivant-qa.mjs') && lanceur.indexOf('crm-atelier3d-qa.mjs') - lanceur.indexOf('crm-vivant-qa.mjs') < 400)
}

console.log(`\n${verts} vert(s), ${rouges.length} rouge(s)${rouges.length ? ' : ' + rouges.join(' · ') : ''}`)
process.exitCode = rouges.length ? 1 : 0
