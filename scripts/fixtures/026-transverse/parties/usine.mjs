// scripts/fixtures/026-transverse/parties/usine.mjs — la PARTIE « usine » du juge du pont Telegram (fiche 026-194, Claude Code).
// Juge PT-8, PT-9, PT-10, PT-11, PT-12, PT-15, PT-16 et PT-17 sur le service scripts/usine/telegram.mjs de la racine jugée (PT-13 et PT-14
// sont dans pont-telegram-qa.mjs). Le service est LANCÉ (jamais importé) contre un faux Telegram et un faux Presti sur 127.0.0.1, avec des
// jetons et un code d'appairage tirés au hasard à chaque passage, sous l'horloge accélérée de usine-horloge.mjs. Le juge consigne CHAQUE
// requête reçue par les faux serveurs et lit toutes les sorties : il ne se fie à aucun journal écrit par le code jugé.
//
// Les passages (un banc neuf chacun) :
//   commandes    TELEGRAM_CHAT_ID posé : autre conversation ignorée, /etat /pause /chef, inconnues, texte libre         PT-8
//   limite       25 commandes en une heure ; la 21e refusée ; l'heure écoulée (61 min virtuelles), une commande passe   PT-8
//   aucun-base   TELEGRAM_CHAT_ID=aucun : seul /start <code juste> répond et écrit « appairage : chat <id> »             PT-8
//   sortie       relève 60 s, battement 5 min, curseurs d'etat.json (et redémarrage sur le même fichier), messages longs  PT-9, PT-12
//   bus-panne / bus-mort / telegram-panne   pannes : une ligne de journal, aucune exception, le service continue          PT-12
//   appairage-9min / -11min / -epuise / -connue   l'appairage par code à usage unique de 10 min (contre-revue du 25/09)   PT-15
//   verrou       DEUX processus sur le même etat.json et le même message ; un acquittement rejoué (correction du 27/09)   PT-16
//   une-passe    --une-passe, seulement pour lire ses sorties (PT-10) et ses envois (PT-9)
// Les critères transversaux (PT-9 mise en forme, PT-10 fuites, PT-11 aucun port) se jugent sur l'ensemble des passages : une fuite qui ne
// se montre que dans un journal de panne est vue. Tous les identifiants PT-8…PT-17 sont évalués, même si le service plante ou est absent.
import fs from 'node:fs'
import path from 'node:path'
import { court, lireSi, existe, lire } from '../commun.mjs'
import { Banc, attendre, dormir, cmdlinesContenant, ecoutesTcp, jsonContient } from '../usine-service.mjs'
import { sansCommentaires } from '../usine-source.mjs'
import { DEPART } from '../usine-horloge.mjs'

const IDS = ['PT-8', 'PT-9', 'PT-10', 'PT-11', 'PT-12', 'PT-15', 'PT-16', 'PT-17']
const CHEMIN_SERVICE = 'scripts/usine/telegram.mjs'
const ENTREE = '/api/agents/telegram/entree'
const RE_SORTIE = /\/api\/agents\/telegram\/sortie(\?|$)/
const RE_BATTEMENT = /\/api\/agents\/battement(\?|$)/
const RE_APPAIRAGE = /appairage : chat (-?\d+)/
const RE_AIDE_COMMANDES = [/\/etat/, /\/pause/, /\/chef/]
const longue = (marque, n) => `${marque} ${'x'.repeat(Math.max(0, n - marque.length - 1))}`
const compte = (l, f) => l.filter(f).length

export async function jouer({ racine, s, travail }) {
  const bilan = new Map(IDS.map((id) => [id, { ko: [], ok: [] }]))
  const secrets = new Set()
  const propre = (m) => { let t = String(m); for (const x of secrets) if (x) t = t.split(x).join('‹secret›'); return t }
  const ko = (id, m) => bilan.get(id).ko.push(propre(m))
  const ok = (id, m) => bilan.get(id).ok.push(propre(m))
  const verifie = (id, cond, bien, mal) => (cond ? ok(id, bien) : ko(id, mal))
  const dossierEssai = path.join(travail, `usine-${Date.now().toString(36)}-${process.pid}`)
  const collecte = []   // un élément par passage : ce qui sert aux critères transversaux

  /** Un passage : un banc neuf, une fonction, et la collecte de ses observations ; une exception fait échouer tous les critères du passage. */
  async function passage(nom, ids, opt, fn) {
    const b = new Banc({ racine, travail: dossierEssai, nom, chat: opt.chat ?? 'benj', code: opt.code ?? 'juste' })
    for (const x of [b.jetonBot, b.jetonAgent, b.code, b.codeFaux, b.jetonBot.split('-')[1], b.jetonAgent.split('-')[1]]) secrets.add(x)
    const c = { nom, b, unePasse: !!opt.unePasse, ecoutes: [], cmdlines: [], fichiers: [] }
    collecte.push(c)
    try { await b.ouvrir({ baseMorte: !!opt.baseMorte }); await fn(b, c) }
    catch (e) { for (const id of ids) ko(id, `passage « ${nom} » interrompu : ${court(e.message, 200)}`) }
    finally {
      try {
        for (const p of b.procs) { p.echantillonnerCmdline(); if (!p.sorti) c.ecoutes.push({ proc: p.nom, liste: ecoutesTcp(p.pid) }) }
        c.cmdlines.push(...cmdlinesContenant([b.jetonBot, b.jetonAgent, b.jetonBot.split('-')[1], b.jetonAgent.split('-')[1]]))
        c.fichiers = b.fichiers()
      } catch { /* la collecte ne doit jamais faire échouer le passage */ }
      await b.fermer()
    }
  }
  const demarrer = async (b, p) => {
    if (!(await b.pret(p))) throw new Error(`le service n'attend pas de mises à jour (${p.sorti ? `sorti, code ${p.code} ${p.signal ?? ''}` : 'aucun getUpdates observé'}) : ${court(p.journal().slice(-3).join(' | ') || '(aucune sortie)', 160)}`)
    return p
  }
  const jl = (p) => p.journal()

  // ═══ PT-8 : commandes ════════════════════════════════════════════════════════════════════════════════════════════════
  await passage('commandes', ['PT-8'], { chat: 'benj', code: 'epuise' }, async (b, c) => {
    const p = await demarrer(b, b.lancer('A'))
    const T = b.telegram
    // 1. une autre conversation (dont la valeur commence par celle de Benj, et une négative de même valeur absolue) puis Benj
    const intrus = b.scenario('autre-conversation')
    const valides = b.scenario('commandes-valides')
    await attendre(() => T.envoisVers(b.benj).length >= 3)
    await b.acquittes(valides.at(-1).update_id)
    const etrangers = T.envois.filter((e) => e.chat_id !== b.benj)
    verifie('PT-8', etrangers.length === 0, 'aucune réponse envoyée à une autre conversation', `réponse envoyée à une autre conversation (chat_id ${etrangers.map((e) => e.chat_id).join(', ')})`)
    const cmd = b.presti.commandes()
    const noms = cmd.map((r) => r.corps?.commande)
    verifie('PT-8', JSON.stringify(noms) === JSON.stringify(['etat', 'pause', 'consigne']), '/etat, /pause et /chef de Benj : trois appels (etat, pause, consigne), dans l’ordre, aucun pour les autres conversations',
      `appels au faux Presti : [${noms.join(', ')}], [etat, pause, consigne] attendus (${intrus.length} messages d'autres conversations)`)
    verifie('PT-8', /raison d'essai xyz/.test(String(cmd[1]?.corps?.motif ?? '')), '/pause <motif> transmet le motif', `/pause : motif reçu « ${court(cmd[1]?.corps?.motif, 60)} », « raison d'essai xyz » attendu`)
    verifie('PT-8', /fais le point ce soir/.test(String(cmd[2]?.corps?.texte ?? '')), '/chef <texte> transmet le texte', `/chef : texte reçu « ${court(cmd[2]?.corps?.texte, 60)} », « fais le point ce soir » attendu`)
    const rep = T.envoisVers(b.benj)
    verifie('PT-8', rep.length === 3 && rep.every((e) => String(e.texte ?? '').trim()), 'une réponse non vide par commande', `${rep.length} réponse(s) à Benj pour 3 commandes (une réponse par commande attendue)`)
    const sansAut = cmd.filter((r) => !r.autorise)
    verifie('PT-8', sansAut.length === 0, 'chaque appel porte « Authorization: Bearer <jeton d’agent> »', `${sansAut.length} appel(s) de commande sans l'en-tête Authorization attendu`)
    // 2. les commandes inconnues (dont les mots de reprise) : jamais un appel de commande
    const avantInconnues = b.presti.commandes().length
    const inc = b.scenario('commandes-inconnues')
    await b.acquittes(inc.at(-1).update_id)
    await b.barriere()
    const apres = b.presti.commandes().slice(avantInconnues)
    verifie('PT-8', apres.length === 1 && apres[0].corps?.commande === 'etat', 'une commande inconnue (/reprise, /reprendre, /lever…) ne provoque aucun appel', `commandes inconnues : ${apres.length} appel(s) [${apres.map((r) => r.corps?.commande).join(', ')}], le seul appel attendu est le /etat de la barrière`)
    // 3. le texte libre : l'aide
    const n0 = T.envoisVers(b.benj).length
    const libre = b.scenario('texte-libre')
    await b.acquittes(libre.at(-1).update_id)
    await b.barriere()
    const reponses = T.envoisVers(b.benj).slice(n0, n0 + 2)
    const aideOk = reponses.length === 2 && reponses.every((e) => RE_AIDE_COMMANDES.every((re) => re.test(e.texte ?? '')) && /reprise/i.test(e.texte ?? '') && /station/i.test(e.texte ?? ''))
    verifie('PT-8', aideOk, 'texte libre → l’aide (les trois commandes, « la reprise se fait à la station »)', `texte libre : réponses [${reponses.map((e) => court(e.texte, 50)).join(' | ')}], l'aide avec /etat, /pause, /chef et « reprise … station » attendue`)
    const restants = T.envois.filter((e) => e.chat_id !== b.benj)
    verifie('PT-8', restants.length === 0, 'aucun envoi hors de la conversation de Benj sur tout le passage', `envoi hors de la conversation de Benj (${restants.length})`)
    verifie('PT-8', b.presti.commandes().every((r) => ['etat', 'pause', 'consigne'].includes(r.corps?.commande)), 'seules les trois commandes de la liste fermée atteignent Presti', `commande hors liste fermée reçue par Presti : ${b.presti.commandes().map((r) => r.corps?.commande).find((x) => !['etat', 'pause', 'consigne'].includes(x))}`)
    void p; void c
  })

  await passage('limite', ['PT-8'], { chat: 'benj', code: 'epuise' }, async (b) => {
    await demarrer(b, b.lancer('A'))
    const T = b.telegram
    const ups = b.scenario('vingt-cinq-commandes')
    await attendre(() => T.envoisVers(b.benj).length >= 25, { max: 10_000 })
    await b.acquittes(ups.at(-1).update_id)
    const cmd = b.presti.commandes()
    const rep = T.envoisVers(b.benj)
    const refus = rep.filter((e) => /trop de commandes/i.test(e.texte ?? ''))
    verifie('PT-8', cmd.length === 20, 'sur 25 commandes en une heure, 20 seulement atteignent Presti', `${cmd.length} appel(s) au faux Presti pour 25 commandes en une heure, 20 attendus`)
    verifie('PT-8', rep.length === 25 && refus.length === 5, 'la 21e commande de l’heure (et les quatre suivantes) reçoivent « trop de commandes »', `${rep.length} réponse(s), dont ${refus.length} « trop de commandes » (25 et 5 attendues)`)
    verifie('PT-8', rep.length > 20 && /trop de commandes/i.test(rep[20]?.texte ?? '') && !rep.slice(0, 20).some((e) => /trop de commandes/i.test(e.texte ?? '')), 'les vingt premières sont acceptées, la 21e est la première refusée', `la réponse n° 21 est « ${court(rep[20]?.texte, 50)} » : « trop de commandes » attendu, et aucun refus avant`)
    // l'heure passe : une commande est de nouveau acceptée
    await b.avancerPar(61 * 60_000, 120_000)
    const avant = b.presti.commandes().length, nRep = T.envoisVers(b.benj).length
    b.poster('benj', '/etat')
    await attendre(() => T.envoisVers(b.benj).length > nRep)
    const derniere = T.envoisVers(b.benj).at(-1)
    verifie('PT-8', b.presti.commandes().length === avant + 1 && !/trop de commandes/i.test(derniere?.texte ?? ''), 'une heure plus tard (61 min virtuelles) la limite est levée', `61 min plus tard, /etat : ${b.presti.commandes().length - avant} appel(s), réponse « ${court(derniere?.texte, 50)} » : accepté attendu`)
  })

  await passage('aucun-base', ['PT-8'], { chat: 'aucun', code: 'juste' }, async (b) => {
    const p = await demarrer(b, b.lancer('A'))
    const T = b.telegram
    b.poster('autre', '/etat'); b.poster('autre', `/start ${b.codeFaux}`)
    const bon = b.poster('nouveau', `/start ${b.code}`)
    await attendre(() => T.envoisVers(b.nouveau).length >= 1)
    await b.acquittes(bon.update_id)
    verifie('PT-8', T.envois.length === 1 && T.envois[0].chat_id === b.nouveau, 'TELEGRAM_CHAT_ID=aucun : seul « /start <code juste> » reçoit une réponse', `TELEGRAM_CHAT_ID=aucun : ${T.envois.length} réponse(s) [${T.envois.map((e) => e.chat_id).join(', ')}], une seule attendue, pour la conversation du /start juste`)
    const lignes = jl(p).map((l) => RE_APPAIRAGE.exec(l)).filter(Boolean)
    verifie('PT-8', lignes.length === 1 && lignes[0][1] === b.nouveau, 'une ligne de journal « appairage : chat <id> » avec l’identifiant appairé', `journal : ${lignes.length} ligne(s) « appairage : chat … » (${lignes.map((m) => m[1]).join(', ')}), une seule, pour ${b.nouveau}, attendue`)
    verifie('PT-8', b.presti.commandes().length === 0, 'aucun appel de commande sans conversation appairée', `${b.presti.commandes().length} appel(s) de commande alors qu'aucune conversation n'était appairée`)
  })

  // ═══ PT-9, PT-12 : la sortie, les curseurs, les cadences ════════════════════════════════════════════════════════════
  await passage('sortie', ['PT-12', 'PT-9'], { chat: 'benj', code: 'epuise' }, async (b) => {
    const T = b.telegram, P = b.presti
    const COURTE = 'Alerte courte *gras* _italique_ [lien](http://exemple.test) <b>x</b> & `code` — 100 % é'
    P.alertes.push({ id: 4317, texte: COURTE }, { id: 4318, texte: longue('DEBUT-4318', 4096) }, { id: 4319, texte: longue('DEBUT-4319', 4100) })
    P.evenements.push({ id: 9081, texte: 'Chef · compte rendu : essai numéro un' }, { id: 9082, texte: longue('DEBUT-9082', 5200) })
    const A = await demarrer(b, b.lancer('A'))
    await b.avancerPar(75_000)
    await attendre(() => T.envois.some((e) => String(e.texte ?? '').includes('DEBUT-9082')), { max: 6000 })
    const vues = (motif) => T.envois.filter((e) => String(e.texte ?? '').includes(motif)).length
    verifie('PT-12', vues('Alerte courte') === 1 && vues('compte rendu : essai numéro un') === 1 && vues('DEBUT-4318') >= 1 && vues('DEBUT-9082') >= 1, 'la relève de sortie livre chaque message au téléphone (un envoi par message)',
      `relève de sortie : « Alerte courte » ×${vues('Alerte courte')}, « compte rendu » ×${vues('compte rendu : essai numéro un')}, DEBUT-4318 ×${vues('DEBUT-4318')}, DEBUT-9082 ×${vues('DEBUT-9082')} après 75 s virtuelles (un envoi chacun attendu)`)
    // vingt minutes de plus : les cadences, les curseurs, aucun renvoi
    await b.avancerPar(20 * 60_000)
    const sorties = A.fetchs(RE_SORTIE).filter((e) => e.methode === 'GET'), battements = A.fetchs(RE_BATTEMENT).filter((e) => e.methode === 'POST')
    const ecarts = (l) => l.slice(1).map((e, i) => (e.ms - l[i].ms) / 1000)
    const eS = ecarts(sorties), eB = ecarts(battements)
    verifie('PT-12', sorties.length >= 15 && eS.length > 0 && eS.every((x) => x >= 50 && x <= 70), `relève de sortie toutes les 60 s (${sorties.length} relèves en 21 min virtuelles, écarts ${Math.min(...eS)}–${Math.max(...eS)} s)`,
      `relève de sortie : ${sorties.length} relève(s) en 21 min virtuelles, écarts [${[...new Set(eS)].slice(0, 6).join(', ')}] s ; 60 s attendues (50 à 70 s, au moins 15 relèves) — événements fetch de l'horloge`)
    verifie('PT-12', battements.length >= 4 && battements[0].ms - DEPART <= 310_000 && eB.every((x) => x >= 240 && x <= 310), `battement au bus toutes les 5 min (${battements.length} battements en 21 min virtuelles, écarts ${Math.min(...eB)}–${Math.max(...eB)} s)`,
      `battement : ${battements.length} battement(s) en 21 min virtuelles, écarts [${[...new Set(eB)].slice(0, 6).join(', ')}] s, premier à ${battements[0] ? (battements[0].ms - DEPART) / 1000 : '—'} s ; « toutes les 5 min » attendu (240 à 310 s, au moins 4 battements)`)
    const req = P.appels('/api/agents/telegram/sortie', 'GET')
    verifie('PT-12', req.some((r) => r.requete.apres_alerte === '4319' && r.requete.apres_evenement === '9082'), 'les curseurs rendus par la route (4319, 9082) sont renvoyés à la relève suivante',
      `curseur non avancé : aucune relève ne porte apres_alerte=4319 et apres_evenement=9082 (vues : ${[...new Set(req.map((r) => `${r.requete.apres_alerte}/${r.requete.apres_evenement}`))].slice(0, 4).join(', ')})`)
    verifie('PT-12', vues('Alerte courte') === 1 && vues('compte rendu : essai numéro un') === 1, 'aucun message renvoyé aux relèves suivantes', `messages renvoyés : « Alerte courte » ×${vues('Alerte courte')}, « compte rendu » ×${vues('compte rendu : essai numéro un')} après 21 min (un seul envoi attendu)`)
    const texteEtat = lireSi(b.etat) ?? ''
    verifie('PT-12', jsonContient(texteEtat, 4319) && jsonContient(texteEtat, 9082), 'les curseurs (4319, 9082) sont gardés dans etat.json', `etat.json ne porte pas les curseurs 4319 et 9082 (${texteEtat ? court(texteEtat, 100) : 'fichier absent'})`)
    const sansAut = [...P.appels('/api/agents/telegram/sortie'), ...P.appels('/api/agents/battement')].filter((r) => !r.autorise)
    verifie('PT-12', sansAut.length === 0, 'sortie et battement portent « Authorization: Bearer <jeton d’agent> »', `${sansAut.length} requête(s) de sortie ou de battement sans l'en-tête Authorization attendu`)
    // redémarrage brutal sur le même etat.json : les curseurs viennent du fichier, aucun renvoi
    await A.arreter('SIGKILL')
    const avant = P.appels('/api/agents/telegram/sortie', 'GET').length
    P.alertes.push({ id: 4400, texte: 'Alerte neuve après redémarrage' })
    const B2 = await demarrer(b, b.lancer('B'))
    await b.avancerPar(75_000)
    await attendre(() => vues('Alerte neuve après redémarrage') >= 1, { max: 6000 })
    const premiere = P.appels('/api/agents/telegram/sortie', 'GET')[avant]
    verifie('PT-12', premiere?.requete.apres_alerte === '4319' && premiere?.requete.apres_evenement === '9082', 'redémarrage : la première relève repart des curseurs d’etat.json', `redémarrage : la première relève porte apres_alerte=${premiere?.requete.apres_alerte}, apres_evenement=${premiere?.requete.apres_evenement} ; 4319 et 9082 (lus dans etat.json) attendus`)
    verifie('PT-12', vues('Alerte courte') === 1 && vues('Alerte neuve après redémarrage') === 1, 'redémarrage : rien de déjà envoyé n’est renvoyé, le nouveau message part une fois', `redémarrage : « Alerte courte » ×${vues('Alerte courte')}, « Alerte neuve » ×${vues('Alerte neuve après redémarrage')} (1 et 1 attendus)`)
    void B2
    // PT-9 : la mise en forme de ce qui est parti (jugée ici sur les envois de la relève, et globalement plus bas)
    const courte = T.envois.find((e) => String(e.texte ?? '').includes('Alerte courte'))
    verifie('PT-9', String(courte?.texte ?? '').includes(COURTE), 'un texte plein de signes de mise en forme (* _ [ ] < > & `) part tel quel', `le texte piégé de la relève n'est pas parti intact : « ${court(courte?.texte, 80)} »`)
    for (const [m, taille] of [['DEBUT-4318', 4096], ['DEBUT-4319', 4100], ['DEBUT-9082', 5200]]) verifie('PT-9', vues(m) >= 1, `le message de ${taille} signes (${m}) est livré (coupé ou découpé, jamais perdu)`, `le message de ${taille} signes (${m}) n'a été livré par aucun envoi : coupé ou découpé attendu, pas perdu`)
  })

  // ═══ PT-12 : les pannes ══════════════════════════════════════════════════════════════════════════════════════════════
  const pilePlantee = (p) => /Unhandled|Uncaught|unhandledRejection|node:internal\/|^\s+at .+:\d+:\d+\)?$/m.test(p.stderr)
  await passage('bus-panne', ['PT-12'], { chat: 'benj', code: 'epuise' }, async (b) => {
    const P = b.presti, p = await demarrer(b, b.lancer('A'))
    await b.avancerPar(6 * 60_000)
    verifie('PT-12', P.appels('/api/agents/battement').length >= 1, 'bus joignable : le battement arrive', 'bus joignable : aucun battement reçu en 6 min virtuelles')
    for (const mode of ['coupe', '500']) {
      P.mode.panne = mode
      const lignes = jl(p).length
      await b.avancerPar(mode === 'coupe' ? 12 * 60_000 : 6 * 60_000)
      verifie('PT-12', !p.sorti && !pilePlantee(p), `bus en panne (${mode}) : le service tient, sans exception`, `bus en panne (${mode}) : ${p.sorti ? `le service est sorti (code ${p.code} ${p.signal ?? ''})` : 'une trace de pile est écrite'} : ${court(jl(p).slice(-2).join(' | '), 160)}`)
      verifie('PT-12', jl(p).length > lignes, `bus en panne (${mode}) : au moins une ligne de journal`, `bus en panne (${mode}) : aucune ligne de journal en ${mode === 'coupe' ? 12 : 6} min virtuelles`)
    }
    P.mode.panne = null
    const avant = compte(P.requetes, (r) => RE_BATTEMENT.test(r.chemin) && r.autorise)
    const nRep = b.telegram.envoisVers(b.benj).length
    b.poster('benj', '/etat')
    await b.avancerPar(6 * 60_000)
    verifie('PT-12', compte(P.requetes, (r) => RE_BATTEMENT.test(r.chemin) && r.autorise) > avant && b.telegram.envoisVers(b.benj).length > nRep, 'bus revenu : le battement reprend et le service répond de nouveau', 'bus revenu : aucun nouveau battement, ou /etat sans réponse (le service ne continue pas)')
  })

  await passage('bus-mort', ['PT-12'], { chat: 'benj', code: 'epuise', baseMorte: true }, async (b) => {
    const p = await demarrer(b, b.lancer('A'))
    await b.avancerPar(11 * 60_000)
    verifie('PT-12', !p.sorti && !pilePlantee(p), 'bus injoignable (rien n’écoute) : pas d’exception, le service continue', `bus injoignable : ${p.sorti ? `le service est sorti (code ${p.code} ${p.signal ?? ''})` : 'une trace de pile est écrite'} : ${court(jl(p).slice(-2).join(' | '), 160)}`)
    verifie('PT-12', jl(p).length >= 1, 'bus injoignable : une ligne de journal', 'bus injoignable : aucune ligne de journal')
    verifie('PT-12', p.fetchs(RE_BATTEMENT).length >= 2, 'bus injoignable : le service retente son battement', `bus injoignable : ${p.fetchs(RE_BATTEMENT).length} tentative(s) de battement en 11 min virtuelles`)
  })

  await passage('telegram-panne', ['PT-12'], { chat: 'benj', code: 'epuise' }, async (b) => {
    const T = b.telegram, p = await demarrer(b, b.lancer('A'))
    b.presti.alertes.push({ id: 1, texte: 'Alerte pendant la panne de Telegram' })
    for (const [mode, dur] of [['500', 2 * 60_000], ['coupe', 2 * 60_000]]) {
      T.mode.panne = mode
      const lignes = jl(p).length
      await b.avancerPar(dur)
      verifie('PT-12', !p.sorti && !pilePlantee(p), `Telegram en panne (${mode}) : le service tient, sans exception`, `Telegram en panne (${mode}) : ${p.sorti ? `le service est sorti (code ${p.code} ${p.signal ?? ''})` : 'une trace de pile est écrite'} : ${court(jl(p).slice(-2).join(' | '), 160)}`)
      verifie('PT-12', jl(p).length > lignes, `Telegram en panne (${mode}) : une ligne de journal`, `Telegram en panne (${mode}) : aucune ligne de journal en 2 min virtuelles`)
    }
    T.mode.panne = null
    T.mode.envoi = '500'
    const lignes = jl(p).length
    await b.avancerPar(75_000)
    verifie('PT-12', !p.sorti && (T.envois.some((e) => e.refuse) ? jl(p).length > lignes : true), 'envoi refusé par Telegram : le service tient et le dit dans son journal', `envoi refusé par Telegram (500) : ${p.sorti ? 'le service est sorti' : 'aucune ligne de journal'}`)
    T.mode.envoi = null
    const nRep = T.envoisVers(b.benj).length
    b.poster('benj', '/etat')
    let repondu = false
    for (let i = 0; i < 24 && !repondu && !p.sorti; i++) { await b.avancerPar(30_000, 30_000); repondu = T.envoisVers(b.benj).length > nRep }
    verifie('PT-12', repondu, 'Telegram revenu : le service répond de nouveau à /etat', 'Telegram revenu : /etat reste sans réponse 12 min virtuelles après la panne (le service ne reprend pas)')
  })

  // ═══ PT-15 : l'appairage par code à usage unique ═════════════════════════════════════════════════════════════════════
  const lignesAvec = (p, ids) => jl(p).filter((l) => ids.some((i) => l.includes(String(i))))
  await passage('appairage-9min', ['PT-15'], { chat: 'aucun', code: 'juste' }, async (b) => {
    const T = b.telegram, p = await demarrer(b, b.lancer('A'))
    const intrus = b.scenario('appairage-intrus')
    await b.acquittes(intrus.at(-1).update_id)
    verifie('PT-15', T.envois.length === 0, 'une autre conversation qui écrit la première (/start, /start faux, /etat, texte libre) : aucune réponse', `une conversation étrangère qui écrit la première a reçu ${T.envois.length} réponse(s) (${T.envois.map((e) => `${e.chat_id} « ${court(e.texte, 40)} »`).join(' ; ')})`)
    verifie('PT-15', lignesAvec(p, [b.autre, b.autre2]).length === 0 && !jl(p).some((l) => RE_APPAIRAGE.test(l)), 'aucune ligne de journal ne porte l’identifiant d’une conversation étrangère', `journal : ligne(s) qui portent l'identifiant d'une conversation étrangère ou un appairage : ${court(lignesAvec(p, [b.autre, b.autre2]).concat(jl(p).filter((l) => RE_APPAIRAGE.test(l))).join(' | '), 200)}`)
    await b.avancerPar(9 * 60_000)
    const juste = b.poster('nouveau', `/start ${b.code}`)
    await attendre(() => T.envoisVers(b.nouveau).length >= 1)
    await b.acquittes(juste.update_id)
    const lignes = jl(p).map((l) => RE_APPAIRAGE.exec(l)).filter(Boolean)
    verifie('PT-15', T.envoisVers(b.nouveau).length === 1 && /appair/i.test(T.envoisVers(b.nouveau)[0].texte ?? ''), '/start <code juste> à 9 min : une réponse « appairé »', `/start <code juste> à 9 min : ${T.envoisVers(b.nouveau).length} réponse(s) (« ${court(T.envoisVers(b.nouveau)[0]?.texte, 50)} »), une réponse « appairé : … » attendue`)
    verifie('PT-15', lignes.length === 1 && lignes[0][1] === b.nouveau, '/start <code juste> à 9 min : une ligne « appairage : chat <id> » avec cet identifiant', `/start <code juste> à 9 min : ${lignes.length} ligne(s) « appairage : chat … » (${lignes.map((m) => m[1]).join(', ')}), une seule, pour ${b.nouveau}, attendue`)
    const avant = T.envois.length
    const suite = b.scenario('appairage-second')
    b.poster('autre', `/start ${b.code}`)
    await b.acquittes(suite.at(-1).update_id + 1)
    verifie('PT-15', T.envois.length === avant && jl(p).filter((l) => RE_APPAIRAGE.test(l)).length === 1, 'après un appairage, un second /start <code juste> d’une autre conversation : rien', `après l'appairage, un second /start <code juste> d'une autre conversation : ${T.envois.length - avant} réponse(s), ${jl(p).filter((l) => RE_APPAIRAGE.test(l)).length} ligne(s) d'appairage (0 réponse et 1 seule ligne attendues)`)
    verifie('PT-15', !jl(p).some((l) => l.includes(b.code)), 'le code d’appairage n’apparaît dans aucune ligne de journal', 'le code d\'appairage apparaît dans une ligne de journal')
  })

  await passage('appairage-11min', ['PT-15'], { chat: 'aucun', code: 'juste' }, async (b) => {
    const T = b.telegram, p = await demarrer(b, b.lancer('A'))
    await b.avancerPar(11 * 60_000)
    const tard = b.poster('nouveau', `/start ${b.code}`)
    await b.acquittes(tard.update_id)
    verifie('PT-15', T.envois.length === 0 && !jl(p).some((l) => RE_APPAIRAGE.test(l) || l.includes(b.nouveau)), 'le même code juste à 11 min : rien (ni réponse, ni ligne)', `le code juste à 11 min a été accepté ou journalisé : ${T.envois.length} réponse(s), lignes « ${court(jl(p).filter((l) => RE_APPAIRAGE.test(l) || l.includes(b.nouveau)).join(' | '), 120)} » (aucune attendue)`)
    verifie('PT-15', !jl(p).some((l) => l.includes(b.code)), 'à 11 min : le code n’apparaît dans aucune ligne de journal', 'à 11 min : le code d\'appairage apparaît dans une ligne de journal')
  })

  await passage('appairage-epuise', ['PT-15'], { chat: 'aucun', code: 'epuise' }, async (b) => {
    const T = b.telegram, p = await demarrer(b, b.lancer('A'))
    const ups = b.scenario('appairage-epuise')
    ups.push(b.poster('nouveau', '/start epuise'), b.poster('nouveau', `/start ${b.code}`))
    await b.acquittes(Math.max(...ups.map((u) => u.update_id)))
    verifie('PT-15', T.envois.length === 0 && b.presti.commandes().length === 0, 'TELEGRAM_CODE_APPAIRAGE=epuise : aucun /start n’est écouté (ni « /start epuise », ni « /start aucun », ni un code de 8 signes)', `TELEGRAM_CODE_APPAIRAGE=epuise : ${T.envois.length} réponse(s), ${b.presti.commandes().length} appel(s) (rien attendu)`)
    verifie('PT-15', lignesAvec(p, [b.autre, b.nouveau]).length === 0 && !jl(p).some((l) => RE_APPAIRAGE.test(l)), 'code épuisé : aucune ligne de journal ne porte un identifiant ni un appairage', `code épuisé : ligne(s) de journal avec un identifiant ou un appairage : ${court(lignesAvec(p, [b.autre, b.nouveau]).join(' | '), 160)}`)
  })

  await passage('appairage-connue', ['PT-15'], { chat: 'benj', code: 'juste' }, async (b) => {
    const T = b.telegram, p = await demarrer(b, b.lancer('A'))
    const ups = b.scenario('appairage-conversation-connue')
    await b.acquittes(ups.at(-1).update_id)
    await b.barriere()
    verifie('PT-15', T.envois.every((e) => e.chat_id === b.benj) && !jl(p).some((l) => RE_APPAIRAGE.test(l)) && lignesAvec(p, [b.autre]).length === 0, 'la conversation de Benj est déjà posée : le /start d’une autre conversation n’appaire rien', `conversation déjà posée : un /start étranger a été écouté (réponses à [${[...new Set(T.envois.map((e) => e.chat_id))].join(', ')}], lignes : ${court(jl(p).filter((l) => RE_APPAIRAGE.test(l)).join(' | '), 100)})`)
  })

  // ═══ PT-16 : un seul propriétaire, un identifiant idempotent ══════════════════════════════════════════════════════════════
  await passage('verrou', ['PT-16'], { chat: 'benj', code: 'epuise' }, async (b) => {
    const T = b.telegram, P = b.presti
    const A = b.lancer('A'), B = b.lancer('B')     // DEUX processus, même etat.json, même faux Telegram, même faux Presti
    await attendre(() => [A, B].every((x) => x.sorti || x.enAttenteDeMiseAJour()), { max: 7000 })
    if (A.sorti && B.sorti) throw new Error(`aucun des deux processus ne reste : A code ${A.code}, B code ${B.code} : ${court(A.journal().concat(B.journal()).slice(-3).join(' | '), 160)}`)
    P.alertes.push({ id: 5001, texte: 'Alerte unique du verrou' })
    const pause = b.poster('benj', '/pause deux processus, un seul appel')
    await attendre(() => P.commandes().length >= 1 && T.envoisVers(b.benj).length >= 1)
    await attendre(() => T.polls.filter((x) => x.offset >= pause.update_id + 1).length >= b.vivants().length, { max: 3000 })
    await dormir(800)
    const pauses = P.commandes().filter((r) => r.corps?.commande === 'pause')
    verifie('PT-16', pauses.length === 1, 'deux processus, un même message : un seul appel de commande', `deux processus sur le même etat.json et le même message : ${pauses.length} appel(s) « pause » (un seul attendu)`)
    verifie('PT-16', T.envoisVers(b.benj).length === 1, 'deux processus, un même message : une seule réponse envoyée', `deux processus : ${T.envoisVers(b.benj).length} réponse(s) envoyée(s) pour un message (une attendue)`)
    await b.avancerPar(75_000)
    await attendre(() => T.envois.some((e) => String(e.texte ?? '').includes('Alerte unique du verrou')), { max: 5000 })
    await dormir(600)
    const alertes = compte(T.envois, (e) => String(e.texte ?? '').includes('Alerte unique du verrou'))
    verifie('PT-16', alertes === 1, 'deux processus, un même message sortant : un seul sendMessage', `deux processus : ${alertes} sendMessage pour l'alerte sortante (un seul attendu)`)
    // un acquittement rejoué (même update_id) : refusé, dans le même processus
    const total0 = T.envois.length, cmd0 = P.commandes().length
    T.rejouer(pause)
    const sentinelle = b.poster('benj', '/etat')
    await attendre(() => P.commandes().length > cmd0 && T.envois.length > total0)
    await b.acquittes(sentinelle.update_id, { residu: 700 })
    verifie('PT-16', P.commandes().length === cmd0 + 1 && T.envois.length === total0 + 1, 'un update_id rejoué : aucun second envoi ni second appel', `update_id déjà acquitté rejoué : ${P.commandes().length - cmd0 - 1} appel(s) et ${T.envois.length - total0 - 1} envoi(s) de trop (le seul /etat sentinelle est attendu)`)
    // arrêt brutal, relance sur le même fichier : le verrou périmé ne bloque pas, l'identifiant déjà acquitté reste refusé
    for (const x of b.vivants()) await x.arreter('SIGKILL')
    const C = b.lancer('C')
    const pret = await b.pret(C)
    const total1 = T.envois.length, cmd1 = P.commandes().length
    if (!pret) { verifie('PT-16', false, '', `relance après un arrêt brutal : le service ne repart pas (verrou périmé ?) — ${C.sorti ? `code ${C.code}` : 'aucun getUpdates'} : ${court(C.journal().slice(-2).join(' | '), 140)}`) } else {
      T.rejouer(pause)
      const s2 = b.poster('benj', '/etat')
      const repondu = await attendre(() => P.commandes().length > cmd1 && T.envois.length > total1)
      await b.acquittes(s2.update_id, { residu: 700 })
      verifie('PT-16', repondu && P.commandes().length === cmd1 + 1 && T.envois.length === total1 + 1, 'relance sur le même etat.json : le même update_id rejoué reste refusé, le service répond', `relance sur le même etat.json : ${repondu ? '' : 'pas de réponse à la sentinelle ; '}${P.commandes().length - cmd1 - 1} appel(s) et ${T.envois.length - total1 - 1} envoi(s) de trop pour l'update_id rejoué`)
    }
  })

  // ═══ PT-10 : --une-passe (les sorties, les envois) ══════════════════════════════════════════════════════════════════════
  await passage('une-passe', ['PT-10'], { chat: 'benj', code: 'epuise', unePasse: true }, async (b) => {
    b.presti.alertes.push({ id: 7001, texte: 'Alerte de la passe unique' })
    b.poster('benj', '/etat')
    const p = b.lancer('A', { args: ['--une-passe'], horloge: false })
    const fini = await Promise.race([p.ferme.then(() => true), dormir(25_000).then(() => false)])
    if (!fini) s.note('--une-passe ne s’est pas terminé seul en 25 s (tué par le juge) : non jugé, le contrat de cette option n’est pas assez précis pour en faire un échec')
    else s.note(`--une-passe : sorti seul, code ${p.code}, ${b.telegram.envois.length} envoi(s), ${b.presti.requetes.length} requête(s) vers le faux Presti`)
  })

  // ═══ Les critères transversaux ══════════════════════════════════════════════════════════════════════════════════════════
  // PT-9 : chaque sendMessage de chaque passage
  const envois = collecte.flatMap((c) => c.b.telegram.envois.map((e) => ({ ...e, passage: c.nom })))
  const dejaKo = (id) => bilan.get(id).ko.length
  if (envois.length < 12) ko('PT-9', `seulement ${envois.length} sendMessage observés sur tous les passages (au moins 12 attendus : le service n'a pas écrit)`)
  const pm = envois.filter((e) => Object.hasOwn(e.params, 'parse_mode'))
  const sp = envois.filter((e) => !(e.params.disable_web_page_preview === true || e.params.disable_web_page_preview === 'true'))
  const gros = envois.filter((e) => typeof e.texte !== 'string' || e.texte.length < 1 || e.texte.length > 4096)
  if (envois.length) {
    verifie('PT-9', pm.length === 0, `aucun des ${envois.length} sendMessage ne porte parse_mode`, `${pm.length} sendMessage portent parse_mode (« ${pm[0]?.params.parse_mode} », passage ${pm[0]?.passage}) : aucune mise en forme attendue`)
    verifie('PT-9', sp.length === 0, `les ${envois.length} sendMessage portent disable_web_page_preview: true`, `${sp.length} sendMessage sans disable_web_page_preview: true (valeur « ${sp[0]?.params.disable_web_page_preview}», passage ${sp[0]?.passage})`)
    verifie('PT-9', gros.length === 0, `tous les textes font de 1 à 4096 signes (le plus long : ${Math.max(...envois.map((e) => String(e.texte ?? '').length))})`, `${gros.length} texte(s) hors de 1–4096 signes (jusqu'à ${Math.max(...gros.map((e) => String(e.texte ?? '').length))}, passage ${gros[0]?.passage})`)
  }
  void dejaKo

  // PT-10 : aucun jeton ne fuit (argv, sorties, journaux, etat.json, fichiers du dossier d'essai, requêtes croisées)
  const fuites = []
  for (const c of collecte) {
    const b = c.b
    const forme = (jeton) => [jeton, jeton.split('-')[1], Buffer.from(jeton).toString('base64').replace(/=+$/, '')]
    const cherche = (texte, nomJeton, jeton) => forme(jeton).some((f) => f && String(texte).includes(f)) ? nomJeton : null
    const tests = [['jeton du bot', b.jetonBot], ['jeton d’agent', b.jetonAgent]]
    const voir = (ou, texte, seulement) => { for (const [n, j] of tests) { if (seulement && !seulement.includes(n)) continue; if (cherche(texte, n, j)) fuites.push(`${n} dans ${ou} (passage ${c.nom})`) } }
    for (const p of b.procs) {
      voir(`la sortie standard de ${p.nom}`, p.stdout); voir(`la sortie d'erreur de ${p.nom}`, p.stderr)
      voir(`l'argv de ${p.nom} (consigné par le juge)`, p.argv.join(' ')); for (const l of p.cmdlines) voir(`/proc/${p.pid}/cmdline de ${p.nom}`, l)
    }
    for (const x of c.cmdlines) fuites.push(`${x.chaine === b.jetonBot || x.chaine === b.jetonBot.split('-')[1] ? 'jeton du bot' : 'jeton d’agent'} dans la ligne de commande du processus ${x.pid} (passage ${c.nom})`)
    for (const f of c.fichiers) voir(`le fichier ${f.chemin}`, f.texte)
    for (const r of b.telegram.requetes) {
      const sansChemin = JSON.stringify({ params: r.params, corps: r.corpsBrut, entetes: r.entetes, q: r.chemin.replace(`/bot${b.jetonBot}/`, '/bot<jeton>/') })
      voir('une requête vers Telegram (hors du chemin /bot<jeton>/)', sansChemin)
    }
    for (const r of b.presti.requetes) {
      const { authorization, ...autres } = r.entetes
      voir('une requête vers Presti', JSON.stringify({ chemin: r.chemin, requete: r.requete, corps: r.corpsBrut, entetes: autres }), ['jeton du bot', 'jeton d’agent'])
      if (authorization && authorization.includes(b.jetonBot)) fuites.push(`jeton du bot dans l'en-tête Authorization envoyé à Presti (passage ${c.nom})`)
    }
  }
  const uniques = [...new Set(fuites)]
  verifie('PT-10', uniques.length === 0, 'aucun jeton (bot, agent) dans un argv, une sortie, un journal, etat.json, un fichier d’essai ni une requête croisée (jetons tirés au hasard, formes brute, aléa seul et base64)', `fuite : ${uniques.slice(0, 4).join(' ; ')}${uniques.length > 4 ? ` (+${uniques.length - 4})` : ''}`)
  const observees = collecte.reduce((n, c) => n + c.b.procs.reduce((m, p) => m + p.stdout.length + p.stderr.length, 0), 0)
  verifie('PT-10', collecte.some((c) => c.fichiers.some((f) => /etat\.json$/.test(f.chemin))), 'etat.json a été écrit et lu par le juge', 'aucun etat.json écrit sous le dossier d’essai : --etat=<fichier> n’est pas respecté')
  void observees

  // PT-11 : aucun socket en écoute ; long polling
  const src = lireSi(path.join(racine, CHEMIN_SERVICE))
  if (src === null) ko('PT-11', `${CHEMIN_SERVICE} absent`)
  else {
    const code = sansCommentaires(src)
    const motifs = [[/\bcreateServer\b/, 'createServer'], [/(^|[^A-Za-z0-9_$])listen\s*\(/, 'listen('], [/new\s+(?:http|https|net|http2|tls|dgram)\.Server\b/, 'new http.Server'], [/\b(?:WebSocketServer|Deno\.serve|Bun\.serve)\b/, 'serveur WebSocket/Deno/Bun']]
    const trouves = motifs.filter(([re]) => re.test(code)).map(([, n]) => n)
    verifie('PT-11', trouves.length === 0, 'aucun createServer ni listen( dans le source (commentaires écartés)', `le source contient ${trouves.join(', ')} (hors commentaires) : aucun serveur attendu`)
    verifie('PT-11', /getUpdates/.test(code), 'le source interroge getUpdates (long polling)', 'le source ne contient pas getUpdates : long polling attendu')
  }
  const ecoutes = collecte.flatMap((c) => c.ecoutes.map((e) => ({ ...e, passage: c.nom })))
  const ecoutant = ecoutes.filter((e) => e.liste && e.liste.length)
  if (ecoutes.length && ecoutes.every((e) => e.liste === null)) s.note('PT-11 : /proc illisible, seul le contrôle du source a eu lieu')
  else verifie('PT-11', ecoutes.length > 0 && ecoutant.length === 0, `aucun socket TCP en écoute dans les ${ecoutes.length} processus du service observés vivants (lu dans /proc)`, ecoutes.length ? `socket TCP en écoute : port ${ecoutant[0]?.liste[0]?.port} (passage ${ecoutant[0]?.passage}, processus ${ecoutant[0]?.proc})` : 'aucun processus du service observé vivant pour lire ses sockets')
  const polls = collecte.filter((c) => !c.unePasse).flatMap((c) => c.b.telegram.polls.map((x) => ({ ...x, passage: c.nom })))
  const courts = polls.filter((x) => !(Number.isFinite(x.timeout) && x.timeout >= 30))
  verifie('PT-11', polls.length > 0 && courts.length === 0, `long polling : ${polls.length} getUpdates, tous avec timeout ≥ 30 s`, polls.length ? `${courts.length} getUpdates sans timeout ≥ 30 s (timeout=${courts[0]?.timeout}, passage ${courts[0]?.passage})` : 'aucun getUpdates observé')

  // PT-17 : OpenClaw confiné
  const trouvés = []
  const marche = (d) => { for (const e of existe(d) ? fs.readdirSync(d, { withFileTypes: true }) : []) { const p = path.join(d, e.name); if (e.isDirectory()) { if (e.name !== 'node_modules') marche(p) } else trouvés.push(p) } }
  marche(path.join(racine, 'docs')); marche(path.join(racine, 'scripts', 'usine'))
  const openclaw = trouvés.filter((p) => /openclaw/i.test(path.relative(racine, p)))
  if (!openclaw.length) ok('PT-17', 'aucun fichier OpenClaw : rien à constater')
  else {
    const e = []
    const NEG = /\b(aucune?|sans|jamais|pas|ni|n['’]a|interdit|refus\w*|jamais)\b/i
    for (const f of openclaw) {
      const t = lire(f), rel = path.relative(racine, f)
      for (const nom of ['TELEGRAM_BOT_TOKEN', 'PRESTI_JETON_TELEGRAM', 'TELEGRAM_CHAT_ID', 'TELEGRAM_CODE_APPAIRAGE']) if (t.includes(nom)) e.push(`${rel} cite ${nom}`)
      const lignes = t.split(/\r?\n/)
      lignes.forEach((l, i) => {
        if (!/capacit|capabilit/i.test(l)) return
        const fenetre = [l, ...lignes.slice(i + 1, i + 7).filter((x) => /^\s*([-*]\s|["'\w]+\s*,?\s*$|\]|\[)/.test(x))].join('\n')
        if (/\b(pause|consigne)\b/i.test(fenetre) && !NEG.test(l)) e.push(`${rel}:${i + 1} porte une capacité pause ou consigne`)
      })
    }
    verifie('PT-17', e.length === 0, `${openclaw.length} fichier(s) OpenClaw (${openclaw.map((f) => path.relative(racine, f)).join(', ')}) : aucune valeur Telegram citée, aucune capacité pause ou consigne`, `OpenClaw n'est pas confiné : ${e.slice(0, 4).join(' ; ')}`)
  }

  // ═══ Le rapport : chaque critère est évalué ══════════════════════════════════════════════════════════════════════════════
  try { fs.rmSync(dossierEssai, { recursive: true, force: true }) } catch { /* sans importance */ }
  for (const id of IDS) {
    const x = bilan.get(id)
    if (x.ko.length) s.echoue(id, [...new Set(x.ko)].slice(0, 4).join(' ; '))
    else if (x.ok.length) s.passe(id, [...new Set(x.ok)].slice(0, 6).join(' ; '))
    else s.echoue(id, 'non évalué : aucune observation')
  }
}
