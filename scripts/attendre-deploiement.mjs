// Attend que le commit LOCAL soit réellement en ligne (v4 §0).
//
// Pourquoi ce script existe : sonder « le dernier déploiement » ment. Juste après un push,
// Vercel n'a pas encore créé le déploiement — le dernier est celui d'AVANT, déjà READY.
// J'ai vérifié une fois du code qui n'était pas déployé et conclu à tort qu'il ne marchait pas.
// On attend donc le déploiement dont le SHA est exactement celui de HEAD.
// Usage : node scripts/attendre-deploiement.mjs

import fs from 'node:fs'
import { execSync } from 'node:child_process'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}

const PROJET = 'prj_ysYhXsHolWZFCm9wTy0tSUTwer1I'
const EQUIPE = 'team_zSGgrVm4OVimzxeOtYhaAPd0'
const sha = execSync('git rev-parse HEAD').toString().trim()
const jeton = process.env.VERCEL_TOKEN
const limite = Date.now() + 12 * 60 * 1000

console.log(`⏳ attente du déploiement de ${sha.slice(0, 7)}`)

while (Date.now() < limite) {
  // La production seulement : le même commit poussé sur une branche de sauvegarde (nuit-0311) a son propre aperçu, souvent READY avant
  // la production. Le 03/11, ce script l'a pris pour la production et a dit « en ligne » pendant que la production compilait encore.
  const r = await fetch(`https://api.vercel.com/v6/deployments?projectId=${PROJET}&teamId=${EQUIPE}&target=production&limit=5`, { headers: { Authorization: `Bearer ${jeton}` } })
  const deps = (await r.json()).deployments ?? []
  const d = deps.find((x) => x.meta?.githubCommitSha === sha && x.target === 'production')
  if (!d) { process.stdout.write('.'); await new Promise((s) => setTimeout(s, 10000)); continue }
  process.stdout.write(` ${d.state}`)
  if (d.state === 'READY') { console.log(`\n✅ ${sha.slice(0, 7)} est en ligne`); process.exit(0) }
  if (d.state === 'ERROR' || d.state === 'CANCELED') { console.log(`\n❌ déploiement ${d.state.toLowerCase()} — https://${d.url}`); process.exit(1) }
  await new Promise((s) => setTimeout(s, 12000))
}
console.log('\n❌ délai dépassé : le commit n’est pas en ligne')
process.exit(1)
