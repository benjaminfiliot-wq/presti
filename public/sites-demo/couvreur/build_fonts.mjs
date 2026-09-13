import fs from 'fs';
import path from 'path';
import https from 'https';

const DIR = 'public/sites-demo/couvreur/fonts';
fs.mkdirSync(DIR, { recursive: true });

async function dlFont(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      const s = fs.createWriteStream(dest);
      res.pipe(s);
      s.on('finish', resolve);
    }).on('error', reject);
  });
}

async function run() {
  await dlFont('https://fonts.gstatic.com/s/archivonarrow/v30/tss5ApVBdCYD5Q7hcxTE1SyPz_3cFlkM.woff2', path.join(DIR, 'ArchivoNarrow.woff2'));
  await dlFont('https://fonts.gstatic.com/s/ibmplexsans/v19/zYXgKVElMYYaJe8bpLHnCwDKhdHeFac.woff2', path.join(DIR, 'IBMPlexSans.woff2'));
  
  fs.writeFileSync(path.join(DIR, 'OFL.txt'), `This Font Software is licensed under the SIL Open Font License, Version 1.1.`);
}
run();
