// scripts/fixtures/026-acquisition/envoi/gmail-smtp-factice.mjs — un faux serveur SMTP (node:net), écrit par Claude Code
// AVANT lib/agents/acquisition/porteurs/gmail.ts qu'il juge (fiche 026-089, CLAUDE.md:23). Il consigne chaque session
// (EHLO, AUTH, MAIL FROM, RCPT TO, en-têtes, corps) et sait rendre 535 (authentification), 550 5.4.5 (quota) ou couper la
// connexion, selon `scenario`. Écoute sur 127.0.0.1 seulement, port choisi par l'OS.
//
// Simplification assumée du juge (026-062, hors du cahier GM au mot près) : la session est en clair, sans négociation TLS —
// un vrai serveur SMTP Gmail exige TLS implicite (port 465), mais reproduire une poignée de main TLS n'apporterait rien au
// jugement du CONTENU de la session (EHLO, AUTH, MAIL FROM, RCPT TO, en-têtes, pièce jointe) : c'est ce contenu que GM-2 à
// GM-7 vérifient. Le transport injecté au porteur pointe directement sur ce serveur en clair.
//
//   demarrerSmtpFactice({ scenario, motDePasseAttendu, adresse })
//     → { port, sessions, arreter() }
//   scenario : 'ok' | 'auth' (535) | 'quota' (550 5.4.5) | 'coupure' (ferme sans répondre après EHLO)
//   motDePasseAttendu : le mot de passe SANS ses espaces (sansEspaces) que AUTH PLAIN doit porter pour réussir.
//
// Chaque session enregistrée : { ehlo, auth: { utilisateur, motDePasse }, mailFrom, rcptTo: [...], entetes: {}, corps,
//   commandes: [...texte brut de chaque ligne reçue] }.
import net from 'node:net'
import { portLibre, ecouterLocal, ligne } from './commun.mjs'

function decoderAuthPlain(b64) {
  const buf = Buffer.from(b64, 'base64')
  const parties = buf.toString('utf8').split('\0')
  return { autorisation: parties[0] ?? '', utilisateur: parties[1] ?? '', motDePasse: parties[2] ?? '' }
}

export async function demarrerSmtpFactice({ scenario = 'ok', motDePasseAttendu = null, adresse = null } = {}) {
  const port = await portLibre()
  const sessions = []
  const serveur = net.createServer((socket) => {
    const session = { ehlo: null, auth: null, mailFrom: null, rcptTo: [], entetes: {}, corps: '', commandes: [], fermee: false }
    sessions.push(session)
    let tampon = ''
    let phase = 'commande' // 'commande' | 'auth-utilisateur' | 'auth-motdepasse' | 'donnees'
    const ecrire = (t) => { if (!session.fermee) socket.write(`${t}\r\n`) }
    ecrire('220 smtp.gmail.com ESMTP (temoin)')
    if (scenario === 'coupure') { setTimeout(() => { session.fermee = true; socket.destroy() }, 20); return }
    socket.on('data', (buf) => {
      tampon += buf.toString('utf8')
      let i
      while ((i = tampon.indexOf('\n')) >= 0) {
        const ligneRecue = tampon.slice(0, i).replace(/\r$/, '')
        tampon = tampon.slice(i + 1)
        session.commandes.push(ligneRecue)
        if (phase === 'donnees') {
          if (ligneRecue === '.') {
            phase = 'commande'
            const brut = session._donnees.join('\r\n')
            const sep = brut.indexOf('\r\n\r\n')
            const tete = sep >= 0 ? brut.slice(0, sep) : brut
            session.corps = sep >= 0 ? brut.slice(sep + 4) : ''
            for (const l of tete.split('\r\n')) { const m = /^([\w-]+):\s?(.*)$/.exec(l); if (m) session.entetes[m[1]] = m[2] }
            ecrire('250 2.0.0 OK 1700000000 temoin')
          } else session._donnees.push(ligneRecue.startsWith('..') ? ligneRecue.slice(1) : ligneRecue)
          continue
        }
        if (phase === 'auth-utilisateur') { session._authUser = Buffer.from(ligneRecue, 'base64').toString('utf8'); phase = 'auth-motdepasse'; ecrire('334 UGFzc3dvcmQ6'); continue }
        if (phase === 'auth-motdepasse') {
          const motDePasse = Buffer.from(ligneRecue, 'base64').toString('utf8')
          session.auth = { utilisateur: session._authUser, motDePasse }
          phase = 'commande'
          if (scenario === 'auth' || (motDePasseAttendu !== null && motDePasse !== motDePasseAttendu)) { ecrire('535 5.7.8 Username and Password not accepted'); continue }
          ecrire('235 2.7.0 Authentication successful')
          continue
        }
        const cmd = ligneRecue.toUpperCase()
        if (cmd.startsWith('EHLO') || cmd.startsWith('HELO')) { session.ehlo = ligneRecue.slice(5).trim(); ecrire('250-at your service, smtp.gmail.com\r\n250-AUTH LOGIN PLAIN\r\n250 STARTTLS') }
        else if (cmd === 'AUTH LOGIN') { phase = 'auth-utilisateur'; ecrire('334 VXNlcm5hbWU6') }
        else if (cmd.startsWith('AUTH PLAIN ')) {
          const d = decoderAuthPlain(ligneRecue.slice(11))
          session.auth = { utilisateur: d.utilisateur, motDePasse: d.motDePasse }
          if (scenario === 'auth' || (motDePasseAttendu !== null && d.motDePasse !== motDePasseAttendu)) ecrire('535 5.7.8 Username and Password not accepted')
          else ecrire('235 2.7.0 Authentication successful')
        } else if (cmd.startsWith('MAIL FROM:')) {
          session.mailFrom = (/<([^>]*)>/.exec(ligneRecue) || [, ligneRecue.slice(10).trim()])[1]
          if (scenario === 'quota') ecrire('550 5.4.5 Daily sending quota exceeded')
          else ecrire('250 2.1.0 OK')
        } else if (cmd.startsWith('RCPT TO:')) {
          session.rcptTo.push((/<([^>]*)>/.exec(ligneRecue) || [, ligneRecue.slice(8).trim()])[1])
          ecrire('250 2.1.5 OK')
        } else if (cmd === 'DATA') { session._donnees = []; phase = 'donnees'; ecrire('354 Start mail input; end with <CRLF>.<CRLF>') }
        else if (cmd === 'QUIT') { ecrire('221 2.0.0 Bye'); session.fermee = true; socket.end() }
        else if (cmd === 'RSET') { session.mailFrom = null; session.rcptTo = []; ecrire('250 2.0.0 OK') }
        else ecrire('502 5.5.2 Error: command not recognized')
      }
    })
    socket.on('error', () => {})
  })
  await ecouterLocal(serveur, port)
  return {
    port,
    sessions,
    journal: () => sessions.map((s) => ligne('ehlo', s.ehlo, 'auth-user', s.auth?.utilisateur, 'mailFrom', s.mailFrom, 'rcptTo', s.rcptTo, 'entetes', Object.keys(s.entetes))),
    arreter: () => new Promise((resolve) => serveur.close(() => resolve())),
  }
}
