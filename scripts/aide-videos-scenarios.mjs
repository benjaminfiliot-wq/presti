// Les gestes de chaque vidéo d'aide. Chaque scénario reçoit les outils de aide-videos-capture.mjs :
//   etape(i)    affiche le sous-titre n° i+1 (texte = etapes[i] du JSON, le même que sous la vidéo dans le centre d'aide)
//   cliquer / survoler / saisir  → souris visible, geste lent
//   ouvrir(route, sélecteurAttendu)  → va sur l'écran
//   demarrer()  → commence à enregistrer (avant : chargement, non filmé)
//   marquer(k)  → note un instant (le montage s'en sert pour accélérer une attente)
// Règle : on ne clique JAMAIS ce qui enverrait un vrai message (e-mail, SMS) : on le montre, on ne l'actionne pas.

const T = (page, texte) => page.getByText(texte, { exact: false }).first()

// Date du navigateur décalée à une heure de Paris donnée (seule Date change, pas les minuteries) : la maquette 3D suit l'heure de Paris
// (jour, crépuscule, nuit) ; une vidéo tournée le soir serait sombre. Le CRM exige la vraie date du jour : on ne change que l'heure.
const heureDeParis = async (page, hh) => {
  const cible = new Date(Date.now()); const d = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(cible)
  const g = (t) => Number(d.find((x) => x.type === t).value) % 24
  const decalage = (hh * 3600 - (g('hour') * 3600 + g('minute') * 60 + g('second'))) * 1000
  await page.addInitScript((off) => { const D = Date; class F extends D { constructor(...a) { if (a.length) super(...a); else super(D.now() + off) } static now() { return D.now() + off } } window.Date = F }, decalage)
}

// Les gestes communs sur la maquette 3D du CRM (scénarios « crm » et « demo-crm »).
//  • objet3D(cle, k)   : un « faux locator » posé là où la maquette projette l'objet à l'écran (window.__atelierEcran, exposé par ?mesure=1) ;
//  • sonder(cle, type) : AVANT de filmer, cherche la hauteur k où le clic ouvre bien le panneau attendu (un bâtiment peut cacher un objet) ;
//  • fermer / recentrer : ouvrir ou fermer un panneau redimensionne la toile et décale le cadrage ; on recentre, puis on attend le mouvement.
const maquette = ({ page, sec, cliquer, glisser }) => {
  const point = (cle, k) => page.evaluate(([c, kk]) => (window.__atelierEcran ? window.__atelierEcran(c, kk) : null), [cle, k])
  const m = {
    objet3D: async (cle, k = 0.4) => {
      const pt = await point(cle, k)
      if (!pt) throw new Error('objet introuvable dans la maquette : ' + cle)
      return { scrollIntoViewIfNeeded: async () => {}, boundingBox: async () => ({ x: pt.x - 14, y: pt.y - 14, width: 28, height: 28 }), click: async () => { await page.mouse.click(pt.x, pt.y) } }
    },
    // La clé d'un objet se lit dans la liste des éléments (toujours dans le DOM, même repliée) : 'chantier:<id>', 'categorie:<nom>', 'accueil', 'assistants'.
    cleDe: (prefixe) => page.evaluate((p) => [...document.querySelectorAll('[data-atelier-objet]')].map((e) => e.getAttribute('data-atelier-objet')).find((k) => k === p || k.startsWith(p + ':')) ?? null, prefixe),
    recentrer: async (vite = false) => { await sec(vite ? 150 : 400); const r = page.getByRole('button', { name: 'Recentrer' }); if (await r.count()) await r.first().click(); await sec(vite ? 700 : 1300) },
    fermer: async (vite = false) => { const x = page.getByRole('button', { name: 'Fermer le panneau' }); if (await x.count()) await cliquer(x.first(), { pause: vite ? 200 : 400 }); await m.recentrer(vite) },
    tourner: async (x0, y0, dx, dy) => { await glisser(x0, y0); await page.mouse.down(); await glisser(x0 + dx, y0 + dy); await page.mouse.up() },
    sonder: async (cle, type) => {
      for (const k of [0.4, 0.85, 0.2, 0.6, 0.95, 0.1, 0.7]) {
        const pt = await point(cle, k); if (!pt) break
        await page.mouse.click(pt.x, pt.y); await sec(700)
        const ouvert = await page.evaluate(() => document.querySelector('[data-atelier-panneau]')?.getAttribute('data-atelier-panneau') ?? null)
        const x = page.getByRole('button', { name: 'Fermer le panneau' }); if (await x.count()) await x.first().click(); await m.recentrer()
        if (ouvert === type) { if (process.env.AIDE_DEBUG) console.log('sonder', cle, 'k =', k); return { cle, k } }
      }
      console.log('⚠️ aucun point de clic n’ouvre « ' + cle + ' » (panneau attendu : ' + type + ')'); return { cle, k: null }
    },
  }
  return m
}

export default {
  async dashboard({ page, etape, sec, cliquer, survoler, ouvrir, demarrer }) {
    await ouvrir('/dashboard', 'text=Votre lien de contact')
    demarrer(); await sec(800)
    await etape(0)
    for (const t of ['Demandes reçues', 'À traiter', 'Chantiers gagnés', 'Réponses IA']) await survoler(T(page, t), { pause: 1400 })
    await etape(1)
    await survoler(T(page, 'prestiapp.fr/p/'), { pause: 1500 })
    await cliquer(page.getByRole('button', { name: 'Copier', exact: true }), { pause: 700 })
    await sec(3200)
    await etape(2)
    await page.mouse.wheel(0, 380); await sec(3500)
    await etape(3)
    await cliquer(page.getByRole('button', { name: 'Détail' }).first(), { pause: 900 })
    await sec(5500)
    await etape(4)
    await survoler(page.locator('select').first(), { pause: 1200 })
    await page.locator('select').first().selectOption('repondu')
    await sec(5500)
  },

  async messages({ page, etape, sec, cliquer, survoler, ouvrir, demarrer }) {
    await ouvrir('/messages', 'text=Boîte de réception')
    demarrer(); await sec(800)
    await etape(0)
    await survoler(page.getByRole('tab', { name: /À valider/ }), { pause: 1500 })
    await sec(2500)
    await etape(1)
    await cliquer(page.getByRole('tab', { name: /À valider/ }), { pause: 400 })
    await sec(2500)
    await cliquer(page.locator('button', { hasText: 'M. Petit' }).first(), { pause: 600 })
    await sec(4500)
    await etape(2)
    await sec(5000)
    await etape(3)
    await survoler(page.getByRole('button', { name: /Valider et envoyer/ }).first(), { pause: 1500 })
    await sec(4500)
    await survoler(page.getByRole('button', { name: 'Rejeter' }), { pause: 2500 })
  },

  async outils({ page, etape, sec, cliquer, saisir, ouvrir, demarrer, marquer }) {
    await ouvrir('/outils', 'textarea')
    demarrer(); await sec(800)
    await etape(0)
    await saisir(page.locator('textarea').first(), 'Bonjour, je voudrais refaire le carrelage de ma salle de bain (6 m²). Vous pouvez passer pour un devis ?', 30)
    await sec(2200)
    await etape(1)
    await saisir(page.locator('input[placeholder="Ex : Marie"]'), 'Mme Garnier', 80)
    await sec(1800)
    await etape(2)
    await cliquer(page.getByRole('radio', { name: /Standard/ }), { pause: 800 })
    await sec(1500)
    await etape(3)
    await cliquer(page.getByRole('button', { name: 'Générer la réponse' }), { pause: 800 })
    await page.waitForFunction(() => [...document.querySelectorAll('textarea')].some((t) => t.value.length > 40 && /Garnier|Bonjour/.test(t.value)) && /Copier la réponse/.test(document.body.innerText), null, { timeout: 90000 })
    await sec(1500)
    await etape(4)
    await page.mouse.wheel(0, 300)
    await sec(4500)
    await cliquer(page.getByRole('button', { name: /Copier la réponse/ }), { pause: 800 })
    await sec(3500)
  },

  async devis({ page, etape, sec, cliquer, survoler, ouvrir, demarrer }) {
    await ouvrir('/devis', 'text=Carrelage cuisine')
    demarrer(); await sec(800)
    await etape(0)
    await cliquer(page.getByRole('button', { name: /^Acceptés/ }), { pause: 500 }); await sec(2200)
    await cliquer(page.getByRole('button', { name: /^Tous/ }), { pause: 500 }); await sec(2200)
    await etape(1)
    await cliquer(page.locator('li, div, tr').filter({ hasText: 'Carrelage cuisine' }).getByRole('button', { name: 'Ouvrir' }).last(), { pause: 800 })
    await page.waitForSelector('input[placeholder="Marie Dupont"]')
    await sec(3500)
    await etape(2)
    await page.mouse.wheel(0, 520); await sec(4000)
    await page.mouse.wheel(0, 520); await sec(4000)
    await etape(3)
    await survoler(page.getByRole('button', { name: /Chiffrer avec l/ }), { pause: 1500 })
    await sec(4500)
    await etape(4)
    await cliquer(page.getByRole('button', { name: 'Enregistrer', exact: true }), { pause: 700 }); await sec(2500)
    await survoler(page.getByRole('button', { name: 'Envoyer au client' }), { pause: 2200 })
    await survoler(page.getByRole('button', { name: 'Télécharger PDF' }), { pause: 2200 })
    await sec(1500)
  },

  async factures({ page, etape, sec, cliquer, survoler, ouvrir, demarrer }) {
    await ouvrir('/factures', 'text=FAC-2026')
    demarrer(); await sec(800)
    await etape(0); await sec(5000)
    await etape(1)
    await cliquer(page.getByRole('button', { name: /^À encaisser/ }), { pause: 500 }); await sec(2500)
    await cliquer(page.getByRole('button', { name: /^Payées/ }), { pause: 500 }); await sec(2500)
    await cliquer(page.getByRole('button', { name: /^Toutes/ }), { pause: 500 }); await sec(1500)
    await etape(2)
    await survoler(page.getByRole('button', { name: 'PDF' }).first(), { pause: 2500 })
    await survoler(page.getByRole('button', { name: 'XML' }).first(), { pause: 2500 })
    await etape(3)
    await cliquer(page.getByRole('button', { name: 'Marquer payée' }), { pause: 1200 }); await sec(4500)
    await etape(4)
    await survoler(page.getByRole('button', { name: 'Émettre un avoir' }).first(), { pause: 2500 }); await sec(3500)
  },

  async chiffres({ page, etape, sec, cliquer, survoler, ouvrir, demarrer }) {
    await ouvrir('/chiffres', 'text=Chiffre d’affaires')
    demarrer(); await sec(800)
    await etape(0)
    for (const t of ['Chiffre d’affaires', 'Encaissé', 'Impayés à ce jour']) await survoler(T(page, t), { pause: 1700 })
    await etape(1)
    await cliquer(page.getByRole('button', { name: 'Cette année' }), { pause: 500 }); await sec(2200)
    await cliquer(page.getByRole('button', { name: '3 derniers mois' }), { pause: 500 }); await sec(2200)
    await cliquer(page.getByRole('button', { name: '12 derniers mois' }), { pause: 500 }); await sec(1500)
    await etape(2)
    await page.mouse.wheel(0, 300); await sec(4500)
    await etape(3)
    await page.mouse.wheel(0, 300)
    await survoler(page.getByRole('button', { name: 'Préparer la relance' }), { pause: 2500 }); await sec(3000)
    await etape(4)
    await page.mouse.wheel(0, 600); await sec(5000)
  },

  // CRM « atelier vivant » (scénario v2, 20/10/2026) : six étapes sur l'EXEMPLE (un plombier fictif ; rien n'est lu, rien n'est écrit, rien ne part).
  // La maquette est en 3D : on clique un objet là où l'artisan cliquerait, grâce à window.__atelierEcran (exposé par ?mesure=1, Scene3D.tsx).
  // Le texte des six étapes est dans TEXTE_CRM (en bas de ce fichier) ; scripts/aide-videos-crm-texte.mjs l'inscrit dans lib/aide-videos.json.
  // Navigateur avec GPU requis pour la 3D (aide-videos-capture.mjs le lance ainsi pour « crm ») : sans WebGL, la maquette passe en plan 2D.
  async crm({ page, etape, glisser, sec, cliquer, survoler, ouvrir, demarrer }) {
    await heureDeParis(page, 11) // plein jour : la maquette est lisible (elle suit l'heure de Paris)
    await ouvrir('/crm?vue=atelier&mesure=1', 'text=Vue d’ensemble')
    await page.getByRole('button', { name: 'Voir l’exemple' }).click()
    await page.waitForSelector('[data-crm-mode="exemple"]', { timeout: 30000 })
    await page.waitForFunction(() => window.__atelier && window.__atelier.fps > 0 && window.__atelierEcran, null, { timeout: 120000 })
    await sec(2500)
    const m = maquette({ page, sec, cliquer, glisser })
    // Repérage HORS FILM : le point de clic qui ouvre bien chaque objet (un autre bâtiment peut en cacher un).
    const clic = { chantier: await m.sonder(await m.cleDe('chantier'), 'chantier'), assistants: await m.sonder('assistants', 'assistants'), rayon: await m.sonder('categorie:Raccords', 'categorie') }
    demarrer(); await sec(800)
    // 1. L'exemple (déjà affiché), puis la carte qui tourne (rotation de la caméra à la souris, zoom à la molette).
    await etape(0)
    await sec(2500)
    await m.tourner(820, 520, -260, 40); await sec(1500)
    await page.mouse.wheel(0, -400); await sec(2500)
    await m.recentrer()
    // 2. Un chantier : son panneau.
    await etape(1)
    await cliquer(await m.objet3D(clic.chantier.cle, clic.chantier.k), { pause: 800 })
    await page.waitForSelector('[data-atelier-panneau="chantier"]', { timeout: 20000 })
    await sec(5500)
    await page.getByText('Tâches').first().scrollIntoViewIfNeeded().catch(() => {}); await sec(3500)
    await m.fermer()
    // 3. L'accueil : la salle d'attente en trois files, puis « Répondre » (dialogue d'exemple : la réponse proposée, JAMAIS envoyée).
    await etape(2)
    await cliquer(page.locator('button.atl-notif'), { pause: 800 }) // le bouton de la barre ouvre l'accueil (un bâtiment le cache parfois à l'écran)
    await page.waitForSelector('[data-atelier-salle]', { timeout: 20000 })
    await sec(3500)
    await cliquer(page.locator('[data-atelier-action-exemple="Répondre"]').first(), { pause: 700 })
    await page.waitForSelector('[data-atelier-dialogue]', { timeout: 10000 })
    await sec(3500)
    await survoler(page.getByRole('button', { name: 'Valider et envoyer' }), { pause: 1800 }) // on le montre, on ne le clique pas
    await cliquer(page.getByRole('button', { name: 'Annuler' }), { pause: 600 }); await sec(600)
    await m.fermer()
    // 4. Le poste des assistants : « Ils préparent, vous validez ».
    await etape(3)
    await cliquer(await m.objet3D('assistants', clic.assistants.k), { pause: 800 })
    await page.waitForSelector('[data-atelier-assistants]', { timeout: 20000 })
    await sec(3500)
    await survoler(page.locator('[data-atelier-assistant="relanceur"]').first(), { pause: 2200 })
    await survoler(page.locator('[data-atelier-assistant="encaissement"]').first(), { pause: 2200 })
    await sec(1500)
    await m.fermer()
    // 5. Un rayonnage : le stock est l'inventaire ; on ajoute un article (exemple : « rien n'est enregistré ici »).
    await etape(4)
    await cliquer(await m.objet3D('categorie:Raccords', clic.rayon.k), { pause: 800 })
    await page.waitForSelector('[data-atelier-panneau="categorie"]', { timeout: 20000 })
    await sec(3000)
    await cliquer(page.getByRole('button', { name: 'Ajouter un article' }), { pause: 700 })
    const champ = page.locator('input[placeholder="ex. Sac de ciment 35 kg"]')
    await champ.waitFor({ timeout: 10000 })
    await cliquer(champ, { pause: 300 })
    await page.keyboard.type('Joint de robinet', { delay: 60 }); await sec(900)
    await cliquer(page.getByRole('button', { name: 'Ajouter à mon stock' }), { pause: 700 }); await sec(3500)
    await m.fermer()
    // 6. Les réglages : métier et lieu de travail, la maquette s'adapte.
    await etape(5)
    await cliquer(page.locator('details.atl-reglages summary'), { pause: 700 }); await sec(1800)
    await page.locator('[data-atelier-metier]').selectOption({ label: 'Électricien' }); await sec(4500)
    await page.locator('details.atl-reglages select').nth(1).selectOption('atelier'); await sec(5000)
  },

  // DÉMO de la page d'accueil (public/demo/crm-atelier.mp4, montée par scripts/demo-crm-montage.mjs) : mêmes gestes que « crm », en une
  // douzaine de secondes, sans étape ni sous-titre. Un petit curseur est dessiné dans la page (la capture n'enregistre pas la souris).
  // Usage : TEST_BASE=http://localhost:3057 node scripts/aide-videos-capture.mjs demo-crm
  async 'demo-crm'({ page, glisser, sec, cliquer, ouvrir, demarrer }) {
    await heureDeParis(page, 11)
    await page.addInitScript(() => {
      addEventListener('DOMContentLoaded', () => {
        const c = document.createElement('div')
        c.setAttribute('aria-hidden', 'true')
        c.style.cssText = 'position:fixed;left:0;top:0;width:22px;height:22px;z-index:2147483647;pointer-events:none;transform:translate(-100px,-100px);background:url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'22\' height=\'22\' viewBox=\'0 0 22 22\'><path d=\'M3 2 L3 17 L7 13 L10 20 L13 19 L10 12 L16 12 Z\' fill=\'white\' stroke=\'black\' stroke-width=\'1.4\' stroke-linejoin=\'round\'/></svg>") no-repeat'
        document.body.appendChild(c)
        addEventListener('mousemove', (e) => { c.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)' }, true)
      })
    })
    await ouvrir('/crm?vue=atelier&mesure=1', 'text=Vue d’ensemble')
    await page.getByRole('button', { name: 'Voir l’exemple' }).click()
    await page.waitForSelector('[data-crm-mode="exemple"]', { timeout: 30000 })
    await page.waitForFunction(() => window.__atelier && window.__atelier.fps > 0 && window.__atelierEcran, null, { timeout: 120000 })
    await sec(2500)
    const m = maquette({ page, sec, cliquer, glisser })
    const clic = { chantier: await m.sonder(await m.cleDe('chantier'), 'chantier'), assistants: await m.sonder('assistants', 'assistants') }
    await glisser(900, 520)
    demarrer(); await sec(1700) // la maquette seule : la base de l'entreprise, ses bâtiments, ses véhicules
    await cliquer(page.locator('button.atl-notif'), { pause: 500 }) // le bouton de la barre ouvre l'accueil
    await page.waitForSelector('[data-atelier-salle]', { timeout: 20000 })
    await sec(2300) // l'accueil : la salle d'attente en trois files
    await m.fermer(true)
    await cliquer(await m.objet3D('assistants', clic.assistants.k), { pause: 300 })
    await page.waitForSelector('[data-atelier-assistants]', { timeout: 20000 })
    await sec(2500) // le poste des assistants : « Ils préparent, vous validez »
    await m.fermer(true)
    await cliquer(await m.objet3D(clic.chantier.cle, clic.chantier.k), { pause: 300 })
    await page.waitForSelector('[data-atelier-panneau="chantier"]', { timeout: 20000 })
    await sec(2300) // un clic sur un chantier : sa fiche
  },

  async tarifs({ page, etape, sec, cliquer, survoler, saisir, ouvrir, demarrer }) {
    await ouvrir('/tarifs', 'text=Votre bibliothèque')
    demarrer(); await sec(800)
    await etape(0); await survoler(T(page, 'Pourquoi renseigner vos prix'), { pause: 3500 }); await sec(2500)
    await etape(1)
    await saisir(page.locator('input[placeholder="Ex : Chauffe-eau 200 L posé"]'), 'Joint époxy salle de bain', 55)
    await saisir(page.locator('input[placeholder="Prix HT"]'), '28', 120)
    await saisir(page.locator('input[placeholder="Fournisseur"]'), 'Négoce Martin', 55)
    await sec(800)
    await cliquer(page.getByRole('button', { name: 'Ajouter', exact: true }), { pause: 600 }); await sec(3500)
    await etape(2)
    await survoler(page.getByRole('button', { name: 'Choisir un fichier' }), { pause: 3000 }); await sec(2500)
    await etape(3)
    await page.mouse.wheel(0, 330); await sec(800)
    await saisir(page.locator('input[placeholder="Rechercher un tarif…"]'), 'carrelage', 90); await sec(4000)
    await etape(4)
    await survoler(page.getByRole('button', { name: 'Retirer' }).first(), { pause: 3500 }); await sec(2000)
  },

  async inventaire({ page, etape, sec, cliquer, survoler, saisir, ouvrir, demarrer }) {
    await ouvrir('/inventaire', 'text=Votre stock')
    demarrer(); await sec(800)
    await etape(0); await survoler(T(page, 'À racheter'), { pause: 4000 }); await sec(2500)
    await etape(1)
    await saisir(page.locator('input[placeholder="Ex : Coude cuivre 16"]'), 'Silicone sanitaire blanc', 50)
    await saisir(page.locator('input[placeholder="Seuil d’alerte"]'), '4', 120)
    await sec(700)
    await cliquer(page.getByRole('button', { name: 'Ajouter', exact: true }), { pause: 600 }); await sec(3500)
    await etape(2)
    await page.mouse.wheel(0, 420); await sec(800)
    await cliquer(page.getByRole('button', { name: 'Camion', exact: true }), { pause: 600 }); await sec(3000)
    await cliquer(page.getByRole('button', { name: 'Atelier', exact: true }), { pause: 600 }); await sec(2500)
    await etape(3)
    const plus = page.getByRole('button', { name: /^Ajouter un Colle/ })
    await cliquer(plus, { pause: 800 }); await sec(900); await plus.click(); await sec(900); await plus.click(); await sec(3500)
    await etape(4)
    await survoler(page.getByRole('button', { name: /Scanner/ }), { pause: 2500 })
    await survoler(page.getByRole('button', { name: 'Importer un CSV' }), { pause: 2500 })
    await survoler(page.getByRole('link', { name: /Mes fournisseurs/ }), { pause: 2500 })
  },
  async plateforme({ page, etape, sec, cliquer, survoler, ouvrir, demarrer }) {
    await ouvrir('/plateforme', 'text=Conversations')
    demarrer(); await sec(800)
    await etape(0)
    await survoler(page.getByRole('button', { name: 'Copier le lien' }), { pause: 1200 })
    await cliquer(page.getByRole('button', { name: 'Copier le lien' }), { pause: 300 }); await sec(3000)
    await etape(1)
    await cliquer(page.locator('button', { hasText: 'M. Petit' }).first(), { pause: 700 }); await sec(5000)
    await etape(2)
    await cliquer(page.getByRole('tab', { name: 'Automatisations' }), { pause: 600 }); await sec(2000)
    for (const n of [/^Prudent/, /^Équilibré/, /^Réactif/, /^Tout auto/]) await cliquer(page.getByRole('button', { name: n }), { pause: 500 }).then(() => sec(1100))
    await cliquer(page.getByRole('button', { name: /^Équilibré/ }), { pause: 500 }); await sec(1500)
    await etape(3)
    await cliquer(page.getByRole('tab', { name: 'Apparence' }), { pause: 600 }); await sec(6000)
    await etape(4)
    await cliquer(page.getByRole('tab', { name: 'Réglages' }), { pause: 600 }); await sec(2500)
    await survoler(page.getByRole('button', { name: /^Automatique/ }), { pause: 1500 })
    await survoler(page.getByRole('button', { name: /^Manuelle/ }), { pause: 1500 })
    await survoler(page.getByRole('button', { name: 'Chaleureux' }), { pause: 1500 })
    await sec(1500)
  },

  async profil({ page, etape, sec, cliquer, survoler, saisir, ouvrir, demarrer }) {
    await ouvrir('/profil', 'text=Votre lien à partager')
    demarrer(); await sec(800)
    await etape(0)
    await survoler(T(page, 'prestiapp.fr/p/'), { pause: 1200 })
    await cliquer(page.getByRole('button', { name: 'Copier', exact: true }), { pause: 500 }); await sec(3500)
    await etape(1)
    await page.mouse.wheel(0, 380); await sec(700)
    const bio = page.locator('textarea').first()
    await cliquer(bio, { pause: 500 }); await page.keyboard.press('Control+End')
    await page.keyboard.type(' Pose soignée, chantier propre.', { delay: 60 }); await sec(2500)
    await etape(2)
    await page.mouse.wheel(0, 350); await sec(700)
    await saisir(page.locator('input[placeholder="Ex : Lun–Ven 8h–18h · Urgences 7j/7"]'), 'Lun–Ven 8h–18h', 70); await sec(2500)
    await etape(3)
    await page.mouse.wheel(0, 250); await sec(600)
    await cliquer(page.getByRole('button', { name: '+ Ajouter une prestation' }), { pause: 600 })
    await saisir(page.locator('input[placeholder="Prestation (ex : Dépannage plomberie)"]').last(), 'Terrasses extérieures', 60); await sec(2500)
    await etape(4)
    await page.mouse.wheel(0, -3000); await sec(900)
    await cliquer(page.getByRole('button', { name: 'Enregistrer', exact: true }), { pause: 700 }); await sec(2500)
    await survoler(page.getByRole('link', { name: /Voir ma page/ }), { pause: 2500 })
  },

  async parametres({ page, etape, sec, cliquer, survoler, ouvrir, demarrer }) {
    await ouvrir('/parametres', 'text=Profil')
    demarrer(); await sec(800)
    await etape(0)
    for (const t of ['Notifications', 'Entreprise & légal', 'Abonnement & usage', 'Plateforme', 'Sécurité']) await survoler(page.locator('button, a').filter({ hasText: new RegExp('^' + t) }).first(), { pause: 900 })
    await sec(1500)
    await etape(1)
    await survoler(page.getByRole('button', { name: 'Ajouter une photo' }), { pause: 2500 }); await sec(3000)
    await etape(2)
    await cliquer(page.locator('button, a').filter({ hasText: /^Entreprise & légal/ }).first(), { pause: 600 }); await sec(3000)
    await survoler(T(page, 'SIRET'), { pause: 1500 }); await sec(1500)
    await etape(3)
    await survoler(page.locator('button, a').filter({ hasText: /^Notifications/ }).first(), { pause: 2500 })
    await survoler(page.locator('button, a').filter({ hasText: /^Sécurité/ }).first(), { pause: 2500 }); await sec(1000)
    await etape(4)
    await cliquer(page.locator('button, a').filter({ hasText: /^Données & confidentialité/ }).first(), { pause: 600 }); await sec(2500)
    await survoler(page.getByRole('button', { name: /Télécharger mon archive/ }), { pause: 3000 })
  },

  async abonnement({ page, etape, sec, cliquer, survoler, ouvrir, demarrer }) {
    await ouvrir('/abonnement', 'text=Signature')
    demarrer(); await sec(800)
    await etape(0); await survoler(T(page, 'Vous êtes en'), { pause: 3000 }); await sec(3000)
    await etape(1)
    await page.mouse.wheel(0, 260); await sec(1500)
    for (const t of ['Essentiel', 'Studio', 'Signature']) await survoler(page.getByText(t, { exact: true }).first(), { pause: 1500 })
    await etape(2)
    await page.mouse.wheel(0, 420); await sec(3500)
    await page.mouse.wheel(0, 420); await sec(3000)
    await etape(3)
    await survoler(page.getByRole('button', { name: /Essayer 7 jours gratuits/ }), { pause: 3000 })
    await survoler(page.getByRole('button', { name: /Essayer 14 jours gratuits/ }), { pause: 3000 })
    await sec(4000)
  },

  async assistant({ page, etape, sec, cliquer, survoler, saisir, ouvrir, demarrer, marquer }) {
    await ouvrir('/assistant', 'textarea[aria-label="Votre commande à l’assistant"]')
    demarrer(); await sec(800)
    await etape(0); await survoler(T(page, 'Fais le devis de Mme Martin'), { pause: 2500 }); await sec(3000)
    await etape(1)
    await saisir(page.locator('textarea[aria-label="Votre commande à l’assistant"]'), 'Fais le devis de Mme Martin pour 12 m² de carrelage', 50); await sec(1500)
    await etape(2)
    marquer('attente_debut')
    await page.keyboard.press('Enter')
    await page.waitForSelector('.asst-bulle.assistant:not(.attente)', { timeout: 120000 })
    marquer('attente_fin')
    await sec(1200)
    await etape(3); await sec(2500)
    await survoler(page.getByText('À confirmer', { exact: false }).first(), { pause: 1500 })
    await etape(4)
    const ouvrirDevis = page.getByRole('link', { name: /Ouvrir le devis|Ouvrir le brouillon/ })
    if (await ouvrirDevis.count()) { await cliquer(ouvrirDevis.first(), { pause: 900 }); await page.waitForLoadState('networkidle'); await sec(3500) } else await sec(3500)
  },
  async site({ page, etape, sec, cliquer, survoler, saisir, ouvrir, demarrer }) {
    await ouvrir('/site/commander', 'text=Nom de domaine')
    demarrer(); await sec(800)
    await etape(0)
    for (const n of ['1. Le domaine', '2. Métier & Zone', '3. La matière', '4. Votre parcours', '5. Vos prestations', '6. Le paiement']) await survoler(page.getByRole('button', { name: n }), { pause: 700 })
    await etape(1)
    
    await cliquer(page.getByText('Plus tard', { exact: true }).first(), { pause: 700 }); await sec(1500)
    await cliquer(page.getByRole('button', { name: 'Continuer' }), { pause: 700 }); await sec(1500)
    await etape(2)
    await saisir(page.locator('input[placeholder="Ex: Plombier chauffagiste"]'), 'Carreleur', 70)
    await saisir(page.locator('input[placeholder="Ajouter et valider avec Entrée"]').nth(1), 'La Rochelle', 70); await page.keyboard.press('Enter'); await sec(900)
    await page.keyboard.type('Aytré', { delay: 70 }); await page.keyboard.press('Enter'); await sec(2500)
    await cliquer(page.getByRole('button', { name: 'Continuer' }), { pause: 700 }); await sec(3000)
    await etape(3)
    for (let i = 0; i < 3; i++) { await sec(3500); const c = page.getByRole('button', { name: 'Continuer' }); if (await c.count()) await cliquer(c.first(), { pause: 600 }) }
    await sec(3000)
    await etape(4); await sec(4000)
  },
}

// Le texte du scénario « crm » v2 (sans voix : les sous-titres sont calés sur le temps de lecture, aide-videos-anime.mjs). Contraintes de
// scripts/aide-videos-qa.mjs : 3 à 6 étapes de 8 à 140 caractères, sous-titres de 8 à 130 caractères, vouvoiement, fin qui dit l'offre.
// Inscrit dans lib/aide-videos.json par scripts/aide-videos-crm-texte.mjs AU MOMENT de refaire la capture, pas avant : l'étape écrite
// sous la vidéo du centre d'aide doit toujours décrire la vidéo qui est en ligne.
export const TEXTE_CRM = {
  resume: 'Voir votre entreprise en maquette 3D vivante, puis ouvrir chantiers, demandes, assistants et stock d’un clic.',
  etapes: [
    'Voici l’exemple d’un plombier fictif : la carte 3D suit son métier, son lieu de travail, son statut et ses véhicules.',
    'Cliquez un chantier : ses tâches, ses matériaux réservés et son équipe s’ouvrent dans un panneau, sans quitter la carte.',
    'À l’accueil, la salle d’attente range tout en trois files ; Répondre ouvre une réponse proposée, que vous relisez avant l’envoi.',
    'Le poste des assistants prépare relances, factures et rappels : ils préparent, vous validez. Rien ne part sans votre clic.',
    'Cliquez un rayonnage du dépôt : c’est votre inventaire, vous y ajoutez un article ou une entrée de stock sans changer d’écran.',
    'Dans Réglages de l’atelier, choisissez votre métier et votre lieu de travail : la maquette s’adapte aussitôt.',
  ],
  intro: 'Le CRM atelier : votre entreprise en maquette 3D, à jour toute seule.',
  fin: 'À vous de jouer ! Réservé à l’offre Signature.',
}
