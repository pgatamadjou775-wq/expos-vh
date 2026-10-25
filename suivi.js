/* ============================================================
   COMMISSION EXPOSÉ — Interface "Suivi"
   Destinée aux étudiants et aux membres (installable sur le téléphone).
   - L'utilisateur choisit son nom une seule fois (retenu sur le téléphone)
   - Notifications en direct : bandeau + son + vibration (application ouverte)
   - Notifications push : même application fermée (serveur en HTTPS)
   Dépend de core.js (modèle de données partagé)
   ============================================================ */

function goHome(){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));
  document.getElementById('s-home').classList.add('on');
  majCompteurs();
}
function goScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));
  document.getElementById(id).classList.add('on');
}
const LS_MOI='CE_MOI', LS_CLE='CE_MOI_CLE';
// Le nom n'est retenu qu'après le code personnel : chacun ne voit que ce qui le concerne.
function getMoi(){
  let n=''; try{ n=localStorage.getItem(LS_MOI)||''; }catch(e){}
  if(!n) return '';
  const a=accesDe(n);
  let cle=''; try{ cle=localStorage.getItem(LS_CLE)||''; }catch(e){}
  if(!a || a.pin!==cle){ return ''; }   // code réinitialisé par l'administration ou jamais créé
  return n;
}
function setMoi(v, cle){ try{ if(v){ localStorage.setItem(LS_MOI,v); localStorage.setItem(LS_CLE,cle||''); } else { localStorage.removeItem(LS_MOI); localStorage.removeItem(LS_CLE); } }catch(e){} }

/* ================= MON SUIVI ================= */
const STATUT_INFO = {
  depose:       {lbl:'Déposé — en attente de correction', cls:'bn'},
  en_correction:{lbl:'En cours de correction', cls:'by'},
  corrige_complet:{lbl:'Corrigé — complet, à récupérer', cls:'bg'},
  corrige_partiel:{lbl:'Corrigé — partiel, à récupérer', cls:'by'},
  retire:       {lbl:'Retiré', cls:'bg'},
  clos:         {lbl:'Clôturé — rapport définitif reçu', cls:'bn'},
  definitif:    {lbl:'Rapport définitif — enregistré', cls:'bg'}
};
function openSuivi(){
  goScreen('s-suivi');
  renderSuivi();
}
// Personnes connues (étudiants + membres), sans doublons
function personnesConnues(){
  const l=DB.etudiants.map(e=>({nom:e.nom, sub:'Étudiant — '+(e.commission||'')}))
    .concat(DB.membres.map(m=>({nom:m.nom, sub:m.role||'Membre de la commission'})));
  return uniq(l, x=>cleNom(x.nom));
}
function suChercher(){
  const q=normName(document.getElementById('su-s').value);
  const list=document.getElementById('su-list');
  if(q.length<2){ list.classList.add('hidden'); list.innerHTML=''; return; }
  const res=personnesConnues().filter(p=>normName(p.nom).includes(q)).slice(0,25);
  list.classList.remove('hidden');
  const saisi=document.getElementById('su-s').value.trim();
  list.innerHTML = res.map((p,i)=>`<div class="pick-item" onclick="suChoisir(${JSON.stringify(p.nom).replace(/"/g,'&quot;')})"><div style="flex:1;"><div class="pk-name">${escapeHtml(p.nom)}</div><div class="pk-sub">${escapeHtml(p.sub)}</div></div></div>`).join('')
    + `<div class="pick-item" onclick="suChoisir(${JSON.stringify(saisi).replace(/"/g,'&quot;')})"><div style="flex:1;"><div class="pk-name">Utiliser « ${escapeHtml(saisi)} »</div><div class="pk-sub">Si votre nom n'est pas dans la liste (responsable, mandataire…)</div></div></div>`;
}
let suNomEnCours='';
function suChoisir(nom){
  if(!nom) return;
  suNomEnCours=nom;
  document.getElementById('su-list').classList.add('hidden');
  document.getElementById('su-s').value=nom;
  const a=accesDe(nom);
  document.getElementById('su-pin').classList.remove('hidden');
  document.getElementById('su-pin1').value=''; document.getElementById('su-pin2').value='';
  document.getElementById('su-pin2-wrap').classList.toggle('hidden', !!a);
  document.getElementById('su-pin-txt').textContent = a ? `Entrez le code personnel de ${nom}.` : `Première connexion de ${nom} : créez votre code personnel (4 chiffres). Il protège vos informations : gardez-le pour vous.`;
  document.getElementById('su-pin-lbl').textContent = a ? 'Code personnel' : 'Nouveau code personnel (4 chiffres)';
  setTimeout(()=>document.getElementById('su-pin1').focus(),50);
}
function suAnnulerPin(){ suNomEnCours=''; document.getElementById('su-pin').classList.add('hidden'); document.getElementById('su-s').value=''; }
let suEssais=0;
function suValiderPin(){
  const nom=suNomEnCours, p1=document.getElementById('su-pin1').value.trim(), p2=document.getElementById('su-pin2').value.trim();
  if(!nom) return;
  if(!/^\d{4,6}$/.test(p1)){ toast('Le code doit contenir 4 à 6 chiffres','ko'); return; }
  const a=accesDe(nom);
  if(a){
    if(suEssais>=5){ toast('Trop d\'essais : demandez à l\'administration de réinitialiser votre code','ko'); return; }
    if(hashPin(nom,p1)!==a.pin){ suEssais++; toast('Code incorrect','ko'); return; }
    setMoi(nom, a.pin);
  } else {
    if(p1!==p2){ toast('Les deux codes ne sont pas identiques','ko'); return; }
    const nv=definirPin(nom,p1); saveDB(); setMoi(nom, nv.pin);
  }
  suEssais=0; suNomEnCours='';
  document.getElementById('su-pin').classList.add('hidden'); document.getElementById('su-s').value='';
  renderSuivi(); majCompteurs(); toast('Bienvenue '+nom,'ok');
}
function suChanger(){
  if(!confirm('Se déconnecter de ce téléphone ?')) return;
  desactiverPush(); setMoi(''); renderSuivi(); majCompteurs();
}
function mesMessages(moi){
  return DB.messages.filter(m=>messageConcerne(m,moi)).sort((a,b)=>((b.ts||0)-(a.ts||0)) || (b.date+b.heure).localeCompare(a.date+a.heure));
}
function nbNonLus(moi){ return moi ? mesMessages(moi).filter(m=>!messageLu(m,moi)).length : 0; }
function majCompteurs(){
  const moi=getMoi(), n=nbNonLus(moi);
  const nc=moi?chatsNonLus(moi):0;
  [['home-chat',nc]].forEach(([id,v])=>{ const el=document.getElementById(id); if(el){ el.textContent=v; el.classList.toggle('hidden',!v); } });
  [['home-unread',n],['su-unread',n]].forEach(([id,v])=>{ const el=document.getElementById(id); if(el){ el.textContent=v; el.classList.toggle('hidden',!v); } });
  const hm=document.getElementById('home-moi');
  if(hm) hm.textContent = moi ? `${moi} — ${n?n+' notification(s) non lue(s)':'aucune nouvelle notification'}` : 'Statuts de mes dépôts + notifications + remarques du correcteur';
  try{ if(navigator.setAppBadge){ n?navigator.setAppBadge(n):navigator.clearAppBadge(); } }catch(e){}
}
function etatPush(){
  const el=document.getElementById('su-push-etat'), btn=document.getElementById('su-push-btn');
  if(!el) return;
  if(!pushDisponible()){
    el.innerHTML='Application ouverte : vous êtes prévenu en direct (bandeau, son et vibration).<br><span class="hint">Pour être prévenu téléphone verrouillé, l\'application doit être ouverte en HTTPS (serveur en ligne). Sur iPhone : « Ajouter à l\'écran d\'accueil » d\'abord.</span>';
    btn.classList.add('hidden'); return;
  }
  const p=('Notification' in window)?Notification.permission:'default';
  if(p==='granted' && localStorage.getItem('CE_PUSH')===normName(getMoi())){ el.textContent='Activées : vous serez prévenu même téléphone verrouillé.'; btn.textContent='Réactiver'; }
  else if(p==='denied'){ el.textContent='Bloquées dans les réglages du navigateur : réautorisez-les pour ce site.'; btn.textContent='Réessayer'; }
  else { el.textContent='Être prévenu quand mon document est corrigé, même téléphone verrouillé.'; btn.textContent='Activer les notifications'; }
  btn.classList.remove('hidden');
}
async function suActiverPush(){
  try{ await activerPush(getMoi()); try{ localStorage.setItem('CE_PUSH',normName(getMoi())); }catch(e){} toast('Notifications activées','ok'); }
  catch(e){ toast(e.message,'ko'); }
  etatPush();
}
function renderSuivi(){
  const moi=getMoi();
  document.getElementById('su-qui').classList.toggle('hidden', !!moi);
  document.getElementById('su-moi').classList.toggle('hidden', !moi);
  if(!moi) return;
  const n=normName(moi);
  const etu=DB.etudiants.find(e=>normName(e.nom)===n), mem=DB.membres.find(m=>normName(m.nom)===n);
  document.getElementById('su-moi-nom').textContent=moi;
  document.getElementById('su-moi-sub').textContent = etu ? 'Étudiant — commission '+(etu.commission||'—') : mem ? (mem.role||'Membre de la commission') : 'Responsable / mandataire';
  etatPush();
  const est = v => normName(v)===n;
  const mesExposes = DB.expositions.filter(x=>est(x.etudiantNom));
  const mesRapports = DB.rapports.filter(x=>est(x.etudiantNom) || est(x.responsable&&x.responsable.nom) || est(x.mandataire&&x.mandataire.nom));
  const tous = [...mesExposes.map(x=>({...x, type:'Exposé'})), ...mesRapports.map(x=>({...x, type:'Rapport de stage'}))]
    .filter((x,i,a)=>a.findIndex(y=>y.id===x.id)===i)
    .sort((a,b)=>(b.tsDepot||0)-(a.tsDepot||0));
  document.getElementById('su-docs').innerHTML = tous.length ? tous.map(x=>{
    const info = STATUT_INFO[x.statut] || {lbl:x.statut, cls:'bn'};
    return `<div class="list-item card" style="margin-bottom:8px;">
      <div class="li-top"><div class="li-name">${escapeHtml(x.type)} — ${escapeHtml(x.numero)}${est(x.etudiantNom)?'':' <span class="hint">('+escapeHtml(x.etudiantNom)+')</span>'}</div><span class="badge ${info.cls}">${info.lbl}</span></div>
      <div class="li-sub">${x.source==='liste officielle'?'Enregistré depuis la liste officielle':'Déposé le '+frDate(x.dateDepot)+(x.heureDepot?' à '+x.heureDepot:'')}${x.commission?' • '+escapeHtml(x.commission):''}${x.dateCorrection?' • Corrigé le '+frDate(x.dateCorrection):''}${x.dateRetrait?' • Retiré le '+frDate(x.dateRetrait):''}</div>
      ${x.commentaire ? `<div class="note-box ${x.statut==='corrige_complet'||x.statut==='retire'?'complet':'partiel'}" style="margin-top:8px;"><div class="note-lbl">Remarques du correcteur</div><div class="note-txt">${escapeHtml(x.commentaire)}</div></div>` : ''}
    </div>`;
  }).join('') : `<div class="card"><div class="empty">Aucun exposé ou rapport enregistré à ce nom pour le moment</div></div>`;
  const mine=mesMessages(moi);
  document.getElementById('su-messages').innerHTML = mine.length ? mine.map(m=>{
    const link=waLink(m.tel, m.texte), lu=messageLu(m,moi);
    return `<div class="list-item" style="cursor:pointer;${lu?'':'background:var(--YELP);'}" onclick="suLire('${m.id}')">
      <div class="li-top"><div class="li-name">${escapeHtml(m.titre||'Commission Exposé')}</div>${lu?'':'<span class="badge by">Nouveau</span>'}${m.cible&&m.cible!=='personne'?'<span class="badge bn">'+escapeHtml(m.nom)+'</span>':''}</div>
      <div class="li-sub" style="color:var(--INK);font-size:13px;">${escapeHtml(m.texte)}</div>
      <div class="hint" style="margin-top:4px;">${frDate(m.date)} à ${escapeHtml(m.heure||'')}</div>
      ${link ? `<a href="${link}" target="_blank" class="pill-link" style="margin-top:8px;" onclick="event.stopPropagation()">Envoyer via WhatsApp</a>` : ''}
    </div>`;
  }).join('') : `<div class="empty">Aucune notification pour le moment</div>`;
  majCompteurs();
}
function suLire(id){
  const m=DB.messages.find(x=>x.id===id), moi=getMoi(); if(!m || messageLu(m,moi)) return;
  marquerLu(m,moi); saveDB(); renderSuivi();
}
function suToutLu(){
  const moi=getMoi(); let n=0;
  mesMessages(moi).forEach(m=>{ if(!messageLu(m,moi)){ marquerLu(m,moi); n++; } });
  if(n){ saveDB(); renderSuivi(); }
}

/* ================= DISCUSSION ================= */
function openDiscussion(){
  const moi=getMoi();
  if(!moi){ toast('Identifiez-vous d\'abord dans « Mon suivi »','ko'); openSuivi(); return; }
  goScreen('s-disc');
  Discussion.monter('disc-zone', moi, {montrer:()=>goScreen('s-disc'), onChange:majCompteurs});
}
window.onChat = function(c){ if(Discussion.moi!==getMoi()) Discussion.moi=getMoi(); if(Discussion.surNouveau(c)) majCompteurs(); };

/* ================= SOURCE VASES D'HONNEUR (bibliothèque) ================= */
let bibClasse='';
function openBibliotheque(){
  goScreen('s-biblio');
  biblioSwitch(bibClasse || reglages().classes[0]);
}
function biblioSwitch(classe){
  bibClasse=classe;
  document.getElementById('bib-tabs').innerHTML = uniq(reglages().classes).map(c=>`<button class="${c===classe?'on':''}" onclick="biblioSwitch(${JSON.stringify(c).replace(/"/g,'&quot;')})">${escapeHtml(c)}</button>`).join('');
  const list=uniq((DB.bibliotheque||[]).filter(b=>b.classe===classe), b=>normName(b.titre));
  document.getElementById('bib-list').innerHTML = list.length ? list.map(b=>`
    <div class="list-item"><div class="li-top"><div class="li-name">${escapeHtml(b.titre)}</div><span class="badge bn">${escapeHtml(b.type||'Livre')}</span></div>
    <div class="li-sub">${b.auteur?'Auteur : '+escapeHtml(b.auteur):''}${b.lien?'<br>'+escapeHtml(b.lien):''}</div></div>`).join('')
    : `<div class="empty"><p>Aucune source enregistrée pour cette classe pour le moment</p></div>`;
}

/* ================= TEXTES D'ACCUEIL (personnalisables) ================= */
function appliquerAccueil(){
  const a=reglages().accueil||{};
  const set=(id,v)=>{ const el=document.getElementById(id); if(el && v) el.textContent=v; };
  set('acc-badge',a.badge); set('acc-t1',a.suiviTitre1); set('acc-t2',a.suiviTitre2);
}

/* ================= TEMPS RÉEL ================= */
window.onNotif = function(m){
  const moi=getMoi();
  if(!moi || !messageConcerne(m,moi)) return;
  if(!DB.messages.some(x=>x.id===m.id)) DB.messages.push(m);
  ding();
  bandeau(m.titre||'Commission Exposé', m.texte, ()=>openSuivi());
  notifSysteme(m.titre||'Commission Exposé', m.texte);
  if(document.getElementById('s-suivi').classList.contains('on')) renderSuivi(); else majCompteurs();
};
window.onRemoteUpdate = function(){
  updateSyncBadge(); appliquerAccueil();
  if(document.getElementById('s-suivi').classList.contains('on')) renderSuivi(); else majCompteurs();
  if(document.getElementById('s-biblio').classList.contains('on')) biblioSwitch(bibClasse);
  if(document.getElementById('s-disc').classList.contains('on')) Discussion.apresSync();
};
if('serviceWorker' in navigator){
  navigator.serviceWorker.addEventListener('message', e=>{ if(e.data && e.data.type==='open'){ if(String(e.data.url).includes('discussion')) openDiscussion(); else openSuivi(); } });
  if(window.isSecureContext) navigator.serviceWorker.register('sw.js').catch(()=>{});
}
appliquerAccueil(); majCompteurs();
Discussion.moi=getMoi();
const vueDemandee=new URLSearchParams(location.search).get('vue');
if(vueDemandee==='suivi') openSuivi();
if(vueDemandee==='discussion') openDiscussion();
