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

export function canalEntreprise(): (typeof ENTREPRISE_MAIL & { identifiant: string; motDePasse: string }) | null {
  const identifiant = (process.env.PRESTI_MAIL_IMAP_USER || '').trim()
  const motDePasse = process.env.PRESTI_MAIL_IMAP_PASS || ''
  if (!identifiant || !motDePasse) return null
  return { ...ENTREPRISE_MAIL, identifiant, motDePasse }
}

/** Teste réellement la connexion IMAP. Messages d'erreur en français, actionnables. */
export async function testerImap(hote: string, port: number, user: string, pass: string): Promise<{ ok: true } | { ok: false; erreur: string }> {
  try {
    const { ImapFlow } = await import('imapflow')
    const client = new ImapFlow({ host: hote, port, secure: port === 993, auth: { user, pass }, logger: false })
    await client.connect()
    await client.logout()
    return { ok: true }
  } catch (e) {
    const m = (e instanceof Error ? e.message : String(e)).toLowerCase()
    if (m.includes('auth') || m.includes('credential') || m.includes('login')) {
      return { ok: false, erreur: 'Identifiants refusés. Avec Gmail ou Outlook, il faut créer un « mot de passe d’application » — le mot de passe habituel ne fonctionne pas.' }
    }
    if (m.includes('enotfound') || m.includes('getaddrinfo')) return { ok: false, erreur: 'Serveur IMAP introuvable — vérifiez l’adresse du serveur.' }
    if (m.includes('timeout') || m.includes('etimedout')) return { ok: false, erreur: 'Le serveur ne répond pas (délai dépassé).' }
    return { ok: false, erreur: 'Connexion impossible. Vérifiez le serveur, le port et les identifiants.' }
  }
}
