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

const r = await fetch(`https://api.vercel.com/v6/deployments?projectId=${PROJET}&teamId=${EQUIPE}&limit=1`, {
  headers: { Authorization: `Bearer ${jeton}` }
})
const data = await r.json()
const depId = data.deployments?.[0]?.uid
console.log('Dep ID:', depId)

const rEvents = await fetch(`https://api.vercel.com/v2/deployments/${depId}/events?teamId=${EQUIPE}`, {
  headers: { Authorization: `Bearer ${jeton}` }
})
const events = await rEvents.json()
for (const e of events) {
  if (e.type === 'command' || e.type === 'stderr' || e.payload?.text?.includes('Error') || e.payload?.text?.includes('Failed')) {
    console.log(e.payload?.text)
  }
}
