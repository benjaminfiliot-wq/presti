import crypto from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { MEDIA_BUCKET } from '@/lib/media'
import { notifierEntreprise } from '@/lib/email'
import { stripe } from '@/lib/stripe'
import { PREFIXE_ADRESSE_PURGEE } from '@/lib/urls'
import { commandesEnLigneDe, marquerSuppression } from '@/lib/siteRetrait'

// Purge des comptes dont la suppression a été demandée il y a plus de 30 jours (§6, migration
// 0052). Appelée par le cron quotidien des relances : le plan Vercel Hobby n'accepte que deux
// tâches planifiées et les deux existent déjà (relances, relève des boîtes) — pas de troisième.
// La route /api/cron/purge-comptes reste appelable à la main avec le secret.
//
// Deux sorts possibles (audit final, auditeur B, bloquant n°2) :
//
//  · Le compte n'a émis AUCUNE facture → effacé pour de bon : l'utilisateur auth disparaît et
//    la cascade emporte la ligne artisan, les conversations, devis, clients, tarifs, images.
//
//  · Le compte a émis au moins une facture → ANONYMISÉ, pas effacé. Une facture émise doit
//    être conservée dix ans (art. L. 102 B du LPF) et le trigger `factures_conservees` (0041)
//    refuse de la supprimer — à raison. Avant, la purge avalait ce refus : le compte restait
//    entier pour toujours, l'artisan croyait ses données effacées, personne n'était prévenu.
//    Maintenant on efface tout ce que la loi n'oblige pas à garder (conversations, devis non
//    facturés, clients non facturés, coordonnées, images, accès) et on garde le strict légal :
//    les factures émises, les devis et clients qu'elles citent, et l'identité d'émetteur
//    (nom, forme juridique, SIRET, adresse, n° de TVA) que le PDF doit pouvoir réimprimer.
//    C'est l'exception prévue par le RGPD (art. 17.3 b : obligation légale de conservation).
//    L'utilisateur auth est banni et son email remplacé : plus personne ne peut se connecter.

export const JOURS_DE_GRACE = 30
// Le préfixe vit dans lib/urls.ts, où la validation des adresses le refuse (la base aussi, 0095) ; réexporté pour
// ceux qui l'importent d'ici (app/api/leads).
export { PREFIXE_ADRESSE_PURGEE }

/** Adresse de remplacement d'un compte anonymisé — reconnaissable, jamais délivrable. */
export const emailAnonyme = (id: string) => `supprime-${id.slice(0, 8)}@anonyme.invalid`

// Tables portant `artisan_id` à vider explicitement quand la ligne artisan est conservée
// (elles cascadent d'elles-mêmes quand le compte est effacé). `factures`, `factures_lignes`
// n'y sont pas : elles restent. `devis` et `clients` sont traités à part (ceux que cite une
// facture émise restent).
const TABLES_A_VIDER = [
  'relances', 'leads', 'canaux', 'clients_plateforme', 'clients_liens', 'plateforme_config',
  'regles_automatisation', 'prix_artisan', 'prix_observations', 'materiaux', 'mouvements_stock',
  'fournisseurs', 'listes_achat',
  // 0150 — le journal et les conversations de l'assistant de gestion (une table absente est tolérée ci-dessous).
  'assistant_journal', 'assistant_conversations',
  // 0157 — les cartes et actions de l'assistant de gestion (textes d'e-mails, lignes de devis : données du compte).
  'assistant_actions',
  // 0141 — le CRM « atelier vivant » (audit RGPD du 12/10 : l'anonymisation laissait équipe, chantiers et notes).
  'crm_notes', 'crm_journal', 'chantier_materiaux', 'chantier_taches', 'chantier_equipe',
  // 0162 à 0164 — rappels du CRM, photos et pièces du chantier (les fichiers partent avec viderStockage), lien d'agenda.
  'crm_rappels', 'chantier_pieces', 'crm_agenda',
  // 0165 — les réglages de l'après-chantier (textes de l'artisan).
  'crm_apres_chantier',
  // 0171 — les refus d'après-chantier (empreintes des adresses de clients qui ont dit non) et 0172 — les réglages du CRM : colonnes
  // du compte, à vider avec lui quand la ligne artisan est conservée (audit RGPD du 20/10 ; elles cascadent déjà à l'effacement complet).
  'crm_apres_opposition', 'crm_reglages',
  // 0158 — les commandes de matériel aux fournisseurs (nom et contact du fournisseur, lignes) et 0159 — le journal des relances d'impayés
  // (l'ADRESSE du client relancé, en clair) : la facture reste, pas le journal ni les arrêts. Trouvées par scripts/rgpd-qa.mjs (D3), qui recalcule
  // la liste depuis les migrations. Les arrêts et le journal partent avant les réglages ; aucun ne cite une table vidée plus bas.
  'relances_impayes_arrets', 'relances_impayes', 'relances_impayes_reglages', 'commandes_fournisseur',
  // 0167 — les liens de suivi donnés aux clients (empreintes seulement) : plus aucun ne doit répondre.
  'chantier_suivi',
  // 0174 — le pilote automatique (réglages, file et journal : libellés d'actions préparées pour des clients) et les liens de pointage
  // donnés aux compagnons (empreintes seulement) : vidés avec le compte ; plus aucun lien ne répond.
  'actions_auto', 'pilote_reglages', 'chantier_pointage',
  'chantiers', 'vehicules', 'equipe_membres',
]

// 0163 — bucket PRIVÉ des photos et pièces du chantier, rangées en <compte>/<chantier>/<fichier>.
const PIECES_BUCKET = 'chantier-pieces'

async function annulerAbonnement(subscriptionId: string | null | undefined, id: string) {
  if (!subscriptionId || !stripe) return
  try { await stripe.subscriptions.cancel(subscriptionId) }
  catch (e) { console.error('[purge-comptes] abonnement Stripe non annulé', id, e instanceof Error ? e.message : e) }
}

async function viderStockage(id: string) {
  const { data: fichiers } = await supabaseAdmin.storage.from(MEDIA_BUCKET).list(id, { limit: 1000 })
  if (fichiers?.length) {
    const { error } = await supabaseAdmin.storage.from(MEDIA_BUCKET).remove(fichiers.map((f) => `${id}/${f.name}`))
    if (error) console.error('[purge-comptes] stockage', id, error.message)
  }
  // Les photos et pièces du chantier : un dossier par chantier sous le dossier du compte. La cascade de la base
  // emporte les lignes, jamais les fichiers : ils sont retirés ici, avant. Bucket absent (avant 0163) : liste vide.
  const { data: dossiers } = await supabaseAdmin.storage.from(PIECES_BUCKET).list(id, { limit: 1000 })
  for (const d of dossiers ?? []) {
    const { data: f } = await supabaseAdmin.storage.from(PIECES_BUCKET).list(`${id}/${d.name}`, { limit: 1000 })
    if (!f?.length) continue
    const { error } = await supabaseAdmin.storage.from(PIECES_BUCKET).remove(f.map((x) => `${id}/${d.name}/${x.name}`))
    if (error) console.error('[purge-comptes] pièces du chantier', id, error.message)
  }
}

/** Effacement complet — réservé aux comptes sans facture émise. Rend l'erreur au lieu de l'avaler. */
async function effacer(id: string): Promise<string | null> {
  await viderStockage(id)
  const { error: eA } = await supabaseAdmin.from('artisans').delete().eq('id', id)
  if (eA) return `artisans : ${eA.message}`
  const { error: eU } = await supabaseAdmin.auth.admin.deleteUser(id)
  return eU ? `auth : ${eU.message}` : null
}

/** Anonymisation — le compte garde ses factures émises et son identité d'émetteur, rien d'autre. */
async function anonymiser(id: string): Promise<string | null> {
  await viderStockage(id)

  // Ce que les factures émises citent, et qu'on garde avec elles.
  const { data: fEmises } = await supabaseAdmin.from('factures').select('devis_id, client_id').eq('artisan_id', id).eq('verrouillee', true)
  const devisGardes = Array.from(new Set((fEmises ?? []).map((f) => f.devis_id).filter(Boolean))) as string[]
  const clientsGardes = Array.from(new Set((fEmises ?? []).map((f) => f.client_id).filter(Boolean))) as string[]

  // Factures brouillon (jamais émises) : sans valeur légale, effacées.
  const { error: eFb } = await supabaseAdmin.from('factures').delete().eq('artisan_id', id).eq('verrouillee', false)
  if (eFb) return `factures brouillon : ${eFb.message}`

  for (const table of TABLES_A_VIDER) {
    const { error } = await supabaseAdmin.from(table).delete().eq('artisan_id', id)
    if (error && !/does not exist|schema cache/i.test(error.message)) return `${table} : ${error.message}`
  }
  let q = supabaseAdmin.from('devis').delete().eq('artisan_id', id)
  if (devisGardes.length) q = q.not('id', 'in', `(${devisGardes.join(',')})`)
  const { error: eD } = await q
  if (eD) return `devis : ${eD.message}`
  let qc = supabaseAdmin.from('clients').delete().eq('artisan_id', id)
  if (clientsGardes.length) qc = qc.not('id', 'in', `(${clientsGardes.join(',')})`)
  const { error: eC } = await qc
  if (eC) return `clients : ${eC.message}`

  // La ligne artisan : on garde l'identité d'émetteur (nom, forme juridique, SIRET, adresse,
  // n° de TVA, compteurs de numérotation), on efface tout le reste.
  // v9 J2 — les appareils abonnés aux notifications ne survivent pas à l'anonymisation (revue du 06/09 :
  // la cascade de 0064 ne joue que quand la ligne artisan est effacée). Table absente (avant 0064) : on passe.
  const { error: eP } = await supabaseAdmin.from('push_abonnements').delete().eq('artisan_id', id)
  if (eP && !/push_abonnements/.test(eP.message)) return `notifications : ${eP.message}`

  const { error: eA } = await supabaseAdmin.from('artisans').update({
    email: emailAnonyme(id), email_public: null, tel_public: null, bio: null, photo_url: null, logo_url: null,
    horaires: null, reseaux: {}, services: [], realisations: [], avant_apres: [], zone_intervention: null,
    site_contenu: null, site_layout: null, site_style: null, site_active: false, plateforme_active: false, leads_pause: true,
    domaine: null, domaine_verifie: false, slug: `${PREFIXE_ADRESSE_PURGEE}${id.slice(0, 8)}`, slugs_anciens: [],
    iban: null, bic: null, stripe_customer_id: null, stripe_subscription_id: null,
    assurance_nom: null, assurance_adresse: null, assurance_contrat: null, assurance_activites: null, assurance_zone: null,
    notifications: {}, plan: 'essentiel', credits: 0, suppression_demandee_le: null,
  }).eq('id', id)
  if (eA) return `artisans : ${eA.message}`

  // L'accès : email remplacé, mot de passe aléatoire, banni pour cent ans. L'utilisateur auth
  // reste parce que sa suppression cascaderait sur la ligne artisan puis sur les factures.
  const { error: eU } = await supabaseAdmin.auth.admin.updateUserById(id, {
    email: emailAnonyme(id), email_confirm: true, password: crypto.randomBytes(24).toString('base64url'),
    ban_duration: '876000h', user_metadata: {},
  })
  return eU ? `auth : ${eU.message}` : null
}

export async function purgerComptes(): Promise<{ purges: number; anonymises: number; en_attente: number; erreur?: string }> {
  const seuil = new Date(Date.now() - JOURS_DE_GRACE * 86400000).toISOString()
  const { data: comptes, error } = await supabaseAdmin.from('artisans')
    .select('id, email, nom, stripe_subscription_id').lte('suppression_demandee_le', seuil).limit(50)
  if (error) return { purges: 0, anonymises: 0, en_attente: 0, erreur: error.message }

  let purges = 0, anonymises = 0
  for (const c of comptes ?? []) {
    try {
      await annulerAbonnement(c.stripe_subscription_id, c.id)
      const { count } = await supabaseAdmin.from('factures').select('id', { count: 'exact', head: true }).eq('artisan_id', c.id).eq('verrouillee', true)
      const aFacture = (count ?? 0) > 0
      let idsSites: string[] = []
      try { idsSites = await commandesEnLigneDe(c.id) }
      catch (e) { console.error('[purge-comptes] lecture des sites', c.id, e) }
      const echec = aFacture ? await anonymiser(c.id) : await effacer(c.id)
      if (echec) {
        console.error('[purge-comptes]', c.id, echec)
        // Une suppression demandée qui échoue ne reste pas muette : l'entreprise doit la traiter (RGPD).
        await notifierEntreprise(
          `Purge en échec — ${c.nom || c.email || c.id}`,
          `La suppression demandée il y a plus de ${JOURS_DE_GRACE} jours n'a pas abouti (${aFacture ? 'anonymisation' : 'effacement'}).\n\n` +
          `Erreur : ${echec}\n\nÀ vérifier et à traiter à la main.\n\nArtisan : ${c.nom || '—'} · ${c.email || '—'} · ${c.id}`,
        )
        continue
      }
      try { await marquerSuppression(idsSites) }
      catch (e) { console.error('[purge-comptes] avis de suppression des sites', c.id, e) }
      if (aFacture) anonymises++; else purges++
      await notifierEntreprise(
        `Compte ${aFacture ? 'anonymisé' : 'purgé'} — ${c.nom || c.email || c.id}`,
        `Suppression demandée il y a ${JOURS_DE_GRACE} jours, exécutée aujourd'hui.\n\n` +
        (aFacture
          ? `Le compte avait ${count} facture(s) émise(s) : il est ANONYMISÉ, pas effacé. Les factures, les devis et clients qu'elles citent et l'identité d'émetteur (nom, SIRET, adresse) sont conservés dix ans (art. L. 102 B du LPF). Tout le reste est effacé et l'accès est fermé.`
          : `Aucune facture émise : compte, conversations, devis, images et accès effacés pour de bon.`) +
        `\n\nArtisan : ${c.nom || '—'} · ${c.email || '—'} · ${c.id}`,
      )
    } catch (e) { console.error('[purge-comptes]', c.id, e) }
  }
  return { purges, anonymises, en_attente: (comptes?.length ?? 0) - purges - anonymises }
}
