// video.mjs — famille « video » (vague 5, 021-13) : le crédit et la garde de la vidéo d'atelier. Aucun HTML : l'élément <video>
// est créé par video.js, au bureau seulement et à l'approche de la scène ; le téléphone, le mouvement réduit et l'absence de
// JavaScript ne reçoivent ni balise ni requête. Les fichiers vivent dans <metier>/video/ (encodés et recopiés par 021-18).
import fs from 'node:fs'

const FICHIERS = ['atelier.av1.mp4', 'atelier.h264.mp4']
const CHAMPS = ['auteur', 'banque', 'source', 'licence', 'licenceUrl']

// le contexte ne porte aucun chemin : le dossier publié se retrouve depuis ce module (_kit/familles/ → sites-demo/<metier>/video/)
const dossier = (metier) => new URL(`../../${metier}/video/`, import.meta.url)
// le générateur refuse l'apostrophe droite dans le texte visible : un nom qui en porte une ne doit pas faire tomber la génération
const typo = (texte) => String(texte ?? '').replace(/'/g, '’')

function entreeVideo(metier) {
  const fichier = new URL('attributions.json', dossier(metier))
  if (!fs.existsSync(fichier)) return null
  let liste
  try { liste = JSON.parse(fs.readFileSync(fichier, 'utf8')) } catch (e) { throw new Error(`video : ${metier}/video/attributions.json illisible (${e.message})`) }
  return Array.isArray(liste) ? liste.find((a) => a && a.type === 'video') || null : null
}

export default {
  // Le plan n'est pas une photo : il rejoint les mentions légales par une entrée à part, rendue par le générateur avec un lien
  // vers sa page et un lien vers le texte de sa licence. « Images d'illustration » : ces mains ne sont pas celles de l'artisan.
  credits(entrees, ctx) {
    const v = entreeVideo(ctx.metier)
    if (!v) return entrees
    return [...entrees, {
      type: 'video',
      base: v.base,
      legende: `Images d’illustration : ${typo(v.auteur)}, ${typo(v.banque)}, ${typo(v.licence)}`,
      auteur: typo(v.auteur),
      licence: typo(v.licence),
      licenceUrl: v.licenceUrl,
      source: v.source,
    }]
  },

  // video.js demande les deux fichiers sans rien vérifier : un MP4 absent ne se verrait qu'en ligne (la photo resterait, sans
  // bruit), et un plan sans crédit n'a pas le droit d'être publié. La génération s'arrête et nomme ce qui manque.
  garde(html, ctx) {
    const chemin = (f) => `${ctx.metier}/video/${f}`
    for (const f of FICHIERS) {
      const u = new URL(f, dossier(ctx.metier))
      if (!fs.existsSync(u) || !fs.statSync(u).isFile() || fs.statSync(u).size === 0) throw new Error(`video : ${chemin(f)} manque ou est vide`)
    }
    const v = entreeVideo(ctx.metier)
    if (!v) throw new Error(`video : ${chemin('attributions.json')} manque ou n’a pas d’entrée "type": "video"`)
    const manque = CHAMPS.filter((k) => typeof v[k] !== 'string' || !v[k].trim())
    if (manque.length) throw new Error(`video : ${chemin('attributions.json')}, l’entrée vidéo n’a pas ${manque.join(', ')}`)
    // les deux adresses deviennent des liens des mentions légales : jamais autre chose qu'une page web
    for (const k of ['source', 'licenceUrl']) if (!/^https?:\/\//.test(v[k])) throw new Error(`video : ${chemin('attributions.json')}, ${k} n’est pas une adresse web (${v[k]})`)
  },
}
