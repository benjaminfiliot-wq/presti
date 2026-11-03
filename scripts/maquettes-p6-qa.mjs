#!/usr/bin/env node
// Juge des maquettes du § 1.3 du prompt 6 (tâche 036-010).
//
// Il rend lui-même chaque maquette HTML dans un Chromium sans écran (Playwright), à 390 et 1440 px, prend les captures,
// puis vérifie sur le DOM rendu (jamais sur un texte qu'il aurait écrit) :
//   - les cinq écrans existent (centre de commande, « Ce que vos assistants ont fait », Connexions, Mes départements, CRM atelier) ;
//   - aucun mot interdit (« garanti », « 100 % »…), aucun jargon technique devant l'artisan (agent, n8n, workflow, prompt…) ;
//   - aucun « Presti » dans ce que verra le client de l'artisan (blocs data-surface="client") ;
//   - chaque action porte sa ligne « fait : … » (B4) et, tant qu'elle n'est pas partie, son bouton manuel au même endroit (B3) ;
//   - tout ce qui est parti ou « envoyé » renvoie à une entrée du journal ;
//   - une seule question ouverte à la fois (B4), exactement une dans le CRM ;
//   - Mes départements : en Studio, aucun « part seul » actif, chaque type porte le verrou d'offre (capacité de peut()) ;
//     les gestes « jamais seuls » ne sont « part seul » dans aucune offre ;
//   - Connexions : chaque outil de la matrice OUTILLAGE.md § 5, avec son état ; un outil non branché dit « Connecter » et
//     n'affiche aucune date de synchronisation (jamais une fausse donnée) ;
//   - CRM : panneau à une question, import en trois temps (lire, aperçu, valider), chiffres avec leur source et leur date (C3) ;
//   - contraste WCAG AA de chaque texte visible (4,5:1, 3:1 pour le grand texte), sans défilement horizontal à 390 px ;
//   - mouvement réduit : sous prefers-reduced-motion, plus aucune animation ni transition ;
//   - les captures existent, sont des PNG à la bonne largeur.
// Puis il rejoue ces contrôles sur des copies mutées et exige que chaque mutant soit refusé (preuve qu'il sait rougir).
//
// Usage : node scripts/maquettes-p6-qa.mjs            (contrôles + captures + mutants)
//         node scripts/maquettes-p6-qa.mjs --sans-mutants
// Hors ligne : un petit serveur sur 127.0.0.1 sert les fichiers ; aucune autre requête n'est permise (route bloquée).

import { createServer } from 'node:http'
import { readFileSync, writeFileSync, existsSync, mkdirSync, cpSync, rmSync, readdirSync, statSync } from 'node:fs'
import { join, extname, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

// fileURLToPath, pas URL().pathname : sous Windows, pathname rend « /C:/… » et le chemin devenait « C:\C:\… » (relevé au PC le 03/11).
const RACINE = resolve(fileURLToPath(new URL('..', import.meta.url)))
const DOSSIER = join(RACINE, 'plans/011-cadrage-01-11/p6-signature/maquettes')
const CAPTURES = join(RACINE, '.orchestre/preuves/036-010/captures')
const SANS_MUTANTS = process.argv.includes('--sans-mutants')

const ECRANS = [
  { fichier: 'centre-de-commande.html', ecran: 'centre-de-commande' },
  { fichier: 'ce-qui-a-ete-fait.html', ecran: 'ce-qui-a-ete-fait' },
  { fichier: 'connexions.html', ecran: 'connexions' },
  { fichier: 'departements.html', ecran: 'departements' },
  { fichier: 'departements.html', ecran: 'departements', variante: 'studio', ancre: '#studio' },
  { fichier: 'crm-atelier.html', ecran: 'crm-atelier' },
]
const LARGEURS = [390, 1440]

// Matrice des outils, OUTILLAGE.md § 5 (et la liste de la tâche 036-010).
const OUTILS = ['gmail', 'outlook', 'imap-smtp', 'google-agenda', 'outlook-agenda', 'google-drive', 'onedrive', 'google-sheets', 'excel',
  'fiche-google', 'whatsapp', 'telegram', 'sms', 'facebook', 'instagram', 'linkedin', 'stripe', 'slack', 'teams']
// Types qui ne partent jamais seuls (OUTILS_JAMAIS_AUTO, lib/pilote/regles.ts:79-82 ; décisions 3 et 5 du plan p6).
const JAMAIS_SEULS = ['emettre-facture', 'marquer-payee', 'avis-negatif', 'rendez-vous', 'commande-fournisseur']

const MOTS_INTERDITS = [
  [/garanti/i, '« garanti »'], [/\b100\s?%/, '« 100 % »'], [/\b99\s?%/, '« 99 % »'], [/sans aucun risque/i, '« sans aucun risque »'],
  [/remplace votre/i, '« remplace votre … »'],
]
const JARGON = [[/\bagents?\b/i, 'agent'], [/\bn8n\b/i, 'n8n'], [/\bworkflows?\b/i, 'workflow'], [/\bprompts?\b/i, 'prompt'],
  [/\bMCP\b/, 'MCP'], [/\bLLM\b/, 'LLM'], [/\bHermes\b/i, 'Hermes'], [/\bOrca\b/, 'Orca'], [/\bpipeline\b/i, 'pipeline']]

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' }

function servir(dossier) {
  return new Promise((ok) => {
    const s = createServer((req, res) => {
      const chemin = join(dossier, decodeURIComponent(new URL(req.url, 'http://x').pathname))
      if (!chemin.startsWith(dossier) || !existsSync(chemin) || statSync(chemin).isDirectory()) { res.writeHead(404); res.end(); return }
      res.writeHead(200, { 'content-type': TYPES[extname(chemin)] || 'application/octet-stream' })
      res.end(readFileSync(chemin))
    })
    s.listen(0, '127.0.0.1', () => ok(s))
  })
}

// ---------------------------------------------------------------- contrôles dans la page (exécutés par le navigateur)
function controlesPage({ ecran, variante, MOTS, JARG, OUTILS, JAMAIS }) {
  const err = []
  const re = (x) => new RegExp(x[0], x[1])
  const body = document.body
  if (!body || body.dataset.ecran !== ecran) err.push(`écran ${ecran} : attribut data-ecran absent ou faux`)
  const texte = body.innerText
  if (!/données d'exemple/i.test(texte)) err.push(`${ecran} : bandeau « données d'exemple » absent`)
  for (const [m, nom] of MOTS) if (re(m).test(texte)) err.push(`${ecran} : mot interdit ${nom}`)
  for (const [m, nom] of JARG) if (re(m).test(texte)) err.push(`${ecran} : jargon technique devant l'artisan (${nom})`)

  // White-label : ce que voit le client de l'artisan.
  for (const c of document.querySelectorAll('[data-surface="client"]')) if (/presti/i.test(c.textContent)) err.push(`${ecran} : « Presti » dans un message destiné au client`)

  // B4 et B3 : chaque action, sa ligne « fait : … » ; tant qu'elle n'est pas partie, son bouton manuel.
  for (const a of document.querySelectorAll('[data-action]')) {
    const nom = a.dataset.action
    const fait = [...a.querySelectorAll('.fait')].find((f) => f.closest('[data-action]') === a)
    if (!fait || !/^\s*fait\s*:/i.test(fait.textContent)) err.push(`${ecran} : action « ${nom} » sans sa ligne « fait : … »`)
    const statut = a.dataset.statut
    if (!statut) err.push(`${ecran} : action « ${nom} » sans statut`)
    if (['repere', 'prepare', 'a-valider'].includes(statut) && !a.querySelector('[data-manuel]')) err.push(`${ecran} : action « ${nom} » sans bouton manuel (double chemin)`)
    if (['parti', 'en-delai', 'fait'].includes(statut) && !/^J-\d{4,}$/.test(a.dataset.journal || '')) err.push(`${ecran} : action « ${nom} » partie sans entrée de journal`)
    if (statut === 'parti' && !a.querySelector('[data-journal-lien]')) err.push(`${ecran} : action « ${nom} » partie sans lien vers le journal`)
  }
  // Un « envoyé » affiché hors d'une action journalisée.
  const marcheur = document.createTreeWalker(body, NodeFilter.SHOW_TEXT)
  for (let n = marcheur.nextNode(); n; n = marcheur.nextNode()) {
    if (/\benvoyée?s?\s+(à|le|ce|hier|aujourd)/i.test(n.textContent)) {
      const porteur = n.parentElement.closest('[data-journal]')
      if (!porteur || !/^J-\d{4,}$/.test(porteur.dataset.journal)) err.push(`${ecran} : « ${n.textContent.trim().slice(0, 40)} » sans entrée de journal`)
    }
  }

  // B4 : une question à la fois.
  const ouvertes = document.querySelectorAll('[data-question="ouverte"]').length
  if (ouvertes > 1) err.push(`${ecran} : ${ouvertes} questions posées à la fois`)

  if (ecran === 'centre-de-commande') {
    if (!document.querySelector('[data-priorite="1"]') || !document.querySelector('[data-priorite="3"]') || document.querySelectorAll('[data-priorite]').length !== 3) err.push('centre : la barre du jour doit porter trois priorités')
    if (!document.querySelector('[data-tout-valider]')) err.push('centre : pas de « tout valider »')
    if (!document.querySelector('#a-valider [data-action] .feu')) err.push('centre : « À valider » sans feu vert par ligne')
    if (!document.querySelector('[data-action^="exception"]')) err.push('centre : pas d\'exception préparée')
    if (!/votre matin/i.test(texte)) err.push('centre : page du matin absente')
  }
  if (ecran === 'ce-qui-a-ete-fait') {
    for (const col of ['repere', 'prepare', 'a-valider', 'parti']) if (!document.querySelector(`[data-colonne="${col}"]`)) err.push(`fait : colonne ${col} absente`)
    if (!document.querySelector('[data-cout-ia]')) err.push('fait : coût IA du jour absent')
    const enDelai = document.querySelectorAll('[data-statut="en-delai"]')
    if (!enDelai.length) err.push('fait : aucune action annulable pendant le délai')
    for (const a of enDelai) if (![...a.querySelectorAll('button')].some((b) => /annuler/i.test(b.textContent))) err.push('fait : action en délai sans « Annuler »')
  }
  if (ecran === 'connexions') {
    for (const id of OUTILS) {
      const o = document.querySelector(`[data-outil="${id}"]`)
      if (!o) { err.push(`connexions : outil « ${id} » absent`); continue }
      const etat = o.dataset.etat
      const boutons = [...o.querySelectorAll('button')].map((b) => b.textContent.trim())
      if (!['branche', 'a-reconnecter', 'non-branche'].includes(etat)) err.push(`connexions : « ${id} » sans état`)
      if (!o.querySelector('[data-etat-libelle]')) err.push(`connexions : « ${id} » n'affiche pas son état`)
      if (etat === 'branche') {
        if (!o.querySelector('.synchro') || !/\d/.test(o.querySelector('.synchro').textContent)) err.push(`connexions : « ${id} » branché sans dernière synchronisation`)
        if (!o.querySelector('.verifie') || !/vérifié le/i.test(o.querySelector('.verifie').textContent)) err.push(`connexions : « ${id} » branché sans « vérifié le »`)
        if (!boutons.some((b) => /^Retirer/.test(b))) err.push(`connexions : « ${id} » branché sans bouton « Retirer »`)
      }
      if (etat === 'a-reconnecter' && !boutons.some((b) => /^Reconnecter/.test(b))) err.push(`connexions : « ${id} » à reconnecter sans bouton`)
      if (etat === 'non-branche') {
        if (!boutons.some((b) => /^Connecter/.test(b))) err.push(`connexions : « ${id} » non branché sans « Connecter »`)
        if (o.querySelector('.synchro, .verifie')) err.push(`connexions : « ${id} » non branché affiche une synchronisation (fausse donnée)`)
      }
    }
  }
  if (ecran === 'departements') {
    const studio = document.querySelector('[data-offre-vue="studio"]')
    const signature = document.querySelector('[data-offre-vue="signature"]')
    if (!studio || !signature) err.push('départements : il faut la vue Signature et la vue Studio')
    if (studio) {
      if (studio.querySelector('[data-mode="part-seul"][aria-pressed="true"]')) err.push('départements : « Part seul » actif en Studio')
      for (const b of studio.querySelectorAll('[data-mode="part-seul"]')) if (!b.disabled) err.push('départements : bouton « Part seul » cliquable en Studio')
      const types = studio.querySelectorAll('[data-type]')
      if (types.length < 8) err.push('départements : trop peu de types en Studio')
      for (const t of types) {
        if (!t.querySelector('[data-mode="a-valider"][aria-pressed="true"]')) err.push(`départements : « ${t.dataset.type} » n'est pas « à valider » en Studio`)
        if (!t.querySelector('[data-verrou][data-capacite]') && !t.querySelector('[data-verrou="jamais"]') && !t.querySelector('[data-verrou="non-ouvert"]')) err.push(`départements : « ${t.dataset.type} » sans verrou d'offre en Studio`)
      }
    }
    if (signature && !signature.querySelector('[data-mode="part-seul"][aria-pressed="true"]')) err.push('départements : aucun « part seul » en Signature')
    for (const id of JAMAIS) for (const t of document.querySelectorAll(`[data-type="${id}"]`)) if (t.querySelector('[data-mode="part-seul"][aria-pressed="true"]') || !t.querySelector('[data-verrou="jamais"]')) err.push(`départements : « ${id} » doit rester à valider, toujours`)
    if (signature) for (const d of signature.querySelectorAll('[data-departement]')) {
      if (!d.querySelector('[data-interrupteur]')) err.push(`départements : « ${d.dataset.departement} » sans interrupteur`)
    }
    if (signature && !signature.querySelector('[data-plafond]')) err.push('départements : plafond du jour absent')
  }
  if (ecran === 'crm-atelier') {
    if (ouvertes !== 1) err.push(`crm : il faut exactement une question ouverte (${ouvertes})`)
    const panneau = document.querySelector('[data-panneau-questions]')
    if (!panneau) err.push('crm : panneau « une question à la fois » absent')
    else for (const r of panneau.querySelectorAll('[data-reponse]')) if (!r.querySelector('.fait')) err.push('crm : une réponse sans ce qu\'elle a mis à jour')
    const imp = document.querySelector('[data-import]')
    if (!imp) err.push('crm : import d\'un export absent')
    else for (const p of ['lire', 'apercu', 'valider']) if (!imp.querySelector(`[data-etape="${p}"]`)) err.push(`crm : étape d'import « ${p} » absente`)
    const chiffres = document.querySelectorAll('[data-chiffre]')
    if (chiffres.length < 3) err.push('crm : trop peu de chiffres sourcés')
    for (const c of chiffres) {
      const s = c.querySelector('.source')
      if (!c.dataset.source || !s || !(/lu dans .+ le \d\d\/\d\d/i.test(s.textContent) || /déclaré/i.test(s.textContent))) err.push('crm : chiffre sans source ni date')
    }
    if (!document.querySelector('[data-onglets-crm]')) err.push('crm : les onglets existants du CRM ont disparu')
  }

  // Contraste WCAG AA de chaque texte visible.
  const rgba = (s) => { const m = s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] === undefined ? 1 : p[3]] }
  const sur = (a, b) => [a[0] * a[3] + b[0] * (1 - a[3]), a[1] * a[3] + b[1] * (1 - a[3]), a[2] * a[3] + b[2] * (1 - a[3]), 1]
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]) }
  const fondDe = (el) => {
    const pile = []
    for (let e = el; e; e = e.parentElement) { const c = rgba(getComputedStyle(e).backgroundColor); if (c && c[3] > 0) pile.push(c) }
    let f = [255, 255, 255, 1]
    for (const c of pile.reverse()) f = sur(c, f)
    return f
  }
  let vus = 0
  for (const el of body.querySelectorAll('*')) {
    if (el.closest('svg, .sr, [disabled], [aria-disabled="true"], [aria-hidden="true"]')) continue
    const propre = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
    if (!propre || !el.getClientRects().length) continue
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.display === 'none') continue
    const bg = fondDe(el)
    const fg = sur(rgba(cs.color), bg)
    const l1 = lum(fg), l2 = lum(bg)
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
    const taille = parseFloat(cs.fontSize), gras = Number(cs.fontWeight) >= 700
    const seuil = taille >= 24 || (taille >= 18.66 && gras) ? 3 : 4.5
    vus++
    if (ratio < seuil) err.push(`${ecran} : contraste ${ratio.toFixed(2)}:1 < ${seuil} sur « ${el.textContent.trim().slice(0, 30)} »`)
  }
  if (vus < 20) err.push(`${ecran} : trop peu de textes visibles (${vus})`)
  // Cibles tactiles au doigt (390 px) : 44 px de haut pour un bouton ; un interrupteur porte une zone élargie (::before).
  if (window.innerWidth <= 400) for (const c of body.querySelectorAll('button, a.btn, .feu, .offres a')) {
    if (!c.getClientRects().length || c.closest('[aria-hidden="true"]')) continue
    const h = c.getBoundingClientRect().height
    if (c.getAttribute('role') === 'switch') { const z = getComputedStyle(c, '::before'); if (z.position !== 'absolute' || h + 2 * Math.abs(parseFloat(z.top) || 0) < 44) err.push(`${ecran} : interrupteur sans zone tactile de 44 px`) }
    else if (h < 44) err.push(`${ecran} : cible tactile de ${Math.round(h)} px (« ${c.textContent.trim().slice(0, 24)} »)`)
  }
  for (const s of body.querySelectorAll('svg.i')) if (s.getAttribute('aria-hidden') !== 'true') { err.push(`${ecran} : icône annoncée au lecteur d'écran`); break }
  if (document.documentElement.scrollWidth > window.innerWidth + 1) err.push(`${ecran} : défilement horizontal (${document.documentElement.scrollWidth} > ${window.innerWidth})`)

  // Mouvement réduit (la page est ouverte avec prefers-reduced-motion: reduce).
  for (const el of body.querySelectorAll('*')) for (const pseudo of [null, '::before', '::after']) {
    const cs = getComputedStyle(el, pseudo)
    const anime = cs.animationName !== 'none' && cs.animationName !== '' && parseFloat(cs.animationDuration) > 0
    const trans = cs.transitionDuration.split(',').some((d) => parseFloat(d) > 0)
    if (anime || trans) { err.push(`${ecran} : mouvement sans repli en mouvement réduit (${el.tagName.toLowerCase()}${pseudo || ''} ${anime ? cs.animationName : 'transition'})`); return err }
  }
  return err
}

// ---------------------------------------------------------------- juger un dossier
async function juger(dossier, { captures = null, cheminCaptures = CAPTURES, navigateur }) {
  const erreurs = []
  for (const e of [...new Set(ECRANS.map((x) => x.fichier))]) if (!existsSync(join(dossier, e))) erreurs.push(`écran manquant : ${e}`)
  const serveur = await servir(dossier)
  const base = `http://127.0.0.1:${serveur.address().port}/`
  try {
    for (const largeur of LARGEURS) {
      // Contrôles : mouvement réduit émulé, état final.
      const ctx = await navigateur.newContext({ viewport: { width: largeur, height: 900 }, reducedMotion: 'reduce', deviceScaleFactor: 1 })
      await ctx.route('**/*', (r) => (r.request().url().startsWith(base) || r.request().url().startsWith('data:') ? r.continue() : r.abort()))
      const page = await ctx.newPage()
      for (const e of ECRANS) {
        if (!existsSync(join(dossier, e.fichier))) continue
        await page.goto(base + e.fichier + (e.ancre || ''), { waitUntil: 'load' })
        await page.evaluate(() => document.fonts.ready)
        const err = await page.evaluate(controlesPage, { ecran: e.ecran, variante: e.variante, MOTS: MOTS_INTERDITS.map(([r, n]) => [[r.source, r.flags], n]), JARG: JARGON.map(([r, n]) => [[r.source, r.flags], n]), OUTILS, JAMAIS: JAMAIS_SEULS })
        erreurs.push(...err.map((x) => `[${largeur}${e.variante ? ' ' + e.variante : ''}] ${x}`))
      }
      await ctx.close()
      // Captures : mouvement normal, après les entrées (260 ms + 200 ms de cascade).
      if (captures) {
        const ctx2 = await navigateur.newContext({ viewport: { width: largeur, height: largeur === 390 ? 844 : 900 }, deviceScaleFactor: 1 })
        await ctx2.route('**/*', (r) => (r.request().url().startsWith(base) || r.request().url().startsWith('data:') ? r.continue() : r.abort()))
        const p2 = await ctx2.newPage()
        for (const e of ECRANS) {
          if (!existsSync(join(dossier, e.fichier))) continue
          await p2.goto(base + e.fichier + (e.ancre || ''), { waitUntil: 'load' })
          await p2.evaluate(() => document.fonts.ready)
          await p2.waitForTimeout(700)
          // Fenêtre portée à la hauteur de la page : les barres fixes (navigation mobile) restent à leur place, en bas.
          const hauteur = await p2.evaluate(() => document.documentElement.scrollHeight)
          await p2.setViewportSize({ width: largeur, height: Math.min(hauteur, 16000) })
          await p2.waitForTimeout(150)
          await p2.screenshot({ path: join(captures, `${e.ecran}${e.variante ? '-' + e.variante : ''}-${largeur}.png`) })
          await p2.setViewportSize({ width: largeur, height: largeur === 390 ? 844 : 900 })
        }
        await ctx2.close()
      }
    }
  } finally { serveur.close() }
  // Les captures attendues : présentes, PNG, à la bonne largeur.
  if (cheminCaptures) for (const e of ECRANS) for (const l of LARGEURS) {
    const f = join(cheminCaptures, `${e.ecran}${e.variante ? '-' + e.variante : ''}-${l}.png`)
    if (!existsSync(f)) { erreurs.push(`capture manquante : ${f.replace(RACINE + '/', '')}`); continue }
    const b = readFileSync(f)
    const largeurPng = b.length > 24 ? b.readUInt32BE(16) : 0
    if (b.length < 8000 || b.toString('ascii', 1, 4) !== 'PNG' || largeurPng !== l) erreurs.push(`capture invalide : ${f.replace(RACINE + '/', '')} (${b.length} octets, ${largeurPng} px)`)
  }
  return erreurs
}

// ---------------------------------------------------------------- mutants
const motif = (texte, re, apres) => { if (!re.test(texte)) throw new Error(`mutant inapplicable : motif ${re} introuvable`); return texte.replace(re, apres) }
const premier = (texte, avant, apres) => { if (!texte.includes(avant)) throw new Error(`mutant inapplicable : « ${avant.slice(0, 50)} » introuvable`); return texte.replace(avant, apres) }
const MUTANTS = [
  { nom: 'un écran manquant (Connexions)', supprimer: 'connexions.html', attendu: /écran manquant : connexions/ },
  { nom: 'l\'écran CRM manquant', supprimer: 'crm-atelier.html', attendu: /écran manquant : crm-atelier/ },
  { nom: '« Part seul » actif en Studio', fichier: 'departements.html', muter: (t) => { const i = t.indexOf('data-offre-vue="studio"'); return t.slice(0, i) + premier(t.slice(i), 'data-mode="part-seul" aria-pressed="false" disabled', 'data-mode="part-seul" aria-pressed="true"') }, attendu: /Part seul » actif en Studio|cliquable en Studio/ },
  { nom: 'un « Envoyé » sans journal', fichier: 'ce-qui-a-ete-fait.html', muter: (t) => premier(t, '<p class="titre">Exemple. Hugo Lambert · chauffe-eau', '<p class="titre"><span>Envoyé à 9 h 12 </span>Exemple. Hugo Lambert · chauffe-eau'), attendu: /sans entrée de journal/ },
  { nom: 'une action partie sans son entrée de journal', fichier: 'ce-qui-a-ete-fait.html', muter: (t) => motif(t, / data-journal="J-\d+"/, ''), attendu: /partie sans entrée de journal/ },
  { nom: 'le mot interdit « garanti »', fichier: 'centre-de-commande.html', muter: (t) => premier(t, 'choses attendent', 'choses attendent, résultat garanti,'), attendu: /mot interdit « garanti »/ },
  { nom: 'le mot interdit « 100 % »', fichier: 'connexions.html', muter: (t) => premier(t, '</h1>', ' 100 % fiable</h1>'), attendu: /mot interdit « 100 % »/ },
  { nom: 'du jargon (« agent ») devant l\'artisan', fichier: 'departements.html', muter: (t) => premier(t, '</h1>', ' de vos agents</h1>'), attendu: /jargon technique/ },
  { nom: '« Presti » dans un message au client', fichier: 'centre-de-commande.html', muter: (t) => premier(t, 'signé Atelier Roux</span>', 'signé Atelier Roux</span>Envoyé avec Presti. '), attendu: /Presti » dans un message destiné au client/ },
  { nom: 'une capture manquante', capture: 'connexions-390.png', attendu: /capture manquante : .*connexions-390\.png/ },
  { nom: 'une animation sans repli en mouvement réduit', fichier: 'centre-de-commande.html', muter: (t) => premier(t, '<h1 class="salut">', '<h1 class="salut" style="animation:pulsation 1.2s infinite alternate!important">'), attendu: /mouvement sans repli/ },
  { nom: 'deux questions posées à la fois', fichier: 'crm-atelier.html', muter: (t) => premier(t, 'data-question="ouverte"', 'data-question="ouverte"></div><div data-question="ouverte"'), attendu: /2 questions posées à la fois/ },
  { nom: 'une action sans sa ligne « fait : … »', fichier: 'centre-de-commande.html', muter: (t) => motif(t, /<p class="fait">fait : <b>6 lignes sur 6[\s\S]*?<\/p>/, ''), attendu: /sans sa ligne « fait/ },
  { nom: 'une action sans bouton manuel', fichier: 'centre-de-commande.html', muter: (t) => premier(t, ' data-manuel>Répondre moi-même', '>Répondre moi-même'), attendu: /sans bouton manuel/ },
  { nom: 'un outil de la matrice absent (Teams)', fichier: 'connexions.html', muter: (t) => premier(t, 'data-outil="teams"', 'data-outil="teams-retire"'), attendu: /outil « teams » absent/ },
  { nom: 'une fausse synchronisation sur un outil non branché', fichier: 'connexions.html', muter: (t) => motif(t, /(data-outil="slack" data-etat="non-branche"[\s\S]*?<\/p>)/, '$1<p class="synchro">il y a 2 min</p>'), attendu: /fausse donnée/ },
  { nom: 'une cible tactile trop petite à 390 px', fichier: 'connexions.html', muter: (t) => premier(t, '</style>', '@media (max-width:860px){body .outil .btn{min-height:30px!important;height:30px}}</style>'), attendu: /cible tactile de 3\d px/ },
  { nom: 'un texte trop pâle (contraste)', fichier: 'crm-atelier.html', muter: (t) => premier(t, '</style>', '.source{color:#55534e!important}</style>'), attendu: /contraste/ },
]

async function main() {
  const navigateur = await chromium.launch({ headless: true })
  let rouge = false
  try {
    mkdirSync(CAPTURES, { recursive: true })
    const erreurs = await juger(DOSSIER, { captures: CAPTURES, navigateur })
    const nb = readdirSync(CAPTURES).filter((f) => f.endsWith('.png')).length
    if (erreurs.length) { rouge = true; console.log(`✗ maquettes : ${erreurs.length} défaut(s)`); for (const e of erreurs) console.log('  - ' + e) }
    else console.log(`✓ maquettes : ${new Set(ECRANS.map((e) => e.fichier)).size} écrans, ${ECRANS.length} vues × ${LARGEURS.join(' et ')} px, ${nb} captures, tous les contrôles verts`)

    if (!SANS_MUTANTS) {
      let tues = 0
      for (const m of MUTANTS) {
        const tmp = join(tmpdir(), `maquettes-p6-mutant-${process.pid}-${tues}`)
        rmSync(tmp, { recursive: true, force: true })
        cpSync(DOSSIER, join(tmp, 'm'), { recursive: true })
        cpSync(CAPTURES, join(tmp, 'c'), { recursive: true })
        let errs
        try {
          if (m.supprimer) rmSync(join(tmp, 'm', m.supprimer))
          if (m.fichier) { const f = join(tmp, 'm', m.fichier); writeFileSync(f, m.muter(readFileSync(f, 'utf8'))) }
          if (m.capture) rmSync(join(tmp, 'c', m.capture))
          errs = await juger(join(tmp, 'm'), { navigateur, cheminCaptures: join(tmp, 'c') })
        } catch (e) { errs = [`mutant inapplicable : ${e.message}`] }
        rmSync(tmp, { recursive: true, force: true })
        const tue = errs.some((x) => m.attendu.test(x)) && !errs.some((x) => /mutant inapplicable/.test(x))
        if (tue) { tues++; console.log(`  ✓ mutant refusé : ${m.nom}`) }
        else { rouge = true; console.log(`  ✗ mutant ACCEPTÉ : ${m.nom}${errs.length ? ' (' + errs.slice(0, 2).join(' | ') + ')' : ''}`) }
      }
      console.log(`${tues === MUTANTS.length ? '✓' : '✗'} mutants : ${tues}/${MUTANTS.length} refusés`)
    }
  } finally { await navigateur.close() }
  process.exit(rouge ? 1 : 0)
}

main().catch((e) => { console.error(e); process.exit(1) })
