// presti-relances : ce qu'envoie le chemin codé quand la décision est « part seul » (app/api/cron/relances/route.ts:204-218) — la relance au
// prospect, au nom de l'artisan, avec la mention d'IA (lib/mentionAssistant.ts:14-17) — ou « prepare » (:186-203) : l'avis « Relance prête à
// valider » à l'artisan. Le texte vient du modèle (épinglé) ; sans texte, le repli de lib/ai.ts:1155-1180 (relanceTemplate). Code pur :
// rien n'est envoyé ici, rien n'est écrit. Copie figée contrôlée par scripts/relances-n8n-qa.mjs, cas par cas contre la vraie route.
const EXPEDITEUR = 'contact@prestiapp.fr';
const MENTION = 'Message rédigé et envoyé automatiquement par l’assistant';
const texte = (v) => (typeof v === 'string' ? v : '');
const nettoyer = (v) => texte(v).replace(/[\r\n<>"]/g, '').trim().slice(0, 70) || 'Votre artisan';
const uneLigne = (v) => texte(v).replace(/[\r\n]+/g, ' ');
const relanceTemplate = (nomArtisan, nomProspect, rang) => {
  const a = texte(nomArtisan).trim() || 'votre artisan';
  const p = texte(nomProspect).trim() ? texte(nomProspect).trim() + ', ' : '';
  if (rang <= 1) return 'Bonjour ' + p + '\n\nJe reviens vers vous suite à votre demande. Souhaitez-vous qu\'on avance ensemble ? Je reste à votre disposition pour convenir d\'un rendez-vous ou répondre à vos questions.\n\nBien à vous,\n' + a;
  if (rang === 2) return 'Bonjour ' + p + '\n\nJe me permets de vous relancer concernant votre projet. Si c\'est toujours d\'actualité, dites-moi simplement quand vous êtes disponible et je m\'organise.\n\nBien à vous,\n' + a;
  return 'Bonjour ' + p + '\n\nSans nouvelles de votre part, je mets votre demande de côté pour l\'instant — mais n\'hésitez pas à me recontacter dès que vous le souhaitez, je serai ravi de vous aider.\n\nBien à vous,\n' + a;
};
const lire = (nom) => $(nom).all().map((i) => i.json).filter((x) => x && typeof x === 'object' && typeof x.id === 'string');
const leads = {}; lire('Lire demandes').forEach((l) => { leads[l.id] = l; });
const comptes = {}; lire('Lire comptes').forEach((c) => { comptes[c.id] = c; });
const sortie = [];
for (const d of $('Modele epingle').all().map((i) => i.json).filter((x) => x && x.courrier === 'decision')) {
  const lead = leads[d.lead_id];
  const artisan = lead ? comptes[lead.artisan_id] : null;
  if ((d.decision === 'part_seul' || d.decision === 'prepare') && (!lead || !artisan)) { sortie.push({ json: { courrier: 'ignore', relance_id: d.relance_id, raison: 'demande ou compte introuvable', simulation: true } }); continue; }
  const rang = d.rang ?? 1;
  const nom = texte(artisan && artisan.nom);
  const brut = texte(d.texte_modele).trim();
  const relance = brut || (artisan ? relanceTemplate(artisan.nom ?? null, lead.nom_prospect, rang) : '');
  const decision = { ...d, texte_relance: d.decision === 'prepare' || d.decision === 'part_seul' ? relance : null };
  if (d.decision === 'part_seul' && d.envoi === 'a_envoyer') {
    const court = nom.replace(/[\r\n]+/g, ' ').trim().slice(0, 70);
    const mention = MENTION + (court ? ' de ' + court : '') + '.';
    const sec = relance.trimEnd();
    const corps = sec.endsWith(mention) ? sec.slice(0, sec.length - mention.length).replace(/\s*—\s*$/, '') : sec;
    sortie.push({ json: { courrier: 'relance', relance_id: d.relance_id, lead_id: d.lead_id, cle: 'relance:' + d.relance_id, simulation: true,
      a: texte(lead.contact).trim(), de: nettoyer(nom.trim() || 'Votre artisan') + ' <' + EXPEDITEUR + '>', repondre_a: texte(artisan.email).trim(),
      sujet: uneLigne(nom ? 'Suite à votre demande — ' + nom : 'Suite à votre demande'),
      corps, de_artisan: court ? ' de ' + court : '',
      texte: corps + '\n\n—\n' + mention } });
  }
  if (d.decision === 'prepare' && d.avis === 'proposition') {
    sortie.push({ json: { courrier: 'avis', relance_id: d.relance_id, lead_id: d.lead_id, cle: 'avis:' + d.relance_id, simulation: true,
      a: texte(artisan.email).trim(), de: 'Presti <' + EXPEDITEUR + '>', repondre_a: EXPEDITEUR,
      sujet: uneLigne('Relance prête à valider — ' + (texte(lead.nom_prospect) || 'votre client')),
      texte: (texte(lead.nom_prospect) || 'Votre client') + ' n\'a pas encore répondu. Une relance est prête dans votre espace (Messages) : relisez-la et validez-la d\'un clic pour qu\'elle parte.' } });
  }
  sortie.push({ json: decision });
}
return sortie;
