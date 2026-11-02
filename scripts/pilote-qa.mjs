#!/usr/bin/env node
// scripts/pilote-qa.mjs — juge du PILOTE AUTOMATIQUE (décision du fondateur du 21/10/2026 ; drapeau piloteAutomatique, offre
// Signature, capacité `assistant.pilote`, migration 0174). Gratuit : aucun réseau, aucune base, aucun envoi, aucun appel IA. Les
// règles et l'orchestrateur sont rejoués sur une FILE EN MÉMOIRE (même contrat que la table actions_auto : contrainte unique
// (artisan_id, cle), réclamation a_partir → en_cours atomique) ; le reste se lit dans les sources.
//
//  A. RÈGLES (lib/pilote/regles.ts) : offre Signature seulement, drapeau baissé = rien, réglage par type, prix non sourcé → manuel,
//     jamais d'argent, plafond du jour, délai de 10 min, ancienneté, clé d'idempotence.
//  B. ORCHESTRATEUR (lib/pilote/file.ts) : rien avant 10 min, départ à 10 min, annulation, deux passages simultanés = un envoi,
//     garde-fous relus juste avant l'envoi, pause de l'artisan, prise en main, issues inscrites.
//  C. SOURCES : branchements (assistant, réponses proposées, tic minute, décisions manuelles), routes gardées (404 drapeau baissé,
//     Signature, artisan_id = uid), chemin d'envoi PARTAGÉ avec l'interface, migration 0174 fermée (RLS sans politique).
//  D. LANCEUR : la suite est au tableau SUITES (gratuit).
//
// Usage : node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/pilote-qa.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.removeAllListeners('warning')
process.on('warning', (w) => { if (w.code !== 'MODULE_TYPELESS_PACKAGE_JSON' && w.name !== 'ExperimentalWarning') console.error(w) })
const rouges = []
let verts = 0
const T = (nom, cond, detail = '') => { if (cond) { verts++; console.log(`PASS ${nom}`) } else { rouges.push(nom); console.log(`FAIL ${nom}${detail ? ' — ' + String(detail).slice(0, 500) : ''}`) } }
const lire = (rel) => fs.readFileSync(path.join(RACINE, rel), 'utf8').replace(/\r\n/g, '\n')
const existe = (rel) => fs.existsSync(path.join(RACINE, rel))
const imp = (rel) => import(pathToFileURL(path.join(RACINE, rel)).href)
const sansCommentaires = (s) => s.replace(/^\s*\/\/.*$/gm, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1').replace(/\/\*[\s\S]*?\*\//g, '')

const { FLAGS } = await imp('lib/flags.ts')
const { peut, PLANS, GRILLE_COMPLETE, GRILLE } = await imp('lib/plans.ts')
const R = await imp('lib/pilote/regles.ts')
const { traiterFile } = await imp('lib/pilote/file.ts')
const MIN = 60_000
const T0 = new Date('2026-10-21T08:00:00Z')
const plus = (ms) => new Date(T0.getTime() + ms)

// ═══════════════════════ A. Règles ═══════════════════════
{
  T('A1 drapeau `piloteAutomatique` déclaré, commenté et daté (21/10/2026), avec l’ordre « 0174 puis lever » ; LEVÉ le 21/10 après 0174 appliquée et contrôlée', FLAGS.piloteAutomatique === true && /21\/10\/2026 — PILOTE AUTOMATIQUE[\s\S]{0,900}0174 appliquée[\s\S]{0,700}21\/10\/2026 — LEVÉ[\s\S]{0,300}piloteAutomatique: true/.test(lire('lib/flags.ts')) && /APPLIQUÉE le 21\/10\/2026/.test(lire('supabase/migrations/0174_pilote_automatique.sql').slice(0, 600)))
  T('A2 capacité `assistant.pilote` : Signature et Business seulement (ni Essai, ni Essentiel, ni Studio)',
    peut('signature', 'assistant.pilote') && peut('business', 'assistant.pilote') && !peut('studio', 'assistant.pilote') && !peut('essentiel', 'assistant.pilote') && !peut('gratuit', 'assistant.pilote') && !peut(null, 'assistant.pilote'))
  const ligne = GRILLE_COMPLETE.find((l) => l.capacites.includes('assistant.pilote'))
  T('A3 la grille l’annonce par UNE ligne sous drapeau (absente de la grille publique drapeau baissé), cellules calculées depuis PLANS',
    !!ligne && ligne.flag === 'piloteAutomatique' && ligne.cellules.signature === true && ligne.cellules.studio === false && (FLAGS.piloteAutomatique || !GRILLE.includes(ligne)))
  const reg = { actif: true, types: { envoi_devis: true, reponse_prospect: true, relance_devis: true, relance_impaye: true, envoi_facture: true, assistant_client: true } }
  const sources = [{ prix_unitaire_ht: 40, source_prix: 'tarif de l’artisan' }, { prix_unitaire_ht: 12.5, source_prix: 'prix donné par l’artisan' }, { prix_unitaire_ht: 8, source_prix: 'vos tarifs · Point P · 03/10' }]
  const base = { drapeau: true, plan: 'signature', reglages: reg, type: 'envoi_devis', outil: 'envoyer_devis', lignes: sources, partiesDepuis24h: 0 }
  const D = (p) => R.decisionPilote({ ...base, ...p })
  T('A4 tout est réuni (Signature, pilote et type actifs, prix sourcés, plafond libre) → automatique', D({}).auto === true)
  T('A5 drapeau baissé → rien (motif « drapeau »), même tout le reste réuni', D({ drapeau: false }).motif === 'drapeau')
  T('A6 offre Studio → refus « offre » ; Business (fondateur) → automatique', D({ plan: 'studio' }).motif === 'offre' && D({ plan: 'essentiel' }).motif === 'offre' && D({ plan: 'business' }).auto === true)
  T('A7 pilote coupé → « inactif » ; pilote actif mais type décoché → « type_inactif » (réglage PAR TYPE)', D({ reglages: { actif: false, types: reg.types } }).motif === 'inactif' && D({ reglages: { actif: true, types: { reponse_prospect: true } } }).motif === 'type_inactif' && D({ reglages: { actif: true, types: { reponse_prospect: true } }, type: 'reponse_prospect', outil: 'valider_reponse_proposee' }).auto === true)
  T('A8 PRIX NON SOURCÉ → validation manuelle : une ligne « estimation », « ordre de grandeur du marché », « à chiffrer », ou à 0 €, ou un devis sans ligne',
    ['estimation', 'ordre de grandeur du marché', 'à chiffrer'].every((s) => D({ lignes: [...sources, { prix_unitaire_ht: 50, source_prix: s }] }).motif === 'prix_non_source')
    && D({ lignes: [...sources, { prix_unitaire_ht: 0, source_prix: 'tarif de l’artisan' }] }).motif === 'prix_non_source' && D({ lignes: [] }).motif === 'prix_non_source' && D({ lignes: undefined }).motif === 'prix_non_source')
  T('A9 jamais d’argent : marquer_facture_payee, creer_facture (et sans devis, 02/11), rembourser, augmenter_tarifs, supprimer_* (et l’article, 02/11) → « jamais_auto », type introuvable',
    ['marquer_facture_payee', 'creer_facture', 'creer_facture_libre', 'rembourser', 'payer', 'augmenter_tarifs', 'supprimer_tarif', 'supprimer_devis_brouillon', 'supprimer_article'].every((o) => R.typePiloteDeOutil(o) === null && D({ outil: o }).motif === 'jamais_auto'))
  T('A10 liste FERMÉE des outils pilotables, chacun avec son type ; un outil client sans exécuteur serveur (relancer_commande, demander_avis, rappel d’entretien) reste manuel',
    R.typePiloteDeOutil('envoyer_devis') === 'envoi_devis' && R.typePiloteDeOutil('relancer_devis') === 'relance_devis' && R.typePiloteDeOutil('relancer_facture') === 'relance_impaye'
    && R.typePiloteDeOutil('envoyer_facture') === 'envoi_facture' && R.typePiloteDeOutil('valider_reponse_proposee') === 'reponse_prospect' && R.typePiloteDeOutil('repondre_client') === 'assistant_client'
    && ['relancer_commande', 'demander_avis', 'envoyer_rappel_entretien', 'creer_devis', 'cocher_tache', 'inconnu'].every((o) => R.typePiloteDeOutil(o) === null))
  T(`A11 plafond : ${R.PLAFOND_AUTO_JOUR} envois automatiques par jour et par compte ; le ${R.PLAFOND_AUTO_JOUR + 1}e reste manuel`, D({ partiesDepuis24h: R.PLAFOND_AUTO_JOUR - 1 }).auto === true && D({ partiesDepuis24h: R.PLAFOND_AUTO_JOUR }).motif === 'plafond')
  T('A12 délai d’annulation : 10 minutes, une seule écriture ; part_le = prete_le + 10 min', R.DELAI_ANNULATION_MIN === 10 && R.partLe(T0).getTime() - T0.getTime() === 10 * MIN)
  const l = { prete_le: T0.toISOString(), part_le: R.partLe(T0).toISOString() }
  T('A13 échéance : attendre à 9 min 59 s, partir à 10 min, trop ancienne après 24 h', R.etatEcheance(l, plus(10 * MIN - 1000)) === 'attendre' && R.etatEcheance(l, plus(10 * MIN)) === 'partir' && R.etatEcheance(l, plus(24 * 60 * MIN + 1000)) === 'trop_ancienne')
  T('A14 décompte lisible : « Partira dans 7 min », « Part maintenant »', R.texteDecompte(R.partLe(T0).toISOString(), plus(3 * MIN)) === 'Partira dans 7 min' && R.texteDecompte(R.partLe(T0).toISOString(), plus(10 * MIN)) === 'Part maintenant')
  T('A15 réglages nettoyés : seulement des booléens `true` sur des types connus ; tout le reste tombe', JSON.stringify(R.lireReglagesPilote({ actif: 'oui', types: { envoi_devis: true, payer: true, relance_devis: 'true', reponse_prospect: 1 } })) === JSON.stringify({ actif: false, types: { envoi_devis: true } }) && R.lireReglagesPilote(null).actif === false)
  T('A16 clé d’idempotence : « <source>:<objet> » — une carte et une proposition ne se confondent pas', R.cleIdempotence('carte', 'abc') === 'carte:abc' && R.cleIdempotence('proposition', 'abc') !== R.cleIdempotence('carte', 'abc'))
}

// ═══════════════════════ B. Orchestrateur, sur une file en mémoire ═══════════════════════
const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const ART = U(900), AUTRE = U(901)
function fileEnMemoire(opts = {}) {
  const lignes = new Map()
  const envois = []
  const reglages = { actif: true, types: { envoi_devis: true, reponse_prospect: true, relance_devis: true, relance_impaye: true, envoi_facture: true, assistant_client: true } }
  const etat = { drapeau: true, plan: 'signature', leads_pause: false, suspendu: false, reglages, parties: 0, lignesDevis: [{ prix_unitaire_ht: 40, source_prix: 'tarif de l’artisan' }], outil: 'envoyer_devis', contenuClientLu: false, conversation: 'ok', jetons: Infinity, issue: { ok: true, resume: 'parti' }, ...opts }
  let n = 0
  const deps = {
    drapeau: () => etat.drapeau,
    async mures(m, k) { return [...lignes.values()].filter((l) => l.statut === 'a_partir' && Date.parse(l.part_le) <= m.getTime()).sort((a, b) => a.part_le.localeCompare(b.part_le)).slice(0, k).map((l) => ({ ...l })) },
    async reclamer(l, m) {
      await new Promise((r) => setImmediate(r)) // une course réelle : l'autre passage peut s'intercaler ici
      const x = lignes.get(l.id); if (!x || x.statut !== 'a_partir' || Date.parse(x.part_le) > m.getTime()) return false
      x.statut = 'en_cours'; x.reclamee_le = m.toISOString(); return true
    },
    async reprendre(avant) { let k = 0; for (const x of lignes.values()) if (x.statut === 'en_cours' && x.reclamee_le && Date.parse(x.reclamee_le) < avant.getTime()) { x.statut = 'a_partir'; x.reclamee_le = null; k++ } return k },
    async terminer(l, statut, motif) { const x = lignes.get(l.id); if (x && x.statut === 'en_cours') { x.statut = statut; x.motif = motif } },
    async contexte(uid) { return { plan: etat.plan, leads_pause: etat.leads_pause, suspendu: etat.suspendu, reglages: etat.reglages, parties: etat.parties } },
    async lignesDevis() { return etat.lignesDevis },
    async carteDe() { return etat.outil ? { outil: etat.outil, contenuClientLu: etat.contenuClientLu } : null },
    async etatConversation() { return etat.conversation },
    async jeton() { if (etat.jetons <= 0) return false; etat.jetons--; return true },
    async executer(l) { envois.push(l.id); return etat.issue },
  }
  return {
    deps, etat, envois, lignes,
    /** Même contrat que la contrainte unique (artisan_id, cle) + upsert ignoreDuplicates : un second passage ne crée rien. */
    inserer(p) {
      const cle = R.cleIdempotence(p.source, p.ref_id)
      if ([...lignes.values()].some((l) => l.artisan_id === p.artisan_id && l.cle === cle)) return null
      const id = U(++n)
      lignes.set(id, { id, artisan_id: p.artisan_id, type: p.type, source: p.source, ref_id: p.ref_id, lead_id: p.lead_id ?? null, libelle: p.libelle, prete_le: T0.toISOString(), part_le: R.partLe(T0).toISOString(), statut: 'a_partir', motif: null, cle })
      return id
    },
    annuler(id, uid) { const x = lignes.get(id); if (!x || x.artisan_id !== uid || x.statut !== 'a_partir') return false; x.statut = 'annulee'; return true },
  }
}
const carte = (f, type = 'envoi_devis', ref = U(1)) => f.inserer({ artisan_id: ART, type, source: 'carte', ref_id: ref, libelle: 'Envoyer le devis DEV-2026-0011' })
{
  let f = fileEnMemoire()
  const id = carte(f)
  T('B1 idempotence à l’entrée : le même objet préparé deux fois n’entre qu’UNE fois dans la file', !!id && carte(f) === null && f.lignes.size === 1)
  let b = await traiterFile(f.deps, plus(9 * MIN + 59_000))
  T('B2 délai : rien ne part avant 10 minutes (9 min 59 s : aucune prise, aucun envoi)', b.prises === 0 && f.envois.length === 0 && f.lignes.get(id).statut === 'a_partir')
  b = await traiterFile(f.deps, plus(10 * MIN))
  T('B3 à 10 minutes : l’action part, une fois, et la file l’inscrit « partie »', b.parties === 1 && f.envois.length === 1 && f.lignes.get(id).statut === 'partie')
  b = await traiterFile(f.deps, plus(11 * MIN))
  T('B4 le passage suivant ne la refait pas (déjà partie)', b.prises === 0 && f.envois.length === 1)

  f = fileEnMemoire(); const id2 = carte(f)
  T('B5 annulation par l’artisan pendant le délai : elle ne part pas ; une seconde annulation, ou celle d’un autre compte, ne fait rien',
    f.annuler(id2, AUTRE) === false && f.annuler(id2, ART) === true && f.annuler(id2, ART) === false && (await traiterFile(f.deps, plus(20 * MIN))).prises === 0 && f.envois.length === 0)

  f = fileEnMemoire(); carte(f)
  const [x1, x2] = await Promise.all([traiterFile(f.deps, plus(10 * MIN)), traiterFile(f.deps, plus(10 * MIN))])
  T('B6 deux passages SIMULTANÉS (deux instances du tic) : un seul envoi — la réclamation atomique départage', f.envois.length === 1 && x1.prises + x2.prises === 1)

  f = fileEnMemoire({ drapeau: false }); carte(f)
  b = await traiterFile(f.deps, plus(60 * MIN))
  T('B7 drapeau baissé : le passage ne lit ni n’envoie rien (rien ne change)', b.prises === 0 && f.envois.length === 0 && [...f.lignes.values()][0].statut === 'a_partir')

  f = fileEnMemoire({ lignesDevis: [{ prix_unitaire_ht: 40, source_prix: 'tarif de l’artisan' }, { prix_unitaire_ht: 90, source_prix: 'estimation' }] }); carte(f)
  b = await traiterFile(f.deps, plus(10 * MIN))
  T('B8 PRIX NON SOURCÉ relu juste avant l’envoi : rien ne part, l’action repasse en validation manuelle avec le motif', b.manuel === 1 && f.envois.length === 0 && /prix estimé/.test([...f.lignes.values()][0].motif))

  f = fileEnMemoire({ parties: R.PLAFOND_AUTO_JOUR }); carte(f)
  b = await traiterFile(f.deps, plus(10 * MIN))
  T('B9 plafond du jour atteint : manuel, rien ne part', b.manuel === 1 && f.envois.length === 0)

  f = fileEnMemoire(); for (let i = 0; i < R.PLAFOND_AUTO_JOUR + 3; i++) carte(f, 'envoi_devis', U(100 + i))
  b = await traiterFile(f.deps, plus(10 * MIN), 50)
  T(`B10 plafond compté pendant le passage : ${R.PLAFOND_AUTO_JOUR} partent, les 3 suivantes restent à la main`, f.envois.length === R.PLAFOND_AUTO_JOUR && b.manuel === 3)

  f = fileEnMemoire(); carte(f); f.etat.reglages = { actif: false, types: {} }
  b = await traiterFile(f.deps, plus(10 * MIN))
  T('B11 pilote coupé entre-temps (désactivation immédiate) : l’action est annulée, rien ne part', b.annulees === 1 && f.envois.length === 0)

  f = fileEnMemoire({ plan: 'studio' }); carte(f)
  b = await traiterFile(f.deps, plus(10 * MIN))
  T('B12 offre redescendue en Studio : rien ne part (manuel, motif « offre »)', b.manuel === 1 && f.envois.length === 0 && /Signature/.test([...f.lignes.values()][0].motif))

  f = fileEnMemoire({ outil: 'marquer_facture_payee' }); carte(f, 'envoi_facture')
  b = await traiterFile(f.deps, plus(10 * MIN))
  T('B13 une carte d’ENCAISSEMENT glissée dans la file ne part jamais (outil hors liste) : manuel', b.manuel === 1 && f.envois.length === 0)

  f = fileEnMemoire({ outil: null }); carte(f)
  b = await traiterFile(f.deps, plus(10 * MIN))
  T('B14 carte déjà confirmée ou refusée à la main entre-temps : annulée dans la file, aucun second envoi', b.annulees === 1 && f.envois.length === 0)

  f = fileEnMemoire({ leads_pause: true }); f.inserer({ artisan_id: ART, type: 'reponse_prospect', source: 'proposition', ref_id: U(7), lead_id: U(8), libelle: 'Réponse à Mme Martin' })
  b = await traiterFile(f.deps, plus(10 * MIN))
  T('B15 PAUSE de l’artisan : la réponse ne part pas et reste en file (elle partira à la reprise)', f.envois.length === 0 && [...f.lignes.values()][0].statut === 'a_partir')
  f.etat.leads_pause = false
  b = await traiterFile(f.deps, plus(12 * MIN))
  T('B16 à la reprise, elle part (une fois)', f.envois.length === 1 && b.parties === 1)

  f = fileEnMemoire({ conversation: 'prise_en_main' }); f.inserer({ artisan_id: ART, type: 'reponse_prospect', source: 'proposition', ref_id: U(9), lead_id: U(8), libelle: 'Réponse' })
  b = await traiterFile(f.deps, plus(10 * MIN))
  T('B17 conversation reprise en main par l’artisan : la réponse est annulée', b.annulees === 1 && f.envois.length === 0)

  f = fileEnMemoire({ issue: { ok: false, deja: true, erreur: 'Proposition introuvable ou déjà traitée.' } }); carte(f)
  b = await traiterFile(f.deps, plus(10 * MIN))
  T('B18 déjà traitée au moment d’envoyer (validée à la main) : « annulee », pas « echec »', b.annulees === 1)
  f = fileEnMemoire({ issue: { ok: false, deja: false, erreur: 'Envoi impossible pour le moment.' } }); carte(f)
  b = await traiterFile(f.deps, plus(10 * MIN))
  T('B19 échec d’envoi : inscrit « echec » avec le motif, jamais laissé « en_cours »', b.echecs === 1 && [...f.lignes.values()][0].statut === 'echec' && /Envoi impossible/.test([...f.lignes.values()][0].motif))

  f = fileEnMemoire(); carte(f)
  b = await traiterFile(f.deps, plus(25 * 60 * MIN))
  T('B20 restée plus de 24 h en file (pause générale prolongée) : repasse en manuel, ne part pas', b.manuel === 1 && f.envois.length === 0)
}

// ═══════════════════════ B'. Audit offensif du 21/10 : un test par constat, qui rougit sur l'ancien comportement ═══════════════════════
{
  // E1 — une provenance VIDE n'est pas « saisie par l'artisan » (l'éditeur la perdait) : manuel.
  T('E1a règle : une ligne SANS provenance (éditeur de devis d’avant le correctif) n’est PAS sourcée → validation manuelle',
    R.ligneSourcee({ prix_unitaire_ht: 30, source_prix: null }) === false && R.ligneSourcee({ prix_unitaire_ht: 30, source_prix: '' }) === false && R.prixSources([{ prix_unitaire_ht: 40, source_prix: 'tarif de l’artisan' }, { prix_unitaire_ht: 30, source_prix: null }]) === false)
  const ed = lire('app/devis/[id]/page.tsx')
  T('E1b l’éditeur de devis GARDE la provenance : lue en base, gardée depuis le chiffrage IA (« estimation » par défaut), renvoyée à l’enregistrement, et un prix tapé devient « prix donné par l’artisan »',
    /source_prix\?: string \}/.test(ed) && /typeof l\.source_prix === 'string' && l\.source_prix \? \{ source_prix: l\.source_prix \} : \{\}\) \}\)\)\)/.test(ed)
    && /source_prix: typeof l\.source_prix === 'string' && l\.source_prix \? l\.source_prix : 'estimation'/.test(ed) && /tva_taux: l\.tva_taux, \.\.\.\(l\.source_prix \? \{ source_prix: l\.source_prix \} : \{\}\) \}\)\)/.test(ed)
    && /setLigne\(l\.key, \{ prix_unitaire_ht: e\.target\.value, source_prix: SOURCE_ARTISAN \}\)/.test(ed) && R.ligneSourcee({ prix_unitaire_ht: 5, source_prix: 'prix donné par l’artisan' }))
  const exeE1 = sansCommentaires(lire('lib/pilote/executeur.ts'))
  T('E1c au départ, le pilote applique LA même règle (prixSources), plus de test « provenance vide = ok » recopié', /if \(!lignes \|\| !prixSources\(lignes\)\)/.test(exeE1) && !/!txt\(l\.source_prix\) \|\|/.test(exeE1))

  // E2 — la réponse pilotée : anonyme + mention IA ; limite et horaires rejoués ; artisan prévenu par push seul.
  const envS = sansCommentaires(lire('lib/envoisServeur.ts'))
  T('E2a envoi automatique au prospect : mention de l’assistant IA (art. 50) et `anonyme: true` (3/jour/destinataire, part anonyme du plafond)',
    /const corps = o\.automatique \? avecMentionAssistant\(signe,/.test(envS) && /\.\.\.\(o\.automatique \? \{ anonyme: true \} : \{\}\)/.test(envS)
    && /validerPropositionServeur\(l\.artisan_id, lead, l\.ref_id, null, \{ automatique: true \}\)/.test(exeE1) && /repondreServeur\(uid, lead, String\(e\.texte \?\? ''\), \{ automatique: true \}\)/.test(exeE1) && /validerPropositionServeur\(uid, lead, String\(e\.message_id\), null, \{ automatique: true \}\)/.test(exeE1))
  T('E2b envoi automatique : l’e-mail part AVANT que le message soit marqué envoyé ; refusé (plafond), la proposition reste à valider (502)',
    envS.indexOf('if (o.automatique && parEmail) {') < envS.indexOf("await supabaseAdmin.from('messages').update({ etat: null") && /if \(!emailed\) return rep\(502/.test(envS))
  let f = fileEnMemoire({ conversation: 'limite' }); f.inserer({ artisan_id: ART, type: 'reponse_prospect', source: 'proposition', ref_id: U(31), lead_id: U(8), libelle: 'Réponse' })
  let b = await traiterFile(f.deps, plus(10 * MIN))
  T('E2c limite de réponses de l’IA atteinte dans la conversation (Ma plateforme) : la réponse ne part pas, elle repasse en manuel', b.manuel === 1 && f.envois.length === 0 && /Limite de réponses/.test([...f.lignes.values()][0].motif))
  f = fileEnMemoire({ conversation: 'horaire' }); f.inserer({ artisan_id: ART, type: 'reponse_prospect', source: 'proposition', ref_id: U(32), lead_id: U(8), libelle: 'Réponse' })
  b = await traiterFile(f.deps, plus(10 * MIN))
  T('E2d hors plage horaire de Ma plateforme : rien ne part, la réponse attend en file', f.envois.length === 0 && [...f.lignes.values()][0].statut === 'a_partir')
  const exeConv = exeE1.slice(exeE1.indexOf('async etatConversation('), exeE1.indexOf('jeton: (uid)'))
  // 02/11 (contre-audit 032-004, D3) : lue par getPlateformeConfigStrict — une lecture en erreur lève au lieu de rendre les défauts.
  T('E2e la limite et la plage sont lues dans la config de l’artisan (getPlateformeConfigStrict, limite_messages, dansLaPlage), réponses envoyées de l’IA comptées', /getPlateformeConfigStrict\(l\.artisan_id\)/.test(exeConv) && /cfg\.limite_messages/.test(exeConv) && /dansLaPlage\(cfg, maintenant\)/.test(exeConv) && /\.eq\('type', 'reponse_auto'\)\.is\('etat', null\)/.test(exeConv))
  const srvE2 = sansCommentaires(lire('lib/pilote/serveur.ts'))
  T('E2f l’artisan est prévenu par PUSH seul : aucun e-mail par action (le quota global des e-mails n’est plus consommé)', /async function prevenir\(uid: string, libelle: string, type: TypePilote\)/.test(srvE2) && !/sendEmail/.test(srvE2) && /envoyerPushArtisan\(uid,/.test(srvE2))

  // M1 — compte suspendu.
  f = fileEnMemoire({ suspendu: true }); carte(f)
  b = await traiterFile(f.deps, plus(10 * MIN))
  T('M1a compte SUSPENDU : rien ne part, l’action repasse en manuel', b.manuel === 1 && f.envois.length === 0 && /suspendu/.test([...f.lignes.values()][0].motif))
  T('M1b le contexte réel lit la suspension (suspensionEnCours ; erreur de lecture = suspendu)', /suspendu: await suspensionEnCours\(uid\)\.then\(\(x\) => !!x, \(\) => true\)/.test(exeE1))

  // M2 — budget de temps, reprise des « en_cours », plafond par jeton atomique.
  f = fileEnMemoire(); for (let i = 0; i < 5; i++) carte(f, 'envoi_devis', U(200 + i))
  let t = 0
  b = await traiterFile(f.deps, plus(10 * MIN), 50, 1000, () => (t += 400))
  T('M2a BUDGET de temps : passé le budget, les lignes restantes ne sont pas réclamées (rien ne reste « en_cours »), elles attendent le passage suivant',
    b.reportees > 0 && f.envois.length < 5 && ![...f.lignes.values()].some((l) => l.statut === 'en_cours') && [...f.lignes.values()].filter((l) => l.statut === 'a_partir').length === b.reportees)
  f = fileEnMemoire(); const coincee = carte(f); f.lignes.get(coincee).statut = 'en_cours'; f.lignes.get(coincee).reclamee_le = plus(4 * MIN).toISOString()
  b = await traiterFile(f.deps, plus(10 * MIN))
  T('M2b une ligne restée « en_cours » plus de 5 minutes (passage interrompu) est REPRISE et part', b.reprises === 1 && f.envois.length === 1)
  f = fileEnMemoire(); const recente = carte(f); f.lignes.get(recente).statut = 'en_cours'; f.lignes.get(recente).reclamee_le = plus(8 * MIN).toISOString()
  b = await traiterFile(f.deps, plus(10 * MIN))
  T('M2c une ligne « en_cours » depuis moins de 5 minutes n’est pas reprise (un autre passage la traite)', b.reprises === 0 && f.envois.length === 0)
  f = fileEnMemoire({ jetons: 2 }); for (let i = 0; i < 4; i++) carte(f, 'envoi_devis', U(300 + i))
  b = await traiterFile(f.deps, plus(10 * MIN), 50)
  T('M2d plafond tenu par le JETON atomique du compte (entre passages et instances) : jetons épuisés → manuel', f.envois.length === 2 && b.manuel === 2)
  T('M2e jeton réel : consommerLimiteStricte(`pilote:<uid>`, 20, 86400), fail-closed ; réclamation datée (traite_le) pour la reprise',
    /consommerLimiteStricte\(`pilote:\$\{uid\}`, PLAFOND_AUTO_JOUR, 86_400\)/.test(srvE2) && /update\(\{ statut: 'en_cours', traite_le: maintenant\.toISOString\(\) \}\)/.test(exeE1) && /\.eq\('statut', 'en_cours'\)\.lt\('traite_le', avant\.toISOString\(\)\)/.test(exeE1)
    && /const reste = \(\) => Math\.max\(0, 25_000/.test(lire('app/api/agents/tic/route.ts')))

  // M3 — la réclamation d'envoi d'une proposition est rendue si l'envoi échoue.
  const blocVal = envS.slice(envS.indexOf('export async function validerPropositionServeur'), envS.indexOf('export async function repondreServeur'))
  T('M3 validation manuelle : un envoi qui ÉCHOUE (canal refusé, e-mail refusé, erreur) rend la réclamation (libererLimite dans finally) — plus de 409 pendant des heures',
    /let envoyee = false\s*try \{/.test(blocVal) && /\} finally \{\s*if \(!envoyee\) await libererLimite\(cle\)/.test(blocVal) && blocVal.indexOf('envoyee = true') > blocVal.indexOf("update({ etat: null") && /export async function libererLimite\(cle: string\)/.test(lire('lib/limites.ts')))

  // M4 — injection indirecte : carte marquée → jamais pilotée ; réglages publics → carte.
  f = fileEnMemoire({ outil: 'repondre_client', contenuClientLu: true }); carte(f, 'assistant_client')
  b = await traiterFile(f.deps, plus(10 * MIN))
  T('M4a une carte née d’une conversation où l’assistant a LU des messages de tiers ne part JAMAIS seule (manuel)', b.manuel === 1 && f.envois.length === 0 && /tiers/.test([...f.lignes.values()][0].motif))
  const act = sansCommentaires(lire('lib/assistant/actions-serveur.ts'))
  T('M4b la marque est posée à la création de la carte, d’après le JOURNAL de la conversation (outils qui rendent du texte de tiers), sous la RLS ; erreur = marquée',
    /const lu = typePiloteDeOutil\(nom\) \? await contenuTiersLu\(\) : false/.test(act) && /entrees: lu \? \{ \.\.\.p\.entrees, \[MARQUE_CONTENU_TIERS\]: true \} : p\.entrees/.test(act)
    && /session\.from\('assistant_journal'\)\.select\('id'\)\.eq\('artisan_id', ctx\.uid\)\.eq\('conversation_id', ctx\.conversationId\)\.in\('outil', \[\.\.\.OUTILS_CONTENU_TIERS\]\)/.test(act) && /return !!error \|\|/.test(act)
    && ['lire_conversations', 'lire_fil', 'preparer_reponse', 'lire_ou_j_en_suis'].every((o) => R.OUTILS_CONTENU_TIERS.includes(o)))
  T('M4c à la mise en file comme au départ, une carte marquée est refusée', /if \(fiche\.entrees\?\.\[MARQUE_CONTENU_TIERS\] === true\) return null/.test(srvE2) && /contenuClientLu: f\.entrees\?\.\[MARQUE_CONTENU_TIERS\] === true/.test(exeE1))
  const { categorieDe } = await imp('lib/assistant/outils-actions.ts')
  T('M4d lever la pause, changer le message d’accueil, réécrire « Ma page » : CARTE à confirmer (regler_plateforme, modifier_ma_page), plus d’exécution directe', categorieDe('regler_plateforme') === 'confirmation' && categorieDe('modifier_ma_page') === 'confirmation' && R.typePiloteDeOutil('regler_plateforme') === null && R.typePiloteDeOutil('modifier_ma_page') === null)

  // F1 — rétrogradation.
  T('F1a changement d’offre hors Signature : la file est annulée (webhook de résiliation ET alignement sur l’abonnement)',
    /apresChangementOffre\(uid, 'gratuit'\)/.test(lire('app/api/stripe/webhook/route.ts')) && /apresChangementOffre\(a\.id, plan\)/.test(lire('lib/abonnementSync.ts')) && /if \(!actif\('piloteAutomatique'\) \|\| peut\(plan, 'assistant\.pilote'\)\) return 0\s*return await annulerTout\(uid, /.test(srvE2))
  const gardeF1 = lire('app/api/pilote/garde.ts'), fileR = lire('app/api/pilote/file/route.ts'), regR = lire('app/api/pilote/reglages/route.ts')
  T('F1b rétrogradé : il VOIT sa file et l’ANNULE (GET/POST file sans exiger l’offre), peut COUPER le pilote mais jamais l’activer',
    /export async function GET\(req: Request\) \{\n  const g = await gardePilote\(req, \{ exigerSignature: false \}\)/.test(fileR) && /export async function POST\(req: Request\) \{\n  const g = await gardePilote\(req, \{ exigerSignature: false \}\)/.test(fileR)
    && /if \(!g\.signature && \(voulus\.actif \|\| Object\.values\(voulus\.types\)\.some\(Boolean\)\)\) return NextResponse\.json\(\{ error: messageVerrou\('assistant\.pilote'\), code: 'offre' \}, \{ status: 403 \}\)/.test(regR)
    && /if \(o\.exigerSignature !== false && !signature\)/.test(gardeF1))
  // F2 — fondateur.
  T('F2 mise en file : un fondateur compte comme Business (comme au départ)', /plan: data\?\.is_founder \? 'business'/.test(srvE2) && /select\('plan, is_founder, email, leads_pause'\)/.test(srvE2))
  // F3 — facture.
  const pdf = sansCommentaires(lire('lib/envoisPdfServeur.ts'))
  T('F3 envoi de facture (route ET pilote) : 20 par jour et par compte (fail-closed), la même facture pas deux fois en 10 min, réclamation rendue si l’envoi échoue',
    /consommerLimiteStricte\(`envoi-facture:\$\{uid\}`, ENVOIS_FACTURES_JOUR, 86_400\)/.test(pdf) && /ENVOIS_FACTURES_JOUR = 20/.test(pdf) && /consommerLimiteStricte\(cle, 1, 600\)/.test(pdf) && /finally \{ if \(!r \|\| r\.status !== 200\) await libererLimite\(cle\) \}/.test(pdf)
    && pdf.indexOf('export async function envoyerFactureServeur') < pdf.indexOf('async function envoyerFactureUneFois'))
}

// ═══════════════════════ B bis. Contre-audit 032-035 corrigé (tâche 032-036) : hors pilote (E1) et conversations du client (E2) ═══════════════════════
{
  // Le MUTANT : une copie de lib/pilote/file.ts hors du dépôt, une ligne retirée, l'import relatif repointé vers le vrai fichier.
  const os = await import('node:os')
  const TMPB = fs.mkdtempSync(path.join(os.tmpdir(), 'presti-pilote-qa-'))
  let nB = 0
  const fileMutant = async (avant, apres) => {
    let code = lire('lib/pilote/file.ts')
    if (!code.includes(avant)) throw new Error(`mutant de file.ts : motif introuvable « ${avant.slice(0, 80)} »`)
    code = code.replace(avant, apres).replace(/from '\.\/regles'/g, `from '${pathToFileURL(path.join(RACINE, 'lib/pilote/regles.ts')).href}'`)
    const f = path.join(TMPB, `file-mutant-${++nB}.ts`)
    fs.writeFileSync(f, code)
    return (await import(pathToFileURL(f).href)).traiterFile
  }
  /** Une carte de relance de devis en file, que carteDe décrit comme on le lui demande ; `escalade` : les conversations sensibles. */
  const relance = (carteDe, sensibles = [], leve = null) => {
    const f = fileEnMemoire()
    f.deps.carteDe = async () => carteDe
    f.deps.escalade = async (_l, leadId) => { if (leve && leadId === leve) throw new Error('conversation illisible'); return sensibles.includes(leadId) }
    const id = carte(f, 'relance_devis')
    return { f, id }
  }
  const HP = 'Le message vise plusieurs clients (ou tout le monde) : chaque relance attend le clic de l’artisan.'
  {
    const { f, id } = relance({ outil: 'relancer_devis', contenuClientLu: false, horsPilote: HP, leadId: U(51), leadsClient: [U(51)] })
    await traiterFile(f.deps, plus(10 * MIN))
    T('B30 E1 : une carte HORS PILOTE (ordre sur plusieurs clients, escalade…) revient à la main au départ, son motif inscrit dans la file ; rien ne part',
      f.envois.length === 0 && f.lignes.get(id).statut === 'manuel' && f.lignes.get(id).motif === HP, JSON.stringify(f.lignes.get(id)))
    const mut = relance({ outil: 'relancer_devis', contenuClientLu: false, horsPilote: HP, leadId: U(51), leadsClient: [U(51)] })
    await (await fileMutant("        if (carte.horsPilote) { await fin('manuel', carte.horsPilote.slice(0, 300)); continue }\n", ''))(mut.f.deps, plus(10 * MIN))
    T('B31 MUTANT (la marque non relue au départ) : le juge VOIT la brèche — la carte hors pilote part', mut.f.envois.length === 1 && mut.f.lignes.get(mut.id).statut === 'partie')
  }
  {
    // E2 : la conversation du devis est propre ; le client écrit « litige » dans une AUTRE conversation (même e-mail).
    const { f, id } = relance({ outil: 'relancer_devis', contenuClientLu: false, horsPilote: null, leadId: U(51), leadsClient: [U(51), U(52)] }, [U(52)])
    await traiterFile(f.deps, plus(10 * MIN))
    T('B32 E2 : une autre conversation du même client parle d’un sujet sensible : la relance revient à la main (escalade), rien ne part',
      f.envois.length === 0 && f.lignes.get(id).statut === 'manuel' && f.lignes.get(id).motif === R.LIBELLE_MOTIF.escalade, JSON.stringify(f.lignes.get(id)))
    const mut = relance({ outil: 'relancer_devis', contenuClientLu: false, horsPilote: null, leadId: U(51), leadsClient: [U(51), U(52)] }, [U(52)])
    await (await fileMutant('      for (const autre of leadsCarte) if (autre !== leadId && d.escalade && (await d.escalade(l, autre, maintenant))) { autreSensible = true; break }\n', ''))(mut.f.deps, plus(10 * MIN))
    T('B33 MUTANT (seule la conversation du devis relue) : le juge VOIT la brèche — la relance part chez le client en litige', mut.f.envois.length === 1)
    const lv = relance({ outil: 'relancer_devis', contenuClientLu: false, horsPilote: null, leadId: U(51), leadsClient: [U(51), U(52)] }, [], U(52))
    await traiterFile(lv.f.deps, plus(10 * MIN))
    T('B34 E2 : une autre conversation du client illisible au départ : la ligne passe en échec, rien ne part', lv.f.envois.length === 0 && lv.f.lignes.get(lv.id).statut === 'echec', JSON.stringify(lv.f.lignes.get(lv.id)))
    const ok2 = relance({ outil: 'relancer_devis', contenuClientLu: false, horsPilote: null, leadId: U(51), leadsClient: [U(51), U(52)] }, [])
    await traiterFile(ok2.f.deps, plus(10 * MIN))
    T('B35 témoin : toutes les conversations du client sont propres — la relance part, une fois', ok2.f.envois.length === 1 && ok2.f.lignes.get(ok2.id).statut === 'partie')
  }
  {
    const srv = sansCommentaires(lire('lib/pilote/serveur.ts'))
    const exe = sansCommentaires(lire('lib/pilote/executeur.ts'))
    T('B36 E1/E2 (sources) : piloterCarte refuse la marque hors pilote d’entrée ; carteDe la rend avec l’ordre découpé et toutes les conversations du client ; chaque réalisateur la refuse',
      /if \(motifHorsPilote\(fiche\.entrees\) !== null\) return null/.test(srv) && srv.indexOf('motifHorsPilote(fiche.entrees)') < srv.indexOf('const type = typePiloteDeOutil(fiche.outil)')
      && /const horsPilote = motifHorsPilote\(f\.entrees\) \?\? await ordreDecoupe\(l\.artisan_id, f\)/.test(exe) && /leadsClient: leads/.test(exe)
      && /R\[k\] = async \(e\) => \{ const motif = motifHorsPilote\(e\); return motif \? ko2\(motif\) : realiser\(e\) \}/.test(exe))
  }
}

// ═══════════════════════ C. Sources ═══════════════════════
{
  const srv = sansCommentaires(lire('lib/pilote/serveur.ts'))
  const exe = sansCommentaires(lire('lib/pilote/executeur.ts'))
  const tic = lire('app/api/agents/tic/route.ts')
  const act = sansCommentaires(lire('lib/assistant/actions-serveur.ts'))
  T('C1 l’assistant : chaque carte « à confirmer » passe par piloterCarte APRÈS sa création (rien ne change si le pilote ne la prend pas) — sauf une carte HORS PILOTE (ordre groupé, escalade : contre-audit 032-035), jamais présentée',
    /const fiche = await ctx\.magasin\.creer\(\{[\s\S]{0,600}statut: 'en_attente'[\s\S]{0,400}const auto = horsPilote \? null : await \(dep\.piloterCarte \?\? piloterCarte\)\(ctx\.uid, fiche\)/.test(act))
  T('C2 les réponses proposées (/api/leads et /api/conversation/stream) passent par piloterProposition, après l’insertion de la proposition',
    /etat: 'proposition'[\s\S]{0,300}\.select\('id'\)[\s\S]{0,600}piloterProposition\(artisan\.id/.test(lire('app/api/leads/route.ts')) && /etat: 'proposition'[\s\S]{0,200}\.select\('id'\)[\s\S]{0,500}piloterProposition\(artisan\.id/.test(lire('app/api/conversation/stream/route.ts')))
  T('C3 le tic minute fait partir la file — seulement drapeau levé et HORS pause générale (pause illisible = active)',
    /if \(!actif\('piloteAutomatique'\)\) etapes\.pilote = \{ statut: 'saute'/.test(tic) && /else if \(pause\) etapes\.pilote = \{ statut: 'saute'/.test(tic) && /traiterFile\(dependancesSupabase\(\)\)/.test(tic) && /let pause = true/.test(tic))
  T('C4 une décision manuelle sort l’objet de la file : valider / écarter une proposition (/api/messages), confirmer / refuser une carte (/api/assistant/actions)',
    (lire('app/api/messages/route.ts').match(/annulerParRef\(uid, 'proposition'/g) ?? []).length === 2 && /annulerParRef\(g\.uid, 'carte', id/.test(lire('app/api/assistant/actions/route.ts')))
  T('C5 piloterCarte et piloterProposition ne lèvent jamais et ne font RIEN drapeau baissé (première instruction)',
    /export async function piloterCarte[\s\S]{0,200}try \{\s*if \(!actif\('piloteAutomatique'\)\) return null/.test(srv) && /export async function piloterProposition[\s\S]{0,200}try \{\s*if \(!actif\('piloteAutomatique'\)\) return null/.test(srv))
  const S = await imp('lib/pilote/serveur.ts')
  T('C6 drapeau baissé, en vrai : piloterCarte et piloterProposition rendent null sans toucher la base', FLAGS.piloteAutomatique || ((await S.piloterCarte(ART, { id: U(1), artisan_id: ART, outil: 'envoyer_devis', titre: 't', entrees: {}, mode: 'confirmation', statut: 'en_attente' })) === null && (await S.piloterProposition(ART, { leadId: U(2), messageId: U(3) })) === null))
  // Une instruction = la ligne de `supabaseAdmin.from(` et ses lignes de continuation (celles qui commencent par « . »).
  const instruction = (src, i) => { const l = src.slice(i).split('\n'); let t = l[0]; for (let k = 1; k < l.length && /^\s*\./.test(l[k]); k++) t += l[k].trim(); return t }
  const appelsSrv = [...srv.matchAll(/supabaseAdmin\.from\((FILE|REGLAGES|'[a-z_]+')\)/g)].map((m) => instruction(srv, m.index))
  const sansFiltre = appelsSrv.filter((a) => !/\.eq\('artisan_id', (uid|l\.artisan_id)\)|\.eq\('id', (uid|p\.leadId)\)|\.eq\('lead_id', lead\.id\)|\.eq\('devis_id', d\.id\)|\.select\('id'\)\.limit\(1\)|^supabaseAdmin\.from\(FILE\)\.upsert\(ligne,|^supabaseAdmin\.from\(REGLAGES\)\.upsert\(\{ artisan_id: uid,/.test(a))
  T('C7b la ligne insérée en file porte le compte de la session : `artisan_id: uid`', /const ligne = \{\s*artisan_id: uid,/.test(srv))
  T('C7 file et réglages : chaque requête porte artisan_id = uid (ou la propriété vérifiée de la conversation / du devis)', appelsSrv.length >= 10 && sansFiltre.length === 0, sansFiltre.join(' | '))
  T('C8 l’entrée en file est idempotente en base : upsert « ignoreDuplicates » sur (artisan_id, cle), contrainte unique dans 0174',
    /upsert\(ligne, \{ onConflict: 'artisan_id,cle', ignoreDuplicates: true \}\)/.test(srv) && /constraint actions_auto_cle_unique unique \(artisan_id, cle\)/.test(lire('supabase/migrations/0174_pilote_automatique.sql')))
  T('C9 la réclamation de départ est atomique (UPDATE … WHERE statut = a_partir) et filtrée par compte',
    /reclamer\(l, maintenant\) \{[\s\S]{0,300}update\(\{ statut: 'en_cours', traite_le: maintenant\.toISOString\(\) \}\)[\s\S]{0,120}\.eq\('id', l\.id\)\.eq\('artisan_id', l\.artisan_id\)\.eq\('statut', 'a_partir'\)/.test(exe))
  const realis = exe.slice(exe.indexOf('export function realisateursPilote'), exe.indexOf('export function dependancesSupabase'))
  const noms = [...realis.matchAll(/R\.([a-z_]+) = async/g)].map((m) => m[1])
  T('C10 réalisateurs du pilote : EXACTEMENT les outils pilotables, aucun outil d’argent (encaisser, facturer, rembourser)',
    JSON.stringify(noms.slice().sort()) === JSON.stringify([...R.OUTILS_EXECUTABLES_PILOTE].sort()) && !/marquer_facture_payee|creer_facture|rembourser|factureMaj|statut: 'payee'/.test(realis), noms.join(','))
  T('C11 une carte de l’assistant part par confirmerAction (même réclamation de la carte, même journal, même lecteur « ne plus relancer » que l’assistant : E9) ; une proposition par validerPropositionServeur',
    /confirmerAction\(\{[\s\S]{0,300}realisateurs: realisateursPilote\(l\.artisan_id, fiche\.cree_le, exclusionsRelanceParDefaut\)/.test(exe) && /validerPropositionServeur\(l\.artisan_id, lead, l\.ref_id, null, \{ automatique: true \}\)/.test(exe))
  const env = sansCommentaires(lire('lib/envoisServeur.ts') + lire('lib/envoisPdfServeur.ts'))
  T('C12 UN chemin d’envoi : la route Devis « Envoyer » et Messages (valider, répondre) appellent les mêmes fonctions que le pilote',
    /envoyerDevisServeur\(userData\.user\.id, id\)/.test(lire('app/api/devis/[id]/envoyer/route.ts')) && /validerPropositionServeur\(uid, lead/.test(lire('app/api/messages/route.ts')) && /repondreServeur\(uid, lead, contenu\)/.test(lire('app/api/messages/route.ts'))
    && /envoyerDevisServeur\(uid, d\.id\)/.test(exe) && /envoyerFactureServeur\(uid, f\.id\)/.test(exe))
  T('C13 idempotence d’une réponse proposée : l’envoi est réclamé une fois (compteur strict, fail-closed) avant de partir — clic de l’artisan ou pilote, jamais deux',
    /const cleReclamation = \(messageId: string\) => `envoi-proposition:\$\{messageId\}`/.test(env) && /if \(!\(await consommerLimiteStricte\(cle, 1, RECLAMATION_S\)\)\) return rep\(409/.test(env) && env.indexOf('consommerLimiteStricte(cle, 1, RECLAMATION_S)') < env.indexOf('envoyerReponseCanal(await completerLeadCanal(lead), texte)'))
  T('C14 mêmes garde-fous que l’interface : mentions légales bloquantes (devis ET facture), devis accepté non renvoyé, facture non émise / avoir refusés',
    (env.match(/mentionsManquantesEmission\(versArtisanLegal\(artisan\)\)/g) ?? []).length === 2 && /statut === 'accepte'\) return rep\(409/.test(env) && /facture\.avoir_de\) return rep\(409/.test(env) && /statut !== 'emise' && facture\.statut !== 'payee'\) return rep\(409/.test(env))
  T('C15 devis : le prix est revérifié AU DÉPART (pas seulement à la mise en file), et un devis envoyé à la main depuis la préparation ne repart pas',
    /R\.envoyer_devis = async[\s\S]{0,900}prix non sourcé[\s\S]{0,400}envoyerDevisServeur/.test(realis) && /Date\.parse\(d\.envoye_le\) >= Date\.parse\(carteCreeLe\)/.test(realis))
  // 21/10/2026 (canaux-reseaux) : Telegram devient pilotable (l'API du bot envoie pour de vrai) ; tout le reste reste manuel — la règle vit
  // dans lib/canaux/regles.ts (piloteInterdit), lue à la mise en file, au départ ET au point d'envoi commun (lib/envoisServeur.ts).
  const RC = await imp('lib/canaux/regles.ts')
  const envC16 = sansCommentaires(lire('lib/envoisServeur.ts'))
  T('C16 messageries jamais en pilote (WhatsApp, Messenger, Instagram, Le Bon Coin, réseaux lus par notification, demande importée) — sauf Telegram : à la mise en file, au départ et au point d’envoi commun',
    /if \(piloteInterdit\(lead\.canal\)\) return null/.test(srv) && /piloteInterdit\(lead\.canal\)\) return ko\(/.test(exe)
    && /const refusAutomatique = [\s\S]{0,120}o\.automatique && piloteInterdit\(lead\.canal\)/.test(envC16) && (envC16.match(/const refus = refusAutomatique\(lead, o\)\n\s*if \(refus\) return refus/g) ?? []).length === 2
    && ['whatsapp', 'messenger', 'instagram', 'leboncoin', 'linkedin', 'facebook', 'tiktok', 'import'].every((c) => RC.piloteInterdit(c) === true)
    && RC.piloteInterdit('telegram') === false && RC.piloteInterdit('formulaire') === false && RC.piloteInterdit('email') === false && RC.piloteInterdit(null) === false)
  for (const r of ['app/api/pilote/file/route.ts', 'app/api/pilote/reglages/route.ts']) {
    const s = lire(r)
    const handlers = [...s.matchAll(/export async function (GET|POST|PUT|PATCH|DELETE)\(([^)]*)\)/g)]
    const gardes = handlers.filter((h) => h[2].includes('req')).every((h) => new RegExp(`export async function ${h[1]}\\(req: Request\\) \\{\\n  const g = await gardePilote\\(req(, \\{ exigerSignature: false \\})?\\)\\n  if \\('reponse' in g\\) return g\\.reponse`).test(s))
    T(`C17 ${r} : chaque méthode servie commence par gardePilote (404 drapeau baissé, session, offre lue — Signature exigée pour activer, pas pour voir ou annuler —, 503 sans 0174)`, gardes && handlers.length >= 4)
  }
  const gardeTout = lire('app/api/pilote/garde.ts')
  const garde = gardeTout.slice(gardeTout.indexOf('export async function gardePilote'))
  T('C18 la garde : drapeau AVANT toute lecture, puis la session (authArtisan), puis l’offre (capacité assistant.pilote, fondateur = Business), puis les tables', garde.indexOf("actif('piloteAutomatique')") < garde.indexOf('authArtisan(req)') && garde.indexOf('authArtisan(req)') < garde.indexOf("peut(plan, 'assistant.pilote')") && /data\?\.is_founder \? 'business'/.test(garde) && garde.indexOf("peut(plan, 'assistant.pilote')") < garde.indexOf('piloteDisponible'))
  T('C19 désactivation immédiate : couper le pilote annule toute la file, décocher un type annule ce type (écrireReglages)', /if \(!propres\.actif\) annulees = await annulerTout\(uid/.test(srv) && /annulerType\(uid, t,/.test(srv))
  T('C20 l’artisan est prévenu à la mise en file : push qui ouvre Paramètres → Pilote automatique (« Annuler ») ; la file est aussi au poste des assistants', /envoyerPushArtisan\(uid,/.test(srv) && /onglet=pilote/.test(srv) && /Touchez pour annuler/.test(lire('lib/pilote/serveur.ts')))
  const sp = lire('app/parametres/SectionPilote.tsx')
  T('C21 l’écran : réglage PAR TYPE, liste « Partira dans … » avec bouton Annuler, journal, garde-fous écrits, verrou hors Signature vers /abonnement',
    /TYPES_PILOTE\.map/.test(sp) && /texteDecompte\(l\.part_le, maintenant\)/.test(sp) && /decision: 'annuler'/.test(sp) && /<h3>Journal<\/h3>/.test(sp) && /href="\/abonnement"/.test(sp) && /actif\('piloteAutomatique'\) \? \[\{ id: 'pilote'/.test(lire('app/parametres/page.tsx')))
  const mig = lire('supabase/migrations/0174_pilote_automatique.sql')
  T('C22 migration 0174 : trois tables, RLS active SANS politique, aucun droit anon/authenticated, déclencheurs de propriété, statut APPLIQUÉE (daté) en tête',
    /APPLIQUÉE le 21\/10\/2026/.test(mig.slice(0, 400)) && ['pilote_reglages', 'actions_auto', 'chantier_pointage'].every((t) => mig.includes(`alter table public.${t} enable row level security;`) && mig.includes(`revoke all on public.${t} from anon;`) && mig.includes(`revoke all on public.${t} from authenticated;`))
    && !/create policy/i.test(mig) && /check \(part_le >= prete_le\)/.test(mig) && /raise exception 'pilote : conversation d un autre artisan'/.test(mig))
  T('C23 jumeau à coller présent (scripts/sql-nu.mjs) avec le contrôle supabase/controles/0174_pilote_automatique.sql', existe('supabase/migrations/_A_COLLER_sql_editor_0174_NU.sql') && existe('supabase/controles/0174_pilote_automatique.sql') && lire('supabase/migrations/_A_COLLER_sql_editor_0174_NU.sql').includes("'declencheurs (attendu 2)'"))
  const octets = ['lib/pilote/regles.ts', 'lib/pilote/serveur.ts', 'lib/pilote/file.ts', 'lib/pilote/executeur.ts', 'lib/envoisServeur.ts', 'lib/envoisPdfServeur.ts', 'app/parametres/SectionPilote.tsx', 'supabase/migrations/0174_pilote_automatique.sql'].filter((f) => /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(fs.readFileSync(path.join(RACINE, f), 'utf8')))
  T('C24 aucun octet de contrôle dans les fichiers du pilote', octets.length === 0, octets.join(' '))
}

// ═══════════════════════ D. Lanceur ═══════════════════════
{
  const lanceur = lire('scripts/tout-verifier.mjs')
  T('D1 la suite est au tableau SUITES de scripts/tout-verifier.mjs (cout: gratuit)', /cmd: 'node', args: \['--experimental-strip-types', '--import', '\.\/scripts\/ts-loader\.mjs', 'scripts\/pilote-qa\.mjs'\], cout: 'gratuit'/.test(lanceur))
}

console.log(`\n${verts} vert(s), ${rouges.length} rouge(s)${rouges.length ? ' : ' + rouges.join(' · ') : ''}`)
process.exitCode = rouges.length ? 1 : 0
