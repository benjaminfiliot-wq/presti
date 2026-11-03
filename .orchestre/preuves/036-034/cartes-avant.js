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
const lignes = [], vues = new Set();
for (const dep of DEPS) { const r = issue('Appeler presti-dep-' + dep); if (!r) continue;
  for (const x of r.ok) {
    const lot = Object.values(routes).find((l) => l.departement === dep && typeof x.cle_idempotence === 'string' && x.cle_idempotence.startsWith('dep:' + dep + ':' + l.artisan_id.slice(24) + ':'));
    if (!lot || lot.palier !== 'ombre') continue;
    for (const e of (Array.isArray(x.effets_prevus) ? x.effets_prevus : [])) {
      if (!e || (e.effet !== 'ecrire_carte' && e.effet !== 'mettre_en_file_pilote') || !e.corps || typeof e.corps !== 'object') continue;
      const k = e.corps;
      if (k.organisation_id !== lot.artisan_id || !CLE.test(String(k.cle)) || vues.has(lot.artisan_id + ':' + k.cle)) continue;
      const objet = UUID.test(String(k.objet_id)) ? lot.objets.find((o) => o.objet_id === k.objet_id) : null;
      if (!objet) continue;
      vues.add(lot.artisan_id + ':' + k.cle);
      const outil = /^[a-z_]{2,60}$/.test(String(k.type_action)) ? k.type_action : 'action_agent';
      const brouillon = k.brouillon && typeof k.brouillon === 'object' ? { objet: typeof k.brouillon.objet === 'string' ? k.brouillon.objet.slice(0, 120) : null, texte: typeof k.brouillon.texte === 'string' ? k.brouillon.texte.slice(0, 1700) : null } : null;
      const sources = [
        { fait: 'evenement', source: 'evenements_metier:' + objet.id },
        { fait: 'objet', source: (objet.type === 'demande_recue' ? 'leads:' : 'objet:') + k.objet_id },
        { fait: 'palier', source: 'departements_reglages:' + lot.artisan_id + ':' + dep + ':ombre' },
      ];
      if (brouillon && brouillon.texte) sources.push({ fait: 'brouillon', source: 'presti-dep-' + dep + ':' + k.cle });
      lignes.push({ artisan_id: lot.artisan_id, conversation_id: objet.id, tour: 1, outil: outil, mode: 'confirmation', statut: 'en_attente',
        titre: (TITRES[outil] || 'Action préparée par le département ' + dep).slice(0, 200),
        entrees: { type_action: outil, canal: typeof k.canal === 'string' ? k.canal : null, objet_id: k.objet_id, effet: e.effet },
        apercu: { brouillon: brouillon, canal: typeof k.canal === 'string' ? k.canal : null, pilote_en_reel: e.effet === 'mettre_en_file_pilote' },
        objet_type: objet.type === 'demande_recue' ? 'conversation' : null, objet_id: objet.type === 'demande_recue' ? k.objet_id : null,
        expire_le: expire, origine: 'agent', departement: dep,
        motif: ((MOTIFS[objet.type] || 'Un événement est à traiter') + ' ; préparé en mode ombre, rien n’est parti' + (e.effet === 'mettre_en_file_pilote' ? ' (au réel, le pilote l’enverrait après 10 minutes)' : '') + '.').slice(0, 300),
        sources: sources, cle: k.cle });
    } } }
return [{ json: { lignes: lignes.slice(0, 200) } }];
