#!/usr/bin/env node
// Faux juge du mini-dépôt d'essai du méta-juge (026-001) : deux critères, XQ-1 (plafond) et XQ-2 (signe).
// Il lit aussi public/marque.txt : dans une copie du méta-juge, public/ est une jonction, et un juge qui ne la trouve pas
// sort en code 2 (la copie intacte doit être en code 0).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { plafond, signe } from '../lib/module.mjs'

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
if (!fs.existsSync(path.join(R, 'public', 'marque.txt'))) { console.log('ERREUR x-qa — public/marque.txt introuvable'); process.exit(2) }

const echecs = []
const juger = (critere, ok, detail) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${critere} — ${detail}`); if (!ok) echecs.push(critere) }
const a = plafond(15), b = plafond(-5), c = plafond(3)
juger('XQ-1', a === 10 && b === 0 && c === 3, `plafond(15)=${a}, plafond(-5)=${b}, plafond(3)=${c} (attendu 10, 0, 3)`)
const s = signe(-3), z = signe(0)
juger('XQ-2', s === -1 && z === 1, `signe(-3)=${s}, signe(0)=${z} (attendu -1, 1)`)
console.log(`x-qa : ${echecs.length ? `FAIL — ${echecs.join(', ')}` : 'PASS'}`)
process.exit(echecs.length ? 1 : 0)
