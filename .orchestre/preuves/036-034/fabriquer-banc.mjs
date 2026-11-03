// 036-034 : fabrique le code des trois nœuds ajoutés à presti-banc-cerveau. Le nœud « Cartes de l'ombre » embarque le code EXACT de
// « Préparer les cartes de l’ombre » lu dans l'export publié de presti-cerveau (cerveau-apres.workflow.json). Usage : node fabriquer-banc.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const wf = JSON.parse(readFileSync(new URL('./cerveau-final.workflow.json', import.meta.url), 'utf8'));
const CODE = wf.nodes.find((x) => x.name === 'Préparer les cartes de l’ombre').parameters.jsCode;

const COMPTE = '00000000-0000-4000-8000-0000000000c3';
const enveloppe = { contrat: 'presti-dep-accueil@1', organisation_id: COMPTE, simulation: true, cle_idempotence: 'dep:accueil:0000000000c3:2026-11-03T2004',
  trace: { execution_parent: 'presti-banc-cerveau:2026-11-03T2004', declencheur: 'presti-banc-cerveau', tentative: 0 },
  config: { nom_artisan: 'Exemple. Compte d’essai-Démo', offre: 'studio', mode_reponse: 'assistee', capacites: ['canaux.email', 'relances', 'factures.relances', 'assistant'],
    pilote: { drapeau: true, actif: false, types: {} }, parties_depuis_24h: 0, mots_escalade_artisan: [], fournisseurs: [],
    horaires: { jours_permis: [1, 2, 3, 4, 5, 6, 7], heures_permises: { debut: '00:00', fin: '23:59' } }, plafond_jour: 20,
    qualification: { grille: [{ critere: 'urgence=urgent', poids: 40 }, { critere: 'canal=formulaire', poids: 25 }, { critere: 'canal=site', poids: 25 }, { critere: 'canal=telephone', poids: 15 }, { critere: 'canal=email', poids: 15 }], seuils: { haute: 60, normale: 30 }, delais_cibles_min: { haute: 15, normale: 60, a_revoir: 240 } },
    interrupteur_general: true, interrupteur_departement: true },
  donnees: { demandes: [{ id: '00000000-0000-4000-8000-c00000000001', canal: 'page_p', recu_le: '2026-11-03T19:03:30.000Z',
    message: 'Exemple. Bonjour, je voudrais faire remplacer mon ballon d’eau chaude, il chauffe mal.', champs: { canal: 'formulaire', type_chantier: 'Chauffe-eau', photo_jointe: false },
    empreinte_contact: null, client_existant: false, honeypot: false, photo: null, proposition: null, destinataire: { opposition: null, consentement_sms: null } }],
    empreintes_connues: [], cles_existantes: [], maintenant: '2026-11-03T20:04:00.000+01:00' } };

const cas = `// presti-banc-cerveau (036-034) : le cas de l'essai réel du 03/11, rejoué sur un compte FICTIF (« Exemple. »). UNE demande, composée
// EXACTEMENT comme « Composer les comptes » et « Composer les pages » de presti-cerveau la composent pour une vraie demande : aucune
// proposition, ni empreinte ni opposition connues (null). C'est la forme qui ne donnait aucune carte. Ce nœud ajoute son enveloppe.
const ENVELOPPE = ${JSON.stringify(enveloppe)};
return $input.all().filter((x) => x.json && x.json.contrat === 'presti-dep-accueil@1').concat([{ json: ENVELOPPE }]);`;

const cartes = `// presti-banc-cerveau (036-034) : rejoue le code EXACT du nœud « Préparer les cartes de l’ombre » de presti-cerveau (copie tenue égale
// par .orchestre/preuves/036-034/banc-egal.mjs) sur les VRAIES sorties du chef ci-dessus. Paliers : compte de l'essai (…c3) et compte
// Studio (…a1) en « ombre », compte Signature (…b2) en « simulation » (rien ne doit s'écrire). Événements fictifs. Rien n'est écrit ici.
const ENVS = $('Cas de l’essai réel : une demande composée par le Cerveau').all().map((x) => x.json).filter((e) => e && e.contrat === 'presti-dep-accueil@1');
const PALIERS = { '00000000-0000-4000-8000-0000000000a1': 'ombre', '00000000-0000-4000-8000-0000000000b2': 'simulation', '00000000-0000-4000-8000-0000000000c3': 'ombre' };
const evt = (d) => 'eeeeeeee-' + d.slice(9);
const routes_ids = {};
for (const e of ENVS) routes_ids[e.organisation_id + '|accueil'] = { artisan_id: e.organisation_id, departement: 'accueil', palier: PALIERS[e.organisation_id] || 'simulation',
  ids: e.donnees.demandes.map((d) => evt(d.id)), objets: e.donnees.demandes.map((d) => ({ id: evt(d.id), type: 'demande_recue', objet_id: d.id })) };
const SORTIES = { 'Aiguiller': [[{ json: { contrat: 'aucun', rejets: [], sautes: [], routes_ids: routes_ids } }]], 'Appeler presti-dep-accueil': [$('Appeler presti-dep-accueil').all(0), []] };
const faux = (nom) => SORTIES[nom] ? { isExecuted: true, all: (b) => SORTIES[nom][b || 0] || [], first: () => (SORTIES[nom][0] || [])[0] } : { isExecuted: false, all: () => [], first: () => undefined };
const sortie = (($) => {
// ─── début de la copie de presti-cerveau « Préparer les cartes de l’ombre » ───
${CODE}
// ─── fin de la copie ───
})(faux);
const lignes = sortie[0].json.lignes;
const par = {}; for (const l of lignes) { const k = l.artisan_id.slice(24); par[k] = par[k] || { cartes: 0, brouillons_a_rediger: 0 }; par[k].cartes++; if (l.apercu.brouillon_a_rediger) par[k].brouillons_a_rediger++; }
const essai = lignes.filter((l) => l.artisan_id === '00000000-0000-4000-8000-0000000000c3');
const chefEssai = $('Appeler presti-dep-accueil').all(0).map((x) => x.json).find((s) => s && s.cle_idempotence === 'dep:accueil:0000000000c3:2026-11-03T2004') || null;
const conforme = (l) => l.origine === 'agent' && l.mode === 'confirmation' && !!l.expire_le && l.statut === 'en_attente' && l.departement === 'accueil' && typeof l.motif === 'string' && l.motif.length <= 300 && Array.isArray(l.sources) && l.sources.length >= 1 && /^[A-Za-z0-9_:.-]{3,120}$/.test(l.cle);
const verdict = essai.length === 1 && conforme(essai[0]) && !par['0000000000b2'] ? 'vert' : 'rouge';
return [{ json: { verdict: verdict, statut_chef_essai: chefEssai ? chefEssai.statut : null, effets_chef_essai: chefEssai ? chefEssai.effets_prevus.map((e) => e.effet) : [], par_compte: par, lignes: lignes } }];`;

const requete = `// presti-banc-cerveau (036-034) : la requête d'insertion EXACTE que « Écrire les cartes (ombre) » de presti-cerveau enverrait pour ces
// lignes, MONTRÉE et jamais envoyée (aucun compte réel : la clé étrangère artisan_id refuserait les comptes fictifs). Aucune donnée personnelle.
const s = $input.first().json;
const essai = s.lignes.filter((l) => l.artisan_id === '00000000-0000-4000-8000-0000000000c3');
return [{ json: { verdict: s.verdict, envoyee: false, methode: 'POST', url: 'https://gorcdvmueakcncsmrouo.supabase.co/rest/v1/assistant_actions?on_conflict=artisan_id,cle',
  entetes: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, lignes_au_total: s.lignes.length, par_compte: s.par_compte, statut_chef_essai: s.statut_chef_essai,
  effets_chef_essai: s.effets_chef_essai, corps_pour_le_compte_d_essai: essai } }];`;
writeFileSync(new URL('./banc-cas-essai.js', import.meta.url), cas);
writeFileSync(new URL('./banc-cartes.js', import.meta.url), cartes);
writeFileSync(new URL('./banc-requete.js', import.meta.url), requete);
console.log(cas.length, cartes.length, requete.length);
