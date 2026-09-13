import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import sharp from 'sharp';

const DIR = 'public/sites-demo/couvreur';

const images = [
  {
    name: 'hero',
    url: 'https://upload.wikimedia.org/wikipedia/commons/9/95/Rooftiles.JPG',
    source: 'https://commons.wikimedia.org/wiki/File:Rooftiles.JPG',
    auteur: 'Sverdrup',
    licence: 'CC BY-SA 3.0',
    legende: 'Tuiles de couverture'
  },
  {
    name: 'realisation1',
    url: 'https://upload.wikimedia.org/wikipedia/commons/0/03/Unfertige_Dinge_003_2022_10_26.jpg',
    source: 'https://commons.wikimedia.org/wiki/File:Unfertige_Dinge_003_2022_10_26.jpg',
    auteur: 'Friedrich Haag',
    licence: 'CC BY-SA 4.0',
    legende: 'Travail en cours'
  },
  {
    name: 'realisation2',
    url: 'https://upload.wikimedia.org/wikipedia/commons/8/88/Wet_Roof_Tiles.jpg',
    source: 'https://commons.wikimedia.org/wiki/File:Wet_Roof_Tiles.jpg',
    auteur: 'Noah Wulf',
    licence: 'CC BY-SA 4.0',
    legende: 'Tuiles mouillées'
  },
  {
    name: 'realisation3',
    url: 'https://upload.wikimedia.org/wikipedia/commons/b/b2/Roof_tiles_packed_in_crate_1.jpg',
    source: 'https://commons.wikimedia.org/wiki/File:Roof_tiles_packed_in_crate_1.jpg',
    auteur: 'W.carter',
    licence: 'CC BY-SA 4.0',
    legende: 'Tuiles en caisse'
  },
  {
    name: 'realisation4',
    url: 'https://upload.wikimedia.org/wikipedia/commons/1/19/View_to_Piran_from_St._George%27s_Parish_Church%2C_Piran%2C_Slovenia_11.jpg',
    source: 'https://commons.wikimedia.org/wiki/File:View_to_Piran_from_St._George%27s_Parish_Church,_Piran,_Slovenia_11.jpg',
    auteur: 'Michal Klajban',
    licence: 'CC BY-SA 4.0',
    legende: 'Toits de Piran'
  },
  {
    name: 'realisation5',
    url: 'https://upload.wikimedia.org/wikipedia/commons/5/5f/B%C3%B8rsen_dragon_spire_roofs_Copenhagen_Denmark.jpg',
    source: 'https://commons.wikimedia.org/wiki/File:B%C3%B8rsen_dragon_spire_roofs_Copenhagen_Denmark.jpg',
    auteur: 'Jebulon',
    licence: 'CC0',
    legende: 'Flèche en toiture'
  }
];

const attributions = [];

async function processImages() {
  for (const img of images) {
    const tmp = path.join(DIR, 'images', img.name + '-orig.jpg');
    console.log('Downloading', img.url);
    execSync(`curl.exe -L -A "Mozilla/5.0" -s -o "${tmp}" "${img.url}"`);
    
    // Check size to avoid 403 errors saving as 0 bytes or HTML
    if (!fs.existsSync(tmp) || fs.statSync(tmp).size < 1000) {
      console.error('Failed to download', img.url);
      continue;
    }
    
    for (const width of [480, 960, 1600]) {
      const q = img.name === 'hero' ? 60 : 70;
      await sharp(tmp).resize({ width }).webp({ quality: q }).toFile(path.join(DIR, 'images', `${img.name}-${width}.webp`));
      await sharp(tmp).resize({ width }).avif({ quality: q - 10 }).toFile(path.join(DIR, 'images', `${img.name}-${width}.avif`));
    }
    fs.unlinkSync(tmp);
    
    attributions.push({
      fichier: `${img.name}-1600.webp`,
      auteur: img.auteur,
      source: img.source,
      licence: img.licence,
      legende: img.legende
    });
  }
  fs.writeFileSync(path.join(DIR, 'attributions.json'), JSON.stringify(attributions, null, 2));
}

processImages().catch(console.error);
