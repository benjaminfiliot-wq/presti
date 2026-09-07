// Réglages IMAP/SMTP des principaux fournisseurs français (v4 §B2) : l'artisan saisit
// son adresse et son mot de passe, on devine le reste — il n'a rien à aller chercher.
const FOURNISSEURS: { motif: RegExp; imap: string; smtp: string; nom: string }[] = [
  { motif: /@gmail\.com$|@googlemail\.com$/i, imap: 'imap.gmail.com', smtp: 'smtp.gmail.com', nom: 'Gmail' },
  { motif: /@outlook\.|@hotmail\.|@live\./i, imap: 'outlook.office365.com', smtp: 'smtp-mail.outlook.com', nom: 'Outlook' },
  { motif: /@orange\.fr$|@wanadoo\.fr$/i, imap: 'imap.orange.fr', smtp: 'smtp.orange.fr', nom: 'Orange' },
  { motif: /@free\.fr$/i, imap: 'imap.free.fr', smtp: 'smtp.free.fr', nom: 'Free' },
  { motif: /@sfr\.fr$|@neuf\.fr$/i, imap: 'imap.sfr.fr', smtp: 'smtp.sfr.fr', nom: 'SFR' },
  { motif: /@laposte\.net$/i, imap: 'imap.laposte.net', smtp: 'smtp.laposte.net', nom: 'La Poste' },
  { motif: /@ovh\.|@ovhcloud\./i, imap: 'ssl0.ovh.net', smtp: 'ssl0.ovh.net', nom: 'OVH' },
]

export function devineFournisseur(adresse: string) {
  const f = FOURNISSEURS.find((x) => x.motif.test(adresse))
  return f ? { imap_hote: f.imap, smtp_hote: f.smtp, fournisseur: f.nom } : null
}

// ── Boîte de l'ENTREPRISE (sprint J-1 §15) : contact@prestiapp.fr, hébergée chez OVH.
// Les identifiants ne vivent QUE dans les variables d'environnement Vercel
// (PRESTI_MAIL_IMAP_USER / PRESTI_MAIL_IMAP_PASS) — jamais dans le dépôt. Tant qu'elles
// n'existent pas, cette fonction renvoie null et tout ce qui en dépend se tait : rien
// d'affiché, rien qui plante. `scripts/canal-entreprise.mjs` s'en sert pour enregistrer la
// boîte comme canal (chiffré) du compte fondateur.
export const ENTREPRISE_MAIL = {
  adresse: 'contact@prestiapp.fr',
  imap_hote: 'ssl0.ovh.net', imap_port: 993,
  smtp_hote: 'ssl0.ovh.net', smtp_port: 465,
  libelle: 'Presti — contact@prestiapp.fr',
} as const

/** Les identifiants de la boîte de l'entreprise, hôte compris — la SEULE résolution du dépôt.
 *
 *  Le 07/09, deux fichiers devinaient l'hôte différemment pour le même compte (`imap.gmail.com` dans
 *  `app/api/control/inbox`, `ssl0.ovh.net` dans la relève du Poste de contrôle). La relève échouait
 *  sur « Command failed » sans que rien ne dise qu'elle frappait peut-être le mauvais serveur.
 *
 *  L'ordre, et pourquoi :
 *    1. `IMAP_HOST` (ou `PRESTI_MAIL_IMAP_HOST`) posé à la main : c'est une décision, on obéit ;
 *    2. déduit de l'adresse par `devineFournisseur` — la même fonction qu'on offre aux artisans ;
 *    3. `ENTREPRISE_MAIL.imap_hote`, dernier recours pour une adresse de domaine propre.
 *
 *  Les noms de variables : `IMAP_*` et `PRESTI_MAIL_IMAP_*` ont coexisté, la production utilise les
 *  premiers, la documentation les seconds. On accepte les deux plutôt que de laisser une boîte muette
 *  pour une histoire de préfixe. */
export function boiteEntrepriseResolue(): { hote: string; port: number; user: string; pass: string; devine: boolean } | null {
  const user = (process.env.IMAP_USER || process.env.PRESTI_MAIL_IMAP_USER || '').trim()
  const pass = process.env.IMAP_PASS || process.env.PRESTI_MAIL_IMAP_PASS || ''
  if (!user || !pass) return null
  const pose = (process.env.IMAP_HOST || process.env.PRESTI_MAIL_IMAP_HOST || '').trim()
  const devine = devineFournisseur(user)
  return {
    user, pass,
    hote: pose || devine?.imap_hote || ENTREPRISE_MAIL.imap_hote,
    port: Number(process.env.IMAP_PORT || process.env.PRESTI_MAIL_IMAP_PORT || ENTREPRISE_MAIL.imap_port),
    devine: !pose && !!devine,
  }
}

export function canalEntreprise(): (typeof ENTREPRISE_MAIL & { identifiant: string; motDePasse: string }) | null {
  const identifiant = (process.env.PRESTI_MAIL_IMAP_USER || '').trim()
  const motDePasse = process.env.PRESTI_MAIL_IMAP_PASS || ''
  if (!identifiant || !motDePasse) return null
  return { ...ENTREPRISE_MAIL, identifiant, motDePasse }
}

/** Teste réellement la connexion IMAP. Messages d'erreur en français, actionnables.
 *
 *  Le message BRUT du serveur est rendu à part : les trois cas reconnus ci-dessous ne couvrent pas
 *  tout, et quand aucun ne tombe juste, une phrase générique ne permet plus d'avancer — on essaie
 *  des choses au hasard (constaté le 07/09, deux heures perdues sur « Connexion impossible »).
 *  Ce message ne contient ni identifiant ni mot de passe : c'est la réponse du serveur. */
export async function testerImap(hote: string, port: number, user: string, pass: string): Promise<{ ok: true; ms: number } | { ok: false; erreur: string; brut: string; ms: number }> {
  const t0 = Date.now()
  try {
    const { ImapFlow } = await import('imapflow')
    const client = new ImapFlow({ host: hote, port, secure: port === 993, auth: { user, pass }, logger: false })
    await client.connect()
    await client.logout()
    return { ok: true, ms: Date.now() - t0 }
  } catch (e) {
    // Les DRAPEAUX d'abord, le message ensuite. `imapflow` pose `authenticationFailed` quand c'est
    // le LOGIN qui a été refusé, et `responseText` porte la phrase exacte du serveur. Le message,
    // lui, vaut « Command failed » pour à peu près tout : chercher des mots dedans, c'est deviner.
    const detail = e as { authenticationFailed?: boolean; responseText?: string; serverResponseCode?: string; code?: string }
    const brut = [detail?.responseText, e instanceof Error ? e.message : String(e), detail?.serverResponseCode, detail?.code]
      .filter(Boolean).join(' · ').slice(0, 160)
    const m = brut.toLowerCase()
    const ms = Date.now() - t0
    if (detail?.authenticationFailed === true) {
      return { ok: false, erreur: 'Identifiants refusés par le serveur. Le compte existe-t-il, et le mot de passe est-il bien celui de la boîte (pas celui de l’espace client) ? Avec Gmail ou Outlook, il faut un « mot de passe d’application ».', brut, ms }
    }
    // Un délai dépassé et un mot de passe refusé ne se ressemblent pas : le refus revient tout de
    // suite, le délai met dix secondes ou plus. C'est souvent la seule chose qui les distingue,
    // parce que les serveurs ne disent pas toujours pourquoi ils ferment la porte.
    if (m.includes('auth') || m.includes('credential') || m.includes('login') || m.includes('invalid')) {
      return { ok: false, erreur: 'Identifiants refusés. Avec Gmail ou Outlook, il faut créer un « mot de passe d’application » — le mot de passe habituel ne fonctionne pas.', brut, ms }
    }
    if (m.includes('enotfound') || m.includes('getaddrinfo')) return { ok: false, erreur: 'Serveur IMAP introuvable — vérifiez l’adresse du serveur.', brut, ms }
    if (m.includes('timeout') || m.includes('etimedout') || ms > 8000) return { ok: false, erreur: `Le serveur ne répond pas (délai dépassé après ${Math.round(ms / 1000)} s). Vérifiez le nom du serveur : chez OVH, ce n’est pas toujours ssl0.ovh.net.`, brut, ms }
    if (m.includes('econnrefused')) return { ok: false, erreur: 'Le serveur refuse la connexion sur ce port.', brut, ms }
    return { ok: false, erreur: 'Connexion impossible. Vérifiez le serveur, le port et les identifiants.', brut, ms }
  }
}
