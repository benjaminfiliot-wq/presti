import pathlib, subprocess, json, hashlib, re, html, shutil, sys
from PIL import Image, ImageDraw, ImageFont
SOURCE=pathlib.Path('C:/Users/benja/Documents/presti-ops/veille/youtube')
DEST=pathlib.Path(__file__).parent
def sha(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
    return h.hexdigest()
def stamp(t):
    return f'{int(t)//3600:02}:{int(t)%3600//60:02}:{int(t)%60:02}'
def transcript(raw):
    output=[]; previous=[]; cues=0
    for block in re.split(r'\n\s*\n',raw.replace('\r\n','\n')):
        lines=block.splitlines(); found=next((i for i,l in enumerate(lines) if '-->' in l),None)
        if found is None:continue
        cues+=1; start=lines[found].split(' -->')[0].strip()
        text=html.unescape(re.sub(r'<[^>]+>','', ' '.join(lines[found+1:]))).strip()
        tokens=text.split()
        if not tokens:continue
        # YouTube repeats the previous subtitle line in the next rolling cue.
        overlap=0
        for n in range(min(len(previous),len(tokens)),0,-1):
            if previous[-n:]==tokens[:n]:overlap=n;break
        new=tokens[overlap:]
        if new:output.append(f'[{start}] '+ ' '.join(new))
        previous=tokens
    return '\n'.join(output)+'\n',cues,len(output)
index=[]
videos=sorted(SOURCE.glob('*/video.mp4'))+sorted((SOURCE.parent/'2026-09-24/videos').glob('*.mp4'))+list((SOURCE.parent/'2026-09-25').glob('*.mp4'))
if '--sample' in sys.argv:videos=videos[:1]
for video in videos:
    youtube=video.name=='video.mp4'
    ident=video.parent.name if youtube else video.stem; folder=DEST/ident;folder.mkdir(exist_ok=True)
    probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(video)]))
    stream=next(s for s in probe['streams'] if s['codec_type']=='video');duration=float(probe['format']['duration'])
    infopath=video.parent/'video.info.json' if youtube else ((video.parent.parent if video.parent.name=='videos' else video.parent)/(ident+'.info.json'))
    info=json.loads(infopath.read_text(encoding='utf-8')) if infopath.exists() else {}
    times=[duration*(i+.5)/8 for i in range(8)]
    sheet=Image.new('RGB',(2560,2*(360+48)),(24,24,24)); draw=ImageDraw.Draw(sheet)
    try:font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',25)
    except OSError:font=ImageFont.load_default()
    for i,t in enumerate(times):
        frame=folder/f'.frame-{i}.jpg'
        subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-threads','1','-ss',str(t),'-i',str(video),'-frames:v','1','-vf','scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2','-filter_threads','1','-q:v','3','-y',str(frame)],check=True)
        x=(i%4)*640;y=(i//4)*408
        with Image.open(frame) as im:sheet.paste(im,(x,y))
        draw.text((x+14,y+368),f'{i+1} / {stamp(t)}',font=font,fill='white');frame.unlink()
    sheet.save(folder/'planche.jpg',quality=88,optimize=True)
    vtt=next((video.parent/n for n in ['video.fr-orig.vtt','video.fr.vtt'] if (video.parent/n).exists()),None)
    metadata={'id':ident,'titre':info.get('title',ident),'url':info.get('webpage_url',f'https://www.youtube.com/watch?v={ident}' if youtube else None),'source':str(video),'taille_octets':video.stat().st_size,'sha256_video':sha(video),'duree_secondes':duration,'largeur':stream['width'],'hauteur':stream['height'],'codec_video':stream.get('codec_name'),'images_par_seconde':stream.get('avg_frame_rate'),'audio':[{'codec':s.get('codec_name'),'frequence':s.get('sample_rate'),'canaux':s.get('channels')} for s in probe['streams'] if s.get('codec_type')=='audio'],'images_secondes':times,'transcription':'MANQUANTE — aucun VTT local; ASR non exécuté'}
    if vtt:
        shutil.copyfile(vtt,folder/'sous-titres-originaux.vtt')
        text,cues,lines=transcript(vtt.read_text(encoding='utf-8-sig'))
        (folder/'transcription.txt').write_text(text,encoding='utf-8')
        metadata.update(transcription='COMPLÈTE depuis les sous-titres français locaux, non corrigée humainement',source_vtt=str(vtt),nombre_cues=cues,nombre_lignes_transcription=lines)
    else:
        voisin=video.parent.parent if video.parent.name=='videos' else video.parent
        texts=[voisin/(ident+'-voix-video.txt'),voisin/(ident+'.txt')]
        existing=next((p for p in texts if p.exists() and p.stat().st_size>100),None)
        if existing:
            if ident=='trevsagents':
                shutil.copyfile(existing,folder/'resume-local.txt')
                metadata.update(transcription='MANQUANTE — résumé français local disponible, pas transcription mot à mot',source_resume=str(existing))
                (folder/'transcription-manquante.txt').write_text('Le texte voisin est explicitement un résumé français. Transcription complète de la piste audio video.mp4 nécessaire. Le trevsagents.m4a voisin contient une musique différente.\n',encoding='utf-8')
            else:
                shutil.copyfile(existing,folder/'transcription.txt')
                metadata.update(transcription='TEXTE LOCAL intégral conservé; complétude et reconnaissance vocale non revérifiées',source_transcription=str(existing))
        else:(folder/'transcription-manquante.txt').write_text('Aucun sous-titre français local. La vidéo contient une piste audio, mais son contenu parlé reste à transcrire. Aucune transcription inventée.\n',encoding='utf-8')
    metadata['empreintes_documents']={p.name:sha(p) for p in folder.iterdir() if p.is_file() and p.name!='metadata.json'}
    (folder/'metadata.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    index.append(metadata);print(ident,metadata['transcription'],flush=True)
(DEST/'index.json').write_text(json.dumps({'videos_uniques':len(index),'attendu_catalogue':20,'transcriptions_disponibles':sum(not x['transcription'].startswith('MANQUANTE') for x in index),'videos':index},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
