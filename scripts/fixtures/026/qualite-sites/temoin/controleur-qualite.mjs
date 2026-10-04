// TÉMOIN MINIMAL du Contrôleur qualité des sites livrés (fiche 026-246) — il n'est PAS le module de production : il sert au juge
// `scripts/qualite-sites-qa.mjs` à prouver que ses critères peuvent passer (et, une fois sabotés, rougir). Le vrai module
// (poste n° 3 de l'organigramme, fiche 026-247) devra tenir le même contrat :
//   auditerSite(commande, deps) -> { statut: 'audite' | 'exclu_retrait' | 'livraison_inachevee', pannes: [{ type, detail }],
//     disponibilite: { code, protocole, certificat }, poids: { octets, budget, excessif }, accessibilite: { evalues, contrastes, alt_manquants },
//     liens: { verifies, morts, ignores_robots }, mentions: { attendues, absentes }, formulaire: { present, action, methode, champs, point_entree },
//     visuel: { statut } }
//   passer(commandes, deps) -> { audits, decisions_creees, decisions_ecartees }   (une DÉCISION par panne, jamais une correction)
// Lecture seule : seules les méthodes GET et HEAD existent ici ; rien n'est écrit sur disque.
import http from 'node:http'

export const INTERVALLE_MS = 1000
export const BUDGET_OCTETS = 3 * 1024 * 1024
export const DELAI_MS = 8000
const SEUIL_TEXTE = 4.5
const SEUIL_GRAND = 3
const MENTIONS_PAR_DEFAUT = ['nom', 'siren', 'adresse', 'forme_juridique']
const PROPOSITIONS = {
  indisponible: 'Vérifier l\'hébergement et la mise en ligne, puis relivrer.',
  protocole_non_securise: 'Activer HTTPS et la redirection depuis HTTP.',
  certificat_invalide: 'Renouveler le certificat du domaine.',
  poids_excessif: 'Alléger la page d\'accueil (images, scripts).',
  contraste_insuffisant: 'Corriger les couleurs du gabarit (ratio AA).',
  alt_manquant: 'Renseigner l\'attribut alt des images.',
  lien_mort: 'Corriger ou retirer les liens morts.',
  mentions_absentes: 'Ajouter les mentions légales de l\'artisan.',
  formulaire_casse: 'Réparer le formulaire de contact.',
}
const dernierParHote = new Map()
const pause = (ms) => new Promise((r) => setTimeout(r, ms))

// ── le réseau : lecture seule, octets réellement reçus ───────────────────────────────────────────────────────────────
function requete(url, { methode = 'GET', delaiMs = DELAI_MS } = {}) {
  if (!/^(GET|HEAD)$/.test(methode)) throw new Error(`methode refusee : ${methode}`)
  return new Promise((resolve) => {
    let fini = false
    const fin = (r) => { if (!fini) { fini = true; resolve(r) } }
    const echec = (e) => fin({ code: null, entetes: {}, octets: 0, corps: '', erreur: e.message })
    const req = http.request(url, { method: methode, headers: { 'user-agent': 'presti-controleur-qualite' } }, (rep) => {
      const morceaux = []
      let octets = 0
      rep.on('data', (m) => { octets += m.length; morceaux.push(m) })
      rep.on('end', () => fin({ code: rep.statusCode, entetes: rep.headers, octets, corps: Buffer.concat(morceaux).toString('utf8'), erreur: null }))
      rep.on('error', echec)
    })
    req.setTimeout(delaiMs, () => { req.destroy(new Error('delai_depasse')) })
    req.on('error', echec)
    req.end()
  })
}

// ── les couleurs : ratio WCAG réel ──────────────────────────────────────────────────────────────────────────────────
const NOMS = { white: '#ffffff', black: '#000000', red: '#ff0000', gray: '#808080', grey: '#808080', silver: '#c0c0c0' }
function couleur(v) {
  let t = String(v ?? '').trim().toLowerCase()
  if (NOMS[t]) t = NOMS[t]
  let m = /^#([0-9a-f]{3})$/.exec(t)
  if (m) return [...m[1]].map((c) => parseInt(c + c, 16))
  m = /^#([0-9a-f]{6})$/.exec(t)
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16))
  m = /^rgb\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)\s*\)$/.exec(t)
  if (m) return [1, 2, 3].map((i) => Number(m[i]))
  return null
}
const luminance = ([r, g, b]) => {
  const f = (c) => { const x = c / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4 }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
export function ratioWcag(a, b) {
  const [clair, sombre] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (clair + 0.05) / (sombre + 0.05)
}

function declarations(texte) {
  const d = {}
  for (const part of String(texte).split(';')) {
    const i = part.indexOf(':')
    if (i < 0) continue
    d[part.slice(0, i).trim().toLowerCase()] = part.slice(i + 1).trim()
  }
  return d
}
function reglesCss(html) {
  const regles = []
  let ordre = 0
  for (const bloc of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    for (const r of bloc[1].replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      for (const sel of r[1].split(',')) {
        const m = /^\s*([a-z0-9]*)((?:[.#][\w-]+)*)\s*$/i.exec(sel)
        if (!m) continue
        const classes = [...m[2].matchAll(/\.([\w-]+)/g)].map((x) => x[1])
        const id = /#([\w-]+)/.exec(m[2])?.[1] ?? null
        regles.push({ tag: m[1].toLowerCase(), classes, id, spec: (id ? 100 : 0) + classes.length * 10 + (m[1] ? 1 : 0), ordre: ordre++, d: declarations(r[2]) })
      }
    }
  }
  return regles
}
function tailleEnPx(v, parent) {
  const m = /^([\d.]+)(px|rem|em)?$/.exec(String(v ?? '').trim())
  if (!m) return parent
  const n = Number(m[1])
  return m[2] === 'rem' ? n * 16 : m[2] === 'em' ? n * parent : n
}
const VIDES = new Set(['img', 'input', 'br', 'meta', 'link', 'hr', 'source'])

/** Les contrastes texte/fond réellement rendus : { evalues, insuffisants: [{ element, ratio, couleur, fond, seuil }] }. */
export function analyserContrastes(html) {
  const regles = reglesCss(html)
  const corps = html.replace(/<head[\s\S]*?<\/head>/i, '').replace(/<(script|style)[\s\S]*?<\/\1>/gi, '').replace(/<!--[\s\S]*?-->/g, '')
  const pile = [{ tag: '#racine', couleur: [0, 0, 0], fond: [255, 255, 255], taille: 16, gras: false }]
  const vus = new Set()
  const insuffisants = []
  let evalues = 0
  for (const m of corps.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>|([^<]+)/g)) {
    if (m[4] !== undefined) {
      if (!/\S/.test(m[4])) continue
      const e = pile[pile.length - 1]
      if (e.tag === '#racine' && pile.length === 1) continue
      const cle = `${e.etiquette}|${e.couleur}|${e.fond}|${e.taille}`
      if (vus.has(cle)) continue
      vus.add(cle)
      evalues++
      const ratio = ratioWcag(e.couleur, e.fond)
      const grand = e.taille >= 24 || (e.taille >= 18.66 && e.gras)
      const seuil = grand ? SEUIL_GRAND : SEUIL_TEXTE
      if (ratio < seuil) {
        insuffisants.push({ element: e.etiquette, ratio: Math.round(ratio * 100) / 100, couleur: '#' + e.couleur.map((c) => c.toString(16).padStart(2, '0')).join(''), fond: '#' + e.fond.map((c) => c.toString(16).padStart(2, '0')).join(''), seuil })
      }
      continue
    }
    const tag = m[2].toLowerCase()
    if (m[1]) {
      for (let i = pile.length - 1; i > 0; i--) if (pile[i].tag === tag) { pile.length = i; break }
      continue
    }
    const attrs = m[3]
    const classes = (/class\s*=\s*"([^"]*)"/i.exec(attrs)?.[1] ?? '').split(/\s+/).filter(Boolean)
    const id = /\bid\s*=\s*"([^"]*)"/i.exec(attrs)?.[1] ?? null
    const parent = pile[pile.length - 1]
    const cascade = {}
    const candidates = regles.filter((r) => (!r.tag || r.tag === tag) && r.classes.every((c) => classes.includes(c)) && (!r.id || r.id === id))
      .sort((a, b) => a.spec - b.spec || a.ordre - b.ordre)
    for (const r of candidates) Object.assign(cascade, r.d)
    const enLigne = /style\s*=\s*"([^"]*)"/i.exec(attrs)?.[1]
    if (enLigne) Object.assign(cascade, declarations(enLigne))
    const c = cascade.color ? couleur(cascade.color) : null
    const f = couleur(cascade['background-color'] ?? cascade.background)
    const poids = String(cascade['font-weight'] ?? '')
    const e = {
      tag,
      etiquette: tag + (classes[0] ? '.' + classes[0] : ''),
      couleur: c ?? parent.couleur,
      fond: f ?? parent.fond,
      taille: tailleEnPx(cascade['font-size'], parent.taille),
      gras: poids ? (poids === 'bold' || Number(poids) >= 700) : parent.gras,
    }
    if (!VIDES.has(tag)) pile.push(e)
  }
  return { evalues, insuffisants }
}

// ── lecture du HTML rendu ───────────────────────────────────────────────────────────────────────────────────────────
const texteDe = (html) => html.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim().toLowerCase()
function formulaireDe(html) {
  const f = /<form\b([^>]*)>([\s\S]*?)<\/form>/i.exec(html)
  if (!f) return { present: false, action: null, methode: null, champs: [] }
  const action = /\baction\s*=\s*"([^"]*)"/i.exec(f[1])?.[1] ?? null
  const methode = /\bmethod\s*=\s*"([^"]*)"/i.exec(f[1])?.[1]?.toLowerCase() ?? 'get'
  const champs = [...f[2].matchAll(/<(?:input|textarea|select)\b[^>]*\bname\s*=\s*"([^"]*)"/gi)].map((x) => x[1])
  return { present: true, action, methode, champs }
}
function mentionsDe(html, artisan) {
  const attendues = (/<meta\s+name="mentions-attendues"\s+content="([^"]*)"/i.exec(html)?.[1] ?? MENTIONS_PAR_DEFAUT.join(',')).split(',').map((x) => x.trim()).filter(Boolean)
  const section = /<section[^>]*\bid="mentions-legales"[^>]*>([\s\S]*?)<\/section>/i.exec(html)
  const texte = section ? texteDe(section[1]) : ''
  const absentes = attendues.filter((cle) => !(artisan?.[cle] && texte.includes(String(artisan[cle]).toLowerCase())))
  return { attendues, absentes }
}
function robotsInterdits(corps) {
  const interdits = []
  let global = false
  for (const l of corps.split(/\r?\n/)) {
    const t = l.replace(/#.*/, '').trim()
    const m = /^([a-z-]+)\s*:\s*(.*)$/i.exec(t)
    if (!m) continue
    if (/^user-agent$/i.test(m[1])) global = m[2].trim() === '*'
    else if (global && /^disallow$/i.test(m[1]) && m[2].trim()) interdits.push(m[2].trim())
  }
  return interdits
}

// ── le verdict visuel : Codex seulement, sinon « non mesuré » ───────────────────────────────────────────────────────────
export async function verdictVisuel(capture, deps = {}) {
  const e = deps.moteurVisuel
  if (!capture || !e || e.moteur !== 'codex' || e.personnelles !== true || /[:-]cloud$/.test(e.modele ?? '') || typeof deps.appelerModele !== 'function') {
    return { statut: 'non_mesure', raison: 'pas de moteur autorisé pour une donnée personnelle (Codex, personnelles: true) ou pas de capture' }
  }
  const verdict = await deps.appelerModele({ moteur: e.moteur, modele: e.modele, personnelles: true, capture })
  return { statut: 'mesure', verdict }
}

// ── l'audit d'un site ───────────────────────────────────────────────────────────────────────────────────────────────
export async function auditerSite(commande, deps = {}) {
  const base = { id: commande.id, pannes: [] }
  if (commande.statut_site === 'programme_retrait' || commande.retrait_programme_le) return { ...base, statut: 'exclu_retrait' }
  if (!commande.url_en_ligne) return { ...base, statut: 'livraison_inachevee' }

  const intervalle = deps.intervalleMs ?? INTERVALLE_MS
  const delaiMs = deps.delaiMs ?? DELAI_MS
  const budget = deps.budgetOctets ?? BUDGET_OCTETS
  const resoudre = deps.resoudre ?? ((u) => u)
  const accueil = new URL(commande.url_en_ligne)
  const lire = async (url, methode = 'GET') => {
    const prochaine = (dernierParHote.get(accueil.host) ?? 0) + intervalle
    const attente = prochaine - Date.now()
    if (attente > 0) await pause(attente)
    dernierParHote.set(accueil.host, Date.now())
    try { return await requete(resoudre(url), { methode, delaiMs }) } catch (e) { return { code: null, entetes: {}, octets: 0, corps: '', erreur: e.message } }
  }
  const pannes = []
  const signaler = (type, detail) => pannes.push({ type, detail })

  const r = await lire(accueil.href)
  const tls = r.entetes['x-simule-tls'] ?? null
  const protocole = tls === 'aucun' ? 'http' : tls ? 'https' : accueil.protocol.replace(':', '')
  const certificat = tls === 'valide' || tls === 'expire' ? tls : tls === 'aucun' ? 'absent' : 'inconnu'
  const disponibilite = { code: r.code, protocole, certificat }
  if (r.code === null || r.code >= 400) signaler('indisponible', r.code === null ? `aucune réponse (${r.erreur})` : `code HTTP ${r.code}`)
  if (protocole === 'http') signaler('protocole_non_securise', 'le site est servi en HTTP, sans chiffrement')
  if (certificat === 'expire') signaler('certificat_invalide', 'certificat expiré')

  const poids = { octets: r.octets, budget, excessif: r.octets > budget }
  if (poids.excessif) signaler('poids_excessif', `${r.octets} octets reçus pour un budget de ${budget}`)

  const html = r.code !== null && r.code < 400 ? r.corps : ''
  const contraste = analyserContrastes(html)
  const alts = [...html.matchAll(/<img\b[^>]*>/gi)].filter((x) => !/\balt\s*=/i.test(x[0])).length
  const accessibilite = { evalues: contraste.evalues, contrastes: contraste.insuffisants, alt_manquants: alts }
  for (const c of contraste.insuffisants) signaler('contraste_insuffisant', `${c.element} : ratio ${c.ratio} (${c.couleur} sur ${c.fond}), seuil ${c.seuil}`)
  if (alts > 0) signaler('alt_manquant', `${alts} image(s) sans attribut alt`)

  const liens = { verifies: [], morts: [], ignores_robots: [] }
  if (html) {
    const rb = await lire(new URL('/robots.txt', accueil).href)
    const interdits = rb.code === 200 ? robotsInterdits(rb.corps) : []
    const cibles = new Set()
    for (const m of html.matchAll(/<a\b[^>]*\bhref\s*=\s*"([^"]*)"/gi)) {
      if (/^(#|mailto:|tel:|javascript:)/i.test(m[1])) continue
      let u
      try { u = new URL(m[1], accueil) } catch { continue }
      if (u.origin !== accueil.origin || u.pathname === accueil.pathname) continue
      u.hash = ''
      cibles.add(u.href)
    }
    for (const href of cibles) {
      const chemin = new URL(href).pathname
      if (interdits.some((p) => chemin.startsWith(p))) { liens.ignores_robots.push(href); continue }
      let courant = href
      const vus = [href]
      let mort = null
      let dernier = null
      for (let saut = 0; saut <= 1 && !dernier; saut++) {
        const rep = await lire(courant)
        if (rep.code === null) { mort = { url: href, code: null, raison: rep.erreur === 'delai_depasse' ? 'delai_depasse' : 'erreur_reseau' }; dernier = rep; break }
        if (rep.code >= 300 && rep.code < 400 && rep.entetes.location) {
          const suite = new URL(rep.entetes.location, courant).href
          if (vus.includes(suite)) { mort = { url: href, code: rep.code, raison: 'boucle' }; dernier = rep; break }
          vus.push(suite); courant = suite
          if (saut === 1) { mort = { url: href, code: rep.code, raison: 'redirection_multiple' }; dernier = rep }
          continue
        }
        dernier = rep
        if (rep.code >= 400) mort = { url: href, code: rep.code, raison: `http_${rep.code}` }
      }
      liens.verifies.push({ url: href, code: dernier?.code ?? null })
      if (mort) liens.morts.push(mort)
    }
    if (liens.morts.length) signaler('lien_mort', liens.morts.map((x) => `${x.url} (${x.raison})`).join(' ; '))
  }

  const mentions = html ? mentionsDe(html, commande.artisan) : { attendues: [], absentes: [] }
  if (html && mentions.absentes.length) signaler('mentions_absentes', `absentes : ${mentions.absentes.join(', ')}`)

  const f = formulaireDe(html)
  const raisons = []
  const formulaire = { ...f, point_entree: null }
  if (html) {
    if (!f.present) raisons.push('formulaire_absent')
    else {
      if (!f.action) raisons.push('action_absente')
      if (!f.champs.length) raisons.push('sans_champs')
      if (f.action) {
        const e = await lire(new URL(f.action, accueil).href, 'HEAD')
        formulaire.point_entree = { code: e.code }
        if (e.code === null || (e.code >= 400 && e.code !== 405)) raisons.push(`point_entree_en_erreur (${e.code ?? e.erreur})`)
      }
    }
    if (raisons.length) signaler('formulaire_casse', raisons.join(', '))
  }

  const visuel = await verdictVisuel(deps.capture, deps)
  return { ...base, statut: 'audite', disponibilite, poids, accessibilite, liens, mentions, formulaire, visuel, pannes }
}

// ── la passe : une décision par panne, jamais une correction ──────────────────────────────────────────────────────────────
export async function passer(commandes, deps = {}) {
  const periode = (deps.maintenant ? deps.maintenant() : new Date()).toISOString().slice(0, 7)
  const resultat = { audits: [], decisions_creees: [], decisions_ecartees: [] }
  for (const c of commandes) {
    const audit = await auditerSite(c, deps)
    resultat.audits.push(audit)
    for (const p of audit.pannes) {
      const cle = `${c.id}:${p.type}:${periode}`
      if (deps.decisionExiste && await deps.decisionExiste(cle)) { resultat.decisions_ecartees.push(cle); continue }
      await deps.creerDecision({ type: 'qualite_site', cle, commande_id: c.id, panne: p.type, detail: p.detail, destinataire: 'livreur_ou_claude_code', proposition: PROPOSITIONS[p.type] })
      resultat.decisions_creees.push(cle)
      // FIN-DECISION
    }
  }
  return resultat
}
