/* ============================================================
   COMMISSION EXPOSÉ — Académie Vases d'Honneur
   core.js — Modèle de données partagé (Étudiant + Administration)
   Les deux interfaces doivent être servies depuis la même origine
   (même domaine / même dossier) pour partager les données via
   localStorage + serveur local. Sans cela chaque interface aura
   sa propre base.
   ============================================================ */

const ADMIN_CODE = '2026';
const RETARD_JOURS = 7;      // seuil "en retard" si non corrigé après ce délai
const SEUIL_COMMISSION_FAIBLE = 50; // % en dessous duquel on alerte sur le taux de dépôt d'une commission
const SEUIL_ABSENCES_DIMANCHE = 3;  // nombre de dimanches sans pointage avant alerte
const SEUIL_REPRISE_JOURS = 14;     // délai avant d'alerter qu'une classe n'a pas eu son 1er passage

const LS_KEY = 'CE_DB_v1';
const NIVEAU_OPTIONS = ['Très faible','Faible','Moyen','Très bien'];

function seedDB(){
  return {
    etudiants:[
      {id:'e1',nom:'Awa Koné',classe:'Classe 1'},
      {id:'e2',nom:'Bakary Diarra',classe:'Classe 2'},
      {id:'e3',nom:'Fatou Traoré',classe:'Classe 3'},
      {id:'e4',nom:'Moussa Sanogo',classe:'Classe 1'},
      {id:'e5',nom:'Aïcha Coulibaly',classe:'Classe 2'}
    ],
    membres:[
      {id:'m1',nom:'Jean Kouassi',code:'1111',tel:'',lieu:'',financier:'Moyen',spirituel:'Moyen',motifAbsence:''},
      {id:'m2',nom:'Marie Ahou',code:'2222',tel:'',lieu:'',financier:'Moyen',spirituel:'Moyen',motifAbsence:''},
      {id:'m3',nom:'Paul N\'Guessan',code:'3333',tel:'',lieu:'',financier:'Moyen',spirituel:'Moyen',motifAbsence:''},
      {id:'m4',nom:'Grace Adjoua',code:'4444',tel:'',lieu:'',financier:'Moyen',spirituel:'Moyen',motifAbsence:''}
    ],
    creneaux:[
      {id:'c1',jour:'Samedi',debut:'07:00',fin:'10:00',label:'07h - 10h'},
      {id:'c2',jour:'Samedi',debut:'10:00',fin:'13:00',label:'10h - 13h'},
      {id:'c3',jour:'Samedi',debut:'13:00',fin:'15:00',label:'13h - 15h'},
      {id:'c4',jour:'Dimanche',debut:'07:00',fin:'10:00',label:'07h - 10h'},
      {id:'c5',jour:'Dimanche',debut:'10:00',fin:'13:00',label:'10h - 13h'},
      {id:'c6',jour:'Dimanche',debut:'13:00',fin:'15:00',label:'13h - 15h'}
    ],
    motifsPresence:['Permanence','Correction des exposés','Coordinateur d\'exposés','Présentation de la méthodologie','Séance de méditation','Présentation de quiz biblique'],
    eglises:[
      'Centre Kodesh (Siège mondial) — Cocody Angré',
      'Centre de la Foi (VHCDF) — Treichville, Avenue 21',
      'Centre Eden — Yopougon, Cité CIE',
      'Centre Yotsar — Yopougon, Cité SOPIM / Ancien Bel-Air',
      'Centre Abobo — Abobo Belle-ville',
      'Centre Influence — Plateau Dokui',
      'Centre Productivité — Cocody Palmeraie',
      'Assemblée Porte des Brebis — Riviera 3',
      'Assemblée Vie Glorieuse — Riviera 2',
      'Assemblée Restauration — Angré Château',
      'Assemblée du Triomphe — Angré',
      'Centre Doxa — Faya',
      'Antenne de Port-Bouët — Route de Grand-Bassam Yamoussoukro',
      'Bouaké',
      'San-Pédro',
      'Daloa',
      'Korhogo'
    ],
    commissions:[{id:'co1',nom:'Commission Exposé',totalAttendu:0},{id:'co2',nom:'Commission Permanence',totalAttendu:0}],
    sessions:[],
    sorties:[],
    bibliotheque:[],
    meditations:[],
    quizBiblique:[],
    messages:[],
    presences:[],
    expositions:[],
    rapports:[],
    compteurs:{expose:0,rapport:0}
  };
}

let DB = null;
function loadDB(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    DB = raw ? JSON.parse(raw) : seedDB();
    if(!DB.compteurs) DB.compteurs = {expose:0,rapport:0};
    if(!DB.eglises || !DB.eglises.length) DB.eglises = seedDB().eglises;
    if(!DB.commissions) DB.commissions = [{id:'co1',nom:'Commission Exposé',totalAttendu:0}];
    if(!DB.motifsPresence || !DB.motifsPresence.length) DB.motifsPresence = seedDB().motifsPresence;
    if(!DB.sessions) DB.sessions = [];
    if(!DB.sorties) DB.sorties = [];
    if(!DB.bibliotheque) DB.bibliotheque = [];
    if(!DB.meditations) DB.meditations = [];
    if(!DB.quizBiblique) DB.quizBiblique = [];
    if(!DB.messages) DB.messages = [];
    (DB.membres||[]).forEach(m=>{
      if(m.lieu===undefined) m.lieu='';
      if(m.tel===undefined) m.tel='';
      if(m.financier===undefined) m.financier='Moyen';
      if(m.spirituel===undefined) m.spirituel='Moyen';
      if(m.motifAbsence===undefined) m.motifAbsence='';
    });
  }catch(e){ DB = seedDB(); }
}
function saveDB(){
  const json = JSON.stringify(DB);
  try{
    localStorage.setItem(LS_KEY, json);
  }catch(e){
    // Stockage local plein (souvent à cause de photos non compressées accumulées).
    // On continue quand même : la sauvegarde vers le serveur ci-dessous reste tentée,
    // et surtout on ne bloque jamais le bouton qui a déclenché cet enregistrement.
    console.warn('localStorage indisponible/plein — sauvegarde locale ignorée, on continue avec le serveur.', e);
  }
  fetch('/api/data', {method:'POST', headers:{'Content-Type':'application/json'}, body: json}).catch(()=>{});
}

let SERVER_CONNECTE = false;
async function pullRemote(silent){
  try{
    const r = await fetch('/api/data', {cache:'no-store'});
    if(!r.ok) throw new Error('bad status');
    const txt = await r.text();
    SERVER_CONNECTE = true;
    if(txt && txt!=='null'){
      const parsed = JSON.parse(txt);
      DB = parsed;
      localStorage.setItem(LS_KEY, txt);
    }
    if(typeof window.onRemoteUpdate === 'function') window.onRemoteUpdate();
    if(!silent) toast('Données actualisées depuis le serveur','ok');
  }catch(e){
    SERVER_CONNECTE = false;
    if(!silent) toast("Aucun serveur local détecté — mode hors-ligne (un seul appareil)",'ko');
  }
}
function manualRefresh(){ pullRemote(false); }

function nid(){ return 'x'+Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function pad(n){ return String(n).padStart(2,'0'); }
function todayStr(){ const d=new Date(); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function nowTimeStr(){ const d=new Date(); return pad(d.getHours())+':'+pad(d.getMinutes()); }
function nowFull(){ return Date.now(); }
function initials(name){ return (name||'?').split(' ').filter(Boolean).slice(0,2).map(w=>w[0].toUpperCase()).join(''); }
function joursDepuis(dateMs){ return Math.floor((Date.now()-dateMs)/86400000); }
function joursDepuisStr(ds){ if(!ds) return 0; return Math.floor((Date.now() - new Date(ds+'T00:00:00').getTime())/86400000); }
function addDaysStr(ds,n){ const d=new Date(ds+'T00:00:00'); d.setDate(d.getDate()+n); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function addMonthsStr(ds,n){ const d=new Date(ds+'T00:00:00'); d.setMonth(d.getMonth()+n); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
function escapeHtml(s){ return (s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
const MOIS_LBL=['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

function niveauBadgeClass(niveau){
  if(niveau==='Très faible') return 'br';
  if(niveau==='Faible') return 'by';
  if(niveau==='Très bien') return 'bg';
  return 'bn';
}
function niveauAlerte(niveau){ return niveau==='Très faible' || niveau==='Faible'; }

function sendMessage(nom, texte, tel){
  if(!nom) return;
  DB.messages.push({id:nid(), nom, tel:tel||'', texte, date:todayStr(), heure:nowTimeStr(), lu:false});
}
// Construit un lien wa.me pré-rempli (nom + message) pour envoyer en un clic via WhatsApp.
// Retourne '' si aucun numéro n'est disponible (le bouton ne doit alors pas s'afficher).
function waLink(tel, texte){
  const digits=(tel||'').replace(/[^0-9+]/g,'').replace(/^00/,'+');
  if(!digits) return '';
  const clean = digits.startsWith('+') ? digits.slice(1) : digits;
  if(clean.length<8) return '';
  return `https://wa.me/${clean}?text=${encodeURIComponent(texte)}`;
}

function toast(msg,type){
  const t=document.getElementById('toast');
  if(!t) return;
  t.textContent=msg; t.className='toast show '+(type||'ok');
  clearTimeout(window._tst);
  window._tst=setTimeout(()=>{ t.className='toast '+(type||'ok'); },2400);
}

loadDB();
pullRemote(true);
setInterval(()=>pullRemote(true), 6000);
