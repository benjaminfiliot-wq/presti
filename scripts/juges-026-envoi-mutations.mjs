#!/usr/bin/env node
// Contre-épreuves de 026-099. Chaque faute est un remplacement unique sur une copie.
import fs from 'node:fs'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TRAVAIL = path.join(RACINE, '.orchestre/travail/026-099')
const PREUVES = path.join(RACINE, '.orchestre/preuves/026-099')
const optionsCli = process.argv.slice(2)
const garder = optionsCli.includes('--garder')
const seul = optionsCli.find((x) => x.startsWith('--seul='))?.slice(7) ?? null
const enfant = optionsCli.find((x) => x.startsWith('--enfant='))?.slice(9) ?? null
const jugesChoisis = optionsCli.find((x) => x.startsWith('--juges='))?.slice(8).split(',') ?? null
const sequentiel = optionsCli.includes('--sequentiel')
if (optionsCli.some((x) => x !== '--garder' && x !== '--valider' && x !== '--sequentiel' && !x.startsWith('--seul=') && !x.startsWith('--enfant=') && !x.startsWith('--juges='))) { console.error('usage : node scripts/juges-026-envoi-mutations.mjs [--garder] [--seul=ID] [--valider] [--sequentiel] [--juges=dj,jg,…]'); process.exit(2) }

const J = {
  dj: 'scripts/disjoncteurs-qa.mjs', jg: 'scripts/jauges-qa.mjs', fa: 'scripts/facteur-qa.mjs',
  pg: 'scripts/prospection-sql-qa.mjs', mw: 'scripts/meta-webhooks-qa.mjs', rp: 'scripts/repondeur-qa.mjs',
  rv: 'scripts/rendez-vous-qa.mjs', mv: 'scripts/maquette-video-qa.mjs', dl: 'scripts/douleurs-qa.mjs',
}
const F = {
  sql: 'supabase/migrations/0111_acquisition_envoi.sql', d: 'lib/agents/acquisition/disjoncteurs.ts',
  j: 'lib/agents/acquisition/jauges.ts', f: 'lib/agents/acquisition/facteur.ts',
  gt: 'app/api/usine/facteur/travail/route.ts', ga: 'app/api/usine/facteur/avis/route.ts',
  gc: 'lib/agents/acquisition/porteurs/gmail.ts', p: 'lib/agents/acquisition/porteurFormulaire.ts',
  ps: 'scripts/agents/porteur-formulaire.mjs', pt: 'app/api/usine/porteur/travail/route.ts',
  me: 'lib/agents/acquisition/metaWebhooks.ts', mr: 'app/api/webhooks/meta/route.ts',
  r: 'lib/agents/acquisition/repondeur.ts', rr: 'app/api/cron/repondeur/route.ts',
  rdv: 'lib/agents/acquisition/rendezVous.ts', rdvr: 'app/rendez-vous/[jeton]/route.ts',
  video: 'scripts/agents/maquette-video.mjs', douleur: 'lib/agents/acquisition/douleurs.ts',
}
const mutations = []
function m(juge, critere, fichier, avant, apres, args = '', description = '') {
  mutations.push({ juge: J[juge], critere, fichier: F[fichier] ?? fichier, avant, apres, args, description: description || `${avant} → ${apres}` })
}

// Disjoncteurs : droits, paliers, fermeture et carte d'attention.
m('dj','DJ-2','sql','create or replace function public.acq_signal(p jsonb) returns jsonb language plpgsql security definer','create or replace function public.acq_signal(p jsonb) returns jsonb language plpgsql','--partie=sql','acq_signal sans security definer')
m('dj','DJ-2','sql','grant execute on function public.acq_signal(jsonb) to service_role;','grant execute on function public.acq_signal(jsonb) to service_role, authenticated;','--partie=sql','acq_signal accessible à authenticated')
m('dj','DJ-3','sql','if v_echecs>=3 then','if v_echecs>=4 then','--partie=sql','pause après quatre échecs')
m('dj','DJ-3','sql',"('P3',30,5,'5 jours au vert'),('P4',40,null,'plafond des agents : au-delà, seul Benj')","('P3',30,5,'5 jours au vert'),('P4',60,null,'plafond des agents : au-delà, seul Benj')",'--partie=sql','P4 à 60 envois par jour')
m('dj','DJ-4','sql'," select actif into ouvert from ops.interrupteurs where nom='envoi_froid';"," update ops.interrupteurs set actif=true where nom='envoi_froid';\n select actif into ouvert from ops.interrupteurs where nom='envoi_froid';",'--partie=sql','acq_palier_appliquer ouvre le froid')
// Décision du 05/10/2026 (plus de date d'ouverture du froid) : 0129 remplace acq_envoi_froid_ouvrir sans date, 0130 ferme la porte générique.
// Chaque garde qui reste (mesure à sec, épreuve < 30 jours, notice < 7 jours, ordre avant l'écriture, porte unique) est saboté ici.
const OUV = 'supabase/migrations/0129_froid_sans_date.sql', PORTE = 'supabase/migrations/0130_froid_porte_unique.sql'
m('dj','DJ-3',OUV," if not exists(select 1 from ops.evenements where agent='systeme' and type='mesure_a_sec'"," if (ops.maintenant() at time zone 'Europe/Paris')::date<'2026-10-12'::date then raise exception 'ops:trop_tot'; end if;\n if not exists(select 1 from ops.evenements where agent='systeme' and type='mesure_a_sec'",'--partie=sql','la date du 12/10 revient dans acq_envoi_froid_ouvrir')
m('dj','DJ-10',OUV,"raise exception 'ops:epreuve_absente'","null",'--partie=sql','ouverture sans l\'épreuve de bout en bout')
m('dj','DJ-10',OUV,"resume like 'PASS%') then raise exception 'ops:mesure_absente'","resume like '%') then raise exception 'ops:mesure_absente'",'--partie=sql','mesure à sec acceptée même en échec')
m('dj','DJ-10',OUV,"interval '30 days') then raise exception 'ops:epreuve_absente'","interval '3000 days') then raise exception 'ops:epreuve_absente'",'--partie=sql','épreuve de bout en bout périmée acceptée')
m('dj','DJ-10',OUV,"v_notice<ops.maintenant()-interval '7 days'","v_notice<ops.maintenant()-interval '700 days'",'--partie=sql','notice périmée acceptée')
m('dj','DJ-10',OUV," if p_auteur is null or not exists(select 1 from public.artisans where id=p_auteur and is_founder) then raise exception 'ops:auteur'; end if;\n"," if p_auteur is null then raise exception 'ops:auteur'; end if;\n",'--partie=sql','ouverture sans contrôle du fondateur')
m('dj','DJ-10',PORTE,"  if p_nom = 'envoi_froid' and p_actif then\n    raise exception using message = 'ops:envoi_froid_par_geste', errcode = 'P0001';\n  end if;\n","",'--partie=sql','porte générique : envoi_froid ouvrable sans preuve')
m('dj','DJ-10',PORTE,"grant execute on function public.ops_interrupteur_poser(text, boolean, text, uuid) to service_role;","grant execute on function public.ops_interrupteur_poser(text, boolean, text, uuid) to service_role, authenticated;",'--partie=sql','porte générique ouverte à authenticated')
m('dj','DJ-7','d',"if (envoi.technologie && etat.technologies.some(t => t.technologie === envoi.technologie && t.etat === 'pause'))","if (envoi.technologie && etat.technologies.some(t => t.technologie === envoi.technologie && t.etat === 'active'))",'--partie=logique','technologie en pause acceptée')
m('dj','DJ-7','d',"const technologie = evenement.technologie ?? 'inconnue'","const technologie = evenement.resume ?? evenement.technologie ?? 'inconnue'",'--partie=logique','URL du prospect dans la carte')

// Jauges : définition, seuil, fuseau, consommation, dépendance interdite.
m('jg','JG-2','j',"definition({ id: 'publora', libelle: 'Publora', fournisseur: 'publora', periode: 'mois', plafond: 15, source: 'base' }),",'', '', 'jauge Publora supprimée')
m('jg','JG-3','j',"part >= 0.75 ? 'attention'","part >= 0.80 ? 'attention'",'', 'seuil attention porté à 80 %')
m('jg','JG-4','j',"timeZone: 'Europe/Paris', year: 'numeric'","timeZone: 'UTC', year: 'numeric'",'', 'période calculée en UTC')
m('jg','JG-4','j','if (utilise + n > plafond) return false','if (utilise + n > plafond) return magasin.jaugeConsommer(fournisseur, n)','','écriture même à jauge pleine')
m('jg','JG-6','j',"const definition = (j: Definition): Definition => Object.freeze(j)","const definition = (j: Definition): Definition => { void process.env.ACQ_JAUGE; return Object.freeze(j) }",'', 'lecture de process.env')

// Facteur : deux jugements, transport et routes de l'usine.
m('fa','FA-2','f',"if (typeof lecteur !== 'function') { await ecrire('second_juge_indisponible', 'Aucun moteur ne répond : rien n\\'est jugé.'); return rendus }","if (typeof lecteur !== 'function') { return [{ envoi_id: travail.envois[0].id, empreinte: 'a'.repeat(64), j2: { verdict: 'ok', raisons: [] }, j2_version: 'faux' }] }",'--partie=facteur','avis approuvé sans lecteur')
m('fa','FA-14','f','const j3 = jugerMessage(entree)','const j3 = { ok: true, raisons: [] } as ReturnType<typeof jugerMessage>','--partie=facteur','avis ok sans rejouer J3')
m('fa','FA-13','gt','texte: e.texte, empreinte: e.empreinte','texte: e.texte, destinataire: e.destinataire, empreinte: e.empreinte','--partie=facteur','destinataire rendu au second juge')
m('fa','FA-12','ga',"if (agent.nom !== AGENT) return erreur(403, 'agent')","if (agent.nom !== AGENT && agent.nom !== 'facteur_usine') return erreur(403, 'agent')",'--partie=facteur','jeton facteur_usine accepté par avis')
m('fa','FA-3','f',"      const refus = approuveVraiment(x)\n      if (refus) { compter(bilan.retenus, `non_approuve_${refus}`);","      const refus = approuveVraiment(x)\n      if (false && refus) { compter(bilan.retenus, `non_approuve_${refus}`);",'--partie=facteur','envoi préparé traversant la garde')
m('fa','FA-4','f','texte: x.texte, enReponseA, references','texte: x.texte, enReponseA: null, references','--partie=facteur','In-Reply-To omis')
m('fa','FA-5','f',"await magasin.signal({ type: 'gmail_refus', envoyeur: 'gmail', envoi_id: x.id, modele_id: x.modele_id })","void 0",'--partie=facteur','refus Gmail sans signal')
m('fa','FA-6','lib/agents/acquisition/envoiMeta.ts',"messaging_type: 'RESPONSE', message: { text: texte }","messaging_type: 'HUMAN_AGENT', message: { text: texte }",'--partie=facteur','tag HUMAN_AGENT ajouté')
m('fa','FA-8','app/api/cron/facteur/route.ts','await pauseGenerale()','{ active: process.env.PRESTI_PAUSE_AGENTS === \'1\' }','--partie=facteur','route lit une variable au lieu de la pause générale')
m('fa','FA-9','f',"const { magasin, gmail, horloge } = deps","console.log(deps.adresseReponse); const { magasin, gmail, horloge } = deps",'--partie=facteur','adresse en console')
m('fa','FA-10','f',"await envoyerMeta(deps, bilan)","await envoyerMeta(deps, bilan)\n    await deps.magasin.envoisApprouves('formulaire_site', 1)",'--partie=facteur','Facteur lit la file formulaire')

// Porteur et Gmail. --ici exerce le vrai navigateur et l'essai de bout en bout.
m('fa','PF-3','p',"if (/recaptcha|hcaptcha|h-captcha|turnstile|friendly.?captcha|frc-captcha|grecaptcha|captcha/i.test(html))","if (/hcaptcha|h-captcha|turnstile|friendly.?captcha|frc-captcha/i.test(html))",'--partie=porteur --ici','reCAPTCHA ignoré')
m('fa','PF-8','ps',"if (e?.code !== 'EEXIST') throw e","if (e?.code === 'EEXIST') return 'pris'; if (e?.code !== 'EEXIST') throw e",'--partie=porteur --ici','verrou existant traité comme acquis')
m('fa','PF-11','pt',"if (!etat || !releveFrais(etat.releve_gmail_le, maintenant) || futur(etat.formulaire_coupe_jusqua, maintenant)) return rien()","if (!etat || futur(etat.formulaire_coupe_jusqua, maintenant)) return rien()",'--partie=porteur --ici','route travail sans garde de la relève du Gmail')
m('fa','PF-6','pt',"if (!fenetreOuverte(new Date(maintenant))) return rien()","if (false) return rien()",'--partie=porteur --ici','route travail sans calendrier (le samedi, à 18 h : du travail rendu)')
m('fa','PF-12','ps','return cible.screenshot({ type:',"return page.screenshot({ fullPage: true, type:",'--partie=porteur --ici','capture de la page entière')
m('fa','PF-13','ps',"ecrire0600(path.join(dossierEnvoi, 'abandon.json'), JSON.stringify({ raison, empreinte_html: htmlEmpreinte }))","ecrire0600(path.join(dossierEnvoi, 'abandon.json'), JSON.stringify({ raison, empreinte_html: htmlEmpreinte })); ecrire0600(path.join(dossierEnvoi, 'avant.jpg'), Buffer.from([255, 216]))",'--partie=porteur --ici','JPEG sur un abandon')
m('fa','GM-2','gc',"p.trim().replace(/ /g, '')","p.trim()",'--partie=gmail','espaces du mot de passe conservés')
m('fa','GM-4','gc',"const requete: Record<string, unknown> = { header: { [champ]: adresse } }","const requete: Record<string, unknown> = { all: true }",'--partie=gmail','recherche IMAP sans adresse')

// La base : un seul premier formulaire à vie pour l'entreprise.
m('pg','PG-4','supabase/migrations/0099_ops_garde_envois.sql',"raise exception using message = 'ops:formulaire_deja', errcode = 'P0001';","null;",'--sans-essai','second formulaire à la même entreprise accepté (le refus ops:formulaire_deja n\u2019est plus levé)')

// Webhooks Meta : signature, abonnement, ordre, amorce, STOP et profil.
m('mw','MW-2','me','return crypto.timingSafeEqual(propose, attendu)','return propose.toString() === attendu.toString()','','comparaison de signature variable')
m('mw','MW-3','mr','|| !memeChaine(jeton, attendu)','', '', 'abonnement sans vérification du jeton')
m('mw','MW-4','mr','if (!verifierSignature(brut, req.headers.get(\'x-hub-signature-256\'), secret)) return new Response(null, { status: 401 })','JSON.parse(new TextDecoder().decode(brut))\n  if (!verifierSignature(brut, req.headers.get(\'x-hub-signature-256\'), secret)) return new Response(null, { status: 401 })','','JSON.parse avant signature')
m('mw','MW-5','me',"return t === 'site' || (/^site\\s/.test(t) && t.length <= 20)","return t.includes('site')",'', '« Joli site, bravo » accepté')
m('mw','MW-7','me',"await magasin.opposer(cles, 'stop', 'webhook_meta')","void cles",'', 'STOP sans opposition')
m('mw','MW-8','me',"pseudo: profil.pseudo.slice(0, 60), suit_le_compte: profil.suit_le_compte","pseudo: profil.pseudo.slice(0, 60), nom: profil.pseudo, suit_le_compte: profil.suit_le_compte",'', 'profil complet rangé')

// Répondeur : classe sensible, transparence, temps, unicité, jeton, approbation, cron.
m('rp','RP-2','r',"'entrant', 'oui'])","'entrant', 'oui', 'sensible'])",'', 'classe sensible reçoit une réponse')
m('rp','RP-3','r',"const IA = \"assistant IA de Presti\"","const IA = \"Presti\"",'', 'mention IA retirée')
m('rp','RP-5','r',"|| !(jusqua > deps.horloge.maintenant())","",'','réponse privée sans contrôle de la fin de fenêtre (le huitième jour part)')
m('rp','RP-6','r',"type = 'confirmation_stop' }","type = infoDuFil?.envois?.some(e => e.type === 'confirmation_stop') ? 'reponse' : 'confirmation_stop' }",'', 'second STOP contourne le type protégé')
m('rp','RP-7','r','creerLienRdv(prospectId, (ctx.deps.hacherJeton ?? hacherJetonReel)(jeton),','creerLienRdv(prospectId, jeton,','','jeton en clair au magasin')
m('rp','RP-8','r','if (modele.approuve === false) return','if (false && modele.approuve === false) return','','modèle non approuvé préparé')
m('rp','RP-9','rr',"if (!secret || auth !== `Bearer ${secret}`)","if (false)",'','route cron sans jeton')

// Rendez-vous : calendrier, indistinction, échappement, origine, empreinte, alerte.
m('rv','RV-2','rdv','jours: Object.freeze([1, 2, 3, 4, 5])','jours: Object.freeze([1, 2, 3, 4, 5, 6])','','samedi proposé')
m('rv','RV-3','rdvr',"Date.parse(lien.expire_le) <= Date.now()) return { erreur: introuvable() }","Date.parse(lien.expire_le) <= Date.now()) return { erreur: texte('Lien expiré.', 410) }",'', 'jeton expiré distingué')
m('rv','RV-4','rdv','${echapper(metier)} à ${echapper(commune)}','${metier} à ${echapper(commune)}','','métier non échappé')
m('rv','RV-5','rdvr',"if (req.headers.get('origin') !== 'https://prestiapp.fr') return texte('Origine refusée.', 403)",'','', 'Origin non contrôlé')
m('rv','RV-5','rdvr','reserverRdv(empreinte, valide.creneau, valide.telephone)','reserverRdv(jeton, valide.creneau, valide.telephone)','','jeton en clair au magasin')
m('rv','RV-6','rdvr',"corps: 'Le numéro est dans le Poste, carte « À appeler ».'","corps: `Numéro : ${valide.telephone}`",'', 'numéro dans l’alerte')

// Vidéo : mesures réelles par ffprobe/ffmpeg et navigateur.
m('mv','MV-2','video',"'-an', '-map_metadata'","'-filter_complex', 'anullsrc=r=44100:cl=mono[a]', '-map', '0:v', '-map', '[a]', '-c:a', 'aac', '-shortest', '-map_metadata'",'','piste audio ajoutée à la vidéo')
m('mv','MV-2','video',"'-t', String(duree)","'-t', String(duree + 6)",'','durée de la vidéo portée à 24 secondes')
m('mv','MV-3','video',"(t-1.5)/(${duree}-3)","0*(${duree}-3)",'','défilement figé')
m('mv','MV-5','video','route.continue() : route.abort()','route.continue() : route.continue()','','requête externe autorisée')
m('mv','MV-7','video',"{ stdio: 'ignore', windowsHide: true }","{ stdio: 'ignore', windowsHide: true, shell: true }",'', 'ffmpeg lancé dans un shell')

// Douleurs : réseau en dernier, une mutation à la fois.
m('dl','DL-2','douleur','comment faites-vous pour que le client vous choisisse ?','comment faites-vous pour que le client vous choisisse ','','question sans point d’interrogation')
m('dl','DL-2','douleur','id: "plombier-manque-clientele", metier: "plombier", citation: "je suis plombiers de métier et j\'ai presque 20 ans d\'expérience, ce qui me manque c\'est la clientèle pour démarrer", source_url: "https://plombiers-reunis.com/topic8048-que-pensez-vous-des-plateformes-de-mise-en-relation.html", relevee_le: \'2026-09-29\', mots_cles: ["clientele", "demarrage", "installation"], question: "Quand on se lance à son compte, comment vos premiers clients vous trouvent-ils ?", accroche_objet: "Comment vos premiers clients vous trouvent ?", approuve: false','id: "plombier-manque-clientele", metier: "plombier", citation: "je suis plombiers de métier et j\'ai presque 20 ans d\'expérience, ce qui me manque c\'est la clientèle pour démarrer", source_url: "https://plombiers-reunis.com/topic8048-que-pensez-vous-des-plateformes-de-mise-en-relation.html", relevee_le: \'2026-09-29\', mots_cles: ["clientele", "demarrage", "installation"], question: "Quand on se lance à son compte, comment vos premiers clients vous trouvent-ils ?", accroche_objet: "Comment vos premiers clients vous trouvent ?", approuve: true','','approbation sans trace')
m('dl','DL-3','douleur','citation: "la plateforme vens la meme proposition','citation: "u/pseudo la plateforme vens la meme proposition','','pseudo ajouté à la citation')
m('dl','DL-4','douleur','citation: "la plateforme vens la meme proposition','citation: "la plateforme vend la meme proposition','','citation changée')
m('dl','DL-5','douleur','comment faites-vous pour que le client vous choisisse ?','comment faites-vous sans engagement pour que le client vous choisisse ?','','promesse sans engagement')

function copier(source, cible) {
  fs.mkdirSync(path.dirname(cible), { recursive: true })
  fs.cpSync(source, cible, { recursive: true, filter: (x) => !['node_modules', '.git', '.next', '.orchestre'].includes(path.basename(x)) })
}
function preparation(nom) {
  const copie = path.join(TRAVAIL, nom.replace(/[^a-z0-9-]/gi, '-'))
  fs.rmSync(copie, { recursive: true, force: true })
  fs.mkdirSync(copie, { recursive: true })
  for (const d of ['app', 'lib', 'components', 'plans', 'scripts', 'supabase', 'docs']) if (fs.existsSync(path.join(RACINE, d))) copier(path.join(RACINE, d), path.join(copie, d))
  for (const f of ['package.json', 'tsconfig.json', 'next-env.d.ts', 'next.config.mjs', 'proxy.ts', 'middleware.ts']) if (fs.existsSync(path.join(RACINE, f))) fs.copyFileSync(path.join(RACINE, f), path.join(copie, f))
  fs.symlinkSync(path.join(RACINE, 'node_modules'), path.join(copie, 'node_modules'), 'dir')
  return copie
}
function lancer(juge, args, copie) {
  const options = ['--import', './scripts/ts-loader.mjs', juge, ...args.split(' ').filter(Boolean), `--racine=${copie}`]
  const debut = Date.now()
  const x = spawnSync(process.execPath, options, { cwd: RACINE, encoding: 'utf8', timeout: 180_000, maxBuffer: 16 * 1024 * 1024, env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' } })
  return { code: x.status ?? (x.error ? 124 : 128), sortie: `${x.stdout ?? ''}\n${x.stderr ?? ''}`, duree_s: (Date.now() - debut) / 1000, erreur: x.error?.message ?? null }
}
function ligneVerifiee(sortie, critere) {
  const lignes = sortie.split(/\r?\n/)
  const propres = lignes.filter((l) => l.startsWith(`FAIL ${critere} — `))
  const bilan = lignes.filter((l) => / : FAIL — /.test(l)).at(-1) ?? ''
  return propres.length === 1 && bilan.split(' — ')[1]?.split(/,\s*/).includes(critere) ? propres[0] : null
}
function remplacer(copie, mutation) {
  const cible = path.join(copie, mutation.fichier)
  const original = fs.readFileSync(cible, 'utf8')
  const n = original.split(mutation.avant).length - 1
  if (n !== 1 || mutation.avant === mutation.apres) throw new Error(`${mutation.critere} : ${mutation.fichier}, avant trouvé ${n} fois ou remplacement identique`)
  fs.writeFileSync(cible, original.replace(mutation.avant, mutation.apres))
  return () => fs.writeFileSync(cible, original)
}
function ecrireRapports(resultats, problemes) {
  fs.mkdirSync(PREUVES, { recursive: true })
  fs.writeFileSync(path.join(PREUVES, 'mutations.json'), JSON.stringify({ mutations: resultats }, null, 2) + '\n')
  const lignes = ['# Mutations de 026-099', '', ...problemes.map((p) => `ÉCHEC — ${p}`), ...resultats.map((r) => `- ${r.critere} · ${r.juge} · ${r.description} · ${r.extrait}`)]
  fs.writeFileSync(path.join(PREUVES, 'mutations.md'), lignes.join('\n') + '\n')
}

const groupes = new Map()
async function parallele() {
  const cles = Object.keys(J).filter((k) => jouees.some((x) => x.juge === J[k]))
  const poids = Object.fromEntries(cles.map((k) => [k, jouees.filter((x) => x.juge === J[k]).length * ({ fa: 12, dl: 8, mv: 4 }[k] ?? 1)]))
  cles.sort((a, b) => poids[b] - poids[a])
  fs.mkdirSync(TRAVAIL, { recursive: true }); fs.mkdirSync(PREUVES, { recursive: true }); fs.rmSync(path.join(PREUVES, 'echec.log'), { force: true })
  const file = [...cles]
  const FAIT = {}
  const lancerEnfant = (k) => new Promise((fin) => {
    const e = spawn(process.execPath, [fileURLToPath(import.meta.url), `--enfant=${k}`, ...(garder ? ['--garder'] : [])], { cwd: RACINE, env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' }, windowsHide: true })
    let tampon = ''
    const sortir = (d) => { tampon += d; let i; while ((i = tampon.indexOf('\n')) >= 0) { console.log(`[${k}] ${tampon.slice(0, i)}`); tampon = tampon.slice(i + 1) } }
    e.stdout.on('data', sortir); e.stderr.on('data', sortir)
    e.on('close', (code) => { if (tampon) console.log(`[${k}] ${tampon}`); FAIT[k] = code; fin() })
  })
  const ouvriers = Array.from({ length: Math.min(3, cles.length) }, async () => { while (file.length) await lancerEnfant(file.shift()) })
  await Promise.all(ouvriers)
  for (const k of cles) {
    let part = null
    try { part = JSON.parse(fs.readFileSync(path.join(TRAVAIL, `partiel-${k}.json`), 'utf8')) } catch { problemes.push(`témoin ${k} : aucun résultat rendu par le passage du juge (code ${FAIT[k]})`) }
    if (part) { resultats.push(...part.resultats); problemes.push(...part.problemes) }
  }
  ecrireRapports(resultats, problemes)
  if (!garder) fs.rmSync(TRAVAIL, { recursive: true, force: true })
}
if (optionsCli.includes('--valider')) {
  let erreurs = 0
  for (const x of mutations) {
    try {
      const n = fs.readFileSync(path.join(RACINE, x.fichier), 'utf8').split(x.avant).length - 1
      if (n !== 1 || x.avant === x.apres) { console.log(`${x.critere} ${x.description} : avant ${n} fois${x.avant === x.apres ? ', remplacement identique' : ''}`); erreurs++ }
    } catch (e) { console.log(`${x.critere} ${x.description} : ${e.message}`); erreurs++ }
  }
  console.log(`ancres : ${mutations.length - erreurs}/${mutations.length}`)
  process.exit(erreurs ? 1 : 0)
}
const jouees = mutations.filter((x) => (!seul || x.critere === seul) && (!enfant || x.juge === J[enfant]) && (!jugesChoisis || jugesChoisis.some((k) => J[k] === x.juge)))
for (const x of jouees) {
  const cle = `${x.juge} ${x.args}`
  if (!groupes.has(cle)) groupes.set(cle, [])
  groupes.get(cle).push(x)
}
const resultats = [], problemes = []
const noter = (r, pb) => { if (enfant) { fs.mkdirSync(TRAVAIL, { recursive: true }); fs.writeFileSync(path.join(TRAVAIL, `partiel-${enfant}.json`), JSON.stringify({ resultats: r, problemes: pb })) } else ecrireRapports(r, pb) }
if (!enfant && (seul || sequentiel || new Set(jouees.map((x) => x.juge)).size < 2)) noter(resultats, problemes)
if (!enfant && !seul && !sequentiel && new Set(jouees.map((x) => x.juge)).size > 1) await parallele()
else try {
  for (const [groupe, liste] of groupes) {
    const premier = liste[0]
    const copie = preparation(groupe)
    const temoin = lancer(premier.juge, premier.args, copie)
    console.log(`TÉMOIN ${groupe} : ${temoin.code} (${temoin.duree_s.toFixed(1)} s)`)
    if (temoin.code !== 0) { problemes.push(`témoin ${groupe} : code ${temoin.code} — ${temoin.sortie.trim().split('\n').at(-1)}`); break }
    for (const x of liste) {
      let restaurer
      try {
        restaurer = remplacer(copie, x)
        const r = lancer(x.juge, x.args, copie)
        const extrait = ligneVerifiee(r.sortie, x.critere)
        console.log(`${x.critere} ${x.description} : ${r.code} (${r.duree_s.toFixed(1)} s)${extrait ? ` — ${extrait}` : ''}`)
        if (r.code === 0 || !extrait || r.erreur) { fs.appendFileSync(path.join(PREUVES, 'echec.log'), `\n===== ${x.critere} ${x.description}\n${r.sortie}`); problemes.push(`${x.critere} ${x.description} : code ${r.code}, ${r.erreur ?? 'critère non attrapé'} — ${r.sortie.trim().split('\n').slice(-3).join(' | ')}`); noter(resultats, problemes); continue }
        const commande = `node --import ./scripts/ts-loader.mjs ${x.juge}${x.args ? ` ${x.args}` : ''} --racine={racine}`
        resultats.push({ juge: x.juge, commande, fichier: x.fichier, avant: x.avant, apres: x.apres, critere: x.critere, extrait, duree_s: r.duree_s, description: x.description })
        noter(resultats, problemes)
      } catch (e) { problemes.push(`${x.critere} ${x.description} : ${e.message}`); continue }
      finally { if (restaurer) restaurer() }
    }
    if (!garder) fs.rmSync(copie, { recursive: true, force: true })
    if (problemes.some((x) => x.startsWith('témoin '))) break
  }
} finally {
  if (!enfant && !(!seul && !sequentiel && new Set(jouees.map((x) => x.juge)).size > 1)) { ecrireRapports(resultats, problemes); if (!garder) fs.rmSync(TRAVAIL, { recursive: true, force: true }) }
  else if (enfant) noter(resultats, problemes)
}
console.log(`juges-026-envoi-mutations${enfant ? ` (${enfant})` : ''} : ${problemes.length ? 'FAIL' : 'PASS'} — ${resultats.length}/${jouees.length} mutation(s) attrapée(s)${problemes.length ? ` ; ${problemes[0]}` : ''}`)
process.exit(problemes.length ? 1 : 0)
