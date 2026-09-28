// scripts/fixtures/026/entrant/corps.mjs — jeux d'essai de POST /api/prospects/entrant (026-145), écrits en 026-142.
// Tous les noms contiennent « Témoin », tous les domaines sont en .invalid : jamais une vraie personne, jamais une
// vraie adresse. Rien ici n'est exécuté ni envoyé : ce sont des corps de requête, lus par prospects-entrant-qa.mjs.

const BASE = { entreprise: 'Menuiserie Témoin 026-142', metier: 'menuisier', commune: 'Témoinville', accord: true }

/** Deux corps VALIDES (site, compte Instagram), chacun avec une adresse e-mail en .invalid (revue du 25/09 :
 * l'adresse est obligatoire). */
export const VALIDES = [
  { nom: 'site-valide', corps: { ...BASE, site_ou_instagram: 'https://menuiserie-temoin-026.invalid', email: 'contact@menuiserie-temoin-026.invalid' } },
  { nom: 'instagram-valide', corps: { ...BASE, entreprise: 'Plomberie Témoin 026-142', metier: 'plombier', site_ou_instagram: '@plomberie_temoin_026', email: 'contact@plomberie-temoin-026.invalid' } },
]

/** Corps FAUTIFS : chacun porte une `raison` connue, pour l'autocontrôle --temoin (chaque corps fautif porte une
 * étiquette de raison connue) et pour que le rapport du juge nomme la bonne raison sans deviner. */
export const FAUTIFS = [
  { nom: 'metier-inconnu', raison: 'metier', corps: { ...BASE, metier: 'astronaute', site_ou_instagram: 'https://temoin-metier-inconnu.invalid', email: 'a@temoin-metier-inconnu.invalid' } },
  { nom: 'entreprise-1-signe', raison: 'entreprise', corps: { ...BASE, entreprise: 'T', site_ou_instagram: 'https://temoin-entreprise-1.invalid', email: 'a@temoin-entreprise-1.invalid' } },
  { nom: 'commune-vide', raison: 'commune', corps: { ...BASE, commune: '', site_ou_instagram: 'https://temoin-commune-vide.invalid', email: 'a@temoin-commune-vide.invalid' } },
  { nom: 'contact-vide', raison: 'site_ou_instagram', corps: { ...BASE, site_ou_instagram: '', email: 'a@temoin-contact-vide.invalid' } },
  { nom: 'domaine-mal-forme', raison: 'site_ou_instagram', corps: { ...BASE, site_ou_instagram: 'https://://temoin-domaine-invalid', email: 'a@temoin-domaine-mal-forme.invalid' } },
  { nom: 'instagram-31-signes', raison: 'site_ou_instagram', corps: { ...BASE, site_ou_instagram: '@' + 't'.repeat(31), email: 'a@temoin-instagram-31.invalid' } },
  { nom: 'email-absent', raison: 'email', corps: { entreprise: BASE.entreprise, metier: BASE.metier, commune: BASE.commune, accord: true, site_ou_instagram: 'https://temoin-email-absent.invalid' } },
  { nom: 'email-mal-forme', raison: 'email', corps: { ...BASE, site_ou_instagram: 'https://temoin-email-mal-forme.invalid', email: 'pas-un-email' } },
  // « domaine de tiers » (026-145 PE-4) : un domaine syntaxiquement valide mais sans TLD exploitable — une adresse
  // qu'aucun message sollicité ne pourrait jamais atteindre.
  { nom: 'email-domaine-suspect', raison: 'email', corps: { ...BASE, site_ou_instagram: 'https://temoin-email-domaine-suspect.invalid', email: 'contact@localhost' } },
  { nom: 'accord-absent', raison: 'accord', corps: { entreprise: BASE.entreprise, metier: BASE.metier, commune: BASE.commune, site_ou_instagram: 'https://temoin-accord-absent.invalid', email: 'a@temoin-accord-absent.invalid' } },
  { nom: 'accord-chaine', raison: 'accord', corps: { ...BASE, accord: 'true', site_ou_instagram: 'https://temoin-accord-chaine.invalid', email: 'a@temoin-accord-chaine.invalid' } },
  { nom: 'champ-piege', raison: 'honeypot', corps: { ...BASE, societe: 'Robot Témoin', site_ou_instagram: 'https://temoin-honeypot.invalid', email: 'a@temoin-honeypot.invalid' } },
]

/** Corps littéraux (chaînes déjà sérialisées), pour les cas que JSON.stringify(objet) ne peut pas produire. */
export const CORPS_BRUTS = [
  { nom: 'json-invalide', raison: 'json', brut: '{ "entreprise": "Témoin", "metier": ' },
  { nom: 'corps-9ko', raison: 'taille', brut: JSON.stringify({ ...BASE, site_ou_instagram: 'https://temoin-9ko.invalid', email: 'a@temoin-9ko.invalid', bourrage: 'x'.repeat(9 * 1024) }) },
]
