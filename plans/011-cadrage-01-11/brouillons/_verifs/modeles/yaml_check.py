# Valide l'en-tête YAML des huit brouillons, avant et après substitution de {{title}} et {{date}}.
import glob, os, re, sys, yaml
dossier = sys.argv[1]
ok = True
for f in sorted(glob.glob(os.path.join(dossier, '*.md'))):
    t = open(f, encoding='utf-8').read()
    m = re.match(r'^---\r?\n(.*?)\r?\n---\r?\n', t, re.S)
    nom = os.path.basename(f)
    if not m:
        print('SANS EN-TETE', nom); ok = False; continue
    for etiquette, texte in (('brut', m.group(1)), ('rempli', m.group(1).replace('{{title}}', "ADR-004 — Brevo gratuit pour l'e-mail en masse").replace('{{date}}', '2026-11-01'))):
        try:
            d = yaml.safe_load(texte)
            cles = list(d.keys())
            mauvaises = [k for k in cles if not re.fullmatch(r'[A-Za-z_]+', k)]
            manque = [k for k in ('type', 'date', 'status', 'project', 'title', 'created', 'updated', 'tags') if k not in d]
            print(f'{nom} [{etiquette}] OK type={d.get("type")} status={d.get("status")} cles_hors_motif={mauvaises} manque={manque}')
        except Exception as e:
            ok = False; print(f'{nom} [{etiquette}] ERREUR {e}')
    print('   lignes :', t.count('\n') + (0 if t.endswith('\n') else 1), '; liens [[ :', ('[[' in t))
print('TOUT OK' if ok else 'ECHEC')
