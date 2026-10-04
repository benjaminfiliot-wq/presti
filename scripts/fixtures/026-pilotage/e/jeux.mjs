// scripts/fixtures/026-pilotage/e/jeux.mjs — les jeux d'essai du juge d'écran de la carte (lot e, fiche 026-172, écrit par Claude Code).
//
// Deux choses : (1) `fabriquer()` rend, en mémoire, les fichiers JSON du dossier (suites d'événements, fil historique, nuit, modèles, expérience
// fermée, réglages piégés, historique, salles hors périmètre et piégées) ; `fabriquer-jeux.mjs` les écrit, et le contrôle JA-3 du lot vérifie que les
// fichiers du dépôt sont ceux-là, octet pour octet. (2) des fabriques de RÉPONSES SERVIES : on part de reponsesParDefaut() (k/session-simulee.mjs, tirée
// de s/ : validée par s/contrat-vues.mjs) et on la modifie par des gestes nommés (placer, bulle, tapis, nuit…), sans jamais en changer la forme.
// Aucune donnée réelle : le piège « Jean Témoin » et `<img src=x onerror=alert(1)>` sont posés là où l'écran ne doit rien afficher ou tout afficher en texte.
import fs from 'node:fs'
import path from 'node:path'
import { reponsesParDefaut } from '../k/session-simulee.mjs'
import { E, copie, jeuE } from './commun.mjs'

export const PIEGE_HTML = '<img src=x onerror=alert(1)>'
export const PIEGE_NOM = 'Jean Témoin'
const K = path.join(E, '..', 'k')
export const themeEssai = () => JSON.parse(fs.readFileSync(path.join(K, 'themes', 'essai', 'theme.json'), 'utf8'))
/** Le thème d'essai dont le hublot de la salle de réunion est un polygone (le thème Station livré par 026-185 en a un ; le juge n'attend pas sa livraison). */
export function themeHublot() {
  const t = themeEssai()
  t.emplacements.find((e) => e.cle === 'reunion').forme = { type: 'polygone', points: [[84, 8], [108, 8], [120, 20], [120, 44], [108, 56], [84, 56], [72, 44], [72, 20]] }
  return t
}

// ── Les réponses servies ─────────────────────────────────────────────────────────────────────────────────────────────────────
/** Les réponses par défaut, le thème d'essai (avec hublot) servi sous la clé `essai`, le réglage `theme` valant `essai`. */
export function base({ hublot = true } = {}) {
  const r = reponsesParDefaut()
  r.themes = { essai: hublot ? themeHublot() : themeEssai() }
  r.reglages.reglages.theme = 'essai'
  return r
}
export const agents = (r) => r.direct.valeur.equipage.valeur.agents
export const agentDe = (r, nom) => agents(r).find((a) => a.nom === nom)
export function placer(r, nom, salle, motif) {
  const a = agentDe(r, nom)
  if (!a) throw new Error(`agent ${nom} inconnu`)
  a.position = { salle, motif }
  if (salle) a.salle = salle
  return r
}
export function bulle(r, { agent, texte, pastille = 'ESSAI', type = 'reponse_oui' }) {
  const v = r.fil.valeur
  const id = Math.max(0, ...v.bulles.map((b) => b.id)) + 1
  v.bulles.push({ id, le: '2026-10-23T10:01:00.000Z', agent, pastille, type, texte })
  v.dernier_id = id
  return r
}
export const nouvelleBulleSansEffet = (r, n = 1) => bulle(r, { agent: 'facteur', texte: `Bulle d’essai n° ${n}`, pastille: 'FACTEUR' })
/** Une étape de evenements.json appliquée aux réponses : positions, réunion, bulle. `snapshot` : les positions d'avant (pour la clôture de la réunion). */
export function appliquerEvenement(r, etape, snapshot = null) {
  if (etape.reunionEnCours !== undefined) r.direct.valeur.equipage.valeur.reunionEnCours = etape.reunionEnCours
  if (etape.reunion === 'ouvrir') for (const a of agents(r)) { if (a.position.motif === 'pause' || a.position.motif === 'panne') continue; a.position = { salle: 'reunion', motif: 'reunion' } }
  if (etape.reunion === 'fermer' && snapshot) for (const a of agents(r)) { const s = snapshot.get(a.nom); if (s && a.position.motif === 'reunion') a.position = { ...s } }
  for (const [nom, p] of Object.entries(etape.positions || {})) placer(r, nom, p.salle, p.motif)
  if (etape.bulle) bulle(r, etape.bulle)
  return r
}
export const photoPositions = (r) => new Map(agents(r).map((a) => [a.nom, { ...a.position }]))
export function tapisPlusUn(r, etape = 'contacte', delta = 1) {
  const e = r.direct.valeur.tapis.valeur.etapes.find((x) => x.cle === etape)
  if (!e) throw new Error(`étape ${etape} inconnue`)
  e.jour += delta
  return r
}
export function nuit(r, vrai) { r.direct.valeur.carte.valeur.nuit.valeur = !!vrai; return r }
export function modeles(r, table) { for (const [nom, texte] of Object.entries(table)) { const a = agentDe(r, nom); if (a) a.modele = { texte, source: 'vu' } } return r }
export const carte = (r) => r.direct.valeur.carte.valeur
/** Une valeur du direct recopiée à neuf (une relecture identique : même contenu, objet neuf). */
export const relecture = (r) => { r.direct = copie(r.direct); r.fil = copie(r.fil); return r }

// ── Les fichiers JSON ────────────────────────────────────────────────────────────────────────────────────────────────────────
const HORS = { valeur: null, nonMesure: true, raison: 'hors périmètre' }
const ENV = (valeur) => ({ valeur, source: 'supabase', a: '2026-10-23T10:00:00.000Z', cache: false })
export function fabriquer() {
  const f = {}
  f['evenements.json'] = {
    _: "Les suites d'événements injectées par station-ecran-qa (CE-4 à CE-7, CE-25 à CE-27) : chaque étape change les positions servies (`positions()` de 026-070 : salle et motif porte|tache|reunion|pause|panne) et ajoute une bulle au fil (une bulle nouvelle fait relire vue=direct sans attendre les 30 s : Station.tsx, 026-111).",
    depart_porte: { positions: { atelier_maquettes: { salle: 'atelier', motif: 'porte' } } },
    tache_prise: { positions: { atelier_maquettes: { salle: 'atelier', motif: 'tache' } }, bulle: { agent: 'atelier_maquettes', pastille: 'ATELIER', type: 'maquette_prete', texte: 'Maquette plombier, Lyon' } },
    reunion_ouverte: { reunionEnCours: true, reunion: 'ouvrir', bulle: { agent: 'chef', pastille: 'CHEF', type: 'reunion', texte: 'Réunion ouverte' } },
    reunion_close: { reunionEnCours: false, reunion: 'fermer', bulle: { agent: 'chef', pastille: 'CHEF', type: 'reunion', texte: 'Réunion close' } },
    pause: { positions: { facteur: { salle: 'repos', motif: 'pause' } }, bulle: { agent: 'facteur', pastille: 'FACTEUR', type: 'pause', texte: 'Pause posée par le Chef' } },
    reprise: { positions: { facteur: { salle: 'envois', motif: 'tache' } }, bulle: { agent: 'facteur', pastille: 'FACTEUR', type: 'reprise', texte: 'Reprise' } },
    panne: { positions: { redacteur: { salle: 'redaction', motif: 'panne' } }, bulle: { agent: 'redacteur', pastille: 'RÉDACTEUR', type: 'panne', texte: 'Panne signalée' } },
    radar: { bulle: { agent: 'recenseur', pastille: 'RECENSEUR', type: 'radar', texte: 'Annonceur repéré (essai)' } },
    ailleurs: { bulle: { agent: 'facteur', pastille: 'FACTEUR', type: 'envoi', texte: 'Envoi d’essai' } },
  }
  f['tapis-plus-un.json'] = { _: "CE-12 : +1 servi en `contacte` (mouvements() de 026-070 : le jour de l'étape monte) ; une bulle accompagne le mouvement pour que Station relise vue=direct.", etape: 'contacte', delta: 1, bulle: { agent: 'recenseur', pastille: 'RECENSEUR', type: 'radar', texte: 'Contact envoyé (essai)' } }
  // Le fil historique : 100 bulles déjà passées, dont 30 du Radar (CE-25 : le premier relevé ne fait marcher ni tourner personne).
  const agentsFil = ['recenseur', 'vigie_meta', 'repondeur', 'tresorier', 'facteur', 'redacteur', 'chef']
  const bulles = Array.from({ length: 100 }, (_, i) => ({ id: i + 1, le: `2026-10-22T${String(8 + Math.floor(i / 10)).padStart(2, '0')}:${String((i % 10) * 6).padStart(2, '0')}:00.000Z`, agent: i < 30 ? (i % 2 ? 'vigie_meta' : 'recenseur') : agentsFil[2 + (i % 5)], pastille: 'HISTORIQUE', type: 'radar', texte: `Bulle historique n° ${i + 1}` }))
  f['fil-historique.json'] = { _: "100 bulles déjà passées (ids 1 à 100), dont 30 du Radar et du Veilleur : à la première lecture, aucune ne fait tourner l'antenne ni marcher un personnage (CE-25).", vue: 'fil', role: 'direction', valeur: { bulles, dernier_id: 100 } }
  f['carte-nuit.json'] = { _: "CE-27 : la sous-partie carte.nuit servie, fausse puis vraie (calculée côté route par nuit() de 026-070) ; l'écran ne lit jamais l'heure.", faux: ENV(false), vrai: ENV(true) }
  f['equipage-modeles.json'] = { _: "CE-28 : le `modele.texte` de equipage[*] (026-092) que l'info-bulle doit montrer tel quel ; « sans IA » pour un agent sans modèle.", modeles: { chef: 'gpt-6-sol · Codex', recenseur: 'llama-4-scout · Cerebras · gratuit', garde: 'sans IA', standardiste: 'gpt-6-luna (pas encore appelé)', facteur: 'gpt-6-luna · Codex' } }
  f['experience-sans-vente.json'] = { _: "CE-13 : carte.experience avant la première vente (etatExperience(null) de 026-070 : pas de barre, pas de statut) ; l'écran dit « FERMÉE · R13 ».", experience: ENV({ barre: null, titre: 'Expérience', texte: 'Aucune expérience avant la première vente (décision R13).', jour: 1, sur: 30, gains: 0, budget: 0, statut: null }) }
  f['reglages-pieges.json'] = { _: "CE-16 : un texte `<img src=x onerror=alert(1)>` dans un nom d'agent réglé et une plaque réglée, plus une bulle du fil, doit s'afficher TEL QUEL partout (miroir et info-bulle compris) ; aucun élément img, aucune boîte de dialogue.", _piege: PIEGE_HTML, equipage: { facteur: { nom: PIEGE_HTML } }, salles: { radar: { plaque: PIEGE_HTML } }, bulle: { agent: 'facteur', pastille: 'FACTEUR', type: 'envoi', texte: PIEGE_HTML } }
  f['reglages-historique.json'] = { _: 'CE-19 : douze versions servies ; « Historique » en montre dix.', versions: Array.from({ length: 12 }, (_, n) => ({ version: 12 - n, modifie_par: '90000000-0000-4000-8000-00000000f001', modifie_le: `2026-10-${String(22 - n).padStart(2, '0')}T18:00:00.000Z`, reglages: { affichage: { titre: `Version ${12 - n}` } } })) }
  f['salles-hors-perimetre.json'] = { _: "CE-21, CE-22 : les sous-parties que le rôle ne voit pas deviennent EXACTEMENT { valeur: null, nonMesure: true, raison: 'hors périmètre' } (jamais 0).", commandement: { argent: HORS }, audience: { active_auj: HORS }, securite: { active_auj: HORS }, presti: { mrr: HORS, tickets: HORS, active_auj: HORS }, observatoire: { active_auj: HORS }, repos: { active_auj: HORS } }
  f['salles-pieges.json'] = { _: "CE-22 : aucun nom de personne dans un panneau ; Presti montre un NOMBRE de tickets, jamais un contenu ; l'Observatoire agrège par département.", _piege: PIEGE_NOM, presti: { tickets: ENV({ nombre: 3, contenu: `${PIEGE_NOM} a écrit : mon site ne marche plus`, de: 'jean.temoin@exemple.invalid' }) }, observatoire: { departements: [{ departement: '69', trouves: 40, contactes: 12, oui: 1, entreprise: `${PIEGE_NOM} Plomberie` }] }, repos: { agents: [{ nom: 'garde', depuis: null, motif: 'Pause posée par le Chef (essai)', prospect: PIEGE_NOM }] } }
  f['salles2-vingt.json'] = { _: "Les vingt salles et la réservée (clés de SALLES de lib/pilotage/equipage.ts) ; lot a : 026-188, lot b : 026-189.", salles: ['commandement', 'reunion', 'radar', 'redaction', 'envois', 'standard', 'atelier', 'usine', 'recettes', 'tresorerie', 'crieur', 'studio', 'experience', 'machines', 'chantier', 'audience', 'securite', 'presti', 'observatoire', 'repos'], reservee: 'ecommerce', lot_a: ['commandement'], lot_b: ['audience', 'securite', 'presti', 'observatoire', 'repos', 'ecommerce'] }
  return f
}
export const NOMS_JEUX = Object.keys(fabriquer())
export const jeux = (nom) => jeuE(nom)
