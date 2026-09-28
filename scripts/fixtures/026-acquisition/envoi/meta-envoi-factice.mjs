// scripts/fixtures/026-acquisition/envoi/meta-envoi-factice.mjs — l'API Graph de Meta factice (réponse privée et message),
// écrit par Claude Code AVANT lib/agents/acquisition/envoiMeta.ts qu'il juge (fiche 026-089, CLAUDE.md:23). Elle rejoue un
// `fetch` (l'injection que `creerEnvoiMeta({ jeton, idCompte, fetch })` attend), enregistre chaque requête (méthode, URL,
// corps — jamais le jeton) et sait rendre une erreur de politique, de débit ou de fenêtre fermée selon `scenario`.
//
// Contrat d'URL retenu par le juge (le document source les marque « à vérifier le jour de R6 » : le juge fixe donc le
// contrat que envoiMeta.ts doit suivre, comme toute fiche écrite avant son module, CLAUDE.md:23) :
//   réponse privée : POST https://graph.facebook.com/v26.0/{comment_id}/private_replies   corps { message, access_token }
//   message        : POST https://graph.facebook.com/v26.0/me/messages                     corps { recipient:{id}, messaging_type:'RESPONSE', message:{text[, attachment]}, access_token }
// `scenario` : 'ok' | 'politique' (erreur 10, permission) | 'debit' (erreur 4 ou 613, rate limit) | 'fenetre_fermee' (erreur 100) | 'autre'.
import { ligne } from './commun.mjs'

const ERREURS = {
  politique: { code: 10, message: '(#10) This message is sent outside of allowed window or has a policy violation' },
  debit: { code: 4, message: 'Application request limit reached' },
  fenetre_fermee: { code: 100, message: 'Invalid parameter : outside of messaging window' },
  autre: { code: 1, message: 'An unknown error occurred' },
}

export function creerMetaFactice({ scenario = 'ok' } = {}) {
  const requetes = []
  const fetch = async (url, opts = {}) => {
    const u = new URL(String(url))
    let corps = {}
    try { corps = opts.body ? JSON.parse(opts.body) : {} } catch { corps = { brut: '(non JSON)' } }
    const { access_token: _t, ...corpsSansJeton } = corps
    requetes.push({ methode: opts.method ?? 'GET', url: `${u.origin}${u.pathname}`, corps: corpsSansJeton, entetes: opts.headers ?? {} })
    if (u.hostname !== 'graph.facebook.com') return { ok: false, status: 0, json: async () => ({}), text: async () => '' }
    if (scenario !== 'ok') {
      const e = ERREURS[scenario] ?? ERREURS.autre
      return { ok: false, status: 400, json: async () => ({ error: { message: e.message, type: 'OAuthException', code: e.code, fbtrace_id: 'temoin' } }), text: async () => JSON.stringify({ error: e }) }
    }
    const id = u.pathname.includes('/private_replies') ? `pr_temoin_${requetes.length}` : `msg_temoin_${requetes.length}`
    return { ok: true, status: 200, json: async () => ({ id }), text: async () => JSON.stringify({ id }) }
  }
  return { fetch, requetes, journal: () => requetes.map((r) => ligne(r.methode, r.url, r.corps)) }
}
