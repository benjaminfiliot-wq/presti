#!/usr/bin/env node
// Bloc <lecons_validees> à la fin d'une entrée d'agent (fiche 026-236, contrat de 026-234). Lancé par :
//   node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/savoir/lecons-entree.mjs --agent=<nom>
//        --entree=<fichier> [--dossier=docs/savoir/lecons] [--reglages=docs/savoir/reglages.json]
// Interrupteur `lecons_dans_consignes` éteint → rien, code 0. Allumé → le bloc <lecons_validees> de l'agent à la fin de
// l'entrée (remplacé s'il y est déjà), par un fichier .part puis un renommage. Agent inconnu → code 2.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const args = process.argv.slice(2)
const option = (nom) => { const a = args.find((x) => x.startsWith(`--${nom}=`)); return a ? a.slice(nom.length + 3) : null }

function allume(fichier) {
  try { return JSON.parse(fs.readFileSync(fichier, 'utf8'))?.interrupteurs?.lecons_dans_consignes?.actif === true } catch { return false }
}

async function principal() {
  const agent = option('agent')
  const entree = option('entree')
  if (!agent || !entree) { console.error('✗ --agent=<nom> et --entree=<fichier> sont requis'); return 2 }
  const M = await import(pathToFileURL(path.join(RACINE, 'lib', 'agents', 'lecons.ts')).href)
  if (!Object.hasOwn(M.LECONS_DE, agent)) { console.error(`✗ agent inconnu de LECONS_DE : ${agent}`); return 2 }
  const reglages = path.resolve(option('reglages') || path.join(RACINE, 'docs', 'savoir', 'reglages.json'))
  if (!allume(reglages)) { console.log('leçons éteintes : entrée inchangée'); return 0 }
  const dossier = path.resolve(option('dossier') || path.join(RACINE, 'docs', 'savoir', 'lecons'))
  const texte = fs.readFileSync(entree, 'utf8')
  const lignes = texte.split('\n')
  let debut = -1
  for (let i = lignes.length - 1; i >= 0; i--) if (lignes[i].replace(/\r$/, '') === '<lecons_validees>') { debut = i; break }
  const base = (debut >= 0 ? lignes.slice(0, debut).join('\n') : texte).replace(/\s+$/, '')
  const choisies = M.leconsPour(agent, M.lireLecons(dossier).lecons)
  if (!choisies.length && debut < 0) { console.log('aucune leçon pour cet agent : entrée inchangée'); return 0 }
  const nouveau = `${M.consigneAvecLecons(base, choisies)}\n`
  const part = `${entree}.part`
  fs.writeFileSync(part, nouveau)
  fs.renameSync(part, entree)
  console.log(`✓ ${choisies.length} leçon(s) dans l'entrée de ${agent}`)
  return 0
}

principal().then((code) => { process.exitCode = code }).catch((e) => { console.error(`✗ ${e?.message || e}`); process.exitCode = 1 })
