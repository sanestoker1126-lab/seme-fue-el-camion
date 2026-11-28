from playwright.sync_api import sync_playwright
from pathlib import Path
from urllib.parse import urlparse,unquote
import re,base64,mimetypes,json,sys
from functools import lru_cache
root=Path(sys.argv[1]).resolve();out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
@lru_cache(maxsize=300)
def data(path):
 p=(root/path).resolve()
 if not p.is_relative_to(root) or not p.is_file(): return None
 return 'data:'+(mimetypes.guess_type(p.name)[0] or 'application/octet-stream')+';base64,'+base64.b64encode(p.read_bytes()).decode()
missing=set()
def fetch_asset(_,path):
 path=unquote(path.split('?')[0]); x=data(path)
 if not x:missing.add(path)
 return x
h=(root/'Se_Me_Fue_El_Camion.html').read_text()
def css(m):
 path=m[1].split('?')[0]; p=root/path
 c=p.read_text()
 def url(n):
  u=n[1].strip('\'"');a=(p.parent/u).resolve()
  if a.is_file() and a.is_relative_to(root): return 'url("'+data(str(a.relative_to(root)))+'")'
  return n[0]
 return '<style>'+re.sub(r'url\(([^)]+)\)',url,c)+'</style>'
h=re.sub(r'<link rel="stylesheet" href="([^"]+)">',css,h)
h=re.sub(r'<link[^>]+>','',h)
def script(m):
 p=root/m[1].split('?')[0];s=p.read_text()
 if p.name=='main.js':s=s.replace('new URLSearchParams(location.search)','new URLSearchParams("qa=1&manual=1")')
 return '<script>'+s.replace('</script','<\\/script')+'</script>'
h=re.sub(r'<script src="([^"]+)"></script>',script,h)
h=re.sub(r'(<img[^>]+src=")([^"\s]+)(")',lambda m:m[1]+(data(m[2]) or m[2])+m[3],h)
# Only in-memory test harness: browser blocked all URL navigation; load exact source as HTML and local assets as data URLs.
bootstrap='''<script>
const desc=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,'src');
Object.defineProperty(HTMLImageElement.prototype,'src',{get:desc.get,set:function(v){if(typeof v==='string'&&v.startsWith('assets/')){let im=this;let token=(im._offlineToken||0)+1;im._offlineToken=token;window.localAsset(v).then(d=>{if(im._offlineToken===token){if(d)desc.set.call(im,d);else im.dispatchEvent(new Event('error'));}});}else{this._offlineToken=(this._offlineToken||0)+1;desc.set.call(this,v);}}});
</script>'''
h=h.replace('<body>','<body>'+bootstrap)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
 for w,ht in [(844,390),(390,844)]:
  c=b.new_context(viewport={'width':w,'height':ht},has_touch=True,is_mobile=True,device_scale_factor=1);page=c.new_page();errs=[];page.on('pageerror',lambda e:errs.append(str(e)));page.expose_binding('localAsset',fetch_asset)
  page.set_content(h,wait_until='domcontentloaded',timeout=30000);page.wait_for_function('window.CAMION_QA && !document.querySelector("#start").disabled',timeout=20000)
  page.evaluate('CAMION_QA.start(2,2,true)');page.wait_for_function('CAMION_QA.G.mission===2 && CAMION_QA.G.state==="playing"',timeout=20000)
  # position test actor near the boss, not a screenshot mockup; step actual game to discover it
  page.evaluate("""()=>{const q=CAMION_QA,g=q.G,a=g.world.poseidonArena,b=g.world.foes.find(f=>f.id===a.bossId);Object.assign(g.P,{x:b.x-170,y:b.y+15,vx:0,vy:0,ground:null,water:b.waterZone,submerged:true});g.cam.x=g.P.x-g.view.w/2;g.cam.y=g.P.y-g.view.h*.5;q.step(2,{});q.draw();}""")
  page.wait_for_function('!document.getElementById("bossCinematic").hidden',timeout=15000);page.wait_for_timeout(400);page.screenshot(path=str(out/f'cinematica_{w}.png'))
  page.locator('#bossCineSkip').click();page.wait_for_function('CAMION_QA.G.state==="playing"');page.evaluate('CAMION_QA.step(4,{});CAMION_QA.draw()');page.wait_for_timeout(900);page.evaluate('CAMION_QA.draw()');page.screenshot(path=str(out/f'arena_{w}.png'))
  page.evaluate("""()=>{const q=CAMION_QA,g=q.G,a=g.world.poseidonArena,b=g.world.foes.find(f=>f.id===a.bossId);b.state='aim';b.stateT=.25;b.targetX=g.P.x;b.targetY=g.P.y; q.step(1,{});q.draw();}""");page.screenshot(path=str(out/f'aviso_{w}.png'))
  print(w,errs,flush=True);assert not errs,errs;c.close()
 b.close()
print('missing',missing,flush=True)
