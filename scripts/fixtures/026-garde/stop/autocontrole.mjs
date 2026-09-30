// scripts/fixtures/026-garde/stop/autocontrole.mjs — l'auto-contrôle des jeux d'essai du juge garde-stop-qa (le contrôle « JA-3 » du
// lot et l'option --auto-controle du juge). Il ne juge aucun module du dépôt : il prouve que les instruments du juge sont justes.
//   AC-1 les jeux d'essai se lisent : listes non vides, sans doublon, aucune donnée réelle (tout domaine en .invalid, hormis le
//        gmail.com de l'essai « messagerie gratuite » qui ne désigne personne) ;
//   AC-2 la doublure de la base applique ses règles : une opposition reconnaît l'adresse sous toutes ses casses et refuse l'envoi ;
//        un domaine de messagerie gratuite n'y est jamais une clé ; une opposition n'atteint pas une autre adresse de gmail.com ;
//   AC-3 les étiquettes du corpus tiennent contre un contrôle INDEPENDANT du module jugé (écrit ici, autrement que les regex du
//        Standard) : chaque STOP en est un, aucun message ordinaire n'en est un, chaque demande RGPD en est une, chaque expéditeur
//        inexploitable l'est, l'expéditeur ordinaire est lisible.
import { creerHorloge } from '../../026-acquisition/horloge-factice.mjs'
import { creerMagasin } from '../../026-acquisition/magasin-memoire.mjs'
import * as K from './corpus.mjs'

const plier = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’`´]/g, "'")
/** Un refus, lu autrement que le Standard : le premier mot est « stop », ou une expression de refus s'y trouve. */
export function refusIndependant(t) {
  const f = plier(t)
  const premier = f.replace(/^[^a-z]+/, '').split(/[^a-z]+/)[0]
  return premier === 'stop' || ['arretez', 'desinscri', "m'oppose", 'contactez plus'].some((m) => f.includes(m))
}
export function rgpdIndependant(t) {
  const f = plier(t)
  return ['rgpd', 'donnees personnelles', "droit d'acces", 'cnil', 'article 17', 'supprimez mes donnees'].some((m) => f.includes(m))
}
/** Une adresse lisible : deux morceaux autour d'un seul @, un domaine pointé, aucun espace, aucun double point. */
export function adresseIndependante(brut) {
  if (typeof brut !== 'string') return false
  const m = /<([^<>]*)>\s*$/.exec(brut.trim())
  const a = (m ? m[1] : brut).trim()
  const morceaux = a.split('@')
  if (morceaux.length !== 2 || /\s/.test(a)) return false
  const [local, domaine] = morceaux
  return local.length > 0 && !local.includes('..') && /^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(domaine)
}

const doublons = (l) => l.filter((x, i) => l.indexOf(x) !== i)

export async function autoControle() {
  const e = []
  // AC-1
  for (const [nom, liste, min] of [['STOPS', K.STOPS, 20], ['RGPDS', K.RGPDS, 6], ['EXPEDITEURS_INEXPLOITABLES', K.EXPEDITEURS_INEXPLOITABLES, 10], ['ORDINAIRES_HORS_FIL', K.ORDINAIRES_HORS_FIL, 8]]) {
    if (!Array.isArray(liste) || liste.length < min) e.push(`AC-1 ${nom} : ${liste?.length ?? 0} entrée(s), ${min} au moins`)
    else if (doublons(liste).length) e.push(`AC-1 ${nom} : doublons ${JSON.stringify(doublons(liste))}`)
  }
  // Les expéditeurs inexploitables sont volontairement mal formés (« jean@atelier ») : ils ne portent aucun domaine réel.
  const { EXPEDITEURS_INEXPLOITABLES: _mal, ...reste } = K
  const tout = JSON.stringify(reste)
  for (const m of tout.matchAll(/@([A-Za-z0-9.-]+)/g)) if (!/\.invalid$/i.test(m[1]) && !/^gmail\.com$/i.test(m[1])) e.push(`AC-1 domaine « ${m[1]} » : .invalid attendu (aucune donnée réelle)`)
  if (K.EXPEDITEUR.toLowerCase() !== K.ADRESSE_ATTENDUE) e.push('AC-1 EXPEDITEUR ne donne pas ADRESSE_ATTENDUE une fois mis en minuscules')
  if (K.EXPEDITEUR_AFFICHE.toLowerCase().match(/<([^>]*)>/)?.[1] !== K.ADRESSE_AFFICHE) e.push('AC-1 EXPEDITEUR_AFFICHE ne donne pas ADRESSE_AFFICHE')
  // AC-2
  const H = creerHorloge(Date.parse('2026-10-14T08:00:00.000Z'))
  const M = creerMagasin({ horloge: H })
  const pid = M.inserer({ cle_dedup: 'domaine:autre-fil-temoin.invalid', source: 'ademe_rge', cible: 'artisan', siren: '877777771', domaine: 'autre-fil-temoin.invalid', entreprise: 'Essai', metier: 'menuisier', froid: true, etape: 'envoye', faits: [], canaux: [] })
  const envoi = (dest) => ({ prospect_id: pid, type: 'relance', canal: 'email_sollicite', envoyeur: 'gmail', destinataire: dest, objet: null, texte: 'Bonjour', empreinte_texte: 'x', modele_id: 'm', variante: null, fait_id: null, douleur_id: null, fil_envoi_id: null, conversation_id: null, preuve_demande: null, reference: null })
  const avant = await M.preparerEnvoi(envoi(K.ADRESSE_ATTENDUE))
  if (avant.raison === 'opposition') e.push('AC-2 la doublure refuse « opposition » avant toute opposition')
  await M.opposer({ email: K.ADRESSE_ATTENDUE }, 'stop', 'essai')
  if (!(await M.estOppose({ email: K.ADRESSE_ATTENDUE.toUpperCase() }))) e.push('AC-2 la doublure ne reconnaît pas l’adresse en MAJUSCULES')
  const apres = await M.preparerEnvoi(envoi(K.ADRESSE_ATTENDUE.toUpperCase()))
  if (apres.ok !== false || apres.raison !== 'opposition') e.push(`AC-2 la doublure laisse partir un envoi vers une adresse opposée : ${JSON.stringify(apres)}`)
  await M.opposer({ email: K.ADRESSE_GRATUITE, domaine: 'gmail.com' }, 'stop', 'essai')
  if (M.etat().oppositions.some((x) => x.cle_type === 'domaine')) e.push('AC-2 la doublure met gmail.com en opposition')
  const autre = await M.preparerEnvoi(envoi(K.AUTRE_ADRESSE_GRATUITE))
  if (autre.raison === 'opposition') e.push('AC-2 la doublure oppose une autre adresse de gmail.com')
  // AC-3
  for (const t of K.STOPS) if (!refusIndependant(t)) e.push(`AC-3 « ${t.slice(0, 30)} » n’est pas un refus pour le contrôle indépendant`)
  for (const t of K.ORDINAIRES_HORS_FIL) if (refusIndependant(t)) e.push(`AC-3 « ${t.slice(0, 40)} » est un refus pour le contrôle indépendant (faux positif du corpus)`)
  for (const t of K.RGPDS) if (!rgpdIndependant(t)) e.push(`AC-3 « ${t.slice(0, 30)} » n’est pas une demande RGPD pour le contrôle indépendant`)
  for (const t of K.ORDINAIRES_HORS_FIL) if (rgpdIndependant(t)) e.push(`AC-3 « ${t.slice(0, 40)} » est une demande RGPD pour le contrôle indépendant`)
  if (!rgpdIndependant(K.STOP_ET_RGPD) || !refusIndependant(K.STOP_ET_RGPD)) e.push('AC-3 STOP_ET_RGPD doit être à la fois un refus et une demande RGPD')
  for (const x of K.EXPEDITEURS_INEXPLOITABLES) if (adresseIndependante(x)) e.push(`AC-3 l’expéditeur ${JSON.stringify(x)} est une adresse lisible : inexploitable attendu`)
  for (const x of [K.EXPEDITEUR, K.EXPEDITEUR_AFFICHE, K.EXPEDITEUR_GRATUIT]) if (!adresseIndependante(x)) e.push(`AC-3 l’expéditeur ${JSON.stringify(x)} n’est pas lisible`)
  return { echecs: e, detail: `jeux d'essai lus (${K.STOPS.length} STOP, ${K.RGPDS.length} RGPD, ${K.EXPEDITEURS_INEXPLOITABLES.length} expéditeurs inexploitables, ${K.ORDINAIRES_HORS_FIL.length} ordinaires), doublure juste, étiquettes confirmées par un contrôle indépendant` }
}
