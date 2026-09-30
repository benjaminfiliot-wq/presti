import fs from 'node:fs'
import cp from 'node:child_process'
const fichier='docs/agents/recette-entrant-2026-09-27.md'
const original=fs.readFileSync(fichier,'utf8')
const bloc=original.match(/```json recette-entrant\n([\s\S]*?)\n```/)
const base=JSON.parse(bloc[1])
const cas=[
 ['EN-3','case précochée',j=>j.etapes[0].consentement.precoche=true],
 ['EN-4','texte retouché après accord',j=>j.etapes[1].texte+=' retouche'],
 ['EN-5','accord expiré',j=>j.etapes[2].expire_le='2026-09-27T09:02:00.000Z'],
 ['EN-6','premier accord réutilisé',j=>j.etapes[7].id_accord=j.etapes[2].id_accord],
 ['EN-9','relance après opposition',j=>j.etapes[9].relances=1],
 ['EN-8','froid ouvert avant le jalon',j=>j.froid_ouvert=true],
 ['EN-10','préparation via cloud',j=>j.etapes[1].modele.fournisseur='ollama-cloud'],
 ['EN-11','simulation annoncée prouvée',j=>j.etapes[3].etat='prouvé']
]
let echecs=0
try {
 for(const [critere,nom,muter] of cas){
  const j=structuredClone(base);muter(j)
  fs.writeFileSync(fichier,original.replace(bloc[1],JSON.stringify(j,null,2)))
  const r=cp.spawnSync(process.execPath,['scripts/juges-026-completude-qa.mjs','--partie=entrant'],{encoding:'utf8'})
  const sortie=(r.stdout||'')+(r.stderr||'')
  const attendu=r.status===1 && sortie.split('\n').some(l=>l.includes(critere)&&/FAIL|✗|rouge/i.test(l))
  console.log(`CAS ${nom} ; critère ${critere} ; exit_code=${r.status} ; rejet_attendu=${attendu}`)
  console.log(sortie)
  if(!attendu)echecs++
 }
}finally{fs.writeFileSync(fichier,original)}
console.log(`DOCUMENT_RESTAURE=true ; fautes=${cas.length} ; incoherences=${echecs} ; aucun_envoi_externe=true`)
process.exitCode=echecs?1:0
