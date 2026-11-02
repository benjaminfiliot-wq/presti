// presti-erreurs (tâche 032-033) : une alerte courte, SANS AUCUNE DONNÉE d'artisan ni de client.
// Ne sortent que : le nom du workflow, le nom du nœud fautif, le numéro d'exécution, l'heure de Paris.
// Jamais execution.error (message, pile), execution.url, trigger.error, ni rien de ce que le passage a lu.
const e = $input.first().json ?? {}
const wf = e.workflow && typeof e.workflow === 'object' ? e.workflow : {}
const ex = e.execution && typeof e.execution === 'object' ? e.execution : {}
const nomBrut = typeof wf.name === 'string' ? wf.name : ''
const nom = /^presti-[a-z0-9-]{1,48}$/.test(nomBrut) ? nomBrut : 'workflow hors liste'
const noeudBrut = typeof ex.lastNodeExecuted === 'string' ? ex.lastNodeExecuted : (e.trigger ? 'déclencheur' : '')
const noeud = /^[\p{L}\p{N} ()'’«»#._-]{1,60}$/u.test(noeudBrut) ? noeudBrut : 'inconnu'
const numBrut = ex.id === undefined || ex.id === null ? '' : String(ex.id)
const numero = /^\d{1,12}$/.test(numBrut) ? numBrut : 'sans numéro'
const heure = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short' }).format(new Date())
const texte = `:rotating_light: ${nom} a échoué au nœud « ${noeud} » (exécution ${numero}, ${heure}, heure de Paris). Détail dans les exécutions de n8n (Oracle).`
return [{ json: { texte } }]
