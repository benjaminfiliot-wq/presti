// lib/canaux/dkim.ts — VÉRIFIER NOUS-MÊMES la signature DKIM d'un e-mail de notification (21/10/2026, audit offensif, E1).
//
// L'en-tête Authentication-Results dit ce que le serveur de la boîte a vérifié ; mais si ce serveur n'en pose aucun, le premier
// en-tête de ce nom est celui que l'EXPÉDITEUR a écrit — et un « dkim=pass header.d=linkedin.com » ne coûte rien à écrire. Une
// signature DKIM, elle, ne se fabrique pas sans la clé privée du réseau. Une notification n'est donc reconnue (lib/canaux/
// notifications.ts, lib/canaux/leboncoin.ts) que si ce module trouve une signature VALIDE, faite par le domaine du réseau.
//
// Ce qui est vérifié (RFC 6376 ; ed25519 : RFC 8463) : rsa-sha256 et ed25519-sha256 ; canonisation simple ou relaxed, en-têtes et
// corps ; empreinte du corps (bh=) ; « from » parmi les en-têtes signés ; clé publique lue dans le DNS (<s>._domainkey.<d>) ; date
// d'expiration (x=). Refusé d'office : rsa-sha1, l= (un corps signé en partie laisserait ajouter du texte), clé révoquée (p= vide).
// En cas de doute (DNS muet, en-tête illisible) : NON vérifié — l'e-mail suit le chemin ordinaire de la relève, rien de plus.
//
// Module serveur (node:crypto), sans réseau : la lecture DNS est INJECTÉE (production : dns.promises.resolveTxt ; tests : une table).
import crypto from 'node:crypto'

export type ResolveurTxt = (nom: string) => Promise<string[][]>

type Champ = { nom: string; brut: string }

/** Coupe l'e-mail brut (octets lus en « binary ») en en-têtes (texte brut de chaque champ, replis compris) et corps. */
export function couperEmail(brut: string): { champs: Champ[]; corps: string } {
  const m = /\r?\n\r?\n/.exec(brut)
  const tete = m ? brut.slice(0, m.index) : brut
  const corps = m ? brut.slice(m.index + m[0].length) : ''
  const lignes = tete.split(/\r?\n/)
  const champs: Champ[] = []
  for (const l of lignes) {
    if (/^[ \t]/.test(l) && champs.length) champs[champs.length - 1].brut += `\r\n${l}`
    else {
      const i = l.indexOf(':')
      if (i > 0) champs.push({ nom: l.slice(0, i).trim().toLowerCase(), brut: l })
    }
  }
  return { champs, corps }
}

/** Les balises d'une liste « a=b; c=d » (DKIM-Signature ou enregistrement DNS). Espaces et replis retirés des valeurs. */
export function balises(liste: string): Map<string, string> {
  const r = new Map<string, string>()
  for (const morceau of liste.split(';')) {
    const i = morceau.indexOf('=')
    if (i <= 0) continue
    const cle = morceau.slice(0, i).replace(/\s+/g, '').toLowerCase()
    if (!cle || r.has(cle)) continue
    r.set(cle, morceau.slice(i + 1).replace(/\s+/g, ''))
  }
  return r
}

const valeurDe = (c: Champ) => c.brut.slice(c.brut.indexOf(':') + 1)

/** Canonisation d'un en-tête (RFC 6376 §3.4.1-2). Le résultat n'a PAS de CRLF final. */
export function canonEntete(c: Champ, mode: 'simple' | 'relaxed'): string {
  if (mode === 'simple') return c.brut
  const valeur = valeurDe(c).replace(/\r?\n(?=[ \t])/g, '').replace(/[ \t]+/g, ' ').trim()
  return `${c.nom}:${valeur}`
}

/** Canonisation du corps (RFC 6376 §3.4.3-4). Les fins de ligne nues (LF) sont ramenées à CRLF d'abord. */
export function canonCorps(corps: string, mode: 'simple' | 'relaxed'): string {
  let lignes = corps.replace(/\r?\n/g, '\r\n').split('\r\n')
  if (mode === 'relaxed') lignes = lignes.map((l) => l.replace(/[ \t]+/g, ' ').replace(/ $/, ''))
  while (lignes.length && lignes[lignes.length - 1] === '') lignes.pop()
  if (!lignes.length) return mode === 'simple' ? '\r\n' : ''
  return `${lignes.join('\r\n')}\r\n`
}

const octets = (s: string) => Buffer.from(s, 'binary')

/** La clé publique du DNS : SPKI (RSA) ou clé brute de 32 octets (ed25519). Null si révoquée, illisible ou d'un autre type. */
export function clePublique(enregistrement: string, algo: 'rsa' | 'ed25519'): crypto.KeyObject | null {
  const b = balises(enregistrement)
  if (b.has('v') && b.get('v') !== 'DKIM1') return null
  if ((b.get('k') ?? 'rsa') !== algo) return null
  const p = b.get('p')
  if (!p) return null
  try {
    const der = Buffer.from(p, 'base64')
    if (algo === 'ed25519') {
      if (der.length !== 32) return null
      return crypto.createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), der]), format: 'der', type: 'spki' })
    }
    return crypto.createPublicKey({ key: der, format: 'der', type: 'spki' })
  } catch { return null }
}

/**
 * Les domaines (d=) dont une signature DKIM de l'e-mail est VALIDE. Au plus 5 signatures examinées. Ne lève jamais.
 * `brut` : l'e-mail tel que reçu (Buffer, ou chaîne lue en « binary »).
 */
export async function signaturesDkimValides(brut: Buffer | string, resoudre: ResolveurTxt, maintenant = Date.now()): Promise<string[]> {
  const valides: string[] = []
  try {
    const texte = typeof brut === 'string' ? brut : brut.toString('binary')
    const { champs, corps } = couperEmail(texte)
    const signatures = champs.filter((c) => c.nom === 'dkim-signature').slice(0, 5)
    for (const sig of signatures) {
      try {
        const t = balises(valeurDe(sig))
        const algo = t.get('a')
        const d = (t.get('d') ?? '').toLowerCase()
        const s = t.get('s') ?? ''
        const h = (t.get('h') ?? '').split(':').map((x) => x.trim().toLowerCase()).filter(Boolean)
        const b64 = t.get('b') ?? ''
        const bh = t.get('bh') ?? ''
        const [ce, cc] = (t.get('c') ?? 'simple/simple').toLowerCase().split('/')
        const modeEntete = ce === 'relaxed' ? 'relaxed' : 'simple'
        const modeCorps = cc === 'relaxed' ? 'relaxed' : 'simple'
        if (t.get('v') !== '1' || (algo !== 'rsa-sha256' && algo !== 'ed25519-sha256')) continue
        if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d) || !/^[A-Za-z0-9._-]{1,63}$/.test(s) || !b64 || !bh || !h.includes('from')) continue
        if (t.has('l')) continue
        const x = t.get('x')
        if (x && /^\d+$/.test(x) && Number(x) * 1000 < maintenant) continue
        const i = t.get('i')
        if (i && !(`@${d}` === i.slice(i.lastIndexOf('@')).toLowerCase() || i.toLowerCase().endsWith(`.${d}`))) continue

        // 1. L'empreinte du corps.
        const empreinte = crypto.createHash('sha256').update(octets(canonCorps(corps, modeCorps))).digest('base64')
        if (empreinte !== bh) continue

        // 2. Les en-têtes signés, pris du BAS vers le HAUT pour chaque nom répété, puis la signature elle-même sans la valeur de b=.
        const restants = new Map<string, Champ[]>()
        for (const c of champs) { const l = restants.get(c.nom) ?? []; l.push(c); restants.set(c.nom, l) }
        let donnees = ''
        for (const nom of h) {
          const l = restants.get(nom)
          const c = l && l.length ? l.pop() : null
          if (c) donnees += `${canonEntete(c, modeEntete)}\r\n`
        }
        const sansB = { nom: sig.nom, brut: sig.brut.replace(/(^[^:]*:|;)([ \t\r\n]*b[ \t\r\n]*=)[^;]*/i, '$1$2') }
        donnees += canonEntete(sansB, modeEntete)

        // 3. La clé publique, puis la vérification.
        const enregistrements = await resoudre(`${s}._domainkey.${d}`)
        const cle = clePublique(enregistrements.map((morceaux) => morceaux.join('')).join(''), algo === 'rsa-sha256' ? 'rsa' : 'ed25519')
        if (!cle) continue
        const signature = Buffer.from(b64, 'base64')
        const ok = algo === 'rsa-sha256'
          ? crypto.verify('sha256', octets(donnees), cle, signature)
          : crypto.verify(null, crypto.createHash('sha256').update(octets(donnees)).digest(), cle, signature)
        if (ok && !valides.includes(d)) valides.push(d)
      } catch { /* signature illisible : ignorée */ }
    }
  } catch { /* e-mail illisible : rien de vérifié */ }
  return valides
}
