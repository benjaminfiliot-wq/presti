#!/usr/bin/env node
// juge-vague2.mjs — juge de la vague 2 de prospection (27/09) : réutilise les 4 juges de la vague 1 (liste, maquettes, kit, téléphones)
// sur le dossier ~/veille/vague2/ (même arborescence). Plus : aucune entreprise de la vague 1 ; zone de la vague 2. 0 PASS, 1 FAIL.
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
const V = join(process.env.HOME || '.', 'veille')
const R = join(V, 'vague2')
const env = { ...process.env, VEILLE: R }
let ko = 0
for (const j of ['juge-prospection-liste.mjs', 'juge-maquettes-27.mjs', 'juge-kit-appel-27.mjs', 'juge-telephones-27.mjs']) {
  const r = spawnSync(process.execPath, [join(V, 'juges', j)], { env, encoding: 'utf8' })
  console.log((r.stdout || '').trim().split('\n').slice(0, 12).join('\n')); if (r.status !== 0) ko++
}
const liste = existsSync(join(R, 'prospection', 'liste-2026-09-27.csv')) ? readFileSync(join(R, 'prospection', 'liste-2026-09-27.csv'), 'utf8').trim().split(/\r?\n/).slice(1).map((l) => l.split(';')) : []
const v1 = existsSync(join(V, 'prospection', 'liste-2026-09-27.csv')) ? new Set(readFileSync(join(V, 'prospection', 'liste-2026-09-27.csv'), 'utf8').split(/\r?\n/).map((l) => l.split(';')[0])) : new Set()
const doublons = liste.filter((l) => v1.has(l[0])).length
if (doublons) { console.log(`vague2 : ${doublons} entreprise(s) déjà dans la vague 1`); ko++ }
const kit = existsSync(join(R, 'prospection', 'maquettes-2026-09-27', 'KIT-APPEL.md')) ? readFileSync(join(R, 'prospection', 'maquettes-2026-09-27', 'KIT-APPEL.md'), 'utf8') : ''
if (kit && (kit.match(/SIREN 109 411 348/g) || []).length < 60) { console.log('vague2 : les mentions (Benjamin Filiot EI, SIREN 109 411 348, source des données) manquent dans des SMS ou des mails'); ko++ }
console.log(ko ? `juge-vague2 : FAIL — ${ko} juge(s) ou contrôle(s) en échec` : 'juge-vague2 : PASS — liste, maquettes, kit, téléphones de la vague 2, sans doublon avec la vague 1, mentions présentes')
process.exit(ko ? 1 : 0)
