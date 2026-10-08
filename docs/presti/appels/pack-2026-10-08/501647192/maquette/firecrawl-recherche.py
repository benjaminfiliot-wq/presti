import json, pathlib, urllib.request, time
key=pathlib.Path('/home/usine/.config/presti/firecrawl.key').read_text().strip()
def api(route,data=None):
    req=urllib.request.Request('https://api.firecrawl.dev/v2/'+route, data=json.dumps(data).encode() if data else None,headers={'Authorization':'Bearer '+key,'Content-Type':'application/json'})
    with urllib.request.urlopen(req,timeout=40) as response: return json.load(response)
start=api('team/credit-usage'); remaining=start.get('data',{}).get('remainingCredits',0)
if remaining<30: raise SystemExit('Solde insuffisant pour la recherche bornee')
queries=[('501647192','ACLIMAT PALLUAS Chaillevette Facebook Instagram'),('892085838','BARREAU PLOMBERIE CHAUFFAGE Saint Bonnet Facebook'),('105592232','GB UNERGY 16 Mouthiers sur Boeme site Facebook'),('800052888','JP PLOMBERIE Chasnais site Facebook'),('490868874','ROCHEREAU Jean Francois Talmont Saint Hilaire electricite Facebook'),('515093748','S B CLIM Montmoreau Facebook Instagram'),('749948725','PEREIRA JOSE Brie 16590 plomberie Facebook'),('930701495','Thomas VALLOT Essarts en Bocage plomberie Facebook'),('842319873','ZEN EAU La Reorthe plomberie Facebook'),('897457594','3E ENERGIES Landeronde Facebook Instagram')]
output={'date':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'remaining_before':remaining,'budget_estime_max':26,'results':[]}
for identifier,query in queries:
    try:
        response=api('search',{'query':query,'limit':5,'sources':['web'],'country':'FR'})
        output['results'].append({'id':identifier,'query':query,'success':response.get('success'),'data':response.get('data')})
    except Exception as exc: output['results'].append({'id':identifier,'query':query,'error':type(exc).__name__})
for identifier,url in [('501647192','https://www.aclimatpalluas.com/'),('515093748','https://s-b-clim.fr/'),('897457594','https://www.3e-energies.com/')]:
    try:
        response=api('scrape',{'url':url,'formats':['markdown','links'],'onlyMainContent':False,'timeout':20000})
        output['results'].append({'id':identifier,'url':url,'success':response.get('success'),'data':response.get('data')})
    except Exception as exc: output['results'].append({'id':identifier,'url':url,'error':type(exc).__name__})
output['usage_after']=api('team/credit-usage')
print(json.dumps(output,ensure_ascii=False))
