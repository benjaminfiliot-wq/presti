import urllib.request,urllib.parse,urllib.robotparser,json,re,time,concurrent.futures,html
targets=[('501647192','https://www.aclimatpalluas.com/'),('515093748','https://s-b-clim.fr/'),('897457594','https://www.3e-energies.com/')]
ua='PrestiPublicResearch/1.0 (+https://prestiapp.fr)'
def load(url):
    req=urllib.request.Request(url,headers={'User-Agent':ua})
    with urllib.request.urlopen(req,timeout=18) as r:
        if r.headers.get_content_type()!='text/html':return None
        return r.status,r.url,r.read(2000000).decode('utf-8','replace')
def links(body,base):
    result=[]
    for u in re.findall(r'href=["\']([^"\']+)',body,re.I):
        url=urllib.parse.urljoin(base,html.unescape(u));p=urllib.parse.urlsplit(url)
        if p.scheme not in ['http','https'] or p.netloc!=urllib.parse.urlsplit(base).netloc or p.query:continue
        url=urllib.parse.urlunsplit((p.scheme,p.netloc,p.path,'',''))
        if re.search(r'\.(jpg|png|webp|pdf|zip|svg|woff|js|css)$',p.path,re.I) or re.search(r'login|account|admin|connexion',p.path,re.I):continue
        if url not in result:result.append(url)
    return result
out=[]
for identifier,base in targets:
    parser=urllib.robotparser.RobotFileParser();robot='unknown'
    try:
        with urllib.request.urlopen(urllib.request.Request(base+'robots.txt',headers={'User-Agent':ua}),timeout=12) as r:
            raw=r.read().decode();parser.parse(raw.splitlines());robot='read'
    except urllib.error.HTTPError as e:
        if e.code==404:parser.parse([]);robot='absent_404'
    except Exception:pass
    if robot=='unknown':out.append({'id':identifier,'base':base,'robots':robot,'pages':[],'blocked':'robots_unknown'});continue
    if not parser.can_fetch(ua,base):out.append({'id':identifier,'base':base,'robots':robot,'pages':[],'blocked':'robots_disallow'});continue
    pages=[];seen=set();queue=[base]
    while queue and len(seen)<70:
        url=queue.pop(0)
        if url in seen:continue
        seen.add(url)
        if not parser.can_fetch(ua,url):pages.append({'url':url,'status':'robots_disallow'});continue
        try:
            loaded=load(url)
            if not loaded:continue
            status,final,body=loaded
            title=re.search(r'<title[^>]*>(.*?)</title>',body,re.S|re.I)
            hs=re.findall(r'<h[123][^>]*>(.*?)</h[123]>',body,re.S|re.I)
            text=lambda t:html.unescape(re.sub(r'<[^>]+>',' ',t)).strip()
            images=[urllib.parse.urljoin(url,html.unescape(u)) for u in re.findall(r'<img[^>]+src=["\']([^"\']+)',body,re.I)]
            discovered=links(body,base);forms=re.findall(r'<form\b',body,re.I)
            pages.append({'url':url,'final':final,'status':status,'title':text(title.group(1)) if title else None,'headings':[text(h) for h in hs][:25],'image_urls':list(dict.fromkeys(images)),'forms':len(forms),'links':discovered,'bytes':len(body),'method':'GET_public_no_submission'})
            for u in discovered:
                if u not in seen and u not in queue:queue.append(u)
        except urllib.error.HTTPError as exc:pages.append({'url':url,'status':exc.code})
        except Exception as exc:pages.append({'url':url,'status':'unavailable','error':type(exc).__name__})
        time.sleep(.15)
    out.append({'id':identifier,'base':base,'robots':robot,'pages':pages,'remaining_unread':queue,'complete_discovered':len(queue)==0,'limit':70})
print(json.dumps({'date':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'sites':out},ensure_ascii=False))
