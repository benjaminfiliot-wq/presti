// presti-relances : l'instant du passage. Un passage par jour (8 h, Europe/Paris) ; l'instant sert à deux choses : quelles relances sont
// dues (planifiee_le <= passage, comme app/api/cron/relances/route.ts:64-69) et le calcul du registre commun de 3 jours. Copie figée
// contrôlée par scripts/relances-n8n-qa.mjs ; l'instant vient de Date.now() (le juge le fixe).
const maintenant = Date.now();
const jour = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(maintenant));
return [{ json: { passage: new Date(maintenant).toISOString(), jour, simulation: true } }];
