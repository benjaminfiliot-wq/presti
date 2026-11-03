// Cerveau (036-030) : les cartes de l'OMBRE. Pour chaque département servi en palier « ombre » qui a répondu, chaque effet prévu
// « ecrire_carte » ou « mettre_en_file_pilote » (en ombre, le pilote aussi devient une carte : rien ne part seul) devient UNE ligne
// assistant_actions (0157 + 0194) : à valider (en_attente, confirmation, échéance 7 jours), son département, son motif, la source de
// chaque fait, sa clé (celle du chef : idempotent, « on conflict do nothing »). Même compte exigé partout (multi-tenant strict). En palier
// « simulation », rien n'est écrit. Aucune carte sans clé, sans objet du compte ou sans source.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CLE = /^[A-Za-z0-9_:.-]{3,120}$/;
const DEPS = ["accueil","devis","suivi","facturation","apres","operations","direction"];
const TITRES = { reponse_prospect: 'Répondre à une nouvelle demande', relance_prospect: 'Relancer une demande sans réponse', devis_brouillon: 'Préparer un devis', relance_impaye: 'Relancer une facture impayée' };
const MOTIFS = { demande_recue: 'Une nouvelle demande est arrivée sur votre page', relance_due: 'Une demande attend une relance', devis_a_preparer: 'Un devis est à préparer', facture_a_emettre: 'Une facture est à émettre', impaye_echu: 'Une facture est échue sans paiement', chantier_termine: 'Un chantier est terminé', rendez_vous_a_poser: 'Un rendez-vous est à poser', page_du_matin: 'Le point du matin' };
const aig = $('Aiguiller').all().map((x) => x.json);
const routes = (aig.find((x) => x && x.contrat === 'aucun') || {}).routes_ids || {};
const issue = (nom) => { const n = $(nom); if (!n.isExecuted) return null; const sans = (x) => !x || typeof x.contrat !== 'string'; const a = n.all(0).map((x) => x.json), b = n.all(1).map((x) => x.json); return { ok: a.filter((x) => !sans(x)), ko: a.filter(sans).concat(b.filter(sans)) }; };
const expire = new Date(Date.now() + 7 * 86400000).toISOString();
const lignes = [], vues = new Set(), objetsVus = new Set();
const BROUILLON = { accueil: 'reponse_prospect', suivi: 'relance_prospect' };
for (const dep of DEPS) { const r = issue('Appeler presti-dep-' + dep); if (!r) continue;
  for (const x of r.ok) {
    const lot = Object.values(routes).find((l) => l.departement === dep && typeof x.cle_idempotence === 'string' && x.cle_idempotence.startsWith('dep:' + dep + ':' + l.artisan_id.slice(24) + ':'));
    if (!lot || lot.palier !== 'ombre') continue;
    // 036-034 : les cartes du chef d'abord, puis les brouillons demandés ; une seule carte par objet quand le chef en a déjà une.
    const effets = (Array.isArray(x.effets_prevus) ? x.effets_prevus : []).filter((e) => e && typeof e === 'object');
    const ordonnes = effets.filter((e) => e.effet !== 'demander_brouillon').concat(effets.filter((e) => e.effet === 'demander_brouillon'));
    for (const e of ordonnes) {
      let k = null;
      if ((e.effet === 'ecrire_carte' || e.effet === 'mettre_en_file_pilote') && e.corps && typeof e.corps === 'object') k = e.corps;
      // 036-034 : une demande SANS proposition (le cas de toute demande réelle : « Composer les pages » ne pose aucune proposition) ne
      // donne au chef qu'un « demander_brouillon » (036-003, la boîte). En ombre, aucun brouillon ne se pose dans la boîte : la carte
      // « à valider » est la seule trace de ce que l'agent aurait fait. Sans texte inventé : le brouillon reste à rédiger.
      else if (e.effet === 'demander_brouillon' && BROUILLON[dep] && e.objet_type === 'demande') k = { organisation_id: e.organisation_id, cle: e.cle, type_action: BROUILLON[dep], objet_id: e.objet_id, canal: null, brouillon: null };
      if (!k) continue;
      if (k.organisation_id !== lot.artisan_id || !CLE.test(String(k.cle)) || vues.has(lot.artisan_id + ':' + k.cle)) continue;
      const objet = UUID.test(String(k.objet_id)) ? lot.objets.find((o) => o.objet_id === k.objet_id) : null;
      if (!objet) continue;
      const parObjet = lot.artisan_id + ':' + dep + ':' + k.objet_id;
      if (e.effet === 'demander_brouillon' && objetsVus.has(parObjet)) continue;
      vues.add(lot.artisan_id + ':' + k.cle); objetsVus.add(parObjet);
      const outil = /^[a-z_]{2,60}$/.test(String(k.type_action)) ? k.type_action : 'action_agent';
      const brouillon = k.brouillon && typeof k.brouillon === 'object' ? { objet: typeof k.brouillon.objet === 'string' ? k.brouillon.objet.slice(0, 120) : null, texte: typeof k.brouillon.texte === 'string' ? k.brouillon.texte.slice(0, 1700) : null } : null;
      const sources = [
        { fait: 'evenement', source: 'evenements_metier:' + objet.id },
        { fait: 'objet', source: (objet.type === 'demande_recue' ? 'leads:' : 'objet:') + k.objet_id },
        { fait: 'palier', source: 'departements_reglages:' + lot.artisan_id + ':' + dep + ':ombre' },
      ];
      if (e.effet === 'demander_brouillon') sources.push({ fait: 'decision', source: 'presti-dep-' + dep + ':' + k.cle });
      if (brouillon && brouillon.texte) sources.push({ fait: 'brouillon', source: 'presti-dep-' + dep + ':' + k.cle });
      lignes.push({ artisan_id: lot.artisan_id, conversation_id: objet.id, tour: 1, outil: outil, mode: 'confirmation', statut: 'en_attente',
        titre: (TITRES[outil] || 'Action préparée par le département ' + dep).slice(0, 200),
        entrees: { type_action: outil, canal: typeof k.canal === 'string' ? k.canal : null, objet_id: k.objet_id, effet: e.effet },
        apercu: { brouillon: brouillon, canal: typeof k.canal === 'string' ? k.canal : null, pilote_en_reel: e.effet === 'mettre_en_file_pilote', brouillon_a_rediger: e.effet === 'demander_brouillon' },
        objet_type: objet.type === 'demande_recue' ? 'conversation' : null, objet_id: objet.type === 'demande_recue' ? k.objet_id : null,
        expire_le: expire, origine: 'agent', departement: dep,
        motif: ((MOTIFS[objet.type] || 'Un événement est à traiter') + ' ; préparé en mode ombre, rien n’est parti' + (e.effet === 'mettre_en_file_pilote' ? ' (au réel, le pilote l’enverrait après 10 minutes)' : e.effet === 'demander_brouillon' ? ' ; la réponse reste à rédiger (au réel, un brouillon serait préparé)' : '') + '.').slice(0, 300),
        sources: sources, cle: k.cle });
    } } }
return [{ json: { lignes: lignes.slice(0, 200) } }];