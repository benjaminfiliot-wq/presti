// scripts/fixtures/026-acquisition/magasin-memoire.mjs — un `Magasin` complet en mémoire, qui applique les MÊMES règles que
// la base (0096, 0099 réécrite par la voie gratuite, 0105, 0106, 0111) : fiche 026-016, écrit par Claude Code.
//
// Les juges de l'acquisition y font tourner les agents hors ligne : transitions de TRANSITIONS, bail et tentatives
// (3 → a_decider), opposition définitive ou temporaire (expirée : sans effet), 90 jours, 3 messages et 72 h, plafonds du jour
// (envois et nouveaux, jour de Paris, hors saute, perime et annule), un formulaire par entreprise et à vie, l'e-mail seulement
// sollicité (preuve de demande), l'interrupteur envoi_froid (fermé par défaut), les trois verdicts, confirmation_stop,
// reponse_rgpd, le filet des réponses, les fenêtres de Meta, la contrainte de cle_dedup (23514).
// preparerEnvoi et approuverEnvoi ne lèvent JAMAIS pour une règle : { ok: false, raison } avec le code sans son préfixe
// (comme les fonctions acq_* qui rattrapent les exceptions ops:* des déclencheurs).
//
// Mise en scène et inspection (hors contrat) : etat(), ecritures, evenements, poserEtat({ palier, technologies,
// interrupteurs: { envoi_froid, pause_generale }, modeles_suspendus, reponses_recues, quotas, conversations, tranchees,
// pauses, jauges, releve_gmail_le, ads_archive }), inserer(prospect) (un prospect posé à une étape, pour les juges qui
// partent de « recense »), lireProspect(id), horloge.
// Son propre scénario : scenario() → [{ nom, attendu, obtenu, ok }] (auto-contrôle des juges).
import {
  TRANSITIONS, PALIERS, PLAFONDS_DEFAUT, MESSAGERIES_GRATUITES, TENTATIVES_MAX, DELAI_RECONTACT_JOURS, MESSAGES_MAX_PAR_PROSPECT,
  ECART_MIN_HEURES, REPONSES_MAX_PROSPECT_24H, REPONSES_MAX_JOUR, RGPD_REPONSES_MAX, RGPD_FENETRE_JOURS, FENETRE_META_HEURES,
  EMAIL_SOLLICITE_JOUR, SEUILS, TECHNOLOGIES_FORMULAIRE, EXPIRATION_MAQUETTE_JOURS, PROCHES,
} from '../../../lib/agents/acquisition/contrat.ts'
import { creerHorloge } from './horloge-factice.mjs'

const H = 3600_000
const J = 24 * H
const TYPES_ENVOI = ['premier_contact', 'relance', 'lien_maquette', 'reponse', 'confirmation_stop', 'reponse_rgpd']
const CANAUX = ['formulaire_site', 'email_sollicite', 'instagram', 'facebook', 'reponse_privee', 'messagerie']
const HORS_COMPTE = new Set(['saute', 'perime', 'annule'])
const ACTIFS = new Set(['prepare', 'approuve', 'envoye'])
const CLASSES_RGPD = new Set(['rgpd', 'rgpd_acces', 'rgpd_effacement', 'rgpd_autre'])
const CLASSES_A_REPONDRE = new Set(['oui', 'question', 'prix', 'appel', 'pas_maintenant', 'stop', 'entrant', 'rgpd', 'rgpd_acces', 'rgpd_effacement'])
const RE_CLE_DEDUP = /^(siren|domaine|page_meta|instagram):.{2,160}$/
const PARIS = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' })
export const jourParis = (ms) => PARIS.format(new Date(ms))
const cloner = (o) => (o === undefined ? undefined : structuredClone(o))
const erreurBase = (code, message) => Object.assign(new Error(message), { code })

const normDomaine = (d) => {
  const x = String(d ?? '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '')
  return x && !MESSAGERIES_GRATUITES.includes(x) ? x : null
}
/** Les clés d'opposition normalisées ; un domaine de messagerie gratuite n'en est jamais une. */
function normCles(c = {}) {
  const o = {}
  if (c.siren) o.siren = String(c.siren).replace(/\D/g, '').slice(0, 9) || null
  if (c.domaine) o.domaine = normDomaine(c.domaine)
  if (c.email) o.email = String(c.email).trim().toLowerCase()
  if (c.instagram) o.instagram = String(c.instagram).trim().toLowerCase().replace(/^@/, '')
  if (c.page_meta) o.page_meta = String(c.page_meta).trim()
  if (c.meta_id) o.meta_id = String(c.meta_id).trim()
  for (const k of Object.keys(o)) if (!o[k]) delete o[k]
  return o
}
/** Les couples (cle_type, cle_valeur) d'une ou plusieurs listes de clés (l'unicité de 0105 porte sur le couple). */
const couples = (...listes) => listes.flatMap((c) => Object.entries(normCles(c)).map(([cle_type, cle_valeur]) => ({ cle_type, cle_valeur })))
const PROCHE = (s) => PROCHES.some((n) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().includes(n))

export function creerMagasin({ horloge = creerHorloge() } = {}) {
  const h = horloge
  const now = () => h.maintenant()
  const iso = (t = now()) => new Date(t).toISOString()
  let seq = 0
  const nouvelId = (p) => `${p}-${String(++seq).padStart(4, '0')}`
  const S = {
    prospects: new Map(), oppositions: [], envois: new Map(), reponses: new Map(), conversations: new Map(), decisions: new Map(),
    tranchees: new Map(), maquettes: new Map(), liensRdv: new Map(), rdv: [], curseurs: new Map(), annonceurs: [], signaux: [],
    jauges: new Map(), pauses: new Set(), modelesSuspendus: new Map(), echecsTechno: new Map(),
    // Les graines de 0096 (026-010) : des lignes '*' seulement (voie gratuite). Le formulaire vaut 0 tant qu'aucun palier
    // n'est appliqué (0099 : « (formulaire_site, *) vaut 0 tant que 0111 n'a pas appliqué de palier ») ; poserEtat({ palier })
    // l'applique. Une ligne (canal, envoyeur) peut s'ajouter par poserEtat({ quotas }) ; elle n'est jamais obligatoire.
    quotas: new Map([
      ['instagram|*', { envois: PLAFONDS_DEFAUT.instagram, nouveaux: PLAFONDS_DEFAUT.instagram }],
      ['facebook|*', { envois: PLAFONDS_DEFAUT.facebook, nouveaux: PLAFONDS_DEFAUT.facebook }],
      ['formulaire_site|*', { envois: PLAFONDS_DEFAUT.formulaire_site, nouveaux: PLAFONDS_DEFAUT.formulaire_site }],
      ['email_sollicite|*', { envois: EMAIL_SOLLICITE_JOUR, nouveaux: 0 }],
      ['reponse_privee|*', { envois: PLAFONDS_DEFAUT.reponse_privee, nouveaux: 0 }],
      ['messagerie|*', { envois: PLAFONDS_DEFAUT.messagerie, nouveaux: 0 }],
    ]),
    etatEnvoi: {
      palier: 'P0', envoi_froid: false, formulaire_coupe_jusqua: null, gmail_coupe_jusqua: null, meta_coupe_jusqua: null,
      technologies: TECHNOLOGIES_FORMULAIRE.map((technologie) => ({ technologie, etat: 'active' })), modeles_suspendus: [],
      notice_verifiee_le: null, bilan_le: null, releve_gmail_le: null, ads_archive: { permis: false, le: null },
    },
  }
  S.etatEnvoi.releve_gmail_le = iso()
  const ecritures = []
  const evenements = []
  const ecrire = (methode, detail) => ecritures.push({ methode, t: now(), ...cloner(detail) })

  // ── outils internes ──────────────────────────────────────────────────────────────────────────────────────────────────
  function expirerBaux() {
    for (const p of S.prospects.values()) {
      if (p.bail_jusqua === null || p.bail_jusqua > now()) continue
      p.bail_jusqua = null
      if (p.tentatives >= TENTATIVES_MAX && (TRANSITIONS[p.etape] || []).includes('a_decider')) {
        ecrire('a_decider', { id: p.id, depuis: p.etape, tentatives: p.tentatives })
        p.etape = 'a_decider'
        p.maj_le = iso()
      }
    }
  }
  const publier = (p) => {
    const o = cloner(p)
    delete o.bail_jusqua; delete o.case_entrant_id
    return o
  }
  function clesProspect(p) {
    if (!p) return {}
    const emails = (p.canaux || []).filter((c) => c.canal === 'email_sollicite').map((c) => c.valeur)
    return normCles({ siren: p.siren, domaine: p.domaine, instagram: p.instagram, page_meta: p.page_meta, email: emails[0] })
  }
  /** L'opposition active la plus récente qui porte l'un des couples de ces listes de clés (0099 : expire_le nul ou futur). */
  function oppositionActive(...listes) {
    const c = couples(...listes)
    if (!c.length) return null
    const actives = S.oppositions.filter((o) => (o.expire_le === null || Date.parse(o.expire_le) > now()) && c.some((x) => x.cle_type === o.cle_type && x.cle_valeur === o.cle_valeur))
    return actives.sort((a, b) => b.cree_ms - a.cree_ms)[0] || null
  }
  /** La ligne de plafond (canal, envoyeur) ; envoyeur '*' par défaut. 'palier' : celle du palier en cours. */
  function ligneQuota(canal, envoyeur = '*') {
    const brut = S.quotas.get(`${canal}|${envoyeur}`)
    if (brut === undefined || brut === null) return null
    if (brut === 'palier') { const p = PALIERS.find((x) => x.id === S.etatEnvoi.palier); return p ? { envois: p.par_jour, nouveaux: p.par_jour } : null }
    return { ...brut }
  }
  const envoisVers = (pid) => [...S.envois.values()].filter((x) => pid && x.prospect_id === pid)
  const memeEntreprise = (a, b) => !!a && !!b && ((!!a.siren && a.siren === b.siren) || (!!normDomaine(a.domaine) && normDomaine(a.domaine) === normDomaine(b.domaine)))
  const memePersonne = (x, e) => (e.prospect_id ? x.prospect_id === e.prospect_id : !!e.conversation_id && x.conversation_id === e.conversation_id)
  /**
   * La preuve de demande de 0099 : `message_recu` = une réponse reçue de ce prospect (ou de cette conversation), jamais un
   * accusé de site ; `case_entrant` = l'id du prospect de l'envoi, `source = 'entrant'`, dont le canal e-mail
   * `donnee_par_la_personne` égal au destinataire porte `case_cochee_le`.
   */
  function preuveValide(e, p) {
    const pr = e.preuve_demande
    if (!pr || !pr.id) return false
    if (pr.type === 'message_recu') {
      const r = S.reponses.get(pr.id)
      return !!r && !r.accuse_site && ((!!p && r.prospect_id === p.id) || (!!e.conversation_id && r.conversation_id === e.conversation_id))
    }
    if (pr.type === 'case_entrant') {
      const dest = String(e.destinataire ?? '').trim().toLowerCase()
      return !!p && pr.id === p.id && p.source === 'entrant'
        && (p.canaux || []).some((c) => c.canal === 'email_sollicite' && c.nature === 'donnee_par_la_personne' && String(c.valeur).toLowerCase() === dest && !!c.case_cochee_le)
    }
    return false
  }
  function revenirApresAnnulation(x) {
    const p = x.prospect_id ? S.prospects.get(x.prospect_id) : null
    if (!p) return
    if (x.type === 'premier_contact' && p.etape === 'prepare') p.etape = S.maquettes.has(p.id) ? 'maquette_prete' : 'verifie'
    if (x.type === 'lien_maquette' && p.etape === 'lien_prepare') p.etape = 'oui'
  }

  // ── MagasinSocle ─────────────────────────────────────────────────────────────────────────────────────────────────────
  const m = {
    async enPause(agent) { return S.pauses.has(agent) || S.pauses.has('generale') },
    async enregistrerCandidats(liste) {
      let ajoutes = 0, ignores = 0
      for (const c of liste) {
        if (!c || typeof c.cle_dedup !== 'string' || !RE_CLE_DEDUP.test(c.cle_dedup)) throw erreurBase('23514', `violates check constraint "prospects_cle_dedup_check" (${String(c && c.cle_dedup).slice(0, 60)})`)
        if ([...S.prospects.values()].some((p) => p.cle_dedup === c.cle_dedup)) { ignores++; continue }
        const id = nouvelId('prospect')
        // 0105 (acq_candidats_enregistrer) : clé en opposition active → oppose ; entrant ou nom de proche → froid = false,
        // quelle que soit la valeur reçue ; cible `artisan` par défaut.
        const oppose = !!oppositionActive({ siren: c.siren, domaine: c.domaine, instagram: c.instagram, page_meta: c.page_meta })
        const froid = c.source === 'entrant' || PROCHE(c.entreprise) || PROCHE(c.domaine) ? false : c.froid !== false
        S.prospects.set(id, { ...cloner(c), cible: c.cible || 'artisan', froid, faits: cloner(c.faits || []), canaux: cloner(c.canaux || []), id, etape: oppose ? 'oppose' : 'candidat', tentatives: 0, bail_jusqua: null, raisons: [], cree_le: iso(), maj_le: iso() })
        ajoutes++
      }
      ecrire('enregistrerCandidats', { ajoutes, ignores })
      return { ajoutes, ignores }
    },
    async reserver(etape, limite, bailSecondes) {
      if (etape !== 'candidat' && etape !== 'recense') throw erreurBase('P0001', `ops:reserver_etape (${etape})`)
      expirerBaux()
      const libres = [...S.prospects.values()].filter((p) => p.etape === etape && p.bail_jusqua === null).sort((a, b) => a.id.localeCompare(b.id)).slice(0, Math.max(0, limite))
      for (const p of libres) { p.tentatives += 1; p.bail_jusqua = now() + bailSecondes * 1000 }
      ecrire('reserver', { etape, limite, ids: libres.map((p) => p.id) })
      return libres.map(publier)
    },
    async mettreAJour(id, depuis, vers, patch = {}) {
      expirerBaux()
      const p = S.prospects.get(id)
      if (!p || p.etape !== depuis) { ecrire('mettreAJour_refuse', { id, depuis, vers, cause: 'etape_changee' }); return false }
      // 0105 : une transition hors de TRANSITIONS rend false (rien n'est écrit), comme une étape qui a changé.
      if (!(TRANSITIONS[depuis] || []).includes(vers)) { ecrire('mettreAJour_refuse', { id, depuis, vers, cause: 'transition_interdite' }); return false }
      const x = cloner(patch) || {}
      if (x.raison) { p.raisons.push(x.raison); delete x.raison }
      if (Array.isArray(x.raisons)) { p.raisons.push(...x.raisons); delete x.raisons }
      Object.assign(p, x)
      p.etape = vers; p.tentatives = 0; p.bail_jusqua = null; p.maj_le = iso()
      ecrire('mettreAJour', { id, depuis, vers, patch })
      return true
    },
    async estOppose(cles) { return !!oppositionActive(cles) },
    /**
     * 0105 (acq_opposer) : un couple (cle_type, cle_valeur) unique ; sans expireLe, définitive, et tout prospect qui porte une
     * de ces clés passe à `oppose` ; avec, temporaire, sans changer l'étape ; une définitive remplace une temporaire, jamais
     * l'inverse. 0099 (annuler_sur_opposition) : les envois prepare ou approuve du prospect ou du destinataire passent en
     * annule, sauf une confirmation_stop, pour une opposition active.
     */
    async opposer(cles, motif, source, expireLe) {
      const liste = couples(cles)
      const definitive = expireLe === undefined || expireLe === null
      for (const c of liste) {
        const deja = S.oppositions.find((o) => o.cle_type === c.cle_type && o.cle_valeur === c.cle_valeur)
        if (deja) {
          if (definitive && deja.expire_le !== null) Object.assign(deja, { expire_le: null, motif, source, cree_le: iso(), cree_ms: now() })
          else if (!definitive && deja.expire_le !== null) Object.assign(deja, { expire_le: expireLe, motif, source })
          continue
        }
        S.oppositions.push({ ...c, motif, source, cree_le: iso(), cree_ms: now(), expire_le: definitive ? null : expireLe })
      }
      const touche = (p) => couples({ siren: p.siren, domaine: p.domaine, instagram: p.instagram, page_meta: p.page_meta }, ...(p.canaux || []).filter((x) => x.canal === 'email_sollicite').map((x) => ({ email: x.valeur }))).some((x) => liste.some((c) => c.cle_type === x.cle_type && c.cle_valeur === x.cle_valeur))
      const opposes = []
      if (definitive) for (const p of S.prospects.values()) if (touche(p) && (TRANSITIONS[p.etape] || []).includes('oppose')) { p.etape = 'oppose'; p.bail_jusqua = null; p.maj_le = iso(); opposes.push(p.id) }
      const actif = definitive || Date.parse(expireLe) > now()
      const annules = []
      if (actif) for (const x of S.envois.values()) {
        if (!['prepare', 'approuve'].includes(x.statut) || x.type === 'confirmation_stop') continue
        const p = x.prospect_id ? S.prospects.get(x.prospect_id) : null
        const dest = couples({ email: x.canal === 'email_sollicite' ? x.destinataire : null, meta_id: ['reponse_privee', 'messagerie'].includes(x.canal) ? x.destinataire : null })
        if ((p && touche(p)) || dest.some((d) => liste.some((c) => c.cle_type === d.cle_type && c.cle_valeur === d.cle_valeur))) { x.statut = 'annule'; x.raison = 'opposition'; annules.push(x.id) }
      }
      ecrire('opposer', { cles: normCles(cles), motif, source, expire_le: definitive ? null : expireLe, opposes, annules })
    },
    async enregistrerAnnonceurs(a) { S.annonceurs.push(...cloner(a)); ecrire('enregistrerAnnonceurs', { n: a.length }); return a.length },
    async evenement(e) {
      if (!e || typeof e.resume !== 'string' || e.resume.length > 200) throw erreurBase('23514', 'violates check constraint "evenements_resume_check" (200 signes au plus)')
      evenements.push({ ...cloner(e), le: iso() })
      ecrire('evenement', { agent: e.agent, type: e.type })
    },

    // ── MagasinEchanges : plafonds ─────────────────────────────────────────────────────────────────────────────────────
    async plafondDuJour(canal, envoyeur = '*') { return ligneQuota(canal, envoyeur) },
    async envoisDuJour(canal, envoyeur) {
      const jour = jourParis(now())
      const l = [...S.envois.values()].filter((x) => x.canal === canal && (!envoyeur || x.envoyeur === envoyeur) && !HORS_COMPTE.has(x.statut) && jourParis(x.prepare_ms) === jour)
      return { envois: l.length, nouveaux: l.filter((x) => x.type === 'premier_contact').length }
    },

    // ── prospects (lectures sans bail) ─────────────────────────────────────────────────────────────────────────────────
    async prospectsPourPremierContact(canal, limite) {
      expirerBaux()
      return [...S.prospects.values()].filter((p) => ['verifie', 'maquette_prete'].includes(p.etape) && p.source !== 'entrant'
        && (p.canaux || []).some((c) => c.canal === canal) && !oppositionActive(clesProspect(p))
        && !envoisVers(p.id).some((x) => x.type === 'premier_contact' && !HORS_COMPTE.has(x.statut))).slice(0, limite).map(publier)
    },
    async prospectsPourRelance(limite) {
      return [...S.prospects.values()].filter((p) => ['lien_envoye', 'oui'].includes(p.etape) && !oppositionActive(clesProspect(p))
        && !envoisVers(p.id).some((x) => x.type === 'relance' && !HORS_COMPTE.has(x.statut))
        && envoisVers(p.id).every((x) => now() - x.prepare_ms >= ECART_MIN_HEURES * H)).slice(0, limite).map(publier)
    },
    async prospectsPourMaquette(limite, froid) {
      const parite = (id) => [...id].reduce((s, c) => s + c.charCodeAt(0), 0) % 2 === 0
      return [...S.prospects.values()].filter((p) => !S.maquettes.has(p.id) && !oppositionActive(clesProspect(p)) && (froid
        ? p.etape === 'verifie' && p.source !== 'entrant' && p.froid === true && parite(p.id)
        : (p.source === 'entrant' && p.etape === 'verifie') || p.etape === 'oui')).slice(0, limite).map(publier)
    },
    async prospectsOui(limite) {
      return [...S.prospects.values()].filter((p) => p.etape === 'oui' || (p.source === 'entrant' && p.etape === 'maquette_prete' && S.maquettes.get(p.id)?.etat === 'prete')).slice(0, limite).map(publier)
    },
    async historiqueContacts(pid) {
      return envoisVers(pid).sort((a, b) => a.prepare_ms - b.prepare_ms).map((x) => ({ envoi_id: x.id, type: x.type, canal: x.canal, statut: x.statut, le: x.envoye_le || x.prepare_le }))
    },

    // ── envois ─────────────────────────────────────────────────────────────────────────────────────────────────────────
    async perimerEnvois() {
      let n = 0
      for (const x of S.envois.values()) if ((x.statut === 'prepare' || x.statut === 'approuve') && now() - x.prepare_ms > 48 * H) { x.statut = 'perime'; revenirApresAnnulation(x); n++ }
      if (n) ecrire('perimerEnvois', { n })
      return n
    },
    /**
     * 0099 (garde_envois) et 0106 (garde_fenetre_meta), dans l'ordre de 0099 : forme, pause, opposition (et ses deux
     * exceptions), envoi à froid, canal et type (formulaire, e-mail sollicité, 90 jours, relance sollicitée, filet des
     * réponses), fenêtres de Meta, plafonds ; puis l'étape du prospect, dans la même « transaction ». Ne lève jamais pour
     * une règle : { ok: false, raison } (le code sans le préfixe ops:). Deux écarts au texte, notés : l'interrupteur
     * envoi_froid refuse le premier contact ET la relance (026-016, §2) ; pour un premier contact, le compteur des nouveaux
     * passe avant celui des envois (sur formulaire_site ils comptent la même chose : le 6e formulaire au palier P0 est
     * `quota_nouveaux`, comme l'essai de 026-034).
     */
    async preparerEnvoi(e) {
      const refus = (raison) => { ecrire('preparerEnvoi_refuse', { type: e && e.type, canal: e && e.canal, prospect_id: e && e.prospect_id, raison }); return { ok: false, raison } }
      try {
        expirerBaux()
        if (!e || !TYPES_ENVOI.includes(e.type) || !CANAUX.includes(e.canal) || typeof e.texte !== 'string' || !e.texte.trim() || !e.destinataire) return refus('forme')
        const p = e.prospect_id ? S.prospects.get(e.prospect_id) : null
        if (e.prospect_id && !p) return refus('prospect_absent')
        if (!e.prospect_id && !['reponse_privee', 'messagerie'].includes(e.canal)) return refus('prospect_absent')
        if (!e.prospect_id && !e.conversation_id) return refus('conversation_absente')
        if (e.reference && [...S.envois.values()].some((x) => x.reference === e.reference)) return refus('reference')
        // 1. la pause générale
        if (S.pauses.has('generale')) return refus('pause_generale')
        // 2. l'opposition active, et ses deux exceptions
        const dest = String(e.destinataire).trim().toLowerCase()
        const opp = oppositionActive(clesProspect(p),
          e.canal === 'email_sollicite' ? { email: dest, domaine: dest.includes('@') ? dest.split('@')[1] : null } : {},
          ['reponse_privee', 'messagerie'].includes(e.canal) ? { meta_id: dest } : {})
        const memePersonneEnvoi = (x) => (e.prospect_id ? x.prospect_id === e.prospect_id : x.destinataire === e.destinataire)
        if (e.type === 'confirmation_stop') {
          if (!opp || opp.expire_le !== null || now() - opp.cree_ms > 24 * H) return refus('confirmation_stop')
          if ([...S.envois.values()].some((x) => x.type === 'confirmation_stop' && memePersonneEnvoi(x))) return refus('confirmation_stop')
        } else if (e.type === 'reponse_rgpd') {
          const depuis = now() - RGPD_FENETRE_JOURS * J
          const demande = [...S.reponses.values()].some((r) => memePersonne(r, e) && r.classement && CLASSES_RGPD.has(r.classement.classe) && Date.parse(r.recu_le) >= depuis)
          if (!demande) return refus('rgpd_hors_demande')
          const n = [...S.envois.values()].filter((x) => x.type === 'reponse_rgpd' && memePersonneEnvoi(x) && ACTIFS.has(x.statut) && x.prepare_ms >= depuis).length
          if (n >= RGPD_REPONSES_MAX) return refus('rgpd_hors_demande')
        } else if (opp) return refus('opposition')
        // 3. l'envoi à froid, fermé par défaut
        if ((e.type === 'premier_contact' || e.type === 'relance') && !S.etatEnvoi.envoi_froid) return refus('envoi_froid_ferme')
        // 4. le canal et le type
        if (e.canal === 'formulaire_site') {
          if (e.type !== 'premier_contact') return refus('relance_formulaire')
          // un formulaire par entreprise, à vie (même SIREN ou même domaine, même sous un autre prospect)
          if ([...S.envois.values()].some((x) => x.canal === 'formulaire_site' && ACTIFS.has(x.statut) && memeEntreprise(S.prospects.get(x.prospect_id), p))) return refus('formulaire_deja')
        }
        if (e.canal === 'email_sollicite') {
          if (e.type === 'premier_contact') return refus('froid_email_interdit')
          if (!preuveValide(e, p)) return refus('preuve_demande_absente')
        }
        const siens = p ? envoisVers(p.id).filter((x) => ACTIFS.has(x.statut)) : []
        if (e.type === 'premier_contact' && siens.some((x) => (x.type === 'premier_contact' || x.type === 'relance') && x.statut === 'envoye' && now() - Date.parse(x.envoye_le) < DELAI_RECONTACT_JOURS * J)) return refus('90_jours')
        if (e.type === 'relance') {
          if (e.canal === 'email_sollicite') {
            const derniere = Math.max(-Infinity, ...siens.map((x) => x.prepare_ms))
            if (!['lien_envoye', 'oui'].includes(p.etape) || siens.some((x) => x.type === 'relance') || (Number.isFinite(derniere) && now() - derniere < ECART_MIN_HEURES * H)) return refus('relance_sollicitee')
          }
          if (!siens.some((x) => x.statut === 'envoye' && now() - Date.parse(x.envoye_le) < DELAI_RECONTACT_JOURS * J)) return refus('relance_sans_contact')
          const froids = siens.filter((x) => (x.type === 'premier_contact' || x.type === 'relance') && now() - x.prepare_ms < DELAI_RECONTACT_JOURS * J)
          if (froids.length >= MESSAGES_MAX_PAR_PROSPECT) return refus('3_messages')
          if (froids.some((x) => now() - x.prepare_ms < ECART_MIN_HEURES * H)) return refus('72_heures')
        }
        if (e.canal === 'email_sollicite' && e.type === 'reponse') {
          const r24 = [...S.envois.values()].filter((x) => x.canal === 'email_sollicite' && x.type === 'reponse' && memePersonneEnvoi(x) && ACTIFS.has(x.statut) && now() - x.prepare_ms < 24 * H).length
          if (r24 >= REPONSES_MAX_PROSPECT_24H) return refus('quota_reponses')
          const jour = jourParis(now())
          if ([...S.envois.values()].filter((x) => x.type === 'reponse' && x.envoyeur === 'gmail' && ACTIFS.has(x.statut) && jourParis(x.prepare_ms) === jour).length >= REPONSES_MAX_JOUR) return refus('quota_reponses')
        }
        // 0106 : les fenêtres de Meta
        if (e.canal === 'messagerie') {
          const dernier = Math.max(-Infinity, ...[...S.reponses.values()].filter((r) => r.conversation_id === e.conversation_id && r.source === 'meta' && !r.accuse_site).map((r) => Date.parse(r.recu_le)))
          if (!Number.isFinite(dernier) || now() - dernier > FENETRE_META_HEURES * H) return refus('fenetre_fermee')
        }
        if (e.canal === 'reponse_privee') {
          const c = S.conversations.get(e.conversation_id)
          if (!c || !c.commentaire_id || !c.reponse_privee_jusqua || Date.parse(c.reponse_privee_jusqua) < now()) return refus('fenetre_fermee')
          if ([...S.envois.values()].some((x) => x.canal === 'reponse_privee' && x.conversation_id === e.conversation_id && !HORS_COMPTE.has(x.statut))) return refus('fenetre_fermee')
        }
        // 5. les plafonds du jour (jour de Paris, hors saute, perime, annule)
        const tousTypes = ['email_sollicite', 'reponse_privee', 'messagerie'].includes(e.canal)
        const compte = (x) => (e.canal === 'formulaire_site' ? x.type === 'premier_contact' : tousTypes ? true : x.type === 'premier_contact' || x.type === 'relance')
        if (compte(e)) {
          const jour = jourParis(now())
          for (const envoyeur of ['*', e.envoyeur]) {
            if (envoyeur !== '*' && !S.quotas.has(`${e.canal}|${envoyeur}`)) continue
            const ligne = ligneQuota(e.canal, envoyeur)
            if (!ligne) return refus('quota_absent')
            const duJour = [...S.envois.values()].filter((x) => x.canal === e.canal && (envoyeur === '*' || x.envoyeur === envoyeur) && ACTIFS.has(x.statut) && jourParis(x.prepare_ms) === jour && compte(x))
            if (e.type === 'premier_contact' && duJour.filter((x) => x.type === 'premier_contact').length >= ligne.nouveaux) return refus('quota_nouveaux')
            if (duJour.length >= ligne.envois) return refus('quota')
          }
        }
        // l'étape, dans la même transaction (0106, acq_envoi_preparer)
        let vers = null
        if (e.type === 'premier_contact') { if (!['verifie', 'maquette_prete'].includes(p.etape)) return refus('etape'); vers = 'prepare' }
        if (e.type === 'lien_maquette') {
          if (p.etape === 'oui' || (p.source === 'entrant' && p.etape === 'maquette_prete')) vers = 'lien_prepare'
          else return refus('etape')
        }
        const id = nouvelId('envoi')
        S.envois.set(id, { ...cloner(e), id, statut: 'prepare', prepare_le: iso(), prepare_ms: now(), verdicts: null, envoye_le: null, preuve: null, bail_jusqua: null, raison: null })
        if (vers && p) { p.etape = vers; p.maj_le = iso() }
        ecrire('preparerEnvoi', { id, type: e.type, canal: e.canal, prospect_id: e.prospect_id, etape: vers })
        return { ok: true, id }
      } catch (err) {
        return refus(`erreur_interne:${String(err && err.message).slice(0, 80)}`)
      }
    },
    async envoisAApprouver(limite) {
      return [...S.envois.values()].filter((x) => x.statut === 'prepare').slice(0, limite).map((x) => { const o = cloner(x); delete o.prepare_ms; delete o.bail_jusqua; return o })
    },
    async approuverEnvoi(id, v) {
      const refus = (raison) => { ecrire('approuverEnvoi_refuse', { id, raison }); return { ok: false, raison } }
      try {
        const x = S.envois.get(id)
        if (!x) return refus('envoi_absent')
        if (x.statut !== 'prepare') return refus('statut')
        // 0099 garde aussi l'entrée en `approuve` : pause, opposition (hors ses deux exceptions), envoi à froid.
        if (S.pauses.has('generale')) return refus('pause_generale')
        const p = x.prospect_id ? S.prospects.get(x.prospect_id) : null
        const dest = String(x.destinataire).trim().toLowerCase()
        if (!['confirmation_stop', 'reponse_rgpd'].includes(x.type) && oppositionActive(clesProspect(p), x.canal === 'email_sollicite' ? { email: dest } : {}, ['reponse_privee', 'messagerie'].includes(x.canal) ? { meta_id: dest } : {})) return refus('opposition')
        if ((x.type === 'premier_contact' || x.type === 'relance') && !S.etatEnvoi.envoi_froid) return refus('envoi_froid_ferme')
        const j1ok = x.type === 'premier_contact' ? v?.j1 === 'ok' : v?.j1 === 'ok' || v?.j1 === 'sans_objet'
        if (!v || !j1ok || v.j3 !== 'ok' || v.j2 !== 'ok') return refus('verdicts')
        if (S.etatEnvoi.modeles_suspendus.includes(x.modele_id) || S.modelesSuspendus.has(x.modele_id)) return refus('modele_suspendu')
        x.statut = 'approuve'; x.verdicts = cloner(v)
        ecrire('approuverEnvoi', { id })
        return { ok: true }
      } catch (err) {
        return refus(`erreur_interne:${String(err && err.message).slice(0, 80)}`)
      }
    },
    async annulerEnvoi(id, raison) {
      const x = S.envois.get(id)
      if (!x || !['prepare', 'approuve'].includes(x.statut)) return
      x.statut = 'annule'; x.raison = raison; revenirApresAnnulation(x)
      ecrire('annulerEnvoi', { id, raison })
    },
    async envoisApprouves(canal, limite) {
      return [...S.envois.values()].filter((x) => x.statut === 'approuve' && x.canal === canal && (x.bail_jusqua === null || x.bail_jusqua <= now())).slice(0, limite).map((x) => { const o = cloner(x); delete o.prepare_ms; delete o.bail_jusqua; return o })
    },
    async marquerEnvoye(id, preuve) {
      const x = S.envois.get(id)
      if (!x || x.statut !== 'approuve') throw erreurBase('P0001', `ops:envoi_non_approuve (${id})`)
      x.statut = 'envoye'; x.envoye_le = iso(); x.preuve = cloner(preuve); x.bail_jusqua = null
      const p = x.prospect_id ? S.prospects.get(x.prospect_id) : null
      if (p && x.type === 'premier_contact' && p.etape === 'prepare') p.etape = 'envoye'
      if (p && x.type === 'lien_maquette' && p.etape === 'lien_prepare') p.etape = 'lien_envoye'
      if (x.canal === 'formulaire_site' && p && p.technologie) S.echecsTechno.set(p.technologie, 0)
      ecrire('marquerEnvoye', { id })
    },
    async marquerEchec(id, raison) {
      const x = S.envois.get(id)
      if (!x) return
      // 0096 ne connaît pas de statut « echec » : l'envoi qui n'a pas pu partir est annulé, avec sa raison.
      if (!['prepare', 'approuve'].includes(x.statut)) return
      x.statut = 'annule'; x.raison = `echec:${raison}`; x.bail_jusqua = null; revenirApresAnnulation(x)
      ecrire('marquerEchec', { id, raison })
    },
    async formulairesAPorter(limite, bailSecondes) {
      if (S.pauses.has('generale') || S.pauses.has('facteur_usine')) return []
      if (S.etatEnvoi.formulaire_coupe_jusqua && Date.parse(S.etatEnvoi.formulaire_coupe_jusqua) > now()) return []
      const plafond = ligneQuota('formulaire_site', 'facteur_usine')
      const jour = jourParis(now())
      const faits = [...S.envois.values()].filter((x) => x.canal === 'formulaire_site' && x.statut === 'envoye' && jourParis(Date.parse(x.envoye_le)) === jour).length
      const reste = Math.max(0, (plafond ? plafond.envois : 0) - faits)
      const pris = []
      for (const x of S.envois.values()) {
        if (pris.length >= Math.min(limite, reste)) break
        if (x.canal !== 'formulaire_site' || x.statut !== 'approuve' || (x.bail_jusqua !== null && x.bail_jusqua > now())) continue
        const p = S.prospects.get(x.prospect_id)
        if (!p || oppositionActive(clesProspect(p))) continue
        const t = S.etatEnvoi.technologies.find((y) => y.technologie === p.technologie)
        if (t && t.etat === 'pause') continue
        x.bail_jusqua = now() + bailSecondes * 1000
        pris.push(x)
      }
      ecrire('formulairesAPorter', { ids: pris.map((x) => x.id) })
      return pris.map((x) => { const o = cloner(x); delete o.prepare_ms; delete o.bail_jusqua; return o })
    },
    async formulaireEchec(id, raison, definitif) {
      const x = S.envois.get(id)
      if (!x) return
      const p = S.prospects.get(x.prospect_id)
      const techno = p?.technologie || 'autre'
      const n = (S.echecsTechno.get(techno) || 0) + 1
      S.echecsTechno.set(techno, n)
      S.signaux.push({ type: 'echec_soumission', envoi_id: id, technologie: techno, le: iso() })
      if (n >= SEUILS.echecs_affilee) { const t = S.etatEnvoi.technologies.find((y) => y.technologie === techno); if (t) t.etat = 'pause' }
      x.bail_jusqua = null
      if (definitif) { x.statut = 'annule'; x.raison = raison; revenirApresAnnulation(x) }
      ecrire('formulaireEchec', { id, raison, definitif, echecs_affilee: n })
    },

    // ── curseurs, décisions tranchées ──────────────────────────────────────────────────────────────────────────────────
    async curseurLire(nom) { return S.curseurs.has(nom) ? S.curseurs.get(nom) : null },
    async curseurPoser(nom, valeur) { S.curseurs.set(nom, String(valeur)); ecrire('curseurPoser', { nom }) },
    async decisionsTranchees(type, limite) { return [...S.tranchees.values()].filter((d) => d.type === type).slice(0, limite).map(cloner) },

    // ── maquettes ──────────────────────────────────────────────────────────────────────────────────────────────────────
    async maquetteDe(pid) { return cloner(S.maquettes.get(pid) ?? null) },
    async maquettesDuJour() {
      const jour = jourParis(now())
      const l = [...S.maquettes.values()].filter((x) => jourParis(Date.parse(x.prete_le)) === jour)
      return { faites_aujourdhui: l.filter((x) => !x.entrant).length, pretes_non_utilisees: [...S.maquettes.values()].filter((x) => x.etat === 'prete').length, entrants_faites_aujourdhui: l.filter((x) => x.entrant).length }
    },
    async enregistrerMaquettePrete(pid, infos) {
      const p = S.prospects.get(pid)
      if (!p) throw erreurBase('P0001', `ops:prospect_absent (${pid})`)
      S.maquettes.set(pid, { id: nouvelId('maquette'), prospect_id: pid, etat: 'prete', chemin: infos.chemin, empreinte: infos.empreinte, variante: infos.variante ?? null, entrant: p.source === 'entrant', prete_le: iso(), expire_le: null, jeton_hache: null, objet: null })
      if (p.etape === 'verifie') p.etape = 'maquette_prete'
      ecrire('enregistrerMaquettePrete', { prospect_id: pid })
    },
    async creerLienMaquette(pid, objet, jetonHache, expireLe) {
      const x = S.maquettes.get(pid)
      if (!x) throw erreurBase('P0001', `ops:maquette_absente (${pid})`)
      Object.assign(x, { etat: 'lien_cree', objet, jeton_hache: jetonHache, expire_le: expireLe })
      ecrire('creerLienMaquette', { prospect_id: pid })
    },
    async maquetteParJeton(jetonHache) {
      const x = [...S.maquettes.values()].find((y) => y.jeton_hache === jetonHache && y.etat !== 'purgee' && (!y.expire_le || Date.parse(y.expire_le) > now()))
      return cloner(x ?? null)
    },
    async maquettesAPurger(limite) {
      return [...S.maquettes.values()].filter((x) => x.etat !== 'purgee' && (x.expire_le ? Date.parse(x.expire_le) < now() : now() - Date.parse(x.prete_le) > EXPIRATION_MAQUETTE_JOURS * J)).slice(0, limite).map(cloner)
    },
    async marquerMaquettePurgee(id) {
      for (const x of S.maquettes.values()) if (x.id === id) x.etat = 'purgee'
      ecrire('marquerMaquettePurgee', { id })
    },

    // ── réponses ───────────────────────────────────────────────────────────────────────────────────────────────────────
    async reponseRecue(r) {
      const deja = [...S.reponses.values()].find((x) => x.id_externe === r.id_externe)
      const rattache = (x) => {
        const pid = x.prospect_id ?? (x.envoi_id ? S.envois.get(x.envoi_id)?.prospect_id : null) ?? (x.conversation_id ? S.conversations.get(x.conversation_id)?.prospect_id : null) ?? null
        const p = pid ? S.prospects.get(pid) : null
        return p ? { id: p.id, siren: p.siren ?? null, domaine: p.domaine ?? null } : null
      }
      if (deja) return { id: deja.id, nouvelle: false, prospect: rattache(deja) }
      const id = nouvelId('reponse')
      const x = { ...cloner(r), id, recu_le: r.recu_le || iso(), accuse_site: !!r.accuse_site, classement: null, repondue: false, envoi_reponse_id: null, reclassee: false, actes_faits: false }
      const p = rattache(x)
      if (p && !x.prospect_id) x.prospect_id = p.id
      S.reponses.set(id, x)
      ecrire('reponseRecue', { id })
      return { id, nouvelle: true, prospect: p }
    },
    async reponsesATraiter(limite) { return [...S.reponses.values()].filter((r) => !r.classement).slice(0, limite).map(publierReponse) },
    async classerReponse(id, c) {
      const r = S.reponses.get(id)
      if (!r) throw erreurBase('P0001', `ops:reponse_absente (${id})`)
      r.classement = cloner(c)
      ecrire('classerReponse', { id, classe: c.classe })
    },
    async reponsesARepondre(limite) {
      return [...S.reponses.values()].filter((r) => r.classement && CLASSES_A_REPONDRE.has(r.classement.classe) && !r.repondue && (!r.reclassee || r.actes_faits)).slice(0, limite).map(avecDernierEnvoi)
    },
    async reponseRepondue(id, envoiId) {
      const r = S.reponses.get(id)
      if (!r) return
      r.repondue = true; r.envoi_reponse_id = envoiId ?? null
      ecrire('reponseRepondue', { id })
    },
    async reclasserReponse(decisionId, par) {
      const d = S.tranchees.get(decisionId)
      if (!d || !d.reponse_id) return null
      const r = S.reponses.get(d.reponse_id)
      if (!r) return null
      const classe = d.option === 'ignorer' ? 'ignoree' : d.option
      if (!(r.reclassee && r.reclasse_par_decision === decisionId)) {
        r.classement = { classe, source: 'benj' }; r.reclassee = true; r.reclasse_par_decision = decisionId; r.actes_faits = false; r.classe_par = par
        ecrire('reclasserReponse', { decision: decisionId, reponse_id: r.id, classe })
      }
      return { reponse_id: r.id, classe: r.classement.classe, prospect_id: r.prospect_id ?? null, conversation_id: r.conversation_id ?? null }
    },
    async reponsesReclassees(limite) { return [...S.reponses.values()].filter((r) => r.reclassee && !r.actes_faits).slice(0, limite).map(avecDernierEnvoi) },
    async actesFaits(id) { const r = S.reponses.get(id); if (r) { r.actes_faits = true; ecrire('actesFaits', { id }) } },

    // ── entrants, droits des personnes ─────────────────────────────────────────────────────────────────────────────────
    async ajouterEmailEntrant(conversationId, email) {
      const p = [...S.prospects.values()].find((x) => x.conversation_id === conversationId && x.source === 'entrant')
      if (!p || !email || p.canaux.some((c) => c.canal === 'email_sollicite')) return false
      p.canaux.push({ canal: 'email_sollicite', valeur: String(email).trim().toLowerCase(), url_source: `conversation:${conversationId}`, nature: 'donnee_par_la_personne' })
      ecrire('ajouterEmailEntrant', { prospect_id: p.id })
      return true
    },
    async exportPersonne(pid) {
      const p = S.prospects.get(pid)
      if (!p) return {}
      return { prospect: publier(p), envois: envoisVers(pid).map(cloner), reponses: [...S.reponses.values()].filter((r) => r.prospect_id === pid).map(publierReponse) }
    },
    async demanderEffacement(pid) {
      const efface_le = iso(now() + 7 * J)
      const p = S.prospects.get(pid)
      if (p) p.efface_le = efface_le
      ecrire('demanderEffacement', { prospect_id: pid })
      return { efface_le }
    },

    // ── conversations Meta, rendez-vous, décisions ─────────────────────────────────────────────────────────────────────
    async conversation(id) { return cloner(S.conversations.get(id) ?? null) },
    async enregistrerConversation(c) { S.conversations.set(c.id, cloner(c)); ecrire('enregistrerConversation', { id: c.id }) },
    async creerLienRdv(pid, jetonHache, expireLe) { S.liensRdv.set(jetonHache, { prospect_id: pid, jeton_hache: jetonHache, expire_le: expireLe, creneau: null }); ecrire('creerLienRdv', { prospect_id: pid }) },
    async rdvParJeton(jetonHache) { return cloner(S.liensRdv.get(jetonHache) ?? null) },
    async creneauxPris(depuis, jusqua) { return S.rdv.filter((r) => r.creneau >= depuis && r.creneau < jusqua).map((r) => r.creneau) },
    async reserverRdv(jetonHache, creneau, telephone) {
      const l = S.liensRdv.get(jetonHache)
      if (!l) return { ok: false, raison: 'lien_inconnu' }
      if (Date.parse(l.expire_le) < now()) return { ok: false, raison: 'lien_expire' }
      if (l.creneau) return { ok: false, raison: 'deja_reserve' }
      if (S.rdv.some((r) => r.creneau === creneau)) return { ok: false, raison: 'creneau_pris' }
      l.creneau = creneau
      S.rdv.push({ creneau, prospect_id: l.prospect_id, telephone })
      ecrire('reserverRdv', { prospect_id: l.prospect_id })
      return { ok: true }
    },
    async creerDecision(d) {
      const n = Array.isArray(d?.options) ? d.options.length : 0
      if (n < 2 || n > 7) throw erreurBase('23514', `violates check constraint "decisions_options_check" (${n} option(s), de 2 à 7)`)
      if (!d.options.some((o) => o.cle === d.defaut)) throw erreurBase('23514', 'violates check constraint "decisions_defaut_check"')
      const deja = [...S.decisions.values()].find((x) => x.cle_idempotence === d.cle_idempotence)
      if (deja) return { id: deja.id, cree: false }
      const id = nouvelId('decision')
      S.decisions.set(id, { ...cloner(d), id, cree_le: iso() })
      ecrire('creerDecision', { id, type: d.type })
      return { id, cree: true }
    },

    // ── MagasinEnvoi (0111) ────────────────────────────────────────────────────────────────────────────────────────────
    async etatEnvoi() { return cloner({ ...S.etatEnvoi, modeles_suspendus: [...new Set([...S.etatEnvoi.modeles_suspendus, ...S.modelesSuspendus.keys()])] }) },
    async signal(s) { S.signaux.push({ ...cloner(s), le: iso() }); ecrire('signal', { type: s.type }) },
    async modelesSuspendus() { return [...new Set([...S.etatEnvoi.modeles_suspendus, ...S.modelesSuspendus.keys()])] },
    async suspendreModele(modeleId, motif) { S.modelesSuspendus.set(modeleId, motif); ecrire('suspendreModele', { modeleId, motif }) },
    async jaugeConsommer(fournisseur, n) {
      const jour = jourParis(now())
      const j = S.jauges.get(fournisseur) || { fournisseur, consomme: 0, plafond: Infinity, jour }
      if (j.jour !== jour) { j.consomme = 0; j.jour = jour }
      if (j.consomme + n > j.plafond) return false
      j.consomme += n
      S.jauges.set(fournisseur, j)
      return true
    },
    async jauges() { return [...S.jauges.values()].map((j) => ({ ...j, plafond: Number.isFinite(j.plafond) ? j.plafond : -1 })) },
    async echantillonDuSoir(jour) { return [...S.envois.values()].filter((x) => x.statut === 'envoye' && jourParis(Date.parse(x.envoye_le)) === jour).map(cloner) },
  }
  function publierReponse(r) {
    const o = cloner(r)
    delete o.reclasse_par_decision
    return o
  }
  function avecDernierEnvoi(r) {
    const siens = [...S.envois.values()].filter((x) => !HORS_COMPTE.has(x.statut) && ((r.prospect_id && x.prospect_id === r.prospect_id) || (r.conversation_id && x.conversation_id === r.conversation_id)))
    const d = siens.sort((a, b) => b.prepare_ms - a.prepare_ms)[0]
    return { ...publierReponse(r), notre_dernier_envoi_le: d ? (d.envoye_le || d.prepare_le) : null, notre_dernier_envoi_type: d ? d.type : null }
  }

  // ── Mise en scène et inspection ──────────────────────────────────────────────────────────────────────────────────────
  Object.assign(m, {
    horloge: h,
    ecritures,
    evenements,
    etat() {
      expirerBaux()
      return cloner({
        prospects: [...S.prospects.values()].map(publier),
        envois: [...S.envois.values()],
        reponses: [...S.reponses.values()].map(publierReponse),
        oppositions: S.oppositions,
        evenements,
        decisions: [...S.decisions.values()],
        conversations: [...S.conversations.values()],
        maquettes: [...S.maquettes.values()],
        curseurs: Object.fromEntries(S.curseurs),
        annonceurs: S.annonceurs,
        signaux: S.signaux,
        etat_envoi: S.etatEnvoi,
      })
    },
    lireProspect(id) { expirerBaux(); const p = S.prospects.get(id); return p ? publier(p) : null },
    /** Un prospect posé directement à une étape (les juges de J1 partent de « recense »). → son id */
    inserer(p) {
      if (!p || !RE_CLE_DEDUP.test(String(p.cle_dedup))) throw erreurBase('23514', 'violates check constraint "prospects_cle_dedup_check"')
      const id = p.id || nouvelId('prospect')
      S.prospects.set(id, { faits: [], canaux: [], raisons: [], ...cloner(p), id, etape: p.etape || 'candidat', tentatives: p.tentatives || 0, bail_jusqua: null, cree_le: iso(), maj_le: iso(), case_entrant_id: p.case_entrant_id ?? null })
      return id
    },
    poserEtat(o = {}) {
      // Appliquer un palier pose la ligne (formulaire_site, '*') à son plafond (0111, acq_palier_plafond).
      if (o.palier) { if (!PALIERS.some((p) => p.id === o.palier)) throw new Error(`palier inconnu : ${o.palier}`); S.etatEnvoi.palier = o.palier; S.quotas.set('formulaire_site|*', 'palier') }
      // Une opposition posée telle quelle, sans toucher aux prospects ni aux envois (celle qu'un juge place « entre A8 et
      // J1 » pour vérifier que l'agent la relit lui-même) : { siren | domaine | … , motif?, expire_le? }.
      if (o.oppositions) for (const x of o.oppositions) for (const c of couples(x)) S.oppositions.push({ ...c, motif: x.motif || 'essai', source: 'mise_en_scene', cree_le: iso(), cree_ms: now(), expire_le: x.expire_le ?? null })
      if (o.technologies) for (const [technologie, etat] of Object.entries(o.technologies)) { const t = S.etatEnvoi.technologies.find((x) => x.technologie === technologie); if (t) t.etat = etat; else S.etatEnvoi.technologies.push({ technologie, etat }) }
      if (o.interrupteurs) {
        if ('envoi_froid' in o.interrupteurs) S.etatEnvoi.envoi_froid = !!o.interrupteurs.envoi_froid
        if ('pause_generale' in o.interrupteurs) { if (o.interrupteurs.pause_generale) S.pauses.add('generale'); else S.pauses.delete('generale') }
      }
      if (o.pauses) for (const a of o.pauses) S.pauses.add(a)
      if (o.modeles_suspendus) S.etatEnvoi.modeles_suspendus = [...o.modeles_suspendus]
      if (o.quotas) for (const [k, v] of Object.entries(o.quotas)) { if (v === null) S.quotas.delete(k); else S.quotas.set(k, v) }
      if (o.reponses_recues) for (const r of o.reponses_recues) {
        const id = r.id || nouvelId('reponse')
        S.reponses.set(id, { envoi_id: null, conversation_id: null, prospect_id: null, canal: 'email_sollicite', source: 'courriel', texte: '', auto: false, accuse_site: false, en_reponse_a: null, recu_le: iso(), classement: null, repondue: false, envoi_reponse_id: null, reclassee: false, actes_faits: false, ...cloner(r), id, id_externe: r.id_externe || `ext-${id}` })
      }
      if (o.conversations) for (const c of o.conversations) S.conversations.set(c.id, cloner(c))
      if (o.tranchees) for (const d of o.tranchees) S.tranchees.set(d.id, cloner(d))
      if (o.jauges) for (const [f, plafond] of Object.entries(o.jauges)) S.jauges.set(f, { fournisseur: f, consomme: 0, plafond, jour: jourParis(now()) })
      if ('releve_gmail_le' in o) S.etatEnvoi.releve_gmail_le = o.releve_gmail_le
      if (o.ads_archive) S.etatEnvoi.ads_archive = cloner(o.ads_archive)
    },
  })
  return m
}

// ── Le scénario du magasin : chaque règle, sur sa propre mise en scène ──────────────────────────────────────────────────────
/** Un envoi préparé minimal, complété par `x`. */
export function envoiEssai(x = {}) {
  return {
    prospect_id: null, type: 'premier_contact', canal: 'formulaire_site', envoyeur: 'facteur_usine', destinataire: 'https://atelier-temoin.invalid/contact',
    objet: null, texte: 'Texte Témoin', empreinte_texte: 'e'.repeat(64), modele_id: 'modele-temoin-v1', variante: 'B', fait_id: null, douleur_id: null,
    fil_envoi_id: null, conversation_id: null, preuve_demande: null, reference: null, ...x,
  }
}
export const VERDICTS_OK = Object.freeze({ j1: 'ok', j3: 'ok', j2: 'ok', j2_version: 'second-juge-temoin', raisons: [] })
export const prospectEssai = (n, x = {}) => ({ cle_dedup: `domaine:atelier-${n}-temoin.invalid`, source: 'ademe_rge', cible: 'artisan', siren: null, domaine: `atelier-${n}-temoin.invalid`, entreprise: `Atelier Témoin ${n}`, faits: [], canaux: [{ canal: 'formulaire_site', valeur: `https://atelier-${n}-temoin.invalid/contact`, url_source: `https://atelier-${n}-temoin.invalid/` }], froid: true, etape: 'verifie', technologie: 'contact_form_7', ...x })

/**
 * Les règles que le scénario doit couvrir, par clé : la liste que lit JP-6 (juges-026-acquisition-preuve) et l'auto-contrôle
 * des juges. Chaque clé est une ligne du scénario, jouée sur un magasin neuf.
 */
export const REGLES_JP6 = Object.freeze([
  'quota_absent', 'quota_nouveaux', 'formulaire_deja', 'relance_formulaire', 'froid_email_interdit', 'preuve_demande_absente',
  'quota', 'envoi_froid_ferme', 'verdicts', 'opposition_expiree', 'confirmation_stop', 'quota_reponses', 'rgpd_accepte',
  'rgpd_hors_demande', 'fenetre_fermee', 'lien_prepare_entrant',
])

/**
 * Le scénario propre du magasin : une ligne par règle, { cle, nom, attendu, obtenu, ok }. Une exception pendant une règle
 * est un échec de cette règle (« aucune de ces règles ne lève d'exception »).
 */
export async function scenario() {
  const lignes = []
  const verifier = async (cle, nom, attendu, f) => {
    let obtenu
    try { obtenu = await f() } catch (e) { obtenu = `exception : ${String(e && e.message).slice(0, 120)}` }
    const ok = typeof attendu === 'function' ? attendu(obtenu) : JSON.stringify(obtenu) === JSON.stringify(attendu)
    lignes.push({ cle, nom, attendu: typeof attendu === 'function' ? '(prédicat)' : attendu, obtenu, ok: !!ok })
  }
  const raison = (r) => (r && r.ok === false ? r.raison : r && r.ok ? 'ok' : r)

  // 1. canal sans ligne de quota
  {
    const m = creerMagasin()
    m.poserEtat({ interrupteurs: { envoi_froid: true }, quotas: { 'instagram|*': null } })
    const id = m.inserer(prospectEssai(1, { canaux: [{ canal: 'instagram', valeur: 'compte_temoin', url_source: 'https://atelier-1-temoin.invalid/' }] }))
    await verifier('quota_absent', 'un envoi sur un canal sans ligne de quota → quota_absent', 'quota_absent', async () => raison(await m.preparerEnvoi(envoiEssai({ prospect_id: id, canal: 'instagram', envoyeur: 'repondeur', destinataire: 'compte_temoin' }))))
  }
  // 2. le 6e premier contact formulaire au palier P0 ; et le formulaire fermé tant qu'aucun palier n'est appliqué
  {
    const m = creerMagasin()
    m.poserEtat({ interrupteurs: { envoi_froid: true } })
    const id0 = m.inserer(prospectEssai(0))
    await verifier('graine_formulaire', 'formulaire_site sans palier appliqué (graine 0 de 0096) → quota_nouveaux', 'quota_nouveaux', async () => raison(await m.preparerEnvoi(envoiEssai({ prospect_id: id0 }))))
    m.poserEtat({ palier: 'P0' })
    const r = []
    for (let i = 1; i <= 6; i++) { const id = m.inserer(prospectEssai(i)); r.push(raison(await m.preparerEnvoi(envoiEssai({ prospect_id: id, destinataire: `https://atelier-${i}-temoin.invalid/contact` })))) }
    await verifier('quota_nouveaux', 'le 6e premier contact formulaire_site au palier P0 (5 par jour) → quota_nouveaux, les 5 premiers passent', ['ok', 'ok', 'ok', 'ok', 'ok', 'quota_nouveaux'], async () => r)
    m.horloge.avancer(24 * 3600_000)
    const id7 = m.inserer(prospectEssai(7))
    await verifier('quota_lendemain', 'le lendemain (jour de Paris), le compteur repart → ok', 'ok', async () => raison(await m.preparerEnvoi(envoiEssai({ prospect_id: id7, destinataire: 'https://atelier-7-temoin.invalid/contact' }))))
  }
  // 3. un formulaire par entreprise, à vie (même SIREN, autre prospect ; même domaine)
  {
    const m = creerMagasin()
    m.poserEtat({ palier: 'P0', interrupteurs: { envoi_froid: true } })
    const a = m.inserer(prospectEssai('a', { siren: '812345601' }))
    const b = m.inserer(prospectEssai('b', { siren: '812345601' }))
    const r1 = raison(await m.preparerEnvoi(envoiEssai({ prospect_id: a })))
    await verifier('formulaire_deja', 'un second premier_contact formulaire_site à la même entreprise (même SIREN, autre prospect) → formulaire_deja', ['ok', 'formulaire_deja'], async () => [r1, raison(await m.preparerEnvoi(envoiEssai({ prospect_id: b })))])
    const c = m.inserer(prospectEssai('c', { siren: null, domaine: 'atelier-a-temoin.invalid', cle_dedup: 'page_meta:1000001' }))
    await verifier('formulaire_deja_domaine', 'même domaine, autre prospect → formulaire_deja', 'formulaire_deja', async () => raison(await m.preparerEnvoi(envoiEssai({ prospect_id: c }))))
  }
  // 4. relance formulaire, premier contact e-mail, e-mail sans preuve, accusé de site
  {
    const m = creerMagasin()
    m.poserEtat({ palier: 'P0', interrupteurs: { envoi_froid: true } })
    const id = m.inserer(prospectEssai(1, { etape: 'envoye' }))
    await verifier('relance_formulaire', 'une relance formulaire_site → relance_formulaire', 'relance_formulaire', async () => raison(await m.preparerEnvoi(envoiEssai({ prospect_id: id, type: 'relance' }))))
    await verifier('froid_email_interdit', 'un premier_contact email_sollicite → froid_email_interdit', 'froid_email_interdit', async () => raison(await m.preparerEnvoi(envoiEssai({ prospect_id: id, canal: 'email_sollicite', envoyeur: 'gmail', destinataire: 'artisan@atelier-1-temoin.invalid' }))))
    await verifier('preuve_demande_absente', 'un email_sollicite sans preuve de demande → preuve_demande_absente', 'preuve_demande_absente', async () => raison(await m.preparerEnvoi(envoiEssai({ prospect_id: id, type: 'reponse', canal: 'email_sollicite', envoyeur: 'gmail', destinataire: 'artisan@atelier-1-temoin.invalid' }))))
    m.poserEtat({ reponses_recues: [{ id: 'reponse-accuse', prospect_id: id, accuse_site: true, auto: true, texte: 'Accusé Témoin' }] })
    await verifier('accuse_site', 'un accusé de site n\'est jamais une preuve de demande → preuve_demande_absente', 'preuve_demande_absente', async () => raison(await m.preparerEnvoi(envoiEssai({ prospect_id: id, type: 'reponse', canal: 'email_sollicite', envoyeur: 'gmail', destinataire: 'artisan@atelier-1-temoin.invalid', preuve_demande: { type: 'message_recu', id: 'reponse-accuse' } }))))
  }
  // 5. le 51e email_sollicite du jour
  {
    const m = creerMagasin()
    const r = []
    for (let i = 1; i <= 51; i++) {
      const id = m.inserer(prospectEssai(i, { etape: 'oui' }))
      m.poserEtat({ reponses_recues: [{ id: `reponse-oui-${i}`, prospect_id: id, texte: 'Oui Témoin' }] })
      r.push(raison(await m.preparerEnvoi(envoiEssai({ prospect_id: id, type: 'lien_maquette', canal: 'email_sollicite', envoyeur: 'gmail', destinataire: `artisan@atelier-${i}-temoin.invalid`, preuve_demande: { type: 'message_recu', id: `reponse-oui-${i}` } }))))
    }
    await verifier('quota', 'le 51e email_sollicite du jour → quota, les 50 premiers passent', (o) => Array.isArray(o) && o.slice(0, 50).every((x) => x === 'ok') && o[50] === 'quota', async () => r)
  }
  // 6. l'interrupteur envoi_froid, fermé par défaut
  {
    const m = creerMagasin()
    m.poserEtat({ palier: 'P0' })
    const id = m.inserer(prospectEssai(1))
    await verifier('envoi_froid_ferme', 'envoi_froid fermé (défaut) → envoi_froid_ferme', 'envoi_froid_ferme', async () => raison(await m.preparerEnvoi(envoiEssai({ prospect_id: id }))))
  }
  // 7. les trois verdicts, le modèle suspendu
  {
    const m = creerMagasin()
    m.poserEtat({ palier: 'P0', interrupteurs: { envoi_froid: true } })
    const id = m.inserer(prospectEssai(1))
    const e = await m.preparerEnvoi(envoiEssai({ prospect_id: id }))
    await verifier('verdicts', 'approuverEnvoi sans j2 → verdicts', 'verdicts', async () => raison(await m.approuverEnvoi(e.id, { j1: 'ok', j3: 'ok', j2_version: null, raisons: [] })))
    await verifier('verdicts_j1', 'approuverEnvoi d\'un premier contact avec j1 sans_objet → verdicts', 'verdicts', async () => raison(await m.approuverEnvoi(e.id, { ...VERDICTS_OK, j1: 'sans_objet' })))
    m.poserEtat({ modeles_suspendus: ['modele-temoin-v1'] })
    await verifier('modele_suspendu', 'approuverEnvoi d\'un modèle suspendu → modele_suspendu', 'modele_suspendu', async () => raison(await m.approuverEnvoi(e.id, VERDICTS_OK)))
    m.poserEtat({ modeles_suspendus: [] })
    await verifier('approuve', 'approuverEnvoi avec les trois verdicts → ok', 'ok', async () => raison(await m.approuverEnvoi(e.id, VERDICTS_OK)))
  }
  // 8. opposition temporaire, puis expirée ; opposition définitive ; confirmation_stop
  {
    const m = creerMagasin()
    m.poserEtat({ palier: 'P0', interrupteurs: { envoi_froid: true } })
    const id = m.inserer(prospectEssai(1, { siren: '812345601' }))
    await m.opposer({ siren: '812345601' }, 'pas_maintenant', 'essai', new Date(m.horloge.maintenant() + 3600_000).toISOString())
    await verifier('opposition_temporaire', 'opposition temporaire en cours → opposition, étape inchangée', ['opposition', 'verifie'], async () => [raison(await m.preparerEnvoi(envoiEssai({ prospect_id: id }))), m.lireProspect(id).etape])
    m.horloge.avancer(2 * 3600_000)
    await verifier('opposition_expiree', 'une opposition temporaire expirée ne bloque plus', [false, 'ok'], async () => [await m.estOppose({ siren: '812345601' }), raison(await m.preparerEnvoi(envoiEssai({ prospect_id: id })))])
    const m1 = creerMagasin()
    m1.poserEtat({ palier: 'P0', interrupteurs: { envoi_froid: true } })
    const id1 = m1.inserer(prospectEssai(4))
    const e1 = await m1.preparerEnvoi(envoiEssai({ prospect_id: id1, destinataire: 'https://atelier-4-temoin.invalid/contact' }))
    await m1.opposer({ domaine: 'www.Atelier-4-Temoin.invalid' }, 'stop', 'standardiste')
    await verifier('opposition_definitive', 'une opposition définitive (clé normalisée) : prospect à oppose, envoi préparé annulé', ['oppose', 'annule'], async () => [m1.lireProspect(id1).etape, m1.etat().envois.find((x) => x.id === e1.id).statut])
    const m2 = creerMagasin()
    const id2 = m2.inserer(prospectEssai(2, { etape: 'envoye' }))
    m2.poserEtat({ reponses_recues: [{ id: 'reponse-stop', prospect_id: id2, texte: 'STOP' }] })
    await m2.opposer({ domaine: 'atelier-2-temoin.invalid' }, 'stop', 'standardiste')
    const conf = envoiEssai({ prospect_id: id2, type: 'confirmation_stop', canal: 'email_sollicite', envoyeur: 'gmail', destinataire: 'artisan@atelier-2-temoin.invalid', preuve_demande: { type: 'message_recu', id: 'reponse-stop' } })
    await verifier('confirmation_stop', 'confirmation_stop : la première passe malgré l\'opposition, la seconde → confirmation_stop', ['ok', 'confirmation_stop'], async () => [raison(await m2.preparerEnvoi(conf)), raison(await m2.preparerEnvoi(conf))])
    const m3 = creerMagasin()
    const id3 = m3.inserer(prospectEssai(3, { etape: 'envoye' }))
    m3.poserEtat({ reponses_recues: [{ id: 'reponse-stop-3', prospect_id: id3, texte: 'STOP' }] })
    await m3.opposer({ domaine: 'atelier-3-temoin.invalid' }, 'stop', 'standardiste')
    m3.horloge.avancer(25 * 3600_000)
    await verifier('confirmation_stop_24h', 'confirmation_stop plus de 24 h après l\'opposition → confirmation_stop', 'confirmation_stop', async () => raison(await m3.preparerEnvoi(envoiEssai({ prospect_id: id3, type: 'confirmation_stop', canal: 'email_sollicite', envoyeur: 'gmail', destinataire: 'artisan@atelier-3-temoin.invalid', preuve_demande: { type: 'message_recu', id: 'reponse-stop-3' } }))))
  }
  // 9. le filet des réponses
  {
    const m = creerMagasin()
    const id = m.inserer(prospectEssai(1, { etape: 'oui' }))
    m.poserEtat({ reponses_recues: [{ id: 'reponse-q', prospect_id: id, texte: 'Question Témoin' }] })
    const r = []
    for (let i = 0; i < 4; i++) { r.push(raison(await m.preparerEnvoi(envoiEssai({ prospect_id: id, type: 'reponse', canal: 'email_sollicite', envoyeur: 'gmail', destinataire: 'artisan@atelier-1-temoin.invalid', preuve_demande: { type: 'message_recu', id: 'reponse-q' } })))); m.horloge.avancer(60_000) }
    await verifier('quota_reponses', 'la 4e reponse email_sollicite au même prospect en 24 h → quota_reponses', ['ok', 'ok', 'ok', 'quota_reponses'], async () => r)
  }
  // 10. reponse_rgpd
  {
    const m = creerMagasin()
    const id = m.inserer(prospectEssai(1, { etape: 'envoye' }))
    m.poserEtat({ reponses_recues: [{ id: 'reponse-rgpd', prospect_id: id, texte: 'Mes données Témoin', recu_le: new Date(m.horloge.maintenant() - 3 * 86_400_000).toISOString(), classement: { classe: 'rgpd', source: 'regle' } }] })
    await m.opposer({ domaine: 'atelier-1-temoin.invalid' }, 'rgpd', 'standardiste')
    const rgpd = envoiEssai({ prospect_id: id, type: 'reponse_rgpd', canal: 'email_sollicite', envoyeur: 'gmail', destinataire: 'artisan@atelier-1-temoin.invalid', preuve_demande: { type: 'message_recu', id: 'reponse-rgpd' } })
    await verifier('rgpd_accepte', 'une reponse_rgpd à un opposant qui a fait une demande il y a 3 jours → acceptée', 'ok', async () => raison(await m.preparerEnvoi(rgpd)))
    const m2 = creerMagasin()
    const id2 = m2.inserer(prospectEssai(2, { etape: 'envoye' }))
    m2.poserEtat({ reponses_recues: [{ id: 'reponse-autre', prospect_id: id2, texte: 'Autre Témoin', classement: { classe: 'question', source: 'regle' } }] })
    await m2.opposer({ domaine: 'atelier-2-temoin.invalid' }, 'stop', 'standardiste')
    await verifier('rgpd_hors_demande', 'une reponse_rgpd sans demande → rgpd_hors_demande', 'rgpd_hors_demande', async () => raison(await m2.preparerEnvoi(envoiEssai({ prospect_id: id2, type: 'reponse_rgpd', canal: 'email_sollicite', envoyeur: 'gmail', destinataire: 'artisan@atelier-2-temoin.invalid', preuve_demande: { type: 'message_recu', id: 'reponse-autre' } }))))
  }
  // 11. la fenêtre de Meta
  {
    const m = creerMagasin()
    m.poserEtat({ conversations: [{ id: 'conv-temoin', plateforme: 'instagram', pseudo: 'pseudo_temoin', suit_le_compte: true, fenetre_jusqua: null, meta_id: '5550001' }], reponses_recues: [{ id: 'reponse-meta', conversation_id: 'conv-temoin', canal: 'messagerie', source: 'meta', texte: 'Bonjour Témoin', recu_le: new Date(m.horloge.maintenant() - 25 * 3600_000).toISOString() }] })
    await verifier('fenetre_fermee', 'un message messagerie 25 h après le dernier message reçu → fenetre_fermee', 'fenetre_fermee', async () => raison(await m.preparerEnvoi(envoiEssai({ type: 'reponse', canal: 'messagerie', envoyeur: 'repondeur', destinataire: '5550001', conversation_id: 'conv-temoin' }))))
    m.poserEtat({ reponses_recues: [{ id: 'reponse-meta-2', conversation_id: 'conv-temoin', canal: 'messagerie', source: 'meta', texte: 'Encore Témoin', recu_le: new Date(m.horloge.maintenant() - 3600_000).toISOString() }] })
    await verifier('fenetre_ouverte', 'un message messagerie 1 h après le dernier message reçu → accepté', 'ok', async () => raison(await m.preparerEnvoi(envoiEssai({ type: 'reponse', canal: 'messagerie', envoyeur: 'repondeur', destinataire: '5550001', conversation_id: 'conv-temoin' }))))
  }
  // 12. le lien de maquette d'un entrant (preuve : la case cochée de sa demande, 0099)
  {
    const m = creerMagasin()
    const id = m.inserer(prospectEssai(1, { source: 'entrant', froid: false, etape: 'maquette_prete', canaux: [{ canal: 'email_sollicite', valeur: 'artisan@atelier-1-temoin.invalid', url_source: 'formulaire:demande-temoin', nature: 'donnee_par_la_personne', case_cochee_le: new Date(m.horloge.maintenant() - 600_000).toISOString() }] }))
    await verifier('lien_prepare_entrant', 'un lien_maquette d\'entrant fait passer maquette_prete à lien_prepare', ['ok', 'lien_prepare'], async () => [raison(await m.preparerEnvoi(envoiEssai({ prospect_id: id, type: 'lien_maquette', canal: 'email_sollicite', envoyeur: 'gmail', destinataire: 'artisan@atelier-1-temoin.invalid', preuve_demande: { type: 'case_entrant', id } }))), m.lireProspect(id).etape])
  }
  // 13. bail, tentatives, transitions, cle_dedup, enregistrement, idempotence
  {
    const m = creerMagasin()
    await m.enregistrerCandidats([{ ...prospectEssai(1), etape: undefined }])
    const [p] = await m.reserver('candidat', 5, 300)
    for (let i = 0; i < 2; i++) { m.horloge.avancer(301_000); await m.reserver('candidat', 5, 300) }
    m.horloge.avancer(301_000)
    await verifier('a_decider', 'trois baux expirés sans écriture → a_decider', 'a_decider', async () => m.lireProspect(p.id).etape)
    const q = m.inserer(prospectEssai(2, { etape: 'candidat' }))
    await verifier('etape_changee', 'mettreAJour depuis une étape qui a changé → false', false, async () => m.mettreAJour(q, 'recense', 'verifie', {}))
    await verifier('transition_interdite', 'une transition hors de TRANSITIONS → false, rien n\'est écrit', [false, 'candidat'], async () => [await m.mettreAJour(q, 'candidat', 'envoye', {}), m.lireProspect(q).etape])
    await verifier('cle_dedup', 'une cle_dedup hors contrainte → erreur 23514', '23514', async () => { try { await m.enregistrerCandidats([{ ...prospectEssai(3), cle_dedup: 'meta:1234' }]); return 'accepté' } catch (e) { return e.code } })
    await m.enregistrerCandidats([{ ...prospectEssai(5), etape: undefined, source: 'entrant', froid: true }, { ...prospectEssai(6), etape: undefined, entreprise: 'Atelier Témoin Filiot', froid: true }])
    const ents = m.etat().prospects.filter((x) => ['domaine:atelier-5-temoin.invalid', 'domaine:atelier-6-temoin.invalid'].includes(x.cle_dedup)).map((x) => x.froid)
    await verifier('froid_force', 'un entrant ou un nom de proche est enregistré froid = false', [false, false], async () => ents)
    m.poserEtat({ oppositions: [{ domaine: 'atelier-8-temoin.invalid' }] })
    await m.enregistrerCandidats([{ ...prospectEssai(8), etape: undefined }])
    await verifier('oppose_a_l_enregistrement', 'un candidat dont une clé est en opposition active est enregistré à oppose', 'oppose', async () => m.etat().prospects.find((x) => x.cle_dedup === 'domaine:atelier-8-temoin.invalid').etape)
    const r1 = await m.reponseRecue({ id_externe: 'ext-temoin-1', envoi_id: null, conversation_id: null, prospect_id: q, canal: 'email_sollicite', source: 'courriel', texte: 'Oui Témoin', auto: false, accuse_site: false, en_reponse_a: null, recu_le: new Date(m.horloge.maintenant()).toISOString() })
    const r2 = await m.reponseRecue({ id_externe: 'ext-temoin-1', envoi_id: null, conversation_id: null, prospect_id: q, canal: 'email_sollicite', source: 'courriel', texte: 'Oui Témoin', auto: false, accuse_site: false, en_reponse_a: null, recu_le: new Date(m.horloge.maintenant()).toISOString() })
    await verifier('reponse_idempotente', 'reponseRecue idempotente par id_externe', [true, false, true], async () => [r1.nouvelle, r2.nouvelle, r1.id === r2.id])
  }
  return lignes
}
