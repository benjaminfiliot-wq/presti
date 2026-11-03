// Cerveau (036-030) : une page par compte servi (forme « page » du contrat), ses événements lus dans n8n_evenements_a_traiter (0193:425),
// dans l'ordre (survenu_le, id). Un événement « demande_recue » reçoit sa demande (leads, MÊME compte exigé) : le message, le canal, l'heure ;
// jamais le contact. Champs hors format retirés (jamais recopiés tels quels). 036-036 : les autres types reçoivent leurs faits (donnees).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const comptes = $('Composer les comptes').all().map((x) => x.json).filter((c) => c && typeof c.artisan_id === 'string');
const evs = $('Lire les événements non traités').all().map((x) => x.json).filter((e) => e && !e.error && typeof e.id === 'string');
const leads = {}; for (const l of $('Lire les demandes des événements').all().map((x) => x.json)) if (l && !l.error && typeof l.id === 'string') leads[l.id] = l;
const CANAL = { telegram: 'telegram', email: 'email' };
const demandeDe = (e) => {
  const l = e.objet_type === 'lead' ? leads[e.objet_id] : null;
  if (!l || l.artisan_id !== e.artisan_id) return null;
  const champs = {};
  if (typeof l.canal === 'string' && /^[a-z_]{1,30}$/.test(l.canal)) champs.canal = l.canal;
  if (l.urgence === 'urgent' || l.urgence === 'normal') champs.urgence = l.urgence;
  if (typeof l.type_chantier === 'string' && /^[^/@:]{1,60}$/.test(l.type_chantier)) champs.type_chantier = l.type_chantier;
  champs.photo_jointe = Array.isArray(l.photos) && l.photos.length > 0;
  return { id: l.id, canal: CANAL[l.canal] || 'page_p', recu_le: new Date(l.created_at).toISOString(), message: typeof l.message === 'string' ? l.message.slice(0, 4000) : null,
    champs: champs, empreinte_contact: null, client_existant: false, honeypot: false, photo: null, proposition: null, destinataire: { opposition: null, consentement_sms: null } };
};
const s = [];
for (const c of comptes) {
  const page = evs.filter((e) => e.artisan_id === c.artisan_id).slice(0, 50).map((e) => {
    const ev = { id: e.id, artisan_id: e.artisan_id, type: e.type, cle: e.cle, objet_type: e.objet_type || null, objet_id: UUID.test(String(e.objet_id)) ? e.objet_id : null };
    if (e.type === 'demande_recue') { const d = demandeDe(e); if (d) ev.demande = d; }
    // 036-036 : les autres départements reçoivent les FAITS de l'événement (rangés par le code de l'app ; sans texte libre, contrôle faits_sans_texte de 0185).
    else ev.donnees = e.faits && typeof e.faits === 'object' && !Array.isArray(e.faits) ? JSON.parse(JSON.stringify(e.faits)) : {};
    return ev;
  });
  s.push({ json: { artisan_id: c.artisan_id, page: 0, suivante: null, evenements: page } });
}
return s.length ? s : [{ json: { artisan_id: null, page: 0, suivante: null, evenements: [] } }];