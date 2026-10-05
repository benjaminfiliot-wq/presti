uptime
node scripts/station-ecran-qa.mjs --partie=verite,acteurs,calque 2>&1 | grep -E "^(✅|❌) CE-|station-ecran-qa" | cut -c1-420
uptime
