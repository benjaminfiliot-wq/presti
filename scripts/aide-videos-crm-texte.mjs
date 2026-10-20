// Inscrit le texte du scénario « crm » v2 (scripts/aide-videos-scenarios.mjs, TEXTE_CRM) dans lib/aide-videos.json.
// À lancer JUSTE AVANT de refaire la capture du CRM : le texte écrit sous la vidéo du centre d'aide doit décrire la vidéo en ligne, et
// l'ancienne vidéo n'a que cinq étapes. Les sous-titres chronométrés (sousTitres) et la durée sont effacés : aide-videos-anime.mjs les réécrit
// au montage, et aide-videos-qa.mjs reste rouge sur « crm » tant que la nouvelle vidéo n'est pas montée (voulu : pas de texte sans sa vidéo).
// Usage : node scripts/aide-videos-crm-texte.mjs
import fs from 'node:fs'
import { TEXTE_CRM as T } from './aide-videos-scenarios.mjs'

const f = 'lib/aide-videos.json'
const j = JSON.parse(fs.readFileSync(f, 'utf8'))
const v = j.videos.find((x) => x.id === 'crm')
if (!v) throw new Error('vidéo « crm » absente de ' + f)
v.resume = T.resume
v.etapes = [...T.etapes]
v.voix = { intro: T.intro, etapes: [...T.etapes], fin: T.fin }
delete v.sousTitres
delete v.duree
fs.writeFileSync(f, JSON.stringify(j, null, 2) + '\n')
console.log('crm : ' + v.etapes.length + ' étapes inscrites (sousTitres et durée effacés)')
