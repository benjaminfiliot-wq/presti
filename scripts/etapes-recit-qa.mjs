// scripts/etapes-recit-qa.mjs — le juge de la tâche 021-16 : le récit dans la scène des étapes de la démo Atelier Lestraque
// (cahier de la vague 5, .orchestre/preuves/021-00/cahier-vague-5.md, §3.4 C et D, §3.1 « le récit principal est porté par
// les étapes », §6.0, §6.4 ER-1 à ER-7, §6.10 « etapes-recit-film.mp4 », fiche « 021-16 » du §7.2 ; Q-C tranchée par Claude Code
// le 15/09 à 16 h 02, decisions.md : « Tout commence par votre demande. »). 021-16 s'ajoute à 021-05 (même famille « eclate »,
// mêmes trois fichiers) : ce juge mesure ce qu'ajoute 021-16, puis enchaîne scripts/eclate-qa.mjs (EC-1 à EC-16), qui doit
// rester vert.
//
// Génération isolée (§6.0), jamais en place : deux copies sous .orchestre/travail/etapes-recit-qa-<pid>/ (supprimées à la sortie) :
// « eclate » (node public/sites-demo/generer.mjs lestraque --sortie=… --familles=<familles de da.json>,eclate) et « référence »
// (--familles=<familles de da.json>). Servies en brotli avec les en-têtes de production (next.config.mjs, CSP comprise).
// Chromium de Playwright sans carte graphique. Le juge capture, filme et mesure lui-même.
//
// Positions : plage « contain » de #etapes, y = haut(#etapes) + p × (hauteur(#etapes) − innerHeight), scrollTo instantané, 2 rAF
// (§6.0). Centres des paliers C1 = 14,56 ; C2 = 43,75 ; C3 = 66,25 ; C4 = 90,44 % (§0.3 point 5). Formats de bureau : 1440×900
// et 1088×800 (ER-1), dpr 1, mouvement permis.
//
//   F     _kit/familles/eclate.mjs, eclate.bureau.css et eclate.css présents et non vides ; aucun eclate.js (§3.4 C « Aucune ligne
//         de JavaScript » ; 021-16 écrit dans les fichiers de 021-05, §3.4 D « Fichiers »).
//   D     lestraque/eclate/eclate.json lisible, 5 étiquettes ; lestraque/eclate/releve.json lisible, cotes « 40 mm » et « 17 mm »
//         exactement (§3.4 B, recopiés par 021-22) : les textes attendus viennent de là.
//   ER-1  capture de la boîte div.eclate__rendu aux centres C1 à C4, 1440×900 et 1088×800 ; écart moyen (gris, 160 px de large,
//         |a − b|/255, §0.1) entre centres consécutifs ≥ 0,05 pour C1/C2, C2/C3 et C3/C4.
//   ER-2  à C1 : trois lignes de la fiche, textes exacts « Votre projet — Escalier », « Commune — Rennes », « Quand — Dans les trois
//         mois », chacune visible ≥ 0,98 ; libellés et options identiques à ceux du formulaire de l'accueil généré (label de
//         devis-projet, devis-commune, devis-delai et une option de chaque select) ; relevé (img releve.avif) et rendu
//         (img.eclate__assemble, img.eclate__calque, img.eclate__eclate) ≤ 0,02.
//   ER-3  à C2 : relevé releve.avif (img ou fond CSS) ≥ 0,98 et décodé ; cotes « 40 mm » et « 17 mm » ≥ 0,98 ; fiche ≤ 0,02.
//   ER-4  aucun prix dans le texte de la scène à tous les états : aucune correspondance de /\d[\d\s]*(€|euros?)/i, ni dans le HTML
//         généré de la figure et de la légende (textes, aria-label, alt, title), ni dans le DOM (textContent et attributs), ni dans
//         l'innerText de la figure à C1, C2, C3 et C4.
//   ER-4n à C3, « le devis » : les cinq étiquettes d'eclate.json numérotées 1 à 5 dans l'ordre d'eclate.json, chacune visible
//         ≥ 0,98 (§3.4 D, tableau, ligne C3).
//   ER-5  à C4 : phrase finale, texte exact « Tout commence par votre demande. », visible ≥ 0,98, dans la figure ; ni a, ni button,
//         ni role link/button, ni tabindex, sur elle, dedans ou autour ; nombre de a[href*="#contact"] dans #etapes = référence ;
//         phrase ≥ 0,98 aussi à 90,0 et à 100 % (§3.4 D : « pleine avant la tenue et le reste jusqu'à 100 % ») et ≤ 0,02 à
//         86,94 % (elle n'entre qu'à 87,44) ; nav-retenue : si scripts/nav-retenue-qa.mjs accepte --dossier=, il est lancé sur la
//         copie « eclate » et doit passer ; sinon, sa mesure appelsVisibles (reprise telle quelle) est faite sur la copie
//         « eclate », 1440×900 et 1280×800 : de haut(#etapes) − innerHeight à bas(#etapes), tous les 150 px, exactement un appel
//         visible.
//   ER-6  un seul texte en mouvement : de 29,125 à 35,875 % (pas de 0,5 %, bornes comprises), à 1440×900 et 1088×800, chaque nœud
//         de texte de la figure (hors compteur) : son opacité visible ou sa position dans la figure change de plus de 0,05 ou de
//         plus de 2 px (seuils de T-10), d'un relevé au suivant ou depuis le premier ; seuls les textes de la fiche peuvent bouger ;
//         les cotes « 40 mm » et « 17 mm » restent ≤ 0,02 à chaque relevé.
//   ER-7  téléphone (390×844, dpr 3, tactile), mouvement réduit (1440×900) et hauteur 1440×640 (contextes d'EC-6), après
//         défilement de toute la page : 0 requête de releve.avif ; figure à l'écran : img eclate.avif visible ≥ 0,98 et décodée ;
//         ol.eclate__legende de 5 lignes rendues (≥ 0,98) ; fiche, relevé et cote « 17 mm » non affichés (≤ 0,02, hors écran
//         compris). Sans JavaScript (1440×900), même défilement : 0 requête de releve.avif ; fiche, relevé et cote « 17 mm » non
//         affichés.
//   ER-S  un seul état à la fois (§3.4 D : « un seul à la fois ») : à C1, cotes, étiquettes et phrase ≤ 0,02 ; à C2, étiquettes
//         et phrase ≤ 0,02 ; à C3, fiche, relevé, cotes « 40 mm »/« 17 mm » et phrase ≤ 0,02 ; à C4, fiche, relevé, cotes et
//         étiquettes ≤ 0,02.
//   ER-C  lisibilité des textes ajoutés, crème sur noir : lignes de la fiche à C1 et phrase à C4, taille de police ≥ 14 px et
//         contraste p10 ≥ 4,5 (méthode du texte translucide du §0.1, boîtes des mots par Range.getClientRects, texte rendu
//         transparent par le juge ; seuil et taille : §3.4 C « Contraste des étiquettes et de la cote », EC-13).
//   CSP   §5.3 et §6.0 : 0 événement securitypolicyviolation et 0 message de console CSP, sur tous les contextes.
//   PR    §6.0 et §6.10 : .orchestre/preuves/021-16/juge/ : mesures.json ; etapes-recit-c<k>-<format>.jpg (8 captures ER-1) ;
//         etapes-recit-planche.jpg (écart-type du gris ≥ 8) ; etapes-recit-film.mp4 (16 s ± 0,1, 15 images/s positionnées une à
//         une, 1440×900, traversée de #etapes de 0 à 100 %, image du milieu d'écart-type du gris ≥ 8) ; aucun fichier de 0 octet.
//   EC    node scripts/eclate-qa.mjs : PASS (EC-1 à EC-16, Lighthouse téléphone compris : §5.1 range 021-16 parmi les tâches qui
//         mesurent la médiane par leur juge, et EC-10 la mesure).
//
// Choix du juge (le cahier ne tranche pas) :
//   - « Familles déjà fusionnées » = lestraque.familles de da.json au moment du jugement (sans « eclate ») ; --base=a,b la remplace.
//   - Figure = #etapes figure.etapes__photo.eclate (§3.4 C) ; scène = cette figure ; « dans la boîte du rendu » = centre de
//     l'élément dans div.eclate__rendu à 2 px près.
//   - Un texte est trouvé par son contenu, pas par sa classe : l'élément le plus profond dont le textContent, espaces réduits,
//     vaut exactement le texte attendu (plusieurs candidats : le plus visible compte). La fiche porte le tiret cadratin tel que
//     le cahier l'écrit (« Votre projet — Escalier ») dans le DOM ; une étiquette numérotée est le plus profond élément qui
//     vaut /^0?k\s*[.·)\-–—:]?\s*<texte>$/ : le numéro peut être dans l'élément de l'étiquette ou dans un élément voisin, sous un
//     parent commun (eclate-qa.mjs, EC-1, veut le texte de .eclate__etiquette égal à celui d'eclate.json : le voisin le permet).
//     Le relevé est un img de la figure dont la source se termine par releve.avif, ou un élément de la figure (ou son ::before,
//     ::after) dont l'image de fond calculée est releve.avif ; « décodée » = img complete et naturalWidth > 0, ou, pour un fond,
//     une entrée resource timing de releve.avif terminée. Sans JavaScript, Chrome charge d'emblée un img loading="lazy" (le
//     chargement paresseux n'existe que si les scripts sont actifs, vu à l'essai du juge le 15/09) : pour tenir ER-7, le relevé
//     doit être un fond CSS déclaré sous html.js.
//   - Visibilité d'un élément = produit des opacités calculées jusqu'à la racine × part de sa boîte laissée par les clip-path
//     (inset, polygon en boîte englobante) et les overflow hidden/clip de ses ancêtres, et par l'écran ; 0 si display:none sur la
//     chaîne ou visibility non « visible ». fill-opacity des SVG non comptée.
//   - ER-1 : boîte de la capture = div.eclate__rendu coupée par l'écran ; la réduction garde la hauteur de la capture de C1.
//   - ER-6 : le compteur (.eclate__compteur) est hors du compte : il passe à « 02 » à 32,5 % (§3.4 C) et le §2 le range parmi les
//     mouvements secondaires de la liste ; un texte invisible (≤ 0,02) aux deux relevés comparés ne compte pas ; « textes de la
//     fiche » = nœuds de texte dans le plus petit ancêtre commun des trois lignes (s'il n'est ni la figure, ni la boîte du rendu,
//     ni un conteneur d'img), ou dans une ligne.
//   - ER-5 : la barre retenue n'est re-mesurée que sur #etapes, là où 021-16 ajoute la phrase ; le reste de la page est le
//     domaine de nav-retenue-qa et d'EC-16.
//   - ER-7 : « non affiché » compte hors écran (le visiteur peut défiler). Sans JavaScript, la page garde html.no-js (kit.js:7) :
//     ce qu'ajoute 021-16 doit dépendre de html.js. L'éclaté fixe et la légende n'y sont pas exigés : eclate-qa.mjs (EC-2, choix
//     « Sans JavaScript ») lit la ligne « Sans JavaScript » du §3.4 C (« rien ne dépend de JavaScript ») comme la scène de 021-05
//     chorégraphiée à C3 JavaScript coupé ; deux juges enchaînés ne doivent pas se contredire, et ce qu'ajoute 021-16 (fiche,
//     relevé, requête de releve.avif) reste jugé.
//   - Un élément en display: contents (sans boîte) vaut son enfant le plus visible : un numéro et son étiquette peuvent vivre
//     dans un parent commun sans boîte.
//   - ER-C : l'élément reçoit color, -webkit-text-fill-color transparent et text-shadow none par le CSSOM (pas de balise style :
//     la CSP la refuserait), le temps d'une capture de l'écran ; couleur du texte = -webkit-text-fill-color calculée.
//   - Machine chargée : chaque état, chaque série ER-6, chaque position du relais et chaque contexte ER-7 en défaut est remesuré
//     une fois après 2 s ; une génération en échec est refaite après 2 s (le générateur peut être en cours d'écriture par une autre
//     tâche) ; les deux copies sont générées l'une après l'autre, avec le même kit : aucune comparaison ne dépend du kit.
//   - EC : eclate-qa.mjs est lancé tel quel (sa propre génération isolée, faite juste après celle-ci, avec le même kit) ;
//     --base= lui est transmis s'il le connaît ; délai : ce qui reste sur 29 min (le vérificateur d'une tâche est coupé à son
//     budget, 30 min au plus, orchestre.mjs:317), 3 min au moins.
//   - Sans figure.eclate dans la génération (021-05 pas encore là), aucune mesure de navigateur n'est possible : ER-1 à ER-7 sont
//     en échec d'un bloc, et le juge sort vite.
//
// Contrôles à l'œil, non jugés ici (§6.10, Claude Code puis Benj) : etapes-recit-film.mp4 — la demande, le relevé, le devis, la
// pose : un seul changement à la fois ; la phrase finale ; etapes-recit-planche.jpg — la fiche se lit comme la demande du
// formulaire, le trait est propre et coté, les numéros se lisent comme des lignes de devis, la phrase est posée seule sous
// l'escalier remonté. Le « un seul changement à la fois » hors des textes (fiche, trait, calques) ne se voit que sur le film.
//
// Usage : node scripts/etapes-recit-qa.mjs [--base=a,b]
//   Essai du juge seulement : --sources=<copie de public/sites-demo> (générateur, _kit, _polices, lestraque) et --preuve=<dossier> ;
//   en essai, eclate-qa n'est pas enchaîné et le verdict ne peut pas être PASS.
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chromium } from 'playwright'
import sharp from 'sharp'

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DEMOS = path.join(R, 'public', 'sites-demo')
const option = (nom) => { const a = process.argv.find((x) => x.startsWith(`--${nom}=`)); return a === undefined ? null : a.slice(nom.length + 3) }
const SRC = option('sources') ? path.resolve(option('sources')) : DEMOS
const ESSAI = path.resolve(SRC) !== path.resolve(DEMOS)
const PREUVE = option('preuve') ? path.resolve(option('preuve')) : path.join(R, '.orchestre', 'preuves', '021-16', 'juge')
const T = path.join(R, '.orchestre', 'travail', `etapes-recit-qa-${process.pid}`)
process.on('exit', () => { try { fs.rmSync(T, { recursive: true, force: true }) } catch { /* déjà parti */ } })
for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => process.exit(1))
const T0 = Date.now()

const C = [14.56, 43.75, 66.25, 90.44]
const FORMATS = [[1440, 900], [1088, 800]]
const PHRASE = 'Tout commence par votre demande.'
const FORM = [['devis-projet', 'Votre projet', 'Escalier'], ['devis-commune', 'Commune', 'Rennes'], ['devis-delai', 'Quand', 'Dans les trois mois']]
const FICHE = FORM.map(([, l, v]) => `${l} — ${v}`)
const COTES = ['40 mm', '17 mm']
const ETIQ_021_04 = ['Limon à la française', 'Entailles', 'Marche en chêne, 40 mm', 'Contremarche', 'Vis']
const PRIX = /\d[\d\s]*(€|euros?)/i
const FONDU = [...Array.from({ length: 14 }, (_, j) => 29.125 + 0.5 * j), 35.875]

const ORDRE = ['F', 'D', 'GEN', 'ER-1', 'ER-2', 'ER-3', 'ER-4', 'ER-4n', 'ER-5', 'ER-6', 'ER-7', 'ER-S', 'ER-C', 'CSP', 'PR', 'EC', 'JUGE']
const pb = {}, faits = [], mesures = { date: new Date().toISOString(), sources: SRC, essai: ESSAI }
const noter = (id, texte) => { (pb[id] ||= []).push(texte) }
const f2 = (v) => (typeof v === 'number' ? v.toFixed(2).replace('.', ',') : String(v))
const fmt = (w, h) => `${w}×${h}`
function fin() {
  if (ESSAI) noter('EC', 'essai (--sources) : eclate-qa non enchaîné, verdict non valable')
  const echecs = []
  for (const id of [...ORDRE, ...Object.keys(pb).filter((k) => !ORDRE.includes(k))]) {
    const l = pb[id]; if (!l || !l.length) continue
    echecs.push(`${id} : ${l.slice(0, 4).join(' ; ')}${l.length > 4 ? ` (et ${l.length - 4} autre(s))` : ''}`)
  }
  try { fs.mkdirSync(PREUVE, { recursive: true }); fs.writeFileSync(path.join(PREUVE, 'mesures.json'), JSON.stringify({ ...mesures, dureeS: Math.round((Date.now() - T0) / 1000), echecs, faits }, null, 1)) } catch { /* preuve impossible : PR le dira au prochain tour */ }
  console.log(faits.map((f) => `  · ${f}`).join('\n'))
  console.log(echecs.length
    ? `✗ récit dans la scène : FAIL — ${echecs.join(' ; ')}`
    : '✓ récit dans la scène : PASS — la demande, le relevé coté, le devis numéroté sans prix et la pose se succèdent dans la même boîte, un seul texte bouge à la fois, la phrase finale reste un texte seul, rien au téléphone ni sans JavaScript, et eclate-qa reste vert')
  process.exitCode = echecs.length ? 1 : 0
}
const lire = (f) => { try { return fs.readFileSync(f, 'utf8') } catch { return '' } }
const taille = (f) => { try { return fs.statSync(f).size } catch { return -1 } }
const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms))
const decoder = (s) => String(s || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, '\'').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()

// ── F et D : les fichiers de la famille et les données recopiées par 021-22 ─────────────────────────────────────────────
const FAM = path.join(SRC, '_kit', 'familles')
for (const f of ['eclate.mjs', 'eclate.bureau.css', 'eclate.css']) if (taille(path.join(FAM, f)) <= 0) noter('F', `_kit/familles/${f} absent ou vide`)
if (fs.existsSync(path.join(FAM, 'eclate.js'))) noter('F', '_kit/familles/eclate.js existe (§3.4 C : aucune ligne de JavaScript)')
let ETIQ = ETIQ_021_04
{
  const ej = path.join(SRC, 'lestraque', 'eclate', 'eclate.json'), rj = path.join(SRC, 'lestraque', 'eclate', 'releve.json')
  try {
    const e = JSON.parse(fs.readFileSync(ej, 'utf8'))
    const t = (e.etiquettes || []).map((x) => String(x.texte || '').replace(/\s+/g, ' ').trim())
    if (t.length !== 5 || t.some((x) => !x)) noter('D', `eclate.json : ${t.length} étiquette(s) lisible(s), 5 attendues`)
    else ETIQ = t
  } catch { noter('D', 'lestraque/eclate/eclate.json absent ou illisible (recopié par 021-22)') }
  try {
    const r = JSON.parse(fs.readFileSync(rj, 'utf8'))
    const t = (r.cotes || []).map((x) => String(x.texte || '').replace(/\s+/g, ' ').trim()).sort()
    if (t.join('|') !== [...COTES].sort().join('|')) noter('D', `releve.json : cotes ${t.map((x) => `« ${x} »`).join(', ') || 'aucune'}, « 40 mm » et « 17 mm » attendues`)
  } catch { noter('D', 'lestraque/eclate/releve.json absent ou illisible (recopié par 021-22)') }
}
mesures.etiquettes = ETIQ

// ── génération des deux copies ─────────────────────────────────────────────────────────────────────────────────────────
function generer(sortie, familles) {
  const un = () => { const r = spawnSync(process.execPath, [path.join(SRC, 'generer.mjs'), 'lestraque', `--sortie=${sortie}`, `--familles=${familles.join(',')}`], { cwd: R, encoding: 'utf8', timeout: 240000 }); return { code: r.status, sortie: `${r.stdout || ''}${r.stderr || ''}`.trim() } }
  let g = un()
  if (g.code !== 0) { spawnSync(process.execPath, ['-e', 'setTimeout(()=>{},2000)']); g = un() }
  return g
}
let base = []
{
  const argBase = option('base')
  const lireDa = () => JSON.parse(fs.readFileSync(path.join(SRC, '_kit', 'da.json'), 'utf8')).lestraque.familles || []
  try { base = argBase !== null ? argBase.split(',').map((x) => x.trim()).filter(Boolean) : (() => { try { return lireDa() } catch { spawnSync(process.execPath, ['-e', 'setTimeout(()=>{},2000)']); return lireDa() } })() } catch (e) { noter('GEN', `da.json illisible (${e.message.slice(0, 120)})`); fin(); process.exit() }
  base = base.filter((f) => f !== 'eclate')
}
const ECL = path.join(T, 'eclate'), REF = path.join(T, 'reference')
fs.mkdirSync(T, { recursive: true })
{
  const ge = generer(ECL, [...base, 'eclate'])
  if (ge.code !== 0) {
    const gr = generer(REF, base)
    noter('GEN', gr.code !== 0 ? `le générateur échoue aussi sans « eclate » (${gr.sortie.split('\n').pop().slice(0, 200)}) : cassé par une autre tâche, rien n'est jugé` : `génération --familles=${[...base, 'eclate'].join(',')} en échec : ${ge.sortie.split('\n').pop().slice(0, 240)}`)
    fin(); process.exit()
  }
  const gr = generer(REF, base)
  if (gr.code !== 0) { noter('GEN', `génération de référence --familles=${base.join(',')} en échec : ${gr.sortie.split('\n').pop().slice(0, 240)}`); fin(); process.exit() }
}
faits.push(`copies générées : eclate (--familles=${[...base, 'eclate'].join(',')}) et référence (--familles=${base.join(',')})`)

// ── HTML généré : figure, formulaire, prix, liens ──────────────────────────────────────────────────────────────────────
const htmlE = lire(path.join(ECL, 'index.html')), htmlR = lire(path.join(REF, 'index.html'))
const section = (html, id) => { const i = html.indexOf(`id="${id}"`); if (i < 0) return ''; const d = html.lastIndexOf('<section', i); const f = html.indexOf('</section>', i); return f < 0 ? '' : html.slice(d, f + 10) }
const etE = section(htmlE, 'etapes'), etR = section(htmlR, 'etapes')
const classes = (tag) => ((/\bclass="([^"]*)"/.exec(tag) || [])[1] || '').split(/\s+/)
const figureTag = (etE.match(/<figure\b[^>]*>/g) || []).find((t) => classes(t).includes('eclate') && classes(t).includes('etapes__photo'))
const figureHtml = figureTag ? etE.slice(etE.indexOf(figureTag), etE.indexOf('</figure>', etE.indexOf(figureTag)) + 9) : ''
const legendeHtml = ((etE.match(/<ol\b[^>]*class="[^"]*\beclate__legende\b[^"]*"[^>]*>[\s\S]*?<\/ol>/g)) || []).join(' ')
{
  // ER-2 : les textes de la fiche sont ceux du formulaire de l'accueil généré
  const contact = section(htmlE, 'contact') || htmlE
  for (const [id, libelle, valeur] of FORM) {
    const lab = decoder((new RegExp(`<label for="${id}">([\\s\\S]*?)</label>`).exec(contact) || [])[1])
    const sel = (new RegExp(`<select id="${id}"[^>]*>([\\s\\S]*?)</select>`).exec(contact) || [])[1] || ''
    const opts = [...sel.matchAll(/<option[^>]*>([\s\S]*?)<\/option>/g)].map((m) => decoder(m[1]))
    if (lab !== libelle) noter('ER-2', `formulaire : le libellé de #${id} est « ${lab || 'absent'} », la fiche attend « ${libelle} »`)
    if (!opts.includes(valeur)) noter('ER-2', `formulaire : #${id} n'a pas l'option « ${valeur} »`)
  }
  // ER-4 : HTML de la figure et de la légende
  const attrs = (s) => [...s.matchAll(/\b(?:aria-label|alt|title)="([^"]*)"/g)].map((m) => m[1]).join(' ')
  const texteHtml = `${decoder(figureHtml)} ${attrs(figureHtml)} ${decoder(legendeHtml)} ${attrs(legendeHtml)}`
  const prix = PRIX.exec(texteHtml)
  if (prix) noter('ER-4', `prix dans le HTML de la scène : « ${prix[0]} »`)
  // ER-5 : aucun lien vers #contact ajouté dans #etapes
  const contacts = (s) => (s.match(/<a\b[^>]*href="[^"]*#contact[^"]*"/g) || []).length
  if (contacts(etE) !== contacts(etR)) noter('ER-5', `${contacts(etE)} lien(s) vers #contact dans #etapes, ${contacts(etR)} dans la référence`)
  mesures.html = { figure: !!figureTag, figureOctets: figureHtml.length, legende: !!legendeHtml, contactsEtapes: [contacts(etE), contacts(etR)] }
}

// ── page : relevés de la scène (fonction envoyée au navigateur, autonome) ─────────────────────────────────────────────────
function scene(o) {
  const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim()
  const vw = innerWidth, vh = innerHeight
  const sec = document.querySelector('#etapes')
  const fig = sec && (sec.querySelector('figure.etapes__photo.eclate') || sec.querySelector('.eclate'))
  const R0 = (r) => ({ l: r.left, t: r.top, r: r.right, b: r.bottom })
  const inter = (a, b) => ({ l: Math.max(a.l, b.l), t: Math.max(a.t, b.t), r: Math.min(a.r, b.r), b: Math.min(a.b, b.b) })
  const aire = (a) => Math.max(0, a.r - a.l) * Math.max(0, a.b - a.t)
  const px = (v, ref) => (/%$/.test(v) ? (parseFloat(v) / 100) * ref : parseFloat(v) || 0)
  const decoupe = (n, cs) => {
    const cp = String(cs.clipPath || 'none').trim()
    if (cp === 'none') return null
    const r = n.getBoundingClientRect()
    let m = /^inset\((.*)\)/.exec(cp)
    if (m) { const v = m[1].split(/\s+round\s+/)[0].trim().split(/\s+/); const [t, d = t, b = t, g = d] = v; return { l: r.left + px(g, r.width), t: r.top + px(t, r.height), r: r.right - px(d, r.width), b: r.bottom - px(b, r.height) } }
    m = /^polygon\((.*)\)/.exec(cp)
    if (m) { const pts = m[1].replace(/^(nonzero|evenodd)\s*,/, '').split(',').map((c) => { const [x, y] = c.trim().split(/\s+/); return [r.left + px(x, r.width), r.top + px(y, r.height)] }); const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); return { l: Math.min(...xs), t: Math.min(...ys), r: Math.max(...xs), b: Math.max(...ys) } }
    return null
  }
  const vis = (el, ecran = true) => {
    if (!el) return 0
    const cs0 = getComputedStyle(el)
    if (cs0.display === 'contents') { let o = 1; for (let n = el.parentElement; n && n.nodeType === 1; n = n.parentElement) if (getComputedStyle(n).display === 'none') o = 0; return o ? [...el.children].reduce((m, c) => Math.max(m, vis(c, ecran)), 0) : 0 }
    const r0 = R0(el.getBoundingClientRect()), a0 = aire(r0)
    if (a0 < 0.5) return 0
    if (cs0.visibility !== 'visible') return 0
    let zone = r0, op = 1
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = n === el ? cs0 : getComputedStyle(n)
      if (cs.display === 'none') return 0
      op *= Number(cs.opacity)
      const c = decoupe(n, cs); if (c) zone = inter(zone, c)
      if (n !== el && n !== document.body && n !== document.documentElement && /hidden|clip/.test(`${cs.overflowX} ${cs.overflowY}`)) zone = inter(zone, R0(n.getBoundingClientRect()))
    }
    if (ecran) zone = inter(zone, { l: 0, t: 0, r: vw, b: vh })
    return Math.max(0, op * Math.min(1, aire(zone) / a0))
  }
  const tous = fig ? [...fig.querySelectorAll('*')] : []
  const plusProfonds = (l) => l.filter((e) => !l.some((x) => x !== e && e.contains(x)))
  const chercher = (pred, dans = tous) => plusProfonds(dans.filter((e) => pred(norm(e.textContent))))
  const echap = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const reNum = (t, k) => new RegExp(`^0?${k}\\s*[.·)\\-–—:]?\\s*${echap(t)}$`)
  const meilleur = (els, ecran = true) => els.reduce((m, e) => Math.max(m, vis(e, ecran)), 0)
  const plusVisible = (els) => els.reduce((m, e) => (!m || vis(e) > vis(m) ? e : m), null)
  const boite = fig && fig.querySelector('.eclate__rendu')
  const rb = boite ? R0(boite.getBoundingClientRect()) : null
  const dedans = (e) => { if (!rb || !e) return false; const r = e.getBoundingClientRect(), x = (r.left + r.right) / 2, y = (r.top + r.bottom) / 2; return x >= rb.l - 2 && x <= rb.r + 2 && y >= rb.t - 2 && y <= rb.b + 2 }
  const police = (e) => (e ? parseFloat(getComputedStyle(e).fontSize) || 0 : 0)
  const texte = (t) => { const els = chercher((s) => s === t), e = plusVisible(els); return { texte: t, n: els.length, vis: meilleur(els), visTout: meilleur(els, false), dansRendu: dedans(e), police: police(e) } }
  const fiche = o.fiche.map(texte), cotes = o.cotes.map(texte)
  const etiquettes = o.etiquettes.map((t, i) => { const num = chercher((s) => reNum(t, i + 1).test(s)); const toutes = chercher((s) => s === t || reNum(t, i + 1).test(s) || (s.endsWith(t) && s.length <= t.length + 6)); return { texte: t, numero: i + 1, nNum: num.length, visNum: meilleur(num), vis: meilleur(toutes) } })
  const dansSec = sec ? [...sec.querySelectorAll('*')] : []
  const phrases = plusProfonds(dansSec.filter((e) => norm(e.textContent) === o.phrase))
  const ph = plusVisible(phrases)
  const LIEN = 'a,button,[role="link"],[role="button"]'
  const phrase = { n: phrases.length, vis: meilleur(phrases), visTout: meilleur(phrases, false), dansFigure: !!(ph && fig && fig.contains(ph)), lien: phrases.some((e) => e.closest(LIEN) || e.querySelector(LIEN) || e.hasAttribute('tabindex') || e.querySelector('[tabindex]')), police: police(ph) }
  const imgs = fig ? [...fig.querySelectorAll('img')] : []
  const srcDe = (i) => i.currentSrc || i.getAttribute('src') || ''
  const img = (els) => ({ n: els.length, vis: meilleur(els), visTout: meilleur(els, false), charge: els.length > 0 && els.some((i) => getComputedStyle(i).display !== 'none' && i.complete && i.naturalWidth > 0) })
  // le relevé : un img de releve.avif, ou une image de fond CSS (élément, ::before, ::after) — sans JavaScript, un img « lazy »
  // est chargé d'emblée (le chargement paresseux n'existe que si les scripts sont actifs), ER-7 pousse donc vers le fond CSS
  const fondReleve = (e) => [null, '::before', '::after'].some((ps) => { const cs = getComputedStyle(e, ps); return /releve\.avif/.test(`${cs.backgroundImage} ${ps ? cs.content : ''}`) })
  const fondsReleve = tous.filter((e) => e.tagName !== 'IMG' && fondReleve(e))
  const releveRecu = performance.getEntriesByType('resource').some((x) => /\/releve\.avif([?#]|$)/.test(x.name) && x.responseEnd > 0)
  const releve = img([...imgs.filter((i) => /(^|\/)releve\.avif([?#]|$)/.test(srcDe(i))), ...fondsReleve])
  releve.charge = releve.n > 0 && (releve.charge || (fondsReleve.length > 0 && releveRecu))
  const rendu = {
    assemble: img(imgs.filter((i) => i.classList.contains('eclate__assemble'))),
    calques: img(imgs.filter((i) => i.classList.contains('eclate__calque'))),
    repli: img(imgs.filter((i) => i.classList.contains('eclate__eclate'))),
    releve,
    fixe: img(imgs.filter((i) => /(^|\/)eclate\/eclate\.avif([?#]|$)/.test(srcDe(i)) || i.classList.contains('eclate__eclate'))),
  }
  const enAttente = imgs.filter((i) => getComputedStyle(i).display !== 'none' && vis(i, false) > 0 && !i.complete).length + (fondsReleve.some((e) => vis(e, false) > 0) && !releveRecu ? 1 : 0)
  const legendes = sec ? [...sec.querySelectorAll('ol.eclate__legende')] : []
  const legende = legendes.map((ol) => { const li = [...ol.querySelectorAll(':scope > li')]; return { n: li.length, min: li.reduce((m, x) => Math.min(m, vis(x, false)), li.length ? 1 : 0) } })
  const attributs = (e) => [e, ...e.querySelectorAll('*')].map((x) => ['aria-label', 'alt', 'title'].map((a) => x.getAttribute(a) || '').join(' ')).join(' ')
  const texteScene = [fig, ...legendes].filter(Boolean).map((e) => `${e.textContent} ${attributs(e)}`).join(' ')
  const texteVisible = fig ? fig.innerText : ''
  const nums = sec ? [...sec.querySelectorAll('.etape__num')] : []
  const pleine = nums.findIndex((n) => vis(n, false) >= 0.98) + 1
  const textes = []
  if (fig && o.textes) {
    const lignes = o.fiche.map((t) => plusVisible(chercher((s) => s === t))).filter(Boolean)
    let cont = null
    if (lignes.length === o.fiche.length) { cont = lignes[0]; while (cont && !lignes.every((l) => cont.contains(l))) cont = cont.parentElement; if (!cont || cont === fig || cont === boite || !fig.contains(cont) || cont.querySelector('img')) cont = null }
    const fr = fig.getBoundingClientRect()
    const tw = document.createTreeWalker(fig, NodeFilter.SHOW_TEXT)
    let id = 0
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      if (!norm(n.data)) continue
      const el = n.parentElement
      if (!el || el.closest('.eclate__compteur')) continue
      let groupe = cont && cont.contains(el) ? 'fiche' : null
      for (let a = el; !groupe && a && a !== fig; a = a.parentElement) {
        const s = norm(a.textContent)
        if (o.fiche.includes(s)) groupe = 'fiche'
        else if (o.cotes.includes(s)) groupe = `cote « ${s} »`
        else if (s === o.phrase) groupe = 'phrase'
        else { const k = o.etiquettes.findIndex((t, i) => s === t || reNum(t, i + 1).test(s)); if (k >= 0) groupe = `étiquette ${k + 1}` }
      }
      const rg = document.createRange(); rg.selectNodeContents(n); const b = rg.getBoundingClientRect()
      textes.push({ id: id++, groupe: groupe || `texte « ${norm(n.data).slice(0, 24)} »`, vis: vis(el), x: b.left - fr.left, y: b.top - fr.top })
    }
  }
  return { vw, vh, figure: !!fig, rendu: rb, fiche, cotes, etiquettes, phrase, img: rendu, enAttente, legende, texteScene, texteVisible, pleine, textes }
}

/** Rend transparents les textes visés (CSSOM, pas de balise style : CSP) et renvoie les boîtes de leurs mots et leur couleur. */
function preparerContraste(o) {
  const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim()
  const sec = document.querySelector('#etapes')
  const fig = sec && (sec.querySelector('figure.etapes__photo.eclate') || sec.querySelector('.eclate'))
  window.__erSauve = []
  if (!fig) return []
  const l = [...fig.querySelectorAll('*')].filter((e) => o.textes.includes(norm(e.textContent)))
  const els = l.filter((e) => !l.some((x) => x !== e && e.contains(x)))
  const zones = []
  for (const e of els) {
    const tw = document.createTreeWalker(e, NodeFilter.SHOW_TEXT)
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      if (!norm(n.data)) continue
      const cs = getComputedStyle(n.parentElement)
      const rg = document.createRange(); rg.selectNodeContents(n)
      for (const r of rg.getClientRects()) if (r.width > 0 && r.height > 0) zones.push({ texte: norm(e.textContent), l: r.left, t: r.top, r: r.right, b: r.bottom, couleur: cs.webkitTextFillColor || cs.color })
    }
    for (const x of [e, ...e.querySelectorAll('*')]) {
      window.__erSauve.push([x, ['color', '-webkit-text-fill-color', 'text-shadow'].map((p) => [p, x.style.getPropertyValue(p), x.style.getPropertyPriority(p)])])
      x.style.setProperty('color', 'transparent', 'important'); x.style.setProperty('-webkit-text-fill-color', 'transparent', 'important'); x.style.setProperty('text-shadow', 'none', 'important')
    }
  }
  return zones
}
function restaurerContraste() { for (const [x, props] of window.__erSauve || []) for (const [p, v, pr] of props) { if (v) x.style.setProperty(p, v, pr); else x.style.removeProperty(p) } window.__erSauve = [] }

/** La mesure de nav-retenue-qa.mjs (appelsVisibles), reprise telle quelle. */
const appelsVisibles = (page) => page.evaluate(() => {
  const vus = []
  for (const el of document.querySelectorAll('a[href^="tel:"], a[href*="#contact"], a.bouton, a.nav__devis, button.burger')) {
    if (el.closest('#panneau')) continue
    const r = el.getBoundingClientRect()
    if (r.width < 4 || r.height < 4 || r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth) continue
    let op = 1, cache = false
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const cs = getComputedStyle(n)
      if (cs.display === 'none' || cs.visibility === 'hidden') { cache = true; break }
      op *= Number(cs.opacity)
    }
    if (cache || op < 0.2) continue
    const x = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), y = Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2))
    const dessus = document.elementFromPoint(x, y)
    if (!dessus || !(el === dessus || el.contains(dessus))) continue
    vus.push({ texte: (el.textContent || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 30), barre: !!el.closest('header'), devis: el.classList.contains('nav__devis') })
  }
  return vus
})

// ── serveur brotli avec les en-têtes de production ────────────────────────────────────────────────────────────────────
async function entetesProduction() {
  const conf = (await import(pathToFileURL(path.join(R, 'next.config.mjs')).href)).default
  const strict = (await conf.headers()).find((r) => r.source.startsWith('/((?!site'))
  const entetes = strict.headers.filter((h) => h.key !== 'Strict-Transport-Security')
    .map((h) => (h.key === 'Content-Security-Policy' ? { key: h.key, value: h.value.split(';').map((d) => d.trim()).filter((d) => d && d !== 'upgrade-insecure-requests').join('; ') } : h))
  if (!entetes.some((h) => h.key === 'Content-Security-Policy')) throw new Error('CSP absente de la route stricte de next.config.mjs')
  return entetes
}
const TYPES = { html: 'text/html; charset=utf-8', css: 'text/css; charset=utf-8', js: 'text/javascript; charset=utf-8', json: 'application/json', svg: 'image/svg+xml', xml: 'application/xml', txt: 'text/plain; charset=utf-8', webp: 'image/webp', avif: 'image/avif', jpg: 'image/jpeg', png: 'image/png', woff2: 'font/woff2', mp4: 'video/mp4' }
const TEXTES = new Set(['html', 'css', 'js', 'json', 'svg', 'xml', 'txt'])
async function servir(dossier, entetes) {
  const cache = new Map()
  const srv = http.createServer((q, r) => {
    let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'
    const f = [path.join(dossier, p), path.join(SRC, 'lestraque', p), path.join(SRC, p)].find((x) => fs.existsSync(x) && fs.statSync(x).isFile())
    if (!f) { r.writeHead(404); return r.end() }
    const ext = path.extname(f).slice(1), h = { 'content-type': TYPES[ext] || 'application/octet-stream' }
    for (const { key, value } of entetes) h[key] = value
    if (TEXTES.has(ext) && /\bbr\b/.test(q.headers['accept-encoding'] || '')) {
      if (!cache.has(f)) cache.set(f, zlib.brotliCompressSync(fs.readFileSync(f), { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }))
      h['content-encoding'] = 'br'; h.vary = 'Accept-Encoding'
      r.writeHead(200, h); return r.end(cache.get(f))
    }
    r.writeHead(200, h); fs.createReadStream(f).pipe(r)
  })
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok))
  return { base: `http://127.0.0.1:${srv.address().port}`, fermer: () => new Promise((ok) => srv.close(ok)) }
}

// ── outils de mesure côté Node ──────────────────────────────────────────────────────────────────────────────────────────
const O = { fiche: FICHE, cotes: COTES, etiquettes: ETIQ, phrase: PHRASE }
const rafs = (page) => page.evaluate(() => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok))))
async function positionner(page, p) {
  await page.evaluate((v) => { const e = document.querySelector('#etapes'); if (!e) return; const r = e.getBoundingClientRect(); scrollTo({ top: Math.round(r.top + scrollY + v * (r.height - innerHeight)), behavior: 'instant' }) }, p / 100)
  await rafs(page)
}
async function relever(page, p, textes = false) {
  await positionner(page, p)
  let m = await page.evaluate(scene, { ...O, textes })
  for (let t = Date.now(); m.enAttente > 0 && Date.now() - t < 8000;) { await page.waitForTimeout(150); m = await page.evaluate(scene, { ...O, textes }) }
  if (m.enAttente > 0) { await rafs(page); m = await page.evaluate(scene, { ...O, textes }) }
  return m
}
const lin = (c) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
const quantile = (l, q) => { if (!l.length) return 0; const s = [...l].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.max(0, Math.floor(q * (s.length - 1))))] }
async function contraste(page, textes) {
  const zones = await page.evaluate(preparerContraste, { textes })
  let png
  try { await rafs(page); await page.waitForTimeout(80); png = await page.screenshot({ type: 'png' }) } finally { await page.evaluate(restaurerContraste).catch(() => {}) }
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const s = info.width / (await page.evaluate(() => innerWidth))
  const par = new Map()
  for (const z of zones) {
    const c = String(z.couleur).match(/[\d.]+/g)?.map(Number) || [0, 0, 0]
    const [ri, gi, bi] = [lin(c[0]), lin(c[1]), lin(c[2])], a = c.length > 3 ? c[3] : 1
    const l = par.get(z.texte) || []
    for (let y = Math.max(0, Math.floor(z.t * s)); y < Math.min(info.height, Math.ceil(z.b * s)); y++) {
      for (let x = Math.max(0, Math.floor(z.l * s)); x < Math.min(info.width, Math.ceil(z.r * s)); x++) {
        const i = (y * info.width + x) * info.channels
        const fr = lin(data[i]), fg = lin(data[i + 1]), fb = lin(data[i + 2])
        const Lf = 0.2126 * fr + 0.7152 * fg + 0.0722 * fb
        const Le = 0.2126 * (a * ri + (1 - a) * fr) + 0.7152 * (a * gi + (1 - a) * fg) + 0.0722 * (a * bi + (1 - a) * fb)
        l.push((Math.max(Lf, Le) + 0.05) / (Math.min(Lf, Le) + 0.05))
      }
    }
    par.set(z.texte, l)
  }
  return [...par].map(([texte, l]) => ({ texte, p10: quantile(l, 0.1), pixels: l.length }))
}
const gris = async (png, H) => sharp(png).removeAlpha().resize(160, H, { fit: 'fill' }).grayscale().raw().toBuffer()
const ecart = (a, b) => { if (!a || !b || a.length !== b.length) return null; let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length / 255 }
const ecartType = async (f) => { try { return (await sharp(f).removeAlpha().grayscale().stats()).channels[0].stdev } catch { return 0 } }

// ── jugement d'un état ─────────────────────────────────────────────────────────────────────────────────────────────────
function defautsEtat(k, m, lieu) {
  const d = []
  const bas = (id, nom, v) => { if (v > 0.02) d.push([id, `${lieu} : ${nom} à ${f2(v)} (≤ 0,02)`]) }
  const haut = (id, nom, v) => { if (v < 0.98) d.push([id, `${lieu} : ${nom} à ${f2(v)} (≥ 0,98)`]) }
  if (!m.figure) return [['ER-2', `${lieu} : figure.eclate absente`]]
  const maxEtiq = Math.max(0, ...m.etiquettes.map((e) => e.vis)), maxCotes = Math.max(0, ...m.cotes.map((c) => c.vis)), maxFiche = Math.max(0, ...m.fiche.map((f) => f.vis))
  const P = PRIX.exec(m.texteVisible || '')
  if (P) d.push(['ER-4', `${lieu} : prix visible « ${P[0]} »`])
  if (k === 0) {
    for (const f of m.fiche) {
      if (!f.n) d.push(['ER-2', `${lieu} : ligne « ${f.texte} » introuvable dans la scène`])
      else { haut('ER-2', `ligne « ${f.texte} »`, f.vis); if (f.vis >= 0.98 && !f.dansRendu) d.push(['ER-2', `${lieu} : ligne « ${f.texte} » hors de la boîte du rendu`]) }
    }
    bas('ER-2', 'relevé', m.img.releve.vis); bas('ER-2', 'assemble.avif', m.img.assemble.vis); bas('ER-2', 'calques', m.img.calques.vis); bas('ER-2', 'eclate.avif (repli)', m.img.repli.vis)
    bas('ER-S', 'cotes', maxCotes); bas('ER-S', 'étiquettes', maxEtiq); bas('ER-S', 'phrase finale', m.phrase.vis)
  } else if (k === 1) {
    if (!m.img.releve.n) d.push(['ER-3', `${lieu} : aucun img releve.avif dans la scène`])
    else { haut('ER-3', 'releve.avif', m.img.releve.vis); if (!m.img.releve.charge) d.push(['ER-3', `${lieu} : releve.avif pas décodée`]) }
    for (const c of m.cotes) { if (!c.n) d.push(['ER-3', `${lieu} : cote « ${c.texte} » introuvable`]); else { haut('ER-3', `cote « ${c.texte} »`, c.vis); if (c.vis >= 0.98 && !c.dansRendu) d.push(['ER-3', `${lieu} : cote « ${c.texte} » hors de la boîte du rendu`]) } }
    bas('ER-3', 'fiche', maxFiche)
    bas('ER-S', 'étiquettes', maxEtiq); bas('ER-S', 'phrase finale', m.phrase.vis)
  } else if (k === 2) {
    for (const e of m.etiquettes) { if (!e.nNum) d.push(['ER-4n', `${lieu} : étiquette « ${e.texte} » sans le numéro ${e.numero}`]); else haut('ER-4n', `étiquette ${e.numero} « ${e.texte} »`, e.visNum) }
    bas('ER-S', 'fiche', maxFiche); bas('ER-S', 'relevé', m.img.releve.vis); bas('ER-S', 'cotes', maxCotes); bas('ER-S', 'phrase finale', m.phrase.vis)
  } else {
    if (!m.phrase.n) d.push(['ER-5', `${lieu} : phrase « ${PHRASE} » introuvable dans #etapes`])
    else {
      haut('ER-5', 'phrase finale', m.phrase.vis)
      if (!m.phrase.dansFigure) d.push(['ER-5', `${lieu} : la phrase finale est hors de la figure`])
      if (m.phrase.lien) d.push(['ER-5', `${lieu} : la phrase finale est (ou contient) un lien, un bouton ou un élément focalisable`])
    }
    bas('ER-S', 'fiche', maxFiche); bas('ER-S', 'relevé', m.img.releve.vis); bas('ER-S', 'cotes', maxCotes); bas('ER-S', 'étiquettes', maxEtiq)
  }
  return d
}

/** ER-6 : groupes de textes qui bougent dans une série de relevés. */
function mouvements(serie) {
  const bouges = new Map(), cotesVues = []
  const premier = new Map((serie[0]?.m.textes || []).map((t) => [t.id, t]))
  for (let i = 0; i < serie.length; i++) {
    const { p, m } = serie[i]
    for (const t of m.textes) if (/^cote/.test(t.groupe) && t.vis > 0.02) cotesVues.push(`${t.groupe} à ${f2(t.vis)} (${f2(p)} %)`)
    if (!i) continue
    const avant = new Map(serie[i - 1].m.textes.map((t) => [t.id, t]))
    for (const t of m.textes) {
      for (const [u, depuis] of [[avant.get(t.id), serie[i - 1].p], [premier.get(t.id), serie[0].p]]) {
        if (!u || Math.max(u.vis, t.vis) <= 0.02) continue
        if ((Math.abs(u.vis - t.vis) > 0.05 || Math.hypot(u.x - t.x, u.y - t.y) > 2) && !bouges.has(t.groupe)) bouges.set(t.groupe, `${f2(depuis)} → ${f2(p)} %`)
      }
    }
  }
  return { bouges: [...bouges].filter(([g]) => g !== 'fiche'), tous: [...bouges], cotesVues }
}

// ── navigateur ─────────────────────────────────────────────────────────────────────────────────────────────────────────
let nav, srvE
const csp = []
const initCsp = () => { window.__erCsp = []; document.addEventListener('securitypolicyviolation', (e) => window.__erCsp.push(`${e.violatedDirective} ${e.blockedURI}`), true) }
async function ouvrir(options = {}) {
  const ctx = await nav.newContext({ reducedMotion: 'no-preference', ...options })
  const page = await ctx.newPage()
  const j = { requetes: [], enVol: 0, dernier: Date.now(), erreurs: [] }
  if (options.javaScriptEnabled !== false) await page.addInitScript(initCsp)
  page.on('console', (msg) => { if (msg.type() === 'error' && /Content[- ]Security[- ]Policy/i.test(msg.text())) csp.push(msg.text().slice(0, 160)) })
  page.on('pageerror', (e) => j.erreurs.push(String(e.message).slice(0, 120)))
  ctx.on('request', (q) => { j.enVol++; j.dernier = Date.now(); j.requetes.push(new URL(q.url()).pathname) })
  const finie = () => { j.enVol = Math.max(0, j.enVol - 1); j.dernier = Date.now() }
  ctx.on('requestfinished', finie); ctx.on('requestfailed', finie)
  await page.goto(`${srvE.base}/index.html`, { waitUntil: 'load' })
  return { ctx, page, j, js: options.javaScriptEnabled !== false }
}
async function fermer(o) {
  if (o.js) { try { csp.push(...(await o.page.evaluate(() => window.__erCsp || []))) } catch { /* page fermée */ } }
  if (o.j.erreurs.length) faits.push(`exceptions de page (non jugées ici) : ${[...new Set(o.j.erreurs)].slice(0, 2).join(' | ')}`)
  await o.ctx.close().catch(() => {})
}
const repos = async (o, calme = 800, max = 10000) => { const t = Date.now(); while (Date.now() - t < max && !(o.j.enVol === 0 && Date.now() - o.j.dernier >= calme)) await o.page.waitForTimeout(100) }

try {
  if (!figureTag) {
    noter('ER-1', `aucune figure.etapes__photo.eclate dans #etapes de la génération --familles=${[...base, 'eclate'].join(',')} : la scène de 021-05 n'existe pas, ER-1 à ER-7 ne sont pas mesurables`)
  } else {
    let entetes
    try { entetes = await entetesProduction() } catch (e) { noter('JUGE', `en-têtes de production illisibles : ${e.message}`); throw new Error('arrêt') }
    srvE = await servir(ECL, entetes)
    nav = await chromium.launch()
    fs.mkdirSync(PREUVE, { recursive: true })
    mesures.formats = {}
    const captures = {}

    for (const [w, h] of FORMATS) {
      const lieuF = fmt(w, h), M = (mesures.formats[lieuF] = { centres: [] })
      const o = await ouvrir({ viewport: { width: w, height: h } })
      const { page } = o
      await page.waitForTimeout(1200)
      for (let p = 0; p <= 100; p += 10) { await positionner(page, p); await page.waitForTimeout(120) }
      await repos(o)

      // ER-2, ER-3, ER-4, ER-4n, ER-5, ER-S aux centres ; ER-1 : captures
      const png = []
      for (let k = 0; k < 4; k++) {
        const lieu = `${lieuF} C${k + 1}`
        let m = await relever(page, C[k]), d = defautsEtat(k, m, lieu)
        if (d.length) { await page.waitForTimeout(2000); m = await relever(page, C[k]); d = defautsEtat(k, m, lieu) }
        for (const [id, t] of d) noter(id, t)
        if (PRIX.test(m.texteScene)) noter('ER-4', `${lieu} : prix dans le DOM de la scène (« ${PRIX.exec(m.texteScene)[0]} »)`)
        M.centres.push({ c: C[k], pleine: m.pleine, fiche: m.fiche.map((f) => f.vis), releve: m.img.releve.vis, assemble: m.img.assemble.vis, calques: m.img.calques.vis, cotes: m.cotes.map((c) => c.vis), etiquettesNumerotees: m.etiquettes.map((e) => e.visNum), phrase: m.phrase.vis, rendu: m.rendu })
        if (m.pleine && m.pleine !== k + 1) faits.push(`${lieu} : étape pleine de la liste n° ${m.pleine} (EC-3 la juge)`)
        if (!m.rendu) { noter('ER-1', `${lieu} : boîte div.eclate__rendu absente`); png.push(null); continue }
        const x = Math.max(0, Math.floor(m.rendu.l)), y = Math.max(0, Math.floor(m.rendu.t)), r = Math.min(m.vw, Math.ceil(m.rendu.r)), b = Math.min(m.vh, Math.ceil(m.rendu.b))
        if (r - x < 20 || b - y < 20) { noter('ER-1', `${lieu} : boîte du rendu hors de l'écran`); png.push(null); continue }
        const buf = await page.screenshot({ type: 'png', clip: { x, y, width: r - x, height: b - y } })
        const fichier = path.join(PREUVE, `etapes-recit-c${k + 1}-${w}x${h}.jpg`)
        await sharp(buf).jpeg({ quality: 86 }).toFile(fichier)
        png.push(buf); (captures[lieuF] ||= []).push(fichier)
        if (k === 0 && m.fiche.every((f) => f.vis >= 0.98)) {
          const cs = await contraste(page, FICHE)
          M.contrasteFiche = cs
          for (const f of m.fiche) if (f.police < 14) noter('ER-C', `${lieu} : ligne « ${f.texte} » en ${f2(f.police)} px (≥ 14)`)
          for (const t of FICHE) { const c = cs.find((x) => x.texte === t); if (!c || !c.pixels) noter('ER-C', `${lieu} : contraste de « ${t} » non mesurable`); else if (c.p10 < 4.5) noter('ER-C', `${lieu} : contraste p10 de « ${t} » ${f2(c.p10)} (≥ 4,5)`) }
        }
        if (k === 3 && m.phrase.vis >= 0.98) {
          const cs = await contraste(page, [PHRASE])
          M.contrastePhrase = cs
          if (m.phrase.police < 14) noter('ER-C', `${lieu} : phrase finale en ${f2(m.phrase.police)} px (≥ 14)`)
          const c = cs[0]; if (!c || !c.pixels) noter('ER-C', `${lieu} : contraste de la phrase non mesurable`); else if (c.p10 < 4.5) noter('ER-C', `${lieu} : contraste p10 de la phrase ${f2(c.p10)} (≥ 4,5)`)
        }
      }
      // ER-1
      const H0 = png[0] ? await sharp(png[0]).metadata().then((mm) => Math.max(1, Math.round((160 * mm.height) / mm.width))) : 120
      const g = await Promise.all(png.map((b) => (b ? gris(b, H0) : null)))
      M.ecarts = []
      for (let k = 0; k < 3; k++) {
        const e = ecart(g[k], g[k + 1]); M.ecarts.push(e)
        if (e === null) noter('ER-1', `${lieuF} : C${k + 1}/C${k + 2} non comparables`)
        else if (e < 0.05) noter('ER-1', `${lieuF} : écart C${k + 1}/C${k + 2} ${e.toFixed(4).replace('.', ',')} (≥ 0,05)`)
      }
      faits.push(`ER-1 ${lieuF} : écarts ${M.ecarts.map((e) => (e === null ? '—' : e.toFixed(3).replace('.', ','))).join(' · ')}`)

      // ER-5 : la phrase pleine jusqu'à 100 %, absente avant 87,44
      for (const [p, sens] of [[86.94, 'bas'], [90.0, 'haut'], [100, 'haut']]) {
        const juger = (m) => (sens === 'haut' ? m.phrase.vis >= 0.98 : m.phrase.vis <= 0.02)
        let m = await relever(page, p)
        if (!juger(m)) { await page.waitForTimeout(2000); m = await relever(page, p) }
        if (!juger(m)) noter('ER-5', `${lieuF} à ${f2(p)} % : phrase finale à ${f2(m.phrase.vis)} (${sens === 'haut' ? '≥ 0,98' : '≤ 0,02'})`)
      }

      // ER-6
      const serie = async () => { const s = []; for (const p of FONDU) s.push({ p, m: await relever(page, p, true) }); return s }
      let s = await serie(), mv = mouvements(s)
      if (mv.bouges.length || mv.cotesVues.length) { await page.waitForTimeout(2000); s = await serie(); mv = mouvements(s) }
      M.fondu = { groupesQuiBougent: mv.tous, cotesVues: mv.cotesVues, textes: s[0].m.textes.length }
      for (const [gr, quand] of mv.bouges) noter('ER-6', `${lieuF} : ${gr} bouge pendant le fondu 01 → 02 (${quand})`)
      if (mv.cotesVues.length) noter('ER-6', `${lieuF} : cote visible avant 35,875 % : ${mv.cotesVues.slice(0, 2).join(', ')}`)
      faits.push(`ER-6 ${lieuF} : ${s[0].m.textes.length} nœuds de texte suivis, groupes en mouvement : ${mv.tous.map(([gr]) => gr).join(', ') || 'aucun'}`)

      // PR : le film, au premier format
      if (w === 1440) {
        const dir = path.join(T, 'film'); fs.mkdirSync(dir, { recursive: true })
        const N = 16 * 15
        for (let i = 0; i < N; i++) { await positionner(page, (100 * i) / (N - 1)); await page.screenshot({ path: path.join(dir, `${String(i).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 72 }) }
        const film = path.join(PREUVE, 'etapes-recit-film.mp4')
        const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '15', '-i', path.join(dir, '%04d.jpg'), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an', film], { encoding: 'utf8', timeout: 300000 })
        if (r.status !== 0) noter('PR', `ffmpeg n'a pas écrit le film (${String(r.stderr || '').trim().slice(0, 160)})`)
      }
      await fermer(o)
    }

    // PR : planche
    {
      const tuiles = []
      for (const [w, h] of FORMATS) for (let k = 0; k < 4; k++) {
        const f = path.join(PREUVE, `etapes-recit-c${k + 1}-${w}x${h}.jpg`)
        if (taille(f) > 0) tuiles.push({ input: await sharp(f).resize(360, 270, { fit: 'contain', background: '#14110E' }).jpeg().toBuffer(), left: 360 * k, top: FORMATS.findIndex((x) => x[0] === w) * 270 })
      }
      if (tuiles.length) await sharp({ create: { width: 1440, height: 540, channels: 3, background: '#14110E' } }).composite(tuiles).jpeg({ quality: 86 }).toFile(path.join(PREUVE, 'etapes-recit-planche.jpg'))
    }

    // ER-5 : la barre retenue à travers #etapes
    {
      const nr = path.join(R, 'scripts', 'nav-retenue-qa.mjs')
      if (lire(nr).includes('--dossier=')) {
        const r = spawnSync(process.execPath, [nr, `--dossier=${ECL}`], { cwd: R, encoding: 'utf8', timeout: 900000 })
        const ligne = `${r.stdout || ''}`.trim().split('\n').pop() || ''
        faits.push(`ER-5 nav-retenue-qa --dossier : ${ligne.slice(0, 160)}`)
        if (r.status !== 0) noter('ER-5', `nav-retenue-qa --dossier : ${ligne.slice(0, 200)}`)
      } else {
        for (const [w, h] of [[1440, 900], [1280, 800]]) {
          const o = await ouvrir({ viewport: { width: w, height: h } })
          await o.page.waitForTimeout(1500)
          const { haut, hauteur } = await o.page.evaluate(() => { const e = document.querySelector('#etapes'); const r = e.getBoundingClientRect(); return { haut: Math.round(r.top + scrollY), hauteur: Math.round(r.height) } })
          const trous = [], doublons = []
          let n = 0
          for (let y = Math.max(0, haut - h); y <= haut + hauteur; y += 150, n++) {
            await o.page.evaluate((v) => scrollTo({ top: v, behavior: 'instant' }), y)
            await o.page.waitForTimeout(450)
            let vus = await appelsVisibles(o.page)
            if (vus.length !== 1) { await o.page.waitForTimeout(2000); vus = await appelsVisibles(o.page) }
            if (!vus.length) trous.push(y)
            if (vus.length > 1) doublons.push(`${y} px (${vus.map((v) => `« ${v.texte} »`).join(', ')})`)
          }
          if (trous.length) noter('ER-5', `${fmt(w, h)} : aucun appel visible dans #etapes à ${trous.slice(0, 5).join(', ')} px`)
          if (doublons.length) noter('ER-5', `${fmt(w, h)} : plusieurs appels visibles dans #etapes à ${doublons.slice(0, 3).join(' ; ')}`)
          faits.push(`ER-5 ${fmt(w, h)} : ${n} positions de #etapes (tous les 150 px), ${trous.length} trou(s), ${doublons.length} doublon(s) (mesure appelsVisibles de nav-retenue-qa)`)
          await fermer(o)
        }
      }
    }

    // ER-7
    mesures.repli = {}
    for (const [nom, opts] of [
      ['sans JavaScript 1440×900', { viewport: { width: 1440, height: 900 }, javaScriptEnabled: false }],
      ['téléphone 390×844', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }],
      ['mouvement réduit 1440×900', { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }],
      ['hauteur 1440×640', { viewport: { width: 1440, height: 640 } }],
    ]) {
      const o = await ouvrir(opts)
      const { page } = o
      await page.waitForTimeout(1000)
      const H = await page.evaluate(() => document.documentElement.scrollHeight)
      const vh = opts.viewport.height
      for (let y = 0; y < H; y += Math.round(vh * 0.9)) { await page.evaluate((v) => scrollTo({ top: v, behavior: 'instant' }), y); await page.waitForTimeout(100) }
      const mesurer = async () => {
        await page.evaluate(() => { const f = document.querySelector('#etapes .eclate'); if (f) { const r = f.getBoundingClientRect(); scrollTo({ top: Math.round(r.top + scrollY - Math.max(0, (innerHeight - r.height) / 2)), behavior: 'instant' }) } })
        await repos(o); await page.waitForTimeout(700)
        return page.evaluate(scene, { ...O, textes: false })
      }
      const complet = opts.javaScriptEnabled !== false
      const juger = (m) => {
        const d = [], releves = o.j.requetes.filter((p) => /\/releve\.avif$/.test(p)).length
        if (releves) d.push(`${releves} requête(s) de releve.avif`)
        if (!m.figure) d.push('figure.eclate absente')
        else {
          if (complet && !m.img.fixe.n) d.push('aucun img eclate.avif dans la figure')
          else if (complet) { if (m.img.fixe.vis < 0.98) d.push(`eclate.avif à ${f2(m.img.fixe.vis)} (≥ 0,98)`); if (!m.img.fixe.charge) d.push('eclate.avif pas décodée') }
          if (complet && !m.legende.some((l) => l.n === 5 && l.min >= 0.98)) d.push(`légende ol.eclate__legende de 5 lignes rendues absente (${m.legende.map((l) => `${l.n} ligne(s) à ${f2(l.min)}`).join(', ') || 'aucune'})`)
          for (const f of m.fiche) if (f.visTout > 0.02) d.push(`ligne « ${f.texte} » affichée (${f2(f.visTout)})`)
          if (m.img.releve.visTout > 0.02) d.push(`releve.avif affichée (${f2(m.img.releve.visTout)})`)
          if (m.cotes[1].visTout > 0.02) d.push(`cote « 17 mm » affichée (${f2(m.cotes[1].visTout)})`)
        }
        return d
      }
      let m = await mesurer(), d = juger(m)
      if (d.length) { await page.waitForTimeout(2000); m = await mesurer(); d = juger(m) }
      for (const t of d) noter('ER-7', `${nom} : ${t}`)
      mesures.repli[nom] = { eclate: [...new Set(o.j.requetes.filter((p) => /\/eclate\//.test(p)))], fixe: m.img.fixe.vis, legende: m.legende, fiche: m.fiche.map((f) => f.visTout), releve: m.img.releve.visTout }
      faits.push(`ER-7 ${nom} : requêtes d'eclate/ ${mesures.repli[nom].eclate.map((p) => p.split('/').pop()).join(', ') || 'aucune'}`)
      await fermer(o)
    }
  }
} catch (e) {
  if (e.message !== 'arrêt') noter('JUGE', `juge interrompu : ${String(e.message).split('\n')[0].slice(0, 200)}`)
} finally {
  if (nav) await nav.close().catch(() => {})
  if (srvE) await srvE.fermer().catch(() => {})
}

// ── CSP et preuves ─────────────────────────────────────────────────────────────────────────────────────────────────────
if (csp.length) noter('CSP', `${csp.length} violation(s) : ${[...new Set(csp)].slice(0, 2).join(' | ')}`)
if (figureTag) {
  const attendus = ['mesures.json', 'etapes-recit-planche.jpg', 'etapes-recit-film.mp4', ...FORMATS.flatMap(([w, h]) => [1, 2, 3, 4].map((k) => `etapes-recit-c${k}-${w}x${h}.jpg`))]
  for (const f of attendus.filter((x) => x !== 'mesures.json')) if (taille(path.join(PREUVE, f)) <= 0) noter('PR', `juge/${f} absent ou vide`)
  const planche = path.join(PREUVE, 'etapes-recit-planche.jpg')
  if (taille(planche) > 0) { const e = await ecartType(planche); if (e < 8) noter('PR', `planche unie (écart-type du gris ${f2(e)}, ≥ 8)`) }
  const film = path.join(PREUVE, 'etapes-recit-film.mp4')
  if (taille(film) > 0) {
    const d = Number(spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', film], { encoding: 'utf8' }).stdout.trim())
    if (!(Math.abs(d - 16) <= 0.1)) noter('PR', `film de ${f2(d)} s (16 s attendues)`)
    const brut = spawnSync('ffmpeg', ['-v', 'error', '-ss', '8', '-i', film, '-frames:v', '1', '-vf', 'scale=160:100,format=gray', '-f', 'rawvideo', '-'], { maxBuffer: 1 << 24 }).stdout
    if (!brut || !brut.length) noter('PR', 'image du milieu du film illisible')
    else { const moy = brut.reduce((s, v) => s + v, 0) / brut.length; const et = Math.sqrt(brut.reduce((s, v) => s + (v - moy) ** 2, 0) / brut.length); if (et < 8) noter('PR', `image du milieu du film unie (écart-type ${f2(et)})`); mesures.filmSecondes = d }
  }
}

// ── EC : eclate-qa.mjs ─────────────────────────────────────────────────────────────────────────────────────────────────
if (!ESSAI) {
  const ec = path.join(R, 'scripts', 'eclate-qa.mjs')
  if (!fs.existsSync(ec)) noter('EC', 'scripts/eclate-qa.mjs absent : EC-1 à EC-16 non jugés')
  else {
    const args = [ec]
    if (option('base') !== null && lire(ec).includes('--base=')) args.push(`--base=${option('base')}`)
    const reste = Math.max(3 * 60000, 29 * 60000 - (Date.now() - T0))
    const r = spawnSync(process.execPath, args, { cwd: R, encoding: 'utf8', timeout: reste, maxBuffer: 1 << 26 })
    const ligne = `${r.stdout || ''}`.trim().split('\n').pop() || ''
    faits.push(`EC : ${ligne.slice(0, 200)}`)
    if (r.status !== 0) noter('EC', r.error ? `eclate-qa.mjs coupé ou impossible à lancer (${r.error.code || r.error.message})` : `eclate-qa.mjs en échec — ${ligne.replace(/^✗\s*/, '').slice(0, 300)}`)
  }
}
fin()
