const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = filename => fs.readFileSync(path.join(root, filename), 'utf8');
const scope = 'https://ejemplo.test/juegos/camion/';

function worker() {
  const handlers = new Map(), stores = new Map();
  const state = { requests: [], claimed: false, skipped: false };
  const absolute = key => typeof key === 'string' ? new URL(key, scope).href : key.url;
  const caches = {
    keys: async () => [...stores.keys()],
    delete: async key => stores.delete(key),
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const entries = stores.get(name);
      return {
        keys: async () => [...entries.keys()],
        match: async key => entries.get(absolute(key)),
        put: async (key, response) => entries.set(absolute(key), response),
        async add(key) {
          state.requests.push(key);
          if (key === state.failOn) throw new Error('recurso interrumpido');
          const filename = new URL(absolute(key)).pathname.slice(new URL(scope).pathname.length);
          assert.ok(fs.statSync(path.join(root, filename)).isFile(), 'falta ' + key);
          entries.set(absolute(key), absolute(key));
        }
      };
    }
  };
  vm.runInNewContext(read('sw.js'), {
    URL, caches, fetch: async () => { throw new Error('sin conexión'); },
    self: { registration: { scope }, clients: { claim() { state.claimed = true; } },
      skipWaiting() { state.skipped = true; }, addEventListener: (type, handler) => handlers.set(type, handler) }
  });
  return { state, stores, caches,
    async run(type, request) {
      let reply;
      const wait = [];
      handlers.get(type)({ request, waitUntil: p => wait.push(p), respondWith: p => { reply = p; } });
      const result = await reply;
      await Promise.all(wait);
      return result;
    }
  };
}

test('index conserva la consulta y el fragmento al abrir el juego en una subcarpeta', () => {
  const html = read('index.html');
  assert.match(html, /<noscript>\s*<meta http-equiv="refresh"[^>]*>\s*<\/noscript>/i);
  const script = html.match(/<script>([\s\S]+?)<\/script>/)[1];
  for (const entry of [scope, scope + 'index.html']) {
    const location = new URL(entry + '?qa=1&manual=1#parada');
    let destination;
    location.replace = value => { destination = value; };
    vm.runInNewContext(script, { location, URL });
    assert.equal(destination, scope + 'Se_Me_Fue_El_Camion.html?qa=1&manual=1#parada');
  }
});

test('instalación PWA: todos los recursos existen y el HTML usa las mismas versiones del precache', async () => {
  const sw = worker();
  await sw.run('install');
  assert.equal(sw.state.skipped, true);
  const list = sw.state.requests;
  assert.equal(new Set(list).size, list.length);
  const html = read('Se_Me_Fue_El_Camion.html');
  for (const [, url] of html.matchAll(/(?:src|href)="([^"]+\.(?:js|css)\?v=[^"]+)"/g)) assert.ok(list.includes(url), url);
  for (const icon of JSON.parse(read('manifest.webmanifest')).icons) assert.ok(list.includes(icon.src));
  assert.ok(list.includes(JSON.parse(read('manifest.webmanifest')).start_url));
  assert.ok(list.includes('index.html'));
});

test('sin red: abre la carpeta, index y HTML con parámetros y respeta las versiones de scripts', async () => {
  const sw = worker();
  await sw.run('install');
  const request = (url, mode) => ({url:new URL(url,scope).href, mode, method:'GET', headers:new Headers()});
  for (const url of ['', '?partida=2', 'index.html?vista=vertical']) {
    assert.equal(await sw.run('fetch',request(url,'navigate')),scope+'index.html');
  }
  assert.equal(await sw.run('fetch',request('Se_Me_Fue_El_Camion.html?partida=2','navigate')),scope+'Se_Me_Fue_El_Camion.html');
  const exact = sw.state.requests.find(x => x.startsWith('js/app/main.js?'));
  assert.equal(await sw.run('fetch',request(exact,'same-origin')),scope+exact);
  await assert.rejects(sw.run('fetch',request('js/app/main.js?v=otra','same-origin')),/sin conexión/);
  await assert.rejects(sw.run('fetch',request('inexistente','navigate')),/sin conexión/);
});

test('activación PWA: retira la versión anterior de esta carpeta y conserva cachés de otros juegos', async () => {
  const sw = worker();
  await sw.run('install');
  const [current] = [...sw.stores.keys()];
  const previous = current.replace(/\d+\.\d+\.\d+$/,'58.8.0');
  const other = current.replace('/juegos/camion/', '/juegos/otra-copia/');
  assert.notEqual(previous,current);
  await sw.caches.open(previous);
  await sw.caches.open(other);
  await sw.caches.open('otra-aplicacion');
  await sw.caches.open('camion-v58-8-17-parafalls-results');
  await sw.run('activate');
  assert.equal(sw.state.claimed,true);
  assert.deepEqual(new Set(await sw.caches.keys()),new Set([current,other,'otra-aplicacion']));
});

test('una descarga interrumpida no activa un caché parcial y el siguiente intento lo reconstruye', async () => {
  const sw = worker();
  sw.state.failOn = 'manifest.webmanifest';
  await assert.rejects(sw.run('install'), /recurso interrumpido/);
  assert.equal(sw.state.skipped, false);
  assert.equal(sw.stores.size, 0);
  sw.state.failOn = null;
  sw.state.requests = [];
  await sw.run('install');
  assert.equal(sw.state.skipped, true);
  const [name] = await sw.caches.keys();
  assert.equal((await (await sw.caches.open(name)).keys()).length, sw.state.requests.length);
});
