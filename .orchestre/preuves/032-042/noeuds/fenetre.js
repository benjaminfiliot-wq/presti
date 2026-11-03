// presti-reponse-seule : la fenêtre du passage. Un passage par minute ; une demande n'est lue que 30 s après sa création (le temps
// que le chemin codé écrive son motif), dans une fenêtre d'une minute alignée sur l'horloge : chaque demande tombe dans UNE fenêtre
// et une seule (n8n n'écrit pas en base : l'unicité tient aux fenêtres, pas à un registre). Copie figée contrôlée par
// scripts/reponse-seule-n8n-qa.mjs ; l'instant vient de Date.now() (le juge le fixe).
const PASSAGE_MS = 60000;
const DECALAGE_MS = 30000;
const DOUBLONS_MS = 86400000;
const RAFALE_MS = 600000;
const maintenant = Date.now();
const passage = Math.floor(maintenant / PASSAGE_MS) * PASSAGE_MS;
const fin = passage - DECALAGE_MS;
const debut = fin - PASSAGE_MS;
const decalageParis = (t) => {
  const p = {};
  for (const x of new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(t))) p[x.type] = Number(x.value);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(t / 1000) * 1000;
};
const jour = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(fin));
const [a, m, j] = jour.split('-').map(Number);
const minuit0 = Date.UTC(a, m - 1, j);
const minuit = minuit0 - decalageParis(minuit0 - 7200000);
const depuisJour = Math.min(minuit, debut);
return [{ json: { jour, debut: new Date(debut).toISOString(), fin: new Date(fin).toISOString(), depuis_jour: new Date(depuisJour).toISOString(), depuis_doublons: new Date(fin - DOUBLONS_MS).toISOString(), depuis_rafale: new Date(debut - RAFALE_MS).toISOString(), passage: new Date(passage).toISOString(), simulation: true } }];
