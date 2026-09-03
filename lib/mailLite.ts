// Lecture d'un email brut (v4 §B2) — juste ce dont on a besoin : qui écrit, quel objet,
// quel texte. Écrit à la main plutôt que d'ajouter une grosse dépendance de parsing :
// on ne rend pas l'email, on en extrait une demande de devis.

export type MailLu = {
  messageId: string | null
  de: { nom: string | null; email: string | null }
  sujet: string
  texte: string
  date: Date | null
}

/** Décode les en-têtes encodés RFC 2047 (=?UTF-8?B?...?=) — sinon les accents ressortent en charabia. */
function decodeEntete(v: string): string {
  return v.replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (_, jeu: string, mode: string, data: string) => {
    try {
      const buf = mode.toUpperCase() === 'B'
        ? Buffer.from(data, 'base64')
        : Buffer.from(data.replace(/_/g, ' ').replace(/=([0-9A-Fa-f]{2})/g, (_m, h) => String.fromCharCode(parseInt(h, 16))), 'binary')
      return new TextDecoder(/utf-?8/i.test(jeu) ? 'utf-8' : 'latin1').decode(buf)
    } catch { return data }
  }).replace(/\s+/g, ' ').trim()
}

function decodeCorps(brut: string, encodage: string, jeu: string): string {
  let buf: Buffer
  const e = encodage.toLowerCase()
  if (e === 'base64') buf = Buffer.from(brut.replace(/\s/g, ''), 'base64')
  else if (e === 'quoted-printable') {
    buf = Buffer.from(brut.replace(/=\r?\n/g, '').replace(/=([0-9A-Fa-f]{2})/g, (_m, h) => String.fromCharCode(parseInt(h, 16))), 'binary')
  } else buf = Buffer.from(brut, 'binary')
  try { return new TextDecoder(/utf-?8/i.test(jeu) ? 'utf-8' : 'latin1').decode(buf) } catch { return buf.toString('utf8') }
}

function coupe(section: string): { entetes: Record<string, string>; corps: string } {
  const i = section.search(/\r?\n\r?\n/)
  const brutEntetes = i === -1 ? section : section.slice(0, i)
  const corps = i === -1 ? '' : section.slice(i).replace(/^\r?\n\r?\n/, '')
  const entetes: Record<string, string> = {}
  // Les en-têtes peuvent tenir sur plusieurs lignes (continuation indentée).
  for (const ligne of brutEntetes.replace(/\r?\n[ \t]+/g, ' ').split(/\r?\n/)) {
    const m = ligne.match(/^([\w-]+):\s*(.*)$/)
    if (m) entetes[m[1].toLowerCase()] = m[2]
  }
  return { entetes, corps }
}

/** Cherche la première partie text/plain (récursif dans les multipart). Repli : le HTML détagué. */
function texteDe(entetes: Record<string, string>, corps: string, profondeur = 0): string {
  const ct = entetes['content-type'] || 'text/plain'
  const enc = entetes['content-transfer-encoding'] || '7bit'
  const jeu = (ct.match(/charset="?([\w-]+)"?/i)?.[1] || 'utf-8')

  if (/^multipart\//i.test(ct) && profondeur < 4) {
    const b = ct.match(/boundary="?([^";]+)"?/i)?.[1]
    if (b) {
      // Groupe NON capturant : sinon String.split() glisse les captures dans le tableau.
      const parts = corps.split(new RegExp(`--${b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:--)?\\r?\\n`))
      let repliHtml = ''
      for (const p of parts) {
        if (!p.trim()) continue
        const sous = coupe(p)
        const t = texteDe(sous.entetes, sous.corps, profondeur + 1)
        if (!t) continue
        if (/^text\/plain/i.test(sous.entetes['content-type'] || 'text/plain')) return t
        if (!repliHtml) repliHtml = t
      }
      return repliHtml
    }
  }
  const clair = decodeCorps(corps, enc, jeu)
  if (/^text\/html/i.test(ct)) {
    return clair.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n').replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;|&apos;/g, '’').replace(/&quot;/g, '"')
  }
  return clair
}

/** Retire la citation du message précédent : on ne veut que ce que la personne vient d'écrire. */
export function sansCitation(texte: string): string {
  const lignes = texte.split(/\r?\n/)
  const stop = lignes.findIndex((l) =>
    /^>/.test(l.trim()) ||
    /^-{2,}\s*Message d'origine/i.test(l.trim()) ||
    /^Le .+ a écrit\s*:?\s*$/i.test(l.trim()) ||
    /^On .+ wrote:\s*$/i.test(l.trim()))
  return (stop > 0 ? lignes.slice(0, stop) : lignes).join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

export function lireMail(brut: Buffer | string): MailLu {
  const s = typeof brut === 'string' ? brut : brut.toString('binary')
  const { entetes, corps } = coupe(s)
  const from = decodeEntete(entetes['from'] || '')
  const email = from.match(/<([^>]+)>/)?.[1] || (/^[^\s@]+@[^\s@]+$/.test(from.trim()) ? from.trim() : null)
  // On enlève l'adresse, PUIS les espaces, PUIS les guillemets : dans l'autre ordre,
  // le guillemet fermant est suivi d'un espace et survit ("Marie Dupont" <…>).
  const nom = from.replace(/<[^>]*>/, '').trim().replace(/^["']|["']$/g, '').trim() || null
  const d = entetes['date'] ? new Date(entetes['date']) : null
  return {
    messageId: (entetes['message-id'] || '').trim() || null,
    de: { nom: nom && nom !== email ? nom : null, email: email ? email.toLowerCase() : null },
    sujet: decodeEntete(entetes['subject'] || ''),
    texte: sansCitation(texteDe(entetes, corps)).slice(0, 8000),
    date: d && !isNaN(d.getTime()) ? d : null,
  }
}
