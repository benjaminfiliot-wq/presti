import { chromium } from 'playwright';
import path from 'path';

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  
  // Serve the site on a random port
  const http = (await import('http')).default;
  const fs = (await import('fs')).default;
  const dossier = path.resolve('public/sites-demo/chauffagiste');
  
  const server = http.createServer((req, res) => {
    let p = req.url.split('?')[0];
    if (p.endsWith('/')) p += 'index.html';
    const filePath = path.join(dossier, p);
    if (fs.existsSync(filePath)) {
      res.writeHead(200);
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  
  server.listen(0, async () => {
    const port = server.address().port;
    const url = `http://127.0.0.1:${port}`;
    
    await page.goto(`${url}/`);
    await page.waitForTimeout(500);
    await page.screenshot({ path: '.orchestre/preuves/014-04/accueil.png' });
    
    await page.goto(`${url}/chauffagiste-lille/`);
    await page.waitForTimeout(500);
    await page.screenshot({ path: '.orchestre/preuves/014-04/commune.png' });
    
    // For réalisations, scroll down a bit on accueil
    await page.goto(`${url}/`);
    await page.evaluate(() => window.scrollBy(0, 1000));
    await page.waitForTimeout(500);
    await page.screenshot({ path: '.orchestre/preuves/014-04/realisations.png' });
    
    await page.goto(`${url}/mentions-legales/`);
    await page.waitForTimeout(500);
    await page.screenshot({ path: '.orchestre/preuves/014-04/mentions.png' });
    
    browser.close();
    server.close();
    console.log("Screenshots done.");
  });
}

main().catch(console.error);
