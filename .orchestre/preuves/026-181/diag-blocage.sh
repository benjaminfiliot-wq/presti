set -u
node .orchestre/preuves/026-181/diag-blocage.mjs
uptime
node scripts/station-claw3d-qa.mjs --partie=verite 2>&1 | grep -E "^\[blocage\]|^(✅|❌) CL|station-claw3d" | cut -c1-420
uptime
