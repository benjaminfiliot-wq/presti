// 036-038 — l'essai du palier « réel » sur DEUX comptes de test FICTIFS, en base, par la session principale (l'hôte d'agents n'a pas la base).
// Jamais un vrai compte ; un seul destinataire : delivered@resend.dev. Trois temps, chacun relançable :
//   node .orchestre/preuves/036-038/essai-compte-test.mjs preparer   → 2 comptes (Studio, Signature), leurs réglages au réel, 1 demande et 1 carte chacun
//   (le clic « Valider » de la carte Studio, puis l'exécution de presti-dep-envoi : voir reel.md § « L'essai en base »)
//   node .orchestre/preuves/036-038/essai-compte-test.mjs verifier   → les deux cartes « Fait : … », la trace dans la conversation, et rien d'autre
//   node .orchestre/preuves/036-038/essai-compte-test.mjs nettoyer   → tout est effacé (comptes, réglages, demandes, cartes, messages, utilisateurs)
// Prérequis : 0193 et 0194 posées ; .env.local avec NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY (jamais affichés).
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(fs.readFileSync(path.resolve('.env.local'), 'utf8').split(/\r?\n/).filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^"|"$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const ETAT = path.resolve('.orchestre/preuves/036-038/essai-compte-test.etat.json')
const DEST = 'delivered@resend.dev'
const lireEtat = () => (fs.existsSync(ETAT) ? JSON.parse(fs.readFileSync(ETAT, 'utf8')) : null)
const ko = (m, e) => { console.error('ÉCHEC — ' + m + (e ? ' : ' + (e.message || JSON.stringify(e)) : '')); process.exit(1) }

async function preparer() {
  if (lireEtat()) ko('un essai est déjà préparé : « verifier » ou « nettoyer » d’abord')
  const { data: fondateur, error: ef } = await sb.from('artisans').select('id').eq('is_founder', true).limit(1).maybeSingle()
  if (ef || !fondateur) ko('compte fondateur introuvable (il pose le palier réel, 0193)', ef)
  const etat = { comptes: [], cree_le: new Date().toISOString() }
  for (const [offre, nom] of [['studio', 'Exemple Menuiserie Essai Réel'], ['signature', 'Exemple Plomberie Essai Réel']]) {
    const courriel = `essai-reel-036038-${offre}-${Date.now()}@example.com`
    const { data: u, error: eu } = await sb.auth.admin.createUser({ email: courriel, email_confirm: true })
    if (eu) ko('utilisateur de test', eu)
    const id = u.user.id
    etat.comptes.push({ offre, id }); fs.writeFileSync(ETAT, JSON.stringify(etat, null, 1)) // le nettoyage sait toujours quoi effacer
    const { error: ea } = await sb.from('artisans').upsert({ id, email: courriel, nom, plan: offre })
    if (ea) ko('compte artisan de test', ea)
    // 0193 : une ligne naît en simulation ; le réel se pose par un acteur fondateur. « tous » puis le département, comme en production.
    for (const dep of ['tous', 'accueil']) {
      const { error: e1 } = await sb.from('departements_reglages').upsert({ artisan_id: id, departement: dep, palier: 'simulation', en_marche: false }, { onConflict: 'artisan_id,departement' })
      const { error: e2 } = await sb.from('departements_reglages').update({ palier: 'reel', en_marche: true, acteur_id: fondateur.id }).eq('artisan_id', id).eq('departement', dep)
      if (e1 || e2) ko('réglage ' + dep, e1 || e2)
    }
    const { data: lead, error: el } = await sb.from('leads').insert({ artisan_id: id, nom_prospect: 'Exemple Client Essai', contact: DEST, canal: 'formulaire', message: 'Exemple. Une demande fictive pour l’essai du palier réel.', statut: 'nouveau' }).select('id').single()
    if (el) ko('demande de test', el)
    const pilote = offre === 'signature'
    const { data: carte, error: ec } = await sb.from('assistant_actions').insert({
      artisan_id: id, conversation_id: lead.id, tour: 1, outil: 'reponse_prospect', mode: 'confirmation', statut: 'en_attente', titre: 'Répondre à une nouvelle demande',
      entrees: { type_action: 'reponse_prospect', canal: 'email', objet_id: lead.id, effet: 'ecrire_carte', palier: 'reel', envoi: pilote ? 'pilote' : 'au_clic',
        pilote: pilote ? { envoyer_apres: new Date(Date.now() + 10 * 60000).toISOString(), capacite: 'plateforme.ia.auto', opt_in: null } : null, motif_clic: pilote ? null : 'offre_studio' },
      apercu: { brouillon: { objet: 'Votre demande', texte: 'Bonjour, merci pour votre demande. Je peux passer voir le chantier cette semaine : dites-moi quel moment vous arrange.' }, canal: 'email', pilote_en_reel: false, brouillon_a_rediger: false },
      objet_type: 'conversation', objet_id: lead.id, expire_le: new Date(Date.now() + 7 * 86400000).toISOString(), origine: 'agent', departement: 'accueil',
      motif: 'Une nouvelle demande est arrivée sur votre page ; essai 036-038 du palier réel.', sources: [{ fait: 'essai', source: '036-038:essai-compte-test' }], cle: 'essai-036038:' + offre + ':' + lead.id,
    }).select('id').single()
    if (ec) ko('carte de test', ec)
    Object.assign(etat.comptes[etat.comptes.length - 1], { lead: lead.id, carte: carte.id }); fs.writeFileSync(ETAT, JSON.stringify(etat, null, 1))
  }
  console.log('PRÉPARÉ — Studio : carte ' + etat.comptes[0].carte + ' (attend le clic) ; Signature : carte ' + etat.comptes[1].carte + ' (part seule après 10 minutes).')
  console.log('Clic « Valider » de la carte Studio : la transition de la boîte (en_attente → en_cours), puis exécuter presti-dep-envoi (reel.md).')
}

async function cliquer() { // la MÊME réclamation que app/api/assistant/agents/route.ts (POST, decision « valider »), faute de session de navigateur
  const e = lireEtat() || ko('rien de préparé'); const s = e.comptes.find((c) => c.offre === 'studio')
  const { data, error } = await sb.from('assistant_actions').update({ statut: 'en_cours', maj_le: new Date().toISOString() }).eq('id', s.carte).eq('artisan_id', s.id).eq('origine', 'agent').eq('statut', 'en_attente').gt('expire_le', new Date().toISOString()).select('id')
  if (error || data.length !== 1) ko('clic « Valider »', error || 'aucune carte à valider')
  console.log('CLIQUÉ — carte Studio ' + s.carte + ' en_cours.')
}

async function verifier() {
  const e = lireEtat() || ko('rien de préparé')
  let vert = true
  for (const c of e.comptes) {
    const { data: carte } = await sb.from('assistant_actions').select('statut, resultat_resume').eq('id', c.carte).eq('artisan_id', c.id).maybeSingle()
    const { data: msgs } = await sb.from('messages').select('type, sens').eq('lead_id', c.lead).eq('sens', 'out')
    const ok = carte && carte.statut === 'executee' && /^Fait : /.test(carte.resultat_resume || '') && (msgs || []).length === 1
    vert = vert && ok
    console.log((ok ? 'OK   ' : 'FAIL ') + c.offre + ' : carte ' + (carte ? carte.statut + ' — ' + carte.resultat_resume : 'absente') + ' ; messages sortants ' + (msgs || []).length + ' (attendu : 1)')
  }
  console.log(vert ? 'ESSAI VERT' : 'ESSAI ROUGE'); if (!vert) process.exitCode = 1
}

async function nettoyer() {
  const e = lireEtat(); if (!e) { console.log('rien à nettoyer'); return }
  for (const c of e.comptes) {
    if (c.lead) await sb.from('messages').delete().eq('lead_id', c.lead)
    await sb.from('assistant_actions').delete().eq('artisan_id', c.id)
    await sb.from('leads').delete().eq('artisan_id', c.id)
    await sb.from('departements_reglages').delete().eq('artisan_id', c.id)
    await sb.from('artisans').delete().eq('id', c.id)
    const { error } = await sb.auth.admin.deleteUser(c.id); if (error) console.error('utilisateur ' + c.id + ' : ' + error.message)
  }
  fs.unlinkSync(ETAT); console.log('NETTOYÉ — ' + e.comptes.length + ' compte(s) de test effacé(s).')
}

const quoi = process.argv[2]
await ({ preparer, cliquer, verifier, nettoyer }[quoi] || (() => ko('usage : preparer | cliquer | verifier | nettoyer')))()
