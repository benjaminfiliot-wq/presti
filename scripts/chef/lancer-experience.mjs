#!/usr/bin/env node
// scripts/chef/lancer-experience.mjs — lancer une expérience bornée APRÈS la première vente (fiche 026-227).
//
// « Expérience » = une mesure bornée, pas une autorisation d'agir sur les clients. Ce module ne contacte personne, ne
// dépense rien, ne bascule aucun drapeau et n'appelle aucune IA : il tient un registre d'expériences et refuse, AVANT
// toute écriture et tout événement, ce qui n'est pas prouvé. Le critère qui a causé un refus est toujours nommé.
//
// Règles tenues :
//   - première vente = un encaissement confirmé, sourcé et non test, fourni par le système de vente (jamais un devis,
//     une commande en attente ou un événement de test) ; un indicateur absent n'est pas un « non » ;
//   - cadre complet fixé avant le premier événement : source, objectif, métrique de départ, horizon, population,
//     seuil d'arrêt, coût maximum ; aucune donnée personnelle ni secret dans la demande ;
//   - accord de Benj sur l'objectif EXACT, sinon l'expérience reste « proposée » ; un accord contradictoire, futur ou
//     expiré est refusé ; Benj autorise séparément tout achat ou envoi (ce module n'en fait aucun) ;
//   - le froid reste fermé tant que l'interrupteur envoi_froid n'est pas ouvert (deps.froid_ouvert() === true, jamais une date) ;
//     un id = une expérience ; objectif ou cadre modifié = nouvel accord ;
//   - états : proposée → approuvée → en cours → arrêtée | conclue ; une interruption laisse un état reprenable, l'événement
//     de démarrage porte une clé d'idempotence ;
//   - une mesure absente, sans source ou sans période ne devient ni 0 ni succès : « non mesuré », voie suspendue ;
//   - le bilan sépare observation, inférence et décision ; aucune bascule de drapeau, aucun prix modifié.
//
// Usage (ligne de commande, jamais exécutée à l'import ; notice : docs/agents/lancement-experience.md) :
//   node scripts/chef/lancer-experience.mjs --lancer=<demande.json> --ventes=<ventes.json> [--a-sec] [--travail=<dossier>]
//   node scripts/chef/lancer-experience.mjs --conclure=<id> --mesure=<mesure.json> [--a-sec] [--travail=<dossier>]
//   node scripts/chef/lancer-experience.mjs --arreter=<id> --motif="…" [--a-sec] [--travail=<dossier>]
//   node scripts/chef/lancer-experience.mjs --etat=<id> [--a-sec] [--travail=<dossier>]
// Codes : 0 fait (une reprise identique comprise) ; 2 usage ou fichier illisible ; 3 refus (critère nommé) ou fiche en attente.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

export const ETATS = ['proposée', 'approuvée', 'en cours', 'arrêtée', 'conclue']
export const DEPENDANCES = ['026-220', '026-226', '026-103']
const PORTEES = ['clients', 'prix', 'droits', 'messages', 'froid', 'achat', 'envoi', 'site', 'contenu', 'interne']
const SENSIBLES = ['clients', 'prix', 'droits', 'messages', 'froid', 'achat', 'envoi']
const CADRE = ['id', 'version', 'source', 'objectif', 'metrique', 'horizon_jours', 'population', 'seuil_arret', 'cout_max_eur', 'touche']
const PERSONNEL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+|(?:\+33\s?|\b0)[1-9](?:[\s.-]?\d{2}){4}\b/
const SECRET = /\b(?:sk|pk|rk|fc|fl|ol)-[A-Za-z0-9_-]{16,}|\beyJ[A-Za-z0-9_-]{20,}|\bgh[pousr]_[A-Za-z0-9]{20,}/
const ID_VALIDE = /^[a-z0-9][a-z0-9-]{2,63}$/
const SOURCE_VALIDE = /^(?:douleurs-\d{4}-(?:0[1-9]|1[0-2])|decision-benj)$/

const texte = (v) => typeof v === 'string' && v.trim().length > 0
const refus = (critere, raison, plus = {}) => ({ refus: critere, raison, ...plus })
const sha256 = (t) => crypto.createHash('sha256').update(String(t), 'utf8').digest('hex')
const iso = (t) => new Date(t).toISOString()
function chaines(v, sortie = []) {
  if (typeof v === 'string') sortie.push(v)
  else if (Array.isArray(v)) for (const x of v) chaines(x, sortie)
  else if (v && typeof v === 'object') for (const x of Object.values(v)) chaines(x, sortie)
  return sortie
}

/** Le cadre normalisé d'une demande (ou d'un enregistrement) : seule la partie que Benj approuve. */
export function cadreDe(d) {
  const m = d?.metrique
  return {
    id: d?.id,
    version: d?.version,
    source: d?.source,
    objectif: d?.objectif,
    metrique: { nom: m?.nom, depart: m?.depart, sens: m?.sens ?? null },
    horizon_jours: d?.horizon_jours,
    population: d?.population,
    seuil_arret: d?.seuil_arret,
    cout_max_eur: d?.cout_max_eur,
    touche: [...new Set(Array.isArray(d?.touche) ? d.touche : [])].sort(),
  }
}
const empreinteDe = (cadre) => sha256(JSON.stringify(cadre))

// Le cadre est complet ou la demande est refusée : rien n'est écrit, aucun événement n'est émis.
function verifierCadre(d) {
  if (!d || typeof d !== 'object') return refus('cadre', 'demande absente')
  if (!texte(d.id) || !ID_VALIDE.test(d.id)) return refus('cadre', 'id absent ou illisible (minuscules, chiffres et tirets, 3 à 64 signes)')
  if (!Number.isInteger(d.version) || d.version < 1) return refus('cadre', 'version absente (entier ≥ 1)')
  if (!texte(d.source) || !SOURCE_VALIDE.test(d.source)) return refus('cadre', 'hypothèse sans source (douleurs-AAAA-MM ou decision-benj)')
  if (!texte(d.objectif)) return refus('cadre', 'objectif manquant')
  if (!d.metrique || !texte(d.metrique.nom) || typeof d.metrique.depart !== 'number' || !Number.isFinite(d.metrique.depart)) return refus('cadre', 'métrique ou valeur de départ manquante')
  if (d.metrique.sens !== undefined && d.metrique.sens !== null && !['baisse', 'hausse'].includes(d.metrique.sens)) return refus('cadre', 'sens de la métrique : baisse ou hausse')
  if (!Number.isFinite(d.horizon_jours) || d.horizon_jours <= 0) return refus('cadre', 'horizon manquant')
  if (!texte(d.population)) return refus('cadre', 'population manquante')
  if (!texte(d.seuil_arret)) return refus('cadre', "seuil d'arrêt manquant")
  if (typeof d.cout_max_eur !== 'number' || !Number.isFinite(d.cout_max_eur) || d.cout_max_eur < 0) return refus('cadre', 'coût maximum manquant')
  if (d.touche !== undefined && (!Array.isArray(d.touche) || d.touche.some((x) => !PORTEES.includes(x)))) return refus('cadre', `portée inconnue (permises : ${PORTEES.join(', ')})`)
  return null
}

function lireAccord(d, maintenant) {
  const a = d.accord_benj
  if (a === undefined || a === null) return { absent: true }
  if (typeof a !== 'object' || !texte(a.id) || !texte(a.objectif)) return { faute: refus('accord_invalide', "accord de Benj sans id ou sans objectif") }
  const t = Date.parse(a.date)
  if (Number.isNaN(t) || t > maintenant) return { faute: refus('accord_invalide', "date de l'accord illisible ou dans le futur") }
  if (a.expire_le !== undefined && a.expire_le !== null) {
    const e = Date.parse(a.expire_le)
    if (Number.isNaN(e) || e <= maintenant) return { faute: refus('accord_perime', "l'accord de Benj est expiré ou sa date d'expiration illisible") }
  }
  if (a.objectif !== d.objectif) return { faute: refus('accord_autre_objectif', "l'accord de Benj porte sur un autre objectif : nouvel accord requis") }
  return { accord: { id: a.id, objectif: a.objectif, date: iso(t) } }
}

const premiereVente = (ventes) => (ventes || []).find((v) => v?.statut === 'encaisse' && v.confirme === true && v.test === false && texte(v.source))

async function ecrire(deps, cle, valeur) {
  try { await deps.magasin.ecrire(cle, valeur); return null } catch { return refus('magasin_indisponible', 'écriture du registre impossible : rien de plus n\'est fait') }
}

// approuvée → événement de démarrage (clé d'idempotence) → en cours : une reprise après coupure ne démarre pas deux fois.
async function demarrer(experience, deps, cle) {
  const maintenant = iso(deps.horloge.maintenant())
  const approuvee = { ...experience, etat: 'approuvée', historique: [...(experience.historique || []), { etat: 'approuvée', le: maintenant }] }
  const e1 = await ecrire(deps, cle, approuvee)
  if (e1) return e1
  try {
    await deps.evenements.emettre({ type: 'demarrage', id: experience.id, version: experience.version, cle: `experience:${experience.id}:v${experience.version}:demarrage`, accord: experience.accord?.id ?? null, a_sec: deps.a_sec === true })
  } catch {
    return refus('evenement_indisponible', "l'événement de démarrage n'est pas parti : l'expérience reste approuvée et reprenable", { experience: approuvee })
  }
  const encours = { ...approuvee, etat: 'en cours', historique: [...approuvee.historique, { etat: 'en cours', le: maintenant }] }
  const e2 = await ecrire(deps, cle, encours)
  if (e2) return { ...e2, experience: approuvee }
  return { deja: false, experience: encours }
}

export async function lancerExperience(d, deps) {
  if (!deps?.ventes || !deps.magasin?.lire || !deps.magasin?.ecrire || !deps.horloge?.maintenant || !deps.evenements?.emettre) return refus('dependances', 'doublures ou services manquants : rien n\'est lancé')
  const maintenant = deps.horloge.maintenant()
  if (!Number.isFinite(maintenant)) return refus('horloge', 'horloge illisible')
  const cadreFaute = verifierCadre(d)
  if (cadreFaute) return cadreFaute
  if (chaines(d).some((s) => PERSONNEL.test(s))) return refus('donnee_personnelle', 'adresse ou téléphone dans la demande : décrire un segment, jamais des personnes')
  if (chaines(d).some((s) => SECRET.test(s))) return refus('secret', 'secret dans la demande : rien n\'est écrit')
  // Plus de date (décision du 05/10/2026) : le froid n'est « ouvert » que si le service rend EXACTEMENT true (lecture de l'interrupteur
  // envoi_froid, que seule acq_envoi_froid_ouvrir écrit après la mesure à sec et la notice ; l'épreuve de bout en bout ne conditionne que la montée de palier). Service absent,
  // en panne, ou réponse autre que true : fermé.
  if ((d.touche || []).includes('froid')) {
    let ouvert = false
    try { ouvert = typeof deps.froid_ouvert === 'function' && (await deps.froid_ouvert()) === true } catch { ouvert = false }
    if (!ouvert) return refus('froid_ferme', "le froid reste fermé tant que l'interrupteur envoi_froid n'est pas ouvert (mesure à sec, notice, puis ouverture par Benj)")
  }

  let ventes
  try { ventes = await deps.ventes() } catch { return refus('premiere_vente_inconnue', 'le système de vente ne répond pas : première vente non prouvée') }
  if (!Array.isArray(ventes)) return refus('premiere_vente_inconnue', 'liste de ventes illisible : première vente non prouvée')
  const vente = premiereVente(ventes)
  if (!vente) return refus('premiere_vente', 'aucun encaissement confirmé, sourcé et non test : aucun lancement')

  const cle = `experience-${d.id}`
  let existante
  try { existante = await deps.magasin.lire(cle) } catch { return refus('magasin_indisponible', 'lecture du registre impossible : rien n\'est lancé') }
  const cadre = cadreDe(d)

  if (existante) {
    if (typeof existante !== 'object' || !ETATS.includes(existante.etat)) return refus('enregistrement_illisible', "l'enregistrement existant est illisible : rien n'est touché")
    const ancien = cadreDe(existante)
    const changes = CADRE.filter((k) => JSON.stringify(ancien[k]) !== JSON.stringify(cadre[k]))
    if (changes.length) return refus('nouvel_accord', `cadre modifié (${changes.join(', ')}) : une modification demande un nouvel accord et un nouvel id ou une nouvelle version`)
    if (existante.etat === 'approuvée' && existante.accord) return demarrer(existante, deps, cle)
    if (existante.etat === 'proposée' && d.accord_benj !== undefined && d.accord_benj !== null) {
      const l = lireAccord(d, maintenant)
      return l.faute || demarrer({ ...existante, accord: l.accord }, deps, cle)
    }
    return { deja: true, experience: existante }
  }

  const lu = lireAccord(d, maintenant)
  if (lu.faute) return lu.faute

  const experience = {
    ...cadre,
    empreinte: empreinteDe(cadre),
    etat: 'proposée',
    accord: null,
    vente: { id: vente.id ?? null, source: vente.source },
    gardes: {
      sensibles: cadre.touche.filter((x) => SENSIBLES.includes(x)),
      a_valider_par: cadre.touche.some((x) => SENSIBLES.includes(x)) ? ['claude-code', 'benj'] : ['benj'],
      envoi_achat: "aucun envoi ni achat sans l'accord de Benj : ce module n'en fait aucun",
    },
    cree_le: iso(maintenant),
    historique: [{ etat: 'proposée', le: iso(maintenant) }],
  }
  if (!lu.accord) {
    const e = await ecrire(deps, cle, experience)
    return e || { deja: false, experience }
  }
  return demarrer({ ...experience, accord: lu.accord }, deps, cle)
}

async function charger(id, deps) {
  if (!deps?.magasin?.lire || !deps.magasin.ecrire || !deps.horloge?.maintenant) return { faute: refus('dependances', 'registre ou horloge manquants') }
  if (!texte(id) || !ID_VALIDE.test(id)) return { faute: refus('cadre', 'id absent ou illisible') }
  let e
  try { e = await deps.magasin.lire(`experience-${id}`) } catch { return { faute: refus('magasin_indisponible', 'lecture du registre impossible') } }
  if (!e) return { faute: refus('inconnue', 'aucune expérience sous cet id') }
  if (typeof e !== 'object' || !ETATS.includes(e.etat)) return { faute: refus('enregistrement_illisible', "l'enregistrement est illisible : rien n'est touché") }
  return { e }
}

// Arrêt : « non mesuré », voie suspendue, aucun succès ; l'événement de suspension ne part que si l'expérience avait démarré.
async function arreter(e, deps, motif, conclusion = 'non mesuré', plus = {}) {
  const maintenant = iso(deps.horloge.maintenant())
  const arretee = {
    ...e, ...plus, etat: 'arrêtée', conclusion, succes: false, suspendue: true,
    arret: { motif, le: maintenant },
    historique: [...(e.historique || []), { etat: 'arrêtée', le: maintenant, motif }],
  }
  const err = await ecrire(deps, `experience-${e.id}`, arretee)
  if (err) return err
  if (e.etat === 'en cours' && deps.evenements?.emettre) {
    try { await deps.evenements.emettre({ type: 'suspension', id: e.id, cle: `experience:${e.id}:v${e.version}:arret`, motif, a_sec: deps.a_sec === true }) } catch { /* l'état est écrit ; la suspension se relit dans le registre */ }
  }
  return { experience: arretee }
}

/** Arrêt forcé (seuil atteint, coût dépassé, ordre de Benj) : la conclusion reste « non mesuré ». */
export async function arreterExperience({ id, motif } = {}, deps) {
  const { e, faute } = await charger(id, deps)
  if (faute) return faute
  if (!texte(motif) || PERSONNEL.test(motif) || SECRET.test(motif)) return refus('motif', 'motif absent, ou contenant une adresse, un téléphone ou un secret')
  if (e.etat === 'arrêtée' || e.etat === 'conclue') return { deja: true, experience: e }
  return arreter(e, deps, motif.trim())
}

const SENS = { baisse: -1, hausse: 1 }
export async function conclureExperience({ id, mesure } = {}, deps) {
  const { e, faute } = await charger(id, deps)
  if (faute) return faute
  if (e.etat === 'arrêtée' || e.etat === 'conclue') return { deja: true, experience: e }
  if (e.etat !== 'en cours') return refus('non_demarree', `l'expérience est « ${e.etat} » : on ne conclut qu'une expérience en cours`)

  const manques = []
  if (!mesure || typeof mesure !== 'object') manques.push('mesure')
  else {
    if (typeof mesure.valeur !== 'number' || !Number.isFinite(mesure.valeur)) manques.push('valeur')
    if (!texte(mesure.source)) manques.push('source')
    if (!texte(mesure.periode)) manques.push('période')
  }
  if (manques.length) return arreter(e, deps, `mesure indisponible (${manques.join(', ')})`)

  const depart = e.metrique?.depart
  const ecart = typeof depart === 'number' ? Number((mesure.valeur - depart).toFixed(6)) : null
  const sens = SENS[e.metrique?.sens] || 0
  const jugement = ecart === null || !sens ? 'non jugé' : ecart === 0 ? 'stable' : (ecart * sens > 0 ? 'amélioration' : 'dégradation')
  const depassement = typeof mesure.cout_eur === 'number' && Number.isFinite(mesure.cout_eur) && mesure.cout_eur > e.cout_max_eur
  const limites = ['une seule mesure sur une seule période', "aucun groupe témoin : un écart observé n'établit pas une cause"]
  if (typeof mesure.cout_eur !== 'number') limites.push('coût constaté non fourni')
  if (depassement) limites.push(`coût constaté supérieur au maximum fixé (${mesure.cout_eur} € pour ${e.cout_max_eur} € au plus)`)
  if (!sens) limites.push("sens favorable de la métrique non déclaré : l'écart n'est pas jugé")
  const recommandation = jugement === 'amélioration' ? "Écart favorable sur une seule période : proposer à Benj de répéter l'essai avant toute décision produit."
    : jugement === 'dégradation' ? "Écart défavorable : proposer à Benj de ne pas étendre l'essai ; aucun retour en arrière automatique."
      : 'Pas d\'écart exploitable ou sens non déclaré : proposer à Benj de clore ou de reformuler l\'hypothèse.'
  const bilan = {
    observation: { valeur: mesure.valeur, depart: depart ?? null, source: mesure.source.trim(), periode: mesure.periode.trim() },
    inference: { ecart, jugement, texte: ecart === null ? 'écart non calculable' : `écart à la métrique de départ : ${ecart}${jugement === 'non jugé' ? ' (sens non déclaré)' : ` (${jugement})`}` },
    decision: 'recommandation soumise à Benj ; aucun drapeau ni prix modifié',
    recommandation,
    limites,
  }
  if (depassement) return arreter(e, deps, 'coût maximum dépassé', 'arrêt : coût maximum dépassé', { bilan })
  const maintenant = iso(deps.horloge.maintenant())
  const conclue = { ...e, etat: 'conclue', conclusion: 'mesuré', succes: null, suspendue: false, bilan, historique: [...(e.historique || []), { etat: 'conclue', le: maintenant }] }
  const err = await ecrire(deps, `experience-${e.id}`, conclue)
  return err || { experience: conclue }
}

/** Le bilan publiable : trois sections séparées, jamais une phrase qui mélange fait, lecture et décision. */
export function bilanEnTexte(e) {
  const b = e?.bilan
  const l = [`# Bilan de l'expérience ${e?.id ?? '?'} (version ${e?.version ?? '?'})`, '', `État : ${e?.etat} — conclusion : ${e?.conclusion ?? 'aucune'}.`, `Objectif : ${e?.objectif}`, '']
  if (!b) {
    l.push('## Observation', '', `Rien de mesuré : ${e?.arret?.motif ?? 'aucune mesure'}. Aucune valeur n'est inventée, la voie est suspendue.`, '')
  } else {
    l.push('## Observation (le fait mesuré)', '', `- valeur : ${b.observation.valeur} (départ ${b.observation.depart})`, `- période : ${b.observation.periode}`, `- source : ${b.observation.source}`, '',
      '## Inférence (ce que cela laisse penser)', '', `- ${b.inference.texte}`, '', '## Limites', '', ...b.limites.map((x) => `- ${x}`), '',
      '## Décision', '', `- ${b.decision}`, `- recommandation : ${b.recommandation}`, '')
  }
  return `${l.join('\n')}\n`
}

// ── Dépendances (usage réel seulement) ────────────────────────────────────────────────────────────────────────────────
const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

/** Les fiches préalables sans PASS (verdicts.jsonl et fait/) : tant qu'il en reste, l'usage réel est fermé. */
export function dependancesManquantes(racine = RACINE) {
  let lignes = []
  try { lignes = fs.readFileSync(path.join(racine, '.orchestre', 'verdicts.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean) } catch { lignes = [] }
  const dernier = new Map()
  for (const l of lignes) { try { const v = JSON.parse(l); if (v?.id) dernier.set(v.id, v) } catch { /* ligne illisible */ } }
  return DEPENDANCES.filter((id) => {
    const v = dernier.get(id)
    return !(v && v.verdict === 'PASS' && v.dossier === 'fait' && fs.existsSync(path.join(racine, '.orchestre', 'fait', `${id}.md`)))
  })
}

// ── Ligne de commande ─────────────────────────────────────────────────────────────────────────────────────────────────
function option(argv, nom) {
  const a = argv.find((x) => x === `--${nom}` || x.startsWith(`--${nom}=`))
  if (a === undefined) return undefined
  return a.includes('=') ? a.slice(a.indexOf('=') + 1) : true
}
function lireJson(f) { try { return JSON.parse(fs.readFileSync(path.resolve(f), 'utf8')) } catch { return undefined } }

function registre(travail) {
  fs.mkdirSync(travail, { recursive: true })
  const fichier = (k) => path.join(travail, `${k}.json`)
  const absentes = new Set()
  return {
    lire: async (k) => { try { return JSON.parse(fs.readFileSync(fichier(k), 'utf8')) } catch (e) { if (e?.code === 'ENOENT') { absentes.add(k); return null } throw e } },
    // Première écriture d'une clé vue absente : création exclusive (deux lancements simultanés ne créent qu'une expérience).
    ecrire: async (k, v) => { const neuf = absentes.delete(k); fs.writeFileSync(fichier(k), `${JSON.stringify(v, null, 2)}\n`, { flag: neuf ? 'wx' : 'w' }) },
  }
}

async function principal() {
  const argv = process.argv.slice(2)
  const aSec = option(argv, 'a-sec') === true
  const dossier = option(argv, 'travail')
  const travail = path.resolve(typeof dossier === 'string' ? dossier : path.join(RACINE, '.orchestre', 'travail', aSec ? 'experiences-a-sec' : 'experiences'))
  const lancer = option(argv, 'lancer')
  const conclure = option(argv, 'conclure')
  const arret = option(argv, 'arreter')
  const etat = option(argv, 'etat')
  if (![lancer, conclure, arret, etat].some((x) => typeof x === 'string')) {
    console.error('usage : lancer-experience.mjs --lancer=<demande.json> --ventes=<ventes.json> | --conclure=<id> --mesure=<mesure.json> | --arreter=<id> --motif="…" | --etat=<id>  [--a-sec] [--travail=<dossier>]')
    return 2
  }
  if (!aSec && typeof etat !== 'string') {
    const manque = dependancesManquantes()
    if (manque.length) { console.log(`… en attente : ${manque.join(', ')} sans PASS (usage réel fermé ; --a-sec pour l'essai fictif)`); return 3 }
  }
  const magasin = registre(travail)
  const journal = path.join(travail, 'evenements.jsonl')
  const deps = {
    a_sec: aSec,
    magasin,
    horloge: { maintenant: () => Date.now() },
    evenements: { emettre: async (ev) => { fs.appendFileSync(journal, `${JSON.stringify({ ...ev, le: iso(Date.now()) })}\n`) } },
    ventes: async () => { throw new Error('ventes non fournies') },
    drapeaux: { basculer: async () => { throw new Error('aucun drapeau n\'est basculé par ce module') } },
    // La ligne de commande ne lit pas la base : le froid y est toujours fermé. Une expérience « froid » se lance par code, avec une
    // lecture réelle de l'interrupteur envoi_froid injectée ici.
    froid_ouvert: async () => false,
  }
  let r
  if (typeof lancer === 'string') {
    const demande = lireJson(lancer)
    if (demande === undefined) { console.error('✗ demande illisible'); return 2 }
    const v = option(argv, 'ventes')
    const ventes = typeof v === 'string' ? lireJson(v) : undefined
    if (ventes !== undefined) deps.ventes = async () => ventes
    r = await lancerExperience(demande, deps)
  } else if (typeof conclure === 'string') {
    const m = option(argv, 'mesure')
    const mesure = typeof m === 'string' ? lireJson(m) : null
    r = await conclureExperience({ id: conclure, mesure: mesure ?? null }, deps)
    if (r.experience && !r.deja) fs.writeFileSync(path.join(travail, `bilan-${conclure}.md`), bilanEnTexte(r.experience))
  } else if (typeof arret === 'string') {
    const motif = option(argv, 'motif')
    r = await arreterExperience({ id: arret, motif: typeof motif === 'string' ? motif : '' }, deps)
    if (r.experience && !r.deja) fs.writeFileSync(path.join(travail, `bilan-${arret}.md`), bilanEnTexte(r.experience))
  } else {
    const lu = await charger(etat, deps)
    r = lu.faute || { deja: true, experience: lu.e }
  }
  if (r.refus) { console.log(`✗ refus ${r.refus} : ${r.raison}${aSec ? ' [à sec]' : ''}`); return 3 }
  console.log(`✓ ${r.experience.id} : ${r.experience.etat}${r.experience.conclusion ? ` (${r.experience.conclusion})` : ''}${r.deja ? ' — déjà enregistrée' : ''}${aSec ? ' [à sec]' : ''}`)
  return 0
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  principal().then((c) => { process.exitCode = c }).catch((e) => { console.error(`✗ ${e?.message || e}`); process.exitCode = 1 })
}
