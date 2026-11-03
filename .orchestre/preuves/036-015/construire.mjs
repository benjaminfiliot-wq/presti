import { sdkApres } from './apres.mjs'
import { sdkOperations } from './operations.mjs'
import { sdkDirection } from './direction.mjs'
const quoi = process.argv[2]
if (quoi === 'apres') process.stdout.write(sdkApres())
else if (quoi === 'operations') process.stdout.write(sdkOperations())
else if (quoi === 'direction') process.stdout.write(sdkDirection())
else { console.error('usage : construire.mjs <apres|operations|direction>'); process.exit(2) }
