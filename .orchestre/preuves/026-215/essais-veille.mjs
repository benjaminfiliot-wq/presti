// Essais de 026-215 (Claude Code) : les cas de la correction du 27/09 et de la décision du chef que le juge
// contenu-qa --partie=veille n'exerce pas encore. Doublures seulement, horloge figée, personnes fictives, aucun réseau.
// Lancer : node --import ./scripts/ts-loader.mjs .orchestre/preuves/026-215/essais-veille.mjs
import * as V from '../../../scripts/contenu/veille.mjs'
import { lireAvecFirecrawl } from '../../../lib/agents/lectureFirecrawl.ts'
import * as A from '../../../lib/contenu/accroches.ts'

const MAINTENANT = Date.parse('2026-09-29T10:00:00Z')
let echecs = 0
const t = (nom, cond, detail = '') => { console.log(`${cond ? 'OK ' : 'KO '} ${nom}${detail ? ' — ' + detail : ''}`); if (!cond) echecs++ }

// doublure de l'adaptateur 026-223 : compte les appels Firecrawl et les replis
function adaptateur({ robots = 'User-agent: *\nAllow: /', consommes = 0, cle = 'cle-de-test' } = {}) {
  const compte = { firecrawl: 0, repli: 0, chercher: 0 }
  const deps = {
    cle,
    firecrawl: async (op) => { compte.firecrawl++; if (op === 'search') compte.chercher++; return { statut: 200, corps: { success: true, data: { markdown: 'Plomberie exemple, devis gratuit, intervention rapide.', metadata: { sourceURL: 'https://plomberie-exemple.fr/' } } } } },
    robots: async () => robots,
    repli: async (url) => { compte.repli++; return { statut: 200, url_finale: url, corps: 'Contenu lu par le lecteur 026-020, plomberie exemple.' } },
    credits: { plafond: 1000, consommes, date: '2026-09-29T09:00:00Z', source: 'compteur-test' },
    horloge: { maintenant: () => MAINTENANT },
  }
  return { compte, adapt: (demande) => lireAvecFirecrawl(demande, deps) }
}

// 1. « chercher » : refus avant tout appel, même avec l'adaptateur branché
{
  const a = adaptateur()
  t('verdict: chercher refusé', V.verdictFirecrawl('chercher', 'https://plomberie-exemple.fr/').ok === false)
  const r = await V.lireUrlEntreprise('https://plomberie-exemple.fr/', { adaptateur: a.adapt })
  t('lire sur URL publique : appel Firecrawl et source conservée', a.compte.firecrawl === 1 && r.methode === 'firecrawl' && r.source === 'https://plomberie-exemple.fr/' && !!r.horodatage, JSON.stringify({ methode: r.methode, source: r.source }))
}
// 2. URL portant un e-mail / téléphone / pseudo piégé : zéro appel
for (const [nom, url] of [['e-mail', 'https://plomberie-exemple.fr/contact?email=jean.dupont@presti-test.invalid'], ['e-mail codé', 'https://plomberie-exemple.fr/c?m=jean%40presti-test.invalid'], ['téléphone', 'https://plomberie-exemple.fr/c?tel=0612345678'], ['pseudo', 'https://plomberie-exemple.fr/@jean_dupont']]) {
  const a = adaptateur()
  const r = await V.lireUrlEntreprise(url, { adaptateur: a.adapt })
  t(`URL piégée (${nom}) : refusée, zéro appel`, r.refus === 'donnee_personnelle' && a.compte.firecrawl === 0 && a.compte.repli === 0)
}
// 3. nom d'un prospect connu dans l'URL
{
  const a = adaptateur()
  const r = await V.lireUrlEntreprise('https://exemple.fr/artisan-jean-martinet', { adaptateur: a.adapt }, { prospects: ['Jean Martinet', 'martinet'] })
  t('nom de prospect dans l’URL : refusé, zéro appel', r.refus === 'donnee_personnelle' && a.compte.firecrawl === 0)
}
// 4. quota épuisé : aucun appel Firecrawl, repli explicite, source conservée
{
  const a = adaptateur({ consommes: 1000 })
  const r = await V.lireUrlEntreprise('https://plomberie-exemple.fr/', { adaptateur: a.adapt })
  t('quota épuisé : zéro appel Firecrawl, repli 026-020, source gardée', a.compte.firecrawl === 0 && a.compte.repli === 1 && r.repli === true && r.methode === 'lecteur-026-020' && r.raison_repli === 'quota_epuise' && r.source === 'https://plomberie-exemple.fr/', JSON.stringify({ raison: r.raison_repli }))
}
// 5. clé absente : repli, pas de dépendance du chemin gratuit à la clé Firecrawl
{
  const a = adaptateur({ cle: null })
  const r = await V.lireUrlEntreprise('https://plomberie-exemple.fr/', { adaptateur: a.adapt })
  t('clé absente : lecture gratuite par le lecteur', a.compte.firecrawl === 0 && r.repli === true && r.raison_repli === 'cle_absente')
}
// 6. robots refusés : aucun appel Firecrawl NI repli (le lecteur respecte aussi robots)
{
  const a = adaptateur({ robots: 'User-agent: *\nDisallow: /' })
  const r = await V.lireUrlEntreprise('https://plomberie-exemple.fr/', { adaptateur: a.adapt })
  t('robots refusés : zéro appel Firecrawl, refus nommé', a.compte.firecrawl === 0 && a.compte.repli === 0 && r.refus === 'robots', JSON.stringify({ refus: r.refus }))
}
// 7. quota épuisé ET robots refusés
{
  const a = adaptateur({ robots: 'User-agent: *\nDisallow: /', consommes: 1000 })
  const r = await V.lireUrlEntreprise('https://plomberie-exemple.fr/', { adaptateur: a.adapt })
  t('quota épuisé + robots refusés : zéro appel, refus robots', a.compte.firecrawl === 0 && a.compte.repli === 0 && r.refus === 'robots')
}
// 8. adaptateur absent : voie fermée, pas d'exception
t('adaptateur absent : refus explicite', (await V.lireUrlEntreprise('https://plomberie-exemple.fr/', {})).refus === 'adaptateur_absent')

// 9. Perplexity
const base = { requete: 'tendances vidéo artisan plombier 2026', plan: 'pro', droit: true, cout: 0.01, budget: 1 }
t('Perplexity : cas autorisé', V.verdictPerplexity(base).appel === true)
t('Perplexity : coût inconnu → zéro appel', V.verdictPerplexity({ ...base, cout: undefined }).appel === false)
t('Perplexity : plan inconnu → zéro appel', V.verdictPerplexity({ ...base, plan: null }).appel === false)
t('Perplexity : budget absent → zéro appel', V.verdictPerplexity({ ...base, budget: undefined }).appel === false)
t('Perplexity : budget dépassé → zéro appel', V.verdictPerplexity({ ...base, cout: 5 }).appel === false)
t('Perplexity : donnée personnelle → zéro appel', V.verdictPerplexity({ ...base, requete: 'avis sur jean@presti-test.invalid' }).appel === false)
t('Perplexity : boucle de masse → zéro appel', V.verdictPerplexity({ ...base, masse: true }).appel === false)
t('Perplexity : repli = lecteur existant', V.verdictPerplexity({ ...base, cout: undefined }).repli === 'lecteur_026_020')

// 10. Groq jamais ; IA gratuite / cloud / Ollama
for (const m of ['groq', 'groq-compound', 'compound', 'whisper-groq']) t(`Groq refusé (${m}), même sans donnée`, V.verdictEnvoiIA('titre public', m).ok === false)
t('prospect → freellmapi refusé', V.verdictEnvoiIA('contact : jean@presti-test.invalid', 'freellmapi').ok === false)
t('prospect → ollama:cloud refusé', V.verdictEnvoiIA('contact : jean@presti-test.invalid', 'ollama:cloud').ok === false)
t('prospect → Ollama local sans « oui » refusé', V.verdictEnvoiIA('tel 0612345678', 'ollama').ok === false)
t('prospect → Ollama local avec « oui » de Benj accepté', V.verdictEnvoiIA('tel 0612345678', 'ollama', { ouiBenjOllama: true }).ok === true)
t('prospect → Laya et Codex acceptés', V.verdictEnvoiIA('tel 0612345678', 'laya').ok && V.verdictEnvoiIA('tel 0612345678', 'codex').ok)
t('texte public → IA gratuite acceptée', V.verdictEnvoiIA('comment gagner du temps sur un devis', 'freellmapi').ok === true)
t('moteur inconnu + prospect : fermé', V.verdictEnvoiIA('tel 0612345678', 'nouveau-moteur').ok === false)

// 11. sources, vidéos d'autrui, TikTok
t('Business Discovery fermée sans R6', V.sourcesAutorisees({}).business_discovery.ok === false && V.sourcesAutorisees({ r6: true }).business_discovery.ok === true)
t('Search Console officielle ouverte', V.sourcesAutorisees({}).search_console.ok === true)
t('télécharger / transcrire une vidéo d’autrui refusé', V.verdictSource('telecharger').ok === false && V.verdictSource('transcrire').ok === false)
t('TikTok Studio / Creative Center refusés au robot', V.verdictSource('lire', 'https://www.tiktok.com/tiktokstudio').ok === false && V.verdictSource('lire', 'https://ads.tiktok.com/business/creativecenter/inspiration').ok === false)

// 12. prospect caché dans un titre YouTube, élagage, conservation 30 jours
{
  const titre = 'Rénovation chez M. Jean Martinet à Saint-Étienne, appelez 06 12 34 56 78 ou @martinet_plomberie'
  const r = V.traiterTitre(titre, { prospects: ['Martinet'] })
  t('titre nominatif : détecté, élagué, jamais vers une IA', r.nominatif === true && r.versIA.ok === false && !/Martinet|06 12|@martinet|Étienne/i.test(r.texteAnalyse), r.texteAnalyse)
  const e = V.retenirYouTube({ id: 'v1', titre, description: 'x', statistiques: { vues: 10, likes: 2 }, auteur: 'Chaîne Martinet', ville: 'Lyon', transcription: 'INTERDIT', audio: 'INTERDIT' }, '2026-09-01T00:00:00Z')
  t('YouTube : seuls titre, description, stats ; pas de transcription', !('transcription' in e) && !('audio' in e) && e.statistiques.vues === 10)
  const [jeune, ancien, illisible] = V.expirerNominatif([{ ...e, collecte_le: '2026-09-10T00:00:00Z' }, { ...e, collecte_le: '2026-08-30T00:00:00Z' }, { ...e, collecte_le: 'pas-une-date' }], MAINTENANT)
  t('conservation : 19 jours gardés, 30 jours et illisible effacés', Object.keys(jeune.nominatif).length > 0 && Object.keys(ancien.nominatif).length === 0 && ancien.nominatif_expire === true && Object.keys(illisible.nominatif).length === 0)
  t('conservation : exactement 30 jours effacé', Object.keys(V.expirerNominatif([{ ...e, collecte_le: '2026-08-30T10:00:00Z' }], MAINTENANT)[0].nominatif).length === 0)
}

// 13. accroches : règles d'abord, jev départage l'ambigu, score sans publication, pas de flatterie par défaut
{
  const laya = (reponse) => ({ lancer: null, env: { JEV_FAUX: '1' } })
  t('règles : question', (await A.classerAccroche('Pourquoi vos devis restent sans réponse ?'))?.categorie === 'question')
  t('règles : chiffre', (await A.classerAccroche('3 heures gagnées chaque semaine'))?.categorie === 'chiffre')
  t('règles : avant/après', (await A.classerAccroche('Avant : 2 h de devis. Après : 5 minutes'))?.categorie ? true : false)
  t('règles : contraste', (await A.classerAccroche('Un devis rapide plutôt que trois relances'))?.categorie === 'contraste')
  t('texte nominatif sans règle : non classé, rien ne part', (await A.classerAccroche('bonjour jean@presti-test.invalid', { lancer: () => { throw new Error('APPEL INTERDIT') } })) === null)
  const sansSource = await A.scoreIdee('idée sans source', '', 'jour', { lancer: () => { throw new Error('APPEL INTERDIT') } })
  t('idée sans source : non mesurée, non versée, pas de score', sansSource.statut === 'non_mesure' && sansSource.alimenteFileIdees === false && sansSource.score === undefined && sansSource.publicationAutomatique === false)
  const recBad = await A.scoreIdee('idée', 'source.md', 'hier', { lancer: () => { throw new Error('APPEL INTERDIT') } })
  t('récence invalide : non mesurée', recBad.statut === 'non_mesure' && recBad.alimenteFileIdees === false)
  const panne = await A.scoreIdee('idée', 'source.md', 'jour', { env: { JEV_CHEMIN: 'C:/inexistant/jev.mjs' } })
  t('Laya en panne : « non mesuré », jamais un score par défaut', panne.statut === 'non_mesure' && panne.score === undefined && panne.alimenteFileIdees === false, JSON.stringify({ raison: panne.raison }))
}

console.log(echecs === 0 ? 'ESSAIS : PASS' : `ESSAIS : FAIL (${echecs})`)
process.exitCode = echecs === 0 ? 0 : 1
