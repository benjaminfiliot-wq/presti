// presti-banc-cerveau (036-034) : la requête d'insertion EXACTE que « Écrire les cartes (ombre) » de presti-cerveau enverrait pour ces
// lignes, MONTRÉE et jamais envoyée (aucun compte réel : la clé étrangère artisan_id refuserait les comptes fictifs). Aucune donnée personnelle.
const s = $input.first().json;
const essai = s.lignes.filter((l) => l.artisan_id === '00000000-0000-4000-8000-0000000000c3');
return [{ json: { verdict: s.verdict, envoyee: false, methode: 'POST', url: 'https://gorcdvmueakcncsmrouo.supabase.co/rest/v1/assistant_actions?on_conflict=artisan_id,cle',
  entetes: { Prefer: 'resolution=ignore-duplicates,return=minimal' }, lignes_au_total: s.lignes.length, par_compte: s.par_compte, statut_chef_essai: s.statut_chef_essai,
  effets_chef_essai: s.effets_chef_essai, corps_pour_le_compte_d_essai: essai } }];