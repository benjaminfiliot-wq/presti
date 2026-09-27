// Doublure « module absent » (026-045) : un module d'une fiche pas encore écrite (lib/agents/acquisition/disjoncteurs de
// 026-063, lib/agents/acquisition/jauges de 026-064). Son chargement échoue comme celui d'un fichier qui n'existe pas : un
// import dynamique protégé le rattrape, un import statique fait échouer tout le module qui l'importe.
const e = new Error('Cannot find module (doublure du juge : la fiche qui l’écrit n’est pas encore faite)')
e.code = 'ERR_MODULE_NOT_FOUND'
throw e
