import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import { creerGoogleFactice } from './serveur-google.mjs'
import { baseFactice, chargerTour } from './charger-tour.mjs'

const g = await creerGoogleFactice(), traces = [], sorties = [], resultats = {}
const vraiFetch = globalThis.fetch, vraiLog = console.log, vraiErreur = console.error
const autorise = async (u, o) => {
  const url = new URL(u)
  if (url.origin !== g.origine) throw Error('reseau_hors_fixture_refuse')
  traces.push(new URL(u).pathname === '/token' ? 'oauth' : new URL(u).pathname.endsWith('/token') ? 'token' : new URL(u).pathname.includes('webResource') ? 'verification' : new URL(u).pathname.includes('sitemaps') ? 'sitemap' : 'site')
  return vraiFetch(u, o)
}
globalThis.fetch = autorise
console.log = (...a) => sorties.push(a.map(String).join(' '))
console.error = (...a) => sorties.push(a.map(String).join(' '))
const fichiers = [], dates = []
const d = {
  env: g.env, fetch: autorise, maintenant: () => g.maintenant,
  jetonUrl: g.origine + '/token', verificationBase: g.origine + '/siteVerification/v1', searchBase: g.origine + '/webmasters/v3',
  stockage: { ecrire: async (bucket, chemin, contenu) => { traces.push('fichier'); fichiers.push({ bucket, chemin, contenu }) } },
  mettreAJour: async (id, patch) => { traces.push('date'); dates.push({ id, patch }) },
}
const c = { id: 'commande-factice', etat: 'en_ligne', domaine_mode: 'existant', domaine: 'artisan.invalid', search_console_le: null }
const detail = e => String(e.message).replaceAll(g.canaris.cle,'[clé factice masquée]').replaceAll(g.canaris.acces,'[jeton factice masqué]').split('\n')[0]
const juger = async (id, fn) => { try { await fn(); resultats[id] = { ok: true } } catch (e) { resultats[id] = { ok: false, detail: detail(e) } } }
try {
  const M = await import(pathToFileURL(process.argv[2]).href)
  await juger('SC-2', async () => {
    const n = g.appels.length
    assert.deepEqual(await M.jetonCompteService({}, d), { ok: false, raison: 'sans_compte' })
    assert.equal(g.appels.length, n, 'réseau sans compte')
    const t = await M.jetonCompteService(g.env, d)
    assert.equal(t.ok, true, 'signature/claims/échange OAuth refusé par faux Google')
    assert(t.jeton === g.canaris.acces, 'jeton différent de la réponse OAuth')
  })
  await juger('SC-3', async () => {
    traces.length = 0; fichiers.length = 0; dates.length = 0
    const r = await M.soumettreSiteSearchConsole(c, d)
    assert.equal(r.ok, true, 'chaîne refusée')
    assert.deepEqual(traces, ['oauth', 'token', 'fichier', 'verification', 'site', 'sitemap', 'date'], 'ordre/date incorrect')
    assert.deepEqual(dates, [{ id: c.id, patch: { search_console_le: g.maintenant.toISOString() } }], 'date/commande différente')
    for (const [etape, code] of [['oauth', 400], ['token', 500], ['verification', 403], ['site', 500], ['sitemap', 503]]) {
      g.erreurs.set(etape, code); dates.length = 0
      const e = await M.soumettreSiteSearchConsole(c, d)
      assert.equal(e.ok, false, `erreur ${etape} ignorée`)
      assert.equal(dates.length, 0, `date malgré erreur ${etape}`)
      g.erreurs.clear()
    }
  })
  await juger('SC-4', async () => {
    fichiers.length = 0
    await M.soumettreSiteSearchConsole(c, d)
    assert.deepEqual(fichiers, [{ bucket: 'sites', chemin: `${c.id}/${g.fichier}`, contenu: `google-site-verification: ${g.fichier}` }], 'écriture bucket supplémentaire/incorrecte')
    assert.match(g.fichier, /^google[0-9a-f]{16}\.html$/)
  })
  await juger('SC-5', async () => {
    for (const patch of [{ domaine_mode: 'aucun' }, { search_console_le: g.maintenant.toISOString() }]) {
      const n = g.appels.length, nf = fichiers.length, nd = dates.length
      const r = await M.soumettreSiteSearchConsole({ ...c, ...patch }, d)
      assert.equal(r.etape, 'sans_objet', 'absence de domaine/déjà soumis non classé sans_objet')
      assert.equal(g.appels.length, n, 'appel sans objet'); assert.equal(fichiers.length, nf); assert.equal(dates.length, nd)
    }
  })
  await juger('SC-6', async () => {
    assert(process.argv[3], 'tour non fourni : non jugé')
    const lignes=[]
    const base=baseFactice(lignes), tour=await chargerTour(process.argv[3],process.argv[2],base)
    const remplir=n=>{lignes.length=0;for(let i=0;i<n;i++)lignes.push({...c,id:`commande-${i}`,verifications:{autre:true,search_console_essais:0},courriels:{payee:'ok',generee:'ok',en_ligne:'ok'},paye_le:g.maintenant.toISOString(),en_ligne_le:g.maintenant.toISOString(),modifie_le:g.maintenant.toISOString()})}
    const deps={base,enPause:async()=>false,maintenant:d.maintenant,searchConsole:d,envoyer:async()=>({id:'courriel-factice'})}
    g.erreurs.set('sitemap',503)
    remplir(4);fichiers.length=0
    await tour.tourLivraison(deps)
    assert.deepEqual([...new Set(fichiers.map(f=>f.chemin.split('/')[0]))],['commande-0','commande-1','commande-2'],'trois commandes par tour non respectées')
    remplir(3)
    for(let i=0;i<3;i++)await tour.tourLivraison(deps)
    assert(lignes.every(c=>c.verifications.search_console_essais===3&&c.verifications.autre===true),'compteur/par commande ou autres vérifications perdus')
    let n=g.appels.length;await tour.tourLivraison(deps);assert.equal(g.appels.length,n,'quatrième essai après trois échecs')
    remplir(3);n=g.appels.length;await tour.tourLivraison({...deps,enPause:async()=>true});assert.equal(g.appels.length,n,'appel sous pause')
    g.erreurs.clear()
  })
  await juger('SC-7', async () => {
    const rendus = []
    const observe = async (u, o) => { const r = await autorise(u, o); if (new URL(u).pathname.includes('sitemaps')) throw Error(g.canaris.acces); return r }
    rendus.push(await M.soumettreSiteSearchConsole(c, { ...d, fetch: observe }))
    const texte = JSON.stringify({ sorties, rendus })
    assert(!texte.includes(g.canaris.cle) && !texte.includes(g.canaris.acces), 'secret en console/erreur rendue')
  })
} catch (e) { resultats['SC-2'] = { ok: false, detail: `module non importable : ${detail(e)}` } }
finally { globalThis.fetch = vraiFetch; console.log = vraiLog; console.error = vraiErreur; await g.fermer() }
console.log(JSON.stringify({ resultats, appels: g.appels.length, aucun_google_reel: true }))
