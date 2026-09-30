// recit.mjs — famille « recit » (vague 5, 021-03) : le HTML du récit du plateau et de l'atelier. Les crochets ne posent que des
// spans ; tout le mouvement vit dans recit.bureau.css et recit.js, sous les conditions du bureau chorégraphié. Hors de ces
// conditions (téléphone, mouvement réduit, sans view(), sans JavaScript), les spans n'ont aucun style : le texte se lit tel quel et
// la valeur finale s'affiche.

// les quatre gestes de l'atelier, dans l'ordre où ils s'allument (--i) : trace, débite, assemble, ponce
const VERBES = ['trace', 'débite', 'assemble', 'ponce']
// un verbe est un mot entier : « trace » ne s'allume pas dans « retracer » (lettres Unicode : « débite » garde son accent)
const motEntier = (verbe) => new RegExp(`(^|[^\\p{L}\\p{N}])(${verbe})(?![\\p{L}\\p{N}])`, 'u')
const balise = (verbe, i) => `<span class="atelier__verbe" style="--i:${i}">${verbe}</span>`

export default {
  // La citation mot par mot : découpée sur les espaces ordinaires seulement. La ponctuation reste collée à son mot, une espace
  // insécable aussi (« personne ? » ne se sépare jamais), et une espace entre deux spans garde le texte du <p> identique à site.json.
  plateauCitation(texte, ctx) {
    return String(texte ?? '').trim().split(/[ \t\r\n]+/).filter(Boolean)
      .map((mot, i) => `<span class="citation__mot" style="--i:${i}">${ctx.esc(mot)}</span>`).join(' ')
  },

  // La vraie valeur reste dans le DOM (lue par les lecteurs d'écran, affichée partout où rien ne compte) ; le compte, vide et
  // aria-hidden, ne sert qu'au bureau pendant 1,3 s (recit.js)
  plateauValeur(chiffre, i, ctx) {
    return `<span class="chiffre__valeur"><span class="chiffre__vrai">${ctx.esc(chiffre.valeur)}</span><span class="chiffre__compte" aria-hidden="true"></span></span>`
  },

  // La phrase de l'atelier, échappée, puis la première occurrence de chaque verbe entourée ; le reste ne change pas. Remplacement
  // par fonction : une chaîne de remplacement interpréterait « $' » ou « $& » venus du texte.
  atelierPhrase(texte, ctx) {
    let html = ctx.esc(texte)
    VERBES.forEach((verbe, i) => { html = html.replace(motEntier(verbe), (_, avant, mot) => `${avant}${balise(mot, i)}`) })
    return html
  },

  // Une phrase réécrite qui perd un verbe éteindrait l'effet sans bruit : la génération s'arrête et nomme le verbe manquant
  garde(html) {
    if (!html.includes('class="atelier__phrase')) return
    const manque = VERBES.find((verbe, i) => !html.includes(balise(verbe, i)))
    if (manque) throw new Error(`recit : le verbe « ${manque} » manque dans la phrase de l’atelier`)
  },
}
