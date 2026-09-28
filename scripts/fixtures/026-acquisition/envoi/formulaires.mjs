// scripts/fixtures/026-acquisition/envoi/formulaires.mjs — les pages de formulaire que le juge sert lui-même sur 127.0.0.1
// (PF-3 à PF-5), écrit par Claude Code AVANT lib/agents/acquisition/porteurFormulaire.ts et scripts/agents/porteur-formulaire.mjs
// qu'il juge (fiche 026-095, CLAUDE.md:23). Une page par raison d'abandon du contrat (026-016), un formulaire conforme
// (Contact Form 7), un captcha chargé par script seulement, des robots.txt. Domaines en .invalid, noms « Témoin ».
//
// Ces pages servent le module `controlesEnDirect(page)` (exécuté DANS un vrai Chromium, sur l'usine, --ici) : elles ne sont
// donc utiles qu'une fois ce navigateur lancé ; sur le poste, seule leur PRÉSENCE et leur structure statique sont vérifiées
// (PF-3 : « aucune requête de soumission consignée » se relit sur le journal du serveur, sans navigateur).
//
//   demarrerServeurFormulaires({ hote })  → { url, requetes, robots(chemin), arreter() }
//   RAISONS  : [{ id, raison, chemin }]   — chemin relatif de la page de contact pour chaque raison d'abandon.
//   FORMULAIRE_CONFORME : le Formulaire STRUCTURÉ (type du contrat) du cas conforme, pour juger planDeRemplissage sans
//     navigateur (PF-2) — la structure, pas le HTML : lireFormulaire (lot « recensement ») fait ce pont en production.
import http from 'node:http'
import { portLibre, ecouterLocal } from './commun.mjs'

const ENTETE = (titre) => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${titre} Témoin</title></head><body>`
const PIED = '</body></html>'
const CHAMPS_BASE = `
  <p><label>Nom<br><input type="text" name="your-name" required></label></p>
  <p><label>E-mail<br><input type="email" name="your-email" required></label></p>
  <p><label>Objet<br><input type="text" name="your-subject"></label></p>`
const SELECT_MOTIF = (options) => `<p><label>Motif<br><select name="your-motif">${options.map((o) => `<option>${o}</option>`).join('')}</select></label></p>`
const TEXTAREA = (maxlength) => `<p><label>Message<br><textarea name="your-message" required${maxlength ? ` maxlength="${maxlength}"` : ''}></textarea></label></p>`
const SUBMIT = '<p><input type="submit" value="Envoyer"></p>'

function pageContact({ titre, extraTete = '', extraCorps = '', champs = CHAMPS_BASE, motif = SELECT_MOTIF(['Devis', 'Autre demande']), message = TEXTAREA(2000), telephone = '<p><label>Téléphone<br><input type="tel" name="your-phone"></label></p>', consentement = '<p><label><input type="checkbox" name="rgpd" required> J\'accepte que mon message soit traité</label></p>' }) {
  return `${ENTETE(titre)}${extraTete}<h1>${titre}</h1>${extraCorps}<form action="/contact/envoyer" method="post">${champs}${telephone}${motif}${message}${consentement}${SUBMIT}</form>${PIED}`
}

// ── Les 18 raisons d'abandon du contrat (026-016 §1), une page chacune ──────────────────────────────────────────────────────
export const RAISONS = [
  { id: 'recaptcha_v2', raison: 'captcha', chemin: '/recaptcha/contact', html: pageContact({ titre: 'reCAPTCHA', extraTete: '<script src="https://www.google.com/recaptcha/api.js" async defer></script>', extraCorps: '<div class="g-recaptcha" data-sitekey="temoin"></div>' }) },
  { id: 'hcaptcha', raison: 'captcha', chemin: '/hcaptcha/contact', html: pageContact({ titre: 'hCaptcha', extraTete: '<script src="https://js.hcaptcha.com/1/api.js" async defer></script>', extraCorps: '<div class="h-captcha" data-sitekey="temoin"></div>' }) },
  { id: 'turnstile', raison: 'captcha', chemin: '/turnstile/contact', html: pageContact({ titre: 'Turnstile', extraTete: '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>', extraCorps: '<div class="cf-turnstile" data-sitekey="temoin"></div>' }) },
  { id: 'friendly_captcha', raison: 'captcha', chemin: '/friendly-captcha/contact', html: pageContact({ titre: 'Friendly Captcha', extraTete: '<script src="https://cdn.jsdelivr.net/npm/friendly-challenge/widget.min.js" async defer></script>', extraCorps: '<div class="frc-captcha" data-sitekey="temoin"></div>' }) },
  { id: 'captcha_script_seul', raison: 'captcha', chemin: '/captcha-js/contact', html: pageContact({ titre: 'Captcha injecté par script', extraTete: '<script src="/captcha-js/widget-injecte.js" defer></script>' /* le lecteur HTML statique ne le voit pas ; Chromium l'exécute et fait apparaître .g-recaptcha */ }) },
  { id: 'pot_de_miel', raison: 'pot_de_miel', chemin: '/pot-de-miel/contact', html: pageContact({ titre: 'Pot de miel', champs: `${CHAMPS_BASE}<p style="display:none"><label>Laissez ce champ vide<br><input type="text" name="url_site" value=""></label></p>` }) },
  { id: 'case_robot', raison: 'case_robot', chemin: '/case-robot/contact', html: pageContact({ titre: 'Case robot', extraCorps: '<p><label><input type="checkbox" name="pas_un_robot" required> Je ne suis pas un robot</label></p>' }) },
  { id: 'question_antispam', raison: 'question_antispam', chemin: '/question-antispam/contact', html: pageContact({ titre: 'Question anti-spam', extraCorps: '<p><label>Combien font 3 + 4 ?<br><input type="text" name="verif_calcul" required></label></p>' }) },
  { id: 'defi_js', raison: 'defi_js', chemin: '/defi-js/contact', html: `${ENTETE('Défi JS')}<div id="cf-wrapper"><h1>Checking your browser before accessing temoin-defi-js.invalid.</h1><p>This process is automatic.</p></div><script src="/cdn-cgi/challenge-platform/h/g/orchestrate/jsch/v1"></script>${PIED}` },
  { id: 'wpforms', raison: 'extension_antispam', chemin: '/wpforms/contact', html: pageContact({ titre: 'WPForms', champs: `${CHAMPS_BASE}<input type="hidden" name="wpforms[token]" value="jeton-temoin-wpforms">` }) },
  { id: 'akismet', raison: 'extension_antispam', chemin: '/akismet/contact', html: pageContact({ titre: 'Akismet', extraTete: '<script src="/wp-content/plugins/akismet/_inc/form.js"></script>' }) },
  { id: 'cleantalk', raison: 'extension_antispam', chemin: '/cleantalk/contact', html: pageContact({ titre: 'CleanTalk', extraTete: '<script src="//moderate.cleantalk.org/ct_public.js"></script>' }) },
  { id: 'antispam_bee', raison: 'extension_antispam', chemin: '/antispam-bee/contact', html: pageContact({ titre: 'Antispam Bee', champs: `${CHAMPS_BASE}<input type="hidden" name="antispam_bee_hash" value="temoin">` }) },
  { id: 'refus_demarchage', raison: 'refus_demarchage', chemin: '/refus-demarchage/contact', html: pageContact({ titre: 'Refus démarchage', extraCorps: '<p>Nous n\'acceptons pas le démarchage commercial par ce formulaire.</p>' }) },
  { id: 'cgu_robots', raison: 'cgu_robots', chemin: '/cgu-robots/contact', html: pageContact({ titre: 'CGU robots', extraCorps: '<p><a href="/cgu">CGU</a> : toute extraction automatisée de ce site est interdite.</p>' }) },
  { id: 'telephone_requis', raison: 'telephone_requis', chemin: '/telephone-requis/contact', html: pageContact({ titre: 'Téléphone requis', telephone: '<p><label>Téléphone<br><input type="tel" name="your-phone" required></label></p>' }) },
  { id: 'motif_devis_seul', raison: 'motif_devis_seul', chemin: '/motif-devis-seul/contact', html: pageContact({ titre: 'Motif devis seul', motif: SELECT_MOTIF(['Devis']) }) },
  { id: 'maxlength_court', raison: 'longueur', chemin: '/maxlength-court/contact', html: pageContact({ titre: 'Maxlength court', message: TEXTAREA(200) }) },
]

export const CONFORME_CHEMIN = '/conforme/contact'
export const PAGE_CONFORME = pageContact({ titre: 'Menuiserie Témoin' })

/** Le Formulaire STRUCTURÉ (type du contrat) du cas conforme, pour PF-2 (sans navigateur). */
export const FORMULAIRE_CONFORME = {
  url_page: null, // posé par le serveur au démarrage (dépend du port)
  url_action: null,
  methode: 'post',
  champs: [
    { nom: 'your-name', type: 'text', requis: true },
    { nom: 'your-email', type: 'email', requis: true },
    { nom: 'your-subject', type: 'text', requis: false },
    { nom: 'your-phone', type: 'tel', requis: false },
    { nom: 'your-motif', type: 'select', requis: false, options: ['Devis', 'Autre demande'] },
    { nom: 'your-message', type: 'textarea', requis: true, max: 2000 },
  ],
  motifs: ['Devis', 'Autre demande'],
  technologie: 'contact_form_7',
  telephone_requis: false,
  longueur_max_message: 2000,
}
/** Le même formulaire, téléphone obligatoire (PF-2 : telephone_requis attendu). */
export const FORMULAIRE_TELEPHONE_REQUIS = { ...FORMULAIRE_CONFORME, telephone_requis: true, champs: FORMULAIRE_CONFORME.champs.map((c) => (c.nom === 'your-phone' ? { ...c, requis: true } : c)) }
/** Motif « devis » seul (PF-2 : motif_devis_seul attendu). */
export const FORMULAIRE_MOTIF_DEVIS_SEUL = { ...FORMULAIRE_CONFORME, motifs: ['Devis'], champs: FORMULAIRE_CONFORME.champs.map((c) => (c.nom === 'your-motif' ? { ...c, options: ['Devis'] } : c)) }
/** maxlength trop court (PF-2 : longueur attendu pour un texte de 230 signes). */
export const FORMULAIRE_MAXLENGTH_COURT = { ...FORMULAIRE_CONFORME, longueur_max_message: 200, champs: FORMULAIRE_CONFORME.champs.map((c) => (c.nom === 'your-message' ? { ...c, max: 200 } : c)) }

// ── Le serveur ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const ROBOTS_OK = 'User-agent: *\nAllow: /\n'
const ROBOTS_INTERDIT_ACTION = 'User-agent: *\nDisallow: /interdit-action/contact/envoyer\n'

export async function demarrerServeurFormulaires() {
  const requetes = []
  const pages = new Map()
  for (const r of RAISONS) pages.set(r.chemin, r.html)
  pages.set(CONFORME_CHEMIN, PAGE_CONFORME)
  pages.set('/interdit-action/contact', PAGE_CONFORME.replace('/contact/envoyer', '/interdit-action/contact/envoyer'))
  const serveur = http.createServer((req, res) => {
    let corps = ''
    req.on('data', (c) => { corps += c })
    req.on('end', () => {
      requetes.push({ methode: req.method, chemin: (req.url ?? '').split('?')[0], userAgent: req.headers['user-agent'] ?? null, cookies: req.headers.cookie ?? null, corps })
      const chemin = (req.url ?? '/').split('?')[0]
      if (chemin === '/robots.txt') { res.writeHead(200, { 'content-type': 'text/plain' }); res.end(ROBOTS_OK); return }
      if (chemin === '/interdit-action/robots.txt') { res.writeHead(200, { 'content-type': 'text/plain' }); res.end(ROBOTS_INTERDIT_ACTION); return }
      if (chemin === '/pare-feu/contact') { res.writeHead(403, { 'content-type': 'text/html', 'cf-mitigated': 'challenge' }); res.end(`${ENTETE('Pare-feu')}<h1>403 Forbidden</h1>${PIED}`); return }
      if (chemin.endsWith('/envoyer') && req.method === 'POST') {
        if (chemin.startsWith(CONFORME_CHEMIN) || chemin === '/conforme/contact/envoyer') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(`${ENTETE('Merci')}<p id="confirmation">Merci, votre message a bien été envoyé.</p>${PIED}`); return }
        res.writeHead(200, { 'content-type': 'text/html' }); res.end(`${ENTETE('Merci')}<p id="confirmation">Merci.</p>${PIED}`); return
      }
      if (pages.has(chemin)) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(pages.get(chemin)); return }
      res.writeHead(404); res.end('Introuvable')
    })
  })
  const port = await portLibre()
  await ecouterLocal(serveur, port)
  const base = `http://127.0.0.1:${port}`
  FORMULAIRE_CONFORME.url_page = `${base}${CONFORME_CHEMIN}`
  FORMULAIRE_CONFORME.url_action = `${base}${CONFORME_CHEMIN}/envoyer`
  FORMULAIRE_TELEPHONE_REQUIS.url_page = FORMULAIRE_CONFORME.url_page; FORMULAIRE_TELEPHONE_REQUIS.url_action = FORMULAIRE_CONFORME.url_action
  FORMULAIRE_MOTIF_DEVIS_SEUL.url_page = FORMULAIRE_CONFORME.url_page; FORMULAIRE_MOTIF_DEVIS_SEUL.url_action = FORMULAIRE_CONFORME.url_action
  FORMULAIRE_MAXLENGTH_COURT.url_page = FORMULAIRE_CONFORME.url_page; FORMULAIRE_MAXLENGTH_COURT.url_action = FORMULAIRE_CONFORME.url_action
  return {
    base, requetes,
    urlDe: (chemin) => `${base}${chemin}`,
    arreter: () => new Promise((resolve) => serveur.close(() => resolve())),
  }
}
