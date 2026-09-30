// Essai de 026-210 : les cas défavorables de l'étape 6. Doublures seulement (faux jev du juge, faux fetch), dates figées et fictives.
// Lancement : node --experimental-strip-types --no-warnings --import ./scripts/ts-loader.mjs .orchestre/preuves/026-210/essai-etape6.mjs
import { envJev } from '../../../scripts/fixtures/contenu/lib/commun.mjs'
import { verdictPublicationTikTok, preuvePublique, ligneContenuPost, versionVideo, TAILLE_MAX_MO } from '../../../scripts/contenu/publier-tiktok.mjs'
import fs from 'node:fs'

const V = 'Voir la démo'
const video = (o = {}) => ({ id: 'v1', legende: V, texteIncruste: '', tailleMo: 3, ...o })
const accord = (o = {}) => ({ statut: 'tranchee', choix: 'accorder', cible: 'v1', texte_version: V, portee: 'securite', ...o })
const DBL = { enregistrerCout: async () => ({ ok: true }) }
let echecs = 0
const ok = (nom, c) => { console.log(`${c ? '✅' : '❌'} ${nom}`); if (!c) echecs++ }
const v = (vid, ctx, deps) => verdictPublicationTikTok(vid, ctx, { ...DBL, ...deps })

ok('conforme -> ok', (await v(video(), { decision: accord() })).ok === true)
ok('taille exacte du plafond -> ok', (await v(video({ tailleMo: TAILLE_MAX_MO }), { decision: accord() })).ok === true)
ok('taille au-dessus -> refus', (await v(video({ tailleMo: 9.6 }), { decision: accord() })).ok === false)
ok('taille inconnue / texte / négative -> refus', (await v(video({ tailleMo: undefined }), { decision: accord() })).ok === false && (await v(video({ tailleMo: '3' }), { decision: accord() })).ok === false && (await v(video({ tailleMo: -1 }), { decision: accord() })).ok === false)
ok('accord absent (null) -> refus', (await v(video(), { decision: null })).ok === false)
ok('contexte absent -> refus', (await v(video(), undefined)).ok === false)
ok('accord ouvert -> refus', (await v(video(), { decision: accord({ statut: 'ouverte' }) })).ok === false)
ok('échéance dépassée : défaut appliqué -> refus', (await v(video(), { decision: accord({ statut: 'defaut_applique' }) })).ok === false)
ok('choix refuser -> refus', (await v(video(), { decision: accord({ choix: 'refuser' }) })).ok === false)
ok('accord d’une autre vidéo -> refus', (await v(video(), { decision: accord({ cible: 'v2' }) })).ok === false)
ok('ancienne version : légende retouchée -> refus', (await v(video({ legende: 'Voir la démo !' }), { decision: accord() })).ok === false)
ok('texte incrusté ajouté après l’accord -> refus (la version change)', (await v(video({ texteIncruste: 'Essayez' }), { decision: accord() })).ok === false)
ok('média retouché (empreinte) -> refus', (await v(video({ empreinteMedia: 'bbbb' }), { decision: accord({ texte_version: versionVideo(video({ empreinteMedia: 'aaaa' })) }) })).ok === false)
ok('portée autre que securite -> refus', (await v(video(), { decision: accord({ portee: 'argent' }) })).ok === false)
ok('pause générale -> refus même avec accord valable', (await v(video(), { decision: accord(), pauseGenerale: true })).ok === false)
ok('ligne suspendue -> refus', (await v(video(), { decision: accord(), ligneSuspendue: true })).ok === false)
ok('drapeau baissé -> refus', (await v(video(), { decision: accord(), drapeauLeve: false })).ok === false)
ok('vidéo sans id / sans légende -> refus', (await v(video({ id: '' }), { decision: accord() })).ok === false && (await v(video({ legende: ' ' }), { decision: accord() })).ok === false)
ok('vidéo qui n’est pas un objet -> refus sans exception', (await v('x', {})).ok === false && (await v(null, {})).ok === false)
const chiffree = video({ legende: 'Devis en 24h', source: 'mesure.md' })
const ch = { decision: accord({ texte_version: 'Devis en 24h' }) }
ok('chiffre sans source -> refus', (await v(video({ legende: 'Devis en 24h' }), ch)).ok === false)
ok('chiffre, Laya 0,1 -> refus', (await v(chiffree, ch, { env: envJev({ reponse: { p: 0.1 } }) })).ok === false)
ok('chiffre, Laya en panne -> refus', (await v(chiffree, ch, { env: envJev({ indisponible: true }) })).ok === false)
ok('chiffre, Laya 0,9 + accord -> ok', (await v(chiffree, ch, { env: envJev({ reponse: { p: 0.9 } }) })).ok === true)
ok('chiffre, Laya 0,9 mais pas d’accord -> refus (un score n’autorise rien)', (await v(chiffree, { decision: null }, { env: envJev({ reponse: { p: 0.9 } }) })).ok === false)
ok('promesse chiffrée cachée dans le texte incrusté -> contrôlée', (await v(video({ texteIncruste: '3 devis offerts', source: 'mesure.md' }), ch, { env: envJev({ reponse: { p: 0.1 } }) })).ok === false)
ok('promesse chiffrée cachée dans la miniature -> contrôlée', (await v(video({ miniature: '-50 %', source: 'mesure.md' }), ch, { env: envJev({ reponse: { p: 0.1 } }) })).ok === false)

// La preuve publique, sans cookies, sur un faux fetch qui consigne ce qu'on lui envoie.
const vus = []
const faux = (statut) => async (u, o) => { vus.push(o); return { status: statut } }
const URL_OK = 'https://www.tiktok.com/@vibecode.clips/video/0000000000000000000'
const pOk = await preuvePublique(URL_OK, { fetch: faux(200), maintenant: () => Date.parse('2026-01-15T10:00:00Z') })
ok('preuve publique 200 -> publie, sans cookies', pOk.ok === true && pOk.sans_cookies === true && pOk.etat === 'publie' && pOk.le === '2026-01-15T10:00:00.000Z')
const envoye = vus[0] || {}
ok('aucun Cookie ni Authorization envoyé, credentials omit', !JSON.stringify(envoye.headers || {}).match(/cookie|authorization/i) && envoye.credentials === 'omit')
ok('preuve 302 (vers le login) -> en attente, pas un succès', (await preuvePublique(URL_OK, { fetch: faux(302) })).ok === false)
ok('preuve 404 -> en attente', (await preuvePublique(URL_OK, { fetch: faux(404) })).etat === 'en_attente')
ok('réseau en panne -> en attente', (await preuvePublique(URL_OK, { fetch: async () => { throw new Error('ECONNRESET') } })).etat === 'en_attente')
ok('adresse hors tiktok.com / http / vide -> invalide', (await preuvePublique('https://exemple.invalid/x', { fetch: faux(200) })).etat === 'invalide' && (await preuvePublique('http://www.tiktok.com/x', { fetch: faux(200) })).etat === 'invalide' && (await preuvePublique('', { fetch: faux(200) })).etat === 'invalide')

// La ligne de contenu_posts : liste blanche, jamais la session.
const ligne = ligneContenuPost(video(), accord({ le: '2026-01-15T09:00:00Z' }), pOk, { ligne: 'L1', agent: 'crieur' })
ok('ligne contenu_posts : champs attendus, aucun cookie ni session', ligne.ok === true && ligne.ligne.statut === 'publie' && ligne.ligne.preuve_publique === URL_OK && !/cookie|session|token|jeton/i.test(JSON.stringify(ligne)))
ok('sans preuve publique -> rien à enregistrer', ligneContenuPost(video(), accord(), { ok: false }, { ligne: 'L1', agent: 'crieur' }).ok === false)
ok('sans accord -> rien à enregistrer', ligneContenuPost(video(), null, pOk, { ligne: 'L1', agent: 'crieur' }).ok === false)
ok('sans ligne ni agent -> rien à enregistrer', ligneContenuPost(video(), accord(), pOk, {}).ok === false)

// TikTok Studio et le Centre de création ne sont jamais lus (le juge le cherche dans le source).
const src = fs.readFileSync('scripts/contenu/publier-tiktok.mjs', 'utf8').toLowerCase()
ok('le source ne référence ni Studio ni le Centre de création ni « scrape »', !src.includes('tiktokstudio') && !src.includes('creativecenter') && !src.includes('creator-center') && !src.includes('/tiktokstudio'))
process.exitCode = echecs ? 1 : 0
console.log(echecs ? `essai-etape6 : ${echecs} échec(s)` : 'essai-etape6 : tout est vert')
