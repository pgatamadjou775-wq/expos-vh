/* ============================================================
   Commission Exposé — serveur local
   - Sert les fichiers (index.html, etudiant.html, admin.html...)
   - Fournit l'API /api/data qui FUSIONNE les données envoyées par
     chaque appareil (tablette, PC...) dans data.json, fiche par fiche :
     deux appareils qui enregistrent en même temps ne s'écrasent plus.
   - Les photos de couverture sont extraites dans le dossier photos/
     (data.json reste léger et rapide à synchroniser).
   - Une sauvegarde quotidienne est conservée dans le dossier sauvegardes/.

   Utilisation :
     1) Installer Node.js (https://nodejs.org) si ce n'est pas déjà fait.
     2) Dans ce dossier, lancer :   node server.js
     3) Sur ce PC, ouvrir :         http://localhost:8000
     4) Sur la tablette (même Wi-Fi), ouvrir : http://ADRESSE_IP_DU_PC:8000
   ============================================================ */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = parseInt(process.env.PORT,10) || 8000;
const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, 'data.json');
const PHOTO_DIR = path.join(ROOT, 'photos');
const BACKUP_DIR = path.join(ROOT, 'sauvegardes');

const RECORD_COLLECTIONS = ['etudiants','membres','presences','expositions','rapports','sessions','visites'];
const CONFIG_KEYS = ['creneaux','eglises','commissions','adminCode'];

const MIME = {
  '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8',
  '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.svg':'image/svg+xml',
  '.ico':'image/x-icon', '.md':'text/plain; charset=utf-8'
};

[PHOTO_DIR, BACKUP_DIR].forEach(d=>{ try{ fs.mkdirSync(d,{recursive:true}); }catch(e){} });

/* ---------------- Données en mémoire ---------------- */
let DB = null;
try{ const t=fs.readFileSync(DATA_FILE,'utf8'); DB = t && t.trim()!=='null' ? JSON.parse(t) : null; }
catch(e){ if(fs.existsSync(DATA_FILE)) console.error('⚠ data.json illisible — il sera conservé en data.corrompu.json'); try{ fs.copyFileSync(DATA_FILE, path.join(ROOT,'data.corrompu.json')); }catch(_){} DB=null; }

let writeTimer=null;
function persist(){
  clearTimeout(writeTimer);
  writeTimer=setTimeout(()=>{
    const tmp=DATA_FILE+'.tmp';
    fs.writeFile(tmp, JSON.stringify(DB), err=>{
      if(err){ console.error('Erreur écriture data.json', err); return; }
      fs.rename(tmp, DATA_FILE, e=>{ if(e) console.error(e); });
      const day=new Date().toISOString().slice(0,10);
      const bk=path.join(BACKUP_DIR,'data-'+day+'.json');
      fs.writeFile(bk, JSON.stringify(DB), ()=>{});
    });
  },150);
}

/* Photos encodées (data:image/...) -> fichiers dans photos/ */
function extractPhotos(rec){
  if(!rec || !Array.isArray(rec.photos)) return;
  rec.photos = rec.photos.map((p,i)=>{
    const m=/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/i.exec(String(p));
    if(!m) return p;
    const ext = m[1].toLowerCase()==='png' ? 'png' : 'jpg';
    const name = String(rec.id||'x').replace(/[^A-Za-z0-9_-]/g,'')+'-'+i+'-'+Date.now().toString(36)+'.'+ext;
    try{ fs.writeFileSync(path.join(PHOTO_DIR,name), Buffer.from(m[2],'base64')); return 'photos/'+name; }
    catch(e){ console.error('photo',e); return p; }
  });
}

function merge(base, inc){
  if(!inc || typeof inc!=='object') return base;
  if(!base){ base={}; }
  const out=Object.assign({}, base);
  // pierres tombales (suppressions)
  const tomb=Object.assign({}, base.tombstones||{}, inc.tombstones||{});
  out.tombstones=tomb;
  RECORD_COLLECTIONS.forEach(k=>{
    const map=new Map();
    (base[k]||[]).forEach(r=>{ if(r&&r.id) map.set(r.id,r); });
    (inc[k]||[]).forEach(r=>{
      if(!r||!r.id) return;
      const cur=map.get(r.id);
      if(!cur || (r._u||0) > (cur._u||0)) map.set(r.id, r);
    });
    out[k]=Array.from(map.values()).filter(r=>!tomb[r.id]);
    if(k==='expositions'||k==='rapports') out[k].forEach(extractPhotos);
  });
  if((inc._cfgU||0) > (base._cfgU||0) || base._cfgU===undefined){
    CONFIG_KEYS.forEach(k=>{ if(inc[k]!==undefined) out[k]=inc[k]; });
    out._cfgU=inc._cfgU||0;
  }
  const bc=base.compteurs||{}, ic=inc.compteurs||{};
  out.compteurs={expose:Math.max(bc.expose||0,ic.expose||0), rapport:Math.max(bc.rapport||0,ic.rapport||0)};
  out.version=Math.max(base.version||1, inc.version||1);
  return out;
}

function sendJSON(res, code, obj){
  res.writeHead(code, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  res.end(typeof obj==='string'?obj:JSON.stringify(obj));
}

const server = http.createServer((req, res) => {
  const urlPath0 = req.url.split('?')[0];

  if(urlPath0 === '/api/data'){
    if(req.method === 'GET'){ sendJSON(res,200, DB ? JSON.stringify(DB) : 'null'); return; }
    if(req.method === 'POST'){
      const chunks=[]; let size=0; let aborted=false;
      req.on('data', c => { size+=c.length; if(size > 80*1024*1024){ aborted=true; sendJSON(res,413,{ok:false,error:'Données trop volumineuses'}); req.destroy(); } else chunks.push(c); });
      req.on('end', () => {
        if(aborted) return;
        let inc;
        try{ inc=JSON.parse(Buffer.concat(chunks).toString('utf8')); }catch(e){ sendJSON(res,400,{ok:false,error:'JSON invalide'}); return; }
        DB = merge(DB, inc);
        persist();
        sendJSON(res,200, JSON.stringify(DB));
      });
      return;
    }
    sendJSON(res, 405, {ok:false, error:'Méthode non supportée'});
    return;
  }

  // ---- Fichiers statiques ----
  let urlPath = urlPath0;
  if(urlPath === '/') urlPath = '/index.html';
  let filePath;
  try{ filePath = path.normalize(path.join(ROOT, decodeURIComponent(urlPath))); }catch(e){ res.writeHead(400); res.end('Requête invalide'); return; }
  if(!filePath.startsWith(ROOT + path.sep)){ res.writeHead(403); res.end('Interdit'); return; }
  const base=path.basename(filePath);
  if(base==='data.json' || filePath.startsWith(BACKUP_DIR)){ res.writeHead(403); res.end('Interdit'); return; }

  fs.readFile(filePath, (err, content) => {
    if(err){ res.writeHead(404, {'Content-Type':'text/plain; charset=utf-8'}); res.end('Fichier non trouvé : ' + urlPath); return; }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': ext==='.jpg'||ext==='.png' ? 'max-age=86400' : 'no-cache'});
    res.end(content);
  });
});

function localIPs(){
  const out=[];
  Object.values(os.networkInterfaces()).forEach(list=>(list||[]).forEach(i=>{ if(i.family==='IPv4' && !i.internal) out.push(i.address); }));
  return out;
}

server.on('error', e=>{
  if(e.code==='EADDRINUSE') console.error(`\n⚠ Le port ${PORT} est déjà utilisé : le serveur tourne peut-être déjà dans une autre fenêtre.\n`);
  else console.error(e);
  process.exit(1);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('=================================================');
  console.log(' Commission Exposé — serveur local démarré');
  console.log(' Sur cet ordinateur : http://localhost:' + PORT);
  const ips=localIPs();
  if(ips.length) ips.forEach(ip=>console.log(' Sur la tablette (même Wi-Fi) : http://' + ip + ':' + PORT));
  else console.log(' Sur la tablette (même Wi-Fi) : http://<IP-DE-CE-PC>:' + PORT);
  console.log(' Laissez cette fenêtre ouverte pendant l\'utilisation.');
  console.log('=================================================');
  console.log('');
});
