#!/usr/bin/env node
// scripts/juges-026-acquisition-mutations.mjs — 026-101 : la contre-vérification des juges de l'acquisition.
//
// Pour chaque juge : le TÉMOIN (copie intacte, code 0 exigé), puis chaque faute plantée par UN remplacement de texte exact
// dans une COPIE du dépôt (code ≠ 0 exigé, avec le critère nommé). Rien n'est jamais muté dans le dépôt en place : les
// copies vivent sous .orchestre/travail/026-101/, les juges sont lancés avec --racine=<copie> depuis le dépôt réel.
// Si une mutation n'est pas attrapée, le juge N'EST PAS corrigé : la mutation est écrite en tête de mutations.md et le
// script sort en code 1.
//
//   node scripts/juges-026-acquisition-mutations.mjs [--pool=2] [--seul=<critère|juge>] [--ancres] [--garder]
//     --ancres  ne vérifie que les remplacements (avant présent une seule fois), sans lancer de juge (jamais un verdict)
//     --pool=N  N copies et N juges en parallèle (défaut 3 ; les juges qui ouvrent un serveur passent à part, un à la fois)
//     --seul=…  ne rejoue que les mutations dont le critère ou le juge contient ce texte (sortie 3 : jamais un verdict)
// Écrit .orchestre/preuves/026-101/mutations.json (lu par le méta-juge) et mutations.md.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn, spawnSync } from 'node:child_process'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ID = '026-101'
const TRAVAIL = path.join(ROOT, '.orchestre', 'travail', ID)
const PREUVES = path.join(ROOT, '.orchestre', 'preuves', ID)
const args = process.argv.slice(2)
const drapeau = (n) => args.includes(`--${n}`)
const valeur = (n) => args.find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3)
for (const a of args) if (!/^--(ancres|garder|pool=\d+|seul=.+)$/.test(a)) { console.error(`✗ option inconnue : ${a}`); process.exit(2) }
const ANCRES = drapeau('ancres'), GARDER = drapeau('garder'), SEUL = valeur('seul')
const POOL = Math.max(1, Math.min(4, Number(valeur('pool') || 3)))
const DELAI_JUGE_MS = 12 * 60_000

const lire = (f) => fs.readFileSync(f, 'utf8')
const ecrire = (f, t) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, t) }
const nl = (t, crlf) => (crlf ? t.replace(/(?<!\r)\n/g, '\r\n') : t)
const court = (s, n = 160) => { const t = String(s).replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t }

// ── La table des mutations ───────────────────────────────────────────────────────────────────────────────────────
// Un juge = { id, chemin, base : arguments fixes (la copie s'écrit {racine}), serveur : ouvre un port }
const LOADER = ['--import', './scripts/ts-loader.mjs']
const JUGES = {
  'recenseur-sirene': { chemin: 'scripts/recenseur-qa.mjs', base: [...LOADER, 'scripts/recenseur-qa.mjs', '--partie=sirene', '--racine={racine}'] },
  'recenseur-site': { chemin: 'scripts/recenseur-qa.mjs', base: [...LOADER, 'scripts/recenseur-qa.mjs', '--partie=site', '--racine={racine}'] },
  'recenseur-rge': { chemin: 'scripts/recenseur-qa.mjs', base: [...LOADER, 'scripts/recenseur-qa.mjs', '--partie=rge', '--racine={racine}'] },
  'recenseur-orchestration': { chemin: 'scripts/recenseur-qa.mjs', base: [...LOADER, 'scripts/recenseur-qa.mjs', '--partie=orchestration', '--racine={racine}'] },
  'faits': { chemin: 'scripts/faits-qa.mjs', base: [...LOADER, 'scripts/faits-qa.mjs', '--racine={racine}'] },
  'vigie-meta': { chemin: 'scripts/vigie-meta-qa.mjs', base: [...LOADER, 'scripts/vigie-meta-qa.mjs', '--racine={racine}'] },
  'conformite': { chemin: 'scripts/conformite-qa.mjs', base: [...LOADER, 'scripts/conformite-qa.mjs', '--racine={racine}'] },
  'redacteur': { chemin: 'scripts/redacteur-qa.mjs', base: [...LOADER, 'scripts/redacteur-qa.mjs', '--racine={racine}'] },
  // Le juge lancé DEPUIS la copie : seule façon de jouer une faute plantée dans un jeu d'essai (le magasin factice), que le juge importe à côté de lui.
  'redacteur-copie': { chemin: 'scripts/redacteur-qa.mjs', depuisCopie: true, base: [...LOADER, 'scripts/redacteur-qa.mjs'] },
  'standardiste': { chemin: 'scripts/standardiste-qa.mjs', base: [...LOADER, 'scripts/standardiste-qa.mjs', '--racine={racine}'] },
  'maquette-lien': { chemin: 'scripts/maquette-lien-qa.mjs', base: [...LOADER, 'scripts/maquette-lien-qa.mjs', '--racine={racine}'] },
  'atelier': { chemin: 'scripts/atelier-maquettes-qa.mjs', depuisCopie: true, base: [...LOADER, 'scripts/atelier-maquettes-qa.mjs'] },
  'routes-recensement': { chemin: 'scripts/routes-acquisition-qa.mjs', serveur: true, depuisCopie: true, base: [...LOADER, 'scripts/routes-acquisition-qa.mjs', '--lot=recensement'] },
  'routes-echanges': { chemin: 'scripts/routes-acquisition-qa.mjs', serveur: true, depuisCopie: true, base: [...LOADER, 'scripts/routes-acquisition-qa.mjs', '--lot=echanges'] },
  'confidentialite': { chemin: 'scripts/confidentialite-prospection-qa.mjs', serveur: true, depuisCopie: true, base: ['scripts/confidentialite-prospection-qa.mjs'] },
}
/** Une ligne du fichier, retrouvée par son début (une seule doit exister) : pour les lignes trop longues à recopier. */
function ligne(f, debut) {
  const L = lire(path.join(ROOT, f)).split(/\r?\n/).filter((l) => l.trimStart().startsWith(debut))
  if (L.length !== 1) throw new Error(`${f} : ${L.length} ligne(s) commençant par « ${debut} »`)
  return L[0]
}
const ACQ = 'lib/agents/acquisition/'
const M = []
/** m(juge, critere, fichier, avant, apres, nom) — apres peut être une fonction de avant. */
const m = (juge, critere, fichier, avant, apres, nom) => M.push({ juge, critere, fichier, avant, apres: typeof apres === 'function' ? apres(avant) : apres, nom })

// recenseur — sirene (RS)
m('recenseur-sirene', 'RS-3', ACQ + 'sirene.ts', "if (resultat.statut_diffusion !== 'O') return { refus: 'diffusion_partielle' }", "if (resultat.statut_diffusion !== 'O' && resultat.statut_diffusion !== 'P') return { refus: 'diffusion_partielle' }", 'diffusion partielle (P) acceptée')
m('recenseur-sirene', 'RS-2', ACQ + 'sirene.ts', 'statut_diffusion: r.statut_diffusion,', 'statut_diffusion: r.statut_diffusion,\n        dirigeants: (r as unknown as { dirigeants?: unknown }).dirigeants,', 'dirigeants recopiés dans la sortie')
m('recenseur-sirene', 'RS-6', ACQ + 'sirene.ts', 'if (dernier !== undefined && maintenant - dernier < 150) await deps.horloge.attendre(150 - (maintenant - dernier))', '', 'attente entre deux appels supprimée')
// recenseur — site (LS)
m('recenseur-site', 'LS-3', ACQ + 'lecteurSite.ts', "if (robots === null || !robotsAutorise(robots, agent, u.pathname + u.search)) return { refus: 'robots_txt' }", '', 'robots.txt ignoré')
m('recenseur-site', 'LS-4', ACQ + 'lecteurSite.ts', 'if (precedent !== undefined) await deps.horloge.attendre(Math.max(0, 1000 - (deps.horloge.maintenant() - precedent)))', '', 'attente d’une seconde supprimée')
m('recenseur-site', 'LS-8', ACQ + 'lecteurSite.ts', '  return { faits, siren, reseaux }', "  for (const mel of propre.matchAll(/mailto:([^\"'>\\s?]+)/gi)) { const f = fait('site_titre', mel[1], url, date); if (f) faits.push(f) }\n  return { faits, siren, reseaux }", 'adresse contact@ d\'une page de contact relevée (mailto)')
m('recenseur-site', 'LS-14', ACQ + 'lecteurSite.ts', ligne(ACQ + 'lecteurSite.ts', "if (/<(?:input|textarea)\\b[^>]*(?:name"), (l) => { const i = l.indexOf('return {'); return `  if (false) ${l.slice(i)}` }, 'pot de miel non reconnu')
m('recenseur-site', 'LS-7', ACQ + 'lecteurSite.ts', '<(script|style|noscript|template)\\b', '<(style|noscript|template)\\b', 'texte des <script> inclus')
m('recenseur-site', 'LS-7', ACQ + 'lecteurSite.ts', 'if (!extrait || extrait.length < EXTRAIT_MIN || extrait.length > EXTRAIT_MAX) return null', 'if (extrait.length > EXTRAIT_MAX) extrait = extrait.slice(0, EXTRAIT_MAX)\n  if (!extrait || extrait.length < EXTRAIT_MIN) return null', 'h1 trop long tronqué au lieu d’être écarté')
m('recenseur-site', 'LS-5', ACQ + 'lecteurSite.ts', "if (!memeDomaine(u.hostname, etat.origine) || !await sur(url, deps)) return { refus: 'hote' }", "if (!await sur(url, deps)) return { refus: 'hote' }", 'redirection vers un autre domaine suivie')
// recenseur — rge (RG)
m('recenseur-rge', 'RG-4', ACQ + 'rge.ts', ' || DOMAINES_EXCLUS.some((exclu) => domaine === exclu || domaine.endsWith(`.${exclu}`))) return null', ') return null', 'facebook.com gardé (DOMAINES_EXCLUS non consulté)')
// recenseur — orchestration (RC)
m('recenseur-orchestration', 'RC-3', ACQ + 'recenseur.ts', 'bilan.oppose++\n    return\n', 'bilan.oppose++\n', 'site d’un candidat en opposition lu quand même')
m('recenseur-orchestration', 'RC-4', ACQ + 'recenseur.ts', 'if (deps.horloge.maintenant() >= deps.echeance - 5000) { bilan.arrete_par_echeance = true; break }', '', 'échéance ignorée')
m('recenseur-orchestration', 'RC-6', ACQ + 'recenseur.ts', 'resume: `${bilan.reserves} réservés,', 'resume: `${candidats[0]?.domaine ?? \'\'} ${bilan.reserves} réservés,', 'domaine dans le résumé d’événement')

/** Ce que la fiche imposait et que l'arbre d'aujourd'hui ne permet pas de planter tel quel (ids de critères et jeux d'essai qui ont bougé depuis le 24/09). */
const NOTES = [
  'RD-2 (fiche) « ignorer le plafond du jour » : dans le juge actuel RD-2 est « envoi_froid fermé / adresse vide » (mutation jouée sous RD-2) ; le plafond du jour est RD-3. Une Plume qui ignore le plafond est arrêtée quand même par la base (le magasin factice refuse quota_nouveaux, comme acq_envoi_preparer) : la faute est invisible par construction (mutant équivalent), donc non rapportée.',
  'RD-4 (fiche) « choisir un fait non_verifiable » : dans le juge actuel c\'est RD-5 (mutation jouée sous RD-5) ; RD-4 est mutée par un texte préparé dont l\'empreinte ne correspond plus.',
  'RD-5 (fiche) « variante A sans maquette » : dans le juge actuel c\'est RD-6 (mutation jouée sous RD-6).',
  'CO-3 (fiche) « lien_maquette_email_v2 à approuve: true » : le modèle est déjà dans APPROUVES depuis le 29/09 ; la faute équivalente est un texte modifié alors que le modèle reste approuvé (l\'approbation périmée).',
  'AM-6 (fiche) « jeton en clair à creerLienMaquette » : dans le juge actuel c\'est AM-8 (mutation jouée sous AM-8) ; AM-6 est mutée par le drapeau varianteA ignoré.',
  'JF-7 (fiche) « fait non_verifiable comme seul fait » : c\'est le critère JF-11 du juge actuel qui l\'attrape (mutation jouée sous JF-11) ; JF-7 est mutée par un pub_meta sans jeton jugé ok.',
  'VM-5 | VM-6 : ad_snapshot_url n\'est servi par aucune réponse d\'essai ; les deux fautes sont jouées par l\'url du fait (cliché de l\'annonce, puis adresse de la requête avec le jeton).',
]
/** `n` lignes d'affilée du fichier, à partir de la ligne unique qui commence par `debut` (jointes par \n) : pour une faute qui touche un bloc. */
function bloc(f, debut, n) {
  const L = lire(path.join(ROOT, f)).split(/\r?\n/)
  const idx = L.map((l, i) => (l.trimStart().startsWith(debut) ? i : -1)).filter((i) => i >= 0)
  if (idx.length !== 1) throw new Error(`${f} : ${idx.length} ligne(s) commençant par « ${debut} »`)
  return L.slice(idx[0], idx[0] + n).join('\n')
}
const RIEN = (l) => l.match(/^\s*/)[0] + 'void 0'
const JETON_META_ENV = 'META_ADLIB_' + 'TOKEN'

// faits-qa (JF) — lib/agents/acquisition/jugeFaits.ts
const JF = ACQ + 'jugeFaits.ts'
m('faits', 'JF-2', JF, "if (nv.includes(ne)) return 'ok';", "if (rep.corps.includes(fait.extrait)) return 'ok';", 'comparaison sans normalisation (HTML brut, apostrophes, scripts)')
m('faits', 'JF-3', JF, "import { recupererPoli, robotsAutorise } from './lecteurSite';", "import { recupererPoli, robotsAutorise, extraire } from './lecteurSite';\nvoid extraire;", 'extraire de lecteurSite réutilisé au lieu de relire la page')
m('faits', 'JF-6', JF, "} else if (c.canal === 'instagram' || c.canal === 'facebook') {", "} else if (c.canal === 'email_sollicite') {\n         newCanaux.push(c)\n         aUnCanal = true\n      } else if (c.canal === 'instagram' || c.canal === 'facebook') {", 'adresse e-mail glissée dans le prospect gardée')
m('faits', 'JF-11', JF, "if (v === 'ok') aUnFaitOk = true;", "if (v === 'ok' || v === 'non_verifiable') aUnFaitOk = true;", 'un fait non_verifiable accepté comme fait vérifié')
m('faits', 'JF-7', JF, "if (!deps.jetonMeta) return 'non_verifiable';", "if (!deps.jetonMeta) return 'ok';", 'pub_meta sans jeton jugé ok')
m('faits', 'JF-11', JF, "if (code === 190) { metaEtats.set(deps, 'jeton_invalide'); }", "if (code === 190) { metaEtats.set(deps, 'jeton_invalide'); return 'absent'; }", 'erreur 190 de Meta comptée comme absent')
m('faits', 'JF-12', JF, "if (/reCAPTCHA|hCaptcha|Turnstile/i.test(html)) return { eligible: false, raison: 'captcha' };", '', 'verifierFormulaire ne cherche plus les signatures de captcha (J1 accepte un formulaire devenu protégé)')

// vigie-meta-qa (VM) — lib/agents/acquisition/vigieMeta.ts
const VM = ACQ + 'vigieMeta.ts'
m('vigie-meta', 'VM-3', VM, 'if (actives.length < 3) continue', 'if (actives.length < 2) continue', 'pages à 2 pubs gardées')
const URL_FAIT_META = "url: `https://www.facebook.com/ads/library/?id=${encodeURIComponent(annonce.id)}`, lu_le: vu_le,"
m('vigie-meta', 'VM-5', VM, URL_FAIT_META, "url: `https://www.facebook.com/ads/archive/render_ad/?id=${encodeURIComponent(annonce.id)}`, lu_le: vu_le,", "l'url du fait pointe vers le cliché de l'annonce (ad_snapshot_url) au lieu de la bibliothèque")
m('vigie-meta', 'VM-6', VM, URL_FAIT_META, 'url: url.toString(), lu_le: vu_le,', "l'url du fait stocke l'adresse de la requête, jeton compris (access_token)")
m('vigie-meta', 'VM-7', VM, "if (!(await budget.prendre(1))) return { etat: 'budget_epuise', appels, annonceurs, candidats }", '', 'budget.prendre jamais appelé')
m('vigie-meta', 'VM-2', VM, "if (!jeton?.trim()) return { etat: 'en_attente_jeton' }", "if (!jeton?.trim()) throw new Error('jeton absent')", 'exception levée sans jeton')
m('vigie-meta', 'VM-11', VM, 'cle_dedup: domaine ? `domaine:${domaine}` : `page_meta:${page.page_id}`,', 'cle_dedup: domaine ? `domaine:${domaine}` : `meta:${page.page_id}`,', 'meta:<page_id> au lieu de page_meta:<page_id> pour une page sans domaine')

// conformite-qa (CO) — conformite.ts et modeles.ts
const CF = ACQ + 'conformite.ts', MO = ACQ + 'modeles.ts'
m('conformite', 'CO-5', CF, ligne(CF, 'if (!texte.startsWith(`${PREMIERE_PHRASE}\\n`)) ajouter('), RIEN, 'la phrase de refus n\'est plus exigée en tête du message')
m('conformite', 'CO-5', CF, ligne(CF, 'if (/%|\\d/.test(analyse) || MOTS_NOMBRES.test(analyse)'), (l) => l.replace('/%|\\d/.test(analyse) || MOTS_NOMBRES.test(analyse) || ', ''), 'un chiffre hors citation accepté')
m('conformite', 'CO-3', MO, 'Comme promis, voici votre maquette : {lien}. ${PRIX_ET_ACHAT}', 'Comme convenu, voici votre maquette : {lien}. ${PRIX_ET_ACHAT}', 'lien_maquette_email_v2 : texte changé alors que le modèle reste approuvé (approbation périmée ; il est déjà dans APPROUVES depuis le 29/09)')
m('conformite', 'CO-2', MO, 'Je peux vous préparer gratuitement une maquette privée', 'Je peux vous préparer une maquette privée', 'un mot retiré du modèle B')

// redacteur-qa (RD) — redacteur.ts (les ids de la fiche ont bougé : RD-2 = envoi_froid/adresse, RD-3 = plafond, RD-5 = fait, RD-6 = variante A)
const RD = ACQ + 'redacteur.ts'
m('redacteur', 'RD-2', RD, "if (etat.envoi_froid !== true) return terminer('envoi_froid_ferme')", '', 'envoi_froid fermé ignoré')
m('redacteur', 'RD-3', RD, 'const reste = plafond ? Math.max(0, plafond.nouveaux - faits.nouveaux) : 0', 'const reste = plafond ? plafond.nouveaux : 0', 'plafond du jour ignoré : les messages déjà partis ne sont plus décomptés')
m('redacteur', 'RD-4', RD, 'objet, texte: t, empreinte_texte: sha256(t),', "objet, texte: t + ' ', empreinte_texte: sha256(t),", 'texte préparé différent de son empreinte')
m('redacteur', 'RD-5', RD, "const ok = faits.filter((f) => f.verifie === 'ok')", "const ok = faits.filter((f) => f.verifie === 'ok' || f.verifie === 'non_verifiable')", 'un fait non_verifiable choisi')
m('redacteur', 'RD-6', RD, "else if (drapeaux.varianteA === true && etatMaquette(await magasin.maquetteDe(p.id), maintenant) === 'prete') modeleId = 'formulaire_A_v1'", "else if (drapeaux.varianteA === true) modeleId = 'formulaire_A_v1'", 'variante A sans maquette prête')
m('redacteur-copie', 'RD-10', 'scripts/fixtures/026-acquisition/magasin-memoire.mjs', 'return !!r && !r.accuse_site && ((!!p', 'return !!r && !!r.accuse_site && ((!!p', 'magasin factice copié : la preuve de demande « message_recu » refusée (seul un accusé de site compterait)')

// standardiste-qa (ST) — standardiste.ts
const SD = ACQ + 'standardiste.ts'
m('standardiste', 'ST-2', SD, 'const code = classerEnCode(r)', 'const code = lecteur ? null : classerEnCode(r)', 'lecteur appelé avant le filtre des refus')
m('standardiste', 'ST-3', SD, ligne(SD, 'const trouve = (v: unknown)'), (l) => l.slice(0, l.indexOf(' && plier(brutTexte)')), 'une valeur rendue par le lecteur (site inventé hors du texte) suivie sans être retrouvée dans la réponse')
m('standardiste', 'ST-5', SD, ligne(SD, ".replace(RE_LIEN,"), () => '', 'liens non retirés avant le lecteur')
m('standardiste', 'ST-7', SD, 'const horsFil = reponse.envoi_id === null && reponse.conversation_id === null && reponse.prospect_id === null', 'const horsFil = false', 'une réponse sans envoi_id traitée comme rattachée')
m('standardiste', 'ST-21', SD, 'if (Number.isFinite(age) && age < ATTENTE_USINE_MINUTES * MINUTE_MS) { bilan.en_attente += 1; continue }', '', 'attendreUsine : une réponse de 10 min classée « à lire »')

// maquette-lien-qa (ML)
const MQ = ACQ + 'maquettesLien.ts', PURGE = 'app/api/cron/maquettes-purge/route.ts'
m('maquette-lien', 'ML-3', MQ, '|| Date.parse(m.expire_le) <= Date.now()) return introuvable()', ") return introuvable()\n  if (Date.parse(m.expire_le) <= Date.now()) return { statut: 410, entetes: { ...COMMUN, 'Content-Type': 'text/plain; charset=utf-8' }, corps: 'Lien expiré.' }", '404 différente pour un lien expiré')
m('maquette-lien', 'ML-6', MQ, 'const m = await deps.magasin.maquetteParJeton(hacherJeton(jeton))', 'const m = await deps.magasin.maquetteParJeton(hacherJeton(jeton))\n  if (m?.id) await deps.magasin.marquerMaquettePurgee(m.id)', 'une écriture à chaque consultation (vue enregistrée)')
m('maquette-lien', 'ML-5', MQ, "'X-Robots-Tag': 'noindex, nofollow, noarchive',", '', 'noindex retiré des en-têtes')
m('maquette-lien', 'ML-8', PURGE, ligne(PURGE, "await enregistrerPassage('acq-maquettes-purge', { erreur"), (l) => `    await (await import('@/lib/agents/bus')).ops_battement({ p_nom: 'atelier_maquettes' })\n${l}`, 'battement de atelier_maquettes dans le catch de la purge')

// atelier-maquettes-qa (AM) — atelier-maquettes.mjs et les routes de l'Atelier
const AT = 'scripts/agents/atelier-maquettes.mjs', ATR = 'app/api/usine/atelier/'
const lignesAT = [ligne(AT, 'if (!limite(fichier,'), ligne(AT, 'const octets = fs.readFileSync(fichier)'), ligne(AT, "if (nom === 'video.mp4' ? octets.toString('ascii'")]
m('atelier', 'AM-4', AT, lignesAT.join('\n'), "        if (nom === 'video.mp4' && !limite(fichier, 3 * 1024 ** 2)) throw ERREUR(1, 'taille')\n        const octets = fs.readFileSync(fichier)\n        if (nom === 'video.mp4' && octets.toString('ascii', 4, 8) !== 'ftyp') throw ERREUR(1, 'format')", 'les captures ne sont plus contrôlées (0 octet, trop lourde, uniforme acceptées)')
m('atelier', 'AM-3', AT, "if (absolu.split(path.sep).includes('public')) throw ERREUR(2, 'dossier public interdit')", '', 'sortie sous public/ acceptée')
m('atelier', 'AM-6', ATR + 'travail/route.ts', "if (actif('varianteA' as Parameters<typeof actif>[0])) {", 'if (true) {', 'maquettes d\'avance fabriquées drapeau varianteA baissé')
m('atelier', 'AM-8', ATR + 'lien/route.ts', 'await magasinSupabase.creerLienMaquette(p.id, m.objet ?? m.chemin, hacherJeton(jeton), expireLe)', 'await magasinSupabase.creerLienMaquette(p.id, m.objet ?? m.chemin, jeton, expireLe)', 'le jeton en clair passé à creerLienMaquette')

// routes-acquisition-qa (RA, RB) — app/api/cron/* et app/api/usine/standard/*
const CRON = (r) => `app/api/cron/${r}/route.ts`
const USTD = (r) => `app/api/usine/standard/${r}/route.ts`
m('routes-recensement', 'RA-2', CRON('recenseur'), '  const secret = process.env.CRON_SECRET', '  const p0 = await pauseGenerale()\n  void p0\n  const secret = process.env.CRON_SECRET', 'jeton contrôlé après un await')
m('routes-recensement', 'RA-2', CRON('juge-faits'), 'if (pause.active) return NextResponse.json({ pause: true, source: pause.source })', "if (pause.active || process.env.PRESTI_PAUSE_AGENTS === '1') return NextResponse.json({ pause: true, source: pause.source })", 'PRESTI_PAUSE_AGENTS lu au lieu de pauseGenerale() seul')
m('routes-recensement', 'RA-4', CRON('vigie-meta'), 'const jeton: string | null = lecture.error ? null : lecture.data?.[0]?.jeton ?? null', `const jeton: string | null = process.env.${JETON_META_ENV} ?? (lecture.error ? null : lecture.data?.[0]?.jeton ?? null)`, 'jeton Meta lu dans l\'environnement au lieu du coffre')
m('routes-recensement', 'RA-4', CRON('vigie-meta'), '    const budget = { prendre:', "    console.log('[vigie]', jeton)\n    const budget = { prendre:", 'jeton Meta journalisé')
m('routes-recensement', 'RA-8', CRON('juge-faits'), ligne(CRON('juge-faits'), "await enregistrerPassage('acq-juge-faits', etat === 'limite'"), (l) => `    await ops_battement({ p_nom: 'juge_faits' })\n${l}`, 'battement avant enregistrerPassage')
m('routes-recensement', 'RA-8', CRON('recenseur'), ligne(CRON('recenseur'), "await enregistrerPassage(passeRge ? 'acq-rge' : 'acq-recenseur', { erreur"), (l) => `    await ops_battement({ p_nom: 'recenseur' })\n${l}`, 'battement dans le catch')
m('routes-recensement', 'RA-9', CRON('vigie-meta'), "await enregistrerPassage('acq-vigie-meta', { etat }, false)", "await enregistrerPassage('acq-vigie-meta', { etat }, true)", 'jeton_invalide enregistré comme un passage réussi')
m('routes-echanges', 'RB-4', CRON('redacteur'), "import { ops_battement } from '@/lib/agents/bus'", "import { ops_battement } from '@/lib/agents/bus'\nimport * as ia from '@/lib/ai'\nvoid ia", 'la route du rédacteur importe @/lib/ai')
m('routes-echanges', 'RB-8', CRON('standardiste'), ligne(CRON('standardiste'), "await enregistrerPassage('acq-standardiste', { erreur"), (l) => `    await ops_battement({ p_nom: 'standardiste' })\n${l}`, 'battement du standardiste dans le catch')
m('routes-echanges', 'RB-10', CRON('standardiste'), [ligne(CRON('standardiste'), "if (Object.keys(cles).length) await magasinSupabase.opposer("), ligne(CRON('standardiste'), "await magasinSupabase.signal({ type: 'stop'")].join('\n'), '', 'un STOP relevé laissé au seul classement : ni opposer ni signal dans le passage')
m('routes-echanges', 'RB-15', USTD('travail'), 'donnees: preparerDonnees(reponse, faq, metiers) })', 'donnees: preparerDonnees(reponse, faq, metiers), texte: reponse.texte })', 'la route travail rend le texte brut de la réponse')
m('routes-echanges', 'RB-16', USTD('classement'), 'const classement = validerClassement(brut, reponse)', 'const classement = JSON.parse(brut) as ReturnType<typeof validerClassement>', 'la route classement applique le brut du lecteur sans validerClassement')

// confidentialite-prospection-qa (CP)
const CPM = 'lib/confidentialite/prospection.ts'
m('confidentialite', 'CP-1', 'app/confidentialite/page.tsx', '<h2 id="prospection">{SECTION_PROSPECTION.titre}</h2>', '<h2 id="prospect">{SECTION_PROSPECTION.titre}</h2>', 'l\'id du h2 devient prospect')
m('confidentialite', 'CP-2', CPM, ligne(CPM, "'Pour refuser, écrivez STOP"), (l) => l.replaceAll('STOP', 'refus'), 'STOP retiré de la section')
m('confidentialite', 'CP-2', CPM, bloc(CPM, "'OpenAI (Codex) classe", 5), (b) => b.replaceAll('OpenAI', 'Un fournisseur'), 'OpenAI retiré de la liste des sous-traitants')

// ── Copies, lancement, lecture ───────────────────────────────────────────────────────────────────────────────────
const DOSSIERS = ['app', 'lib', 'components', 'plans', 'scripts', 'supabase', 'docs', '.github', 'gabarits-pubs', 'maquettes', 'public']
const FICHIERS = ['package.json', 'tsconfig.json', 'next.config.mjs', 'next-env.d.ts', 'vercel.json', 'proxy.ts', 'middleware.ts']
const jonctions = []
function copier(dest) {
  fs.mkdirSync(dest, { recursive: true })
  const x = spawnSync('git', ['-C', ROOT, 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8', maxBuffer: 256 << 20, windowsHide: true })
  if (x.status !== 0) throw new Error(`git ls-files : ${x.stderr}`)
  for (const f of x.stdout.split('\0').filter(Boolean)) {
    const dossier = f.split('/')[0]
    const permis = FICHIERS.includes(f) || DOSSIERS.includes(dossier) || f.startsWith('.orchestre/brouillons-ecosysteme/') || f.startsWith('.orchestre/preuves/')
    if (!permis || /^(\.git|node_modules|\.next)\//.test(f)) continue
    const de = path.join(ROOT, f)
    let st; try { st = fs.lstatSync(de) } catch { continue }
    if (!st.isFile()) continue
    fs.mkdirSync(path.dirname(path.join(dest, f)), { recursive: true }); fs.copyFileSync(de, path.join(dest, f))
  }
  const lien = path.join(dest, 'node_modules')
  // Windows : une jonction. Linux (l'usine) : des liens durs, car Next (Turbopack) refuse un node_modules qui est un lien symbolique hors de sa racine.
  if (process.platform === 'win32') { fs.symlinkSync(path.join(ROOT, 'node_modules'), lien, 'junction'); jonctions.push(lien) }
  else { const cp = spawnSync('cp', ['-al', path.join(ROOT, 'node_modules'), lien], { encoding: 'utf8' }); if (cp.status !== 0) throw new Error(`cp -al node_modules : ${cp.stderr}`) }
}
const commande = (j, racine) => (JUGES[j].depuisCopie ? `cd ${racine.replaceAll('\\', '/')} && ` : '') + ['node', ...JUGES[j].base].map((a) => a.replaceAll('{racine}', racine.replaceAll('\\', '/'))).join(' ')
function lancer(j, racine) {
  return new Promise((resolve) => {
    const debut = Date.now()
    const enfant = spawn(process.execPath, JUGES[j].base.map((a) => a.replaceAll('{racine}', racine)), { cwd: JUGES[j].depuisCopie ? racine : ROOT, env: { ...process.env, FORCE_COLOR: '0' }, windowsHide: true })
    let sortie = '', expire = false
    const t = setTimeout(() => { expire = true; enfant.kill('SIGKILL') }, DELAI_JUGE_MS)
    enfant.stdout.on('data', (d) => { sortie += d }); enfant.stderr.on('data', (d) => { sortie += d })
    enfant.on('close', (code) => { clearTimeout(t); resolve({ code: expire ? 124 : code ?? 1, sortie, duree_s: Math.round((Date.now() - debut) / 100) / 10 }) })
  })
}
/** La ligne en échec du critère : « ❌ RS-3 … » ou « FAIL RS-3 — … », jamais une ligne d'un autre critère qui le cite. */
function extraitDe(sortie, critere) {
  const re = new RegExp(`^\\s*(?:❌|✗|✘|FAIL)\\s+${critere.replace(/[-]/g, '\\-')}(?:\\s|—|$)`)
  return sortie.split(/\r?\n/).find((l) => re.test(l))?.trim() || ''
}
const bilanNomme = (sortie, critere) => sortie.split(/\r?\n/).some((l) => / : FAIL(?: — (.*))?$/.test(l) && new RegExp(`(?:^|[^A-Z0-9-])${critere}(?:$|[^A-Z0-9-])`).test(l))

// ── Le déroulé ───────────────────────────────────────────────────────────────────────────────────────────────────
const selection = M.filter((x) => !SEUL || x.critere.includes(SEUL) || x.juge.includes(SEUL))
const erreurs = [], lignesMd = [], rapport = []
const resultats = new Map()
const temoins = new Map()
async function main() {
  // 1. les ancres : avant présent une seule fois dans le dépôt réel
  for (const x of selection) {
    const f = path.join(ROOT, x.fichier)
    if (!fs.existsSync(f)) { erreurs.push(`${x.nom} (${x.critere}) : fichier absent ${x.fichier}`); x.invalide = true; continue }
    const t = lire(f), a = nl(x.avant, t.includes('\r\n'))
    const n = t.split(a).length - 1
    if (n !== 1) { erreurs.push(`${x.nom} (${x.critere}) : « avant » présent ${n} fois dans ${x.fichier}`); x.invalide = true }
    else if (x.avant === x.apres) { erreurs.push(`${x.nom} (${x.critere}) : mutation sans effet (apres = avant)`); x.invalide = true }
  }
  if (ANCRES) { for (const e of erreurs) console.log(`✗ ${e}`); console.log(`ancres : ${selection.length - erreurs.length}/${selection.length} valides`); process.exitCode = erreurs.length ? 1 : 0; return }
  const valides = selection.filter((x) => !x.invalide)
  const jugesUtiles = [...new Set(valides.map((x) => x.juge))]
  // 2. les copies (une par travailleur)
  fs.rmSync(TRAVAIL, { recursive: true, force: true })
  const copies = []
  for (let i = 0; i < POOL; i++) { const d = path.join(TRAVAIL, `copie-${i}`); copier(d); copies.push(d) }
  // 3. les tâches : les témoins d'abord, puis les mutations
  const taches = [
    ...jugesUtiles.map((j) => ({ type: 'temoin', j })),
    ...valides.map((x) => ({ type: 'mutation', x })),
  ]
  const exclusifs = (t) => !!JUGES[t.j ?? t.x.juge].serveur
  const file = taches.filter((t) => !exclusifs(t)), apart = taches.filter(exclusifs)
  const travailleur = async (k, liste) => {
    const racine = copies[k]
    while (liste.length) {
      const t = liste.shift()
      if (t.type === 'temoin') {
        const r = await lancer(t.j, racine)
        temoins.set(t.j, r)
        ecrire(path.join(TRAVAIL, 'journaux', `temoin-${t.j}.log`), r.sortie)
        console.log(`Témoin ${t.j} : code ${r.code} (${r.duree_s} s)`)
        continue
      }
      const x = t.x, cible = path.join(racine, x.fichier), original = lire(cible)
      const a = nl(x.avant, original.includes('\r\n')), b = nl(x.apres, original.includes('\r\n'))
      let r
      try { fs.writeFileSync(cible, original.replace(a, () => b)); r = await lancer(x.juge, racine) } finally { fs.writeFileSync(cible, original) }
      ecrire(path.join(TRAVAIL, 'journaux', `mutation-${x.juge}-${x.critere}-${M.indexOf(x)}.log`), r.sortie)
      x.resultat = { ...r, extrait: extraitDe(r.sortie, x.critere), bilan: bilanNomme(r.sortie, x.critere) }
      console.log(`${x.resultat.extrait.length >= 20 && r.code !== 0 && r.code !== 124 ? 'PRISE ' : 'NON PRISE'} ${x.juge} ${x.critere} ${x.nom} (code ${r.code}, ${r.duree_s} s)`)
    }
  }
  await Promise.all(copies.map((_, k) => travailleur(k, file)))
  await travailleur(0, apart)
  // 4. le verdict
  /** Un témoin rouge sur un AUTRE critère (typecheck d'un fichier d'un autre chantier, par exemple) n'invalide pas une mutation : son critère doit être vert dans le témoin. */
  const vertDans = (sortie, critere) => sortie.split(/\r?\n/).some((l) => new RegExp(`^\\s*(?:✅|✓|PASS)\\s+${critere.replace(/[-]/g, '\\-')}(?:\\s|—|$)`).test(l))
  const temoinOk = (x) => { const w = temoins.get(x.juge); return !!w && (w.code === 0 || vertDans(w.sortie, x.critere)) }
  for (const j of jugesUtiles) if (temoins.get(j)?.code !== 0) erreurs.push(`témoin ${j} : code ${temoins.get(j)?.code} (${court(temoins.get(j)?.sortie.split(/\r?\n/).filter((l) => /^\s*(?:❌|FAIL)\s/.test(l)).slice(0, 3).join(' | ') || temoins.get(j)?.sortie.split(/\r?\n/).filter(Boolean).at(-1) || '', 400)})`)
  for (const x of valides) {
    const r = x.resultat
    const pris = temoinOk(x) && r && r.code !== 0 && r.code !== 124 && r.extrait.length >= 20 && r.bilan
    x.pris = !!pris
    if (!pris) erreurs.push(`NON PRISE : ${x.juge} ${x.critere} « ${x.nom} » : ${r ? `code ${r.code}, ${r.extrait ? 'extrait ' + court(r.extrait, 80) : 'aucune ligne en échec pour ' + x.critere}${r.bilan ? '' : ', bilan sans ' + x.critere}` : 'non jouée'}${temoins.get(x.juge)?.code === 0 ? '' : ' (témoin rouge)'}`)
    else rapport.push({ juge: JUGES[x.juge].chemin, commande: commande(x.juge, '{racine}'), fichier: x.fichier, avant: x.avant, apres: x.apres, critere: x.critere, extrait: r.extrait, duree_s: r.duree_s })
    lignesMd.push(`| ${JUGES[x.juge].chemin} | ${x.nom} | \`${x.fichier}\` | ${x.critere} | ${pris ? 'prise' : '**NON PRISE**'} | ${court(r?.extrait || '—', 140).replace(/\|/g, '\\|')} |`)
  }
}
try { await main() } catch (e) { erreurs.push(e.stack || String(e)) } finally {
  if (!GARDER && !ANCRES) {
    for (const p of jonctions) { try { fs.unlinkSync(p) } catch { /* déjà retirée */ } }
    if (path.resolve(TRAVAIL) === path.join(ROOT, '.orchestre', 'travail', ID)) fs.rmSync(TRAVAIL, { recursive: true, force: true })
  }
  if (!ANCRES) {
    if (!SEUL) {
      const manque = M.filter((x) => !x.pris && !x.invalide)
      if (rapport.length !== M.length) erreurs.push(`rapport incomplet : ${rapport.length}/${M.length}`)
      void manque
    }
    ecrire(path.join(PREUVES, 'mutations.json'), JSON.stringify({ mutations: rapport }, null, 2) + '\n')
    ecrire(path.join(PREUVES, 'mutations.md'), `# 026-101 — contre-vérification des juges de l'acquisition\n\n${erreurs.length ? `**ÉCHECS (${erreurs.length})** :\n${erreurs.map((e) => `- ${e}`).join('\n')}` : 'Tous les témoins sont verts et toutes les mutations sont prises.'}\n\n## Notes sur les mutations imposées par la fiche\n\n${NOTES.map((n) => `- ${n}`).join('\n')}\n\n| Juge | Faute plantée | Fichier | Critère attendu | Verdict | Extrait réel |\n|---|---|---|---|---|---|\n${lignesMd.join('\n')}\n`)
    console.log(`juges-026-acquisition-mutations : ${erreurs.length ? 'FAIL' : 'PASS'} — ${rapport.length}/${M.length} mutation(s) prises, ${erreurs.length} écart(s)`)
    for (const e of erreurs) console.log(`  ✗ ${e}`)
    process.exitCode = SEUL ? 3 : erreurs.length ? 1 : 0
  }
}
