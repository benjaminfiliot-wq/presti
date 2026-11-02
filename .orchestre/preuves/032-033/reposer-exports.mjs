// Tâche 032-033 : repose les exports des six workflows (et de presti-erreurs) à partir des réponses du MCP get_workflow_details
// enregistrées par le harnais (journal de session, ou fichier tool-results quand la réponse dépasse la limite), sans retouche du
// contenu : seules `scopes` (droits de l'utilisateur du MCP, pas le workflow) est ôtée, `exporte_le` et `source` ajoutées.
// Compare nodes et connections (sha256) à l'export d'avant : ils doivent être identiques ; seuls settings et updatedAt changent.
import fs from 'node:fs'
import crypto from 'node:crypto'
const [journal, ...fichiers] = process.argv.slice(2)
const CIBLES = {
  '2HsfV00lGSX1KGY1': '.orchestre/preuves/032-014/presti-suivi-artisan.workflow.json',
  'xPIDCvkp8Gk08A2E': '.orchestre/preuves/032-013/presti-briefing-matin.workflow.json',
  'J8pduyxn9seR8Z9t': '.orchestre/preuves/032-019/presti-detecteurs.workflow.json',
  '16Gbnw1jg1JmFbfV': '.orchestre/preuves/032-023/presti-sauvegarde.workflow.json',
  '2uovL6sfTnINC3ka': '.orchestre/preuves/032-023/presti-garde-sauvegarde.workflow.json',
  '4R2wS9374GUxb63F': '.orchestre/preuves/032-026/presti-demande-demo.workflow.json',
  'AQeHiC58UgbMR4Kr': '.orchestre/preuves/032-033/presti-erreurs.workflow.json',
}
const vus = {}
const prendre = (texte, origine) => {
  let j; try { j = JSON.parse(texte) } catch { return }
  const w = j && j.workflow
  if (w && CIBLES[w.id] && Array.isArray(w.nodes) && w.scopes) vus[w.id] = { w, origine } // la dernière réponse l'emporte
}
for (const ligne of fs.readFileSync(journal, 'utf8').split('\n')) {
  if (!ligne.includes('get_workflow_details') && !ligne.includes('"workflow"')) continue
  let e; try { e = JSON.parse(ligne) } catch { continue }
  const contenu = e?.message?.content
  if (!Array.isArray(contenu)) continue
  for (const c of contenu) if (c.type === 'tool_result') {
    const parts = Array.isArray(c.content) ? c.content : [{ type: 'text', text: c.content }]
    for (const p of parts) if (p && p.type === 'text' && typeof p.text === 'string') prendre(p.text, 'journal du harnais')
  }
}
for (const f of fichiers) prendre(fs.readFileSync(f, 'utf8'), 'fichier tool-results du harnais')
const sha = (o) => crypto.createHash('sha256').update(JSON.stringify(o)).digest('hex')
const maintenant = new Date().toISOString()
let ko = 0
for (const [id, cible] of Object.entries(CIBLES)) {
  const v = vus[id]
  if (!v) { console.log('ABSENT', id); ko++; continue }
  const { scopes, ...w } = v.w
  const avant = fs.existsSync(cible) ? JSON.parse(fs.readFileSync(cible, 'utf8')) : null
  const aw = avant && (avant.workflow || avant)
  if (aw) {
    const n = sha(w.nodes) === sha(aw.nodes), c = sha(w.connections) === sha(aw.connections), vi = w.versionId === aw.versionId
    console.log(`${w.name} : nodes ${n ? 'identiques' : 'DIFFÉRENTS'} (sha ${sha(w.nodes).slice(0, 12)}), connections ${c ? 'identiques' : 'DIFFÉRENTES'}, versionId ${vi ? 'inchangé' : 'CHANGÉ'} ${w.versionId}`)
    console.log(`   settings avant : ${JSON.stringify(aw.settings)}`)
    console.log(`   settings après : ${JSON.stringify(w.settings)}`)
    if (!n || !c) ko++
  } else console.log(`${w.name} : nouvel export, versionId ${w.versionId}, settings ${JSON.stringify(w.settings)}`)
  if (w.active !== false || w.activeVersionId !== null) { console.log('   ACTIF OU PUBLIÉ'); ko++ }
  const sortie = { ...w, exporte_le: maintenant, source: `MCP n8n-oracle get_workflow_details (tâche 032-033), réponse enregistrée par le harnais (${v.origine}) puis recopiée par node, sans retouche ; « scopes » (droits de l'utilisateur du MCP) ôté` }
  fs.writeFileSync(cible, JSON.stringify(sortie, null, 2) + '\n')
}
process.exit(ko ? 1 : 0)
