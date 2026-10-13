/* ============================================================
   COMMISSION EXPOSÉ — Académie Vases d'Honneur
   core.js — Modèle de données partagé (Étudiant + Administration)

   Synchronisation : chaque appareil garde une copie locale
   (localStorage) et l'envoie au serveur local (server.js) qui
   FUSIONNE les modifications fiche par fiche (aucune perte quand
   la tablette et le PC enregistrent en même temps).
   Sans serveur, l'application fonctionne en mode hors-ligne
   sur un seul appareil.
   ============================================================ */

const DEFAULT_ADMIN_CODE = '2026';
const RETARD_JOURS = 7; // seuil "en retard" si non corrigé après ce délai
const DB_VERSION = 2;
const LS_KEY = 'CE_DB_v1';

// Collections dont les fiches sont fusionnées une à une (par id)
const RECORD_COLLECTIONS = ['etudiants','membres','presences','expositions','rapports','sessions','visites'];
// Paramètres fusionnés en bloc (le plus récent gagne)
const CONFIG_KEYS = ['creneaux','eglises','commissions','adminCode'];

const STATUT_LBL = {
  depose:['Déposé — à corriger','bn'],
  en_correction:['En correction','by'],
  corrige_complet:['Corrigé complet','bg'],
  corrige_partiel:['Corrigé partiel','by'],
  retire:['Retiré','bg'],
  definitif:['Définitif','bg'],
  clos:['Clôturé (définitif reçu)','bn']
};

function seedCreneaux(){
  return [
    {id:'c1',jour:'Samedi',debut:'07:00',fin:'10:00',label:'07h00 - 10h00'},
    {id:'c2',jour:'Samedi',debut:'10:00',fin:'13:00',label:'10h00 - 13h00'},
    {id:'c3',jour:'Samedi',debut:'13:00',fin:'15:00',label:'13h00 - 15h00'},
    {id:'c4',jour:'Dimanche',debut:'07:00',fin:'10:00',label:'07h00 - 10h00'},
    {id:'c5',jour:'Dimanche',debut:'10:00',fin:'13:00',label:'10h00 - 13h00'},
    {id:'c6',jour:'Dimanche',debut:'13:00',fin:'15:00',label:'13h00 - 15h00'}
  ];
}
function seedDB(){
  return {
    version:1, adminCode:DEFAULT_ADMIN_CODE, _cfgU:1,
    etudiants:[],
    membres:[
      {id:'m1',nom:'Jean Kouassi',code:'1111'},
      {id:'m2',nom:'Marie Ahou',code:'2222'},
      {id:'m3',nom:'Paul N\'Guessan',code:'3333'},
      {id:'m4',nom:'Grace Adjoua',code:'4444'}
    ],
    creneaux:seedCreneaux(),
    eglises:['Église Fille A','Église Fille B','Église Fille C'],
    commissions:[],
    sessions:[], visites:[], presences:[], expositions:[], rapports:[],
    compteurs:{expose:0,rapport:0},
    tombstones:{}
  };
}

/* ---------- Migration (idempotente, identifiants déterministes) ---------- */
function migrate(db){
  let changed=false;
  if(!db || typeof db!=='object') { db=seedDB(); changed=true; }
  const def=seedDB();
  ['etudiants','membres','presences','expositions','rapports','sessions','visites','eglises','commissions'].forEach(k=>{ if(!Array.isArray(db[k])){ db[k]=def[k]; changed=true; } });
  if(!Array.isArray(db.creneaux)||!db.creneaux.length){ db.creneaux=def.creneaux; changed=true; }
  if(!db.compteurs){ db.compteurs={expose:0,rapport:0}; changed=true; }
  if(!db.tombstones){ db.tombstones={}; changed=true; }
  if(!db.adminCode){ db.adminCode=DEFAULT_ADMIN_CODE; changed=true; }
  if(!db._cfgU) db._cfgU=1;

  if((db.version||1) < 2 && typeof OFFICIEL_COMMISSIONS!=='undefined'){
    // 1) Commissions officielles + responsables (les anciennes commissions d'exemple sont retirées si inutilisées)
    const used = new Set([...db.expositions,...db.rapports].map(r=>r.commission).filter(Boolean));
    const keep = db.commissions.filter(c=>!['Commission Exposé','Commission Permanence'].includes(c.nom) || used.has(c.nom));
    OFFICIEL_COMMISSIONS.forEach(oc=>{
      const ex = keep.find(c=>normName(c.nom)===normName(oc.nom));
      if(ex){ ex.responsable = oc.responsable; }
      else keep.push(Object.assign({},oc));
    });
    db.commissions = keep;
    // 2) Registre des étudiants (remplace les étudiants d'exemple)
    db.etudiants.filter(e=>/^e[1-5]$/.test(e.id)).forEach(e=>{ db.tombstones[e.id]=1; });
    db.etudiants = db.etudiants.filter(e=>!/^e[1-5]$/.test(e.id));
    OFFICIEL_ETUDIANTS.forEach(s=>{ if(!db.etudiants.find(e=>e.id===s.id)) db.etudiants.push({id:s.id,nom:s.nom,commission:s.commission,_u:1}); });
    // 3) Rapports de stage DÉFINITIFS pour les 111 étudiants
    const ds=todayStr();
    OFFICIEL_ETUDIANTS.forEach((s,i)=>{
      const rid='rd-'+s.id;
      if(db.tombstones[rid]) return;
      if(db.rapports.find(r=>r.id===rid)) return;
      if(db.rapports.find(r=>r.statut==='definitif' && normName(r.etudiantNom)===normName(s.nom))) return;
      db.rapports.push({
        id:rid, numero:'STG-DEF-'+String(i+1).padStart(3,'0'), etudiantNom:s.nom, etudiantId:s.id, classe:'',
        phase:'Dépôt définitif', commission:s.commission, responsable:'', moderateur:'',
        lieu:'', photos:[], statut:'definitif', correcteur:'', commentaire:'', source:'import',
        dateDepot:ds, tsDepot:new Date(ds+'T08:00:00').getTime(), dateCorrection:'', dateRetrait:'', _u:1
      });
    });
    db.version=2; changed=true;
  }
  return {db,changed};
}

/* ---------- Utilitaires ---------- */
function nid(){ return 'x'+Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function pad(n){ return String(n).padStart(2,'0'); }
function todayStr(){ const d=new Date(); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function nowTimeStr(){ const d=new Date(); return pad(d.getHours())+':'+pad(d.getMinutes()); }
function nowFull(){ return Date.now(); }
function initials(name){ return String(name||'?').replace(/^(Mme|M\.|Mr|Dr)\s+/i,'').split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join(''); }
function joursDepuis(dateMs){ return Math.floor((Date.now()-(dateMs||Date.now()))/86400000); }
function addDaysStr(ds,n){ const d=new Date(ds+'T00:00:00'); d.setDate(d.getDate()+n); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function addMonthsStr(ds,n){ const d=new Date(ds+'T00:00:00'); d.setMonth(d.getMonth()+n); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function escapeHtml(s){ return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function normName(s){ return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[’']/g,"'").replace(/\s+/g,' ').trim(); }
function frDate(ds){ if(!ds) return ''; const p=String(ds).split('-'); return p.length===3 ? p[2]+'/'+p[1]+'/'+p[0] : ds; }
const MOIS_LBL=['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

function commissionByName(nom){ return DB.commissions.find(c=>normName(c.nom)===normName(nom)); }
function responsableOf(commissionNom){ const c=commissionByName(commissionNom); return c ? (c.responsable||'') : ''; }
function effectifCommission(nom){ return DB.etudiants.filter(e=>normName(e.commission)===normName(nom)).length; }
function attenduCommission(c){ return c.totalAttendu>0 ? c.totalAttendu : effectifCommission(c.nom); }
function rapportDefinitifDe(nom){ const n=normName(nom); return DB.rapports.find(r=>r.statut==='definitif' && normName(r.etudiantNom)===n); }
function statutLabel(s){ return (STATUT_LBL[s]||['—','bn']); }
function nextNumero(kind, prefix){
  const list = kind==='expose' ? DB.expositions : DB.rapports;
  const re = new RegExp('^'+prefix+'-\\d{8}-(\\d+)$');
  let max = DB.compteurs[kind]||0;
  list.forEach(r=>{ const m=re.exec(r.numero||''); if(m) max=Math.max(max,parseInt(m[1],10)); });
  DB.compteurs[kind]=max+1;
  return prefix+'-'+todayStr().replace(/-/g,'')+'-'+String(max+1).padStart(3,'0');
}
function removeRecord(coll, id){
  const i=DB[coll].findIndex(r=>r.id===id);
  if(i>=0) DB[coll].splice(i,1);
  DB.tombstones[id]=Date.now();
}

/* ---------- Photos : réduction avant enregistrement ---------- */
function compressImage(file, maxSide, quality){
  maxSide=maxSide||1280; quality=quality||0.72;
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onerror=()=>reject(reader.error);
    reader.onload=e=>{
      const img=new Image();
      img.onload=()=>{
        try{
          const k=Math.min(1, maxSide/Math.max(img.width,img.height));
          const cv=document.createElement('canvas');
          cv.width=Math.round(img.width*k); cv.height=Math.round(img.height*k);
          cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);
          resolve(cv.toDataURL('image/jpeg',quality));
        }catch(err){ resolve(e.target.result); }
      };
      img.onerror=()=>reject(new Error('Image illisible'));
      img.src=e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ---------- Téléchargement de fichiers (Word / Excel) ---------- */
function downloadBytes(bytes, fileName, mime){
  const blob=new Blob([bytes],{type:mime});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=fileName; a.style.display='none';
  document.body.appendChild(a); a.click();
  setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); },4000);
}
function safeFileName(s){ return String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Za-z0-9_-]+/g,'_').replace(/_+/g,'_').replace(/^_|_$/g,''); }

/* ---------- Toast ---------- */
function toast(msg,type){
  const t=document.getElementById('toast');
  if(!t) return;
  t.textContent=msg; t.className='toast show '+(type||'ok');
  clearTimeout(window._tst);
  window._tst=setTimeout(()=>{ t.className='toast '+(type||'ok'); },2600);
}

/* ================= STOCKAGE LOCAL + SYNCHRONISATION ================= */
let DB = null;
let SNAP = {};          // empreinte de la dernière version synchronisée : id -> json
let SNAP_CFG = '';
let DIRTY = false;      // modifications locales pas encore confirmées par le serveur
let SYNC_BUSY = false;
let SERVER_CONNECTE = false;
let LAST_RENDER_SIG = '';

function recSig(r){ const c=Object.assign({},r); delete c._u; return JSON.stringify(c); }
function cfgSig(db){ return JSON.stringify(CONFIG_KEYS.map(k=>db[k])); }
function takeSnapshot(){
  SNAP={};
  RECORD_COLLECTIONS.forEach(k=>(DB[k]||[]).forEach(r=>{ SNAP[k+':'+r.id]=recSig(r); }));
  SNAP_CFG=cfgSig(DB);
}
function stampChanges(){
  const now=Date.now();
  RECORD_COLLECTIONS.forEach(k=>(DB[k]||[]).forEach(r=>{
    if(!r.id) r.id=nid();
    if(SNAP[k+':'+r.id]!==recSig(r)) r._u=now;
  }));
  if(cfgSig(DB)!==SNAP_CFG) DB._cfgU=now;
}
function writeLocal(){
  try{ localStorage.setItem(LS_KEY, JSON.stringify(DB)); }
  catch(e){
    // stockage local plein : on retire les photos des fiches déjà synchronisées (elles restent sur le serveur)
    try{
      const light=JSON.parse(JSON.stringify(DB));
      ['expositions','rapports'].forEach(k=>light[k].forEach(r=>{ r.photos=(r.photos||[]).filter(p=>!String(p).startsWith('data:')); }));
      localStorage.setItem(LS_KEY, JSON.stringify(light));
    }catch(e2){ console.warn('Stockage local indisponible',e2); }
  }
}
function loadDB(){
  let raw=null;
  try{ raw=localStorage.getItem(LS_KEY); }catch(e){}
  let parsed=null;
  try{ parsed = raw ? JSON.parse(raw) : null; }catch(e){ parsed=null; }
  const res=migrate(parsed||seedDB());
  DB=res.db;
  takeSnapshot();
  // appareil neuf (aucune donnée locale) : on lit d'abord le serveur avant d'envoyer quoi que ce soit
  if(res.changed && parsed) DIRTY=true;
  writeLocal();
}
function saveDB(){
  stampChanges();
  takeSnapshot();
  DIRTY=true;
  writeLocal();
  syncNow();
}
function adoptRemote(remote){
  const res=migrate(remote);
  DB=res.db;
  takeSnapshot();
  if(res.changed) DIRTY=true;
  writeLocal();
  const sig=JSON.stringify(DB);
  if(sig!==LAST_RENDER_SIG){ LAST_RENDER_SIG=sig; if(typeof window.onRemoteUpdate==='function'){ try{ window.onRemoteUpdate(); }catch(e){ console.error(e); } } }
}
async function syncNow(manual){
  if(SYNC_BUSY){ window._resync=true; return; }
  SYNC_BUSY=true;
  try{
    let r;
    if(DIRTY){
      const sent=JSON.stringify(DB);
      DIRTY=false;
      r=await fetch('/api/data',{method:'POST',headers:{'Content-Type':'application/json'},body:sent,cache:'no-store'});
      if(!r.ok){ DIRTY=true; throw new Error('HTTP '+r.status); }
    } else {
      r=await fetch('/api/data',{cache:'no-store'});
      if(!r.ok) throw new Error('HTTP '+r.status);
    }
    const txt=await r.text();
    SERVER_CONNECTE=true;
    if(!txt || txt==='null'){ DIRTY=true; window._resync=true; }   // serveur vide : on lui envoie nos données
    else if(!DIRTY){ adoptRemote(JSON.parse(txt)); }   // si l'utilisateur a modifié entre-temps, on renverra d'abord
    if(manual) toast('Données actualisées depuis le serveur','ok');
  }catch(e){
    SERVER_CONNECTE=false;
    if(manual) toast("Aucun serveur local détecté — mode hors-ligne (un seul appareil)",'ko');
  }finally{
    SYNC_BUSY=false;
    updateSyncBadge();
    if(window._resync){ window._resync=false; setTimeout(()=>syncNow(),50); }
  }
}
function pullRemote(silent){ return syncNow(!silent); }
function manualRefresh(){ syncNow(true); }
function updateSyncBadge(){
  document.querySelectorAll('.sync-badge').forEach(el=>{
    el.textContent = SERVER_CONNECTE ? (DIRTY?'● Synchronisation…':'● Connecté au serveur') : '● Hors-ligne';
    el.style.color = SERVER_CONNECTE ? (DIRTY?'#f0b90b':'#9be3c4') : '#ffb4b8';
  });
}

loadDB();
LAST_RENDER_SIG=JSON.stringify(DB);
syncNow();
setInterval(()=>syncNow(), 5000);
