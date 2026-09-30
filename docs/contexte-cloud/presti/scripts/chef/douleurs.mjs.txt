#!/usr/bin/env node
// scripts/chef/douleurs.mjs — la passe mensuelle des douleurs, sous l'identité `douleurs` (fiche 026-226).
//
// Une passe par mois ÉCOULÉ, clé idempotente douleurs-AAAA-MM ; chaque douleur porte ses sources et un nombre, ou
// « non mesuré » dès qu'une source n'est pas comptée ; une source hors du mois est écartée ; une seule source n'est pas
// une tendance ; trois propositions au plus, coût estimé comme tel ; aucune donnée personnelle dans le rapport ni vers le
// classeur, qui annote sans jamais créer ni décider une douleur. Un mois vide donne « rien de mesuré ».
//
// Le Chef LIT le rapport à la réunion et peut proposer une fiche ; il ne lance pas la passe (minuteur
// presti-douleurs.timer) et ne tient pas le jeton de `douleurs`. Contrat : docs/agents/douleurs-mensuelles.md.
//
// Usage (service presti-douleurs.service) :
//   node scripts/usine/avec-coffre.mjs PRESTI_JETON_DOULEURS -- node scripts/chef/douleurs.mjs --une-passe [--mois=AAAA-MM]
//        [--sources=<fichier.json>] [--travail=<dossier>] [--base=https://prestiapp.fr] [--sans-battement]
// Codes : 0 passe faite (mois vide compris), refus « mois non écoulé » ou reprise ; 2 usage ou jeton absent ; 1 panne.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const PERSONNEL = /[\w.+-]+@[\w-]+(\.[\w-]+)+|(\+33|0)\s?[1-9](?:[\s.-]?\d{2}){4}/g
const anonymiser = (t) => String(t || '').replace(PERSONNEL, '[masqué]')

export async function passeMensuelle({ mois, sources = [], magasin, horloge, classer = null }) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(mois || ''))
  if (!m) return { refus: 'mois' }
  const debut = Date.UTC(Number(m[1]), Number(m[2]) - 1, 1)
  const fin = Date.UTC(Number(m[1]), Number(m[2]), 1)
  if (horloge.maintenant() < fin) return { refus: 'mois_non_ecoule' }
  const cle = `douleurs-${mois}`
  const deja = await magasin.lire(cle)
  if (deja) return { cle, deja: true, rapport: deja }

  const ecartees = []
  const retenues = []
  for (const s of sources) {
    const t = Date.parse(s?.date)
    if (!s?.id || !s.source || !s.probleme || Number.isNaN(t)) { ecartees.push({ id: s?.id ?? null, raison: 'incomplete' }); continue }
    if (t < debut || t >= fin) { ecartees.push({ id: s.id, raison: 'perimee' }); continue }
    retenues.push(s)
  }

  // Le classeur ne reçoit que des extraits anonymisés et ne rend qu'une annotation ; s'il tombe, la passe continue sans lui.
  let avis = []
  if (classer && retenues.length) {
    try { avis = await classer(retenues.map((s) => ({ id: s.id, probleme: s.probleme, extrait: anonymiser(s.extrait) }))) } catch { avis = [] }
  }

  const groupes = new Map()
  for (const s of retenues) {
    const g = groupes.get(s.probleme) || { probleme: s.probleme, sources: [], nombres: [], gravite: 0 }
    g.sources.push(s.id)
    g.nombres.push(typeof s.nombre === 'number' ? s.nombre : null)
    g.gravite = Math.max(g.gravite, Number(s.gravite) || 1)
    groupes.set(s.probleme, g)
  }
  const douleurs = [...groupes.values()].map((g) => {
    const a = (avis || []).find((x) => x?.probleme === g.probleme)
    return {
      probleme: g.probleme,
      sources: g.sources,
      nombre: g.nombres.includes(null) ? 'non mesuré' : g.nombres.reduce((x, y) => x + y, 0),
      gravite: g.gravite,
      tendance: new Set(g.sources).size >= 2,
      ...(a && typeof a.confiance === 'number' ? { confiance_classeur: a.confiance } : {}),
    }
  })
  const rang = (d) => (d.tendance ? 1000 : 0) + d.gravite * 100 + (typeof d.nombre === 'number' ? Math.min(d.nombre, 99) : 0)
  const propositions = [...douleurs].sort((a, b) => rang(b) - rang(a)).slice(0, 3).map((d) => ({
    titre: `Réduire « ${d.probleme} »`,
    preuve: [...d.sources],
    hypothese: `Si « ${d.probleme} » diminue, les demandes de support du mois suivant baissent.`,
    cout: { estime: true, eur: 0 },
    dependances: [],
    garde: 'fiche de conception après verdict ; drapeau produit éteint',
    prochain_essai: 'un essai borné sur une seule page',
    validation: ['claude-code'],
  }))
  const rapport = {
    mois,
    cle,
    genere_le: new Date(horloge.maintenant()).toISOString(),
    statut: douleurs.length ? 'mesuré' : 'rien de mesuré',
    douleurs,
    propositions,
    ecartees,
  }
  await magasin.ecrire(cle, rapport)
  return { cle, deja: false, rapport }
}

// ── Ligne de commande (jamais exécutée à l'import) ───────────────────────────────────────────────────────────────────
const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

function option(argv, nom) {
  const a = argv.find((x) => x === `--${nom}` || x.startsWith(`--${nom}=`))
  if (a === undefined) return undefined
  return a.includes('=') ? a.slice(a.indexOf('=') + 1) : true
}

/** Le mois civil précédent, à l'heure de Paris, au format AAAA-MM. */
export function moisPrecedent(t) {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit' }).formatToParts(new Date(t))
  let an = Number(p.find((x) => x.type === 'year').value)
  let mo = Number(p.find((x) => x.type === 'month').value) - 1
  if (mo < 1) { mo = 12; an -= 1 }
  return `${an}-${String(mo).padStart(2, '0')}`
}

const ligneDe = (v) => String(v ?? '').replace(/\s+/g, ' ').trim()
export function rapportEnTexte(r) {
  const l = [`# Veille des douleurs — ${r.mois}`, '', `Statut : ${r.statut}. Généré le ${r.genere_le}.`, '']
  if (r.statut !== 'mesuré') l.push("Rien de mesuré ce mois-ci : aucune douleur n'est inventée.", '')
  for (const d of r.douleurs) l.push(`- ${ligneDe(d.probleme)} : ${d.nombre} (gravité ${d.gravite}, ${d.tendance ? 'tendance' : 'source unique, pas une tendance'}) — sources ${d.sources.join(', ')}`)
  if (r.propositions.length) l.push('', '## Propositions (validation Claude Code avant toute fiche)')
  for (const p of r.propositions) l.push(`- ${ligneDe(p.titre)} — preuve ${p.preuve.join(', ')} ; coût estimé ; essai : ${ligneDe(p.prochain_essai)}`)
  if (r.ecartees.length) l.push('', `Écartées : ${r.ecartees.map((e) => `${e.id ?? '?'} (${e.raison})`).join(', ')}`)
  return l.join('\n') + '\n'
}

async function battement(base, jeton) {
  try {
    const r = await fetch(new URL('/api/agents/battement', base), { method: 'POST', headers: { authorization: `Bearer ${jeton}`, 'content-type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(20_000) })
    if (r.status === 200) return 'envoyé'
    if (r.status === 423) return 'pause (aucun battement)'
    return `refusé (HTTP ${r.status})`
  } catch { return 'réseau indisponible' }
}

// Le classeur passe par creerLecteur('douleurs') (freellmapi, personnelles: false : jamais d'extrait de client) ; hors de
// la chaîne de construction de l'application ce module TypeScript peut ne pas se charger : la passe se fait alors sans
// annotation, ce qui est prévu (le classeur annote, il ne décide pas).
async function classeurDeLaPasse() {
  try {
    const mod = await import(pathToFileURL(path.join(RACINE, 'lib', 'agents', 'llm.ts')).href)
    const lecteur = mod.creerLecteur?.('douleurs')
    if (typeof lecteur !== 'function') return null
    return async (extraits) => {
      const r = await lecteur('Annote chaque extrait par le problème utilisateur et une confiance entre 0 et 1. Ne crée aucun problème.', extraits)
      return Array.isArray(r) ? r : []
    }
  } catch { return null }
}

async function principal() {
  const argv = process.argv.slice(2)
  if (!option(argv, 'une-passe')) { console.error('usage : douleurs.mjs --une-passe [--mois=AAAA-MM] [--sources=fichier.json] [--travail=dossier] [--base=url] [--sans-battement]'); return 2 }
  const jeton = (process.env.PRESTI_JETON_DOULEURS || '').trim()
  const sansBattement = option(argv, 'sans-battement') === true
  if (!jeton && !sansBattement) { console.error("✗ PRESTI_JETON_DOULEURS absent : rien n'est lancé"); return 2 }
  const mois = option(argv, 'mois') || moisPrecedent(Date.now())
  const dossier = option(argv, 'travail')
  const travail = path.resolve(typeof dossier === 'string' ? dossier : path.join(RACINE, '.orchestre', 'travail', 'douleurs'))
  const src = option(argv, 'sources')
  const fichierSources = typeof src === 'string' ? path.resolve(src) : path.join(travail, `sources-${mois}.json`)
  let sources = []
  try { const v = JSON.parse(fs.readFileSync(fichierSources, 'utf8')); sources = Array.isArray(v) ? v : [] } catch { sources = [] }
  fs.mkdirSync(travail, { recursive: true })
  const magasin = {
    lire: async (k) => { try { return JSON.parse(fs.readFileSync(path.join(travail, `${k}.json`), 'utf8')) } catch { return null } },
    ecrire: async (k, v) => { fs.writeFileSync(path.join(travail, `${k}.json`), JSON.stringify(v, null, 2) + '\n') },
  }
  const r = await passeMensuelle({ mois, sources, magasin, horloge: { maintenant: () => Date.now() }, classer: await classeurDeLaPasse() })
  if (r.refus === 'mois') { console.error(`✗ mois illisible : ${mois}`); return 2 }
  if (r.refus) { console.log(`… ${mois} : ${r.refus} (aucune écriture, aucun battement)`); return 0 }
  if (!r.deja) fs.writeFileSync(path.join(travail, `rapport-${mois}.md`), rapportEnTexte(r.rapport))
  const base = option(argv, 'base')
  const bat = sansBattement ? 'non demandé' : await battement(typeof base === 'string' ? base : 'https://prestiapp.fr', jeton)
  console.log(`✓ ${r.cle} : ${r.deja ? 'reprise, rapport déjà écrit' : r.rapport.statut} (${r.rapport.douleurs.length} douleur(s), ${r.rapport.propositions.length} proposition(s)) ; battement ${bat}`)
  return 0
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  principal().then((c) => { process.exitCode = c }).catch((e) => { console.error(`✗ ${e?.message || e}`); process.exitCode = 1 })
}
