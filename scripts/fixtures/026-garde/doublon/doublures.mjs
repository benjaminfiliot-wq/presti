// scripts/fixtures/026-garde/doublon/doublures.mjs — les doublures du juge garde-doublon-qa, écrites par Claude Code : une BASE en
// mémoire qui applique la règle de réservation (la règle de la migration à venir, lue dans le cahier du juge), un Gmail et un
// Meta factices, un chronomètre commun. Aucun réseau, aucune donnée réelle : les adresses sont en .invalid.
//
// La base est ATOMIQUE comme la base réelle : reserverEnvoi ne contient aucun `await`, donc rien ne s'intercale entre le test
// du statut et son écriture. En revanche envoisApprouves CÈDE la main (setImmediate) : deux exécutions concurrentes y lisent
// toutes deux la ligne avant qu'aucune ne la réserve, ce qui est exactement la course que GD-3 éprouve.
//
// Contrat du Magasin que le juge exige du Facteur (à ajouter à MagasinEnvoi de contrat.ts et à magasinSupabase.ts) :
//   reserverEnvoi(id, cle)        → { ok: true } | { ok: false, raison: 'deja_reserve' | 'statut' | 'pause' | 'plafond' | … }
//   marquerIncertain(id, raison)  → void      (en_cours_envoi → envoi_incertain ; jamais de retour à approuve)
// et, inchangés : envoisApprouves, marquerEnvoye, marquerEchec (un refus NET : rien n'est parti → l'envoi est relâché),
// evenement, signal, etatEnvoi, conversation, annulerEnvoi.
import { createHash } from 'node:crypto'
import { creerHorloge } from '../../026-acquisition/horloge-factice.mjs'

export const T0 = Date.parse('2026-10-14T08:00:00.000Z')
export const QUART_D_HEURE = 15 * 60_000
export const JOUR = 24 * 3600_000
const PARIS = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' })
export const jourParis = (ms) => PARIS.format(new Date(ms))
const cloner = (o) => (o === undefined ? undefined : structuredClone(o))
const cederLaMain = () => new Promise((r) => setImmediate(r))
const VIDE = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'

/** La formule commune TS et SQL de la clé d'idempotence (ops.cle_envoi de la migration). */
export const cleAttendue = ({ destinataire, modele_id, fait_id }) => createHash('sha256').update(`${String(destinataire).trim().toLowerCase()}|${modele_id}|${fait_id ?? 'sans_fait'}`, 'utf8').digest('hex')

export function chronometre() {
  let n = 0
  return { tic: () => ++n, n: () => n }
}

/** Une ligne `approuve` complète (forme de EnvoiApprouve + en_reponse_a/references que lit acq_envois_approuves). */
export function ligne(n, surcharges = {}) {
  return {
    id: `env-${String(n).padStart(4, '0')}`, prospect_id: `pro-${n}`, type: 'reponse', canal: 'email_sollicite', envoyeur: 'gmail',
    destinataire: `contact${n}@entreprise-essai-${n}.invalid`, objet: `Re: votre demande ${n}`, texte: `Bonjour, voici la réponse numéro ${n}. Réf. AB${String(n).padStart(2, '0')}CD`,
    empreinte_texte: createHash('sha256').update(`texte-${n}`).digest('hex'), modele_id: 'reponse_v1', variante: null, fait_id: `fait${String(n).padStart(12, '0')}`,
    douleur_id: null, fil_envoi_id: null, conversation_id: null, preuve_demande: { type: 'message_recu', id: `rep-${n}` }, reference: `AB${String(n).padStart(2, '0')}CD`,
    verdicts: { j1: 'ok', j2: 'ok', j3: 'ok', j2_version: 'v1', raisons: [] }, prepare_le: new Date(T0 - 3600_000).toISOString(),
    en_reponse_a: `<recu-${n}@mail-essai.invalid>`, references: `<fil-${n}@mail-essai.invalid>`, statut: 'approuve', ...surcharges,
  }
}
export const ligneMeta = (n, surcharges = {}) => ligne(n, { canal: 'messagerie', envoyeur: 'repondeur', destinataire: `meta-${n}-essai`, conversation_id: `conv-${n}`, preuve_demande: null, en_reponse_a: undefined, references: undefined, ...surcharges })
export const ligneFormulaire = (n, surcharges = {}) => ligne(n, { canal: 'formulaire_site', envoyeur: 'facteur_usine', type: 'premier_contact', destinataire: `https://entreprise-essai-${n}.invalid/contact`, preuve_demande: null, en_reponse_a: undefined, references: undefined, ...surcharges })

/**
 * La base en mémoire. `options` : { horloge, chrono, quotas: { canal: plafond_jour }, pause, pannes: { methode: true },
 *   pauseApresLecture (la pause s'active juste après la lecture des envois approuvés : la course pause/réservation) }.
 */
export function creerBase({ horloge = creerHorloge(T0), chrono = chronometre(), quotas = {}, pause = false, pannes = {}, pauseApresLecture = false, lignes = [] } = {}) {
  const S = { envois: new Map(), cles: new Map(), evenements: [], signaux: [], decisions: [], conversations: new Map(), quotas: { ...quotas }, pause, pannes: { ...pannes }, pauseApresLecture }
  const journal = []
  const note = (methode, detail = {}) => { journal.push({ seq: chrono.tic(), methode, ...cloner(detail) }) }
  const panne = (m) => { if (S.pannes[m]) throw Object.assign(new Error(`base d'essai injoignable (${m})`), { code: '08006' }) }
  const maintenant = () => horloge.maintenant()
  for (const l of lignes) S.envois.set(l.id, { tentatives: 0, cle_envoi: null, reserve_le: null, envoye_le: null, ...cloner(l) })
  const aujourdhui = (e) => e.reserve_le && jourParis(Date.parse(e.reserve_le)) === jourParis(maintenant())
  const EXEMPT = (e) => e.canal === 'essai_e2e' && String(e.destinataire ?? '').toLowerCase().endsWith('.invalid')

  const base = {
    // ── lectures ──
    async etatEnvoi() {
      note('etatEnvoi')
      return { palier: 'P0', envoi_froid: true, formulaire_coupe_jusqua: null, gmail_coupe_jusqua: null, meta_coupe_jusqua: null, technologies: [], modeles_suspendus: [], notice_verifiee_le: null, bilan_le: null, releve_gmail_le: null, ads_archive: { permis: false, le: null } }
    },
    async enPause() { note('enPause'); return S.pause },
    async modelesSuspendus() { return [] },
    async jaugeConsommer() { return true },
    async envoisApprouves(canal, limite) {
      note('envoisApprouves', { canal })
      panne('envoisApprouves')
      if (canal === 'formulaire_site') throw Object.assign(new Error('ops:formulaire_site'), { code: 'P0001' }) // réservé au porteur de l'usine, comme acq_envois_approuves
      const lignes = [...S.envois.values()].filter((e) => e.canal === canal && e.statut === 'approuve').slice(0, Math.max(0, limite ?? 1)).map(cloner)
      await cederLaMain()
      if (S.pauseApresLecture) S.pause = true
      return lignes
    },
    async conversation(id) {
      note('conversation', { id })
      const c = S.conversations.get(id)
      return c ? cloner(c) : null
    },
    // ── la réservation : ATOMIQUE (aucun await entre le test et l'écriture) ──
    async reserverEnvoi(id, cle) {
      note('reserverEnvoi', { id, cle })
      panne('reserverEnvoi')
      const e = S.envois.get(id)
      if (!e) return { ok: false, raison: 'introuvable' }
      if (S.pause) return { ok: false, raison: 'pause' }
      const plafond = S.quotas[e.canal]
      if (typeof plafond === 'number') {
        const n = [...S.envois.values()].filter((x) => x.canal === e.canal && x.id !== e.id && ['en_cours_envoi', 'envoye', 'envoi_incertain'].includes(x.statut) && aujourdhui(x)).length
        if (n >= plafond) return { ok: false, raison: 'plafond' }
      }
      if (typeof cle !== 'string' || !cle) return { ok: false, raison: 'cle' }
      if (S.cles.has(cle) && S.cles.get(cle) !== id) return { ok: false, raison: 'deja_reserve' } // l'index unique de cle_envoi
      if (e.statut !== 'approuve') return { ok: false, raison: 'statut' }
      e.statut = 'en_cours_envoi'; e.cle_envoi = cle; e.reserve_le = new Date(maintenant()).toISOString()
      S.cles.set(cle, id)
      return { ok: true }
    },
    async marquerEnvoye(id, preuve) {
      note('marquerEnvoye', { id })
      panne('marquerEnvoye')
      const e = S.envois.get(id)
      if (!e) throw new Error('introuvable')
      // La base refuse envoye hors réservation ; seule exemption : le canal d'essai vers un destinataire .invalid.
      if (!(e.statut === 'en_cours_envoi' && e.cle_envoi) && !EXEMPT(e)) throw Object.assign(new Error('ops:envoye_sans_reservation'), { code: 'P0001' })
      e.statut = 'envoye'; e.envoye_le = new Date(maintenant()).toISOString(); e.id_externe = preuve?.id_externe ?? null
    },
    async marquerIncertain(id, raison) {
      note('marquerIncertain', { id, raison })
      panne('marquerIncertain')
      const e = S.envois.get(id)
      if (e && e.statut === 'en_cours_envoi') e.statut = 'envoi_incertain'
    },
    /** Un refus NET (rien n'est parti) : l'envoi réservé est relâché (la clé libérée) ; trois échecs l'annulent. */
    async marquerEchec(id, raison) {
      note('marquerEchec', { id, raison })
      panne('marquerEchec')
      const e = S.envois.get(id)
      if (!e) return
      e.tentatives++
      if (e.statut === 'en_cours_envoi') { S.cles.delete(e.cle_envoi); e.cle_envoi = null; e.reserve_le = null; e.statut = 'approuve' }
      if (e.tentatives >= 3) e.statut = 'annule'
    },
    async annulerEnvoi(id, raison) {
      note('annulerEnvoi', { id, raison })
      const e = S.envois.get(id)
      if (e && e.statut === 'approuve') e.statut = 'annule'
    },
    async evenement(ev) {
      note('evenement', { type: ev?.type })
      panne('evenement')
      if (!ev || typeof ev.resume !== 'string' || ev.resume.length > 200) throw Object.assign(new Error('violates check constraint "evenements_resume_check"'), { code: '23514' })
      S.evenements.push({ ...cloner(ev), seq: chrono.n() })
    },
    async signal(s) { note('signal', { type: s?.type }); S.signaux.push(cloner(s)) },
    async creerDecision(d) { note('creerDecision', { type: d?.type }); S.decisions.push(cloner(d)); return { id: `dec-${S.decisions.length}`, cree: true } },
    // ── le contrôle (hors contrat du Facteur) : réconcilie un envoi incertain, sans jamais le renvoyer ──
    reconcilier(id, resultat, preuve = {}) {
      const e = S.envois.get(id)
      if (!e || e.statut !== 'envoi_incertain') return { ok: false }
      if (resultat === 'parti') { e.statut = 'envoye'; e.envoye_le = new Date(maintenant()).toISOString(); e.id_externe = preuve.id_externe ?? null; return { ok: true } }
      if (resultat === 'pas_parti') { e.statut = 'annule'; return { ok: true } }
      return { ok: false }
    },
    // ── mise en scène et inspection ──
    poser(l) { S.envois.set(l.id, { tentatives: 0, cle_envoi: null, reserve_le: null, envoye_le: null, ...cloner(l) }) },
    poserConversation(c) { S.conversations.set(c.id, cloner(c)) },
    /** Un envoi déjà parti aujourd'hui (ou à la date donnée), compté au plafond. */
    poserParti(l, leMs = maintenant()) { S.envois.set(l.id, { tentatives: 0, ...cloner(l), statut: 'envoye', cle_envoi: cleAttendue(l), reserve_le: new Date(leMs).toISOString() }); S.cles.set(cleAttendue(l), l.id) },
    mettrePause(v) { S.pause = !!v },
    mettrePanne(m, v = true) { S.pannes[m] = !!v },
    pauseApresLecture(v) { S.pauseApresLecture = !!v },
    etat(id) { const e = S.envois.get(id); return e ? cloner(e) : null },
    etatParDestinataire(a) { const e = [...S.envois.values()].find((x) => x.destinataire === a); return e ? { id: e.id, statut: e.statut, cle_envoi: e.cle_envoi } : null },
    statuts() { return Object.fromEntries([...S.envois.values()].map((e) => [e.id, e.statut])) },
    get evenements() { return S.evenements },
    get signaux() { return S.signaux },
    get journal() { return journal },
    get cles() { return S.cles },
    reservations() { return journal.filter((j) => j.methode === 'reserverEnvoi') },
  }
  return base
}

/** Un Gmail factice (canal email_sollicite). `mode` : ok | auth | quota | injoignable | injoignable_apres_envoi | leve | lent. */
export function creerGmail({ chrono, base, mode = 'ok', delaiMs = 0 } = {}) {
  const appels = [], livres = []
  let n = 0
  const p = {
    canal: 'email_sollicite',
    appels, livres,
    modeEnCours: mode,
    async envoyer(m) {
      appels.push({ seq: chrono.tic(), a: m.a, objet: m.objet, etatBase: base.etatParDestinataire(m.a) })
      if (delaiMs) await new Promise((r) => setTimeout(r, delaiMs)); else await cederLaMain()
      const mo = p.modeEnCours
      if (mo === 'auth') return { ok: false, erreur: 'auth', definitif: true }
      if (mo === 'quota') return { ok: false, erreur: 'quota', definitif: true }
      if (mo === 'injoignable') return { ok: false, erreur: 'injoignable', definitif: false }
      if (mo === 'leve') throw new Error('transport : connexion coupée')
      livres.push({ a: m.a, objet: m.objet })
      if (mo === 'injoignable_apres_envoi') return { ok: false, erreur: 'injoignable', definitif: false } // le message est PARTI, l'accusé non
      n++
      return { ok: true, id_externe: `<envoye-${n}@presti-essai.invalid>`, entetes: { 'Message-ID': `<envoye-${n}@presti-essai.invalid>` } }
    },
  }
  return p
}

/** Un Meta factice : message() et reponsePrivee() rendent { ok: true, id } ou { ok: false, raison }. */
export function creerMeta({ chrono, base, mode = 'ok' } = {}) {
  const appels = [], livres = []
  let n = 0
  const sortie = async (cle, a, texte) => {
    appels.push({ seq: chrono.tic(), cle, a, etatBase: base.etatParDestinataire(a) })
    await cederLaMain()
    if (mode === 'debit') return { ok: false, raison: 'debit' }
    if (mode === 'autre') return { ok: false, raison: 'autre' }
    livres.push({ a, texte })
    return { ok: true, id: `mid-essai-${++n}` }
  }
  return {
    appels, livres,
    message: ({ meta_id, texte }) => sortie('message', meta_id, texte),
    reponsePrivee: ({ commentaire_id, texte }) => sortie('reponsePrivee', String(commentaire_id).replace(/^com-/, ''), texte), // com-<destinataire> : la conversation posée par monter()
  }
}

/** Le monde complet d'un scénario. `run(extra)` joue UNE passe d'envoi du Facteur jugé et rend { bilan, erreur }. */
export function monter(mod, { lignes = [], gmail: modeGmail = 'ok', meta: modeMeta = 'ok', delaiGmailMs = 0, sansGmail = false, sansMeta = false, ...optionsBase } = {}) {
  const horloge = optionsBase.horloge ?? creerHorloge(T0)
  const chrono = chronometre()
  const base = creerBase({ ...optionsBase, horloge, chrono, lignes })
  for (const l of lignes) if (l.conversation_id && !base.journal.length) base.poserConversation({ id: l.conversation_id, plateforme: 'instagram', pseudo: 'essai', suit_le_compte: true, fenetre_jusqua: new Date(T0 + 10 * 3600_000).toISOString(), commentaire_id: `com-${l.destinataire}`, reponse_privee_jusqua: new Date(T0 + 5 * JOUR).toISOString(), meta_id: l.destinataire })
  const gmail = creerGmail({ chrono, base, mode: modeGmail, delaiMs: delaiGmailMs })
  const meta = creerMeta({ chrono, base, mode: modeMeta })
  const deps = () => ({ magasin: base, gmail: sansGmail ? null : gmail, meta: sansMeta ? null : meta, horloge, echeance: horloge.maintenant() + 45_000, passe: 'envoi', adresseReponse: 'prospection@presti-essai.invalid', notice: { html: '<p>notice</p>', mentions: '<p>mentions</p>' } })
  return {
    base, gmail, meta, horloge, chrono,
    async run(extra = {}) {
      try { return { bilan: await mod.executerFacteur({ ...deps(), ...extra }), erreur: null } } catch (err) { return { bilan: null, erreur: String(err?.message ?? err).split('\n')[0] } }
    },
    /** `n` passes espacées d'un quart d'heure (le cron du Facteur), la base saine. */
    async passes(n = 4) {
      const sorties = []
      for (let i = 0; i < n; i++) { horloge.avancer(QUART_D_HEURE); sorties.push(await this.run()) }
      return sorties
    },
  }
}
export { VIDE }
