import fs from 'node:fs';
import path from 'node:path';

const env = fs.readFileSync('.env.local', 'utf8');
const key = env.match(/FIRECRAWL_API_KEY=(.*)/)[1].trim();

const packDir = path.join(process.cwd(), 'docs/presti/appels/pack-2026-10-08-b');
fs.mkdirSync(packDir, { recursive: true });

async function api(route, data = null) {
  const res = await fetch(`https://api.firecrawl.dev/v2/${route}`, {
    method: data ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: data ? JSON.stringify(data) : undefined
  });
  return await res.json();
}

const artisans = [
  { id: '804810323', nom: 'MARTIN BRUNO', ville: 'Bois', cp: '17240', tel: '06 42 25 37 61', metier: 'Menuiserie (fenêtres, volets, portes)' },
  { id: '518912738', nom: 'SARL BOYER JEAN-FRANCOIS', ville: 'Chevanceaux', cp: '17210', tel: '05 46 04 62 82', metier: 'Chauffage, PAC, Chaudières' },
  { id: '535088751', nom: 'BROUCARET RODOLPHE', ville: 'Gémozac', cp: '17260', tel: '06 71 04 45 30', metier: 'Menuiserie, Isolation' },
  { id: '403811706', nom: 'SARL JOUGOURD', ville: 'Gémozac', cp: '17260', tel: '05 46 94 20 24', metier: 'Électricité, Chauffage, Ventilation' },
  { id: '392532628', nom: 'SOCIETE FERRARI-OSSATO', ville: 'Gémozac', cp: '17260', tel: '05 46 94 67 42', metier: 'Chauffage, PAC, Poêles bois' },
  { id: '449831346', nom: 'COURPRON PASCAL', ville: 'La Vallée', cp: '17250', tel: '05 46 95 01 96', metier: 'Chauffage, PAC, Plomberie' },
  { id: '444566491', nom: 'GUERINEAU JEAN', ville: 'Marans', cp: '17230', tel: '05 46 01 19 59', metier: 'Menuiserie extérieure' },
  { id: '392383956', nom: 'ROYAN MENUISERIE 17', ville: 'Royan', cp: '17200', tel: '05 46 05 82 50', metier: 'Menuiserie extérieure' },
  { id: '377928742', nom: 'SAS DELAGE', ville: 'Royan', cp: '17200', tel: '05 46 38 42 93', metier: 'Chauffage, PAC, Chaudières' },
  { id: '523902039', nom: 'MOUGON STEPHANE', ville: 'Saint-Médard-d\'Aunis', cp: '17220', tel: '06 13 75 83 66', metier: 'Électricité, Panneaux solaires' }
];

async function main() {
  const usageBefore = await api('team/credit-usage');
  console.log('Crédits avant:', usageBefore?.data?.remainingCredits);

  const results = [];
  for (const art of artisans) {
    const query = `${art.nom} ${art.ville} artisan site facebook`;
    console.log(`Recherche pour ${art.nom}...`);
    try {
      const searchRes = await api('search', {
        query,
        limit: 5,
        sources: ['web'],
        country: 'FR'
      });
      results.push({
        artisan: art,
        query,
        search: searchRes
      });
    } catch (e) {
      console.error(`Erreur pour ${art.nom}:`, e.message);
      results.push({ artisan: art, query, error: e.message });
    }
    // Petit délai poli entre requêtes
    await new Promise(r => setTimeout(r, 600));
  }

  const usageAfter = await api('team/credit-usage');
  console.log('Crédits après:', usageAfter?.data?.remainingCredits);

  const outData = {
    date: new Date().toISOString(),
    remainingBefore: usageBefore?.data?.remainingCredits,
    remainingAfter: usageAfter?.data?.remainingCredits,
    artisans,
    results
  };

  fs.writeFileSync(path.join(packDir, 'firecrawl-resultats.json'), JSON.stringify(outData, null, 2), 'utf8');
  console.log('Recherche Firecrawl terminée et enregistrée.');
}

main().catch(console.error);
