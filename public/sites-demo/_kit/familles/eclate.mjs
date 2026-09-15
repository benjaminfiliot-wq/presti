// eclate.mjs — famille « eclate » (vague 5, 021-05 puis 021-16) : la grande scène des étapes, un tronçon d'escalier en chêne décomposé
// pièce par pièce, qui raconte en quatre états la demande, le relevé, le devis et la pose. Ce module ne pose que du HTML ; tout le
// mouvement vit dans eclate.bureau.css (bureau chorégraphié), et eclate.css tient le profil fixe (téléphone, mouvement réduit, sans
// view(), écran de moins de 680 px de haut) : l'éclaté 4:3, ses pastilles et sa légende. Aucune ligne de JavaScript. Les rendus
// vivent dans <metier>/eclate/ (rendus par 021-04, relevé et recopie par 021-22).
import fs from 'node:fs'

// le contexte ne porte aucun chemin : le dossier publié se retrouve depuis ce module (_kit/familles/ → sites-demo/<metier>/eclate/)
const dossier = (metier) => new URL(`../../${metier}/eclate/`, import.meta.url)
const ARIA = 'Anatomie d’un escalier : limon à la française, marches en chêne de 40 mm, contremarches et vis'
const PIECES = ['limon', 'contremarche', 'marche', 'vis']
const IMAGES = ['assemble.avif', 'eclate.avif']
const frac = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1
// quatre décimales de pourcentage : 0,0001 % de 1 400 px, la boîte d'une pièce tombe au pixel du rendu
const pc = (v) => `${+(v * 100).toFixed(4)}%`
const nb = (v) => +v.toFixed(4)

// Où va chaque étiquette, en % de la scène depuis son ancre éclatée : dx, dy vers le bout du filet, ax 0 (texte à droite du bout)
// ou 1 (à gauche). Posées à l'œil sur eclate.avif, dans les vides entre les pièces, pour que les cinq textes tiennent encore
// en 14 px dans une scène de 520 px (1088×800) sans se toucher ni sortir du cadre. Une étiquette inconnue part à droite.
const PLACES = {
  'Limon à la française': { dx: 8.5, dy: -9.5, ax: 0 },
  Entailles: { dx: -9.7, dy: 0, ax: 1 },
  'Marche en chêne, 40 mm': { dx: -7.5, dy: 30.7, ax: 0 },
  Contremarche: { dx: 14.5, dy: 7.4, ax: 0 },
  Vis: { dx: 25.2, dy: 0, ax: 0 },
}
const PLACE_COTE = { dx: 4.2, dy: 4.6, ax: 0 }

// 021-16, le récit en quatre états. La fiche reprend trois champs du formulaire de devis de l'accueil, mot pour mot : les libellés
// sont écrits en dur dans generer.mjs (formDevis), les options viennent de site.json (devis.projets, communes, devis.delais). La
// phrase finale est celle de Q-C (decisions.md, 15/09). La cote d'entaille « 17 mm » part à gauche, dans le noir, hors du limon.
const LIBELLES = ['Votre projet', 'Commune', 'Quand']
const PHRASE = 'Tout commence par votre demande.'
const PLACE_ENTAILLE = { dx: -10.5, dy: 4, ax: 1 }
const PRIX = /\d[\d\s]*(€|euros?)/i

// Lecture et contrôle d'eclate.json et de ses fichiers : la même fonction sert au rendu et au garde, pour qu'un calque vide ou
// absent arrête la génération en le nommant, avant toute écriture (sinon la scène partirait en ligne avec un trou).
function charger(metier) {
  const lieu = (f) => `${metier}/eclate/${f}`
  const url = (f) => new URL(f, dossier(metier))
  const plein = (f) => { try { const s = fs.statSync(url(f)); return s.isFile() && s.size > 0 } catch { return false } }
  if (!plein('eclate.json')) throw new Error(`eclate : ${lieu('eclate.json')} manque ou est vide`)
  let J
  try { J = JSON.parse(fs.readFileSync(url('eclate.json'), 'utf8')) } catch (e) { throw new Error(`eclate : ${lieu('eclate.json')} illisible (${e.message})`) }
  const pieces = Array.isArray(J.pieces) ? J.pieces : []
  const noms = pieces.map((p) => p && p.nom).sort()
  if (JSON.stringify(noms) !== JSON.stringify([...PIECES].sort())) throw new Error(`eclate : ${lieu('eclate.json')} doit décrire les pièces ${PIECES.join(', ')} (lu : ${noms.join(', ') || 'aucune'})`)
  for (const p of pieces) {
    if (![p.x, p.y, p.l, p.h].every(frac) || !(p.l > 0 && p.h > 0) || !Array.isArray(p.vecteur) || p.vecteur.length !== 2 || !p.vecteur.every((v) => typeof v === 'number' && Math.abs(v) <= 1)) throw new Error(`eclate : ${lieu('eclate.json')}, boîte ou vecteur de « ${p.nom} » invalide`)
    if (!Number.isInteger(p.ordre)) throw new Error(`eclate : ${lieu('eclate.json')}, « ${p.nom} » sans ordre de pose entier`)
    if (typeof p.fichier !== 'string' || !/^[\w.-]+\.avif$/.test(p.fichier)) throw new Error(`eclate : ${lieu('eclate.json')}, fichier de « ${p.nom} » invalide`)
  }
  const etiquettes = Array.isArray(J.etiquettes) ? J.etiquettes : []
  if (!etiquettes.length) throw new Error(`eclate : ${lieu('eclate.json')} n’a aucune étiquette`)
  for (const e of etiquettes) if (!e || typeof e.texte !== 'string' || !e.texte.trim() || !frac(e.x) || !frac(e.y) || !pieces.some((p) => p.nom === e.piece)) throw new Error(`eclate : ${lieu('eclate.json')}, étiquette « ${e && e.texte} » sans texte, point dans [0 ; 1] ou pièce connue`)
  const c = J.cote
  if (!c || typeof c.texte !== 'string' || ![c.x1, c.y1, c.x2, c.y2].every(frac)) throw new Error(`eclate : ${lieu('eclate.json')}, cote absente ou hors du cadre`)
  for (const f of [...IMAGES, ...pieces.map((p) => p.fichier)]) if (!plein(f)) throw new Error(`eclate : ${lieu(f)} manque ou est vide`)
  // 021-16 : le relevé au trait (021-22) et ses deux cotes ; « 40 mm » est la cote d'eclate.json, l'autre est celle de l'entaille
  if (!plein('releve.json') || !plein('releve.avif')) throw new Error(`eclate : ${lieu('releve.json')} ou ${lieu('releve.avif')} manque ou est vide`)
  let RJ
  try { RJ = JSON.parse(fs.readFileSync(url('releve.json'), 'utf8')) } catch (e) { throw new Error(`eclate : ${lieu('releve.json')} illisible (${e.message})`) }
  const cotes = (Array.isArray(RJ.cotes) ? RJ.cotes : []).filter((x) => x && typeof x.texte === 'string' && x.texte.trim() && [x.x1, x.y1, x.x2, x.y2].every(frac))
  const epaisseur = cotes.find((x) => x.texte.trim() === c.texte.trim()), entaille = cotes.find((x) => x !== epaisseur)
  if (cotes.length !== 2 || !epaisseur || !entaille) throw new Error(`eclate : ${lieu('releve.json')} doit donner deux cotes dans le cadre, dont « ${c.texte} »`)
  J.releve = { epaisseur, entaille }
  return J
}

// La demande de la fiche : le projet « Escalier » (c'est l'objet de la scène), la première commune et le premier délai, pris dans
// les listes mêmes du formulaire. Sans eux, la fiche mentirait sur le formulaire : la génération s'arrête.
function demande(site) {
  const dv = site && site.devis
  const projet = dv && Array.isArray(dv.projets) ? dv.projets.find((x) => /^escalier$/i.test(String(x).trim())) : null
  const commune = site && Array.isArray(site.communes) ? site.communes[0] : null
  const delai = dv && Array.isArray(dv.delais) ? dv.delais[0] : null
  if (![projet, commune, delai].every((v) => typeof v === 'string' && v.trim())) throw new Error('eclate : site.json ne donne pas le projet « Escalier », une commune et un délai pour la fiche de la demande')
  return [projet, commune, delai].map((v, i) => [LIBELLES[i], v.trim()])
}

// Les points des étiquettes : eclate.json (021-22) les donne « vue assemblée (ajouter le vecteur de la pièce pour la vue éclatée) ».
// Vérifié sur les calques : c'est dans ce repère-là qu'ils tombent sur leur pièce ; lus tels quels sur la vue éclatée, quatre sur cinq
// tombent dans le vide. Si un futur relevé les donne déjà éclatés (champ « points » sans « assemblée »), rien d'autre ne change.
const pointsAssembles = (J) => /assembl/i.test(String(J.points || ''))
const ancreEclatee = (J, e, p) => (pointsAssembles(J) ? [e.x + p.vecteur[0], e.y + p.vecteur[1]] : [e.x, e.y])

// Le filet va de l'ancre au bout (dx, dy en % de la scène, qui est toujours en 4:3) : longueur en cqw, angle en degrés.
const filet = ({ dx, dy }) => ({ len: nb(Math.hypot(dx, dy * 0.75)), deg: nb((Math.atan2(dy * 0.75, dx) * 180) / Math.PI) })
const bout = (pl) => `--dx:${nb(pl.dx)};--dy:${nb(pl.dy)};--ax:${pl.ax}`

export default {
  // La figure remplace la photo des étapes : même classe etapes__photo (sa place au téléphone), rôle d'image nommé par son
  // aria-label ; images, cote, étiquettes et pastilles sont décoratives (alt vide, aria-hidden). Sœurs de la figure : la légende
  // (profil fixe) et le compteur (bureau). Un seul <p>, la phrase finale de 021-16 : le kit fait monter tout paragraphe d'un bloc
  // titré (kit.css, v26), eclate.bureau.css lui rend sa propre entrée.
  etapesMedia(ctx) {
    const J = charger(ctx.metier)
    const src = (f) => `${ctx.rel}eclate/${f}`
    const L = J.cadre && J.cadre.largeur > 0 ? J.cadre.largeur : 1400, H = J.cadre && J.cadre.hauteur > 0 ? J.cadre.hauteur : 1050
    const pieces = [...J.pieces].sort((a, b) => a.ordre - b.ordre)
    // rang de pose (0 = posée d'abord, le limon) et rang d'éclatement (0 = part d'abord, les vis) : l'escalier s'ouvre dans l'ordre
    // inverse de la pose et se remonte dans l'ordre de la pose, les vis en dernier, puisque ce sont elles qui fixent
    const pose = new Map(pieces.map((p, i) => [p.nom, i])), n = pieces.length
    const rang = (nom) => n - 1 - pose.get(nom)
    const vecteur = (p) => `--vx:${nb(p.vecteur[0] * 100)};--vy:${nb(p.vecteur[1] * 100)};--r:${rang(p.nom)};--o:${pose.get(p.nom)}`

    const calques = pieces.map((p) => `<img class="eclate__calque" src="${src(p.fichier)}" alt="" width="${Math.round(p.l * L)}" height="${Math.round(p.h * H)}" loading="lazy" decoding="async" style="left:${pc(p.x)};top:${pc(p.y)};width:${pc(p.l)};height:${pc(p.h)};${vecteur(p)}">`).join('')

    // les étiquettes entrent dans l'ordre où les pièces se posent dans la vue éclatée (vis, marches, contremarches, limon), puis
    // dans l'ordre d'eclate.json pour une même pièce ; chacune part de son ancre assemblée et suit sa pièce (même vecteur, même plage)
    const ordreEntree = J.etiquettes.map((e, i) => ({ e, i })).sort((a, b) => rang(a.e.piece) - rang(b.e.piece) || a.i - b.i)
    const entree = new Map(ordreEntree.map((x, k) => [x.i, k]))
    const etiquettes = J.etiquettes.map((e, i) => {
      const p = J.pieces.find((q) => q.nom === e.piece), [ex, ey] = ancreEclatee(J, e, p)
      const pl = PLACES[e.texte] || { dx: 6, dy: 0, ax: 0 }, f = filet(pl)
      // 021-16 : le numéro de ligne du devis, dans son propre élément juste avant l'étiquette, sous un parent sans boîte qui se lit
      // « 1 Limon à la française » ; il prend la place et le vecteur de l'étiquette pour suivre sa pièce
      const place = `left:${pc(ex - p.vecteur[0])};top:${pc(ey - p.vecteur[1])};${vecteur(p)};--k:${entree.get(i)}`
      return `<span class="eclate__ligne"><span class="eclate__numero" aria-hidden="true" style="${place}">${i + 1}</span> <span class="eclate__etiquette" aria-hidden="true" style="${place};${bout(pl)}"><span class="eclate__filet" style="width:calc(${f.len} * 1cqw);rotate:${f.deg}deg"></span><span class="eclate__point"></span><span class="eclate__texte">${ctx.esc(e.texte)}</span></span></span>`
    }).join('')

    // la cote, sur la vue assemblée : le trait et ses deux talons dans un SVG étiré sur la boîte du trait, le texte au bout d'un filet.
    // Sa place est en variables : celle d'eclate.json (--cx, --cy, scène de 021-05) et celle du relevé (--rx, --ry, 021-16, html.js)
    const c = J.cote, f = filet(PLACE_COTE), r = J.releve.epaisseur
    const cx = (c.x1 + c.x2) / 2, cy = (c.y1 + c.y2) / 2, ch = Math.max(Math.abs(c.y2 - c.y1), 0.004)
    const cote = `<span class="eclate__cote" aria-hidden="true" style="--cx:${pc(cx)};--cy:${pc(cy)};--rx:${pc((r.x1 + r.x2) / 2)};--ry:${pc((r.y1 + r.y2) / 2)};--ch:${nb(ch * 100)};${bout(PLACE_COTE)}"><svg class="eclate__trait" viewBox="0 0 10 100" preserveAspectRatio="none" focusable="false"><path d="M0 0H10M5 0V100M0 100H10"/></svg><span class="eclate__filet" style="width:calc(${f.len} * 1cqw);rotate:${f.deg}deg"></span><span class="eclate__texte">${ctx.esc(c.texte)}</span></span>`

    // 021-16 : le relevé au trait, en fond CSS d'un élément vide (jamais d'img : voir eclate.bureau.css), et la cote de l'entaille,
    // dessinée comme l'autre mais tournée sur l'axe de son segment (longueur --cl en cqw, 1 cqh = 0,75 cqw dans la scène 4:3)
    const releve = '<span class="eclate__releve" aria-hidden="true"></span>'
    const en = J.releve.entaille, fe = filet(PLACE_ENTAILLE)
    const lx = (en.x2 - en.x1) * 100, ly = (en.y2 - en.y1) * 75
    const entaille = `<span class="eclate__cote-entaille" aria-hidden="true" style="left:${pc((en.x1 + en.x2) / 2)};top:${pc((en.y1 + en.y2) / 2)};--cl:${nb(Math.max(Math.hypot(lx, ly), 0.3))};--ca:${nb(((((Math.atan2(ly, lx) * 180) / Math.PI - 90 + 180) % 360) + 360) % 360 - 180)}deg;${bout(PLACE_ENTAILLE)}"><svg class="eclate__trait" viewBox="0 0 10 100" preserveAspectRatio="none" focusable="false"><path d="M0 0H10M5 0V100M0 100H10"/></svg><span class="eclate__filet" style="width:calc(${fe.len} * 1cqw);rotate:${fe.deg}deg"></span><span class="eclate__texte">${ctx.esc(en.texte)}</span></span>`

    const pastilles = J.etiquettes.map((e, i) => {
      const p = J.pieces.find((q) => q.nom === e.piece), [ex, ey] = ancreEclatee(J, e, p)
      return `<span class="eclate__pastille" aria-hidden="true" style="left:${pc(ex)};top:${pc(ey)}">${i + 1}</span>`
    }).join('')

    // 021-16 : la fiche de la demande (chaque champ dans son élément, le tiret cadratin écrit dans le DOM) et la phrase finale
    const fiche = `<span class="eclate__fiche" aria-hidden="true">${demande(ctx.site).map(([l, v]) => `<span class="eclate__champ"><span class="eclate__libelle">${ctx.esc(l)}</span> <span class="eclate__tiret">—</span> <span class="eclate__valeur">${ctx.esc(v)}</span></span>`).join('')}</span>`
    const phrase = `<p class="eclate__phrase">${ctx.esc(PHRASE)}</p>`

    const figure = `<figure class="etapes__photo eclate" role="img" aria-label="${ARIA}"><div class="eclate__rendu">${calques}<img class="eclate__assemble" src="${src('assemble.avif')}" alt="" width="${L}" height="${H}" loading="lazy" decoding="async"><img class="eclate__eclate" src="${src('eclate.avif')}" alt="" width="${L}" height="${H}" loading="lazy" decoding="async">${releve}${cote}${entaille}${etiquettes}${pastilles}${fiche}${phrase}</div></figure>`
    // une mesure ne se coupe pas de son unité : « 40 » en bout de ligne et « mm » seul dessous, au téléphone (espace insécable)
    const insecable = (t) => t.replace(/(\d) (mm|cm|m)\b/g, '$1 $2')
    const legende = `<ol class="eclate__legende" aria-hidden="true">${J.etiquettes.map((e) => `<li>${ctx.esc(insecable(e.texte))}</li>`).join('')}</ol>`
    const nn = (k) => String(k).padStart(2, '0'), etapes = 4
    const compteur = `<span class="eclate__compteur" aria-hidden="true"><span class="compteur__fenetre"><span class="compteur__piste">${Array.from({ length: etapes }, (_, k) => `<span>${nn(k + 1)}</span>`).join('')}</span></span><span class="compteur__total">/ ${nn(etapes)}</span></span>`
    return `${figure}${legende}${compteur}`
  },

  // La scène ne doit jamais partir incomplète : fichiers d'eclate.json et du relevé présents et non vides, et, sur la page qui a des
  // étapes, la figure bien rendue à la place de la photo, avec sa fiche et sa phrase, et sans aucun prix (le devis se dit sans chiffre)
  garde(html, ctx) {
    charger(ctx.metier)
    if (!html.includes('id="etapes"')) return
    const lieu = ctx.page && ctx.page.chemin ? ctx.page.chemin : 'une page'
    const i = html.indexOf('<figure class="etapes__photo eclate" role="img"')
    if (i < 0) throw new Error(`eclate : ${lieu} a des étapes sans la scène de l’éclaté`)
    const fig = html.slice(i, html.indexOf('</figure>', i))
    if (!fig.includes('class="eclate__fiche"') || !fig.includes(`<p class="eclate__phrase">${PHRASE}</p>`)) throw new Error(`eclate : ${lieu}, la scène n’a pas sa fiche ou sa phrase finale`)
    const texte = `${fig.replace(/<[^>]+>/g, ' ')} ${[...fig.matchAll(/\b(?:aria-label|alt|title)="([^"]*)"/g)].map((m) => m[1]).join(' ')}`
    const prix = PRIX.exec(texte)
    if (prix) throw new Error(`eclate : ${lieu}, un prix dans la scène (« ${prix[0]} »)`)
  },
}
