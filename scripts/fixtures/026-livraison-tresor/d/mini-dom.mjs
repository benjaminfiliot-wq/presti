// scripts/fixtures/026-livraison-tresor/d/mini-dom.mjs — un DOM minimal pour rendre un composant client React avec
// react-dom/client dans un processus Node, sans jsdom (absent du dépôt), écrit par Claude Code le 27/09 pour poste-sites-qa
// (PS-7 : « rendu du composant avec des données factices, lu au texte »). Ce que react-dom 19 touche pour un rendu, des
// mises à jour et des clics : createElement, createTextNode, appendChild, insertBefore, removeChild, textContent,
// setAttribute, style, addEventListener ; un clic est rejoué par les écouteurs que React a posés sur le conteneur
// (capture puis bouillonnement), comme le ferait le navigateur. Rien d'autre (ni mise en page, ni CSS, ni formulaire natif).
//
//   installerDom() → { document, window, conteneur } : pose les globaux (window, document, navigator…) AVANT l'import de
//                    react-dom ; window.confirm rend vrai ; window.prompt rend '' ; navigator.clipboard est muet.
//   cliquer(element, window)  rejoue un clic (à appeler dans act) ; texte(element) ; tous(element, predicat) ;
//   ancetre(element, predicat).
const HTML = 'http://www.w3.org/1999/xhtml'

class Noeud {
  constructor(document, nodeType, nodeName) { this.ownerDocument = document; this.nodeType = nodeType; this.nodeName = nodeName; this.parentNode = null; this.childNodes = [] }
  get firstChild() { return this.childNodes[0] ?? null }
  get lastChild() { return this.childNodes[this.childNodes.length - 1] ?? null }
  get nextSibling() { const p = this.parentNode; if (!p) return null; const i = p.childNodes.indexOf(this); return p.childNodes[i + 1] ?? null }
  get previousSibling() { const p = this.parentNode; if (!p) return null; const i = p.childNodes.indexOf(this); return i > 0 ? p.childNodes[i - 1] : null }
  get parentElement() { return this.parentNode && this.parentNode.nodeType === 1 ? this.parentNode : null }
  get isConnected() { let n = this; while (n.parentNode) n = n.parentNode; return n.nodeType === 9 }
  appendChild(c) { return this.insertBefore(c, null) }
  insertBefore(c, avant) {
    if (c.nodeType === 11) { for (const x of [...c.childNodes]) this.insertBefore(x, avant); return c }
    if (c.parentNode) c.parentNode.removeChild(c)
    const i = avant ? this.childNodes.indexOf(avant) : -1
    if (i < 0) this.childNodes.push(c); else this.childNodes.splice(i, 0, c)
    c.parentNode = this
    return c
  }
  removeChild(c) { const i = this.childNodes.indexOf(c); if (i >= 0) { this.childNodes.splice(i, 1); c.parentNode = null } return c }
  contains(n) { while (n) { if (n === this) return true; n = n.parentNode } return false }
  get textContent() { return this.childNodes.map((c) => (c.nodeType === 3 ? c.nodeValue : c.nodeType === 1 ? c.textContent : '')).join('') }
  set textContent(t) { for (const c of this.childNodes) c.parentNode = null; this.childNodes = []; if (t !== '' && t != null) this.appendChild(this.ownerDocument.createTextNode(String(t))) }
  addEventListener(type, f, o) { (this._ecouteurs ??= []).push({ type, f, capture: typeof o === 'boolean' ? o : !!o?.capture }) }
  removeEventListener(type, f, o) { const capture = typeof o === 'boolean' ? o : !!o?.capture; this._ecouteurs = (this._ecouteurs ?? []).filter((x) => !(x.type === type && x.f === f && x.capture === capture)) }
}
class Texte extends Noeud {
  constructor(document, t) { super(document, 3, '#text'); this.nodeValue = String(t) }
  get data() { return this.nodeValue } set data(v) { this.nodeValue = String(v) }
  get textContent() { return this.nodeValue } set textContent(v) { this.nodeValue = String(v) }
}
class Commentaire extends Noeud { constructor(document, t) { super(document, 8, '#comment'); this.nodeValue = String(t) } }
class Element extends Noeud {
  constructor(document, nom, ns = HTML) {
    super(document, 1, nom.toUpperCase())
    this.tagName = nom.toUpperCase(); this.localName = nom.toLowerCase(); this.namespaceURI = ns; this.attributs = new Map()
    const style = {}
    Object.defineProperty(style, 'setProperty', { value: (k, v) => { style[k] = v }, enumerable: false })
    Object.defineProperty(style, 'removeProperty', { value: (k) => { delete style[k] }, enumerable: false })
    Object.defineProperty(style, 'getPropertyValue', { value: (k) => style[k] ?? '', enumerable: false })
    this.style = style
  }
  setAttribute(k, v) { this.attributs.set(String(k).toLowerCase(), String(v)) }
  setAttributeNS(_ns, k, v) { this.setAttribute(k, v) }
  getAttribute(k) { return this.attributs.has(String(k).toLowerCase()) ? this.attributs.get(String(k).toLowerCase()) : null }
  hasAttribute(k) { return this.attributs.has(String(k).toLowerCase()) }
  removeAttribute(k) { this.attributs.delete(String(k).toLowerCase()) }
  removeAttributeNS(_ns, k) { this.removeAttribute(k) }
  get className() { return this.getAttribute('class') ?? '' } set className(v) { this.setAttribute('class', v) }
  get id() { return this.getAttribute('id') ?? '' } set id(v) { this.setAttribute('id', v) }
  get children() { return this.childNodes.filter((c) => c.nodeType === 1) }
  get innerText() { return this.textContent }
  focus() { this.ownerDocument.activeElement = this } blur() { this.ownerDocument.activeElement = this.ownerDocument.body }
  getBoundingClientRect() { return { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 } }
}
class Fragment extends Noeud { constructor(document) { super(document, 11, '#document-fragment') } }
class Document extends Noeud {
  constructor() {
    super(null, 9, '#document')
    this.ownerDocument = null
    this.documentElement = new Element(this, 'html'); this.appendChild(this.documentElement)
    this.head = new Element(this, 'head'); this.body = new Element(this, 'body')
    this.documentElement.appendChild(this.head); this.documentElement.appendChild(this.body)
    this.activeElement = this.body
  }
  createElement(nom) { return new Element(this, nom) }
  createElementNS(ns, nom) { return new Element(this, nom, ns) }
  createTextNode(t) { return new Texte(this, t) }
  createComment(t) { return new Commentaire(this, t) }
  createDocumentFragment() { return new Fragment(this) }
  getElementById(id) { return tous(this, (n) => n.id === id)[0] ?? null }
}

export function installerDom() {
  const document = new Document()
  class HTMLIFrameElement {}
  const window = {
    document, event: undefined, HTMLIFrameElement, navigator: { userAgent: 'mini-dom (poste-sites-qa)', clipboard: { writeText: async () => {} } },
    location: { href: 'https://prestiapp.fr/controle', origin: 'https://prestiapp.fr', protocol: 'https:', host: 'prestiapp.fr', hostname: 'prestiapp.fr', pathname: '/controle', search: '' },
    confirm: () => true, prompt: () => '', alert: () => {}, getSelection: () => null, getComputedStyle: () => ({ getPropertyValue: () => '' }),
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }),
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true }, scrollTo() {},
    setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame: (f) => setTimeout(() => f(Date.now()), 0), cancelAnimationFrame: (t) => clearTimeout(t),
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  }
  document.defaultView = window
  window.window = window; window.self = window
  const poser = (k, v) => { try { Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true }) } catch { /* déjà là */ } }
  for (const [k, v] of Object.entries({ window, document, navigator: window.navigator, location: window.location, HTMLIFrameElement, confirm: window.confirm, prompt: window.prompt, alert: window.alert, getComputedStyle: window.getComputedStyle, matchMedia: window.matchMedia, requestAnimationFrame: window.requestAnimationFrame, cancelAnimationFrame: window.cancelAnimationFrame, localStorage: window.localStorage, sessionStorage: window.sessionStorage, Node: Noeud, Element, HTMLElement: Element })) poser(k, v)
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
  const conteneur = document.createElement('div')
  document.body.appendChild(conteneur)
  return { document, window, conteneur }
}

/** Rejoue un clic sur `el` : les écouteurs de clic de ses ancêtres (dont le conteneur de React), capture puis bouillonnement. */
export function cliquer(el, window) {
  const chemin = []
  for (let n = el; n; n = n.parentNode) chemin.push(n)
  const ev = {
    type: 'click', target: el, srcElement: el, bubbles: true, cancelable: true, composed: true, defaultPrevented: false, isTrusted: true,
    timeStamp: Date.now(), eventPhase: 0, button: 0, buttons: 1, detail: 1, clientX: 0, clientY: 0, screenX: 0, screenY: 0, pageX: 0, pageY: 0,
    ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, relatedTarget: null, view: window,
    getModifierState: () => false, preventDefault() { this.defaultPrevented = true }, stopPropagation() { this._stop = true }, stopImmediatePropagation() { this._stop = true },
  }
  window.event = ev
  try {
    for (const n of [...chemin].reverse()) { for (const x of (n._ecouteurs ?? []).filter((y) => y.type === 'click' && y.capture)) { ev.currentTarget = n; x.f.call(n, ev) } if (ev._stop) return ev }
    for (const n of chemin) { for (const x of (n._ecouteurs ?? []).filter((y) => y.type === 'click' && !y.capture)) { ev.currentTarget = n; x.f.call(n, ev) } if (ev._stop) return ev }
  } finally { window.event = undefined }
  return ev
}
export const texte = (el) => String(el?.textContent ?? '').replace(/\s+/g, ' ').trim()
export function tous(racine, predicat) { const out = []; const rec = (n) => { for (const c of n.childNodes) { if (c.nodeType === 1) { if (predicat(c)) out.push(c); rec(c) } } }; rec(racine); return out }
export function ancetre(el, predicat) { for (let n = el?.parentNode; n; n = n.parentNode) if (n.nodeType === 1 && predicat(n)) return n; return null }
