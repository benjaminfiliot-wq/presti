// Essai de l'adaptateur de base du SAV contre une base en mémoire (rien de réel).
import { pathToFileURL } from 'node:url'
const M = await import(pathToFileURL('C:/Users/benja/Documents/presti/lib/agents/sav/repondeurClient.ts').href)

const ART = '11111111-1111-4111-8111-111111111111'
const ART2 = '22222222-2222-4222-8222-222222222222'
const ART3 = '33333333-3333-4333-8333-333333333333'
const C1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const C2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const C3 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const C4 = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const maintenant = Date.parse('2026-10-04T12:00:00Z')
const tables = {
  courriers: [
    { id: C1, fil: 'fil-1', sens: 'recu', statut: 'a_traiter', sujet: 'Ma facture', corps: 'Bonjour, où trouver ma facture ?', apercu: null, recu_le: '2026-10-03T08:00:00Z', artisan_id: ART },
    { id: C2, fil: 'fil-2', sens: 'recu', statut: 'a_traiter', sujet: 'Remboursement', corps: 'Je veux être remboursé.', apercu: null, recu_le: '2026-10-03T09:00:00Z', artisan_id: ART },
    { id: C3, fil: 'fil-3', sens: 'recu', statut: 'a_traiter', sujet: 'Salut', corps: 'Un message d\'un artisan sans commande payée.', apercu: null, recu_le: '2026-10-03T10:00:00Z', artisan_id: ART2 },
    { id: C4, fil: 'fil-4', sens: 'recu', statut: 'a_traiter', sujet: 'Sans compte', corps: 'Inconnu', apercu: null, recu_le: '2026-10-03T11:00:00Z', artisan_id: null },
  ],
  sites_commandes: [
    { id: '12345678-aaaa-4aaa-8aaa-aaaaaaaaaaaa', artisan_id: ART, paye_le: '2026-09-20T00:00:00Z', retiree_le: null, compte_supprime_le: null },
    { id: '99999999-aaaa-4aaa-8aaa-aaaaaaaaaaaa', artisan_id: ART2, paye_le: null, retiree_le: null, compte_supprime_le: null },
  ],
}
const curseurs = new Map(), decisions = [], evenements = []
function requete(table) {
  let rows = [...tables[table]]
  const q = {
    select() { return q }, eq(c, v) { rows = rows.filter(r => r[c] === v); return q },
    in(c, vs) { rows = rows.filter(r => vs.includes(r[c])); return q },
    is(c, v) { rows = rows.filter(r => (r[c] ?? null) === v); return q },
    not(c, op, v) { rows = rows.filter(r => (r[c] ?? null) !== v); return q },
    gte(c, v) { rows = rows.filter(r => r[c] >= v); return q },
    order(c, o) { rows.sort((a, b) => (a[c] < b[c] ? -1 : 1) * (o?.ascending === false ? -1 : 1)); return q },
    limit(n) { rows = rows.slice(0, n); return q },
    then(ok, ko) { return Promise.resolve({ data: rows, error: null }).then(ok, ko) },
  }
  return q
}
const base = {
  from: requete,
  async rpc(nom, a) {
    if (nom === 'acq_curseur_lire') return { data: curseurs.get(a.p_nom) ?? null, error: null }
    if (nom === 'acq_curseur_poser') { curseurs.set(a.p_nom, a.p_valeur); return { data: null, error: null } }
    if (nom === 'ops_evenement_ajouter') { evenements.push(a); return { data: 1, error: null } }
    if (nom === 'ops_decision_creer') {
      if (decisions.some(d => d.p_cle === a.p_cle)) return { data: [{ id: 'x', creee: false }], error: null }
      // les contraintes de la base (0098) : 2 ou 3 options, une seule recommandée, défaut parmi elles, échéance 1 h à 30 j, question 5-300, contexte <= 2000
      const o = a.p_options
      if (o.length < 2 || o.length > 3 || o.filter(x => x.recommandee).length !== 1 || !o.some(x => x.cle === a.p_defaut) || o.some(x => !/^[a-z_]{2,30}$/.test(x.cle) || x.libelle.length > 80)) throw new Error('ops:options')
      const ech = Date.parse(a.p_echeance) - maintenant
      if (!(ech >= 3600e3 && ech <= 30 * 86400e3)) throw new Error('ops:echeance')
      if (a.p_question.length < 5 || a.p_question.length > 300 || a.p_contexte.length > 2000) throw new Error('ops:taille')
      decisions.push({ ...a, creee_par: a.p_agent, cree_le: new Date(maintenant).toISOString() })
      return { data: [{ id: 'x', creee: true }], error: null }
    }
    if (nom === 'pilotage_decisions') return { data: decisions.map(d => ({ question: d.p_question, creee_par: d.creee_par, cree_le: d.cree_le })), error: null }
    if (nom === 'ops_decisions_tranchees') return { data: [{ cle_idempotence: 'sav:brouillon:' + C1, choix: 'approuver' }], error: null }
    return { data: null, error: { message: 'rpc inconnue ' + nom } }
  },
}
const verifie = (v, m) => { if (!v) throw new Error('ÉCHEC : ' + m); console.log('ok  ' + m) }

// travail : ce que la route de travail fait
const messages = await M.messagesATraiter(base, 20, maintenant)
verifie(messages.length === 3 && !messages.some(m => m.id === C4), 'courrier sans compte écarté, trois messages à traiter')
const aLire = []
for (const message of messages) {
  const deps = M.depsDepuisBase(base, { fil_id: message.fil, maintenant: () => maintenant })
  const code = await M.reglerEnCode(message, deps)
  if (code) {
    if (code.decision === 'escalade_benj') await M.escaladerBenj(message, code.motif ?? code.classe, deps)
    await M.marquerTraite(base, message.id)
    continue
  }
  aLire.push({ id: message.id, ...M.entreeLecteur(message.texte, deps) })
}
verifie(aLire.length === 1 && aLire[0].id === C1 && aLire[0].types.includes('facture') && !JSON.stringify(aLire[0]).includes(ART), 'seul le message de la facture va au modèle, sans identifiant de compte')
verifie(decisions.length === 1 && decisions[0].p_cle === 'sav:carte:' + C2 && decisions[0].p_defaut === 'a_traiter', 'le remboursement est une carte Attention (clé idempotente, défaut inerte)')
verifie((await M.messagesATraiter(base, 20, maintenant)).length === 1, 'les messages réglés en code ne reviennent pas (reste le message de la facture)')
verifie(evenements.length === 2 && !evenements.some(e => /Bonjour|remboursé|Salut/.test(JSON.stringify(e))), 'journal : une ligne par décision, sans contenu de message')

// brouillon : ce que la route de dépôt fait
const message = await M.messageParId(base, C1)
let deps = M.depsDepuisBase(base, { fil_id: message.fil, maintenant: () => maintenant, lecteur: async () => ({ classe: 'question_faq', type_question: 'facture', certitude: 0.9, extrait: 'où trouver ma facture', demande_sensible: false }) })
let r = await M.classerMessage(message, deps)
verifie(r.decision === 'brouillon' && r.type_question === 'facture' && r.commande_ref === 'CMD-12345678' && r.fil_id === 'fil-1', 'décision brouillon, facture, commande CMD-12345678, fil du courrier')
let echec = null
try { await M.preparerBrouillon(message, r, deps) } catch (e) { echec = e.message }
verifie(echec === 'aucun modèle approuvé', 'aucun gabarit approuvé à la livraison : le brouillon n\'est pas fabriqué')
deps = { ...deps, modeles: { sav_autre_v1: { ...M.MODELES_SAV.sav_autre_v1, approuve: true } } }
const b = await M.preparerBrouillon(message, r, deps)
verifie(b.texte.includes('CMD-12345678') && b.texte.includes('votre facture') && b.modele_id === 'sav_autre_v1', 'brouillon : gabarit « autre » rempli (sujet facture, référence)')
await deps.brouillons.deposer({ ...b, message_id: message.id, origine: r.decision })
const d = decisions.at(-1)
verifie(d.p_cle === 'sav:brouillon:' + C1 && d.p_defaut === 'attendre' && d.p_options.some(o => o.cle === 'approuver'), 'brouillon déposé dans la file : défaut « attendre », jamais un envoi par défaut')
verifie(Date.parse(d.p_echeance) - maintenant === 24 * 3600e3, 'accord individuel : 24 h')
// idempotence
await deps.brouillons.deposer({ ...b, message_id: message.id, origine: r.decision })
verifie(decisions.length === 2, 'déposer deux fois le même brouillon ne crée pas deux décisions')

// compteur réel
verifie((await M.compteurApprobations('facture', deps)) === 0, 'compteur facture à 0')
for (let i = 1; i <= 20; i++) await M.enregistrerApprobation('facture', { propose: 'a', final: 'a' }, deps)
verifie((await M.compteurApprobations('facture', deps)) === 20 && curseurs.get('sav-compteur-facture') === '20', 'compteur à 20, écrit dans la base (curseur)')
// à 20 avec un modèle de FAQ approuvé pour facture, la FAQ devient automatique
deps = { ...deps, modeles: { ...deps.modeles, sav_faq_facture_v1: { id: 'sav_faq_facture_v1', types: ['facture'], approuve: true, texte: 'Bonjour,\n{sujet} {reference}' } } }
r = await M.classerMessage(message, deps)
verifie(r.decision === 'automatique_faq', 'à 20, FAQ facture avec modèle approuvé : decision automatique_faq (la route la dépose en brouillon)')
verifie((await M.enregistrerApprobation('facture', { propose: 'a', final: 'a ' }, deps)) === 0, 'une retouche remet à 0')
verifie((await M.enregistrerApprobation('autre', { propose: 'a', final: 'a' }, deps)) === 0 && !curseurs.has('sav-compteur-autre'), 'aucun compteur pour « autre »')

// rapport
const rap = await M.rapportSav(base, maintenant + 5 * 3600e3)
verifie(rap.seuil === 20 && rap.compteurs.facture === 0 && rap.ouvertes.brouillons === 1 && rap.ouvertes.escalades === 1 && rap.ouvertes.plus_ancienne_heures === 5 && rap.tranchees_30j.approuver === 1, 'rapport : compteurs, ouvertes (1 brouillon, 1 escalade), plus ancienne 5 h, tranchées')
verifie(!JSON.stringify(rap).includes('Bonjour') && !JSON.stringify(rap).includes('facture ?'), 'rapport : aucun contenu de message')

// repli : sans lecture du modèle, gabarit fixe
const deps2 = M.depsDepuisBase(base, { fil_id: 'fil-1' })
const r2 = await M.classerMessage({ ...message, id: 'e1e1e1e1-e1e1-41e1-81e1-e1e1e1e1e1e1' }, deps2)
verifie(r2.decision === 'brouillon' && r2.classe === 'question_autre', 'sans lecture du modèle : repli en brouillon « autre »')
console.log('TOUT EST VERT')
