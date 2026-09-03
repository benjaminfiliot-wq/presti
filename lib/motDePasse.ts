// Force des mots de passe (v4 §11 — vidéo « 987321, azerty, 123 »).
//
// L'audit a constaté que `12345678`, `password` et `azerty123` étaient acceptés à
// l'inscription : GoTrue n'impose que 6 caractères. La vraie barrière est le réglage
// du tableau de bord Supabase — celui-ci s'applique même à un appel direct à l'API.
// Ce qui suit couvre le parcours réel, celui que prennent 100 % des artisans, et
// surtout : il DIT pourquoi, au lieu de refuser sans expliquer.
//
// Un mot de passe faible ne met pas en danger que son propriétaire : c'est par là que
// passe le bourrage d'identifiants, et le compte contient le fichier clients de l'artisan.

/** Les mots de passe qu'un attaquant essaie dans ses cent premières tentatives. */
const TROP_COURANTS = [
  'password', 'motdepasse', '123456', '12345678', '123456789', '1234567890',
  'azerty', 'azertyui', 'azerty123', 'qwerty', 'qwerty123', 'abc123',
  'iloveyou', 'soleil', 'bonjour', 'chouchou', 'doudou', 'loulou',
  'admin', 'administrateur', 'welcome', 'bienvenue', 'letmein',
  'presti', 'presti123', 'artisan', 'chantier', 'batiment', 'devis',
  '000000', '111111', '987321', '987654321', 'motdepasse1', 'password1',
]

export type Force = {
  ok: boolean
  score: 0 | 1 | 2 | 3
  /** Ce qui bloque, dit simplement. Vide quand c'est bon. */
  probleme: string | null
  /** Un conseil constructif, même quand c'est déjà bon. */
  conseil: string
}

const sansAccent = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export function evaluerMotDePasse(mdp: string, email = ''): Force {
  const m = String(mdp ?? '')
  const n = sansAccent(m)

  if (m.length < 10) {
    return {
      ok: false, score: 0,
      probleme: 'Trop court : il faut au moins 10 caractères.',
      conseil: 'Trois mots qui n’ont rien à voir font un excellent mot de passe : « tuile-caramel-vendredi ».',
    }
  }

  // Une suite de chiffres, si longue soit-elle, se casse en quelques secondes.
  if (/^\d+$/.test(m)) {
    return {
      ok: false, score: 0,
      probleme: 'Uniquement des chiffres : c’est testé en premier par un attaquant.',
      conseil: 'Ajoutez des mots. « 4-tuiles-caramel » vaut mille fois « 04071985 ».',
    }
  }

  if (TROP_COURANTS.some((c) => n === c || n.replace(/[^a-z]/g, '') === c)) {
    return {
      ok: false, score: 0,
      probleme: 'Ce mot de passe figure dans toutes les listes d’attaque.',
      conseil: 'Prenez trois mots sans rapport entre eux — c’est plus solide et plus facile à retenir.',
    }
  }

  // Le mot de passe ne doit pas être l'email, ni le nom du domaine.
  const local = sansAccent(email.split('@')[0] || '')
  if (local.length >= 4 && (n.includes(local) || local.includes(n))) {
    return {
      ok: false, score: 0,
      probleme: 'Trop proche de votre adresse email : c’est la première chose essayée.',
      conseil: 'Choisissez quelque chose qui n’a aucun rapport avec votre email ou votre entreprise.',
    }
  }

  // Répétitions et suites (aaaaaaaaaa, 1234567890, abcdefghij).
  if (/^(.)\1+$/.test(m) || /0123456789|abcdefghij|azertyuiop/.test(n)) {
    return {
      ok: false, score: 0,
      probleme: 'Suite ou répétition : deviné instantanément.',
      conseil: 'Mélangez des mots qui n’ont rien à voir entre eux.',
    }
  }

  // À partir d'ici c'est accepté. Le score sert seulement à encourager mieux.
  const familles = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter((r) => r.test(m)).length
  const score = (m.length >= 16 && familles >= 2) || familles >= 3 ? 3 : m.length >= 13 ? 2 : 1
  return {
    ok: true, score: score as 1 | 2 | 3, probleme: null,
    conseil: score === 3
      ? 'Solide.'
      : score === 2
        ? 'Correct. Un mot de plus le rendrait très difficile à casser.'
        : 'Accepté, mais court. Allongez-le plutôt que d’ajouter des symboles : la longueur compte davantage.',
  }
}

/**
 * Traduit les messages d'erreur de Supabase.
 * Ils sortaient en anglais brut sur un produit français — « Invalid login credentials »
 * affiché tel quel à un artisan qui s'est trompé de mot de passe.
 */
export function messageAuth(brut: string): string {
  const m = brut.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Email ou mot de passe incorrect.'
  if (m.includes('email not confirmed')) return 'Votre email n’est pas encore confirmé — regardez votre boîte de réception.'
  if (m.includes('user already registered') || m.includes('already been registered')) return 'Un compte existe déjà avec cet email. Connectez-vous, ou demandez un nouveau mot de passe.'
  if (m.includes('password should be at least')) return 'Mot de passe trop court.'
  if (m.includes('weak password') || m.includes('pwned')) return 'Ce mot de passe est trop courant. Choisissez-en un autre.'
  if (m.includes('rate limit') || m.includes('too many')) return 'Trop de tentatives. Patientez quelques minutes.'
  if (m.includes('email address') && m.includes('invalid')) return 'Cette adresse email n’est pas valide.'
  if (m.includes('network') || m.includes('fetch')) return 'Connexion impossible. Vérifiez votre réseau et réessayez.'
  return 'Quelque chose n’a pas fonctionné. Réessayez dans un instant.'
}

// ─────────────────────────────────────────────────────────────────────────────
// Mots de passe déjà présents dans des fuites de données (Have I Been Pwned).
//
// Supabase propose ce contrôle nativement, mais il est réservé au plan Pro. On le
// refait ici : l'API de HIBP est libre et sans clé, et surtout elle est conçue pour
// ne JAMAIS recevoir le mot de passe. On calcule son empreinte SHA-1, on n'envoie
// que les 5 PREMIERS caractères de cette empreinte, et on reçoit en retour tous les
// suffixes qui commencent pareil (~800). La comparaison finale se fait ici, en
// local. HIBP — comme notre propre serveur qui relaie l'appel — ne peut donc pas
// savoir de quel mot de passe il s'agit : c'est le principe dit de k-anonymat.
//
// La déni-liste au-dessus couvre les cent classiques ; ceci couvre les 850 millions
// de mots de passe réellement volés. « Chantier2019! » passe toutes les règles de
// forme et se trouve pourtant dans les fuites : c'est exactement ce qu'on attrape.

/** Empreinte SHA-1 en hexadécimal majuscule, via l'API Web Crypto (navigateur ET serveur). */
async function empreinteSha1(texte: string): Promise<string> {
  const octets = new TextEncoder().encode(texte)
  const digest = await globalThis.crypto.subtle.digest('SHA-1', octets)
  return Array.from(new Uint8Array(digest))
    .map((o) => o.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

export type Fuite = {
  /** true seulement si on a la preuve que le mot de passe est dans une fuite. */
  compromis: boolean
  /** Nombre de fuites connues, pour le dire concrètement à l'artisan. */
  occurrences: number
  /** true si le service n'a pas répondu : on ne bloque pas, on ne prétend rien. */
  indisponible: boolean
}

const PAS_DE_REPONSE: Fuite = { compromis: false, occurrences: 0, indisponible: true }

/**
 * Cherche le mot de passe dans les fuites connues.
 *
 * `recuperer` reçoit le préfixe de 5 caractères et doit rendre la liste brute de HIBP.
 * Par défaut on passe par notre propre serveur : la politique de sécurité du site
 * (CSP) n'autorise aucun appel sortant depuis le navigateur, et il n'y a aucune
 * raison de l'ouvrir pour ça.
 *
 * En cas de panne ou de lenteur du service, on laisse passer. Bloquer une inscription
 * parce qu'un service tiers est en rade, ce serait échanger un risque contre un autre.
 */
export async function verifierFuite(
  mdp: string,
  recuperer: (prefixe: string) => Promise<string> = recupererDepuisNotreServeur,
): Promise<Fuite> {
  if (!mdp) return PAS_DE_REPONSE
  try {
    const empreinte = await empreinteSha1(mdp)
    const prefixe = empreinte.slice(0, 5)
    const suffixe = empreinte.slice(5)
    const liste = await recuperer(prefixe)
    for (const ligne of liste.split('\n')) {
      const [suf, nb] = ligne.trim().split(':')
      if (suf === suffixe) {
        return { compromis: true, occurrences: Number(nb) || 1, indisponible: false }
      }
    }
    return { compromis: false, occurrences: 0, indisponible: false }
  } catch {
    return PAS_DE_REPONSE
  }
}

async function recupererDepuisNotreServeur(prefixe: string): Promise<string> {
  const ctrl = new AbortController()
  const minuteur = setTimeout(() => ctrl.abort(), 4000)
  try {
    const res = await fetch('/api/auth/mdp-fuite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefixe }),
      signal: ctrl.signal,
    })
    if (!res.ok) throw new Error(String(res.status))
    return await res.text()
  } finally {
    clearTimeout(minuteur)
  }
}

/** Appel direct à HIBP, pour le code qui tourne déjà sur le serveur (pas de CSP). */
export async function recupererDepuisHibp(prefixe: string): Promise<string> {
  const ctrl = new AbortController()
  const minuteur = setTimeout(() => ctrl.abort(), 4000)
  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefixe}`, {
      // Add-Padding : HIBP complète la réponse avec de faux suffixes pour que sa TAILLE
      // ne trahisse rien. Sans ça, un observateur du réseau pourrait déduire des choses
      // du simple poids de la réponse.
      headers: { 'Add-Padding': 'true', 'User-Agent': 'presti-verification-mot-de-passe' },
      signal: ctrl.signal,
    })
    if (!res.ok) throw new Error(String(res.status))
    return await res.text()
  } finally {
    clearTimeout(minuteur)
  }
}

/** Le message montré à l'artisan. Concret : on lui dit ce qui s'est passé, pas « invalide ». */
export function messageFuite(f: Fuite): string {
  const n = f.occurrences.toLocaleString('fr-FR')
  return `Ce mot de passe fait partie de fuites de données connues (retrouvé ${n} fois). Il n’est pas « faible » au sens des règles — il est déjà dans les listes qu’utilisent les attaquants. Choisissez-en un autre.`
}
