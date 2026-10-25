/* ============================================================
   Commission Exposé — serveur local
   - Sert les fichiers (index.html, etudiant.html, suivi.html, admin.html...)
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
     4) Sur la tablette / les téléphones (même Wi-Fi) : http://ADRESSE_IP_DU_PC:8000
   ============================================================ */

process.env.TZ = process.env.TZ || 'Africa/Abidjan';   // heure de la Côte d'Ivoire (comme Sha'ah)
const http = require('http');
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = parseInt(process.env.PORT,10) || 8000;
const ROOT = __dirname;
/* DONNÉES SÉPARÉES DU CODE (comme le modèle « resto ») :
   - en local : à côté de server.js (rien ne change)
   - en ligne (Render, Railway, VPS) : sur un DISQUE PERSISTANT, en indiquant
     DATA_DIR=/data (ou DATA_FILE=/data/data.json). Un redéploiement depuis GitHub
     remplace le code mais ne touche jamais ce dossier → aucune donnée perdue. */
const DATA_DIR = process.env.DATA_DIR || (process.env.DATA_FILE ? path.dirname(process.env.DATA_FILE) : ROOT);
const DATA_FILE = process.env.DATA_FILE || path.join(DATA_DIR, 'data.json');
const PHOTO_DIR = path.join(DATA_DIR, 'photos');
const BACKUP_DIR = path.join(DATA_DIR, 'sauvegardes');
const PIECES_DIR = path.join(DATA_DIR, 'justificatifs');   // pièces jointes et justificatifs des discussions
try{ fs.mkdirSync(DATA_DIR,{recursive:true}); }catch(e){}
// Première mise en place du disque persistant : on y recopie les données présentes à côté du code
if(path.resolve(DATA_DIR)!==path.resolve(ROOT) && !fs.existsSync(DATA_FILE) && fs.existsSync(path.join(ROOT,'data.json'))){
  try{
    fs.copyFileSync(path.join(ROOT,'data.json'), DATA_FILE);
    if(fs.existsSync(path.join(ROOT,'push.json')) && !fs.existsSync(path.join(DATA_DIR,'push.json'))) fs.copyFileSync(path.join(ROOT,'push.json'), path.join(DATA_DIR,'push.json'));
    ['photos','justificatifs'].forEach(dossier=>{ if(fs.existsSync(path.join(ROOT,dossier)) && dossier==='justificatifs'){ fs.mkdirSync(path.join(DATA_DIR,dossier),{recursive:true}); fs.readdirSync(path.join(ROOT,dossier)).forEach(f=>{ const d=path.join(DATA_DIR,dossier,f); if(!fs.existsSync(d)) fs.copyFileSync(path.join(ROOT,dossier,f), d); }); } });
    if(fs.existsSync(path.join(ROOT,'photos'))){ fs.mkdirSync(path.join(DATA_DIR,'photos'),{recursive:true}); fs.readdirSync(path.join(ROOT,'photos')).forEach(f=>{ const d=path.join(DATA_DIR,'photos',f); if(!fs.existsSync(d)) fs.copyFileSync(path.join(ROOT,'photos',f), d); }); }
    console.log('Données recopiées vers le disque persistant : '+DATA_DIR);
  }catch(e){ console.error('Recopie des données impossible :', e.message); }
}

// Doit correspondre à core.js
const RECORD_COLLECTIONS = ['etudiants','membres','presences','expositions','rapports','sessions','sorties','bibliotheque','meditations','quizBiblique','messages','programmes','moderateurs','jury','chats','acces'];
const CONFIG_KEYS = ['creneaux','eglises','commissions','motifsPresence','adminCode','reglages'];
const PUSH_FILE = path.join(DATA_DIR, 'push.json');   // clés VAPID + abonnements (jamais envoyé aux appareils)

const MIME = {
  '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8',
  '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.svg':'image/svg+xml',
  '.ico':'image/x-icon', '.md':'text/plain; charset=utf-8', '.webmanifest':'application/manifest+json'
};

[PHOTO_DIR, BACKUP_DIR, PIECES_DIR].forEach(d=>{ try{ fs.mkdirSync(d,{recursive:true}); }catch(e){} });

/* ---------------- Données en mémoire ---------------- */
let DB = null;
try{ const t=fs.readFileSync(DATA_FILE,'utf8'); DB = t && t.trim()!=='null' ? JSON.parse(t) : null; }
catch(e){ if(fs.existsSync(DATA_FILE)) console.error('data.json illisible — il sera conservé en data.corrompu.json'); try{ fs.copyFileSync(DATA_FILE, path.join(DATA_DIR,'data.corrompu.json')); }catch(_){} DB=null; }

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
  out.dataVersion=Math.max(base.dataVersion||0, inc.dataVersion||0);
  return out;
}

function sendJSON(res, code, obj){
  res.writeHead(code, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  res.end(typeof obj==='string'?obj:JSON.stringify(obj));
}

/* ============================================================
   TEMPS RÉEL (Server-Sent Events) — même principe que le modèle « resto »
   ============================================================ */
const streams = new Set();
function sseSend(res, ev, data){ try{ res.write(`event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`); }catch(e){} }
function toAll(ev, data){ for(const r of streams) sseSend(r, ev, data); }
setInterval(()=>{ for(const r of streams){ try{ r.write(': ping\n\n'); }catch(e){} } }, 25000);

/* ============================================================
   NOTIFICATIONS PUSH (VAPID + chiffrement aes128gcm, RFC 8291/8292)
   Aucune bibliothèque : uniquement le module crypto de Node.js.
   Fonctionne quand l'application est ouverte en HTTPS (serveur en ligne)
   ou sur « localhost ». Les clés et abonnements restent dans push.json.
   ============================================================ */
let PUSH = null;
function loadPush(){
  try{ PUSH=JSON.parse(fs.readFileSync(PUSH_FILE,'utf8')); }catch(e){ PUSH=null; }
  if(!PUSH || !PUSH.vapid){
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve:'prime256v1' });
    const jwk = privateKey.export({ format:'jwk' });
    const pub = publicKey.export({ format:'der', type:'spki' }).subarray(-65);
    PUSH = { vapid:{ publicKey: pub.toString('base64url'), privateJwk: jwk }, abonnements: (PUSH&&PUSH.abonnements)||[] };
    savePush();
  }
  if(!Array.isArray(PUSH.abonnements)) PUSH.abonnements=[];
}
function savePush(){ try{ fs.writeFileSync(PUSH_FILE, JSON.stringify(PUSH)); }catch(e){ console.error('push.json', e.message); } }
function vapidAuthHeader(endpoint){
  const aud=new URL(endpoint).origin;
  const b64=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned=b64({typ:'JWT',alg:'ES256'})+'.'+b64({aud, exp:Math.floor(Date.now()/1000)+12*3600, sub:'mailto:infos@acdees.com'});
  const key=crypto.createPrivateKey({key:PUSH.vapid.privateJwk, format:'jwk'});
  const sig=crypto.sign('sha256', Buffer.from(unsigned), {key, dsaEncoding:'ieee-p1363'}).toString('base64url');
  return `vapid t=${unsigned}.${sig}, k=${PUSH.vapid.publicKey}`;
}
function encryptPush(sub, payload){
  const uaPublic=Buffer.from(sub.keys.p256dh,'base64url'), authSecret=Buffer.from(sub.keys.auth,'base64url');
  const ecdh=crypto.createECDH('prime256v1'); ecdh.generateKeys();
  const asPublic=ecdh.getPublicKey(), shared=ecdh.computeSecret(uaPublic);
  const hmac=(k,d)=>crypto.createHmac('sha256',k).update(d).digest();
  const prkKey=hmac(authSecret, shared);
  const ikm=hmac(prkKey, Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, asPublic, Buffer.from([1])]));
  const salt=crypto.randomBytes(16), prk=hmac(salt, ikm);
  const cek=hmac(prk, Buffer.from('Content-Encoding: aes128gcm\0\x01')).subarray(0,16);
  const nonce=hmac(prk, Buffer.from('Content-Encoding: nonce\0\x01')).subarray(0,12);
  const cipher=crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const ct=Buffer.concat([cipher.update(Buffer.concat([Buffer.from(payload), Buffer.from([2])])), cipher.final(), cipher.getAuthTag()]);
  const header=Buffer.alloc(21); salt.copy(header,0); header.writeUInt32BE(4096,16); header[20]=65;
  return Buffer.concat([header, asPublic, ct]);
}
function sendPush(sub, payloadObj){
  let body, auth;
  try{ body=encryptPush(sub, JSON.stringify(payloadObj)); auth=vapidAuthHeader(sub.endpoint); }catch(e){ return; }
  const u=new URL(sub.endpoint);
  const rq=https.request({method:'POST', hostname:u.hostname, port:u.port||443, path:u.pathname+u.search,
    headers:{'Content-Encoding':'aes128gcm','Content-Type':'application/octet-stream','Content-Length':body.length, TTL:'86400', Urgency:'high', Authorization:auth}}, r=>{
    r.resume();
    if(r.statusCode===404 || r.statusCode===410){ PUSH.abonnements=PUSH.abonnements.filter(a=>a.endpoint!==sub.endpoint); savePush(); }
  });
  rq.on('error',()=>{}); rq.setTimeout(10000,()=>rq.destroy()); rq.end(body);
}
const normName = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
// Même règle que messageConcerne() dans core.js
function concerne(m, nom){
  const n=normName(nom); if(!n) return false;
  if(!m.cible || m.cible==='personne') return normName(m.nom)===n;
  if(m.cible==='tous') return true;
  const etu=(DB.etudiants||[]).find(e=>normName(e.nom)===n), mem=(DB.membres||[]).find(x=>normName(x.nom)===n);
  if(m.cible==='etudiants') return !!etu;
  if(m.cible==='membres') return !!mem;
  if(m.cible==='commission') return !!(etu && etu.commission===m.commission);
  if(m.cible==='moderateurs') return (DB.moderateurs||[]).some(x=>normName(x.nom)===n);
  if(m.cible==='jury') return (DB.jury||[]).some(x=>normName(x.nom)===n);
  return false;
}
// Un nouveau message : écrans ouverts prévenus + notification push aux abonnés concernés
function diffuserMessage(m){
  toAll('notif', m);
  const vus=new Set();
  PUSH.abonnements.forEach(a=>{
    if(!concerne(m, a.nom) || vus.has(a.endpoint)) return;
    vus.add(a.endpoint);
    sendPush(a, {title:m.titre||'Commission Exposé', body:m.texte, tag:'ce-'+m.id, url:(a.page||'suivi.html')+'?vue=suivi'});
  });
}
// Détection de ce qui est nouveau après une synchronisation
function idsDe(db, k){ return new Set(((db&&db[k])||[]).map(r=>r.id)); }
function analyserNouveautes(avant, apres){
  const recent = Date.now()-6*3600*1000;   // on ne renotifie pas les vieux messages d'un appareil resté hors-ligne
  // nouvelles discussions : écrans ouverts + push au destinataire
  const cAvant=idsDe(avant,'chats');
  (apres.chats||[]).forEach(c=>{
    if(cAvant.has(c.id) || (c.ts||0)<recent) return;
    toAll('chat', c);
    const vus=new Set();
    PUSH.abonnements.forEach(a=>{ if(normName(a.nom)!==normName(c.a) || vus.has(a.endpoint)) return; vus.add(a.endpoint);
      sendPush(a, {title:'Message de '+c.de, body:c.texte || (c.pieces&&c.pieces.length?'Pièce jointe : '+c.pieces[0].nom:''), tag:'chat-'+c.fil, url:(a.page||'suivi.html')+'?vue=discussion'}); });
  });
  const mAvant=idsDe(avant,'messages');
  (apres.messages||[]).forEach(m=>{ if(!mAvant.has(m.id) && (m.ts||0)>recent) diffuserMessage(m); });
  [['expositions','expose'],['rapports','rapport'],['presences','presence']].forEach(([k,type])=>{
    const ids=idsDe(avant,k);
    (apres[k]||[]).forEach(r=>{
      if(ids.has(r.id) || r.source==='liste officielle') return;
      const ts = r.tsDepot || r.tsArrivee || 0; if(ts<recent) return;
      toAll('activite', {type, nom:r.etudiantNom||r.membreNom||'', numero:r.numero||'', statut:r.statut||'', motif:r.motif||'', phase:r.phase||''});
    });
  });
}

/* ============================================================
   MESSAGES PROGRAMMÉS (ex. rappel chaque samedi à 8 h) — vérifiés toutes les 30 s
   ============================================================ */
const pad2 = n => String(n).padStart(2,'0');
setInterval(()=>{
  if(!DB || !Array.isArray(DB.programmes)) return;
  const d=new Date(), date=d.getFullYear()+'-'+pad2(d.getMonth()+1)+'-'+pad2(d.getDate()), heure=pad2(d.getHours())+':'+pad2(d.getMinutes());
  let change=false;
  DB.programmes.forEach(p=>{
    if(!p.actif || p.dernierEnvoi===date) return;
    if(!(p.jours||[]).includes(d.getDay())) return;
    if(heure < (p.heure||'08:00')) return;
    p.dernierEnvoi=date; p._u=Date.now(); change=true;
    const [h,mi]=(p.heure||'08:00').split(':').map(Number);
    if((d.getHours()*60+d.getMinutes())-(h*60+mi) > 120) return;   // serveur éteint à l'heure prévue : on n'envoie pas en retard
    const m={id:'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,6), nom: p.cible==='personne'?p.nom:({tous:'Tout le monde',etudiants:'Tous les étudiants',membres:'Tous les membres',commission:'Commission '+(p.commission||'')}[p.cible]||'Tout le monde'),
      tel:'', titre:p.titre||'Rappel', texte:p.texte, date, heure, ts:Date.now(), lu:false, luPar:[], cible:p.cible||'tous', commission:p.commission||'', type:'programme', _u:Date.now()};
    DB.messages.push(m);
    diffuserMessage(m);
  });
  if(change){ persist(); toAll('maj',{}); }
}, 30000);

function lireCorps(req, max){ return new Promise((ok,ko)=>{ const ch=[]; let n=0; req.on('data',c=>{ n+=c.length; if(n>max){ ko(new Error('trop gros')); req.destroy(); } else ch.push(c); }); req.on('end',()=>{ try{ ok(JSON.parse(Buffer.concat(ch).toString('utf8')||'{}')); }catch(e){ ko(e); } }); }); }

const server = http.createServer((req, res) => {
  const urlPath0 = req.url.split('?')[0];

  // ---- Flux temps réel ----
  if(urlPath0 === '/api/stream'){
    res.writeHead(200, {'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','X-Accel-Buffering':'no'});
    res.write('retry: 3000\n\n');
    streams.add(res);
    req.on('close', ()=>streams.delete(res));
    return;
  }
  // ---- Notifications push ----
  if(urlPath0 === '/api/push/cle'){ sendJSON(res,200,{publicKey:PUSH.vapid.publicKey}); return; }
  if(urlPath0 === '/api/push/stats'){
    const parNom={}; PUSH.abonnements.forEach(a=>{ parNom[a.nom]=(parNom[a.nom]||0)+1; });
    sendJSON(res,200,{total:PUSH.abonnements.length, enLigne:streams.size, parNom}); return;
  }
  if((urlPath0 === '/api/push/abonner' || urlPath0 === '/api/push/desabonner') && req.method==='POST'){
    lireCorps(req, 20000).then(b=>{
      if(urlPath0.endsWith('desabonner')){ PUSH.abonnements=PUSH.abonnements.filter(a=>a.endpoint!==b.endpoint); savePush(); sendJSON(res,200,{ok:true}); return; }
      const s=b.subscription||{};
      if(!b.nom || !s.endpoint || !s.keys || !s.keys.p256dh || !s.keys.auth){ sendJSON(res,400,{ok:false,error:'Abonnement invalide'}); return; }
      PUSH.abonnements=PUSH.abonnements.filter(a=>a.endpoint!==s.endpoint);   // pas de doublon d'abonnement
      const page=['suivi.html','moderateur.html','jury.html','admin.html','etudiant.html'].includes(b.page)?b.page:'suivi.html';
      PUSH.abonnements.push({nom:String(b.nom).slice(0,120), page, endpoint:s.endpoint, keys:{p256dh:s.keys.p256dh, auth:s.keys.auth}, at:new Date().toISOString()});
      savePush(); sendJSON(res,200,{ok:true});
    }).catch(()=>sendJSON(res,400,{ok:false}));
    return;
  }

  if(urlPath0 === '/api/data'){
    if(req.method === 'GET'){ sendJSON(res,200, DB ? JSON.stringify(DB) : 'null'); return; }
    if(req.method === 'POST'){
      const chunks=[]; let size=0; let aborted=false;
      req.on('data', c => { size+=c.length; if(size > 80*1024*1024){ aborted=true; sendJSON(res,413,{ok:false,error:'Données trop volumineuses'}); req.destroy(); } else chunks.push(c); });
      req.on('end', () => {
        if(aborted) return;
        let inc;
        try{ inc=JSON.parse(Buffer.concat(chunks).toString('utf8')); }catch(e){ sendJSON(res,400,{ok:false,error:'JSON invalide'}); return; }
        const avant = DB, avantTxt = DB ? JSON.stringify(DB) : '';
        DB = merge(DB, inc);
        persist();
        const txt = JSON.stringify(DB);
        sendJSON(res,200, txt);
        if(txt !== avantTxt){ try{ analyserNouveautes(avant||{}, DB); }catch(e){ console.error(e); } toAll('maj', {}); }
      });
      return;
    }
    sendJSON(res, 405, {ok:false, error:'Méthode non supportée'});
    return;
  }

  // ---- Pièces jointes / justificatifs ----
  if(urlPath0 === '/api/fichier' && req.method==='POST'){
    lireCorps(req, 9*1024*1024).then(b=>{
      const m=/^data:([\w/.+-]+);base64,(.+)$/.exec(String(b.data||''));
      if(!m){ sendJSON(res,400,{ok:false,error:'Fichier invalide'}); return; }
      const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','application/pdf':'pdf','text/plain':'txt','application/msword':'doc','application/vnd.openxmlformats-officedocument.wordprocessingml.document':'docx'}[m[1]];
      if(!ext){ sendJSON(res,400,{ok:false,error:'Format non accepté (photo, PDF, Word ou texte)'}); return; }
      const buf=Buffer.from(m[2],'base64');
      if(buf.length>6*1024*1024){ sendJSON(res,413,{ok:false,error:'Fichier trop volumineux (6 Mo maximum)'}); return; }
      const nom=Date.now().toString(36)+'-'+crypto.randomBytes(4).toString('hex')+'.'+ext;
      fs.writeFile(path.join(PIECES_DIR,nom), buf, err=>{
        if(err){ sendJSON(res,500,{ok:false,error:'Enregistrement impossible'}); return; }
        sendJSON(res,200,{ok:true, url:'justificatifs/'+nom, taille:buf.length});
      });
    }).catch(()=>sendJSON(res,413,{ok:false,error:'Fichier trop volumineux'}));
    return;
  }
  if(urlPath0.startsWith('/justificatifs/')){
    const nom=path.basename(decodeURIComponent(urlPath0));
    fs.readFile(path.join(PIECES_DIR, nom), (err, c)=>{
      if(err){ res.writeHead(404); res.end('Fichier introuvable'); return; }
      const ext=path.extname(nom).toLowerCase();
      const types={'.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.pdf':'application/pdf','.txt':'text/plain; charset=utf-8','.doc':'application/msword','.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document'};
      res.writeHead(200, {'Content-Type': types[ext]||'application/octet-stream', 'Content-Disposition': (ext==='.jpg'||ext==='.png'||ext==='.webp'||ext==='.pdf')?'inline':'attachment', 'X-Content-Type-Options':'nosniff', 'Cache-Control':'max-age=86400'}); res.end(c);
    });
    return;
  }
  // ---- Photos de couverture (dossier de données) ----
  if(urlPath0.startsWith('/photos/')){
    const nom=path.basename(decodeURIComponent(urlPath0));
    fs.readFile(path.join(PHOTO_DIR, nom), (err, c)=>{
      if(err){ res.writeHead(404); res.end('Photo introuvable'); return; }
      res.writeHead(200, {'Content-Type': nom.endsWith('.png')?'image/png':'image/jpeg', 'Cache-Control':'max-age=86400'}); res.end(c);
    });
    return;
  }
  // ---- Petit contrôle de santé pour l'hébergeur ----
  if(urlPath0 === '/api/sante'){ sendJSON(res,200,{ok:true, donnees: DB ? true : false, dossier: DATA_DIR===ROOT?'local':'disque persistant'}); return; }

  // ---- Fichiers statiques ----
  let urlPath = urlPath0;
  if(urlPath === '/') urlPath = '/index.html';
  let filePath;
  try{ filePath = path.normalize(path.join(ROOT, decodeURIComponent(urlPath))); }catch(e){ res.writeHead(400); res.end('Requête invalide'); return; }
  if(!filePath.startsWith(ROOT + path.sep)){ res.writeHead(403); res.end('Interdit'); return; }
  const base=path.basename(filePath);
  if(base==='data.json' || base==='push.json' || base.endsWith('.tmp') || filePath.startsWith(BACKUP_DIR)){ res.writeHead(403); res.end('Interdit'); return; }

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
  if(e.code==='EADDRINUSE') console.error(`\nLe port ${PORT} est déjà utilisé : le serveur tourne peut-être déjà dans une autre fenêtre.\n`);
  else console.error(e);
  process.exit(1);
});

loadPush();
// Avant un arrêt (redéploiement, redémarrage) : on écrit tout de suite les données en attente
function ecrireMaintenant(){ try{ if(DB){ clearTimeout(writeTimer); fs.writeFileSync(DATA_FILE, JSON.stringify(DB)); } }catch(e){ console.error(e.message); } }
['SIGTERM','SIGINT'].forEach(sig=>process.on(sig, ()=>{ ecrireMaintenant(); process.exit(0); }));
server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('=================================================');
  console.log(' Commission Exposé — serveur local démarré');
  console.log(' Sur cet ordinateur : http://localhost:' + PORT);
  const ips=localIPs();
  if(ips.length) ips.forEach(ip=>console.log(' Sur la tablette (même Wi-Fi) : http://' + ip + ':' + PORT));
  else console.log(' Sur la tablette (même Wi-Fi) : http://<IP-DE-CE-PC>:' + PORT);
  console.log(' Données : ' + DATA_FILE);
  console.log(' Laissez cette fenêtre ouverte pendant l\'utilisation.');
  console.log('=================================================');
  console.log('');
});
