#!/usr/bin/env bash
# Contre-vérification de 026-179 (le moteur nu de la carte, K1) : des sabotages RÉVERSIBLES de la production, dans un bac de l'usine (jamais sur
# le dépôt), chacun jugé par la partie de station-claw3d-qa qui doit le voir, puis restauré (sha256 comparés). Lancé par :
#   node scripts/usine.mjs executer --nom=sab-179 --id=026-179 --delai=25 --rapatrier=.orchestre/preuves/026-179/sab-moteur -- bash .orchestre/preuves/026-179/sabotages-moteur-179.sh
set -u
SORTIE=".orchestre/preuves/026-179/sab-moteur"
mkdir -p "$SORTIE"
LOG="$SORTIE/journal.md"
sha() { sha256sum "$1" | cut -c1-16; }
{ echo "# Sabotages de la production de 026-179 (bac $(basename "$PWD"), $(date -u +%FT%TZ))"; } > "$LOG"

# sabotage <nom> <fichier> <partie du juge> <motif attendu (CL-n)> <ancre à ôter> <remplacement>
sabotage() {
  local nom="$1" f="$2" partie="$3" motif="$4" ancre="$5" remplace="$6" copie avant apres restaure sortie code ok
  copie="$(mktemp)"; cp "$f" "$copie"; avant="$(sha "$f")"
  ANCRE="$ancre" REMPLACE="$remplace" node -e '
    const fs = require("fs"); const f = process.argv[1]; const t = fs.readFileSync(f, "utf8");
    const n = t.split(process.env.ANCRE).length - 1;
    if (n !== 1) { console.error("ancre trouvée " + n + " fois"); process.exit(3) }
    fs.writeFileSync(f, t.replace(process.env.ANCRE, () => process.env.REMPLACE));
  ' "$f" || { echo "## $nom : sabotage NON posé (ancre)" >> "$LOG"; echo "$nom : non posé"; cp "$copie" "$f"; return; }
  apres="$(sha "$f")"
  if [ "$apres" = "$avant" ]; then echo "## $nom : ✗ le sabotage n'a rien changé" >> "$LOG"; return; fi
  sortie="$(node scripts/station-claw3d-qa.mjs --partie="$partie" 2>&1)"; code=$?
  cp "$copie" "$f"; restaure="$(sha "$f")"
  ok="✓"
  [ "$code" -ne 0 ] || ok="✗ (le juge est resté vert)"
  grep -qF -- "$motif" <<<"$sortie" || ok="✗ (motif $motif absent)"
  [ "$restaure" = "$avant" ] || ok="✗ (fichier NON restauré : $restaure)"
  {
    echo
    echo "## $nom : $ok"
    echo "- fichier : \`$f\` ; sha256 $avant → $apres (sabotée) → $restaure (restaurée)"
    echo "- juge : \`station-claw3d-qa --partie=$partie\` : code $code, motif attendu $motif"
    echo '```'
    grep -E "❌|FAIL|PASS" <<<"$sortie" | cut -c1-380 | head -6
    echo '```'
  } >> "$LOG"
  echo "$nom : code $code $ok"
}

# Référence : tout est vert avant tout sabotage (provenance et hygiène, rapides).
ref="$(node scripts/station-claw3d-qa.mjs --partie=provenance,hygiene 2>&1)"; refcode=$?
{ echo; echo "## Référence avant sabotage : code $refcode"; echo '```'; grep -E "✅|❌|PASS|FAIL" <<<"$ref" | cut -c1-200; echo '```'; } >> "$LOG"

sabotage "S1 « station\\/.* » ôté de CHEMINS_APP_PRESTI" proxy.ts hygiene "CL-16" 'marque\/.*|station\/.*|' 'marque\/.*|'
sabotage "S2 la graine de Phaser ôtée" app/controle/station/moteur/claw3d/OfficePhaserCanvas.tsx verite "CL-6" 'seed: ["station"],' ''
sabotage "S3 Carte.tsx importe le moteur en statique" app/controle/station/Carte.tsx provenance "CL-4" "const Moteur = dynamic(() => import('./moteur/entree'), { ssr: false })" "import Moteur from './moteur/entree'"
sabotage "S4 la scène ne s'endort plus" app/controle/station/moteur/scene/StationPixelScene.ts repos "CL-9" 'if (this.calme >= IMAGES_DE_CALME) this.game.loop.sleep();' 'void IMAGES_DE_CALME;'
sabotage "S5 Carte.tsx charge le moteur sans lire le drapeau stationCarte" app/controle/station/Carte.tsx provenance "CL-4" "if (!actif('stationCarte')) return <CarteAttente />" "void actif"
sabotage "S6 phaser sans version exacte (^3.90.0)" package.json provenance "CL-3" '"phaser": "3.90.0"' '"phaser": "^3.90.0"'

FIN="$(node scripts/station-claw3d-qa.mjs --partie=provenance,hygiene 2>&1)"; fincode=$?
{ echo; echo "## Après les six : arbre restauré, provenance et hygiène : code $fincode"; echo '```'; grep -E "✅|❌|PASS|FAIL" <<<"$FIN" | cut -c1-200; echo '```'; } >> "$LOG"
echo "fin : code $fincode"
[ "$refcode" -eq 0 ] && [ "$fincode" -eq 0 ] && ! grep -q "✗" "$LOG"
