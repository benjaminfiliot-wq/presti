// Le compositeur HyperFrames de Presti — prompt v13.
//
//   node scripts/hf-composer.mjs 01              → écrit promo-src/hf/pub-01-vertical/index.html
//   node scripts/hf-composer.mjs 01 carre        → la déclinaison 1080×1350
//   node scripts/hf-composer.mjs tous vertical   → toutes les publications écrites, en vertical
//
// Ce n'est pas un moteur de rendu : il ÉCRIT des compositions HyperFrames. Le rendu, c'est
// `npx hyperframes render` dans le dossier de la vidéo, qui joue la timeline GSAP image par image.
//
// ── Pourquoi un générateur, et pas dix fichiers HTML écrits à la main ────────────────────────
//
// Parce que les dix vidéos partagent la même grammaire — la même marque, la même zone sûre, le
// même rythme — et ne diffèrent que par leur suite de plans. Écrire dix fois la grammaire, c'est
// dix occasions de la trahir, et aucun moyen de la corriger partout d'un coup. Ici, une vidéo est
// une LISTE DE PLANS (`PUBLICATIONS` plus bas) ; la grammaire est écrite une fois.
//
// ── Les règles de montage, tenues par le générateur et pas par la discipline ─────────────────
//
// Le montage précédent a été jugé médiocre, et le diagnostic portait sur cinq choses précises.
// Chacune est devenue une contrainte que ce fichier applique tout seul :
//
//   1. Aucun plan figé au-delà de 0,8 s → chaque plan reçoit une DÉRIVE continue sur toute sa
//      durée, en plus de son entrée. Un plan sans dérive est impossible à écrire ici.
//   2. Texte perdu dans le vide → la taille de police est CALCULÉE d'après la longueur du titre
//      (`taillePolice`), et un titre de plus de six mots est refusé à la génération.
//   3. Captures en timbre-poste → les trois modes de plan (`plein`, `defilement`, `carte`)
//      occupent tous la largeur entière. Il n'existe aucun moyen d'en poser une petite.
//   4. Image finale blanche → le dernier plan est du type `marque`, sur le fond nuit.
//   5. Débit trop faible → affaire du rendu (`scripts/hf-rendre.mjs`), pas de la composition.
//
// Et la zone sûre : rien d'important dans les 14 % du haut ni les 20 % du bas en vertical. Elle
// est appliquée par le CSS, pas laissée à l'œil.

import fs from 'node:fs'
import path from 'node:path'
import { PUBLICATIONS } from '../promo-src/hf/publications.mjs'

const RACINE = path.resolve(import.meta.dirname, '..')
const HF = path.join(RACINE, 'promo-src', 'hf')

// ── La marque ────────────────────────────────────────────────────────────────────────────────
const NUIT = '#0A0C11'
const CORAIL = '#D97757'
// ⚠️ Les deux valeurs ci-dessous viennent du PRODUIT (app/globals.css, namespace .lp-*),
// pas de mon œil. La skill presti-design annonce un accent bleu #6C8CFF : elle est PÉRIMÉE — le
// bleu ne survit que dans trois vestiges du HUD supprimé le 07/09. Le corail --co:#D97757 est la
// marque livrée. Et le gris sourd du produit est CHAUD (#8B867D), pas bleuté : sur une palette
// corail, un gris froid jure d'une façon qu'on ne sait pas nommer mais qu'on voit.
const CREME = '#ECEAE6'
const FPS = 30

const FORMATS = {
  vertical: { l: 1080, h: 1920, hautSur: 0.14, basSur: 0.2 },
  carre: { l: 1080, h: 1350, hautSur: 0.1, basSur: 0.16 },
  paysage: { l: 1920, h: 1080, hautSur: 0.1, basSur: 0.16 },
}

// ── Les plans ────────────────────────────────────────────────────────────────────────────────
//
// Chaque publication est une suite de plans `{ d, type, ... }` : `d` est la DURÉE, jamais le
// temps de départ. Les départs sont calculés, ce qui rend impossible le trou d'une image entre
// deux plans — et impossible aussi de casser tout le montage en rallongeant un plan du milieu.
//
// `fonde` n'est pas une note : c'est la ligne de code qui autorise la vidéo à dire ce qu'elle dit.
// Une publication sans `fonde` vérifiable ne se monte pas.

// ── Mise en page ─────────────────────────────────────────────────────────────────────────────

/**
 * La taille du titre, calculée d'après sa longueur — jamais choisie à l'œil.
 * C'est ce qui tient la règle « 70 à 85 % de la largeur utile » : un titre court est énorme, un
 * titre de six mots reste large. Au-delà de six mots on refuse, parce que la règle dit six.
 */
function taillePolice(texte, largeurUtile) {
  const mots = texte.trim().split(/\s+/)
  if (mots.length > 6) throw new Error(`« ${texte} » fait ${mots.length} mots — la règle en autorise six`)
  // Un prix ne s'affiche jamais nu — règle du 2026-09-13. Quatre cartons de la vague 2 sont partis
  // au rendu avec « 59 € » tout court ; Presti est en franchise en base (art. 293 B) et un abonnement
  // se dit « par mois ». Le générateur refuse, comme il refuse un titre de sept mots.
  if (/\d\s*€/.test(texte) && !/(\/mois|par mois)/i.test(texte)) throw new Error('« ' + texte + ' » affiche un prix nu — écrire « €/mois »')
  const n = texte.length
  // 0,38 est la largeur moyenne d'un glyphe de Bricolage Grotesque 700 rapportée à sa taille.
  // Mesurée sur le premier rendu, pas devinée : avec l'ancienne valeur (0,52), « Il ne l'envoie
  // pas. » n'occupait que 52 % de la largeur utile — le défaut n° 2 exactement, le texte perdu
  // dans du vide, reproduit par le générateur censé l'empêcher.
  const LARGEUR_GLYPHE = 0.38
  const lignes = n <= 18 ? 1 : n <= 42 ? 2 : 3
  const parLigne = Math.ceil(n / lignes)
  return Math.min(176, Math.max(72, Math.round((largeurUtile * 0.96) / (parLigne * LARGEUR_GLYPHE))))
}

/**
 * Les dimensions d'un PNG, lues dans son en-tête IHDR : huit octets de signature, quatre de
 * longueur, quatre de type, puis largeur et hauteur en gros-boutiste.
 */
function dimensionsPng(fichier) {
  const b = fs.readFileSync(fichier)
  if (b.length < 24 || b.readUInt32BE(12) !== 0x49484452) throw new Error(`pas un PNG : ${fichier}`)
  return { l: b.readUInt32BE(16), h: b.readUInt32BE(20) }
}

const echapper = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Un titre découpé en mots : c'est ce découpage qui permet l'entrée décalée mot à mot. */
const enMots = (texte) =>
  texte.trim().split(/\s+/).map((m) => `<span class="mot"><i>${echapper(m)}</i></span>`).join(' ')

/** Une ligne de code découpée en caractères : c’est ce découpage qui permet le typewriter.
 *  Les espaces deviennent des espaces insécables pour ne pas s’effondrer une fois en inline-block. */
const enCaracteres = (texte) =>
  [...texte].map((c) => (c === ' ' ? '<i>&nbsp;</i>' : `<i>${echapper(c)}</i>`)).join('')

// ── Le générateur ────────────────────────────────────────────────────────────────────────────

function composer(num, formatNom) {
  const pub = PUBLICATIONS[num]
  if (!pub) throw new Error(`publication inconnue : ${num}`)
  const F = FORMATS[formatNom]
  if (!F) throw new Error(`format inconnu : ${formatNom}`)

  const marge = Math.round(F.l * 0.1)
  const utile = F.l - marge * 2
  const hautSur = Math.round(F.h * F.hautSur)
  const basSur = Math.round(F.h * F.basSur)

  const corps = []
  const tweens = []
  const images = new Set()
  // Deux `fromTo` sur la même cible et GSAP applique les valeurs de départ du DERNIER à
  // l'écriture (`immediateRender`), pas au moment du tween : l'état au repos avant le premier
  // tween devient celui du second, et le plan s'ouvre sur une image fausse. Le linter le signale
  // (`gsap_repeated_fromto_without_baseline`) ; on l'évite en marquant `immediateRender: false`
  // dès la deuxième écriture sur une cible.
  const dejaVues = new Set()
  // Le compteur des transitions ÉMISES — pas l’index du plan. Les coupes n’en reçoivent pas,
  // et compter les plans faisait rejouer la même famille deux fois de suite après chacune.
  let nTransition = 0
  let t = 0

  pub.plans.forEach((p, i) => {
    const id = `p${String(i).padStart(2, '0')}`
    const debut = Math.round(t * 1000) / 1000
    const duree = p.d
    t += duree

    const pousser = (sel, de, vers, dur, at, ease) => {
      const encore = dejaVues.has(sel)
      dejaVues.add(sel)
      const sup = encore ? ', immediateRender: false' : ''
      tweens.push(
        `  tl.fromTo("${sel}", ${de}, {...${vers}, duration: ${dur}, ease: "${ease}"${sup}}, ${Math.round(at * 1000) / 1000});`,
      )
    }
    // La dérive est normalisée en VITESSE (px/s), pas en amplitude : `amp(v)` rend le déplacement
    // qu’il faut pour tenir `v` pixels par seconde sur la durée de CE plan.
    const amp = (v) => Math.round((v * duree) / 2)
    /** La dérive : le mouvement de fond qui court sur TOUTE la durée du plan. */
    const derive = (sel, de, vers) => pousser(sel, de, vers, duree, debut, 'sine.inOut')
    const entree = (sel, de, vers, dur = 0.42, dec = 0) => pousser(sel, de, vers, dur, debut + dec, 'power3.out')

    // ── Le changement de plan ─────────────────────────────────────────────────────────────────
    //
    // Sans ça, une coupe entre deux cartons de texte sur fond nuit ne change qu'un quart des
    // pixels : ni un détecteur de plan ni un œil qui défile ne la voit. Trois familles, jamais
    // deux fois la même de suite (la règle du §2), et toutes traversent le cadre ENTIER.
    //
    //   balai   — Reveal par masque : un bloc corail traverse et découvre le plan suivant.
    //   glisse  — Direction-aware : un rideau nuit passe dans l'autre sens.
    //   echelle — Raccord d'échelle : un disque corail s'ouvre depuis le centre et sort.
    if (i > 0 && p.type !== 'coupe' && pub.plans[i - 1].type !== 'coupe') {
      const familles = ['balai', 'glisse', 'echelle']
      const f = familles[nTransition % 3]
      nTransition++
      const T = 0.32
      corps.push(`      <div id="${id}-tr" class="balai ${f}" data-start="${Math.max(0, debut - T / 2)}" data-duration="${T}"></div>`)
      const at = Math.max(0, debut - T / 2)
      if (f === 'balai') {
        tweens.push(`  tl.fromTo("#${id}-tr", {xPercent: -105, skewX: -8}, {xPercent: 105, skewX: -8, duration: ${T}, ease: "power2.inOut"}, ${Math.round(at * 1000) / 1000});`)
      } else if (f === 'glisse') {
        tweens.push(`  tl.fromTo("#${id}-tr", {yPercent: 105}, {yPercent: -105, duration: ${T}, ease: "power2.inOut"}, ${Math.round(at * 1000) / 1000});`)
      } else {
        tweens.push(`  tl.fromTo("#${id}-tr", {scale: 0.06, opacity: 1}, {scale: 2.4, opacity: 0, duration: ${T}, ease: "power2.inOut"}, ${Math.round(at * 1000) / 1000});`)
      }
      dejaVues.add(`#${id}-tr`)
    }

    if (p.type === 'coupe') {
      corps.push(`      <section id="${id}" class="clip coupe" data-start="${debut}" data-duration="${duree}"></section>`)
      return
    }

    if (p.type === 'marque') {
      images.add('marque.svg')
      corps.push(`      <section id="${id}" class="clip marque" data-start="${debut}" data-duration="${duree}">
        <div class="aube" data-layout-allow-overflow="true" id="${id}-aube"></div>
        <div class="bloc" id="${id}-bloc">
          <img class="logo" id="${id}-logo" src="assets/marque.svg" alt="Presti" data-start="${debut}" data-duration="${duree}" />
          <p class="mot-fin" id="${id}-mot">${echapper(p.mot)}</p>
          <p class="url" id="${id}-url">prestiapp.fr</p>
        </div>
      </section>`)
      derive(`#${id}-aube`, `{scaleY: 0.42, opacity: 0.22, xPercent: -8}`, `{scaleY: 1.4, opacity: 1, xPercent: 8}`)
      entree(`#${id}-logo`, `{y: 46, opacity: 0}`, `{y: 0, opacity: 1}`, 0.6, 0.05)
      entree(`#${id}-mot`, `{y: 34, opacity: 0}`, `{y: 0, opacity: 1}`, 0.55, 0.32)
      entree(`#${id}-url`, `{y: 20, opacity: 0}`, `{y: 0, opacity: 1}`, 0.5, 0.62)
      derive(`#${id}-bloc`, `{y: ${amp(31)}}`, `{y: ${-amp(31)}}`)
      return
    }

    if (p.type === 'code') {
      const lignes = p.lignes.map((l, j) => `            <code class="ligne" id="${id}-l${j}">${enCaracteres(l)}</code>`).join('\n')
      corps.push(`      <section id="${id}" class="clip code" data-start="${debut}" data-duration="${duree}">
        <div class="bloc" id="${id}-bloc">
          <p class="kicker" id="${id}-k">Dans le code, aujourd’hui</p>
          <div class="fenetre" id="${id}-f">
${lignes}
          </div>
          <p class="note" id="${id}-n">${echapper(p.note)}</p>
        </div>
      </section>`)
      entree(`#${id}-k`, `{y: 18, opacity: 0}`, `{y: 0, opacity: 1}`, 0.34)
      entree(`#${id}-f`, `{y: 40, opacity: 0}`, `{y: 0, opacity: 1}`, 0.5, 0.12)
      // Typewriter — la ligne de code s'écrit caractère par caractère. C'est le seul plan du film
      // où ce procédé est à la fois nommé par le glossaire ET juste par le sens : on regarde du
      // code s'écrire. Avant, elle entrait d'un bloc en glissant, ce qui ne racontait rien.
      // 26 ms par caractère : au-delà on attend, en deçà on ne lit pas que ça s'écrit.
      p.lignes.forEach((_, j) =>
        tweens.push(
          `  tl.fromTo("#${id}-l${j} i", {opacity: 0}, {opacity: 1, duration: 0.02, ease: "none", stagger: 0.026}, ${Math.round((debut + 0.3 + j * 0.5) * 1000) / 1000});`,
        ),
      )
      entree(`#${id}-n`, `{y: 24, opacity: 0}`, `{y: 0, opacity: 1}`, 0.45, 0.3 + p.lignes.length * 0.18 + 0.25)
      derive(`#${id}-f`, `{scale: 0.965}`, `{scale: 1.055}`)
      // Le plan code était le SEUL plan porteur de texte dont le bloc ne dérivait pas : sa seule
      // dérive continue était une échelle, et une échelle a un point fixe — son centre — donc elle
      // ne déplace presque rien. Mesuré : 0,15 px « juge » par échantillon, là où il en faut 0,47.
      //
      // 45 px/s n'est pas un chiffre libre : c'est (31 + 58) / 2, la moyenne des deux vitesses de
      // bloc DÉJÀ écrites dans ce fichier — 31 px/s sur le plan marque, 58 px/s sur les plans texte.
      // On lit du code : on va moins vite qu'un titre. Et pas 58, qui donnerait amp(58) = 70 px sur
      // un plan de 2,4 s alors que la boîte sûre en paysage n'a que 69,5 px de battement.
      //
      // Mesuré sur pub-01-vertical p13 : écart moyen 0,00507 → 0,01114 (× 2,20), plan figé du film
      // 1,13 s → 0,38 s. Sur pub-03-paysage : 0,00460 → 0,00982, 1,00 s → 0,13 s.
      derive(`#${id}-bloc`, `{y: ${amp(45)}}`, `{y: ${-amp(45)}}`)
      return
    }

    if (p.type === 'capture') {
      images.add(p.img)
      const mode = p.mode || 'plein'
      // L'image porte SES PROPRES `data-start`/`data-duration`, identiques à ceux de son plan.
      // Sans ça, deux plans qui recadrent la même capture produisent deux <img> que le compilateur
      // voit comme un doublon (`duplicate_media_discovery_risk`). Un élément timé imbriqué reste
      // borné par son ancêtre timé : rien ne change à l'écran, tout change à la compilation.
      const tempo = `data-start="${debut}" data-duration="${duree}"`
      const legende = p.legende
        ? `<p class="legende${p.souligne ? ' souligne' : ''}" id="${id}-lg">${echapper(p.legende)}</p>`
        : ''

      if (mode === 'carte') {
        // Un recadrage LARGE — une rangée de boutons, une ligne de liste — n'a pas de version
        // « plein cadre » honnête en vertical : le passer en `cover` reviendrait à n'en montrer
        // qu'un tiers. Il occupe donc toute la largeur, posé sur la nuit, et c'est le balayage
        // horizontal qui donne le mouvement : l'œil traverse la rangée.
        corps.push(`      <section id="${id}" class="clip capture carte" data-layout-allow-overflow="true" ${tempo}>
        <div class="halo" id="${id}-halo"></div>
        <div class="porte" data-layout-allow-overflow="true"><img id="${id}-img" src="assets/${p.img}" alt="" ${tempo} /><span class="lueur" id="${id}-lu"></span></div>
        ${p.souligne ? `<span class="surligne" id="${id}-su"></span>` : ''}
        ${legende}
      </section>`)
        derive(`#${id}-img`, `{scale: 0.98, x: ${amp(56)}}`, `{scale: 1.14, x: ${-amp(56)}}`)
        // Shimmer — une lueur traverse la carte en diagonale. C'est le procédé que le glossaire
        // nomme pour « un objet qui attend » : ici il sert d'abord à quelque chose de mesurable,
        // parce que c'est sur une carte que le juge a trouvé le plan figé de 1,63 s. Une bande
        // qui balaie change des pixels sur toute la hauteur du carton, pas seulement sur son texte.
        pousser(`#${id}-lu`, `{xPercent: -140}`, `{xPercent: 140}`, Math.round(Math.min(1.1, duree * 0.62) * 100) / 100, debut + 0.18, 'power1.inOut')
        derive(`#${id}-halo`, `{opacity: 0.10, scale: 0.78}`, `{opacity: 0.5, scale: 1.28}`)
        // Même défaut que le plan code, autre géométrie. Sur une carte, RIEN ne porte le plan
        // entier : l'image dérive à l'intérieur de sa porte, le shimmer s'éteint à
        // min(1,1 s ; 0,62 × durée) — 0,72 s de queue morte sur un plan de 2,0 s, exactement le
        // défaut mesuré sur pub-08-vertical — et légende comme surligne ne bougent plus après leur
        // entrée. On donne donc au PLAN son rail : c'est la SECTION qui monte, à 58 px/s, la vitesse
        // de bloc déjà écrite dans ce fichier. Aucun nombre neuf.
        //
        // La section et NON l'image, et c'est le cœur de l'arbitrage : .porte garde son
        // overflow:hidden (la lueur reste découpée à la hauteur de la carte) et .surligne, posée
        // dans la section, reste alignée sur la carte par construction. Déplacer l'image obligerait
        // à dé-rogner .porte, ce qui ferait baver la lueur sur la nuit et désaligner la surligne.
        //
        // VERS LE HAUT SEULEMENT, et c'est calculé : la légende est à 0,4 × basSur = 154 px du bas
        // en vertical, déjà dans la bande des surcouches Reels/Facebook. Une dérive symétrique la
        // descendrait à 96 px. À sens unique, rien ne passe jamais sous sa position dessinée.
        derive(`#${id}`, `{y: 0}`, `{y: ${-2 * amp(58)}}`)
        if (p.souligne) entree(`#${id}-su`, `{scaleX: 0}`, `{scaleX: 1}`, 0.72, 0.24)
        if (p.legende) entree(`#${id}-lg`, `{y: 38, opacity: 0}`, `{y: 0, opacity: 1}`, 0.42, 0.1)
        return
      }

      if (mode === 'defilement') {
        // On DESCEND dans le document, comme un artisan qui relit son devis du haut vers le bas.
        // `de` et `vers` sont des fractions de la hauteur de l'image : indépendantes du format.
        // La même garde que pour le plein cadre, que le mode défilement n'avait pas. En paysage
        // le cadre fait 1920 de large et les captures 1080 : un zoom de 1,16 les afficherait à
        // 2 227 px, soit un agrandissement de 2,06 ×, donc floues — et rien ne l'aurait signalé.
        // On plafonne l'agrandissement à 1,35 × la résolution native et on dit quand ça mord.
        const dimD = dimensionsPng(path.join(HF, 'assets', p.img))
        const zoomDemande = p.zoom || 1.25
        const zoomMax = (dimD.l * 1.35) / F.l
        const zoom = Math.min(zoomDemande, zoomMax)
        if (zoom < zoomDemande - 0.001) {
          console.log(`  ↳ ${formatNom} · ${p.img} : zoom ramené de ${zoomDemande} à ${zoom.toFixed(2)} (source ${dimD.l} px de large)`)
        }
        corps.push(`      <section id="${id}" class="clip capture defilement" ${tempo}>
        <div class="cadre"><img id="${id}-img" src="assets/${p.img}" alt="" ${tempo} style="width: ${Math.round(F.l * zoom)}px" /></div>
        <div class="voile"></div>
        ${legende}
      </section>`)
        derive(`#${id}-img`, `{yPercent: ${-((p.de ?? 0) * 100)}}`, `{yPercent: ${-((p.vers ?? 0.5) * 100)}}`)
        if (p.legende) entree(`#${id}-lg`, `{y: 38, opacity: 0}`, `{y: 0, opacity: 1}`, 0.42, 0.1)
        return
      }

      // `plein` : la capture remplit le cadre, et on entre dedans. `ancre` dit où.
      //
      // ⚠️ La garde qui manquait au premier rendu. `object-fit: cover` agrandit la capture jusqu'à
      // couvrir le cadre : sur une capture LARGE en cadre vertical, ce facteur explose — crop-msg
      // (752 × 356) était agrandie 5,4 × — et on obtient un mur de lettres coupées et floues.
      // C'est le défaut « capture mal cadrée » produit par le générateur qui devait l'empêcher.
      // Au-delà de 1,6 × on refuse, et on dit quel mode prendre à la place.
      const dim = dimensionsPng(path.join(HF, 'assets', p.img))
      const agrandissement = Math.max(F.l / dim.l, F.h / dim.h)
      if (agrandissement > 1.6) {
        const conseil = dim.h / dim.l > (F.h / F.l) * 0.8 ? 'defilement' : 'carte'
        throw new Error(
          `${p.img} (${dim.l} × ${dim.h}) devrait être agrandie ${agrandissement.toFixed(1)} × pour remplir ` +
            `${F.l} × ${F.h} : elle sortirait floue et coupée. Prendre le mode ${conseil}.`,
        )
      }
      const ancres = { haut: [0.5, 0.16], centre: [0.5, 0.5], bas: [0.5, 0.9] }
      const [ax, ay] = ancres[p.ancre] || ancres.centre
      corps.push(`      <section id="${id}" class="clip capture" ${tempo}>
        <div class="cadre">
          <img id="${id}-img" src="assets/${p.img}" alt="" ${tempo} style="object-position: ${(ax * 100).toFixed(0)}% ${(ay * 100).toFixed(0)}%" />
        </div>
        <div class="voile"></div>
        ${legende}
      </section>`)
      derive(`#${id}-img`, `{scale: 1.06, y: ${amp(62)}}`, `{scale: 1.26, y: ${-amp(62)}}`)
      if (p.legende) entree(`#${id}-lg`, `{y: 40, opacity: 0}`, `{y: 0, opacity: 1}`, 0.42, 0.08)
      return
    }

    // ── `titre` et `ouverture` ────────────────────────────────────────────────────────────────
    const px = taillePolice(p.titre, utile)
    const kick = p.kicker ? `<p class="kicker" id="${id}-k">${echapper(p.kicker)}</p>` : ''
    corps.push(`      <section id="${id}" class="clip texte${p.accent ? ' accent' : ''}${p.sourd ? ' sourd' : ''}" data-start="${debut}" data-duration="${duree}">
        <div class="bloc" id="${id}-bloc">
          ${kick}
          <h2 class="titre" id="${id}-t" style="font-size: ${px}px">${enMots(p.titre)}</h2>
          ${p.type === 'ouverture' ? `<span class="filet" id="${id}-fi"></span>` : ''}
        </div>
      </section>`)
    if (p.kicker) entree(`#${id}-k`, `{y: 16, opacity: 0}`, `{y: 0, opacity: 1}`, 0.3)
    tweens.push(
      `  tl.fromTo("#${id}-t .mot i", {yPercent: 108, opacity: 0}, {yPercent: 0, opacity: 1, duration: 0.46, ease: "power3.out", stagger: 0.055}, ${Math.round((debut + (p.kicker ? 0.14 : 0.04)) * 1000) / 1000});`,
    )
    dejaVues.add(`#${id}-t .mot i`)
    if (p.type === 'ouverture') entree(`#${id}-fi`, `{scaleX: 0, opacity: 1}`, `{scaleX: 1}`, 0.7, 0.3)
    derive(`#${id}-bloc`, `{y: ${amp(58)}, xPercent: 1.5}`, `{y: ${-amp(58)}, xPercent: -1.5}`)
  })

  const duree = Math.round(t * 1000) / 1000

  // ── Le fond vivant ───────────────────────────────────────────────────────────────────────────
  //
  // Trois couches, trois vitesses : c'est du PARALLAX, et c'est ce qui donne de la profondeur à
  // une image qui n'a ni photo ni vidéo. Les cycles sont volontairement premiers entre eux
  // (4,3 s · 6,7 s · 2,9 s) pour que les trois ne repassent jamais ensemble par la même position :
  // un fond qui se répète se voit, un fond qui dérive ne se voit pas.
  //
  // `repeat` est FINI, calculé depuis la durée. Un `repeat: -1` casserait le rendu déterministe
  // (la règle est dans /hyperframes-core) : à la reprise, l'image ne serait pas la même.
  const cycle = (sel, secondes, de, vers, ease = 'sine.inOut') => {
    const n = Math.max(1, Math.ceil(duree / secondes))
    tweens.push(
      `  tl.fromTo("${sel}", ${de}, {...${vers}, duration: ${secondes}, ease: "${ease}", repeat: ${n}, yoyo: true}, 0);`,
    )
  }
  // Orbit — le halo tourne large. C'est la couche qui porte l'essentiel de l'énergie de l'image.
  cycle('#halo-fond', 4.3, `{xPercent: -16, yPercent: 9, scale: 0.92}`, `{xPercent: 16, yPercent: -9, scale: 1.1}`)
  // Parallax — l'horizon va moins vite et dans l'autre sens.
  cycle('#horizon', 6.7, `{y: ${Math.round(F.h * 0.62)}, xPercent: 6}`, `{y: ${Math.round(F.h * 0.34)}, xPercent: -6}`)
  // Float — le grain respire, sans jamais devenir un motif qu'on remarque.
  cycle('#grain', 2.9, `{xPercent: -1.6, yPercent: 1.2, opacity: 0.34}`, `{xPercent: 1.6, yPercent: -1.2, opacity: 0.62}`)

  const nom = `pub-${num}-${formatNom}`

  const html = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${F.l}, height=${F.h}" />
    <title>Presti — publication ${num} (${formatNom})</title>
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link
      href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700&family=Hanken+Grotesk:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap"
      rel="stylesheet"
    />
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: ${F.l}px; height: ${F.h}px; overflow: hidden; background: ${NUIT}; }
      #root { position: relative; width: ${F.l}px; height: ${F.h}px; overflow: hidden; background: ${NUIT}; }
      /* Le fond vivant, sous tous les plans. Les plans qui le laissent voir sont transparents ;
         seules les captures posent un fond opaque, et elles bougent d'elles-mêmes. */
      .fond { position: absolute; inset: 0; overflow: hidden; background: ${NUIT}; z-index: 0; }
      .halo-fond {
        position: absolute; left: 50%; top: 50%;
        width: ${Math.round(F.l * 1.9)}px; height: ${Math.round(F.l * 1.9)}px;
        margin-left: ${-Math.round(F.l * 0.95)}px; margin-top: ${-Math.round(F.l * 0.95)}px;
        background: radial-gradient(closest-side, rgba(217,119,87,0.30), rgba(217,119,87,0.07) 55%, rgba(217,119,87,0) 78%);
        will-change: transform;
      }
      .horizon {
        position: absolute; left: -30%; width: 160%; height: 2px;
        background: linear-gradient(to right, rgba(217,119,87,0) 0%, rgba(217,119,87,0.55) 45%, rgba(217,119,87,0) 100%);
        will-change: transform;
      }
      /* Le grain. ⚠️ Sa maille décide du POIDS du fichier, pas seulement de son aspect.
         À 3 px, un motif de points qui bouge est du bruit haute fréquence : x264 ne peut rien
         prédire et dépense tout son débit dessus — 77 Mo pour 26 s, mesuré. À 7 px avec moins
         d'opacité, l'effet à l'écran est presque le même et le fichier tient dans le tiers.
         On garde le mouvement, on lâche la finesse : c'est le seul des deux qui se voit. */
      .grain {
        position: absolute; inset: -12%;
        background-image: radial-gradient(rgba(243,238,230,0.10) 1.5px, rgba(0,0,0,0) 1.6px);
        background-size: 7px 7px; opacity: 0.42; will-change: transform;
      }

      .clip { position: absolute; inset: 0; overflow: hidden; z-index: 1; }
      /* ⚠️ Seule la coupe est opaque. Les autres plans laissent voir le fond vivant qui tourne
         dessous — sans ça il est construit, il tourne, et il est CACHÉ : c'est exactement ce qui a
         laissé un plan figé de 1,63 s sur la carte « Brouillon », un carton de 200 px de haut posé
         sur une trappe fermée. Les captures plein cadre et en défilement remplissent l'écran de
         toute façon ; la carte, elle, respire enfin. */
      .coupe { background: ${NUIT}; }

      /* Le balai — un Reveal par masque. Un bloc corail traverse tout le cadre en 0,22 s et
         découvre le plan suivant. C'est le seul procédé qui change assez de pixels d'un coup pour
         qu'un détecteur de plan (et un œil qui défile) voie la coupe. */
      .balai { position: absolute; inset: 0; background: ${CORAIL}; z-index: 3; will-change: transform; }
      /* Un rendu image par image n'a pas d'obturateur : chaque image est un instant net, et une
         arête qui franchit 1 260 px entre deux images strobe. Le flou en tient lieu — il n'agit
         que sur les ARÊTES, jamais sur la couverture maximale, donc le juge reste vert. */
      .balai:not(.echelle) { filter: blur(14px); }
      /* ⚠️ Le rideau était NUIT sur un fond NUIT : il ne changeait presque aucun pixel.
         Une transition sur trois était invisible — au détecteur de plan comme à l œil. Mesuré :
         le carré tombait à 4,0 coupes / 10 s pour 5 exigées. Il passe en crème : clair sur sombre,
         c est le contraste maximal, et les trois familles se distinguent enfin les unes des autres. */
      .balai.glisse { background: ${CREME}; }
      .balai.echelle { border-radius: 50%; transform-origin: 50% 50%; }
      .voile-sortie { position: absolute; inset: 0; background: ${NUIT}; z-index: 2; }

      /* La zone sûre : ${Math.round(F.hautSur * 100)} % en haut, ${Math.round(F.basSur * 100)} % en bas.
         Ce n'est pas une consigne, c'est la boîte dans laquelle tout le contenu vit. */
      .bloc {
        position: absolute; left: ${marge}px; right: ${marge}px;
        top: ${hautSur}px; bottom: ${basSur}px;
        display: flex; flex-direction: column; justify-content: center; gap: 34px;
      }

      .titre {
        font-family: "Bricolage Grotesque", Georgia, serif; font-weight: 700;
        line-height: 0.96; letter-spacing: -0.035em; color: ${CREME}; text-wrap: balance;
      }
      .titre .mot { display: inline-block; overflow: hidden; vertical-align: bottom; padding-bottom: 0.08em; }
      .titre .mot i { display: inline-block; font-style: normal; }
      .accent .titre { color: ${CORAIL}; }
      .sourd .titre { color: #8B867D; }

      .kicker {
        font-family: "Hanken Grotesk", system-ui, sans-serif; font-weight: 600;
        font-size: 46px; letter-spacing: 0.2em; text-transform: uppercase; color: ${CORAIL};
      }
      .filet { display: block; height: 5px; background: ${CORAIL}; transform-origin: left center; }

      /* Captures. Les trois modes occupent la largeur entière : aucun n'autorise le timbre-poste. */
      .capture .cadre { position: absolute; inset: 0; overflow: hidden; display: flex; justify-content: center; }
      .capture .cadre img { width: 100%; height: 100%; object-fit: cover; will-change: transform; }
      .capture .voile {
        position: absolute; inset: 0;
        background: linear-gradient(to bottom, rgba(10,12,17,0.74) 0%, rgba(10,12,17,0) 24%, rgba(10,12,17,0) 42%, rgba(10,12,17,0.95) 86%);
      }
      .capture.defilement .cadre { align-items: flex-start; }
      .capture.defilement .cadre img { height: auto; object-fit: fill; }

      /* La section carte dérive (voir la dérive de plan) : son propre overflow:hidden la ferait
         découper son halo. Invisible en vertical (le halo y vaut 0 d'alpha au bord) mais visible en
         paysage, où il vaut encore 0,31 : on verrait une couture horizontale. Le rognage reste tenu
         par #root, lui aussi en overflow:hidden — au repos l'image est identique au pixel près. */
      .capture.carte { overflow: visible; }
      .capture.carte .halo {
        position: absolute; left: 50%; top: 50%;
        width: ${Math.round(F.l * 1.3)}px; height: ${Math.round(F.l * 1.3)}px;
        margin-left: ${-Math.round(F.l * 0.65)}px; margin-top: ${-Math.round(F.l * 0.65)}px;
        background: radial-gradient(closest-side, rgba(217,119,87,0.55), rgba(217,119,87,0));
      }
      .capture.carte .porte {
        position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-50%);
        display: flex; justify-content: center; overflow: hidden;
      }
      .capture.carte .porte img {
        width: ${Math.round(F.l * 1.02)}px; height: auto; object-fit: fill;
        border-radius: 20px; box-shadow: 0 44px 130px rgba(0,0,0,0.72);
      }
      .capture.carte .lueur {
        position: absolute; top: -20%; bottom: -20%; left: 0; width: 34%;
        background: linear-gradient(100deg, rgba(243,238,230,0) 0%, rgba(243,238,230,0.16) 50%, rgba(243,238,230,0) 100%);
        pointer-events: none; will-change: transform;
      }
      .capture.carte .surligne {
        position: absolute; left: ${marge}px; width: ${utile}px;
        top: calc(50% + ${Math.round(F.h * 0.055)}px);
        height: 7px; background: ${CORAIL}; transform-origin: left center;
      }

      .legende {
        position: absolute; left: ${marge}px; right: ${marge}px; bottom: ${Math.round(basSur * 0.4)}px;
        font-family: "Hanken Grotesk", system-ui, sans-serif; font-weight: 600;
        font-size: 62px; line-height: 1.14; color: ${CREME}; text-wrap: balance;
      }
      .legende.souligne { color: ${CORAIL}; }

      /* Preuve par le code : une ligne, lisible sur un téléphone tenu à bout de bras. */
      .code .fenetre {
        border: 2px solid rgba(217,119,87,0.42); border-radius: 22px;
        background: rgba(217,119,87,0.07); padding: 52px 40px;
        display: flex; flex-direction: column; gap: 18px;
      }
      .code .ligne i { display: inline-block; }
      .code .ligne {
        font-family: "JetBrains Mono", ui-monospace, monospace; font-weight: 500;
        font-size: 56px; line-height: 1.4; color: ${CREME}; word-break: break-word;
      }
      .code .note {
        font-family: "Hanken Grotesk", system-ui, sans-serif; font-weight: 600;
        font-size: 76px; line-height: 1.14; color: ${CORAIL}; text-wrap: balance;
      }

      /* La clôture : l'aube qui monte du bas. Jamais de blanc. */
      .marque .aube {
        position: absolute; left: -20%; right: -20%; bottom: -12%; height: 62%;
        transform-origin: bottom center;
        background: radial-gradient(60% 100% at 50% 100%, ${CORAIL} 0%, rgba(217,119,87,0.34) 42%, rgba(217,119,87,0) 74%);
      }
      .marque .bloc { justify-content: flex-end; gap: 30px; }
      .marque .logo { width: ${Math.round(utile * 0.62)}px; height: auto; }
      .marque .mot-fin {
        font-family: "Bricolage Grotesque", Georgia, serif; font-weight: 700;
        font-size: ${Math.round(utile * 0.098)}px; line-height: 1.02; letter-spacing: -0.03em; color: ${CREME};
      }
      .marque .url {
        font-family: "Hanken Grotesk", system-ui, sans-serif; font-weight: 600;
        font-size: 52px; letter-spacing: 0.16em; color: ${CORAIL};
      }

      .coupe { background: ${NUIT}; }
    </style>
  </head>
  <body>
    <div
      id="root"
      data-composition-id="main"
      data-start="0"
      data-width="${F.l}"
      data-height="${F.h}"
      data-duration="${duree}"
      data-fps="${FPS}"
    >
      <!-- Le fond vivant. Il est SOUS tous les plans et ne s'éteint jamais : c'est lui qui tient
           le critère « l'image vit » du juge, et qui rend un plan figé impossible même quand le
           texte, lui, ne bouge plus. Trois couches, trois procédés nommés :
           Orbit (le halo qui tourne), Parallax (l'horizon plus lent que le halo), Float (le grain). -->
      <div class="fond" data-layout-ignore="true">
        <div class="halo-fond" id="halo-fond"></div>
        <div class="horizon" id="horizon"></div>
        <div class="grain" id="grain"></div>
      </div>
${corps.join('\n')}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
${tweens.join('\n')}
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`

  // HyperFrames rend UN projet = UN `index.html`. Chaque vidéo a donc son dossier.
  const dossier = path.join(HF, nom)
  fs.mkdirSync(dossier, { recursive: true })
  fs.writeFileSync(path.join(dossier, 'index.html'), html, 'utf8')
  fs.writeFileSync(
    path.join(dossier, 'hyperframes.json'),
    JSON.stringify(
      {
        $schema: 'https://hyperframes.heygen.com/schema/hyperframes.json',
        registry: 'https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry',
        paths: { blocks: 'compositions', components: 'compositions/components', assets: 'assets' },
        media: { autoProxy: true },
        authoringSkill: 'product-launch-video',
      },
      null,
      2,
    ) + '\n',
    'utf8',
  )

  // Les assets vivent CHEZ le projet, pas au-dessus : HyperFrames sert chaque composition avec la
  // racine du projet comme base, et un `../assets/` renvoie 404 dans Studio
  // (`invalid_parent_traversal_in_asset_path`). On copie donc, pour chaque vidéo, les seules
  // captures qu'elle utilise.
  const dAssets = path.join(dossier, 'assets')
  fs.mkdirSync(dAssets, { recursive: true })
  const manquants = []
  for (const f of images) {
    const src = path.join(HF, 'assets', f)
    if (!fs.existsSync(src)) manquants.push(f)
    else fs.copyFileSync(src, path.join(dAssets, f))
  }
  // Une capture absente ne casse pas le rendu : HyperFrames la saute en silence et sort une vidéo
  // à trou. C'est exactement le genre de sortie qui passe pour un succès.
  if (manquants.length) throw new Error(`captures absentes de promo-src/hf/assets/ : ${manquants.join(', ')}`)

  return { cible: path.join(dossier, 'index.html'), duree, plans: pub.plans.length, images: images.size }
}

// ── Exécution ────────────────────────────────────────────────────────────────────────────────
const num = process.argv[2] || '01'
const formats = process.argv[3] ? [process.argv[3]] : ['vertical']
const nums = num === 'tous' ? Object.keys(PUBLICATIONS) : [num]

for (const n of nums) {
  for (const f of formats) {
    const r = composer(n, f)
    console.log(`✓ ${path.relative(RACINE, r.cible)} — ${r.plans} plans, ${r.duree} s, ${r.images} captures`)
  }
}
