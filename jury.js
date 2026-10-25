/* ============================================================
   COMMISSION EXPOSÉ — Espace Membres du jury
   Objectif : le jury voit exactement ce que la commission a fait pour chaque étudiant
   (qui a corrigé, quand, quelles observations ont été envoyées, si le document a été
   retiré, si une nouvelle version a été redéposée) pour ne pas être piégé par un
   « c'est passé à la correction ».
   Dépend de core.js + discussion.js
   ============================================================ */
const LS_JY='CE_JURY';
let MOI=null;
function goScreen(id){ document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on')); document.getElementById(id).classList.add('on'); window.scrollTo(0,0); }
function goHome(){ goScreen('s-home'); majAccueil(); }
const ST={depose:['Déposé — à corriger','br'],en_correction:['En correction','by'],corrige_complet:['Corrigé complet','bg'],corrige_partiel:['Corrigé partiel','by'],retire:['Retiré par l\'étudiant','bg'],definitif:['Définitif','bg']};
const stLbl=s=>ST[s]||[s||'—','bn'];
const dt=ms=>{ if(!ms) return ''; const d=new Date(ms); return frDate(d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()))+' à '+pad(d.getHours())+':'+pad(d.getMinutes()); };

/* ---------- Connexion ---------- */
function jyChercher(){
  const q=normName(document.getElementById('jy-nom').value), list=document.getElementById('jy-list');
  if(q.length<2){ list.classList.add('hidden'); return; }
  const res=(DB.jury||[]).filter(m=>normName(m.nom).includes(q)).slice(0,20);
  list.classList.remove('hidden');
  list.innerHTML = res.length ? res.map(m=>`<div class="pick-item" data-n="${escapeHtml(m.nom)}"><div style="flex:1;"><div class="pk-name">${escapeHtml(m.nom)}</div><div class="pk-sub">Membre du jury</div></div></div>`).join('')
    : `<div class="empty">Nom introuvable : demandez à l'administration de vous inscrire comme membre du jury.</div>`;
  list.querySelectorAll('[data-n]').forEach(x=>x.onclick=()=>{ document.getElementById('jy-nom').value=x.dataset.n; list.classList.add('hidden'); document.getElementById('jy-code').focus(); });
}
function jyConnexion(){
  const m=verifierCode('jury', document.getElementById('jy-nom').value, document.getElementById('jy-code').value);
  if(!m){ toast('Nom ou code incorrect','ko'); return; }
  try{ localStorage.setItem(LS_JY, JSON.stringify({id:m.id, code:String(m.code)})); }catch(e){}
  document.getElementById('jy-code').value='';
  connecte(); toast('Bienvenue '+m.nom,'ok');
}
function jyDeconnexion(){ try{ localStorage.removeItem(LS_JY); }catch(e){} MOI=null; desactiverPush(); majAccueil(); }
function connecte(){
  let s=null; try{ s=JSON.parse(localStorage.getItem(LS_JY)||'null'); }catch(e){}
  MOI = s ? ((DB.jury||[]).find(x=>x.id===s.id && String(x.code)===s.code)||null) : null;
  majAccueil(); return MOI;
}
function mesSorties(){ return MOI ? (DB.sorties||[]).filter(v=>Object.values(v.postes||{}).some(p=>p && cleNom(p.nom)===cleNom(MOI.nom))).sort((a,b)=>String(a.date).localeCompare(b.date)) : []; }
function mesMessages(){ return MOI ? DB.messages.filter(m=>messageConcerne(m,MOI.nom)).sort((a,b)=>(b.ts||0)-(a.ts||0)) : []; }
function majAccueil(){
  appTete(MOI ? {nom:MOI.nom, sub:'Membre du jury', n:mesMessages().filter(m=>!messageLu(m,MOI.nom)).length+chatsNonLus(MOI.nom), cloche:()=>ouvrir('s-notif')} : null);
  document.getElementById('jy-login').classList.toggle('hidden', !!MOI);
  document.getElementById('jy-menu').classList.toggle('hidden', !MOI);
  document.getElementById('jy-qui').textContent = MOI ? MOI.nom+' — membre du jury' : 'Commission Exposé';
  if(!MOI) return;
  const set=(id,v)=>{ const el=document.getElementById(id); el.textContent=v; el.classList.toggle('hidden',!v); };
  set('c-notif', mesMessages().filter(m=>!messageLu(m,MOI.nom)).length); set('c-disc', chatsNonLus(MOI.nom));
  const E=DB.expositions||[];
  document.getElementById('t-exp').textContent=`${E.length} exposé(s) — ${E.filter(x=>x.dateCorrection).length} corrigé(s), ${E.filter(x=>x.statut==='depose'||x.statut==='en_correction').length} en attente`;
  document.getElementById('t-rap').textContent=`${(DB.rapports||[]).filter(r=>r.statut==='definitif').length} rapport(s) définitif(s) sur ${(DB.etudiants||[]).length} étudiant(s)`;
  const so=mesSorties(), proch=so.find(v=>v.statut!=='effectuee' && v.date>=todayStr());
  document.getElementById('t-sor').textContent = proch ? `Prochaine : ${frDate(proch.date)} — ${proch.eglise}` : `${so.length} sortie(s)`;
}
function ouvrir(id){
  goScreen(id);
  ({'s-dos':rendreDossier,'s-exp':rendreExposes,'s-rap':rendreRapports,'s-cor':rendreCorrecteurs,'s-sor':rendreSorties,'s-notif':rendreNotifs}[id]||(()=>{}))();
  if(id==='s-disc') Discussion.monter('disc-zone', MOI.nom, {montrer:()=>goScreen('s-disc'), onChange:majAccueil});
}

/* ---------- Dossier d'un étudiant ---------- */
let DOS_NOM='';
function nomsConnus(){
  return uniq([].concat((DB.etudiants||[]).map(e=>({nom:e.nom, sub:e.commission||''})),
    (DB.expositions||[]).map(x=>({nom:x.etudiantNom, sub:x.classe||''})),
    (DB.rapports||[]).map(x=>({nom:x.etudiantNom, sub:x.commission||''}))), x=>cleNom(x.nom));
}
function dosChercher(){
  const q=normName(document.getElementById('dos-q').value), list=document.getElementById('dos-list');
  if(q.length<2){ list.classList.add('hidden'); return; }
  const res=nomsConnus().filter(x=>normName(x.nom).includes(q)).slice(0,25);
  list.classList.remove('hidden');
  list.innerHTML = res.length ? res.map(x=>`<div class="pick-item" data-n="${escapeHtml(x.nom)}"><div style="flex:1;"><div class="pk-name">${escapeHtml(x.nom)}</div><div class="pk-sub">${escapeHtml(x.sub)}</div></div></div>`).join('') : `<div class="empty">Aucun étudiant trouvé</div>`;
  list.querySelectorAll('[data-n]').forEach(x=>x.onclick=()=>voirDossier(x.dataset.n));
}
function voirDossier(nom){
  DOS_NOM=nom; goScreen('s-dos');
  document.getElementById('dos-q').value=nom; document.getElementById('dos-list').classList.add('hidden');
  rendreDossier();
}
function photosHtml(x){ return (x.photos||[]).length ? `<div class="mini-pills">${x.photos.map((p,i)=>`<a class="pill-link" href="${escapeHtml(p)}" target="_blank" rel="noopener">Photo ${i+1}</a>`).join(' ')}</div>` : ''; }
function rendreDossier(){
  const z=document.getElementById('dos-zone');
  if(!DOS_NOM){ z.innerHTML=`<div class="card"><div class="empty">Tapez le nom de l'étudiant que vous allez évaluer.</div></div>`; return; }
  const d=dossierEtudiant(DOS_NOM), f=d.fiche;
  // fil chronologique : chaque dépôt avec ses étapes + messages réellement envoyés à l'étudiant
  const ev=[];
  d.docs.forEach(x=>{
    const t=`${x.type} ${x.numero}${x.phase?' — '+x.phase:''}`;
    ev.push({ts:x.tsDepot||0, txt:`<b>${escapeHtml(t)}</b> : déposé${x.lieu?' à '+escapeHtml(x.lieu):''}${x.moderateur?' (modérateur : '+escapeHtml(x.moderateur)+')':''}`, d:x.dateDepot+(x.heureDepot?' '+x.heureDepot:'')});
    if(x.tsDebutCorrection) ev.push({ts:x.tsDebutCorrection, txt:`<b>${escapeHtml(x.numero)}</b> : pris en correction par <b>${escapeHtml(x.correcteur||'—')}</b>`, d:dt(x.tsDebutCorrection), brut:true});
    if(x.dateCorrection) ev.push({ts:new Date(x.dateCorrection+'T12:00').getTime(), txt:`<b>${escapeHtml(x.numero)}</b> : ${stLbl(x.statut==='retire'?(x.niveauCorrection||'corrige_complet'):x.statut)[0].toLowerCase()} par <b>${escapeHtml(x.correcteur||'—')}</b>${x.commentaire?`<div class="note-box ${x.statut==='corrige_partiel'?'partiel':'complet'}"><div class="note-lbl">Observations envoyées à l'étudiant</div><div class="note-txt">${escapeHtml(x.commentaire)}</div></div>`:' — <i>aucune observation écrite</i>'}`, d:x.dateCorrection});
    if(x.dateRetrait) ev.push({ts:new Date(x.dateRetrait+'T13:00').getTime(), txt:`<b>${escapeHtml(x.numero)}</b> : retiré par l'étudiant`, d:x.dateRetrait});
  });
  d.msgs.forEach(m=>ev.push({ts:m.ts||0, msg:true, txt:`Message reçu par l'étudiant — <b>${escapeHtml(m.titre||'')}</b><br>${escapeHtml(m.texte)}`, d:m.date+' '+(m.heure||'')}));
  ev.sort((a,b)=>a.ts-b.ts);
  const fmt=e=>e.brut?e.d:(String(e.d).split(' ').map((p,i)=>i?' à '+p:frDate(p)).join(''));
  z.innerHTML=`
    <div class="card"><div class="card-h">${escapeHtml(d.nom)}</div><div class="card-b">
      <div class="li-sub">${f?`Commission : <b>${escapeHtml(f.commission||'—')}</b> • Responsable : <b>${escapeHtml(f.responsable||commissionResponsable(f.commission)||'—')}</b>${f.classe?' • Classe : '+escapeHtml(f.classe):''}`:'Étudiant absent de la liste officielle'}</div>
      <div class="mini-pills" style="margin:10px 0;"><span><b>${d.docs.filter(x=>x.type==='Exposé').length}</b>exposé(s)</span><span><b>${d.docs.filter(x=>x.dateCorrection).length}</b>correction(s)</span><span><b>${d.docs.filter(x=>x.commentaire).length}</b>avec observations</span><span><b>${d.msgs.length}</b>message(s) reçu(s)</span></div>
      <div class="note-lbl" style="margin-bottom:6px;">Constats pour le jury</div>
      ${constatsDossier(d).map(([c,t])=>`<span class="constat ${c}">${escapeHtml(t)}</span>`).join('')}
    </div></div>
    ${d.docs.map(x=>{ const [l,c]=stLbl(x.statut); return `<div class="card"><div class="list-item">
      <div class="li-top"><div class="li-name">${escapeHtml(x.type)} ${escapeHtml(x.numero)}</div><span class="badge ${c}">${l}</span></div>
      <div class="li-sub">${escapeHtml(x.phase||'')}${x.classe?' • '+escapeHtml(x.classe):''}${x.nomClasse?' • '+escapeHtml(x.nomClasse):''}${x.commission?' • '+escapeHtml(x.commission):''}<br>
      Déposé le ${frDate(x.dateDepot)}${x.heureDepot?' à '+x.heureDepot:''}${x.correcteur?' • Correcteur : <b>'+escapeHtml(x.correcteur)+'</b>':''}${x.dateCorrection?' • corrigé le '+frDate(x.dateCorrection):''}${x.dateRetrait?' • retiré le '+frDate(x.dateRetrait):''}</div>
      ${(x.themes||[]).length?`<div class="hint">Thèmes : ${x.themes.map(escapeHtml).join(', ')}</div>`:''}
      ${x.commentaire?`<div class="note-box ${x.statut==='corrige_partiel'?'partiel':'complet'}"><div class="note-lbl">Observations envoyées à l'étudiant</div><div class="note-txt">${escapeHtml(x.commentaire)}</div></div>`:''}
      ${photosHtml(x)}</div></div>`; }).join('')}
    <div class="card"><div class="card-h">Chronologie complète</div><div class="card-b">${ev.length?`<div class="chrono">${ev.map(e=>`<div class="etape${e.msg?' msg':''}"><div class="et-d">${escapeHtml(fmt(e))}</div><div class="et-t">${e.txt}</div></div>`).join('')}</div>`:'<div class="empty">Aucune trace</div>'}</div></div>
    <div class="card"><div class="card-b"><button class="btn btn-y" onclick="signaler()">Signaler ce dossier à l'administration</button></div></div>`;
}
function signaler(){
  if(!DOS_NOM) return;
  const t=prompt('Votre remarque pour l\'administration au sujet de '+DOS_NOM+' :','');
  if(!t || !t.trim()) return;
  envoyerChat(MOI.nom, ADMIN_NOM, `[Dossier ${DOS_NOM}] ${t.trim()}`, [], {demande:'Signalement du jury', dossier:DOS_NOM});
  saveDB(); toast('Remarque envoyée à l\'administration','ok');
}

/* ---------- Listes ---------- */
function rendreExposes(){
  fillSelect('exp-classe', (DB.expositions||[]).map(x=>x.classe).filter(Boolean), {vide:'Toutes les classes'});
  const cl=document.getElementById('exp-classe').value, st=document.getElementById('exp-statut').value, q=normName(document.getElementById('exp-q').value);
  let l=(DB.expositions||[]).slice();
  if(cl) l=l.filter(x=>x.classe===cl);
  if(st==='sansobs') l=l.filter(x=>x.dateCorrection && !x.commentaire); else if(st) l=l.filter(x=>x.statut===st);
  if(q) l=l.filter(x=>normName([x.etudiantNom,x.numero,x.correcteur,x.moderateur].join(' ')).includes(q));
  l.sort((a,b)=>(b.tsDepot||0)-(a.tsDepot||0));
  document.getElementById('exp-stats').innerHTML=[['affichés',l.length],['corrigés',l.filter(x=>x.dateCorrection).length],['avec observations',l.filter(x=>x.commentaire).length],['non corrigés',l.filter(x=>!x.dateCorrection).length]].map(([a,b])=>`<span><b>${b}</b>${a}</span>`).join('');
  document.getElementById('exp-list').innerHTML = l.length ? l.slice(0,300).map(x=>{ const [lb,c]=stLbl(x.statut); return `<div class="card"><div class="list-item">
    <div class="li-top"><div class="li-name">${escapeHtml(x.etudiantNom)}</div><span class="badge ${c}">${lb}</span></div>
    <div class="li-sub">${escapeHtml(x.numero)} • ${escapeHtml(x.classe||'')} • ${escapeHtml(x.phase||'')} • déposé le ${frDate(x.dateDepot)}${x.correcteur?'<br>Correcteur : <b>'+escapeHtml(x.correcteur)+'</b>':''}${x.dateCorrection?' • corrigé le '+frDate(x.dateCorrection):''}</div>
    ${x.commentaire?`<div class="note-box ${x.statut==='corrige_partiel'?'partiel':'complet'}"><div class="note-lbl">Observations envoyées</div><div class="note-txt">${escapeHtml(x.commentaire)}</div></div>`:''}
    <div class="actions"><button class="btn-xs b-ok" data-n="${escapeHtml(x.etudiantNom)}">Voir le dossier complet</button></div></div></div>`; }).join('') : `<div class="card"><div class="empty">Aucun exposé</div></div>`;
  document.querySelectorAll('#exp-list [data-n]').forEach(b=>b.onclick=()=>voirDossier(b.dataset.n));
}
function rendreRapports(){
  const coms=(DB.commissions||[]).map(c=>c.nom);
  fillSelect('rap-com', coms, {vide:'Toutes les commissions'});
  const com=document.getElementById('rap-com').value, q=normName(document.getElementById('rap-q').value);
  const blocs=(com?[com]:coms).map(c=>{
    const t=tauxDefinitifs(c); let l=sousCharge(c);
    if(q) l=l.filter(e=>normName(e.nom).includes(q));
    if(q && !l.length) return '';
    return `<div class="card"><div class="card-h">${escapeHtml(c)} — ${t.n}/${t.total} définitif(s)${t.pct!==null?' ('+t.pct+' %)':''}</div>
      <div class="hint" style="padding:0 16px;">Responsable : ${escapeHtml(commissionResponsable(c)||'—')}</div>
      ${l.map(e=>{ const r=rapportDefinitifDe(e.nom); const autres=(DB.rapports||[]).filter(x=>cleNom(x.etudiantNom)===cleNom(e.nom) && x.statut!=='definitif');
        return `<div class="list-item"><div class="li-top"><div class="li-name">${escapeHtml(e.nom)}</div><span class="badge ${r?'bg':(autres.length?'by':'br')}">${r?'Définitif':(autres.length?stLbl(autres[autres.length-1].statut)[0]:'Aucun rapport')}</span></div>
        <div class="actions"><button class="btn-xs b-ok" data-n="${escapeHtml(e.nom)}">Voir le dossier</button></div></div>`; }).join('')||'<div class="empty">Aucun étudiant</div>'}</div>`;
  }).join('');
  document.getElementById('rap-list').innerHTML = blocs || `<div class="card"><div class="empty">Aucun résultat</div></div>`;
  document.querySelectorAll('#rap-list [data-n]').forEach(b=>b.onclick=()=>voirDossier(b.dataset.n));
}
function rendreCorrecteurs(){
  const docs=[].concat(DB.expositions||[], DB.rapports||[]).filter(x=>x.correcteur);
  const map=new Map();
  docs.forEach(x=>{ const k=cleNom(x.correcteur); const o=map.get(k)||{nom:x.correcteur, total:0, fini:0, obs:0, encours:0, delais:[]};
    o.total++; if(x.dateCorrection){ o.fini++; if(x.dateDepot) o.delais.push(Math.max(0,(new Date(x.dateCorrection)-new Date(x.dateDepot))/86400000)); } else o.encours++;
    if(x.commentaire) o.obs++; map.set(k,o); });
  const l=Array.from(map.values()).sort((a,b)=>b.total-a.total);
  document.getElementById('cor-list').innerHTML = l.length ? l.map(o=>`<div class="card"><div class="list-item">
    <div class="li-top"><div class="li-name">${escapeHtml(o.nom)}</div><span class="badge bg">${o.fini} corrigé(s)</span></div>
    <div class="mini-pills" style="margin-top:6px;"><span><b>${o.total}</b>pris</span><span><b>${o.encours}</b>en cours</span><span><b>${o.obs}</b>avec observations</span><span><b>${o.fini-o.obs<0?0:o.fini-o.obs}</b>sans observation</span><span><b>${o.delais.length?Math.round(o.delais.reduce((s,v)=>s+v,0)/o.delais.length*10)/10:'—'}</b>jours en moyenne</span></div></div></div>`).join('') : `<div class="card"><div class="empty">Aucune correction enregistrée</div></div>`;
}
function rendreSorties(){
  const l=mesSorties();
  document.getElementById('sor-list').innerHTML = l.length ? l.map(v=>{ const poste=Object.entries(v.postes||{}).filter(([k,p])=>p && cleNom(p.nom)===cleNom(MOI.nom)).map(([k])=>(typeof POSTES_SORTIE!=='undefined'?(POSTES_SORTIE.find(p=>p.key===k)||{}).label:'')||({president:'Président du jury',jury1:'Jury 1',jury2:'Jury 2',observateur1:'Observateur 1',observateur2:'Observateur 2',coordonnateur:'Coordonnateur'}[k]||k)).join(', ');
    const autres=Object.values(v.postes||{}).filter(p=>p && cleNom(p.nom)!==cleNom(MOI.nom)).map(p=>escapeHtml(p.nom)).join(', ');
    return `<div class="card"><div class="list-item"><div class="li-top"><div class="li-name">${escapeHtml(v.eglise)}</div><span class="badge ${v.statut==='effectuee'?'bg':'by'}">${v.statut==='effectuee'?'Effectuée':'Programmée'}</span></div>
    <div class="li-sub">Le <b>${frDate(v.date)}</b> • Mon poste : <b>${escapeHtml(poste)}</b><br>Avec : ${autres||'—'}</div>${v.pv?`<div class="note-box complet"><div class="note-lbl">Procès-verbal</div><div class="note-txt">${escapeHtml(v.pv)}</div></div>`:''}</div></div>`; }).join('') : `<div class="card"><div class="empty">Aucune sortie pour le moment</div></div>`;
}

/* ---------- Notifications ---------- */
function etatPush(){
  const el=document.getElementById('push-etat'), b=document.getElementById('push-btn');
  if(!pushDisponible()){ el.innerHTML='Application ouverte : vous êtes prévenu en direct (bandeau + son).<br><span class="hint">Téléphone verrouillé : nécessite le serveur en ligne (HTTPS).</span>'; b.classList.add('hidden'); return; }
  b.classList.remove('hidden'); el.textContent = Notification.permission==='granted' ? 'Notifications activées sur ce téléphone.' : 'Être prévenu même téléphone verrouillé.';
}
async function jyPush(){ try{ await activerPush(MOI.nom); toast('Notifications activées','ok'); }catch(e){ toast(e.message,'ko'); } etatPush(); }
function rendreNotifs(){
  etatPush();
  const l=mesMessages();
  document.getElementById('notif-list').innerHTML = l.length ? l.map(m=>{ const lu=messageLu(m,MOI.nom);
    return `<div class="list-item" style="${lu?'':'background:var(--YELP);'}"><div class="li-top"><div class="li-name">${escapeHtml(m.titre||'Commission Exposé')}</div>${lu?'':'<span class="badge by">Nouveau</span>'}</div>
      <div class="li-sub" style="color:var(--INK);font-size:13px;">${escapeHtml(m.texte)}</div><div class="hint">${frDate(m.date)} à ${escapeHtml(m.heure||'')}</div></div>`; }).join('') : `<div class="empty">Aucune notification pour le moment</div>`;
}
function toutLu(){ let n=0; mesMessages().forEach(m=>{ if(!messageLu(m,MOI.nom)){ marquerLu(m,MOI.nom); n++; } }); if(n) saveDB(); rendreNotifs(); majAccueil(); }

/* ---------- Temps réel ---------- */
window.onNotif = function(m){
  if(!MOI || !messageConcerne(m, MOI.nom)) return;
  if(!DB.messages.some(x=>x.id===m.id)) DB.messages.push(m);
  ding(); bandeau(m.titre||'Jury', m.texte, ()=>ouvrir('s-notif')); notifSysteme(m.titre||'Jury', m.texte);
  majAccueil(); if(document.getElementById('s-notif').classList.contains('on')) rendreNotifs();
};
window.onChat = function(c){ if(MOI && Discussion.surNouveau(c)) majAccueil(); };
window.onRemoteUpdate = function(){
  updateSyncBadge();
  if(!MOI) connecte(); else { const m=(DB.jury||[]).find(x=>x.id===MOI.id); if(!m){ jyDeconnexion(); return; } MOI=m; majAccueil(); }
  const on=id=>document.getElementById(id).classList.contains('on');
  if(on('s-dos')) rendreDossier(); if(on('s-exp')) rendreExposes(); if(on('s-rap')) rendreRapports();
  if(on('s-cor')) rendreCorrecteurs(); if(on('s-sor')) rendreSorties(); if(on('s-notif')) rendreNotifs();
  if(on('s-disc')) Discussion.apresSync();
};
if('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('sw.js').catch(()=>{});
window.ouvrirVue = v => { if(!MOI) return; if(v==='discussion') ouvrir('s-disc'); else if(v==='notifications') ouvrir('s-notif'); };
connecte();
(function(){ const v=new URLSearchParams(location.search).get('vue'); if(!MOI||!v) return; if(v==='discussion') ouvrir('s-disc'); else ouvrir('s-notif'); })();
if(navigator.serviceWorker) navigator.serviceWorker.addEventListener('message', e=>{ if(e.data && e.data.type==='open' && MOI){ if(/discussion/.test(e.data.url)) ouvrir('s-disc'); else ouvrir('s-notif'); } });
