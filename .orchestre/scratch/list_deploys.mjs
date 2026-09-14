import fs from 'node:fs'

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .filter(l => l.includes('='))
    .map(l => {
      const idx = l.indexOf('=')
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '')]
    })
)

const PROJET = 'prj_ysYhXsHolWZFCm9wTy0tSUTwer1I'
const EQUIPE = 'team_zSGgrVm4OVimzxeOtYhaAPd0'
const jeton = env.VERCEL_TOKEN

const r = await fetch(`https://api.vercel.com/v6/deployments?projectId=${PROJET}&teamId=${EQUIPE}&limit=10`, {
  headers: { Authorization: `Bearer ${jeton}` }
})
const data = await r.json()
for (const d of data.deployments || []) {
  console.log(d.meta?.githubCommitSha?.slice(0, 7), d.state, d.url, d.meta?.githubCommitMessage?.slice(0, 50))
}
