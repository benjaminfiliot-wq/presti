// Cerveau (036-030, 036-034, 036-036) : les cartes de l'OMBRE. Pour chaque département servi en palier « ombre » qui a répondu, chaque effet prévu
// qui propose une action à l'artisan devient UNE ligne assistant_actions (0157 + 0194) : à valider (en_attente, confirmation, échéance 7 jours),
// son département, son motif, la source de chaque fait, sa clé (celle du chef : idempotent, « on conflict do nothing »). Même compte exigé partout
// (multi-tenant strict). En palier « simulation », rien n'est écrit. Aucune carte sans clé, sans objet du compte ou sans source.
// Effets retenus : ecrire_carte et mettre_en_file_pilote (corps de lib-executer : Devis, Suivi, Facturation, Accueil) ; demander_brouillon (Accueil,
// Suivi : 036-034) ; 036-036 : preparer_carte (Opérations : commande, rappel ; Après-chantier : rappel d'entretien), preparer_carte_lot (Après-chantier :
// demandes d'avis), ecrire_carte_lot (Suivi : relance de devis par lot), deposer_page (Direction : le point du jour). Les notes, journaux, registres
// et battements ne sont pas des cartes. Aucun texte n'est inventé : un texte n'est recopié que s'il vient du chef (brouillon, texte fixe du code).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const UUID_DANS = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;
const CLE = /^[A-Za-z0-9_:.-]{3,120}$/;
const DEPS = ["accueil","devis","suivi","facturation","apres","operations","direction"];
const TITRES = { reponse_prospect: 'Répondre à une nouvelle demande', relance_prospect: 'Relancer une demande sans réponse', devis_brouillon: 'Préparer un devis', relance_impaye: 'Relancer une facture impayée',
  creer_devis: 'Préparer le devis de cette demande', devis_pret: 'Un devis est prêt à relire', envoyer_devis: 'Un devis est prêt à relire', relance_devis_lot: 'Relancer des devis sans réponse',
  ranger_motif_impaye: 'Ranger le motif d’un impayé', verifier_paiement: 'Vérifier un paiement annoncé', escalader_litige: 'Un impayé est contesté', traiter_impaye_a_la_main: 'Un impayé à traiter à la main',
  creer_facture: 'Une facture est prête à émettre', commande_fournisseur: 'Commander un article sous le seuil', rappel_rendez_vous: 'Rappeler un rendez-vous de demain',
  rappel_entretien: 'Proposer un rappel d’entretien', demande_avis_lot: 'Demander un avis après le chantier', point_du_matin: 'Votre point du jour' };
const MOTIFS = { demande_recue: 'Une nouvelle demande est arrivée sur votre page', relance_due: 'Une demande attend une relance', devis_a_preparer: 'Un devis est à préparer', facture_a_emettre: 'Une facture est à émettre',
  impaye_echu: 'Une facture est échue sans paiement', chantier_termine: 'Un chantier est terminé', rendez_vous_a_poser: 'Un rendez-vous est à poser', stock_sous_le_seuil: 'Un article est sous son seuil d’alerte', page_du_matin: 'Le point du matin' };
const OBJET_SOURCE = { demande_recue: 'leads:', relance_due: 'leads:', devis_a_preparer: 'devis:', impaye_echu: 'factures:', facture_a_emettre: 'devis:', chantier_termine: 'chantiers:', stock_sous_le_seuil: 'materiaux:', page_du_matin: 'artisans:' };
const aig = $('Aiguiller').all().map((x) => x.json);
const aucun = aig.find((x) => x && x.contrat === 'aucun') || {};
const routes = aucun.routes_ids || {};
// 036-036 : le jour férié lu sur calendrier.api.gouv.fr (null = non lu : rien n'est affirmé ; false = jour ouvré).
const ferie = aucun.jour_ferie === undefined ? null : aucun.jour_ferie;
const SOURCE_FERIES = 'calendrier.api.gouv.fr/jours-feries/metropole.json';
const PARTENT = ['suivi', 'facturation', 'operations'];
const issue = (nom) => { const n = $(nom); if (!n.isExecuted) return null; const sans = (x) => !x || typeof x.contrat !== 'string'; const a = n.all(0).map((x) => x.json), b = n.all(1).map((x) => x.json); return { ok: a.filter((x) => !sans(x)), ko: a.filter(sans).concat(b.filter(sans)) }; };
const expire = new Date(Date.now() + 7 * 86400000).toISOString();
const lignes = [], vues = new Set(), objetsVus = new Set();
const BROUILLON = { accueil: 'reponse_prospect', suivi: 'relance_prospect' };
const PAR_EFFET_TYPE = { deposer_page: 'page_du_matin', preparer_carte_lot: 'chantier_termine' };
const txt = (v, n) => (typeof v === 'string' && v.trim() ? v.slice(0, n) : null);
for (const dep of DEPS) { const r = issue('Appeler presti-dep-' + dep); if (!r) continue;
  for (const x of r.ok) {
    const lot = Object.values(routes).find((l) => l.departement === dep && typeof x.cle_idempotence === 'string' && x.cle_idempotence.startsWith('dep:' + dep + ':' + l.artisan_id.slice(24) + ':'));
    if (!lot || lot.palier !== 'ombre') continue;
    const effets = (Array.isArray(x.effets_prevus) ? x.effets_prevus : []).filter((e) => e && typeof e === 'object');
    const ordonnes = effets.filter((e) => e.effet !== 'demander_brouillon').concat(effets.filter((e) => e.effet === 'demander_brouillon'));
    for (const e of ordonnes) {
      let k = null, details = null;
      if ((e.effet === 'ecrire_carte' || e.effet === 'mettre_en_file_pilote') && e.corps && typeof e.corps === 'object') k = e.corps;
      // 036-034 : une demande SANS proposition ne donne qu'un « demander_brouillon » ; en ombre, la carte est la seule trace, sans texte inventé.
      else if (e.effet === 'demander_brouillon' && BROUILLON[dep] && e.objet_type === 'demande') k = { organisation_id: e.organisation_id, cle: e.cle, type_action: BROUILLON[dep], objet_id: e.objet_id, canal: null, brouillon: null };
      // 036-036 : les cartes que les chefs Opérations, Après-chantier, Suivi (lot) et Direction préparent eux-mêmes.
      else if (['preparer_carte', 'preparer_carte_lot', 'ecrire_carte_lot', 'deposer_page'].includes(e.effet)) {
        const type = e.effet === 'deposer_page' ? 'point_du_matin' : String(e.type_action || e.type || '');
        const ref = [e.objet_id, e.chantier_id, e.article_id, e.facture_id, e.devis_id, e.rendez_vous].find((v) => UUID.test(String(v))) || (String(e.cle || '').match(UUID_DANS) || [])[0] || null;
        k = { organisation_id: e.organisation_id, cle: e.cle, type_action: type, objet_id: ref, canal: typeof e.canal === 'string' ? e.canal : null,
          brouillon: txt(e.texte, 1700) ? { objet: null, texte: txt(e.texte, 1700) } : null, sans_objet_id: !ref };
        details = { effet: e.effet, quantite: typeof e.quantite === 'number' ? e.quantite : null, a_completer: Array.isArray(e.a_completer) ? e.a_completer.slice(0, 10).map((v) => String(v).slice(0, 40)) : null,
          date_proposee: txt(e.date_proposee, 10), destinataires: Array.isArray(e.destinataires) ? e.destinataires.length : null, exclus: Array.isArray(e.exclus) ? e.exclus.length : null,
          envoyer_a: txt(e.envoyer_a, 30), jour: txt(e.jour, 10), destination: txt(e.destination, 40), part_seul: e.part_seul === true };
      }
      if (!k) continue;
      if (k.organisation_id !== lot.artisan_id || !CLE.test(String(k.cle)) || vues.has(lot.artisan_id + ':' + k.cle)) continue;
      // L'objet de la carte doit être celui d'un événement routé de CE compte ; une carte de lot ou de page reprend l'événement qui l'a fait naître.
      let objet = UUID.test(String(k.objet_id)) ? lot.objets.find((o) => o.objet_id === k.objet_id) : null;
      if (!objet && k.sans_objet_id) objet = lot.objets.find((o) => o.type === (PAR_EFFET_TYPE[details && details.effet] || '')) || (lot.objets.length === 1 ? lot.objets[0] : null);
      if (!objet) continue;
      const parObjet = lot.artisan_id + ':' + dep + ':' + (objet.objet_id || objet.id);
      if (e.effet === 'demander_brouillon' && objetsVus.has(parObjet)) continue;
      vues.add(lot.artisan_id + ':' + k.cle); objetsVus.add(parObjet);
      const outil = /^[a-z_]{2,60}$/.test(String(k.type_action)) ? k.type_action : 'action_agent';
      const brouillon = k.brouillon && typeof k.brouillon === 'object' ? { objet: typeof k.brouillon.objet === 'string' ? k.brouillon.objet.slice(0, 120) : null, texte: typeof k.brouillon.texte === 'string' ? k.brouillon.texte.slice(0, 1700) : null } : null;
      const sources = [
        { fait: 'evenement', source: 'evenements_metier:' + objet.id },
        { fait: 'objet', source: (OBJET_SOURCE[objet.type] || 'objet:') + (objet.objet_id || lot.artisan_id) },
        { fait: 'palier', source: 'departements_reglages:' + lot.artisan_id + ':' + dep + ':ombre' },
      ];
      if (e.effet !== 'ecrire_carte' && e.effet !== 'mettre_en_file_pilote') sources.push({ fait: 'decision', source: 'presti-dep-' + dep + ':' + k.cle });
      if (brouillon && brouillon.texte) sources.push({ fait: 'brouillon', source: 'presti-dep-' + dep + ':' + k.cle });
      let suffixe = '';
      if (PARTENT.includes(dep) && ferie) { sources.push({ fait: 'jour_ferie', source: SOURCE_FERIES + ':' + ferie.jour }); suffixe = ' ; aujourd’hui est férié (' + ferie.nom + ') : au réel, rien ne partirait avant le prochain jour ouvré'; }
      else if (PARTENT.includes(dep) && ferie === false) sources.push({ fait: 'jour_ouvre', source: SOURCE_FERIES });
      if (dep === 'devis') suffixe += ' ; les montants sont à relire dans l’app (n8n ne recopie aucun prix)';
      lignes.push({ artisan_id: lot.artisan_id, conversation_id: objet.id, tour: 1, outil: outil, mode: 'confirmation', statut: 'en_attente',
        titre: (TITRES[outil] || 'Action préparée par le département ' + dep).slice(0, 200),
        entrees: { type_action: outil, canal: typeof k.canal === 'string' ? k.canal : null, objet_id: k.objet_id || null, effet: e.effet },
        apercu: Object.assign({ brouillon: brouillon, canal: typeof k.canal === 'string' ? k.canal : null, pilote_en_reel: e.effet === 'mettre_en_file_pilote', brouillon_a_rediger: e.effet === 'demander_brouillon' }, details ? { details: details } : {}),
        objet_type: ['demande_recue', 'relance_due'].includes(objet.type) ? 'conversation' : null, objet_id: ['demande_recue', 'relance_due'].includes(objet.type) ? objet.objet_id : null,
        expire_le: expire, origine: 'agent', departement: dep,
        motif: ((MOTIFS[objet.type] || 'Un événement est à traiter') + ' ; préparé en mode ombre, rien n’est parti' + (e.effet === 'mettre_en_file_pilote' ? ' (au réel, le pilote l’enverrait après 10 minutes)' : e.effet === 'demander_brouillon' ? ' ; la réponse reste à rédiger (au réel, un brouillon serait préparé)' : '') + suffixe + '.').slice(0, 300),
        sources: sources, cle: k.cle });
    } } }
return [{ json: { lignes: lignes.slice(0, 200) } }];
