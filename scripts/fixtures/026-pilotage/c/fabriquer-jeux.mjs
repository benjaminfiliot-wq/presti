// scripts/fixtures/026-pilotage/c/fabriquer-jeux.mjs — fabrique les jeux d'essai du juge d'écran de la station (lot c,
// fiche 026-104, écrit par Claude Code) : `node scripts/fixtures/026-pilotage/c/fabriquer-jeux.mjs` réécrit
// scripts/fixtures/026-pilotage/c/jeux/**.json ; `--verifier` ne réécrit rien et sort en 1 si un fichier n'est pas à jour
// (le contrôle JA-3 du lot le fait aussi, en mémoire).
//
// Chaque fichier : { _lisez_moi, statut, reponse } — `reponse` est ce que la route sert (au contrat de s/contrat-vues.mjs
// pour GET /api/controle/station, de c/contrat-blocs.mjs pour les blocs, la trésorerie, les jauges, les packs et les
// réglages), `statut` son code HTTP. Instant des jeux : MAINTENANT (23/10/2026 10:00 UTC) ; le juge décale toutes les
// dates ISO servies de (maintenant réel − MAINTENANT) et tire au hasard, à chaque passage, les montants, les compteurs et
// les comptes à rebours (c/tirages.mjs) : un écran qui recopie un gabarit ne passe pas deux fois.
//
// Aucune donnée réelle : les noms sont des « Témoin », les téléphones et adresses sont ceux du piège (`_piege`, ajouté par
// le juge au moment de servir, jamais dans ces fichiers : le contrat refuse une adresse e-mail hors du Standard).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
export const DOSSIER_JEUX = path.join(ICI, 'jeux')
export const MAINTENANT = '2026-10-23T10:00:00.000Z'
const T0 = Date.parse(MAINTENANT)
const il = (minutes) => new Date(T0 - minutes * 60_000).toISOString()
const dans = (minutes) => new Date(T0 + minutes * 60_000).toISOString()
const env = (valeur, source = 'supabase', plus = {}) => ({ valeur, source, a: MAINTENANT, cache: false, ...plus })
const panne = (erreur, source = 'supabase') => ({ valeur: null, source, a: MAINTENANT, cache: false, erreur })
const vue = (v, valeur, plus = {}) => ({ vue: v, role: 'direction', valeur, source: 'supabase', a: MAINTENANT, cache: false, ...plus })
export const PIEGE_HTML = '<img src=x onerror=alert(1)>'
const cl = (x) => JSON.parse(JSON.stringify(x))

// ── L'équipage ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const A = (nom, libelle, role, salle, point, activite, minutes, cadence, modele, source = 'vu', etat = 'actif', motif = 'tache') =>
  ({ nom, libelle, role, etat, point, activite, activite_le: il(minutes), cadence, prochain_le: null, salle, avatar: nom, position: { salle: point === 'gris' && etat === 'pause' ? 'repos' : salle, motif: etat === 'pause' ? 'pause' : motif }, modele: { texte: modele, source } })
export const AGENTS = [
  A('chef', 'Chef', 'Commande l’équipage', 'commandement', 'cyan', 'Plan du cycle écrit', 60, 'cycle dans 1 h 38', 'MODÈLE gpt-6-sol · Codex'),
  A('recenseur', 'Recenseur', 'Trouve les artisans', 'radar', 'cyan', 'Site [lien] lu', 156, 'toutes les 15 min', 'MODÈLE llama-4-scout · Cerebras · gratuit'),
  A('vigie_meta', 'Radar', 'Repère les annonceurs', 'radar', 'cyan', 'Annonceurs repérés : 4', 153, 'toutes les 6 h', 'sans IA', 'aucun'),
  A('garde', 'Garde', 'Juge les messages (J3)', 'redaction', 'gris', 'En pause (motif : essai)', 300, 'toutes les 15 min', 'MODÈLE gpt-6-luna · Codex', 'vu', 'pause'),
  A('juge_faits', 'Juge des faits', 'Vérifie les faits', 'redaction', 'cyan', 'Faits vérifiés : 3', 20, 'toutes les 15 min', 'MODÈLE qwen-3 · Ollama local · gratuit'),
  A('redacteur', 'Plume', 'Écrit les messages', 'redaction', 'cyan', 'Message écrit : variante B', 25, 'toutes les 15 min', 'MODÈLE gpt-6-luna · Codex'),
  A('facteur', 'Facteur', 'Soumet les formulaires', 'envois', 'cyan', 'Formulaire soumis : plombier', 12, 'toutes les 15 min', 'MODÈLE gpt-6-luna · Codex'),
  A('facteur_usine', 'Facteur (usine)', 'Remplit les formulaires sur l’usine', 'envois', 'cyan', 'Formulaire rempli : couvreur', 14, 'toutes les 15 min', 'sans IA', 'aucun'),
  A('repondeur', 'Répondeur', 'Répond aux réponses', 'standard', 'cyan', 'Réponse classée : oui', 30, 'toutes les 5 min', 'MODÈLE gpt-6-luna · Codex'),
  A('standardiste', 'Standard', 'Relève les réponses', 'standard', 'cyan', 'Boîte relevée', 8, 'toutes les 15 min', 'sans IA', 'aucun'),
  A('atelier_maquettes', 'Atelier', 'Fabrique les maquettes', 'atelier', 'cyan', 'Maquette électricien, Annecy', 42, 'toutes les 30 min', 'MODÈLE gpt-6-luna · Codex'),
  A('livreur', 'Livreur', 'Met les sites en ligne', 'usine', 'rouge', 'Panne : usine injoignable', 600, 'toutes les 15 min', 'sans IA', 'aucun', 'panne', 'panne'),
  A('tresorier', 'Trésorier', 'Tient les comptes', 'tresorerie', 'cyan', 'Comptes du jour tenus', 90, 'une fois par jour', 'sans IA', 'aucun'),
  A('crieur', 'Crieur', 'Publie sur les réseaux', 'crieur', 'jaune', 'Publication programmée', 400, 'toutes les 5 min', 'MODÈLE llama-4-scout · Cerebras · gratuit'),
  A('a0', 'Veilleur', 'Veille sur tout', 'machines', 'cyan', 'Tout va bien', 5, 'toutes les 15 min', 'sans IA', 'aucun'),
]
AGENTS[1].activite = `Site lu : ${PIEGE_HTML}` // un texte servi qui doit s'afficher tel quel (SA-12, ST-8)
const COUTS = AGENTS.map((a, i) => ({ nom: a.nom, cout_mois_eur: [0, 0, 0, 0.42, 0, 1.18, 0.37, 0, 0.12, 0, 2.05, 0, 0, 0, 0][i] ?? 0 }))

// ── Les compteurs de la barre (026-070, ordre servi) ─────────────────────────────────────────────────────────────────────
const C = (cle, libelle, texte, ton, source) => ({ cle, libelle, texte, ton, source })
export const COMPTEURS = [
  C('agents', 'AGENTS ACTIFS', 'AGENTS 12/15 ACTIFS', 'normal', 'pilotage_agents'),
  C('chef', 'CHEF DANS', '1 h 38', 'normal', 'pilotage_chef'),
  C('cycles', 'CYCLES AUJOURD’HUI', '7', 'normal', 'pilotage_chef'),
  C('reunion', 'RÉUNION DANS', '30 h 00', 'normal', 'station_reunion_lire'),
  C('quota_claude', 'QUOTA CLAUDE', 'non mesuré', 'muet', 'jauges'),
  C('quota_codex', 'QUOTA CODEX 5 H', 'non mesuré', 'muet', 'jauges'),
  C('envois', 'ENVOIS DU JOUR', '12/20 · P2', 'normal', 'pilotage_compteurs_du_jour'),
  C('bilan', 'BILAN', '20/100 · bilan du 02/11', 'alerte', 'pilotage_entonnoir'),
]
const COMPTEUR_EXPERIENCE = C('experience', 'EXPÉRIENCE', 'J6/30 · 0 €', 'normal', 'station_experience_etat')

// ── Attention (026-070 : l'ordre et les couleurs sont servis) ────────────────────────────────────────────────────────────
const K = (cle, couleur, nombre, titre, geste, agent = null) => ({ cle, couleur, nombre, titre, geste, agent })
const CARTES = [
  K('decisions', 'rouge', 3, '3 décisions à trancher', { type: 'decisions' }),
  K('appels', 'orange', 2, '2 appels à rendre', { type: 'appels' }),
  K('usine_injoignable', 'rouge', 1, '1 × usine injoignable', { type: 'ouvrir', cible: '/controle/station?salle=machines' }, 'livreur'),
  K('jauge_pleine', 'jaune', 1, '1 × jauge à 80 %', { type: 'ouvrir', cible: '/controle/station?salle=envois' }),
  K('orchestre', 'bleu', 2, '2 × tâche de l’orchestre en échec', { type: 'ouvrir', cible: '/controle/station?salle=chantier' }),
  K('crieur_muet', 'jaune', 1, '1 × Crieur muet depuis 6 h', { type: 'ouvrir', cible: '/controle/station?salle=crieur' }, 'crieur'),
]

// ── Le Commandement ──────────────────────────────────────────────────────────────────────────────────────────────────────
const MISSIONS = [
  { cle: 'oui', libelle: '10 oui', valeur: 2, cible: 10, texte: '2/10', atteinte: false, debloque: '→ succès Premier oui' },
  { cle: 'contacts_froids', libelle: '100 contacts froids (bilan du 02/11)', valeur: 41, cible: 100, texte: '41/100', atteinte: false, debloque: '→ succès Bilan passé' },
  { cle: 'sites_en_ligne', libelle: '1er site en ligne', valeur: 0, cible: 1, texte: '0/1', atteinte: false, debloque: '→ succès Premier site en ligne' },
]
const TOUS_SUCCES = [
  { cle: 'premier_oui', libelle: 'Premier oui', debloque: true, le: il(60 * 24 * 3) },
  { cle: 'premiere_vente', libelle: 'Première vente', debloque: false, le: null },
  { cle: 'premier_site_en_ligne', libelle: 'Premier site en ligne', debloque: false, le: null },
  { cle: 'bilan_passe', libelle: 'Bilan passé', debloque: false, le: null },
]
const COMMANDEMENT = {
  objectif: { libelle: 'Dix formulaires par jour', par: 'PAR LE CHEF', progression: 0.4 },
  missions: MISSIONS,
  succes: { cle: 'premier_oui', libelle: 'Premier oui', le: il(60 * 24 * 3) },
  tousSucces: TOUS_SUCCES,
  compteRendu: ['12 formulaires soumis hier', '2 réponses, dont 1 oui', 'La maquette du plombier est prête'],
  argent: env({ niveau: { lv: 2, xp: 312, texte: '312 / 1 000 XP', prochainSeuil: 1000, part: 0.312 }, missions: [{ cle: 'encaisse_eur', libelle: '300 € encaissés', valeur: 312, cible: 300, texte: '312/300', atteinte: true, debloque: '→ succès Première vente' }] }),
}

// ── Le tapis, le bandeau, la carte ───────────────────────────────────────────────────────────────────────────────────────
const E = (cle, libelle, jour, source) => ({ cle, libelle, jour, source })
const ETAPES = [E('trouve', 'TROUVÉ', 14, 'acq_prospects'), E('verifie', 'VÉRIFIÉ', 9, 'acq_prospects'), E('maquette', 'MAQUETTE', 4, 'atelier_maquettes'), E('contacte', 'CONTACTÉ', 12, 'pilotage_envois_du_jour')]
const TAPIS = { etapes: ETAPES, rejet: { nombre: 3, tauxPass: 0.86 }, paye: env(E('paye', 'PAYÉ', 1, 'stripe')) }
const BANDEAU = { elements: [
  { id: 101, le: il(180), type: 'commande_payee', texte: 'Site · menuisier, Nantes · 300 €' },
  { id: 102, le: il(95), type: 'reponse_oui', texte: 'Oui · plombier, Lyon' },
  { id: 103, le: il(40), type: 'pack_paye', texte: 'Pack · couvreur, Annecy · 90 €' },
] }
const LIGNE = (j) => env({ etapes: ETAPES.map((e) => ({ ...e, jour: e.jour + j })) })
const CARTE = {
  lignes: env({ contenu: LIGNE(0), sites: LIGNE(1), packs: LIGNE(2) }),
  experience: env({ barre: 'J6/30 · 0 €', texte: 'Expérience en cours : J6/30.', sur: 30, statut: 'en_cours' }),
  paliers: env({ usine: { lv: 1, texte: 'Usine LV.1' }, atelier: null }),
  nuit: env(false),
  egaliseur: env([0, 1, 2, 4, 3, 1, 0, 0, 2, 5, 3, 1]),
  departements: env([{ departement: '69', trouves: 14, contactes: 6, oui: 1 }, { departement: '74', trouves: 5, contactes: 2, oui: 0 }]),
}
const BARRE = {
  compteurs: COMPTEURS, auto: { actif: true, texte: 'AUTO' }, cloche: 10, heure: '12:00', jour: 'JOUR 3', nuit: false,
  version: env('a1b2c3d'), sante: env({ etat: 'en ligne', raison: null }), erreurs: env(3), commandes_mois: env(4), sites_en_ligne: env(2),
}
export function direct() {
  return vue('direct', {
    barre: env(cl(BARRE)),
    equipage: env({ agents: cl(AGENTS), reunionEnCours: false, couts: env(cl(COUTS)) }),
    attention: env({ cartes: cl(CARTES), total: 10, vide: null }),
    commandement: env(cl(COMMANDEMENT)),
    tapis: env(cl(TAPIS)),
    bandeau: env(cl(BANDEAU)),
    carte: env(cl(CARTE)),
  })
}

// ── Le fil ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
const B = (id, minutes, agent, pastille, type, texte, plus = {}) => ({ id, le: il(minutes), agent, pastille, type, texte, ...plus })
export function bullesFil() {
  return [
    B(40, 200, 'recenseur', 'RECENSEUR', 'tache_faite', 'Recensé : 6 artisans (Lyon)'),
    B(41, 190, 'redacteur', 'PLUME', 'tache_faite', 'Message écrit : variante B'),
    B(42, 170, 'repondeur', 'RÉPONDEUR', 'reponse_oui', 'Oui reçu : électricien (Lyon)'),
    B(43, 150, 'tresorier', 'TRÉSORIER', 'commande_payee', 'Commande payée : site de menuisier (Nantes)'),
    B(44, 130, 'chef', 'CHEF', 'reunion_compte_rendu', 'Compte rendu de la réunion', { lignes: ['12 formulaires soumis hier', '2 réponses, dont 1 oui', 'La maquette du plombier est prête', 'Objectif : dix formulaires par jour', 'Idée : relancer les couvreurs'] }),
    B(45, 110, 'benj', 'BENJ', 'consigne', 'Priorité aux plombiers de Lyon', { cible: 'facteur', cibleLibelle: 'FACTEUR' }),
    B(46, 90, 'facteur', 'FACTEUR', 'tache_faite', 'Formulaire soumis : plombier (Lyon)'),
    B(47, 70, 'atelier_maquettes', 'ATELIER', 'tache_prise', `Maquette : ${PIEGE_HTML}`),
    B(48, 50, 'crieur', 'CRIEUR', 'publication', 'Publication programmée : chantier du jour'),
    B(49, 30, 'benj', 'BENJ', 'consigne', 'Pas d’envoi le dimanche', { cible: null, cibleLibelle: null }),
    B(50, 10, 'a0', 'VEILLEUR', 'tache_faite', 'Tout va bien'),
  ]
}
const fil = (bulles, plus = {}) => vue('fil', { bulles, dernier_id: bulles.length ? Math.max(...bulles.map((b) => b.id)) : null }, plus)

// ── Les salles à panneau (026-120) ───────────────────────────────────────────────────────────────────────────────────────
const ACTIVE = (m) => env({ minutes: m })
const jours30 = () => Array.from({ length: 30 }, (_, i) => ({ jour: new Date(T0 - (29 - i) * 86_400_000).toISOString().slice(0, 10), agents_eur: [0, 0, 300, 0, 0, 90][i % 6], hors_agents_eur: [29, 0, 0, 58, 0, 0][i % 6] }))
const SALLES = {
  recettes: () => vue('salle', { jours: jours30(), sites: { agents: { commandes: 2, montant_eur: 600 }, hors_agents: { commandes: 1, montant_eur: 300 } }, packs: { valeur: null, source: 'supabase', a: MAINTENANT, cache: false, manque: 'Les packs ne se vendent pas encore.' }, active_auj: ACTIVE(42) }),
  tresorerie: () => vue('salle', {
    parAgent: [{ nom: 'redacteur', cout_mois_eur: 1.18, appels: 42 }, { nom: 'atelier_maquettes', cout_mois_eur: 2.05, appels: 17 }, { nom: 'garde', cout_mois_eur: 0.42, appels: 31 }],
    parTache: [{ id: 'a3f1', agent: 'redacteur', libelle: 'Plume', eur: 0.42 }, { id: 'b7c2', agent: 'atelier_maquettes', libelle: 'Atelier', eur: 0.31 }],
    modeles: [{ fournisseur: 'Codex', modele: 'gpt-6-luna', appels: 42, eur: 0 }, { fournisseur: 'Cerebras', modele: 'llama-4-scout', appels: 18, eur: 0 }],
    total_modeles_eur: 0,
    abonnements: [{ fournisseur: 'Vercel', libelle: 'Hobby', ttc_eur: 0, date_facture: '2026-10-01' }, { fournisseur: 'OVH', libelle: 'Domaine prestiapp.fr', ttc_eur: 8.39, date_facture: '2026-10-03' }],
    parNature: env({ texte: 1.6, image: 2.05, video: 0, voix: 0 }),
    active_auj: ACTIVE(15),
  }),
  usine: () => vue('salle', { commandes: [
    { id: 'c0000001-0000-4000-8000-000000000001', etape: 'payee', depuis: il(120), apercu: null, metier: 'menuisier', commune: 'Nantes' },
    { id: 'c0000002-0000-4000-8000-000000000002', etape: 'generee', depuis: il(60 * 26), apercu: '/storage/v1/object/sign/sites-apercus/c2/index.html?token=essai-c2', metier: 'plombier', commune: 'Lyon' },
    { id: 'c0000003-0000-4000-8000-000000000003', etape: 'en_ligne', depuis: il(60 * 24 * 5), apercu: '/storage/v1/object/sign/sites-apercus/c3/index.html?token=essai-c3', metier: 'couvreur', commune: 'Annecy' },
  ], aValider: 1, active_auj: ACTIVE(55) }),
  atelier: () => vue('salle', { maquettes: [
    { id: 'm1', statut: 'jugee', le: il(40), apercu: '/storage/v1/object/sign/maquettes/m1/index.html?token=essai-m1', metier: 'électricien', commune: 'Annecy', video: true, verdict: 'PASS' },
    { id: 'm2', statut: 'revision', le: il(90), apercu: null, metier: 'plombier', commune: 'Lyon', video: false, verdict: 'FAIL', revision: 'Photo floue en tête' },
  ], rejet: 2, tauxPass: 0.86, active_auj: ACTIVE(120) }),
  reunion: () => vue('salle', { prochaine_le: dans(60 * 30), enCours: false, derniere: { jour: '2026-10-22', statut: 'close', lignes: ['12 formulaires soumis hier', '2 réponses, dont 1 oui', 'La maquette du plombier est prête', 'Objectif : dix formulaires par jour', 'Idée : relancer les couvreurs'] }, idees: [{ cle: 'i1', question: 'Relancer les couvreurs ?', statut: 'à trancher dans Attention' }, { cle: 'i2', question: 'Tester la variante C ?', statut: 'lancée' }], objectif: { libelle: 'Dix formulaires par jour', par: 'PAR LE CHEF' }, active_auj: ACTIVE(0) }),
  envois: () => vue('salle', {
    palier: 'P2 · 20 formulaires par jour',
    parCanal: [
      { canal: 'formulaire_site', libelle: 'Formulaires', utilises: 12, plafond: 20, texte: '12/20', sante: 'ok', raisons: [] },
      { canal: 'email_sollicite', libelle: 'E-mails sollicités', utilises: 3, plafond: 50, texte: '3/50', sante: 'ok', raisons: [] },
      { canal: 'reponse_privee', libelle: 'Réponses privées', utilises: 4, plafond: null, texte: '4', sante: 'attention', raisons: ['2 échecs d’affilée'] },
      { canal: 'messagerie', libelle: 'Messagerie', utilises: 0, plafond: null, texte: '0', sante: 'arretee', raisons: ['canal arrêté par le veilleur'] },
    ],
    parTechnologie: [
      { technologie: 'contact_form_7', envois: 7, echecs_affilee: 0, etat: 'active', motif: null },
      { technologie: 'wpforms', envois: 5, echecs_affilee: 3, etat: 'pause', motif: '3 échecs de soumission d’affilée' },
    ],
    envois: [
      { id: 'e1', metier: 'plombier', commune: 'Lyon', canal: 'formulaire_site', type: 'premier_contact', verdicts: { j1: 'pass', j3: 'pass', second: 'pass' } },
      { id: 'e2', metier: 'couvreur', commune: 'Annecy', canal: 'email_sollicite', type: 'lien_maquette', verdicts: { j1: 'pass', j3: null, second: null } },
    ],
    rejets: 2,
    anomalies: [{ id: 'e3', texte: 'parti sans ses trois verdicts' }],
    vide: null,
    gestes: { envoi_froid: false, epreuve_passee: false, epreuve_le: null, mesure_a_sec: true, notice_verifiee_le: il(60 * 24), technologies_pause: ['wpforms'], modeles_suspendus: ['variante-z'] },
    active_auj: ACTIVE(88),
  }),
  experience: () => vue('salle', { barre: null, texte: 'Aucune expérience avant la première vente (décision R13).', sur: 30, jour: null, gains: null, budget: 0, statut: 'fermee', arret_le: null }),
  standard: () => vue('salle', { parClasse: [{ classe: 'oui', nombre: 1 }, { classe: 'appel', nombre: 1 }, { classe: 'non', nombre: 2 }, { classe: 'sensible', nombre: 1 }, { classe: 'rgpd', nombre: 0 }], reponses: [
    { id: 'r1', recu_le: il(60), classe: 'appel', texte_recu: 'Rappelez-moi demain matin (Témoin Plomberie)', reponse_envoyee: 'Bien reçu, nous vous rappelons.' },
    { id: 'r2', recu_le: il(120), classe: 'oui', texte_recu: `Oui, montrez-moi la maquette ${PIEGE_HTML}`, reponse_envoyee: null },
    { id: 'r3', recu_le: il(200), classe: 'non', texte_recu: 'Non merci (Témoin Couverture)', reponse_envoyee: null },
  ], active_auj: ACTIVE(75) }),
  redaction: () => vue('salle', { variantes: { A: { contacts: 41, oui: 2 }, B: { contacts: 12, oui: 1 } }, envois: [
    { id: 'e1', canal: 'formulaire_site', type: 'premier_contact', variante: 'B', verdicts: { j1: 'pass', j3: 'pass', second: 'pass' } },
    { id: 'e2', canal: 'email_sollicite', type: 'lien_maquette', variante: null, verdicts: { j1: 'pass', j3: 'refus', second: null } },
  ], rejets: 1, modeles_suspendus: ['variante-z'], active_auj: ACTIVE(130) }),
  machines: () => vue('salle', {
    agents: AGENTS.slice(0, 6).map((a, i) => ({ nom: a.nom, etat: a.etat, battement_le: il(5 + i), prochain_le: i === 0 ? dans(98) : null })),
    crons: [{ nom: 'tic', dernier_le: il(4), ok: true }, { nom: 'relances', dernier_le: il(60 * 3), ok: false }],
    usine: env({ mesure: 'CPU 12 % · mémoire 3,1 Go', le: il(20) }),
    ia: env({ fournisseurs: [{ objet: 'codex', resume: 'Codex · 42 appels · quota 5 h à 18 %', le: il(10) }, { objet: 'cerebras', resume: 'Cerebras · 18 appels · gratuit', le: il(12) }], bascules: [{ resume: 'Cerebras → Ollama local (quota)', le: il(300) }], cout_jour_eur: 0, le: il(10) }),
    active_auj: ACTIVE(480),
  }),
}
const A_VENIR = (salle) => vue('salle', null, { source: 'a_venir', manque: 'arrive avec sa fiche' })
const ECOMMERCE = () => vue('salle', null, { source: 'reservee', manque: 'Branche e-commerce réservée : rien n’est construit.' })

// ── Les fiches d'agent (vue=agent) ───────────────────────────────────────────────────────────────────────────────────────
function agent(nom, plus = {}) {
  const a = AGENTS.find((x) => x.nom === nom) ?? AGENTS[0]
  return vue('agent', {
    nom: a.nom, libelle: a.libelle, role: a.role, etat: a.etat, point: a.point, cadence: a.cadence, position: a.position,
    battement_le: il(5), prochain_le: nom === 'chef' ? dans(98) : null, modele: a.modele, modele_le: il(60 * 24 * 2),
    taches: [
      { numero: 41, type: 'formulaire', statut: 'FAIT', resultat: 'Soumis', le: il(60) },
      { numero: 42, type: 'formulaire', statut: 'REJETÉ', resultat: 'Refus J3', le: il(45) },
      { numero: 43, type: 'maquette', statut: 'BLOQUÉ', resultat: 'Photo manquante', le: il(30) },
      { numero: 44, type: 'maquette', statut: 'EN COURS', resultat: null, le: il(5) },
    ],
    argent: env({ cout_mois_eur: COUTS.find((c) => c.nom === nom)?.cout_mois_eur ?? 0, coutParTache: [{ numero: 41, eur: 0.02 }, { numero: 42, eur: 0.01 }] }),
    ...plus,
  })
}
const AGENTS_VUES = {
  chef: () => agent('chef', { consignes: [{ id: 45, le: il(110), texte: 'Priorité aux plombiers de Lyon', lue: true }, { id: 49, le: il(30), texte: 'Pas d’envoi le dimanche', lue: false }] }),
  facteur: () => agent('facteur', { technologies: [{ technologie: 'contact_form_7', envois: 7, etat: 'active' }, { technologie: 'wpforms', envois: 5, etat: 'pause' }] }),
  facteur_usine: () => agent('facteur_usine', { technologies: [{ technologie: 'gravity_forms', envois: 2, etat: 'active' }] }),
  repondeur: () => agent('repondeur', { reponses: [
    { id: 'r1', recu_le: il(60), classe: 'appel', texte_recu: 'Rappelez-moi demain matin (Témoin Plomberie)', reponse_envoyee: 'Bien reçu, nous vous rappelons.' },
    { id: 'r2', recu_le: il(120), classe: 'oui', texte_recu: 'Oui, montrez-moi la maquette', reponse_envoyee: 'Voici le lien de votre maquette.' },
  ] }),
  livreur: () => agent('livreur', { taches: [
    { numero: 12, type: 'mise_en_ligne', statut: 'FAIT', resultat: 'couvreur (Annecy) en ligne', le: il(60 * 24) },
    { numero: 13, type: 'mise_en_ligne', statut: 'BLOQUÉ', resultat: 'usine injoignable', le: il(600) },
    { numero: 14, type: 'generation', statut: 'ANNULÉ', resultat: 'commande remboursée', le: il(60 * 30) },
    { numero: 15, type: 'generation', statut: 'REJETÉ', resultat: 'juge du site : FAIL', le: il(60 * 5) },
  ] }),
}

// ── Les autres routes ────────────────────────────────────────────────────────────────────────────────────────────────────
const ENC = (net) => ({ brut: +(net * 1.03).toFixed(2), frais: +(net * 0.03).toFixed(2), net, paiements: 3, rembourse: 0 })
const TRESORERIE = () => ({
  encaisse: { jour: env(ENC(0), 'stripe'), sept_jours: env(ENC(300), 'stripe'), mois: env(ENC(1234.56), 'stripe') },
  mrr: env({ mrr: 87, abonnements: 3 }, 'stripe'),
  ventes_sites: env({ agents: { commandes: 2, montant_eur: 600 }, hors_agents: { commandes: 1, montant_eur: 300 } }),
  depenses_mois: env(345.67),
  cout_ia: env({ euros: 0, estimation: false }, 'anthropic'),
  marge: env(888.89),
  tva: env({ ca: 4321, seuil: 37500, alerte: false, depasse: false, texte: '12 % du seuil de franchise' }),
  a: MAINTENANT,
})
const JAUGES = () => ({ jauges: [
  { cle: 'formulaire_jour', libelle: 'Formulaires du jour', utilise: 12, plafond: 20, part: 0.6, etat: 'ok' },
  { cle: 'formulaire_technologie:wpforms', libelle: 'wpforms', utilise: 5, plafond: 6, part: 0.83, etat: 'attention' },
  { cle: 'email_sollicite_jour', libelle: 'E-mails sollicités', utilise: 50, plafond: 50, part: 1, etat: 'pleine' },
  { cle: 'meta_ads_archive', libelle: 'Bibliothèque publicitaire', utilise: 40, plafond: 150, part: 0.27, etat: 'ok' },
], a: MAINTENANT })
const OPT = (cle, libelle, recommandee = false) => ({ cle, libelle, recommandee })
const DEC = (id, question, options, defaut, portee, montant, echeanceMin, epinglee = false) => ({
  id, question, contexte: 'Contexte d’essai (Témoin).', montant, options, defaut: { cle: defaut, libelle: options.find((o) => o.cle === defaut).libelle },
  libelleDefaut: echeanceMin ? `Par défaut dans ${Math.floor(echeanceMin / 60)} h : ${options.find((o) => o.cle === defaut).libelle}` : 'Pas d’échéance : rien ne se fait sans vous',
  portee, echeance: echeanceMin ? dans(echeanceMin) : null, epinglee,
})
const U = (n) => `d0000000-0000-4000-8000-00000000000${n}`
const DECISIONS = [
  DEC(U(1), 'Relancer les couvreurs d’Annecy ?', [OPT('oui', 'Relancer', true), OPT('non', 'Ne pas relancer')], 'non', null, null, 180),
  DEC(U(2), 'Payer le domaine du site de Témoin Plomberie ?', [OPT('payer', 'Payer 12 €', true), OPT('attendre', 'Attendre'), OPT('refuser', 'Refuser')], 'attendre', 'argent', '12,00 €', 600),
  DEC(U(3), 'Changer l’heure du digest ?', [OPT('matin', '7 h'), OPT('midi', '12 h', true)], 'matin', null, null, 0),
]
const BLOC = (bloc, valeur) => ({ bloc, ...env(valeur) })
const APPELS = [
  { id: 'a0000001-0000-4000-8000-000000000001', nom: 'Témoin Plomberie', tel: 'tel:0611223344', lignes: ['Créneau : 30/10 à 14 h 30', 'Plombier · Lyon'], source: 'Rendez-vous réservé', sourceAppel: 'rdv', a: il(60 * 18) },
  { id: 'a0000002-0000-4000-8000-000000000002', nom: 'Témoin Couverture', tel: null, lignes: ['A demandé un appel il y a 3 h', 'Rappelez-moi demain matin'], source: 'Réponse à un message', sourceAppel: 'reponse', a: il(180) },
  { id: 'c0000009-0000-4000-8000-000000000009', nom: 'Témoin Menuiserie', tel: 'tel:0655667788', lignes: ['Site payé il y a 2 h · menuisier à Nantes', 'Manque : photo du logo'], source: 'Commande de site', a: il(120) },
]
const ENTONNOIR = () => BLOC('entonnoir', {
  j7: { contacts: 41, reponses: 3, oui: 2, appels: 1, ventes: 0, chauds: 1, parVariante: { A: { contacts: 30, oui: 1 }, B: { contacts: 11, oui: 1 } }, parCanal: { formulaire_site: { contacts: 38, oui: 2 } } },
  j30: { contacts: 97, reponses: 6, oui: 3, appels: 2, ventes: 1, chauds: 4, parVariante: {}, parCanal: {} },
  hypotheses: { reponse: { min: 0.01, max: 0.05, source: 'rectification du 24/09, §3.6 (supposé)' } },
})
const CODE = () => BLOC('code', {
  file: ['026-111', '026-113'], enCours: [{ id: '026-120', agent: 'antigravity', depuis: il(150) }], verrousVieux: ['026-120'],
  derniers: [{ id: '026-104', verdict: 'PASS', le: il(30) }, { id: '026-067', verdict: 'FAIL', le: il(90) }],
  prs: { ouvertes: 1, texte: '1 PR ouverte' }, attention: ['026-120 tient son verrou depuis 2 h'], perime: false, message: null, publie_le: il(120),
})
const PACKS = () => ({ packs: [
  { id: 'p1', etat: 'fabriquee', metier: 'plombier', commune: 'Lyon', fabrique_le: il(60 * 5), livre_le: null, refaits: 0, apercus: { video: '/storage/v1/object/sign/packs-pubs/p1/video-1.mp4?token=essai', visuel: '/storage/v1/object/sign/packs-pubs/p1/visuel-1.jpg?token=essai' } },
  { id: 'p2', etat: 'livree', metier: 'couvreur', commune: 'Annecy', fabrique_le: il(60 * 48), livre_le: il(60 * 30), refaits: 1, apercus: null },
], a: MAINTENANT })
const REGLAGES = (mise_en_page = 'colonnes', couleurs = {}) => ({ version: 3, reglages: { theme: 'station', mise_en_page, nuit: { active: true, debut: 20, fin: 7 }, equipage: {}, salles: {}, couleurs, affichage: { titre: 'PRESTI · MISSION CONTROL' } }, modifie_par: null, modifie_le: il(60 * 16) })

// ── La liste des jeux ────────────────────────────────────────────────────────────────────────────────────────────────────
const J = (lisez, reponse, statut = 200) => ({ _lisez_moi: lisez, statut, reponse })
export function jeux() {
  const out = {}
  const d = direct()
  out['vues/direct.json'] = J('GET /api/controle/station?vue=direct : les six sous-parties et la carte, 15 agents (un « sans IA », un en pause, un en panne), 6 cartes Attention (dont une orchestre et deux nommant un agent), trois missions, un succès débloqué.', d)
  out['vues/fil.json'] = J('GET /api/controle/station?vue=fil (sans apres) : 11 bulles, dont un compte rendu de réunion (5 lignes), deux consignes de Benj (une adressée au Facteur), un texte piégé HTML.', fil(bullesFil()))
  for (const cle of Object.keys(SALLES)) out[`vues/salle-${cle}.json`] = J(`GET /api/controle/station?vue=salle&salle=${cle}`, SALLES[cle]())
  for (const cle of ['commandement', 'radar', 'crieur', 'studio', 'chantier', 'audience', 'securite', 'presti', 'observatoire', 'repos']) out[`vues/salle-${cle}.json`] = J(`GET /api/controle/station?vue=salle&salle=${cle} : salle sans lecteur avant 026-178 (source a_venir).`, A_VENIR(cle))
  out['vues/salle-ecommerce.json'] = J('GET /api/controle/station?vue=salle&salle=ecommerce : la salle réservée.', ECOMMERCE())
  for (const nom of Object.keys(AGENTS_VUES)) out[`vues/agent-${nom}.json`] = J(`GET /api/controle/station?vue=agent&nom=${nom}`, AGENTS_VUES[nom]())
  out['vues/agent-modele.json'] = J('GET /api/controle/station?vue=agent&nom=<autre> : gabarit servi pour tout agent sans jeu propre (le juge y pose le nom demandé).', agent('recenseur'))
  out['reglages.json'] = J('GET /api/controle/station/reglages (026-177) : mise en page colonnes.', REGLAGES())
  out['reglages-flottante.json'] = J('GET /api/controle/station/reglages : mise en page flottante (thème Vaisseau).', REGLAGES('flottante'))
  out['reglages-neon.json'] = J('GET /api/controle/station/reglages : une couleur de néon réglée (ST-11 : posée sur .mc seulement).', REGLAGES('colonnes', { neon_1: '#12A4B6' }))
  out['reglages-404.json'] = J('GET /api/controle/station/reglages : route absente ou drapeau baissé → les défauts, sans panne affichée.', { error: 'Not Found' }, 404)
  const cc = cl(d); cc.valeur.commandement.valeur.tousSucces = [
    { cle: 'premier_oui', libelle: 'Premier oui', debloque: true, le: il(60 * 24 * 3) },
    { cle: 'premiere_vente', libelle: 'Première vente', debloque: true, le: il(60 * 24) },
    { cle: 'premier_site_en_ligne', libelle: 'Premier site en ligne', debloque: false, le: null },
    { cle: 'bilan_passe', libelle: 'Bilan passé', debloque: false, le: null },
  ]
  cc.valeur.commandement.valeur.missions[0].libelle = PIEGE_HTML
  out['commandement-complet.json'] = J('vue=direct : le Commandement complet (missions avec barre, valeur, cible et succès débloqué ; niveau ; quatre succès, deux débloqués datés, deux à venir ; un libellé de mission piégé).', cc)
  out['barre-sources.json'] = J('vue=direct : chaque compteur de la barre avec sa source (l’Aide la dit, VU-4) ; le juge tire les sources au hasard.', cl(d))
  out['tresorerie.json'] = J('GET /api/controle/tresorerie (026-059) : { encaisse: { jour, sept_jours, mois }, mrr, ventes_sites, depenses_mois, cout_ia, marge, tva, a }, chaque valeur sourcée ; encaisse.mois = encaisseDuMois entier.', TRESORERIE())
  out['tresorerie-503.json'] = J('GET /api/controle/tresorerie en panne.', { error: 'Trésorerie indisponible : Stripe injoignable.' }, 503)
  out['jauges.json'] = J('GET /api/controle/jauges (026-064) : quatre jauges, dont une en attention et une pleine.', JAUGES())
  out['decider.json'] = J('GET /api/controle/pilotage?bloc=decider (026-068) : trois décisions, dont une à enjeu argent (reconfirmation).', BLOC('decider', { cartes: DECISIONS, autres: 0, invalides: 0 }))
  const epi = cl(DECISIONS); epi[2].epinglee = true
  out['decider-epinglee.json'] = J('bloc=decider&decision=<id> : la troisième décision épinglée (lien profond, EG-8).', BLOC('decider', { cartes: [epi[2], epi[0], epi[1]], autres: 2, invalides: 0 }))
  out['decider-sept-options.json'] = J('bloc=decider : une décision « lire » du Standard à sept options (EG-14).', BLOC('decider', { cartes: [DEC(U(7), 'Que répondre à Témoin Plomberie ?', ['Rappeler', 'Envoyer la maquette', 'Proposer un créneau', 'Classer oui', 'Classer non', 'Classer sensible', 'Ignorer'].map((l, i) => OPT(`o${i + 1}`, l, i === 2)), 'o7', null, null, 240)], autres: 0, invalides: 0 }))
  out['appeler.json'] = J('GET /api/controle/pilotage?bloc=appeler (026-068) : un rendez-vous réservé, une réponse « appel » sans numéro, une commande de site.', BLOC('appeler', { appels: APPELS, partiel: null }))
  const g = SALLES.envois(); g.valeur.gestes = { envoi_froid: false, epreuve_passee: true, epreuve_le: il(60 * 24), mesure_a_sec: true, notice_verifiee_le: il(60 * 24 * 2), technologies_pause: ['wpforms', 'gravity_forms'], modeles_suspendus: ['variante-z'] }
  g.valeur.parCanal[3].sante = 'arretee'
  out['salle-envois-gestes.json'] = J('vue=salle&salle=envois avec les gestes du fondateur (EG-13) : épreuve passée, mesure à sec faite, notice vérifiée il y a 2 j, deux technologies en pause, un canal arrêté, un modèle suspendu ; le juge fige la date (11/10 puis 12/10) et fait varier mesure_a_sec, epreuve_passee et la notice.', g)
  out['tapis.json'] = J('La sous-partie tapis de vue=direct lue par le Radar (026-164).', env(cl(TAPIS)))
  const tp = cl(TAPIS); tp.etapes[3].jour += 1
  out['tapis-plus-un.json'] = J('Le tapis où l’étape contacte gagne 1.', env(tp))
  out['entonnoir.json'] = J('GET /api/controle/pilotage?bloc=entonnoir (026-068) : 7 et 30 jours, les chauds à part.', ENTONNOIR())
  out['fil-crieur.json'] = J('GET /api/controle/station?vue=fil&agent=crieur : les bulles du Crieur.', fil([
    B(60, 300, 'crieur', 'CRIEUR', 'publication', 'Publication programmée : chantier du jour'),
    B(61, 120, 'crieur', 'CRIEUR', 'commentaire', 'Commentaire « SITE » reçu : 2'),
    B(62, 20, 'crieur', 'CRIEUR', 'publication', `Brouillon : ${PIEGE_HTML}`),
  ]))
  out['packs.json'] = J('GET /api/controle/packs (026-137) : deux packs (le panneau n’en montre ni aperçu ni film).', PACKS())
  out['packs-404.json'] = J('GET /api/controle/packs : drapeau packPub baissé.', { error: 'Not Found' }, 404)
  out['code.json'] = J('GET /api/controle/pilotage?bloc=code (026-068) : le dernier relevé du poste, vieux de 2 h.', CODE())
  const cp = CODE(); cp.valeur.perime = true; cp.valeur.message = 'Le poste ne publie plus depuis 3 h : PC éteint ?'; cp.valeur.publie_le = il(180)
  out['code-perime.json'] = J('bloc=code périmé : la phrase servie en évidence.', cp)
  const d503 = cl(d); d503.valeur.equipage = panne('pilotage_agents injoignable (délai dépassé)')
  out['direct-503.json'] = J('vue=direct dont la sous-partie equipage est en panne ; les autres zones sont servies.', d503)
  const av = cl(d); av.valeur.attention.valeur = { cartes: [], total: 0, vide: 'Rien pour toi. L’équipage tourne.' }; av.valeur.barre.valeur.cloche = 0
  out['attention-vide.json'] = J('vue=direct sans carte Attention : la phrase vide servie.', av)
  const ao = cl(d); ao.valeur.attention.valeur = { cartes: [
    K('decisions', 'rouge', 3, '3 décisions à trancher', { type: 'decisions' }), K('usine_injoignable', 'rouge', 1, '1 × usine injoignable', { type: 'ouvrir', cible: '/controle/station?salle=machines' }, 'livreur'),
    K('appels', 'orange', 2, '2 appels à rendre', { type: 'appels' }), K('canal_arrete', 'orange', 1, '1 × canal arrêté', { type: 'ouvrir', cible: '/controle/station?salle=envois' }),
    K('jauge_pleine', 'jaune', 1, '1 × jauge à 80 %', { type: 'ouvrir', cible: '/controle/station?salle=envois' }), K('crieur_muet', 'jaune', 1, '1 × Crieur muet depuis 6 h', { type: 'ouvrir', cible: '/controle/station?salle=crieur' }, 'crieur'),
    K('orchestre', 'bleu', 2, '2 × tâche de l’orchestre en échec', { type: 'ouvrir', cible: '/controle/station?salle=chantier' }),
  ], total: 12, vide: null }
  ao.valeur.barre.valeur.cloche = 12
  out['attention-ordre.json'] = J('vue=direct : sept cartes Attention de quatre couleurs, total 12 (« 5 autres »).', ao)
  const inj = bullesFil()
  out['fil-injection.json'] = { statut: 200, reponse: fil(inj), apres: fil([...inj, B(51, 0, 'atelier_maquettes', 'ATELIER', 'tache_prise', 'Maquette plombier, Lyon')]), activite: { agent: 'atelier_maquettes', texte: 'Maquette plombier, Lyon' } }
  out['fil-injection.json'] = { _lisez_moi: 'Le fil d’avant (reponse), puis l’événement injecté au temps t (apres : tache_prise de atelier_maquettes, « Maquette plombier, Lyon ») ; la sous-partie equipage de vue=direct servie après t porte cette activité.', ...out['fil-injection.json'] }
  out['fil-nouvelle-bulle.json'] = J('vue=fil : une bulle nouvelle (id 51) servie à la 4e lecture du fil (ST-14).', fil([...bullesFil(), B(51, 0, 'facteur', 'FACTEUR', 'tache_faite', 'Formulaire soumis : couvreur (Annecy)')]))
  const ren = SALLES.reunion(); ren.valeur.enCours = true
  out['reunion-en-cours.json'] = J('vue=salle&salle=reunion : la réunion se tient.', ren)
  out['reunion-close.json'] = J('vue=salle&salle=reunion : réunion close.', SALLES.reunion())
  const ferme = SALLES.envois(); Object.assign(ferme.valeur, { parCanal: [], parTechnologie: [], envois: [], anomalies: [], rejets: 0, vide: 'Le canal formulaire est fermé jusqu’au 12/10 : aucun envoi à froid.' })
  out['envois-formulaire-ferme.json'] = J('vue=salle&salle=envois : aucun envoi froid, la phrase vide servie (026-015).', ferme)
  out['experience-sans-vente.json'] = J('vue=salle&salle=experience : aucune vente (R13).', SALLES.experience())
  const ev = SALLES.experience(); Object.assign(ev.valeur, { texte: 'Une vente est faite : Benj peut choisir la première expérience.', statut: 'possible' })
  out['experience-une-vente.json'] = J('vue=salle&salle=experience : une vente, aucune expérience.', ev)
  const ec = SALLES.experience(); Object.assign(ec.valeur, { barre: 'J6/30 · 0 €', texte: 'Expérience en cours : Studio e-commerce.', jour: 6, gains: 0, budget: 0, statut: 'en_cours', arret_le: dans(60 * 24 * 24) })
  out['experience-en-cours.json'] = J('vue=salle&salle=experience : en cours, J6/30 · 0 €.', ec)
  const ea = SALLES.experience(); Object.assign(ea.valeur, { barre: null, texte: 'Arrêtée seule à J30 : rien rapporté.', jour: 30, gains: 0, budget: 0, statut: 'arretee', arret_le: il(60) })
  out['experience-arretee.json'] = J('vue=salle&salle=experience : arrêtée seule à J30.', ea)
  const eg = SALLES.experience(); Object.assign(eg.valeur, { barre: null, texte: 'Gagnante : 180 € rapportés. La suite est à Benj.', jour: 30, gains: 180, budget: 0, statut: 'gagnante', arret_le: il(60) })
  out['experience-gagnante.json'] = J('vue=salle&salle=experience : gagnante.', eg)
  out['role-lecture.json'] = J('GET /api/controle/journal?limite=1 d’un fondateur au rôle lecture (direction_roles.role = lecture).', { lignes: [], role: 'lecture' })
  out['role-direction.json'] = J('GET /api/controle/journal?limite=1 du fondateur d’essai.', { lignes: [], role: 'direction' })
  const sm = SALLES.machines(); sm.valeur.ia = { valeur: null, source: 'supabase', a: MAINTENANT, cache: false, manque: 'Aucun relevé ia_quota de l’usine depuis 24 h.' }
  out['salle-machines-sans-ia.json'] = J('vue=salle&salle=machines avec ia nul et son manque (SA-20).', sm)
  return out
}

// ── Écriture ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const texteJeu = (x) => `${JSON.stringify(x, null, 1)}\n`
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const verifier = process.argv.includes('--verifier')
  const tous = jeux()
  const faux = []
  for (const [rel, x] of Object.entries(tous)) {
    const f = path.join(DOSSIER_JEUX, rel)
    const t = texteJeu(x)
    if (verifier) { if ((fs.existsSync(f) ? fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n') : null) !== t) faux.push(rel); continue }
    fs.mkdirSync(path.dirname(f), { recursive: true })
    fs.writeFileSync(f, t)
  }
  if (!verifier) {
    // Un jeu retiré de la liste ne doit pas traîner sur le disque.
    const garder = new Set(Object.keys(tous).map((k) => k.split('/').join(path.sep)))
    const lister = (d, rel = '') => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? lister(path.join(d, e.name), path.join(rel, e.name)) : [path.join(rel, e.name)])
    for (const f of lister(DOSSIER_JEUX)) if (!garder.has(f)) fs.rmSync(path.join(DOSSIER_JEUX, f))
    console.log(`${Object.keys(tous).length} jeux écrits sous ${path.relative(process.cwd(), DOSSIER_JEUX)}`)
  } else {
    console.log(faux.length ? `jeux pas à jour : ${faux.join(', ')}` : `${Object.keys(tous).length} jeux à jour`)
    process.exit(faux.length ? 1 : 0)
  }
}
