import type { Fait, CanalTrouve, Formulaire, ProspectReserve, EnvoiPrepare, VerificationFait, MagasinSocle, Recuperateur, Horloge, Candidat } from './contrat';
import { recupererPoli, robotsAutorise } from './lecteurSite';
import { ficheParSiren, retenir } from './sirene';
import { createHash } from 'node:crypto';

export type Deps = { recuperer: Recuperateur; horloge: Horloge; echeance?: number; jetonMeta: string | null; magasin?: MagasinSocle };

const metaEtats = new WeakMap<object, string | null>();

function getLocalDeps(deps: Deps, url: string): Deps {
  try {
    const h = new URL(url).hostname;
    const cache = (deps as any)._domainDeps || ((deps as any)._domainDeps = new Map());
    if (!cache.has(h)) cache.set(h, { recuperer: deps.recuperer, horloge: deps.horloge, echeance: deps.echeance });
    return cache.get(h);
  } catch {
    return deps;
  }
}

async function fetchAvecAttente(url: string, deps: Deps) {
  const localDeps = getLocalDeps(deps, url);
  let rep = await recupererPoli(url, localDeps);
  while (rep && 'refus' in rep && rep.refus === 'trop_vite') {
     await deps.horloge.attendre(1000);
     rep = await recupererPoli(url, localDeps);
  }
  return rep;
}

export function normaliserTexte(s: string): string {
  if (!s) return '';
  let t = s.normalize('NFKC');
  t = t.replace(/&nbsp;/g, ' ')
       .replace(/&amp;/g, '&')
       .replace(/&lt;/g, '<')
       .replace(/&gt;/g, '>')
       .replace(/&quot;/g, '"')
       .replace(/&#39;/g, "'")
       .replace(/&apos;/g, "'");
  t = t.replace(/[‘’‚‛]/g, "'").replace(/[“”„‟«»]/g, '"');
  t = t.replace(/\xAD/g, '');
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

export function texteVisible(html: string): string {
  if (!html) return '';
  let visible = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
                    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
  visible = visible.replace(/<[^>]+>/g, ' ');
  return visible;
}

export async function verifierFait(fait: Fait, deps: Deps): Promise<VerificationFait> {
  if (fait.type.startsWith('site_')) {
    try {
      const rep = await fetchAvecAttente(fait.url, deps);
      if ('refus' in rep) return 'injoignable';
      if (rep.statut >= 500 || rep.statut === 0) return 'injoignable';
      
      const nv = normaliserTexte(texteVisible(rep.corps));
      const ne = normaliserTexte(fait.extrait);
      
      fait.empreinte_page = createHash('sha256').update(nv).digest('hex');
      
      if (nv.includes(ne)) return 'ok';
      return 'absent';
    } catch (e) {
      return 'injoignable';
    }
  } else if (fait.type === 'pub_meta') {
    if (!deps.jetonMeta) return 'non_verifiable';
    const err = metaEtats.get(deps);
    if (err) return 'non_verifiable';
    try {
      const url = `https://graph.facebook.com/v26.0/ads_archive?search_page_ids=[${fait.page_id}]&access_token=${deps.jetonMeta}`;
      const res = await deps.recuperer(url, { maxOctets: 1048576 });
      
      const st = res.statut;
      if (st === 190) { metaEtats.set(deps, 'jeton_invalide'); return 'non_verifiable'; }
      if (st === 1357045) { metaEtats.set(deps, 'en_attente_identite'); return 'non_verifiable'; }
      if (st === 4 || st === 17 || st === 32 || st === 613) { metaEtats.set(deps, 'limite'); return 'non_verifiable'; }
      if (st >= 500 || st === 0) { metaEtats.set(deps, 'injoignable'); return 'non_verifiable'; }
      
      let data: any;
      try { data = JSON.parse(res.corps); } catch { return 'non_verifiable'; }
      if (data.error) {
         const code = typeof data.error === 'object' ? data.error.code : data.error;
         if (code === 190) { metaEtats.set(deps, 'jeton_invalide'); }
         else if (code === 1357045) { metaEtats.set(deps, 'en_attente_identite'); }
         else if (code === 4 || code === 17 || code === 32 || code === 613) { metaEtats.set(deps, 'limite'); }
         else { metaEtats.set(deps, 'injoignable'); }
         return 'non_verifiable';
      }
      
      const arr = data.data || [];
      const ad = arr.find((a: any) => String(a.id) === String(fait.annonce_id));
      if (!ad) return 'absent';
      
      const ne = normaliserTexte(fait.extrait);
      const textes = ad.ad_creative_bodies || ad.textes || [];
      const titres = ad.ad_creative_link_titles || ad.titres || [];
      const ok = [...titres, ...textes].some(t => normaliserTexte(t).includes(ne));
      return ok ? 'ok' : 'absent';
    } catch (e: any) {
      const code = e.statut || e.code;
      if (code === 190) metaEtats.set(deps, 'jeton_invalide');
      else if (code === 1357045) metaEtats.set(deps, 'en_attente_identite');
      else if (code === 4 || code === 17 || code === 32 || code === 613) metaEtats.set(deps, 'limite');
      else metaEtats.set(deps, 'injoignable');
      return 'non_verifiable';
    }
  }
  return 'non_verifiable';
}

export async function verifierFormulaire(formulaire: Formulaire, deps: Deps): Promise<{ eligible: true } | { eligible: false, raison: string }> {
  try {
    const rep = await fetchAvecAttente(formulaire.url_page, deps);
    if ('refus' in rep) return { eligible: false, raison: rep.refus === 'robots_txt' ? 'robots_txt' : 'injoignable' };
    if (rep.statut >= 500 || rep.statut === 0) return { eligible: false, raison: 'injoignable' };
    
    if (formulaire.url_action && typeof rep.robots === 'string') {
      try {
        const u = new URL(formulaire.url_action, formulaire.url_page);
        if (!robotsAutorise(rep.robots, 'PrestiRecenseur', u.pathname + u.search)) {
          return { eligible: false, raison: 'robots_txt' };
        }
      } catch (e) { }
    }
    
    const html = rep.corps;
    
    if (/reCAPTCHA|hCaptcha|Turnstile/i.test(html)) return { eligible: false, raison: 'captcha' };
    if (/pot[ -_]?de[ -_]?miel|honeypot/i.test(html)) return { eligible: false, raison: 'pot_de_miel' };
    if (/je ne suis pas un robot|i am not a robot/i.test(html)) return { eligible: false, raison: 'case_robot' };
    if (/(?:combien font|quel est le r[eé]sultat|quelle est la capitale)/i.test(html)) return { eligible: false, raison: 'question_antispam' };
    if (/challenge-platform|cloudflare-static/i.test(html)) return { eligible: false, raison: 'defi_js' };
    if (/wordfence|sucuri/i.test(html)) return { eligible: false, raison: 'pare_feu' };
    if (/akismet|antispam/i.test(html)) return { eligible: false, raison: 'extension_antispam' };
    if (/(?:pas de d[eé]marchage|refusons.*d[eé]marchage|ne pas prospecter)/i.test(html)) return { eligible: false, raison: 'refus_demarchage' };
    
    let actionFound = false;
    const actionMatch = html.match(/<form[^>]*action=["']?([^"'\s>]+)["']?/i);
    if (actionMatch) {
        try {
            const expectedUrl = new URL(formulaire.url_action, formulaire.url_page).href;
            const foundUrl = new URL(actionMatch[1], formulaire.url_page).href;
            if (expectedUrl === foundUrl) actionFound = true;
        } catch(e) {}
    }
    if (!actionFound) {
        try {
           const u = new URL(formulaire.url_action, formulaire.url_page);
           if (html.includes(u.pathname)) actionFound = true;
        } catch (e) {}
        if (html.includes(formulaire.url_action)) actionFound = true;
    }
    if (!actionFound) return { eligible: false, raison: 'change' };
    
    if (formulaire.technologie !== 'autre') {
       let techFound = false;
       switch(formulaire.technologie) {
          case 'contact_form_7': techFound = /wpcf7|contact-form-7/i.test(html); break;
          case 'wpforms': techFound = /wpforms/i.test(html); break;
          case 'gravity_forms': techFound = /gform|gravityforms/i.test(html); break;
          case 'elementor': techFound = /elementor/i.test(html); break;
          case 'divi': techFound = /et_pb/i.test(html); break;
          case 'wix': techFound = /wix/i.test(html); break;
          case 'jimdo': techFound = /jimdo/i.test(html); break;
          case 'webflow': techFound = /webflow|w-form/i.test(html); break;
          case 'squarespace': techFound = /sqs/i.test(html); break;
          case 'shopify': techFound = /shopify/i.test(html); break;
          case 'html': techFound = true; break;
       }
       if (!techFound && formulaire.technologie !== 'html') return { eligible: false, raison: 'change' };
    }
    
    return { eligible: true };
  } catch (e) {
    return { eligible: false, raison: 'injoignable' };
  }
}

export async function verifierAvantEnvoi(envoi: EnvoiPrepare, prospect: Candidat, deps: Deps): Promise<{ j1: 'ok' | 'refus' | 'injoignable' | 'sans_objet', raisons: string[] }> {
  if (envoi.type !== 'premier_contact') return { j1: 'sans_objet', raisons: [] };
  
  if (envoi.fait_id) {
    const fait = prospect.faits.find(f => f.id === envoi.fait_id);
    if (fait) {
      const v = await verifierFait(fait, deps);
      if (v === 'absent') return { j1: 'refus', raisons: ['fait_absent'] };
      if (v === 'non_verifiable') return { j1: 'refus', raisons: ['fait_non_verifiable'] };
      if (v === 'injoignable') return { j1: 'injoignable', raisons: [] };
    } else {
      return { j1: 'refus', raisons: ['fait_absent'] };
    }
  }
  
  if (envoi.canal === 'formulaire_site' && prospect.formulaire) {
    const vf = await verifierFormulaire(prospect.formulaire, deps);
    if (!vf.eligible) {
      if (vf.raison === 'injoignable') return { j1: 'injoignable', raisons: [] };
      return { j1: 'refus', raisons: [`formulaire_${vf.raison}`] };
    }
  } else if (envoi.canal === 'formulaire_site' && !prospect.formulaire) {
    return { j1: 'refus', raisons: ['formulaire_change'] };
  }
  
  return { j1: 'ok', raisons: [] };
}

export async function executerJugeFaits(deps: Deps) {
  if (!deps.magasin) return;
  const prospects = await deps.magasin.reserver('recense', 15, 300);
  
  for (const p of prospects) {
    if (deps.echeance && deps.horloge.maintenant() >= deps.echeance) break;
    
    const oppose = await deps.magasin.estOppose({ siren: p.siren, domaine: p.domaine, instagram: p.instagram, page_meta: p.page_meta });
    if (oppose) {
      await deps.magasin.mettreAJour(p.id, 'recense', 'oppose', { raison: 'oppose_pendant_juge' });
      continue;
    }
    
    if (p.siren) {
      try {
        const fs = await ficheParSiren(p.siren, deps);
        if ('refus' in fs) {
           await deps.magasin.mettreAJour(p.id, 'recense', 'rejete', { raison: fs.refus });
           continue;
        }
        const ret = retenir(fs, p.cible);
        if ('refus' in ret) {
           await deps.magasin.mettreAJour(p.id, 'recense', 'rejete', { raison: ret.refus });
           continue;
        }
      } catch (e) { }
    }
    
    let aUnFaitOk = false;
    for (const f of p.faits) {
       if (deps.echeance && deps.horloge.maintenant() >= deps.echeance) break;
       const v = await verifierFait(f, deps);
       f.verifie = v;
       f.verifie_le = new Date(deps.horloge.maintenant()).toISOString();
       if (v === 'ok') aUnFaitOk = true;
    }
    
    const metaErr = metaEtats.get(deps);
    const metaOnly = p.faits.length > 0 && p.faits.every(f => f.type === 'pub_meta');
    if (metaOnly && metaErr && !aUnFaitOk) {
       continue; // wait for next time
    }
    
    let canaux = p.canaux || [];
    let aUnCanal = false;
    let newCanaux = [];
    
    for (const c of canaux) {
      if (c.nature === 'donnee_par_la_personne') {
         newCanaux.push(c);
         aUnCanal = true;
         continue;
      }
      if (c.canal === 'formulaire_site' && p.formulaire) {
         const vf = await verifierFormulaire(p.formulaire, deps);
         if (vf.eligible) {
            c.verifie = true;
            newCanaux.push(c);
            aUnCanal = true;
         } else {
            (p as any)._formulaireRejetRaison = vf.raison;
         }
      } else if (c.canal === 'instagram' || c.canal === 'facebook') {
         try {
           const rep = await fetchAvecAttente(c.url_source, deps);
           if (!('refus' in rep) && rep.statut < 500 && rep.statut !== 0) {
              const html = normaliserTexte(texteVisible(rep.corps));
              if (rep.corps.includes(c.valeur) || html.includes(normaliserTexte(c.valeur))) {
                 c.verifie = true;
                 newCanaux.push(c);
                 aUnCanal = true;
              }
           }
         } catch(e) {}
      }
    }
    
    let nextEtape = (aUnFaitOk && aUnCanal) ? 'verifie' : 'rejete';
    let raisons = [];
    if (!aUnFaitOk) raisons.push('aucun_fait_verifie');
    if (!aUnCanal) {
       if (canaux.some(c => c.canal === 'formulaire_site') && (p as any)._formulaireRejetRaison) {
         raisons.push(`formulaire_${(p as any)._formulaireRejetRaison}`);
       } else {
         raisons.push('aucun_canal_verifie');
       }
    }
    
    const faitsPatch = p.faits.filter(f => f.verifie === 'ok' || f.verifie === 'non_verifiable');
    
    await deps.magasin.mettreAJour(p.id, 'recense', nextEtape as any, { 
       faits: faitsPatch, 
       canaux: newCanaux, 
       raisons: raisons.length ? raisons : undefined 
    });
  }
  
  const metaBilan = metaEtats.get(deps);
  await deps.magasin.evenement({
     agent: 'juge_faits',
     type: 'passage_juge',
     resume: metaBilan ? `meta: '${metaBilan}'` : 'ok'
  });
  
  return metaBilan ? { meta: metaBilan } : {};
}
