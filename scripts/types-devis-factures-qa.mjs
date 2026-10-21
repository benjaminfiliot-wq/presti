#!/usr/bin/env node
// scripts/types-devis-factures-qa.mjs — juge des TYPES DE DEVIS ET DE FACTURES (demande du fondateur du 21/10/2026 : entreprises
// tous corps d'état, chantiers longs ; drapeaux `devisLots` et `facturesSituation`, migration 0176, lib/facturesTypes.ts).
// Gratuit : aucun réseau, aucune base réelle, aucun appel IA (le client Anthropic est remplacé par une doublure qui rend une
// FIXTURE), aucun envoi. lib/factureDepuisDevis.ts est rejoué pour de vrai sur une BASE EN MÉMOIRE (supabaseAdmin.from / .rpc
// remplacés) : ce sont les montants, les lignes et les colonnes que la fonction écrirait. Le PDF est RENDU (le composant
// lib/DevisPDF.tsx, transpilé à la volée) et son texte relu.
//
//  A. DRAPEAUX BAISSÉS = RIEN DE VISIBLE : 404 sans toucher la base, aucune colonne neuve écrite, écran et assistant d'avant,
//     prompt de chiffrage octet pour octet celui de HEAD.
//  B. DEVIS PAR LOTS : totaux identiques au devis simple, regroupement, PDF réel avec titres et sous-totaux.
//  C. SITUATIONS ET SOLDE : 30 → 70 → 100 % au centime, avec acompte, par lot, avoir, refus (> 100 %, recul, rien à facturer…),
//     solde, argent du dossier (lib/crm/argent.ts), Factur-X, PDF des mentions, arrondis sur 300 devis tirés au sort.
//  D. FAIL-CLOSED SANS 0176 : 503 sans numéro tiré, chemins d'avant intacts, lignes refusées = facture retirée.
//  E. MIGRATION 0176 : idempotente, additive, garde-fous en base, jumeau et contrôle ; rejouée dans PGlite si PGLITE_DIR.
//  G. DÉFAUTS VUS EN PRODUCTION LE 21/10 : unités (m² gardés), taux de TVA 0 jamais remplacé, régime lu par le chiffrage, prix
//     d'une ligne « vos tarifs » égal au tarif (sinon « estimation ») ; et (D3, D5-D8) jamais une facture scellée sans ses lignes.
//  F. HYGIÈNE : aucun octet de contrôle, aucun « Presti » dans le PDF artisan.
//
// Usage : node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/types-devis-factures-qa.mjs
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'
import { execFileSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.removeAllListeners('warning')
process.on('warning', (w) => { if (w.code !== 'MODULE_TYPELESS_PACKAGE_JSON' && w.name !== 'ExperimentalWarning') console.error(w) })
process.env.ANTHROPIC_API_KEY ||= 'test-sans-appel'
const rouges = []
let verts = 0
const T = (nom, cond, detail = '') => { if (cond) { verts++; console.log(`PASS ${nom}`) } else { rouges.push(nom); console.log(`FAIL ${nom}${detail ? ' — ' + String(detail).slice(0, 600) : ''}`) } }
const lire = (rel) => fs.readFileSync(path.join(RACINE, rel), 'utf8').replace(/\r\n/g, '\n')
const existe = (rel) => fs.existsSync(path.join(RACINE, rel))
const imp = (rel) => import(pathToFileURL(path.join(RACINE, rel)).href)
const c = (n) => Math.round(Number(n) * 100) // en centimes
const console_error = console.error
let silences = 0
const silence = async (fn) => { silences++; console.error = () => {}; try { return await fn() } finally { if (--silences === 0) console.error = console_error } }

const { FLAGS } = await imp('lib/flags.ts')
const FT = await imp('lib/facturesTypes.ts')
const { computeTotals } = await imp('lib/devisTotals.ts')
const { supabaseAdmin } = await imp('lib/supabaseAdmin.ts')
const { creerFacture, simulerFacture } = await imp('lib/factureDepuisDevis.ts')
const { reinitialiserSondes } = await imp('lib/facturesTypesServeur.ts')
const { emettreFacture, JETON_NUMERO } = await imp('lib/factureEmission.ts')
const { creerAvoir } = await imp('lib/avoirFacture.ts')
const { buildPdfData } = await imp('lib/devisPdfData.ts')
const { argentDossier, estAcompte, estSituation } = await imp('lib/crm/argent.ts')
const { actionsChantier } = await imp('lib/crm/chantier.ts')
const { genererFacturX, controlerAvantEmission } = await imp('lib/facturx.ts')
const FLAGS_ORIGINE = { devisLots: FLAGS.devisLots, facturesSituation: FLAGS.facturesSituation }

// ═══════════════════════ La base en mémoire ═══════════════════════
// Le contrat imité : celui de PostgREST tel que lib/factureDepuisDevis.ts l'utilise. Sans 0176 (`colonnes0176: false`), une
// colonne neuve lue ou écrite rend une erreur « column does not exist », et `select('*')` ne la rend pas.
const COLS_0176 = ['type_devis', 'lot', 'type_facture', 'situation_numero', 'avancement_pct', 'avancement_lots', 'marche_ht', 'cumul_ht', 'situation_detail']
const A = '11111111-1111-4111-8111-111111111111'
let etat
let seq = 0
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`
function nouvelleBase({ colonnes0176 = true } = {}) {
  etat = {
    colonnes0176, numero: 0, appels: [], echecLignes: false,
    tables: {
      artisans: [{
        id: A, tva_regime: 'reel', tva_sur_debits: false, nom: 'Entreprise Essai TCE', metier: 'Entreprise tous corps d’état', forme_juridique: 'SARL',
        siret: '12345678900011', adresse: '1 rue de l’Essai', code_postal: '75000', ville: 'Paris', tel_public: '0100000000', email_public: 'essai@exemple.invalid',
        tva_num: 'FR00123456789', assurance_nom: 'Assureur Essai', assurance_contrat: 'C-0001', assurance_activites: 'tous corps d’état', assurance_zone: 'France',
        zone_intervention: 'Paris', mediateur_nom: 'Médiateur Essai', mediateur_url: 'https://mediateur.exemple.invalid',
      }],
      devis: [], devis_lignes: [], factures: [], factures_lignes: [],
    },
  }
}
class Requete {
  constructor(table) { this.t = table; this.op = 'select'; this.cols = '*'; this.filtres = []; this.ordre = null; this.retour = false }
  select(cols = '*', o = {}) { if (this.op === 'select') { this.cols = cols; this.compte = !!o.count } else this.retour = true; return this }
  eq(k, v) { this.filtres.push((r) => r[k] === v); return this }
  in(k, vs) { this.filtres.push((r) => vs.includes(r[k])); return this }
  order(k) { this.ordre = k; return this }
  limit() { return this }
  insert(v) { this.op = 'insert'; this.val = v; return this }
  update(v) { this.op = 'update'; this.val = v; return this }
  delete() { this.op = 'delete'; return this }
  maybeSingle() { this.mode = 'maybe'; return this.exec() }
  single() { this.mode = 'single'; return this.exec() }
  then(a, b) { return this.exec().then(a, b) }
  async exec() {
    const e = etat
    const rows = e.tables[this.t]
    e.appels.push({ table: this.t, op: this.op, val: this.val })
    const neuve = (k) => COLS_0176.includes(k)
    const absente = { data: null, error: { message: 'column does not exist' } }
    if (this.op === 'select') {
      if (!e.colonnes0176 && this.cols !== '*' && this.cols.split(',').map((x) => x.trim()).some(neuve)) return absente
      let out = rows.filter((r) => this.filtres.every((f) => f(r))).map((r) => (e.colonnes0176 ? { ...r } : Object.fromEntries(Object.entries(r).filter(([k]) => !neuve(k)))))
      if (this.ordre) out.sort((x, y) => (x[this.ordre] ?? 0) - (y[this.ordre] ?? 0))
      if (this.compte) return { data: null, count: out.length, error: null }
      if (this.mode === 'maybe') return { data: out[0] ?? null, error: null }
      if (this.mode === 'single') return out[0] ? { data: out[0], error: null } : { data: null, error: { message: 'aucune ligne' } }
      return { data: out, error: null }
    }
    if (this.op === 'insert') {
      const liste = Array.isArray(this.val) ? this.val : [this.val]
      if (!e.colonnes0176 && liste.some((r) => Object.keys(r).some(neuve))) return absente
      if (this.t === 'factures_lignes' && e.echecLignes) return { data: null, error: { message: 'insertion des lignes refusée (essai)' } }
      const ins = liste.map((r) => ({ id: uuid(), date_emission: '2026-10-21', verrouillee: false, statut: 'emise', created_at: new Date(Date.now() + seq).toISOString(), ...r }))
      if (this.t === 'factures_lignes' && e.lignesTronquees) ins.pop()
      rows.push(...ins)
      if (this.mode === 'single') return { data: ins[0], error: null }
      return { data: this.retour ? ins : null, error: null }
    }
    if (this.op === 'update') {
      if (!e.colonnes0176 && Object.keys(this.val).some(neuve)) return absente
      for (const r of rows) if (this.filtres.every((f) => f(r))) Object.assign(r, this.val)
      return { data: null, error: null }
    }
    if (this.op === 'delete') {
      e.tables[this.t] = rows.filter((r) => !this.filtres.every((f) => f(r)))
      return { data: null, error: null }
    }
    return { data: null, error: { message: 'opération inconnue' } }
  }
}
supabaseAdmin.from = (t) => new Requete(t)
// public.facture_emettre (0180), imitée selon SON contrat : tout ou rien (instantané des tables rendu en cas d'échec), sous un
// verrou unique (le verrou artisan de la fonction), déjà-facturé RECALCULÉ à partir des factures comptées du devis, « jamais plus
// que le devis » pour tous les types, montant d'une situation = cumul − déjà facturé, d'un solde = devis − déjà facturé, numéro
// tiré DANS la transaction. Le SQL réel est relu en E et rejoué dans PGlite quand il est là (E7). `etat.coupure` simule une panne
// au milieu ; `etat.sans0180` la fonction absente ; le délai de 5 ms laisse deux appels concurrents LIRE avant d'émettre.
const { createHash } = await import('node:crypto')
let fileVerrou = Promise.resolve()
const sousVerrou = (fn) => { const r = fileVerrou.then(fn, fn); fileVerrou = r.then(() => {}, () => {}); return r }
const r2 = (n) => Math.round(n * 100) / 100
async function fauxEmettre(p) {
  if (etat.sans0180) return { data: null, error: { code: 'PGRST202', message: 'Could not find the function public.facture_emettre(p) in the schema cache' } }
  await new Promise((ok) => setTimeout(ok, 5))
  return sousVerrou(() => {
    const instantane = JSON.stringify(etat.tables), numeroAvant = etat.numero
    const refus = (m) => { throw Object.assign(new Error(`refus : ${m}`), { code: 'P0001' }) }
    try {
      const f = p.facture ?? {}, lignes = p.lignes ?? [], type = p.type ?? 'standard'
      if (!lignes.length) refus('une facture sans ligne ne s emet pas')
      if (!String(f.client_nom ?? '').trim()) refus('le nom du client est obligatoire')
      if (!p.empreinte_modele || !p.empreinte_modele.includes(`"${JETON_NUMERO}"`)) refus('modele d empreinte absent')
      const rem = Number(f.remise_pct) || 0
      const parTaux = new Map()
      for (const l of lignes) parTaux.set(Number(l.tva_taux) || 0, (parTaux.get(Number(l.tva_taux) || 0) ?? 0) + Number(l.quantite) * Number(l.prix_unitaire_ht) * (1 - rem / 100))
      const ht = r2([...parTaux.values()].reduce((a, b) => a + b, 0)), tva = [...parTaux.entries()].reduce((a, [t, v]) => a + r2((v * t) / 100), 0)
      if (Math.abs(ht - f.total_ht) > 0.02) refus(`le total HT (${f.total_ht}) ne correspond pas aux lignes (${ht})`)
      if (Math.abs(tva - f.total_tva) > 0.01 * (parTaux.size + 1)) refus('la TVA ne correspond pas aux lignes')
      if (Math.abs(f.total_ht + f.total_tva - f.total_ttc) > 0.01) refus('TTC different de HT + TVA')
      const comptees = (d) => etat.tables.factures.filter((x) => x.devis_id === d && !x.avoir_de && ['emise', 'payee'].includes(x.statut) && !etat.tables.factures.some((a) => a.avoir_de === x.id))
      let devisId = p.devis_id ?? null
      if (type === 'avoir') {
        const cible = etat.tables.factures.find((x) => x.id === p.avoir_de && x.artisan_id === p.artisan_id)
        if (!cible) refus('facture introuvable')
        if (!cible.verrouillee || cible.avoir_de || cible.statut === 'annulee' || etat.tables.factures.some((a) => a.avoir_de === cible.id)) refus('cette facture est deja annulee par un avoir')
        if (Math.abs(f.total_ht + Number(cible.total_ht)) > 0.01) refus('un avoir porte exactement l oppose de la facture annulee')
        devisId = cible.devis_id ?? null
      } else if (devisId) {
        const d = etat.tables.devis.find((x) => x.id === devisId)
        if (!d || d.artisan_id !== p.artisan_id) refus('devis introuvable')
        if (d.statut !== 'accepte') refus('on ne facture qu un devis signe')
        const cs = comptees(devisId), deja = r2(cs.reduce((a, x) => a + Number(x.total_ht), 0))
        if (f.total_ht <= 0 && type !== 'standard') refus('rien a facturer')
        if (deja + f.total_ht > Number(d.total_ht) + 0.01 * (cs.length + 4)) refus(`jamais plus que le devis (deja facture ${deja} HT, cette facture ${f.total_ht} HT, devis ${d.total_ht} HT)`)
        if (type === 'situation' && Math.abs(f.total_ht - (Number(f.cumul_ht) - deja)) > 0.01 * (cs.length + 1)) refus('le montant de la situation ne correspond plus au deja facture')
        if (type === 'solde' && Math.abs(f.total_ht - (Number(d.total_ht) - deja)) > 0.01 * (cs.length + 4)) refus('le solde ne correspond plus au deja facture')
      } else if (['acompte', 'situation', 'solde'].includes(type)) refus('une facture d acompte, de situation ou de solde se rattache a un devis')
      const SIT = ['situation_numero', 'avancement_pct', 'avancement_lots', 'marche_ht', 'cumul_ht', 'situation_detail']
      const entete = Object.fromEntries(Object.entries(f).filter(([k]) => type === 'situation' || !SIT.includes(k)))
      const id = uuid()
      etat.tables.factures.push({ date_emission: '2026-10-21', ...entete, id, artisan_id: p.artisan_id, devis_id: devisId, numero: null, statut: 'emise', verrouillee: false, created_at: new Date(Date.now() + seq).toISOString(), avoir_de: type === 'avoir' ? p.avoir_de : null, type_facture: type === 'avoir' ? null : type })
      if (etat.coupure === 'facture') throw new Error('coupure après l’en-tête (essai)')
      lignes.forEach((l, i) => etat.tables.factures_lignes.push({ unite: 'u', designation: l.designation, quantite: l.quantite, prix_unitaire_ht: l.prix_unitaire_ht, tva_taux: l.tva_taux, ...(l.unite ? { unite: l.unite } : {}), ...(l.source_prix ? { source_prix: l.source_prix } : {}), ...(l.lot ? { lot: l.lot } : {}), id: uuid(), facture_id: id, ordre: i }))
      if (etat.coupure === 'lignes') throw new Error('coupure après les lignes (essai)')
      const num = ++etat.numero
      const numero = `FAC-${p.annee}-${String(num).padStart(4, '0')}`
      if (etat.numerosPris?.has(numero)) throw new Error('duplicate key value violates unique constraint "factures_artisan_numero_unique"')
      if (etat.coupure === 'numero') throw new Error('coupure au scellement (essai)')
      const row = etat.tables.factures.find((x) => x.id === id)
      Object.assign(row, { numero, verrouillee: true, emise_le: new Date().toISOString(), empreinte: createHash('sha256').update(p.empreinte_modele.replace(`"${JETON_NUMERO}"`, JSON.stringify(numero)), 'utf8').digest('hex') })
      if (type === 'avoir') etat.tables.factures.find((x) => x.id === p.avoir_de).statut = 'annulee'
      return { data: { id, numero }, error: null }
    } catch (e) {
      etat.tables = JSON.parse(instantane)
      etat.numero = numeroAvant
      return { data: null, error: { code: e.code ?? 'XX000', message: e.message } }
    }
  })
}
supabaseAdmin.rpc = async (nom, args) => {
  etat.appels.push({ rpc: nom })
  if (nom === 'facture_emettre') return fauxEmettre(args?.p ?? {})
  return { data: null, error: { message: 'rpc inconnue' } }
}

/** Un devis SIGNÉ, ses totaux calculés comme les routes /api/devis les calculent (computeTotals sur les lignes). */
function devisSigne(lignes, { remise = 0, type = 'simple', statut = 'accepte' } = {}) {
  const id = uuid()
  const t = computeTotals(lignes, remise)
  etat.tables.devis.push({ id, artisan_id: A, numero: `DEV-2026-${String(seq).padStart(4, '0')}`, objet: 'Rénovation complète', statut, remise_pct: remise, acompte_pct: 30, client_nom: 'Client Essai', client_adresse: '2 rue du Client, 75000 Paris', total_ht: t.total_ht, total_tva: t.total_tva, total_ttc: t.total_ttc, ...(etat.colonnes0176 ? { type_devis: type } : {}) })
  lignes.forEach((l, i) => etat.tables.devis_lignes.push({ id: uuid(), devis_id: id, ordre: i, unite: 'u', ...l, ...(etat.colonnes0176 ? {} : { lot: undefined }) }))
  if (!etat.colonnes0176) for (const l of etat.tables.devis_lignes) delete l.lot
  return { id, totals: t }
}
const facturer = (devisId, p = {}) => silence(() => creerFacture({ artisanId: A, devisId, ...p }))
const facture = (id) => etat.tables.factures.find((f) => f.id === id)
const lignesDe = (id) => etat.tables.factures_lignes.filter((l) => l.facture_id === id).sort((a, b) => a.ordre - b.ordre)
/** L'avoir, par le VRAI chemin de la route POST /api/factures/[id]/avoir (lib/avoirFacture.ts, émission atomique 0180). */
const avoirSur = (id) => silence(() => creerAvoir({ artisanId: A, factureId: id }))
const lever = (devisLots, facturesSituation) => { FLAGS.devisLots = devisLots; FLAGS.facturesSituation = facturesSituation; reinitialiserSondes() }
const remettre = () => lever(FLAGS_ORIGINE.devisLots, FLAGS_ORIGINE.facturesSituation)
const insertionsFactures = () => etat.appels.filter((x) => (x.table === 'factures' || x.table === 'factures_lignes') && x.op === 'insert')

// Le devis du cas d'école : 10 000 € HT à 10 %, 5 000 € HT à 20 % — 17 000 € TTC.
const ECOLE = [
  { designation: 'Gros œuvre', quantite: 1, prix_unitaire_ht: 10000, tva_taux: 10 },
  { designation: 'Électricité neuve', quantite: 1, prix_unitaire_ht: 5000, tva_taux: 20 },
]
// Le devis par lots : Lot 1 2 000 € (10 %), Lot 2 6 000 € (10 %) + 1 000 € (20 %), Lot 3 3 000 € (10 %).
const LOTS3 = [
  { designation: 'Démolition cloisons', quantite: 1, prix_unitaire_ht: 2000, tva_taux: 10, lot: 'Lot 1 — Démolition' },
  { designation: 'Réseaux eau', quantite: 1, prix_unitaire_ht: 6000, tva_taux: 10, lot: 'Lot 2 — Plomberie' },
  { designation: 'Chauffe-eau neuf (extension)', quantite: 1, prix_unitaire_ht: 1000, tva_taux: 20, lot: 'Lot 2 — Plomberie' },
  { designation: 'Peinture murs', quantite: 1, prix_unitaire_ht: 3000, tva_taux: 10, lot: 'Lot 3 — Peinture' },
]

// Le PDF réel : lib/DevisPDF.tsx transpilé (JSX) dans un dossier temporaire, rendu par @react-pdf/renderer, texte relu.
const ts = (await import('typescript')).default
const dossierPdf = fs.mkdtempSync(path.join(os.tmpdir(), 'types-devis-pdf-'))
const fichierPdf = path.join(dossierPdf, 'DevisPDF.mjs')
fs.writeFileSync(fichierPdf, ts.transpileModule(lire('lib/DevisPDF.tsx'), { compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText)
const { DevisPDF } = await import(pathToFileURL(fichierPdf).href)
const React = (await import('react')).default
const { renderToStream } = await import('@react-pdf/renderer')
async function textePdf(d) {
  const flux = await renderToStream(React.createElement(DevisPDF, { d }))
  const morceaux = []
  for await (const m of flux) morceaux.push(typeof m === 'string' ? Buffer.from(m) : m)
  const brut = Buffer.concat(morceaux).toString('latin1')
  let texte = ''
  for (const m of brut.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    let b
    try { b = zlib.inflateSync(Buffer.from(m[1], 'latin1')) } catch { continue }
    for (const tj of b.toString('latin1').matchAll(/\[([^\]]*)\]\s*TJ/g)) texte += [...tj[1].matchAll(/<([0-9a-fA-F]*)>/g)].map((h) => Buffer.from(h[1], 'hex').toString('latin1')).join('')
    texte += ' '
  }
  return { pdf: brut, plat: texte.replace(/[\x00-\x1f\x7f-\x9f]/g, '').replace(/\s+/g, '') }
}
const ARTISAN_PDF = { nom: 'Entreprise Essai TCE', tva_regime: 'reel', siret: '12345678900011' }

// ═══════════════════════ A. Drapeaux baissés = rien de visible ═══════════════════════
{
  const src = lire('lib/flags.ts')
  // 21/10/2026 : drapeaux LEVÉS après 0176 + 0180 appliquées et l'audit argent corrigé. A2-A3 jouent toujours le chemin
  // « drapeau baissé » (lever(false, false)) : il reste celui d'un retour en arrière.
  T('A1 drapeaux `devisLots` et `facturesSituation` déclarés après `crmPointage`, commentés et datés 21/10/2026, LEVÉS après 0176 et 0180',
    FLAGS_ORIGINE.devisLots === true && FLAGS_ORIGINE.facturesSituation === true
    && /crmPointage: true,\n  \/\*\* 21\/10\/2026 — DEVIS PAR LOTS[\s\S]{0,1600}21\/10\/2026 — LEVÉ[\s\S]{0,400}devisLots: true,\n  \/\*\* 21\/10\/2026 — TYPES DE FACTURE[\s\S]{0,2000}21\/10\/2026 — LEVÉ[\s\S]{0,500}facturesSituation: true,/.test(src))

  nouvelleBase()
  lever(false, false)
  const dv = devisSigne(ECOLE)
  etat.appels = []
  const r1 = await facturer(dv.id, { type: 'situation', avancement: { global: 30 } })
  const r2 = await facturer(dv.id, { type: 'solde' })
  T('A2 drapeau baissé : `situation` et `solde` explicites → 404, sans une seule lecture ni écriture en base, sans numéro tiré',
    !r1.ok && r1.status === 404 && !r2.ok && r2.status === 404 && etat.appels.length === 0, JSON.stringify([r1, r2, etat.appels.length]))

  const r3 = await facturer(dv.id, { type: 'acompte', acomptePct: 30 })
  const f3 = r3.ok ? facture(r3.id) : null
  const r4 = await facturer(dv.id)
  const f4 = r4.ok ? facture(r4.id) : null
  const SIT = ['situation_numero', 'avancement_pct', 'avancement_lots', 'marche_ht', 'cumul_ht', 'situation_detail']
  T('A3 drapeau baissé : acompte puis facture → le chemin d’avant (acompte 30 % puis SOLDE) ; seul le type est écrit (0176 appliquée), aucune donnée de situation',
    r3.ok && r4.ok && c(f3.total_ht) === 450000 && c(f4.total_ht) === 1050000 && /^Solde — /.test(f4.objet) && f3.type_facture === 'acompte' && f4.type_facture === 'solde'
    && [f3, f4].every((f) => SIT.every((k) => !(k in f))) && lignesDe(f4.id).every((l) => !('lot' in l)), JSON.stringify([f3, f4]))

  const rf = lire('app/api/factures/route.ts')
  T('A4 POST /api/factures : drapeau baissé, `situation`/`solde` → 404 avant creerFacture ; tout autre `type` ignoré (le chemin d’avant)',
    /if \(!ouvert && \(type === 'situation' \|\| type === 'solde'\)\) return NextResponse\.json\(\{ error: 'Type de facture indisponible\.' \}, \{ status: 404 \}\)/.test(rf)
    && /const options = ouvert && type && type !== 'inconnu'/.test(rf) && /const ouvert = actif\('facturesSituation'\)/.test(rf))
  const rd = lire('app/api/devis/route.ts'), rdi = lire('app/api/devis/[id]/route.ts'), rg = lire('app/api/devis/generer/route.ts')
  T('A5 routes devis : `type_devis` et `lot` lus SEULEMENT drapeau `devisLots` levé ; chiffrage : `par_lots` seulement drapeau levé',
    [rd, rdi].every((s) => /const lotsOuverts = actif\('devisLots'\)/.test(s) && /const typeDevis = lotsOuverts \? typeDevisDemande\(b\?\.type_devis\) : null/.test(s) && /const colonnesLots = lotsOuverts \? await colonnesLotsPresentes\(\) : false/.test(s))
    && /const parLots = actif\('devisLots'\) && body\?\.par_lots === true/.test(rg))
  const ed = lire('app/devis/[id]/page.tsx')
  T('A6 écran du devis : tout le neuf derrière LOTS = actif(devisLots) et TYPES_FACTURE_ECRAN = actif(facturesSituation) ; baissé, « Créer la facture » envoie { devis_id } comme avant',
    /const LOTS = actif\('devisLots'\)/.test(ed) && /const TYPES_FACTURE_ECRAN = actif\('facturesSituation'\)/.test(ed)
    && /onClick=\{TYPES_FACTURE_ECRAN \? ouvrirChoixFacture : creerFacture\}/.test(ed) && /const corpsFacture = !TYPES_FACTURE_ECRAN \? \{ devis_id: savedId \}/.test(ed)
    && /\{TYPES_FACTURE_ECRAN && choixFacture && \(\n\s*<div className="tool-card" data-choix-facture>/.test(ed)
    && /\{LOTS && \(\n\s*<div className="inbox-model" role="radiogroup" aria-label="Type de devis" data-type-devis/.test(ed)
    && /\{LOTS && typeDevis === 'lots' && \(\n\s*<div data-lots/.test(ed) && /\{LOTS && typeDevis === 'lots' && <input className="desig" list="lots-devis"/.test(ed)
    && (ed.match(/\{LOTS && typeDevis === 'lots' && <tr data-lot-(titre|sous-total)>/g) ?? []).length === 2
    && /if \(isNew && LOTS && metierParLots\(a\.metier\)\) setTypeDevis\('lots'\)/.test(ed) && /\.\.\.\(LOTS \? \{ type_devis: typeDevis \} : \{\}\)/.test(ed))

  remettre() // les drapeaux réels (levés) avant le premier chargement du module de l'assistant
  const oa = await imp('lib/assistant/outils-actions.ts')
  const v = (e) => oa.validerAction('creer_facture', e)
  // La liste des types de l'assistant se fixe au chargement du module d'après le drapeau (le cas baissé est vérifié sur le source, C).
  T('A7 assistant, drapeau levé : les 4 types (« complete », « acompte », « situation », « solde ») et avancement_pct acceptés',
    JSON.stringify(oa.TYPES_FACTURE) === JSON.stringify(['complete', 'acompte', 'situation', 'solde']) && v({ devis_numero: 'DEV-2026-0001', type: 'situation', avancement_pct: 30 }).ok === true
    && v({ devis_numero: 'DEV-2026-0001', type: 'solde' }).ok === true && v({ devis_numero: 'DEV-2026-0001' }).ok === true && ('avancement_pct' in oa.SPEC.creer_facture.champs))

  // A8 — le prompt de chiffrage : octet pour octet celui de HEAD hors devis par lots (doublure du client Anthropic, fixture).
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const captures = []
  const FIXTURE = { lignes: [
    { lot: 'Lot 1 — Démolition', designation: 'Dépose cloison', quantite: 12, unite: 'm2', prix_unitaire_ht: 35, tva_taux: 10, source_prix: 'estimation' },
    { lot: 'Lot 2 — Plomberie\u0007 ', designation: 'Alimentation PER', quantite: 20, unite: 'ml', prix_unitaire_ht: 18.5, tva_taux: 10, source_prix: 'Grossiste Inventé · 01/01/2026' },
  ], note: 'Estimations à valider.' }
  const createAvant = Anthropic.Messages.prototype.create
  Anthropic.Messages.prototype.create = async function (params) { captures.push(params); return { content: [{ type: 'text', text: JSON.stringify(FIXTURE) }] } }
  try {
    const ai = await imp('lib/ai.ts')
    const art = { nom: 'Essai', metier: 'Entreprise tous corps d’état', tva_regime: 'reel' }
    const desc = 'Rénovation d’un appartement : démolition d’une cloison de 12 m², plomberie de la salle d’eau.'
    const simple = await ai.generateDevis(art, desc, [], 'claude-haiku-5-5')
    const lots = await ai.generateDevis(art, desc, [], 'claude-haiku-5-5', null, { parLots: true })
    // HEAD : lib/ai.ts tel qu'il est versionné, ses imports relatifs réécrits vers le projet.
    const tete = execFileSync('git', ['show', 'HEAD:lib/ai.ts'], { cwd: RACINE, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
      .replace(/from '\.\/([^']+)'/g, (_m, p) => `from '${pathToFileURL(path.join(RACINE, 'lib', p)).href}'`)
    const fTete = path.join(dossierPdf, 'ai-head.ts')
    fs.writeFileSync(fTete, tete)
    const aiTete = await import(pathToFileURL(fTete).href)
    await aiTete.generateDevis(art, desc, [], 'claude-haiku-5-5')
    const [pSimple, pLots, pTete] = captures
    T('A8 chiffrage IA hors devis par lots : prompt système, message et max_tokens IDENTIQUES à HEAD (octet pour octet), aucun `lot` rendu',
      captures.length === 3 && pSimple.system === pTete.system && JSON.stringify(pSimple.messages) === JSON.stringify(pTete.messages) && pSimple.max_tokens === pTete.max_tokens
      && simple.lignes.every((l) => !('lot' in l)), `${pSimple?.system?.length} vs ${pTete?.system?.length}`)
    T('B9 chiffrage IA par lots : la consigne CONSIGNE_LOTS et le champ "lot" dans le format ; les règles anti-fabrication restent (provenance, TVA)',
      pLots.system.includes(ai.CONSIGNE_LOTS) && pLots.system.includes('"lot":"Lot 1 — ..."') && pLots.system.includes('PROVENANCE DE CHAQUE PRIX') && pLots.system.includes('N\'invente JAMAIS une provenance')
      && pLots.system.replace(ai.CONSIGNE_LOTS, '').replace('"lot":"Lot 1 — ...",', '') === pTete.system && pLots.max_tokens > pTete.max_tokens)
    T('B10 chiffrage IA par lots (fixture) : chaque ligne garde son lot, nettoyé (caractère de contrôle retiré) ; une provenance inventée retombe sur « estimation »',
      lots.lignes.length === 2 && lots.lignes[0].lot === 'Lot 1 — Démolition' && lots.lignes[1].lot === 'Lot 2 — Plomberie' && lots.lignes[1].source_prix === 'estimation' && lots.lignes[0].unite === 'm²',
      JSON.stringify(lots.lignes))
  } finally { Anthropic.Messages.prototype.create = createAvant }
}

// ═══════════════════════ B. Devis par lots ═══════════════════════
{
  const FIX = [
    [LOTS3, 0],
    [[
      { designation: 'Dépose', quantite: 2.5, prix_unitaire_ht: 13.33, tva_taux: 10, lot: 'Lot 1 — Démolition' },
      { designation: 'Isolation', quantite: 37.4, prix_unitaire_ht: 41.27, tva_taux: 5.5, lot: 'Lot 2 — Isolation' },
      { designation: 'Extension', quantite: 3, prix_unitaire_ht: 1000.01, tva_taux: 20, lot: 'Lot 3 — Maçonnerie' },
      { designation: 'Divers', quantite: 1, prix_unitaire_ht: 99.99, tva_taux: 10 },
      { designation: 'Reprise isolation', quantite: 1.75, prix_unitaire_ht: 12.4, tva_taux: 5.5, lot: 'Lot 2 — Isolation' },
    ], 7.5],
  ]
  let egaux = true, detail = ''
  for (const [lignes, remise] of FIX) {
    const sansLot = lignes.map(({ lot, ...l }) => l)
    const a = buildPdfData({ numero: 'DEV-1', remise_pct: remise, type_devis: 'lots' }, lignes, ARTISAN_PDF)
    const b = buildPdfData({ numero: 'DEV-1', remise_pct: remise }, sansLot, ARTISAN_PDF)
    for (const k of ['totalBrut', 'remiseMontant', 'totalHt', 'totalTtc', 'acompteMontant']) if (a[k] !== b[k]) { egaux = false; detail += `${k} ${a[k]} ≠ ${b[k]} ; ` }
    if (JSON.stringify(a.tvaParTaux) !== JSON.stringify(b.tvaParTaux)) { egaux = false; detail += 'tva ; ' }
    if (JSON.stringify(computeTotals(lignes, remise)) !== JSON.stringify(computeTotals(sansLot, remise))) { egaux = false; detail += 'computeTotals ; ' }
  }
  T('B1 un devis par lots et le même devis simple : total HT, remise, TVA par taux, TTC et acompte IDENTIQUES au centime (2 devis, dont remise 7,5 % et 3 taux)', egaux, detail)

  const g = FT.grouperParLots(FIX[1][0])
  T('B2 regroupement : ordre de première apparition, lignes sans lot à part (titre « Hors lot »), sous-total HT brut par lot',
    JSON.stringify(g.map((x) => x.lot)) === JSON.stringify(['Lot 1 — Démolition', 'Lot 2 — Isolation', 'Lot 3 — Maçonnerie', null])
    && g[1].lignes.length === 2 && c(g[1].sousTotalHt) === Math.round((37.4 * 41.27 + 1.75 * 12.4) * 100) && c(g[2].sousTotalHt) === 300003 && FT.HORS_LOT === 'Hors lot')
  const lotsSeuls = FT.grouperParLots(LOTS3)
  T('B3 sous-totaux des lots = total brut du devis (devis aux montants ronds) : 2 000 + 7 000 + 3 000 = 12 000 € HT',
    lotsSeuls.map((x) => c(x.sousTotalHt)).join(',') === '200000,700000,300000' && lotsSeuls.reduce((s, x) => s + c(x.sousTotalHt), 0) === c(computeTotals(LOTS3, 0).total_ht))
  const melange = [{ lot: 'B', n: 1 }, { lot: 'A', n: 2 }, { lot: 'B', n: 3 }, { lot: null, n: 4 }, { lot: 'A', n: 5 }]
  T('B4 « Regrouper les lignes » : chaque lot d’un seul tenant, ordre de première apparition, ordre interne gardé (tri stable)', FT.regrouperLignes(melange).map((x) => x.n).join('') === '13254')
  T('B5 nom de lot nettoyé : caractères de contrôle retirés, espaces resserrés, 80 caractères au plus, vide → null',
    FT.normaliserLot('  Lot\u0000 1\t—\nDémolition  ') === 'Lot 1 — Démolition' && FT.normaliserLot('x'.repeat(200)).length === 80 && FT.normaliserLot('   ') === null && FT.normaliserLot(42) === null)

  const dLots = buildPdfData({ numero: 'DEV-2026-0042', type_devis: 'lots', remise_pct: 0, client_nom: 'Client Essai' }, LOTS3, ARTISAN_PDF)
  const { plat, pdf } = await textePdf(dLots)
  const simple = await textePdf(buildPdfData({ numero: 'DEV-2026-0042', remise_pct: 0, client_nom: 'Client Essai' }, LOTS3.map(({ lot, ...l }) => l), ARTISAN_PDF))
  const plats = (s) => s.replace(/\s+/g, '')
  T('B6 PDF RENDU (lib/DevisPDF.tsx) d’un devis par lots : chaque lot en titre et « Sous-total <lot> HT : <montant> »',
    pdf.startsWith('%PDF') && ['Lot1', 'Démolition', 'Lot2', 'Plomberie', 'Lot3', 'Peinture'].every((m) => plat.includes(m))
    && plat.includes('Sous-totalLot1') && plat.includes('DémolitionHT:2000,00') && plat.includes('PlomberieHT:7000,00') && plat.includes('PeintureHT:3000,00'), plat.slice(0, 900))
  T('B7 PDF RENDU : total HT, TVA par taux et TTC du devis par lots = ceux du devis simple (12 000,00 HT ; TVA 10 % 1 100,00 ; TVA 20 % 200,00 ; 13 300,00 TTC)',
    ['TotalHT12000,00', 'TVA10%1100,00', 'TVA20%200,00', 'TotalTTC13300,00'].every((m) => plat.includes(m) && simple.plat.includes(m)) && !simple.plat.includes('Sous-total'), simple.plat.slice(0, 600))
  T('B8 garde-fou blanc : le PDF artisan ne porte jamais « Presti »', !/presti/i.test(plat) && !/presti/i.test(lire('lib/DevisPDF.tsx').replace(/\/\/.*$/gm, '')))
}

// ═══════════════════════ C. Situations de travaux et solde ═══════════════════════
lever(true, true)
{
  nouvelleBase()
  const dv = devisSigne(ECOLE)
  const s1 = await facturer(dv.id, { type: 'situation', avancement: { global: 30 } })
  const s2 = await facturer(dv.id, { type: 'situation', avancement: { global: '70' } })
  const s3 = await facturer(dv.id, { type: 'situation', avancement: { global: '100 %' } })
  const [f1, f2, f3] = [s1, s2, s3].map((r) => (r.ok ? facture(r.id) : null))
  const tot = (f) => f && [c(f.total_ht), c(f.total_tva), c(f.total_ttc)].join('/')
  T('C1 situation n° 1 à 30 % d’un devis 10 000 € (10 %) + 5 000 € (20 %) : 4 500,00 HT, 600,00 TVA, 5 100,00 TTC', tot(f1) === '450000/60000/510000', JSON.stringify([s1, tot(f1)]))
  T('C2 situation n° 2 à 70 % (cumul) : 10 500 − 4 500 = 6 000,00 HT ; TVA 400 + 400 ; 6 800,00 TTC', tot(f2) === '600000/80000/680000', JSON.stringify([s2, tot(f2)]))
  T('C3 situation n° 3 à 100 % : 4 500,00 HT ; la somme des trois = le devis au centime (15 000,00 HT, 17 000,00 TTC)',
    tot(f3) === '450000/60000/510000' && [f1, f2, f3].reduce((s, f) => s + c(f.total_ht), 0) === c(dv.totals.total_ht) && [f1, f2, f3].reduce((s, f) => s + c(f.total_ttc), 0) === c(dv.totals.total_ttc))
  T('C4 numéros de situation 1, 2, 3 ; objet « Situation n° k — … » ; type « situation » ; avancement, marché et cumul figés sur la pièce',
    [f1, f2, f3].map((f) => `${f.situation_numero}:${f.type_facture}:${f.avancement_pct}:${f.cumul_ht}:${f.marche_ht}`).join(' ') === '1:situation:30:4500:15000 2:situation:70:10500:15000 3:situation:100:15000:15000'
    && /^Situation n° 2 — Rénovation complète$/.test(f2.objet) && f2.acompte_pct === 0)
  const l2 = lignesDe(f2.id)
  T('C5 lignes de la situation n° 2 : travaux cumulés à 70 % par taux (+7 000 et +3 500), puis « Déduction de la situation n° 1 FAC-… » par taux (−3 000 et −1 500) ; quantité −1, prix positif',
    l2.length === 4 && l2[0].prix_unitaire_ht === 7000 && l2[0].quantite === 1 && l2[1].prix_unitaire_ht === 3500 && l2.slice(2).every((l) => l.quantite === -1 && l.prix_unitaire_ht > 0 && /^Déduction de la situation n° 1 FAC-2026-0001 du 21\/10\/2026 \(TVA (10|20) %\)$/.test(l.designation))
    && l2.slice(2).map((l) => l.prix_unitaire_ht).join(',') === '3000,1500', JSON.stringify(l2))
  T('C6 détail figé (PDF, Factur-X) de la n° 2 : marché 15 000, cumul antérieur 4 500 (30 %), cumul à date 10 500 (70 %), déjà facturé 4 500, montant 6 000',
    JSON.stringify(f2.situation_detail) === JSON.stringify({ mode: 'global', devis_numero: etat.tables.devis[0].numero, marche_ht: 15000, avancement_pct: 70, cumul_ht: 10500, cumul_anterieur_ht: 4500, cumul_anterieur_pct: 30, deja_facture_ht: 4500, montant_ht: 6000 }), JSON.stringify(f2.situation_detail))
  const r101 = await facturer(dv.id, { type: 'situation', avancement: { global: 100 } })
  T('C7 une 4e situation à 100 % (tout facturé) → refus « Rien à facturer », aucun numéro tiré de plus', !r101.ok && r101.status === 409 && /Rien à facturer/.test(r101.error) && etat.numero === 3, JSON.stringify(r101))
  const so = await facturer(dv.id, { type: 'solde' })
  T('C8 après 100 % de situations, la facture de solde est refusée : il ne reste rien', !so.ok && so.status === 409 && /couvrent tout le devis/.test(so.error), JSON.stringify(so))

  // Argent du dossier (lib/crm/argent.ts) et boutons de la fiche chantier.
  const devisRow = etat.tables.devis[0]
  const argent3 = argentDossier(devisRow, etat.tables.factures)
  T('C9 argent du dossier après 100 % de situations : facturé 17 000,00 TTC, reste à facturer 0, couvert, aucune situation prise pour un acompte ni un « acompte double »',
    argent3.facture === 1700000 && argent3.resteAFacturer === 0 && argent3.couvre && argent3.acompteDouble === 0 && argent3.acompte.factures === 0
    && etat.tables.factures.every((f) => !estAcompte(f, 1700000) && estSituation(f)), JSON.stringify(argent3))
}
{
  nouvelleBase()
  const dv = devisSigne(ECOLE)
  const s1 = await facturer(dv.id, { type: 'situation', avancement: { global: 30 } })
  const s2 = await facturer(dv.id, { type: 'situation', avancement: { global: 70 } })
  const a2 = argentDossier(etat.tables.devis[0], etat.tables.factures)
  T('C10 argent du dossier à 70 % : facturé 11 900,00 TTC sur 17 000,00, reste à facturer 5 100,00', a2.facture === 1190000 && a2.resteAFacturer === 510000 && !a2.couvre, JSON.stringify(a2))
  const actions = actionsChantier({ devis: etat.tables.devis[0], factures: etat.tables.factures, leadStatut: null })
  T('C11 fiche chantier après des situations : « Facturer » reste ouvert et émet le SOLDE (plus « déjà facturé »)', actions.facturer.actif === true && actions.facturer.solde === true, JSON.stringify(actions.facturer))
  // L'avoir sur la situation n° 2 : le reste à facturer remonte, la prochaine situation repart de la n° 1, et prend le n° 3.
  const av2 = await avoirSur(s2.id)
  T('C11b l’avoir de la situation n° 2 par le chemin réel (émission atomique) : numéroté dans la séquence, aux montants opposés, la situation passe « annulée »',
    av2.ok && /^FAC-2026-0003$/.test(av2.numero) && c(facture(av2.id).total_ht) === -600000 && facture(s2.id).statut === 'annulee' && lignesDe(av2.id).length === 4, JSON.stringify([av2, av2.ok && facture(av2.id).total_ht, facture(s2.id).statut, av2.ok && lignesDe(av2.id).length]))
  const a3 = argentDossier(etat.tables.devis[0], etat.tables.factures)
  T('C12 un avoir sur la situation n° 2 : facturé redescend à 5 100,00 TTC, reste à facturer 11 900,00', a3.facture === 510000 && a3.resteAFacturer === 1190000, JSON.stringify(a3))
  const recul = await facturer(dv.id, { type: 'situation', avancement: { global: 25 } })
  const s3 = await facturer(dv.id, { type: 'situation', avancement: { global: 70 } })
  const f3 = s3.ok ? facture(s3.id) : null
  T('C13 après l’avoir, la référence redevient la n° 1 (30 %) : 25 % est un recul (409) ; 70 % refacture 6 000,00 HT (10 500 − 4 500), cumul antérieur 30 %, numéro 3 (le 2 n’est jamais réutilisé)',
    !recul.ok && recul.status === 409 && f3 && c(f3.total_ht) === 600000 && f3.situation_numero === 3 && f3.situation_detail.cumul_anterieur_pct === 30 && f3.situation_detail.deja_facture_ht === 4500,
    JSON.stringify([recul, f3 && [f3.total_ht, f3.situation_numero, f3.situation_detail]]))
  const sit = etat.tables.factures.filter((f) => f.type_facture === 'situation').map((f) => `${f.situation_numero}:${f.avancement_pct}:${f.statut}`).join(' ')
  T('C14 enchaînement des situations du devis : 1 (30 %), 2 (70 %, annulée par avoir), 3 (70 %) — chaque numéro une seule fois', sit === '1:30:emise 2:70:annulee 3:70:emise', sit)
  // L'avoir existe mais le statut « annulée » de la facture d'origine n'a pas été posé (la route de l'avoir ne fait que journaliser
  // cet échec) : c'est l'AVOIR qui annule, la situation visée ne compte plus quand même.
  nouvelleBase()
  const dz = devisSigne(ECOLE)
  await facturer(dz.id, { type: 'situation', avancement: { global: 30 } })
  const z2 = await facturer(dz.id, { type: 'situation', avancement: { global: 70 } })
  await avoirSur(z2.id)
  facture(z2.id).statut = 'emise'
  const z3 = await facturer(dz.id, { type: 'situation', avancement: { global: 70 } })
  T('C14b un avoir dont la pièce d’origine est restée « émise » l’annule quand même : la situation suivante à 70 % refacture 6 000,00 HT',
    z3.ok && c(facture(z3.id).total_ht) === 600000 && facture(z3.id).situation_detail.deja_facture_ht === 4500, JSON.stringify([z3, z3.ok && facture(z3.id).total_ht]))
}
{
  // Avec un ACOMPTE préalable (le chemin d'avant, acomptePct) : la situation déduit l'acompte.
  nouvelleBase()
  const dv = devisSigne(ECOLE)
  const ac = await facturer(dv.id, { type: 'acompte', acomptePct: 30 })
  const trop = await facturer(dv.id, { type: 'situation', avancement: { global: 20 } })
  const s1 = await facturer(dv.id, { type: 'situation', avancement: { global: 50 } })
  const s2 = await facturer(dv.id, { type: 'situation', avancement: { global: 100 } })
  const [fa, f1, f2] = [ac, s1, s2].map((r) => (r.ok ? facture(r.id) : null))
  T('C15 acompte 30 % (4 500,00 HT, 5 100,00 TTC, type « acompte ») puis situation à 20 % → refusée : l’acompte couvre déjà ce cumul',
    fa && c(fa.total_ht) === 450000 && fa.type_facture === 'acompte' && !trop.ok && trop.status === 409 && /Rien à facturer : 4 500,00 € HT/.test(trop.error), JSON.stringify(trop))
  T('C16 situation à 50 % après l’acompte : 7 500 − 4 500 = 3 000,00 HT (TVA 200 + 200, 3 400,00 TTC), ligne « Déduction de l’acompte facturé FAC-… »',
    f1 && [c(f1.total_ht), c(f1.total_tva), c(f1.total_ttc)].join('/') === '300000/40000/340000' && lignesDe(f1.id).some((l) => /^Déduction de l’acompte facturé FAC-2026-0001 du 21\/10\/2026 \(TVA 10 %\)$/.test(l.designation) && l.quantite === -1 && l.prix_unitaire_ht === 3000),
    JSON.stringify(f1 && lignesDe(f1.id)))
  T('C17 situation à 100 % : 15 000 − 7 500 = 7 500,00 HT ; acompte + situations = le devis au centime (15 000,00 HT)',
    f2 && c(f2.total_ht) === 750000 && [fa, f1, f2].reduce((s, f) => s + c(f.total_ht), 0) === 1500000)
}
{
  // Par LOT.
  nouvelleBase()
  const dv = devisSigne(LOTS3, { type: 'lots' })
  const L = { l1: 'Lot 1 — Démolition', l2: 'Lot 2 — Plomberie', l3: 'Lot 3 — Peinture' }
  const s1 = await facturer(dv.id, { type: 'situation', avancement: { lots: { [L.l1]: 100, [L.l2]: 50, [L.l3]: 0 } } })
  const s2 = await facturer(dv.id, { type: 'situation', avancement: { lots: { [L.l2]: 100, [L.l3]: 40 } } })
  const reculLot = await facturer(dv.id, { type: 'situation', avancement: { lots: { [L.l1]: 90, [L.l2]: 100, [L.l3]: 60 } } })
  const inconnu = await facturer(dv.id, { type: 'situation', avancement: { lots: { 'Lot 9 — Toiture': 10 } } })
  const global = await facturer(dv.id, { type: 'situation', avancement: { global: 90 } })
  const lot120 = await facturer(dv.id, { type: 'situation', avancement: { lots: { [L.l3]: 120 } } })
  const s3 = await facturer(dv.id, { type: 'situation', avancement: { lots: { [L.l1]: 100, [L.l2]: 100, [L.l3]: 100 } } })
  const [f1, f2, f3] = [s1, s2, s3].map((r) => (r.ok ? facture(r.id) : null))
  T('C18 situation par lot n° 1 (Lot 1 100 %, Lot 2 50 %, Lot 3 0 %) : 2 000 + 3 000 + 500 = 5 500,00 HT ; TVA 500 + 100 = 600,00',
    f1 && c(f1.total_ht) === 550000 && c(f1.total_tva) === 60000 && JSON.stringify(f1.avancement_lots) === JSON.stringify({ [L.l1]: 100, [L.l2]: 50, [L.l3]: 0 }), JSON.stringify([s1, f1 && lignesDe(f1.id)]))
  T('C19 lignes par lot × taux, chacune avec son `lot` : « Lot 2 — Plomberie : avancement cumulé 50 % (part soumise à TVA 20 %) » = 500,00',
    f1 && lignesDe(f1.id).some((l) => l.lot === L.l2 && l.designation === 'Lot 2 — Plomberie : avancement cumulé 50 % (part soumise à TVA 20 %)' && l.prix_unitaire_ht === 500) && !lignesDe(f1.id).some((l) => l.lot === L.l3))
  T('C20 n° 2 (Lot 2 100 %, Lot 3 40 %, Lot 1 non saisi = gardé à 100 %) : cumul 10 200 − 5 500 = 4 700,00 HT', f2 && c(f2.total_ht) === 470000 && f2.avancement_lots[L.l1] === 100, JSON.stringify([s2, f2 && f2.total_ht]))
  T('C21 un lot qui recule (Lot 1 100 → 90 %) → 409 ; un lot à 120 % → 422 ; un lot inconnu → 400 ; passer en avancement global après des situations par lot → 409',
    !reculLot.ok && reculLot.status === 409 && /Lot 1 — Démolition » ne peut pas reculer/.test(reculLot.error) && !lot120.ok && lot120.status === 422 && !inconnu.ok && inconnu.status === 400 && !global.ok && global.status === 409, JSON.stringify([reculLot, lot120, inconnu, global]))
  T('C22 n° 3 à 100 % partout : 12 000 − 10 200 = 1 800,00 HT ; les trois = le devis (12 000,00 HT) ; avancement global figé 100 %',
    f3 && c(f3.total_ht) === 180000 && [f1, f2, f3].reduce((s, f) => s + c(f.total_ht), 0) === c(dv.totals.total_ht) && f3.avancement_pct === 100)
  const pdfF2 = buildPdfData(f2, lignesDe(f2.id), ARTISAN_PDF, 'facture')
  const { plat } = await textePdf(pdfF2)
  T('C23 PDF RENDU de la situation n° 2 : « Situation de travaux n° 2 », devis de référence, marché 12 000,00, cumul antérieur 5 500,00, cumul à date 10 200,00, montant 4 700,00, et le détail par lot',
    ['SituationdetravauxN°2'.replace('N°', 'n°'), 'SITUATIONDETRAVAUXN°2', etat.tables.devis[0].numero, 'MontantdumarchéHT12000,00', 'Cumulantérieur(45,83%)5500,00', 'Cumulàdate(85%)10200,00', 'MontantdecettesituationHT4700,00', 'TotalHT4700,00', 'Plomberie100%de7000,00'].every((m) => plat.includes(m)), plat.slice(0, 1400))
}
{
  // Refus et bornes.
  nouvelleBase()
  const dv = devisSigne(ECOLE)
  const essais = {
    plus100: await facturer(dv.id, { type: 'situation', avancement: { global: 100.01 } }),
    zero: await facturer(dv.id, { type: 'situation', avancement: { global: 0 } }),
    texte: await facturer(dv.id, { type: 'situation', avancement: { global: 'beaucoup' } }),
    vide: await facturer(dv.id, { type: 'situation', avancement: {} }),
    lotsSansLots: await facturer(dv.id, { type: 'situation', avancement: { lots: { 'Lot 1': 50 } } }),
  }
  T('C24 refus avant tout numéro : 100,01 % (422), 0 % (422), « beaucoup » (422), rien (422), lot par lot sur un devis sans lots (400)',
    essais.plus100.status === 422 && essais.zero.status === 422 && essais.texte.status === 422 && essais.vide.status === 422 && essais.lotsSansLots.status === 400 && etat.numero === 0, JSON.stringify(essais))
  await facturer(dv.id, { type: 'situation', avancement: { global: 60 } })
  const recul = await facturer(dv.id, { type: 'situation', avancement: { global: 59.99 } })
  const egal = await facturer(dv.id, { type: 'situation', avancement: { global: 60 } })
  T('C25 avancement qui recule (60 → 59,99 %) → 409 « ne peut pas reculer » ; même avancement (60 %) → 409 « Rien à facturer »',
    !recul.ok && recul.status === 409 && /^L’avancement ne peut pas reculer : la situation n° 1 était à 60 %, vous saisissez 59,99 %/.test(recul.error) && !egal.ok && /Rien à facturer/.test(egal.error), JSON.stringify([recul, egal]))
  // Le marché a changé depuis la situation n° 1.
  etat.tables.devis_lignes.find((l) => l.devis_id === dv.id).prix_unitaire_ht = 11000
  const change = await facturer(dv.id, { type: 'situation', avancement: { global: 80 } })
  T('C26 le devis a changé de montant depuis la n° 1 → 409 (les situations portent sur le même marché)', !change.ok && change.status === 409 && /a changé depuis la situation n° 1/.test(change.error), JSON.stringify(change))
  // Brouillon et facture complète.
  const brouillon = devisSigne(ECOLE, { statut: 'brouillon' })
  const rb = await facturer(brouillon.id, { type: 'situation', avancement: { global: 10 } })
  const dc = devisSigne(ECOLE)
  await facturer(dc.id)
  const apresComplete = await facturer(dc.id, { type: 'situation', avancement: { global: 50 } })
  T('C27 devis non signé → 409 ; devis déjà facturé en entier → situation refusée (409, « avoir » proposé)',
    !rb.ok && rb.status === 409 && /pas signé/.test(rb.error) && !apresComplete.ok && apresComplete.status === 409 && /facture complète ou de solde/.test(apresComplete.error), JSON.stringify([rb, apresComplete]))
}
{
  // Solde après situations, et solde sans rien à déduire.
  nouvelleBase()
  const dv = devisSigne(ECOLE, { remise: 10 })
  const s1 = await facturer(dv.id, { type: 'situation', avancement: { global: 30 } })
  const s2 = await facturer(dv.id, { type: 'situation', avancement: { global: 70 } })
  const so = await facturer(dv.id, { type: 'solde' })
  const fs = [s1, s2, so].map((r) => (r.ok ? facture(r.id) : null))
  T('C28 devis remisé de 10 % (13 500,00 HT) : situations 30 % (4 050,00) et 70 % (5 400,00), puis SOLDE = 4 050,00 HT ; la somme = le devis au centime',
    fs.every(Boolean) && fs.map((f) => c(f.total_ht)).join(',') === '405000,540000,405000' && fs.reduce((s, f) => s + c(f.total_ht), 0) === c(dv.totals.total_ht) && fs[2].type_facture === 'solde' && /^Solde — /.test(fs[2].objet),
    JSON.stringify(fs.map((f) => f && f.total_ht)))
  const ls = lignesDe(so.id)
  T('C29 lignes du solde : les lignes du devis, la remise par taux, puis une déduction par situation et par taux (4 lignes « Déduction de la situation n° … »)',
    ls.filter((l) => /^Déduction de la situation n° [12] FAC-/.test(l.designation)).length === 4 && ls.filter((l) => /^Remise 10 % du devis/.test(l.designation)).length === 2 && ls[0].designation === 'Gros œuvre', JSON.stringify(ls.map((l) => l.designation)))
  nouvelleBase()
  const d2 = devisSigne(ECOLE)
  const rien = await facturer(d2.id, { type: 'solde' })
  const standard = await facturer(d2.id, { type: 'standard' })
  T('C30 « Facture de solde » sans acompte ni situation → 409 (« choisissez Facture ») ; « Facture » → tout le devis, type « standard »',
    !rien.ok && rien.status === 409 && /rien à déduire/.test(rien.error) && standard.ok && c(facture(standard.id).total_ht) === 1500000 && facture(standard.id).type_facture === 'standard')
  // « Facture » (standard) sur un devis déjà facturé par situations = le SOLDE, comme après un acompte (C3 du 18/10).
  nouvelleBase()
  const d3 = devisSigne(ECOLE)
  await facturer(d3.id, { type: 'situation', avancement: { global: 40 } })
  const st = await facturer(d3.id, { type: 'standard' })
  T('C31 « Facture » après une situation à 40 % : c’est le solde (9 000,00 HT, type « solde »), pas une deuxième facture complète', st.ok && c(facture(st.id).total_ht) === 900000 && facture(st.id).type_facture === 'solde', JSON.stringify(st))
}
{
  // Arrondis : 300 devis tirés au sort (graine fixe), quantités et prix à décimales, remises, 1 à 4 taux, lots ou pas.
  let graine = 20261021
  const hasard = () => { graine = (graine * 1103515245 + 12345) % 2147483648; return graine / 2147483648 }
  const TAUX = [0, 5.5, 10, 20]
  let fautes = []
  for (let n = 0; n < 300; n++) {
    const parLots = n % 2 === 0
    const lignes = Array.from({ length: 1 + Math.floor(hasard() * 7) }, (_, i) => ({
      designation: `L${i}`, quantite: Math.round((0.25 + hasard() * 40) * 100) / 100, prix_unitaire_ht: Math.round((0.5 + hasard() * 3000) * 100) / 100,
      tva_taux: TAUX[Math.floor(hasard() * 4)], ...(parLots ? { lot: `Lot ${1 + Math.floor(hasard() * 3)}` } : {}),
    }))
    const remise = hasard() < 0.4 ? Math.round(hasard() * 1500) / 100 : 0
    const marche = c(computeTotals(lignes, remise).total_ht)
    const seaux = FT.repartirMarche(lignes, remise, parLots)
    if (seaux.reduce((s, x) => s + x.centimes, 0) !== marche) { fautes.push(`seaux ${n}`); continue }
    const anterieures = []
    let numero = 0, facture = 0, cumulAvant = 0
    const lots = FT.lotsDe(lignes)
    const etapes = [hasard() * 40, 40 + hasard() * 30, 100].map((x) => Math.round(x * 100) / 100)
    for (const p of etapes) {
      const avancement = parLots ? { lots: Object.fromEntries(lots.map((l) => [l, p])) } : { global: p }
      const r = FT.calculerSituation({ devisNumero: 'DEV', remisePct: remise, lignesDevis: lignes, franchise: false, anterieures, numeroMax: numero, avancement })
      if (!r.ok) { if (!/Rien à facturer/.test(r.error)) fautes.push(`${n}@${p} ${r.error}`); continue }
      if (c(r.cumulHt) < cumulAvant || c(r.totals.total_ht) !== c(r.cumulHt) - facture || c(r.montantHt) <= 0) fautes.push(`${n}@${p} montant`)
      facture += c(r.totals.total_ht); cumulAvant = c(r.cumulHt); numero = r.numero
      anterieures.push({ id: `s${numero}`, numero: `FAC-${numero}`, date: null, nature: 'situation', situation_numero: numero, avancement_pct: r.avancementPct, avancement_lots: r.avancementLots, cumul_ht: r.cumulHt, marche_ht: r.marcheHt, lignes: r.lignes })
    }
    if (facture !== marche) fautes.push(`${n} total ${facture} ≠ ${marche}`)
  }
  T('C32 300 devis tirés au sort (décimales, remises, 1 à 4 taux, la moitié par lots), situations jusqu’à 100 % : la somme des situations = le marché HT au centime, chaque cumul ≥ le précédent', fautes.length === 0, fautes.slice(0, 8).join(' | '))
}
{
  // Factur-X : type 380, note de situation, contrôle des totaux sur des lignes négatives.
  nouvelleBase()
  const dv = devisSigne(ECOLE)
  await facturer(dv.id, { type: 'situation', avancement: { global: 30 } })
  const r2 = await facturer(dv.id, { type: 'situation', avancement: { global: 70 } })
  const f = facture(r2.id)
  const note = FT.noteSituationFacturX(f.situation_numero, FT.lireDetailSituation(f.situation_detail))
  const donnees = {
    numero: f.numero, date_emission: '2026-10-21', vendeur: { nom: 'Entreprise Essai TCE', siret: '12345678900011' }, acheteur: { nom: 'Client Essai', adresse: '2 rue du Client' },
    lignes: lignesDe(f.id).map((l) => ({ designation: l.designation, quantite: l.quantite, unite: l.unite, prix_unitaire_ht: l.prix_unitaire_ht, tva_taux: l.tva_taux })),
    notes: [note], remise_pct: 0, total_ht: Number(f.total_ht), total_tva: Number(f.total_tva), total_ttc: Number(f.total_ttc), franchise: false,
  }
  const xml = genererFacturX(donnees)
  T('C33 Factur-X d’une situation : TypeCode 380, la note « Situation de travaux n° 2 — devis …, marché 15000.00 EUR HT … montant de cette situation 6000.00 EUR HT », contrôle avant émission sans écart de total',
    /<ram:TypeCode>380<\/ram:TypeCode>/.test(xml) && xml.includes('Situation de travaux n° 2') && note.includes('marché 15000.00 EUR HT') && note.includes('montant de cette situation 6000.00 EUR HT') && controlerAvantEmission(donnees).length === 0,
    JSON.stringify(controlerAvantEmission(donnees)))
  const fx = lire('app/api/factures/[id]/facturx/route.ts')
  T('C34 la route Factur-X porte la note de situation ; l’acompte reste en 380 (UNTDID 386 « facture d’acompte » non utilisé, voir le rapport) ; le lot n’est pas lu (colonnes nommées)',
    /f\.type_facture === 'situation' && lireDetailSituation\(f\.situation_detail\)/.test(fx) && /<ram:TypeCode>\$\{d\.avoir \? 381 : 380\}<\/ram:TypeCode>/.test(lire('lib/facturx.ts')) && /select\('designation, quantite, unite, prix_unitaire_ht, tva_taux'\)/.test(fx))
  // Simulation (carte de l'assistant) : le montant exact, sans numéro tiré ni écriture.
  const avant = { n: etat.numero, f: etat.tables.factures.length }
  const sim = await silence(() => simulerFacture({ artisanId: A, devisId: dv.id, type: 'situation', avancement: { global: 100 } }))
  T('C35 simulation (carte de l’assistant) d’une situation à 100 % : 4 500,00 HT / 5 100,00 TTC annoncés, situation n° 3, AUCUN numéro tiré, rien d’écrit',
    sim.ok && sim.simulation === true && c(sim.total_ht) === 450000 && c(sim.total_ttc) === 510000 && sim.situation.numero === 3 && etat.numero === avant.n && etat.tables.factures.length === avant.f, JSON.stringify(sim))
}
{
  // Assistant, drapeau levé : le schéma et la validation (le module est relu avec le drapeau levé).
  const src = lire('lib/assistant/outils-actions.ts')
  T('C36 assistant, drapeau levé : TYPES_FACTURE = complete, acompte, situation, solde ; avancement_pct (1 à 100, à sourcer) obligatoire pour une situation et réservé à elle',
    /TYPES_FACTURE_TOUS = \['complete', 'acompte', 'situation', 'solde'\] as const/.test(src) && /FLAGS\.facturesSituation \? TYPES_FACTURE_TOUS : \['complete', 'acompte'\]/.test(src)
    && /avancement_pct: \{ t: 'nombre', d: 'Avancement CUMULÉ[^']*', min: 1, max: 100, sourcer: true \}/.test(src)
    && /if \(e\.type === 'situation' && \(e\.avancement_pct === null \|\| e\.avancement_pct === undefined\)\) return 'avancement_pct : obligatoire/.test(src)
    && /if \(e\.type !== 'situation' && e\.avancement_pct !== null && e\.avancement_pct !== undefined\) return 'avancement_pct : réservé à type=situation'/.test(src))
  const as = lire('lib/assistant/actions-serveur.ts')
  T('C37 assistant : creer_facture reste « à confirmer » ; la carte d’une situation ou d’un solde annonce le montant de simulerFacture ; le clic passe type et avancement à creerFacture',
    /creer_facture: \{\n\s*cat: 'confirmation'/.test(src) && /const sim = await \(dep\.simulerFacture \?\? simulerFacture\)\(/.test(as) && /type: typeNeuf, \.\.\.\(typeNeuf === 'situation' \? \{ avancement: \{ global: num\(e\.avancement_pct\) \} \} : \{\}\)/.test(as))
}
remettre()

// ═══════════════════════ D. Émission atomique (0180) : fail-closed, coupures, concurrence, jamais plus que le devis ═══════════════════════
{
  lever(true, true)
  nouvelleBase()
  const dv = devisSigne(ECOLE)
  etat.sans0180 = true
  etat.appels = []
  const st0 = await facturer(dv.id)
  const ac0 = await facturer(dv.id, { type: 'acompte', acomptePct: 30 })
  const sit0 = await facturer(dv.id, { type: 'situation', avancement: { global: 30 } })
  etat.sans0180 = false
  T('D1 SANS 0180 (fonction absente) : facture, acompte et situation → 503, aucune écriture directe en base, aucun numéro, aucune facture',
    [st0, ac0, sit0].every((r) => !r.ok && r.status === 503) && insertionsFactures().length === 0 && etat.numero === 0 && etat.tables.factures.length === 0, JSON.stringify([st0, ac0, sit0]))
  const okAv = await facturer(dv.id)
  etat.sans0180 = true
  const av0 = await avoirSur(okAv.id)
  etat.sans0180 = false
  T('D2 SANS 0180 : l’avoir → 503, la facture reste émise, rien d’écrit', !av0.ok && av0.status === 503 && etat.tables.factures.length === 1 && facture(okAv.id).statut === 'emise', JSON.stringify(av0))

  for (const [code, coupure] of [['D3', 'facture'], ['D5', 'lignes'], ['D6', 'numero']]) {
    nouvelleBase()
    const d = devisSigne(ECOLE)
    etat.coupure = coupure
    const r = await facturer(d.id, { type: 'situation', avancement: { global: 30 } })
    const r0 = await facturer(d.id)
    etat.coupure = null
    T(`${code} coupure ${coupure === 'facture' ? 'après l’en-tête' : coupure === 'lignes' ? 'après les lignes' : 'au scellement'} : tout est annulé (transaction) — aucune facture, aucune ligne, AUCUN numéro consommé, jamais une facture « emise » sans numéro`,
      !r.ok && r.status === 500 && !r0.ok && r0.status === 500 && etat.tables.factures.length === 0 && etat.tables.factures_lignes.length === 0 && etat.numero === 0, JSON.stringify([r, r0]))
  }
  nouvelleBase()
  const d2 = devisSigne(ECOLE)
  etat.appels = []
  const ok = await facturer(d2.id)
  const fOk = ok.ok ? facture(ok.id) : null
  const modele = JSON.stringify({ numero: 'FAC-2026-0001', client: 'Client Essai', totaux: [15000, 2000, 17000], lignes: lignesDe(ok.id).map(({ designation, quantite, unite, prix_unitaire_ht, tva_taux }) => ({ designation, quantite, unite, prix_unitaire_ht, tva_taux })) })
  T('D7 UN appel facture_emettre, aucune écriture directe du serveur ; la facture sort numérotée (FAC-2026-0001), scellée, avec ses 2 lignes et l’empreinte SHA-256 du contenu AVEC son numéro',
    etat.appels.filter((x) => x.rpc === 'facture_emettre').length === 1 && insertionsFactures().length === 0 && fOk && fOk.numero === 'FAC-2026-0001' && fOk.verrouillee === true && lignesDe(fOk.id).length === 2
    && fOk.empreinte === createHash('sha256').update(modele, 'utf8').digest('hex'), JSON.stringify(fOk && [fOk.numero, fOk.empreinte]))
  const vide = devisSigne([])
  const rv = await facturer(vide.id)
  T('D8 un devis sans ligne : la facture est refusée (422) avant toute écriture', !rv.ok && rv.status === 422 && /aucune ligne/.test(rv.error), JSON.stringify(rv))

  nouvelleBase()
  const d3 = devisSigne(ECOLE)
  const [x1, x2] = await Promise.all([facturer(d3.id), facturer(d3.id)])
  T('D9 double clic « Facture » (deux émissions SIMULTANÉES, chacune ayant lu « rien de facturé ») : UNE seule facture complète, l’autre refusée par la base (jamais plus que le devis)',
    [x1, x2].filter((r) => r.ok).length === 1 && [x1, x2].some((r) => !r.ok && r.status === 409 && /jamais plus que le devis/.test(r.error)) && etat.tables.factures.length === 1, JSON.stringify([x1, x2]))
  nouvelleBase()
  const d4 = devisSigne(ECOLE)
  const [y1, y2] = await Promise.all([facturer(d4.id, { type: 'situation', avancement: { global: 70 } }), facturer(d4.id, { type: 'situation', avancement: { global: 100 } })])
  const total = etat.tables.factures.reduce((a, f) => a + c(f.total_ht), 0)
  T('D10 deux situations SIMULTANÉES (70 % et 100 %, calculées sur le même « déjà facturé 0 ») : une seule émise, l’autre refusée ; jamais plus que le devis',
    [y1, y2].filter((r) => r.ok).length === 1 && etat.tables.factures.length === 1 && total <= 1500000, JSON.stringify([y1, y2]))
  nouvelleBase()
  const d5 = devisSigne(ECOLE)
  await facturer(d5.id)
  const direct = await silence(() => emettreFacture({ artisan_id: A, devis_id: d5.id, type: 'acompte', annee: '2026', facture: { client_nom: 'Client Essai', total_ht: 4500, total_tva: 600, total_ttc: 5100 }, lignes: [{ designation: 'Acompte 30 %', quantite: 1, unite: 'forfait', prix_unitaire_ht: 3000, tva_taux: 10 }, { designation: 'Acompte 30 %', quantite: 1, unite: 'forfait', prix_unitaire_ht: 1500, tva_taux: 20 }], empreinte_modele: JSON.stringify({ numero: JETON_NUMERO }) }))
  T('D11 un acompte poussé DIRECTEMENT à la base sur un devis déjà facturé en entier (le serveur contourné) : refusé (409, « jamais plus que le devis »), rien d’écrit',
    !direct.ok && direct.status === 409 && /jamais plus que le devis/.test(direct.error) && etat.tables.factures.length === 1, JSON.stringify(direct))

  const srv = lire('lib/facturesTypesServeur.ts')
  T('D4 la sonde des colonnes (devis par lots) : une réponse positive est gardée, une négative reposée après une minute ; les routes devis répondent 503 à « par lots » sans 0176',
    /cache\.ok \|\| Date\.now\(\) - cache\.le < RESSONDER_MS/.test(srv) && ['app/api/devis/route.ts', 'app/api/devis/[id]/route.ts'].every((f) => /if \(typeDevis === 'lots' && !colonnesLots\) return NextResponse\.json\(\{ error: INDISPONIBLE_0176 \}, \{ status: 503 \}\)/.test(lire(f))))
  const fd = lire('lib/factureDepuisDevis.ts'), em = lire('lib/factureEmission.ts'), av = lire('lib/avoirFacture.ts'), pr = lire('app/api/factures/[id]/route.ts')
  T('D12 plus AUCUNE écriture directe de facture côté serveur : ni insert, ni next_numero, ni empreinte calculée dans lib/factureDepuisDevis.ts ni dans l’avoir ; un seul rpc facture_emettre ; PATCH refuse de sceller une facture sans numéro',
    !/from\('factures'\)\.insert|from\('factures_lignes'\)\.insert|next_numero|empreinte\(/.test(fd + av) && /rpc\('facture_emettre', \{ p: d \}\)/.test(em) && /return emettreFacture\(\{/.test(fd) && /await emettreFacture\(\{/.test(av)
    && /if \(next === 'emise' && !cur\.verrouillee && !\(typeof cur\.numero === 'string' && cur\.numero\.trim\(\)\)\) \{\n\s*return NextResponse\.json\(\{ error: 'Cette facture n’a pas de numéro/.test(pr))
  const rd = lire('app/api/devis/[id]/route.ts'), rc = lire('app/api/devis/route.ts')
  T('D13 enregistrer un devis ne le vide plus jamais : lignes et totaux remplacés en une transaction (devis_lignes_remplacer), sinon anciennes lignes remises si l’insertion échoue ; à la création, une erreur de lignes retire le brouillon',
    /const remplacees = await remplacerLignes\(id, uid, lignesEcrites, totals\)\n\s*if \(!remplacees\.ok\)/.test(rd) && /rpc\('devis_lignes_remplacer'/.test(rd) && /from\('devis_lignes'\)\.insert\(avant \?\? \[\]\)/.test(rd)
    && rd.indexOf('remplacerLignes(id, uid') < rd.indexOf("from('devis').update(patch)") && /if \(lErr\) \{\n\s*console\.error\('\[devis\] lignes :'/.test(rc))
  remettre()
}

// ═══════════════════════ H. Audit argent indépendant du 21/10 (C1, M1, M2, M4, M5 et faibles) ═══════════════════════
lever(true, true)
{
  nouvelleBase()
  const dv = devisSigne(ECOLE)
  await facturer(dv.id, { type: 'situation', avancement: { global: 30 } })
  await facturer(dv.id, { type: 'situation', avancement: { global: 70 } })
  const ac = await facturer(dv.id, { type: 'acompte', acomptePct: 50 })
  T('H1 (C1) devis 15 000 HT, situations 30 % puis 70 % (10 500 HT), puis acompte 50 % (7 500 HT) → REFUSÉ (18 000 > 15 000), rien d’émis',
    !ac.ok && ac.status === 409 && /ferait facturer plus que le devis : 10 500,00 € HT déjà facturés, 7 500,00 € HT pour celle-ci, 15 000,00 € HT au devis/.test(ac.error) && etat.tables.factures.length === 2 && etat.numero === 2, JSON.stringify(ac))
  nouvelleBase()
  const d2 = devisSigne(ECOLE)
  const comp = await facturer(d2.id)
  const ac2 = await facturer(d2.id, { type: 'acompte', acomptePct: 30 })
  const ac3 = await silence(() => creerFacture({ artisanId: A, devisId: d2.id, acomptePct: 30 }))
  T('H2 (C1, vu en production via l’assistant) facture complète puis acompte 30 % : refusé, par le type comme par l’ancien chemin (acomptePct seul)',
    comp.ok && !ac2.ok && ac2.status === 409 && !ac3.ok && ac3.status === 409 && etat.tables.factures.length === 1, JSON.stringify([ac2, ac3]))

  // M1 — lot A 10 000 @ 10 % à 100 %, lot B 5 000 @ 20 % à 0 %, acompte 30 % : l'acompte s'impute au prorata du cumul de chaque taux.
  nouvelleBase()
  const LOTS_M1 = [
    { designation: 'Gros œuvre', quantite: 1, prix_unitaire_ht: 10000, tva_taux: 10, lot: 'Lot A' },
    { designation: 'Extension', quantite: 1, prix_unitaire_ht: 5000, tva_taux: 20, lot: 'Lot B' },
  ]
  const d3 = devisSigne(LOTS_M1, { type: 'lots' })
  await facturer(d3.id, { type: 'acompte', acomptePct: 30 })
  const m1 = await facturer(d3.id, { type: 'situation', avancement: { lots: { 'Lot A': 100, 'Lot B': 0 } } })
  const fm1 = m1.ok ? facture(m1.id) : null
  const tvaM1 = fm1 && computeTotals(lignesDe(fm1.id), 0).tva_par_taux
  T('H3 (M1) devis par lots avec acompte, lot à 20 % encore à 0 % : AUCUNE TVA négative — l’acompte (4 500 HT) s’impute sur le seul taux réalisé : 10 000 − 4 500 = 5 500 HT, TVA { 10 % : 550 }',
    fm1 && c(fm1.total_ht) === 550000 && c(fm1.total_tva) === 55000 && JSON.stringify(tvaM1) === JSON.stringify({ 10: 550 }) && lignesDe(fm1.id).some((l) => /^Déduction de l’acompte facturé FAC-2026-0001 du 21\/10\/2026$/.test(l.designation) && l.prix_unitaire_ht === 4500 && l.tva_taux === 10),
    JSON.stringify([m1, tvaM1, fm1 && lignesDe(fm1.id)]))
  const m1b = await facturer(d3.id, { type: 'situation', avancement: { lots: { 'Lot A': 100, 'Lot B': 100 } } })
  const tous = etat.tables.factures.filter((f) => !f.avoir_de)
  const parTaux = {}
  for (const f of tous) for (const [t, v] of Object.entries(computeTotals(lignesDe(f.id), 0).tva_par_taux)) parTaux[t] = r2((parTaux[t] ?? 0) + v)
  T('H4 (M1) à 100 % : acompte + situations = le devis au centime (15 000 HT), TVA cumulée = celle du devis (10 % : 1 000 ; 20 % : 1 000), aucune pièce à TVA négative',
    m1b.ok && tous.reduce((a, f) => a + c(f.total_ht), 0) === 1500000 && parTaux[10] === 1000 && parTaux[20] === 1000 && tous.every((f) => Object.values(computeTotals(lignesDe(f.id), 0).tva_par_taux).every((v) => v >= 0)), JSON.stringify([m1b, parTaux]))

  // M2 — un émoji au 80e caractère.
  const { couperTexte, normalizeLigne } = await imp('lib/lignes.ts')
  const emoji = 'x'.repeat(79) + '😀😀'
  const lot = FT.normaliserLot(emoji)
  const demi = (t) => /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(t)
  T('H5 (M2) un émoji à la limite : coupé ENTRE deux caractères (80 caractères, pas de demi-émoji), JSON sain ; une demi-paire orpheline est retirée ; la désignation (300) aussi',
    Array.from(lot).length === 80 && lot.endsWith('😀') && !demi(lot) && JSON.parse(JSON.stringify({ lot })).lot === lot && couperTexte('ab\uD83D', 10) === 'ab' && !demi(normalizeLigne({ designation: 'y'.repeat(299) + '😀😀' }, false).designation))

  // M4 — une facture sans ligne est complète.
  T('H6 (M4) une facture SANS LIGNE est « complète », jamais un acompte (every sur une liste vide)', FT.natureDe({}, []) === 'complete' && FT.natureDe({}, [{ designation: 'Acompte 30 % sur le devis' }]) === 'acompte')
  nouvelleBase()
  const d4 = devisSigne(ECOLE)
  const vide = { id: uuid(), artisan_id: A, devis_id: d4.id, numero: 'FAC-2026-0099', statut: 'emise', verrouillee: true, client_nom: 'Client Essai', total_ht: 15000, total_tva: 2000, total_ttc: 17000, remise_pct: 0 }
  etat.tables.factures.push(vide)
  const sitVide = await facturer(d4.id, { type: 'situation', avancement: { global: 30 } })
  const ac4 = await facturer(d4.id, { type: 'acompte', acomptePct: 30 })
  T('H7 (M4, E1) une facture scellée VIDE (avant 0178) compte dans le déjà-facturé : ni situation (« facture complète », avoir proposé) ni acompte (« plus que le devis ») par-dessus',
    !sitVide.ok && sitVide.status === 409 && /facture complète ou de solde \(FAC-2026-0099\)/.test(sitVide.error) && !ac4.ok && ac4.status === 409, JSON.stringify([sitVide, ac4]))
  const avVide = await avoirSur(vide.id)
  T('H8 l’avoir d’une facture scellée vide à PLUSIEURS taux (15 000 HT, 2 000 TVA : 10 % et 20 % mêlés) : refusé (409), aucune TVA inventée, la facture reste émise',
    !avVide.ok && avVide.status === 409 && /plusieurs taux de TVA/.test(avVide.error) && facture(vide.id).statut === 'emise', JSON.stringify(avVide))
  nouvelleBase()
  const un = { id: uuid(), artisan_id: A, devis_id: null, numero: 'FAC-2026-0097', statut: 'emise', verrouillee: true, client_nom: 'Client Essai', total_ht: 1000, total_tva: 100, total_ttc: 1100, remise_pct: 0 }
  etat.tables.factures.push(un)
  const avUn = await avoirSur(un.id)
  T('H9 l’avoir d’une facture scellée vide à taux unique (1 000 HT, 100 TVA → 10 %) : une ligne −1 000 à 10 %, la facture passe « annulée »',
    avUn.ok && lignesDe(avUn.id).length === 1 && lignesDe(avUn.id)[0].tva_taux === 10 && lignesDe(avUn.id)[0].prix_unitaire_ht === -1000 && facture(un.id).statut === 'annulee', JSON.stringify(avUn))

  // M5 — le TTC annoncé par la carte.
  nouvelleBase()
  const d5 = devisSigne(ECOLE)
  const mauvais = await facturer(d5.id, { type: 'situation', avancement: { global: 30 }, ttcAttendu: 5100.01 })
  const bon = await facturer(d5.id, { type: 'situation', avancement: { global: 30 }, ttcAttendu: 5100 })
  const as = lire('lib/assistant/actions-serveur.ts')
  T('H10 (M5) le TTC annoncé à l’artisan : un centime d’écart au moment d’émettre → 409, rien d’émis ; égal → émis ; la carte de l’assistant le transmet et le clic le passe',
    !mauvais.ok && mauvais.status === 409 && /Le montant a changé depuis la proposition \(5100,01 € TTC annoncés, 5100,00 € TTC aujourd’hui\)/.test(mauvais.error) && bon.ok && etat.tables.factures.length === 1
    && /entrees: \{ \.\.\.e, ttc_attendu: sim\.total_ttc \}/.test(as) && /typeof e\.ttc_attendu === 'number' && Number\.isFinite\(e\.ttc_attendu\) \? \{ ttcAttendu: e\.ttc_attendu \} : \{\}/.test(as), JSON.stringify([mauvais, bon]))

  // Faibles : lot renommé après une situation, saisie de lot illisible, tonne en Factur-X.
  nouvelleBase()
  const d6 = devisSigne(LOTS3, { type: 'lots' })
  await facturer(d6.id, { type: 'situation', avancement: { lots: { 'Lot 1 — Démolition': 50 } } })
  etat.tables.devis_lignes.filter((l) => l.devis_id === d6.id && l.lot === 'Lot 1 — Démolition').forEach((l) => { l.lot = 'Lot 1 — Curage' })
  const renomme = await facturer(d6.id, { type: 'situation', avancement: { lots: { 'Lot 1 — Curage': 100 } } })
  etat.tables.devis_lignes.filter((l) => l.devis_id === d6.id && l.lot === 'Lot 1 — Curage').forEach((l) => { l.lot = 'Lot 1 — Démolition' })
  const illisible = await facturer(d6.id, { type: 'situation', avancement: { lots: { 'Lot 2 — Plomberie': null } } })
  T('H11 un lot renommé après une situation → 409 clair (« n’existe plus sur le devis (renommé ?) ») ; une saisie de lot illisible (null) → 422, jamais prise pour « inchangé »',
    !renomme.ok && renomme.status === 409 && /Le lot « Lot 1 — Démolition » des situations précédentes n’existe plus sur le devis \(renommé \?\)/.test(renomme.error) && !illisible.ok && illisible.status === 422, JSON.stringify([renomme, illisible]))
  const xml = genererFacturX({ numero: 'FAC-2026-0001', date_emission: '2026-10-21', vendeur: { nom: 'E', siret: '12345678900011' }, acheteur: { nom: 'C', adresse: 'a' }, lignes: [{ designation: 'Gravats', quantite: 2, unite: 't', prix_unitaire_ht: 50, tva_taux: 10 }], total_ht: 100, total_tva: 10, total_ttc: 110, franchise: false })
  const ed = lire('app/devis/[id]/page.tsx')
  T('H12 Factur-X : la tonne part en TNE (plus en C62) ; l’écran signale un pourcentage de lot illisible au lieu de l’envoyer',
    /unitCode="TNE"/.test(xml) && /const illisibles = situationParLots \? Object\.entries\(pctLots\)\.filter\(\(\[, v\]\) => v\.trim\(\) && lirePct\(v\) === null\)/.test(ed))
}
remettre()

// ═══════════════════════ E. Migration 0176 ═══════════════════════
{
  const mig = lire('supabase/migrations/0176_types_devis_factures.sql')
  const code = mig.split('\n').filter((l) => !/^\s*--/.test(l)).join('\n')
  T('E1 en-tête comme 0174 : « 0176 · », écrite et APPLIQUÉE le 21/10/2026 (contrôle 9/9), l’ordre (essai à sec, application, contrôle, suite, PUIS les drapeaux)',
    /^-- 0176 · TYPES DE DEVIS ET DE FACTURES/.test(mig) && /Écrite le 21\/10\/2026\. ✅ APPLIQUÉE le 21\/10\/2026 \(contrôle 9\/9/.test(mig.slice(0, 700)) && /ORDRE : on colle la migration, PUIS on lève les drapeaux/.test(mig.slice(0, 1200)))
  T('E2 idempotente et additive : `add column if not exists`, `create … if not exists`, `create or replace`, `drop trigger if exists` ; aucun drop de table ni de colonne, aucun update ni delete de lignes',
    (code.match(/add column if not exists/g) ?? []).length === 10 && /create unique index if not exists factures_situation_numero_unique/.test(code) && /create or replace function public\.factures_situation_verifier\(\)/.test(code)
    && /drop trigger if exists factures_situation_verifier on public\.factures;/.test(code) && !/drop table|drop column|^\s*update |^\s*delete from|truncate/im.test(code.replace(/\$fn\$[\s\S]*?\$fn\$/g, '')))
  const fn = (code.match(/\$fn\$([\s\S]*?)\$fn\$/) ?? [])[1] ?? ''
  T('E3 garde-fous en base : type et données de situation figés à l’UPDATE ; devis du même artisan et signé ; verrou par devis ; jamais plus que le devis',
    /if tg_op = 'UPDATE' then[\s\S]{0,700}new\.type_facture is distinct from old\.type_facture[\s\S]{0,500}new\.situation_detail is distinct from old\.situation_detail then\s*raise exception/.test(fn)
    && /v_artisan is distinct from new\.artisan_id then\s*raise exception 'factures : devis d un autre artisan'/.test(fn) && /v_statut is distinct from 'accepte' then\s*raise exception/.test(fn)
    && /pg_advisory_xact_lock\(hashtextextended\('presti\.factures\.devis:' \|\| new\.devis_id::text, 0\)\)/.test(fn)
    && /if v_somme \+ new\.total_ht > coalesce\(v_total_ht, 0\) \+ 0\.01 \* \(v_n \+ 4\) then\s*raise exception 'factures : jamais plus que le devis/.test(fn))
  T('E4 garde-fous de situation en base : cumul > 0 et ≤ marché, marché = total HT du devis, avancement et cumul qui ne reculent pas, lots entre 0 et 100 et qui ne reculent pas, numéro jamais réutilisé',
    /if new\.cumul_ht <= 0 or new\.cumul_ht > new\.marche_ht \+ 0\.005 then/.test(fn) && /abs\(new\.marche_ht - coalesce\(v_total_ht, 0\)\) > 0\.005/.test(fn)
    && /if new\.avancement_pct < v_pct or new\.cumul_ht < v_cumul then\s*raise exception 'factures : l avancement ne recule pas/.test(fn)
    && /v_val !~ '\^\[0-9\]\+\(\[\.\]\[0-9\]\+\)\?\$' or v_val::numeric > 100/.test(fn) && /coalesce\(\(new\.avancement_lots ->> p\.key\)::numeric, 0\) < p\.value::numeric/.test(fn)
    && /f\.situation_numero >= new\.situation_numero/.test(fn) && /and not exists \(select 1 from public\.factures a where a\.avoir_de = f\.id\)/.test(fn))
  T('E5 fonction `security invoker`, search_path figé à vide, noms qualifiés ; contraintes de valeur sur chaque colonne neuve',
    /returns trigger language plpgsql security invoker set search_path = '' as \$fn\$/.test(code) && !/from (factures|devis)\b/.test(fn)
    && /type_devis in \('simple', 'lots'\)/.test(code) && /char_length\(lot\) between 1 and 80/.test(code) && /type_facture in \('standard', 'acompte', 'situation', 'solde'\)/.test(code) && /avancement_pct >= 0 and avancement_pct <= 100/.test(code))
  const jum = existe('supabase/migrations/_A_COLLER_sql_editor_0176_NU.sql') ? lire('supabase/migrations/_A_COLLER_sql_editor_0176_NU.sql') : ''
  T('E6 jumeau à coller (scripts/sql-nu.mjs) avec le contrôle supabase/controles/0176_types_devis_factures.sql en pied, numérotation des factures non touchée',
    existe('supabase/controles/0176_types_devis_factures.sql') && jum.includes("'declencheur factures_situation_verifier (attendu 1)'") && jum.includes('create trigger factures_situation_verifier') && !/next_numero/.test(code))
  // Rejouée pour de vrai, si PGlite est là (comme scripts/crm-sql-qa.mjs) ; sinon dit « en attente », sans rougir ni verdir.
  let mod = null
  try {
    if (process.env.PGLITE_DIR) { const { createRequire } = await import('node:module'); const req = createRequire(path.join(path.resolve(process.env.PGLITE_DIR), 'package.json')); mod = await import(pathToFileURL(req.resolve('@electric-sql/pglite')).href) }
    else mod = await import('@electric-sql/pglite')
  } catch { mod = null }
  if (!mod) console.log('WAIT E7 PGlite introuvable (PGLITE_DIR=<dossier où « npm install @electric-sql/pglite » a été fait>) : 0176 n’est pas rejouée dans un Postgres ici.')
  else {
    const db = new mod.PGlite()
    const q = (s, p) => db.query(s, p)
    const refuse = async (s, p) => { try { await q(s, p); return false } catch { return true } }
    await db.exec(`
      create table public.artisans (id uuid primary key);
      create table public.devis (id uuid primary key default gen_random_uuid(), artisan_id uuid references public.artisans(id), statut text, total_ht numeric);
      create table public.devis_lignes (id uuid primary key default gen_random_uuid(), devis_id uuid references public.devis(id));
      create table public.factures (id uuid primary key default gen_random_uuid(), artisan_id uuid, devis_id uuid references public.devis(id) on delete set null, numero text, statut text default 'emise', total_ht numeric, avoir_de uuid);
      create table public.factures_lignes (id uuid primary key default gen_random_uuid(), facture_id uuid references public.factures(id));`)
    await db.exec(mig)
    await db.exec(mig) // idempotente
    const art = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', autre = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    await q('insert into public.artisans values ($1), ($2)', [art, autre])
    const dv = (await q(`insert into public.devis (artisan_id, statut, total_ht) values ($1, 'accepte', 15000) returning id`, [art])).rows[0].id
    const sit = (n, pct, cumul, ht, lots = null, artisan = art, marche = 15000) => q(`insert into public.factures (artisan_id, devis_id, numero, total_ht, type_facture, situation_numero, avancement_pct, avancement_lots, marche_ht, cumul_ht, situation_detail) values ($1, $2, $3, $4, 'situation', $5, $6, $7, $8, $9, '{}'::jsonb) returning id`, [artisan, dv, `FAC-${n}`, ht, n, pct, lots, marche, cumul])
    const s1 = (await sit(1, 30, 4500, 4500)).rows[0].id
    const r = {
      recul: await refuse(`insert into public.factures (artisan_id, devis_id, numero, total_ht, type_facture, situation_numero, avancement_pct, marche_ht, cumul_ht, situation_detail) values ($1, $2, 'X', 100, 'situation', 2, 20, 15000, 3000, '{}')`, [art, dv]),
      plus: await refuse(`insert into public.factures (artisan_id, devis_id, numero, total_ht, type_facture, situation_numero, avancement_pct, marche_ht, cumul_ht, situation_detail) values ($1, $2, 'X', 11000, 'situation', 2, 100, 15000, 15000, '{}')`, [art, dv]),
      cent: await refuse(`insert into public.factures (artisan_id, devis_id, numero, total_ht, type_facture, situation_numero, avancement_pct, marche_ht, cumul_ht, situation_detail) values ($1, $2, 'X', 100, 'situation', 2, 101, 15000, 15000, '{}')`, [art, dv]),
      autre: await refuse(`insert into public.factures (artisan_id, devis_id, numero, total_ht, type_facture, situation_numero, avancement_pct, marche_ht, cumul_ht, situation_detail) values ($1, $2, 'X', 100, 'situation', 2, 40, 15000, 6000, '{}')`, [autre, dv]),
      numero: await refuse(`insert into public.factures (artisan_id, devis_id, numero, total_ht, type_facture, situation_numero, avancement_pct, marche_ht, cumul_ht, situation_detail) values ($1, $2, 'X', 1500, 'situation', 1, 40, 15000, 6000, '{}')`, [art, dv]),
      fige: await refuse(`update public.factures set avancement_pct = 35 where id = $1`, [s1]),
      typeChange: await refuse(`update public.factures set type_facture = 'standard' where id = $1`, [s1]),
      horsSituation: await refuse(`insert into public.factures (artisan_id, devis_id, numero, total_ht, type_facture, avancement_pct) values ($1, $2, 'X', 10, 'standard', 10)`, [art, dv]),
    }
    const ok70 = !(await refuse(`insert into public.factures (artisan_id, devis_id, numero, total_ht, type_facture, situation_numero, avancement_pct, marche_ht, cumul_ht, situation_detail) values ($1, $2, 'FAC-2', 6000, 'situation', 2, 70, 15000, 10500, '{}')`, [art, dv]))
    const statutOk = !(await refuse(`update public.factures set statut = 'payee' where id = $1`, [s1]))
    T('E7 0176 REJOUÉE dans PGlite (deux fois) : recul, plus que le devis, 101 %, autre artisan, numéro réutilisé, données figées, type changé, données de situation hors situation → refusés ; 70 % puis « payée » acceptés',
      Object.values(r).every(Boolean) && ok70 && statutOk, JSON.stringify({ ...r, ok70, statutOk }))
    await db.close()
  }

  // ── 0180 : l'émission atomique ──
  const m80 = lire('supabase/migrations/0180_factures_emission_atomique.sql')
  const c80 = m80.split('\n').filter((l) => !/^\s*--/.test(l)).join('\n')
  const fe = (c80.match(/create or replace function public\.facture_emettre\(p jsonb\)[\s\S]*?\$fn\$([\s\S]*?)\$fn\$/) ?? [])[1] ?? ''
  T('E8 0180 en tête : écrite et APPLIQUÉE le 21/10/2026, l’ordre (coller, contrôler, PUIS déployer : le code est fail-closed sans elle) ; idempotente (create or replace, if not exists), aucune ligne existante modifiée',
    /^-- 0180 · ÉMISSION ATOMIQUE DES FACTURES/.test(m80) && /Écrite le 21\/10\/2026\. ✅ APPLIQUÉE le 21\/10\/2026/.test(m80.slice(0, 700)) && /PUIS le\s*\n?-- déploiement|PUIS le déploiement/.test(m80.slice(0, 900))
    && /create unique index if not exists factures_artisan_numero_unique\s+on public\.factures \(artisan_id, numero\) where numero is not null;/.test(c80)
    && !/^\s*(update|delete from|drop table|alter table .* drop)/im.test(c80.replace(/\$fn\$[\s\S]*?\$fn\$/g, '')))
  T('E9 facture_emettre : SECURITY DEFINER, search_path vide, EXECUTE retiré à public/anon/authenticated et donné au seul service_role ; verrou artisan PUIS devis ; refus préfixés « refus : »',
    /returns jsonb language plpgsql security definer set search_path = '' as \$fn\$/.test(c80) && /revoke all on function public\.facture_emettre\(jsonb\) from public, anon, authenticated;/.test(c80) && /grant execute on function public\.facture_emettre\(jsonb\) to service_role;/.test(c80)
    && fe.indexOf("hashtextextended('presti.factures.artisan:'") > 0 && fe.indexOf("hashtextextended('presti.factures.artisan:'") < fe.indexOf("hashtextextended('presti.factures.devis:'") && (fe.match(/raise exception 'refus : /g) ?? []).length >= 15)
  T('E10 facture_emettre : déjà-facturé RECALCULÉ (factures du devis émises ou payées, ni avoir ni visées par un avoir, SANS condition de lignes), jamais plus que le devis pour TOUS les types, montant d’une situation = cumul − déjà facturé, d’un solde = devis − déjà facturé',
    /select coalesce\(sum\(fa\.total_ht\), 0\), count\(\*\) into v_deja, v_n\s+from public\.factures fa\s+where fa\.devis_id = v_devis and fa\.avoir_de is null and fa\.statut in \('emise', 'payee'\)\s+and not exists \(select 1 from public\.factures a where a\.avoir_de = fa\.id\);/.test(fe)
    && !/factures_lignes[\s\S]{0,80}v_deja/.test(fe) && /if v_deja \+ v_total_ht > coalesce\(v_devis_ht, 0\) \+ 0\.01 \* \(v_n \+ 4\) then\s+raise exception 'refus : jamais plus que le devis/.test(fe)
    && /if v_type = 'situation' and abs\(v_total_ht - \(\(f ->> 'cumul_ht'\)::numeric - v_deja\)\) > 0\.01 \* \(v_n \+ 1\) then/.test(fe) && /if v_type = 'solde' and abs\(v_total_ht - \(coalesce\(v_devis_ht, 0\) - v_deja\)\) > 0\.01 \* \(v_n \+ 4\) then/.test(fe))
  T('E11 facture_emettre, tout ou rien : lignes contrôlées (≥ 1, ≤ 200, HT, TVA par taux et TTC recalculés), puis facture et lignes insérées, puis next_numero DANS la transaction (jamais n ?? 1), puis scellement et empreinte calculée par la base ; l’avoir passe « annulée » la facture visée dans la même transaction',
    /if jsonb_typeof\(v_lignes\) is distinct from 'array' or jsonb_array_length\(v_lignes\) = 0 then/.test(fe) && /abs\(v_calc_ht - v_total_ht\) > 0\.02/.test(fe) && /abs\(v_calc_tva - v_total_tva\) > 0\.01 \* \(v_nb_taux \+ 1\)/.test(fe)
    && fe.indexOf('insert into public.factures (') < fe.indexOf('insert into public.factures_lignes') && fe.indexOf('insert into public.factures_lignes') < fe.indexOf("v_num := public.next_numero(v_artisan, 'facture');")
    && /if v_num is null then raise exception 'refus : compteur/.test(fe) && /set numero = v_numero, verrouillee = true, emise_le = now\(\),\s+empreinte = encode\(sha256\(convert_to\(replace\(v_modele, '"@@NUMERO@@"', to_json\(v_numero\)::text\), 'UTF8'\)\), 'hex'\)/.test(fe)
    && /if v_type = 'avoir' then\s+update public\.factures set statut = 'annulee', updated_at = now\(\) where id = v_avoir_de;/.test(fe) && /for update;/.test(fe))
  T('E12 0180 : devis_lignes_remplacer (lignes et totaux en une transaction, au service_role seul) ; factures_situation_verifier étendue : devis du même artisan et jamais plus que le devis pour TOUTE facture rattachée à un devis (avoirs exceptés)',
    /create or replace function public\.devis_lignes_remplacer\(p_devis uuid, p_artisan uuid, p_lignes jsonb, p_totaux jsonb\)\s+returns int language plpgsql security definer set search_path = ''/.test(c80) && /grant execute on function public\.devis_lignes_remplacer\(uuid, uuid, jsonb, jsonb\) to service_role;/.test(c80)
    && /if new\.devis_id is null or new\.avoir_de is not null then\s+return new;\s+end if;\s+perform pg_advisory_xact_lock/.test(c80) && /if v_somme \+ coalesce\(new\.total_ht, 0\) > coalesce\(v_total_ht, 0\) \+ 0\.01 \* \(v_n \+ 4\) then\s+raise exception 'factures : jamais plus que le devis/.test(c80))
  const j80 = existe('supabase/migrations/_A_COLLER_sql_editor_0180_NU.sql') ? lire('supabase/migrations/_A_COLLER_sql_editor_0180_NU.sql') : ''
  T('E13 jumeau 0180 à coller avec son contrôle en pied (fonctions, droits, index, 0 facture émise sans numéro)', existe('supabase/controles/0180_factures_emission_atomique.sql') && j80.includes("'factures emises sans numero (attendu 0)'") && j80.includes('create or replace function public.facture_emettre(p jsonb)'))
  if (mod) {
    const db = new mod.PGlite()
    const q = (s, p) => db.query(s, p)
    const essai = async (p) => { try { return { ok: true, r: (await q('select public.facture_emettre($1::jsonb) as r', [JSON.stringify(p)])).rows[0].r } } catch (e) { return { ok: false, m: e.message } } }
    await db.exec(`
      create role service_role; create role anon; create role authenticated;
      create table public.artisans (id uuid primary key, compteur_facture int default 0, compteur_devis int default 0);
      create function public.next_numero(p_artisan uuid, p_type text) returns int language plpgsql security definer set search_path = public as $$
      declare n int; begin update public.artisans set compteur_facture = coalesce(compteur_facture,0)+1 where id = p_artisan returning compteur_facture into n; return n; end $$;
      create table public.devis (id uuid primary key default gen_random_uuid(), artisan_id uuid references public.artisans(id), statut text, total_ht numeric, total_tva numeric, total_ttc numeric);
      create table public.devis_lignes (id uuid primary key default gen_random_uuid(), devis_id uuid references public.devis(id), ordre int, designation text, quantite numeric, unite text, prix_unitaire_ht numeric, tva_taux numeric, source_prix text);
      create table public.factures (id uuid primary key default gen_random_uuid(), artisan_id uuid, devis_id uuid references public.devis(id) on delete set null, client_id uuid, numero text, objet text, statut text default 'emise',
        date_emission date default current_date, date_echeance date, remise_pct numeric default 0, acompte_pct numeric default 0, conditions text, notes text, client_nom text, client_email text, client_adresse text,
        client_siren text, client_pays text default 'FR', adresse_chantier text, categorie_operation text default 'mixte', devise text default 'EUR', exoneration_code text, tva_sur_debits boolean default false,
        tva_regime text, total_ht numeric, total_tva numeric, total_ttc numeric, avoir_de uuid, verrouillee boolean default false, emise_le timestamptz, empreinte text, updated_at timestamptz default now());
      create table public.factures_lignes (id uuid primary key default gen_random_uuid(), facture_id uuid references public.factures(id), ordre int, designation text, quantite numeric, unite text, prix_unitaire_ht numeric, tva_taux numeric, source_prix text);`)
    await db.exec(mig)
    await db.exec(m80)
    await db.exec(m80) // idempotente
    const art = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
    await q('insert into public.artisans (id) values ($1)', [art])
    const dv = (await q(`insert into public.devis (artisan_id, statut, total_ht) values ($1, 'accepte', 15000) returning id`, [art])).rows[0].id
    const L = [{ designation: 'Gros œuvre', quantite: 1, unite: 'u', prix_unitaire_ht: 10000, tva_taux: 10 }, { designation: 'Électricité', quantite: 1, unite: 'u', prix_unitaire_ht: 5000, tva_taux: 20 }]
    const base = { artisan_id: art, devis_id: dv, annee: '2026', empreinte_modele: JSON.stringify({ numero: JETON_NUMERO }), facture: { client_nom: 'Client', total_ht: 15000, total_tva: 2000, total_ttc: 17000 }, lignes: L }
    const e1 = await essai({ ...base, type: 'standard' })
    const e2 = await essai({ ...base, type: 'standard' })
    const e3 = await essai({ ...base, type: 'acompte', facture: { client_nom: 'Client', total_ht: 4500, total_tva: 600, total_ttc: 5100 }, lignes: [{ designation: 'Acompte', quantite: 1, prix_unitaire_ht: 3000, tva_taux: 10 }, { designation: 'Acompte', quantite: 1, prix_unitaire_ht: 1500, tva_taux: 20 }] })
    const faux = await essai({ ...base, devis_id: null, type: 'standard', facture: { client_nom: 'Client', total_ht: 99, total_tva: 2000, total_ttc: 2099 } })
    const nb1 = (await q('select count(*)::int as n, max(compteur_facture) as c from public.factures, public.artisans')).rows[0]
    const av = e1.ok ? await essai({ artisan_id: art, devis_id: null, type: 'avoir', avoir_de: e1.r.id, annee: '2026', empreinte_modele: JSON.stringify({ numero: JETON_NUMERO }), facture: { client_nom: 'Client', total_ht: -15000, total_tva: -2000, total_ttc: -17000 }, lignes: L.map((l) => ({ ...l, prix_unitaire_ht: -l.prix_unitaire_ht })) }) : { ok: false }
    const av2 = e1.ok ? await essai({ artisan_id: art, devis_id: null, type: 'avoir', avoir_de: e1.r.id, annee: '2026', empreinte_modele: JSON.stringify({ numero: JETON_NUMERO }), facture: { client_nom: 'Client', total_ht: -15000, total_tva: -2000, total_ttc: -17000 }, lignes: L.map((l) => ({ ...l, prix_unitaire_ht: -l.prix_unitaire_ht })) }) : { ok: true }
    const statut = e1.ok ? (await q('select statut, numero, verrouillee, empreinte from public.factures where id = $1', [e1.r.id])).rows[0] : {}
    const e4 = await essai({ ...base, type: 'standard' })
    T('E14 0180 REJOUÉE dans PGlite : facture émise d’un bloc (FAC-2026-0001, scellée, empreinte), la 2e complète refusée, l’acompte par-dessus refusé, des totaux faux refusés sans consommer de numéro ; l’avoir annule (FAC-2026-0002), un 2e avoir refusé ; après l’avoir, la facture se refait (FAC-2026-0003)',
      e1.ok && e1.r.numero === 'FAC-2026-0001' && !e2.ok && /jamais plus que le devis/.test(e2.m) && !e3.ok && !faux.ok && nb1.n === 1 && Number(nb1.c) === 1 && av.ok && av.r.numero === 'FAC-2026-0002' && !av2.ok
      && statut.statut === 'annulee' && statut.verrouillee === true && /^[0-9a-f]{64}$/.test(statut.empreinte ?? '') && e4.ok && e4.r.numero === 'FAC-2026-0003', JSON.stringify({ e1, e2, e3, faux, nb1, av, av2, statut, e4 }))
    await db.close()
  } else console.log('WAIT E14 PGlite introuvable : 0180 n’est pas rejouée dans un Postgres ici.')
}

// ═══════════════════════ G. Défauts relevés en production le 21/10 (unités, TVA, provenance) ═══════════════════════
{
  const ai = await imp('lib/ai.ts')
  const TABLE = [
    ['m²', 'm²'], ['M²', 'm²'], ['m2', 'm²'], ['m^2', 'm²'], ['mètre carré', 'm²'], ['mètres carrés', 'm²'],
    ['m³', 'm³'], ['m3', 'm³'], ['mètres cubes', 'm³'], ['ml', 'ml'], ['m', 'ml'], ['mètre linéaire', 'ml'], ['ML', 'ml'],
    ['u', 'u'], ['pièce', 'u'], ['h', 'h'], ['heures', 'h'], ['j', 'j'], ['forfait', 'forfait'], ['Fft', 'forfait'], ['ens.', 'ens.'],
    ['kg', 'kg'], ['kilos', 'kg'], ['l', 'l'], ['litres', 'l'], ['t', 't'], ['tonnes', 't'], ['sac', 'sac'], ['', 'u'],
  ]
  const fausses = TABLE.filter(([e, a]) => ai.normalizeUnite(e) !== a).map(([e, a]) => `${e} → ${ai.normalizeUnite(e)} (attendu ${a})`)
  T(`G1 unités (${TABLE.length} entrées) : m² et m³ gardés (m2 → m², m3 → m³, « mètre carré » → m²), ml, u, h, j, forfait, ens., kg, l, t ; une unité inconnue est gardée telle quelle`, fausses.length === 0, fausses.join(' ; '))
  const lignesIA = ai.lignesDevisDepuisIA([{ designation: 'Carrelage', quantite: 12, unite: 'm²', prix_unitaire_ht: 40, tva_taux: 10 }, { designation: 'Béton', quantite: 2, unite: 'm3', prix_unitaire_ht: 120, tva_taux: 10 }], [])
  T('G2 une ligne de chiffrage IA en m² reste en m² (et m3 → m³) : plus aucune surface en mètres linéaires', lignesIA.map((l) => l.unite).join(',') === 'm²,m³', JSON.stringify(lignesIA))

  const { tauxTvaLu } = await imp('lib/lignes.ts')
  const tva = [[0, 10, 0], ['0', 10, 0], [null, 10, 10], [undefined, 20, 20], ['', 10, 10], [5.5, 10, 5.5], ['20', 10, 20], ['abc', 10, 10], [-1, 10, 10]]
  const tvaFausses = tva.filter(([v, d, a]) => tauxTvaLu(v, d) !== a).map(([v, d, a]) => `${JSON.stringify(v)} → ${tauxTvaLu(v, d)} (attendu ${a})`)
  const ed = lire('app/devis/[id]/page.tsx')
  T('G3 TVA lue : 0 (franchise) reste 0 ; le défaut ne remplace qu’un taux absent ou illisible ; l’écran lit par tauxTvaLu (base ET chiffrage IA) et propose 0 % en franchise',
    tvaFausses.length === 0 && !/Number\(l\.tva_taux\) \|\|/.test(ed) && (ed.match(/tauxTvaLu\(l\.tva_taux, (10|20)\)/g) ?? []).length === 2 && /\{\(tvaRegime === 'franchise' \|\| l\.tva_taux === 0\) && <option value=\{0\}>0%<\/option>\}/.test(ed), tvaFausses.join(' ; '))
  const rg = lire('app/api/devis/generer/route.ts')
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const createAvant = Anthropic.Messages.prototype.create
  const vus = []
  Anthropic.Messages.prototype.create = async function (params) { vus.push(params.system); return { content: [{ type: 'text', text: '{"lignes":[],"note":"x"}' }] } }
  try {
    await ai.generateDevis({ nom: 'Essai', metier: 'Plombier', tva_regime: 'reel' }, 'Remplacement d’un chauffe-eau', [], 'claude-haiku-5-5')
    await ai.generateDevis({ nom: 'Essai', metier: 'Plombier', tva_regime: null }, 'Remplacement d’un chauffe-eau', [], 'claude-haiku-5-5')
  } finally { Anthropic.Messages.prototype.create = createAvant }
  T('G4 /api/devis/generer lit le régime de TVA de l’artisan (comme /api/devis/auto) et le transmet ; au réel le prompt ne dit plus « franchise → 0 % » (sans régime, il le disait)',
    /\.select\('nom, metier, plan, is_founder, tva_regime'\)/.test(rg) && /tva_regime: \(artisan as \{ tva_regime\?: string \| null \}\)\.tva_regime \?\? null/.test(rg)
    && !vus[0].includes('RÉGIME DE TVA DE CET ARTISAN : franchise') && vus[1].includes('RÉGIME DE TVA DE CET ARTISAN : franchise'))

  const { sourceLigneValide } = await imp('lib/prix/types.ts')
  const cat = [
    { designation: 'Disjoncteur 16 A', unite: 'u', prix_ht: 42.5, tva_taux: 20, source: 'artisan', source_libelle: 'vos tarifs · Rexel · 12/02/2026', date_prix: '2026-02-12' },
    { designation: 'Disjoncteur 20 A', unite: 'u', prix_ht: 44.9, tva_taux: 20, source: 'artisan', source_libelle: 'vos tarifs · Rexel · 12/02/2026', date_prix: '2026-02-12' },
    { designation: 'Prise', unite: 'u', prix_ht: 12, prix_ht_min: 8, prix_ht_max: 20, tva_taux: 20, source: 'marche', source_libelle: 'ordre de grandeur du marché', date_prix: null },
  ]
  const lib = 'vos tarifs · Rexel · 12/02/2026'
  T('G5 provenance « vos tarifs » : gardée si le prix est, au centime, celui d’un tarif de ce libellé (42,50 ou 44,90) ; 42,51 ou 0 → « estimation » ; sans prix (ancien appel) le libellé seul est vérifié ; un libellé inventé → « estimation »',
    sourceLigneValide(lib, cat, 42.5) === lib && sourceLigneValide(lib, cat, 44.9) === lib && sourceLigneValide(lib, cat, 42.51) === 'estimation' && sourceLigneValide(lib, cat, 0) === 'estimation'
    && sourceLigneValide(lib, cat) === lib && sourceLigneValide('vos tarifs · Point P · 01/01/2026', cat, 42.5) === 'estimation'
    && sourceLigneValide('ordre de grandeur du marché', cat, 999) === 'ordre de grandeur du marché' && sourceLigneValide('estimation', cat, 1) === 'estimation')
  const parIA = ai.lignesDevisDepuisIA([
    { designation: 'Disjoncteur 16 A', quantite: 2, unite: 'u', prix_unitaire_ht: 42.5, tva_taux: 20, source_prix: lib },
    { designation: 'Disjoncteur 16 A (prix arrangé)', quantite: 2, unite: 'u', prix_unitaire_ht: 39, tva_taux: 20, source_prix: lib },
  ], cat)
  T('G6 chiffrage IA (fixture, sans appel) : la ligne au prix du tarif garde « vos tarifs · Rexel · … », celle au prix modifié redevient « estimation »',
    parIA[0].source_prix === lib && parIA[1].source_prix === 'estimation', JSON.stringify(parIA.map((l) => l.source_prix)))
}

// ═══════════════════════ F. Hygiène ═══════════════════════
{
  const fichiers = ['lib/facturesTypes.ts', 'lib/facturesTypesServeur.ts', 'lib/factureDepuisDevis.ts', 'lib/DevisPDF.tsx', 'lib/devisPdfData.ts', 'lib/ai.ts', 'lib/crm/argent.ts', 'lib/crm/chantier.ts',
    'lib/assistant/outils-actions.ts', 'lib/assistant/actions-serveur.ts', 'lib/lignes.ts', 'lib/prix/types.ts', 'app/api/factures/route.ts', 'app/api/devis/route.ts', 'app/api/devis/[id]/route.ts', 'app/api/devis/generer/route.ts',
    'app/api/factures/[id]/facturx/route.ts', 'app/devis/[id]/page.tsx', 'supabase/migrations/0176_types_devis_factures.sql', 'supabase/controles/0176_types_devis_factures.sql',
    'supabase/migrations/_A_COLLER_sql_editor_0176_NU.sql', 'scripts/types-devis-factures-qa.mjs']
  const sales = fichiers.filter((f) => /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(fs.readFileSync(path.join(RACINE, f), 'utf8')))
  T('F1 aucun octet de contrôle (hors tabulation et fins de ligne) dans les fichiers du chantier', sales.length === 0, sales.join(' '))
}

fs.rmSync(dossierPdf, { recursive: true, force: true })
console.log(`\n${verts} vert(s), ${rouges.length} rouge(s)${rouges.length ? ' : ' + rouges.join(' · ') : ''}`)
process.exitCode = rouges.length ? 1 : 0
