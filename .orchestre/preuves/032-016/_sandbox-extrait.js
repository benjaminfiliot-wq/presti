function enfant() {
  'use strict'
  const vm = require('node:vm')
  const fs = require('node:fs')
  const os = require('node:os')
  const chemin = require('node:path')
  const processus = require('node:child_process')
  const fils = require('node:worker_threads')
  const reseau = require('node:net')
  // Défense en profondeur : le royaume de l'enfant lui-même perd ses portes vers l'extérieur avant tout code du workflow.
  for (const k of ['fetch', 'WebSocket', 'EventSource', 'XMLHttpRequest', 'require', 'module']) { try { delete globalThis[k] } catch { /* rien */ } }
  for (const k of ['getBuiltinModule', 'binding', '_linkedBinding', 'dlopen']) { try { process[k] = undefined } catch { /* rien */ } }

  // Les noms que le code d'un nœud n'a pas à toucher : chacun est un piège qui note la tentative, même si le code la rattrape.
  const PIEGES = ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'require', 'module', 'exports', 'process', 'Buffer', 'global',
    'setTimeout', 'setInterval', 'setImmediate', 'helpers', '$http', '$execution', '$getWorkflowStaticData', 'getWorkflowStaticData',
    '$env', '$vars', '$secrets', 'Function', 'eval', 'WebAssembly', 'SharedArrayBuffer', 'Atomics']
  const PREAMBULE = `(() => {
    'use strict'
    const D = JSON.parse(globalThis.__donnees); delete globalThis.__donnees
    const Chaine = String, appliquer = Reflect.apply, definir = Object.defineProperty, stringify = JSON.stringify
    const vues = []
    const note = (q) => { vues[vues.length] = Chaine(q) }
    const refus = (q) => { note(q); throw new TypeError(q + ' interdit dans un nœud Code (bac à sable du juge)') }
    for (const nom of ${JSON.stringify(PIEGES)}) definir(globalThis, nom, { get() { return refus(nom) }, set() { refus(nom) }, configurable: false })
    const fauxConstructeur = function () { return refus('génération de code (constructeur de fonction)') }
    for (const proto of [Object.getPrototypeOf(function () {}), Object.getPrototypeOf(async function () {}), Object.getPrototypeOf(function* () {}), Object.getPrototypeOf(async function* () {})]) {
      definir(proto, 'constructor', { value: fauxConstructeur, writable: false, configurable: false })
    }
    const enItems = (l) => (l || []).map((j) => ({ json: j }))
    const $ = (nom) => {
      if (!Object.prototype.hasOwnProperty.call(D.sorties, nom)) throw new Error("lecture d'un nœud inconnu : " + nom)
      const items = enItems(D.sorties[nom]); return { all: () => items, first: () => items[0] }
    }
    const entree = enItems(D.entree)
    const $input = { all: () => entree, first: () => entree[0] }
    const $now = { setZone: (z) => { if (z !== 'Europe/Paris') throw new Error('fuseau inattendu'); return { toISODate: () => D.jour } } }
    // \`this\` du code : dans n8n il porte les helpers (httpRequest…) ; ici, tout accès est noté et refusé.
    const ceci = new Proxy({}, {
      get(_, k) { return refus('this.' + Chaine(k)) }, set(_, k) { return refus('this.' + Chaine(k)) }, has(_, k) { return refus('this.' + Chaine(k)) },
      ownKeys() { return refus('this (clés)') }, getOwnPropertyDescriptor(_, k) { return refus('this.' + Chaine(k)) },
      defineProperty(_, k) { return refus('this.' + Chaine(k)) }, deleteProperty(_, k) { return refus('this.' + Chaine(k)) },
      getPrototypeOf() { return refus('this (prototype)') }, setPrototypeOf() { return refus('this (prototype)') },
    })
    let appels = 0, resultat = null
    definir(globalThis, '__harnais', { value: (f) => {
      appels++
      if (appels > 1) { note('harnais rappelé'); return }
      try {
        const r = appliquer(f, ceci, [$, $input, $now])
        if (r && typeof r.then === 'function') throw new Error('code asynchrone : non rejoué')
        if (!Array.isArray(r)) throw new Error("le code doit rendre une liste d'éléments")
        resultat = { items: r.map((i) => i && i.json) }
      } catch (e) { resultat = { erreur: Chaine(e && e.message || e) } }
    }, writable: false, configurable: false })
    // Les tentatives se relisent hors de toute méthode que le code aurait pu remplacer (boucle indexée, concaténation de texte).
    definir(globalThis, '__resultat', { value: () => {
      let t = ''
      for (let i = 0; i < vues.length; i++) t += (i ? '\\u0001' : '') + vues[i]
      return t + '\\u0000' + appels + '\\u0000' + stringify(resultat || { erreur: 'harnais jamais appelé' })
    }, writable: false, configurable: false })
  })()`

  const texte = (e) => { try { return String(e && e.message || e).slice(0, 300) } catch { return 'erreur illisible' } }
  /** Un nœud Code, dans un contexte neuf. Rend { items, erreur, violations }. */
  function executer(jsCode, sortiesTexte, entree, jour) {
    const ctx = vm.createContext(vm.constants.DONT_CONTEXTIFY, { name: 'noeud-code', codeGeneration: { strings: false, wasm: false }, microtaskMode: 'afterEvaluate' })
    ctx.__donnees = '{"sorties":' + sortiesTexte + ',"entree":' + JSON.stringify(entree) + ',"jour":' + JSON.stringify(jour) + '}'
    vm.runInContext(PREAMBULE, ctx, { timeout: 2000 })
    let erreurScript = null
    try { vm.runInContext('__harnais(function ($, $input, $now) {\n' + jsCode + '\n});', ctx, { timeout: 5000, filename: 'noeud-code.js' }) } catch (e) { erreurScript = texte(e) }
    const brut = vm.runInContext('__resultat()', ctx, { timeout: 1000 })
    if (typeof brut !== 'string') throw new Error('résultat du bac à sable illisible')
    const [vuesTexte, appels, json] = brut.split('\u0000')
    const r = JSON.parse(json)
    const violations = vuesTexte ? vuesTexte.split('\u0001') : []
    if (appels !== '1') violations.push(`harnais appelé ${appels} fois`)
    return { items: r.items, erreur: erreurScript || r.erreur || null, violations }
  }
  function unNoeud(nom, jsCode, sortiesTexte, entree, jour) {
    const r = executer(jsCode, sortiesTexte, entree, jour)
    if (r.violations.length) throw new Error(`${nom} : accès refusé par le bac à sable (${[...new Set(r.violations)].join(', ')})`)
    if (r.erreur) throw new Error(`${nom} : ${r.erreur}`)
    if (!Array.isArray(r.items)) throw new Error(`${nom} : sortie illisible`)
    return r.items
  }
  function passer(m) {
    const sorties = {}
    for (const [nom, code] of m.prealables) sorties[nom] = unNoeud(nom, code, '{}', [{}], m.jour)
    for (const [nom, lignes] of Object.entries(m.lectures)) sorties[nom] = lignes
    const sortiesTexte = JSON.stringify(sorties)
    let entree = [{}]
    const parNoeud = {}
    for (const [nom, code] of m.etapes) { entree = unNoeud(nom, code, sortiesTexte, entree, m.jour); parNoeud[nom] = entree }
    return parNoeud
  }
  /** Ce que l'enfant lui-même peut faire : chaque geste doit être refusé par le modèle de permissions de Node. */
  function sonder(m) {
    const r = {}
    const essai = (k, f) => { try { f(); r[k] = 'PERMIS' } catch (e) { r[k] = (e && e.code) || texte(e) } }
    essai('ecriture', () => fs.writeFileSync(chemin.join(os.tmpdir(), 'detecteurs-n8n-qa-sonde.txt'), 'x'))
    essai('lecture', () => fs.readFileSync(m.fichier))
    essai('processus', () => processus.spawnSync(process.execPath, ['-v']))
    essai('worker', () => new fils.Worker('1', { eval: true }))
    r.permission = typeof process.permission === 'object' && process.permission !== null
    // Réseau : `process.permission.has('net')` n'est pas une preuve (Node 24 rend `false` et laisse pourtant partir la connexion).
    // On essaie pour de vrai, vers la boucle locale seulement (port 9, « discard »), et on referme aussitôt : Node 25 et suivants
    // refusent dès l'appel (ERR_ACCESS_DENIED, sans `--allow-net`) ; Node 24 n'a pas ce barrage.
    try { const s = reseau.connect({ port: 9, host: '127.0.0.1' }); s.on('error', () => {}); s.destroy(); r.reseau = 'PERMIS' } catch (e) { r.reseau = (e && e.code) || texte(e) }
    r.node = process.version
    return r
  }
  process.on('message', (m) => {
    let rep
    try {
      const valeur = m.type === 'passer' ? passer(m) : m.type === 'executer' ? executer(m.jsCode, '{}', [{}], m.jour) : m.type === 'sonde' ? sonder(m) : null
      rep = { id: m.id, ok: true, valeur }
    } catch (e) { rep = { id: m.id, ok: false, erreur: texte(e) } }
    process.send(rep)
  })
}
const CODE_ENFANT = '(' + enfant.toString() + ')()'

class BacASable {
  constructor() {
    // `--permission` (stable depuis Node 23.5 et 22.13) ; `--experimental-permission` avant.
    const permission = process.allowedNodeEnvironmentFlags.has('--permission') ? '--permission' : '--experimental-permission'
    this.drapeaux = [permission, '--disallow-code-generation-from-strings']
    const env = {}
    if (process.env.SystemRoot) env.SystemRoot = process.env.SystemRoot // Windows : sans lui, Node ne démarre pas toujours
    this.p = spawn(process.execPath, [...this.drapeaux, '-e', CODE_ENFANT], { stdio: ['ignore', 'ignore', 'pipe', 'ipc'], env, serialization: 'json', windowsHide: true })
    this.attente = new Map()
    this.n = 0
    this.erreurs = ''
    this.p.stderr.on('data', (d) => { this.erreurs = (this.erreurs + d).slice(-2000) })
    this.p.on('message', (m) => { const a = this.attente.get(m.id); if (!a) return; this.attente.delete(m.id); if (m.ok) a.ok(m.valeur); else a.ko(new Error(m.erreur)) })
    this.p.on('exit', (code) => {
      this.arrete = true
      for (const a of this.attente.values()) a.ko(new Error(`bac à sable arrêté (code ${code}) ${this.erreurs.slice(0, 300)}`))
      this.attente.clear()
    })
  }
  demander(m) {
    if (this.arrete) return Promise.reject(new Error(`bac à sable arrêté ${this.erreurs.slice(0, 300)}`))
    return new Promise((ok, ko) => { const id = ++this.n; this.attente.set(id, { ok, ko }); this.p.send({ ...m, id }) })
  }
  fermer() { this.p.kill() }
}
const BAC = new BacASable()
