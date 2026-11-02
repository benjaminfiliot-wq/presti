import { workflow, node, trigger, sticky } from "@n8n/workflow-sdk";

const echec = trigger({
  type: "n8n-nodes-base.errorTrigger",
  version: 1,
  config: { name: "Échec d un workflow", position: [0, 0], parameters: {} }
});

const message = node({
  type: "n8n-nodes-base.code",
  version: 2,
  config: {
    name: "Message sans donnée",
    position: [260, 0],
    parameters: { mode: "runOnceForAllItems", language: "javaScript", jsCode: "// presti-erreurs (tâche 032-033) : une alerte courte, SANS AUCUNE DONNÉE d'artisan ni de client.\n// Ne sortent que : le nom du workflow, le nom du nœud fautif, le numéro d'exécution, l'heure de Paris.\n// Jamais execution.error (message, pile), execution.url, trigger.error, ni rien de ce que le passage a lu.\nconst e = $input.first().json ?? {}\nconst wf = e.workflow && typeof e.workflow === 'object' ? e.workflow : {}\nconst ex = e.execution && typeof e.execution === 'object' ? e.execution : {}\nconst nomBrut = typeof wf.name === 'string' ? wf.name : ''\nconst nom = /^presti-[a-z0-9-]{1,48}$/.test(nomBrut) ? nomBrut : 'workflow hors liste'\nconst noeudBrut = typeof ex.lastNodeExecuted === 'string' ? ex.lastNodeExecuted : (e.trigger ? 'déclencheur' : '')\nconst noeud = /^[\\p{L}\\p{N} ()'’«»#._-]{1,60}$/u.test(noeudBrut) ? noeudBrut : 'inconnu'\nconst numBrut = ex.id === undefined || ex.id === null ? '' : String(ex.id)\nconst numero = /^\\d{1,12}$/.test(numBrut) ? numBrut : 'sans numéro'\nconst heure = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', dateStyle: 'short', timeStyle: 'short' }).format(new Date())\nconst texte = `:rotating_light: ${nom} a échoué au nœud « ${noeud} » (exécution ${numero}, ${heure}, heure de Paris). Détail dans les exécutions de n8n (Oracle).`\nreturn [{ json: { texte } }]\n" }
  }
});

const slack = node({
  type: "n8n-nodes-base.slack",
  version: 2.7,
  config: {
    name: "Alerte #presti-auto",
    position: [520, 0],
    notes: "pied: aucun\nMessage interne de Presti à Benj, sans donnée d artisan ni de client (tâche 032-033).",
    credentials: { slackApi: { id: "lR0GZ7FGXI3FCAF8", name: "Slack account 2" } },
    parameters: {
      resource: "message",
      operation: "post",
      authentication: "accessToken",
      select: "channel",
      channelId: { __rl: true, mode: "name", value: "presti-auto" },
      messageType: "text",
      text: "={{ $json.texte }}",
      otherOptions: { includeLinkToWorkflow: false }
    }
  }
});

const note = sticky("## presti-erreurs (032-033)\nWorkflow d erreur commun, désigné dans les réglages des six workflows du soir.\nNe part que sur l échec d une exécution de PRODUCTION, jamais d un essai manuel.\nAlerte : nom du workflow, nœud, numéro d exécution, heure. Aucune donnée (ni message d erreur, ni pile, ni lien).", [echec, message, slack], { color: 4 });

export default workflow("presti-erreurs", "presti-erreurs")
  .add(echec)
  .to(message)
  .to(slack)
  .add(note);
