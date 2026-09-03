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
