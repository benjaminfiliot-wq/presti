// Juge hors ligne du tableau : données fictives, isolation, invariants et mutants.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { calculerTableau } from './calculer.ts'
import { chargerTableau } from './charger.ts'

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const lire = async (p) => fs.readFile(path.join(racine, p), 'utf8')
const fichiers = {
  page: await lire('app/tableau-de-bord/page.tsx'),
  vue: await lire('app/tableau-de-bord/Vue.tsx'),
  calcul: await lire('lib/tableau/calculer.ts'),
  charge: await lire('lib/tableau/charger.ts'),
  css: await lire('app/tableau-de-bord/tableau.module.css'),
}

function jugerSource(f) {
  assert.match(f.page, /if\s*\(!actif\('tableauComplet'\)\)\s*notFound\(\)/, 'drapeau baissé : 404 serveur')
  assert.doesNotMatch(f.page + f.vue + f.charge, /service_role|supabaseAdmin/, 'clé de service interdite')
  assert.match(f.charge, /\.in\(colonne, valeurs\)/, 'chaque lecture porte un filtre')
  assert.match(f.charge, /table === 'artisans' \? 'id' : 'artisan_id'/, 'filtre artisan_id des tables parentes')
  assert.match(f.calcul, /\.filter\(\(l\) => l\.artisan_id === artisanId\)/, 'isolation du calcul, même pour un fondateur')
  assert.match(f.calcul, /source: '[^']+'/, 'source par bloc')
  assert.equal((f.calcul.match(/source: '/g) ?? []).length, 13, 'huit blocs et cinq listes sourcés')
  assert.match(f.vue, /title=\{`Source : \$\{source\}\. \$\{horodatage\(luLe\)\}`\}/, 'source et date au survol')
  assert.match(f.vue, /tabIndex=\{0\}.*title=\{`Source :/, 'source accessible au clavier')
  assert.match(f.vue, /<svg[^>]+role="img"[^>]+aria-label="Encaissements par mois sur douze mois"/, 'graphique SVG accessible')
  assert.match(f.vue, /<title>\{moisFr\(m\.cle\)\}/, 'valeur de chaque mois au survol')
  assert.match(f.vue, /vue\.listes\.slice\(0, 3\).*vue\.listes\.slice\(3\)/s, 'cinq listes rendues')
  assert.match(f.calcul, /stockBas\.slice\(0, 5\)/, 'liste du stock bornée')
  assert.equal((f.calcul.match(/vide: '/g) ?? []).length, 13, 'huit blocs et cinq listes avec état vide')
  assert.match(f.vue, /bloc\.vide/, 'états vides rendus')
  assert.match(f.calcul, /total \+ centimes\(f\.total_ttc/, 'sommes en centimes entiers')
  assert.doesNotMatch(f.calcul, /reduce\(\(total, f\) => total \+ Number\(f\.total_ttc\)/, 'euros flottants interdits')
  assert.match(f.vue, /30_000/, 'relecture toutes les 30 secondes')
  assert.match(f.css, /linear-gradient\(135deg,#D97757 0%,#E8946F 100%\)/, 'carte maîtresse en dégradé corail')
  assert.match(f.css, /translateY\(-5px\)/, 'léger soulèvement au survol')
  assert.match(f.vue, /aria-label="Sections du tableau de bord"/, 'navigation en pastilles')
  assert.match(f.vue, /aria-label="Accès rapides"/, 'barre d’icônes fine à gauche')
  assert.match(f.css, /max-width:720px/, 'adaptation mobile')
  assert.match(f.css, /prefers-reduced-motion:reduce/, 'mouvement réduit')
}

jugerSource(fichiers)
const mutants = [
  ['service_role', { ...fichiers, charge: fichiers.charge + "\nconst cle = 'service_role'" }],
  ['sans_source', { ...fichiers, calcul: fichiers.calcul.replace("source: 'leads, messages, crm_rappels, assistant_actions'", "origine: 'inconnue'") }],
  ['euros_flottants', { ...fichiers, calcul: fichiers.calcul.replace('total + centimes(f.total_ttc', 'total + Number(f.total_ttc') }],
  ['sans_etat_vide', { ...fichiers, calcul: fichiers.calcul.replace("vide: 'Aucune action à traiter aujourd’hui.'", "aucun: '—'") }],
  ['drapeau_baisse_visible', { ...fichiers, page: fichiers.page.replace("if (!actif('tableauComplet')) notFound()", "if (actif('tableauComplet')) notFound()") }],
  ['autre_artisan', { ...fichiers, charge: fichiers.charge.replace("table === 'artisans' ? 'id' : 'artisan_id'", "table === 'artisans' ? 'id' : 'id'") }],
  ['sans_graphique', { ...fichiers, vue: fichiers.vue.replace('<svg className={styles.graphique}', '<div className={styles.graphique}') }],
  ['sans_listes', { ...fichiers, vue: fichiers.vue.replace('vue.listes.slice(3)', '[].slice(3)') }],
]
for (const [nom, mutant] of mutants) {
  assert.throws(() => jugerSource(mutant), undefined, `mutant ${nom} non vu`)
  process.stdout.write(`MUTANT VU : ${nom}\n`)
}

// Le faux client simule PostgREST, vérifie les filtres et la pagination sans réseau.
const autre = 'Exemple-autre'
const mien = 'Exemple-artisan'
const donnees = {
  artisans: [{ id: mien, credits: 4 }, { id: autre, credits: 999 }],
  leads: [{ id: 'l1', artisan_id: mien, statut: 'nouveau', created_at: '2026-11-03T08:00:00Z' }, { id: 'l2', artisan_id: autre, statut: 'nouveau' }],
  messages: [{ id: 'm1', lead_id: 'l1', sens: 'in', sent_at: '2026-11-03T09:00:00Z' }, { id: 'm2', lead_id: 'l2', sens: 'in', sent_at: '2026-11-03T09:00:00Z' }],
  devis: [{ id: 'd1', artisan_id: mien, statut: 'accepte', total_ttc: '120.30', created_at: '2026-11-01T10:00:00Z' }, { id: 'd2', artisan_id: autre, statut: 'accepte', total_ttc: '9000.00', created_at: '2026-11-01T10:00:00Z' }],
  factures: [{ id: 'f1', artisan_id: mien, statut: 'payee', total_ttc: '120.30', date_emission: '2026-11-02', payee_le: '2026-11-03', client_nom: 'Exemple client' }, { id: 'f2', artisan_id: mien, statut: 'emise', total_ttc: '21.07', date_emission: '2026-11-01', date_echeance: '2026-11-02' }, { id: 'f3', artisan_id: autre, statut: 'payee', total_ttc: '9000.00', payee_le: '2026-11-03' }],
  clients: [{ id: 'c1', artisan_id: mien, nom: 'Exemple client', created_at: '2026-11-01' }],
  chantiers: [{ id: 'ch1', artisan_id: mien, titre: 'Exemple chantier', statut: 'en_cours', date_fin_prevue: '2026-11-02' }],
  materiaux: [{ id: 'mat1', artisan_id: mien, nom: 'Exemple matériau', seuil_alerte: 5 }],
  stock: [{ id: 's1', materiau_id: 'mat1', quantite: 3 }],
  prix_artisan: [{ id: 'p1', artisan_id: mien, designation: 'Exemple prix', actif: true, maj_le: '2026-11-03' }],
  crm_rappels: [{ id: 'r1', artisan_id: mien, type: 'rendez_vous', echeance: '2026-11-03', fait_le: null }],
  relances: [],
  assistant_actions: [{ id: 'a1', artisan_id: mien, statut: 'en_attente', mode: 'confirmation', cree_le: '2026-11-03' }],
}
const creerFauxClient = (source) => ({ from(table) { let colonne, valeurs, debut, fin; return {
  select() { return this },
  in(c, v) { colonne = c; valeurs = v; return this },
  range(d, f) { debut = d; fin = f; const data = (source[table] ?? []).filter((l) => valeurs.includes(l[colonne])).slice(debut, fin + 1); return Promise.resolve({ data, error: null }) },
} } })

const chargees = await chargerTableau(creerFauxClient(donnees), mien)
const vue = calculerTableau(chargees, mien, new Date('2026-11-03T12:00:00Z'))
assert.equal(vue.blocs.length, 8)
assert.equal(vue.blocs[1].indicateurs[0].valeur?.replace(/\s/g, ''), '120,30€')
assert.equal(vue.blocs[1].indicateurs[2].valeur?.replace(/\s/g, ''), '21,07€')
assert.equal(vue.blocs[0].indicateurs[1].valeur, '1')
assert.equal(vue.blocs[5].indicateurs[0].valeur, '1')
assert.equal(vue.mois.length, 12, 'douze mois calculés')
assert.equal(vue.mois.at(-1).encaisses, 12030, 'barre du mois en centimes')
assert.equal(vue.listes.length, 5, 'cinq listes utiles')
assert.equal(vue.listes.find((l) => l.id === 'factures-retard').lignes[0].complement.includes('1 j de retard'), true)
assert.equal(vue.listes.find((l) => l.id === 'stock-bas').lignes[0].libelle, 'Exemple matériau')
assert.equal(vue.listes.find((l) => l.id === 'rendez-vous').lignes[0].href, '/crm')
assert.ok(vue.listes.every((l) => l.lignes.length <= 5), 'chaque liste est bornée à cinq')
assert.equal(vue.evolutionEncaisse, null, 'aucune évolution sans mois précédent renseigné')
// 03/11, réponse 3 à la question de Codex : sans journal de consommation, « utilisés ce mois » n'existe pas ; seuls les crédits restants.
assert.ok(!vue.blocs[7].indicateurs.some((i) => /utilisés ce mois/.test(i.libelle)), 'aucun chiffre de consommation sans journal')
assert.ok(vue.blocs[7].indicateurs.some((i) => i.libelle === 'Crédits restants'), 'les crédits restants sont montrés')
const contaminees = structuredClone(chargees)
contaminees.factures.push(donnees.factures[2])
assert.deepEqual(calculerTableau(contaminees, mien, new Date('2026-11-03T12:00:00Z')).blocs[1], vue.blocs[1])

// Jeu fictif enrichi sur 12 mois (« Exemple » uniquement) pour vérifier l'évolution et les captures V14.
const donneesVitrine = {
  artisans: [{ id: mien, credits: 18 }],
  leads: [
    { id: 'l1', artisan_id: mien, statut: 'nouveau', created_at: '2026-11-03T08:00:00Z' },
    { id: 'l2', artisan_id: mien, statut: 'nouveau', created_at: '2026-11-02T14:00:00Z' },
    { id: 'l3', artisan_id: mien, statut: 'nouveau', created_at: '2026-11-01T11:00:00Z' },
    { id: 'l4', artisan_id: mien, statut: 'nouveau', created_at: '2026-10-12T09:00:00Z' },
    { id: 'l5', artisan_id: mien, statut: 'nouveau', created_at: '2026-10-19T09:00:00Z' },
  ],
  messages: [
    { id: 'm1', lead_id: 'l1', sens: 'in', sent_at: '2026-11-03T09:00:00Z' },
    { id: 'm2', lead_id: 'l2', sens: 'in', sent_at: '2026-11-02T15:00:00Z' },
  ],
  devis: [
    { id: 'd1', artisan_id: mien, statut: 'accepte', client_nom: 'Exemple Atelier Sud', total_ttc: '4850.00', created_at: '2026-11-01T10:00:00Z', envoye_le: '2026-11-01T12:00:00Z' },
    { id: 'd2', artisan_id: mien, statut: 'envoye', client_nom: 'Exemple Maison Verrière', total_ttc: '3240.00', created_at: '2026-10-27T10:00:00Z', envoye_le: '2026-10-28T09:00:00Z' },
    { id: 'd3', artisan_id: mien, statut: 'envoye', client_nom: 'Exemple Copropriété Parc', total_ttc: '1890.00', created_at: '2026-10-30T10:00:00Z', envoye_le: '2026-10-30T16:00:00Z' },
  ],
  factures: [
    { id: 'f-12', artisan_id: mien, statut: 'payee', total_ttc: '6200.00', date_emission: '2025-12-05', payee_le: '2025-12-18', client_nom: 'Exemple Atelier Sud' },
    { id: 'f-01', artisan_id: mien, statut: 'payee', total_ttc: '5400.00', date_emission: '2026-01-08', payee_le: '2026-01-22', client_nom: 'Exemple Résidence Nord' },
    { id: 'f-02', artisan_id: mien, statut: 'payee', total_ttc: '7100.00', date_emission: '2026-02-10', payee_le: '2026-02-24', client_nom: 'Exemple Atelier Sud' },
    { id: 'f-03', artisan_id: mien, statut: 'payee', total_ttc: '6800.00', date_emission: '2026-03-04', payee_le: '2026-03-19', client_nom: 'Exemple Villa Coteau' },
    { id: 'f-04', artisan_id: mien, statut: 'payee', total_ttc: '8300.00', date_emission: '2026-04-06', payee_le: '2026-04-21', client_nom: 'Exemple Résidence Nord' },
    { id: 'f-05', artisan_id: mien, statut: 'payee', total_ttc: '7900.00', date_emission: '2026-05-07', payee_le: '2026-05-25', client_nom: 'Exemple Atelier Sud' },
    { id: 'f-06', artisan_id: mien, statut: 'payee', total_ttc: '9400.00', date_emission: '2026-06-03', payee_le: '2026-06-18', client_nom: 'Exemple Villa Coteau' },
    { id: 'f-07', artisan_id: mien, statut: 'payee', total_ttc: '8600.00', date_emission: '2026-07-05', payee_le: '2026-07-20', client_nom: 'Exemple Commerce Halle' },
    { id: 'f-08', artisan_id: mien, statut: 'payee', total_ttc: '5200.00', date_emission: '2026-08-04', payee_le: '2026-08-19', client_nom: 'Exemple Commerce Halle' },
    { id: 'f-09', artisan_id: mien, statut: 'payee', total_ttc: '9800.00', date_emission: '2026-09-06', payee_le: '2026-09-22', client_nom: 'Exemple Atelier Sud' },
    { id: 'f-10', artisan_id: mien, statut: 'payee', total_ttc: '10400.00', date_emission: '2026-10-05', payee_le: '2026-10-21', client_nom: 'Exemple Résidence Nord' },
    { id: 'f-11a', artisan_id: mien, statut: 'payee', total_ttc: '7850.00', date_emission: '2026-11-01', payee_le: '2026-11-02', client_nom: 'Exemple Atelier Sud' },
    { id: 'f-11b', artisan_id: mien, statut: 'payee', total_ttc: '4990.00', date_emission: '2026-11-02', payee_le: '2026-11-03', client_nom: 'Exemple Villa Coteau' },
    { id: 'f-att1', artisan_id: mien, statut: 'emise', total_ttc: '2450.00', date_emission: '2026-11-02', date_echeance: '2026-11-20', client_nom: 'Exemple Maison Verrière' },
    { id: 'f-ret1', artisan_id: mien, statut: 'emise', total_ttc: '1680.00', date_emission: '2026-10-08', date_echeance: '2026-10-24', client_nom: 'Exemple Copropriété Parc' },
    { id: 'f-ret2', artisan_id: mien, statut: 'emise', total_ttc: '890.00', date_emission: '2026-10-15', date_echeance: '2026-10-29', client_nom: 'Exemple Commerce Halle' },
  ],
  clients: [
    { id: 'c1', artisan_id: mien, nom: 'Exemple Atelier Sud', created_at: '2026-03-10' },
    { id: 'c2', artisan_id: mien, nom: 'Exemple Résidence Nord', created_at: '2026-06-14' },
    { id: 'c3', artisan_id: mien, nom: 'Exemple Villa Coteau', created_at: '2026-11-01' },
    { id: 'c4', artisan_id: mien, nom: 'Exemple Commerce Halle', created_at: '2026-11-02' },
  ],
  chantiers: [
    { id: 'ch1', artisan_id: mien, titre: 'Exemple Rénovation Verrière', statut: 'en_cours', date_fin_prevue: '2026-11-14' },
    { id: 'ch2', artisan_id: mien, titre: 'Exemple Tableau Électrique', statut: 'en_cours', date_fin_prevue: '2026-11-01' },
    { id: 'ch3', artisan_id: mien, titre: 'Exemple Isolation Combles', statut: 'planifie', date_fin_prevue: '2026-11-25' },
  ],
  materiaux: [
    { id: 'mat1', artisan_id: mien, nom: 'Exemple Disjoncteur différentiel 40A', seuil_alerte: 6 },
    { id: 'mat2', artisan_id: mien, nom: 'Exemple Couronne câble R2V 3G2.5', seuil_alerte: 4 },
    { id: 'mat3', artisan_id: mien, nom: 'Exemple Coffret étanche 2 rangées', seuil_alerte: 3 },
  ],
  stock: [
    { id: 's1', materiau_id: 'mat1', quantite: 2 },
    { id: 's2', materiau_id: 'mat2', quantite: 1 },
    { id: 's3', materiau_id: 'mat3', quantite: 2 },
  ],
  prix_artisan: [
    { id: 'p1', artisan_id: mien, designation: 'Exemple Pose tableau complet', actif: true, maj_le: '2026-11-03' },
    { id: 'p2', artisan_id: mien, designation: 'Exemple Recherche de panne', actif: true, maj_le: '2026-10-28' },
    { id: 'p3', artisan_id: mien, designation: 'Exemple Tirage ligne dédiée', actif: true, maj_le: '2026-10-19' },
  ],
  crm_rappels: [
    { id: 'r1', artisan_id: mien, type: 'visite', echeance: '2026-11-03', heure: '14:30', fait_le: null },
    { id: 'r2', artisan_id: mien, type: 'metre', echeance: '2026-11-04', heure: '09:00', fait_le: null },
    { id: 'r3', artisan_id: mien, type: 'rendez_vous', echeance: '2026-11-05', heure: '16:00', fait_le: null },
  ],
  relances: [{ id: 'rel1', lead_id: 'l1', planifiee_le: '2026-11-03', envoyee: false }],
  assistant_actions: [
    { id: 'a1', artisan_id: mien, statut: 'en_attente', mode: 'confirmation', cree_le: '2026-11-03' },
    { id: 'a2', artisan_id: mien, statut: 'en_attente', mode: 'confirmation', cree_le: '2026-11-02' },
    { id: 'a3', artisan_id: mien, statut: 'en_attente', mode: 'confirmation', cree_le: '2026-10-18' },
  ],
}
const vueVitrine = calculerTableau(await chargerTableau(creerFauxClient(donneesVitrine), mien), mien, new Date('2026-11-03T12:00:00Z'))
assert.equal(vueVitrine.evolutionEncaisse, 23, 'évolution +23 % sur mois précédent')
process.stdout.write('DONNÉES FICTIVES : centimes, sources, vides, évolution, isolation OK\n')

// Captures du contrat visuel hors ligne : uniquement les lignes « Exemple » ci-dessus.
{
  const { chromium } = await import('playwright')
  const navigateur = await chromium.launch({ headless: true })
  const preuve = path.join(racine, '.orchestre/preuves/036-041')
  await fs.mkdir(preuve, { recursive: true })
  const esc = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  const source = (s) => `<span class="source" tabindex="0" title="Source : ${esc(s)}. lu le 3 novembre à 13 h">ⓘ<span class="info">Source : ${esc(s)}. lu le 3 novembre à 13 h</span></span>`
  const fleche = (haut) => `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${haut ? '<path d="M4 12 12 4M6 4h6v6"/>' : '<path d="m4 4 8 8M12 6v6H6"/>'}</svg>`
  const icone = (d) => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`
  const argent = vueVitrine.blocs[1], jour = vueVitrine.blocs[0]
  const cles = [
    { ...argent.indicateurs[0], source: argent.source, etat: 'maitresse', svg: '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20M16 14h2"/>', sous: `An passé : ${argent.indicateurs[1].valeur ?? '—'}` },
    { ...argent.indicateurs[2], source: argent.source, etat: 'neutre', svg: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', sous: 'Factures émises à régler' },
    { ...argent.indicateurs[3], source: argent.source, etat: 'crit', svg: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><path d="M12 9v4M12 17h.01"/>', sous: 'Échéance dépassée' },
    { ...jour.indicateurs[0], source: jour.source, etat: 'neutre', svg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>', sous: 'Prospects à traiter' },
    { ...jour.indicateurs[3], source: jour.source, etat: 'warn', svg: '<path d="m9 12 2 2 4-4"/><rect x="3" y="4" width="18" height="16" rx="3"/>', sous: 'Actions de l’assistant' },
  ]
  const bande = `<section class="bande">${cles.map((c) => {
    const evo = c.evolution ?? null
    const pied = evo !== null ? `<small class="${evo >= 0 ? 'evolutionPositive' : 'evolutionNegative'}">${fleche(evo >= 0)}${evo > 0 ? '+' : ''}${evo} % par rapport au mois précédent</small>` : `<span class="sousTexteCarte">${esc(c.sous)}</span>`
    return `<article class="chiffreCle ${c.etat}"><div class="chiffreTitre"><div class="chiffreEnteteGauche"><span>${esc(c.libelle)}</span>${source(c.source)}</div><span class="iconeCarte">${icone(c.svg)}</span></div><strong>${esc(c.valeur ?? '—')}</strong><div class="chiffrePied">${pied}</div></article>`
  }).join('')}</section>`
  const maximum = Math.max(1, ...vueVitrine.mois.map((m) => m.encaisses ?? 0))
  const moisCourt = ['déc.', 'janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.']
  const graphique = `<section class="section graphiqueSection"><header class="sectionEntete"><div><p class="kicker">TRÉSORERIE · 12 MOIS</p><h2>Encaissements mensuels</h2></div><div class="enteteDroite"><span class="pastilleResume">Ce mois : <strong>${esc(argent.indicateurs[0].valeur ?? '—')}</strong></span>${source(argent.source)}</div></header><svg class="graphique" viewBox="0 0 720 205" role="img" aria-label="Encaissements par mois sur douze mois"><line x1="0" y1="38" x2="720" y2="38" class="grilleAxe"/><line x1="0" y1="78" x2="720" y2="78" class="grilleAxe"/><line x1="0" y1="118" x2="720" y2="118" class="grilleAxe"/><line x1="0" x2="720" y1="158" y2="158" class="axe"/>${vueVitrine.mois.map((m, i) => { const h = m.encaisses === null ? 0 : Math.max(m.encaisses > 0 ? 6 : 0, m.encaisses / maximum * 124); return `<g><title>${esc(m.cle)} : ${m.encaisses === null ? 'indisponible' : esc((m.encaisses / 100).toFixed(2)) + ' €'}</title><rect class="pisteBaton" x="${i * 60 + 14}" y="34" width="32" height="124" rx="8"/><rect class="${i === 11 ? 'batonActuel' : 'baton'}" x="${i * 60 + 14}" y="${158 - h}" width="32" height="${h}" rx="8"/><text class="moisGraphique" x="${i * 60 + 30}" y="184" text-anchor="middle">${moisCourt[i]}</text></g>` }).join('')}</svg><div class="piedGraphique"><p class="annotation">Repère · encaissé l’an passé : <strong>${esc(argent.indicateurs[1].valeur ?? '—')}</strong></p></div></section>`
  const liste = (l) => `<section class="section listeSection"><header class="sectionEntete"><div class="titreAvecCompteur"><h2>${esc(l.titre)}</h2><span class="compteurListe">${l.lignes.length}</span></div>${source(l.source)}</header>${l.lignes.length ? `<ul class="lignes">${l.lignes.map((r) => `<li><a href="${esc(r.href)}"><span class="ligneLibelle">${esc(r.libelle)}</span><span class="ligneComplement ${r.etat ?? ''}">${esc(r.complement)}</span><span class="fleche">↗</span></a></li>`).join('')}</ul>` : `<p class="vide">${esc(l.vide)}</p>`}<a class="voirTout" href="${esc(l.href)}">Voir l’écran ↗</a></section>`
  const details = vueVitrine.blocs.filter((b) => b.id !== 'argent').map((b) => `<section class="section"><header class="sectionEntete"><h2>${esc(b.titre)}</h2>${source(b.source)}</header><dl class="grille">${b.indicateurs.map((i) => `<div class="indicateur"><dt>${esc(i.libelle)}</dt><dd>${esc(i.valeur ?? '—')}</dd></div>`).join('')}</dl>${b.details?.length ? `<ul class="details">${b.details.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>` : ''}${b.note ? `<p class="note">${esc(b.note)}</p>` : ''}</section>`).join('')
  const barreHaute = `<div class="barreHaute"><div class="marque"><span class="marquePastille">P</span><span class="marqueNom">Pilotage</span></div><nav class="pastilles" aria-label="Sections du tableau de bord"><a class="pastilleActive" href="#apercu">Vue d’ensemble</a><a class="pastille" href="#tresorerie">Trésorerie</a><a class="pastille" href="#priorites">Priorités</a><a class="pastille" href="#activite">Clients &amp; stock</a><a class="pastille" href="#details">Détails</a></nav><div class="actualisation"><span class="pointDirect"></span><span>Mis à jour il y a 0 s</span><button type="button" aria-label="Actualiser le tableau">↻</button></div></div>`
  const rail = `<aside class="railIcones" aria-label="Accès rapides"><a class="iconeRailActive" href="/tableau-de-bord">${icone('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>')}</a><a class="iconeRail" href="/devis">${icone('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>')}</a><a class="iconeRail" href="/factures">${icone('<path d="M4 2v20l3-2 3 2 2-2 2 2 3-2 3 2V2l-3 2-3-2-2 2-2-2-3 2-3-2Z"/><path d="M8 10h8M8 14h6"/>')}</a><a class="iconeRail" href="/crm">${icone('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>')}</a><a class="iconeRail" href="/inventaire">${icone('<path d="m7.5 4.27 9 5.15M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>')}</a><span class="separateurRail"></span><a class="iconeRail" href="/parametres">${icone('<circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>')}</a></aside>`
  const html = `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>:root{--font-display:'Segoe UI',system-ui,sans-serif;--font-body:'Segoe UI',system-ui,sans-serif;--font-mono:'Cascadia Mono','Consolas',monospace}*{box-sizing:border-box}body{margin:0;background:#F4F5F8}${fichiers.css}</style><main class="tableau">${barreHaute}<div class="cadre">${rail}<div class="contenu"><header class="entete"><div><p class="surtitre">POSTE DE PILOTAGE</p><h1>Votre entreprise · Exemple</h1></div><p class="sousTitreEntete">Vue temps réel de l’argent, des relances et de vos chantiers.</p></header>${bande}<div class="principal">${graphique}<div class="listesPrioritaires">${vueVitrine.listes.slice(0, 3).map(liste).join('')}</div></div><div class="listesSecondaires">${vueVitrine.listes.slice(3).map(liste).join('')}</div><h2 class="sousTitre">Vue détaillée</h2><div class="sections">${details}</div></div></div></main></html>`
  for (const largeur of [1440, 390]) {
    const page = await navigateur.newPage({ viewport: { width: largeur, height: 900 }, deviceScaleFactor: 1 })
    await fs.copyFile(path.join(racine, '.orchestre/preuves/036-039', `${largeur}.png`), path.join(preuve, `${largeur}-avant.png`))
    await page.setContent(html)
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `débordement ${largeur}`)
    await page.screenshot({ path: path.join(preuve, `${largeur}-apres.png`), fullPage: true })
    await page.close()
  }
  await navigateur.close()
  process.stdout.write('CAPTURES FICTIVES : 1440 et 390 écrites\n')
}
process.stdout.write('TABLEAU DE BORD : PASS\n')
