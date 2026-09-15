// scripts/releve-rendu-qa.mjs — le juge de la tâche 021-22 : le relevé au trait du tronçon d'escalier rendu par 021-04, le fond
// des rendus ramené sur #14110E, et la recopie de l'éclaté dans le site (cahier de la vague 5,
// .orchestre/preuves/021-00/cahier-vague-5.md, §3.4 B, §6.4 RT-1 à RT-7 et fiche « 021-22 » du §7.2 ; la tâche s'appelait 021-14
// dans le premier cahier : decisions.md, « Pourquoi le relevé au trait du cahier corrigé s'appelle-t-il 021-22 »).
// Il lit .orchestre/preuves/021-22/ et public/sites-demo/lestraque/eclate/, relance lui-même le script de trait dans Blender
// (sortie dans .orchestre/travail/, jamais dans la preuve), génère le site dans .orchestre/travail/ (jamais en place) et y fait
// décoder la recopie par Chromium. Toutes les valeurs sont recalculées ici ; aucune mesure de l'exécutant n'est crue.
//
//   DEP  choix du juge (§7.2 « Dépend de 021-04 PASS et regardé ») : le dernier verdict de 021-04 dans verdicts.jsonl est PASS,
//        rendu depuis fait/. « Regardé » reste un contrôle à l'œil de Claude Code (CC-2).
//   RT-1 fichiers de la preuve, tous > 0 octet (§3.4 B) : releve.avif (canal alpha, 1400 × 1050) ; releve.json (2 cotes aux
//        textes « 40 mm » et « 17 mm », points en fraction dans [0 ; 1]) ; planche.jpg ; rapport.md ≥ 600 caractères avec l'outil
//        de trait retenu (Line Art ou Freestyle), la commande (--background) et la version de Blender (5.2).
//        Choix du juge :
//        - releve.avif est un vrai AVIF ; « sur fond transparent » = au moins 50 % du cadre d'alpha ≤ 8 ; planche.jpg se décode
//          en JPEG ; releve.json porte "cadre" { largeur: 1400, hauteur: 1050 }, comme eclate.json ;
//        - « points projetés par Blender » : chaque cote porte aussi "piece" (« marche » pour 40 mm, « limon » pour 17 mm) et
//          "a", "b", ses deux points 3D en mètres. Dans la scène de releve.py relancée par le juge (RT-3), a et b sont à 2 mm au
//          plus de la surface évaluée de la pièce, et leur projection par la caméra de la scène (world_to_camera_view, y = 1 − y)
//          redonne x1, y1, x2, y2 à 0,002 près ;
//        - sur le dessin : au moins 3 px de long ; l'extrémité la plus proche du trait à 3 px au plus d'un pixel du trait, l'autre
//          à 16 px au plus (le fond d'une entaille peut être caché) ;
//        - si la longueur 3D |b − a| s'écarte de plus de 2 mm du texte de la cote (le modèle de 021-04 n'a pas forcément ces
//          cotes), rapport.md a une section « Écarts ». « Cotes justes » reste un contrôle à l'œil ;
//        - releve.py, le script Blender du trait, est dans la preuve (RT-3 le relance).
//   RT-2 poids de releve.avif ≤ 15 000 octets (choix du cahier : un quart du plafond des six AVIF de l'éclaté).
//   RT-3 alignement : part des pixels du trait (alpha > 128) posés sur une arête d'assemble.avif retenu (filtre de Sobel sur le
//        gris, arêtes dilatées de 3 px) ≥ 85 % (choix du cahier : le trait est le même objet, vu de la même caméra). Seuil essayé
//        sur de vrais traits Freestyle du render.py de 021-04 : 89,9 % (contre-expertise) ; valeurs du calibrage ci-dessous.
//        Choix du juge :
//        - gris = niveaux de gris de sharp après aplat d'assemble.avif sur #14110E ; noyau de Sobel 3 × 3 ; arête = norme ≥ 48,
//          soit un saut de 12 niveaux ; dilatation carrée (distance de Tchebychev ≤ 3 px) ;
//        - « les arêtes visibles du tronçon assemblé » : au moins 70 % du contour de la silhouette à 3 px au plus du trait
//          (silhouette = pixels à plus de 24 niveaux de #14110E sur un canal ; contour = pixel de la silhouette qui touche le fond
//          ou le bord), et au moins 60 % des arêtes intérieures à 3 px au plus du trait (arête intérieure = norme de Sobel ≥ 96, à
//          plus de 4 px du contour : nez de marche, jonctions, entailles ; le seuil de 96 écarte le grain du bois) ;
//        - le trait sort de Blender, pas d'un dessin 2D : le juge relance releve.py lui-même,
//          blender --background --factory-startup --python-exit-code 1 --python releve.py --python <contrôle du juge> -- <dossier>,
//          dossier pris dans .orchestre/travail/releve-rendu-qa-<pid>/ ; releve.py y écrit releve.png (RVBA, 1400 × 1050) et rien
//          dans la preuve. Concordance : au moins 90 % des pixels opaques de releve.avif à 1 px au plus d'un pixel opaque du rendu
//          relancé, et réciproquement. Le contrôle du juge, joué dans la même scène juste après releve.py, lit la caméra (ORTHO,
//          1400 × 1050 à 100 %), l'outil (scene.render.use_freestyle et view_layer.use_freestyle, ou un modificateur LINEART) et
//          les cotes (RT-1). releve.py règle use_freestyle ou LINEART dans son texte, et ne charge aucune image (images.load,
//          shutil, copyfile).
//        Calibrage du 15/09 sur le render.py de 021-04 (EEVEE, Freestyle à 2 px, rendu assemblé du même script) : voir « doutes »
//        de la contre-expertise et CALIBRAGE plus bas.
//   RT-4 couleur du trait : médiane R, V, B des pixels opaques (alpha > 128) de releve.avif à ±6 niveaux de #F4EDE2 (kit.css:468).
//   RT-5 fond des rendus retenus : pixel (0, 0) d'assemble.avif et d'eclate.avif à ≤ 3 niveaux de #14110E sur chaque canal ;
//        si 021-22 a relancé le rendu, eclate-rendu-qa.mjs --dossier=.orchestre/preuves/021-22 PASS (§3.4 B).
//        Choix du juge :
//        - les rendus retenus sont dans .orchestre/preuves/021-22/rendus/ (le dossier que lit eclate-rendu-qa --dossier) ;
//        - pixel opaque (alpha ≥ 250 : un pixel transparent n'a pas de couleur, et EC-15 lira la sienne), et pas seulement en
//          (0, 0) : les quatre coins et le milieu des quatre bords (la fiche 021-04 veut un fond « uni ») ;
//        - « a relancé le rendu » = un des 6 AVIF ou eclate.json diffère, octet pour octet, de .orchestre/preuves/021-04/rendus/ ;
//        - un rendu relancé garde ce que Claude Code a regardé : pour chacun des 6 AVIF, mêmes dimensions que 021-04, et, les deux
//          images aplaties sur #14110E, au plus 1 % du cadre écarté de plus de 24 niveaux sur un canal, compté là où l'une des deux
//          s'écarte de plus de 24 niveaux de son propre pixel (0, 0) (l'objet ; le fond changé ne compte pas) ; eclate.json garde
//          le cadre, les pièces (nom, fichier, x, y, l, h, vecteur, ordre), les étiquettes et la cote de 021-04, nombres à 0,002 ;
//        - l'OB-8 d'eclate-rendu-qa compte la recopie attendue sous public/sites-demo/lestraque/eclate/ comme « fichiers de rendu
//          sous public/ » : ces chemins-là seuls sont retirés de son verdict.
//   RT-6 recopie dans public/sites-demo/lestraque/eclate/ : exactement les 6 AVIF, eclate.json, releve.avif, releve.json,
//        attributions.json ; sha256 identiques à la preuve ; attributions.json en entrées "type": "rendu", auteur « Presti »,
//        licence « rendu procédural, sans œuvre tierce » (§3.4 B).
//        Choix du juge : une entrée par AVIF, "fichier": "eclate/<nom>.avif" ; node public/sites-demo/generer.mjs lestraque
//        --sortie=.orchestre/travail/releve-rendu-qa-<pid>/site --familles=eclate réussit (refait après 2 s ; si la génération
//        sans famille échoue elle aussi, le générateur est cassé par une autre tâche et ce point n'est pas jugé). Portée réelle :
//        avant 021-05, la famille eclate n'a aucun fichier dans le kit et generer.mjs la charge vide sans erreur ; la réussite
//        prouve seulement que lestraque/eclate/attributions.json se lit et que ses entrées « rendu » sont écartées des photos
//        (generer.mjs:286-303 et :314). En essai --eclate, le générateur lit toujours celui du site : non jugé, et dit.
//        Servis en local depuis la copie générée (repli sur le site), les 7 AVIF répondent 200, gardent le sha256 de la preuve et
//        se décodent dans Chromium aux dimensions de la preuve (remesuré après 2 s).
//   RT-7 reste du site : aucun autre fichier nouveau ni modifié sous public/ : git status --porcelain --untracked-files=all public
//        contre avant.txt, en ignorant generer.mjs, lestraque/eclate/ (RT-6) et les fichiers d'une tâche en cours (§7.0).
//        Choix du juge :
//        - avant.txt = .orchestre/en-cours/021-22.avant.txt, écrit par l'orchestre à la prise, hors du périmètre de la tâche (il
//          existe encore pendant le verdict lancé depuis fait/) ; la copie .orchestre/preuves/021-22/avant.txt, que l'exécutant
//          peut écrire, n'est lue que si le premier manque (verdict rejoué plus tard) ; les deux présents et différents = échec ;
//          aucun des deux = échec (la tâche n'a pas été prise par l'orchestre) ;
//        - tâches écartées : toutes celles de en-cours/ (Codex et Antigravity : 021-18 recopie aussi dans lestraque/), et celles de
//          fait/ ou refuse/ qui ont un verdict depuis la prise ; mais un motif de périmètre assez large pour couvrir un fichier
//          nouveau de public/, public/sites-demo/ ou lestraque/ n'écarte rien : ses fichiers restent en échec, avec l'id de la
//          tâche, pour que Claude Code tranche ;
//        - si l'une de ces tâches touche le kit ou le générateur, les SORTIES de la régénération (§7.0) sont écartées aussi ;
//        - une ligne en trop est remesurée après 2 s.
//        Limite connue : un fichier déjà modifié ou non suivi dans avant.txt, puis retouché, ne se voit pas (l'orchestre ne relève
//        pas les empreintes à la prise).
//
// Contrôles à l'œil, non jugés ici (§6.10 et CC-2 du cahier) :
//   - Claude Code regarde .orchestre/preuves/021-22/juge/planche.jpg, écrite par ce juge (rendu retenu, trait posé dessus, cotes
//     de releve.json) : « trait propre, cotes justes, posé sur le rendu » ;
//   - juge/alignement.jpg montre le trait sur une arête (vert), hors arête (rouge), le contour non tracé (bleu) et les arêtes
//     intérieures non tracées (orange) ; juge/mesures.json garde les mesures ;
//   - CC-2 avant le lancement : 021-04 PASS et ses rendus regardés (le bois fait-il chêne ? les vis se voient-elles ?) ;
//   - justesse des cotes : 40 mm sur un nez de marche, 17 mm sur une entaille ; section « Écarts » du rapport.
//
// Usage : node scripts/releve-rendu-qa.mjs [--dossier=<preuve>] [--eclate=<dossier>]
//   --dossier, --eclate : essai du juge sur une autre preuve ou une autre recopie ; DEP et RT-7 lisent toujours .orchestre/ et public/.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import sharp from 'sharp'

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const option = (nom) => { const a = process.argv.find((x) => x.startsWith(`--${nom}=`)); return a ? path.resolve(a.slice(nom.length + 3)) : null }
const P = option('dossier') || path.join(R, '.orchestre', 'preuves', '021-22')
const REN = path.join(P, 'rendus'), JUGE = path.join(P, 'juge')
const ORCH = path.join(R, '.orchestre')
const REN04 = path.join(ORCH, 'preuves', '021-04', 'rendus')
const DEMOS = path.join(R, 'public', 'sites-demo'), SITE = path.join(DEMOS, 'lestraque')
const ECLATE_ESSAI = option('eclate')
const ECL = ECLATE_ESSAI || path.join(SITE, 'eclate')
const T = path.join(ORCH, 'travail', `releve-rendu-qa-${process.pid}`)
process.on('exit', () => { try { fs.rmSync(T, { recursive: true, force: true }) } catch { /* rien à nettoyer */ } })
const BLENDER = 'C:/Program Files/Blender Foundation/blender.exe'

const L = 1400, H = 1050
const FOND = [0x14, 0x11, 0x0e], CREME = [0xf4, 0xed, 0xe2]
const SEUIL_SOBEL = 48, DILATATION = 3, PART_ALIGNEMENT = 0.85, PART_CONTOUR = 0.7
const SEUIL_INTERIEUR = 96, MARGE_CONTOUR = 4, PART_INTERIEURES = 0.6
const CONCORDANCE = 0.9
const PROCHE_COTE = 16, COTE_VISIBLE = 3, TOL_PROJECTION = 0.002, TOL_SURFACE_MM = 2, ECART_COTE_MM = 2
const PIECE_COTE = { '40 mm': 'marche', '17 mm': 'limon' }
const AVIF = ['assemble.avif', 'eclate.avif', 'calque-limon.avif', 'calque-marche.avif', 'calque-contremarche.avif', 'calque-vis.avif']
const RENDUS = [...AVIF, 'eclate.json']
const RECOPIE = [...RENDUS, 'releve.avif', 'releve.json', 'attributions.json']
const LICENCE = 'rendu procédural, sans œuvre tierce'

const echecs = [], faits = []
const rel = (f) => path.relative(R, f).split(path.sep).join('/')
const taille = (f) => { try { const s = fs.statSync(f); return s.isFile() ? s.size : -1 } catch { return -1 } }
const lire = (f) => fs.readFileSync(f, 'utf8')
const empreinte = (f) => { try { return crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex') } catch { return null } }
const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms))
const premiereLigne = (e) => String(e && e.message ? e.message : e).split('\n')[0].slice(0, 200)
const pct = (x) => (100 * x).toFixed(1)
const fin = () => {
  if (faits.length) console.log(faits.map((f) => `  · ${f}`).join('\n'))
  console.log(echecs.length ? `✗ relevé et recopie de l'éclaté : FAIL — ${echecs.join(' ; ')}` : `✓ relevé et recopie de l'éclaté : PASS — trait crème relancé par le juge dans Blender et aligné sur le rendu, deux cotes projetées depuis l'objet, rendus sur #14110E fidèles à 021-04, recopie identique à la preuve et acceptée par le générateur, reste du site intact${ECLATE_ESSAI ? ' (essai --eclate : acceptation des attributions non jugée)' : ''}`)
  process.exitCode = echecs.length ? 1 : 0
}

// ── outils d'image ─────────────────────────────────────────────────────────────────────────────────────────────
// dilatation carrée de rayon r d'un masque L × H (fenêtre glissante, deux passes)
const dilater = (m, r) => {
  const tmp = new Uint8Array(L * H), out = new Uint8Array(L * H)
  for (let y = 0; y < H; y++) {
    const o = y * L
    let n = 0
    for (let x = 0; x < Math.min(r, L); x++) n += m[o + x]
    for (let x = 0; x < L; x++) {
      if (x + r < L) n += m[o + x + r]
      if (x - r - 1 >= 0) n -= m[o + x - r - 1]
      tmp[o + x] = n > 0 ? 1 : 0
    }
  }
  for (let x = 0; x < L; x++) {
    let n = 0
    for (let y = 0; y < Math.min(r, H); y++) n += tmp[y * L + x]
    for (let y = 0; y < H; y++) {
      if (y + r < H) n += tmp[(y + r) * L + x]
      if (y - r - 1 >= 0) n -= tmp[(y - r - 1) * L + x]
      out[y * L + x] = n > 0 ? 1 : 0
    }
  }
  return out
}
const compter = (m) => { let n = 0; for (let i = 0; i < m.length; i++) n += m[i]; return n }
const ecartCanal = (buf, o, ref) => Math.max(Math.abs(buf[o] - ref[0]), Math.abs(buf[o + 1] - ref[1]), Math.abs(buf[o + 2] - ref[2]))
// les coins et le milieu des bords
const bordsDe = (w, h) => [[0, 0], [w >> 1, 0], [w - 1, 0], [0, h >> 1], [w - 1, h >> 1], [0, h - 1], [w >> 1, h - 1], [w - 1, h - 1]]
const pixelsDe = async (f, points) => {
  const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return points(info.width, info.height).map(([x, y]) => { const o = (y * info.width + x) * 4; return { x, y, rgba: [data[o], data[o + 1], data[o + 2], data[o + 3]] } })
}
// un rendu relancé contre celui de 021-04 : les deux aplatis sur #14110E ; seul compte l'objet (l'une des deux images s'écarte de
// plus de 24 niveaux de son propre pixel (0, 0)), le fond changé ne compte pas
const comparerAuRegarde = async (fa, fb) => {
  const [ma, mb] = await Promise.all([sharp(fa).metadata(), sharp(fb).metadata()])
  if (ma.width !== mb.width || ma.height !== mb.height) return { dims: `${mb.width} × ${mb.height} au lieu de ${ma.width} × ${ma.height}` }
  const n = ma.width * ma.height
  const [A, B] = await Promise.all([fa, fb].map((f) => sharp(f).flatten({ background: '#14110E' }).removeAlpha().raw().toBuffer()))
  const fondA = [A[0], A[1], A[2]], fondB = [B[0], B[1], B[2]]
  let objet = 0, ecartes = 0
  for (let i = 0; i < n; i++) {
    const o = i * 3
    if (ecartCanal(A, o, fondA) <= 24 && ecartCanal(B, o, fondB) <= 24) continue
    objet++
    if (Math.max(Math.abs(A[o] - B[o]), Math.abs(A[o + 1] - B[o + 1]), Math.abs(A[o + 2] - B[o + 2])) > 24) ecartes++
  }
  return { part: ecartes / n, objet: objet / n }
}
// écart entre deux JSON : nombres à 0,002 près, listes d'objets rangées par nom ou texte ; null si identiques
const cleJson = (o) => (o && typeof o === 'object' ? String(o.nom ?? o.texte ?? '') : '')
const ecartJson = (a, b, chemin) => {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= 0.002 ? null : `${chemin} vaut ${b} au lieu de ${a}`
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return `${chemin} : ${Array.isArray(b) ? b.length : 'pas une liste'} élément(s) au lieu de ${Array.isArray(a) ? a.length : 'pas une liste'}`
    const ranger = (l) => (l.every((x) => x && typeof x === 'object' && !Array.isArray(x)) ? [...l].sort((x, y) => cleJson(x).localeCompare(cleJson(y))) : l)
    const [ra, rb] = [ranger(a), ranger(b)]
    for (let i = 0; i < ra.length; i++) { const d = ecartJson(ra[i], rb[i], `${chemin}[${cleJson(ra[i]) || i}]`); if (d) return d }
    return null
  }
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const d = ecartJson(a[k], b[k], `${chemin}.${k}`); if (d) return d }
    return null
  }
  return a === b ? null : `${chemin} vaut ${JSON.stringify(b)} au lieu de ${JSON.stringify(a)}`
}

// ── porcelaine git et périmètres ───────────────────────────────────────────────────────────────────────────────
// git met entre guillemets, avec des échappements octaux, un chemin qui contient des caractères spéciaux
const deguillemeter = (s) => {
  if (!s.startsWith('"') || !s.endsWith('"')) return s
  const t = s.slice(1, -1), octets = []
  for (let i = 0; i < t.length; i++) {
    if (t[i] !== '\\') { octets.push(...Buffer.from(t[i])); continue }
    const suivant = t[i + 1] || ''
    if (/[0-7]/.test(suivant)) { octets.push(parseInt(t.slice(i + 1, i + 4), 8)); i += 3 } else { octets.push({ n: 10, t: 9, '"': 34, '\\': 92 }[suivant] ?? suivant.charCodeAt(0)); i += 1 }
  }
  return Buffer.from(octets).toString('utf8')
}
const cheminsPorcelaine = (txt) => txt.split(/\r?\n/).filter((l) => l.length > 3).map((l) => { const reste = l.slice(3); const fleche = reste.lastIndexOf(' -> '); return deguillemeter(fleche >= 0 ? reste.slice(fleche + 4) : reste) })
const decouperListe = (s) => { const out = []; let cur = '', prof = 0; for (const ch of s) { if (ch === '{') prof++; if (ch === '}') prof--; if (ch === ',' && prof === 0) { out.push(cur); cur = '' } else cur += ch } out.push(cur); return out.map((x) => x.trim().replace(/^["']|["']$/g, '')).filter(Boolean) }
const globVersRegex = (g) => new RegExp(`^${g.replace(/[.+^$()|[\]\\]/g, '\\$&').replace(/\*\*\/?/g, ' ').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]').replace(/\{([^}]*)\}/g, (_, a) => `(?:${a.split(',').join('|')})`).replace(/ /g, '.*')}$`)
// un motif qui couvre l'un de ces fichiers inventés couvre tout un pan de public/ : il n'écarte rien
const SONDES = ['public/zz-sonde-021-22.txt', 'public/sites-demo/zz-sonde-021-22.txt', 'public/sites-demo/zz-sonde-021-22/zz.txt', 'public/sites-demo/lestraque/zz-sonde-021-22.txt', 'public/sites-demo/lestraque/zz-sonde-021-22/zz.avif']
// les SORTIES de la régénération (§7.0)
const SORTIES = /^public\/sites-demo\/lestraque\/(?:(?:index\.html|styles\.css|bureau\.css|site\.js|relief\.js|relief-fil\.js|sitemap\.xml|robots\.txt|favicon\.svg)$|(?:fonts|menuisier-[^/]*|mentions-legales|confidentialite)\/)/

// ── le contrôle joué dans la scène de releve.py, juste après lui ────────────────────────────────────────────────
const CONTROLE = String.raw`import bpy, json, os, traceback
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
res = {'erreurs': [], 'cotes': []}
try:
    sc = bpy.context.scene
    cam = sc.camera
    if cam is not None and cam.type == 'CAMERA':
        res['camera'] = {'type': cam.data.type, 'ortho_scale': round(cam.data.ortho_scale, 4), 'x': sc.render.resolution_x, 'y': sc.render.resolution_y, 'pourcent': sc.render.resolution_percentage}
    else:
        cam = None
    res['freestyle'] = bool(sc.render.use_freestyle) and any(vl.use_freestyle for vl in sc.view_layers)
    res['lineart'] = any(m.type == 'LINEART' for o in sc.objects for m in o.modifiers)
    dg = bpy.context.evaluated_depsgraph_get()
    with open(os.environ['RELEVE_JUGE_JSON'], encoding='utf-8') as f:
        releve = json.load(f)
    for c in (releve.get('cotes') or []) if isinstance(releve, dict) else []:
        e = {'texte': c.get('texte') if isinstance(c, dict) else None}
        res['cotes'].append(e)
        try:
            a, b = Vector(c['a']), Vector(c['b'])
            e['longueur_mm'] = (b - a).length * 1000
            if cam is not None:
                pa, pb = world_to_camera_view(sc, cam, a), world_to_camera_view(sc, cam, b)
                e['projete'] = [pa.x, 1 - pa.y, pb.x, 1 - pb.y]
            o = sc.objects.get(str(c.get('piece')))
            e['trouvee'] = o is not None and o.type == 'MESH'
            if e['trouvee']:
                inv = o.matrix_world.inverted()
                d = []
                for p in (a, b):
                    ok, loc, nor, idx = o.closest_point_on_mesh(inv @ p, depsgraph=dg)
                    d.append((o.matrix_world @ loc - p).length * 1000 if ok else None)
                e['distances_mm'] = d
        except Exception as ex:
            e['erreur'] = repr(ex)
except Exception:
    res['erreurs'].append(traceback.format_exc())
with open(os.environ['RELEVE_JUGE_SORTIE'], 'w', encoding='utf-8') as f:
    json.dump(res, f)
print('CONTROLE_JUGE_ECRIT')
`

async function juger() {
  // ── DEP : 021-04 est passé ───────────────────────────────────────────────────────────────────────────────────
  {
    const V = path.join(ORCH, 'verdicts.jsonl')
    const d = (taille(V) > 0 ? lire(V).split(/\r?\n/) : []).map((l) => { try { return JSON.parse(l) } catch { return null } }).filter((v) => v && v.id === '021-04').at(-1)
    if (!d) echecs.push('DEP : aucun verdict de 021-04 dans .orchestre/verdicts.jsonl : 021-22 part après le PASS de 021-04, regardé par Claude Code')
    else if (d.verdict !== 'PASS' || d.dossier !== 'fait') echecs.push(`DEP : dernier verdict de 021-04 ${d.verdict} depuis ${d.dossier} (${d.date}) : 021-22 part après son PASS depuis fait/, regardé par Claude Code`)
    else faits.push(`021-04 : PASS depuis fait/ le ${d.date}`)
  }

  // ── RT-1 et RT-2 ─────────────────────────────────────────────────────────────────────────────────────────────
  const releveF = path.join(P, 'releve.avif'), releveJsonF = path.join(P, 'releve.json'), plancheF = path.join(P, 'planche.jpg'), rapportF = path.join(P, 'rapport.md'), scriptF = path.join(P, 'releve.py')
  for (const f of [releveF, releveJsonF, plancheF, rapportF, scriptF]) if (taille(f) <= 0) echecs.push(`RT-1 : ${path.basename(f)} absent ou vide (${rel(P)}/)`)
  let trait = null // masque des pixels du trait (alpha > 128) et données RGBA
  if (taille(releveF) > 0) {
    try {
      const m = await sharp(releveF).metadata()
      const { data } = await sharp(releveF).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
      if (m.format !== 'heif' || (m.compression && m.compression !== 'av1')) echecs.push(`RT-1 : releve.avif n'est pas un AVIF (format ${m.format}${m.compression ? `/${m.compression}` : ''})`)
      if (m.width !== L || m.height !== H) echecs.push(`RT-1 : releve.avif en ${m.width} × ${m.height}, 1400 × 1050 attendu`)
      if (!m.hasAlpha) echecs.push('RT-1 : releve.avif sans canal alpha')
      const n = m.width * m.height
      let transparents = 0, opaques = 0
      for (let i = 3; i < data.length; i += 4) { if (data[i] <= 8) transparents++; if (data[i] > 128) opaques++ }
      faits.push(`releve.avif : ${taille(releveF)} octets, ${m.width} × ${m.height}, ${pct(transparents / n)} % transparent, ${opaques} pixels de trait`)
      if (m.hasAlpha && transparents / n < 0.5) echecs.push(`RT-1 : releve.avif transparent sur ${pct(transparents / n)} % du cadre seulement (50 % au moins : un trait sur fond transparent)`)
      if (m.width === L && m.height === H && m.hasAlpha) {
        const masque = new Uint8Array(L * H)
        for (let i = 0; i < L * H; i++) masque[i] = data[i * 4 + 3] > 128 ? 1 : 0
        trait = { data, masque, opaques }
      }
    } catch (e) { echecs.push(`RT-1 : releve.avif illisible (${premiereLigne(e)})`) }
    if (taille(releveF) > 15000) echecs.push(`RT-2 : releve.avif pèse ${taille(releveF)} octets, 15 000 au plus`)
  }
  const frac = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1
  const point3 = (v) => Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number' && Number.isFinite(n))
  const cotes = []
  if (taille(releveJsonF) > 0) {
    let releve = null
    try { releve = JSON.parse(lire(releveJsonF)) } catch (e) { echecs.push(`RT-1 : releve.json illisible (${premiereLigne(e)})`) }
    if (releve) {
      if (!releve.cadre || releve.cadre.largeur !== L || releve.cadre.hauteur !== H) echecs.push(`RT-1 : releve.json → cadre ${JSON.stringify(releve.cadre)}, { "largeur": 1400, "hauteur": 1050 } attendu`)
      const liste = Array.isArray(releve.cotes) ? releve.cotes : []
      const textes = liste.map((c) => (c && typeof c.texte === 'string' ? c.texte : '?')).sort()
      if (liste.length !== 2 || JSON.stringify(textes) !== JSON.stringify(['17 mm', '40 mm'])) echecs.push(`RT-1 : releve.json → cotes ${textes.join(' | ') || 'aucune'}, exactement « 40 mm » et « 17 mm » attendues`)
      for (const c of liste) {
        if (!c || ![c.x1, c.y1, c.x2, c.y2].every(frac)) { echecs.push(`RT-1 : cote « ${c?.texte} » : x1, y1, x2, y2 absents ou hors de [0 ; 1]`); continue }
        const piece = PIECE_COTE[c.texte]
        if (piece && c.piece !== piece) echecs.push(`RT-1 : cote « ${c.texte} » : "piece": "${piece}" attendu (${JSON.stringify(c.piece)})`)
        if (!point3(c.a) || !point3(c.b)) echecs.push(`RT-1 : cote « ${c.texte} » : "a" et "b" absents (points 3D de l'objet en mètres, [x, y, z], d'où la cote est projetée)`)
        const longueur = Math.hypot((c.x2 - c.x1) * L, (c.y2 - c.y1) * H)
        faits.push(`cote « ${c.texte} » : de (${(c.x1 * L).toFixed(0)}, ${(c.y1 * H).toFixed(0)}) à (${(c.x2 * L).toFixed(0)}, ${(c.y2 * H).toFixed(0)}) px, ${longueur.toFixed(1)} px`)
        if (longueur < 3) echecs.push(`RT-1 : cote « ${c.texte} » longue de ${longueur.toFixed(1)} px (3 au moins : deux points distincts de l'objet)`)
        cotes.push({ ...c, longueur })
      }
    }
  }
  if (taille(plancheF) > 0) {
    try { const m = await sharp(plancheF).metadata(); if (m.format !== 'jpeg') echecs.push(`RT-1 : planche.jpg n'est pas un JPEG (format ${m.format})`) } catch (e) { echecs.push(`RT-1 : planche.jpg illisible (${premiereLigne(e)})`) }
  }
  const rapport = taille(rapportF) > 0 ? lire(rapportF) : null
  if (rapport !== null) {
    faits.push(`rapport.md : ${rapport.length} caractères`)
    if (rapport.length < 600) echecs.push(`RT-1 : rapport.md de ${rapport.length} caractères, 600 au moins`)
    for (const [nom, motif] of [['l\'outil de trait retenu (Line Art ou Freestyle)', /line[\s_-]?art|freestyle/i], ['la commande Blender (--background)', /--background/], ['la version de Blender (5.2)', /5\.2/]]) if (!motif.test(rapport)) echecs.push(`RT-1 : rapport.md sans ${nom}`)
  }

  // ── RT-5 : fond des rendus retenus, et fidélité au rendu regardé ─────────────────────────────────────────────
  if (taille(path.join(REN04, 'assemble.avif')) > 0 || taille(path.join(REN04, 'eclate.avif')) > 0) {
    for (const f of ['assemble.avif', 'eclate.avif']) {
      try { const [p] = await pixelsDe(path.join(REN04, f), () => [[0, 0]]); faits.push(`021-04 : pixel (0, 0) de rendus/${f} = rgba(${p.rgba.join(', ')}) ; fond attendu rgb(20, 17, 14), opaque`) } catch { faits.push(`021-04 : rendus/${f} absent ou illisible`) }
    }
  }
  const manquants = RENDUS.filter((f) => taille(path.join(REN, f)) <= 0)
  if (manquants.length) echecs.push(`RT-5 : rendus retenus absents ou vides dans ${rel(REN)}/ : ${manquants.join(', ')}`)
  for (const f of ['assemble.avif', 'eclate.avif']) {
    const fr = path.join(REN, f)
    if (taille(fr) <= 0) continue
    try {
      const points = await pixelsDe(fr, bordsDe)
      const ecart = (p) => Math.max(...FOND.map((v, k) => Math.abs(p.rgba[k] - v)))
      const fautifs = points.filter((p) => p.rgba[3] < 250 || ecart(p) > 3)
      faits.push(`rendu retenu : rendus/${f}, pixel (0, 0) = rgba(${points[0].rgba.join(', ')}) ; ${points.length - fautifs.length} / ${points.length} points des coins et des bords opaques à 3 niveaux au plus de #14110E`)
      if (fautifs.length) echecs.push(`RT-5 : fond de rendus/${f} hors de #14110E opaque en ${fautifs.slice(0, 3).map((p) => `(${p.x}, ${p.y}) rgba(${p.rgba.join(', ')})`).join(', ')}${fautifs.length > 3 ? ` et ${fautifs.length - 3} autre(s)` : ''} (coins et milieu des bords : alpha ≥ 250, 3 niveaux au plus sur chaque canal)`)
    } catch (e) { echecs.push(`RT-5 : rendus/${f} illisible (${premiereLigne(e)})`) }
  }
  if (!manquants.length) {
    const differents = RENDUS.filter((f) => empreinte(path.join(REN, f)) !== empreinte(path.join(REN04, f)))
    if (!differents.length) faits.push('rendus retenus identiques, octet pour octet, à ceux de 021-04 : pas de nouveau rendu à juger')
    else {
      faits.push(`rendus retenus différents de 021-04 (${differents.join(', ')}) : rendu relancé, comparé au rendu regardé et rejugé par eclate-rendu-qa --dossier`)
      const absents04 = RENDUS.filter((f) => taille(path.join(REN04, f)) <= 0)
      if (absents04.length) echecs.push(`RT-5 : rendus de 021-04 absents (${absents04.join(', ')}) : le nouveau rendu ne peut pas être comparé à celui que Claude Code a regardé`)
      else {
        for (const f of AVIF) {
          try {
            const c = await comparerAuRegarde(path.join(REN04, f), path.join(REN, f))
            if (c.dims) { echecs.push(`RT-5 : rendus/${f} en ${c.dims} (celles de 021-04)`); continue }
            faits.push(`${f} contre 021-04 : ${(100 * c.part).toFixed(2)} % du cadre écarté de plus de 24 niveaux (objet sur ${pct(c.objet)} % du cadre)`)
            if (c.part > 0.01) echecs.push(`RT-5 : rendus/${f} s'écarte du rendu regardé de 021-04 sur ${(100 * c.part).toFixed(2)} % du cadre, 1 % au plus (fonds aplatis sur #14110E : géométrie, caméra et matière gardées)`)
          } catch (e) { echecs.push(`RT-5 : comparaison de rendus/${f} avec 021-04 impossible (${premiereLigne(e)})`) }
        }
        try {
          const d = ecartJson(JSON.parse(lire(path.join(REN04, 'eclate.json'))), JSON.parse(lire(path.join(REN, 'eclate.json'))), 'eclate.json')
          if (d) echecs.push(`RT-5 : ${d} (cadre, pièces, étiquettes et cote de 021-04 attendus, nombres à 0,002 près)`)
          else faits.push('eclate.json : cadre, pièces, étiquettes et cote identiques à 021-04 (nombres à 0,002 près)')
        } catch (e) { echecs.push(`RT-5 : eclate.json illisible (${premiereLigne(e)})`) }
      }
      const r = spawnSync(process.execPath, [path.join(R, 'scripts', 'eclate-rendu-qa.mjs'), `--dossier=${P}`], { cwd: R, encoding: 'utf8', timeout: 480000, maxBuffer: 1 << 26, windowsHide: true })
      const derniere = `${r.stdout || ''}${r.stderr || ''}`.trim().split('\n').pop() || ''
      if (r.status === 0) faits.push(`eclate-rendu-qa --dossier : ${derniere.slice(0, 160)}`)
      else {
        const m = derniere.match(/FAIL — (.*)$/)
        if (!m) echecs.push(`RT-5 : eclate-rendu-qa --dossier interrompu (${derniere.slice(0, 200) || `code ${r.status}`})`)
        else {
          const restants = m[1].split(' ; ').map((item) => {
            const o = item.match(/^OB-8 : fichiers de rendu sous public\/ : (.*)$/)
            if (!o) return item
            const reste = o[1].split(', ').filter((x) => !x.startsWith('public/sites-demo/lestraque/eclate/'))
            return reste.length ? `OB-8 : fichiers de rendu sous public/ : ${reste.join(', ')}` : null
          }).filter(Boolean)
          let resume = ''
          for (const item of restants) { if (resume.length + item.length > 700) { resume += ' | …'; break } resume += (resume ? ' | ' : '') + item }
          if (restants.length) echecs.push(`RT-5 : eclate-rendu-qa --dossier=${rel(P)} en échec (${resume})`)
          else faits.push('eclate-rendu-qa --dossier : seul son OB-8 échoue, sur la recopie attendue dans lestraque/eclate/ : écarté')
        }
      }
    }
  }

  // ── RT-4 : couleur du trait ──────────────────────────────────────────────────────────────────────────────────
  let mediane = null
  if (!trait) faits.push('RT-3, RT-4 : non mesurés sur releve.avif (absent, illisible, hors format ou sans alpha)')
  else if (!trait.opaques) echecs.push('RT-4 : releve.avif n\'a aucun pixel opaque (alpha > 128) : pas de trait')
  else {
    const hist = [0, 1, 2].map(() => new Uint32Array(256))
    for (let i = 0; i < L * H; i++) if (trait.masque[i]) for (let k = 0; k < 3; k++) hist[k][trait.data[i * 4 + k]]++
    mediane = hist.map((h) => { let cumul = 0; for (let v = 0; v < 256; v++) { cumul += h[v]; if (cumul * 2 >= trait.opaques) return v } return 255 })
    const ecart = Math.max(...CREME.map((v, k) => Math.abs(mediane[k] - v)))
    faits.push(`couleur du trait : médiane rgb(${mediane.join(', ')}), à ${ecart} niveau(x) de #F4EDE2`)
    if (ecart > 6) echecs.push(`RT-4 : médiane du trait rgb(${mediane.join(', ')}), à ${ecart} niveaux de #F4EDE2 (6 au plus sur chaque canal)`)
  }

  // ── RT-3 : le trait contre les arêtes du rendu assemblé ─────────────────────────────────────────────────────
  const mesures = { date: new Date().toISOString() }
  const assembleF = path.join(REN, 'assemble.avif')
  if (trait && trait.opaques && taille(assembleF) > 0) {
    let gris = null, couleurs = null
    try {
      gris = await sharp(assembleF).flatten({ background: '#14110E' }).greyscale().raw().toBuffer({ resolveWithObject: true })
      couleurs = await sharp(assembleF).flatten({ background: '#14110E' }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
    } catch (e) { echecs.push(`RT-3 : rendus/assemble.avif illisible (${premiereLigne(e)})`) }
    if (gris && (gris.info.width !== L || gris.info.height !== H)) { echecs.push(`RT-3 : rendus/assemble.avif en ${gris.info.width} × ${gris.info.height}, 1400 × 1050 attendu`); gris = null }
    if (gris) {
      const c = gris.info.channels, g = (x, y) => gris.data[(y * L + x) * c]
      const arete = new Uint8Array(L * H), forte = new Uint8Array(L * H)
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < L - 1; x++) {
        const gx = g(x + 1, y - 1) + 2 * g(x + 1, y) + g(x + 1, y + 1) - g(x - 1, y - 1) - 2 * g(x - 1, y) - g(x - 1, y + 1)
        const gy = g(x - 1, y + 1) + 2 * g(x, y + 1) + g(x + 1, y + 1) - g(x - 1, y - 1) - 2 * g(x, y - 1) - g(x + 1, y - 1)
        const n2 = gx * gx + gy * gy
        if (n2 >= SEUIL_SOBEL * SEUIL_SOBEL) arete[y * L + x] = 1
        if (n2 >= SEUIL_INTERIEUR * SEUIL_INTERIEUR) forte[y * L + x] = 1
      }
      const areteDilatee = dilater(arete, DILATATION)
      let surArete = 0
      for (let i = 0; i < L * H; i++) if (trait.masque[i] && areteDilatee[i]) surArete++
      const partSurArete = surArete / trait.opaques
      // la silhouette, son contour et les arêtes intérieures
      const cc = couleurs.info.channels, objet = new Uint8Array(L * H)
      for (let i = 0; i < L * H; i++) if (ecartCanal(couleurs.data, i * cc, FOND) > 24) objet[i] = 1
      const contour = new Uint8Array(L * H)
      for (let y = 0; y < H; y++) for (let x = 0; x < L; x++) {
        const i = y * L + x
        if (objet[i] && (x === 0 || y === 0 || x === L - 1 || y === H - 1 || !objet[i - 1] || !objet[i + 1] || !objet[i - L] || !objet[i + L])) contour[i] = 1
      }
      const presDuContour = dilater(contour, MARGE_CONTOUR)
      const interieure = new Uint8Array(L * H)
      for (let i = 0; i < L * H; i++) if (forte[i] && objet[i] && !presDuContour[i]) interieure[i] = 1
      const traitDilate = dilater(trait.masque, DILATATION)
      const nContour = compter(contour), nInterieures = compter(interieure)
      let contourCouvert = 0, interieuresCouvertes = 0
      for (let i = 0; i < L * H; i++) { if (contour[i] && traitDilate[i]) contourCouvert++; if (interieure[i] && traitDilate[i]) interieuresCouvertes++ }
      const partContour = nContour ? contourCouvert / nContour : 0
      const partInterieures = nInterieures ? interieuresCouvertes / nInterieures : 1
      faits.push(`arêtes d'assemble.avif (Sobel ≥ ${SEUIL_SOBEL}) : ${(100 * compter(arete) / (L * H)).toFixed(2)} % du cadre, ${(100 * compter(areteDilatee) / (L * H)).toFixed(2)} % dilatées ; silhouette ${pct(compter(objet) / (L * H))} % du cadre ; ${nInterieures} px d'arêtes intérieures (Sobel ≥ ${SEUIL_INTERIEUR}, à plus de ${MARGE_CONTOUR} px du contour)`)
      faits.push(`alignement : ${pct(partSurArete)} % des pixels du trait sur une arête ; contour de la silhouette tracé à ${pct(partContour)} % ; arêtes intérieures tracées à ${pct(partInterieures)} %`)
      if (partSurArete < PART_ALIGNEMENT) echecs.push(`RT-3 : ${pct(partSurArete)} % des pixels du trait sur une arête d'assemble.avif (dilatée de 3 px), 85 % au moins`)
      if (!nContour) echecs.push('RT-3 : aucune silhouette dans rendus/assemble.avif (rien à plus de 24 niveaux du fond)')
      else if (partContour < PART_CONTOUR) echecs.push(`RT-3 : le trait ne suit que ${pct(partContour)} % du contour de la silhouette assemblée, 70 % au moins (les arêtes visibles du tronçon assemblé)`)
      if (nInterieures && partInterieures < PART_INTERIEURES) echecs.push(`RT-3 : le trait ne suit que ${pct(partInterieures)} % des arêtes intérieures du rendu assemblé (nez de marche, jonctions, entailles), 60 % au moins : un trait de contour seul, ou des plis perdus sous le biseau`)

      // les extrémités des cotes, sur le dessin
      const distanceAuTrait = (px, py) => {
        let d = Infinity
        for (let y = Math.max(0, Math.floor(py - PROCHE_COTE)); y <= Math.min(H - 1, Math.ceil(py + PROCHE_COTE)); y++) for (let x = Math.max(0, Math.floor(px - PROCHE_COTE)); x <= Math.min(L - 1, Math.ceil(px + PROCHE_COTE)); x++) {
          if (trait.masque[y * L + x]) d = Math.min(d, Math.hypot(x - px, y - py))
        }
        return d
      }
      for (const cote of cotes) {
        const [d1, d2] = [[cote.x1, cote.y1], [cote.x2, cote.y2]].map(([x, y]) => distanceAuTrait(x * L, y * H))
        cote.distancesAuTraitPx = [d1, d2]
        const fmt = (d) => (Number.isFinite(d) ? `${d.toFixed(1)} px` : `plus de ${PROCHE_COTE} px`)
        faits.push(`cote « ${cote.texte} » : extrémités à ${fmt(d1)} et ${fmt(d2)} du trait`)
        if (Math.min(d1, d2) > COTE_VISIBLE || Math.max(d1, d2) > PROCHE_COTE) echecs.push(`RT-1 : cote « ${cote.texte} » : extrémités à ${fmt(d1)} et ${fmt(d2)} du trait (la plus proche à ${COTE_VISIBLE} px au plus, l'autre à ${PROCHE_COTE} px au plus : des points de l'objet dessiné)`)
      }

      // les images et les mesures du juge, pour l'œil de Claude Code
      fs.mkdirSync(JUGE, { recursive: true })
      const echapper = (s) => String(s).replace(/[<>&"]/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[ch]))
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${L}" height="${H}">${cotes.map((k) => {
        const [x1, y1, x2, y2] = [k.x1 * L, k.y1 * H, k.x2 * L, k.y2 * H]
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#D4A574" stroke-width="3"/><circle cx="${x1}" cy="${y1}" r="5" fill="#D4A574"/><circle cx="${x2}" cy="${y2}" r="5" fill="#D4A574"/><text x="${Math.max(x1, x2) + 14}" y="${(y1 + y2) / 2 + 9}" font-family="Arial, sans-serif" font-size="28" fill="#F4EDE2" stroke="#14110E" stroke-width="5" paint-order="stroke">${echapper(k.texte)}</text>`
      }).join('')}</svg>`
      const planche = path.join(JUGE, 'planche.jpg')
      await sharp(assembleF).flatten({ background: '#14110E' }).composite([{ input: await sharp(releveF).png().toBuffer() }, { input: Buffer.from(svg) }]).jpeg({ quality: 88 }).toFile(planche)
      const vue = Buffer.alloc(L * H * 3)
      const peindre = (i, [r, v, b]) => { vue[i * 3] = r; vue[i * 3 + 1] = v; vue[i * 3 + 2] = b }
      for (let i = 0; i < L * H; i++) {
        if (areteDilatee[i]) peindre(i, arete[i] ? [95, 95, 95] : [42, 42, 42])
        if (contour[i] && !traitDilate[i]) peindre(i, [70, 130, 255])
        if (interieure[i] && !traitDilate[i]) peindre(i, [255, 160, 30])
        if (trait.masque[i]) peindre(i, areteDilatee[i] ? [60, 205, 95] : [235, 60, 50])
      }
      const alignement = path.join(JUGE, 'alignement.jpg')
      await sharp(vue, { raw: { width: L, height: H, channels: 3 } }).jpeg({ quality: 88 }).toFile(alignement)
      Object.assign(mesures, {
        releve: { octets: taille(releveF), pixelsTrait: trait.opaques, medianeRvb: mediane },
        alignement: { seuilSobel: SEUIL_SOBEL, dilatationPx: DILATATION, partSurArete, partContourTrace: partContour, pixelsContour: nContour, seuilInterieur: SEUIL_INTERIEUR, pixelsInterieurs: nInterieures, partInterieuresTracees: partInterieures },
        rendus: { dossier: rel(REN), sha256: Object.fromEntries(RENDUS.map((f) => [f, empreinte(path.join(REN, f))])) },
      })
      for (const f of [planche, alignement]) if (taille(f) <= 0) echecs.push(`juge : ${rel(f)} vide`)
      faits.push(`à regarder : ${rel(planche)} (trait propre, cotes justes, posé sur le rendu) et ${rel(alignement)} (rouge : trait hors arête ; bleu, orange : contour, arêtes intérieures non tracés)`)
    }
  } else if (trait && trait.opaques) faits.push('RT-3 : alignement non mesuré (rendus/assemble.avif absent)')

  // ── RT-3 : le trait relancé par le juge dans Blender ────────────────────────────────────────────────────────
  let controle = null
  if (taille(scriptF) > 0) {
    const script = lire(scriptF)
    if (!/LINEART|use_freestyle/.test(script)) echecs.push('RT-3 : releve.py ne règle ni Freestyle (use_freestyle) ni un modificateur Line Art (LINEART)')
    if (/images\.load|shutil|copyfile/.test(script)) echecs.push('RT-3 : releve.py charge ou recopie une image (images.load, shutil, copyfile) : le trait sort du rendu de la scène')
    if (!fs.existsSync(BLENDER)) echecs.push(`RT-3 : Blender introuvable (${BLENDER}) : le trait ne peut pas être relancé`)
    else {
      const SORTIE_B = path.join(T, 'blender'), CONTROLE_PY = path.join(T, 'controle.py'), CONTROLE_JSON = path.join(T, 'controle.json')
      fs.mkdirSync(SORTIE_B, { recursive: true })
      fs.writeFileSync(CONTROLE_PY, CONTROLE)
      const surveilles = [releveF, releveJsonF, rapportF, plancheF, scriptF, ...RENDUS.map((f) => path.join(REN, f))]
      const avantRelance = surveilles.map(empreinte)
      const debut = Date.now()
      const b = spawnSync(BLENDER, ['--background', '--factory-startup', '--python-exit-code', '1', '--python', scriptF, '--python', CONTROLE_PY, '--', SORTIE_B], { cwd: R, encoding: 'utf8', timeout: 720000, maxBuffer: 1 << 28, windowsHide: true, env: { ...process.env, RELEVE_JUGE_JSON: releveJsonF, RELEVE_JUGE_SORTIE: CONTROLE_JSON } })
      const duree = Math.round((Date.now() - debut) / 1000)
      const touches = surveilles.filter((f, i) => empreinte(f) !== avantRelance[i])
      if (touches.length) echecs.push(`RT-3 : releve.py relancé a écrit dans la preuve (${touches.map((f) => path.basename(f)).join(', ')}) : il n'écrit que dans le dossier passé après « -- »`)
      const journal = `${b.stdout || ''}${b.stderr || ''}`
      if (b.error || b.status !== 0) {
        const erreurs = journal.split(/\r?\n/).filter((l) => /Error|Traceback|rror:/.test(l)).slice(-2).join(' | ')
        echecs.push(`RT-3 : releve.py relancé par le juge en échec après ${duree} s (${b.error ? premiereLigne(b.error) : `code ${b.status}`}${erreurs ? ` : ${erreurs.slice(0, 200)}` : ''})`)
      } else faits.push(`releve.py relancé par le juge dans Blender (--background --factory-startup) en ${duree} s`)
      try { controle = JSON.parse(lire(CONTROLE_JSON)) } catch { if (!b.error && b.status === 0) echecs.push('RT-3 : le contrôle de la scène n\'a pas tourné après releve.py (le script quitte-t-il Blender ?)') }
      if (controle) {
        if (controle.erreurs?.length && taille(releveJsonF) > 0) echecs.push(`RT-3 : contrôle de la scène interrompu (${String(controle.erreurs[0]).trim().split('\n').pop().slice(0, 160)})`)
        const cam = controle.camera
        faits.push(`scène de releve.py : caméra ${cam ? `${cam.type}, échelle ${cam.ortho_scale}, ${cam.x} × ${cam.y} à ${cam.pourcent} %` : 'absente'} ; Freestyle ${controle.freestyle ? 'actif' : 'inactif'} ; Line Art ${controle.lineart ? 'présent' : 'absent'}`)
        if (!cam) echecs.push('RT-3 : la scène de releve.py n\'a pas de caméra')
        else {
          if (cam.type !== 'ORTHO') echecs.push(`RT-3 : caméra de releve.py ${cam.type}, orthographique (ORTHO) attendue, celle de 021-04`)
          if (cam.x !== L || cam.y !== H || cam.pourcent !== 100) echecs.push(`RT-3 : releve.py rend en ${cam.x} × ${cam.y} à ${cam.pourcent} %, 1400 × 1050 à 100 % attendu`)
        }
        if (!controle.freestyle && !controle.lineart) echecs.push('RT-3 : la scène de releve.py ne trace ni par Freestyle (scene.render.use_freestyle et view_layer.use_freestyle) ni par un modificateur Line Art')
      }
      const png = path.join(SORTIE_B, 'releve.png')
      if (!b.error && b.status === 0 && taille(png) <= 0) echecs.push('RT-3 : releve.py relancé n\'a pas écrit releve.png dans le dossier passé après « -- »')
      else if (taille(png) > 0 && trait) {
        try {
          const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
          if (info.width !== L || info.height !== H) echecs.push(`RT-3 : releve.png relancé en ${info.width} × ${info.height}, 1400 × 1050 attendu`)
          else {
            const relance = new Uint8Array(L * H)
            for (let i = 0; i < L * H; i++) relance[i] = data[i * 4 + 3] > 128 ? 1 : 0
            const nRelance = compter(relance), relanceD = dilater(relance, 1), traitD = dilater(trait.masque, 1)
            let a = 0, r2 = 0
            for (let i = 0; i < L * H; i++) { if (trait.masque[i] && relanceD[i]) a++; if (relance[i] && traitD[i]) r2++ }
            const partLivre = trait.opaques ? a / trait.opaques : 0, partRelance = nRelance ? r2 / nRelance : 0
            mesures.concordance = { pixelsRelances: nRelance, partLivreSurRelance: partLivre, partRelanceSurLivre: partRelance, dureeS: duree }
            faits.push(`concordance avec le trait relancé : ${pct(partLivre)} % des pixels de releve.avif et ${pct(partRelance)} % des ${nRelance} pixels relancés à 1 px au plus l'un de l'autre`)
            if (!nRelance) echecs.push('RT-3 : le trait relancé par le juge est vide (aucun pixel d\'alpha > 128)')
            else if (Math.min(partLivre, partRelance) < CONCORDANCE) echecs.push(`RT-3 : releve.avif ne redonne pas le trait de releve.py relancé : ${pct(partLivre)} % de ses pixels et ${pct(partRelance)} % des pixels relancés à 1 px l'un de l'autre, 90 % au moins dans les deux sens (le trait sort de Blender, pas d'un dessin)`)
          }
        } catch (e) { echecs.push(`RT-3 : releve.png relancé illisible (${premiereLigne(e)})`) }
      }
    }
  }

  // ── RT-1 : les cotes dans la scène ───────────────────────────────────────────────────────────────────────────
  const ecarts = []
  for (const cote of cotes) {
    if (!controle) break
    const k = (controle.cotes || []).find((x) => x && x.texte === cote.texte)
    if (!k) { echecs.push(`RT-1 : cote « ${cote.texte} » non lue par le contrôle de la scène`); continue }
    if (k.erreur) { echecs.push(`RT-1 : cote « ${cote.texte} » non vérifiable dans la scène (${String(k.erreur).slice(0, 140)})`); continue }
    if (Array.isArray(k.projete)) {
      const e = Math.max(...[cote.x1, cote.y1, cote.x2, cote.y2].map((v, i) => Math.abs(v - k.projete[i])))
      faits.push(`cote « ${cote.texte} » : projection de a et b par la caméra de releve.py à ${e.toFixed(4)} de x1, y1, x2, y2`)
      if (e > TOL_PROJECTION) echecs.push(`RT-1 : cote « ${cote.texte} » : x1, y1, x2, y2 à ${e.toFixed(4)} de la projection de a et b par la caméra de releve.py (0,002 au plus : des points projetés par Blender)`)
    }
    if (!k.trouvee) echecs.push(`RT-1 : cote « ${cote.texte} » : pas d'objet maillé « ${cote.piece} » dans la scène de releve.py`)
    else if (Array.isArray(k.distances_mm)) {
      const dmax = Math.max(...k.distances_mm.map((d) => (typeof d === 'number' ? d : Infinity)))
      faits.push(`cote « ${cote.texte} » : a et b à ${Number.isFinite(dmax) ? `${dmax.toFixed(2)} mm` : '?'} au plus de la surface de « ${cote.piece} » ; longueur dans le modèle ${Number(k.longueur_mm).toFixed(1)} mm`)
      if (!(dmax <= TOL_SURFACE_MM)) echecs.push(`RT-1 : cote « ${cote.texte} » : a ou b à ${Number.isFinite(dmax) ? `${dmax.toFixed(1)} mm` : 'une distance inconnue'} de la surface de « ${cote.piece} » (2 mm au plus : des points de l'objet)`)
    }
    const nominal = parseFloat(cote.texte)
    if (typeof k.longueur_mm === 'number' && Number.isFinite(nominal) && Math.abs(k.longueur_mm - nominal) > ECART_COTE_MM) ecarts.push(`« ${cote.texte} » mesure ${k.longueur_mm.toFixed(1)} mm dans le modèle`)
  }
  if (cotes.length && !controle && taille(scriptF) > 0) faits.push('cotes : non vérifiées dans la scène (contrôle de releve.py absent)')
  if (ecarts.length) {
    if (rapport !== null && !/^#+[^\n]*[ée]carts?/im.test(rapport)) echecs.push(`RT-1 : ${ecarts.join(', ')}, et rapport.md n'a pas de section « Écarts » qui le dit`)
    else faits.push(`écart consigné au rapport : ${ecarts.join(', ')}`)
  }
  if (Object.keys(mesures).length > 1) {
    mesures.cotes = cotes.map(({ texte, piece, a, b, x1, y1, x2, y2, longueur, distancesAuTraitPx }) => ({ texte, piece, a, b, x1, y1, x2, y2, longueurPx: longueur, distancesAuTraitPx, scene: (controle?.cotes || []).find((x) => x && x.texte === texte) || null }))
    fs.mkdirSync(JUGE, { recursive: true })
    fs.writeFileSync(path.join(JUGE, 'mesures.json'), JSON.stringify(mesures, null, 1))
  }

  // ── RT-6 : la recopie dans le site ───────────────────────────────────────────────────────────────────────────
  if (!fs.existsSync(ECL) || !fs.statSync(ECL).isDirectory()) echecs.push(`RT-6 : ${rel(ECL)}/ absent : rien n'est recopié dans le site`)
  else {
    const entrees = fs.readdirSync(ECL, { withFileTypes: true })
    const enTrop = entrees.filter((e) => !e.isFile() || !RECOPIE.includes(e.name)).map((e) => (e.isFile() ? e.name : `${e.name}/`))
    const absents = RECOPIE.filter((n) => taille(path.join(ECL, n)) <= 0)
    if (enTrop.length) echecs.push(`RT-6 : en trop dans ${rel(ECL)}/ : ${enTrop.slice(0, 8).join(', ')}`)
    if (absents.length) echecs.push(`RT-6 : absents ou vides dans ${rel(ECL)}/ : ${absents.join(', ')}`)
    const source = (n) => (n.startsWith('releve.') ? path.join(P, n) : path.join(REN, n))
    const differentes = [...RENDUS, 'releve.avif', 'releve.json'].filter((n) => taille(path.join(ECL, n)) > 0 && empreinte(path.join(ECL, n)) !== empreinte(source(n)))
    if (differentes.length) echecs.push(`RT-6 : sha256 différent de la preuve (${rel(REN)}/ ou ${rel(P)}/) : ${differentes.join(', ')}`)
    else if (!absents.length) faits.push('recopie : les 9 fichiers de rendu et de relevé ont le sha256 de la preuve')
    const attrF = path.join(ECL, 'attributions.json')
    if (taille(attrF) > 0) {
      let attr = null
      try { attr = JSON.parse(lire(attrF)) } catch (e) { echecs.push(`RT-6 : attributions.json illisible (${premiereLigne(e)})`) }
      if (attr !== null) {
        if (!Array.isArray(attr) || !attr.length) echecs.push('RT-6 : attributions.json doit être une liste d\'entrées')
        else {
          const fautives = attr.filter((a) => !a || a.type !== 'rendu' || a.auteur !== 'Presti' || a.licence !== LICENCE)
          if (fautives.length) echecs.push(`RT-6 : ${fautives.length} entrée(s) d'attributions.json sans "type": "rendu", "auteur": "Presti" et "licence": "${LICENCE}"`)
          const attendus = [...AVIF, 'releve.avif'].map((n) => `eclate/${n}`).sort()
          const fichiers = attr.map((a) => String(a && a.fichier)).sort()
          if (JSON.stringify(fichiers) !== JSON.stringify(attendus)) echecs.push(`RT-6 : attributions.json → "fichier" ${fichiers.join(', ').slice(0, 300)} ; une entrée par AVIF attendue : ${attendus.join(', ')}`)
          else if (!fautives.length) faits.push(`attributions.json : ${attr.length} entrées « rendu », une par AVIF`)
        }
      }
    }

    // le générateur accepte les attributions ; la copie générée est servie, et Chromium lit les AVIF
    if (!absents.length) {
      const generer = (familles, sortie) => {
        const r = spawnSync(process.execPath, [path.join(DEMOS, 'generer.mjs'), 'lestraque', `--sortie=${sortie}`, `--familles=${familles}`], { cwd: R, encoding: 'utf8', timeout: 180000, maxBuffer: 1 << 26, windowsHide: true })
        return { code: r.status, derniere: `${r.stdout || ''}${r.stderr || ''}`.trim().split('\n').pop() || '' }
      }
      const SORTIE = path.join(T, 'site')
      let g = generer('eclate', SORTIE)
      if (g.code !== 0) { await attendre(2000); g = generer('eclate', SORTIE) }
      if (ECLATE_ESSAI) faits.push(`essai --eclate : le générateur lit ${rel(path.join(SITE, 'eclate', 'attributions.json'))}, pas ${rel(attrF)} : acceptation des attributions non jugée`)
      if (g.code === 0) faits.push(`génération --familles=eclate réussie, dans ${rel(SORTIE)} (portée : attributions lues et écartées des photos ; famille encore vide avant 021-05)`)
      else {
        const ref = generer('', path.join(T, 'reference'))
        const kit = fs.readdirSync(path.join(DEMOS, '_kit', 'familles')).filter((f) => f.startsWith('eclate.'))
        if (ref.code === 0) echecs.push(`RT-6 : le générateur refuse la famille eclate et ses attributions, alors qu'il génère sans famille (${g.derniere.slice(0, 200)})${kit.length ? ` ; fichiers de la famille dans le kit : ${kit.join(', ')}` : ''}`)
        else faits.push(`génération impossible avec et sans famille (${g.derniere.slice(0, 160)}) : générateur cassé par une autre tâche, acceptation des attributions non jugée`)
      }
      const racine = g.code === 0 ? SORTIE : SITE
      const TYPES = { html: 'text/html; charset=utf-8', css: 'text/css', js: 'text/javascript', avif: 'image/avif', webp: 'image/webp', jpg: 'image/jpeg', png: 'image/png', json: 'application/json', svg: 'image/svg+xml', woff2: 'font/woff2' }
      const srv = http.createServer((q, r) => {
        let p = decodeURIComponent(new URL(q.url, 'http://x').pathname)
        if (p === '/__juge.html') { r.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return r.end('<!doctype html><meta charset="utf-8"><title>juge</title>') }
        if (p.endsWith('/')) p += 'index.html'
        const candidats = ECLATE_ESSAI && p.startsWith('/eclate/') ? [path.join(ECL, p.slice('/eclate/'.length))] : [path.join(racine, p), path.join(SITE, p)]
        const f = candidats.find((x) => taille(x) >= 0)
        if (!f) { r.writeHead(404); return r.end() }
        r.writeHead(200, { 'content-type': TYPES[path.extname(f).slice(1)] || 'application/octet-stream', 'cache-control': 'no-store' })
        fs.createReadStream(f).pipe(r)
      })
      await new Promise((ok) => srv.listen(0, '127.0.0.1', ok))
      const nav = await chromium.launch()
      try {
        const page = await nav.newPage()
        await page.goto(`http://127.0.0.1:${srv.address().port}/__juge.html`, { waitUntil: 'load' })
        const noms = [...AVIF, 'releve.avif']
        const attendu = {}
        for (const n of noms) { try { const m = await sharp(source(n)).metadata(); attendu[n] = { sha: empreinte(source(n)), l: m.width, h: m.height } } catch { attendu[n] = { sha: empreinte(source(n)), l: null, h: null } } }
        const lireServis = (liste) => page.evaluate(async (liste) => {
          const out = {}
          for (const n of liste) {
            try {
              const rep = await fetch(`eclate/${n}`, { cache: 'no-store' })
              const octets = await rep.arrayBuffer()
              const sha = [...new Uint8Array(await crypto.subtle.digest('SHA-256', octets))].map((b) => b.toString(16).padStart(2, '0')).join('')
              const img = new Image()
              img.src = `eclate/${n}`
              await img.decode()
              out[n] = { statut: rep.status, sha, l: img.naturalWidth, h: img.naturalHeight }
            } catch (e) { out[n] = { erreur: String((e && e.message) || e) } }
          }
          return out
        }, liste)
        const defauts = (lu) => noms.filter((n) => { const x = lu[n] || {}; return x.erreur || x.statut !== 200 || x.sha !== attendu[n].sha || x.l !== attendu[n].l || x.h !== attendu[n].h })
        let lu = await lireServis(noms), fautifs = defauts(lu)
        if (fautifs.length) { await attendre(2000); const relu = await lireServis(fautifs); lu = { ...lu, ...relu }; fautifs = defauts(lu) }
        if (fautifs.length) echecs.push(`RT-6 : servis depuis la copie générée, ${fautifs.map((n) => `${n} (${lu[n]?.erreur ? `non décodé : ${lu[n].erreur.slice(0, 80)}` : `statut ${lu[n]?.statut}, ${lu[n]?.l} × ${lu[n]?.h}${lu[n]?.sha !== attendu[n].sha ? ', octets différents de la preuve' : ''}`})`).join(', ')}`)
        else faits.push(`Chromium : les ${noms.length} AVIF servis depuis ${rel(racine)} répondent 200, gardent le sha256 de la preuve et se décodent (${lu['assemble.avif'].l} × ${lu['assemble.avif'].h} pour assemble.avif)`)
      } finally {
        await nav.close()
        srv.close()
      }
    }
  }

  // ── RT-7 : rien d'autre sous public/ ────────────────────────────────────────────────────────────────────────
  const AVANT_ORCH = path.join(ORCH, 'en-cours', '021-22.avant.txt'), AVANT_PREUVE = path.join(P, 'avant.txt')
  const normaliser = (t) => t.replace(/\r\n/g, '\n').trim()
  let avantF = null
  if (taille(AVANT_ORCH) >= 0) {
    avantF = AVANT_ORCH
    if (taille(AVANT_PREUVE) >= 0 && normaliser(lire(AVANT_PREUVE)) !== normaliser(lire(AVANT_ORCH))) echecs.push(`RT-7 : avant.txt de la preuve modifié : ${rel(AVANT_PREUVE)} diffère de .orchestre/en-cours/021-22.avant.txt, écrit par l'orchestre à la prise (c'est lui qui fait foi)`)
  } else if (taille(AVANT_PREUVE) >= 0) {
    avantF = AVANT_PREUVE
    faits.push(`RT-7 : .orchestre/en-cours/021-22.avant.txt absent (verdict rejoué après la fin de la tâche) : ${rel(AVANT_PREUVE)} lu à sa place`)
  }
  if (!avantF) echecs.push(`RT-7 : avant.txt introuvable (.orchestre/en-cours/021-22.avant.txt, ${rel(AVANT_PREUVE)}) : la tâche n'a pas été prise par l'orchestre`)
  else {
    const avant = cheminsPorcelaine(lire(avantF))
    const dejaLa = (p) => avant.some((a) => a === p || (a.endsWith('/') && p.startsWith(a)))
    const tempsAvant = fs.statSync(avantF).mtimeMs
    // les autres tâches : en-cours/, et fait/ ou refuse/ quand elles ont un verdict depuis la prise
    const recentes = new Set()
    const V = path.join(ORCH, 'verdicts.jsonl')
    for (const l of taille(V) > 0 ? lire(V).split(/\r?\n/) : []) { try { const v = JSON.parse(l); if (v && v.id && Date.parse(v.date) >= tempsAvant - 1000) recentes.add(v.id) } catch { /* ligne illisible */ } }
    const etroits = [], larges = [], lues = []
    let regeneration = false
    for (const d of ['en-cours', 'fait', 'refuse']) {
      const dir = path.join(ORCH, d)
      if (!fs.existsSync(dir)) continue
      for (const f of fs.readdirSync(dir).filter((x) => /^\d{3}-[\w-]+\.md$/.test(x))) {
        const txt = lire(path.join(dir, f))
        const id = (txt.match(/^id:\s*(\S+)/m) || [])[1] || f.replace(/\.md$/, '')
        if (id === '021-22' || (d !== 'en-cours' && !recentes.has(id))) continue
        const m = txt.match(/^perimetre:\s*\[(.*)\]\s*$/m)
        if (!m) continue
        lues.push(id)
        for (const g of decouperListe(m[1])) {
          if (!g.startsWith('public/')) continue
          let re
          try { re = globVersRegex(g) } catch { continue }
          if (/^public\/sites-demo\/(?:_kit\/|generer\.mjs|lestraque\/(?:site|contenu)\.json)/.test(g)) regeneration = true
          if (SONDES.some((s) => re.test(s))) { larges.push({ id, g, re }); regeneration = true } else etroits.push({ id, g, re })
        }
      }
    }
    const statut = () => {
      const r = spawnSync('git', ['-c', 'core.quotepath=false', 'status', '--porcelain', '--untracked-files=all', '--', 'public'], { cwd: R, encoding: 'utf8', maxBuffer: 1 << 26, windowsHide: true })
      if (r.status !== 0) return null
      return cheminsPorcelaine(r.stdout || '').filter((p) => p.startsWith('public/') && p !== 'public/sites-demo/generer.mjs' && !p.startsWith('public/sites-demo/lestraque/eclate/') && !dejaLa(p))
    }
    const classer = (liste) => {
      const restants = [], ecartes = {}
      let sorties = 0
      for (const p of liste) {
        const e = etroits.find((x) => x.re.test(p))
        if (e) { ecartes[e.id] = (ecartes[e.id] || 0) + 1; continue }
        if (regeneration && SORTIES.test(p)) { sorties++; continue }
        const ids = [...new Set(larges.filter((x) => x.re.test(p)).map((x) => x.id))]
        restants.push({ p, texte: ids.length ? `${p} (dans le périmètre large de ${ids.join(', ')} : à trancher)` : p })
      }
      return { restants, ecartes, sorties }
    }
    let liste = statut()
    if (liste === null) echecs.push('RT-7 : git status impossible')
    else {
      let c = classer(liste)
      if (c.restants.length) {
        await attendre(2000)
        const encore = statut()
        if (encore) { const s = new Set(encore); liste = liste.filter((p) => s.has(p)); c = classer(liste) }
      }
      const ecartes = Object.entries(c.ecartes).map(([id, n]) => `${n} de ${id}`)
      if (c.sorties) ecartes.push(`${c.sorties} sortie(s) de régénération`)
      faits.push(`RT-7 : ${c.restants.length} fichier(s) nouveau(x) ou modifié(s) sous public/ depuis ${rel(avantF)} ; écartés : ${ecartes.join(', ') || 'aucun'} ; périmètres lus : ${lues.join(', ') || 'aucun'}${larges.length ? ` ; trop larges pour écarter : ${larges.map((x) => `${x.id} (${x.g})`).join(', ')}` : ''}`)
      if (c.restants.length) echecs.push(`RT-7 : nouveaux ou modifiés sous public/ hors lestraque/eclate/ : ${c.restants.slice(0, 6).map((x) => x.texte).join(', ')}${c.restants.length > 6 ? ` (et ${c.restants.length - 6} autres)` : ''}`)
    }
  }
}

try { await juger() } catch (e) { echecs.push(`juge interrompu : ${premiereLigne(e)}`) }
fin()
