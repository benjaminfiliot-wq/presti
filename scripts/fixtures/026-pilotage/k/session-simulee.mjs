// scripts/fixtures/026-pilotage/k/session-simulee.mjs — la session simulée des juges de rendu de la station (fiche 026-170,
// écrite par Claude Code ; réutilisée par le juge d'écran station-ecran-qa, 026-172). Aucun compte réel, aucune clé, aucun
// .env.local : l'usine n'en a pas et ne doit pas en avoir.
//
//   envFactice({ port? })              les variables d'environnement à donner à `next build` / `next start` / `next dev` de la
//                                      copie : NEXT_PUBLIC_SUPABASE_URL (un port de 127.0.0.1 où rien n'écoute) et
//                                      NEXT_PUBLIC_SUPABASE_ANON_KEY (assemblée ici, à l'exécution, jamais écrite en clair),
//                                      NEXT_TELEMETRY_DISABLED. Les NEXT_PUBLIC_* sont figées dans le build : les mêmes valeurs
//                                      doivent servir au build et au navigateur (sessionFactice les relit).
//   sessionFactice({ port? })          { cle, valeur } : la clé de localStorage de supabase-js (`sb-<1er label de l'hôte>-auth-token`)
//                                      et la session sérialisée (jeton fabriqué à l'exécution, expirant en 2100).
//   poserSession(contexte, { port? })  pose cette session dans le localStorage de chaque page du contexte, avant ses scripts.
//   reponsesParDefaut()                les réponses des routes tirées de s/ (copies neuves) : { direct, fil, reglages, tresorerie,
//                                      salles: { <clé>: réponse }, agent, themes: { essai: theme } }. Le thème « essai » est celui de
//                                      k/themes/essai/ ; le réglage `theme` vaut « essai » : la carte charge donc ce thème.
//   interceptions(page, { reponses })  intercepte, sur la page (ou le contexte) : l'hôte Supabase factice (utilisateur factice),
//                                      GET /api/controle/station?vue=direct|fil|salle|agent, /api/controle/station/reglages,
//                                      /api/controle/tresorerie et /station/themes/<clé>/… ; tout autre hôte que 127.0.0.1 est
//                                      coupé. `reponses` est relu à CHAQUE requête (un objet, ou une fonction `(url) => objet`) :
//                                      le juge le modifie pour rejouer une suite d'événements. Une route de /api/controle sans
//                                      `Authorization: Bearer …` répond 401, comme la vraie. Rend { compteurs, requetes, bloquees,
//                                      sansJeton } : compteurs par vue, toutes les requêtes (méthode, adresse), les adresses coupées.
//   suiteEvenements() / appliquerEtape(reponses, etape)   la suite rejouable de evenements.json et le geste de la rejouer.
//   PORT_MORT                          le port de 127.0.0.1 donné à l'hôte Supabase factice (rien n'y écoute).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const K = path.dirname(fileURLToPath(import.meta.url))
const S = path.join(K, '..', 's')
export const PORT_MORT = 9
export const CLES_THEME = ['station', 'vaisseau', 'essai']

const b64u = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url')
const lireJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'))
const jeuS = (nom) => lireJson(path.join(S, nom))
const urlSupabase = (port = PORT_MORT) => `http://127.0.0.1:${port}`
const UTILISATEUR = '90000000-0000-4000-8000-00000000f001'

/** Un jeton à trois segments, fabriqué à l'exécution : rien de ce qui suit ne ressemble à un secret dans le source. */
const jeton = (charge) => `${b64u({ alg: 'HS256', typ: 'JWT' })}.${b64u(charge)}.${b64u('signature-factice-sans-valeur')}`

export const envFactice = ({ port = PORT_MORT } = {}) => ({
  NEXT_PUBLIC_SUPABASE_URL: urlSupabase(port),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: jeton({ role: 'anon', iss: 'essai', ref: 'essai' }),
  NEXT_TELEMETRY_DISABLED: '1',
})

export function sessionFactice({ port = PORT_MORT } = {}) {
  const hote = new URL(urlSupabase(port)).hostname
  const expire = 4102444800 // 1er janvier 2100 : jamais rafraîchie pendant un essai
  const acces = jeton({ sub: UTILISATEUR, role: 'authenticated', aud: 'authenticated', exp: expire, iss: 'essai' })
  const session = {
    access_token: acces, refresh_token: 'rafraichissement-factice', token_type: 'bearer', expires_in: 3600 * 24 * 365, expires_at: expire,
    user: { id: UTILISATEUR, aud: 'authenticated', role: 'authenticated', email: 'fondateur@exemple.invalid', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00.000Z' },
  }
  return { cle: `sb-${hote.split('.')[0]}-auth-token`, valeur: JSON.stringify(session), jeton: acces }
}

export async function poserSession(contexte, opts = {}) {
  const { cle, valeur } = sessionFactice(opts)
  await contexte.addInitScript(([c, v]) => { try { localStorage.setItem(c, v) } catch { /* stockage refusé */ } }, [cle, valeur])
}

export function reponsesParDefaut() {
  const reglages = jeuS('reglages.json').reponse
  reglages.reglages.theme = 'essai'
  const salles = {}
  for (const f of fs.readdirSync(S)) {
    const m = /^salle-([a-z]+)\.json$/.exec(f)
    if (m) salles[m[1]] = jeuS(f).reponse
  }
  return {
    direct: jeuS('vue-direct.json').reponse,
    fil: jeuS('vue-fil.json').reponse,
    reglages,
    tresorerie: { valeur: null, source: 'essai', manque: 'non servi par la session simulée' },
    salles,
    agent: jeuS('vue-agent-repondeur.json').reponse,
    themes: { essai: lireJson(path.join(K, 'themes', 'essai', 'theme.json')) },
  }
}

export const suiteEvenements = () => lireJson(path.join(K, 'evenements.json'))
/** Rejoue une étape : la station lira ces vues à sa prochaine cadence. */
export function appliquerEtape(reponses, etape) {
  reponses.direct = etape.direct
  reponses.fil = etape.fil
  return reponses
}

const valeurDe = (x, url) => (typeof x === 'function' ? x(url) : x)
const json = (route, statut, corps) => route.fulfill({ status: statut, contentType: 'application/json; charset=utf-8', headers: { 'cache-control': 'no-store' }, body: JSON.stringify(corps) })

export async function interceptions(cible, { reponses = reponsesParDefaut(), port = PORT_MORT } = {}) {
  const compteurs = { direct: 0, fil: 0, salle: 0, agent: 0, reglages: 0, tresorerie: 0, theme: 0, supabase: 0 }
  const requetes = [], bloquees = []
  const sansJeton = { n: 0 }
  const sb = `127.0.0.1:${port}`
  await cible.route('**/*', async (route) => {
    const req = route.request()
    const u = new URL(req.url())
    requetes.push({ methode: req.method(), url: req.url() })
    if (u.protocol === 'data:' || u.protocol === 'blob:') return route.continue()
    if (u.host === sb) {
      compteurs.supabase++
      if (u.pathname.endsWith('/auth/v1/user')) return json(route, 200, JSON.parse(sessionFactice({ port }).valeur).user)
      return json(route, 200, {})
    }
    if (u.hostname !== '127.0.0.1' && u.hostname !== 'localhost') { bloquees.push(req.url()); return route.abort('blockedbyclient') }
    const p = u.pathname
    if (p.startsWith('/api/controle/')) {
      if (!/^Bearer \S+/.test(req.headers().authorization ?? '')) { sansJeton.n++; return json(route, 401, { error: 'non authentifié' }) }
      if (p === '/api/controle/station') {
        const vue = u.searchParams.get('vue')
        if (vue === 'direct' || vue === 'fil') { compteurs[vue]++; return json(route, 200, valeurDe(reponses[vue], u)) }
        if (vue === 'salle') { compteurs.salle++; const s = valeurDe(reponses.salles, u)?.[u.searchParams.get('salle')]; return s ? json(route, 200, s) : json(route, 404, { error: 'salle inconnue' }) }
        if (vue === 'agent') { compteurs.agent++; return json(route, 200, valeurDe(reponses.agent, u)) }
        return json(route, 400, { error: 'vue inconnue' })
      }
      if (p === '/api/controle/station/reglages') { compteurs.reglages++; return json(route, 200, valeurDe(reponses.reglages, u)) }
      if (p === '/api/controle/tresorerie') { compteurs.tresorerie++; return json(route, 200, valeurDe(reponses.tresorerie, u)) }
      return json(route, 404, { error: 'route non simulée' })
    }
    const m = /^\/station\/themes\/([a-z]+)\/theme\.json$/.exec(p)
    if (m) {
      compteurs.theme++
      const t = CLES_THEME.includes(m[1]) ? valeurDe(reponses.themes, u)?.[m[1]] : undefined
      return t ? json(route, 200, t) : json(route, 404, { error: 'thème inconnu' })
    }
    if (p.startsWith('/station/')) return json(route, 404, { error: 'introuvable' })
    return route.continue()
  })
  return { compteurs, requetes, bloquees, sansJeton }
}
