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
results=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
 for w,ht in [(844,390),(390,844),(1280,720)]:
  c=b.new_context(viewport={'width':w,'height':ht},has_touch=w<1000,is_mobile=w<1000,device_scale_factor=1);page=c.new_page();errs=[];page.on('pageerror',lambda e:errs.append(str(e)));page.expose_binding('localAsset',fetch_asset)
  page.set_content(h,wait_until='domcontentloaded',timeout=30000);page.wait_for_function('window.CAMION_QA && document.querySelectorAll("#missions button").length === 5',timeout=12000);page.wait_for_function('!document.querySelector("#start").disabled',timeout=12000);page.wait_for_timeout(500);page.evaluate('CAMION_QA.draw()');page.wait_for_timeout(350)
  page.screenshot(path=str(out/f'menu_{w}.png'))
  counts=[];rects=[]
  for i in range(5):
   page.locator('#missions button').nth(i).click();counts.append(page.locator('#tramos button:not([disabled])').count());rects.append(page.locator('#start').bounding_box())
   if w==844 and i==4:page.screenshot(path=str(out/'menu_parafalls.png'))
  assert counts==[3,13,1,1,3],counts
  if w==844:
   for i in range(5):
    page.evaluate('(i)=>CAMION_QA.start(i,0,true)',i);page.wait_for_function('(i)=>CAMION_QA.G.mission===i && CAMION_QA.G.state==="playing"',arg=i,timeout=12000);page.evaluate('CAMION_QA.draw()');page.wait_for_timeout(1000);page.evaluate('CAMION_QA.draw()');page.wait_for_timeout(350);page.screenshot(path=str(out/f'world_{i}.png'))
  results.append({'viewport':[w,ht],'stops':counts,'start_rects':rects,'errors':errs});print(results[-1],flush=True);c.close()
 b.close()
(out/'qa.json').write_text(json.dumps({'runs':results,'missingAssets':sorted(missing)},indent=2));print('MISSING',missing,flush=True)
