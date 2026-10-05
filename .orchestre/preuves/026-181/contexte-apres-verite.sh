uptime
for n in 1 2; do echo "== passage $n (verite puis contexte, racine reelle)"; node scripts/station-claw3d-qa.mjs --partie=verite,contexte 2>&1 | grep -E "^(✅|❌) CL-|station-claw3d" | cut -c1-260; done
uptime
