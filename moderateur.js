/* ============================================================
   COMMISSION EXPOSÉ — Espace Modérateurs de classe
   - Suivi en direct des exposés déposés dans leurs classes
   - Suivi des présentations de la méthodologie (programmée, présentée, validée)
   - Notifications (bandeau + son ; push si serveur en HTTPS)
   - Discussion et demandes à l'administration (visite, présentation, problème)
   Dépend de core.js + discussion.js
   ============================================================ */
const LS_MD='CE_MODO';
let MOI=null;               // fiche du modérateur connecté
let classeVue='';
function goScreen(id){ document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on')); document.getElementById(id).classList.add('on'); }
function goHome(){ goScreen('s-home'); majAccueil(); }

/* ---------- Connexion ---------- */
function mdChercher(){
  const q=normName(document.getElementById('md-nom').value), list=document.getElementById('md-list');
  if(q.length<2){ list.classList.add('hidden'); return; }
  const res=(DB.moderateurs||[]).filter(m=>normName(m.nom).includes(q)).slice(0,20);
  list.classList.remove('hidden');
  list.innerHTML = res.length ? res.map(m=>`<div class="pick-item" data-n="${escapeHtml(m.nom)}"><div style="flex:1;"><div class="pk-name">${escapeHtml(m.nom)}</div><div class="pk-sub">${escapeHtml((m.classes||[]).join(', ')||'Classe à préciser')}</div></div></div>`).join('')
    : `<div class="empty">Nom introuvable : demandez à l'administration de vous inscrire comme modérateur.</div>`;
  list.querySelectorAll('[data-n]').forEach(x=>x.onclick=()=>{ document.getElementById('md-nom').value=x.dataset.n; list.classList.add('hidden'); document.getElementById('md-code').focus(); });
}
function mdConnexion(){
  const m=verifierCode('moderateurs', document.getElementById('md-nom').value, document.getElementById('md-code').value);
  if(!m){ toast('Nom ou code incorrect','ko'); return; }
  try{ localStorage.setItem(LS_MD, JSON.stringify({id:m.id, code:String(m.code)})); }catch(e){}
  document.getElementById('md-code').value='';
  connecte(); toast('Bienvenue '+m.nom,'ok');
}
function mdDeconnexion(){ try{ localStorage.removeItem(LS_MD); }catch(e){} MOI=null; desactiverPush(); majAccueil(); }
function connecte(){
  let s=null; try{ s=JSON.parse(localStorage.getItem(LS_MD)||'null'); }catch(e){}
  const m = s ? (DB.moderateurs||[]).find(x=>x.id===s.id && String(x.code)===s.code) : null;
  MOI = m || null;
  Discussion.moi = MOI ? MOI.nom : '';
  majAccueil();
  return MOI;
}
function mesClasses(){ return MOI ? uniq((MOI.classes||[]).concat((DB.expositions||[]).filter(x=>cleNom(x.moderateur)===cleNom(MOI.nom)).map(x=>x.classe))) : []; }
function mesExposes(classe){
  if(!MOI) return [];
  const cls=mesClasses();
  return (DB.expositions||[]).filter(x=>(classe ? x.classe===classe : cls.includes(x.classe)) || (!classe && cleNom(x.moderateur)===cleNom(MOI.nom)));
}
function mesMessages(){ return MOI ? DB.messages.filter(m=>messageConcerne(m,MOI.nom)).sort((a,b)=>(b.ts||0)-(a.ts||0)) : []; }

function majAccueil(){
  appTete(MOI ? {nom:MOI.nom, sub:'Modérateur — '+(mesClasses().join(', ')||'classe à préciser'), n:mesMessages().filter(m=>!messageLu(m,MOI.nom)).length+chatsNonLus(MOI.nom), cloche:()=>ouvrir('s-notif')} : null);
  document.getElementById('md-login').classList.toggle('hidden', !!MOI);
  document.getElementById('md-menu').classList.toggle('hidden', !MOI);
  document.getElementById('md-qui').textContent = MOI ? `${MOI.nom} — ${mesClasses().join(', ')||'classe à préciser par l\'administration'}` : 'Commission Exposé';
  if(!MOI) return;
  const ex=mesExposes(), nl=mesMessages().filter(m=>!messageLu(m,MOI.nom)).length, nc=chatsNonLus(MOI.nom);
  const set=(id,v)=>{ const el=document.getElementById(id); el.textContent=v; el.classList.toggle('hidden',!v); };
  set('c-exp', ex.filter(x=>x.statut==='depose'||x.statut==='en_correction').length); set('c-notif', nl); set('c-disc', nc);
  document.getElementById('t-exp').textContent = `${ex.length} exposé(s) — ${ex.filter(x=>x.statut==='en_correction').length} en correction, ${ex.filter(x=>x.statut==='corrige_complet'||x.statut==='corrige_partiel').length} corrigé(s) à retirer`;
  const ses=(DB.sessions||[]).filter(s=>mesClasses().includes(s.classe));
  const proch=ses.filter(s=>s.statut==='programmee').sort((a,b)=>String(a.dateProgrammee).localeCompare(b.dateProgrammee))[0];
  document.getElementById('t-meth').textContent = proch ? `Prochaine présentation : ${frDate(proch.dateProgrammee)} — ${proch.classe}, salle ${proch.salle||'—'}` : `${ses.filter(s=>s.statut!=='programmee').length} présentation(s) effectuée(s)`;
}
function ouvrir(id){
  goScreen(id);
  if(id==='s-exp') rendreExposes();
  if(id==='s-meth') rendreMethodo();
  if(id==='s-notif') rendreNotifs();
  if(id==='s-disc') Discussion.monter('disc-zone', MOI.nom, {montrer:()=>goScreen('s-disc'), onChange:majAccueil});
  if(id==='s-dem') rendreDemandes();
}

/* ---------- Exposés ---------- */
const ST={depose:['Déposé — à corriger','bn'],en_correction:['En correction','by'],corrige_complet:['Corrigé complet','bg'],corrige_partiel:['Corrigé partiel','by'],retire:['Retiré par l\'étudiant','bg']};
function rendreExposes(){
  const cls=mesClasses();
  if(classeVue && !cls.includes(classeVue)) classeVue='';
  document.getElementById('exp-classes').innerHTML = `<button class="${!classeVue?'on':''}" onclick="classeVue='';rendreExposes()">Toutes</button>`+cls.map(c=>`<button class="${c===classeVue?'on':''}" onclick="classeVue=${JSON.stringify(c).replace(/"/g,'&quot;')};rendreExposes()">${escapeHtml(c)}</button>`).join('');
  let l=mesExposes(classeVue);
  const q=normName(document.getElementById('exp-q').value);
  if(q) l=l.filter(x=>normName(x.etudiantNom+' '+x.numero).includes(q));
  l.sort((a,b)=>(b.tsDepot||0)-(a.tsDepot||0));
  const cpt=k=>l.filter(x=>x.statut===k).length;
  const retard=l.filter(x=>(x.statut==='depose'||x.statut==='en_correction') && joursDepuis(x.tsDepot)>=RETARD_JOURS).length;
  document.getElementById('exp-stats').innerHTML=[['déposés',l.length],['à corriger',cpt('depose')],['en correction',cpt('en_correction')],['corrigés',cpt('corrige_complet')+cpt('corrige_partiel')],['retirés',cpt('retire')],['en retard',retard]].map(([a,b])=>`<span><b>${b}</b>${a}</span>`).join('');
  document.getElementById('exp-list').innerHTML = l.length ? l.map(x=>{
    const [lbl,cls2]=ST[x.statut]||[x.statut,'bn'];
    return `<div class="card"><div class="list-item">
      <div class="li-top"><div class="li-name">${escapeHtml(x.etudiantNom)}</div><span class="badge ${cls2}">${lbl}</span></div>
      <div class="li-sub">${escapeHtml(x.numero)} • ${escapeHtml(x.classe||'')} • ${escapeHtml(x.phase||'')}${x.nomClasse?' • '+escapeHtml(x.nomClasse):''}<br>
      Déposé le ${frDate(x.dateDepot)}${x.heureDepot?' à '+x.heureDepot:''}${x.lieu?' — '+escapeHtml(x.lieu):''}
      ${x.correcteur?'<br>Correcteur : <b>'+escapeHtml(x.correcteur)+'</b>':''}${x.dateCorrection?' • corrigé le '+frDate(x.dateCorrection):''}${x.dateRetrait?' • retiré le '+frDate(x.dateRetrait):''}</div>
      ${(x.themes||[]).length?`<div class="hint">Thèmes : ${x.themes.map(escapeHtml).join(', ')}</div>`:''}
      ${x.commentaire?`<div class="note-box ${x.statut==='corrige_partiel'?'partiel':'complet'}"><div class="note-lbl">Observations envoyées à l'étudiant</div><div class="note-txt">${escapeHtml(x.commentaire)}</div></div>`:''}
    </div></div>`; }).join('') : `<div class="card"><div class="empty">Aucun exposé déposé pour le moment dans ${classeVue?escapeHtml(classeVue):'vos classes'}.</div></div>`;
}

/* ---------- Méthodologie ---------- */
function rendreMethodo(){
  const ses=(DB.sessions||[]).filter(s=>mesClasses().includes(s.classe)).sort((a,b)=>String(b.dateProgrammee).localeCompare(a.dateProgrammee));
  const lbl={programmee:['Programmée','by'],presentee:['Présentée — en attente de validation','by'],validee:['Présentation validée','bg']};
  document.getElementById('meth-list').innerHTML = ses.length ? ses.map(s=>{ const [l,c]=lbl[s.statut]||[s.statut,'bn'];
    return `<div class="card"><div class="list-item">
      <div class="li-top"><div class="li-name">${escapeHtml(s.classe)} — passage n°${s.numero}</div><span class="badge ${c}">${l}</span></div>
      <div class="li-sub">Date prévue : <b>${frDate(s.dateProgrammee)}</b> — salle ${escapeHtml(s.salle||'—')}<br>
      Présentateur(s) prévu(s) : ${(s.presentateurs||[]).map(p=>escapeHtml(p.nom)).join(', ')||'—'}
      ${s.statut!=='programmee'?`<br>Présentée le <b>${frDate(s.dateValidation)}</b> par <b>${escapeHtml(s.presentateur||'—')}</b>`:''}
      ${s.dateDepotPremierJet?`<br>Dépôt du 1er jet : <b>${frDate(s.dateDepotPremierJet)}</b>`:''}</div>
      ${(s.themesProposes||[]).length?`<div class="hint">Thèmes proposés : ${s.themesProposes.map(escapeHtml).join(', ')}</div>`:''}
      ${s.compteRendu?`<div class="note-box complet"><div class="note-lbl">Compte-rendu de la présentation</div><div class="note-txt">${escapeHtml(s.compteRendu)}</div></div>`:''}
    </div></div>`; }).join('') : `<div class="card"><div class="empty">Aucune séance de méthodologie pour vos classes. Vous pouvez en demander une à l'administration.</div><div class="card-b"><button class="btn btn-y" onclick="ouvrir('s-dem');document.getElementById('dem-type').selectedIndex=1;">Demander une présentation</button></div></div>`;
}

/* ---------- Notifications ---------- */
function etatPush(){
  const el=document.getElementById('push-etat'), b=document.getElementById('push-btn');
  if(!pushDisponible()){ el.innerHTML='Application ouverte : vous êtes prévenu en direct (bandeau + son).<br><span class="hint">Téléphone verrouillé : nécessite le serveur en ligne (HTTPS).</span>'; b.classList.add('hidden'); return; }
  b.classList.remove('hidden'); el.textContent = Notification.permission==='granted' ? 'Notifications activées sur ce téléphone.' : 'Être prévenu même téléphone verrouillé.';
}
async function mdPush(){ try{ await activerPush(MOI.nom); toast('Notifications activées','ok'); }catch(e){ toast(e.message,'ko'); } etatPush(); }
function rendreNotifs(){
  etatPush();
  const l=mesMessages();
  document.getElementById('notif-list').innerHTML = l.length ? l.map(m=>{ const lu=messageLu(m,MOI.nom);
    return `<div class="list-item" style="${lu?'':'background:var(--YELP);'}"><div class="li-top"><div class="li-name">${escapeHtml(m.titre||'Commission Exposé')}</div>${lu?'':'<span class="badge by">Nouveau</span>'}</div>
      <div class="li-sub" style="color:var(--INK);font-size:13px;">${escapeHtml(m.texte)}</div><div class="hint">${frDate(m.date)} à ${escapeHtml(m.heure||'')}</div></div>`; }).join('') : `<div class="empty">Aucune notification pour le moment</div>`;
}
function toutLu(){ let n=0; mesMessages().forEach(m=>{ if(!messageLu(m,MOI.nom)){ marquerLu(m,MOI.nom); n++; } }); if(n) saveDB(); rendreNotifs(); majAccueil(); }

/* ---------- Demandes à l'administration ---------- */
let demPieces=[];
async function demJoindre(inp){ const f=inp.files[0]; inp.value=''; if(!f) return; try{ toast('Envoi du fichier…','ok'); demPieces.push(await envoyerFichier(f)); }catch(e){ toast(e.message,'ko'); } demMajPieces(); }
function demMajPieces(){ document.getElementById('dem-pieces').innerHTML=demPieces.map((p,i)=>`<span>${escapeHtml(p.nom)} <a class="pill-link" href="javascript:void(0)" onclick="demPieces.splice(${i},1);demMajPieces()">Retirer</a></span>`).join(''); }
function rendreDemandes(){
  fillSelect('dem-classe', mesClasses().length?mesClasses():reglages().classes);
  const l=(DB.chats||[]).filter(c=>c.demande && cleNom(c.de)===cleNom(MOI.nom)).sort((a,b)=>b.ts-a.ts);
  document.getElementById('dem-list').innerHTML = l.length ? l.map(c=>{
    const rep=messagesFil(MOI.nom, ADMIN_NOM).filter(x=>x.ts>c.ts && cleNom(x.de)===cleNom(ADMIN_NOM)).length;
    return `<div class="list-item"><div class="li-top"><div class="li-name">${escapeHtml(c.demande)}</div><span class="badge ${rep?'bg':'by'}">${rep?'Réponse reçue':'Envoyée'}</span></div>
      <div class="li-sub">${escapeHtml(c.classe||'')}${c.dateSouhaitee?' • souhaitée le '+frDate(c.dateSouhaitee):''} • envoyée le ${frDate(c.date)}<br>${escapeHtml(c.texte)}</div>
      <div class="actions"><button class="btn-xs b-ok" onclick="ouvrir('s-disc');Discussion.ouvrir(ADMIN_NOM)">Voir la discussion</button></div></div>`; }).join('') : `<div class="empty">Aucune demande envoyée</div>`;
}
function demEnvoyer(){
  const type=document.getElementById('dem-type').value, classe=document.getElementById('dem-classe').value, date=document.getElementById('dem-date').value, texte=document.getElementById('dem-texte').value.trim();
  if(!texte){ toast('Expliquez votre demande','ko'); return; }
  if((DB.chats||[]).some(c=>c.demande===type && c.texte===texte && cleNom(c.de)===cleNom(MOI.nom) && c.date===todayStr())){ toast('Cette demande a déjà été envoyée aujourd\'hui','ko'); return; }
  envoyerChat(MOI.nom, ADMIN_NOM, texte, demPieces.slice(), {demande:type, classe, dateSouhaitee:date});
  saveDB(); demPieces=[]; demMajPieces();
  document.getElementById('dem-texte').value=''; document.getElementById('dem-date').value='';
  rendreDemandes(); toast('Demande envoyée à l\'administration','ok');
}

/* ---------- Temps réel ---------- */
window.onNotif = function(m){
  if(!MOI || !messageConcerne(m, MOI.nom)) return;
  if(!DB.messages.some(x=>x.id===m.id)) DB.messages.push(m);
  ding(); bandeau(m.titre||'Ma classe', m.texte, ()=>ouvrir('s-notif')); notifSysteme(m.titre||'Ma classe', m.texte);
  majAccueil(); if(document.getElementById('s-notif').classList.contains('on')) rendreNotifs();
};
window.onChat = function(c){ if(MOI && Discussion.surNouveau(c)) majAccueil(); };
window.onRemoteUpdate = function(){
  updateSyncBadge();
  if(!MOI) connecte(); else { const m=(DB.moderateurs||[]).find(x=>x.id===MOI.id); if(!m){ mdDeconnexion(); return; } MOI=m; majAccueil(); }
  if(document.getElementById('s-exp').classList.contains('on')) rendreExposes();
  if(document.getElementById('s-meth').classList.contains('on')) rendreMethodo();
  if(document.getElementById('s-notif').classList.contains('on')) rendreNotifs();
  if(document.getElementById('s-disc').classList.contains('on')) Discussion.apresSync();
  if(document.getElementById('s-dem').classList.contains('on')) rendreDemandes();
};
if('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('sw.js').catch(()=>{});
window.ouvrirVue = v => { if(!MOI) return; if(v==='discussion') ouvrir('s-disc'); else if(v==='notifications') ouvrir('s-notif'); };
connecte();
(function(){ const v=new URLSearchParams(location.search).get('vue'); if(!MOI||!v) return; if(v==='discussion') ouvrir('s-disc'); else ouvrir('s-notif'); })();
if(navigator.serviceWorker) navigator.serviceWorker.addEventListener('message', e=>{ if(e.data && e.data.type==='open' && MOI){ if(/discussion/.test(e.data.url)) ouvrir('s-disc'); else ouvrir('s-notif'); } });
