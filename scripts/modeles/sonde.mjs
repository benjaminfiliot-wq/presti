#!/usr/bin/env node
// scripts/modeles/sonde.mjs — la SONDE RÉELLE des IA de l'écosystème (08/10/2026).
//
//   node scripts/modeles/sonde.mjs [--tous | --id=<id>[,<id>…]] [--usine] [--json] [--forcer] [--sans-fichier]
//
// Pour CHAQUE entrée du registre (scripts/modeles/registre.mjs), dans chaque lieu où elle doit répondre, fait un VRAI appel minimal (« Réponds
// uniquement le mot OK »), mesure la latence et rend un tableau :
//   OK           déclarée branchée dans ce lieu ET l'appel a répondu
//   KO           déclarée branchée dans ce lieu et l'appel n'a pas répondu (raison : quota, clé absente, injoignable…)  → exit 1
//   NON BRANCHÉ  pas d'adaptateur vérifié dans les agents (la raison écrite du registre) ; l'appel réel est fait quand une sonde existe, et dit
//                seulement si l'IA répondrait. Jamais « OK » par défaut.
//   NON SONDÉ    pas appelée dans cette exécution (les IA de l'usine sans --usine ; un modèle local pendant un cycle du chef sans --forcer)
// --usine : exécute aussi la sonde SUR l'usine par ssh (freellmapi, Ollama, Hermes, OpenClaw, Codex sous chef-modele, clés de l'usine) : les trois
//           petits fichiers du dossier sont envoyés par tar dans un dossier jetable, lancés par node, puis effacés.
// Les clés sont lues à l'instant de l'appel (coffre du PC, fichiers 600 de l'usine par sudo) et ne sont jamais écrites, affichées ni journalisées :
// chaque texte qui sort passe par `assainir`. Le rapport JSON est écrit dans .orchestre/travail/modeles/ (hors dépôt).
// Codes : 0 aucun KO ; 1 au moins un KO (ou registre défectueux) ; 2 usage.
// Un modèle local de l'usine charge 1 à 5 Go en mémoire : la sonde refuse de les appeler de H:05 à H:20 UTC (cycle du chef) sans --forcer.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { REGISTRE, defautsDuRegistre, trouver, estBranche } from './registre.mjs'
import { appeler, etatFinal, assainir } from './adaptateurs.mjs'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const RACINE = path.resolve(ICI, '..', '..')
const MARQUE = '@@SONDE@@'

/** Un cycle du chef tourne-t-il (H:05 à H:20 UTC) ? Pure. */
export function pendantUnCycle(date = new Date()) { const m = date.getUTCMinutes(); return m >= 5 && m < 20 }
const estLocalUsine = (e, lieu) => lieu === 'usine' && e.acces === 'ollama' && !/cloud/i.test(e.modele)

/**
 * Sonde les entrées demandées. `lieux` : où appeler pour de vrai dans CETTE exécution. Rend une ligne par (entrée, lieu).
 * `appelFn` et `deps` sont remplaçables (le juge y met des doublures).
 */
export async function sonder({ registre = REGISTRE, ids = null, lieux = ['pc'], deps = {}, appelFn = appeler, maintenant = () => new Date(), forcer = false, surLigne = null } = {}) {
  const lignes = []
  for (const e of registre) {
    if (ids && !ids.includes(e.id)) continue
    for (const lieu of e.lieux) {
      const base = { id: e.id, lieu, modele: e.modele, declare_branche: estBranche(e, lieu) }
      let ligne
      if (!lieux.includes(lieu)) ligne = { ...base, etat: 'NON_SONDE', detail: lieu === 'usine' ? 'IA de l\'usine : lancer avec --usine' : 'hors de cette exécution' }
      else if (estLocalUsine(e, lieu) && pendantUnCycle(maintenant()) && !forcer) ligne = { ...base, etat: 'NON_SONDE', detail: 'un cycle du chef tourne (H:05 à H:20 UTC) : un modèle local ne se charge pas à ce moment-là (--forcer pour passer outre)' }
      else {
        let a
        try { a = await appelFn(e, lieu, { ...deps }) } catch (err) { a = { etat: 'KO', ms: 0, raison: 'erreur', detail: assainir(err?.message ?? err, [], 160) } }
        const f = etatFinal(e, lieu, a)
        ligne = { ...base, etat: f.etat, ms: a.ms ?? 0, raison: f.etat === 'KO' ? a.raison : (f.etat === 'NON_BRANCHE' ? undefined : undefined), detail: f.etat === 'NON_BRANCHE'
          ? `${f.appel ? `appel réel : ${f.appel.etat}${f.appel.etat === 'KO' ? ` (${f.appel.raison}${f.appel.detail ? ` : ${f.appel.detail}` : ''})` : f.appel.detail ? ` (${f.appel.detail})` : ''}` : 'aucun appel possible'} | non branché : ${f.raison}`
          : (a.etat === 'KO' ? `${a.raison}${a.detail ? ` : ${a.detail}` : ''}` : a.detail), ...(typeof a.depense_usd === 'number' ? { depense_usd: a.depense_usd } : {}) }
      }
      lignes.push(ligne)
      surLigne?.(ligne)
    }
  }
  return lignes
}

/** Le code de sortie : 1 si une IA déclarée branchée n'a pas répondu. Pure. */
export const codeSortie = (lignes) => (lignes.some((l) => l.etat === 'KO') ? 1 : 0)

// ── présentation ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const LIBELLE = { OK: 'OK', KO: 'KO', NON_BRANCHE: 'NON BRANCHÉ', NON_SONDE: 'NON SONDÉ' }
export function tableau(lignes) {
  const rows = lignes.map((l) => [l.id, l.lieu, LIBELLE[l.etat] ?? l.etat, l.ms ? `${l.ms} ms` : '', assainir(l.detail ?? '', [], 200)])
  const tete = ['IA', 'lieu', 'état', 'latence', 'détail']
  const larg = tete.map((t, i) => Math.max(t.length, ...rows.map((r) => String(r[i]).length), 0)).map((w, i) => (i === 4 ? 0 : w))
  const fmt = (r) => r.map((c, i) => (i === 4 ? String(c) : String(c).padEnd(larg[i]))).join('  ').trimEnd()
  return [fmt(tete), fmt(larg.map((w, i) => (i === 4 ? '------' : '-'.repeat(w)))), ...rows.map(fmt)].join('\n')
}
export function resume(lignes) {
  const n = (e) => lignes.filter((l) => l.etat === e).length
  const depense = lignes.reduce((s, l) => s + (l.depense_usd ?? 0), 0)
  return `${n('OK')} OK · ${n('KO')} KO · ${n('NON_BRANCHE')} non branché(s) · ${n('NON_SONDE')} non sondé(s) · dépense de la sonde (Haiku) : ${depense.toFixed(6)} $`
}

// ── la sonde sur l'usine ────────────────────────────────────────────────────────────────────────────────────────────────────────────
function sondeSurUsine({ ids, forcer }) {
  const hote = process.env.PRESTI_SONDE_HOTE || 'gardien@88.96.53.3'
  const cle = process.env.PRESTI_SONDE_CLE_SSH || path.join(os.homedir(), '.ssh', 'presti-usine-gardien')
  const ssh = process.env.PRESTI_SSH_BIN || 'ssh'
  if (!process.env.PRESTI_SSH_BIN && !fs.existsSync(cle)) return Promise.resolve({ erreur: `clé ssh ${cle} absente` })
  const options = ['--sur-usine', '--json', ...(ids ? [`--id=${ids.join(',')}`] : []), ...(forcer ? ['--forcer'] : [])]
  const commande = `D=$(mktemp -d) && tar -x -C "$D" && node "$D/modeles/sonde.mjs" ${options.join(' ')}; rc=$?; rm -rf "$D"; exit $rc`
  return new Promise((resoudre) => {
    const tar = spawn('tar', ['-cf', '-', '-C', path.join(RACINE, 'scripts'), 'modeles/registre.mjs', 'modeles/adaptateurs.mjs', 'modeles/sonde.mjs'], { stdio: ['ignore', 'pipe', 'inherit'], windowsHide: true })
    const enfant = spawn(ssh, ['-i', cle, '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20', hote, commande], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true })
    tar.stdout.pipe(enfant.stdin)
    enfant.stdin.on('error', () => { /* ssh sorti avant la fin du tar */ })
    const sortie = [], erreur = []
    enfant.stdout.on('data', (d) => sortie.push(d))
    enfant.stderr.on('data', (d) => erreur.push(d))
    const minuteur = setTimeout(() => { try { enfant.kill() } catch { /* fini */ } }, 45 * 60_000)
    enfant.on('error', (e) => { clearTimeout(minuteur); resoudre({ erreur: `ssh ne se lance pas : ${e.code ?? e.message}` }) })
    enfant.on('close', (code) => {
      clearTimeout(minuteur)
      const texte = Buffer.concat(sortie).toString('utf8')
      const l = texte.split('\n').find((x) => x.startsWith(MARQUE))
      if (!l) return resoudre({ erreur: code === 255 ? 'usine injoignable (ssh, code 255 ; l\'IP est éphémère : PRESTI_SONDE_HOTE=gardien@<ip>)' : `la sonde de l'usine n'a rien rendu (code ${code}) ${assainir(Buffer.concat(erreur).toString('utf8'), [], 200)}` })
      try { resoudre({ lignes: JSON.parse(l.slice(MARQUE.length)) }) } catch { resoudre({ erreur: 'sortie de l\'usine illisible' }) }
    })
  })
}

// ── la ligne de commande ────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function principal() {
  const args = process.argv.slice(2)
  const connus = ['--tous', '--usine', '--json', '--forcer', '--sans-fichier', '--sur-usine']
  for (const a of args) if (!connus.includes(a) && !a.startsWith('--id=')) { console.error(`✗ option inconnue : ${a}\n  usage : node scripts/modeles/sonde.mjs [--tous | --id=<id>[,<id>…]] [--usine] [--json] [--forcer]`); return 2 }
  const surUsine = args.includes('--sur-usine')
  const ids = (args.find((a) => a.startsWith('--id=')) ?? '').slice(5).split(',').filter(Boolean)
  const filtre = ids.length ? ids : null
  const forcer = args.includes('--forcer')
  const defauts = defautsDuRegistre()
  if (defauts.length) { console.error(`✗ registre défectueux (aucun appel fait) :\n  - ${defauts.join('\n  - ')}`); return 1 }
  for (const id of filtre ?? []) if (!trouver(id)) { console.error(`✗ id inconnu : ${id}`); return 2 }

  if (surUsine) { // lancée par ssh : seulement les IA de l'usine, le résultat en une ligne marquée
    const lignes = await sonder({ ids: filtre, lieux: ['usine'], forcer, deps: { racine: RACINE } })
    process.stdout.write(`${MARQUE}${JSON.stringify(lignes.filter((l) => l.lieu === 'usine'))}\n`)
    process.exitCode = 0
    return 0
  }

  const vivant = args.includes('--json') ? null : (l) => process.stderr.write(`  · ${l.id}@${l.lieu} ${LIBELLE[l.etat]}${l.ms ? ` ${l.ms} ms` : ''}\n`)
  let lignes = await sonder({ ids: filtre, lieux: ['pc'], forcer, deps: { racine: RACINE }, surLigne: vivant })
  if (args.includes('--usine')) {
    if (!args.includes('--json')) process.stderr.write('  · sonde de l\'usine par ssh (les modèles locaux se chargent un à un : plusieurs minutes)…\n')
    const u = await sondeSurUsine({ ids: filtre, forcer })
    if (u.erreur) {
      lignes = lignes.map((l) => (l.lieu === 'usine' ? { ...l, etat: l.declare_branche ? 'KO' : l.etat, raison: 'injoignable', detail: u.erreur } : l))
    } else {
      const parCle = new Map(u.lignes.map((l) => [`${l.id}@${l.lieu}`, l]))
      lignes = lignes.map((l) => parCle.get(`${l.id}@${l.lieu}`) ?? l)
    }
  }
  // le rapport (hors dépôt) : pour les agents qui voudraient écarter un modèle relevé KO (choisirModeles({ etat }))
  if (!args.includes('--sans-fichier')) {
    try {
      const dossier = path.join(RACINE, '.orchestre', 'travail', 'modeles')
      fs.mkdirSync(dossier, { recursive: true })
      const rapport = JSON.stringify({ le: new Date().toISOString(), lignes }, null, 2)
      fs.writeFileSync(path.join(dossier, `sonde-${new Date().toISOString().replace(/[:.]/g, '-')}.json`), rapport)
      fs.writeFileSync(path.join(dossier, 'derniere-sonde.json'), rapport)
    } catch { /* le rapport est facultatif */ }
  }
  if (args.includes('--json')) console.log(JSON.stringify({ lignes, resume: resume(lignes) }, null, 2))
  else console.log(`\n${tableau(lignes)}\n\n${resume(lignes)}`)
  return codeSortie(lignes)
}

const estPrincipal = !!process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (estPrincipal) principal().then((c) => { process.exitCode = c }, (e) => { console.error(`✗ sonde : erreur inattendue (${e?.code ?? 'sans code'})`); process.exitCode = 1 })
