/* ============================================================
   COMMISSION EXPOSÉ — Interface Étudiant / Membres
   Dépend de core.js (modèle de données partagé)
   ============================================================ */

/* ================= NAVIGATION ================= */
function goHome(){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));
  document.getElementById('s-home').classList.add('on');
}
function goScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));
  document.getElementById(id).classList.add('on');
}
function tickClock(){
  const d=new Date();
  const jours=['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const mois=['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  document.getElementById('home-date').textContent = jours[d.getDay()]+' '+d.getDate()+' '+mois[d.getMonth()]+' '+d.getFullYear();
  document.getElementById('home-time').textContent = pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds());
}
function currentJour(){
  const d=new Date().getDay();
  return d===6 ? 'Samedi' : 'Dimanche';
}

/* ================= THEME ROWS (dynamic list) ================= */
function addThemeRow(containerId, value){
  const c=document.getElementById(containerId);
  const row=document.createElement('div');
  row.className='theme-row';
  row.innerHTML=`<input type="text" placeholder="Intitulé du thème..." value="${value?escapeHtml(value):''}"><button type="button" onclick="this.parentNode.remove()">✕</button>`;
  c.appendChild(row);
}
function getThemes(containerId){
  return Array.from(document.querySelectorAll('#'+containerId+' input')).map(i=>i.value.trim()).filter(Boolean);
}

/* ================= LIEU DE DÉPÔT (Centre Kodesh / Église fille) ================= */
function fillEgliseSelect(prefix){
  const sel=document.getElementById(prefix+'-eglise');
  sel.innerHTML = DB.eglises.length
    ? DB.eglises.map(n=>`<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('')
    : `<option value="">Aucune église fille configurée</option>`;
}
function resetLieu(prefix){
  document.querySelectorAll('#'+prefix+'-lieu-chips .chip').forEach(c=>c.classList.toggle('sel', c.dataset.v==='Centre Kodesh'));
  document.getElementById(prefix+'-eglise-wrap').classList.add('hidden');
  fillEgliseSelect(prefix);
}
function pickLieu(el, prefix){
  document.querySelectorAll('#'+prefix+'-lieu-chips .chip').forEach(c=>c.classList.remove('sel'));
  el.classList.add('sel');
  document.getElementById(prefix+'-eglise-wrap').classList.toggle('hidden', el.dataset.v!=='Église fille');
}
function getLieu(prefix){
  const sel=document.querySelector('#'+prefix+'-lieu-chips .chip.sel');
  const v = sel ? sel.dataset.v : 'Centre Kodesh';
  if(v==='Église fille'){
    const eg=document.getElementById(prefix+'-eglise').value;
    return eg ? 'Église fille — '+eg : 'Église fille';
  }
  return 'Centre Kodesh';
}
function fillCommissionSelect(prefix){
  const sel=document.getElementById(prefix+'-commission');
  sel.innerHTML = DB.commissions.length
    ? `<option value="">— Choisir la commission —</option>`+DB.commissions.map(c=>`<option value="${escapeHtml(c.nom)}">${escapeHtml(c.nom)}</option>`).join('')
    : `<option value="">Aucune commission configurée</option>`;
  majResponsable(prefix);
}
function majResponsable(prefix){
  const com=document.getElementById(prefix+'-commission').value;
  const resp = com ? responsableOf(com) : '';
  if(prefix==='rp') document.getElementById('rp-responsable').value = resp;
  else document.getElementById('ex-responsable-info').textContent = resp ? 'Responsable de commission : '+resp : '';
}

/* ================= RECHERCHE DU NOM DANS LA LISTE OFFICIELLE ================= */
function nomSearch(prefix){
  const q=normName(document.getElementById(prefix+'-nom').value);
  const list=document.getElementById(prefix+'-nom-list');
  const info=document.getElementById(prefix+'-nom-info');
  info.textContent='';
  if(q.length<2){ list.classList.add('hidden'); list.innerHTML=''; return; }
  const res=DB.etudiants.filter(e=>normName(e.nom).includes(q)).slice(0,30);
  list.classList.remove('hidden');
  list.innerHTML = res.length ? res.map(e=>{
    const def = prefix==='rp' ? rapportDefinitifDe(e.nom) : null;
    return `<div class="pick-item" onclick="nomPick('${prefix}','${e.id}')"><div class="av">${escapeHtml(initials(e.nom))}</div><div style="flex:1;"><div class="pk-name">${escapeHtml(e.nom)}</div><div class="pk-sub">${escapeHtml(e.commission)} • Resp. : ${escapeHtml(responsableOf(e.commission)||'—')}</div></div>${def?'<span class="badge bg">Définitif</span>':''}</div>`;
  }).join('') : `<div class="empty">Nom absent de la liste — vous pouvez continuer en le saisissant en entier.</div>`;
}
function nomPick(prefix,id){
  const e=DB.etudiants.find(x=>x.id===id); if(!e) return;
  document.getElementById(prefix+'-nom').value=e.nom;
  document.getElementById(prefix+'-nom').dataset.etudiantId=e.id;
  const list=document.getElementById(prefix+'-nom-list'); list.classList.add('hidden'); list.innerHTML='';
  const sel=document.getElementById(prefix+'-commission');
  if(Array.from(sel.options).some(o=>o.value===e.commission)) sel.value=e.commission;
  majResponsable(prefix);
  const def = prefix==='rp' ? rapportDefinitifDe(e.nom) : null;
  document.getElementById(prefix+'-nom-info').innerHTML = def ? `✅ Rapport définitif déjà enregistré (n° ${escapeHtml(def.numero)}).` : `Commission : <b>${escapeHtml(e.commission)}</b>`;
}
function etudiantIdFor(prefix,nom){
  const inp=document.getElementById(prefix+'-nom');
  const e=DB.etudiants.find(x=>x.id===inp.dataset.etudiantId && normName(x.nom)===normName(nom)) || DB.etudiants.find(x=>normName(x.nom)===normName(nom));
  return e ? e.id : '';
}

/* ================= PHOTO UPLOAD (générique) ================= */
const photoStore = { ex:[], rp:[] };
function renderPhotoGrid(key, gridId){
  const grid=document.getElementById(gridId);
  const photos=photoStore[key];
  grid.innerHTML = photos.map((src,i)=>`<div class="photo-thumb"><img src="${src}"><button class="rm" onclick="removePhoto('${key}','${gridId}',${i})">✕</button></div>`).join('')
    + `<label class="photo-add">📷<input type="file" accept="image/*" capture="environment" onchange="addPhoto('${key}','${gridId}',this)"></label>`;
}
function addPhoto(key, gridId, input){
  const file=input.files[0]; if(!file) return;
  toast('Préparation de la photo…','ok');
  compressImage(file,1280,0.72).then(dataUrl=>{
    photoStore[key].push(dataUrl);
    renderPhotoGrid(key, gridId);
    if(key==='ex') exToggleChk(); else if(key==='rp') rpToggleChk();
  }).catch(()=>toast("Impossible de lire cette photo",'ko'));
}
function removePhoto(key, gridId, i){
  photoStore[key].splice(i,1);
  renderPhotoGrid(key, gridId);
  if(key==='ex') exToggleChk(); else if(key==='rp') rpToggleChk();
}

/* ================================================================
   MODULE 1 — PRÉSENCE DES MEMBRES DE LA COMMISSION
   ================================================================ */
let prMode='arrivee'; let prSelMembre=null;
const MOTIFS=['Permanence','Correction des exposés','Coordinateur d\'exposés','Présentation de la méthodologie'];

function openPresence(){
  goScreen('s-presence');
  document.getElementById('pr-choice').classList.remove('hidden');
  document.getElementById('pr-search').classList.add('hidden');
  document.getElementById('pr-form').classList.add('hidden');
  document.getElementById('pr-success').classList.add('hidden');
}
function prGoSearch(mode){
  prMode=mode;
  document.getElementById('pr-choice').classList.add('hidden');
  document.getElementById('pr-search').classList.remove('hidden');
  document.getElementById('pr-s').value='';
  prFilter();
}
function prFilter(){
  const q=document.getElementById('pr-s').value.toLowerCase();
  const list=document.getElementById('pr-list');
  let membres = DB.membres.filter(m=>normName(m.nom).includes(normName(q)));
  const today=todayStr();
  const presentIds = DB.presences.filter(p=>p.date===today && p.statut==='present').map(p=>p.membreId);
  if(prMode==='depart') membres = membres.filter(m=>presentIds.includes(m.id));
  list.innerHTML = membres.length ? membres.map(m=>`<div class="pick-item" onclick="prSelect('${m.id}')"><div class="av">${escapeHtml(initials(m.nom))}</div><div style="flex:1;"><div class="pk-name">${escapeHtml(m.nom)}</div></div>${prMode==='arrivee'&&presentIds.includes(m.id)?'<span class="badge bg">Déjà présent(e)</span>':''}</div>`).join('')
    : `<div class="empty"><div class="eico">🔍</div><p>${prMode==='depart'?"Aucun membre pointé comme présent actuellement":"Aucun membre trouvé"}</p></div>`;
}
function prSelect(id){
  prSelMembre = DB.membres.find(m=>m.id===id);
  if(!prSelMembre) return;
  if(prMode==='arrivee' && DB.presences.some(p=>p.membreId===id && p.date===todayStr() && p.statut==='present')){
    toast("Arrivée déjà pointée — marquez d'abord votre départ",'ko'); return;
  }
  if(prMode==='arrivee'){
    document.getElementById('pr-search').classList.add('hidden');
    document.getElementById('pr-form').classList.remove('hidden');
    document.getElementById('pr-who').innerHTML=`<div class="av" style="width:44px;height:44px;">${escapeHtml(initials(prSelMembre.nom))}</div><div><div style="font-weight:700;font-size:15px;">${escapeHtml(prSelMembre.nom)}</div><div class="hint">Arrivée à ${nowTimeStr()}</div></div>`;
    document.getElementById('pr-jour').value = currentJour();
    prFillCreneaux();
    prRenderMotifs();
  } else {
    confirmDepart(prSelMembre.id);
  }
}
function prFillCreneaux(){
  const jour=document.getElementById('pr-jour').value;
  const sel=document.getElementById('pr-creneau');
  const list = DB.creneaux.filter(c=>c.jour===jour);
  sel.innerHTML = list.map(c=>`<option value="${c.id}">${c.label}</option>`).join('');
}
function prRenderMotifs(){
  const c=document.getElementById('pr-motifs');
  c.innerHTML = MOTIFS.map((m,i)=>`<div class="chip ${i===0?'sel':''}" data-m="${m}" onclick="prPickMotif(this)"><span class="dot"></span>${m}</div>`).join('');
  document.getElementById('pr-extra').classList.add('hidden');
}
function prPickMotif(el){
  document.querySelectorAll('#pr-motifs .chip').forEach(c=>c.classList.remove('sel'));
  el.classList.add('sel');
  const m=el.dataset.m;
  document.getElementById('pr-extra').classList.toggle('hidden', m==='Permanence');
  document.getElementById('pr-themes-wrap').classList.toggle('hidden', m==='Présentation de la méthodologie');
  document.getElementById('pr-salle-wrap').classList.toggle('hidden', m!=='Présentation de la méthodologie');
  if(m==='Présentation de la méthodologie') prCheckSalle();
}
function findSessionForToday(classe){
  return DB.sessions.find(s=>s.classe===classe && s.dateProgrammee===todayStr() && s.statut==='programmee');
}
function prCheckSalle(){
  const motifEl=document.querySelector('#pr-motifs .chip.sel');
  if(!motifEl || motifEl.dataset.m!=='Présentation de la méthodologie') return;
  const classe=document.getElementById('pr-classe').value;
  const session=findSessionForToday(classe);
  const info=document.getElementById('pr-salle-info');
  const row=document.getElementById('pr-valid-row');
  if(session){
    info.className='note-box complet';
    info.innerHTML=`<div class="note-lbl">📍 Séance programmée aujourd'hui</div><div class="note-txt">Passage n°${session.numero} — Salle : <b>${escapeHtml(session.salle||'—')}</b> — ${classe}</div>`;
    row.classList.remove('hidden');
  } else {
    info.className='note-box partiel';
    info.innerHTML=`<div class="note-lbl">ℹ️ Aucune séance programmée</div><div class="note-txt">Aucune présentation de méthodologie n'est programmée aujourd'hui pour ${classe}.</div>`;
    row.classList.add('hidden');
    document.getElementById('pr-valid-meth').checked=false;
  }
}
function confirmArrivee(){
  if(!prSelMembre){ goHome(); return; }
  if(DB.presences.some(p=>p.membreId===prSelMembre.id && p.date===todayStr() && p.statut==='present')){ toast('Arrivée déjà enregistrée','ko'); return; }
  const motifEl=document.querySelector('#pr-motifs .chip.sel');
  const motif = motifEl ? motifEl.dataset.m : 'Permanence';
  const jour=document.getElementById('pr-jour').value;
  const creneauId=document.getElementById('pr-creneau').value;
  const creneau=DB.creneaux.find(c=>c.id===creneauId);
  const classe = motif==='Permanence'?'':document.getElementById('pr-classe').value;
  const rec={
    id:nid(), membreId:prSelMembre.id, membreNom:prSelMembre.nom,
    date:todayStr(), jour, creneauId, creneauLabel:creneau?creneau.label:'',
    motif, classe,
    themes: (motif==='Permanence'||motif==='Présentation de la méthodologie')?'':document.getElementById('pr-themes').value.trim(),
    heureArrivee: nowTimeStr(), tsArrivee: nowFull(), heureDepart:'', tsDepart:0,
    dureeMin:0, statut:'present'
  };
  DB.presences.push(rec);

  let extraMsg='';
  if(motif==='Présentation de la méthodologie'){
    const session=findSessionForToday(classe);
    const valide=document.getElementById('pr-valid-meth').checked;
    if(session && valide){
      session.statut='validee'; session.presentateur=prSelMembre.nom; session.dateValidation=todayStr();
      const nextDate=addMonthsStr(todayStr(),2);
      DB.sessions.push({id:nid(), classe, numero:(session.numero||1)+1, dateProgrammee:nextDate, salle:session.salle, statut:'programmee', presentateur:'', dateValidation:''});
      extraMsg = ` — Présentation validée ✅ (prochaine séance proposée le ${nextDate}, ajustable par l'administration)`;
    } else if(session && !valide){
      extraMsg = ' — Séance programmée non encore validée.';
    }
  }
  saveDB();
  document.getElementById('pr-form').classList.add('hidden');
  document.getElementById('pr-success').classList.remove('hidden');
  document.getElementById('pr-suc-title').textContent='Arrivée enregistrée';
  document.getElementById('pr-suc-sub').textContent=`${prSelMembre.nom} — ${jour} ${creneau?creneau.label:''} — ${motif}${extraMsg}`;
  toast('Présence enregistrée','ok');
}
function confirmDepart(membreId){
  const today=todayStr();
  const rec = DB.presences.filter(p=>p.membreId===membreId && p.date===today && p.statut==='present').sort((a,b)=>b.tsArrivee-a.tsArrivee)[0];
  if(!rec){ toast("Aucune arrivée pointée aujourd'hui pour ce membre",'ko'); return; }
  rec.heureDepart = nowTimeStr(); rec.tsDepart = nowFull();
  rec.dureeMin = Math.max(0, Math.round((rec.tsDepart - rec.tsArrivee)/60000));
  rec.statut='parti';
  saveDB();
  document.getElementById('pr-search').classList.add('hidden');
  document.getElementById('pr-success').classList.remove('hidden');
  const h=Math.floor(rec.dureeMin/60), mnt=rec.dureeMin%60;
  document.getElementById('pr-suc-title').textContent='Départ enregistré';
  document.getElementById('pr-suc-sub').textContent=`${rec.membreNom} — présent(e) ${h}h${pad(mnt)} (${rec.heureArrivee} → ${rec.heureDepart})`;
  toast('Départ enregistré','ok');
}

/* ================================================================
   MODULE 2 — DÉPÔT / RETRAIT DES EXPOSÉS
   ================================================================ */
function openExpose(){
  goScreen('s-expose');
  photoStore.ex=[];
  document.getElementById('ex-nom').value=''; document.getElementById('ex-moderateur').value='';
  document.getElementById('ex-nom').dataset.etudiantId=''; document.getElementById('ex-nom-info').textContent='';
  document.getElementById('ex-nom-list').classList.add('hidden');
  document.getElementById('ex-themes-list').innerHTML=''; addThemeRow('ex-themes-list');
  document.getElementById('ex-chk').checked=false; document.getElementById('ex-chk').disabled=true;
  resetLieu('ex'); fillCommissionSelect('ex');
  renderPhotoGrid('ex','ex-photos'); exToggleChk();
  exSwitch('deposer');
  document.getElementById('ex-success').classList.add('hidden');
}
function exSwitch(mode){
  document.getElementById('ex-tab-d').classList.toggle('on', mode==='deposer');
  document.getElementById('ex-tab-r').classList.toggle('on', mode==='retirer');
  document.getElementById('ex-deposer').classList.toggle('hidden', mode!=='deposer');
  document.getElementById('ex-retirer').classList.toggle('hidden', mode!=='retirer');
  document.getElementById('ex-retrait-detail').classList.add('hidden');
  document.getElementById('ex-success').classList.add('hidden');
  if(mode==='retirer'){ document.getElementById('ex-r-s').value=''; renderExRetrait(); }
  else { document.getElementById('ex-retirer').classList.add('hidden'); document.getElementById('ex-deposer').classList.remove('hidden'); }
}
function exToggleChk(){
  const ok = photoStore.ex.length>0;
  const chk=document.getElementById('ex-chk');
  chk.disabled = !ok;
  document.getElementById('ex-chk-row').classList.toggle('locked', !ok);
  if(!ok) chk.checked=false;
  exToggleBtn();
}
function exToggleBtn(){
  document.getElementById('ex-btn').disabled = !document.getElementById('ex-chk').checked;
}
function confirmDepotExpose(){
  const nom=document.getElementById('ex-nom').value.trim();
  if(!nom){ toast('Le nom de l\'étudiant est requis','ko'); return; }
  if(!document.getElementById('ex-commission').value){ toast('Choisissez la commission','ko'); return; }
  if(!document.getElementById('ex-moderateur').value.trim()){ toast('Le nom du modérateur est requis','ko'); return; }
  if(!photoStore.ex.length){ toast('Ajoutez au moins une photo de couverture','ko'); return; }
  const numero = nextNumero('expose','EXP');
  const rec={
    id:nid(), numero, etudiantNom:nom, etudiantId:etudiantIdFor('ex',nom), classe:document.getElementById('ex-classe').value,
    phase:document.getElementById('ex-phase').value, moderateur:document.getElementById('ex-moderateur').value.trim(),
    commission:document.getElementById('ex-commission').value,
    responsable:responsableOf(document.getElementById('ex-commission').value),
    lieu:getLieu('ex'),
    themes:getThemes('ex-themes-list'), photos:photoStore.ex.slice(),
    statut:'depose', correcteur:'', commentaire:'', niveauCorrection:'',
    dateDepot: todayStr(), tsDepot: nowFull(), dateCorrection:'', dateRetrait:''
  };
  DB.expositions.push(rec); saveDB();
  document.getElementById('ex-deposer').classList.add('hidden');
  document.getElementById('ex-success').classList.remove('hidden');
  document.getElementById('ex-suc-title').textContent='Dépôt confirmé';
  document.getElementById('ex-suc-sub').textContent=`${nom} — n° ${numero} — ${rec.phase}`;
  toast('Exposé déposé','ok');
}
function renderExRetrait(){
  const q=document.getElementById('ex-r-s').value.toLowerCase();
  const list=document.getElementById('ex-r-list');
  let d=DB.expositions.filter(x=>x.statut==='corrige_complet'||x.statut==='corrige_partiel');
  if(q) d=d.filter(x=>normName(x.etudiantNom).includes(normName(q))||String(x.numero).toLowerCase().includes(q));
  d.sort((a,b)=>b.tsDepot-a.tsDepot);
  list.innerHTML = d.length ? d.map(x=>`<div class="pick-item" onclick="openExRetraitDetail('${x.id}')"><div class="av">${escapeHtml(initials(x.etudiantNom))}</div><div style="flex:1;"><div class="pk-name">${escapeHtml(x.etudiantNom)}</div><div class="pk-sub">${x.numero} • ${x.classe} • ${x.phase}</div></div><span class="badge ${x.statut==='corrige_complet'?'bg':'by'}">${x.statut==='corrige_complet'?'Complet':'Partiel'}</span></div>`).join('')
    : `<div class="empty"><div class="eico">📭</div><p>Aucun exposé corrigé disponible pour ce nom</p></div>`;
}
function openExRetraitDetail(id){
  const x=DB.expositions.find(e=>e.id===id); if(!x) return;
  document.getElementById('ex-retirer').classList.add('hidden');
  const box=document.getElementById('ex-retrait-detail');
  box.classList.remove('hidden');
  box.innerHTML=`
    <div class="card"><div class="card-b">
      <div style="font-weight:700;font-size:15px;">${escapeHtml(x.etudiantNom)}</div>
      <div class="hint" style="margin-bottom:10px;">${x.numero} • ${x.classe} • ${x.phase}${x.lieu?' • '+escapeHtml(x.lieu):''}</div>
      <div class="note-box ${x.statut==='corrige_complet'?'complet':'partiel'}">
        <div class="note-lbl">${x.statut==='corrige_complet'?'✅ Complètement corrigé':'⚠️ Partiellement corrigé'}</div>
        <div class="note-txt">${x.commentaire ? escapeHtml(x.commentaire) : 'Aucune remarque particulière de la commission.'}</div>
      </div>
      <label class="chk-row"><input type="checkbox" id="ex-r-chk" onchange="document.getElementById('ex-r-btn').disabled=!this.checked"><span class="chk-txt">Je confirme avoir récupéré mon document corrigé.</span></label>
      <button class="btn btn-y" id="ex-r-btn" disabled onclick="confirmRetraitExpose('${x.id}')">Valider le retrait</button>
      <button class="btn btn-ghost" onclick="exSwitch('retirer')">Annuler</button>
    </div></div>`;
}
function confirmRetraitExpose(id){
  const x=DB.expositions.find(e=>e.id===id); if(!x) return;
  x.statut='retire'; x.dateRetrait=todayStr(); saveDB();
  document.getElementById('ex-retrait-detail').classList.add('hidden');
  document.getElementById('ex-success').classList.remove('hidden');
  document.getElementById('ex-suc-title').textContent='Retrait confirmé';
  document.getElementById('ex-suc-sub').textContent=`${x.etudiantNom} a récupéré l'exposé n° ${x.numero}`;
  toast('Retrait enregistré','ok');
}

/* ================================================================
   MODULE 3 — RAPPORT DE STAGE (même logique que les exposés)
   ================================================================ */
function openRapport(){
  goScreen('s-rapport');
  photoStore.rp=[];
  document.getElementById('rp-nom').value=''; document.getElementById('rp-classe').value=''; document.getElementById('rp-phase').value='1ère correction';
  document.getElementById('rp-nom').dataset.etudiantId=''; document.getElementById('rp-nom-info').textContent='';
  document.getElementById('rp-nom-list').classList.add('hidden'); rpPhaseInfo();
  document.getElementById('rp-chk').checked=false; document.getElementById('rp-chk').disabled=true;
  resetLieu('rp'); fillCommissionSelect('rp');
  renderPhotoGrid('rp','rp-photos'); rpToggleChk();
  rpSwitch('deposer');
  document.getElementById('rp-success').classList.add('hidden');
}
function rpSwitch(mode){
  document.getElementById('rp-tab-d').classList.toggle('on', mode==='deposer');
  document.getElementById('rp-tab-r').classList.toggle('on', mode==='retirer');
  document.getElementById('rp-deposer').classList.toggle('hidden', mode!=='deposer');
  document.getElementById('rp-retirer').classList.toggle('hidden', mode!=='retirer');
  document.getElementById('rp-retrait-detail').classList.add('hidden');
  document.getElementById('rp-success').classList.add('hidden');
  if(mode==='retirer'){ document.getElementById('rp-r-s').value=''; renderRpRetrait(); }
  else { document.getElementById('rp-retirer').classList.add('hidden'); document.getElementById('rp-deposer').classList.remove('hidden'); }
}
function rpToggleChk(){
  const ok = photoStore.rp.length>0;
  const chk=document.getElementById('rp-chk');
  chk.disabled = !ok;
  document.getElementById('rp-chk-row').classList.toggle('locked', !ok);
  if(!ok) chk.checked=false;
  rpToggleBtn();
}
function rpToggleBtn(){
  document.getElementById('rp-btn').disabled = !document.getElementById('rp-chk').checked;
}
function rpPhaseInfo(){
  document.getElementById('rp-phase-info').classList.toggle('hidden', document.getElementById('rp-phase').value!=='Dépôt définitif');
}
function confirmDepotRapport(){
  const nom=document.getElementById('rp-nom').value.trim();
  if(!nom){ toast('Le nom de l\'étudiant est requis','ko'); return; }
  const commission=document.getElementById('rp-commission').value;
  if(!commission){ toast('Choisissez la commission','ko'); return; }
  if(!photoStore.rp.length){ toast('Ajoutez au moins une photo de couverture','ko'); return; }
  const phase=document.getElementById('rp-phase').value;
  const definitif = phase==='Dépôt définitif';
  const etudiantId=etudiantIdFor('rp',nom);
  const base={
    etudiantNom:nom, etudiantId, classe:document.getElementById('rp-classe').value,
    phase, commission, responsable:responsableOf(commission), moderateur:'',
    lieu:getLieu('rp'), photos:photoStore.rp.slice(),
    dateDepot: todayStr(), tsDepot: nowFull()
  };
  let rec;
  const existant = definitif ? rapportDefinitifDe(nom) : null;
  if(existant){
    // Le rapport définitif de cet étudiant est déjà enregistré : on complète la fiche au lieu d'en créer un doublon
    Object.assign(existant, base, {photos:(existant.photos||[]).concat(base.photos), source:existant.source==='import'?'import+depot':existant.source});
    rec=existant;
  } else {
    rec=Object.assign({id:nid(), numero:nextNumero('rapport','STG'), statut: definitif?'definitif':'depose', correcteur:'', commentaire:'', dateCorrection:'', dateRetrait:''}, base);
    DB.rapports.push(rec);
  }
  if(definitif){
    // Les anciens dépôts de cet étudiant encore en attente de correction sont clôturés
    DB.rapports.forEach(r=>{ if(r!==rec && normName(r.etudiantNom)===normName(nom) && (r.statut==='depose'||r.statut==='en_correction')){ r.statut='clos'; r.dateCorrection=todayStr(); } });
  }
  saveDB();
  document.getElementById('rp-deposer').classList.add('hidden');
  document.getElementById('rp-success').classList.remove('hidden');
  document.getElementById('rp-suc-title').textContent = definitif ? 'Rapport définitif enregistré' : 'Dépôt confirmé';
  document.getElementById('rp-suc-sub').textContent = `${nom} — n° ${rec.numero} — ${rec.phase}` + (definitif ? ' — ce rapport ne passe pas en correction.' : '');
  toast(definitif?'Rapport définitif enregistré':'Rapport déposé','ok');
}
function renderRpRetrait(){
  const q=document.getElementById('rp-r-s').value.toLowerCase();
  const list=document.getElementById('rp-r-list');
  let d=DB.rapports.filter(x=>x.statut==='corrige_complet'||x.statut==='corrige_partiel');
  if(q) d=d.filter(x=>normName(x.etudiantNom).includes(normName(q))||String(x.numero).toLowerCase().includes(q));
  d.sort((a,b)=>b.tsDepot-a.tsDepot);
  list.innerHTML = d.length ? d.map(x=>`<div class="pick-item" onclick="openRpRetraitDetail('${x.id}')"><div class="av">${escapeHtml(initials(x.etudiantNom))}</div><div style="flex:1;"><div class="pk-name">${escapeHtml(x.etudiantNom)}</div><div class="pk-sub">${x.numero} • ${x.classe} • ${x.phase}</div></div><span class="badge ${x.statut==='corrige_complet'?'bg':'by'}">${x.statut==='corrige_complet'?'Complet':'Partiel'}</span></div>`).join('')
    : `<div class="empty"><div class="eico">📭</div><p>Aucun rapport corrigé disponible pour ce nom</p></div>`;
}
function openRpRetraitDetail(id){
  const x=DB.rapports.find(e=>e.id===id); if(!x) return;
  document.getElementById('rp-retirer').classList.add('hidden');
  const box=document.getElementById('rp-retrait-detail');
  box.classList.remove('hidden');
  box.innerHTML=`
    <div class="card"><div class="card-b">
      <div style="font-weight:700;font-size:15px;">${escapeHtml(x.etudiantNom)}</div>
      <div class="hint" style="margin-bottom:10px;">${x.numero} • ${x.classe} • ${x.phase}${x.lieu?' • '+escapeHtml(x.lieu):''}</div>
      <div class="note-box ${x.statut==='corrige_complet'?'complet':'partiel'}">
        <div class="note-lbl">${x.statut==='corrige_complet'?'✅ Complètement corrigé':'⚠️ Partiellement corrigé'}</div>
        <div class="note-txt">${x.commentaire ? escapeHtml(x.commentaire) : 'Aucune remarque particulière de la commission.'}</div>
      </div>
      <label class="chk-row"><input type="checkbox" id="rp-r-chk" onchange="document.getElementById('rp-r-btn').disabled=!this.checked"><span class="chk-txt">Je confirme avoir récupéré mon rapport corrigé.</span></label>
      <button class="btn btn-y" id="rp-r-btn" disabled onclick="confirmRetraitRapport('${x.id}')">Valider le retrait</button>
      <button class="btn btn-ghost" onclick="rpSwitch('retirer')">Annuler</button>
    </div></div>`;
}
function confirmRetraitRapport(id){
  const x=DB.rapports.find(e=>e.id===id); if(!x) return;
  x.statut='retire'; x.dateRetrait=todayStr(); saveDB();
  document.getElementById('rp-retrait-detail').classList.add('hidden');
  document.getElementById('rp-success').classList.remove('hidden');
  document.getElementById('rp-suc-title').textContent='Retrait confirmé';
  document.getElementById('rp-suc-sub').textContent=`${x.etudiantNom} a récupéré le rapport n° ${x.numero}`;
  toast('Retrait enregistré','ok');
}

/* ================================================================
   MODULE 4 — ESPACE CORRECTEUR (accès par code)
   ================================================================ */
let corUser=null; let corType='expose';
function openCorrection(){
  goScreen('s-correction');
  document.getElementById('cor-auth').classList.remove('hidden');
  document.getElementById('cor-main').classList.add('hidden');
  document.getElementById('cor-detail').classList.add('hidden');
  document.getElementById('cor-nom').value=''; document.getElementById('cor-code').value='';
  document.getElementById('cor-nom-list').innerHTML='';
  corUser=null;
}
function corFilterNom(){
  const q=normName(document.getElementById('cor-nom').value);
  const list=document.getElementById('cor-nom-list');
  if(!q){ list.innerHTML=''; return; }
  const res=DB.membres.filter(m=>normName(m.nom).includes(q));
  list.innerHTML=res.map(m=>`<div class="pick-item" onclick="corPick('${m.id}')"><div class="av">${escapeHtml(initials(m.nom))}</div><div class="pk-name">${escapeHtml(m.nom)}</div></div>`).join('') || `<div class="empty">Aucun membre trouvé</div>`;
}
function corPick(id){
  const m=DB.membres.find(x=>x.id===id);
  document.getElementById('cor-nom').value=m.nom;
  document.getElementById('cor-nom-list').innerHTML='';
  corUser=m;
}
function corAuth(){
  const nomVal=document.getElementById('cor-nom').value.trim();
  const code=document.getElementById('cor-code').value.trim();
  const m = (corUser && corUser.nom===nomVal ? DB.membres.find(x=>x.id===corUser.id) : null) || DB.membres.find(x=>normName(x.nom)===normName(nomVal));
  if(!m || String(m.code)!==code){ toast('Nom ou code incorrect','ko'); return; }
  corUser=m;
  document.getElementById('cor-auth').classList.add('hidden');
  document.getElementById('cor-main').classList.remove('hidden');
  document.getElementById('cor-who').textContent=m.nom;
  corSwitch('expose');
}
function corLogout(){ corUser=null; goHome(); }
function corSwitch(type){
  corType=type;
  document.getElementById('cor-tab-e').classList.toggle('on', type==='expose');
  document.getElementById('cor-tab-r').classList.toggle('on', type==='rapport');
  renderCorLists();
}
function corDB(){ return corType==='expose' ? DB.expositions : DB.rapports; }
// Un rapport de stage définitif (ou dont l'étudiant a déjà remis son définitif) ne doit plus apparaître en correction
function corrigeable(x){
  if(corType!=='rapport') return true;
  if(x.statut==='definitif' || x.phase==='Dépôt définitif') return false;
  return !rapportDefinitifDe(x.etudiantNom);
}
function renderCorLists(){
  if(!corUser) return;
  const data=corDB();
  const mine=data.filter(x=>x.statut==='en_correction' && x.correcteur===corUser.nom && corrigeable(x));
  const dispo=data.filter(x=>x.statut==='depose' && corrigeable(x));
  const mineEl=document.getElementById('cor-mine'), dispoEl=document.getElementById('cor-dispo');
  mineEl.innerHTML = mine.length ? mine.map(x=>`<div class="pick-item" onclick="corOpenFinaliser('${x.id}')"><div class="av">${escapeHtml(initials(x.etudiantNom))}</div><div style="flex:1;"><div class="pk-name">${escapeHtml(x.etudiantNom)}</div><div class="pk-sub">${x.numero} • ${x.classe||''} • ${x.phase}</div></div><span class="badge by">En cours</span></div>`).join('') : `<div class="empty">Aucune correction en cours</div>`;
  dispoEl.innerHTML = dispo.length ? dispo.map(x=>`<div class="pick-item"><div class="av">${escapeHtml(initials(x.etudiantNom))}</div><div style="flex:1;"><div class="pk-name">${escapeHtml(x.etudiantNom)}</div><div class="pk-sub">${x.numero} • ${x.classe||''} • ${x.phase} • déposé ${x.dateDepot}</div></div><button class="btn-sm btn-g" onclick="corPrendre('${x.id}')">Prendre</button></div>`).join('') : `<div class="empty">Aucun document disponible pour le moment</div>`;
}
function corPrendre(id){
  const x=corDB().find(d=>d.id===id); if(!x) return;
  if(x.statut!=='depose'){ toast('Ce document a déjà été pris par un autre correcteur','ko'); renderCorLists(); return; }
  x.statut='en_correction'; x.correcteur=corUser.nom; x.tsDebutCorrection=nowFull();
  saveDB(); renderCorLists(); toast('Document pris en correction','ok');
}
function corOpenFinaliser(id){
  const x=corDB().find(d=>d.id===id); if(!x) return;
  document.getElementById('cor-main').classList.add('hidden');
  const box=document.getElementById('cor-detail');
  box.classList.remove('hidden');
  box.innerHTML=`
    <div class="card"><div class="card-b">
      <div style="font-weight:700;font-size:15px;">${escapeHtml(x.etudiantNom)}</div>
      <div class="hint" style="margin-bottom:12px;">${x.numero} • ${x.classe||''} • ${x.phase}${x.commission?' • '+escapeHtml(x.commission):''}</div>
      ${x.photos && x.photos.length ? `<div class="photo-grid">${x.photos.map(p=>`<a class="photo-thumb" href="${escapeHtml(p)}" target="_blank"><img src="${escapeHtml(p)}"></a>`).join('')}</div>` : ''}
      ${x.themes && x.themes.length ? `<div class="hint" style="margin-bottom:10px;">Thèmes : ${x.themes.map(escapeHtml).join(', ')}</div>` : ''}
      <div class="fg"><label>Résultat de la correction</label>
        <div class="chips">
          <div class="chip sel" data-v="corrige_complet" onclick="corPickResult(this)"><span class="dot"></span>Complètement corrigé</div>
          <div class="chip" data-v="corrige_partiel" onclick="corPickResult(this)"><span class="dot"></span>Partiellement corrigé</div>
        </div>
      </div>
      <div class="fg"><label>Commentaire / remarques (visible par l'étudiant au retrait)</label><textarea id="cor-comment" rows="3" placeholder="Remarques de la commission..."></textarea></div>
      <button class="btn btn-y" onclick="corFinaliser('${x.id}')">Enregistrer la correction</button>
      <button class="btn btn-ghost" onclick="corSwitch(corType)">Annuler</button>
    </div></div>`;
}
function corPickResult(el){
  document.querySelectorAll('#cor-detail .chip').forEach(c=>c.classList.remove('sel'));
  el.classList.add('sel');
}
function corFinaliser(id){
  const x=corDB().find(d=>d.id===id);
  if(!x){ toast('Document introuvable (supprimé ?)','ko'); corSwitch(corType); return; }
  const resEl=document.querySelector('#cor-detail .chip.sel');
  x.statut = resEl ? resEl.dataset.v : 'corrige_complet';
  x.commentaire = document.getElementById('cor-comment').value.trim();
  x.dateCorrection = todayStr(); x.correcteur = x.correcteur || corUser.nom; saveDB();
  document.getElementById('cor-detail').classList.add('hidden');
  document.getElementById('cor-main').classList.remove('hidden');
  renderCorLists();
  toast('Correction enregistrée','ok');
}

/* ================= INIT ================= */
tickClock(); setInterval(tickClock,1000);
addThemeRow('ex-themes-list');

window.onRemoteUpdate = function(){
  if(!document.getElementById('pr-search').classList.contains('hidden')) prFilter();
  if(document.getElementById('s-expose').classList.contains('on') && !document.getElementById('ex-retirer').classList.contains('hidden')) renderExRetrait();
  if(document.getElementById('s-rapport').classList.contains('on') && !document.getElementById('rp-retirer').classList.contains('hidden')) renderRpRetrait();
  if(!document.getElementById('cor-main').classList.contains('hidden')) renderCorLists();
  updateSyncBadge();
};
