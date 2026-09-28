// scripts/fixtures/026-acquisition/envoi/gmail-imap-factice.mjs — le faux client IMAP injecté à `releverGmail` (fiche
// 026-089), écrit par Claude Code AVANT ce module (CLAUDE.md:23). C'est un CLIENT, pas un serveur (le cahier GM le dit :
// « un faux client IMAP injecté ») : releverGmail reçoit cet objet à la place d'un `ImapFlow` réel, avec le sous-ensemble de
// méthodes qu'imapflow porte réellement (mailboxOpen, search, fetchOne, download, logout — mêmes noms), pour que l'adaptateur
// réel n'ait qu'à instancier `new ImapFlow(...)` en production. Chaque appel est consigné dans `commandes` dans l'ordre.
//
//   creerImapFactice({ messages, autreAdresse, uidValidity, uidValiditeChangee, reprise })
//     → { commandes: string[], mailboxOpen, search, fetchOne, download, logout, ouvertureEnLectureSeule }
//
// Règles imitées d'un vrai IMAP : `mailboxOpen(boite, { readOnly })` consigne EXAMINE si readOnly, SELECT sinon (GM-4 exige
// EXAMINE) ; `search({ header, since })` ne rend QUE les UID dont `to` ou `cc` vaut l'adresse cherchée (le filtrage est fait
// « côté serveur », comme un vrai IMAP : le module jugé ne voit jamais l'UID d'un message adressé ailleurs, sauf s'il
// cherche sans filtre — ce que GM-4 repère) ; `download(uid, 'text')` rend un texte tronqué à 4000 signes ; jamais de STORE,
// COPY, MOVE ni EXPUNGE (ce client ne les expose même pas : un appel à une de ces méthodes lève).
import { Readable } from 'node:stream'
import { ligne } from './commun.mjs'

export function creerImapFactice({ messages, autreAdresse, uidValidity, uidValiditeChangee = false, reprise = null } = {}) {
  const commandes = []
  let ouvertureEnLectureSeule = null
  const uidActuel = () => (uidValiditeChangee ? (uidValidity + 1) : uidValidity)
  const parUid = new Map((messages ?? []).map((m) => [m.uid, m]))
  if (reprise) parUid.set(reprise.uid, reprise)

  return {
    commandes,
    ouvertureEnLectureSeule: () => ouvertureEnLectureSeule,
    async mailboxOpen(boite, opts = {}) {
      ouvertureEnLectureSeule = !!opts.readOnly
      commandes.push(ligne(opts.readOnly ? 'EXAMINE' : 'SELECT', boite))
      return { path: boite, uidValidity: uidActuel(), exists: parUid.size }
    },
    /** query : { header: { to: adresse } | { cc: adresse }, uid: '<n>:*' facultatif, since: Date facultatif } */
    async search(query = {}) {
      commandes.push(ligne('SEARCH', query))
      const adresse = String(query.header?.to ?? query.header?.cc ?? '').toLowerCase()
      const depuisUid = (() => { const m = /^(\d+):\*$/.exec(query.uid ?? ''); return m ? Number(m[1]) : 0 })()
      const depuis = query.since instanceof Date ? query.since : null
      const rendus = []
      for (const m of parUid.values()) {
        const cible = [m.to, m.cc].filter(Boolean).map((x) => String(x).toLowerCase())
        if (adresse && !cible.includes(adresse)) continue
        if (m.uid <= depuisUid) continue
        if (depuis && new Date(m.date) < depuis) continue
        rendus.push(m.uid)
      }
      return rendus.sort((a, b) => a - b)
    },
    async fetchOne(uid, opts = {}) {
      commandes.push(ligne('FETCH', uid, Object.keys(opts).join(',')))
      const m = parUid.get(uid)
      if (!m) return null
      return {
        uid,
        envelope: { messageId: m.messageId, from: [{ address: m.from }], subject: m.subject, date: new Date(m.date), inReplyTo: m.headers?.['In-Reply-To'] ?? null },
        headers: new Map(Object.entries(m.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v])),
      }
    },
    async download(uid, part = 'text') {
      commandes.push(ligne('FETCH', uid, part))
      const m = parUid.get(uid)
      if (!m) throw new Error(`download : UID ${uid} inconnu du serveur factice`)
      const texte = String(m.texte ?? '').slice(0, 4000)
      return { content: Readable.from([Buffer.from(texte, 'utf8')]), meta: { contentType: 'text/plain' } }
    },
    async getMailboxLock(boite) { commandes.push(ligne('LOCK', boite)); return { release() { commandes.push('UNLOCK') } } },
    async logout() { commandes.push('LOGOUT') },
    // Volontairement absentes : store, messageMove, messageDelete, messageCopy (GM-4 : aucune STORE, COPY, MOVE, EXPUNGE).
  }
}
