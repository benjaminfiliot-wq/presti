set -u
# Diagnostic sur COPIE (le bac) : trace de la marche pendant chaque etape de la suite ; rien n'est modifie dans le depot.
node -e "
const fs=require('fs');const f='scripts/fixtures/026-pilotage/k/juge-rendu.mjs';let s=fs.readFileSync(f,'utf8');
const a='    miroir = await lireMiroir(P.page)\n    if (!memes(miroir.map((l) => l.nom), noms)) return false';
if(!s.includes(a)) throw new Error('motif absent');
s=s.replace(a,'    miroir = await lireMiroir(P.page)\n    { const t = Date.now(); globalThis.__T0 ??= t; const enMarche = miroir.filter((l) => l.etat !== \"arrive\").map((l) => l.nom + \"@\" + l.x + \",\" + l.y).join(\" \"); if (enMarche !== globalThis.__DER) { globalThis.__DER = enMarche; console.error(\"[diag] t=\" + ((t - globalThis.__T0)/1000).toFixed(1) + \" s n=\" + n + \" marche: \" + (enMarche || \"personne\")) } }\n    if (!memes(miroir.map((l) => l.nom), noms)) return false');
fs.writeFileSync(f,s)"
uptime
node scripts/station-claw3d-qa.mjs --partie=verite 2>&1 | grep -E "^\[diag\]|^(✅|❌) CL|station-claw3d" | cut -c1-300
uptime
