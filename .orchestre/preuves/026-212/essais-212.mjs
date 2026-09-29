// essais-212.mjs — cas de la fiche 026-212 que le juge contenu-qa (026-204) n'isole pas ou n'exerce pas : la voie « heureuse »
// (un accord exact publie, avec URL prouvée), un chiffre avec source refusé par Laya (p=0,1), Laya en panne, décision par défaut,
// accord sur une autre cible ou une version retouchée, média = URL, pause générale, échec de publication, timeout ambigu
// RÉCONCILIÉ (aucune 2e publication), conteneur qui n'est pas prêt, client Graph sans jeton ni capacité.
// Lancer : node --experimental-strip-types --import ./scripts/ts-loader.mjs .orchestre/preuves/026-212/essais-212.mjs
// Aucun réseau réel : faux Graph qui compte ses appels, faux jev local.
import { envJev } from '../../../scripts/fixtures/contenu/lib/commun.mjs'
import { publierMeta, creerClientGraph, majApresPublication, CAPACITE_INSTAGRAM } from '../../../lib/contenu/metaPublier.ts'

const V = { id: 'v1', texte: 'Voir la démo', bucket: 'prive-026', cle: 'v1.mp4' }
const D = { statut: 'tranchee', choix: 'accorder', cible: 'v1', texte_version: 'Voir la démo' }
const ctx = (o = {}) => ({ bucketAttendu: 'prive-026', decision: D, ligneAccordee: true, ...o })
const faux = (o = {}) => {
  const n = { creerConteneur: 0, etat: 0, publier: 0, retrouver: 0 }
  const r = {
    async creerConteneur() { n.creerConteneur++; return o.conteneur ?? { id: 'c1' } },
    async publier() { n.publier++; return o.publier ?? { url: 'https://exemple.invalid/p/1', id: 'ID-1' } },
  }
  if (o.etats) r.etatConteneur = async () => { n.etat++; return o.etats[Math.min(n.etat - 1, o.etats.length - 1)] }
  if (o.retrouver) r.retrouver = async () => { n.retrouver++; return o.retrouver }
  return { r, n }
}
const deps = (p) => ({ env: envJev(p === 'panne' ? { indisponible: true } : { reponse: { p } }), attendre: async () => {}, enregistrerCout: async () => ({ ok: true }) })
let ko = 0
const attendu = (nom, cond, detail) => { if (!cond) ko++; console.log(`${cond ? 'OK ' : 'KO '} ${nom}${cond ? '' : ` — ${JSON.stringify(detail)}`}`) }

{ const { r, n } = faux(); const v = await publierMeta(V, ctx(), r, deps(0.9))
  attendu('accord exact : publié avec URL prouvée, 1 conteneur 1 publication', v.ok && v.url === 'https://exemple.invalid/p/1' && n.creerConteneur === 1 && n.publier === 1, { v, n })
  const maj = majApresPublication(v); attendu('inscription contenu_posts : statut publie + preuve + id externe', maj?.statut === 'publie' && maj.preuve_publique === v.url && maj.id_externe === 'ID-1', maj) }
{ const { r, n } = faux(); const v = await publierMeta({ ...V, texte: 'Devis en 24h', source: 'mesure.md' }, ctx({ decision: { ...D, texte_version: 'Devis en 24h' } }), r, deps(0.1))
  attendu('chiffre + source, Laya p=0,1 : refusé, zéro appel Graph', v.ok === false && /score de vérité/.test(v.motif) && n.creerConteneur === 0, { v, n }) }
{ const { r, n } = faux(); const v = await publierMeta({ ...V, texte: 'Devis en 24h', source: 'mesure.md' }, ctx({ decision: { ...D, texte_version: 'Devis en 24h' } }), r, deps(0.9))
  attendu('chiffre + source, Laya p=0,9 : publié', v.ok === true && n.publier === 1, { v, n }) }
{ const { r, n } = faux(); const v = await publierMeta({ ...V, texte: 'Devis en 24h', source: 'mesure.md' }, ctx({ decision: { ...D, texte_version: 'Devis en 24h' } }), r, deps('panne'))
  attendu('Laya en panne : bloqué, zéro appel Graph', v.ok === false && /Laya indisponible/.test(v.motif) && n.creerConteneur === 0, { v, n }) }
{ const { r, n } = faux(); const v = await publierMeta({ ...V, texte: 'Devis en 24h' }, ctx({ decision: { ...D, texte_version: 'Devis en 24h' } }), r, deps(0.9))
  attendu('chiffre sans source : refusé', v.ok === false && /sans source/.test(v.motif) && n.creerConteneur === 0, { v, n }) }
for (const [nom, d] of [['défaut appliqué', { ...D, statut: 'defaut_applique' }], ['décision ouverte', { ...D, statut: 'ouverte' }], ['refus', { ...D, choix: 'refuser' }], ['autre cible', { ...D, cible: 'v2' }], ['texte retouché après l\'accord', { ...D, texte_version: 'Voir la démo !' }]]) {
  const { r, n } = faux(); const v = await publierMeta(V, ctx({ decision: d }), r, deps(0.9))
  attendu(`accord invalide (${nom}) : refusé, zéro appel`, v.ok === false && n.creerConteneur === 0, { v, n })
}
{ const { r, n } = faux(); const v = await publierMeta({ ...V, cle: 'https://exemple.invalid/v.mp4' }, ctx(), r, deps(0.9)); attendu('média = URL arbitraire : refusé', v.ok === false && n.creerConteneur === 0, { v, n }) }
{ const { r, n } = faux(); const v = await publierMeta({ ...V, cle: '../secret.mp4' }, ctx(), r, deps(0.9)); attendu('clé avec « .. » : refusée', v.ok === false && n.creerConteneur === 0, { v, n }) }
{ const { r, n } = faux(); const v = await publierMeta(V, ctx({ pause: true }), r, deps(0.9)); attendu('pause générale : rien ne part', v.ok === false && n.creerConteneur === 0, { v, n }) }
{ const { r, n } = faux(); const v = await publierMeta({ ...V, canal: 'tiktok' }, ctx(), r, deps(0.9)); attendu('canal TikTok refusé ici', v.ok === false && n.creerConteneur === 0, { v, n }) }
for (const status of [429, 500, 403]) {
  const { r, n } = faux({ conteneur: { erreur: 'essai', status } }); const v = await publierMeta(V, ctx(), r, deps(0.9))
  attendu(`conteneur ${status} : refus motivé Graph, réessayable=${status !== 403}`, v.ok === false && /Graph/.test(v.motif) && v.reessayable === (status !== 403) && n.publier === 0, { v, n })
}
{ const { r, n } = faux({ etats: [{ etat: 'IN_PROGRESS' }, { etat: 'IN_PROGRESS' }, { etat: 'FINISHED' }] }); const v = await publierMeta(V, ctx(), r, deps(0.9))
  attendu('conteneur prêt au 3e essai : publié', v.ok === true && n.etat === 3 && n.publier === 1, { v, n }) }
{ const { r, n } = faux({ etats: [{ etat: 'IN_PROGRESS' }] }); const v = await publierMeta(V, ctx({ essaisEtat: 4 }), r, deps(0.9))
  attendu('conteneur jamais prêt : rien publié, réessayable', v.ok === false && v.reessayable === true && n.publier === 0 && n.etat === 4, { v, n }) }
{ const { r, n } = faux({ etats: [{ etat: 'EXPIRED' }] }); const v = await publierMeta(V, ctx(), r, deps(0.9))
  attendu('conteneur expiré : refus, aucune publication', v.ok === false && /expiré/.test(v.motif) && n.publier === 0, { v, n }) }
{ const { r, n } = faux({ publier: { erreur: 'timeout', status: 0 }, retrouver: { url: 'https://exemple.invalid/p/9', id: 'ID-9' } }); const v = await publierMeta(V, ctx(), r, deps(0.9))
  attendu('timeout ambigu : réconcilié (publication retrouvée), une seule publication', v.ok === true && v.reconcilie === true && n.publier === 1 && n.retrouver === 1, { v, n }) }
{ const { r, n } = faux({ publier: { erreur: 'refus', status: 400 } }); const v = await publierMeta(V, ctx(), r, deps(0.9))
  attendu('publication refusée (400) : refus motivé, non réessayable', v.ok === false && /Graph/.test(v.motif) && v.reessayable === false, { v, n }) }
{ const { r, n } = faux({ publier: { url: 'http://pas-https', id: 'X' } }); const v = await publierMeta(V, ctx(), r, deps(0.9))
  attendu('URL de preuve non https : publication non prouvée', v.ok === false && n.publier === 1, { v, n }) }
{ const { r, n } = faux(); const v = await publierMeta(V, ctx({ dejaPublie: true }), r, deps(0.9))
  attendu('déjà publié : idempotent, zéro appel', v.ok === true && v.idempotent === true && n.creerConteneur === 0 && n.publier === 0, { v, n })
  attendu('idempotent : rien à inscrire', majApresPublication(v) === null, majApresPublication(v)) }
{ const a = creerClientGraph({ jeton: null, capacites: [CAPACITE_INSTAGRAM], compteInstagram: '12345678', signerUrl: async () => 'x', fetch: async () => { throw new Error('jamais') } }, 'instagram')
  attendu('client Graph sans jeton : fermé', a.ok === false, a)
  const b = creerClientGraph({ jeton: 'JETON-DE-TEST', capacites: [], compteInstagram: '12345678', signerUrl: async () => 'x', fetch: async () => { throw new Error('jamais') } }, 'instagram')
  attendu('client Graph sans capacité de publication : fermé', b.ok === false && /capacité/.test(b.motif), b)
  const c = creerClientGraph({ jeton: 'JETON-DE-TEST', capacites: [CAPACITE_INSTAGRAM], compteInstagram: 'pas-un-id', signerUrl: async () => 'x', fetch: async () => { throw new Error('jamais') } }, 'instagram')
  attendu('client Graph sans identifiant valide : fermé', c.ok === false, c) }
{ const appels = []
  const f = async (url, init) => { appels.push({ url: String(url), methode: init?.method }); return { ok: true, status: 200, json: async () => (String(url).includes('/media_publish') ? { id: 'M1' } : String(url).includes('status_code') ? { status_code: 'FINISHED' } : String(url).includes('permalink') ? { permalink: 'https://exemple.invalid/reel/M1' } : { id: 'C1' }) } }
  const cl = creerClientGraph({ jeton: 'JETON-DE-TEST', capacites: [CAPACITE_INSTAGRAM], compteInstagram: '12345678', signerUrl: async (b, k) => `https://exemple.invalid/signe/${b}/${k}`, fetch: f }, 'instagram')
  const v = cl.ok ? await publierMeta(V, ctx(), cl.reseau, deps(0.9)) : null
  attendu('client Graph (faux fetch) : Reel publié par media puis media_publish', !!v?.ok && appels.some((a) => a.url.includes('/12345678/media') && a.methode === 'POST') && appels.some((a) => a.url.includes('/media_publish')), { v, appels: appels.map((a) => a.url.replace(/access_token=[^&]*/, 'access_token=…')) })
  attendu('aucun jeton dans les URL (corps POST seulement)', !appels.some((a) => a.methode === 'POST' && /access_token/.test(a.url)), appels) }
console.log(ko === 0 ? 'essais-212 : PASS' : `essais-212 : ${ko} KO`)
process.exitCode = ko === 0 ? 0 : 1
