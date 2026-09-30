// scripts/fixtures/026-pilotage/t/controles.mjs — les contrôles propres au lot t (fiche 026-171, partie hors ligne), lus par
// scripts/juges-026-pilotage-preuve.mjs --lot=t (lot.mjs les déclare) :
//   JA-3  controleJeux    l'auto-contrôle des jeux d'essai : chaque attendu écrit dans un jeu est RECALCULÉ ici par un calcul
//                         indépendant des modules jugés (les dispositions, les réglages, la géométrie des coursives) ; le thème
//                         d'essai et son portrait sont conformes au schéma ; les pièges de thèmes sont bien des thèmes abîmés
//                         d'UNE faute ; le témoin dérivé (thèmes, pièges, drapeau, LISEZMOI) est à jour octet pour octet ;
//   JA-4  controleSecrets aucun juge du lot ne lit .env.local ni presti-secrets (lu dans le source, puis vérifié sous un piège des
//                         lectures), aucune clé réelle, aucune adresse distante hors liste ;
//   JA-6  controleAppels  chaque juge refuse un appel invalide en code 2.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { R, TRAVAIL, court, exigerSousTravail, sansCommentaires, listerFichiers } from '../a/commun.mjs'
import { lecturesDeSecrets, jetonsDans, RE_CHEMIN_SECRET } from '../a/jeux.mjs'
import { validerSchema, contraintesTheme } from '../k/validateur.mjs'
import { T, themeEssai, schemaTheme, avecPortrait, materialiser, portesAtteintes, composantesDesPortes, jeuT, copie, sha256 } from './outils.mjs'

const rel = (f) => path.relative(R, f).split(path.sep).join('/')
const oracleTheme = (t) => { try { return [...validerSchema(t, schemaTheme()), ...contraintesTheme(t)] } catch (e) { return [`validateur : ${e.message}`] } }

// ── Le calcul indépendant des dispositions ──────────────────────────────────────────────────────────────────────────────
const SALLES_20 = ['commandement', 'reunion', 'radar', 'redaction', 'envois', 'standard', 'atelier', 'usine', 'recettes', 'tresorerie', 'crieur', 'studio', 'experience', 'machines', 'chantier', 'audience', 'securite', 'presti', 'observatoire', 'repos']
function fautesDisposition(theme, d) {
  const f = []
  const cles = new Set(theme.emplacements.map((e) => e.cle))
  const reservee = theme.emplacements.find((e) => e.reservee).cle
  for (const [salle, slot] of Object.entries(d.salles)) {
    if (![...SALLES_20, 'ecommerce'].includes(salle)) f.push(`salle inconnue ${salle}`)
    if (!cles.has(slot)) f.push(`emplacement inconnu ${slot}`)
  }
  if (d.salles.ecommerce !== undefined && d.salles.ecommerce !== reservee) f.push('réservée déplacée')
  if (d.plaques?.ecommerce !== undefined && d.plaques.ecommerce !== 'E-commerce') f.push('réservée renommée')
  const vus = new Map()
  for (const s of SALLES_20) {
    const slot = d.salles[s]
    if (slot === undefined) { f.push(`${s} sans emplacement`); continue }
    if (slot === reservee) f.push(`${s} dans l'emplacement réservé`)
    if (vus.has(slot)) f.push(`deux salles dans ${slot}`)
    vus.set(slot, s)
  }
  if (f.length) return f
  const vues = [['bureau', theme.emplacements, d.coursives ?? theme.coursives]]
  if (theme.portrait) vues.push(['portrait', theme.portrait.emplacements, d.portrait?.coursives ?? theme.portrait.coursives])
  for (const [nom, emp, c] of vues) {
    const atteintes = portesAtteintes(emp, c, d.salles.commandement)
    for (const s of SALLES_20) if (!atteintes.has(d.salles[s])) f.push(`${nom} : ${s} non reliée`)
  }
  const tp = d.tapis ?? theme.tapis, pas = theme.grille.pas
  for (let i = 1; i < tp.trace.length; i++) if (Math.abs(tp.trace[i].x - tp.trace[i - 1].x) > pas || Math.abs(tp.trace[i].y - tp.trace[i - 1].y) > pas) f.push(`tapis rompu en ${i}`)
  const sur = new Set(tp.trace.map((p) => `${p.x},${p.y}`))
  for (const s of tp.etapes) if (!sur.has(`${s.x},${s.y}`)) f.push(`étape ${s.cle} hors du tracé`)
  return f
}

// ── Le calcul indépendant des réglages ──────────────────────────────────────────────────────────────────────────────────
const CLES = ['theme', 'mise_en_page', 'nuit', 'equipage', 'salles', 'couleurs', 'affichage']
const longueur = (t) => [...String(t)].length
const texteOk = (t, min, max) => typeof t === 'string' && longueur(t) >= min && longueur(t) <= max && /^[\p{L}\p{N} '’-]+$/u.test(t)
const hex = (c) => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c)
function fautesReglages(b, theme) {
  const f = []
  if (JSON.stringify(b).length > 65536) return ['taille']
  if (!b || typeof b !== 'object' || Array.isArray(b)) return ['racine']
  for (const k of Object.keys(b)) if (!CLES.includes(k)) f.push(`clé ${k}`)
  if ('theme' in b && !['station', 'vaisseau'].includes(b.theme)) f.push('theme')
  if ('mise_en_page' in b && !['colonnes', 'flottante'].includes(b.mise_en_page)) f.push('mise_en_page')
  const agents = theme.avatars.map((a) => a.cle).filter((c) => c !== 'defaut')
  const objet = (x) => x && typeof x === 'object' && !Array.isArray(x)
  if ('nuit' in b) { if (!objet(b.nuit)) f.push('nuit'); else for (const k of ['debut', 'fin']) if (k in b.nuit && !(Number.isInteger(b.nuit[k]) && b.nuit[k] >= 0 && b.nuit[k] <= 23)) f.push(`nuit.${k}`) }
  if ('equipage' in b) {
    if (!objet(b.equipage)) f.push('equipage')
    else for (const [a, v] of Object.entries(b.equipage)) {
      if (!agents.includes(a)) f.push(`agent ${a}`)
      if (!objet(v)) { f.push(`equipage.${a}`); continue }
      if ('nom' in v && !texteOk(v.nom, 2, 16)) f.push(`nom ${a}`)
      if ('avatar' in v && !theme.avatars.some((x) => x.cle === v.avatar)) f.push(`avatar ${a}`)
      if ('couleur' in v && !hex(v.couleur)) f.push(`couleur ${a}`)
    }
  }
  if ('salles' in b) {
    if (!objet(b.salles)) f.push('salles')
    else {
      const salles = Object.fromEntries(theme.defauts.map((x) => [x.salle, x.emplacement])), plaques = {}
      for (const [s, v] of Object.entries(b.salles)) {
        if (![...SALLES_20, 'ecommerce'].includes(s)) f.push(`salle ${s}`)
        if (!objet(v)) { f.push(`salles.${s}`); continue }
        if ('emplacement' in v) salles[s] = v.emplacement
        if ('plaque' in v) { if (!texteOk(v.plaque, 2, 24)) f.push(`plaque ${s}`); plaques[s] = v.plaque }
        if ('teinte' in v && !hex(v.teinte)) f.push(`teinte ${s}`)
      }
      if (!f.length) f.push(...fautesDisposition(theme, { salles, plaques }))
    }
  }
  if ('couleurs' in b) { if (!objet(b.couleurs)) f.push('couleurs'); else for (const [k, v] of Object.entries(b.couleurs)) { if (!(k in theme.palette)) f.push(`jeton ${k}`); else if (!hex(v)) f.push(`couleur ${k}`) } }
  if ('affichage' in b) {
    if (!objet(b.affichage)) f.push('affichage')
    else {
      for (const k of Object.keys(b.affichage)) if (!['titre', 'taille_plaques'].includes(k)) f.push(`affichage.${k}`)
      if ('titre' in b.affichage && !texteOk(b.affichage.titre, 2, 32)) f.push('titre')
      if ('taille_plaques' in b.affichage && !['petite', 'normale', 'grande'].includes(b.affichage.taille_plaques)) f.push('taille_plaques')
    }
  }
  return f
}

export async function controleJeux(ctx) {
  const e = [], notes = []
  const essai = themeEssai()
  // 1. Le thème d'essai et son portrait
  const base = oracleTheme(essai)
  if (base.length) e.push(`le thème d'essai n'est pas conforme à son schéma : ${base.slice(0, 2).join(' ; ')}`)
  const avec = avecPortrait(essai)
  const port = oracleTheme(avec)
  if (port.length) e.push(`le thème d'essai transposé en portrait n'est pas conforme : ${port.slice(0, 2).join(' ; ')}`)
  for (const [nom, v] of [['bureau', avec], ['portrait', avec.portrait]]) if (portesAtteintes(v.emplacements, v.coursives, 'commandement').size !== 21) e.push(`${nom} : toutes les portes ne sont pas reliées par défaut`)
  const c = composantesDesPortes(avec.emplacements, avec.coursives)
  if ([...c.values()].some((s) => s.size !== 1)) e.push('une porte du thème d\'essai ne touche pas exactement une coursive : les coupes de dispositions.json ne sont plus des coupes d\'une salle')
  // 2. Les dispositions : chaque attendu recalculé
  const D = jeuT('dispositions.json')
  let nd = 0
  for (const cas of D.valides) { const { theme, disposition } = materialiser(essai, cas); const f = fautesDisposition(theme, disposition); if (f.length) e.push(`disposition valide « ${cas.nom} » : le calcul du juge y voit ${f[0]}`); else nd++ }
  for (const cas of D.refusees) { const { theme, disposition } = materialiser(essai, cas); const f = fautesDisposition(theme, disposition); if (!f.length) e.push(`disposition refusée « ${cas.nom} » : le calcul du juge ne lui voit aucune faute`); else nd++ }
  if (D.valides.length < 5 || D.refusees.length < 12) e.push('dispositions.json : 5 valides et 12 refusées au moins')
  for (const mot of ['deux salles', 'sans emplacement|n\'a pas d\'emplacement', 'réservée', 'reliée', 'tapis']) if (!D.refusees.some((x) => new RegExp(mot, 'i').test(x.raison))) e.push(`dispositions.json : aucune refusée pour « ${mot} »`)
  if (!D.refusees.some((x) => x.coursives?.vue === 'portrait' || x.themeCoupe?.vue === 'portrait')) e.push('dispositions.json : la grille portrait n\'est jamais coupée')
  // 3. Les réglages
  const V2 = jeuT('reglages-valides.json'), P2 = jeuT('reglages-pieges.json')
  let nr = 0
  for (const x of V2.cas) { const f = fautesReglages(copie(x.brut), essai); if (f.length) e.push(`réglages valides « ${x.nom} » : le calcul du juge y voit ${f[0]}`); else nr++ }
  for (const x of P2.pieges) {
    const brut = copie(x.brut); if (x.generer?.remplissage) brut.remplissage = 'x'.repeat(x.generer.remplissage)
    const f = fautesReglages(brut, essai)
    if (!f.length) e.push(`piège « ${x.nom} » : le calcul du juge ne lui voit aucune faute`); else nr++
  }
  for (const [mot, re] of [['une clé inconnue', /couleurs_fond|javascript/], ['une couleur red', /couleur|red/], ['un nom de 17 signes', /nom-de-17/], ['une plaque de 25 signes', /plaque-de-25/], ['un titre d\'un signe', /titre-d-un-signe/], ['un avatar hors liste', /avatar-hors-liste/], ['65 Ko', /65-ko/], ['du HTML', /texte-html/], ['une surcharge de :root', /surcharge-de-root/]]) if (!P2.pieges.some((x) => re.test(x.nom) || re.test(JSON.stringify(x.brut)))) e.push(`reglages-pieges.json : aucun piège pour ${mot}`)
  const graine = P2.pieges.find((x) => x.nom === '65-ko')
  if (!graine || !(graine.generer?.remplissage > 65536 - 100)) e.push('le piège « 65-ko » ne dépasse pas 64 Ko')
  const F = V2.defauts
  if (JSON.stringify(F.attendu) === JSON.stringify(F.defauts)) e.push('reglages-valides.json : la fusion attendue est celle des défauts (elle ne prouverait rien)')
  // 4. Les tickets d'essai (poste-extraction-qa, XT-3)
  const K = jeuT('tickets.json')
  if (K.tickets.filter((x) => ['ouvert', 'en_cours'].includes(x.statut)).length !== K.ouverts) e.push('tickets.json : « ouverts » ne correspond pas aux statuts des tickets')
  if (!K.tickets.every((x) => JSON.stringify(x).includes(K.sentinelle))) e.push('tickets.json : un ticket sans la sentinelle')
  if (/@(?!exemple\.invalid)|\b0[67]( ?\d\d){4}\b(?!.*fictif)/.test(JSON.stringify(K.tickets))) e.push('tickets.json : une adresse ou un numéro qui a l\'air réel')
  notes.push(`${nd} dispositions et ${nr} jeux de réglages recalculés`)
  // 5. Les pièges de thèmes et l'empreinte de la feuille brute
  const PT = jeuT('themes-pieges/pieges.json'), EF = jeuT('themes-pieges/empreintes-feuilles.json')
  for (const p of PT.pieges) {
    const d = path.join(T, 'themes-pieges', p.dossier)
    if (!fs.existsSync(path.join(d, 'theme.json'))) { e.push(`piège « ${p.dossier} » : theme.json absent`); continue }
    try { JSON.parse(fs.readFileSync(path.join(d, 'theme.json'), 'utf8')) } catch { e.push(`piège « ${p.dossier} » : theme.json illisible`) }
  }
  for (const c2 of ['sans-licence', 'atlas-800-ko', 'feuille-brute-de-pack', 'reservee-avec-un-poste']) if (!PT.pieges.some((x) => x.dossier.startsWith(c2.split('-').slice(0, 2).join('-')))) e.push(`themes-pieges : le piège « ${c2} » de la fiche manque`)
  const atlasBrut = fs.readFileSync(path.join(T, 'themes-pieges', 'feuille-brute-de-pack', 'atlas.png'))
  if (!Object.values(EF).some((v) => v === `${atlasBrut.length}:${sha256(atlasBrut)}`)) e.push('themes-pieges/empreintes-feuilles.json ne porte pas l\'empreinte de la feuille du piège « feuille-brute-de-pack »')
  const lourd = fs.statSync(path.join(T, 'themes-pieges', 'atlas-800-ko', 'atlas.png')).size
  if (lourd < 780_000 || lourd > 830_000) e.push(`le piège « atlas-800-ko » pèse ${lourd} octets (800 Ko attendus)`)
  // 6. Le témoin dérivé est à jour : la fabrique rejouée sous .orchestre/travail/ rend les mêmes octets
  const sortie = exigerSousTravail(path.join(TRAVAIL, 'juges-026-pilotage', `fabrique-t-${ctx.lot}`))
  fs.rmSync(sortie, { recursive: true, force: true })
  const r = ctx.lancerNode(['scripts/fixtures/026-pilotage/t/fabriquer-temoin.mjs', `--sortie=${rel(sortie)}`], { nom: 'fabriquer-temoin', timeout: 180_000 })
  if (r.code !== 0) e.push(`fabriquer-temoin.mjs --sortie : code ${r.code} (${court(r.sortie.trim().split('\n').pop(), 120)})`)
  else {
    let comparés = 0
    for (const f of [...listerFichiers(sortie)].sort()) {
      const chez = path.join(T, f)
      if (!fs.existsSync(chez)) { e.push(`${f} : fabriqué mais absent du dépôt (relancer fabriquer-temoin.mjs)`); continue }
      const a = fs.readFileSync(path.join(sortie, f)), b = fs.readFileSync(chez)
      // Un WebP dépend de la version de libwebp de sharp : son en-tête et son poids se jugent, ses octets non.
      if (f.endsWith('.webp') || f.endsWith('.webp.temoin')) {
        const lourd = f.includes('fond-trop-lourd')
        if (!(b.length > 0 && (lourd ? b.length > 200 * 1024 : b.length <= 200 * 1024) && b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP')) e.push(`${f} : pas un WebP ${lourd ? 'de plus de 200 Kio' : 'de 200 Kio au plus'}`)
        else comparés++
        continue
      }
      if (f.endsWith('fermeture-e2e.mjs.temoin')) { // l'autre sous-agent y ajoute des routes à la ligne « pilotage » : on compare le reste
        const sans = (t) => t.split('\n').filter((l) => !/^\s*'pilotage'\s*:/.test(l)).join('\n')
        if (sans(a.toString('utf8')) !== sans(b.toString('utf8'))) e.push(`${f} : diffère de la référence + la ligne de la CARTE hors de la ligne « pilotage »`)
        else comparés++
        continue
      }
      if (!a.equals(b)) e.push(`${f} : diffère de ce que fabriquer-temoin.mjs rend (relancer fabriquer-temoin.mjs)`)
      else comparés++
    }
    notes.push(`${comparés} fichiers dérivés (thèmes station et vaisseau, pièges, drapeau, LISEZMOI, carte) identiques à la fabrique`)
  }
  fs.rmSync(sortie, { recursive: true, force: true })
  return { echecs: e, detail: notes.join(' ; ') }
}

// ── JA-4 : aucun secret lu, aucun réseau hors de la boucle locale ─────────────────────────────────────────────────────────
const SOURCES = () => [path.join(R, 'scripts', 'station-themes-qa.mjs'), path.join(R, 'scripts', 'ecommerce-reservee-qa.mjs'), ...['outils', 'juge-modules', 'controles', 'lot', 'fabriquer-temoin'].map((n) => path.join(T, `${n}.mjs`))]
const HOTES_PERMIS = /^(?:127\.0\.0\.1|localhost|exemple\.invalid|.*\.exemple\.invalid|opengameart\.org)$/
const PIEGE = (journal) => String.raw`// Piège des lectures du lot t (JA-4 de 026-171), écrit par scripts/fixtures/026-pilotage/t/controles.mjs.
import fs from 'node:fs'
import fsp from 'node:fs/promises'
const RE = ${RE_CHEMIN_SECRET.toString()}
const J = ${JSON.stringify(journal)}
const vise = (p) => { try { return RE.test(String(p instanceof URL ? p.pathname : p).replace(/\\/g, '/')) } catch { return false } }
const noter = (quoi, p) => { try { fs.appendFileSync(J, process.pid + ' ' + quoi + ' ' + String(p) + '\n') } catch {} }
for (const [o, noms] of [[fs, ['readFileSync', 'openSync', 'existsSync', 'statSync', 'readFile', 'open', 'createReadStream']], [fsp, ['readFile', 'open']]]) {
  for (const n of noms) {
    const f = o[n]
    if (typeof f !== 'function') continue
    o[n] = function (p, ...a) {
      if (vise(p)) { noter(n, p); if (n === 'existsSync') return false; throw new Error('lecture refusée par le piège du lot t : ' + p) }
      return f.call(this, p, ...a)
    }
  }
}
if (typeof process.loadEnvFile === 'function') { process.loadEnvFile = function (p) { noter('loadEnvFile', p ?? '.env'); throw new Error('loadEnvFile refusé par le piège du lot t') } }
`
export async function controleSecrets(ctx) {
  const e = []
  const sources = SOURCES()
  for (const f of sources) {
    const src = fs.readFileSync(f, 'utf8')
    for (const l of lecturesDeSecrets(src)) e.push(`${rel(f)}${l.ligne ? `:${l.ligne}` : ''} lit un secret : ${l.quoi}`)
    for (const j of jetonsDans(src)) e.push(`${rel(f)}:${j.ligne} porte une clé réelle (${j.nom})`)
    const chaines = []
    sansCommentaires(src, chaines)
    for (const { texte } of chaines) for (const m of texte.matchAll(/\bhttps?:\/\/([^/\s:'"`$]+)/g)) if (!HOTES_PERMIS.test(m[1])) e.push(`${rel(f)} : l'adresse distante « ${m[0]} » (hors de 127.0.0.1)`)
  }
  const d = exigerSousTravail(path.join(TRAVAIL, 'juges-026-pilotage', `lectures-${ctx.lot}`))
  fs.rmSync(d, { recursive: true, force: true })
  fs.mkdirSync(path.join(d, 'leurres'), { recursive: true })
  const leurre = path.join(d, 'leurres', ['', 'env', 'local'].join('.'))
  fs.writeFileSync(leurre, 'LEURRE_TEMOIN=1\n')
  const journal = path.join(d, 'journal.log'), piege = path.join(d, 'piege-lectures.mjs')
  fs.writeFileSync(piege, PIEGE(journal))
  const env = { NODE_OPTIONS: `--import=${pathToFileURL(piege).href}` }
  const lu = () => { try { return fs.readFileSync(journal, 'utf8').trim() } catch { return '' } }
  const t = ctx.lancerNode(['-e', `const fs = require('node:fs'); let a = 'lu', b = 'lu'; try { fs.readFileSync(${JSON.stringify(leurre)}) } catch { a = 'refuse' } try { fs.readFileSync(${JSON.stringify(path.join(T, 'lot.mjs'))}) } catch { b = 'refuse' } console.log(a + ' ' + b)`], { nom: 'piege-lectures-temoin', env, timeout: 60_000 })
  if (t.stdout.trim().split(/\r?\n/).pop() !== 'refuse lu') e.push(`le piège des lectures ne refuse pas le leurre ou gêne une lecture ordinaire (« ${court(t.sortie, 80)} »)`)
  if (!lu().includes(leurre)) e.push('le piège des lectures ne consigne pas le leurre')
  fs.rmSync(journal, { force: true })
  for (const [nom, args] of [['modules', ['scripts/station-themes-qa.mjs', '--partie=modules', '--temoin']], ['theme', ['scripts/station-themes-qa.mjs', '--theme=vaisseau', '--temoin']], ['ecommerce', ['scripts/ecommerce-reservee-qa.mjs', '--temoin']]]) {
    const x = ctx.lancerNode(args, { nom: `lectures-${nom}`, env, timeout: 300_000 })
    if (x.code !== 0) e.push(`${args.slice(1).join(' ')} sous le piège des lectures : code ${x.code}, 0 attendu (« ${court(x.sortie.trim().split(/\r?\n/).filter((l) => l.startsWith('❌'))[0] ?? x.sortie.trim().split(/\r?\n/).pop(), 120)} »)`)
  }
  const jl = lu()
  if (jl) e.push(`lecture de secret consignée sous le piège : ${court(jl.split('\n')[0], 120)}`)
  return { echecs: e, detail: `${sources.length} sources lus (station-themes-qa, ecommerce-reservee-qa, outils, juge-modules, controles, lot, fabriquer-temoin) : aucune lecture de .env.local ni de presti-secrets, aucune clé réelle, aucune adresse distante hors liste ; piège des lectures prouvé sur un leurre, puis les trois juges en témoin dessous : rien consigné` }
}

// ── JA-6 : chaque juge refuse un appel invalide en code 2 ────────────────────────────────────────────────────────────────
export async function controleAppels(ctx) {
  const e = []
  const cas = [
    ['scripts/station-themes-qa.mjs', []], ['scripts/station-themes-qa.mjs', ['--partie=zzz']], ['scripts/station-themes-qa.mjs', ['--theme=essai']],
    ['scripts/station-themes-qa.mjs', ['--partie=modules', '--theme=station']], ['scripts/station-themes-qa.mjs', ['--partie=modules', '--bogus']],
    ['scripts/ecommerce-reservee-qa.mjs', ['--bogus']], ['scripts/ecommerce-reservee-qa.mjs', ['--base=;rm']], ['scripts/ecommerce-reservee-qa.mjs', ['inattendu']],
  ]
  for (const [script, args] of cas) {
    const r = ctx.lancerNode([script, ...args], { nom: `appel-${path.basename(script, '.mjs')}-${args.join('-').replace(/[^\w-]+/g, '') || 'vide'}`, timeout: 60_000 })
    if (r.code !== 2 || !/appel refusé/.test(r.sortie)) e.push(`${path.basename(script)} ${args.join(' ') || '(sans argument)'} : code ${r.code}, « appel refusé » en code 2 attendu`)
  }
  return { echecs: e, detail: `${cas.length} appels invalides refusés en code 2 (aucune option, --partie inconnue, --theme=essai, --partie avec --theme, option inconnue, --base douteuse, argument positionnel)` }
}
