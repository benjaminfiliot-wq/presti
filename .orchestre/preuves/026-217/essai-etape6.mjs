// Essai de l'étape 6 de 026-217 : échéance, défaut appliqué, refus, ancienne version, accord d'un autre post, Laya.
// Doublures seulement (faux jev du juge), dates figées et fictives, aucun réseau, aucune base.
// Lancement : node --experimental-strip-types --no-warnings --import ./scripts/ts-loader.mjs .orchestre/preuves/026-217/essai-etape6.mjs
import { envJev } from '../../../scripts/fixtures/contenu/lib/commun.mjs'
import { verdictAccord, accordEncoreValable, cleAccord, preparerDemandeAccord, OPTIONS_DECISION, DEFAUT, PORTEE, versionAvecMedia } from '../../../lib/contenu/accord.ts'

const T0 = Date.parse('2026-01-15T10:00:00Z')
const V = 'Voir la démo'
const tranchee = (o = {}) => ({ statut: 'tranchee', choix: 'accorder', cible: cleAccord('p1', V), texte_version: V, portee: 'securite', le: '2026-01-15T09:00:00Z', ...o })
let echecs = 0
const verifier = (nom, cond) => { console.log(`${cond ? '✅' : '❌'} ${nom}`); if (!cond) echecs++ }

verifier('cadre : options accorder+refuser, défaut refuser, portée securite, une seule recommandée', OPTIONS_DECISION.length === 2 && DEFAUT === 'refuser' && PORTEE === 'securite' && OPTIONS_DECISION.filter((o) => o.recommandee).length === 1 && OPTIONS_DECISION.find((o) => o.recommandee).cle === 'refuser')
verifier('accord tranché valide -> ok', verdictAccord(tranchee(), 'p1', V, T0).ok === true)
verifier('décision ouverte -> refus', verdictAccord(tranchee({ statut: 'ouverte' }), 'p1', V, T0).ok === false)
verifier('défaut appliqué (échéance passée) -> refus', verdictAccord(tranchee({ statut: 'defaut_applique', choix: 'refuser' }), 'p1', V, T0).ok === false)
verifier('défaut appliqué même si le choix est « accorder » -> refus', verdictAccord(tranchee({ statut: 'defaut_applique' }), 'p1', V, T0).ok === false)
verifier('choix refuser -> refus', verdictAccord(tranchee({ choix: 'refuser' }), 'p1', V, T0).ok === false)
verifier('échéance passée portée par la décision -> refus', verdictAccord(tranchee({ echeance: '2026-01-15T09:59:00Z' }), 'p1', V, T0).ok === false)
verifier('accord d’un autre post -> refus', verdictAccord(tranchee({ cible: cleAccord('p2', V) }), 'p1', V, T0).ok === false)
verifier('ancienne version (texte retouché) -> refus', verdictAccord(tranchee(), 'p1', 'Voir la démo !', T0).ok === false)
verifier('clé d’une ancienne version avec texte_version recopié -> refus (empreinte)', verdictAccord(tranchee({ texte_version: 'Voir la démo !' }), 'p1', 'Voir la démo !', T0).ok === false)
verifier('média retouché -> refus', verdictAccord(tranchee({ cible: cleAccord('p1', versionAvecMedia({ texte: V }, 'aaaa')), texte_version: versionAvecMedia({ texte: V }, 'aaaa') }), 'p1', versionAvecMedia({ texte: V }, 'bbbb'), T0).ok === false)
verifier('portée absente -> refus', verdictAccord(tranchee({ portee: undefined }), 'p1', V, T0).ok === false)
verifier('portée autre que securite -> refus', verdictAccord(tranchee({ portee: 'argent' }), 'p1', V, T0).ok === false)
verifier('accord de plus de 7 jours -> refus', verdictAccord(tranchee({ le: '2026-01-01T00:00:00Z' }), 'p1', V, T0).ok === false)
verifier('décision nulle / indéfinie -> refus', verdictAccord(null, 'p1', V, T0).ok === false && verdictAccord(undefined, 'p1', V, T0).ok === false)
verifier('entrée qui lève (cible objet) -> refus sans exception', verdictAccord(tranchee({ cible: { a: 1 } }), 'p1', V, T0).ok === false)
verifier('accordEncoreValable : même texte vrai, texte retouché faux', accordEncoreValable(tranchee(), V) === true && accordEncoreValable(tranchee(), V + '!') === false)
verifier('accordEncoreValable : défaut appliqué faux', accordEncoreValable(tranchee({ statut: 'defaut_applique' }), V) === false)

const post = { id: 'p1', ligne: 'L1', canal: 'tiktok', texte: V }
const DOUBLURE = { enregistrerCout: async () => ({ ok: true }) }
const futur = new Date(Date.now() + 86_400_000).toISOString()
const passe = new Date(Date.now() - 1000).toISOString()
const sans = await preparerDemandeAccord(post, futur)
verifier('demande sans chiffre -> carte, défaut refuser, portée securite, clé = cleAccord', sans.ok === true && sans.corps.defaut === 'refuser' && sans.corps.portee === 'securite' && sans.corps.cle === cleAccord('p1', V) && sans.corps.options.length === 2)
verifier('demande avec échéance passée -> refus', (await preparerDemandeAccord(post, passe)).ok === false)
verifier('demande avec échéance illisible -> refus', (await preparerDemandeAccord(post, 'demain')).ok === false)
verifier('demande avec chiffre sans source -> refus', (await preparerDemandeAccord({ ...post, texte: 'Devis en 24h' }, futur)).ok === false)
verifier('demande avec chiffre, Laya 0,1 -> refus, rien déposé', (await preparerDemandeAccord({ ...post, texte: 'Devis en 24h', source: 'mesure.md' }, futur, { ...DOUBLURE, env: envJev({ reponse: { p: 0.1 } }) })).ok === false)
verifier('demande avec chiffre, Laya en panne -> refus', (await preparerDemandeAccord({ ...post, texte: 'Devis en 24h', source: 'mesure.md' }, futur, { ...DOUBLURE, env: envJev({ indisponible: true }) })).ok === false)
const bon = await preparerDemandeAccord({ ...post, texte: 'Devis en 24h', source: 'mesure.md' }, futur, { ...DOUBLURE, env: envJev({ reponse: { p: 0.9 } }) })
verifier('demande avec chiffre, Laya 0,9 -> carte (Laya ne remplace pas le geste : aucun accord n’est rendu)', bon.ok === true && !('decision' in bon) && bon.preuves.length === 1)
verifier('légende chiffrée cachée dans les sous-titres incrustés -> contrôlée', (await preparerDemandeAccord({ ...post, sous_titres: '3 devis offerts', source: 'mesure.md' }, futur, { ...DOUBLURE, env: envJev({ reponse: { p: 0.1 } }) })).ok === false)
process.exitCode = echecs ? 1 : 0
console.log(echecs ? `essai-etape6 : ${echecs} échec(s)` : 'essai-etape6 : tout est vert')
