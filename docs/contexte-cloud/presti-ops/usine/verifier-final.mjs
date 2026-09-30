#!/usr/bin/env node
// verifier-final.mjs <id> — la vérification FINALE d'une fiche (celle que le PC rejoue après le travail d'un exécutant) : d'abord SUR L'USINE
// (verifier-usine.mjs, verdict « machine: usine »), puis, seulement si l'usine ne peut pas juger (code 3 : secrets, --reel, usine muette,
// HEAD non poussé, échec qui parle de fichiers absents du bac), sur le PC (`node scripts/orchestre.mjs verifier <id>`, comme avant).
// Rend le code et la sortie de celui qui a jugé : 0 PASS, 1 FAIL — les appelants (moteur, usine.mjs recuperer) lisent « <id> : PASS|FAIL ».
// PRESTI_VERIFIER_PC=1 : PC seul. PRESTI_RACINE : banc d'essai. Fin par process.exitCode (Node 24 sous Windows).
import path from 'node:path'
import fs from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const R = path.resolve(process.env.PRESTI_RACINE || 'C:/Users/benja/Documents/presti')
const id = process.argv[2] || ''
const lancer = (script, args, minutes) => spawnSync(process.execPath, [script, ...args], { cwd: R, encoding: 'utf8', windowsHide: true, timeout: minutes * 60_000, maxBuffer: 1 << 28 })
const dire = (r) => { process.stdout.write(`${r.stdout || ''}`); process.stderr.write(`${r.stderr || ''}`) }
if (!/^(?:\d{3}-[\w-]+|dem-[0-9a-f]{8})$/.test(id)) { console.error('usage : node verifier-final.mjs <id>'); process.exitCode = 2 }
else {
  const usine = path.join(ICI, 'verifier-usine.mjs')
  let jugee = false
  if (process.env.PRESTI_VERIFIER_PC !== '1' && fs.existsSync(usine)) {
    const u = lancer(usine, [id], 60)
    if (u.status === 0 || u.status === 1) { dire(u); process.exitCode = u.status; jugee = true }
    else { console.log(`· ${id} : l'usine ne juge pas (code ${u.status ?? 'délai'}) → verifier sur le PC — ${(`${u.stdout || ''}${u.stderr || ''}`.trim().split('\n').pop() || '').slice(0, 220)}`) }
  }
  if (!jugee) {
    const p = lancer(path.join(R, 'scripts', 'orchestre.mjs'), ['verifier', id], 45)
    dire(p); process.exitCode = p.status ?? 1
  }
}
