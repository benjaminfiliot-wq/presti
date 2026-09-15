// scripts/familles-socle-qa.mjs — le juge de la tâche 021-01 : le socle des familles d'effets du générateur des démos
// (cahier de la vague 5, .orchestre/preuves/021-00/cahier-vague-5.md, §3.0 et §6.1 SO-1 à SO-6). Tout se passe dans des copies
// sous .orchestre/travail/socle-qa/ ; le site n'est jamais régénéré en place.
//   SO-1 sans famille, le nouveau générateur (--familles= --sortie=) rend exactement ce que rendait celui du commit de référence :
//        styles.css, site.js, sitemap (hors lastmod), robots.txt et toutes les pages identiques, les pages après retrait des
//        attributs data-relief-texture/-calme/-lumiere-css/-descente ; et le site en place n'a pas bougé ;
//   SO-2 une famille témoin écrite par le juge : son CSS après kit.css, son JS après kit.js, ses six crochets à leur place,
//        herosMedia sur l'accueil seulement ; son garde qui lève → code ≠ 0, message du témoin, dossier de sortie inchangé ;
//        _kit/familles/LISEZMOI.md présent, 60 lignes au plus ;
//   SO-3 --da= avec une descente invalide (palier 0,4 ; dmax15 > dmax1 ; h 0) et une texture absente → code ≠ 0, rien d'écrit ;
//        la même entrée valide → code 0 (témoin de contrôle) ;
//   SO-4 --da= avec texture présente : attributs data-relief-texture, -calme, -lumiere-css, -descente (JSON égal) sur le héros ;
//        da.json du dépôt : "familles": [], relief calme, lumière CSS et descente posés, pas de texture (elle vient avec 021-02) ;
//   SO-5 une entrée "type": "rendu" d'attributions.json est acceptée sans famille et absente des crédits photo ; les attributions
//        d'une famille (lestraque/temoin/attributions.json) sont fusionnées quand elle est active, ignorées sinon ;
//   SO-6 signature-repos-qa.mjs et nav-retenue-qa.mjs PASS.
//
// Usage : node scripts/familles-socle-qa.mjs
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SD = path.join(R, 'public', 'sites-demo')
const BASE = 'e33aec0' // le dernier commit avant 021-01 : son générateur est la référence de SO-1
const T = path.join(R, '.orchestre', 'travail', `socle-qa-${process.pid}`) // un dossier par lancement : deux juges peuvent tourner ensemble
const DESCENTE = { palier: 0.30, dmax1: 0.116, dmax15: 0.066, roulisParDelta: 0, gamma: 0.6, rw: 0.045, h: -1 }
const TEXTURE = 'images/heros-escalier-2880.avif'
const echecs = [], faits = []
const fin = () => {
  console.log(faits.map((f) => `  · ${f}`).join('\n'))
  console.log(echecs.length ? `✗ socle des familles : FAIL — ${echecs.join(' ; ')}` : '✓ socle des familles : PASS — rien ne change sans famille, crochets et assemblage en place, refus tenus, attributs du relief, attributions fusionnées, moment signature intact')
  process.exitCode = echecs.length ? 1 : 0
}

const gen = (sites, args, env = {}) => {
  const r = spawnSync(process.execPath, [path.join(sites, 'generer.mjs'), 'lestraque', ...args], { cwd: R, encoding: 'utf8', env: { ...process.env, ...env }, timeout: 180000 })
  return { code: r.status, sortie: `${r.stdout || ''}${r.stderr || ''}` }
}
const empreinte = (d) => {
  if (!fs.existsSync(d)) return 'absent'
  const h = crypto.createHash('sha256')
  const walk = (x) => { for (const e of fs.readdirSync(x, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) { const f = path.join(x, e.name); if (e.isDirectory()) walk(f); else { h.update(path.relative(d, f)); h.update(fs.readFileSync(f)) } } }
  walk(d)
  return h.digest('hex')
}
const copierSites = (dst) => {
  fs.mkdirSync(dst, { recursive: true })
  fs.copyFileSync(path.join(SD, 'generer.mjs'), path.join(dst, 'generer.mjs'))
  for (const d of ['_kit', '_polices', 'lestraque']) fs.cpSync(path.join(SD, d), path.join(dst, d), { recursive: true })
}
const produits = (d) => {
  const l = []
  const walk = (x) => { for (const e of fs.readdirSync(x, { withFileTypes: true })) { const f = path.join(x, e.name); if (e.isDirectory()) { if (!['images', 'fonts', 'relief', 'video'].includes(e.name)) walk(f) } else if (/^(index\.html|styles\.css|site\.js|sitemap\.xml|robots\.txt|favicon\.svg|relief(-fil)?\.js)$/.test(e.name)) l.push(path.relative(d, f)) } }
  walk(d)
  return l.sort()
}
const lire = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null)
const normaliser = (rel, s) => (/\.html$/.test(rel) ? s.replace(/\sdata-relief-(?:texture|calme|lumiere-css|descente)(?:="[^"]*"|='[^']*')?(?=[\s>])/g, '') : /sitemap\.xml$/.test(rel) ? s.replace(/<lastmod>[^<]*<\/lastmod>/g, '') : s)
const baliseHeros = (html) => /<section class="hero hero--plein"[^>]*>/.exec(html || '')?.[0] || ''
const attribut = (balise, nom) => { const m = new RegExp(`\\s${nom}(?:=(?:"([^"]*)"|'([^']*)'))?(?=[\\s>])`).exec(balise); return m ? (m[1] ?? m[2] ?? '') : null }
const deco = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
const memeJson = (a, b) => { const tri = (o) => JSON.stringify(Object.keys(o).sort().reduce((x, k) => ((x[k] = o[k]), x), {})); try { return tri(a) === tri(b) } catch { return false } }
const sansCommentaires = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/[ \t]*\n[ \t]*/g, '\n').replace(/\n{2,}/g, '\n').trim()
const DA_REPO = JSON.parse(fs.readFileSync(path.join(SD, '_kit', 'da.json'), 'utf8')).lestraque

fs.rmSync(T, { recursive: true, force: true })
fs.mkdirSync(T, { recursive: true })
try {
  const source = fs.readFileSync(path.join(SD, 'generer.mjs'), 'utf8')
  if (!/--sortie/.test(source) || !/--familles/.test(source) || !/--da=/.test(source)) {
    echecs.push('SO-1 à SO-5 : le générateur ne connaît pas --sortie, --familles et --da ; le juge ne le lance pas (sans --sortie, il régénérerait le site en place)')
  } else {
    // ── SO-1 ──────────────────────────────────────────────────────────────────────────────────────────────────
    const AVANT = path.join(T, 'avant'), APRES = path.join(T, 'apres')
    copierSites(AVANT)
    for (const f of ['generer.mjs', '_kit/da.json', '_kit/kit.css', '_kit/kit.js', '_kit/relief.js', '_kit/relief-fil.js']) {
      const r = spawnSync('git', ['show', `${BASE}:public/sites-demo/${f}`], { cwd: R, maxBuffer: 1 << 28 })
      if (r.status) throw new Error(`git show ${BASE}:${f} impossible`)
      fs.writeFileSync(path.join(AVANT, f), r.stdout)
    }
    const ref = gen(AVANT, [])
    if (ref.code !== 0) throw new Error(`le générateur de référence (${BASE}) ne génère pas : ${ref.sortie.trim().slice(-300)}`)
    const siteAvant = empreinte(path.join(SD, 'lestraque'))
    const nouv = gen(SD, ['--familles=', `--sortie=${APRES}`])
    if (empreinte(path.join(SD, 'lestraque')) !== siteAvant) echecs.push('SO-1 : la génération avec --sortie a écrit dans public/sites-demo/lestraque')
    if (nouv.code !== 0) echecs.push(`SO-1 : génération --familles= --sortie= en échec (${nouv.sortie.trim().slice(-300)})`)
    else {
      const lAvant = produits(path.join(AVANT, 'lestraque')), lApres = produits(APRES)
      const manquants = lAvant.filter((f) => !lApres.includes(f)), enTrop = lApres.filter((f) => !lAvant.includes(f))
      const differents = lAvant.filter((f) => lApres.includes(f) && normaliser(f, lire(path.join(AVANT, 'lestraque', f))) !== normaliser(f, lire(path.join(APRES, f))))
      faits.push(`SO-1 : ${lAvant.length} fichiers produits par la référence ${BASE}, ${differents.length} différent(s), ${manquants.length} manquant(s), ${enTrop.length} en trop`)
      if (manquants.length || enTrop.length || differents.length) echecs.push(`SO-1 : sans famille, la sortie diffère de la référence (différents : ${differents.slice(0, 5).join(', ') || 'aucun'} ; manquants : ${manquants.slice(0, 5).join(', ') || 'aucun'} ; en trop : ${enTrop.slice(0, 5).join(', ') || 'aucun'})`)
      // SO-4 (da.json du dépôt)
      const balise = baliseHeros(lire(path.join(APRES, 'index.html')))
      if (!Array.isArray(DA_REPO.familles) || DA_REPO.familles.length) echecs.push(`SO-4 : da.json lestraque → familles vaut ${JSON.stringify(DA_REPO.familles)}, [] attendu`)
      if (attribut(balise, 'data-relief-calme') === null || attribut(balise, 'data-relief-lumiere-css') === null) echecs.push('SO-4 : héros du dépôt sans data-relief-calme ou data-relief-lumiere-css')
      const desc = attribut(balise, 'data-relief-descente')
      let d = null; try { d = JSON.parse(deco(desc || '')) } catch {}
      if (!d || !memeJson(d, DESCENTE)) echecs.push(`SO-4 : data-relief-descente du dépôt ${desc === null ? 'absent' : `vaut ${deco(desc)}`}, attendu ${JSON.stringify(DESCENTE)}`)
      if (attribut(balise, 'data-relief-texture') !== null) echecs.push('SO-4 : data-relief-texture posé par da.json du dépôt, alors que la clé texture revient à 021-02')
    }

    // ── SO-2 ──────────────────────────────────────────────────────────────────────────────────────────────────
    const COPIE = path.join(T, 'copie'), FAM = path.join(COPIE, '_kit', 'familles')
    copierSites(COPIE)
    const lisez = lire(path.join(SD, '_kit', 'familles', 'LISEZMOI.md'))
    if (!lisez) echecs.push('SO-2 : _kit/familles/LISEZMOI.md absent')
    else if (lisez.trim().split('\n').length > 60) echecs.push(`SO-2 : LISEZMOI.md fait ${lisez.trim().split('\n').length} lignes, 60 au plus`)
    fs.mkdirSync(FAM, { recursive: true })
    fs.writeFileSync(path.join(FAM, 'temoin.css'), '/* famille témoin du juge */\n.temoin-marqueur{outline:1px solid transparent}\n')
    fs.writeFileSync(path.join(FAM, 'temoin.js'), '(function(){window.__temoinCharge=1})()\n')
    fs.writeFileSync(path.join(FAM, 'temoin.mjs'), [
      'export default {',
      '  plateauCitation: (texte, ctx) => `<span data-temoin="citation">${ctx.esc(texte)}</span>`,',
      '  plateauValeur: (chiffre, i, ctx) => `<span class="chiffre__valeur" data-temoin="valeur-${i}">${ctx.esc(chiffre.valeur)}</span>`,',
      '  atelierPhrase: (texte, ctx) => `<em data-temoin="atelier">${ctx.esc(texte)}</em>`,',
      '  etapesMedia: (ctx) => \'<div class="temoin-etapes" data-temoin="etapes"></div>\',',
      '  herosMedia: (ctx) => \'<i data-temoin="heros" hidden></i>\',',
      '  garde: (html, ctx) => { if (process.env.TEMOIN_REFUS) throw new Error("refus du témoin") },',
      '}',
      '',
    ].join('\n'))
    const ST = path.join(T, 'sortie-temoin')
    const copieAvant = empreinte(path.join(COPIE, 'lestraque'))
    const g2 = gen(COPIE, ['--familles=temoin', `--sortie=${ST}`])
    if (empreinte(path.join(COPIE, 'lestraque')) !== copieAvant) echecs.push('SO-2 : --sortie a écrit dans le dossier source du métier')
    if (g2.code !== 0) echecs.push(`SO-2 : génération avec la famille témoin en échec (${g2.sortie.trim().slice(-300)})`)
    else {
      const css = lire(path.join(ST, 'styles.css')) || '', js = lire(path.join(ST, 'site.js')) || ''
      const kitCss = sansCommentaires(fs.readFileSync(path.join(COPIE, '_kit', 'kit.css'), 'utf8')), kitJs = fs.readFileSync(path.join(COPIE, '_kit', 'kit.js'), 'utf8')
      const iKit = css.lastIndexOf(kitCss.slice(-120)), iTemoin = css.indexOf('.temoin-marqueur')
      if (iKit < 0 || iTemoin <= iKit) echecs.push(`SO-2 : le CSS du témoin n'est pas après kit.css dans styles.css (kit.css à ${iKit}, témoin à ${iTemoin})`)
      if (!js.startsWith(kitJs) || js.indexOf('__temoinCharge') <= kitJs.length) echecs.push('SO-2 : site.js ne commence pas par kit.js suivi du JS du témoin')
      const accueil = lire(path.join(ST, 'index.html')) || ''
      const places = [
        ['plateauCitation', /<blockquote><p><span data-temoin="citation">/],
        ['plateauValeur', /<dd><span class="chiffre__valeur" data-temoin="valeur-0">/],
        ['atelierPhrase', /<p class="atelier__phrase reveal" style="--i:2"><em data-temoin="atelier">/],
        ['etapesMedia', /data-temoin="etapes"><\/div><\/div><ol class="etapes__liste">/],
      ]
      for (const [nom, motif] of places) if (!motif.test(accueil)) echecs.push(`SO-2 : crochet ${nom} absent de sa place sur l'accueil`)
      if (/etapes__photo/.test(accueil)) echecs.push('SO-2 : etapesMedia non nul n\'a pas remplacé la photo des étapes')
      const iMedia = accueil.indexOf('class="hero__media"'), iH = accueil.indexOf('data-temoin="heros"'), iContenu = accueil.indexOf('class="hero__contenu"')
      if (!(iMedia >= 0 && iMedia < iH && iH < iContenu) || accueil.split('data-temoin="heros"').length !== 2) echecs.push('SO-2 : herosMedia pas exactement une fois dans .hero__media de l\'accueil')
      const autres = produits(ST).filter((f) => /index\.html$/.test(f) && f !== 'index.html')
      const fautives = autres.filter((f) => (lire(path.join(ST, f)) || '').includes('data-temoin="heros"'))
      if (fautives.length) echecs.push(`SO-2 : herosMedia rendu hors de l'accueil (${fautives.slice(0, 3).join(', ')})`)
      faits.push(`SO-2 : famille témoin assemblée, ${autres.length} autres pages vérifiées sans herosMedia`)
      const sortieAvant = empreinte(ST)
      const refus = gen(COPIE, ['--familles=temoin', `--sortie=${ST}`], { TEMOIN_REFUS: '1' })
      if (refus.code === 0) echecs.push('SO-2 : le garde du témoin a levé, mais la génération a réussi')
      if (!/refus du témoin/.test(refus.sortie)) echecs.push('SO-2 : le message du garde du témoin n\'apparaît pas (le garde n\'a pas été appelé)')
      if (empreinte(ST) !== sortieAvant) echecs.push('SO-2 : un refus du garde a modifié le dossier de sortie (tout doit être refusé avant la moindre écriture, copie comprise)')
    }

    // ── SO-3 ──────────────────────────────────────────────────────────────────────────────────────────────────
    const daValide = { ...DA_REPO, relief: { ...DA_REPO.relief, calme: true, lumiereCss: true, descente: DESCENTE } }
    const essais = [
      ['descente.palier 0,4', { ...daValide, relief: { ...daValide.relief, descente: { ...DESCENTE, palier: 0.4 } } }],
      ['descente.dmax15 > dmax1', { ...daValide, relief: { ...daValide.relief, descente: { ...DESCENTE, dmax15: 0.2 } } }],
      ['descente.h 0', { ...daValide, relief: { ...daValide.relief, descente: { ...DESCENTE, h: 0 } } }],
      ['texture absente', { ...daValide, relief: { ...daValide.relief, texture: 'images/absente-2880.avif' } }],
    ]
    for (const [i, [nom, da]] of essais.entries()) {
      const f = path.join(T, `da-invalide-${i}.json`), s = path.join(T, `sortie-invalide-${i}`)
      fs.writeFileSync(f, JSON.stringify(da))
      const r = gen(COPIE, [`--da=${f}`, '--familles=', `--sortie=${s}`])
      if (r.code === 0) echecs.push(`SO-3 : ${nom} acceptée`)
      if (fs.existsSync(s) && fs.readdirSync(s).length) echecs.push(`SO-3 : ${nom} refusée après avoir écrit dans le dossier de sortie`)
    }
    const fValide = path.join(T, 'da-valide.json'), sValide = path.join(T, 'sortie-valide')
    fs.writeFileSync(fValide, JSON.stringify(daValide))
    const rValide = gen(COPIE, [`--da=${fValide}`, '--familles=', `--sortie=${sValide}`])
    if (rValide.code !== 0 || !fs.existsSync(path.join(sValide, 'index.html'))) echecs.push(`SO-3 : la même entrée --da= valide est refusée (${rValide.sortie.trim().slice(-300)})`)
    // le garde-fou « manque sur le disque » reste strict : une variante listée dans attributions.json et absente est refusée
    // (ajouté après le 2e tour de Codex, qui l'avait remplacé par un filtre silencieux)
    const VARIANTE = 'tournage-copeaux-480.webp', fVar = path.join(COPIE, 'lestraque', 'images', VARIANTE)
    if (fs.existsSync(fVar)) {
      fs.rmSync(fVar)
      const sVar = path.join(T, 'sortie-variante')
      const rVar = gen(COPIE, ['--familles=', `--sortie=${sVar}`])
      if (rVar.code === 0) echecs.push(`SO-3 : la variante ${VARIANTE}, listée dans attributions.json et absente du disque, est acceptée : le garde-fou « manque sur le disque » a été affaibli`)
      if (fs.existsSync(sVar) && fs.readdirSync(sVar).length) echecs.push('SO-3 : variante absente refusée après avoir écrit dans le dossier de sortie')
      fs.copyFileSync(path.join(SD, 'lestraque', 'images', VARIANTE), fVar)
    }

    // ── SO-4 (--da= avec texture) ───────────────────────────────────────────────────────────────────────────
    // heros-escalier-2880.avif existe dans le site (variante du héros) : le juge ne l'écrase ni ne l'efface ; il ne crée un
    // fichier de test que s'il manque
    const fTex = path.join(COPIE, 'lestraque', TEXTURE), texCreee = !fs.existsSync(fTex)
    if (texCreee) fs.writeFileSync(fTex, crypto.randomBytes(2048))
    const fDaTex = path.join(T, 'da-texture.json'), sTex = path.join(T, 'sortie-texture')
    fs.writeFileSync(fDaTex, JSON.stringify({ ...daValide, relief: { ...daValide.relief, texture: TEXTURE } }))
    const rTex = gen(COPIE, [`--da=${fDaTex}`, '--familles=', `--sortie=${sTex}`])
    if (texCreee) fs.rmSync(fTex, { force: true })
    if (rTex.code !== 0) echecs.push(`SO-4 : génération avec texture présente en échec (${rTex.sortie.trim().slice(-300)})`)
    else {
      const b = baliseHeros(lire(path.join(sTex, 'index.html')))
      if (attribut(b, 'data-relief-texture') !== TEXTURE) echecs.push(`SO-4 : data-relief-texture vaut ${attribut(b, 'data-relief-texture')}, ${TEXTURE} attendu`)
      for (const a of ['data-relief-calme', 'data-relief-lumiere-css']) if (!['', '1'].includes(attribut(b, a))) echecs.push(`SO-4 : ${a} absent ou de valeur inattendue (${attribut(b, a)})`)
      let d = null; try { d = JSON.parse(deco(attribut(b, 'data-relief-descente') || '')) } catch {}
      if (!d || !memeJson(d, DESCENTE)) echecs.push('SO-4 : data-relief-descente absent ou différent de la descente de da')
    }

    // ── SO-5 ──────────────────────────────────────────────────────────────────────────────────────────────────
    const fAttr = path.join(COPIE, 'lestraque', 'attributions.json')
    const attributions = JSON.parse(fs.readFileSync(fAttr, 'utf8'))
    fs.writeFileSync(fAttr, JSON.stringify([...attributions, { type: 'rendu', fichier: 'eclate/eclate.avif', base: 'temoin-rendu', legende: 'Rendu témoin du juge', alt: '', auteur: 'Presti', licence: 'CC BY-SA 4.0', source: 'https://prestiapp.fr/sites-demo/lestraque/' }], null, 1))
    const sAttr = path.join(T, 'sortie-attributions')
    const rAttr = gen(COPIE, ['--familles=', `--sortie=${sAttr}`])
    if (rAttr.code !== 0) echecs.push(`SO-5 : une entrée "type": "rendu" fait échouer la génération (${rAttr.sortie.trim().slice(-300)})`)
    else {
      const avecRendu = produits(sAttr).filter((f) => /\.html$/.test(f) && (lire(path.join(sAttr, f)) || '').includes('Rendu témoin du juge'))
      if (avecRendu.length) echecs.push(`SO-5 : l'entrée "type": "rendu" apparaît dans les crédits photo (${avecRendu.slice(0, 3).join(', ')})`)
    }
    fs.mkdirSync(path.join(COPIE, 'lestraque', 'temoin'), { recursive: true })
    fs.writeFileSync(path.join(COPIE, 'lestraque', 'temoin', 'attributions.json'), JSON.stringify([{ fichier: 'images/temoin-orpheline-480.webp', base: 'temoin-orpheline', legende: 'Photo témoin orpheline', alt: 'photo témoin', auteur: 'Juge', licence: 'CC0', source: 'https://example.invalid/temoin' }], null, 1))
    const rActive = gen(COPIE, ['--familles=temoin', `--sortie=${path.join(T, 'sortie-fusion')}`])
    if (rActive.code === 0 || !/temoin-orpheline/.test(rActive.sortie)) echecs.push('SO-5 : les attributions de la famille active ne sont pas fusionnées (la photo orpheline du témoin n\'est pas refusée)')
    const rInactive = gen(COPIE, ['--familles=', `--sortie=${path.join(T, 'sortie-sans-fusion')}`])
    if (rInactive.code !== 0) echecs.push(`SO-5 : les attributions d'une famille inactive sont lues (${rInactive.sortie.trim().slice(-300)})`)
  }
} catch (e) {
  echecs.push(`juge interrompu : ${e.message}`)
} finally {
  fs.rmSync(T, { recursive: true, force: true })
}

// ── SO-6 ──────────────────────────────────────────────────────────────────────────────────────────────────────
for (const juge of ['signature-repos-qa.mjs', 'nav-retenue-qa.mjs']) {
  const r = spawnSync(process.execPath, [path.join(R, 'scripts', juge)], { cwd: R, encoding: 'utf8', timeout: 1200000, maxBuffer: 1 << 26 })
  const derniere = `${r.stdout || ''}${r.stderr || ''}`.trim().split('\n').pop() || ''
  faits.push(`SO-6 : ${juge} → ${derniere.slice(0, 160)}`)
  if (r.status !== 0) echecs.push(`SO-6 : ${juge} en échec`)
}

fin()
