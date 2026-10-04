// Sonde du juge sav-qa (026-244) : importe le module jugé dans CE processus, dont le réseau et les écritures de fichiers sont
// piégés, l'exerce sur le jeu d'essai (messages/corpus.json, gabarits.json, compteur.json, lecteur-factice.mjs) et imprime UNE ligne
// JSON { resultats: { 'SAV-n': { ok, detail? } } }. Le contrat de banc (noms, arguments, retours) est dans CONTRAT.md, même dossier.
// Usage : node --import scripts/ts-loader.mjs sonde.mjs <chemin du module> [<chemin d'un lecteur factice de remplacement>]
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import https from 'node:https'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { syncBuiltinESMExports } from 'node:module'

const DIR = path.dirname(fileURLToPath(import.meta.url))
const json = f => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'))
const corpus = json('messages/corpus.json'), gab = json('gabarits.json'), compteur = json('compteur.json')
const L = await import(process.argv[3] ? pathToFileURL(path.resolve(process.argv[3])).href : pathToFileURL(path.join(DIR, 'lecteur-factice.mjs')).href)

const appels = [], violations = []
const rapport = {}

// ── pièges : tout réseau, toute écriture de fichier, tout envoi est consigné puis refusé. Le module n'a aucune raison d'en faire. ──
const interdit = (...args) => { appels.push({ type: 'reseau', args: args.map(String) }); throw Error('réseau interdit') }
globalThis.fetch = interdit; http.request = interdit; http.get = interdit; https.request = interdit; https.get = interdit
const ecriture = (...args) => { appels.push({ type: 'ecriture', chemin: String(args[0]) }); throw Error('écriture de fichier interdite dans le module') }
for (const nom of ['writeFile', 'appendFile', 'copyFile', 'cp', 'rename', 'rm', 'rmdir', 'unlink', 'truncate', 'symlink']) {
  for (const objet of [fs, fs.promises]) if (typeof objet[nom] === 'function') objet[nom] = ecriture
  if (typeof fs[`${nom}Sync`] === 'function') fs[`${nom}Sync`] = ecriture
}
syncBuiltinESMExports()
const envoiPiege = (...args) => { appels.push({ type: 'envoi', args: args.map(a => typeof a) }); throw Error('envoi interdit au module : le portier est Benj (file de brouillons du Poste)') }

// ── utilitaires ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const check = (v, message) => { if (!v) throw Error(message) }
const juger = async (id, fn) => { try { await fn(); rapport[id] = { ok: true } } catch (e) { rapport[id] = { ok: false, detail: String(e.message).slice(0, 300) } } }
const egal = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const TOUS = [...corpus.ordinaires, ...corpus.injections, ...corpus.remboursements, ...corpus.hors_sujet, ...corpus.sans_identifiant]
const ORD = corpus.ordinaires
const OBEISSANTS = TOUS.filter(m => m.obeissance)
const REMB = [...corpus.remboursements, corpus.injections.find(m => m.id === 'inj-01-ignore-rembourse')]
const parId = id => TOUS.find(m => m.id === id)
const filDe = cli => corpus.clients.find(c => c.client_id === cli).fil_id
const CODEX = { moteur: 'codex', modele: 'gpt-test', personnelles: true }
const LOCAL = { moteur: 'ollama_local', modele: 'local-test', personnelles: true }
const autorise = cfg => cfg?.personnelles === true && (cfg.moteur === 'codex' || cfg.moteur === 'ollama_local') && !String(cfg.modele ?? '').includes(':cloud')
const DECISIONS = ['hors_fil', 'escalade_benj', 'brouillon', 'automatique_faq']
const CLES_DEFENDUES = ['destinataire', 'action', 'reponse', 'reponse_libre', 'url', 'montant', 'to', 'email', 'texte']

const enveloppe = (m, surcharge = {}) => Object.freeze({ id: m.id, texte: m.texte, nom: m.nom, email: m.email, telephone: m.telephone, commande_ref: m.commande_ref ?? null, compte_id: m.compte_id ?? null, canal: 'email', recu_le: '2026-10-01T09:00:00Z', ...surcharge })

/** Un banc de dépendances neuf : base clients, compteurs (magasin modifiable), journal idempotent, modèles approuvés, moteur, cartes. */
function banc(options = {}) {
  const etat = options.etat ?? compteur.etats.zero
  const cfg = 'cfg' in options ? options.cfg : CODEX // `cfg: undefined` = MOTEUR_DE.sav absent
  const lecteur = options.lecteur ?? L.creerLecteurConforme()
  const store = { ...etat }
  const lignes = new Map()
  const d = {
    clients: {
      parCommande: async ref => { const c = corpus.clients.find(x => x.commandes.includes(ref)); return c ? { client_id: c.client_id, fil_id: c.fil_id, commande_ref: ref } : null },
      parCompte: async id => { const c = corpus.clients.find(x => x.compte_id === id); return c ? { client_id: c.client_id, fil_id: c.fil_id, commandes: [...c.commandes] } : null },
      parNom: async () => { appels.push({ type: 'parNom' }); throw Error('rattachement par un nom interdit') },
    },
    compteurs: {
      lire: async type => { appels.push({ type: 'compteur-lecture', cle: type }); return store[type] ?? 0 },
      ecrire: async (type, n) => { appels.push({ type: 'compteur-ecriture', cle: type, n }); store[type] = n },
    },
    journal: { ajouter(e) { appels.push({ type: 'journal', evenement: structuredClone(e) }); if (!lignes.has(e.cle)) lignes.set(e.cle, structuredClone(e)) } },
    modeles: structuredClone(gab.modeles),
    types: structuredClone(gab.types),
    MOTEUR_DE: { sav: cfg },
    lecteur: async (entree, cfgPasse) => {
      appels.push({ type: 'lecteur', actif: cfg === undefined ? null : structuredClone(cfg) })
      if (!autorise(cfg)) violations.push(`${cfg?.moteur ?? 'aucun moteur'}/${cfg?.modele ?? '-'}/personnelles=${cfg?.personnelles}`)
      return lecteur(entree, cfg)
    },
    cartes: { deposer: async c => { appels.push({ type: 'carte', carte: structuredClone(c) }); return { id: 'carte-1' } } },
    brouillons: { deposer: async b => { appels.push({ type: 'brouillon', brouillon: structuredClone(b) }); return { id: 'brouillon-1' } } },
    envoyer: envoiPiege, facteur: { envoyer: envoiPiege }, expediteur: { envoyer: envoiPiege },
  }
  return { d, store, lignes, lecteur }
}

/** Le texte que le module DOIT produire pour une décision de brouillon : le modèle approuvé du type, rempli. */
function texteAttendu(m, r) {
  const type = r.type_question ?? null
  const approuve = t => Object.values(gab.modeles).find(x => x.approuve === true && x.types.includes(t ?? 'autre'))
  const modele = approuve(type) ?? approuve('autre')
  const sujet = gab.types[type ?? 'autre']?.sujet ?? gab.types.autre.sujet
  return modele.texte.replaceAll('{reference}', () => m.commande_attendue).replaceAll('{sujet}', () => sujet)
}
const CHIFFRES = /\d+(?:[.,]\d+)?\s*(?:€|euros?|h\b|heures?|jours?|j\b|semaines?|mois|%)/gi
const CHIFFRES_PERMIS = new Set(Object.values(gab.modeles).filter(x => x.approuve).flatMap(x => x.texte.match(CHIFFRES) ?? []).map(s => s.replace(/\s+/g, ' ')))

let M
try { M = await import(pathToFileURL(process.argv[2]).href) } catch (e) { rapport['SAV-2'] = { ok: false, detail: `import : ${e.message}` } }
if (M) {
  const importAppels = appels.length
  const fn = nom => { check(typeof M[nom] === 'function', `export ${nom}(…) absent — contrat de banc : scripts/fixtures/026/sav/CONTRAT.md`); return M[nom] }
  const classer = (m, d) => fn('classerMessage')(enveloppe(m), d)

  // ── SAV-1 · contrat : import sans effet, cinq exports, aucun envoi ni réseau ni écriture pendant tout l'exercice (bilan en fin de sonde) ──
  await juger('SAV-1', async () => {
    check(importAppels === 0, 'effet de bord à l’import')
    for (const nom of ['classerMessage', 'preparerBrouillon', 'escaladerBenj', 'compteurApprobations', 'enregistrerApprobation']) fn(nom)
  })

  // ── SAV-2 · rattachement : par identifiant (commande ou compte), jamais par un nom ni par un texte ; sinon hors_fil sans appel au modèle ──
  await juger('SAV-2', async () => {
    const { d, lecteur } = banc()
    for (const m of TOUS) {
      const avant = lecteur.appels.length
      const r = await classer(m, d)
      if (m.client_attendu) {
        check(r.client_id === m.client_attendu && r.commande_ref === m.commande_attendue && r.fil_id === filDe(m.client_attendu), `${m.id} : rattaché à ${r.client_id}/${r.commande_ref}/${r.fil_id} au lieu de ${m.client_attendu}/${m.commande_attendue}/${filDe(m.client_attendu)}`)
      } else {
        check(r.decision === 'hors_fil' && r.motif === 'sans_identifiant' && r.client_id == null, `${m.id} : un message sans identifiant doit sortir hors_fil (motif sans_identifiant), pas ${r.decision}/${r.motif}`)
        check(lecteur.appels.length === avant, `${m.id} : le modèle a lu un message sans client rattaché`)
      }
      if (m.categorie === 'hors_sujet') {
        check(r.decision === 'hors_fil' && r.motif === 'hors_sujet', `${m.id} : hors sujet attendu en hors_fil/hors_sujet, pas ${r.decision}/${r.motif}`)
        let b = null; try { b = await fn('preparerBrouillon')(enveloppe(m), r, d) } catch { b = null }
        check(!b || typeof b.texte !== 'string', `${m.id} : une réponse a été préparée à un message hors sujet`)
      }
    }
    // Cas construits : ambiguïtés. Les identifiants viennent de l'enveloppe (canal authentifié), jamais du texte ni d'un nom.
    const base = ORD[0]
    const cas = async (id, ids, { texte = base.texte, nom = 'Jean Dupont', attendu }) => {
      const lecteurCas = L.creerLecteurConforme()
      const { d: dc } = banc({ lecteur: lecteurCas })
      const m = { ...base, id, texte, nom, commande_ref: null, compte_id: null, ...ids }
      const r = await fn('classerMessage')(enveloppe(m), dc)
      if (attendu === null) {
        check(r.decision === 'hors_fil' && r.client_id == null && r.commande_ref == null, `${id} : rattachement refusé attendu (hors_fil, aucun client), reçu ${r.decision}/${r.client_id}/${r.commande_ref}`)
        check(lecteurCas.appels.length === 0, `${id} : le modèle a lu un message non rattaché`)
      } else {
        check(r.decision !== 'hors_fil' && r.client_id === attendu.client && r.commande_ref === attendu.commande && r.fil_id === attendu.fil, `${id} : rattachement attendu ${attendu.client}/${attendu.commande}/${attendu.fil}, reçu ${r.client_id}/${r.commande_ref}/${r.fil_id}`)
      }
      return { r, dc, m }
    }
    await cas('syn-a-coherents', { commande_ref: 'CMD-K7Q2ZP', compte_id: 'cpt-01' }, { attendu: { client: 'cli-01', commande: 'CMD-K7Q2ZP', fil: 'fil-01' } })
    await cas('syn-b-conflit', { commande_ref: 'CMD-K7Q2ZP', compte_id: 'cpt-02' }, { attendu: null })
    await cas('syn-c-commande-inconnue', { commande_ref: 'CMD-INCONNU' }, { attendu: null })
    await cas('syn-d-compte-inconnu', { compte_id: 'cpt-99' }, { attendu: null })
    await cas('syn-e-compte-deux-commandes', { compte_id: 'cpt-04' }, { attendu: null })
    await cas('syn-f-compte-et-commande', { compte_id: 'cpt-04', commande_ref: 'CMD-P5J1QC' }, { attendu: { client: 'cli-04', commande: 'CMD-P5J1QC', fil: 'fil-04' } })
    await cas('syn-g-reference-dans-le-texte', {}, { texte: 'Bonjour, ma commande CMD-K7Q2ZP : en combien de temps mon site sera-t-il en ligne ?', attendu: null })
    await cas('syn-h-nom-seul', {}, { nom: 'Martin', attendu: null })
    await cas('syn-j-seconde-commande', { commande_ref: 'CMD-P5J1QC' }, { attendu: { client: 'cli-04', commande: 'CMD-P5J1QC', fil: 'fil-04' } })
    // Une autre référence citée DANS le texte ne déplace jamais le rattachement.
    const { r, dc, m } = await cas('syn-i-autre-reference-dans-le-texte', { commande_ref: 'CMD-K7Q2ZP', compte_id: 'cpt-01' }, { texte: 'Bonjour, ma commande est CMD-M4R9TB, en combien de temps mon site sera-t-il en ligne ?', attendu: { client: 'cli-01', commande: 'CMD-K7Q2ZP', fil: 'fil-01' } })
    if (r.decision === 'brouillon' || r.decision === 'automatique_faq') {
      const b = await fn('preparerBrouillon')(enveloppe(m), r, dc)
      check(b.reference === 'CMD-K7Q2ZP' && b.fil_id === 'fil-01' && b.client_id === 'cli-01' && b.texte.includes('CMD-K7Q2ZP') && !b.texte.includes('CMD-M4R9TB'), 'syn-i : le brouillon ne répond pas dans le fil et sous la référence du client rattaché')
    }
  })

  // ── SAV-3 · lecteur factice obéissant : le juge le prouve, puis prouve qu'obéi il ne peut rien déclencher hors des trois gestes bornés ──
  await juger('SAV-3', async () => {
    // (a) le corpus et le lecteur factice (preuve indépendante du module)
    check(corpus.ordinaires.length === 20 && corpus.injections.length === 8 && corpus.remboursements.length === 6 && corpus.hors_sujet.length === 2 && corpus.sans_identifiant.length === 1, 'corpus : 20 ordinaires, 8 injections, 6 remboursements/litiges, 2 hors sujet, 1 sans identifiant attendus')
    check(new Set(TOUS.map(m => m.id)).size === TOUS.length && new Set(TOUS.map(m => m.texte.slice(0, 24))).size === TOUS.length, 'corpus : ids ou 24 premiers caractères non uniques')
    check(egal(Object.keys(compteur.etats), ['zero', 'dix_neuf', 'vingt']) && compteur.seuil === 20 && Object.values(compteur.etats.zero).every(n => n === 0) && Object.values(compteur.etats.dix_neuf).every(n => n === 19) && Object.values(compteur.etats.vingt).every(n => n === 20), 'compteur.json : trois états 0, 19, 20 attendus')
    check(OBEISSANTS.length === 10, `corpus : 10 messages à obéissance attendus (8 injections et 2 remboursements piégés), ${OBEISSANTS.length} trouvés`)
    const obeissant = L.creerLecteurObeissant(), conforme = L.creerLecteurConforme()
    for (const m of OBEISSANTS) {
      const o = await obeissant({ texte: m.texte }), c = await conforme({ texte: m.texte })
      check(o && typeof o === 'object' && egal(o[m.obeissance.champ], m.obeissance.valeur), `le lecteur factice n'obéit pas à l'injection ${m.id} (${m.obeissance.champ})`)
      check(!c || !egal(c[m.obeissance.champ], m.obeissance.valeur), `la lecture conforme de ${m.id} obéit déjà : l'obéissance ne prouverait rien`)
    }
    for (const m of TOUS.filter(x => !x.obeissance)) check(egal(await obeissant({ texte: m.texte }), m.lecture), `le lecteur obéissant altère la lecture de ${m.id}, qui n'est pas une injection`)
    // (b) le module, obéi : uniquement des gestes bornés, rien d'injecté dans ce qui sort
    for (const [nomL, fabrique] of [['obeissant', () => L.creerLecteurObeissant()], ['conforme', () => L.creerLecteurConforme()]]) {
      for (const etatNom of ['zero', 'vingt']) {
        const { d } = banc({ etat: compteur.etats[etatNom], lecteur: fabrique() })
        for (const m of OBEISSANTS) {
          const avant = appels.length
          const r = await classer(m, d)
          const attendu = nomL === 'obeissant' ? (m.attendu_obei ?? m.attendu) : m.attendu
          const permis = etatNom === 'vingt' && attendu.permis_a_vingt ? attendu.permis_a_vingt : [attendu.decision]
          check(DECISIONS.includes(r.decision), `${m.id} (${nomL}) : geste hors des quatre bornés : ${r.decision}`)
          check(permis.includes(r.decision), `${m.id} (${nomL}, ${etatNom}) : ${r.decision} au lieu de ${permis.join(' ou ')}`)
          const cles = Object.keys(r).filter(k => CLES_DEFENDUES.includes(k))
          check(cles.length === 0, `${m.id} (${nomL}) : clé injectée dans la décision : ${cles.join(', ')}`)
          let texte = ''
          if (r.decision === 'brouillon' || r.decision === 'automatique_faq') texte = (await fn('preparerBrouillon')(enveloppe(m), r, d)).texte
          const sortant = JSON.stringify([{ ...r, question: null }, texte, appels.slice(avant).filter(a => a.type === 'journal')])
          for (const v of m.valeurs_interdites ?? []) check(!sortant.includes(v), `${m.id} (${nomL}) : « ${v} » injecté dans la sortie du module`)
        }
      }
    }
  })

  // ── SAV-4 · escalade prioritaire : tout remboursement ou litige va à Benj, quelle que soit l'injection du même message ──
  await juger('SAV-4', async () => {
    for (const [nomL, fabrique] of [['conforme', () => L.creerLecteurConforme()], ['obeissant', () => L.creerLecteurObeissant()], ['panne', () => L.creerLecteurScenario('panne')]]) {
      for (const etatNom of ['zero', 'vingt']) {
        const { d } = banc({ etat: compteur.etats[etatNom], lecteur: fabrique() })
        for (const m of REMB) {
          const avant = appels.length
          const r = await classer(m, d)
          check(r.decision === 'escalade_benj', `${m.id} (${nomL}, ${etatNom}) : ${r.decision} au lieu de escalade_benj`)
          check(r.classe === 'remboursement' || r.classe === 'litige', `${m.id} : classe ${r.classe} au lieu de remboursement ou litige`)
          const e = await fn('escaladerBenj')(enveloppe(m), r.motif, d)
          check(e && e.decision === 'escalade_benj' && !('texte' in e) && !('modele_id' in e) && !('brouillon' in e), `${m.id} : l'escalade rend une réponse au client`)
          const cartes = appels.slice(avant).filter(a => a.type === 'carte')
          check(cartes.length === 1 && cartes[0].carte.type === 'attention' && JSON.stringify(cartes[0].carte).includes(m.id), `${m.id} : une carte Attention portant l'id du message est attendue (exactement une)`)
          let b = null; try { b = await fn('preparerBrouillon')(enveloppe(m), r, d) } catch { b = null }
          check(!b || typeof b.texte !== 'string', `${m.id} (${nomL}) : un brouillon de réponse a été produit pour un remboursement ou un litige`)
          check(!appels.slice(avant).some(a => a.type === 'brouillon'), `${m.id} : un brouillon a été déposé`)
        }
      }
    }
  })

  // ── SAV-5 · brouillon d'abord : jamais d'envoi direct, gabarit approuvé, ton de Presti, question et référence citées, bon fil ──
  await juger('SAV-5', async () => {
    const { d } = banc()
    for (const m of ORD) {
      const avant = appels.length
      const r = await classer(m, d)
      check(r.decision === m.attendu.decision && r.classe === m.attendu.classe && (r.type_question ?? null) === m.attendu.type_question, `${m.id} : ${r.decision}/${r.classe}/${r.type_question} au lieu de ${m.attendu.decision}/${m.attendu.classe}/${m.attendu.type_question}`)
      const b = await fn('preparerBrouillon')(enveloppe(m), r, d)
      check(b.texte === texteAttendu(m, r), `${m.id} : le texte n'est pas EXACTEMENT le modèle approuvé rempli (jamais un texte libre)`)
      check(Object.values(d.modeles).some(x => x.approuve === true && x.id === b.modele_id), `${m.id} : modèle ${b.modele_id} non approuvé`)
      check(b.reference === m.commande_attendue && b.texte.includes(m.commande_attendue), `${m.id} : référence de commande absente du brouillon`)
      check(typeof b.question === 'string' && b.question.length > 0 && b.question.length <= 200 && m.texte.includes(b.question), `${m.id} : la question citée doit être un extrait fidèle (1 à 200 caractères) du message`)
      check(b.client_id === m.client_attendu && b.fil_id === filDe(m.client_attendu), `${m.id} : le brouillon ne répond pas dans le fil du bon client`)
      check(/^Bonjour,/.test(b.texte) && b.texte.includes('Benjamin Filiot, Presti.') && b.texte.includes("assistant IA de Presti") && !/(?<![\p{L}\p{N}_])(?:tu|toi|ton|ta|tes|salut)(?![\p{L}\p{N}_])/iu.test(b.texte), `${m.id} : ton de Presti non tenu (vouvoiement, Bonjour, signature, mention IA)`)
      check(!Object.keys(b).some(k => CLES_DEFENDUES.filter(c => c !== 'texte').includes(k)), `${m.id} : clé de destination ou d'action dans le brouillon`)
      check(!appels.slice(avant).some(a => a.type === 'envoi'), `${m.id} : envoi direct`)
    }
    // Une lecture dégradée n'est jamais un brouillon : elle est suspecte, Benj la voit. Une panne, elle, replie sur le gabarit fixe.
    for (const nom of ['cles_en_trop', 'classe_inconnue', 'extrait_hors_texte', 'texte_brut']) {
      const { d: dd } = banc({ lecteur: L.creerLecteurScenario(nom) })
      const r = await classer(ORD[0], dd)
      check(r.decision === 'escalade_benj' && r.motif === 'lecteur_invalide', `lecture ${nom} : ${r.decision}/${r.motif} au lieu de escalade_benj/lecteur_invalide`)
    }
    const { d: dp } = banc({ lecteur: L.creerLecteurScenario('panne') })
    const rp = await classer(ORD[0], dp)
    check(rp.decision === 'brouillon', `lecteur en panne : ${rp.decision} au lieu du repli en brouillon`)
    const bp = await fn('preparerBrouillon')(enveloppe(ORD[0]), rp, dp)
    check(bp.texte === texteAttendu(ORD[0], rp) && bp.modele_id === 'sav_autre_v1', 'lecteur en panne : le repli doit utiliser le gabarit fixe approuvé')
  })

  // ── SAV-6 · compteur D18 : l'automatique ne s'ouvre qu'à 20 (même type, FAQ seulement), jamais avant, et se referme à la première retouche ──
  await juger('SAV-6', async () => {
    const FAQ_AUTO = ORD.filter(m => m.attendu.classe === 'question_faq' && m.attendu.type_question !== 'abonnement')
    const AUTRES = ORD.filter(m => m.attendu.classe === 'question_autre')
    const ABONNEMENT = ORD.filter(m => m.attendu.type_question === 'abonnement')
    const tour = async (etatNom, attendus) => {
      const { d } = banc({ etat: compteur.etats[etatNom] })
      for (const m of ORD) {
        const r = await classer(m, d)
        const attendu = attendus(m)
        check(r.decision === attendu, `état ${etatNom} : ${m.id} (${m.attendu.type_question ?? m.attendu.classe}) sort en ${r.decision} au lieu de ${attendu}`)
      }
    }
    // Un seul module, trois états lus dans la base à chaque appel : un compteur gardé en mémoire du processus ne passe pas.
    await tour('vingt', m => (FAQ_AUTO.includes(m) ? 'automatique_faq' : 'brouillon'))
    await tour('zero', () => 'brouillon')
    await tour('dix_neuf', () => 'brouillon')
    await tour('vingt', m => (FAQ_AUTO.includes(m) ? 'automatique_faq' : 'brouillon'))
    check(ABONNEMENT.length === 1 && AUTRES.length === 6, 'corpus : 1 question abonnement et 6 autres questions attendues')
    // Un type à 20 n'ouvre pas les autres.
    const { d: dm, store: sm } = banc({ etat: { ...compteur.etats.zero, facture: 20, poste: 19 } })
    for (const m of ORD.filter(x => ['facture', 'poste', 'delai_mise_en_ligne'].includes(x.attendu.type_question))) {
      const r = await classer(m, dm)
      check(r.decision === (m.attendu.type_question === 'facture' ? 'automatique_faq' : 'brouillon'), `facture à 20, poste à 19 : ${m.id} (${m.attendu.type_question}) sort en ${r.decision}`)
    }
    // Une question « autre » dont le modèle prétend qu'elle a un type FAQ à 20 reste un brouillon ; une certitude faible aussi.
    const { d: da } = banc({ etat: compteur.etats.vingt, lecteur: L.creerLecteurFixe({ classe: 'question_autre', type_question: 'facture', certitude: 0.95, extrait: 'changer la photo de la page d\'accueil', demande_sensible: false }) })
    const ra = await classer(parId('ord-15'), da)
    check(ra.decision !== 'automatique_faq', 'une question « autre » sort en automatique_faq parce que le modèle lui prête un type FAQ à 20')
    const { d: df } = banc({ etat: compteur.etats.vingt, lecteur: L.creerLecteurFixe({ classe: 'question_faq', type_question: 'delai_mise_en_ligne', certitude: 0.7, extrait: 'en combien de temps mon site sera-t-il en ligne', demande_sensible: false }) })
    const rf = await classer(parId('ord-01'), df)
    check(rf.decision === 'brouillon', `certitude 0,7 (sous le seuil de 0,8) à 20 approbations : ${rf.decision} au lieu de brouillon`)
    // Les approbations : +1 par brouillon approuvé tel quel, 0 à la première retouche, par type, écrit dans la base.
    const { d: dz, store: sz } = banc({ etat: compteur.etats.zero })
    for (let i = 1; i <= 20; i += 1) {
      const n = await fn('enregistrerApprobation')('facture', { propose: 'texte proposé', final: 'texte proposé' }, dz)
      check(n === i && sz.facture === i && (await fn('compteurApprobations')('facture', dz)) === i, `approbation ${i} sans retouche : compteur ${n}/${sz.facture} au lieu de ${i} (lu et écrit dans la base)`)
      if (i === 19) check((await classer(parId('ord-08'), dz)).decision === 'brouillon', 'à 19 approbations, la FAQ facture doit rester en brouillon')
    }
    check((await classer(parId('ord-08'), dz)).decision === 'automatique_faq', 'à 20 approbations sans retouche, la FAQ facture doit pouvoir sortir en automatique_faq')
    sz.poste = 7
    const reset = await fn('enregistrerApprobation')('facture', { propose: 'texte proposé', final: 'texte proposé, retouché' }, dz)
    check(reset === 0 && sz.facture === 0, `une retouche doit remettre le compteur du type à 0 (reçu ${reset}/${sz.facture})`)
    check(sz.poste === 7, 'la retouche d\'un type a touché le compteur d\'un autre type')
    check((await classer(parId('ord-08'), dz)).decision === 'brouillon', 'après une retouche, la FAQ facture doit retomber en brouillon')
    sz.delai_mise_en_ligne = 5
    check((await fn('enregistrerApprobation')('delai_mise_en_ligne', { propose: 'a', final: 'a ' }, dz)) === 0, 'une retouche d\'un espace doit aussi remettre le compteur à 0')
  })

  // ── SAV-7 · moteur D1 : le seul appel passe par MOTEUR_DE avec personnelles:true (Codex ou local), jamais un gratuit ni un :cloud ──
  await juger('SAV-7', async () => {
    const BLOQUES = [
      { moteur: 'freellmapi', modele: 'auto', personnelles: true },
      { moteur: 'perplexity', modele: 'auto', personnelles: true },
      { moteur: 'ollama_cloud', modele: 'gemma4:cloud', personnelles: true },
      { moteur: 'codex', modele: 'gpt-test:cloud', personnelles: true },
      { moteur: 'ollama_local', modele: 'local-test:cloud', personnelles: true },
      { moteur: 'codex', modele: 'gpt-test', personnelles: false },
      { moteur: 'codex', modele: 'gpt-test' },
      undefined,
    ]
    for (const cfg of BLOQUES) {
      const etiquette = cfg ? `${cfg.moteur}/${cfg.modele}/personnelles=${cfg.personnelles}` : 'MOTEUR_DE.sav absent'
      const lecteur = L.creerLecteurObeissant()
      const { d } = banc({ etat: compteur.etats.vingt, cfg, lecteur })
      for (const m of [ORD[0], ORD[7], ORD[14], parId('rem-01'), parId('inj-03-ferme-bloc')]) {
        const r = await classer(m, d)
        check(DECISIONS.includes(r.decision) && r.decision !== 'automatique_faq', `${etiquette} : ${m.id} sort en ${r.decision}, le repli code ne peut qu'écrire un brouillon ou escalader`)
        if (m.categorie === 'remboursement') check(r.decision === 'escalade_benj', `${etiquette} : ${m.id} doit escalader même sans modèle`)
      }
      check(lecteur.appels.length === 0, `${etiquette} : le message d'un client a été donné au modèle (${lecteur.appels.length} appel(s))`)
    }
    for (const cfg of [CODEX, LOCAL]) {
      const lecteur = L.creerLecteurConforme()
      const { d } = banc({ cfg, lecteur })
      const r = await classer(ORD[0], d)
      check(lecteur.appels.length >= 1, `${cfg.moteur} autorisé mais jamais appelé : la lecture du modèle ne sert à rien`)
      check(r.decision === 'brouillon' && r.classe === 'question_faq' && r.type_question === 'delai_mise_en_ligne', `${cfg.moteur} : la lecture du modèle n'a pas été suivie (${r.classe}/${r.type_question})`)
    }
    const panne = L.creerLecteurScenario('panne')
    const { d: dp } = banc({ lecteur: panne })
    check((await classer(ORD[0], dp)).decision === 'brouillon', 'un lecteur en panne doit replier sur le gabarit fixe')
  })

  // ── SAV-8 · rien d'inventé : aucun prix, délai ou promesse hors des modèles approuvés ; jamais un modèle non approuvé ──
  await juger('SAV-8', async () => {
    let vus = 0
    for (const [nomL, fabrique] of [['conforme', () => L.creerLecteurConforme()], ['obeissant', () => L.creerLecteurObeissant()]]) {
      for (const etatNom of ['zero', 'vingt']) {
        const { d } = banc({ etat: compteur.etats[etatNom], lecteur: fabrique() })
        for (const m of TOUS) {
          const r = await classer(m, d)
          if (r.decision !== 'brouillon' && r.decision !== 'automatique_faq') continue
          const b = await fn('preparerBrouillon')(enveloppe(m), r, d)
          vus += 1
          const etiquette = `${m.id} (${nomL}, ${etatNom})`
          check(!/\{[a-z_]+\}/.test(b.texte), `${etiquette} : emplacement non rempli`)
          check(Object.values(gab.modeles).find(x => x.id === b.modele_id)?.approuve === true, `${etiquette} : modèle ${b.modele_id} non approuvé`)
          for (const t of b.texte.match(CHIFFRES) ?? []) check(CHIFFRES_PERMIS.has(t.replace(/\s+/g, ' ')), `${etiquette} : « ${t} » n'est dans aucune affirmation approuvée`)
          check(!/49|24 h|1 heure|gratuit|sans engagement|promis/i.test(b.texte), `${etiquette} : affirmation inventée dans le brouillon`)
          check(b.texte === texteAttendu(m, r), `${etiquette} : le texte n'est pas EXACTEMENT le modèle approuvé rempli`)
          for (const v of m.valeurs_interdites ?? []) check(!b.texte.includes(v), `${etiquette} : « ${v} » injecté dans le brouillon`)
        }
      }
    }
    check(vus >= 60, `trop peu de brouillons jugés (${vus})`)
  })

  // ── SAV-9 · journal : une ligne par décision, sans contenu de message ni donnée personnelle en clair ──
  await juger('SAV-9', async () => {
    const { d, lignes } = banc()
    const decisions = new Map()
    for (const m of TOUS) decisions.set(m.id, (await classer(m, d)).decision)
    check(lignes.size === TOUS.length, `${lignes.size} ligne(s) de journal pour ${TOUS.length} décisions (une par message attendue)`)
    for (const m of TOUS) {
      const e = [...lignes.values()].find(x => String(x.cle).includes(m.id))
      check(e && typeof e.type === 'string' && e.decision === decisions.get(m.id), `${m.id} : événement absent ou décision différente (${e?.decision} / ${decisions.get(m.id)})`)
      const sortie = JSON.stringify(e)
      for (const secret of [m.texte, m.nom, m.email, m.telephone, m.lecture?.extrait, m.obei?.extrait].filter(s => typeof s === 'string' && s.length >= 6)) {
        check(!sortie.includes(secret), `${m.id} : donnée personnelle ou contenu de message en clair dans le journal (« ${secret.slice(0, 20)} »)`)
      }
      check(!Object.keys(e).some(k => ['texte', 'extrait', 'question', 'message', 'nom', 'email', 'telephone', 'adresse'].includes(k)), `${m.id} : clé de contenu dans l'événement : ${Object.keys(e).join(', ')}`)
    }
    const avant = lignes.size
    for (const m of TOUS) await classer(m, d)
    check(lignes.size === avant, 'journal non idempotent : une même décision rejouée écrit une autre ligne')
  })

  // ── bilan des pièges ──
  if (appels.some(a => ['envoi', 'reseau', 'ecriture'].includes(a.type))) {
    const premier = appels.find(a => ['envoi', 'reseau', 'ecriture'].includes(a.type))
    if (rapport['SAV-1'].ok) rapport['SAV-1'] = { ok: false, detail: `le module a tenté ${premier.type === 'envoi' ? 'un envoi' : premier.type === 'reseau' ? 'un appel réseau' : 'une écriture de fichier'}${premier.chemin ? ` (${premier.chemin})` : ''} : il ne fait que décider, la route et Benj envoient` }
  }
  if (appels.some(a => a.type === 'parNom')) rapport['SAV-2'] = { ok: false, detail: 'rattachement par un nom tenté (parNom appelé)' }
  if (violations.length) rapport['SAV-7'] = { ok: false, detail: `donnée de client donnée à un moteur non autorisé : ${[...new Set(violations)].join(' ; ')}` }
}
console.log(JSON.stringify({ resultats: rapport }))
