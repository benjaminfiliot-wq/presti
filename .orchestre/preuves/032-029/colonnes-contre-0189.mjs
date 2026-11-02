// 032-029 — chaque colonne lue (select= des nœuds HTTP, et la table du nœud Supabase) confrontée aux droits de 0189_role_lecture_n8n.sql.
import fs from 'node:fs'
const sql = fs.readFileSync('supabase/migrations/0189_role_lecture_n8n.sql', 'utf8')
const droits = {}
for (const m of sql.matchAll(/grant select \(([^)]+)\) on public\.(\w+) to n8n_lecture/g)) droits[m[2]] = new Set(m[1].split(',').map((s) => s.trim()))
const exports = {
  'presti-suivi-artisan': '.orchestre/preuves/032-014/presti-suivi-artisan.workflow.json',
  'presti-briefing-matin': '.orchestre/preuves/032-013/presti-briefing-matin.workflow.json',
  'presti-detecteurs': '.orchestre/preuves/032-019/presti-detecteurs.workflow.json',
}
let ecarts = 0
for (const [nom, f] of Object.entries(exports)) {
  let w = JSON.parse(fs.readFileSync(f, 'utf8')); w = w.workflow || w
  console.log('## ' + nom)
  for (const n of w.nodes) {
    if (n.type === 'n8n-nodes-base.httpRequest') {
      const table = n.parameters.url.split('/rest/v1/')[1]
      const sel = n.parameters.queryParameters.parameters.find((p) => p.name === 'select').value.split(',')
      const hors = droits[table] ? sel.filter((c) => !droits[table].has(c)) : sel
      if (hors.length) ecarts++
      console.log(`${hors.length ? 'ÉCART' : 'ok   '} ${n.name} → ${table}(${sel.join(',')})${hors.length ? '  hors 0189 : ' + (droits[table] ? hors.join(',') : 'TABLE ABSENTE DE 0189') : ''}`)
    } else if (n.type === 'n8n-nodes-base.supabase') {
      const t = n.parameters.tableId
      console.log(`info  ${n.name} → nœud Supabase, table ${t}, toutes colonnes (${droits[t] ? 'table dans 0189 : ' + [...droits[t]].join(',') : 'TABLE ABSENTE DE 0189'}) ; limit=${n.parameters.limit}`)
    }
  }
}
console.log('écarts :', ecarts)
