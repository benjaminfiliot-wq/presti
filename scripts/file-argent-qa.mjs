#!/usr/bin/env node
// scripts/file-argent-qa.mjs — le juge de la fiche 026-046 (lib/agents/fileArgent.ts, la file de l'argent), écrit par Claude Code
// en 026-045. Le vrai module est importé dans un processus à part (la sonde du lot 03), sans réseau ni secret, avec l'horloge
// simulée (scripts/lib/horloge-simulee.mjs) ; le vrai client @supabase/supabase-js parle à une base factice : le faux PostgREST
// du lot 03 (contrat-ops.json : un nom de paramètre faux est refusé), une file `argent` qui rejoue la sémantique de 0100
// (lectures, délai d'invisibilité, archivage à la 4e lecture, « fait » une seule fois), des tables sites_commandes et artisans,
// et un stockage factice qui consigne chaque geste. lib/alertes et lib/email sont des doublures (veilleur/doublures/).
//
//   AF-1  lib/agents/fileArgent.ts existe et exporte HANDLERS, traiterFileArgent et balayerCommandesPayees ; HANDLERS a
//         exactement les clés commande_payee et essai_e2e.
//   AF-2  commande payée (lectures 1) → ops_tache_creer('systeme', 'livrer_site', 'livrer_site:<id>', 'livraison', …,
//         'commande:<id>') puis ops_argent_fait une fois (même msg_id, même clé) ; ops_tache_creer en 500 → pas de fait,
//         echecs = 1, le message suivant du lot traité ; brouillon → aucune tâche, fait avec { ignore } ; type pack_pub → une
//         alerte paiement dont la clé contient celle du message, et pas de fait.
//   AF-3  50 messages, un gestionnaire injecté qui dure 1 s (horloge simulée), budgetMs 3000 : rendu avant 4 s simulées, 3
//         messages au plus, aucune lecture après l'épuisement du budget.
//   AF-4  balayerCommandesPayees : 3 payées (dont une de 31 jours) et 1 générée → ops_argent_envoyer pour les 2 payées
//         récentes seulement, p_type commande_payee, p_cle commande_payee:<id>.
//   AF-5  graphe du module (lib/alertes.ts, le tuyau des alertes, en feuille) : ni lib/stripe, ni lib/email, ni
//         lib/siteCommandeServeur ; ni .update/.insert/.delete/.upsert sur sites_commandes ou artisans ; ANTHROPIC absent.
//   AF-6  exactement une fois : relu (lectures 2) après un échec, gestionnaire réussi → un seul fait, qui rend true ; message
//         plus rendu par ops_argent_lire → gestionnaire pas rappelé.
//   AF-7  npm run typecheck en code 0, le module parmi les fichiers vérifiés (en --temoin : la lecture du typecheck éprouvée).
//   AF-8  (--reel, après 0100) essai_e2e:<aléa> : envoyé ; un passage vtS 5 dont le gestionnaire échoue → pas de fait ; 6 s ;
//         le vrai gestionnaire → un fait ; un troisième passage ne rend rien ; ménage par ops_argent_essai_effacer (finally).
//   AF-9  l'entrée de l'usine : commande payée → usine/<tâche>/entree/commande.json au format --depuis de l'exporteur (026-033 :
//         { commande, artisan, essai? } lus de la base, aucune autre clé), les photos du dossier de l'artisan sous
//         entree/photos/ (ni celle d'un autre dossier, ni celle d'un autre hôte, jamais demandées), usine/commandes/<id>.json =
//         { tache }, puis le fait ; relu → aucun second dépôt ; bucket absent → entree_usine_absente ET le fait ; commande
//         générée → aucun dépôt ; aucune écriture hors de usine/<tâche>/entree/ et usine/commandes/, aucune lecture de sortie/.
//
// Usage : node scripts/file-argent-qa.mjs [--racine=<dossier>] [--temoin] [--reel]
//   --temoin : chaque critère sur le témoin (veilleur/temoins/lib/agents/fileArgent.ts.temoin, bus du lot 03) doit être VERT,
//              puis chaque sabotage déclaré plus bas doit rendre son critère ROUGE.
// Sortie : une ligne par critère, puis « file-argent-qa : PASS » ou « … : FAIL — ids ». Code 0 si tout est vert, 1 sinon,
// 2 si un préalable manque.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import * as S from './fixtures/026-horloge-bus/veilleur/socle-lot04.mjs'
import { RACCOURCI_DIT } from './lib/horloge-simulee.mjs'

const { C, res, court } = S
const JUGE = 'file-argent-qa'
const FICHIER = fileURLToPath(import.meta.url)
const IDS = ['AF-1', 'AF-2', 'AF-3', 'AF-4', 'AF-5', 'AF-6', 'AF-7', 'AF-8', 'AF-9']
const MODULE = 'lib/agents/fileArgent.ts'
const INSTANT = '2026-10-20T08:00:00Z'
const COLONNES_ARTISAN = ['id', 'email', 'nom', 'metier', 'slug', 'tel', 'tel_public', 'services', 'plan']
const JOUR = 86_400_000

const nonJuge = (racine) => (C.existe(racine, MODULE) ? null : res([`non jugé : ${MODULE} absent (AF-1)`]))
const sonde = (nom, racine, params = {}) => S.sonde({ juge: JUGE, fichier: FICHIER, nom, racine, params, figer: INSTANT })

// ── Côté sonde ─────────────────────────────────────────────────────────────────────────────────────────────────────
const uuid = () => crypto.randomUUID()
const montant = () => 100 + crypto.randomInt(900)
/** Une commande de site au format de la table (0088, 0103), artisan et montant tirés au hasard. */
function commande(etat, { artisan = uuid(), payeIlYa = JOUR, photos = [] } = {}) {
  const le = new Date(Date.now() - payeIlYa).toISOString()
  return {
    id: uuid(), artisan_id: artisan, email: `contact@artisan-${crypto.randomBytes(3).toString('hex')}.invalid`, etat, domaine_mode: 'aucun', domaine: null,
    metier: 'menuisier', metiers_secondaires: [], communes: ['Commune-Essai'],
    matiere: { artisan: { prenom: 'Prénom', nom: 'Essai' }, prestations: ['Escaliers'], photos, logo_url: null },
    prix_cents: montant() * 100, devise: 'eur', stripe_session_id: `cs_test_${crypto.randomBytes(4).toString('hex')}`, paye_le: etat === 'brouillon' ? null : le,
    genere_le: null, valide_le: null, en_ligne_le: null, cree_le: le, modifie_le: le,
  }
}
function artisanDe(id) {
  return { id, email: `contact@artisan-${id.slice(0, 6)}.invalid`, nom: `Artisan d’essai ${id.slice(0, 4)}`, metier: 'menuisier', slug: `artisan-essai-${id.slice(0, 6)}`, tel: '02 61 91 00 00', tel_public: '02 61 91 00 01', services: [], plan: 'gratuit', mot_de_passe_hash: 'ne-doit-jamais-sortir', stripe_customer_id: 'cus_essai' }
}
/** La file `argent` de 0100 : lectures, délai d'invisibilité, archivage au-delà de 3 lectures, fait une seule fois. */
function fileArgent(base) {
  const q = [], faits = new Set(), lectures = [], abandons = []
  let n = 1000 + crypto.randomInt(9000)
  const f = {
    q, faits, lectures, abandons,
    ajouter(type, cle, charge) { const m = { msg_id: n++, type, cle, charge, lectures: 0, visible: 0, mis_le: new Date().toISOString() }; q.push(m); return m },
    lire: (p) => {
      const t = Date.now()
      lectures.push(t)
      const out = []
      for (const m of q) {
        if (out.length >= Number(p.p_n)) break
        if (m.archive || m.visible > t) continue
        m.lectures++
        if (m.lectures > 3) { m.archive = true; abandons.push(m.cle); continue }
        m.visible = t + Math.min(3600, Math.max(5, Number(p.p_vt_s))) * 1000
        out.push({ msg_id: m.msg_id, lectures: m.lectures, type: m.type, cle: m.cle, charge: m.charge, mis_le: m.mis_le })
      }
      return { status: 200, body: out }
    },
    fait: (p) => {
      const i = q.findIndex((m) => String(m.msg_id) === String(p.p_msg_id) && m.cle === p.p_cle)
      if (faits.has(p.p_cle) || i < 0) return { status: 200, body: false }
      faits.add(p.p_cle)
      q.splice(i, 1)
      return { status: 200, body: true }
    },
  }
  base.fp.reponses.ops_argent_lire = f.lire
  base.fp.reponses.ops_argent_fait = f.fait
  return f
}
/** Monte la base factice, les doublures et le module jugé. */
async function monter(ctx, { buckets = ['usine', 'artisan-media'], objets = {} } = {}) {
  const J = S.journal({})
  const reseau = S.tenirReseau()
  const journalTables = []
  const lignes = { sites_commandes: [], artisans: [] }
  const stockage = S.stockageFactice({ buckets, objets })
  const taches = new Map()
  const base = await S.demarrerBase({
    tables: { sites_commandes: S.table('sites_commandes', lignes.sites_commandes, journalTables), artisans: S.table('artisans', lignes.artisans, journalTables) },
    stockage,
    reponses: {
      ops_tache_creer: (p) => { const deja = taches.get(p.p_cle); if (deja) return { status: 200, body: [{ id: deja, creee: false }] }; const id = uuid(); taches.set(p.p_cle, id); return { status: 200, body: [{ id, creee: true }] } },
      ops_evenement_ajouter: () => ({ status: 200, body: 1 + crypto.randomInt(1000) }),
      ops_argent_envoyer: (p) => ({ status: 200, body: 1 + crypto.randomInt(100000) }),
    },
  })
  S.doubler(ctx.racine, { 'lib/alertes': 'alertes.mjs', 'lib/email': 'email.mjs' })
  const file = fileArgent(base)
  let mod
  try { mod = await ctx.importer(MODULE) } catch (e) { await base.arreter(); throw e }
  const depuis = (n) => base.fp.appels.slice(n)
  return { J, reseau, journalTables, lignes, stockage, taches, base, file, mod, depuis, fp: base.fp, fermer: async () => { reseau.rendre(); await base.arreter() } }
}
const appels = (liste, fonction) => liste.filter((a) => a.fonction === fonction)
const fautes = (liste) => liste.filter((a) => a.faute).map((a) => `${a.fonction || a.table} (${a.faute})`)

export const SONDES = {
  async exports(ctx) {
    const m = await monter(ctx)
    try {
      const e = []
      for (const n of ['traiterFileArgent', 'balayerCommandesPayees']) if (typeof m.mod[n] !== 'function') e.push(`${n} n'est pas une fonction exportée`)
      const H = m.mod.HANDLERS
      if (!H || typeof H !== 'object') e.push('HANDLERS n\'est pas exporté')
      else {
        const cles = Object.keys(H).sort()
        if (JSON.stringify(cles) !== JSON.stringify(['commande_payee', 'essai_e2e'])) e.push(`HANDLERS : clés ${cles.join(', ') || '(aucune)'} ; exactement commande_payee et essai_e2e attendues`)
        for (const k of cles) if (typeof H[k] !== 'function') e.push(`HANDLERS.${k} n'est pas une fonction`)
      }
      return { echecs: e, resume: 'HANDLERS (commande_payee, essai_e2e), traiterFileArgent et balayerCommandesPayees exportés' }
    } finally { await m.fermer() }
  },

  async traitement(ctx) {
    const m = await monter(ctx)
    const e = []
    try {
      // a) commande payée, lectures 1
      const c1 = commande('payee'); m.lignes.sites_commandes.push(c1); m.lignes.artisans.push(artisanDe(c1.artisan_id))
      const msg1 = m.file.ajouter('commande_payee', `commande_payee:${c1.id}`, { commande_id: c1.id })
      let n0 = m.fp.appels.length
      const r1 = await m.mod.traiterFileArgent({ budgetMs: 12000 })
      let x = m.depuis(n0)
      const tc = appels(x, 'ops_tache_creer'), fa = appels(x, 'ops_argent_fait')
      if (tc.length !== 1) e.push(`payée : ops_tache_creer appelée ${tc.length} fois, 1 attendue`)
      else {
        const p = tc[0].params
        const att = { p_agent: 'systeme', p_type: 'livrer_site', p_cle: `livrer_site:${c1.id}`, p_capacite: 'livraison', p_objet: `commande:${c1.id}` }
        for (const [k, v] of Object.entries(att)) if (p[k] !== v) e.push(`payée : ops_tache_creer ${k} = ${JSON.stringify(p[k])}, ${JSON.stringify(v)} attendu`)
        if (p.p_charge?.commande_id !== c1.id) e.push('payée : p_charge.commande_id n\'est pas l\'id de la commande')
      }
      if (fa.length !== 1) e.push(`payée : ops_argent_fait appelée ${fa.length} fois, 1 attendue`)
      else {
        if (String(fa[0].params.p_msg_id) !== String(msg1.msg_id) || fa[0].params.p_cle !== msg1.cle) e.push('payée : ops_argent_fait sans le msg_id ou la clé du message')
        if (tc[0] && fa[0].rang < tc[0].rang) e.push('payée : ops_argent_fait avant ops_tache_creer')
      }
      if (r1?.faits !== 1) e.push(`payée : traiterFileArgent rend faits = ${r1?.faits}, 1 attendu`)
      // b) ops_tache_creer en 500 sur le premier message : pas de fait, echecs 1, le suivant traité
      const c2 = commande('payee'), c3 = commande('payee')
      m.lignes.sites_commandes.push(c2, c3); m.lignes.artisans.push(artisanDe(c2.artisan_id), artisanDe(c3.artisan_id))
      const m2 = m.file.ajouter('commande_payee', `commande_payee:${c2.id}`, { commande_id: c2.id })
      const m3 = m.file.ajouter('commande_payee', `commande_payee:${c3.id}`, { commande_id: c3.id })
      const creer = m.fp.reponses.ops_tache_creer
      m.fp.reponses.ops_tache_creer = (p, a) => (p.p_cle === `livrer_site:${c2.id}` ? { status: 500, body: { code: 'XX000', message: 'panne de la base (essai)' } } : creer(p, a))
      n0 = m.fp.appels.length
      const r2 = await m.mod.traiterFileArgent({ budgetMs: 12000 })
      x = m.depuis(n0)
      m.fp.reponses.ops_tache_creer = creer
      const fa2 = appels(x, 'ops_argent_fait')
      if (fa2.some((a) => a.params.p_cle === m2.cle)) e.push('ops_tache_creer en 500 : ops_argent_fait appelée quand même')
      if (r2?.echecs !== 1) e.push(`ops_tache_creer en 500 : echecs = ${r2?.echecs}, 1 attendu`)
      if (!fa2.some((a) => a.params.p_cle === m3.cle)) e.push('ops_tache_creer en 500 : le message suivant du lot n\'a pas été traité')
      // c) brouillon : aucune tâche, fait avec { ignore }
      const c4 = commande('brouillon'); m.lignes.sites_commandes.push(c4)
      const m4 = m.file.ajouter('commande_payee', `commande_payee:${c4.id}`, { commande_id: c4.id })
      S.horloge().avancer(200_000) // m2 redevient visible : il est retraité, ce n'est pas le sujet
      m.file.q.splice(m.file.q.findIndex((q) => q.cle === m2.cle), 1)
      n0 = m.fp.appels.length
      await m.mod.traiterFileArgent({ budgetMs: 12000 })
      x = m.depuis(n0)
      if (appels(x, 'ops_tache_creer').some((a) => a.params.p_cle === `livrer_site:${c4.id}`)) e.push('brouillon : une tâche livrer_site créée')
      const fa4 = appels(x, 'ops_argent_fait').filter((a) => a.params.p_cle === m4.cle)
      if (fa4.length !== 1) e.push(`brouillon : ops_argent_fait appelée ${fa4.length} fois, 1 attendue`)
      else if (!fa4[0].params.p_resultat || typeof fa4[0].params.p_resultat.ignore !== 'string') e.push(`brouillon : le résultat passé à ops_argent_fait n'a pas de clé ignore (${court(JSON.stringify(fa4[0].params.p_resultat), 60)})`)
      // d) type pack_pub : une alerte paiement avec la clé du message, pas de fait
      const cleInconnue = `pack_pub:${uuid()}`
      m.file.ajouter('pack_pub', cleInconnue, { pack: 'essai' })
      const a0 = m.J.appels.length
      n0 = m.fp.appels.length
      const r4 = await m.mod.traiterFileArgent({ budgetMs: 12000 })
      x = m.depuis(n0)
      const alertes = m.J.appels.slice(a0).filter((a) => a.quoi === 'alertes.envoyerAlertes').flatMap((a) => a.args || [])
      if (!alertes.some((al) => al?.motif === 'paiement' && String(al?.cle ?? '').includes(cleInconnue))) e.push(`pack_pub : aucune alerte paiement dont la clé contient « ${cleInconnue} » (${court(JSON.stringify(alertes), 100)})`)
      if (appels(x, 'ops_argent_fait').some((a) => a.params.p_cle === cleInconnue)) e.push('pack_pub : ops_argent_fait appelée pour un type inconnu')
      if (r4 && r4.inconnus !== 1) e.push(`pack_pub : inconnus = ${r4.inconnus}, 1 attendu`)
      const f = fautes(m.fp.appels)
      if (f.length) e.push(`appels refusés par le faux PostgREST (noms ou types hors contrat) : ${f.slice(0, 3).join(', ')}`)
      if (m.reseau.horsDns().length) e.push(`réseau : ${m.reseau.horsDns().join(', ')}`)
      return { echecs: e, resume: `payée → ops_tache_creer (systeme, livrer_site, livraison, commande:<id>) puis un fait ; 500 → pas de fait, echecs 1, le suivant traité ; brouillon → fait { ignore } ; pack_pub → alerte paiement, pas de fait` }
    } finally { await m.fermer() }
  },

  async budget(ctx) {
    const m = await monter(ctx)
    const e = []
    try {
      for (let i = 0; i < 50; i++) m.file.ajouter('commande_payee', `commande_payee:${uuid()}`, { commande_id: uuid() })
      let appelsGestionnaire = 0
      const h = S.horloge()
      const handlers = { commande_payee: async () => { appelsGestionnaire++; h.avancer(1000); return { ok: true } }, essai_e2e: async () => ({ ok: true }) }
      const t0 = Date.now()
      const n0 = m.fp.appels.length
      const r = await m.mod.traiterFileArgent({ budgetMs: 3000, handlers })
      const duree = Date.now() - t0
      const lectures = m.file.lectures.filter((t) => t >= t0)
      const faits = appels(m.depuis(n0), 'ops_argent_fait').length
      if (duree >= 4000) e.push(`rendu après ${duree} ms simulées (avant 4 000 attendu)`)
      if (appelsGestionnaire > 3 || appelsGestionnaire < 1) e.push(`${appelsGestionnaire} message(s) traité(s) : 1 à 3 attendus`)
      if (faits > 3) e.push(`${faits} fait(s) : 3 au plus attendus`)
      const tardives = lectures.filter((t) => t - t0 >= 3000)
      if (tardives.length) e.push(`${tardives.length} lecture(s) de la file après l'épuisement du budget (à +${tardives.map((t) => t - t0).join(', ')} ms)`)
      for (const k of ['lus', 'faits', 'echecs', 'inconnus', 'dureeMs']) if (typeof r?.[k] !== 'number') e.push(`le rendu n'a pas « ${k} » numérique`)
      return { echecs: e, resume: `budget 3 000 ms, gestionnaire de 1 s simulée : ${appelsGestionnaire} message(s), ${lectures.length} lecture(s) de la file, rendu à ${duree} ms simulées` }
    } finally { await m.fermer() }
  },

  async balayage(ctx) {
    const m = await monter(ctx)
    const e = []
    try {
      const recentes = [commande('payee', { payeIlYa: 2 * JOUR }), commande('payee', { payeIlYa: 29 * JOUR })]
      const vieille = commande('payee', { payeIlYa: 31 * JOUR }), generee = commande('generee', { payeIlYa: JOUR })
      m.lignes.sites_commandes.push(vieille, recentes[0], generee, recentes[1])
      const n0 = m.fp.appels.length
      const r = await m.mod.balayerCommandesPayees()
      const env = appels(m.depuis(n0), 'ops_argent_envoyer')
      const ids = env.map((a) => a.params.p_charge?.commande_id).sort()
      const att = recentes.map((c) => c.id).sort()
      if (JSON.stringify(ids) !== JSON.stringify(att)) e.push(`ops_argent_envoyer pour ${env.length} commande(s) (${ids.map((i) => (i === vieille.id ? 'la payée de 31 jours' : i === generee.id ? 'la générée' : 'une récente')).join(', ') || 'aucune'}) : les 2 payées récentes seulement attendues`)
      for (const a of env) {
        if (a.params.p_type !== 'commande_payee') e.push(`p_type ${a.params.p_type}, commande_payee attendu`)
        if (a.params.p_cle !== `commande_payee:${a.params.p_charge?.commande_id}`) e.push(`p_cle « ${a.params.p_cle} », commande_payee:<id> attendu`)
      }
      if (r?.envoyees !== 2) e.push(`le rendu dit envoyees = ${r?.envoyees}, 2 attendu`)
      if (typeof r?.vues !== 'number') e.push('le rendu n\'a pas « vues » numérique')
      const ecritures = m.journalTables.filter((t) => t.methode !== 'GET' && t.methode !== 'HEAD')
      if (ecritures.length) e.push(`écriture dans ${ecritures.map((t) => `${t.table} (${t.methode})`).join(', ')}`)
      const f = fautes(m.fp.appels)
      if (f.length) e.push(`appels refusés par le faux PostgREST : ${f.slice(0, 3).join(', ')}`)
      return { echecs: e, resume: '3 payées (dont une de 31 jours) et 1 générée → ops_argent_envoyer pour les 2 payées récentes, clé commande_payee:<id>' }
    } finally { await m.fermer() }
  },

  async unefois(ctx) {
    const m = await monter(ctx)
    const e = []
    try {
      const c = commande('generee'); m.lignes.sites_commandes.push(c); m.lignes.artisans.push(artisanDe(c.artisan_id))
      const msg = m.file.ajouter('commande_payee', `commande_payee:${c.id}`, { commande_id: c.id })
      const h = S.horloge()
      // passage 1 : le gestionnaire échoue → pas de fait
      const echoue = { commande_payee: async () => { throw new Error('échec du gestionnaire (essai)') }, essai_e2e: async () => ({ ok: true }) }
      let n0 = m.fp.appels.length
      await m.mod.traiterFileArgent({ budgetMs: 12000, vtS: 30, handlers: echoue })
      if (appels(m.depuis(n0), 'ops_argent_fait').length) e.push('passage 1 : ops_argent_fait appelée alors que le gestionnaire a échoué')
      // passage 2 : le délai d'invisibilité passé, relu (lectures 2), le vrai gestionnaire réussit → un seul fait, true
      h.avancer(31_000)
      n0 = m.fp.appels.length
      const lu = m.file.q.find((q) => q.cle === msg.cle)
      await m.mod.traiterFileArgent({ budgetMs: 12000, vtS: 30 })
      let x = m.depuis(n0)
      if (lu?.lectures !== 2) e.push(`passage 2 : le message n'a pas été relu (lectures ${lu?.lectures ?? '—'}, 2 attendu)`)
      const fa = appels(x, 'ops_argent_fait')
      if (fa.length !== 1) e.push(`passage 2 : ${fa.length} appel(s) à ops_argent_fait, 1 attendu`)
      else if (fa[0].statut !== 200 || !m.file.faits.has(msg.cle)) e.push('passage 2 : le fait n\'a pas été accepté')
      const creees = appels(x, 'ops_tache_creer').length
      // passage 3 : ops_argent_lire ne le rend plus → le gestionnaire n'est pas rappelé (ni le registre passé, épié, ni celui
      // du module : il lirait la commande)
      h.avancer(3_600_000)
      n0 = m.fp.appels.length
      const t0 = m.journalTables.length
      let rappels = 0
      const epie = Object.fromEntries(Object.entries(m.mod.HANDLERS).map(([k, f]) => [k, async (c) => { rappels++; return f(c) }]))
      await m.mod.traiterFileArgent({ budgetMs: 12000, vtS: 30, handlers: epie })
      x = m.depuis(n0)
      if (rappels || appels(x, 'ops_tache_creer').length || m.journalTables.slice(t0).some((t) => t.table === 'sites_commandes')) e.push('passage 3 : un gestionnaire rappelé alors que la file ne rend plus le message')
      if (appels(x, 'ops_argent_fait').length) e.push('passage 3 : ops_argent_fait rappelée')
      if (creees !== 1) e.push(`passage 2 : ops_tache_creer appelée ${creees} fois, 1 attendue`)
      return { echecs: e, resume: 'échec → pas de fait ; relu (lectures 2) → un seul fait, accepté ; plus rendu → gestionnaire pas rappelé' }
    } finally { await m.fermer() }
  },

  async usine(ctx) {
    const artisan = uuid(), autre = uuid()
    const noms = ['escalier.jpg', 'bibliotheque.jpg', 'etabli.jpg']
    const octets = Object.fromEntries(noms.map((n) => [n, crypto.randomBytes(64 + crypto.randomInt(64))]))
    const objets = { ...Object.fromEntries(noms.map((n) => [`artisan-media/${artisan}/${n}`, octets[n]])), [`artisan-media/${autre}/voisin.jpg`]: crypto.randomBytes(40) }
    const m = await monter(ctx, { objets })
    const e = []
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      const photos = [...noms.map((n) => ({ url: `${url}/storage/v1/object/public/artisan-media/${artisan}/${n}`, legende: 'Photo d’essai', role: 'chantier' })),
        { url: `${url}/storage/v1/object/public/artisan-media/${autre}/voisin.jpg`, legende: 'Dossier d’un autre compte', role: 'chantier' },
        { url: 'https://images.autre-hote.invalid/artisan-media/ailleurs.jpg', legende: 'Autre hôte', role: 'chantier' }]
      const c = commande('payee', { artisan, photos }); m.lignes.sites_commandes.push(c)
      const a = artisanDe(artisan); m.lignes.artisans.push(a)
      const msg = m.file.ajouter('commande_payee', `commande_payee:${c.id}`, { commande_id: c.id })
      let n0 = m.fp.appels.length, g0 = m.stockage.gestes.length
      await m.mod.traiterFileArgent({ budgetMs: 12000, vtS: 30 })
      let x = m.depuis(n0)
      const tache = m.taches.get(`livrer_site:${c.id}`)
      if (!tache) return { echecs: ['aucune tâche livrer_site créée : l\'entrée de l\'usine ne peut pas être jugée'], resume: '' }
      const entreeBrute = m.stockage.lire('usine', `${tache}/entree/commande.json`)
      if (!entreeBrute) e.push(`usine/${'<tâche>'}/entree/commande.json absent`)
      else {
        let entree = null
        try { entree = JSON.parse(entreeBrute.toString('utf8')) } catch { e.push('commande.json illisible (JSON attendu)') }
        if (entree) {
          const hors = Object.keys(entree).filter((k) => !['commande', 'artisan', 'essai'].includes(k))
          if (hors.length) e.push(`commande.json porte des clés hors du format --depuis : ${hors.join(', ')}`)
          if (entree.commande?.id !== c.id) e.push('commande.json : commande.id n\'est pas celui de la commande')
          for (const [k, v] of Object.entries(entree.commande ?? {})) if (!(k in c)) e.push(`commande.json : commande.${k} n'est pas une colonne lue de la base`); else if (JSON.stringify(v) !== JSON.stringify(c[k])) e.push(`commande.json : commande.${k} diffère de la base`)
          if (entree.artisan?.id !== artisan) e.push('commande.json : artisan.id n\'est pas celui de la commande')
          for (const k of Object.keys(entree.artisan ?? {})) if (!COLONNES_ARTISAN.includes(k)) e.push(`commande.json : artisan.${k} hors des colonnes que l'exporteur lit`)
          for (const k of COLONNES_ARTISAN) if (entree.artisan && JSON.stringify(entree.artisan[k]) !== JSON.stringify(a[k])) e.push(`commande.json : artisan.${k} diffère de la base`)
          if ('essai' in entree && entree.essai !== true) e.push('commande.json : essai présent sans valoir true')
        }
      }
      for (const n of noms) { const b = m.stockage.lire('usine', `${tache}/entree/photos/${n}`); if (!b) e.push(`photo ${n} absente de entree/photos/`); else if (!b.equals(octets[n])) e.push(`photo ${n} : octets différents de l'original`) }
      const voisin = m.stockage.gestes.slice(g0).filter((g) => String(g.chemin ?? '').includes(autre) || String(g.source ?? '').includes(autre))
      if (voisin.length) e.push(`la photo du dossier d'un autre compte a été demandée (${voisin[0].op})`)
      if ([...m.stockage.donnees.keys()].some((k) => k.startsWith(`usine/${tache}/entree/photos/`) && /voisin|ailleurs/.test(k))) e.push('une photo étrangère copiée dans entree/photos/')
      if (m.reseau.tentatives.some((t) => t.startsWith('images.autre-hote.invalid'))) e.push('la photo d\'un autre hôte a été demandée')
      const index = m.stockage.lire('usine', `commandes/${c.id}.json`)
      let idx = null
      try { idx = index ? JSON.parse(index.toString('utf8')) : null } catch { /* illisible */ }
      if (!idx || idx.tache !== tache || Object.keys(idx).length !== 1) e.push(`usine/commandes/<commande>.json vaut ${index ? court(index.toString('utf8'), 60) : '(absent)'}, { tache } attendu`)
      const fa = appels(x, 'ops_argent_fait')
      if (fa.length !== 1) e.push(`ops_argent_fait appelée ${fa.length} fois après le dépôt, 1 attendue`)
      const derniersDepots = m.stockage.gestes.slice(g0).filter((g) => g.op === 'upload' || g.op === 'copy').map((g) => g.rang)
      if (fa[0] && derniersDepots.length && fa[0].rang < Math.max(...derniersDepots)) e.push('ops_argent_fait avant la fin du dépôt')
      // relu : aucun second dépôt
      S.horloge().avancer(31_000)
      m.file.ajouter('commande_payee', msg.cle, { commande_id: c.id }) // la même clé revient (message relivré)
      m.file.faits.delete(msg.cle)
      g0 = m.stockage.gestes.length; n0 = m.fp.appels.length
      await m.mod.traiterFileArgent({ budgetMs: 12000, vtS: 30 })
      const seconds = m.stockage.gestes.slice(g0).filter((g) => (g.op === 'upload' || g.op === 'copy') && g.bucket === 'usine')
      if (seconds.length) e.push(`relu : ${seconds.length} second(s) dépôt(s) (${seconds.map((g) => g.chemin?.replace(tache, '<tâche>')).slice(0, 2).join(', ')})`)
      if (appels(m.depuis(n0), 'ops_argent_fait').length !== 1) e.push('relu : le message relivré n\'est pas marqué fait')
      // bucket absent : entree_usine_absente ET le fait
      m.stockage.connus.delete('usine')
      const c2 = commande('payee', { artisan, photos: photos.slice(0, 3) }); m.lignes.sites_commandes.push(c2)
      const msg2 = m.file.ajouter('commande_payee', `commande_payee:${c2.id}`, { commande_id: c2.id })
      n0 = m.fp.appels.length
      await m.mod.traiterFileArgent({ budgetMs: 12000, vtS: 30 })
      x = m.depuis(n0)
      const ev = appels(x, 'ops_evenement_ajouter').filter((a) => a.params.p_type === 'entree_usine_absente')
      if (ev.length !== 1) e.push(`bucket absent : ${ev.length} événement(s) entree_usine_absente, 1 attendu`)
      else {
        if (ev[0].params.p_agent !== 'systeme') e.push(`bucket absent : l'événement est de ${ev[0].params.p_agent}, systeme attendu`)
        if (S.RE_COURRIEL.test(JSON.stringify(ev[0].params))) e.push('bucket absent : l\'événement porte une adresse')
      }
      if (!appels(x, 'ops_argent_fait').some((a) => a.params.p_cle === msg2.cle)) e.push('bucket absent : le dépôt manqué a bloqué le fait (l\'argent ne doit jamais attendre l\'usine)')
      m.stockage.connus.add('usine')
      // commande générée : aucun dépôt
      const c3 = commande('generee', { artisan, photos: photos.slice(0, 3) }); m.lignes.sites_commandes.push(c3)
      m.file.ajouter('commande_payee', `commande_payee:${c3.id}`, { commande_id: c3.id })
      g0 = m.stockage.gestes.length
      await m.mod.traiterFileArgent({ budgetMs: 12000, vtS: 30 })
      const depotsGeneree = m.stockage.gestes.slice(g0).filter((g) => g.op === 'upload' || g.op === 'copy')
      if (depotsGeneree.length) e.push(`commande générée : ${depotsGeneree.length} dépôt(s)`)
      // écritures et lectures permises
      for (const g of m.stockage.gestes) {
        if ((g.op === 'upload' || g.op === 'copy' || g.op === 'move' || g.op === 'remove') && !(g.bucket === 'usine' && (/^[^/]+\/entree\//.test(g.chemin ?? '') || /^commandes\/[^/]+\.json$/.test(g.chemin ?? '')))) e.push(`écriture hors de usine/<tâche>/entree/ et usine/commandes/ : ${g.op} ${g.bucket}/${court(g.chemin, 50)}`)
        if (/(^|\/)sortie(\/|$)/.test(g.chemin ?? '')) e.push(`lecture ou écriture de sortie/ : ${g.op} ${court(g.chemin, 50)}`)
      }
      const f = fautes(m.fp.appels)
      if (f.length) e.push(`appels refusés par le faux PostgREST : ${f.slice(0, 3).join(', ')}`)
      return { echecs: [...new Set(e)], resume: `commande.json au format --depuis (commande, artisan), 3 photos du dossier de l'artisan, index { tache }, puis le fait ; relu → aucun second dépôt ; bucket absent → entree_usine_absente et fait ; générée → aucun dépôt` }
    } finally { await m.fermer() }
  },

  async reel(ctx) {
    // AF-8, sur la vraie base (les clés sont passées par le juge dans l'environnement, jamais affichées), horloge réelle
    const e = []
    const { createClient } = await import('@supabase/supabase-js')
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
    const cle = `essai_e2e:${crypto.randomBytes(6).toString('hex')}`
    const mod = await ctx.importer(MODULE)
    try {
      const env = await sb.rpc('ops_argent_envoyer', { p_type: 'essai_e2e', p_cle: cle, p_charge: { essai: true }, p_delai_s: 0 })
      if (env.error) return { echecs: [`ops_argent_envoyer : ${court(env.error.code || 'erreur', 40)}`], resume: '' }
      // le gestionnaire essai_e2e est épié (le vrai, enveloppé) : un message non fait revient, un message fait ne revient plus
      let echecs = 0, vus2 = 0, vus3 = 0
      const echoue = { ...mod.HANDLERS, essai_e2e: async () => { echecs++; throw new Error('échec voulu (AF-8)') } }
      const epie = (n) => ({ ...mod.HANDLERS, essai_e2e: async (c) => { if (n === 2) vus2++; else vus3++; return mod.HANDLERS.essai_e2e(c) } })
      await mod.traiterFileArgent({ vtS: 5, handlers: echoue })
      if (echecs !== 1) e.push(`passage 1 : le gestionnaire essai_e2e appelé ${echecs} fois, 1 attendue`)
      await new Promise((ok) => setTimeout(ok, 6000))
      const r2 = await mod.traiterFileArgent({ vtS: 5, handlers: epie(2) })
      if (vus2 !== 1) e.push(`passage 2 : le message essai_e2e rendu ${vus2} fois (1 attendu : pas de fait au passage 1)`)
      if (!(r2.faits >= 1)) e.push(`passage 2 : ${r2.faits} fait, 1 attendu`)
      await new Promise((ok) => setTimeout(ok, 6000))
      await mod.traiterFileArgent({ vtS: 5, handlers: epie(3) })
      if (vus3) e.push(`passage 3 : le message essai_e2e encore rendu ${vus3} fois après son fait`)
    } finally {
      const f = await sb.rpc('ops_argent_essai_effacer')
      if (f.error) e.push('ménage : ops_argent_essai_effacer a échoué, à relancer à la main')
    }
    return { echecs: e, resume: `${cle.split(':')[0]}:<aléa> : échec sans fait, puis un fait après 6 s, puis rien ; ménage par ops_argent_essai_effacer` }
  },
}

// ── Côté juge ──────────────────────────────────────────────────────────────────────────────────────────────────────
const parSonde = (nom) => async (racine) => { const n = nonJuge(racine); if (n) return n; return S.deSonde(await sonde(nom, racine)) }

async function jugerExistence(racine) {
  if (!C.existe(racine, MODULE)) return res([`${MODULE} absent`])
  return S.deSonde(await sonde('exports', racine))
}

/** Le graphe du module, lib/alertes.ts (le tuyau des alertes, qui envoie par lib/email) tenu pour une feuille. */
function graphe(racine) {
  const vus = new Set(), pile = [path.join(racine, MODULE)], manquants = []
  while (pile.length) {
    const f = pile.pop()
    if (vus.has(f)) continue
    vus.add(f)
    const rel = C.posix(path.relative(racine, f))
    if (rel === 'lib/alertes.ts') continue
    const code = C.sansCommentairesTs(fs.readFileSync(f, 'utf8'))
    for (const imp of C.importsDe(code)) {
      if (imp.typeSeul) continue
      let base = null
      if (imp.spec.startsWith('@/')) base = path.join(racine, imp.spec.slice(2))
      else if (imp.spec.startsWith('.')) base = path.resolve(path.dirname(f), imp.spec)
      if (!base) continue
      const trouve = [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')].find((c) => { try { return fs.statSync(c).isFile() } catch { return false } })
      if (trouve) pile.push(trouve); else manquants.push(`${rel} → ${imp.spec}`)
    }
  }
  return { fichiers: [...vus].map((f) => C.posix(path.relative(racine, f))), manquants }
}
const RE_ECRITURE = /\.from\(\s*['"`](sites_commandes|artisans)['"`]\s*\)(?:(?!\.from\()[\s\S]){0,400}?\.(update|insert|delete|upsert)\s*\(/
function jugerLecture(racine) {
  const n = nonJuge(racine)
  if (n) return n
  const e = []
  const g = graphe(racine)
  for (const interdit of ['lib/stripe.ts', 'lib/email.ts', 'lib/siteCommandeServeur.ts']) if (g.fichiers.includes(interdit)) e.push(`${interdit} dans le graphe de ${MODULE}`)
  for (const rel of g.fichiers) {
    if (rel === 'lib/alertes.ts') continue
    const code = C.sansCommentairesTs(C.lire(racine, rel) ?? '')
    const m = RE_ECRITURE.exec(code)
    if (m) e.push(`${rel} : .${m[2]}( sur ${m[1]}`)
  }
  const src = C.lire(racine, MODULE) ?? ''
  if (/ANTHROPIC/.test(src)) e.push(`${MODULE} cite ANTHROPIC`)
  if (/from\s+['"]@\/lib\/(stripe|email|siteCommandeServeur)['"]/.test(src)) e.push(`${MODULE} importe un module interdit`)
  return res(e, `graphe de ${g.fichiers.length} fichier(s) (lib/alertes.ts en feuille) : ni lib/stripe, ni lib/email, ni lib/siteCommandeServeur ; aucune écriture sur sites_commandes ou artisans ; ANTHROPIC absent`)
}
async function jugerTypecheck(racine) {
  const n = nonJuge(racine)
  if (n) return n
  return C.typecheck(JUGE, racine, [MODULE])
}
async function jugerReel(racine) {
  const n = nonJuge(racine)
  if (n) return n
  const k = S.clesReelles()
  if (!k.url || !k.service) return res(['.env.local : adresse ou clé de service absente (rien n\'est affiché)'])
  const x = await C.lancerSonde({ juge: JUGE, jugeFichier: FICHIER, nom: 'reel', racine, params: { reel: true }, delaiMs: 120_000, env: { NEXT_PUBLIC_SUPABASE_URL: k.url, SUPABASE_SERVICE_ROLE_KEY: k.service } })
  const r = S.deSonde(x)
  return { ...r, echecs: r.echecs.map((t) => S.masquer(t, [k.service, k.url])) }
}

// ── Les sabotages du témoin : chacun doit rendre son critère ROUGE ────────────────────────────────────────────────────
const T = MODULE
export const SABOTAGES = [
  { id: 'AF-1', nom: 'registre ouvert', fichier: T, chercher: '{ commande_payee: commandePayee, essai_e2e: essaiE2e }', remplacer: '{ commande_payee: commandePayee, essai_e2e: essaiE2e, pack_pub: essaiE2e } as never' },
  { id: 'AF-1', nom: 'balayage non exporté', fichier: T, chercher: 'export async function balayerCommandesPayees', remplacer: 'async function balayerCommandesPayees' },
  { id: 'AF-2', nom: 'fait malgré l\'échec', fichier: T, chercher: '      } catch {\n        r.echecs++\n      }', remplacer: '      } catch {\n        r.echecs++\n        await supabaseAdmin.rpc(\'ops_argent_fait\', { p_msg_id: m.msg_id, p_cle: m.cle, p_resultat: {} })\n      }' },
  { id: 'AF-2', nom: 'capacité fausse', fichier: T, chercher: "p_capacite: 'livraison'", remplacer: "p_capacite: 'livrer'" },
  { id: 'AF-2', nom: 'brouillon livré', fichier: T, chercher: "  if (data.etat === 'brouillon') return { ignore: 'brouillon' }\n  if (!ETATS_LIVRABLES.includes(data.etat))", remplacer: "  if (!['brouillon', ...ETATS_LIVRABLES].includes(data.etat))" },
  { id: 'AF-2', nom: 'type inconnu marqué fait', fichier: T, chercher: '        continue\n      }\n      try {', remplacer: '        await supabaseAdmin.rpc(\'ops_argent_fait\', { p_msg_id: m.msg_id, p_cle: m.cle, p_resultat: {} })\n        continue\n      }\n      try {' },
  { id: 'AF-3', nom: 'budget vu entre deux lectures seulement', fichier: T, chercher: 'const reste = budgetMs - (Date.now() - debut)', remplacer: 'const reste = 3_600_000' },
  { id: 'AF-3', nom: 'budget relu trop tard', fichier: T, chercher: '      if (reste <= 0) break lecture\n', remplacer: '' },
  { id: 'AF-4', nom: 'sans borne de 30 jours', fichier: T, chercher: ".gte('paye_le', depuis)", remplacer: '' },
  { id: 'AF-4', nom: 'générées balayées', fichier: T, chercher: ".eq('etat', 'payee').gte", remplacer: ".in('etat', ['payee', 'generee']).gte" },
  { id: 'AF-4', nom: 'clé sans préfixe', fichier: T, chercher: 'p_cle: `commande_payee:${c.id}`', remplacer: 'p_cle: `${c.id}`' },
  { id: 'AF-5', nom: 'lib/email importé', fichier: T, chercher: "import { envoyerAlertes } from '@/lib/alertes'", remplacer: "import { envoyerAlertes } from '@/lib/alertes'\nimport { notifierEntreprise } from '@/lib/email'\nexport const _n = notifierEntreprise" },
  { id: 'AF-5', nom: 'commande écrite', fichier: T, chercher: "  if (data.etat === 'brouillon') return { ignore: 'brouillon' }", remplacer: "  if (data.etat === 'brouillon') { await supabaseAdmin.from('sites_commandes').update({ modifie_le: new Date().toISOString() }).eq('id', id); return { ignore: 'brouillon' } }" },
  { id: 'AF-6', nom: 'fait appelé deux fois', fichier: T, chercher: '        if (f.error) r.echecs++', remplacer: "        await supabaseAdmin.rpc('ops_argent_fait', { p_msg_id: m.msg_id, p_cle: m.cle, p_resultat: resultat ?? {} })\n        if (f.error) r.echecs++" },
  { id: 'AF-6', nom: 'gestionnaire rappelé de mémoire', fichier: T, chercher: '    if (!messages.length) break\n', remplacer: '    if (!messages.length) { for (const [, h] of Object.entries(handlers)) await h({ commande_id: \'00000000-0000-4000-8000-000000000000\' }).catch(() => null); break }\n' },
  { id: 'AF-9', nom: 'dépôt qui bloque l\'argent', fichier: T, chercher: '    return { depose: false }\n  }\n}', remplacer: '    throw new Error(\'dépôt manqué\')\n  }\n}' },
  { id: 'AF-9', nom: 'second dépôt', fichier: T, chercher: '    if (deja.data === true) return { depose: false, deja: true }\n', remplacer: '' },
  { id: 'AF-9', nom: 'photo d\'un autre dossier', fichier: T, chercher: ' || m[1] !== commande.artisan_id) continue', remplacer: ') continue' },
  { id: 'AF-9', nom: 'clé hors format', fichier: T, chercher: 'const entree = { commande, artisan,', remplacer: 'const entree = { commande, artisan, source: \'poste\',' },
  { id: 'AF-9', nom: 'générée déposée', fichier: T, chercher: "if (data.etat === 'payee' && tache)", remplacer: 'if (tache)' },
  { id: 'AF-9', nom: 'lecture de sortie', fichier: T, chercher: '    const deja = await usine.exists(`${base}/commande.json`)', remplacer: '    await usine.download(`${tache}/sortie/rapport.json`)\n    const deja = await usine.exists(`${base}/commande.json`)' },
]

export const CRITERES = {
  'AF-1': { juger: jugerExistence },
  'AF-2': { juger: parSonde('traitement') },
  'AF-3': { juger: parSonde('budget') },
  'AF-4': { juger: parSonde('balayage') },
  'AF-5': { juger: async (r) => jugerLecture(r) },
  'AF-6': { juger: parSonde('unefois') },
  'AF-7': { juger: jugerTypecheck, temoin: async (r) => C.eprouverLectureTypecheck(r, [MODULE]) },
  'AF-8': { juger: jugerReel, reel: true },
  'AF-9': { juger: parSonde('usine') },
}

async function principal() {
  const o = C.lireOptions(process.argv.slice(2), JUGE)
  await S.derouler({
    juge: JUGE, ids: IDS, criteres: CRITERES, sabotages: SABOTAGES, o,
    temoin: { lot03: ['lib/agents/bus.ts'], propres: [MODULE] },
    prealables: [C.autoControleFauxPostgrest],
    notes: [`horloge simulée figée au ${INSTANT} dans chaque sonde ; ${RACCOURCI_DIT}`],
  })
}
if (S.estLance(FICHIER)) await principal()
