export type ResultatTypeImage = 
  | { ok: true; type: 'image/jpeg' | 'image/png' | 'image/webp'; ext: 'jpg' | 'png' | 'webp' }
  | { ok: false; raison: 'heic' | 'avif' | 'svg' | 'inconnu' }

export function detecterTypeImage(octets: Uint8Array): ResultatTypeImage {
  if (octets.length < 3) return { ok: false, raison: 'inconnu' }
  if (octets[0] === 0xff && octets[1] === 0xd8 && octets[2] === 0xff) {
    return { ok: true, type: 'image/jpeg', ext: 'jpg' }
  }

  if (octets.length >= 8 && 
      octets[0] === 0x89 && octets[1] === 0x50 && octets[2] === 0x4e && octets[3] === 0x47 &&
      octets[4] === 0x0d && octets[5] === 0x0a && octets[6] === 0x1a && octets[7] === 0x0a) {
    return { ok: true, type: 'image/png', ext: 'png' }
  }

  if (octets.length >= 12) {
    const isRiff = octets[0] === 0x52 && octets[1] === 0x49 && octets[2] === 0x46 && octets[3] === 0x46
    const isWebp = octets[8] === 0x57 && octets[9] === 0x45 && octets[10] === 0x42 && octets[11] === 0x50
    if (isRiff && isWebp) {
      return { ok: true, type: 'image/webp', ext: 'webp' }
    }
    
    // ftyp check
    const isFtyp = octets[4] === 0x66 && octets[5] === 0x74 && octets[6] === 0x79 && octets[7] === 0x70
    if (isFtyp) {
      const marque = String.fromCharCode(octets[8], octets[9], octets[10], octets[11])
      if (['avif', 'avis'].includes(marque)) {
        return { ok: false, raison: 'avif' }
      }
      if (['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'].includes(marque)) {
        return { ok: false, raison: 'heic' }
      }
    }
  }

  // SVG detection: BOM (EF BB BF) then whitespaces, then <svg, <?xml, <!doctype html
  let pos = 0
  if (octets.length >= 3 && octets[0] === 0xef && octets[1] === 0xbb && octets[2] === 0xbf) {
    pos = 3
  }
  while (pos < octets.length) {
    const c = octets[pos]
    if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) {
      pos++
    } else {
      break
    }
  }
  
  if (pos < octets.length) {
    // try to match <svg, <?xml, <!doctype html
    // to lower case string
    const lenToRead = Math.min(octets.length - pos, 20)
    let text = ''
    for (let i = 0; i < lenToRead; i++) {
      text += String.fromCharCode(octets[pos + i]).toLowerCase()
    }
    if (text.startsWith('<svg') || text.startsWith('<?xml') || text.startsWith('<!doctype html')) {
      return { ok: false, raison: 'svg' }
    }
  }

  return { ok: false, raison: 'inconnu' }
}
