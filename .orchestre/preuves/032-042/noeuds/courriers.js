// presti-reponse-seule : ce qu'envoie le chemin codé quand la décision est « part seul » (app/api/leads/route.ts:473-509) — la réponse au
// prospect, au nom de l'artisan, avec la mention d'IA (lib/mentionAssistant.ts:14-17), puis l'avis « Nouveau lead » à l'artisan — et, pour
// un mot d'escalade, l'alerte à l'artisan (:383-392). Les plafonds de lib/email.ts que ce chemin passait en envoyant sont repris (:81-87).
// Code pur : rien n'est envoyé ici, rien n'est écrit. Copie figée contrôlée par scripts/reponse-seule-n8n-qa.mjs, cas par cas contre la
// vraie route. Les silences (manuelle, hors plage, limite) et le mode assisté sont des décisions sans courrier : leurs courriers relèvent
// de presti-accuse-reception et de la réponse proposée.
const MAX_PAR_DESTINATAIRE = 3;
const MAX_PAR_JOUR = 30;
const MAX_AVIS_PAR_JOUR = 50;
const EXPEDITEUR = 'contact@prestiapp.fr';
const ENTREPRISE = 'contact@prestiapp.fr';
const EST_COURRIEL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const ADRESSE_SURE = /^[A-Za-z0-9._+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
const lire = (nom) => $(nom).all().map((i) => i.json).filter((x) => x && typeof x === 'object' && typeof x.id === 'string');
const ordre = (a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const texte = (v) => (typeof v === 'string' ? v : '');
const sur = (v) => ADRESSE_SURE.test(texte(v).trim()) && !/\.invalid$/i.test(texte(v).trim());
const nettoyer = (v) => texte(v).replace(/[\r\n<>"]/g, '').trim().slice(0, 70) || 'Votre artisan';
const uneLigne = (v) => texte(v).replace(/[\r\n]+/g, ' ');
const actif = (prefs) => !prefs || typeof prefs !== 'object' || prefs.nouvelle_demande !== false;
const duJour = lire('Lire demandes du jour').sort(ordre);
const rangJour = {};
duJour.forEach((d, i) => { rangJour[d.id] = i + 1; });
const comptes = {};
lire('Lire comptes').forEach((c) => { comptes[c.id] = c; });
const demandes = {};
lire('Lire demandes').forEach((d) => { demandes[d.id] = d; });
const parAdresse = {};
lire('Lire doublons').filter((d) => typeof d.contact === 'string').sort(ordre).forEach((d) => {
  const k = d.contact.trim().toLowerCase();
  (parAdresse[k] = parAdresse[k] || []).push(d.id);
});
const sortie = [];
const decisions = $('Modele epingle').all().map((i) => i.json).filter((x) => x && x.courrier === 'decision').sort((a, b) => ordre(demandes[a.lead_id] || { created_at: '', id: a.lead_id }, demandes[b.lead_id] || { created_at: '', id: b.lead_id }));
for (const d of decisions) {
  const lead = demandes[d.lead_id];
  const artisan = lead ? comptes[lead.artisan_id] : null;
  if (!lead || !artisan) { sortie.push({ json: { courrier: 'ignore', lead_id: d.lead_id, raison: 'demande ou compte introuvable', simulation: true } }); continue; }
  const contact = texte(lead.contact).trim();
  const message = texte(lead.message);
  const nomProspect = texte(lead.nom_prospect);
  const nomArtisan = texte(artisan.nom);
  const estCourriel = EST_COURRIEL.test(contact);
  const avisDu = () => texte(artisan.email) && contact && actif(artisan.notifications) && sur(artisan.email) && rangJour[lead.id] <= MAX_AVIS_PAR_JOUR;
  const repondreA = ADRESSE_SURE.test(contact) && EST_COURRIEL.test(contact) ? contact : ENTREPRISE;
  const decision = { courrier: 'decision', lead_id: lead.id, decision: d.decision, motif: d.motif, mot: d.mot ?? null, envoi: null, avis: null, simulation: true };
  if (d.decision === 'escalade') {
    // app/api/leads/route.ts:383-392 : l'assistant se tait et l'artisan est alerté (le mot est dans le sujet : n8n lit le message).
    if (avisDu()) {
      decision.avis = 'alerte';
      sortie.push({ json: { courrier: 'avis', lead_id: lead.id, cle: 'avis:' + lead.id, simulation: true, a: texte(artisan.email).trim(), de: 'Presti <' + EXPEDITEUR + '>', repondre_a: repondreA,
        sujet: uneLigne('⚠️ Demande sensible (« ' + d.mot + ' ») — ' + (nomProspect || contact)),
        texte: 'Nouveau contact via votre page Presti — à vous de répondre.\n\nNom : ' + (nomProspect || 'non précisé') + '\nContact : ' + contact + '\nBesoin : ' + (message || 'non précisé') + '\n\nRépondez-lui depuis votre espace (Messages).' } });
    } else decision.avis = 'non_du';
  } else if (d.decision === 'part_seul') {
    const reponse = texte(d.texte_modele).trim();
    if (!reponse) { decision.envoi = 'aucune_reponse'; }
    else {
      const rang = (parAdresse[contact.toLowerCase()] || []).indexOf(lead.id) + 1;
      let partie = false;
      if (!contact) decision.envoi = 'sans_coordonnees';
      else if (!estCourriel) decision.envoi = 'pas_un_courriel';
      else if (/\.invalid$/i.test(contact)) { decision.envoi = 'adresse_de_test'; partie = true; }
      else if (!ADRESSE_SURE.test(contact)) decision.envoi = 'adresse_atypique';
      else if (!(rang >= 1 && rang <= MAX_PAR_DESTINATAIRE)) decision.envoi = 'plafond_destinataire';
      else if (!(rangJour[lead.id] <= MAX_PAR_JOUR)) decision.envoi = 'plafond_jour';
      else {
        decision.envoi = 'a_envoyer';
        partie = true;
        const nom = nomArtisan.replace(/[\r\n]+/g, ' ').trim().slice(0, 70);
        const corps = reponse;
        sortie.push({ json: { courrier: 'reponse', lead_id: lead.id, cle: 'reponse:' + lead.id, simulation: true,
          a: contact, de: nettoyer(nomArtisan.trim() || 'Votre artisan') + ' <' + EXPEDITEUR + '>', repondre_a: texte(artisan.email).trim(),
          sujet: uneLigne('Votre demande — ' + (nomArtisan.trim() || 'Votre artisan')),
          corps, de_artisan: nom ? ' de ' + nom : '',
          texte: corps + '\n\n—\nMessage rédigé et envoyé automatiquement par l’assistant' + (nom ? ' de ' + nom : '') + '.' } });
      }
      // app/api/leads/route.ts:493-509 : l'avis « Nouveau lead », avec la réponse et ce qu'il est advenu de l'e-mail au prospect.
      if (avisDu()) {
        decision.avis = 'nouveau_lead';
        const etat = !estCourriel ? 'Réponse automatique (prospect sans email — à rappeler)' : partie ? 'Réponse automatique envoyée au prospect par email' : 'Réponse automatique préparée, mais l’email au prospect N’EST PAS PARTI — recontactez-le vous-même';
        sortie.push({ json: { courrier: 'avis', lead_id: lead.id, cle: 'avis:' + lead.id, simulation: true, a: texte(artisan.email).trim(), de: 'Presti <' + EXPEDITEUR + '>', repondre_a: repondreA,
          sujet: uneLigne('Nouveau lead — ' + (nomProspect || contact)),
          texte: 'Nouveau contact via votre lien Presti.\n\nNom : ' + (nomProspect || 'non précisé') + '\nContact : ' + contact + '\nBesoin : ' + (message || 'non précisé') + '\n\n' + etat + ' :\n---\n' + reponse } });
      } else decision.avis = 'non_du';
    }
  }
  sortie.push({ json: decision });
}
return sortie;
