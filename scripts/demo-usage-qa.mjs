// Juge d'usage : observations du navigateur, sans modifier ni soumettre les formulaires.
import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

const argumentsCli = Object.fromEntries(process.argv.slice(2).map((argument) => {
  const position = argument.indexOf('=')
  return [argument.slice(0, position), argument.slice(position + 1)]
}))
const url = argumentsCli['--url']
const sortie = path.resolve(argumentsCli['--sortie'] || '.orchestre/preuves/018-02/prod')
if (!url || !/^https?:$/.test(new URL(url).protocol)) {
  console.error('Usage : node scripts/demo-usage-qa.mjs --url=<adresse http(s)> --sortie=<dossier>')
  process.exit(1)
}
await fs.mkdir(sortie, { recursive: true })
const rapport = { url, date: new Date().toISOString(), controles: [] }
const profils = {
  bureau: { viewport: { width: 1440, height: 900 } },
  telephone: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
}
let navigateur

// Chaque contrôle conserve ses observations, même si une action ultérieure échoue.
async function controler(id, travail) {
  const resultat = { id, ok: false, preuve: '', captures: [] }
  try { await travail(resultat) } catch (erreur) {
    resultat.ok = false
    resultat.preuve += ` ; contrôle interrompu : ${erreur.message}`
  }
  rapport.controles.push(resultat)
  console.log(`${resultat.ok ? '✓' : '✗'} ${id} — ${resultat.preuve}`)
  await fs.writeFile(path.join(sortie, 'rapport.json'), JSON.stringify(rapport, null, 2) + '\n')
}

async function avecPage(profil, travail) {
  const contexte = await navigateur.newContext({ ...profils[profil], serviceWorkers: 'block' })
  contexte.setDefaultTimeout(7000)
  contexte.setDefaultNavigationTimeout(30000)
  try { await travail(await contexte.newPage(), contexte) } finally { await contexte.close() }
}

async function accueil(page) {
  const reponse = await page.goto(url, { waitUntil: 'load' })
  if (reponse?.status() !== 200) throw new Error(`Accueil HTTP ${reponse?.status() ?? 'sans réponse'}`)
  await page.waitForTimeout(900)
}

async function capture(page, resultat, nom) {
  await page.screenshot({ path: path.join(sortie, nom), fullPage: false, timeout: 15000 })
  resultat.captures.push(nom)
}

async function boutonMenu(page) {
  const candidats = page.locator('button[aria-controls], button[aria-expanded], button[aria-label*="menu" i], .burger, [role="button"][aria-controls]')
  for (let indice = 0; indice < await candidats.count(); indice++) {
    const bouton = candidats.nth(indice)
    if (await bouton.isVisible() && await bouton.evaluate((element) =>
      /menu|burger|navigation|panneau/i.test(`${element.outerHTML} ${element.getAttribute('aria-controls')}`))) return bouton
  }
  throw new Error('Aucun bouton de menu visible et identifiable')
}

async function etatMenu(bouton) {
  return bouton.evaluate((element) => {
    const panneau = document.getElementById(element.getAttribute('aria-controls')) || document.querySelector('.panneau, [role="navigation"]')
    const visible = (noeud) => {
      if (!noeud) return false
      const rectangle = noeud.getBoundingClientRect()
      for (let parent = noeud; parent; parent = parent.parentElement) {
        const style = getComputedStyle(parent)
        if (parent.hidden || parent.getAttribute('aria-hidden') === 'true' || style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false
      }
      return rectangle.width > 0 && rectangle.height > 0 && rectangle.right > 0 && rectangle.bottom > 0 && rectangle.left < innerWidth && rectangle.top < innerHeight
    }
    const rectangle = element.getBoundingClientRect()
    const x = rectangle.x + rectangle.width / 2
    const y = rectangle.y + rectangle.height / 2
    const dessus = document.elementFromPoint(x, y)
    return {
      developpe: element.getAttribute('aria-expanded'), panneauVisible: visible(panneau),
      classe: panneau?.className ?? null, boutonAtteignable: !!dessus && element.contains(dessus),
      dessus: dessus ? `${dessus.tagName}.${dessus.className}` : 'aucun élément', x, y,
    }
  })
}

async function formulaireVisible(page) {
  return page.evaluate(() => {
    const visible = (element) => {
      const rectangle = element.getBoundingClientRect()
      for (let parent = element; parent; parent = parent.parentElement) {
        const style = getComputedStyle(parent)
        if (style.display === 'none' || style.visibility !== 'visible' || Number(style.opacity) === 0) return false
      }
      return rectangle.width > 0 && rectangle.height > 0 && rectangle.top < innerHeight && rectangle.bottom > 0 && rectangle.left < innerWidth && rectangle.right > 0
    }
    return [...document.forms].map((formulaire) => ({
      visible: visible(formulaire),
      champs: [...formulaire.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select')].filter(visible).length,
    })).filter((formulaire) => formulaire.visible && formulaire.champs >= 2)
  })
}

try {
  navigateur = await chromium.launch({ headless: true })

  await controler('menu-mobile-ferme', async (resultat) => avecPage('telephone', async (page) => {
    await accueil(page)
    const bouton = await boutonMenu(page)
    const avant = await etatMenu(bouton)
    await bouton.tap()
    await page.waitForTimeout(900)
    const ouvert = await etatMenu(bouton)
    await capture(page, resultat, 'menu-ouvert.png')
    // Un tap physique révèle l'interception du panneau ; aucun clic forcé ni dispatchEvent.
    await page.touchscreen.tap(ouvert.x, ouvert.y)
    await page.waitForTimeout(900)
    const apres = await etatMenu(bouton)
    await capture(page, resultat, 'menu-second-tap.png')
    resultat.ok = !avant.panneauVisible && ouvert.panneauVisible && ouvert.boutonAtteignable && !apres.panneauVisible && apres.developpe !== 'true'
    resultat.preuve = `390×844 tactile ; avant=${JSON.stringify(avant)} ; ouvert=${JSON.stringify(ouvert)} ; après second tap=${JSON.stringify(apres)}`
  }))

  await controler('devis-mene-formulaire', async (resultat) => {
    const observations = []
    for (const profil of ['bureau', 'telephone']) await avecPage(profil, async (page, contexte) => {
      await accueil(page)
      const nombre = await page.locator('a, button, [role="button"]').filter({ hasText: /devis/i }).count()
      if (!nombre) {
        observations.push({ profil, ok: false, preuve: 'Aucun lien ou bouton contenant devis' })
        await capture(page, resultat, `devis-${profil}-absent.png`)
      }
      for (let indice = 0; indice < nombre; indice++) {
        await accueil(page)
        const cible = page.locator('a, button, [role="button"]').filter({ hasText: /devis/i }).nth(indice)
        const observation = { profil, indice, texte: (await cible.innerText()).trim(), ok: false }
        let destination = page
        try {
          if (!await cible.isVisible()) {
            const menu = await boutonMenu(page).catch(() => null)
            if (menu) {
              if (profil === 'telephone') await menu.tap()
              else await menu.click()
              await page.waitForTimeout(900)
            }
          }
          observation.href = await cible.getAttribute('href')
          const nouvellesPages = []
          const collecter = (nouvelle) => nouvellesPages.push(nouvelle)
          contexte.on('page', collecter)
          try {
            if (profil === 'telephone') await cible.tap()
            else await cible.click()
            await page.waitForTimeout(1200)
            destination = nouvellesPages[0] || page
            await destination.waitForLoadState('load')
            const limite = Date.now() + 3500
            do {
              observation.formulaires = await formulaireVisible(destination)
              if (observation.formulaires.length) break
              await destination.waitForTimeout(200)
            } while (Date.now() < limite)
            observation.url = destination.url()
            observation.ok = !/^(tel|mailto):/i.test(observation.href || '') && observation.formulaires.length > 0
          } finally { contexte.off('page', collecter) }
        } catch (erreur) { observation.erreur = erreur.message }
        await capture(destination, resultat, `devis-${profil}-${indice + 1}.png`)
        observations.push(observation)
        resultat.preuve = `Chaque accès devis, bureau puis téléphone : ${JSON.stringify(observations)}`
        if (destination !== page) await destination.close()
      }
    })
    resultat.ok = observations.length > 0 && observations.every((observation) => observation.ok)
    resultat.preuve = `Chaque accès devis, bureau puis téléphone : ${JSON.stringify(observations)}`
  })

  await controler('polices-premier-passage', async (resultat) => avecPage('bureau', async (page, contexte) => {
    const cdp = await contexte.newCDPSession(page)
    await cdp.send('Network.enable')
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true })
    await cdp.send('DOM.enable')
    await cdp.send('CSS.enable')
    // Première navigation uniquement : ne pas recharger ni attendre document.fonts.ready.
    const reponse = await page.goto(url, { waitUntil: 'load' })
    if (reponse?.status() !== 200) throw new Error(`Accueil HTTP ${reponse?.status()}`)
    const mesures = []
    for (const [nom, selecteur, obligatoire] of [['texte courant', 'main p, article p, p', true], ['h1', 'h1', true], ['premier .mono', '.mono', false]]) {
      const element = page.locator(selecteur).first()
      if (!await element.count()) {
        mesures.push({ element: nom, absent: true, ok: !obligatoire })
        continue
      }
      await element.scrollIntoViewIfNeeded()
      await page.evaluate(() => new Promise((resoudre) => requestAnimationFrame(() => requestAnimationFrame(resoudre))))
      const { root } = await cdp.send('DOM.getDocument')
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: selecteur })
      const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId })
      const polices = fonts.filter((police) => police.glyphCount > 0)
      mesures.push({ element: nom, polices, ok: polices.length > 0 && polices.every((police) => police.isCustomFont) })
    }
    resultat.ok = mesures.every((mesure) => mesure.ok)
    resultat.preuve = `Contexte neuf, cache désactivé, polices réellement rendues via CDP (isCustomFont distingue les fichiers web des polices système) : ${JSON.stringify(mesures)}`
  }))

  await controler('voix-premiere-personne', async (resultat) => avecPage('bureau', async (page) => {
    await accueil(page)
    // Parcourir les sections déclenche leurs révélations sans ouvrir les contenus masqués.
    const textes = new Set()
    let position = 0
    for (let passage = 0; passage < 80; passage++) {
      await page.evaluate((y) => scrollTo(0, y), position)
      await page.waitForTimeout(250)
      const lecture = await page.evaluate(() => {
        const morceaux = []
        const parcours = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
        while (parcours.nextNode()) {
          const noeud = parcours.currentNode
          const parent = noeud.parentElement
          if (!parent || parent.closest('script, style, noscript, template')) continue
          let visible = true
          for (let element = parent; element; element = element.parentElement) {
            const style = getComputedStyle(element)
            if (style.display === 'none' || style.visibility !== 'visible' || Number(style.opacity) === 0) { visible = false; break }
          }
          const rectangle = parent.getBoundingClientRect()
          if (visible && rectangle.width && rectangle.height && rectangle.top < innerHeight && rectangle.bottom > 0) morceaux.push(noeud.textContent.trim())
        }
        return { morceaux, fin: scrollY + innerHeight >= document.documentElement.scrollHeight - 2, pas: innerHeight * 0.75 }
      })
      lecture.morceaux.filter(Boolean).forEach((texte) => textes.add(texte))
      if (lecture.fin) break
      position += lecture.pas
    }
    const texte = [...textes].join(' ')
    const occurrences = [...texte.matchAll(/(?<![\p{L}\p{N}_])(?:je|mon|ma|mes)(?![\p{L}\p{N}_])|(?<![\p{L}\p{N}_])j['’]/giu)]
    const index = occurrences[0]?.index ?? 0
    resultat.ok = occurrences.length > 0
    resultat.preuve = `${occurrences.length} occurrence(s) je / j’ / mon / ma / mes dans le texte visible parcouru (fragments identiques dédupliqués). Extrait : ${texte.slice(Math.max(0, index - 70), index + 200)}`
  }))

  await controler('page-commune', async (resultat) => avecPage('bureau', async (page) => {
    await accueil(page)
    const titreAccueil = (await page.locator('h1').first().innerText()).trim()
    const lien = await page.locator('a[href]').evaluateAll((ancres) => ancres.map((ancre) => ancre.href).find((adresse) => {
      const cible = new URL(adresse)
      return cible.origin === location.origin && /\/(?:menuisier|plombier|electricien|couvreur|peintre|macon|carreleur|chauffagiste|paysagiste|serrurier|charpentier|artisan)-[a-z][a-z-]+(?:\/|\.html|$)/i.test(cible.pathname)
    }))
    if (!lien) { resultat.preuve = 'Aucun lien interne vers une page métier-commune trouvé sur l’accueil.'; return }
    const reponse = await page.goto(lien, { waitUntil: 'load' })
    await page.waitForTimeout(900)
    const titre = await page.locator('h1').first().innerText().catch(() => '')
    const images = await page.locator('img').evaluateAll((elements) => elements.filter((element) => {
      const rectangle = element.getBoundingClientRect()
      for (let parent = element; parent; parent = parent.parentElement) {
        const style = getComputedStyle(parent)
        if (style.display === 'none' || style.visibility !== 'visible' || Number(style.opacity) === 0) return false
      }
      return element.complete && element.naturalWidth > 0 && rectangle.width > 0 && rectangle.height > 0 && rectangle.top < innerHeight && rectangle.bottom > 0 && rectangle.left < innerWidth && rectangle.right > 0
    }).map((element) => element.currentSrc))
    await capture(page, resultat, 'page-commune.png')
    resultat.ok = reponse?.status() === 200 && !!titre.trim() && titre.trim() !== titreAccueil && images.length > 0
    resultat.preuve = `${lien} : HTTP ${reponse?.status()} ; h1 accueil=${JSON.stringify(titreAccueil)} ; h1 commune=${JSON.stringify(titre.trim())} ; images chargées visibles au premier écran=${JSON.stringify(images)}`
  }))

  await controler('liens-internes-ok', async (resultat) => avecPage('bureau', async (page, contexte) => {
    await accueil(page)
    const liens = await page.locator('a[href]').evaluateAll((ancres) => [...new Set(ancres.flatMap((ancre) => {
      const brut = ancre.getAttribute('href')?.trim()
      if (!brut || brut.startsWith('#')) return []
      const cible = new URL(ancre.href)
      if (!/^https?:$/.test(cible.protocol) || cible.origin !== location.origin) return []
      cible.hash = ''
      return [cible.href]
    }))])
    const observations = []
    for (const lien of liens) {
      try {
        const reponse = await contexte.request.get(lien, { timeout: 20000 })
        observations.push({ url: lien, statut: reponse.status(), destination: reponse.url() })
        await reponse.dispose()
      } catch (erreur) { observations.push({ url: lien, statut: null, erreur: erreur.message }) }
    }
    resultat.ok = observations.every((observation) => observation.statut === 200)
    resultat.preuve = `${liens.length} liens internes uniques (ancres seules exclues), requêtes GET avec redirections : ${JSON.stringify(observations)}`
  }))

  await controler('console-sans-erreur', async (resultat) => avecPage('bureau', async (page) => {
    const erreurs = []
    page.on('console', (message) => { if (message.type() === 'error') erreurs.push({ type: 'console', texte: message.text(), position: message.location() }) })
    page.on('pageerror', (erreur) => erreurs.push({ type: 'exception', texte: erreur.message }))
    try { await accueil(page); await page.waitForTimeout(1500) } finally {
      resultat.preuve = `Accueil : erreurs console et exceptions de page vues depuis avant la navigation : ${erreurs.length ? JSON.stringify(erreurs) : 'aucune'}.`
    }
    resultat.ok = erreurs.length === 0
  }))
} catch (erreur) {
  console.error(`Impossible de terminer le juge d'usage : ${erreur.message}`)
  rapport.erreur = erreur.message
} finally {
  await navigateur?.close()
  await fs.writeFile(path.join(sortie, 'rapport.json'), JSON.stringify(rapport, null, 2) + '\n')
  process.exitCode = rapport.erreur || rapport.controles.length !== 7 || rapport.controles.some((controle) => !controle.ok) ? 1 : 0
}
